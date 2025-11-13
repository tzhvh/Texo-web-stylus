/**
 * Document-driven validation hook
 *
 * This hook integrates mathematical validation with the document model,
 * using the CAS system to verify equivalence between rows.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useDocument, useDocumentOperations } from './useDocument';
import { checkEquivalence } from '../cas/equivalenceChecker';

export function useDocumentValidation(options = {}) {
  const {
    autoValidate = true,
    debounceMs = 500,
    region = 'US',
    useAlgebrite = true,
  } = options;

  const { document } = useDocument();
  const ops = useDocumentOperations();

  // Debounce timer
  const debounceTimerRef = useRef(null);
  const lastProcessedVersionRef = useRef(-1);

  /**
   * Validate a single row against its predecessor
   */
  const validateRow = useCallback(
    async (rowId) => {
      try {
        const currentRow = document.getRow(rowId);
        if (!currentRow) {
          throw new Error(`Row ${rowId} not found`);
        }

        // Can't validate first row
        if (rowId === 0) {
          console.log('Skipping validation for first row');
          return null;
        }

        // Check if row has OCR result
        if (currentRow.ocrStatus !== 'complete' || !currentRow.latex) {
          throw new Error(`Row ${rowId} has no OCR result`);
        }

        // Get previous row
        const previousRow = document.getRow(rowId - 1);
        if (!previousRow || previousRow.ocrStatus !== 'complete' || !previousRow.latex) {
          throw new Error(`Previous row ${rowId - 1} has no OCR result`);
        }

        // Mark as validating
        ops.updateValidationStatus(rowId, 'validating');

        // Perform CAS check
        const result = await checkEquivalence(
          previousRow.latex,
          currentRow.latex,
          { region, useAlgebrite }
        );

        // Update with result
        ops.updateValidationResult(rowId, result);

        return result;
      } catch (error) {
        console.error(`Error validating row ${rowId}:`, error);
        ops.updateValidationStatus(rowId, 'error', {
          error: error.message,
        });
        throw error;
      }
    },
    [document, ops, region, useAlgebrite]
  );

  /**
   * Validate all rows that need validation
   */
  const validateAllRows = useCallback(async () => {
    const rowsNeedingValidation = document.getRowsNeedingValidation();

    // Sort by ID to validate in order
    const sortedRows = rowsNeedingValidation.sort((a, b) => a.id - b.id);

    const results = [];
    for (const row of sortedRows) {
      if (row.id === 0) continue; // Skip first row

      try {
        const result = await validateRow(row.id);
        results.push({ rowId: row.id, result });
      } catch (error) {
        results.push({ rowId: row.id, error });
      }
    }

    return results;
  }, [document, validateRow]);

  /**
   * Validate a specific row and all rows after it
   */
  const validateFromRow = useCallback(
    async (startRowId) => {
      const allRows = document.getAllRows();
      const rowsToValidate = allRows.filter(row => row.id >= startRowId && row.id > 0);

      const results = [];
      for (const row of rowsToValidate) {
        try {
          const result = await validateRow(row.id);
          results.push({ rowId: row.id, result });
        } catch (error) {
          results.push({ rowId: row.id, error });
        }
      }

      return results;
    },
    [document, validateRow]
  );

  /**
   * Auto-validation: triggered when OCR completes on any row
   */
  useEffect(() => {
    if (!autoValidate) return;

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce validation to batch rapid OCR completions
    debounceTimerRef.current = setTimeout(() => {
      // Check if document has changed since last validation
      if (document.version === lastProcessedVersionRef.current) {
        return;
      }

      // Find rows that need validation
      const rowsNeedingValidation = document.getRowsNeedingValidation();

      if (rowsNeedingValidation.length === 0) {
        return;
      }

      // Validate all rows that need it
      validateAllRows().then(() => {
        lastProcessedVersionRef.current = document.version;
      });
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [document, autoValidate, debounceMs, validateAllRows]);

  /**
   * Clear validation results for a row
   */
  const clearValidation = useCallback(
    (rowId) => {
      ops.updateValidationStatus(rowId, 'unchecked', {
        result: null,
        error: null,
      });
    },
    [ops]
  );

  /**
   * Clear all validation results
   */
  const clearAllValidations = useCallback(() => {
    const allRows = document.getAllRows();
    const updates = new Map();

    allRows.forEach(row => {
      if (row.validationStatus !== 'unchecked') {
        updates.set(row.id, {
          validationStatus: 'unchecked',
          validationResult: null,
          validationError: null,
        });
      }
    });

    if (updates.size > 0) {
      ops.updateRows(updates);
    }
  }, [document, ops]);

  return {
    validateRow,
    validateAllRows,
    validateFromRow,
    clearValidation,
    clearAllValidations,
  };
}
