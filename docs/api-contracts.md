# API Contracts Documentation

## Overview

Texo-web-stylus is a privacy-first client-side application that operates without external API calls. However, it defines internal contracts between components, Web Workers, and browser APIs. This documentation outlines all internal and external API contracts used by the application.

## Internal API Contracts

### 1. Web Worker Communication APIs

#### OCR Worker API
**Worker File**: `src/workers/ocrWorker.js`
**Purpose**: Handles FormulaNet model inference for mathematical OCR

**Message Types**:

##### Initialize Model
```javascript
// Main Thread → Worker
{
  action: 'init',
  modelConfig: {
    modelName: string,           // Model identifier (e.g., 'alephpi/FormulaNet')
    env_config?: {
      remoteHost: string,        // Custom model host
      remotePathTemplate: string  // URL template for model files
    }
  }
}

// Worker → Main Thread
{
  type: 'ready' | 'error',
  error?: string,               // Error message if failed
  stack?: string                // Error stack trace
}
```

##### OCR Prediction
```javascript
// Main Thread → Worker
{
  action: 'predict',
  image: File | Blob,           // Image to process
  key: string                  // Request identifier
}

// Worker → Main Thread - Progress
{
  type: 'progress',
  file: string,                // File being loaded
  loaded: number,              // Bytes loaded
  total: number,                // Total bytes
  status: string               // Loading status
}

// Worker → Main Thread - Result
{
  type: 'result',
  output: string,              // Recognized LaTeX
  time: string,                // Processing time in seconds
  key: string                  // Request identifier
}

// Worker → Main Thread - Error
{
  type: 'error',
  error: string,               // Error message
  stack?: string,              // Error stack
  key: string                  // Request identifier
}
```

**Performance Specifications**:
- Model download: 30-60 seconds (one-time)
- Inference time: 1-3 seconds per image
- Input format: 384x384 preprocessed image
- Output format: LaTeX string

#### Image Processor Worker API
**Worker File**: `src/workers/imageProcessor.js`
**Purpose**: Preprocesses images for OCR input

**Exported Functions**:
```javascript
// Main function
export function preprocessImg(imageFile): Promise<{
  array: Float32Array,         // Preprocessed image data
  width: number,               // Image width (384)
  height: number               // Image height (384)
}>

// Processing steps:
// 1. Convert to grayscale
// 2. Resize to 384x384
// 3. Normalize pixel values
// 4. Convert to tensor format
```

#### Logging Worker API
**Worker File**: `src/workers/loggingWorker.js`
**Purpose**: Asynchronous logging to prevent main thread blocking

**Message Types**:
```javascript
// Main Thread → Worker
{
  action: 'log',
  level: 'debug' | 'info' | 'warn' | 'error',
  category: string,            // Log category
  message: string,             // Log message
  metadata?: object,           // Additional data
  timestamp: number            // Unix timestamp
}

// Worker → Main Thread (optional callback)
{
  type: 'logged',
  id: number,                 // Log entry ID
  persisted: boolean          // Successfully saved to IndexedDB
}
```

### 2. IndexedDB API Contracts

#### Workspace Database API
**Database**: `texo-workspace-db` (version 2)
**Stores**: workspaces, cas-cache, session-state, diagnostic-logs, transformers-cache, magic-canvas-state

##### Workspace Management
```javascript
// Create workspace
await createWorkspace({
  id: string,                  // Unique identifier
  name: string,                // Display name
  description?: string,         // Optional description
  createdAt?: number,           // Creation timestamp
  metadata?: object            // Additional metadata
}): Promise<Workspace>

// Get workspace
await getWorkspace(workspaceId: string): Promise<Workspace | null>

// List all workspaces
await listWorkspaces(): Promise<Workspace[]>

// Delete workspace
await deleteWorkspace(workspaceId: string): Promise<void>

// Switch workspace
await switchWorkspace(workspaceId: string): Promise<Workspace>
```

##### CAS Cache API
```javascript
// Cache canonical form
await cacheCanonicalForm(
  latex: string,               // Original LaTeX
  canonical: string,           // Canonical form
  metadata?: object           // Processing metadata
): Promise<CacheEntry>

// Get cached form
await getCachedCanonicalForm(
  latex: string,               // LaTeX to lookup
  ttlDays?: number            // Time-to-live in days (default: 7)
): Promise<CacheEntry | null>

// Clear cache
await clearCASCache(): Promise<number>  // Returns deleted count
```

##### Session State API
```javascript
// Save setting
await saveSessionState(key: string, value: any): Promise<void>

// Load setting
await loadSessionState(key: string): Promise<any>

// Reset to defaults
await resetSessionState(): Promise<void>
```

