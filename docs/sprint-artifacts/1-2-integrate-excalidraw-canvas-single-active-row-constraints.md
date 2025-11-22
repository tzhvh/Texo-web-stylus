# Story 1.2: Integrate Excalidraw Canvas with Single-Active-Row Constraints

Status: in-progress

## Story

As a **user**,
I want **an infinite vertical canvas where I can draw freely within the active row only**,
So that **I can write mathematical expressions without space constraints while maintaining clear row boundaries**.

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

- [ ] Task 1: Set up Excalidraw canvas integration (AC: 1, 7, 8)
  - [ ] Subtask 1.1: Import and configure @excalidraw/excalidraw in MagicCanvas.jsx
  - [ ] Subtask 1.2: Configure canvas to fill viewport with appropriate dimensions
  - [ ] Subtask 1.3: Set canvas background to white/light gray
  - [ ] Subtask 1.4: Minimize or hide Excalidraw toolbar by default
  - [ ] Subtask 1.5: Study existing SketchPage.jsx patterns for integration reference

- [ ] Task 2: Implement row-based drawing constraints (AC: 2, 9)
  - [ ] Subtask 2.1: Create row boundary detection logic (Y-coordinate filtering)
  - [ ] Subtask 2.2: Implement onChange handler to filter strokes by active row bounds
  - [ ] Subtask 2.3: Prevent or constrain strokes outside active row Y: rowStart to rowEnd
  - [ ] Subtask 2.4: Test constraint enforcement with various drawing scenarios

- [ ] Task 3: Enable zoom and viewport controls (AC: 3, 6)
  - [ ] Subtask 3.1: Configure zoom in/out with pinch gestures for touch devices
  - [ ] Subtask 3.2: Configure zoom in/out with Ctrl+scroll for desktop
  - [ ] Subtask 3.3: Ensure row width limited to viewport (no horizontal scroll)
  - [ ] Subtask 3.4: Test zoom behavior maintains row constraints

- [ ] Task 4: Implement multi-row display system (AC: 5, 10)
  - [ ] Subtask 4.1: Render multiple rows vertically on canvas
  - [ ] Subtask 4.2: Ensure only one row is active at a time (single-active-row model)
  - [ ] Subtask 4.3: Display horizontal ruled lines at row boundaries (Y: rowStart and rowEnd)
  - [ ] Subtask 4.4: Make row boundaries visually clear and distinct

- [ ] Task 5: Add row switching capabilities (AC: 4)
  - [ ] Subtask 5.1: Implement swipe gesture detection for vertical row switching
  - [ ] Subtask 5.2: Implement arrow key handling (Up/Down) for row switching
  - [ ] Subtask 5.3: Update active row highlighting when switching
  - [ ] Subtask 5.4: Maintain drawing constraints when switching between rows

- [ ] Task 6: Performance optimization and testing (AC: 1-10)
  - [ ] Subtask 6.1: Optimize for 60fps during drawing operations
  - [ ] Subtask 6.2: Test with various input methods (mouse, stylus, touch)
  - [ ] Subtask 6.3: Verify no memory leaks during extended drawing sessions
  - [ ] Subtask 6.4: Test edge cases (rapid drawing, boundary conditions)

## Dev Notes

### Architecture Patterns and Constraints
- Use @excalidraw/excalidraw package (already in dependencies)
- Configure Excalidraw with viewModeEnabled={false} to allow drawing
- Implement infinite canvas configuration with hidden UI chrome
- Study src/pages/SketchPage.jsx for existing Excalidraw integration patterns
- Implement drawing constraints in onChange handler (filter strokes by Y-coordinate bounds)
- Follow single-active-row architectural decision: "Only one row editable at a time"
- Performance target: 60fps during drawing operations

### Source Tree Components to Touch
- src/pages/MagicCanvas.jsx - Extend existing page with Excalidraw integration
- src/hooks/useRowSystem.js - NEW - Hook for row state management and constraints
- Study existing patterns in src/pages/SketchPage.jsx for Excalidraw integration
- Canvas state will be managed via React hooks (detailed in later stories)

### Testing Standards Summary
- Manual browser testing required for drawing constraints and row switching
- Verify 60fps performance during drawing operations
- Test with various input methods (mouse, stylus, touch)
- Ensure existing Texo pages remain functional (brownfield requirement)
- Test edge cases: drawing at row boundaries, rapid switching, zoom behavior

### Project Structure Notes

**Alignment with unified project structure:**
- Extends existing MagicCanvas.jsx component created in Story 1.1
- Follows established Excalidraw patterns from SketchPage.jsx
- No conflicts detected with existing file structure

**File Locations:**
- Main component: src/pages/MagicCanvas.jsx (extend existing)
- New hook: src/hooks/useRowSystem.js (for row constraints)
- Reference patterns: src/pages/SketchPage.jsx

### Learnings from Previous Story

**From Story 1-1-create-magic-canvas-page-routing (Status: done)**

- Magic Canvas page is fully functional with routing and navigation
- Excalidraw integration patterns are available in SketchPage.jsx for reference
- Lazy loading is working correctly - page loads in separate chunk
- No technical debt or warnings from previous implementation
- Use existing MagicCanvas.jsx as base, extend with Excalidraw integration

### References

- [Source: docs/epic_1_complete_breakdown.md#Story-12] - Story requirements and acceptance criteria
- [Source: docs/sprint-artifacts/tech-spec-epic-1.md#Detailed-Design] - Technical context and Excalidraw integration patterns
- [Source: docs/architecture.md#Project-Structure] - Architecture decisions and file structure
- [Source: docs/PRD.md#Canvas--Drawing-Capabilities] - Canvas drawing requirements (FR2, FR6, FR10)
- [Source: docs/sprint-artifacts/sprint-status.yaml] - Story tracking and status management

## Dev Agent Record

### Context Reference

- [1-2-integrate-excalidraw-canvas-single-active-row-constraints.context.xml](1-2-integrate-excalidraw-canvas-single-active-row-constraints.context.xml) - Generated story context with documentation artifacts, code analysis, dependencies, constraints, interfaces, and testing guidance

### Agent Model Used

Claude-3.5-Sonnet

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2025-11-22: Initial story creation from Epic 1.2 requirements