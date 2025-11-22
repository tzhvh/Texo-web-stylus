/**
 * scrollToRow - Scroll viewport to center active row
 *
 * Automatically scrolls the viewport to center the newly activated row when
 * switching to off-screen rows, providing smooth navigation experience.
 *
 * Uses native window.scrollTo() with smooth behavior for 60fps animation - AC #8
 *
 * @param {string} rowId - Row ID to scroll to
 * @param {RowManager} rowManager - RowManager instance
 */
export function scrollToRow(rowId, rowManager) {
  const row = rowManager.getRow(rowId);
  if (!row) return;

  // Calculate center Y coordinate of the row
  const rowCenterY = (row.yStart + row.yEnd) / 2;

  // Calculate target scroll position to center row in viewport
  const viewportHeight = window.innerHeight;
  const targetScrollY = rowCenterY - viewportHeight / 2;

  // Smooth scroll to target position
  window.scrollTo({
    top: Math.max(0, targetScrollY), // Prevent negative scroll
    behavior: 'smooth' // Smooth CSS animation
  });
}
