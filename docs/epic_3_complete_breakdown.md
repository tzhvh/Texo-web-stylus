# Epic 3: Real-time Validation & Feedback Pipeline

**Goal:** Provide instant mathematical correctness feedback through CAS integration and ambient visual cues that enables users to "fail fast to progress faster."

**Business Value:** The core educational value proposition—users get immediate feedback on mathematical correctness without breaking flow state, enabling rapid learning and error correction.

**Dependencies:** Epic 1 (RowManager) and Epic 2 (OCR pipeline output)

---

## Story 3.1: Integrate Sequential Row Validation with Existing CAS

As a **system component**,
I want **to validate each row's LaTeX expression against the previous non-empty row**,
So that **users get instant mathematical correctness feedback**.

**Acceptance Criteria:**

**Given** multiple rows exist with transcribed LaTeX from Epic 2
**When** validation is triggered for a specific row
**Then** the system validates row N against row N-1 (previous non-empty row)

**And** validation uses existing CAS equivalence checker (`checkEquivalence()`)
**And** first row in canvas automatically validates as correct (no previous row to compare)
**And** validation skips empty rows when finding previous row for comparison
**And** validation completes within 1 second for typical expressions
**And** validation result includes: `{equivalent: boolean, method: string, time: number, canonical1: string, canonical2: string}`
**And** validation respects user settings from DebugContext (debugMode, forceAlgebrite)
**And** validation errors are handled gracefully (parse failures, timeouts)

**Prerequisites:** Story 2.7 (OCR auto-trigger), Story 1.4 (RowManager)

**Technical Notes:**
- Integrate with existing `src/cas/equivalenceChecker.js`
- Use existing `checkEquivalence(latex1, latex2, config)` function
- Sequential validation logic: find previous non-empty row, compare with current
- First row special case: always return `{equivalent: true, method: 'first-row', time: 0}`
- Skip empty rows: iterate backwards until non-empty row found or reach first row
- Pass DebugContext settings: `{debugMode, forceAlgebrite}` from existing context
- Performance target: <1s validation time
- Error handling: parse failures, timeouts, CAS errors
- Follow architecture decision: "Use existing CAS equivalence checker"

---

## Story 3.2: Implement Validation Result Caching

As a **system component**,
I want **to cache validation results to avoid redundant computations**,
So that **repeated expressions provide instant feedback**.

**Acceptance Criteria:**

**Given** a validation result is computed for rows A and B
**When** the same validation is needed again (same LaTeX pair)
**Then** the cached result is returned immediately (<1ms)

**And** cache key is `row:${prevId}:${currId}` format for unique identification
**And** cache stores: `{equivalent: boolean, method: string, time: number, canonical1: string, canonical2: string, timestamp: Date}`
**And** cache stored in existing IndexedDB cache infrastructure
**And** cache hit rate target >70% for typical usage (repeated expressions)
**And** cache entries have 7-day TTL (auto-expire old entries)
**And** cache lookup is O(1) via IndexedDB key retrieval
**And** cache respects debugMode and forceAlgebrite settings (different cache keys for different settings)

**Prerequisites:** Story 3.1

**Technical Notes:**
- Use existing `src/utils/indexedDBCache.js` patterns
- Cache key format: `validation:${prevRowId}:${currRowId}:${debugMode}:${forceAlgebrite}`
- IndexedDB store: reuse existing cache infrastructure or create `validation-cache` store
- Cache structure: `{key: string, result: ValidationResult, timestamp: Date}`
- TTL management: 7 days (604800000ms) - balance performance vs. storage
- Cache hit detection: check existence before calling `checkEquivalence()`
- Performance target: <1ms cache hit response
- Background cleanup: remove expired entries on page load
- Monitor cache hit rate and log to diagnostic system
- Follow architecture decision: "Cache validation results using key `row:${prevId}:${currId}`"

---

## Story 3.3: Respect Debug Settings (debugMode, forceAlgebrite)

As a **system component**,
I want **to honor user's debug preferences during validation**,
So that **users have control over validation behavior and can troubleshoot issues**.

**Acceptance Criteria:**

**Given** user has configured debug settings in DebugContext
**When** validation is performed
**Then** validation respects the following settings:

**And** `debugMode: true` enables detailed validation logging and diagnostic output
**And** `forceAlgebrite: true` bypasses fast-path canonicalization, uses Algebrite CAS directly
**And** `debugMode: false` runs validation silently (only errors logged)
**And** `forceAlgebrite: false` uses fast-path canonicalization with Algebrite fallback
**And** settings are read from existing DebugContext React context
**And** validation method indicates which path was taken (canonicalization vs algebrite-difference vs algebrite-simplify)
**And** timing information is always reported regardless of debug mode
**And** cache keys include debug settings to prevent incorrect cache hits

