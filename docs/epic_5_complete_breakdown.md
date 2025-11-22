# Epic 5: Data Persistence & Workspace Integration

**Goal:** Ensure work is never lost and integrates seamlessly with existing Texo workspace infrastructure through reliable data lifecycle management.

**Business Value:** Users can trust that their mathematical work is safe, accessible across sessions, and portable to other Texo features.

**Dependencies:** Epic 1 (RowManager state)

---

## Story 5.1: Auto-Save Row State to IndexedDB on Changes

As a **user**,
I want **my canvas and row state to save automatically as I work**,
So that **I never lose my mathematical work even if browser crashes**.

**Acceptance Criteria:**

**Given** I am working on Magic Canvas with rows in various states
**When** row state changes (drawing, OCR, validation, row switching)
**Then** system automatically saves state to IndexedDB within 2 seconds

**And** saved state includes: active row ID, activation timeline, and transcribed LaTeX per row
**And** save operation is atomic (prevents corruption during rapid changes)
**And** save is debounced to avoid excessive writes (2s after last change)
**And** save includes RowManager complete state (all rows with metadata)
**And** save includes canvas zoom level and viewport position
**And** save operation doesn't block user interface (background processing)
**And** save failures are logged and don't crash the application
**And** save respects IndexedDB quota limits (warn at 80%, prevent writes at 95%)

**Prerequisites:** Story 1.7 (state persistence foundation), Story 1.4 (RowManager)

**Technical Notes:**
- Use existing `src/utils/workspaceDB.js` patterns or create new store: `magic-canvas-state`
- Store structure: `{rowManagerState, canvasState, activeRowId, timestamp, version}`
- Atomic writes: Use IndexedDB transactions for data integrity
- Debounce save: 2s after last change to batch rapid modifications
- Background processing: Use setTimeout or requestIdleCallback for non-blocking saves
- Error handling: retry failed saves, log to existing logger.js
- Schema versioning: v1 initially, migration path for future changes
- Follow architecture decision: "Auto-save row state to IndexedDB on changes"
- Performance target: save completes within 100ms for typical canvas (<500 elements)

---

## Story 5.2: Load Canvas State on Page Reload

As a **user**,
I want **my canvas and row state to restore when I reopen the page**,
So that **I can continue working where I left off**.

**Acceptance Criteria:**

**Given** I have previously saved Magic Canvas work
**When** I reload the page or reopen browser
**Then** the canvas restores to my previous state:

**And** all drawn strokes are restored in correct positions
**And** row assignments are restored (elements belong to same rows)
**And** row statuses are restored (OCR status, validation status, transcribed LaTeX)
**And** active row is restored (last active row becomes active again)
**And** zoom level and viewport position are restored
**And** activation timeline is restored for OCR attribution
**And** restoration completes within 1 second for typical canvas (<500 elements)
**And** if no previous state exists, canvas loads empty with default view
**And** corrupted state is detected and handled gracefully (fallback to empty canvas, log error)

**Prerequisites:** Story 5.1 (auto-save), Story 1.4 (RowManager)

**Technical Notes:**
- Load from IndexedDB store: `magic-canvas-state` on component mount
- Reconstruct RowManager from saved state using `deserialize()` method
- Restore Excalidraw scene using `initialData` prop with saved elements and appState
- Restore active row: `rowManager.setActiveRow(savedActiveRowId)`
- Restore activation timeline for OCR attribution
- Handle schema versioning: migrate old data if needed
- Error recovery: detect corrupted JSON, missing fields, version mismatches
- Loading indicator: show subtle loading state during restoration
- Performance target: <1s restoration time for typical canvas
- Follow architecture decision: "Load canvas state on page reload"
- Integration with existing workspaceDB.js patterns

---

## Story 5.3: Export Magic Canvas to Workspace Manager

As a **user**,
I want **to export my Magic Canvas work to the existing Texo workspace manager**,
So that **I can access my mathematical work alongside other Texo features**.

