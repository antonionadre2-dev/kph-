# Kai: corrección de conversación y traspaso

## Diagnóstico anterior a los cambios

El 26 de noviembre se consultó la configuración de **kpfm / Production** por nombre de variable, sin obtener ni mostrar valores privados. No existe GEMINI_API_KEY ni un flag que active otro proveedor. Una petición de saludo sin datos personales a /api/kai/assist devolvió HTTP 200, mode guided y ningún error. La implementación sale al modo guiado cuando no hay proveedor; no era un error del modelo ocultado en esta prueba.

Había además una decisión independiente en el código: todas las preguntas de precio evitaban el modelo y remitían al calculador. El extractor admitía 3.5 como fecha, no tenía superficie estructurada y podía reemplazar una limpieza de fin de alquiler al mencionar ventanas.

## Resultado

- Extracción común para guiado e IA: superficie, horas, habitaciones decimales, baños, códigos postales, ciudades normalizadas, fechas ISO futuras con calendario de Zúrich y prioridades. Las preguntas y quejas no se guardan como notas.
- El servicio elegido se conserva al mencionar elementos de su alcance. Las correcciones explícitas sí permiten cambiarlo. Cantidades, extras y negaciones se trasladan sin convertir «sin horno» en un suplemento.
- Los importes se obtienen de calculatePrice y del mismo traspaso de campos que utiliza la calculadora. Las tarifas no cambian. Un precio «desde» no se convierte en una promesa de alcance o de disponibilidad.
- Las respuestas de política, IVA, cobertura y alcance proceden de una fuente pública común con las FAQ y los textos contractuales. Las condiciones existentes se conservan; su reproducción no equivale a nueva revisión legal.
- Las peticiones de persona, quejas y trabajos fuera del alcance muestran contacto directo. El chat no envía solicitudes, concede descuentos, cobra ni reserva fechas.
- El idioma de la conversación sigue al visitante. El idioma de la página se conserva hasta que el visitante decide pasar al calculador.
- El lanzador aparece desde el inicio y se separa de la barra móvil de precio. Enter envía, Shift+Enter añade línea, y la composición IME no envía accidentalmente. Se conserva aria-live, foco, cierre y movimiento reducido.

## IA preparada, todavía sin activar

Se conserva el proveedor Gemini instalado. Solo el servidor puede usar su clave. El adaptador permite dos herramientas de lectura: precio calculado del borrador y hechos aprobados. El modelo no recibe capacidad de reservar, enviar, modificar tarifas o ejecutar pagos. La autoridad de precios y la siguiente pregunta siguen en el servidor.

La respuesta vuelve al modo guiado si el proveedor falla o supera ocho segundos. El cliente no presenta ese respaldo útil como un fallo. Se mantienen el límite por IP en memoria del proceso, los límites de tamaño y la ausencia de registro de mensajes personales. El límite en memoria no es una cuota global distribuida entre instancias.

Para activar y verificar IA real faltan una GEMINI_API_KEY válida exclusivamente en servidor y comprobar modelo permitido, cuota y facturación de esa cuenta. No se ha creado una cuenta, contratado un proveedor, añadido claves ni realizado una llamada real de IA. Los tests de proveedor inyectado y de protocolo son simulaciones sin cargos.

## Validación y entrega

Los 17 casos del documento tienen pruebas automáticas, tanto sin clave como con una frontera de proveedor inyectado. También hay regresiones para cambio de año, fechas después de habitaciones decimales, cantidades inválidas, seis idiomas, extras, negaciones, llamadas de herramientas, timeout, límites y traspaso.

La revisión visual incluye saludo, precio, contacto y traspaso a **375 y 1280 px**. Se verificó en navegador que 3.5 habitaciones y 85 m² llegan a sus controles y producen CHF 690, y que la conversación española pasa a /es/offerte desde una página alemana.

Los pendientes de contenido del propietario están en [KAI_CONTENT_TODO_2026-11-26.md](KAI_CONTENT_TODO_2026-11-26.md): aseguradora/capital, personas asignadas, disponibilidad, duración, límites exactos de cancelación y confirmación operativa de la garantía publicada.

Payrexx, los webhooks, las credenciales, las tarifas, las reservas existentes y el flujo de pago no se modifican en esta revisión. Su comprobación externa pendiente se retoma aparte.
