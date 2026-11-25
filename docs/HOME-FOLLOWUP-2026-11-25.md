# Home y precio cerrado — revisión del 25 de noviembre de 2026

## Regla comercial confirmada

El propietario confirma precio cerrado para los datos y servicios seleccionados. Se elimina la contradicción de la sección 2 de las AGB en las seis lenguas. Si cambia el alcance o los datos, el cambio se acuerda antes de modificar el precio. Una solicitud no confirma una fecha. Las tarifas, el motor de cálculo, los importes guardados y el anticipo no se modifican.

La nueva versión compartida de condiciones es `kraken-2026-11-25-fixed-scope`. La API la exige para nuevas solicitudes. Una pestaña antigua recibe una indicación para revisar y aceptar la versión vigente. Las reservas ya creadas conservan su versión aceptada: el checkout valida la versión guardada, el precio y la revisión del presupuesto. No impone silenciosamente las condiciones nuevas a reservas antiguas.

Las pruebas ejercitan una reserva antigua con una pasarela ficticia: una versión distinta o falta de consentimiento se rechaza antes de llamar a la pasarela; la versión original mantiene importe y anticipo. No se realiza ningún pago real. Cancelación, garantía y condiciones de pago de las AGB se mantienen sin cambios. Aseguradora y capital siguen pendientes; no se publican datos no confirmados.

## Casa y recursos

Se corrige también el contraste de las dos acciones del panel azul: botón principal mint con texto navy y acceso a Kai en blanco.

El encuadre conserva la proporción 3:2 y la escena original. Se tiene en cuenta su margen transparente izquierdo para mostrar la habitación completa. `sizes` describe el ancho real del lienzo en cada breakpoint; no se amplía el archivo original ni se recortan poses o logos.

La casa añade fuentes AVIF a 320/640/768/960/1536 px, con WebP como alternativa. La imagen de día a 960 px pasa de 53.914 bytes del archivo WebP a 36.551 bytes del archivo AVIF; el navegador selecciona una sola fuente compatible. Día y noche actualizan conjuntamente la fuente preferente y la alternativa. El preload AVIF corresponde al mismo srcset/sizes y no obliga a descargar también WebP.

Generación: `node scripts/optimize-hero.mjs`, con sharp ya presente. Las pruebas comprueban hashes, dimensiones, transparencia y fidelidad de píxeles (PSNR superior a 37 dB contra el original redimensionado). No se han generado imágenes nuevas ni cambiado su contenido.

## Primera pintura e interactividad

El servidor conserva los preloads de imágenes responsive que tienen `imagesrcset` sin `href`. Los coloca después de la declaración del viewport y antes del CSS: adelanta el descubrimiento y evita descargar una variante de escritorio y otra móvil. Las tres mediciones finales descargan exactamente una imagen de casa, la variante AVIF de 960 px.

La Home entregada como HTML inicia su aplicación interactiva después de una primera oportunidad de pintura (dos frames), mediante un cargador externo pequeño y con hash. No hay espera de segundos, detección de Lighthouse ni contenido oculto. Las pestañas en segundo plano inician inmediatamente, y un cambio a segundo plano no puede dejar la aplicación sin cargar. El resto de rutas conserva su arranque normal. La política CSP sigue permitiendo únicamente los orígenes aprobados, sin añadir scripts inline ni `unsafe-inline` para JavaScript.

Kai y el paisaje esperan la decodificación y primera pintura de la casa antes de solicitar sus recursos. Se mantienen la animación automática, pausa fuera de pantalla, limpieza al desmontar y preferencia de movimiento reducido.

El CSS inicial sin comprimir pasa de 222.678 a 169.254 bytes. Las utilidades de páginas secundarias se cargan con sus rutas. La comparación mediante el compilador Tailwind conserva los 557 selectores originales en la unión de ambas hojas (668 finales). Se retiraron 300 selectores de Home sin modificar declaraciones de selectores conservados. El CSS completo mantiene su caché externa; no se inserta íntegro en HTML.

## Rendimiento final

Tres perfiles fríos y seriales, Lighthouse 13.6.0, móvil y limitación predeterminados, sobre Express compilado local. No hubo compilaciones ni pruebas simultáneas. Son mediciones sintéticas, no datos de usuarios ni una medición de producción. Mediana independiente por métrica:

| Métrica | Entrega anterior 331b3c0 | Seguimiento |
| --- | ---: | ---: |
| Puntuación | 91 | 95 |
| LCP | 3,16 s | 2,76 s |
| FCP | 2,16 s | 1,06 s |
| TBT | 63 ms | 107 ms |
| Transferencia | 551.446 bytes | 529.173 bytes |

**El objetivo LCP de 2,5 s sigue pendiente.** Las ejecuciones finales fueron 1,73 / 2,76 / 2,79 s; no se selecciona solo la más rápida. FCP mejora en las tres (1,10 / 1,05 / 1,06 s). TBT sube al ejecutar la aplicación después de la pintura inicial; sus tres valores son 169 / 98 / 107 ms. Se registra esta contrapartida aunque la puntuación global mejora. Las puntuaciones son 98 / 95 / 95. CLS permanece por debajo de 0,001.

[Valores completos de las tres ejecuciones](./qa/home-followup-performance-2026-11-25.json). Los informes Lighthouse JSON/HTML completos se conservan como artefactos locales del trabajo.

## Verificación final

- Compilación y TypeScript correctos. Suite general: 418 pruebas, 412 correctas, cero fallos y seis pruebas que requieren emulador omitidas en esa invocación. Las seis se ejecutaron aparte en el emulador real y pasaron, sin usar datos ni credenciales de producción.
- HTTP local: 144 páginas canónicas, 18 legales y 735 rutas históricas; headers, CORS, esquemas, recursos con caché, privacidad/noindex y preload responsive correctos.
- Geometría real mediante Lighthouse: 320, 390, 768, 1.024, 1.090, 1.440 y 1.920 px. Habitación completa, sin desbordamiento horizontal ni solapamiento con texto o panel. Se verifica movimiento reducido, pausa/reanudación y contraste >11:1 en las dos acciones del panel tras el nuevo arranque. [Geometría y controles](./qa/home-followup-responsive-2026-11-25.json), [captura móvil](./qa/home-followup-mobile-es.jpg) y [escritorio](./qa/home-followup-desktop-es.jpg).
- Precios, anticipo, pago, cancelación y garantía existentes no cambian. Seguro y capital siguen sin confirmar ni publicar. Reglas Firestore revisadas y probadas localmente; no aplicadas remotamente.
- Sin merge ni despliegue: la instrucción vigente para esta revisión pide rama y PR. La vista previa local tiene reservas reales desactivadas; no se enviaron mensajes, pagos ni altas.
