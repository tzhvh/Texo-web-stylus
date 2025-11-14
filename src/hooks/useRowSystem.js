/**
 * useRowSystem Hook for Canvas-Row Synchronization
 *
 * Synchronizes Excalidraw canvas state with RowManager to automatically
 * assign drawn elements to rows based on Y coordinates. Handles element
 * lifecycle events (new, modified, deleted) with debounced processing
 * for optimal performance during rapid drawing scenarios.
 *
 * @hook useRowSystem
 * @description React hook for managing element-to-row assignments in Magic Canvas
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import Logger from '../utils/logger.js';
import RowManager from '../utils/rowManager.js';
import { saveSessionState, loadSessionState } from '../utils/workspaceDB.js';

/**
 * @typedef {Object} UseRowSystemOptions
 * @property {Object} excalidrawAPI - Excalidraw API instance
 * @property {RowManager} rowManager - RowManager instance for state management
 * @property {number} [debounceMs=50] - Debounce time for rapid drawing scenarios
 * @property {boolean} [debugMode=false] - Enable debug logging
 * @property {string} [workspaceId='default'] - Workspace ID for persistence
 * @property {number} [autoSaveMs=2000] - Auto-save delay after changes (2s default)
 */

/**
 * @typedef {Object} UseRowSystemReturn
 * @property {Map<string, string>} elementToRow - Element ID to row ID mapping
 * @property {Function} handleCanvasChange - Handler for Excalidraw onChange events
 * @property {Function} getElementRow - Get row ID for an element
 * @property {Function} getRowCount - Get total number of rows with elements
 * @property {Object} stats - Statistics about element assignments
 * @property {Function} saveState - Manually save current state to IndexedDB
 * @property {Function} loadState - Manually load state from IndexedDB
 * @property {boolean} isSaving - Whether a save operation is in progress
 * @property {boolean} isLoading - Whether a load operation is in progress
 */

/**
 * Custom hook for synchronizing Excalidraw canvas with RowManager
 *
 * @param {UseRowSystemOptions} options - Hook configuration options
 * @returns {UseRowSystemReturn} Hook return value with state and handlers
 */
