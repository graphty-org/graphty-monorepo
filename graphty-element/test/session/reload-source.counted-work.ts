/** The graph-mutating methods whose work `reload-source.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/reload-source.test.ts",
    methods: ["SessionDataApi.reloadSource"],
} satisfies CountedWork;
