/**
 * @file Under `renderPath: "batched"` an edge row with no `Edge` is drawn from its paint as a straight line
 * pulled from its two nodes' rows (`EdgeRowLines`), the picture the `Edge`'s own pulled line draws; a paint only
 * an `Edge` draws (a cap, a dash, a curve) is refused. The `"objects"` path has none. Stage 27 (lazy `Edge`) of
 * design/rendering/row-renderer.md.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import type { EdgePaint } from "../../src/managers/StylePainter";
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
 * @returns The element.
 */
async function lazyLoaded(edges: { src: number; dst: number }[], uncapped = true): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = "batched";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    dataManagerInternals.storeEdgesUnbuilt(element.graph.getDataManager(), true);
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
