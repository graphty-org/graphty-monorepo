/** The graph-mutating methods whose work `engine-removal.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/layout/engine-removal.test.ts",
    methods: ["LayoutEngine.removeEdge", "LayoutEngine.removeNode"],
} satisfies CountedWork;
