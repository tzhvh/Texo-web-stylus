# Architecture Documentation

**Generated:** 2025-11-22  
**Project:** Texo-web-stylus  
**Type:** Web Application (React + Vite)  
**Architecture Pattern:** Component-based SPA with Web Workers  

---

## Executive Summary

**Texo-web-stylus** implements a sophisticated client-side mathematical processing architecture combining modern web technologies with advanced computer algebra systems. The architecture prioritizes privacy, performance, and offline capability through intelligent use of Web Workers, IndexedDB storage, and a two-tier equivalence checking system.

The application processes handwritten mathematical inputs through OCR, converts them to LaTeX, and provides real-time equivalence checking using a hybrid approach of fast rule-based canonicalization and symbolic computation fallback.

---

## Executive Summary

### Project Purpose and Vision

Texo-web-stylus is a privacy-first, browser-native mathematical OCR application that converts handwritten equations into LaTeX. Built as a React rewrite of the original Vue.js implementation by Sicheng Mao, it adds stylus and whiteboard support while maintaining the core privacy-first philosophy: **zero server communication, zero telemetry, all processing client-side**.

The vision is to provide mathematicians, students, and educators with a tool that respects their privacy while offering professional-grade equation recognition through natural input methods (stylus, image upload, or paste).

### Key Capabilities

1. **Mathematical OCR**: Convert handwritten equations to LaTeX using the FormulaNet model (~150 MB)
2. **Stylus-First Drawing**: Native support for pressure-sensitive surfaces (Wacom, iPad, Surface)
3. **Real-Time Equivalence Checking**: Two-tier CAS system validates mathematical expressions with sub-second response
4. **Offline-First PWA**: Works completely offline after initial model download
5. **Workspace Management**: Multiple isolated workspaces with IndexedDB persistence
6. **Advanced Math Editing**: ProseMirror-based editor with inline (`$...$`) and display (`$$...$$`) math support

### Target Users

- **Students**: Quick conversion of handwritten homework to digital LaTeX
- **Educators**: Creating digital course materials from whiteboard annotations
- **Researchers**: Converting paper notes to publishable LaTeX documents
- **Privacy-Conscious Users**: Anyone requiring guaranteed offline, telemetry-free mathematical computing

---

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Core Framework** | React | 18.3.1 | UI component framework |
| **Build Tool** | Vite | 6.0.7 | Development server and production bundler |
| **Routing** | react-router-dom | 7.1.1 | Multi-page SPA navigation |
| **Canvas Drawing** | @excalidraw/excalidraw | 0.18.0 | Stylus input and stroke capture |
| **Rich Text Editing** | ProseMirror (multiple packages) | 1.x | Extensible rich text editor |
| **Math Editing** | @benrbray/prosemirror-math | 1.0.0 | Math node types and keybindings for ProseMirror |
| **Math Rendering** | KaTeX | 0.16.11 | LaTeX rendering and AST parsing |
| **react-katex** | react-katex | 3.0.1 | React components for KaTeX |
| **ML Inference** | @huggingface/transformers | 3.2.3 | Client-side model loading and inference (Transformers.js) |
| **Computer Algebra** | Algebrite | 1.4.0 | Symbolic mathematics fallback engine |
| **Image Processing** | image-js | 0.35.6 | Canvas preprocessing for OCR |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first CSS framework |
| **Testing** | Vitest | 2.1.8 | Unit testing framework |
| **Test Environment** | jsdom | 25.0.1 | DOM simulation for tests |

**Total Dependencies**: 15 production, 6 development

---

## Architecture Overview

### System Architecture

Texo-web-stylus is a **component-based Single Page Application (SPA)** with the following architectural principles:

1. **Client-Side Only**: No backend infrastructure. All computation happens in the browser using Web Workers
2. **Privacy-First Design**: No external API calls (except one-time HuggingFace model download), no analytics, no tracking
3. **Offline-First PWA**: Fully functional after initial model cache, with service worker caching
4. **Worker-Based Concurrency**: Heavy computations isolated to Web Workers to maintain UI responsiveness
5. **IndexedDB Persistence**: All user data stored locally with workspace isolation

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Environment                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Main Thread (React App)                   │  │
│  │                                                         │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │ SketchPage  │  │  OCRPage     │  │ ComposePage  │ │  │
│  │  │ (Excalidraw)│  │ (Upload)     │  │ (ProseMirror)│ │  │
│  │  └─────────────┘  └──────────────┘  └──────────────┘ │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │        CAS System (Rule Engine + Algebrite)     │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                                │
│                             │ postMessage()                  │
│                             ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Web Workers                           │  │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────┐ │  │
│  │  │ OCR Worker   │  │ Image Processor│  │ Log Worker │ │  │
│  │  │(Transformers)│  │ (Preprocessing)│  │ (Async IO) │ │  │
│  │  └──────────────┘  └───────────────┘  └────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                                │
│                             │ IndexedDB API                  │
│                             ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               IndexedDB (5 Object Stores)              │  │
│  │  • workspaces  • cas-cache  • session-state            │  │
│  │  • diagnostic-logs  • transformers-cache               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Patterns

#### 1. React Component Hierarchy

```
main.jsx (entry point)
  └── App.jsx (router + DebugContext provider)
      ├── SketchPage.jsx (Excalidraw canvas + OCR trigger)
      ├── OCRPage.jsx (Image upload/paste + OCR trigger)
      ├── ComposePage.jsx (ProseMirror editor + equivalence checking)
      └── DatabasePage.jsx (IndexedDB viewer/manager)
```

