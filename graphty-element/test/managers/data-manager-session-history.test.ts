/**
 * @file The element's data manager bound to a real session, with no renderer: what it draws after
 * each data door, and after undo and redo move the graph back and forth. A drawn graph wires the
 * two the same way (`Graph` binds the manager to its session's dispatcher and hands each pass's
 * `graph` slice to `DataManager.reconcile`); the element itself needs a document, which this
 * project has not got, so the wiring is done here over a NullEngine scene and nothing else.
 */

import { NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { ElementsRemovedEvent } from "../../src/events";
import { SimpleLayoutEngine } from "../../src/layout/LayoutEngine";
import { DataManager, laneStoreOf } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext } from "../../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import { MeshCache } from "../../src/meshes/MeshCache";
import { createElementSession, dispatcherOf } from "../../src/session/GraphSession";
import type { ElementSession } from "../../src/session/types";
import { Styles } from "../../src/Styles";

/** A layout engine that holds its nodes and edges and never moves anything. */
class StillLayout extends SimpleLayoutEngine {
    static override type = "still-session-history";

    override positions: Record<string | number, number[]> = {};

    /** Mark the (absent) positions as fresh. */
    doLayout(): void {
        this.stale = false;
    }
}

interface Harness {
    readonly session: ElementSession;
    readonly dataManager: DataManager;
    readonly eventManager: EventManager;
    /** How many nodes and edges the passes built and tore down, from `reconcile`'s answers. */
    readonly passes: { added: number; removed: number }[];
    /** What `sliceProblems` found after each pass: the drawn maps keyed unlike the slice. */
    readonly problems: string[];
}

const teardown: (() => void)[] = [];

afterEach(() => {
    for (const dispose of teardown.splice(0)) {
        dispose();
    }
});

/**
 * A data manager over a NullEngine scene, bound to an element session as a drawn graph binds it.
 * @returns The harness.
 */
function harness(): Harness {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const styles = Styles.default();
    const eventManager = new EventManager();
    const dataManager = new DataManager(eventManager, styles);
    const layoutManager = new LayoutManager(eventManager, dataManager, styles);
    layoutManagerInternals.setEngine(layoutManager, new StillLayout());
    const context = new DefaultGraphContext(
        () => styles,
        dataManager,
        layoutManager,
        new MeshCache(),
        scene,
        new StatsManager(eventManager),
        {},
    );
    dataManager.setGraphContext(context);
    const session = createElementSession({ store: laneStoreOf(dataManager) });
    const dispatcher = dispatcherOf(session);
    dataManager.bindSession(dispatcher, {
        rowsAdded: () => undefined,
        loading: () => undefined,
        removing: () => undefined,
    });
    const passes: { added: number; removed: number }[] = [];
    const problems: string[] = [];
    const { lane } = dispatcher;
    lane.register("graph", (_rendered, target, dirty) => {
        passes.push(dataManager.reconcile(target.graph, dirty, lane.cause));
        problems.push(...dataManager.sliceProblems(target.graph));
        return Promise.resolve();
    });
    teardown.push(() => {
        assert.deepStrictEqual(problems, [], "every pass drew exactly what its slice holds");
        session.dispose();
        layoutManager.dispose();
        dataManager.dispose();
        scene.dispose();
        engine.dispose();
    });
    return { session, dataManager, eventManager, passes, problems };
}

/**
 * The drawn node ids, sorted.
 * @param dataManager - The manager.
 * @returns The ids.
 */
function drawnNodes(dataManager: DataManager): string[] {
    return [...dataManager.nodes.keys()].map(String).sort();
}

/**
 * The drawn edges as `source>target`, sorted.
 * @param dataManager - The manager.
 * @returns The pairs.
 */
function drawnEdges(dataManager: DataManager): string[] {
    return [...dataManager.edges.values()].map((edge) => `${String(edge.srcId)}>${String(edge.dstId)}`).sort();
}

/**
 * Build a triangle a > b > c > a.
 * @param h - The harness.
 */
async function triangle(h: Harness): Promise<void> {
    await h.session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await h.session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
        { src: "c", dst: "a" },
    ]);
}

