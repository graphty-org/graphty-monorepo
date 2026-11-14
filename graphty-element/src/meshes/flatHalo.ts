import { type Mesh, VertexBuffer, VertexData } from "@babylonjs/core";

/**
 * How far in front of the plane the edges lie on a 2D halo is drawn, in scene units, at most
 * (issue #7453): half a `drawOrder` step (`NodeMesh`), about five times the depth buffer's
 * resolution at the 2D camera's range, so the halo wins every pixel it shares with an edge and
 * still lies behind the front of the node it rings.
 */
const FLAT_HALO_LIFT = 0.003;

/**
 * Build a 2D halo's geometry from its node's shape: the shape's camera-facing triangles,
 * flattened onto one sheet.
 *
 * In 2D the node, its halo and the edges share one plane, and a halo that is a scaled copy of a
 * solid node shows only its far side, behind that plane, so every edge was drawn across it. As a
 * sheet it can be lifted just in front of the edges ({@link flatHaloLift}) while the node, whose
 * front reaches further toward the camera, still covers its middle. Only the triangles facing the
 * camera are kept, so a translucent halo is drawn once over each pixel rather than once per side.
 * @param source - The halo's source mesh, which takes the geometry.
 * @param shape - The node's source mesh.
 * @returns The node's nearest depth along the 2D camera's view (it looks along +z), in its own
 *     units: negative when the node reaches in front of the edges' plane.
 */
export function applyFlatHalo(source: Mesh, shape: Mesh): number {
    const positions = shape.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const normals = shape.getVerticesData(VertexBuffer.NormalKind);
    const indices = shape.getIndices() ?? Array.from({ length: positions.length / 3 }, (_, i) => i);
    let front = Infinity;
    for (let z = 2; z < positions.length; z += 3) {
        front = Math.min(front, positions[z]);
    }

    const facing: number[] = [];
    for (let i = 0; i + 2 < indices.length; i += 3) {
        const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
        if (normals === null || normals[a * 3 + 2] + normals[b * 3 + 2] + normals[c * 3 + 2] < 0) {
            facing.push(a, b, c);
        }
    }

    // A node behind the edges' plane (a negative `zIndex`) keeps its halo on its own front, where
    // the halo material's depth offset puts it just behind the node, as it is behind the edges.
    const plane = front < 0 ? 0 : front;
    const flat = Array.from(positions, (value, i) => (i % 3 === 2 ? plane : value));
    const data = new VertexData();
    data.positions = flat;
    data.indices = facing.length > 0 ? facing : Array.from(indices);
    data.applyToMesh(source);

    return Number.isFinite(front) ? front : 0;
}

/**
 * How far toward the 2D camera a flat halo is moved from its node's position: in front of the
 * edges' plane by {@link FLAT_HALO_LIFT}, or by half the node's own reach when that is less, so
 * the node's front stays nearer than its halo. A node behind the edges' plane lifts none.
 * @param front - The node's nearest depth, from {@link applyFlatHalo}.
 * @param depthScale - The node's scaling along the view.
 * @returns The lift, in scene units.
 */
export function flatHaloLift(front: number, depthScale: number): number {
    return front < 0 ? Math.min(FLAT_HALO_LIFT, (-front * Math.abs(depthScale)) / 2) : 0;
}

/**
 * The node's nearest depth a flat halo source was built with, or undefined for any other halo.
 * @param source - A halo's source mesh.
 * @returns The depth from {@link applyFlatHalo}, or undefined.
 */
export function haloFrontOf(source: Mesh): number | undefined {
    return (source.metadata as { flatHaloFront?: number } | null)?.flatHaloFront;
}
