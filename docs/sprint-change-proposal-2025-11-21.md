# Sprint Change Proposal: Single-Active-Row Architecture

**Date:** 2025-11-21
**Author:** John (Product Manager) via Correct Course Workflow
**Project:** Texo-web-stylus - Magic Canvas Feature
**Change Scope:** Major - Architectural Pivot
**Status:** Awaiting Approval

---

## 1. Issue Summary

### Problem Statement

The current Magic Canvas architecture uses a free-drag canvas model where users can pan vertically through an infinite canvas, with the system automatically assigning drawn elements to rows based on Y-coordinate positioning. This approach creates significant downstream complexity for:

1. **Reconciliation:** When canvas transforms (pan/zoom) are applied, tracking which elements belong to which rows becomes complex, requiring bidirectional state synchronization between canvas position, element positions, and row assignments.

2. **Attribution:** Determining which strokes belong to which mathematical expressions at any point in time requires maintaining a complex timeline of element movements, row reassignments, and canvas transformations.

3. **Erase Operations:** Selectively erasing strokes based on row activation history (e.g., "erase all strokes from when row 3 was active") becomes nearly impossible when elements can move between rows dynamically.

4. **State Management:** The system must maintain tight synchronization between Excalidraw's visual state, RowManager's logical state, OCR processing state, validation state, and IndexedDB persistence—creating multiple sources of truth and race condition vulnerabilities.

### Discovery Context

This issue was identified during the architectural design review of Epic 1 (Canvas Foundation & Row System), specifically when reviewing the RowManager implementation requirements (Stories 1.4-1.8). The complexity of maintaining bidirectional state synchronization revealed fundamental architectural fragility that would compound as OCR, validation, and debugging features are added in later epics.

### Evidence

**Technical Constraints Identified:**
- Complex diff algorithms needed to detect element movements between rows on every canvas change
- Bidirectional mapping required (element → row, row → elements) with O(n) update complexity
- Pan/zoom state must be synchronized with row boundaries and element positions
- Timeline tracking requires full event history of element movements and row reassignments

**Implementation Complexity:**
- Story 1.8 ("Handle Row Updates When Elements Are Moved") alone requires sophisticated change detection, row reassignment logic, and cascade updates to OCR/validation state
- State sync pattern (Excalidraw ↔ RowManager ↔ IndexedDB) creates three-way race conditions
- Element-to-row assignment edge cases multiply (elements spanning rows, rapid drawing crossing boundaries, undo/redo affecting assignments)

---

## 2. Impact Analysis

### Epic Impact

**Epic 1 (Canvas Foundation & Row System):**
- **Status:** MAJOR REWRITE REQUIRED
- **Stories Modified:** 5 stories require significant changes (1.2, 1.4, 1.5, 1.7, 1.8)
- **Stories Added:** 2 new stories (1.9: Row Switching, 1.10: Row Creation)
- **Stories Removed:** 0 (all FRs still covered, approach changed)
- **Net Complexity:** REDUCED (simpler architecture, fewer state dependencies)

**Epic 2 (OCR Tiling & Transcription):**
- **Status:** SIMPLIFIED
- **Impact:** No complex timeline tracking needed—OCR triggers on row deactivation
- **Benefit:** Cleaner trigger model, no need to track element history

**Epic 3 (Validation & Feedback Pipeline):**
- **Status:** SIMPLIFIED
- **Impact:** Sequential validation still works, but no row reordering to handle
- **Benefit:** Predictable validation chain (row N always validates against row N-1)

**Epic 4 (Inspection & Debugging):**
- **Status:** MINIMAL IMPACT
- **Impact:** Inspection panel still needed, simpler data to display
- **Benefit:** Activation timeline provides clear audit trail

**Epic 5 (Persistence & Workspace Integration):**
- **Status:** SIMPLIFIED
- **Impact:** Simpler state to persist (no pan position, just active row ID)
- **Benefit:** Smaller IndexedDB footprint, faster save/load

**Epic 6 (Settings & User Control):**
- **Status:** MODIFIED
- **Impact:** Remove pan controls, add row navigation controls
- **Benefit:** Clearer user controls, better keyboard accessibility

### Artifact Conflicts

**PRD (Product Requirements Document):**

**Requirements to Remove/Modify:**
- **FR5:** "Users can pan vertically through canvas" → REPLACE with "Users can switch between rows using gestures or keyboard"
- **FR11:** "Auto-assign elements to rows by Y-coordinate" → REPLACE with "Only the active row is editable; all other rows are read-only"
- **FR17:** "Rows stable through canvas transformations" → REMOVE (no transformations affecting row membership)
- **FR18:** "System detects element additions/removals" → SIMPLIFY to "System tracks row activation timeline"

**New Requirements to Add:**
- **FR19-NEW:** Users can activate a different row by tapping it, swiping vertically, or using arrow keys
- **FR20-NEW:** When row activation changes, OCR is triggered on the previously active row (debounced 1.5s)
- **FR21-NEW:** Users can create new rows below the current active row via button or gesture
- **FR22-NEW:** Read-only rows display strokes in a dimmed or locked visual state
- **FR23-NEW:** Erase operations only affect strokes in the currently active row

**MVP Status:** ✓ PRESERVED (actually improved—simpler UX, same core value)

**Architecture Document:**

