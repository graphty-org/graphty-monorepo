/** The graph-mutating methods whose work `element-entry-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/element-entry-scaling.test.ts",
    methods: ["Graphty.attributeChangedCallback", "Graphty.loadFromSource"],
} satisfies CountedWork;
