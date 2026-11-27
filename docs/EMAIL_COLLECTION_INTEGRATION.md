# Colección de emails de Kraken PFM — integración del 25 de noviembre de 2026

## Estado y alcance de la entrega

La colección suministrada está integrada en el repositorio como **30 plantillas en seis idiomas** (`de`, `en`, `es`, `fr`, `it`, `pt`), con logo original, una ilustración distinta por plantilla y salida HTML/texto real. La referencia original y su galería sintética están en `reference/kraken-emails/`; el runtime está en `integrations/email-collection/` y los 31 recursos públicos en `public/kraken-emails/assets/`.

Hay tres niveles distintos de comprobación:

1. **Renderer:** las 180 combinaciones de plantilla e idioma pueden generarse y revisarse localmente. La galería, la demo y los tests no envían correo, crean reservas ni verifican pagos.
2. **Backend:** los eventos que realmente existen en reservas y recuperación están conectados con snapshots persistidos, outbox, preparación duradera e idempotencia. La tabla siguiente identifica cuáles están conectados y cuáles siguen siendo únicamente contenido listo para una futura función operativa.
3. **Servicios externos:** esta tarea no activa la colección ni envía mensajes reales ni hace cobros. La conexión Resend/Outlook y el envío real de presupuesto se verificaron en la tarea anterior; esa evidencia no equivale a haber enviado las 30 plantillas nuevas a clientes.

La publicación y los resultados globales finales se consignan en el informe de entrega del root. Una publicación de código/recursos con los flags desactivados no activa esta colección.

## Código principal

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `integrations/email-collection/{language,server-email,render,labels,preparation,artwork}.mjs`, `content/` | Validación de idioma, render de producción, etiquetas, instrucciones e imágenes. No contienen transporte ni credenciales. |
| `integrations/email-collection/index.mjs` | Wrapper `prepareCollectionEnvelope()`: revisión admitida, identidad pública, enlaces de web/privacidad localizados y URLs HTTPS de recursos. |
| `server/customer-notifications.ts` | Traducción de códigos de servicio y datos autorizados del registro a snapshots de notificación; identidad del destinatario, evento, plantilla y enlaces de la reserva. |
| `server/booking.ts`, `server/booking-store.ts` | Eventos de negocio reales, transacciones de reservas/outbox, preferencia explícita, preparación previa al transporte, elegibilidad y dispatch. |
| `server/booking-email.ts` | Transporte Resend y renderer anterior durante el rollout desactivado; conserva la clave de idempotencia y trata rechazos/resultados inciertos. |
| `integrations/recovery/{service,policy,firestore-store,d1-store}.mjs` | Captura estricta, snapshots de borrador y notificaciones, CAS de preparación/preferencia, consentimientos y reanudación. |
| `components/ServiceCalculatorPage.tsx`, `src/booking/communicationLanguage.ts` | Restauración de idioma y acción explícita para cambiar la preferencia de comunicaciones. El heartbeat no cambia esa preferencia. |
| `server/email-language-migration.ts`, `scripts/migrate-email-language.ts` | Migración explícita y auditable de registros antiguos; dry-run por defecto. |

## Idioma, datos y transacciones

Los registros nuevos guardan `language` y el objeto completo `languageSnapshot: {language, source, version: 1}` en la misma transacción de negocio. Se exige un idioma compatible; los tags regionales admitidos, por ejemplo `de-CH`, `en-GB` y `pt-BR`, se normalizan. Una entrada nueva ausente, vacía, malformada o incompatible no se convierte silenciosamente a alemán.

Cada notificación conserva `id`, `eventId`, `eventType`, `entityId`, `recipientIdentity`, `recipientEmail`, `templateId`, `templateRevision`, `languageSnapshot` y `renderData`. Su identidad lógica deriva del evento, la plantilla y el destinatario autorizado; ni cambiar una traducción ni desplegar otra versión crea por sí mismo otra notificación del mismo hecho. Los IDs históricos de outbox y las claves de proveedor de booking se conservan durante el cambio de renderer.

