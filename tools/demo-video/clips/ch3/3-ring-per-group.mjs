// Chapter 3, clip 3: Rings by group puts each Louvain group on its own ring, one inside the next
// (its form's Group by is already Louvain). At the default node size the rings are lost in the
// crossing edges, so setup makes the nodes bigger first, through the Everything layer's Node size.
import { base, pickLayout } from "./base.js";

export default {
    id: "ring-per-group",
    chapter: 3,
    caption: "Rings by group: each group on a ring of its own.",
    dataset: "Les Miserables",
    async setup(h) {
        await base(h);
        const size = h.page.getByRole("spinbutton", { name: "Node size" });
        await size.fill("3");
        await size.press("Enter");
        await h.app.settled();
        await h.park({ x: 1010, y: 860 });
    },
    leadMs: 500,
    holdMs: 2000,
    async run(h) {
        await pickLayout(h, /^Rings by group /);
        h.mark("applied");
        await h.move({ x: 1460, y: 900, width: 120, height: 60 });
    },
};
