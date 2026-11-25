# Revisión realizada — 25 de noviembre de 2026

## Entrega

30 plantillas × 6 idiomas = 180 ejemplos HTML y 180 versiones de texto. La galería autónoma permite elegir mensaje, servicio, idioma, ciudad y nombre, con vista estrecha, de escritorio y texto. El contenido utiliza datos ficticios; ningún email se ha enviado.

Se incluyen 35 imágenes individuales: los 30 diseños en alemán, tres ejemplos en español y dos versiones estrechas. Además hay seis láminas de emails, dos láminas de la nueva colección de ilustraciones y un catálogo PDF de 30 páginas con marcadores por email.

## Contenido y código

Se ejecutaron `npm run build` y `npm test`. Pasaron las 42 pruebas incluidas. La nueva comprobación verifica que cada plantilla utiliza su propio archivo de imagen y que los 30 archivos tienen contenido distinto, no copias renombradas. Cubren los 180 ejemplos y las 180 combinaciones con datos sintéticos preparados para el modo de producción, variables resueltas, escape de contenido, URLs, estados, consentimiento, importes en céntimos, pagos parciales/finales y horario de Zúrich.

El JavaScript de la galería se analizó con el compilador de Node sin errores de sintaxis. El renderizador no depende de paquetes npm externos.

Las pruebas con datos sintéticos no son transacciones reales ni validaciones de Payrexx. Los indicadores de evento no sustituyen la verificación del proveedor en el servidor.

## Revisión visual

Las imágenes se generaron directamente a partir del HTML mediante **WeasyPrint 70 y Poppler**, con reglas de maquetación que reproducen los anchos de escritorio de 720 px y estrecho de 390 px. No son capturas de Gmail, Outlook ni Apple Mail.

Se revisaron visualmente los diseños de reserva, selección guardada, recibo y guía de mudanza, y una versión estrecha. La revisión cubrió legibilidad, recortes, alineación, importes, CTA y footer. El PDF contiene 30 páginas completas, una por plantilla alemana.

El navegador disponible para la revisión no permitió abrir archivos locales; tampoco había un navegador autónomo utilizable en el entorno. Por ello no se afirma haber ejecutado una prueba de interacción del archivo HTML en navegador, ni pruebas de compatibilidad en clientes de correo. La galería y sus controles están entregados en código para revisión local.

## Antes de activar mensajes

Conectar el proveedor real de envío, la base de reservas, las URLs personales y los eventos verificados de pago. Configurar la URL real de privacidad y, si se quiere mostrarlo, el perfil verificado de Instagram. Confirmar SPF, DKIM, DMARC y una dirección de respuesta atendida. Revisar envíos de prueba autorizados en los clientes de correo utilizados.

Las 30 ilustraciones se generaron por separado con la herramienta integrada de imágenes, utilizando Kai y el logo como referencias de identidad. Son escenas de marca, no fotografías de trabajos reales. Las fotos anteriores de servicios se conservan como referencias en el paquete, pero ya no se utilizan dentro de los emails. Los PNG nuevos conservan transparencia y se muestran también en el diseño móvil.

## Integración del idioma — versión 1.2

Se incorporaron `src/language.mjs`, `src/server-email.mjs` y un ejemplo ejecutable. Se validan el idioma del selector, su snapshot persistible, la lectura en tareas posteriores, los seis catálogos, la ausencia de fallback silencioso en producción y las traducciones de contenido dinámico. Las pruebas del adaptador verifican que el idioma guardado prevalece sobre valores posteriores del navegador, que los identificadores y el destinatario no se mezclan y que los enlaces firmados no se reescriben.

`npm run demo:language -- es` produjo un email español con un valor posterior alemán simulado. El resultado fue `emailsSent:0`. No es una prueba de entrega real ni de persistencia en una base de datos: esas operaciones deben conectarse en el repositorio real.

Los 180 HTML de muestra siguen siendo idénticos a los de la versión visual anterior; las imágenes y el PDF existentes siguen representando esos diseños. La nueva versión cambia la selección, validación y preparación del contenido, no su composición gráfica.

## Datos nuevos admitidos en los recibos

`paymentDetails` permite pasar `receiptNumber`, `reference`, `processedAt` (fecha ISO) y `method`. Cuando se proporcionan, aparecen en el recibo. Deben proceder de datos reales del servidor. La colección destaca el importe de **esta transacción** y muestra por separado total contratado, IVA no facturado, acumulado pagado y saldo.
