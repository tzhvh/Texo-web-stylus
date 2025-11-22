# Epic 4: Transparency & Debugging

**Goal:** Enable users to understand and trust the "magic" through inspection panels, debug overlays, and comprehensive diagnostic information.

**Business Value:** Builds user confidence in the system by making "black box" decisions transparent and verifiable—critical for educational tool adoption.

**Dependencies:** Epic 1 (RowManager), Epic 2 (OCR output), Epic 3 (validation results)

---

## Story 4.1: Implement Tap-to-Inspect Panel for Row Details

As a **user**,
I want **to tap row status icon to view transcribed LaTeX and validation details**,
So that **I can understand what the system detected and why validation succeeded/failed**.

**Acceptance Criteria:**

**Given** rows have processed OCR and validation results
**When** I tap the status icon of any row
**Then** a non-modal inspection panel appears near the tapped row

**And** panel shows detected LaTeX for that row (from Epic 2)
**And** panel shows previous row's LaTeX if applicable (from Epic 3)
**And** panel shows validation result: equivalent (✓) or not equivalent (✗) with method used
**And** panel includes "Copy to Clipboard" button for LaTeX text
**And** panel is dismissible (tap outside, X button, or Escape key)
**And** panel doesn't block other canvas interactions (non-modal)
**And** panel positions intelligently to avoid going off-screen
**And** panel appears with smooth fade-in animation (200ms)
**And** panel respects user's dark/light theme preference if available

**Prerequisites:** Story 1.6 (status icons), Story 2.8 (OCR complete), Story 3.4 (validation results)

**Technical Notes:**
- Create `src/components/InspectionPanel.jsx` as floating overlay component
- Use React Portal for rendering outside canvas hierarchy
- Position calculation: near tapped row, avoid viewport edges
- Data sources: RowManager for row data, validation results from Epic 3
- Copy to clipboard: `navigator.clipboard.writeText(latex)`
- Dismissal handlers: click outside, Escape key, X button
- CSS animations: fade-in/out, transform transitions
- Accessibility: ARIA labels, keyboard navigation within panel
- Integration with existing debug context for additional information

---

## Story 4.2: Add Debug Mode Toggle and Tile Boundary Overlay

As a **user**,
I want **to enable Debug Mode to see extended diagnostic information**,
So that **I can understand how the system processes my handwriting**.

**Acceptance Criteria:**

**Given** I am on the Magic Canvas page
**When** I enable Debug Mode via toggle in header or toolbar
**Then** the canvas shows additional diagnostic overlays:

**And** tile boundaries are displayed as faint colored rectangles on canvas
**And** tile boundaries show overlap regions (64px overlap areas highlighted differently)
**And** tile boundaries update in real-time during zoom/pan operations
**And** Debug Mode toggle is persistent (remains enabled across reloads)
**And** Debug Mode indicator appears in UI (small "DEBUG" badge or border)
**And** performance metrics are displayed (FPS counter, processing times)
**And** debug information doesn't interfere with normal drawing functionality

**Prerequisites:** Story 2.1 (tile extraction), Story 1.2 (canvas integration)

**Technical Notes:**
- Add Debug Mode state to React context or component state
- Create `src/components/DebugOverlay.jsx` for tile boundary rendering
- Tile boundary rendering: SVG rectangles with semi-transparent fill
- Overlap visualization: different color or pattern for 64px overlap zones
- Real-time updates: recalculate boundaries on zoom/pan changes
- Performance overlay: FPS counter, timing displays using requestAnimationFrame
- Debug toggle: checkbox or switch in header/toolbar, persisted to localStorage
- Integration with existing logger.js for debug-level output
- Follow architecture decision: "Debug Mode reveals tile boundaries as overlay"

---

## Story 4.3: Display Validation Method, Timing, and Canonical Forms

As a **user**,
I want **to see detailed validation information when Debug Mode is enabled**,
So that **I can understand how mathematical equivalence was determined**.

**Acceptance Criteria:**

**Given** Debug Mode is enabled and validation has completed for a row
**When** I tap the row's status icon or inspection panel is open
**Then** the inspection panel shows extended validation information:

**And** validation method used: canonicalization, algebrite-difference, or algebrite-simplify
**And** validation timing: total time in milliseconds (e.g., "245ms")
**And** canonical forms displayed:
  - Input 1 canonical form (from previous row)
  - Input 2 canonical form (from current row)
  - Shows how CAS transformed each expression
**And** debug information includes cache hit/miss status
**And** all timing information is displayed with appropriate precision
**And** canonical forms use proper LaTeX formatting for readability

**Prerequisites:** Story 3.1 (validation logic), Story 4.1 (inspection panel)

