# Source Tree Analysis

**Generated:** 2025-11-22  
**Project:** Texo-web-stylus  
**Type:** Web Application (React + Vite)  
**Scan Level:** Deep  

---

## Complete Directory Structure

```
texo-web-stylus/
├── .bmad/                           # BMad Method framework files
│   ├── bmm/                        # BMM module configurations and workflows
│   │   ├── config.yaml               # BMM configuration (user settings, paths)
│   │   ├── workflows/                # BMM workflow definitions
│   │   │   ├── document-project/     # Documentation generation workflow
│   │   │   ├── workflow-status/      # Workflow tracking system
│   │   │   └── [other workflows]   # Various development workflows
│   │   └── docs/                    # BMM documentation and guides
│   ├── core/                        # Core BMad framework components
│   │   ├── agents/                  # AI agent definitions
│   │   ├── tasks/                   # Reusable task definitions
│   │   ├── tools/                   # Development tools and utilities
│   │   └── workflows/               # Core workflow engine
│   └── _cfg/                       # BMad configuration files
├── .github/                         # GitHub configuration
│   └── workflows/                   # CI/CD workflows
│       └── deploy.yml               # GitHub Pages deployment pipeline
├── docs/                            # Generated documentation (this folder)
│   ├── bmm-*.md                   # Generated BMM documentation files
│   ├── sprint-artifacts/             # Sprint planning and execution artifacts
│   └── [project docs]             # Various project documentation files
├── public/                           # Static assets (served directly)
│   ├── test_img/                   # Test images for OCR functionality
│   └── vite.svg                    # Vite logo (default)
├── src/                              # Main application source code
│   ├── cas/                        # Computer Algebra System (core math engine)
│   │   ├── README.md                # CAS architecture and API documentation
│   │   ├── equivalenceChecker.js     # Two-tier equivalence checking engine
│   │   ├── katexParser.js          # LaTeX → AST parser using KaTeX internals
│   │   └── rules/                  # Rule-based canonicalization system
│   │       ├── algebraRules.js       # Algebraic simplification rules
│   │       ├── ruleEngine.js        # Priority-based rule application engine
│   │       └── trigRules.js         # Trigonometric identity rules
│   ├── components/                 # Reusable React components
│   │   ├── __tests__/              # Component test files
│   │   ├── ErrorBoundary.jsx        # Graceful error handling wrapper
│   │   ├── MagicCanvasToolbar.jsx  # Canvas control toolbar
│   │   ├── RowAnnouncer.jsx        # Accessibility announcements
│   │   ├── RowHeader.jsx          # Row status indicators with highlighting
│   │   ├── RowNavigator.jsx        # Row navigation and management
│   │   └── StatusIcon.jsx         # Visual status indicators
│   ├── contexts/                   # React Context providers
│   │   └── DebugContext.jsx       # Global debug mode state management
│   ├── hooks/                      # Custom React hooks
│   │   ├── __tests__/              # Hook test files
│   │   ├── useRowSystem.js         # Row management system hook
│   │   └── useSafeExcalidraw.js   # Safe Excalidraw integration
│   ├── pages/                      # Main application pages (routes)
│   │   ├── ComposePage.jsx         # ProseMirror math editor with validation
│   │   ├── DatabasePage.jsx        # IndexedDB workspace management
│   │   ├── MagicCanvas.jsx         # Excalidraw canvas with row system
│   │   ├── OCRPage.jsx            # Image upload and OCR processing
│   │   └── SketchPage.jsx         # Stylus input drawing canvas
│   ├── utils/                      # Utility functions and services
│   │   ├── __tests__/              # Utility test files
│   │   ├── contentHash.js          # Content hashing for change detection
│   │   ├── indexedDBCache.js      # Canonical form caching (workspace-based)
│   │   ├── logger.js              # Centralized logging system
│   │   ├── ocrTrigger.js          # OCR processing triggers
│   │   ├── rowManager.js          # Row state management
│   │   ├── scrollToRow.js          # Row scrolling utilities
│   │   ├── spatialMapping.js       # AST → visual position mapping
│   │   └── workspaceDB.js        # IndexedDB workspace persistence
│   ├── workers/                    # Web Workers for background processing
│   │   ├── imageProcessor.js       # Image preprocessing for OCR
│   │   ├── loggingWorker.js        # Async IndexedDB logging
│   │   └── ocrWorker.js          # Transformers.js OCR inference
│   ├── App.jsx                     # Main application router and layout
│   ├── index.css                   # Global CSS styles
│   └── main.jsx                    # Application entry point
├── index.html                       # HTML template for Vite
├── package.json                     # Dependencies and scripts
├── vite.config.js                  # Vite build configuration
├── vitest.config.js                # Test configuration
├── tailwind.config.js               # Tailwind CSS configuration
├── postcss.config.js               # PostCSS configuration
├── run-all-tests.js                # Unified test runner script
└── README.md                       # Project overview and setup guide
```

---

## Critical Folders Analysis

### **src/cas/** - Computer Algebra System
- **Purpose:** Core mathematical processing engine
- **Key Files:**
  - `equivalenceChecker.js` - Two-tier equivalence checking (canonicalization + Algebrite)
  - `katexParser.js` - LaTeX to AST conversion using KaTeX internals
  - `rules/ruleEngine.js` - Priority-based rule application system
- **Architecture:** Fast path (rule-based) + Slow path (Algebrite CAS)
- **Performance:** <50ms canonicalization, 50-500ms Algebrite fallback

