# Anticipos y plazos alineados con las condiciones

27 de noviembre de 2026. Corrección implementada y comprobada en local; esta revisión no está publicada en producción.

La calculadora y el servidor aplican el 15 % al mínimo del encargo por horas, incluidos los extras contratados y el desplazamiento cuando corresponde. Los precios cerrados mantienen el anticipo sobre todo el precio confirmado. Las tarifas, los totales, los descuentos y los recargos no cambian. Los trabajos por horas se presentan como estimaciones de la duración real, conforme a la cláusula 3.4.

| Ejemplo sin extras | Total | Mínimo utilizado | Anticipo |
| --- | ---: | ---: | ---: |
| Limpieza semanal, 4 horas | CHF 160 | CHF 100 | CHF 15 |
| Fin de alquiler por horas, 4 horas | CHF 180 | CHF 135 | CHF 20,25 |
| Fin de obra por horas, 5 horas | CHF 240 | CHF 192 | CHF 28,80 |

Los materiales, el planchado expresamente contratado y los extras de precio fijo forman parte del alcance mínimo. El recargo por suciedad se calcula también sobre ese alcance para el anticipo. El desplazamiento de limpieza ya está incluido; no se añade otra tasa.

## Un vencimiento y un enlace

En las nuevas reservas con `kraken-agb-2026-11-26-v2`, la confirmación establece en el servidor `payment.depositDueAt`: tres días naturales en Europe/Zurich, respetando los cambios de hora, como máximo hasta el inicio del trabajo. El panel no permite sustituirlo por una retención de 30 o 120 minutos. La interfaz y los correos muestran el mismo vencimiento persistido.

El gateway Payrexx dura hasta ese vencimiento y se reutiliza; volver después de 30 minutos o dos días no crea otro gateway. Se exige al menos un minuto completo para crear un enlace nuevo, pues Payrexx expresa su validez en minutos. Un enlace existente todavía válido puede reabrirse en el último minuto.

Una respuesta incierta del proveedor continúa bloqueando la creación de un segundo gateway. Se comprueban referencia, gateway e intento antes de guardar respuestas concurrentes. Un pago verificado después de una cancelación o de una creación que cruzó el vencimiento conserva el importe y la transacción y pasa a revisión; no reactiva automáticamente la cita ni envía una confirmación falsa.

El vencimiento detiene el acceso al pago y conserva la cita registrada. No se libera automáticamente el turno: la cláusula permite al personal revisarlo y liberarlo después de un recordatorio.

## Versiones anteriores

La nueva versión de cálculo es `kraken-private-2026-11-27-v4`. Una solicitud nueva con una versión antigua debe revisar su cálculo. No se recalculan las reservas guardadas: conservan cotización, anticipo, aceptación y condiciones originales. Sus enlaces antiguos caducados siguen necesitando revisión operativa; no se genera otro enlace potencialmente cobrable.

La versión del documento legal y sus hashes no cambian: se ha corregido la implementación para cumplir el texto ya preparado.

## Comprobaciones

- Suite completa: 699 pruebas, 693 aprobadas, seis omitidas por requerir el emulador de Firestore y cero fallos.
- TypeScript y build de producción correctos. La comprobación final de interfaz cubre el aviso único y la presentación de anticipos en las seis lenguas.
- El adaptador Payrexx se prueba con HTTP simulado: el servidor envía CHF 15, CHF 20,25 y CHF 28,80, ignora importes manipulados por el navegador y conserva las reservas antiguas.
- Pruebas de concurrencia, respuesta incierta, reloj de verano/invierno, vencimiento persistido, pago tardío, idempotencia y estados terminales.
- Comprobación real del navegador a 1280 px: los tres ejemplos muestran el total y anticipo correspondientes, sin desbordamiento horizontal. Los textos de los seis idiomas se comprueban en el renderizado.
- No se crearon reservas, cargos ni envíos de email reales para probar este código. La prueba externa completa en una instancia Payrexx TEST separada sigue pendiente.

[Archivos modificados](qa/payment-terms-2026-11-27/ARCHIVOS-CAMBIADOS.txt), [verificación](qa/payment-terms-2026-11-27/verification.json), [pruebas](qa/payment-terms-2026-11-27/tests-full-final.log), [tipos](qa/payment-terms-2026-11-27/types-final.log), [build](qa/payment-terms-2026-11-27/build-final.log).

La validez de un gateway se expresa en minutos en la [documentación oficial de Payrexx](https://developers.payrexx.com/reference/create-a-gateway). Esta actualización no cambia el adaptador, sus credenciales, la firma del webhook ni el modo LIVE/TEST del proveedor.
