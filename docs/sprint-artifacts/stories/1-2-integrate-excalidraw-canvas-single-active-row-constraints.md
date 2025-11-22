# Story 1.2: Integrate Excalidraw Canvas with Single-Active-Row Constraints

Status: ready-for-dev

## Story

As a **user**,
I want **an infinite vertical canvas where I can draw freely within the active row only**,
so that **I can write mathematical expressions without space constraints while maintaining clear row boundaries**.

## Acceptance Criteria

1. **Given** I am on the Magic Canvas page with row 3 active, **When** the page loads, **Then** I see an Excalidraw canvas that fills the viewport

2. **And** I can draw strokes with mouse or stylus only within row 3 bounds (Y: rowStart to rowEnd)

3. **And** I can zoom in/out using pinch gestures or Ctrl+scroll (zoom only, no vertical pan)

4. **And** I can switch between rows using swipe gestures (up/down) or arrow keys

5. **And** the canvas displays multiple rows vertically, with one row active at a time

6. **And** each row is limited to width of viewport (no horizontal scroll needed)

7. **And** canvas background is white or light gray

8. **And** Excalidraw toolbar is minimal or hidden by default

9. **And** attempts to draw outside active row bounds are prevented or constrained to active row bounds

10. **And** row boundaries are visually clear (horizontal ruled lines at Y: rowStart and rowEnd)

## Tasks / Subtasks