**State Management**:
- **Global State**: `DebugContext` (React Context) for debug mode toggle
- **Local State**: Component-level `useState` for UI state
- **Persistent State**: IndexedDB via `workspaceDB.js` for user data
- **Preferences**: `localStorage` for UI preferences (workspace selection, theme)

#### 2. Web Worker Architecture for Heavy Compute

All blocking operations run off the main thread to maintain 60fps UI:

**OCR Worker** (`src/workers/ocrWorker.js`):
- Loads FormulaNet model from HuggingFace (~150 MB, one-time download)
- Runs inference on 384×384 grayscale images
- Reports progress during model download
- **Message Protocol**:
  - `init` → loads model, responds with `ready`
  - `recognize` → runs inference, responds with `result` (LaTeX string)
  - `progress` → emitted during model download

**Image Processor** (`src/workers/imageProcessor.js`):
- Crops images to bounding box
- Converts to grayscale
- Resizes to 384×384 for model input
- Uses `image-js` library for transformations

**Logging Worker** (`src/workers/loggingWorker.js`):
- Buffers log entries to avoid main thread blocking
- Persists to IndexedDB `diagnostic-logs` store
- Provides query interface for Database page

#### 3. IndexedDB for Persistence

**Database**: `texo-workspace-db` (version 1)

**5 Object Stores**:

1. **workspaces** (keyPath: `id`)
   - Stores workspace metadata (name, description, creation timestamp)
   - Indices: `name`, `createdAt`

2. **cas-cache** (keyPath: `[workspaceId, latex]`)
   - Caches canonicalized LaTeX expressions
   - Stores: `{ workspaceId, latex, canonical, timestamp, metadata }`
   - Indices: `workspaceId`, `timestamp`, `canonical`
   - **TTL**: 7 days (configurable)

3. **session-state** (keyPath: `[workspaceId, key]`)
   - Persists session configuration (debug mode, validation settings, CAS parameters)
   - Default values defined in `DEFAULT_SESSION_STATE` object
   - Indices: `workspaceId`

4. **diagnostic-logs** (keyPath: `id`, autoIncrement)
   - Stores application logs for debugging
   - Stores: `{ id, workspaceId, level, category, message, metadata, timestamp }`
   - Indices: `workspaceId`, `timestamp`, `level`, `category`

5. **transformers-cache** (keyPath: `[workspaceId, key]`)
   - Metadata for cached Transformers.js model artifacts
   - Indices: `workspaceId`, `timestamp`

**Workspace Isolation**: All stores (except `workspaces`) are scoped by `workspaceId` to enable multi-workspace support.

#### 4. Two-Tier CAS System

The Computer Algebra System uses a **fast path / slow path** architecture:

```
LaTeX Input
    │
    ▼
KaTeX Parser (katexParser.js)
    │
    ▼
AST (Abstract Syntax Tree)
    │
    ▼
┌─────────────────────────────────────────────────┐
│  FAST PATH: Rule-Based Canonicalization        │
│  • Priority-ordered rule application            │
│  • Fixpoint detection                           │
│  • Target: <50ms                                │
│  • Coverage: ~90% of high-school algebra        │
└─────────────────────────────────────────────────┘
    │
    ▼
String Comparison
    │
    ├─── Match? ──→ Return "equivalent" ✓
    │
    └─── No Match ──→ SLOW PATH
                       │
                       ▼
            ┌──────────────────────────────────────┐
            │  Algebrite CAS Fallback              │
            │  • Difference method: (expr1-expr2≈0)│
            │  • Simplification method              │
            │  • Timeout: 2000ms                   │
            │  • Coverage: Advanced algebra        │
            └──────────────────────────────────────┘
                       │
                       ▼
            Return "equivalent" or "not equivalent"
```

**Design Rationale**: Most student/educator equivalence checks involve basic algebra (polynomials, fractions, simple trig). The rule engine handles these in 1-50ms. Complex cases (advanced trig identities, logarithms, calculus) fall back to Algebrite's symbolic engine.

---

## Component Architecture

### Application Structure

**Entry Point Flow**:
```
main.jsx
  → ReactDOM.createRoot(document.getElementById('root'))
  → <React.StrictMode><App /></React.StrictMode>
```

**App.jsx**: Root component with routing
```jsx
<DebugProvider>
  <Router>
    <Routes>
      <Route path="/" element={<SketchPage />} />
      <Route path="/ocr" element={<OCRPage />} />
      <Route path="/compose" element={<ComposePage />} />
      <Route path="/database" element={<DatabasePage />} />
    </Routes>
  </Router>
</DebugProvider>
```

**Global State**: `DebugContext.jsx`
```javascript
// Provides debug mode toggle to all components
const DebugContext = createContext({
  debugMode: false,
  setDebugMode: () => {}
});
```

### Page Components

#### SketchPage.jsx
**Purpose**: Stylus-first equation drawing using Excalidraw canvas

**Key Features**:
- Excalidraw integration for stroke capture
- Freedraw element extraction (filters out text, arrows, shapes)
- Bounding box visualization (384×384 at coords [50, 50])
- Canvas-to-bitmap conversion
- OCR worker communication

