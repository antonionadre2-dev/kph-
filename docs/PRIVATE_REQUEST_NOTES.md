# Notas internas de solicitudes

Las notas nuevas se leen y escriben exclusivamente por personal verificado en `maintenance_request_internal/{requestId}`. La interfaz ya no guarda el historial ni su resumen en el documento que puede leer el cliente. Las escrituras usan una transacción con revisión para evitar sobrescribir otra edición. Un error de lectura bloquea guardar; una escritura fallida conserva el borrador y el historial anterior.

La colección privada requiere las reglas preparadas en `firestore.rules`. Deben publicarse en la base nombrada de la web antes de utilizar esta interfaz. El cliente no recibe permisos sobre esa colección. Los permisos y datos de las reservas del servidor no se modifican.

Solo el personal conserva la lectura de compatibilidad de `teamNotes`, del resumen heredado y de `kraken_team_notes_*` local. No se borra ni cambia automáticamente el almacenamiento local. El propietario puede seguir leyendo los campos antiguos del documento de su solicitud mientras no se migren: este cambio no declara que se haya retirado ya esa exposición histórica.

## Migración explícita

`scripts/migrate-request-notes.ts` no se ejecuta durante build, arranque ni navegación. Por defecto solo lee y prepara un manifiesto, sin escribir en Firestore. Requiere proyecto, base y autenticación explícitos. Fuera de un emulador local demo, exige exactamente el proyecto y la base nombrada de la configuración actual de la web. No busca ni imprime claves. Utiliza una identidad Admin ya autorizada mediante credenciales de aplicación predeterminadas; no crea una identidad ni concede permisos.

Ejemplo de preparación, sustituyendo los argumentos por el destino confirmado:

```sh
node --import tsx scripts/migrate-request-notes.ts --project PROYECTO_CONFIRMADO --database BASE_NOMBRADA_CONFIRMADA --use-application-default --plan /RUTA_PRIVADA/notas-plan.json
```

El manifiesto debe estar fuera del repositorio y se crea con permisos 0600. Contiene identificadores de documentos, tiempos y hashes necesarios para las precondiciones, no textos de notas. No se debe incluir en Git, public, dist ni paquetes de entrega. La salida muestra únicamente conteos.

Después de revisar el resultado y autorizar la migración concreta, el mismo comando con `--apply` aplica únicamente las entradas de ese manifiesto. Cada transacción vuelve a leer ambos documentos y comprueba el `updateTime`, el hash del origen y la ausencia de un historial privado. Copia íntegramente las notas al documento privado y retira `teamNotes` del público en la misma transacción. Retira `notes` únicamente si coincide exactamente con el resumen de ese historial; las instrucciones del cliente se conservan. No sobrescribe notas privadas existentes, no interpreta texto libre y no migra ni borra datos locales del navegador. Los cambios concurrentes abortan esa entrada sin escrituras parciales; se necesita una nueva revisión.

Los textos sin historial estructurado, datos malformados y casos con historial privado previo se señalan para revisión manual. No se borran para forzar una migración completa. Una segunda ejecución de un manifiesto ya aplicado puede informar conflictos; no duplica ni sobrescribe el historial.

La herramienta se ha probado con datos sintéticos y transacciones simuladas. Las reglas se han probado con el emulador Firestore. No se ha ejecutado ninguna migración remota como parte de esta preparación.
