/** The graph-mutating methods whose work `selection-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/selection-scaling.test.ts",
    methods: [
        "Edge.setSelected",
        "Graph.setSelectionStyle",
        "Node.refreshSelectionOverlay",
        "Node.setSelected",
        "SelectionManager.bindSelection",
        "SelectionManager.onNodeRemoved",
        "SelectionManager.setDataManager",
    ],
} satisfies CountedWork;
