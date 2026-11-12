/**
 * A step of the time window reaching the renderer by its changed rows: a real session moves the
 * masks, a real UpdateManager follows them, and stand-ins for `Node` and `Edge` count what the pass
 * asks of them. The real objects are drawn in test/browser/time-changed-rows.test.ts.
 */
import type { Scene as BabylonScene } from "@babylonjs/core";
import { assert, beforeAll, describe, it, vi } from "vitest";

import { createGraphSession } from "../../session";
import { setDefaultFeatures } from "../../src/features/resolve";
import type { DataManager } from "../../src/managers/DataManager";
import type { GraphContext } from "../../src/managers/GraphContext";
import type { LayoutManager } from "../../src/managers/LayoutManager";
import type { StatsManager } from "../../src/managers/StatsManager";
import { UpdateManager, type ViewMasks } from "../../src/managers/UpdateManager";
import { batchUploadFrames } from "../../src/meshes/FrameRoster";
import type { NodeRenderState } from "../../src/Node";
import { edgeSpaceOf } from "../../src/session/scope/ScopeApi";
import type { ElementSession } from "../../src/session/types";

const NODES = 2_000;
const EDGES = 10_000;

/** The rows the pass wrote, in the order it wrote them. */
const written: number[] = [];

/** A node as the pass sees it. */
class CountingNode {
    state: NodeRenderState = "visible";
    selected = false;
    stateWrites = 0;
    readonly drawnPosition = { x: 0, y: 0, z: 0 };

    constructor(readonly index: number) {}

    update(): void {
        // Nothing is drawn here.
    }

    setRenderState(next: NodeRenderState): boolean {
        this.stateWrites += 1;
        written.push(this.index);
        const changed = this.state !== next;
        this.state = next;
        return changed;
    }

    setSelected(next: boolean): boolean {
        const changed = this.selected !== next;
        this.selected = next;
        return changed;
    }

    /** Drawn from a shared batch with no label or overlay: no mesh of its own to toggle. */
    togglesOwnMeshes(): boolean {
        return false;
    }
}

/** An edge as the pass sees it. */
class CountingEdge {
    visible = true;
    selected = false;
    visibleWrites = 0;
    updates = 0;
    /** What a revealed edge's first update draws from: it was not placed while it was hidden. */
    placed = true;
    /** Whether it is drawn through a support point. */
    bowed = false;

    constructor(readonly index: number) {}

    setRenderVisible(next: boolean): boolean {
        this.visibleWrites += 1;
        const changed = this.visible !== next;
        this.visible = next;
        this.placed &&= !(changed && next);
        return changed;
    }

    setSelected(next: boolean): boolean {
        const changed = this.selected !== next;
        this.selected = next;
        return changed;
    }

    supportEdge(): object | null {
        return this.bowed && this.visible ? {} : null;
    }

    /** Drawn from shared batches, as the edges a time window moves are: no mesh of its own to toggle. */
    togglesOwnMeshes(): boolean {
        return false;
    }

    update(): void {
        this.updates += 1;
        this.placed = true;
    }
}

/** The renderer over a session, and what it counts. */
interface Scene {
    readonly session: ElementSession;
    readonly manager: UpdateManager;
    readonly nodes: readonly CountingNode[];
    readonly edges: readonly CountingEdge[];
    /** The Babylon scene the manager is on now. */
    babylon(): BabylonScene;
    /** Move the manager to a new Babylon scene, as opening the WebGPU engine does. */
    replaceBabylon(): void;
    /** Run the part of a frame that follows the masks, and return the work it did. */
    frame(): { nodeWrites: number; edgeWrites: number; updates: number };
    assertDrawnAsMasks(when: string): void;
}

/**
 * A graph of edges timed 0 to `EDGES - 1`, with a renderer following its masks.
 * @param overrides - Replaces what the renderer binds.
 * @returns The scene.
 */