Un callback de Payrexx no toma el idioma de sus cabeceras, del navegador o del administrador. `checkout()` valida su contexto de presentación, pero ya no sobrescribe la preferencia de comunicaciones. La recuperación autenticada devuelve el idioma guardado. La interfaz lo restaura si no hay un idioma explícito válido en la URL, sin pisar una elección manual posterior.

Cambiar el selector del sitio no reescribe automáticamente los emails guardados. Cuando el idioma de la página y el de las comunicaciones difieren, aparece una acción explícita traducida:

- Reserva: `PATCH /api/booking/requests/:id/language`, cuerpo `{language}`, con la capacidad de la reserva y los controles de sesión/origen existentes. Devuelve `BookingView` con `language` y `languageSnapshot`.
- Borrador: `POST /api/recovery/drafts/:id/activity`, cuerpo `{language}`, con su capacidad autenticada. Este campo se envía al pulsar la acción de preferencia; el heartbeat ordinario envía selección y preferencias de guía, sin idioma.

El cambio se aplica atómicamente al registro y a las notificaciones aún `queued`, con cero intentos y sin mensaje preparado. Los mensajes intentados, preparados o enviados conservan el idioma, contenido y enlaces de su primer intento. No se modifica el consentimiento ni se envía un correo solamente por guardar una preferencia.

Frecuencia, servicios, líneas de precio y extras provienen de códigos/datos estructurados y catálogos por idioma. El texto libre del equipo necesita traducción disponible o metadatos `localizedContentLanguage`/`staffContentLanguage` coherentes con el destinatario. El alcance manual aprobado utiliza `scopeContentLanguage`; con la colección activa, `approveManualQuote()` exige que el idioma revisado coincida. Si falta esa revisión, se bloquea la preparación en vez de etiquetar el texto como traducido.

Las indicaciones originales del cliente se conservan en su registro protegido. No se inventan nombres a partir del correo ni se exportan códigos de acceso del inmueble al cuerpo del email. Un guardado que solo recoge correo usa saludo neutro, sin inventar ciudad o nombre.

## Preparación, enlaces y reintentos

El worker carga la notificación persistida y genera enlaces autorizados cerca de su primer intento. Añade el idioma guardado antes de formar la capacidad/enlace; conserva los tokens opacos en los mecanismos existentes. La reserva enlaza a su vista autenticada real, no a un recibo PDF inexistente. No se alteran indiscriminadamente enlaces ya firmados ni URLs de Payrexx.

`prepareServerEmail()` se invoca mediante el wrapper en modo `production`. El envelope con destinatario, remitente, Reply-To, asunto, HTML, texto, cabeceras e idempotencia se persiste **antes** de llamar a Resend. Los reintentos reutilizan ese mismo envelope: no vuelven a traducir el registro vivo ni renuevan sus enlaces. Los campos de preparación son `prepared`, `preparedAt` y, cuando corresponde, `preparedExpiresAt`.

El transporte sigue siendo Resend desde `kai@krakenpfm.ch`, con respuesta al mismo buzón de Outlook. La clave y los secretos permanecen únicamente en el entorno privado ya configurado. Esta tarea no crea otra cuenta, clave, proveedor o permiso externo.

Se revalida elegibilidad, estado y supresión antes del transporte. En recordatorios se vuelve a comprobar consentimiento, baja, vigencia del borrador y situación de la reserva. Los rechazos 429 conocidos admiten hasta tres intentos duraderos con la misma idempotencia y respeto a `Retry-After`. Red, timeout, 409 y 5xx mantienen un resultado incierto, sin reenvío ciego. `sent` identifica aceptación por el proveedor, no entrega en la bandeja del destinatario.

La baja visible abre la página interactiva existente. El wrapper conserva `List-Unsubscribe` y retira `List-Unsubscribe-Post`: no anuncia RFC8058 One-Click porque el endpoint actual utiliza confirmación interactiva y un token en fragmento. Los recordatorios continúan desactivados hasta disponer de un flujo autenticado y aislado de rebotes/quejas; no se conecta el feed global de otras marcas de la cuenta Resend a Kraken.

## Mapa completo de plantillas y hechos del backend

**Conectado** significa código de outbox/worker preparado; no significa activado en producción. El string de evento del catálogo valida consistencia, pero no demuestra por sí solo que una operación ocurrió.

