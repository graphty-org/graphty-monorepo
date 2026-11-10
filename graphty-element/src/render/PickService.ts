/**
 * @file Every question of the form "what is at this point": one module, so a click, a hover,
 * `elementAt` and an XR beam cannot disagree (design/rendering/row-renderer.md 4.4).
 *
 * Two answers merge here. Meshes keep Babylon's own picks. Rows answer from {@link RowScan}, a walk
 * over `rowBounds` that needs no per-row mesh, no frame and no GPU. The scan exists once a graph
 * opens its row table, and from then on answers every press, every pick during a layout transition
 * and every world ray. Hover on the `"batched"` path reads {@link NodeIdTarget} instead, so a
 * pointer move walks no node.
 */

// Installs scene.pick, scene.pickWithRay and scene.createPickingRay; see
// test/packaging/babylon-side-effects.test.ts.
import "@babylonjs/core/Culling/ray.js";

import {
    type AbstractMesh,
    Matrix,
    type PickingInfo,
    Ray,
    type Scene,
    type TransformNode,
    Vector3,
} from "@babylonjs/core";

import type { EdgeId } from "../catalog/types";
import type { Edge } from "../Edge";
import { drawnCurveInWorld } from "../edgeWorldCurve";
import { isCloseLabel } from "../meshes/labelClose";
import { ON_TOP_RENDERING_GROUP } from "../meshes/RichTextLabel";
import type { NodeIdType } from "../Node";
import { pickAtLayout, transitionUnderWay } from "../transitions/LayoutTransitionRunner";
import type { EdgeIdTarget } from "./EdgeIdTarget";
import { ID_NONE, ID_OBJECT, type NodeIdTarget } from "./NodeIdTarget";

/**
 * Picks that walk every mesh or every row, counted so a test can show a pointer move makes none:
 * `meshPicks` for Babylon's pick over `scene.meshes`, `rowScans` for a walk over the rows.
 */
export const pickWork = { meshPicks: 0, rowScans: 0 };

/**
 * How many edges the exact edge test measured: `measured` on screen, each with a `worldToScreen`
 * per point, and `fromRows` with both ends read from the rows on the `"batched"` path.
 */
export const edgePickWork = { measured: 0, fromRows: 0 };

/** How far from a drawn edge's line, in CSS pixels, a click still lands on the edge. */
const EDGE_PICK_TOLERANCE_PX = 6;

/**
 * The mesh a click at a canvas point lands on, as the reader sees the picture.
 *
 * Babylon's pick returns the hit nearest the camera, whatever group it is drawn in. A label drawn
 * on top (`ON_TOP_RENDERING_GROUP`, `onTop`) covers every node, even one nearer the camera, so the nearest
 * hit is the wrong answer there: a click on the card went to the node hidden under it. A mesh drawn
 * on top that is hit wins; otherwise the nearest hit does.
 * @param scene - The scene to pick in.
 * @param x - X in CSS pixels from the canvas's left edge.
 * @param y - Y in CSS pixels from the canvas's top edge.
 * @returns The mesh, or null when the point lands on nothing.
 */
export function pickAsDrawn(scene: Scene, x: number, y: number): TransformNode | null {
    // While a layout transition moves the nodes, a click reads the layout's answer, not the
    // moving picture: what is selected is where the node is going.
    return pickAtLayout(scene, () => {
        const scan = rowScans.get(scene);
        return scan === undefined ? pickMeshes(scene, x, y, drawnPickable).info.pickedMesh : scan.pickPoint(x, y);
    });
}

/**
 * A pick predicate that admits a mesh only when `admit` does AND the world-space ray can reach
 * its world bounding sphere.
 *
 * Babylon's pick builds a ray in each admitted mesh's own space -- a world x view x projection
 * multiply, an invert and two unprojects -- before it tests the mesh, and every node is a mesh of
 * its own, so a pick with no such filter cost one unproject per node (issue #3244). Testing the one
 * world ray against the sphere Babylon keeps in world space costs a few multiplies, and Babylon's
 * own test is against that same sphere in the mesh's space, so a mesh this rejects is one Babylon
 * would have rejected: the line test below drops Babylon's "behind the ray's origin" check and pads
 * the radius, so it only ever admits more. What is picked is unchanged.
 *
 * ponytail: Babylon's pick still walks every mesh in `scene.meshes` and calls this for each, about
 * 15-20 ms a pick at 100,000 nodes; a GPU id buffer or a spatial index over node positions is the
 * upgrade if that matters.
 * @param scene - The scene being picked.
 * @param ray - The pick's ray in world space.
 * @param admit - Which meshes may be picked at all.
 * @returns The predicate.
 */
