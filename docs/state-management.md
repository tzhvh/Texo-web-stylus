# State Management Documentation

## Overview

Texo-web-stylus employs a multi-layered state management architecture that combines React Context API, IndexedDB persistence, Web Workers, and local component state. The system is designed for privacy-first operation with all state managed client-side and workspace isolation for data separation.

## State Management Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Global Application State                │
├─────────────────────────────────────────────────────────────┤
│  React Context API                                        │
│  ├── DebugContext (global debug state)                     │
│  ├── Component-level state (useState, useReducer)         │
│  └── Custom hooks (useRowSystem, useSafeExcalidraw)    │
├─────────────────────────────────────────────────────────────┤
│  Persistent State (IndexedDB)                             │
│  ├── Workspace metadata                                   │
│  ├── Session state (user preferences)                     │
│  ├── CAS cache (canonical forms)                          │
│  ├── Magic Canvas state                                   │
│  ├── Diagnostic logs                                      │
│  └── Transformers cache                                  │
├─────────────────────────────────────────────────────────────┤
│  Worker State (Web Workers)                               │
│  ├── OCR Worker (model state, processing queue)           │
│  ├── Image Processor (temporary image data)               │
│  └── Logging Worker (log buffer)                         │
├─────────────────────────────────────────────────────────────┤
│  Browser Storage                                          │
│  ├── LocalStorage (debug mode, current workspace)         │
│  ├── SessionStorage (temporary UI state)                  │
│  └── Browser Cache (model files, static assets)           │
└─────────────────────────────────────────────────────────────┘
```

## 1. React Context API State

### DebugContext
**File**: `src/contexts/DebugContext.jsx`
**Purpose**: Global debug state management

```javascript
// Context Interface
interface DebugContextValue {
  debugMode: boolean,           // Global debug flag
  setDebugMode: (boolean) => void,  // Setter function
  toggleDebug: () => void        // Toggle function
}

// Usage
const { debugMode, setDebugMode, toggleDebug } = useDebug()
```

**Features**:
- Global debug mode toggle
- Automatic localStorage persistence
- Logger integration
- Component subscription system

**Implementation Details**:
```javascript
export function DebugProvider({ children }) {
  const [debugMode, setDebugMode] = useState(() => {
    // Initialize from localStorage with default true
    const stored = localStorage.getItem("texo-debug-mode")
    return stored !== null ? stored === "true" : true
  })

  useEffect(() => {
    // Persist to localStorage
    localStorage.setItem("texo-debug-mode", debugMode.toString())
    
    // Update logger debug level
    if (window.__TEXO_LOGGER__) {
      window.__TEXO_LOGGER__.setDebugMode(debugMode)
    }
  }, [debugMode])

  return (
    <DebugContext.Provider value={{ debugMode, setDebugMode, toggleDebug }}>
      {children}
    </DebugContext.Provider>
  )
}
```

### Component-Level State
**Patterns Used**:
- `useState` for simple component state
- `useReducer` for complex state logic
- `useMemo` for expensive computations
- `useCallback` for function memoization

**Example - ComposePage State**:
```javascript
const [latex, setLatex] = useState('')
const [validation, setValidation] = useState(null)
const [isProcessing, setIsProcessing] = useState(false)
const [forceAlgebrite, setForceAlgebrite] = useState(false)
```

## 2. Custom Hooks for State Management

### useRowSystem Hook
**File**: `src/hooks/useRowSystem.js`
**Purpose**: Manages row-based canvas organization and state

```javascript
// Hook Interface
interface UseRowSystemReturn {
  rows: Row[],                    // Current rows
  elementToRow: Map<string, string>, // Element mapping
  assignElementToRow: (element) => void,
  removeElementFromRow: (elementId) => void,
  updateRowStatus: (rowId, status) => void,
  createRow: (yStart) => Row,
  deleteRow: (rowId) => void,
  clear: () => void,
  getState: () => RowManagerState,
  loadState: (state) => void
}

