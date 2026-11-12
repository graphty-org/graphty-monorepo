/** The graph-mutating methods whose work `column-median.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/results/column-median.test.ts",
    methods: ["RunsApi.start"],
} satisfies CountedWork;
