# Texo-web-stylus - Epic Breakdown

**Author:** BMad
**Date:** 2025-11-13
**Project Level:** BMad Method - Brownfield
**Target Scale:** Major feature addition (Magic Canvas)

---

## Overview

This document provides the complete epic and story breakdown for the Magic Canvas feature, decomposing the 98 functional requirements from the [PRD](./PRD.md) into implementable stories.

**Living Document Notice:** This is the initial version. It will be updated after Architecture workflow adds technical details to stories. (UX Design may be skipped as Magic Canvas UX principles are already well-defined in PRD.)

---

## Functional Requirements Inventory

**Total FRs: 98** (extracted from PRD)

### Canvas & Drawing (FR1-FR10)
- FR1: Users can access Magic Canvas page from main navigation
- FR2: Users can draw on infinite vertical canvas with stylus/mouse
- FR3: Canvas displays horizontal ruled lines as row boundaries
- FR4: Users can customize row line spacing
- FR5: Users can pan vertically through canvas
- FR6: Users can zoom in/out on canvas
- FR7: Canvas state persists across reloads
- FR8: Users can erase strokes/selections
- FR9: Users can undo/redo actions
- FR10: Canvas supports Excalidraw's native tools

### Row System (FR11-FR18)
- FR11: Auto-assign elements to rows by Y-coordinate
- FR12: Each row has stable unique ID
- FR13: System maintains row metadata (position, elements, status, LaTeX)
- FR14: Row height for OCR is configurable
- FR15: Users see which row elements belong to
- FR16: Empty rows tracked but skipped in validation
- FR17: Rows stable through canvas transformations
- FR18: System detects element additions/removals

### OCR & Transcription (FR19-FR27)
- FR19: Auto-trigger OCR 1.5s after last stroke
- FR20: System extracts tiles from rows
- FR21: Overlapping 384x384 tiles (10-20% overlap)
- FR22: Parallel tile processing via worker pool
- FR23: Per-tile progress indicators
- FR24: Tile-level caching (hash-based)
- FR25: Respect FormulaNet model requirements
- FR26: Handle OCR failures gracefully
- FR27: Show OCR status per row

### LaTeX Assembly (FR28-FR35)
- FR28: Merge tile fragments into single expression
- FR29: Measure visual gaps between tiles
- FR30: Insert spacing based on gap size
- FR31: Remove duplicate operators at seams
- FR32: Post-process cleanup of OCR artifacts
- FR33: Produce valid, parseable LaTeX
- FR34: One expression per row after merge
- FR35: Handle multi-line expressions

### Validation (FR36-FR46)
- FR36: Validate each row against previous non-empty row
- FR37: Use existing CAS checkEquivalence()
- FR38: First row auto-validates as correct
- FR39: Skip empty rows in validation chain
- FR40: Respect debugMode setting
- FR41: Respect forceAlgebrite setting
- FR42: Cache validation results
- FR43: Handle parse failures gracefully
- FR44: Indicate validation method used
- FR45: Report timing information
- FR46: Manual validation trigger (double-tap)

### Visual Feedback (FR47-FR57)
- FR47: Display colored status icons at row edge
- FR48: Green ✓ = equivalent
- FR49: Red ✗ = not equivalent
- FR50: Yellow ⚠️ = parse failure
- FR51: Orange ⟳ = processing
- FR52: Gray ∅ = empty/pending
- FR53: Icons with 44x44px tap targets
- FR54: Tap icon to inspect details
- FR55: Smooth fade-in animations
- FR56: Updates don't disrupt drawing
- FR57: No modal dialogs during operation

### Inspection & Debug (FR58-FR66)
- FR58: Tap icon to view transcribed LaTeX
- FR59: Panel shows detected vs previous LaTeX
- FR60: Debug Mode toggle for diagnostics
- FR61: Debug shows tile boundaries overlay
- FR62: Debug shows validation method/timing/forms
- FR63: Debug displays cache hit/miss
- FR64: View OCR logs
- FR65: View validation logs
- FR66: Inspection panel is non-modal

### Persistence & Workspace (FR67-FR75)
- FR67: Auto-save row state to IndexedDB
- FR68: Save vector strokes + transcribed LaTeX
- FR69: Load canvas state on reload
- FR70: Export to workspace manager
- FR71: Export includes vector + LaTeX
- FR72: Load previously saved documents
- FR73: Track storage quota, warn at 80%
- FR74: Persist across browser sessions
- FR75: Manual clear for specific canvas

### Settings & Config (FR76-FR82)
- FR76: Adjust row line spacing
- FR77: Adjust OCR debounce time (1-5s)
- FR78: Toggle auto-validation on/off
- FR79: Configure row height for OCR
- FR80: Preferences persist in localStorage
- FR81: Access settings via floating toolbar
- FR82: Settings panel dismissible

### Export & Integration (FR83-FR90)
- FR83: Export canvas as JSON
- FR84: Copy row LaTeX to clipboard
- FR85: Compatible with existing workspace manager
- FR86: Clear all rows, keep structure
- FR87: Integrate with existing IndexedDB
- FR88: Reuse existing OCR worker
- FR89: Reuse existing CAS
- FR90: Reuse existing debug context/logging

### User Control (FR91-FR98)
- FR91: Floating toolbar with actions
- FR92: Toolbar auto-hides after 3s
- FR93: Manual show/hide toolbar
- FR94: "Validate All Rows" action
- FR95: Clear canvas with confirmation
- FR96: Clear processing indication
- FR97: Cancel long OCR operations
- FR98: Handle rapid input gracefully

---

## Epic Structure Overview

**6 Epics organized by workflow and value delivery:**

### Epic 1: Canvas Foundation & Row System
**Value:** Establish the drawing surface and intelligent row management that enables all subsequent functionality.

**Scope:** Magic Canvas page, Excalidraw integration, row line rendering, RowManager class, automatic element-to-row assignment, row metadata tracking, state persistence through transformations.