// Usage
const rowSystem = useRowSystem()
```

**State Management Features**:
- Automatic row assignment based on Y coordinates
- Element-to-row mapping maintenance
- Row status tracking (OCR, validation)
- State persistence and restoration
- Performance optimization for large canvases

### useSafeExcalidraw Hook
**File**: `src/hooks/useSafeExcalidraw.js`
**Purpose**: Safe Excalidraw integration with error handling

```javascript
// Hook Interface
interface UseSafeExcalidrawReturn {
  excalidrawAPI: ExcalidrawAPI | null,
  isReady: boolean,
  error: string | null,
  reset: () => void,
  exportData: () => ExportData
}

// Usage
const { excalidrawAPI, isReady, error } = useSafeExcalidraw()
```

## 3. IndexedDB State Management

### Database Architecture
**Database**: `texo-workspace-db`
**Version**: 2
**Stores**: 6 object stores with workspace isolation

### Workspace Management State
```javascript
// Workspace State Structure
interface Workspace {
  id: string,                    // Unique identifier
  name: string,                  // Display name
  description: string,           // User description
  createdAt: number,             // Creation timestamp
  metadata: {
    version: number,             // Schema version
    isDefault: boolean          // Default workspace flag
  }
}

// State Management Functions
export async function createWorkspace(workspace: Partial<Workspace>): Promise<Workspace>
export async function getWorkspace(workspaceId: string): Promise<Workspace | null>
export async function listWorkspaces(): Promise<Workspace[]>
export async function switchWorkspace(workspaceId: string): Promise<Workspace>
export async function deleteWorkspace(workspaceId: string): Promise<void>
```

### Session State Management
```javascript
// Session State Interface
interface SessionState {
  debugMode: boolean,            // Global debug flag
  showHelp: boolean,             // Help panel visibility
  validationEnabled: boolean,     // Auto-validation
  cacheEnabled: boolean,         // CAS cache enabled
  validationDelay: number,       // Debounce delay (ms)
  maxCanonicalizationIterations: number, // Rule engine limit
  useAlgebrite: boolean,        // Algebrite fallback
  algebriteTimeout: number,      // Algebrite timeout (ms)
  forceAlgebrite: boolean,       // Force Algebrite only
  region: string,               // Math notation region
  floatTolerance: number,        // Float comparison tolerance
  theme: string,                // UI theme
  editorFontSize: number,        // Editor font size
  validationHighlights: boolean  // Inline validation highlights
}

// State Management API
export async function saveSessionState(key: string, value: any): Promise<void>
export async function loadSessionState(key: string): Promise<any>
export async function resetSessionState(): Promise<void>
```

### CAS Cache State Management
```javascript
// Cache Entry Structure
interface CASCacheEntry {
  workspaceId: string,           // Workspace scope
  latex: string,                 // Original LaTeX (key)
  canonical: string,             // Canonical form
  timestamp: number,            // Cache time
  metadata: {
    method: string,             // Processing method
    time: number,               // Processing time
    iterations?: number         // Rule engine iterations
  }
}

// Cache Management API
export async function cacheCanonicalForm(
  latex: string, 
  canonical: string, 
  metadata?: object
): Promise<CASCacheEntry>

export async function getCachedCanonicalForm(
  latex: string, 
  ttlDays?: number
): Promise<CASCacheEntry | null>

export async function clearCASCache(): Promise<number>
```

### Magic Canvas State Management
```javascript
// Canvas State Structure
interface MagicCanvasState {
  workspaceId: string,           // Workspace scope
  key: string,                  // State identifier
  canvasState: ExcalidrawElement[], // Canvas elements
  appState: {
    viewBackgroundColor: string,
    zoom: { value: number },
    scrollX: number,
    scrollY: number
  },
  rowManagerState: {
    rowHeight: number,
    startY: number,
    rows: Row[],
    elementToRow: Object        // Serialized Map
  },
  version: number,              // State versioning
  timestamp: number,            // Save time
  optimized: boolean           // Large canvas optimization
}

// Canvas State API
export async function saveMagicCanvasState(
  key: string,
  canvasState: ExcalidrawElement[],
  appState: object,
  rowManagerState: object,
  version?: number
): Promise<MagicCanvasState>

export async function loadMagicCanvasState(
  key: string,
  expectedVersion?: number
): Promise<MagicCanvasState | null>

