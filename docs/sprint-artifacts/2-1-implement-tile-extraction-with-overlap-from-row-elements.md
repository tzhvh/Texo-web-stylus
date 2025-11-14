# Story 2.1: Implement Tile Extraction with Overlap from Row Elements

Status: drafted

## Story

As a **system component**,
I want **to extract overlapping 384x384px tiles from row elements**,
So that **wide expressions can be processed by the OCR model without losing context at boundaries**.

## Acceptance Criteria

1. **Tile Dimensions**: Each tile is exactly 384x384px (FormulaNet model requirement)
   - **Source**: [Tech Spec Epic 2: Story 2.1, FR25]

2. **Overlap Strategy**: Tiles overlap by 64px (16.7%) horizontally
   - Formula: stride = 384 - 64 = 320px
   - **Source**: [Tech Spec Epic 2: Tile Extraction Algorithm, ADR-002]

3. **Tile Count Calculation**: Number of tiles = ceil((width - 64) / 320) for width > 384px
   - Single tile for rows ≤384px wide
   - **Source**: [Tech Spec Epic 2: TileExtractor Responsibility]

4. **Bounding Box Extraction**: Tiles extracted from row's bounding box (min/max X/Y of all elements)
   - Use RowManager.getRow(rowId) to retrieve row object with elementIds
   - Calculate bbox from Excalidraw elements array
   - **Source**: [Tech Spec Epic 2: Integration Contract 1 - RowManager → TileExtractor]

5. **Image Rendering**: Each tile rendered as 384x384 grayscale ImageData
   - Reuse existing imageProcessor.js patterns (grayscale conversion, normalization)
   - **Source**: [Architecture: Reused Components, Epic 2]

6. **Tile Metadata**: Each Tile object includes complete metadata
   ```javascript
   {
     rowId: string,           // "row-5"
     tileIndex: number,       // 0-based sequential
     offsetX: number,         // Canvas X coordinate
     offsetY: number,         // Canvas Y coordinate (row.yStart)
     width: 384,
     height: 384,
     overlap: number,         // 64px for tiles > index 0, 0 for first tile
     imageData: ImageData,    // 384x384 grayscale
     hash: string             // xxhash for cache lookup
   }
   ```
   - **Source**: [Tech Spec Epic 2: Data Models - Tile Object]

7. **Performance**: Extraction completes within 200ms for typical row (<5 tiles)
   - **Source**: [Tech Spec Epic 2: TileExtractor Performance Budget]

8. **Hash Calculation**: Tile hash computed using xxhash (or inline fast hash) for cache key uniqueness
   - **Source**: [Tech Spec Epic 2: Contract 6 - TileExtractor → OCRCache, ADR-006 no new npm dependencies]

9. **Edge Cases Handled**:
   - Empty rows (no elements): Return empty array []
   - Rows <384px wide: Return single tile, center-cropped to 384x384
   - Invalid bounding box (zero width/height): Throw error per FM-004
   - **Source**: [Tech Spec Epic 2: FM-004 Invalid Bounding Box]

10. **Integration with RowManager**: Respects row metadata from Epic 1
    - Row IDs deterministic: `row-${index}` format
    - Row object includes: yStart, yEnd, elementIds
    - **Source**: [Architecture: ADR-001, Epic 1 Foundation]

## Tasks / Subtasks

