/**
 * Chapter 7's shared steps: the start page's Generate a graph > LFR benchmark with Nodes 50,000 and
 * the default seed, layouts, the edges' Style tab, and the recorded Line setting step.
 * Not a .mjs file, so record.mjs does not take it for a clip.
 *
 * Waits have no deadline (setDefaultTimeout(0)): with the cosmograph experiment on, the 50,000-node
 * graph takes minutes to come in (reported as an app defect), and every wait is on a condition.
 */
import { frames } from "../../lib/app.mjs";

export const NODES = "50000";

/**
 * The LFR tile on the start page, scrolled into view (the Generate a graph section is far down).
 * @param page - the Playwright page
 * @returns the tile
 */
export async function lfrTile(page) {
    const tile = page.getByRole("button", { name: /^Generate a graph: LFR benchmark/ });
    await tile.scrollIntoViewIfNeeded();
    return tile;
}

/**
 * The 50,000-node graph is in: the Everything layer counts its nodes.
 * @param page - the Playwright page
 * @returns when it is
 */
export const bigIn = (page) =>
    page.getByRole("treeitem", { name: /^Everything, .*\b50,000 nodes\b/ }).waitFor({ state: "attached" });

/**
 * Generate the graph (setup only). The chapter stays in 3D: switching to 2D builds every node again
 * (minutes more at this size) and, with the cosmograph experiment on, 2D draws no edges.
 * @param h - the hand (only its page is used)
 */
export async function bigGraph(h) {
    const { page } = h;
    page.setDefaultTimeout(0);
    await (await lfrTile(page)).click();
    const dialog = page.getByRole("dialog", { name: "LFR benchmark" });
    await dialog.getByRole("textbox", { name: "Nodes" }).fill(NODES);
    await dialog.getByRole("button", { name: "Generate" }).click({ noWaitAfter: true });
    await bigIn(page);
}

/**
 * Color the nodes by the generator's planted groups (the `community` column), through the Everything
 * layer's Style tab (setup only), so a layout or an edge fade shows the groups it brings out.
 * @param page - the Playwright page
 */
export async function colorByCommunity(page) {
    await page.getByRole("treeitem", { name: /^Everything, / }).click();
    await page.getByRole("complementary", { name: "Inspector" }).getByRole("tab", { name: "Style" }).click();
    await page.getByRole("button", { name: "Node color by attribute" }).first().click();
    await page
        .getByRole("dialog", { name: "Node color by attribute" })
        .getByRole("option", { name: /^community\b/ })
        .click();
    await page.getByText("Color: community").first().waitFor();
}

/**
 * Toolbar Layout, a layout by name, then Apply (setup only: straight clicks).
 * @param page - the Playwright page
 * @param name - the layout's name ("Random")
 */
export async function layout(page, name) {
    await page.getByRole("button", { name: "Layout", exact: true }).click();
    await page
        .getByRole("option", { name: new RegExp(String.raw`^${name}\b`) })
        .first()
        .click();
    const apply = page.getByRole("button", { name: "Apply", exact: true });
    await apply.click();
}

/**
 * The status bar's WebGPU chip, once the app has found the graphics card.
 * @param page - the Playwright page
 * @returns its locator
 */
export const webGpuChip = (page) => page.getByRole("contentinfo", { name: "Status" }).getByText("WebGPU: enabled");

/**
 * The Fade end (CSS pixels on screen) the fade clip sets, tried on the real 50,000-node drawing at
 * 80, 40, 20 and 10: at 40 and 80 little changes; at 10 only the short edges inside each planted
 * group are left, so the groups (colored by community) show.
 */
export const FADE_END = "10";

/**
 * Recorded: the Edge tab's Line settings, add one setting and type its value (the hand).
 * @param h - the hand
 * @param name - the setting as its button names it after "Add edge " ("fade end", "opacity")
 * @param value - what to type
 */
export async function lineSetting(h, name, value) {
    const { page } = h;
    await h.click(page.getByRole("button", { name: "Edge line settings" }));
    const dialog = page.getByRole("dialog", { name: "Edge line" });
    await h.click(dialog.getByRole("button", { name: `Add edge ${name}` }));
    const field = dialog.getByRole("spinbutton", { name: `Edge ${name}` });
    await h.click(field);
    await h.press("Control+a");
    await h.type(value);
    await h.press("Enter");
    // Enter returns only once 156,000 edges are redrawn (seconds of a frozen page): jumpcut.js drops it
    h.mark("cut-out-after-input");
    h.mark("cut-in");
    // the settings sheet covers the right of the drawing: close it so the hold shows all of it
    await h.click(dialog.getByRole("button", { name: "Close Edge line" }));
    // off the drawing, onto the inspector beside it: a path across 50,000 nodes stalls the page on
    // hover picking. No settled() here: its canvas captures while the screencast runs can spoil the
    // filmed frames.
    await h.move({ x: 1760, y: 760, width: 80, height: 60 });
}

/** The node size the edge clips set first: at size 1, 50,000 nodes cover every edge. */
export const SMALL_NODES = "0.25";

/**
 * The edge clips' starting state (setup only): the graph as its opening layout leaves it (the same
 * Force, settled about 3 minutes after the graph is in; a second Force run from a scatter takes more
 * than 6 minutes to come to rest), fitted, nodes made small so the edges show, and the Everything
 * layer's Style tab open on its Edge tab.
 * @param h - the hand (its page and setup helpers)
 */
export async function laidOutForEdges(h) {
    const { page } = h;
    await bigGraph(h);
    await h.app.settled();
    await h.app.camera("Fit");
    await h.app.settled();
    await colorByCommunity(page);
    await page.getByRole("treeitem", { name: /^Everything, / }).click();
    await page.getByRole("complementary", { name: "Inspector" }).getByRole("tab", { name: "Style" }).click();
    const size = page.getByRole("spinbutton", { name: "Node size" });
    await size.fill(SMALL_NODES);
    await size.press("Enter");
    await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Edge/ }).click();
    await h.app.settled();
    // fit again once the panels are as the clip films them, so the ball sits in the middle
    await h.app.camera("Fit");
    await h.app.settled();
}

/**
 * Wait until the drawing moves: the canvas, captured small, changes between two looks. Right after a
 * big graph comes in the canvas stays blank for seconds, then the graph appears and its layout keeps
 * it moving for minutes, so the first change is the graph appearing. Only for the part of a take a
 * jump cut drops: these captures can spoil the frames filmed at the same time.
 * @param page - the Playwright page
 */
export async function drawn(page) {
    const canvas = page.getByRole("region", { name: "Graph drawing" });
    const cdp = await page.context().newCDPSession(page);
    const look = async () => {
        const clip = { ...(await canvas.boundingBox()), scale: 0.25 };
        return (await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 40, clip })).data;
    };
    try {
        const first = await look();
        while ((await look()) === first) await frames(page, 5);
    } finally {
        await cdp.detach();
    }
}
