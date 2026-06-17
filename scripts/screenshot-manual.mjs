/**
 * Playwright screenshot script for the MT12 Configurator user manual.
 * Run: node scripts/screenshot-manual.mjs
 * Requires the dev server to be running at http://localhost:5173
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
const BASE = 'http://localhost:5173';

async function ss(page, filename, opts = {}) {
  const fullPath = path.join(OUT, filename);
  await page.screenshot({ path: fullPath, fullPage: opts.fullPage ?? false, ...opts });
  console.log(`  ✓ ${filename}`);
}

async function waitReady(page) {
  await page.waitForLoadState('networkidle');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ── 1. No SD card state ────────────────────────────────────────────────────
  console.log('\n[1] No SD card state');
  await page.goto(BASE);
  await waitReady(page);
  await page.waitForTimeout(500);
  await ss(page, '01-model-list-no-sdcard.png');

  // ── 2. Demo mode — model list ──────────────────────────────────────────────
  console.log('\n[2] Demo mode — model list');
  await page.goto(`${BASE}?demo`);
  await waitReady(page);
  await page.waitForTimeout(1500); // let demo SD card connect and models load
  await ss(page, '02-model-list-demo.png');

  // ── 3. Settings modal ──────────────────────────────────────────────────────
  console.log('\n[3] Settings modal');
  // Settings button — look for ⚙ or "Settings" in header
  const settingsBtn = page.locator('header button', { hasText: /settings/i }).first();
  // The settings modal might be opened via About or a gear icon
  // Look at the header buttons more carefully
  const headerBtns = await page.locator('header button').allTextContents();
  console.log('  Header buttons:', headerBtns);

  // ── 4. About modal ─────────────────────────────────────────────────────────
  console.log('\n[4] About modal');
  const aboutBtn = page.locator('header button', { hasText: /about/i });
  if (await aboutBtn.isVisible()) {
    await aboutBtn.click();
    await page.waitForTimeout(400);
    await ss(page, '04-about-modal.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // ── 5. Help modal ──────────────────────────────────────────────────────────
  console.log('\n[5] Help modal');
  const helpBtn = page.locator('header button', { hasText: /help/i });
  if (await helpBtn.isVisible()) {
    await helpBtn.click();
    await page.waitForTimeout(400);
    await ss(page, '05-help-modal.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // ── 6. Model card actions ──────────────────────────────────────────────────
  console.log('\n[6] Model card actions');
  // Hover first model card to show actions, then screenshot
  const firstCard = page.locator('[class*="modelCard"], [class*="card"]').first();
  if (await firstCard.isVisible()) {
    await firstCard.hover();
    await page.waitForTimeout(300);
    await ss(page, '06-model-card-actions.png');
  }

  // ── 7. Open first model — editor basic view ────────────────────────────────
  console.log('\n[7] Editor — Basic view');
  // Click Edit on first model
  const editBtns = page.locator('button', { hasText: /^edit$/i });
  const editCount = await editBtns.count();
  console.log(`  Found ${editCount} Edit buttons`);
  if (editCount > 0) {
    await editBtns.first().click();
    await waitReady(page);
    await page.waitForTimeout(800);
    await ss(page, '07-editor-basic-view.png');
  }

  // ── 8. Basic view with diagram ─────────────────────────────────────────────
  console.log('\n[8] Editor — Basic view diagram');
  // The diagram toggle
  const diagramToggle = page.locator('button', { hasText: /diagram|labels|functions/i }).first();
  if (await diagramToggle.isVisible()) {
    await ss(page, '08-editor-basic-view-diagram.png');
  } else {
    // Try scrolling right / check if diagram is already shown
    await ss(page, '08-editor-basic-view-diagram.png');
  }

  // ── 9. Setup wizard ────────────────────────────────────────────────────────
  console.log('\n[9] Setup wizard — navigating to new model');
  // Go back to list to create a new model
  const titleBtn = page.locator('button[class*="title"], button', { hasText: /edgetx editor|mt12/i }).first();
  await titleBtn.click();
  await waitReady(page);
  await page.waitForTimeout(500);

  // Click "+ New model"
  const newModelCard = page.locator('button, [class*="card"]', { hasText: /new model/i }).first();
  if (await newModelCard.isVisible()) {
    await newModelCard.click();
    await waitReady(page);
    await page.waitForTimeout(800);
    await ss(page, '09-wizard-vehicle-step.png');

    // Fill model name
    const nameInput = page.locator('input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Demo Car');
    }

    // Next to radio link step
    const nextBtn = page.locator('button', { hasText: /next|continue/i }).first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(400);
      await ss(page, '10-wizard-radio-step.png');

      await nextBtn.click();
      await page.waitForTimeout(400);
      await ss(page, '11-wizard-throttle-step.png');

      await nextBtn.click();
      await page.waitForTimeout(400);
      await ss(page, '12-wizard-cruise-step.png');

      await nextBtn.click();
      await page.waitForTimeout(400);
      await ss(page, '13-wizard-speed-limiter-step.png');

      await nextBtn.click();
      await page.waitForTimeout(400);
      await ss(page, '14-wizard-steering-step.png');

      await nextBtn.click();
      await page.waitForTimeout(400);
      await ss(page, '15-wizard-gyro-step.png');

      await nextBtn.click();
      await page.waitForTimeout(400);
      await ss(page, '16-wizard-kidcontrol-step.png');

      await nextBtn.click();
      await page.waitForTimeout(400);
      await ss(page, '17-wizard-confirm-step.png');
    }
  }

  // ── 10. Go back to demo and open first model for full screenshots ──────────
  console.log('\n[10] Re-open demo first model');
  await page.goto(`${BASE}?demo`);
  await waitReady(page);
  await page.waitForTimeout(1500);

  const editBtns2 = page.locator('button', { hasText: /^edit$/i });
  if (await editBtns2.count() > 0) {
    await editBtns2.first().click();
    await waitReady(page);
    await page.waitForTimeout(800);
  }

  // ── 11. Switch to Advanced view ────────────────────────────────────────────
  console.log('\n[11] Advanced view tabs');
  const advancedBtn = page.locator('button', { hasText: /advanced/i }).first();
  if (await advancedBtn.isVisible()) {
    await advancedBtn.click();
    await page.waitForTimeout(500);
    await ss(page, '18-advanced-module.png');

    // Tab through each advanced tab
    const tabs = ['Timers', 'Drive Modes', 'Mixes', 'Expos', 'Limits', 'Logical Sw', 'Special Fn', 'KidControl'];
    const fileNames = ['19-advanced-timers', '20-advanced-drive-modes', '21-advanced-mixes',
      '22-advanced-expos', '23-advanced-limits', '24-advanced-logical-sw',
      '25-advanced-special-fn', '26-advanced-kidcontrol'];

    for (let i = 0; i < tabs.length; i++) {
      const tabBtn = page.locator('[role="tab"], button[class*="tab"]', { hasText: tabs[i] }).first();
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await page.waitForTimeout(400);
        await ss(page, `${fileNames[i]}.png`);
      } else {
        // Try by text content in tab bar
        const anyTab = page.getByText(tabs[i], { exact: true }).first();
        if (await anyTab.isVisible()) {
          await anyTab.click();
          await page.waitForTimeout(400);
          await ss(page, `${fileNames[i]}.png`);
        } else {
          console.log(`  ⚠ Tab "${tabs[i]}" not found`);
        }
      }
    }
  }

  // ── 12. KidControl wizard from Advanced view ───────────────────────────────
  console.log('\n[12] KidControl wizard');
  // Should be on KidControl tab — click Set up KidControl or similar
  const kidSetupBtn = page.locator('button', { hasText: /set up kidcontrol|kidcontrol wizard/i }).first();
  if (await kidSetupBtn.isVisible()) {
    await kidSetupBtn.click();
    await page.waitForTimeout(400);
    await ss(page, '27-kidcontrol-wizard-vehicle.png');

    // Click first vehicle type card
    const vehicleCard = page.locator('[class*="typeCard"]').first();
    if (await vehicleCard.isVisible()) {
      await vehicleCard.click();
      await page.waitForTimeout(400);
      await ss(page, '28-kidcontrol-wizard-speed.png');

      // Click first speed card
      const speedCard = page.locator('[class*="speedCard"]').first();
      if (await speedCard.isVisible()) {
        await speedCard.click();
        await page.waitForTimeout(400);
        await ss(page, '29-kidcontrol-wizard-sliders.png');
      }
    }
  }

  // ── 13. Apply KidControl, screenshot active state ──────────────────────────
  console.log('\n[13] KidControl active state');
  const applyBtn = page.locator('button', { hasText: /apply kidcontrol/i }).first();
  if (await applyBtn.isVisible()) {
    await applyBtn.click();
    await page.waitForTimeout(500);
    await ss(page, '30-kidcontrol-active.png');
  }

  // Back to basic view to show kid control active summary
  const basicBtn = page.locator('button', { hasText: /basic/i }).first();
  if (await basicBtn.isVisible()) {
    await basicBtn.click();
    await page.waitForTimeout(400);
    await ss(page, '31-basic-kidcontrol-active.png');
  }

  // ── 14. Unsaved changes dialog ─────────────────────────────────────────────
  console.log('\n[14] Unsaved changes dialog');
  // Navigate away with unsaved changes
  const titleBtn2 = page.locator('button[class*="title"]').first();
  if (await titleBtn2.isVisible()) {
    await titleBtn2.click();
    await page.waitForTimeout(400);
    // Dialog should appear
    const leaveDialog = page.locator('[class*="leaveDialog"], [class*="dialog"]').first();
    if (await leaveDialog.isVisible()) {
      await ss(page, '32-unsaved-changes-dialog.png');
      // Click Stay to dismiss
      const stayBtn = page.locator('button', { hasText: /stay/i }).first();
      if (await stayBtn.isVisible()) {
        await stayBtn.click();
        await page.waitForTimeout(300);
      }
    }
  }

  // ── 15. Delete confirmation dialog ────────────────────────────────────────
  console.log('\n[15] Delete confirmation dialog');
  // Navigate away (leave) to model list
  const titleBtn3 = page.locator('button[class*="title"]').first();
  await titleBtn3.click();
  await page.waitForTimeout(400);
  const leaveBtn = page.locator('button', { hasText: /leave/i }).first();
  if (await leaveBtn.isVisible()) {
    await leaveBtn.click();
    await page.waitForTimeout(500);
  }
  await waitReady(page);
  await page.waitForTimeout(500);

  // Click Delete on a model
  const deleteBtn = page.locator('button', { hasText: /^delete$/i }).first();
  if (await deleteBtn.isVisible()) {
    await deleteBtn.click();
    await page.waitForTimeout(400);
    await ss(page, '33-delete-confirm-dialog.png');
    // Cancel
    const cancelBtn = page.locator('button', { hasText: /cancel|no/i }).first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(300);
  }

  // ── 16. Backup History modal ────────────────────────────────────────────────
  console.log('\n[16] Backup History modal');
  const historyBtn = page.locator('button', { hasText: /history/i }).first();
  if (await historyBtn.isVisible()) {
    await historyBtn.click();
    await page.waitForTimeout(500);
    await ss(page, '34-backup-history.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // ── 17. Manage backups ──────────────────────────────────────────────────────
  console.log('\n[17] Manage backups modal');
  const manageBackupsBtn = page.locator('button', { hasText: /manage backup/i }).first();
  if (await manageBackupsBtn.isVisible()) {
    await manageBackupsBtn.click();
    await page.waitForTimeout(500);
    await ss(page, '35-manage-backups.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // ── 18. Radio Settings page ─────────────────────────────────────────────────
  console.log('\n[18] Radio Settings page');
  const radioBtn = page.locator('button', { hasText: /radio settings/i }).first();
  if (await radioBtn.isVisible()) {
    await radioBtn.click();
    await waitReady(page);
    await page.waitForTimeout(800);
    await ss(page, '36-radio-settings-top.png');

    // Scroll down to see more sections
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
    await ss(page, '37-radio-settings-audio.png');

    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(300);
    await ss(page, '38-radio-settings-switches.png');

    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(300);
    await ss(page, '39-radio-settings-pots.png');

    // Full page
    await page.evaluate(() => window.scrollTo(0, 0));
    await ss(page, '40-radio-settings-full.png', { fullPage: true });
  }

  // ── 19. Vehicle Types page ──────────────────────────────────────────────────
  console.log('\n[19] Vehicle Types page');
  const vtBtn = page.locator('button', { hasText: /vehicle types/i }).first();
  if (await vtBtn.isVisible()) {
    await vtBtn.click();
    await waitReady(page);
    await page.waitForTimeout(500);
    await ss(page, '41-vehicle-types.png');
    await ss(page, '42-vehicle-types-full.png', { fullPage: true });
  }

  // ── 20. Settings / About modal from main header ─────────────────────────────
  console.log('\n[20] Settings modal');
  // Go back to list
  const titleBtn4 = page.locator('button[class*="title"]').first();
  if (await titleBtn4.isVisible()) {
    await titleBtn4.click();
    await page.waitForTimeout(400);
  } else {
    await page.goto(`${BASE}?demo`);
    await waitReady(page);
    await page.waitForTimeout(1500);
  }

  // Check for Settings button (gear icon or "Settings" text in header)
  const allHeaderBtns = await page.locator('header button').allTextContents();
  console.log('  All header buttons:', allHeaderBtns);

  // ── 21. Second model editor — check advanced view with data ─────────────────
  console.log('\n[21] Second model — advanced view with data');
  await page.goto(`${BASE}?demo`);
  await waitReady(page);
  await page.waitForTimeout(1500);

  // Edit second model
  const editBtns3 = page.locator('button', { hasText: /^edit$/i });
  const cnt = await editBtns3.count();
  if (cnt >= 2) {
    await editBtns3.nth(1).click();
    await waitReady(page);
    await page.waitForTimeout(800);
    await ss(page, '43-editor-basic-view-model2.png');

    const advBtn2 = page.locator('button', { hasText: /advanced/i }).first();
    if (await advBtn2.isVisible()) {
      await advBtn2.click();
      await page.waitForTimeout(500);
      await ss(page, '44-advanced-module-model2.png');

      const mixesTab = page.getByText('Mixes', { exact: true }).first();
      if (await mixesTab.isVisible()) {
        await mixesTab.click();
        await page.waitForTimeout(400);
        await ss(page, '45-advanced-mixes-model2.png');
      }

      const exposTab = page.getByText('Expos', { exact: true }).first();
      if (await exposTab.isVisible()) {
        await exposTab.click();
        await page.waitForTimeout(400);
        await ss(page, '46-advanced-expos-model2.png');
      }
    }
  }

  console.log('\n✅ Screenshots complete');
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
