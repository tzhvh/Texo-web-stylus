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
 * @property {number} y - Y coordinate for positioning the header
 * @property {number} canvasWidth - Width of the canvas for positioning
 * @property {boolean} [debugMode=false] - Enable debug information display
 */

/**
 * Get status icon and color based on OCR and validation status
 * 
 * @private
 * @param {Object} row - Row object with status information
 * @returns {Object} Icon configuration with symbol, color, and title
 */
const getStatusIcon = (row) => {
  const { ocrStatus, validationStatus, errorMessage } = row;
  
  // Error takes highest priority
  if (errorMessage || ocrStatus === 'error' || validationStatus === 'error') {
    return {
      symbol: '✗',
      color: 'text-red-500',
      bgColor: 'bg-red-100',
      title: `Error: ${errorMessage || 'Processing failed'}`
    };
  }
  
  // Processing indicators
  if (ocrStatus === 'processing' || validationStatus === 'processing') {
    return {
      symbol: '⟳',
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
      title: 'Processing...'
    };
  }
  
  // Success indicators
  if (ocrStatus === 'completed' && validationStatus === 'validated') {
    return {
      symbol: '✓',
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      title: 'OCR completed and validated'
    };
  }
  
  if (ocrStatus === 'completed' && validationStatus === 'invalid') {
    return {
      symbol: '⚠',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      title: 'OCR completed but validation failed'
    };
  }
  
  if (ocrStatus === 'completed') {
    return {
      symbol: '○',
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      title: 'OCR completed, awaiting validation'
    };
  }
  
  // Default pending state
  return {
    symbol: '○',
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
    title: 'Pending processing'
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
  canvasWidth, 
  debugMode = false 
}) {
  if (!row || typeof y !== 'number' || typeof canvasWidth !== 'number') {
    return null;
  }
  
  const statusIcon = getStatusIcon(row);
  
  // Position header at right edge of canvas with some padding
  const headerX = canvasWidth - 60; // 60px from right edge
  const headerY = y; // Align with row start
  
  return (
    <div
      className={`absolute flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-md cursor-pointer transition-all duration-200 hover:scale-110 ${statusIcon.bgColor} ${statusIcon.color}`}
      style={{
        left: `${headerX}px`,
        top: `${headerY}px`,
        transform: 'translate(-50%, -50%)', // Center the circle
        zIndex: 10, // Above guide lines but below UI elements
        pointerEvents: 'auto' // Allow pointer events for individual headers
      }}
      title={statusIcon.title}
      onClick={(e) => {
        e.stopPropagation(); // Prevent canvas interaction
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
      <span className="text-sm font-bold select-none">
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
    prevProps.canvasWidth === nextProps.canvasWidth &&
    prevProps.debugMode === nextProps.debugMode
  );
});