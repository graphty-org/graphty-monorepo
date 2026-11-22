/**
 * @file Under `renderPath: "batched"`, an edge with an arrowhead or a dashed or dotted line is still a row line
 * (`EdgeRowLines`): its line is pulled from its nodes' rows, draws its pattern in its shader and stops at the head's
 * back, and its head is drawn from the row table too (`ArrowCapBatch.setPulled`), so neither a directed graph's default look nor
 * an arrowhead or dash restyle builds an `Edge` or leaves an object edge. The picture is the `"objects"` path's, pixel
 * for pixel, in 3D and in 2D. Words on a cap that draw nothing do not need an `Edge` either.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { type CanvasFrame, pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);
const VIEWS = ["3d", "2d"] as const;
type View = (typeof VIEWS)[number];

afterEach(() => {
    document.body.replaceChildren();
});

const N = 24;
const NODES = Array.from({ length: N }, (_, id) => ({
    id,
    position: { x: (id % 6) * 1.3 - 3.2, y: Math.floor(id / 6) * 1.3 - 2, z: (id % 3) * 0.7 - 0.7 },
}));
/** A ring and a chord from every fourth node. */
const EDGES = [
    ...NODES.map(({ id }) => ({ src: id, dst: (id + 1) % N })),
    ...NODES.filter(({ id }) => id % 4 === 0).map(({ id }) => ({ src: id, dst: (id + 7) % N })),
];

const everything = { match: "everything" } as const;

/**
 * Mount an element with the graph loaded on fixed positions, in 3D or in 2D.
 * @param path - The render path.
 * @param renderer - The engine.
 * @param set - What a layer on every edge sets before the edges arrive; none leaves the directed default look.
 * @param view - The view.
 * @returns The element, its picture final.
 */
async function loaded(
    path: RenderPath,
    renderer: "webgl" | "webgpu" = "webgl",
    set?: Record<string, unknown>,
    view: View = "3d",
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.renderPath = path;
    element.viewMode = view;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: view === "2d" ? 2 : 3 });
    if (set !== undefined) {
        await element.session.styles.add({ name: "case", target: "edge", selector: everything, set } as never);
    }

    await element.session.data.addEdges(EDGES);
    await settled(element);
    return element;
}

/**
 * Wait for queued work and a stable frame.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * How many edges are drawn as row lines, and how many `Edge` objects were built.
 * @param element - The element.
 * @returns The counts.
 */
function drawn(element: Graphty): { rowLines: number; built: number; objectEdges: number } {
    return {
        rowLines: element.graph.getEdgeRowLines()?.count ?? 0,
        built: dataManagerInternals.edgesBuilt(element.graph.getDataManager()),
        objectEdges: element.graph.rowCounts.objectEdges,
    };
}

const ALL_ROW_LINES = { rowLines: EDGES.length, built: 0, objectEdges: 0 };

