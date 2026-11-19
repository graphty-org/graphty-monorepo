/** The source-steps doors whose work `counted-work.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/source-steps/counted-work.test.ts",
    methods: ["SessionDataApi.stage", "SessionDataApi.declareType", "SessionDataApi.removeEdit"],
} satisfies CountedWork;
