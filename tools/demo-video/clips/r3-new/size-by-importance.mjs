// Round 3: Analyze, PageRank, Run on Les Miserables: the nodes take a color ramp by importance
// (PageRank's suggested style colors, it does not size), Valjean darkest.
// Cosmograph is left off: with it on, 2D draws no edges (README.md, "Known app defects").
import { analyzeOnCamera } from "../r2-1-fraud-ring/bank.js";
import { hideLegend } from "../r2-5b-and-more/more.js";

export default {
    id: "size-by-importance",
    chapter: 4,
    caption: "Color nodes by PageRank",
    dataset: "Les Miserables",
    featuresOff: ["file-styles", "cosmograph"],
    async setup(h) {
        await h.app.mode("2D");
        await h.app.settled();
        await h.app.camera("Fit");
        await h.app.settled();
        await hideLegend(h.page);
        await h.park({ x: 1010, y: 830 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        await analyzeOnCamera(h, "pager", "PageRank");
        await h.waitFor(page.getByRole("treeitem", { name: /^PageRank/ }).first());
        await h.move({ x: 1560, y: 880, width: 100, height: 60 }); // off the drawing so the colors read
        h.mark("sized");
    },
    holdMs: 2500,
};
