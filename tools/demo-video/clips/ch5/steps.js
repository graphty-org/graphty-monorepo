/**
 * Setup steps the chapter 5 clips share. Not a clip: a .js file, so record.mjs (which loads every
 * .mjs under clips/ as a clip) skips it. These run before recording and click straight through the
 * app's own UI with Playwright, as lib/app.mjs does.
 */

/**
 * Toolbar Analyze > Louvain > Run: the graph colored by group, as chapter 4 leaves it.
 * @param page - the Playwright page
 */
export async function colorByGroup(page) {
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    const option = page.getByRole("dialog", { name: "Analyze" }).getByRole("option", { name: "Louvain", exact: true });
    await option.scrollIntoViewIfNeeded();
    await option.click();
    await page.getByRole("button", { name: "Run Louvain" }).click();
    await page.getByText("Color: Louvain").waitFor();
}

/**
 * Path between... (P): From and To typed and picked, then Find path. The path's layer is left selected.
 * @param page - the Playwright page
 * @param from - the first character's name
 * @param to - the last character's name
 */
export async function findPath(page, from, to) {
    await page.keyboard.press("p");
    for (const [field, name] of [
        ["Where the path starts", from],
        ["Where the path ends", to],
    ]) {
        await page.getByPlaceholder(field).click();
        await page.keyboard.type(name);
        await page
            .getByRole("option", { name: new RegExp(String.raw`^${name}\b`) })
            .first()
            .click();
    }
    await page.getByRole("button", { name: "Find path" }).click();
    await page.getByRole("treeitem", { name: /^Shortest path, / }).waitFor();
}

/**
 * The inspector (the right panel).
 * @param page - the Playwright page
 * @returns its locator
 */
export const inspector = (page) => page.getByRole("complementary", { name: "Inspector" });

/**
 * Reload the start page with some experiments left off, then open a sample. For a clip whose take is
 * wrong with an experiment on (the app is opened with every experiment on before setup). Set no
 * `dataset` on such a clip: this opens it. The usage question was answered before the reload; the
 * notice is closed again if it shows.
 * @param h - the hand
 * @param off - experiment ids to leave off ("cosmograph")
 * @param sample - the Samples card to open
 */
export async function reopenWithout(h, off, sample) {
    const url = new URL(h.page.url());
    const on = (url.searchParams.get("features") ?? "").split(",").filter((id) => id !== "" && !off.includes(id));
    url.searchParams.set("features", on.join(","));
    await h.page.goto(url.href);
    await h.page.getByRole("button", { name: /^Open a file/ }).waitFor();
    const noThanks = h.page.getByRole("button", { name: "No thanks" });
    if (await noThanks.isVisible()) await noThanks.click();
    await h.app.closeToast();
    await h.app.openSample(sample);
}
