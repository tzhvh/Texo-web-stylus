# Epic Technical Specification: Canvas Foundation & Row Management

Date: 2025-11-22
Author: BMad
Epic ID: epic-1
Status: Draft

---

## Overview

Epic 1 establishes the foundational canvas infrastructure and row management system for Magic Canvas, implementing the single-active-row architectural model that enables mindful mathematical note-taking. This epic creates the core drawing surface using Excalidraw, implements intelligent row boundaries with visual guidance, and builds the RowManager class that maintains row state and activation timeline. The foundation enables users to draw naturally with stylus or mouse within organized rows while maintaining clear visual separation between mathematical expressions.

The implementation leverages existing Texo infrastructure (Excalidraw integration, IndexedDB persistence, React patterns) while introducing novel patterns for row-based editing constraints and state synchronization. This epic provides the essential "paper" for the mathematical note-taking experience upon which subsequent OCR and validation features will build.

## Objectives and Scope

### In Scope
- Create Magic Canvas page accessible from main navigation with lazy loading
- Implement infinite vertical canvas with Excalidraw integration
- Build RowManager class with single-active-row constraint enforcement
- Render horizontal ruled lines for visual row guidance (384px spacing)
- Enable row switching via gestures (swipe) and keyboard (arrow keys)
- Display row status indicators with active row visual highlighting
- Persist canvas and row state across browser sessions using IndexedDB
- Trigger OCR processing on row deactivation with 1.5s debounce
- Implement row creation workflow for expanding canvas vertically
- Enforce read-only constraints on non-active rows

### Out of Scope
- OCR processing pipeline (Epic 2)
- Mathematical validation (Epic 3)
- Debug inspection panels (Epic 4)
- Workspace export/import (Epic 5)
- Settings panel and floating toolbar (Epic 6)
- Advanced tiling algorithms for wide expressions
- Glyph-level error highlighting
- Multi-user collaboration features

## System Architecture Alignment

This epic aligns with Texo's existing brownfield architecture by reusing core infrastructure while introducing targeted extensions:

**Reused Components:**
- Excalidraw canvas engine (already integrated in SketchPage)
- IndexedDB persistence patterns (workspaceDB.js)
- React functional component patterns and hooks
- Tailwind CSS styling system
- Vite build system and code splitting

**New Architecture Elements:**
- RowManager class implementing single-active-row state management
- Activation timeline tracking for OCR attribution
- Row-based coordinate constraints and visual feedback system
- Unidirectional state synchronization (Canvas → RowManager → IndexedDB)

**Integration Points:**
- Extends existing App.jsx routing with lazy-loaded MagicCanvas component
- Adds new IndexedDB stores to existing workspaceDB schema
- Follows established component patterns from SketchPage and ComposePage
- Maintains privacy-first client-side processing philosophy

The implementation preserves existing Texo functionality while adding the canvas foundation required for subsequent OCR and validation features.

## Detailed Design

### Services and Modules

| Module | Responsibility | Owner | Inputs | Outputs |
|--------|----------------|--------|--------|---------|
| MagicCanvas.jsx | Main page component, Excalidraw integration, row overlay rendering | Epic 1.1 | Route params, user interactions | Canvas state, active row events |
| RowManager | Row state management, activation timeline, single-active-row enforcement | Epic 1.4 | Row operations, element assignments | Row metadata, activation events |
| useRowSystem.js | React hook for row system orchestration | Epic 1.4 | Excalidraw API, user gestures | Row switching, read-only enforcement |
| RowHeader.jsx | Row status indicators, active row highlighting | Epic 1.6 | Row status, activation state | Visual feedback icons |
| RowNavigator.jsx | Gesture and keyboard handling for row navigation | Epic 1.9 | Touch events, keyboard events | Row activation commands |
| workspaceDB.js (extended) | Canvas and row state persistence | Epic 1.7 | RowManager state, canvas state | IndexedDB storage operations |

### Data Models and Contracts