##### Magic Canvas State API
```javascript
// Save canvas state
await saveMagicCanvasState(
  key: string,
  canvasState: ExcalidrawElement[],
  appState: object,
  rowManagerState: object,
  version?: number           // State version (default: 1)
): Promise<StateEntry>

// Load canvas state
await loadMagicCanvasState(
  key: string,
  expectedVersion?: number   // Version check
): Promise<StateEntry | null>

// Clear state
await clearMagicCanvasState(key?: string): Promise<number>
```

### 3. Component Communication APIs

#### Row Manager API
**File**: `src/utils/rowManager.js`
**Purpose**: Manages row-based organization for canvas elements

```javascript
class RowManager {
  // Core methods
  assignElementToRow(element: ExcalidrawElement): void
  removeElementFromRow(elementId: string): void
  getRow(elementId: string): Row | null
  getAllRows(): Row[]
  
  // Row operations
  createRow(yStart: number): Row
  deleteRow(rowId: string): void
  updateRowStatus(rowId: string, status: object): void
  
  // State management
  getState(): RowManagerState
  loadState(state: RowManagerState): void
  clear(): void
}
```

#### CAS Equivalence Checker API
**File**: `src/cas/equivalenceChecker.js`
**Purpose**: Checks mathematical equivalence between expressions

```javascript
// Main equivalence check
await checkEquivalence(
  expr1: string,               // First LaTeX expression
  expr2: string,               // Second LaTeX expression
  config?: EquivalenceConfig   // Configuration options
): Promise<EquivalenceResult>

// Configuration interface
interface EquivalenceConfig {
  forceAlgebrite?: boolean,    // Bypass canonicalization
  algebriteTimeout?: number,   // Timeout in ms
  region?: string,             // Math notation region
  floatTolerance?: number      // Floating point comparison tolerance
}

// Result interface
interface EquivalenceResult {
  equivalent: boolean,         // Equivalence determination
  method: string,             // Method used
  canonical1?: string,        // Canonical form of expr1
  canonical2?: string,        // Canonical form of expr2
  time: number,               // Processing time (ms)
  error?: string              // Error message if failed
}
```

### 4. Browser API Contracts

#### File System Access
```javascript
// File upload handling
const handleFileUpload = (event: Event): File[] => {
  const files = event.target.files
  return Array.from(files).filter(file => 
    file.type.startsWith('image/') && 
    file.size <= 10 * 1024 * 1024  // 10MB limit
  )
}

// Drag and drop
const handleDrop = (event: DragEvent): File[] => {
  event.preventDefault()
  const items = event.dataTransfer.items
  return Array.from(items)
    .filter(item => item.kind === 'file')
    .map(item => item.getAsFile())
    .filter(file => file?.type.startsWith('image/'))
}
```

#### Clipboard API
```javascript
// Paste image from clipboard
navigator.clipboard.read().then(items => {
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      return item.getType(item.type)
    }
  }
}).then(blob => {
  // Process image blob for OCR
})

// Copy LaTeX to clipboard
navigator.clipboard.writeText(latexString).then(() => {
  // Show success notification
})
```

#### Storage API
```javascript
// LocalStorage for preferences
localStorage.setItem('texo-debug-mode', 'true')
const debugMode = localStorage.getItem('texo-debug-mode') === 'true'

// SessionStorage for temporary state
sessionStorage.setItem('current-workspace', workspaceId)
const currentWorkspace = sessionStorage.getItem('current-workspace')

// IndexedDB for persistent data (see IndexedDB section)
```

## External API Contracts

### 1. Hugging Face Transformers API
**Purpose**: Download FormulaNet model for client-side inference
**Base URL**: `https://huggingface.co/`

**Model Download**:
```javascript
// Automatic model loading via Transformers.js
import { VisionEncoderDecoderModel } from '@huggingface/transformers'

const model = await VisionEncoderDecoderModel.from_pretrained(
  'alephpi/FormulaNet',
  {
    dtype: 'fp32',
    progress_callback: (data) => {
      // Download progress: data.file, data.loaded, data.total
    }
  }
)
```

**Model Files**:
- `model.safetensors`: Model weights (~150MB)
- `config.json`: Model configuration
- `tokenizer.json`: Tokenizer configuration
- `preprocessor_config.json`: Image preprocessing config

**Caching**:
- Browser HTTP cache for model files
- IndexedDB metadata for version tracking
- Automatic cache invalidation on model updates

### 2. KaTeX Rendering API
**Purpose**: Client-side LaTeX rendering
**Usage**: Internal API calls within application

