/** The join verbs whose work `join-operations.test.ts` counts for link, merge and aggregate (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/join-operations.test.ts",
    methods: ["SessionDataApi.editJoin", "SessionDataApi.removeSource"],
} satisfies CountedWork;
