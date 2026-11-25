# Recuperación de solicitudes y actividad real de Kraken

Este paquete implementa el núcleo de servidor, persistencia SQL, colas de email, recuperación con tokens y plantillas DE/EN/ES/FR/IT/PT. **No está activado en la preview:** no hay base de datos ni proveedor de email configurados allí. El código no llama a un proveedor externo por su cuenta y no contiene claves. La captura de la preview sigue siendo una demostración local.

## Archivos

- `policy.mjs`: consentimiento, límites, horario Europe/Zurich, validación y selección de actividad pública.
- `schema.sql`: migración para D1/SQLite, drafts, outbox, supresiones, límites y actividad.
- `d1-store.mjs`: persistencia con parámetros SQL, inserciones idempotentes, leases y cambios condicionados por versión.
- `service.mjs`: servicio de aplicación con adapters inyectados, estados de contratación, recordatorios y token de reanudación.
- `http.mjs`: endpoints y página de baja sin login.
- `emails.mjs`: mensajes HTML con tablas y alternativa de texto, en seis idiomas.
- `recovery.test.mjs`: pruebas del servicio y del adapter real sobre SQLite.

## Flujo comercial

1. El visitante ya puede ver su precio. Elige **guardar su selección y recibirla por email**. No se exige crear una cuenta.
2. Se solicita únicamente email, servicio/selección e idioma. La casilla de recordatorios empieza vacía y es independiente del email solicitado.
3. `POST /api/recovery/drafts` valida el precio en servidor, guarda el draft y añade el email solicitado al outbox.
4. Los recordatorios están desactivados por defecto. Solo se programan con el gate operativo habilitado y consentimiento `recovery-2026-11-24`. Los mínimos internos son 4 y 24 horas de inactividad, y al menos 20 horas desde el primer envío para el segundo. El cron de producción es diario; la interfaz comunica próximos días, sin prometer horas exactas.
5. Los recordatorios se envían únicamente entre 09:00 y 19:00 de Zürich. La zona IANA cubre CET/CEST. El email que el usuario acaba de pedir se puede despachar inmediatamente.
6. Una solicitud enviada al negocio queda en `awaiting_confirmation`: se suspenden los recordatorios comerciales mientras Kraken debe confirmar la cita.
7. Solo el backend de reservas puede habilitar `payment_ready`, al confirmar `canCheckout`, modo `live`, estado `confirmed` y un `holdExpiresAt` futuro. Los enlaces reabren el booking existente y piden su estado actual; no reutilizan un enlace Payrexx caducado.
8. Pago, finalización, cancelación, devolución y baja detienen los recordatorios correspondientes. La supresión local por rebote o queja necesita recibir el evento autenticado del proveedor; no se presupone seguimiento si ese flujo no está conectado. No se añade un descuento adicional al ahorro hipotético de IVA.

Las dos oportunidades de recordatorio pertenecen al mismo draft; no se reinician al pasar de formulario a pago. No se prometen cupos, fechas, precios congelados ni reservas inexistentes.

## Activación en el backend de producción

Reutilizar el backend y proveedor de email reales de Kraken. Aplicar la migración en una base D1/SQLite autorizada; no aplicarla sobre una tabla de producción sin su proceso de despliegue. El adapter D1 usa `prepare().bind()`, `first()`, `all()`, `run()` y `batch()`; las operaciones de batch deben ser transacciones.

En producción, guardar un presupuesto y enviar el correo solicitado funcionan sin recordatorios. Para estos últimos, el runtime exige `BOOKING_RECOVERY_REMINDERS_ENABLED=true` y `RESEND_WEBHOOK_SECRET` válido. No habilitar el flag hasta disponer de eventos de rebote/queja autenticados y aislados para Kraken. Una cuenta compartida sin filtro de dominio no justifica dirigir los eventos de otros dominios a esta web. Mientras el gate esté desactivado no se crean ni envían recordatorios, incluidos los jobs antiguos; el opt-in no se muestra. El cron diario de Hobby sigue atendiendo los envíos solicitados y su mantenimiento.