**User Flow**:
1. User draws equation with stylus
2. App extracts freedraw strokes
3. Converts to 384×384 bitmap
4. Sends to OCR worker
5. Displays LaTeX result

#### OCRPage.jsx
**Purpose**: Image-based OCR via upload, drag-drop, or paste

**Key Features**:
- Multiple input methods (upload, drag-drop, clipboard paste)
- Canvas preview with bounding box overlay
- Image processor worker communication
- LaTeX result display with copy button

**User Flow**:
1. User provides image (upload/paste/drop)
2. Image processor crops and preprocesses
3. OCR worker recognizes formula
4. LaTeX displayed with copy button

#### ComposePage.jsx
**Purpose**: Rich text math editor with real-time equivalence checking

**Key Features**:
- ProseMirror editor with math plugins
- Inline (`$...$`) and display (`$$...$$`) math nodes
- Real-time equivalence checking (500ms debounce)
- Visual error highlighting via decorations
- **Force Algebrite Mode**: Orange toggle to bypass canonicalization
- Debug panel showing canonicalized forms and timing

**Architecture**:
```
ProseMirror Editor
  ├── Math Plugin (@benrbray/prosemirror-math)
  ├── History Plugin (undo/redo)
  ├── Keymap Plugin (custom keybindings)
  └── Equivalence Checker Plugin (custom)
      └── Decoration System (error highlighting)
```

**Equivalence Checking Flow**:
1. User types LaTeX: `2x + 3x`
2. 500ms debounce timer starts
3. After timer: parse LaTeX → AST
4. Canonicalize both expressions
5. Compare canonical strings
6. If mismatch: try Algebrite fallback
7. Apply visual highlighting for errors

**Force Algebrite Mode**:
- UI: Orange checkbox in header
- Effect: Skips rule-based canonicalization, goes straight to Algebrite
- Side effects: Disables cache, 10-50x slower
- Use cases: Debugging rules, verifying complex expressions

#### DatabasePage.jsx
**Purpose**: IndexedDB workspace management and diagnostics

**Key Features**:
- Workspace switcher/creator
- Cache statistics display (entry counts, age)
- Manual cache clearing (CAS, Transformers)
- Diagnostic log viewer (filterable by level/category)
- Storage quota display
- Export/import workspace data as JSON

---

## CAS (Computer Algebra System) Architecture

### Two-Tier System Design

#### Fast Path: Rule-Based Canonicalization

**Location**: `src/cas/rules/`

**Goal**: Transform semantically equivalent expressions into **identical canonical forms** through deterministic rule application.

**Components**:

1. **Rule Engine** (`ruleEngine.js`)
   - Priority-based rule dispatcher
   - Fixpoint detection (stops when AST stops changing)
   - Regional notation support (US, UK, EU)
   - Traverses AST recursively applying rules

2. **Algebra Rules** (`algebraRules.js`) - 9 rules:
   - `flatten-addition` (priority 100): `(a + (b + c)) → a + b + c`
   - `simplify-double-negative` (priority 95): `-(-x) → x`
   - `combine-constants` (priority 90): `2 + 3 → 5`
   - `normalize-fraction-signs` (priority 85): `a/(-b) → -(a/b)`
   - `sort-addition-terms` (priority 80): `c + b + a → a + b + c`
   - `sort-multiplication-factors` (priority 75): `c*b*a → a*b*c` (numbers first)
   - `explicit-multiplication` (priority 70): `2x → 2*x` (internal)
   - `combine-like-terms` (priority 68): `2x + 3x → 5x`
   - `expand-binomial-square` (priority 60): `(a+b)² → a² + 2ab + b²`

3. **Trig Rules** (`trigRules.js`) - 5 rules:
   - `pythagorean-identity` (priority 100): `sin²(x) + cos²(x) → 1`
   - `trig-special-values` (priority 95): `sin(0) → 0`, `cos(0) → 1`
   - `sin-odd-function` (priority 90): `sin(-x) → -sin(x)`
   - `cos-even-function` (priority 90): `cos(-x) → cos(x)`
   - `tan-identity` (priority 80): `tan(x) → sin(x)/cos(x)`

**Rule Structure**:
```javascript
{
  name: 'rule-identifier',
  description: 'Human-readable description',
  priority: 90,  // Higher = applied earlier
  region: ['US', 'UK', 'EU'],
  match: (ast) => boolean,  // Returns true if rule applies
  transform: (ast) => newAst  // Returns transformed AST
}
```

**Performance Target**: <50ms for typical expressions

**Coverage**: ~90% of high-school algebra (polynomials, rational expressions, basic trig)

#### Slow Path: Algebrite CAS Fallback

**Location**: `src/cas/equivalenceChecker.js`

**Triggers**: When canonicalization produces non-matching strings

**Methods**:

1. **Difference Method** (primary):
   - Compute `result = expr1 - expr2`
   - Simplify result
   - Check if `|result| < tolerance` (default: 1e-6)

2. **Simplification Method** (fallback):
   - Simplify both expressions
   - String-compare simplified forms

**Timeout**: 2000ms (configurable via session state)

**Handles**: Advanced algebra, complex trig identities, logarithms, calculus

**Performance**: 50-500ms typical, up to 2000ms for complex expressions

### Rule Engine Implementation

**File**: `src/cas/rules/ruleEngine.js`

