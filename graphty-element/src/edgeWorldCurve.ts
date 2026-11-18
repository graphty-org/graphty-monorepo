import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

import { type Edge, edgeInternals } from "./Edge";
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
    return curve === null ? null : inWorld(edge, curve);
}

/**
 * The world points an edge's line is drawn through: its curve's, or a straight line's two ends where
 * the canvas ends it -- at an arrowhead's back, or at a node's outline or gap -- or null for a line
 * drawn with no slot of its own (a pulled straight line, a patterned one), which runs between its
 * nodes' centers.
 * @param edge - The edge.
 * @returns The points, in order along the line, or null.
 */
export function drawnLineInWorld(edge: Edge): Vector3[] | null {
    const curve = edge.drawnCurve;
    if (curve !== null) {
        return inWorld(edge, curve);
    }

    const { lineBatch, lineSlots } = edgeInternals.drawn(edge);
    const slot = lineSlots[0];
    return lineBatch === null || slot === undefined ? null : inWorld(edge, lineBatch.endsOf(slot));
}

/**
 * Points in graph-root's space, where they are seen.
 * @param edge - The edge whose line they are on.
 * @param curve - The points.
 * @returns The points in the world.
 */
function inWorld(edge: Edge, curve: Vector3[]): Vector3[] {
    // A patterned line's pieces are slots in batches parented to graph-root, and it has no mesh of its own.
    const root =
        edge.mesh instanceof PatternedLineMesh
            ? edge.srcNode.drawnScene.getTransformNodeByName("graph-root")
            : edge.mesh;
    if (root === null) {
        return curve;
    }

    const world = root.getWorldMatrix();
    return curve.map((point) => Vector3.TransformCoordinates(point, world));
}