function alongRay(
    scene: Scene,
    ray: Ray,
    admit: (mesh: AbstractMesh, thinInstanceIndex?: number) => boolean,
): (mesh: AbstractMesh, thinInstanceIndex?: number) => boolean {
    // With several active cameras Babylon recomputes a camera-dependent mesh's world matrix for the
    // pointer's camera, so the sphere read here could be the other camera's: filter nothing then.
    const cameraDependent =
        (scene.activeCameras?.length ?? 0) > 1 && scene.cameraToUseForPointers !== scene.activeCamera;
    const { origin, direction } = ray;
    const usable = !cameraDependent && direction.lengthSquared() > 0;
    return (mesh, thinInstanceIndex = -1) => {
        if (thinInstanceIndex >= 0) {
            return admit(mesh, thinInstanceIndex);
        }

        if (!admit(mesh, thinInstanceIndex)) {
            return false;
        }

        if (!usable || mesh.hasThinInstances) {
            return true;
        }

        mesh.computeWorldMatrix();
        const { centerWorld, radiusWorld } = mesh.getBoundingInfo().boundingSphere;
        const dx = centerWorld.x - origin.x;
        const dy = centerWorld.y - origin.y;
        const dz = centerWorld.z - origin.z;
        const along = dx * direction.x + dy * direction.y + dz * direction.z;
        // Babylon widens the test by a line mesh's own threshold; no other mesh has one.
        const threshold =
            "intersectionThreshold" in mesh && typeof mesh.intersectionThreshold === "number"
                ? mesh.intersectionThreshold
                : 0;
        const radius = radiusWorld * (1 + 1e-5) + threshold;
        return dx * dx + dy * dy + dz * dz - along * along <= radius * radius;
    };
}

/** Babylon's own pointer picks, each made with the predicate the scene holds under this name. */
const POINTER_PICK_PREDICATES = ["pointerMovePredicate", "pointerDownPredicate", "pointerUpPredicate"] as const;

/** A pick predicate as Babylon calls it: the mesh, and a thin instance's index or -1. */
type PickPredicate = (mesh: AbstractMesh, thinInstanceIndex?: number) => boolean;

/**
 * Put {@link alongRay} in front of the predicates Babylon picks with on a pointer move, press and
 * release.
 *
 * Babylon picks the scene itself on every pointer move -- for the cursor and the action manager's
 * triggers, which every node mesh carries -- with `scene.pointerMovePredicate`, so a move cost one
 * unproject per node there too, besides the element's own picks. Babylon sets its default
 * predicates on the first event, and a consumer may set its own at any time, so each property is
 * replaced on this scene by one that wraps whatever is stored in it. A pick tests
 * `scene.meshes[0]` first, so the wrapper builds the pick's world ray there, from the pointer and
 * camera Babylon's own pointer picks use.
 * @param scene - The scene.
 */
export function filterPointerPicks(scene: Scene): void {
    for (const key of POINTER_PICK_PREDICATES) {
        const wrap = (base: PickPredicate | null | undefined): PickPredicate | null | undefined => {
            if (!base) {
                return base;
            }

            const ray = Ray.Zero();
            let test = base;
            return (mesh, thinInstanceIndex = -1) => {
                if (thinInstanceIndex < 0 && mesh === scene.meshes[0]) {
                    const pointer = scene.unTranslatedPointer;
                    scene.createPickingRayToRef(pointer.x, pointer.y, null, ray, scene.cameraToUseForPointers);
                    test = alongRay(scene, ray, base);
                }

                return test(mesh, thinInstanceIndex);
            };
        };
        let held = wrap(scene[key]);
        Object.defineProperty(scene, key, {
            configurable: true,
            enumerable: true,
            get: () => held,
            set: (base: PickPredicate | null | undefined) => {
                held = wrap(base);
            },
        });
    }
}

/**
 * The id of the node a click at a canvas point lands on, or `undefined` when it lands on none.
 *
 * Every pointer handler that asks "which node is under the pointer" and `elementAt` ask it here,
 * so the public answer and what a click selects cannot drift apart.
 * @param scene - The scene to pick in.
 * @param x - X in CSS pixels from the canvas's left edge.
 * @param y - Y in CSS pixels from the canvas's top edge.
 * @returns The node's id, or `undefined`.
 */
export function pickNodeId(scene: Scene, x: number, y: number): NodeIdType | undefined {
    const metadata = pickAsDrawn(scene, x, y)?.metadata as { nodeId?: NodeIdType } | null | undefined;
    return metadata?.nodeId;
}

/** How much a row's bounding radius is padded, so a rounding difference drops no true candidate. */
const BOUND_PAD = 1.001;
/** How far past the best hit, as a fraction of it, the nearest-first walk still tests a row. */
const STOP_PAST_BEST = 0.001;

