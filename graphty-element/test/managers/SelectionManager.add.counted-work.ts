/** The selection add whose work `SelectionManager.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/managers/SelectionManager.test.ts",
    methods: ["SelectionManager.add"],
} satisfies CountedWork;
