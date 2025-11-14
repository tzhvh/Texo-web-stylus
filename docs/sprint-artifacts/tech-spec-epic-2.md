# Epic Technical Specification: OCR Tiling & Transcription

Date: 2025-11-14
Author: BMad
Epic ID: 2
Status: Draft

---

## Overview

Epic 2 delivers the "silent magic" at the core of Magic Canvas—transforming handwritten mathematical expressions into LaTeX through intelligent overlapping tile extraction, parallel OCR processing, and restorative fragment merging. This epic addresses a fundamental technical challenge: the FormulaNet OCR model requires fixed 384x384px input, but mathematical expressions can be arbitrarily wide. The solution combines spatial reasoning (intelligent tiling with overlap), parallel processing (worker pool), and heuristic-based reconstruction (gap-aware LaTeX merging) to achieve >95% transcription accuracy while maintaining <2s average latency per row.

This epic builds directly on Epic 1's canvas foundation and row management system, using row bounding boxes and element metadata to extract tiles, process them concurrently, and update row state with transcribed LaTeX. The output enables Epic 3's validation pipeline by providing parseable LaTeX expressions for mathematical equivalence checking.

## Objectives and Scope

**In Scope:**
- Overlapping tile extraction algorithm (fixed 64px overlap, 16.7%)
- OCR worker pool implementation (3 workers, FIFO queue, 10s timeout per tile)
- Tile-level caching system (hash-based, 7-day TTL, >60% hit rate target)
- Per-tile progress indication for user feedback
- LaTeX fragment merging with gap-based spacing heuristics (<10px=no space, 10-30px=space, >30px=double space)
- Post-processing cleanup (operator normalization, fraction spacing, OCR artifact correction)
- Automatic OCR triggering with configurable debounce (default 1.5s)
- Graceful error handling for model failures, timeouts, and invalid LaTeX output
- Integration with existing ocrWorker.js and imageProcessor.js infrastructure

**Out of Scope (Deferred to Growth Features):**
- Boundary-aware splitting (detecting "calm points" between operators)
- Dissimilar tile dimensions (adaptive scaling for long fractions)
- Unit detection (preventing symbol splitting across tiles)
- ML-based segmentation (training model for optimal boundaries)
- Multi-model ensemble OCR
- Glyph-level feedback (AST → stroke mapping)

**Epic Goals:**
- Achieve <2s average OCR latency per row (FR19, NFR-P1)
- Maintain >95% tile merge accuracy (produce valid, parseable LaTeX - FR33, NFR-P7)
- Hit >60% OCR cache hit rate on repeated expressions (FR24, NFR-P4)
- Process multi-tile rows in parallel (3x speedup via worker pool - FR22)
- Never crash or block user on OCR failures (FR26, NFR-R1)

## System Architecture Alignment

Epic 2 integrates tightly with existing Texo architecture while introducing three new subsystems:

**Reused Components:**
- **OCR Worker (`src/workers/ocrWorker.js`)**: Extended to accept tile metadata and return LaTeX fragments (no changes to core FormulaNet inference logic)
- **Image Processor (`src/workers/imageProcessor.js`)**: Reused for grayscale conversion, normalization, and 384x384 rendering
- **IndexedDB Cache (`src/utils/indexedDBCache.js`)**: Reused patterns for tile-level caching with new `ocr-tile-cache` store
- **Logger (`src/utils/logger.js`)**: Reused for OCR event logging, performance metrics, error diagnostics
- **RowManager (`src/utils/rowManager.js`)**: From Epic 1, provides row bounding boxes and element metadata

**New Components (Epic 2):**
- **OCR Tiling (`src/utils/ocrTiling.js`)**: Pure functions for tile extraction, positioning, and metadata generation
- **OCR Worker Pool (`src/workers/ocrWorkerPool.js`)**: Manages 3 worker instances, FIFO queue, progress tracking, error recovery
- **LaTeX Assembly (`src/utils/latexAssembly.js`)**: Merges fragments using gap-based spacing heuristics, validates with KaTeX parser
- **OCR Post-Processor (`src/utils/ocrPostProcessor.js`)**: Regex-based cleanup of common OCR artifacts
- **useOCRPipeline Hook (`src/hooks/useOCRPipeline.js`)**: React hook orchestrating tile extraction → caching → worker pool → merging → post-processing

**Architectural Constraints from Architecture Doc:**
- Row IDs must remain deterministic (`row-${index}`)
- OCR status enum: `'pending' | 'processing' | 'complete' | 'error'` (immutable)
- Worker message protocol: UPPER_SNAKE_CASE types (`OCR_TILE`, `OCR_COMPLETE`, `OCR_ERROR`)
- IndexedDB schema is append-only (new `ocr-tile-cache` store, never modify existing stores)
- Performance target: <2s OCR latency is a requirement, not aspiration
- No new npm dependencies (reuse existing transformers.js, xxhash can be inline implementation)

## Detailed Design

### Services and Modules

**Core Epic 2 Modules:**

**1. TileExtractor (`src/utils/ocrTiling.js`)**
- **Responsibility:** Extract overlapping 384x384px tiles from row bounding boxes
- **Inputs:** Row object from RowManager, Excalidraw elements array
- **Outputs:** Array of Tile objects with ImageData and metadata
- **Owner:** Elena (Junior Dev) - Story 2.1
- **Performance Budget:** 200ms total per row extraction

**2. OCRWorkerPool (`src/workers/ocrWorkerPool.js`)**
- **Responsibility:** Manage 3 OCR worker instances, queue tiles, dispatch for parallel processing
- **Inputs:** Tile array from TileExtractor
- **Outputs:** TileResult array with LaTeX fragments
- **Owner:** Charlie (Senior Dev) - Story 2.2
- **Performance Budget:** 50ms dispatch + 300ms avg per tile (parallel)

**3. OCRCache (`src/utils/ocrCache.js`)**
- **Responsibility:** IndexedDB-backed tile-level caching with 7-day TTL
- **Inputs:** Tile hash (xxhash of ImageData)
- **Outputs:** Cached LaTeX fragment or null
- **Owner:** Charlie (Senior Dev) - Story 2.4
- **Performance Budget:** <1ms cache hit, <5ms cache miss

**4. LaTeXMerger (`src/utils/latexAssembly.js`)**
- **Responsibility:** Merge tile fragments using gap-based spacing heuristics
- **Inputs:** TileResult array ordered by offsetX
- **Outputs:** Merged LaTeX string, validity flag, warnings
- **Owner:** Charlie (Senior Dev) - Story 2.5
- **Performance Budget:** 100ms total (gap calc + merge + validation)

**5. PostProcessor (`src/utils/ocrPostProcessor.js`)**
- **Responsibility:** Cleanup OCR artifacts, normalize operators, fix common errors
- **Inputs:** Merged LaTeX from LaTeXMerger
- **Outputs:** Cleaned LaTeX, warnings array
- **Owner:** Elena (Junior Dev) - Story 2.6
- **Performance Budget:** 50ms regex cleanup + validation

**6. useOCRPipeline Hook (`src/hooks/useOCRPipeline.js`)**
- **Responsibility:** React hook orchestrating entire pipeline, auto-trigger with debounce
- **Inputs:** RowManager instance, Excalidraw onChange events
- **Outputs:** Row state updates (transcribedLatex, ocrStatus)
- **Owner:** Charlie (Senior Dev) - Story 2.7
- **Performance Budget:** Coordination overhead <40ms

### Integration Contracts

**Critical for preventing Epic 1's "component boundary ambiguity" issues from Story 1.8**

#### Contract 1: RowManager → TileExtractor

| Aspect | Specification |
|--------|--------------|
| **Producer** | RowManager (Epic 1 foundation) |
| **Consumer** | TileExtractor (Story 2.1) |
| **Interface** | `getRow(rowId): Row`, `getRowsInViewport(viewport): Row[]` |
| **Data Format** | `Row {id, yStart, yEnd, elementIds, ocrStatus, transcribedLatex}` |
| **Input Contract** | Valid rowId (string), viewport with {minY, maxY} |
| **Output Contract** | Row object with valid bounding box coordinates, element IDs array |
| **Error Handling** | Invalid rowId → return undefined, Invalid viewport → throw TypeError |
| **Performance Budget** | 5ms per getRow(), 20ms for getRowsInViewport() |
| **Decision Boundary** | RowManager: "Which elements belong to row?" / TileExtractor: "How to tile bounding box?" |

#### Contract 2: TileExtractor → OCRWorkerPool

| Aspect | Specification |
|--------|--------------|
| **Producer** | TileExtractor (Story 2.1) |
| **Consumer** | OCRWorkerPool (Story 2.2) |
| **Interface** | `submitTiles(tiles: Tile[]): Promise<TileResult[]>` |
| **Data Format** | `Tile {rowId, tileIndex, offsetX, offsetY, width: 384, height: 384, overlap, imageData, hash}` |
| **Input Contract** | tiles array with valid ImageData (384x384), unique hash, ordered by offsetX |
| **Output Contract** | `TileResult {tileId, latex, confidence, duration}` array, same order as input |
| **Error Handling** | Invalid tile → reject Promise with `{type: 'INVALID_TILE', tileId}`, Worker crash → retry once then `{type: 'WORKER_FAILURE'}`, Timeout >10s → `{type: 'TIMEOUT'}` |
| **Performance Budget** | Dispatch: 50ms, Per-tile OCR: 300ms avg (parallel), Total for 5 tiles: <1.5s |
| **Decision Boundary** | TileExtractor: "What tiles and order?" / OCRPool: "Which worker processes which tile?" |

