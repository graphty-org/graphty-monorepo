import type { Camera } from "@babylonjs/core/Cameras/camera.js";
import { Matrix } from "@babylonjs/core/Maths/math.vector.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { Scene } from "@babylonjs/core/scene.js";
import { INVALID_INDEX } from "@graphty/graph-format";

/** What an instance draws: a node, whose row may change as rows are renumbered. */
interface RowOwner {
    readonly index: number;
}

/** The node each listed instance draws. */
const owners = new WeakMap<AbstractMesh, RowOwner>();
/** The highest row an instance of each source was listed for. */
const lastRow = new WeakMap<Mesh, number>();
/** The sources each scene listed an instance of, so a frame finds the translucent ones without a walk. */
const listedSources = new WeakMap<Scene, Set<Mesh>>();
/** Scenes listed an instance below a higher row of its source since they were last sorted. */
const unsorted = new WeakSet<Scene>();

/**
 * Depths closer than this along the camera's view, in scene units, are a tie, which keeps row order.
 * Both render paths round alike, so a node a hair nearer on one path's float precision than the
 * other's still ties, and the flat 2D view, whose nodes all sit at one depth, stays in row order.
 */
const DEPTH_STEP = 1e-4;
const SPACE_TO_VIEW = new Matrix();

/**
 * Whether a look's nodes are blended (drawn at an opacity between 0 and 1), so the order they are
 * drawn in shows.
 * @param mesh - The look's source or its batch.
 * @returns True when they are.
 */
export function blendsRows(mesh: AbstractMesh): boolean {
    return mesh.visibility > 0 && mesh.visibility < 1;
}

/**
 * How far along a camera's view points of one space lie, rounded to {@link DEPTH_STEP}: larger is
 * farther, so back to front is largest first. A point is rounded to 32 bits first, as the row
 * table keeps it, so both render paths measure a node alike.
 * @param camera - The camera.
 * @param space - The world matrix of the space the points are in, or null for world space.
 * @returns The depth of a point.
 */
export function viewDepth(camera: Camera, space: Matrix | null): (x: number, y: number, z: number) => number {
    const view = camera.getViewMatrix();
    const { m } = space === null ? view : space.multiplyToRef(view, SPACE_TO_VIEW);
    const [a, b, c, d] = [m[2], m[6], m[10], m[14]];
    return (x, y, z) => Math.round((a * Math.fround(x) + b * Math.fround(y) + c * Math.fround(z) + d) / DEPTH_STEP);
}

/**
 * Draw a node's instance among the other instances of its source as a batch draws its rows on
 * `"batched"`: in row order, and a translucent source's back to front from the camera with ties in
 * row order (issue #10045). Babylon draws a source's instances in the order `scene.meshes` lists
 * them, which is the order they were made, so a node whose mesh was made again went to the end
 * (issue #10030), and Babylon's own back-to-front sort of instances is one global switch
 * (`Mesh.INSTANCEDMESH_SORT_TRANSPARENT`) that would change every scene on the page. The list is
 * sorted before a frame chooses what to draw: when an instance was listed below a higher row of its
 * source, and every frame a translucent source is listed, when it is out of order.
 * @param mesh - The node's mesh.
 * @param owner - The node.
 */
export function drawInRowOrder(mesh: AbstractMesh, owner: RowOwner): void {
    if (!(mesh instanceof InstancedMesh)) {
        return;
    }

    owners.set(mesh, owner);
    // A node gets its row after its mesh is built; it is listed again when it does (`placeNodeRow`).
    if (owner.index === INVALID_INDEX) {
        return;
    }

    const scene = mesh.getScene();
    const { sourceMesh } = mesh;
    const last = lastRow.get(sourceMesh) ?? -1;
    if (owner.index < last) {
        unsorted.add(scene);
    }

    lastRow.set(sourceMesh, Math.max(last, owner.index));
    let sources = listedSources.get(scene);
    if (sources === undefined) {
        sources = new Set();
        listedSources.set(scene, sources);
        const watched = sources;
        scene.onBeforeActiveMeshesEvaluationObservable.add(() => {
            const camera = scene.activeCamera;
            const blended = camera !== null && someBlend(watched);
            if (unsorted.delete(scene) || blended) {
                sortListed(scene.meshes, blended ? camera : null);
            }
        });
    }

    sources.add(sourceMesh);
}

/**
 * Whether a listed source is translucent, forgetting the disposed ones.
 * @param sources - The scene's listed sources.
 * @returns True when one is.
 */
function someBlend(sources: Set<Mesh>): boolean {
    let some = false;
    for (const source of sources) {
        if (source.isDisposed()) {
            sources.delete(source);
        } else {
            some ||= blendsRows(source);
        }
    }

    return some;
}

/**
 * Put the listed instances in row order, a translucent source's back to front from the camera
 * first, in the places they hold, leaving every other mesh where it is. Only a source's own
 * instances' order shows, so one order across sources does.
 * ponytail: a walk of `scene.meshes` each frame a translucent source is listed; keep a list per
 * source if a graph of many objects with translucent nodes gets slow.
 * @param meshes - The scene's meshes.
 * @param camera - The camera to sort translucent sources by, or null for row order alone.
 */
function sortListed(meshes: AbstractMesh[], camera: Camera | null): void {
    const places: number[] = [];
    const listed: { mesh: AbstractMesh; depth: number; row: number }[] = [];
    let space: unknown = undefined;
    let depthOf: ((x: number, y: number, z: number) => number) | null = null;
    let ordered = true;
    meshes.forEach((mesh, at) => {
        const owner = owners.get(mesh);
        if (owner === undefined) {
            return;
        }

        let depth = 0;
        if (camera !== null && mesh instanceof InstancedMesh && blendsRows(mesh.sourceMesh)) {
            // a node's mesh sits in graph-root: one space for every node, measured once
            const { parent } = mesh;
            if (depthOf === null || parent !== space) {
                space = parent;
                depthOf = viewDepth(camera, parent === null ? null : parent.getWorldMatrix());
            }

            const { x, y, z } = mesh.position;
            depth = -depthOf(x, y, z);
        }

        const entry = { mesh, depth, row: owner.index };
        const previous = listed.at(-1);
        ordered &&= previous === undefined || byDepthThenRow(previous, entry) <= 0;
        places.push(at);
        listed.push(entry);
    });
    if (ordered) {
        return;
    }

    listed.sort(byDepthThenRow);
    places.forEach((at, i) => {
        const entry = listed[i];
        if (entry !== undefined) {
            meshes[at] = entry.mesh;
        }
    });
}

/**
 * Farthest first (a depth key is the negated depth), then row.
 * @param a - One instance.
 * @param a.depth - Its depth key.
 * @param a.row - Its row.
 * @param b - The other.
 * @param b.depth - Its depth key.
 * @param b.row - Its row.
 * @returns Negative when `a` draws first.
 */
function byDepthThenRow(a: { depth: number; row: number }, b: { depth: number; row: number }): number {
    return a.depth - b.depth || a.row - b.row;
}
