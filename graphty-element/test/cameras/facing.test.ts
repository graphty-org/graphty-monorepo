import { assert, describe, it } from "vitest";

import { resolveCameraView } from "../../src/camera/resolve";
import type { CameraState, GraphBounds } from "../../src/camera/types";

/** Nodes on the near cap of a globe of radius 100 that faces -z: the box's center is inside it. */
const CAP: GraphBounds = {
    min: { x: -50, y: -30, z: -100 },
    max: { x: 50, y: 30, z: -85 },
    center: { x: 0, y: 0, z: -92.5 },
    size: { x: 100, y: 60, z: 15 },
    maxDimension: 100,
    measured: 49,
};

const CURRENT: CameraState = { position: { x: 0, y: 0, z: -300 }, target: { x: 0, y: 0, z: 0 } };

function context(facing?: { x: number; y: number; z: number }) {
    return {
        bounds: CAP,
        mode: "3d" as const,
        aspect: 16 / 9,
        viewport: { width: 1600, height: 900 },
        fov: 0.8,
        current: CURRENT,
        ...(facing === undefined ? {} : { facing }),
    };
}

describe("camera views and the side a drawing faces", () => {
    it("fitToGraph frames a drawing that faces -z from in front of it, outside the globe", () => {
        const state = resolveCameraView("fitToGraph", context({ x: 0, y: 0, z: -1 }));
        assert.exists(state.position);
        assert.closeTo(state.position.x, 0, 1e-9);
        assert.closeTo(state.position.y, 0, 1e-9);
        assert.isBelow(state.position.z, -100, "in front of the globe's surface, not inside it");
    });

    it("frontView looks at the face a drawing faces", () => {
        const state = resolveCameraView("frontView", context({ x: 0, y: 0, z: -1 }));
        assert.exists(state.position);
        assert.isBelow(state.position.z, CAP.center.z);
    });

    it("without a facing, fitToGraph keeps its diagonal and frontView looks from +z", () => {
        const fit = resolveCameraView("fitToGraph", context());
        assert.exists(fit.position);
        assert.isAbove(fit.position.z, CAP.center.z);
        assert.isAbove(fit.position.x, 0);

        const front = resolveCameraView("frontView", context());
        assert.exists(front.position);
        assert.isAbove(front.position.z, CAP.center.z);
    });
});
