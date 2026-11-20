// Round 2, chapter 1 ("Catch a fraud ring"): what every clip on the bank data shares, and the setup
// steps that bring a clip to where the clip before it ended. A .js file, so record.mjs does not take
// it for a clip. Setup only: Playwright clicks straight through the app's own UI, unpaced.

/** The bank's file, and the folder the drawn Open dialog shows it in. */
export const BANK = "round2/fraud-network.json";
export const BANK_FOLDER = {
    folder: "Bank case",
    files: ["fraud-network.json", "transfers.csv", "watchlist.csv", "alzheimer-network.json", "notes.txt"],
};

/** The account the hand clicks in clip 1.5: one of the ring, inside the highlighted community. */
export const RING_ACCOUNT = "ACC-1484";
/** The flat the twelve ring accounts share (label "Chicago address R"). */
export const RING_ADDRESS = "ADDR-R";
/** The ring layer's name and color, typed the way a person would. */
export const RING_LAYER = "Fraud ring";
export const RING_COLOR = "red";

/**
 * Every bank clip says the data is made up, in the caption band's corner.
 * The file-styles experiment is left off: on a plain JSON file it adds stray "Draw order",
 * "Drawing", "Defaults" and "Corners" layers and opens the legend on the draw order (an element
 * defect; README.md, "Known app defects").
 */
export const BANK_CLIP = { chapter: 1, tag: "Synthetic data", featuresOff: ["file-styles"] };

/**
 * Setup: the bank opened (through Open a file and the browser's chooser) and settled flat, framed.
 * @param h - the hand
 */
export async function bank2D(h) {
    await h.app.openFile(h.file(BANK));
    await h.app.ready2D();
}

/**
 * Where a node is drawn, as a page box the hand can aim at, read from graphty-element's public
 * nodeScreenPosition (setup only; the clip itself only moves and clicks).
 * @param h - the hand
 * @param id - the node's id
 * @returns a box around the node's center
 */
export async function nodeBox(h, id) {
    const p = await h.page.evaluate((nodeId) => {
        const el = globalThis.document.querySelector("graphty-element");
        const at = el.nodeScreenPosition(nodeId);
        const r = el.getBoundingClientRect();
        return at?.visible ? { x: at.x + r.left, y: at.y + r.top, radius: at.radius } : null;
    }, id);
    if (!p) throw new Error(`${id} is not on screen`);
    const s = Math.max(4, p.radius * 0.8);
    return { x: p.x - s, y: p.y - s, width: 2 * s, height: 2 * s };
}

/**
 * Zoom the camera with the wheel toward a node (setup only), so a small node is big enough to click
 * and to see.
 * @param h - the hand
 * @param id - the node to zoom toward
 * @param ticks - wheel notches in
 */
export async function zoomToward(h, id, ticks) {
    const b = await nodeBox(h, id);
    await h.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    for (let i = 0; i < ticks; i++) {
        await h.page.mouse.wheel(0, -100);
        await h.app.frames(5);
    }
    await h.app.settled();
}

/**
 * Run one analysis through Analyze (setup only): filter, pick, Run, wait for its legend, close.
 * Does not wait for the drawing to settle (analyze does).
 * @param h - the hand
 * @param words - what to type in Filter analyses
 * @param name - the analysis, as its row names it
 */
export async function runAnalysis(h, words, name) {
    const { page } = h;
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await page.getByRole("combobox", { name: "Filter analyses" }).fill(words);
    await page.getByRole("option", { name, exact: true }).click();
    await page.getByRole("button", { name: `Run ${name}` }).click();
    await page.getByText(`Color: ${name}`).first().waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: "Analyze" }).waitFor({ state: "hidden" });
}

/**
 * Run one analysis through Analyze (setup only), then let the drawing settle.
 * @param h - the hand
 * @param words - what to type in Filter analyses
 * @param name - the analysis, as its row names it
 */
export async function analyze(h, words, name) {
    await runAnalysis(h, words, name);
    await h.app.settled();
}

