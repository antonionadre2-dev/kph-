# Actualización de condiciones de Kraken PFM

> Actualización posterior: los anticipos y plazos señalados en este informe inicial ya se han alineado para las nuevas reservas. Consulte la [corrección financiera y sus pruebas](PAYMENT_TERMS_ALIGNMENT_2026-11-27.md). Las reservas históricas conservan sus condiciones e importes. La nueva revisión continúa en preview.

27 de noviembre de 2026 · Rama `codex/agb-update-2026-11-27`

**Resultado: implementación preparada para revisión local. No se ha publicado esta versión en producción.** Quedan incompatibilidades concretas entre la nueva cláusula 4 y el funcionamiento financiero existente. Se documentan abajo y no se han corregido alterando importes, tarifas, fórmulas o Payrexx, conforme al alcance autorizado.

## Preview y capturas

- [Preview alemana](http://127.0.0.1:3051/terms?lang=de).
- [Preview española](http://127.0.0.1:3051/es/terms).
- [Alemán, 375 px](qa/agb-2026-11-27/capturas/terms-de-375.jpg).
- [Alemán, 1280 px](qa/agb-2026-11-27/capturas/terms-de-1280.jpg).
- [Español, 375 px](qa/agb-2026-11-27/capturas/terms-es-375.jpg).
- [Español, 1280 px](qa/agb-2026-11-27/capturas/terms-es-1280.jpg).

La preview requiere que siga funcionando el servidor local. Estas direcciones no son una publicación pública.

## Cambios implementados

### Documento y página

`/terms` utiliza componentes reales: panel navy, herramientas de impresión y descarga, accesos a las cláusulas 4, 7 y 9, índice por grupos, búsqueda local y superficie continua de lectura. El documento mantiene sus 17 apartados visibles; la búsqueda no los sustituye ni los filtra. Los identificadores estables van de `#agb-1` a `#agb-17`. El índice móvil es desplegable y los enlaces trasladan el foco al título correspondiente.

Se conserva el logo original, la navegación, el selector de idioma, la calculadora y el footer. No se marca Contacto como activo en esta página. Se han preparado los textos y herramientas en alemán, inglés, español, portugués, italiano y francés, con aviso y enlace a la versión alemana en las cinco traducciones. La fecha visible es el 26 de noviembre de 2026; la versión técnica no sustituye esa fecha.

### Coherencia del contenido público

- Viviendas de hasta 5,5 habitaciones en las seis lenguas, sin cambiar cálculos ni tarifas.
- Catálogo de seis servicios, incluida la limpieza de fin de obra, con acceso al flujo existente de la calculadora. Se eliminan las afirmaciones de «cinco servicios».
- Antonio realiza el trabajo y puede recurrir a ayudantes cuando sea necesario. Se sustituyen las afirmaciones de un equipo permanente o experimentado.
- Se retiran bloques, sellos y promesas de seguro del contenido comercial actual. La cláusula 12 de responsabilidad se conserva íntegra. Kai responde a la consulta de seguro con la frase localizada equivalente a «Das klären wir gern persönlich» y la tarjeta de contacto.
- La garantía, el pago, la cancelación, los cambios de fecha, la preparación y los materiales se obtienen de la misma fuente legal generada. La garantía conserva sus límites: limpieza de mudanza a precio cerrado, trabajo confirmado, entrega dentro de 72 horas, vivienda sin uso posterior, aviso escrito dentro de 24 horas de la entrega, acceso y corrección normalmente dentro de 48 horas según coordinación, además de las exclusiones completas y enlace a la cláusula 9.
- Las FAQ públicas, las páginas regionales, los textos de Kai, la calculadora y las confirmaciones comparten esa fuente. No se importa el documento completo de 17 apartados en la portada para mostrar una respuesta breve.
- Se distinguen solicitud recibida, contrato confirmado y pago recibido. Las confirmaciones utilizan los datos de la reserva: servicio, alcance, precio, fecha y hora, anticipo, vencimiento, materiales y referencia a las condiciones aceptadas.

La búsqueda de expresiones obsoletas en el contenido vigente quedó sin coincidencias. Se preservaron las coincidencias históricas necesarias y las pruebas legítimas; no se borraron documentos ni pruebas para ocultarlas.

## Versión, integridad y aceptación

**Nueva versión interna:** `kraken-agb-2026-11-26-v2`.

El [original alemán extraído](qa/agb-2026-11-27/AGB_DE-original.md) reproduce literalmente el bloque facilitado, con los 17 apartados. Su SHA-256 es:

```text
20a0f536da4c7f7a0605cf67c5aaa520a20c245c8315944b2661584eb5e07cac
```

El SHA-256 del documento canónico alemán serializado en JSON es diferente porque incluye su estructura de datos:

```text
b1f8919dceeb2c5d0cb514108b0139ad78be39c5e011f218888616d59b54fbbb
```

Los hashes por idioma, las rutas al JSON y los PDF inmutables están en [el manifiesto](qa/agb-2026-11-27/worktree/src/legal/terms-manifest.json). El HTML, las políticas compartidas y los PDF se generan desde las mismas fuentes canónicas. Hay **cuatro versiones canónicas en total: tres históricas y la nueva**, con seis idiomas cada una y **24 PDF**. También se conserva la instantánea inicial necesaria para interpretar registros antiguos, sin presentarla como una quinta versión canónica publicada.

Para las nuevas solicitudes, el servidor valida la versión y el documento mostrado y registra `termsAcceptance`: versión, fecha de aceptación del reloj del servidor, idioma mostrado, idioma de la fuente, SHA-256 del documento aceptado, SHA-256 alemán y rutas inmutables al documento y PDF. Los campos equivalentes antiguos se mantienen por compatibilidad. Un hash o una fecha arbitrarios enviados por el navegador no se convierten en prueba de aceptación.

La casilla empieza desmarcada. El enlace abre las condiciones en otra pestaña y conserva el idioma. Si cambia la versión o el idioma mostrado, se exige una nueva aceptación, conservando los datos introducidos. Las reservas antiguas conservan su versión y sus datos registrados; no se les atribuye automáticamente la versión nueva, ni se inventan hashes o idiomas aceptados que no estén registrados.

## Comprobaciones y evidencia

| Comprobación | Resultado y evidencia |
| --- | --- |
| Suite completa | **675 pruebas: 669 aprobadas, 6 omitidas, 0 fallos**. Las seis omitidas requieren los emuladores de Firestore. [Registro](qa/agb-2026-11-27/tests-full-final.log). |
| TypeScript | Aprobado, sin errores de tipos. [Registro](qa/agb-2026-11-27/typecheck-final.log). |
| Build | Build de producción completado. [Registro](qa/agb-2026-11-27/build-final.log). Últimos ajustes móviles, enlace alemán e impresión reconstruidos y comprobados. |
| Fuente alemana y traducciones | 17 apartados, bloques, listas, cifras y plazos comprobados; numeración sin duplicados y aviso de prevalencia alemana. Pruebas de documento, presentación, interfaz y consistencia pública incluidas en la suite. |
| Navegador | Índice, búsqueda, resultado y foco en `#agb-9`, ausencia de resultados, limpieza de consulta, teclado, movimiento reducido y descarga real. [Evidencia de interacciones](qa/agb-2026-11-27/qa/browser-interactions.json). |
| Adaptación | Sin desbordamiento horizontal en las comprobaciones de 320, 375 y 1280 px; alemán y español en las cuatro capturas solicitadas. [Mediciones](qa/agb-2026-11-27/qa/browser-responsive.json). |
| Calculadora | La navegación desde Home a fin de obra selecciona `construction`. Casilla inicialmente desmarcada; pasar de ES a FR retira la aceptación y conserva el paso y los datos de la prueba local. No se creó una reserva real. [Evidencia](qa/agb-2026-11-27/qa/browser-interactions.json). |
| PDF descargable | Los 24 PDF contienen texto seleccionable y todos sus bloques canónicos; comprobación de márgenes A4 y reconstrucción con bytes idénticos. La descarga real del PDF español coincide byte a byte con el archivo canónico. [Texto y geometría](qa/agb-2026-11-27/qa/pdf/text-verification.json), [reconstrucción](qa/agb-2026-11-27/qa/pdf/rebuild-verification.json), [descarga](qa/agb-2026-11-27/qa/pdf/print-verification.json). |
| Impresión del navegador | El PDF de impresión español incluye los 17 apartados y 106 bloques en 7 páginas, sin texto fuera de los márgenes. Verificación visual final aprobada: enlace de salto y controles ocultos, sin superposiciones. El botón Imprimir abrió la vista nativa de siete páginas; se canceló sin imprimir ni guardar. [PDF](qa/agb-2026-11-27/qa/print-preview-es.pdf), [verificación](qa/agb-2026-11-27/qa/pdf/print-verification.json). |
| Emails | [Galería local de 30 muestras sintéticas](qa/agb-2026-11-27/qa/emails/index.html): seis idiomas por cinco variantes de renderizado. [Control](qa/agb-2026-11-27/qa/emails/verification.json). No se enviaron correos reales, no se crearon reservas y no se realizaron cobros. |
| Contenido obsoleto | [Búsqueda final](qa/agb-2026-11-27/consistency-current-copy-scan.log) sin coincidencias en el contenido público vigente; preservadas las fuentes y pruebas históricas. |

Las reglas de cancelación se comprueban por separado de la reprogramación: exactamente 48 horas es gratuito; menos de 48 y hasta 12 horas implica 50 %; menos de 12 horas o incomparecencia implica 100 %. La cláusula 7.3 conserva sus reglas diferentes para cambios de fecha.

## Incompatibilidades financieras pendientes

La nueva cláusula 4.1 exige calcular el anticipo del trabajo por horas sobre el mínimo aplicable, incluida la llegada. El motor actual utiliza en estos ejemplos el importe total seleccionado. Los siguientes importes se han comparado sin extras y **no se han modificado**:

| Ejemplo | Total actual | Base mínima de la cláusula 4.1 | Anticipo que calcula hoy el sistema | Anticipo según el nuevo texto |
| --- | ---: | ---: | ---: | ---: |
| Limpieza regular semanal: 4 h × CHF 40 | CHF 160 | 2,5 h = CHF 100 | CHF 24 | CHF 15 |
| Fin de alquiler por horas: 4 h × CHF 45 | CHF 180 | 3 h = CHF 135 | CHF 27 | CHF 20,25 |
| Fin de obra por horas: 5 h × CHF 48 | CHF 240 | 4 h = CHF 192 | CHF 36 | CHF 28,80 |

La causa concreta está en `src/booking/pricing.ts`: si el servicio no proporciona una base de anticipo específica, se usa `totalCents`. `server/booking.ts` aplica el 15 % a esa base. El servicio de mudanza por horas sí dispone de una base mínima específica; no se atribuye el problema de estos ejemplos a todos los servicios.

Hay otras dos diferencias de funcionamiento:

1. **Plazo de confirmación:** el panel de operaciones propone retener el turno durante 120 minutos; admite opciones de 30 minutos, 2 horas, 1 día o 7 días. La nueva cláusula dice tres días desde la confirmación, con pago antes de comenzar. `components/BookingOperationsPanel.tsx` y `server/booking.ts` no alinean automáticamente ese plazo.
2. **Enlace de pago:** el checkout caduca a los 30 minutos o al terminar la retención, lo que ocurra antes. Al intentar reutilizar un checkout ya caducado, `server/booking.ts` devuelve `CHECKOUT_EXPIRED`; no lo renueva automáticamente. Por ejemplo, un enlace emitido a las 10:05 vence a las 10:35 aunque el turno continúe retenido durante tres días. Volver a las 11:00 requiere intervención o reconciliación operativa. La caducidad de un enlace corto puede ser válida, pero falta un camino funcional de renovación para abonar dentro del plazo anunciado.

[Comparación financiera local](qa/agb-2026-11-27/qa/payment-compatibility.json). Estas diferencias requieren una decisión y un cambio financiero explícitos antes de publicar las nuevas condiciones como aplicables. No se han alterado silenciosamente importes, tarifas, estados de pago, checkout ni funcionamiento de Payrexx en este encargo.

## Archivos entregados

El [inventario completo](qa/agb-2026-11-27/ARCHIVOS-CAMBIADOS.txt) incluye los archivos modificados y nuevos de la rama, con rutas relativas a `worktree/`. No incluye dependencias ni datos privados. Las principales áreas son:

| Área | Archivos o directorios |
| --- | --- |
| Página legal | `components/TermsPage.tsx`, `components/legal/terms-page.css`, `components/legal/terms.ts`, `components/legal/terms-legacy.ts`. |
| Fuentes, registro e integridad | `src/legal/terms-document.ts`, `terms-version.ts`, `terms-registry.ts`, `terms-manifest.json`, `terms-tools.ts`, `terms-policy.ts`, `terms-policy.generated.json`, `src/legal/versions/`. |
| Generadores | `scripts/build-terms-manifest.mjs`, `build-terms-pdfs.mjs`, `generate-terms-policy.mjs`; integración con los scripts existentes de renderizado. |
| Reserva y confirmación | `components/ServiceCalculatorPage.tsx`, `components/BookingTermsSummary.tsx`, `src/booking/terms.ts`, `src/booking/termsPresentation.ts`, `server/booking.ts`, `server/booking-email.ts`, `server/customer-notifications.ts`, `integrations/email-collection/render.mjs`. Los cambios de servidor se limitan a aceptación y presentación; no alteran la lógica financiera. |
| Coherencia pública | Componentes de Home, Servicios, About, footer, páginas de fin de alquiler y regionales; diccionarios de los seis idiomas, contenido y metadatos afectados. |
| Kai | `src/kai/facts.ts`, `src/kai/policyContent.ts`, `server/kaiAssistant.ts`, `kaiKnowledge.ts`, `kaiReplies.ts`, `kaiPricing.ts`, `kaiGemini.ts`: contenido y fuentes legales, sin cambio de tarifas. |
| PDFs y JSON públicos | `public/legal/terms/<version>/<idioma>.pdf` y `.json`, además de `pdf-manifest.json`: 24 PDF y sus documentos canónicos. |
| Pruebas | Nuevas pruebas `terms-*` de documento, aceptación, presentación, búsqueda, interfaz y coherencia; actualización de las pruebas afectadas, conservando los fixtures y hashes históricos. |

La producción permanece en su versión publicada anterior. La entrega está lista para revisar el diseño, el documento, las traducciones, la trazabilidad y las confirmaciones en local. La publicación queda pendiente de resolver explícitamente las diferencias financieras.

El enlace a la versión alemana cambia explícitamente el idioma mediante el selector existente, incluso con una preferencia española guardada. Las cuatro capturas finales contienen el idioma y los 17 apartados verificados; el título alemán conserva su texto literal con un corte tipográfico de palabra en móvil.
