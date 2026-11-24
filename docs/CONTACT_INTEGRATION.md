# Contacto — integración local del 24 de noviembre de 2026

**Actualización:** la búsqueda de direcciones y códigos postales suizos ya está conectada y el adaptador de openrouteservice está preparado. Falta la clave privada del proveedor para activar el cálculo de kilómetros y tiempos. El aviso de imágenes se traduce ahora en los seis idiomas por petición posterior del usuario. Véase [CONTACT_ROUTING.md](./CONTACT_ROUTING.md), que sustituye el alcance inicial de ejemplos descrito más abajo. La suite completa de pruebas y el build se comprueban de nuevo después de restablecer el diseño vectorial.

La nueva página se integra en el repositorio real React 19 / Vite 6 / Express, en la ruta existente `/kontakt`. Los alias `/contact` y `/contacto` conservan su redirección e idioma. El paquete de referencia es `kraken-contacto-codex-v2.zip`; sus 29 archivos declarados se verificaron con los tamaños y SHA-256 del manifiesto. El ZIP no incluye el instalador externo `instalar-kraken-contacto.mjs`: se extrajeron directamente sus archivos, sin ejecutar un instalador ni sustituir la aplicación.

## Contenido y navegación

`components/KontaktPage.tsx` adapta `react/KrakenContact.tsx` a JSX nativo: un solo H1, mapa SVG y panel de contacto reales, sin iframe, HTML inyectado ni sustitución imperativa del árbol de React. `components/contact/contact.css` conserva el diseño del paquete; `integration.css` adapta tamaños, tipografía, controles y galería al contenedor existente. Se reutilizan Manrope y los iconos Lucide React de la web. D3 se sirve localmente y se carga bajo demanda; no se añade ninguna dependencia npm.

La cabecera aprobada comparte el nuevo enlace `/kontakt?lang=…` entre Home, Servicios, About y Contacto. El footer y Kai siguen siendo las instancias globales existentes. El lanzador de Kai se oculta mientras está abierta la galería y vuelve al cerrarla. El formulario anterior permanece debajo del mapa con sus transportes existentes, mensajes y validación. Su confirmación recibe el foco en el propio formulario, sin enviar al visitante al principio de la página.

El botón del presupuesto usa `/quote?lang=…` y el mismo `openHomeCalculator(null, onNavigate)` de la web: conserva el idioma y evita heredar una preselección antigua de servicio. Los modificadores del enlace siguen permitiendo abrirlo en otra pestaña. No se muestran precios de servicios fuera de la calculadora.

## Datos confirmados y recursos

- Seewadelstrasse 3, 8203 Schaffhausen.
- Teléfono `tel:+41774505705` y correo `mailto:kai@krakenpfm.ch`.
- Horario de contacto: lunes a domingo, 09:00–19:00, Europe/Zurich. No se afirma que se reciban visitas sin cita.
- El logo del paquete es idéntico al original del proyecto; se conservan sus proporciones y el descriptor “Properties & Facilities Management”.
- Las dos imágenes de oficina son conceptos, no fotografías verificadas. El aviso sobre imágenes conceptuales se traduce al idioma seleccionado junto a la imagen y dentro de la galería; el alemán conserva **“Konzeptbilder · keine Fotos des Standorts”**.
- Recursos, datos, D3 y licencias en `public/kraken-contact/`; procedencia e integridad en `CONTACT_ASSETS.json`.

Los 133 textos se traducen a alemán, inglés, español, portugués, italiano y francés mediante `contactTranslations.ts`, integrado con el idioma existente. Incluye accesibilidad, errores y estados del controlador. Los nombres de los ejemplos también tienen etiquetas localizadas; el buscador reconoce la etiqueta original o traducida y las direcciones exactas incluidas en los datos.

## Alcance real del mapa y configuración pendiente

