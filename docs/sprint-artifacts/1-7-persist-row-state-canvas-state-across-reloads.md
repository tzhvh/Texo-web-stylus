# Story 1.7: Persist Row State and Canvas State Across Reloads

Status: drafted

## Story

As a **user**,
I want **my canvas and row state to persist when I reload the page**,
so that **I don't lose my work if I close the browser tab**.

## Acceptance Criteria

1. **Given** I have drawn content on Magic Canvas with rows in various states, **When** I reload the page or close and reopen the browser, **Then** the canvas restores to my previous state

2. **And** all drawn strokes are restored in correct positions

3. **And** row assignments are restored (elements belong to same rows)

4. **And** row statuses are restored (OCR status, validation status, transcribed LaTeX)

5. **And** active row is restored (last active row becomes active again)

6. **And** zoom level is restored

7. **And** restoration completes within 1 second for typical canvas (<500 elements)

8. **And** if no previous state exists, canvas loads empty with default view

9. **And** corrupted state is detected and handled gracefully (fallback to empty canvas, log error)

10. **And** activation timeline is restored for OCR attribution

## Tasks / Subtasks

- [ ] Task 1: Extend IndexedDB schema for Magic Canvas state persistence (AC: #1, #2, #3, #4, #5, #10)
  - [ ] Add new IndexedDB store `magic-canvas-state` to existing workspaceDB.js
  - [ ] Define state schema: `{canvasState, rowManagerState, activeRowId, activationTimeline, timestamp, version: 1}`
  - [ ] Implement saveMagicCanvasState() method with atomic writes
  - [ ] Implement loadMagicCanvasState() method with error handling
  - [ ] Add schema versioning for future migrations (v1 initially)
  - [ ] Test IndexedDB operations (save, load, corruption handling)

- [ ] Task 2: Implement RowManager serialization and deserialization (AC: #3, #4, #5, #10)
  - [ ] Add serialize() method to RowManager class
  - [ ] Add deserialize(state) method to RowManager class
  - [ ] Serialize rows Map to array format for JSON storage
  - [ ] Serialize activation timeline with Date objects as ISO strings
  - [ ] Restore rows Map from deserialized array
  - [ ] Restore activation timeline with Date object reconstruction
  - [ ] Unit test serialization round-trip (serialize → deserialize → verify equality)

- [ ] Task 3: Implement auto-save on canvas changes with debouncing (AC: #1, #7)
  - [ ] Hook into Excalidraw onChange event to detect scene changes
  - [ ] Implement debounced save function (2s delay after last change)
  - [ ] Gather canvas state from Excalidraw API (elements + appState)
  - [ ] Gather RowManager state via serialize()
  - [ ] Call saveMagicCanvasState() with complete state
  - [ ] Add timestamp to saved state for debugging
  - [ ] Test auto-save triggers correctly and debounces rapid changes

- [ ] Task 4: Implement state restoration on component mount (AC: #1, #2, #5, #6, #7, #10)
  - [ ] Call loadMagicCanvasState() in MagicCanvas useEffect on mount
  - [ ] Restore RowManager state via deserialize()
  - [ ] Restore Excalidraw scene via initialData prop or updateScene()
  - [ ] Restore active row via rowManager.setActiveRow(activeRowId)
  - [ ] Restore zoom level from appState
  - [ ] Measure and verify restoration time <1s for typical canvas
  - [ ] Test restoration preserves all state correctly

- [ ] Task 5: Handle empty state and corrupted state gracefully (AC: #8, #9)
  - [ ] Detect when no saved state exists (first load)
  - [ ] Initialize empty canvas with default row (row-0)
  - [ ] Detect corrupted state (JSON parse errors, schema validation failures)
  - [ ] Log corruption errors to existing logger.js
  - [ ] Fallback to empty canvas if corruption detected
  - [ ] Display user-friendly message on corruption recovery
  - [ ] Test corruption scenarios (malformed JSON, missing fields, invalid types)

- [ ] Task 6: Integration testing and performance validation (AC: #7)
  - [ ] End-to-end test: Draw content, reload page, verify restoration
  - [ ] Test row status persistence (pending, processing, complete, error states)
  - [ ] Test active row restoration and highlighting
  - [ ] Test activation timeline restoration
  - [ ] Measure restoration time with 500 element canvas (<1s requirement)
  - [ ] Test debouncing: rapid changes don't cause excessive saves
  - [ ] Test browser storage quota monitoring (warn at 80%)

## Dev Notes

### Architecture Context

This story implements the **state persistence layer** for the single-active-row architectural model, ensuring canvas and row state survive browser sessions. Persistence uses IndexedDB for client-side storage following Texo's privacy-first philosophy.

**Key Architectural Decisions:**
- **Unidirectional state sync**: RowManager is truth source → IndexedDB (architecture.md:400-410)
- **Debounced saves**: 2s delay after last change prevents excessive writes (architecture.md:45,137,410)
- **Atomic writes**: Complete state saved together prevents partial corruption
- **Schema versioning**: v1 schema supports future migrations
- **Corruption resilience**: Graceful degradation to empty canvas if data corrupted

**Integration Points:**
- Extends existing `src/utils/workspaceDB.js` with Magic Canvas specific stores
- Reuses existing IndexedDB patterns from SketchPage, ComposePage persistence
- RowManager gains serialize/deserialize methods for state portability
- Excalidraw initialData prop or updateScene() for canvas restoration
- Existing logger.js for corruption and error logging

### Learnings from Previous Story

**From Story 1.6 (Status: review)**

**Implementation Summary:**
- Story 1.6 implemented visual status indicators with active row highlighting
- All 9 acceptance criteria met with comprehensive evidence
- StatusIcon component created with 5 SVG variants (∅, ⟳, ✓, ✗, ⚠️)
- 47 tests passing (26 StatusIcon unit tests + 21 RowHeader integration tests)
- React.memo optimization prevents unnecessary re-renders
- WCAG 2.1 AA compliant with 48x48px icons and aria-labels

**Key Files and Patterns to Reuse:**
- `src/components/StatusIcon.jsx` - **REFERENCE** - Status icon component with row state display
  - Row status types defined: ocrStatus, validationStatus
  - Status priority logic: error > processing > validated > invalid > pending
- `src/components/RowHeader.jsx` - **REFERENCE** - Active row highlighting and visual feedback
  - Lines 52-71: Active row highlighting with smooth transitions
  - Visual state tied to row.isActive boolean
- `src/hooks/useRowSystem.js` - **REUSE/EXTEND** - Row state management hook
  - Lines 174-191: handleSceneChange for canvas updates
  - Will need to add persistence trigger on changes
- `src/utils/rowManager.js` - **EXTEND** - Source of truth for row state
  - Lines 219-264: setActiveRow() manages active row state
  - Lines 358-367: getActivationTimeline() provides timeline data
  - **ADD**: serialize() and deserialize() methods for persistence
- `src/utils/workspaceDB.js` - **EXTEND** - Existing IndexedDB persistence layer
  - Reuse patterns for IndexedDB operations
  - Add magic-canvas-state store alongside existing stores

**Architectural Patterns Established:**
- Row state management centralized in RowManager class
- Visual feedback tied directly to row metadata (ocrStatus, validationStatus)
- Active row as single source of editing control
- Smooth transitions for state changes (200ms CSS transitions)

**What This Story Should Do:**
Since RowManager and row state are well-established from Stories 1.4-1.6, **Story 1.7 should**:
1. **Serialize RowManager state**: Convert rows Map and activation timeline to JSON-compatible format
2. **Extend workspaceDB.js**: Add magic-canvas-state IndexedDB store
3. **Auto-save on changes**: Debounce Excalidraw onChange events (2s) and save complete state
4. **Restore on mount**: Load saved state from IndexedDB and reconstruct RowManager + canvas
5. **Handle corruption**: Detect invalid state and gracefully fallback to empty canvas
6. **Preserve statuses**: Ensure ocrStatus, validationStatus, transcribedLatex persist correctly
7. **Timeline restoration**: Activation timeline needed for future OCR attribution (Story 1.8)

**Testing Approach:**
Follow Story 1.6's comprehensive test pattern. Add unit tests for serialize/deserialize round-trip. Integration tests for save → reload → restore flow. Performance test with 500 element canvas (<1s restoration). Test corruption scenarios (malformed JSON, missing fields).

[Source: stories/1-6-display-row-status-indicators-active-row-highlight.md#Completion-Notes-List]

### Project Structure Notes

**Files to Modify/Extend:**
- `src/utils/workspaceDB.js` - **EXTEND** - Add saveMagicCanvasState(), loadMagicCanvasState()
- `src/utils/rowManager.js` - **EXTEND** - Add serialize(), deserialize() methods
- `src/hooks/useRowSystem.js` - **EXTEND** - Add auto-save trigger on canvas changes
- `src/pages/MagicCanvas.jsx` - **EXTEND** - Add state restoration on mount

**Expected Component Integration:**
```
src/
├── pages/
│   └── MagicCanvas.jsx              # EXTEND - State restoration on mount
├── hooks/
│   └── useRowSystem.js              # EXTEND - Auto-save trigger
├── utils/
│   ├── workspaceDB.js               # EXTEND - Magic Canvas IndexedDB operations
│   └── rowManager.js                # EXTEND - Serialize/deserialize methods
```

### Technical Implementation Guidance

**RowManager Serialization (src/utils/rowManager.js):**

```javascript
class RowManager {
  // ... existing methods ...

  /**
   * Serialize RowManager state to JSON-compatible format
   * @returns {RowManagerState} Serialized state
   */
  serialize() {
    return {
      rows: Array.from(this.rows.entries()).map(([id, row]) => ({
        ...row,
        activatedAt: row.activatedAt?.toISOString() || null
      })),
      activeRowId: this.activeRowId,
      activationTimeline: this.activationTimeline.map(event => ({
        rowId: event.rowId,
        activatedAt: event.activatedAt.toISOString(),
        deactivatedAt: event.deactivatedAt?.toISOString() || null
      })),
      rowHeight: this.rowHeight,
      startY: this.startY,
      version: 1
    };
  }

  /**
   * Deserialize state and restore RowManager
   * @param {RowManagerState} state - Serialized state
   */
  deserialize(state) {
    if (!state || state.version !== 1) {
      throw new Error('Invalid or incompatible RowManager state version');
    }

    // Restore rows Map
    this.rows = new Map(
      state.rows.map(row => [
        row.id,
        {
          ...row,
          activatedAt: row.activatedAt ? new Date(row.activatedAt) : null
        }
      ])
    );

    // Restore activation timeline
    this.activationTimeline = state.activationTimeline.map(event => ({
      rowId: event.rowId,
      activatedAt: new Date(event.activatedAt),
      deactivatedAt: event.deactivatedAt ? new Date(event.deactivatedAt) : null
    }));

    this.activeRowId = state.activeRowId;
    this.rowHeight = state.rowHeight;
    this.startY = state.startY;
  }
}
```

**IndexedDB Extension (src/utils/workspaceDB.js):**

```javascript
// Add to existing workspaceDB.js

/**
 * Save Magic Canvas state to IndexedDB
 * @param {ExcalidrawScene} canvasState - Excalidraw elements and appState
 * @param {RowManagerState} rowManagerState - Serialized RowManager state
 * @returns {Promise<void>}
 */
export async function saveMagicCanvasState(canvasState, rowManagerState) {
  try {
    const db = await openDatabase(); // Reuse existing DB connection
    const tx = db.transaction(['magic-canvas-state'], 'readwrite');
    const store = tx.objectStore('magic-canvas-state');

    const state = {
      canvasState,
      rowManagerState,
      timestamp: new Date().toISOString(),
      version: 1
    };

    await store.put(state, 'current'); // Single key: 'current'
    await tx.complete;

    logger.log('Magic Canvas state saved', { timestamp: state.timestamp });
  } catch (error) {
    logger.error('Failed to save Magic Canvas state', error);
    throw error;
  }
}

/**
 * Load Magic Canvas state from IndexedDB
 * @returns {Promise<{canvasState, rowManagerState} | null>}
 */
export async function loadMagicCanvasState() {
  try {
    const db = await openDatabase();
    const tx = db.transaction(['magic-canvas-state'], 'readonly');
    const store = tx.objectStore('magic-canvas-state');
    const state = await store.get('current');

    if (!state) {
      logger.log('No saved Magic Canvas state found (first load)');
      return null;
    }

    // Validate schema version
    if (state.version !== 1) {
      logger.warn('Incompatible Magic Canvas state version', { version: state.version });
      return null;
    }

    logger.log('Magic Canvas state loaded', { timestamp: state.timestamp });
    return {
      canvasState: state.canvasState,
      rowManagerState: state.rowManagerState
    };
  } catch (error) {
    logger.error('Failed to load Magic Canvas state', error);
    // Return null on error → fallback to empty canvas
    return null;
  }
}
```

**Auto-Save Integration (src/hooks/useRowSystem.js):**

```javascript
import { debounce } from 'lodash'; // or custom debounce
import { saveMagicCanvasState } from '../utils/workspaceDB';

function useRowSystem(excalidrawAPI) {
  const rowManagerRef = useRef(new RowManager());
  const [activeRow, setActiveRow] = useState(null);

  // Debounced auto-save (2s delay)
  const debouncedSave = useMemo(
    () =>
      debounce(async (canvasState, rowManagerState) => {
        try {
          await saveMagicCanvasState(canvasState, rowManagerState);
        } catch (error) {
          logger.error('Auto-save failed', error);
        }
      }, 2000),
    []
  );

  // Trigger auto-save on canvas or row state changes
  const handleSceneChange = useCallback(
    (elements, appState) => {
      // ... existing row assignment logic ...

      // Trigger auto-save
      const canvasState = { elements, appState };
      const rowManagerState = rowManagerRef.current.serialize();
      debouncedSave(canvasState, rowManagerState);
    },
    [debouncedSave]
  );

  return {
    rowManager: rowManagerRef.current,
    activeRow,
    handleSceneChange,
    // ... other methods ...
  };
}
```

**State Restoration (src/pages/MagicCanvas.jsx):**

```javascript
import { loadMagicCanvasState } from '../utils/workspaceDB';

function MagicCanvas() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const { rowManager, activeRow, handleSceneChange } = useRowSystem(excalidrawAPI);

  // Restore state on mount
  useEffect(() => {
    async function restoreState() {
      const startTime = performance.now();

      try {
        const savedState = await loadMagicCanvasState();

        if (savedState) {
          // Restore RowManager
          rowManager.deserialize(savedState.rowManagerState);

          // Restore Excalidraw canvas
          setInitialData(savedState.canvasState);

          // Restore active row (happens automatically via deserialize)
          const restoredActiveRowId = savedState.rowManagerState.activeRowId;
          if (restoredActiveRowId) {
            rowManager.setActiveRow(restoredActiveRowId);
          }

          const duration = performance.now() - startTime;
          logger.log('Magic Canvas state restored', { duration: `${duration.toFixed(2)}ms` });

          // Performance assertion: <1s for typical canvas
          if (duration > 1000) {
            logger.warn('Restoration took longer than 1s', { duration });
          }
        } else {
          // No saved state: Initialize empty canvas with default row
          const defaultRowId = rowManager.createNewRow();
          rowManager.setActiveRow(defaultRowId);
          logger.log('Initialized empty Magic Canvas');
        }
      } catch (error) {
        logger.error('Failed to restore Magic Canvas state (corrupted?)', error);
        // Fallback: Initialize empty canvas
        const defaultRowId = rowManager.createNewRow();
        rowManager.setActiveRow(defaultRowId);
        alert('Failed to restore previous canvas state. Starting with empty canvas.');
      }
    }

    restoreState();
  }, []); // Run once on mount

  return (
    <div className="relative w-full h-screen">
      <Excalidraw
        ref={(api) => setExcalidrawAPI(api)}
        initialData={initialData}
        onChange={handleSceneChange}
        {...otherProps}
      />
      {/* ... RowHeaders, StatusIcons, etc ... */}
    </div>
  );
}
```

### Performance Considerations

- **Restoration time target**: <1s for typical canvas (<500 elements)
- **Debounce timing**: 2s delay prevents excessive IndexedDB writes during rapid drawing
- **Serialization performance**: Map.entries() iteration is O(n) on number of rows (acceptable)
- **IndexedDB quota monitoring**: Add warning at 80% quota usage (future enhancement)
- **Atomic writes**: Complete state written together prevents partial corruption
- **Schema versioning**: Version field enables future migrations without breaking changes

### Testing Strategy

**Unit Tests (Vitest):**
- RowManager.serialize() produces correct JSON-compatible structure
- RowManager.deserialize() reconstructs state correctly (round-trip test)
- Date objects converted to ISO strings and back correctly
- Activation timeline serialization preserves order and timestamps
- Schema version validation rejects incompatible versions

**Integration Tests (Manual):**
- End-to-end: Draw content, reload page, verify all strokes restored
- Row status persistence: Set various ocrStatus/validationStatus, reload, verify preserved
- Active row restoration: Switch to row 3, reload, verify row 3 is active with highlight
- Activation timeline: Switch rows multiple times, reload, verify timeline restored
- Empty state: Clear IndexedDB, reload, verify empty canvas with default row
- Corrupted state: Manually corrupt saved JSON, reload, verify fallback to empty canvas
- Performance: 500 element canvas restoration measured <1s

**Performance Tests:**
- Measure restoration time with varying canvas sizes (50, 200, 500 elements)
- Verify debouncing prevents excessive saves during rapid drawing
- Monitor IndexedDB storage usage with large canvases

### Security & Privacy

- Client-side only (no network calls)
- IndexedDB origin-isolated (browser sandbox)
- Canvas data never leaves user's browser
- Follows Texo's privacy-first architecture
- No external dependencies for persistence
- Schema versioning prevents injection via state manipulation

### References

- [Source: docs/epic_1_complete_breakdown.md:245-266] - Story 1.7 detailed requirements and acceptance criteria
- [Source: docs/sprint-artifacts/tech-spec-epic-1.md:115-124] - IndexedDB schema design for Magic Canvas state
- [Source: docs/architecture.md:400-410] - State sync architecture (unidirectional RowManager → IndexedDB)
- [Source: docs/architecture.md:45,137,410] - Debounce timing (2s for saves, 1.5s for OCR)
- [Source: docs/PRD.md:502-530] - Row System persistence requirements (FR11-FR23)
- [Source: docs/epics.md] - Epic 1: Canvas Foundation & Row Management overview
- [Source: stories/1-6-display-row-status-indicators-active-row-highlight.md] - Previous story learnings
- [Source: src/utils/workspaceDB.js] - Existing IndexedDB patterns to reuse

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2025-11-22 12:10:43: Story validated via validate-workflow (PASS with issues: 0 critical, 3 major, 1 minor)
- 2025-11-22 12:10:43: Auto-fix applied - corrected architecture.md citation line numbers (YOLO mode)
- 2025-11-22: Story drafted by SM agent (BMad) via create-story workflow
