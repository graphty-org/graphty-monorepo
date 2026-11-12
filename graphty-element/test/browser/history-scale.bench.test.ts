/**
 * @file What undo costs in time on a real `Graph` at the largest graph it draws, derivation pass
 * and all: the render objects an undo tears down or builds again are the dominant cost, and a
 * headless session has none. See design/undo/undo-design.md sections 7 and 12.6.
 *
 * Runs in the `browser-bench` project, never under coverage, with strict state off. The graph is
 * the element's node ceiling (`DEFAULT_LIMITS.renderCeiling`, 50,000 today) with half as many
 * edges, laid out once by a one-shot layout, with the render loop stopped so nothing but the
 * undo moves, and loaded as the baseline, so `restoreTo(null)` returns to it. A million nodes is
 * past that ceiling and the element refuses to load it (`E_TOO_LARGE`), so there is no
 * million-node run here; what a history retains at a million nodes is checked in Node by
 * `test/session/history/scale.test.ts`.
 *
 * WHAT IS ASSERTED IS COUNTED WORK: the render objects each undo builds and tears down, counted
 * by the scene as meshes are added and removed, and how much of the scene's mesh list each removal
 * has to search. An undo that rebuilt the whole graph instead of the rows it restores, an undo of
 * a drag that rebuilt anything, or a teardown that searched the scene once per mesh (issue #543)
 * fails on any machine however busy it is.
 *
 * THE TIMINGS ARE PRINTED, NOT ASSERTED. Each forward operation is left to finish -- its queue
 * turns and the tasks after them -- before its undo is timed, so an undo is not charged for the
 * work before it, and each printed time sits beside the load of the same graph measured in this
 * page.
 *
 * That includes the garbage the work before it left: the page runs with `--expose-gc` (the
 * "browser-bench" project in vitest.config.ts) and each step is timed from a fully collected heap.
 * Without it, the loaded graph holds about 1.1 GB of heap, and whether V8's next major collection
 * starts, or finishes, inside a timed step depends on how full the heap happened to be, not on
 * the step. On CI (4-vCPU runners, 44 runs from 2026-09-28 to 2026-09-29) that made undoing the
 * removal trimodal -- about 250, 540 or 800 ms against a load of about 3,450 ms -- and put a drag
 * at 65 or 640 ms and restoreTo(null) at 300 or 900 ms, whichever branch ran. The 800 ms mode is a
 * ratio of 0.21 to 0.24 against the load, and on the runners that load in about 2,100 ms it
 * reached 0.26 and failed. On four cores of the development machine the same thing gave 121 to
 * 709 ms (3 failures in 29 runs); from a collected heap, 169 to 215 ms in 10 runs.
 *
 * Measured on the development machine (i9-14900, headless Chromium without WebGPU), 50,000 nodes
 * and 25,000 edges, printed by each test as `[undo-scale-browser]`, which a CI log carries too:
 *
 *   loading the graph, drawn                            1,500 to 2,300 ms
 *   undoing the removal of 1,000 nodes                    110 to 240 ms
 *   undoing a drag, at rest                                40 to 60 ms
 *   undoing a replacing import                          1,400 to 2,300 ms (median of three)
 *   a replacing import, tearing the graph down          1,200 to 2,400 ms
 *   restoreTo(null) over those steps                      210 to 260 ms
 *
 * Tearing the whole graph down -- a replacing import, a clear, or undoing the load -- used to take
 * about 20 s at this size, because every node's dispose searched and spliced the scene's mesh
 * list, its action manager list and its pointer observer list (issue #543). The data manager now
 * drops what it is about to dispose from each list in one pass first, so the teardown costs about
 * what the load does, and the last test holds it to that.
 *
 * That test times the teardown against a load in the same window: three replacing imports that
 * empty the graph, alternating with three that load it again, compared by their medians. Timed
 * against the load in `beforeAll`, the ratio measured how busy the machine was at each of the two
 * moments as much as the teardown: with several pre-push gates running at once (load average 50
 * to 82), it moved from 0.84 to 1.86 on code that did not change (issue #1277). The 20 s teardown
 * of #543 is ten times a load however busy the machine is; counted, it is a search of the whole
 * scene per mesh, which the last test refuses.
 *
 * This file gates no push: ci.yml's advisory "performance" job runs it. The teardown's scaling is
 * pinned, gating, by count in bulk-teardown.test.ts on a smaller graph.
 */

