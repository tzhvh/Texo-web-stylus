# State Management Documentation

**Project**: Texo-web-stylus
**Generated**: 2025-11-13

---

## Overview

Texo-web-stylus uses a **hybrid state management approach** combining:

1. **React Context API** for global UI state (debug mode)
2. **IndexedDB** for persistent data (cache, session state, logs)
3. **localStorage** for lightweight preferences
4. **Component State** (useState) for local UI state

This architecture prioritizes **offline-first** functionality and **privacy** (no server communication).

---

## State Management Layers

```
┌─────────────────────────────────────────────────────────┐
│  Application State Layers                                │
├─────────────────────────────────────────────────────────┤
│  1. Global UI State (Context API)                        │
│     - DebugContext (debug mode toggle)                   │
├─────────────────────────────────────────────────────────┤
│  2. Persistent Storage (IndexedDB)                       │
│     - Workspace data                                     │
│     - CAS cache (canonical forms)                        │
│     - Session state (editor content, settings)           │
│     - Diagnostic logs                                    │
│     - Transformers cache metadata                        │
├─────────────────────────────────────────────────────────┤
│  3. Browser Storage (localStorage)                       │
│     - Debug mode preference (texo-debug-mode)            │
│     - Current workspace ID (texo-current-workspace)      │
├─────────────────────────────────────────────────────────┤
│  4. Component State (useState)                           │
│     - Form inputs, UI toggles, loading states            │
│     - Ephemeral data (doesn't need persistence)          │
└─────────────────────────────────────────────────────────┘
```

---

## 1. DebugContext (Global UI State)

### Purpose
Provides a global debug mode flag accessible to all components via React Context API.

### Location
`/home/mser/Documents/cla/w/Texo-web-stylus/src/contexts/DebugContext.jsx`

### Structure

```javascript
const DebugContext = createContext();

// Provider component
export function DebugProvider({ children }) {
  const [debugMode, setDebugMode] = useState(() => {
    const stored = localStorage.getItem("texo-debug-mode");
    return stored !== null ? stored === "true" : true; // Default: true
  });

  useEffect(() => {
    // Persist to localStorage
    localStorage.setItem("texo-debug-mode", debugMode.toString());

    // Update global logger
    if (window.__TEXO_LOGGER__) {
      window.__TEXO_LOGGER__.setDebugMode(debugMode);
    }
  }, [debugMode]);

  const toggleDebug = () => setDebugMode((prev) => !prev);

  return (
    <DebugContext.Provider value={{ debugMode, setDebugMode, toggleDebug }}>
      {children}
    </DebugContext.Provider>
  );
}

// Consumer hook
export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error("useDebug must be used within a DebugProvider");
  }
  return context;
}
```

### API

| Property | Type | Description |
|----------|------|-------------|
| `debugMode` | boolean | Current debug mode state (default: true) |
| `setDebugMode` | function | Update debug mode directly |
| `toggleDebug` | function | Toggle debug mode on/off |

### Usage Pattern

```javascript
import { useDebug } from '../contexts/DebugContext';

function MyComponent() {
  const { debugMode, toggleDebug } = useDebug();

  return (
    <>
      {debugMode && <DebugPanel />}
      <button onClick={toggleDebug}>Toggle Debug</button>
    </>
  );
}
```

### Side Effects

When `debugMode` changes:
1. Value persisted to `localStorage` (key: `texo-debug-mode`)
2. Global logger updated via `window.__TEXO_LOGGER__.setDebugMode()`

### Consumers

- **App.jsx**: Renders debug toggle in header
- **SketchPage**: Shows debug preview overlay when enabled
- **ComposePage**: Shows debug logging banner, enables verbose CAS logging

---

## 2. IndexedDB Stores (Persistent Data)

### Overview

All persistent data stored in a single IndexedDB database with multiple object stores.

**Database Name**: `texo-workspace-db`
**Current Version**: 1

### Location
`/home/mser/Documents/cla/w/Texo-web-stylus/src/utils/workspaceDB.js`

---

### Store: `workspaces`

**Purpose**: Metadata for each workspace (like Git branches)

