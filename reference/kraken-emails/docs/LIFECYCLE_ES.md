# Kraken · Ciclo completo de emails al cliente

Edición de diseño y contenido: 25 de noviembre de 2026. Estos archivos preparan el contenido; no activan envíos, no crean reservas ni verifican pagos por sí solos.

## Criterio editorial

La colección contiene 30 tipos de email. Cada mensaje explica un estado concreto, muestra únicamente los datos relevantes y propone una acción principal. Las firmas personales usan **Antonio & Ihr Kraken Team**; los mensajes de pago y acceso usan **Ihr Kraken Team**. La identidad de Antonio como propietario y contacto consta en el contenido actual de la home, sin utilizar su fotografía.

La voz alemana es cercana y respetuosa, con **Sie** y ortografía suiza. Las demás lenguas conservan el significado del estado y el nivel de certeza. La personalización adapta el servicio, el contenido, la cita, el lugar, el importe y el siguiente paso; no se limita a añadir un nombre al saludo.

Los ejemplos de cliente y de reserva que se utilicen para las imágenes de presentación deben ser datos sintéticos y llevar una indicación externa de **vista previa / datos de ejemplo**. Esa indicación no forma parte de los emails reales.

## Los 30 mensajes y sus disparadores

Los identificadores de evento son un contrato de integración propuesto. El backend real debe emitirlos después de comprobar el estado de la operación. No se deben disparar por abrir una página, pulsar un botón ni completar una animación.

