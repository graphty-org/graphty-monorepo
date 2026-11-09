/**
 * @file The row scan answers what Babylon's picks answer (design/rendering/row-renderer.md 4.4,
 * stage 5): `shapeRayHit` against `pickAsDrawn`'s `scene.pick` and `rowRayHit` against
 * `pickWithRay`, at seeded points, on every shape in 2D and 3D, then one row for each kind the
 * stage-0 proof left unproven. Zero points may differ.
 */

import "../../src/graphty-element";

import { FreeCamera, Mesh, type TransformNode, Vector3 } from "@babylonjs/core";
import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import {
    type AuthoredLayoutDescriptor,
    clearRegisteredLayoutsForTesting,
    clearRegisteredTransitionsForTesting,
    registerSnapshotLayout,
    registerTransition,
    type SnapshotLayoutInput,
} from "../../extend";
import type { Graphty } from "../../index.js";
import { NodeShapes } from "../../src/config";
import { operationQueueOf } from "../../src/Graph";
import { pickNodeId, pickWork, rowScanOf } from "../../src/render/PickService";
import { transitionsOf } from "../../src/transitions/LayoutTransitionRunner";
import { drawnFrames } from "../helpers/drawn-frames";
import { click } from "../helpers/real-input";

const NODES = 24;
const POINTS = 400;
const WIDTH = 500;
const HEIGHT = 400;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A seeded generator of numbers in 0..1.
 * @param seed - The seed.
 * @returns The generator.
 */
function seeded(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * A mounted element with its row table open.
 * @param viewMode - The view mode.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    element.graph.openRowTable();
    return element;
}

/**
 * Add seeded nodes in three sizes, with the last two on one spot (an exact tie), and settle.
 * @param element - The element.
 * @param set - What every node is drawn with.
 * @param seed - The seed.
 */
async function drawn(element: Graphty, set: Record<string, unknown>, seed: number): Promise<void> {
    const random = seeded(seed);
    const flat = element.graph.scene.metadata?.twoD === true;
    const place = (): { x: number; y: number; z: number } => ({
        x: (random() - 0.5) * 14,
        y: (random() - 0.5) * 14,
        z: flat ? 0 : (random() - 0.5) * 14,
    });
    const nodes = Array.from({ length: NODES }, (_, i) => ({ id: `n${String(i)}`, position: place() }));
    const last = nodes[NODES - 1];
    const twin = nodes[NODES - 2];
    if (last !== undefined && twin !== undefined) {
        last.position = { ...twin.position };
    }

    await element.session.styles.add({ name: "look", target: "node", selector: { match: "everything" }, set });
    await element.session.styles.add({
        name: "big",
        target: "node",
        selector: { match: "ids", nodes: nodes.filter((_, i) => i % 3 === 1 && i < NODES - 2).map(({ id }) => id) },
        set: { "node.size": 2.5 },
    });
    await element.session.data.addNodes(nodes);
    await element.graph.setLayout("fixed", { dim: 3 });
    await settled(element);
}

/**
 * Wait for the queue and a stable frame.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * Seeded canvas points: half on a random vertex of a random drawn node, where a silhouette is and
 * a bound too small shows, a quarter near a node's center, and the rest anywhere.
 * @param element - The element.
 * @param seed - The seed.
 * @returns The points.
 */
function pointsOn(element: Graphty, seed: number): { x: number; y: number }[] {
    const random = seeded(seed);
    const { graph } = element;
    const nodes = [...graph.getNodes()];
    const scaling = graph.scene.getEngine().getHardwareScalingLevel();
    return Array.from({ length: POINTS }, () => {
        const node = nodes[Math.floor(random() * nodes.length)];
        const kind = random();
        if (kind < 0.25 || node === undefined) {
            return { x: random() * WIDTH, y: random() * HEIGHT };
        }

        const vertices = node.drawnSourceMesh.getVerticesData("position") ?? [];
        const vertex = Math.floor((random() * vertices.length) / 3) * 3;
        const local = new Vector3(vertices[vertex] ?? 0, vertices[vertex + 1] ?? 0, vertices[vertex + 2] ?? 0);
        const at = Vector3.TransformCoordinates(kind < 0.75 ? local : local.scale(0.5), node.drawnWorldMatrix(true));
        const screen = graph.worldToScreen(at);
        return { x: screen.x * scaling, y: screen.y * scaling };
    });
}