**FR Coverage:** FR1-FR18 (18 requirements)
- All Canvas & Drawing capabilities
- Complete Row System
- Establishes foundation for OCR and validation

**Why this grouping:** Canvas and rows are inseparable—users can't draw math without the canvas, and OCR can't process without row boundaries. This epic creates the "paper" that everything else writes on.

---

### Epic 2: OCR Tiling & Transcription
**Value:** Transform handwritten strokes into LaTeX through intelligent tiling and parallel processing.

**Scope:** Tile extraction with overlap, worker pool management, parallel OCR processing, tile-level caching, LaTeX fragment merging, post-processing cleanup, progress indication.

**FR Coverage:** FR19-FR35 (17 requirements)
- All OCR & Transcription capabilities
- Complete LaTeX Assembly system
- Core "magic" that makes silent transcription possible

**Why this grouping:** Tiling and merging are two sides of same challenge—splitting wide expressions for the model, then reconstructing them. These operations must work together seamlessly.

---

### Epic 3: Validation & Feedback Pipeline
**Value:** Provide instant mathematical correctness feedback through silent validation and ambient visual cues.

**Scope:** Sequential row validation, CAS integration, validation caching, visual feedback system (status icons), smooth animations, non-intrusive updates, error handling.

**FR Coverage:** FR36-FR57 (22 requirements)
- All Validation capabilities
- Complete Visual Feedback system
- The "fail fast to progress faster" core promise

**Why this grouping:** Validation and feedback are inseparable—validation without feedback is invisible, feedback without validation is meaningless. This epic delivers the key user value.

---

### Epic 4: Inspection & Debugging
**Value:** Enable users to understand what the system detected and why validation succeeded/failed.

**Scope:** Tap-to-inspect panel, debug mode toggle, tile boundary overlay, validation method/timing display, cache statistics, integration with existing logging.

**FR Coverage:** FR58-FR66 (9 requirements)
- All Inspection & Debug capabilities
- Transparency and trust-building
- Critical for "magic you can verify" philosophy

**Why this grouping:** All about making the "black box" transparent. These tools help users understand system behavior and troubleshoot issues.

---

### Epic 5: Persistence & Workspace Integration
**Value:** Ensure work is never lost and integrates seamlessly with existing Texo workspace system.

**Scope:** IndexedDB auto-save, canvas state loading, workspace manager export/import, storage quota monitoring, session persistence, manual data management.

**FR Coverage:** FR67-FR75 (9 requirements)
- All Persistence & Workspace capabilities
- Integration with existing Texo infrastructure
- Data safety and portability

**Why this grouping:** All about data lifecycle—saving, loading, exporting. Critical for real-world usability but independent of core drawing/validation workflow.

---

### Epic 6: Settings & User Control
**Value:** Give users control over behavior, performance, and workspace management.

**Scope:** Floating toolbar, settings panel, row spacing configuration, debounce timing, auto-validation toggle, validate-all action, clear canvas, operation cancellation.

**FR Coverage:** FR76-FR98 (23 requirements)
- All Settings & Configuration
- All Export & Integration (not covered in Epic 5)
- All User Control capabilities
- Polish and user empowerment

**Why this grouping:** All user-facing controls and configuration. While individually small features, collectively they make the tool adaptable to different workflows and preferences.

---

## FR Coverage Map

**Epic 1 (Canvas Foundation):** FR1-FR18
**Epic 2 (OCR Pipeline):** FR19-FR35
**Epic 3 (Validation & Feedback):** FR36-FR57
**Epic 4 (Inspection & Debug):** FR58-FR66
**Epic 5 (Persistence):** FR67-FR75
**Epic 6 (Settings & Control):** FR76-FR98

**Total Coverage:** All 98 FRs mapped to epics ✓

**Sequencing Rationale:**
1. **Epic 1 first** - Foundation required for everything else
2. **Epic 2 second** - Need OCR before validation makes sense
3. **Epic 3 third** - Validation builds on OCR output
4. **Epics 4-6 in parallel** - Supporting features, can be developed concurrently once core pipeline (1-3) exists

---

## Epic 1: Canvas Foundation & Row System

**Goal:** Create the drawing surface and intelligent row management system that serves as the foundation for all Magic Canvas functionality.

**Business Value:** Users can access Magic Canvas, draw naturally with stylus/mouse, and see their work automatically organized into rows—the essential "paper" for mathematical note-taking.

**Dependencies:** None (brownfield - Texo infrastructure already exists)

---

### Story 1.1: Create Magic Canvas Page and Routing

As a **user**,
I want **to access Magic Canvas from the main navigation**,
So that **I can start using the new mathematical note-taking feature**.

**Acceptance Criteria:**

**Given** I am on any Texo page
**When** I click "Magic Canvas" in the navigation menu
**Then** I am routed to `/magic-canvas` and see the Magic Canvas page

**And** the page renders without errors or console warnings
**And** the navigation item is highlighted as active when on Magic Canvas
**And** the page is lazy-loaded (not in main bundle) to minimize initial load impact
**And** page metadata includes appropriate title ("Magic Canvas - Texo")

**Prerequisites:** None

**Technical Notes:**
- Create `src/pages/MagicCanvas.jsx` as new route component
- Update `src/App.jsx` to add route: `<Route path="/magic-canvas" element={<MagicCanvas />} />`
- Add navigation link in app header/menu
- Use React.lazy() for code splitting
- Follow existing Texo page structure patterns (see SketchPage.jsx, ComposePage.jsx)

---

### Story 1.2: Integrate Excalidraw Canvas with Infinite Vertical Scroll

As a **user**,
I want **an infinite vertical canvas where I can draw freely**,
So that **I can write mathematical expressions without space constraints**.

**Acceptance Criteria:**

