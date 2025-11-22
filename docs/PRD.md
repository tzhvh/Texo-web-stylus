# Texo-web-stylus - Product Requirements Document

**Author:** BMad
**Date:** 2025-11-13
**Version:** 1.0

---

## Executive Summary

**Vision:** Transform Texo-web-stylus into a mindful mathematical note-taking experience by creating a unified infinite canvas where users can handwrite mathematical expressions with automatic OCR transcription and real-time sequential equivalence validation. Each handwritten line is silently transcribed to LaTeX and validated against the previous line, with instant visual feedback directly on the canvas.

This enhancement bridges the gap between the existing sketch-based OCR and the sequential CAS checking, creating a seamless "write and validate" workflow that encourages deliberate mathematical thinking rather than speedrunning through problems.

**Core Philosophy:** "Slow down and immerse in the math" - technology that stays invisible during flow state but provides instant, gentle correction when steps go wrong.

### What Makes This Special

**Mindful Mathematics Through Technology**

Unlike traditional digital math tools that either distract with UI chrome or offer no validation, this unified canvas creates a paper-like experience enhanced with silent intelligence. Users write naturally with a stylus, and the system:

1. **Transcribes silently** - OCR happens in the background without interrupting flow
2. **Validates automatically** - Each line checks against the previous for mathematical equivalence
3. **Signals gently** - Colored symbols appear on the canvas (✓ green for correct, ✗ red for errors)
4. **Encourages mindfulness** - Ambiguous cases require re-writing, promoting careful notation

This isn't about speed or automation - it's about **deep engagement with mathematical problem-solving**, where technology amplifies understanding rather than replacing it.

---

## Project Classification

**Technical Type:** Web App (SPA enhancement - new page/feature)
**Domain:** Educational Technology / Scientific Computing
**Complexity:** Medium-High
**Project Nature:** Brownfield enhancement to existing Texo-web-stylus application

**Classification Details:**

This is a **major feature addition** to the existing Texo-web-stylus web application. It combines:
- Real-time handwriting capture (Excalidraw infinite canvas)
- Intelligent OCR tiling and processing (extends existing OCR pipeline)
- Sequential mathematical validation (extends existing CAS system)
- Workspace persistence (integrates with existing IndexedDB system)

The feature is complex due to:
- **Spatial reasoning:** Intelligent tiling with overlap, scaling, and boundary detection
- **Real-time performance:** OCR and validation must feel instant (worker pools, caching)
- **Mathematical accuracy:** Unit detection prevents mis-parsing of separated symbols
- **User experience:** Silent operation with non-intrusive feedback

---

## Success Criteria

**Primary Goal: Preserve Flow State**

Success means a user can enter deep focus on mathematical problem-solving and stay there for an entire multi-step problem without breaking concentration. The tool becomes invisible - it's just you, the math, and instant feedback when something goes wrong.

**Key Success Metrics:**

1. **Flow State Preservation**
   - User completes 10+ step problems without looking away from canvas
   - No modal dialogs, popups, or UI interruptions during normal operation
   - Transcription and validation happen silently in background
   - Feedback is ambient (colored symbols on canvas, not alerts)

2. **Fail Fast to Progress Faster**
   - Validation completes within 2-3 rows of the error
   - If user makes mistake on row N, they receive feedback before completing row N+3
   - This prevents "wasting 20 minutes on a problem only to discover step 3 was wrong"
   - Users spend less time doubting themselves and re-reading

3. **Transparent Intelligence ("It should feel like magic but users can verify the rationale")**
   - Users can inspect transcribed LaTeX for any row
   - Failure cases show both transcribed LaTeX and validation reason
   - Debug mode reveals tile boundaries, merging decisions, validation method
   - Glyph-level feedback possible (map AST nodes to specific handwritten strokes)

4. **Technical Performance**
   - OCR tile extraction + transcription: <2 seconds per row (average)
   - Validation: <1 second (leveraging existing fast-path CAS)
   - Combined latency: User gets feedback within 3 seconds of finishing a row
   - Cache hit rate: >70% on repeated expressions (leverage existing cache)
   - Tile merge accuracy: >95% produce valid, parseable LaTeX

5. **Differentiation from Alternatives**
   - **vs. ChatGPT Camera:** Continuous validation during writing, not snapshot-based post-hoc checking
   - **vs. Paper:** Instant correctness feedback without separate checker
   - **vs. Existing Texo pages:** Unified workflow (no copy/paste between Sketch → Compose)
   - **vs. WolframAlpha/Symbolab:** Integrated into note-taking, not separate tool

**Success Scenarios:**

- **Algebra student:** Solves quadratic equation in 8 steps, gets instant red ✗ on step 4 where they dropped a negative sign, erases and corrects within 30 seconds, completes problem successfully
- **Calculus student:** Works through u-substitution integral, validation catches incorrect bounds transformation, student reviews transcribed LaTeX, understands error, rewrites clearly
- **Educator:** Demonstrates problem on tablet during lecture, validation confirms each step in real-time, students see colored feedback instantly

**What We're NOT Optimizing For:**

- Speed: Deliberately encouraging slowness and mindfulness
- Automation: Not trying to solve problems for users
- Ambiguity resolution: If OCR can't confidently parse, user should rewrite (good for learning)

---

## Product Scope

### MVP - Minimum Viable Product