```javascript
import katex from 'katex'

// Render LaTeX to HTML
const html = katex.renderToString(latexString, {
  throwOnError: false,
  displayMode: true,
  output: 'html'
})

// Parse LaTeX to AST (internal API)
const ast = katex.__parse(latexString)
```

### 3. ProseMirror Math Plugin API
**Purpose**: Rich text editing with mathematical expressions
**Plugin**: `@benrbray/prosemirror-math`

```javascript
// Math plugin configuration
const mathPlugin = mathPlugin({
  katexOptions: {
    throwOnError: false
  },
  // Custom commands and macros
  macros: {
    "\\RR": "\\mathbb{R}",
    "\\NN": "\\mathbb{N}"
  }
})
```

## Data Format Specifications

### 1. Image Input Format
**Supported Formats**: PNG, JPEG, WebP, GIF
**Size Limits**: 10MB maximum
**Processing**: Auto-resize to 384x384 pixels
**Color Space**: Grayscale conversion for OCR

### 2. LaTeX Expression Format
**Syntax**: Standard LaTeX mathematical notation
**Encoding**: UTF-8
**Limitations**: No matrix environments (current version)
**Examples**:
```latex
x^2 + 2x + 1 = 0
\frac{d}{dx}(x^2) = 2x
\int_0^{\pi} \sin(x) dx = 2
```

### 3. Canvas Export Format
**Excalidraw JSON**: Native canvas format
**Export Options**:
- PNG/SVG image export
- JSON data export
- LaTeX string export (via OCR)

### 4. Workspace Export Format
```javascript
{
  version: 2,                   // Schema version
  exportedAt: number,            // Export timestamp
  workspace: Workspace,          // Workspace metadata
  casCache: CacheEntry[],        // Canonical form cache
  sessionState: SessionEntry[],   // User preferences
  diagnosticLogs: LogEntry[],    // Application logs
  transformersCache: object[],    // Model metadata
  magicCanvasState: StateEntry[] // Canvas states
}
```

## Error Handling Contracts

### 1. Web Worker Error Handling
```javascript
// Standard error response
{
  type: 'error',
  error: string,               // Human-readable error
  code?: string,               // Error code
  stack?: string,              // Stack trace
  details?: object            // Additional error context
}
```

### 2. IndexedDB Error Handling
**Common Errors**:
- `QuotaExceededError`: Storage limit reached
- `InvalidStateError`: Database corrupted
- `TransactionInactiveError`: Transaction failed
- `VersionError`: Schema version mismatch

**Recovery Strategies**:
- Automatic cache cleanup
- Database reset with user confirmation
- Graceful degradation to in-memory storage

### 3. Component Error Boundaries
```javascript
// Error boundary contract
{
  error: Error,                // React error object
  errorInfo: {
    componentStack: string      // Component stack trace
  },
  reset: function,            // Error recovery function
  retry: function             // Retry failed operation
}
```

## Performance Contracts

### 1. Response Time Targets
| Operation | Target | Maximum |
|-----------|--------|---------|
| Canonicalization | <50ms | 100ms |
| Algebrite fallback | <500ms | 2000ms |
| OCR inference | <3s | 10s |
| Cache lookup | <1ms | 10ms |
| Canvas render | <16ms | 33ms |

### 2. Memory Usage Limits
| Component | Limit | Monitoring |
|-----------|-------|------------|
| Model loading | 200MB | Progress tracking |
| Canvas elements | 10,000 | Performance warnings |
| Cache entries | 10,000 | Automatic cleanup |
| Log entries | 50,000 | Rotation policy |

### 3. Storage Quotas
| Store Type | Limit | Cleanup Policy |
|------------|-------|----------------|
| CAS Cache | 100MB | LRU eviction |
| Canvas State | 50MB | Size-based pruning |
| Diagnostic Logs | 10MB | Time-based rotation |
| Transformers Cache | 200MB | Version cleanup |

## Security Contracts

### 1. Input Validation
```javascript
// File upload validation
const validateImageFile = (file: File): ValidationResult => {
  const maxSize = 10 * 1024 * 1024  // 10MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  
  return {
    valid: file.size <= maxSize && allowedTypes.includes(file.type),
    error: file.size > maxSize ? 'File too large' : 'Invalid file type'
  }
}

// LaTeX validation
const validateLatex = (latex: string): ValidationResult => {
  try {
    katex.__parse(latex)
    return { valid: true }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}
```

### 2. Data Isolation
- Workspace-scoped data storage
- No cross-workspace data access
- Local-only processing guarantee
- User-controlled data deletion

### 3. Privacy Guarantees
- No external data transmission
- No telemetry or analytics
- Offline operation capability
- Client-side only processing