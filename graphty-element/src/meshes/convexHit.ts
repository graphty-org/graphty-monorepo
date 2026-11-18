import type { Ray } from "@babylonjs/core/Culling/ray.js";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { VertexBuffer } from "@babylonjs/core/Meshes/buffer.js";

/** A closed convex mesh as its face planes, four numbers each (`n`, `d`, with `n . x <= d` inside); null when not. */
type Planes = Float64Array | null;

/** Planes by the positions array they were measured from: node meshes of one shape share it, so it is measured once. */
const measured = new WeakMap<object, Planes>();

/** A flat shape's slab: its outline as flat x, y pairs, and its depth (measured on first use), by positions array. */
const slabs = new WeakMap<object, { outline: Float64Array; depth?: [number, number] }>();

/**
 * Record that a mesh is a flat outline walled round into a slab (`outlineSlab`), so a ray meets it from its outline
 * rather than by a search of its triangles, convex or not (a star, a cross, Pajek's man).
 * @param mesh - The slab, built.
 * @param outline - The outline it was built from, in the mesh's own units.
 */
export function noteSlabOutline(mesh: AbstractMesh, outline: readonly (readonly [number, number])[]): void {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (positions !== null) {
        slabs.set(positions, { outline: Float64Array.from(outline.flat()) });
    }
}

const inverse = new Matrix();
const localOrigin = new Vector3();
const localDirection = new Vector3();

/**
 * Where a world ray first meets a mesh, worked out from the mesh's face planes when the mesh is a closed convex
 * solid (a box, cylinder, cone, polyhedron), or from its outline when it is a flat shape's slab (a star, a cross),
 * so no triangle is searched. The point is the one
 * `ray.intersectsMeshes([mesh])[0].pickedPoint` gives, to float error: the nearest wall at or past the ray's origin.
 * @param mesh - The mesh, with its world matrix already computed.
 * @param ray - The ray, in the world.
 * @param world - Where the mesh's shape is drawn, when not at the mesh's own world matrix (a batch's row).
 * @returns The point in the world, null for a miss, or undefined when the mesh is neither a closed convex solid nor a
 * recorded slab and only a search of its triangles can answer.
 */
export function convexRayHit(mesh: AbstractMesh, ray: Ray, world?: Matrix): Vector3 | null | undefined {
    const planes = planesOf(mesh, world === undefined);
    const slab = planes === null ? slabOf(mesh) : undefined;
    if (planes === undefined || (planes === null && slab === undefined)) {
        return undefined;
    }

    (world ?? mesh.getWorldMatrix()).invertToRef(inverse);
    Vector3.TransformCoordinatesToRef(ray.origin, inverse, localOrigin);
    Vector3.TransformNormalToRef(ray.direction, inverse, localDirection);
    const t =
        planes === null ? slabRayHit(slab?.outline ?? new Float64Array(), slab?.depth ?? [0, 0]) : planesRayHit(planes);
    return t === null || t > ray.length ? null : ray.origin.add(ray.direction.scale(t));
}

/**
 * Where the local ray first meets a closed convex solid at or past its origin.
 * @param planes - Its face planes.
 * @returns How far along the ray, or null for a miss.
 */
function planesRayHit(planes: Float64Array): number | null {
    const { x: ox, y: oy, z: oz } = localOrigin;
    const { x: dx, y: dy, z: dz } = localDirection;

    // the ray is o + t d: it is inside a plane's half space for t on one side of where it crosses that plane
    let enter = -Infinity;
    let leave = Infinity;
    for (let at = 0; at < planes.length; at += 4) {
        const nx = planes[at];
        const ny = planes[at + 1];
        const nz = planes[at + 2];
        const outside = nx * ox + ny * oy + nz * oz - planes[at + 3];
        const along = nx * dx + ny * dy + nz * dz;
        if (along === 0) {
            if (outside > 0) {
                return null;
            }
        } else if (along < 0) {
            enter = Math.max(enter, -outside / along);
        } else {
            leave = Math.min(leave, -outside / along);
        }
    }

    // the nearest wall at or past the origin: the way in, or from inside, the way out
    const t = enter >= 0 ? enter : leave;
    return enter > leave || t < 0 ? null : t;
}

/**
 * A mesh's slab record ({@link noteSlabOutline}), its depth measured on first use, after any build step moved its
 * faces along z (`placeByDrawOrder`).
 * @param mesh - The mesh.
 * @returns The record, or undefined when the mesh is not a recorded slab.
 */
