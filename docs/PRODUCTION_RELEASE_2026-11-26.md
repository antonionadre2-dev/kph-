# Publicación de Kraken PFM — 26/11/2026

El propietario autorizó publicar las tarifas y correcciones preparadas y unificar la estética de Contacto. Esa autorización sustituye la restricción de publicación de las tareas anteriores. Los informes anteriores que decían «sin publicar» describen el estado de aquellas revisiones.

**Código publicado:** `712ed32f5ee6ebf5c927a8e045111e11f87bb8ac`, rama `codex/contact-style-release-2026-11-26`, repositorio `antonionadre2-dev/kph-`. Incluye los cambios de las PR #4 y #5 y la unificación de Contacto. Este documento y su evidencia se añaden después; no cambian el código publicado.

**Despliegue:** `dpl_62bcrbNJ5yWbwCvST2eG23Po4UEZ`. Los dominios `krakenpfm.ch` y `www.krakenpfm.ch` apuntan a él. La publicación anterior era `dpl_HhSgibCcgkX6v3TuqMMYHAHkbidr` (`d299da3`), conservada como referencia de restauración.

## Cambios visibles

- Contacto utiliza la misma cabecera, logo, descriptor traducido, navegación, barra de contacto, contenedor, botones y estilos de tarjetas que las demás páginas. Mantiene contenido, mapa de cobertura, FAQ, seis idiomas y enlaces reales.
- Se publican las tarifas y reglas de fin de alquiler y mudanzas descritas en [PRICING_UPDATE_2026-11-26.md](PRICING_UPDATE_2026-11-26.md), junto con la confirmación y recuperación de solicitudes de la PR #4.
- Se conservan las claves, bases de datos, modo LIVE y anticipo del 15 % existentes. Las reservas previas conservan sus importes y condiciones guardadas.

## Verificación de la publicación

- Compilación local con target **Production**, Express y Node 24; dependencias empaquetadas con `--standalone`. Se verificaron los módulos Admin de Firebase, Firestore, Google Auth, Svix y `@vercel/functions` dentro de la función, sin depender de los módulos del equipo local.
- Artefacto preparado y verificado antes de subirlo: 449 archivos, 193 documentos HTML y 61 dependencias frontend, sin ausencias. No se detectaron valores privados de configuración en los archivos públicos.
- Se subió con `--prebuilt --prod --skip-domain`. Se comprobaron los 449 recursos remotos por contenido antes de promover al dominio. Se reutilizó el acceso de automatización existente para esa comprobación; no se creó ni desactivó una protección.
- Suite final: **544 pruebas, 538 aprobadas, 6 omitidas y 0 fallidas**; TypeScript correcto. Las omitidas pertenecen a la suite existente de reglas cliente de Firestore con emulador.
- Contacto local: 24 combinaciones de seis idiomas y cuatro anchos, desde 320 px. Versión remota previa a promoción: 12 comprobaciones de Contacto y ocho de Servicios, About y calculadores, con teclado, menú, foco, FAQ y mapa correctos.
- Después de promover: 11 páginas públicas, seis idiomas de Contacto, portada y calculadores; sin errores JS, recursos frontend ausentes ni desbordamientos. Los 61 JS/CSS/fuentes del dominio público coinciden con el artefacto. Calculadores: CHF 560 por defecto en fin de alquiler y CHF 250 orientativos por defecto en mudanza.
- Cuatro consultas públicas de Firestore, limitadas y con proyección sin campos de cliente, devolvieron 403. Esto comprueba rechazo de lectura anónima de esas colecciones; no sustituye una auditoría completa de reglas, escrituras o índices. No se aplicaron reglas o índices remotos.
- Las comprobaciones no crearon solicitudes, pagos ni envíos de correo. `paymentReady` y `emailReady` acreditan configuración presente; no acreditan un cobro o una entrega de correo real.

## Configuración pendiente conservada

El formulario automático de Contacto permanece desactivado porque faltan las claves y activación de Turnstile. El aviso es visible y siguen disponibles WhatsApp, teléfono y correo. No se sustituyó la protección por claves de prueba ni se mostró un envío ficticio. Los acuses de Contacto requerirían además su configuración y programador protegido; no se activaron.

La prueba externa de Payrexx TEST y de entrega de correo de la tarea anterior sigue pendiente del acceso legítimo del propietario. Esta publicación no cambia su autenticación ni el modo de pago.

Evidencia: [verificación pública](qa/contact-release-2026-11-26/public-verification.json), [dominios](qa/contact-release-2026-11-26/domain-aliases.json), [navegador remoto](qa/contact-release-2026-11-26/staged-browser.json), [dependencias del servidor](qa/contact-release-2026-11-26/runtime-sdk-verification.json), [captura de escritorio](qa/contact-release-2026-11-26/public-contact-desktop.jpg), [captura móvil](qa/contact-release-2026-11-26/public-contact-mobile.jpg).

Las siguientes publicaciones de este Express/Vite deben repetir la preparación, verificación y despliegue prebuilt para el target correcto; un build de fuentes o un artefacto Preview no sustituye al de Production. Véase el [contrato de recursos](VERCEL_ASSET_CONTRACT.md).
