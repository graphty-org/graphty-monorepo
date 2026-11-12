/**
 * @file Layouts over the working graph (design/working-graph/design.md, section 7). With the
 * session's `workingGraph` option on, every layout -- one-pass, simulation, incremental, a third
 * party's -- lays out only what the visibility filter and the time window show: a hidden node gets
 * no slot and exerts no force, it keeps its last position, and a change of what is shown lays the
 * graph out again, once. With the option off, a layout runs over the whole graph as it always has.
 *
 * Positions are read from the shared array (`session.positions`), which answers for hidden nodes
 * too.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import {
    type AuthoredLayoutDescriptor,
    type Edge,
    LayoutEngine,
    type Position,
    registerSnapshotLayout,
    type SnapshotLayoutInput,
} from "../../extend";
import { Graph } from "../../index.js";
import { setDefaultFeatures } from "../../src/features/resolve";
import { operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";
import type { ElementSession } from "../../src/session/types";

/** Twenty nodes on a path. */
const IDS = Array.from({ length: 20 }, (_, index) => `n${String(index)}`);

/** Five neighbours on the path: on the whole graph's circle of twenty they are 18 degrees apart. */
const FIVE = IDS.slice(0, 5);

/** A clique of ten nodes, a component of its own beside the path. */
const CLIQUE = Array.from({ length: 10 }, (_, index) => `c${String(index)}`);

/**
 * Put a graph on the page.
 * @param working - Whether the session reads the working graph.
 * @returns The graph and its container.
 */
async function emptyGraph(working: boolean): Promise<{ graph: Graph; container: HTMLDivElement }> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    graph.getSession().workingGraph = working;
    return { graph, container };
}

/**
 * Add the twenty-node path, and a clique beside it when asked.
 * @param graph - The graph.
 * @param clique - Whether to add the clique too.
 */
async function addPath(graph: Graph, clique = false): Promise<void> {
    const extra = clique ? CLIQUE : [];
    await graph.addNodes([...IDS, ...extra].map((id) => ({ id })));
    await graph.addEdges([
        ...IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })),
        ...extra.flatMap((a, i) => extra.slice(i + 1).map((b) => ({ src: a, dst: b }))),
    ]);
    await operationQueueOf(graph).waitForCompletion();
}

/**
 * Where each node is now, from the shared array.
 * @param graph - The graph.
 * @returns Each placed node's x, y and z, by id.
 */
function positionsOf(graph: Graph): Map<string, [number, number, number]> {
    const session = graph.getSession();
    const { ids } = session.data.snapshot();
    const out = new Map<string, [number, number, number]>();
    const at = { x: 0, y: 0, z: 0 };
    for (let row = 0; row < ids.size; row++) {
        if (session.positions.isPlaced(row)) {
            session.positions.read(row, at);
            out.set(String(ids.idOf(row)), [at.x, at.y, at.z]);
        }
    }

    return out;
}

/**
 * The smallest gap, in degrees, between the angles of some nodes about their centre.
 * @param at - Every node's position.
 * @param ids - The nodes.
 * @returns The gap: 360 / n for n nodes on a circle of their own.
 */
function smallestGap(at: Map<string, [number, number, number]>, ids: readonly string[]): number {
    const points = ids.map((id) => at.get(id) ?? [Number.NaN, Number.NaN, Number.NaN]);
    const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
    const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
    const angles = points.map(([x, y]) => (Math.atan2(y - cy, x - cx) * 180) / Math.PI).sort((a, b) => a - b);
    return Math.min(
        ...angles.map((angle, i) => (i === 0 ? angle + 360 - angles[angles.length - 1] : angle - angles[i - 1])),
    );
}

/**
 * Show only some nodes, and wait for what that set off.
 * @param graph - The graph.
 * @param ids - The nodes to show, or null for no filter.
 */
async function show(graph: Graph, ids: readonly string[] | null): Promise<void> {
    await graph.getSession().visibility.set(ids === null ? null : { kind: "member", of: { nodes: ids } });
    await graph.waitForSettled();
}

