# Preparación de correo, recordatorios y acceso — 27/11/2026

## Activación general y registros antiguos

`BOOKING_EMAIL_COLLECTION_ENABLED=true` selecciona la colección para eventos que ya persiste el backend: solicitud recibida, presupuesto guardado solicitado, avisos de estado real de pago, confirmación y recordatorio de cita. No convierte las 30 plantillas en automatizaciones. La matriz completa está en `EMAIL_COLLECTION_INTEGRATION.md`. Las ofertas manuales disponen de método interno y controles de idioma, pero aún no de pantalla/endpoint privado de aprobación.

No hace falta migrar producción para activar registros nuevos compatibles. El worker conserva los sobres ya preparados y no reinventa su idioma. Una notificación sin snapshot de idioma, versión de plantilla o evento válidos queda `failed`, sin llamada al proveedor, con `EMAIL_SNAPSHOT_REVIEW_REQUIRED`/`EMAIL_PREPARATION_FAILED`. No se corrige el pasado automáticamente. La migración histórica existente sigue siendo una operación separada y explícita; no se añaden endpoints para extraer credenciales. Los desenlaces de envío inciertos quedan `delivery_unknown` y no se reintentan a ciegas.

## Flags y requisitos

| Variable | Valor preparado | Alcance/requisito |
| --- | --- | --- |
| `BOOKING_EMAIL_COLLECTION_ENABLED` | Puede activarse al publicar la revisión | Reutiliza Resend configurado, dominio verificado, `BOOKING_EMAIL_FROM`, assets HTTPS y outbox Admin operativo. Probar un mensaje sintético por idioma en el destinatario autorizado. No requiere webhook de rebotes para solicitudes transaccionales explícitas. |
| `BOOKING_EMAIL_COLLECTION_PAYMENTS_ENABLED` | `false` | Sólo recibos `deposit_received`/`payment_received`. Coordinación pendiente con las notificaciones propias de Payrexx para idioma y duplicados. El flag general también habilita avisos pendiente/fallido y confirmación; este flag no los bloquea. No cambia cobros. |
| `BOOKING_RECOVERY_REMINDERS_ENABLED` | `false` | Antes de activarlo: feed de rebotes/quejas realmente aislado para Kraken, webhook verificado, `RESEND_WEBHOOK_SECRET`, `RESEND_WEBHOOK_SENDER_DOMAIN=krakenpfm.ch`, `CRON_SECRET`, cron y consentimiento vigente. Máximo dos recordatorios; nunca tras pago/cancelación ni si el estado real no se puede verificar. |
| `BOOKING_CUSTOMER_ACCESS_ENABLED` | `false` | Requiere habilitar Email link en Firebase Authentication y autorizar el dominio de producción/continuación. El proveedor Email/Password existente por sí solo no habilita email-link. Se debe probar login/cierre de sesión y usuario ajeno antes del rollout. |

El código no activa variables remotas, no crea cuentas y no envía pruebas. Las pruebas usan exclusivamente el destinatario autorizado, definido localmente mediante `KRAKEN_TEST_EMAIL_RECIPIENT`; su dirección no forma parte de la configuración pública. Son datos ficticios con TEST visible y acciones desactivadas.

## Rebotes/quejas: defensa y aislamiento

El endpoint verifica Svix sobre los bytes originales y su ventana temporal. Después acepta únicamente `email.bounced`, `email.complained` y `email.suppressed` cuyo `data.from` sea un único buzón del dominio exacto configurado. No usa coincidencias por sufijo ni subdominios implícitos. Los eventos válidos de otra marca se ignoran antes de consultar IDs, destinatarios o supresiones. Los eventos locales deduplican ID+hash y completan sólo tras actualizar ambas colas; una interrupción puede reintentarse idempotentemente.

Esto **no impide que un feed global de una cuenta compartida transporte datos de otras marcas al endpoint**. La creación de webhooks de Resend no documenta un filtro por dominio: no crear un feed global compartido como si estuviera aislado. Falta elegir una separación real admitida por el proveedor. Sin ella, mantener recordatorios apagados. No se registra el cuerpo de eventos ignorados.

## Acceso cliente y alcance

La solicitud opcional exige sesión same-origin, prueba del borrador y coincidencia de su email, límite de solicitudes y ausencia de supresión. La identidad estable del job se guarda antes de generar el enlace Firebase. Sólo el worker que reclama el job genera el enlace con el SDK; antes de llamar a Resend persiste el sobre completo. Repetir la misma petición no regenera códigos ni envía duplicados. Fallos anteriores a transporte son definitivos; resultados inciertos del proveedor quedan aislados.

La generación conserva la URL firmada sin modificarla y sólo admite HTTPS en el manejador de autenticación del dominio autorizado. La vida del código la controla Firebase; el límite de entrega de la cola no se anuncia como caducidad de login. La prueba de 15 minutos de recuperación de una reserva es un mecanismo separado y sí caduca de forma efectiva.

`GET /api/customer/bookings` comprueba el token Firebase y revocación; exige `email_verified === true` y consulta exclusivamente `customer.email` igual al correo normalizado de ese token. Ignora correos aportados por el cliente; no devuelve capacidades públicas de otras reservas. No amplía permisos Firestore ni roles del usuario.

## Fuentes primarias

- [Resend: creación de webhooks](https://resend.com/docs/api-reference/webhooks/create-webhook): URL y eventos; no se documenta filtro de dominio.
- [Evento de rebote](https://resend.com/docs/webhooks/emails/bounced), [queja](https://resend.com/docs/webhooks/emails/complained), [supresión](https://resend.com/docs/webhooks/emails/suppressed): `data.from` puede conservar nombre visible; `data.to` identifica destinatarios afectados.
- [Firebase: generación de enlaces de acción](https://firebase.google.com/docs/auth/admin/email-action-links): generación con SDK, continuación en dominio autorizado y modo de acceso dentro de la aplicación. No se inventa un vencimiento no expuesto por el proveedor.

## Evidencia local

Pruebas: `booking-email-suppression`, `customer-account-access`, `customer-access-handlers`, `recovery-email-collection`, suites existentes de renderer (180 combinaciones), eventos/idioma de reservas y despacho/recuperación automática. Cubren firma, marca ajena, repetición, consentimiento retirado, pago/cancelación durante preparación, actividad reciente, expiración, errores antes/después del transporte, reintentos y acceso exclusivo al correo verificado.

Las vistas previas y JSON de envío se generan en `outputs/completion-2026-11-27/emails`. No son registros de entrega. La comprobación del proveedor y los envíos autorizados deben registrarse por separado.