#### Contract 3: OCRWorkerPool → LaTeXMerger

| Aspect | Specification |
|--------|--------------|
| **Producer** | OCRWorkerPool (Story 2.2) |
| **Consumer** | LaTeXMerger (Story 2.5) |
| **Interface** | `onTileComplete(tileResult)` callback, `onRowComplete(rowId, results[])` |
| **Data Format** | `TileResult {tileId: "${rowId}-tile-${index}", latex, confidence, duration}` |
| **Input Contract** | Tiles in completion order (not sequential), consistent rowId across row tiles |
| **Output Contract** | All tiles delivered before onRowComplete, latex is raw OCR (no cleanup) |
| **Error Handling** | Partial failure → onRowComplete with `{success: false, errors[]}`, All failed → row.ocrStatus = 'error' |
| **Performance Budget** | Callback overhead: <5ms, Row completion detection: <10ms |
| **Decision Boundary** | OCRPool: "When is tile complete?" / LaTeXMerger: "How to order and merge?" |

#### Contract 4: LaTeXMerger → PostProcessor

| Aspect | Specification |
|--------|--------------|
| **Producer** | LaTeXMerger (Story 2.5) |
| **Consumer** | PostProcessor (Story 2.6) |
| **Interface** | `mergeTiles(results[]): {mergedLatex, valid, warnings[]}` |
| **Data Format** | Input: TileResult[] ordered by tileIndex, Output: merged LaTeX (may be invalid) |
| **Input Contract** | results has ≥1 element, tileIndex sequential (0,1,2...), latex non-empty |
| **Output Contract** | mergedLatex always returned, valid flag = KaTeX parse success, warnings for ambiguities |
| **Error Handling** | Empty results → `{mergedLatex: '', valid: false, warnings: ['No tiles']}`, Gap fail → default spacing (log) |
| **Performance Budget** | Merge: 50ms for 5 tiles, Gap calc: 10ms, KaTeX validation: 40ms |
| **Decision Boundary** | Merger: "What spacing?" / PostProcessor: "How to clean artifacts?" |

#### Contract 5: PostProcessor → RowManager

| Aspect | Specification |
|--------|--------------|
| **Producer** | PostProcessor (Story 2.6) |
| **Consumer** | RowManager (state update) |
| **Interface** | `updateRow(rowId, {transcribedLatex, ocrStatus, errorMessage?})` |
| **Data Format** | transcribedLatex: string, ocrStatus: 'complete'\|'error', errorMessage: string\|null |
| **Input Contract** | rowId exists, ocrStatus valid enum, transcribedLatex can be empty if error |
| **Output Contract** | Atomic update, lastModified timestamp updated, validationStatus reset to 'pending' |
| **Error Handling** | Invalid rowId → throw Error('Row not found'), Invalid enum → TypeError, Conflict → last write wins (log) |
| **Performance Budget** | Update: <10ms, State serialization trigger: <5ms |
| **Decision Boundary** | PostProcessor: "Is LaTeX good enough?" / RowManager: "How to persist?" |

#### Contract 6: TileExtractor → OCRCache

| Aspect | Specification |
|--------|--------------|
| **Producer** | TileExtractor (Story 2.1) |
| **Consumer** | OCRCache (Story 2.4) |
| **Interface** | `getCached(hash): {latex, confidence} \| null`, `store(hash, result)` |
| **Data Format** | hash: 16-char hex (xxhash), result: `{latex, confidence, timestamp}` |
| **Input Contract** | hash valid hex, result.latex non-empty, confidence ∈ [0,1] |
| **Output Contract** | getCached returns null for miss (not undefined), store async, 7-day TTL on read |
| **Error Handling** | IndexedDB unavailable → log, continue without cache, Corrupted entry → delete, return null |
| **Performance Budget** | getCached: <1ms hit, <5ms miss, store: <10ms async |
| **Decision Boundary** | TileExtractor: "Check cache?" / OCRCache: "Is entry valid?" |

#### Contract 7: OCRWorkerPool → ProgressIndicator (UI)

| Aspect | Specification |
|--------|--------------|
| **Producer** | OCRWorkerPool (Story 2.2) |
| **Consumer** | ProgressIndicator component (Story 2.3) |
| **Interface** | Event emitter: `progress` event with `{rowId, tilesTotal, tilesComplete, status}` |
| **Data Format** | `{rowId: string, tilesTotal: number, tilesComplete: number, status: 'queued'\|'processing'\|'complete'}` |
| **Input Contract** | Events ordered: queued → processing → complete per tile, tilesComplete ≤ tilesTotal |
| **Output Contract** | UI renders progress bar %, status icon updates (orange ⟳) |
| **Error Handling** | Dropped event → stale UI (acceptable), Pool terminated → error state |
| **Performance Budget** | Event emission: <1ms, UI update (debounced): <16ms (60fps) |
| **Decision Boundary** | OCRPool: "When to emit?" / ProgressIndicator: "How to display?" |

### Data Models and Contracts

**Tile Object (Story 2.1):**
```typescript
interface Tile {
  rowId: string              // From RowManager, e.g., "row-5"
  tileIndex: number          // 0-based sequential within row
  offsetX: number            // Canvas X coordinate of tile origin
  offsetY: number            // Canvas Y coordinate (row.yStart)
  width: 384                 // Fixed model requirement
  height: 384                // Fixed model requirement
  overlap: number            // Pixels overlapping with previous tile (64px for MVP)
  imageData: ImageData       // 384x384 grayscale rendered from Excalidraw elements
  hash: string               // xxhash of imageData for cache lookup
}
```

**TileResult Object (Story 2.2 output):**
```typescript
interface TileResult {
  tileId: string             // "${rowId}-tile-${tileIndex}"
  latex: string              // Raw OCR output (unmerged fragment)
  confidence: number         // [0,1] from FormulaNet model
  duration: number           // OCR processing time in ms
  cacheHit?: boolean         // Optional: true if from cache (Story 2.4)
}
```

**MergedResult Object (Story 2.5 output):**
```typescript
interface MergedResult {
  mergedLatex: string        // Combined LaTeX from all tiles
  valid: boolean             // KaTeX parse success
  warnings: string[]         // Merge ambiguities, gaps, duplicates detected
  tileCount: number          // Number of tiles merged
  mergeStrategy: string      // e.g., "gap-based-spacing"
}
```

**CleanedResult Object (Story 2.6 output):**
```typescript
interface CleanedResult {
  cleanedLatex: string       // Post-processed LaTeX
  warnings: string[]         // OCR artifacts found and fixed
  confidence: number         // Adjusted confidence after cleanup
}
```

**OCRPipelineState (useOCRPipeline hook state):**
```typescript
interface OCRPipelineState {
  activeRows: Map<string, {
    status: 'extracting' | 'caching' | 'ocr' | 'merging' | 'cleaning',
    progress: {tilesTotal: number, tilesComplete: number},
    startTime: number,
    debounceTimer?: TimeoutId
  }>
  workerPool: OCRWorkerPool
  cache: OCRCache
  config: {
    debounceMs: number,      // Default 1500, configurable 1000-5000
    overlapPx: number,       // Fixed 64 for MVP
    parallelWorkers: number  // Fixed 3 for MVP
  }
}
```

### APIs and Interfaces

**TileExtractor API (`src/utils/ocrTiling.js`):**
```typescript
export function extractTiles(row: Row, elements: ExcalidrawElement[]): Tile[]
  // Pure function: no side effects, deterministic output
  // Performance: <200ms for typical row
  // Returns: Empty array if row empty, 1+ tiles based on width

export function calculateTilePositions(width: number, overlap: number): {offsetX: number, width: number}[]
  // Helper: determines tile boundaries given total width
  // Algorithm: stride = 384 - overlap, numTiles = ceil((width - overlap) / stride)
```

**OCRWorkerPool API (`src/workers/ocrWorkerPool.js`):**
```typescript
class OCRWorkerPool {
  constructor(config: {maxWorkers: 3, queueLimit: 20, timeoutMs: 10000})

  async processTile(tile: Tile): Promise<TileResult>
    // Queues tile, assigns to available worker, returns Promise
    // Rejects on timeout or worker crash

  async processRow(row: Row, elements: ExcalidrawElement[]): Promise<string>
    // High-level: extract tiles → cache check → OCR → merge → post-process
    // Returns: final LaTeX or throws OCRError

  cancelRow(rowId: string): void
    // Aborts all pending tiles for row, rejects Promises

  on(event: 'progress', handler: (data: ProgressData) => void): void
    // Subscribe to progress events for UI updates

  terminate(): void
    // Cleanup: terminate all workers, clear queue
}
```

