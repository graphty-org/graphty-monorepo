/** The graph-mutating methods whose work `SelectionManager.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/managers/SelectionManager.test.ts",
    methods: ["SelectionManager.hover", "SelectionManager.leave", "SelectionManager.toggle"],
} satisfies CountedWork;
