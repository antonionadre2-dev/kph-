# CHECK · Facturas del dashboard heredado

Revisión de copia del 25 de noviembre de 2026. No se han emitido documentos nuevos ni modificado registros históricos, importes, cálculos o pagos.

Se han retirado la sociedad ficticia «AG», el IBAN de ceros y las etiquetas que afirmaban IVA incluido o validez fiscal para todos los registros. Los textos identifican ahora Kraken PFM y su oferta de limpieza y pequeñas mudanzas. El PDF de DetailInspectorModal utiliza Seewadelstrasse 3, 8203 Schaffhausen y no añade un UID o número de IVA sin respaldo. Si un registro no indica una pasarela, la interfaz muestra un guion.

Antes de utilizar estos PDF heredados como facturas, el propietario debe confirmar:

- Los datos exactos del emisor y los datos fiscales que correspondan a cada documento.
- La numeración: actualmente se deriva del ID del registro, no de una secuencia de facturas confirmada.
- La fecha de emisión y el importe del registro: el generador usa la fecha actual y muestra cero cuando no existe importe.
- El tratamiento de IVA de cada registro histórico. Cambiar una etiqueta no recalcula ni corrige impuestos guardados.
- Las instrucciones de pago confirmadas para ese encargo. No se ha añadido una cuenta bancaria ni un método de pago alternativo.

La revisión técnica también corrigió ambos generadores heredados: los campos de texto del registro se escapan antes de construir el HTML, la vista previa incluye una CSP sin scripts y el botón de impresión recibe su evento desde la ventana de origen. Cada documento queda identificado como borrador que debe revisarse antes de utilizarlo. Las pruebas comprueban que texto malicioso no se convierte en HTML ejecutable y que los importes originales se conservan. Estas protecciones no resuelven las decisiones contables anteriores ni alteran los datos guardados.
