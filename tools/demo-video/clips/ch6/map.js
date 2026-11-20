/**
 * Setup steps the chapter 6 (map) clips share. Not a clip: a .js file, so record.mjs (which loads
 * every .mjs under clips/ as a clip) skips it. These run before recording and click straight
 * through the app's own UI with Playwright, as lib/app.mjs does.
 */

/** The OpenFlights card's name in the Samples dialog. */
export const FLIGHTS = "OpenFlights airline routes";

/**
 * The Layout popover.
 * @param page - the Playwright page
 * @returns its locator
 */
export const layoutPanel = (page) => page.getByRole("dialog", { name: "Layout" });

/**
 * Toolbar Layout, then the Map entry: the Map layout's form is open.
 * @param page - the Playwright page
 * @returns the popover's locator
 */
export async function openMapForm(page) {
    await page.getByRole("button", { name: "Layout", exact: true }).click();
    const panel = layoutPanel(page);
    const entry = panel.getByRole("option", { name: /^Map / });
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await panel.getByRole("form", { name: "Map" }).waitFor();
    return panel;
}

/**
 * Pick a value from one of the Map form's lists (Fit, Transition, Map).
 * @param page - the Playwright page
 * @param field - the list's label
 * @param value - the entry to pick
 */
export async function pick(page, field, value) {
    await layoutPanel(page).getByRole("combobox", { name: field }).click();
    const option = page.getByRole("option", { name: value, exact: true });
    await option.scrollIntoViewIfNeeded();
    await option.click();
}

/**
 * How nodes travel to the next layout: a graph setting written as soon as it is picked, so the
 * form is left with Back and Esc without applying anything.
 * @param page - the Playwright page
 * @param name - the transition ("Arc move")
 * @param seconds - how long it takes
 */
export async function setTransition(page, name, seconds) {
    const panel = await openMapForm(page);
    await pick(page, "Transition", name);
    const field = panel.getByRole("textbox", { name: "Seconds" });
    await field.fill(String(seconds));
    await field.press("Tab");
    await closeLayout(page);
}

/**
 * Esc until the Layout popover is gone (the form steps back to the list first).
 * @param page - the Playwright page
 */
export async function closeLayout(page) {
    const panel = layoutPanel(page);
    while (await panel.isVisible()) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(0);
    }
}

/**
 * The airports put on the map: Layout > Map with Fit World (the whole world, Atlantic in the
 * middle, so a route from Sydney to Iceland does not wrap around the edge) and an optional
 * base map, applied; then the drawing is left to settle.
 * @param h - the hand (setup helpers on h.app)
 * @param o - options
 * @param [o.map] - a Map list entry ("Natural Earth gray"); left alone when missing
 * @param [o.flat] - true to switch to 2D (Mode > 2D) and fit the camera
 */
export async function onMap(h, { map, flat = false } = {}) {
    const { page } = h;
    const panel = await openMapForm(page);
    await pick(page, "Fit", "World");
    if (map) await pick(page, "Map", map);
    await panel.getByRole("button", { name: "Apply" }).click();
    await panel.waitFor({ state: "hidden" });
    if (flat) {
        await h.app.mode("2D");
        await h.app.settled();
        await h.app.camera("Fit");
    }
    await h.app.settled();
}

/**
 * A full-viewport picture of the page, never clipped: a clipped Page.captureScreenshot makes
 * Chromium lay the page out again for the clip, and the screencast films that relaid page (the side
 * panels vanish for a few frames).
 * @param cdp - a CDP session on the page
 * @returns the decoded PNG
 */
async function viewport(cdp) {
    const { PNG } = await import("pngjs");
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    return PNG.sync.read(Buffer.from(data, "base64"));
}

/**
 * Wait until the graph shows on the canvas: inside the canvas's box, well over a thousand sampled
 * pixels are unlike its corner (the empty background). A condition a viewer can see, not a clock.
 * @param page - the Playwright page
 */
export async function drawn(page) {
    const canvas = page.getByRole("region", { name: "Graph drawing" });
    const cdp = await page.context().newCDPSession(page);
    try {
        for (;;) {
            const b = await canvas.boundingBox();
            const png = await viewport(cdp);
            const at = (x, y) => (Math.round(y) * png.width + Math.round(x)) * 4;
            const px = png.data;
            const c = at(b.x + 4, b.y + 4);
            let unlike = 0;
            for (let y = b.y; y < b.y + b.height; y += 10) {
                for (let x = b.x; x < b.x + b.width; x += 10) {
                    const i = at(x, y);
                    if (
                        Math.abs(px[i] - px[c]) + Math.abs(px[i + 1] - px[c + 1]) + Math.abs(px[i + 2] - px[c + 2]) >
                        60
                    )
                        unlike++;
                }
            }
            if (unlike > 1500) return; // more than the toolbar and a notice can make
            await page.evaluate(() => new Promise((ok) => globalThis.requestAnimationFrame(() => ok())));
        }
    } finally {
        await cdp.detach();
    }
}

/**
 * Wait until the whole page stops changing: three full-viewport pictures 20 frames apart are the same
 * (a base map's tiles have all come in). Safe while recording: the pictures are never clipped.
 * Keep the hand still meanwhile; its cursor is in the picture.
 * @param page - the Playwright page
 */
export async function still(page) {
    const cdp = await page.context().newCDPSession(page);
    try {
        let last = [];
        for (;;) {
            const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 40 });
            last = [...last.slice(-2), data];
            if (last.length === 3 && last.every((d) => d === last[0])) return;
            for (let i = 0; i < 20; i++)
                await page.evaluate(() => new Promise((ok) => globalThis.requestAnimationFrame(() => ok())));
        }
    } finally {
        await cdp.detach();
    }
}

/**
 * Lay the graph out once with a still layout (Layout > the entry > Apply), so the drawing stops
 * moving: OpenFlights' live force layout keeps the page so busy that a take films at 7 fps.
 * @param h - the hand (setup helpers on h.app)
 * @param entry - the Layout list entry's name, as its start ("Random")
 */
export async function stillLayout(h, entry) {
    const { page } = h;
    await page.getByRole("button", { name: "Layout", exact: true }).click();
    const panel = layoutPanel(page);
    const option = panel.getByRole("option", { name: new RegExp(`^${entry} `) });
    await option.scrollIntoViewIfNeeded();
    await option.click();
    await panel.getByRole("button", { name: "Apply" }).click();
    await closeLayout(page);
    await h.app.settled();
}