export async function clearMagicCanvasState(key?: string): Promise<number>
```

## 4. Web Worker State Management

### OCR Worker State
**File**: `src/workers/ocrWorker.js`

```javascript
// Worker Internal State
let model = null                 // Loaded model instance
let tokenizer = null             // Loaded tokenizer
let isInitialized = false       // Initialization flag
let processingQueue = []        // Request queue
let currentProcessing = null     // Current request

// State Management Functions
async function init(modelConfig) {
  // Model loading with progress tracking
  // State updates via postMessage
}

async function predict(imageFile) {
  // OCR processing with state isolation
  // Queue management for concurrent requests
}
```

### Image Processor State
**File**: `src/workers/imageProcessor.js`

```javascript
// Processing State
let processingCount = 0         // Active processing count
let processingQueue = []        // Image processing queue

// State-less processing functions
export function preprocessImg(imageFile) {
  // Pure function - no internal state
  // Returns processed image data
}
```

### Logging Worker State
**File**: `src/workers/loggingWorker.js`

```javascript
// Logging State
let logBuffer = []               // Buffered log entries
let batchSize = 10              // Buffer size threshold
let flushInterval = 1000        // Auto-flush interval (ms)

// State Management
function flushLogs() {
  // Flush buffer to IndexedDB
  // Clear buffer
}

function bufferLog(logEntry) {
  // Add to buffer
  // Auto-flush if threshold reached
}
```

## 5. Browser Storage State

### LocalStorage Management
```javascript
// LocalStorage Keys
const STORAGE_KEYS = {
  DEBUG_MODE: 'texo-debug-mode',
  CURRENT_WORKSPACE: 'texo-current-workspace',
  UI_PREFERENCES: 'texo-ui-preferences',
  LAST_SESSION: 'texo-last-session'
}

// Storage API
export const localStorage = {
  set(key: string, value: any): void,
  get(key: string): any,
  remove(key: string): void,
  clear(): void
}
```

### SessionStorage Management
```javascript
// SessionStorage Keys
const SESSION_KEYS = {
  TEMP_CANVAS_STATE: 'texo-temp-canvas',
  NAVIGATION_STATE: 'texo-navigation',
  FORM_DATA: 'texo-form-data'
}

