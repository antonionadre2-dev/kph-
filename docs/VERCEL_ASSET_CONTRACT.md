# Artefacto verificado de Express y Vite

El incidente del 26 de noviembre de 2026 mostró por qué un HTTP 200 del HTML no basta. La publicación de `76e8cb4` ejecutó el build remoto de Express y quedó `READY`, pero los JS/CSS que referenciaba la página devolvían 404. La publicación anterior `d299da3` usó un artefacto prebuilt preparado: sus entradas JS/CSS respondían 200. Ambos usan la misma exclusión de `public/assets` y `dist/assets` del envío de fuentes, y los recursos públicos tampoco se incluyen en la función. Copiar bundles a `public/assets` durante Vite no acredita que el recolector nativo los haya incluido en el CDN.

La evidencia de metadatos y líneas de log seleccionadas está en `outputs/customer-payment-p0-2026-11-26/asset-diagnosis.json` del chat. Las APIs de listado consultadas muestran fuentes y funciones, no un inventario completo de los estáticos del CDN; ese listado no debe interpretarse como comprobación HTTP de assets.

## Preparación local de Preview

Se conserva Express y su política de rutas. No se modifica `outputDirectory` para apuntar a `public`: el builder Express también usa esa opción para resolver el punto de entrada del servidor.

Los builds ordinarios de QA siguen disponibles con `npm run build:vercel` cuando `VERCEL` no está definido. Un build bajo Vercel sin `KRAKEN_PREBUILT_BUILD=1` falla expresamente, evitando otra publicación de fuentes que quede lista sin sus recursos.

Para preparar un artefacto Preview se requieren settings locales revisados en `.vercel/project.json`, con el proyecto/equipo correctos y `settings.framework=express`, `settings.buildCommand=npm run build:vercel`, además de `.vercel/.env.preview.local`. En QA esta última puede contener únicamente `BOOKING_ENABLED=false`; no se necesitan credenciales reales para comprobar el empaquetado. Ningún script realiza `pull`, enlaza un proyecto, consulta secretos ni crea una publicación automáticamente.

Con un ejecutable local de Vercel CLI disponible, ejecutar desde el repositorio:

```sh
node --import tsx scripts/make-vercel-prebuilt.mjs --cli /ruta/al/ejecutable/vercel
node --import tsx scripts/prepare-vercel-output.mjs --verify
```

El primer comando solo ejecuta `vercel build` local, con la marca explícita de fase prebuilt, y después prepara y verifica el artefacto. Usa el entorno Preview; no añade `--prod` ni lee el archivo local de Production. Si falla un paso, el artefacto no queda marcado como verificado. No ejecutar `npm ci` sobre las dependencias compartidas solo para lanzar este script.

El contrato comprueba los 193 HTML de ejecución, las copias de la función, las rutas CDN y sus hashes. Además genera `.vercel/output/frontend-asset-manifest.json`, fuera de la carpeta pública, con hashes y dependencias de las entradas, todos los chunks JS/CSS, imports anidados y recursos locales de CSS. Un bundle, fuente o import local que falte hace fallar la preparación; alterar el manifiesto hace fallar `--verify`.

## Comprobación de una publicación autorizada

La eventual publicación debe consumir exclusivamente ese artefacto con el modo `--prebuilt`, después de la verificación, y conservar el mismo target Preview. El script anterior no publica. Una nueva publicación de producción queda fuera de este trabajo.

Antes de promover cualquier versión, la revisión HTTP debe cubrir los JS y CSS exactos referenciados por el HTML y sus chunks diferidos, no solo el documento: todos deben devolver 200 con contenido y MIME de JS/CSS, nunca una página HTML de error. Revisar también las fuentes e imágenes locales indicadas por CSS y las páginas con su estilo/código cargados. La autenticación de una preview debe proporcionarse mediante un mecanismo autorizado, sin imprimir sus secretos.

Fuentes primarias: [Express en Vercel](https://vercel.com/docs/frameworks/backend/express), [build local y prebuilt](https://vercel.com/docs/cli/build), [estáticos de Build Output API](https://vercel.com/docs/build-output-api/primitives), [builder Express](https://github.com/vercel/vercel/blob/main/packages/express/src/build.ts).
