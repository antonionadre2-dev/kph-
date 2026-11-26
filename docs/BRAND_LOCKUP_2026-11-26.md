# Cabecera y pie de Kraken PFM · 26 de noviembre de 2026

Publicado en https://krakenpfm.ch. Código de aplicación: `9fcada1f2b9358a5f67092951766283435c1c3e7`.
Despliegue: `dpl_4DjTmMBXEpvSScWgzBVG7YidiW6u`. Ambos dominios verificados.

## Resultado

El logo original conserva sus recursos y atributos. A su derecha se muestran el nombre fijo Properties & Facilities Management (11,5 px, peso 400) y el lema traducido (14 px, peso 600; 12 px en móvil estrecho). La empresa se oculta en cabecera por debajo de 1100 px. El lema ocupa dos líneas a 375 px en los seis idiomas y una en escritorio. El pie comparte los mismos textos y nombre accesible.

Claves nuevas: `header.tagline` y `header.logoAria`. El nombre fijo se define una vez en `KRAKEN_COMPANY_DESCRIPTOR`. El helper compartido usa el diccionario existente y fallback alemán. No hay H1 ni encabezados en el bloque.

Se corrigió la entrada explícita `?lang=de`: el servidor conserva la elección hasta que el navegador la guarda, evitando que una preferencia española anterior gane tras una redirección. La canonical alemana sigue siendo `/`.

## Archivos cambiados

- `components/BrandIdentity.tsx`
- `components/Footer.tsx`
- `components/brand-identity.css`
- `components/home/ApprovedHeader.tsx`
- `i18n.ts`
- `scripts/lighthouse-contact.config.mjs`
- `server.ts`
- `src/i18n/brand.ts`
- `src/i18n/public-translations.ts`
- `src/locale.ts`
- `src/routing/route-policy.ts`
- `tests/brand-translations.test.ts`
- `tests/home-compiled-server.test.mjs`
- `tests/home-locale.test.ts`

## Comprobaciones

- 49 pruebas aprobadas, cero fallos; TypeScript correcto y build Production standalone correcto.
- 24 capturas reales de Chrome: DE, EN, ES, PT, IT y FR en 375, 768, 1024 y 1280 px. Sin solapamientos ni desplazamiento horizontal. El francés se verificó como texto más largo.
- Altura total conservada (incluida la franja de contacto): 375 → 186 px; 768 → 131 px; 1024/1280 → 139 px.
- Los seis idiomas se cambiaron mediante el selector real y conservaron el mismo loader del documento: sin recarga. Header y footer cambiaron juntos.
- Entradas `?lang=` verificadas para los seis idiomas; preferencia francesa restaurada al entrar en `/` y conservada tras recargar.
- Comparación antes/después de 30 páginas: títulos, descripciones, H1, canonical y atributos del logo idénticos. SHA256 del archivo original del logo idéntico.
- 449 recursos del despliegue preparados y comprobados; 61 dependencias frontend públicas correctas; siete SDK importados dentro de la función. Configuración pública de reservas preservada.
- Las pruebas visuales usan tamaños de viewport de Chrome; no sustituyen ensayos en hardware físico.

El archivo descargable contiene las 24 cabeceras, dos vistas adicionales del pie y una galería HTML. No se crearon reservas, cobros ni correos. Los builds temporales y la preview local se retiran al terminar el trabajo.
