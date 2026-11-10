/**
 * @file With the internal switch on, a graph's plain straight edges are pulled from the row table
 * (`PulledLineBatch`) and draw the picture the placed lines draw: at rest, after a node is dragged (no
 * edge byte uploaded) and with an edge hidden. An edge with a cap stays an object edge. With
 * `antialias` false under renderPath "batched", straight pulled lines draw the lean program (each
 * piece's rectangle alone, design/rendering/cosmos-gap.md G12) and the same picture. The bar is
 * section 7 of design/rendering/row-renderer.md.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { poolGrowths } from "../../src/meshes/poolReserve";
import { pulledEdgesDefault } from "../../src/meshes/PulledLineBatch";
import { drag } from "../helpers/real-input";
import { edgeBetween } from "../helpers/testSetup";
import { type CanvasFrame as Frame, pixelsOverBar as overBar, readCanvas } from "../helpers/whole-canvas";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

afterEach(() => {
    pulledEdgesDefault.value = false;
    document.body.replaceChildren();
});

const NODES = Array.from({ length: 9 }, (_, id) => ({
    id,
    position: { x: (id % 3) * 1.4 - 1.4, y: Math.floor(id / 3) * 1.4 - 1.4, z: (id % 2) * 0.6 },
}));

/** A ring and two crossings; edge 0 carries a cap and stays an object edge. */
const EDGES = [
    ...NODES.map((node) => ({ src: node.id, dst: (node.id + 1) % NODES.length })),
    { src: 0, dst: 8 },
    { src: 2, dst: 6 },
];

/**
 * An edge's id.
 * @param element - The element.
 * @param source - Its source node.
 * @param target - Its target node.
 * @returns The id.
 */
function edgeId(element: Graphty, source: number, target: number): unknown {
    const edge = edgeBetween(element.graph, source, target);
    assert.isDefined(edge);
    return edge.id;
}

/**
 * Mount an element with the graph loaded, the switch as asked.
 * @param renderer - The renderer.
 * @param pulled - Whether qualifying edges are pulled.
 * @param view - The view.
 * @param path - The render path and multisampling.
 * @param path.renderPath - The render path: "batched" pulls edges whatever the switch says.
 * @param path.antialias - The element's `antialias`.
 * @returns The element.
 */
