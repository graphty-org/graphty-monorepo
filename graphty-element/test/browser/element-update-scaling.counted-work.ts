/** The graph-mutating methods whose work `element-update-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/element-update-scaling.test.ts",
    methods: [
        "Edge.applySessionPaint",
        "Edge.dispose",
        "Edge.invalidatePositionCache",
        "Edge.setRenderVisible",
        "Edge.transformArrowCap",
        "Edge.transformEdgeMesh",
        "Edge.update",
        "Edge.updateRays",
        "Edge.updateStyle",
        "Node.setRenderState",
        "Node.update",
        "Node.updateStyle",
    ],
} satisfies CountedWork;
