/**
 * @file Under `renderPath: "batched"` a curve (`line.bezier`), lone or fanned out of a bundle of edges
 * between the same two nodes, is pulled from the row table (`PulledLineBatch` with curve texels,
 * `meshes/pulledCurve.ts`) and draws the picture the `"objects"` path draws, at rest and after a drag.
 * A fanned curve that gains a parallel edge fans out beside it, and draws as before once it goes.
 * A bundle spread by `line.fanSpacing` is pulled too, and follows a new spacing, and a curve drawn as an arc of a
 * circle (`line.arcRadius`) follows a new radius. A curve stopped short of its nodes by a gap (`line.nodeGap`,
 * `sourceNodeGap`, `targetNodeGap`) is pulled too, and follows a new gap, one wide enough that a curve clears
 * neither gapped node and is drawn uncut between its bare ends. A curve raised off the map (`line.route` "arc") is
 * pulled too, and follows a new height (`line.arcHeight`), and so is a curve or a straight line on the great-circle
 * route (`line.route` "great-circle"). A self-loop's teardrop is pulled too, and spreads round its node as the node
 * gains a loop. A route the `location-map` layout picks (an arc over a flat map, a great circle on a globe, straight
 * to a node it could not place) is pulled too, and follows the layout as it changes.
 * Stage 21 of design/rendering/row-renderer.md; the bar is its section 7.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { drag } from "../helpers/real-input";
import { edgeBetween } from "../helpers/testSetup";
import { type CanvasFrame as Frame, pixelsOverBar as overBar, readCanvas } from "../helpers/whole-canvas";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

afterEach(() => {
    document.body.replaceChildren();
});

/** Each node but the last has a place on a map too, which only the `location-map` layout reads. */
const NODES = Array.from({ length: 9 }, (_, id) => ({
    id,
    position: { x: (id % 3) * 1.4 - 1.4, y: Math.floor(id / 3) * 1.4 - 1.4, z: (id % 2) * 0.6 },
    ...(id < 8 ? { latitude: 20 + (id % 3) * 15, longitude: -100 + id * 25 } : {}),
}));

/** A ring and two crossings; edge 0 fans, alone between its nodes until a parallel edge joins it. */
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
 * Mount an element on a render path with the graph loaded.
 * @param renderer - The renderer.
 * @param path - The render path.
 * @returns The element.
 */
