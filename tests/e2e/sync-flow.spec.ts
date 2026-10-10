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

  test('E2E-SYNC-002: Mobile automatically pulls Laptop newer count (353) and does not overwrite R2 with stale count (311)', async ({
    browser,
  }) => {
    const syncKey = 'TD-9X7K-M2P4-W8N3-7B5D';

    // Shared mock R2 storage
    let r2Snapshot: Record<string, unknown> = {
      schemaVersion: 1,
      exportedAt: 1000,
      articles: [{
        id: 'art-sync-test',
        title: 'Bilingual Shadowing Drill',
        sourceText: 'Hello',
        targetText: 'Bonjour le monde',
        sourceLang: 'en',
        targetLang: 'fr',
        mode: 'bilingual',
        targetCount: 500,
        currentCount: 353, // Laptop drilled up to 353
        createdAt: 1000,
        updatedAt: 2000,
        isArchived: 0,
      }],
      drillLogs: [
        { articleId: 'art-sync-test', delta: 1, resultingCount: 353, timestamp: 2000 },
      ],
      settings: [],
      wordLookups: [],
      audioMetas: [],
    };

    const handleSyncRoute = async (route: import('@playwright/test').Route) => {
      const url = route.request().url();

      if (url.includes('/api/sync/manifest')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
          body: JSON.stringify({ exists: true, updatedAt: 2000 }),
        });
      } else if (url.includes('/api/sync/pull')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
          body: JSON.stringify(r2Snapshot),
        });
      } else if (url.includes('/api/sync/push')) {
        const body = JSON.parse(route.request().postData() || '{}');
        r2Snapshot = body;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
          body: JSON.stringify({ success: true, updatedAt: Date.now() }),
        });
      } else {
        await route.continue();
      }
    };

    // Mobile PWA simulation
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.route('/api/sync/**', handleSyncRoute);

    // Seed mobile local IndexedDB with yesterday's older count (311)
    await mobilePage.goto('/');
    await mobilePage.evaluate(async (key) => {
      localStorage.setItem('talkdrill_sync_key', key);
      await new Promise<void>((resolve, reject) => {
        const openReq = indexedDB.open('TalkDrillDB');
        openReq.onsuccess = () => {
          const idb = openReq.result;
          const tx = idb.transaction('articles', 'readwrite');
          tx.objectStore('articles').put({
            id: 'art-sync-test',
            title: 'Bilingual Shadowing Drill',
            sourceText: 'Hello',
            targetText: 'Bonjour le monde',
            sourceLang: 'en',
            targetLang: 'fr',
            mode: 'bilingual',
            targetCount: 500,
            currentCount: 311, // Yesterday's count
            createdAt: 1000,
            updatedAt: 1000,
            isArchived: 0,
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        openReq.onerror = () => reject(openReq.error);
      });
    }, syncKey);

    // Reload mobile app (simulating user opening app from home screen)
    await mobilePage.reload();

    // Verify UI automatically reflects Laptop's newer count (353) without user needing manual intervention
    await expect(mobilePage.getByText('353 / 500 reps')).toBeVisible({ timeout: 5000 });

    // Verify that R2 snapshot was NOT overwritten with 311
    const finalArticles = (r2Snapshot.articles as Array<{ currentCount: number }>);
    expect(finalArticles[0].currentCount).toBe(353);

    await mobileContext.close();
  });
});
