// "And more", beat 7: GRIN1's menu > Simulate removing marks the 21 proteins that only it joins to the
// rest; nothing is removed. (The script named APP, but removing APP cuts nothing off in this network:
// GRIN1, an NMDA receptor subunit, cuts off the most.)
import { alzLouvain, ALZ_CLIP, labelLayer, nodeBox } from "../r2-2-alzheimer/alz.js";
import { eye } from "../r2-1-fraud-ring/bank.js";
import { hideLegend, MORE, REST } from "./more.js";

let grin1;

export default {
    id: "what-holds-it",
    ...ALZ_CLIP,
    chapter: MORE,
    caption: "Simulate removing a node",
    async setup(h) {
        await alzLouvain(h);
        // community colors off (one is the same orange as the result) and the legend off (it covers the
        // cluster that gets cut off): the 21 proteins are the only color
        await eye(h, "Louvain", false);
        await hideLegend(h.page);
        await labelLayer(h, "Hovered"); // GRIN1's name shows as the hand points at it
        await h.page.getByRole("treeitem", { name: /^Everything, / }).click();
        grin1 = await nodeBox(h, "GRIN1");
        await h.park({ x: 1300, y: 860 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.hover(grin1, 500);
        await h.rightClick(grin1);
        await h.click(page.getByRole("menuitem", { name: "Simulate removing" }));
        await h.waitFor(page.getByRole("treeitem", { name: /^Removal impact, .*\b[1-9]\d* nodes?\b/ }));
        await h.move(REST);
        h.mark("impact shown");
    },
    holdMs: 2000,
};
