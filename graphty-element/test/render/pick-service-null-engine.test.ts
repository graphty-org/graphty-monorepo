/**
 * @file Every "what is at this point" question the element asks, answered on a NullEngine scene with
 * no frame and no GPU: Babylon's own mesh picks with the on-top rule, the row scan once a graph opens
 * its row table, the hover readers that put a node or edge ID target in front of them, and the edge
 * test measured on screen. The ID targets themselves need a GPU, so each is stood in for by what
 * the pick module reads of it: a texel, or the edges near a point.
 */

import {
    type AbstractMesh,
    FreeCamera,
    type Mesh,
    MeshBuilder,
    NullEngine,
    Ray,
    Scene,
    TransformNode,
    Vector3,
} from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";
import { afterEach, assert, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { ON_TOP_RENDERING_GROUP } from "../../src/meshes/RichTextLabel";
import type { EdgeCandidates, EdgeIdTarget } from "../../src/render/EdgeIdTarget";
import { ID_NONE, ID_OBJECT, type IdPick, type NodeIdTarget } from "../../src/render/NodeIdTarget";
import {
    edgePickWork,
    filterPointerPicks,
    hoverEdgeAt,
    hoverNodeId,
    insidePolygon,
    openRowScan,
    pickAsDrawn,
    pickCloseLabel,
    pickEdgeAt,
    pickEdgeId,
    pickNodeId,
    pickRayAsDrawn,
    pickWork,
    pickWorldPoint,
    regionWork,
    RowScan,
    rowScanOf,
    type ScannedRow,
    screenProjector,
    useEdgeIdTarget,
    useNodeIdTarget,
} from "../../src/render/PickService";

const WIDTH = 400;
const HEIGHT = 300;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;

const open: { scene: Scene; engine: NullEngine }[] = [];

afterEach(() => {
    for (const { scene, engine } of open.splice(0)) {
        scene.dispose();
        engine.dispose();
    }
});

/**
 * A 400 x 300 NullEngine scene seen from z = -20 down +z, so the canvas's center is the origin.
 * @returns The scene and its camera.
 */
function makeScene(): { scene: Scene; camera: FreeCamera } {
    const engine = new NullEngine({
        renderWidth: WIDTH,
        renderHeight: HEIGHT,
        textureSize: 16,
        deterministicLockstep: false,
        lockstepMaxSteps: 1,
    });
    const scene = new Scene(engine);
    const camera = new FreeCamera("camera", new Vector3(0, 0, -20), scene);
    camera.setTarget(Vector3.Zero());
    open.push({ scene, engine });
    return { scene, camera };
}

/**
 * A pickable box carrying a node id, as a node's own mesh does.
 * @param scene - The scene.
 * @param name - Its name and node id.
 * @param at - Where it is.
 * @returns The box.
 */
function nodeBox(scene: Scene, name: string, at: Vector3): Mesh {
    const box = MeshBuilder.CreateBox(name, { size: 2 }, scene);
    box.position.copyFrom(at);
    box.metadata = { nodeId: name };
    box.computeWorldMatrix(true);
    return box;
}

/** Rows drawn by one hidden source mesh, each answered by an anchor that carries its node id. */
interface RowGraph {
    rows: ScannedRow[];
    rowBounds: Float32Array;
    root: TransformNode;
    source: Mesh;
}

/**
 * Open a row table on a scene: the rows at the given places, drawn by a box or a sphere source.
 * @param scene - The scene.
 * @param places - Each row's center, under the graph root.
 * @param shape - The source's shape.
 * @returns The rows.
 */
function openRows(scene: Scene, places: [number, number, number][], shape: "box" | "sphere" = "box"): RowGraph {
    const source =
        shape === "box"
            ? MeshBuilder.CreateBox("source", { size: 2 }, scene)
            : MeshBuilder.CreateSphere("source", { diameter: 2 }, scene);
    source.isVisible = false;
    source.isPickable = false;
    const root = new TransformNode("graph-root", scene);
    const rowBounds = new Float32Array(places.length * 4);
    const rows = places.map(([x, y, z], index): ScannedRow => {
        rowBounds.set([x, y, z, Math.sqrt(3)], index * 4);
        const anchor = new TransformNode(`anchor${String(index)}`, scene);
        anchor.metadata = { nodeId: `row${String(index)}` };
        return {
            index,
            drawnPickMesh: null,
            drawnAnchor: anchor,
            drawnSourceMesh: source,
            drawnScaling: new Vector3(1, 1, 1),
            drawnByRowScan: true,
        };
    });
    openRowScan(
        scene,
        { rows: rows.length, rowBounds, centerOf: (row) => Vector3.FromArray(rowBounds, row * 4) },
        (row) => rows[row],
        root,
    );
    return { rows, rowBounds, root, source };
}

/** What an edge test reads of an edge. */
interface FakeEdgeFields {
    id: string;
    a: Vector3;
    b: Vector3;
    curve?: Vector3[];
    disposed?: boolean;
    hidden?: boolean;
    rows?: [number, number];
}

/**
 * An edge as the edge test reads it: its ends, its curve, whether it is drawn, and its rows.
 * @param fields - The edge.
 * @returns The edge.
 */
function fakeEdge(fields: FakeEdgeFields): Edge {
    return {
        id: fields.id,
        isDisposed: () => fields.disposed === true,
        isRenderVisible: () => fields.hidden !== true,
        drawnCurve: fields.curve ?? null,
        mesh: null,
        srcNode: { drawnWorldPosition: fields.a },
        dstNode: { drawnWorldPosition: fields.b },
        batchEndRow: (end: "source" | "target") => {
            if (fields.rows === undefined) {
                return INVALID_INDEX;
            }

            return end === "source" ? fields.rows[0] : fields.rows[1];
        },
    } as unknown as Edge;
}

/**
 * A node ID target that answers one texel, now or once read.
 * @param read - What `pick` returns.
 * @returns The target.
 */
function nodeTarget(read: IdPick | Promise<IdPick> | null): NodeIdTarget {
    return { pick: () => read } as unknown as NodeIdTarget;
}

describe("Babylon's mesh picks, before a row table opens", () => {
    it("names the node under a point and nothing off it", () => {
        const { scene } = makeScene();
        nodeBox(scene, "a", Vector3.Zero());
        const before = pickWork.meshPicks;

        assert.strictEqual(pickNodeId(scene, CX, CY), "a");
        assert.isUndefined(pickNodeId(scene, 5, 5));
        assert.isNull(pickAsDrawn(scene, 5, 5));
        assert.isAbove(pickWork.meshPicks, before, "each pick is counted as a mesh pick");
        assert.isUndefined(rowScanOf(scene));
    });

    it("lets a mesh drawn on top win over a nearer one, and skips what is hidden", () => {
        const { scene } = makeScene();
        const near = nodeBox(scene, "near", new Vector3(0, 0, -5));
        const far = nodeBox(scene, "far", new Vector3(0, 0, 5));
        assert.strictEqual(pickNodeId(scene, CX, CY), "near");

        far.renderingGroupId = ON_TOP_RENDERING_GROUP;
        assert.strictEqual(pickNodeId(scene, CX, CY), "far", "a label drawn on top covers the node in front");

        far.isVisible = false;
        assert.strictEqual(pickNodeId(scene, CX, CY), "near", "a hidden mesh is not what the reader clicked");
        near.setEnabled(false);
        assert.isUndefined(pickNodeId(scene, CX, CY));
    });

    it("still picks with two active cameras, when the sphere filter steps aside", () => {
        const { scene, camera } = makeScene();
        const other = new FreeCamera("other", new Vector3(0, 0, -20), scene);
        other.setTarget(Vector3.Zero());
        scene.activeCameras = [camera, other];
        scene.activeCamera = camera;
        scene.cameraToUseForPointers = other;
        nodeBox(scene, "a", Vector3.Zero());

        assert.strictEqual(pickNodeId(scene, CX, CY), "a");
    });

    it("widens the filter by a line mesh's threshold", () => {
        const { scene } = makeScene();
        const line = MeshBuilder.CreateLines(
            "line",
            { points: [new Vector3(-3, 0.4, 0), new Vector3(3, 0.4, 0)] },
            scene,
        );
        line.intersectionThreshold = 1;
        line.metadata = { nodeId: "line" };

        assert.strictEqual(pickNodeId(scene, CX, CY), "line");
    });

    it("answers a world ray, and a ray with no direction filters nothing", () => {
        const { scene } = makeScene();
        const box = nodeBox(scene, "a", Vector3.Zero());

        const hit = pickRayAsDrawn(scene, new Ray(new Vector3(0, 0, -20), new Vector3(0, 0, 1), 100));
        assert.strictEqual(hit.mesh, box);
        assert.closeTo(hit.point?.z ?? Number.NaN, -1, 1e-5);

        const miss = pickRayAsDrawn(scene, new Ray(new Vector3(0, 0, -20), new Vector3(0, 0, 0), 100));
        assert.isNull(miss.mesh);
        assert.isNull(miss.point);
    });

    it("finds a close-button label behind a node, and the world point under the pointer", () => {
        const { scene } = makeScene();
        nodeBox(scene, "front", new Vector3(0, 0, -5));
        const label = MeshBuilder.CreatePlane("label", { size: 2 }, scene);
        label.metadata = { labelClose: () => undefined };
        label.computeWorldMatrix(true);

        assert.strictEqual(pickCloseLabel(scene, CX, CY), label);
        assert.isNull(pickCloseLabel(scene, 5, 5));

        const point = pickWorldPoint(scene, CX, CY);
        assert.closeTo(point?.z ?? Number.NaN, -6, 1e-5, "the front of the nearer box");
        assert.isNull(pickWorldPoint(scene, 5, 5));
    });
});

describe("filterPointerPicks", () => {
    it("wraps Babylon's pointer predicates with the pointer's own ray", () => {
        const { scene } = makeScene();
        // The pointer has not moved, so it is at the canvas's top-left corner.
        const corner = scene.createPickingRay(0, 0, null, null);
        nodeBox(scene, "corner", corner.origin.add(corner.direction.scale(20)));
        nodeBox(scene, "center", Vector3.Zero());
        scene.pointerMovePredicate = (mesh: AbstractMesh) => mesh.isPickable;
        scene.pointerDownPredicate = null as unknown as typeof scene.pointerDownPredicate;

        filterPointerPicks(scene);

        assert.isNull(scene.pointerDownPredicate, "no predicate stays no predicate");
        const move = scene.pointerMovePredicate;
        assert.strictEqual(scene.pick(0, 0, move).pickedMesh?.name, "corner");
        assert.isFalse(scene.pick(CX, CY, move).hit, "a mesh off the pointer's ray is filtered out");
        const mesh = scene.meshes[0];
        // Babylon calls its predicates with a thin instance's index too, which its type leaves out.
        const withIndex = move as (picked: AbstractMesh, thinInstanceIndex: number) => boolean;
        assert.isTrue(withIndex(mesh, 0), "a thin instance is the base predicate's to judge");

        scene.pointerMovePredicate = () => false;
        assert.isFalse(scene.pick(0, 0, scene.pointerMovePredicate).hit, "a predicate set later is wrapped too");
    });
});

describe("the row scan", () => {
    it("answers a click from the rows once a graph opens its row table", () => {
        const { scene } = makeScene();
        const graph = openRows(scene, [
            [0, 0, 0],
            [0, 0, 5],
            [6, 0, 0],
        ]);
        const before = pickWork.rowScans;

        assert.strictEqual(pickNodeId(scene, CX, CY), "row0", "the nearer of two rows on the ray");
        assert.isUndefined(pickNodeId(scene, 5, 5));
        assert.isAbove(pickWork.rowScans, before);
        assert.instanceOf(rowScanOf(scene), RowScan);
        assert.strictEqual(pickAsDrawn(scene, CX, CY), graph.rows[0].drawnAnchor);
    });

    it("leaves a row's own mesh to the scan, and lets a nearer mesh or one on top win", () => {
        const { scene } = makeScene();
        const graph = openRows(scene, [[0, 0, 0]]);
        const own = nodeBox(scene, "own", Vector3.Zero());
        own.metadata = { nodeId: "own", graphNode: graph.rows[0] };
        Object.assign(graph.rows[0], { drawnPickMesh: own });
        assert.strictEqual(pickNodeId(scene, CX, CY), "row0", "the row's own mesh is the scan's");

        const behind = nodeBox(scene, "behind", new Vector3(0, 0, 4));
        assert.strictEqual(pickNodeId(scene, CX, CY), "row0", "a row nearer than a mesh wins");
        const front = nodeBox(scene, "front", new Vector3(0, 0, -5));
        assert.strictEqual(pickNodeId(scene, CX, CY), "front", "a mesh nearer than the row wins");
        front.dispose();

        behind.renderingGroupId = ON_TOP_RENDERING_GROUP;
        assert.strictEqual(pickNodeId(scene, CX, CY), "behind", "a mesh drawn on top wins");
    });

    it("answers a world ray from the rows and the meshes together", () => {
        const { scene } = makeScene();
        const graph = openRows(scene, [[0, 0, 0]]);
        const ray = new Ray(new Vector3(0, 0, -20), new Vector3(0, 0, 1), 100);

        const hit = pickRayAsDrawn(scene, ray);
        assert.strictEqual(hit.mesh, graph.rows[0].drawnAnchor);
        assert.closeTo(hit.point?.z ?? Number.NaN, -1, 1e-5);

        const box = nodeBox(scene, "front", new Vector3(0, 0, -5));
        assert.strictEqual(pickRayAsDrawn(scene, ray).mesh, box);

        const miss = pickRayAsDrawn(scene, new Ray(new Vector3(50, 0, -20), new Vector3(0, 0, 1), 100));
        assert.isNull(miss.mesh);
    });

    it("places rows under the graph root, and meets one row alone", () => {
        const { scene } = makeScene();
        const graph = openRows(scene, [
            [0, 0, 0],
            [0, 0, 5],
        ]);
        graph.root.position.set(1, 2, 0);
        const scan = rowScanOf(scene);
        assert.isDefined(scan);
        if (scan === undefined) {
            return;
        }

        const center = scan.worldCenter(1);
        assert.deepEqual([center.x, center.y, center.z], [1, 2, 5]);
        const out = scan.worldCenterToRef(1, scan.rootMatrix(), new Vector3());
        assert.deepEqual([out.x, out.y, out.z], [1, 2, 5]);

        const ray = new Ray(new Vector3(1, 2, -20), new Vector3(0, 0, 1), 100);
        assert.strictEqual(scan.rowRayHit(ray)?.row, 0);
        // An edge's end: the ray is asked about row 1 only, though row 0 is in front of it.
        assert.closeTo(scan.rowRayHitOn(1, ray)?.z ?? Number.NaN, 4, 1e-4, "a box is met from its face planes");
        assert.isNull(scan.rowRayHitOn(1, new Ray(new Vector3(40, 2, -20), new Vector3(0, 0, 1), 100)));
        const notScanned = { ...graph.rows[1], drawnByRowScan: false };
        assert.isNull(scan.rowRayHitOn(1, ray, notScanned), "a row left to Babylon is not the scan's to meet");
    });

    it("meets a row that is not a convex solid by Babylon's own triangle test", () => {
        const { scene } = makeScene();
        openRows(scene, [[0, 0, 0]], "sphere");
        const scan = rowScanOf(scene);
        const ray = new Ray(new Vector3(0, 0, -20), new Vector3(0, 0, 1), 100);

        assert.closeTo(scan?.rowRayHitOn(0, ray)?.z ?? Number.NaN, -1, 0.05);
        assert.isNull(scan?.rowRayHitOn(0, new Ray(new Vector3(40, 0, -20), new Vector3(0, 0, 1), 100)) ?? null);
    });

    it("skips rows it does not draw and rows with no shape", () => {
        const { scene } = makeScene();
        const rowBounds = new Float32Array([0, 0, 0, 2, 0, 0, 0, 0]);
        const scan = new RowScan(
            scene,
            { rows: 2, rowBounds, centerOf: (row) => Vector3.FromArray(rowBounds, row * 4) },
            () => undefined,
            null,
        );

        assert.isNull(scan.shapeRayHit(CX, CY), "a row with no shape is left to Babylon");
        assert.isTrue(scan.rootMatrix().isIdentity(), "rows with no root are in the world");
    });

    it("finds the rows whose centers lie inside a lasso", () => {
        const { scene, camera } = makeScene();
        const graph = openRows(scene, [
            [0, 0, 0],
            [3, 0, 0],
            [0, 0, -30],
            [-3, 0, 0],
        ]);
        graph.rowBounds[15] = 0; // the fourth row is hidden
        const scan = rowScanOf(scene);
        const box = [
            { x: CX - 60, y: CY - 60 },
            { x: CX + 60, y: CY - 60 },
            { x: CX + 60, y: CY + 60 },
            { x: CX - 60, y: CY + 60 },
        ];
        const before = regionWork.rows;

        assert.deepEqual(scan?.rowsInRegion(box), [0, 1], "the row behind the camera and the hidden row are left out");
        assert.strictEqual(regionWork.rows - before, 4, "one walk over the table");
        assert.deepEqual(
            scan?.rowsInRegion([
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 0, y: 10 },
            ]),
            [],
        );

        scene.activeCamera = null;
        assert.deepEqual(scan?.rowsInRegion(box), [], "with no camera nothing is on the canvas");
        assert.isDefined(camera);
    });

    it("tells inside from outside by the even-odd rule", () => {
        const square = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
        ];
        assert.isTrue(insidePolygon(square, 5, 5));
        assert.isFalse(insidePolygon(square, 15, 5));
        // A lasso around the same square twice leaves its inside out.
        assert.isFalse(insidePolygon([...square, ...square], 5, 5));
    });
});

