# Texo Demo - From Sketch to LaTeX in Seconds

Draw an equation with your stylus—or drop an Excalidraw scene—and watch Texo turn it into production-ready LaTeX. This React rewrite adds stylus and whiteboard support to the original privacy-first, browser-only OCR engine created (and model-fine-tuned) by Sicheng Mao.

**OCR model**: [alephpi/Texo](https://github.com/alephpi/Texo/)  
**Original Vue app**: [alephpi/Texo-web](https://github.com/alephpi/Texo-web/)

## What’s New in the React Fork

- **Stylus-first canvas** – draw formulas naturally on pressure-sensitive surfaces (Wacom, iPad, Surface, etc.)
- **Live stroke preview** – see the cropped image that will be sent to the model before you hit “Recognize”
- **Same offline promise** – all ink processing and recognition still run locally via Transformers.js and Web Workers

## Core Features

- Zero-server, zero-telemetry OCR
- Sub-second inference after first model download (~150 MB)
- Copy-paste, drag-drop, or upload any image
- Built-in KaTeX editor for inline (`$…$`) and display (`$$…$$`) math
- Responsive PWA shell—works offline once cached

## Quick Start

```bash
npm install
npm run dev          # localhost:5173
npm run build        # production bundle
npm run preview      # local prod test
```
## Usage Flow

1. **Draw** – open “Recognize”, pick the stylus icon, scribble your formula
2. **Refine** – lasso or erase strokes; Texo auto-crops the bounding box
3. **Import** – alternatively drop an Excalidraw file; math strokes are separated from arrows, text, and diagrams
4. **Copy** – hit “Recognize”, get LaTeX, paste into the Compose tab or your document

## Model & Credits

FormulaNet fine-tuning and the original vuejs implementaation: Sicheng Mao  
License: retained AGPL (see LICENSE)