**OCRCache API (`src/utils/ocrCache.js`):**
```typescript
export async function getCached(hash: string): Promise<{latex: string, confidence: number} | null>
  // IndexedDB lookup, enforces 7-day TTL
  // Returns null on miss or expired entry

export async function store(hash: string, result: {latex: string, confidence: number}): Promise<void>
  // Fire-and-forget async store, includes timestamp
  // Silently fails if IndexedDB unavailable (logs error)

export async function clearExpired(): Promise<number>
  // Background cleanup, removes entries older than 7 days
  // Returns count of entries deleted
```

**LaTeXMerger API (`src/utils/latexAssembly.js`):**
```typescript
export function mergeTiles(results: TileResult[]): MergedResult
  // Pure function: gap-based spacing heuristics
  // Algorithm:
  //   1. Sort by tileIndex
  //   2. For each pair: measure gap = currOffsetX - (prevOffsetX + 384)
  //   3. Insert spacing: <10px=none, 10-30px=space, >30px=double space
  //   4. Remove duplicate operators at seams: /(\+|\-)\s*\1/g
  //   5. Validate with KaTeX parser
  // Returns: merged LaTeX + validity flag + warnings
```

**PostProcessor API (`src/utils/ocrPostProcessor.js`):**
```typescript
export function cleanOcrLatex(latex: string): CleanedResult
  // Regex-based cleanup patterns:
  //   - Normalize fractions: \frac {a}{b} → \frac{a}{b}
  //   - Normalize exponents: x^ 2 → x^2
  //   - Fix operators: + + → +, - - → +
  //   - Character disambiguation: O vs 0, l vs 1 (context-aware)
  //   - Balance braces/parens (detect unbalanced → warning)
  // Returns: cleaned LaTeX + warnings array
```

### Workflows and Sequencing

**Complete OCR Pipeline Flow (Story 2.7):**

```
User draws stroke → Excalidraw onChange event
  ↓
useOCRPipeline hook detects row change
  ↓
Reset 1.5s debounce timer for modified row
  ↓
Timer expires → Pipeline START
  ↓
┌─────────────────────────────────────────────┐
│ STEP 1: Tile Extraction (200ms budget)     │
├─────────────────────────────────────────────┤
│ 1. RowManager.getRow(rowId)                │
│ 2. Calculate bounding box from elementIds  │
│ 3. TileExtractor.extractTiles(row, elems)  │
│    - Determine tile count (width / stride) │
│    - Render each 384x384 tile to ImageData │
│    - Calculate xxhash for each tile        │
│ Output: Tile[] array                        │
└─────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────┐
│ STEP 2: Cache Lookup (50ms budget)         │
├─────────────────────────────────────────────┤
│ For each tile:                              │
│   1. OCRCache.getCached(tile.hash)         │
│   2. If hit: mark tile.cacheHit = true     │
│   3. If miss: queue for OCR                │
│ Output: CachedResults[], UncachedTiles[]   │
└─────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────┐
│ STEP 3: Parallel OCR (1500ms budget)       │
├─────────────────────────────────────────────┤
│ 1. OCRWorkerPool.submitTiles(uncached)    │
│ 2. Pool assigns tiles to 3 workers (FIFO)  │
│ 3. Workers process in parallel:            │
│    Worker 1: tile-0 (300ms)                │
│    Worker 2: tile-1 (300ms)                │
│    Worker 3: tile-2 (300ms)                │
│    Worker 1: tile-3 (300ms) ← reuse        │
│    Worker 2: tile-4 (300ms)                │
│ 4. Emit progress events (Story 2.3)        │
│ 5. Store results in cache (Story 2.4)      │
│ Output: TileResult[] array                  │
└─────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────┐
│ STEP 4: LaTeX Merging (100ms budget)       │
├─────────────────────────────────────────────┤
│ 1. Combine cached + OCR'd results          │
│ 2. Sort by tileIndex (ensure order)        │
│ 3. LaTeXMerger.mergeTiles(allResults)      │
│    - Measure gaps between tiles            │
│    - Insert spacing based on gap size      │
│    - Remove duplicate operators            │
│    - Validate with KaTeX parser            │
│ Output: MergedResult                        │
└─────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────┐
│ STEP 5: Post-Processing (50ms budget)      │
├─────────────────────────────────────────────┤
│ 1. PostProcessor.cleanOcrLatex(merged)     │
│    - Normalize whitespace/operators        │
│    - Fix common OCR errors (O vs 0)        │
│    - Balance braces/parens                 │
│    - Re-validate with KaTeX                │
│ Output: CleanedResult                       │
└─────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────┐
│ STEP 6: State Update (10ms budget)         │
├─────────────────────────────────────────────┤
│ 1. RowManager.updateRow(rowId, {           │
│      transcribedLatex: cleaned.latex,      │
│      ocrStatus: 'complete',                 │
│      lastModified: Date.now()              │
│    })                                       │
│ 2. Trigger IndexedDB save (debounced 2s)   │
│ 3. Update UI: green ✓ or yellow ⚠️         │
│ 4. Trigger validation (Epic 3)             │
└─────────────────────────────────────────────┘
  ↓
Pipeline COMPLETE (Total: <2s target)
```

**Error Propagation Flow:**

```
TileExtractor throws invalid tile
  ↓
OCRWorkerPool catches, logs error
  ↓
Retry tile once (worker might have crashed)
  ↓ (still fails)
Return TileResult with error type
  ↓
LaTeXMerger receives partial results
  ↓
Attempts merge with available tiles
  ↓ (fails KaTeX validation)
PostProcessor receives invalid LaTeX
  ↓
Marks as error, generates user message
  ↓
RowManager.updateRow(rowId, {
  ocrStatus: 'error',
  errorMessage: 'Could not transcribe. Try rewriting more clearly.'
})
  ↓
UI displays yellow ⚠️ icon
  ↓
User taps icon → sees error message
```

**Performance Budget Allocation (Total: 1960ms):**

| Pipeline Stage | Component | Budget | Measurement |
|---------------|-----------|--------|-------------|
| Tile Extraction | TileExtractor | 200ms | PerformanceTracker.measure('tile-extraction') |
| Cache Lookup | OCRCache | 50ms | DecisionTracker.measureDecision('cache-check') |
| Worker Dispatch | OCRWorkerPool | 50ms | PerformanceTracker.measure('worker-dispatch') |
| Parallel OCR | FormulaNet (3 workers) | 1500ms | PerformanceTracker.measure('ocr-processing') |
| LaTeX Merging | LaTeXMerger | 100ms | PerformanceTracker.measure('latex-merge') |
| Post-Processing | PostProcessor | 50ms | PerformanceTracker.measure('post-process') |
| State Update | RowManager | 10ms | PerformanceTracker.measure('state-update') |
| **TOTAL** | **Epic 2 Pipeline** | **1960ms** | **40ms safety margin** |

## Non-Functional Requirements

### Performance

**NFR-P1: OCR Pipeline Latency**
- **Requirement:** <2s average OCR latency per row (end-to-end: stroke complete → transcribedLatex available)
- **Measurement:** PerformanceTracker.measure('epic2-pipeline-total'), 50th percentile tracked in dashboard
- **Target:** 1960ms budget allocation (40ms safety margin)
- **Validation:** Performance test corpus (50 expressions), verify 50th percentile <2s, 90th percentile <4s
- **Degradation Strategy:** Circuit breaker pauses auto-OCR after 3 consecutive failures >4s

**NFR-P2: Parallel Processing Efficiency**
- **Requirement:** Worker pool achieves ≥3x speedup for 5-tile rows vs sequential processing
- **Measurement:** Compare parallel (3 workers) vs sequential (1 worker) on same expression
- **Target:** 5 tiles in 1.5s parallel (vs 1.5s sequential = 3x speedup)
- **Validation:** Integration test verifies parallel completion time
- **Notes:** Assumes 300ms avg per tile OCR, 3 workers process tiles 0-2 (500ms), then 3-4 (500ms)

**NFR-P3: UI Responsiveness During OCR**
- **Requirement:** Canvas rendering maintains 60fps during OCR processing
- **Measurement:** Browser DevTools Performance profiler, frame timing
- **Target:** No frame drops >16.67ms during OCR pipeline execution
- **Validation:** Stress test with 10 concurrent rows, verify no jank
- **Mitigation:** All heavy processing in Web Workers (off main thread), debounced UI updates

**NFR-P4: Cache Hit Rate**
- **Requirement:** >60% cache hit rate on OCR tiles for repeated expressions
- **Measurement:** `(cacheHits / totalTiles) * 100` tracked per session
- **Target:** 60% minimum, 80% stretch goal for typical usage patterns
- **Validation:** Performance dashboard displays real-time hit rate, corpus testing measures baseline
- **Notes:** Hit rate depends on user behavior (repetitive vs novel expressions)

**NFR-P5: Memory Footprint**
- **Requirement:** Epic 2 pipeline uses <512MB peak memory during heavy OCR load
- **Measurement:** Chrome DevTools Memory profiler, heap snapshots
- **Target:** Worker pool (3 workers × 150MB model) + tile queue + cache <512MB total
- **Validation:** Load test with 20 concurrent rows, monitor memory usage
- **Mitigation:** Worker pool size limit (3), queue limit (20 tiles), cache cleanup at quota

**NFR-P6: IndexedDB Write Performance**
- **Requirement:** Cache writes don't block OCR pipeline (async, fire-and-forget)
- **Measurement:** DecisionTracker.measureDecision('cache-write'), verify <10ms async initiation
- **Target:** Cache store() returns immediately, actual write completes in background
- **Validation:** Unit test verifies async behavior, integration test checks non-blocking

