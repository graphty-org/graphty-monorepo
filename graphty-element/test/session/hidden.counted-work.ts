/** The graph-mutating methods whose work `hidden.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/hidden.test.ts",
    methods: ["SessionHidden.add", "SessionHidden.remove"],
} satisfies CountedWork;
