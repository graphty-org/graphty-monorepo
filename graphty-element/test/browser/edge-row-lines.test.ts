/**
 * @file Under `renderPath: "batched"` an edge row with no `Edge` is drawn from its paint as a straight line
 * pulled from its two nodes' rows (`EdgeRowLines`), the picture the `Edge`'s own pulled line draws; a paint only
 * an `Edge` draws (a cap, a dash, a curve) is refused. The `"objects"` path has none. Stage 27 (lazy `Edge`) of
 * design/rendering/row-renderer.md.
 */

import "../../src/graphty-element";

import { INVALID_INDEX } from "@graphty/graph-format";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import type { EdgePaint } from "../../src/managers/StylePainter";
import { EdgeRowLines } from "../../src/meshes/EdgeRowLines";
import { NodeBatches } from "../../src/meshes/NodeBatch";
import { drawnFrames } from "../helpers/drawn-frames";
import { edgeBetween } from "../helpers/testSetup";
import { pixelsOverBar as overBar, readCanvas } from "../helpers/whole-canvas";

afterEach(() => {
    document.body.replaceChildren();
});

const NODES = [
    { id: 0, position: { x: -1.5, y: -1, z: 0 } },
    { id: 1, position: { x: 1.5, y: 1, z: 0 } },
    { id: 2, position: { x: 1.5, y: -1, z: 0.5 } },
];

/**
 * Mount an element with the nodes, and the edges given, uncapped.
 * @param path - The render path.
 * @param edges - The edges.
 * @returns The element.
 */
async function loaded(path: "objects" | "batched", edges: { src: number; dst: number }[]): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    // Each edge gets its `Edge`, which these tests read: a batched load would store them with none.
    dataManagerInternals.storeEdgesUnbuilt(element.graph.getDataManager(), false);
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(edges);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.session.styles.add({
        name: "uncapped",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none" },
    } as never);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * A node's row.
 * @param element - The element.
 * @param id - The node.
 * @returns Its row.
 */
function rowOf(element: Graphty, id: number): number {
    return dataManagerInternals.rowOf(element.graph.getDataManager(), id);
}