**Key Path**: `id`

**Indexes**:
- `name` (non-unique)
- `createdAt` (non-unique)

**Schema**:
```javascript
{
  id: 'default' | 'workspace-{timestamp}',
  name: 'Workspace Name',
  description: 'Optional description',
  createdAt: 1234567890000,
  metadata: {
    version: 1,
    isDefault: true, // Only for default workspace
    // Custom fields allowed
  }
}
```

**Operations**:
- `createWorkspace(workspace)` → Create new workspace
- `getWorkspace(workspaceId)` → Retrieve workspace metadata
- `listWorkspaces()` → List all workspaces
- `deleteWorkspace(workspaceId)` → Delete workspace and all its data
- `switchWorkspace(workspaceId)` → Change active workspace

---

### Store: `cas-cache`

**Purpose**: Cache canonicalized LaTeX expressions to avoid re-computation

**Key Path**: `['workspaceId', 'latex']` (compound key)

**Indexes**:
- `workspaceId` (non-unique)
- `timestamp` (non-unique)
- `canonical` (non-unique)

**Schema**:
```javascript
{
  workspaceId: 'default',
  latex: 'x^2 + 4x + 4',
  canonical: 'x^2+4*x+4', // Canonical form
  timestamp: 1234567890000,
  metadata: {
    result: {
      equivalent: true,
      method: 'canonicalization',
      time: 15.2,
      canonical1: '...',
      canonical2: '...'
    },
    prevLatex: '(x + 2)^2',
    currLatex: 'x^2 + 4x + 4'
  }
}
```

**Operations**:
- `cacheCanonicalForm(latex, canonical, metadata)` → Store canonical form
- `getCachedCanonicalForm(latex, ttlDays=7)` → Retrieve cached form (with TTL check)
- `clearCASCache()` → Clear all cache for current workspace

**TTL (Time-To-Live)**:
- Default: 7 days
- Expired entries automatically deleted on lookup

---

### Store: `session-state`

**Purpose**: Persist user session settings and editor content

**Key Path**: `['workspaceId', 'key']` (compound key)

**Indexes**:
- `workspaceId` (non-unique)

**Schema**:
```javascript
{
  workspaceId: 'default',
  key: 'debugMode' | 'showHelp' | 'forceAlgebrite' | ...,
  value: true | false | { ... }, // Any JSON-serializable value
  timestamp: 1234567890000
}
```

**Default Session State** (preset values):
```javascript
{
  debugMode: true,                    // Enable debug logging
  showHelp: false,                    // Help panel collapsed
  validationEnabled: true,            // Auto-validation enabled
  cacheEnabled: true,                 // CAS cache enabled
  validationDelay: 500,               // Debounce delay (ms)
  maxCanonicalizationIterations: 100, // Max rule engine iterations
  useAlgebrite: true,                 // Enable Algebrite fallback
  algebriteTimeout: 2000,             // Algebrite timeout (ms)
  forceAlgebrite: false,              // Force Algebrite (bypass canonicalization)
  region: 'US',                       // Math notation region
  floatTolerance: 1e-6,               // Float comparison tolerance
  theme: 'light',                     // UI theme (not implemented)
  editorFontSize: 16,                 // Editor font size (px)
  validationHighlights: true,         // Inline validation highlights
}
```

**Operations**:
- `saveSessionState(key, value)` → Store setting
- `loadSessionState(key)` → Retrieve setting
- `resetSessionState()` → Reset all settings to defaults

**Usage**:
Currently **not actively used** by UI components (future expansion).

---

### Store: `diagnostic-logs`

**Purpose**: Store diagnostic logs for debugging and analytics

**Key Path**: `id` (auto-increment)

**Indexes**:
- `workspaceId` (non-unique)
- `timestamp` (non-unique)
- `level` (non-unique)
- `category` (non-unique)

