import { defineConfig, devices } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Load .env from project root
dotenvConfig({
  path: path.resolve(__dirname, '../.env'),
});

// Central environment config map
const envConfigMap = {
  local: {
    ...baseConfig,
    use: {
      ...baseConfig.use,
      baseURL: 'http://localhost:5173', // Vite dev server
      video: 'off', // No video locally for speed
    },
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  },
  staging: {
    ...baseConfig,
    use: {
      ...baseConfig.use,
      baseURL: 'https://staging.example.com',
      ignoreHTTPSErrors: true, // Allow self-signed certs in staging
    },
  },
  production: {
    ...baseConfig,
    retries: 3, // More retries in production
    use: {
      ...baseConfig.use,
      baseURL: 'https://example.com',
      video: 'on', // Always record production failures
    },
  },
};

// Base configuration with standardized timeouts
const baseConfig = {
  testDir: path.resolve(__dirname, './e2e'),
  outputDir: path.resolve(__dirname, '../test-results'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined, // Serial in CI for stability

  // Standardized timeouts (action 15s, navigation 30s, test 60s)
  timeout: 60 * 1000, // Test timeout: 60s
  expect: {
    timeout: 15 * 1000, // Assertion timeout: 15s
  },

  use: {
    actionTimeout: 15 * 1000, // Action timeout: 15s
    navigationTimeout: 30 * 1000, // Navigation timeout: 30s
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  reporter: [
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
};

const environment = process.env.TEST_ENV || 'local';

// Fail fast if environment not supported
if (!Object.keys(envConfigMap).includes(environment)) {
  console.error(`❌ No configuration found for environment: ${environment}`);
  console.error(`   Available environments: ${Object.keys(envConfigMap).join(', ')}`);
  process.exit(1);
}

console.log(`✅ Running tests against: ${environment.toUpperCase()}`);

export default envConfigMap[environment as keyof typeof envConfigMap];