**Given** I am on the Magic Canvas page
**When** the page loads
**Then** I see an Excalidraw canvas that fills the viewport

**And** I can draw strokes with mouse or stylus
**And** I can pan vertically by dragging with touch or mouse wheel
**And** I can zoom in/out using pinch gestures or Ctrl+scroll
**And** the canvas extends infinitely in the vertical direction
**And** horizontal extent is limited to reasonable width (e.g., 2000px)
**And** canvas background is white or light gray
**And** Excalidraw toolbar is minimal or hidden by default

**Prerequisites:** Story 1.1

**Technical Notes:**
- Use `@excalidraw/excalidraw` package (already in dependencies)
- Configure Excalidraw with:
  - `viewModeEnabled={false}` (allow drawing)
  - Infinite canvas configuration
  - Hide unnecessary UI chrome
- Study `src/pages/SketchPage.jsx` for Excalidraw integration patterns
- Canvas state will be managed via React hooks (detailed in later stories)

---

### Story 1.3: Render Horizontal Ruled Lines for Row Guidance

As a **user**,
I want **to see horizontal ruled lines on the canvas**,
So that **I know where to write each line of my mathematical work**.

**Acceptance Criteria:**

**Given** I am on the Magic Canvas page
**When** the canvas renders
**Then** I see horizontal ruled lines spaced at regular intervals (default 384px apart)

**And** lines extend across the full width of the visible canvas
**And** lines are subtle (light gray, ~1px stroke)
**And** lines do not interfere with drawing (rendered as background layer)
**And** lines remain visible during pan and zoom operations
**And** spacing adjusts correctly when zoom level changes (maintain constant spacing in canvas coordinates)
**And** lines render performantly (60fps during pan/zoom)

**Prerequisites:** Story 1.2

**Technical Notes:**
- Render lines as SVG elements in Excalidraw background layer or custom overlay
- Default spacing: 384px (matches OCR tile height from FR14)
- Lines represent row boundaries for OCR processing
- Consider rendering only visible lines + buffer (performance optimization)
- Store line spacing in component state for later configurability (Story 6.1)

---

### Story 1.4: Implement RowManager Class for Row State Tracking

As a **system component**,
I want **a RowManager class that tracks rows and their metadata**,
So that **row state can be managed consistently throughout the application**.

**Acceptance Criteria:**

**Given** the Magic Canvas page needs to track rows
**When** RowManager is instantiated with configuration (row height, starting Y position)
**Then** it provides methods to:

**And** `getRowForY(y: number): Row` - returns row containing given Y coordinate
**And** `assignElement(element: ExcalidrawElement): rowId` - assigns element to appropriate row
**And** `getRow(rowId: string): Row` - retrieves row metadata by ID
**And** `updateRow(rowId: string, updates: Partial<Row>): void` - updates row metadata
**And** `getAllRows(): Row[]` - returns all tracked rows
**And** `getRowsInViewport(viewport: Viewport): Row[]` - returns visible rows for given viewport

**And** each Row object includes:
- `id`: string (stable unique identifier)
- `yStart`: number (top Y coordinate)
- `yEnd`: number (bottom Y coordinate)
- `elementIds`: string[] (IDs of Excalidraw elements in this row)
- `ocrStatus`: 'pending' | 'processing' | 'complete' | 'error'
- `validationStatus`: 'pending' | 'processing' | 'validated' | 'invalid' | 'error'
- `transcribedLatex`: string | null
- `lastModified`: Date

**And** row IDs remain stable across pan/zoom/reload operations
**And** RowManager handles edge cases (elements spanning multiple rows → assign to primary row based on center Y)

**Prerequisites:** Story 1.3

**Technical Notes:**
- Create `src/utils/rowManager.js` (or `.ts` if using TypeScript)
- Row height configurable via constructor (default 384px)
- Use Map<string, Row> for O(1) lookups
- Row ID generation: Use incremental IDs or UUIDs for stability
- Consider spatial indexing (RBush) for efficient viewport queries (performance optimization for Story 1.7)

---

### Story 1.5: Automatically Assign Drawn Elements to Rows

As a **user**,
I want **my drawn strokes to automatically belong to the correct row**,
So that **OCR processes the right content for each line**.

**Acceptance Criteria:**

**Given** I draw on the Magic Canvas
**When** I create a new stroke element
**Then** the system automatically assigns it to the appropriate row based on its Y coordinate

**And** assignment happens within 100ms of stroke completion
**And** elements are assigned based on their center Y coordinate
**And** assignment updates if element is moved to different row
**And** assignment persists through pan/zoom operations
**And** erased elements are removed from their row's element list
**And** undo/redo operations correctly update row assignments

**Prerequisites:** Story 1.2, Story 1.4

**Technical Notes:**
- Hook into Excalidraw's `onChange` event to detect scene changes
- Filter for new/modified/deleted elements since last change
- Call `rowManager.assignElement(element)` for each new/modified element
- Handle element deletion by updating row's `elementIds` array
- Debounce row assignment updates (50ms) to avoid excessive computation during rapid drawing
- Store row assignments in component state: `Map<elementId, rowId>`

---

### Story 1.6: Display Row Status Indicators at Row Edge

As a **user**,
I want **to see visual indicators showing each row's status**,
So that **I know when transcription/validation is happening or complete**.

**Acceptance Criteria:**

**Given** rows have various statuses (pending, processing, validated, etc.)
**When** I view the canvas
**Then** I see a status icon at the right edge of each row, vertically centered

**And** icons are positioned at: `(canvasWidth - 60px, rowCenterY)`
**And** icons are 48x48px (exceeds 44x44px WCAG touch target minimum)
**And** icons use clear, intuitive symbols:
- Gray ∅: Row empty or pending
- Orange ⟳ (spinning): Processing (OCR or validation)
- Green ✓: Validated as correct
- Red ✗: Validation failed
- Yellow ⚠️: Parse error or warning