**Key Features**:
- **Priority Ordering**: Rules sorted by priority (high to low)
- **Fixpoint Detection**: Stops when `JSON.stringify(ast)` stops changing
- **Max Iterations**: 100 (configurable, prevents infinite loops)
- **Recursive Traversal**: Applies rules to nested nodes (fractions, powers, functions)

**Algorithm**:
```javascript
function canonicalize(ast, rules) {
  let prev = null;
  let iterations = 0;
  const MAX_ITER = 100;

  while (JSON.stringify(ast) !== JSON.stringify(prev) && iterations < MAX_ITER) {
    prev = clone(ast);
    ast = applyRulesOnce(ast, rules);  // Apply all rules once
    iterations++;
  }

  return ast;
}
```

**Helper Functions**:
- `isType(node, type)`: Type guard for AST nodes
- `isNumber(node)`: Checks if node is a number
- `getNumber(node)`: Extracts numeric value
- `isVariable(node)`: Checks if node is a variable
- `extractTerms(ast)`: Splits expression by `+` operators
- `extractFactors(ast)`: Splits expression by `*` operators

### KaTeX Parser Integration

**File**: `src/cas/katexParser.js`

**Critical Dependency**: Uses KaTeX's **undocumented internal API** `katex.__parse()` to convert LaTeX → AST.

**Risk**: KaTeX updates may break this API. Mitigation: Pin KaTeX version in `package.json`.

**Example AST Structure**:
```javascript
// LaTeX: "2x + 3"
[
  { type: 'number', value: 2 },
  { type: 'variable', value: 'x' },
  { type: 'operator', op: '+' },
  { type: 'number', value: 3 }
]
```

**Node Types**:
- `number`: Numeric literal (`{ type: 'number', value: 5 }`)
- `variable`: Variable identifier (`{ type: 'variable', value: 'x' }`)
- `operator`: Binary operator (`{ type: 'operator', op: '+' }`)
- `sign`: Unary sign (`{ type: 'sign', value: '-' }`)
- `fraction`: Fraction node (`{ type: 'fraction', numerator: [...], denominator: [...] }`)
- `power`: Exponentiation (`{ type: 'power', base: {...}, exponent: [...] }`)
- `function`: Function call (`{ type: 'function', name: 'sin', arg: [...] }`)
- `delimited`: Parentheses (`{ type: 'delimited', body: [...] }`)

---

## Data Architecture

### IndexedDB Schema Details

**Database Name**: `texo-workspace-db`
**Version**: 1
**API**: `src/utils/workspaceDB.js`

#### Store 1: `workspaces`
```javascript
{
  id: 'default',  // keyPath
  name: 'Default Workspace',
  description: 'Default workspace for all sessions',
  createdAt: 1699920000000,
  metadata: {
    version: 1,
    isDefault: true
  }
}
```

#### Store 2: `cas-cache`
```javascript
{
  workspaceId: 'default',  // keyPath[0]
  latex: '2x + 3x',        // keyPath[1]
  canonical: '5*x',
  timestamp: 1699920000000,
  metadata: {
    method: 'canonicalization',
    time: 15.2,
    iterations: 3
  }
}
```

**Cache Strategy**:
- **Key**: Composite `[workspaceId, latex]`
- **TTL**: 7 days (checked on read, expired entries deleted)
- **Invalidation**: Manual clear via Database page or `forceAlgebrite` mode
- **Hit Rate**: ~80% for typical usage patterns

#### Store 3: `session-state`
```javascript
{
  workspaceId: 'default',  // keyPath[0]
  key: 'debugMode',        // keyPath[1]
  value: true,
  timestamp: 1699920000000
}
```

**Default Session State**:
```javascript
{
  debugMode: true,
  showHelp: false,
  validationEnabled: true,
  cacheEnabled: true,
  validationDelay: 500,
  maxCanonicalizationIterations: 100,
  useAlgebrite: true,
  algebriteTimeout: 2000,
  forceAlgebrite: false,
  region: 'US',
  floatTolerance: 1e-6,
  theme: 'light',
  editorFontSize: 16,
  validationHighlights: true
}
```

#### Store 4: `diagnostic-logs`
```javascript
{
  id: 1,  // autoIncrement keyPath
  workspaceId: 'default',
  level: 'info',  // 'debug', 'info', 'warn', 'error'
  category: 'cas',  // 'cas', 'ocr', 'cache', 'workspace', etc.
  message: 'Canonicalized expression in 15ms',
  metadata: {
    latex: '2x + 3x',
    canonical: '5*x',
    iterations: 3
  },
  timestamp: 1699920000000
}
```

#### Store 5: `transformers-cache`
```javascript
{
  workspaceId: 'default',  // keyPath[0]
  key: 'model-weights',    // keyPath[1]
  timestamp: 1699920000000
}
```

**Note**: Actual Transformers.js cache is stored in browser's Cache API, not IndexedDB. This store only tracks metadata.

### State Management Strategy

**Three Layers**:

1. **UI State** (React `useState`/`useContext`):
   - Component-level state (input values, modal visibility, loading flags)
   - `DebugContext` for global debug mode
   - **Lifetime**: Session-scoped (lost on page refresh)

2. **Persistent State** (IndexedDB):
   - User data (editor content, CAS cache, logs)
   - Configuration (session state, preferences)
   - **Lifetime**: Permanent (survives restarts, cleared manually)