describe("an edge row with no Edge", () => {
    it("is drawn as the Edge's pulled line draws it", async () => {
        const drawn = await loaded("batched", [{ src: 0, dst: 1 }]);
        const edge = edgeBetween(drawn.graph, 0, 1);
        assert.isDefined(edge);
        assert.isTrue(edge.isPulled, "the Edge's own line is pulled");
        const paint = drawn.graph.getStylePainter().edgePaint(edge.index);
        assert.isNotNull(paint);
        const want = await readCanvas(drawn.graph);
        document.body.replaceChildren();

        const bare = await loaded("batched", []);
        const lines = bare.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        const empty = await readCanvas(bare.graph);
        assert.isAbove(overBar(want, empty), 0, "the line shows against no line");
        assert.isTrue(lines.paintRow(0, rowOf(bare, 0), rowOf(bare, 1), paint), "a plain line is drawn");
        assert.equal(lines.count, 1);
        await bare.waitForStableFrame();
        assert.equal(overBar(want, await readCanvas(bare.graph)), 0, "the same picture");

        lines.unpaintRow(0);
        assert.equal(lines.count, 0);
    });

    it("is refused for a paint only an Edge draws", async () => {
        const element = await loaded("batched", []);
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        const refused: EdgePaint["style"][] = [
            { line: { color: "#ff0000" }, arrowHead: { type: "normal" } },
            { line: { type: "dash" } },
            { line: { bezier: true } },
            { line: { width: 0 } },
            { line: { nodeGap: 1 } },
            { line: { animationSpeed: 1 } },
            { line: { color: "#ff0000" }, visible: false },
        ];
        for (const style of refused) {
            assert.isFalse(lines.paintRow(0, 0, 1, { meshKey: "refused", style }), JSON.stringify(style));
        }

        assert.equal(lines.count, 0);
    });

    it("follows a freeze that renumbers the rows, and goes with its edge row", async () => {
        const element = await loaded("batched", [
            { src: 0, dst: 2 },
            { src: 1, dst: 2 },
        ]);
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        const gone = edgeBetween(element.graph, 0, 2);
        const kept = edgeBetween(element.graph, 1, 2);
        assert.isDefined(gone);
        assert.isDefined(kept);
        const paint = { meshKey: "plain", style: { line: { color: "#ff0000" } } };
        assert.isTrue(lines.paintRow(gone.index, rowOf(element, 0), rowOf(element, 2), paint));
        assert.isTrue(lines.paintRow(kept.index, rowOf(element, 1), rowOf(element, 2), paint));
        const before = { edge: kept.index, ends: [rowOf(element, 1), rowOf(element, 2)] };

        // Node 0 and its edge go, and the freeze moves every row after them down.
        await element.session.data.removeNodes([0]);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        const after = { edge: kept.index, ends: [rowOf(element, 1), rowOf(element, 2)] };
        assert.notDeepEqual(after, before, "the freeze renumbered the rows");

        assert.equal(lines.count, 1, "the line of the edge row the freeze dropped is gone");
        assert.isTrue(lines.has(after.edge), "the kept line is on its edge's new row");
        assert.deepEqual(lines.endsOf(after.edge), after.ends, "and is pulled from its nodes' new rows");
    });

    it("goes when the data is cleared, and a new load draws again", async () => {
        const element = await loaded("batched", [{ src: 0, dst: 1 }]);
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        const paint = { meshKey: "plain", style: { line: { color: "#ff0000" } } };
        assert.isTrue(lines.paintRow(0, rowOf(element, 0), rowOf(element, 1), paint));
        assert.isTrue(lines.paintRow(1, rowOf(element, 1), rowOf(element, 2), paint));

        // The empty graph is frozen lazily, so no freeze names the dropped rows: the clear itself lets them go.
        element.graph.clearData();
        assert.equal(lines.count, 0, "no line outlives the data");
        await operationQueueOf(element.graph).waitForCompletion();

        // The batches the old lines took went with the mesh cache: a new line takes a live one.
        await element.session.data.addNodes(NODES);
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(lines.paintRow(0, rowOf(element, 0), rowOf(element, 1), paint));
        assert.equal(lines.count, 1);
        lines.unpaintRow(0);
        assert.equal(lines.count, 0);
    });

    // A million-row load spent about 0.3 s of CPU looking each row up in a map keyed by row (cosmos-gap.md G8):
    // the lines are held by row, and keep what the map kept for rows painted out of order, far apart and twice.
    it("keeps each row's line by its row, painted out of order, far apart, repainted and unpainted", async () => {
        const element = await loaded("batched", [{ src: 0, dst: 1 }]);
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        lines.clear();
        const paint = { meshKey: "plain", style: { line: { color: "#ff0000" } } };
        const [a, b, c] = [rowOf(element, 0), rowOf(element, 1), rowOf(element, 2)];
        assert.isTrue(lines.paintRow(5000, a, b, paint));
        assert.isTrue(lines.paintRow(3, b, c, paint));
        assert.isTrue(lines.paintRow(3, a, c, paint), "a repaint replaces the row's line");
        lines.unpaintRow(42);
        assert.equal(lines.count, 2, "a repaint and an unpaint of a row not drawn change no count");
        assert.isFalse(lines.has(42));
        assert.isFalse(lines.has(4999));
        assert.sameMembers(lines.rows(), [3, 5000]);
        assert.deepEqual(lines.endsOf(3), [a, c]);
        assert.deepEqual(lines.endsOf(5000), [a, b]);
        assert.isUndefined(lines.endsOf(7));

        lines.rowsMoved(null, Object.assign(new Array<number>(5001).fill(INVALID_INDEX), { 3: 0 }));
        assert.deepEqual(lines.rows(), [0], "a freeze moves the kept row and drops the other");
        assert.deepEqual(lines.endsOf(0), [a, c]);
        lines.clear();
        assert.equal(lines.count, 0);
        assert.deepEqual(lines.rows(), []);
    });

    it("has no row lines on the objects path", async () => {
        const element = await loaded("objects", [{ src: 0, dst: 1 }]);
        assert.isNull(element.graph.getEdgeRowLines());
    });
});

