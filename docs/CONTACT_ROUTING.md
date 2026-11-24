# Direcciones y rutas de Contacto — preparación local

Actualizado el 24 de noviembre de 2026. No se ha hecho push ni se ha publicado esta integración en producción.

## Lo que funciona ahora

La página `/kontakt` acepta búsquedas de direcciones, localidades y códigos postales **de Suiza**, a través de SearchServer de geo.admin.ch. Ya no limita la búsqueda a los tres ejemplos del paquete. La petición se envía al pulsar Buscar o Enter; no se envía una petición por cada tecla. El visitante elige entre los resultados, incluso cuando solo hay uno. Esto evita confundir direcciones próximas, como Seewadelstrasse 3 y 3.1.

El marcador utiliza las coordenadas del resultado elegido. Un código postal o una localidad representa un punto aproximado del área, no el domicilio de la persona; la interfaz lo explica y recomienda introducir una dirección completa para precisar el destino. La sede continúa fijada en servidor en `[8.655662, 47.699447]` — Seewadelstrasse 3, 8203 Schaffhausen.

El mapa recupera el diseño vectorial inicial: fondo claro, agua azul suave, zonas verdes discretas, edificios grises y calles blancas con contornos tenues. Para Schaffhausen se reutiliza el extracto original incluido en el paquete. Al buscar destinos fuera de esa cobertura se cargan teselas vectoriales oficiales de swisstopo y se dibujan con la misma paleta. El fondo de mapa topográfico raster/WMS se ha retirado por petición del usuario. La búsqueda y el adaptador de rutas siguen siendo los mismos.

La carga de teselas se limita al área visible, con un máximo de 16 teselas por vista, cuatro descargas simultáneas, caché de 32 teselas, cancelación de solicitudes antiguas y actualización al terminar el desplazamiento/zoom. El nivel de detalle se adapta a la vista y las vías principales tienen prioridad en zonas densas. Las geometrías mantienen su posición geográfica: una zona anterior no se estira como imagen para representar otra localidad. Se conserva la atribución de swisstopo y OpenStreetMap; la clave de openrouteservice continúa pendiente para activar rutas reales.

Al editar el destino se borran inmediatamente los resultados anteriores y se cancelan las solicitudes pendientes. Los identificadores de petición impiden que una respuesta tardía sustituya la búsqueda más reciente. Las sugerencias se pueden recorrer con teclado. Se distinguen carga, lista de candidatos, búsqueda sin resultados, error, límite de solicitudes y ausencia de ruta.

## Openrouteservice preparado; clave pendiente

El usuario ha elegido preparar openrouteservice y ha indicado que todavía no tiene cuenta. **No existe una clave configurada y aún no se calculan kilómetros ni tiempos para las direcciones elegidas.** La interfaz mantiene esas métricas ocultas y explica que el cálculo no está disponible. No usa los datos precalculados como sustituto de una ruta nueva, ni conecta automáticamente un servidor de demostración.

Para activar el cálculo:

