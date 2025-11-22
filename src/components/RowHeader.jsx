/**
 * RowHeader Component for Visual Status Indicators with Active Row Highlighting
 *
 * Displays status icons at row edges using the StatusIcon component (Story 1.6)
 * and provides visual highlighting for the active row (Story 1.5).
 *
 * Story 1.6: Enhanced with 48x48px SVG status icons and smooth transitions
 * Story 1.5: Active row highlighting with distinct visual styling
 *
 * @component RowHeader
 * @description Row header with status icons and active highlighting
 */

import React from 'react';
import StatusIcon from './StatusIcon';

/**
 * @typedef {Object} RowHeaderProps
 * @property {Object} row - Row object with status information
 * @property {string} row.id - Row identifier
 * @property {boolean} row.isActive - Whether this row is the active row (Story 1.5)
 * @property {number} row.yStart - Top Y coordinate of the row
 * @property {number} row.yEnd - Bottom Y coordinate of the row
 * @property {string} row.ocrStatus - OCR processing status ('pending'|'processing'|'completed'|'error')
 * @property {string} row.validationStatus - Validation status ('pending'|'processing'|'validated'|'invalid'|'error')
 * @property {string|null} row.errorMessage - Error message if processing failed
 * @property {Set<string>} [row.elementIds] - Element IDs in this row
 * @property {number} [row.lastModified] - Last modification timestamp
 * @property {number} y - Y coordinate for positioning the header
 * @property {number} canvasWidth - Width of the canvas for positioning
 * @property {boolean} [debugMode=false] - Enable debug information display
 */

/**
 * RowHeader component for displaying status icons and active row highlighting
 *
 * @param {RowHeaderProps} props - Component props
 * @returns {React.ReactElement|null} Rendered component or null if invalid
 */
export default function RowHeader({
  row,
  y,
  canvasWidth,
  debugMode = false
}) {
  if (!row || typeof y !== 'number' || typeof canvasWidth !== 'number') {
    return null;
  }

  // Story 1.5: Active row highlighting - distinct visual style
  // Story 1.6: Enhanced with 200ms transition for smooth visual feedback
  const highlightStyle = row.isActive
    ? "border-2 border-blue-500 bg-blue-50 bg-opacity-10"
    : "opacity-0"; // Hide highlight for inactive rows

  return (
    <>
      {/* Story 1.5: Active row highlight background */}
      {row.isActive && (
        <div
          className={`absolute ${highlightStyle} transition-all duration-200 pointer-events-none`}
          style={{
            left: 0,
            top: row.yStart,
            width: canvasWidth,
            height: row.yEnd - row.yStart,
            zIndex: 5 // Below status icons
          }}
          data-testid={`row-highlight-${row.id}`}
        />
      )}

      {/* Story 1.6: Enhanced status icon with SVG rendering */}
      <StatusIcon
        row={row}
        canvasWidth={canvasWidth}
        onClick={debugMode ? (row, status) => {
          console.log(`StatusIcon clicked: ${row.id}`, {
            isActive: row.isActive,
            status,
            ocrStatus: row.ocrStatus,
            validationStatus: row.validationStatus,
            elementCount: row.elementIds?.size || 0,
            lastModified: row.lastModified ? new Date(row.lastModified).toISOString() : 'Never',
            errorMessage: row.errorMessage
          });
        } : undefined}
      />

      {/* Debug information overlay (Story 1.6: positioned relative to icon) */}
      {debugMode && (
        <div
          className="absolute bg-black bg-opacity-75 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50"
          style={{
            left: `${canvasWidth - 60}px`,
            top: `${y + 30}px`,
            transform: 'translateX(-50%)',
            pointerEvents: 'none'
          }}
        >
          <div>ID: {row.id}</div>
          <div>Active: {row.isActive ? 'YES' : 'no'}</div>
          <div>OCR: {row.ocrStatus}</div>
          <div>Val: {row.validationStatus}</div>
          <div>Elements: {row.elementIds?.size || 0}</div>
          {row.errorMessage && (
            <div className="text-red-300 truncate max-w-xs">
              Error: {row.errorMessage}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Memoized version of RowHeader to prevent unnecessary re-renders
 * 
 * @param {RowHeaderProps} props - Component props
 * @returns {React.ReactElement} Memoized component
 */
export const MemoizedRowHeader = React.memo(RowHeader, (prevProps, nextProps) => {
  // Only re-render if relevant props change (Story 1.5: added isActive check)
  return (
    prevProps.row.id === nextProps.row.id &&
    prevProps.row.isActive === nextProps.row.isActive &&
    prevProps.row.ocrStatus === nextProps.row.ocrStatus &&
    prevProps.row.validationStatus === nextProps.row.validationStatus &&
    prevProps.row.errorMessage === nextProps.row.errorMessage &&
    prevProps.y === nextProps.y &&
    prevProps.canvasWidth === nextProps.canvasWidth &&
    prevProps.debugMode === nextProps.debugMode
  );
});