/** The reload verb whose work `replace-source.test.ts` counts: it is `replaceSource` on the kept input (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/replace-source.test.ts",
    methods: ["SessionDataApi.reloadSource"],
} satisfies CountedWork;
