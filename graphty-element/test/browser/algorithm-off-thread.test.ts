/**
 * @file An algorithm's CPU port over a large graph, or slow work over a dense one, runs in a Worker,
 * not on the page.
 *
 * Louvain over the "every airline route on earth" sample (3,214 nodes, 36,906 edges) held the page
 * for over 200 ms at a 6x CPU throttle, the stand-in for an iPad. The element now hands the listed
 * CPU members to a module Worker it owns. What is counted here is the calls handed to a Worker,
 * and the answer is compared with the same port run on the page: it must be the same answer.
 */

import {
    accelerated,
    allSimplePaths,
    astar,
    hierarchicalClustering,
    markovClustering,
    spectralClustering,
} from "@graphty/algorithms";
import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { afterEach, assert, describe, it, vi } from "vitest";

import { cpuDispatcher, offThread } from "../../src/algorithms/offThread";
import type { Graph } from "../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

/**
 * A ring of `n` nodes with a chord from every node to the one `step` along: 2n edges, in a
 * pattern Louvain splits into many communities.
 * @param n - The node count.
 * @param step - The chord length.
 * @returns The snapshot.
 */
function ringWithChords(n: number, step: number): GraphSnapshot {
    const src = new Uint32Array(2 * n);
    const dst = new Uint32Array(2 * n);
    for (let at = 0; at < n; at++) {
        src[2 * at] = at;
        dst[2 * at] = (at + 1) % n;
        src[2 * at + 1] = at;
        dst[2 * at + 1] = (at + step) % n;
    }

    return fromEdgeArrays({ src, dst, nodeCount: n, directed: false });
}

/**
 * An element holding the same ring with chords as {@link ringWithChords}, 4,000 nodes.
 * @returns The element.
 */
async function ringGraph(): Promise<Graph> {
    const made = await createTestGraph();
    await made.setLayout("random");
    const n = 4000;
    const ids = Array.from({ length: n }, (_, at) => `n${String(at)}`);
    await made.addNodes(ids.map((id) => ({ id })));
    await made.addEdges(
        ids.flatMap((id, at) => [
            { src: id, dst: ids[(at + 1) % n] },
            { src: id, dst: ids[(at + 37) % n] },
        ]),
    );

    return made;
}

