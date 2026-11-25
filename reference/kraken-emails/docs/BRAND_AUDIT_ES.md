# Auditoría de marca y referencias técnicas — emails Kraken

Fecha: 25 de noviembre de 2026. Auditoría de lectura; no se ha modificado el sitio ni enviado ningún correo.

## Fuente local disponible

`/workspace/scratch/30982c904823/kraken-conversion-preview/.sites-checkout` está limpio en el commit `f8b1ebe3269031718122bee524f48c4c7274771c`. Este checkout es anterior al commit de la entrega completa descrito en la conversación. No contiene `integrations/` ni los nuevos componentes de journey/recovery; las decisiones recientes del usuario prevalecen. Los recursos visuales, la página de contacto, las páginas de servicios y el calculador sí están disponibles.

## Identidad visual que conservar

| Elemento | Fuente/valor | Aplicación en email |
|---|---|---|
| Azul Kraken | `#002d5b` | Titulares, CTA principal, texto de marca |
| Texto | `#143a56` | Cuerpo de texto |
| Texto secundario | `#5d7385` | Metadatos y footer |
| Menta | `#b7f2d6` | Estado confirmado y pequeños detalles |
| Superficie azul clara | `#f4f9fd` | Fondo exterior y bloque de detalles |
| Línea | `#dce7ef` | Separadores y tarjetas |
| Tipografía del sitio | Manrope / Inter / sistema | Email: Arial/Helvetica/sistema como base robusta |
| Nombre completo | Kraken Properties & Facilities Management | Bajo el logo y en footer |

La web usa bordes redondeados, mucho blanco, navy sobrio y tarjetas de información. La mascota aporta cercanía; la información del cliente debe seguir siendo el protagonista.

## Recursos originales recomendados

Todos los paths siguientes son relativos a la raíz del checkout anterior.

| Recurso | Archivo | Datos | Uso recomendado |
|---|---|---|---|
| Logo original | `web/assets/logo.webp` | 1024 × 1024, RGBA | Header sobre blanco; exportar una versión PNG de ancho útil recortando únicamente el padding transparente, sin redibujar el símbolo |
| Kai atención al cliente | `web/assets/kai-help.webp` | 1359 × 1158, RGBA | Firma/ayuda, 56–72 px; cabecera de bienvenida si procede |
| Escena de mudanza | `web/assets/kai-help-moving.webp` | 1672 × 941, RGB | Guía de mudanza y preparación; un solo bloque visual |
| Servicio realista | `web/assets/service-end-v5.webp` | 1254 × 1254, RGB | Fin de contrato: manos limpiando horno, cocina y llaves, sin cara del fundador |

Alternativas para personalizar por servicio:

- `web/assets/service-windows-v5.webp`
- `web/assets/service-regular-v5.webp`
- `web/assets/service-deep-v5.webp`
- `web/assets/service-moving-v6.webp`
- `web/assets/kai-help-windows.webp`
- `web/assets/kai-help-end.webp`
- `web/assets/kai-help-regular.webp`
- `web/assets/kai-help-deep.webp`

`web/assets/transit-loading-v4.webp` es una hoja cuadrada con cuatro estados de carga, no una única imagen de la furgoneta. Mostrar la hoja entera en un email sería poco claro; utilizar solo si se prepara una imagen individual fiel o un GIF con primera imagen informativa. No necesita animación para los recibos.

La web muestra el logo original dentro de una caja 150 × 66 con una imagen de 150 × 150 desplazada `top:-41px` (`web/brand.css`). Esto explica por qué usar el original cuadrado sin ajustar su padding daría un logo visualmente diminuto.

## Firma, contacto y footer

Datos presentes en `web/kontakt.html`, `web/contact-page.js`, los footers y `calculator-preview/entry.tsx`:

- Firma automática recomendada: **Ihr Kraken Team** / **Tu equipo de Kraken**. Utilizar la firma personal de Antonio únicamente cuando realmente sea un correo suyo o un mensaje preparado para él.
- Empresa: Kraken Properties & Facilities Management.
- Dirección: Seewadelstrasse 3, 8203 Schaffhausen, Schweiz.
- Teléfono: +41 77 450 57 05 (`tel:+41774505705`).
- Email: kai@krakenpfm.ch (`mailto:kai@krakenpfm.ch`).
- Web: https://krakenpfm.ch.
- Atención: lunes a domingo, 09:00–19:00, zona `Europe/Zurich`; visitas con cita.
- Zonas: Zürich, Schaffhausen y Winterthur.
- LinkedIn presente en la web: https://www.linkedin.com/company/krakenpfm/ . Es un dato del sitio existente, no una nueva verificación externa del perfil.
- WhatsApp presente en la web: https://wa.me/41774505705.
- **Instagram sigue sin URL confirmada** (`instagramUrl: null` en `web/site-config.js`). No crear una cuenta ni inventar el enlace; ocultar ese enlace en el email enviado hasta configurarlo.
- El crédito “Website made by seociety.ch” pertenece al footer web; no aporta información al destinatario de un recibo y no se necesita en el footer de email.