**Sections Requiring Updates:**
1. **Decision Summary Table:** Update Row Manager decision (Map storage → Active row selector)
2. **Epic 1 Architecture:** Rewrite components, key decisions, integration points
3. **Data Models:** Simplify Row interface (remove `elementIds`, add `isActive`, `activatedAt`)
4. **API Contracts:** Simplify RowManager API (remove `assignElement()`, add `setActiveRow()`)
5. **Pattern Designs:** Update State Synchronization pattern (3-way → unidirectional)
6. **ADRs:** Add new ADR for single-active-row architectural decision

**UI/UX Specifications:**

**User Flow Changes:**
- **Old:** Draw anywhere → System auto-assigns to rows → Pan to see other rows
- **New:** Select row → Draw in that row only → Use gestures/keys to switch rows

**Interaction Pattern Changes:**
- **Add:** Active row highlight/border (clear visual affordance)
- **Add:** Row navigation gestures (swipe up/down on tablet, arrow keys on desktop)
- **Add:** Read-only row visual treatment (grayed out or dimmed)
- **Remove:** Pan/drag gestures for vertical scrolling

**Accessibility Improvements:**
- Better keyboard navigation (arrow keys for row switching)
- Clearer screen reader announcements ("Row 3 of 10 active")

### Technical Impact

**Code Components Affected:**
- `src/pages/MagicCanvas.jsx`: Add active row management, remove pan handling
- `src/utils/rowManager.js`: Complete rewrite (simpler implementation)
- `src/hooks/useRowSystem.js`: Rewrite for activation model
- `src/components/RowHeader.jsx`: Add active row visual indication

**New Components Required:**
- `src/components/RowNavigator.jsx`: Gesture and keyboard handler for row switching

**Existing Components Reused:**
- Excalidraw integration (still used for drawing)
- IndexedDB utilities (still used for persistence)
- CAS and OCR workers (unchanged, still reused)

---

## 3. Recommended Approach

### Selected Path: Option 1 - Direct Adjustment

**Implementation Strategy:**
Rewrite Epic 1 stories to implement the single-active-row model with gesture/dpad navigation, treating this as an architectural correction discovered early in the development cycle.

### Rationale

**Technical Benefits:**
1. **Single Locus of Control:** All editing happens in one row at a time, eliminating entire classes of synchronization bugs and race conditions
2. **Simpler State Management:** RowManager becomes a stateless selector + timeline tracker instead of complex bidirectional Map with element tracking
3. **Clearer Attribution:** Row activation timeline provides clean audit trail for OCR processing and erase operations
4. **Better Performance:** No complex diff algorithms on every canvas change, no pan/zoom state synchronization overhead

**User Experience Benefits:**
1. **Clearer Mental Model:** Users understand "I'm writing in this row now" vs "my strokes might end up in different rows depending on Y-coordinate"
2. **Explicit Control:** Users explicitly choose which row to edit, reducing surprises
3. **Better Keyboard Accessibility:** Arrow keys for row navigation is more intuitive than pan gestures
4. **Predictable Behavior:** Strokes never move between rows, eliminating confusion

**Development Benefits:**
1. **Faster Implementation:** Simpler architecture = fewer bugs, faster development
2. **Easier Testing:** Fewer edge cases, more predictable behavior
3. **Better Maintainability:** Future developers can reason about state more easily
4. **Reduced Risk:** Fewer state dependencies = fewer potential points of failure

**Long-term Benefits:**
1. **Better Foundation for Growth:** Multi-user collaboration easier with clear row ownership
2. **Undo/Redo Simplification:** Row-level undo is clearer than element-level with row reassignments
3. **Export/Import Robustness:** Simpler state structure is easier to serialize and validate

### Trade-offs

**What We're Giving Up:**
- ❌ Free vertical panning through the canvas
- ❌ Ability to see multiple rows at once while drawing (though you can still see them in read-only state)

**What We're Gaining:**
- ✓ Dramatically simpler architecture
- ✓ Clearer user mental model
- ✓ Better keyboard accessibility
- ✓ Faster implementation timeline
- ✓ More robust and maintainable codebase
- ✓ Better foundation for future features

**Assessment:** The trade-offs heavily favor the single-active-row model. Free panning is a minor convenience compared to the architectural, UX, and maintainability benefits gained.

### Effort Estimate

**High-Level Breakdown:**

| Activity | Effort | Notes |
|----------|--------|-------|
| Update PRD (FR modifications) | 2 hours | 4 FRs modified, 5 FRs added |
| Update Architecture document | 4 hours | 6 sections modified, 1 ADR added |
| Rewrite Epic 1 stories | 6 hours | 5 stories modified, 2 stories added |
| Update Epic 1 Tech Spec | 3 hours | Workflows, data models, ACs updated |
| Review and approval cycle | 2 hours | PM, Architect, SM review |
| **Total Documentation** | **17 hours** | **~2 developer days** |
| Implementation (Epic 1) | 3-4 days | Simpler than original (4-5 days estimate) |
| **Total Project Impact** | **5-6 days** | **Net NEUTRAL to POSITIVE on timeline** |

**Risk Level:** LOW
- Well-understood architecture (simpler than original)
- No new technology dependencies
- Clear implementation path
- Early enough in project to pivot cleanly

### Timeline Impact

**Original Epic 1 Estimate:** 4-5 developer days (complex state management)
**Revised Epic 1 Estimate:** 3-4 developer days (simpler state management)
**Documentation Update Time:** 2 developer days

