/** The saved-view methods whose work `views-parts.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/views-parts.test.ts",
    methods: ["SessionViews.open"],
} satisfies CountedWork;