- [ ] **Task 1: Create TileExtractor utility module** (AC: #1, #2, #3, #4)
  - [ ] 1.1 Create `src/utils/ocrTiling.js` module
  - [ ] 1.2 Implement `extractTiles(row, elements)` pure function
  - [ ] 1.3 Implement `calculateTilePositions(width, overlap)` helper function
  - [ ] 1.4 Add bounding box calculation from Excalidraw elements array

- [ ] **Task 2: Implement tile image rendering** (AC: #5, #6)
  - [ ] 2.1 Integrate existing imageProcessor.js for grayscale conversion
  - [ ] 2.2 Render each tile as 384x384 ImageData from Excalidraw canvas context
  - [ ] 2.3 Build complete Tile object with all metadata fields

- [ ] **Task 3: Implement tile hashing for cache keys** (AC: #8)
  - [ ] 3.1 Research inline xxhash implementation (no new dependencies)
  - [ ] 3.2 Implement fast hash function for ImageData
  - [ ] 3.3 Add hash field to Tile object

- [ ] **Task 4: Handle edge cases** (AC: #9)
  - [ ] 4.1 Validate bounding box (throw error if width <= 0 or height <= 0)
  - [ ] 4.2 Handle single-tile rows (<384px): center-crop logic
  - [ ] 4.3 Return empty array for empty rows (no elements)

- [ ] **Task 5: Unit tests for TileExtractor** (AC: All)
  - [ ] 5.1 Test single-tile rows (<384px)
  - [ ] 5.2 Test multi-tile rows: 400px (2 tiles), 800px (3 tiles), 1200px (4 tiles)
  - [ ] 5.3 Test overlap calculation: verify 64px overlap, 320px stride
  - [ ] 5.4 Test tile count formula: ceil((width - 64) / 320)
  - [ ] 5.5 Test hash uniqueness: same pixels → same hash, different pixels → different hash
  - [ ] 5.6 Test edge cases: empty row, invalid bbox, zero-width elements
  - [ ] 5.7 Performance test: extractTiles() <200ms for 5-tile row

- [ ] **Task 6: Integration with RowManager from Epic 1** (AC: #10)
  - [ ] 6.1 Import RowManager from `src/utils/rowManager.js`
  - [ ] 6.2 Test integration: RowManager.getRow() → TileExtractor.extractTiles()
  - [ ] 6.3 Verify row metadata consistency (row IDs, elementIds, bounding box)

## Dev Notes

### Architecture Patterns and Constraints

**RowManager Integration (Epic 1 Foundation)**
- RowManager provides row metadata via `getRow(rowId): Row`
- Row object structure from Epic 1:
  ```javascript
  {
    id: string,              // "row-5"
    yStart: number,
    yEnd: number,
    elementIds: Set<string>,
    ocrStatus: 'pending' | 'processing' | 'complete' | 'error',
    transcribedLatex: string | null,
    lastModified: Date
  }
  ```
- Contract: TileExtractor receives row object + Excalidraw elements array
- **Source**: [Tech Spec Epic 2: Integration Contract 1]

**Tile Extraction Algorithm**
- **Overlap**: Fixed 64px (16.7%) per ADR-002
- **Stride**: 384 - 64 = 320px
- **Tile Count**: For width > 384px, numTiles = ceil((width - overlap) / stride)
- **Example**:
  - Row width = 800px
  - numTiles = ceil((800 - 64) / 320) = ceil(736 / 320) = ceil(2.3) = 3 tiles
  - Tile 0: offsetX = 0, overlap = 0
  - Tile 1: offsetX = 320, overlap = 64
  - Tile 2: offsetX = 640, overlap = 64
- **Source**: [Tech Spec Epic 2: Tile Extraction Algorithm, Architecture: ADR-002]

**Image Rendering with Existing imageProcessor.js**
- Reuse existing `src/workers/imageProcessor.js` patterns for:
  - Grayscale conversion
  - Normalization for model input
  - 384x384 resizing
- Render tiles using Canvas API (offscreen canvas for performance)
- **Source**: [Architecture: Epic 2 - Reused Components: Image Processor]

**Hash Function (No New Dependencies)**
- Implement inline xxhash or use simple fast hash (CRC32)
- Purpose: Cache key for tile-level caching (Story 2.4)
- Must be fast: hash computation <10ms per tile
- Deterministic: same ImageData → same hash
- **Source**: [Architecture: ADR-006 No New Dependencies, Tech Spec: Contract 6]

**Performance Budget**
- Total tile extraction budget: 200ms for 5-tile row
- Breakdown:
  - Bounding box calculation: 20ms
  - Tile rendering (5 tiles): 150ms (30ms/tile)
  - Hash calculation (5 tiles): 25ms (5ms/tile)
  - Metadata assembly: 5ms
- **Source**: [Tech Spec Epic 2: Performance Budget Matrix]

**Error Handling (FM-004: Invalid Bounding Box)**
- Detection: width <= 0 || height <= 0
- Mitigation: Throw error for corrupted bbox, return [] for legitimate empty rows
- User impact: Yellow ⚠️ "Could not process row. Try erasing and redrawing."
- Instrumentation: `DecisionTracker.measureDecision('bounding-box-validation')`
- **Source**: [Tech Spec Epic 2: FM-004 Invalid Bounding Box]

### Project Structure Notes

**New File**:
- `src/utils/ocrTiling.js` - Pure utility functions for tile extraction

**Existing Files to Study**:
- `src/utils/rowManager.js` (Epic 1) - Row data structure, getRow() API
- `src/workers/imageProcessor.js` - Grayscale conversion patterns
- `src/pages/SketchPage.jsx` - Excalidraw element access patterns

**No Modifications to Existing Files** (brownfield respect):
- Only create new `ocrTiling.js` module
- Import and use existing utilities, do not modify them

### Testing Standards

**Unit Tests Location**: `src/utils/__tests__/ocrTiling.test.js`

**Coverage Target**: >90% for new Epic 2 components (per Tech Spec test strategy)

**Test Scenarios (from Tech Spec)**:
1. Single tile (<384px): Verify 1 tile returned, center-cropped
2. Multi-tile: 400px → 2 tiles, 800px → 3 tiles, 1200px → 4 tiles
3. Overlap verification: Tile 1 offsetX = 320 (stride), overlap = 64px
4. Hash uniqueness: Same pixels → same hash, different pixels → different hash
5. Edge cases: Empty row → [], Invalid bbox → throw error
6. Performance: extractTiles() <200ms for 5-tile row (budget verification)

**Integration Testing**:
- Manual browser test: Draw wide expression (>1200px), verify tiles extracted
- Verify tile count matches calculation
- Verify tiles render correctly (visual inspection)

### Learnings from Epic 1 (Foundation Complete)

**Epic 1 Delivered**:
- ✅ RowManager class operational with Map-based storage
- ✅ Row IDs deterministic (`row-${index}`)
- ✅ Element-to-row assignment working (<100ms)
- ✅ Row metadata tracking (ocrStatus, validationStatus, transcribedLatex, lastModified)
- ✅ State persistence via IndexedDB (magic-canvas-state store)
- ✅ Row status icons rendering at row edge

**Key Patterns from Epic 1 to Reuse**:
- Row ID generation: Always use `rowManager.getRow(rowId)` for row access
- Deterministic row height: 384px (matches OCR tile height)
- Bounding box calculation from elementIds: Iterate elements, find min/max X/Y
- IndexedDB patterns: Debounced saves (2s), schema versioning, corruption handling

**No Previous Story Context for Epic 2**:
- This is the **first story in Epic 2**
- Epic 1 completed successfully, provides stable foundation
- No technical debt from previous Epic 2 stories (none exist yet)
- Epic 1 retrospective completed: Key action items applied to Epic 2 planning

### References

**Tech Spec Section**: Epic Technical Specification: OCR Tiling & Transcription, Story 2.1
- [Source: `/docs/sprint-artifacts/tech-spec-epic-2.md`]

**Architecture Decisions**:
- ADR-002: Fixed 64px Tile Overlap
- ADR-006: No New npm Dependencies
- [Source: `/docs/architecture.md#architecture-decision-records-adrs`]

**Integration Contracts**:
- Contract 1: RowManager → TileExtractor (Input Contract, Output Contract, Error Handling)
- Contract 6: TileExtractor → OCRCache (hash generation)
- [Source: Tech Spec Epic 2: Integration Contracts]

**Failure Mode**:
- FM-004: Invalid Bounding Box (Empty or Negative Dimensions)
- [Source: Tech Spec Epic 2: Risks - FM-004]

**Functional Requirements Coverage**:
- FR20: Extract tiles from rows
- FR21: Overlapping 384x384 tiles (10-20% overlap)
- FR25: Respect FormulaNet model requirements (384x384 input)
- [Source: `epics.md#epic-2-story-21`]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- To be filled during implementation -->

### Debug Log References

<!-- To be filled during implementation -->

### Completion Notes List

<!-- To be filled during implementation -->

### File List

<!-- To be filled during implementation -->

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
