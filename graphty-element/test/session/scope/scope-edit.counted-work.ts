/** A selection editor visit's Done and Cancel, whose work `scope-edit.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/scope/scope-edit.test.ts",
    methods: ["ScopeEdit.commit", "ScopeEdit.discard"],
} satisfies CountedWork;