3. **Preferences** (localStorage):
   - Current workspace selection (`texo-current-workspace`)
   - **Lifetime**: Permanent (survives restarts)

**Rationale**: Separate concerns—UI state for reactivity, IndexedDB for bulk data, localStorage for lightweight preferences.

---

## Worker Architecture

### OCR Worker (`src/workers/ocrWorker.js`)

**Purpose**: Isolate Transformers.js model loading and inference (1-3s blocking operations) from main thread.

**Lifecycle**:
1. **Initialization**:
   ```javascript
   worker.postMessage({ type: 'init' });
   // Worker downloads model (~150 MB) from HuggingFace
   // Emits 'progress' events during download
   // Emits 'ready' when complete
   ```

2. **Inference**:
   ```javascript
   worker.postMessage({
     type: 'recognize',
     imageData: { data: Uint8ClampedArray, width: 384, height: 384 }
   });
   // Worker runs inference (~1-3s)
   // Emits 'result' with LaTeX string
   ```

3. **Error Handling**:
   ```javascript
   // Emits 'error' with message
   ```

**Model**: `alephpi/FormulaNet` (~150 MB)
- Architecture: Vision Transformer fine-tuned for handwritten math
- Input: 384×384 grayscale image
- Output: LaTeX string (via beam search)

**Performance**:
- First-time download: 30-60s (network-dependent)
- Inference: 1-3s (CPU-bound, ~500ms on modern hardware)
- Cache: Browser Cache API (persistent across sessions)

### Image Processor (`src/workers/imageProcessor.js`)

**Purpose**: Offload canvas manipulation and preprocessing.

**Operations**:
1. **Crop to Bounding Box**: Find non-white pixels, compute bounding box
2. **Grayscale Conversion**: RGB → luminance
3. **Resize**: Scale to 384×384 (model input size)
4. **Normalize**: Convert to Uint8ClampedArray

**Performance**: 50-200ms depending on image size

### Logging Worker (`src/workers/loggingWorker.js`)

**Purpose**: Async log writes to IndexedDB without blocking UI.

**Operations**:
1. **Buffer Logs**: Collect log entries in memory
2. **Batch Write**: Write to `diagnostic-logs` store in batches
3. **Query Interface**: Provide filtered log retrieval

**Performance**: <5ms per log write (async, non-blocking)

---

## Development Workflow

### Prerequisites

- **Node.js**: 18+ (inferred from package.json `"type": "module"`)
- **Package Manager**: npm or pnpm (both supported)
- **Browser**: Chrome/Edge 90+, Firefox 88+, Safari 14+ (requires IndexedDB, Web Workers, ES2020+)

### Commands

```bash
# Install dependencies
npm install  # or pnpm install

# Development server (with HMR)
npm run dev
# → Starts Vite dev server at http://localhost:5173
# → Hot Module Replacement for React components
# → Source maps enabled

# Production build
npm run build
# → Outputs to dist/
# → Minified and tree-shaken
# → Source maps omitted

# Preview production build locally
npm run preview
# → Serves dist/ at http://localhost:4173
# → Use to test production bundle before deployment

# Run all tests
npm test
# → Runs Vitest in run mode (single pass)
# → Excludes *.manual.test.js files

# Watch mode for test development
npm run test:watch
# → Runs Vitest in watch mode
# → Re-runs tests on file changes

# Run only equivalence checker tests
npm run test:equivalence
# → Runs src/utils/__tests__/equivalenceChecker.test.js

# Run manual CAS tests (Node.js, not Vitest)
npm run test:manual
# → Runs src/cas/__tests__/equivalence.test.manual.js
# → Tests Algebrite behavior directly

# Run equivalence + manual tests
npm run test:all
# → Runs test:equivalence && test:manual

# Run all tests with unified output
npm run test:unified
# → Runs node run-all-tests.js
# → Aggregates Vitest and manual test results
```

### Testing Strategy

**28 Test Files** across the codebase.

#### Unit Tests (Vitest)
- **Framework**: Vitest 2.1.8
- **Environment**: jsdom (DOM simulation)
- **Timeout**: 10s (for CAS-heavy tests)
- **Location**: `src/**/__tests__/*.test.js`
- **Excludes**: `*.manual.test.js` (Node.js-only tests)

**Coverage**:
- CAS rule engine logic
- Equivalence checker
- Utility functions (spatial mapping, logger)
- AST parsing and transformation

**Example**:
```javascript
test('should canonicalize 2x + 3x to 5x', () => {
  const result = checkEquivalence('2x + 3x', '5x');
  expect(result.equivalent).toBe(true);
  expect(result.method).toBe('canonicalization');
  expect(result.time).toBeLessThan(50);
});
```

#### Manual Tests (Node.js)
- **Framework**: Native Node.js (no test runner)
- **Purpose**: Test Algebrite behavior in isolation
- **Location**: `src/cas/__tests__/*.manual.test.js`
- **Run**: `node src/cas/__tests__/equivalence.test.manual.js`

**Rationale**: Algebrite has complex symbolic behavior that's easier to debug in a simple Node.js environment.

#### Integration Tests
**NOT AUTOMATED**. Manual testing required for:
- ProseMirror editor interactions
- Excalidraw canvas interactions
- IndexedDB persistence
- Web Worker communication
- OCR end-to-end flow

**Recommendation**: Use Playwright or Cypress for future automation.

---

## Deployment Architecture

