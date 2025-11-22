# Epic 2: Silent OCR Pipeline

**Goal:** Transform handwritten strokes into LaTeX through intelligent tile extraction, parallel OCR processing, and restorative LaTeX merging that delivers the "silent magic" of Magic Canvas.

**Business Value:** The core technical innovation that converts handwriting to LaTeX without user intervention—enabling seamless mathematical note-taking with automatic transcription.

**Dependencies:** Epic 1 (needs RowManager and canvas state)

---

## Story 2.1: Extract Overlapping Tiles from Row Elements

As a **system component**,
I want **to extract overlapping 384x384px tiles from row elements**,
So that **wide expressions can be processed by the OCR model without losing context at boundaries**.

**Acceptance Criteria:**

**Given** a row contains drawn elements that span more than 384px horizontally
**When** tile extraction is triggered for that row
**Then** the system creates overlapping tiles:

**And** each tile is exactly 384x384px (model input requirement)
**And** tiles overlap by 64px (16.7% overlap) horizontally
**And** tiles are extracted from the row's bounding box (min/max X/Y of all elements)
**And** single narrow rows (<384px wide) produce single tile
**And** very wide rows produce N tiles where N = ceil((width - 64) / 320)
**And** tiles are rendered as 384x384 grayscale images (existing imageProcessor.js patterns)
**And** each tile includes metadata: `{rowId, tileIndex, offsetX, offsetY, width, height, overlap}`
**And** extraction completes within 100ms for typical row (<5 tiles)
**And** tiles are cached by content hash to avoid re-extraction if row unchanged

**Prerequisites:** Story 1.8 (row change detection)

**Technical Notes:**
- Create `src/utils/ocrTiling.js` with `extractTiles(row, elements)` function
- Use Excalidraw element bounding boxes to determine row extent
- Render tiles using Canvas API (similar to existing `imageProcessor.js`)
- Grayscale conversion + normalization for model input
- Hash tile images using fast hash (e.g., xxhash) for cache key
- Stride calculation: 320px with 64px overlap (384 - 320 = 64)
- Return array of `Tile` objects: `{image: ImageData, metadata: TileMetadata}`
- Performance target: <100ms extraction for <5 tiles
- Follow architecture decision: "Fixed 64px overlap"

---

## Story 2.2: Create OCR Worker Pool for Parallel Processing

As a **system component**,
I want **a pool of OCR workers that process tiles in parallel**,
So that **multi-tile rows transcribe faster and don't block the main thread**.

**Acceptance Criteria:**

**Given** multiple tiles need OCR processing
**When** tiles are submitted to the worker pool
**Then** the pool distributes tiles across 3 worker instances

**And** workers process tiles in parallel (up to 3 concurrent)
**And** workers reuse existing `ocrWorker.js` logic (FormulaNet model)
**And** pool handles worker initialization (load model once per worker)
**And** pool queues excess tiles when all workers busy
**And** pool reports progress per tile: `{tileId, status: 'queued' | 'processing' | 'complete' | 'error', progress: 0-100}`
**And** pool handles worker crashes gracefully (restart worker, retry tile)
**And** pool can be canceled (abort all pending tiles for a row)
**And** average tile processing time: <500ms after model loaded
**And** pool initialization time: <3s (model loading)
**And** worker communication via postMessage/onmessage with Promise-based API

**Prerequisites:** Story 2.1

**Technical Notes:**
- Create `src/workers/ocrWorkerPool.js` (worker manager)
- Extend existing `src/workers/ocrWorker.js` to handle single tile + return LaTeX fragment
- Pool configuration: `{maxWorkers: 3, queueSize: 20, timeout: 10000}`
- Use Promise-based API: `pool.processTile(tile): Promise<{latex: string, confidence: number}>`
- Worker message protocol: `{type: 'OCR_TILE', payload: {tileId, imageData}}`
- Worker response protocol: `{type: 'OCR_RESULT', payload: {tileId, latex, confidence, error}}`
- FIFO queue for fair tile distribution
- Worker crash detection: 10s timeout, restart worker, retry failed tile once
- Performance target: <500ms per tile after model loaded
- Follow architecture decision: "Fixed pool of 3 workers, FIFO queue, 10s timeout/tile"

---

## Story 2.3: Display Per-Tile OCR Progress Indicators

As a **user**,
I want **to see progress as tiles are being transcribed**,
So that **I know the system is working and how long to expect**.

