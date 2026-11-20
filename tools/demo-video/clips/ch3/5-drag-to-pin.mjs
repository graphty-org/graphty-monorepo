// Chapter 3, clip 5: on Force, Valjean (the biggest hub) is dragged toward a corner; he stays
// there and the rest settles around him.
import { base, nodeBox } from "./base.js";

let valjean;

export default {
    id: "drag-to-pin",
    chapter: 3,
    // checked on the take: the neighbors do not stream after it, so the caption promises only the pin
    caption: "Drag a node and it stays where you put it.",
    dataset: "Les Miserables",
    async setup(h) {
        await base(h);
        valjean = await nodeBox(h, "Valjean");
        await h.park({ x: 1460, y: 860 });
    },
    leadMs: 500,
    holdMs: 1000,
    async run(h) {
        await h.drag(valjean, { x: 560, y: 260, width: 40, height: 40 }, { slow: 1.8 });
        h.mark("dropped");
        await h.move({ x: 1460, y: 900, width: 120, height: 60 });
        await h.app.settled(); // the force layout comes to rest on camera, then the hold
    },
};