#### Row Interface
```typescript
interface Row {
  id: string                    // Format: "row-{index}"
  yStart: number               // Top Y coordinate in canvas space
  yEnd: number                 // Bottom Y coordinate (yStart + rowHeight)
  isActive: boolean            // True if this is the currently active row
  ocrStatus: 'pending' | 'processing' | 'complete' | 'error'
  validationStatus: 'pending' | 'processing' | 'validated' | 'invalid' | 'error'
  transcribedLatex: string | null
  activatedAt: Date | null     // When row was last activated
  errorMessage: string | null
}
```

#### Activation Event
```typescript
interface ActivationEvent {
  rowId: string
  activatedAt: Date
  deactivatedAt: Date | null   // null for currently active row
}
```

#### RowManager State
```typescript
interface RowManagerState {
  rows: Map<string, Row>        // O(1) lookup by row ID
  activeRowId: string | null
  activationTimeline: Array<ActivationEvent>
  rowHeight: number            // Default: 384px (matches OCR tile height)
  startY: number               // Canvas Y coordinate of first row
}
```

#### IndexedDB Schema
```javascript
// Store: magic-canvas-state (key: 'current')
{
  canvasState: ExcalidrawScene,  // elements + appState
  rowManagerState: RowManagerState,
  timestamp: ISOString,
  version: 1
}
```

### APIs and Interfaces

#### RowManager Public API
```javascript
class RowManager {
  constructor({ rowHeight = 384, startY = 0 })
  
  setActiveRow(rowId: string): void
  getActiveRow(): Row | null
  createNewRow(): string              // Returns new rowId
  getRow(rowId: string): Row | undefined
  updateRow(rowId: string, updates: Partial<Row>): void
  getAllRows(): Row[]
  getActivationTimeline(): ActivationEvent[]
  serialize(): RowManagerState
  deserialize(state: RowManagerState): void
}
```

#### useRowSystem Hook API
```javascript
function useRowSystem(excalidrawAPI) {
  return {
    rowManager: RowManager,
    activeRow: Row | null,
    switchToRow: (rowId: string) => void,
    createNewRow: () => string,
    isRowActive: (rowId: string) => boolean
  }
}
```

#### Excalidraw Integration Points
```javascript
// Canvas constraints
onChange: (elements, state) => void    // Element assignment to rows
getSceneElements: () => ExcalidrawElement[]
updateScene: (scene) => void          // Restore saved state

// Spatial operations
getElementsInRow: (rowId: string) => ExcalidrawElement[]
constrainToActiveRow: (element) => ExcalidrawElement
```

#### IndexedDB Operations (workspaceDB.js extensions)
```javascript
async saveMagicCanvasState(canvasState, rowManagerState): Promise<void>
async loadMagicCanvasState(): Promise<{canvasState, rowManagerState}>
async clearMagicCanvasState(): Promise<void>
```

### Workflows and Sequencing

#### Row Activation Workflow
```
User Action (tap/swipe/arrow)
    ↓
RowNavigator detects gesture/keyboard
    ↓
rowManager.setActiveRow(newRowId)
    ↓
Previous row deactivated → OCR trigger (1.5s debounce)
    ↓
New row activated → Visual highlight update
    ↓
Canvas constraints updated → Only new row editable
    ↓
Timeline logged: {rowId, activatedAt, deactivatedAt}
```

#### Canvas State Synchronization
```
Excalidraw onChange Event
    ↓ (immediate, sync)
RowManager.assignElement() / updateRow()
    ↓ (debounced 2s, async)
IndexedDB.saveMagicCanvasState()
    ↓
Atomic write preserves consistency
```

#### Row Creation Workflow
```
User triggers row creation (Down arrow on last row or toolbar)
    ↓
rowManager.createNewRow() → Returns new rowId
    ↓
New row positioned below current active row
    ↓
rowManager.setActiveRow(newRowId)
    ↓
Canvas height adjusted, viewport scrolled to new row
    ↓
Previous row deactivated → OCR trigger
```

#### Page Load Restoration
```
Component Mount
    ↓
IndexedDB.loadMagicCanvasState()
    ↓
RowManager.deserialize(state)
    ↓
Excalidraw.updateScene(canvasState)
    ↓
Active row restored, visual highlights applied
    ↓
User can continue work seamlessly
```

