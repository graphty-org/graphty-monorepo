// Round 2, chapter 2 ("Inside Alzheimer's disease"): the shared setup steps, each bringing a clip to
// where the clip before it ended. A .js file, so record.mjs does not take it for a clip. Setup only:
// Playwright clicks straight through the app's own UI, unpaced.
import { analyze, clearSelection, closeToasts, everythingNodes } from "../r2-1-fraud-ring/bank.js";

export { everythingNodes, nodeBox } from "../r2-1-fraud-ring/bank.js";

/** The network's file: Open Targets' Alzheimer's targets with STRING links (real data). */
export const ALZ = "round2/alzheimer-network.json";

/**
 * Every Alzheimer clip. The file-styles experiment is left off: on a plain JSON file it adds stray
 * "Draw order", "Drawing", "Defaults" and "Corners" layers (an element defect; README.md, "Known app
 * defects").
 */
export const ALZ_CLIP = { chapter: 2, featuresOff: ["file-styles"] };

/** The color and size the approved-drug targets get in clip 2.4, typed the way a person would. */
export const TARGET_COLOR = "magenta";
export const TARGET_SIZE = "3";
/** The bold path's edges: near-black, a color no community outline uses. */
export const PATH_COLOR = "1F2328";

const insp = (page) => page.getByRole("complementary", { name: "Inspector" });

/**
 * The network opened and settled flat, framed (no settle on camera: the chapter card covers the change
 * of dataset).
 * @param h - the hand
 */
export async function alz2D(h) {
    await h.app.openFile(h.file(ALZ));
    await h.app.ready2D();
}

/**
 * Where clip 2.1 ends: proteins colored by Louvain community.
 * @param h - the hand
 */
export async function alzLouvain(h) {
    await alz2D(h);
    await analyze(h, "louv", "Louvain");
}

/**
 * Where clip 2.2 starts: the Hull shader added on Everything in its Outline look, not grouped yet.
 * @param h - the hand
 */
export async function alzOutline(h) {
    const { page } = h;
    await alzLouvain(h);
    await everythingNodes(h);
    await page.getByRole("button", { name: "Add to node shaders" }).click();
    await page.getByRole("textbox", { name: "Find node shader" }).fill("hull");
    await page.getByRole("button", { name: "Hull", exact: true }).click();
    await page.getByRole("button", { name: "Hull settings" }).click();
    await page.getByRole("combobox", { name: "Look" }).click();
    await page.getByRole("option", { name: "Outline", exact: true }).click();
    await page.keyboard.press("Escape");
}

/**
 * Where clip 2.2 ends: the Hull shader, Outline look, grouped by Louvain on Everything.
 * @param h - the hand
 */
export async function alzHull(h) {
    const { page } = h;
    await alzOutline(h);
    await page.getByRole("button", { name: "Group by None" }).click();
    await page.getByRole("option", { name: /^Louvain, / }).click();
    await page.getByRole("button", { name: "Group by Louvain" }).waitFor();
    await h.app.settled();
}

/**
 * Where clip 2.3 ends: the 16 approved-drug targets selected through the find box's value row.
 * @param h - the hand
 */
export async function alzSelectApproved(h) {
    const { page } = h;
    await page.getByRole("combobox", { name: "Find" }).fill("Approved");
    await page.getByRole("option", { name: /^Select where drugStage is Approved/ }).click();
    await page.getByRole("treeitem", { name: /^Selected, .*\b16 nodes\b/ }).waitFor();
    await h.app.settled();
}

/**
 * Where clip 2.4 ends: those 16 in a layer of their own, one color, larger; nothing selected.
 * @param h - the hand
 */
export async function alzTargetsLayer(h) {
    const { page } = h;
    await page.mouse.click(1560, 975, { button: "right" });
    await page.getByRole("menuitem", { name: "New layer from selection" }).click();
    await page.getByRole("treeitem", { name: /^16 nodes, / }).waitFor();
    await insp(page).getByRole("tab", { name: "Style" }).click();
    await insp(page).getByRole("button", { name: "Add to node fill" }).click();
    await page.getByRole("menuitem", { name: "Color", exact: true }).click();
    const color = insp(page).getByRole("textbox", { name: /^Node color, / });
    await color.fill(TARGET_COLOR);
    await color.press("Enter");
    await insp(page).getByRole("button", { name: "Add to node shape" }).click();
    await page.getByRole("menuitem", { name: "Size", exact: true }).click();
    const size = insp(page).getByRole("spinbutton", { name: "Node size" });
    await size.fill(TARGET_SIZE);
    await size.press("Enter");
    await clearSelection(h);
    await closeToasts(h);
    await fitWide(h);
}

