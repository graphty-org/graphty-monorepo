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
 * The start page's Open a file, the browser's file chooser answered with `file` (setup only: a clip
 * that shows the open uses h.openFile); waits until the graph is in.
 * @param page - the Playwright page
 * @param file - the file's path
 */
export async function openFile(page, file) {
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /^Open a file/ }).click();
    await (await chooser).setFiles(file);
    await opened(page);
    await closeToast(page);
}

/**
 * Close the data table if it is open: it opens with a new file and takes the lower half of the canvas.
 * @param page - the Playwright page
 */
export async function closeTable(page) {
    const table = page.getByRole("button", { name: "Table", exact: true, pressed: true });
    if (await table.isVisible()) {
        await table.click();
        await page.getByRole("button", { name: "Table", exact: true, pressed: false }).waitFor();
    }
}

/**
 * The opened graph laid out flat and framed, as most clips start (setup only): the data table closed, Mode 2D, the layout
 * left to come to rest (the project's own seed gives the same drawing every take), Fit, then one
 * wheel notch out so the lowest nodes clear the canvas toolbar. A clip starts on this settled
 * drawing, so the viewer never watches the same layout run twice.
 * @param page - the Playwright page
 */
export async function ready2D(page) {
    await closeTable(page);
    await mode(page, "2D");
    await settled(page);
    await camera(page, "Fit");
    await settled(page);
    const box = await page.getByRole("region", { name: "Graph drawing" }).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 100);
    await settled(page);
}

/**
 * A style layer's edges recolored and widened through the inspector's Style > Edge tab (setup only):
 * a path made thick and bright over pale edges.
 * @param page - the Playwright page
 * @param layer - the layer's name in Style layers ("Shortest path", "Everything")
 * @param o - the edge style
 * @param [o.color] - a hex color without "#" ("FF5A1F")
 * @param [o.width] - the edge width (the app's default is 24)
 */
export async function layerEdges(page, layer, { color, width } = {}) {
    await page.getByRole("treeitem", { name: new RegExp(`^${layer}, `) }).click();
    const insp = page.getByRole("complementary", { name: "Inspector" });
    await insp.getByRole("tab", { name: "Style" }).click();
    const edgeTab = page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Edge/ });
    await edgeTab.click();
    if (color) {
        const field = insp.getByRole("textbox", { name: /^Edge color, set here/ });
        await field.fill(color);
        await field.press("Enter");
    }
    if (width) {
        const field = insp.getByRole("spinbutton", { name: "Edge width" });
        await field.fill(String(width));
        await field.press("Enter");
    }
    // focus off the text fields, so a key typed next reaches the app
    await edgeTab.click();
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
