# Kraken PFM · Rendimiento y microanimaciones

Informe técnico · 26 de noviembre de 2026. Publicado en [krakenpfm.ch](https://krakenpfm.ch/) con el commit `563f40e` y despliegue `dpl_89cZNZsQ91fyUKPTRf5buwSk4jGX`. Las tres mediciones móviles posteriores cumplen LCP < 2,5 s y todas las mediciones posteriores tienen CLS 0. El TBT móvil aumenta; se detalla a continuación.

## Medición y diagnóstico

| Entorno | LCP antes → después | TBT antes → después | CLS antes → después |
| --- | ---: | ---: | ---: |
| Móvil, 375 × 812; medianas de tres ejecuciones | 1,431426 → 1,3735655 s | 172 → 272 ms | 0,0005627449404256353 → 0 |
| Escritorio, 1280 × 900; una ejecución | 0,3350495 → 0,434253 s | 0 → 1 ms | 0,0000115845998 → 0 |

Lighthouse 13.6.0, perfiles nuevos, DPR 1 y limitación simulada; ejecuciones móviles secuenciales. El LCP móvil mediano baja aproximadamente un **4 %**. Las tres lecturas posteriores fueron 1,3735655 / 2,1175435 / 1,370492 s. En escritorio aumenta unos **99 ms**. El FCP móvil queda prácticamente igual: 1,069114 → 1,0675435 s.

El **TBT móvil aumenta 100 ms** en la mediana. Antes osciló entre 144–404 ms y después entre 270–287 ms; las trazas siguen mostrando tareas largas del documento, el arranque de Home y React. No se acredita una mejora del TBT ni puede atribuirse causalidad precisa sólo con estas muestras. [Comparación de Lighthouse](qa/performance-2026-11-26/lighthouse-comparison.json).

La línea base ya estaba por debajo del objetivo de LCP de 2,5 s en estas condiciones de laboratorio. No reprodujo los aproximadamente 5 s indicados en la revisión manual: un dispositivo, conexión, momento de acceso o estado de caché distinto puede producir otra experiencia. Estos datos no equivalen a métricas de visitantes reales: la reducción observada del LCP móvil no garantiza el mismo resultado en cada visita.

El elemento LCP detectado fue la imagen de la casa (`#sceneRoom`). El diagnóstico de la carga móvil mostró unos **941 ms de retraso de descubrimiento/carga del recurso**. También había un pequeño desplazamiento asociado a los controles del reloj al actualizarse. Las correcciones se centran en esas causas y en evitar trabajo visual durante la primera pintura. Evidencia de partida: [before-summary.json](qa/performance-2026-11-26/before-summary.json) y los informes originales de `lighthouse/`.

## Cambios implementados

- **Casa y primera carga:** el servidor elige la escena de día/noche con el calendario de Zúrich antes de enviar el HTML y hace coincidir el preload de escritorio. La imagen de escritorio mantiene carga prioritaria; en móvil, la casa queda bajo el texto con carga diferida y prioridad baja, ajustada al ancho disponible, sin el lienzo sobredimensionado anterior. Las variantes inactivas no descargan la imagen de la otra vista. Se reserva la proporción 3:2. El clima y las partículas arrancan después de decodificar/pintar la imagen base, que se pinta con opacidad completa y sin fundido inicial. Los controles del reloj tienen anchura reservada y números tabulares.
- **B1, precio:** resalte suave del fondo durante 300 ms al cambiar realmente el importe, en el total principal y en el fijo móvil. Se mantienen las regiones `aria-live="polite"` sin remontar su contenido. Cambiar el idioma o cargar el importe inicial no dispara el resalte.
- **B2–B3, envío y botones:** se reutilizan el estado de carga y el spinner existentes, con bloqueo inmediato frente al doble clic, botón desactivado y `aria-busy`. «Ort prüfen» muestra el mismo patrón durante la consulta. Los errores permanecen junto al campo, sin sacudidas. La confirmación existente incorpora una marca dibujada con barras CSS durante 400 ms. Pulsación a escala 0,98 durante 100 ms y cambios de color al pasar el cursor durante 150 ms.
- **B4–B6, Kai, pasos y desplegables:** Kai muestra el indicador sólo si la respuesta sigue pendiente tras 400 ms; no anima de nuevo el historial. Los pasos entran con opacidad durante 200 ms manteniendo el foco en su encabezado. Los desplegables conservan HTML nativo, teclado y limpieza de eventos; el efecto dura 200 ms. Todas las nuevas animaciones usan CSS y el React existente, sin librerías nuevas ni Web Animations API.
- **B7, servicios:** vista pausada inicialmente, controles anterior/siguiente y reproducción explícita. Las tarjetas mantienen sus anchuras al cambiar la selección; las etiquetas manuales corresponden al servicio mostrado. El movimiento reducido mantiene la selección manual y desactiva la reproducción automática.
- **Comparación antes/después opcional:** preparada con control accesible y seis idiomas. `beforeAfterCases` está vacío deliberadamente: no se muestra la sección, no hay imágenes de ejemplo ni descargas adicionales. Sólo debe llenarse con fotografías reales y autorizadas de trabajos de Kraken.

## Comprobaciones realizadas

- `npm test`: **650 pruebas, 644 aprobadas, 0 fallos y 6 omitidas** porque requieren los emuladores de Firestore. [tests-full.log](qa/performance-2026-11-26/tests-full.log)
- `npm run lint` y build de producción `npm run build:vercel`: correctos. [types.log](qa/performance-2026-11-26/types.log), [build-production.log](qa/performance-2026-11-26/build-production.log)
- Artefacto publicado: **449 archivos estáticos verificados por SHA-256**, sin ausentes; dependencias de servidor comprobadas, incluidos Firebase, Firestore, Google Auth, Svix, Vercel y GenAI. El despliegue previo sirvió los 449 archivos y la comprobación pública confirmó 11 páginas y 61 recursos del frontend; los dos alias del dominio apuntan a la publicación verificada. [prebuilt-verified.json](qa/performance-2026-11-26/prebuilt-verified.json), [runtime-sdk-verification.json](qa/performance-2026-11-26/runtime-sdk-verification.json), [staged-http.json](qa/performance-2026-11-26/staged-http.json), [public-http.json](qa/performance-2026-11-26/public-http.json)
- Comparación HTTP de **30 páginas en seis idiomas**: títulos, descripciones, H1, canonical y logo sin cambios respecto a la referencia. [comparison.json](qa/performance-2026-11-26/comparison.json)
- Movimiento reducido probado a **375 y 1280 px**: sin animaciones del total ni de los pasos; transiciones de botones a 0 s; Kai sin animaciones ni desplazamiento suave; reproducción de servicios desactivada. La apertura/cierre de desplegables siguió funcionando. El ancho de documento coincidió con la vista, sin desbordamiento horizontal en las capturas comprobadas. [reduced-motion.json](qa/performance-2026-11-26/reduced-motion.json)
- Se comprobaron carga, error de campo, recuperación y confirmación con una API **local y temporal**, datos `synthetic.invalid` y 700 ms de espera controlada en el envío; la respuesta local de Kai se demoró 800 ms para mostrar su indicador. Dos intentos produjeron un recibo sólo en memoria. **0 reservas reales, 0 pagos y 0 correos enviados.** Estas grabaciones demuestran la interfaz; no certifican un cobro Payrexx. [local-fixture-stats.json](qa/performance-2026-11-26/local-fixture-stats.json), [submission-error.json](qa/performance-2026-11-26/submission-error.json), [submission-success.json](qa/performance-2026-11-26/submission-success.json)

## Grabaciones descargables

Ocho GIF obtenidos de capturas reales de la interfaz; B2–B3 usan la prueba local descrita. La conversión conserva dimensiones y tiempos de las capturas, sin imágenes ni cuadros inventados. El formato GIF reduce la paleta de color.

- `B1-precio-escritorio.gif`
- `B1-precio-movil.gif`
- `B2-envio-confirmacion.gif`
- `B3-boton-y-localidad.gif`
- `B4-kai-movil.gif`
- `B5-pasos-movil.gif`
- `B6-desplegable-movil.gif`
- `B7-carrusel-manual.gif`

## Inventario exacto de archivos

39 archivos de código y pruebas respecto a `07aca69`. El cambio principal está en `9d99460`; los ajustes posteriores hasta `563f40e` afectan a `components/home/service-idle.js`, `components/public-interactions.css`, `tests/home-service-idle.test.mjs`. Rutas relativas al [repositorio](https://github.com/antonionadre2-dev/kph-/tree/codex/performance-microanimations-2026-11-26):

```text
components/Application.tsx
components/CalculatorFeedback.tsx
components/CalculatorPostcodeCheck.tsx
components/DisclosureMotion.tsx
components/KaiAssistant.css
components/KaiAssistant.tsx
components/KrakenJourney.tsx
components/ServiceCalculatorPage.tsx
components/calculator-feedback.css
components/disclosure-motion-controller.ts
components/home/ApprovedHome.tsx
components/home/BeforeAfterComparison.tsx
components/home/approved-home.css
components/home/before-after.css
components/home/conversion-home.css
components/home/scene-loading.js
components/home/scene.js
components/home/service-idle.css
components/home/service-idle.js
components/kaiMotion.ts
components/public-interactions.css
components/service-calculator.css
scripts/render-seo.mjs
server.ts
src/booking/calculatorInteractions.ts
src/home/before-after.ts
src/home/hero-media.ts
src/home/hero-response.ts
src/home/scene-calendar.ts
src/media/images.ts
tests/calculator-microinteractions.test.ts
tests/disclosure-motion.test.ts
tests/home-compiled-server.test.mjs
tests/home-conversion.test.mjs
tests/home-hero-first-paint.test.ts
tests/home-hydration.test.mjs
tests/home-scene-loading.test.mjs
tests/home-service-idle.test.mjs
tests/kai-motion.test.ts
```

Las tarifas, los contratos de pago y los servicios de correo no se modifican en este cambio. La oportunidad técnica pendiente es reducir las tareas largas de JavaScript que afectan al TBT, manteniendo el LCP y la estabilidad visual ya verificados.

Las ocho grabaciones y los informes completos de Lighthouse se entregan en el archivo local `Kraken-rendimiento-y-8-grabaciones-2026-11-26.zip`.