## Non-Functional Requirements

### Performance

**Canvas Rendering Performance**
- Target: 60fps during drawing operations (16ms frame budget)
- Row switching animations: <200ms transition time
- Viewport scrolling to active row: <300ms smooth animation
- Canvas initialization: <500ms for typical canvas (<500 elements)

**State Management Performance**
- RowManager operations: O(1) lookup by row ID
- Element assignment to rows: <5ms per element
- State serialization: <50ms for typical canvas
- IndexedDB save operations: <100ms (debounced 2s)

**Memory Efficiency**
- RowManager memory usage: O(number of rows)
- Canvas element culling: Consider off-screen elements for future optimization
- Activation timeline storage: O(number of row switches)
- IndexedDB quota monitoring: Warn at 80% capacity

**Startup Performance**
- Magic Canvas page load: <500ms (lazy-loaded, code-split)
- First draw response: <100ms after page load
- State restoration: <1s for typical canvas
- Excalidraw initialization: <200ms

### Security

**Client-Side Processing**
- All row management and canvas operations happen in browser
- No network requests for row state or canvas data
- Consistent with Texo's privacy-first architecture

**Data Isolation**
- Row state stored in IndexedDB with origin isolation
- Canvas data not accessible to other websites
- Magic Canvas state separate from other Texo features

**Input Validation**
- Row ID format validation: "row-{index}" pattern only
- Coordinate bounds checking for row assignments
- Element type validation before row assignment

**State Integrity**
- Atomic IndexedDB writes prevent partial state corruption
- Schema versioning for future compatibility
- Corruption detection on load with fallback to empty canvas

**Export Security**
- Canvas export contains only vector paths and row metadata
- No executable code in exported JSON
- Import validation rejects malformed data structures

### Reliability/Availability

**State Persistence Reliability**
- Auto-save every 2 seconds after changes (max 2s data loss)
- Atomic IndexedDB writes prevent partial state corruption
- Corruption detection on load with graceful fallback
- Schema versioning supports future migrations

**Error Handling**
- Invalid row assignments logged and rejected gracefully
- Canvas state restoration failures fallback to empty canvas
- RowManager maintains invariants (single active row)
- Gesture recognition failures don't break row switching

**Degradation Behavior**
- If IndexedDB unavailable: Canvas works without persistence
- If Excalidraw fails: Display error message, allow retry
- If row creation fails: Log error, maintain existing rows
- Memory pressure: Limit row creation, suggest cleanup

**Recovery Mechanisms**
- Page reload restores last saved state automatically
- Crashed component recovery maintains row assignments
- Activation timeline reconstruction from row metadata
- Canvas element recovery from serialized state

### Observability

**Logging Requirements**
- Row activation/deactivation events with timestamps
- Canvas state save/load operations with duration
- Row creation and deletion operations
- Error conditions: invalid assignments, save failures
- Performance metrics: row switching time, state serialization time

**Debug Integration**
- Leverage existing DebugContext for debug mode toggle
- Integration with existing logger.js for structured logging
- Debug mode shows row boundaries and activation timeline
- Performance.mark() markers for row operations profiling

**State Visibility**
- Row status indicators provide real-time feedback
- Active row highlighting shows current editing context
- Activation timeline accessible for debugging OCR attribution
- Canvas state inspection through existing Database page

**Monitoring Signals**
- Row count and active row ID changes
- Canvas element count and memory usage
- IndexedDB storage quota utilization
- Error rates for row operations and persistence

## Dependencies and Integrations

### Existing Dependencies (Reused)
- **@excalidraw/excalidraw**: Canvas engine and drawing tools
- **React**: Component framework and hooks system
- **IndexedDB API**: Client-side persistence storage
- **Tailwind CSS**: Styling system for UI components

### New Dependencies
- **react-swipeable**: Touch gesture recognition for row switching
- No additional major dependencies required

### Integration Points

