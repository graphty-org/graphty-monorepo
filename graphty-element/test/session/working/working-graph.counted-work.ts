/** The mode switch whose work `working-graph.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/working/working-graph.test.ts",
    methods: ["SessionConfig.setWorkingGraph"],
} satisfies CountedWork;
