# Revisión P0: solicitud, confirmación y recuperación

Esta rama se propone sobre `codex/contact-redesign-2026-11-25` (`bccdfc6`). Implementa correcciones P0 para revisión. **No se ha publicado esta rama ni completado un pago real de Payrexx TEST o una entrega real de correo.** La validación externa pendiente impide dar P0 por cerrado; P1–P6 no se han iniciado en este cambio.

## Cambios y límites

| Prioridad | Resultado implementado | Verificación pendiente |
| --- | --- | --- |
| P0.1 | Cobertura explícita de `end`, `windows`, `regular`, `deep` y `moving` en los seis idiomas; redirección antigua preserva selección e idioma. La equivalencia `end` ya estaba corregida en la base de esta rama. | Ninguna regresión local detectada. |
| P0.2 | El panel nuevo confirma el mismo registro `kraken_bookings` que consulta el cliente. Verifica identidad de personal, revisión y comprobación manual de disponibilidad; una confirmación habilita el anticipo sin crear un cobro. Se retiran las aprobaciones antiguas que solo cambiaban React. | Confirmación con identidad y base remotas, después de revisión y publicación autorizada. |
| P0.3 | Diagnóstico seguro de rechazos futuros de correo, reintento restringido al mismo mensaje y clave, y texto tranquilo para el cliente. | Entrega a un buzón real. Un fallo histórico sin diagnóstico no permite reconstruir la causa ni habilita reenvío ciego. |
| P0.4 | Condiciones en pestaña nueva; borrador anónimo de 24 h y datos de la pestaña durante 30 min. Importes y consentimiento se recalculan o solicitan de nuevo. | Sin incidencias en recarga y navegación local. |
| P0.5 | Recuperación en el mismo navegador mediante cookie firmada HttpOnly de hasta siete días; en otro navegador, enlace de 15 min enviado tras referencia y correo. Caducidad y revocación comprobadas; las consultas no renuevan el plazo. | Envío real del enlace y configuración de ciclo de vida en el host remoto. |
| P0.6 | Una lectura de estado no cambia el idioma de la interfaz; el envío toma el idioma explícito de la ruta antes de los valores anteriores. | Sin incidencias en los seis idiomas. |

No se modifican `src/booking/pricing.ts`, los importes, el anticipo del 15 % ni las condiciones comerciales. El texto de privacidad se actualiza en seis idiomas para describir el almacenamiento realmente implementado. No se inventan seguros, garantías ni plazos de respuesta.

La comprobación final detectó que la barra móvil del precio tapaba el botón de rechazo de cookies. Se ajustó la superposición del aviso y se verificó un clic real en dicho botón en los cuatro anchos antes de obtener las capturas.

Detalles de permisos, rutas privadas, reintentos, índices y preparación remota: [BOOKING_OPERATIONS_P0.md](BOOKING_OPERATIONS_P0.md).

## Comprobaciones realizadas

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| Suite del proyecto | 511 pruebas: 505 aprobadas, 6 omitidas, 0 fallidas | Las seis omitidas corresponden a la suite existente de reglas cliente de Firestore con emulador; no se presentan como aprobadas. |
| TypeScript y `git diff --check` | Correctos | Sin cambios en la fuente de precios. |
| Artefacto Preview prebuilt real | 449 archivos verificados por SHA-256; 193 HTML; 61 dependencias frontend; 0 ausentes | Construcción local; ninguna publicación de esta rama. |
| Recursos por HTTP en el artefacto servido | 61/61 con estado 200, MIME y SHA correctos | JS, CSS y fuentes; evita confundir HTML 200 con recursos disponibles. |
| Flujo HTTP con Firestore y Auth reales en emuladores | 31/31 | Proveedores Payrexx y correo simulados explícitamente; sin cargos ni envíos. |
| Chromium sobre el artefacto prebuilt | 21/21 | Recarga, condiciones, idempotencia, idioma, recuperación y navegación de pago **simulada**. |
| Selección directa | 30/30 | Cinco claves × seis idiomas. |
| Redirecciones `/quote?service=end&lang=…` | 6/6 con 301 | Destino localizado `/offerte?service=end`. |
| Calculador, 360/390/768/1440 px | Sin desbordamiento horizontal, errores JS ni recursos ausentes | Capturas completas enlazadas abajo. |
| Recuperación abierta a 320 y 1024 px | Sin desbordamiento; botón de envío de 48,39 px | Formulario expandido, no solo acordeón cerrado. |