import { type AbstractMesh, type Scene, Vector3 } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { DEFAULT_LIMITS } from "../../src/session/limits";

const NODES = DEFAULT_LIMITS.renderCeiling;
const EDGES = NODES / 2;
const TIMEOUT_MS = 300_000;
/** The nodes the first test removes and undoes. */
const REMOVED = 1000;
/**
 * The meshes one restored node may cost to build again: its own, and its one edge's (every node
 * here has one edge). Measured: one per node. A rebuild of the graph would add the load's hundred
 * thousand.
 */
const MESHES_PER_NODE = 2;
/**
 * How many more entries than the scene's own meshes one removal may search: Babylon's lights,
 * cameras and helpers are in the same list, and a removal searches what is left of it.
 */
const SEARCH_SLACK = 20;

/** What the scene counted while some work ran. */
interface MeshWork {
    /** Meshes added to the scene. */
    added: number;
    /** Meshes removed from it. */
    removed: number;
    /** The longest `scene.meshes` a removal had to search. */
    longestSearch: number;
}

/**
 * Count the meshes some work adds to and removes from a scene, and the longest mesh list a removal
 * searched while it ran.
 * @param scene - The scene.
 * @param work - The work.
 * @returns What the scene counted.
 */
async function meshesDuring(scene: Scene, work: () => Promise<unknown>): Promise<MeshWork> {
    const counted: MeshWork = { added: 0, removed: 0, longestSearch: 0 };
    const added = scene.onNewMeshAddedObservable.add(() => {
        counted.added++;
    });
    const removed = scene.onMeshRemovedObservable.add(() => {
        counted.removed++;
    });
    const original = scene.removeMesh.bind(scene);
    scene.removeMesh = (mesh: AbstractMesh, recursive?: boolean): number => {
        counted.longestSearch = Math.max(counted.longestSearch, scene.meshes.length);
        return original(mesh, recursive);
    };

    try {
        await work();
    } finally {
        scene.removeMesh = original;
        scene.onNewMeshAddedObservable.remove(added);
        scene.onMeshRemovedObservable.remove(removed);
    }

    return counted;
}

/**
 * The counted work, for the printed line.
 * @param work - What the scene counted.
 * @returns It, as text.
 */
function describeMeshes(work: MeshWork): string {
    return `${String(work.added)} meshes added, ${String(work.removed)} removed, longest search ${String(work.longestSearch)}`;
}

/**
 * Run a full garbage collection, so the next timed step does not pay for one the steps before it
 * made due. Needs the page started with `--js-flags=--expose-gc`.
 */
function collectGarbage(): void {
    const { gc } = globalThis as { gc?: () => void };
    if (gc === undefined) {
        throw new Error("gc() is missing: the browser-bench project must launch Chromium with --js-flags=--expose-gc");
    }

    gc();
}

/**
 * Run a full garbage collection from a task of its own, with nothing of the caller's on the stack.
 * A collection run from the caller's stack (`gc()`) can keep an object alive through a stale stack
 * slot, at random, for as long as the caller keeps running.
 */
async function collectGarbageFromATaskOfItsOwn(): Promise<void> {
    const { gc } = globalThis as { gc?: (options: { type: "major"; execution: "async" }) => Promise<void> };
    if (gc === undefined) {
        throw new Error("gc() is missing: the browser-bench project must launch Chromium with --js-flags=--expose-gc");
    }

    await gc({ type: "major", execution: "async" });
}