---

### Security

**NFR-S1: Client-Side Only Processing (Privacy-First)**
- **Requirement:** All OCR processing happens client-side, zero server communication (inherited from Texo architecture)
- **Validation:** Network monitoring confirms no OCR-related HTTP requests (except model download from HuggingFace on first use)
- **Compliance:** GDPR-compliant (no PII transmission), offline-capable after model load
- **Notes:** FormulaNet model downloaded once, cached by browser, subsequent OCR fully offline

**NFR-S2: IndexedDB Data Isolation**
- **Requirement:** OCR cache data scoped to origin, not accessible cross-origin
- **Validation:** Browser enforces same-origin policy for IndexedDB
- **Mitigation:** No sensitive data stored in cache (only LaTeX strings and confidence scores)
- **Notes:** User can clear cache via settings panel (Epic 6)

**NFR-S3: No Malicious Input Processing**
- **Requirement:** OCR pipeline rejects or sanitizes potentially malicious inputs (e.g., script injection attempts in LaTeX)
- **Validation:** KaTeX parser validates all LaTeX before rendering (prevents XSS)
- **Mitigation:** All LaTeX rendered via KaTeX (trusted library), no eval() or innerHTML with user content
- **Test:** Inject malicious LaTeX (e.g., `\unicode{<script>}`), verify KaTeX rejects or sanitizes

---

### Reliability/Availability

**NFR-R1: Graceful Degradation on Failures**
- **Requirement:** OCR failures never crash app or corrupt user data
- **Validation:** All 11 failure modes (FM-001 through FM-011) have explicit mitigation strategies
- **User Experience:** Errors result in yellow ⚠️ icon with actionable message, user can retry or continue drawing
- **Notes:** Row state remains recoverable (user can erase/redraw to retry OCR)

**NFR-R2: Worker Pool Resilience**
- **Requirement:** Worker crashes don't permanently disable OCR feature
- **Validation:** FM-001 mitigation: auto-restart crashed worker, retry tile once
- **Recovery Time:** Worker restart <1s, tile retry <500ms (total <1.5s for single failure)
- **Test:** Simulate worker termination, verify automatic recovery

**NFR-R3: Operation Timeouts**
- **Requirement:** All async operations have bounded execution time (no infinite waits)
- **Timeouts:** Tile OCR 10s, model load 30s, cache read 5s, cache write 10s
- **Validation:** Unit tests verify timeout enforcement, integration tests check user feedback on timeout
- **User Experience:** Timeout → yellow ⚠️ "Processing took too long. Try simpler notation."

**NFR-R4: State Consistency (No Orphaned Data)**
- **Requirement:** Row state updates are atomic (no partial updates), optimistic concurrency prevents conflicts
- **Validation:** FM-011 mitigation tests verify last write wins, stale updates rejected
- **Invariants:** ocrStatus state machine enforced (pending → processing → complete/error)
- **Persistence:** IndexedDB writes debounced (2s) but atomic per row

**NFR-R5: Comprehensive Logging & Diagnostics**
- **Requirement:** All errors logged with full context (tile data, row state, timing, stack traces)
- **Log Levels:** ERROR (FM failures), WARN (performance budget exceeded), INFO (cache hits), DEBUG (pipeline stages)
- **Storage:** Logs persisted to IndexedDB via existing loggingWorker.js
- **Access:** Database page (existing Texo feature) displays logs, filterable by Epic 2 events
- **Retention:** 7-day log retention (auto-cleanup on page load)

---

### Observability

**NFR-O1: Real-Time Performance Monitoring**
- **Requirement:** Performance dashboard displays live metrics during OCR pipeline execution
- **Metrics:** Current stage, time spent, budget remaining, cache hit rate, worker pool status
- **Update Frequency:** Debounced 100ms (avoid excessive re-renders)
- **Implementation:** Epic 2 preparation checklist specifies dashboard (Dana + Elena owners)
- **Access:** Debug mode toggle (Epic 4), settings panel (Epic 6)

**NFR-O2: Historical Performance Trends**
- **Requirement:** Dashboard shows 50th/90th percentile latency trends over session
- **Storage:** In-memory aggregation per session (not persisted)
- **Visualization:** Line chart showing latency over time, bar chart per pipeline stage
- **Alerts:** Red highlight when stage exceeds budget, circuit breaker status indicator

**NFR-O3: Two-Layer Instrumentation Coverage**
- **Requirement:** 100% of critical code paths instrumented with PerformanceTracker and DecisionTracker (Epic 1 learning)
- **Layer 1 (Function Timing):** All 7 pipeline stages (tile-extraction, cache-lookup, worker-dispatch, ocr-processing, latex-merge, post-process, state-update)
- **Layer 2 (Decision Boundaries):** 5 critical decisions (cache-check, worker-assignment, gap-measurement, bounding-box-validation, worker-health-check)
- **Validation:** Code review checklist ensures instrumentation added before story completion
- **Notes:** Epic 1 retrospective identified missing instrumentation as root cause of Story 1.8 performance issues

**NFR-O4: Cache Statistics Visibility**
- **Requirement:** Users can view cache performance (hit rate, entry count, storage used)
- **Display:** Settings panel (Epic 6) shows "OCR Cache: 145 entries, 23MB, 67% hit rate"
- **Actions:** "Clear Cache" button with confirmation dialog
- **Warning:** Toast at 80% storage quota (FR73, FM-008 mitigation)

---

## Dependencies and Integrations

### Epic 1 Dependencies (Foundation)

**DEP-001: RowManager API**
- **Provider:** Epic 1 Story 1.4
- **Interface:** `getRow(rowId): Row`, `updateRow(rowId, updates)`, `getRowsInViewport(viewport)`
- **Contract:** Integration Contract 1 (RowManager → TileExtractor)
- **Status:** ✅ COMPLETE (Epic 1 delivered, tested, production-ready)
- **Risk:** LOW - API stable, performance optimized (<100ms per Story 1.8)
- **Notes:** RowManager provides deterministic row IDs (`row-${index}`), stable bounding boxes

**DEP-002: Canvas State Persistence**
- **Provider:** Epic 1 Story 1.7
- **Interface:** IndexedDB `magic-canvas-state` store with auto-save (debounced 2s)
- **Usage:** Epic 2 extends with OCR state (transcribedLatex, ocrStatus per row)
- **Status:** ✅ COMPLETE
- **Risk:** LOW - Persistence tested, corruption recovery implemented
- **Notes:** Epic 2 adds fields to existing Row schema (backward compatible)

**DEP-003: Element Assignment System**
- **Provider:** Epic 1 Story 1.5, 1.8
- **Interface:** Automatic element-to-row assignment, cross-row move detection
- **Usage:** Epic 2 triggers OCR on row changes detected by assignment system
- **Status:** ✅ COMPLETE
- **Risk:** LOW - Change detection reliable, debouncing prevents excessive OCR triggers
- **Notes:** Epic 2 reuses `lastModified` timestamp for change tracking

**DEP-004: Status Icon Rendering**
- **Provider:** Epic 1 Story 1.6
- **Interface:** Row status icon display (gray ∅, orange ⟳, green ✓, red ✗, yellow ⚠️)
- **Usage:** Epic 2 updates icon based on ocrStatus transitions
- **Status:** ✅ COMPLETE
- **Risk:** LOW - Icon rendering performant, smooth animations (200ms fade)
- **Notes:** Epic 2 adds orange ⟳ spinner during OCR processing

---

### Existing Texo Infrastructure Dependencies

**DEP-005: OCR Worker (ocrWorker.js)**
- **Provider:** Existing Texo SketchPage implementation
- **Modifications:** Extend to accept tile metadata (offsetX, offsetY, tileIndex), return LaTeX fragments
- **Status:** ⚠️ REQUIRES EXTENSION - Core inference logic unchanged, new message protocol needed
- **Risk:** MEDIUM - Worker communication protocol changes, backward compatibility required
- **Mitigation:** Story 2.2 wraps existing worker, maintains backward compatibility for SketchPage

**DEP-006: Image Processor (imageProcessor.js)**
- **Provider:** Existing Texo utility
- **Interface:** Grayscale conversion, normalization, 384x384 rendering from canvas
- **Usage:** Epic 2 reuses for tile ImageData rendering
- **Status:** ✅ READY - No modifications needed
- **Risk:** LOW - Proven implementation, no changes required

**DEP-007: IndexedDB Cache (indexedDBCache.js)**
- **Provider:** Existing Texo CAS cache infrastructure
- **Modifications:** New store `ocr-tile-cache` (separate from `canonical-forms` cache)
- **Status:** ⚠️ REQUIRES NEW STORE - Reuse patterns, new schema
- **Risk:** LOW - Established patterns, Story 2.4 creates new store
- **Schema:** `{hash: string (key), latex: string, confidence: number, timestamp: number}`

**DEP-008: Logger (logger.js)**
- **Provider:** Existing Texo centralized logging
- **Interface:** `logger.error()`, `logger.warn()`, `logger.info()`, `logger.debug()`
- **Usage:** Epic 2 logs all OCR events, performance metrics, errors
- **Status:** ✅ READY - No modifications needed
- **Risk:** LOW - Production-tested logging system

