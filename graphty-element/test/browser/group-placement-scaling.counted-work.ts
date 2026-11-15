/** The graph-mutating methods whose work `group-placement-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/group-placement-scaling.test.ts",
    methods: ["LayoutEngine.setFollowers", "LayoutManager.placeGroups"],
} satisfies CountedWork;
