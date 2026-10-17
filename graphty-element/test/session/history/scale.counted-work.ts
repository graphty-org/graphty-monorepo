/** The graph-mutating methods whose work `scale.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/history/scale.test.ts",
    methods: ["GraphSession.undo"],
} satisfies CountedWork;
