# Project Overview

**Generated:** 2025-11-22  
**Project:** Texo-web-stylus  
**Type:** Web Application (Vite + React)  
**Scan Level:** Deep  
**Workflow Mode:** Full Rescan  

---

## Executive Summary

**Texo-web-stylus** is a privacy-first, client-side mathematical OCR application that converts handwritten equations (from stylus input or images) into LaTeX. The application features real-time mathematical equivalence checking using a custom Computer Algebra System (CAS) with rule-based canonicalization and Algebrite fallback.

This React rewrite enhances the original Vue.js application with stylus-first canvas input, live stroke preview, and maintains the core promise of zero-server, zero-telemetry mathematical processing entirely within the browser.

---

## Quick Reference

| Category | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Build Tool** | Vite | 7.2.4 | Dev server & build system |
| **Framework** | React | 19.2.0 | UI library |
| **Router** | React Router DOM | 7.9.6 | Client-side routing |
| **Styling** | Tailwind CSS | 4.1.17 | Utility-first CSS |
| **Math Rendering** | KaTeX | 0.16.25 | LaTeX rendering |
| **Text Editor** | ProseMirror | 1.x | Rich text editing |
| **Math Editor** | @benrbray/prosemirror-math | 1.0.0 | Math editing |
| **Drawing** | Excalidraw | 0.18.0 | Canvas-based drawing |
| **CAS Engine** | Algebrite | 1.4.0 | Computer algebra system |
| **ML/OCR** | @huggingface/transformers | 3.8.0 | Client-side ML inference |
| **Image Processing** | image-js | 1.2.0 | Image manipulation |
| **Testing** | Vitest | 4.0.13 | Test framework |

---

## Key Characteristics

### **Privacy-First Architecture**
- ✅ **All processing happens client-side** - No server communication
- ✅ **Zero telemetry** - No usage data collection or tracking
- ✅ **Offline-capable** - PWA with model caching after first download
- ✅ **Data ownership** - All data stored locally in browser

### **Performance-Optimized Design**
- ✅ **Web Workers** - Heavy computation off main thread
- ✅ **Two-Tier CAS** - Fast canonicalization (<50ms) with Algebrite fallback
- ✅ **Intelligent Caching** - Multi-level caching with 7-day TTL
- ✅ **Lazy Loading** - On-demand model and resource loading

### **Advanced Mathematical Processing**
- ✅ **Rule-Based Canonicalization** - 14 rules for ~90% of high-school algebra
- ✅ **Symbolic Computation** - Algebrite CAS for complex expressions
- ✅ **Real-Time Validation** - 500ms debounced equivalence checking
- ✅ **Visual Error Highlighting** - AST to visual position mapping

### **Modern User Experience**
- ✅ **Stylus Input** - Pressure-sensitive drawing with natural handwriting
- ✅ **Image OCR** - Drag-drop, paste, or file upload for equation recognition
- ✅ **Live Preview** - See cropped image before OCR processing
- ✅ **Math Editor** - ProseMirror with inline/display math support

---

## Architecture Overview

### **Application Type**
- **Pattern:** Component-based Single Page Application (SPA)
- **State Management:** Hybrid (React Context + IndexedDB + localStorage)
- **Styling:** Tailwind CSS utility-first approach
- **Build System:** Vite with ES modules and Web Workers

### **Core Technologies**

#### **Frontend Stack**
- **React 19.2.0** - Modern UI framework with concurrent features
- **Vite 7.2.4** - Fast development server and optimized builds
- **Tailwind CSS 4.1.17** - Utility-first styling with responsive design
- **React Router 7.9.6** - Client-side routing with 5 main pages

#### **Mathematical Processing**
- **KaTeX 0.16.25** - Fast LaTeX rendering and parsing
- **Algebrite 1.4.0** - Computer algebra system for symbolic computation
- **Custom CAS** - Rule-based canonicalization engine with 14 priority rules
- **ProseMirror** - Rich text editor with math node support