/**
 * Mount a batched element whose edges are stored with no `Edge` (`dataManagerInternals.storeEdgesUnbuilt`, which
 * nothing in the element turns on yet), with the nodes and the edges given.
 * @param edges - The edges.
 * @param uncapped - Whether a layer takes the arrow caps off, so that a row line draws each edge.
 * @param setup - The element's features, and what to do before the edges arrive.
 * @param setup.features - The features turned on.
 * @param setup.before - Run after the nodes and the layer, before the edges.
 * @param setup.switched - False to leave the switch alone, so the element decides.
 * @returns The element.
 */
async function lazyLoaded(
    edges: { src: number; dst: number; t?: number }[],
    uncapped = true,
    setup: { features?: string[]; before?: (element: Graphty) => Promise<void>; switched?: boolean } = {},
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.features = setup.features ?? [];
    element.renderPath = "batched";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    if (setup.switched !== false) {
        dataManagerInternals.storeEdgesUnbuilt(element.graph.getDataManager(), true);
    }

    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    if (uncapped) {
        await element.session.styles.add({
            name: "uncapped",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "none" },
        } as never);
    }

    await setup.before?.(element);
    await element.session.data.addEdges(edges);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

// The frame's paint loop draws an edge stored with no `Edge` as a row line, and builds its `Edge` only for what a
// row line does not draw.
describe("an edge stored with no Edge", () => {
    it("is drawn by the frame as a row line, building no Edge", async () => {
        const element = await lazyLoaded([
            { src: 0, dst: 1 },
            { src: 1, dst: 2 },
        ]);
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        assert.equal(dataManagerInternals.edgesBuilt(element.graph.getDataManager()), 0);
        assert.equal(lines.count, 2);
        assert.deepEqual(lines.endsOf(0), [rowOf(element, 0), rowOf(element, 1)]);
        assert.deepEqual(lines.endsOf(1), [rowOf(element, 1), rowOf(element, 2)]);
    });

    // Styles/Edge TwoDCurvatureWidth and BlendingOff read the edge map, then render one frame of the scene and read
    // it: the Edges that read builds drew their placeholder look until the frame loop painted them.
    it("draws the same picture once reading the edges builds its Edge, before the next frame", async () => {
        const element = await lazyLoaded(
            [
                { src: 0, dst: 1 },
                { src: 1, dst: 2 },
            ],
            true,
            {
                before: async (shown) => {
                    await shown.session.styles.add({
                        name: "red and wide",
                        target: "edge",
                        selector: { match: "everything" },
                        set: { "edge.color": "#e6194b", "edge.width": 8 },
                    } as never);
                },
            },
        );
        const dm = element.graph.getDataManager();
        assert.equal(element.graph.getEdgeRowLines()?.count, 2, "drawn as row lines");
        const want = await readCanvas(element.graph);

        assert.equal([...dm.edges.values()].length, 2);
        assert.equal(dataManagerInternals.edgesBuilt(dm), 2, "reading the edges built them");
        const scene = element.graph.getScene();
        const { engine } = element.graph;
        engine.beginFrame();
        scene.render();
        const read = engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight());
        engine.endFrame();
        assert.equal(overBar(want, { pixels: (await read) as Uint8Array }), 0, "the same picture");
    });

    it("builds its Edge for a paint only an Edge draws", async () => {
        const element = await lazyLoaded([{ src: 0, dst: 1 }], false);
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        assert.equal(lines.count, 0);
        assert.equal(dataManagerInternals.edgesBuilt(element.graph.getDataManager()), 1);
        assert.isDefined(edgeBetween(element.graph, 0, 1));
    });

    it("builds the Edge of a self-loop", async () => {
        const element = await lazyLoaded([
            { src: 0, dst: 0 },
            { src: 0, dst: 1 },
        ]);
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        assert.equal(dataManagerInternals.edgesBuilt(element.graph.getDataManager()), 1);
        assert.equal(lines.count, 1);
        assert.isTrue(lines.has(1));
    });

    it("goes when its edge is removed, before any freeze", async () => {
        const element = await lazyLoaded([
            { src: 0, dst: 1 },
            { src: 1, dst: 2 },
        ]);
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        element.graph.getDataManager().removeEdge("0");
        assert.equal(lines.count, 1);
        assert.isFalse(lines.has(0));
        assert.equal(dataManagerInternals.edgesBuilt(element.graph.getDataManager()), 0);
    });
});

