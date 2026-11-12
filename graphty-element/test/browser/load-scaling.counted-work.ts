/** The graph-mutating methods whose work `load-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/load-scaling.test.ts",
    methods: ["Graph.addEdge", "Graph.setData"],
} satisfies CountedWork;
