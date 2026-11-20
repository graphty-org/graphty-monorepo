// Intro setup steps (not a clip: the recorder loads only .mjs files as clips). Before recording, through
// the start page's own buttons only.

/**
 * The start page's graph (graphty-element on the start page).
 * @param page - the page
 * @returns its locator
 */
export const hero = (page) => page.locator("graphty-element[data-start-page]");

/**
 * A start page chip ("Communities", "Key players", "2D").
 * @param page - the page
 * @param name - the chip's name
 * @returns its locator
 */
export const chip = (page, name) =>
    page.getByRole("toolbar", { name: "Analyze the graph" }).getByRole("button", { name, exact: true });

/**
 * The start page flat and still: the turning paused, the 2D chip pressed, the drawing settled.
 * Communities is on when the page loads.
 * @param h - the hand
 */
export async function flatStart(h) {
    const { page } = h;
    const pause = page.getByRole("button", { name: "Pause the turning" });
    await chip(page, "Communities").click({ trial: true }); // waits until the chips are enabled (the graph is in)
    if (await pause.isVisible()) await pause.click();
    await chip(page, "2D").click();
    await h.app.settled(hero(page));
}
