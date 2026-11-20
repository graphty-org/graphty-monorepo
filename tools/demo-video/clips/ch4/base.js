// Chapter 4's shared starting state (a .js file, so record.mjs does not take it for a clip): Les
// Miserables in 2D, colored by Louvain group and sized by Betweenness. Setup only, never recorded,
// and only through the app's own UI.
//
// Like chapter 2, chapter 4 is filmed with the cosmograph experiment off: with it on, graphty-element's
// batched render path draws no edges at all for Les Miserables, in 2D or 3D, and two of this
// chapter's clips (the hull and the edges) are about the links. stage() reopens the app through its
// public ?features= address with every other experiment on.
import { analyze, stage } from "../ch2/stage.js";

export { nodeBox } from "../ch2/stage.js";

/**
 * Les Miserables in 2D, fitted; Louvain colors the groups, Betweenness sizes the nodes (its own
 * layer, so "Why this look" names it); the Everything layer open on its Node tab.
 * @param h - the hand
 */
export async function base(h) {
    const { page } = h;
    await stage(h);
    await analyze(h, "Louvain", "Louvain");
    await analyze(h, "Betweenness", "Betweenness");
    // Betweenness colors its nodes; here it sizes them instead, so the Louvain colors show.
    await page.getByRole("treeitem", { name: /^Betweenness, / }).click();
    await page.getByRole("tab", { name: "Node", exact: true }).click();
    await page.getByRole("button", { name: "Remove node color" }).click();
    await page.getByRole("button", { name: "Add to node shape" }).click();
    await page.getByRole("menuitem", { name: "Size", exact: true }).click();
    await page.getByRole("button", { name: "Node size by attribute" }).click();
    await page.getByRole("option", { name: /^Betweenness, / }).click();
    await page.keyboard.press("Escape");
    const legend = page.getByRole("region", { name: "Legend" });
    await legend.getByRole("group", { name: "Size: Betweenness" }).waitFor();
    await legend.getByRole("group", { name: "Color: Louvain" }).waitFor();
    await page.getByRole("treeitem", { name: /^Everything, / }).click();
    await page.getByRole("tab", { name: "Node", exact: true }).click();
    await h.app.closeToast();
    await h.app.camera("Fit");
    await h.app.settled();
}

/**
 * Zoom the camera with the mouse wheel over a point (setup only): in, so small text reads, or out
 * (negative ticks), to leave a margin around the graph.
 * @param h - the hand
 * @param at - where to zoom toward
 * @param ticks - wheel notches, negative to zoom out
 */
export async function zoomIn(h, at, ticks) {
    await h.page.mouse.move(at.x, at.y);
    for (let i = 0; i < Math.abs(ticks); i++) {
        await h.page.mouse.wheel(0, ticks > 0 ? -100 : 100);
        await h.app.frames(5);
    }
    await h.app.settled();
}

export { tap } from "../r2-1-fraud-ring/bank.js";

/**
 * The middle of the graph's canvas.
 * @param h - the hand
 * @returns a point
 */
export async function canvasMiddle(h) {
    const c = await h.page.getByRole("region", { name: "Graph drawing" }).boundingBox();
    return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
}

/**
 * Hide the legend (setup only), so it covers no part of the graph.
 * @param h - the hand
 */
export async function hideLegend(h) {
    const legend = h.page.getByRole("button", { name: "Legend", exact: true });
    if ((await legend.getAttribute("aria-pressed")) === "true") await legend.click();
    await h.page.getByRole("region", { name: "Legend" }).waitFor({ state: "hidden" });
}