**Acceptance Criteria:**

**Given** a row is being processed via OCR tiling
**When** OCR starts for that row
**Then** I see visual progress feedback:

**And** row status icon changes to orange ⟳ (spinning)
**And** a progress bar appears below or near the row (subtle, non-intrusive)
**And** progress bar shows: "Transcribing... 2/5 tiles" or "Transcribing... 40%"
**And** progress updates in real-time as tiles complete
**And** individual tile regions show subtle overlay during processing (optional, debug mode)
**And** progress indicator fades out when row OCR completes
**And** progress appears within 100ms of OCR trigger
**And** no visual jank or frame drops during progress updates
**And** progress bar is positioned at: `(canvasWidth - 200px, rowCenterY)` with 200px width

**Prerequisites:** Story 2.2, Story 1.6 (status icons)

**Technical Notes:**
- Subscribe to worker pool progress events in MagicCanvas component
- Render progress bar using React component or SVG overlay
- Style: Thin progress bar (4px height), semi-transparent background
- Position: Below row, left-aligned, ~200px wide
- Remove progress indicator when `row.ocrStatus = 'complete'` or 'error'
- Debounce progress updates (100ms) to avoid excessive re-renders
- Progress calculation: `(completedTiles / totalTiles) * 100`
- Real-time updates via worker pool progress events
- Follow architecture decision: "Per-tile progress indicators"
- Performance target: 60fps during progress updates

---

## Story 2.4: Implement Tile-Level OCR Caching

As a **system component**,
I want **to cache OCR results per tile using content hash**,
So that **unchanged tiles don't require re-processing, improving performance**.

**Acceptance Criteria:**

**Given** a tile has been OCR'd previously
**When** the same tile content is encountered again (same hash)
**Then** the cached LaTeX fragment is returned immediately (<1ms)

**And** cache key is content hash of tile image (xxhash or similar fast hash)
**And** cache stores: `{tileHash: string, latex: string, confidence: number, timestamp: Date}`
**And** cache stored in IndexedDB store: `ocr-tile-cache`
**And** cache entries have 7-day TTL (auto-expire old entries)
**And** cache hit rate >60% for typical usage (repeated expressions)
**And** cache miss triggers normal OCR processing via worker pool
**And** cache can be manually cleared (Story 6.x)
**And** background cleanup job removes entries older than 7 days on page load
**And** cache lookup is O(1) via IndexedDB key retrieval

**Prerequisites:** Story 2.2

**Technical Notes:**
- Create `src/utils/ocrCache.js` with `getFromCache(hash)` and `storeInCache(hash, result)`
- Use existing `indexedDBCache.js` patterns for IndexedDB operations
- Hash tile ImageData using xxhash or CRC32 for speed and collision resistance
- IndexedDB store schema: `{hash: string (key), latex: string, confidence: number, createdAt: timestamp}`
- Cache TTL: 7 days (604800000ms) - balance performance vs. storage
- Check cache before submitting tile to worker pool
- Background cleanup: iterate through cache on page load, delete entries older than 7 days
- Performance target: <1ms cache hit response
- Follow architecture decision: "Tile-level caching via content hash"
- Monitor cache hit rate and log to diagnostic system

---

## Story 2.5: Merge LaTeX Fragments with Gap-Based Spacing

As a **system component**,
I want **to intelligently merge LaTeX fragments from multiple tiles into single expression**,
So that **the final LaTeX is valid and preserves the user's intended spacing**.

**Acceptance Criteria:**

**Given** multiple tiles from a row have been OCR'd to LaTeX fragments
**When** merging is triggered
**Then** fragments are combined following these rules:

**And** fragments are ordered left-to-right by tile offsetX
**And** visual gap between tiles is measured (distance between tile boundaries)
**And** spacing inserted based on gap size:
  - Gap <10px: No space (e.g., "x^" + "2" → "x^2")
  - Gap 10-30px: Single space (e.g., "x + " + "3" → "x + 3")
  - Gap >30px: Double space or semicolon separator if configured
**And** duplicate operators at seams are removed (e.g., "+ " + "+ 3" → "+ 3")
**And** common merge errors are detected:
  - Duplicate variables (e.g., "x" + "x" → likely "x" if close)
  - Split fractions (e.g., "{a" + "b}" → "{ab}")
