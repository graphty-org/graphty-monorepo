// Chapter 4, clip 3: a Label from the name column. The Default look is the clearest: every boxed
// look (Dark and the rest) draws the letters smaller to fit its padding, and changing the look
// took four more clicks through small inspector targets, so the clip ends on the names.
import { base, hideLegend, nodeBox, tap, zoomIn } from "./base.js";

export default {
    id: "labels",
    chapter: 4,
    caption: "Show names from any column.",
    dataset: "Les Miserables",
    async setup(h) {
        await base(h);
        // this chapter's last clip turns the legend on; here it would cover names
        await hideLegend(h);
        // a little closer, toward Valjean's busy middle, so the names read in the video
        const v = await nodeBox(h, "Valjean");
        await zoomIn(h, { x: v.x + v.width / 2, y: v.y + v.height / 2 - 80 }, 3);
        await h.park({ x: 1600, y: 640 }); // near the Text row
    },
    async run(h) {
        const { page } = h;
        await tap(h, "Add to node text");
        await tap(h, page.getByRole("menuitem", { name: "Label", exact: true }));
        await tap(h, page.getByRole("option", { name: "name", exact: true }));
        await h.move({ x: 1460, y: 960, width: 120, height: 60 });
        h.mark("names shown");
    },
    holdMs: 2200,
};
