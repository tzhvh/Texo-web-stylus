# Story 1.5: Enforce Active Row Editing and Read-Only Rows

Status: drafted

## Story

As a **user**,
I want **to draw only in the active row while other rows are read-only**,
so that **I have clear control over which mathematical expression I'm editing**.

## Acceptance Criteria

1. **Given** I am on the Magic Canvas with row 3 active, **When** I draw a stroke, **Then** the stroke is created only if it falls within the active row's bounds (Y: rowStart to rowEnd)

2. **And** strokes attempted outside the active row bounds are prevented or constrained to active row

3. **And** I see clear visual feedback indicating the active row (highlighted border or background)

4. **And** all other rows display their content in a read-only state (dimmed, non-interactive)

5. **And** tapping/clicking a non-active row switches it to active

6. **And** undo/redo operations only affect the active row's content

7. **And** erase operations only affect strokes in the currently active row

8. **And** row boundaries are visually clear (ruled lines at Y: rowStart and rowEnd)

## Tasks / Subtasks

- [ ] Task 1: Implement active row visual highlighting (AC: #3, #8)
  - [ ] Modify RowHeader.jsx to highlight active row with distinct border or background color
  - [ ] Add CSS styles for active row state (border: 2px solid blue or background tint)
  - [ ] Ensure ruled lines at rowStart and rowEnd are clearly visible
  - [ ] Test visual distinction is clear across zoom levels
  - [ ] Verify highlighting updates immediately on row activation

- [ ] Task 2: Implement stroke constraint to active row bounds (AC: #1, #2)
  - [ ] Hook into Excalidraw's onChange event to detect new elements
  - [ ] Add stroke validation function: checkStrokeInActiveRow(element, activeRow)
  - [ ] Filter elements by Y-coordinate bounds (element.y >= rowStart && element.y <= rowEnd)
  - [ ] Prevent creation or constrain Y-coordinates to active row bounds
  - [ ] Handle edge case: strokes that cross row boundary (constrain to active row)
  - [ ] Test constraint enforcement with various stroke types (line, curve, shape)

- [ ] Task 3: Implement read-only enforcement for inactive rows (AC: #4)
  - [ ] Add read-only overlay to inactive rows using custom SVG layer or Excalidraw locked property
  - [ ] Apply dimming/opacity styling to inactive row content (CSS: opacity 0.6)
  - [ ] Prevent editing operations on locked elements in inactive rows
  - [ ] Use Excalidraw's `locked` property to make inactive row elements non-editable
  - [ ] Test that inactive rows reject edit attempts gracefully
  - [ ] Verify content remains visible but clearly distinguished as read-only

- [ ] Task 4: Implement row tap/click activation (AC: #5)
  - [ ] Add click/tap event handler to row bounding boxes
  - [ ] Detect which row was tapped using Y-coordinate hit detection
  - [ ] Call rowManager.setActiveRow(rowId) on row tap
  - [ ] Update visual highlighting immediately on activation
  - [ ] Ensure 44x44px minimum tap target for accessibility
  - [ ] Test tap activation works consistently across different row states

- [ ] Task 5: Implement undo/redo constraint to active row (AC: #6)
  - [ ] Extend Excalidraw's undo/redo handler to filter by active row
  - [ ] Track element history per row in activation timeline
  - [ ] Undo operation reverts only elements created during current row activation
  - [ ] Redo operation restores only elements from current row's history
  - [ ] Test undo/redo isolation between rows
  - [ ] Verify row activation history preserved correctly

- [ ] Task 6: Implement erase constraint to active row (AC: #7)
  - [ ] Hook into Excalidraw's erase operation handler
  - [ ] Filter erased elements to only include those in active row
  - [ ] Prevent erase operations from affecting inactive row elements
  - [ ] Use Y-coordinate bounds to determine element eligibility for erasure
  - [ ] Test erase constraint across different element types
  - [ ] Verify inactive row content remains protected from erase

- [ ] Task 7: Integration testing and polish
  - [ ] End-to-end test: Draw in row 2, switch to row 3, verify row 2 is read-only
  - [ ] Test row switching doesn't disrupt constraint enforcement
  - [ ] Verify performance remains smooth (60fps) with constraints active
  - [ ] Test edge cases: single row, first row, last row
  - [ ] Verify accessibility: keyboard-only navigation works with constraints
  - [ ] Test on touch devices: tap activation and gesture recognition

## Dev Notes

### Architecture Context

This story implements the core interaction model for the single-active-row architectural pattern defined in `/docs/architecture.md`. By enforcing editing constraints on the active row and rendering inactive rows as read-only, we create clear boundaries for mathematical expression organization and enable precise OCR attribution through the activation timeline.

**Key Architectural Decisions:**
- **Single-active-row constraint**: Only one row editable at any time (ADR-001 in architecture.md:893)
- **Visual feedback system**: Active row highlighted, inactive rows dimmed (architecture.md:233-242)
- **Excalidraw integration**: Use onChange event filtering and locked property for read-only enforcement
- **Coordinate-based constraints**: Y-coordinate bounds determine stroke eligibility (architecture.md:162-177)
- **Activation timeline correlation**: Constraints tied to activation events for OCR attribution

**Integration Points:**
- Extends `useRowSystem` hook from Story 1.4 with constraint enforcement logic
- Integrates with RowManager's setActiveRow() to track activation state
- Uses Excalidraw's `locked` property and onChange filtering for read-only rows
- Provides foundation for OCR triggering workflow (Story 1.8)
- Enables undo/redo and erase operations scoped to active row context

### Learnings from Previous Story

**From Story 1.4 (Status: done)**

**Implementation Summary**:
- Story 1.4 implemented RowManager class with single-active-row model
- All 13 acceptance criteria met, comprehensive test coverage added
- RowManager provides setActiveRow(), getActiveRow(), updateRow() methods
- Activation timeline tracking fully implemented for OCR attribution

**Key Files and Patterns to Reuse**:
- `src/utils/rowManager.js` - EXISTING (545 lines) - RowManager class with full API
  - Lines 219-264: setActiveRow() method with single-active-row enforcement
  - Lines 261-319: Activation timeline tracking (use for constraint context)
  - Lines 358-367: getActivationTimeline() for debugging and OCR attribution
- `src/utils/__tests__/rowManager.test.js` - EXISTING - Comprehensive test patterns to follow
- `src/hooks/useRowSystem.js` - EXISTING - React hook for canvas-row synchronization
- `src/components/RowHeader.jsx` - EXISTING - Row status indicators (extend for highlighting)

**Architectural Patterns Established**:
- Single-active-row constraint enforced at RowManager level
- Row.isActive field tracks activation state
- Activation timeline provides chronological audit trail
- O(1) row lookups via Map<string, Row> data structure

**What This Story Should Do**:
Since RowManager and core row system exist from Story 1.4, **Story 1.5 should**:
1. **Extend visual feedback**: Add active row highlighting to RowHeader component
2. **Implement stroke constraints**: Filter Excalidraw onChange events by Y-coordinate bounds
3. **Enforce read-only state**: Use Excalidraw's locked property for inactive rows
4. **Add row activation by tap**: Implement click/tap detection and call rowManager.setActiveRow()
5. **Scope undo/redo**: Filter undo/redo operations to active row's element history
6. **Scope erase operations**: Prevent erase from affecting inactive row elements
7. **Integration test**: Verify end-to-end workflow with row switching and constraints

**Testing Approach**:
Follow Story 1.4's comprehensive unit test pattern. Add integration tests for constraint enforcement across row switches. Test visual feedback on multiple devices and screen sizes.

[Source: stories/1-4-implement-rowmanager-class-single-active-row-model.md#Completion-Notes-List]

### Project Structure Notes

**Files to Modify/Extend:**
- `src/hooks/useRowSystem.js` - **EXTEND** - Add stroke constraint logic, tap activation handler
- `src/components/RowHeader.jsx` - **EXTEND** - Add active row highlighting styles
- `src/pages/MagicCanvas.jsx` - **EXTEND** - Integrate constraint enforcement with Excalidraw onChange

**Expected Component Integration:**
```
src/
├── hooks/
│   └── useRowSystem.js              # EXTEND - Add constraint enforcement hooks
├── components/
│   └── RowHeader.jsx                # EXTEND - Add active row highlighting
├── pages/
│   └── MagicCanvas.jsx              # EXTEND - Wire up constraint handlers
├── utils/
│   └── rowManager.js                # REUSE - Already implements setActiveRow()
```

### Technical Implementation Guidance

**Stroke Constraint Implementation:**

```javascript
// src/hooks/useRowSystem.js

function useRowSystem(excalidrawAPI) {
  const rowManager = useRef(new RowManager());
  const activeRow = rowManager.current.getActiveRow();

  // Hook into Excalidraw onChange
  const handleSceneChange = useCallback((elements, appState) => {
    const newElements = elements.filter(el => {
      // Check if element is within active row bounds
      if (!activeRow) return false;

      const elementY = el.y + (el.height / 2); // Center Y coordinate
      return elementY >= activeRow.yStart && elementY <= activeRow.yEnd;
    });

    // Update scene with only valid elements
    if (newElements.length !== elements.length) {
      excalidrawAPI.updateScene({ elements: newElements });
    }
  }, [activeRow, excalidrawAPI]);

  // Row tap activation
  const handleRowTap = useCallback((event) => {
    const clickY = event.clientY; // Convert to canvas coordinates as needed
    const rows = rowManager.current.getAllRows();

    const targetRow = rows.find(row =>
      clickY >= row.yStart && clickY <= row.yEnd
    );

    if (targetRow && targetRow.id !== activeRow?.id) {
      rowManager.current.setActiveRow(targetRow.id);
    }
  }, [activeRow]);

  return {
    rowManager: rowManager.current,
    activeRow,
    handleSceneChange,
    handleRowTap
  };
}
```

**Active Row Visual Highlighting:**

```javascript
// src/components/RowHeader.jsx

export default function RowHeader({ row, isActive }) {
  const highlightStyle = isActive
    ? "border-2 border-blue-500 bg-blue-50 bg-opacity-10"
    : "opacity-60 bg-gray-100 bg-opacity-5";

  return (
    <div
      className={`absolute right-0 ${highlightStyle} transition-all duration-200`}
      style={{
        top: row.yStart,
        height: row.yEnd - row.yStart,
        width: '100%',
        pointerEvents: 'none'
      }}
    >
      {/* Status icon rendering */}
    </div>
  );
}
```

**Read-Only Enforcement:**

```javascript
// src/hooks/useRowSystem.js

function enforceReadOnlyRows(elements, activeRowId, rowManager) {
  return elements.map(el => {
    const elementRow = findRowByElement(el, rowManager);

    // Lock elements not in active row
    if (elementRow && elementRow.id !== activeRowId) {
      return { ...el, locked: true };
    }

    return { ...el, locked: false };
  });
}
```

**Undo/Redo Scoping:**

Leverage activation timeline to determine which elements belong to current row activation session. Filter undo/redo operations to only affect elements created during current activation period.

**Erase Operation Scoping:**

```javascript
function handleErase(erasedElements, activeRow) {
  return erasedElements.filter(el => {
    const elementY = el.y + (el.height / 2);
    return elementY >= activeRow.yStart && elementY <= activeRow.yEnd;
  });
}
```

### Performance Considerations

- **onChange filtering**: Minimize overhead by caching active row bounds
- **Visual highlighting**: Use CSS transitions (200ms) for smooth feedback
- **Tap detection**: Use efficient hit testing with bounding box checks
- **Locked elements**: Leverage Excalidraw's native locked property for performance
- **Target**: Maintain 60fps during drawing with constraint enforcement active

### Testing Strategy

**Unit Tests (Vitest):**
- Stroke constraint filtering by Y-coordinate bounds
- Read-only enforcement logic
- Row tap activation Y-coordinate detection
- Undo/redo filtering by activation timeline
- Erase operation scoping

**Integration Tests (Manual):**
- End-to-end: Draw in row 2, switch to row 3, verify row 2 is locked
- Visual feedback: Active row highlighting appears correctly
- Tap activation: Tapping inactive row switches activation
- Undo/redo scoping: Operations only affect active row
- Erase scoping: Erase only removes active row elements
- Edge cases: Single row, boundary rows, rapid switching

**Accessibility Tests:**
- Keyboard-only navigation with constraints
- Screen reader announcements for row activation
- Touch target size validation (44x44px minimum)
- Color contrast for active/inactive row distinction

### Security & Privacy

- Client-side only (no network calls)
- Constraint enforcement happens in browser memory
- No sensitive data in row activation state
- Follows Texo's privacy-first architecture

### References

- [Source: docs/epic_1_complete_breakdown.md:169-201] - Story 1.5 detailed requirements
- [Source: docs/sprint-artifacts/tech-spec-epic-1.md:66-176] - Epic 1 technical specification
- [Source: docs/architecture.md:113-138] - Single-active-row architectural model
- [Source: docs/PRD.md:502-530] - Row System functional requirements (FR11-FR23)
- [Source: stories/1-4-implement-rowmanager-class-single-active-row-model.md] - Previous story learnings

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

<!-- Log references will be added during implementation -->

### Completion Notes List

<!-- Implementation notes will be added during development -->

### File List

<!-- Files created/modified will be listed during implementation -->
