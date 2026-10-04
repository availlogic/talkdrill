import { test, expect } from '@playwright/test';

test.describe('Theme & Contrast Validation (WCAG AAA)', () => {
  test('renders high contrast in Light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    // Check title color and body background in light mode
    const title = page.locator('h1');
    await expect(title).toContainText('TalkDrill');

    const styles = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const body = document.body;
      return {
        bodyBg: window.getComputedStyle(body).backgroundColor,
        titleColor: h1 ? window.getComputedStyle(h1).color : '',
      };
    });

    // In light mode, title is dark slate (#0f172a / oklch 0.208)
    expect(styles.titleColor).toMatch(/oklch\(0\.208|rgb\(15,\s*23,\s*42\)/);
  });

  test('renders high contrast in Dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    const title = page.locator('h1');
    await expect(title).toContainText('TalkDrill');

    const styles = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const body = document.body;
      return {
        bodyBg: window.getComputedStyle(body).backgroundColor,
        titleColor: h1 ? window.getComputedStyle(h1).color : '',
      };
    });

    // In dark mode, title is pure white (#ffffff)
    expect(styles.titleColor).toBe('rgb(255, 255, 255)');
    // Body background is deep dark slate (#090d16)
    expect(styles.bodyBg).toContain('9, 13, 22');
  });

  test('switches theme explicitly via SettingsHub UI', async ({ page }) => {
    await page.goto('/');

    // Navigate to settings
    await page.click('button[aria-label="Settings"]');
    await expect(page.locator('h2')).toContainText('Settings & Integrations');

    // Force Dark Mode
    await page.click('button:has-text("Dark Mode")');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Force Light Mode
    await page.click('button:has-text("Light Mode")');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Return to Library
    await page.click('button[aria-label="Back"]');
    await expect(page.locator('h1')).toContainText('TalkDrill');
  });
});
