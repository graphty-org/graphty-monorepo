// Round 2, clip 2.6: P, ACHE (donepezil's target), APOE, Find path: two steps, through APP. Key
// moment: held 5 s.
//
// The path must read at a glance (owner, 2026-11-20: the round 1 path was too hard to see), so it
// draws bold (edge width 60) with its three stops named. A re-run of Shortest path reuses the
// "Shortest path" layer and its style, so setup styles the layer on this very path, then re-runs it
// from ACHE to ACHE: the clip opens with only ACHE marked (orange, named), and Find path on camera
// draws the bold, named path in one step. Only the path's three nodes are named.
import { hideLegend } from "../r2-5b-and-more/more.js";
import { ALZ_CLIP, alzLouvain, alzPathBold, alzSelectApproved, alzTargetsLayer, runPath } from "./alz.js";

export default {
    id: "shortest-path",
    ...ALZ_CLIP,
    caption: "Donepezil's target to APOE: two steps",
    async setup(h) {
        await alzLouvain(h); // no community outlines: with them the take filmed at 8 fps
        await alzSelectApproved(h);
        await alzTargetsLayer(h);
        // drawn thick, so the path reads at a glance; no labels: with them the take filmed at 7 fps
        await alzPathBold(h, { width: 200, labels: false });
        await runPath(h, "ACHE", "ACHE");
        await hideLegend(h.page); // the legend card covered the drawing's top left
        await h.page.getByRole("treeitem", { name: /^Everything, / }).click();
        await h.page.mouse.click(1560, 975); // keys back to the graph, so P opens the path form
        await h.app.settled();
        await h.park({ x: 1250, y: 900 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.shortcut("P", { near: page.getByRole("button", { name: "Analyze", exact: true }), label: "Path" });
        await h.type("ACHE");
        await h.press("Enter");
        await h.type("APOE");
        await h.press("Enter");
        await h.press("Enter");
        await h.waitFor(page.getByText("Nodes in order"));
        await h.move({ x: 1560, y: 960, width: 80, height: 50 }); // off the path while it holds
        h.mark("path drawn");
    },
    holdMs: 5000,
};
