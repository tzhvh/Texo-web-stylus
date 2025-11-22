# Functional Requirements Inventory

**Total FRs: 104** (extracted from PRD - updated for course correction)

### Canvas & Drawing (FR1-FR10)
- FR1: Users can access Magic Canvas page from main navigation
- FR2: Users can draw on an infinite vertical canvas with stylus or mouse
- FR3: Canvas displays horizontal ruled lines as visual guides for row boundaries
- FR4: Users can customize row line spacing (default 100px, adjustable in settings)
- FR5: Users can switch between rows using gestures (swipe up/down) or keyboard (arrow keys)
- FR6: Users can zoom in/out on canvas (zoom only, no pan)
- FR7: Canvas state (zoom level, pan position) persists across page reloads
- FR8: Users can erase individual strokes or selections
- FR9: Users can undo/redo drawing actions
- FR10: Canvas supports Excalidraw's native drawing tools (pen, highlighter, shapes, text)

### Row System (FR11-FR23)
- FR11: Only the active row is editable; all other rows are read-only
- FR12: Each row has a stable unique ID that persists across pan/zoom/reload
- FR13: System maintains row metadata including Y-position, active status, OCR status, validation status, and transcribed LaTeX
- FR14: Row height for OCR processing is configurable (default 384px)
- FR15: Active row is visually distinct with highlighted border or background
- FR16: Empty rows (no content) are tracked but skipped during validation
- FR17: System tracks row activation timeline for OCR attribution and erase operations
- FR18: Users can activate a different row by tapping it, swiping vertically, or using arrow keys
- FR19: When row activation changes, OCR is triggered on the previously active row (debounced 1.5s)
- FR20: Users can create new rows below the current active row via button or gesture
- FR21: Read-only rows display strokes in a dimmed or locked visual state
- FR22: Erase operations only affect strokes in the currently active row
- FR23: Viewport automatically scrolls to center active row when switching to off-screen rows

### OCR & Transcription (FR24-FR41)
- FR24: System automatically triggers OCR transcription when row is deactivated (user switches to different row)
- FR25: OCR trigger is debounced 1.5 seconds after row deactivation
- FR26: System extracts tiles from rows for OCR processing
- FR27: Tile extraction creates overlapping 384x384 tiles with 10-20% overlap
- FR28: Multiple tiles from single row are processed in parallel via worker pool
- FR29: System displays per-tile progress indicators during OCR processing
- FR30: System caches OCR results per tile using content hash to avoid re-processing unchanged tiles
- FR31: OCR processing respects FormulaNet model input requirements (384x384 grayscale images)
- FR32: System handles OCR failures gracefully and reports errors to user
- FR33: Users can see OCR processing status per row (pending, processing, complete, error)

### LaTeX Assembly (FR34-FR41)
- FR34: System merges LaTeX fragments from multiple tiles into single expression per row
- FR35: Merging algorithm measures visual gaps between tile boundaries
- FR36: System inserts appropriate spacing in merged LaTeX based on gap size
- FR37: System removes duplicate operators at tile seams (e.g., "+ +" becomes "+")
- FR38: Merged LaTeX undergoes post-processing cleanup for common OCR artifacts
- FR39: System produces valid, parseable LaTeX from merged fragments
- FR40: Each row contains exactly one LaTeX expression after merging (even if sourced from multiple tiles)
- FR41: System handles multi-line expressions that span tiles (rare edge cases)

### Validation (FR42-FR52)
- FR42: System validates each row's LaTeX expression against the previous non-empty row
- FR43: Validation uses existing CAS equivalence checker (`checkEquivalence()`)
- FR44: First row in canvas automatically validates as correct (no previous row to compare)
- FR45: Validation skips empty rows when finding previous row for comparison
- FR46: Validation respects user's debugMode setting from existing DebugContext
- FR47: Validation respects user's forceAlgebrite setting from existing DebugContext
- FR48: Validation results are cached using key `row:${prevId}:${currId}` to avoid redundant checks
- FR49: System handles LaTeX parse failures during validation and marks row as error state
- FR50: Validation indicates which method was used (canonicalization, algebrite-difference, algebrite-simplify)
- FR51: Validation reports timing information for performance monitoring
- FR52: Users can manually trigger validation for specific row via gesture (double-tap row header)