**And** merged LaTeX is validated using KaTeX parser
**And** if merge produces invalid LaTeX, mark row as 'error' (yellow ⚠️)
**And** merge completes within 50ms for typical row (3-5 tiles)
**And** merge algorithm handles edge cases (single tile, empty fragments)
**And** gap measurement uses tile metadata: `gap = currTile.offsetX - (prevTile.offsetX + 384)`

**Prerequisites:** Story 2.2, Story 2.4

**Technical Notes:**
- Create `src/utils/latexAssembly.js` with `mergeTiles(tiles: Tile[]): string`
- Input: Array of `{latex: string, metadata: {offsetX, overlap}}` ordered by offsetX
- Gap measurement using tile metadata (no visual calculation needed)
- Spacing heuristics implemented as configurable rules
- Regex-based duplicate operator removal: `/(\+|\-|\*|\/)\s*\1/g`
- Use existing `katexParser.js` to validate merged LaTeX
- Return: `{mergedLatex: string, valid: boolean, errors: string[]}`
- Performance target: <50ms merge for 3-5 tiles
- Log merge details to diagnostic system for debugging
- Follow architecture decision: "Gap-based spacing + regex cleanup"
- Handle edge cases: single tile (no merge needed), empty fragments

---

## Story 2.6: Implement LaTeX Post-Processing and Cleanup

As a **system component**,
I want **to clean up common OCR artifacts in merged LaTeX**,
So that **transcription quality is higher and validation works correctly**.

**Acceptance Criteria:**

**Given** merged LaTeX contains OCR artifacts or ambiguities
**When** post-processing is applied
**Then** the following cleanups are performed:

**And** normalize fractions: `\frac {a}{b}` → `\frac{a}{b}` (remove spaces)
**And** normalize exponents: `x^ 2` → `x^2`
**And** normalize operators: `+ +` → `+`, `- -` → `+`, `* *` → `*`
**And** fix common OCR errors:
  - `O` vs `0` (letter O vs zero) based on context
  - `l` vs `1` (lowercase L vs one) based on context
  - `x` vs `\times` vs `*` normalization
**And** remove trailing whitespace
**And** ensure proper grouping: `{...}` balanced, `(...)` balanced
**And** detect likely errors that need user attention:
  - Unbalanced braces/parens → mark as warning
  - Unknown LaTeX commands → mark as warning
**And** post-processing adds <10ms overhead
**And** cleaned LaTeX is re-validated with KaTeX parser
**And** warnings array returned for inspection panel (Story 4.1)

**Prerequisites:** Story 2.5

**Technical Notes:**
- Create `src/utils/ocrPostProcessor.js` with `cleanOcrLaTeX(latex: string): {cleaned: string, warnings: string[]}`
- Regex-based cleanup patterns for common artifacts
- Heuristic-based character disambiguation (context-aware)
- Use KaTeX parser to detect structural issues (unbalanced braces, unknown commands)
- Return warnings array for user inspection (Story 4.1)
- Configurable strictness (lenient for MVP, strict mode later)
- Performance target: <10ms overhead
- Follow architecture decision: "Post-processing cleanup for OCR artifacts"
- Log cleanup actions to diagnostic system for quality monitoring

---

## Story 2.7: Trigger OCR Pipeline Automatically with Debounce

As a **user**,
I want **OCR to start automatically after I finish writing a row**,
So that **I don't have to manually trigger transcription**.

**Acceptance Criteria:**

**Given** I am drawing on Magic Canvas
**When** I finish a stroke in a row and stop for 1.5 seconds
**Then** OCR processing automatically begins for that row

**And** debounce timer resets if I add another stroke within 1.5s
**And** debounce applies per-row (multiple rows can have independent timers)
**And** OCR triggers only if row has changed since last transcription
**And** OCR doesn't trigger for empty rows
**And** user receives visual feedback: status icon → orange ⟳, progress bar appears
**And** multiple rows can process OCR simultaneously (worker pool handles concurrency)
**And** debounce time is configurable (Story 6.2: 1-5s range)
**And** rapid row switching is debounced to prevent excessive OCR triggers
**And** OCR pipeline includes: tile extraction → cache check → worker pool → merging → post-processing

**Prerequisites:** Story 1.8 (row change detection), Story 2.2 (worker pool), Story 2.5 (merging), Story 2.6 (cleanup)

