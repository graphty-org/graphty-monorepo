/** The writes whose effect on the column reads `column-descriptors-cache.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/column-descriptors-cache.test.ts",
    methods: ["VisibilityApi.set", "SessionDataApi.updateNodes"],
} satisfies CountedWork;