async function loaded(renderer: "webgl" | "webgpu", path: RenderPath): Promise<Graphty> {
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
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("3d");
    // The graph is directed, so every edge starts with a head: take them off and curve every edge.
    await element.session.styles.add({
        name: "lone curves",
        target: "edge",
        selector: { match: "ids", edges: EDGES.map((edge) => edgeId(element, edge.src, edge.dst)) },
        set: { "edge.arrowHead": "none", "edge.curvature": true, "edge.fanned": false },
    } as never);
    await element.session.styles.add({
        name: "fanned",
        target: "edge",
        selector: { match: "ids", edges: [edgeId(element, 0, 1)] },
        set: { "edge.fanned": true },
    } as never);
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

describe.each(RENDERERS)("pulled curves on the batched path on %s", (renderer) => {
    it("pull every lone curve and draw the objects path's picture, at rest and after a drag", async () => {
        const objects = await loaded(renderer, "objects");
        assert.deepInclude(objects.graph.rowCounts, { pulledEdges: 0, objectEdges: EDGES.length });
        const objectsRest = await readCanvas(objects.graph);
        const objectsMoved = await moved(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length, objectEdges: 0 });
        const curveBatches = batched.graph.scene.meshes.filter((mesh) => mesh.name.endsWith("|curve"));
        assert.lengthOf(curveBatches, 1, "the lone curves are drawn from one curve batch");
        assert.equal(overBar(objectsRest, await readCanvas(batched.graph)), 0, "at rest");
        assert.equal(overBar(objectsMoved, await moved(batched)), 0, "after a drag");
    });

    it("fan a pulled curve out beside a parallel edge, and draw it as before once the edge goes", async () => {
        const parallel = { src: 1, dst: 0 };
        /**
         * Add the parallel edge, fan it, and read the frame; then remove it and read again.
         * @param element - The element.
         * @returns Both frames and the edge counts with the parallel edge.
         */
        async function bundled(element: Graphty): Promise<{ joined: Frame; left: Frame; counts: object }> {
            await element.session.data.addEdges([parallel]);
            const id = edgeId(element, parallel.src, parallel.dst);
            await element.session.styles.add({
                name: "parallel",
                target: "edge",
                selector: { match: "ids", edges: [id] },
                set: { "edge.arrowHead": "none", "edge.curvature": true },
            } as never);
            await settled(element);
            const counts = { ...element.graph.rowCounts };
            const joined = await readCanvas(element.graph);
            await element.session.data.removeEdges([id as never]);
            await settled(element);
            return { joined, left: await readCanvas(element.graph), counts };
        }

        const objects = await loaded(renderer, "objects");
        const before = await bundled(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        const after = await bundled(batched);
        assert.deepInclude(after.counts, { pulledEdges: EDGES.length + 1, objectEdges: 0 }, "the bundle is pulled");
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length, objectEdges: 0 }, "still pulled");
        assert.equal(overBar(before.joined, after.joined), 0, "with the parallel edge");
        assert.equal(overBar(before.left, after.left), 0, "after it is removed");
    });

    it("pull a mixed bundle drawn both ways round and draw the objects path's picture, at rest and after a drag", async () => {
        /**
         * Join nodes 3 and 4 with three more fanned curves, one drawn against the others, and a straight edge,
         * beside the ring's curve between them that does not fan.
         * @param element - The element.
         */
        async function bundled(element: Graphty): Promise<void> {
            await element.session.data.addEdges([
                { src: 4, dst: 3 },
                { src: 3, dst: 4 },
                { src: 3, dst: 4 },
                { src: 3, dst: 4 },
            ]);
            const data = element.graph.getDataManager();
            const added = [...data.getEdgesBetween(3, 4).slice(1), ...data.getEdgesBetween(4, 3)];
            assert.lengthOf(added, 4);
            await element.session.styles.add({
                name: "bundle",
                target: "edge",
                selector: { match: "ids", edges: added.map((edge) => edge.id) },
                set: { "edge.arrowHead": "none" },
            } as never);
            await element.session.styles.add({
                name: "bundle curves",
                target: "edge",
                selector: { match: "ids", edges: added.slice(1).map((edge) => edge.id) },
                set: { "edge.curvature": true },
            } as never);
            await settled(element);
        }

        const objects = await loaded(renderer, "objects");
        await bundled(objects);
        const objectsRest = await readCanvas(objects.graph);
        const objectsMoved = await moved(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        await bundled(batched);
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length + 4, objectEdges: 0 });
        assert.equal(overBar(objectsRest, await readCanvas(batched.graph)), 0, "at rest");
        assert.equal(overBar(objectsMoved, await moved(batched)), 0, "after a drag");
    });

    it("pull a bundle spread by fanSpacing, and follow a new spacing, drawing the objects path's picture", async () => {
        /**
         * Join nodes 3 and 4 with three fanned curves spread 0.25 apart, read the frame, then spread them 0.5 apart.
         * @param element - The element.
         * @returns The frames at each spacing.
         */
        async function spread(element: Graphty): Promise<{ narrow: Frame; wide: Frame }> {
            await element.session.data.addEdges([
                { src: 3, dst: 4 },
                { src: 4, dst: 3 },
                { src: 3, dst: 4 },
            ]);
            const data = element.graph.getDataManager();
            const added = [...data.getEdgesBetween(3, 4).slice(1), ...data.getEdgesBetween(4, 3)];
            assert.lengthOf(added, 3);
            const edges = added.map((edge) => edge.id);
            await element.session.styles.add({
                name: "spread",
                target: "edge",
                selector: { match: "ids", edges },
                set: { "edge.arrowHead": "none", "edge.curvature": true, "edge.fanSpacing": 0.25 },
            } as never);
            await settled(element);
            const narrow = await readCanvas(element.graph);
            await element.session.styles.add({
                name: "wider",
                target: "edge",
                selector: { match: "ids", edges },
                set: { "edge.fanSpacing": 0.5 },
            } as never);
            await settled(element);
            return { narrow, wide: await readCanvas(element.graph) };
        }

        const objects = await loaded(renderer, "objects");
        const before = await spread(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        const after = await spread(batched);
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length + 3, objectEdges: 0 });
        assert.isAbove(overBar(before.narrow, before.wide), 0, "the new spacing moves the arcs");
        assert.equal(overBar(before.narrow, after.narrow), 0, "spread 0.25 apart");
        assert.equal(overBar(before.wide, after.wide), 0, "spread 0.5 apart");
    });

    it("pull curves drawn as circle arcs, and follow a new radius, drawing the objects path's picture", async () => {
        /**
         * Draw every lone curve as an arc of radius 0.6, read the frame, drag, then widen the radius to 2 and read again.
         * @param element - The element.
         * @returns The frames at each radius.
         */
        async function arcs(element: Graphty): Promise<{ tight: Frame; dragged: Frame; wide: Frame }> {
            const edges = EDGES.map((edge) => edgeId(element, edge.src, edge.dst));
            await element.session.styles.add({
                name: "arcs",
                target: "edge",
                selector: { match: "ids", edges },
                set: { "edge.arcRadius": 0.6 },
            } as never);
            await settled(element);
            const tight = await readCanvas(element.graph);
            const dragged = await moved(element);
            await element.session.styles.add({
                name: "wider arcs",
                target: "edge",
                selector: { match: "ids", edges },
                set: { "edge.arcRadius": 2 },
            } as never);
            await settled(element);
            return { tight, dragged, wide: await readCanvas(element.graph) };
        }

        const objects = await loaded(renderer, "objects");
        const before = await arcs(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        const after = await arcs(batched);
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length, objectEdges: 0 });
        assert.isAbove(overBar(before.tight, before.wide), 0, "the new radius moves the arcs");
        assert.equal(overBar(before.tight, after.tight), 0, "radius 0.6");
        assert.equal(overBar(before.dragged, after.dragged), 0, "after a drag");
        assert.equal(overBar(before.wide, after.wide), 0, "radius 2");
    });

    it("pull curves stopped short of their nodes by a gap, and follow a new gap, drawing the objects path's picture", async () => {
        /**
         * Stop every curve 0.15 short of its nodes, read the frame, drag, then widen one end's gap and read again.
         * @param element - The element.
         * @returns The frames at each gap.
         */
        async function gaps(element: Graphty): Promise<{ narrow: Frame; dragged: Frame; wide: Frame }> {
            const edges = EDGES.map((edge) => edgeId(element, edge.src, edge.dst));
            await element.session.styles.add({
                name: "gaps",
                target: "edge",
                selector: { match: "ids", edges },
                set: { "edge.nodeGap": 0.15 },
            } as never);
            await settled(element);
            const narrow = await readCanvas(element.graph);
            const dragged = await moved(element);
            // a source gap past the next node: no point of those curves clears both, so each is drawn uncut
            await element.session.styles.add({
                name: "wide source gaps",
                target: "edge",
                selector: { match: "ids", edges: edges.slice(0, 3) },
                set: { "edge.sourceNodeGap": 1.2 },
            } as never);
            await settled(element);
            return { narrow, dragged, wide: await readCanvas(element.graph) };
        }

        const objects = await loaded(renderer, "objects");
        const before = await gaps(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        const after = await gaps(batched);
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length, objectEdges: 0 });
        assert.isAbove(overBar(before.narrow, before.wide), 0, "the wide gaps move the curves");
        assert.equal(overBar(before.narrow, after.narrow), 0, "a gap of 0.15");
        assert.equal(overBar(before.dragged, after.dragged), 0, "after a drag");
        assert.equal(overBar(before.wide, after.wide), 0, "wide source gaps");
    });
    it("pull curves raised in arcs, and follow a new height, drawing the objects path's picture", async () => {
        /**
         * Raise every curve, drag a node, then raise them higher.
         * @param element - The element.
         * @returns The pictures.
         */
        async function raised(element: Graphty): Promise<{ low: Frame; dragged: Frame; high: Frame }> {
            const edges = EDGES.map((edge) => edgeId(element, edge.src, edge.dst));
            await element.session.styles.add({
                name: "raised",
                target: "edge",
                selector: { match: "ids", edges },
                set: { "edge.route": "arc" },
            } as never);
            await settled(element);
            const low = await readCanvas(element.graph);
            const dragged = await moved(element);
            await element.session.styles.add({
                name: "higher",
                target: "edge",
                selector: { match: "ids", edges },
                set: { "edge.arcHeight": 0.6 },
            } as never);
            await settled(element);
            return { low, dragged, high: await readCanvas(element.graph) };
        }

        const objects = await loaded(renderer, "objects");
        const before = await raised(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        const after = await raised(batched);
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length, objectEdges: 0 });
        assert.isAbove(overBar(before.low, before.high), 0, "the new height moves the arcs");
        assert.equal(overBar(before.low, after.low), 0, "the default height");
        assert.equal(overBar(before.dragged, after.dragged), 0, "after a drag");
        assert.equal(overBar(before.high, after.high), 0, "height 0.6");
    });

    it("pull straight lines raised in arcs, and follow a new height down to flat, drawing the objects path's picture", async () => {
        /**
         * Straighten and raise every edge, drag a node, raise them higher, then flatten them.
         * @param element - The element.
         * @returns The pulled rows after the raise, and the pictures.
         */
        async function raised(
            element: Graphty,
        ): Promise<{ pulled: number; low: Frame; dragged: Frame; high: Frame; flat: Frame }> {
            const edges = EDGES.map((edge) => edgeId(element, edge.src, edge.dst));
            const restyle = async (name: string, set: Record<string, unknown>): Promise<Frame> => {
                await element.session.styles.add({
                    name,
                    target: "edge",
                    selector: { match: "ids", edges },
                    set,
                } as never);
                await settled(element);
                return readCanvas(element.graph);
            };
            await restyle("straight", { "edge.curvature": false });
            const low = await restyle("raised", { "edge.route": "arc" });
            const { pulledEdges: pulled } = element.graph.rowCounts;
            const dragged = await moved(element);
            const high = await restyle("higher", { "edge.arcHeight": 0.6 });
            const flat = await restyle("flat", { "edge.arcHeight": 0 });
            return { pulled, low, dragged, high, flat };
        }

        const objects = await loaded(renderer, "objects");
        const before = await raised(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        const after = await raised(batched);
        assert.equal(after.pulled, EDGES.length, "the raised straight lines are pulled");
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length, objectEdges: 0 });
        assert.isAbove(overBar(before.low, before.high), 0, "the new height moves the arcs");
        assert.equal(overBar(before.low, after.low), 0, "the default height");
        assert.equal(overBar(before.dragged, after.dragged), 0, "after a drag");
        assert.equal(overBar(before.high, after.high), 0, "height 0.6");
        assert.equal(overBar(before.flat, after.flat), 0, "height 0, drawn straight");
    });

    it("pull curves and straight lines on the great-circle route, and follow a new height, drawing the objects path's picture", async () => {
        /**
         * Put every edge on the great-circle route, drag a node, raise them higher, straighten them, then flatten them.
         * Node 4 starts at the globe's center and edge 2 to 6 runs through it, so some are drawn straight.
         * @param element - The element.
         * @returns The pulled rows after the route, and the pictures.
         */
        async function routed(
            element: Graphty,
        ): Promise<{ pulled: number; low: Frame; dragged: Frame; high: Frame; straight: Frame; flat: Frame }> {
            const edges = EDGES.map((edge) => edgeId(element, edge.src, edge.dst));
            const restyle = async (name: string, set: Record<string, unknown>): Promise<Frame> => {
                await element.session.styles.add({
                    name,
                    target: "edge",
                    selector: { match: "ids", edges },
                    set,
                } as never);
                await settled(element);
                return readCanvas(element.graph);
            };
            const low = await restyle("routed", { "edge.route": "great-circle" });
            const { pulledEdges: pulled } = element.graph.rowCounts;
            const dragged = await moved(element);
            const high = await restyle("higher", { "edge.arcHeight": 0.6 });
            const straight = await restyle("straight", { "edge.curvature": false });
            const flat = await restyle("flat", { "edge.arcHeight": 0 });
            return { pulled, low, dragged, high, straight, flat };
        }

        const objects = await loaded(renderer, "objects");
        const before = await routed(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        const after = await routed(batched);
        assert.equal(after.pulled, EDGES.length, "the routed curves are pulled");
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length, objectEdges: 0 });
        assert.isAbove(overBar(before.low, before.high), 0, "the new height moves the arcs");
        assert.equal(overBar(before.low, after.low), 0, "the default height");
        assert.equal(overBar(before.dragged, after.dragged), 0, "after a drag");
        assert.equal(overBar(before.high, after.high), 0, "height 0.6");
        assert.equal(overBar(before.straight, after.straight), 0, "straight lines at height 0.6");
        assert.equal(overBar(before.flat, after.flat), 0, "height 0, drawn straight");
    });

    it("pull self-loops, curved or not, and spread them as their node gains one, drawing the objects path's picture", async () => {
        /**
         * Give node 4 three loops (two of them curved) and node 8 four, drag node 4, then give node 8 a fifth, which
         * narrows the share of its loops round it, and take it away again.
         * @param element - The element.
         * @returns The pulled rows with the loops, and the pictures.
         */
        async function looped(
            element: Graphty,
        ): Promise<{ pulled: number; rest: Frame; dragged: Frame; five: Frame; four: Frame }> {
            const loops = [4, 4, 4, 8, 8, 8, 8].map((id) => ({ src: id, dst: id }));
            await element.session.data.addEdges(loops);
            const data = element.graph.getDataManager();
            const ids = (id: number): unknown[] => data.getEdgesBetween(id, id).map((edge) => edge.id);
            await element.session.styles.add({
                name: "loops",
                target: "edge",
                selector: { match: "ids", edges: [...ids(4), ...ids(8)] },
                set: { "edge.arrowHead": "none" },
            } as never);
            await element.session.styles.add({
                name: "curved loops",
                target: "edge",
                selector: { match: "ids", edges: ids(4).slice(1) },
                set: { "edge.curvature": true },
            } as never);
            await settled(element);
            const { pulledEdges: pulled } = element.graph.rowCounts;
            const rest = await readCanvas(element.graph);
            const dragged = await moved(element);
            await element.session.data.addEdges([{ src: 8, dst: 8 }]);
            const fifth = ids(8).at(-1);
            await element.session.styles.add({
                name: "fifth loop",
                target: "edge",
                selector: { match: "ids", edges: [fifth] },
                set: { "edge.arrowHead": "none" },
            } as never);
            await settled(element);
            const five = await readCanvas(element.graph);
            await element.session.data.removeEdges([fifth as never]);
            await settled(element);
            return { pulled, rest, dragged, five, four: await readCanvas(element.graph) };
        }

        const objects = await loaded(renderer, "objects");
        const before = await looped(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        const after = await looped(batched);
        assert.equal(after.pulled, EDGES.length + 7, "the loops are pulled");
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length + 7, objectEdges: 0 });
        const curveBatches = batched.graph.scene.meshes.filter((mesh) => mesh.name.endsWith("|curve"));
        assert.lengthOf(curveBatches, 1, "the loops are drawn from the curves' batch");
        assert.isAbove(overBar(before.four, before.five), 0, "a fifth loop spreads its node's loops");
        assert.equal(overBar(before.rest, after.rest), 0, "at rest");
        assert.equal(overBar(before.dragged, after.dragged), 0, "after a drag");
        assert.equal(overBar(before.five, after.five), 0, "with a fifth loop");
        assert.equal(overBar(before.four, after.four), 0, "after it is removed");
    });
    it("pull the routes the location-map layout picks, and follow the layout as it changes, drawing the objects path's picture", async () => {
        /**
         * Straighten half the edges, lay the graph on a flat map (arcs), then on a globe (great circles), then back on
         * its fixed positions (no route). Node 8 has no place on the map, so its edges stay straight on it.
         * @param element - The element.
         * @returns The pulled rows on the map, and the pictures.
         */
        async function mapped(element: Graphty): Promise<{ pulled: number; flat: Frame; globe: Frame; fixed: Frame }> {
            await element.session.styles.add({
                name: "straight",
                target: "edge",
                selector: {
                    match: "ids",
                    edges: EDGES.filter((_, i) => i % 2 === 0).map((e) => edgeId(element, e.src, e.dst)),
                },
                set: { "edge.curvature": false },
            } as never);
            const map = { latitude: "latitude", longitude: "longitude", gazetteer: false } as const;
            const lay = async (type: string, options: Record<string, unknown>): Promise<Frame> => {
                await element.graph.setLayout(type, options);
                await settled(element);
                return readCanvas(element.graph);
            };
            const flat = await lay("location-map", { ...map, mapDimension: "2d" });
            const { pulledEdges: pulled } = element.graph.rowCounts;
            const globe = await lay("location-map", { ...map, mapDimension: "3d" });
            await lay("fixed", { dim: 3 });
            // the camera still frames the globe, where the graph is a few pixels across
            element.zoomToFit();
            await settled(element);
            const fixed = await readCanvas(element.graph);
            return { pulled, flat, globe, fixed };
        }

        const objects = await loaded(renderer, "objects");
        const before = await mapped(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        const after = await mapped(batched);
        assert.equal(after.pulled, EDGES.length, "the edges on the map are pulled");
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGES.length, objectEdges: 0 });
        assert.equal(overBar(before.flat, after.flat), 0, "arcs over a flat map");
        assert.equal(overBar(before.globe, after.globe), 0, "great circles on a globe");
        assert.equal(overBar(before.fixed, after.fixed), 0, "off the map again");
    });
});
