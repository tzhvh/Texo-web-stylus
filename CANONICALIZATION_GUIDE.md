# Canonicalization Rules and Conversion Patterns

## Overview

This document describes the canonicalization rules used in the Texo CAS (Computer Algebra System) for efficiently comparing mathematical expressions without falling back to the slower Algebrite CAS.

## Architecture

```
LaTeX Input → KaTeX Parser → Rule-Based Canonicalizer → String Comparison
                                       ↓ (if fails)
                          Algebrite CAS Fallback → Result
```

### Performance Characteristics

- **Fast Path (Canonicalization)**: 1-50ms
- **Slow Path (Algebrite)**: 50-500ms
- **Goal**: Maximize fast path usage by expanding rule coverage

## Canonicalization Rules

Rules are applied in priority order (highest first) until a fixpoint is reached. Each rule consists of:
- `name`: Unique identifier
- `description`: Human-readable explanation
- `priority`: Execution order (higher = earlier)
- `match(ast)`: Returns true if rule applies
- `transform(ast)`: Returns transformed AST

### Rule List (Priority Order)

#### 1. Flatten Addition (Priority 100)
**Pattern**: `(a + (b + c)) → (a + b + c)`

Flattens nested additions to create a flat list of terms.

**Example**:
```
Input:  x + (y + z)
Output: x + y + z
```

**Implementation**: `src/cas/rules/algebraRules.js:15-40`

---

#### 2. Simplify Double Negative (Priority 95)
**Pattern**: `-(-x) → x`

Removes double negatives for cleaner expressions.

**Example**:
```
Input:  -(-x)
Output: x
```

**Implementation**: `src/cas/rules/algebraRules.js:176-217`

---

#### 3. Combine Constants (Priority 90)
**Pattern**: `2 + 3 → 5`, `6 * 4 → 24`

Evaluates arithmetic operations on numeric constants.

**Example**:
```
Input:  2 + 3
Output: 5

Input:  10 / 2
Output: 5
```

**Supported Operations**: `+`, `-`, `*`, `/`, `\cdot`, `\times`

**Implementation**: `src/cas/rules/algebraRules.js:45-105`

---

#### 4. Combine Like Terms (Priority 85)
**Pattern**: `2x + 3x → 5x`, `4xy + 2xy → 6xy`

Combines terms with identical variable parts by summing coefficients.

**Examples**:
```
Input:  2x + 3x
Output: 5x

Input:  3xy + 7xy
Output: 10xy

Input:  2x + 3y + 4x
Output: 6x + 3y

Input:  5x - 2x
Output: 3x

Input:  3x - 3x
Output: 0
```

**Algorithm**:
1. Extract terms using `extractTerms()`
2. For each term, extract coefficient and variable part using `extractCoefficientAndVariables()`
3. Group terms by their variable part (as JSON string)
4. Sum coefficients for each group
5. Rebuild expression with combined coefficients

**Special Cases**:
- Terms without explicit coefficient (e.g., `x`) are treated as having coefficient 1
- Negative signs are handled as coefficient modifiers
- Terms that cancel out produce 0
- Single variable part with coefficient 1 omits the "1 *" prefix

**Implementation**: `src/cas/rules/algebraRules.js:107-183`

**Helper Function**: `extractCoefficientAndVariables()` at `src/cas/rules/algebraRules.js:383-422`

---

#### 5. Normalize Fraction Signs (Priority 85)
**Pattern**: `a / (-b) → -(a / b)`

Moves negative signs from denominators to numerators.

**Example**:
```
Input:  x / (-2)
Output: -(x / 2)
```

**Implementation**: `src/cas/rules/algebraRules.js:145-171`

---

#### 6. Sort Addition Terms (Priority 80)
**Pattern**: `c + b + a → a + b + c`

Sorts addition terms alphabetically for canonical representation.

**Example**:
```
Input:  z + x + y
Output: x + y + z
```

**Implementation**: `src/cas/rules/algebraRules.js:185-218`

---

#### 7. Sort Multiplication Factors (Priority 75)
**Pattern**: `c * b * a → a * b * c`

Sorts multiplication factors with numbers first, then alphabetically.

**Example**:
```
Input:  z * 5 * x
Output: 5 * x * z
```

**Implementation**: `src/cas/rules/algebraRules.js:220-268`

---

#### 8. Explicit Multiplication (Priority 70)
**Pattern**: `2x → 2 * x` (internal representation)

Makes implicit multiplication explicit for easier processing.

**Example**:
```
Input:  2x
Output: 2 \cdot x (internal AST)
```

**Implementation**: `src/cas/rules/algebraRules.js:222-253`

---

#### 9. Expand Binomial Square (Priority 60)
**Pattern**: `(a + b)^2 → a^2 + 2ab + b^2`

Expands simple binomial squares.

**Example**:
```
Input:  (x + 2)^2
Output: x^2 + 2 * x * 2 + 2^2
```

**Note**: Only applies to exponent of 2 and two-term sums.

**Implementation**: `src/cas/rules/algebraRules.js:258-301`

