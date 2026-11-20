// Chapter 6, clip 3: the key 5 (Mode > 2D) turns the globe into a flat world map under the same routes.
import { FLIGHTS, onMap, still } from "./map.js";

export default {
    id: "flat-map",
    chapter: 6,
    caption: "Prefer it flat? One key turns the globe into a map.",
    dataset: FLIGHTS,
    async setup(h) {
        await onMap(h); // the globe, as the last clip left it
        await h.park({ x: 1130, y: 870 }); // near the toolbar: the clip is about the result, not the trip
    },
    async run(h) {
        const { page } = h;
        // 5 is Mode > 2D's key; the badge shows it beside the Mode button
        await h.shortcut("5", { near: page.getByRole("button", { name: /^Mode, / }), label: "2D" });
        await page.getByRole("button", { name: "Mode, 2D" }).waitFor();
        await h.move({ x: 1520, y: 880, width: 100, height: 60 });
        h.mark("flat");
        await still(page); // the satellite picture has come in under the flat map
        h.mark("tiles in");
    },
    holdMs: 1800,
};