**And** icons fade in smoothly when status changes (200ms transition)
**And** icons don't interfere with drawing (rendered on separate layer)
**And** icons remain visible during zoom (scale with canvas)
**And** icons are tappable/clickable (44x44px tap target, will open inspection panel in Epic 4)

**Prerequisites:** Story 1.4, Story 1.5

**Technical Notes:**
- Render icons as SVG or React components overlaid on Excalidraw canvas
- Use Excalidraw's custom rendering API or separate React portal overlay
- Icons should be part of "validation feedback layer" (separate from drawing elements)
- Store icon state in RowManager: `row.ocrStatus` and `row.validationStatus` determine which icon to show
- CSS animations for fade-in and spinner rotation
- Tap detection handled in Story 4.1 (inspection panel)

---

### Story 1.7: Persist Row State and Canvas State Across Reloads

As a **user**,
I want **my canvas and row state to persist when I reload the page**,
So that **I don't lose my work if I close the browser tab**.

**Acceptance Criteria:**

**Given** I have drawn content on Magic Canvas with rows in various states
**When** I reload the page or close and reopen the browser
**Then** the canvas restores to my previous state:

**And** all drawn strokes are restored in correct positions
**And** row assignments are restored (elements belong to same rows)
**And** row statuses are restored (OCR status, validation status, transcribed LaTeX)
**And** zoom level and pan position are restored
**And** restoration completes within 1 second for typical canvas (<500 elements)

**And** if no previous state exists, canvas loads empty with default view
**And** corrupted state is detected and handled gracefully (fallback to empty canvas, log error)

**Prerequisites:** Story 1.5, Story 1.6

**Technical Notes:**
- Use existing `src/utils/workspaceDB.js` or create new IndexedDB store: `magic-canvas-state`
- Store structure:
  - `canvasState`: Excalidraw scene JSON (elements, appState)
  - `rowState`: RowManager serialized state (all rows with metadata)
  - `timestamp`: Last modified time
- Auto-save on every significant change (debounced 2s)
- Load on component mount from IndexedDB
- Handle Excalidraw scene restoration via `initialData` prop
- Reconstruct RowManager from saved row state
- Schema versioning for future-proofing (v1 initially)

---

### Story 1.8: Handle Row Updates When Elements Are Modified or Moved

As a **user**,
I want **row assignments to update automatically when I move or edit strokes**,
So that **OCR and validation always process the current content**.

**Acceptance Criteria:**

**Given** I have drawn elements assigned to rows
**When** I move an element from Row A to Row B (by dragging vertically)
**Then** the element is removed from Row A's element list and added to Row B's

**And** both rows' `lastModified` timestamps are updated
**And** moved row's OCR status resets to 'pending' (requires re-transcription)
**And** target row's OCR status resets to 'pending'

**And** when I modify an element (change stroke, resize, edit text)
**Then** its row's `lastModified` updates and OCR status resets to 'pending'

**And** when I delete an element
**Then** it's removed from its row's element list and row updates accordingly

**And** updates happen within 100ms of modification
**And** rapid modifications are debounced to avoid excessive processing

**Prerequisites:** Story 1.5, Story 1.7

**Technical Notes:**
- Excalidraw `onChange` callback provides: `elements`, `appState`, `files`
- Diff previous and current element arrays to detect moves/modifications
- For moves: Check if element's center Y crossed row boundary
- On modification: Set `row.ocrStatus = 'pending'` and `row.transcribedLatex = null`
- Debounce: 500ms after last modification before triggering OCR (Story 2.1)
- This story ensures row metadata stays synchronized with canvas state

---

### Epic 1 Summary

**Stories:** 8
**Estimated Complexity:** Medium (brownfield advantage - Excalidraw already integrated, IndexedDB utils exist)
**Key Deliverables:**
- Magic Canvas page accessible via navigation
- Infinite vertical canvas with ruled lines
- RowManager class tracking row metadata
- Automatic element-to-row assignment
- Visual status indicators
- Full state persistence

**Testing Notes:**
- Unit tests: RowManager class methods (getRowForY, assignElement, etc.)
- Integration tests: Manual browser testing for drawing, pan/zoom, persistence
- Performance tests: Canvas with 500+ elements, pan/zoom at 60fps
- Edge cases: Elements spanning rows, rapid drawing, undo/redo

---

## Epic 2: OCR Tiling & Transcription

**Goal:** Transform handwritten strokes into LaTeX through intelligent tile extraction, parallel OCR processing, and restorative LaTeX merging.

**Business Value:** The "silent magic" that converts handwriting to LaTeX without user intervention—the core technical innovation of Magic Canvas.

**Dependencies:** Epic 1 (needs RowManager and canvas state)

---

### Story 2.1: Implement Tile Extraction with Overlap from Row Elements

As a **system component**,
I want **to extract overlapping 384x384px tiles from row elements**,
So that **wide expressions can be processed by the OCR model without losing context at boundaries**.

**Acceptance Criteria:**

**Given** a row contains drawn elements that span more than 384px horizontally
**When** tile extraction is triggered for that row
**Then** the system creates overlapping tiles:

**And** each tile is exactly 384x384px (model input requirement)
**And** tiles overlap by 10-20% (38-76px) horizontally
**And** tiles are extracted from the row's bounding box (min/max X/Y of all elements)
**And** single narrow rows (<384px wide) produce single tile
**And** very wide rows produce N tiles where N = ceil((width - overlap) / (384 - overlap))
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
- Return array of `Tile` objects: `{image: ImageData, metadata: TileMetadata}`

---

### Story 2.2: Create OCR Worker Pool for Parallel Processing

As a **system component**,
I want **a pool of OCR workers that process tiles in parallel**,
So that **multi-tile rows transcribe faster and don't block the main thread**.

**Acceptance Criteria:**

