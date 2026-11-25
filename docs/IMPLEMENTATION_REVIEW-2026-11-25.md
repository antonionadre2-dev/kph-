# Kraken PFM — revisión de implementación, 25 de noviembre de 2026

Kraken prioriza ahora la limpieza de fin de alquiler para hogares particulares, con «Umzugsreinigung Zürich» como entrada principal, precios procedentes del calculador y rutas públicas coherentes en seis idiomas.

Esta entrega se prepara para un **pull request**, sin desplegar en producción:

- Rama de trabajo: `codex/umzugsreinigung-audit-2026-11-25`.
- Rama base: `codex/cta-payments-2026-11-25`.
- Commit de referencia anterior a estos cambios: `d299da3`.
- La rama se entrega como PR contra esa base. El enlace al PR y al commit se facilita en la entrega; esta revisión no autoriza un merge.

## Implementación por áreas

### Idiomas, rutas y contenido rastreable

- Alemán de Suiza como referencia, sin prefijo; traducciones bajo `/en/`, `/es/`, `/pt/`, `/it/` y `/fr/`. Los antiguos parámetros `lang`/`hl` se trasladan mediante redirecciones permanentes.
- `publicHref()` centraliza los enlaces nativos, conserva selección de servicio, fragmentos y valores opacos de reservas o recuperación. Los enlaces informativos del footer abren los detalles del servicio; no ejecutan la transferencia al calculador.
- `/about` pasa a `/ueber-uns`, `/quote` a `/offerte`, y las páginas de ciudad/servicio adoptan nombres como `/umzugsreinigung/zuerich`.
- Canonical propio por idioma, hreflang recíproco y `de-CH` como `x-default`. Los locales Open Graph usan `de_CH`, `fr_CH` e `it_CH`; inglés, español y portugués no reciben una región inventada.
- Sitemap de 144 URL canónicas correspondientes a 24 páginas revisadas en seis idiomas. Las rutas privadas, demo y de servicios retirados quedan fuera.
- Contenido principal, enlaces, precios y FAQ disponibles en el HTML inicial. Las páginas regionales mantienen una única sede real en Schaffhausen; Zúrich y Winterthur son zonas atendidas.
- Se conserva el acceso técnico de rastreo para buscadores y búsqueda de ChatGPT. Esto no constituye una solicitud de indexación ni garantiza aparecer en resultados.

Inventario y política: [ROUTE_MIGRATION.md](./ROUTE_MIGRATION.md), [ROUTE_MIGRATION.csv](./ROUTE_MIGRATION.csv) y [URL_REMOVALS.csv](./URL_REMOVALS.csv).

### Umzugsreinigung y conversión

- H1 de portada «Umzugsreinigung Zürich», con el eslogan anterior como subtítulo. La oferta inicial muestra el paquete calculado y sus condiciones; el CTA lleva a `/offerte?service=end` o su equivalente traducido.
- Umzugsreinigung aparece primero. El clima ocupa una acción secundaria y la venta precede a los controles de la escena también en el orden del DOM.
- Landings de fin de alquiler para Zúrich, Schaffhausen y Winterthur con contenido propio en seis idiomas. Incluyen tabla por habitaciones/superficie, alcance, extras, pasos, entrega a la administración, condiciones de garantía, recursos municipales y FAQ visibles.
- Enlaces desde Home, servicios y footer hacia la landing de Zúrich.
- Datos estructurados de negocio, servicio, ofertas, migas y FAQ vinculados al contenido visible. No se añaden `AggregateRating` ni reseñas estructuradas sin datos reales.
- **El motor de precios `src/booking/pricing.ts` no cambia.** Los importes de portada, tarjetas, tablas y ofertas estructuradas se obtienen de sus selecciones y cálculos. No se publican importes numéricos inventados para mudanzas que requieren valoración.

### Identidad y diseño compartido

