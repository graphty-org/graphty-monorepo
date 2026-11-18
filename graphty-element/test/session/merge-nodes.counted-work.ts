/** The graph-mutating methods whose work `merge-nodes.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/merge-nodes.test.ts",
    methods: ["SessionDataApi.mergeNodes"],
} satisfies CountedWork;
