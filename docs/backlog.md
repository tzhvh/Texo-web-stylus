# Engineering Backlog

This backlog collects cross-cutting or future action items that emerge from reviews and planning.

Routing guidance:

- Use this file for non-urgent optimizations, refactors, or follow-ups that span multiple stories/epics.
- Must-fix items to ship a story belong in that story's `Tasks / Subtasks`.
- Same-epic improvements may also be captured under the epic Tech Spec `Post-Review Follow-ups` section.

| Date | Story | Epic | Type | Severity | Owner | Status | Notes |
| ---- | ----- | ---- | ---- | -------- | ----- | ------ | ----- |
| 2025-11-13 | 1.2 | 1 | TechDebt | Med | TBD | Open | Add useCallback wrapper for handleCanvasChange (src/pages/MagicCanvas.jsx:71-84) |
| 2025-11-13 | 1.2 | 1 | TechDebt | Med | TBD | Open | Add useCallback wrapper for clearCanvas (src/pages/MagicCanvas.jsx:87-94) |
| 2025-11-13 | 1.2 | 1 | TechDebt | Med | TBD | Open | Add useCallback wrapper for exportCanvas (src/pages/MagicCanvas.jsx:97-141) |
| 2025-11-13 | 1.2 | 1 | TechDebt | Med | TBD | Open | Add useCallback wrapper for openSettings (src/pages/MagicCanvas.jsx:144-153) |
| 2025-11-13 | 1.2 | 1 | Bug | Med | TBD | Open | Add error handling for Excalidraw API initialization in useEffect (src/pages/MagicCanvas.jsx:53-68) |
| 2025-11-13 | 1.2 | 1 | Enhancement | Med | TBD | Open | Add React error boundary wrapper for MagicCanvas route (src/App.jsx:78-84) |
| 2025-11-13 | 1.4 | 1 | Bug | High | TBD | Open | Implement IndexedDB persistence integration via workspaceDB.js (src/hooks/useRowSystem.js:300-325) |
| 2025-11-13 | 1.4 | 1 | Enhancement | High | TBD | Open | Create and integrate RowHeader component for visual status indicators (src/components/RowHeader.jsx) |
| 2025-11-13 | 1.4 | 1 | TechDebt | Med | TBD | Open | Add useCallback wrappers for event handlers in MagicCanvas component (src/pages/MagicCanvas.jsx:268-299) |
| 2025-11-13 | 1.4 | 1 | Bug | Med | TBD | Open | Fix assignElement error handling consistency (src/utils/rowManager.js:119-133) |
| 2025-11-13 | 1.4 | 1 | TechDebt | Low | TBD | Open | Complete JSDoc documentation for all RowManager method parameters (src/utils/rowManager.js:45-387) |