async function loaded(
    renderer: "webgl" | "webgpu",
    pulled: boolean,
    view: "2d" | "3d" = "3d",
    { renderPath = "objects", antialias = true }: { renderPath?: "objects" | "batched"; antialias?: boolean } = {},
): Promise<Graphty> {
    pulledEdgesDefault.value = pulled;
    const element = document.createElement("graphty-element");
    // Read only when the engine is built, which the next property does.
    element.antialias = antialias;
    element.renderer = renderer;
    // The placed lines are the objects path's: "batched" pulls them whatever the switch says.
    element.renderPath = renderPath;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(view);
    // The graph is directed, so every edge starts with a head: take them off, then put one back.
    await element.session.styles.add({
        name: "uncapped",
        target: "edge",
        selector: { match: "ids", edges: EDGES.map((edge) => edgeId(element, edge.src, edge.dst)) },
        set: { "edge.arrowHead": "none" },
    } as never);
    await element.session.styles.add({
        name: "capped",
        target: "edge",
        selector: { match: "ids", edges: [edgeId(element, 0, 1)] },
        set: { "edge.arrowHead": "normal" },
    } as never);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Drag node 4 with the mouse and read the frame.
 * @param element - The element.
 * @returns The frame.
 */
async function moved(element: Graphty): Promise<Frame> {
    const node = element.graph.getNode(4);
    assert.isDefined(node);
    const from = element.worldToScreen(node.drawnWorldPosition);
    const { x } = node.drawnPosition;
    await drag(element, from, { x: from.x + 40, y: from.y + 30 });
    assert.notEqual(node.drawnPosition.x, x, "the drag moved the node");
    return readCanvas(element.graph);
}

/**
 * Bytes every pulled batch has sent.
 * @param element - The element.
 * @returns The sum.
 */
function pulledBytes(element: Graphty): number {
    let bytes = 0;
    for (const batch of element.graph.getMeshCache().pulledBatchMap.values()) {
        bytes += batch.uploadedBytes;
    }

    return bytes;
}

/**
 * Count `Edge.update` calls, split by whether the edge's line was pulled when it was called.
 * @returns The counts, live.
 */
function countVisits(): { pulled: number; placed: number } {
    const counts = { pulled: 0, placed: 0 };
    const { update } = Edge.prototype;
    vi.spyOn(Edge.prototype, "update").mockImplementation(function (this: Edge) {
        counts[this.isPulled ? "pulled" : "placed"]++;
        update.call(this);
    });
    return counts;
}

/**
 * Drag node 1, then remove node 3 (a freeze renumbers the rows after it), and read the frame.
 * @param element - The element.
 * @returns The frame.
 */
async function draggedAndRenumbered(element: Graphty): Promise<Frame> {
    const node = element.graph.getNode(1);
    assert.isDefined(node);
    const from = element.worldToScreen(node.drawnWorldPosition);
    await drag(element, from, { x: from.x - 30, y: from.y + 40 });
    await element.session.data.removeNodes([3]);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return readCanvas(element.graph);
}

/**
 * Load 3,000 edges on 100 nodes (more than the pools start with) and count how often the edge pools grew.
 * @param renderer - The renderer.
 * @param renderPath - The render path.
 * @param capped - Whether the edges keep their heads (object edges with caps) or are plain (pulled lines).
 * @returns The pools' growths during the load.
 */
async function loadGrowths(
    renderer: "webgl" | "webgpu",
    renderPath: "objects" | "batched",
    capped: boolean,
): Promise<{ lines: number; caps: number }> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.renderPath = renderPath;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.setLayout("fixed", { dim: 3 });
    if (!capped) {
        await element.session.styles.add({
            name: "uncapped",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "none" },
        } as never);
    }

    const nodes = Array.from({ length: 100 }, (_, id) => ({
        id,
        position: { x: id % 10, y: Math.floor(id / 10), z: 0 },
    }));
    const edges = nodes.flatMap((node) =>
        Array.from({ length: 30 }, (_, k) => ({ src: node.id, dst: (node.id + k + 1) % 100 })),
    );
    await element.session.data.addNodes(nodes);
    poolGrowths.lines = 0;
    poolGrowths.caps = 0;
    await element.session.data.addEdges(edges);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    const growths = { ...poolGrowths };
    element.remove();
    return growths;
}

