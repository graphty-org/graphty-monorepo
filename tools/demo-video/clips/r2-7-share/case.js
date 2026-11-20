// Round 2, chapter 7 ("Share what you found"): the bank case as chapters 1 and 3 leave it, built in
// setup (not recorded) through the app's own UI. A .js file, so record.mjs does not take it for a clip.
import { BANK_CLIP, closeToasts, eye } from "../r2-1-fraud-ring/bank.js";
import { bankCase as chapterOneCase, betweenness } from "../r2-3-follow-money/money.js";

/** Every chapter 7 clip films the bank data. */
export const CASE_CLIP = { ...BANK_CLIP, chapter: 7 };

/**
 * The bank case: chapter 1's end state (Louvain hidden, a red "Fraud ring" layer, the rest pale),
 * the project named "Bank case" (an exported project's file takes the name) and autosaved.
 *
 * Betweenness is run only where asked (its results are columns a data export carries): a project
 * exported with a Betweenness run in it reopens with most of its nodes not drawn (an app defect,
 * reported with the chapter 7 takes), so the clip that sends the project leaves it out.
 * @param h - the hand
 * @param [o] - options
 * @param [o.betweenness] - true to run Betweenness and hide its layer
 */
export async function bankCase(h, { betweenness: withBetweenness = false } = {}) {
    const { page } = h;
    await chapterOneCase(h);
    if (withBetweenness) {
        await betweenness(h);
        await eye(h, "Betweenness", false);
        await closeToasts(h);
    }
    await page.getByRole("button", { name: "Main menu" }).click();
    await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
    const title = page.locator("input:focus");
    await title.fill("Bank case");
    await title.press("Enter");
    await page.getByText("Bank case", { exact: true }).first().waitFor();
    await page.getByText("Autosave: saved").waitFor();
    await h.app.settled();
}
