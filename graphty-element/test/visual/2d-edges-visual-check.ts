/**
 * Visual regression check for 2D edge rendering
 *
 * This script captures screenshots from 2D edge stories and can be used
 * to manually verify that 2D edges render correctly with world-space scaling.
 *
 * Usage:
 *   npx tsx test/visual/2d-edges-visual-check.ts
 *
 * The script will:
 * 1. Capture screenshots of 2D solid, patterned, and arrow stories
 * 2. Capture before/after zoom screenshots to demonstrate world-space scaling
 * 3. Save all screenshots to the tmp/ directory
 * 4. Report success/failure based on whether screenshots were captured
 */

import { resolve } from "path";
import { type Browser, chromium, type Page } from "playwright";

const STORYBOOK_URL = process.env.STORYBOOK_URL ?? "https://localhost:6006";
const TMP_DIR = resolve(process.cwd(), "tmp");

/**
 * Wait until the element has drawn its finished picture: data loaded, layout converged, camera
 * framed. The element waits for the custom element to upgrade first.
 * @param page - The story page.
 */
async function waitForStablePicture(page: Page): Promise<void> {
    await page.waitForFunction(() => {
        const elem = document.querySelector("graphty-element") as { waitForStableFrame?: unknown } | null;
        return typeof elem?.waitForStableFrame === "function";
    });
    await page.evaluate(async () => {
        const elem = document.querySelector("graphty-element") as unknown as {
            waitForStableFrame: () => Promise<void>;
        };
        await elem.waitForStableFrame();
    });
}

/**
 * Wait until the camera has stopped moving: two drawn frames in a row with the camera in the
 * same place. A camera the reader moved keeps drifting under inertia for a few frames.
 * @param page - The story page.
 */
async function waitForCameraAtRest(page: Page): Promise<void> {
    await page.evaluate(() => {
        (window as { lastCameraKey?: string }).lastCameraKey = undefined;
    });
    await page.waitForFunction(
        () => {
            const elem = document.querySelector("graphty-element") as {
                graph?: { scene: { activeCamera: { position: { x: number; y: number; z: number } } | null } };
            } | null;
            const position = elem?.graph?.scene.activeCamera?.position;
            if (!position) {
                return false;
            }

            const key = `${String(position.x)},${String(position.y)},${String(position.z)}`;
            const state = window as { lastCameraKey?: string };
            const still = state.lastCameraKey === key;
            state.lastCameraKey = key;
            return still;
        },
        undefined,
        { polling: "raf" },
    );
}

async function captureStory(page: Page, storyId: string, filename: string): Promise<void> {
    const storyUrl = `${STORYBOOK_URL}/iframe.html?id=${storyId}&viewMode=story`;
    await page.goto(storyUrl, { waitUntil: "networkidle" });

    // Wait for component to load
    await page.waitForSelector("graphty-element", { timeout: 10000 });
    await waitForStablePicture(page);

    // Take screenshot
    const canvas = page.locator("canvas");
    const screenshotPath = resolve(TMP_DIR, filename);
    await canvas.screenshot({ path: screenshotPath });

    console.log(`  ✓ Captured: ${filename}`);
}

async function checkZoomBehavior(page: Page): Promise<void> {
    const storyUrl = `${STORYBOOK_URL}/iframe.html?id=styles-edge--two-d-solid-lines&viewMode=story`;
    await page.goto(storyUrl, { waitUntil: "networkidle" });

    await page.waitForSelector("graphty-element", { timeout: 10000 });
    await waitForStablePicture(page);

    // Capture before zoom
    const canvas = page.locator("canvas");
    await canvas.screenshot({
        path: resolve(TMP_DIR, "2d-zoom-before.png"),
    });
    console.log("  ✓ Captured: 2d-zoom-before.png");

    // Zoom in
    await page.evaluate(() => {
        const elem = document.querySelector("graphty-element") as {
            graph?: { camera: { radius: number } };
        } | null;
        if (elem?.graph?.camera) {
            elem.graph.camera.radius *= 0.5; // Zoom in 2x
        }
    });

    await waitForCameraAtRest(page);

    // Capture after zoom
    await canvas.screenshot({
        path: resolve(TMP_DIR, "2d-zoom-after.png"),
    });
    console.log("  ✓ Captured: 2d-zoom-after.png");
}

async function main(): Promise<void> {
    console.log("Starting 2D edge visual regression check...\n");

    const browser: Browser = await chromium.launch({ headless: true });
    const page: Page = await browser.newPage();

    try {
        console.log("1. Testing 2D solid edges:");
        await captureStory(page, "styles-edge--two-d-solid-lines", "2d-solid-edges.png");

        console.log("\n2. Testing 2D patterned edges:");
        await captureStory(page, "styles-edge--two-d-patterned-lines", "2d-patterned-edges.png");

        console.log("\n3. Testing 2D arrow heads:");
        await captureStory(page, "styles-edge--two-d-normal-arrow-head", "2d-arrow-head.png");

        console.log("\n4. Testing world-space zoom behavior:");
        await checkZoomBehavior(page);

        console.log("\n✅ All visual checks completed successfully!");
        console.log(`\nScreenshots saved in: ${TMP_DIR}`);
        console.log("\nNext steps:");
        console.log("1. Review images in tmp/ directory");
        console.log("2. Verify edges render correctly");
        console.log("3. Compare zoom-before and zoom-after to verify world-space scaling");
    } catch (error) {
        console.error("\n❌ Visual check failed:", error);
        throw error;
    } finally {
        await browser.close();
    }
}

main().catch((error: unknown) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
