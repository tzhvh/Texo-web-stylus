# Document-Driven Architecture

## Overview

The MagicCanvas has been rearchitected to use a **document-driven dataflow** pattern. This architecture provides:

- **Single Source of Truth**: All state lives in an immutable `MagicCanvasDocument`
- **Immutable Updates**: State changes create new document versions
- **Automatic History**: Every change is tracked for undo/redo
- **Event Sourcing**: Operations are recorded as discrete events
- **Reactive Updates**: UI automatically syncs with document changes
- **Auto-persistence**: Changes are automatically saved to storage

## Core Components

### 1. MagicCanvasDocument (`src/models/MagicCanvasDocument.js`)

The central immutable data structure that represents the entire canvas state.

```javascript
class MagicCanvasDocument {
  // Identity
  id: string
  version: number
  createdAt: timestamp
  updatedAt: timestamp

  // Canvas state (Excalidraw)
  elements: Element[]
  appState: object
  files: object

  // Row state
  rows: Map<rowId, RowData>
  rowConfig: { height: 384 }

  // Metadata
  metadata: { title, author, tags }
}
```

**Key Features:**
- Immutable updates via `withXXX()` methods
- Each update creates a new document instance
- Version number increments automatically
- Serializable to/from JSON

**Example Usage:**
```javascript
// Update elements
const newDoc = document.withElements(newElements);

// Update row OCR result
const updatedDoc = document.withOCRResult(rowId, { latex, confidence });

// Multiple updates
const doc2 = document
  .withRow(0, { latex: "x^2" })
  .withRow(1, { latex: "x^2 + 2x" });
```

### 2. RowData Class

Individual row state encapsulated in a class:

```javascript
class RowData {
  // Identity
  id: number
  y: number
  height: number

  // Elements
  elementIds: Set<string>

  // OCR State
  latex: string | null
  tiles: Tile[]
  ocrStatus: 'pending' | 'processing' | 'complete' | 'error'
  ocrProgress: number (0-1)
  ocrError: string | null

  // Validation State
  validationStatus: 'unchecked' | 'validating' | 'valid' | 'invalid' | 'error'
  validationResult: object | null
  validationError: string | null

  // Metadata
  version: number
  lastModified: timestamp
}
```

### 3. DocumentStore (`src/models/DocumentStore.js`)

Manages document lifecycle, persistence, and history.

**Responsibilities:**
- **History Management**: Maintains undo/redo stack
- **Persistence**: Auto-save to localStorage with debouncing
- **Event Sourcing**: Logs all operations for debugging
- **Subscriptions**: Pub/sub for reactive updates

**Key Methods:**
```javascript
store.applyOperation(type, data)  // Apply an operation
store.undo()                       // Undo last change
store.redo()                       // Redo undone change
store.save()                       // Save to localStorage
store.exportJSON()                 // Export as JSON
store.subscribe(callback)          // Subscribe to changes
```

**Operation Types:**
- `canvas:update-elements` - Update Excalidraw elements
- `canvas:update-appstate` - Update Excalidraw app state
- `elements:assign` - Assign elements to rows
- `row:update` - Update a single row
- `ocr:update-result` - Update OCR result
- `validation:update-result` - Update validation result

### 4. React Hooks (`src/hooks/useDocument.js`)

Provide reactive access to the document store.

#### useDocument()
Access the current document and store:
```javascript
const { document, store } = useDocument();
const row = document.getRow(0);
```

#### useDocumentOperations()
Perform operations on the document:
```javascript
const ops = useDocumentOperations();
ops.updateElements(elements);
ops.updateOCRResult(rowId, result);
ops.assignElements(elements);
```

#### useDocumentHistory()
Undo/redo functionality:
```javascript
const { canUndo, canRedo, undo, redo } = useDocumentHistory();
```

#### useDocumentPersistence()
Save and export:
```javascript
const { save, hasUnsavedChanges, exportJSON } = useDocumentPersistence();
```

#### useDocumentStats()
Get document statistics:
```javascript
const stats = useDocumentStats();
// { version, elementCount, rowCount, ocrCompleteCount, ... }
```

### 5. Domain-Specific Hooks

#### useDocumentOCR() (`src/hooks/useDocumentOCR.js`)
OCR processing integrated with document operations:
```javascript
const { processRow, processAllRows } = useDocumentOCR();
await processRow(rowId, excalidrawAPI);
```

#### useDocumentValidation() (`src/hooks/useDocumentValidation.js`)
Mathematical validation with auto-validation:
```javascript
const { validateRow, validateAllRows } = useDocumentValidation({
  autoValidate: true,
  debounceMs: 500
});
```

## Data Flow

### Traditional Imperative Approach (Before)
```
User Action
  ↓
Event Handler
  ↓
updateState() - scattered across hooks
  ↓
setState() - multiple useState calls
  ↓
Re-render
```

### Document-Driven Approach (After)
```
User Action
  ↓
Event Handler
  ↓
ops.applyOperation(type, data)
  ↓
DocumentStore
  ├─ Create new document
  ├─ Add to history
  ├─ Record operation
  └─ Notify subscribers
  ↓
React Hook (useDocument)
  ├─ Receives update event
  └─ Triggers re-render
  ↓
UI updates with new document
```

### Example: Processing a Row

**Before (Imperative):**
```javascript
// Scattered state updates
updateOCRStatus(rowId, 'processing', { progress: 0 });
// ... process ...
updateOCRStatus(rowId, 'processing', { progress: 0.5 });
// ... assemble ...
updateOCRStatus(rowId, 'complete', { latex, tiles });
```