- Descriptor del logo «Reinigung & kleine Umzüge», traducido. La razón social completa se reserva para Impressum y copyright.
- Header compartido por páginas públicas, legales y privadas, con teléfono, WhatsApp y CTA también en móvil. Conserva los accesos existentes de cuenta y cierre de sesión.
- Texto principal de acción «Offerte berechnen», con variantes de servicio como «Umzugsreinigung berechnen».
- Tokens de color y tipografía Manrope y tres variantes de acción: principal, secundaria y discreta. El calculador reutiliza estas variantes sin sustituir los controles del mapa, tablas o selectores.
- Se mantienen las ilustraciones aprobadas. Las imágenes informativas conservan descripciones traducidas; las capas que repiten una ilustración compuesta tienen `alt` vacío y `aria-hidden`, y el contenedor recibe la descripción accesible.
- El mapa de Contacto, sus rutas, atribución y advertencia de imágenes conceptuales se conservan. No se presentan ilustraciones como fotografías reales del local o del equipo.

### Calculador y datos locales

- Código postal al principio, antes de pedir la dirección completa. Encontrar una localidad no confirma disponibilidad, desplazamiento ni cita.
- Umzugsreinigung primero y preselección desde los CTA correspondientes, preservando las demás selecciones y el flujo de solicitud.
- Una acción principal por paso. Guardado, ayuda, guía y Kai quedan entre las opciones secundarias.
- WhatsApp abre un resumen del servicio y de los importes del motor. Excluye datos personales, dirección y códigos de acceso; el visitante decide si envía el mensaje.
- El texto de pago depende de la configuración disponible: Payrexx alojado tras la confirmación del servicio y el anticipo/resto configurados. No se inventan marcas de tarjetas, métodos ni disponibilidad comercial.
- El plazo de confirmación es configurable y permanece vacío hasta que el propietario lo apruebe. La fecha elegida sigue siendo una solicitud.
- El borrador persistente conserva solo configuración anónima permitida, con caducidad de 24 horas. Leerlo no renueva el plazo. Se eliminan borradores antiguos con contactos; el borrador se limpia tras una respuesta válida de solicitud aceptada. Los datos del formulario actual permanecen en memoria.
- Tokens de flujos activos en sesión, idioma y preferencias de cookies se tratan por separado. No se interpreta el uso del sitio como consentimiento de publicidad.

### Seguridad y cuentas

- Cabeceras `nosniff`, `no-referrer`, `Permissions-Policy`, `SAMEORIGIN` y retirada de `X-Powered-By`.
- CSP efectiva para `frame-ancestors`, `object-src` y `base-uri`; restricciones de recursos inicialmente en **report-only** para revisar compatibilidad con autenticación y pagos.
- CORS limitado al dominio propio y al origen de la instancia de revisión; no sustituye la autenticación ni las firmas de webhook.
- `/.well-known/security.txt` con el contacto real de Kraken.
- Registro de clientes abierto según autorización previa; una cuenta no es necesaria para solicitar una oferta. No se crea una cuenta automáticamente después de un login fallido.
- Carga diferida del SDK de autenticación y limpieza de sesiones/cambios de identidad. Acceso de personal basado en identidad verificada y política central, sin otorgar privilegios por pertenecer a un dominio.
- Propuesta local de reglas Firestore para limitar lecturas/escrituras del portal. **No se han aplicado reglas remotas.** Requieren revisión contra documentos reales y prueba en emulador o staging antes de desplegarlas.

Alcance, limitaciones y comprobaciones específicas: [AUTH_SECURITY_REVIEW.md](./AUTH_SECURITY_REVIEW.md).

### Textos legales

- AGB y privacidad describen la oferta actual; se retiran los servicios desaparecidos, referencias B2B/SLA, la antigua opción Precision Media Quote y recargos/topes sin respaldo en el calculador actual.
- El desplazamiento sigue incluido, conforme a la instrucción del propietario. No se altera la fórmula de precios.
- Se conservan literalmente los textos originales de pago, cancelación y garantía de entrega en las seis lenguas. La garantía sigue en la sección 8 y se comparte con las landings.
- Privacidad separada en un módulo ligero, con enlace a Impressum para la identidad jurídica, infraestructura actual y almacenamiento local descrito según la implementación.
- **Actualización posterior:** el propietario confirmó precio cerrado. La sección 2, el calculador y las FAQ ya comparten esa regla en seis lenguas; las reservas existentes conservan las condiciones aceptadas. Véase [seguimiento de Home y precio cerrado](./HOME-FOLLOWUP-2026-11-25.md).