/** What the scan reads of a row's table. */
export interface ScannedTable {
    readonly rows: number;
    readonly rowBounds: Float32Array;
}

/** What the scan reads of a row's node, for a candidate only. */
export interface ScannedRow {
    readonly index: number;
    readonly drawnPickMesh: AbstractMesh | null;
    readonly drawnAnchor: TransformNode;
    readonly drawnSourceMesh: AbstractMesh;
    readonly drawnScaling: Readonly<Vector3>;
    readonly drawnByRowScan: boolean;
}

/** A row a ray hit. */
export interface RowHit {
    readonly row: number;
    /** World distance along the ray, as Babylon measures it. */
    readonly distance: number;
    readonly point: Vector3 | null;
}

/** A mesh or row a ray landed on. */
export interface DrawnHit {
    readonly mesh: TransformNode | null;
    readonly point: Vector3 | null;
}

const drawnPickable = (mesh: AbstractMesh): boolean => mesh.isPickable && mesh.isVisible && mesh.isEnabled();
const rayPickable = (mesh: AbstractMesh): boolean => mesh.isPickable && mesh.isEnabled();

/**
 * The on-top rule of {@link pickAsDrawn}: a mesh drawn on top that is hit wins, otherwise the
 * nearest hit does.
 * @param scene - The scene.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @param admit - Which meshes may be picked.
 * @returns Babylon's answer, and whether it is a mesh drawn on top.
 */
function pickMeshes(
    scene: Scene,
    x: number,
    y: number,
    admit: (mesh: AbstractMesh) => boolean,
): { info: PickingInfo; onTop: boolean } {
    pickWork.meshPicks++;
    const ray = scene.createPickingRay(x, y, null, null);
    const onTop = scene.pick(
        x,
        y,
        alongRay(scene, ray, (mesh) => mesh.renderingGroupId >= ON_TOP_RENDERING_GROUP && admit(mesh)),
    );
    return onTop.hit
        ? { info: onTop, onTop: true }
        : { info: scene.pick(x, y, alongRay(scene, ray, admit)), onTop: false };
}

/**
 * The picks over the rows of one graph, Babylon's own narrow phase on a shared source mesh.
 *
 * Babylon derives a separate float32 ray for each mesh, so only the same arithmetic gets the same
 * answer: {@link RowScan.shapeRayHit} takes the screen point for that reason, and builds each
 * candidate's world matrix as the row's translation and scale, under the graph root. A closed form
 * or a hand-written triangle test disagreed at about 50,000 of 2,120,000 points.
 *
 * An exact tie goes to the lower row, which is `scene.pick`'s answer while row order equals
 * `scene.meshes` order.
 */
export class RowScan {
    private readonly identity = Matrix.Identity();
    private readonly local = Matrix.Identity();
    private readonly world = Matrix.Identity();
    private readonly inverse = Matrix.Identity();
    private readonly worldRay = Ray.Zero();
    private readonly rowRay = Ray.Zero();

    /**
     * Scan one graph's rows.
     * @param scene - The scene.
     * @param table - The rows.
     * @param nodeAt - A row's node.
     * @param root - What rows are placed inside, or null when they are in the world.
     */
    constructor(
        private readonly scene: Scene,
        private readonly table: ScannedTable,
        private readonly nodeAt: (row: number) => ScannedRow | undefined,
        private readonly root: TransformNode | null,
    ) {}

    /**
     * The row at a canvas point.
     * @param x - X in CSS pixels.
     * @param y - Y in CSS pixels.
     * @returns The nearest row hit, or null.
     */
    shapeRayHit(x: number, y: number): RowHit | null {
        const { scene, rowRay } = this;
        scene.createPickingRayToRef(x, y, null, this.worldRay, null, false);
        return this.walk(this.worldRay, (world) => {
            scene.createPickingRayToRef(x, y, world, rowRay, null, false);
            return rowRay;
        });
    }

    /**
     * The row a world ray hits: {@link RowScan.shapeRayHit} for what has no screen point.
     * @param ray - The ray.
     * @returns The nearest row hit, or null.
     */
    rowRayHit(ray: Ray): RowHit | null {
        return this.walk(ray, (world) => this.rayInRow(ray, world));
    }

    /**
     * Where a world ray meets one row and nothing else, as `Ray.intersectsMeshes` answers for the
     * row's mesh: {@link RowScan.rowRayHit}'s nearest row is the wrong answer for an edge's end,
     * whose ray starts inside one node and may cross others on its way.
     * @param row - The row.
     * @param ray - The ray.
     * @returns The point, or null for a miss.
     */
    rowRayHitOn(row: number, ray: Ray): Vector3 | null {
        const root = this.root?.computeWorldMatrix() ?? this.identity;
        return this.narrow(row, root, (world) => this.rayInRow(ray, world))?.pickedPoint ?? null;
    }

