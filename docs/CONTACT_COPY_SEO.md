# Fuente de textos y SEO del contacto

El rediseño de `/kontakt` utiliza `src/contact/contact-copy.ts`. `getContactCopy(language)` devuelve las secciones `hero`, `map`, `person`, `form`, `faqTitle`, `faqs` y `meta` para alemán suizo, inglés, español, francés, italiano y portugués. Acepta variantes regionales del idioma y usa alemán para entradas desconocidas.

El teléfono es opcional. `form.phoneRequired` es un aviso sobre el contacto por correo cuando se elige teléfono o WhatsApp sin número; no exige rellenar el campo. Los textos de error no afirman que la consulta no haya llegado. El texto de éxito solo corresponde a una consulta registrada de forma duradera con una referencia, sin confirmar servicio, reserva, pago ni fecha.

`src/contact/settings.ts` mantiene `CONTACT_SETTINGS.responseTime` vacío. La interfaz solo debe mostrar `getContactResponseTime(language)` si contiene texto confirmado por el propietario; no se debe reservar un hueco ni mostrar un guion. No existe una promesa de plazo por defecto.

El nombre público es Antonio Gomes, con las iniciales AG mientras no exista una fotografía real aportada por el propietario. El descriptor de marca del header se conserva sin traducir. Los seis idiomas de la interfaz no constituyen una afirmación sobre idiomas de atención humana.

`src/seo/local-metadata.ts` obtiene título, descripción y H1 de esa misma fuente. `src/seo/metadata.ts` mantiene `ContactPage`, reutiliza la única entidad `LocalBusiness` del grafo existente y genera `FAQPage` a partir de `getContactCopy(language).faqs`. La interfaz debe mostrar íntegramente esas mismas cinco preguntas y respuestas. Se conservan las URLs canónicas públicas y los siete enlaces alternativos existentes, sin copiar restricciones de una preview.

Las comprobaciones específicas están en `tests/contact-page-copy.test.ts`. Esta documentación describe el código local; no implica que se haya publicado el sitio ni configurado la recepción de mensajes.

## Acceso Firestore del nuevo formulario

`contact_messages` ya no permite creación desde ningún SDK de navegador, tampoco con una identidad de personal. La API de contacto realiza la validación y el registro mediante el Admin SDK del servidor. Se conservan las lecturas, actualizaciones y eliminaciones del personal autorizado. Las colecciones `kraken_contact_idempotency`, `kraken_contact_rates` y `kraken_contact_outbox` permanecen bajo la denegación general de las reglas de cliente.

El 25 de noviembre de 2026 pasaron los seis casos reales de `tests/firestore-public-rules.test.mjs` contra el emulador de Firestore en `127.0.0.1:8189`, proyecto `demo-kraken-rules-audit`, con datos sintéticos. Las consultas de contacto para comprobar acceso del personal se preparan mediante REST privilegiado del propio emulador (`Authorization: Bearer owner`), limitado expresamente a localhost y al proyecto demo; no se consultan credenciales reales. Se verifican el rechazo de creación por visitantes, clientes y personal, los permisos de gestión y los quince namespaces privados de servidor. Estas pruebas de reglas no verifican por sí solas la deduplicación de la API ni los envíos de correo.

El registro de ejecución está en la carpeta de entregables `outputs/contact-redesign-2026-11-25/firestore-emulator.log` del chat. El JRE temporal se verificó mediante SHA-256 y se eliminó al terminar; el emulador quedó detenido. No se han desplegado las reglas en producción.
