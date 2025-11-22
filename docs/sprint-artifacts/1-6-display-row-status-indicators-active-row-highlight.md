# Story 1.6: Display Row Status Indicators with Active Row Highlight

Status: drafted

## Story

As a **user**,
I want **to see visual indicators showing each row's status and which row is active**,
So that **I know the current state and can identify the active editing area**.

## Acceptance Criteria

1. **Given** rows have various statuses (pending, processing, validated, etc.) and one is active, **When** I view the canvas, **Then** I see a status icon at the right edge of each row, vertically centered

2. **And** icons are positioned at: `(canvasWidth - 60px, rowCenterY)`

3. **And** icons are 48x48px (exceeds 44x44px WCAG touch target minimum)

4. **And** active row has distinct visual highlighting (border or background color)

5. **And** icons use clear, intuitive symbols:
   - Gray ∅: Row empty or pending
   - Orange ⟳ (spinning): Processing (OCR or validation)
   - Green ✓: Validated as correct
   - Red ✗: Validation failed
   - Yellow ⚠️: Parse error or warning

6. **And** icons fade in smoothly when status changes (200ms transition)

7. **And** icons don't interfere with drawing (rendered on separate layer)

8. **And** icons remain visible during zoom (scale with canvas)

9. **And** icons are tappable/clickable (44x44px tap target, will open inspection panel in Epic 4)

## Tasks / Subtasks

- [ ] Task 1: Create status icon component system (AC: 1, 3, 5)
  - [ ] Subtask 1.1: Create RowStatusIcon.jsx component with SVG icons for all status types
  - [ ] Subtask 1.2: Implement icon positioning logic at `(canvasWidth - 60px, rowCenterY)`
  - [ ] Subtask 1.3: Ensure 48x48px icon size with 44x44px tap target compliance
  - [ ] Subtask 1.4: Add smooth fade-in animations (200ms transitions)

- [ ] Task 2: Implement active row highlighting (AC: 4)
  - [ ] Subtask 2.1: Add visual highlighting for active row (border or background color)
  - [ ] Subtask 2.2: Ensure highlighting is distinct from non-active rows
  - [ ] Subtask 2.3: Update highlighting when active row changes
  - [ ] Subtask 2.4: Test highlighting visibility and accessibility

- [ ] Task 3: Integrate status overlay with Excalidraw canvas (AC: 1, 7, 8)
  - [ ] Subtask 3.1: Create overlay system separate from drawing elements
  - [ ] Subtask 3.2: Ensure icons don't interfere with drawing operations
  - [ ] Subtask 3.3: Implement zoom scaling for icon positions and sizes
  - [ ] Subtask 3.4: Test overlay performance during canvas interactions

- [ ] Task 4: Connect status icons to RowManager state (AC: 1, 5)
  - [ ] Subtask 4.1: Read row.ocrStatus and row.validationStatus from RowManager
  - [ ] Subtask 4.2: Map status combinations to appropriate icons
  - [ ] Subtask 4.3: Update icons when row status changes
  - [ ] Subtask 4.4: Handle status transitions with proper animations

- [ ] Task 5: Add tap detection foundation (AC: 9)
  - [ ] Subtask 5.1: Implement click handlers for status icons
  - [ ] Subtask 5.2: Ensure 44x44px tap target area
  - [ ] Subtask 5.3: Prepare integration points for Epic 4 inspection panel
  - [ ] Subtask 5.4: Test tap responsiveness and accessibility

- [ ] Task 6: Performance optimization and testing (AC: 6, 7, 8)
  - [ ] Subtask 6.1: Optimize icon rendering for 60fps during zoom/pan
  - [ ] Subtask 6.2: Test smooth transitions and animations
  - [ ] Subtask 6.3: Verify no interference with drawing performance
  - [ ] Subtask 6.4: Test with multiple rows and various status combinations

## Dev Notes

### Architecture Patterns and Constraints
- Render icons as SVG or React components overlaid on Excalidraw canvas
- Use Excalidraw's custom rendering API or separate React portal overlay
- Icons should be part of "validation feedback layer" (separate from drawing elements)
- Store icon state in RowManager: `row.ocrStatus` and `row.validationStatus` determine which icon to show
- Active row highlighting via CSS border or background color change
- CSS animations for fade-in and spinner rotation
- Position calculation: `iconX = canvasWidth - 60; iconY = (rowStart + rowEnd) / 2`
- Follow single-active-row architectural decision: "Visual feedback system (status icons)"

### Source Tree Components to Touch
- src/components/RowStatusIcon.jsx - NEW - Status icon component with SVG icons
- src/components/VisualFeedbackLayer.jsx - NEW - Overlay system for status indicators
- src/pages/MagicCanvas.jsx - Extend with status overlay integration
- src/utils/rowManager.js - Use existing row status properties
- src/hooks/useRowSystem.js - Integrate status updates with row system

### Testing Standards Summary
- Manual browser testing required for visual positioning and animations
- Verify 60fps performance during zoom operations
- Test with various row status combinations and transitions
- Ensure WCAG 44x44px touch target compliance
- Test accessibility with screen readers and keyboard navigation
- Verify icons don't interfere with drawing operations

### Project Structure Notes

**Alignment with unified project structure:**
- Extends existing MagicCanvas.jsx component with status overlay system
- Follows established React component patterns from existing codebase
- Integrates with existing RowManager class for state management
- No conflicts detected with existing file structure

**File Locations:**
- Main component: src/components/RowStatusIcon.jsx (NEW)
- Overlay system: src/components/VisualFeedbackLayer.jsx (NEW)
- Integration: src/pages/MagicCanvas.jsx (extend existing)
- State management: src/utils/rowManager.js (use existing)

### Learnings from Previous Story

**From Story 1-2-integrate-excalidraw-canvas-single-active-row-constraints (Status: done)**

- RowManager class is fully functional with active row state management
- MagicCanvas.jsx has robust row switching and gesture handling
- Drawing constraints and single-active-row model are working correctly
- Excalidraw integration patterns are established and tested
- Performance optimizations are in place for 60fps operations
- Use existing RowManager methods: setActiveRow(), getActiveRow(), isRowActive()
- Follow established patterns for React hooks and component integration
- Leverage existing debug panel for status information display

### References

- [Source: docs/epic_1_complete_breakdown.md#Story-16] - Story requirements and acceptance criteria
- [Source: docs/sprint-artifacts/tech-spec-epic-1.md#Detailed-Design] - Technical context and RowManager interface
- [Source: docs/architecture.md#Project-Structure] - Architecture decisions and component structure
- [Source: docs/PRD.md#Visual-Feedback-FR53-FR63] - Visual feedback requirements (FR53-FR63)
- [Source: docs/sprint-artifacts/sprint-status.yaml] - Story tracking and status management

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude-3.5-Sonnet

### Debug Log References

### Completion Notes List

### File List