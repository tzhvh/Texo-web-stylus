# Epic 1: Canvas Foundation & Row Management

**Goal:** Create the drawing surface and intelligent row management system that serves as the foundation for all Magic Canvas functionality using the single-active-row architectural model.

**Business Value:** Users can access Magic Canvas, draw naturally with stylus/mouse, and organize their mathematical work into clear rows with intuitive navigation—the essential "paper" for mindful mathematical note-taking.

**Dependencies:** None (brownfield - Texo infrastructure already exists)

---

## Story 1.1: Create Magic Canvas Page and Routing

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
- Verify existing pages still function correctly (brownfield requirement)
- Lazy loading: `const MagicCanvas = React.lazy(() => import('./MagicCanvas.jsx'))`
- Route addition: `<Route path="/magic-canvas" element={<MagicCanvas />} />`
- Navigation integration: Add menu item with active state highlighting

---

## Story 1.2: Integrate Excalidraw Canvas with Single-Active-Row Constraints

As a **user**,
I want **an infinite vertical canvas where I can draw freely within the active row only**,
So that **I can write mathematical expressions without space constraints while maintaining clear row boundaries**.

**Acceptance Criteria:**

**Given** I am on the Magic Canvas page with row 3 active
**When** the page loads
**Then** I see an Excalidraw canvas that fills the viewport

**And** I can draw strokes with mouse or stylus only within row 3 bounds (Y: rowStart to rowEnd)
**And** I can zoom in/out using pinch gestures or Ctrl+scroll (zoom only, no vertical pan)
**And** I can switch between rows using swipe gestures (up/down) or arrow keys
**And** the canvas displays multiple rows vertically, with one row active at a time
**And** each row is limited to width of viewport (no horizontal scroll needed)
**And** canvas background is white or light gray
**And** Excalidraw toolbar is minimal or hidden by default
**And** attempts to draw outside active row bounds are prevented or constrained to active row bounds
**And** row boundaries are visually clear (horizontal ruled lines at Y: rowStart and rowEnd)

**Prerequisites:** Story 1.1

**Technical Notes:**
- Use `@excalidraw/excalidraw` package (already in dependencies)
- Configure Excalidraw with:
  - `viewModeEnabled={false}` (allow drawing)
  - Infinite canvas configuration
  - Hide unnecessary UI chrome
- Study `src/pages/SketchPage.jsx` for Excalidraw integration patterns
- Implement drawing constraints in onChange handler (filter strokes by Y-coordinate bounds)
- Canvas state will be managed via React hooks (detailed in later stories)
- Row bounds enforcement via coordinate filtering before stroke creation
- Row highlighting via CSS border or background color change
- Follow single-active-row architectural decision: "Only one row editable at a time"
- Performance target: 60fps during drawing operations

---

## Story 1.3: Render Horizontal Ruled Lines for Row Guidance

As a **user**,
I want **to see horizontal ruled lines on the canvas**,
So that **I know where each row boundary is located for organized writing**.

**Acceptance Criteria:**

**Given** I am on the Magic Canvas page
**When** the canvas renders
**Then** I see horizontal ruled lines spaced at regular intervals (default 384px apart)

**And** lines extend across the full width of the visible canvas
**And** lines are subtle (light gray, ~1px stroke)
**And** lines do not interfere with drawing (rendered as background layer)
**And** lines remain visible during zoom operations (maintain constant spacing in canvas coordinates)
**And** lines render performantly (60fps during zoom)
**And** active row has distinct visual highlighting (border or background tint)
**And** line spacing adjusts correctly when zoom level changes
**And** line spacing is configurable (default 384px, adjustable in settings)

**Prerequisites:** Story 1.2

**Technical Notes:**
- Render lines as SVG elements in Excalidraw background layer or custom overlay
- Default spacing: 384px (matches OCR tile height from FR14)
- Lines represent row boundaries for OCR processing
- Consider rendering only visible lines + buffer (performance optimization)
- Store line spacing in component state for later configurability (Story 6.2)
- Active row highlighting via CSS border or background color change
- Use requestAnimationFrame for smooth rendering during zoom
- Performance target: 60fps during zoom operations
- Follow single-active-row architectural decision: "Row height: 384px (matches OCR tile height)"

