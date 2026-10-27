/** The column commands whose work `mutation-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/mutation-scaling.test.ts",
    methods: [
        "SessionDataApi.renameColumn",
        "SessionDataApi.setHidden",
        "SessionDataApi.setRole",
        "SessionDataApi.setType",
    ],
} satisfies CountedWork;
