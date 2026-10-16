/** The graph-mutating methods whose work `graph-store.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/data/graph-store.test.ts",
    methods: ["DataManager.removeEdge"],
} satisfies CountedWork;