/**
 * Framed again (setup only): picking the find box's Values row pans the camera toward the
 * selection, which leaves part of the network off the canvas. Fit, then one wheel notch out so the
 * lowest nodes clear the canvas toolbar.
 * @param h - the hand
 */
export async function fitWide(h) {
    await fitToCenter(h);
    await h.page.mouse.wheel(0, 100);
    await h.app.settled();
}

/**
 * Camera Fit, then the mouse moved to the canvas's center, ready for wheel notches (setup only).
 * @param h - the hand
 */
export async function fitToCenter(h) {
    const { page } = h;
    await h.app.camera("Fit");
    await h.app.settled();
    const box = await page.getByRole("region", { name: "Graph drawing" }).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

/**
 * A layer's nodes named by their gene symbol, in the sans font and in screen pixels so the names
 * read at any zoom.
 * @param h - the hand
 * @param layer - the layer's name in Style layers
 * @param o - options
 * @param [o.column] - the Label picker's entry that names a node ("Node id")
 * @param [o.px] - the text size in screen pixels
 */
export async function labelLayer(h, layer, { column = "Node id", px = "28" } = {}) {
    const { page } = h;
    await page.getByRole("treeitem", { name: new RegExp(`^${layer}, `) }).click();
    await insp(page).getByRole("tab", { name: "Style" }).click();
    await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Node/ }).click();
    await insp(page).getByRole("button", { name: "Add to node text" }).click();
    await page.getByRole("menuitem", { name: "Label", exact: true }).click();
    await page.getByRole("dialog", { name: "Label" }).getByRole("option", { name: column }).first().click();
    // the app's sans, not the element's default serif (README.md, "Known app defects")
    await labelPixels(page, px, { sans: true });
}

/**
 * The node label's settings (setup only): optionally the sans font, then the size in screen pixels;
 * closed again after.
 * @param page - the Playwright page
 * @param px - the text size in screen pixels
 * @param o - options
 * @param [o.sans] - true to pick the Sans serif font first
 */
export async function labelPixels(page, px, { sans = false } = {}) {
    await page.getByRole("button", { name: "Node label settings" }).click();
    const settings = page.getByRole("dialog", { name: "Label settings" });
    if (sans) {
        await settings.getByRole("combobox", { name: "Font" }).click();
        await page.getByRole("option", { name: "Sans serif", exact: true }).click();
    }
    await settings.getByRole("combobox", { name: "Size in" }).click();
    await page.getByRole("option", { name: "Screen pixels" }).click();
    const size = settings.getByRole("spinbutton", { name: /^Size, / });
    await size.fill(String(px));
    await size.press("Enter");
    const close = page.getByRole("button", { name: "Close Label settings" });
    if (await close.isVisible()) await close.click();
    await settings.waitFor({ state: "hidden" });
}

/**
 * The Shortest path form run with two gene symbols (setup only): P on the canvas, both names, Enter.
 * @param h - the hand
 * @param from - the first gene
 * @param to - the second gene
 */
export async function runPath(h, from, to) {
    const { page } = h;
    await page.mouse.click(1560, 975);
    await page.keyboard.press("p");
    await page.getByRole("form", { name: "Shortest path" }).waitFor();
    await page.keyboard.type(from);
    await page.keyboard.press("Enter");
    await page.keyboard.type(to);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await insp(page).getByText("Nodes in order").waitFor();
}

/**
 * Where clip 2.6 ends, made bold for the cold open: the ACHE to APOE path, its edges wide and its
 * three proteins larger and named.
 * @param h - the hand
 */
export async function alzPathBold(h) {
    const { page } = h;
    await runPath(h, "ACHE", "APOE");
    // near-black: a color none of the community outlines uses, so the path reads over them
    await h.app.layerEdges("Shortest path", { color: PATH_COLOR, width: 60 });
    await labelLayer(h, "Shortest path");
    await insp(page).getByRole("button", { name: "Add to node shape" }).click();
    await page.getByRole("menuitem", { name: "Size", exact: true }).click();
    const size = insp(page).getByRole("spinbutton", { name: "Node size" });
    await size.fill("3");
    await size.press("Enter");
    await size.blur(); // no focus ring left on the Size field in the shot
    await closeToasts(h);
    await h.app.settled();
}