describe.each(VIEWS)("an arrowed edge on the batched path in %s", (view) => {
    it("is a row line in a directed graph's default look, building no Edge", async () => {
        const element = await loaded("batched", "webgl", undefined, view);
        assert.deepEqual(drawn(element), ALL_ROW_LINES);
    });

    it("stays a row line when a restyle gives every edge an arrowhead", async () => {
        const element = await loaded("batched", "webgl", { "edge.arrowHead": "none" }, view);
        assert.deepEqual(drawn(element), ALL_ROW_LINES, "plain");
        await element.session.styles.add({
            name: "arrowed",
            target: "edge",
            selector: everything,
            set: { "edge.arrowHead": "normal", "edge.arrowHeadColor": "#e6194b" },
        } as never);
        await settled(element);
        assert.deepEqual(drawn(element), ALL_ROW_LINES, "arrowed");
    });

    it("stays a row line when a restyle dashes every line", async () => {
        const element = await loaded("batched", "webgl", undefined, view);
        await element.session.styles.add({
            name: "dashed",
            target: "edge",
            selector: everything,
            set: { "edge.style": "dash" },
        } as never);
        await settled(element);
        assert.deepEqual(drawn(element), ALL_ROW_LINES);
    });

    it("stays a row line with words on its head that draw nothing", async () => {
        const element = await loaded("batched", "webgl", { "edge.arrowHeadTextSize": 14 }, view);
        assert.deepEqual(drawn(element), ALL_ROW_LINES);
    });

    it("draws the objects path's picture once its arrowhead comes off, and once it comes back", async () => {
        const objects = await loaded("objects", "webgl", { "edge.arrowHead": "none" }, view);
        const plain = await readCanvas(objects.graph);
        objects.remove();
        const element = await loaded("batched", "webgl", undefined, view);
        const arrowed = await readCanvas(element.graph);
        const { id } = (await element.session.styles.add({
            name: "plain",
            target: "edge",
            selector: everything,
            set: { "edge.arrowHead": "none" },
        } as never)) as { id: string };
        await settled(element);
        assert.deepEqual(drawn(element), ALL_ROW_LINES);
        assert.equal(pixelsOverBar(plain, await readCanvas(element.graph)), 0, "no head left behind");
        await element.session.styles.remove(id);
        await settled(element);
        assert.equal(pixelsOverBar(arrowed, await readCanvas(element.graph)), 0, "the heads back");
    });

    it("draws a selected arrowed edge as the objects path draws it", async () => {
        const select = async (element: Graphty): Promise<CanvasFrame> => {
            const edge = [...element.graph.getDataManager().edges.values()].find(
                (candidate) => candidate.srcId === 4 && candidate.dstId === 11,
            );
            assert.isDefined(edge);
            await element.graph.select({ nodes: [], edges: [edge.id] });
            await settled(element);
            return readCanvas(element.graph);
        };
        const objects = await loaded("objects", "webgl", undefined, view);
        const want = await select(objects);
        objects.remove();
        const batched = await loaded("batched", "webgl", undefined, view);
        const have = await select(batched);
        assert.equal(pixelsOverBar(want, have), 0);
    });

    it("draws the same picture once reading the edges builds their Edges, before the next frame", async () => {
        const element = await loaded("batched", "webgl", undefined, view);
        const want = await readCanvas(element.graph);
        const dm = element.graph.getDataManager();
        assert.equal([...dm.edges.values()].length, EDGES.length);
        assert.equal(dataManagerInternals.edgesBuilt(dm), EDGES.length, "reading the edges built them");
        assert.equal(element.graph.rowCounts.objectEdges, 0, "each Edge pulls its line and its head");
        const { engine } = element.graph;
        engine.beginFrame();
        element.graph.scene.render();
        const read = engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight());
        engine.endFrame();
        assert.equal(pixelsOverBar(want, { pixels: (await read) as Uint8Array }), 0);
    });
});

// Words on a cap that draw nothing, or a cap of size 0, draw nothing an `Edge` is needed for.
describe("an edge with no drawn head on the batched path", () => {
    for (const [name, set] of [
        ["words switched off", { "edge.arrowHead": "none", "edge.arrowHeadTextSize": 14 }],
        ["a head of size 0", { "edge.arrowHeadSize": 0 }],
    ] as const) {
        it(`is a row line with ${name}, heads off the row table`, async () => {
            const element = await loaded("batched", "webgl", set);
            assert.deepEqual(drawn(element), ALL_ROW_LINES);
        });
    }
});

describe.each(RENDERERS.flatMap((renderer) => VIEWS.map((view) => [renderer, view] as const)))(
    "an arrowed row line's picture on %s in %s",
    (renderer, view) => {
        for (const [name, set] of [
            ["the default look", undefined],
            [
                "wide lines and large open heads",
                { "edge.width": 40, "edge.arrowHead": "open-normal", "edge.arrowHeadSize": 2 },
            ],
            ["vee heads, translucent", { "edge.arrowHead": "vee", "edge.arrowHeadOpacity": 0.5 }],
            ["dot heads", { "edge.arrowHead": "dot" }],
            ["dashed lines", { "edge.style": "dash" }],
            ["dotted lines with no heads", { "edge.style": "dot", "edge.arrowHead": "none" }],
            ["star lines, wide", { "edge.style": "star", "edge.width": 3 }],
        ] as const) {
            it(`is the objects path's, ${name}`, async () => {
                const objects = await loaded("objects", renderer, set, view);
                const want = await readCanvas(objects.graph);
                objects.remove();
                const batched = await loaded("batched", renderer, set, view);
                // the objects path's 2D cap takes its opacity twice (`pulledHeadOf`), so a translucent 2D head is still
                // an object edge's
                const translucent2d = view === "2d" && set !== undefined && "edge.arrowHeadOpacity" in set;
                assert.deepEqual(
                    drawn(batched),
                    translucent2d ? { rowLines: 0, built: EDGES.length, objectEdges: EDGES.length } : ALL_ROW_LINES,
                );
                assert.equal(pixelsOverBar(want, await readCanvas(batched.graph)), 0);
            });
        }
    },
);

