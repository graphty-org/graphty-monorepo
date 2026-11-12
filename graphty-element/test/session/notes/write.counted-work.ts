/** The graph-mutating methods whose work `write.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/notes/write.test.ts",
    methods: ["NotesApi.add"],
} satisfies CountedWork;
