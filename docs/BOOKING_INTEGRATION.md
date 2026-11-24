# Calculadora, reservas y recuperación — integración local

La nueva calculadora usa `src/booking/pricing.ts` también en servidor. Versión `kraken-private-2026-11-24-proposal-v2`, CHF en rappen enteros, anticipo 15 %, IVA CHF 0. Mudanzas y los casos de revisión no generan un total cobrable. El mapa de Contacto existente no se modifica.

## Estado al entregar

Hay handlers reales y adapters preparados para Firestore Admin, Payrexx y Resend; no hay credenciales privadas configuradas en este checkout. `GET /api/booking/config` devuelve `available:false`, `paymentReady:false`, `mode:'unconfigured'` mientras falte la configuración. La calculadora y la demo identificada se pueden revisar sin cobros ni emails. Activar un flag no demuestra por sí solo que una cuenta, un remitente o el acceso a la base estén operativos.

No se ha creado ninguna cuenta externa, enviado correo real, hecho un cobro o publicado en producción.

## Persistencia y seguridad

`BOOKING_ENABLED=true`, `BOOKING_TOKEN_SECRET` aleatorio de al menos 32 caracteres y credenciales Admin son necesarios. Se admite `FIREBASE_SERVICE_ACCOUNT_JSON` como secreto de servidor, `GOOGLE_APPLICATION_CREDENTIALS` o `BOOKING_USE_APPLICATION_DEFAULT=true` en un runtime con identidad asignada. Por defecto se usa exactamente el projectId y **firestoreDatabaseId** de `firebase-applet-config.json`; las variables opcionales permiten seleccionarlos explícitamente.

Los namespaces `kraken_bookings`, `kraken_booking_idempotency`, `kraken_booking_outbox`, `kraken_booking_rates`, `kraken_recovery_*` y `kraken_booking_activity` son privados del Admin SDK. Las reglas de Firestore deben denegar por completo su lectura/escritura al SDK de navegador; no trasladar una regla genérica de acceso autenticado a estos namespaces. No se aplican reglas ni migraciones a una base real en esta entrega. `docs/booking-firestore-indexes.json` contiene los índices necesarios para revisar junto a las reglas y el despliegue existente.

La creación de solicitud y su email se guardan juntos en una transacción; idempotencia por clave y huella del payload. La confirmación de pago y el recibo se guardan juntos con ID estable. Los leases de checkout/email son duraderos: un resultado incierto no se reintenta automáticamente creando otro cobro/email. Cada token opaco se limita a una sola reserva; las respuestas son privadas y `no-store`. Tokens y PII no se guardan en localStorage. Rotar el secreto invalida los enlaces de reserva existentes.

Los cambios exigen origen idéntico, JSON limitado y cookie de captura firmada `HttpOnly; SameSite=Strict`, emitida por `/api/booking/config`. Las capturas usan además límites persistentes por email y dirección remota obtenida del socket. No se confía en `X-Forwarded-For` del visitante. En hosting detrás de proxy se debe revisar la identidad remota fiable y los límites antes de activar: el valor conservador del socket puede agrupar a varios visitantes. Este control no equivale a un CAPTCHA gestionado.

## Cita y pago

La fecha elegida queda siempre **solicitada** hasta que una persona autorizada confirme realmente la disponibilidad. No se usa el calendario del navegador como autorización de un hueco.

Tras comprobar alcance y disponibilidad, un operador con acceso al entorno privado puede ejecutar:

```sh
BOOKING_OPERATOR_ID=<identificador-interno> node --import tsx scripts/confirm-booking.ts <id> <vencimiento-ISO>
```

El vencimiento tiene que ser futuro y como máximo siete días; el comando registra quién comprobó la disponibilidad y retiene la cita (`scheduling.status:held`) pendiente del anticipo. No cobra ni crea checkout. Solo un pago verificado, LIVE o TEST identificado, pasa la cita a `scheduling.status:confirmed`; un pago pendiente conserva la retención. Los casos sin precio cerrado requieren una oferta escrita aprobada. El comando privado `BOOKING_OPERATOR_ID=<operador> node --import tsx scripts/approve-manual-quote.ts <id> <importe-CHF-en-rappen> <archivo-del-alcance-aprobado>` guarda el alcance e importe revisado como nueva revisión. El cliente debe aceptar esa revisión actual antes del checkout. El navegador no autoriza importes. No puede cambiarse una cita una vez iniciado un checkout sin reconciliarlo primero.

Configurar `PAYREXX_INSTANCE`, `PAYREXX_API_SECRET`, `PAYREXX_MODE=test|live`, `APP_URL` HTTPS y `PAYREXX_WEBHOOK_SECRET` separado. El servidor crea el checkout con referencia propia, CHF y el 15 % calculado en servidor. Reutiliza un checkout válido; uno caducado o incierto pide revisión y no origina otro intento automáticamente.