#### **Machine Learning**
- **Transformers.js 3.8.0** - Client-side ML inference
- **FormulaNet Model** - ~150MB mathematical OCR model (HuggingFace)
- **Web Workers** - Background processing for OCR and image manipulation
- **Image Processing** - Preprocessing to 384×384 grayscale for model input

#### **Data Persistence**
- **IndexedDB** - Client-side database with 5 specialized stores
- **Workspace Management** - Multi-workspace isolation with import/export
- **Caching System** - Canonical form caching with 7-day TTL
- **Logging System** - Structured logging with worker-based persistence

---

## Repository Structure

### **Monolithic Architecture**
This is a **single-part application** with cohesive codebase organization:

```
texo-web-stylus/
├── src/                        # Main application source code
│   ├── cas/                   # Computer Algebra System
│   ├── components/              # Reusable React components
│   ├── contexts/               # React Context providers
│   ├── hooks/                  # Custom React hooks
│   ├── pages/                  # Application routes (5 pages)
│   ├── utils/                  # Utilities and services
│   ├── workers/                # Web Workers for background tasks
│   ├── App.jsx                 # Main router
│   └── main.jsx                # Entry point
├── docs/                       # Generated documentation
├── public/                     # Static assets
├── .github/workflows/           # CI/CD pipelines
└── Configuration files          # package.json, vite.config.js, etc.
```

### **Entry Points**
- **Application:** `src/main.jsx` → `src/App.jsx`
- **Build:** Vite configuration in `vite.config.js`
- **Tests:** Vitest configuration in `vitest.config.js`

---

## Core Features

### **1. Multi-Input Mathematical OCR**
- **Stylus Canvas:** Excalidraw-based drawing with pressure sensitivity
- **Image Upload:** Drag & drop, paste, or file upload support
- **Model:** FormulaNet (~150MB, cached after first download)
- **Output:** High-accuracy LaTeX strings with confidence indicators

### **2. Real-Time Equivalence Checking**
- **Editor:** ProseMirror with math node support (`$...$` and `$$...$$`)
- **Two-Tier System:**
  - **Fast Path:** Rule-based canonicalization (<50ms, ~90% coverage)
  - **Slow Path:** Algebrite CAS fallback (50-500ms, complex cases)
- **Visual Feedback:** Inline decorations (green/red borders)
- **Debugging:** Optional detailed result display with performance metrics

### **3. Intelligent Caching System**
- **Canonical Forms:** 7-day TTL with workspace isolation
- **Cache Hit Rate:** Typically >70% for repeated expressions
- **Performance:** <1ms cache lookups with IndexedDB
- **Storage:** 5 specialized stores for different data types

### **4. Workspace Management**
- **Multi-Workspace:** Isolated data per workspace
- **Import/Export:** JSON-based backup and restore
- **Diagnostics:** Comprehensive logging system with filtering
- **Storage Tracking:** Quota monitoring and management tools

---

## Performance Characteristics

| Operation | Target | Notes |
|-----------|--------|-------|
| **Canonicalization** | <50ms | Fast path for ~90% of expressions |
| **Algebrite Fallback** | 50-500ms | Slow path with 2s timeout |
| **OCR Inference** | 1-3s | After model download |
| **Model Download** | 30-60s | One-time, ~150MB |
| **Cache Lookup** | <1ms | IndexedDB hit |
| **UI Re-render** | <16ms | 60fps target |
| **Validation Debounce** | 500ms | Configurable |

---

## Development Workflow

### **Prerequisites**
```bash
Node.js 18+ (recommended: LTS)
npm or pnpm
Modern browser with Web Workers and IndexedDB
```

### **Quick Start**
```bash
git clone https://github.com/your-username/texo-web-stylus.git
cd texo-web-stylus
npm install
npm run dev    # http://localhost:5173
```

### **Testing**
```bash
npm test                      # Run all Vitest tests
npm run test:watch            # Watch mode for test development
npm run test:equivalence      # Run only equivalence checker tests
npm run test:manual           # Run manual CAS tests (Node.js based)
npm run test:all              # Run equivalence + manual tests
```

