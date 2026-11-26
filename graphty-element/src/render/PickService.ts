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
// Installs Mesh.createInstance for the stand-in of a row a Babylon pick lands on.
import "@babylonjs/core/Meshes/instancedMesh.js";

import type { InstancedMesh } from "@babylonjs/core";
import type { Camera } from "@babylonjs/core/Cameras/camera.js";
import { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo.js";
import { Ray } from "@babylonjs/core/Culling/ray.core.js";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import type { Scene } from "@babylonjs/core/scene.js";
import { INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeId } from "../catalog/types";
import type { Edge } from "../Edge";
import { drawnCurveInWorld } from "../edgeWorldCurve";
import { convexRayHit } from "../meshes/convexHit";
import { isCloseLabel } from "../meshes/labelClose";
import { ON_TOP_RENDERING_GROUP } from "../meshes/RichTextLabel";
import type { NodeIdType } from "../Node";
import { pickAtLayout, transitionUnderWay } from "../transitions/LayoutTransitionRunner";
import type { EdgeCandidates, EdgeIdTarget } from "./EdgeIdTarget";
import { ID_NONE, ID_OBJECT, type IdDrawn, type IdPick, type NodeIdTarget } from "./NodeIdTarget";

/**
 * Picks that walk every mesh or every row, counted so a test can show a pointer move makes none:
 * `meshPicks` for Babylon's pick over `scene.meshes`, `rowScans` for a walk over the rows, and `pointerPicks` for
 * Babylon's own pick of a pointer event testing the meshes along the ray ({@link filterPointerPicks}).
 */
export const pickWork = { meshPicks: 0, rowScans: 0, pointerPicks: 0 };

/**
 * How many edges the exact edge test measured: `measured` on screen, each with a `worldToScreen`
 * per point, and `fromRows` with both ends read from the rows on the `"batched"` path.
 */
export const edgePickWork = { measured: 0, fromRows: 0, rowLines: 0 };

/**
 * The edges drawn with no `Edge` on the `"batched"` path (`EdgeRowLines`), as an edge pick reads them: each shown
 * line's edge row and its two node rows, and the edge id of a row, with no object built per edge.
 */
export interface RowLinePicks {
    /** Visit each shown line, or only those of `only`. */
    forEachShown(visit: (row: number, source: number, target: number) => void, only?: readonly number[]): void;
    /** The id of the edge a line draws, or undefined when the row no longer draws one. */
    idOf(row: number): EdgeId | undefined;
}

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
                    const pressed = key === "pointerMovePredicate" ? undefined : pressAnswer(scene, key);
                    if (pressed === undefined) {
                        pickWork.pointerPicks++;
                        const pointer = scene.unTranslatedPointer;
                        scene.createPickingRayToRef(pointer.x, pointer.y, null, ray, scene.cameraToUseForPointers);
                        test = alongRay(scene, ray, base);
                    } else {
                        test = (candidate, index) => candidate === pressed && base(candidate, index);
                    }
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

/** The last pick over `scene.meshes` ({@link pickMeshes}), for {@link pickPressedNodeId}. */
let lastMeshPick: { readonly scene: Scene; readonly mesh: AbstractMesh | null; readonly onTop: boolean } | null = null;

/** The press each scene's next pointer-down pick answers with; see {@link pickPressedNodeId}. */
const pressAnswers = new WeakMap<
    Scene,
    { readonly x: number; readonly y: number; readonly mesh: AbstractMesh | null }
>();

/**
 * {@link pickNodeId} for a press, whose answer also stands for the pick Babylon makes of the same press right after
 * (for the node's actions and `pointerInfo.pickInfo`): each walks every mesh, about 45 ms at 99,000 nodes, so a click
 * paid for two (issue #10116). Only an answer that is the nearest hit stands, the one Babylon's own pick gives: a mesh
 * drawn on top is not (see {@link pickAsDrawn}), nor a row of the batched path.
 * @param scene - The scene.
 * @returns The id of the node pressed, or `undefined`.
 */
export function pickPressedNodeId(scene: Scene): NodeIdType | undefined {
    const { pointerX: x, pointerY: y } = scene;
    lastMeshPick = null;
    const id = pickNodeId(scene, x, y);
    const pick = meshPickMade();
    if (pick !== null && pick.scene === scene && !pick.onTop && !rowScans.has(scene) && !transitionUnderWay(scene)) {
        pressAnswers.set(scene, { x, y, mesh: pick.mesh });
    } else {
        pressAnswers.delete(scene);
    }

    return id;
}

/**
 * The pick over `scene.meshes` made since {@link lastMeshPick} was cleared, read through a call so a caller's check is
 * not narrowed away.
 * @returns The pick, or null.
 */
function meshPickMade(): typeof lastMeshPick {
    return lastMeshPick;
}

/**
 * The mesh the press at the pointer found, for Babylon's pick of that press and of its release at the same point, or
 * `undefined` when no press at this point left one. The release's pick takes it.
 * @param scene - The scene.
 * @param key - Which of Babylon's picks asks.
 * @returns The mesh, null for none, or undefined.
 */
function pressAnswer(scene: Scene, key: (typeof POINTER_PICK_PREDICATES)[number]): AbstractMesh | null | undefined {
    const answer = pressAnswers.get(scene);
    if (key === "pointerUpPredicate") {
        pressAnswers.delete(scene);
    }

    return answer?.x === scene.pointerX && answer.y === scene.pointerY ? answer.mesh : undefined;
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
    /** One row's center, read without bringing every row up to a landing the lane owes. */
    centerOf(row: number): Vector3;
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

/** What a ray against one row reads of what draws it. */
export type RowShape = Pick<ScannedRow, "drawnByRowScan" | "drawnSourceMesh" | "drawnScaling">;

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

/** What a node mesh's metadata says of its file's draw order, for {@link drawnLaterOver}. */
interface DrawnOrder {
    readonly drawOrder?: number;
}

/**
 * The file's draw order of the node a mesh draws (`shape.drawOrder`), or undefined for none.
 * @param mesh - The mesh.
 * @returns The order.
 */
function drawOrderOf(mesh: AbstractMesh | null): number | undefined {
    return (mesh?.metadata as DrawnOrder | null | undefined)?.drawOrder;
}

/**
 * The hit of a node a file draws later (a higher `shape.drawOrder`) inside the slab of the node the ray hit nearest,
 * or the nearest hit itself.
 *
 * In 3D a flat node is a slab as deep as a fiftieth of its smaller side, and its draw order does not move it (it only
 * orders 2D, `NodeMesh.placeByDrawOrder`). So where a file draws a box first and nodes over it in the same plane, the
 * bigger box's front face is the nearer, and a click on a node inside it took the box: every gene of the NDEx CX2
 * "Toll-like receptor pathway" sample selected its pathway box in 3D (issue #10116). Only when the nearest hit has a
 * draw order is the ray walked again, for the other hits.
 * @param scene - The scene.
 * @param ray - The pick's world ray.
 * @param admit - Which meshes may be picked.
 * @param nearest - The nearest hit.
 * @returns The hit to answer with.
 */
function drawnLaterOver(
    scene: Scene,
    ray: Ray,
    admit: (mesh: AbstractMesh) => boolean,
    nearest: PickingInfo,
): PickingInfo {
    const picked = nearest.pickedMesh;
    let order = drawOrderOf(picked);
    if (picked === null || order === undefined) {
        return nearest;
    }

    const slab = 2 * picked.getBoundingInfo().boundingBox.extendSizeWorld.z;
    let best = nearest;
    for (const hit of scene.multiPickWithRay(ray, alongRay(scene, ray, admit)) ?? []) {
        const hitOrder = drawOrderOf(hit.pickedMesh);
        if (hitOrder !== undefined && hitOrder > order && hit.distance - nearest.distance <= slab) {
            best = hit;
            order = hitOrder;
        }
    }

    return best;
}

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
    const onTop = babylonPick(scene)(
        x,
        y,
        alongRay(scene, ray, (mesh) => mesh.renderingGroupId >= ON_TOP_RENDERING_GROUP && admit(mesh)),
    );
    const answer = onTop.hit
        ? { info: onTop, onTop: true }
        : {
              info: drawnLaterOver(scene, ray, admit, babylonPick(scene)(x, y, alongRay(scene, ray, admit))),
              onTop: false,
          };
    lastMeshPick = { scene, mesh: answer.info.pickedMesh, onTop: answer.onTop };
    return answer;
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
     * @param shapeAt - What draws a row, for testing a ray against it: a row drawn with no `Node` answers from its
     *     row, so a ray that only passes near rows builds no `Node` for them (issue #9166). By default, its node.
     */
    constructor(
        private readonly scene: Scene,
        private readonly table: ScannedTable,
        readonly nodeAt: (row: number) => ScannedRow | undefined,
        private readonly root: TransformNode | null,
        private readonly shapeAt: (row: number) => RowShape | undefined = nodeAt,
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
     * Whether a canvas point lands on one row's own shape, tested as {@link RowScan.shapeRayHit} tests
     * each row, with no walk over the others.
     * @param row - The row.
     * @param x - X in CSS pixels.
     * @param y - Y in CSS pixels.
     * @returns Whether it does, or undefined for a row the scan leaves to Babylon's pick.
     */
    hitsRowAt(row: number, x: number, y: number): boolean | undefined {
        const { scene, rowRay } = this;
        const hit = this.narrow(row, this.root?.computeWorldMatrix() ?? this.identity, (world) => {
            scene.createPickingRayToRef(x, y, world, rowRay, null, false);
            return rowRay;
        });
        return hit === null ? undefined : hit.hit;
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
     * @param drawn - What draws the row, when the caller has it: a row drawn with no `Node` passes its own source
     *     mesh, so asking where a ray meets it builds no `Node` (issue #9166).
     * @returns The point, or null for a miss.
     */
    rowRayHitOn(row: number, ray: Ray, drawn: RowShape | undefined = this.shapeAt(row)): Vector3 | null {
        const root = this.root?.computeWorldMatrix() ?? this.identity;
        // a closed convex shape (box, cylinder, cone, polyhedron) is met from its face planes, as a node's own mesh is
        const convex =
            drawn?.drawnByRowScan === true
                ? convexRayHit(drawn.drawnSourceMesh, ray, this.rowWorld(row, root, drawn))
                : null;
        return convex === undefined
            ? (this.narrow(row, root, (world) => this.rayInRow(ray, world), drawn)?.pickedPoint ?? null)
            : convex;
    }

    /**
     * A row's center in the world.
     * @param row - The row.
     * @returns The point.
     */
    worldCenter(row: number): Vector3 {
        // one row, so a landing the lane owes is read for this row alone, not written for every row
        return Vector3.TransformCoordinates(this.table.centerOf(row), this.root?.computeWorldMatrix() ?? this.identity);
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
        const { view, clip, halfWidth, halfHeight } = this.toScreen(camera);
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
     * The row line nearest a point, within `best`, in one typed walk: each line runs between its two nodes'
     * centers, as `PulledLineBatch` draws it, put on screen as {@link screenProjector} does. A line with an end
     * behind the camera is skipped, as {@link pickEdgeAt} skips such an edge; of lines equally near, the last wins.
     * @param px - X in CSS pixels.
     * @param py - Y in CSS pixels.
     * @param best - The farthest a line may be, in the same pixels.
     * @param lines - The lines.
     * @param only - Measure only these edge rows.
     * @returns The edge row and its distance, or null when no line is that near.
     */
    nearestRowLine(
        px: number,
        py: number,
        best: number,
        lines: RowLinePicks,
        only?: readonly number[],
    ): { row: number; distance: number } | null {
        const camera = this.scene.activeCamera;
        if (!camera) {
            return null;
        }

        const { view, clip, halfWidth, halfHeight } = this.toScreen(camera);
        const { minZ } = camera;
        const { rowBounds: bounds } = this.table;
        let nearest = best;
        let found = -1;
        let measured = 0;
        lines.forEachShown((row, source, target) => {
            measured++;
            const a = source * 4;
            const b = target * 4;
            const ax = bounds[a] ?? 0;
            const ay = bounds[a + 1] ?? 0;
            const az = bounds[a + 2] ?? 0;
            const bx = bounds[b] ?? 0;
            const by = bounds[b + 1] ?? 0;
            const bz = bounds[b + 2] ?? 0;
            if (
                ax * view[2] + ay * view[6] + az * view[10] + view[14] < minZ ||
                bx * view[2] + by * view[6] + bz * view[10] + view[14] < minZ
            ) {
                return;
            }

            const aw = ax * clip[3] + ay * clip[7] + az * clip[11] + clip[15];
            const sax = ((ax * clip[0] + ay * clip[4] + az * clip[8] + clip[12]) / aw + 1) * halfWidth;
            const say = (1 - (ax * clip[1] + ay * clip[5] + az * clip[9] + clip[13]) / aw) * halfHeight;
            const bw = bx * clip[3] + by * clip[7] + bz * clip[11] + clip[15];
            const sbx = ((bx * clip[0] + by * clip[4] + bz * clip[8] + clip[12]) / bw + 1) * halfWidth;
            const sby = (1 - (bx * clip[1] + by * clip[5] + bz * clip[9] + clip[13]) / bw) * halfHeight;
            const dx = sbx - sax;
            const dy = sby - say;
            const length2 = dx * dx + dy * dy;
            const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - sax) * dx + (py - say) * dy) / length2));
            const distance = Math.hypot(px - (sax + t * dx), py - (say + t * dy));
            if (distance <= nearest) {
                nearest = distance;
                found = row;
            }
        }, only);
        edgePickWork.rowLines += measured;
        return found === -1 ? null : { row: found, distance: nearest };
    }

    /**
     * How a row's center goes to the screen now: root, then view (for the depth), and root, view and projection
     * (for the screen), as `screenProjector` and `pickEdgeAt` take them, with half the canvas in CSS pixels. The
     * camera's matrices, not the scene's: the scene's are unset until its first frame.
     * @param camera - The scene's active camera.
     * @returns The matrices' values and the half sizes.
     */
    private toScreen(camera: Camera): {
        view: Matrix["m"];
        clip: Matrix["m"];
        halfWidth: number;
        halfHeight: number;
    } {
        const root = this.rootMatrix();
        const engine = this.scene.getEngine();
        const css = engine.getHardwareScalingLevel();
        return {
            view: root.multiply(camera.getViewMatrix()).m,
            clip: root.multiply(camera.getViewMatrix().multiply(camera.getProjectionMatrix())).m,
            halfWidth: 0.5 * engine.getRenderWidth() * css,
            halfHeight: 0.5 * engine.getRenderHeight() * css,
        };
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
     * The world point at a canvas point, as {@link pickWorldPoint} answers it: Babylon's pick
     * among the meshes the scan does not cover, and the nearer of that and the rows.
     * @param x - X in CSS pixels.
     * @param y - Y in CSS pixels.
     * @returns The point, or null when nothing is there.
     */
    pointAt(x: number, y: number): Vector3 | null {
        const info = this.scene.pick(x, y, (mesh) => drawnPickable(mesh) && !this.covers(mesh));
        return this.nearer(info, this.shapeRayHit(x, y)).point;
    }

    /**
     * What a world ray lands on, as {@link pickRayAsDrawn} answers it.
     * @param ray - The ray.
     * @returns The mesh and point.
     */
    pickRay(ray: Ray): DrawnHit {
        const admit = (mesh: AbstractMesh): boolean => rayPickable(mesh) && !this.covers(mesh);
        return this.nearer(babylonPickWithRay(this.scene)(ray, alongRay(this.scene, ray, admit)), this.rowRayHit(ray));
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
        const sorted = this.candidates(origin, direction).sort((a, b) => a.near - b.near);
        for (const { row, near } of sorted) {
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

        return best === null ? null : this.drawnLaterRow(best, sorted, stretch, root, rayFor);
    }

    /**
     * {@link drawnLaterOver} among the rows: the hit of a row a file draws later (a higher `shape.drawOrder`, read off
     * its source mesh) inside the slab of the nearest row, or the nearest row itself. Only a nearest row with a draw
     * order looks again.
     * @param nearest - The nearest row hit.
     * @param sorted - The rows the ray reaches, nearest bound first.
     * @param stretch - How the rows' space stretches the ray.
     * @param root - {@link RowScan.rootMatrix}.
     * @param rayFor - The ray Babylon would test a mesh with this world matrix against.
     * @returns The hit to answer with.
     */
    private drawnLaterRow(
        nearest: RowHit,
        sorted: readonly { row: number; near: number }[],
        stretch: number,
        root: Matrix,
        rayFor: (world: Matrix) => Ray,
    ): RowHit {
        const shape = this.shapeAt(nearest.row);
        let order = drawOrderOf(shape?.drawnSourceMesh ?? null);
        if (shape === undefined || order === undefined) {
            return nearest;
        }

        const { m } = this.rowWorld(nearest.row, root, shape);
        const depth = Math.hypot(m[8], m[9], m[10]);
        const slab = 2 * shape.drawnSourceMesh.getBoundingInfo().boundingBox.extendSize.z * depth;
        let best = nearest;
        for (const { row, near } of sorted) {
            if (near / stretch > nearest.distance + slab) {
                break;
            }

            const drawn = this.shapeAt(row);
            const rowOrder = drawOrderOf(drawn?.drawnSourceMesh ?? null);
            if (rowOrder === undefined || rowOrder <= order) {
                continue;
            }

            const hit = this.narrow(row, root, rayFor, drawn);
            if (hit?.hit === true && hit.distance - nearest.distance <= slab) {
                best = { row, distance: hit.distance, point: hit.pickedPoint };
                order = rowOrder;
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
     * @param node - What draws the row.
     * @returns What Babylon found, or null for a row the scan leaves to Babylon.
     */
    private narrow(
        row: number,
        root: Matrix,
        rayFor: (world: Matrix) => Ray,
        node: RowShape | undefined = this.shapeAt(row),
    ): PickingInfo | null {
        if (node?.drawnByRowScan !== true) {
            return null;
        }

        return node.drawnSourceMesh.intersects(
            rayFor(this.rowWorld(row, root, node)),
            false,
            undefined,
            false,
            this.world,
            false,
        );
    }

    /**
     * Where a row's node is drawn in the world: its bound's center and its scaling, under graph-root.
     * @param row - The row.
     * @param root - {@link RowScan.rootMatrix}.
     * @param node - What draws the row.
     * @returns The matrix, which the next call overwrites.
     */
    private rowWorld(row: number, root: Matrix, node: RowShape | undefined = this.shapeAt(row)): Matrix {
        const { rowBounds: bounds } = this.table;
        const at = row * 4;
        const { x, y, z } = node?.drawnScaling ?? { x: 1, y: 1, z: 1 };
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
        return this.world;
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
 * @param shapeAt - What draws a row, without building a `Node` for a row drawn with none.
 */
export function openRowScan(
    scene: Scene,
    table: ScannedTable,
    nodeAt: (row: number) => ScannedRow | undefined,
    root: TransformNode,
    shapeAt?: (row: number) => RowShape | undefined,
): void {
    rowScans.set(scene, new RowScan(scene, table, nodeAt, root, shapeAt));
}

/**
 * A scene's scan.
 * @param scene - The scene.
 * @returns The scan, or undefined until its graph opens a row table.
 */
export function rowScanOf(scene: Scene): RowScan | undefined {
    return rowScans.get(scene);
}

/**
 * A scene's `pick` as Babylon defines it, under the wrapper {@link pickRowsInBabylon} puts on the scene: the element's
 * own picks ask the scan for rows themselves.
 * @param scene - The scene.
 * @returns The pick, bound to the scene.
 */
function babylonPick(scene: Scene): Scene["pick"] {
    return (Object.getPrototypeOf(scene) as Scene).pick.bind(scene);
}

/**
 * A scene's `pickWithRay` as Babylon defines it; see {@link babylonPick}.
 * @param scene - The scene.
 * @returns The pick, bound to the scene.
 */
function babylonPickWithRay(scene: Scene): Scene["pickWithRay"] {
    return (Object.getPrototypeOf(scene) as Scene).pickWithRay.bind(scene);
}

/** The scenes whose Babylon picks {@link pickRowsInBabylon} wrapped. */
const pickingRows = new WeakSet<Scene>();

/**
 * Put an instance of a meshless row's source on the row's anchor, named and labeled as the row's mesh was, so a
 * Babylon pick that sees only meshes can land on the row: the one it had, when it still draws that source.
 * @param standIn - The stand-in put there before, if any.
 * @param source - The row's source mesh.
 * @param anchor - The row's anchor.
 * @returns The stand-in, enabled.
 */
export function rowStandIn(
    standIn: InstancedMesh | null | undefined,
    source: Mesh,
    anchor: TransformNode,
): InstancedMesh {
    if (standIn?.sourceMesh !== source || standIn.isDisposed()) {
        standIn?.dispose();
        standIn = source.createInstance(anchor.name);
        // An instance starts at its source's place; the anchor is the whole placement.
        standIn.position.setAll(0);
        standIn.rotationQuaternion = null;
        standIn.rotation.setAll(0);
        standIn.scaling.setAll(1);
        // Babylon's pointer predicates admit a mesh with no actions only with this set; a node's mesh has actions.
        standIn.enablePointerMoveEvents = true;
    }

    standIn.name = anchor.name;
    standIn.metadata = anchor.metadata as unknown;
    standIn.parent = anchor;
    standIn.setEnabled(true);
    return standIn;
}

/**
 * Let Babylon's own `scene.pick` and `scene.pickWithRay` find the rows a batch draws, which have no mesh of their own.
 *
 * On the `"objects"` path every node is a mesh, so those picks name it: a consumer's own pick, the `pickInfo` Babylon
 * gives a pointer observer, and the action Babylon runs on the mesh it picked. On `"batched"` they saw through the
 * nodes to whatever was behind, and a click on a node ran the action of a consumer's mesh behind it. Each is wrapped on
 * the scene, while its graph draws batched: Babylon picks the meshes, the scan the rows, and when a row is nearer the
 * answer names a stand-in for it -- an instance of the row's source on the row's anchor, with the name and metadata the
 * node's own mesh would carry. The stand-in is enabled only while the pick's predicate is asked, so no frame draws it
 * and no other pick finds it.
 *
 * Babylon's own pick on a pointer move (made with `scene.pointerMovePredicate`) is left to the meshes: hover reads the
 * node ID target with no walk over the rows, and a scan on every move would undo that.
 *
 * ponytail: one stand-in per scene, so a `pickInfo` kept past a later pick that lands on another row names that row;
 * one stand-in per picked row is the upgrade if a consumer needs to hold several. A move's `pickInfo` and Babylon's
 * pointer-over mesh do not name a batched row; answering a move from the hover's one ID-target read is the upgrade.
 * @param scene - The scene.
 */
function pickRowsInBabylon(scene: Scene): void {
    if (pickingRows.has(scene)) {
        return;
    }

    pickingRows.add(scene);
    const pick = babylonPick(scene);
    const pickWithRay = babylonPickWithRay(scene);
    let standIn: InstancedMesh | null = null;
    const answer = (
        info: PickingInfo | null,
        ray: Ray | null,
        hit: RowHit | null,
        scan: RowScan,
        predicate: ((mesh: AbstractMesh, thinInstanceIndex: number) => boolean) | undefined,
    ): PickingInfo | null => {
        // A tie keeps Babylon's mesh: a row with a mesh of its own, or XR's own stand-in (`laserOnRows`).
        if (hit === null || (info?.hit === true && info.distance <= hit.distance)) {
            return info;
        }

        const node = scan.nodeAt(hit.row);
        const source = node?.drawnSourceMesh;
        if (node?.drawnPickMesh !== null || !(source instanceof Mesh)) {
            return info;
        }

        standIn = rowStandIn(standIn, source, node.drawnAnchor);
        const admitted = predicate
            ? predicate(standIn, -1)
            : standIn.isPickable && standIn.isVisible && standIn.isEnabled();
        standIn.setEnabled(false);
        if (!admitted) {
            return info;
        }

        const result = new PickingInfo();
        result.hit = true;
        result.distance = hit.distance;
        result.pickedPoint = hit.point;
        result.pickedMesh = standIn;
        result.ray = info?.ray ?? ray;
        return result;
    };
    const batched = (): RowScan | undefined => (nodeIdTargets.has(scene) ? rowScans.get(scene) : undefined);

    scene.pick = (...args) => {
        const info = pick(...args);
        const [x, y, predicate, , camera] = args;
        const scan = batched();
        // The scan's ray is the active camera's, as Babylon's is unless a pick names another camera.
        const moving = predicate !== undefined && predicate === scene.pointerMovePredicate;
        if (
            scan === undefined ||
            moving ||
            (camera !== undefined && camera !== null && camera !== scene.activeCamera)
        ) {
            return info;
        }

        return answer(info, null, scan.shapeRayHit(x, y), scan, predicate) ?? info;
    };
    scene.pickWithRay = (...args) => {
        const info = pickWithRay(...args);
        const [ray, predicate] = args;
        const scan = batched();
        return scan === undefined ? info : answer(info, ray, scan.rowRayHit(ray), scan, predicate);
    };
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
        pickRowsInBabylon(scene);
    }
}

/** A hover's answer: the node under the pointer, and where the node ID target drew it. */
export interface HoverPick {
    readonly id: NodeIdType | undefined;
    /** Where the target drew the node in the frame it was read from; absent when it does not say. */
    readonly drawn?: IdDrawn;
}

/**
 * The node a hover at a canvas point is over. On the `"batched"` path it is read from the node ID
 * target with no walk over nodes, at once on WebGL and once read back on WebGPU, where the answer
 * also says where the node was drawn in the frame it was read from; a pixel of a mesh that is not a batched row
 * (or of nothing, while some row is drawn only by a shader surface), a layout transition, a target not ready yet, or no target, asks {@link pickNodeId} at once.
 *
 * A pixel where two rows of the same depth overlap names the one drawn last, which a press,
 * settled by the scan's lower-row rule, may not (design/rendering/row-renderer.md 4.4).
 * @param scene - The scene.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @returns The node and where it was drawn, now or once read.
 */
export function hoverNodeId(scene: Scene, x: number, y: number): HoverPick | Promise<HoverPick> {
    const ids = nodeIdTargets.get(scene);
    const read = ids === undefined || transitionUnderWay(scene) ? null : ids.target.pick(x, y);
    if (ids === undefined || read === null) {
        return { id: pickNodeId(scene, x, y) };
    }

    const answer = ({ texel, drawn }: IdPick): HoverPick => {
        if (texel === ID_OBJECT || (texel === ID_NONE && ids.hiddenRows())) {
            return { id: pickNodeId(scene, x, y) };
        }

        // The target draws a row smaller than a pixel larger than it is, and answers for a whole pixel, so a
        // pointer up to about a pixel off a row's shape can read it there. A read answered from the frame on
        // screen (WebGL: no `drawn`) is checked against the row's own shape, and a miss asks the pick a click
        // asks, so hover never names a node where a click and elementAt find none (#9915). Only that row is
        // tested; the walk happens only on a miss, along a node's rim.
        if (texel >= 0 && drawn === undefined && rowScans.get(scene)?.hitsRowAt(texel, x, y) === false) {
            return { id: pickNodeId(scene, x, y) };
        }

        const id = texel === ID_NONE ? undefined : ids.nodeIdAt(texel);
        return id === undefined || drawn === undefined ? { id } : { id, drawn };
    };
    return read instanceof Promise ? read.then(answer) : answer(read);
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

    const info = babylonPickWithRay(scene)(ray, alongRay(scene, ray, rayPickable));
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
    return babylonPick(scene)(x, y, alongRay(scene, ray, isCloseLabel)).pickedMesh;
}

/**
 * The world point under a canvas point.
 * @param scene - The scene.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @returns The point, or null when nothing is there.
 */
export function pickWorldPoint(scene: Scene, x: number, y: number): { x: number; y: number; z: number } | null {
    // A row drawn by a batch has no pickable mesh of its own, so the row scan answers it (issue #9861).
    const scan = rowScans.get(scene);
    const point = scan === undefined ? scene.pick(x, y).pickedPoint : scan.pointAt(x, y);
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
 * @param camera - The camera it is seen through (the scene's active camera). Its matrices are
 *   read, not the scene's, which are unset until the scene's first frame.
 * @returns The projection.
 */
export function screenProjector(
    scene: Scene,
    camera: Camera,
): (point: { x: number; y: number; z: number }) => { x: number; y: number } {
    const engine = scene.getEngine();
    const viewProjection = camera.getViewMatrix().multiply(camera.getProjectionMatrix());
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
 * @param toScreen - A world point's place on screen, in CSS pixels (`Graph.worldToScreen`).
 * @param rowEnds - A straight edge's two ends read from the rows, or null to measure it with
 *   `toScreen` point by point; such ends go through one {@link screenProjector}.
 * @param rowLines - The edges drawn with no `Edge`, measured after `edges` ({@link RowScan.nearestRowLine}).
 * @param rowLines.scan - The scan that places their ends.
 * @param rowLines.lines - The lines.
 * @param rowLines.only - Measure only these edge rows.
 * @returns The edge's id, or `undefined` when no drawn edge is that close.
 */
export function pickEdgeAt(
    scene: Scene,
    edges: Iterable<Edge>,
    x: number,
    y: number,
    toScreen: (point: Vector3) => { x: number; y: number },
    rowEnds?: (edge: Edge) => readonly [Vector3, Vector3] | null,
    rowLines?: { scan: RowScan; lines: RowLinePicks; only?: readonly number[] },
): EdgeId | undefined {
    const camera = scene.activeCamera;
    // Nothing is drawn before the first frame, and the scene's view matrix is unset until
    // then: a press that arrives first picks nothing.
    if (!camera || scene.getFrameId() === 0) {
        return undefined;
    }

    // Everything here is in CSS pixels: the point, the tolerance, `toScreen` (`Graph.worldToScreen`),
    // `screenProjector` and the row lines. Dividing by the hardware scaling level here lost every edge
    // at a pixel ratio other than 1 (issue #9917).
    const px = x;
    const py = y;
    let best = EDGE_PICK_TOLERANCE_PX;
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
    const project = rowEnds === undefined ? toScreen : screenProjector(scene, camera);

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

    const line = rowLines?.scan.nearestRowLine(px, py, best, rowLines.lines, rowLines.only) ?? null;
    const lineId = line === null ? undefined : rowLines?.lines.idOf(line.row);
    return lineId ?? found;
}

/**
 * {@link pickEdgeAt}, with every straight edge between two batched rows measured from the row
 * table in one typed walk on the `"batched"` path: no `worldToScreen` and no new vector per edge.
 * The ends it reads are the ones `Node.drawnWorldPosition` answers, so the answer is the same.
 * There the edges drawn with no `Edge` are measured too, from the rows. Off the `"batched"` path
 * it is {@link pickEdgeAt}.
 * @param scene - The scene.
 * @param edges - The `Edge`s to measure.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @param toScreen - A world point's place on screen, for the edges the rows cannot place.
 * @param lines - The edges drawn with no `Edge`, or null when there are none.
 * @param only - Measure only these of `lines`' edge rows; all of them when absent.
 * @returns The edge's id, or `undefined`.
 */
export function pickEdgeId(
    scene: Scene,
    edges: Iterable<Edge>,
    x: number,
    y: number,
    toScreen: (point: Vector3) => { x: number; y: number },
    lines: RowLinePicks | null = null,
    only?: readonly number[],
): EdgeId | undefined {
    const scan = rowScanOf(scene);
    if (!edgeIdTargets.has(scene) || scan === undefined) {
        return pickEdgeAt(scene, edges, x, y, toScreen);
    }

    const root = scan.rootMatrix();
    const ends: [Vector3, Vector3] = [new Vector3(), new Vector3()];
    return pickEdgeAt(
        scene,
        edges,
        x,
        y,
        toScreen,
        (edge) => {
            // Rows, not Nodes: measuring every edge must build no Node for an end drawn without one (issue #9166).
            const src = edge.batchEndRow("source");
            const dst = src === INVALID_INDEX ? INVALID_INDEX : edge.batchEndRow("target");
            if (dst === INVALID_INDEX || edge.drawnCurve !== null) {
                return null;
            }

            scan.worldCenterToRef(src, root, ends[0]);
            scan.worldCenterToRef(dst, root, ends[1]);
            return ends;
        },
        lines === null ? undefined : { scan, lines, only },
    );
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
 * @param toScreen - A world point's place on screen, in CSS pixels (`Graph.worldToScreen`).
 * @param lines - The edges drawn with no `Edge`, or null when there are none.
 * @returns The edge's id or `undefined`, now or once read.
 */
export function hoverEdgeAt(
    scene: Scene,
    edges: () => Iterable<Edge>,
    x: number,
    y: number,
    toScreen: (point: Vector3) => { x: number; y: number },
    lines: RowLinePicks | null = null,
): EdgeId | undefined | Promise<EdgeId | undefined> {
    const near = edgesNear(scene, x, y);
    if (near === null) {
        return pickEdgeId(scene, edges(), x, y, toScreen, lines);
    }

    const measure = (candidates: EdgeCandidates): EdgeId | undefined =>
        pickEdgeId(scene, candidates.edges, x, y, toScreen, lines, candidates.rows);
    return near instanceof Promise ? near.then(measure) : measure(near);
}

/**
 * The drawn edge `elementAt` at a canvas point finds: {@link pickEdgeAt}'s answer, now. On the `"batched"` path it
 * measures only the edges the edge ID target draws near the point, and those it cannot draw, as {@link hoverEdgeAt}
 * does, so it costs the same at a million edges as at a thousand. WebGL reads the target now. WebGPU reads it back
 * only asynchronously, so there it takes the edges near the point from the last read: the hover's window where the
 * pointer rests, or else the newest whole read of the target, drawn from what is drawn now, from the picture on
 * screen or from the one before it ({@link EdgeIdTarget.held}). A click does not use this, see {@link clickEdgeAt}.
 * ponytail: an answer no read can give is one typed walk over every row line, with no object per line: the first
 * `elementAt` on WebGPU (or the first after the target stopped whole reads, {@link EdgeIdTarget.held}), one right
 * after the lines or the canvas changed and before a frame drew them, one from an older picture whose edges near the
 * point are no longer under it, before the target is ready, or with no target. In a layout transition it walks too:
 * there every pick answers at the layout's end, which `pickAtLayout` reaches by moving every moving node there and
 * back, so the pick is a walk over the nodes whatever the edges cost. A CPU index of the lines if that matters.
 * @param args - {@link hoverEdgeAt}'s: the scene, the graph's edges, x and y, toScreen and the row lines.
 * @returns The edge's id, or `undefined`.
 */
export function pressEdgeAt(...args: Parameters<typeof hoverEdgeAt>): EdgeId | undefined {
    const [scene, edges, x, y, toScreen, lines = null] = args;
    const near = scene.getEngine().isWebGPU ? heldNear(scene, x, y, true) : edgesNear(scene, x, y);
    if (near === null || near instanceof Promise) {
        return pickEdgeId(scene, edges(), x, y, toScreen, lines);
    }

    const found = pickEdgeId(scene, near.edges, x, y, toScreen, lines, near.rows);
    // A read of an older picture may miss the edge that moved under the point since: measure every edge then.
    return found === undefined && near.stale === true ? pickEdgeId(scene, edges(), x, y, toScreen, lines) : found;
}

/**
 * The drawn edge a click at a canvas point lands on. As {@link pressEdgeAt}, except that on WebGPU, where the last
 * read does not answer for the point, it waits for the edge ID target's read instead of walking every line, as a
 * hover does: a click on a graph whose layout is still moving its rows, or at a point the pointer never rested on,
 * costs a window's read, not a walk over a million lines.
 * @param args - {@link hoverEdgeAt}'s.
 * @returns The edge's id or `undefined`, now or once read.
 */
export function clickEdgeAt(...args: Parameters<typeof hoverEdgeAt>): EdgeId | undefined | Promise<EdgeId | undefined> {
    const [scene, , x, y, toScreen, lines = null] = args;
    const near = scene.getEngine().isWebGPU ? heldNear(scene, x, y) : null;
    return near === null ? hoverEdgeAt(...args) : pickEdgeId(scene, near.edges, x, y, toScreen, lines, near.rows);
}

/**
 * The edges the edge ID target names within the pick tolerance of a canvas point.
 * @param scene - The scene.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @returns They, now or once read; null with no target, during a layout transition, or before it can answer.
 */
function edgesNear(scene: Scene, x: number, y: number): EdgeCandidates | Promise<EdgeCandidates> | null {
    const target = edgeIdTargets.get(scene);
    return target === undefined || transitionUnderWay(scene) ? null : target.candidates(x, y, pickRadius(scene));
}

/**
 * {@link edgesNear} from the last read only, for a press on WebGPU.
 * @param scene - The scene.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @param whole - Also answer from the target's whole reads, as `elementAt` does ({@link EdgeIdTarget.held}).
 * @returns The edges, or null when no read answers for the point now.
 */
function heldNear(scene: Scene, x: number, y: number, whole = false): EdgeCandidates | null {
    const target = edgeIdTargets.get(scene);
    return target === undefined || transitionUnderWay(scene) ? null : target.held(x, y, pickRadius(scene), whole);
}

/**
 * The edge ID target window's half-width: it must hold every pixel within the tolerance of the pointer's pixel
 * center.
 * @param scene - The scene.
 * @returns The half-width, in render pixels.
 */
function pickRadius(scene: Scene): number {
    return Math.ceil(EDGE_PICK_TOLERANCE_PX / scene.getEngine().getHardwareScalingLevel()) + 1;
}
