# Texo-web-stylus Documentation Index

**Generated:** 2025-11-13
**Project:** Texo-web-stylus
**Type:** Web Application (Vite + React)
**Scan Level:** Deep

---

## Project Overview

**Texo-web-stylus** is a privacy-first, client-side mathematical OCR application that converts handwritten equations (from stylus input or images) into LaTeX. The application features real-time mathematical equivalence checking using a custom Computer Algebra System (CAS) with rule-based canonicalization and Algebrite fallback.

### Quick Reference

- **Framework:** React 18.3.1 with Vite 6.0.7
- **Language:** JavaScript (ES Modules)
- **Architecture:** Component-based SPA with Web Workers
- **Entry Point:** src/main.jsx → src/App.jsx
- **Pages:** 4 (Sketch, OCR, Compose, Database)
- **Testing:** Vitest with jsdom

### Key Characteristics

- ✅ **Privacy-First:** All processing happens client-side, no server communication
- ✅ **Offline-Capable:** PWA with model caching after first download
- ✅ **Performance-Optimized:** Web Workers for heavy computation
- ✅ **Two-Tier CAS:** Fast canonicalization (<50ms) with Algebrite fallback
- ✅ **Client-Side OCR:** Transformers.js with HuggingFace FormulaNet model (~150MB)

---

## Generated Documentation

### Core Documentation

- **[Architecture](./bmm-architecture.md)** - Complete system architecture, design decisions, and technical details
- **[Component Inventory](./bmm-component-inventory.md)** - All React components with dependencies and usage
- **[UI Components](./bmm-ui-components.md)** - UI structure, styling patterns, and responsive design
- **[State Management](./bmm-state-management.md)** - Hybrid state management (Context + IndexedDB + localStorage)
- **[Development Guide](./bmm-development-guide.md)** - Setup, workflow, testing, and feature development

---

## Existing Documentation

These documents were already part of the project and provide complementary information:

- **[README.md](../README.md)** - Project overview, quick start, and basic usage
- **[CLAUDE.md](../CLAUDE.md)** - Claude Code guidance and detailed project instructions for AI assistants
- **[CANONICALIZATION_GUIDE.md](../CANONICALIZATION_GUIDE.md)** - CAS rules, AST structure, and implementation details
- **[CAS README](../src/cas/README.md)** - CAS architecture, API documentation, and usage examples

---

## Getting Started

### For New Developers

1. **Start Here:**
   - Read [README.md](../README.md) for project overview
   - Review [Development Guide](./bmm-development-guide.md) for setup
   - Explore [Architecture](./bmm-architecture.md) for system design

2. **Understanding the Codebase:**
   - [Component Inventory](./bmm-component-inventory.md) - What components exist
   - [UI Components](./bmm-ui-components.md) - How the UI is structured
   - [State Management](./bmm-state-management.md) - How data flows

3. **Working with Specific Features:**
   - **OCR:** Review SketchPage/OCRPage in Component Inventory + workers/ocrWorker.js
   - **CAS:** Read CANONICALIZATION_GUIDE.md + src/cas/ modules
   - **Equivalence Checking:** Review ComposePage + equivalenceChecker.js
   - **Storage:** Read State Management doc + workspaceDB.js

### For AI Assistants

If you're Claude Code or another AI assistant working on this codebase:

1. **Primary Context Sources:**
   - [CLAUDE.md](../CLAUDE.md) - Your main guidance document
   - [Architecture](./bmm-architecture.md) - System overview
   - [Development Guide](./bmm-development-guide.md) - Practical how-to

2. **For Specific Tasks:**
   - **Adding Features:** Development Guide → "Adding Features" section
   - **Bug Fixes:** Component Inventory → Find relevant module
   - **CAS Work:** CANONICALIZATION_GUIDE.md + Architecture → CAS section
   - **UI Changes:** UI Components doc + Tailwind conventions

---

## Project Structure

