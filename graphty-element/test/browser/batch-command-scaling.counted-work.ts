/** The graph-mutating methods whose work `batch-command-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/batch-command-scaling.test.ts",
    methods: ["Graph.batchOperations", "GraphCommand.execute", "Graphty.batchOperations"],
} satisfies CountedWork;
