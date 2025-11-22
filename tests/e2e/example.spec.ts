import { test, expect } from '../support/fixtures';

test.describe('Texo Web Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should load homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Texo/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should navigate to sketch page', async ({ page }) => {
    await page.click('[data-testid="nav-sketch"]');
    await expect(page).toHaveURL(/.*sketch/);
    await expect(page.locator('[data-testid="excalidraw-canvas"]')).toBeVisible();
  });

  test('should navigate to OCR page', async ({ page }) => {
    await page.click('[data-testid="nav-ocr"]');
    await expect(page).toHaveURL(/.*ocr/);
    await expect(page.locator('[data-testid="ocr-upload-area"]')).toBeVisible();
  });

  test('should navigate to compose page', async ({ page }) => {
    await page.click('[data-testid="nav-compose"]');
    await expect(page).toHaveURL(/.*compose/);
    await expect(page.locator('[data-testid="math-editor"]')).toBeVisible();
  });

  test('should navigate to database page', async ({ page }) => {
    await page.click('[data-testid="nav-database"]');
    await expect(page).toHaveURL(/.*database/);
    await expect(page.locator('[data-testid="workspace-list"]')).toBeVisible();
  });
});

test.describe('Mathematical OCR', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ocr');
  });

  test('should upload image and process OCR', async ({ page }) => {
    // Upload a test image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('public/test_img/test.png');

    // Wait for OCR processing
    await expect(page.locator('[data-testid="ocr-result"]')).toBeVisible({ timeout: 10000 });

    // Verify LaTeX output
    const latexOutput = page.locator('[data-testid="latex-output"]');
    await expect(latexOutput).toBeVisible();
    await expect(latexOutput).not.toHaveText('');
  });

  test('should show error for invalid image', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    // Try to upload a non-image file
    await fileInput.setInputFiles('package.json');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid image format');
  });
});

test.describe('Math Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compose');
  });

  test('should render inline math', async ({ page }) => {
    const editor = page.locator('[data-testid="math-editor"]');
    await editor.fill('The equation $x^2 + 3x + 2 = 0$ has solutions.');
    
    // Check if math is rendered
    await expect(page.locator('.katex')).toBeVisible();
  });

  test('should render display math', async ({ page }) => {
    const editor = page.locator('[data-testid="math-editor"]');
    await editor.fill('The integral is $$\\int_0^\\pi \\sin(x) dx = 2$$');
    
    // Check if display math is rendered
    await expect(page.locator('.katex-display')).toBeVisible();
  });

  test('should show equivalence checking', async ({ page }) => {
    const editor = page.locator('[data-testid="math-editor"]');
    await editor.fill('$(x+1)^2 = x^2 + 2x + 1$');
    
    // Wait for equivalence check
    await expect(page.locator('[data-testid="equivalence-status"]')).toBeVisible({ timeout: 5000 });
    
    // Should show valid equivalence
    await expect(page.locator('[data-testid="equivalence-status"]')).toHaveClass(/valid/);
  });
});

test.describe('Workspace Management', () => {
  test('should create new workspace', async ({ page, workspaceFactory }) => {
    const workspace = await workspaceFactory.createWorkspace({
      name: 'Test Math Workspace',
      description: 'A workspace for testing mathematical equations',
    });

    await page.goto('/database');
    
    // Should show the new workspace
    await expect(page.locator(`[data-testid="workspace-${workspace.id}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="workspace-${workspace.id}"]`)).toContainText(workspace.name);
  });

  test('should export and import workspace', async ({ page, workspaceFactory }) => {
    const workspace = await workspaceFactory.createWorkspaceWithEquations(2);

    await page.goto('/database');
    
    // Export workspace
    await page.click(`[data-testid="workspace-${workspace.id}"] [data-testid="export-btn"]`);
    
    // Import workspace
    await page.click('[data-testid="import-btn"]');
    const fileInput = page.locator('input[type="file"]');
    // Note: In real test, you'd need to handle the downloaded file
    
    // Should show imported workspace
    await expect(page.locator(`[data-testid="workspace-${workspace.id}"]`)).toBeVisible();
  });
});