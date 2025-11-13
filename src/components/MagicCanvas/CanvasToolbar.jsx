/**
 * CanvasToolbar Component
 *
 * Draggable toolbar with processing, validation, history, and file controls.
 * Position is persisted to localStorage.
 */

import React, { useState, useCallback, useEffect } from 'react';

export function CanvasToolbar({
  // Processing
  isProcessing,
  selectedRow,
  onProcessAll,
  onProcessRow,

  // Validation
  onValidateAll,
  onClearValidations,
  canValidate,

  // History
  canUndo,
  canRedo,
  onUndo,
  onRedo,

  // File
  hasUnsavedChanges,
  onSave,
  onExport,

  // Debug
  debugMode,
  onToggleDebug,

  // Stats
  stats,
}) {
  // Toolbar dragging state
  const [toolbarPosition, setToolbarPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Drag handlers
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback((e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setToolbarPosition({
      x: Math.max(0, Math.min(newX, window.innerWidth - 300)),
      y: Math.max(0, Math.min(newY, window.innerHeight - 100))
    });
  }, [isDragging, dragOffset]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    localStorage.setItem('toolbarPosition', JSON.stringify(toolbarPosition));
  }, [toolbarPosition]);

  // Global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);

      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  // Initialize position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('toolbarPosition');
    if (savedPosition) {
      try {
        const parsedPosition = JSON.parse(savedPosition);
        setToolbarPosition(parsedPosition);
      } catch (error) {
        console.warn('Failed to parse saved toolbar position');
      }
    }
  }, []);

  return (
    <div
      className={`unified-toolbar draggable ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${toolbarPosition.x}px`,
        top: `${toolbarPosition.y}px`,
        position: 'fixed'
      }}
    >
      {/* Drag handle */}
      <div
        className="toolbar-drag-handle"
        onMouseDown={handleDragStart}
      />

      {/* Processing controls */}
      <button
        onClick={onProcessAll}
        disabled={isProcessing}
        className="btn btn-primary"
      >
        {isProcessing ? "Processing..." : "Process All Rows"}
      </button>

      {selectedRow !== null && (
        <button
          onClick={() => onProcessRow(selectedRow)}
          disabled={isProcessing}
          className="btn btn-secondary"
        >
          Process Row {selectedRow}
        </button>
      )}

      <ToolbarDivider />

      {/* Validation controls */}
      <button
        onClick={onValidateAll}
        disabled={isProcessing || !canValidate}
        className="btn btn-success"
      >
        Validate All
      </button>

      <button
        onClick={onClearValidations}
        disabled={isProcessing}
        className="btn btn-outline"
      >
        Clear Validations
      </button>

      <ToolbarDivider />

      {/* History controls */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="btn btn-outline"
        title="Undo (Ctrl+Z)"
      >
        ↶ Undo
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="btn btn-outline"
        title="Redo (Ctrl+Shift+Z)"
      >
        ↷ Redo
      </button>

      <ToolbarDivider />

      {/* File controls */}
      <button
        onClick={onSave}
        disabled={!hasUnsavedChanges}
        className="btn btn-outline"
        title="Save (Ctrl+S)"
      >
        Save
      </button>

      <button onClick={onExport} className="btn btn-outline">
        Export
      </button>

      <ToolbarDivider />

      {/* Debug mode */}
      <button
        onClick={onToggleDebug}
        className="btn btn-outline"
      >
        Debug: {debugMode ? "ON" : "OFF"}
      </button>

      {/* Info */}
      <div className="toolbar-info">
        <span>{stats.rowCount} rows</span>
        <span>Version: {stats.version}</span>
        {stats.ocrCompleteCount > 0 && (
          <span>OCR: {stats.ocrCompleteCount}/{stats.rowCount}</span>
        )}
        {stats.validationCompleteCount > 0 && (
          <span>Valid: {stats.validationCompleteCount}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Toolbar divider component
 */
function ToolbarDivider() {
  return (
    <div
      style={{
        borderLeft: "1px solid #e5e7eb",
        height: "24px",
        margin: "0 8px",
      }}
    />
  );
}
