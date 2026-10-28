/** The replace verb whose work `replace-source.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/replace-source.test.ts",
    methods: ["SessionDataApi.replaceSource"],
} satisfies CountedWork;