**Net Timeline Impact:** ±0 to +1 day (break even or slight improvement due to simplification)

**Sprint Status:** No impact on overall Magic Canvas delivery timeline

---

## 4. Detailed Change Proposals

### Change Proposal 1: PRD Functional Requirements

**File:** `docs/epics.md` (FR section, lines 18-141)

#### Modification 1.1: Canvas & Drawing (FR5, FR6)

**Location:** Lines 27-28

**OLD:**
```markdown
- FR5: Users can pan vertically through canvas
- FR6: Users can zoom in/out on canvas
```

**NEW:**
```markdown
- FR5: Users can switch between rows using gestures (swipe up/down) or keyboard (arrow keys)
- FR6: Users can zoom in/out on canvas (zoom only, no pan)
```

**Rationale:** Single-active-row model eliminates free panning; row switching replaces vertical navigation.

---

#### Modification 1.2: Row System (FR11, FR17, FR18)

**Location:** Lines 34-42

**OLD:**
```markdown
- FR11: Auto-assign elements to rows by Y-coordinate
- FR12: Each row has stable unique ID
- FR13: System maintains row metadata (position, elements, status, LaTeX)
- FR14: Row height for OCR is configurable
- FR15: Users see which row elements belong to
- FR16: Empty rows tracked but skipped in validation
- FR17: Rows stable through canvas transformations
- FR18: System detects element additions/removals
```

**NEW:**
```markdown
- FR11: Only the active row is editable; all other rows are read-only
- FR12: Each row has stable unique ID
- FR13: System maintains row metadata (position, active state, status, LaTeX)
- FR14: Row height for OCR is configurable
- FR15: Users see which row is active via visual highlight (border or background)
- FR16: Empty rows tracked but skipped in validation
- FR17: Active row is visually distinct from read-only rows
- FR18: System tracks row activation timeline for OCR attribution and erase operations
```

**Rationale:** Eliminate complex auto-assignment; active row becomes the single locus of control.

---

#### Addition 1.3: New Functional Requirements (after FR18)

**Location:** After line 42 (insert new section)

**ADD:**
```markdown
### Row Activation & Navigation (FR19-FR23)
- FR19: Users can activate a different row by tapping it, swiping vertically (touch), or using arrow keys (keyboard)
- FR20: When row activation changes, OCR is triggered on the previously active row (debounced 1.5s)
- FR21: Users can create new rows below the current active row via toolbar button or Down arrow on last row
- FR22: Read-only rows display strokes in a dimmed or locked visual state
- FR23: Erase operations only affect strokes in the currently active row
```

**Rationale:** Define new interaction model for single-active-row system.

---

### Change Proposal 2: Architecture Document

**File:** `docs/architecture.md`

#### Modification 2.1: Decision Summary Table

**Location:** Line 39 (Row Manager decision)

**OLD:**
```markdown
| **Row Manager** | Class-based with Map storage | New implementation | Epic 1 | Fast O(1) lookups, serializable, simple |
```

**NEW:**
```markdown
| **Row Manager** | Stateless active-row selector with timeline tracker | New implementation | Epic 1 | Single locus of control, simple state, timeline-based attribution |
```

**Rationale:** Reflect architectural simplification.

---

#### Modification 2.2: Epic 1 Architecture Components

**Location:** Lines 116-133

**OLD:**
```markdown
**Architectural Components:**
- `MagicCanvas.jsx` - Main page, embeds Excalidraw, hosts row lines overlay
- `rowManager.js` - RowManager class (Map-based storage)
- `useRowSystem.js` - React hook for state sync (Excalidraw ↔ RowManager ↔ IndexedDB)
- `RowHeader.jsx` - Status icon component
- IndexedDB store: `magic-canvas-state`

**Integration Points:**
- Excalidraw API: `onChange`, `updateScene`, `getSceneElements`
- Existing `workspaceDB.js`: Add `saveMagicCanvasState`, `loadMagicCanvasState`

**Key Decisions:**
- Row ID: `"row-${Math.floor(y / rowHeight)}"` (deterministic)
- Row height: 384px (matches OCR tile height)
- State sync: Unidirectional (Excalidraw → RowManager → IndexedDB)
- Persistence: Debounced 2s after last change
```

**NEW:**
```markdown
**Architectural Components:**
- `MagicCanvas.jsx` - Main page, embeds Excalidraw, hosts row lines overlay, manages active row
- `rowManager.js` - RowManager class (active row selector + activation timeline tracker)
- `useRowSystem.js` - React hook for row activation and read-only enforcement
- `RowHeader.jsx` - Status icon component with active row highlight
- `RowNavigator.jsx` - NEW: Gesture and keyboard handler for row switching
- IndexedDB store: `magic-canvas-state`

**Integration Points:**
- Excalidraw API: `onChange`, `updateScene`, constrained to active row bounds
- Existing `workspaceDB.js`: Add `saveMagicCanvasState`, `loadMagicCanvasState`

**Key Decisions:**
- Row ID: `"row-${index}"` (sequential, deterministic)
- Row height: 384px (matches OCR tile height)
- Active row: Only one row editable at a time, rest are read-only overlays
- Row switching: Gestures (swipe up/down) or keyboard (arrow keys) change active row
- OCR trigger: On row deactivation (when switching away from a row), debounced 1.5s
- State sync: Simple unidirectional (Active row content → Timeline → IndexedDB)
- Persistence: Debounced 2s after last change
```