```
texo-web-stylus/
├── src/
│   ├── App.jsx                    # Main router with 4 pages
│   ├── main.jsx                   # Application entry point
│   ├── pages/
│   │   ├── SketchPage.jsx        # Excalidraw canvas for stylus input
│   │   ├── OCRPage.jsx           # Image upload/paste for OCR
│   │   ├── ComposePage.jsx       # ProseMirror editor with equivalence checking
│   │   └── DatabasePage.jsx      # IndexedDB workspace management
│   ├── cas/                       # Computer Algebra System
│   │   ├── equivalenceChecker.js # Two-tier equivalence checking
│   │   ├── katexParser.js        # LaTeX → AST parser
│   │   └── rules/
│   │       ├── ruleEngine.js     # Priority-based rule system
│   │       ├── algebraRules.js   # Algebraic simplification rules
│   │       └── trigRules.js      # Trigonometric identity rules
│   ├── contexts/
│   │   └── DebugContext.jsx      # Global debug mode state
│   ├── utils/
│   │   ├── workspaceDB.js        # IndexedDB session persistence
│   │   ├── indexedDBCache.js     # Canonical form caching
│   │   ├── spatialMapping.js     # AST → visual position mapping
│   │   └── logger.js             # Centralized logging system
│   └── workers/
│       ├── ocrWorker.js          # Transformers.js inference worker
│       ├── imageProcessor.js     # Image preprocessing worker
│       └── loggingWorker.js      # Async logging worker
├── docs/                          # Generated documentation (this folder)
├── public/                        # Static assets
├── CLAUDE.md                      # AI assistant guidance
├── CANONICALIZATION_GUIDE.md      # CAS implementation details
├── README.md                      # Project overview
├── package.json                   # Dependencies and scripts
├── vite.config.js                 # Vite configuration
├── vitest.config.js               # Test configuration
└── tailwind.config.js             # Styling configuration
```

---

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Build Tool** | Vite | 6.0.7 | Dev server & build system |
| **Framework** | React | 18.3.1 | UI library |
| **Router** | React Router DOM | 7.1.1 | Client-side routing |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first CSS |
| **Math Rendering** | KaTeX | 0.16.11 | LaTeX rendering |
| **Text Editor** | ProseMirror | 1.x | Rich text editing |
| **Math Editor** | @benrbray/prosemirror-math | 1.0.0 | Math editing |
| **Drawing** | Excalidraw | 0.18.0 | Canvas-based drawing |
| **CAS Engine** | Algebrite | 1.4.0 | Computer algebra system |
| **ML/OCR** | @huggingface/transformers | 3.2.3 | Client-side ML inference |
| **Image Processing** | image-js | 0.35.6 | Image manipulation |
| **Testing** | Vitest | 2.1.8 | Test framework |

---

## Key Features

### 1. Multi-Input Mathematical OCR
- **Sketch Canvas:** Excalidraw-based drawing with stylus support
- **Image Upload:** Drag & drop, paste, or file upload
- **Model:** FormulaNet (~150MB, cached after first download)
- **Output:** LaTeX strings with high accuracy

### 2. Real-Time Equivalence Checking
- **Editor:** ProseMirror with math node support
- **Two-Tier System:**
  - Fast Path: Rule-based canonicalization (<50ms, ~90% coverage)
  - Slow Path: Algebrite CAS (50-500ms, complex cases)
- **Visual Feedback:** Inline decorations (green/red borders)
- **Debugging:** Optional detailed result display

### 3. Intelligent Caching
- **Canonical Forms:** 7-day TTL with workspace isolation
- **Cache Hit Rate:** Typically >70% for repeated expressions
- **Performance:** <1ms cache lookups
- **Storage:** IndexedDB with 5 specialized stores

### 4. Workspace Management
- **Multi-Workspace:** Isolated data per workspace
- **Import/Export:** JSON-based backup/restore
- **Diagnostics:** Comprehensive logging system
- **Storage Tracking:** Quota monitoring and management

---

## Development Workflow

### Prerequisites
```bash
Node.js 18+ (recommended: LTS)
npm or pnpm
```

### Basic Commands
```bash
npm install           # Install dependencies
npm run dev           # Start dev server at localhost:5173
npm run build         # Production build to dist/
npm run preview       # Test production build locally
```

### Testing
```bash
npm test                      # Run all Vitest tests
npm run test:watch            # Watch mode for test development
npm run test:equivalence      # Run only equivalence checker tests
npm run test:manual           # Run manual CAS tests (Node.js based)
npm run test:all              # Run equivalence + manual tests
npm run test:unified          # Run all tests with unified output
```

---

## Architecture Highlights

### Component-Based SPA
- **Router:** React Router v7 with 4 main pages
- **State:** Hybrid (Context + IndexedDB + localStorage)
- **Styling:** Tailwind CSS with utility-first approach

### Web Worker Architecture
- **OCR Worker:** Transformers.js model inference (1-3s per image)
- **Image Processor:** Preprocessing to 384×384 grayscale
- **Logging Worker:** Async IndexedDB writes

### Two-Tier CAS
1. **Fast Path (Rule Engine):**
   - 14 rules (9 algebra, 5 trig)
   - Priority-based application
   - Fixpoint detection
   - Regional notation support (US/UK/EU)

2. **Slow Path (Algebrite):**
   - Symbolic computation
   - Difference method + simplification method
   - 2-second timeout
   - Floating-point tolerance (1e-6)