| ID | Email | Evento / condición de envío | Datos o bloque que lo hace personal |
| --- | --- | --- | --- |
| `quote_saved` | Tu selección está guardada | Solicitud explícita de guardar por email, borrador persistido y enlace válido | Servicio, ciudad, selección guardada y enlace individual |
| `quote_reminder_1` | Primera continuación | Consentimiento específico a recordatorios, borrador abierto y todavía elegible | Mismas opciones guardadas, ayuda para dudas sin repetir preguntas |
| `quote_reminder_2` | Último recordatorio | Misma elegibilidad; primer recordatorio enviado; última comunicación de esta serie | Estado actualizado del borrador; sin falsa caducidad |
| `request_received` | Solicitud recibida | Solicitud almacenada correctamente en el servidor | Servicio, referencia, fecha solicitada claramente pendiente, alcance |
| `details_required` | Falta un dato | El equipo solicita información concreta | Lista exacta de preguntas pendientes; subida de fotos sólo cuando corresponde |
| `quote_ready` | Presupuesto personalizado | Presupuesto emitido, con versión y alcance fijados | Desglose aprobado, condiciones y total; caducidad sólo si existe |
| `booking_confirmed` | Cita confirmada | Equipo / sistema autoriza y confirma disponibilidad | Fecha, hora, dirección, acceso, servicio y preparación |
| `reschedule_proposed` | Propuesta de otra cita | Nueva propuesta registrada, sin sustituir aún la cita confirmada | Fecha propuesta y estado de la cita vigente, opciones de respuesta |
| `booking_updated` | Cambio confirmado | Cambio acordado persistido | Qué cambió, fecha vigente, alcance y efecto económico exacto |
| `appointment_reminder` | Recordatorio del servicio | Próxima cita confirmada y no cancelada | Preparación según servicio, dirección, acceso y contacto |
| `team_on_the_way` | Equipo en camino | Salida realmente confirmada para este encargo | Servicio y lugar; ETA sólo si existe una fuente real vigente |
| `payment_requested` | Enlace de pago | Solicitud de pago válida creada desde un importe calculado en servidor | Tipo de cobro, importe exigido, referencia y proveedor |
| `deposit_received` | Anticipo recibido | Proveedor confirma la transacción y queda saldo por pagar | Anticipo de esta operación, pagos acumulados, total y saldo |
| `payment_received` | Pago completado | Pago verificado y saldo actual igual a cero | Importe de la última transacción, total y recibo |
| `payment_pending` | Pago pendiente | Estado pendiente verificado; evitar avisos por esperas técnicas de pocos segundos | Operación afectada, estado y un único acceso a consultar |
| `payment_failed` | Pago no completado | Fallo final confirmado por el proveedor | Operación y siguiente paso; no asegurar que nunca hubo retención bancaria |
| `balance_due` | Saldo pendiente | Liquidación / factura emitida y saldo realmente positivo | Total aprobado, pagos recibidos, saldo y vencimiento real si existe |
| `refund_issued` | Reembolso ordenado | Proveedor acepta la devolución; no basta una petición interna | Importe devuelto en esta operación y recibo; no afirmar abono bancario inmediato |
| `service_completed` | Trabajo terminado | Equipo marca finalización verificada | Servicio ejecutado, resumen y estado financiero; no presume satisfacción |
| `review_requested` | Opinión honesta | Servicio completado y permiso / base aplicable configurados para este contacto | Servicio y ocasión concretos; opinión libre, sin premio condicionado |
| `issue_received` | Incidencia recibida | Incidencia persistida y vinculada a la reserva | Problema registrado y siguiente paso; sin volver a pedir lo ya enviado |
| `issue_resolved` | Solución aplicada | Actuación acordada registrada como realizada | Solución concreta, fecha y cuestiones que siguen abiertas |
| `recurring_visit` | Próxima visita periódica | Próxima visita confirmada del calendario real | Fecha concreta, frecuencia y tareas acordadas para esa visita |
| `recurring_updated` | Plan periódico actualizado | Cambio de calendario confirmado | Visitas afectadas, nuevas fechas, pausas y cambios de precio si existen |
| `magic_link` | Acceso personal | El propio usuario solicita el enlace; proveedor de autenticación lo crea | Enlace individual de acceso con caducidad configurada; sin contraseña en el email |
| `support_received` | Mensaje recibido | Consulta de contacto almacenada | Motivo / referencia; horario real de atención |
| `support_reply` | Respuesta de Kraken | Una persona publica una respuesta dirigida al cliente | Respuesta real o acceso seguro a la conversación; nunca una respuesta inventada |
| `cancellation_received` | Solicitud de cancelación | Petición recibida y aún pendiente de revisión | Reserva afectada y estado pendiente |
| `cancellation_confirmed` | Cancelación confirmada | Reserva efectivamente cancelada | Fecha cancelada, tasas acordadas y resultado financiero; devolución aparte |
| `moving_guide` | Guía personalizada de mudanza | Cliente pide la guía y se genera con sus datos | Origen, destino, cambio de cantón, vehículo, fecha y tareas aplicables |

## Personalización por servicio

| Servicio | Información que se muestra | Preparación útil |
| --- | --- | --- |
| Limpieza de ventanas | Tipos y número de ventanas, persianas seleccionadas y acceso especial | Despejar acceso y alféizares; informar de ventanas inaccesibles |
| Limpieza de fin de contrato | Habitaciones, m², extras, fecha de limpieza y datos de entrega proporcionados | Acordar acceso y llaves; confirmar el estado del piso; coordinar la entrega |
| Limpieza periódica | Frecuencia, horas acordadas, productos incluidos o no, prioridades | Indicar habitaciones prioritarias, acceso y dónde están los productos si los aporta el cliente |
| Limpieza profunda | Alcance concreto, tiempo o presupuesto aprobado y extras | Indicar zonas que necesitan especial atención y objetos delicados |
| Pequeña mudanza | Origen, destino, pisos, ascensor, inventario y acceso | Etiquetar cajas, revisar aparcamiento y comunicar piezas o accesos especiales |
| Limpieza de obra, si se mantiene activada | Tipo de obra, superficie, restos especiales y condiciones | Confirmar fin de trabajos, agua, electricidad y accesos disponibles |