En Payrexx configurar webhook JSON firmado a `/api/booking/payrexx/webhook`. Se valida HMAC-SHA256 de los bytes originales con el secreto de webhook y luego se consulta el Gateway mediante la API autenticada. Importe, CHF, referencia, gateway y modo deben coincidir. Un redirect o estado recibido del navegador nunca marca pagado. TEST devuelve `test_paid`. Devoluciones, disputas y discrepancias retiran el estado de éxito y requieren reconciliación. La política conservadora de un checkout incierto puede requerir intervención del operador.

Referencias consultadas: [autenticación y JSON](https://developers.payrexx.com/reference/rest-api), [crear Gateway](https://developers.payrexx.com/reference/create-a-gateway), [verificar Gateway](https://developers.payrexx.com/reference/retrieve-a-gateway), [webhook firmado](https://docs.payrexx.com/developer/guides/webhook), [estados y modo](https://docs.payrexx.com/developer/guides/webhook/transaction). La prueba de contrato local usa fixtures y no sustituye la certificación contra la cuenta Payrexx TEST real antes de activar LIVE.

## Correo, recuperación y cuenta opcional

Configurar `RESEND_API_KEY`, `BOOKING_EMAIL_FROM` con remitente verificado y `RECOVERY_TOKEN_SECRET` de al menos 32 caracteres. El adapter de [Resend](https://resend.com/docs/api-reference/emails/send-email) conserva la idempotencia. `sent` significa aceptación por el proveedor, no entrega en bandeja. Fallos inciertos permanecen `delivery_unknown`.

El núcleo de recuperación entregado está en `integrations/recovery/`, con adapter Firestore que conserva transacciones, versión, outbox y leases; no se aplica el SQL de D1/SQLite a Firestore. El email explícito de guardado es independiente de hasta dos recordatorios con consentimiento inicialmente vacío; 4/24 horas, 09:00–19:00 Europe/Zurich, pausados mientras la cita esté solicitada. Pago, cancelación, baja, rebote o queja detienen la secuencia. El webhook `/api/booking/email/webhook` recibe los bytes JSON originales y los verifica con la biblioteca Svix y `RESEND_WEBHOOK_SECRET`: firma, identificador y tolerancia de cinco minutos. Los eventos `email.bounced`, `email.complained` y `email.suppressed` suprimen los futuros emails transaccionales, enlaces de acceso y recordatorios. El identificador completado y su huella se guardan después de ambas supresiones, por lo que un reintento interrumpido es seguro. Configurar esos tres eventos en Resend; no se ha creado el webhook en la cuenta. Las peticiones sin firma válida no pueden dar de baja a un cliente. [Contrato oficial de verificación](https://resend.com/docs/webhooks/verify-webhooks-requests). Un correo ya aceptado por el proveedor no se puede retirar con una supresión posterior.

Programar de forma privada aproximadamente cada cinco minutos:

```sh
node --import tsx scripts/booking-maintenance.ts
```

No se ha creado ese job. Es necesario tanto para enviar como para purgar los drafts/outbox de recuperación a siete días. La política de conservación de reservas contables y de hashes de supresión exige revisión del responsable antes de activar. El job no reintenta automáticamente mensajes cuyo proveedor pudo haberlos aceptado.

La cuenta opcional requiere activar [email-link en Firebase Authentication](https://firebase.google.com/docs/auth/admin/email-action-links), autorizar el dominio HTTPS y `BOOKING_CUSTOMER_ACCESS_ENABLED=true`. `/api/customer/access` valida primero el token del draft y el mismo email; encola un enlace de Firebase y no afirma que ya se haya entregado o creado una cuenta. Los enlaces de acceso en cola caducan a los 15 minutos y se eliminan del outbox tras su resolución. `/api/customer/bookings` exige un ID token Firebase válido con email verificado y devuelve únicamente las reservas de ese email. No se trata un token de presupuesto como login de toda la cuenta. La compra sigue permitida como invitado.

## Comprobaciones y pendientes

Las suites locales cubren precios de servidor, reintentos, conflicto de payload, fechas Zurich, revisión, autorización, depósito, pago pendiente/TEST/LIVE, firma y referencia/importe/modo, checkout incierto y emails sin éxito fingido. La suite de recuperación incluye SQLite local como verificación del núcleo entregado. Los adapters Firestore requieren además revisión de índices/reglas y una prueba con emulador o proyecto TEST autorizado; no se ejecuta contra datos de clientes durante esta integración. Pendientes reales: credenciales Admin/Payrexx/Resend y secretos de firma, registrar los webhooks firmados en ambos proveedores, scheduler privado, revisión de remitente y reglas/índices, habilitar email-link y validar el flujo completo contra proveedores TEST antes de LIVE.
