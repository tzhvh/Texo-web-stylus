/**
 * IndexedDB Cache for Canonical Forms
 * Now uses workspace-based storage via workspaceDB
 * Maintains backward compatibility with existing API
 */

import {
  initWorkspaceDB,
  cacheCanonicalForm as workspaceCacheCanonical,
  getCachedCanonicalForm as workspaceGetCachedCanonical,
  clearCASCache as workspaceClearCASCache,
  getCacheStats as workspaceGetCacheStats,
  logDiagnostic
} from './workspaceDB.js';

/**
 * Initialize IndexedDB (now uses workspace system)
 */
export function initDB() {
  return initWorkspaceDB();
}

/**
 * Store canonical form in cache
 * @param {string} latex - Original LaTeX expression
 * @param {string} canonical - Canonical form
 * @param {Object} metadata - Additional metadata
 */
export async function cacheCanonicalForm(latex, canonical, metadata = {}) {
  await logDiagnostic('debug', 'cas', `Caching canonical form for: ${latex.substring(0, 50)}...`);
  return workspaceCacheCanonical(latex, canonical, metadata);
}

/**
 * Retrieve canonical form from cache
 * @param {string} latex - LaTeX expression to lookup
 * @returns {Object|null} - Cached data or null if not found
 */
export async function getCachedCanonicalForm(latex) {
  const result = await workspaceGetCachedCanonical(latex, 7);
  if (result) {
    await logDiagnostic('debug', 'cas', `Cache hit for: ${latex.substring(0, 50)}...`);

    // Flatten the structure for backward compatibility
    // Old format: { latex, canonical, timestamp, ...metadata }
    // New format: { workspaceId, latex, canonical, timestamp, metadata }
    return {
      latex: result.latex,
      canonical: result.canonical,
      timestamp: result.timestamp,
      ...result.metadata  // Spread metadata at top level for compatibility
    };
  }
  return null;
}

/**
 * Delete entry from cache
 * @param {string} latex - LaTeX expression to delete
 */
export async function deleteFromCache(latex) {
  // This functionality is now handled by workspace clearing
  // Individual deletion is not supported in the new workspace model
  // Use clearCache() to clear all entries
  await logDiagnostic('warn', 'cache', 'Individual cache deletion not supported, use clearCache() instead');
  return;
}

/**
 * Clear entire cache
 */
export async function clearCache() {
  await logDiagnostic('info', 'cache', 'Clearing CAS cache for current workspace');
  return workspaceClearCASCache();
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  const stats = await workspaceGetCacheStats();
  return {
    count: stats.casCache.count,
    oldestEntry: stats.casCache.oldestEntry,
    newestEntry: stats.casCache.newestEntry,
    workspaceId: stats.workspaceId
  };
}
