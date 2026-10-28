/** The graph-mutating methods whose work `algorithm-run-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/algorithm-run-scaling.test.ts",
    methods: [
        "Algorithm.publishResult",
        "Algorithm.run",
        "AlgorithmManager.runAlgorithm",
        "AlgorithmManager.runAlgorithmsFromTemplate",
        "DeclaredAlgorithm.publishResult",
        "DeclaredAlgorithm.run",
        "Graph.applySuggestedStyles",
        "Graph.run",
        "Graph.runAlgorithm",
        "Graph.runAlgorithmsFromTemplate",
        "GraphSession.run",
        "Graphty.applySuggestedStyles",
        "Graphty.run",
        "Graphty.runAlgorithm",
        "Run.rerun",
        "RunsApi.batch",
        "RunsApi.remove",
    ],
} satisfies CountedWork;
