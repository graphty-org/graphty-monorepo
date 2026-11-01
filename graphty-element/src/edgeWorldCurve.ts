import { Vector3 } from "@babylonjs/core";

import type { Edge } from "./Edge";
import { PatternedLineMesh } from "./meshes/PatternedLineMesh";

/**
 * The world points an edge's curve -- or its line through its bends -- is drawn through, or null
 * when its line is one straight segment. {@link Edge.drawnCurve} gives them in graph-root's space,
 * which an XR gesture moves; these are where they are seen.
 * @param edge - The edge.
 * @returns The points, in order along the line, or null for a straight line.
 */
export function drawnCurveInWorld(edge: Edge): Vector3[] | null {
    const curve = edge.drawnCurve;
    if (curve === null) {
        return null;
    }

    // A patterned line's pieces are slots in batches parented to graph-root, and it has no mesh of its own.
    const root =
        edge.mesh instanceof PatternedLineMesh
            ? edge.srcNode.mesh.getScene().getTransformNodeByName("graph-root")
            : edge.mesh;
    if (root === null) {
        return curve;
    }

    const world = root.getWorldMatrix();
    return curve.map((point) => Vector3.TransformCoordinates(point, world));
}
