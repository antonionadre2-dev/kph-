# Privacidad del navegador y entradas Firestore

Revisión local del 25 de noviembre de 2026. No se han consultado datos reales ni desplegado reglas.

## Cambios preparados

- `contact_messages`: la revisión de Contacto sustituye la creación pública del navegador por el receptor del servidor. `allow create: false` bloquea cualquier SDK cliente, incluido personal, para no poder saltarse Turnstile, límites y deduplicación. Admin registra las consultas tras validar los siete campos y asigna una referencia; el personal verificado conserva lectura, actualización y eliminación. El nombre y mensaje se limitan a 100 y 4.000 caracteres, teléfono opcional, canal/servicio permitidos y código postal suizo. El asunto es calculado por el servidor, no libre. Véase [CONTACT_INTAKE.md](./CONTACT_INTAKE.md).
- `b2b_quotes`: la ruta heredada `/commercial-quote` sigue retenida; no se ha cerrado ni se ha exigido una cuenta nueva. Se admiten solo sus campos actuales, tipos y opciones definidos, estado inicial `pending` y fecha del servidor. Los mapas de servicios/protocolos solo admiten sus opciones booleanas. Los planos se limitan a cinco entradas, campos `name/size/content` y suma de longitudes de contenido hasta 750.000. El flujo heredado necesitará adaptar o externalizar adjuntos mayores antes de superar ese límite.
- Las lecturas, actualizaciones y eliminaciones de esas dos colecciones siguen requiriendo personal autorizado. No se tocaron las colecciones de reservas o pagos. Las bibliotecas de servidor con Admin SDK mantienen su validación propia: las reglas de cliente no sustituyen esa validación.
- `job_applications`: la creación permite únicamente los 19 campos reales del formulario, incluido `cvUrl`; no admite notas internas ni campos de privilegios. Se conservan los campos opcionales y las validaciones obligatorias. Las pruebas incluyen el formulario completo e inyección de notas, permisos y estado.
- `DetailInspectorModal` deja de escribir notas y nombre de autor en `localStorage`. Las notas nuevas se mantienen en memoria y se guardan mediante su escritura Firestore existente; un fallo de sincronización deja de anunciar éxito.

## Retención observada

El carrito anónimo usa una lista permitida de opciones de servicio y caduca a las 24 horas sin renovar al leer. Los datos de contacto del calculador permanecen en memoria; el borrador local se limpia tras una respuesta válida al envío. Dashboard elimina el historial de correo y estados de confirmación del navegador al cambiar la identidad.

Los tokens de acceso a reserva/recuperación permanecen en `sessionStorage`, separados de los datos de contacto. Este cambio no los borra al abrir el pago ni añade una caducidad que pueda cortar accesos existentes. El servidor debe seguir validándolos.

Las notas locales históricas `kraken_team_notes_*` pueden ser la única copia cuando falló una sincronización anterior. No se borraron ni se migraron automáticamente. La lectura de compatibilidad de esas notas sigue presente; su exportación y eliminación, junto con `kraken_last_author`, quedan pendientes de una política del propietario. Los campos de notas internas compartidos en el documento de un encargo también necesitan revisar su modelo de acceso si deben quedar ocultos al cliente: una regla de lectura del documento completo no oculta campos individuales.

## Límites y comprobación pendiente

La creación anónima se mantiene solo en `b2b_quotes` para conservar el formulario comercial heredado. Sus reglas limitan forma y tamaño, pero no sustituyen una protección por IP, CAPTCHA o App Check. Contacto ya utiliza validación y protección del lado del servidor, con el acceso de creación del navegador cerrado. El propietario debe decidir si conserva el flujo comercial heredado y cómo controla su abuso.

La prueba de integración real en `tests/firestore-public-rules.test.mjs` pasó sus **seis casos** en el emulador local el 25 de noviembre de 2026, con datos e identidades sintéticos. Comprueba formularios válidos; inyección de estado/pago/permisos; campos desconocidos; mensajes y adjuntos grandes; tipos; lectura, consultas, edición y borrado por propietario, terceros y personal; correo no verificado; administradores mediante claim; y rechazo de todo acceso de navegador a los quince namespaces reales de reservas, recuperación, pagos, contacto, actividad y outbox.

La pasada definitiva del rediseño usa un seed administrativo REST restringido a localhost y al proyecto demo; no descubre credenciales externas. Todos los SDK de navegador tienen prohibida la creación directa de contactos.

La ejecución anterior encontró y corrigió un exceso del límite de evaluación de expresiones de Firestore al enviar cinco planos válidos. Se simplificó la validación sin ampliar campos, tipos, cantidad ni tamaño permitido. Se verifica tanto el caso válido de cinco archivos como el límite acumulado de 750.000 caracteres. La configuración se trasladó a la raíz para que Firebase CLI pueda resolver las reglas dentro del proyecto.

Se utilizó temporalmente Eclipse Temurin JRE 21.0.13.1+2, descargado del proveedor y con SHA-256 verificado, sin cambiar la configuración global de Java. El comando reproducible, con Java 21 y Firebase CLI disponibles, es:

```sh
npx firebase-tools emulators:exec --only firestore --project demo-kraken-rules-audit --config firebase.rules-emulator.json 'node --import tsx --test tests/firestore-public-rules.test.mjs'
```

La configuración apunta a `127.0.0.1:8189` y al proyecto de demostración. No se usaron credenciales ni documentos reales. El emulador se detuvo al terminar. Las reglas **no se han aplicado a producción**: todavía hay que comprobar cuentas de personal y compatibilidad con documentos existentes antes de un despliegue autorizado.

Referencias oficiales: [validación de campos](https://firebase.google.com/docs/firestore/security/rules-fields), [condiciones y Admin SDK](https://firebase.google.com/docs/firestore/security/rules-conditions), [pruebas con emulador](https://firebase.google.com/docs/firestore/security/test-rules-emulator).
