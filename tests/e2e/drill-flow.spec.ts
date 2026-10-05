import { test, expect } from '@playwright/test';

test.describe('TalkDrill E2E Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear any previous IndexedDB data
    await page.evaluate(async () => {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      }
    });
    await page.reload();
  });

  test('E2E-SCN-001: Elena Desktop Journey - Create, Shadow, Print, Zen Mode', async ({ page }) => {
    // 1. Initial Empty State
    await expect(page.getByText('No Shadowing Drills Yet')).toBeVisible();
    await page.getByRole('button', { name: 'Create First Drill' }).click();

    // 2. Studio Entry
    await expect(page.getByText('Corpus Studio')).toBeVisible();
    await expect(page.getByRole('button', { name: 'AI Spoken Translation' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Direct Foreign Text' }).click();
    await page.getByPlaceholder('Enter drill title (optional)').fill('Elena Restaurante');
    await page.getByPlaceholder('Enter or paste foreign text here...').fill('¿Nos cobras, por favor?');

    // 3. Save and Start Drill
    await page.getByRole('button', { name: 'Save and Start Drill' }).click();

    // 4. Drill Workspace Verification
    await expect(page.getByText('Elena Restaurante')).toBeVisible();
    await expect(page.getByText('¿Nos cobras, por favor?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adjust Repetition Count' })).toContainText('0 reps');

    // 5. Tactile Drill Increments (+1 click and Spacebar)
    const primaryDrillBtn = page.getByRole('button', { name: 'Drill +1' });
    await primaryDrillBtn.click();
    await expect(page.getByRole('button', { name: 'Adjust Repetition Count' })).toContainText('1 reps');

    // Press Space 4 times to reach 5 (1 full Zheng character)
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Space');
    }
    await expect(page.getByRole('button', { name: 'Adjust Repetition Count' })).toContainText('5 reps');

    // 6. Undo with KeyZ
    await page.keyboard.press('KeyZ');
    await expect(page.getByRole('button', { name: 'Adjust Repetition Count' })).toContainText('4 reps');

    // Restore to 5
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Adjust Repetition Count' })).toContainText('5 reps');

    // 7. Print Worksheet Modal
    await page.getByRole('button', { name: 'Print Worksheet' }).click();
    await expect(page.getByText('Print Worksheet & Tally Sheet Export')).toBeVisible();

    // Switch between 60 and 100 boxes
    const btn60 = page.getByRole('button', { name: '60 Boxes (300 reps)' });
    const btn100 = page.getByRole('button', { name: '100 Boxes (500 reps)' });
    await btn60.click();
    await expect(btn60).toHaveAttribute('aria-pressed', 'true');
    await btn100.click();
    await expect(btn100).toHaveAttribute('aria-pressed', 'true');

    // Close modal
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText('Print Worksheet & Tally Sheet Export')).not.toBeVisible();

    // 8. Zen Mode Toggle
    await page.getByRole('button', { name: 'Focus Mode' }).click();
    await expect(page.getByRole('button', { name: 'Exit Focus' })).toBeVisible();
    await page.getByRole('button', { name: 'Exit Focus' }).click();
    await expect(page.getByRole('button', { name: 'Focus Mode' })).toBeVisible();
  });

  test('E2E-SCN-002: Kenji Mobile Journey - Responsive Touch Capsule & Override', async ({ page }) => {
    // 1. Create drill article
    await page.getByRole('button', { name: 'Create First Drill' }).click();
    await page.getByRole('button', { name: 'Direct Foreign Text' }).click();
    await page.getByPlaceholder('Enter or paste foreign text here...').fill('すみません、お会計をお願いします。');
    await page.getByPlaceholder('Enter drill title (optional)').fill('Japanese Restaurant Checkout');
    await page.getByRole('button', { name: 'Save and Start Drill' }).click();

    // 2. Verify Tactile Capsule Dimensions on Mobile (>= 56px)
    const capsuleBtn = page.getByRole('button', { name: 'Drill +1' });
    await expect(capsuleBtn).toBeVisible();
    const box = await capsuleBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(56);
    }

    // 3. Increment count
    await capsuleBtn.click();
    await expect(page.getByRole('button', { name: 'Adjust Repetition Count' })).toContainText('1 reps');

    // 4. Numeric Override Modal
    await page.getByRole('button', { name: 'Adjust Repetition Count' }).click();
    await expect(page.getByText('Adjust Repetition Count')).toBeVisible();

    const overrideInput = page.locator('input[type="number"]');
    await overrideInput.fill('300');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // 5. Verify calibrated count
    await expect(page.getByRole('button', { name: 'Adjust Repetition Count' })).toContainText('300 reps');
  });

  test('E2E-SCN-003: 100% Offline Shadowing and Data Integrity', async ({ page }) => {
    // 1. Create offline test article
    await page.getByRole('button', { name: 'Create First Drill' }).click();
    await page.getByRole('button', { name: 'Direct Foreign Text' }).click();
    await page.getByPlaceholder('Enter or paste foreign text here...').fill('Offline shadowing fluency');
    await page.getByRole('button', { name: 'Save and Start Drill' }).click();
    await expect(page.getByText('Offline shadowing fluency')).toBeVisible();

    // 2. Simulate complete network disconnection
    await page.context().setOffline(true);

    // 3. Drill repetitions while disconnected
    const capsuleBtn = page.getByRole('button', { name: 'Drill +1' });
    for (let i = 0; i < 5; i++) {
      await capsuleBtn.click();
    }
    await expect(page.getByRole('button', { name: 'Adjust Repetition Count' })).toContainText('5 reps');

    // 4. Undo while disconnected
    const undoBtn = page.getByRole('button', { name: 'Undo last count' });
    await undoBtn.click();
    await expect(page.getByRole('button', { name: 'Adjust Repetition Count' })).toContainText('4 reps');

    // 5. Reconnect network and verify persistence
    await page.context().setOffline(false);
    await page.getByRole('button', { name: 'Back to Library' }).click();
    await expect(page.getByText('4 / 500 reps')).toBeVisible();
  });

  test('E2E-SCN-004: Settings Hub & Atomic Data Purge', async ({ page }) => {
    // 1. Create a dummy article first
    await page.getByRole('button', { name: 'Create First Drill' }).click();
    await page.getByRole('button', { name: 'Direct Foreign Text' }).click();
    await page.getByPlaceholder('Enter or paste foreign text here...').fill('Temporary test text');
    await page.getByRole('button', { name: 'Save and Start Drill' }).click();
    await expect(page.getByText('Temporary test text')).toBeVisible();

    // Return to library
    await page.getByRole('button', { name: 'Back to Library' }).click();
    await expect(page.getByText('Temporary test text')).toBeVisible();

    // 2. Open Settings
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Settings & Integrations')).toBeVisible();

    // 3. Test Danger Zone Purge
    const purgeInput = page.getByPlaceholder('Type DELETE to confirm');
    const purgeBtn = page.getByRole('button', { name: 'Purge All Data' });

    await expect(purgeBtn).toBeDisabled();
    await purgeInput.fill('DELETE');
    await expect(purgeBtn).toBeEnabled();

    await purgeBtn.click();
    await expect(page.getByText('All local data has been permanently cleared.')).toBeVisible();

    // 4. Return to Library and verify clean empty state
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('No Shadowing Drills Yet')).toBeVisible();
  });

  test('E2E-SCN-005: Edit Drill & Archive/Restore Full Lifecycle', async ({ page }) => {
    // 1. Create a drill
    await page.getByRole('button', { name: 'Create First Drill' }).click();
    await page.getByRole('button', { name: 'Direct Foreign Text' }).click();
    await page.getByPlaceholder('Enter drill title (optional)').fill('Lifecycle Drill');
    await page.getByPlaceholder('Enter or paste foreign text here...').fill('Original target sentence.');
    await page.getByRole('button', { name: 'Save and Start Drill' }).click();

    await expect(page.getByText('Lifecycle Drill')).toBeVisible();

    // 2. Perform 3 repetitions
    const drillBtn = page.getByRole('button', { name: 'Drill +1' });
    await drillBtn.click();
    await drillBtn.click();
    await drillBtn.click();
    await expect(page.getByRole('button', { name: 'Adjust Repetition Count' })).toContainText('3 reps');

    // 3. Click Edit from Drill Workspace
    await page.getByRole('button', { name: 'Edit Drill' }).click();
    await expect(page.getByText('Edit Drill')).toBeVisible();
    await expect(page.getByRole('button', { name: 'AI Spoken Translation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Direct Foreign Text' })).toHaveAttribute('aria-pressed', 'true');

    // 4. Modify drill content
    const titleInput = page.getByPlaceholder('Enter drill title (optional)');
    await titleInput.fill('Updated Lifecycle Drill');
    const textInput = page.getByPlaceholder('Enter or paste foreign text here...');
    await textInput.fill('¡Perdona!\n\n¿Sí?\n\n¿Es tu bolso este?');

    // 5. Save Changes
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // 6. Verify DrillWorkspace updated while preserving count and multiline whitespace
    await expect(page.getByText('Updated Lifecycle Drill')).toBeVisible();
    await expect(page.locator('p.whitespace-pre-wrap').first()).toContainText('¡Perdona!\n\n¿Sí?\n\n¿Es tu bolso este?');
    await expect(page.getByRole('button', { name: 'Adjust Repetition Count' })).toContainText('3 reps');

    // 7. Return to Library
    await page.getByRole('button', { name: 'Back to Library' }).click();
    await expect(page.getByText('Updated Lifecycle Drill')).toBeVisible();
    await expect(page.getByText('3 / 500 reps')).toBeVisible();

    // 8. Archive the drill from card
    await page.getByRole('button', { name: 'Archive Updated Lifecycle Drill' }).click();
    await expect(page.getByText('Updated Lifecycle Drill')).not.toBeVisible();

    // 9. Switch to Archived tab
    await page.getByRole('button', { name: 'Archived' }).click();
    await expect(page.getByText('Updated Lifecycle Drill')).toBeVisible();

    // 10. Restore the drill from card
    await page.getByRole('button', { name: 'Restore Updated Lifecycle Drill' }).click();
    await expect(page.getByText('Updated Lifecycle Drill')).not.toBeVisible();
    await expect(page.getByText('No Archived Drills')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create First Drill' })).not.toBeVisible();

    // 11. Switch back to Active tab and verify drill restored with count intact
    await page.getByRole('button', { name: 'Active' }).click();
    await expect(page.getByText('Updated Lifecycle Drill')).toBeVisible();
    await expect(page.getByText('3 / 500 reps')).toBeVisible();
  });

  test('E2E-SCN-003: Foreign Word Selection and Definition Lookup Flow', async ({ page }) => {
    // 1. Create drill with foreign text
    await page.getByRole('button', { name: 'Create First Drill' }).click();
    await page.getByRole('button', { name: 'Direct Foreign Text' }).click();
    await page.getByPlaceholder('Enter drill title (optional)').fill('Restaurant Dialogue');
    await page.getByPlaceholder('Enter or paste foreign text here...').fill('¿Nos cobras, por favor?');
    await page.getByRole('button', { name: 'Save and Start Drill' }).click();

    await expect(page.getByText('Restaurant Dialogue')).toBeVisible();
    await expect(page.getByText('¿Nos cobras, por favor?')).toBeVisible();

    // 2. Seed cached word lookup in IndexedDB
    await page.evaluate(async () => {
      return new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('TalkDrillDB');
        req.onsuccess = () => {
          const idb = req.result;
          const tx = idb.transaction('wordLookups', 'readwrite');
          const store = tx.objectStore('wordLookups');
          store.put({
            text: 'cobras',
            lang: 'es-ES',
            ipa: '/ˈko.βɾas/',
            partOfSpeech: 'verb',
            translation: 'to charge / collect payment',
            contextNote: 'Informal present indicative',
            timestamp: Date.now(),
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    });

    // 3. Trigger text selection on 'cobras'
    await page.evaluate(() => {
      const targetEl = document.querySelector('p.select-text');
      if (targetEl && targetEl.firstChild) {
        const range = document.createRange();
        // Select 'cobras' (characters 5 to 11 in '¿Nos cobras, por favor?')
        range.setStart(targetEl.firstChild, 5);
        range.setEnd(targetEl.firstChild, 11);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        targetEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      }
    });

    // 4. Verify WordLookupPopover is rendered with IPA, translation, and Cached badge
    const dialog = page.getByRole('dialog', { name: 'Word Definition' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('cobras')).toBeVisible();
    await expect(dialog.getByText('/ˈko.βɾas/')).toBeVisible();
    await expect(dialog.getByText('to charge / collect payment')).toBeVisible();
    await expect(dialog.getByText('Cached')).toBeVisible();

    // 5. Test audio pronunciation speaker button
    const speakerBtn = dialog.getByRole('button', { name: 'Listen to pronunciation' });
    await expect(speakerBtn).toBeVisible();
    await speakerBtn.click();

    // 6. Dismiss popover upon clicking Drill +1 capsule
    const drillCapsuleBtn = page.getByRole('button', { name: 'Drill +1' });
    await drillCapsuleBtn.click();
    await expect(dialog).not.toBeVisible();
  });
});

