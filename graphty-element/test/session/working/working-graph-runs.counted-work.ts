/** Painting a stored run, whose work `working-graph-runs.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/working/working-graph-runs.test.ts",
    methods: ["RunsApi.paint"],
} satisfies CountedWork;