**Technical Notes:**
- Create React hook: `useAutoOCR(rowManager, workerPool, debounceMs)`
- Track per-row debounce timers in Map<rowId, TimeoutId>
- On Excalidraw onChange → detect modified rows → reset timers for those rows
- On timer expire → trigger full OCR pipeline:
  1. Extract tiles (Story 2.1)
  2. Check cache (Story 2.4)
  3. Process via worker pool (Story 2.2)
  4. Merge fragments (Story 2.5)
  5. Post-process (Story 2.6)
  6. Update row.transcribedLatex and row.ocrStatus
- Handle errors gracefully: set row.ocrStatus = 'error', show ⚠️ icon
- Debounce timing: 1.5s default, configurable 1-5s range
- Content change detection: hash row elements, compare with last OCR hash
- Follow architecture decision: "Auto-trigger with 1.5s debounce"
- Performance target: pipeline completes within 2s for typical row

---

## Story 2.8: Handle OCR Failures and Timeouts Gracefully

As a **user**,
I want **clear feedback when OCR fails**,
So that **I know to rewrite more clearly or check for issues**.

**Acceptance Criteria:**

**Given** OCR processing fails for a row
**When** failure occurs (model error, timeout, invalid LaTeX)
**Then** I see appropriate feedback:

**And** row status icon changes to yellow ⚠️ (warning)
**And** tapping icon shows error details: "Could not transcribe. Try rewriting more clearly."
**And** specific error types have helpful messages:
  - Timeout (>10s per tile): "Processing took too long. Try simpler notation."
  - Invalid LaTeX after merge: "Could not parse result. Check for unusual notation."
  - Model error: "OCR model error. Please try again."
  - Worker crash: "Processing error occurred. Please retry."
**And** failed row can be manually retried (double-tap to force re-OCR)
**And** partial results (some tiles succeeded) are discarded (all-or-nothing per row)
**And** errors are logged to diagnostic system with full context
**And** OCR failures don't crash the app or block other rows
**And** user can continue working in other rows during failure
**And** retry mechanism clears previous error state and restarts pipeline

**Prerequisites:** Story 2.7

**Technical Notes:**
- Implement timeout per tile: 10s max (generous, typical is <1s)
- Worker pool returns error types: `{type: 'timeout' | 'model_error' | 'invalid_output' | 'worker_crash', message: string}`
- Set row.ocrStatus = 'error' and row.errorMessage = '...'
- Error messages stored in row metadata for inspection panel (Story 4.1)
- Manual retry: clear row.ocrStatus, row.transcribedLatex, trigger OCR immediately
- Use existing logger.js to log full error context (tile images, fragments, merged LaTeX)
- Error handling strategy: fail gracefully, never crash, always provide user feedback
- Follow architecture decision: "8 error types with specific messages"
- Performance target: error detection within 100ms of failure

---

## Epic 2 Summary

**Stories:** 8
**Estimated Complexity:** High (novel tiling algorithm, parallel processing, complex merging heuristics)
**Key Deliverables:**
- Overlapping tile extraction from rows
- OCR worker pool with parallel processing
- Per-tile progress indication
- Tile-level caching (60%+ hit rate)
- Intelligent LaTeX fragment merging
- OCR artifact cleanup and post-processing
- Automatic OCR with configurable debounce
- Graceful error handling

**Testing Notes:**
- Unit tests: Tile extraction logic, merge algorithms, post-processing rules
- Integration tests: Full pipeline with sample handwritten expressions
- Performance tests: Wide rows (10+ tiles), worker pool saturation
- Edge cases: Very long expressions, unusual notation, OCR ambiguities
- Corpus testing: Run on 50+ handwritten math samples, measure merge accuracy (target >95%)

**Critical Path Dependencies:**
- Epic 1 (Foundation) → Epic 2 (OCR Pipeline) → Epic 3 (Validation)
- Stories 2.1-2.5 form core pipeline (must be sequential)
- Stories 2.3, 2.4, 2.6, 2.7, 2.8 can be developed in parallel after core pipeline

**Performance Targets:**
- Tile extraction: <100ms
- Worker processing: <500ms per tile
- Cache lookup: <1ms hit
- Fragment merging: <50ms
- Post-processing: <10ms
- Total pipeline: <2s per row

**Architectural Innovations:**
- Fixed 64px overlap tiling (16.7% for context preservation)
- Gap-based spacing heuristics (intelligent reconstruction)
- Worker pool parallelization (3 concurrent workers)
- Content-based caching (hash-based deduplication)
- Comprehensive error handling (8 error types with specific guidance)