/**
 * Wait for what the session says to reach the picture.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

// A row line has no mask of its own: a row the filter hides or the selection holds is drawn by its `Edge`, built for
// it, and so is every row once lines fade by age.
describe("a masked edge stored with no Edge", () => {
    const TWO = [
        { src: 0, dst: 1 },
        { src: 1, dst: 2 },
    ];
    // The degree filter keeps node 1 alone, so it hides both edges.
    const hideAll = async (element: Graphty): Promise<void> => {
        await element.graph.getSession().visibility.set({ kind: "degree", min: 2 });
        await settled(element);
    };

    it("builds the Edge of a row the filter hides, drawn hidden", async () => {
        const element = await lazyLoaded(TWO);
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        assert.equal(lines.count, 2);
        await hideAll(element);
        assert.isFalse(element.graph.getSession().visibility.isVisible("0"), "the filter hides the edge");
        assert.equal(lines.count, 0, "no row line draws a hidden row");
        assert.equal(dataManagerInternals.edgesBuilt(element.graph.getDataManager()), 2);
        const edge = edgeBetween(element.graph, 0, 1);
        assert.isDefined(edge);
        assert.isFalse(edge.isRenderVisible(), "its Edge is hidden");
    });

    it("builds the Edge of a row stored while the filter hides it, drawn hidden", async () => {
        const element = await lazyLoaded(TWO, true, { before: hideAll });
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        assert.equal(lines.count, 0, "no row line draws a hidden row");
        const edge = edgeBetween(element.graph, 1, 2);
        assert.isDefined(edge);
        assert.isFalse(edge.isRenderVisible(), "its Edge is hidden");
    });

    it("builds the Edge of a selected row, drawn selected", async () => {
        const element = await lazyLoaded(TWO);
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        await element.session.selection.apply({ edges: ["0"] });
        await settled(element);
        assert.isFalse(lines.has(0), "no row line draws a selected row");
        assert.isTrue(lines.has(1), "the other row keeps its line");
        assert.equal(dataManagerInternals.edgesBuilt(element.graph.getDataManager()), 1);
        assert.isTrue(edgeBetween(element.graph, 0, 1)?.isSelected(), "its Edge is selected");
    });

    it("builds every row's Edge when lines start to fade by age", async () => {
        const element = await lazyLoaded(
            [
                { src: 0, dst: 1, t: 0 },
                { src: 1, dst: 2, t: 1 },
            ],
            true,
            { features: ["timeline"] },
        );
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        assert.equal(lines.count, 2);
        const { time } = element.session;
        await time.setField({ edges: { start: "t", unit: "ordinal" } });
        await time.ready;
        await time.window({ from: 0, to: 2, step: 1 });
        await time.setSettings({ ageFade: 0.2 });
        await settled(element);
        assert.equal(lines.count, 0, "a row line carries no age");
        assert.equal(dataManagerInternals.edgesBuilt(element.graph.getDataManager()), 2);
    });
});

// A force engine is handed an edge stored with no `Edge` as an edge row (`addEdgeRows`), so the edge pulls its nodes
// with no `Edge` built, to the picture its `Edge` draws: when the engine is set over stored edges, and when an edge
// arrives under it.
describe("an edge stored with no Edge under a force layout", () => {
    /**
     * How far apart nodes 0 and 1 settle under a layout.
     * @param layout - The force layout.
     * @param lazy - Whether the edges are stored with no `Edge`.
     * @param later - Whether edge 0-1 is added after the layout is set, not before.
     * @returns The distance, and how many `Edge`s were built.
     */
    async function settled(
        layout: "d3" | "ngraph",
        lazy: boolean,
        later: boolean,
    ): Promise<{ distance: number; built: number }> {
        const first = { src: 0, dst: 1 };
        const element = await lazyLoaded(later ? [{ src: 1, dst: 2 }] : [first, { src: 1, dst: 2 }], true, {
            before: async (el) => {
                dataManagerInternals.storeEdgesUnbuilt(el.graph.getDataManager(), lazy);
                await Promise.resolve();
            },
        });
        element.autoFrame = false;
        await element.graph.setLayout(layout, layout === "ngraph" ? { dim: 3, seed: 7 } : { dim: 3 });
        if (later) {
            await element.session.data.addEdges([first]);
            await operationQueueOf(element.graph).waitForCompletion();
        }

        await element.waitForStableFrame();
        const built = dataManagerInternals.edgesBuilt(element.graph.getDataManager());
        const p = element.graph.getNode(0)?.drawnPosition;
        const q = element.graph.getNode(1)?.drawnPosition;
        assert.isDefined(p);
        assert.isDefined(q);
        const distance = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
        element.remove();
        return { distance, built };
    }

    for (const layout of ["d3", "ngraph"] as const) {
        for (const later of [false, true]) {
            const when = later ? "arriving under" : "stored before";
            it(`pulls its nodes ${when} ${layout} as its Edge does, building no Edge`, async () => {
                const lazy = await settled(layout, true, later);
                const built = await settled(layout, false, later);
                assert.equal(lazy.built, 0);
                assert.equal(built.built, 2);
                assert.closeTo(lazy.distance, built.distance, 1e-3 * built.distance);
            });
        }
    }
});

