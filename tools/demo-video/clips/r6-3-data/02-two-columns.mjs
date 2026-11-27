// Chapter 4, Layouts: Davis Southern Women (18 women, 14 events), Bipartite matching run in setup so
// each node has a side; Layout > Two columns > Apply and the women and the events glide into two
// columns. Two columns needs exactly two groups from an analysis: the sample's own `side` column is
// not offered (reported as an app defect).
import { runAnalysis } from "../r2-1-fraud-ring/bank.js";
import { flat, pickLayout, REST, setTransition } from "./data.js";

export default {
    id: "data-two-columns",
    chapter: 4,
    caption: "Two kinds of nodes, two columns",
    dataset: "Davis Southern Women",
    async setup(h) {
        await runAnalysis(h, "Bipartite", "Bipartite matching");
        await flat(h);
        await setTransition(h.page, /^Two columns\b/, "Arc move", 1.4);
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 500,
    async run(h) {
        await pickLayout(h, /^Two columns\b/);
        h.mark("applied");
        await h.move(REST);
        await h.app.settled();
        h.mark("columns");
    },
    holdMs: 2000,
};