**Given** multiple tiles need OCR processing
**When** tiles are submitted to the worker pool
**Then** the pool distributes tiles across 3-4 worker instances

**And** workers process tiles in parallel (up to 4 concurrent)
**And** workers reuse existing `ocrWorker.js` logic (FormulaNet model)
**And** pool handles worker initialization (load model once per worker)
**And** pool queues excess tiles when all workers busy
**And** pool reports progress per tile: `{tileId, status: 'queued' | 'processing' | 'complete' | 'error', progress: 0-100}`
**And** pool handles worker crashes gracefully (restart worker, retry tile)
**And** pool can be canceled (abort all pending tiles for a row)

**And** average tile processing time: <500ms after model loaded
**And** pool initialization time: <3s (model loading)

**Prerequisites:** Story 2.1

**Technical Notes:**
- Create `src/workers/ocrWorkerPool.js` (worker manager)
- Extend existing `src/workers/ocrWorker.js` to handle single tile + return LaTeX fragment
- Pool configuration: `{maxWorkers: 4, queueSize: 20}`
- Use Promise-based API: `pool.processTile(tile): Promise<{latex: string, confidence: number}>`
- Worker communication via postMessage/onmessage
- Progress events bubble up to UI (Story 2.3)
- Store worker pool instance in React context or component state

---

### Story 2.3: Display Per-Tile OCR Progress Indicators

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

**Prerequisites:** Story 2.2, Story 1.6 (status icons)

**Technical Notes:**
- Subscribe to worker pool progress events in MagicCanvas component
- Render progress bar using React component or SVG overlay
- Position: Below row, left-aligned, ~200px wide
- Style: Thin progress bar (4px height), semi-transparent background
- Remove progress indicator when `row.ocrStatus = 'complete'` or 'error'
- Debounce progress updates (100ms) to avoid excessive re-renders

---

### Story 2.4: Implement Tile-Level OCR Caching

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
**And** cache miss triggers normal OCR processing
**And** cache can be manually cleared (Story 6.x)

**Prerequisites:** Story 2.2

**Technical Notes:**
- Create `src/utils/ocrCache.js` with `getFromCache(hash)` and `storeInCache(hash, result)`
- Use existing `indexedDBCache.js` patterns
- Hash tile ImageData using xxhash or CRC32 for speed
- IndexedDB store schema: `{hash: string (key), latex: string, confidence: number, createdAt: timestamp}`
- Check cache before submitting tile to worker pool
- Background cleanup job removes entries older than 7 days (run on page load)

---

### Story 2.5: Merge LaTeX Fragments with Spacing Heuristics

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

**Prerequisites:** Story 2.2, Story 2.4

**Technical Notes:**
- Create `src/utils/latexAssembly.js` with `mergeTiles(tiles: Tile[]): string`
- Input: Array of `{latex: string, metadata: {offsetX, overlap}}` ordered by offsetX
- Measure visual gaps using tile metadata (offsetX + 384 vs next offsetX)
- Regex-based duplicate operator removal: `/(\+|\-|\*|\/)\s*\1/g`
- Use existing `katexParser.js` to validate merged LaTeX
- Return: `{mergedLatex: string, valid: boolean, errors: string[]}`
- Log merge details to diagnostic system for debugging

---

### Story 2.6: Implement LaTeX Post-Processing and Cleanup

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
  - `l` vs `1` (lowercase L vs one)
  - `x` vs `\times` vs `*` normalization
**And** remove trailing whitespace
**And** ensure proper grouping: `{...}` balanced, `(...)` balanced
**And** detect likely errors that need user attention:
  - Unbalanced braces/parens → mark as warning
  - Unknown LaTeX commands → mark as warning

**And** post-processing adds <10ms overhead
**And** cleaned LaTeX is re-validated with KaTeX parser

**Prerequisites:** Story 2.5

**Technical Notes:**
- Create `src/utils/ocrPostProcessor.js` with `cleanOcrLaTeX(latex: string): {cleaned: string, warnings: string[]}`
- Regex-based cleanup patterns
- Heuristic-based character disambiguation (context-aware)
- Use KaTeX parser to detect structural issues
- Return warnings array for user inspection (Story 4.1)
- Configurable strictness (lenient for MVP)

---

### Story 2.7: Trigger OCR Pipeline Automatically with Debounce

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

**And** debounce time is configurable (Story 6.2: 1-5s range)
**And** multiple rows can process OCR simultaneously (worker pool handles concurrency)

**Prerequisites:** Story 1.8 (row change detection), Story 2.2 (worker pool), Story 2.5 (merging)

**Technical Notes:**
- Create React hook: `useAutoOCR(rowManager, workerPool, debounceMs)`
- Track per-row debounce timers in Map<rowId, TimeoutId>
- On Excalidraw onChange → detect modified rows → reset timers for those rows
- On timer expire → trigger OCR pipeline:
  1. Extract tiles (Story 2.1)
  2. Check cache (Story 2.4)
  3. Process via worker pool (Story 2.2)
  4. Merge fragments (Story 2.5)
  5. Post-process (Story 2.6)
  6. Update row.transcribedLatex and row.ocrStatus
- Handle errors gracefully: set row.ocrStatus = 'error', show ⚠️ icon

---

### Story 2.8: Handle OCR Failures and Timeouts Gracefully

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
**And** failed row can be manually retried (double-tap to force re-OCR)
**And** partial results (some tiles succeeded) are discarded (all-or-nothing per row)

**And** errors are logged to diagnostic system with full context
**And** OCR failures don't crash the app or block other rows

**Prerequisites:** Story 2.7

**Technical Notes:**
- Implement timeout per tile: 10s max (generous, typical is <1s)
- Worker pool returns error types: `{type: 'timeout' | 'model_error' | 'invalid_output', message: string}`
- Set row.ocrStatus = 'error' and row.errorMessage = '...'
- Error messages stored in row metadata for inspection panel (Story 4.1)
- Manual retry: clear row.ocrStatus, row.transcribedLatex, trigger OCR immediately
- Use existing logger.js to log full error context (tile images, fragments, merged LaTeX)

