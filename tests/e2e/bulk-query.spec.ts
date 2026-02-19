import { test, expect } from '@playwright/test';

test.describe('Bulk Query App', () => {
  test('loads the home page with step 1', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('bulk-query');
    await expect(page.locator('h2')).toContainText('Define Your Task');
  });

  test('shows predefined templates', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Translate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Summarize' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Flashcards' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Format' })).toBeVisible();
  });

  test('loads a predefined template into the prompt', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Translate' }).click();
    await expect(page.locator('textarea')).toHaveValue(
      /Translate the following text/
    );
  });

  test('prevents advancing without a task prompt', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Next/ }).click();
    // Should still be on step 1
    await expect(page.locator('h2')).toContainText('Define Your Task');
  });

  test('navigates from step 1 to step 2 with a valid prompt', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill('Summarize the following text');
    await page.getByRole('button', { name: /Next/ }).click();
    await expect(page.locator('h2')).toContainText('Input Your Text');
  });
});
