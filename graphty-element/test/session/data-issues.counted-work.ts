/** The issue verbs whose work `data-issues.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/data-issues.test.ts",
    methods: ["SessionDataApi.fix", "SessionDataApi.ignoreIssue"],
} satisfies CountedWork;