/**
 * The node Babylon's own pick lands on, as presses answered before the scan did.
 * @param element - The element.
 * @param x - X in CSS pixels.
 * @param y - Y in CSS pixels.
 * @returns The node's id.
 */
function babylonNodeId(element: Graphty, x: number, y: number): unknown {
    const picked = element.graph.scene.pick(x, y, (mesh) => mesh.isPickable && mesh.isVisible && mesh.isEnabled());
    return (picked.pickedMesh?.metadata as { nodeId?: unknown } | null | undefined)?.nodeId;
}

/** How many points hit a node, how many the scan itself answered, and what differed. */
interface Tally {
    hits: number;
    scanned: number;
    differ: string[];
}

/**
 * Compare both scans with Babylon's own picks at every point.
 * @param element - The element.
 * @param seed - The seed of the points.
 * @returns The tally.
 */
function compare(element: Graphty, seed: number): Tally {
    const { scene } = element.graph;
    const scan = rowScanOf(scene);
    assert.isDefined(scan, "the open table has a scan");
    const tally: Tally = { hits: 0, scanned: 0, differ: [] };
    const idOf = (mesh: TransformNode | null | undefined): unknown =>
        (mesh?.metadata as { nodeId?: unknown } | null | undefined)?.nodeId;
    for (const { x, y } of pointsOn(element, seed)) {
        const screen = scan?.pickPoint(x, y);
        const expected = babylonNodeId(element, x, y);
        tally.hits += expected === undefined ? 0 : 1;
        tally.scanned += scan?.shapeRayHit(x, y) ? 1 : 0;

        if (idOf(screen) !== expected) {
            tally.differ.push(`point ${String(x)},${String(y)}: ${String(idOf(screen))} not ${String(expected)}`);
        }

        const ray = scene.createPickingRay(x, y, null, null);
        const babylon = scene.pickWithRay(ray, (mesh) => mesh.isPickable && mesh.isEnabled());
        const world = scan?.pickRay(ray);
        if (idOf(world?.mesh) !== idOf(babylon?.pickedMesh)) {
            tally.differ.push(`ray ${String(x)},${String(y)}: ${String(idOf(world?.mesh))}`);
        }
    }

    return tally;
}

/**
 * Assert no point differed and the points hit something, so the zero means something.
 * @param tally - The tally.
 */
function assertSame(tally: Tally): void {
    assert.deepEqual(tally.differ.slice(0, 5), []);
    assert.isAbove(tally.hits, POINTS / 4, "enough points hit a node");
}

/**
 * {@link assertSame}, where the scan itself gave the answers: every node is a row it covers.
 * @param tally - The tally.
 */
function assertScanned(tally: Tally): void {
    assertSame(tally);
    assert.strictEqual(tally.scanned, tally.hits, "the scan answered every hit");
}

describe("the row scan on every shape", () => {
    for (const shape of NodeShapes.options.filter((name) => name !== "none")) {
        it(shape, async () => {
            for (const viewMode of ["3d", "2d"] as const) {
                const element = await mounted(viewMode);
                const points = shape.endsWith("polygon") ? { "node.shapePoints": "-1 -1 1 -0.6 0.2 1" } : {};
                await drawn(element, { "node.shape": shape, ...points }, 11);
                assertScanned(compare(element, 7));
                element.remove();
            }
        });
    }
});