describe("a removed node, undone and redone", () => {
    it("tears the node and its edges down, builds them again on undo, and tears them down again on redo", async () => {
        const h = harness();
        await triangle(h);
        const removedEvents: { nodes: number; edges: number; cause: string | undefined }[] = [];
        h.eventManager.addListener("elements-removed", (event) => {
            const e = event as ElementsRemovedEvent;
            removedEvents.push({ nodes: e.nodes.length, edges: e.edges.length, cause: e.cause });
        });

        await h.session.data.removeNodes(["b"]);
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "c"]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["c>a"]);

        const undone = await h.session.undo();
        assert.strictEqual(undone.kind, "undone");
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "b", "c"]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["a>b", "b>c", "c>a"]);
        assert.strictEqual(h.dataManager.getEdgesBetween("a", "b").length, 1);
        assert.strictEqual(h.dataManager.getNode("b")?.id, "b");

        await h.session.redo();
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "c"]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["c>a"]);
        assert.isUndefined(h.dataManager.getNode("b"));
        // The redo's pass tore down the node and both its edges at once.
        assert.deepStrictEqual(removedEvents.at(-1), { nodes: 1, edges: 2, cause: "redo" });
    });
});

describe("an add, undone and redone", () => {
    it("takes added nodes and edges away on undo, and builds them again on redo", async () => {
        const h = harness();
        await h.session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await h.session.data.addEdges([{ src: "a", dst: "b" }]);

        await h.session.undo();
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "b"]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), []);
        assert.deepStrictEqual(h.dataManager.getEdgesBetween("a", "b"), []);

        await h.session.undo();
        assert.deepStrictEqual(drawnNodes(h.dataManager), []);
        assert.deepStrictEqual(h.dataManager.heldCounts(), { nodes: 0, edges: 0 });

        await h.session.redo();
        await h.session.redo();
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "b"]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["a>b"]);
        assert.deepStrictEqual(h.dataManager.heldCounts(), { nodes: 2, edges: 1 });
        const last = h.passes.at(-1);
        assert.deepStrictEqual(last, { added: 1, removed: 0 }, "the last redo built the one edge");
    });
});

describe("a removed edge, undone", () => {
    it("builds the one edge again and leaves its nodes alone", async () => {
        const h = harness();
        await triangle(h);
        const [id] = h.dataManager.getEdgesBetween("b", "c").map((edge) => edge.id);

        await h.session.data.removeEdges([id]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["a>b", "c>a"]);

        await h.session.undo();
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["a>b", "b>c", "c>a"]);
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "b", "c"]);
        assert.deepStrictEqual(h.passes.at(-1), { added: 1, removed: 0 });
    });
});

describe("an updated node, undone", () => {
    it("hands the drawn node its record back, building and tearing down nothing", async () => {
        const h = harness();
        await h.session.data.addNodes([
            { id: "a", size: 1 },
            { id: "b", size: 2 },
        ]);
        const before = h.dataManager.getNode("a");

        await h.session.data.updateNodes([{ id: "a", values: { size: 5 } }]);
        assert.strictEqual(h.dataManager.getNode("a")?.data.size, 5);

        await h.session.undo();
        assert.strictEqual(h.dataManager.getNode("a"), before, "the same node, not a new one");
        assert.strictEqual(h.dataManager.getNode("a")?.data.size, 1);
        assert.deepStrictEqual(h.passes.at(-1), { added: 0, removed: 0 });
    });
});

describe("a cleared graph, undone", () => {
    it("draws nothing after the clear and every node and edge again after the undo", async () => {
        const h = harness();
        await triangle(h);

        await h.session.data.clear();
        assert.deepStrictEqual(drawnNodes(h.dataManager), []);
        assert.deepStrictEqual(drawnEdges(h.dataManager), []);

        await h.session.undo();
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "b", "c"]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["a>b", "b>c", "c>a"]);
    });
});

describe("merged nodes, undone", () => {
    it("moves the merged node's edges onto the kept one, and puts both back on undo", async () => {
        const h = harness();
        await triangle(h);

        await h.session.data.mergeNodes(["a", "b"]);
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "c"]);
        assert.isUndefined(h.dataManager.getNode("b"));

        await h.session.undo();
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "b", "c"]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["a>b", "b>c", "c>a"]);
    });
});

