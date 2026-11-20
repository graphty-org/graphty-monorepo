// Chapter 6, clip 2: Layout > Map, Fit World, puts every airport where it is; the routes arc over a globe.
import { FLIGHTS, mapOnCamera, setTransition, still, stillLayout } from "./map.js";

export default {
    id: "map-layout",
    chapter: 6,
    caption: "Data with places? Put every node where it belongs.",
    dataset: FLIGHTS,
    async setup(h) {
        // a still tangle: the live force layout would keep the page too busy to film smoothly
        await stillLayout(h, "Random");
        // a graph setting picked in the Map form: the airports glide to their places instead of jumping
        await setTransition(h.page, "Arc move", 5);
        await h.park({ x: 1120, y: 880 });
    },
    async run(h) {
        const { page } = h;
        const panel = await mapOnCamera(h);
        // Fit World frames the whole globe (the default leaves its top off screen), as clip 3 opens
        await h.click(panel.getByRole("combobox", { name: "Fit" }));
        await h.click(page.getByRole("option", { name: "World", exact: true }));
        await h.click(panel.getByRole("button", { name: "Apply" }));
        await panel.waitFor({ state: "hidden" }); // Apply closes the popover
        await h.move({ x: 1500, y: 840, width: 120, height: 80 }); // off the globe while they fly
        h.mark("flying");
        await still(page); // the flight is over and the satellite picture has come in
        h.mark("on the globe");
    },
    holdMs: 1800,
};
