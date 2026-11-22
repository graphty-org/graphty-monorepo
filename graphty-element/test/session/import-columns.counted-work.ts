/** The typed door whose work `import-columns.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/import-columns.test.ts",
    methods: ["SessionDataApi.importColumns"],
} satisfies CountedWork;