**Acceptance Criteria:**

**Given** I have completed mathematical work on Magic Canvas
**When** I click "Export to Workspace" button in toolbar
**Then** the canvas is exported to Texo workspace manager:

**And** exported document includes both vector data and transcribed LaTeX
**And** export format is compatible with existing workspace manager schema
**And** export includes metadata: creation date, last modified, row count
**And** export preserves row structure and activation timeline
**And** export operation completes within 2 seconds for typical canvas
**And** exported document appears in workspace manager alongside existing documents
**And** export doesn't clear the current canvas (user can continue working)
**And** export handles large canvases (>1000 elements) without blocking UI
**And** export failures are handled gracefully with user feedback

**Prerequisites:** Story 1.10 (toolbar), Story 5.1 (state persistence)

**Technical Notes:**
- Add "Export to Workspace" button to MagicCanvasToolbar (Story 6.1)
- Use existing `src/utils/workspaceDB.js` API for document creation
- Export format: JSON with structure matching workspace manager expectations
- Export data: `{elements: ExcalidrawElement[], rows: Row[], metadata: DocumentMetadata}`
- Integration with existing workspace document listing and management UI
- Background processing: show progress indicator for large exports
- Error handling: quota exceeded, serialization failures, workspace errors
- Follow architecture decision: "Export Magic Canvas document to workspace manager"
- Performance target: <2s export time, non-blocking UI

---

## Story 5.4: Load Previously Saved Magic Canvas Documents

As a **user**,
I want **to load and continue working on previously saved Magic Canvas documents**,
So that **I can revisit and modify my past mathematical work**.

**Acceptance Criteria:**

**Given** I have saved Magic Canvas documents in workspace manager
**When** I access workspace manager and choose a Magic Canvas document
**Then** the document loads and replaces current canvas content:

**And** all vector strokes are restored in correct positions
**And** row structure and metadata are restored (statuses, LaTeX, timeline)
**And** active row is set to last active row from saved document
**And** zoom and viewport are restored to saved state
**And** loading replaces current canvas content (with confirmation if current canvas has unsaved changes)
**And** loading completes within 2 seconds for typical document
**And** document preview is available before loading (thumbnail or description)
**And** loading handles large documents without blocking UI
**And** loading errors are handled gracefully with clear error messages

**Prerequisites:** Story 5.3 (export integration), Story 5.2 (load foundation)

**Technical Notes:**
- Integrate with existing workspace manager UI and document listing
- Add "Load Magic Canvas" option to workspace document types
- Document preview: show thumbnail or first few rows as description
- Confirmation dialog: warn user if current canvas has unsaved changes
- Load process: replace entire canvas state, RowManager, and active row
- Background loading: progress indicator during document restoration
- Error handling: corrupted documents, version mismatches, quota issues
- Integration with existing document validation and import patterns
- Follow architecture decision: "Load previously saved Magic Canvas documents"
- Performance target: <2s load time, non-blocking UI

---

## Story 5.5: Track Storage Quota and Warn at 80%

As a **user**,
I want **to be warned when I'm approaching storage limits**,
So that **I can manage my workspace and avoid data loss**.

**Acceptance Criteria:**

**Given** IndexedDB has limited storage quota for Magic Canvas data
**When** storage usage exceeds 80% of available quota
**Then** I see a warning notification:

**And** warning shows current usage: "Using 85% of available storage"
**And** warning suggests cleanup actions: clear cache, delete old documents
**And** warning appears as non-intrusive notification (not modal alert)
**And** warning persists until usage drops below 75% or user dismisses
**And** at 95% usage, system prevents new saves and shows critical warning
**And** quota monitoring updates in real-time as saves/deletes occur
**And** storage breakdown is available: "Documents: 45MB, Cache: 12MB, Total: 57MB/100MB"
**And** quota estimation is accurate across different browsers and devices