Ediciones y decisiones concretas: [LEGAL-OWNER-REVIEW-2026-11-25.md](./LEGAL-OWNER-REVIEW-2026-11-25.md). No se declara que esta edición sea una aprobación jurídica.

### Velocidad e imágenes

- Manrope variable alojada en el dominio; se retiran las solicitudes globales de fuentes de Google.
- Separación de módulos públicos, autenticación, metadatos, diccionarios antiguos, PDF y áreas privadas para evitar su carga inicial innecesaria.
- WebP responsive con hash de contenido, `srcset`/`sizes`, dimensiones intrínsecas y caché immutable para derivados. Los originales permanecen disponibles por compatibilidad.
- CSS y recursos de la parte inferior diferidos. Kai mantiene autoplay, pausa y `prefers-reduced-motion`.
- El paisaje solicita solo el cuadrante de la estación activa. Los sprites Kai añaden versiones proporcionales de 768 px, con celdas completas y alfa; la variante natural se conserva para escritorio de alta densidad.
- El primer sprite espera el clima hasta 500 ms. Si falta, elige ropa por la fecha de Zúrich y después actualiza la temperatura cuando llegue. Solo solicita la variante activa.

| Recurso | Original | Derivado utilizado según contexto |
| --- | ---: | ---: |
| Habitación de día | 233,7 KiB | 29,3 KiB a 640 px |
| Atlas de estaciones | 494,5 KiB | 88,6–99,9 KiB por estación a 627 px |
| Kai tareas / abrigo | 302,3 / 298,8 KiB | 86,1 / 86,3 KiB a 768 px |
| Logo | 58,4 KiB | 4,2 KiB a 160 px |

Estas cifras describen archivos, no una medición completa de la página. Informe reproducible y tabla de medios: [MEDIA-OPTIMIZATION-2026-11-25.md](./MEDIA-OPTIMIZATION-2026-11-25.md). Generación: `node scripts/optimize-media.mjs`.

## Redirecciones y retirada de resultados antiguos

El inventario de Git y sitemaps históricos contiene **735 URL**: 284 redirecciones, 441 retiradas y 10 conservadas. La tabla completa está en [ROUTE_MIGRATION.csv](./ROUTE_MIGRATION.csv).

| URL anterior | Destino o resultado | Código previsto |
| --- | --- | ---: |
| `/?lang=es` | `/es/` | 301 |
| `/about` | `/ueber-uns` | 301 |
| `/quote?lang=es&service=end` | `/es/offerte?service=end` | 301 |
| `/services/zurich/end-of-tenancy?hl=fr` | `/fr/umzugsreinigung/zuerich` | 301 |
| `/services/winterthur/daily-cleaning` | `/wohnungsreinigung/winterthur` | 301 |
| `/reinigung/uster` | `/reinigung/region-zuerich` | 301 |
| `/reinigung/neuhausen-am-rheinfall` | `/reinigung/kanton-schaffhausen` | 301 |
| `/services/zurich/gardening` | Servicio retirado | 410 |
| `/commercial` | Página comercial retirada | 410 |

Las 441 URL con 410 que deben abandonar los resultados antiguos están en [URL_REMOVALS.csv](./URL_REMOVALS.csv). Tras un despliegue autorizado, Google debe poder rastrear esos estados y el sitemap actual. Esta rama no solicita retiradas ni reindexación en una cuenta de búsqueda de producción.

`/quote-demo` y `/commercial-quote` permanecen con `noindex` porque su uso no está confirmado. El propietario debe decidir si se retiran con 410. Las rutas desconocidas siguen siendo 404.

## Datos que no se han inventado

- El bloque de opiniones está preparado, pero la colección de reseñas verificadas está vacía y el bloque no se muestra. No hay estrellas, número de clientes, testimonios ni valoraciones ficticias.
- No se han generado fotografías falsas del equipo, de la furgoneta real o del local. Las ilustraciones y conceptos conservan su identificación.
- No se publica una aseguradora, capital asegurado, certificación ni cobertura verificada sin respaldo.
- La garantía comercial remite al alcance y condiciones existentes; no se añade una promesa universal o «100 %».
- No se inventa un plazo de respuesta, disponibilidad, método de pago o precio de mudanza.