    /**
     * A row's center in the world.
     * @param row - The row.
     * @returns The point.
     */
    worldCenter(row: number): Vector3 {
        const { rowBounds: bounds } = this.table;
        const at = row * 4;
        return Vector3.TransformCoordinates(
            new Vector3(bounds[at], bounds[at + 1], bounds[at + 2]),
            this.root?.computeWorldMatrix() ?? this.identity,
        );
    }

    /**
     * {@link RowScan.worldCenter} into a vector it is given, for a walk that must not allocate.
     * @param row - The row.
     * @param root - {@link RowScan.rootMatrix}.
     * @param out - Where to write the point.
     * @returns `out`.
     */
    worldCenterToRef(row: number, root: Matrix, out: Vector3): Vector3 {
        const { rowBounds: bounds } = this.table;
        const at = row * 4;
        return Vector3.TransformCoordinatesFromFloatsToRef(bounds[at], bounds[at + 1], bounds[at + 2], root, out);
    }

    /**
     * The drawn rows whose centers lie inside a polygon on the canvas, in one typed walk: a row
     * that is hidden or not placed has a bound of 0 and is skipped, a row behind the camera is
     * skipped, and a row drawn behind another is kept.
     * @param polygon - The polygon, in CSS pixels from the canvas's top-left corner.
     * @returns The rows, in row order.
     */
    rowsInRegion(polygon: readonly CanvasPoint[]): number[] {
        const camera = this.scene.activeCamera;
        const found: number[] = [];
        if (!camera) {
            return found;
        }

        regionWork.rows += this.table.rows;
        const root = this.rootMatrix();
        // Root, then view (for the depth) and view and projection (for the screen), as
        // `screenProjector` and `pickEdgeAt` take them.
        const view = root.multiply(this.scene.getViewMatrix()).m;
        const clip = root.multiply(this.scene.getViewMatrix().multiply(this.scene.getProjectionMatrix())).m;
        const engine = this.scene.getEngine();
        const css = engine.getHardwareScalingLevel();
        const halfWidth = 0.5 * engine.getRenderWidth() * css;
        const halfHeight = 0.5 * engine.getRenderHeight() * css;
        const box = polygonBox(polygon);
        const { rowBounds: bounds, rows } = this.table;
        for (let row = 0, at = 0; row < rows; row++, at += 4) {
            if ((bounds[at + 3] ?? 0) <= 0) {
                continue;
            }

            const x = bounds[at] ?? 0;
            const y = bounds[at + 1] ?? 0;
            const z = bounds[at + 2] ?? 0;
            if (x * view[2] + y * view[6] + z * view[10] + view[14] < camera.minZ) {
                continue;
            }

            const w = x * clip[3] + y * clip[7] + z * clip[11] + clip[15];
            const sx = ((x * clip[0] + y * clip[4] + z * clip[8] + clip[12]) / w + 1) * halfWidth;
            const sy = (1 - (x * clip[1] + y * clip[5] + z * clip[9] + clip[13]) / w) * halfHeight;
            if (
                sx >= box.minX &&
                sx <= box.maxX &&
                sy >= box.minY &&
                sy <= box.maxY &&
                insidePolygon(polygon, sx, sy)
            ) {
                found.push(row);
            }
        }

        return found;
    }

    /**
     * What places every row in the world.
     * @returns The root's world matrix, or identity when rows are in the world.
     */
    rootMatrix(): Matrix {
        return this.root?.computeWorldMatrix() ?? this.identity;
    }

    /**
     * {@link pickAsDrawn} with rows answered by the scan and everything else by Babylon.
     * @param x - X in CSS pixels.
     * @param y - Y in CSS pixels.
     * @returns The mesh, or null.
     */
    pickPoint(x: number, y: number): TransformNode | null {
        const { info, onTop } = pickMeshes(this.scene, x, y, (mesh) => drawnPickable(mesh) && !this.covers(mesh));
        return onTop ? info.pickedMesh : this.nearer(info, this.shapeRayHit(x, y)).mesh;
    }

    /**
     * What a world ray lands on, as {@link pickRayAsDrawn} answers it.
     * @param ray - The ray.
     * @returns The mesh and point.
     */
    pickRay(ray: Ray): DrawnHit {
        const admit = (mesh: AbstractMesh): boolean => rayPickable(mesh) && !this.covers(mesh);
        return this.nearer(this.scene.pickWithRay(ray, alongRay(this.scene, ray, admit)), this.rowRayHit(ray));
    }

