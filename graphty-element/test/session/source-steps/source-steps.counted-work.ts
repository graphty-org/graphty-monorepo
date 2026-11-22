/** The source-steps doors whose work `counted-work.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/source-steps/counted-work.test.ts",
    methods: [
        "SessionDataApi.stage",
        "SessionDataApi.declareType",
        "SessionDataApi.removeEdit",
        "SessionDataApi.merge",
        "SessionDataApi.connect",
        "SessionDataApi.extract",
        "SessionDataApi.moveColumns",
        "SessionDataApi.pick",
        "SessionDataApi.use",
        "SessionDataApi.removeStep",
        "SessionDataApi.setStepOff",
        "SessionDataApi.setMapping",
        "SessionDataApi.add",
        "SessionDataApi.settleEdit",
        "SessionDataApi.resolveStep",
    ],
} satisfies CountedWork;