// A route the layout lays itself (Graphviz's splines) is followed by an `Edge`'s placed line: a line pulled from the row
// table would run straight between its nodes.
describe("an edge Graphviz routes on the batched path", () => {
    /**
     * Mount a 2D element laid out by Graphviz's dot, its edges in the directed default look.
     * @param path - The render path.
     * @returns The element, its picture final.
     */
    async function dotLaid(path: RenderPath): Promise<Graphty> {
        const element = document.createElement("graphty-element");
        element.renderPath = path;
        element.viewMode = "2d";
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        document.body.appendChild(element);
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.graph.setLayout("graphviz-dot");
        await element.session.data.addNodes(NODES.map(({ id }) => ({ id })));
        await element.session.data.addEdges(EDGES);
        await settled(element);
        return element;
    }

    it("is drawn as the objects path draws it, along its route", async () => {
        const objects = await dotLaid("objects");
        const want = await readCanvas(objects.graph);
        objects.remove();
        const batched = await dotLaid("batched");
        assert.equal(batched.graph.rowCounts.pulledEdges, 0, "no routed line is pulled");
        assert.equal(pixelsOverBar(want, await readCanvas(batched.graph)), 0);
    });
});

// A 2D graph's object edges draw their caps in one batch a color, each color's after those made before it: where two
// heads meet, the color painted later is on top whatever the order of their edges.
describe.each(RENDERERS)("two 2D heads of different colors meeting on %s", (renderer) => {
    /**
     * Two wide-headed edges into one node, both gray, then the first one orange.
     * @param path - The render path.
     * @returns The element, its picture final.
     */
    async function meeting(path: RenderPath): Promise<Graphty> {
        const element = document.createElement("graphty-element");
        element.renderer = renderer;
        element.renderPath = path;
        element.viewMode = "2d";
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        document.body.appendChild(element);
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.session.data.addNodes([
            { id: "a", position: { x: -0.6, y: 3, z: 0 } },
            { id: "b", position: { x: 0.6, y: 3, z: 0 } },
            { id: "t", position: { x: 0, y: 0, z: 0 } },
        ]);
        await element.graph.setLayout("fixed", { dim: 2 });
        await element.session.styles.add({
            name: "gray",
            target: "edge",
            selector: everything,
            set: { "edge.color": "#cccccc", "edge.arrowHeadSize": 4 },
        } as never);
        await element.session.data.addEdges([
            { src: "a", dst: "t" },
            { src: "b", dst: "t" },
        ]);
        await settled(element);
        const first = [...element.graph.getDataManager().edges.values()].find((edge) => edge.srcId === "a");
        assert.isDefined(first);
        await element.session.styles.add({
            name: "orange",
            target: "edge",
            selector: { match: "ids", edges: [first.id] },
            set: { "edge.color": "#d55e00", "edge.width": 3 },
        } as never);
        await settled(element);
        return element;
    }

    it("draws the later color on top, as the objects path does", async () => {
        const objects = await meeting("objects");
        const want = await readCanvas(objects.graph);
        objects.remove();
        const batched = await meeting("batched");
        assert.equal(batched.graph.rowCounts.objectEdges, 0);
        assert.equal(pixelsOverBar(want, await readCanvas(batched.graph)), 0);
    });
});

// A batch that drew pulled heads placed its pieces' ends on the CPU at every rest, in a table of 32 bytes a piece, and
// kept both after every head was gone: about 40 MB at a million edges drawn with none.
describe("a batched row line batch whose arrowheads all come off", () => {
    it("places no ends at rest and gives its placed-ends table back", async () => {
        const count = 1500;
        const element = document.createElement("graphty-element");
        element.renderPath = "batched";
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        document.body.appendChild(element);
        await element.updateComplete;
        await element.session.data.addNodes(
            Array.from({ length: count }, (_, id) => ({ id, position: { x: id % 40, y: Math.floor(id / 40), z: 0 } })),
        );
        await element.graph.setLayout("fixed", { dim: 3 });
        await element.session.data.addEdges(
            Array.from({ length: count }, (_, id) => ({ src: id, dst: (id + 1) % count })),
        );
        await settled(element);
        type Placing = { ends: Float32Array; placeEnds: () => void };
        const batches = (): Placing[] => (element.graph.getEdgeRowLines() as unknown as { batches: Placing[] }).batches;
        const placedBytes = (): number => batches().reduce((sum, batch) => sum + batch.ends.byteLength, 0);
        assert.isAbove(placedBytes(), count * 32, "a placed end for every piece under a head");

        await element.session.styles.add({
            name: "plain",
            target: "edge",
            selector: everything,
            set: { "edge.arrowHead": "none" },
        } as never);
        await settled(element);
        const placing = batches().map((batch) => vi.spyOn(batch, "placeEnds"));
        await element.session.positions.set([{ id: 0, x: -5, y: -5, z: 0 }]);
        await settled(element);
        assert.strictEqual(
            placing.reduce((sum, spy) => sum + spy.mock.calls.length, 0),
            0,
            "no ends placed at rest",
        );
        assert.isAtMost(placedBytes(), batches().length * 1024 * 4 * 4, "each table back at its first size");
    });
});
