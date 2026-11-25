# Privacidad del navegador y entradas Firestore

Revisión local del 25 de noviembre de 2026. No se han consultado datos reales ni desplegado reglas.

## Cambios preparados

- `contact_messages`: la creación pública queda limitada a los siete campos del formulario actual. Nombre hasta 150 caracteres, correo hasta 254, asunto hasta 200 y mensaje hasta 5.000; idioma reconocido, estado inicial `new` y fecha `serverTimestamp`. Los mismos máximos están en los controles HTML.
- `b2b_quotes`: la ruta heredada `/commercial-quote` sigue retenida; no se ha cerrado ni se ha exigido una cuenta nueva. Se admiten solo sus campos actuales, tipos y opciones definidos, estado inicial `pending` y fecha del servidor. Los mapas de servicios/protocolos solo admiten sus opciones booleanas. Los planos se limitan a cinco entradas, campos `name/size/content` y suma de longitudes de contenido hasta 750.000. El flujo heredado necesitará adaptar o externalizar adjuntos mayores antes de superar ese límite.
- Las lecturas, actualizaciones y eliminaciones de esas dos colecciones siguen requiriendo personal autorizado. No se tocaron las colecciones de reservas o pagos. Las bibliotecas de servidor con Admin SDK mantienen su validación propia: las reglas de cliente no sustituyen esa validación.
- `DetailInspectorModal` deja de escribir notas y nombre de autor en `localStorage`. Las notas nuevas se mantienen en memoria y se guardan mediante su escritura Firestore existente; un fallo de sincronización deja de anunciar éxito.

## Retención observada

El carrito anónimo usa una lista permitida de opciones de servicio y caduca a las 24 horas sin renovar al leer. Los datos de contacto del calculador permanecen en memoria; el borrador local se limpia tras una respuesta válida al envío. Dashboard elimina el historial de correo y estados de confirmación del navegador al cambiar la identidad.

Los tokens de acceso a reserva/recuperación permanecen en `sessionStorage`, separados de los datos de contacto. Este cambio no los borra al abrir el pago ni añade una caducidad que pueda cortar accesos existentes. El servidor debe seguir validándolos.

Las notas locales históricas `kraken_team_notes_*` pueden ser la única copia cuando falló una sincronización anterior. No se borraron ni se migraron automáticamente. La lectura de compatibilidad de esas notas sigue presente; su exportación y eliminación, junto con `kraken_last_author`, quedan pendientes de una política del propietario. Los campos de notas internas compartidos en el documento de un encargo también necesitan revisar su modelo de acceso si deben quedar ocultos al cliente: una regla de lectura del documento completo no oculta campos individuales.

## Límites y comprobación pendiente

La creación anónima se mantiene para no romper formularios públicos. Estas reglas limitan forma y tamaño, pero no son un mecanismo de limitación por IP, CAPTCHA o App Check. El propietario debe decidir si conserva el flujo comercial heredado y cómo controla el abuso de las entradas públicas.

Existe una prueba de integración real con datos sintéticos en `tests/firestore-public-rules.test.mjs`: documentos válidos; inyección de estado/pago/permisos; campos desconocidos; mensajes/adjuntos grandes; tipos erróneos y lectura anónima. Está omitida cuando no hay un emulador local. En este equipo existe el JAR, pero `java -version` informa que falta Java Runtime. No se afirma que estas reglas estén compiladas o verificadas por el emulador.

Con un JDK compatible y Firebase CLI, ejecutar desde el repositorio:

```sh
npx firebase-tools emulators:exec --only firestore --project demo-kraken-rules-audit --config tests/fixtures/firebase-rules-emulator.json 'node --import tsx --test tests/firestore-public-rules.test.mjs'
```

La configuración apunta únicamente a `127.0.0.1:8189` y al proyecto de demostración; no necesita credenciales de producción. Las reglas deben superar esta prueba antes de plantear un despliegue, que no se ha realizado.

Referencias oficiales: [validación de campos](https://firebase.google.com/docs/firestore/security/rules-fields), [condiciones y Admin SDK](https://firebase.google.com/docs/firestore/security/rules-conditions), [pruebas con emulador](https://firebase.google.com/docs/firestore/security/test-rules-emulator).