### IndexedDB Stores
1. **workspaces:** Workspace metadata
2. **cas-cache:** Canonical forms with TTL
3. **session-state:** User preferences
4. **diagnostic-logs:** Structured logging
5. **transformers-cache:** Model cache metadata

---

## Performance Characteristics

| Operation | Target | Notes |
|-----------|--------|-------|
| Canonicalization | <50ms | Fast path |
| Algebrite fallback | 50-500ms | Slow path, 2s timeout |
| OCR inference | 1-3s | After model load |
| Model download | 30-60s | One-time, ~150MB |
| Cache lookup | <1ms | IndexedDB hit |
| Editor re-render | <16ms | 60fps target |
| Validation debounce | 500ms | Configurable |

---

## Use Cases

### Primary Use Cases
1. **Math Problem Solving:** Handwrite equations, verify step-by-step equivalence
2. **Math Note-Taking:** Draw formulas, convert to LaTeX, validate work
3. **Formula Digitization:** Convert paper/whiteboard math to digital LaTeX
4. **Educational Tool:** Practice algebra with real-time feedback

### Target Users
- Students learning algebra, calculus, and higher math
- Educators creating math content
- Researchers digitizing handwritten formulas
- Anyone needing privacy-preserving math OCR

---

## Common Workflows

### Workflow 1: Sketch → OCR → Verify
1. Open SketchPage
2. Draw equation in bounding box
3. Wait for auto-convert (5s) or click "Convert"
4. Copy LaTeX to clipboard
5. Paste into ComposePage to verify

### Workflow 2: Image → OCR → Edit
1. Open OCRPage
2. Upload/paste/drag image
3. Review OCR result
4. Copy LaTeX
5. Edit in external tool or ComposePage

### Workflow 3: Manual Entry → Equivalence Check
1. Open ComposePage
2. Type math expressions using `$$...$$` for display math
3. Watch real-time validation (500ms debounce)
4. Green border = equivalent to previous line
5. Red border = not equivalent (check work)

### Workflow 4: Debugging CAS
1. Open ComposePage
2. Enable Debug Mode (green toggle)
3. Optionally enable Force Algebrite (orange checkbox)
4. View detailed results (method, time, canonical forms)
5. Check Database page for cache stats and logs

---

## Troubleshooting

### Common Issues

**Issue:** Model download fails or hangs
**Solution:** Check network, try CN mirror, clear transformers-cache

**Issue:** OCR produces incorrect LaTeX
**Solution:** Ensure clear handwriting, proper bounding box, good contrast

**Issue:** Equivalence check says non-equivalent but expressions match
**Solution:** Enable forceAlgebrite mode, check logs, report false negative

**Issue:** App slow or freezes during validation
**Solution:** Check cache stats, clear CAS cache, reduce max iterations

**Issue:** IndexedDB quota exceeded
**Solution:** Open Database page, check storage, clear old workspaces/logs

**Issue:** Web Worker not loading
**Solution:** Check browser console, verify Vite config, rebuild

For more troubleshooting, see [Development Guide](./bmm-development-guide.md#troubleshooting).

---

## Contributing

### Before Contributing
1. Read [Development Guide](./bmm-development-guide.md)
2. Review [Architecture](./bmm-architecture.md) for design patterns
3. Check existing [Component Inventory](./bmm-component-inventory.md)

### Adding Features
- **New Page:** See Development Guide → Adding Features → New Page
- **New Worker:** See Development Guide → Adding Features → New Worker
- **New CAS Rule:** See CANONICALIZATION_GUIDE.md + Development Guide
- **New Context:** See Development Guide → Adding Features → New Context

### Code Conventions
- Use functional components with hooks
- Follow Tailwind utility-first styling
- Write tests for CAS rules and utilities
- Document complex algorithms
- Add performance measurements for heavy operations

---

## License

AGPL-3.0 (inherited from original Texo project by Sicheng Mao)

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-13 | 1.0.0 | Initial documentation generation (Deep scan) |

---

## Related Resources

### External Links
- [Original Texo Project](https://github.com/alephpi/Texo/) by Sicheng Mao
- [Transformers.js](https://huggingface.co/docs/transformers.js/) - Client-side ML
- [Excalidraw](https://excalidraw.com/) - Drawing library
- [ProseMirror](https://prosemirror.net/) - Editor framework
- [KaTeX](https://katex.org/) - Math rendering
- [Algebrite](http://algebrite.org/) - Computer algebra system

### Documentation Standards
This documentation follows the **BMad Method (BMM)** documentation standards for brownfield projects, emphasizing:
- Comprehensive codebase analysis
- AI-friendly structure and clarity
- Practical developer guidance
- Integration with existing project docs

---

**Last Updated:** 2025-11-13
**Documentation Generator:** BMad Method document-project workflow (v1.2.0)
**Scan Level:** Deep (reads critical files)
