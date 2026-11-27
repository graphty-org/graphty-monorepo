// Chapter 8, Data management: the Les Miserables network; a click on empty canvas shows the graph's
// overview in the inspector (nodes, edges, density, components, the degree spread), then a click on
// Valjean shows that one node's details. Louvain and PageRank are run in setup, so the node's details
// hold its community and rank beside its degree. The drawing is zoomed out a notch more than usual:
// the camera re-centers on a clicked node, and this keeps the whole network on the canvas.
import { runAnalysis } from "../r2-1-fraud-ring/bank.js";
import { flat, inspector, nodeBox } from "./data.js";

/** Empty canvas, below the drawing and right of the toolbar, in page coordinates. */
const EMPTY = { x: 1440, y: 860, width: 120, height: 60 };

export default {
    id: "data-inspector",
    chapter: 8,
    caption: "Counts and spread, then one node",
    dataset: "Les Miserables",
    async setup(h) {
        const { page } = h;
        await runAnalysis(h, "Louvain", "Louvain");
        await runAnalysis(h, "PageRank", "PageRank");
        await flat(h);
        await page.mouse.move(990, 540);
        await page.mouse.wheel(0, 100);
        await h.app.settled();
        // the overview's Values tab chosen once, then the inspector back on the Everything layer
        await page.mouse.click(EMPTY.x + 60, EMPTY.y + 30);
        await inspector(page).getByRole("tab", { name: "Values" }).click();
        await page.getByRole("treeitem", { name: /^Everything, / }).click();
        await h.app.settled();
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.click(EMPTY);
        await h.waitFor(inspector(page).getByText("Overview", { exact: true }));
        h.mark("overview");
        await h.pause(1400);
        await h.click(await nodeBox(h, "Valjean"));
        await h.waitFor(inspector(page).getByText("Summary", { exact: true }));
        h.mark("node");
        await h.move({ x: 1460, y: 300, width: 100, height: 60 });
    },
    holdMs: 2000,
};