- [ ] Task 1: Set up Excalidraw component in MagicCanvas page (AC: #1, #7, #8)
  - [ ] Import @excalidraw/excalidraw package
  - [ ] Configure Excalidraw component with viewModeEnabled={false}
  - [ ] Set canvas background to white or light gray
  - [ ] Hide or minimize Excalidraw toolbar UI chrome
  - [ ] Ensure canvas fills viewport (100vw x 100vh)

- [ ] Task 2: Implement multi-row canvas layout (AC: #5, #6, #10)
  - [ ] Render horizontal ruled lines at 384px intervals
  - [ ] Ensure lines extend across full viewport width
  - [ ] Style lines as subtle (light gray, 1px stroke)
  - [ ] Render lines in background layer (non-interactive)
  - [ ] Display multiple rows vertically
  - [ ] Constrain row width to viewport (no horizontal scroll)

- [ ] Task 3: Implement single-active-row constraint enforcement (AC: #2, #9)
  - [ ] Hook into Excalidraw onChange event
  - [ ] Filter stroke creation by Y-coordinate bounds of active row
  - [ ] Prevent strokes outside active row bounds
  - [ ] Constrain drawing to rowStart ≤ Y ≤ rowEnd
  - [ ] Mark non-active rows as read-only

- [ ] Task 4: Enable row switching capability (AC: #4, #5)
  - [ ] Implement swipe gesture detection (up/down)
  - [ ] Implement arrow key navigation (Up/Down)
  - [ ] Update active row state on switch
  - [ ] Ensure only one row is active at a time
  - [ ] Visual feedback on row switch (highlight border or background)

- [ ] Task 5: Implement zoom controls (AC: #3)
  - [ ] Enable zoom in/out via pinch gestures
  - [ ] Enable zoom via Ctrl+scroll
  - [ ] Disable vertical pan during zoom
  - [ ] Maintain row boundaries visibility during zoom

- [ ] Task 6: Testing and validation
  - [ ] Unit test: Row constraint enforcement logic
  - [ ] Integration test: Draw strokes in active row only
  - [ ] Integration test: Verify row switching updates active row
  - [ ] Manual test: Zoom functionality preserves row constraints
  - [ ] Performance test: 60fps during drawing operations
  - [ ] Edge case test: Attempt to draw outside active row bounds

## Dev Notes

### Architecture Context

This story implements the foundational single-active-row canvas using Excalidraw, following the architectural pattern defined in `/docs/architecture.md`.

**Key Architectural Decisions:**
- **Single-active-row model**: Only one row editable at any time (ADR-001 in architecture.md:893)
- **Row height**: 384px fixed (matches OCR tile height for Epic 2)
- **Row ID format**: `"row-${index}"` deterministic sequential IDs
- **Constraint enforcement**: Coordinate filtering in onChange handler before stroke creation
- **Performance target**: 60fps during drawing (16ms frame budget)

**Integration Points:**
- Reuse existing Excalidraw integration patterns from `src/pages/SketchPage.jsx`
- Follow existing Texo page structure and routing patterns
- Use Tailwind CSS for styling consistency
- Prepare for RowManager integration in Story 1.4

### Learnings from Previous Story

**From Story 1.1 (Status: done)**
- Story 1.1 implemented Magic Canvas page routing and navigation
- Assuming lazy-loaded component pattern is established at `src/pages/MagicCanvas.jsx`
- Navigation link added to main app header/menu
- Route configured in `src/App.jsx` as `/magic-canvas`

### Project Structure Notes

**Files to Create:**
- `src/pages/MagicCanvas.jsx` - Main canvas component (may exist from Story 1.1)

**Files to Modify (if needed):**
- `src/pages/MagicCanvas.jsx` - Add Excalidraw integration and row system

**Expected File Locations (from architecture.md:51-104):**
```
src/
├── pages/
│   └── MagicCanvas.jsx              # NEW/MODIFY - Main page
├── hooks/
│   └── useRowSystem.js              # FUTURE - Story 1.4
├── utils/
│   └── rowManager.js                # FUTURE - Story 1.4
├── components/
│   ├── RowHeader.jsx                # FUTURE - Story 1.6
│   └── RowNavigator.jsx             # FUTURE - Story 1.9
```

### Technical Implementation Guidance

**Excalidraw Configuration:**
```javascript
<Excalidraw
  viewModeEnabled={false}
  zenModeEnabled={true}
  gridModeEnabled={false}
  theme="light"
  onChange={handleCanvasChange}
  initialData={{
    appState: {
      viewBackgroundColor: "#ffffff"
    }
  }}
/>
```

**Row Constraint Enforcement:**
- Hook into `onChange` event to capture new strokes
- Filter elements by Y-coordinate bounds: `rowStart ≤ element.y ≤ rowEnd`
- Reject or constrain strokes outside active row bounds
- Row bounds calculated as: `yStart = rowIndex * 384`, `yEnd = yStart + 384`

**Horizontal Ruled Lines:**
- Render as SVG overlay on Excalidraw canvas background
- Spacing: 384px intervals (row height)
- Style: Light gray (#e0e0e0), 1px stroke width
- Performance: Use requestAnimationFrame for smooth rendering during zoom

**Row Switching (Basic Implementation):**
- Arrow key handlers: Up (activate row N-1), Down (activate row N+1)
- Swipe gesture detection: Vertical swipe threshold 50px minimum
- Active row tracking: Simple state variable `activeRowIndex` (RowManager comes in Story 1.4)
- Visual feedback: Highlight active row with subtle border or background tint

### Performance Considerations

- Target: 60fps (16ms frame budget) during drawing
- Debounce expensive operations (row constraint checks on rapid strokes)
- Use efficient Y-coordinate filtering (simple comparison, no iteration)
- Ruled line rendering: Only render visible lines + buffer (viewport culling)
- Zoom operations: Maintain constant line spacing in canvas coordinates

### Testing Strategy

**Unit Tests:**
- Row constraint logic: Verify strokes outside bounds are rejected
- Y-coordinate filtering: Test boundary conditions (on line, above, below)
- Row switching: Test index updates and bounds recalculation

**Integration Tests:**
- Draw strokes in active row: Verify strokes created successfully
- Draw strokes outside active row: Verify prevention/constraint behavior
- Row switching: Verify active row changes and visual feedback updates
- Zoom functionality: Verify row boundaries remain consistent

**Performance Tests:**
- Measure frame rate during continuous drawing (target: 60fps)
- Profile onChange handler execution time (target: <5ms)
- Test with complex drawings (100+ elements) to verify performance

### Security & Privacy

- Client-side only (no network calls)
- Canvas data remains in browser memory
- Follows Texo's privacy-first architecture

### References

- [Source: docs/architecture.md#Epic-1-Canvas-Foundation] - Epic 1 architecture and decisions
- [Source: docs/epic_1_complete_breakdown.md:43-80] - Story 1.2 detailed requirements
- [Source: docs/sprint-artifacts/tech-spec-epic-1.md] - Epic 1 technical specification
- [Source: src/pages/SketchPage.jsx] - Existing Excalidraw integration patterns
- [Source: docs/architecture.md:113-138] - Epic 1 architectural components and decisions

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/stories/1-2-integrate-excalidraw-canvas-single-active-row-constraints.context.xml`

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

<!-- Log references will be added during implementation -->

### Completion Notes List

<!-- Completion notes will be added after implementation -->

### File List

<!-- File changes will be tracked during implementation -->