function slabOf(mesh: AbstractMesh): { outline: Float64Array; depth?: [number, number] } | undefined {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    const slab = positions === null ? undefined : slabs.get(positions);
    if (positions !== null && slab !== undefined && slab.depth === undefined) {
        let [near, far] = [Infinity, -Infinity];
        for (let z = 2; z < positions.length; z += 3) {
            near = Math.min(near, positions[z]);
            far = Math.max(far, positions[z]);
        }
        slab.depth = [near, far];
    }
    return slab;
}

/**
 * Where the local ray first meets a slab at or past its origin: its front or back face, inside the outline, or a wall
 * of the outline, between the faces.
 * @param outline - The outline, flat x, y pairs.
 * @param depth - The slab's nearest and farthest z.
 * @returns How far along the ray, or null for a miss.
 */
function slabRayHit(outline: Float64Array, depth: readonly [number, number]): number | null {
    const { x: ox, y: oy, z: oz } = localOrigin;
    const { x: dx, y: dy, z: dz } = localDirection;
    let best = Infinity;

    for (const face of dz === 0 ? [] : depth) {
        const t = (face - oz) / dz;
        if (t >= 0 && t < best && inside(outline, ox + t * dx, oy + t * dy)) {
            best = t;
        }
    }

    const n = outline.length / 2;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const [px, py] = [outline[2 * i], outline[2 * i + 1]];
        const [ex, ey] = [outline[2 * j] - px, outline[2 * j + 1] - py];
        const across = dx * ey - dy * ex;
        const [wx, wy] = [px - ox, py - oy];
        // where the ray crosses this wall's line (t), and how far along the wall (s)
        const t = (wx * ey - wy * ex) / across;
        const s = (wx * dy - wy * dx) / across;
        const z = oz + t * dz;
        if (across !== 0 && t >= 0 && t < best && s >= 0 && s <= 1 && z >= depth[0] && z <= depth[1]) {
            best = t;
        }
    }

    return best === Infinity ? null : best;
}

/**
 * Whether a point is inside an outline, by the even-odd rule: a line from it to the right crosses the outline an odd
 * number of times.
 * @param outline - The outline, flat x, y pairs.
 * @param px - The point's x.
 * @param py - The point's y.
 * @returns True inside.
 */
function inside(outline: Float64Array, px: number, py: number): boolean {
    const n = outline.length / 2;
    let odd = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const [ax, ay, bx, by] = [outline[2 * i], outline[2 * i + 1], outline[2 * j], outline[2 * j + 1]];
        if (ay > py !== by > py && px < ax + ((py - ay) * (bx - ax)) / (by - ay)) {
            odd = !odd;
        }
    }
    return odd;
}

/**
 * A mesh's face planes, measured once per positions array.
 * @param mesh - The mesh.
 * @param ownWorld - Whether the shape is met where the mesh itself is drawn: then thin instances draw it elsewhere too.
 * @returns The planes, null when it is not a closed convex solid, or undefined when it is not plain triangles.
 */
function planesOf(mesh: AbstractMesh, ownWorld: boolean): Planes | undefined {
    // a mesh bent by bones or morphs, or drawing more than itself, is not where its positions say
    if (mesh.skeleton !== null || mesh.morphTargetManager !== null || (ownWorld && mesh.hasThinInstances)) {
        return undefined;
    }

    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = mesh.getIndices();
    if (positions === null || indices === null) {
        return undefined;
    }

    let planes = measured.get(positions);
    if (planes === undefined) {
        planes = measure(positions, indices);
        measured.set(positions, planes);
    }

    return planes;
}

/** The corners of a mesh with each seam's copies welded into one. */
interface Welded {
    /** Each vertex's corner. */
    corner: Int32Array;
    /** How many corners. */
    count: number;
    /** The middle of the corners. */
    middle: [number, number, number];
}

/**
 * Weld a mesh's vertices: the same corner is several vertices, one per face normal or seam.
 * @param positions - The vertex positions.
 * @param tolerance - How near two vertices are to be one corner.
 * @returns The corners.
 */