**DEP-009: KaTeX Parser (katexParser.js)**
- **Provider:** Existing Texo CAS dependency
- **Interface:** `katex.__parse(latex)` for LaTeX validation (CRITICAL: internal API per CLAUDE.md)
- **Usage:** Epic 2 validates merged LaTeX before storing (Story 2.5, 2.6)
- **Status:** ✅ READY
- **Risk:** HIGH - Uses internal KaTeX API (`__parse`), may break on KaTeX upgrades
- **Mitigation:** Assumption A6 specifies version pinning, unit tests detect API changes

---

### External Dependencies

**DEP-010: FormulaNet Model (HuggingFace)**
- **Provider:** HuggingFace CDN (`alephpi/FormulaNet`)
- **Size:** ~150MB download on first use
- **Caching:** Browser caches model after download (offline-capable)
- **Status:** ⚠️ EXTERNAL DEPENDENCY
- **Risk:** MEDIUM - CDN availability, network failures, model version updates
- **Mitigation:** FM-003 retry logic (3 attempts with exponential backoff), user-initiated retry modal
- **Assumption:** A2 specifies HuggingFace CDN reliability

**DEP-011: Transformers.js**
- **Provider:** npm package `@huggingface/transformers`
- **Version:** Already in Texo dependencies (brownfield advantage)
- **Usage:** Worker pool inference via `pipeline('image-to-text', 'alephpi/FormulaNet')`
- **Status:** ✅ INSTALLED
- **Risk:** LOW - Established dependency, no version changes needed
- **Notes:** Vite config excludes from pre-bundling (per CLAUDE.md)

**DEP-012: Excalidraw Canvas**
- **Provider:** `@excalidraw/excalidraw` npm package
- **Usage:** Epic 2 reads element data for tile rendering
- **Status:** ✅ READY - Epic 1 integration complete
- **Risk:** LOW - No Epic 2-specific changes to Excalidraw API usage
- **Notes:** Excalidraw `onChange` event triggers OCR pipeline (Story 2.7)

---

### Epic 3 Integration Points (Downstream)

**INT-001: Validation Pipeline Input**
- **Consumer:** Epic 3 Story 3.1 (Sequential Row Validation)
- **Interface:** Epic 2 provides `row.transcribedLatex` for CAS equivalence checking
- **Trigger:** Epic 2 sets `row.ocrStatus = 'complete'` → Epic 3 validates row against previous row
- **Data Contract:** transcribedLatex must be valid, parseable LaTeX (verified by KaTeX in Story 2.5/2.6)
- **Error Handling:** If LaTeX invalid → Epic 2 sets `ocrStatus = 'error'`, Epic 3 skips validation

**INT-002: Debug Mode Settings**
- **Consumer:** Epic 3 Story 3.3 (Respect Debug Settings)
- **Interface:** Shared DebugContext provides `debugMode`, `forceAlgebrite` flags
- **Usage:** Epic 2 respects debugMode for verbose logging, Epic 3 uses for validation method selection
- **Status:** Existing Texo infrastructure, no Epic 2 changes needed

**INT-003: Inspection Panel Data**
- **Consumer:** Epic 4 Story 4.1 (Tap-to-Inspect Panel)
- **Interface:** Epic 2 stores OCR metadata (tile count, merge warnings, confidence) in row state
- **Display:** Epic 4 panel shows "Detected LaTeX", "Transcription time", "Tiles processed", "Warnings"
- **Status:** Epic 2 populates data, Epic 4 consumes

---

## Acceptance Criteria (Authoritative)

### Epic-Level Acceptance Criteria

**AC-E2-001: Complete Pipeline Functionality**
- **Criteria:** User draws expression spanning 1200px (4 tiles), OCR automatically transcribes to valid LaTeX within 2s
- **Validation:** Integration test with sample expression, verify transcribedLatex populated, ocrStatus = 'complete'
- **Owner:** Charlie (Senior Dev) + Dana (QA Engineer)

**AC-E2-002: Parallel Processing Performance**
- **Criteria:** 5-tile row completes OCR in ≤1.5s (3x speedup vs sequential 5×300ms=1.5s)
- **Validation:** Performance test measures parallel execution time
- **Owner:** Charlie (Senior Dev)

**AC-E2-003: Cache Hit Rate Target**
- **Criteria:** >60% cache hit rate on repeated expressions (test corpus)
- **Validation:** Performance dashboard displays hit rate, corpus testing measures baseline
- **Owner:** Dana (QA Engineer)

**AC-E2-004: Merge Accuracy Target**
- **Criteria:** >95% of merged LaTeX expressions are valid and parseable by KaTeX
- **Validation:** Test corpus (50 expressions), measure `valid === true` percentage
- **Owner:** Charlie (Senior Dev) + Dana (QA Engineer)
- **Open Question:** Q1 addresses measurement methodology

**AC-E2-005: Failure Mode Coverage**
- **Criteria:** All 11 identified failure modes (FM-001 through FM-011) have implemented mitigations
- **Validation:** Failure mode testing checklist (11 test scenarios), all passing
- **Owner:** Dana (QA Engineer)

**AC-E2-006: No User Data Loss**
- **Criteria:** OCR failures never corrupt row state, user can always retry (erase/redraw)
- **Validation:** Error injection testing, verify row state recoverable
- **Owner:** Charlie (Senior Dev)

**AC-E2-007: Instrumentation Coverage**
- **Criteria:** 100% of Epic 2 critical paths instrumented with PerformanceTracker and DecisionTracker
- **Validation:** Code review checklist, 7 function timing points + 5 decision boundary points verified
- **Owner:** Charlie (Senior Dev) + Epic 1 retrospective action items

---

### Story-Level Acceptance Criteria (Summary)

**Story 2.1: Tile Extraction**
- Extract overlapping 384x384 tiles with 64px overlap (16.7%)
- Single tile for <384px rows, multiple tiles for wider rows
- Tile hash calculation for cache lookup
- Performance: <200ms for typical 5-tile row

**Story 2.2: OCR Worker Pool**
- 3 worker instances, FIFO queue (max 20 tiles)
- Parallel processing (3 concurrent tiles)
- Worker crash recovery (auto-restart, retry once)
- Progress events for UI updates

**Story 2.3: Progress Indicators**
- Orange ⟳ spinner during OCR
- Progress bar: "Transcribing... 3/5 tiles"
- Smooth fade-in/out animations
- No UI jank (maintain 60fps)

**Story 2.4: Tile-Level Caching**
- IndexedDB `ocr-tile-cache` store
- Hash-based lookup (<1ms cache hit)
- 7-day TTL, auto-cleanup
- Quota handling (emergency cleanup at 80%)

**Story 2.5: LaTeX Merging**
- Gap-based spacing heuristic (<10px, 10-30px, >30px)
- Duplicate operator removal
- KaTeX validation of merged LaTeX
- Warnings for ambiguous merges

**Story 2.6: Post-Processing**
- Normalize fractions, exponents, operators
- Character disambiguation (O vs 0, l vs 1)
- Brace balancing detection
- Performance: <50ms cleanup

**Story 2.7: Auto-Trigger OCR**
- 1.5s debounce after last stroke
- Per-row independent timers
- Full pipeline orchestration (extraction → cache → OCR → merge → post-process → state update)
- Total latency <2s (Epic AC-E2-001)

**Story 2.8: Error Handling**
- Yellow ⚠️ icon for OCR errors
- Actionable error messages ("Try rewriting more clearly")
- Manual retry (double-tap row)
- Graceful degradation (partial results if >50% tiles succeed)

---

## Traceability Mapping

### Functional Requirements → Stories

| FR# | Requirement | Epic 2 Story | Acceptance Criteria | Test Strategy |
|-----|-------------|--------------|---------------------|---------------|
| FR19 | Auto-trigger OCR 1.5s after last stroke | 2.7 | AC-2.7-001: Debounce timer verified | Integration test: draw, wait 1.5s, OCR starts |
| FR20 | Extract tiles from rows | 2.1 | AC-2.1-001: extractTiles() returns Tile[] | Unit test: various row widths |
| FR21 | Overlapping 384x384 tiles (10-20%) | 2.1 | AC-2.1-002: 64px overlap = 16.7% | Unit test: verify overlap calculation |
| FR22 | Parallel tile processing | 2.2 | AC-2.2-001: 5 tiles in <1.5s | Performance test: measure parallel speedup |
| FR23 | Per-tile progress indicators | 2.3 | AC-2.3-001: Progress bar displays "3/5 tiles" | Integration test: verify UI updates |
| FR24 | Tile-level caching (hash-based) | 2.4 | AC-2.4-001: >60% hit rate on corpus | Performance test: cache metrics |
| FR25 | Respect FormulaNet model (384x384) | 2.1 | AC-2.1-003: All tiles exactly 384x384 | Unit test: verify tile dimensions |
| FR26 | Handle OCR failures gracefully | 2.8 | AC-E2-005: All 11 FMs mitigated | Failure mode testing checklist |
| FR27 | Show OCR status per row | 2.3, 2.7 | AC-2.7-002: Icon updates (∅ → ⟳ → ✓/⚠️) | Integration test: verify icon transitions |
| FR28 | Merge LaTeX fragments | 2.5 | AC-2.5-001: mergeTiles() combines fragments | Unit test: verify merge algorithm |
| FR29 | Measure visual gaps | 2.5 | AC-2.5-002: Gap calculation accurate | Unit test: gap = currX - (prevX + 384) |
| FR30 | Insert spacing based on gap | 2.5 | AC-2.5-003: Heuristic (<10, 10-30, >30) | Unit test: verify spacing rules |
| FR31 | Remove duplicate operators | 2.5 | AC-2.5-004: "+ +" → "+" | Unit test: regex removal verified |
| FR32 | Post-process cleanup | 2.6 | AC-2.6-001: Normalize fractions/operators | Unit test: cleanOcrLatex() transforms |
| FR33 | Produce valid, parseable LaTeX | 2.5, 2.6 | AC-E2-004: >95% merge accuracy | Corpus test: KaTeX validation rate |
| FR34 | One expression per row | 2.5 | AC-2.5-005: Single LaTeX string output | Integration test: verify merge result |
| FR35 | Handle multi-line expressions | 2.5 | AC-2.5-006: Complex layouts supported | Edge case testing |

