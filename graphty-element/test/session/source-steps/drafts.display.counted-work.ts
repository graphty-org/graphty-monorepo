/** Drawing a draft, whose work `drafts-display-counted-work.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/source-steps/drafts-display-counted-work.test.ts",
    methods: ["SourceDraft.display", "SourceDraft.show"],
} satisfies CountedWork;
