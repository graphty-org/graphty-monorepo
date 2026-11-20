// Round 2, chapter 4 ("Show what you found"): the flights setup that clips 4.2 and 4.3 share. A .js
// file, so record.mjs does not take it for a clip. Setup only, through the app's own UI.
import { onMap } from "../ch6/map.js";

export { FLIGHTS } from "../ch6/map.js";

/**
 * The inspector (the right panel).
 * @param page - the Playwright page
 * @returns its locator
 */
export const inspector = (page) => page.getByRole("complementary", { name: "Inspector" });

/**
 * OpenFlights on a flat gray world map, every route drawn pale so a found route stands out, framed
 * on the inhabited world; focus left where a typed P reaches the app.
 * @param h - the hand
 */
export async function flightsMap(h) {
    const { page } = h;
    await onMap(h, { map: "Natural Earth gray", flat: true });
    await h.app.layerEdges("Everything", { color: "E4E4E4" });
    // one wheel notch in, toward the north: the inhabited world fills the frame, not Antarctica
    const box = await page.getByRole("region", { name: "Graph drawing" }).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.36);
    await page.mouse.wheel(0, -100);
    await h.app.settled();
}

/**
 * Where clip 4.2 ends: Path between... from Sydney to Keflavik, found (setup only).
 * @param h - the hand
 */
export async function sydneyToKeflavik(h) {
    const { page } = h;
    await page.keyboard.press("p");
    const form = page.getByRole("form", { name: "Shortest path" });
    await form.waitFor();
    await page.keyboard.type("Sydney");
    await form.getByRole("option", { name: /^Sydney Kingsford Smith/ }).click();
    await page.keyboard.type("Keflavik");
    await form.getByRole("option", { name: /^Keflavik International/ }).click();
    await form.getByRole("button", { name: "Find path" }).click();
    await page.getByRole("treeitem", { name: /^Shortest path, / }).waitFor();
    await h.app.settled();
}