---

### Epic 2 Summary

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

---

## Epic 3: Validation & Feedback Pipeline

**Goal:** Provide instant mathematical correctness feedback through CAS integration and ambient visual cues.

**Stories:** 7

### Story 3.1: Integrate Sequential Row Validation with Existing CAS
- Validate row N against row N-1 using `checkEquivalence()`
- Skip empty rows in validation chain
- First row auto-validates as correct
- Handle parse failures gracefully

### Story 3.2: Implement Validation Result Caching
- Cache key: `row:${prevId}:${currId}`
- Store validation results in existing IndexedDB cache
- Cache hit rate target >70%
- Avoid redundant validation of unchanged rows

### Story 3.3: Respect Debug Settings (debugMode, forceAlgebrite)
- Read settings from existing DebugContext
- Pass settings to checkEquivalence()
- Store validation method used in row metadata
- Report timing information

### Story 3.4: Update Row Status Icons Based on Validation Results
- Green ✓: Mathematically equivalent
- Red ✗: Not equivalent
- Yellow ⚠️: Parse failure
- Smooth transitions (200ms fade)

### Story 3.5: Trigger Validation Automatically After OCR Complete
- Auto-validate when row.ocrStatus changes to 'complete'
- Debounce: 500ms after OCR to batch rapid changes
- Validate downstream rows if upstream changes
- Manual trigger via double-tap row header

### Story 3.6: Handle Validation Errors and Timeouts
- 2-second timeout (inherited from existing CAS)
- Error types: parse failure, timeout, algebrite error
- Clear error messages for user
- Log full context for debugging

### Story 3.7: Ensure Non-Intrusive Feedback Updates
- Updates never trigger modal dialogs
- Animations don't disrupt drawing
- No frame drops during validation
- Feedback appears within 1s of OCR completion

---

## Epic 4: Inspection & Debugging

**Goal:** Enable transparency—users can see what was detected and why validation succeeded/failed.

**Stories:** 5

