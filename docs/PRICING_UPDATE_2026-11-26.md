# Tarifas de limpieza y mudanza — 26/11/2026

Implementación para revisión sobre `codex/customer-payment-p0-2026-11-26` (`a0591e6`). No se publica esta rama, no se cambian credenciales o ajustes de Payrexx y no se crean pagos o correos externos durante la comprobación.

## Fuente de precios

[src/booking/pricingConfig.ts](../src/booking/pricingConfig.ts) contiene las tarifas, extras, mínimos, límites por habitación, reglas de mudanza y `vat: { registered: false, rate: 0.081 }`. Los importes se expresan en céntimos de CHF. [pricing.ts](../src/booking/pricing.ts) calcula los precios tanto para el cliente como para el servidor; las tablas y los datos estructurados consumen esa misma configuración y motor.

El servidor recalcula cada solicitud y rechaza un total o una versión de precios distintos (`PRICE_CHANGED`, 409). No acepta importes o descuentos calculados por el navegador. Las reservas existentes conservan sus importes, anticipo y condiciones aceptadas; no se recalculan al leerlas o al abrir Payrexx.

## Reglas implementadas

- Fin de alquiler: habitaciones determinan el tramo; topes de 50/75/100/125/150 m². El exceso se redondea hacia arriba, se cobra a CHF 6/m² y se limita al siguiente precio base antes de añadir extras. Más de 20 m² de exceso o más de 5,5 habitaciones requiere oferta personal. En el último tramo no existe un siguiente precio base: se siguen los ejemplos aprobados, hasta CHF 1.110 a 170 m².
- Mudanza por horas: una persona y furgoneta a CHF 95/h, mínimo dos horas; dos personas a CHF 145/h, mínimo tres. Ayudante adicional a CHF 50/h y desplazamiento de CHF 60 por encargo. La duración facturable se redondea al siguiente cuarto de hora después del mínimo. El importe visible se identifica como estimación, no precio fijo.
- El anticipo sigue siendo del 15 %. En mudanzas por horas se aplica al mínimo del equipo y ayudantes, incluido el desplazamiento; el total estimado no aumenta esa base. En el combinado se incorpora la limpieza y se descuenta el descuento del conjunto.
- Mudanza fija: CHF 540 hasta 1,5 habitaciones; CHF 790 hasta 2,5. Hasta 3,5 se muestra «desde CHF 1.150», con fotos o visita para confirmar y sin pago inmediato. Distancia superior a 20 km, cuatro habitaciones o más, piano, caja fuerte o elevador de muebles requiere oferta personal. Una distancia desconocida también requiere revisión; no se inventa una ruta.
- Extras fijos: plantas por encima de la primera sin ascensor, por dirección; armarios grandes, retirada en m³ y cajas según la configuración. Montar cama y mesa está incluido.
- Combinado: se añade explícitamente la limpieza de la misma vivienda de origen, con el mismo número de habitaciones hasta 3,5. El cliente debe confirmar esa coincidencia; se impiden descuentos sin una limpieza válida. CHF 60 hasta 2,5 habitaciones o CHF 100 hasta 3,5.
- Limpieza regular: todas las frecuencias mantienen sus tarifas y mínimo de 2,5 h. La limpieza profunda se identifica por separado (`cleaningKind: 'deep'`), a CHF 44/h y mínimo de 3 h. Se conserva el significado anterior de las selecciones antiguas sin esa distinción.

## Textos, IVA y páginas públicas

Los seis idiomas muestran la distinción entre importe fijo, orientativo, «desde» y personal. No se añade IVA ni una línea numérica de IVA. Se retiran las comparaciones hipotéticas y se muestra «Endpreis – keine MwSt.» o su traducción junto al total y las tablas. AGB e Impressum incorporan el estado de IVA y el umbral de facturación solicitado por el propietario.

Las condiciones explican las nuevas modalidades sin modificar las cláusulas de cancelación, garantía o vencimiento de facturas. Se añade la versión `kraken-2026-11-26-pricing-moving`, conservando las aceptaciones anteriores.

Se actualizan las páginas reales de fin de alquiler y mudanza por ciudad, `/leistungen`, las tarjetas de precios, metadescripciones, `Offer` y `priceRange`. El precio provisional de CHF 1.150 no se publica como una oferta de precio cerrado. Se conservan las rutas existentes. No se envían solicitudes de indexación con este cambio.

Los borradores y la recuperación guardan las nuevas cantidades, incluida la limpieza combinada, pero no importes, descuentos, consentimiento ni datos personales en el borrador persistente. Una transferencia de inventario desde Kai no inventa una duración o modalidad de mudanza.

## Verificación

- Suite completa: **543 pruebas, 537 aprobadas, 6 omitidas, 0 fallidas**. Las seis omitidas son las pruebas existentes de reglas cliente de Firestore con emulador; no se presentan como aprobadas.
- Compilación y TypeScript correctos; verificación del servidor compilado bajo Node sin TypeScript.
- Todos los casos de precio del documento se contrastan en [pricing-tariff-2026-11-26.test.ts](../tests/pricing-tariff-2026-11-26.test.ts), además de redondeo, topes antes de extras, manipulación de totales, descuentos inválidos, reservas históricas y bloqueo de pago de ofertas provisionales.
- Navegador sobre el build compilado: **30 comprobaciones aprobadas** de selección, importes, anticipo, escaleras, combinado, recuperación del borrador, precio «desde», distancia desconocida y superior a 20 km.
- Sin desbordamiento horizontal en las 12 capturas a 375/768/1280 px. Mudanza adicionalmente comprobada a 320 px en los seis idiomas; tablas de servicios comprobadas a 375 px.
- Sin solicitudes, correos ni pagos reales durante esas pruebas. La comprobación externa de Payrexx TEST de la tarea anterior sigue pendiente del acceso legítimo a la cuenta; este cambio no la sustituye.

Resultados de navegador: [verification.json](qa/pricing-moving-2026-11-26/verification.json).

| Idioma | Servicio | 375 px | 768 px | 1280 px |
| --- | --- | --- | --- | --- |
| Alemán | Fin de alquiler | [Imagen](qa/pricing-moving-2026-11-26/end-de-375.png) | [Imagen](qa/pricing-moving-2026-11-26/end-de-768.png) | [Imagen](qa/pricing-moving-2026-11-26/end-de-1280.png) |
| Alemán | Mudanza | [Imagen](qa/pricing-moving-2026-11-26/moving-de-375.png) | [Imagen](qa/pricing-moving-2026-11-26/moving-de-768.png) | [Imagen](qa/pricing-moving-2026-11-26/moving-de-1280.png) |
| Español | Fin de alquiler | [Imagen](qa/pricing-moving-2026-11-26/end-es-375.png) | [Imagen](qa/pricing-moving-2026-11-26/end-es-768.png) | [Imagen](qa/pricing-moving-2026-11-26/end-es-1280.png) |
| Español | Mudanza | [Imagen](qa/pricing-moving-2026-11-26/moving-es-375.png) | [Imagen](qa/pricing-moving-2026-11-26/moving-es-768.png) | [Imagen](qa/pricing-moving-2026-11-26/moving-es-1280.png) |

## Archivos cambiados

La lista exacta se incluye en [PRICING_CHANGED_FILES_2026-11-26.txt](PRICING_CHANGED_FILES_2026-11-26.txt). Los cambios se limitan a precios, reglas, formularios, almacenamiento de selecciones, textos, tablas, metadatos y sus comprobaciones. El mapa, los recursos visuales y el adaptador de Payrexx no se modifican.
