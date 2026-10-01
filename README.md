# Midnight of Vein — web del juego

Web en español para presentar Midnight of Vein y descargarlo en Windows y Android. La dirección visual combina estética Y2K y gótica: violeta, negro, detalles plateados y material real del juego. La historia gira alrededor de la fuga de Vein de una prisión donde se realizan experimentos.

## Desarrollo local

Se necesita **Node.js 22.12.0 o superior** y npm. Ejecuta los comandos desde la raíz del repositorio.

```sh
npm ci
npm run dev
```

El servidor de desarrollo muestra su dirección en la terminal; por defecto es `http://localhost:4321`.

```sh
npm run build
npm run preview
```

`build` genera la aplicación de producción en `dist/`. `preview` permite revisar esa compilación localmente antes de publicarla.

## Arquitectura y despliegue

El proyecto usa **Astro 6**, TypeScript, GSAP y el adaptador oficial de **Cloudflare**, con renderizado en servidor (`output: 'server'`). Se conserva la configuración de despliegue existente en `astro.config.mjs` y `wrangler.jsonc`; la salida no es un sitio estático para GitHub Pages.

Las dependencias quedan fijadas por `package-lock.json`. Para reproducir una instalación utiliza `npm ci`. No se deben subir `node_modules/`, `dist/`, `.astro/` ni `.wrangler/`: contienen dependencias, compilaciones o estado local generado.

| Archivo o carpeta | Contenido |
| --- | --- |
| `src/pages/index.astro` | Portada, historia, jugabilidad y galería; ruta `/`. |
| `src/pages/descargar.astro` | Descargas, tamaños, instrucciones de instalación y preguntas frecuentes; ruta `/descargar`. |
| `src/layouts/Layout.astro` | Documento compartido, metadatos y carga de estilos y scripts. |
| `src/components/Header.astro` | Navegación principal y menú móvil. |
| `src/components/Footer.astro` | Enlaces y control de animaciones. |
| `src/components/Icon.astro` | Iconos vectoriales compartidos. |
| `src/styles/global.css` | Diseño Y2K gótico, adaptación a móvil, estados de foco y reducción de movimiento. |
| `src/scripts/experience.ts` | Animaciones, menú móvil y galería accesible. |
| `src/data/downloads.ts` | Enlaces de descarga para Windows y Android. |
| `public/media/` | Logo, fondo de la prisión y capturas en WebP. |
| `public/fonts/` | Tipografías locales y sus licencias. |

## Mantener las descargas

Los enlaces de `src/data/downloads.ts` son **URL firmadas de Supabase** y caducan el **20 de mayo de 2027**. Hay que renovarlos antes de esa fecha y volver a desplegar la web. No copies los tokens a otros archivos.

Al publicar una nueva compilación del juego:

1. Sube los nuevos archivos de Windows y Android al almacenamiento correspondiente.
2. Sustituye las URL de `src/data/downloads.ts` por enlaces válidos para esos archivos.
3. Actualiza también los tamaños visibles en `src/pages/descargar.astro`, actualmente **39,3 MiB** para Windows y **32,6 MiB** para Android.
4. Comprueba ambas descargas y que las instrucciones siguen correspondiendo a los archivos publicados.
5. Compila y publica la web mediante el despliegue de Cloudflare existente.

Las imágenes de `public/media/` muestran la **versión en desarrollo** del juego. La web lo indica porque su aspecto puede diferir de la compilación descargable. Mantén ese aviso mientras las capturas y las descargas correspondan a versiones distintas. Para renovar una captura, conserva sus variantes de 640 y 1280 píxeles y actualiza los textos alternativos y pies de imagen.

## Movimiento, navegación y galería

El contenido y los enlaces son accesibles sin JavaScript. Los elementos de entrada (`data-hero-reveal`) y de revelado al desplazarse (`data-reveal`) están visibles por defecto. JavaScript activa las animaciones GSAP; el seguimiento del puntero (`data-parallax`) y el desplazamiento sutil de botones (`data-magnetic`) se limitan a dispositivos con puntero fino.

El botón **«Animaciones: sí/no»** del pie permite desactivar el movimiento y restablece las transformaciones y opacidades. La elección se guarda en `localStorage`, con la clave `midnight-of-vein:motion`. Si no hay una elección explícita, se sigue `prefers-reduced-motion` y sus cambios; una elección explícita del usuario tiene prioridad.

El menú móvil utiliza `#menu-toggle` y `#site-nav`, con un cambio a escritorio a los **900 px**. Se cierra al elegir un enlace, pulsar Escape o pasar al tamaño de escritorio.

Los enlaces `data-gallery` apuntan directamente a las capturas completas. Con JavaScript se abren en el diálogo nativo `#gallery-dialog`: botones y flechas del teclado cambian de captura, Escape o el botón de cierre cierran la galería y el foco vuelve a la imagen que la abrió.

Al revisar cambios visuales, comprueba escritorio y móvil, navegación con teclado, ausencia de JavaScript, preferencia de movimiento reducido y ambos enlaces de descarga.

## Tipografías

**Cinzel** y **Barlow** se sirven desde `public/fonts/`, sin peticiones a servicios externos de fuentes. Ambas usan la **SIL Open Font License 1.1**. Sus avisos de autoría y condiciones se conservan en `public/fonts/Cinzel-OFL.txt` y `public/fonts/Barlow-OFL.txt`; mantenlos al distribuir los archivos tipográficos.
