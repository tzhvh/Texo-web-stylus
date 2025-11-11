# Phase 1 Implementation Summary: Core Tiling System

## Overview
Phase 1 implements the foundational tiling system for the Unified Canvas feature, with variable-dimension tiles, overlap tracking, and defensive math unit detection.

## Files Created

### 1. Model Configuration (`src/config/ocrModels.js`)
- Centralized OCR model configuration system
- FormulaNet default configuration (384x384 input)
- 35% overlap strategy (~134px for 384px tiles)
- Restorative merge settings (85% similarity threshold)
- Easy model swapping architecture (Texify placeholder included)

**Key Functions:**
- `getActiveModelConfig()` - Get current model config
- `validateContentSize()` - Check if content fits model constraints
- `calculateTileConfig()` - Determine optimal tiling strategy

### 2. String Utilities (`src/utils/stringUtils.js`)
- Levenshtein distance calculation for LaTeX similarity
- Similarity ratio (0-1 scale)
- Longest common substring finder
- LaTeX normalization
- Fuzzy string matching helpers

**Key Functions:**
- `levenshteinDistance(str1, str2)` - Edit distance
- `similarityRatio(str1, str2)` - 0-1 similarity score
- `normalizeLatex(latex)` - Standardize whitespace/operators

### 3. Math Unit Detection (`src/utils/mathUnits.js`)
- Defensive detection system (>70% confidence threshold)
- **High-priority units** (critical if split):
  - Fractions (horizontal line + numerator/denominator)
  - Radicals (√ symbol + content)
  - Integrals (∫ with bounds + integrand)
  - **Exponents** (superscript detection)
- Medium-priority units:
  - Summations (∑ with bounds)
  - Subscripts

**Key Class: `MathUnitDetector`**
- `findUnits(elements)` - Detect all critical math structures
- `detectFraction()` - Find fraction bars with content
- `detectExponent()` - Find superscripts (e.g., x², y³)
- `detectRadical()` - Find square roots
- `detectIntegral()` - Find integral symbols
- Spatial indexing with RBush for fast queries
- Baseline grouping for exponent/subscript detection

**Exponent Detection Details:**
- Looks for small elements (20-60% of base height)
- Positioned above and to the right of base
- Confidence scoring based on size ratio and position
- Prevents splitting "x²" into "x^" and "2"

### 4. Tiling Engine (`src/utils/ocrTiling.js`)
- Variable-dimension tile generation (192px - 768px wide)
- 35% overlap between adjacent tiles
- Math unit-aware boundary adjustment
- Whitespace gap finder for clean splits
- Comprehensive tile metadata tracking

**Key Class: `TilingEngine`**
- `generateRowTiles(rowId, elements, canvasWidth)` - Main entry point
- `splitIntoVariableTiles()` - Multi-tile strategy with overlap
- `createVariableTile()` - Tile object with all metadata
- `adjustForMathUnits()` - Boundary adjustment logic
- `findWhitespaceGap()` - Locate clean split points

**Tile Object Structure:**
```javascript
{
  index: 0,
  rowId: 0,
  hash: "sha256...",
  elements: [...],
  bounds: { minX, maxX, minY, maxY },
  logicalWidth: 500,   // Before scaling
  logicalHeight: 384,
  outputWidth: 384,    // Model input size
  outputHeight: 384,
  scale: 0.768,
  padding: { x, y },
  offsetX: 100,        // Canvas position
  mathUnits: [...],    // Detected units
  leftOverlap: {
    start: 100,
    end: 234,
    size: 134,
    sharedWith: 0,     // Previous tile index
    startInTile: 50,   // In scaled coordinates
    endInTile: 184
  },
  rightOverlap: {...},
  latex: null,         // Populated after OCR
  leftOverlapLatex: null,
  rightOverlapLatex: null
}
```

### 5. OCR Worker Pool (`src/workers/ocrWorkerPool.js`)
- Parallel processing with 2-4 workers
- Task queue with priority handling
- Progress tracking and aggregation
- Retry logic (up to 2 retries per tile)
- Worker lifecycle management

**Key Class: `OCRWorkerPool`**
- `initialize(modelConfig)` - Start all workers
- `processTiles(tiles, progressCallback)` - Batch processing
- `getStatus()` - Pool health monitoring
- `terminate()` - Cleanup

### 6. Tests (`src/utils/__tests__/ocrTiling.test.js`)
- Comprehensive test suite for tiling engine
- Edge case coverage (empty rows, single elements, very wide content)
- Math unit detection tests
- Overlap verification tests
- Caching tests
- Example usage documentation

## Technical Highlights

### Variable Dimension Tiles
```
Standard tile:     384w × 384h → no scaling needed
Wide tile:         500w × 384h → scaled to 384×384 (scale: 0.768)
Extra-wide tile:   768w × 384h → scaled to 384×384 (scale: 0.5)
```

### Overlap Strategy
```
Tile A: [0────────384]
Tile B:       [250──────634]
              ↑    ↑
              134px overlap
              (35% of 384px)
```

