/**
 * @file What is drawn, read off the canvas: every node and every edge loaded is on screen, and each
 * edge lies between its nodes as they are drawn, with no node or edge ink anywhere else, after a
 * load, a click, a hover, a style that takes one node off its batch, a view switch and at held poses
 * of every transition that moves nodes -- on both render paths, in 2D and 3D, with and without
 * arrowheads, with the default style rows (the graphty app) and without (the element's default).
 *
 * The configuration the graphty app ships on canary (renderPath "batched", plain undirected
 * edges, data loaded into an element already drawn) stores rows with no Node or Edge object; three
 * bugs drew nothing there while every bookkeeping assertion passed (#9222, #9223, #9226/#9228).
 * The fixture reaches that lazy state on purpose and the checks read pixels only. Never call
 * `getNode`, `getEdges` or `edgeBetween` here: they build the rows and hide the defect.
 */

import "../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import {
    type AuthoredLayoutDescriptor,
    clearRegisteredLayoutsForTesting,
    registerSnapshotLayout,
    type SnapshotLayoutInput,
} from "../../extend";
import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { MIN_RADIUS_PX } from "../../src/render/NodeIdTarget";
import { strayInk, undrawnEdges, undrawnNodes } from "../helpers/drawn-invariants";
import { click, hover, nodePoint } from "../helpers/real-input";

const N = 8;
const IDS = Array.from({ length: N }, (_, i) => String(i));
const PAIRS = IDS.map((id, i) => [id, IDS[(i + 1) % N]] as const);

/**
 * The transitions that move nodes and keep drawing them; `fade-through` and `particle-morph` draw
 * each node as a particle cloud on the way, so a held pose of theirs shows no node by design.
 */
const MOVING = ["glide", "staggered-glide", "arc-move", "swirl", "collapse-bloom"];

/** The ring layout a transition moves to: radius 2, turned by half a step. */
const RING_SMALL: AuthoredLayoutDescriptor = {
    id: "inv-ring-small",
    plainName: "Small ring",
    technicalName: "Nodes on a small ring",
    description: "Puts the nodes on a ring of radius 2.",
    family: "geometric",
    kind: "batch",
    maxDimensions: 2,
    sizeRating: "any",
    structuralInputs: [],
    engine: "inv-ring-small",
    options: [],
};

/**
 * Place node i on a circle.
 * @param i - The node's index.
 * @param radius - The circle's radius.
 * @param turn - The circle's rotation, in radians.
 * @returns x and y.
 */
function onRing(i: number, radius: number, turn: number): { x: number; y: number } {
    const a = (2 * Math.PI * i) / N + turn;
    return { x: radius * Math.cos(a), y: radius * Math.sin(a) };
}

/**
 * The small ring, for the layout.
 * @param input - The graph.
 * @returns The coordinates.
 */
function ringSmall(input: SnapshotLayoutInput): Float32Array<ArrayBuffer> {
    const out = new Float32Array(input.dimensions * input.graph.nodeCount);
    for (let i = 0; i < input.graph.nodeCount; i++) {
        const { x, y } = onRing(i, 2, Math.PI / 8);
        out[input.dimensions * i] = x;
        out[input.dimensions * i + 1] = y;
    }

    return out;
}

beforeAll(() => {
    registerSnapshotLayout({ descriptor: RING_SMALL, compute: ringSmall });
});

afterAll(() => {
    clearRegisteredLayoutsForTesting();
});

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

type Path = "objects" | "batched";
type View = "2d" | "3d";
type Edges = "arrow" | "undirected";
/** The default style rows on, as the graphty app sets them, or off, the element's default. */
type Rows = "rows" | "no rows";

/**
 * An element already drawn, empty, then given a ring of 8 nodes and its edges: the way a file loads
 * in the app, and the only way rows are stored with no Node or Edge on the batched path.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @param edges - Directed with the default arrowhead, or undirected (capless).
 * @param rows - Whether the project starts with the default style rows.
 * @returns The element.
 */