export default function useRowSystem({
  excalidrawAPI,
  rowManager,
  debounceMs = 50,
  debugMode = false,
  workspaceId = 'default',
  autoSaveMs = 2000
}) {
  // Track element-to-row mappings for UI updates
  const [elementToRow, setElementToRow] = useState(new Map());

  // Track assignment statistics for debugging
  const [stats, setStats] = useState({
    totalAssignments: 0,
    lastAssignmentTime: 0,
    averageAssignmentTime: 0,
    errorCount: 0
  });

  // Track persistence state
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for performance optimization
  const previousElementsRef = useRef(new Map());
  const debounceTimeoutRef = useRef(null);
  const assignmentTimesRef = useRef([]);
  const processingRef = useRef(false);
  const autoSaveTimeoutRef = useRef(null);
  const lastSaveTimeRef = useRef(0);
  const changeQueueRef = useRef([]);
  const queueTimeoutRef = useRef(null);

  /**
   * Memory cleanup function with circular buffer pattern
   */
  const cleanupAssignmentTimes = useCallback(() => {
    const maxHistory = 1000;
    if (assignmentTimesRef.current.length > maxHistory) {
      // Use circular buffer pattern for better performance
      assignmentTimesRef.current = assignmentTimesRef.current.slice(-maxHistory);
    }
  }, []);

  /**
   * Queue changes for batch processing
   *
   * @private
   * @param {Object} changes - Element changes to queue
   */
  const queueChanges = useCallback((changes) => {
    // Add to queue
    changeQueueRef.current.push(changes);

    // Clear existing queue timeout
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
    }

    // Process queue after a short delay for better batching
    queueTimeoutRef.current = setTimeout(() => {
      const queue = changeQueueRef.current;
      if (queue.length === 0) return;

      // Merge all queued changes into a single batch
      const mergedChanges = {
        new: [],
        modified: [],
        deleted: []
      };

      for (const changes of queue) {
        mergedChanges.new.push(...changes.new);
        mergedChanges.modified.push(...changes.modified);
        mergedChanges.deleted.push(...changes.deleted);
      }

      // Clear queue
      changeQueueRef.current = [];

      // Process merged changes
      processElementChanges(mergedChanges);
    }, 16); // ~60fps for smooth performance
  }, [processElementChanges]);

  /**
   * Clear all queued changes without processing
   *
   * @private
   */
  const clearQueue = useCallback(() => {
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
      queueTimeoutRef.current = null;
    }
    changeQueueRef.current = [];
  }, []);

  return {
  /**
   * Check if element has changed in ways that affect row assignment
   *
   * @private
   * @param {Object} element - Current element state
   * @param {Object} previousElement - Previous element state
   * @returns {boolean} True if element affects row assignment
   */
  const hasElementChanged = useCallback((element, previousElement) => {
    if (!element || !previousElement) return true;

    // Only check properties that affect row assignment
    const relevantProps = ['x', 'y', 'width', 'height', 'isDeleted'];

    for (const prop of relevantProps) {
      if (JSON.stringify(element[prop]) !== JSON.stringify(previousElement[prop])) {
        return true;
      }
    }

    return false;
  }, []);

  /**
   * Queue changes for batch processing
   *
   * @private
   * @param {Object} changes - Element changes to queue
   */
  const queueChanges = useCallback((changes) => {
    // Add to queue
    changeQueueRef.current.push(changes);

    // Clear existing queue timeout
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
    }

    // Process queue after a short delay for better batching
    queueTimeoutRef.current = setTimeout(() => {
      const queue = changeQueueRef.current;
      if (queue.length === 0) return;

      // Merge all queued changes into a single batch
      const mergedChanges = {
        new: [],
        modified: [],
        deleted: []
      };

      for (const changes of queue) {
        mergedChanges.new.push(...changes.new);
        mergedChanges.modified.push(...changes.modified);
        mergedChanges.deleted.push(...changes.deleted);
      }

      // Clear queue
      changeQueueRef.current = [];

      // Process merged changes
      processElementChanges(mergedChanges);
    }, 16); // ~60fps for smooth performance
  }, [processElementChanges]);

  /**
   * Detect element changes (new, modified, deleted)
   *
   * @private
   * @param {Array} currentElements - Current elements from Excalidraw
   * @param {Map} previousMap - Previous elements map
   * @returns {Object} Object with arrays of new, modified, and deleted elements
   */
  const detectElementChanges = useCallback((currentElements, previousMap) => {
    const currentMap = new Map(currentElements.map(el => [el.id, el]));
    const changes = { new: [], modified: [], deleted: [] };

    // Find new and modified elements
    for (const [id, element] of currentMap) {
      if (!previousMap.has(id)) {
        changes.new.push(element);
      } else if (hasElementChanged(element, previousMap.get(id))) {
        changes.modified.push(element);
      }
    }

    // Find deleted elements
    for (const [id] of previousMap) {
      if (!currentMap.has(id)) {
        changes.deleted.push(id);
      }
    }

    return changes;
  }, [hasElementChanged]);

  /**
   * Save current RowManager state to IndexedDB
   *
   * @private
   * @param {boolean} [force=false] - Force save even if recently saved
   * @returns {Promise<void>}
   */
  const saveState = useCallback(async (force = false) => {
    const now = Date.now();

    // Throttle saves to avoid excessive writes (minimum 1s between saves unless forced)
    if (!force && now - lastSaveTimeRef.current < 1000) {
      if (debugMode) {
        Logger.debug('useRowSystem', 'Save throttled - too recent', {
          timeSinceLastSave: now - lastSaveTimeRef.current
        });
      }
      return;
    }

    try {
      setIsSaving(true);

      // Serialize RowManager state
      const serializedState = rowManager.serialize();

      // Save to IndexedDB with workspace-specific key
      await saveSessionState(`rowManager-${workspaceId}`, serializedState);

      lastSaveTimeRef.current = now;

      if (debugMode) {
        Logger.debug('useRowSystem', 'State saved to IndexedDB', {
          workspaceId,
          rowCount: serializedState.rows.length,
          elementMappings: Object.keys(serializedState.elementToRow).length,
          saveTime: (Date.now() - now) + 'ms'
        });
      }
    } catch (error) {
      Logger.error('useRowSystem', 'Failed to save state to IndexedDB', {
        workspaceId,
        error: error.message,
        stack: error.stack
      });

      setStats(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }));
    } finally {
      setIsSaving(false);
    }
  }, [rowManager, workspaceId, debugMode]);

  /**
   * Load RowManager state from IndexedDB
   *
   * @private
   * @returns {Promise<boolean>} True if state was loaded successfully
   */
  const loadState = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load from IndexedDB with workspace-specific key
      const savedState = await loadSessionState(`rowManager-${workspaceId}`);

      if (savedState) {
        // Deserialize into RowManager
        rowManager.deserialize(savedState);

        if (debugMode) {
          Logger.debug('useRowSystem', 'State loaded from IndexedDB', {
            workspaceId,
            rowCount: savedState.rows.length,
            elementMappings: Object.keys(savedState.elementToRow).length
          });
        }

        return true;
      } else {
        if (debugMode) {
          Logger.debug('useRowSystem', 'No saved state found in IndexedDB', {
            workspaceId
          });
        }

        return false;
      }
    } catch (error) {
      Logger.error('useRowSystem', 'Failed to load state from IndexedDB', {
        workspaceId,
        error: error.message,
        stack: error.stack
      });

      setStats(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }));

      return false;
    } finally {
      setIsLoading(false);
    }
  }, [rowManager, workspaceId, debugMode]);

  /**
   * Schedule auto-save with debouncing
   *
   * @private
   */
  const scheduleAutoSave = useCallback(() => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    if (debounceTimeoutRef.current) {
      cancelAnimationFrame(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Schedule new auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveState();
    }, autoSaveMs);

    // Clear any pending queue processing to prevent race conditions
    clearQueue();
  }, [saveState, autoSaveMs, clearQueue]);

  /**
   * Process element changes with optimized batch operations
   *
   * @private
   * @param {Object} changes - Element changes from detectElementChanges
   */
  const processElementChanges = useCallback((changes) => {
    if (processingRef.current) {
      if (debugMode) {
        Logger.debug('useRowSystem', 'Skipping processing - already in progress');
      }
      return;
    }

    processingRef.current = true;
    const startTime = performance.now();

    try {
      const { new: newElements, modified: modifiedElements, deleted: deletedIds } = changes;

      // Pre-allocate Maps for O(1) lookups
      const elementIdToCurrentRowMap = new Map();
      const rowsToUpdate = new Map();
      const assignmentTimes = [];

      // Process new elements
      for (const element of newElements) {
        if (element.id && !element.id.startsWith('guide-')) {
          const assignmentStartTime = performance.now();
          const rowId = rowManager.assignElement(element);
          const assignmentTime = performance.now() - assignmentStartTime;

          if (rowId) {
            assignmentTimes.push(assignmentTime);
            // Batch the row update
            rowsToUpdate.set(rowId, { ocrStatus: 'pending', lastModified: Date.now() });

            if (debugMode) {
              Logger.debug('useRowSystem', 'Assigned new element to row', {
                elementId: element.id,
                rowId,
                assignmentTime: assignmentTime.toFixed(2) + 'ms'
              });
            }
          }
        }
      }



      // Build element ID to current row map for O(1) lookups
      for (const element of modifiedElements) {
        if (element.id && !element.id.startsWith('guide-')) {
          const currentRowId = rowManager.elementToRow.get(element.id);
          if (currentRowId) {
            elementIdToCurrentRowMap.set(element.id, currentRowId);
          }
        }
      }

      // Process modified elements (same-row modifications)
      for (const element of modifiedElements) {
        if (element.id && !element.id.startsWith('guide-')) {
          const assignmentStartTime = performance.now();

          // Get current assignment to detect cross-row moves (O(1) lookup)
          const currentRowId = elementIdToCurrentRowMap.get(element.id);

          const rowId = rowManager.assignElement(element);
          const assignmentTime = performance.now() - assignmentStartTime;

          if (rowId) {
            assignmentTimes.push(assignmentTime);

            // Check if this was a cross-row move
            if (currentRowId && currentRowId !== rowId) {
              // Batch updates for both source and target rows
              rowsToUpdate.set(currentRowId, { ocrStatus: 'pending', lastModified: Date.now() });
              rowsToUpdate.set(rowId, { ocrStatus: 'pending', lastModified: Date.now() });

              if (debugMode) {
                Logger.debug('useRowSystem', 'Processed cross-row element move', {
                  elementId: element.id,
                  sourceRowId: currentRowId,
                  targetRowId: rowId,
                  assignmentTime: assignmentTime.toFixed(2) + 'ms'
                });
              }
            } else if (rowId) {
              // Same-row modification - batch update
              rowsToUpdate.set(rowId, { ocrStatus: 'pending', lastModified: Date.now() });

              if (debugMode) {
                Logger.debug('useRowSystem', 'Processed same-row element modification', {
                  elementId: element.id,
                  rowId,
                  assignmentTime: assignmentTime.toFixed(2) + 'ms'
                });
              }
            }
          }
        }
      }

      // Process deleted elements
      for (const elementId of deletedIds) {
        if (!elementId.startsWith('guide-')) {
          // Get row ID before removal for metadata update
          const previousRowId = rowManager.elementToRow.get(elementId);

          rowManager.removeElement(elementId);

          // Batch update for element deletion
          if (previousRowId) {
            rowsToUpdate.set(previousRowId, { ocrStatus: 'pending', lastModified: Date.now() });
          }

          if (debugMode) {
            Logger.debug('useRowSystem', 'Removed deleted element from row', {
              elementId,
              previousRowId
            });
          }
        }
      }

      // Apply all batched row updates in single pass
      for (const [rowId, updates] of rowsToUpdate) {
        rowManager.updateRow(rowId, updates);
      }

      // Update element-to-row mapping for UI (single pass)
      const updatedMapping = new Map();
      const allRows = rowManager.getAllRows();

      for (let i = 0; i < allRows.length; i++) {
        const row = allRows[i];
        const elementIds = Array.from(row.elementIds);
        for (let j = 0; j < elementIds.length; j++) {
          updatedMapping.set(elementIds[j], row.id);
        }
      }

      setElementToRow(updatedMapping);

      // Update statistics
      const totalProcessingTime = performance.now() - startTime;

      // Update assignment times with memory management (circular buffer)
      assignmentTimesRef.current.push(...assignmentTimes);
      const maxHistory = 1000; // Keep last 1000 assignment times
      if (assignmentTimesRef.current.length > maxHistory) {
        assignmentTimesRef.current = assignmentTimesRef.current.slice(-maxHistory);
      }

      const avgAssignmentTime = assignmentTimesRef.current.length > 0
        ? assignmentTimesRef.current.reduce((a, b) => a + b, 0) / assignmentTimesRef.current.length
        : 0;

      setStats(prev => ({
        totalAssignments: prev.totalAssignments + newElements.length + modifiedElements.length,
        lastAssignmentTime: Date.now(),
        averageAssignmentTime: avgAssignmentTime,
        errorCount: prev.errorCount
      }));

      // Schedule auto-save if there were changes
      if (newElements.length > 0 || modifiedElements.length > 0 || deletedIds.length > 0) {
        scheduleAutoSave();
      }

      if (debugMode) {
        Logger.info('useRowSystem', 'Processed element changes', {
          newElements: newElements.length,
          modifiedElements: modifiedElements.length,
          deletedElements: deletedIds.length,
          totalProcessingTime: totalProcessingTime.toFixed(2) + 'ms',
          averageAssignmentTime: avgAssignmentTime.toFixed(2) + 'ms',
          totalRows: allRows.length
        });
  }

  // Periodic memory cleanup
  if (assignmentTimesRef.current.length > 500) {
    cleanupAssignmentTimes();
  }
} catch (error) {
      Logger.error('useRowSystem', 'Error processing element changes', {
        error: error.message,
        stack: error.stack
      });

      setStats(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }));
    } finally {
      processingRef.current = false;
    }
  }, [rowManager, debugMode, cleanupAssignmentTimes]);

  /**
   * Debounced handler for Excalidraw onChange events with RAF optimization
   *
   * @param {Array} elements - Current elements from Excalidraw
   * @param {Object} appState - Current application state
   * @param {Array} files - Files (if any)
   */
  const handleCanvasChange = useCallback((elements, appState, files) => {
    // Clear existing timeouts
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Use requestAnimationFrame for smoother performance during rapid changes
    debounceTimeoutRef.current = setTimeout(() => {
      // Use requestAnimationFrame to batch DOM updates
      requestAnimationFrame(() => {
        const changes = detectElementChanges(elements, previousElementsRef.current);

        // Only process if there are actual changes
        if (changes.new.length > 0 || changes.modified.length > 0 || changes.deleted.length > 0) {
          // Add to processing queue instead of immediate processing for better batching
          queueChanges(changes);
        }

        // Update previous elements reference
        previousElementsRef.current = new Map(elements.map(el => [el.id, el]));
      });
    }, debounceMs);
  }, [detectElementChanges, queueChanges, debounceMs]);

  /**
   * Get row ID for a specific element
   *
   * @param {string} elementId - ID of element to look up
   * @returns {string|null} Row ID or null if element not assigned
   */
  const getElementRow = useCallback((elementId) => {
    return elementToRow.get(elementId) || null;
  }, [elementToRow]);

  /**
   * Get total number of rows that have elements assigned
   *
   * @returns {number} Number of rows with elements
   */
  const getRowCount = useCallback(() => {
    const allRows = rowManager.getAllRows();
    return allRows.filter(row => row.elementIds.size > 0).length;
  }, [rowManager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (queueTimeoutRef.current) {
        clearTimeout(queueTimeoutRef.current);
      }
      // Clear any pending changes
      changeQueueRef.current = [];
      // Save final state on unmount
      if (rowManager) {
        saveState(true); // Force save on unmount
      }
    };
  }, [rowManager, saveState]);

  // Initialize element-to-row mapping on mount
  useEffect(() => {
    const initialize = async () => {
      if (excalidrawAPI && rowManager) {
        try {
          // Try to load saved state first
          const stateLoaded = await loadState();

          // Get current elements from canvas
          const elements = excalidrawAPI.getSceneElements() || [];

          if (stateLoaded) {
            // If state was loaded, sync with current canvas elements
            const changes = { new: [], modified: [], deleted: [], moved: [] };

            // Find elements that are new (not in loaded state)
            const loadedElementIds = new Set();
            const allRows = rowManager.getAllRows();
            for (const row of allRows) {
              for (const elementId of row.elementIds) {
                loadedElementIds.add(elementId);
              }
            }

            for (const element of elements) {
              if (element.id && !element.id.startsWith('guide-')) {
                if (!loadedElementIds.has(element.id)) {
                  changes.new.push(element);
                }
              }
            }

            // Process only new elements
            if (changes.new.length > 0) {
              processElementChanges(changes);
            }

            // Update element-to-row mapping from loaded state
            const updatedMapping = new Map();
            for (const row of allRows) {
              for (const elementId of row.elementIds) {
                updatedMapping.set(elementId, row.id);
              }
            }
            setElementToRow(updatedMapping);

            if (debugMode) {
              Logger.info('useRowSystem', 'Initialized from saved state', {
                elementCount: elements.length,
                rowCount: getRowCount(),
                newElements: changes.new.length
              });
            }
          } else {
            // No saved state, process all elements as new
            const changes = { new: elements, modified: [], deleted: [], moved: [] };
            processElementChanges(changes);

            if (debugMode) {
              Logger.info('useRowSystem', 'Initialized with fresh state', {
                elementCount: elements.length,
                rowCount: getRowCount()
              });
            }
          }

          // Set initial previous elements reference
          previousElementsRef.current = new Map(elements.map(el => [el.id, el]));

        } catch (error) {
          Logger.error('useRowSystem', 'Failed to initialize', {
            error: error.message,
            stack: error.stack
          });

          // Fallback to fresh initialization
          const elements = excalidrawAPI.getSceneElements() || [];
          const changes = { new: elements, modified: [], deleted: [], moved: [] };
          processElementChanges(changes);
          previousElementsRef.current = new Map(elements.map(el => [el.id, el]));
        }
      }
    };

    initialize();
  }, [excalidrawAPI, rowManager, processElementChanges, getRowCount, debugMode, loadState]);

  return {
    elementToRow,
    handleCanvasChange,
    getElementRow,
    getRowCount,
    stats,
    saveState: () => saveState(true), // Expose manual save with force flag
    loadState,
    isSaving,
    isLoading
  };
}
