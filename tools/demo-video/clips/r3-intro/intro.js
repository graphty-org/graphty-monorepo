// Round 3, the intro: what its takes share. A .js file, so record.mjs does not take it for a clip.
// The intro is cut full-bleed from the canvas alone (assemble.mjs `bleed`), so these takes are made
// for that crop: a dark canvas, larger nodes, no legend, and the hand resting on the layer panel,
// outside the crop, whenever it is not working. Setup only, through the app's own UI.
import { analyze, BANK, eye } from "../r2-1-fraud-ring/bank.js";
import { hideLegend, inspector } from "../r2-5b-and-more/more.js";

/**
 * Intro takes leave the cosmograph experiment off: with it on, a 2D/3D switch re-lays the graph
 * from a jumble of giant spheres, and 2D draws no edges (README.md, "Known app defects"). And
 * file-styles off, as for every bank clip.
 */
export const INTRO_CLIP = { chapter: 0, featuresOff: ["file-styles", "cosmograph"] };

/** The canvas color for the intro: the stage's deep navy, so saturated nodes glow. */
export const DARK = "0B1020";

/** Where the hand rests: the layer panel, left of the canvas crop. */
export const OFF_CANVAS = { x: 120, y: 620, width: 80, height: 60 };

/**
 * A take that only turns: the camera's Auto-rotate (key 9, no badge), held while it turns. The
 * hand is parked off screen in setup.
 */
export const TURNING = {
    leadMs: 400,
    async run(h) {
        await h.press("9");
        h.mark("turning");
    },
    holdMs: 6000,
};

/**
 * The canvas background set in Graph settings (setup only).
 * @param page - the Playwright page
 * @param color - hex without "#"
 */
export async function canvasColor(page, color = DARK) {
    await page.getByRole("button", { name: "Graph settings" }).click();
    const bg = page.getByRole("textbox", { name: /^Background color, set here/ });
    await bg.fill(color);
    await bg.press("Enter");
    await page.keyboard.press("Escape");
}

/**
 * Everything's node size, typed in its Style tab (setup only).
 * @param page - the Playwright page
 * @param size - the size ("1.8")
 */
export async function everythingSize(page, size) {
    await page.getByRole("treeitem", { name: /^Everything, / }).click();
    await inspector(page).getByRole("tab", { name: "Style" }).click();
    const field = page.getByRole("spinbutton", { name: "Node size" });
    await field.fill(size);
    await field.press("Enter");
}

/**
 * The bank, flat and settled, colored by Louvain community, on the dark canvas with larger nodes
 * and no legend (setup only).
 * @param h - the hand
 * @param o - options
 * @param [o.colors] - false to leave the Louvain folder hidden (one node color until the run shows it)
 * @param [o.flat] - false to leave it in 3D, as it opens (with the table closed)
 */
export async function bankIntro(h, { colors = true, flat = true } = {}) {
    const { page } = h;
    await h.app.openFile(h.file(BANK));
    if (flat) await h.app.ready2D();
    else {
        await page.getByRole("button", { name: "Table", exact: true, pressed: true }).click();
        await page.getByRole("button", { name: "Table", exact: true, pressed: false }).waitFor();
        await h.app.settled();
    }
    await analyze(h, "louv", "Louvain");
    await hideLegend(page);
    await canvasColor(page);
    await everythingSize(page, "1.2");
    if (!colors) await eye(h, "Louvain", false);
    await h.app.settled();
}
