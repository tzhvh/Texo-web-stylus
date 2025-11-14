/**
 * RowHeader Component for Visual Status Indicators
 * 
 * Displays status icons at row edges to provide visual feedback about
 * OCR and validation status for each row in Magic Canvas.
 * 
 * @component RowHeader
 * @description Visual status indicator component for row processing states
 */

import React from 'react';

/**
 * @typedef {Object} RowHeaderProps
 * @property {Object} row - Row object with status information
 * @property {string} row.id - Row identifier
 * @property {string} row.ocrStatus - OCR processing status ('pending'|'processing'|'completed'|'error')
 * @property {string} row.validationStatus - Validation status ('pending'|'processing'|'validated'|'invalid'|'error')
 * @property {string|null} row.errorMessage - Error message if processing failed
 * @property {number} y - Y coordinate for positioning of row start (grid-aligned)
 * @property {number} [yCenter] - Pre-computed row center Y coordinate (optional, computed from row if not provided)
 * @property {number} canvasWidth - Width of canvas for positioning
 * @property {boolean} [debugMode=false] - Enable debug information display
 */

/**
 * Get status icon and color based on OCR and validation status
 * 
 * @private
 * @param {Object} row - Row object with status information
 * @returns {Object} Icon configuration with symbol, color, title, and animation
 */
const getStatusIcon = (row) => {
  const { ocrStatus, validationStatus, errorMessage } = row;
  
  // Error takes highest priority
  if (errorMessage || ocrStatus === 'error' || validationStatus === 'error') {
    return {
      symbol: '✗',
      color: 'text-red-500',
      bgColor: 'bg-red-100',
      title: `Error: ${errorMessage || 'Processing failed'}`,
      animation: null
    };
  }
  
  // Processing indicators with spinning animation
  if (ocrStatus === 'processing' || validationStatus === 'processing') {
    return {
      symbol: '⟳',
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
      title: 'Processing...',
      animation: 'spin'
    };
  }
  
  // Success indicators
  if (ocrStatus === 'completed' && validationStatus === 'validated') {
    return {
      symbol: '✓',
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      title: 'OCR completed and validated',
      animation: null
    };
  }
  
  if (ocrStatus === 'completed' && validationStatus === 'invalid') {
    return {
      symbol: '⚠️',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      title: 'OCR completed but validation failed',
      animation: null
    };
  }
  
  if (ocrStatus === 'completed') {
    return {
      symbol: '○',
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      title: 'OCR completed, awaiting validation',
      animation: null
    };
  }
  
  // Default pending state with empty set symbol
  return {
    symbol: '∅',
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
    title: 'Pending processing',
    animation: null
  };
};

/**
 * RowHeader component for displaying visual status indicators
 * 
 * @param {RowHeaderProps} props - Component props
 * @returns {React.ReactElement|null} Rendered component or null if invalid
 */
export default function RowHeader({
  row,
  y,
  yCenter,
  canvasWidth,
  debugMode = false
}) {
  if (!row || typeof y !== 'number' || typeof canvasWidth !== 'number') {
    return null;
  }

  const statusIcon = getStatusIcon(row);

  // Position header at right edge of canvas with some padding
  // AC: Icons positioned at: (canvasWidth - 60px, rowCenterY)
  const headerX = canvasWidth - 60; // 60px from right edge
  // Use pre-computed yCenter if provided, otherwise compute from row bounds
  const headerY = yCenter ?? (row.yCenter ?? (y + (row.yEnd - row.yStart) / 2));
  
  return (
    <>
      {/* Row separator line at top of row */}
      <div
        className="row-separator absolute pointer-events-none"
        style={{
          left: '0px',
          top: `${y}px`,
          width: `${canvasWidth}px`,
          height: '2px',
          backgroundColor: '#cbd5e1', // Tailwind slate-300
          opacity: 0.6,
          zIndex: 999, // Below status icon but above canvas
        }}
      />

      {/* Status icon */}
      <div
        role="button"
        className={`row-status-icon absolute flex items-center justify-center w-12 h-12 rounded-full border-2 border-white shadow-md cursor-pointer transition-opacity duration-200 hover:scale-110 ${statusIcon.bgColor} ${statusIcon.color} ${
          statusIcon.animation === 'spin' ? 'animate-spin' : ''
        }`}
        style={{
          left: `${headerX}px`,
          top: `${headerY}px`,
          transform: 'translate(-50%, -50%)', // Center icon
          zIndex: 1000, // AC: Separate layer (z-index: 1000)
          pointerEvents: 'auto', // Allow pointer events for tap targets
          width: '48px', // AC: 48x48px icons
          height: '48px' // AC: 48x48px icons
        }}
        title={statusIcon.title}
        onClick={(e) => {
          e.stopPropagation(); // Prevent canvas interaction
          // Store tap handler for Story 4.1 integration
          if (window.rowHeaderTapHandler) {
            window.rowHeaderTapHandler(row);
          }
          if (debugMode) {
            console.log(`RowHeader clicked: ${row.id}`, {
              ocrStatus: row.ocrStatus,
              validationStatus: row.validationStatus,
              elementCount: row.elementIds?.size || 0,
              lastModified: row.lastModified ? new Date(row.lastModified).toISOString() : 'Never',
              errorMessage: row.errorMessage
            });
          }
        }}
      >
        <span className="text-lg font-bold select-none">
          {statusIcon.symbol}
        </span>

        {/* Debug information overlay */}
        {debugMode && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-black bg-opacity-75 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
            <div>ID: {row.id}</div>
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
      </div>
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
  // Only re-render if relevant props change
  return (
    prevProps.row.id === nextProps.row.id &&
    prevProps.row.ocrStatus === nextProps.row.ocrStatus &&
    prevProps.row.validationStatus === nextProps.row.validationStatus &&
    prevProps.row.errorMessage === nextProps.row.errorMessage &&
    prevProps.y === nextProps.y &&
    prevProps.yCenter === nextProps.yCenter &&
    prevProps.canvasWidth === nextProps.canvasWidth &&
    prevProps.debugMode === nextProps.debugMode
  );
});