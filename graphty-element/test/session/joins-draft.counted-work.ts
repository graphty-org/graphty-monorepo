/** A join recipe's commit, whose work `joins-draft.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/joins-draft.test.ts",
    methods: ["JoinsDraft.commit"],
} satisfies CountedWork;
