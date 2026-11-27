# Aviso legal de Kraken · 27 de noviembre de 2026

## Estado

Implementado en el repositorio React + Express existente, en la rama `codex/impressum-update-2026-11-27`, sobre `f9346d1` (`codex/agb-update-2026-11-27`). **Preparado para revisión local; no se ha desplegado ni actualizado producción en krakenpfm.ch.**

Preview español: [Abrir aviso legal](http://127.0.0.1:3051/es/impressum). Preview alemán: [Abrir Impressum](http://127.0.0.1:3051/impressum?lang=de).

## Cambios

- `src/legal/impressum-copy.json` conserva literalmente el JSON entregado y los seis idiomas. SHA-256: `baef4d9fa28c74ab1cae0827bbc8f27ee6df75f1c8002798fef1e50266393210`. Fecha: 27 de noviembre de 2026. Razón social, titular, dirección, UID, contacto y textos registrales/fiscales se mantienen.
- `src/legal/impressum-document.ts` expone ese contenido tipado e inmutable y utiliza alemán como alternativa cuando falta un idioma válido. `src/legal/impressum-metadata.ts` contiene solo títulos y descripciones para evitar cargar todo el documento en el paquete común; una prueba compara esos textos con la fuente.
- `components/ImpressumPage.tsx` y `components/legal/impressum-page.css` integran el diseño suministrado en el marco actual: portada navy, fecha, accesos rápidos, índice lateral o plegable en móvil, siete secciones completas en HTML y estilos de impresión. El índice utiliza anclas, foco de teclado y reducción de movimiento. Los efectos se limpian al desmontar.
- `public/legal/impressum-document.svg` reutiliza exactamente el recurso decorativo entregado. SHA-256: `feccf9c350b5014750737d5d70aa9c018fea597519b6685af72072983560467a`. No sustituye el logo.
- En `components/legal/privacy.ts` se han aplicado únicamente los seis pares exactos de `liabilityP1`: eliminar la mención del seguro y su coma anterior. Una prueba revierte esas sustituciones y verifica el hash completo del archivo anterior. No se han reformulado otros párrafos.
- UID: [CHE-435.882.969](https://www.uid.admin.ch/Detail.aspx?uid_id=CHE-435.882.969), con `target="_blank"` y `rel="noopener noreferrer"`. Italiano utiliza IDI; español Empresa individual; portugués Informações de contacto. Enlaces de privacidad, condiciones, correo y teléfono mantienen idioma y destinos reales.

## Rutas y metadatos

| Idioma | Ruta real |
| --- | --- |
| Alemán | /impressum |
| Inglés | /en/impressum |
| Español | /es/impressum |
| Francés | /fr/impressum |
| Italiano | /it/impressum |
| Portugués | /pt/impressum |

Compatibilidad con `/impressum?lang=xx`, `?hl=xx` y `/impressum/xx`. El prefijo tiene prioridad y los alias alemanes explícitos prevalecen sobre un idioma guardado. El selector cambia el contenido sin recargar.

Los canonical y siete hreflang (seis idiomas y x-default) apuntan a las rutas reales de https://krakenpfm.ch. Se conserva la política existente de la página legal: `noindex, follow`, fuera del sitemap. En localhost la protección de preview aplica `noindex, nofollow`. El indicador `KRAKEN_LEGAL_PREVIEW` era propio del generador estático suministrado; se ha adaptado su finalidad al sistema existente, sin incorporar otro servidor ni cambiar la política de indexación. No se añade schema legal ni se alteran los metadatos de otras páginas.

Los endpoints de entrega `/entrega/impressum.zip`, `/entrega/impressum-codigo.txt` y `/entrega/impressum-prompt.txt` no se montan ni se publican. Los originales de la entrega permanecen fuera de public/dist.

## Verificación

- Suite completa: **709 pruebas, 703 aprobadas, 6 omitidas por el emulador Firestore ya existente, 0 fallos**. TypeScript y build de producción correctos. Sin dependencias nuevas.
- Pruebas específicas de integridad de fuente, seis cambios de privacidad, renderizado React de los seis documentos, alias y metadatos. Pruebas del servidor compilado incluyen los nuevos alias. `git diff --check` correcto.
- Navegador real: alemán y español a 375 y 1280 px, además de 320 px. Sin desbordamiento horizontal. Un H1 y las siete secciones en cada captura. Cambio de idioma sin recarga comprobado con el mismo documento del navegador.
- Teclado y foco en índice y UID; apertura de la ficha oficial UID; navegación a privacidad y condiciones en español; enlaces mailto/tel exactos. Índice móvil, cierre con Escape del menú existente, preferencia de movimiento reducido y desmontaje/remontaje sin duplicados comprobados.
- Impresión: CSS de impresión comprobado en el navegador y PDF A4 generado por el navegador, dos páginas con texto seleccionable y 30 bloques canónicos presentes. Ambas páginas renderizadas fueron inspeccionadas visualmente: sin recortes ni solapamientos. Sin controles, header/footer ni chatbot en el documento impreso. No se envió ningún trabajo de impresión; el diálogo nativo de impresión no se validó.
- Revisión independiente del diff sin defectos accionables.

No hay cambios en cabecera, pie, identidad del logo, precios, pagos, Payrexx, condiciones generales o dependencias. La página de privacidad cambia solo en las seis frases indicadas.

- HTTP local: seis documentos GET/HEAD, 18 alias con destino correcto, metadatos en preview y Host de producción simulado, ocho recursos JS/CSS/SVG y cuatro rutas inválidas o de entrega 404; 0 fallos. No se han enviado peticiones a producción para estas pruebas.

## Capturas y evidencia

| | 375 px | 1280 px |
| --- | --- | --- |
| Alemán | [Captura](qa/impressum-2026-11-27/impressum-de-375.jpg) | [Captura](qa/impressum-2026-11-27/impressum-de-1280.jpg) |
| Español | [Captura](qa/impressum-2026-11-27/impressum-es-375.jpg) | [Captura](qa/impressum-2026-11-27/impressum-es-1280.jpg) |

[Evidencia de navegador](qa/impressum-2026-11-27/browser-verification.json) · [Integridad del contenido](qa/impressum-2026-11-27/content-verification.json) · [Impresión](qa/impressum-2026-11-27/print-verification.json) · [Suite completa](qa/impressum-2026-11-27/tests-full-final.log) · [TypeScript](qa/impressum-2026-11-27/types-final.log) · [Build](qa/impressum-2026-11-27/build-final.log).

[Evidencia HTTP](qa/impressum-2026-11-27/http-verification.json).

[Inventario completo de archivos cambiados](qa/impressum-2026-11-27/ARCHIVOS-CAMBIADOS.txt).