No se añade una garantía de entrega a una limpieza por horas que no la incluya. No se afirma que toda mudanza cabe en una Ford Transit ni que la entrega está garantizada sin revisar el inventario. El documento personalizado de mudanza no interpreta los datos que el cliente todavía no ha proporcionado: pide completar origen/destino y enlaza fuentes oficiales aplicables.

## Estados que deben seguir separados

**Solicitud recibida ≠ presupuesto aceptado ≠ cita confirmada ≠ pago confirmado ≠ servicio terminado.**

Una confirmación de pago puede incluir una fecha si ya existe una cita confirmada. Si no existe, el bloque de fecha debe decir claramente «pendiente de confirmación» y no mostrar una fecha solicitada como reservada. Del mismo modo, una cancelación no equivale a una devolución bancaria y un trabajo terminado no equivale a un cliente satisfecho.

Cuando el precio requiere revisión manual, el total final sigue vacío hasta la emisión de una oferta aprobada. No se muestra CHF 0.00 como si fuese el precio del servicio. El importe cero de IVA, por el contrario, puede mostrarse cuando corresponde al estado fiscal configurado de Kraken.

## Nombre, idioma y datos de cliente

- `firstName` procede del dato facilitado por el cliente. Si falta, el saludo debe usar una fórmula neutra localizada; no dejar `{{firstName}}` visible ni inferir el nombre desde la dirección de email.
- El idioma se guarda con la solicitud / cliente a partir del elegido en el sitio. La actualización del idioma para comunicaciones futuras es explícita y no altera los importes ni el contenido de una factura ya emitida.
- Fechas y horas se formatean en **Europe/Zurich**. Nunca se calculan como «mañana» si el evento puede enviarse tarde; la fecha exacta evita ambigüedad.
- Las cantidades se formatean desde unidades enteras de céntimos de CHF. Los importes provienen del registro autorizado del servidor, no de parámetros editables por el navegador.
- El asunto no contiene dirección completa, códigos de acceso, notas sensibles ni datos de pago. La información de acceso al inmueble debe limitarse al portal seguro.
- No se muestran líneas vacías. Los campos desconocidos se omiten o se marcan con un estado comprensible cuando afecten al siguiente paso.

Tokens usados por el catálogo: `firstName`, `serviceName`, `city`, `appointmentDate`, `appointmentTime`, `bookingReference`, `amountFormatted` y `balanceFormatted`. El motor puede añadir bloques estructurados para total, pagos acumulados, líneas de servicio y dirección sin interpolar HTML arbitrario.

## Branding, firma y footer

Encabezado con el logo original de Kraken y el descriptor **Properties & Facilities Management**. Azul marino, azul claro, fondo blanco y acentos menta. Kai ayuda a reconocer el servicio y aporta cercanía; no sustituye la información ni aparece como supuesto trabajador humano.

Firma de relación / servicio:

> Herzliche Grüsse  
> **Antonio & Ihr Kraken Team**  
> Persönlich für Sie da.

Firma de pagos / acceso:

> Freundliche Grüsse  
> **Ihr Kraken Team**

Datos del footer tomados del sitio actual:

- Kraken Properties & Facilities Management.
- Seewadelstrasse 3, 8203 Schaffhausen, Schweiz.
- +41 77 450 57 05 · `tel:+41774505705`.
- `kai@krakenpfm.ch` · `mailto:kai@krakenpfm.ch`.
- `https://krakenpfm.ch`.
- Atención de lunes a domingo, 09:00–19:00, hora de Zúrich. Visitas a la oficina con cita previa.

Instagram permanece sin URL porque el proyecto actual la tiene sin confirmar. Añadir el icono sólo cuando se configure el perfil real. El crédito **Website made by seociety.ch** pertenece al footer de la web; no es necesario repetirlo en cada correo de servicio. Si Antonio desea acreditar el diseño del email, usar una línea discreta sólo con su aprobación editorial.

