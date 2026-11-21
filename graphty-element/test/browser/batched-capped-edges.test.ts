/**
 * @file Under `renderPath: "batched"`, an edge with an arrowhead or a dashed or dotted line is still a row line
 * (`EdgeRowLines`): its line is pulled from its nodes' rows, draws its pattern in its shader and stops at the head's
 * back, and its head is drawn from the row table too (`PulledCapBatch`), so neither a directed graph's default look nor
 * an arrowhead or dash restyle builds an `Edge` or leaves an object edge. The picture is the `"objects"` path's, pixel
 * for pixel. Words on a cap that draw nothing do not need an `Edge` either.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { type CanvasFrame, pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

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
 * Mount an element with the graph loaded in 3D, on fixed positions.
 * @param path - The render path.
 * @param renderer - The engine.
 * @param set - What a layer on every edge sets before the edges arrive; none leaves the directed default look.
 * @returns The element, its picture final.
 */
async function loaded(
    path: RenderPath,
    renderer: "webgl" | "webgpu" = "webgl",
    set?: Record<string, unknown>,
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
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

describe("an arrowed edge on the batched path", () => {
    it("is a row line in a directed graph's default look, building no Edge", async () => {
        const element = await loaded("batched");
        assert.deepEqual(drawn(element), ALL_ROW_LINES);
    });

    it("stays a row line when a restyle gives every edge an arrowhead", async () => {
        const element = await loaded("batched", "webgl", { "edge.arrowHead": "none" });
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
        const element = await loaded("batched");
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
        const element = await loaded("batched", "webgl", { "edge.arrowHeadTextSize": 14 });
        assert.deepEqual(drawn(element), ALL_ROW_LINES);
    });

    it("draws the objects path's picture once its arrowhead comes off, and once it comes back", async () => {
        const objects = await loaded("objects", "webgl", { "edge.arrowHead": "none" });
        const plain = await readCanvas(objects.graph);
        objects.remove();
        const element = await loaded("batched");
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
        const objects = await loaded("objects");
        const want = await select(objects);
        objects.remove();
        const batched = await loaded("batched");
        const have = await select(batched);
        assert.equal(pixelsOverBar(want, have), 0);
    });

    it("draws the same picture once reading the edges builds their Edges, before the next frame", async () => {
        const element = await loaded("batched");
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

describe.each(RENDERERS)("an arrowed row line's picture on %s", (renderer) => {
    for (const [name, set] of [
        ["the default look", undefined],
        [
            "wide lines and large open heads",
            { "edge.width": 40, "edge.arrowHead": "open-normal", "edge.arrowHeadSize": 2 },
        ],
        ["vee heads, translucent", { "edge.arrowHead": "vee", "edge.arrowHeadOpacity": 0.5 }],
        ["dashed lines", { "edge.style": "dash" }],
        ["dotted lines with no heads", { "edge.style": "dot", "edge.arrowHead": "none" }],
        ["star lines, wide", { "edge.style": "star", "edge.width": 3 }],
    ] as const) {
        it(`is the objects path's, ${name}`, async () => {
            const objects = await loaded("objects", renderer, set);
            const want = await readCanvas(objects.graph);
            objects.remove();
            const batched = await loaded("batched", renderer, set);
            assert.deepEqual(drawn(batched), ALL_ROW_LINES);
            assert.equal(pixelsOverBar(want, await readCanvas(batched.graph)), 0);
        });
    }
});