// A load on the batched path stores its edges with no `Edge` unless something turns it off; the objects path builds
// every `Edge` as before.
describe("an edge loaded with no switch", () => {
    it("is stored with no Edge on the batched path, and drawn as a row line", async () => {
        const element = await lazyLoaded(
            [
                { src: 0, dst: 1 },
                { src: 1, dst: 2 },
            ],
            true,
            { switched: false },
        );
        const lines = element.graph.getEdgeRowLines();
        assert.isNotNull(lines);
        assert.equal(dataManagerInternals.edgesBuilt(element.graph.getDataManager()), 0);
        assert.equal(lines.count, 2);
        assert.equal(element.graph.getDataManager().edges.size, 2);
    });

    // A million-edge load spent 2.1 s adding one `e:<id>` string per edge to the keys that hold the frame
    // (cosmos-gap.md G8): an edge stored with no `Edge` holds it by its counter instead.
    it("holds the frame for its paint with no key per edge", async () => {
        const element = await lazyLoaded([], true, { switched: false });
        const dm = element.graph.getDataManager();
        const seen: { keys: string[]; held: boolean }[] = [];
        const notePainted = dm.notePainted.bind(dm);
        vi.spyOn(dm, "notePainted").mockImplementation((dirty) => {
            const keys = dataManagerInternals.unpaintedKeys(dm).filter((key) => key.startsWith("e"));
            seen.push({ keys, held: dm.drawHeld });
            notePainted(dirty);
        });
        await element.session.data.addEdges([
            { src: 0, dst: 1 },
            { src: 1, dst: 2 },
        ]);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.isAbove(seen.length, 0);
        assert.deepEqual(seen[0], { keys: [], held: true });
        assert.isFalse(dm.drawHeld);
        assert.equal(dataManagerInternals.edgesBuilt(dm), 0);
        assert.equal(element.graph.getEdgeRowLines()?.count, 2);
    });

    // A million-edge load decided one shared style a million times, by a pass over its keys and a color parse per
    // edge (cosmos-gap.md G8): rows painted with the same style decide it once.
    it("decides a style its rows share once", async () => {
        const element = await lazyLoaded([], true, { switched: false });
        const decided = vi.spyOn(EdgeRowLines.prototype as unknown as { drawsStyle: () => boolean }, "drawsStyle");
        await element.session.data.addEdges([
            { src: 0, dst: 1 },
            { src: 1, dst: 2 },
            { src: 0, dst: 2 },
        ]);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.equal(dataManagerInternals.edgesBuilt(element.graph.getDataManager()), 0);
        assert.equal(element.graph.getEdgeRowLines()?.count, 3);
        assert.equal(decided.mock.calls.length, 1);
    });

    it("is found between its nodes, building its Edge", async () => {
        const element = await lazyLoaded([{ src: 0, dst: 1 }], true, { switched: false });
        const dm = element.graph.getDataManager();
        assert.equal(dataManagerInternals.edgesBuilt(dm), 0);
        const edge = edgeBetween(element.graph, 0, 1);
        assert.isDefined(edge);
        assert.equal(dataManagerInternals.edgesBuilt(dm), 1);
        assert.equal(element.graph.getEdgeRowLines()?.count, 0);
    });

    // A repaint makes the next frame visit every edge once. It used to leave the edge count and the node positions
    // unrecorded, so the two frames after it walked every edge again, and a stable frame could end between them: a
    // drag counted after it paid for a walk of every edge (drag-walks-incident-edges on fixed, forced-batched).
    it("visits every built Edge once for a repaint", async () => {
        const element = await lazyLoaded(
            [
                { src: 0, dst: 1 },
                { src: 1, dst: 2 },
                { src: 2, dst: 3 },
            ],
            false,
        );
        const built = dataManagerInternals.edgesBuilt(element.graph.getDataManager());
        assert.equal(built, 3);
        await drawnFrames(element.graph.scene, 3);
        const update = vi.spyOn(Edge.prototype, "update");
        try {
            await element.session.styles.add({
                name: "wide",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.width": 3 },
            } as never);
            await element.waitForStableFrame();
            await drawnFrames(element.graph.scene, 3);

            assert.equal(update.mock.calls.length, built);
        } finally {
            update.mockRestore();
        }
    });

    // Graphviz keys its routes by `Edge` and builds its graph from the `Edge`s it holds: an edge stored with none
    // would be routed and laid out as absent.
    it("builds every Edge under a layout that reads Edges (fixed, routed by Graphviz)", async () => {
        const element = await lazyLoaded(
            [
                { src: 0, dst: 1 },
                { src: 1, dst: 2 },
            ],
            true,
            {
                switched: false,
                before: async (el) => {
                    await el.graph.setLayout("fixed", { dim: 2, edgeRoutes: "graphviz" });
                },
            },
        );
        assert.equal(dataManagerInternals.edgesBuilt(element.graph.getDataManager()), 2);
    });

    // The objects path has no row lines, so a switch to it builds every edge's `Edge` before they go: none goes
    // undrawn (the rollback rule of design/rendering/row-renderer.md).
    it("gets its Edge, and stays drawn, when the path switches to objects", async () => {
        const edges = [
            { src: 0, dst: 1 },
            { src: 1, dst: 2 },
        ];
        const element = await lazyLoaded(edges, true, { switched: false });
        const dm = element.graph.getDataManager();
        assert.equal(dataManagerInternals.edgesBuilt(dm), 0);
        element.graph.setRenderPath("objects");
        await element.waitForStableFrame();
        assert.equal(dataManagerInternals.edgesBuilt(dm), 2, "every edge has its Edge");
        assert.isNull(element.graph.getEdgeRowLines());
        const got = await readCanvas(element.graph);
        document.body.replaceChildren();

        const want = await loaded("objects", edges);
        assert.equal(overBar(await readCanvas(want.graph), got), 0, "drawn as an objects load draws it");
    });

    it("builds every Edge on the objects path", async () => {
        const element = await loaded("objects", [
            { src: 0, dst: 1 },
            { src: 1, dst: 2 },
        ]);
        assert.isNull(element.graph.getEdgeRowLines());
        assert.equal(dataManagerInternals.edgesBuilt(element.graph.getDataManager()), 2);
    });
});

