/**
 * KaTeX Parser Utility
 * Extracts and works with KaTeX's internal parse tree
 */

import katex from 'katex';

/**
 * Parse LaTeX string into KaTeX AST
 * @param {string} latex - LaTeX expression
 * @returns {Object} - KaTeX parse tree
 */
export function parseLatex(latex) {
  try {
    // Use KaTeX's internal parser (parseTree is exposed in the namespace)
    const parseTree = katex.__parse(latex);
    return {
      success: true,
      ast: parseTree,
      original: latex
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      original: latex
    };
  }
}

/**
 * Extract spatial information from KaTeX AST node
 * Maps AST nodes to character positions in the original LaTeX
 * @param {Object} node - KaTeX AST node
 * @param {string} latex - Original LaTeX string
 * @returns {Object} - Spatial mapping { start, end, node }
 */
export function extractSpatialInfo(node, latex) {
  const mapping = [];

  function traverse(n, depth = 0) {
    if (!n) return;

    // Extract position info if available
    if (n.loc && n.loc.start && n.loc.end) {
      mapping.push({
        start: n.loc.start,
        end: n.loc.end,
        type: n.type,
        node: n,
        depth
      });
    }

    // Traverse children based on node type
    if (Array.isArray(n)) {
      n.forEach(child => traverse(child, depth + 1));
    } else if (n.body) {
      traverse(n.body, depth + 1);
    } else if (n.args) {
      n.args.forEach(arg => traverse(arg, depth + 1));
    }
  }

  traverse(node);
  return mapping;
}

/**
 * Convert KaTeX AST to simplified canonical AST
 * This creates a normalized representation for easier comparison
 * @param {Object} katexAst - KaTeX parse tree
 * @returns {Object} - Simplified AST
 */
export function simplifyKatexAst(katexAst) {
  if (!katexAst || !Array.isArray(katexAst)) {
    return null;
  }

  function simplifyNode(node) {
    if (!node) return null;

    // Handle text/symbols
    if (node.type === 'textord' || node.type === 'mathord') {
      return {
        type: 'symbol',
        value: node.text || node.value,
        loc: node.loc
      };
    }

    // Handle numbers
    if (node.type === 'textord' && /^\d+$/.test(node.text)) {
      return {
        type: 'number',
        value: parseFloat(node.text),
        loc: node.loc
      };
    }

    // Handle operators
    if (node.type === 'bin' || node.type === 'op') {
      return {
        type: 'operator',
        op: node.text || node.value,
        loc: node.loc
      };
    }

    // Handle superscript (exponents)
    if (node.type === 'supsub') {
      const base = node.base ? simplifyNode(node.base) : null;
      const sup = node.sup ? simplifyNodes(node.sup) : null;
      const sub = node.sub ? simplifyNodes(node.sub) : null;

      if (sup && !sub) {
        return {
          type: 'power',
          base,
          exponent: sup,
          loc: node.loc
        };
      } else if (sub && !sup) {
        return {
          type: 'subscript',
          base,
          subscript: sub,
          loc: node.loc
        };
      } else {
        return {
          type: 'supsub',
          base,
          sup,
          sub,
          loc: node.loc
        };
      }
    }

    // Handle fractions
    if (node.type === 'genfrac') {
      return {
        type: 'fraction',
        numerator: simplifyNodes(node.numer),
        denominator: simplifyNodes(node.denom),
        loc: node.loc
      };
    }

    // Handle square roots
    if (node.type === 'sqrt') {
      return {
        type: 'sqrt',
        body: simplifyNodes(node.body),
        index: node.index ? simplifyNodes(node.index) : null,
        loc: node.loc
      };
    }

    // Handle functions (sin, cos, log, etc.)
    if (node.type === 'op' && node.name) {
      return {
        type: 'function',
        name: node.name,
        loc: node.loc
      };
    }

    // Handle delimiters (parentheses, brackets)
    if (node.type === 'leftright') {
      return {
        type: 'delimited',
        left: node.left,
        right: node.right,
        body: simplifyNodes(node.body),
        loc: node.loc
      };
    }

    // Handle arrays/matrices
    if (node.type === 'array') {
      return {
        type: 'array',
        body: node.body.map(row => row.map(cell => simplifyNodes(cell))),
        loc: node.loc
      };
    }

    // Default: preserve structure
    return {
      type: node.type,
      raw: node,
      loc: node.loc
    };
  }

  function simplifyNodes(nodes) {
    if (!Array.isArray(nodes)) {
      return simplifyNode(nodes);
    }
    return nodes.map(simplifyNode).filter(n => n !== null);
  }

  return simplifyNodes(katexAst);
}

/**
 * Pretty print AST for debugging
 * @param {Object} ast - Simplified AST
 * @param {number} indent - Indentation level
 * @returns {string} - Formatted string
 */
export function prettyPrintAst(ast, indent = 0) {
  const spaces = '  '.repeat(indent);

  if (!ast) return `${spaces}null`;

  if (Array.isArray(ast)) {
    return ast.map(node => prettyPrintAst(node, indent)).join('\n');
  }

  const typeStr = `${spaces}${ast.type}`;

  switch (ast.type) {
    case 'symbol':
    case 'number':
      return `${typeStr}: ${ast.value}`;
    case 'operator':
      return `${typeStr}: ${ast.op}`;
    case 'power':
      return `${typeStr}\n${prettyPrintAst(ast.base, indent + 1)}\n${spaces}  ^\n${prettyPrintAst(ast.exponent, indent + 1)}`;
    case 'fraction':
      return `${typeStr}\n${spaces}  numerator:\n${prettyPrintAst(ast.numerator, indent + 2)}\n${spaces}  denominator:\n${prettyPrintAst(ast.denominator, indent + 2)}`;
    default:
      return typeStr;
  }
}