**Rationale:** Reflect single-active-row architecture with new RowNavigator component.

---

#### Modification 2.3: Data Models - Row Interface

**Location:** Lines 590-617

**OLD:**
```javascript
class RowManager {
  rows: Map<string, Row>
  elementToRow: Map<string, string>
  rowHeight: number
  startY: number
}

interface Row {
  id: string
  yStart: number
  yEnd: number
  elementIds: Set<string>
  ocrStatus: 'pending' | 'processing' | 'complete' | 'error'
  validationStatus: 'pending' | 'processing' | 'validated' | 'invalid' | 'error'
  transcribedLatex: string | null
  validationResult: {
    equivalent: boolean
    method: string
    time: number
  } | null
  lastModified: Date
  tileHash: string | null
  errorMessage: string | null
}
```

**NEW:**
```javascript
class RowManager {
  rows: Map<string, Row>
  activeRowId: string | null
  activationTimeline: Array<{rowId: string, activatedAt: Date, deactivatedAt: Date | null}>
  rowHeight: number
  startY: number
}

interface Row {
  id: string
  yStart: number
  yEnd: number
  isActive: boolean
  ocrStatus: 'pending' | 'processing' | 'complete' | 'error'
  validationStatus: 'pending' | 'processing' | 'validated' | 'invalid' | 'error'
  transcribedLatex: string | null
  validationResult: {
    equivalent: boolean
    method: string
    time: number
  } | null
  activatedAt: Date | null
  errorMessage: string | null
}
```

**Rationale:** Remove complex element tracking (`elementIds`, `elementToRow`, `lastModified`), add active row state (`isActive`, `activatedAt`) and timeline.

---

#### Modification 2.4: RowManager Public API

**Location:** Lines 663-679

**OLD:**
```javascript
class RowManager {
  constructor({ rowHeight = 384, startY = 0 })

  getRowForY(y: number): Row
  assignElement(element: ExcalidrawElement): string
  getRow(rowId: string): Row | undefined
  updateRow(rowId: string, updates: Partial<Row>): void
  getAllRows(): Row[]
  getRowsInViewport(viewport: Viewport): Row[]
  removeElement(elementId: string): void
  serialize(): SerializedState
  deserialize(state: SerializedState): void
}
```

**NEW:**
```javascript
class RowManager {
  constructor({ rowHeight = 384, startY = 0 })

  setActiveRow(rowId: string): void
  getActiveRow(): Row | null
  createNewRow(): string
  getRow(rowId: string): Row | undefined
  updateRow(rowId: string, updates: Partial<Row>): void
  getAllRows(): Row[]
  getActivationTimeline(): Array<ActivationEvent>
  serialize(): SerializedState
  deserialize(state: SerializedState): void
}
```

**Rationale:** Simplified API focused on row activation, not element assignment. Remove viewport queries and element tracking methods.

---

#### Addition 2.5: New ADR for Architectural Pivot

**Location:** After ADR-005 (around line 990)

**ADD:**
```markdown
---

### ADR-006: Single-Active-Row Model Over Free-Drag Canvas

**Context:** Initial architecture allowed free canvas panning with automatic element-to-row assignment based on Y-coordinate. During Epic 1 design review, significant complexity was identified in state synchronization, attribution, and timeline tracking.

**Decision:** Pivot to single-active-row model where only one row is editable at a time, with gesture/keyboard navigation to switch between rows.

**Rationale:**
- **Simpler State Management:** Eliminates bidirectional element-to-row mapping and complex diff algorithms on every canvas change
- **Clearer Attribution:** Row activation timeline provides clean audit trail for OCR and erase operations
- **Better UX:** Explicit row selection gives users clear mental model and control
- **Faster Development:** Reduced complexity = fewer bugs, easier testing, faster implementation
- **Better Accessibility:** Arrow key navigation is more intuitive and keyboard-friendly than pan gestures
- **Predictable Behavior:** Strokes never move between rows, eliminating edge cases and user confusion

**Alternatives Considered:**
- **Keep Free-Drag Model:** Rejected due to high complexity and fragile state synchronization
- **Hybrid Model (pan + active row):** Rejected as it retains most of the complexity without clear UX benefit
- **Single-Row MVP Only:** Rejected as it doesn't solve the core problem, just defers it

**Consequences:**
- Users cannot pan vertically through canvas (minor UX trade-off)
- Users must explicitly switch rows using gestures/keyboard (actually improves clarity)
- RowManager implementation is dramatically simpler (major development win)
- OCR, validation, and persistence all benefit from simplified state model

**Status:** Accepted (2025-11-21)

---
```

**Rationale:** Document the architectural pivot for future reference and team alignment.

---

### Change Proposal 3: Epic 1 Stories

**File:** `docs/epics.md`

#### Modification 3.1: Story 1.2 Acceptance Criteria

**Location:** Lines 296-309 (Story 1.2: Integrate Excalidraw Canvas)

**OLD:**
```markdown
**And** I can draw strokes with mouse or stylus
**And** I can pan vertically by dragging with touch or mouse wheel
**And** I can zoom in/out using pinch gestures or Ctrl+scroll
**And** the canvas extends infinitely in the vertical direction
**And** horizontal extent is limited to reasonable width (e.g., 2000px)
**And** canvas background is white or light gray
**And** Excalidraw toolbar is minimal or hidden by default
```

