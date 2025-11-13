# Component Inventory

**Project**: Texo-web-stylus
**Generated**: 2025-11-13
**Total Components**: 7 React components

---

## Page Components

### 1. SketchPage
**File**: `/home/mser/Documents/cla/w/Texo-web-stylus/src/pages/SketchPage.jsx`

**Purpose**: Provides a stylus-based drawing interface for handwriting mathematical formulas, then converting them to LaTeX via OCR.

**Key Props/State**:
- `latex` (state): Recognized LaTeX output
- `isReady` (state): OCR model loading status
- `isLoading` (state): Processing status
- `progress` (state): Model download progress tracking
- `excalidrawAPI` (state): Reference to Excalidraw canvas API
- `autoConvert` (state): Toggle for automatic conversion after 5s
- `timerProgress` (state): Timer UI progress (0-100%)
- `debugMode` (from context): Global debug flag

**Dependencies**:
- `@excalidraw/excalidraw`: Canvas for freehand drawing
- `react-katex`: LaTeX preview rendering
- `katex`: LaTeX rendering engine
- `OCRWorker`: Web worker for ML inference
- `DebugContext`: Global debug mode state

**Features**:
- 384×384 fixed bounding box for OCR cropping
- Auto-convert timer with visual progress indicator
- Keyboard shortcut: Ctrl/Cmd+Enter to convert
- Model source fallback (HuggingFace → CN mirror)
- Debug preview overlay (controlled by global debug toggle)

---

### 2. OCRPage
**File**: `/home/mser/Documents/cla/w/Texo-web-stylus/src/pages/OCRPage.jsx`

**Purpose**: Upload or paste image files containing mathematical formulas for OCR recognition.

**Key Props/State**:
- `latex` (state): Recognized LaTeX output
- `imagePreview` (state): URL for uploaded image preview
- `isReady` (state): OCR model loading status
- `isLoading` (state): Processing status
- `progress` (state): Model download progress tracking

**Dependencies**:
- `react-katex`: LaTeX preview rendering
- `katex`: LaTeX rendering engine
- `OCRWorker`: Web worker for ML inference

**Features**:
- Drag-and-drop image upload
- Paste from clipboard (Ctrl/Cmd+V)
- Click to upload
- Load example image
- Image preprocessing and resizing (384×384)
- Model source fallback (HuggingFace → CN mirror)

---

### 3. ComposePage
**File**: `/home/mser/Documents/cla/w/Texo-web-stylus/src/pages/ComposePage.jsx`

**Purpose**: Rich text editor with inline/display math support and real-time equivalence checking between consecutive equations.

**Key Props/State**:
- `mathLines` (state): Extracted math expressions from editor
- `validationResults` (state): Equivalence check results
- `isValidating` (state): Validation in progress flag
- `cacheStats` (state): Cache statistics
- `showHelp` (state): Help panel toggle
- `debugMode` (from context): Global debug logging flag
- `forceAlgebrite` (state): Force Algebrite CAS mode (bypass canonicalization)

**Dependencies**:
- `prosemirror-*`: Rich text editor framework
- `@benrbray/prosemirror-math`: Math plugin for ProseMirror
- `katex`: LaTeX rendering
- `react-katex`: React LaTeX component
- `equivalenceChecker`: CAS equivalence checking system
- `spatialMapping`: Error highlighting system
- `indexedDBCache`: Canonical form caching
- `workspaceDB`: Session persistence
- `Logger`: Diagnostic logging
- `DebugContext`: Global debug state

**Features**:
- Type `$$` for block math, `$...$` for inline math
- Ctrl/Cmd+Space to insert inline math
- Real-time equivalence checking (500ms debounce)
- Visual feedback: green for equivalent, red for non-equivalent
- Cache-aware validation (skips if already computed)
- Insert sample equations button
- Force Algebrite mode toggle (orange checkbox)
- Debug and Force mode warning banners
- Spatial error highlighting (highlights mismatched sub-expressions)

---

### 4. DatabasePage
**File**: `/home/mser/Documents/cla/w/Texo-web-stylus/src/pages/DatabasePage.jsx`

**Purpose**: Manage IndexedDB workspaces, cache, diagnostic logs, and storage.

**Key Props/State**:
- `workspaces` (state): List of all workspaces
- `currentWorkspaceId` (state): Active workspace ID
- `stats` (state): Cache and log statistics
- `logs` (state): Diagnostic log entries
- `storageInfo` (state): Browser storage estimate
- `activeTab` (state): Current tab (overview, logs, import-export)
- `logLevelFilter` (state): Log level filter (debug/info/warn/error)
- `logSourceFilter` (state): Log source filter (e.g., EquivalenceChecker)
- `logTagFilter` (state): Log tag filter
- `logLimit` (state): Max logs to display (50/100/200/500)
- `selectedLogIds` (state): Set of selected log IDs
- `newWorkspaceName` (state): Form field for new workspace
- `newWorkspaceDesc` (state): Form field for workspace description

**Dependencies**:
- `workspaceDB`: All workspace/cache/log management functions

**Features**:
- **Overview Tab**:
  - Cache statistics (CAS, Transformers, Session State, Logs)
  - Storage usage visualization (progress bar)
  - Clear cache buttons
  - Refresh stats
- **Logs Tab**:
  - Filterable diagnostic logs (level, source, tag, limit)
  - Bulk selection controls (All/None/Invert)
  - Apply Filters to Selection button
  - Export logs to clipboard (all or selected)
  - Expandable metadata and stack traces
  - Color-coded by severity
  - Performance timestamps
- **Import/Export Tab**:
  - Export current workspace to JSON
  - Import workspace from JSON file
  - Overwrite/merge options
