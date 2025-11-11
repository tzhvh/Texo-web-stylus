/**
 * String utility functions for LaTeX comparison and manipulation
 */

/**
 * Calculate Levenshtein distance between two strings
 * Used to measure similarity between overlap segments
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance (0 = identical)
 */
export function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;

  // Early exit for identical strings
  if (str1 === str2) return 0;
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Create distance matrix
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  // Initialize first column and row
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  // Fill matrix using dynamic programming
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity ratio (1.0 = identical, 0 = completely different)
 */
export function similarityRatio(str1, str2) {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  return maxLen === 0 ? 1.0 : 1 - (distance / maxLen);
}

/**
 * Find longest common substring between two strings
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {string} Longest common substring
 */
export function longestCommonSubstring(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;

  let maxLen = 0;
  let endIndex = 0;

  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
        if (matrix[i][j] > maxLen) {
          maxLen = matrix[i][j];
          endIndex = i;
        }
      }
    }
  }

  return str1.substring(endIndex - maxLen, endIndex);
}

/**
 * Normalize LaTeX string for comparison
 * Removes extraneous whitespace and normalizes spacing around operators
 *
 * @param {string} latex - LaTeX string
 * @returns {string} Normalized LaTeX
 */
export function normalizeLatex(latex) {
  return latex
    .replace(/\s+/g, ' ')                // Multiple spaces → single space
    .replace(/\s*([+\-=*\/])\s*/g, '$1') // Remove spaces around operators
    .replace(/\s*({|})\s*/g, '$1')       // Remove spaces around braces
    .trim();
}

/**
 * Check if two LaTeX strings are structurally equivalent
 * More lenient than exact match - ignores whitespace differences
 *
 * @param {string} latex1 - First LaTeX string
 * @param {string} latex2 - Second LaTeX string
 * @returns {boolean} True if structurally equivalent
 */
export function latexStructurallyEqual(latex1, latex2) {
  return normalizeLatex(latex1) === normalizeLatex(latex2);
}

/**
 * Find common prefix between two strings
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {string} Common prefix
 */
export function commonPrefix(str1, str2) {
  let i = 0;
  const minLen = Math.min(str1.length, str2.length);

  while (i < minLen && str1[i] === str2[i]) {
    i++;
  }

  return str1.substring(0, i);
}

/**
 * Find common suffix between two strings
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {string} Common suffix
 */
export function commonSuffix(str1, str2) {
  let i = 0;
  const minLen = Math.min(str1.length, str2.length);

  while (i < minLen && str1[str1.length - 1 - i] === str2[str2.length - 1 - i]) {
    i++;
  }

  return str1.substring(str1.length - i);
}

/**
 * Fuzzy match: check if str1 starts with something similar to prefix
 *
 * @param {string} str1 - String to check
 * @param {string} prefix - Expected prefix
 * @param {number} threshold - Similarity threshold (0-1)
 * @returns {boolean} True if fuzzy match
 */
export function fuzzyStartsWith(str1, prefix, threshold = 0.85) {
  if (str1.startsWith(prefix)) return true;

  const subStr = str1.substring(0, prefix.length);
  return similarityRatio(subStr, prefix) >= threshold;
}

/**
 * Fuzzy match: check if str1 ends with something similar to suffix
 *
 * @param {string} str1 - String to check
 * @param {string} suffix - Expected suffix
 * @param {number} threshold - Similarity threshold (0-1)
 * @returns {boolean} True if fuzzy match
 */
export function fuzzyEndsWith(str1, suffix, threshold = 0.85) {
  if (str1.endsWith(suffix)) return true;

  const subStr = str1.substring(str1.length - suffix.length);
  return similarityRatio(subStr, suffix) >= threshold;
}