### Build Output

**Command**: `npm run build`

**Output Directory**: `dist/`

**Structure**:
```
dist/
├── index.html               # SPA entry point
├── assets/
│   ├── index-[hash].js      # Main bundle (React app)
│   ├── index-[hash].css     # Styles (Tailwind + KaTeX)
│   ├── ocrWorker-[hash].js  # OCR worker bundle
│   ├── imageProcessor-[hash].js  # Image processor worker bundle
│   ├── loggingWorker-[hash].js   # Logging worker bundle
│   └── vendor-[hash].js     # Third-party libraries (code-split)
└── [other static assets]
```

**Key Optimizations**:
1. **Tree Shaking**: Unused code removed (Vite/Rollup)
2. **Code Splitting**: Vendors separated into chunks
3. **Web Worker ES Modules**: Workers use `format: 'es'` (see `vite.config.js`)
4. **Lazy Loading**: Excalidraw and ProseMirror loaded on-demand
5. **Asset Hashing**: Cache-busting via content hashes

**Vite Configuration** (`vite.config.js`):
```javascript
export default defineConfig({
  plugins: [react()],
  // base: "/texo-web-stylus/",  // Uncomment for GitHub Pages
  worker: {
    format: "es",  // ES module workers (not IIFE)
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],  // Exclude from pre-bundling
  },
});
```

**Deployment Targets**:
- **Static Hosting**: Netlify, Vercel, GitHub Pages, AWS S3+CloudFront
- **Requirements**: HTTPS (required for Web Workers), modern browser support
- **Base Path**: Configurable via `base` option (default: `/`)

### Performance Characteristics

**Measured on Intel i7-10700K, Chrome 120, initial cold start:**

| Operation | Target | Typical | Notes |
|-----------|--------|---------|-------|
| **Canonicalization** | <50ms | 5-30ms | Fast path, 90% coverage |
| **Algebrite Fallback** | 50-500ms | 100-300ms | Slow path, timeout at 2000ms |
| **OCR Inference** | 1-3s | 1.5s | Post-model load, CPU-bound |
| **Model Download** | 30-60s | 45s | One-time, network-dependent |
| **Cache Lookup** | <1ms | 0.5ms | IndexedDB hit |
| **Editor Re-render** | <16ms | 8ms | 60fps target (ProseMirror) |
| **Worker Message** | <5ms | 2ms | postMessage() latency |
| **Image Preprocessing** | 50-200ms | 100ms | Depends on image size |

**Performance Tuning Knobs** (via session state):
- `maxCanonicalizationIterations`: 100 (increase for complex nested expressions)
- `algebriteTimeout`: 2000ms (increase for complex symbolic math)
- `validationDelay`: 500ms (debounce delay for equivalence checking)
- `cacheEnabled`: true (disable to test without cache)

---

## Security & Privacy

### Privacy Guarantees

1. **Zero Server Communication** (after model download):
   - No API calls to backend servers
   - No telemetry or analytics
   - No external script injection

2. **Client-Side Only Processing**:
   - OCR inference runs in browser via Transformers.js
   - CAS computations run locally (rule engine + Algebrite)
   - No user data leaves the device

3. **Local Storage Only**:
   - IndexedDB for persistence (browser-sandboxed)
   - localStorage for preferences (browser-sandboxed)
   - No server-side storage

### Security Considerations

1. **Dependency Supply Chain**:
   - All dependencies from npm registry
   - **Risk**: npm package compromise
   - **Mitigation**: Use `npm audit`, pin versions, review updates

2. **Content Security Policy** (recommended):
   ```html
   <meta http-equiv="Content-Security-Policy" content="
     default-src 'self';
     script-src 'self' 'wasm-unsafe-eval';
     worker-src 'self' blob:;
     style-src 'self' 'unsafe-inline';
   ">
   ```

3. **Subresource Integrity** (for CDN-hosted assets):
   - Not applicable (self-hosted bundle)

4. **XSS Protection**:
   - React auto-escapes by default
   - KaTeX rendering uses `dangerouslySetInnerHTML` (trusted LaTeX only)

### Workspace Isolation

**Design**: All IndexedDB stores (except `workspaces`) are scoped by `workspaceId`.

**Guarantees**:
- Cache entries from workspace A never returned to workspace B
- Logs from workspace A invisible to workspace B
- Session state independent per workspace

**Use Case**: Multi-user devices (e.g., family tablet) or project isolation (e.g., personal vs work).

---

## Key Design Decisions

### Why Web Workers?

**Problem**: Heavy computations block main thread → UI freezes → poor UX.

**Computations That Block**:
1. **OCR Inference**: 1-3s (Transformers.js model forward pass)
2. **Image Preprocessing**: 50-200ms (canvas manipulation)
3. **Logging**: 5-20ms (IndexedDB writes)

**Solution**: Offload to Web Workers → main thread stays responsive.

**Trade-off**: Message-passing overhead (2-5ms), but negligible compared to computation time.

**Alternative Considered**: WebAssembly for CAS → rejected (Algebrite already fast enough, WASM adds complexity).

### Why Two-Tier CAS?

**Problem**: Algebrite is powerful but slow (100-500ms typical, up to 2s timeout).

**Observation**: Most equivalence checks in educational settings involve **simple transformations** (combine like terms, factor, expand), not advanced symbolic manipulation.