- **Workspace Management**:
  - Switch between workspaces
  - Create new workspaces
  - Delete workspaces (except default)

---

## Context Components

### 5. DebugContext
**File**: `/home/mser/Documents/cla/w/Texo-web-stylus/src/contexts/DebugContext.jsx`

**Purpose**: Provides global debug mode state to all components, persisted to localStorage.

**Exports**:
- `DebugProvider`: Context provider component
- `useDebug`: Hook to access debug state

**State**:
- `debugMode` (boolean): Global debug flag (default: true)
- `setDebugMode` (function): Update debug flag
- `toggleDebug` (function): Toggle debug flag

**Features**:
- Persists to `localStorage` with key `texo-debug-mode`
- Initializes from localStorage on mount (defaults to true)
- Updates `window.__TEXO_LOGGER__` debug level when changed
- Used by SketchPage (debug preview overlay) and ComposePage (debug logging banner)

**Usage Pattern**:
```javascript
import { useDebug } from '../contexts/DebugContext';

function MyComponent() {
  const { debugMode, toggleDebug } = useDebug();
  // ...
}
```

---

## Root Components

### 6. App
**File**: `/home/mser/Documents/cla/w/Texo-web-stylus/src/App.jsx`

**Purpose**: Root application component with routing and global layout.

**Structure**:
- `BrowserRouter`: React Router container
- `DebugProvider`: Wraps entire app
- `AppContent`: Inner component with header, navigation, routes, footer

**Key Props/State** (AppContent):
- `debugMode` (from context): Used for debug toggle in header
- `toggleDebug` (from context): Handler for debug checkbox

**Routes**:
- `/` → SketchPage (default)
- `/ocr` → OCRPage
- `/compose` → ComposePage
- `/database` → DatabasePage

**Layout**:
- **Header**: Title, navigation links, debug toggle
- **Main**: Route outlet
- **Footer**: "WIP" text (centered)

---

### 7. Main Entry Point
**File**: `/home/mser/Documents/cla/w/Texo-web-stylus/src/main.jsx`

**Purpose**: Application entry point, mounts React to DOM.

**Features**:
- Mounts `<App />` to `#root` element
- Wraps in `<React.StrictMode>` for development checks
- Imports global CSS (`./index.css`)

---

## Component Categorization

### By Category

| Category | Components |
|----------|-----------|
| **Pages** | SketchPage, OCRPage, ComposePage, DatabasePage |
| **Context** | DebugContext |
| **Root** | App, main.jsx |

### By Primary Function

| Function | Components |
|----------|-----------|
| **OCR Recognition** | SketchPage, OCRPage |
| **Math Editing** | ComposePage |
| **Data Management** | DatabasePage |
| **State Management** | DebugContext |
| **Routing/Layout** | App, main.jsx |

---

## Shared Patterns

### 1. OCR Workflow (SketchPage, OCRPage)
Both pages share the same OCR worker initialization pattern:
- Initialize OCR worker on mount
- Listen for `ready`, `progress`, `result`, `error` messages
- Fallback model source (HuggingFace → CN mirror)
- Worker cleanup on unmount

### 2. LaTeX Preview (All Pages)
All pages use `react-katex` for LaTeX rendering:
- `BlockMath` component for display math
- KaTeX CSS imports
- Editable textarea for LaTeX code
- Copy to clipboard functionality

### 3. Web Worker Communication
Pages communicate with workers via postMessage:
```javascript
worker.postMessage({ action: 'init', modelConfig: source });
worker.postMessage({ action: 'predict', image: file, key: 'predict' });
```

### 4. State Persistence
- **DebugContext**: Uses `localStorage` for global debug flag
- **ComposePage**: Uses `workspaceDB` for session state, cache
- **DatabasePage**: Direct access to all IndexedDB stores

### 5. Styling Approach
- **TailwindCSS** utility classes throughout
- Consistent color scheme:
  - Blue: Primary actions, info
  - Green: Success, equivalence
  - Red: Errors, non-equivalence
  - Orange: Warnings, Force Algebrite mode
  - Gray: Secondary actions, disabled states
- Responsive grid layouts (`lg:grid-cols-2`, `lg:col-span-2`)

---

## Component Dependencies Graph

```
main.jsx
  └─ App.jsx
       └─ DebugProvider (DebugContext)
            └─ AppContent
                 ├─ SketchPage (uses DebugContext)
                 ├─ OCRPage
                 ├─ ComposePage (uses DebugContext)
                 └─ DatabasePage
```

---

## Notes

1. **No Prop Drilling**: Global state managed via Context API (DebugContext) and IndexedDB (workspaceDB)
2. **Worker Isolation**: Heavy computations (OCR, image processing) run in Web Workers
3. **Offline-First**: All data stored in IndexedDB, no backend required
4. **Privacy-First**: No telemetry, no external API calls (except model download)
5. **Progressive Enhancement**: Model downloads once, cached by browser
6. **TypeScript Not Used**: Plain JSX/JS throughout

---

## Component Metrics

| Metric | Count |
|--------|-------|
| Total Components | 7 |
| Page Components | 4 |
| Context Providers | 1 |
| Root/Entry Components | 2 |
| Lines of Code (approx) | ~3,500 (all components) |
| External Dependencies | 15+ major libraries |

---

## Maintenance Considerations

1. **KaTeX Parser**: Uses internal `__parse` method (undocumented API) - may break on KaTeX updates
2. **ProseMirror Plugin Order**: Math plugin must precede equivalence checker plugin
3. **Worker Testing**: Cannot directly test workers in Vitest (requires browser or manual testing)
4. **IndexedDB Schema**: Versioned with migrations in `workspaceDB.js` (currently v1)
5. **Debug Mode Default**: Defaults to `true` for development visibility