/**
 * The middle of an odd number of timings.
 * @param ms - The timings.
 * @returns Their median.
 */
function median(ms: readonly number[]): number {
    const sorted = [...ms].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Report a timing.
 * @param what - What was timed.
 * @param ms - How long it took.
 */
function report(what: string, ms: number, extra = ""): void {
    console.log(`[undo-scale-browser] ${what}: ${ms.toFixed(1)} ms${extra === "" ? "" : `  ${extra}`}`);
}

/**
 * Time an async call, derivation pass included: every call here settles once the picture has
 * caught up.
 * @param work - The call.
 * @returns Milliseconds.
 */
async function time(work: () => Promise<unknown>): Promise<number> {
    const start = performance.now();
    await work();
    return performance.now() - start;
}

describe("undo on a real graph at the largest graph it draws", () => {
    let graph: Graph;
    let container: HTMLElement;
    let loadMs = 0;
    /** What loading the graph added to the scene. */
    let loadMeshes: MeshWork = { added: 0, removed: 0, longestSearch: 0 };
    /** The scene's own meshes, before the graph drew any. */
    let baselineMeshes = 0;
    /** The graph, as the JSON document every load here imports. */
    let json = "";

    /** Let what a forward operation queued, and the tasks after it, finish. */
    const idle = async (): Promise<void> => {
        await operationQueueOf(graph).waitForCompletion();
        await new Promise((resolve) => setTimeout(resolve, 0));
        collectGarbage();
    };

    beforeAll(async () => {
        (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        graph.engine.stopRenderLoop();
        await graph.setLayout("random");
        const session = graph.getSession();
        json = JSON.stringify({
            nodes: Array.from({ length: NODES }, (_, at) => ({ id: `v${String(at)}` })),
            edges: Array.from({ length: EDGES }, (_, at) => ({
                src: `v${String(2 * at)}`,
                dst: `v${String(2 * at + 1)}`,
            })),
        });
        // The load's own promise settles before the repaint its queue turn triggers; the graph is
        // drawn once the queue is idle, which is what an undo that rebuilds it waits for too.
        baselineMeshes = graph.scene.meshes.length;
        loadMeshes = await meshesDuring(graph.scene, async () => {
            loadMs = await time(async () => {
                await session.data.import({ type: "json", config: { data: json } });
                await operationQueueOf(graph).waitForCompletion();
            });
        });
        report(`loading ${String(NODES)} nodes and ${String(EDGES)} edges`, loadMs, describeMeshes(loadMeshes));
        assert.strictEqual(session.snapshot().nodeCount, NODES);
        await idle();
        session.history.clear();
    }, TIMEOUT_MS);

    // Disposing a graph this size tears down every node's render objects, which takes about as
    // long as the load did, past the default hook timeout.
    //
    // The hook then lets go of the graph and waits until it is garbage. The next file runs in the
    // same page, and a graph this size holds about 3.3 GB of the page's 4 GB heap: a benchmark
    // that starts while it is still alive runs out of memory and crashes the page ("Browser
    // connection was closed", issue #3413). A disposed graph that is never collected fails here,
    // at the hook's limit, instead of somewhere in the next file.
    afterAll(async () => {
        const released = new WeakRef(graph);
        graph.dispose();
        container.remove();
        // The suite's closures outlive this hook, so the references go too.
        graph = undefined as unknown as Graph;
        json = "";
        await collectGarbageFromATaskOfItsOwn();
        while (released.deref() !== undefined) {
            await new Promise((resolve) => setTimeout(resolve, 0));
            await collectGarbageFromATaskOfItsOwn();
        }
    }, TIMEOUT_MS);

    it(
        "undoing the removal of 1,000 nodes costs a small part of the load",
        async () => {
            const session = graph.getSession();
            await session.data.removeNodes(Array.from({ length: REMOVED }, (_, at) => `v${String(10_000 + 7 * at)}`));
            await idle();
            let ms = 0;
            const meshes = await meshesDuring(graph.scene, async () => {
                ms = await time(() => session.undo());
            });
            report(
                "undoing the removal of 1,000 nodes",
                ms,
                `${describeMeshes(meshes)} (load ${loadMs.toFixed(0)} ms)`,
            );
            assert.strictEqual(session.snapshot().nodeCount, NODES);
            // Redone before the work is checked, so a miss fails this test alone: the tests below
            // start from the removal done.
            await session.redo();
            await idle();
            // The thousand nodes come back and nothing else is built: an undo that rebuilt the
            // graph would add the load's fifty thousand nodes' meshes again.
            assert.isAbove(meshes.added, 0, "the restored nodes were drawn");
            assert.isAtMost(meshes.added, MESHES_PER_NODE * REMOVED, "only the restored nodes were drawn");
            assert.isAtMost(meshes.removed, MESHES_PER_NODE * REMOVED, "nothing else was torn down");
        },
        TIMEOUT_MS,
    );

    it(
        "undoing a drag at rest costs a small part of the load",
        async () => {
            const session = graph.getSession();
            const node = graph.getNode("v3");
            assert.isDefined(node);
            const { dragHandler } = node;
            assert.isDefined(dragHandler, "the node can be dragged");
            const before = session.history.steps.length;
            const start = node.mesh.position.clone();
            dragHandler.onDragStart(start);
            dragHandler.onDragUpdate(start.add(new Vector3(40, 30, 0)));
            dragHandler.onDragEnd();
            // The drop records once the frame after it has run; the render loop is stopped.
            for (let wait = 0; wait < 500 && session.history.steps.length === before; wait++) {
                graph.getUpdateManager().stepFrames(1);
                await new Promise((resolve) => setTimeout(resolve, 10));
            }

            assert.lengthOf(session.history.steps, before + 1, "the drop recorded one step");
            await idle();
            let ms = 0;
            const meshes = await meshesDuring(graph.scene, async () => {
                ms = await time(() => session.undo());
            });
            report("undoing a drag, at rest", ms, `${describeMeshes(meshes)} (load ${loadMs.toFixed(0)} ms)`);
            await session.redo();
            await idle();
            // A position goes back; no render object is built or torn down for it.
            assert.strictEqual(meshes.added, 0, "no mesh built");
            assert.strictEqual(meshes.removed, 0, "no mesh torn down");
        },
        TIMEOUT_MS,
    );

    it(
        "undoing a replacing import costs about what the load it brings back cost",
        async () => {
            const session = graph.getSession();
            // Timed against a load in the same window, as the teardown below is: three rounds,
            // each a replacing import, the graph loaded again by a second one (timed), that load
            // undone, and then the first import undone (timed), compared by their medians. One
            // undo against the load in `beforeAll` measured how busy the machine was at two
            // moments minutes apart, and failed under several pre-push gates at once (issue
            // #1457). Each round ends where it started, at the same place in the history.
            const undos: number[] = [];
            const loads: number[] = [];
            const undoMeshes: MeshWork[] = [];
            const loadedMeshes: MeshWork[] = [];
            for (let round = 0; round < 3; round++) {
                const replacing = await time(async () => {
                    await session.data.import(
                        { type: "json", config: { data: '{"nodes":[{"id":"r"}],"edges":[]}' } },
                        { mode: "replace" },
                    );
                    await idle();
                });
                report("a replacing import, tearing the graph down", replacing);
                loadedMeshes.push(
                    await meshesDuring(graph.scene, async () => {
                        loads.push(
                            await time(async () => {
                                await session.data.import(
                                    { type: "json", config: { data: json } },
                                    { mode: "replace" },
                                );
                                await operationQueueOf(graph).waitForCompletion();
                            }),
                        );
                    }),
                );
                await idle();
                await session.undo();
                assert.strictEqual(session.snapshot().nodeCount, 1);
                await idle();
                undoMeshes.push(
                    await meshesDuring(graph.scene, async () => {
                        undos.push(await time(() => session.undo()));
                    }),
                );
                assert.strictEqual(session.snapshot().nodeCount, NODES - 1000);
                await idle();
            }

            report(
                `undoing a replacing import, median of ${undos.map((ms) => ms.toFixed(0)).join(", ")}`,
                median(undos),
            );
            report(
                `loading the graph beside it, median of ${loads.map((ms) => ms.toFixed(0)).join(", ")}`,
                median(loads),
            );
            // Only the parse is saved; every render object is built again -- once. Counted: each
            // undo builds no more meshes than the load beside it did, and tears down no more than
            // the one node the replacing import left.
            for (const [round, meshes] of undoMeshes.entries()) {
                report(`undo ${String(round + 1)}`, undos[round], describeMeshes(meshes));
                assert.isAbove(meshes.added, 0, "the graph was drawn again");
                assert.isAtMost(meshes.added, loadedMeshes[round].added, "no more meshes than the load built");
                assert.isAtMost(meshes.removed, MESHES_PER_NODE, "only the replacing import's node torn down");
            }
        },
        TIMEOUT_MS,
    );

    it(
        "restoreTo(null) over those steps costs less than the load",
        async () => {
            const session = graph.getSession();
            let ms = 0;
            const meshes = await meshesDuring(graph.scene, async () => {
                ms = await time(() => session.history.restoreTo(null));
            });
            report("restoreTo(null) over those steps", ms, `${describeMeshes(meshes)} (load ${loadMs.toFixed(0)} ms)`);
            assert.strictEqual(session.snapshot().nodeCount, NODES);
            // The removed thousand come back and the drag goes back; nothing else is rebuilt.
            assert.isAtMost(meshes.added, MESHES_PER_NODE * REMOVED, "only the removed nodes were drawn again");
        },
        TIMEOUT_MS,
    );

    it(
        "tearing the graph down costs about what loading it does, timed alternately in the same window",
        async () => {
            const session = graph.getSession();
            const searches: MeshWork[] = [];
            const replace = async (data: string): Promise<number> => {
                await idle();
                let ms = 0;
                searches.push(
                    await meshesDuring(graph.scene, async () => {
                        ms = await time(async () => {
                            await session.data.import({ type: "json", config: { data } }, { mode: "replace" });
                            await operationQueueOf(graph).waitForCompletion();
                        });
                    }),
                );
                return ms;
            };
            const teardowns: number[] = [];
            const loads: number[] = [];
            for (let round = 0; round < 3; round++) {
                teardowns.push(await replace('{"nodes":[{"id":"r"}],"edges":[]}'));
                assert.strictEqual(session.snapshot().nodeCount, 1);
                loads.push(await replace(json));
                assert.strictEqual(session.snapshot().nodeCount, NODES);
            }

            report(
                `tearing the graph down, median of ${teardowns.map((ms) => ms.toFixed(0)).join(", ")}`,
                median(teardowns),
            );
            report(`loading it again, median of ${loads.map((ms) => ms.toFixed(0)).join(", ")}`, median(loads));
            // Counted: every replace -- the teardowns and the loads, which tear the one node down
            // -- removed the graph's meshes without searching the scene's list once per mesh. Before
            // the bulk path (issue #543) the first dispose searched every mesh the graph had drawn.
            for (const [at, meshes] of searches.entries()) {
                report(
                    at % 2 === 0 ? "a teardown" : "a load",
                    at % 2 === 0 ? teardowns[at / 2] : loads[(at - 1) / 2],
                    describeMeshes(meshes),
                );
                assert.isBelow(
                    meshes.longestSearch,
                    baselineMeshes + SEARCH_SLACK,
                    "each dispose searched only what was left",
                );
            }

            assert.isAtLeast(searches[0].removed, NODES, "a teardown removed the whole graph's meshes");
        },
        TIMEOUT_MS,
    );
});
