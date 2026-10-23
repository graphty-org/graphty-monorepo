/** The graph-mutating methods whose work `camera-view-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/browser/camera-view-scaling.test.ts",
    methods: [
        "Graph.importCameraPresets",
        "Graph.removeCameraPreset",
        "Graph.saveCameraPreset",
        "Graph.setBackground",
        "Graphty.importCameraPresets",
        "Graphty.removeCameraPreset",
        "Graphty.saveCameraPreset",
    ],
} satisfies CountedWork;
