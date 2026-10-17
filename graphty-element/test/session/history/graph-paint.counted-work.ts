/** The graph-mutating methods whose work `graph-paint.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/history/graph-paint.test.ts",
    methods: ["SessionDataApi.addEdges", "SessionDataApi.addNodes"],
} satisfies CountedWork;