### Non-Functional Requirements → Implementation

| NFR | Requirement | Implementation | Validation |
|-----|-------------|----------------|------------|
| NFR-P1 | <2s OCR latency | Performance budget allocation (1960ms) | PerformanceTracker dashboard, 50th percentile |
| NFR-P4 | >60% cache hit rate | Tile-level caching (Story 2.4) | Cache statistics, corpus testing |
| NFR-R1 | Graceful degradation | 11 failure mode mitigations | FM testing checklist |
| NFR-R3 | Operation timeouts | 10s tile OCR, 30s model load | Timeout handling tests |
| NFR-R5 | Logging & diagnostics | All errors logged with context | Log inspection, Database page |
| NFR-O3 | Two-layer instrumentation | 7 function timings + 5 decision boundaries | Code review checklist |

### Architecture Decisions → Constraints

| Architecture Decision | Epic 2 Implementation | Constraint Type |
|-----------------------|----------------------|-----------------|
| ADR-001: Row ID determinism (`row-${index}`) | TileExtractor uses row.id for tile metadata | Data format |
| ADR-002: OCR status enum immutability | ocrStatus transitions enforced (pending → processing → complete/error) | State machine |
| ADR-003: 3 worker pool size | OCRWorkerPool config `{maxWorkers: 3}` | Performance |
| ADR-004: Worker message protocol (UPPER_SNAKE_CASE) | `OCR_TILE`, `OCR_COMPLETE`, `OCR_ERROR` message types | Integration |
| ADR-005: IndexedDB append-only schema | New `ocr-tile-cache` store, never modify existing stores | Data persistence |
| ADR-006: No new npm dependencies | Inline xxhash implementation for tile hashing | Build |

### Epic 1 Retrospective Actions → Epic 2 Implementation

| Retrospective Action | Epic 2 Application | Story |
|----------------------|--------------------|-------|
| Performance Budget Matrix | 1960ms budget allocated across 7 pipeline stages | All stories (2.1-2.7) |
| Two-Layer Instrumentation | PerformanceTracker + DecisionTracker at all critical paths | All stories, validated in 2.7 |
| ADR Integration | Decision ownership matrix for all integration contracts | Architecture review (pre-Story 2.1) |
| Knowledge Transfer Pattern | Elena → Charlie handoff on RowManager, documentation-first | Story 2.1 (Elena owns TileExtractor) |

### Dependencies → Risks

| Dependency | Risk | Mitigation | Owner |
|------------|------|------------|-------|
| DEP-009: KaTeX __parse() internal API | API breakage on KaTeX upgrade | Version pinning, unit test detection | Charlie (Senior Dev) |
| DEP-010: FormulaNet HuggingFace CDN | CDN downtime, network failures | 3 retry attempts with backoff, user retry modal (FM-003) | Charlie (Senior Dev) |
| DEP-005: OCR Worker extension | Backward compatibility for SketchPage | Wrapper pattern, existing worker unchanged | Charlie (Senior Dev) |

## Risks, Assumptions, Open Questions

### Risks (Failure Modes with Mitigation)

**HIGH SEVERITY:**

**FM-001: Worker Crash During OCR Processing**
- **Risk:** Worker terminates unexpectedly, tiles never complete, row stuck in 'processing'
- **Detection:** Worker `onerror` event, 10s timeout, instrumentation: `DecisionTracker.measureDecision('worker-health-check')`
- **Mitigation:** Auto-restart crashed worker, retry tile once with different worker, return error result after 1 retry
- **User Impact:** Partial row results or yellow ⚠️ with "Processing failed. Try rewriting or refresh page."
- **Test Strategy:** Simulate worker crash, verify retry logic, check error message display

**FM-010: Performance Budget Exceeded (Cascade Failure)**
- **Risk:** One stage exceeds budget (>2x), causes downstream timeouts, system appears frozen
- **Detection:** PerformanceTracker reports >4s total (90th percentile threshold), consecutive failures
- **Mitigation:** Circuit breaker after 3 consecutive failures pauses auto-OCR, adaptive config reduces overlap
- **User Impact:** Toast: "OCR paused due to performance issues. Use manual trigger (double-tap)."
- **Test Strategy:** Stress test with complex expressions, verify circuit breaker activation, recovery flow

**MEDIUM SEVERITY:**

**FM-002: All Workers Saturated (Queue Overflow)**
- **Risk:** Rapid drawing generates >20 tiles, new requests rejected, rows stuck in 'pending'
- **Detection:** Queue monitoring `this.queue.length >= 20`, average wait time >5s
- **Mitigation:** Priority strategy (process recent tiles), deferred queue for dropped tiles, user feedback
- **User Impact:** Toast: "Processing overload. Slow down for best results." Deferred rows auto-retry when queue clears
- **Test Strategy:** Generate 30 tiles rapidly, verify priority handling, check deferred retry

**FM-006: Gap Calculation Ambiguity (Overlapping Tile Confusion)**
- **Risk:** Overlap regions have different OCR results, gap measurement produces nonsensical spacing
- **Detection:** Gap < -overlap - 10px (tolerance), overlap consistency check
- **Mitigation:** Fallback to default single space, warnings logged to inspection panel
- **User Impact:** Warnings in debug mode, may need manual review of transcription
- **Test Strategy:** Create intentionally ambiguous expressions across tile boundaries, verify warning generation

**FM-007: KaTeX Parser Rejection (Invalid LaTeX Output)**
- **Risk:** Merged LaTeX contains syntax errors, validation cannot process
- **Detection:** KaTeX parser throws error, categorized (SYNTAX_ERROR, UNKNOWN_COMMAND, PARSE_ERROR)
- **Mitigation:** Post-processor attempts automatic fixes, manual review if unfixable
- **User Impact:** Yellow ⚠️ with "Invalid LaTeX syntax. Try rewriting more clearly." Inspection shows attempted LaTeX
- **Test Strategy:** Inject invalid LaTeX fragments, verify error categorization, check post-processor fixes

**FM-011: Row State Update Conflict (Race Condition)**
- **Risk:** Multiple OCR pipelines update same row, state corruption, stale overwrites
- **Detection:** lastModified timestamp comparison, optimistic concurrency control
- **Mitigation:** Last write wins, stale updates rejected and logged
- **User Impact:** Transparent (most recent result shown), stale updates discarded silently
- **Test Strategy:** Trigger concurrent OCR on same row, verify timestamp ordering, check log for rejections

**LOW SEVERITY:**

**FM-003: Model Loading Failure (First OCR Request)**
- **Risk:** FormulaNet download fails (network issue, CDN down), all OCR operations fail
- **Detection:** Worker init timeout 30s, model download progress stalls, network errors
- **Mitigation:** 3 retry attempts with exponential backoff (2s, 4s, 8s), user-initiated retry
- **User Impact:** Modal: "Could not download OCR model. Check internet connection." Retry button available
- **Test Strategy:** Simulate network failure, verify retry logic, check user messaging

**FM-004: Invalid Bounding Box (Empty or Negative Dimensions)**
- **Risk:** Bbox calculation fails (zero width/height, elements deleted mid-processing)
- **Detection:** Validation `width <= 0 || height <= 0`, instrumentation: `DecisionTracker.measureDecision('bounding-box-validation')`
- **Mitigation:** Return empty tiles for legitimate empty rows, throw error for corrupted bbox
- **User Impact:** Empty rows: gray ∅ icon. Corrupted: yellow ⚠️ "Could not process row. Try erasing and redrawing."
- **Test Strategy:** Test empty rows, elements with zero dimensions, verify graceful handling

**FM-005: ImageData Rendering Failure (Canvas API Limits)**
- **Risk:** Canvas rendering fails (browser limits, out of memory, GPU context lost)
- **Detection:** Canvas `toDataURL()` returns null, context creation fails
- **Mitigation:** Skip failed tiles, continue with partial results, row error if >50% tiles fail
- **User Impact:** Partial transcription or error if too many tiles fail
- **Test Strategy:** Simulate canvas failures, verify partial result handling