### Story 4.1: Implement Tap-to-Inspect Panel for Row Details
- Tap row status icon → panel appears
- Panel shows: detected LaTeX, previous row LaTeX, validation result
- Panel is non-modal (dismissible, doesn't block)
- Copy LaTeX to clipboard button

### Story 4.2: Add Debug Mode Toggle and Tile Boundary Overlay
- Toggle in header or toolbar
- When enabled: show tile boundaries as faint overlay on canvas
- Highlight tile boundaries for selected row
- Visualize overlap regions

### Story 4.3: Display Validation Method, Timing, and Canonical Forms
- In inspection panel when debugMode enabled
- Show: method used (canonicalization/algebrite), execution time, canonical forms
- Link to existing CAS debug infrastructure

### Story 4.4: Show Cache Hit/Miss Statistics
- Debug panel displays: OCR cache hits, validation cache hits
- Per-session statistics
- Help identify performance issues

### Story 4.5: Integrate with Existing Diagnostic Logging
- Log OCR events to existing logger.js
- Log validation events
- Accessible via Database page (existing feature)
- Include full context for troubleshooting

---

## Epic 5: Persistence & Workspace Integration

**Goal:** Ensure work is never lost and integrates seamlessly with existing Texo workspace system.

**Stories:** 6

### Story 5.1: Auto-Save Row State to IndexedDB on Changes
- Save on every row state change (debounced 2s)
- Store: row metadata, transcribed LaTeX, validation status
- Atomic writes to prevent corruption
- Schema versioning for future-proofing

### Story 5.2: Load Canvas State on Page Reload
- Restore canvas elements, row assignments, row statuses
- Load within 1s for typical canvas
- Handle corrupted state gracefully
- Reconstruct RowManager from saved state

### Story 5.3: Export Magic Canvas to Workspace Manager
- Export button in toolbar
- Format: JSON with vector paths + transcribed LaTeX
- Compatible with existing workspaceDB.js
- Include metadata: creation date, last modified

### Story 5.4: Load Previously Saved Magic Canvas Documents
- "Load Document" button
- Browse saved documents from workspace manager
- Preview before loading (thumbnail or description)
- Confirm overwrite if current canvas has unsaved changes

### Story 5.5: Track Storage Quota and Warn at 80%
- Monitor IndexedDB quota usage
- Warn user when approaching limit
- Suggest cleanup actions (clear cache, delete old documents)
- Prevent writes at 95% capacity

### Story 5.6: Manual Data Management (Clear Canvas, Clear Cache)
- "Clear Canvas" button with confirmation
- "Clear OCR Cache" in settings
- "Clear Validation Cache" in settings
- Display storage usage statistics

---

## Epic 6: Settings & User Control

**Goal:** Give users control over behavior, performance, and workflow customization.

**Stories:** 8

### Story 6.1: Create Floating Toolbar with Common Actions
- Toolbar buttons: Validate All, Clear All, Settings
- Auto-hide after 3s of inactivity
- Manual show/hide via button or gesture
- Minimalist design, non-intrusive

### Story 6.2: Implement Settings Panel for Configuration
- Row line spacing adjustment (100-500px)
- OCR debounce time (1-5s slider)
- Auto-validation toggle on/off
- Row height for OCR (default 384px)

### Story 6.3: Persist User Preferences in localStorage
- Save settings immediately on change
- Load on page mount
- Defaults: spacing 384px, debounce 1.5s, auto-validate on

### Story 6.4: "Validate All Rows" Action
- Button triggers validation of entire canvas
- Progress indicator for large canvases
- Respects existing cache (only revalidate if changed)
- Cancelable operation

### Story 6.5: "Clear Canvas" Action with Confirmation
- Modal confirmation dialog (destructive action)
- Option: "Save before clearing"
- Clears all elements and row state
- Resets to empty canvas

### Story 6.6: Display Clear Processing Indicators
- Never leave user wondering if system is working
- Consistent use of spinner icons
- Progress bars for long operations
- Estimated time remaining for batch operations

### Story 6.7: Cancel Long-Running OCR Operations
- "Cancel" button appears for operations >3s
- Aborts worker pool tiles
- Resets row to pending state
- Clean cancelation (no memory leaks)

### Story 6.8: Handle Rapid Input Gracefully
- No dropped strokes during rapid drawing
- Debouncing prevents excessive processing
- Queue management for worker pool
- Maintain 60fps canvas rendering

---

## FR Coverage Matrix

Complete mapping of all 98 functional requirements to epics and stories:

| FR# | Requirement Summary | Epic | Story |
|-----|---------------------|------|-------|
| FR1 | Access Magic Canvas page | Epic 1 | 1.1 |
| FR2 | Draw on infinite canvas | Epic 1 | 1.2 |
| FR3 | Display ruled lines | Epic 1 | 1.3 |
| FR4 | Customize row spacing | Epic 6 | 6.2 |
| FR5 | Pan vertically | Epic 1 | 1.2 |
| FR6 | Zoom in/out | Epic 1 | 1.2 |
| FR7 | Persist canvas state | Epic 1 | 1.7 |
| FR8 | Erase strokes | Epic 1 | 1.2 |
| FR9 | Undo/redo | Epic 1 | 1.2 |
| FR10 | Excalidraw tools | Epic 1 | 1.2 |
| FR11 | Auto-assign to rows | Epic 1 | 1.5 |
| FR12 | Stable row IDs | Epic 1 | 1.4 |
| FR13 | Row metadata tracking | Epic 1 | 1.4 |
| FR14 | Configurable row height | Epic 6 | 6.2 |
| FR15 | See row assignments | Epic 1 | 1.6 |
| FR16 | Track empty rows | Epic 1 | 1.4 |
| FR17 | Stable through transforms | Epic 1 | 1.7 |
| FR18 | Detect element changes | Epic 1 | 1.8 |
| FR19 | Auto-trigger OCR | Epic 2 | 2.7 |
| FR20 | Extract tiles | Epic 2 | 2.1 |
| FR21 | Overlapping tiles | Epic 2 | 2.1 |
| FR22 | Parallel processing | Epic 2 | 2.2 |
| FR23 | Progress indicators | Epic 2 | 2.3 |
| FR24 | Tile caching | Epic 2 | 2.4 |
| FR25 | FormulaNet compliance | Epic 2 | 2.1 |
| FR26 | Handle OCR failures | Epic 2 | 2.8 |
| FR27 | OCR status per row | Epic 2 | 2.3 |
| FR28 | Merge LaTeX fragments | Epic 2 | 2.5 |
| FR29 | Measure visual gaps | Epic 2 | 2.5 |
| FR30 | Insert spacing | Epic 2 | 2.5 |
| FR31 | Remove duplicates | Epic 2 | 2.5 |
| FR32 | Post-process cleanup | Epic 2 | 2.6 |
| FR33 | Valid LaTeX output | Epic 2 | 2.5 |
| FR34 | One expression per row | Epic 2 | 2.5 |
| FR35 | Multi-line expressions | Epic 2 | 2.5 |
| FR36 | Sequential validation | Epic 3 | 3.1 |
| FR37 | Use existing CAS | Epic 3 | 3.1 |
| FR38 | First row validates | Epic 3 | 3.1 |
| FR39 | Skip empty rows | Epic 3 | 3.1 |
| FR40 | Respect debugMode | Epic 3 | 3.3 |
| FR41 | Respect forceAlgebrite | Epic 3 | 3.3 |
| FR42 | Cache validation | Epic 3 | 3.2 |
| FR43 | Handle parse failures | Epic 3 | 3.6 |
| FR44 | Indicate method | Epic 3 | 3.3 |
| FR45 | Report timing | Epic 3 | 3.3 |
| FR46 | Manual validation | Epic 3 | 3.5 |
| FR47 | Display status icons | Epic 1 | 1.6 |
| FR48 | Green ✓ icon | Epic 3 | 3.4 |
| FR49 | Red ✗ icon | Epic 3 | 3.4 |
| FR50 | Yellow ⚠️ icon | Epic 3 | 3.4 |
| FR51 | Orange ⟳ icon | Epic 3 | 3.4 |
| FR52 | Gray ∅ icon | Epic 1 | 1.6 |
| FR53 | 44x44px tap targets | Epic 1 | 1.6 |
| FR54 | Tap to inspect | Epic 4 | 4.1 |
| FR55 | Smooth animations | Epic 3 | 3.7 |
| FR56 | Non-disruptive updates | Epic 3 | 3.7 |
| FR57 | No modal dialogs | Epic 3 | 3.7 |
| FR58 | Tap icon for LaTeX | Epic 4 | 4.1 |
| FR59 | Show detected vs previous | Epic 4 | 4.1 |
| FR60 | Debug Mode toggle | Epic 4 | 4.2 |
| FR61 | Tile boundaries overlay | Epic 4 | 4.2 |
| FR62 | Validation details | Epic 4 | 4.3 |
| FR63 | Cache statistics | Epic 4 | 4.4 |
| FR64 | View OCR logs | Epic 4 | 4.5 |
| FR65 | View validation logs | Epic 4 | 4.5 |
| FR66 | Non-modal panel | Epic 4 | 4.1 |
| FR67 | Auto-save to IndexedDB | Epic 5 | 5.1 |
| FR68 | Save vector + LaTeX | Epic 5 | 5.1 |
| FR69 | Load canvas state | Epic 5 | 5.2 |
| FR70 | Export to workspace | Epic 5 | 5.3 |
| FR71 | Export vector + LaTeX | Epic 5 | 5.3 |
| FR72 | Load saved documents | Epic 5 | 5.4 |
| FR73 | Track storage quota | Epic 5 | 5.5 |
| FR74 | Persist across sessions | Epic 5 | 5.1 |
| FR75 | Manual clear canvas | Epic 5 | 5.6 |
| FR76 | Adjust row spacing | Epic 6 | 6.2 |
| FR77 | Adjust debounce time | Epic 6 | 6.2 |
| FR78 | Toggle auto-validation | Epic 6 | 6.2 |
| FR79 | Configure row height | Epic 6 | 6.2 |
| FR80 | Persist preferences | Epic 6 | 6.3 |
| FR81 | Floating toolbar | Epic 6 | 6.1 |
| FR82 | Dismissible settings | Epic 6 | 6.2 |
| FR83 | Export as JSON | Epic 5 | 5.3 |
| FR84 | Copy LaTeX to clipboard | Epic 4 | 4.1 |
| FR85 | Workspace compatible | Epic 5 | 5.3 |
| FR86 | Clear all rows | Epic 6 | 6.5 |
| FR87 | Integrate IndexedDB | Epic 5 | 5.1 |
| FR88 | Reuse OCR worker | Epic 2 | 2.2 |
| FR89 | Reuse CAS | Epic 3 | 3.1 |
| FR90 | Reuse debug/logging | Epic 4 | 4.5 |
| FR91 | Floating toolbar actions | Epic 6 | 6.1 |
| FR92 | Toolbar auto-hide | Epic 6 | 6.1 |
| FR93 | Manual show/hide | Epic 6 | 6.1 |
| FR94 | Validate All action | Epic 6 | 6.4 |
| FR95 | Clear with confirmation | Epic 6 | 6.5 |
| FR96 | Processing indicators | Epic 6 | 6.6 |
| FR97 | Cancel operations | Epic 6 | 6.7 |
| FR98 | Handle rapid input | Epic 6 | 6.8 |

**Coverage Verification:** ✓ All 98 FRs mapped to stories

---

## Epic Summary

### Overall Breakdown

| Epic | Stories | Complexity | Priority |
|------|---------|------------|----------|
| Epic 1: Canvas Foundation | 8 | Medium | Must Have (MVP) |
| Epic 2: OCR Pipeline | 8 | High | Must Have (MVP) |
| Epic 3: Validation & Feedback | 7 | Medium | Must Have (MVP) |
| Epic 4: Inspection & Debug | 5 | Low | Should Have |
| Epic 5: Persistence | 6 | Low-Medium | Must Have (MVP) |
| Epic 6: Settings & Control | 8 | Low | Should Have |
| **Total** | **42 stories** | **Mixed** | **MVP: 29 stories** |

### Implementation Estimates

**MVP Scope (Epics 1, 2, 3, 5):**
- **Stories:** 29
- **Estimated Time:** 15-20 developer days (experienced React/TS developer)
- **Story Breakdown:** Average 4-6 hours per story
- **Critical Path:** Epic 1 → Epic 2 → Epic 3 (Epics 5 can overlap)

**Post-MVP (Epics 4, 6):**
- **Stories:** 13
- **Estimated Time:** 5-7 developer days
- **Lower complexity:** Primarily UI polish and configuration

### Key Technical Challenges

1. **Tile Merging Algorithm (Epic 2):** Novel, requires testing with real handwriting corpus
2. **Worker Pool Management (Epic 2):** Parallel processing coordination, error handling
3. **Real-Time Performance (Epic 1, 2, 3):** Meeting <3s total latency target consistently
4. **State Synchronization (Epic 1, 5):** Keeping RowManager, Excalidraw, IndexedDB in sync

### Dependencies on Existing Texo Infrastructure

**High Reuse (>80% leveraged):**
- ✓ Excalidraw integration patterns (`SketchPage.jsx`)
- ✓ OCR worker (`ocrWorker.js`, `imageProcessor.js`)
- ✓ CAS (`equivalenceChecker.js`, `katexParser.js`, rule engine)
- ✓ IndexedDB (`workspaceDB.js`, `indexedDBCache.js`)
- ✓ Logging (`logger.js`)
- ✓ Debug context (`DebugContext.jsx`)

**New Components (20%):**
- RowManager class and row system
- OCR tiling logic (`ocrTiling.js`)
- Worker pool (`ocrWorkerPool.js`)
- LaTeX assembly (`latexAssembly.js`)
- Post-processor (`ocrPostProcessor.js`)

---

## Next Steps in BMad Method Workflow

**This epic breakdown is complete and ready for Architecture Design.**

### Recommended Sequence:

1. **Architecture Workflow (Highly Recommended)**
   - Run: `/bmad:bmm:workflows:create-architecture`
   - Design: RowManager data structures, OCR pipeline flow, tile merging algorithms
   - Document: IndexedDB schema, worker communication patterns, integration points
   - Update: Add technical decisions to story notes in this epics.md file

2. **Validate PRD + Epics Cohesion (Optional)**
   - Run: `/bmad:bmm:workflows:validate-prd`
   - Verify all PRD requirements covered by stories
   - Check for contradictions or gaps

3. **Gate Check (Required Before Implementation)**
   - Run: `/bmad:bmm:workflows:solutioning-gate-check`
   - Validates PRD + Epics + Architecture are cohesive
   - Confirms technical feasibility
   - Ensures readiness for Phase 4 implementation

4. **Sprint Planning (Phase 4 Entry Point)**
   - Run: `/bmad:bmm:workflows:sprint-planning`
   - Creates sprint-status.yaml tracking file
   - Sequences stories for implementation
   - Begins Phase 4: Implementation

---

_Epic breakdown completed: 2025-11-13_
_Total: 6 epics, 42 stories, 98 FRs covered_
_Next: Architecture design to add technical specifications to stories_
