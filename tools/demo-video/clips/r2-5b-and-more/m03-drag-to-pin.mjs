// "And more", beat 3: TP53, a hub of the Alzheimer's network, dragged to the upper left corner; it
// stays there (the Pinned layer names it) while the rest settles around it.
import { alzLouvain, ALZ_CLIP, labelLayer, nodeBox } from "../r2-2-alzheimer/alz.js";
import { hideLegend, MORE, REST } from "./more.js";

let tp53;

export default {
    id: "drag-to-pin",
    ...ALZ_CLIP,
    chapter: MORE,
    caption: "Drag a node to pin it",
    async setup(h) {
        await alzLouvain(h);
        await hideLegend(h.page); // the drop corner is under it otherwise
        await labelLayer(h, "Hovered"); // its name shows as the hand takes it
        await labelLayer(h, "Pinned"); // and stays once it is pinned
        await h.page.getByRole("treeitem", { name: /^Everything, / }).click();
        tp53 = await nodeBox(h, "TP53");
        await h.park({ x: 1300, y: 860 });
    },
    leadMs: 500,
    async run(h) {
        await h.drag(tp53, { x: 470, y: 230, width: 40, height: 40 }, { slow: 1.6 });
        h.mark("dropped");
        await h.waitFor(h.page.getByRole("treeitem", { name: /^Pinned, .*\b1 node\b/ }));
        await h.move(REST);
        await h.app.settled(); // the rest comes to rest around it, then the hold
    },
    holdMs: 1500,
};
