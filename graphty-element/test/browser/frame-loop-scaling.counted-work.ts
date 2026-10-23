/** The graph-mutating methods whose work `frame-loop-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/frame-loop-scaling.test.ts",
    methods: [
        "DataManager.startLabelAnimations",
        "DataManager.updateStyles",
        "Graph.render",
        "Graph.update",
        "Graphty.render",
        "Graphty.update",
        "LayoutManager.updateStyles",
        "StylesApi.highlight",
        "StylesApi.mark",
        "UpdateManager.bindViewMasks",
        "UpdateManager.drawArrivedPaint",
        "UpdateManager.forceEdgeWalk",
        "UpdateManager.invalidateViewMasks",
        "UpdateManager.meshesAdded",
        "UpdateManager.rebindScene",
        "UpdateManager.redrawArrangement",
        "UpdateManager.renderFrames",
        "UpdateManager.stepFrames",
        "UpdateManager.syncStyles",
        "UpdateManager.syncViewMasks",
        "UpdateManager.thawActiveMeshes",
        "UpdateManager.update",
        "UpdateManager.updateConfig",
    ],
} satisfies CountedWork;