// A straight pulled line follows its nodes' rows in its shader, so neither the load's placement walk nor a moving
// layout's frames have anything to place for it: the walk (`UpdateManager.updateEdges` -> `Edge.update` ->
// `pullRows`) is 1M visits a frame at 100k + 1M. Stage 27 of design/rendering/row-renderer.md.
describe("a pulled edge under a moving layout", () => {
    for (const [lazy, dim] of [
        [true, 3],
        [false, 3],
        [true, 2],
        [false, 2],
    ] as const) {
        const stored = lazy ? "stored with no Edge" : "with its Edge";
        it(`is visited by no placement walk, ${stored}, in ${dim}D`, async () => {
            const update = vi.spyOn(Edge.prototype, "update");
            try {
                const element = await lazyLoaded(
                    [
                        { src: 0, dst: 1 },
                        { src: 1, dst: 2 },
                        { src: 2, dst: 0 },
                    ],
                    true,
                    {
                        before: async (el) => {
                            dataManagerInternals.storeEdgesUnbuilt(el.graph.getDataManager(), lazy);
                            if (dim === 2) {
                                await el.setViewMode("2d");
                            }

                            await el.graph.setLayout("ngraph", { dim, seed: 7 });
                        },
                    },
                );
                const dm = element.graph.getDataManager();
                assert.equal(dataManagerInternals.edgesBuilt(dm), lazy ? 0 : 3);
                if (!lazy) {
                    for (const edge of dm.edges.values()) {
                        assert.isTrue(edge.followsRows, "every Edge is a straight pulled line");
                    }
                }

                await drawnFrames(element.graph.scene, 3);
                const pulledVisits = (update.mock.contexts as Edge[]).filter((edge) => edge.isPulled).length;
                assert.equal(pulledVisits, 0);
            } finally {
                update.mockRestore();
            }
        });
    }
});

