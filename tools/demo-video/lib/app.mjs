/**
 * Setup steps clips share. These run BEFORE recording starts, so they click straight through
 * Playwright (fast, no human pacing) -- but still only through the app's own UI, never its code.
 */

/**
 * The start page is up; the usage-data question is answered No thanks.
 * @param page - the Playwright page
 */
export async function start(page) {
    await page.getByRole("button", { name: /^Open a file/ }).waitFor();
    await page.getByRole("button", { name: "No thanks" }).click();
    // answering shows "Usage data stays off" in the corner: close it so it is in no shot
    await usageNote(page).waitFor();
    await closeToast(page);
}

const usageNote = (page) => page.getByRole("paragraph").filter({ hasText: "Usage data stays off." }).first();

/**
 * Wait until an opened graph is in: the Everything layer counts its nodes.
 * @param page - the Playwright page
 */
export async function opened(page) {
    await page.getByRole("treeitem", { name: /^Everything, .*\b[1-9][\d,]* nodes?\b/ }).waitFor();
}

/**
 * Samples, then the sample's card ("Les Miserables"); waits until the graph is in.
 * @param page - the Playwright page
 * @param name - the sample, as its card names it
 */
export async function openSample(page, name) {
    await page.getByRole("button", { name: "Samples", exact: true }).click();
    const n = name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    await page
        .getByRole("button", { name: new RegExp(`^Open the ${n} sample: `) })
        .last()
        .click();
    await opened(page);
    await closeToast(page);
}

/**
 * Toolbar Mode, then 2D or 3D.
 * @param page - the Playwright page
 * @param which - "2D" or "3D"
 */
export async function mode(page, which) {
    await page.getByRole("button", { name: /^Mode, / }).click();
    await page.getByRole("menuitemradio", { name: which, exact: true }).click();
    await page.getByRole("menu").waitFor({ state: "hidden" });
}

/**
 * The "Usage data stays off" notice in the corner, closed so it is not in every shot.
 * @param page - the Playwright page
 */
export async function closeToast(page) {
    const note = usageNote(page);
    if (!(await note.isVisible())) return;
    await page.getByRole("button", { name: "Close", exact: true }).last().click();
    await note.waitFor({ state: "hidden" });
}

/**
 * Wait until the page has drawn `n` frames (the app finished a repaint), not a clock.
 * @param page - the Playwright page
 * @param n - how many frames
 * @returns when they are drawn
 */
export const frames = (page, n = 30) => page.evaluate(countFrames, n);

// runs in the page: resolves after k animation frames
function countFrames(k) {
    let left = k;
    return new Promise((ok) => {
        const step = () => {
            left -= 1;
            if (left <= 0) ok();
            else globalThis.requestAnimationFrame(step);
        };
        globalThis.requestAnimationFrame(step);
    });
}

/**
 * Wait until the graph drawing stops moving (a layout settled): three looks at the canvas, 20
 * frames apart, give the same picture. A condition a viewer could see, not a clock.
 *
 * Each look is a full-viewport capture, never clipped: a clipped Page.captureScreenshot makes
 * Chromium lay the page out again, and a screencast running at the time films that relaid page
 * (the side panels vanish for a few frames). So this is safe inside a clip's recorded run.
 * Only the canvas's pixels are compared, so the hand's cursor elsewhere does not matter.
 * @param page - the Playwright page
 * @param [canvas] - the drawing to watch (default: the workspace's Graph drawing)
 */
export async function settled(page, canvas = page.getByRole("region", { name: "Graph drawing" })) {
    const { PNG } = await import("pngjs");
    const cdp = await page.context().newCDPSession(page);
    try {
        let last = [];
        for (;;) {
            const b = await canvas.boundingBox();
            const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
            const img = PNG.sync.read(Buffer.from(data, "base64"));
            const x0 = Math.max(0, Math.round(b.x));
            const x1 = Math.min(img.width, Math.round(b.x + b.width));
            const rows = [];
            for (let y = Math.max(0, Math.round(b.y)); y < Math.min(img.height, Math.round(b.y + b.height)); y += 2)
                rows.push(img.data.subarray((y * img.width + x0) * 4, (y * img.width + x1) * 4));
            const look = Buffer.concat(rows);
            last = [...last.slice(-2), look];
            if (last.length === 3 && last.every((d) => d.equals(last[0]))) return;
            await frames(page, 20);
        }
    } finally {
        await cdp.detach();
    }
}

/**
 * Toolbar Camera, then a menu item.
 * @param page - the Playwright page
 * @param item - the menu item ("Fit")
 */
export async function camera(page, item) {
    await page.getByRole("button", { name: "Camera", exact: true }).click();
    await page.getByRole("menuitem", { name: item }).first().click();
}
