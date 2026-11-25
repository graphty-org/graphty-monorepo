/** The graph-mutating methods whose work `model-defaults-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/model-defaults-scaling.test.ts",
    methods: ["AssetsApi.setDefaults"],
} satisfies CountedWork;
