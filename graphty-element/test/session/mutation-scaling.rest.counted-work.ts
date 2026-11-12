/** More graph-mutating methods whose work `mutation-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/mutation-scaling.test.ts",
    methods: [
        "RunsApi.move",
        "SessionDataApi.generate",
        "SessionDataApi.loadDataset",
        "SessionShaders.add",
        "SessionShaders.approve",
        "SessionShaders.remove",
        "SessionShaders.replace",
        "StylesApi.setHighlightColor",
        "TimeApi.play",
    ],
} satisfies CountedWork;