### **Build & Deploy**
```bash
npm run build        # Production build to dist/
npm run preview      # Test production build locally
```
**Deployment:** Automatic to GitHub Pages via GitHub Actions

---

## Use Cases and Target Users

### **Primary Use Cases**
1. **Math Problem Solving** - Handwrite equations, verify step-by-step equivalence
2. **Math Note-Taking** - Draw formulas, convert to LaTeX, validate work
3. **Formula Digitization** - Convert paper/whiteboard math to digital LaTeX
4. **Educational Tool** - Practice algebra with real-time feedback

### **Target Users**
- **Students** learning algebra, calculus, and higher mathematics
- **Educators** creating math content and verifying student work
- **Researchers** digitizing handwritten formulas and equations
- **Privacy-conscious users** needing mathematical OCR without cloud services

---

## Integration Points

### **External Dependencies**
- **HuggingFace** - FormulaNet model download and inference
- **KaTeX Project** - LaTeX rendering and parsing (internal API usage)
- **Excalidraw** - Canvas drawing and stroke extraction
- **ProseMirror** - Rich text editing with math node support
- **Algebrite Project** - Computer algebra system fallback

### **Internal Architecture**
- **CAS ↔ Editor** - Real-time equivalence checking with visual feedback
- **OCR ↔ Canvas** - Automatic conversion from drawn equations
- **Storage ↔ All** - Workspace persistence across all features
- **Workers ↔ Main** - Structured message passing for heavy operations

---

## Documentation Structure

This project uses comprehensive documentation optimized for AI-assisted development:

### **Generated Documentation** (this folder)
- **[index.md](./index.md)** - Master navigation and quick reference
- **[architecture.md](./architecture.md)** - Complete system architecture
- **[development-guide.md](./development-guide.md)** - Setup and workflow
- **[component-inventory.md](./component-inventory.md)** - All React components
- **[state-management.md](./state-management.md)** - State management patterns
- **[ui-components.md](./ui-components.md)** - UI structure and styling

### **Existing Project Documentation**
- **[README.md](../README.md)** - Project overview and quick start
- **[CLAUDE.md](../CLAUDE.md)** - AI assistant development guidance
- **[CANONICALIZATION_GUIDE.md](../CANONICALIZATION_GUIDE.md)** - CAS implementation details
- **[src/cas/README.md](../src/cas/README.md)** - CAS architecture and API

---

## AI-Assisted Development

This documentation is structured for optimal use with AI assistants like Claude Code:

### **Primary Context Sources**
1. **[CLAUDE.md](../CLAUDE.md)** - Your main guidance document
2. **[Architecture](./architecture.md)** - System overview and design decisions
3. **[Development Guide](./development-guide.md)** - Practical how-to instructions

### **For Specific Tasks**
- **Adding Features:** Development Guide → "Adding Features" section
- **Bug Fixes:** Component Inventory → Find relevant module
- **CAS Work:** CANONICALIZATION_GUIDE.md + Architecture → CAS section
- **UI Changes:** UI Components doc + Tailwind conventions

### **Best Practices**
- **Start Here:** Read CLAUDE.md first for project context
- **Understand Architecture:** Review architecture.md before major changes
- **Follow Patterns:** Use existing code patterns and conventions
- **Test Thoroughly:** Run equivalence tests for CAS changes

---

## License and Credits

### **License**
- **AGPL-3.0** - Inherited from original Texo project by Sicheng Mao

### **Key Credits**
- **Original Texo Project:** Sicheng Mao - FormulaNet model and Vue implementation
- **FormulaNet Model:** HuggingFace - Mathematical OCR model
- **React Fork:** Current maintainers - React rewrite with enhanced features

---

**Last Updated:** 2025-11-22  
**Documentation Generator:** BMad Method document-project workflow (v1.2.0)  
**Scan Level:** Deep (critical files analyzed)