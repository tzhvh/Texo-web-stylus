/**
 * Spatial Mapping Utility
 * Maps AST nodes to rendered glyph positions for sub-expression highlighting
 */

/**
 * Extract position information from LaTeX string and AST
 * @param {string} latex - Original LaTeX string
 * @param {Object} ast - Simplified AST
 * @returns {Array} - Array of { start, end, node, type } mappings
 */
export function createSpatialMapping(latex, ast) {
  const mappings = [];

  // Track position in original LaTeX string
  let currentPos = 0;

  function traverse(node, parentPath = []) {
    if (!node) return;

    // Handle arrays
    if (Array.isArray(node)) {
      node.forEach((child, index) => traverse(child, [...parentPath, index]));
      return;
    }

    // Extract location if available from original parse
    if (node.loc) {
      mappings.push({
        start: node.loc.start,
        end: node.loc.end,
        node: node,
        type: node.type,
        path: parentPath,
        latex: latex.substring(node.loc.start, node.loc.end)
      });
    }

    // Recursively traverse children
    const childKeys = ['base', 'exponent', 'numerator', 'denominator', 'body', 'arg', 'sup', 'sub'];
    for (const key of childKeys) {
      if (node[key]) {
        traverse(node[key], [...parentPath, key]);
      }
    }
  }

  traverse(ast);

  // Sort by position
  mappings.sort((a, b) => a.start - b.start);

  return mappings;
}

/**
 * Find the smallest sub-expression that contains an error
 * @param {Array} mappings - Spatial mappings from createSpatialMapping
 * @param {Object} errorInfo - Error information from equivalence checker
 * @returns {Object|null} - The mapping for the error sub-expression
 */
export function findErrorSubExpression(mappings, errorInfo) {
  // If we have specific path information from the checker
  if (errorInfo.path) {
    return mappings.find(m =>
      JSON.stringify(m.path) === JSON.stringify(errorInfo.path)
    );
  }

  // Otherwise, try to find based on AST diff
  if (errorInfo.canonical1 && errorInfo.canonical2) {
    // Find the first differing part
    const diff = findDifference(errorInfo.canonical1, errorInfo.canonical2);

    if (diff) {
      // Find the mapping that corresponds to this difference
      return mappings.find(m => m.type === diff.type) || mappings[mappings.length - 1];
    }
  }

  // Fall back to highlighting the entire expression
  return null;
}

/**
 * Find the first difference between two canonical strings
 */
function findDifference(str1, str2) {
  const parts1 = str1.split('|');
  const parts2 = str2.split('|');

  for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
    if (parts1[i] !== parts2[i]) {
      // Parse the part to extract type
      const match = parts1[i].match(/^(\w+):/);
      return {
        position: i,
        type: match ? match[1] : 'unknown',
        expected: parts2[i],
        actual: parts1[i]
      };
    }
  }

  return null;
}

/**
 * Convert AST path to human-readable description
 * @param {Array} path - Path array from spatial mapping
 * @returns {string} - Human-readable description
 */
export function pathToDescription(path) {
  const descriptions = {
    'base': 'base',
    'exponent': 'exponent',
    'numerator': 'numerator',
    'denominator': 'denominator',
    'body': 'expression',
    'arg': 'argument',
    'sup': 'superscript',
    'sub': 'subscript'
  };

  return path
    .filter(p => isNaN(p))
    .map(p => descriptions[p] || p)
    .join(' > ');
}

/**
 * Highlight specific character ranges in a LaTeX string
 * @param {string} latex - Original LaTeX string
 * @param {Array} ranges - Array of { start, end, type } to highlight
 * @returns {Array} - Array of segments with highlighting info
 */
export function highlightRanges(latex, ranges) {
  if (!ranges || ranges.length === 0) {
    return [{ text: latex, highlighted: false, type: null }];
  }

  // Sort ranges by start position
  const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);

  const segments = [];
  let pos = 0;

  for (const range of sortedRanges) {
    // Add un-highlighted text before this range
    if (pos < range.start) {
      segments.push({
        text: latex.substring(pos, range.start),
        highlighted: false,
        type: null
      });
    }

    // Add highlighted range
    segments.push({
      text: latex.substring(range.start, range.end),
      highlighted: true,
      type: range.type
    });

    pos = range.end;
  }

  // Add remaining text
  if (pos < latex.length) {
    segments.push({
      text: latex.substring(pos),
      highlighted: false,
      type: null
    });
  }

  return segments;
}

/**
 * Calculate visual bounds for rendered math expression
 * This requires access to the rendered DOM elements
 * @param {HTMLElement} mathElement - The rendered KaTeX element
 * @param {Array} mappings - Spatial mappings
 * @returns {Array} - Array of { mapping, bounds: { top, left, width, height } }
 */
export function calculateVisualBounds(mathElement, mappings) {
  if (!mathElement) return [];

  const visualBounds = [];

  for (const mapping of mappings) {
    try {
      // Find the corresponding DOM element using data attributes or content
      const selector = `[data-ast-path="${mapping.path.join('-')}"]`;
      const domElement = mathElement.querySelector(selector);

      if (domElement) {
        const bounds = domElement.getBoundingClientRect();
        const parentBounds = mathElement.getBoundingClientRect();

        visualBounds.push({
          mapping,
          bounds: {
            top: bounds.top - parentBounds.top,
            left: bounds.left - parentBounds.left,
            width: bounds.width,
            height: bounds.height
          }
        });
      }
    } catch (error) {
      console.warn('Error calculating visual bounds:', error);
    }
  }

  return visualBounds;
}
