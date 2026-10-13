# NoteFlow 📝✨

**NoteFlow** es una aplicación web moderna y fluida diseñada para tomar apuntes y editar documentos PDF inspirada en **Free Notes** y **Procreate** para iPad y tablets.

Diseñada con enfoque *mobile-first* y *tablet-first*, compatible con **Apple Pencil**, lápices táctiles (*stylus*), ratón y gestos táctiles.

---

## 🚀 Características Principales

### 🖊️ Lápiz Digital Fluido y Sensibilidad a la Presión
- Soporte para **Apple Pencil** y punteros stylus con modulación dinámica de grosor por presión (`PointerEvents.pressure`).
- Trazo suavizado sin retrasos (*zero lag*) mediante interpolación cuadrática y muestreo de alta tasa de refresco (120Hz/240Hz en iPad Pro).
- Paleta rápida de colores y selectores de grosor personalizables.

### 🟡 Subrayador Inteligente Horizontal (Free Notes Style)
- **Línea recta horizontal perfecta**: al subrayar, bloquea y genera automáticamente una línea recta horizontal en el sentido del trazo, sin inclinaciones.
- **Texto siempre legible por encima**: el subrayador se aplica con modo de fusión *multiply*, manteniendo las letras oscuras y nítidas por encima del color sin taparlas.

### 🧽 Borrador Estilo Procreate
- Borrado tipo pincel con `destination-out`: borra con precisión quirúrgica donde pasas el lápiz o la goma, con tamaños configurables (8px, 16px, 28px, 48px).

### 📜 Desplazamiento Vertical Continuo (Multi-página)
- Al bajar la pantalla se visualizan todas las páginas consecutivas de forma continua.
- Contador dinámico de página con salto directo y botón para añadir nuevas páginas.

### 🖐️ Palm Rejection y Modo Desplazamiento Táctil
- **Deslizar con el dedo desplaza la pantalla**: los dedos mueven el documento sin pintar por error.
- **Solo el Apple Pencil / Stylus dibuja**: experiencia natural idéntica a las mejores apps nativas de iPad.

### 🔤 Cuadros de Texto
- Herramienta para añadir cuadros de texto en cualquier posición de la página, con tamaños de letra y colores ajustables.

### 📓 Cuaderno en Blanco y Plantillas de Papel
- Creación directa de cuadernos de notas sin necesidad de importar archivos.
- Plantillas disponibles:
  - **Blanco**: papel limpio.
  - **Cuadriculado**: ideal para matemáticas y gráficos.
  - **Rayado**: líneas guía para escritura manual.
  - **Puntos**: estilo Bullet Journal.

### 📥 Importación y 📤 Exportación en PDF
- Importación directa de archivos `.pdf` y documentos de texto `.txt`.
- Exportación a PDF de alta resolución con todos los trazos, textos y subrayados combinados en sus respectivas páginas.
- Persistencia local en el navegador (IndexedDB) para no perder tus notas.

---

## 🛠️ Tecnologías

- **React 19** + **TypeScript**
- **Vite**
- **Tailwind CSS**
- **PDF.js** (`pdfjs-dist`) para renderizado de alta fidelidad con Retina/DPR.
- **pdf-lib** para fusión y exportación vectorial de PDFs.
- **Lucide Icons**

---

## 📦 Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en red local (para iPad y PC)
npm run dev -- --host

# Compilar para producción
npm run build
```
