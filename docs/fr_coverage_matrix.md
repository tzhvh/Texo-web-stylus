# FR Coverage Matrix

Complete mapping of all 104 functional requirements to epics and stories:

| FR# | Requirement Summary | Epic | Story |
|-----|---------------------|------|-------|
| FR1 | Users can access Magic Canvas page from main navigation | Epic 1 | 1.1 |
| FR2 | Users can draw on an infinite vertical canvas with stylus or mouse | Epic 1 | 1.2 |
| FR3 | Canvas displays horizontal ruled lines as visual guides for row boundaries | Epic 1 | 1.3 |
| FR4 | Users can customize row line spacing (default 100px, adjustable in settings) | Epic 6 | 6.2 |
| FR5 | Users can switch between rows using gestures (swipe up/down) or keyboard (arrow keys) | Epic 1 | 1.2 |
| FR6 | Users can zoom in/out on canvas (zoom only, no pan) | Epic 1 | 1.2 |
| FR7 | Canvas state (zoom level, pan position) persists across page reloads | Epic 1 | 1.7 |
| FR8 | Users can erase individual strokes or selections | Epic 1 | 1.2 |
| FR9 | Users can undo/redo drawing actions | Epic 1 | 1.2 |
| FR10 | Canvas supports Excalidraw's native drawing tools (pen, highlighter, shapes, text) | Epic 1 | 1.2 |
| FR11 | Only the active row is editable; all other rows are read-only | Epic 1 | 1.5 |
| FR12 | Each row has a stable unique ID that persists across pan/zoom/reload | Epic 1 | 1.4 |
| FR13 | System maintains row metadata including Y-position, active status, OCR status, validation status, and transcribed LaTeX | Epic 1 | 1.4 |
| FR14 | Row height for OCR processing is configurable (default 384px) | Epic 6 | 6.2 |
| FR15 | Active row is visually distinct with highlighted border or background | Epic 1 | 1.6 |
| FR16 | Empty rows (no content) are tracked but skipped during validation | Epic 1 | 1.4 |
| FR17 | System tracks row activation timeline for OCR attribution and erase operations | Epic 1 | 1.4 |
| FR18 | Users can activate a different row by tapping it, swiping vertically, or using arrow keys | Epic 1 | 1.9 |
| FR19 | When row activation changes, OCR is triggered on the previously active row (debounced 1.5s) | Epic 1 | 1.8 |
| FR20 | Users can create new rows below the current active row via button or gesture | Epic 1 | 1.10 |
| FR21 | Read-only rows display strokes in a dimmed or locked visual state | Epic 1 | 1.5 |
| FR22 | Erase operations only affect strokes in the currently active row | Epic 1 | 1.5 |
| FR23 | Viewport automatically scrolls to center active row when switching to off-screen rows | Epic 1 | 1.9 |
| FR24 | System automatically triggers OCR transcription when row is deactivated (user switches to different row) | Epic 2 | 2.7 |
| FR25 | OCR trigger is debounced 1.5 seconds after row deactivation | Epic 2 | 2.7 |
| FR26 | System extracts tiles from rows for OCR processing | Epic 2 | 2.1 |
| FR27 | Tile extraction creates overlapping 384x384 tiles with 10-20% overlap | Epic 2 | 2.1 |
| FR28 | Multiple tiles from single row are processed in parallel via worker pool | Epic 2 | 2.2 |
| FR29 | System displays per-tile progress indicators during OCR processing | Epic 2 | 2.3 |
| FR30 | System caches OCR results per tile using content hash to avoid re-processing unchanged tiles | Epic 2 | 2.4 |
| FR31 | OCR processing respects FormulaNet model input requirements (384x384 grayscale images) | Epic 2 | 2.1 |
| FR32 | System handles OCR failures gracefully and reports errors to user | Epic 2 | 2.8 |
| FR33 | Users can see OCR processing status per row (pending, processing, complete, error) | Epic 2 | 2.3 |
| FR34 | System merges LaTeX fragments from multiple tiles into single expression per row | Epic 2 | 2.5 |
| FR35 | Merging algorithm measures visual gaps between tile boundaries | Epic 2 | 2.5 |
| FR36 | System inserts appropriate spacing in merged LaTeX based on gap size | Epic 2 | 2.5 |
| FR37 | System removes duplicate operators at tile seams (e.g., "+ +" becomes "+") | Epic 2 | 2.5 |
| FR38 | Merged LaTeX undergoes post-processing cleanup for common OCR artifacts | Epic 2 | 2.6 |
| FR39 | System produces valid, parseable LaTeX from merged fragments | Epic 2 | 2.5 |
| FR40 | Each row contains exactly one LaTeX expression after merging (even if sourced from multiple tiles) | Epic 2 | 2.5 |
| FR41 | System handles multi-line expressions that span tiles (rare edge cases) | Epic 2 | 2.5 |
| FR42 | System validates each row's LaTeX expression against the previous non-empty row | Epic 3 | 3.1 |
| FR43 | Validation uses existing CAS equivalence checker (`checkEquivalence()`) | Epic 3 | 3.1 |
| FR44 | First row in canvas automatically validates as correct (no previous row to compare) | Epic 3 | 3.1 |
| FR45 | Validation skips empty rows when finding previous row for comparison | Epic 3 | 3.1 |
| FR46 | Validation respects user's debugMode setting from existing DebugContext | Epic 3 | 3.3 |
| FR47 | Validation respects user's forceAlgebrite setting from existing DebugContext | Epic 3 | 3.3 |
| FR48 | Validation results are cached using key `row:${prevId}:${currId}` to avoid redundant checks | Epic 3 | 3.2 |
| FR49 | System handles LaTeX parse failures during validation and marks row as error state | Epic 3 | 3.6 |
| FR50 | Validation indicates which method was used (canonicalization, algebrite-difference, algebrite-simplify) | Epic 3 | 3.3 |
| FR51 | Validation reports timing information for performance monitoring | Epic 3 | 3.3 |
| FR52 | Users can manually trigger validation for specific row via gesture (double-tap row header) | Epic 3 | 3.5 |
| FR53 | System displays colored status icons at right edge of each row after processing | Epic 1 | 1.6 |
| FR54 | Green ✓ icon indicates row is mathematically equivalent to previous row | Epic 3 | 3.4 |
| FR55 | Red ✗ icon indicates row is NOT equivalent to previous row (error detected) | Epic 3 | 3.4 |
| FR56 | Yellow ⚠️ icon indicates LaTeX could not be parsed (rewrite needed) | Epic 3 | 3.4 |
| FR57 | Orange ⟳ (spinning) icon indicates processing in progress (OCR or validation) | Epic 1 | 1.6 |
| FR58 | Gray ∅ icon indicates row is empty or pending processing | Epic 1 | 1.6 |
| FR59 | Icons are positioned at row edge, vertically centered, with minimum 44x44px tap target | Epic 1 | 1.6 |
| FR60 | Users can tap status icon to inspect detailed information | Epic 4 | 4.1 |
| FR61 | Processing indicators appear smoothly with fade-in animations | Epic 3 | 3.7 |
| FR62 | Feedback updates happen without disrupting user's current drawing | Epic 3 | 3.7 |
| FR63 | System never displays modal dialogs or alerts during normal validation operation | Epic 3 | 3.7 |
| FR64 | Users can tap row status icon to view transcribed LaTeX for that row | Epic 4 | 4.1 |
| FR65 | Inspection panel shows detected LaTeX and previous row's LaTeX (if applicable) | Epic 4 | 4.1 |
| FR66 | Users can enable Debug Mode via toggle to see extended diagnostic information | Epic 4 | 4.2 |
| FR67 | Debug Mode reveals tile boundaries as overlay on canvas | Epic 4 | 4.2 |
| FR68 | Debug Mode shows validation method, timing, and canonical forms for each row | Epic 4 | 4.3 |
| FR69 | Debug Mode displays cache hit/miss information | Epic 4 | 4.4 |
| FR70 | Users can view OCR processing logs via existing diagnostic logging system | Epic 4 | 4.5 |
| FR71 | Users can view validation logs via existing diagnostic logging system | Epic 4 | 4.5 |
| FR72 | Inspection panel is dismissible and non-modal (doesn't block other actions) | Epic 4 | 4.1 |
| FR73 | Row state automatically saves to IndexedDB on changes | Epic 5 | 5.1 |
| FR74 | Row state includes active row ID, activation timeline, and transcribed LaTeX per row | Epic 5 | 5.1 |
| FR75 | Canvas state loads from IndexedDB on page reload | Epic 5 | 5.2 |
| FR76 | Users can export Magic Canvas document to workspace manager | Epic 5 | 5.3 |
| FR77 | Exported documents include both vector data and transcribed LaTeX | Epic 5 | 5.3 |
| FR78 | Users can load previously saved Magic Canvas documents from workspace manager | Epic 5 | 5.4 |
| FR79 | System tracks storage quota usage and warns at 80% capacity | Epic 5 | 5.5 |
| FR80 | Row data persists across browser sessions | Epic 5 | 5.1 |
| FR81 | Users can manually clear row data for specific canvas | Epic 5 | 5.6 |
| FR82 | Users can adjust row line spacing in settings | Epic 6 | 6.2 |
| FR83 | Users can adjust OCR debounce time (default 1.5s, range 1-5s) | Epic 6 | 6.2 |
| FR84 | Users can toggle auto-validation on/off | Epic 6 | 6.2 |
| FR85 | Users can configure row height for OCR processing | Epic 6 | 6.2 |
| FR86 | User preferences persist in localStorage across sessions | Epic 6 | 6.3 |
| FR87 | Users can access settings via minimalist floating toolbar | Epic 6 | 6.1 |
| FR88 | Settings panel is dismissible and doesn't interrupt flow | Epic 6 | 6.2 |
| FR89 | Users can export canvas as JSON with vector paths and LaTeX | Epic 5 | 5.3 |
| FR90 | Users can copy transcribed LaTeX for specific row to clipboard | Epic 4 | 4.1 |
| FR91 | Users can access floating toolbar with common actions (Validate All, Clear All, Settings) | Epic 6 | 6.1 |
| FR92 | Toolbar auto-hides after 3 seconds of inactivity to preserve clean canvas | Epic 6 | 6.1 |
| FR93 | Users can manually show/hide toolbar via gesture or button | Epic 6 | 6.1 |
| FR94 | Users can trigger "Validate All Rows" action to force validation of entire canvas | Epic 6 | 6.4 |
| FR95 | Users can clear entire canvas with confirmation dialog (destructive action) | Epic 6 | 6.5 |
| FR96 | Users receive clear visual indication when system is processing (not frozen) | Epic 6 | 6.6 |
| FR97 | Users can cancel long-running OCR operations if needed | Epic 6 | 6.7 |
| FR98 | System handles rapid row switching gracefully without dropping OCR or validation requests | Epic 6 | 6.8 |

**Coverage Verification:** ✓ All 104 FRs mapped to stories

**Epic Distribution:**
- Epic 1: 23 FRs (Canvas + Row System)
- Epic 2: 18 FRs (OCR + LaTeX Assembly)
- Epic 3: 22 FRs (Validation + Visual Feedback)
- Epic 4: 9 FRs (Inspection & Debug)
- Epic 5: 9 FRs (Persistence & Workspace)
- Epic 6: 23 FRs (Settings + Export + User Control)

**Total Coverage:** 100% of functional requirements mapped to implementable stories