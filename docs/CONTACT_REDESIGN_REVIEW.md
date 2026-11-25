# Contacto de Kraken — revisión del 25 de noviembre de 2026

## Implementación

La página `/kontakt` y sus seis versiones de idioma usan componentes reales de React, dentro de la aplicación existente. El [mockup aportado por el propietario](../reference/contact-redesign/Kraken-contacto-mockup.png) guía la composición: header compacto con logo original y descriptor debajo, titular directo, horario visible, acciones de calculadora/WhatsApp/teléfono y tarjetas de formulario y cobertura. En escritorio WhatsApp usa menta y el mapa es horizontal; en móvil el formulario precede al mapa y las secciones se apilan.

El mapa utiliza vectores geográficos reales de swisstopo y una proyección Mercator de escala uniforme. La imagen del mockup solo sirve como referencia estética: no se usa su geografía generada. Los marcadores enlazan con las páginas regionales existentes. No hay motor de mapas, geolocalización, rutas, métricas de viaje, oficinas conceptuales ni peticiones cartográficas durante la visita. Un encuadre específico conserva la legibilidad en móvil sin desplazar ciudades.

El formulario tiene nombre, correo, teléfono opcional, canal preferido, servicio, código postal suizo y mensaje. La recepción requiere una transacción del servidor con referencia válida; una respuesta HTTP 200 genérica no basta. Se conservan los valores y el identificador de reintento en memoria tras errores y cambios de idioma. Hay validación en ambos lados, honeypot, Turnstile verificado en servidor, comprobación de origen, límites y deduplicación persistente. Las consultas no confirman reservas, servicios, fechas ni pagos.

El bloque personal usa Antonio Gomes y las iniciales AG. `CONTACT_SETTINGS.ownerPhoto` permanece vacío hasta disponer de una fotografía real aprobada. El plazo de respuesta también permanece vacío y no reserva espacio. Las FAQ visibles y su JSON-LD proceden de una única fuente traducida. Se conservan canonical y hreflang públicos y la única entidad de empresa.

Kai sigue disponible desde un botón dentro del bloque personal de Contacto. Su botón flotante se oculta únicamente en esta página para que no cubra campos; el asistente y su comportamiento en el resto del sitio se conservan.

## Archivos principales

- `components/KontaktPage.tsx`, `components/contact/contact-page.css`: estructura y diseño.
- `components/home/ApprovedHeader.tsx`, `scripts/render-seo.mjs`: variante de header exclusiva de Contacto, también en el HTML inicial.
- `components/contact/ContactCoverageMap.tsx`, `coverage-geography.ts`, `contact-coverage-map.css`, recursos `public/kraken-contact/` y generador: mapa estático, coordenadas y procedencia.
- `components/contact/ContactMessageForm.tsx`, `contact-form.css`, `src/contact/intake-contract.ts` e `intake-client.ts`: formulario, validación y reintentos.
- `server/contact-intake*.ts`, `server.ts`, `.env.example`: receptor, almacenamiento y acuse opcional.
- `src/contact/contact-copy.ts`, `settings.ts`, `src/seo/{metadata,local-metadata}.ts`: seis idiomas, configuración y FAQ/SEO.
- `components/KaiAssistant.tsx`: acceso contextual sin solapamiento en Contacto.
- `components/Footer.tsx` y `components/App.tsx`: se omite la invitación a visitar la oficina únicamente en Contacto, conservando dirección y enlaces.
- `firestore.rules`: creación de contactos solo desde servidor; gestión del personal conservada.
- `server/security.ts`, `vercel.json` y `components/legal/privacy.ts`: permiso CSP específico para Turnstile y descripción del proveedor en las seis políticas.

La calculadora, tarifas, reservas y Payrexx no cambian. Los recursos antiguos se conservan cuando sirven a código o pruebas heredadas, pero la página nueva no los importa ni descarga.

## Activación pendiente

La preview muestra honestamente el formulario como no disponible. WhatsApp, teléfono, correo y calculadora tienen sus destinos reales. Para activar el receptor hacen falta las claves de un widget Turnstile válido, los dominios permitidos y habilitar la configuración privada usando el acceso Admin de Firebase. El [contrato y las variables](./CONTACT_INTAKE.md) están documentados; no se han creado cuentas o claves ni cambiado la configuración de producción.

El acuse de recibo por Resend es opcional y está desactivado por defecto. Si se habilita, necesita el programador protegido de `/api/contact/maintenance`. No se modifica el cron de reservas ni se contrata un servicio. El registro de la consulta funciona independientemente del correo y nunca se anuncia que un email haya sido entregado.

Las reglas propuestas deben aplicarse junto con el nuevo flujo autorizado para cerrar el acceso directo del navegador. Todavía no se han aplicado a producción.

## Comprobación

- Compilación de producción y TypeScript correctos. Suite general: 441 pruebas, 435 correctas, cero fallos y seis casos omitidos en esa invocación que pasaron aparte en el emulador real de Firestore. Se prueban creación Admin, rechazo de todos los SDK cliente y quince namespaces privados, sin datos ni credenciales de producción.
- Navegador local: escritorio alemán 1536 px, móvil español 390 px, francés 320 px con movimiento reducido y tablet a 768/1024 px. Veinte comprobaciones de diseño/semántica/teclado por tamaño, sin desbordamientos ni marcadores cortados. Logo y descriptor completos, horario visible, formulario antes del mapa en móvil, foco visible, FAQ con Enter y Kai con Escape/retorno de foco.
- Flujo de formulario en navegador con proveedores interceptados: 31 comprobaciones correctas. Código postal incorrecto señalado y enfocado; teléfono opcional y alternativa de email; error 503 conserva valores; cambiar de idioma conserva los siete campos; HTTP 200 sin referencia no anuncia recepción; respuesta aceptada con referencia muestra confirmación y la enfoca. Los tres reintentos usan el mismo identificador y no se duplica el widget. No hay datos del formulario en URLs o almacenamiento persistente.
- HTTP sobre servidor compilado: seis contactos canónicos con FAQ/JSON-LD iguales y una sola empresa, CSP, formulario desactivado honesto, validación, origen, tamaño y mantenimiento protegido. Además, revisión general de 144 páginas canónicas, 18 legales y 735 rutas históricas; sin regresiones.
- No se realizaron pagos, altas, mensajes ni envíos reales. No se han publicado código, reglas ni configuración en producción.

[Captura de escritorio](./qa/contact-redesign-desktop.jpg), [escritorio completo](./qa/contact-redesign-desktop-full.jpg), [móvil completo](./qa/contact-redesign-mobile.jpg), [comprobaciones de navegador](./qa/contact-redesign-browser-2026-11-25.json) y [HTTP de Contacto](./qa/contact-redesign-http-2026-11-25.json).

Reproducción: `npm run build`, `npm run lint`, `npm test`; `node --import tsx scripts/verify-contact-preview.mjs http://127.0.0.1:3031` con receptor local desactivado. La prueba del emulador y los perfiles de navegador se documentan en los informes de Contacto.
