// Chapter 6, clip 4: the Map field swaps the picture under the routes: from the satellite picture the
// app chose, to a plain map, to a terrain map.
import { FLIGHTS, layoutPanel, onMap, openMapForm, still } from "./map.js";

// The plan's three picks (gray, Blue Marble, OpenTopoMap) ran 15 s or more; the satellite picture
// is already under the routes when the clip starts, so two picks show all three kinds. Plain
// Natural Earth, not its gray: the gray is so faint that it reads as no map at all.
const BEATS = ["Natural Earth", "OpenTopoMap"];

/**
 * Scroll an open list until an entry is fully in its view, then wait until the list rests: one
 * wheel turn brings it in, small ones correct any shortfall, and the browser's smooth scrolling
 * keeps the list gliding after the wheel.
 * @param h - the hand
 * @param option - the entry
 * @param list - the list's scrolling box
 */
async function scrollInto(h, option, list) {
    for (let turn = 0; ; turn++) {
        await h.app.frames(6);
        const [box, view] = [await option.boundingBox(), await list.boundingBox()];
        // 28 px: the list shows scroll arrows over its top and bottom edges
        const below = box.y + box.height + 28 - (view.y + view.height);
        const above = view.y + 28 - box.y;
        if (below <= 0 && above <= 0) break;
        const dy = below > 0 ? below : -above;
        await h.scroll(list, turn === 0 ? dy : Math.sign(dy) * 60, { ms: turn === 0 ? 450 : 200 });
    }
    for (let last = null; ;) {
        const box = await option.boundingBox();
        if (last && Math.abs(last.y - box.y) < 0.5) break;
        last = box;
        await h.app.frames(6);
    }
}

export default {
    id: "map-styles",
    chapter: 6,
    // the plan's caption named street maps, which this clip does not show
    caption: "Satellite, plain or terrain maps underneath.",
    dataset: FLIGHTS,
    async setup(h) {
        await onMap(h, { flat: true });
        // pan the map up, so the Map form (over the bottom middle) covers the empty south, not land
        const { page } = h;
        const box = await page.getByRole("region", { name: "Graph drawing" }).boundingBox();
        // grabbed in the south, below every airport: a press on a node would drag the node instead
        const [x, y] = [box.x + box.width / 2, box.y + box.height * 0.85];
        await page.mouse.move(x, y);
        await page.mouse.down();
        for (let i = 1; i <= 20; i++) await page.mouse.move(x, y - 9 * i);
        await page.mouse.up();
        await h.app.settled();
        await openMapForm(h.page); // the Layout popover open on the Map form
        await h.park({ x: 1180, y: 900 });
    },
    async run(h) {
        const { page } = h;
        const panel = layoutPanel(page);
        for (const name of BEATS) {
            await h.click(panel.getByRole("combobox", { name: "Map" }));
            const option = page.getByRole("option", { name, exact: true });
            // the list's scrolling box (the listbox itself is as tall as all its entries)
            const list = option.locator("xpath=ancestor::*[contains(@class, 'dropdown')][1]");
            await h.waitFor(option);
            await scrollInto(h, option, list);
            await h.click(option);
            h.mark(name);
            await still(page); // the new map has come in, every tile of it
            if (name !== BEATS.at(-1)) await h.pause(700); // a look at it before the next pick
        }
    },
    holdMs: 1800,
};