async function sceneOf(overrides: Partial<ViewMasks> = {}): Promise<Scene> {
    const session = createGraphSession() as ElementSession;
    const data = {
        directed: true,
        nodes: Array.from({ length: NODES }, (_, at) => ({ id: `n${String(at)}` })),
        edges: Array.from({ length: EDGES }, (_, at) => ({
            source: `n${String(at % NODES)}`,
            target: `n${String((at * 7 + 1 + Math.floor(at / NODES)) % NODES)}`,
            t: at,
        })),
    };
    await session.data.import({ type: "json", config: { data: JSON.stringify(data) } });
    await session.time.setField({ edges: { start: "t" } });

    const graph = session.data.snapshot();
    const nodes = Array.from({ length: graph.nodeCount }, (_, at) => new CountingNode(at));
    const edges = Array.from({ length: graph.edgeCount }, (_, at) => new CountingEdge(at));
    const dataManager = {
        nodes: new Map(nodes.map((node) => [graph.ids.idOf(node.index), node])),
        // Every node is built here, as under renderPath "objects"; the mask walk reads the built ones.
        nodeMap: { built: () => nodes.values() },
        lateNodeVersions: 0,
        edges: new Map(edges.map((edge) => [edge.index, edge])),
        // Every edge is built too; the mask walk reads the built ones.
        edgeMap: { builtView: () => new Map(edges.map((edge) => [edge.index, edge])) },
        nodesByIndex: nodes,
        edgesByIndex: edges,
        nodeVersion: 0,
        edgeVersion: 0,
        drawHeld: false,
        supportPoints: {
            update: () => false,
            hasEdges: false,
            pointOf: (edge: CountingEdge) => (edge.bowed ? {} : null),
        },
    } as unknown as DataManager;
    const observable = { add: () => null, remove: () => true };
    const newBabylon = (): BabylonScene =>
        ({
            onAfterRenderObservable: observable,
            onBeforeDrawPhaseObservable: observable,
            onNewMeshAddedObservable: observable,
            onMeshRemovedObservable: observable,
            getEngine: () => ({ onResizeObservable: observable }),
        }) as unknown as BabylonScene;
    let babylon = newBabylon();
    const monitor = { beginMonitoring: () => undefined, endMonitoring: () => undefined };
    const manager = new UpdateManager(
        null as never,
        { edgeUpdate: monitor, nodeUpdate: monitor } as unknown as StatsManager,
        { nodes, edges, placeGroups: () => undefined } as unknown as LayoutManager,
        dataManager,
        null as never,
        { getScene: () => babylon } as unknown as GraphContext,
    );
    manager.bindViewMasks({
        selection: { nodes: () => session.selection.nodeMembers(), edges: () => session.selection.edgeMembers() },
        visibility: session.visibility.drawnMasks,
        showContext: () => session.visibility.showContext,
        ghost: () => session.visibility.ghosting,
        timeline: () => true,
        ...overrides,
    });

    const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);
    const frame: Scene["frame"] = () => {
        const before = {
            nodeWrites: sum(nodes.map((node) => node.stateWrites)),
            edgeWrites: sum(edges.map((edge) => edge.visibleWrites)),
            updates: sum(edges.map((edge) => edge.updates)),
        };
        manager.syncViewMasks();
        manager.redrawArrangement();
        return {
            nodeWrites: sum(nodes.map((node) => node.stateWrites)) - before.nodeWrites,
            edgeWrites: sum(edges.map((edge) => edge.visibleWrites)) - before.edgeWrites,
            updates: sum(edges.map((edge) => edge.updates)) - before.updates,
        };
    };

    return {
        session,
        manager,
        nodes,
        edges,
        babylon: () => babylon,
        replaceBabylon() {
            babylon = newBabylon();
            manager.rebindScene(null as never);
        },
        frame,
        assertDrawnAsMasks(when) {
            const hidden = session.visibility.showContext ? "context" : "hidden";
            const nodeMask = session.visibility.drawnMasks.nodes();
            const edgeMask = session.visibility.drawnMasks.edges();
            for (const node of nodes) {
                assert.strictEqual(node.state, nodeMask.has(node.index) ? "visible" : hidden, `${when}: node`);
            }

            for (const edge of edges) {
                assert.strictEqual(edge.visible, edgeMask.has(edge.index), `${when}: edge ${String(edge.index)}`);
                assert.isTrue(!edge.visible || edge.placed, `${when}: edge ${String(edge.index)} was placed`);
            }
        },
    };
}

/**
 * Start a slide at the window's place plus ten, and draw it. A slide starts with a full pass; the
 * moves after it step by rows.
 * @param scene - The scene.
 */
async function settle(scene: Scene): Promise<void> {
    scene.frame();
    await scene.session.time.seek(10, { commit: false });
    scene.frame();
    scene.frame();
}

/**
 * A scene with a window in force, its first full pass drawn, the first slide's too, and the frame
 * after those, which walks once more because the one before it walked.
 * @param nodes - How the window treats nodes: with `"ends"` the window is narrow, so nodes move.
 * @param overrides - Replaces what the renderer binds.
 * @returns The scene.
 */
async function sliding(nodes: "all" | "ends" = "all", overrides: Partial<ViewMasks> = {}): Promise<Scene> {
    const scene = await sceneOf(overrides);
    await scene.session.time.window({ from: 0, to: nodes === "ends" ? 200 : 2_000, step: 100, nodes });
    await settle(scene);
    return scene;
}