describe("a one-pass layout over the working graph", () => {
    let graph: Graph;
    let container: HTMLDivElement;
    let layoutsRun: number;

    beforeEach(async () => {
        ({ graph, container } = await emptyGraph(true));
        await addPath(graph);
        layoutsRun = 0;
        graph.addListener("layout-changed", () => {
            layoutsRun++;
        });
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("lays the shown nodes out again on a circle of their own when the filter changes, hidden nodes unmoved", async () => {
        await graph.setLayout("circular", { dim: 2 });
        await graph.waitForSettled();
        const before = positionsOf(graph);
        layoutsRun = 0;

        await show(graph, FIVE);
        const after = positionsOf(graph);
        assert.strictEqual(layoutsRun, 1, "the filter change lays the graph out once");
        assert.closeTo(smallestGap(after, FIVE), 72, 0.5, "five shown nodes: a pentagon, not 18 degrees apart");
        for (const id of IDS.slice(5)) {
            assert.deepEqual(after.get(id), before.get(id), `hidden ${id} stayed where it was`);
        }

        await show(graph, FIVE);
        assert.strictEqual(layoutsRun, 1, "the same nodes shown again lay out nothing");

        await show(graph, null);
        assert.strictEqual(layoutsRun, 2, "clearing the filter lays out once more");
        assert.closeTo(smallestGap(positionsOf(graph), IDS), 18, 0.5, "all twenty on the circle again");
    });

    it("keeps the shown nodes where they are when a node the filter shows is added, as with no filter", async () => {
        await graph.setLayout("circular", { dim: 2 });
        // The filter names a node that is not there yet, so it is shown as soon as it is added.
        await graph.getSession().visibility.set({ kind: "member", of: { nodes: [...FIVE, "late"] } });
        await graph.waitForSettled();
        const before = positionsOf(graph);
        assert.closeTo(smallestGap(before, FIVE), 72, 0.5, "five shown nodes on a circle of their own");

        await graph.addNodes([{ id: "late" }]);
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForSettled();
        const after = positionsOf(graph);
        assert.isTrue(graph.getSession().visibility.isVisible("late"), "the filter shows the newcomer");
        assert.isTrue(after.has("late"), "the newcomer is placed");
        for (const id of IDS) {
            assert.deepEqual(after.get(id), before.get(id), `${id} stayed where it was`);
        }
    });

    it("gives a later layout only the shown nodes", async () => {
        await show(graph, FIVE);
        const hidden = positionsOf(graph);
        await graph.setLayout("grid");
        await graph.setLayout("circular", { dim: 2 });
        await graph.waitForSettled();
        const after = positionsOf(graph);
        assert.closeTo(smallestGap(after, FIVE), 72, 0.5);
        for (const id of IDS.slice(5)) {
            assert.deepEqual(after.get(id), hidden.get(id), `hidden ${id} stayed where it was`);
        }
    });

    it("has Graphviz rank the shown nodes alone, hidden nodes unmoved", async () => {
        await show(graph, FIVE);
        const before = positionsOf(graph);
        await graph.setLayout("graphviz-dot", { rankdir: "LR" });
        await graph.waitForStableFrame();
        const after = positionsOf(graph);
        const xs = FIVE.map((id) => after.get(id)?.[0] ?? Number.NaN);
        const ys = new Set(FIVE.map((id) => after.get(id)?.[1]));
        assert.strictEqual(ys.size, 1, "one row");
        assert.deepEqual(
            xs,
            [...xs].sort((a, b) => a - b),
            "in rank order",
        );
        for (const id of IDS.slice(5)) {
            assert.deepEqual(after.get(id), before.get(id), `hidden ${id} stayed where it was`);
        }
    });

    it("hands a snapshot layout the shown nodes and edges, and maps its answer back", async () => {
        const seen: { nodes: number; edges: number }[] = [];
        const descriptor: AuthoredLayoutDescriptor = {
            id: "test-working-snapshot",
            plainName: "Working snapshot",
            technicalName: "Working snapshot",
            description: "Records what it is handed and puts each node on a line by row.",
            family: "geometric",
            kind: "batch",
            maxDimensions: 2,
            sizeRating: "any",
            structuralInputs: [],
            engine: "test-working-snapshot",
            options: [],
        };
        registerSnapshotLayout({
            descriptor,
            compute: (input: SnapshotLayoutInput) => {
                seen.push({ nodes: input.graph.nodeCount, edges: input.graph.edgeCount });
                const out = new Float32Array(input.dimensions * input.graph.nodeCount);
                for (let row = 0; row < input.graph.nodeCount; row++) {
                    out[input.dimensions * row] = 10 * row;
                }
                return out;
            },
        });
        await show(graph, FIVE);
        await graph.setLayout("test-working-snapshot");
        await graph.waitForSettled();
        assert.deepEqual(seen.at(-1), { nodes: 5, edges: 4 }, "five shown nodes and the four edges between them");
        const xs = FIVE.map((id) => positionsOf(graph).get(id)?.[0] ?? Number.NaN);
        const spread = Math.max(...xs) - Math.min(...xs);
        assert.isAbove(spread, 0, "every shown node got a slot of its own");
    });

    it("hands a snapshot layout only the shown edges when a filter hides edges and no node", async () => {
        const seen: { nodes: number; edges: number }[] = [];
        registerSnapshotLayout({
            descriptor: {
                id: "test-working-edges",
                plainName: "Working edges",
                technicalName: "Working edges",
                description: "Records what it is handed and puts each node on a line by row.",
                family: "geometric",
                kind: "batch",
                maxDimensions: 2,
                sizeRating: "any",
                structuralInputs: [],
                engine: "test-working-edges",
                options: [],
            },
            compute: (input: SnapshotLayoutInput) => {
                seen.push({ nodes: input.graph.nodeCount, edges: input.graph.edgeCount });
                const out = new Float32Array(input.dimensions * input.graph.nodeCount);
                for (let row = 0; row < input.graph.nodeCount; row++) {
                    out[input.dimensions * row] = 10 * row;
                }
                return out;
            },
        });
        const { graph: weighted, container: box } = await emptyGraph(true);
        try {
            await weighted.addNodes(FIVE.map((id) => ({ id })));
            // The path's middle edge is weak; the filter hides it and keeps every node.
            await weighted.addEdges(
                FIVE.slice(1).map((id, index) => ({ src: FIVE[index], dst: id, w: index === 1 ? 1 : 5 })),
            );
            await operationQueueOf(weighted).waitForCompletion();
            await weighted.getSession().visibility.set({ kind: "threshold", path: "data.w", above: 2 });
            await weighted.setLayout("test-working-edges");
            await weighted.waitForSettled();
            assert.strictEqual(weighted.getSession().visibility.summary.visibleNodes, 5, "every node is shown");
            assert.deepEqual(seen.at(-1), { nodes: 5, edges: 3 }, "five nodes and the three edges shown");
        } finally {
            weighted.dispose();
            box.remove();
        }
    });
});

describe("the working graph option off", () => {
    it("lays out the whole graph and does not follow a filter change", async () => {
        const { graph, container } = await emptyGraph(false);
        try {
            await addPath(graph);
            await graph.setLayout("circular", { dim: 2 });
            let layoutsRun = 0;
            graph.addListener("layout-changed", () => {
                layoutsRun++;
            });
            await show(graph, FIVE);
            assert.strictEqual(layoutsRun, 0);
            await graph.setLayout("circular", { dim: 2, scale: 1.5 });
            await graph.waitForSettled();
            assert.closeTo(smallestGap(positionsOf(graph), FIVE), 18, 0.5, "five slots of the circle of twenty");
        } finally {
            graph.dispose();
            container.remove();
        }
    });
});

/**
 * Lay a fresh graph out with a force layout -- the path alone, or the path with a hidden clique
 * beside it -- and read where the path's nodes are once it settles.
 * @param layout - The force layout.
 * @param hideClique - Whether to add the clique and hide it.
 * @returns The path's positions, in its order.
 */
async function shownPath(layout: string, hideClique: boolean): Promise<number[][]> {
    const { graph, container } = await emptyGraph(true);
    try {
        await addPath(graph, hideClique);
        if (hideClique) {
            await graph.getSession().visibility.set({ kind: "member", of: { nodes: IDS } });
        }

        await graph.setLayout(layout, { seed: 3 });
        await graph.waitForStableFrame();
        const at = positionsOf(graph);
        return IDS.map((id) => at.get(id) ?? [Number.NaN, Number.NaN, Number.NaN]);
    } finally {
        graph.dispose();
        container.remove();
    }
}

describe("a force layout over the working graph", () => {
    for (const layout of ["ngraph", "d3", "forceatlas2", "spring"]) {
        it(`${layout}: a hidden component takes no part, so the shown path settles as if it were alone`, async () => {
            const alone = await shownPath(layout, false);
            const beside = await shownPath(layout, true);
            for (let i = 0; i < IDS.length; i++) {
                for (let axis = 0; axis < 3; axis++) {
                    assert.closeTo(beside[i][axis], alone[i][axis], 1e-3, `${IDS[i]} axis ${String(axis)}`);
                }
            }
        });
    }

    it("answers where a hidden node is, from where it was, though the engine never held it", async () => {
        const { graph, container } = await emptyGraph(true);
        try {
            await addPath(graph);
            await graph.setLayout("ngraph", { seed: 3 });
            await graph.waitForStableFrame();
            const before = positionsOf(graph);
            await show(graph, FIVE);
            const hidden = graph.getDataManager().getNode("n10");
            assert.isDefined(hidden);
            if (hidden === undefined) {
                return;
            }
            assert.deepEqual(graph.getLayoutManager().getNodePosition(hidden), before.get("n10"));
        } finally {
            graph.dispose();
            container.remove();
        }
    });

    it("leaves a hidden node where it was while a simulation lays out the rest", async () => {
        const { graph, container } = await emptyGraph(true);
        try {
            await addPath(graph);
            await graph.setLayout("forceatlas2", { seed: 3 });
            await graph.waitForStableFrame();
            const before = positionsOf(graph);
            await show(graph, IDS.slice(0, 10));
            await graph.waitForStableFrame();
            const after = positionsOf(graph);
            for (const id of IDS.slice(10)) {
                assert.deepEqual(after.get(id), before.get(id), `hidden ${id} stayed where it was`);
            }
            assert.isTrue(
                IDS.slice(0, 10).some((id) => JSON.stringify(after.get(id)) !== JSON.stringify(before.get(id))),
                "the shown half was laid out again",
            );
        } finally {
            graph.dispose();
            container.remove();
        }
    });
});

/** A third party's incremental engine, which records what it was handed. */
class RecordingLayout extends LayoutEngine {
    static override type = "test-working-recording";
    static override maxDimensions = 3;
    static override descriptor: AuthoredLayoutDescriptor = {
        id: "test-working-recording",
        plainName: "Recording",
        technicalName: "Recording",
        description: "Holds what it is handed and places nothing.",
        family: "special",
        kind: "batch",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: "test-working-recording",
        options: [],
    };

    readonly held = new Set<Node>();
    readonly heldEdges = new Set<Edge>();

    async init(): Promise<void> {
        // Nothing to set up.
    }
    addNode(n: Node): void {
        this.held.add(n);
    }
    addEdge(e: Edge): void {
        this.heldEdges.add(e);
    }
    protected override removeNode(n: Node): void {
        this.held.delete(n);
    }
    protected override removeEdge(e: Edge): void {
        this.heldEdges.delete(e);
    }
    getNodePosition(): Position {
        return { x: 0, y: 0, z: 0 };
    }
    setNodePosition(): void {
        // Places nothing.
    }
    getEdgePosition(): { src: Position; dst: Position } {
        return { src: { x: 0, y: 0, z: 0 }, dst: { x: 0, y: 0, z: 0 } };
    }
    step(): void {
        // Static.
    }
    pin(): void {
        // The array holds pins.
    }
    unpin(): void {
        // The array holds pins.
    }
    get nodes(): Iterable<Node> {
        return this.held;
    }
    get edges(): Iterable<Edge> {
        return this.heldEdges;
    }
    get isSettled(): boolean {
        return true;
    }
}

LayoutEngine.register(RecordingLayout);

describe("a third party's engine over the working graph", () => {
    it("is handed only the shown nodes and edges, and not a node added later that the filter hides", async () => {
        const { graph, container } = await emptyGraph(true);
        try {
            await addPath(graph);
            await show(graph, FIVE);
            await graph.setLayout("test-working-recording");
            await graph.waitForSettled();
            const engine = graph.getLayoutManager().layoutEngine as RecordingLayout;
            assert.deepEqual([...engine.held].map((node) => node.id).sort(), [...FIVE].sort());
            assert.strictEqual(engine.heldEdges.size, 4);

            await graph.addNodes([{ id: "late" }]);
            await graph.waitForSettled();
            assert.isFalse(
                [...engine.held].some((node) => node.id === "late"),
                "the hidden newcomer never reached it",
            );
        } finally {
            graph.dispose();
            container.remove();
        }
    });
});

describe("the time window and the working graph", () => {
    beforeEach(() => {
        setDefaultFeatures(["timeline"]);
    });
    afterEach(() => {
        setDefaultFeatures([]);
    });

    it("lays out what the window shows, ghosts taking no part and keeping their places", async () => {
        const { graph, container } = await emptyGraph(true);
        try {
            const session = graph.getSession() as ElementSession;
            await graph.addNodes(IDS.map((id, index) => ({ id, step: index })));
            await graph.addEdges(IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })));
            await operationQueueOf(graph).waitForCompletion();
            await graph.setLayout("circular", { dim: 2 });
            await graph.waitForSettled();
            const before = positionsOf(graph);
            await session.time.setField({ nodes: { start: "step" } });
            await session.time.setSettings({ outside: "ghost" });
            await session.time.window({ from: 0, to: 5 });
            await graph.waitForSettled();
            // Asked for, but not drawn: the working graph draws nothing outside the view.
            assert.isFalse(session.visibility.ghosting, "the nodes outside the window are not drawn");
            const after = positionsOf(graph);
            assert.closeTo(smallestGap(after, FIVE), 72, 0.5, "the five in the window on a circle of their own");
            for (const id of IDS.slice(5)) {
                assert.deepEqual(after.get(id), before.get(id), `ghost ${id} stayed where it was`);
            }
        } finally {
            graph.dispose();
            container.remove();
        }
    });
});
