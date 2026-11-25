/** The graph-mutating methods whose work `ngraph-add-after-removal.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/layout/ngraph-add-after-removal.test.ts",
    methods: ["LayoutEngine.addEdge", "LayoutEngine.addNode"],
} satisfies CountedWork;