**With Existing Texo Infrastructure**
- Extend `src/App.jsx` routing with lazy-loaded MagicCanvas component
- Extend `src/utils/workspaceDB.js` for Magic Canvas state persistence
- Reuse existing `src/contexts/DebugContext.jsx` for debug mode
- Follow patterns from `src/pages/SketchPage.jsx` for Excalidraw integration

**Internal Component Integrations**
- MagicCanvas.jsx hosts Excalidraw and row overlay system
- RowManager provides state management to useRowSystem hook
- RowHeader components consume row state from RowManager
- RowNavigator handles gestures and delegates to RowManager

**Data Flow Integrations**
- Excalidraw onChange → RowManager element assignment
- RowManager state changes → IndexedDB persistence
- User gestures → RowNavigator → RowManager setActiveRow
- Row activation events → OCR pipeline trigger (Epic 2)

**Browser API Integrations**
- IndexedDB for state persistence
- Touch events for gesture recognition
- Keyboard events for arrow key navigation
- Canvas API for Excalidraw rendering

## Acceptance Criteria (Authoritative)

1. **Given** I am on any Texo page, **When** I click "Magic Canvas" in navigation, **Then** I am routed to `/magic-canvas` and see the Magic Canvas page without errors

2. **Given** I am on Magic Canvas page, **When** the page loads, **Then** I see an Excalidraw canvas that fills the viewport with horizontal ruled lines spaced 384px apart

3. **Given** row 3 is active, **When** I draw strokes, **Then** strokes are created only within row 3 bounds (Y: rowStart to rowEnd)

4. **Given** I am on Magic Canvas with multiple rows, **When** I use arrow keys (Up/Down) or swipe gestures, **Then** the active row changes to the adjacent row in the swipe/key direction

5. **Given** rows have various statuses, **When** I view the canvas, **Then** I see status icons at right edge of each row: Gray ∅ (pending), Orange ⟳ (processing), Green ✓ (validated), Red ✗ (invalid), Yellow ⚠️ (error)

6. **Given** I have drawn content with rows in various states, **When** I reload the page, **Then** the canvas restores all drawn strokes, row assignments, row statuses, active row, and zoom level within 1 second

7. **Given** I have drawn content in row 3 and it is active, **When** I switch to row 4, **Then** row 3 is marked for OCR processing after 1.5s debounce and row 4 becomes active with visual highlighting

8. **Given** I am on the last row, **When** I press Down arrow or swipe down, **Then** a new row is created below the current row with unique sequential ID and becomes active

9. **Given** row 3 is active, **When** I draw strokes, **Then** only row 3 is editable while all other rows display content in read-only state with dimmed appearance

10. **Given** I switch to off-screen row, **When** the activation changes, **Then** viewport automatically scrolls to center the newly active row with smooth animation

## Traceability Mapping

| AC | Spec Section | Component(s) | API(s) | Test Idea |
|----|---------------|--------------|--------|-----------|
| 1 | Overview, System Architecture | MagicCanvas.jsx, App.jsx | React Router | Navigate to Magic Canvas, verify route and lazy loading |
| 2 | Detailed Design - Services | MagicCanvas.jsx, RowHeader.jsx | Excalidraw API | Verify canvas fills viewport, ruled lines render correctly |
| 3 | Data Models, APIs | RowManager, useRowSystem | setActiveRow(), constrainToActiveRow() | Draw strokes outside active row, verify constraint enforcement |
| 4 | Workflows, APIs | RowNavigator, RowManager | switchToRow(), setActiveRow() | Test arrow keys and swipe gestures, verify row switching |
| 5 | Data Models, Services | RowHeader.jsx, RowManager | getRow(), updateRow() | Verify status icons appear correctly for each row state |
| 6 | Data Models, Workflows | workspaceDB.js, RowManager | saveMagicCanvasState(), loadMagicCanvasState() | Draw content, reload page, verify complete restoration |
| 7 | Workflows, APIs | RowManager, useRowSystem | setActiveRow(), updateRow() | Switch rows, verify 1.5s OCR trigger and status updates |
| 8 | Data Models, APIs | RowManager, RowNavigator | createNewRow(), setActiveRow() | Test row creation on last row, verify unique ID generation |
| 9 | Data Models, Services | useRowSystem, RowHeader.jsx | isRowActive(), updateRow() | Verify read-only enforcement and visual dimming of inactive rows |
| 10 | Workflows, APIs | RowNavigator, MagicCanvas.jsx | switchToRow(), viewport scroll | Test activation of off-screen rows, verify auto-scroll behavior |