La dirección de respuesta debe ser una bandeja realmente atendida. El enlace «contactar» debe funcionar sin necesitar iniciar sesión. El footer indica brevemente por qué se recibe cada mensaje; recordatorios comerciales / de recuperación incluyen gestión de preferencias y baja, sin ofrecer cancelar comunicaciones operativas indispensables para una reserva activa.

## IVA e importes

Redacción base en alemán: **«Kraken ist nicht mehrwertsteuerpflichtig. Es wird keine MwSt. in Rechnung gestellt.»**

En facturas o resúmenes: **MwSt.: CHF 0.00** acompañado del estado fiscal. No se etiqueta como «tipo legal de IVA del 0 %» ni como descuento aplicado dos veces.

Si se usa una comparación de IVA en el presupuesto, debe decir que es hipotética **al mismo precio neto**. `total × 0,081` es el importe de IVA de ese ejemplo, no prueba que Kraken siempre sea un 8,1 % más barato que otra empresa. La comparación no necesita aparecer en emails de soporte, incidencias, acceso, cancelación o reembolso.

## Recuperación de borradores y frecuencia

La confirmación «guardar mi progreso» responde a una petición explícita. El permiso para recordatorios se recoge por separado, sin casilla marcada. No debe obligarse al cliente a crear una cuenta para obtener un presupuesto o contratar.

Una secuencia inicial razonable para probar, coherente con el trabajo anterior, es el primer recordatorio aproximadamente a las 4 horas y el segundo a las 24 horas, ajustando a horario de 09:00–19:00 en Zúrich. Es una propuesta a medir, no una afirmación de que esos tiempos maximizan ventas.

Revalidar antes de cada envío: consentimiento, baja, borrador activo, ausencia de reserva / pago posterior, ausencia de duplicado y vigencia del enlace. Detener la serie al reservar, retirar permiso, caducar el borrador, contestar solicitando que no se contacte o eliminar los datos. Si el proveedor devuelve un resultado incierto, verificar el estado antes de reintentar.

No usar contadores, plazas restantes o reservas ficticias. No reutilizar este permiso para newsletters de promociones. El recordatorio final sólo puede decir que es el último si el sistema realmente termina esa serie.

## Reseñas y atención al cliente

Pedir una experiencia honesta a los clientes elegibles, sin filtrar sólo a quienes dieron una puntuación alta. No condicionar incentivos a una valoración positiva y no crear reseñas ficticias. Si hay una incidencia abierta, priorizar la conversación de solución; cualquier política de aplazamiento debe aplicarse de forma coherente, sin excluir definitivamente opiniones negativas.

Los emails de incidencia no prometen automáticamente dinero, una segunda limpieza, una garantía nueva ni un plazo de respuesta que no se pueda cumplir. La solución y su fecha se insertan desde el caso real. La firma mantiene el tono personal y el contacto directo.

## Requisitos mínimos de integración

1. Evento verificado, estado autorizado y clave idempotente por destinatario / evento / versión.
2. Plantilla e idioma elegidos de forma determinista desde los datos guardados.
3. Asunto y texto alternativo sin tokens sin resolver. Escape de HTML en todos los datos de cliente.
4. URL del CTA validada y en HTTPS; acceso individual seguro para datos privados. Ninguna URL inventada o vacía.
5. Versión de texto plano coherente, imágenes con texto alternativo y contenido esencial legible con imágenes bloqueadas.
6. Dejar separado el contenido de la automatización de envíos y del proveedor. Estos diseños no son prueba de autenticación, pago, envío o reserva.
7. Para pruebas de envío, usar destinatarios de prueba explícitamente autorizados. No enviar esta colección a clientes reales durante la revisión visual.

## Fuentes de negocio consultadas

La información de empresa, firma, horarios y cinco servicios principales se contrastó con los archivos reales del proyecto: `web/index.html`, `web/kontakt.html`, `web/contact-page.js`, `web/site-config.js`, `web/brand.css` y `calculator-preview/src/booking/pricing.ts`. El catálogo no modifica las tarifas.
