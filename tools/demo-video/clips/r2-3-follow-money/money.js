// Round 2, chapter 3 ("Follow the money"): the bank case as chapter 1 leaves it, and the setup steps
// that bring each clip to where the clip before it ended. A .js file, so record.mjs does not take it
// for a clip. Setup only: Playwright clicks straight through the app's own UI, unpaced.
import {
    analyze,
    BANK_CLIP,
    bankLouvain,
    bankNeighborhood,
    bankRing,
    closeToasts,
    clearSelection,
    edgeLine,
    eye,
    paleEverything,
} from "../r2-1-fraud-ring/bank.js";
import { openMapForm, pick } from "../ch6/map.js";

/** Every chapter 3 clip films the bank data. */
export const MONEY_CLIP = { ...BANK_CLIP, chapter: 3 };

/**
 * The inspector (the right panel).
 * @param page - the Playwright page
 * @returns its locator
 */
export const inspector = (page) => page.getByRole("complementary", { name: "Inspector" });

/**
 * The bank case, built by the same steps chapter 1 films: settled flat, Louvain run and hidden, the
 * address and its 12 accounts a red "Fraud ring" layer, everything else pale, nothing selected.
 * @param h - the hand
 */
export async function bankCase(h) {
    await bankLouvain(h);
    await bankNeighborhood(h);
    await bankRing(h);
    await eye(h, "Louvain", false);
    await paleEverything(h, { node: "D4D4D8", edge: "E4E4E4" });
    await closeToasts(h);
    await h.page.getByRole("button", { name: "Graph", exact: true }).click(); // the style layers in view
    await h.app.settled();
}

/** The collector's account in Riga, and the layer its transfers in from the five mules get. */
export const COLLECTOR = "ACC-1493";
export const TRAIL_LAYER = "Money trail";
export const TRAIL_COLOR = "0072B2"; // blue: Betweenness colors nodes orange later in the chapter

/**
 * Chapter 3's case: the bank case plus a "Money trail" layer, the collector in Riga and the five
 * mules that pay it, nodes and edges blue and the edges wide, so the transfers into Riga read on
 * a map among 1,486 pale ones (setup only, through the find box, the inspector's Degree and New
 * layer from selection).
 * @param h - the hand
 */
export async function moneyCase(h) {
    const { page } = h;
    await bankCase(h);
    await page.getByRole("combobox", { name: "Find" }).fill(COLLECTOR);
    await page
        .getByRole("option", { name: new RegExp(String.raw`^${COLLECTOR}\b`) })
        .first()
        .click();
    const insp = inspector(page);
    await insp.getByRole("heading", { name: COLLECTOR }).waitFor();
    await insp.getByRole("button", { name: /^Degree / }).click();
    await page.getByRole("treeitem", { name: /^Selected, .*\b6 nodes\b/ }).waitFor();
    await insp.getByRole("button", { name: "Neighborhood actions" }).click();
    await page.getByRole("menuitem", { name: "New layer from selection" }).click();
    const layer = page.getByRole("treeitem", { name: /^6 nodes, / });
    await layer.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByRole("textbox", { name: "Layer name" }).fill(TRAIL_LAYER);
    await page.keyboard.press("Enter");
    await page.getByRole("treeitem", { name: new RegExp(`^${TRAIL_LAYER}, `) }).waitFor();
    await insp.getByRole("tab", { name: "Style" }).click();
    await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Node/ }).click();
    await insp.getByRole("button", { name: "Add to node fill" }).click();
    await page.getByRole("menuitem", { name: "Color", exact: true }).click();
    const color = insp.getByRole("textbox", { name: /^Node color, / });
    await color.fill(TRAIL_COLOR);
    await color.press("Enter");
    // a new layer sets no edge style yet: Line's + adds each property, then it is typed in
    await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Edge/ }).click();
    await edgeLine(h, TRAIL_COLOR);
    await clearSelection(h);
    await closeToasts(h);
    await page.getByRole("button", { name: "Graph", exact: true }).click();
    await h.app.settled();
}

