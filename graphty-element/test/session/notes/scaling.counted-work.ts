/** The graph-mutating methods whose work `scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/notes/scaling.test.ts",
    methods: ["NotesApi.remove", "NotesApi.update"],
} satisfies CountedWork;
