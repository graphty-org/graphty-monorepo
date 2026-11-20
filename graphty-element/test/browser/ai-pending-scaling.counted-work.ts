/** The graph-mutating methods whose work `ai-pending-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/ai-pending-scaling.test.ts",
    methods: [
        "AiController.answerQuestion",
        "AiController.resolveAiApproval",
        "AiManager.answerQuestion",
        "AiManager.resolveAiApproval",
        "Graph.answerAiQuestion",
        "Graph.resolveAiApproval",
        "Graphty.answerAiQuestion",
        "Graphty.resolveAiApproval",
    ],
} satisfies CountedWork;