describe("hoverNodeId", () => {
    it("picks at once with no node ID target, or one not ready", () => {
        const { scene } = makeScene();
        nodeBox(scene, "a", Vector3.Zero());
        assert.deepEqual(hoverNodeId(scene, CX, CY), { id: "a" });

        useNodeIdTarget(scene, { target: nodeTarget(null), nodeIdAt: () => "x", hiddenRows: () => false });
        assert.deepEqual(hoverNodeId(scene, CX, CY), { id: "a" }, "a target not ready yet");
    });

    it("reads a row's node from the target, with where it was drawn when the target says", async () => {
        const { scene } = makeScene();
        const nodeIdAt = (row: number): string | undefined => (row === 3 ? "row3" : undefined);
        const read = (pick: IdPick | Promise<IdPick>, hiddenRows = false): ReturnType<typeof hoverNodeId> => {
            useNodeIdTarget(scene, { target: nodeTarget(pick), nodeIdAt, hiddenRows: () => hiddenRows });
            return hoverNodeId(scene, CX, CY);
        };
        const drawn = { x: 1, y: 2, radius: 3 };

        assert.deepEqual(read({ texel: 3 }), { id: "row3" });
        assert.deepEqual(read({ texel: 3, drawn }), { id: "row3", drawn });
        assert.deepEqual(read({ texel: 7, drawn }), { id: undefined }, "a row with no node");
        assert.deepEqual(read({ texel: ID_NONE }), { id: undefined }, "a pixel of nothing");
        assert.deepEqual(await read(Promise.resolve({ texel: 3, drawn })), { id: "row3", drawn }, "once read back");

        nodeBox(scene, "mesh", Vector3.Zero());
        assert.deepEqual(read({ texel: ID_OBJECT }), { id: "mesh" }, "a mesh that is not a row");
        assert.deepEqual(read({ texel: ID_NONE }, true), { id: "mesh" }, "a row the target cannot see");

        useNodeIdTarget(scene, null);
        assert.deepEqual(hoverNodeId(scene, CX, CY), { id: "mesh" }, "the target is let go");
    });
});

