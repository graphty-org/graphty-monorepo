/** The graph-mutating methods whose work `groups-collapse.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/groups-collapse.test.ts",
    methods: ["GroupsApi.collapse", "GroupsApi.expand"],
} satisfies CountedWork;
