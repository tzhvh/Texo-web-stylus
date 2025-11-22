import React, { useEffect, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';

/**
 * RowNavigator - Handles row switching via gestures and keyboard
 *
 * Enables users to navigate between rows using:
 * - Arrow keys (Up/Down)
 * - Swipe gestures (up/down with 50px threshold)
 * - Direct row tap/click (handled externally)
 *
 * Integration with RowManager:
 * - Calls rowManager.setActiveRow(newRowId) to switch rows
 * - Automatically triggers OCR on deactivated row (Story 1.8 integration)
 * - Visual highlighting updates automatically (Story 1.6 integration)
 *
 * @param {Object} props
 * @param {RowManager} props.rowManager - RowManager instance from useRowSystem
 * @param {Function} props.onRowChange - Callback when active row changes (for viewport scroll, logging)
 * @param {React.ReactNode} props.children - Canvas elements to wrap
 */
export default function RowNavigator({ rowManager, onRowChange, children }) {
  // Keyboard navigation handler
  const handleKeyDown = useCallback((event) => {
    // Only handle arrow keys
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }

    event.preventDefault(); // Prevent default scroll behavior

    const currentRow = rowManager.getActiveRow();
    if (!currentRow) return;

    const allRows = rowManager.getAllRows();
    const currentIndex = allRows.findIndex(r => r.id === currentRow.id);

    if (event.key === 'ArrowUp') {
      // Navigate to previous row (row N-1)
      if (currentIndex > 0) {
        const previousRow = allRows[currentIndex - 1];
        rowManager.setActiveRow(previousRow.id);
        onRowChange?.(previousRow.id);
      }
      // If currentIndex === 0, do nothing (already at top) - AC #4
    } else if (event.key === 'ArrowDown') {
      // Navigate to next row (row N+1)
      if (currentIndex < allRows.length - 1) {
        const nextRow = allRows[currentIndex + 1];
        rowManager.setActiveRow(nextRow.id);
        onRowChange?.(nextRow.id);
      } else {
        // Story 1.10: Create new row when Down pressed on last row - AC #1, #2, #5
        const newRowId = rowManager.createNewRow();
        onRowChange?.(newRowId); // Trigger viewport scroll and logging
      }
    }
  }, [rowManager, onRowChange]);

  // Swipe gesture navigation
  const swipeHandlers = useSwipeable({
    onSwipedUp: () => {
      // Swipe up = activate next row (row N+1) or create new row - AC #1, #3
      const currentRow = rowManager.getActiveRow();
      if (!currentRow) return;

      const allRows = rowManager.getAllRows();
      const currentIndex = allRows.findIndex(r => r.id === currentRow.id);

      if (currentIndex < allRows.length - 1) {
        const nextRow = allRows[currentIndex + 1];
        rowManager.setActiveRow(nextRow.id);
        onRowChange?.(nextRow.id);
      } else {
        // Story 1.10: Create new row when swipe up on last row
        const newRowId = rowManager.createNewRow();
        onRowChange?.(newRowId);
      }
    },
    onSwipedDown: () => {
      // Swipe down = activate previous row (row N-1) - AC #1, #2
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
    delta: 50, // Minimum 50px vertical movement to trigger - AC #10
    trackMouse: false, // Only touch, not mouse drag
    trackTouch: true
  });

  // Attach keyboard listener on mount, detach on unmount
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div {...swipeHandlers} className="row-navigator" style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
}
