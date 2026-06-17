"""
Playwright screenshot script for the MT12 Configurator user manual.
Run: python3 scripts/screenshot-manual.py
Requires dev server at http://localhost:5173
"""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, Page

BASE = "http://localhost:5173"
OUT = Path(__file__).parent.parent / "docs" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)


async def ss(page: Page, filename: str, full_page: bool = False):
    path = str(OUT / filename)
    await page.screenshot(path=path, full_page=full_page)
    print(f"  ✓ {filename}")


async def close_modal(page: Page):
    """Close any open modal by clicking its Close button."""
    close_btn = page.locator("button", has_text="Close").last
    if await close_btn.is_visible():
        await close_btn.click()
        await page.wait_for_timeout(400)


async def wait_for_demo(page: Page):
    """Wait for demo mode to load at least one Edit button (model card)."""
    await page.locator("button.btn-primary", has_text="Edit").first.wait_for(state="visible", timeout=15000)
    await page.wait_for_timeout(400)


async def go_to_editor(page: Page, index: int = 0):
    """Click an Edit button (force to bypass image hover) and wait for the editor."""
    # Use force=True to bypass the image hover CSS transform that intercepts clicks
    await page.locator("button.btn-primary", has_text="Edit").nth(index).click(force=True)
    await page.locator("button", has_text="Advanced").first.wait_for(state="visible", timeout=10000)
    await page.wait_for_timeout(500)