## Risks, Assumptions, Open Questions

### Risks
1. **Performance Risk**: Excalidraw onChange events may fire frequently during drawing, potentially causing performance degradation with row assignment logic
   - **Mitigation**: Debounce row assignments, optimize element filtering, benchmark with complex drawings

2. **State Synchronization Risk**: Race conditions between Excalidraw canvas state and RowManager state could lead to inconsistencies
   - **Mitigation**: Implement unidirectional data flow, use atomic operations, add state validation

3. **Memory Risk**: Large canvases with many rows and elements could exceed browser memory limits
   - **Mitigation**: Implement element culling for off-screen content, monitor memory usage, set reasonable limits

4. **Touch Gesture Risk**: Swipe gestures may conflict with Excalidraw's native drawing gestures
   - **Mitigation**: Careful gesture threshold tuning, provide alternative keyboard navigation, test on various devices

### Assumptions
1. **Excalidraw API Stability**: Assuming Excalidraw's onChange event and spatial APIs remain stable and performant
2. **Browser Support**: Assuming target browsers support required APIs (IndexedDB, Touch Events, Canvas)
3. **User Hardware**: Assuming users have devices capable of smooth canvas rendering (tablets with stylus preferred)
4. **Row Height**: Assuming 384px row height provides adequate space for mathematical expressions while matching OCR tile dimensions

### Open Questions
1. **Row Height Configurability**: Should row height be user-configurable in Epic 1 or deferred to Epic 6 settings?
2. **Gesture Thresholds**: What are optimal swipe gesture thresholds to distinguish from drawing movements?
3. **Performance Baselines**: What are acceptable performance targets for canvas element count and row switching latency?
4. **Accessibility**: How should screen readers announce row switching and status changes for visually impaired users?

## Test Strategy Summary

### Unit Tests (Vitest)
- **RowManager class**: Test all public methods, state transitions, activation timeline tracking
- **Row assignment logic**: Test element filtering by Y-coordinate bounds, row ID generation
- **State serialization**: Test RowManager serialize/deserialize roundtrip
- **Utility functions**: Test coordinate calculations, row boundary detection

### Integration Tests (Manual Browser Testing)
- **Full row switching workflow**: Test gestures, keyboard navigation, visual feedback
- **Canvas state persistence**: Draw content, reload page, verify complete restoration
- **Read-only enforcement**: Verify only active row accepts new strokes, others are locked
- **Row creation workflow**: Test new row creation, positioning, activation
- **Performance validation**: Measure row switching latency, canvas rendering FPS

### Edge Case Testing
- **Boundary conditions**: First row, last row, single row canvas
- **Rapid interactions**: Quick row switching, simultaneous drawing and switching
- **Error scenarios**: Invalid row IDs, corrupted state recovery, IndexedDB failures
- **Memory stress**: Large canvas with many rows and elements

### Device Testing
- **Tablet with stylus**: Primary target device, test touch gestures and pressure sensitivity
- **Desktop browser**: Test keyboard navigation and mouse interactions
- **Mobile phone**: Test touch interface and smaller screen adaptations
- **Cross-browser**: Chrome, Firefox, Safari, Edge compatibility

### Performance Benchmarks
- **Canvas rendering**: Maintain 60fps during drawing operations
- **Row switching**: <200ms transition time, <300ms viewport scroll
- **State persistence**: <1s restoration time for typical canvas
- **Memory usage**: Monitor and validate reasonable memory consumption

### Accessibility Testing
- **Keyboard navigation**: Full functionality without touch/mouse
- **Screen reader compatibility**: Announce row changes and status
- **Color contrast**: Verify status icons meet WCAG AA standards
- **Touch target sizes**: Minimum 44x44px for all interactive elements