---

## Story 1.4: Implement RowManager Class with Single-Active-Row Model

As a **system component**,
I want **a RowManager class that manages active row selection and activation timeline**,
So that **row state can be managed consistently throughout the application**.

**Acceptance Criteria:**

**Given** the Magic Canvas page needs to track rows with single-active-row model
**When** RowManager is instantiated with configuration (row height, starting Y position)
**Then** it provides methods to:

**And** `setActiveRow(rowId: string): void` - activates specified row, deactivates previous
**And** `getActiveRow(): Row | null` - returns currently active row
**And** `createNewRow(): string` - creates new row below active row, returns rowId
**And** `getRow(rowId: string): Row` - retrieves row metadata by ID
**And** `updateRow(rowId: string, updates: Partial<Row>): void` - updates row metadata
**And** `getAllRows(): Row[]` - returns all tracked rows
**And** `getActivationTimeline(): Array<ActivationEvent>` - returns row activation history

**And** each Row object includes:
- `id`: string (stable unique identifier, format: "row-{index}")
- `yStart`: number (top Y coordinate)
- `yEnd`: number (bottom Y coordinate)
- `isActive`: boolean (true if this is the currently active row)
- `ocrStatus`: 'pending' | 'processing' | 'complete' | 'error'
- `validationStatus`: 'pending' | 'processing' | 'validated' | 'invalid' | 'error'
- `transcribedLatex`: string | null
- `activatedAt`: Date | null (when row was last activated)
- `errorMessage`: string | null

**And** only one row can be active at a time (enforced by `setActiveRow`)
**And** row IDs remain stable across zoom/reload operations
**And** activation timeline tracks: `{rowId, activatedAt, deactivatedAt}` for each activation event
**And** RowManager uses Map<string, Row> for O(1) lookups

**Prerequisites:** Story 1.3

**Technical Notes:**
- Create `src/utils/rowManager.js` (or `.ts` if using TypeScript)
- Row height configurable via constructor (default 384px)
- Use Map<string, Row> for O(1) lookups
- Row ID generation: Sequential IDs `"row-${index}"` for stability
- Activation timeline stored as array for OCR attribution and erase operations
- Follow single-active-row architectural decision: "Stateless active-row selector with timeline tracker"
- Remove complex element tracking (simplified from original auto-assignment model)
- Row interface designed for single-active-row constraint enforcement

---

## Story 1.5: Enforce Active Row Editing and Read-Only Rows

As a **user**,
I want **to draw only in the active row while other rows are read-only**,
So that **I have clear control over which mathematical expression I'm editing**.

**Acceptance Criteria:**

**Given** I am on the Magic Canvas with row 3 active
**When** I draw a stroke
**Then** the stroke is created only if it falls within the active row's bounds (Y: rowStart to rowEnd)

**And** strokes attempted outside the active row bounds are prevented or constrained to active row
**And** I see clear visual feedback indicating the active row (highlighted border or background)
**And** all other rows display their content in a read-only state (dimmed, non-interactive)
**And** tapping/clicking a non-active row switches it to active
**And** undo/redo operations only affect the active row's content
**And** erase operations only affect strokes in the currently active row
**And** row boundaries are visually clear (ruled lines at Y: rowStart and rowEnd)

**Prerequisites:** Story 1.2, Story 1.4

**Technical Notes:**
- Hook into Excalidraw's `onChange` event to detect scene changes
- Filter strokes based on Y-coordinate bounds of active row before creation
- Use Excalidraw's `locked` property to make inactive rows read-only
- Call `rowManager.setActiveRow(rowId)` on row tap/click
- Visual highlighting via custom SVG overlay or Excalidraw's selection API
- Implement row tap detection via bounding box click handling
- Enforce single-active-row constraint: only one row with `isActive: true` at any time
- Apply dimming/opacity styling to read-only rows via CSS overlays
- Follow single-active-row architectural decision: "Only active row is editable; all other rows are read-only"

---

## Story 1.6: Display Row Status Indicators with Active Row Highlight

As a **user**,
I want **to see visual indicators showing each row's status and which row is active**,
So that **I know the current state and can identify the active editing area**.

