/** The graph-mutating methods whose work `lifecycle-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/lifecycle-scaling.test.ts",
    methods: [
        "AlgorithmManager.dispose",
        "AlgorithmManager.init",
        "DataManager.dispose",
        "DataManager.init",
        "Graph.dispose",
        "Graph.init",
        "Graph.shutdown",
        "GraphSession.dispose",
        "Graphty.asyncFirstUpdated",
        "Graphty.connectedCallback",
        "Graphty.disconnectedCallback",
        "Graphty.firstUpdated",
        "Graphty.shutdown",
        "LayoutEngine.dispose",
        "LayoutEngine.init",
        "LayoutManager.dispose",
        "LayoutManager.init",
        "Manager.dispose",
        "Manager.init",
        "RenderManager.dispose",
        "RenderManager.init",
        "SelectionManager.dispose",
        "SelectionManager.init",
        "UpdateManager.dispose",
        "UpdateManager.init",
    ],
} satisfies CountedWork;
