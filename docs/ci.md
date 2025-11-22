# CI/CD Pipeline Guide

## Overview

Texo-web-stylus uses GitHub Actions for automated testing with a focus on fast feedback, flaky test detection, and comprehensive artifact collection.

## Pipeline Stages

### 1. Install Dependencies
- Caches node_modules and Playwright browsers
- Uses Node version from `.nvmrc` (20.11.0)
- Installs with `--legacy-peer-deps` due to React 19 compatibility

### 2. Test Changed Specs (Burn-In)
- Runs 10 iterations on changed test files
- Catches flaky tests before they reach main branch
- Uploads artifacts on failure for debugging

### 3. E2E Tests (Parallel Shards)
- Splits tests into 4 parallel jobs for faster execution
- Each shard runs ~1/4 of the test suite
- `fail-fast: false` ensures all shards complete for full evidence

### 4. Merge Results
- Downloads results from all shards
- Generates merged HTML report
- Comments on PR with test results

### 5. Burn-In Loop (PR only)
- Runs full test suite 10 times on PRs
- Detects non-deterministic failures
- Uploads failure artifacts with 30-day retention

## Performance Targets

| Stage | Target | Notes |
|-------|--------|-------|
| Install | <5 min | With cache hit |
| Burn-in (changed) | <10 min | 10 iterations |
| E2E (per shard) | <10 min | 4 shards parallel |
| Burn-in (full) | <30 min | 10 iterations |
| Total pipeline | <45 min | 20× speedup vs sequential |

## Running Tests Locally

### Mirror CI Pipeline
```bash
./scripts/ci-local.sh
```

### Run Burn-in on Changed Files
```bash
./scripts/burn-in.sh 10 main    # 10 iterations vs main
./scripts/burn-in.sh 20 develop # 20 iterations vs develop
```

### Run Specific Test Categories
```bash
npm run test:e2e                    # All tests
npm run test:e2e:debug              # Interactive debugging
npm run test:e2e:headed             # Run with visible browser
npm run test:e2e:ui                 # Playwright Test UI
```

## Debugging Failed CI Runs

### 1. Download Artifacts
From GitHub Actions:
1. Go to failed workflow run
2. Click "Artifacts" section
3. Download relevant artifacts:
   - `test-results-shard-N` - Test results and traces
   - `burn-in-failure-artifacts` - Burn-in failure evidence
   - `merged-playwright-report` - Combined HTML report

### 2. View Trace Viewer
```bash
# After downloading trace artifact
npx playwright show-trace path/to/trace.zip
```

### 3. Open HTML Report
```bash
# After downloading merged report
npx playwright show-report playwright-report/
```

## Environment Configuration

### Local Development
```bash
export TEST_ENV=local
npm run test:e2e
```

### Staging/Production
```bash
export TEST_ENV=staging
npm run test:e2e
```

## Configuration Files

- `.github/workflows/test.yml` - Main CI pipeline
- `tests/playwright.config.ts` - Playwright configuration
- `scripts/test-changed.sh` - Selective test runner
- `scripts/ci-local.sh` - Local CI mirror
- `scripts/burn-in.sh` - Burn-in execution

## Troubleshooting

### Common Issues

**Issue**: "No configuration found for environment"
- **Solution**: Set `TEST_ENV=local` or check `playwright.config.ts`

**Issue**: Tests fail in CI but pass locally
- **Solution**: Run `./scripts/ci-local.sh` to mirror CI environment

**Issue**: Burn-in too slow
- **Solution**: Reduce iterations or run on cron only

**Issue**: Caching not working
- **Solution**: Check cache key formula, verify paths

### Performance Optimization

1. **Parallel Sharding**: Tests split across 4 jobs
2. **Dependency Caching**: node_modules and browsers cached
3. **Selective Testing**: Only changed files in burn-in
4. **Artifact Retention**: 30 days for reports, 7 for failures

## Secrets and Environment Variables

Required for production deployments:
- `TEST_ENV` - Environment to test against
- `BASE_URL` - Application URL (overridden by config)

No authentication secrets needed for E2E tests (uses test data factories).

## Badge URLs

Add to README.md:

```markdown
![CI](https://github.com/tzhvh/Texo-web-stylus/workflows/E2E%20Tests/badge.svg)
```

## Next Steps

1. Commit CI configuration: `git add .github/workflows/test.yml && git commit -m "ci: add test pipeline"`
2. Push to remote: `git push`
3. Open a PR to trigger first CI run
4. Monitor pipeline execution and adjust parallelism if needed