```js
import { createD1RecoveryStore } from './integrations/recovery/d1-store.mjs';
import { createRecoveryService } from './integrations/recovery/service.mjs';
import { createRecoveryHandler } from './integrations/recovery/http.mjs';

// Este bloque solo se construye cuando la configuración real está preparada.
const recovery = createRecoveryService({
  store: createD1RecoveryStore(env.RECOVERY_DB),
  calculatePrice, // motor autorizado de Kraken; nunca un total aportado por el navegador
  sendEmail,      // adapter del proveedor real, con idempotencia y remitente verificado
  resolveBookingForRecovery, // consulta al backend de reservas; contrato más abajo
  publicBaseUrl: 'https://krakenpfm.ch',
  sender: env.RECOVERY_EMAIL_FROM,
  tokenSecret: env.RECOVERY_TOKEN_SECRET, // aleatorio, >= 32 bytes, solo servidor
  remindersEnabled: false, // activar únicamente con el flujo de eventos del proveedor preparado
});
const handleRecovery = createRecoveryHandler({
  service: recovery,
  publicBaseUrl: 'https://krakenpfm.ch',
  authorizeCapture: verifyCaptureChallenge,
});

// En fetch, antes del router de páginas:
const response = await handleRecovery(request);
if (response) return response;

// Ejemplo del núcleo para un worker autenticado; no activa un scheduler externo.
// El runtime Kraken usa el cron diario de vercel.json y un batch/presupuesto compartido.
await recovery.runDue({ limit: 6 });
```

`verifyCaptureChallenge(request, body)` debe validar el control antiabuso real y devolver `{rateKey}` derivado en servidor de un identificador fiable; no copiar una cabecera arbitraria del cliente. Se aplican además límites persistentes: 3 capturas por email/hora, 5 por email/día y 20 por origen/hora. Los reintentos idempotentes no consumen otra captura. Sin este adapter, la captura HTTP queda deshabilitada. Para recuperar una configuración no preparada, `createRecoveryHandler()` responde con configuración deshabilitada y actividad vacía, sin simular envíos.

`sendEmail(message)` recibe `{from,to,subject,html,text,idempotencyKey,tags}`. Debe aceptar un `idempotencyKey` estable y devolver `{id}` solo cuando el proveedor haya aceptado el mensaje. `sent` significa aceptado por el proveedor, no que haya llegado a la bandeja de entrada. Una excepción normal se considera resultado incierto y queda `delivery_unknown`, sin reintento automático. Solo un error que garantice que no se envió puede marcar `definitelyNotSent:true`; `retryable:true` permite hasta tres intentos en total. Un lease interrumpido también se conserva como resultado incierto para reconciliación. Verificar las firmas de los webhooks de rebote/queja antes de llamar a `suppressEmail`.

El núcleo aislado no registra un endpoint de scheduler, administración o webhook. El runtime actual de Kraken añade GET `/api/booking/maintenance`, protegido por `CRON_SECRET`, y el cron diario de `vercel.json`. Las rutas de solicitud, recibo y captura despachan únicamente su propio job y esperan el intento. `stopDraft` y `recordBookingEvent` siguen siendo operaciones internas del backend. Las pruebas del paquete no activan jobs externos ni envían mensajes reales.

## API de navegador

Todas las respuestas contienen `Cache-Control: no-store`. Los POST/PATCH requieren origen idéntico y JSON limitado a 32 KiB. Los errores exponen códigos, no excepciones ni datos personales.

| Método y ruta | Contrato |
| --- | --- |
| `GET /api/recovery/config` | `{enabled,emailReady,socialProofReady,remindersEnabled,consentVersion}` |
| `POST /api/recovery/drafts` | Body `{email,selection,language,guidePreferences?,reminderConsent,consentVersion:'recovery-2026-11-24',idempotencyKey}`. Cabecera `Idempotency-Key` opcional, coincidente. Devuelve `{id,accessToken,expiresAt,mailStatus,remindersEnabled}`. |
| `GET /api/recovery/drafts/:id` | `Authorization: Bearer <accessToken>`. Devuelve `{id,email,language,selection,guidePreferences,quote,stage,bookingId,reminderConsent,expiresAt,resumeBooking}`. |
| `POST /api/recovery/drafts/:id/activity` | Bearer + `{selection?,language?,guidePreferences?}`. Actualiza última actividad; revalida el presupuesto cuando llega una nueva selección. `language` admite exactamente `de`, `en`, `es`, `fr`, `it` o `pt`; cualquier otro valor se rechaza sin guardar cambios. También acepta PATCH. Serializar/debouncear estos updates en el cliente. |
| `PATCH /api/recovery/drafts/:id/consent` | Bearer + `{reminderConsent:false}`. Da de baja los recordatorios del email. No permite un opt-in silencioso. |
| `GET /recovery/unsubscribe?draft=<id>&lang=<lang>#token=<token>` | Página de confirmación accesible sin login. El fragmento se limpia antes de enviar la petición. Abrir el enlace no modifica datos. |
| `POST /api/recovery/unsubscribe` | `{id,token}` desde la confirmación de baja; no requiere sesión. |
| `GET /api/bookings/activity?cursor=<opaque>` | `{events:[{id,service,region,occurredAt,status:'confirmed'}],cursor}`; solo datos aprobados y anónimos. |

