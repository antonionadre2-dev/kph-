# Calculadora, reservas y recuperación — integración local

La nueva calculadora usa `src/booking/pricing.ts` también en servidor. Versión `kraken-private-2026-11-24-proposal-v2`, CHF en rappen enteros, anticipo 15 %, IVA CHF 0. Mudanzas y los casos de revisión no generan un total cobrable. El mapa de Contacto existente no se modifica.

## Configuración local y producción

El checkout local no incluye credenciales privadas. Firestore Admin, Payrexx y Resend se configuran por separado en el entorno privado de producción; no se deben descargar sus secretos al checkout. `GET /api/booking/config` informa `available`, `paymentReady` y `emailReady`; sin configuración devuelve los estados deshabilitados y `mode:'unconfigured'`. La calculadora y la demo identificada se pueden revisar localmente sin cobros ni emails. La presencia de variables no sustituye una prueba de conexión o entrega real.

Las suites descritas aquí usan datos y proveedores simulados. El estado de las cuentas, DNS, secretos, envíos y despliegues reales debe verificarse en los servicios de producción, independientemente del estado del checkout local.

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

El checkout no se anuncia como disponible hasta que exista también un secreto de webhook no vacío. Esto no comprueba las credenciales contra Payrexx ni cambia el modo de los proveedores de pago: TEST/LIVE debe configurarse y verificarse en la cuenta Payrexx. Una transacción autenticada necesita un ID numérico entero, positivo y seguro además de importe, moneda, referencia y modo válidos; una respuesta incompleta pasa a reconciliación y no genera un recibo.

Al crear el Gateway se utiliza el idioma validado del checkout para la página de pago y los tres retornos. No cambia el idioma guardado de la reserva ni el snapshot de sus correos. Un Gateway existente sigue reutilizándose para evitar crear un segundo checkout; conserva la configuración con la que fue creado.

En Payrexx configurar webhook JSON firmado a `/api/booking/payrexx/webhook`. Se valida HMAC-SHA256 de los bytes originales con el secreto de webhook y luego se consulta el Gateway mediante la API autenticada. Importe, CHF, referencia, gateway y modo deben coincidir. Un redirect o estado recibido del navegador nunca marca pagado. TEST devuelve `test_paid`. Devoluciones, disputas y discrepancias retiran el estado de éxito y requieren reconciliación. La política conservadora de un checkout incierto puede requerir intervención del operador.

Payrexx espera la respuesta del webhook en 20 segundos. En Vercel, el servidor inyecta un scheduler basado en `@vercel/functions.waitUntil`: primero espera la verificación API y la transacción que guarda pago y trabajos de correo; después registra el envío dirigido de esos trabajos en el ciclo de vida de la petición y responde. Los recibos permanecen en el outbox, con sus claves y leases, y callbacks duplicados no generan otro envío. Si no hay contexto Vercel real o falla el registro del scheduler, se espera el envío como respaldo. Fuera de Vercel, las lecturas del cliente y las reconciliaciones ordinarias siguen esperando el correo.