La búsqueda ya acepta direcciones, localidades y códigos postales de Suiza mediante geo.admin.ch. Los tres accesos del paquete sirven ahora para buscar esos lugares mediante la API; el modo vivo no usa sus distancias precalculadas. El mapa vectorial de swisstopo conserva el diseño inicial y permite mostrar el destino fuera del extracto original de Schaffhausen.

Openrouteservice está preparado en servidor, pero falta la clave privada del usuario. Hasta que se configure, las métricas permanecen ocultas. El usuario ha elegido preparar este proveedor y ha indicado que aún no tiene cuenta. Los detalles de activación, fuentes, estados y pruebas se encuentran en [CONTACT_ROUTING.md](./CONTACT_ROUTING.md).

No hay tráfico en directo, geolocalización ni seguimiento GPS. Un código postal calcula un punto aproximado de localidad y se avisa de ello; una dirección completa permite seleccionar el destino concreto. La animación de la furgoneta representa la ruta. La atribución del mapa vivo es `© swisstopo · © OpenStreetMap contributors / openrouteservice`; el archivo original conserva la procedencia de sus ejemplos OSRM.

Una búsqueda nueva oculta los resultados anteriores. Se muestran carga, elección de dirección, ausencia de resultados, fallo, ausencia de ruta y proveedor todavía no conectado. Cambiar el sentido no restaura datos de otro destino y las respuestas tardías se descartan.

## Interacciones y ciclo de vida

Zoom con botones/teclado o Ctrl + rueda; arrastre con ratón; centrado, marcadores clicables, reproducción/pausa y tres accesos de ejemplo. La rueda normal desplaza la página y un dedo no queda capturado por el mapa. Las sugerencias admiten teclado; la galería contiene el foco, cierra con Escape y lo devuelve al control que la abrió.

El controlador recibe sus dependencias y traducción y devuelve `destroy()`. La limpieza cancela frames, transiciones y solicitudes, elimina eventos y ResizeObserver, restaura el estado propio de la galería y quita únicamente su capa SVG. Un montaje reemplaza cualquier controlador previo del mismo nodo; las selecciones del propio nodo sobreviven a un cambio de idioma mediante WeakMap, sin guardar direcciones del mapa en almacenamiento del visitante. `prefers-reduced-motion` impide animar el recorrido y elimina transiciones.

## Comprobaciones y revisión local

- `npm test`: la suite completa pasa, incluidas regresiones de direcciones desconocidas/sentido, ausencia de ruta, seis idiomas, HTML inicial, limpieza/remontaje, reproducción, movimiento reducido, galería y servidor compilado.
- `npm run build`: correcto; genera seis fragmentos iniciales de contacto, utilizados por Express antes de cargar JavaScript.
- `tsc --noEmit`: ningún error nuevo de Contacto; persisten tres errores previos ajenos al cambio en CareersPage (`webhookPromise`) y PaymentCelebrationPage (`setConfetti`, `confetti`).
- Navegador: 320, 360, 390, 430, 768, 1024 y 1440 px; los seis idiomas a 320 px sin desbordamiento horizontal; una sola página, capa de mapa y formulario tras navegar/remontar.
- Probados zoom por teclado, arrastre, desplazamiento normal de página, tres ejemplos, ambos sentidos, dirección desconocida, reproducción/pausa, galería y Escape, y apertura de la calculadora en francés.
- Probado en el navegador un fallo HTTP 503 intencionado del mapa: datos y calculadora siguen accesibles; cambiar idioma conserva el enlace correcto; reintentar tras recuperar el recurso monta exactamente una capa de mapa.
- El formulario conserva los servicios existentes. No se enviaron mensajes, reservas ni pagos durante las pruebas.

Preview de desarrollo: `http://127.0.0.1:3002/kontakt?lang=es`. Para iniciarla otra vez desde la raíz del repositorio: `PORT=3002 HOST=127.0.0.1 npm run dev`.

Este encargo es local. No se hizo push, no se cambió el PR y no se publicó ni promovió ningún despliegue en krakenpfm.ch.