**Acceptance Criteria:**

**Given** rows have various statuses (pending, processing, validated, etc.) and one is active
**When** I view the canvas
**Then** I see a status icon at the right edge of each row, vertically centered

**And** icons are positioned at: `(canvasWidth - 60px, rowCenterY)`
**And** icons are 48x48px (exceeds 44x44px WCAG touch target minimum)
**And** active row has distinct visual highlighting (border or background color)
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
- Active row highlighting via CSS border or background color change
- CSS animations for fade-in and spinner rotation
- Tap detection handled in Story 4.1 (inspection panel)
- Position calculation: `iconX = canvasWidth - 60; iconY = (rowStart + rowEnd) / 2`
- Follow single-active-row architectural decision: "Visual feedback system (status icons)"

---

## Story 1.7: Persist Row State and Canvas State Across Reloads

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
**And** active row is restored (last active row becomes active again)
**And** zoom level is restored
**And** restoration completes within 1 second for typical canvas (<500 elements)
**And** if no previous state exists, canvas loads empty with default view
**And** corrupted state is detected and handled gracefully (fallback to empty canvas, log error)
**And** activation timeline is restored for OCR attribution

**Prerequisites:** Story 1.5, Story 1.6

**Technical Notes:**
- Use existing `src/utils/workspaceDB.js` or create new IndexedDB store: `magic-canvas-state`
- Store structure:
  - `canvasState`: Excalidraw scene JSON (elements, appState)
  - `rowState`: RowManager serialized state (all rows with metadata)
  - `activeRowId`: string (last active row)
  - `activationTimeline`: Array<ActivationEvent>
  - `timestamp`: Last modified time
- Auto-save on every significant change (debounced 2s)
- Load on component mount from IndexedDB
- Handle Excalidraw scene restoration via `initialData` prop
- Reconstruct RowManager from saved row state and activation timeline
- Schema versioning for future-proofing (v1 initially)
- Follow single-active-row architectural decision: "Unidirectional with debounced saves"
- Performance target: <1s restoration time for typical canvas

---

## Story 1.8: Trigger OCR on Row Deactivation

As a **user**,
I want **OCR to automatically process a row when I finish working on it and switch to another**,
So that **transcription happens seamlessly in the background**.

**Acceptance Criteria:**

**Given** I have drawn content in row 3 and it is currently active
**When** I switch to a different row (row 4) using gestures, keyboard, or tap
**Then** row 3 is deactivated and marked for OCR processing

**And** OCR triggers on row 3 after 1.5s debounce (if content changed since last OCR)
**And** row 4 becomes the new active row with visual highlighting
**And** the activation event is logged in the timeline: `{rowId: 'row-4', activatedAt: Date.now(), deactivatedAt: null}`
**And** the previous activation event is updated: `{rowId: 'row-3', ..., deactivatedAt: Date.now()}`
**And** I can now draw only in row 4
**And** row 3 becomes read-only (dimmed, non-interactive)
**And** OCR processing happens in the background without blocking row 4 drawing
**And** rapid row switching is debounced to prevent excessive OCR triggers

**Prerequisites:** Story 1.5, Story 1.7

**Technical Notes:**
- Hook into `rowManager.setActiveRow()` to detect row switches
- On deactivation: Set previous row's `ocrStatus = 'pending'` if content exists
- Debounce OCR trigger 1.5s after deactivation (allows rapid switching without waste)
- Log activation timeline event: `{rowId, activatedAt: Date.now(), deactivatedAt: Date.now()}`
- Check if row content hash changed before triggering OCR (avoid redundant processing)
- This sets up integration point for Epic 2 (OCR pipeline)
- Follow single-active-row architectural decision: "OCR trigger: On row deactivation"
- Timeline tracking provides clear attribution for OCR processing

---

## Story 1.9: Implement Row Switching via Gestures and Keyboard

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
**And** if pressing Down on the last row, a new row is created and activated (Story 1.10)
**And** row switching animation is smooth (200ms transition for visual highlight)
**And** tapping/clicking any row also activates it immediately
**And** viewport automatically scrolls to center active row when switching to off-screen rows
**And** screen readers announce "Row {N} of {total} active" on row switch (accessibility)
**And** swipe gesture requires minimum 50px vertical movement to trigger (prevents accidental activation)