Esto retira la latencia de Resend del tiempo de respuesta del webhook en Vercel; no garantiza que una API de pago o base de datos lenta responda antes de 20 segundos. `waitUntil` comparte el límite de duración de la función: si ésta expira, la cola duradera y su política de resultados inciertos siguen siendo necesarias. Mantener los reintentos de webhook y el mantenimiento existentes. [Ciclo de vida de Vercel](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#waituntil).

Diagnóstico temporal privado: `PAYREXX_CONNECTION_CHECK_UNTIL` puede contener un vencimiento ISO UTC situado en los próximos quince minutos. Sólo en Vercel, con pagos configurados, un GET de `/api/booking/config` activa una única comprobación de lectura por runtime/ventana: autenticación y métodos CHF para pago único, con diez segundos de límite total. No crea Gateways ni transacciones. El resultado restringido se registra con el prefijo `[booking:payrexx-connection-check]`; no incluye claves, nombres/IDs de proveedores, saldos ni respuestas crudas y nunca forma parte del JSON público. Un fallo no deshabilita las reservas. El webhook y la inicialización general no ejecutan ni esperan ese diagnóstico. Sin flag válido, no se hacen llamadas.

Referencias consultadas: [autenticación y JSON](https://developers.payrexx.com/reference/rest-api), [crear Gateway](https://developers.payrexx.com/reference/create-a-gateway), [verificar Gateway](https://developers.payrexx.com/reference/retrieve-a-gateway), [webhook firmado](https://docs.payrexx.com/developer/guides/webhook), [estados y modo](https://docs.payrexx.com/developer/guides/webhook/transaction). La prueba de contrato local usa fixtures y no sustituye la certificación contra la cuenta Payrexx TEST real antes de activar LIVE.

## Correo, recuperación y cuenta opcional

Configurar en producción `RESEND_API_KEY` y `BOOKING_EMAIL_FROM` con remitente verificado. Guardar presupuestos por email requiere además `RECOVERY_TOKEN_SECRET` y `CRON_SECRET`, ambos aleatorios de al menos 32 caracteres. No se habilita el acceso de clientes por configurar el correo. El adapter de [Resend](https://resend.com/docs/api-reference/emails/send-email) conserva una clave de idempotencia estable. `sent` significa aceptación por el proveedor, no entrega en bandeja. Red, timeout y resultados inciertos permanecen `delivery_unknown`, sin reenvío automático.

Las rutas esperan el intento de envío dirigido a su propio job: solicitud recién persistida, recibo tras pago verificado y correo del presupuesto guardado. No drenan la cola de otros clientes ni dejan promesas sin esperar al finalizar la petición. Si falla el envío o su lectura posterior, la solicitud, pago o borrador ya persistido conserva su éxito y no inventa un estado `sent`; el outbox mantiene el estado de entrega. Los rechazos HTTP429 conocidos de Resend pueden reencolarse con un máximo de tres intentos, misma clave y respeto a `Retry-After`; los demás resultados inciertos no se convierten en reintentos automáticos.

El núcleo de recuperación está en `integrations/recovery/`, con adapter Firestore que conserva transacciones, versión, outbox y leases; no se aplica el SQL de D1/SQLite a Firestore. El correo solicitado al guardar es independiente de los recordatorios. Estos están desactivados por defecto: el runtime exige `BOOKING_RECOVERY_REMINDERS_ENABLED=true`, un secreto de webhook y un flujo de rebotes/quejas autenticado y aislado para Kraken antes de habilitarlos. La cuenta compartida de Resend sin filtro por dominio no debe enviar los eventos de otros dominios a esta web. `/api/recovery/config` informa `remindersEnabled`; con el gate desactivado la captura sigue funcionando, el consentimiento no se muestra y los recordatorios pendientes no se envían.

Cuando estén habilitados, los recordatorios requieren opt-in y se envían en los próximos días, entre 09:00 y 19:00 Europe/Zurich. Los mínimos internos de 4/24 horas y 20 horas entre primero y segundo no son una promesa pública de horario exacto. No se envían el correo inicial y un recordatorio del mismo borrador en una ejecución, ni dos recordatorios juntos. Pago, cancelación y baja detienen la secuencia. El handler `/api/booking/email/webhook` verifica los bytes originales con Svix y `RESEND_WEBHOOK_SECRET` antes de aplicar supresiones por `email.bounced`, `email.complained` o `email.suppressed`. La ausencia de ese flujo no se presenta como seguimiento de rebotes activo. [Contrato oficial de verificación](https://resend.com/docs/webhooks/verify-webhooks-requests).

`vercel.json` declara el cron diario de Hobby `0 8 * * *` (08:00 UTC, dentro del horario suizo en CET y CEST), dirigido por GET a `/api/booking/maintenance`. Requiere `Authorization: Bearer <CRON_SECRET>`; otras credenciales o métodos no ejecutan trabajo. La respuesta es privada, no indexable y solo contiene recuentos. El runtime limita ambas colas y las limpiezas por batch y presupuesto temporal. Los errores del worker devuelven HTTP503; los jobs inciertos no se reenvían por ello. Verificar la programación efectiva después del despliegue: una declaración local no acredita que el cron ya haya corrido.

Para mantenimiento manual desde un entorno privado autorizado también está disponible:

```sh
node --import tsx scripts/booking-maintenance.ts
```

El mantenimiento purga los drafts/outbox de recuperación expirados a siete días en lotes acotados. La conservación de reservas contables y hashes de supresión requiere la política del responsable. Las pruebas locales no activan un scheduler externo ni envían mensajes reales.

La cuenta opcional requiere activar [email-link en Firebase Authentication](https://firebase.google.com/docs/auth/admin/email-action-links), autorizar el dominio HTTPS y `BOOKING_CUSTOMER_ACCESS_ENABLED=true`. `/api/customer/access` valida primero el token del draft y el mismo email; encola un enlace de Firebase y no afirma que ya se haya entregado o creado una cuenta. Los enlaces de acceso en cola caducan a los 15 minutos y se eliminan del outbox tras su resolución. `/api/customer/bookings` exige un ID token Firebase válido con email verificado y devuelve únicamente las reservas de ese email. No se trata un token de presupuesto como login de toda la cuenta. La compra sigue permitida como invitado.

## Comprobaciones y pendientes

Las suites locales cubren precios de servidor, reintentos, conflicto de payload, fechas Zurich, revisión, autorización, depósito, pago pendiente/TEST/LIVE, firma y referencia/importe/modo, checkout incierto y emails sin éxito fingido. La suite de recuperación incluye SQLite local como verificación del núcleo entregado. Los adapters Firestore requieren además revisión de índices/reglas y una prueba con emulador o proyecto TEST autorizado; no se ejecuta contra datos de clientes durante esta integración. La revisión de producción debe comprobar credenciales y remitente por separado, webhooks aplicables y su aislamiento, cron efectivo, reglas/índices y entrega real. El acceso por email-link permanece opcional y exige configuración propia. El flujo completo de pago requiere una prueba autorizada con el proveedor; los fixtures locales no acreditan un cobro real.