### **src/components/** - React UI Components
- **Purpose:** Reusable user interface components
- **Key Components:**
  - `ErrorBoundary.jsx` - Graceful error handling with retry functionality
  - `RowHeader.jsx` - Status indicators with active row highlighting
  - `StatusIcon.jsx` - Visual status indicators (48x48px SVG)
- **Patterns:** Functional components with comprehensive JSDoc documentation
- **Testing:** Vitest tests with jsdom environment

### **src/pages/** - Application Routes
- **Purpose:** Main application pages implementing core features
- **Pages:**
  - `SketchPage.jsx` - Excalidraw canvas for stylus input
  - `OCRPage.jsx` - Image upload and OCR processing
  - `ComposePage.jsx` - ProseMirror editor with real-time validation
  - `DatabasePage.jsx` - IndexedDB workspace management
  - `MagicCanvas.jsx` - Canvas with row-based organization
- **Architecture:** Single Page Application with React Router

### **src/utils/** - Core Utilities
- **Purpose:** Shared utilities and business logic
- **Key Services:**
  - `workspaceDB.js` - IndexedDB persistence (5 specialized stores)
  - `indexedDBCache.js` - Canonical form caching with 7-day TTL
  - `spatialMapping.js` - AST to visual position mapping for error highlighting
  - `logger.js` - Centralized logging with worker-based persistence
- **Patterns:** Async/await with comprehensive error handling

### **src/workers/** - Background Processing
- **Purpose:** Heavy computation off main thread
- **Workers:**
  - `ocrWorker.js` - Transformers.js model inference (~150MB FormulaNet)
  - `imageProcessor.js` - Image preprocessing to 384×384
  - `loggingWorker.js` - Async IndexedDB write operations
- **Communication:** PostMessage API with structured message types

---

## Entry Points

### **Main Entry Point:** `src/main.jsx`
- Imports React and renders App component
- Sets up root DOM element for React application

### **Application Router:** `src/App.jsx`
- React Router v7 configuration with 5 main routes
- Error boundary wrapping for entire application
- Global providers (DebugContext)

### **Build Entry:** `vite.config.js`
- Vite 7.2.4 configuration with React plugin
- Web Worker ES module format
- Excludes @huggingface/transformers from pre-bundling

---

## Architecture Patterns

### **Component Architecture**
- **Pattern:** Functional components with hooks
- **State Management:** React Context + IndexedDB + localStorage hybrid
- **Styling:** Tailwind CSS utility-first approach
- **Error Handling:** Error boundaries with graceful fallbacks

### **Data Flow Architecture**
- **Input:** Stylus/Image → OCR → LaTeX → Editor
- **Processing:** LaTeX → AST → Canonicalization → Equivalence Check
- **Storage:** IndexedDB with workspace isolation and caching
- **Output:** Visual feedback with real-time validation

### **Performance Architecture**
- **Main Thread:** UI rendering and user interactions
- **Worker Threads:** OCR inference, image processing, logging
- **Caching:** Multi-level (canonical forms, model cache, browser cache)
- **Optimization:** Debounced validation (500ms) and lazy loading

---

## Integration Points

### **External Dependencies**
- **HuggingFace:** FormulaNet model download and inference
- **KaTeX:** LaTeX rendering and parsing (internal API usage)
- **Excalidraw:** Canvas drawing and stroke extraction
- **ProseMirror:** Rich text editing with math node support
- **Algebrite:** Computer algebra system fallback

### **Internal Integrations**
- **CAS ↔ Editor:** Real-time equivalence checking with visual feedback
- **OCR ↔ Canvas:** Automatic conversion from drawn equations
- **Storage ↔ All:** Workspace persistence across all features
- **Workers ↔ Main:** Structured message passing for heavy operations

---

## File Organization Patterns

### **Naming Conventions**
- **Components:** PascalCase (RowHeader.jsx, StatusIcon.jsx)
- **Utilities:** camelCase (workspaceDB.js, indexedDBCache.js)
- **Hooks:** use* prefix (useRowSystem.js, useSafeExcalidraw.js)
- **Tests:** *.test.js or *.test.jsx suffix

### **Import Patterns**
- **Absolute imports:** Used for utilities and components
- **Relative imports:** Used for local file relationships
- **Dynamic imports:** Used for Web Workers and large dependencies

### **Export Patterns**
- **Named exports:** Preferred for utilities and hooks
- **Default exports:** Used for React components and main entry points
- **Consistent:** JSDoc documentation for all public APIs

---

## Development Workflow Integration

### **Testing Strategy**
- **Unit Tests:** Vitest with jsdom environment
- **Component Tests:** React Testing Library
- **Manual Tests:** Node.js scripts for CAS validation
- **Coverage:** V8 provider with HTML/JSON reports

### **Build Process**
- **Development:** Vite dev server with HMR
- **Production:** Optimized build to `dist/` folder
- **Deployment:** Static files to GitHub Pages via GitHub Actions

### **Code Quality**
- **Linting:** Implicit through Vite plugin system
- **Type Checking:** JSDoc with TypeScript definitions
- **Documentation:** Comprehensive JSDoc with examples
- **Error Handling:** Graceful degradation with user feedback

---

**Last Updated:** 2025-11-22  
**Scan Level:** Deep (critical files analyzed)  
**Total Files Scanned:** 25+ source files