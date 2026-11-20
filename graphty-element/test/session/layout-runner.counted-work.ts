/** The layout and positions verbs whose work `layout-runner.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/layout-runner.test.ts",
    methods: ["SessionLayout.settle", "SessionLayout.tick", "SessionPositions.restore"],
} satisfies CountedWork;
