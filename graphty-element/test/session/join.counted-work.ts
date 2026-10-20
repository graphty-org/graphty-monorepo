/** The join verb whose work `join.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/join.test.ts",
    methods: ["SessionDataApi.editJoin"],
} satisfies CountedWork;