**NEW:**
```markdown
**And** I can draw strokes with mouse or stylus (only in active row)
**And** I can zoom in/out using pinch gestures or Ctrl+scroll (zoom only, no vertical pan)
**And** I can switch between rows using swipe gestures (up/down) or arrow keys
**And** the canvas displays multiple rows vertically, with one row active at a time
**And** each row width is constrained to viewport width (no horizontal scroll)
**And** canvas background is white or light gray
**And** Excalidraw toolbar is minimal or hidden by default
```

**Rationale:** Remove pan, add row switching, constrain editing to active row, limit row width to viewport.

---

#### Modification 3.2: Story 1.4 - Complete Rewrite

**Location:** Lines 353-393 (Story 1.4: Implement RowManager Class)

**OLD (Acceptance Criteria - partial):**
```markdown
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
```

**NEW (Acceptance Criteria - complete replacement):**
```markdown
**And** `setActiveRow(rowId: string): void` - activates specified row for editing, deactivates previous active row
**And** `getActiveRow(): Row | null` - returns currently active row
**And** `createNewRow(): string` - creates new row below current active row, returns rowId
**And** `getRow(rowId: string): Row` - retrieves row metadata by ID
**And** `updateRow(rowId: string, updates: Partial<Row>): void` - updates row metadata
**And** `getAllRows(): Row[]` - returns all tracked rows
**And** `getActivationTimeline(): Array<ActivationEvent>` - returns row activation history with timestamps

**And** each Row object includes:
- `id`: string (stable unique identifier, format: "row-{index}")
- `yStart`: number (top Y coordinate)
- `yEnd`: number (bottom Y coordinate)
- `isActive`: boolean (true if this is the currently active row)
- `ocrStatus`: 'pending' | 'processing' | 'complete' | 'error'
- `validationStatus`: 'pending' | 'processing' | 'validated' | 'invalid' | 'error'
- `transcribedLatex`: string | null
- `activatedAt`: Date | null (when row was last activated)

**And** only one row can be active at a time (enforced by `setActiveRow`)
**And** row IDs remain stable across zoom/reload operations
**And** activation timeline tracks: `{rowId, activatedAt, deactivatedAt}` for each activation event
```

**Rationale:** Simplified RowManager focused on activation, not element tracking. API streamlined to core activation methods.

---

#### Modification 3.3: Story 1.5 - Complete Rewrite

**Location:** Lines 395-424 (Story 1.5: Automatically Assign Drawn Elements to Rows)

**OLD (Title and User Story):**
```markdown
### Story 1.5: Automatically Assign Drawn Elements to Rows

As a **user**,
I want **my drawn strokes to automatically belong to the correct row**,
So that **OCR processes the right content for each line**.
```

**NEW (Title and User Story):**
```markdown
### Story 1.5: Enforce Active Row Editing and Read-Only Rows

As a **user**,
I want **to draw only in the active row while other rows are read-only**,
So that **I have clear control over which mathematical expression I'm editing**.
```

**OLD (Acceptance Criteria - full replacement needed):**
```markdown
**Given** I draw on the Magic Canvas
**When** I create a new stroke element
**Then** the system automatically assigns it to the appropriate row based on its Y coordinate

**And** assignment happens within 100ms of stroke completion
**And** elements are assigned based on their center Y coordinate
**And** assignment updates if element is moved to different row
**And** assignment persists through pan/zoom operations
**And** erased elements are removed from their row's element list
**And** undo/redo operations correctly update row assignments
```

**NEW (Acceptance Criteria - complete replacement):**
```markdown
**Given** I am on the Magic Canvas with row 3 active
**When** I attempt to draw a stroke
**Then** the stroke is created only if it falls within the active row's bounds (Y: rowStart to rowEnd)

**And** strokes attempted outside the active row bounds are prevented or constrained to active row
**And** I see clear visual feedback indicating the active row (highlighted border, distinct background, or glow effect)
**And** all other rows display their existing content in a read-only state (dimmed, non-interactive)
**And** tapping/clicking on a non-active row switches it to active (deactivates current row)
**And** erasing only affects strokes in the currently active row
**And** undo/redo operations only affect the active row's content
**And** row boundaries are visually clear (ruled lines at Y: rowStart and rowEnd)
```

**Rationale:** Complete story rewrite for single-active-row model with read-only enforcement.

---

#### Modification 3.4: Story 1.8 - Complete Rewrite

**Location:** Lines 502-537 (Story 1.8: Handle Row Updates When Elements Are Moved)

**OLD (Title and User Story):**
```markdown
### Story 1.8: Handle Row Updates When Elements Are Modified or Moved

As a **user**,
I want **row assignments to update automatically when I move or edit strokes**,
So that **OCR and validation always process the current content**.
```

**NEW (Title and User Story):**
```markdown
### Story 1.8: Trigger OCR on Row Deactivation

As a **user**,
I want **OCR to process a row automatically when I finish working on it and switch to another row**,
So that **transcription happens seamlessly in the background**.
```

**OLD (Acceptance Criteria - full replacement needed):**
```markdown
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
```