function weld(positions: ArrayLike<number>, tolerance: number): Welded {
    const ids = new Map<string, number>();
    const corner = new Int32Array(positions.length / 3);
    const middle: [number, number, number] = [0, 0, 0];
    for (let v = 0; v < corner.length; v++) {
        const at = [positions[3 * v], positions[3 * v + 1], positions[3 * v + 2]];
        const key = at.map((value) => Math.round(value / tolerance)).join(",");
        let id = ids.get(key);
        if (id === undefined) {
            id = ids.size;
            ids.set(key, id);
            at.forEach((value, axis) => (middle[axis] += value));
        }
        corner[v] = id;
    }
    return { corner, count: ids.size, middle: [middle[0] / ids.size, middle[1] / ids.size, middle[2] / ids.size] };
}

/**
 * The plane of one triangle, facing away from the middle, if every vertex is inside it and not all on it.
 * @param positions - The vertex positions.
 * @param triangle - The triangle's three vertices.
 * @param middle - A point inside the solid.
 * @param tolerance - How far off a plane counts as on it.
 * @returns The plane, undefined for a sliver, or null when the mesh is not a convex solid.
 */
function planeOf(
    positions: ArrayLike<number>,
    triangle: readonly number[],
    middle: readonly number[],
    tolerance: number,
): number[] | null | undefined {
    const [a, b, c] = triangle;
    const [ax, ay, az] = [positions[3 * a], positions[3 * a + 1], positions[3 * a + 2]];
    const [ux, uy, uz] = [positions[3 * b] - ax, positions[3 * b + 1] - ay, positions[3 * b + 2] - az];
    const [vx, vy, vz] = [positions[3 * c] - ax, positions[3 * c + 1] - ay, positions[3 * c + 2] - az];
    const normal = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const length = Math.hypot(...normal);
    if (length < tolerance * tolerance) {
        return undefined;
    }
    let [nx, ny, nz] = normal.map((value) => value / length);
    let d = nx * ax + ny * ay + nz * az;
    // outward from the middle of the corners, whatever the winding
    if (nx * middle[0] + ny * middle[1] + nz * middle[2] > d) {
        [nx, ny, nz, d] = [-nx, -ny, -nz, -d];
    }

    let deepest = 0;
    for (let v = 0; v < positions.length; v += 3) {
        const reach = nx * positions[v] + ny * positions[v + 1] + nz * positions[v + 2] - d;
        if (reach > tolerance * 10) {
            return null; // a corner outside this face: not convex
        }
        deepest = Math.min(deepest, reach);
    }
    // every corner on this face: flat, no volume
    return deepest > -tolerance * 10 ? null : [nx, ny, nz, d];
}

/**
 * The face planes of a triangle mesh that is the surface of a convex solid, or null: every welded edge is shared by
 * exactly two triangles (closed), every vertex lies inside every triangle's plane, and it has volume. Such a surface
 * covers its convex hull's boundary, so a point is inside it exactly when it is inside every plane.
 * @param positions - The vertex positions.
 * @param indices - The triangles.
 * @returns The planes, or null.
 */
function measure(positions: ArrayLike<number>, indices: ArrayLike<number>): Planes {
    let size = 0;
    for (let i = 0; i < positions.length; i++) {
        size = Math.max(size, Math.abs(positions[i]));
    }
    if (size === 0 || indices.length < 12) {
        return null;
    }

    const tolerance = size * 1e-5;
    const { corner, count, middle } = weld(positions, tolerance);
    const edges = new Map<number, number>();
    const planes = new Map<string, number[]>();
    for (let at = 0; at + 2 < indices.length; at += 3) {
        const triangle = [indices[at], indices[at + 1], indices[at + 2]];
        const [wa, wb, wc] = triangle.map((v) => corner[v]);
        if (wa === wb || wb === wc || wa === wc) {
            continue; // a sliver (a cone's tip): no face, no edge
        }
        for (const [p, q] of [
            [wa, wb],
            [wb, wc],
            [wc, wa],
        ]) {
            const key = Math.min(p, q) * count + Math.max(p, q);
            edges.set(key, (edges.get(key) ?? 0) + 1);
        }

        const plane = planeOf(positions, triangle, middle, tolerance);
        if (plane === null) {
            return null;
        }
        if (plane !== undefined) {
            planes.set(plane.map((value) => Math.round(value / tolerance)).join(","), plane);
        }
    }

    // open, or two pieces touching at an edge
    if ([...edges.values()].some((shared) => shared !== 2) || planes.size === 0) {
        return null;
    }

    return Float64Array.from([...planes.values()].flat());
}