describe("the edge test", () => {
    /**
     * A scene with its first frame drawn, and a projection to render pixels.
     * @returns The scene and projection.
     */
    function drawnScene(): { scene: Scene; toScreen: (point: Vector3) => { x: number; y: number } } {
        const { scene, camera } = makeScene();
        scene.render();
        return { scene, toScreen: screenProjector(scene, camera) };
    }

    const across = (id: string, y: number, extra: Partial<FakeEdgeFields> = {}): Edge =>
        fakeEdge({ id, a: new Vector3(-5, y, 0), b: new Vector3(5, y, 0), ...extra });

    it("picks nothing before the first frame", () => {
        const { scene, camera } = makeScene();
        assert.isUndefined(pickEdgeAt(scene, [across("e", 0)], CX, CY, screenProjector(scene, camera)));
    });

    it("finds the nearest drawn line within the tolerance, measured on screen", () => {
        const { scene, toScreen } = drawnScene();
        const edges = [
            across("disposed", 0, { disposed: true }),
            across("hidden", 0, { hidden: true }),
            across("far", 3),
            across("near", 0.05),
            fakeEdge({ id: "behind", a: new Vector3(-5, 0, -30), b: new Vector3(5, 0, -30) }),
        ];
        const before = edgePickWork.measured;

        assert.strictEqual(pickEdgeAt(scene, edges, CX, CY, toScreen), "near");
        assert.strictEqual(edgePickWork.measured - before, 3, "disposed and hidden edges are not measured");
        assert.isUndefined(pickEdgeAt(scene, edges, CX, 5, toScreen), "no line within the tolerance");
    });

    it("measures a curved line through its points, and a line of no length as a point", () => {
        const { scene, toScreen } = drawnScene();
        const curve = [new Vector3(-5, 4, 0), new Vector3(0, 0, 0), new Vector3(5, 4, 0)];
        const point = fakeEdge({ id: "dot", a: new Vector3(3, 3, 0), b: new Vector3(3, 3, 0) });

        assert.strictEqual(pickEdgeAt(scene, [across("straight", 4, { curve })], CX, CY, toScreen), "straight");
        const at = toScreen(new Vector3(3, 3, 0));
        assert.strictEqual(pickEdgeAt(scene, [point], at.x, at.y, toScreen), "dot");
    });

    it("reads straight edges' ends from the rows once an edge ID target is in use", async () => {
        const { scene, toScreen } = drawnScene();
        openRows(scene, [
            [-5, 0, 0],
            [5, 0, 0],
        ]);
        const fromRows = across("rows", 9, { rows: [0, 1] });
        const loose = across("loose", 3);
        const halfRow = across("half", 3, { rows: [0, INVALID_INDEX] });
        const curved = across("curved", 3, { rows: [0, 1], curve: [new Vector3(-5, 3, 0), new Vector3(5, 3, 0)] });
        const edges = [fromRows, loose, halfRow, curved];

        assert.strictEqual(
            pickEdgeId(scene, edges, CX, CY, toScreen),
            undefined,
            "with no target the ends are measured",
        );
        let near: EdgeCandidates | Promise<EdgeCandidates> | null = null;
        const target = { candidates: () => near } as unknown as EdgeIdTarget;
        useEdgeIdTarget(scene, target);
        const rowsBefore = edgePickWork.fromRows;
        const measuredBefore = edgePickWork.measured;

        assert.strictEqual(pickEdgeId(scene, edges, CX, CY, toScreen), "rows", "the rows put the edge on the origin");
        assert.strictEqual(edgePickWork.fromRows - rowsBefore, 1);
        assert.strictEqual(edgePickWork.measured - measuredBefore, 3, "the rest are measured point by point");

        assert.strictEqual(
            hoverEdgeAt(scene, () => edges, CX, CY, toScreen),
            "rows",
            "a target not ready walks all",
        );
        near = { edges: [loose], rows: [] };
        assert.isUndefined(
            hoverEdgeAt(scene, () => edges, CX, CY, toScreen),
            "only the edges near the point",
        );
        near = Promise.resolve({ edges: [fromRows], rows: [] });
        assert.strictEqual(await hoverEdgeAt(scene, () => edges, CX, CY, toScreen), "rows", "once read back");

        useEdgeIdTarget(scene, null);
        assert.strictEqual(
            hoverEdgeAt(scene, () => [across("plain", 0)], CX, CY, toScreen),
            "plain",
        );
    });
});
