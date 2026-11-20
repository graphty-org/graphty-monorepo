/**
 * @file What is drawn, read off the canvas: every node and every edge loaded is on screen, and each
 * edge lies between its nodes as they are drawn, after a load, a click, a view switch and at every
 * held pose of a layout transition -- on both render paths, in 2D and 3D, with and without
 * arrowheads.
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
import { undrawnEdges, undrawnNodes } from "../helpers/drawn-invariants";
import { click, nodePoint } from "../helpers/real-input";

const N = 8;
const IDS = Array.from({ length: N }, (_, i) => String(i));
const PAIRS = IDS.map((id, i) => [id, IDS[(i + 1) % N]] as const);

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

/**
 * An element already drawn, empty, then given a ring of 8 nodes and its edges: the way a file loads
 * in the app, and the only way rows are stored with no Node or Edge on the batched path.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @param edges - Directed with the default arrowhead, or undirected (capless).
 * @returns The element.
 */
async function ring(path: Path, view: View, edges: Edges): Promise<Graphty> {
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
    await element.session.config.set({ startingRows: true });
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
 * Every node and every edge is drawn, each edge between its nodes as drawn.
 * @param element - The element.
 * @param when - What just happened, for the message.
 */
async function assertAllDrawn(element: Graphty, when: string): Promise<void> {
    assert.deepEqual(await undrawnNodes(element, IDS), [], `nodes not drawn ${when}`);
    assert.deepEqual(await undrawnEdges(element, PAIRS), [], `edges not drawn between their nodes ${when}`);
}

describe.each(
    (["objects", "batched"] as const).flatMap((path) =>
        (["2d", "3d"] as const).flatMap((view) =>
            (["arrow", "undirected"] as const).map((edges) => ({ path, view, edges })),
        ),
    ),
)("what is drawn on the $path path in $view with $edges edges", ({ path, view, edges }) => {
    it("draws every node, and every edge on its drawn nodes, after a load into a drawn element", async () => {
        const element = await ring(path, view, edges);
        assertLazy(element, path, edges);
        await assertAllDrawn(element, "after the load");
    });

    // #9226/#9228: a click built Nodes for the selected node and its neighbours only, and the rest stopped drawing.
    it("keeps every node and edge drawn after a click selects one", async () => {
        const element = await ring(path, view, edges);
        assertLazy(element, path, edges);
        await click(element, nodePoint(element, "0"));
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.deepEqual(element.session.selection.nodes.map(String), ["0"]);
        await assertAllDrawn(element, "after a click selected node 0");
    });

    // #9223: a switch between 2D and 3D on the batched path left plain edges in disposed batches.
    it("draws every edge again after a switch to the other view and back", async () => {
        const element = await ring(path, view, edges);
        assertLazy(element, path, edges);
        const other = view === "2d" ? "3d" : "2d";
        await element.setViewMode(other);
        await element.waitForStableFrame();
        await assertAllDrawn(element, `after a switch to ${other}`);
        await element.setViewMode(view);
        await element.waitForStableFrame();
        await assertAllDrawn(element, `after a switch back to ${view}`);
    });

    // #9222: a capless edge was laid at the layout's answer while its nodes glided there.
    it("keeps each edge's ends on its nodes as drawn at every held pose of a Glide transition", async () => {
        for (const hold of [0.25, 0.5, 0.75]) {
            const element = await ring(path, view, edges);
            assertLazy(element, path, edges);
            await element.session.config.set({ layoutTransition: { transition: "glide", seconds: 30, hold } });
            await element.graph.setLayout("inv-ring-small");
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            await assertAllDrawn(element, `at the Glide pose held at ${String(hold)}`);
            element.remove();
        }
    });
});