**FM-008: IndexedDB Quota Exceeded**
- **Risk:** Storage full (~1GB limit), cache writes fail, performance degrades
- **Detection:** `QuotaExceededError`, proactive monitoring via `navigator.storage.estimate()`
- **Mitigation:** Emergency cleanup (delete oldest 25%), storage warning at 80%, settings panel "Clear Cache" button
- **User Impact:** Warning: "Storage 80% full. Clear cache to maintain performance." Cache disabled if cleanup fails
- **Test Strategy:** Fill storage to quota, verify emergency cleanup, check warning display (FR73)

**FM-009: Cache Corruption (Invalid Stored Data)**
- **Risk:** Cached entry has corrupted data (browser crash during write, disk error)
- **Detection:** Schema validation on read (required fields, type checks, TTL enforcement)
- **Mitigation:** Delete corrupted entries, return cache miss, re-run OCR
- **User Impact:** Transparent (slightly slower OCR for corrupted tiles, user unaware)
- **Test Strategy:** Inject corrupted cache entries, verify deletion and re-processing

---

### Assumptions

**A1: Browser Environment**
- **Assumption:** Target browsers support Web Workers, IndexedDB, Canvas API, ES2020+ features
- **Validation:** Architecture specifies Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Impact if wrong:** Feature completely unusable on older browsers
- **Mitigation:** Browser detection on load, graceful degradation message

**A2: FormulaNet Model Availability**
- **Assumption:** HuggingFace CDN remains available, model (~150MB) downloadable on first use
- **Validation:** Retry logic with backoff handles transient failures
- **Impact if wrong:** OCR unavailable until network restored
- **Mitigation:** User can continue drawing, OCR queued for later (offline-capable after first download)

**A3: Tile Overlap Sufficiency (64px)**
- **Assumption:** Fixed 64px overlap (16.7%) provides sufficient context to prevent character splitting
- **Validation:** Architecture cites IM2LATEX research (15-20% optimal), empirical testing needed
- **Impact if wrong:** Merge accuracy <95% target, frequent parse errors
- **Mitigation:** Monitor merge accuracy metric, increase overlap if needed (growth feature: adaptive overlap)

**A4: Worker Pool Size (3 workers)**
- **Assumption:** 3 workers optimal for typical browser (4-8 cores), balances parallelism vs resource usage
- **Validation:** Architecture decision ADR-003, empirical testing shows 3x speedup
- **Impact if wrong:** Under-utilization (too few) or browser slowdown (too many)
- **Mitigation:** Performance monitoring in Epic 2, adjust pool size if metrics indicate issue

**A5: Performance Budget Achievability (1960ms total)**
- **Assumption:** Component-level budgets are achievable on target hardware (tablet with stylus)
- **Validation:** Epic 1 established instrumentation framework, Epic 2 will measure continuously
- **Impact if wrong:** User experience degrades, >4s latency unacceptable per NFR-P3
- **Mitigation:** Circuit breaker pauses auto-OCR, adaptive config reduces load

**A6: KaTeX Parser Stability**
- **Assumption:** KaTeX internal API `__parse()` remains available (CLAUDE.md critical note)
- **Validation:** Pin KaTeX version in package.json, test before upgrading
- **Impact if wrong:** All LaTeX validation fails, Epic 2 and Epic 3 blocked
- **Mitigation:** Unit tests detect API breakage, fallback to regex-based basic validation if necessary

---

### Open Questions

**Q1: Tile Merge Accuracy Measurement**
- **Question:** How do we measure >95% merge accuracy target in production?
- **Options:** (a) Manual corpus testing pre-release, (b) User feedback mechanism, (c) Confidence score threshold
- **Impact:** Critical for Epic 2 acceptance criteria (FR33)
- **Resolution Needed By:** Story 2.5 implementation
- **Owner:** Charlie (Senior Dev) + Dana (QA Engineer)

**Q2: Cache Eviction Strategy**
- **Question:** Should cache eviction be LRU (least recently used) or age-based (7-day TTL)?
- **Options:** (a) LRU for frequently repeated expressions, (b) Age-based simpler implementation, (c) Hybrid
- **Impact:** Cache hit rate target >60% (FR24, NFR-P4)
- **Current Decision:** Age-based (7-day TTL) for MVP, can enhance later
- **Validation:** Monitor cache hit rate in Epic 2, revisit if <60%

**Q3: Worker Pool Size Configurability**
- **Question:** Should users be able to configure worker pool size (1-4 workers) based on device capability?
- **Options:** (a) Fixed 3 workers (simpler), (b) Auto-detect based on navigator.hardwareConcurrency, (c) User setting
- **Impact:** Performance on low-end devices vs high-end desktops
- **Current Decision:** Fixed 3 for MVP (ADR-003), can add setting in Epic 6 if needed
- **Owner:** Alice (Product Owner) to decide based on user feedback

**Q4: OCR Model Switching**
- **Question:** Should Epic 2 architecture support swapping OCR models (FormulaNet → alternative)?
- **Options:** (a) Hardcode FormulaNet (faster MVP), (b) Abstract model interface (future-proof per NFR-I4)
- **Impact:** Flexibility for future model improvements, code complexity
- **Current Decision:** Architecture specifies "model flexibility" but MVP hardcodes FormulaNet
- **Resolution:** Defer to post-MVP unless model issues discovered during testing

**Q5: Partial Row Processing Acceptance Threshold**
- **Question:** What % of tiles must succeed for partial row processing vs full error? (Currently: >50% success → partial, <50% → error)
- **Options:** (a) 50% threshold, (b) 75% (stricter), (c) Dynamic based on tile count
- **Impact:** User experience (show partial vs error), merge reliability
- **Current Decision:** 50% for MVP (FM-005 mitigation)
- **Validation:** User testing will reveal if threshold needs adjustment

---

## Test Strategy Summary

### Unit Testing (Vitest + jsdom)

**Coverage Target:** >90% for new Epic 2 components

**TileExtractor (`src/utils/ocrTiling.js`):**
- Test `extractTiles()` with various row widths: <384px (single tile), 400px (2 tiles with overlap), 1200px (4 tiles)
- Test `calculateTilePositions()` algorithm: verify stride = 384 - overlap, numTiles calculation
- Test edge cases: empty row (return []), invalid bbox (throw error per FM-004), zero-width elements
- Test hash uniqueness: same pixels → same hash, different pixels → different hash
- Performance: extractTiles() <200ms for 5-tile row (budget verification)

**OCRCache (`src/utils/ocrCache.js`):**
- Test cache hit: store then getCached returns same data
- Test cache miss: getCached for unknown hash returns null
- Test TTL enforcement: entry older than 7 days returns null and deletes entry
- Test schema validation (FM-009): corrupted entry (empty latex, invalid confidence) returns null and deletes
- Test quota handling (FM-008): QuotaExceededError triggers emergencyCleanup(), verify 25% deletion
- Performance: getCached() <1ms hit, <5ms miss (budget verification)

**LaTeXMerger (`src/utils/latexAssembly.js`):**
- Test gap-based spacing: <10px → no space, 10-30px → space, >30px → double space
- Test duplicate operator removal: "+ +" → "+", "- -" → "+"
- Test KaTeX validation: valid LaTeX → {valid: true}, invalid → {valid: false, errors: [...]}
- Test warnings generation (FM-006): negative gap → warning, overlap mismatch → warning
- Test edge cases: single tile (no merging), empty results array (return empty string)
- Performance: mergeTiles() <100ms for 5 tiles (budget verification)

**PostProcessor (`src/utils/ocrPostProcessor.js`):**
- Test normalization: `\frac {a}{b}` → `\frac{a}{b}`, `x^ 2` → `x^2`
- Test operator fixes: `+ +` → `+`, `- -` → `+`, `* *` → `*`
- Test character disambiguation: context-aware `O` vs `0`, `l` vs `1` conversion
- Test brace balancing: detect unbalanced `{` or `}`, generate warning
- Performance: cleanOcrLatex() <50ms (budget verification)

**OCRWorkerPool (`src/workers/ocrWorkerPool.js`):**
- Test worker assignment: tiles distributed FIFO across 3 workers
- Test parallel processing: 5 tiles complete in ~1.5s (not 5 * 300ms = 1.5s sequential)
- Test retry logic (FM-001): worker crash → restart worker, retry tile once, return error after 2nd failure
- Test queue overflow (FM-002): 25 tiles → first 20 queued, last 5 deferred, deferred auto-retry when queue clears
- Test timeout handling: tile >10s → reject Promise with TIMEOUT error
- Test cancelRow(): aborts pending tiles, rejects Promises, worker pool remains functional
- Performance: dispatch <50ms, per-tile 300ms avg (budget verification)

---

### Integration Testing (Manual Browser Testing)

**Full Pipeline Flow:**
1. Draw expression spanning 1200px (4 tiles expected)
2. Verify tile extraction: 4 tiles with 64px overlap
3. Verify cache: first OCR stores tiles, erase/redraw triggers cache hits
4. Verify parallel processing: progress bar shows 4/4 tiles
5. Verify merge: final LaTeX correct, spacing appropriate
6. Verify post-processing: normalized operators, clean syntax
7. Verify row state update: row.transcribedLatex populated, row.ocrStatus = 'complete'
8. Total time: <2s (budget verification)