**Schema**:
```javascript
{
  id: 1, // Auto-incremented
  workspaceId: 'default',
  level: 'debug' | 'info' | 'warn' | 'error',
  category: 'cache' | 'cas' | 'ocr' | 'workspace' | 'export' | 'import',
  message: 'Human-readable log message',
  metadata: {
    // Arbitrary JSON data
    expression: 'x^2 + 4x + 4',
    time: 15.2,
    method: 'canonicalization',
    // ...
  },
  timestamp: 1234567890000,
  // Optional fields:
  source: 'EquivalenceChecker' | 'Algebrite' | ...,
  tags: ['equivalence', 'algebrite'],
  perfTimestamp: 12345, // Performance.now() timestamp
  stackTrace: 'Error\n  at ...' // For errors
}
```

**Operations**:
- `logDiagnostic(level, category, message, metadata)` → Add log entry
- `getDiagnosticLogs(options)` → Query logs (filtered, paginated)
  - Options: `workspaceId`, `level`, `category`, `source`, `tags`, `limit`, `offset`
- `clearDiagnosticLogs()` → Clear all logs for current workspace

**Extended Schema** (used by Logger utility):
```javascript
{
  // ... base schema ...
  source: 'EquivalenceChecker', // Component name
  tags: ['equivalence', 'algebrite'], // Searchable tags
  perfTimestamp: 12345, // performance.now() timestamp
  stackTrace: '...' // For error-level logs
}
```

---

### Store: `transformers-cache`

**Purpose**: Metadata for Transformers.js model cache (models cached by browser)

**Key Path**: `['workspaceId', 'key']` (compound key)

**Indexes**:
- `workspaceId` (non-unique)
- `timestamp` (non-unique)

**Schema**:
```javascript
{
  workspaceId: 'default',
  key: 'model-metadata' | 'download-info',
  timestamp: 1234567890000,
  metadata: {
    // Arbitrary metadata about model cache
  }
}
```

**Operations**:
- `clearTransformersCache()` → Clear metadata (not actual model files)

**Note**: Actual model files cached by browser's Cache API, not IndexedDB.

---

## 3. localStorage (Browser Storage)

### Overview

Used for lightweight, non-critical preferences that need to persist across sessions.

### Keys

| Key | Type | Purpose | Default |
|-----|------|---------|---------|
| `texo-debug-mode` | string (`"true"` or `"false"`) | Debug mode preference | `"true"` |
| `texo-current-workspace` | string | Active workspace ID | `"default"` |

### Access Pattern

**DebugContext** manages `texo-debug-mode`:
```javascript
// Read
const stored = localStorage.getItem("texo-debug-mode");
const debugMode = stored !== null ? stored === "true" : true;

// Write
localStorage.setItem("texo-debug-mode", debugMode.toString());
```

**workspaceDB** manages `texo-current-workspace`:
```javascript
// Read
const saved = localStorage.getItem('texo-current-workspace');
if (saved) currentWorkspace = saved;

// Write
localStorage.setItem('texo-current-workspace', workspaceId);
```

---

## 4. Component State (useState)

### Overview

Each component manages its own local state via React's `useState` hook for:
- Form inputs
- UI toggles
- Loading states
- Ephemeral data

### Examples by Component

#### SketchPage
```javascript
const [latex, setLatex] = useState("");
const [isReady, setIsReady] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [progress, setProgress] = useState({});
const [excalidrawAPI, setExcalidrawAPI] = useState(null);
const [autoConvert, setAutoConvert] = useState(false);
const [timerProgress, setTimerProgress] = useState(0);
```

#### OCRPage
```javascript
const [latex, setLatex] = useState("");
const [imagePreview, setImagePreview] = useState(null);
const [isReady, setIsReady] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [progress, setProgress] = useState({});
```

#### ComposePage
```javascript
const [mathLines, setMathLines] = useState([]);
const [validationResults, setValidationResults] = useState([]);
const [isValidating, setIsValidating] = useState(false);
const [cacheStats, setCacheStats] = useState(null);
const [showHelp, setShowHelp] = useState(false);
const [forceAlgebrite, setForceAlgebrite] = useState(false);
// Plus: editorRef, viewRef, debounceTimerRef (useRef)
```

