/** The branches view whose work `show-branches.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/scope/show-branches.test.ts",
    methods: ["StylesApi.showBranches"],
} satisfies CountedWork;
