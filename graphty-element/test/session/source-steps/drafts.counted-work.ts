/** The draft doors whose work `drafts-counted-work.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/source-steps/drafts-counted-work.test.ts",
    methods: ["SourceDraft.commit"],
} satisfies CountedWork;