**Core User Experience:**
- **Magic Canvas page** (`src/pages/MagicCanvas.jsx`) accessible from main navigation
- **Infinite vertical canvas** with ruled horizontal lines (customizable spacing, default 100px guides, 384px OCR row height)
- **Automatic row detection** - system assigns strokes to rows based on Y-coordinate
- **Silent OCR transcription** - triggered 1.5s after last stroke in a row
- **Sequential validation** - each row validated against previous row using existing CAS
- **Ambient visual feedback** - colored ✓ (green) or ✗ (red) symbols appear on canvas at row edge
- **Workspace persistence** - row data (vector strokes + transcribed LaTeX) saved to IndexedDB
- **Export capability** - save canvas to workspace manager for later retrieval

**OCR Pipeline (MVP):**
- **Overlapping tile extraction** - split wide rows into 384x384 tiles with 10-20% overlap
- **Worker pool** - parallel OCR processing with progress indication per tile
- **Basic LaTeX merging** - combine tile fragments with spacing heuristics (measure visual gaps, remove duplicate operators)
- **Tile-level caching** - avoid re-OCR of unchanged tiles (hash-based)
- **Post-processing** - basic cleanup of common OCR artifacts

**Row System (MVP):**
- **RowManager class** - tracks rows, assigns elements, maintains state
- **Row metadata** - ID, Y-position, element IDs, OCR status, validation status, transcribed LaTeX
- **Auto-assignment** - elements automatically assigned to row on creation
- **Row persistence** - state survives pan/zoom/reload
- **Row status indicators** - pending, transcribing, validating, validated, error

**Validation Integration (MVP):**
- **Leverage existing CAS** - use `checkEquivalence()` from `src/cas/equivalenceChecker.js`
- **Row-by-row validation** - validate row N against row N-1, skip empty rows
- **Respect user settings** - honor debugMode, forceAlgebrite from existing system
- **Cache validation results** - key: `row:${prevId}:${currId}`, leverage existing IndexedDB cache
- **Handle parse failures** - show ⚠️ icon for unparseable LaTeX

**Debug Capabilities (MVP):**
- **Inspect row** - tap row header to see transcribed LaTeX
- **Debug mode toggle** - existing debugMode shows validation method, timing, canonical forms
- **Basic logging** - OCR events, validation events logged to existing diagnostic system

**Performance Targets (MVP):**
- OCR latency: <2s per row (with worker pool parallelization)
- Validation latency: <1s per row (fast-path canonicalization)
- Total feedback time: <3s from last stroke to visual feedback
- Debounce: 1.5s after last stroke before triggering OCR

---

### Growth Features (Post-MVP)

**Intelligent Tiling:**
- **Dissimilar tile dimensions** - detect long fractions, wide expressions; use extra-wide logical tiles scaled down to 384x384
- **Adaptive scaling** - scale tiles to fit model input while preserving aspect ratio and padding
- **Boundary-aware splitting** - detect "calm points" (e.g., after operators, between terms) for smarter tile boundaries
- **Heuristic tile sizing** - analyze expression structure before tiling

**Unit Detection & Parsing:**
- **Symbol grouping** - detect separated exponents, radicals, limits, integrals that shouldn't be OCR'd independently
- **First-line defense** - validate that tiles contain "self-contained" mathematical units before OCR
- **Boundary refinement** - adjust tile boundaries to avoid splitting units
- **Multi-character operators** - handle `\lim`, `\int`, `\sum` that may span multiple tiles