#### DatabasePage
```javascript
const [workspaces, setWorkspaces] = useState([]);
const [currentWorkspaceId, setCurrentWorkspaceId] = useState('default');
const [stats, setStats] = useState(null);
const [logs, setLogs] = useState([]);
const [storageInfo, setStorageInfo] = useState(null);
const [activeTab, setActiveTab] = useState('overview');
const [logLevelFilter, setLogLevelFilter] = useState('');
const [logSourceFilter, setLogSourceFilter] = useState('');
const [logTagFilter, setLogTagFilter] = useState('');
const [logLimit, setLogLimit] = useState(100);
const [selectedLogIds, setSelectedLogIds] = useState(new Set());
const [newWorkspaceName, setNewWorkspaceName] = useState('');
const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
```

---

## State Synchronization

### DebugContext ↔ localStorage

**When**: On every `debugMode` change (via useEffect)

**Flow**:
```
User toggles checkbox
  → setDebugMode(newValue)
  → useEffect fires
  → localStorage.setItem("texo-debug-mode", newValue)
  → window.__TEXO_LOGGER__.setDebugMode(newValue)
```

**On App Load**:
```
DebugProvider mounts
  → useState initializer runs
  → Read from localStorage
  → Default to true if not found
```

---

### Workspace Switch ↔ IndexedDB + localStorage

**When**: User switches workspace in DatabasePage

**Flow**:
```
User selects workspace from dropdown
  → handleSwitchWorkspace(workspaceId)
  → switchWorkspace(workspaceId) // workspaceDB function
  → Check workspace exists in IndexedDB
  → Update global currentWorkspace variable
  → localStorage.setItem("texo-current-workspace", workspaceId)
  → Log diagnostic entry
  → Reload stats and logs for new workspace
```

**On App Load**:
```
initWorkspaceDB()
  → Open IndexedDB
  → Read saved workspace from localStorage
  → Set currentWorkspace global variable
  → Ensure default workspace exists
```

---

### CAS Cache ↔ IndexedDB

**Write Flow** (ComposePage validation):
```
User edits equation
  → Debounced validation (500ms)
  → checkEquivalence(expr1, expr2)
  → Compute canonical form
  → cacheCanonicalForm(key, canonical, metadata)
  → IndexedDB: cas-cache.put({...})
```

**Read Flow** (ComposePage validation):
```
Validation triggered
  → Check cache first: getCachedCanonicalForm(key)
  → IndexedDB: cas-cache.get([workspaceId, key])
  → Check TTL (7 days)
  → If expired: delete and return null
  → If valid: return cached result
  → If miss: compute and cache
```

**Cache Invalidation**:
- Manual: User clicks "Clear CAS Cache" in DatabasePage
- Automatic: TTL expiry (7 days)
- Force Algebrite mode: Skips cache entirely

---

### Session State ↔ IndexedDB

**Preset on Workspace Creation**:
```
createWorkspace() or ensureDefaultWorkspace()
  → For each key in DEFAULT_SESSION_STATE:
    → saveSessionState(key, value)
    → IndexedDB: session-state.put({workspaceId, key, value, timestamp})
```

**Future Usage** (not currently implemented):
```
Component mounts
  → loadSessionState('validationDelay')
  → IndexedDB: session-state.get([workspaceId, 'validationDelay'])
  → Use value or fallback to default
```

---

### Diagnostic Logs ↔ IndexedDB

**Write Flow** (anywhere in app):
```
Operation occurs (e.g., equivalence check, cache hit)
  → logDiagnostic(level, category, message, metadata)
  → IndexedDB: diagnostic-logs.add({...})
  → Also console.log()
```

**Extended Logging** (via Logger utility):
```
Logger.log(level, source, message, metadata, tags)
  → Wrap in logDiagnostic()
  → Add source, tags, perfTimestamp, stackTrace
  → IndexedDB: diagnostic-logs.add({...})
```

**Read Flow** (DatabasePage):
```
Logs tab activated
  → getDiagnosticLogs({level, source, tags, limit})
  → IndexedDB: diagnostic-logs.index('workspaceId').openCursor()
  → Filter by level, category, source, tags
  → Paginate with limit/offset
  → Return newest first (reverse cursor)
```

