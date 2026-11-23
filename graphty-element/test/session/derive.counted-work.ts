/** The computed-column doors whose work `derive.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/derive.test.ts",
    methods: ["SessionDataApi.derive", "SessionDataApi.deriveScore"],
} satisfies CountedWork;
