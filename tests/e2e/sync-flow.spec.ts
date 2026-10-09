import { test, expect } from '@playwright/test';

test.describe('Cross-Device Sync E2E Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      localStorage.clear();
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      }
    });
    await page.reload();
  });

  test('E2E-SYNC-001: Key Generation, QR Pairing Modal, and Mobile Context Auto-Pairing', async ({
    page,
    browser,
  }) => {
    // 1. Navigate to Settings
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Cross-Device Cloud Sync')).toBeVisible();
    await expect(page.getByText('Not Connected')).toBeVisible();

    // 2. Click Enable Cloud Sync
    const enableBtn = page.getByRole('button', { name: 'Enable Cloud Sync (Generate Key)' });
    await enableBtn.click();

    // 3. Verify QR Pairing Modal appears
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Scan to Pair Device')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Sync QR Code' })).toBeVisible();

    // 4. Retrieve generated sync key from DOM
    const keyElement = page.locator('div.select-all');
    await expect(keyElement).toBeVisible();
    const syncKey = (await keyElement.textContent())?.trim();
    expect(syncKey).toMatch(/^TD-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);

    // Close modal
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Connected')).toBeVisible();

    // 5. Simulate Mobile Device (iPhone 14) in a separate context scanning the QR code
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14 viewport
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });

    const mobilePage = await mobileContext.newPage();
    // Simulate iPhone opening the URL containing the pair query parameter
    await mobilePage.goto(`/?pair=${syncKey}`);

    // Verify mobile app detected the key and saved it
    const mobileKey = await mobilePage.evaluate(() => localStorage.getItem('talkdrill_sync_key'));
    expect(mobileKey).toBe(syncKey);

    // Navigate to mobile settings to verify connected status
    await mobilePage.getByRole('button', { name: 'Settings' }).click();
    await expect(mobilePage.getByText('Cross-Device Cloud Sync')).toBeVisible();
    await expect(mobilePage.getByText('Connected')).toBeVisible();

    await mobileContext.close();
  });
});
