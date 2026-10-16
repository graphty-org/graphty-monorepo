/** The graph-mutating methods whose work `lazy-ranking.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/results/lazy-ranking.test.ts",
    methods: ["RunsApi.start"],
} satisfies CountedWork;