**Glyph-Level Feedback:**
- **AST → Stroke mapping** - extend existing `spatialMapping.js` to map AST nodes to Excalidraw elements
- **Highlight specific errors** - colorize specific strokes (e.g., red tint on the exponent that's wrong)
- **Interactive correction** - tap highlighted stroke to see what was detected vs. what was expected

**Row Operations:**
- **Manual validation trigger** - double-tap row header to force immediate validation
- **Row clearing** - keep row structure, delete content (gesture or button)
- **Row locking** - prevent editing of validated rows
- **Row duplication** - copy entire row (useful for "try again" workflows)
- **Row selection** - tap row header to select all elements in row
- **Undo/redo integration** - revert row status on undo

**Advanced Debug Panel:**
- **Collapsible panel** showing:
  - Tile boundaries overlay on canvas
  - LaTeX per tile (before merge)
  - Merged LaTeX
  - Validation method used
  - Cache hit rates
  - Timing breakdown (extraction, OCR, merge, validation)
- **Performance.measure() markers** for profiling
- **Circuit breaker** - pause auto-validation if average time exceeds threshold (5s)

**Validation Enhancements:**
- **Validation settings panel:**
  - Toggle auto-validate on/off
  - Adjust debounce time (1-5s slider)
  - Set max rows to validate per trigger
- **Dependency tracking** - validate downstream rows when upstream row changes
- **"Ignore in validation" option** - skip certain rows (e.g., notes, diagrams)
- **Validation shortcuts** - keyboard shortcuts (e.g., Ctrl+Enter to validate selected row)
- **Validation queue management** - show pending validations, cancel stale validations

**UX Polish:**
- **Floating toolbar** - Validate All, Clear All, Settings (minimalist, auto-hide)
- **Loading indicators** - spinner on row header during transcription/validation
- **Smooth animations** - subtle pulse during validation, fade-in for feedback icons
- **Configurable row height** - adjust to user preference or device resolution
- **Snap-to-row behavior** - optional stroke alignment to row boundaries
- **Row versioning** - conflict resolution for concurrent edits (future multiplayer)

---

### Vision (Future)

**Advanced Tiling Research:**
- **ML-based tile segmentation** - train model to identify optimal tile boundaries based on expression structure
- **Hierarchical tiling** - detect sub-expressions, tile recursively
- **Restorative super-resolution** - upscale low-resolution handwriting before OCR

**Model Flexibility:**
- **Drop-in OCR model support** - abstracted interface allows swapping FormulaNet for other models
- **Model parameter configuration** - avoid hardcoding 384x384, make dimensions configurable
- **Multi-model ensemble** - use multiple OCR models, merge results for higher accuracy

**Multi-Sheet & Collaboration:**
- **Multiple problem sheets** - concurrent sheets on same canvas with isolated validation chains
- **Shared canvas** - real-time collaborative problem-solving with per-user color coding
- **Historical replay** - scrub timeline to watch problem-solving process
- **Annotations** - add non-validated text, arrows, diagrams alongside math

**Export & Integration:**
- **Publication-ready PDF** - export canvas with LaTeX typesetting
- **Markdown export** - convert canvas to markdown with embedded LaTeX
- **Integration with external CAS** - send to WolframAlpha, Mathematica, SymPy for deeper analysis
- **Print-friendly layouts** - format for paper printouts with QR codes linking back to digital version

**Learning & Analytics:**
- **Error pattern detection** - identify common mistake types (e.g., "often drops negative signs")
- **Progress tracking** - show improvement over time (accuracy, speed, problem complexity)
- **Personalized hints** - suggest reviewing specific concepts based on error patterns
- **Adaptive difficulty** - recommend next problem based on performance

**Accessibility & Localization:**
- **Multi-language math notation** - support regional notation differences (decimal comma, etc.)
- **Screen reader support** - read transcribed LaTeX aloud with math-aware TTS
- **Keyboard-only mode** - navigate and control canvas without stylus (for accessibility)
- **High-contrast themes** - support for visual impairments

---

## Web Application Specific Requirements

**Browser Compatibility:**
- Modern browsers with Web Workers, IndexedDB, and Canvas API support
- Tested on: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile browsers: iOS Safari 14+, Chrome Android 90+
- **Primary target:** Tablet devices with stylus (iPad Pro, Surface Pro, Galaxy Tab)
- **Secondary target:** Desktop with mouse/trackpad (reduced experience)

**Progressive Web App (PWA) Characteristics:**
- Leverage existing Texo PWA infrastructure
- Offline-capable after first model download (FormulaNet ~150MB cached)
- Magic Canvas page works offline with cached model and CAS
- Service worker caches page assets
- Installable as standalone app on mobile/desktop

**Performance & Optimization:**
- **Bundle size:** Minimize increase (<100KB for new page, reuse existing libraries)
- **Lazy loading:** Magic Canvas page loads only when accessed
- **Web Workers:** Reuse existing OCR worker, extend with worker pool
- **Memory management:**
  - Limit number of concurrent OCR operations (worker pool size = 3-4)
  - Garbage collect completed row data after export
  - Monitor IndexedDB quota, warn at 80% capacity
- **Rendering:**
  - Leverage Excalidraw's optimized canvas rendering
  - Debounce validation decorations to avoid render thrashing
  - Use RAF (requestAnimationFrame) for smooth feedback animations

**State Management:**
- **Hybrid approach** (consistent with existing Texo architecture):
  - **Context:** Global debug mode, validation settings (existing DebugContext)
  - **Component state:** Row manager, canvas state (local to MagicCanvas)
  - **IndexedDB:** Row persistence, OCR cache, validation cache (new stores)
  - **localStorage:** User preferences (row height, auto-validate on/off)
- **New IndexedDB stores:**
  - `magic-canvas-rows`: Row metadata and state
  - `ocr-tile-cache`: Hashed tile → LaTeX fragment mappings
  - `magic-canvas-workspaces`: Saved canvases (vector + LaTeX)

**Integration with Existing Texo Infrastructure:**
- **Reuse OCR pipeline:** Extend `workers/ocrWorker.js` with tiling logic
- **Reuse CAS:** Call `src/cas/equivalenceChecker.js` directly
- **Reuse cache:** Leverage `src/utils/indexedDBCache.js` for validation caching
- **Reuse logging:** Use `src/utils/logger.js` for diagnostic events
- **Reuse workspace system:** Integrate with `src/utils/workspaceDB.js` for export
- **Reuse debug context:** Use existing `src/contexts/DebugContext.jsx`

**Responsive Design:**
- **Primary layout:** Full-screen canvas (hide most UI chrome)
- **Mobile optimization:**
  - Toolbar auto-hides after 3s of inactivity
  - Row height adjusts to screen size (min 300px, max 500px)
  - Touch-friendly feedback icons (min 44x44px tap targets)
- **Desktop adaptation:**
  - Keyboard shortcuts for common actions
  - Mouse gestures less natural than stylus (document this limitation)
  - Side panel option for debug/settings (larger screens)

**File Structure (New Components):**
```
src/
├── pages/
│   └── MagicCanvas.jsx              # Main page component
├── hooks/
│   ├── useRowSystem.js              # Row state management hook
│   ├── useAutoValidation.js         # Auto-validation orchestration
│   └── useOCRPipeline.js            # OCR tiling + merging
├── utils/
│   ├── ocrTiling.js                 # Tile extraction logic
│   ├── latexAssembly.js             # Fragment merging
│   ├── visualFeedback.js            # Canvas decoration helpers
│   ├── ocrPostProcessor.js          # LaTeX cleanup
│   └── rowManager.js                # RowManager class
├── workers/
│   └── ocrWorkerPool.js             # Worker pool manager
└── components/
    ├── RowHeader.jsx                # Row UI (status indicator)
    ├── ValidationFeedback.jsx       # ✓/✗ icons on canvas
    └── MagicCanvasToolbar.jsx       # Minimal floating toolbar
```

---

## Innovation & Novel Patterns

**What's Genuinely Novel:**

1. **Silent Continuous Validation During Writing**
   - Unlike all existing math tools, validation happens silently and continuously while the user writes
   - Not snapshot-based (ChatGPT camera) - it's real-time during flow
   - Not manual (WolframAlpha) - no copy/paste/submit cycle
   - Not post-hoc (traditional homework checking) - instant feedback within 2-3 rows

2. **Intelligent Overlapping Tile System**
   - Addresses fundamental OCR model limitation (fixed 384x384 input)
   - Overlapping tiles + restorative merging is novel in math OCR context
   - Heuristic boundary detection prevents mid-symbol splitting
   - Handles variable-width expressions gracefully

3. **Glyph-Level Mathematical Feedback (Growth Feature)**
   - Mapping AST nodes to specific handwritten strokes is unprecedented
   - Enables "highlight exactly which part is wrong" in handwriting
   - Combines spatial reasoning with symbolic mathematics
   - If implemented well, this would be a research-worthy contribution

4. **Mindful Technology Philosophy**
   - Deliberately anti-speed, pro-engagement
   - Ambiguous cases → user rewrites (feature, not bug)
   - "Technology that stays invisible during flow state"
   - Counters trend of automating everything

**Validation Approach:**

**Technical Validation:**
- **MVP:** Build and test core pipeline (tile extraction → OCR → merge → validate)
- **Metrics:** Measure tile merge accuracy, validation latency, cache hit rates
- **Datasets:** Test with corpus of handwritten algebra/calculus problems
- **Edge cases:** Long fractions, matrices, multi-line equations, unusual notation

**User Validation:**
- **Alpha testing:** Internal testing with variety of handwriting styles
- **Beta testing:** 10-20 students solving real homework problems
- **Success criteria:** Can users stay in flow state for full problem? Does validation catch errors within 2-3 rows?
- **Iteration:** Refine debounce timing, feedback styling, row height based on feedback

**Novel Components - Research Opportunities:**
- **If glyph-level feedback succeeds:** Consider publishing methodology
- **If intelligent tiling proves robust:** Contribute back to OCR research community
- **If flow-state preservation validated:** Document UX patterns for math education tools

---

## User Experience Principles

**Design Philosophy: Invisible Until Needed**

Magic Canvas follows a **minimalist, flow-preserving** design approach where the interface disappears during use, allowing users to focus entirely on the mathematics. The system should feel like enhanced paper, not like software.

**Core UX Principles:**

1. **No Interruptions**
   - No modal dialogs during normal operation
   - No alerts, popups, or confirmation prompts unless destructive action
   - Feedback is ambient (icons on canvas) not intrusive (alerts)
   - Processing happens silently in background

2. **Progressive Disclosure**
   - Default view: Just canvas with subtle row lines
   - Toolbar auto-hides after 3s of inactivity
   - Debug panel hidden by default, revealed on demand
   - Settings accessible but not prominent

3. **Ambient Awareness**
   - Row status communicated through subtle visual cues (colored icons at row edge)
   - Progress indicators (spinner) small and non-distracting
   - Colors have meaning: Green = correct, Red = incorrect, Orange = processing, Gray = pending, Yellow = warning
   - No text labels on canvas (icons only)

4. **Gestural, Not Button-Heavy**
   - Primary interaction: Just draw
   - Tap row header to inspect (show LaTeX)
   - Double-tap row header to force validation
   - Swipe row header to reveal operations (future)
   - Minimal clicking/tapping outside of drawing

5. **Forgiving and Transparent**
   - User can always inspect what system detected (tap to see LaTeX)
   - Undo works naturally (reverts row status)
   - Clear indication of system state (pending/processing/complete)
   - No "black box" decisions - everything is inspectable

6. **Performance as UX**
   - Fast feedback = better flow state
   - Visual progress indicators for slow operations (OCR >1s)
   - Debouncing prevents "jumpy" validation during writing
   - Cache hits feel instant

**Key Interaction Flows:**

**Flow 1: Normal Problem Solving (Happy Path)**
1. User opens Magic Canvas
2. Starts writing first equation - canvas accepts strokes
3. After finishing line, waits 1.5s, then small progress indicator appears at row edge
4. ~2s later, green ✓ appears (first row, no validation needed)
5. User writes second line
6. After 1.5s pause, processing begins
7. ~3s total: Either green ✓ (equivalent) or red ✗ (not equivalent) appears
8. User continues to next line or corrects error
9. Repeat for entire problem

**Flow 2: Error Correction**
1. User writes row N, gets red ✗
2. User taps red ✗ to inspect transcribed LaTeX
3. Small panel shows: "Detected: x^2 + 3x + 4" and "Previous: x^2 + 2x + 4"
4. User realizes error (wrote 3 instead of 2)
5. User erases strokes in that row
6. Rewrites correctly
7. After pause, validation re-runs, green ✓ appears

**Flow 3: Debug Inspection**
1. User enables Debug Mode (toggle at top)
2. Canvas now shows tile boundaries as faint overlays
3. Tapping row shows extended info: validation method, timing, canonical forms
4. Debug panel (side) shows performance metrics

**Visual Language:**
- **Icons:**
  - ✓ (green): Mathematically equivalent to previous row
  - ✗ (red): Not equivalent, check work
  - ⚠️ (yellow): Could not parse LaTeX, rewrite more clearly
  - ⟳ (orange, spinning): Transcription or validation in progress
  - ∅ (gray): Row empty or pending
- **Row Lines:** Subtle gray horizontal rules (customizable spacing)
- **Feedback Position:** Icons always at far right edge of row, vertically centered
- **Tint/Highlighting:** Validated rows can have subtle background tint (optional in settings)

---

## Functional Requirements

**Critical Note:** This section defines WHAT capabilities the Magic Canvas feature must have. These FRs are the complete inventory of capabilities that will be implemented. Missing FRs = missing capabilities in the final product.

**Organization:** FRs are grouped by capability area and numbered sequentially across all groups.

---

### Canvas & Drawing Capabilities

**FR1:** Users can access Magic Canvas page from main navigation

**FR2:** Users can draw on an infinite vertical canvas with stylus or mouse

**FR3:** Canvas displays horizontal ruled lines as visual guides for row boundaries

**FR4:** Users can customize row line spacing (default 100px, adjustable in settings)

**FR5:** Users can switch between rows using gestures (swipe up/down) or keyboard (arrow keys)

**FR6:** Users can zoom in/out on canvas (zoom only, no pan)

**FR7:** Canvas state (zoom level, pan position) persists across page reloads

**FR8:** Users can erase individual strokes or selections

**FR9:** Users can undo/redo drawing actions

**FR10:** Canvas supports Excalidraw's native drawing tools (pen, highlighter, shapes, text)

---

### Row System Capabilities

**FR11:** Only the active row is editable; all other rows are read-only

**FR12:** Each row has a stable unique ID that persists across pan/zoom/reload

**FR13:** System maintains row metadata including Y-position, active status, OCR status, validation status, and transcribed LaTeX

**FR14:** Row height for OCR processing is configurable (default 384px)

**FR15:** Active row is visually distinct with highlighted border or background

**FR16:** Empty rows (no content) are tracked but skipped during validation

**FR17:** System tracks row activation timeline for OCR attribution and erase operations

**FR18:** Users can activate a different row by tapping it, swiping vertically, or using arrow keys

**FR19:** When row activation changes, OCR is triggered on the previously active row (debounced 1.5s)

**FR20:** Users can create new rows below the current active row via button or gesture

**FR21:** Read-only rows display strokes in a dimmed or locked visual state

**FR22:** Erase operations only affect strokes in the currently active row

**FR23:** Viewport automatically scrolls to center active row when switching to off-screen rows

---

### OCR & Transcription Capabilities

**FR24:** System automatically triggers OCR transcription when row is deactivated (user switches to different row)

**FR25:** OCR trigger is debounced 1.5 seconds after row deactivation

**FR26:** System extracts tiles from rows for OCR processing

**FR27:** Tile extraction creates overlapping 384x384 tiles with 10-20% overlap

**FR28:** Multiple tiles from single row are processed in parallel via worker pool

**FR29:** System displays per-tile progress indicators during OCR processing

**FR30:** System caches OCR results per tile using content hash to avoid re-processing unchanged tiles

**FR31:** OCR processing respects FormulaNet model input requirements (384x384 grayscale images)

**FR32:** System handles OCR failures gracefully and reports errors to user

**FR33:** Users can see OCR processing status per row (pending, processing, complete, error)

---

### LaTeX Assembly Capabilities

**FR34:** System merges LaTeX fragments from multiple tiles into single expression per row

**FR35:** Merging algorithm measures visual gaps between tile boundaries

**FR36:** System inserts appropriate spacing in merged LaTeX based on gap size

**FR37:** System removes duplicate operators at tile seams (e.g., "+ +" becomes "+")

**FR38:** Merged LaTeX undergoes post-processing cleanup for common OCR artifacts

**FR39:** System produces valid, parseable LaTeX from merged fragments

**FR40:** Each row contains exactly one LaTeX expression after merging (even if sourced from multiple tiles)

**FR41:** System handles multi-line expressions that span tiles (rare edge cases)

---

### Validation Capabilities

**FR42:** System validates each row's LaTeX expression against the previous non-empty row

**FR43:** Validation uses existing CAS equivalence checker (`checkEquivalence()`)

**FR44:** First row in canvas automatically validates as correct (no previous row to compare)

**FR45:** Validation skips empty rows when finding previous row for comparison

**FR46:** Validation respects user's debugMode setting from existing DebugContext

**FR47:** Validation respects user's forceAlgebrite setting from existing DebugContext

**FR48:** Validation results are cached using key `row:${prevId}:${currId}` to avoid redundant checks

**FR49:** System handles LaTeX parse failures during validation and marks row as error state

**FR50:** Validation indicates which method was used (canonicalization, algebrite-difference, algebrite-simplify)

**FR51:** Validation reports timing information for performance monitoring

**FR52:** Users can manually trigger validation for specific row via gesture (double-tap row header)

---

### Visual Feedback Capabilities

**FR53:** System displays colored status icons at right edge of each row after processing

**FR54:** Green ✓ icon indicates row is mathematically equivalent to previous row

**FR55:** Red ✗ icon indicates row is NOT equivalent to previous row (error detected)

**FR56:** Yellow ⚠️ icon indicates LaTeX could not be parsed (rewrite needed)

**FR57:** Orange ⟳ (spinning) icon indicates processing in progress (OCR or validation)

**FR58:** Gray ∅ icon indicates row is empty or pending processing

**FR59:** Icons are positioned at row edge, vertically centered, with minimum 44x44px tap target

**FR60:** Users can tap status icon to inspect detailed information

**FR61:** Processing indicators appear smoothly with fade-in animations

**FR62:** Feedback updates happen without disrupting user's current drawing

**FR63:** System never displays modal dialogs or alerts during normal validation operation

---

### Inspection & Debug Capabilities

**FR64:** Users can tap row status icon to view transcribed LaTeX for that row

**FR65:** Inspection panel shows detected LaTeX and previous row's LaTeX (if applicable)

**FR66:** Users can enable Debug Mode via toggle to see extended diagnostic information

**FR67:** Debug Mode reveals tile boundaries as overlay on canvas

**FR68:** Debug Mode shows validation method, timing, and canonical forms for each row

**FR69:** Debug Mode displays cache hit/miss information

**FR70:** Users can view OCR processing logs via existing diagnostic logging system

**FR71:** Users can view validation logs via existing diagnostic logging system

**FR72:** Inspection panel is dismissible and non-modal (doesn't block other actions)

---

### Persistence & Workspace Capabilities

**FR73:** Row state automatically saves to IndexedDB on changes

**FR74:** Row state includes active row ID, activation timeline, and transcribed LaTeX per row

**FR75:** Canvas state loads from IndexedDB on page reload

**FR76:** Users can export Magic Canvas document to workspace manager

**FR77:** Exported documents include both vector data and transcribed LaTeX

**FR78:** Users can load previously saved Magic Canvas documents from workspace manager

**FR79:** System tracks storage quota usage and warns at 80% capacity

**FR80:** Row data persists across browser sessions

**FR81:** Users can manually clear row data for specific canvas

---

### Settings & Configuration Capabilities

**FR82:** Users can adjust row line spacing in settings

**FR83:** Users can adjust OCR debounce time (default 1.5s, range 1-5s)

**FR84:** Users can toggle auto-validation on/off

**FR85:** Users can configure row height for OCR processing

**FR86:** User preferences persist in localStorage across sessions

**FR87:** Users can access settings via minimalist floating toolbar

**FR88:** Settings panel is dismissible and doesn't interrupt flow

---

### Export & Integration Capabilities

**FR89:** Users can export canvas as JSON with vector paths and LaTeX

**FR90:** Users can copy transcribed LaTeX for specific row to clipboard

**FR91:** Exported documents are compatible with existing Texo workspace manager

**FR92:** Users can clear all rows while keeping canvas structure intact

**FR93:** System integrates with existing IndexedDB infrastructure (reuses stores where applicable)

**FR94:** System reuses existing OCR worker infrastructure

**FR95:** System reuses existing CAS and validation infrastructure

**FR96:** System reuses existing debug context and logging infrastructure

---

### User Control & Management Capabilities

**FR97:** Users can access floating toolbar with common actions (Validate All, Clear All, Settings)

**FR98:** Toolbar auto-hides after 3 seconds of inactivity to preserve clean canvas

**FR99:** Users can manually show/hide toolbar via gesture or button

**FR100:** Users can trigger "Validate All Rows" action to force validation of entire canvas

**FR101:** Users can clear entire canvas with confirmation dialog (destructive action)

**FR102:** Users receive clear visual indication when system is processing (not frozen)

**FR103:** Users can cancel long-running OCR operations if needed

**FR104:** System handles rapid row switching gracefully without dropping OCR or validation requests

---

**Functional Requirements Summary:**
- **Total FRs:** 104 (updated from 98)
- **Capability Areas:** 10
- **Coverage:** Canvas interaction, row management (single-active-row model), OCR pipeline, validation integration, visual feedback, debugging, persistence, settings, export, user control
- **Architectural Model:** Single-active-row with activation timeline (simplified from auto-assignment)

**Self-Validation Checklist:**
✓ Covered all MVP capabilities from scope section
✓ Covered integration with existing Texo infrastructure
✓ Covered single-active-row interaction model
✓ Covered row switching, activation timeline, and read-only enforcement
✓ Each FR is testable and implementation-agnostic
✓ Each FR describes WHAT, not HOW
✓ All capability areas from user's detailed specification are represented
✓ Updated to reflect architectural pivot approved 2025-11-21

---

## Non-Functional Requirements

### Performance

**Critical for Flow State Preservation**

**NFR-P1: OCR Latency**
- Target: <2 seconds per row (average)
- Measured from: OCR trigger to transcribed LaTeX available
- Constraint: Must use worker pool parallelization (3-4 workers)
- Rationale: Users should get feedback within 2-3 rows of error (3s * 3 rows = ~9s total acceptable delay)

**NFR-P2: Validation Latency**
- Target: <1 second per row (average)
- Measured from: LaTeX available to validation result
- Constraint: Leverage existing fast-path CAS (canonicalization)
- Rationale: Contributes to 3-second total feedback goal

**NFR-P3: Combined Feedback Latency**
- Target: <3 seconds from last stroke to visual feedback
- Includes: 1.5s debounce + OCR + validation + rendering
- Success criteria: 90th percentile <4 seconds, 50th percentile <3 seconds
- Rationale: Critical for "fail fast to progress faster" philosophy

**NFR-P4: Cache Performance**
- Target: Cache hit rate >70% for validation, >60% for OCR tiles
- Cache lookup: <1ms for hit, <5ms for miss
- Cache size: Monitor and limit to reasonable IndexedDB quota usage
- Rationale: Repeated expressions should feel instant

**NFR-P5: UI Responsiveness**
- Canvas rendering: Maintain 60fps during drawing (16ms frame budget)
- Debouncing: No "jank" or dropped frames during rapid input
- Feedback animations: Smooth fade-in/out (<200ms transitions)
- Rationale: Any lag breaks flow state

**NFR-P6: Memory Efficiency**
- Worker pool: Maximum 3-4 concurrent OCR operations
- Canvas: Garbage collect off-screen elements if >1000 total elements
- Cache: Implement LRU eviction when approaching IndexedDB quota
- Rationale: Prevent memory bloat during long sessions

**NFR-P7: Startup Time**
- Magic Canvas page loads: <500ms (lazy loaded, not in main bundle)
- First draw response: <100ms after page load
- Model loading (first time): Display progress, allow cancellation
- Rationale: Immediate responsiveness establishes trust

---

### Security & Privacy

**Consistent with Texo's Privacy-First Philosophy**

**NFR-S1: Client-Side Processing**
- All OCR processing happens in browser (Web Workers)
- All validation happens in browser (existing CAS)
- Zero network requests during normal operation (except initial model download)
- Rationale: Maintain Texo's core privacy guarantee

**NFR-S2: Data Persistence**
- Row data stored only in IndexedDB (client-side)
- No cloud backup or synchronization in MVP
- User can manually export/import data
- Rationale: User maintains complete control of their work

**NFR-S3: Data Isolation**
- Each workspace isolated in IndexedDB
- Canvas data not shared between workspaces
- Clear separation between Magic Canvas and other Texo pages
- Rationale: Prevent data leakage between contexts

**NFR-S4: Export Security**
- Exported JSON contains only vector paths and LaTeX (no executable code)
- Imports validated before loading (schema check)
- Malformed imports rejected gracefully
- Rationale: Prevent code injection via malicious exports

---

### Reliability & Error Handling

**NFR-R1: Graceful Degradation**
- OCR failures: Show ⚠️ icon, allow user to retry or manually enter LaTeX
- Validation failures: Log error, allow inspection, don't block further work
- Worker crashes: Detect and restart workers, re-queue failed operations
- Rationale: Errors should never completely block user

**NFR-R2: Data Integrity**
- Auto-save to IndexedDB on every row state change
- Atomic writes (either full state saves or nothing)
- Corruption detection on load (fallback to last good state)
- Rationale: User should never lose work due to crash

**NFR-R3: Operation Timeout**
- OCR per tile: 10-second timeout (very generous)
- Validation: 2-second timeout (inherited from existing CAS)
- Total row processing: 15-second timeout before marking as error
- Rationale: Prevent infinite hangs on pathological inputs

**NFR-R4: Resource Exhaustion Handling**
- IndexedDB quota: Warn at 80%, block writes at 95%, suggest cleanup
- Memory pressure: Reduce worker pool size if OOM detected
- Long canvases: Lazy load off-screen row metadata
- Rationale: Fail gracefully rather than crash browser

**NFR-R5: Logging & Diagnostics**
- All errors logged to existing diagnostic system
- Performance metrics captured (OCR time, validation time, cache hits)
- User-facing errors include actionable guidance ("Rewrite more clearly", "Check storage")
- Rationale: Enable troubleshooting and iteration

---

### Usability & Accessibility

**NFR-U1: Touch Target Sizes**
- All interactive elements: Minimum 44x44px tap targets
- Row status icons: 48x48px actual size (meets WCAG AAA)
- Toolbar buttons: 44x44px minimum
- Rationale: Accessibility on mobile/tablet devices

**NFR-U2: Color Contrast**
- Status icons: WCAG AA contrast against canvas background
- Row lines: Subtle but visible (minimum 3:1 contrast)
- Error states: Red with sufficient contrast
- Rationale: Usable for users with color vision deficiencies

**NFR-U3: Keyboard Navigation (Desktop)**
- Tab order: Logical progression through interactive elements
- Keyboard shortcuts: Documented and non-conflicting
- Focus indicators: Visible on all interactive elements
- Rationale: Basic accessibility for non-touch users

**NFR-U4: Feedback Clarity**
- Icon meanings: Intuitive without requiring legend
- Error messages: Clear, actionable, non-technical
- Loading states: Always visible when system is working
- Rationale: No confusion about system state

**NFR-U5: Discoverability**
- First-time users: Brief overlay explaining row system and validation
- Tooltips: Available on hover for toolbar actions (desktop)
- Help link: Access to documentation from toolbar
- Rationale: Reduce learning curve

---

### Integration & Compatibility

**NFR-I1: Code Reuse**
- Magic Canvas reuses >80% of existing Texo infrastructure
- No duplication of OCR worker logic (extend, don't rewrite)
- No duplication of CAS logic (call existing functions)
- Rationale: Minimize maintenance burden, ensure consistency

**NFR-I2: Backward Compatibility**
- New IndexedDB stores don't break existing Texo features
- Existing workspace manager can handle Magic Canvas exports
- Existing debug context works seamlessly with new page
- Rationale: No regressions in existing functionality

**NFR-I3: Browser Compatibility**
- Test matrix: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Polyfills: Minimal (target modern browsers only)
- Graceful fallback: Inform users of unsupported browsers
- Rationale: Match existing Texo browser support

**NFR-I4: Model Flexibility (Future-Proofing)**
- OCR model parameters not hardcoded throughout codebase
- Model interface abstracted (allows future model swapping)
- FormulaNet-specific logic isolated to single module
- Rationale: Enable future model upgrades without refactoring

---

### Maintainability

**NFR-M1: Code Organization**
- New components follow existing Texo patterns (React hooks, functional components)
- File structure mirrors existing Texo architecture
- Naming conventions consistent with codebase
- Rationale: Easy for developers familiar with Texo to navigate

**NFR-M2: Testing**
- Unit tests: Cover utility functions (tiling, merging, post-processing)
- Integration tests: Manual browser testing for UI flows
- Performance tests: Benchmark OCR and validation latency
- Rationale: Confidence in correctness and performance

**NFR-M3: Documentation**
- Code comments: Explain complex algorithms (tile merging, boundary detection)
- README updates: Document Magic Canvas architecture
- User guide: Explain row system and validation workflow
- Rationale: Enable future contributors and users

---

## Implementation Planning

**Development Approach:**

This is a **brownfield enhancement** to existing Texo-web-stylus. Implementation should prioritize:
1. **Code reuse:** Leverage existing OCR, CAS, storage, and debug infrastructure
2. **Incremental delivery:** Build core pipeline first, then enhance with polish
3. **Testing at boundaries:** Focus tests on new logic (tiling, merging) while trusting existing components

**Recommended Implementation Sequence:**

**Phase 1: Core Infrastructure (MVP Foundation)**
- Row system (RowManager class, automatic assignment)
- Basic canvas with ruled lines
- Tile extraction (overlapping, fixed-size)
- Worker pool for parallel OCR
- Basic LaTeX merging (spacing heuristics)

**Phase 2: Validation Integration (MVP Core)**
- Sequential validation pipeline
- CAS integration
- Visual feedback (status icons)
- Row state persistence

**Phase 3: UX Polish (MVP Completion)**
- Inspection panel (tap to see LaTeX)
- Debug mode integration
- Floating toolbar
- Settings panel

**Phase 4: Growth Features (Post-MVP)**
- Intelligent tiling (dissimilar dimensions)
- Unit detection
- Glyph-level feedback
- Row operations (lock, duplicate, clear)
- Advanced debug panel

**Epic Breakdown Required:**

The 98 functional requirements must be decomposed into implementable epics and bite-sized stories. Given the complexity and brownfield nature, expect:
- **6-10 epics** for MVP
- **20-40 stories** total (MVP + critical growth features)
- **Story size:** Target 2-4 hours each for experienced React/TypeScript developer

**Next Step:** Run `workflow create-epics-and-stories` to create the implementation breakdown.

---

## References

**Project Documentation:**
- Brownfield docs: `docs/bmm-index.md` (comprehensive project analysis)
- Existing architecture: `docs/bmm-architecture.md`
- Development guide: `docs/bmm-development-guide.md`
- CAS documentation: `CANONICALIZATION_GUIDE.md`, `src/cas/README.md`
- AI guidance: `CLAUDE.md`

**Related Texo Components to Reuse:**
- OCR: `src/workers/ocrWorker.js`, `src/workers/imageProcessor.js`
- CAS: `src/cas/equivalenceChecker.js`, `src/cas/katexParser.js`
- Storage: `src/utils/workspaceDB.js`, `src/utils/indexedDBCache.js`
- Debug: `src/contexts/DebugContext.jsx`, `src/utils/logger.js`
- Canvas: Excalidraw integration patterns from `src/pages/SketchPage.jsx`

**No Product Brief or Domain Research:**
- This is an enhancement to existing product (no separate brief needed)
- EdTech domain considerations captured in Success Criteria and UX Principles

---

## Next Steps

**Immediate Next Steps:**

1. **Epic & Story Breakdown** (Required)
   - Run: `workflow create-epics-and-stories`
   - Decompose 98 FRs into implementable epics
   - Break epics into 2-4 hour stories
   - Establish epic dependencies and implementation order

2. **Architecture Document** (Highly Recommended for Brownfield)
   - Run: `workflow create-architecture`
   - Design tile extraction + merging algorithms
   - Define RowManager data structures
   - Specify worker pool architecture
   - Document IndexedDB schema for new stores
   - Integration patterns with existing Texo components

3. **Test Strategy** (Recommended)
   - Run: `workflow test-design` (if available)
   - Unit tests for tiling, merging, post-processing utilities
   - Integration test plan for full pipeline
   - Performance test strategy
   - Manual test cases for UX flows

4. **Gate Check** (Required Before Implementation)
   - Run: `workflow solutioning-gate-check`
   - Validate PRD + Architecture cohesion
   - Ensure no gaps or contradictions
   - Confirm technical feasibility

**Implementation Readiness:**
Once PRD, epics, and architecture are complete, development can begin using the existing BMM sprint-planning workflow.

---

## Summary

**What This PRD Defines:**

**Magic Canvas** transforms Texo-web-stylus into a mindful mathematical note-taking tool where users write naturally with a stylus and receive instant, silent validation feedback. Each handwritten equation is transcribed via intelligent OCR tiling and validated against the previous line using the existing CAS, with colored ✓/✗ symbols appearing directly on the canvas.

**Core Value Proposition:**

"Fail faster to progress faster" - Unlike snapshot-based tools (ChatGPT camera) or manual checkers (WolframAlpha), Magic Canvas preserves flow state by validating continuously during writing. Users discover errors within 2-3 rows, preventing wasted time on multi-step problems built on faulty premises.

**What Makes It Special:**

1. **Silent intelligence** - OCR and validation happen in background without interrupting focus
2. **Ambient feedback** - Gentle colored symbols replace intrusive alerts
3. **Transparent reasoning** - Users can always inspect what system detected and why it failed
4. **Mindful philosophy** - Ambiguous cases require rewriting (feature, not bug), encouraging careful notation
5. **Novel tiling system** - Overlapping tiles with restorative merging handles variable-width expressions gracefully

**Scope:**
- **MVP:** 98 functional requirements across 10 capability areas
- **Growth:** Intelligent tiling, unit detection, glyph-level feedback, row operations
- **Vision:** Model flexibility, collaboration, analytics, accessibility

**Technical Approach:**
- Brownfield enhancement (80%+ code reuse)
- Web Workers + IndexedDB + existing CAS
- Performance-critical: <3s total feedback latency
- Privacy-preserving: 100% client-side processing

**Success Metrics:**
- Flow state: Users complete 10+ step problems without breaking focus
- Fail fast: Errors caught within 2-3 rows
- Performance: 90th percentile <4s feedback latency
- Accuracy: >95% valid LaTeX from tile merging

---

**This PRD is ready for epic breakdown and architecture design.**

_Created through collaborative discovery between BMad and John (PM)._
_Date: 2025-11-13_
