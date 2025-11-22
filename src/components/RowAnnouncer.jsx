import React, { useEffect, useState, useRef } from 'react';

/**
 * RowAnnouncer - Screen reader announcements for row changes
 *
 * Provides accessibility support (WCAG 2.1 AA) by announcing row changes
 * to screen readers using ARIA live regions.
 *
 * Announcement format: "Row {N} of {total} active"
 * Debounced 300ms to prevent spam during rapid row switching - AC #9
 *
 * @param {Object} props
 * @param {Row} props.activeRow - Current active row object
 * @param {number} props.totalRows - Total number of rows
 */
export default function RowAnnouncer({ activeRow, totalRows }) {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef(null);

  // Debounced announcement (prevent spam on rapid switching)
  useEffect(() => {
    if (!activeRow) return;

    // Clear any pending announcement
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce announcement by 300ms
    timeoutRef.current = setTimeout(() => {
      // Parse row index from row.id format ("row-{index}")
      const rowIndex = parseInt(activeRow.id.split('-')[1], 10);
      const rowNumber = rowIndex + 1; // Convert to 1-indexed for user display

      setAnnouncement(`Row ${rowNumber} of ${totalRows} active`);
    }, 300);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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
