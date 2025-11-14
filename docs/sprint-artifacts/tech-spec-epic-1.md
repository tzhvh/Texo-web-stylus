# Epic Technical Specification: Canvas Foundation & Row System

Date: 2025-11-13
Author: BMad
Epic ID: epic-1
Status: Draft

---

## Overview

The Canvas Foundation & Row System epic establishes the core infrastructure for the Magic Canvas feature. This includes creating the drawing surface with infinite vertical scroll, implementing ruled horizontal lines for row guidance, and developing the RowManager system that automatically assigns drawn elements to rows based on Y-coordinate positioning. This epic provides the essential foundation upon which all other Magic Canvas functionality will be built.

The system leverages existing Texo infrastructure including Excalidraw for canvas rendering, IndexedDB for persistence, and the existing debugging context. The RowManager class will serve as the authoritative source for row state and will synchronize with both the canvas and persistent storage.

## Objectives and Scope

### In Scope
- Magic Canvas page creation with routing integration
- Excalidraw canvas with infinite vertical scroll
- Horizontal ruled lines for row guidance (default 384px spacing)
- RowManager class for tracking rows and their metadata
- Automatic assignment of drawn elements to rows based on Y-coordinate
- Visual status indicators at row edges
- Auto-save and restore of canvas and row state via IndexedDB
- Handling of element modifications, moves, and deletions in relation to row assignments
- Integration with existing Texo workspace system

### Out of Scope
- OCR processing pipeline (handled in Epic 2)
- Mathematical validation (handled in Epic 3)
- Advanced debugging features (handled in Epic 4)
- Complex user settings and toolbar (handled in Epic 6)

## System Architecture Alignment

The implementation aligns with the existing Texo architecture by reusing the Excalidraw component for canvas rendering and following established patterns for state management and persistence. The RowManager class will follow the existing pattern of using Map-based storage for efficient lookups (O(1)) and will integrate with existing IndexedDB utilities.

The architecture maintains separation of concerns with:
- Excalidraw handling canvas rendering and user input
- RowManager managing logical row state
- IndexedDB handling persistence
- React components orchestrating the interaction between these systems

All components will be developed as part of the existing Texo codebase without introducing new dependencies, maintaining the privacy-first, client-side only approach of the application.

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs |
|----------------|----------------|--------|---------|
| MagicCanvas Component | Main page component, integrates Excalidraw and RowManager | Excalidraw events, user interactions | Updates to RowManager, canvas rendering |
| RowManager Class | Maintains row state and element assignments | Element changes, canvas state | Row metadata, element-row mappings |
| useRowSystem Hook | Synchronizes Excalidraw state with RowManager | Canvas state changes | Row state updates |
| RowHeader Component | Displays status icons for each row | Row status, user interactions | Visual feedback icons |
| IndexedDB Persistence Layer | Stores canvas and row state | State changes to persist | Saved state on reload |

### Data Models and Contracts

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

### APIs and Interfaces

**RowManager Public API:**
- `constructor({ rowHeight: number, startY: number })` - Initialize with configuration
- `getRowForY(y: number): Row | null` - Get row for given Y coordinate
- `assignElement(element: ExcalidrawElement): string` - Assign element to row, return rowId
- `getRow(rowId: string): Row | undefined` - Get row by ID
- `updateRow(rowId: string, updates: Partial<Row>): void` - Update row state
- `getAllRows(): Row[]` - Get all rows
- `getRowsInViewport(viewport: Viewport): Row[]` - Get rows in visible area
- `removeElement(elementId: string): void` - Remove element from its row
- `serialize(): SerializedState` - Serialize state for persistence
- `deserialize(state: SerializedState): void` - Deserialize state from persistence

**useRowSystem Hook:**
- Returns: `{ rowManager, updateRow, getRowStatus, handleCanvasChange }`

### Workflows and Sequencing

**Canvas Initialization Flow:**
1. Component mounts → Initialize RowManager with default rowHeight (384px)
2. Load persisted canvas state from IndexedDB (if exists)
3. Deserialize canvas elements and row state
4. Initialize Excalidraw with loaded state
5. Synchronize RowManager with canvas state

**Element Assignment Flow:**
1. User draws/creates element → Excalidraw onChange event fires
2. Detect new/modified elements
3. For each element, call `rowManager.assignElement(element)`
4. RowManager determines appropriate row based on element's center Y coordinate
5. Update element-to-row mapping
6. Set row's `lastModified` and reset OCR status to 'pending'
7. Debounce IndexedDB save (2s after last change)

**State Persistence Flow:**
1. Any row/canvas state change → trigger debounced save
2. After 2s of inactivity → serialize RowManager state and Excalidraw canvas
3. Save to IndexedDB store: `magic-canvas-state` with key 'current'
4. Include timestamp and schema version for future compatibility

## Non-Functional Requirements

### Performance
- Element assignment: Complete within 100ms of stroke completion
- Canvas rendering: Maintain 60fps (16ms frame budget) during drawing
- State persistence: Save debounced after 2s, no frame drops
- Viewport rendering: Only render visible rows and status icons for large canvases (future enhancement)

### Security
- All data stored client-side in IndexedDB (no network calls)
- No executable code in persisted data (only canvas elements and row metadata)
- Import validation: Schema check on load, reject malformed data