**Error Scenarios:**
- **Worker crash simulation:** Terminate worker mid-processing, verify retry and recovery (FM-001)
- **Queue overflow:** Draw 10 rows rapidly, verify deferred queue and priority handling (FM-002)
- **Invalid LaTeX:** Inject malformed OCR output, verify post-processor cleanup and error messaging (FM-007)
- **Concurrent updates:** Trigger OCR while erasing/redrawing, verify last write wins (FM-011)
- **Performance degradation:** Load heavy canvas (20 complex rows), verify circuit breaker activation (FM-010)

**Cache Scenarios:**
- **Quota exceeded:** Fill IndexedDB to quota, trigger OCR, verify emergency cleanup (FM-008)
- **Corrupted entry:** Manually corrupt cache entry, verify deletion on read (FM-009)
- **TTL expiration:** Manually set entry timestamp to 8 days ago, verify deletion (FM-009)

**Browser Compatibility:**
- Test on: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ (per NFR-I3)
- Mobile browsers: iOS Safari 14+, Chrome Android 90+
- Tablet primary target: iPad Pro, Surface Pro, Galaxy Tab

---

### Performance Testing

**Instrumentation Framework (Epic 1 Preparation):**

**Layer 1: Function Timing (PerformanceTracker.measure())**
- `tile-extraction`: TileExtractor.extractTiles() - Budget: 200ms
- `cache-lookup`: OCRCache.getCached() per tile - Budget: 1ms hit, 5ms miss
- `worker-dispatch`: OCRWorkerPool.submitTiles() - Budget: 50ms
- `ocr-processing`: Worker pool parallel processing - Budget: 1500ms (5 tiles)
- `latex-merge`: LaTeXMerger.mergeTiles() - Budget: 100ms
- `post-process`: PostProcessor.cleanOcrLatex() - Budget: 50ms
- `state-update`: RowManager.updateRow() - Budget: 10ms

**Layer 2: Decision Analysis (DecisionTracker.measureDecision())**
- `cache-check`: TileExtractor decision "Should I check cache for this tile?"
- `worker-assignment`: OCRPool decision "Which worker processes which tile?"
- `gap-measurement`: LaTeXMerger decision "What spacing between fragments?"
- `bounding-box-validation`: TileExtractor decision "Is this bbox valid?" (FM-004 detection)
- `worker-health-check`: OCRPool decision "Is worker responsive?" (FM-001 detection)

**Performance Metrics Dashboard (Epic 2 Preparation):**
- Real-time display: current pipeline stage, time spent, budget remaining
- Historical: average latency per stage, 50th/90th percentile
- Cache statistics: hit rate %, entries count, storage used
- Worker pool: active workers, queue length, avg wait time
- Alerts: red highlight when stage exceeds budget, circuit breaker status

**Test Corpus:**
- 50 sample handwritten expressions (varying complexity: simple variables, polynomials, fractions, integrals)
- Measure: OCR latency, merge accuracy (% valid LaTeX), cache hit rate
- Targets: <2s avg latency (NFR-P1), >95% merge accuracy (FR33), >60% cache hit rate (FR24)

---

### Failure Mode Testing (Systematic Coverage)

| Failure Mode | Test Scenario | Expected Behavior | Verification |
|--------------|---------------|-------------------|--------------|
| FM-001 Worker Crash | Terminate worker during tile processing | Worker restarts, tile retries once, error after 2nd failure | Check logs for restart event, verify error message |
| FM-002 Queue Overflow | Submit 25 tiles simultaneously | First 20 queued, last 5 deferred, toast notification | Verify deferred queue, check user message |
| FM-003 Model Load Fail | Simulate network offline on first OCR | 3 retry attempts (2s, 4s, 8s backoff), modal with retry button | Check retry count, verify user messaging |
| FM-004 Invalid Bbox | Row with zero-width elements | Return empty tiles or throw error based on scenario | Verify graceful handling, no crash |
| FM-005 Canvas Render Fail | Force canvas context creation failure | Skip failed tile, continue with partial results | Check partial merge, verify row status |
| FM-006 Gap Ambiguity | Create tiles with negative gap | Fallback to default spacing, warning logged | Verify warning in inspection panel |
| FM-007 KaTeX Rejection | Inject invalid LaTeX (`\frac{a}`) | Post-processor attempts fix, error if unfixable | Check error categorization, user message |
| FM-008 Quota Exceeded | Fill IndexedDB to quota limit | Emergency cleanup (delete 25% oldest), warning at 80% | Verify cleanup execution, storage warning |
| FM-009 Cache Corruption | Manually corrupt cache entry | Delete entry on read, return cache miss | Check deletion, verify re-processing |
| FM-010 Budget Exceeded | Complex expression causing >4s latency | Circuit breaker after 3 failures, auto-OCR paused | Verify circuit breaker activation, user alert |
| FM-011 State Conflict | Concurrent OCR on same row | Last write wins, stale updates rejected | Check timestamp ordering, verify logs |

---

### Acceptance Criteria Validation

**From PRD Functional Requirements (Epic 2 Coverage: FR19-FR35):**

- **FR19:** Auto-trigger OCR 1.5s after last stroke ✓ *Test: Draw stroke, verify 1.5s debounce, OCR starts*
- **FR20:** Extract tiles from rows ✓ *Test: Unit test extractTiles() with various widths*
- **FR21:** Overlapping 384x384 tiles (10-20% overlap) ✓ *Test: Verify 64px overlap = 16.7%*
- **FR22:** Parallel tile processing via worker pool ✓ *Test: 5 tiles complete in <1.5s (parallel speedup)*
- **FR23:** Per-tile progress indicators ✓ *Test: Verify progress events, UI updates*
- **FR24:** Tile-level caching (hash-based) ✓ *Test: Cache hit rate >60% on corpus*
- **FR25:** Respect FormulaNet model requirements ✓ *Test: All tiles 384x384 grayscale*
- **FR26:** Handle OCR failures gracefully ✓ *Test: All 11 failure modes covered*
- **FR27:** Show OCR status per row ✓ *Test: Verify status icon updates*
- **FR28:** Merge LaTeX fragments into single expression ✓ *Test: Unit test mergeTiles()*
- **FR29:** Measure visual gaps between tiles ✓ *Test: Gap calculation algorithm tested*
- **FR30:** Insert spacing based on gap size ✓ *Test: <10px, 10-30px, >30px heuristic*
- **FR31:** Remove duplicate operators at seams ✓ *Test: Regex removal verified*
- **FR32:** Post-process cleanup of OCR artifacts ✓ *Test: Unit test cleanOcrLatex()*
- **FR33:** Produce valid, parseable LaTeX ✓ *Test: >95% merge accuracy on corpus*
- **FR34:** One expression per row after merge ✓ *Test: Integration test verifies single LaTeX string*
- **FR35:** Handle multi-line expressions ✓ *Test: Edge case testing for complex layouts*

**Non-Functional Requirements (Epic 2 Specific):**

- **NFR-P1:** OCR latency <2s per row ✓ *Test: Performance dashboard, 50th percentile measurement*
- **NFR-P4:** Cache hit rate >60% OCR tiles ✓ *Test: Corpus testing, dashboard metrics*
- **NFR-R1:** Graceful degradation on failures ✓ *Test: All 11 failure modes have mitigation*
- **NFR-R3:** Operation timeout (10s OCR per tile) ✓ *Test: Timeout handling in worker pool*
- **NFR-R5:** Logging & diagnostics ✓ *Test: All errors logged with full context*

---

### Test Execution Plan

**Phase 1: Unit Tests (Stories 2.1-2.6)**
- Run: `npm test` (Vitest suite)
- Coverage: >90% for new Epic 2 files
- Duration: <5 minutes
- Failures block story completion

**Phase 2: Integration Tests (Story 2.7)**
- Manual browser testing on dev server
- Test matrix: 4 browsers × 3 devices = 12 combinations
- Duration: 2-3 hours
- Document results in test log

**Phase 3: Performance Tests (Story 2.7)**
- Run corpus (50 expressions) through pipeline
- Measure: latency, accuracy, cache hits
- Compare against targets (2s, 95%, 60%)
- Iterate if targets missed

**Phase 4: Failure Mode Tests (Post-Story 2.8)**
- Systematic: 11 failure modes × 1-2 test scenarios each
- Duration: 3-4 hours
- All mitigations verified

**Phase 5: Acceptance Validation (Epic 2 Complete)**
- Verify all 17 FRs (FR19-FR35) testable and passing
- Verify NFRs (P1, P4, R1, R3, R5) met
- Demo to Product Owner (Alice)
- Sign-off required before Epic 3

---

### Test Artifacts

**Deliverables:**
1. Unit test suite: `src/utils/__tests__/ocrTiling.test.js`, `ocrCache.test.js`, `latexAssembly.test.js`, `ocrPostProcessor.test.js`
2. Integration test log: Manual test results documented in `docs/sprint-artifacts/epic-2-integration-tests.md`
3. Performance test report: Corpus results, metrics dashboard screenshots
4. Failure mode checklist: Systematic coverage verification
5. Acceptance criteria matrix: All FRs/NFRs validated

**Regression Prevention:**
- All Epic 2 tests added to CI pipeline
- Performance budgets enforced via instrumentation framework
- Failure mode scenarios become permanent integration tests