Estados de `mailStatus`: `queued`, `sending`, `sent`, `failed`, `delivery_unknown`. `capture` normalmente devuelve `queued`. Si ya existe una supresión de recordatorios para ese email, un nuevo email explícitamente solicitado puede enviarse, pero `remindersEnabled` será `false`. Rebotes/quejas bloquean también ese envío hasta que un operador resuelva la supresión.

El enlace de reanudación es `/quote?draft=<id>&lang=<lang>#resume=<accessToken>`. Limpiar el fragmento **antes** de cualquier petición o analítica. No guardar email, dirección, token o booking en localStorage. La API protege el draft con un token HMAC opaco; la base almacena su hash. Nunca registrar tokens, cuerpo de la captura o cuerpos de email. Una rotación del secreto invalida enlaces existentes: planificarla como tal.

### Idioma del sitio y de los emails

La captura conserva el idioma elegido en el sitio. Un cambio posterior puede sincronizarse mediante el endpoint autenticado de actividad; los siguientes emails y sus enlaces usan la preferencia actual del draft. Esto no envía un email inmediato, no vuelve a solicitar el email guardado ni crea consentimiento para recordatorios. No modifica mensajes ya entregados. El frontend debe incluir `language` al guardar o actualizar y sincronizar un cambio explícito de idioma. Al restaurar, debe conservar un idioma válido elegido explícitamente por el cliente; en ausencia de esa elección puede utilizar el idioma guardado.

El backend de reservas de producción debe persistir `booking.language` al aceptar la solicitud y usarlo para el acuse de solicitud, confirmación y recibo de pago. El webhook de Payrexx debe leer ese campo del booking autorizado, no deducirlo de la dirección, el cantón, el idioma del navegador ni de los metadatos no validados del proveedor. Las plantillas transaccionales y el recibo no forman parte de este paquete de recuperación: su conexión y verificación dependen del backend real. La demo no debe afirmar que los ha enviado.

### Guía de mudanza guardada

La captura y el endpoint autenticado de actividad admiten `guidePreferences: {from, to, vehicle}`. Es un objeto estricto con exactamente esas tres claves: `from` y `to` solo admiten `unknown`, `zurich`, `winterthur`, `schaffhausen`, `zh`, `sh` u `other`; `vehicle` debe ser booleano. No se aceptan direcciones, nombres, emails ni texto libre dentro de estas preferencias. Cualquier valor inválido devuelve `INVALID_GUIDE_PREFERENCES` sin actualizar idioma, selección ni actividad.

Si la captura omite el campo, se guardan `{from:'unknown',to:'unknown',vehicle:false}`. Si una actualización lo omite, se conserva el valor anterior. GET devuelve las preferencias para restaurarlas antes de montar `MovingGuide`. Se almacenan dentro del JSON del draft existente, sin migración adicional; forman parte de la huella de idempotencia de la captura. Omitirlas y proporcionar los valores predeterminados son solicitudes equivalentes.

Los emails de `moving` y `endOfTenancy` incluyen una tarjeta y enlace a la guía en los seis idiomas. El enlace es `/quote?draft=<id>&lang=<lang>&guide=1#resume=<accessToken>`: conserva el token en el fragmento, no expone las preferencias ni datos personales. El frontend debe consumir el fragmento, recuperar el draft autenticado, restaurar `guidePreferences` y después abrir la guía mediante `guide=1`; consumir también este indicador para evitar reaperturas involuntarias. El enlace tiene la misma caducidad que el draft y no crea otra reserva.

El documento se genera en el navegador con las preferencias recuperadas, la selección actual y solo los datos que el cliente facilite. Permite descargar HTML autónomo o usar **Imprimir / guardar como PDF** del navegador. Este paquete **no adjunta un PDF al email ni afirma que exista un archivo adjunto**. La fecha y las instrucciones de la guía se revisan en el componente; los enlaces a autoridades se abren por separado. La preview sigue sin enviar emails.

## Conexión con la reserva y el pago reales

Después de que el backend valide y cree una solicitud, tomar `recovery:{id,accessToken}` del payload y vincularla al email **ya validado por el backend**:

```js
await recovery.linkBooking({
  id: payload.recovery.id,
  accessToken: payload.recovery.accessToken,
  email: booking.customer.email,
  bookingId: booking.id,
});
```

