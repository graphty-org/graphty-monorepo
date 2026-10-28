/** The graph-mutating methods whose work `view-mode-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/view-mode-scaling.test.ts",
    methods: ["Graph.setViewMode", "Graphty.setViewMode"],
} satisfies CountedWork;
