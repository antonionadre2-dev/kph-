# Optimización de imágenes — 25 de noviembre de 2026

Generación reproducible: `node scripts/optimize-media.mjs` con sharp 0.35.5. Los originales se conservan. Los derivados WebP tienen hash SHA-256 de sus bytes y se sirven desde `/media/`.

Total de 34 originales: 7701.1 KiB. Derivados naturales: 4745.9 KiB (38.4 % menos). Los dispositivos eligen derivados menores mediante srcset.

| Original | Original | Natural optimizado | Variante 640 px | Modo |
| --- | ---: | ---: | ---: | --- |
| /home-approved/assets/hero-room-day-v4.webp | 233.7 KiB | 115.6 KiB | 29.3 KiB | Responsive |
| /home-approved/assets/hero-room-night-v4.webp | 190.4 KiB | 93.6 KiB | 23.7 KiB | Responsive |
| /home-approved/assets/holiday-decor.webp | 289.3 KiB | 250.6 KiB | — | Atlas, geometría original |
| /home-approved/assets/kai-rest-v3.webp | 270.7 KiB | 212.0 KiB | — | Atlas, geometría original |
| /home-approved/assets/kai-tasks-cold-v3.webp | 298.8 KiB | 250.5 KiB | — | Atlas, geometría original |
| /home-approved/assets/kai-tasks.webp | 302.3 KiB | 256.3 KiB | — | Atlas, geometría original |
| /home-approved/assets/kai-windows-cold-v3.webp | 236.3 KiB | 192.3 KiB | — | Atlas, geometría original |
| /home-approved/assets/kai-windows.webp | 236.7 KiB | 197.2 KiB | — | Atlas, geometría original |
| /home-approved/assets/kai.webp | 148.1 KiB | 91.6 KiB | 39.8 KiB | Responsive |
| /home-approved/assets/logo.webp | 58.4 KiB | 49.4 KiB | 25.1 KiB | Responsive |
| /home-approved/assets/seasons-window.webp | 494.5 KiB | 443.8 KiB | — | Atlas, geometría original |
| /home-approved/assets/service-deep-v5.webp | 176.0 KiB | 80.3 KiB | 28.8 KiB | Responsive |
| /home-approved/assets/service-end-v5.webp | 138.8 KiB | 71.5 KiB | 27.3 KiB | Responsive |
| /home-approved/assets/service-moving-v6.webp | 294.0 KiB | 152.8 KiB | 55.2 KiB | Responsive |
| /home-approved/assets/service-regular-v5.webp | 246.5 KiB | 121.4 KiB | 39.3 KiB | Responsive |
| /home-approved/assets/service-scenes-branded-v4.webp | 312.8 KiB | 159.4 KiB | — | Atlas, geometría original |
| /home-approved/assets/service-windows-v5.webp | 300.3 KiB | 164.9 KiB | 56.8 KiB | Responsive |
| /home-approved/assets/services-hero-v5.webp | 203.3 KiB | 92.6 KiB | 27.8 KiB | Responsive |
| /home-approved/assets/transit-loading-v4.webp | 237.9 KiB | 122.0 KiB | — | Atlas, geometría original |
| /transit-quality/transit-boxes-v1.webp | 240.7 KiB | 132.6 KiB | 44.1 KiB | Responsive |
| /transit-quality/transit-chairs-v1.webp | 242.1 KiB | 124.7 KiB | 42.8 KiB | Responsive |
| /transit-quality/transit-empty-v1.webp | 235.3 KiB | 132.5 KiB | 45.5 KiB | Responsive |
| /transit-quality/transit-furniture-v1.webp | 265.0 KiB | 138.7 KiB | 46.9 KiB | Responsive |
| /transit-quality/transit-overview-v1.webp | 262.9 KiB | 137.9 KiB | 44.9 KiB | Responsive |
| /about-approved/assets/kai-comic-cover.webp | 309.4 KiB | 144.5 KiB | 64.4 KiB | Responsive |
| /about-approved/assets/kai-evolution.webp | 114.6 KiB | 69.0 KiB | 20.8 KiB | Responsive |
| /about-approved/assets/kai-help-deep.webp | 141.6 KiB | 72.2 KiB | 17.7 KiB | Responsive |
| /about-approved/assets/kai-help-end.webp | 134.8 KiB | 71.6 KiB | 18.5 KiB | Responsive |
| /about-approved/assets/kai-help-moving.webp | 134.2 KiB | 62.9 KiB | 15.1 KiB | Responsive |
| /about-approved/assets/kai-help-regular.webp | 138.3 KiB | 71.9 KiB | 18.4 KiB | Responsive |
| /about-approved/assets/kai-help-windows.webp | 146.8 KiB | 76.4 KiB | 18.4 KiB | Responsive |
| /about-approved/assets/kai-rheinfall-awakening.webp | 292.2 KiB | 158.7 KiB | 41.7 KiB | Responsive |
| /about-approved/assets/kai-story.webp | 226.4 KiB | 142.8 KiB | 57.6 KiB | Responsive |
| /about-approved/assets/kai.webp | 148.1 KiB | 91.6 KiB | 39.8 KiB | Responsive |
| /home-approved/assets/seasons-window-spring.webp | Cuadrante exacto del atlas | 99.9 KiB | — | Responsive |
| /home-approved/assets/seasons-window-summer.webp | Cuadrante exacto del atlas | 88.6 KiB | — | Responsive |
| /home-approved/assets/seasons-window-autumn.webp | Cuadrante exacto del atlas | 89.4 KiB | — | Responsive |
| /home-approved/assets/seasons-window-winter.webp | Cuadrante exacto del atlas | 90.7 KiB | — | Responsive |

Todos los atlas conservan una variante de tamaño natural y su canal alfa. Kai añade una variante 768 px proporcional con celdas enteras: 768×512 para 3×2 y 768×384 para 2×1. Se elige según tamaño visible, columnas y DPR, con tope móvil 768. No se recortan poses ni logos. Las imágenes individuales se generan a 320/640/960 px y tamaño natural, sin ampliación; los logos añaden 160 px. No se generan imágenes nuevas ni se cambia su contenido.

El primer sprite espera la temperatura hasta 500 ms. Si no llega, su ropa sigue la fecha de Zúrich; cuando llega una observación válida se actualiza. Solo se asigna la URL del sprite activo, de modo que no se precargan simultáneamente los dos climas. Kai sigue reproduciéndose automáticamente y respeta la pausa y reduced motion.

El paisaje de estaciones añade cuatro derivados que recortan exactamente sus cuadrantes originales de 627 × 627 px. La escena solicita solo el cuadrante de la estación activa; conserva el encuadre del SVG. El atlas completo original y su derivado de compatibilidad se mantienen.

El HTML usa srcset/sizes y conserva las dimensiones intrínsecas para evitar saltos de layout. Los atlas de la escena se solicitan al aproximarse la escena a la pantalla; el atlas de servicios y las secciones inferiores esperan a su visibilidad. La reproducción automática de Kai, la temperatura y los controles de movimiento se mantienen.

Las capas de una ilustración compuesta mantienen alt vacío y aria-hidden; el contenedor tiene una descripción traducida que el controlador actualiza. Las imágenes informativas conservan su texto alternativo. Las cifras Lighthouse antes/después se documentan por separado sobre la compilación completa.