Resultados sanitizados: [emuladores](qa/booking-p0-emulator-2026-11-26.json), [navegador y recursos](qa/customer-payment-p0-2026-11-26/verification.json).

**Rendimiento:** esta rama no aporta una nueva medición Lighthouse, LCP o FCP comparable. Las cifras históricas no se reutilizan como resultado nuevo. La optimización P6 queda pendiente de cerrar P0.

## Incidencia de producción recuperada

Al revisar la web publicada se detectó que la versión `76e8cb4` devolvía HTML 200 y JS/CSS 404. El build remoto había omitido el empaquetado prebuilt utilizado en `d299da3`.

El propietario autorizó específicamente restaurar la versión anterior. Se restauró `d299da3`, sin publicar los cambios nuevos de esta rama. El navegador comprobó el calculador público a 390 y 1440 px: interactivo, sin errores ni recursos ausentes. No se crearon solicitudes o pagos durante esa comprobación.

Esta rama añade manifiesto transitivo de recursos, verificación SHA-256 y bloqueo del build remoto no preparado. El procedimiento de revisión y despliegue futuro se documenta en [VERCEL_ASSET_CONTRACT.md](VERCEL_ASSET_CONTRACT.md).

## Capturas

Las capturas «antes» corresponden a la incidencia pública con los estilos y scripts ausentes, antes de restaurar `d299da3`. **No representan una comparación del diseño normal ni demuestran que esta rama haya implementado P2.** Las capturas «después» muestran el nuevo artefacto local con reservas, correo y pago externos desactivados; se rechazaron las cookies opcionales con el botón visible para no tapar el contenido. No contienen clientes reales.

| Ancho | Antes: incidencia pública | Después: rama local |
| --- | --- | --- |
| 360 px | [Captura](qa/customer-payment-p0-2026-11-26/before/calculator-360.png) | [Captura](qa/customer-payment-p0-2026-11-26/after/calculator-360.png) |
| 390 px | [Captura](qa/customer-payment-p0-2026-11-26/before/calculator-390.png) | [Captura](qa/customer-payment-p0-2026-11-26/after/calculator-390.png) |
| 768 px | [Captura](qa/customer-payment-p0-2026-11-26/before/calculator-768.png) | [Captura](qa/customer-payment-p0-2026-11-26/after/calculator-768.png) |
| 1440 px | [Captura](qa/customer-payment-p0-2026-11-26/before/calculator-1440.png) | [Captura](qa/customer-payment-p0-2026-11-26/after/calculator-1440.png) |

## Pendientes para cerrar P0

1. Recuperar el acceso legítimo a Payrexx. El propietario no dispone de la aplicación de autenticación. La pantalla de métodos alternativos ofrece códigos de respaldo o soporte; no aparece SMS o correo configurado. No se desactiva ni evita la verificación.
2. Verificar un entorno explícitamente TEST antes de crear el Gateway; completar el pago TEST y comprobar la verificación autenticada del webhook y el estado guardado. Un adaptador simulado no acredita esto.
3. Confirmar la entrega real de los mensajes y recuperar la solicitud desde el enlace recibido. Aceptación del proveedor y entrega al buzón son estados distintos.
4. Revisar y autorizar el código y la configuración remota necesaria antes de publicarlo; la rama permanece sin publicar.

Enlaces existentes para la entrega SEO: [tabla de redirecciones](ROUTE_MIGRATION.csv), [criterios de migración](ROUTE_MIGRATION.md) y [URL para revisión de retirada](URL_REMOVALS.csv). Esta rama no solicita retiradas ni indexaciones en Google.

Documentación oficial de acceso: [Payrexx, verificación de dos pasos](https://docs.payrexx.com/merchant/english/account/settings/user-administration/2-factor-authentication). Documentación de pago: [Payrexx, pruebas](https://docs.payrexx.com/merchant/english/payment/testing).