**Solution**:
- **Tier 1**: Rule-based canonicalization (<50ms) for common cases
- **Tier 2**: Algebrite fallback for advanced cases

**Results**:
- 90% of checks handled by Tier 1 (sub-50ms)
- 10% fall through to Tier 2 (50-500ms)
- Average check time: 30ms (down from 200ms Algebrite-only)

**User Control**: `forceAlgebrite` mode allows bypassing Tier 1 for debugging or verification.

**Alternative Considered**: Algebrite-only → rejected (too slow for real-time validation).

### Why IndexedDB?

**Problem**: Need persistent storage for:
- Large datasets (CAS cache: 1000s of entries)
- Diagnostic logs (MB of data)
- Transformers.js model cache (~150 MB)

**Options**:
1. **localStorage**: 5-10 MB limit → insufficient
2. **sessionStorage**: Session-scoped → data lost on refresh
3. **IndexedDB**: 50 MB - 500+ MB (quota-dependent), async, structured

**Solution**: IndexedDB for large/structured data, localStorage for lightweight preferences.

**Trade-off**: IndexedDB API is verbose → wrapped in `workspaceDB.js` helper module.

### Why KaTeX Internal API?

**Problem**: Need to convert LaTeX → AST for rule application. KaTeX doesn't officially export parser.

**Options**:
1. **Write custom parser**: High effort, error-prone
2. **Use `katex.__parse()`**: Undocumented internal API
3. **Use Algebrite for all parsing**: Too slow

**Solution**: Use `katex.__parse()` with version pinning (`"katex": "^0.16.11"`).

**Risk**: KaTeX updates may break API.

**Mitigation**:
- Pin KaTeX version in `package.json`
- Test parser on every KaTeX upgrade
- Document in `CLAUDE.md` for future maintainers

**Alternative Considered**: MathJax → rejected (heavier, slower, less maintained).

### Why ProseMirror over Draft.js?

**Requirements**:
- Inline and display math nodes
- Custom keybindings (mathBackspaceCmd)
- Decoration system for error highlighting

**ProseMirror Advantages**:
- Mature math plugin (`@benrbray/prosemirror-math`)
- Flexible schema system (custom node types)
- Powerful decoration API
- Active community

**Draft.js Disadvantages**:
- No official math plugin
- Less flexible for custom nodes
- Less active maintenance (Meta-internal focus)

**Alternative Considered**: Slate.js → rejected (less mature math support).

---

## Known Issues & Limitations

### 1. KaTeX Internal API Dependency
**Issue**: Uses undocumented `katex.__parse()` which may break in future KaTeX updates.

**Workaround**: Pin KaTeX to `^0.16.11`.

**Long-term Fix**: Contribute parser export to KaTeX upstream or write custom parser.

### 2. Algebrite Timeout on Complex Expressions
**Issue**: Heavy symbolic operations timeout at 2000ms.

**Example**: `simplify(sin(x)^8 + cos(x)^8)`

**Workaround**: Increase `algebriteTimeout` in session state.

**Long-term Fix**: Replace Algebrite with SymPy.js or custom symbolic engine.

### 3. Implicit Multiplication Parsing
**Issue**: Some cases like `2(x+1)` may not parse correctly (KaTeX parser limitation).

**Workaround**: Users must write `2*(x+1)` or `2\cdot(x+1)`.

**Long-term Fix**: Preprocess LaTeX to insert explicit `\cdot` operators.

### 4. No Matrix Support
**Issue**: KaTeX parser doesn't handle matrix environments (`\begin{bmatrix}...\end{bmatrix}`).

**Impact**: OCR can recognize matrices, but equivalence checker fails.

**Workaround**: None (fundamental parser limitation).

**Long-term Fix**: Extend AST parser to handle matrix node types.

### 5. Worker Communication Not Testable in Vitest
**Issue**: Vitest/jsdom doesn't support Web Workers.

**Impact**: No automated tests for worker message protocols.

**Workaround**: Manual testing in browser.

**Long-term Fix**: Add Playwright/Cypress integration tests.

### 6. First Model Download Requires Network
**Issue**: Initial OCR use requires downloading ~150 MB model.

**Impact**: App not fully offline-capable on first use.

**Workaround**: Prompt users to trigger model download on Wi-Fi.

**Long-term Fix**: Bundle model in app (but increases initial bundle to ~150 MB).

---

## Regional Notation Support

**Current Status**: Framework in place, minimal regional differences implemented.

**Design**: Rules can specify which regions they apply to:
```javascript
{
  name: 'some-rule',
  region: ['US', 'UK', 'EU'],  // Applies to US, UK, EU
  // ...
}
```

**Rule Engine Initialization**:
```javascript
const engine = new RuleEngine('US');  // or 'UK', 'EU'
```

**Planned Regional Differences**:
- **Decimal Separator**: US/UK use `.`, EU uses `,` (e.g., `3.14` vs `3,14`)
- **Function Notation**: `sin x` (UK) vs `sin(x)` (US)
- **Angle Units**: Degrees (US) vs radians (international)

**Current Implementation**: All rules apply to all regions (no actual differences yet).

---

## Future Architecture Considerations

### Scalability

**Current Limits**:
- Single-user only (no collaboration)
- 50 MB - 500 MB IndexedDB quota (browser-dependent)
- CPU-bound inference (no GPU acceleration)