No incluir estrellas, reseñas, cifras de clientes, insignias de “verificado” ni plazos de respuesta no confirmados.

## Idiomas y personalización

La web admite `de`, `en`, `es`, `fr`, `it`, `pt`. El idioma del email procede de la selección guardada con la solicitud; no inferirlo del nombre ni de la nacionalidad. Para alemán usar convenciones suizas (`ss`, CHF, Europe/Zurich) y trato de `Sie`. Los modelos de la web usan español/italiano cercanos, francés `vous`, portugués formal coherente y británico/internacional en inglés.

Personalizar con datos existentes y pertinentes: nombre, servicio, localidad, referencia, cita y estado de confirmación, desglose e importe pagado/saldo, condiciones acordadas y pasos siguientes. No rellenar campos ausentes con hechos inventados. Una solicitud no equivale a reserva; un pago no confirma por sí mismo la fecha. Los datos de demostración deben quedar identificados como tales en la galería.

## Recomendación de composición

Ancho máximo 600–640 px. Logo original, pequeño descriptor y preheader. Titular editorial breve, saludo personalizado y una acción principal. Detalles relevantes en una tarjeta. Una imagen de servicio o Kai como apoyo, sin texto esencial incrustado en ella. Firma compacta y footer informativo. En recibos, menos imagen y más claridad financiera. En incidencias, priorizar el mensaje y contacto, sin elementos festivos.

Base técnica recomendada: HTML de tablas de presentación, estilos esenciales inline, versión de texto, imágenes públicas HTTPS o adjuntas `cid:` cuando el proveedor lo soporte; PNG/JPEG para las imágenes enviadas; texto real y alt, dimensiones explícitas y una alternativa clara si se bloquean imágenes. La galería navegador puede ser más sofisticada, pero los emails exportados deben seguir siendo simples.

## Referencias primarias consultadas

### Gmail: HTML y CSS

https://developers.google.com/workspace/gmail/design/css

Gmail permite estilos inline y parte de CSS, pero elimina reglas no compatibles. Documenta que se deben usar tablas para varias columnas; elimina `flex`, `grid`, variables CSS y varias propiedades de posicionamiento. También elimina hojas externas e importación de fuentes. Las cuentas no Google en la app móvil de Gmail pueden perder los bloques `<style>` y las media queries. Por ello las propiedades esenciales deben ser inline y el layout no depender de JavaScript ni de una webfont. Es una recomendación técnica para este kit, no una certificación de pruebas en Gmail.

### Google: remitente y entregabilidad

https://support.google.com/mail/answer/81126?hl=en

Recomienda SPF, DKIM y DMARC; exige SPF o DKIM para todos los remitentes a cuentas personales Gmail y los tres para envíos masivos sujetos al umbral descrito. La identidad del remitente y el asunto deben representar el contenido correctamente. No emplear `Re:` falso ni emojis que simulen verificaciones. Mantener un remitente coherente y un Reply-To atendido. No se ha verificado el DNS ni la configuración de Kraken.

### Google: distinguir transacciones de marketing

https://support.google.com/a/answer/14229414?hl=en

Google distingue los emails transaccionales (por ejemplo, confirmaciones de reserva, formulario o recuperación de contraseña) de marketing/promociones para el requisito de baja en un clic. Para recordatorios comerciales, reactivación y campañas de Kraken, incluir baja visible y los headers correspondientes cuando se envíen; no convertir un recibo operativo en una campaña. La confirmación solicitada al guardar un presupuesto y los recordatorios comerciales posteriores se deben gobernar por preferencias separadas.

### Microsoft: limitaciones de edición HTML en Outlook

https://learn.microsoft.com/en-us/troubleshoot/outlook/user-interface/formatting-lost-when-editing-the-htmlbody-property

Microsoft explica que el motor Word puede alterar estilos CSS al validar el HTML en los escenarios de Outlook documentados. Esta fuente no prueba cómo funciona toda variante de Outlook ni certifica nuestros diseños. Probar mensajes reales en Gmail, Apple Mail y Outlook antes del lanzamiento; las capturas del navegador sirven para revisión visual, no sustituyen las pruebas de bandeja de entrada.
