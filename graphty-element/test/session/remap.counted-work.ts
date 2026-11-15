/** The graph-mutating methods whose work `remap.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/remap.test.ts",
    methods: ["SessionDataApi.remap"],
} satisfies CountedWork;
