/** The graph-mutating methods whose work `graphs.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/graphs.test.ts",
    methods: ["SessionGraphs.create", "SessionGraphs.switch"],
} satisfies CountedWork;