**NEW (Acceptance Criteria - complete replacement):**
```markdown
**Given** I have drawn content in row 3 and it is currently active
**When** I switch to a different row (e.g., row 4) using gestures, keyboard, or tap
**Then** row 3 is deactivated and marked for OCR processing

**And** OCR triggers on row 3 after 1.5s debounce (if content changed since last OCR)
**And** row 4 becomes the new active row with visual highlight
**And** the activation event is logged in the timeline: `{rowId: 'row-4', activatedAt: Date.now(), deactivatedAt: null}`
**And** the previous activation event is updated: `{rowId: 'row-3', ..., deactivatedAt: Date.now()}`
**And** I can now draw only in row 4
**And** row 3 becomes read-only (dimmed, non-interactive)

**And** if I switch rows rapidly (multiple switches within 1.5s), only the final deactivated row triggers OCR
**And** if row content has not changed since last OCR, re-processing is skipped
**And** OCR failure on deactivated row does not block row switching
```

**Rationale:** Story now focuses on row switching and OCR triggering, not element movement.

---

#### Addition 3.5: New Story 1.9 - Row Switching

**Location:** After Story 1.8 (around line 537)

**ADD:**
```markdown
---

### Story 1.9: Implement Row Switching via Gestures and Keyboard

As a **user**,
I want **to switch between rows using intuitive gestures or keyboard shortcuts**,
So that **I can navigate my mathematical work efficiently**.

**Acceptance Criteria:**

**Given** I am on the Magic Canvas with multiple rows
**When** I use arrow keys (Up/Down) or swipe gestures (swipe up/down on touch device)
**Then** the active row changes to the adjacent row in the swipe/key direction

**And** Up arrow or swipe up activates the previous row (row N-1)
**And** Down arrow or swipe down activates the next row (row N+1)
**And** if pressing Up on row 0 (first row), no action occurs (already at top)
**And** if pressing Down on the last row, a new row is created and activated (see Story 1.10)
**And** row switching animation is smooth (200ms transition for visual highlight)
**And** tapping/clicking any row also activates it immediately
**And** swipe gesture requires minimum 50px vertical movement to trigger (prevents accidental activation)
**And** keyboard shortcuts work when canvas has focus

**Prerequisites:** Story 1.5 (read-only enforcement)

**Technical Notes:**
- Create `src/components/RowNavigator.jsx` component for gesture and keyboard detection
- Use touch event listeners (`touchstart`, `touchmove`, `touchend`) for swipe detection
- Keyboard event listener for arrow keys (Up, Down)
- Call `rowManager.setActiveRow(newRowId)` on navigation action
- Prevent default scroll behavior on arrow keys when canvas focused
- Smooth CSS transition for active row highlight (border or background color)

---
```

**Rationale:** New story for row navigation implementation.

---

#### Addition 3.6: New Story 1.10 - Row Creation

**Location:** After Story 1.9

**ADD:**
```markdown
### Story 1.10: Implement Row Creation Workflow

As a **user**,
I want **to create new rows below my current work**,
So that **I can continue my mathematical derivation**.

**Acceptance Criteria:**

**Given** I am on the Magic Canvas
**When** I press Down arrow or swipe down while on the last row
**Then** a new row is created immediately below the current last row

**And** the new row becomes the active row (previous row deactivated)
**And** the new row has a unique sequential ID (e.g., if last row was "row-4", new row is "row-5")
**And** the new row is positioned exactly 384px below the previous row (default spacing)
**And** I can immediately start drawing in the new row
**And** the new row is initialized with: `{ocrStatus: 'pending', validationStatus: 'pending', isActive: true}`

**Alternative Trigger:**
**When** I click a "New Row" button in the Magic Canvas toolbar
**Then** a new row is created below the currently active row and activated

**And** if creating a row mid-canvas (not at bottom), subsequent rows shift down by 384px (row height)
**And** existing row IDs remain stable (no renumbering)
**And** new row creation is logged in activation timeline

**Prerequisites:** Story 1.9 (row switching)

**Technical Notes:**
- Implement `rowManager.createNewRow()` method
- Auto-scroll viewport to show new row if created off-screen (smooth scroll animation)
- Update Excalidraw canvas height to accommodate new row
- Handle edge case: creating rows when approaching IndexedDB quota limit (warn user)
- Consider future enhancement: configurable row spacing (for now, fixed at 384px)

---
```

**Rationale:** New story for row creation workflow.

---

### Change Proposal 4: Epic 1 Tech Spec

**File:** `docs/sprint-artifacts/tech-spec-epic-1.md`

#### Modification 4.1: Services and Modules Table

**Location:** Lines 50-58

**OLD:**
```markdown
| Service/Module | Responsibility | Inputs | Outputs |
|----------------|----------------|--------|---------|
| MagicCanvas Component | Main page component, integrates Excalidraw and RowManager | Excalidraw events, user interactions | Updates to RowManager, canvas rendering |
| RowManager Class | Maintains row state and element assignments | Element changes, canvas state | Row metadata, element-row mappings |
| useRowSystem Hook | Synchronizes Excalidraw state with RowManager | Canvas state changes | Row state updates |
| RowHeader Component | Displays status icons for each row | Row status, user interactions | Visual feedback icons |
| IndexedDB Persistence Layer | Stores canvas and row state | State changes to persist | Saved state on reload |
```

