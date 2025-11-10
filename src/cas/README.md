# CAS (Computer Algebra System) Checker

A fast, rule-based mathematical equivalence checker for Texo Web Stylus.

## Architecture

```
User Input (LaTeX)
    ↓
KaTeX Parser → AST
    ↓
Rule-Based Canonicalizer (Fast Path)
    ↓
String Comparison
    ↓ (if failed)
Algebrite CAS Fallback (Slow Path)
    ↓
Visual Feedback with Error Highlighting
```

## Features

### 1. **Fast Canonicalization**
- Deterministic AST transformations
- Sub-second performance for high-school algebra
- Supports:
  - Algebraic simplification
  - Commutative/associative property application
  - Constant folding
  - Like-term combination

### 2. **Rule Engine**
- Configurable, priority-based rule system
- Regional notation support (US, UK, EU)
- Extensible for custom rules

### 3. **Algebrite Fallback**
- Handles complex operations:
  - Trigonometric identities
  - Logarithm rules
  - Advanced algebraic manipulations
  - Symbolic differentiation/integration

### 4. **Spatial Mapping**
- Maps AST nodes to rendered glyph positions
- Enables sub-expression error highlighting
- Falls back to full-line highlighting when precision isn't available

### 5. **Performance Optimizations**
- IndexedDB caching for repeated checks
- 500ms debouncing on user input
- Incremental parsing (only re-parse changed lines)
- Typical equivalence check: 1-50ms

### 6. **Floating-Point Tolerance**
- Configurable tolerance (default: 1e-6)
- Treats `0.999999` ≈ `1.0`
- Recognizes common fractions: `0.5` ≈ `1/2`

## Usage

### Basic Equivalence Check

```javascript
import { checkEquivalence } from './cas/equivalenceChecker.js';

const result = checkEquivalence('x^2 + 4x + 4', '(x + 2)^2');

console.log(result);
// {
//   equivalent: true,
//   method: 'canonicalization',
//   canonical1: 'pow(sym:x,num:2)|op:+|num:4|op:*|sym:x|op:+|num:4',
//   canonical2: 'pow(sym:x,num:2)|op:+|num:4|op:*|sym:x|op:+|num:4',
//   time: 12.5
// }
```

### Multi-Line Validation

```javascript
import { checkMultipleLines } from './cas/equivalenceChecker.js';

const lines = [
  'x^2 + 4x + 4',
  '(x + 2)^2',
  'x^2 + 2 \\cdot 2x + 2^2',
  'x^2 + 4x + 4'
];

const results = checkMultipleLines(lines);
// Array of check results, one per line transition
```

### Custom Configuration

```javascript
import { checkEquivalence, EquivalenceConfig } from './cas/equivalenceChecker.js';

const customConfig = {
  ...EquivalenceConfig,
  region: 'UK',
  floatTolerance: 1e-8,
  useAlgebrite: true,
  algebriteTimeout: 5000
};

const result = checkEquivalence(latex1, latex2, customConfig);
```

## Rule System

### Creating Custom Rules

```javascript
import { RuleEngine } from './cas/rules/ruleEngine.js';

const engine = new RuleEngine('US');

const customRule = {
  name: 'my-rule',
  description: 'My custom transformation',
  priority: 100, // Higher = applied first
  region: ['US', 'UK', 'EU'],
  match: (ast) => {
    // Return true if this rule applies to the AST
    return ast.type === 'something';
  },
  transform: (ast) => {
    // Return transformed AST
    return { ...ast, transformed: true };
  }
};

engine.addRule(customRule);
const result = engine.canonicalize(myAst);
```

### Built-in Rules

#### Algebra Rules (`algebraRules.js`)
- Flatten nested additions
- Combine like constants
- Sort commutative operands
- Normalize fraction signs
- Simplify double negatives
- Explicit multiplication
- Expand binomial squares

#### Trigonometry Rules (`trigRules.js`)
- Pythagorean identity: sin²(x) + cos²(x) = 1
- Tangent identity: tan(x) = sin(x)/cos(x)
- Odd/even function properties
- Special angle evaluations

## Regional Notation Support

The rule engine supports different mathematical notations by region:

```javascript
// US notation
const usEngine = new RuleEngine('US');

// UK notation
const ukEngine = new RuleEngine('UK');

// EU notation
const euEngine = new RuleEngine('EU');
```

Rules can specify which regions they apply to:

```javascript
{
  name: 'decimal-comma',
  region: ['EU'], // Only applies in EU region
  match: (ast) => { /* ... */ },
  transform: (ast) => { /* ... */ }
}
```

## Spatial Mapping & Error Highlighting

```javascript
import { createSpatialMapping, findErrorSubExpression } from './utils/spatialMapping.js';

const latex = 'x^2 + 4x + 4';
const ast = parseAndSimplify(latex);
const mapping = createSpatialMapping(latex, ast);

// mapping = [
//   { start: 0, end: 3, type: 'power', node: {...} },
//   { start: 4, end: 5, type: 'operator', node: {...} },
//   ...
// ]

// Find error sub-expression
const errorMapping = findErrorSubExpression(mapping, checkResult);
```

## IndexedDB Caching

```javascript
import { cacheCanonicalForm, getCachedCanonicalForm } from './utils/indexedDBCache.js';

// Store result
await cacheCanonicalForm('x^2 + 2x + 1', 'canonical-form', {
  metadata: 'extra data'
});

// Retrieve result
const cached = await getCachedCanonicalForm('x^2 + 2x + 1');
if (cached) {
  console.log('Cache hit!', cached);
}
```

## Testing

Comprehensive test suite included:

```bash
npm test
```

Test files:
- `src/utils/__tests__/equivalenceChecker.test.js` - Equivalence checker tests
- `src/utils/__tests__/ruleEngine.test.js` - Rule engine tests

### Sample Test Data

Pre-filled sample problems for UX testing:

```javascript
import { sampleProblems } from './utils/__tests__/equivalenceChecker.test.js';

sampleProblems.forEach(problem => {
  console.log(problem.name, problem.lines);
});
```

## Performance Benchmarks

Typical performance (on modern hardware):

| Operation | Time |
|-----------|------|
| Simple algebra | 1-5ms |
| Quadratic expansion | 5-15ms |
| Trig identities | 10-30ms |
| Complex CAS (Algebrite) | 50-500ms |
| Cache lookup | < 1ms |

## Supported Mathematical Operations

### Algebra
- ✓ Basic arithmetic (+, -, ×, ÷)
- ✓ Exponents and roots
- ✓ Polynomial operations
- ✓ Factoring and expansion
- ✓ Rational expressions

### Trigonometry
- ✓ Basic trig functions (sin, cos, tan)
- ✓ Inverse trig functions
- ✓ Pythagorean identities
- ✓ Angle sum/difference formulas
- ✓ Double/half angle formulas

### Calculus
- ✓ Limits (via Algebrite)
- ✓ Derivatives (via Algebrite)
- ✓ Integrals (via Algebrite)
- ✓ Series expansions (via Algebrite)

### Linear Algebra
- ✓ Matrix operations (via Algebrite)
- ✓ Vector operations (via Algebrite)
- ✓ Determinants (via Algebrite)

## Known Limitations

1. **KaTeX Parser Dependencies**: Relies on KaTeX's internal `__parse` method, which may change in future versions
2. **Complex CAS Operations**: Heavy operations may timeout (default: 2000ms)
3. **LaTeX Dialect**: Some non-standard LaTeX syntax may not parse correctly
4. **Implicit Multiplication**: May not handle all cases perfectly (e.g., `2(x+1)` vs `2*(x+1)`)

## Future Enhancements

- [ ] Advanced spatial mapping with DOM-based highlighting
- [ ] Support for more LaTeX environments (matrices, cases, etc.)
- [ ] User-defined rule sets
- [ ] Export/import rule configurations
- [ ] Step-by-step transformation explanations
- [ ] Integration with graphing tools
- [ ] Voice/gesture input support

## Contributing

To add new canonicalization rules:

1. Create a new rule file in `src/cas/rules/`
2. Export a function that returns an array of rules
3. Import and register in `equivalenceChecker.js`
4. Add tests in `src/utils/__tests__/`

## License

Part of Texo Web Stylus project.