### Reliability
- Auto-save to IndexedDB on every state change (debounced 2s)
- Atomic writes (entire state saves or nothing)
- Corruption detection on load (fallback to empty canvas)
- Error handling: Individual row errors don't block other rows or canvas operation

### Observability
- All state changes logged via existing logger.js system
- Performance measurements for critical operations (assignment time, persistence time)
- Debug mode integration to show tile boundaries and status details

## Dependencies and Integrations

- **Excalidraw**: Core canvas component, reused from existing Texo pages
- **IndexedDB**: Persistence via existing workspaceDB.js patterns
- **DebugContext**: Integration for debugging features and settings
- **React Context**: For passing state between components
- **Tailwind CSS**: For styling following existing Texo patterns
- **Vite**: Build system (no new dependencies)

## Acceptance Criteria (Authoritative)

1. Users can access Magic Canvas page from main navigation and route to `/magic-canvas`
2. Users can draw on infinite vertical canvas with stylus or mouse using Excalidraw
3. Canvas displays horizontal ruled lines as visual guides for row boundaries (default 384px spacing)
4. Users can customize row line spacing through settings
5. Users can pan vertically through canvas and zoom in/out
6. Canvas state (zoom level, pan position) persists across page reloads
7. Users can erase individual strokes and perform undo/redo actions
8. Canvas supports Excalidraw's native drawing tools (pen, highlighter, shapes, text)
9. System automatically assigns drawn elements to rows based on Y-coordinate
10. Each row has a stable unique ID that persists across pan/zoom/reload
11. System maintains row metadata including Y-position, element IDs, OCR status, validation status, and transcribed LaTeX
12. Row height for OCR processing is configurable (default 384px)
13. Users can see which row an element belongs to through visual status indicators
14. Empty rows (no content) are tracked but skipped during validation
15. Rows maintain stable IDs and assignments through canvas transformations
16. System detects when elements are added to or removed from a row
17. Status icons are positioned at row edge (canvasWidth - 60px, rowCenterY) with minimum 48x48px size
18. Green ✓ icon indicates row is ready for processing, red ✗ for errors, orange ⟳ for processing
19. Row state automatically saves to IndexedDB on changes with debounced 2s timing
20. Canvas state loads from IndexedDB on page reload preserving all elements and row assignments

## Traceability Mapping

| AC # | AC Description | Spec Section(s) | Component(s) | Test Idea |
|------|----------------|-----------------|--------------|-----------|
| 1 | Access Magic Canvas page | Overview, Objectives | MagicCanvas component | Manual navigation test |
| 2-8 | Canvas functionality | Detailed Design | Excalidraw integration | Manual canvas interaction test |
| 9 | Auto-assign elements | Workflows | RowManager, useRowSystem | Unit test element assignment logic |
| 10-13 | Row management | Data Models | RowManager class | Unit test RowManager methods |
| 14-16 | Row tracking | Detailed Design | RowManager, useRowSystem | Integration test element moves |
| 17 | Status indicators | Detailed Design | RowHeader component | Visual inspection test |
| 18 | Status icons | Data Models | Row status properties | UI rendering test |
| 19-20 | Persistence | Workflows | IndexedDB integration | Save/load functionality test |

## Risks, Assumptions, Open Questions

**Risk:** Canvas performance degrades with many elements (>500)
- Mitigation: Implement viewport culling for rendering (future enhancement)
- Next step: Benchmark with 500+ elements, optimize if needed

**Risk:** Row assignment algorithm not robust for all handwriting styles
- Mitigation: Test with diverse input during development, adjust algorithm if needed
- Next step: Create test corpus with various handwriting samples

**Assumption:** Excalidraw provides adequate performance for infinite canvas
- Verification: Performance test during implementation, fall back to alternative if needed

**Assumption:** Existing IndexedDB utilities scale to Magic Canvas data volumes
- Verification: Test with large canvas scenarios, monitor performance

**Question:** How to handle elements that span multiple rows?
- Next step: Implement to assign to primary row based on center Y coordinate

## Post-Review Follow-ups

**From Story 1.2 Code Review (2025-11-13):**
- Add useCallback wrappers for event handlers in MagicCanvas component (Performance optimization - React 18 best practice)
- Add error handling for Excalidraw API initialization (Resilience improvement)
- Add React error boundary for MagicCanvas route (Error recovery)
- Consider integration test for /magic-canvas route (Test coverage improvement)

**From Story 1.4 Code Review (2025-11-13):**
- Implement IndexedDB persistence integration via workspaceDB.js for RowManager state
- Create and integrate RowHeader component for visual status indicators at row edges
- Add performance optimizations (useCallback wrappers, error boundaries) in MagicCanvas
- Fix assignElement error handling consistency with test expectations
- Complete JSDoc documentation coverage for all RowManager methods

## Test Strategy Summary

**Unit Tests:**
- RowManager class methods (60% coverage minimum)
- Element assignment logic with various Y-coordinates
- State serialization/deserialization

**Integration Tests:**
- Canvas state persistence and restoration
- Element assignment with undo/redo operations
- Row status icon updates

**Manual Tests:**
- Full user workflow: draw → assign → reload → verify
- Edge cases: rapid drawing, large canvases, zoom/pan during drawing
- Performance: 60fps maintenance during normal usage

**Performance Tests:**
- Canvas with 500+ elements, measure frame rate
- State save/restore with large canvases, measure load times