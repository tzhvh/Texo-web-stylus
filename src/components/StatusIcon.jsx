/**
 * StatusIcon Component for Row Status Visualization
 *
 * Displays visual status indicators using SVG icons for each row's
 * OCR and validation status. Icons are positioned at the right edge
 * of rows and serve as touch targets for future inspection panel (Epic 4).
 *
 * Story 1.6: Display Row Status Indicators with Active Row Highlight
 *
 * @component StatusIcon
 * @description SVG-based status icon component with 48x48px size and smooth transitions
 */

import React from 'react';

/**
 * @typedef {Object} StatusIconProps
 * @property {Object} row - Row object with status information
 * @property {string} row.id - Row identifier
 * @property {number} row.yStart - Top Y coordinate of the row
 * @property {number} row.yEnd - Bottom Y coordinate of the row
 * @property {string} row.ocrStatus - OCR processing status
 * @property {string} row.validationStatus - Validation status
 * @property {string|null} row.errorMessage - Error message if processing failed
 * @property {number} canvasWidth - Width of the canvas for positioning
 * @property {Function} [onClick] - Click handler for icon (Epic 4 integration point)
 */

/**
 * Determine icon type based on row status (priority: error > processing > validated > invalid > pending)
 *
 * @private
 * @param {Object} row - Row object with status information
 * @returns {string} Icon type: 'pending'|'processing'|'valid'|'invalid'|'error'
 */
const getIconType = (row) => {
  const { ocrStatus, validationStatus, errorMessage } = row;

  // Error takes highest priority
  if (errorMessage || ocrStatus === 'error' || validationStatus === 'error') {
    return 'error';
  }

  // Processing indicators (spinning animation)
  if (ocrStatus === 'processing' || validationStatus === 'processing') {
    return 'processing';
  }

  // Validation results
  if (validationStatus === 'validated') {
    return 'valid';
  }

  if (validationStatus === 'invalid') {
    return 'invalid';
  }

  // Default pending state
  return 'pending';
};

/**
 * Get icon color based on type
 *
 * @private
 * @param {string} iconType - Icon type
 * @returns {string} Hex color code
 */
const getIconColor = (iconType) => {
  const colors = {
    pending: '#9CA3AF',   // Gray - pending or empty
    processing: '#F97316', // Orange - processing (OCR or validation)
    valid: '#10B981',      // Green - validated as correct
    invalid: '#EF4444',    // Red - validation failed
    error: '#F59E0B'       // Yellow - parse error or warning
  };

  return colors[iconType] || colors.pending;
};

/**
 * Get accessible label for icon type
 *
 * @private
 * @param {string} iconType - Icon type
 * @param {Object} row - Row object
 * @returns {string} Accessible label for screen readers
 */
const getIconLabel = (iconType, row) => {
  const labels = {
    pending: 'Row pending processing',
    processing: 'Row processing in progress',
    valid: 'Row validated successfully',
    invalid: 'Row validation failed',
    error: `Row error: ${row.errorMessage || 'Processing failed'}`
  };

  return `${row.id} - ${labels[iconType]}`;
};

/**
 * SVG icon components for each status type
 * All icons use 48x48px viewBox with consistent stroke widths
 */
const IconSVGs = {
  // Gray ∅: Row empty or pending
  pending: (color) => (
    <circle
      cx="24"
      cy="24"
      r="16"
      fill="none"
      stroke={color}
      strokeWidth="2"
    />
  ),

  // Orange ⟳ (spinning): Processing (OCR or validation)
  processing: (color) => (
    <g className="animate-spin" style={{ transformOrigin: '24px 24px' }}>
      <path
        d="M24 8 A16 16 0 0 1 40 24"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M40 24 L36 20 L40 24 L36 28 Z"
        fill={color}
      />
    </g>
  ),

  // Green ✓: Validated as correct
  valid: (color) => (
    <path
      d="M14 24 L20 30 L34 16"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),

  // Red ✗: Validation failed
  invalid: (color) => (
    <g>
      <line
        x1="14"
        y1="14"
        x2="34"
        y2="34"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="34"
        y1="14"
        x2="14"
        y2="34"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  ),

  // Yellow ⚠️: Parse error or warning
  error: (color) => (
    <g>
      <path
        d="M24 14 L24 26"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="24"
        cy="32"
        r="2"
        fill={color}
      />
    </g>
  )
};

/**
 * StatusIcon component for displaying row status with SVG icons
 *
 * @param {StatusIconProps} props - Component props
 * @returns {React.ReactElement} Rendered SVG icon
 */
export default function StatusIcon({ row, canvasWidth, onClick }) {
  if (!row || typeof canvasWidth !== 'number') {
    return null;
  }

  // Determine icon type and styling
  const iconType = getIconType(row);
  const iconColor = getIconColor(iconType);
  const iconLabel = getIconLabel(iconType, row);

  // Position at right edge: (canvasWidth - 60px, rowCenterY)
  const iconX = canvasWidth - 60;
  const iconY = (row.yStart + row.yEnd) / 2;

  // Handle icon click (Epic 4 integration point)
  const handleClick = (e) => {
    e.stopPropagation(); // Prevent canvas interaction

    if (onClick) {
      onClick(row, iconType);
    } else {
      // Placeholder for Epic 4 inspection panel integration
      console.log('StatusIcon clicked:', {
        rowId: row.id,
        status: iconType,
        ocrStatus: row.ocrStatus,
        validationStatus: row.validationStatus
      });
    }
  };

  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      style={{
        position: 'absolute',
        left: `${iconX}px`,
        top: `${iconY - 24}px`, // Center vertically (subtract half height)
        cursor: 'pointer',
        pointerEvents: 'auto', // Enable pointer events for tap target
        transition: 'opacity 200ms ease', // Smooth fade-in transitions (AC #6)
        opacity: iconType === 'pending' ? 0.5 : 1,
        zIndex: 10 // Above guide lines
      }}
      aria-label={iconLabel}
      role="img"
      onClick={handleClick}
      data-testid={`status-icon-${row.id}`}
      data-status={iconType}
    >
      {/* 44x44px invisible tap target (WCAG 2.1 AA compliance) */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        fill="transparent"
        data-testid="tap-target"
      />

      {/* Render icon SVG */}
      {IconSVGs[iconType](iconColor)}
    </svg>
  );
}

/**
 * Memoized version of StatusIcon to prevent unnecessary re-renders
 * Only re-renders when status or position changes
 */
export const MemoizedStatusIcon = React.memo(StatusIcon, (prevProps, nextProps) => {
  return (
    prevProps.row.id === nextProps.row.id &&
    prevProps.row.ocrStatus === nextProps.row.ocrStatus &&
    prevProps.row.validationStatus === nextProps.row.validationStatus &&
    prevProps.row.errorMessage === nextProps.row.errorMessage &&
    prevProps.row.yStart === nextProps.row.yStart &&
    prevProps.row.yEnd === nextProps.row.yEnd &&
    prevProps.canvasWidth === nextProps.canvasWidth
  );
});

MemoizedStatusIcon.displayName = 'MemoizedStatusIcon';