**NEW:**
```markdown
| Service/Module | Responsibility | Inputs | Outputs |
|----------------|----------------|--------|---------|
| MagicCanvas Component | Main page, integrates Excalidraw, manages active row | Excalidraw events, row activation events | Active row updates, canvas rendering |
| RowManager Class | Manages active row selection and activation timeline | Row activation/deactivation events | Active row state, timeline events |
| useRowSystem Hook | Enforces active row editing and read-only rows | Canvas state changes, row switches | Active row updates, OCR triggers |
| RowHeader Component | Displays status icons with active row highlight | Row status, isActive flag | Visual feedback icons, highlight styling |
| RowNavigator Component | Handles gestures and keyboard for row switching | Touch events, keyboard events | Row activation commands |
| IndexedDB Persistence Layer | Stores canvas and row state | State changes to persist | Saved state on reload |
```

**Rationale:** Update services table to reflect simplified architecture and new RowNavigator component.

---

#### Modification 4.2: Data Models and Contracts - Row Interface

**Location:** Lines 61-98

**OLD:**
```javascript
// Row interface definition
interface Row {
  id: string                    // Stable unique identifier
  yStart: number               // Top Y coordinate
  yEnd: number                 // Bottom Y coordinate (yStart + rowHeight)
  elementIds: Set<string>      // IDs of Excalidraw elements in this row
  ocrStatus: 'pending' | 'processing' | 'complete' | 'error'
  validationStatus: 'pending' | 'processing' | 'validated' | 'invalid' | 'error'
  transcribedLatex: string | null
  validationResult: {
    equivalent: boolean
    method: string
    time: number
  } | null
  lastModified: Date
  tileHash: string | null
  errorMessage: string | null
}

// RowManager class structure
class RowManager {
  rows: Map<string, Row>           // All rows by ID
  elementToRow: Map<string, string> // Element ID to row ID mapping
  rowHeight: number               // Configurable row height (default 384px)
  startY: number                  // Starting Y position for first row

  getRowForY(y: number): Row | null
  assignElement(element: ExcalidrawElement): string
  getRow(rowId: string): Row | undefined
  updateRow(rowId: string, updates: Partial<Row>): void
  getAllRows(): Row[]
  getRowsInViewport(viewport: Viewport): Row[]
  removeElement(elementId: string): void
  serialize(): SerializedState
  deserialize(state: SerializedState): void
}
```

**NEW:**
```javascript
// Row interface definition
interface Row {
  id: string                    // Stable unique identifier (format: "row-{index}")
  yStart: number               // Top Y coordinate
  yEnd: number                 // Bottom Y coordinate (yStart + rowHeight)
  isActive: boolean            // True if this is the currently active row
  ocrStatus: 'pending' | 'processing' | 'complete' | 'error'
  validationStatus: 'pending' | 'processing' | 'validated' | 'invalid' | 'error'
  transcribedLatex: string | null
  validationResult: {
    equivalent: boolean
    method: string
    time: number
  } | null
  activatedAt: Date | null     // When row was last activated
  errorMessage: string | null
}

// RowManager class structure
class RowManager {
  rows: Map<string, Row>           // All rows by ID
  activeRowId: string | null       // ID of currently active row
  activationTimeline: Array<{      // Timeline of row activation events
    rowId: string,
    activatedAt: Date,
    deactivatedAt: Date | null
  }>
  rowHeight: number               // Configurable row height (default 384px)
  startY: number                  // Starting Y position for first row

  setActiveRow(rowId: string): void
  getActiveRow(): Row | null
  createNewRow(): string
  getRow(rowId: string): Row | undefined
  updateRow(rowId: string, updates: Partial<Row>): void
  getAllRows(): Row[]
  getActivationTimeline(): Array<ActivationEvent>
  serialize(): SerializedState
  deserialize(state: SerializedState): void
}
```

**Rationale:** Simplified data model removes element tracking, adds active state and timeline.

---

#### Modification 4.3: Workflows and Sequencing

**Location:** Lines 126-135 (Element Assignment Flow)

**OLD:**
```markdown
**Element Assignment Flow:**
1. User draws/creates element → Excalidraw onChange event fires
2. Detect new/modified elements
3. For each element, call `rowManager.assignElement(element)`
4. RowManager determines appropriate row based on element's center Y coordinate
5. Update element-to-row mapping
6. Set row's `lastModified` and reset OCR status to 'pending'
7. Debounce IndexedDB save (2s after last change)
```

**NEW:**
```markdown
**Row Activation Flow:**
1. User switches row (gesture/keyboard/tap) → RowNavigator detects action
2. Call `rowManager.setActiveRow(newRowId)`
3. Previous active row is deactivated:
   - Set `isActive = false`
   - Log deactivation in timeline: `{rowId, deactivatedAt: Date.now()}`
   - Trigger OCR on previous row (debounced 1.5s)
4. New row becomes active:
   - Set `isActive = true`
   - Set `activatedAt = Date.now()`
   - Log activation in timeline: `{rowId: newRowId, activatedAt: Date.now(), deactivatedAt: null}`
5. Update visual UI:
   - Highlight new active row (border or background)
   - Dim previous row (read-only visual state)
6. Excalidraw editing constrained to new active row bounds
7. Debounce IndexedDB save (2s after last change)
```

**Rationale:** Replace element assignment flow with row activation flow.

---

#### Modification 4.4: Acceptance Criteria Updates

**Location:** Lines 174-220

**Action:** Update multiple acceptance criteria to match Story changes:
- AC 5: Update to "Users can switch between rows using gestures or keyboard"
- AC 9: Update to "System enforces active row editing (only one row editable)"
- AC 16: Update to "System tracks row activation timeline for attribution"
- AC 17: Remove (no longer relevant)
- AC 18: Update to "Row activation triggers OCR on deactivated row"

