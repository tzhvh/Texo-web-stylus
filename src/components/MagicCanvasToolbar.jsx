import React, { useState, useEffect } from 'react';

/**
 * MagicCanvasToolbar - Minimalist floating toolbar for canvas actions
 * Story 1.10: Provides "+ Row" button for creating new rows
 *
 * Features:
 * - Auto-hide after 3 seconds of inactivity
 * - Keyboard accessible (Tab + Enter)
 * - WCAG 2.1 AA compliant (44x44px minimum tap target)
 * - Responsive design (hides text on small screens)
 *
 * @param {Object} props
 * @param {RowManager} props.rowManager - RowManager instance
 * @param {Function} props.onRowCreate - Callback when row created
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

  // Initialize auto-hide timer on mount
  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle row creation (Story 1.10, AC #8)
  const handleCreateRow = () => {
    const newRowId = rowManager.createNewRow();
    onRowCreate?.(newRowId);
    resetHideTimer(); // Keep toolbar visible after action
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
      role="toolbar"
      aria-label="Canvas actions"
    >
      <button
        onClick={handleCreateRow}
        className="
          flex items-center gap-2 px-3 py-2
          text-sm font-medium text-gray-700
          hover:bg-gray-100 active:bg-gray-200
          rounded-md
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          min-h-[44px] min-w-[44px]
          transition-colors duration-150
        "
        aria-label="Create new row"
        title="Create new row (or press Down arrow on last row)"
      >
        {/* Plus Icon SVG */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span className="hidden sm:inline">New Row</span>
      </button>
    </div>
  );
}