1. Crear una cuenta propia en [HeiGIT / openrouteservice](https://account.heigit.org/), y obtener una clave con Directions habilitado.
2. Añadir la variable privada `CONTACT_ROUTING_API_KEY` al archivo `.env` local, siguiendo el nombre documentado en `.env.example`. El valor nunca debe incorporarse a JSX, a variables `VITE_`, al repositorio ni a recursos públicos.
3. Reiniciar el servidor local: `PORT=3002 HOST=127.0.0.1 npm run dev`.
4. Comprobar que `/api/contact/config` indica `routing.available: true`; solo informa de disponibilidad, no devuelve la clave.
5. Verificar una dirección real en los dos sentidos antes de publicar. El despliegue futuro necesitará esa variable privada en su configuración de servidor.

No se han creado cuentas, aceptado condiciones, contratado planes ni introducido credenciales por el usuario. Cuando disponga de la clave, la estructura ya está preparada para conectarla.

El adaptador utiliza la URL vigente `https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson`, con la clave en el encabezado `Authorization` del servidor. Cada sentido solicita un cálculo independiente, intercambiando origen y destino; no invierte simplemente los puntos. Distancia y tiempo proceden de `properties.summary` y no se recomputan a partir de una línea recta. La geometría simplificada sirve para dibujar el recorrido sin alterar las métricas del proveedor. El tiempo es una estimación sin tráfico en directo; la animación sigue siendo ilustrativa, no GPS, y el perfil de conducción no certifica restricciones específicas de carga o altura de una furgoneta.

## API y protección de datos de entrada

- `GET /api/contact/config`: capacidad de búsqueda y disponibilidad del proveedor de rutas.
- `POST /api/contact/geocode`, cuerpo `{query, language}`: hasta ocho candidatos con identificador, etiqueta de texto, coordenadas y tipo.
- `POST /api/contact/route`, cuerpo `{coordinates, direction}`: geometría, distancia en metros y duración en segundos del proveedor.

Las direcciones y coordenadas van en el cuerpo, no en la URL pública del sitio. La respuesta es `private, no-store`. El código no guarda ni registra direcciones de búsqueda o rutas. No se activa geolocalización. Los únicos contadores retenidos por el limitador son identificadores de cliente, número de solicitudes y caducidad, con tamaño acotado.

Se validan longitud y palabras de búsqueda, coordenadas de destino en la cobertura suiza, formato y cantidad de puntos de ruta, métricas finitas y etiquetas convertidas a texto. El cliente no puede elegir la URL del proveedor ni alterar la sede. Las solicitudes tienen un plazo de ocho segundos, respuestas de tamaño máximo de 1 MiB, límites de frecuencia y errores estructurados, sin filtrar errores o claves del proveedor al navegador.

Los dos sentidos, el cambio de idioma, editar mientras carga y desmontar el componente cancelan o invalidan los trabajos anteriores. `destroy()` elimina la capa SVG propia, los observadores, los eventos y los frames; también limpia los temporizadores, las solicitudes de teselas y la caché del fondo vectorial.

## Traducción del aviso de las imágenes

El aviso aparece localizado junto a la imagen y dentro de la galería:

| Idioma | Texto |
| --- | --- |
| Alemán | Konzeptbilder · keine Fotos des Standorts |
| Inglés | Concept images · not photos of the location |
| Español | Imágenes conceptuales · no son fotos del local |
| Portugués | Imagens conceptuais · não são fotografias do local |
| Italiano | Immagini concettuali · non sono foto della sede |
| Francés | Images conceptuelles · pas de photos du site |

Las imágenes siguen siendo conceptos de oficina, no fotografías verificadas. El diccionario de Contacto cuenta con 133 textos en los seis idiomas e incluye los estados dinámicos y el mapa de fondo.

## Validación

- `npm test`: la suite completa pasa, incluidas solicitudes del cliente, geocodificación y rutas del servidor, validación, límites, secretos, fallo del proveedor, timeout, ambos sentidos, respuestas tardías y desmontajes.
- `npm run build`: correcto, con seis fragmentos iniciales de Contacto. TypeScript conserva únicamente los tres errores previos ajenos a Contacto.
- Navegador con el servicio real de búsqueda: código `8001`, dirección completa Seewadelstrasse 3 y selección entre 3/3.1, teclado, ausencia de resultados para `9999`, dirección desconocida sin métricas anteriores y estado explícito sin clave de rutas.
- Aviso junto a la imagen y dentro de la galería: comprobado en los seis idiomas a 320 px, sin desbordamiento horizontal. Escape y devolución de foco conservados.
- La respuesta correcta de openrouteservice y su ausencia de ruta se prueban con respuestas de proveedor controladas en las pruebas. No se ha validado una llamada real autenticada porque falta la clave.

## Fuentes técnicas consultadas

- [SearchServer oficial](https://docs.geo.admin.ch/access-data/search.html): direcciones, localidades y códigos postales.
- [Teselas vectoriales oficiales](https://docs.geo.admin.ch/visualize-data/vector-tiles.html) y [condiciones de geo.admin.ch](https://www.geo.admin.ch/en/general-terms-of-use-fsdi/).
- [API vigente de HeiGIT](https://api.heigit.org/), [referencia interactiva](https://playground.heigit.org/) y [migración oficial de URL de 2026](https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912).
- [Indicaciones del proveedor para mantener las claves en servidor](https://giscience.github.io/openrouteservice/frequently-asked-questions.html).