---

## AST Structure

The KaTeX parser produces an AST with the following node types:

### Number Node
```javascript
{ type: 'number', value: 5 }
```

### Symbol/Variable Node
```javascript
{ type: 'symbol', value: 'x' }
```

### Operator Node
```javascript
{ type: 'operator', op: '+' }
{ type: 'operator', op: '\\cdot' }
```

### Sign Node
```javascript
{ type: 'sign', value: '-' }
```

### Power Node
```javascript
{
  type: 'power',
  base: [...],
  exponent: [...]
}
```

### Fraction Node
```javascript
{
  type: 'fraction',
  numerator: [...],
  denominator: [...]
}
```

### Delimited Node (Parentheses)
```javascript
{
  type: 'delimited',
  body: [...]
}
```

## Helper Functions

### `extractTerms(nodes)`
Splits an expression into addition/subtraction terms.

**Example**:
```javascript
// Input: [x, +, y, +, z]
// Output: [[x], [y], [z]]

// Input: [2x, -, 3y]
// Output: [[2, *, x], [-, 3, *, y]]
```

**Location**: `src/cas/rules/ruleEngine.js:223-251`

---

### `extractFactors(term)`
Splits a term into multiplication/division factors.

**Example**:
```javascript
// Input: [2, *, x, *, y]
// Output: [
//   { nodes: [2], op: null },
//   { nodes: [x], op: '\\cdot' },
//   { nodes: [y], op: '\\cdot' }
// ]
```

**Location**: `src/cas/rules/ruleEngine.js:256-281`

---

### `extractCoefficientAndVariables(term)`
Extracts the numeric coefficient and variable part from a term.

**Examples**:
```javascript
// [2, *, x] → { coefficient: 2, variablePart: [x] }
// [x] → { coefficient: 1, variablePart: [x] }
// [-, 3, *, x] → { coefficient: -3, variablePart: [x] }
// [5] → { coefficient: 5, variablePart: null }
```

**Algorithm**:
1. Check for leading negative sign (modifies coefficient)
2. Extract numeric coefficient (defaults to 1)
3. Skip multiplication operator if present
4. Return remaining nodes as variable part

**Location**: `src/cas/rules/algebraRules.js:383-422`

---

### `isNumber(node)`
Checks if a node represents a number.

**Location**: `src/cas/rules/ruleEngine.js:187-189`

---

### `getNumber(node)`
Extracts the numeric value from a number node.

**Location**: `src/cas/rules/ruleEngine.js:194-196`

---