// Session API
export const sessionStorage = {
  set(key: string, value: any): void,
  get(key: string): any,
  remove(key: string): void,
  clear(): void
}
```

## 6. State Synchronization Patterns

### Component ↔ Database Sync
```javascript
// Pattern for reactive database state
function useDatabaseState(key, defaultValue) {
  const [state, setState] = useState(defaultValue)
  
  useEffect(() => {
    // Load from database on mount
    loadSessionState(key).then(value => {
      if (value !== null) setState(value)
    })
  }, [key])
  
  const saveState = useCallback((newValue) => {
    setState(newValue)
    saveSessionState(key, newValue)
  }, [key])
  
  return [state, saveState]
}
```

### Worker ↔ Main Thread Sync
```javascript
// Pattern for worker state synchronization
function useWorkerState(worker, initialState) {
  const [state, setState] = useState(initialState)
  
  useEffect(() => {
    const handleMessage = (event) => {
      const { type, data } = event.data
      if (type === 'state-update') {
        setState(data)
      }
    }
    
    worker.addEventListener('message', handleMessage)
    return () => worker.removeEventListener('message', handleMessage)
  }, [worker])
  
  return state
}
```

### Cross-Component State Sync
```javascript
// Pattern for shared component state
function useSharedState(sharedKey, initialValue) {
  const [state, setState] = useState(initialValue)
  
  // Broadcast state changes
  const broadcastChange = useCallback((newValue) => {
    setState(newValue)
    window.dispatchEvent(new CustomEvent('state-change', {
      detail: { key: sharedKey, value: newValue }
    }))
  }, [sharedKey])
  
  // Listen for changes from other components
  useEffect(() => {
    const handleStateChange = (event) => {
      if (event.detail.key === sharedKey) {
        setState(event.detail.value)
      }
    }
    
    window.addEventListener('state-change', handleStateChange)
    return () => window.removeEventListener('state-change', handleStateChange)
  }, [sharedKey])
  
  return [state, broadcastChange]
}
```

## 7. State Persistence Strategies

### Automatic Persistence
```javascript
// Automatic state persistence pattern
function usePersistentState(key, initialValue, options = {}) {
  const [state, setState] = useState(initialValue)
  const { persist = true, debounce = 0 } = options
  
  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce ? debounceFn(saveState, debounce) : saveState,
    [debounce]
  )
  
  function saveState(value) {
    if (persist) {
      saveSessionState(key, value)
    }
  }
  
  useEffect(() => {
    if (persist) {
      debouncedSave(state)
    }
  }, [state, debouncedSave, persist])
  
  return [state, setState]
}
```

### Lazy Loading Strategy
```javascript
// Lazy state loading pattern
function useLazyState(loader, dependencies = []) {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    let cancelled = false
    
    async function loadState() {
      try {
        setLoading(true)
        const result = await loader()
        if (!cancelled) {
          setState(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setState(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    
    loadState()
    
    return () => {
      cancelled = true
    }
  }, dependencies)
  
  return { state, loading, error }
}
```

## 8. Performance Optimization

### State Memoization
```javascript
// Expensive computation memoization
function useExpensiveState(computation, dependencies) {
  const [state, setState] = useState(() => computation())
  
  useEffect(() => {
    const newState = computation()
    if (!deepEqual(state, newState)) {
      setState(newState)
    }
  }, dependencies)
  
  return state
}
```

### Batched State Updates
```javascript
// Batch state updates for performance
function useBatchedState(initialState) {
  const [state, setState] = useState(initialState)
  const batchRef = useRef([])
  const timeoutRef = useRef(null)
  
  const batchedSetState = useCallback((updater) => {
    batchRef.current.push(updater)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(currentState => {
        return batchRef.current.reduce(
          (state, updater) => updater(state),
          currentState
        )
      })
      batchRef.current = []
    }, 0)
  }, [])
  
  return [state, batchedSetState]
}
```

## 9. Error Handling and Recovery

### State Error Boundaries
```javascript
// State error boundary pattern
function useStateWithErrorBoundary(initialValue, onError) {
  const [state, setState] = useState(initialValue)
  const [error, setError] = useState(null)
  
  const safeSetState = useCallback((updater) => {
    try {
      setState(updater)
      setError(null)
    } catch (err) {
      setError(err)
      if (onError) onError(err)
    }
  }, [onError])
  
  return [state, safeSetState, error]
}
```

### State Recovery
```javascript
// State recovery pattern
function useRecoverableState(key, initialValue, recovery) {
  const [state, setState] = useState(initialValue)
  
  useEffect(() => {
    async function loadState() {
      try {
        const saved = await loadSessionState(key)
        if (saved !== null) {
          setState(saved)
        }
      } catch (error) {
        console.warn(`Failed to load state for ${key}:`, error)
        if (recovery) {
          const recovered = await recovery()
          setState(recovered)
        }
      }
    }
    
    loadState()
  }, [key, recovery])
  
  return [state, setState]
}
```

## 10. State Monitoring and Debugging

### State Change Tracking
```javascript
// State change debugging
function useTrackedState(initialValue, name) {
  const [state, setState] = useState(initialValue)
  
  const trackedSetState = useCallback((updater) => {
    setState(prevState => {
      const newState = typeof updater === 'function' ? updater(prevState) : updater
      
      if (process.env.NODE_ENV === 'development') {
        console.group(`State Change: ${name}`)
        console.log('Previous:', prevState)
        console.log('New:', newState)
        console.log('Difference:', deepDiff(prevState, newState))
        console.groupEnd()
      }
      
      return newState
    })
  }, [name])
  
  return [state, trackedSetState]
}
```

### Performance Monitoring
```javascript
// State performance monitoring
function usePerformanceMonitor(state, name) {
  useEffect(() => {
    const start = performance.now()
    
    return () => {
      const end = performance.now()
      if (end - start > 16) { // > 1 frame at 60fps
        console.warn(`Slow state update detected in ${name}: ${end - start}ms`)
      }
    }
  }, [state, name])
}
```

This comprehensive state management system ensures data consistency, performance, and reliability while maintaining the privacy-first architecture of the application.