**Technical Notes:**
- Extend inspection panel to show debug information when Debug Mode enabled
- Display validation method from Epic 3 result object
- Show timing breakdown: total time, method-specific timing
- Canonical form rendering: Use KaTeX for proper math display
- Cache status: show "cache hit" or "cache miss" with timing
- Integration with existing validation result structure
- Debug-only information: hidden unless Debug Mode enabled
- Follow architecture decision: "Debug Mode shows validation method, timing, canonical forms"
- Performance: minimal overhead when Debug Mode disabled

---

## Story 4.4: Show Cache Hit/Miss Statistics

As a **user**,
I want **to see cache performance statistics in Debug Mode**,
So that **I can understand system performance and identify optimization opportunities**.

**Acceptance Criteria:**

**Given** Debug Mode is enabled
**When** I view the inspection panel or debug overlay
**Then** I see cache performance statistics:

**And** OCR cache hit rate: percentage and raw counts (hits/total)
**And** validation cache hit rate: percentage and raw counts (hits/total)
**And** per-session statistics: "Since page load: X OCR hits, Y misses"
**And** cache size information: current storage usage, estimated quota percentage
**And** cache efficiency metrics: average lookup time, hit/miss timing
**And** statistics update in real-time as cache operations occur
**And** historical trends: cache performance over time (if available)

**Prerequisites:** Story 2.4 (OCR caching), Story 3.2 (validation caching)

**Technical Notes:**
- Add cache monitoring to existing cache implementations
- OCR cache statistics: track hits, misses, total requests in ocrCache.js
- Validation cache statistics: track hits, misses, total requests in validation logic
- Real-time updates: increment counters on cache operations
- Storage monitoring: IndexedDB usage estimation, quota warnings
- Display in debug overlay or inspection panel
- Performance impact: minimal overhead, only when Debug Mode enabled
- Integration with existing diagnostic logging system
- Follow architecture decision: "Debug Mode displays cache hit/miss information"
- Export statistics: copy to clipboard for bug reports

---

## Story 4.5: Integrate with Existing Diagnostic Logging System

As a **user**,
I want **to access OCR and validation logs through the existing diagnostic system**,
So that **I can troubleshoot issues and provide detailed bug reports**.

**Acceptance Criteria:**

**Given** the existing Texo diagnostic logging system is available
**When** OCR or validation operations occur
**Then** all relevant events are logged to existing logger.js system:

**And** OCR events logged: tile extraction start/end, worker pool events, processing times
**And** validation events logged: validation start/end, method used, results, errors
**And** error conditions logged with full context: input data, error messages, stack traces
**And** performance metrics logged: timing data, cache statistics, memory usage
**And** logs are accessible via existing Database page (Texo infrastructure)
**And** log levels respect user settings (debug mode enabled/disabled)
**And** log rotation prevents excessive storage usage
**And** sensitive data is not logged (actual LaTeX content may be logged for debugging)

**Prerequisites:** Existing logger.js infrastructure, Epic 2 (OCR), Epic 3 (validation)

**Technical Notes:**
- Integrate with existing `src/utils/logger.js` system
- OCR logging: tile extraction, worker pool events, merge results, errors
- Validation logging: validation triggers, results, method used, timing
- Error logging: full context capture, error categorization
- Performance logging: timing data, cache hit rates, memory usage
- Log levels: DEBUG, INFO, WARN, ERROR based on user settings
- Integration with existing Database page for log viewing
- Follow architecture decision: "Integrate with existing diagnostic logging system"
- Privacy considerations: user data handling, log retention policies

---

## Epic 4 Summary

**Stories:** 5
**Estimated Complexity:** Low-Medium (primarily UI/debug features, leverages existing infrastructure)
**Key Deliverables:**
- Non-modal inspection panel with LaTeX and validation details
- Debug Mode toggle with tile boundary overlay
- Extended validation information (method, timing, canonical forms)
- Cache performance statistics and monitoring
- Integration with existing diagnostic logging system

**Testing Notes:**
- Unit tests: Inspection panel rendering, debug overlay calculations
- Integration tests: Debug Mode functionality, tile boundary accuracy
- Performance tests: Minimal overhead when disabled, smooth rendering when enabled
- Accessibility: Keyboard navigation, screen reader support for debug information
- Edge cases: Very large canvases, rapid zoom/pan, error conditions

**Critical Path Dependencies:**
- Can be developed in parallel with Epics 2 and 3
- Depends on Epic 1 (RowManager) for row data
- Depends on Epic 2 (OCR output) for LaTeX to display
- Depends on Epic 3 (validation results) for validation details

**Performance Targets:**
- Debug Mode overhead: <5% performance impact when disabled
- Tile boundary rendering: 60fps during zoom/pan
- Inspection panel: <200ms open/close animations
- Cache statistics: Real-time updates with <1ms overhead

**Architecture Integration:**
- Heavy reuse of existing UI components and patterns
- Integration with existing DebugContext and logging infrastructure
- Follows single-active-row model for all debug information
- Maintains non-intrusive design philosophy