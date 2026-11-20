/**
 * Chapter 9's shared starting state, "the styled Les Miserables graph": colored by Louvain group and
 * sized by Betweenness, with its legend on the canvas. Setup only (not recorded), and only through
 * the app's own UI. A .js file, not .mjs, because record.mjs loads every .mjs under clips/ as a clip.
 */

/**
 * Run one analysis from the toolbar's Analyze list.
 * @param page - the Playwright page
 * @param name - the analysis, as the list names it
 */
async function analyze(page, name) {
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    const panel = page.getByRole("dialog", { name: "Analyze" });
    await panel.getByRole("option", { name, exact: true }).click();
    await page.getByRole("button", { name: `Run ${name}` }).click();
    await page.getByRole("treeitem", { name: new RegExp(`^${name}, `) }).waitFor();
}

/**
 * Betweenness, then Louvain (its colors win), the Betweenness layer hidden and node size by
 * Betweenness; waits until the legend shows them and the drawing is still.
 * @param h - the hand
 * @param [o] - options
 * @param [o.size] - false: Louvain colors only. A project sized by Betweenness reopens with every
 *   character whose Betweenness is 0 missing from the drawing (an app defect), so the clips that
 *   reopen a project leave size alone.
 */
export async function styled(h, { size = true } = {}) {
    const { page } = h;
    const legend = page.getByRole("region", { name: "Legend" });
    if (size) await analyze(page, "Betweenness");
    await analyze(page, "Louvain");
    if (size) {
        await page.getByRole("button", { name: "Hide Betweenness" }).click();
        await page.getByRole("treeitem", { name: /^Everything, / }).click();
        await page.getByRole("button", { name: "Node size by attribute" }).click();
        await page.getByRole("option", { name: /^Betweenness, / }).click();
        await legend.getByRole("group", { name: "Size: Betweenness" }).waitFor();
    }
    await legend.getByRole("group", { name: "Color: Louvain" }).waitFor();
    await h.app.closeToast();
    await h.app.settled();
}

/**
 * Main menu, then one of its items.
 * @param page - the Playwright page
 * @param item - the menu item's name
 */
export async function mainMenu(page, item) {
    await page.getByRole("button", { name: "Main menu" }).click();
    await page.getByRole("menuitem", { name: item, exact: true }).click();
}

/**
 * Views, Save camera, renamed; its card folded so the list stays short. Leaves the Views place open.
 * @param page - the Playwright page
 * @param name - the camera's name
 */
export async function saveCamera(page, name) {
    await page.getByRole("button", { name: "Views", exact: true }).click();
    await page.getByRole("button", { name: "Save camera" }).click();
    await page.getByRole("textbox", { name: "Rename Camera 1" }).fill(name);
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: `Collapse ${name}` }).click();
    await page.getByRole("button", { name: `More for ${name}` }).waitFor();
}