/**
 * Seeded random numbers from 0 up to 1.
 * @param seed - The seed.
 * @returns The generator.
 */
function random(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
        return state / 4_294_967_296;
    };
}

describe("changed rows reach the renderer", () => {
    beforeAll(() => {
        setDefaultFeatures(["timeline"]);
    });

    it("writes and places only the rows a step changed, with no walk", async () => {
        const scene = await sliding();
        const step = await scene.session.time.seek(30, { commit: false });
        const changed = step.entered.edges + step.left.edges;
        assert.strictEqual(changed, 40, "twenty edges in, twenty out");

        const work = scene.frame();
        assert.strictEqual(work.edgeWrites, changed);
        assert.strictEqual(work.updates, step.entered.edges);
        assert.strictEqual(work.nodeWrites, 0, "no node left the window");
        scene.assertDrawnAsMasks("after a step");
    });

    it("does the same for nodes that come and go with their edges", async () => {
        const scene = await sliding("ends");
        const step = await scene.session.time.seek(50, { commit: false });
        const work = scene.frame();
        assert.isAbove(step.entered.nodes + step.left.nodes, 0);
        assert.strictEqual(work.nodeWrites, step.entered.nodes + step.left.nodes);
        assert.strictEqual(work.edgeWrites, step.entered.edges + step.left.edges);
        assert.strictEqual(work.updates, step.entered.edges);
        scene.assertDrawnAsMasks("after a step");
    });

    it("takes a jump under the cap by its rows", async () => {
        const scene = await sliding();
        // Far enough that the window leaves itself, and few enough rows for the mask to keep.
        await scene.session.time.window({ from: 0, to: 300, step: 100 });
        await settle(scene);
        const step = await scene.session.time.seek(4_000, { commit: false });
        const work = scene.frame();
        assert.strictEqual(step.entered.edges + step.left.edges, 600);
        assert.strictEqual(work.edgeWrites, 600);
        assert.strictEqual(work.updates, step.entered.edges);
        scene.assertDrawnAsMasks("after a jump");
    });

    it("writes a move's rows in row order, not in the order they crossed the window", async () => {
        // Nodes cross a window in the order of their edges' times, which is not their row order.
        const scene = await sliding("ends");
        await scene.session.time.seek(900, { commit: false });
        written.length = 0;
        scene.frame();
        assert.isAbove(written.length, 1);
        for (let at = 1; at < written.length; at++) {
            assert.isAtLeast(written[at], written[at - 1], `write ${String(at)}`);
        }

        scene.assertDrawnAsMasks("after a jump");
    });

    it("walks after a move too big for the mask to keep", async () => {
        const scene = await sliding();
        await scene.session.time.seek(5_000, { commit: false });
        const work = scene.frame();
        assert.strictEqual(work.edgeWrites, EDGES, "4,000 rows are past the cap of 1,500");
        assert.strictEqual(work.updates, EDGES);
        scene.assertDrawnAsMasks("after a big jump");
    });

    it("brings several slides between two frames to the renderer", async () => {
        const scene = await sliding();
        const next = random(7);
        for (let frame = 0; frame < 30; frame++) {
            let from = 10 + frame * 200 + Math.floor(next() * 50);
            for (let slide = 0; slide < 3; slide++) {
                from += Math.floor(next() * 40);
                await scene.session.time.seek(from, { commit: false });
            }

            const work = scene.frame();
            assert.isBelow(work.edgeWrites, EDGES, `frame ${String(frame)} follows the rows`);
            scene.assertDrawnAsMasks(`frame ${String(frame)}`);
        }
    });

    it("goes back to a walk when a filter changes mid-play, then to rows", async () => {
        const scene = await sliding();
        await scene.session.visibility.set({ kind: "range", attribute: "t", min: 500 });
        assert.strictEqual(scene.frame().edgeWrites, EDGES);
        scene.assertDrawnAsMasks("after the filter");

        await scene.session.time.seek(600, { commit: false });
        scene.frame();
        scene.assertDrawnAsMasks("first slide under the filter");
        const step = await scene.session.time.seek(620, { commit: false });
        assert.strictEqual(scene.frame().edgeWrites, step.entered.edges + step.left.edges);
        scene.assertDrawnAsMasks("a step under the filter");
    });

    for (const nodes of ["all", "ends"] as const) {
        it(`shows a selection made during a step in that pass, with nodes: ${nodes}`, async () => {
            const scene = await sliding(nodes);
            const step = await scene.session.time.seek(nodes === "all" ? 30 : 50, { commit: false });
            const graph = scene.session.data.snapshot();
            await scene.session.selection.apply({ nodes: ["n5"], edges: [edgeSpaceOf(graph).idOf(100)] });
            const work = scene.frame();

            assert.strictEqual(work.edgeWrites, step.entered.edges + step.left.edges);
            assert.strictEqual(work.nodeWrites, step.entered.nodes + step.left.nodes);
            assert.strictEqual(nodes === "ends", work.nodeWrites > 0, "whether node rows moved too");
            assert.isTrue(scene.nodes[graph.ids.requireIndex("n5")].selected);
            assert.isTrue(scene.edges[100].selected);
        });
    }

    it("walks every edge for a revealed edge with a support point", async () => {
        const scene = await sliding();
        const walk = vi.spyOn(scene.manager, "forceEdgeWalk");
        // The window is at 10 to 2,010, so a move of 20 brings in the edges 2,010 to 2,029.
        scene.edges[2_015].bowed = true;
        await scene.session.time.seek(30, { commit: false });
        const work = scene.frame();

        assert.strictEqual(walk.mock.calls.length, 1);
        assert.strictEqual(work.edgeWrites, 40, "the writes still follow the rows");
        assert.strictEqual(work.updates, EDGES);
        scene.assertDrawnAsMasks("after a bowed reveal");
    });

    it("walks every edge for a hidden edge the support points still hold", async () => {
        const scene = await sliding();
        const walk = vi.spyOn(scene.manager, "forceEdgeWalk");
        // The window is at 10 to 2,010, so a move of 20 takes out the edges 10 to 29.
        scene.edges[15].bowed = true;
        await scene.session.time.seek(30, { commit: false });
        const work = scene.frame();

        assert.strictEqual(walk.mock.calls.length, 1);
        assert.strictEqual(work.edgeWrites, 40, "the writes still follow the rows");
        assert.strictEqual(work.updates, EDGES);
    });

    it("does not walk for a hidden or revealed edge with no support point", async () => {
        const scene = await sliding();
        const walk = vi.spyOn(scene.manager, "forceEdgeWalk");
        scene.edges[100].bowed = true;
        const step = await scene.session.time.seek(30, { commit: false });
        const work = scene.frame();

        assert.strictEqual(walk.mock.calls.length, 0);
        assert.strictEqual(work.updates, step.entered.edges);
    });

    it("shows a switch of showContext during a step in that pass", async () => {
        const scene = await sliding("ends");
        await scene.session.time.seek(300, { commit: false });
        scene.session.visibility.showContext = true;
        assert.strictEqual(scene.frame().nodeWrites, scene.nodes.length, "a full walk");
        scene.assertDrawnAsMasks("context on");
    });

    it("writes everything on the pass after invalidateViewMasks", async () => {
        const scene = await sliding();
        await scene.session.time.seek(30, { commit: false });
        scene.manager.invalidateViewMasks();
        const work = scene.frame();
        assert.strictEqual(work.edgeWrites, EDGES);
        assert.strictEqual(work.nodeWrites, scene.nodes.length);
    });

    it("keeps the walk with the experiment off, whatever the masks can answer", async () => {
        const scene = await sliding("ends", { timeline: () => false });
        const step = await scene.session.time.seek(50, { commit: false });
        assert.isAbove(step.entered.nodes, 0);
        const work = scene.frame();
        assert.strictEqual(work.edgeWrites, EDGES);
        assert.strictEqual(work.nodeWrites, scene.nodes.length);
        assert.strictEqual(work.updates, EDGES, "a revealed edge still forces the walk");
    });
});

describe("the ranged upload switch", () => {
    beforeAll(() => {
        setDefaultFeatures(["timeline"]);
    });

    it("stays off with the experiment off, even with a window in force", async () => {
        const scene = await sceneOf({ timeline: () => false, timeWindow: () => true });
        scene.manager.syncViewMasks();
        assert.isFalse(batchUploadFrames.rangedUploads(scene.babylon()).on);
    });

    it("turns on with the experiment on and a window in force", async () => {
        const scene = await sceneOf({ timeline: () => true, timeWindow: () => true });
        scene.manager.syncViewMasks();
        assert.isTrue(batchUploadFrames.rangedUploads(scene.babylon()).on);
    });

    it("turns on in the new scene when the engine changes with a window in force", async () => {
        const scene = await sceneOf({ timeline: () => true, timeWindow: () => true });
        scene.manager.syncViewMasks();

        scene.replaceBabylon();
        assert.isFalse(batchUploadFrames.rangedUploads(scene.babylon()).on, "a new scene starts off");
        scene.manager.syncViewMasks();
        assert.isTrue(batchUploadFrames.rangedUploads(scene.babylon()).on);
    });
});
