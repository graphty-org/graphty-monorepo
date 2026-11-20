// Round 2, clip 4.3: the Shortest path layer's Edge width from 24 to 240: a thick route over pale
// routes, its four airports named (named in setup, so the clip is one action). Key moment: a 5 s
// hold, map still.
import { labelLayer } from "../r2-2-alzheimer/alz.js";
import { FLIGHTS, flightsMap, inspector, sydneyToKeflavik } from "./flights.js";

const WIDTH = "240";

export default {
    id: "thick-path",
    chapter: 4,
    caption: "Make the route bold",
    dataset: FLIGHTS,
    async setup(h) {
        const { page } = h;
        await flightsMap(h);
        await sydneyToKeflavik(h);
        await labelLayer(h, "Shortest path", { column: "label", px: "22" });
        // the path's layer open on its edge style, as a person would have it after finding the path
        await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Edge/ }).click();
        await inspector(page).getByRole("spinbutton", { name: "Edge width" }).waitFor();
        await h.app.settled();
        await h.park({ x: 1500, y: 700 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        const width = inspector(page).getByRole("spinbutton", { name: "Edge width" });
        await h.click(width);
        await h.press("Control+A");
        await h.type(WIDTH);
        await h.press("Enter");
        await h.move({ x: 1540, y: 900, width: 100, height: 60 }); // off the panel for the hold
        h.mark("bold");
    },
    holdMs: 5000,
};
