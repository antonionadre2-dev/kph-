# Kai publicado en Kraken PFM · 26 de noviembre de 2026

**Web:** https://krakenpfm.ch/es/  
**Código publicado:** 28c41f2d8bc3e3f3d3b823730354743938bced1d  
**Despliegue:** dpl_5drCs9Mn1uVCCH9Pm8FMdcXEZ8PT  
**Revisión:** https://github.com/antonionadre2-dev/kph-/pull/7

krakenpfm.ch y www.krakenpfm.ch apuntan al nuevo despliegue. Los commits posteriores al código indicado añaden solo informes y evidencia.

## Resultado y límites

Kai extrae habitaciones, m², baños, horas, fechas y localidades sin confundir decimales con fechas ni cambiar de servicio por un elemento de su alcance. Los precios proceden de la función real del calculador. El traspaso rellena controles reales y deja en el resumen solo los datos sin control aplicado o conflictos conservados.

Las peticiones de persona y quejas muestran contacto directo. Las respuestas siguen el idioma del mensaje. El paso a la calculadora conserva ese idioma, incluido el alemán sin prefijo; ese caso se corrigió tras una prueba real desde una página española.

Los hechos comunes y las FAQ reutilizan una fuente compacta. Los seis documentos AGB completos conservan exactamente su contenido, contrastado por JSON y SHA256. No se añaden pólizas, garantías universales, descuentos ni disponibilidad inventada.

**La IA real sigue sin activar:** Production no tiene GEMINI_API_KEY. Gemini es el único proveedor preparado, con herramientas de lectura de precios/hechos y respaldo guiado a los ocho segundos. No se realizaron llamadas reales al modelo. Faltan una clave válida en servidor y verificar modelo, cuota y facturación.

Las tarifas, el anticipo, Payrexx, los webhooks y las reservas existentes no cambian. La incidencia bancaria y el pago TEST pendientes de Payrexx se retoman aparte.

## Verificación

- **621 pruebas: 615 aprobadas, 6 omitidas y 0 fallidas.** Las omitidas son las existentes de reglas cliente de Firestore con emulador. La última corrección de idioma pasó además TypeScript y las cuatro pruebas UI antes de compilar.
- Los 17 casos del documento se ejecutan sin clave y con una frontera de proveedor inyectado. Hay regresiones de fechas futuras, cantidades singulares y decimales, correcciones, extras y negaciones, seis idiomas, límites y herramientas.
- Build Production Express/Node 24 con dependencias aisladas. Artefacto standalone: **449 recursos, 193 HTML y 61 dependencias frontend** verificados; importación correcta de siete SDK dentro de la función, incluido Gemini en su entrada ESM.
- Antes de promover: 449 recursos remotos comparados por SHA256 y siete casos reales del endpoint de Kai correctos. Después: 11 páginas, 61 recursos frontend y siete casos del endpoint público correctos. Ambos dominios tienen el destino esperado.
- Navegador: saludo, precio, contacto y traspaso a 375 × 812 y 1280 × 900. Las ocho imágenes tienen esas dimensiones completas. La calculadora publicada recibió 3.5 habitaciones, 85 m², código postal y CHF 690. En una sesión nueva de la función compilada se comprobaron fecha ISO, localidad y notas vacías.
- A 375 px no hubo desbordamiento horizontal. El lanzador acabó en y=716 y la barra de precio empezó en y=728.4: no se solapan. El viewport se restauró.
- No se crearon reservas, cobros ni correos. Los mensajes de Kai solo producen borradores. paymentReady no sustituye una prueba de cobro.

La falta de espacio impidió una instalación nueva de dependencias. Se usó una copia aislada mediante clonación APFS de dependencias existentes, con package-lock idéntico. Solo para ese build se omitió la reinstalación con el [ajuste documentado de Vercel](https://vercel.com/docs/project-configuration/vercel-json#installcommand). La configuración versionada del proyecto no cambia. Los SDK se verificaron dentro del paquete; después se limpiaron el build temporal y las previews locales.

## Pendientes del propietario

[Contenido pendiente](KAI_CONTENT_TODO_2026-11-26.md): aseguradora y capital, personas asignadas, disponibilidad, duración, productos específicos y revisión operativa de las condiciones existentes de garantía y cancelación. El [informe de implementación](KAI_ASSISTANT_2026-11-26.md) recoge el diagnóstico y los cambios.

Evidencia: [API pública](qa/kai-2026-11-26/public-kai-api.json), [páginas y recursos](qa/kai-2026-11-26/public-http.json), [dominios](qa/kai-2026-11-26/domain-aliases.json), [artefacto](qa/kai-2026-11-26/prebuilt-verified.json), [SDK](qa/kai-2026-11-26/runtime-sdk-verification.json), [geometría móvil](qa/kai-2026-11-26/public-browser.json).

Capturas: [saludo escritorio](qa/kai-2026-11-26/desktop-greeting-1280.jpg), [precio escritorio](qa/kai-2026-11-26/desktop-price-1280.jpg), [contacto escritorio](qa/kai-2026-11-26/desktop-contact-1280.jpg), [traspaso escritorio](qa/kai-2026-11-26/desktop-transfer-1280.jpg), [saludo móvil](qa/kai-2026-11-26/mobile-greeting-375.jpg), [precio móvil](qa/kai-2026-11-26/mobile-price-375.jpg), [contacto móvil](qa/kai-2026-11-26/mobile-contact-375.jpg), [traspaso móvil](qa/kai-2026-11-26/mobile-transfer-375.jpg).
