# Operación privada de solicitudes y correo — P0, 26/11/2026

Esta rama prepara revisión local y PR. No publica, no cambia permisos remotos ni realiza cobros o envíos reales de prueba.

## Fuente del estado

El panel nuevo «Solicitudes del calculador» usa `kraken_bookings` y `kraken_booking_outbox` a través de la API Admin. El listado antiguo de `maintenance_requests` sigue siendo un registro separado: se han retirado sus controles de aprobación que únicamente cambiaban estado React. No se migran ni confirman registros antiguos por inferencia.

Una lectura del panel usa `store.get/list` y `service.view`; nunca `service.read`, reconciliación Payrexx ni creación de Gateway. El panel muestra el alcance, cliente, fecha solicitada, idioma guardado y los importes calculados por el servidor. No permite editar precios, destinatarios ni contenido de un email preparado.

## Autorización y confirmación

Cada petición del panel envía un ID token Firebase de la sesión actual. Admin ejecuta `verifyIdToken(token, true)` y aplica la misma política de personal verificado que la aplicación: correo verificado y una identidad exacta existente de personal, o claim `admin: true`. Un campo `staff` proporcionado por el navegador, un sufijo de dominio o una cuenta no verificada no conceden acceso. Auth se carga de forma perezosa para el panel, independientemente de `BOOKING_CUSTOMER_ACCESS_ENABLED`.

Los POST exigen origen exacto, JSON, captura firmada del servidor, límite de tamaño y límite persistente por operador. La confirmación exige la revisión actual y una casilla expresa de comprobación de alcance, dirección, acceso y disponibilidad. La caducidad de la autorización debe estar en el futuro y no superar siete días. Una revisión obsoleta devuelve 409.

El servidor conserva la operación existente: la disponibilidad pasa a `held`, se habilita `canCheckout` y se encola, en la misma transacción, un único trabajo `payment_ready` de la colección aprobada `payment_requested`. El enlace lleva al portal personal, donde el cliente debe aceptar los términos de su revisión antes de abrir Payrexx. La confirmación del operador no crea Gateway, no registra un pago y no confirma un anticipo. El porcentaje del 15 %, los precios y la confirmación posterior de pago no se modifican.

Rutas privadas:

- `GET /api/booking/operator/requests`: últimas 25 solicitudes.
- `POST /api/booking/operator/requests/search` con `{reference}`: búsqueda exacta en el cuerpo, sin datos del cliente en URL.
- `GET /api/booking/operator/requests/:id`: detalle y estados seguros del outbox.
- `POST .../:id/confirm` con `{expectedRevision, availabilityChecked:true, holdExpiresAt}`.
- `POST .../:id/email/retry` con `{jobId, expectedAttempts}`.

Las respuestas privadas no incluyen tokens de acceso del cliente, Gateway URL, cuerpo HTML del email, ID del proveedor ni credenciales. El cliente descarta respuestas de una identidad anterior y no almacena estos datos en URL, localStorage o analítica.

## Error y reintento de correo

Los fallos futuros conservan únicamente código interno seguro, HTTP, nombre de error de Resend de una lista cerrada, prueba de no aceptación y fecha. Nunca se guarda el texto de respuesta, stack o contenido del proveedor en el diagnóstico.

El reintento manual es posible solamente para un trabajo `failed` con rechazo definitivo del proveedor, sobre el mismo mensaje previamente preparado y su misma clave de idempotencia. Una transacción comprueba de nuevo la supresión, destinatario actual, contador y estado antes de reencolar. No se permite reintentar `sent`, `sending`, `delivery_unknown`, cancelados, suprimidos, enlaces de acceso, mensajes sin prueba histórica ni mensajes sin sobre inmutable. El contador total está limitado a seis intentos. Los reintentos automáticos ya existentes por 429 mantienen sus límites.

Resend retiene sus claves durante 24 horas: la seguridad adicional no depende de una deduplicación perpetua del proveedor. La aplicación conserva su trabajo y bloquea todo resultado incierto. Una aceptación del proveedor tampoco se presenta como entrega al destinatario.

**Limitación histórica:** un `failed` anterior sin diagnóstico seguro no revela ahora su causa original. El panel lo marca como revisión necesaria y no habilita un reenvío ciego. Esta rama no consulta el buzón, logs ni cuenta de producción para reconstruirlo.

## Recuperación privada

La creación de solicitud y el establecimiento explícito de un enlace autenticado emiten una cookie firmada HttpOnly, Secure, SameSite=Strict, limitada a `/api/booking` y siete días. Las lecturas ordinarias y la recuperación no renuevan su vencimiento. La cookie no contiene cliente, dirección, importe ni estado de pago; el servidor comprueba la revocación de la solicitud antes de devolver acceso.

La recuperación por referencia y email mantiene una respuesta genérica y tasas persistentes, y prepara un enlace firmado de quince minutos para el buzón correspondiente. Antes de cualquier búsqueda de destinatario, la API exige que el host acepte un trabajo de ciclo de vida pendiente. En Vercel se utiliza el scheduler existente basado en `waitUntil`. Sin un scheduler real, devuelve el mismo 503 para todos los solicitantes y no hace búsqueda, encolado ni envío. El cron diario no se considera suficiente para enlaces de quince minutos. No existe envío en segundo plano sin seguimiento.

Una vez persistido el outbox, ese trabajo fijado al ciclo de vida envía únicamente el mensaje correspondiente y la respuesta HTTP no espera al proveedor. Los errores mantienen el estado durable seguro. Los enlaces preparados de acceso se eliminan del outbox en estados terminales/inciertos.

## Configuración y revisión antes de publicar

Se reutilizan las variables Admin, correo, Payrexx y secreto de reserva existentes. No se añaden claves al navegador ni se solicitan permisos nuevos. El panel requiere correo y pago configurados para confirmar y enviar el enlace. La recuperación por email requiere además el scheduler Vercel. En pruebas locales se inyecta un scheduler rastreado y se esperan sus promesas al finalizar.

Antes de aplicar remotamente, el propietario debe comprobar las identidades autorizadas, las credenciales Admin del proyecto y base correctos, índices Firestore, correo y webhooks ya configurados. Nada de esto se activa remotamente con este cambio. La consulta privada por referencia+email puede usar índices de igualdad combinados; si la base exige un índice compuesto, revisar la definición de `docs/booking-firestore-indexes.json` antes de publicar.

## Comprobaciones

Las pruebas utilizan datos sintéticos, dobles del proveedor y un adaptador de transacciones local. Cubren identidad verificada/revocación, CSRF, cambios de revisión, confirmación real en el almacén, importes inalterados, ausencia de Gateway, snapshot de email en español, reintentos concurrentes, supresión y resultados inciertos, respuestas de sesión obsoleta, cookie en rutas reales del middleware y recuperación con ciclo de vida fijado antes de la consulta. No equivalen a un pago real ni a entrega real de un correo. La comprobación independiente con emuladores reales está a cargo del flujo QA de esta rama.

Fuentes primarias revisadas: [Firebase: revocación de sesiones](https://firebase.google.com/docs/auth/admin/manage-sessions#detect_id_token_revocation), [Resend: errores](https://resend.com/docs/api-reference/errors), [Resend: idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys).