    /**
     * Whether the scan answers for a mesh, so Babylon's pick must leave it out.
     * @param mesh - The mesh.
     * @returns True for the own mesh of a row the table holds, unless its kind stays on Babylon.
     */
    private covers(mesh: AbstractMesh): boolean {
        const node = (mesh.metadata as { graphNode?: ScannedRow } | null | undefined)?.graphNode;
        return node?.drawnPickMesh === mesh && node.index < this.table.rows && node.drawnByRowScan;
    }

    /**
     * The nearer of a mesh and a row. An exact tie goes to the row: its mesh was built first.
     * @param info - Babylon's answer among the meshes.
     * @param row - The scan's answer among the rows.
     * @returns The mesh and point.
     */
    private nearer(info: PickingInfo | null, row: RowHit | null): DrawnHit {
        if (row !== null && (info?.hit !== true || row.distance <= info.distance)) {
            return { mesh: this.nodeAt(row.row)?.drawnAnchor ?? null, point: row.point };
        }

        return { mesh: info?.pickedMesh ?? null, point: info?.pickedPoint ?? null };
    }

    /**
     * A world ray in the space of a mesh with this world matrix.
     * @param ray - The ray.
     * @param world - The matrix.
     * @returns The ray, valid until the next call.
     */
    private rayInRow(ray: Ray, world: Matrix): Ray {
        world.invertToRef(this.inverse);
        Ray.TransformToRef(ray, this.inverse, this.rowRay);
        return this.rowRay;
    }

    /**
     * Walk the rows a ray can reach, nearest first, stopping past the best hit.
     * @param ray - The ray in world space.
     * @param rayFor - The ray Babylon would test a mesh with this world matrix against.
     * @returns The nearest row hit, or null.
     */
    private walk(ray: Ray, rayFor: (world: Matrix) => Ray): RowHit | null {
        pickWork.rowScans++;
        const root = this.root?.computeWorldMatrix() ?? this.identity;
        root.invertToRef(this.inverse);
        const origin = Vector3.TransformCoordinates(ray.origin, this.inverse);
        const direction = Vector3.TransformNormal(ray.direction, this.inverse);
        const stretch = direction.length();
        direction.scaleInPlace(1 / stretch);

        let best: RowHit | null = null;
        for (const { row, near } of this.candidates(origin, direction).sort((a, b) => a.near - b.near)) {
            if (best !== null && near / stretch > best.distance + STOP_PAST_BEST * (1 + Math.abs(best.distance))) {
                break;
            }

            const hit = this.narrow(row, root, rayFor);
            if (
                hit?.hit === true &&
                (best === null || hit.distance < best.distance || (hit.distance === best.distance && row < best.row))
            ) {
                best = { row, distance: hit.distance, point: hit.pickedPoint };
            }
        }

        return best;
    }

    /**
     * The rows whose padded bound a ray reaches: the one loop that sees every row.
     * @param origin - The ray's origin, in the rows' space.
     * @param direction - Its unit direction, in the rows' space.
     * @returns Each row and how far along the ray its bound starts.
     */
    private candidates(origin: Vector3, direction: Vector3): { row: number; near: number }[] {
        const { rowBounds: bounds, rows } = this.table;
        const { x: ox, y: oy, z: oz } = origin;
        const { x: dx, y: dy, z: dz } = direction;
        const found: { row: number; near: number }[] = [];
        for (let row = 0, at = 0; row < rows; row++, at += 4) {
            const radius = (bounds[at + 3] ?? 0) * BOUND_PAD;
            const cx = (bounds[at] ?? 0) - ox;
            const cy = (bounds[at + 1] ?? 0) - oy;
            const cz = (bounds[at + 2] ?? 0) - oz;
            const along = cx * dx + cy * dy + cz * dz;
            const reach = radius * radius - (cx * cx + cy * cy + cz * cz - along * along);
            if (radius > 0 && reach >= 0 && along + radius >= 0) {
                found.push({ row, near: along - Math.sqrt(reach) });
            }
        }

        return found;
    }

    /**
     * Babylon's own test of one row.
     * @param row - The row.
     * @param root - The matrix rows are placed under.
     * @param rayFor - The ray for a world matrix.
     * @returns What Babylon found, or null for a row the scan leaves to Babylon.
     */
    private narrow(row: number, root: Matrix, rayFor: (world: Matrix) => Ray): PickingInfo | null {
        const node = this.nodeAt(row);
        if (node?.drawnByRowScan !== true) {
            return null;
        }

        const { rowBounds: bounds } = this.table;
        const at = row * 4;
        const { x, y, z } = node.drawnScaling;
        Matrix.FromValuesToRef(
            x,
            0,
            0,
            0,
            0,
            y,
            0,
            0,
            0,
            0,
            z,
            0,
            bounds[at] ?? 0,
            bounds[at + 1] ?? 0,
            bounds[at + 2] ?? 0,
            1,
            this.local,
        );
        this.local.multiplyToRef(root, this.world);
        return node.drawnSourceMesh.intersects(rayFor(this.world), false, undefined, false, this.world, false);
    }
}