## Decisiones que necesita tomar el propietario

1. Revisar las condiciones conservadas de depósito express del 15 %, pagos, recordatorios y cancelación. El propietario ya confirmó precio cerrado para el alcance seleccionado. Véase el [informe legal](./LEGAL-OWNER-REVIEW-2026-11-25.md).
2. Confirmar aseguradora, suma y justificante, y las condiciones de garantía de la sección 8 antes de publicar afirmaciones adicionales.
3. Proporcionar reseñas auténticas con sus fuentes y fotografías reales si desea sustituir las ilustraciones. Hasta entonces se mantienen los bloques condicionales y las advertencias actuales.
4. Confirmar el plazo de respuesta a las solicitudes; el valor configurable está vacío.
5. Confirmar el uso de `/quote-demo` y `/commercial-quote`.
6. Revisar las reglas Firestore propuestas y probarlas con cuentas/documentos reales en emulador o staging. Revisar credenciales o sesiones anteriores si algún ejemplo antiguo fue una contraseña real; este PR no las rota.
7. Autorizar por separado cualquier publicación, cambio remoto de reglas y posterior envío de sitemap o solicitud de revisión en Search Console.

## Validación final

El 25 de noviembre de 2026 finalizaron correctamente `npm run build` y `npm run lint`. La suite completa ejecutó **406 pruebas: 405 correctas, cero fallos y una omitida**. La omitida necesita un emulador Firestore local y Java Runtime; no se presenta como validación de reglas. El motor `src/booking/pricing.ts` y los cálculos de pago/reserva no tienen cambios.

El calculador se recorrió en un navegador hasta el resumen con datos sintéticos: fin de alquiler, 2,5 habitaciones / 65 m², **CHF 560**, fecha solicitada y contacto de prueba. Se comprobó el error de código postal vacío, 8001 reconocido, 9999 sin resultado anterior y continuación manual honesta. Una entrada en inglés con ventanas conserva ese servicio. No se aceptaron condiciones ni se envió una solicitud, correo, pago o alta real. Evidencia local: capturas del resumen y registro de QA; los resultados se resumen aquí sin publicar contactos sintéticos innecesarios.

El generador PDF heredado también se revisó: datos del emisor corregidos, campos de texto escapados y vista previa sin scripts, identificada como borrador. No se cambió ningún registro histórico, importe o documento emitido. Véase [CHECK_LEGACY_INVOICES.md](./CHECK_LEGACY_INVOICES.md).

### HTTP sobre la compilación real

Se ejecutó `node scripts/verify-local-preview.mjs http://127.0.0.1:3019`. Todas las peticiones se dirigieron al servidor local; la cabecera Host de producción se usa para comprobar su política de SEO, sin contactar con producción. Resultado: [http-verification.json](./qa/http-verification.json).

| Comprobación | Resultado |
| --- | --- |
| Sitemap y páginas públicas | 144 URL distintas, todas 200, canonical propio y siete alternates (seis idiomas + x-default) |
| JSON-LD | JSON válido en 144 páginas; una sede, ofertas vinculadas al motor y ninguna valoración inventada |
| Histórico | 735 peticiones: 284 con 301 y Location exacto, 441 con 410, diez conservadas con 200 |
| Documentos legales | 18 respuestas 200, un H1 por documento |
| Seguridad | CSP efectiva/report-only, antiiframe, nosniff, no-referrer, permisos y ausencia de X-Powered-By |
| CORS | Origen propio aceptado y origen ajeno rechazado con 403 |
| Privacidad | Acceso/registro/dashboard y enlaces con token noindex; la introducción pública del calculador conserva su política propia |
| Archivos y caché | security.txt 200; fuentes/medios/bundles con hash immutable; plantillas, source maps y claves no públicas |
| Oferta anterior | No aparecen las referencias retiradas en el texto de las 144 páginas públicas |
| Vista previa | noindex en HTML y cabecera; no se solicita indexación externa |

