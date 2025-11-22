# Test Suite Documentation

**Framework**: Playwright  
**Version**: 1.40.0  
**Last Updated**: 2025-11-22  

---

## Overview

This test suite provides comprehensive E2E testing for the Texo-web-stylus mathematical OCR application. The architecture follows modern testing best practices with composable fixtures, data factories, and network-first testing patterns.

---

## Setup Instructions

### Prerequisites

1. **Node.js**: Use version specified in `.nvmrc` (20.11.0)
   ```bash
   nvm use
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Install Playwright Browsers**:
   ```bash
   npx playwright install --with-deps
   ```

4. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your local settings
   ```

### Development Server

Tests expect the development server running on `http://localhost:5173`:

```bash
npm run dev
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm run test:e2e

# Run tests with UI (interactive mode)
npm run test:e2e:ui

# Run tests in headed mode (show browser)
npm run test:e2e:headed

# Debug tests (pause on failure)
npm run test:e2e:debug

# View HTML report
npm run test:e2e:report
```

### Environment-Specific Testing

```bash
# Local development (default)
npm run test:e2e

# Staging environment
TEST_ENV=staging npm run test:e2e

# Production environment
TEST_ENV=production npm run test:e2e
```

### Browser-Specific Testing

```bash
# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run mobile tests
npx playwright test --project=mobile-chrome
npx playwright test --project=mobile-safari
```

---

## Architecture Overview

### Directory Structure

```
tests/
├── e2e/                      # Test files (users organize as needed)
│   ├── example.spec.ts        # Sample tests demonstrating patterns
│   ├── auth.spec.ts          # Authentication tests (if applicable)
│   ├── ocr.spec.ts           # OCR functionality tests
│   ├── editor.spec.ts         # Math editor tests
│   └── workspace.spec.ts      # Workspace management tests
├── support/                  # Framework infrastructure (key pattern)
│   ├── fixtures/             # Test fixtures (data, mocks)
│   │   ├── index.ts          # Main fixture composition
│   │   └── factories/        # Data factories (faker-based)
│   │       ├── user-factory.ts
│   │       └── workspace-factory.ts
│   ├── helpers/              # Utility functions
│   └── page-objects/         # Page object models (optional)
├── playwright.config.ts      # Playwright configuration
└── README.md                 # This documentation
```

### Fixture Architecture

The test suite uses **composable fixtures** following the pure function → fixture → `mergeTests` pattern:

```typescript
// Base fixtures with auto-cleanup
export const test = base.extend<TestFixtures>({
  userFactory: async ({}, use) => {
    const factory = new UserFactory();
    await use(factory);
    await factory.cleanup(); // Auto-cleanup
  },
  workspaceFactory: async ({}, use) => {
    const factory = new WorkspaceFactory();
    await use(factory);
    await factory.cleanup(); // Auto-cleanup
  },
});
```

### Data Factories

Dynamic data generation with faker for parallel-safe tests:

```typescript
// Create test data with overrides
const user = await userFactory.createUser({ role: 'admin' });
const workspace = await workspaceFactory.createWorkspaceWithEquations(3);
```

---

## Best Practices

### Test Design Principles

1. **Deterministic Tests**: Each test should produce the same result every time
2. **Isolation**: Tests should not depend on each other's state
3. **Explicit Assertions**: Use specific assertions with clear expectations
4. **Data-testid Selectors**: Prefer `data-testid` over CSS selectors for stability

### Selector Strategy

```typescript
// ✅ GOOD: Use data-testid attributes
await page.click('[data-testid="submit-button"]');

// ❌ BAD: Brittle CSS selectors
await page.click('.btn.btn-primary.submit');
```

### Test Organization

```typescript
test.describe('Feature Area', () => {
  test.beforeEach(async ({ page }) => {
    // Shared setup for all tests in this describe
    await page.goto('/feature-page');
  });

  test('should do something specific', async ({ page }) => {
    // Test implementation
  });
});
```

### Error Handling

```typescript
test('should handle errors gracefully', async ({ page }) => {
  // Test error scenarios
  await page.click('[data-testid="error-trigger"]');
  
  // Assert error handling
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="error-message"]'))
    .toContainText('Expected error message');
});
```

---

## Performance Testing

### Timeouts Configuration

- **Action Timeout**: 15 seconds (clicks, fills, etc.)
- **Navigation Timeout**: 30 seconds (page loads)
- **Test Timeout**: 60 seconds (overall test)
- **Expect Timeout**: 15 seconds (assertions)

### Performance Monitoring

Tests automatically capture performance metrics:

```typescript
// Custom performance measurement
test('should load within performance targets', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/');
  await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000); // 3 seconds
});
```

---

## Debugging

### Trace Viewer

For failed tests, Playwright automatically captures traces:

```bash
# Open trace viewer
npx playwright show-trace test-results/trace.zip
```

### Debug Mode

```bash
# Run with debugging
npm run test:e2e:debug

# Or run specific test with debug
npx playwright test --debug --project=chromium tests/e2e/example.spec.ts
```

### Console Logs

Tests capture console logs automatically on failure. Check the test results folder for detailed logs.

---

## CI/CD Integration

### GitHub Actions

The test suite is configured for CI/CD with:

- **Parallel Execution**: Tests run across multiple browsers
- **Artifact Upload**: Screenshots, videos, and traces on failure
- **JUnit Reports**: For test result integration
- **Matrix Strategy**: Cross-browser testing

### Environment Variables

- `TEST_ENV`: Target environment (local, staging, production)
- `CI`: Automatically set in CI environments
- `BASE_URL`: Application base URL

---

## Knowledge Base References

This test suite implements patterns from the TEA knowledge base:

- **[Fixture Architecture](../.bmad/bmm/testarch/knowledge/fixture-architecture.md)**: Pure function → fixture → mergeTests composition
- **[Data Factories](../.bmad/bmm/testarch/knowledge/data-factories.md)**: Faker-based factories with auto-cleanup
- **[Network-First Testing](../.bmad/bmm/testarch/knowledge/network-first.md)**: API-first setup, deterministic waits
- **[Playwright Configuration](../.bmad/bmm/testarch/knowledge/playwright-config.md)**: Environment-based config, timeout standards
- **[Test Quality](../.bmad/bmm/testarch/knowledge/test-quality.md)**: Deterministic, isolated test design principles

---

## Troubleshooting

### Common Issues

1. **Browser Not Found**: Run `npx playwright install --with-deps`
2. **Port Already in Use**: Stop other dev servers or change port in `.env`
3. **Test Flakiness**: Check for timing issues, use explicit waits
4. **Memory Issues**: Reduce worker count in `playwright.config.ts`

### Getting Help

1. Check the [Playwright documentation](https://playwright.dev/)
2. Review test logs in `test-results/`
3. Use the UI mode for interactive debugging
4. Check the knowledge base references above

---

## Contributing

When adding new tests:

1. Follow the existing patterns and conventions
2. Use `data-testid` selectors for new elements
3. Add appropriate fixtures and factories
4. Update this documentation if needed
5. Run tests locally before submitting

---

**Test Coverage Goals**:
- ✅ Navigation and routing
- ✅ OCR functionality
- ✅ Math editor with equivalence checking
- ✅ Workspace management
- ✅ Error handling and edge cases
- ✅ Performance and accessibility

**Next Steps**:
1. Add more specific OCR test cases
2. Implement visual regression testing
3. Add accessibility testing suite
4. Set up performance benchmarking