**Prerequisites:** Story 5.1 (auto-save), existing IndexedDB infrastructure

**Technical Notes:**
- Monitor IndexedDB usage using `navigator.storage.estimate()` and `usage` details
- Calculate percentage: `(used / quota) * 100` for warning thresholds
- Warning levels: 80% (warning), 95% (critical), 99% (emergency)
- Storage breakdown by store: documents, cache, row state, total
- Real-time monitoring: update after each save/delete operation
- Warning UI: subtle notification banner or status bar indicator
- Preventative measures: suggest cleanup actions, disable auto-save at critical levels
- Integration with existing storage management patterns in workspaceDB.js
- Follow architecture decision: "Track storage quota and warn at 80%"
- Performance impact: <5ms overhead for quota calculations

---

## Story 5.6: Manual Data Management (Clear Canvas, Clear Cache)

As a **user**,
I want **to manually clear canvas data or caches when needed**,
So that **I can manage storage and start fresh work**.

**Acceptance Criteria:**

**Given** I want to manage my Magic Canvas data
**When** I access data management options
**Then** I have the following clear options available:

**And** "Clear Canvas" button removes all drawn elements and row content
**And** "Clear OCR Cache" button removes all tile-level OCR cache entries
**And** "Clear Validation Cache" button removes all validation result cache entries
**And** "Clear All Data" button removes everything (canvas, caches, preferences)
**And** each clear action shows confirmation dialog with clear description of what will be lost
**And** clear operations complete within 1 second and update storage usage immediately
**And** clear operations can be undone (restore from auto-save if available)
**And** clear operations are logged for audit trail (what was cleared, when)
**And** storage quota is recalculated and warnings updated after clears
**And** clear operations don't affect other Texo workspace documents

**Prerequisites:** Story 5.1 (persistence), Story 5.5 (quota tracking)

**Technical Notes:**
- Add data management section to settings panel or dedicated area
- Clear canvas: reset RowManager to empty state, clear Excalidraw elements
- Clear OCR cache: delete all entries from `ocr-tile-cache` store
- Clear validation cache: delete all entries from validation cache store
- Clear all data: reset all Magic Canvas stores, reset preferences to defaults
- Confirmation dialogs: clear description of impact, "Cancel" option
- Atomic operations: use IndexedDB transactions for data integrity
- Audit logging: log clear actions with timestamp and scope
- Integration with existing cache management patterns
- Follow architecture decision: "Manual data management (clear canvas, clear cache)"
- Performance target: <1s for any clear operation

---

## Epic 5 Summary

**Stories:** 6
**Estimated Complexity:** Low-Medium (primarily data management, leverages existing infrastructure)
**Key Deliverables:**
- Automatic state persistence with debounced saving
- Fast state restoration on page reload
- Workspace integration for export/import
- Storage quota monitoring with warnings
- Manual data management capabilities

**Testing Notes:**
- Unit tests: Save/load operations, quota calculations, cache management
- Integration tests: Full save/export/load workflow with workspace manager
- Performance tests: Large canvas handling, rapid save/load cycles
- Edge cases: Corrupted state recovery, quota exceeded scenarios
- Data integrity: Atomic operations, concurrent access handling

**Critical Path Dependencies:**
- Can be developed in parallel with Epics 2, 3, and 4
- Depends only on Epic 1 (RowManager state)
- Independent of OCR and validation pipelines
- Foundation for user data safety and workspace integration

**Performance Targets:**
- Auto-save: completes within 100ms, debounced 2s
- Load/restore: <1s for typical canvas
- Export: <2s for typical document
- Quota monitoring: <5ms overhead, real-time updates
- Clear operations: <1s completion

**Architecture Integration:**
- Heavy reuse of existing IndexedDB and workspace infrastructure
- Follows established data persistence patterns from Texo codebase
- Maintains data integrity and atomic operations
- Integrates with existing storage quota management approaches