describe("parallel edges after an undo", () => {
    it("draws each of three edges joining two nodes as one bundle, both ways round", async () => {
        const h = harness();
        await h.session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await h.session.data.addEdges([
            { src: "a", dst: "b" },
            { src: "a", dst: "b" },
            { src: "b", dst: "a" },
        ]);
        await h.session.data.removeNodes(["b"]);
        await h.session.undo();

        const forward = h.dataManager.getEdgesBetween("a", "b");
        assert.strictEqual(forward.length, 2, "two run from a to b");
        assert.strictEqual(h.dataManager.getEdgesBetween("b", "a").length, 1, "one runs back");
        const bundles = [...h.dataManager.edges.values()].map((edge) => h.dataManager.drawnBundle(edge));
        assert.deepStrictEqual(
            bundles.map((bundle) => bundle.count),
            [3, 3, 3],
        );
        assert.deepStrictEqual(bundles.map((bundle) => bundle.rank).sort(), [0, 1, 2]);

        // One more edge between them moves every answer, worked out for that pair only.
        await h.session.data.addEdges([{ src: "a", dst: "b" }]);
        const after = [...h.dataManager.edges.values()].map((edge) => h.dataManager.drawnBundle(edge).count);
        assert.deepStrictEqual(after, [4, 4, 4, 4]);
        const pairs = h.dataManager.builtEdgesOfPairs(
            [
                ["a", "b"],
                ["b", "a"],
                ["a", "nowhere"],
            ],
            true,
        );
        assert.isNotNull(pairs);
        assert.deepStrictEqual(
            pairs.map((pair) => pair.edges.length),
            [4, 0],
            "each pair once, whichever way round",
        );
    });
});

describe("an edge whose ends are not drawn yet", () => {
    it("waits for its ends, is forgotten by an undo of its add, and is built by the redo", async () => {
        const h = harness();
        await h.session.data.addEdges([{ src: "x", dst: "y" }]);
        assert.deepStrictEqual(h.dataManager.heldCounts(), { nodes: 2, edges: 1 }, "its ends are held");

        await h.session.undo();
        assert.deepStrictEqual(drawnEdges(h.dataManager), []);
        assert.deepStrictEqual(h.dataManager.heldCounts(), { nodes: 0, edges: 0 });

        await h.session.redo();
        assert.deepStrictEqual(h.dataManager.heldCounts(), { nodes: 2, edges: 1 });
        await h.session.data.addNodes([{ id: "x" }, { id: "y" }]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["x>y"]);
    });
});

describe("an updated edge, undone", () => {
    it("hands the same drawn edge its record back", async () => {
        const h = harness();
        await h.session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await h.session.data.addEdges([{ src: "a", dst: "b", weight: 1 }]);
        const [edge] = h.dataManager.getEdgesBetween("a", "b");

        await h.session.data.updateEdges([{ id: edge.id, values: { weight: 9 } }]);
        assert.strictEqual(h.dataManager.getEdge(edge.id)?.data.weight, 9);

        await h.session.undo();
        assert.strictEqual(h.dataManager.getEdge(edge.id), edge, "the same edge, not a new one");
        assert.strictEqual(edge.data.weight, 1);
        assert.deepStrictEqual(h.passes.at(-1), { added: 0, removed: 0 });
    });
});

describe("an import through the session", () => {
    it("draws the file's rows, announces the load once, and takes them away on undo", async () => {
        const h = harness();
        const loaded: { nodes: number; edges: number }[] = [];
        h.eventManager.addListener("data-loading-complete", (event) => {
            const e = event as unknown as { nodesLoaded: number; edgesLoaded: number };
            loaded.push({ nodes: e.nodesLoaded, edges: e.edgesLoaded });
        });

        await h.session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({ nodes: [{ id: "p" }, { id: "q" }], edges: [{ source: "p", target: "q" }] }),
            },
        });
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["p", "q"]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["p>q"]);
        assert.deepStrictEqual(loaded, [{ nodes: 2, edges: 1 }]);
        assert.strictEqual(h.dataManager.lastImport?.counts.nodes, 2);

        await h.session.undo();
        assert.deepStrictEqual(drawnNodes(h.dataManager), []);
        assert.deepStrictEqual(loaded.length, 1, "an undo announces no load");
    });
});