**Prerequisites:** Story 3.1

**Technical Notes:**
- Integrate with existing `src/contexts/DebugContext.jsx`
- Read settings: `const {debugMode, forceAlgebrite} = useDebugContext()`
- Pass configuration to `checkEquivalence(latex1, latex2, {debugMode, forceAlgebrite})`
- Validation method tracking:
  - 'canonicalization': Fast path succeeded
  - 'algebrite-difference': Slow path, difference method
  - 'algebrite-simplify': Slow path, simplification method
- Debug logging when enabled: log input expressions, canonical forms, result, timing
- Cache key includes settings: `${prevId}:${currId}:${debugMode}:${forceAlgebrite}`
- Performance impact: forceAlgebrite can be 10-50x slower, warn user if enabled
- Follow architecture decision: "Respect debugMode and forceAlgebrite setting"
- Integration with existing diagnostic logging system

---

## Story 3.4: Update Row Status Icons Based on Validation Results

As a **user**,
I want **to see clear visual feedback indicating mathematical correctness**,
So that **I can instantly identify errors and continue working**.

**Acceptance Criteria:**

**Given** validation completes for a row
**When** validation result is available
**Then** row status icon updates based on validation result:

**And** Green ✓ icon appears if row is mathematically equivalent to previous row
**And** Red ✗ icon appears if row is NOT equivalent to previous row
**And** Yellow ⚠️ icon appears if LaTeX could not be parsed during validation
**And** Orange ⟳ icon continues spinning during validation processing
**And** Gray ∅ icon remains for empty rows or pending validation
**And** icon transitions are smooth (200ms fade) when status changes
**And** icons remain positioned at row edge with 44x44px tap targets
**And** validation status persists across page reloads (from Story 1.7)
**And** icons are tappable to open inspection panel (Epic 4)

**Prerequisites:** Story 1.6 (status icons), Story 3.1

**Technical Notes:**
- Update RowManager: `row.validationStatus` based on validation result
- Status mapping:
  - 'validated': Green ✓ (equivalent: true)
  - 'invalid': Red ✗ (equivalent: false)
  - 'error': Yellow ⚠️ (parse failure, CAS error)
  - 'processing': Orange ⟳ (validation in progress)
- Icon rendering: reuse existing status icon system from Story 1.6
- Smooth transitions: CSS animations or React state changes
- Position: `(canvasWidth - 60px, rowCenterY)` - consistent with OCR status
- Tap handling: prepare for Epic 4 inspection panel integration
- Performance: <200ms status update after validation completes
- Follow architecture decision: "Visual feedback system (status icons)"
- Integration with existing visual feedback layer

---

## Story 3.5: Trigger Validation Automatically After OCR Complete

As a **user**,
I want **validation to run automatically when OCR finishes transcribing a row**,
So that **I get continuous correctness feedback without manual action**.

**Acceptance Criteria:**

**Given** a row's OCR status changes to 'complete' (from Epic 2)
**When** row.ocrStatus becomes 'complete'
**Then** validation automatically triggers for that row

**And** validation is debounced by 500ms after OCR completion to batch rapid changes
**And** validation triggers for downstream rows if upstream changes (cascade validation)
**And** validation only runs if row has transcribed LaTeX (non-empty)
**And** validation respects existing cache (skip if result already cached)
**And** validation updates row status icon upon completion
**And** validation failures don't block OCR processing of other rows
**And** validation can be manually triggered via double-tap row header (override automatic)

**Prerequisites:** Story 2.7 (OCR auto-trigger), Story 3.1

**Technical Notes:**
- Create React effect: `useEffect(() => { if (row.ocrStatus === 'complete') { triggerValidation(row) } }, [row.ocrStatus])`
- Debounce validation: 500ms after OCR completion to batch rapid OCR changes
- Cascade validation logic: when row N validates, also validate row N+1 if it was waiting
- Cache check: before triggering validation, check if result already cached
- Manual trigger: double-tap gesture detection on row header/icon
- Integration with Story 3.1 (validation logic) and Story 3.4 (status updates)
- Performance target: validation starts within 500ms of OCR completion
- Follow architecture decision: "Auto-validate when row.ocrStatus changes to 'complete'"
- Error handling: validation failures don't affect OCR pipeline

---

## Story 3.6: Handle Validation Errors and Timeouts

As a **system component**,
I want **validation failures to be handled gracefully without breaking the user experience**,
So that **I can continue working even when validation encounters issues**.

**Acceptance Criteria:**

**Given** validation encounters an error during processing
**When** error occurs (timeout, parse failure, CAS error)
**Then** the system handles the error gracefully:

