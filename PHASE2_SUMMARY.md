# Phase 2 Implementation Summary: Restorative Merging + UnifiedCanvas

## Overview
Phase 2 implements the LaTeX assembly system with restorative merging, the full-screen UnifiedCanvas page with ruled lines, and bidirectional Excalidraw interaction.

## Files Created

### 1. LaTeX Assembly System (`src/utils/latexAssembly.js`)
Restorative merging system that combines LaTeX fragments from overlapping tiles with verification and repair.

**Key Classes:**

#### `LatexTokenizer`
- `tokenize(latex)` - Breaks LaTeX into logical units
  - Handles commands (`\frac`, `\sum`, `\int`)
  - Preserves braces and structure
  - Separates operators
- `tokensToLatex(tokens)` - Reconstructs LaTeX from tokens with proper spacing
- `estimateTokensInRange(tokens, startRatio, endRatio)` - Extract subset for overlap analysis

**Tokenization Examples:**
```javascript
"x^2 + 4x + 4" → ["x", "^", "2", "+", "4", "x", "+", "4"]
"\frac{a}{b}" → ["\frac", "{", "a", "}", "{", "b", "}"]
"\sum_{i=1}^{n}" → ["\sum", "_", "{", "i", "=", "1", "}", "^", "{", "n", "}"]
```

#### `RestorativeLatexAssembler`
- `assembleTiles(tiles)` - Main assembly pipeline
  - Returns: `{ latex, confidence, repairs, tileCount }`

- `extractOverlapSegments(tiles)` - Identify LaTeX corresponding to overlap regions
  - Uses tile overlap ratios to estimate which tokens are in overlap

- `mergeWithVerification(tiles)` - Merge with three outcomes:
  - **Identical** (confidence: 1.0): Perfect match, merge normally
  - **Similar** (confidence: 0.75-0.95): Minor differences, apply repair
  - **Different** (confidence: 0.5): Major mismatch, flag and keep left

- `compareOverlaps(left, right)` - Similarity analysis
  - Normalizes whitespace
  - Calculates Levenshtein distance
  - Returns similarity ratio (0-1)

- `repairOverlap(left, right, comparison)` - Three repair strategies:
  - **'longer'**: Assume longer version captured more detail
  - **'shorter'**: Assume shorter version is cleaner
  - **'average'**: Merge both (currently uses longer)

- `cleanLatex(latex)` - Normalize output
  - Remove duplicate operators
  - Fix spacing
  - Clean braces

**Merge Scenarios:**

```
Scenario A: Identical Overlap
  Tile 1: "x^2 + 4x +"
  Tile 2: "+ 4x + 4"
  Overlap: "+ 4x +" vs "+ 4x +"
  Result: "x^2 + 4x + 4" (confidence: 1.0)

Scenario B: Similar Overlap (Repair)
  Tile 1: "a^2 + b^2 ="
  Tile 2: "+ b^z = c"  (OCR error: 2→z)
  Overlap: "+ b^2 =" vs "+ b^z ="
  Similarity: 87%
  Repair: Use longer/more complete
  Result: "a^2 + b^2 = c" (confidence: 0.85)

Scenario C: Different Overlap (Flag)
  Tile 1: "x + y"
  Tile 2: "a + b"  (Different content)
  Overlap: "x" vs "a"
  Similarity: 20%
  Action: Keep left, flag mismatch
  Result: "x + y + b" (confidence: 0.5)
  Repairs: [{ type: 'mismatch', position: 1 }]
```

### 2. Comprehensive Unit Tests (`src/utils/__tests__/latexAssembly.test.js`)
- **LatexTokenizer Tests** (15+ tests)
  - Tokenization of simple/complex expressions
  - Fractions, exponents, summations, integrals
  - Round-trip accuracy
  - Token range estimation

- **RestorativeLatexAssembler Tests** (25+ tests)
  - Single tile handling
  - Identical overlap merging
  - Similar overlap repair
  - Different overlap flagging
  - Multi-tile assembly
  - Comparison logic
  - LaTeX cleaning

- **Integration Tests** (5 real scenarios)
  - Quadratic formula across tiles
  - Summation with subscripts/superscripts
  - Integral with limits
  - Matrix notation
  - Complex nested expressions

### 3. Row System Hook (`src/hooks/useRowSystem.js`)
State management for rows on the infinite canvas.