/**
 * The recorded path to an analysis: Analyze, the words typed in its filter, the row, Run.
 * @param h - the hand
 * @param words - what to type in Filter analyses
 * @param name - the analysis, as its row names it
 */
export async function analyzeOnCamera(h, words, name) {
    const { page } = h;
    await h.click("Analyze");
    await h.type(words); // Analyze opens with the cursor in Filter analyses
    await h.click(page.getByRole("option", { name, exact: true }));
    await h.click(page.getByRole("button", { name: `Run ${name}` }));
}

/**
 * The recorded path into the find box: a click on it, then the words typed.
 * @param h - the hand
 * @param words - what to type
 */
export async function typeInFind(h, words) {
    await h.click(h.page.getByRole("combobox", { name: "Find" }));
    await h.type(words);
}

/**
 * Where clip 1.3 ends: the bank flat, colored by Louvain community.
 * @param h - the hand
 */
export async function bankLouvain(h) {
    await bank2D(h);
    await analyze(h, "louv", "Louvain");
}

/**
 * Where clip 1.4 ends: the find-box rule has selected the 53 transfers of $9,000 or more.
 * @param h - the hand
 */
export async function bankRule(h) {
    const { page } = h;
    await bankLouvain(h);
    await page.getByRole("combobox", { name: "Find" }).fill("=amount >= 9000");
    await page.getByRole("combobox", { name: "Find" }).press("Enter");
    await page.getByText("53 edges selected").first().waitFor();
    await h.app.settled();
}

/**
 * Where clip 1.5 ends: the inspector lists Chicago address R's twelve accounts, and those 13 nodes
 * are selected. Reached the way the viewer saw: the account, its neighbors, the address, its
 * neighbors.
 * @param h - the hand
 */
export async function bankNeighborhood(h) {
    const { page } = h;
    const insp = page.getByRole("complementary", { name: "Inspector" });
    const a = await nodeBox(h, RING_ACCOUNT);
    await page.mouse.click(a.x + a.width / 2, a.y + a.height / 2);
    await insp.getByRole("heading", { name: RING_ACCOUNT }).waitFor();
    await insp.getByRole("button", { name: /^Degree / }).click();
    await insp.getByRole("button", { name: "Chicago address R" }).click();
    await insp.getByRole("heading", { name: "Chicago address R" }).waitFor();
    await insp.getByRole("button", { name: /^Degree / }).click();
    await insp.getByRole("group", { name: "Chicago address R and 12 connections" }).waitFor();
    await page.getByRole("treeitem", { name: /^Selected, .*\b13 nodes\b/ }).waitFor();
}

/**
 * Where clip 1.6 ends: a "Fraud ring" layer of those 13 nodes, colored red (made with the same
 * clicks clip 1.6 films, so the counts match).
 * @param h - the hand
 */
export async function bankRing(h) {
    const { page } = h;
    const insp = page.getByRole("complementary", { name: "Inspector" });
    await insp.getByRole("button", { name: "Neighborhood actions" }).click();
    await page.getByRole("menuitem", { name: "New layer from selection" }).click();
    const layer = page.getByRole("treeitem", { name: /^13 nodes, / });
    await layer.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByRole("textbox", { name: "Layer name" }).fill(RING_LAYER);
    await page.keyboard.press("Enter");
    await page.getByRole("treeitem", { name: new RegExp(`^${RING_LAYER}, `) }).waitFor();
    await insp.getByRole("tab", { name: "Style" }).click();
    await insp.getByRole("button", { name: "Add to node fill" }).click();
    await page.getByRole("menuitem", { name: "Color", exact: true }).click();
    const color = insp.getByRole("textbox", { name: /^Node color, / });
    await color.fill(RING_COLOR);
    await color.press("Enter");
    await clearSelection(h);
    await closeToasts(h);
}

/**
 * Nothing selected (setup only): the canvas menu's Clear selection.
 * @param h - the hand
 */