**And** validation timeout is set to 2 seconds (inherited from existing CAS)
**And** parse failures mark row with yellow ⚠️ icon and helpful error message
**And** CAS errors (Algebrite failures) mark row with red ✗ icon and error details
**And** timeout errors mark row with yellow ⚠️ icon and "Validation timed out" message
**And** all error types are logged to existing diagnostic logging system
**And** error messages are user-friendly and suggest corrective actions
**And** validation errors don't crash the app or block other rows
**And** users can manually retry validation after fixing issues
**And** error state is cleared when row content changes or validation succeeds

**Prerequisites:** Story 3.1

**Technical Notes:**
- Error types: 'timeout', 'parse_failure', 'cas_error', 'unexpected_error'
- Timeout handling: 2-second limit on `checkEquivalence()` Promise
- Parse failure detection: catch KaTeX parser errors, mark as validation error
- CAS error handling: catch Algebrite exceptions, provide fallback behavior
- Error messages:
  - Timeout: "Validation took too long. Try simpler expression."
  - Parse failure: "Could not parse mathematical expression. Check notation."
  - CAS error: "Mathematical error occurred. Please verify expression."
- Integration with existing `src/utils/logger.js` for error logging
- Error state in RowManager: `row.validationStatus = 'error', row.errorMessage = '...'`
- Manual retry: clear error state, re-trigger validation via double-tap
- Follow architecture decision: "2-second timeout (inherited from existing CAS)"
- Performance: error detection within 100ms of failure

---

## Story 3.7: Ensure Non-Intrusive Feedback Updates

As a **user**,
I want **validation feedback to appear without disrupting my drawing flow**,
So that **I can continue working while validation happens in the background**.

**Acceptance Criteria:**

**Given** validation is running or completing for rows
**When** validation status changes or results are available
**Then** feedback updates happen without disrupting user experience:

**And** validation never displays modal dialogs or alerts during normal operation
**And** status icon changes use smooth fade-in animations (200ms) without jarring transitions
**And** validation processing doesn't block drawing in active row
**And** validation progress doesn't steal focus from canvas
**And** validation feedback appears within 1 second of OCR completion
**And** multiple rows can validate simultaneously without UI interference
**And** validation updates don't cause frame drops or UI jank
**And** error states are indicated subtly (color changes) without interrupting flow
**And** validation respects user's current drawing context (no forced context switches)

**Prerequisites:** Story 1.6 (status icons), Story 3.4

**Technical Notes:**
- Non-blocking validation: run in background, don't await in main thread
- Smooth animations: CSS transitions, requestAnimationFrame for updates
- No modals: avoid alert(), confirm(), or modal dialogs
- Focus management: validation never calls `focus()` on canvas or steals input
- Performance: maintain 60fps during validation updates
- Batch updates: debounce rapid validation changes to avoid excessive re-renders
- Ambient feedback: status icons change color, no text overlays or popups
- Integration with existing rendering pipeline (Excalidraw + status overlay)
- Follow architecture decision: "Feedback updates happen without disrupting user's current drawing"
- Accessibility: ARIA live region for status changes, but non-intrusive

---

## Epic 3 Summary

**Stories:** 7
**Estimated Complexity:** Medium (leverages existing CAS infrastructure heavily)
**Key Deliverables:**
- Sequential row validation using existing CAS
- Validation result caching (>70% hit rate)
- Debug settings integration (debugMode, forceAlgebrite)
- Visual feedback updates (status icons)
- Automatic validation after OCR completion
- Graceful error handling and timeouts
- Non-intrusive feedback updates

**Testing Notes:**
- Unit tests: Validation logic, cache operations, error handling
- Integration tests: Full validation pipeline with sample expressions
- Performance tests: Validation timing targets, cache hit rates
- Edge cases: Empty rows, parse failures, CAS errors, timeouts
- Accessibility: Screen reader announcements, keyboard navigation

**Critical Path Dependencies:**
- Epic 1 (RowManager) → Epic 2 (OCR Pipeline) → Epic 3 (Validation)
- Stories 3.1-3.3 form core validation logic (must be sequential)
- Stories 3.4-3.7 can be developed in parallel after core validation is complete

**Performance Targets:**
- Validation time: <1s per row
- Cache hit rate: >70% for typical usage
- Total feedback latency: <3s from OCR completion to visual feedback
- UI responsiveness: 60fps during validation updates

**Architecture Integration:**
- Heavy reuse of existing CAS (`equivalenceChecker.js`, `katexParser.js`)
- Integration with existing DebugContext and logging infrastructure
- Follows single-active-row model (validates active row against previous)
- Caching strategy leverages existing IndexedDB patterns