**RowManager Class:**
- `getRowForY(y)` - Convert Y coordinate to row ID
- `assignElement(element)` - Assign element to row based on center Y
- `updateAssignments(elements)` - Batch update all assignments
- `getRowElements(rowId, allElements)` - Get elements in row
- `getRowsInView(viewport)` - Get visible rows
- `clearRow(rowId)` - Clear row content
- `lockRow(rowId)` / `unlockRow(rowId)` - Lock/unlock editing
- `duplicateRow(sourceRowId, targetRowId)` - Copy row
- `updateOCRStatus(rowId, status, data)` - Update OCR state
- `updateValidationStatus(rowId, status, result)` - Update validation state
- `toJSON()` / `fromJSON(data)` - Serialization

**Row Data Structure:**
```javascript
{
  id: 0,
  y: 0,
  height: 384,
  elements: Set<Element>,
  elementIds: Set<string>,

  // OCR state
  latex: "x^2 + 4x + 4",
  tiles: [...],
  ocrStatus: 'complete',  // 'pending' | 'processing' | 'complete' | 'error'
  ocrError: null,
  ocrProgress: 1.0,

  // Validation state
  validationStatus: 'valid',  // 'unchecked' | 'validating' | 'valid' | 'invalid' | 'error'
  validationResult: {...},
  validationError: null,

  // Metadata
  locked: false,
  lastModified: timestamp,
  version: 3,
  createdAt: timestamp,
  ocrCompletedAt: timestamp,
  validatedAt: timestamp
}
```

**React Hook API:**
```javascript
const {
  rows,              // Map<rowId, RowData>
  selectedRow,       // number | null
  assignments,       // Map<elementId, rowId>
  rowManager,        // RowManager instance

  updateRows,        // (elements) => void
  getRowElements,    // (rowId, allElements) => Element[]
  getRowsInView,     // (viewport) => RowData[]
  getRow,            // (rowId) => RowData
  getAllRows,        // () => RowData[]
  clearRow,          // (rowId, keepStructure?) => void
  lockRow,           // (rowId) => void
  unlockRow,         // (rowId) => void
  duplicateRow,      // (sourceRowId, targetRowId) => RowData
  selectRow,         // (rowId) => void
  updateOCRStatus,   // (rowId, status, data?) => void
  updateValidationStatus, // (rowId, status, result?, error?) => void
  saveToStorage,     // () => Promise<data>
  loadFromStorage    // (data) => Promise<void>
} = useRowSystem(rowHeight);
```

### 4. UnifiedCanvas Page (`src/pages/UnifiedCanvas.jsx`)
Full-screen infinite canvas with ruled lines, OCR processing, and validation.

**Key Features:**