La función compara token y email, guarda `bookingId` y pasa a `awaiting_confirmation`. No termina una compra que todavía tiene un pago pendiente. Usar `completed:true` únicamente para un flujo de contratación cuyo contrato considere la solicitud completada sin pago pendiente.

`resolveBookingForRecovery(bookingId,email)` debe comprobar la relación del email con el booking y devolver exclusivamente estado autorizado:

```js
{
  bookingId,
  publicToken, // token actual para el endpoint ya existente de estado del booking
  email,      // opcional, comprobado también si se devuelve
  mode: 'live',
  status: 'confirmed', // awaiting_confirmation, confirmed, completed, cancelled, expired
  canCheckout: true,
  paymentStatus: 'pending', // paid/refunded/chargeback/etc. cierran los recordatorios
  holdExpiresAt: '2026-12-01T12:00:00.000Z', // ejemplo de formato, nunca usar como fecha real
}
```

GET draft devuelve `resumeBooking:{bookingId,publicToken,canCheckout,status}` cuando existe una reserva. El frontend debe abrir ese booking existente, consultar su estado y pedir un checkout actual cuando corresponda. **No debe crear otra solicitud** a partir de esa selección. Si hay `bookingId` y falta el resolver o este no puede verificar la vinculación, GET devuelve `503 BOOKING_RECOVERY_UNAVAILABLE` y los recordatorios de pago permanecen suspendidos. El estado se vuelve a resolver antes de enviar recordatorios. Nunca se habilita un recordatorio de pago por una afirmación del navegador o por el mero redirect de Payrexx.

En la confirmación real del pago, después de validar webhook y consultar el proveedor:

```js
await recovery.stopDraft(recoveryId, 'paid');
await recovery.recordBookingEvent({
  bookingId: booking.id,
  revision: booking.revision, // versión monotónica del estado, nunca un timestamp inventado
  status: 'confirmed', mode: 'live', paymentStatus: 'paid',
  service: booking.service, region: booking.region,
  occurredAt: booking.confirmedAt, draftId: recoveryId,
});
```

Los estados terminales se conservan para evitar reanudar una compra cerrada. El backend de booking es la fuente de verdad. Ninguna automatización puede retirar un email que el proveedor ya haya aceptado: hay una comprobación final previa al envío; un cambio simultáneo durante la petición al proveedor se debe reconciliar.

## Actividad pública

El método server-side `recordBookingEvent` acepta únicamente eventos verificados, modo `live` y revisión monotónica. Por defecto exige `status:'confirmed'` y pago `paid`. Excluye pruebas, fallos, devoluciones, contracargos y cancelaciones. El replay de una revisión anterior no puede reactivar una reserva devuelta. `requirePaidSocialProof:false` es una decisión explícita de negocio para reservas confirmadas que no requieren pago previo; no cambiarla por conveniencia visual.

La salida solo contiene un ID opaco, servicio del enum, región del enum (`Zürich`, `Schaffhausen`, `Winterthur`), hora redondeada al minuto y `status:'confirmed'`. No contiene nombre, email, dirección, importe, texto del cliente ni ID de booking. La ventana visible es de 24 horas. Si no hay contrataciones reales, la lista está vacía. No se generan eventos de relleno.

## Conservación y verificación

`runDue` elimina los drafts y su outbox a los siete días desde la captura, tanto si están activos como cerrados. Se conservan hashes keyed mínimos para respetar las bajas y las revisiones de eventos; no contienen direcciones en claro. Los límites caducados se eliminan. En producción, el job debe seguir ejecutándose incluso cuando no hay emails pendientes para cumplir la purga. Definir la política organizativa para hashes/tombstones y su borrado antes de activar el servicio.

Ejecutar con Node 24:

```sh
node --test integrations/recovery/recovery.test.mjs
```

Las pruebas usan SQLite real, transacciones y el adapter de D1. Cubren consentimiento independiente, precios de servidor, idempotencia, dispatchers concurrentes, horario Zürich/DST, inactividad, baja, rebotes, pagos, expiración, recuperación de bookings existentes, ausencia del resolver, payload público mínimo, replay de devoluciones, seis idiomas, preferencias de guía con validación estricta, recuperación segura de la guía, enlaces sin datos personales y límites HTTP. No se ha probado un proveedor de email ni Payrexx porque no hay credenciales/configuración en la preview.

Referencias del adapter: [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/) y [D1 transactional batch](https://developers.cloudflare.com/d1/worker-api/d1-database/).