**Benefits:**
- Cross-validation of OCR results
- Seam detection for restorative merging
- Context for boundary symbols

### Math Unit Protection

**Example: Exponent Protection**
```
User writes: x² + 4x + 4

Without protection:
  Tile 1: "x^"     ← Incomplete
  Tile 2: "2 + 4x" ← Missing base

With protection:
  Detects: exponent unit (x + superscript 2)
  Tile 1: "x² + 4x" ← Complete unit
  Tile 2: "+ 4x + 4"
```

**Example: Fraction Protection**
```
User writes: (a + b) / (c + d)

Fraction detected:
  - Numerator: a + b
  - Line: ────
  - Denominator: c + d

Tile boundary adjusted to include full fraction.
```

### Intelligent Boundary Adjustment

**Priority Order:**
1. Include complete critical math units
2. Extend tile if unit fits (< 768px)
3. Shrink tile to exclude unit (> 192px)
4. Find whitespace gap near boundary
5. Standard boundary (fallback)

## Configuration

### Default Settings
- **Row Height:** 384px (matches model input height)
- **Tile Width:** 384px (preferred), 192-768px (range)
- **Overlap:** 35% (~134px for standard tiles)
- **Min Overlap:** 50px
- **Max Overlap:** 200px
- **Confidence Threshold:** 70% for math unit detection

### Model Configuration (FormulaNet)
```javascript
{
  inputSize: { width: 384, height: 384 },
  preferredTileWidth: 384,
  maxTileWidth: 768,
  tileOverlap: { strategy: 'percentage', value: 0.35 },
  restorativeMerge: { similarityThreshold: 0.85 }
}
```

## Example Scenarios

### Scenario 1: Short Expression
```
Input: "x + 2"
Tiles: 1
Output: Single 384×384 tile, no overlap
```

### Scenario 2: Long Expression
```
Input: "∑ᵢ₌₁ⁿ aᵢxᵢ + ∑ⱼ₌₁ᵐ bⱼyⱼ = 0"  (900px wide)
Tiles: 3
Overlaps:
  - Tile 1 ↔ Tile 2: 134px
  - Tile 2 ↔ Tile 3: 134px
Math Units Detected:
  - Summation₁ (with bounds i=1 to n)
  - Summation₂ (with bounds j=1 to m)
```

### Scenario 3: Fraction at Boundary
```
Input: "x + y + (a+b)/(c+d) + z"
         ─────────┬──────────
              Boundary was here

Action: Boundary adjusted to include full fraction
Result: Fraction not split across tiles
```

### Scenario 4: Exponents
```
Input: "x² + 2xy² + y⁴"
Math Units Detected: 3 exponents
- x² (base + superscript)
- y² (base + superscript)
- y⁴ (base + superscript)
All kept intact within tiles
```

## Performance

### Measurements (Expected)
- Tile generation: 10-50ms per row
- Math unit detection: 5-20ms per row
- Single tile OCR: 800ms - 2s
- Parallel (2 workers): ~1.5s for 2 tiles
- Cache hit: <1ms

### Memory Usage
- Tile cache: ~5-10MB for 100 tiles
- Worker pool: ~50MB per worker
- Spatial index: ~1-2MB per row

## Next Steps (Phase 2)

### Restorative Merging
1. LaTeX tokenizer for overlap extraction
2. Similarity comparison using Levenshtein
3. Repair strategies (longer/shorter/average)
4. Seam artifact detection

### Visual Feedback
1. Debug layer for tile visualization
2. Overlap region highlighting
3. Math unit bounding boxes
4. Repair indicators

### Integration
1. UnifiedCanvas component
2. Row management system
3. Auto-validation hook
4. Workspace persistence

## Dependencies

### New
- `rbush` - Spatial indexing for math unit detection
- `crypto-js` - Tile hashing for caching

### Existing
- `@huggingface/transformers` - OCR model
- `@excalidraw/excalidraw` - Canvas rendering

## Testing

Run tests:
```bash
npm test src/utils/__tests__/ocrTiling.test.js
```

See test file for example usage and edge cases.

## Notes

1. **Exponent detection** is now high-priority to prevent splitting x² → "x^" + "2"
2. **35% overlap** provides good balance between redundancy and performance
3. **Defensive detection** only flags obvious units (>70% confidence) to avoid false positives
4. **Row height = 384px** matches model input, giving users more vertical space
5. **Model-agnostic** design allows easy swapping (see ocrModels.js)

## Philosophy

Following the "slow down and immerse in math" approach:
- Math unit detection is defensive, not prescriptive
- System prevents catastrophic OCR errors but doesn't micro-manage
- User can always erase and rewrite if detection misses something
- Focus on mathematical correctness over speed

---

**Phase 1 Complete** ✅
- Model config system ✓
- Variable tiling ✓
- Overlap tracking ✓
- Math unit detection (with exponents) ✓
- Worker pool ✓
- Test suite ✓

**Ready for Phase 2:** Restorative Merging + Visual Feedback
