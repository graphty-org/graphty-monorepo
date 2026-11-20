// Round 2, chapter 5 ("Go big"): BioPlex 3.0, 10,251 human proteins, set up the same way for every
// clip. A .js file, so record.mjs does not take it for a clip. Setup only, through the app's own UI.
//
// The script planned to open BioPlex at the positions saved in its file. The recording build does not
// use them: the sample's x and y columns are read as plain columns, the graph opens as a ball and runs
// Force in 3D (about 8 minutes to rest, a hairball), Layout > Keep positions keeps the ball, and Data
// has no role for x and y (app defect, reported). So setup lays the network out with ForceAtlas2 in 2D,
// LinLog mode, 1,000 iterations (about 4 minutes, never on camera) on a dark canvas, where edges that
// overlap add up to light.

import { analyze } from "../r2-1-fraud-ring/bank.js";
import { fitToCenter } from "../r2-2-alzheimer/alz.js";
import { hideLegend } from "../r2-5b-and-more/more.js";

/** Chapter 5. */
export const BIG_CLIP = { chapter: 5 };

/**
 * ForceAtlas2 for BioPlex. The app's default (100 iterations, plain attraction) stops while the
 * network is still a ball; LinLog mode with more iterations pulls the protein complexes apart, as
 * Gephi users run it.
 */
export const FA2 = { numbers: { "Max iterations": 1000 }, checks: ["LinLog mode"] };

/** Wheel notches in from Fit (none: Fit frames the LinLog drawing well). */
export const ZOOM_IN = 0;

/** Where the hand rests: the canvas's empty lower right, off the network. */
export const REST = { x: 1460, y: 900, width: 100, height: 60 };

/**
 * The inspector (the right panel).
 * @param page - the Playwright page
 * @returns its locator
 */
export const inspector = (page) => page.getByRole("complementary", { name: "Inspector" });

/**
 * The Edge line settings sheet.
 * @param page - the Playwright page
 * @returns its locator
 */
export const lineSheet = (page) => page.getByRole("dialog", { name: "Edge line" });

/**
 * BioPlex laid out flat by ForceAtlas2 (LinLog) on a dark canvas, colored by Louvain community,
 * edges at 6% opacity in their source node's color (so only where many overlap is it bright), no
 * arrowheads, legend hidden; the Everything layer open on its Edge tab.
 * @param h - the hand
 * @param o - the edge look
 * @param [o.blending] - "On" or "Off" (the app's default is On)
 * @param [o.fadeEnd] - a Fade end in screen pixels, or none
 * @param [o.layout] - ForceAtlas2's form values: { numbers: { label: value }, checks: [label] }
 * @param [o.zoomIn] - wheel notches in from Fit
 */
export async function bioplex(h, { blending = "On", fadeEnd, layout = FA2, zoomIn = ZOOM_IN } = {}) {
    const { page } = h;
    await page.getByRole("button", { name: "Samples", exact: true }).click();
    await page.getByRole("button", { name: "Biology", exact: true }).click();
    await page
        .getByRole("button", { name: /^Open the BioPlex/ })
        .last()
        .click();
    await page.getByRole("button", { name: "Open", exact: true }).click();
    await page.getByRole("treeitem", { name: /^Everything, .*\b10,251 nodes\b/ }).waitFor();
    await h.app.mode("2D");
    await page.getByRole("button", { name: "Layout", exact: true }).click();
    await page
        .getByRole("option", { name: /^ForceAtlas2\b/ })
        .first()
        .click();
    const form = page.getByRole("form", { name: "ForceAtlas2" });
    for (const [name, v] of Object.entries(layout.numbers)) {
        const f = form.getByRole("spinbutton", { name, exact: true });
        await f.fill(String(v));
        await f.press("Tab"); // Enter would apply the form before the rest is set
    }
    for (const name of layout.checks) await form.getByRole("checkbox", { name, exact: true }).check();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await h.app.settled();
    await page.getByRole("button", { name: "Graph settings" }).click();
    const bg = page.getByRole("textbox", { name: /^Background color, set here/ });
    await bg.fill("0B1020");
    await bg.press("Enter");
    await page.keyboard.press("Escape");
    // each protein colored by its Louvain community, and each edge by its source protein, so the
    // communities read as colored regions of the network
    await analyze(h, "louv", "Louvain");
    await hideLegend(page);
    await page.getByRole("treeitem", { name: /^Everything, / }).click();
    await inspector(page).getByRole("tab", { name: "Style" }).click();
    const size = page.getByRole("spinbutton", { name: "Node size" });
    await size.fill("0.3");
    await size.press("Enter");
    await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Edge/ }).click();
    await page.getByRole("button", { name: "Edge line settings" }).click();
    const d = lineSheet(page);
    const col = d.getByRole("button", { name: "Remove edge color", exact: true });
    if (await col.isVisible()) await col.click();
    await d.getByRole("button", { name: "Add edge color from node" }).click();
    await d.getByRole("button", { name: "Add edge opacity" }).click();
    const op = d.getByRole("spinbutton", { name: "Edge opacity" });
    await op.fill("6");
    await op.press("Enter");
    if (blending !== "On") {
        await d.getByRole("button", { name: "Add edge blending" }).click();
        await d.getByRole("combobox", { name: /^Edge blending/ }).click();
        await page.getByRole("option", { name: blending, exact: true }).click();
    }
    if (fadeEnd) {
        await d.getByRole("button", { name: "Add edge fade end" }).click();
        const fe = d.getByRole("spinbutton", { name: "Edge fade end" });
        await fe.fill(String(fadeEnd));
        await fe.press("Enter");
    }
    await d.getByRole("button", { name: "Close Edge line" }).click();
    await d.waitFor({ state: "hidden" });
    // no arrowheads: 75,346 small triangles at full opacity swamp the faint edges (and BioPlex's
    // bait-to-prey direction says nothing to a viewer)
    await page.getByRole("button", { name: "Edge ends settings" }).click();
    const ends = page.getByRole("dialog", { name: "Edge ends" });
    await ends.getByRole("button", { name: "Add edge target", exact: true }).click();
    await ends.getByRole("button", { name: /^Edge target end, / }).click();
    await page.getByRole("option", { name: "None", exact: true }).click();
    await ends.getByRole("button", { name: "Close Edge ends" }).click();
    await ends.waitFor({ state: "hidden" });
    // wheel notches in from Fit, if any (from the canvas center)
    await fitToCenter(h);
    for (let i = 0; i < zoomIn; i++) {
        await page.mouse.wheel(0, -100);
        await h.app.frames(5);
    }
    await h.app.settled();
}

/**
 * Recorded: the Edge line sheet's setting added and set (the hand).
 * @param h - the hand
 * @param name - the setting after "Add edge " ("fade end")
 * @param value - what to type
 */
export async function addLineSetting(h, name, value) {
    const { page } = h;
    await h.click(page.getByRole("button", { name: "Edge line settings" }));
    const d = lineSheet(page);
    await h.click(d.getByRole("button", { name: `Add edge ${name}` }));
    const field = d.getByRole("spinbutton", { name: `Edge ${name}` });
    await h.click(field);
    await h.press("Control+a");
    await h.type(value);
    await h.press("Enter");
    await h.click(d.getByRole("button", { name: "Close Edge line" }));
}
