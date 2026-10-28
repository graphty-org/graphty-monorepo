/** The graph-mutating methods whose work `one-element-paint-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/one-element-paint-scaling.test.ts",
    methods: ["Edge.applySessionPaint"],
} satisfies CountedWork;