describe("an algorithm's CPU port", () => {
    let graph: Graph | undefined;

    afterEach(() => {
        vi.restoreAllMocks();
        if (graph) {
            cleanupTestGraph(graph);
        }
        graph = undefined;
    });

    it("is where a Louvain run on the element computes, with no code from the consumer", async () => {
        graph = await ringGraph();
        const posted = vi.spyOn(Worker.prototype, "postMessage");

        const run = graph.getSession().runs.start("louvain", {}, { style: false });
        await run;

        assert.strictEqual(posted.mock.calls.length, 1, "the run's work was handed to a Worker");
        assert.strictEqual(run.status, "succeeded", "and the run finished with its answer");
    });

    it("runs Louvain in a Worker over a large graph, with the answer the page computes", async () => {
        const snapshot = ringWithChords(4000, 37);
        const posted = vi.spyOn(Worker.prototype, "postMessage");
        const options = { resolution: 1, maxIterations: 100, tolerance: 1e-6 };

        const off = await cpuDispatcher(snapshot).louvain(snapshot, options);
        const page = await accelerated(null).louvain(snapshot, options);

        assert.strictEqual(posted.mock.calls.length, 1, "the call was handed to a Worker");
        assert.deepStrictEqual([...off.labels], [...page.labels], "the same groups");
        assert.strictEqual(off.modularity, page.modularity, "and the same modularity");
    });

    it("runs Girvan-Newman in a Worker, so the page stays live through its rounds of betweenness", async () => {
        const snapshot = ringWithChords(4000, 37);
        const posted = vi.spyOn(Worker.prototype, "postMessage");
        const options = { maxIterations: 1 };

        const off = await cpuDispatcher(snapshot).girvanNewman(snapshot, options);
        const page = await accelerated(null).girvanNewman(snapshot, options);

        assert.strictEqual(posted.mock.calls.length, 1, "the call was handed to a Worker");
        assert.deepStrictEqual(
            off.levels.map((level) => [...level]),
            page.levels.map((level) => [...level]),
            "the same cuts",
        );
    });

    it("runs Betweenness in a Worker over a large graph, with the answer the page computes", async () => {
        const snapshot = ringWithChords(4000, 37);
        const posted = vi.spyOn(Worker.prototype, "postMessage");
        const options = { k: 50 };

        const off = await cpuDispatcher(snapshot).betweennessCentrality(snapshot, options);
        const page = await accelerated(null).betweennessCentrality(snapshot, options);

        assert.strictEqual(posted.mock.calls.length, 1, "the call was handed to a Worker");
        assert.deepStrictEqual([...off.scores], [...page.scores], "the same scores");
    });

    it("stops a canceled call's Worker and still answers the other calls it held", async () => {
        const snapshot = ringWithChords(4000, 37);
        const terminated = vi.spyOn(Worker.prototype, "terminate");
        const controller = new AbortController();
        const reason = new DOMException("canceled", "AbortError");

        const canceled = cpuDispatcher(snapshot, controller.signal).betweennessCentrality(snapshot);
        const other = cpuDispatcher(snapshot).louvain(snapshot, {});
        controller.abort(reason);

        let thrown: unknown;
        try {
            await canceled;
        } catch (error) {
            thrown = error;
        }

        assert.strictEqual(thrown, reason, "the canceled call rejects with the signal's reason");
        assert.strictEqual(terminated.mock.calls.length, 1, "and the Worker computing it was stopped");
        const page = await accelerated(null).louvain(snapshot, {});
        assert.deepStrictEqual([...(await other).labels], [...page.labels], "the other call still answers");
    });

    // Betweenness goes through the dispatcher, spectral clustering calls the library directly.
    for (const key of ["betweenness", "spectral-clustering"]) {
        it(`cancels a ${key} run on the element with no result left behind`, async () => {
            graph = await ringGraph();
            let sent: () => void = () => undefined;
            const handed = new Promise<void>((resolve) => {
                sent = resolve;
            });
            const original = Worker.prototype.postMessage;
            vi.spyOn(Worker.prototype, "postMessage").mockImplementation(function (this: Worker, ...args: unknown[]) {
                Reflect.apply(original, this, args);
                sent();
            });
            const terminated = vi.spyOn(Worker.prototype, "terminate");
            const session = graph.getSession();
            const layersBefore = session.styles.list().length;

            const run = session.runs.start(key, {});
            await handed;
            run.cancel();
            const outcome = await run.then(
                () => "resolved",
                (error: unknown) => (error instanceof DOMException ? error.name : "other"),
            );

            assert.strictEqual(outcome, "AbortError", "the run rejects as canceled");
            assert.strictEqual(run.status, "canceled");
            assert.strictEqual(terminated.mock.calls.length, 1, "and its Worker stopped computing");
            assert.strictEqual(session.results.get(run.id), undefined, "no result is left behind");
            assert.strictEqual(session.styles.list().length, layersBefore, "and no coloring");
        });
    }

    it("runs Betweenness in a Worker over a small but dense graph, which froze the page", async () => {
        // 1,500 nodes and 3,000 edges: under the size that sends linear work over, but Betweenness
        // walks the whole graph once per node.
        const snapshot = ringWithChords(1500, 37);
        const posted = vi.spyOn(Worker.prototype, "postMessage");

        const off = await cpuDispatcher(snapshot).betweennessCentrality(snapshot);
        await cpuDispatcher(snapshot).louvain(snapshot, {});
        const page = await accelerated(null).betweennessCentrality(snapshot);

        assert.strictEqual(posted.mock.calls.length, 1, "Betweenness went to a Worker, Louvain stayed");
        assert.deepStrictEqual([...off.scores], [...page.scores], "the same scores");
    });

    it("runs Bellman-Ford in a Worker and still walks its route on the page", async () => {
        const snapshot = ringWithChords(1500, 37);
        const posted = vi.spyOn(Worker.prototype, "postMessage");

        const off = await cpuDispatcher(snapshot).bellmanFord(snapshot, 0);
        const page = await accelerated(null).bellmanFord(snapshot, 0);

        assert.strictEqual(posted.mock.calls.length, 1, "the call was handed to a Worker");
        assert.deepStrictEqual([...off.pathTo(700)], [...page.pathTo(700)], "the same route");
        assert.deepStrictEqual([...off.pathEdges(700)], [...page.pathEdges(700)], "over the same edges");
    });

    it("runs the clusterings and path searches outside the dispatcher in a Worker, with the page's answers", async () => {
        const dense = ringWithChords(800, 7);
        const large = ringWithChords(4000, 37);
        const xyz = Float64Array.from({ length: 4000 * 3 }, (_, at) => at % 97);
        const posted = vi.spyOn(Worker.prototype, "postMessage");

        const spectral = await offThread("spectralClustering", dense, undefined, { k: 3, seed: 7 });
        const markov = await offThread("markovClustering", dense, undefined, {});
        const tree = await offThread("hierarchicalClustering", dense, undefined, { linkage: "average", clusters: 4 });
        const paths = await offThread("allSimplePaths", dense, undefined, 0, 20, { maxLength: 6, maxPaths: 50 });
        const route = await offThread("astar", large, undefined, 0, 2000, xyz);

        assert.strictEqual(posted.mock.calls.length, 5, "every call was handed to a Worker");
        assert.deepStrictEqual([...spectral.labels], [...spectralClustering(dense, { k: 3, seed: 7 }).labels]);
        assert.deepStrictEqual([...markov.labels], [...markovClustering(dense, {}).labels]);
        const cut = hierarchicalClustering(dense, { linkage: "average" }).cutAt({ clusters: tree.cut });
        assert.deepStrictEqual([...tree.labels], [...cut.labels]);
        const expected = allSimplePaths(dense, 0, 20, { maxLength: 6, maxPaths: 50 });
        assert.deepStrictEqual(
            paths.paths.map((path) => [...path]),
            expected.paths.map((path) => [...path]),
        );
        assert.strictEqual(paths.stoppedBy, expected.stoppedBy);
        const straight = (node: number, target: number): number =>
            Math.hypot(
                xyz[node * 3] - xyz[target * 3],
                xyz[node * 3 + 1] - xyz[target * 3 + 1],
                xyz[node * 3 + 2] - xyz[target * 3 + 2],
            );
        assert.deepStrictEqual([...route.path], [...astar(large, 0, 2000, straight).path]);
    });

    it("keeps a small graph on the page", async () => {
        const snapshot = ringWithChords(100, 7);
        const posted = vi.spyOn(Worker.prototype, "postMessage");

        const result = await cpuDispatcher(snapshot).louvain(snapshot, {});

        assert.strictEqual(posted.mock.calls.length, 0, "a graph this small is not worth the copy");
        assert.strictEqual(result.labels.length, 100);
    });

    it("keeps every member it does not list on the page", async () => {
        const snapshot = ringWithChords(4000, 37);
        const posted = vi.spyOn(Worker.prototype, "postMessage");

        const result = await cpuDispatcher(snapshot).connectedComponents(snapshot);

        assert.strictEqual(posted.mock.calls.length, 0, "connected components stays on the page");
        assert.strictEqual(result.labels.length, 4000);
    });
});