async function ring(path: Path, view: View, edges: Edges, rows: Rows): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "400px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(view);
    if (rows === "rows") {
        await element.session.config.set({ startingRows: true });
    }

    await element.session.styles.add({
        name: "Node ink",
        target: "node",
        selector: { match: "everything" },
        // Small, so the points an edge is read at lie clear of its nodes and the selection halo.
        set: { "node.color": "#2040ff", "node.size": 0.3 },
    });
    await element.session.styles.add({
        name: "Edge ink",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#ff00ff", "edge.width": 4 },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    await element.session.data.addNodes(IDS.map((id, i) => ({ id, position: { ...onRing(i, 4, 0), z: 0 } })));
    await element.session.data.addEdges(
        PAIRS.map(([source, target]) =>
            edges === "undirected" ? { source, target, directed: false } : { source, target },
        ),
    );
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * On the batched path, the fixture must still reach the lazy state the bugs live in; a fixture
 * that builds every row would pass on broken code.
 * @param element - The element.
 * @param path - The render path.
 */
function assertLazy(element: Graphty, path: Path, edges: Edges): void {
    if (path !== "batched") {
        return;
    }

    const manager = element.graph.getDataManager();
    assert.isBelow(dataManagerInternals.nodesBuilt(manager), N, "some node rows have no Node");
    if (edges === "undirected") {
        // An arrowhead is cast from its node's mesh, so a directed edge builds its Edge.
        assert.strictEqual(dataManagerInternals.edgesBuilt(manager), 0, "no edge row has an Edge");
    }
}

/**
 * Every node and every edge is drawn, each edge between its nodes as drawn, and nothing else is.
 * @param element - The element.
 * @param when - What just happened, for the message.
 */
async function assertAllDrawn(element: Graphty, when: string): Promise<void> {
    assert.deepEqual(await undrawnNodes(element, IDS), [], `nodes not drawn ${when}`);
    assert.deepEqual(await undrawnEdges(element, PAIRS), [], `edges not drawn between their nodes ${when}`);
    assert.deepEqual(await strayInk(element, IDS, PAIRS), [], `node or edge ink away from every node and edge ${when}`);
}

/**
 * Let what the last input or write started finish, and the frame settle.
 * @param element - The element.
 */
async function settle(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

it("covers every catalog transition that keeps drawing its nodes", () => {
    const element = document.createElement("graphty-element");
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    const ids = element.session.catalog
        .transitions()
        .filter((transition) => transition.drawable === undefined)
        .map((transition) => transition.id);
    assert.deepEqual(ids, MOVING);
});

describe.each(
    (["objects", "batched"] as const).flatMap((path) =>
        (["2d", "3d"] as const).flatMap((view) =>
            (["arrow", "undirected"] as const).flatMap((edges) =>
                (["rows", "no rows"] as const).map((rows) => ({ path, view, edges, rows })),
            ),
        ),
    ),
)("what is drawn on the $path path in $view with $edges edges and $rows", ({ path, view, edges, rows }) => {
    it("draws every node, and every edge on its drawn nodes, after a load into a drawn element", async () => {
        const element = await ring(path, view, edges, rows);
        assertLazy(element, path, edges);
        await assertAllDrawn(element, "after the load");
    });

    // #9226/#9228: a click built Nodes for the selected node and its neighbors only, and the rest stopped drawing.
    it("keeps every node and edge drawn after a click selects one", async () => {
        const element = await ring(path, view, edges, rows);
        assertLazy(element, path, edges);
        await click(element, nodePoint(element, "0"));
        await settle(element);
        assert.deepEqual(element.session.selection.nodes.map(String), ["0"]);
        await assertAllDrawn(element, "after a click selected node 0");
    });

    // #9226: anything that takes one row off its batch while keeping its source, not only a selection, hid the rest.
    it("keeps every node and edge drawn while the pointer hovers one", async () => {
        const element = await ring(path, view, edges, rows);
        assertLazy(element, path, edges);
        // The default Hovered row sets nothing; a halo is what takes a row off its batch, as Selected's does.
        await element.session.styles.add({
            name: "Hover halo",
            target: "node",
            selector: { match: "state", state: "hovered" },
            set: { "node.haloColor": "#20c020" },
        });
        await settle(element);
        await hover(element, nodePoint(element, "0"));
        await settle(element);
        await assertAllDrawn(element, "while the pointer is on node 0");
    });

    it("keeps every node and edge drawn when a style gives one node a halo, which no batch draws", async () => {
        const element = await ring(path, view, edges, rows);
        assertLazy(element, path, edges);
        await element.session.styles.add({
            name: "Halo on 0",
            target: "node",
            selector: { match: "ids", nodes: ["0"] },
            set: { "node.haloColor": "#20c020" },
        });
        await settle(element);
        await assertAllDrawn(element, "after a halo on node 0");
    });

    // #9223: a switch between 2D and 3D on the batched path left plain edges in disposed batches.
    it("draws every edge again after a switch to the other view and back", async () => {
        const element = await ring(path, view, edges, rows);
        assertLazy(element, path, edges);
        const other = view === "2d" ? "3d" : "2d";
        await element.setViewMode(other);
        await element.waitForStableFrame();
        await assertAllDrawn(element, `after a switch to ${other}`);
        await element.setViewMode(view);
        await element.waitForStableFrame();
        await assertAllDrawn(element, `after a switch back to ${view}`);
    });

    // #9222: a capless edge was laid at the layout's answer while its nodes traveled there.
    it.each(MOVING)("keeps each edge's ends on its nodes as drawn at held poses of %s", async (transition) => {
        for (const hold of [0.3, 0.7]) {
            const element = await ring(path, view, edges, rows);
            assertLazy(element, path, edges);
            await element.session.config.set({ layoutTransition: { transition, seconds: 30, hold } });
            await element.graph.setLayout("inv-ring-small");
            await settle(element);
            await assertAllDrawn(element, `at the ${transition} pose held at ${String(hold)}`);
            element.remove();
        }
    });
});

/** How many nodes the tiny-node line holds: enough that the framed line puts them under two pixels apart. */
const LINE = 240;

/**
 * An element already drawn, empty, then given a line of nodes too small and too close to draw as
 * they are in the node ID target hover reads: each is drawn there at the target's least radius, so
 * its neighbors' enlarged discs cover its center.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @returns The element and the ids.
 */
async function tinyLine(path: Path, view: View): Promise<{ element: Graphty; ids: string[] }> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "400px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(view);
    await element.session.styles.add({
        name: "Tiny",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 0.8 },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    const ids = Array.from({ length: LINE }, (_, i) => `n${String(i)}`);
    // Every other node farther from the camera, so in 3D its nearer neighbors' grown discs cover it.
    await element.session.data.addNodes(ids.map((id, i) => ({ id, position: { x: i, y: 0, z: i % 2 === 0 ? 0 : 3 } })));
    await element.graph.setLayout("fixed", { dim: 3 });
    await settle(element);
    return { element, ids };
}

// #9377: hover read a node's neighbor, drawn larger than it is in the node ID target, wherever that
// neighbor's disc covered the node, so on a dense graph some nodes could never be hovered.
describe.each(
    (["objects", "batched"] as const).flatMap((path) => (["2d", "3d"] as const).map((view) => ({ path, view }))),
)("hover over nodes drawn under two pixels on the $path path in $view", ({ path, view }) => {
    it("reads the node the pointer is on, as a click there would", async () => {
        const { element, ids } = await tinyLine(path, view);
        const middle = ids.slice(LINE / 2 - 10, LINE / 2 + 10);
        // The fixture's premise: drawn under the target's least radius, closer than twice it.
        const near = element.nodeScreenPosition(middle[0]);
        const next = element.nodeScreenPosition(middle[1]);
        assert.isBelow(near?.radius ?? Infinity, MIN_RADIUS_PX, "a node is drawn smaller than the target draws it");
        assert.isBelow(Math.abs((next?.x ?? Infinity) - (near?.x ?? 0)), 2 * MIN_RADIUS_PX, "neighbors are that close");
        const heard: string[] = [];
        element.addEventListener("graphty-node-hover", (event) => {
            heard.push(String(event.detail.nodeId));
        });
        const missed: string[] = [];
        let checked = 0;
        for (const id of middle) {
            const point = nodePoint(element, id);
            await hover(element, point);
            await settle(element);
            const clicked = element.elementAt(point);
            // Where two nodes' own shapes overlap, a click and a hover may each name either.
            if (clicked?.id !== id) {
                continue;
            }

            checked++;
            if (element.session.selection.hovered !== id || heard.at(-1) !== id) {
                missed.push(`${id} read ${String(element.session.selection.hovered)}`);
            }
        }

        assert.isAtLeast(checked, middle.length / 2, "most points land on their own node");
        assert.deepEqual(missed, [], "nodes a click finds under the pointer that hover did not read");
    });
});
