/** The graph-mutating methods whose work `step-runs-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/scope/step-runs-scaling.test.ts",
    methods: ["ScopeApi.allowRun", "ScopeApi.cancelRun", "ScopeApi.setOptions", "StepsWatch.end"],
} satisfies CountedWork;
