/**
 * Rule-Based Canonicalizer Engine
 * Applies deterministic transformations to normalize mathematical expressions
 * Supports regional notation variants through configurable rules
 */

/**
 * Rule definition structure:
 * {
 *   name: string,
 *   description: string,
 *   priority: number (higher = apply first),
 *   region: string[] (e.g., ['US', 'UK', 'EU']),
 *   match: function(ast) -> boolean,
 *   transform: function(ast) -> ast
 * }
 */

export class RuleEngine {
  constructor(region = 'US') {
    this.rules = [];
    this.region = region;
    this.appliedRules = []; // For debugging
  }

  /**
   * Register a new canonicalization rule
   */
  addRule(rule) {
    // Validate rule
    if (!rule.name || !rule.match || !rule.transform) {
      throw new Error('Invalid rule: must have name, match, and transform');
    }

    // Check region compatibility
    if (rule.region && !rule.region.includes(this.region)) {
      return; // Skip rules for other regions
    }

    this.rules.push({
      priority: rule.priority || 0,
      ...rule
    });

    // Sort by priority (descending)
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Apply all rules to an AST until fixpoint (no more changes)
   * Uses rule-level fixpoint detection to prevent infinite loops
   */
  canonicalize(ast, maxIterations = 100) {
    this.appliedRules = [];
    let current = JSON.parse(JSON.stringify(ast)); // Deep clone
    let iteration = 0;

    // Track rules that have reached fixpoint (no changes in last iteration)
    const rulesAtFixpoint = new Set();

    while (rulesAtFixpoint.size < this.rules.length && iteration < maxIterations) {
      iteration++;
      let anyRuleChanged = false;

      for (const rule of this.rules) {
        // Skip if this rule has already reached fixpoint
        if (rulesAtFixpoint.has(rule.name)) {
          continue;
        }

        const result = this.applyRuleRecursively(current, rule);

        if (result.changed) {
          current = result.ast;
          anyRuleChanged = true;
          this.appliedRules.push({
            iteration,
            rule: rule.name,
            description: rule.description
          });
        } else {
          // No change means this rule reached fixpoint
          rulesAtFixpoint.add(rule.name);
        }
      }

      // If no rules changed in this iteration, we've reached overall fixpoint
      if (!anyRuleChanged) {
        break;
      }
    }

    if (iteration >= maxIterations) {
      console.warn('Canonicalization reached max iterations');
    }

    return {
      ast: current,
      iterations: iteration,
      appliedRules: this.appliedRules,
      converged: iteration < maxIterations && rulesAtFixpoint.size === this.rules.length
    };
  }

  /**
   * Apply a rule recursively to all nodes in the AST
   */
  applyRuleRecursively(ast, rule) {
    let changed = false;

    function transform(node) {
      if (!node) return node;

      // Handle arrays
      if (Array.isArray(node)) {
        const newArray = node.map(transform);
        const arrayChanged = newArray.some((n, i) => n !== node[i]);
        if (arrayChanged) changed = true;

        // Try to apply rule to the whole array
        if (rule.match(newArray)) {
          changed = true;
          return rule.transform(newArray);
        }
        return newArray;
      }

      // Handle objects
      if (typeof node === 'object') {
        // First, recursively transform children
        const newNode = { ...node };
        for (const key in newNode) {
          if (key === 'loc') continue; // Preserve location info
          const oldValue = newNode[key];
          const newValue = transform(oldValue);
          if (newValue !== oldValue) {
            newNode[key] = newValue;
            changed = true;
          }
        }

        // Then try to apply rule to this node
        if (rule.match(newNode)) {
          changed = true;
          return rule.transform(newNode);
        }

        return newNode;
      }

      return node;
    }

    const result = transform(ast);
    return { ast: result, changed };
  }

  /**
   * Get all applied rules (for debugging)
   */
  getAppliedRules() {
    return this.appliedRules;
  }

  /**
   * Clear all rules
   */
  clearRules() {
    this.rules = [];
    this.appliedRules = [];
  }
}

// Helper functions for pattern matching

/**
 * Check if node is a specific type
 */
export function isType(node, type) {
  return node && node.type === type;
}

/**
 * Check if node represents a number
 */
export function isNumber(node) {
  return isType(node, 'number') || (isType(node, 'symbol') && !isNaN(parseFloat(node.value)));
}

/**
 * Get numeric value from node
 */
export function getNumber(node) {
  if (isType(node, 'number')) return node.value;
  if (isType(node, 'symbol')) {
    const num = parseFloat(node.value);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Check if node is a variable (symbol that's not a number)
 */
export function isVariable(node) {
  return isType(node, 'symbol') && isNaN(parseFloat(node.value));
}

/**
 * Check if node is an operation with specific operator
 */
export function isOperation(node, op = null) {
  if (!node || !Array.isArray(node)) return false;

  // Look for operator in array
  const hasOp = node.some(n => isType(n, 'operator') && (!op || n.op === op));
  return hasOp;
}

/**
 * Extract terms from addition/subtraction
 */
export function extractTerms(nodes) {
  if (!Array.isArray(nodes)) return [nodes];

  const terms = [];
  let currentTerm = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (isType(node, 'operator') && (node.op === '+' || node.op === '-')) {
      if (currentTerm.length > 0) {
        terms.push(currentTerm);
        currentTerm = [];
      }
      if (node.op === '-') {
        // Attach sign to next term
        currentTerm.push({ type: 'sign', value: '-' });
      }
    } else {
      currentTerm.push(node);
    }
  }

  if (currentTerm.length > 0) {
    terms.push(currentTerm);
  }

  return terms;
}

/**
 * Extract factors from multiplication/division
 */
export function extractFactors(term) {
  if (!Array.isArray(term)) return [term];

  const factors = [];
  let currentFactor = [];

  for (let i = 0; i < term.length; i++) {
    const node = term[i];

    if (isType(node, 'operator') && (node.op === '\\cdot' || node.op === '\\times' || node.op === '/')) {
      if (currentFactor.length > 0) {
        factors.push({ nodes: currentFactor, op: null });
        currentFactor = [];
      }
      factors.push({ nodes: [], op: node.op });
    } else {
      currentFactor.push(node);
    }
  }

  if (currentFactor.length > 0) {
    factors.push({ nodes: currentFactor, op: null });
  }

  return factors;
}
