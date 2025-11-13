/**
 * StatusBar Component
 *
 * Bottom status bar displaying canvas configuration, document info, and save status.
 */

import React from 'react';

export function StatusBar({
  rowHeight,
  modelName,
  documentId,
  selectedRow,
  lastSaved,
  hasUnsavedChanges,
  historySize,
}) {
  return (
    <div className="status-bar">
      <span>Row height: {rowHeight}px</span>
      <span>Model: {modelName}</span>
      <span>Document: {documentId.substring(0, 8)}...</span>

      {selectedRow !== null && (
        <span>Selected: Row {selectedRow}</span>
      )}

      {lastSaved && (
        <span>Saved: {new Date(lastSaved).toLocaleTimeString()}</span>
      )}

      {hasUnsavedChanges && (
        <span style={{ color: "#f59e0b" }}>● Unsaved</span>
      )}

      {historySize > 1 && (
        <span>History: {historySize}</span>
      )}
    </div>
  );
}
