/** The graph-mutating methods whose work `ai-command-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/ai-command-scaling.test.ts",
    methods: [
        "AiController.execute",
        "AiManager.execute",
        "AiManager.retry",
        "Graph.aiCommand",
        "Graph.retryLastAiCommand",
        "Graphty.aiCommand",
        "Graphty.retryLastAiCommand",
    ],
} satisfies CountedWork;
