// "And more", beat 10: the airline routes on the globe; the Map list swaps the picture under them:
// from the plain gray map to NASA's satellite Blue Marble, then to OpenTopoMap's terrain.
import { FLIGHTS, layoutPanel, onMap, openMapForm, still } from "../ch6/map.js";
import { MORE } from "./more.js";

const BEATS = ["NASA Blue Marble", "OpenTopoMap"];

/**
 * Scroll an open list until an entry is fully in its view, then wait until the list rests: one
 * wheel turn brings it in, small ones correct any shortfall (the browser's smooth scrolling keeps
 * the list gliding after the wheel).
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
    chapter: MORE,
    caption: "Satellite and terrain maps",
    dataset: FLIGHTS,
    async setup(h) {
        await onMap(h, { map: "Natural Earth gray" });
        await openMapForm(h.page); // the Layout popover open on the Map form
        await still(h.page);
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 500,
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
            await still(page); // every tile of the new map is in
            if (name !== BEATS.at(-1)) await h.pause(700);
        }
    },
    holdMs: 1800,
};