describe.each(RENDERERS)("pulled edges on a graph on %s", (renderer) => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("are never placed by the frame's walk, at load, at a drag or after a renumbering freeze", async () => {
        const placed = await loaded(renderer, false);
        const placedFrame = await draggedAndRenumbered(placed);
        placed.remove();

        const visits = countVisits();
        const pulled = await loaded(renderer, false, "3d", { renderPath: "batched" });
        assert.deepInclude(pulled.graph.rowCounts, { pulledEdges: EDGES.length - 1, objectEdges: 1 });
        assert.strictEqual(visits.pulled, 0, "the load's walk placed no pulled edge");
        assert.isAbove(visits.placed, 0, "the load's walk placed the capped edge");

        visits.placed = 0;
        assert.equal(overBar(placedFrame, await draggedAndRenumbered(pulled)), 0, "after the drag and the freeze");
        assert.strictEqual(visits.pulled, 0, "the drag and the freeze placed no pulled edge");
        assert.isAbove(visits.placed, 0, "the drag placed the capped edge at the dragged node");
    });

    it("are not asked about by the frame's walk while a layout moves the rows", async () => {
        const element = await loaded(renderer, false, "3d", { renderPath: "batched" });
        assert.deepInclude(element.graph.rowCounts, { pulledEdges: EDGES.length - 1, objectEdges: 1 });
        const visits = countVisits();
        const asked = { pulled: 0 };
        const isPulled = Object.getOwnPropertyDescriptor(Edge.prototype, "isPulled")?.get;
        assert.isDefined(isPulled);
        vi.spyOn(Edge.prototype, "isPulled", "get").mockImplementation(function (this: Edge) {
            const pulled = isPulled.call(this) as boolean;
            asked.pulled += pulled ? 1 : 0;
            return pulled;
        });

        await element.graph.setLayout("force", { seed: 1 });
        await element.waitForStableFrame();

        // the capped edge is placed on each frame the rows move; the placed edges are listed once per change to
        // which edges are pulled, so no frame asks a pulled line anything
        assert.isAtLeast(visits.placed, 10, "the layout moved the rows over many frames");
        assert.strictEqual(visits.pulled, 0, "no pulled edge was placed");
        assert.isAtMost(asked.pulled, 2 * (EDGES.length - 1), "each pulled line was asked a fixed number of times");
    });

    it("draw the placed lines' picture at rest, after a move and with an edge hidden", async () => {
        const placed = await loaded(renderer, false);
        assert.equal(placed.graph.rowCounts.pulledEdges, 0);
        const placedRest = await readCanvas(placed.graph);
        const placedMoved = await moved(placed);
        await placed.session.styles.add({
            name: "hidden",
            target: "edge",
            selector: { match: "ids", edges: [edgeId(placed, 2, 6)] },
            set: { "edge.visible": false },
        } as never);
        await operationQueueOf(placed.graph).waitForCompletion();
        const placedHidden = await readCanvas(placed.graph);
        placed.remove();

        const pulled = await loaded(renderer, true);
        assert.deepInclude(pulled.graph.rowCounts, { pulledEdges: EDGES.length - 1, objectEdges: 1 });
        assert.equal(overBar(placedRest, await readCanvas(pulled.graph)), 0, "at rest");

        const before = pulledBytes(pulled);
        assert.equal(overBar(placedMoved, await moved(pulled)), 0, "after a move");
        assert.equal(pulledBytes(pulled), before, "a move uploads no edge byte");

        await pulled.session.styles.add({
            name: "hidden",
            target: "edge",
            selector: { match: "ids", edges: [edgeId(pulled, 2, 6)] },
            set: { "edge.visible": false },
        } as never);
        await operationQueueOf(pulled.graph).waitForCompletion();
        assert.equal(overBar(placedHidden, await readCanvas(pulled.graph)), 0, "with an edge hidden");
        assert.notEqual(overBar(placedRest, placedHidden), 0, "hiding the edge changed the picture");
    });

    it("draw the lean program under antialias false on batched, with the placed picture", async () => {
        const placed = await loaded(renderer, false, "3d", { antialias: false });
        const placedRest = await readCanvas(placed.graph);
        const placedMoved = await moved(placed);
        placed.remove();

        const lean = await loaded(renderer, false, "3d", { renderPath: "batched", antialias: false });
        const keys = [...lean.graph.getMeshCache().pulledBatchMap.keys()];
        assert.deepInclude(lean.graph.rowCounts, { pulledEdges: EDGES.length - 1, objectEdges: 1 });
        assert.isTrue(keys.length > 0 && keys.every((key) => key.endsWith("|lean")), keys.join(", "));
        assert.equal(overBar(placedRest, await readCanvas(lean.graph)), 0, "at rest");
        assert.equal(overBar(placedMoved, await moved(lean)), 0, "after a move");
        lean.remove();

        // Multisampled, as by default, the batched path keeps the join template.
        const joined = await loaded(renderer, false, "3d", { renderPath: "batched" });
        const joinedKeys = [...joined.graph.getMeshCache().pulledBatchMap.keys()];
        assert.isTrue(joinedKeys.length > 0, "the batched path pulls edges");
        assert.isFalse(
            joinedKeys.some((key) => key.endsWith("|lean")),
            joinedKeys.join(", "),
        );
    });

    it("pull the plain edges in 2D too, with their width in world units", async () => {
        const placed = await loaded(renderer, false, "2d");
        const placedRest = await readCanvas(placed.graph);
        placed.remove();

        const pulled = await loaded(renderer, true, "2d");
        assert.deepInclude(pulled.graph.rowCounts, { pulledEdges: EDGES.length - 1, objectEdges: 1 });
        assert.equal(overBar(placedRest, await readCanvas(pulled.graph)), 0);
    });
    it("grow the line and cap pools once for a load, and by doubling on the objects path", async () => {
        assert.strictEqual((await loadGrowths(renderer, "batched", false)).lines, 1, "the pulled line table grew once");
        assert.strictEqual((await loadGrowths(renderer, "batched", true)).caps, 1, "the cap batch grew once");
        // 3,000 heads from 32 slots double seven times; the objects path is left as it was
        assert.strictEqual((await loadGrowths(renderer, "objects", true)).caps, 7, "the objects path doubles");
    });
});
