/**
 * Auto-Validation Hook
 * Automatically validates rows sequentially after OCR completion
 * Each row must be mathematically equivalent to the previous row
 */

import { useEffect, useRef, useCallback } from 'react';
import { checkEquivalence } from '../cas/equivalenceChecker';
import Logger from '../utils/logger';

export function useAutoValidation({
  rows,
  updateValidationStatus,
  enabled = true,
  debounceMs = 500,
  config = {}
}) {
  const timeoutRef = useRef(null);
  const validationQueueRef = useRef(new Set());
  const isValidatingRef = useRef(false);

  // Default CAS config
  const casConfig = {
    region: config.region || 'US',
    floatTolerance: config.floatTolerance || 1e-6,
    useAlgebrite: config.useAlgebrite !== false,
    algebriteTimeout: config.algebriteTimeout || 2000,
    maxCanonicalizationIterations: config.maxCanonicalizationIterations || 100,
    forceAlgebrite: config.forceAlgebrite || false,
    debug: config.debug || false
  };

  /**
   * Validate a single row against the previous row
   */
  const validateRow = useCallback(async (currentRow, previousRow) => {
    if (!currentRow.latex || !previousRow.latex) {
      Logger.debug('AutoValidation', `Skipping row ${currentRow.id}: missing LaTeX`);
      return null;
    }

    Logger.info('AutoValidation', `Validating row ${currentRow.id} against row ${previousRow.id}`);

    try {
      const result = await checkEquivalence(
        previousRow.latex,
        currentRow.latex,
        casConfig
      );

      Logger.info('AutoValidation', `Row ${currentRow.id}: ${result.equivalent ? '✓ Valid' : '✗ Invalid'}`, {
        method: result.method,
        time: result.time,
        canonical1: result.canonical1?.substring(0, 50),
        canonical2: result.canonical2?.substring(0, 50)
      });

      return {
        equivalent: result.equivalent,
        method: result.method,
        time: result.time,
        canonical: [result.canonical1, result.canonical2],
        previousRowId: previousRow.id,
        error: result.error
      };

    } catch (error) {
      Logger.error('AutoValidation', `Error validating row ${currentRow.id}`, error);
      return {
        equivalent: false,
        error: error.message,
        previousRowId: previousRow.id
      };
    }
  }, [casConfig]);

  /**
   * Validate a sequence of rows
   */
  const validateSequence = useCallback(async (startRowId) => {
    if (!enabled || isValidatingRef.current) {
      Logger.debug('AutoValidation', 'Validation skipped', {
        enabled,
        isValidating: isValidatingRef.current
      });
      return;
    }

    isValidatingRef.current = true;

    try {
      // Get all rows with LaTeX, sorted by ID
      const allRows = Array.from(rows.values())
        .filter(row => row.latex && row.ocrStatus === 'complete')
        .sort((a, b) => a.id - b.id);

      // Find starting point
      const startIndex = allRows.findIndex(row => row.id >= startRowId);
      if (startIndex === -1 || startIndex === 0) {
        Logger.debug('AutoValidation', 'No rows to validate');
        isValidatingRef.current = false;
        return;
      }

      Logger.info('AutoValidation', `Validating ${allRows.length - startIndex} rows from row ${startRowId}`);

      // Validate each row against previous
      for (let i = startIndex; i < allRows.length; i++) {
        const currentRow = allRows[i];
        const previousRow = allRows[i - 1];

        // Mark as validating
        updateValidationStatus(currentRow.id, 'validating');

        // Validate
        const result = await validateRow(currentRow, previousRow);

        if (result) {
          const status = result.error ? 'error' : (result.equivalent ? 'valid' : 'invalid');
          updateValidationStatus(currentRow.id, status, result, result.error);
        }
      }

      Logger.info('AutoValidation', 'Validation sequence complete');

    } catch (error) {
      Logger.error('AutoValidation', 'Validation sequence failed', error);
    } finally {
      isValidatingRef.current = false;
    }
  }, [enabled, rows, validateRow, updateValidationStatus]);

  /**
   * Queue validation for a row (debounced)
   */
  const queueValidation = useCallback((rowId) => {
    if (!enabled) return;

    validationQueueRef.current.add(rowId);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const rowsToValidate = Array.from(validationQueueRef.current).sort((a, b) => a - b);
      validationQueueRef.current.clear();

      if (rowsToValidate.length > 0) {
        const earliestRow = rowsToValidate[0];
        validateSequence(earliestRow);
      }
    }, debounceMs);

  }, [enabled, debounceMs, validateSequence]);

  /**
   * Trigger validation when OCR completes
   */
  useEffect(() => {
    if (!enabled) return;

    // Find rows that just completed OCR
    const completedRows = Array.from(rows.values())
      .filter(row =>
        row.ocrStatus === 'complete' &&
        row.latex &&
        row.validationStatus === 'unchecked'
      );

    if (completedRows.length > 0) {
      Logger.debug('AutoValidation', `Found ${completedRows.length} rows needing validation`);

      // Queue validation for the earliest row
      const earliestRow = Math.min(...completedRows.map(r => r.id));
      queueValidation(earliestRow);
    }

  }, [rows, enabled, queueValidation]);

  /**
   * Manual validation trigger
   */
  const validateAll = useCallback(async () => {
    const allRows = Array.from(rows.values())
      .filter(row => row.latex)
      .sort((a, b) => a.id - b.id);

    if (allRows.length < 2) {
      Logger.info('AutoValidation', 'Need at least 2 rows to validate');
      return;
    }

    const firstRowWithContent = allRows[0].id;
    await validateSequence(firstRowWithContent + 1); // Start from second row

  }, [rows, validateSequence]);

  /**
   * Validate specific row
   */
  const validateSingleRow = useCallback(async (rowId) => {
    const allRows = Array.from(rows.values())
      .filter(row => row.latex)
      .sort((a, b) => a.id - b.id);

    const currentIndex = allRows.findIndex(row => row.id === rowId);

    if (currentIndex <= 0) {
      Logger.warn('AutoValidation', `Cannot validate row ${rowId}: no previous row`);
      return;
    }

    const currentRow = allRows[currentIndex];
    const previousRow = allRows[currentIndex - 1];

    updateValidationStatus(currentRow.id, 'validating');

    const result = await validateRow(currentRow, previousRow);

    if (result) {
      const status = result.error ? 'error' : (result.equivalent ? 'valid' : 'invalid');
      updateValidationStatus(currentRow.id, status, result, result.error);
    }

  }, [rows, validateRow, updateValidationStatus]);

  /**
   * Cleanup
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    validateAll,
    validateSingleRow,
    queueValidation,
    isValidating: isValidatingRef.current
  };
}