// A simulation engine (forceatlas2, and every layout the accelerator runs) holds no edges of its own: it read the
// store's edges each frame, which built an `Edge` for every edge stored with none. At 100,000 nodes and 300,000
// edges on WebGPU that ran the tab out of memory the moment the layout started.
describe("an edge stored with no Edge under a simulation layout", () => {
    it("gets no Edge from the frames that move it", async () => {
        const element = await lazyLoaded(
            [
                { src: 0, dst: 1 },
                { src: 1, dst: 2 },
                { src: 2, dst: 0 },
            ],
            true,
            { switched: false },
        );
        const dm = element.graph.getDataManager();
        assert.equal(dataManagerInternals.edgesBuilt(dm), 0);
        await element.graph.setLayout("forceatlas2", { seed: 1 });
        await operationQueueOf(element.graph).waitForCompletion();
        await drawnFrames(element.graph.scene, 5);
        assert.equal(dataManagerInternals.edgesBuilt(dm), 0);
        assert.equal(element.graph.getEdgeRowLines()?.count, 3);
    });
});

/**
 * Mount a batched element the way the comparison harness's lean mode does (benchmarks/compare/main.js): the view
 * set before it is attached, a fixed layout, box nodes and capless edges, then the data set as `nodeData` and
 * `edgeData`.
 * @param dim - The view: 2 or 3.
 * @param edgesFirst - Set `edgeData` before `nodeData`, so the edges wait for their ends.
 * @param nodeStyle - More of the nodes' style, on every node.
 * @returns The element.
 */
async function leanLoaded(dim: 2 | 3, edgesFirst: boolean, nodeStyle: Record<string, unknown> = {}): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = "batched";
    element.layout = "fixed";
    element.viewMode = dim === 2 ? "2d" : "3d";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "lean nodes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shape": "box", ...nodeStyle },
    } as never);
    await element.session.styles.add({
        name: "lean edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none" },
    } as never);
    if (edgesFirst) {
        element.edgeData = LEAN_EDGES;
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        element.nodeData = NODES;
    } else {
        element.nodeData = NODES;
        element.edgeData = LEAN_EDGES;
    }

    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