### Visual Feedback (FR53-FR63)
- FR53: System displays colored status icons at right edge of each row after processing
- FR54: Green ✓ icon indicates row is mathematically equivalent to previous row
- FR55: Red ✗ icon indicates row is NOT equivalent to previous row (error detected)
- FR56: Yellow ⚠️ icon indicates LaTeX could not be parsed (rewrite needed)
- FR57: Orange ⟳ (spinning) icon indicates processing in progress (OCR or validation)
- FR58: Gray ∅ icon indicates row is empty or pending processing
- FR59: Icons are positioned at row edge, vertically centered, with minimum 44x44px tap target
- FR60: Users can tap status icon to inspect detailed information
- FR61: Processing indicators appear smoothly with fade-in animations
- FR62: Feedback updates happen without disrupting user's current drawing
- FR63: System never displays modal dialogs or alerts during normal validation operation

### Inspection & Debug (FR64-FR72)
- FR64: Users can tap row status icon to view transcribed LaTeX for that row
- FR65: Inspection panel shows detected LaTeX and previous row's LaTeX (if applicable)
- FR66: Users can enable Debug Mode via toggle to see extended diagnostic information
- FR67: Debug Mode reveals tile boundaries as overlay on canvas
- FR68: Debug Mode shows validation method, timing, and canonical forms for each row
- FR69: Debug Mode displays cache hit/miss information
- FR70: Users can view OCR processing logs via existing diagnostic logging system
- FR71: Users can view validation logs via existing diagnostic logging system
- FR72: Inspection panel is dismissible and non-modal (doesn't block other actions)

### Persistence & Workspace (FR73-FR81)
- FR73: Row state automatically saves to IndexedDB on changes
- FR74: Row state includes active row ID, activation timeline, and transcribed LaTeX per row
- FR75: Canvas state loads from IndexedDB on page reload
- FR76: Users can export Magic Canvas document to workspace manager
- FR77: Exported documents include both vector data and transcribed LaTeX
- FR78: Users can load previously saved Magic Canvas documents from workspace manager
- FR79: System tracks storage quota usage and warns at 80% capacity
- FR80: Row data persists across browser sessions
- FR81: Users can manually clear row data for specific canvas

### Settings & Configuration (FR82-FR88)
- FR82: Users can adjust row line spacing in settings
- FR83: Users can adjust OCR debounce time (default 1.5s, range 1-5s)
- FR84: Users can toggle auto-validation on/off
- FR85: Users can configure row height for OCR processing
- FR86: User preferences persist in localStorage across sessions
- FR87: Users can access settings via minimalist floating toolbar
- FR88: Settings panel is dismissible and doesn't interrupt flow

### Export & Integration (FR89-FR96)
- FR89: Users can export canvas as JSON with vector paths and LaTeX
- FR90: Users can copy transcribed LaTeX for specific row to clipboard
- FR91: Exported documents are compatible with existing Texo workspace manager
- FR92: Users can clear all rows while keeping canvas structure intact
- FR93: System integrates with existing IndexedDB infrastructure (reuses stores where applicable)
- FR94: System reuses existing OCR worker infrastructure
- FR95: System reuses existing CAS and validation infrastructure
- FR96: System reuses existing debug context and logging infrastructure

### User Control & Management (FR97-FR104)
- FR97: Users can access floating toolbar with common actions (Validate All, Clear All, Settings)
- FR98: Toolbar auto-hides after 3 seconds of inactivity to preserve clean canvas
- FR99: Users can manually show/hide toolbar via gesture or button
- FR100: Users can trigger "Validate All Rows" action to force validation of entire canvas
- FR101: Users can clear entire canvas with confirmation dialog (destructive action)
- FR102: Users receive clear visual indication when system is processing (not frozen)
- FR103: Users can cancel long-running OCR operations if needed
- FR104: System handles rapid row switching gracefully without dropping OCR or validation requests

This inventory will be used to validate complete coverage in Step 4.