**After (Document-Driven):**
```javascript
// Clear operation boundaries
ops.updateOCRStatus(rowId, 'processing', { progress: 0 });
// ... process ...
ops.updateOCRStatus(rowId, 'processing', { progress: 0.5 });
// ... assemble ...
ops.updateOCRResult(rowId, { latex, confidence, tiles });
```

### Example: Undo/Redo

**Before:** Not possible without manual implementation

**After:** Automatic via history:
```javascript
// User draws elements
ops.assignElements(elements); // v1

// User processes row
ops.updateOCRResult(0, result); // v2

// User undos
undo(); // Back to v1 (no OCR result)

// User redos
redo(); // Forward to v2 (OCR result restored)
```

## Benefits

### 1. Single Source of Truth
- All state in one immutable document
- No prop drilling or context hell
- Easy to reason about state

### 2. Time-Travel Debugging
- Full history of all changes
- Undo/redo built-in
- Can inspect any previous state

### 3. Simplified Testing
- Test operations in isolation
- Pure functions (document in → document out)
- No mocking of hooks

### 4. Better Performance
- Immutable updates enable React optimization
- Can use React.memo and useMemo effectively
- Batch updates automatically

### 5. Event Sourcing
- Every change is logged
- Can replay operations
- Audit trail for debugging

### 6. Easy Persistence
- Serialize entire document to JSON
- Auto-save with debouncing
- Export/import functionality

## Migration Path

### Old Pattern (useRowSystem)
```javascript
const {
  rows,
  updateRows,
  updateOCRStatus,
  getAllRows
} = useRowSystem();

// Update
updateRows(elements);
updateOCRStatus(rowId, 'complete', { latex });
```

### New Pattern (useDocument)
```javascript
const { document } = useDocument();
const ops = useDocumentOperations();

// Update
ops.assignElements(elements);
ops.updateOCRResult(rowId, { latex });

// Query
const rows = document.getAllRows();
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   MagicCanvas Component                  │
│  (Presentation layer - renders UI)                      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ├─ useDocument()
                        ├─ useDocumentOperations()
                        ├─ useDocumentHistory()
                        ├─ useDocumentOCR()
                        └─ useDocumentValidation()
                        │
┌───────────────────────┴─────────────────────────────────┐
│                   React Hooks Layer                      │
│  (Reactive subscriptions to document)                   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                   DocumentStore                          │
│  - Current document                                      │
│  - History (for undo/redo)                              │
│  - Operation log                                         │
│  - Subscribers                                           │
│  - Auto-save logic                                       │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│              MagicCanvasDocument (Immutable)             │
│  - elements (Excalidraw)                                │
│  - rows (Map<id, RowData>)                              │
│  - metadata                                              │
│  - withXXX() methods for updates                        │
└──────────────────────────────────────────────────────────┘
```

## Future Enhancements

### 1. Real-time Collaboration
Document operations can be broadcast to other clients:
```javascript
store.subscribe(event => {
  if (event.operation) {
    websocket.send(event.operation);
  }
});
```

### 2. Cloud Persistence
Replace localStorage with cloud storage:
```javascript
store.save() // → API call to save document
```

### 3. Conflict Resolution
When loading remote changes:
```javascript
store.merge(remoteDocument, localDocument);
```

### 4. Operation Replay
Reconstruct document from operations:
```javascript
const document = operations.reduce(
  (doc, op) => applyOperation(doc, op),
  initialDocument
);
```

### 5. Snapshots
Store snapshots periodically for performance:
```javascript
if (operations.length > 100) {
  store.createSnapshot();
  store.clearOldOperations();
}
```

## Best Practices

### 1. Always Use Operations
Never mutate the document directly:
```javascript
// ❌ Bad
document.rows.set(0, newRow);

// ✅ Good
ops.updateRow(0, updates);
```

### 2. Batch Related Updates
Use batch operations for multiple changes:
```javascript
// ❌ Bad
ops.updateRow(0, { latex: "x^2" });
ops.updateRow(1, { latex: "x^2 + 2x" });

// ✅ Good
ops.updateRows(new Map([
  [0, { latex: "x^2" }],
  [1, { latex: "x^2 + 2x" }]
]));
```

### 3. Keep UI State Separate
Don't put UI-only state in the document:
```javascript
// UI state (not in document)
const [selectedRow, setSelectedRow] = useState(null);
const [debugMode, setDebugMode] = useState(false);

// Document state
const { document } = useDocument();
```

### 4. Subscribe Wisely
Only subscribe to what you need:
```javascript
// ✅ Good - specific row
const row = useRow(rowId);

// ❌ Bad - entire document when you only need one row
const { document } = useDocument();
const row = document.getRow(rowId);
```

### 5. Handle Async Operations
OCR and validation are async - handle properly:
```javascript
const processRow = async (rowId) => {
  try {
    ops.updateOCRStatus(rowId, 'processing');
    const result = await performOCR();
    ops.updateOCRResult(rowId, result);
  } catch (error) {
    ops.updateOCRStatus(rowId, 'error', { error: error.message });
  }
};
```

## Summary

The document-driven architecture transforms MagicCanvas from an imperative, hook-scattered system into a declarative, centralized state machine. All changes flow through well-defined operations, history is automatic, and the UI reactively updates to document changes.

This architecture is:
- **Predictable**: Clear data flow
- **Testable**: Pure operations
- **Debuggable**: Full history
- **Scalable**: Easy to extend
- **Maintainable**: Centralized state