const LEAN_EDGES = [
    { src: 0, dst: 1 },
    { src: 1, dst: 2 },
    { src: 2, dst: 0 },
];

// The comparison harness's lean load builds no `Edge`, in 2D as in 3D: since G3 a straight 2D line is pulled from
// its nodes' rows, so a row line draws it. That holds for edges that wait for their ends too. Undo takes the rows
// back with no `Edge`; redo brings them back and selects them (undo and redo select what changed), and a selected
// row is drawn by its `Edge`, since a row line has no selected look. G7 of design/rendering/cosmos-gap.md.
describe("a lean load on the batched path", () => {
    for (const dim of [2, 3] as const) {
        for (const edgesFirst of [false, true]) {
            const order = edgesFirst ? "its edges before its nodes" : "its nodes first";
            it(`builds no Edge in ${dim}D, ${order}`, async () => {
                const element = await leanLoaded(dim, edgesFirst);
                const dm = element.graph.getDataManager();
                const lines = element.graph.getEdgeRowLines();
                assert.isNotNull(lines);
                assert.equal(element.graph.getViewMode(), dim === 2 ? "2d" : "3d");
                assert.equal(dm.edges.size, LEAN_EDGES.length);
                assert.equal(dataManagerInternals.edgesBuilt(dm), 0);
                assert.equal(lines.count, LEAN_EDGES.length);
            });
        }

        // A row line cannot end at a node drawn behind edges, so the paint loop asks of each end; with no row
        // painted behind edges it asked each end's look anyway, a map read per end of 1M edges at 100k + 1M.
        it(`reads no row's look for its lines in ${dim}D when no row is drawn behind edges`, async () => {
            const lookOf = vi.spyOn(NodeBatches.prototype, "lookOf");
            try {
                const element = await leanLoaded(dim, false);
                assert.equal(element.graph.getEdgeRowLines()?.count, LEAN_EDGES.length);
                assert.equal(lookOf.mock.calls.length, 0);
            } finally {
                lookOf.mockRestore();
            }
        });

        it(`builds an Edge across undo and redo of the load in ${dim}D only for what redo selects`, async () => {
            const element = await leanLoaded(dim, false);
            const dm = element.graph.getDataManager();
            const lines = element.graph.getEdgeRowLines();
            assert.isNotNull(lines);

            await element.session.undo();
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            assert.equal(dm.edges.size, 0, "undo takes the load back");
            assert.equal(lines.count, 0);
            assert.equal(dataManagerInternals.edgesBuilt(dm), 0);

            await element.session.redo();
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            assert.equal(dm.edges.size, LEAN_EDGES.length, "redo brings it back");
            const selected = element.session.selection.edges.length;
            assert.equal(dataManagerInternals.edgesBuilt(dm), selected, "an Edge for each selected row, no more");
            assert.equal(lines.count + selected, LEAN_EDGES.length, "every other row a row line");

            element.session.selection.clear();
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            assert.equal(dataManagerInternals.edgesBuilt(dm), selected, "no further Edge once the selection clears");
        });
    }
});

// A 2D row below z-index 0 is drawn behind edges (`Node.isDrawnBehindEdges`), and an edge ends at its outline, which a
// row line does not draw: the edge gets its Edge, as on the objects path.
describe("a lean load in 2D with its rows drawn behind edges", () => {
    it("builds the Edge of every edge, and no row line", async () => {
        const element = await leanLoaded(2, false, { "node.zIndex": -1 });
        const dm = element.graph.getDataManager();
        assert.equal(element.graph.rowCounts.batchedNodes, NODES.length);
        assert.equal(dataManagerInternals.edgesBuilt(dm), LEAN_EDGES.length);
        assert.equal(element.graph.getEdgeRowLines()?.count, 0);
    });
});
