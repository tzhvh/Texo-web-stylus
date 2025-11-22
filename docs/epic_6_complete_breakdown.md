# Epic 6: User Control & Customization

**Goal:** Provide users with comprehensive control over behavior, performance, and workspace management through intuitive interface elements and customizable settings.

**Business Value:** Users can adapt the tool to their preferences and workflow needs, ensuring the Magic Canvas feels like a personalized mathematical workspace.

**Dependencies:** Epic 1 (navigation), Epic 2 (OCR), Epic 3 (validation), Epic 4 (debug), Epic 5 (persistence)

---

## Story 6.1: Create Floating Toolbar with Common Actions

As a **user**,
I want **to access a floating toolbar with frequently used actions**,
So that **I can quickly perform common operations without searching through menus**.

**Acceptance Criteria:**

**Given** I am on the Magic Canvas page
**When** the page loads or I trigger toolbar display
**Then** I see a floating toolbar with the following actions:

**And** "Validate All Rows" button to force validation of entire canvas
**And** "Clear All" button to remove all content while keeping structure
**And** "Settings" button to open configuration panel
**And** "Export" button to save canvas to workspace manager
**And** toolbar is positioned at top-right corner with easy access
**And** toolbar auto-hides after 3 seconds of inactivity to preserve clean canvas
**And** toolbar can be manually shown/hidden via button or gesture
**And** toolbar uses minimalist design with clear icons and tooltips
**And** toolbar remains accessible during drawing (doesn't interfere with canvas)
**And** toolbar respects user's preferred position (draggable to different corners)

**Prerequisites:** Story 1.10 (toolbar foundation), Story 5.3 (export), Story 3.5 (manual validation)

**Technical Notes:**
- Create `src/components/MagicCanvasToolbar.jsx` as floating overlay component
- Use React Portal for rendering outside canvas hierarchy
- Position: fixed or draggable with user preference persistence
- Auto-hide logic: 3s timer on user inactivity (no mouse/touch/keyboard events)
- Show/hide triggers: button in canvas corner, keyboard shortcut (Ctrl+T)
- Minimalist design: simple icons, no text labels, tooltips on hover
- CSS animations: smooth fade-in/out (200ms transitions)
- Integration points: call existing functions from other epics
- Performance: <16ms rendering time, no impact on drawing performance
- Accessibility: ARIA labels, keyboard navigation, 44x44px touch targets

---

## Story 6.2: Implement Settings Panel for Configuration

As a **user**,
I want **to access a comprehensive settings panel to customize Magic Canvas behavior**,
So that **I can adapt the tool to my preferences and workflow needs**.

**Acceptance Criteria:**

**Given** I click "Settings" button in toolbar or access settings
**When** the settings panel opens
**Then** I see the following configuration options:

**And** Row line spacing adjustment (100-500px range, default 384px)
**And** OCR debounce time adjustment (1-5s range, default 1.5s)
**And** Auto-validation toggle (on/off, default on)
**And** Row height for OCR configuration (default 384px, adjustable)
**And** Debug mode toggle (on/off, default off)
**And** Force Algebrite mode toggle (on/off, default off)
**And** Toolbar position preference (corner selection, auto-hide timing)
**And** Theme preference (light/dark if system supports)
**And** Reset to defaults button with confirmation

**And** settings panel is dismissible (X button, Escape key, click outside)
**And** settings apply immediately with visual feedback
**And** settings persist in localStorage across browser sessions
**And** invalid values are prevented with helpful error messages
**And** settings show current values and ranges for clarity

**Prerequisites:** Story 6.1 (toolbar), existing localStorage patterns

**Technical Notes:**
- Create `src/components/SettingsPanel.jsx` as modal or slide-out panel
- Use React state for settings management with immediate persistence
- localStorage keys: `magic-canvas-settings` with JSON serialization
- Setting categories: Canvas, OCR, Validation, Debug, Interface
- Input validation: range checking, type validation, sanitization
- Real-time preview: show effect of setting changes when possible
- Integration with existing DebugContext for debug/forceAlgebrite settings
- Performance: <100ms to apply settings, no blocking operations
- Accessibility: proper form labels, keyboard navigation, screen reader support
- Follow architecture decision: "User preferences persist in localStorage"
- Error handling: graceful fallbacks for corrupted settings

---

## Story 6.3: Persist User Preferences in localStorage

As a **system component**,
I want **user preferences to save automatically and persist across sessions**,
So that **my customizations are remembered when I return to Magic Canvas**.

**Acceptance Criteria:**

**Given** I change any setting in the settings panel
**When** the setting value changes
**Then** the preference is saved immediately to localStorage

**And** preferences persist across browser sessions and page reloads
**And** preferences load automatically when Magic Canvas page opens
**And** preferences are validated on load with fallbacks to defaults
**And** corrupted preferences are detected and reset to defaults with warning
**And** preferences include version number for migration handling
**And** preferences sync with existing DebugContext when applicable
**And** preference changes don't require page reload to take effect
**And** localStorage quota is monitored and warnings shown at 80% usage

**Prerequisites:** Story 6.2 (settings panel)

**Technical Notes:**
- Create `src/utils/settingsManager.js` for preference management
- localStorage schema: `{version: number, preferences: SettingsObject}`
- Preference validation: schema validation with type checking and range limits
- Migration handling: version-based upgrades from old preference formats
- Error recovery: try/catch for localStorage failures, fallback to defaults
- Integration with React context for global preference access
- Performance: synchronous localStorage operations, <5ms save/load time
- Quota monitoring: estimate localStorage usage, warn at 80% capacity
- Follow architecture decision: "User preferences persist in localStorage"
- Security considerations: sanitize data, no sensitive information stored

---

## Story 6.4: "Validate All Rows" Action

As a **user**,
I want **to force validation of the entire canvas**,
So that **I can ensure all mathematical expressions are correct after major changes**.

**Acceptance Criteria:**

**Given** I have multiple rows with various states
**When** I click "Validate All Rows" button in toolbar
**Then** the system validates all non-empty rows sequentially:

**And** validation starts from first row and proceeds through all rows
**And** validation respects existing cache (only re-validates if needed)
**And** validation shows progress indicators for each row during processing
**And** validation updates status icons for all rows upon completion
**And** validation can be canceled if it takes too long (cancel button appears)
**And** validation respects user settings (debugMode, forceAlgebrite)
**And** validation completion shows summary: X rows validated, Y errors found
**And** validation doesn't block drawing in active row during processing
**And** validation errors are handled gracefully per row

**Prerequisites:** Story 3.5 (manual validation), Story 6.1 (toolbar)

**Technical Notes:**
- Add "Validate All" handler to MagicCanvasToolbar
- Sequential validation: iterate through rows, trigger validation for each
- Progress tracking: show overall progress bar and per-row status
- Cancellation: abort ongoing validations, clean up state
- Batch processing: use worker pool efficiently for multiple rows
- Integration with existing validation logic from Epic 3
- Performance: validate multiple rows concurrently where possible
- Error handling: collect all validation results, show summary
- User feedback: clear indication of validation progress and completion
- Follow architecture decision: "Users can trigger 'Validate All Rows' action"
- Accessibility: announce progress to screen readers

---

## Story 6.5: "Clear Canvas" Action with Confirmation

As a **user**,
I want **to clear the entire canvas with proper confirmation**,
So that **I can start fresh work while preventing accidental data loss**.

**Acceptance Criteria:**

**Given** I have content on Magic Canvas
**When** I click "Clear All" button in toolbar
**Then** I see a confirmation dialog before clearing:

**And** dialog clearly states: "This will permanently delete all content. Are you sure?"
**And** dialog shows option: "Save before clearing" to workspace manager
**And** dialog has "Clear" and "Cancel" buttons with clear actions
**And** "Clear" button requires second click or 3-second hold to prevent accidents
**And** clearing removes all drawn elements and row content
**And** clearing resets all row statuses to pending/empty
**And** clearing resets activation timeline and OCR/validation cache
**And** clearing preserves canvas structure (row lines, settings, preferences)
**And** cleared canvas state is saved immediately to persist empty state
**And** clearing completes within 1 second and shows success feedback

**Prerequisites:** Story 6.1 (toolbar), Story 5.6 (manual clear)

**Technical Notes:**
- Add confirmation dialog component with destructive action safeguards
- Two-stage confirmation: initial click + hold/second click for "Clear"
- Save option: trigger export workflow before clearing if chosen
- Clear operations: reset RowManager, clear Excalidraw elements, reset caches
- State reset: clear all validation results, activation timeline, OCR cache
- Integration with existing clear functionality from Epic 5
- User feedback: success message, error handling for failures
- Performance: <1s clear operation, non-blocking UI
- Accessibility: proper ARIA labels, keyboard navigation, screen reader support
- Follow architecture decision: "Users can clear entire canvas with confirmation"
- Audit logging: log clear actions with timestamp and scope

---

## Story 6.6: Display Clear Processing Indicators

As a **user**,
I want **to see clear visual feedback when the system is processing**,
So that **I know the tool is working and not frozen**.

**Acceptance Criteria:**

**Given** the system is performing operations (OCR, validation, save, export)
**When** processing takes longer than 1 second
**Then** I see appropriate processing indicators:

**And** consistent spinner icons appear (orange ⟳) for processing operations
**And** progress bars show completion percentage for long operations
**And** processing indicators appear within 100ms of operation start
**And** indicators don't interfere with user's current drawing (non-intrusive)
**And** multiple operations can show progress simultaneously (e.g., OCR + validation)
**And** estimated time remaining is displayed for operations >3 seconds
**And** processing indicators disappear smoothly when operations complete
**And** error states are clearly distinguished from processing states
**And** indicators are accessible with proper ARIA labels

**Prerequisites:** Story 1.6 (status icons), Story 6.1 (toolbar)

**Technical Notes:**
- Create `src/components/ProcessingIndicator.jsx` for consistent feedback
- Use CSS animations for smooth spinners and progress bars
- Progress calculation: based on operation type and completion tracking
- Time estimation: extrapolate from current progress and historical timing
- Non-intrusive design: subtle colors, no modal dialogs, no focus stealing
- Multiple operation support: stack or queue indicators for concurrent operations
- Performance: 60fps animations, <16ms render time
- Integration with existing processing states from OCR, validation, save operations
- Accessibility: ARIA live regions for screen readers, keyboard navigation
- Follow architecture decision: "Users receive clear visual indication when system is processing"
- Error state handling: distinct visual treatment for failures vs. processing

---

## Story 6.7: Cancel Long-Running OCR Operations

As a **user**,
I want **to cancel OCR operations that are taking too long**,
So that **I can regain control and try different approaches**.

**Acceptance Criteria:**

**Given** OCR processing is taking longer than 3 seconds
**When** a "Cancel" button appears or I trigger cancellation
**Then** the OCR operation is canceled gracefully:

**And** all pending tile processing is stopped immediately
**And** worker pool receives cancel signal and stops accepting new tiles
**And** currently processing tiles are allowed to finish current tile (clean cancellation)
**And** row status resets to 'pending' for manual retry
**And** user can continue drawing or working in other rows during cancellation
**And** cancellation doesn't crash the app or leave inconsistent state
**And** canceled operation is logged for debugging and audit purposes
**And** cancel button appears only for operations >3 seconds (prevents accidental cancellation)

**Prerequisites:** Story 2.2 (worker pool), Story 6.6 (processing indicators)

**Technical Notes:**
- Add cancellation signal to worker pool communication protocol
- Cancel button appears after 3s of processing (configurable threshold)
- Graceful worker termination: allow current tile to complete, stop new tiles
- State cleanup: reset row.ocrStatus to 'pending', clear partial results
- Integration with existing worker pool timeout handling (10s per tile)
- User feedback: clear indication that operation was canceled
- Error handling: distinguish between cancellation and timeout errors
- Performance: <100ms to process cancellation signal
- Follow architecture decision: "Users can cancel long-running OCR operations"
- Audit logging: log cancellation with timestamp, affected rows, reason
- Retry mechanism: user can immediately restart OCR after cancellation

---

## Story 6.8: Handle Rapid Input Gracefully

As a **user**,
I want **the system to remain responsive during rapid drawing and input**,
So that **I can work quickly without experiencing lag or dropped actions**.

**Acceptance Criteria:**

**Given** I am drawing rapidly or performing quick row switches
**When** multiple input events occur in short succession
**Then** the system handles all events gracefully:

**And** no drawing strokes are dropped during rapid input
**And** canvas maintains 60fps rendering during rapid interactions
**And** row switching responds immediately to gestures/keyboard input
**And** OCR debouncing prevents excessive processing without blocking input
**And** validation debouncing prevents excessive checks without blocking input
**And** auto-save debouncing prevents excessive storage writes without blocking input
**And** rapid row switches don't cause memory leaks or state corruption
**And** UI remains responsive with no jank or frame drops
**And** all background operations (OCR, validation, save) use proper queuing

**Prerequisites:** Story 1.9 (row switching), Story 2.7 (auto OCR), Story 3.5 (auto validation), Story 5.1 (auto save)

**Technical Notes:**
- Input event optimization: passive event listeners, requestAnimationFrame for smooth rendering
- Debounce strategies: per-operation timing with immediate UI feedback
- Queue management: proper FIFO queues for OCR, validation, save operations
- Memory management: cleanup of unused objects, prevent memory leaks
- Performance monitoring: track frame rates, input latency, operation timing
- Worker pool efficiency: handle rapid tile submissions without queue overflow
- State consistency: ensure RowManager state remains consistent during rapid operations
- Integration with existing debouncing patterns from other epics
- Follow architecture decision: "System handles rapid input gracefully"
- Performance targets: 60fps rendering, <16ms input latency, <100ms UI response

---

## Epic 6 Summary

**Stories:** 8
**Estimated Complexity:** Low-Medium (primarily UI and configuration, leverages existing infrastructure)
**Key Deliverables:**
- Floating toolbar with common actions (validate all, clear, settings, export)
- Comprehensive settings panel with all user preferences
- Persistent user preferences across sessions
- Manual validation and clear operations with confirmations
- Clear processing indicators for long operations
- Cancellation support for long-running operations
- Graceful handling of rapid input scenarios

**Testing Notes:**
- Unit tests: Settings validation, preference persistence, toolbar actions
- Integration tests: Full user workflow with all toolbar functions
- Performance tests: Rapid input handling, concurrent operations
- Accessibility tests: Keyboard navigation, screen reader support, touch targets
- Edge cases: Corrupted preferences, quota exceeded, rapid operations

**Critical Path Dependencies:**
- Can be developed in parallel with all other epics
- Depends on Epic 1 (navigation), Epic 2 (OCR), Epic 3 (validation), Epic 4 (debug), Epic 5 (persistence)
- Integration heavy: must work with all other epic outputs

**Performance Targets:**
- Settings operations: <100ms response time
- Toolbar interactions: <200ms feedback
- Processing indicators: 60fps animations, <16ms render time
- Rapid input: 60fps maintenance, no dropped events
- Preference persistence: <10ms save/load time

**Architecture Integration:**
- Heavy reuse of existing UI components and patterns
- Integration with existing localStorage and IndexedDB infrastructure
- Follows established user preference management patterns
- Maintains non-intrusive design philosophy
- Supports all existing user settings from DebugContext