---

## 5. Implementation Handoff

### Handoff Plan

**Change Scope Classification:** **Major** - Requires fundamental replan with PM/Architect involvement

**Responsible Parties:**

#### 1. Product Manager (John) - YOU
**Deliverables:**
- Update PRD functional requirements (FR5, FR11, FR17, FR18, add FR19-FR23)
- Validate MVP scope preservation
- Approve all PRD changes
- Sign off on overall change proposal

**Timeline:** 2 hours (documentation updates)

---

#### 2. Solution Architect (Winston)
**Deliverables:**
- Update Architecture document:
  - Decision Summary Table (Row Manager entry)
  - Epic 1 Architecture Components section
  - Data Models (Row interface, RowManager class)
  - API Contracts (RowManager Public API)
  - Add ADR-006 for architectural pivot
- Validate technical coherence across all epics
- Review and approve architecture changes

**Timeline:** 4 hours (architecture documentation)

---

#### 3. Scrum Master (Bob)
**Deliverables:**
- Update Epic 1 stories in `docs/epics.md`:
  - Modify Stories 1.2, 1.4, 1.5, 1.8 (Acceptance Criteria rewrites)
  - Add Stories 1.9 (Row Switching), 1.10 (Row Creation)
- Update Epic 1 Tech Spec (`docs/sprint-artifacts/tech-spec-epic-1.md`):
  - Services and Modules table
  - Data Models section
  - Workflows section
  - Acceptance Criteria mapping
- Update sprint-status.yaml (if exists) to reflect story changes
- Facilitate review and approval cycle

**Timeline:** 6 hours (story and tech spec updates)

---

#### 4. Development Team
**Deliverables:**
- AWAIT updated specifications before resuming implementation
- Review updated Architecture, Stories, and Tech Spec when ready
- Provide feedback on technical feasibility
- Implement Epic 1 stories following new architecture

**Timeline:** No immediate action required. Implementation resumes after specs approved (~3-4 days total for Epic 1).

---

### Success Criteria

**Documentation Complete:**
- ✓ PRD updated with new/modified FRs
- ✓ Architecture document reflects single-active-row model
- ✓ Epic 1 stories rewritten with new acceptance criteria
- ✓ Epic 1 Tech Spec updated with new workflows and data models
- ✓ All changes reviewed and approved by PM, Architect, SM

**Technical Validation:**
- ✓ Architecture coherence verified across all 6 epics
- ✓ No conflicting requirements between artifacts
- ✓ API contracts consistent with data models
- ✓ Implementation path clear and unambiguous

**Team Alignment:**
- ✓ All agents understand the architectural change and rationale
- ✓ Development team has reviewed and approved updated specs
- ✓ Timeline impact communicated (neutral to positive)

---

### Next Steps

1. **Immediate (Today):** BMad (user) reviews and approves this Sprint Change Proposal
2. **Day 1:** PM (John) updates PRD, Architect (Winston) updates Architecture document
3. **Day 2:** SM (Bob) updates Epic 1 stories and Tech Spec
4. **Day 2 (end):** Review cycle - PM, Architect, SM align on all changes
5. **Day 3:** Development team reviews updated specs, provides feedback
6. **Day 3+:** Resume Epic 1 implementation with corrected architecture

**Estimated Total Time to Resume Implementation:** 3 days (documentation + review)

---

## 6. Approval

**This Sprint Change Proposal requires explicit approval before implementation.**

**Approval Requested From:** BMad (Product Owner / User)

**Approve this proposal?** (yes/no/revise)

- **Yes:** Proceed with handoff to PM, Architect, and SM for documentation updates
- **No:** Provide feedback on concerns, return to analysis
- **Revise:** Specify which sections need adjustment

---

**Document Status:** ✅ APPROVED & EXECUTED
**Generated:** 2025-11-21
**Approved:** 2025-11-21 by BMad (Product Owner)
**Executed:** 2025-11-21
**Workflow:** Correct Course (Change Navigation)
**Agent:** John (Product Manager)

---

## Execution Summary

**Approval Process:**
- SM Agent: ✅ APPROVED - Timing optimal, net neutral timeline impact
- Architect Agent: ✅ APPROVED - Architecturally sound, 40% LOC reduction expected
- Product Owner (BMad): ✅ APPROVED - Execute all changes with SM and Architect consultation

**Changes Executed:**

1. ✅ **PRD.md** - Updated all functional requirements (FR5, FR6, FR11-FR23 renumbered to FR11-FR104, added 6 new FRs)
2. ✅ **architecture.md** - Updated Decision Summary, Epic 1 components, RowManager data structures, API contracts
3. ✅ **epics.md** - Updated Stories 1.2, 1.4, 1.5, 1.8; Added Stories 1.9 (Row Switching) and 1.10 (Row Creation); Updated Epic 1 Summary
4. ✅ **tech-spec-epic-1.md** - Updated Services table, Row Activation Flow

**Artifacts Preserved:**
- All original documentation archived via git history
- Sprint Change Proposal saved to docs/sprint-change-proposal-2025-11-21.md
- SM and Architect assessments included in proposal

**Next Steps:**
1. Team briefing on architectural changes (15 min standup)
2. Resume implementation with simplified single-active-row model
3. Epic 1 stories now ready for development with clearer, simpler design

---

Co-Authored-By: Claude <noreply@anthropic.com>