async def go_to_list(page: Page, leave_changes: bool = False):
    """Navigate back to model list via ← Back button."""
    await page.locator("button", has_text="← Back").first.click()
    await page.wait_for_timeout(400)
    if leave_changes:
        leave_btn = page.locator("button", has_text="Leave")
        if await leave_btn.is_visible():
            await leave_btn.click()
            await page.wait_for_timeout(400)
    # Wait for model list
    await wait_for_demo(page)


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await ctx.new_page()

        # ── 1. No SD card state ──────────────────────────────────────────────
        print("\n[1] No SD card — model list")
        await page.goto(BASE)
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(500)
        await ss(page, "01-model-list-no-sdcard.png")

        # ── 2. Demo mode — model list ─────────────────────────────────────────
        print("\n[2] Demo mode — model list")
        await page.goto(f"{BASE}?demo")
        await page.wait_for_load_state("networkidle")
        await wait_for_demo(page)
        await ss(page, "02-model-list-demo.png")

        # ── 3. About modal ────────────────────────────────────────────────────
        print("\n[3] About modal")
        await page.locator("header button", has_text="About").click()
        await page.wait_for_timeout(500)
        await ss(page, "03-about-modal.png")
        await close_modal(page)

        # ── 4. Help modal ─────────────────────────────────────────────────────
        print("\n[4] Help modal")
        await page.locator("header button", has_text="Help").click()
        await page.wait_for_timeout(500)
        await ss(page, "04-help-modal.png")
        await close_modal(page)

        # ── 5. Model card with actions visible ───────────────────────────────
        print("\n[5] Model card actions")
        # Screenshot the model list showing all action buttons (always visible)
        await ss(page, "05-model-card-actions.png")

        # ── 6. Open editor — Basic view (model 1: TRX-4M) ─────────────────────
        print("\n[6] Editor — Basic view (TRX-4M / model00)")
        await go_to_editor(page, 0)
        await ss(page, "06-editor-basic-view.png")

        # The diagram panel is on the right side of the editor
        await ss(page, "07-editor-basic-view-with-diagram.png")

        # ── 7. Setup wizard — re-run on existing model ────────────────────────
        print("\n[7] Setup wizard — all 9 steps")
        rerun_btn = page.locator("button", has_text="setup wizard")
        await rerun_btn.scroll_into_view_if_needed()
        await page.wait_for_timeout(300)
        await rerun_btn.click()
        await page.wait_for_timeout(600)
        await ss(page, "08-wizard-01-vehicle-step.png")

        next_btn = page.locator("button", has_text="Next →")
        step_files = [
            "09-wizard-02-radio-step.png",
            "10-wizard-03-throttle-step.png",
            "11-wizard-04-cruise-step.png",
            "12-wizard-05-speed-limiter-step.png",
            "13-wizard-06-steering-step.png",
            "14-wizard-07-gyro-step.png",
            "15-wizard-08-kidcontrol-step.png",
            "16-wizard-09-confirm-step.png",
        ]
        for fname in step_files:
            await next_btn.click()
            await page.wait_for_timeout(400)
            await ss(page, fname)

        # Cancel the wizard (we don't want to apply changes)
        cancel_btn = page.locator("button", has_text="Cancel")
        if await cancel_btn.is_visible():
            await cancel_btn.click()
        await page.wait_for_timeout(400)

        # ── 8. Advanced view — Module tab ─────────────────────────────────────
        print("\n[8] Advanced view — all tabs")
        advanced_btn = page.locator("button", has_text="Advanced").first
        await advanced_btn.click()
        await page.wait_for_timeout(600)
        await ss(page, "17-advanced-01-module.png")

        tab_map = [
            ("Timers",      "18-advanced-02-timers.png"),
            ("Drive Modes", "19-advanced-03-drive-modes.png"),
            ("Mixes",       "20-advanced-04-mixes.png"),
            ("Expos",       "21-advanced-05-expos.png"),
            ("Limits",      "22-advanced-06-limits.png"),
            ("Logical Sw",  "23-advanced-07-logical-sw.png"),
            ("Special Fn",  "24-advanced-08-special-fn.png"),
            ("KidControl",  "25-advanced-09-kidcontrol.png"),
        ]
        for tab_text, fname in tab_map:
            await page.get_by_text(tab_text, exact=True).first.click()
            await page.wait_for_timeout(400)
            await ss(page, fname)

        # ── 9. KidControl wizard ──────────────────────────────────────────────
        print("\n[9] KidControl wizard (via Basic view '+ Set up KidControl' button)")
        # Switch to Basic view
        await page.locator("button", has_text="Basic").first.click()
        await page.wait_for_timeout(500)

        # Find '+ Set up KidControl' button in basic view and scroll to it
        kid_btn = page.locator("button", has_text="Set up KidControl")
        if await kid_btn.is_visible():
            await kid_btn.scroll_into_view_if_needed()
            await page.wait_for_timeout(200)
            await kid_btn.click()
            await page.wait_for_timeout(500)

            type_cards = page.locator("[class*='typeCard']")
            n = await type_cards.count()
            print(f"  {n} vehicle type cards found")

            if n > 0:
                await ss(page, "26-kidcontrol-01-vehicle-step.png")
                await type_cards.first.click()
                await page.wait_for_timeout(500)
                await ss(page, "27-kidcontrol-02-speed-step.png")

                speed_cards = page.locator("[class*='speedCard']")
                sc = await speed_cards.count()
                print(f"  {sc} speed class cards found")
                if sc > 0:
                    await speed_cards.first.click()
                    await page.wait_for_timeout(500)
                    await ss(page, "28-kidcontrol-03-sliders-step.png")

                    apply_btn = page.locator("button", has_text="Apply KidControl")
                    if await apply_btn.is_visible():
                        await apply_btn.click()
                        await page.wait_for_timeout(600)
                        await ss(page, "29-kidcontrol-04-active-advanced.png")
            else:
                print("  ⚠ No vehicle type cards (KidControl wizard may be at speed step already)")
                await ss(page, "26-kidcontrol-wizard-speed-step.png")
                speed_cards2 = page.locator("[class*='speedCard']")
                if await speed_cards2.count() > 0:
                    await speed_cards2.first.click()
                    await page.wait_for_timeout(500)
                    await ss(page, "28-kidcontrol-03-sliders-step.png")
                    apply_btn2 = page.locator("button", has_text="Apply KidControl")
                    if await apply_btn2.is_visible():
                        await apply_btn2.click()
                        await page.wait_for_timeout(600)
                        await ss(page, "29-kidcontrol-04-active-advanced.png")
        else:
            print("  ⚠ '+ Set up KidControl' button not found in Basic view")
            # Maybe KidControl is already active — screenshot it
            await ss(page, "26-kidcontrol-already-active.png")

        # ── 10. Basic view with KidControl active ─────────────────────────────
        print("\n[10] Basic view — KidControl active summary")
        basic_toggle = page.locator("button", has_text="Basic").first
        await basic_toggle.click()
        await page.wait_for_timeout(500)
        await ss(page, "30-basic-kidcontrol-active.png")

        # ── 11. Unsaved changes / leave dialog ────────────────────────────────
        print("\n[11] Unsaved changes dialog")
        # Make the model explicitly dirty by modifying the model name in the top bar
        name_input = page.locator("input[class*='nameInput']").first
        if not await name_input.is_visible():
            # Switch to basic view to access the name input
            basic_btn2 = page.locator("button", has_text="Basic").first
            if await basic_btn2.is_visible():
                await basic_btn2.click()
                await page.wait_for_timeout(400)
            name_input = page.locator("input[class*='nameInput']").first
        if await name_input.is_visible():
            await name_input.click()
            await name_input.press("End")
            await name_input.type("X")  # Append X to make it dirty
            await page.wait_for_timeout(300)

        # Try to navigate away — should trigger leave dialog
        back_btn = page.locator("button", has_text="← Back").first
        if await back_btn.is_visible():
            await back_btn.click()
            await page.wait_for_timeout(500)
            leave_dialog = page.locator("[class*='leaveDialog']")
            if await leave_dialog.is_visible():
                await ss(page, "31-unsaved-changes-dialog.png")
                await page.locator("button", has_text="Stay").click()
                await page.wait_for_timeout(400)
            else:
                print("  ⚠ Leave dialog not triggered even with dirty model")
        else:
            print("  ← Back button not visible")

        # ── 12. Navigate to model list ────────────────────────────────────────
        print("\n[12] Navigate back to model list")
        # Check if we're already on the list
        if await page.locator("button", has_text="← Back").is_visible():
            # Still in editor — navigate out (leave any changes)
            await page.locator("button", has_text="← Back").first.click()
            await page.wait_for_timeout(400)
            leave_btn = page.locator("button", has_text="Leave")
            if await leave_btn.is_visible():
                await leave_btn.click()
                await page.wait_for_timeout(400)
        # Wait for model list to be ready
        await wait_for_demo(page)
        await ss(page, "32-model-list-with-models.png")

        # ── 13. Delete confirmation dialog ────────────────────────────────────
        print("\n[13] Delete confirmation")
        delete_btns = page.locator("button.btn-danger", has_text="Delete")
        cnt = await delete_btns.count()
        print(f"  {cnt} delete buttons")
        if cnt > 0:
            await delete_btns.first.click()
            await page.wait_for_timeout(500)
            await ss(page, "33-delete-confirm-dialog.png")
            cancel_btn = page.locator("button", has_text="Cancel").last
            if await cancel_btn.is_visible():
                await cancel_btn.click()
            await page.wait_for_timeout(400)

        # ── 14. Backup history (per model) ────────────────────────────────────
        print("\n[14] Backup history — per model")
        # Open first model, save it (creates a backup), then view history
        await go_to_editor(page, 0)
        save_btn = page.locator("button", has_text="Save").first
        if await save_btn.is_visible():
            await save_btn.click()
            await page.wait_for_timeout(800)
        await go_to_list(page)

        history_btns = page.locator("button", has_text="History")
        cnt_h = await history_btns.count()
        print(f"  {cnt_h} history buttons")
        if cnt_h > 0:
            await history_btns.first.click()
            await page.wait_for_timeout(700)
            await ss(page, "34-backup-history-modal.png")
            await close_modal(page)

        # ── 15. Manage backups (all models) ──────────────────────────────────
        print("\n[15] Manage backups — all models")
        manage_btn = page.locator("button", has_text="Manage backups").first
        if await manage_btn.is_visible():
            await manage_btn.click()
            await page.wait_for_timeout(700)
            await ss(page, "35-manage-backups-modal.png")
            await close_modal(page)

        # ── 16. Radio Settings — all tabs ────────────────────────────────────
        print("\n[16] Radio Settings")
        await page.locator("header button", has_text="Radio Settings").click()
        await page.wait_for_timeout(1000)
        await ss(page, "36-radio-settings-audio.png")

        for tab_text, fname in [
            ("Display",  "37-radio-settings-display.png"),
            ("Switches", "38-radio-settings-switches.png"),
            ("Pots",     "39-radio-settings-pots.png"),
        ]:
            await page.get_by_text(tab_text, exact=True).first.click()
            await page.wait_for_timeout(400)
            await ss(page, fname)

        # Full-page (scroll to show all)
        await page.get_by_text("Audio", exact=True).first.click()
        await page.wait_for_timeout(300)
        await ss(page, "40-radio-settings-full.png", full_page=True)

        # ── 17. Vehicle Types ─────────────────────────────────────────────────
        print("\n[17] Vehicle Types")
        await page.locator("header button", has_text="Vehicle Types").click()
        await page.wait_for_timeout(600)
        await ss(page, "41-vehicle-types.png")
        await ss(page, "42-vehicle-types-full.png", full_page=True)

        # ── 18. Second model (HyperGo — already has KidControl) ──────────────
        print("\n[18] Second model — HyperGo 14303")
        await page.goto(f"{BASE}?demo")
        await page.wait_for_load_state("networkidle")
        await wait_for_demo(page)

        cnt3 = await page.locator("button.btn-primary", has_text="Edit").count()
        print(f"  {cnt3} Edit buttons")
        if cnt3 >= 2:
            await go_to_editor(page, 1)
            await ss(page, "43-editor-basic-view-model2.png")

            # Advanced view with real data
            await page.locator("button", has_text="Advanced").first.click()
            await page.wait_for_timeout(600)
            await ss(page, "44-advanced-module-model2.png")

            for tab_text, fname in [
                ("Mixes",       "45-advanced-mixes-model2.png"),
                ("Expos",       "46-advanced-expos-model2.png"),
                ("Limits",      "47-advanced-limits-model2.png"),
                ("KidControl",  "48-advanced-kidcontrol-active.png"),
            ]:
                await page.get_by_text(tab_text, exact=True).first.click()
                await page.wait_for_timeout(400)
                await ss(page, fname)

        # ── 19. New model wizard (fresh, no initial params) ───────────────────
        print("\n[19] New model wizard — fresh setup")
        await go_to_list(page, leave_changes=False)

        new_model_btn = page.locator("button", has_text="New model").first
        await new_model_btn.click()
        await page.locator("button", has_text="Advanced").first.wait_for(state="visible", timeout=10000)
        await page.wait_for_timeout(600)
        await ss(page, "49-new-model-wizard-vehicle-fresh.png")

        next_btn2 = page.locator("button", has_text="Next →")
        if await next_btn2.is_visible():
            await next_btn2.click()
            await page.wait_for_timeout(400)
            await ss(page, "50-new-model-wizard-radio-fresh.png")

        print("\n✅ All screenshots complete!")
        await browser.close()


asyncio.run(main())