/** A point on the canvas, in CSS pixels from its top-left corner. */
export interface CanvasPoint {
    readonly x: number;
    readonly y: number;
}

/** What region walks read: rows from a row table, and nodes one at a time off it. */
export const regionWork = { rows: 0, nodes: 0 };

/**
 * A polygon's bounding box.
 * @param polygon - The polygon.
 * @returns Its least and greatest x and y.
 */
function polygonBox(polygon: readonly CanvasPoint[]): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
} {
    const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const { x, y } of polygon) {
        box.minX = Math.min(box.minX, x);
        box.minY = Math.min(box.minY, y);
        box.maxX = Math.max(box.maxX, x);
        box.maxY = Math.max(box.maxY, y);
    }

    return box;
}

/**
 * Whether a point lies inside a polygon, by the even-odd rule, so a lasso that crosses itself
 * leaves out what it wound around twice.
 * @param polygon - The polygon; its last point joins its first.
 * @param x - The point's x.
 * @param y - The point's y.
 * @returns True inside.
 */
export function insidePolygon(polygon: readonly CanvasPoint[], x: number, y: number): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];
        if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
            inside = !inside;
        }
    }

    return inside;
}

/** Each scene's scan, once its graph opened a row table. */
const rowScans = new WeakMap<Scene, RowScan>();

/**
 * Start the scan of a graph whose row table just opened.
 * @param scene - The scene.
 * @param table - The rows.
 * @param nodeAt - A row's node.
 * @param root - What rows are placed inside.
 */
export function openRowScan(
    scene: Scene,
    table: ScannedTable,
    nodeAt: (row: number) => ScannedRow | undefined,
    root: TransformNode,
): void {
    rowScans.set(scene, new RowScan(scene, table, nodeAt, root));
}

/**
 * A scene's scan.
 * @param scene - The scene.
 * @returns The scan, or undefined until its graph opens a row table.
 */
export function rowScanOf(scene: Scene): RowScan | undefined {
    return rowScans.get(scene);
}

/** Each scene's node ID target, while its graph draws on the `"batched"` path. */
const nodeIdTargets = new WeakMap<Scene, NodeIdReader>();

/** What hover needs besides the target. */
export interface NodeIdReader {
    readonly target: NodeIdTarget;
    /** The id of a row's node. */
    nodeIdAt(row: number): NodeIdType | undefined;
    /** Whether some rows draw nothing of their own pickable mesh (a shader surface): the target cannot see them. */
    hiddenRows(): boolean;
}

/**
 * Let hover read a scene's node ID target, or stop.
 * @param scene - The scene.
 * @param reader - The target and its graph, or null to stop.
 */
export function useNodeIdTarget(scene: Scene, reader: NodeIdReader | null): void {
    if (reader === null) {
        nodeIdTargets.delete(scene);
    } else {
        nodeIdTargets.set(scene, reader);
    }
}

/**
 * The node a hover at a canvas point is over. On the `"batched"` path it is read from the node ID
 * target with no walk over nodes, at once on WebGL and once read back on WebGPU; a pixel of a mesh that is not a batched row
 * (or of nothing, while some row is drawn only by a shader surface), a layout transition, a target not ready yet, or no target, asks {@link pickNodeId} at once.
 *
 * A pixel where two rows of the same depth overlap names the one drawn last, which a press,
 * settled by the scan's lower-row rule, may not (design/rendering/row-renderer.md 4.4).
 * @param scene - The scene.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @returns The node's id or `undefined`, now or once read.
 */
export function hoverNodeId(
    scene: Scene,
    x: number,
    y: number,
): NodeIdType | undefined | Promise<NodeIdType | undefined> {
    const ids = nodeIdTargets.get(scene);
    const read = ids === undefined || transitionUnderWay(scene) ? null : ids.target.read(x, y);
    if (ids === undefined || read === null) {
        return pickNodeId(scene, x, y);
    }

    const answer = (texel: number): NodeIdType | undefined => {
        if (texel === ID_OBJECT || (texel === ID_NONE && ids.hiddenRows())) {
            return pickNodeId(scene, x, y);
        }

        return texel === ID_NONE ? undefined : ids.nodeIdAt(texel);
    };
    return typeof read === "number" ? answer(read) : read.then(answer);
}

/**
 * What a world ray lands on: the XR pointer's pick. Unlike a click it has no on-top rule and
 * reads no layout transition, as the XR drag never did.
 * @param scene - The scene.
 * @param ray - The ray.
 * @returns The mesh and point, with a null mesh when it lands on nothing.
 */