| Plantilla | Evento del catálogo | Integración y condición real |
| --- | --- | --- |
| `quote_saved` | `quote.saved.email_requested` | Conectado a `recovery.capture()`: petición explícita, borrador y snapshot guardados. El handler espera únicamente el job propio de guardado. |
| `quote_reminder_1` | `quote.reminder.first_due` | Conectado a `recovery.runDue()`, condicionado por gates operativos, permiso separado, actividad, estado y guardado enviado. No se activa en esta tarea. |
| `quote_reminder_2` | `quote.reminder.final_due` | Conectado al mismo worker; requiere primer recordatorio enviado, separación mínima y elegibilidad vigente. Es el último de la serie. No se activa. |
| `request_received` | `booking.request_received` | Conectado a `create()`: registro y notificación en una transacción. La fecha sigue solicitada, no confirmada. |
| `details_required` | `booking.details_requested` | Renderer listo. Falta una operación del equipo que persista preguntas reales con idioma revisado y cree su evento. |
| `quote_ready` | `quote.issued` | Conectado al método interno `approveManualQuote()`: importe entero y alcance aprobado por operador, revisión de presupuesto y `scopeContentLanguage` correctos. Falta la pantalla/operación privada para emitir esa oferta desde el panel; el panel actual sólo confirma disponibilidad y reintenta correos. No dispara por mostrar el calculador. |
| `booking_confirmed` | `booking.confirmed` | Conectado a la transición verificada de pago que deja la cita en `scheduling.status='confirmed'`, tras la autorización previa de disponibilidad. `confirmAppointment()` por sí solo deja un hold; no envía esta confirmación. |
| `reschedule_proposed` | `booking.reschedule_proposed` | Renderer listo. Falta persistir una propuesta real sin sustituir todavía la cita vigente. |
| `booking_updated` | `booking.updated_confirmed` | Renderer listo. Falta la operación autorizada de cambio acordado y su impacto comercial. |
| `appointment_reminder` | `appointment.reminder_due` | Conectado al confirmar: si la cita está a más de 24 horas, crea un job debido 24 horas antes. El cron es diario; no promete envío a una hora exacta. Revalida fecha y cancelación antes de enviar. |
| `team_on_the_way` | `dispatch.departed_confirmed` | Renderer listo. No existe una salida operativa registrada ni ETA real; la animación de la furgoneta no dispara correos. |
| `payment_requested` | `payment.request_issued` | Conectado tras crear y guardar un Gateway válido con importe de servidor. El CTA conduce al estado autenticado de la reserva, donde se valida el pago. No se envía por pulsar un botón. |
| `deposit_received` | `payment.deposit_settled` | Conectado al pago verificado con saldo positivo; recibo sujeto además al gate de notificaciones de pago. Usa importe recibido, total y saldo autorizados. |
| `payment_received` | `payment.settled_balance_zero` | Selección preparada únicamente para pago verificado con saldo cero; sujeto al gate de pagos. El flujo actual cobra un anticipo del 15%, por lo que no se presenta ese anticipo como pago completo. |
| `payment_pending` | `payment.pending_verified` | Conectado tras verificación real de pendiente y al menos 15 minutos desde la creación del Gateway. Se deduplica y se descarta si el pago cambia antes del envío. |
| `payment_failed` | `payment.failed_verified` | Conectado al fallo final verificado desde el proveedor; no afirma ausencia de una retención bancaria. |
| `balance_due` | `invoice.balance_due_issued` | Renderer listo. Falta emisión de una liquidación/factura real con saldo positivo y vencimiento autorizado. |
| `refund_issued` | `refund.accepted_verified` | Renderer listo, sin automatización. El adapter actual detecta estados de devolución, pero no proporciona todavía el importe de esta devolución y su documento autorizados; no se infiere de una petición interna. |
| `service_completed` | `service.completed_verified` | Renderer listo. Falta una operación del equipo que registre finalización; un pago no equivale a servicio terminado. |
| `review_requested` | `feedback.request_due` | Renderer listo. Falta finalización real y configuración de permiso/base para solicitar una opinión honesta. No se generan reseñas ni incentivos. |
| `issue_received` | `service.issue_received` | Renderer listo. Falta almacenamiento privado del caso vinculado a la reserva y evento confirmado. |
| `issue_resolved` | `service.issue_resolution_completed` | Renderer listo. Falta resolución efectivamente aplicada y texto del equipo revisado en el idioma del cliente. |
| `recurring_visit` | `recurring.visit_confirmed` | Renderer listo. Falta agenda operativa real de próximas visitas; elegir limpieza periódica no crea por sí solo un calendario confirmado. |
| `recurring_updated` | `recurring.schedule_updated_confirmed` | Renderer listo. Falta una modificación confirmada del calendario/plan con visitas e importes afectados. |
| `magic_link` | `auth.magic_link_requested` | Conectado a recuperación de acceso a una reserva (prueba HMAC real, 15 minutos) y preparado para el acceso opcional Firebase. Firebase permanece desactivado: el job se persiste antes de generar el enlace SDK y se despacha dirigido, con idioma guardado; su TTL de entrega de 15 minutos no se presenta como caducidad del código de Firebase. No se inventan enlaces ni se activa Auth. |
| `support_received` | `support.message_received` | Renderer listo. Contacto conserva su flujo existente EmailJS/Make y escritura de navegador; no existe una captura de caso/outbox servidor para esta colección. No se añade un acuse automático duplicado. |
| `support_reply` | `support.reply_published` | Renderer listo. Falta la operación privada de publicar una respuesta humana en un caso real. |
| `cancellation_received` | `booking.cancellation_requested` | Renderer listo. Falta una solicitud de cancelación persistida y su revisión operativa. |
| `cancellation_confirmed` | `booking.cancelled_confirmed` | Renderer listo. Falta la cancelación efectivamente autorizada; tasas y reembolsos conservan sus hechos separados. |
| `moving_guide` | `moving_guide.requested_ready` | Renderer listo; la guía real y sus preferencias ya existen en la web. No se ha añadido una solicitud separada de envío de guía ni se envía por abrir el widget. No se enlaza un PDF personalizado inexistente. |

