/** The graph-mutating methods whose work `autosave-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/autosave/autosave-scaling.test.ts",
    methods: ["AutosaveApi.discard", "AutosaveApi.restore"],
} satisfies CountedWork;