Los controles de autorización se probaron con dobles de SDK, pruebas de sesión y validaciones locales. No se ha iniciado sesión en cuentas reales ni validado remotamente el acceso de cada usuario. La prueba del emulador Firestore ya pasa en sus seis casos sintéticos; la aplicación remota y compatibilidad con datos existentes siguen pendientes, como se describe en [PRIVACY_FIRESTORE_AUDIT.md](./PRIVACY_FIRESTORE_AUDIT.md). Los headers CDN de Vercel no se han observado en un despliegue nuevo.

### Dispositivos y navegación

Revisión de navegador con anchos **320, 390, 768 y 1440 px**: ancho del documento igual al viewport, sin desbordamiento horizontal de la portada. Se comprobó el prefijo al cambiar de idioma, menú adaptable, navegación a Servicios y Contacto, galería con cierre Escape y retorno del foco, y pausa/reanudación de Kai. El mapa conserva su diseño. La política de movimiento reducido y limpieza de efectos está cubierta por los controles y pruebas del proyecto; no se simula una prueba en cada dispositivo físico.

[Registro adaptable](./qa/responsive-qa.json), [portada escritorio](./qa/home-desktop-es.jpg) y [portada a 320 px](./qa/home-mobile-320-es.jpg). La consola de la revisión no mostró errores de hidratación. El viewport temporal se restableció y la escena quedó reanudada.

### Lighthouse móvil

[Resultados reproducibles y tres ejecuciones por versión](./qa/performance-2026-11-25.json). Las cifras siguientes son medianas independientes por métrica, con Lighthouse 13.6.0 sobre Express compilado local, perfiles fríos, emulación móvil y throttling predeterminado (RTT 150 ms, CPU ×4). Base `d299da3` en puerto 3017; versión revisada en 3019. No se ejecutaron builds ni tests durante las tres mediciones finales. Son mediciones sintéticas, no datos de usuarios reales.

| Métrica | Antes | Después |
| --- | ---: | ---: |
| Rendimiento | 61 | 91 |
| LCP | 12,71 s | 3,16 s |
| FCP | 1,36 s | 2,16 s |
| TBT | 562 ms | 63 ms |
| CLS | 0,0000 | 0,0007 |
| Transferencia total | 2,96 MB | 0,55 MB |
| CSS principal sin comprimir | 402.653 bytes | 222.678 bytes |

Se alcanza el objetivo de puntuación ≥90. **No se alcanza todavía LCP <2,5 s**: la mediana es 3,16 s. La transferencia se reduce un 81,4 %. FCP empeora en la mediana de esta muestra (de 1,36 a 2,16 s), con ejecuciones finales entre 1,08 y 2,19 s. Ambos puntos quedan expresamente pendientes; no se presenta el rendimiento como completamente resuelto. El siguiente trabajo debe centrarse en el CSS inicial y el arranque de la escena, midiendo también FCP y la interacción para evitar trasladar el coste. No se han ocultado imágenes o contenido para mejorar la puntuación. Las tres ejecuciones finales dan 91, 91 y 93 puntos; el JSON conserva todos los valores.

La prueba local no demuestra una operación real de pago, correo transaccional, permisos remotos de Firebase o indexación efectiva. No se realiza ninguna de esas acciones como parte de este informe. La entrega se mantiene para revisión; no se ha publicado en producción.


## Seguimiento posterior del 25 de noviembre

El propietario confirmó precio cerrado para los datos y servicios seleccionados. Las AGB, el calculador y FAQ ya comparten esa regla en seis idiomas. Las reservas existentes mantienen las condiciones aceptadas. La casa tiene nuevo encuadre por dispositivo y fuentes AVIF con WebP de alternativa; se reduce CSS inicial y se prioriza la pintura del HTML antes de iniciar la aplicación.

La nueva mediana local de tres ejecuciones es **95 puntos, LCP 2,76 s y FCP 1,06 s**. LCP 2,5 s continúa pendiente. TBT sube a 107 ms; se documenta la contrapartida. Las seis pruebas del emulador Firestore ya pasan con datos sintéticos. No se ha publicado ni aplicado reglas remotamente. El estado actual y la evidencia están en [Home y precio cerrado](./HOME-FOLLOWUP-2026-11-25.md).