## Gates y coordinación con Payrexx

| Configuración | Estado y efecto |
| --- | --- |
| `BOOKING_EMAIL_COLLECTION_ENABLED` | `false` por defecto y sin activación en esta tarea. Selecciona la colección nueva cuando se habilite expresamente; mientras está desactivada se mantiene el envío anterior de solicitudes/presupuestos/recibos ya configurado. |
| `BOOKING_EMAIL_COLLECTION_PAYMENTS_ENABLED` | `false` por defecto. Control adicional de recibos `deposit_received`/`payment_received` de Kraken para coordinar los correos propios de Payrexx. No es un permiso para cobrar. |
| `BOOKING_RECOVERY_REMINDERS_ENABLED` + `RESEND_WEBHOOK_SECRET` + `RESEND_WEBHOOK_SENDER_DOMAIN` | El recordatorio voluntario exige flag, secreto, dominio exacto coherente con el remitente y consentimiento vigente. Continúa desactivado; no se crea un webhook global compartido. El filtro del consumidor es defensa adicional, no aislamiento de los datos que envía Resend. |
| `BOOKING_CUSTOMER_ACCESS_ENABLED` | Permanece desactivado. No se añaden permisos de administración de Firebase Authentication. |

La revisión real de Payrexx encontró habilitados los correos al cliente de pago, pedido y devolución, con plantilla/idioma EN y frontend multilingüe desactivado. No se cambió esa configuración ni se hicieron pagos o envíos para esta revisión. Antes del rollout de recibos Kraken hay que decidir qué proveedor será responsable de cada comunicación y validar idioma y duplicados. El flag de pagos adicional controla los recibos; otros avisos de pago de la colección dependen del gate general y de sus condiciones de estado.

El webhook firmado y la consulta autenticada del Gateway siguen verificando importe, CHF, referencia, modo y reserva. Una redirección del navegador o una animación de éxito no genera un recibo. Un despliegue o replay conserva el mismo job y la misma identidad de notificación. Una devolución parcial no se fuerza a un recibo con cantidades supuestas.

## Migración explícita y conservación de registros antiguos

