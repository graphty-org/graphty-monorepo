/** The recipe methods whose work `recipes-api.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../../cost-coverage/counted-work";

export default {
    file: "test/session/recipes/recipes-api.test.ts",
    methods: ["RecipesApi.apply"],
} satisfies CountedWork;
