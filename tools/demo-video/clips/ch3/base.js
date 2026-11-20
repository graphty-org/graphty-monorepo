// Chapter 3's shared starting state (a .js file, so record.mjs does not take it for a clip): Les
// Miserables in 2D, colored by Louvain group, with layout changes set to glide. Setup only, never
// recorded, and only through the app's own UI.
//
// Like chapters 2 and 4, chapter 3 is filmed with the cosmograph experiment off (ch2/stage.js says
// why): with it on, 2D draws no edges, and a layout without its edges does not read as a layout.
import { analyze, stage } from "../ch2/stage.js";

export { nodeBox } from "../ch2/stage.js";

/** Glide time for a layout change, so the move is seen. */
const GLIDE_SECONDS = "1.6";

/**
 * Open a layout's form from the toolbar's Layout list (setup pace).
 * @param page - the Playwright page
 * @param row - the row's accessible name, from its start (e.g. /^Circle Places/)
 */
async function openLayout(page, row) {
    await page.getByRole("button", { name: "Layout", exact: true }).click();
    await page.getByRole("option", { name: row }).first().click();
}

/**
 * Apply a layout through its form and wait for the drawing to settle (setup pace).
 * @param h - the hand
 * @param row - the row's accessible name, from its start
 */
export async function applyLayout(h, row) {
    const { page } = h;
    await openLayout(page, row);
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByRole("dialog", { name: "Layout" }).waitFor({ state: "hidden" });
    await h.app.settled();
    await h.app.camera("Fit");
    await h.app.settled();
}

/**
 * Les Miserables in 2D, fitted, colored by Louvain group; the graph's layout Transition set to
 * Glide (a graph setting the Layout form writes at once, so nothing is applied here).
 * @param h - the hand
 */
export async function base(h) {
    const { page } = h;
    await stage(h);
    await analyze(h, "Louvain", "Louvain");
    await openLayout(page, /^Circle Places/);
    await page.getByRole("combobox", { name: "Transition" }).click();
    await page.getByRole("option", { name: "Glide", exact: true }).click();
    await page
        .getByRole("textbox", { name: "Seconds" })
        .or(page.getByRole("spinbutton", { name: "Seconds" }))
        .fill(GLIDE_SECONDS);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: "Layout" }).waitFor({ state: "hidden" });
    await h.app.settled();
}

export { pickLayout } from "../r2-5b-and-more/more.js";