---

## Data Flow Examples

### Example 1: User Draws Formula

```
SketchPage
  ├─ User draws in Excalidraw
  ├─ Auto-convert timer (5s) or manual trigger
  ├─ Extract elements in bounding box
  ├─ Export to PNG (384×384)
  ├─ Send to OCRWorker
  │   └─ Worker: Load model from browser cache
  │   └─ Worker: Run inference
  │   └─ Worker: postMessage({ type: 'result', output: latex })
  ├─ Receive LaTeX result
  └─ setState({ latex })
```

**State Changes**:
- `isLoading`: false → true → false
- `latex`: "" → "x^2 + 4x + 4"

**Persistence**: None (ephemeral until copied)

---

### Example 2: User Validates Equations

```
ComposePage
  ├─ User types $$x^2 + 4x + 4$$
  ├─ User types $$(x + 2)^2$$
  ├─ Editor onChange → extractAndValidate()
  ├─ Extract math nodes from ProseMirror
  ├─ Debounce 500ms
  ├─ validateMathLines()
  │   ├─ Check cache: getCachedCanonicalForm('x^2+4x+4|(x+2)^2')
  │   ├─ Cache miss → compute
  │   ├─ checkEquivalence('x^2+4x+4', '(x+2)^2')
  │   │   ├─ Fast path: canonicalization (15ms)
  │   │   │   ├─ Parse LaTeX → AST
  │   │   │   ├─ Apply rules (flatten, sort, simplify)
  │   │   │   └─ Compare canonical strings
  │   │   └─ Result: { equivalent: true, method: 'canonicalization', time: 15.2 }
  │   ├─ Cache result: cacheCanonicalForm(key, canonical, result)
  │   │   └─ IndexedDB: cas-cache.put({workspaceId: 'default', latex: key, canonical, metadata})
  │   └─ Log: logDiagnostic('info', 'cas', 'Equivalence check', { result })
  │       └─ IndexedDB: diagnostic-logs.add({workspaceId: 'default', level: 'info', category: 'cas', ...})
  └─ setState({ validationResults })
```

**State Changes**:
- `mathLines`: [] → [{latex: 'x^2+4x+4', pos: 0}, {latex: '(x+2)^2', pos: 10}]
- `isValidating`: false → true → false
- `validationResults`: [] → [{lineNumber: 2, equivalent: true, method: 'canonicalization', time: 15.2}]

**Persistence**:
- CAS cache entry added to IndexedDB
- Diagnostic log entry added to IndexedDB

---

### Example 3: User Switches Workspace

```
DatabasePage
  ├─ User selects "Workspace A" from dropdown
  ├─ handleSwitchWorkspace('workspace-a')
  │   ├─ switchWorkspace('workspace-a')
  │   │   ├─ Check: getWorkspace('workspace-a')
  │   │   │   └─ IndexedDB: workspaces.get('workspace-a')
  │   │   ├─ Update global: currentWorkspace = 'workspace-a'
  │   │   ├─ Persist: localStorage.setItem('texo-current-workspace', 'workspace-a')
  │   │   └─ Log: logDiagnostic('info', 'workspace', 'Switched to workspace-a')
  │   ├─ setState({ currentWorkspaceId: 'workspace-a' })
  │   ├─ loadStats() → getCacheStats()
  │   │   └─ IndexedDB: Query all stores filtered by workspaceId='workspace-a'
  │   └─ loadLogs() → getDiagnosticLogs({workspaceId: 'workspace-a'})
  │       └─ IndexedDB: diagnostic-logs.index('workspaceId').openCursor('workspace-a')
  └─ setState({ stats, logs })
```

**State Changes**:
- `currentWorkspaceId`: 'default' → 'workspace-a'
- `stats`: {...default stats} → {...workspace-a stats}
- `logs`: [...default logs] → [...workspace-a logs]

**Persistence**:
- localStorage updated: `texo-current-workspace` = "workspace-a"
- Diagnostic log entry added
- All subsequent IndexedDB operations scoped to 'workspace-a'

