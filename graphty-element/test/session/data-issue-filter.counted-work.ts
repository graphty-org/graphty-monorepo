/** The issue verb whose work `data-issue-filter.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/data-issue-filter.test.ts",
    methods: ["SessionDataApi.ignoreIssues"],
} satisfies CountedWork;