### `isVariable(node)`
Checks if a node is a variable (symbol that's not a number).

**Location**: `src/cas/rules/ruleEngine.js:205-207`

---

### `isType(node, type)`
Checks if a node has a specific type.

**Location**: `src/cas/rules/ruleEngine.js:175-177`

---

## Algebrite Fallback

When canonicalization fails to produce matching strings, the system falls back to Algebrite CAS.

### Conversion Process

**LaTeX → Algebrite Syntax**:
```
\sin(x)      → sin(x)
\cos(x)      → cos(x)
x^2          → x^2
2x           → 2*x
(a)(b)       → (a)*(b)
\sin^2(x)    → (sin(x))^2
\frac{a}{b}  → a/b
```

**Location**: `src/cas/equivalenceChecker.js:462-546`

### Fallback Strategies

1. **Difference Method**: Check if `expr1 - expr2 ≈ 0`
2. **Simplification Method**: Compare simplified forms

**Timeout**: 2000ms (configurable)

**Location**: `src/cas/equivalenceChecker.js:225-261`

---

## Force Recheck Mode

Users can bypass canonicalization and force Algebrite usage through the composer UI.

### Configuration

**Flag**: `forceAlgebrite: boolean`
- **Default**: `false`
- **When enabled**: Skips rule engine entirely, uses Algebrite directly
- **Side effects**: Also bypasses result caching

**Configuration locations**:
- `src/cas/equivalenceChecker.js` - `EquivalenceConfig.forceAlgebrite`
- `src/utils/workspaceDB.js` - `DEFAULT_SESSION_STATE.forceAlgebrite`

### How It Works

```javascript
// Normal flow:
Parse → Canonicalize → Compare strings → If fail, try Algebrite

// Force Algebrite flow:
Parse → Skip to Algebrite directly
```

**Implementation** (`src/cas/equivalenceChecker.js`, lines 176-204):
```javascript
if (config.forceAlgebrite) {
  Logger.debug('Force Algebrite mode - skipping canonicalization');

  const algebraicCheck = checkWithAlgebrite(latex1, latex2, ...);
  return {
    ...algebraicCheck,
    forced: true,  // Indicates forced mode
    time: performance.now() - startTime
  };
}
```

### UI Controls

**Location**: `src/pages/ComposePage.jsx`

**Toggle Checkbox**:
- Appears in composer header next to Debug toggle
- Orange styling when active
- Shows warning banner when enabled

**Visual Indicators**:
- **Banner**: "⚠️ Force Algebrite Mode Active - Cache disabled, using slower but comprehensive CAS engine"
- **Method badge**: Results show `forced: true` flag
- **Color coding**: Orange theme for forced mode vs. green for debug mode

### Use Cases

1. **Debugging Canonicalization Rules**
   - Verify that rules produce correct results
   - Compare fast path vs. Algebrite behavior
   - Identify when canonicalization fails incorrectly

2. **Verifying Complex Expressions**
   - Double-check results on critical comparisons
   - Use comprehensive CAS when accuracy is paramount
   - Bypass potential rule bugs

3. **Testing Algebrite Behavior**
   - See how Algebrite handles specific expressions
   - Measure performance differences
   - Test fallback reliability

4. **Clearing Stale Cache**
   - Force fresh computation
   - Avoid cached bugs from previous versions
   - Re-validate after rule changes

### Performance Impact

| Mode | Average Time | Method |
|------|--------------|--------|
| **Normal** (canonicalization) | 1-50ms | Fast path |
| **Forced** (Algebrite only) | 50-500ms | Slow path |

**Note**: Force mode is 10-50x slower, intended for verification and debugging only.

### Configuration Example

```javascript
// Force Algebrite for specific checks
result = checkEquivalence('2x + 3x', '5x', {
  ...EquivalenceConfig,
  forceAlgebrite: true  // Skip canonicalization
});

// Result will have forced: true flag
console.log(result.forced);  // true
console.log(result.method);  // 'algebrite-difference' or 'algebrite-simplify'
```

---

## Adding New Rules

To add a new canonicalization rule:

1. **Determine Priority**: Higher priority rules run first
   - 90-100: Structural normalization (flatten, combine constants)
   - 80-89: Algebraic simplification (like terms, fraction signs)
   - 70-79: Ordering/sorting
   - 60-69: Expansion rules

2. **Implement Match Function**: Return true when rule applies
   ```javascript
   match: (ast) => {
     // Check if transformation is applicable
     return condition;
   }
   ```

3. **Implement Transform Function**: Return transformed AST
   ```javascript
   transform: (ast) => {
     // Perform transformation
     return newAst;
   }
   ```

4. **Add to Rule Array**: Insert in priority order
   ```javascript
   // In getAlgebraRules()
   {
     name: 'my-new-rule',
     description: 'What the rule does',
     priority: 85,
     region: ['US', 'UK', 'EU'],
     match: (ast) => { /* ... */ },
     transform: (ast) => { /* ... */ }
   }
   ```

5. **Add Tests**: Create test cases in `equivalenceChecker.test.js`
   ```javascript
   test('should apply my new rule', () => {
     const result = checkEquivalence('input', 'expected');
     expect(result.equivalent).toBe(true);
     expect(result.method).toBe('canonicalization');
   });
   ```

---

## Testing

### Test Structure

**File**: `src/utils/__tests__/equivalenceChecker.test.js`

**Test Categories**:
- Basic Algebra (5 tests)
- Quadratic Expressions (3 tests)
- Fractions (3 tests)
- Trigonometry (5 tests)
- Float Approximations (3 tests)
- Complex Expressions (3 tests)
- Error Cases (2 tests)
- Performance (2 tests)
- Canonicalization - Like Terms (9 tests)
- Multi-line Validation (2 tests)

### Running Tests

```bash
npm test
```

### Debugging

Check which method was used:
```javascript
const result = checkEquivalence('2x + 3x', '5x');
console.log(result.method); // 'canonicalization' or 'algebrite-simplify'
console.log(result.time);   // execution time in ms
```

---

## Performance Optimization Guidelines

1. **Add More Canonicalization Rules**: Each new rule can eliminate Algebrite fallbacks
2. **Prioritize Common Patterns**: Focus on patterns students use frequently
3. **Keep Rules Simple**: Complex rules can be slower than Algebrite
4. **Test Performance**: Ensure canonicalization remains faster than fallback

---

## File Locations

- **Algebra Rules**: `src/cas/rules/algebraRules.js`
- **Trigonometry Rules**: `src/cas/rules/trigRules.js`
- **Rule Engine**: `src/cas/rules/ruleEngine.js`
- **Equivalence Checker**: `src/cas/equivalenceChecker.js`
- **Tests**: `src/utils/__tests__/equivalenceChecker.test.js`
- **This Guide**: `CANONICALIZATION_GUIDE.md`

---

## Future Enhancements

Potential rules to add:
1. **Polynomial Collection**: Group terms by degree
2. **Fraction GCD Reduction**: `\frac{6}{9} → \frac{2}{3}`
3. **Distributive Property**: `a(b + c) → ab + ac`
4. **Factor Common Terms**: `ax + ay → a(x + y)`
5. **Power Simplification**: `x^a \cdot x^b → x^{a+b}`

---

## Version History

- **v1.0** (2025-11-11): Initial documentation
  - 9 canonicalization rules
  - Like terms combination rule added
  - Sort multiplication factors rule added
  - 98% test pass rate (54/55 tests)
