# Story 1.9: Implement Row Switching via Gestures and Keyboard

Status: drafted

## Story

As a **user**,
I want **to switch between rows using intuitive gestures or keyboard shortcuts**,
so that **I can navigate my mathematical work efficiently**.

## Acceptance Criteria

1. **Given** I am on the Magic Canvas with multiple rows, **When** I use arrow keys (Up/Down) or swipe gestures (swipe up/down on touch device), **Then** the active row changes to the adjacent row in the swipe/key direction

2. **And** Up arrow or swipe up activates the previous row (row N-1)

3. **And** Down arrow or swipe down activates the next row (row N+1)

4. **And** if pressing Up on row 0 (first row), no action occurs (already at top)

5. **And** if pressing Down on the last row, a new row is created and activated (Story 1.10 integration point)

6. **And** row switching animation is smooth (200ms transition for visual highlight)

7. **And** tapping/clicking any row also activates it immediately

8. **And** viewport automatically scrolls to center active row when switching to off-screen rows

9. **And** screen readers announce "Row {N} of {total} active" on row switch (accessibility)

10. **And** swipe gesture requires minimum 50px vertical movement to trigger (prevents accidental activation)

## Tasks / Subtasks

- [ ] Task 1: Create RowNavigator component for gesture and keyboard detection (AC: #1, #2, #3, #10)
  - [ ] Create `src/components/RowNavigator.jsx` component
  - [ ] Integrate `react-swipeable` library for touch event handling
  - [ ] Implement vertical swipe detection with 50px threshold
  - [ ] Attach keyboard event listener for arrow keys (Up/Down)
  - [ ] Prevent default scroll behavior on arrow keys when canvas focused
  - [ ] Call `rowManager.setActiveRow(newRowId)` on navigation
  - [ ] Unit test swipe threshold logic
  - [ ] Unit test keyboard navigation

- [ ] Task 2: Implement row tap/click activation (AC: #7)
  - [ ] Detect click events on row bounding box
  - [ ] Calculate which row was clicked based on Y-coordinate
  - [ ] Call `rowManager.setActiveRow(clickedRowId)`
  - [ ] Test row activation via tap/click
  - [ ] Ensure tap targets meet 44x44px minimum (WCAG)

- [ ] Task 3: Implement smooth row switching animation (AC: #6)
  - [ ] Add CSS transition for active row highlight (border or background color)
  - [ ] Target: 200ms transition duration
  - [ ] Ensure 60fps during animation (use CSS transforms, not layout properties)
  - [ ] Test animation performance on various devices
  - [ ] Verify no layout thrashing during rapid row switches

- [ ] Task 4: Implement viewport auto-scroll to active row (AC: #8)
  - [ ] Detect when new active row is off-screen
  - [ ] Calculate scroll position to center active row in viewport
  - [ ] Use smooth scroll animation (scrollIntoView with behavior: 'smooth')
  - [ ] Handle edge cases: first row, last row, very tall/short viewports
  - [ ] Test on different screen sizes (mobile, tablet, desktop)

- [ ] Task 5: Implement boundary conditions and edge cases (AC: #4, #5)
  - [ ] Handle Up arrow on row 0: no action (log event, show subtle feedback)
  - [ ] Handle Down arrow on last row: placeholder for Story 1.10 (create row workflow)
  - [ ] For MVP, Down on last row can be no-op or show message
  - [ ] Document integration point for Story 1.10: `rowManager.createNewRow()`
  - [ ] Test boundary conditions thoroughly

- [ ] Task 6: Implement accessibility announcements (AC: #9)
  - [ ] Create ARIA live region for row switch announcements
  - [ ] Update announcement on row change: "Row {N} of {total} active"
  - [ ] Test with screen readers (VoiceOver, NVDA, JAWS)
  - [ ] Ensure announcements don't spam on rapid switching (debounce 300ms)
  - [ ] Follow WCAG 2.1 Level AA guidelines

- [ ] Task 7: Integration testing and performance validation (AC: All)
  - [ ] End-to-end test: Switch rows using keyboard, verify active row changes
  - [ ] End-to-end test: Switch rows using swipe, verify active row changes
  - [ ] End-to-end test: Click/tap row, verify activation
  - [ ] Test viewport auto-scroll for off-screen rows
  - [ ] Test rapid row switching (keyboard spam, rapid swipes)
  - [ ] Performance test: Verify 60fps during animation (use DevTools Performance)
  - [ ] Performance test: Verify row switching latency <200ms (including OCR trigger from Story 1.8)
  - [ ] Accessibility test: Screen reader announcements work correctly
  - [ ] Test on touch devices (iPad, Android tablet, touch-enabled laptops)
  - [ ] Test on non-touch devices (desktop with keyboard/mouse)

## Dev Notes

### Architecture Context

This story implements the **row navigation system** for the single-active-row architectural model, enabling users to efficiently switch between rows using intuitive gestures and keyboard shortcuts. This builds on the RowManager foundation from Story 1.4 and integrates with the OCR triggering mechanism from Story 1.8.

**Key Architectural Decisions:**
- **Row switching via gestures and keyboard**: Swipe up/down or arrow keys change active row (architecture.md:356)
- **Active row highlight**: 200ms CSS transition for smooth visual feedback (architecture.md:357)
- **Viewport auto-scroll**: Center active row when switching to off-screen rows
- **Accessibility first**: Screen reader announcements follow WCAG 2.1 AA
- **Non-blocking design**: Row switching must remain smooth (<200ms) even with OCR trigger
- **Gesture threshold**: 50px vertical movement prevents accidental activation

**Integration Points:**
- Extends RowManager.setActiveRow() from Story 1.4 (already triggers OCR deactivation hook from Story 1.8)
- Integrates with visual highlighting from Story 1.6
- Creates integration point for Story 1.10 (row creation on Down from last row)
- Leverages existing Excalidraw event handling patterns
- Uses react-swipeable for gesture detection

### Learnings from Previous Story

**From Story 1.8 (Status: done)**

**Implementation Summary:**
- Story 1.8 implemented OCR trigger on row deactivation with 1.5s debounce
- RowManager.setActiveRow() extended with OCR trigger hook (lines 219-264)
- Content hash tracking prevents redundant OCR triggers
- Activation timeline logging for OCR attribution
- All 9 acceptance criteria met with comprehensive testing
- Performance target: Row switching remains <200ms with OCR trigger

**Key Files and Patterns to Reuse:**
- `src/utils/rowManager.js` - **REUSE** - setActiveRow() method is entry point for row switching
  - Lines 219-264: setActiveRow() manages active row state and triggers OCR hook
  - Will call this method from RowNavigator on keyboard/gesture events
  - OCR trigger already integrated, will fire automatically on row switch
- `src/hooks/useRowSystem.js` - **EXTEND** - Add navigation event handlers
  - Will need to integrate RowNavigator component's callbacks
  - May need to expose activeRowId for announcements
- `src/pages/MagicCanvas.jsx` - **EXTEND** - Integrate RowNavigator component
  - Will need to attach RowNavigator to canvas container
  - Ensure keyboard events reach RowNavigator when canvas focused
- `src/utils/logger.js` - **REUSE** - Log navigation events

**Architectural Patterns Established:**
- Row state management centralized in RowManager class
- setActiveRow() handles all state transitions (perfect for navigation)
- Activation timeline tracking for row switches (will capture navigation events)
- OCR trigger on deactivation (happens automatically when switching rows)
- Performance monitoring with warnings

**What This Story Should Do:**
Since RowManager.setActiveRow() is complete and already handles active row state transitions with OCR triggering, **Story 1.9 should**:
1. **Create RowNavigator component**: Detect gestures (swipe) and keyboard (arrows)
2. **Call setActiveRow()**: Leverage existing method to switch rows
3. **Smooth transitions**: CSS animation for active row highlight (200ms)
4. **Viewport auto-scroll**: Center active row when off-screen
5. **Accessibility**: ARIA live region for screen reader announcements
6. **Boundary handling**: Up on row 0, Down on last row (Story 1.10 integration)
7. **Performance**: Ensure row switching remains <200ms even with OCR trigger

**Testing Approach:**
Follow Story 1.8's comprehensive test pattern. Add unit tests for gesture detection and keyboard handling. Integration tests for row switching → active row update → OCR trigger flow. Performance tests to verify row switching latency remains <200ms. Accessibility tests with screen readers. Test on both touch and non-touch devices.

**Technical Debt from Previous Stories:**
None directly affecting Story 1.9. Story 1.8 is marked "done" and all RowManager functionality is stable. Story 1.9 can proceed building on this solid foundation.

[Source: stories/1-8-trigger-ocr-on-row-deactivation.md#Completion-Notes-List]

### Project Structure Notes

**Files to Create:**
- `src/components/RowNavigator.jsx` - **NEW** - Gesture and keyboard navigation component
- `src/components/RowNavigator.test.js` - **NEW** - Unit tests for navigation logic

**Files to Modify/Extend:**
- `src/pages/MagicCanvas.jsx` - **EXTEND** - Integrate RowNavigator component
- `src/hooks/useRowSystem.js` - **EXTEND** - Expose navigation handlers
- `src/utils/rowManager.js` - **REUSE** - Call setActiveRow() from navigation events

**Expected Component Integration:**
```
src/
├── pages/
│   └── MagicCanvas.jsx              # EXTEND - RowNavigator integration
├── components/
│   ├── RowNavigator.jsx             # NEW - Gesture/keyboard handling
│   └── RowNavigator.test.js         # NEW - Unit tests
├── hooks/
│   └── useRowSystem.js              # EXTEND - Navigation event handlers
├── utils/
│   └── rowManager.js                # REUSE - setActiveRow() method
```

### Technical Implementation Guidance

**RowNavigator Component (src/components/RowNavigator.jsx):**

```javascript
import React, { useEffect, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';

/**
 * RowNavigator - Handles row switching via gestures and keyboard
 * @param {Object} rowManager - RowManager instance
 * @param {Function} onRowChange - Callback when active row changes
 */
export default function RowNavigator({ rowManager, onRowChange, children }) {
  // Keyboard navigation
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const currentRow = rowManager.getActiveRow();
      if (!currentRow) return;

      const allRows = rowManager.getAllRows();
      const currentIndex = allRows.findIndex(r => r.id === currentRow.id);

      if (currentIndex > 0) {
        const previousRow = allRows[currentIndex - 1];
        rowManager.setActiveRow(previousRow.id);
        onRowChange?.(previousRow.id);
      }
      // If currentIndex === 0, do nothing (already at top)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const currentRow = rowManager.getActiveRow();
      if (!currentRow) return;

      const allRows = rowManager.getAllRows();
      const currentIndex = allRows.findIndex(r => r.id === currentRow.id);

      if (currentIndex < allRows.length - 1) {
        const nextRow = allRows[currentIndex + 1];
        rowManager.setActiveRow(nextRow.id);
        onRowChange?.(nextRow.id);
      } else {
        // TODO: Story 1.10 - Create new row here
        // rowManager.createNewRow();
        console.log('Down on last row - Story 1.10 integration point');
      }
    }
  }, [rowManager, onRowChange]);

  // Swipe gesture navigation
  const swipeHandlers = useSwipeable({
    onSwipedUp: () => {
      // Swipe up = activate next row (row N+1)
      const currentRow = rowManager.getActiveRow();
      if (!currentRow) return;

      const allRows = rowManager.getAllRows();
      const currentIndex = allRows.findIndex(r => r.id === currentRow.id);

      if (currentIndex < allRows.length - 1) {
        const nextRow = allRows[currentIndex + 1];
        rowManager.setActiveRow(nextRow.id);
        onRowChange?.(nextRow.id);
      }
    },
    onSwipedDown: () => {
      // Swipe down = activate previous row (row N-1)
      const currentRow = rowManager.getActiveRow();
      if (!currentRow) return;

      const allRows = rowManager.getAllRows();
      const currentIndex = allRows.findIndex(r => r.id === currentRow.id);

      if (currentIndex > 0) {
        const previousRow = allRows[currentIndex - 1];
        rowManager.setActiveRow(previousRow.id);
        onRowChange?.(previousRow.id);
      }
    },
    delta: 50, // Minimum 50px vertical movement to trigger
    trackMouse: false, // Only touch, not mouse drag
    trackTouch: true
  });

  // Attach keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div {...swipeHandlers} className="row-navigator">
      {children}
    </div>
  );
}
```

**Viewport Auto-scroll Utility (src/utils/scrollToRow.js - NEW):**

```javascript
/**
 * Scroll viewport to center active row
 * @param {string} rowId - Row ID to scroll to
 * @param {RowManager} rowManager - RowManager instance
 */
export function scrollToRow(rowId, rowManager) {
  const row = rowManager.getRow(rowId);
  if (!row) return;

  const rowCenterY = (row.yStart + row.yEnd) / 2;
  const viewportHeight = window.innerHeight;
  const targetScrollY = rowCenterY - viewportHeight / 2;

  window.scrollTo({
    top: targetScrollY,
    behavior: 'smooth'
  });
}
```

**ARIA Live Region for Accessibility (src/components/RowAnnouncer.jsx - NEW):**

```javascript
import React, { useEffect, useState } from 'react';
import { debounce } from 'lodash';

/**
 * RowAnnouncer - Screen reader announcements for row changes
 * @param {Object} activeRow - Current active row
 * @param {number} totalRows - Total number of rows
 */
export default function RowAnnouncer({ activeRow, totalRows }) {
  const [announcement, setAnnouncement] = useState('');

  // Debounced announcement (prevent spam on rapid switching)
  const announceRowChange = debounce((row, total) => {
    if (!row) return;
    const rowIndex = parseInt(row.id.split('-')[1], 10);
    setAnnouncement(`Row ${rowIndex + 1} of ${total} active`);
  }, 300);

  useEffect(() => {
    if (activeRow) {
      announceRowChange(activeRow, totalRows);
    }
  }, [activeRow, totalRows]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
```

**CSS Transition for Active Row Highlight:**

```css
/* Add to MagicCanvas.css or global styles */
.row-active {
  border: 2px solid #3b82f6; /* Blue border for active row */
  background-color: rgba(59, 130, 246, 0.05); /* Subtle blue tint */
  transition: border-color 200ms ease-in-out, background-color 200ms ease-in-out;
}

.row-inactive {
  border: 1px solid #e5e7eb; /* Gray border for inactive rows */
  background-color: transparent;
  opacity: 0.6; /* Dimmed appearance */
  transition: opacity 200ms ease-in-out;
}

/* Ensure smooth performance (GPU-accelerated) */
.row-active,
.row-inactive {
  will-change: border-color, background-color, opacity;
}
```

**Integration in MagicCanvas.jsx:**

```javascript
import RowNavigator from '@/components/RowNavigator';
import RowAnnouncer from '@/components/RowAnnouncer';
import { scrollToRow } from '@/utils/scrollToRow';

function MagicCanvas() {
  const { rowManager, activeRow } = useRowSystem(excalidrawAPI);
  const [totalRows, setTotalRows] = useState(0);

  const handleRowChange = (newRowId) => {
    // Update total rows count
    setTotalRows(rowManager.getAllRows().length);

    // Auto-scroll to center active row
    scrollToRow(newRowId, rowManager);

    // Log navigation event
    logger.log('Row navigation', { newRowId });
  };

  return (
    <RowNavigator rowManager={rowManager} onRowChange={handleRowChange}>
      <RowAnnouncer activeRow={activeRow} totalRows={totalRows} />
      {/* Excalidraw canvas and other components */}
    </RowNavigator>
  );
}
```

### Performance Considerations

- **Gesture detection**: react-swipeable uses passive event listeners, minimal overhead
- **Keyboard handling**: Single event listener at document level, preventDefault only for arrow keys
- **CSS transitions**: Use GPU-accelerated properties (border-color, background-color, opacity) for 60fps
- **Viewport scrolling**: Use native scrollIntoView() with smooth behavior, no custom animation
- **Row switching latency**: Target <200ms even with OCR trigger from Story 1.8
- **ARIA announcements**: Debounced 300ms to prevent spam on rapid switching

### Testing Strategy

**Unit Tests (Vitest):**
- RowNavigator keyboard handling (Up/Down arrows)
- Swipe gesture detection (50px threshold)
- Boundary conditions (Up on row 0, Down on last row)
- Announcement debouncing (no spam on rapid switches)

**Integration Tests (Manual):**
- End-to-end: Switch rows using keyboard, verify active row changes
- End-to-end: Switch rows using swipe, verify active row changes
- End-to-end: Click/tap row, verify activation
- Viewport auto-scroll for off-screen rows
- Rapid row switching (keyboard spam, rapid swipes)
- Accessibility: Screen reader announcements (VoiceOver, NVDA, JAWS)

**Performance Tests:**
- 60fps during row switching animation (DevTools Performance)
- Row switching latency <200ms (including OCR trigger)
- No layout thrashing during rapid switches (measure reflow/repaint)

**Accessibility Tests:**
- Screen reader announcements work correctly
- Keyboard-only navigation (no mouse/touch)
- WCAG 2.1 Level AA compliance
- Touch targets meet 44x44px minimum

### Security & Privacy

- Client-side only (no network calls)
- Navigation events logged locally via logger.js
- No sensitive data in ARIA announcements
- Follows Texo's privacy-first architecture

### References

- [Source: docs/epic_1_complete_breakdown.md:323-358] - Story 1.9 detailed requirements and acceptance criteria
- [Source: docs/architecture.md:356-357] - Row switching and animation timing
- [Source: stories/1-8-trigger-ocr-on-row-deactivation.md] - Previous story learnings, RowManager.setActiveRow() integration
- [Source: src/utils/rowManager.js:219-264] - setActiveRow() method to call from navigation events

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2025-11-22: Story drafted by SM agent (BMad) via create-story workflow (SESSION 1)
