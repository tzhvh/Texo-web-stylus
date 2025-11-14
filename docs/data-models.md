# Data Models and Schema Documentation

## Overview

Texo-web-stylus uses a sophisticated data modeling approach that combines mathematical AST structures, canvas state management, and client-side persistence. The application operates without a traditional backend database, using IndexedDB for local storage and in-memory data structures for real-time operations.

## Core Data Models

### 1. Mathematical Expression Models

#### KaTeX AST Structure
The application parses LaTeX expressions into KaTeX Abstract Syntax Trees (AST) with the following node types:

```javascript
// Core AST Node Types
{
  type: 'textord' | 'mathord' | 'bin' | 'op' | 'atom' | 'supsub' | 'genfrac' | 'sqrt' | 'leftright' | 'array',
  text?: string,           // For text/symbol nodes
  value?: string,          // For operator values
  loc?: {                 // Source location mapping
    start: number,
    end: number
  },
  // Type-specific properties
  base?: ASTNode,         // For supsub, sqrt
  sup?: ASTNode[],        // Superscript
  sub?: ASTNode[],        // Subscript  
  numer?: ASTNode[],      // Numerator (fractions)
  denom?: ASTNode[],     // Denominator (fractions)
  body?: ASTNode[],      // Body content
  args?: ASTNode[][],    // Function arguments
  left?: string,         // Left delimiter
  right?: string         // Right delimiter
}
```

#### Simplified Canonical AST
For equivalence checking, KaTeX AST is transformed into a simplified canonical form:

```javascript
// Simplified AST for Canonicalization
{
  type: 'number' | 'symbol' | 'operator' | 'power' | 'fraction' | 'sqrt' | 'function' | 'delimited' | 'array',
  value: number | string,    // Actual value
  loc?: Location,            // Source mapping
  // Type-specific structures
  base?: SimplifiedAST,      // Base of power/sqrt
  exponent?: SimplifiedAST,   // Exponent
  numerator?: SimplifiedAST, // Fraction numerator
  denominator?: SimplifiedAST, // Fraction denominator
  body?: SimplifiedAST[],    // Array/function body
  left?: string,            // Delimiters
  right?: string
}
```

### 2. Canvas State Models

#### Excalidraw Element Structure
The Magic Canvas uses Excalidraw's element model with custom extensions:

```javascript
// Base Excalidraw Element
{
  id: string,                    // Unique identifier
  type: 'rectangle' | 'ellipse' | 'freedraw' | 'text' | 'arrow',
  x: number, y: number,         // Position
  width: number, height: number, // Dimensions
  strokeColor: string,           // Styling
  backgroundColor: string,
  fillStyle: 'solid' | 'hachure' | 'cross-hatch' | 'dots',
  strokeWidth: number,
  roughness: number,
  opacity: number,
  isDeleted: boolean,
  // Type-specific properties
  points?: Point[],             // For freedraw
  text?: string,               // For text elements
  startArrowhead?: string,      // For arrows
  endArrowhead?: string
}
```

#### Row Management System
The canvas is organized into horizontal rows for mathematical expression processing:

```javascript
// Row Structure
{
  id: string,                  // Unique row identifier
  yStart: number,              // Y coordinate start
  yEnd: number,                // Y coordinate end
  elementIds: Set<string>,      // Elements in this row
  ocrStatus: 'pending' | 'processing' | 'completed' | 'error',
  validationStatus: 'pending' | 'processing' | 'validated' | 'invalid' | 'error',
  errorMessage?: string,       // Error details
  lastModified?: number        // Timestamp
}

// Row Manager State
{
  rowHeight: number,           // Fixed row height (384px)
  startY: number,             // Canvas start Y
  rows: Row[],                // All rows
  elementToRow: Map<string, string>, // Element → Row mapping
  nextRowId: number           // ID generator
}
```

### 3. IndexedDB Schema

#### Database Structure
Versioned IndexedDB with multiple object stores:

```javascript
// Database: texo-workspace-db (v2)
const STORES = {
  WORKSPACES: 'workspaces',              // Workspace metadata
  CAS_CACHE: 'cas-cache',               // Canonical form cache
  SESSION_STATE: 'session-state',        // User preferences
  DIAGNOSTIC_LOGS: 'diagnostic-logs',  // Application logs
  TRANSFORMERS_CACHE: 'transformers-cache', // ML model metadata
  MAGIC_CANVAS_STATE: 'magic-canvas-state' // Canvas persistence
}
```