**Prerequisites:** Story 1.5

**Technical Notes:**
- Create `src/components/RowNavigator.jsx` component for gesture and keyboard detection
- Use `react-swipeable` library for touch event handling (threshold: 50px vertical movement)
- Keyboard event listener for arrow keys (attach to canvas container)
- Call `rowManager.setActiveRow(newRowId)` on navigation
- Implement viewport auto-scroll with smooth scroll animation
- Add ARIA live region for screen reader announcements
- Prevent default scroll behavior on arrow keys when canvas focused
- Smooth CSS transition for active row highlight (border or background color)
- Follow single-active-row architectural decision: "Row switching via gestures and keyboard"
- Performance target: 200ms transition time, 60fps during animation

---

## Story 1.10: Implement Row Creation Workflow

As a **user**,
I want **to create new rows below my current work**,
So that **I can continue my mathematical derivation**.

**Acceptance Criteria:**

**Given** I am on the Magic Canvas
**When** I press Down arrow or swipe down while on the last row
**Then** a new row is created immediately below the current last row

**And** the new row becomes the active row
**And** the new row has a unique sequential ID (e.g., if last row was "row-4", new row is "row-5")
**And** the new row is positioned exactly 384px below the previous row (default spacing)
**And** I can immediately start drawing in the new row
**And** viewport auto-scrolls to show new row if created off-screen
**And** new row metadata initialized: `{ocrStatus: 'pending', validationStatus: 'pending', isActive: true}`

**Alternative Trigger:**
**When** I click a "New Row" button in the toolbar
**Then** a new row is created below the currently active row and activated

**And** if creating a row mid-canvas (not at the bottom), subsequent rows shift down by 384px (row height)
**And** existing row IDs remain stable (no renumbering)
**And** new row creation is logged in the activation timeline
**And** the previous active row is deactivated (triggers OCR per Story 1.8)

**Prerequisites:** Story 1.9

**Technical Notes:**
- Implement `rowManager.createNewRow()` method
- Generate sequential IDs: `row-${rows.size}` for stability
- Auto-scroll viewport to show new row if created off-screen
- Update Excalidraw canvas height to accommodate new row
- Handle edge case: creating rows when approaching IndexedDB quota limit (warn user)
- Consider future enhancement: configurable row spacing (for now, fixed at 384px)
- Add "New Row" button to MagicCanvasToolbar (minimalist icon, auto-hide)
- Row creation should not disrupt existing row content or states
- Timeline logging: `{rowId: 'new-row-5', activatedAt: Date.now(), deactivatedAt: null}`
- Follow single-active-row architectural decision: "Row creation workflow"
- Performance target: <100ms row creation time

---

## Epic 1 Summary

**Stories:** 10
**Estimated Complexity:** Medium (brownfield advantage - Excalidraw already integrated, IndexedDB utils exist)
**Architectural Model:** Single-active-row with activation timeline (simplified from auto-assignment)

**Key Deliverables:**
- Magic Canvas page accessible via navigation
- Multi-row canvas with one active row at a time
- RowManager class tracking active row and activation timeline
- Row switching via gestures (swipe) and keyboard (arrows)
- Row creation workflow
- Visual status indicators with active row highlighting
- Full state persistence with timeline tracking
- OCR triggers on row deactivation

**Testing Notes:**
- Unit tests: RowManager class methods (setActiveRow, getActiveRow, createNewRow, getActivationTimeline)
- Integration tests: Manual browser testing for row switching, active row enforcement, viewport scrolling
- Performance tests: Canvas with 20+ rows, smooth row switching animations
- Edge cases: Rapid row switching, boundary conditions (first/last row), undo/redo in active row
- Accessibility: Screen reader announcements, keyboard-only navigation

**Architectural Changes (2025-11-21 Course Correction):**
- Adopted single-active-row model (simplified state management)
- Added activation timeline for OCR attribution
- Added RowNavigator component for gesture handling
- Removed complex element-to-row assignment logic
- Simplified state sync (active row pointer instead of bidirectional mappings)