**If User Base Grows**:
- Add **WebGPU** for GPU-accelerated inference (10-50x faster)
- Implement **Service Worker** for better offline PWA experience
- Add **Shared Worker** for cross-tab workspace synchronization

### Modularity

**Current Architecture**: Monolithic SPA.

**If Codebase Grows**:
- Extract CAS into **separate npm package** (`@texo/cas`)
- Extract OCR worker into **separate package** (`@texo/ocr-worker`)
- Use **Vite library mode** for modular builds

### Testing

**Current Gaps**:
- No integration tests (ProseMirror, Excalidraw)
- No E2E tests (full OCR flow)
- No visual regression tests (LaTeX rendering)

**Recommended Additions**:
- **Playwright**: E2E tests for critical user flows
- **Percy/Chromatic**: Visual regression testing
- **Storybook**: Component documentation and visual testing

---

## Appendix A: File Structure

```
/home/mser/Documents/cla/w/Texo-web-stylus/
├── src/
│   ├── main.jsx                    # Entry point
│   ├── App.jsx                     # Root component + router
│   ├── contexts/
│   │   └── DebugContext.jsx        # Global debug mode state
│   ├── pages/
│   │   ├── SketchPage.jsx          # Excalidraw canvas + OCR
│   │   ├── OCRPage.jsx             # Image upload + OCR
│   │   ├── ComposePage.jsx         # ProseMirror editor + equivalence
│   │   └── DatabasePage.jsx        # IndexedDB management
│   ├── cas/
│   │   ├── equivalenceChecker.js   # Two-tier CAS entry point
│   │   ├── katexParser.js          # LaTeX → AST parser
│   │   └── rules/
│   │       ├── ruleEngine.js       # Priority-based rule dispatcher
│   │       ├── algebraRules.js     # 9 algebra canonicalization rules
│   │       └── trigRules.js        # 5 trig canonicalization rules
│   ├── utils/
│   │   ├── workspaceDB.js          # IndexedDB API wrapper
│   │   ├── indexedDBCache.js       # CAS cache helper
│   │   ├── spatialMapping.js       # AST → visual position mapper
│   │   ├── logger.js               # Centralized logging
│   │   └── __tests__/              # Unit tests
│   ├── workers/
│   │   ├── ocrWorker.js            # Transformers.js inference
│   │   ├── imageProcessor.js       # Image preprocessing
│   │   └── loggingWorker.js        # Async logging
│   └── [other components/utilities]
├── public/                         # Static assets
├── docs/                           # Documentation
│   ├── bmm-architecture.md         # This file
│   ├── bmm-workflow-status.yaml    # BMM workflow tracking
│   └── sprint-artifacts/           # Sprint planning artifacts
├── vite.config.js                  # Vite build configuration
├── vitest.config.js                # Vitest test configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── postcss.config.js               # PostCSS configuration
├── package.json                    # Dependencies and scripts
├── CLAUDE.md                       # Claude Code instructions
├── README.md                       # User-facing documentation
└── LICENSE                         # AGPL-3.0 license

Total: ~28 test files, ~50+ source files
```

---

## Appendix B: Technology Decision Matrix

| Decision | Options Considered | Winner | Rationale |
|----------|-------------------|--------|-----------|
| **Frontend Framework** | React, Vue, Svelte | React | Mature ecosystem, Excalidraw/ProseMirror React support |
| **Build Tool** | Vite, Webpack, Parcel | Vite | Fastest HMR, native ES modules, great DX |
| **Routing** | react-router-dom, TanStack Router | react-router-dom | Industry standard, mature, well-documented |
| **Canvas Library** | Excalidraw, Fabric.js, Konva | Excalidraw | Stroke recognition, whiteboard UX, active development |
| **Rich Text Editor** | ProseMirror, Draft.js, Slate | ProseMirror | Best math plugin, flexible schema, decorations API |
| **Math Rendering** | KaTeX, MathJax | KaTeX | Faster, lighter, React ecosystem support |
| **ML Inference** | Transformers.js, ONNX Runtime | Transformers.js | Browser-native, HuggingFace model hub |
| **CAS Engine** | Algebrite, SymPy.js, Math.js | Algebrite | Lightweight, symbolic math, no WASM |
| **Persistence** | IndexedDB, localStorage | IndexedDB | Large datasets, async, structured queries |
| **Testing** | Vitest, Jest, Mocha | Vitest | Vite integration, fast, modern API |
| **Styling** | Tailwind, CSS Modules, Emotion | Tailwind | Rapid prototyping, consistent design, tree-shakable |

---

## Appendix C: Glossary

- **AST**: Abstract Syntax Tree — tree representation of LaTeX expression structure
- **CAS**: Computer Algebra System — software for symbolic mathematics
- **Canonicalization**: Transforming expressions to a standard form for comparison
- **FormulaNet**: Vision Transformer model fine-tuned for handwritten math OCR
- **Fixpoint**: State where repeated application of a function produces no change
- **HMR**: Hot Module Replacement — live code updates without full page reload
- **OCR**: Optical Character Recognition — converting images to text/LaTeX
- **PWA**: Progressive Web App — web app with offline capabilities
- **SPA**: Single Page Application — web app with client-side routing
- **TTL**: Time To Live — expiration time for cached data
- **Web Worker**: JavaScript running in background thread (off main thread)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | Claude (Sonnet 4.5) | Initial architecture documentation |

---

**End of Document**