---

## State Management Best Practices

### 1. Use Context for Global UI State
- DebugContext for debug mode
- Future: ThemeContext, LanguageContext

### 2. Use IndexedDB for Persistent Data
- Large datasets (cache, logs)
- Data that needs to survive page refresh
- Data that needs complex querying

### 3. Use localStorage for Preferences
- Small, simple key-value pairs
- Non-critical data (UI preferences)
- Data accessed synchronously

### 4. Use Component State for Ephemeral Data
- Form inputs
- UI toggles
- Loading states
- Data that doesn't need persistence

### 5. Avoid Prop Drilling
- Use Context for deeply nested shared state
- Use IndexedDB for cross-component data
- Keep component state local when possible

### 6. Async State Updates
- IndexedDB operations are async (promises)
- Use `async/await` consistently
- Handle errors gracefully
- Show loading states during async operations

### 7. Cache Invalidation
- Implement TTL for cache entries
- Provide manual cache clearing
- Clear cache on schema changes

### 8. Workspace Isolation
- All IndexedDB stores scoped by `workspaceId`
- Global `currentWorkspace` variable tracks active workspace
- Switching workspaces updates all UI components

---

## Future Enhancements

1. **Session State Integration**
   - Use `session-state` store for ComposePage editor content
   - Persist Force Algebrite toggle
   - Persist help panel state

2. **Sync Between Tabs**
   - Use BroadcastChannel API
   - Sync workspace switches
   - Sync cache updates

3. **State Migrations**
   - Handle IndexedDB schema upgrades
   - Migrate localStorage keys if schema changes

4. **Performance Optimization**
   - Batch IndexedDB writes
   - Use transactions for related operations
   - Debounce cache writes

5. **State Debugging**
   - Redux DevTools integration
   - IndexedDB inspector UI
   - State history tracking

---

## Troubleshooting

### Issue: Debug Mode Not Persisting
**Cause**: localStorage blocked or disabled
**Solution**: Check browser settings, use private/incognito mode

### Issue: Cache Not Working
**Cause**: IndexedDB not initialized or quota exceeded
**Solution**: Check console for errors, clear old data, check storage quota

### Issue: Workspace Data Not Isolated
**Cause**: Missing `workspaceId` parameter in queries
**Solution**: Always use compound keys `[workspaceId, key]` for scoped stores

### Issue: Logs Growing Too Large
**Cause**: No automatic cleanup
**Solution**: Implement log rotation, add max log count limit, provide bulk delete

### Issue: State Out of Sync Between Components
**Cause**: Direct IndexedDB access without React state update
**Solution**: Always update React state after IndexedDB operations

---

## State Management Diagram

```
┌─────────────────────────────────────────────────────────┐
│  React Application                                       │
├─────────────────────────────────────────────────────────┤
│  DebugContext (React Context)                            │
│    └─ debugMode: boolean                                 │
│        ├─ Synced to localStorage (texo-debug-mode)       │
│        └─ Synced to window.__TEXO_LOGGER__               │
├─────────────────────────────────────────────────────────┤
│  Component State (useState)                              │
│    ├─ SketchPage: latex, isReady, progress, ...         │
│    ├─ OCRPage: latex, imagePreview, ...                 │
│    ├─ ComposePage: mathLines, validationResults, ...    │
│    └─ DatabasePage: workspaces, logs, stats, ...        │
├─────────────────────────────────────────────────────────┤
│  IndexedDB (workspaceDB.js)                              │
│    ├─ workspaces: { id, name, createdAt, metadata }     │
│    ├─ cas-cache: { workspaceId, latex, canonical, ... } │
│    ├─ session-state: { workspaceId, key, value, ... }   │
│    ├─ diagnostic-logs: { id, level, message, ... }      │
│    └─ transformers-cache: { workspaceId, key, ... }     │
├─────────────────────────────────────────────────────────┤
│  localStorage                                            │
│    ├─ texo-debug-mode: "true" | "false"                 │
│    └─ texo-current-workspace: "default" | "workspace-*" │
└─────────────────────────────────────────────────────────┘
```
