// Round 6, chapter 1 ("The basics"): one working session on the Les Miserables sample. Each clip
// starts where the one before it ended; these setup steps rebuild that state off camera, through the
// app's own UI. A .js file, so record.mjs does not take it for a clip.
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { OUT } from "../../lib/env.mjs";
import { clearSelection, closeToasts, runAnalysis } from "../r2-1-fraud-ring/bank.js";

export { nodeBox } from "../r2-1-fraud-ring/bank.js";
import { applyLayout } from "../r2-5b-and-more/more.js";

/**
 * What every basics clip shares. Cosmograph is off: with it on, a 2D/3D switch lays the graph out
 * again from a jumble instead of flattening or lifting the drawing (README.md, "Known app defects");
 * file-styles is off as on the other Les Miserables clips.
 */
export const BASICS_CLIP = { chapter: 1, featuresOff: ["file-styles", "cosmograph"] };
/** The clips that open the sample before setup. */
export const BASICS_DATA = { ...BASICS_CLIP, dataset: "Les Miserables" };

/** The node the hand clicks: the novel's hero, 36 neighbors. */
export const HERO = "Valjean";
/** The style rule: the most connected characters. */
export const RULE = "=degree >= 10";
/** Where the hand rests after a beat: the canvas's empty lower right, off the graph. */
export const REST = { x: 1470, y: 900, width: 100, height: 60 };
/** Where the saved project goes (tmp/demo-video/basics). */
export const SAVED = join(OUT, "basics");

/**
 * Camera > Focus selected off (setup only): with it on, a click on a node flies the camera to it and
 * the circle leaves the canvas.
 * @param page - the Playwright page
 */
export async function focusOff(page) {
    await page.getByRole("button", { name: "Camera", exact: true }).click();
    const item = page.getByRole("menuitemcheckbox", { name: /^Focus selected/ });
    if ((await item.getAttribute("aria-checked")) === "true") await item.click();
    else await page.keyboard.press("Escape");
    await page.getByRole("menu").waitFor({ state: "hidden" });
}

/**
 * The Selected layer filled red (setup only). Its own halo draws only on the clicked node, not on
 * the neighbors the inspector adds (an app defect, reported), so a fill makes all of them show.
 * @param page - the Playwright page
 */
export async function redSelected(page) {
    const insp = page.getByRole("complementary", { name: "Inspector" });
    await page.getByRole("treeitem", { name: /^Selected, / }).click();
    await insp.getByRole("heading", { name: /^Selected, / }).waitFor();
    await insp.getByRole("tab", { name: "Style" }).click();
    await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Node/ }).click();
    await insp.getByRole("button", { name: "Add to node fill" }).click();
    // the menu names it Color or Solid, depending on which inspector layout is showing
    await page
        .getByRole("menuitem", { name: "Color", exact: true })
        .or(page.getByRole("menuitem", { name: "Solid", exact: true }))
        .click();
    const fill = insp.getByRole("textbox", { name: /^Node color, / });
    await fill.fill("FF3B30");
    await fill.press("Enter");
    // and larger than the rest, so the lit neighbors read on the circle
    await layerSize(page, 3);
    await page.getByRole("treeitem", { name: /^Everything, / }).click();
}

/**
 * Add Size to the layer open in the inspector (its Style tab showing) and set it (setup only).
 * @param page - the Playwright page
 * @param n - the node size
 */
async function layerSize(page, n) {
    const insp = page.getByRole("complementary", { name: "Inspector" });
    const size = insp.getByRole("spinbutton", { name: "Node size" });
    // a layer that already sets a size (Everything) shows the field and its menu offers no Size
    if ((await size.count()) === 0) {
        await insp.getByRole("button", { name: "Add to node shape" }).click();
        await page.getByRole("menuitem", { name: "Size", exact: true }).click();
    }
    await size.fill(String(n));
    await size.press("Enter");
}

/**
 * Every node at size 2 (setup only, before the circle): at size 1 the circle's nodes and later their
 * community colors read as specks.
 * @param page - the Playwright page
 */
export async function biggerAll(page) {
    const insp = page.getByRole("complementary", { name: "Inspector" });
    await page.getByRole("treeitem", { name: /^Everything, / }).click();
    await insp.getByRole("heading", { name: /^Everything, / }).waitFor();
    await insp.getByRole("tab", { name: "Style" }).click();
    await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Node/ }).click();
    await layerSize(page, 2);
}

/**
 * Where clip 2 ends: the sample flat, framed (setup only).
 * @param h - the hand
 */
export async function flat(h) {
    await h.app.ready2D();
    await focusOff(h.page);
    await biggerAll(h.page);
    await h.app.settled();
}

/**
 * Where clip 3 ends: the nodes on a circle, framed.
 * @param h - the hand
 * @param [before] - a setup step run on the flat drawing before the layout
 */
export async function circle(h, before) {
    await flat(h);
    if (before) await before();
    await applyLayout(h, /^Circle\b/); // applied, settled, Fit, one notch out
}

/**
 * Where clip 5 ends: the circle colored by Louvain community.
 * @param h - the hand
 */
export async function communities(h) {
    await circle(h);
    await runAnalysis(h, "louv", "Louvain");
    await h.app.settled();
}

/** The size the rule's layer gives the most connected nodes (every node is 2). */
export const HUB_SIZE = 4;

/** The layer the rule makes, in Style layers. */
export const RULE_LAYER = /^Rule: graphty\.degree >= 10, /;

/**
 * Where clip 6 starts: the rule =degree >= 10 typed in the find box selects the 22 most connected
 * characters and Selection actions > New layer from selection makes them a layer (setup only); then
 * the find box is emptied (its "Did you mean Degree?" hint stays otherwise), nothing is selected
 * and the notices are closed.
 * @param h - the hand
 */
export async function ruleLayer(h) {
    const { page } = h;
    const insp = page.getByRole("complementary", { name: "Inspector" });
    await communities(h);
    const find = page.getByRole("combobox", { name: "Find" });
    await find.fill(RULE);
    await page.getByRole("option", { name: /^Degree >= 10/ }).waitFor();
    await find.press("Enter");
    await insp.getByRole("heading", { name: "22 nodes selected" }).waitFor();
    await insp.getByRole("button", { name: "Selection actions" }).click();
    await page.getByRole("menuitem", { name: "New layer from selection" }).click();
    await page.getByRole("treeitem", { name: RULE_LAYER }).waitFor();
    await find.fill("");
    await clearSelection(h);
    await closeToasts(h);
    await page.getByRole("treeitem", { name: /^Everything, / }).click();
    await h.app.settled();
}

/**
 * Where clip 6 ends: the rule's layer open in the inspector, its 22 nodes at HUB_SIZE (setup pace,
 * the same clicks).
 * @param h - the hand
 */
export async function bigger(h) {
    const { page } = h;
    await ruleLayer(h);
    await page.getByRole("treeitem", { name: RULE_LAYER }).click();
    await layerSize(page, HUB_SIZE);
    await h.app.settled();
}

/**
 * Where clip 7 ends: the drawing in 3D.
 * @param h - the hand
 */
export async function lifted(h) {
    await bigger(h);
    await h.app.mode("3D");
    await h.app.settled();
}

/**
 * Wait for the next download and keep it in tmp/demo-video/basics.
 * @param page - the Playwright page
 * @returns the saved file's path
 */
export function keepDownload(page) {
    mkdirSync(SAVED, { recursive: true });
    return page.waitForEvent("download").then(async (d) => {
        const file = join(SAVED, d.suggestedFilename());
        await d.saveAs(file);
        return file;
    });
}