export async function clearSelection(h) {
    const { page } = h;
    await page.mouse.click(1560, 975, { button: "right" });
    await page.getByRole("menuitem", { name: "Clear selection" }).click();
    await page.getByRole("treeitem", { name: /^Selected, .*\b0 nodes, 0 edges/ }).waitFor();
}

/**
 * Close the app's notices ("Made a layer", "Selection cleared") so none sits in the next shot.
 * @param h - the hand
 */
export async function closeToasts(h) {
    const { page } = h;
    const dismiss = page.getByRole("button", { name: "Dismiss", exact: true });
    while (await dismiss.first().isVisible()) {
        const n = await dismiss.count();
        await dismiss.first().click();
        await dismiss.nth(n - 1).waitFor({ state: "detached" }); // one fewer notice
    }
    await h.app.closeToast();
}

/**
 * A layer's own eye in Style layers (setup only).
 * @param h - the hand
 * @param layer - the layer's name
 * @param show - true to show it, false to hide it
 */
export async function eye(h, layer, show) {
    const { page } = h;
    await page.getByRole("button", { name: `${show ? "Show" : "Hide"} ${layer}`, exact: true }).click();
    await page.getByRole("button", { name: `${show ? "Hide" : "Show"} ${layer}`, exact: true }).waitFor();
}

/**
 * The Everything layer open on its node style in the inspector (setup only).
 * @param h - the hand
 */
export async function everythingNodes(h) {
    const { page } = h;
    await page.getByRole("treeitem", { name: /^Everything, / }).click();
    await page.getByRole("complementary", { name: "Inspector" }).getByRole("tab", { name: "Style" }).click();
    await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Node/ }).click();
}

/**
 * The selected layer's edges, on the inspector's Edge tab, styled (setup only): Style edges on (it is
 * off on a layer made from nodes), then Line's color and width added and typed in.
 * @param h - the hand
 * @param color - the edge color, hex without "#"
 */
export async function edgeLine(h, color) {
    const { page } = h;
    const insp = page.getByRole("complementary", { name: "Inspector" });
    const styleEdges = insp.getByRole("checkbox", { name: "Style edges" });
    if (!(await styleEdges.isChecked())) await styleEdges.check();
    await insp.getByRole("button", { name: "Add to edge line" }).click();
    await page.getByRole("menuitem", { name: "Color", exact: true }).click();
    const field = insp.getByRole("textbox", { name: /^Edge color, / });
    await field.fill(color);
    await field.press("Enter");
    await insp.getByRole("button", { name: "Add to edge line" }).click();
    await page.getByRole("menuitem", { name: "Width", exact: true }).click();
    const width = insp.getByRole("spinbutton", { name: "Edge width" });
    await width.fill("60");
    await width.press("Enter");
}

/**
 * The Everything layer's node and edge colors set in the inspector (setup only): a pale field for
 * the ring to stand out on.
 * @param h - the hand
 * @param o - the colors, hex without "#"
 * @param o.node - the node color
 * @param o.edge - the edge color
 */
export async function paleEverything(h, { node, edge }) {
    const { page } = h;
    const insp = page.getByRole("complementary", { name: "Inspector" });
    await everythingNodes(h);
    const n = insp.getByRole("textbox", { name: /^Node color, set here/ });
    await n.fill(node);
    await n.press("Enter");
    await h.app.layerEdges("Everything", { color: edge });
}

/**
 * A brisker click than h.click, for clips whose real UI path has many steps: the same curved,
 * eased move at 0.7 of its time, then a short dwell and press at the point it reached, logged like
 * h.click (round 1's ch4 helper, kept here so round 2 does not depend on round 1's folders).
 * @param h - the hand
 * @param target - as for h.click
 */
export async function tap(h, target) {
    const { box } = await h.move(target, { slow: 0.7 });
    const { page, random: r } = h;
    await page.waitForTimeout(r.range(110, 170));
    const { x, y } = h.at;
    h.events.push({ t: Date.now(), type: "click", button: "left", x, y, box });
    await page.mouse.down();
    await page.waitForTimeout(r.range(60, 100));
    await page.mouse.up();
    await page.waitForTimeout(r.range(100, 160));
}