describe("the row scan on each kind", () => {
    const LINE: AuthoredLayoutDescriptor = {
        id: "row-scan-line",
        plainName: "Line",
        technicalName: "Nodes in a line",
        description: "Puts the nodes in a line.",
        family: "geometric",
        kind: "batch",
        maxDimensions: 2,
        sizeRating: "any",
        structuralInputs: [],
        engine: "row-scan-line",
        options: [],
    };

    beforeAll(() => {
        registerSnapshotLayout({
            descriptor: LINE,
            compute: (input: SnapshotLayoutInput) => {
                const out = new Float32Array(input.dimensions * input.graph.nodeCount);
                for (let i = 0; i < input.graph.nodeCount; i++) {
                    out[input.dimensions * i] = i * 2 - 8;
                    out[input.dimensions * i + 1] = 5;
                }

                return out;
            },
        });
        registerTransition({
            descriptor: { id: "row-scan/particles", plainName: "Particles" },
            drawable: "particles",
            move: (t, from, to) => ({
                x: from.x + (to.x - from.x) * t,
                y: from.y + (to.y - from.y) * t,
                z: from.z + (to.z - from.z) * t,
            }),
        });
    });

    afterAll(() => {
        clearRegisteredLayoutsForTesting();
        clearRegisteredTransitionsForTesting();
    });

    it("keeps row order equal to scene.meshes order", async () => {
        const element = await mounted("2d");
        await drawn(element, { "node.shape": "rectangle" }, 3);
        const { graph } = element;
        const order = graph.scene.meshes
            .map((mesh) => (mesh.metadata as { graphNode?: { index: number } } | null)?.graphNode?.index)
            .filter((row) => row !== undefined);
        assert.lengthOf(order, NODES);
        assert.deepEqual(
            order,
            [...order].sort((a, b) => a - b),
        );
    });

    it("gives an exact tie to the lower row, even once a restyle has moved its mesh in scene.meshes", async () => {
        const element = await mounted("2d");
        await drawn(element, { "node.shape": "rectangle" }, 3);
        const { graph } = element;
        const lower = `n${String(NODES - 2)}`;
        const layer = { name: "away", target: "node", selector: { match: "ids", nodes: [lower] } } as const;
        const away = await element.session.styles.add({ ...layer, set: { "node.shape": "diamond" } });
        await settled(element);
        await element.session.styles.remove(away.id);
        await settled(element);
        const rows = graph.scene.meshes
            .map((mesh) => (mesh.metadata as { graphNode?: { index: number } } | null)?.graphNode?.index)
            .filter((row) => row !== undefined);
        assert.strictEqual(rows.at(-1), NODES - 2, "the rebuilt mesh went to the end of scene.meshes");
        for (const node of graph.getNodes()) {
            if (node.index < NODES - 2) {
                node.setRenderState("hidden");
            }
        }

        await settled(element);
        const screen = graph.worldToScreen(graph.getNode(lower)?.drawnWorldPosition ?? Vector3.Zero());
        const scaling = graph.scene.getEngine().getHardwareScalingLevel();
        const x = screen.x * scaling;
        const y = screen.y * scaling;
        assert.strictEqual(rowScanOf(graph.scene)?.shapeRayHit(x, y)?.row, NODES - 2);
        assert.strictEqual(babylonNodeId(element, x, y), `n${String(NODES - 1)}`, "scene.pick follows mesh order");
        assert.strictEqual(pickNodeId(graph.scene, x, y), lower, "a press follows the scan");
    });

    it("skips a hidden row and finds what is behind it", async () => {
        const element = await mounted("3d");
        await drawn(element, { "node.shape": "sphere" }, 5);
        const nodes = [...element.graph.getNodes()];
        for (const node of nodes.filter((_, i) => i % 4 === 0)) {
            node.setRenderState("hidden");
        }

        await settled(element);
        assertScanned(compare(element, 9));
    });

    it("reads non-uniform size", async () => {
        const element = await mounted("3d");
        await drawn(element, { "node.shape": "box", "node.width": 4, "node.height": 1, "node.depth": 2 }, 6);
        assertScanned(compare(element, 9));
    });

    it("reads shape.rotation", async () => {
        const element = await mounted("2d");
        await drawn(
            element,
            { "node.shape": "rectangle", "node.width": 4, "node.height": 1, "node.shapeRotation": 40 },
            6,
        );
        assertScanned(compare(element, 9));
    });

    it("leaves a model to Babylon's pick", async () => {
        const element = await mounted("3d");
        await drawn(element, { "node.model": "asset:sample/server" }, 6);
        const { scene } = element.graph;
        const node = [...element.graph.getNodes()][0];
        assert.instanceOf(node?.drawnSourceMesh, Mesh);
        assert.isFalse(node?.drawnByRowScan, "a model is picked by its box, so the scan leaves it");
        assert.isNull(rowScanOf(scene)?.shapeRayHit(WIDTH / 2, HEIGHT / 2) ?? null);
        assertSame(compare(element, 9));
    });

    it("merges mixed rows: shapes, a model, labels and borders in one scene", async () => {
        const element = await mounted("3d");
        await drawn(element, { "node.shape": "box", "node.borderWidth": 0.2 }, 8);
        await element.session.styles.add({
            name: "labelled",
            target: "node",
            selector: { match: "ids", nodes: ["n0", "n1", "n2", "n3"] },
            set: { "node.label": "a label", "node.labelStyle": { pickable: true }, "node.shape": "sphere" },
        });
        await element.session.styles.add({
            name: "model",
            target: "node",
            selector: { match: "ids", nodes: ["n4", "n5"] },
            set: { "node.model": "asset:sample/server" },
        });
        await settled(element);
        assertSame(compare(element, 9));
    });

    it("answers through every rig camera and a turned, scaled graph root", async () => {
        const element = await mounted("3d");
        await drawn(element, { "node.shape": "box" }, 8);
        const { scene } = element.graph;
        const { activeCamera } = scene;
        assert.isNotNull(activeCamera);
        if (activeCamera === null) {
            return;
        }

        const left = new FreeCamera("left", activeCamera.position.add(new Vector3(-0.3, 0, 0)), scene);
        const right = new FreeCamera("right", activeCamera.position.add(new Vector3(0.3, 0, 0)), scene);
        left.setTarget(Vector3.Zero());
        right.setTarget(Vector3.Zero());
        scene.activeCameras = [left, right];
        scene.cameraToUseForPointers = right;
        assertScanned(compare(element, 9));
        scene.activeCameras = [];
        scene.cameraToUseForPointers = null;

        const root = scene.getTransformNodeByName("graph-root");
        assert.isNotNull(root);
        root?.scaling.setAll(0.6);
        root?.rotation.set(0.2, 0.5, 0);
        root?.computeWorldMatrix(true);
        for (const mesh of scene.meshes) {
            mesh.computeWorldMatrix(true);
        }

        assertScanned(compare(element, 9));
    });

    it("sends a click during a particle transition to the destination, at whole size", async () => {
        const element = await mounted("2d");
        await drawn(element, { "node.shape": "box" }, 4);
        await element.session.config.set({ layoutTransition: { transition: "row-scan/particles", seconds: 30 } });
        await element.graph.setLayout("row-scan-line");
        const { graph } = element;
        const runner = transitionsOf(graph.getLayoutManager());
        await drawnFrames(graph.scene, 3);
        assert.isTrue(runner?.active, "the nodes are on their way");
        const target = graph.getNode("n3");
        assert.isDefined(target);
        const screen = graph.worldToScreen(new Vector3(-2, 5, 0));
        const scaling = graph.scene.getEngine().getHardwareScalingLevel();
        const point = { x: screen.x * scaling, y: screen.y * scaling };
        assert.strictEqual(element.graph.elementAt(point)?.id, "n3");
        await click(element, point);
        assert.deepEqual(element.session.selection.nodes, ["n3"]);
    });

    it("answers every press, as Babylon's pick would", async () => {
        const element = await mounted("3d");
        await drawn(element, { "node.shape": "icosphere" }, 4);
        const { scene } = element.graph;
        const before = pickWork.rowScans;
        const differ: string[] = [];
        for (const { x, y } of pointsOn(element, 21)) {
            const babylon = babylonNodeId(element, x, y);
            if (pickNodeId(scene, x, y) !== babylon) {
                differ.push(`${String(x)},${String(y)}`);
            }
        }

        assert.deepEqual(differ.slice(0, 5), []);
        assert.strictEqual(pickWork.rowScans - before, POINTS, "the scan answered each press");
    });

    it("costs a graph with no open table nothing", async () => {
        const element = document.createElement("graphty-element");
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        assert.isUndefined(rowScanOf(element.graph.scene));
    });
});
