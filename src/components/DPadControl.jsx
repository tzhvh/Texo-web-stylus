/**
 * DPadControl Component - Structured Canvas Navigation
 *
 * Provides d-pad based navigation for grid-aligned drawing on Magic Canvas.
 * Replaces free-form Excalidraw controls with structured, row-based input.
 *
 * Features:
 * - Row navigation (up/down arrows)
 * - Horizontal scrolling within rows (left/right arrows)
 * - Jump to specific row
 * - Zoom controls (fixed levels)
 * - Drawing mode toggle
 *
 * @component DPadControl
 */

import React, { useState, useCallback } from 'react';
import { GRID_CONFIG } from '../config/gridConfig.js';

/**
 * @typedef {Object} DPadControlProps
 * @property {Object} excalidrawAPI - Excalidraw API instance
 * @property {number} currentRowIndex - Currently focused row index
 * @property {Function} onNavigate - Callback when navigation changes (rowIndex, xOffset)
 * @property {Function} onZoomChange - Callback when zoom level changes
 * @property {boolean} [drawingEnabled=false] - Whether drawing mode is active
 * @property {Function} onDrawingToggle - Callback to toggle drawing mode
 */

export default function DPadControl({
  excalidrawAPI,
  currentRowIndex,
  onNavigate,
  onZoomChange,
  drawingEnabled = false,
  onDrawingToggle
}) {
  const [xOffset, setXOffset] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Navigate to previous row
  const handleRowUp = useCallback(() => {
    const newRowIndex = Math.max(0, currentRowIndex - 1);
    onNavigate(newRowIndex, xOffset);
  }, [currentRowIndex, xOffset, onNavigate]);

  // Navigate to next row
  const handleRowDown = useCallback(() => {
    const newRowIndex = currentRowIndex + 1;
    onNavigate(newRowIndex, xOffset);
  }, [currentRowIndex, xOffset, onNavigate]);

  // Scroll left within current row
  const handleScrollLeft = useCallback(() => {
    const newXOffset = Math.max(0, xOffset - 200);
    setXOffset(newXOffset);
    onNavigate(currentRowIndex, newXOffset);
  }, [currentRowIndex, xOffset, onNavigate]);

  // Scroll right within current row
  const handleScrollRight = useCallback(() => {
    const newXOffset = Math.min(GRID_CONFIG.CANVAS_WIDTH - 600, xOffset + 200);
    setXOffset(newXOffset);
    onNavigate(currentRowIndex, newXOffset);
  }, [currentRowIndex, xOffset, onNavigate]);

  // Jump to specific row
  const handleRowJump = useCallback((targetRow) => {
    if (typeof targetRow === 'number' && targetRow >= 0) {
      onNavigate(targetRow, xOffset);
    }
  }, [xOffset, onNavigate]);

  // Zoom in (fixed levels: 0.5x, 1x, 1.5x, 2x)
  const handleZoomIn = useCallback(() => {
    const zoomLevels = [0.5, 1, 1.5, 2];
    const currentIndex = zoomLevels.findIndex(z => z === zoomLevel);
    if (currentIndex < zoomLevels.length - 1) {
      const newZoom = zoomLevels[currentIndex + 1];
      setZoomLevel(newZoom);
      onZoomChange(newZoom);
    }
  }, [zoomLevel, onZoomChange]);

  // Zoom out (fixed levels: 0.5x, 1x, 1.5x, 2x)
  const handleZoomOut = useCallback(() => {
    const zoomLevels = [0.5, 1, 1.5, 2];
    const currentIndex = zoomLevels.findIndex(z => z === zoomLevel);
    if (currentIndex > 0) {
      const newZoom = zoomLevels[currentIndex - 1];
      setZoomLevel(newZoom);
      onZoomChange(newZoom);
    }
  }, [zoomLevel, onZoomChange]);

  // Reset to default view (row 0, zoom 1x)
  const handleReset = useCallback(() => {
    setXOffset(0);
    setZoomLevel(1);
    onNavigate(0, 0);
    onZoomChange(1);
  }, [onNavigate, onZoomChange]);

  return (
    <div className="dpad-control fixed right-6 bottom-6 bg-white border-2 border-gray-300 rounded-lg p-4 shadow-lg z-50">
      {/* Current Row Display */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-600 font-medium">Current Row</p>
        <p className="text-2xl font-bold text-blue-600">row-{currentRowIndex}</p>
        <p className="text-xs text-gray-500 mt-1">
          Y: {GRID_CONFIG.ROW_HEIGHT * currentRowIndex} - {GRID_CONFIG.ROW_HEIGHT * (currentRowIndex + 1)}px
        </p>
      </div>

      {/* D-Pad Navigation */}
      <div className="mb-4">
        <p className="text-xs text-gray-600 font-medium mb-2 text-center">Navigate</p>
        <div className="grid grid-cols-3 gap-2">
          {/* Top row */}
          <div></div>
          <button
            onClick={handleRowUp}
            className="dpad-btn bg-blue-500 hover:bg-blue-600 text-white rounded p-3 transition"
            aria-label="Move to previous row"
            title="Previous Row (↑)"
          >
            ↑
          </button>
          <div></div>

          {/* Middle row */}
          <button
            onClick={handleScrollLeft}
            className="dpad-btn bg-blue-500 hover:bg-blue-600 text-white rounded p-3 transition"
            aria-label="Scroll left"
            title="Scroll Left (←)"
          >
            ←
          </button>
          <button
            onClick={handleReset}
            className="dpad-btn bg-gray-500 hover:bg-gray-600 text-white rounded p-3 transition text-xs"
            aria-label="Reset view"
            title="Reset View"
          >
            ⌂
          </button>
          <button
            onClick={handleScrollRight}
            className="dpad-btn bg-blue-500 hover:bg-blue-600 text-white rounded p-3 transition"
            aria-label="Scroll right"
            title="Scroll Right (→)"
          >
            →
          </button>

          {/* Bottom row */}
          <div></div>
          <button
            onClick={handleRowDown}
            className="dpad-btn bg-blue-500 hover:bg-blue-600 text-white rounded p-3 transition"
            aria-label="Move to next row"
            title="Next Row (↓)"
          >
            ↓
          </button>
          <div></div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="mb-4 border-t border-gray-200 pt-4">
        <p className="text-xs text-gray-600 font-medium mb-2 text-center">Zoom: {Math.round(zoomLevel * 100)}%</p>
        <div className="flex gap-2">
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded p-2 transition text-sm"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel >= 2}
            className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded p-2 transition text-sm"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      {/* Drawing Mode Toggle */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={onDrawingToggle}
          className={`w-full rounded p-3 transition font-medium ${
            drawingEnabled
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          aria-label="Toggle drawing mode"
        >
          {drawingEnabled ? '✏️ Drawing ON' : '✏️ Drawing OFF'}
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          {drawingEnabled ? 'Click canvas to draw in current row' : 'Enable drawing to add content'}
        </p>
      </div>

      {/* Quick Jump */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-600 font-medium mb-2">Quick Jump</p>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            placeholder="Row #"
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value)) {
                  handleRowJump(value);
                  e.target.value = '';
                }
              }
            }}
          />
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1 text-sm transition"
            onClick={(e) => {
              const input = e.target.previousElementSibling;
              const value = parseInt(input.value, 10);
              if (!isNaN(value)) {
                handleRowJump(value);
                input.value = '';
              }
            }}
          >
            Go
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 text-center">
          Keyboard: Arrow keys to navigate, Space to toggle drawing
        </p>
      </div>
    </div>
  );
}
