# Story 1.10: Implement Row Creation Workflow

Status: ready-for-dev

## Story

As a **user**,
I want **to create new rows below my current work**,
so that **I can continue my mathematical derivation**.

## Acceptance Criteria

1. **Given** I am on the Magic Canvas, **When** I press Down arrow or swipe down while on the last row, **Then** a new row is created immediately below the current last row

2. **And** the new row becomes the active row

3. **And** the new row has a unique sequential ID (e.g., if last row was "row-4", new row is "row-5")

4. **And** the new row is positioned exactly 384px below the previous row (default spacing)

5. **And** I can immediately start drawing in the new row

6. **And** viewport auto-scrolls to show new row if created off-screen

7. **And** new row metadata initialized: `{ocrStatus: 'pending', validationStatus: 'pending', isActive: true}`

8. **Alternative Trigger: When** I click a "New Row" button in the toolbar, **Then** a new row is created below the currently active row and activated

9. **And** if creating a row mid-canvas (not at the bottom), subsequent rows shift down by 384px (row height)

10. **And** existing row IDs remain stable (no renumbering)

11. **And** new row creation is logged in the activation timeline

12. **And** the previous active row is deactivated (triggers OCR per Story 1.8)

## Tasks / Subtasks

- [ ] Task 1: Implement RowManager.createNewRow() method (AC: #1, #2, #3, #4, #7, #10, #11, #12)
  - [ ] Add createNewRow() method to RowManager class in src/utils/rowManager.js
  - [ ] Generate sequential row IDs: `row-${rows.size}` for stability
  - [ ] Calculate Y position: lastRow.yEnd (or startY if no rows exist)
  - [ ] Initialize new row metadata with all required fields
  - [ ] Call setActiveRow(newRowId) to activate and trigger OCR on previous row
  - [ ] Log activation timeline event
  - [ ] Return newRowId for caller to use
  - [ ] Unit test createNewRow() creates row with correct ID, position, and metadata

- [ ] Task 2: Integrate row creation trigger in RowNavigator (AC: #1, #2, #4, #5, #6)
  - [ ] Update RowNavigator component (src/components/RowNavigator.jsx)
  - [ ] Remove placeholder comment for Down on last row (Story 1.9 integration point)
  - [ ] Call rowManager.createNewRow() when Down pressed on last row
  - [ ] Call auto-scroll utility (scrollToRow) to center new row in viewport
  - [ ] Test keyboard navigation: Down on last row creates new row
  - [ ] Test swipe navigation: Swipe down on last row creates new row
  - [ ] Verify viewport auto-scrolls to show new row

- [ ] Task 3: Create "New Row" toolbar button (AC: #8)
  - [ ] Create MagicCanvasToolbar component (src/components/MagicCanvasToolbar.jsx)
  - [ ] Add "+ Row" button with minimalist icon
  - [ ] Button calls rowManager.createNewRow() and scrollToRow()
  - [ ] Auto-hide toolbar after 3 seconds of inactivity (Epic 6 pattern)
  - [ ] Ensure button is accessible (44x44px tap target, keyboard accessible)
  - [ ] Test toolbar button creates row below currently active row
  - [ ] Test toolbar remains accessible on small screens

- [ ] Task 4: Handle mid-canvas row creation and row shifting (AC: #9, #10)
  - [ ] Update createNewRow() to accept optional insertAfterRowId parameter
  - [ ] If insertAfterRowId provided, shift all subsequent rows down by 384px
  - [ ] Preserve existing row IDs (no renumbering, just Y position updates)
  - [ ] Update Excalidraw canvas height to accommodate shifted rows
  - [ ] Test mid-canvas insertion: Create row between row-2 and row-3
  - [ ] Verify row-3, row-4, etc. shift down but keep IDs stable
  - [ ] Test canvas height adjustment handles extreme cases (100+ rows)

- [ ] Task 5: Ensure OCR trigger and state persistence (AC: #11, #12)
  - [ ] Verify setActiveRow() call triggers OCR on deactivated row (Story 1.8)
  - [ ] Test activation timeline logs new row creation event
  - [ ] Verify new row state persists to IndexedDB via auto-save (Story 1.7)
  - [ ] Test row creation → reload page → new row restored correctly
  - [ ] Test rapid row creation (spam Down key) doesn't corrupt state

- [ ] Task 6: Integration testing and performance validation (AC: All)
  - [ ] End-to-end test: Down arrow on last row creates new row
  - [ ] End-to-end test: Swipe down on last row creates new row
  - [ ] End-to-end test: Toolbar button creates new row
  - [ ] Test mid-canvas insertion and row shifting
  - [ ] Test viewport auto-scroll for off-screen row creation
  - [ ] Performance test: Row creation completes <100ms
  - [ ] Test activation timeline logging
  - [ ] Test IndexedDB persistence after row creation
  - [ ] Test OCR trigger on previous row after creation
  - [ ] Test boundary conditions (create 100+ rows, memory usage)

## Dev Notes

### Architecture Context

This story implements the **row creation workflow** for the single-active-row architectural model, enabling users to expand the canvas vertically by creating new rows below their current work. This completes the core row management system from Epic 1 by providing the final piece: row lifecycle management (creation, activation, deactivation).

**Key Architectural Decisions:**
- **Sequential row IDs**: `row-${index}` format ensures stable, predictable identifiers (architecture.md:131)
- **Row spacing**: Fixed 384px matches OCR tile height for consistent layout (architecture.md:132)
- **Row creation workflow**: Creates row below active row, auto-activates, triggers OCR on previous (epics.md:594)
- **Performance target**: <100ms row creation time (epics.md:595)
- **Mid-canvas insertion**: Subsequent rows shift down by rowHeight, IDs remain stable
- **Activation timeline**: Row creation logged for debugging and attribution

**Integration Points:**
- Extends RowManager.setActiveRow() from Story 1.4 (triggers OCR from Story 1.8)
- Integrates with RowNavigator from Story 1.9 (Down on last row integration point)
- Uses scrollToRow() utility from Story 1.9 for viewport auto-scroll
- Leverages IndexedDB persistence from Story 1.7 (auto-save new rows)
- Prepares for toolbar integration in Epic 6 (MagicCanvasToolbar component)

### Learnings from Previous Story

**From Story 1.9 (Status: review)**

**Implementation Summary:**
- Story 1.9 implemented row switching via gestures and keyboard
- RowNavigator component created with react-swipeable integration
- Keyboard handling (Up/Down arrows) with boundary condition checks
- Viewport auto-scroll utility (scrollToRow) for centering active row
- ARIA live region for screen reader announcements
- All 10 acceptance criteria met with comprehensive testing
- 200ms CSS transition for smooth row highlighting

**Key Files and Patterns to Reuse:**
- `src/components/RowNavigator.jsx` - **EXTEND** - Row navigation component
  - Lines 218-233: Down arrow handler with Story 1.10 integration point placeholder
  - Lines 252-266: Swipe down handler, parallel logic to keyboard
  - **REMOVE** placeholder comment: `// TODO: Story 1.10 - Create new row here`
  - **ADD** call to rowManager.createNewRow() when on last row
  - Pattern: Check if on last row, call createNewRow(), trigger auto-scroll
- `src/utils/scrollToRow.js` - **REUSE** - Viewport centering utility
  - Lines 294-306: scrollToRow() function for smooth scroll to active row
  - Call this after createNewRow() to center new row in viewport
- `src/utils/rowManager.js` - **EXTEND** - Row state management
  - **ADD** createNewRow(insertAfterRowId?: string): string method
  - Method should generate sequential ID, initialize metadata, call setActiveRow()
  - Follow existing patterns: setActiveRow() (lines 219-264), getActiveRow(), etc.
- `src/pages/MagicCanvas.jsx` - **EXTEND** - Main canvas page
  - Will need to integrate MagicCanvasToolbar component
  - Pass rowManager and scrollToRow to toolbar for "+ Row" button

**Architectural Patterns Established:**
- Row state management centralized in RowManager class
- setActiveRow() handles all state transitions (perfect for row creation)
- Activation timeline tracking (will capture creation events)
- Viewport auto-scroll pattern for off-screen rows
- CSS transitions for smooth visual feedback (200ms)

**What This Story Should Do:**
Since RowNavigator and RowManager are complete with clear integration points, **Story 1.10 should**:
1. **Implement createNewRow()**: Generate sequential ID, position below last row, initialize metadata
2. **Activate via RowNavigator**: Call createNewRow() when Down pressed on last row
3. **Create toolbar button**: MagicCanvasToolbar with "+ Row" button (minimalist, auto-hide)
4. **Handle mid-canvas insertion**: Optional insertAfterRowId parameter, shift subsequent rows
5. **Ensure OCR trigger**: setActiveRow() call triggers OCR on deactivated row (automatic)
6. **Verify persistence**: IndexedDB auto-save captures new rows (existing from Story 1.7)
7. **Log timeline**: Activation timeline tracks row creation events

**Testing Approach:**
Follow Story 1.9's comprehensive test pattern. Add unit tests for createNewRow() method. Integration tests for row creation → activation → OCR trigger → persistence flow. Performance tests to verify row creation <100ms. Test mid-canvas insertion and row shifting logic. Test boundary conditions (create 100+ rows, memory usage).

**Technical Debt from Previous Stories:**
- Story 1.9 is marked "review" (AC #5 has placeholder for Story 1.10 integration)
- This story COMPLETES that integration point, fulfilling AC #5 of Story 1.9
- No other technical debt affecting Story 1.10

[Source: stories/1-9-implement-row-switching-via-gestures-keyboard.md#Completion-Notes-List]

### Project Structure Notes

**Files to Create:**
- `src/components/MagicCanvasToolbar.jsx` - **NEW** - Toolbar with "+ Row" button

**Files to Modify/Extend:**
- `src/utils/rowManager.js` - **EXTEND** - Add createNewRow() method
- `src/components/RowNavigator.jsx` - **EXTEND** - Replace placeholder with createNewRow() call
- `src/pages/MagicCanvas.jsx` - **EXTEND** - Integrate MagicCanvasToolbar component

**Expected Component Integration:**
```
src/
├── pages/
│   └── MagicCanvas.jsx              # EXTEND - Toolbar integration
├── components/
│   ├── RowNavigator.jsx             # EXTEND - Call createNewRow()
│   └── MagicCanvasToolbar.jsx       # NEW - "+ Row" button
├── utils/
│   ├── rowManager.js                # EXTEND - createNewRow() method
│   └── scrollToRow.js               # REUSE - Auto-scroll utility
```

### Technical Implementation Guidance

**RowManager.createNewRow() Method (src/utils/rowManager.js):**

```javascript
class RowManager {
  // ... existing methods ...

  /**
   * Create a new row below the currently active row or at the end
   * @param {string} insertAfterRowId - Optional row ID to insert after (default: last row)
   * @returns {string} New row ID
   */
  createNewRow(insertAfterRowId = null) {
    const allRows = this.getAllRows();

    // Determine insertion point
    let insertIndex = allRows.length; // Default: append at end
    let yPosition = this.startY + (allRows.length * this.rowHeight);

    if (insertAfterRowId) {
      const insertAfterIndex = allRows.findIndex(r => r.id === insertAfterRowId);
      if (insertAfterIndex !== -1) {
        insertIndex = insertAfterIndex + 1;
        const insertAfterRow = allRows[insertAfterIndex];
        yPosition = insertAfterRow.yEnd; // Position right below specified row

        // Shift all subsequent rows down by rowHeight
        for (let i = insertIndex; i < allRows.length; i++) {
          const row = allRows[i];
          row.yStart += this.rowHeight;
          row.yEnd += this.rowHeight;
          this.rows.set(row.id, row); // Update in Map
        }
      }
    }

    // Generate sequential ID
    const newRowId = `row-${this.rows.size}`;

    // Initialize new row metadata
    const newRow = {
      id: newRowId,
      yStart: yPosition,
      yEnd: yPosition + this.rowHeight,
      isActive: false, // Will be set true by setActiveRow() below
      ocrStatus: 'pending',
      validationStatus: 'pending',
      transcribedLatex: null,
      activatedAt: null,
      errorMessage: null
    };

    this.rows.set(newRowId, newRow);

    // Activate new row (triggers OCR on previous active row via Story 1.8)
    this.setActiveRow(newRowId);

    logger.log('Row created', {
      rowId: newRowId,
      yPosition,
      insertAfter: insertAfterRowId || 'end'
    });

    return newRowId;
  }
}
```

**RowNavigator Integration (src/components/RowNavigator.jsx):**

```javascript
// Update Down arrow handler (lines 217-234)
} else if (event.key === 'ArrowDown') {
  event.preventDefault();
  const currentRow = rowManager.getActiveRow();
  if (!currentRow) return;

  const allRows = rowManager.getAllRows();
  const currentIndex = allRows.findIndex(r => r.id === currentRow.id);

  if (currentIndex < allRows.length - 1) {
    // Not on last row → Switch to next row
    const nextRow = allRows[currentIndex + 1];
    rowManager.setActiveRow(nextRow.id);
    onRowChange?.(nextRow.id);
  } else {
    // On last row → Create new row (Story 1.10)
    const newRowId = rowManager.createNewRow();
    onRowChange?.(newRowId);

    // Auto-scroll to new row
    import('@/utils/scrollToRow').then(({ scrollToRow }) => {
      scrollToRow(newRowId, rowManager);
    });
  }
}

// Update Swipe up handler (lines 239-252) - mirror logic
onSwipedUp: () => {
  // Swipe up = activate next row (row N+1) or create new row
  const currentRow = rowManager.getActiveRow();
  if (!currentRow) return;

  const allRows = rowManager.getAllRows();
  const currentIndex = allRows.findIndex(r => r.id === currentRow.id);

  if (currentIndex < allRows.length - 1) {
    const nextRow = allRows[currentIndex + 1];
    rowManager.setActiveRow(nextRow.id);
    onRowChange?.(nextRow.id);
  } else {
    // On last row → Create new row
    const newRowId = rowManager.createNewRow();
    onRowChange?.(newRowId);
    scrollToRow(newRowId, rowManager);
  }
},
```

**MagicCanvasToolbar Component (src/components/MagicCanvasToolbar.jsx):**

```javascript
import React, { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline'; // or use custom SVG

/**
 * MagicCanvasToolbar - Minimalist floating toolbar for canvas actions
 * @param {RowManager} rowManager - RowManager instance
 * @param {Function} onRowCreate - Callback when row created
 */
export default function MagicCanvasToolbar({ rowManager, onRowCreate }) {
  const [visible, setVisible] = useState(true);
  const [hideTimer, setHideTimer] = useState(null);

  // Auto-hide after 3 seconds of inactivity
  const resetHideTimer = () => {
    if (hideTimer) clearTimeout(hideTimer);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    setHideTimer(timer);
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  const handleCreateRow = () => {
    const newRowId = rowManager.createNewRow();
    onRowCreate?.(newRowId);
    resetHideTimer();
  };

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50
        flex items-center gap-2 px-4 py-2
        bg-white rounded-lg shadow-lg border border-gray-200
        transition-opacity duration-300
        ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
      onMouseEnter={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      <button
        onClick={handleCreateRow}
        className="
          flex items-center gap-2 px-3 py-2
          text-sm font-medium text-gray-700
          hover:bg-gray-100 rounded-md
          focus:outline-none focus:ring-2 focus:ring-blue-500
          min-h-[44px] min-w-[44px]
        "
        aria-label="Create new row"
      >
        <PlusIcon className="w-5 h-5" />
        <span className="hidden sm:inline">New Row</span>
      </button>
    </div>
  );
}
```

**Integration in MagicCanvas.jsx:**

```javascript
import MagicCanvasToolbar from '@/components/MagicCanvasToolbar';
import { scrollToRow } from '@/utils/scrollToRow';

function MagicCanvas() {
  const { rowManager, activeRow } = useRowSystem(excalidrawAPI);

  const handleRowCreate = (newRowId) => {
    scrollToRow(newRowId, rowManager);
    logger.log('Row created via toolbar', { newRowId });
  };

  return (
    <div className="relative w-full h-screen">
      <RowNavigator rowManager={rowManager} onRowChange={handleRowChange}>
        {/* Excalidraw canvas and other components */}
      </RowNavigator>

      <MagicCanvasToolbar
        rowManager={rowManager}
        onRowCreate={handleRowCreate}
      />
    </div>
  );
}
```

### Performance Considerations

- **Row creation time**: Target <100ms (generate ID, initialize metadata, update Map)
- **Mid-canvas insertion**: O(n) for shifting subsequent rows, acceptable for typical canvas (<100 rows)
- **Memory efficiency**: Each row ~200 bytes, 100 rows = ~20KB (negligible)
- **IndexedDB save**: Debounced 2s auto-save (from Story 1.7) handles new rows automatically
- **Canvas height adjustment**: Excalidraw handles viewport resizing efficiently
- **Toolbar auto-hide**: CSS transitions with GPU acceleration for smooth fade

### Testing Strategy

**Unit Tests (Vitest):**
- RowManager.createNewRow() generates sequential IDs
- createNewRow() initializes all required metadata fields
- createNewRow() positions row exactly 384px below previous
- createNewRow() calls setActiveRow() and returns new ID
- Mid-canvas insertion shifts subsequent rows correctly
- Row IDs remain stable after mid-canvas insertion

**Integration Tests (Manual):**
- End-to-end: Down arrow on last row creates new row
- End-to-end: Swipe down on last row creates new row
- End-to-end: Toolbar "+ Row" button creates new row
- Viewport auto-scrolls to show new row if off-screen
- Activation timeline logs row creation event
- OCR triggers on previous row after creation (from Story 1.8)
- New row persists to IndexedDB after 2s (from Story 1.7)
- Mid-canvas insertion: Create row between row-2 and row-3, verify shift

**Performance Tests:**
- Row creation completes <100ms (measure with performance.now())
- Create 100 rows rapidly (spam Down key), verify no lag or corruption
- Monitor memory usage with 100+ rows (should remain <5MB)
- Test IndexedDB quota with extreme row counts (warn at 80%)

**Accessibility Tests:**
- Toolbar button meets 44x44px minimum tap target
- Toolbar button accessible via keyboard (Tab + Enter)
- Screen reader announces "New row created" (extend ARIA from Story 1.9)
- Toolbar auto-hide doesn't trap focus

### Security & Privacy

- Client-side only (no network calls)
- Row creation logged locally via logger.js
- IndexedDB origin-isolated (browser sandbox)
- No executable code in row metadata
- Sequential IDs prevent ID collision or injection attacks
- Follows Texo's privacy-first architecture

### References

- [Source: docs/epics.md:554-596] - Story 1.10 detailed requirements and acceptance criteria
- [Source: docs/architecture.md:131-132] - Row ID format and spacing
- [Source: docs/sprint-artifacts/tech-spec-epic-1.md:216-219] - Row creation workflow details
- [Source: stories/1-9-implement-row-switching-via-gestures-keyboard.md] - Previous story learnings, RowNavigator integration point
- [Source: stories/1-8-trigger-ocr-on-row-deactivation.md] - OCR trigger mechanism
- [Source: stories/1-7-persist-row-state-canvas-state-across-reloads.md] - IndexedDB persistence patterns

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/1-10-implement-row-creation-workflow.context.xml

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2025-11-22: Story drafted by autonomous BMAD v6 workflow (YOLO mode)