/**
 * Where clip 3.2 ends: Layout > Map (flat, as the graph is in 2D), applied at once (no transition in setup), framed.
 * @param h - the hand
 */
export async function onMap(h) {
    const { page } = h;
    const panel = await openMapForm(page);
    await pick(page, "Transition", "None");
    await panel.getByRole("button", { name: "Apply" }).click();
    await panel.waitFor({ state: "hidden" });
    await h.app.settled();
}

/**
 * Where clip 3.3 ends: Betweenness run from Analyze ("brokers").
 * @param h - the hand
 */
export async function betweenness(h) {
    await analyze(h, "brokers", "Betweenness");
}

/** An empty spot on the map (the Atlantic, south of the cities), in Graph drawing coordinates. */
export const EMPTY = { x: 560, y: 760 };

/**
 * The transfers' time column made the graph's time (the Graph overview's Set in Data), then the
 * Timeline dock opened (setup only).
 * @param h - the hand
 */
export async function timeline(h) {
    const { page } = h;
    await page.getByRole("region", { name: "Graph drawing" }).click({ position: EMPTY });
    await page.getByRole("button", { name: "Set in Data" }).click();
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await page.getByRole("region", { name: "Timeline" }).getByRole("button", { name: "Play" }).waitFor();
    await page.getByRole("button", { name: "Graph", exact: true }).click();
}

/**
 * Node size bound to an algorithm's result on its own layer (setup only): Add to node shape > Size,
 * then Node size by attribute, widened to 1..`to` in its popover.
 * @param h - the hand
 * @param name - the result and its layer ("Betweenness")
 * @param to - the largest node size
 */
export async function sizeBy(h, name, to) {
    const { page } = h;
    await page.getByRole("treeitem", { name: new RegExp(String.raw`^${name}\b`) }).click();
    await inspector(page).getByRole("tab", { name: "Style" }).click();
    await page.getByRole("button", { name: "Add to node shape" }).click();
    await page.getByRole("menuitem", { name: "Size", exact: true }).click();
    await page.getByRole("button", { name: "Node size by attribute" }).click();
    await page.getByRole("option", { name: new RegExp(`^${name}, `) }).click();
    const bound = page.getByRole("button", { name: new RegExp(`^Node size: ${name}`) });
    await bound.click();
    const box = page.getByRole("dialog", { name: `Size by ${name}` }).getByRole("spinbutton", { name: "Size to" });
    await box.fill(String(to));
    await box.press("Enter");
    await page.getByRole("button", { name: `Close Size by ${name}` }).click();
    await page.getByRole("button", { name: new RegExp(`^Node size: ${name}, 1 to ${to}`) }).waitFor();
}

/**
 * Timeline settings (the dock's gear): what algorithm results do when the window moves, and
 * optionally the mode ("Grow"). Closed again after.
 * @param h - the hand
 * @param o - options
 * @param [o.results] - a "When window moves" choice ("Rerun automatically")
 * @param [o.mode] - a mode's name ("Grow")
 */
export async function timelineSettings(h, { results, mode } = {}) {
    const { page } = h;
    await page.getByRole("button", { name: "Timeline settings" }).click();
    const panel = page.getByRole("dialog", { name: "Timeline settings" });
    if (mode) await panel.getByText(mode, { exact: true }).click();
    if (results) {
        await panel.getByRole("combobox", { name: "When window moves" }).click();
        await page.getByRole("option", { name: results, exact: true }).click();
    }
    await panel.getByRole("button", { name: "Close Timeline settings" }).click();
    await panel.waitFor({ state: "hidden" });
}

/**
 * The time window back to its start (the "<" key), so play opens on June.
 * @param h - the hand
 */
export async function toStart(h) {
    const { page } = h;
    await page.getByRole("region", { name: "Graph drawing" }).click({ position: EMPTY });
    await page.keyboard.press("<");
    await page
        .getByRole("region", { name: "Timeline" })
        .getByRole("button", { name: "Step back" })
        .and(page.locator(":disabled"))
        .waitFor();
    await h.app.settled();
}