export function pickRayAsDrawn(scene: Scene, ray: Ray): DrawnHit {
    const scan = rowScans.get(scene);
    if (scan !== undefined) {
        return scan.pickRay(ray);
    }

    const info = scene.pickWithRay(ray, alongRay(scene, ray, rayPickable));
    return { mesh: info?.pickedMesh ?? null, point: info?.pickedPoint ?? null };
}

/**
 * The close-button label under a point, whatever is in front of it.
 * @param scene - The scene.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @returns The label's mesh, or null.
 */
export function pickCloseLabel(scene: Scene, x: number, y: number): AbstractMesh | null {
    const ray = scene.createPickingRay(x, y, null, null);
    return scene.pick(x, y, alongRay(scene, ray, isCloseLabel)).pickedMesh;
}

/**
 * The world point under a canvas point.
 * @param scene - The scene.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @returns The point, or null when nothing is there.
 */
export function pickWorldPoint(scene: Scene, x: number, y: number): { x: number; y: number; z: number } | null {
    const point = scene.pick(x, y).pickedPoint;
    return point === null ? null : { x: point.x, y: point.y, z: point.z };
}

/**
 * The world points an edge's line is drawn through: its curve's points, or its two ends.
 * @param edge - The edge.
 * @returns The points, in order along the line.
 */
function edgeWorldPoints(edge: Edge): Vector3[] {
    return drawnCurveInWorld(edge) ?? [edge.srcNode.drawnWorldPosition, edge.dstNode.drawnWorldPosition];
}

/**
 * The distance from a point to a segment, in the segment's pixels.
 * @param x - The point's x.
 * @param y - The point's y.
 * @param a - One end.
 * @param a.x - Its x.
 * @param a.y - Its y.
 * @param b - The other end.
 * @param b.x - Its x.
 * @param b.y - Its y.
 * @returns The distance.
 */
function distanceToSegment(x: number, y: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length2));
    return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
}

/**
 * A scene's projection to screen as it stands now: a world point's place in CSS pixels from the
 * canvas's top-left corner. `Graph.worldToScreen` is this; a walk takes it once so each point costs
 * no matrix product.
 * @param scene - The scene.
 * @returns The projection.
 */
export function screenProjector(
    scene: Scene,
): (point: { x: number; y: number; z: number }) => { x: number; y: number } {
    const engine = scene.getEngine();
    const viewProjection = scene.getViewMatrix().multiply(scene.getProjectionMatrix());
    // The canvas may be drawn at a higher pixel ratio (`pixelRatio`), which the hardware scaling level undoes.
    const css = engine.getHardwareScalingLevel();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const clip = new Vector3();
    return (point) => {
        Vector3.TransformCoordinatesFromFloatsToRef(point.x, point.y, point.z, viewProjection, clip);
        return { x: (clip.x + 1) * 0.5 * width * css, y: (1 - clip.y) * 0.5 * height * css };
    };
}

/**
 * The drawn edge nearest a point, within {@link EDGE_PICK_TOLERANCE_PX} of its line.
 *
 * MEASURED ON SCREEN, not ray cast: every line is a thin instance of a shared, unpickable
 * batch, and a line a pixel or two wide is too thin to hit with a pointer anyway.
 * @param scene - The scene.
 * @param edges - The graph's edges.
 * @param x - X in CSS pixels from the canvas's left edge.
 * @param y - Y in CSS pixels from the canvas's top edge.
 * @param toScreen - A world point's place on screen, in render pixels.
 * @param rowEnds - A straight edge's two ends read from the rows, or null to measure it with
 *   `toScreen` point by point; such ends go through one {@link screenProjector}.
 * @returns The edge's id, or `undefined` when no drawn edge is that close.
 */
export function pickEdgeAt(
    scene: Scene,
    edges: Iterable<Edge>,
    x: number,
    y: number,
    toScreen: (point: Vector3) => { x: number; y: number },
    rowEnds?: (edge: Edge) => readonly [Vector3, Vector3] | null,
): EdgeId | undefined {
    const camera = scene.activeCamera;
    // Nothing is drawn before the first frame, and the scene's view matrix is unset until
    // then: a press that arrives first picks nothing.
    if (!camera || scene.getFrameId() === 0) {
        return undefined;
    }

    // worldToScreen answers in render pixels; Babylon's own picking divides CSS pixels by the
    // hardware scaling level the same way.
    const scaling = scene.getEngine().getHardwareScalingLevel();
    const px = x / scaling;
    const py = y / scaling;
    let best = EDGE_PICK_TOLERANCE_PX / scaling;
    let found: EdgeId | undefined;
    const view = scene.getViewMatrix().m;
    const inFront = (p: Vector3): boolean => p.x * view[2] + p.y * view[6] + p.z * view[10] + view[14] >= camera.minZ;
    const segment = (
        id: EdgeId,
        a: Vector3,
        b: Vector3,
        screen: (point: Vector3) => { x: number; y: number },
    ): void => {
        if (!inFront(a) || !inFront(b)) {
            return;
        }

        const distance = distanceToSegment(px, py, screen(a), screen(b));
        if (distance <= best) {
            best = distance;
            found = id;
        }
    };
    const project = rowEnds === undefined ? toScreen : screenProjector(scene);

    // ponytail: a linear walk over every edge per pick; a spatial index if picking huge graphs on hover.
    for (const edge of edges) {
        if (edge.isDisposed() || !edge.isRenderVisible()) {
            continue;
        }

        const ends = rowEnds?.(edge) ?? null;
        if (ends !== null) {
            edgePickWork.fromRows++;
            segment(edge.id, ends[0], ends[1], project);
            continue;
        }

        edgePickWork.measured++;
        const points = edgeWorldPoints(edge);
        for (let i = 1; i < points.length; i++) {
            segment(edge.id, points[i - 1], points[i], toScreen);
        }
    }

    return found;
}

