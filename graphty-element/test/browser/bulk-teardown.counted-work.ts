/** The graph-mutating methods whose work `bulk-teardown.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/bulk-teardown.test.ts",
    methods: ["SessionDataApi.clear", "SessionDataApi.removeNodes"],
} satisfies CountedWork;
