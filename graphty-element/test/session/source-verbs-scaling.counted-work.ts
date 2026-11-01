/** The graph-mutating methods whose work `source-verbs-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/source-verbs-scaling.test.ts",
    methods: [
        "SessionDataApi.collapse",
        "SessionDataApi.expand",
        "SessionDataApi.loadSample",
        "SessionDataApi.more",
        "SessionDataApi.refresh",
        "SessionDataApi.runPendingSourceLoad",
    ],
} satisfies CountedWork;