/**
 * {@link pickEdgeAt}, with every straight edge between two batched rows measured from the row
 * table in one typed walk on the `"batched"` path: no `worldToScreen` and no new vector per edge.
 * The ends it reads are the ones `Node.drawnWorldPosition` answers, so the answer is the same.
 * Off the `"batched"` path it is {@link pickEdgeAt}.
 * @param scene - The scene.
 * @param edges - The edges to measure.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @param toScreen - A world point's place on screen, for the edges the rows cannot place.
 * @returns The edge's id, or `undefined`.
 */
export function pickEdgeId(
    scene: Scene,
    edges: Iterable<Edge>,
    x: number,
    y: number,
    toScreen: (point: Vector3) => { x: number; y: number },
): EdgeId | undefined {
    const scan = rowScanOf(scene);
    if (!edgeIdTargets.has(scene) || scan === undefined) {
        return pickEdgeAt(scene, edges, x, y, toScreen);
    }

    const root = scan.rootMatrix();
    const ends: [Vector3, Vector3] = [new Vector3(), new Vector3()];
    return pickEdgeAt(scene, edges, x, y, toScreen, (edge) => {
        const { srcNode, dstNode } = edge;
        if (!srcNode.drawnInBatch || !dstNode.drawnInBatch || edge.drawnCurve !== null) {
            return null;
        }

        scan.worldCenterToRef(srcNode.index, root, ends[0]);
        scan.worldCenterToRef(dstNode.index, root, ends[1]);
        return ends;
    });
}

/** Each scene's edge ID target, while its graph draws on the `"batched"` path. */
const edgeIdTargets = new WeakMap<Scene, EdgeIdTarget>();

/**
 * Let an edge hover read a scene's edge ID target, or stop.
 * @param scene - The scene.
 * @param target - The target, or null to stop.
 */
export function useEdgeIdTarget(scene: Scene, target: EdgeIdTarget | null): void {
    if (target === null) {
        edgeIdTargets.delete(scene);
    } else {
        edgeIdTargets.set(scene, target);
    }
}

/**
 * The drawn edge a hover at a canvas point is over: {@link pickEdgeAt}'s answer. On the `"batched"`
 * path only the edges the edge ID target draws near the point, and those it cannot draw, are
 * measured, at once on WebGL and once read back on WebGPU; a layout transition, a target not ready
 * yet, or no target, measures every edge at once.
 *
 * Where two lines cover the same pixels the target names the one drawn last, so hover may miss
 * an edge a press would find under it (design/rendering/row-renderer.md 4.4).
 * @param scene - The scene.
 * @param edges - The graph's edges, for the full walk.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @param toScreen - A world point's place on screen, in render pixels.
 * @returns The edge's id or `undefined`, now or once read.
 */
export function hoverEdgeAt(
    scene: Scene,
    edges: () => Iterable<Edge>,
    x: number,
    y: number,
    toScreen: (point: Vector3) => { x: number; y: number },
): EdgeId | undefined | Promise<EdgeId | undefined> {
    const target = edgeIdTargets.get(scene);
    // The window must hold every pixel within the tolerance of the pointer's pixel center.
    const radius = Math.ceil(EDGE_PICK_TOLERANCE_PX / scene.getEngine().getHardwareScalingLevel()) + 1;
    const near = target === undefined || transitionUnderWay(scene) ? null : target.candidates(x, y, radius);
    if (near === null) {
        return pickEdgeId(scene, edges(), x, y, toScreen);
    }

    const measure = (candidates: Edge[]): EdgeId | undefined => pickEdgeId(scene, candidates, x, y, toScreen);
    return Array.isArray(near) ? measure(near) : near.then(measure);
}
