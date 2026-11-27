// Round 6, group 3 (layouts, algorithms, data management, maps): what the "data-" clips share. A
// .js file, so record.mjs does not take it for a clip. Setup only, through the app's own UI.
import { nodeBox } from "../r2-1-fraud-ring/bank.js";
import { hideLegend } from "../r2-5b-and-more/more.js";

export { nodeBox } from "../r2-1-fraud-ring/bank.js";
export { closeLayout, hideLegend, inspector, layoutPanel, pickLayout, setTransition } from "../r2-5b-and-more/more.js";

/** Where the hand rests after a beat: the canvas's empty lower right, off the graph. */
export const REST = { x: 1460, y: 900, width: 100, height: 60 };

/** Prepared files for these clips, under tools/demo-video/data (r6-data/LICENSES.md says what they are). */
export const MESSY = "r6-data/les-miserables-links-messy.csv";
export const BORDERS = "r6-data/europe-borders.json";

/**
 * The start page's Generate a graph card, its form filled and generated (setup only); waits until
 * the graph is in.
 * @param h - the hand
 * @param name - the card ("Balanced tree")
 * @param [fields] - the form's text fields to fill, by label
 */
export async function generate(h, name, fields = {}) {
    const { page } = h;
    await page.getByRole("button", { name: `Generate a graph: ${name}` }).click();
    const form = page.getByRole("dialog", { name });
    for (const [label, value] of Object.entries(fields))
        await form.getByRole("textbox", { name: label }).fill(String(value));
    await form.getByRole("button", { name: "Generate" }).click();
    await h.app.opened();
    await h.app.closeToast();
}

/**
 * The start page's Open network data, then one kind's form (setup only).
 * @param h - the hand
 * @param kind - the kind's card, from its start ("Neo4j", "SPARQL")
 * @returns the Network data form's dialog
 */
export async function networkForm(h, kind) {
    const { page } = h;
    await page.getByRole("button", { name: "Open network data" }).click();
    await page
        .getByRole("dialog", { name: "Open network data" })
        .getByRole("button", { name: new RegExp(`^${kind}`) })
        .click();
    const form = page.getByRole("dialog", { name: "Network data" });
    await form.waitFor();
    return form;
}

/**
 * A node's drawn box found by an attribute's value through graphty-element's public getNodes (setup
 * only: the clip itself only moves and clicks).
 * @param h - the hand
 * @param key - the attribute ("title")
 * @param value - its value ("The Green Mile")
 * @returns the box
 */
export async function nodeWhere(h, key, value) {
    const id = await h.page.evaluate(
        ([k, v]) =>
            globalThis.document
                .querySelector("graphty-element")
                .getNodes()
                .find((n) => n.data?.[k] === v)?.id,
        [key, value],
    );
    if (id === undefined) throw new Error(`no node with ${key} ${value}`);
    return nodeBox(h, id);
}

/**
 * Wait until a loaded graph is in: the status bar counts its nodes. (A network source opens on the
 * Data place, where lib/app.mjs's opened() finds no Everything row.)
 * @param h - the hand
 */
export async function counted(h) {
    await h.page
        .getByText(/\b[1-9][\d,]* nodes, [\d,]+ edges\b/)
        .first()
        .waitFor();
}

/**
 * The left panel on the Data place (setup only).
 * @param h - the hand
 */
export async function dataPlace(h) {
    await h.page.getByRole("button", { name: "Data", exact: true }).click();
    await h.page.getByRole("region", { name: "Data place" }).waitFor();
}

/**
 * The opened graph flat, settled and framed, the legend hidden and notices closed (setup only).
 * @param h - the hand
 */
export async function flat(h) {
    await h.app.ready2D();
    await hideLegend(h.page);
    await h.app.closeToast();
}