#### Ruled Lines System
- Horizontal lines every 384px (row height)
- Gray color (#e5e7eb) with 30% opacity
- Locked (non-editable)
- Extend beyond viewport
- Automatically generated based on viewport

#### Row Interaction
- Click row to select
- Visual highlight on selection (blue border)
- Row number display
- OCR status badge
- LaTeX output preview
- Validation status icon

#### OCR Processing Pipeline
1. User draws in row
2. Click "Process Row" or Ctrl+Enter
3. Generate tiles for row (using TilingEngine)
4. Render each tile to blob (Excalidraw export)
5. Send tiles to OCR worker pool (parallel processing)
6. Assemble LaTeX (RestorativeLatexAssembler)
7. Display result in row overlay

#### Progress Tracking
- Phase 1: Rendering tiles (0-30%)
- Phase 2: OCR processing (30-80%)
- Phase 3: Assembly (80-100%)
- Live updates in toolbar

#### Keyboard Shortcuts
- **Ctrl+Enter**: Process selected row (or all rows if none selected)
- **D**: Toggle debug mode

#### Debug Mode
Shows per-row:
- Element count
- Tile count
- Tile dimensions
- Math units detected
- Overlap info

#### Bidirectional Interaction
- **Canvas → State**: onChange handler updates row assignments
- **State → Canvas**: Row dividers injected into scene
- **State → Overlays**: React overlays positioned over rows
- **User → State**: Click handlers for row selection

**Component Structure:**
```jsx
<UnifiedCanvas>
  <div className="canvas-container">
    <Excalidraw
      excalidrawAPI={setExcalidrawAPI}
      onChange={handleSceneChange}
    />
  </div>

  <div className="row-overlays">
    {visibleRows.map(row => (
      <RowOverlay row={row} />
    ))}
  </div>

  <div className="unified-toolbar">
    <button onClick={processAllRows}>Process All</button>
    <button onClick={() => processRow(selectedRow)}>
      Process Row {selectedRow}
    </button>
    <button onClick={() => setDebugMode(!debugMode)}>
      Debug: {debugMode ? 'ON' : 'OFF'}
    </button>
  </div>

  <div className="status-bar">
    <span>Row height: 384px</span>
    <span>Model: FormulaNet</span>
  </div>
</UnifiedCanvas>
```

### 5. Styling (`src/pages/UnifiedCanvas.css`)
- Full-screen layout
- Row overlays with hover effects
- Status badges (OCR, validation)
- LaTeX preview box
- Floating toolbar with shadow
- Status bar at bottom
- Responsive design
- Smooth animations (pulse for processing states)

### 6. App Integration (`src/App.jsx`)
- Added `/unified` route
- Added "Unified Canvas" navigation link
- UnifiedCanvas component import

## Technical Architecture

### Data Flow

```
User draws stroke
    ↓
Excalidraw onChange
    ↓
updateRows(elements)
    ↓
RowManager assigns elements to rows
    ↓
User clicks "Process Row"
    ↓
TilingEngine generates tiles
    ↓
Render tiles to blobs (Excalidraw export)
    ↓
OCRWorkerPool processes tiles (parallel)
    ↓
RestorativeLatexAssembler merges fragments
    ↓
updateOCRStatus(rowId, 'complete', {latex, tiles, confidence})
    ↓
Row overlay displays LaTeX and status
```

### State Management

```
UnifiedCanvas Component
    ↓
useRowSystem Hook
    ↓
RowManager Class
    ↓
rows Map<rowId, RowData>
```

### OCR Pipeline

```
Row Elements → TilingEngine → Tiles
                                ↓
                            Render to Blobs
                                ↓
                         OCRWorkerPool (2-4 workers)
                                ↓
                         LaTeX Fragments
                                ↓
                    RestorativeLatexAssembler
                                ↓
                     Merged LaTeX + Confidence
```

## Key Features

### 1. Restorative Merging
- 35% overlap verification
- Three-tier approach: identical, similar, different
- Automatic repair for minor OCR errors
- Confidence scoring
- Repair logging for diagnostics

### 2. Ruled Lines
- Infinite vertical scrolling
- 384px row height
- Visual boundaries for user
- Non-intrusive gray lines

### 3. Bidirectional Interaction
- Excalidraw manages canvas rendering
- React manages row state and overlays
- Row dividers injected into Excalidraw scene
- Overlays positioned absolutely over canvas

### 4. Row-Based Processing
- Process individual rows on demand
- Or batch process all rows
- Independent OCR per row
- Parallel tile processing within row

### 5. Visual Feedback
- OCR status: pending, processing, complete, error
- Validation status: unchecked, valid, invalid, error
- LaTeX preview
- Progress tracking
- Debug info overlay

## Example Workflows

### Workflow 1: Simple Expression
```
1. User draws "x² + 4x + 4" in row 0
2. Click "Process Row 0"
3. System:
   - Generates 1 tile (fits in 384px)
   - Renders tile to blob
   - Sends to OCR worker
   - Receives "x^2 + 4x + 4"
   - No merging needed (single tile)
4. Row displays: ✓ OCR Complete
5. LaTeX preview: "x^2 + 4x + 4"
```

### Workflow 2: Long Expression with Repair
```
1. User draws "a² + b² + c² = (a + b + c)²" across 800px
2. Click "Process Row 0"
3. System:
   - Generates 3 tiles (250px overlap each)
   - Tile 1: "a^2 + b^2"
   - Tile 2: "+ b^2 + c^2 ="  (overlap: "+ b^2")
   - Tile 3: "c^2 = (a + b + c)^2"  (overlap: "c^2 =")

4. Assembly:
   - Tile 1↔2: overlap "+ b^2" identical ✓
   - Tile 2↔3: overlap "c^2 =" similar (87%) ~
     - Repair: use longer version
   - Merged: "a^2 + b^2 + c^2 = (a + b + c)^2"
   - Confidence: 0.93
   - Repairs: 1

5. Row displays: ✓ OCR Complete (0.93 confidence)
```

### Workflow 3: Debug Mode
```
1. Press 'D' to toggle debug mode
2. Each row now shows:
   - Elements: 8
   - Tiles: 2
   - Tile dims: 500x384, 400x384
3. Can verify tiling logic visually
```

## Configuration

### Row System
```javascript
const ROW_HEIGHT = 384;  // Matches model input size
const ROW_COLOR = '#e5e7eb';
const ROW_DIVIDER_OPACITY = 30;
```

### OCR Processing
```javascript
const WORKER_POOL_SIZE = 2;  // Parallel workers
const OVERLAP_PERCENTAGE = 0.35;  // 35%
const SIMILARITY_THRESHOLD = 0.85;  // 85%
```

### Repair Strategies
```javascript
confidenceBoost: 'longer'  // 'longer' | 'shorter' | 'average'
```

## Performance

### Expected Timings
- Tile generation: 10-50ms per row
- Tile rendering: 50-200ms per tile
- OCR per tile: 800ms - 2s
- Assembly: 10-50ms
- **Total per row**: 1-5 seconds (depending on tile count)

### Optimizations
- Parallel tile processing (2-4 workers)
- Tile caching by hash
- Lazy row divider generation
- Virtual scrolling for overlays (only render visible rows)

## Testing

### Unit Test Coverage
- **Tokenizer**: 15 tests
- **Assembler**: 25 tests
- **Integration**: 5 real scenarios
- **Total**: 45+ test cases

### Test Scenarios
- Simple expressions
- Complex nested structures
- Multi-tile merging
- Overlap verification
- Repair strategies
- Edge cases (empty, single element, very wide)

## Integration Points

### With Phase 1
- Uses TilingEngine for tile generation
- Uses MathUnitDetector (fractions, exponents, etc.)
- Uses OCRWorkerPool for parallel processing
- Uses model configuration system

### With Existing Features
- Excalidraw canvas rendering
- Logger for diagnostics
- Model configuration (FormulaNet)

### Future Integration (Phase 3)
- Validation with existing checkEquivalence
- Workspace persistence with workspaceDB
- Export to various formats

## Known Limitations

1. **OCR Accuracy**: Dependent on model quality, may need manual correction
2. **Overlap Estimation**: Token-based estimation may not perfectly match spatial overlap
3. **Complex Structures**: Matrices and multi-line expressions may need special handling
4. **Performance**: Large canvases with many rows may slow down

## Future Enhancements

### Phase 3 (Next)
- [ ] Sequential validation (row N must equal row N-1)
- [ ] Visual feedback for validation (green/red tint)
- [ ] Workspace persistence
- [ ] Export to LaTeX document
- [ ] Import previous sessions

### Quality of Life
- [ ] Manual LaTeX editing inline
- [ ] Row copy/paste
- [ ] Undo OCR
- [ ] Tile visualization in debug mode
- [ ] Confidence threshold settings

### Advanced Features
- [ ] Auto-validation on OCR complete
- [ ] Real-time OCR as you draw
- [ ] Multi-user collaboration
- [ ] Cloud storage integration

---

## Phase 2 Complete ✅

**New Files** (5 files, ~1,500 lines):
- ✅ src/utils/latexAssembly.js
- ✅ src/utils/__tests__/latexAssembly.test.js
- ✅ src/hooks/useRowSystem.js
- ✅ src/pages/UnifiedCanvas.jsx
- ✅ src/pages/UnifiedCanvas.css

**Modified Files** (1 file):
- ✅ src/App.jsx (added route)

**Key Achievements**:
- ✅ LaTeX tokenizer with structure preservation
- ✅ Restorative merging with 3-tier verification
- ✅ Repair strategies (longer/shorter/average)
- ✅ 45+ unit tests with real LaTeX fragments
- ✅ Row system with full state management
- ✅ UnifiedCanvas full-screen page
- ✅ Ruled lines every 384px
- ✅ Bidirectional Excalidraw interaction
- ✅ OCR processing pipeline
- ✅ Visual feedback system
- ✅ Debug mode
- ✅ Keyboard shortcuts

**Next**: Phase 3 (Sequential Validation + Workspace Persistence)
