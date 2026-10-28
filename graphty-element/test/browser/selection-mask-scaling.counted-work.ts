/** The graph-mutating methods whose work `selection-mask-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/selection-mask-scaling.test.ts",
    methods: [
        "Graph.deselectNode",
        "Graph.select",
        "Graph.selectNode",
        "Graphty.deselectNode",
        "Graphty.select",
        "Graphty.selectNode",
        "SelectionManager.deselect",
        "SelectionManager.select",
        "SelectionManager.selectById",
    ],
} satisfies CountedWork;
