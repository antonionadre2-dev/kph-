KRAKEN — CÓDIGO PARA EMAILS EN EL IDIOMA SELECCIONADO
Versión 1.2.0 · 25 de noviembre de 2026

Este paquete de implementación contiene los fuentes y recursos necesarios para
integrar los 30 emails de Kraken en el repositorio real de krakenpfm.ch.

INCLUYE
- 30 tipos de email en seis idiomas: de, en, es, fr, it y pt.
- 30 imágenes PNG diferentes y el logo original.
- src/language.mjs: valida el idioma y crea el snapshot que debe persistirse.
- src/server-email.mjs: prepara el email desde la notificación guardada.
- src/render.mjs: genera HTML, texto, asunto y cabeceras en producción.
- Catálogos, firma, footer, contenido adaptado al servicio y pruebas.
- examples/selected-language.mjs: demostración sintética sin envíos.
- docs/INTEGRACION_CODEX_ES.txt: prompt completo para Codex.

USO CON CODEX
1. Descomprime el paquete en una carpeta de referencia del repositorio Kraken,
   por ejemplo reference/kraken-emails/. Conserva el proyecto existente.
2. Entrega a Codex el texto de docs/INTEGRACION_CODEX_ES.txt.
3. Pide integrar el selector existente, persistencia, eventos verificados,
   cola/outbox y proveedor real de correo. El paquete no contiene credenciales.

COMPROBACIÓN LOCAL (NODE.JS 20 O SUPERIOR)
npm test
npm run demo:language -- es
npm run build

No se necesitan dependencias npm externas para esos comandos. La galería
ABRIR_EMAIL_STUDIO.html y los 180 ejemplos HTML/texto se generan con build.
El paquete de implementación no duplica los PDF ni las imágenes de presentación
del paquete completo de diseño; así la descarga es mucho más ligera.

REGLA PRINCIPAL
Selección web → solicitud/reserva guardada → notificación guardada → email.
Un webhook, el navegador de otro dispositivo o el panel del equipo no deben
sobrescribir ese idioma. Una modificación de preferencia debe ser explícita.

LÍMITES DEL CÓDIGO INCLUIDO
El renderer y prepareServerEmail() no envían por sí solos, no persisten datos
y no verifican Payrexx. Codex debe conectar esas operaciones con los servicios
reales del repositorio. No declare envío o entrega verificados con la demo.

DATOS DINÁMICOS
Use mapas por idioma para frequency, extras, serviceScope y textos del equipo,
o declare localizedContentLanguage/staffContentLanguage si ya están redactados
en el idioma del cliente. El motor no traduce automáticamente textos libres.

Los datos de demo son ficticios. No use demoData() para mensajes reales.
