// Chapter 4, clip 1: the Hull shader in its Outline look, grouped by Louvain: a clean line around
// each group, in the group's color.
//
// The Hull's default look (Goo) fills each group with a dark tint of its color, and where groups
// overlap the fills stack toward black, which reads as a rendering glitch. Outline draws a faint
// wash and a clean contour instead. Outline is picked before Group by, so the moment the hull
// covers the whole graph (Group by None) is a thin line, not a gray blob.
import { base, canvasMiddle, tap, zoomIn } from "./base.js";

export default {
    id: "shape-around-groups",
    chapter: 4,
    caption: "Draw a shape around each group.",
    dataset: "Les Miserables",
    async setup(h) {
        await base(h);
        // Fit frames the nodes; the shapes reach past them, so leave a margin, more at the bottom
        // where the toolbar sits
        const m = await canvasMiddle(h);
        await zoomIn(h, { x: m.x, y: m.y - 250 }, -1);
        await h.park({ x: 1700, y: 700 }); // near the Shaders row
    },
    async run(h) {
        const { page } = h;
        await tap(h, "Add to node shaders");
        // the Shaders panel opens with its search box focused
        await h.waitFor(page.getByRole("textbox", { name: "Find node shader" }));
        await h.type("hull");
        await tap(h, page.getByRole("button", { name: "Hull", exact: true }));
        await tap(h, "Hull settings");
        await tap(h, page.getByRole("combobox", { name: "Look" }));
        await tap(h, page.getByRole("option", { name: "Outline", exact: true }));
        await h.press("Escape");
        await tap(h, "Group by None");
        await tap(h, page.getByRole("option", { name: /^Louvain, / }));
        await h.waitFor(page.getByRole("button", { name: "Group by Louvain" }));
        h.mark("hulls drawn");
    },
    holdMs: 2200,
};