#### Workspace Metadata
```javascript
// Workspace Object
{
  id: string,                    // Unique workspace ID
  name: string,                  // Display name
  description: string,           // User description
  createdAt: number,             // Creation timestamp
  metadata: {
    version: number,             // Schema version
    isDefault: boolean          // Default workspace flag
  }
}
```

#### CAS Cache Entries
```javascript
// Canonical Form Cache
{
  workspaceId: string,           // Workspace scope
  latex: string,                 // Original LaTeX (key)
  canonical: string,             // Canonical form
  timestamp: number,            // Cache time
  metadata: {
    method: 'canonicalization' | 'algebrite-difference' | 'algebrite-simplify',
    time: number,               // Processing time
    iterations?: number         // Rule engine iterations
  }
}
```

#### Session State Schema
```javascript
// User Preferences and Settings
{
  workspaceId: string,           // Workspace scope
  key: string,                  // Setting key
  value: any,                   // Setting value
  timestamp: number             // Last updated
}

// Default Session State Values
const DEFAULT_SESSION_STATE = {
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

#### Magic Canvas State Persistence
```javascript
// Complete Canvas State
{
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
  optimized: boolean           // Large canvas optimization flag
}
```

### 4. Application State Models

#### Debug Context
```javascript
// Debug State Management
{
  debugMode: boolean,          // Global debug flag
  setDebugMode: function,      // Setter function
  toggleDebug: function         // Toggle function
}
```

#### OCR Processing State
```javascript
// OCR Worker Communication
{
  type: 'init' | 'predict' | 'ready' | 'progress' | 'result' | 'error',
  modelConfig?: {
    modelName: string,
    env_config?: {
      remoteHost: string,
      remotePathTemplate: string
    }
  },
  image?: File | Blob,         // Input image
  key?: string,               // Request identifier
  output?: string,            // OCR result
  time?: string,              // Processing time
  error?: string,             // Error message
  file?: string,              // Model file being loaded
  loaded?: number,            // Bytes loaded
  total?: number,             // Total bytes
  status?: string             // Loading status
}
```

## Data Flow Patterns

### 1. Mathematical Expression Processing
```
LaTeX Input → KaTeX Parser → AST → Rule Engine → Canonical Form → Cache Check
                                    ↓
                              Algebrite Fallback (if needed)
                                    ↓
                            Equivalence Comparison
```

### 2. Canvas Interaction Flow
```
User Input → Excalidraw Elements → Row Manager Assignment → OCR Processing → Validation → Status Update
                                    ↓
                              IndexedDB Persistence
```

### 3. State Persistence Flow
```
Application State → Session State Store → IndexedDB → Workspace Isolation → Cache Retrieval
```

## Data Validation Rules

### 1. Mathematical Expression Validation
- LaTeX syntax validation via KaTeX parser
- AST structure integrity checks
- Canonical form consistency validation
- Floating-point tolerance comparisons

### 2. Canvas State Validation
- Element coordinate bounds checking
- Row assignment consistency
- Element-to-row mapping integrity
- State version compatibility

### 3. IndexedDB Transaction Validation
- Workspace scope enforcement
- Data type validation
- Timestamp consistency
- Quota limit checking

## Performance Optimizations

### 1. Caching Strategy
- **CAS Cache**: TTL-based (7 days) canonical form caching
- **Transformers Cache**: ML model metadata persistence
- **Session Cache**: User preferences in localStorage

### 2. Large Canvas Optimization
- Element property pruning for persistence
- Set-to-Array conversion for serialization
- Batched state updates

### 3. Memory Management
- Lazy loading of workspace data
- Automatic cache expiration
- Diagnostic log rotation

## Data Integrity Measures

### 1. Corruption Detection
- Magic Canvas state structure validation
- AST node integrity checking
- IndexedDB transaction error handling

### 2. Recovery Mechanisms
- Fallback to default session state
- Cache invalidation on corruption
- Workspace export/import functionality

### 3. Backup Strategies
- Workspace JSON export capability
- Diagnostic log preservation
- State versioning for rollback

## Security Considerations

### 1. Data Isolation
- Workspace-scoped data storage
- No cross-workspace data leakage
- Local-only data processing

### 2. Input Validation
- LaTeX injection prevention
- File type validation for OCR
- Element property bounds checking

### 3. Privacy Protection
- No external data transmission
- Local-only processing guarantee
- User-controlled data deletion