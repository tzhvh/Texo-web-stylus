# Story 1.8: Trigger OCR on Row Deactivation

Status: drafted

## Story

As a **user**,
I want **OCR to automatically process a row when I finish working on it and switch to another**,
so that **transcription happens seamlessly in the background**.

## Acceptance Criteria

1. **Given** I have drawn content in row 3 and it is currently active, **When** I switch to a different row (row 4) using gestures, keyboard, or tap, **Then** row 3 is deactivated and marked for OCR processing

2. **And** OCR triggers on row 3 after 1.5s debounce (if content changed since last OCR)

3. **And** row 4 becomes the new active row with visual highlighting

4. **And** the activation event is logged in the timeline: `{rowId: 'row-4', activatedAt: Date.now(), deactivatedAt: null}`

5. **And** the previous activation event is updated: `{rowId: 'row-3', ..., deactivatedAt: Date.now()}`

6. **And** I can now draw only in row 4

7. **And** row 3 becomes read-only (dimmed, non-interactive)

8. **And** OCR processing happens in the background without blocking row 4 drawing

9. **And** rapid row switching is debounced to prevent excessive OCR triggers

## Tasks / Subtasks

- [ ] Task 1: Add OCR trigger hook on row deactivation (AC: #1, #2, #9)
  - [ ] Hook into `rowManager.setActiveRow()` to detect row switches
  - [ ] Implement debounced OCR trigger function (1.5s delay)
  - [ ] Check if row has content before triggering OCR
  - [ ] Implement row content hash calculation to detect changes
  - [ ] Set deactivated row's `ocrStatus = 'pending'` if content exists and changed
  - [ ] Prevent OCR trigger if row content hash unchanged since last OCR
  - [ ] Unit test debounce logic and hash change detection

- [ ] Task 2: Implement activation timeline logging (AC: #4, #5)
  - [ ] Log new activation event when row becomes active
  - [ ] Update previous activation event with deactivatedAt timestamp
  - [ ] Store activation events in RowManager.activationTimeline array
  - [ ] Ensure timeline events include: {rowId, activatedAt, deactivatedAt}
  - [ ] Test timeline logging captures all row switches correctly
  - [ ] Verify timeline persists via Story 1.7's serialization

- [ ] Task 3: Create OCR integration stub for Epic 2 (AC: #1, #2, #8)
  - [ ] Create placeholder OCR trigger function: `triggerOCRForRow(rowId)`
  - [ ] Add TODO comments: "Epic 2: Implement actual OCR pipeline here"
  - [ ] Log OCR trigger events to existing logger.js for debugging
  - [ ] Ensure OCR trigger is non-blocking (async, doesn't block row switching)
  - [ ] Test that row switching remains smooth with stub OCR trigger

- [ ] Task 4: Ensure read-only enforcement on deactivated rows (AC: #6, #7)
  - [ ] Verify existing read-only constraints from Story 1.5 still apply
  - [ ] Test that deactivated row becomes visually dimmed
  - [ ] Verify new active row accepts drawing input immediately
  - [ ] Ensure no regression in active row highlighting from Story 1.6
  - [ ] Manual test: Switch rows, verify only new active row is editable

- [ ] Task 5: Integration testing and performance validation (AC: #8, #9)
  - [ ] End-to-end test: Draw in row 3, switch to row 4, verify OCR triggered
  - [ ] Test rapid row switching: Verify debounce prevents excessive triggers
  - [ ] Test background OCR: Verify drawing in new row not blocked by OCR stub
  - [ ] Test timeline logging: Switch rows multiple times, verify complete timeline
  - [ ] Performance test: Verify row switching latency remains <200ms with OCR trigger
  - [ ] Test edge cases: Empty row (no OCR), unchanged row (skip OCR)

## Dev Notes

### Architecture Context

This story implements the **OCR trigger mechanism** for the single-active-row architectural model, setting up the integration point for Epic 2's OCR pipeline. The trigger uses row deactivation events and activation timeline tracking to determine when OCR processing should occur.

**Key Architectural Decisions:**
- **OCR trigger on row deactivation**: User switches away from row → row deactivated → OCR triggered after 1.5s debounce (architecture.md:135,313-319)
- **Debounced processing**: 1.5s delay allows rapid row switching without wasted OCR cycles (architecture.md:45)
- **Content hash tracking**: Prevent redundant OCR on unchanged content
- **Timeline-based attribution**: Activation timeline provides clear OCR attribution for future features (architecture.md:39,152)
- **Non-blocking design**: OCR trigger is async and doesn't block row switching or drawing

**Integration Points:**
- Extends RowManager.setActiveRow() with deactivation hook
- Reuses activation timeline from Story 1.4 and persistence from Story 1.7
- Creates stub integration point for Epic 2 OCR pipeline
- Leverages existing logger.js for OCR event tracking
- Maintains read-only enforcement from Story 1.5

### Learnings from Previous Story

**From Story 1.7 (Status: review)**

**Implementation Summary:**
- Story 1.7 implemented full state persistence with IndexedDB
- All 10 acceptance criteria met with comprehensive evidence
- RowManager.serialize() and deserialize() methods working with version field
- Atomic state persistence (canvas + RowManager) in single transaction
- Restoration time <1s verified with performance monitoring
- 65/85 tests passing, all Story 1.7-specific tests PASS

**Key Files and Patterns to Reuse:**
- `src/utils/rowManager.js` - **REUSE/EXTEND** - Source of truth for row state
  - Lines 219-264: setActiveRow() manages active row state - **EXTEND** with OCR trigger hook
  - Lines 358-367: getActivationTimeline() provides timeline data - **REUSE** for OCR attribution
  - serialize() and deserialize() already persist activation timeline - **REUSE**
- `src/hooks/useRowSystem.js` - **EXTEND** - Row state management hook
  - handleSceneChange already handles canvas updates - **ADD** row content hash tracking
  - Will need to add OCR trigger callback on row deactivation
- `src/pages/MagicCanvas.jsx` - **EXTEND** - Main page component
  - Will need to integrate OCR trigger function (stub for now)
- `src/utils/logger.js` - **REUSE** - Logging infrastructure for OCR events

**Architectural Patterns Established:**
- Row state management centralized in RowManager class
- Activation timeline tracking for row switches (ready for OCR attribution)
- State persistence via serialize/deserialize (timeline already included)
- Unidirectional state flow (RowManager is truth source)
- Performance monitoring with warnings

**What This Story Should Do:**
Since RowManager, activation timeline, and persistence are complete from Stories 1.4-1.7, **Story 1.8 should**:
1. **Hook into setActiveRow()**: Add OCR trigger logic when row is deactivated
2. **Implement debouncing**: 1.5s delay after deactivation before OCR trigger
3. **Content hash tracking**: Calculate hash of row elements to detect changes
4. **Timeline integration**: Use existing activation timeline for OCR attribution
5. **Create OCR stub**: Placeholder function for Epic 2 OCR pipeline integration
6. **Ensure non-blocking**: OCR trigger must not block row switching or drawing
7. **Prevent redundant triggers**: Skip OCR if row content unchanged since last OCR

**Testing Approach:**
Follow Story 1.7's comprehensive test pattern. Add unit tests for debounce logic and hash change detection. Integration tests for row switching → OCR trigger flow. Performance tests to verify row switching latency remains <200ms. Test rapid row switching to verify debounce prevents excessive triggers.

**Technical Debt from Previous Stories:**
None directly affecting Story 1.8. Story 1.7 is in "review" status but all core functionality (RowManager, timeline, persistence) is working. Story 1.8 can proceed as Story 1.7's features are stable.

[Source: stories/1-7-persist-row-state-canvas-state-across-reloads.md#Completion-Notes-List]

### Project Structure Notes

**Files to Modify/Extend:**
- `src/utils/rowManager.js` - **EXTEND** - Add OCR trigger hook in setActiveRow()
- `src/hooks/useRowSystem.js` - **EXTEND** - Add row content hash tracking and OCR trigger callback
- `src/pages/MagicCanvas.jsx` - **EXTEND** - Integrate OCR trigger stub function
- `src/utils/logger.js` - **REUSE** - Log OCR trigger events

**Expected Component Integration:**
```
src/
├── pages/
│   └── MagicCanvas.jsx              # EXTEND - OCR trigger stub integration
├── hooks/
│   └── useRowSystem.js              # EXTEND - Content hash tracking, OCR callback
├── utils/
│   ├── rowManager.js                # EXTEND - setActiveRow() with OCR trigger hook
│   ├── logger.js                    # REUSE - OCR event logging
│   └── contentHash.js               # NEW - Row content hash calculation utility
```

### Technical Implementation Guidance

**RowManager OCR Trigger Hook (src/utils/rowManager.js):**

```javascript
class RowManager {
  // ... existing properties ...
  ocrTriggerCallback = null;  // NEW: Callback function for OCR trigger

  /**
   * Set OCR trigger callback (called when row is deactivated)
   * @param {Function} callback - Function to call: (rowId, rowData) => void
   */
  setOCRTriggerCallback(callback) {
    this.ocrTriggerCallback = callback;
  }

  /**
   * Set active row (EXTENDED with OCR trigger logic)
   * @param {string} rowId - Row ID to activate
   */
  setActiveRow(rowId) {
    const previousRow = this.getActiveRow();

    // If there's a previous active row, deactivate it
    if (previousRow && previousRow.id !== rowId) {
      // Update previous row state
      previousRow.isActive = false;

      // Update activation timeline - close previous event
      const lastEvent = this.activationTimeline[this.activationTimeline.length - 1];
      if (lastEvent && lastEvent.rowId === previousRow.id && !lastEvent.deactivatedAt) {
        lastEvent.deactivatedAt = new Date();
      }

      // **NEW: Trigger OCR for deactivated row**
      if (this.ocrTriggerCallback) {
        this.ocrTriggerCallback(previousRow.id, previousRow);
      }
    }

    // Activate new row
    const newRow = this.getRow(rowId);
    if (!newRow) {
      logger.warn('Attempted to activate non-existent row', { rowId });
      return;
    }

    newRow.isActive = true;
    newRow.activatedAt = new Date();
    this.activeRowId = rowId;

    // Log new activation event in timeline
    this.activationTimeline.push({
      rowId,
      activatedAt: new Date(),
      deactivatedAt: null
    });

    logger.log('Row activated', { rowId, previousRowId: previousRow?.id });
  }
}
```

**Content Hash Utility (src/utils/contentHash.js - NEW):**

```javascript
/**
 * Calculate hash of row content for change detection
 * Uses simple string hash for performance
 * @param {ExcalidrawElement[]} elements - Elements in the row
 * @returns {string} Hash string
 */
export function calculateRowContentHash(elements) {
  if (!elements || elements.length === 0) {
    return '';
  }

  // Create hash from element IDs and coordinates
  // This detects additions, deletions, and movements
  const hashInput = elements
    .map(el => `${el.id}:${el.x}:${el.y}`)
    .sort()
    .join('|');

  // Simple string hash (djb2 algorithm)
  let hash = 5381;
  for (let i = 0; i < hashInput.length; i++) {
    hash = (hash * 33) ^ hashInput.charCodeAt(i);
  }
  return hash.toString(36);
}
```

**OCR Trigger Integration (src/hooks/useRowSystem.js):**

```javascript
import { debounce } from 'lodash';
import { calculateRowContentHash } from '../utils/contentHash';
import logger from '../utils/logger';

function useRowSystem(excalidrawAPI) {
  const rowManagerRef = useRef(new RowManager());
  const rowContentHashesRef = useRef(new Map()); // Track hashes per row
  const [activeRow, setActiveRow] = useState(null);

  // Debounced OCR trigger (1.5s delay)
  const debouncedOCRTrigger = useMemo(
    () =>
      debounce((rowId, rowData) => {
        const elements = getElementsInRow(rowId); // Get row elements
        const contentHash = calculateRowContentHash(elements);
        const lastHash = rowContentHashesRef.current.get(rowId);

        // Check if content changed since last OCR
        if (elements.length === 0) {
          logger.log('Skipping OCR for empty row', { rowId });
          return;
        }

        if (contentHash === lastHash) {
          logger.log('Skipping OCR for unchanged row', { rowId, hash: contentHash });
          return;
        }

        // Update hash and trigger OCR
        rowContentHashesRef.current.set(rowId, contentHash);
        triggerOCRForRow(rowId, elements);
      }, 1500), // 1.5s debounce
    []
  );

  // OCR trigger callback for RowManager
  const handleRowDeactivation = useCallback(
    (rowId, rowData) => {
      logger.log('Row deactivated, scheduling OCR', { rowId });

      // Set row status to pending
      rowManagerRef.current.updateRow(rowId, { ocrStatus: 'pending' });

      // Trigger debounced OCR
      debouncedOCRTrigger(rowId, rowData);
    },
    [debouncedOCRTrigger]
  );

  // Set OCR trigger callback on RowManager
  useEffect(() => {
    rowManagerRef.current.setOCRTriggerCallback(handleRowDeactivation);
  }, [handleRowDeactivation]);

  return {
    rowManager: rowManagerRef.current,
    activeRow,
    // ... other methods ...
  };
}
```

**OCR Trigger Stub (src/pages/MagicCanvas.jsx or separate utils/ocrTrigger.js):**

```javascript
/**
 * Trigger OCR processing for a row (STUB for Epic 2)
 * @param {string} rowId - Row ID to process
 * @param {ExcalidrawElement[]} elements - Elements in the row
 */
export function triggerOCRForRow(rowId, elements) {
  logger.log('OCR triggered for row (STUB)', {
    rowId,
    elementCount: elements.length,
    timestamp: new Date().toISOString()
  });

  // TODO: Epic 2 - Implement actual OCR pipeline here
  // 1. Extract overlapping tiles from row bounding box (ocrTiling.js)
  // 2. Send tiles to OCR worker pool (ocrWorkerPool.js)
  // 3. Merge LaTeX fragments (latexAssembly.js)
  // 4. Post-process LaTeX (ocrPostProcessor.js)
  // 5. Update row.transcribedLatex and row.ocrStatus = 'complete'

  // STUB: Simulate async OCR processing
  setTimeout(() => {
    logger.log('OCR completed for row (STUB)', { rowId });
    // Update row status (will be real implementation in Epic 2)
    // rowManager.updateRow(rowId, {
    //   ocrStatus: 'complete',
    //   transcribedLatex: '...'
    // });
  }, 500);
}
```

### Performance Considerations

- **Debounce timing**: 1.5s delay prevents excessive OCR triggers during rapid row switching
- **Content hash calculation**: O(n) on elements in row, but typically fast (<5ms for 50 elements)
- **Non-blocking OCR**: OCR trigger is async, doesn't block row switching or drawing
- **Timeline logging**: O(1) append to timeline array, minimal overhead
- **Row switching latency**: Must remain <200ms (Story 1.9 requirement) with OCR trigger hook

### Testing Strategy

**Unit Tests (Vitest):**
- calculateRowContentHash() produces consistent hashes for same elements
- Hash changes when elements added, removed, or moved
- Debounce logic prevents rapid OCR triggers (test with fake timers)
- OCR trigger skipped for empty rows
- OCR trigger skipped for unchanged row content
- Activation timeline logging captures deactivation timestamps

**Integration Tests (Manual):**
- End-to-end: Draw in row 3, switch to row 4, verify OCR triggered after 1.5s
- Rapid switching: Switch rows quickly, verify debounce prevents excessive triggers
- Empty row: Switch from empty row, verify no OCR triggered
- Unchanged row: Switch to/from row without changes, verify OCR skipped
- Timeline verification: Switch rows multiple times, check timeline has correct events
- Background processing: Verify drawing in new row not blocked by OCR stub

**Performance Tests:**
- Row switching latency: Verify remains <200ms with OCR trigger hook
- Content hash calculation: Measure time for rows with varying element counts
- Debounce effectiveness: Verify prevents triggers during rapid switching

### Security & Privacy

- Client-side only (no network calls)
- OCR trigger events logged locally via logger.js
- Content hashes stay in browser memory (not persisted)
- Activation timeline persisted via Story 1.7 (IndexedDB, origin-isolated)
- Follows Texo's privacy-first architecture

### References

- [Source: docs/epic_1_complete_breakdown.md:287-320] - Story 1.8 detailed requirements and acceptance criteria
- [Source: docs/sprint-artifacts/tech-spec-epic-1.md] - Epic 1 technical specification
- [Source: docs/architecture.md:135,313-319] - OCR trigger on row deactivation architectural decision
- [Source: docs/architecture.md:45] - Debounce timing (1.5s for OCR, 500ms validation, 2s save)
- [Source: docs/architecture.md:39,152] - Activation timeline for OCR attribution
- [Source: stories/1-7-persist-row-state-canvas-state-across-reloads.md] - Previous story learnings
- [Source: src/utils/rowManager.js] - RowManager class setActiveRow() method

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2025-11-22: Story drafted by SM agent (BMad) via create-story workflow (YOLO mode)
