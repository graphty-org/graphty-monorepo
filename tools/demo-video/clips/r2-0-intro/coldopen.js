// Round 2 intro (cold open): the end states of chapters 1 and 2, built in setup by the same steps
// the viewer sees later, so every count on screen matches. A .js file, so record.mjs does not take
// it for a clip.
import {
    bankLouvain,
    bankNeighborhood,
    bankRing,
    closeToasts,
    eye,
    nodeBox,
    paleEverything,
    RING_ADDRESS,
    RING_LAYER,
    zoomToward,
} from "../r2-1-fraud-ring/bank.js";

/**
 * Where the hand waits between the two bank shots: on the Fraud ring row (y 232-264), just left of
 * its eye, not over the row's lock button (whose tooltip would show).
 */
export const NEAR_EYE = { x: 168, y: 242, width: 30, height: 12 };

/**
 * The bank with its Fraud ring layer made and hidden, communities hidden, every other node pale
 * gray: the first frame of the video.
 * @param h - the hand
 */
export async function darkRing(h) {
    const { page } = h;
    await bankLouvain(h);
    await bankNeighborhood(h);
    await bankRing(h);
    await ringBold(h);
    await eye(h, "Louvain", false);
    await paleEverything(h, { node: "D4D4D8", edge: "E4E4E4" });
    await eye(h, RING_LAYER, false);
    // the inspector back on the ring layer, so the panel shows what the eye is about to turn on
    await page.getByRole("treeitem", { name: new RegExp(`^${RING_LAYER}, `) }).click();
    await closeToasts(h);
    await zoomToward(h, RING_ADDRESS, 4);
}

/**
 * The Fraud ring layer made to read at a glance at video size (setup only): its nodes three times
 * larger and its edges (the twelve accounts to their shared address) red and wide.
 * @param h - the hand
 */
async function ringBold(h) {
    const { page } = h;
    const insp = page.getByRole("complementary", { name: "Inspector" });
    await page.getByRole("treeitem", { name: new RegExp(`^${RING_LAYER}, `) }).click();
    await insp.getByRole("tab", { name: "Style" }).click();
    const forTabs = page.getByRole("tablist", { name: "Style for" });
    await forTabs.getByRole("tab", { name: /^Node/ }).click();
    await insp.getByRole("button", { name: "Add to node shape" }).click();
    await page.getByRole("menuitem", { name: "Size", exact: true }).click();
    const size = insp.getByRole("spinbutton", { name: "Node size" });
    await size.fill("3");
    await size.press("Enter");
    await forTabs.getByRole("tab", { name: /^Edge/ }).click();
    const styleEdges = insp.getByRole("checkbox", { name: "Style edges" }); // off on a layer made from nodes
    if (!(await styleEdges.isChecked())) await styleEdges.check();
    await insp.getByRole("button", { name: "Add to edge line" }).click();
    await page.getByRole("menuitem", { name: "Color", exact: true }).click();
    const color = insp.getByRole("textbox", { name: /^Edge color, / });
    await color.fill(RING_COLOR_HEX);
    await color.press("Enter");
    await insp.getByRole("button", { name: "Add to edge line" }).click();
    await page.getByRole("menuitem", { name: "Width", exact: true }).click();
    const width = insp.getByRole("spinbutton", { name: "Edge width" });
    await width.fill("60");
    await width.press("Enter");
    await forTabs.getByRole("tab", { name: /^Node/ }).click(); // focus off the fields
}

/** The ring's red as hex, for the edge color field. */
const RING_COLOR_HEX = "FF0000";

/**
 * The shared address on screen, as a box the hand can scroll over (setup only).
 * @param h - the hand
 * @returns its box
 */
export const ringCenter = (h) => nodeBox(h, RING_ADDRESS);
