import { VertexBuffer } from "@babylonjs/core/Buffers/buffer.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";

/**
 * How far in front of the plane the edges lie on a 2D halo is drawn, in scene units, at most
 * (issue #7453): half a `drawOrder` step (`NodeMesh`), about five times the depth buffer's
 * resolution at the 2D camera's range, so the halo wins every pixel it shares with an edge and
 * still lies behind the front of the node it rings.
 */
const FLAT_HALO_LIFT = 0.003;

/**
 * How far in front of the plane the edges lie on a 2D arrowhead is drawn, in scene units (issue
 * #10126): past a flat halo's lift ({@link FLAT_HALO_LIFT}) by about two and a half times the
 * depth buffer's resolution, so the arrowhead of an edge ending at a selected node is drawn over
 * its halo's band, and still behind the front of a node of the default size (`NodeMesh`'s
 * `drawOrder` step, 0.00625), so a node lying over an arrowhead still covers it.
 */
export const FLAT_CAP_LIFT = 1.5 * FLAT_HALO_LIFT;

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
    const plane = Math.max(front, 0);
    const flat = Array.from(positions, (value, i) => (i % 3 === 2 ? plane : value));
    const data = new VertexData();
    data.positions = flat;
    data.indices = facing.length > 0 ? facing : Array.from(indices);
    data.applyToMesh(source);

    return Number.isFinite(front) ? front : 0;
}

/**
 * How far toward the 2D camera a halo is moved from its node's position: a flat halo
 * ({@link applyFlatHalo}) in front of the edges' plane by {@link FLAT_HALO_LIFT}, or by half the
 * node's own reach when that is less, so the node's front stays nearer than its halo. A node
 * behind the edges' plane, and any other halo, lifts none.
 * @param halo - The drawn halo, an instance of its source mesh.
 * @param depthScale - The node's scaling along the view.
 * @returns The lift, in scene units.
 */
export function flatHaloLift(halo: AbstractMesh, depthScale: number): number {
    const front = halo instanceof InstancedMesh ? haloFrontOf(halo.sourceMesh) : undefined;
    return front !== undefined && front < 0 ? Math.min(FLAT_HALO_LIFT, (-front * Math.abs(depthScale)) / 2) : 0;
}

/**
 * The node's nearest depth a flat halo source was built with, or undefined for any other halo.
 * @param source - A halo's source mesh.
 * @returns The depth from {@link applyFlatHalo}, or undefined.
 */
function haloFrontOf(source: Mesh): number | undefined {
    return (source.metadata as { flatHaloFront?: number } | null)?.flatHaloFront;
}

/**
 * How much a halo stretches its node's shape on each axis so its band is one width all round.
 *
 * Scaling the shape by `scale` on every axis moves each side out by `scale - 1` times that side's
 * own half-extent, so an oval 2 to 1 got a band twice as wide at the sides as at the top and bottom
 * (issue #10116). Here the band is `scale - 1` times the smallest half-extent across the face, and
 * each axis grows by that one band: a sphere's halo is unchanged, a box's sides are offset evenly,
 * and an oval's band matches at its four extremes. A depth too thin to measure (a flat shape, a star
 * or a slab) keeps the node's own depth: grown, its side walls reached through the border's front
 * face and drew halo-colored lines across the band (issue #10494). A border drawn past the outline is stepped over first, so the band shows
 * beyond it rather than under it: on a node with a wide border the whole band was hidden. A border
 * centered on the outline or inside it draws the geometry in from the outline, so the band is measured
 * from the outline, the geometry grown back out by that inset (issue #10435).
 * @param extent - The halo geometry's half-extents, in its own units.
 * @param extent.x - Across.
 * @param extent.y - Up.
 * @param extent.z - In depth.
 * @param scale - The look's multiplier.
 * @param border - How far the node's border reaches past its drawn geometry, in the geometry's units.
 * @param inset - How far in from the node's outline its geometry is drawn, in the geometry's units.
 * @returns The scaling per axis.
 */
export function haloAxisScale(
    extent: { x: number; y: number; z: number },
    scale: number,
    border = 0,
    inset = 0,
): { x: number; y: number; z: number } {
    const face = Math.min(extent.x, extent.y);
    if (face <= 0 || Number.isNaN(face)) {
        return { x: scale, y: scale, z: scale };
    }
    const band = (scale - 1) * (face + inset) + border;
    const grow = (half: number): number => 1 + band / half;
    return { x: grow(extent.x), y: grow(extent.y), z: extent.z > face / 4 ? grow(extent.z) : 1 };
}