La incorporación de campos en Firestore es aditiva. No se ha ejecutado ninguna migración sobre producción. La CLI selecciona el proyecto y la **base nombrada** configurados; rechaza `(default)` y exige credenciales de servidor ya autorizadas. No descarga ni imprime claves.

Revisión sin escritura, que es también el comportamiento por defecto:

```sh
node --import tsx scripts/migrate-email-language.ts --dry-run
```

La aplicación requiere una decisión explícita y un operador identificado:

```sh
BOOKING_OPERATOR_ID=operador-autorizado node --import tsx scripts/migrate-email-language.ts --apply
```

Estos comandos se documentan para revisión; **no se han ejecutado contra producción**. La salida contiene contadores y códigos fijos, sin registros de cliente, destinatarios ni tokens. Los límites `--page-size` y `--max-pages` acotan el recorrido.

La migración conserva un idioma histórico válido; si falta, toma una preferencia válida del cliente y, finalmente, alemán con procedencia explícita `legacy-default`. Valores corruptos, inconsistencias entre idioma/snapshot y texto manual sin revisión quedan pendientes, sin sobrescritura silenciosa. Se auditan versión, operador y fecha. Las notificaciones existentes, los jobs enviados, preparados, intentados o inciertos no se sustituyen ni se reencolan. Los IDs, intentos, fechas, estados comerciales y consentimiento se conservan.

El núcleo recovery ofrece además `migrateLegacyLanguage(id)` como operación privada explícita; no se expone como endpoint público ni se llama durante un envío. El adapter D1/SQLite tiene una migración separada en `integrations/recovery/migrations/2026-11-25-email-collection.sql` para añadir `notification_json`, `prepared_json`, `prepared_at` y `prepared_expires_at`. Está preparada, no aplicada; Firestore no ejecuta ese SQL. Instalaciones D1 nuevas usan `schema.sql`; las existentes deben registrar y aplicar la migración una sola vez por su proceso normal.

## Comprobaciones y revisión local

Desde el repositorio real:

```sh
npm test
node --import tsx --test tests/email-collection-render.test.mjs tests/email-collection-booking.test.ts tests/email-language-migration.test.ts tests/recovery-email-collection.test.mjs tests/recovery-firestore-language.test.mjs tests/communication-language.test.ts
npm run build
```

La referencia mantiene sus comandos independientes, sin dependencias externas ni transporte:

```sh
cd reference/kraken-emails
npm test
npm run demo:language -- es
npm run build
```

El build de referencia genera `ABRIR_EMAIL_STUDIO.html` y los 180 ejemplos HTML/texto para revisión. Es una galería local de datos sintéticos; no se incorpora como iframe en la web ni se considera evidencia de entrega.

Los tests de integración cubren selección española frente a navegador alemán, persistencia y recuperación, callbacks sin sesión de navegador, deduplicación duradera, preparación antes del proveedor, envelope idéntico en reintentos, preferencia explícita, consentimiento revocado, migración, idioma ausente/incorrecto, contenido dinámico sin traducción e imágenes/firma/footer de la colección. Utilizan SQLite local, dobles transaccionales y transporte sintético. No sustituyen una prueba coordinada de Payrexx ni la verificación real de entrega de las plantillas nuevas.

Resultados de las comprobaciones finales y despliegue: consultar el informe final de la tarea. Los errores TypeScript históricos de Careers/PaymentCelebration están separados de esta integración y no justifican afirmar que ese chequeo global está limpio.

## Pendiente antes de habilitar nuevas comunicaciones

- Revisar visualmente la galería y aprobar el contenido de la colección.
- Ejecutar y revisar el dry-run de idiomas con el entorno privado autorizado; aplicar solo tras revisar su informe.
- Coordinar recibos/idiomas con Payrexx para evitar notificaciones contradictorias o duplicadas.
- Mantener inactivos los recordatorios hasta disponer de eventos de supresión aislados de Kraken.
- Verificar caducidad real y flujo de Firebase antes de conectar `magic_link` o activar acceso de cliente.
- Crear las operaciones y hechos reales de soporte, incidencias, calendario periódico, cancelación, finalización y liquidación antes de conectar sus plantillas.
- Probar el rollout de forma controlada con transporte/cuenta autorizados. Esta entrega no envía pruebas a clientes reales.
