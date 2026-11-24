# Entrega del 24 de noviembre de 2026 — integración local

Referencia: `kraken-codex-todo-ligero-2026-11-24.zip`, variante ligera del código completo aprobado. Se verificaron los 150 archivos declarados en su inventario SHA-256 antes de integrar. La configuración, el router y las dependencias del repositorio real se conservaron y adaptaron; no se sustituyeron por el proyecto de preview.

## Excepción expresa del propietario: conservar el mapa

No se integra `web/kontakt.html`, `contact-page.js`, `contact-page.css` ni el mapa Leaflet/OSRM del paquete. Se conserva íntegramente el Contacto que acabábamos de preparar: mapa vectorial claro, geocodificación suiza, atribuciones, galería y seis idiomas. La comparación antes/después cubre 27 archivos de Contacto/mapa, además de los dos archivos personales preexistentes. Los 29 conservan exactamente sus hashes.

El proveedor de rutas continúa siendo openrouteservice preparado en servidor, pendiente de `CONTACT_ROUTING_API_KEY`, tal como se acordó antes de esta entrega. No se inventan distancias o tiempos cuando falta esa conexión.

## Cambios integrados

- Home conserva la casa, atlas, clima regional, celebraciones, Kai y las mejoras anteriores de Transit. Se añade el recorrido de imágenes tras 30 segundos visibles de inactividad, con un solo ciclo, pausa por interacción y limpieza al salir, abrir un diálogo o desmontar.
- Servicios y About ya contenían las escenas y recursos aprobados. Se conservan sus pestañas sin desplazamiento, visor y mejoras posteriores. Los enlaces comerciales incluyen ahora servicio e idioma también al abrir otra pestaña.
- `/quote` utiliza la nueva calculadora de tres pasos con precios compartidos entre cliente y servidor, CHF enteros, anticipo del 15 %, seis idiomas y validación junto al campo. Mudanzas y casos especiales necesitan revisión individual.
- `/quote-demo` es una demostración identificada, independiente del flujo real y excluida de indexación. No cobra, no envía mensajes y no crea cuentas reales.
- Se integran Journey, guía con descarga HTML e impresión, recuperación y actividad pública verificada. La guía no se presenta como un PDF adjunto a un email.
- Se prepara el acceso opcional mediante enlace Firebase en `/customer-access`, con autorización limitada al email verificado y sesión de navegador. Un token de presupuesto no autentica una cuenta general.
- El backend prepara persistencia Firestore Admin, cola de correo, Payrexx verificado, recuperación y operaciones privadas de aprobación. El endpoint antiguo que aceptaba importes del navegador devuelve `410 BOOKING_CHECKOUT_REQUIRED`.

## Activación pendiente

En este checkout no hay credenciales privadas operativas. La configuración pública informa de reservas, pagos, recuperación y acceso opcional desactivados. El visitante puede calcular y contactar personalmente; no se muestra una compra completada ni un correo enviado sin confirmación real.

Consultar [BOOKING_INTEGRATION.md](BOOKING_INTEGRATION.md) para credenciales Admin, reglas e índices Firestore, Payrexx TEST/webhooks, remitente de correo, recuperación, acceso por email y job privado. Las pruebas locales usan datos sintéticos y adapters controlados; queda pendiente la validación contra los proveedores TEST configurados antes de activar LIVE.

La integración es local para revisión. No se ha publicado ni se ha actualizado el PR existente. No se incluyen `/entrega`, archivos fuente descargables privados, identidad de hosting de la preview ni sus credenciales.

## Verificación

Build de producción correcto y 216 pruebas superadas. La revisión visual cubre 320, 390, 768 y 1440 px, seis idiomas de la calculadora, solicitud/cita/pago de demostración, anticipo y saldo, diálogos anidados con Escape y retorno de foco, movimiento reducido y el ciclo de servicios tras inactividad visible. Se verificó la conservación de los 29 archivos protegidos y 162 registros de integridad.

Los resultados exactos se conservan en la carpeta de entrega de este chat. TypeScript arrastra tres errores previos en `CareersPage.tsx` y `PaymentCelebrationPage.tsx`; deben distinguirse de los módulos nuevos. Los proveedores reales, credenciales y entrega de correo no se validaron en LIVE.
