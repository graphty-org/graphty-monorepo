import { expandEdges, GraphBuilder, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    accelerated,
    type AcceleratedAlgorithms,
    type AlgorithmAccelerator,
    type ApspResultLike,
    type BellmanFordResultLike,
    type BfsResultLike,
    ConvergenceError,
    indexed,
    type LabelResultLike,
    type MstResultLike,
    type PageRankResultLike,
    type ScoresResultLike,
    type SsspResultLike,
} from "../../../src/index.js";
import { Graph } from "../../helpers/legacy-graph.js";
import { toSnapshot } from "../../helpers/to-snapshot.js";
import { gnm, undirectedFixtures } from "./port-fixtures.js";

function pathGraph(): Graph {
    const g = new Graph({ directed: true });
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    return g;
}

// No vi.fn anywhere: algorithms has no mock-injection convention (plan decision PD-13) and a plain
// literal with a closed-over call log proves everything the design asks for.
function cycle(): GraphSnapshot {
    const g = new Graph({ directed: true });
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    g.addEdge("c", "a");
    return toSnapshot(g);
}

describe("accelerated(acc)", () => {
    it("delegates to a method the accelerator has", async () => {
        const s = cycle();
        const calls: string[] = [];
        const fixture: PageRankResultLike = {
            scores: Float64Array.of(0.5, 0.25, 0.25),
            iterations: 7,
            converged: true,
            danglingMass: 0,
        };
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            pageRank: (snapshot) => {
                calls.push("pageRank");
                expect(snapshot).toBe(s);
                return Promise.resolve(fixture);
            },
        };
        const result = await accelerated(fake).pageRank(s);
        expect(calls).toEqual(["pageRank"]);
        expect(result).toBe(fixture);
        expect(result.iterations).toBe(7);
    });

    // One row per dispatcher method. Each fake implements ONLY that method, logs the arguments it
    // was handed and answers with a sentinel, so a branch wired to the wrong accelerator method,
    // dropping an argument or running the CPU port instead fails its row.
    describe("passes the arguments through and returns the accelerator's result", () => {
        const s = cycle();
        const source = 2;
        const options = {};
        const scores: PageRankResultLike = { scores: Float64Array.of(1, 0, 0), iterations: 1, converged: true };
        const labels: LabelResultLike = { labels: Uint32Array.of(0, 0, 0), count: 1, groups: () => [] };
        const bfs: BfsResultLike = {
            depth: Uint32Array.of(1, 1, 0),
            parent: Uint32Array.of(2, 2, 2),
            order: Uint32Array.of(2, 0, 1),
            visitedCount: 3,
        };
        const sssp: SsspResultLike = { dist: Float32Array.of(9, 9, 0), predArc: Uint32Array.of(1, 1, 1) };
        const mst: MstResultLike = { edges: Uint32Array.of(0), totalWeight: 42 };
        const personalization = Float64Array.of(1, 0, 0);
        // PageRank members receive only the options they take, with `weighted` resolved to the port's default.
        const pageRankSent = {
            dampingFactor: undefined,
            maxIterations: undefined,
            tolerance: undefined,
            weighted: false,
        };

        interface Row {
            readonly method: keyof AlgorithmAccelerator & keyof AcceleratedAlgorithms;
            readonly fake: (log: unknown[][]) => AlgorithmAccelerator;
            readonly run: (d: AcceleratedAlgorithms) => Promise<unknown>;
            readonly args: unknown[];
            readonly sentinel: object;
        }
        const rows: Row[] = [
            {
                method: "pageRank",
                fake: (log) => ({ kind: "fake", pageRank: (...a) => (log.push(a), Promise.resolve(scores)) }),
                run: (d) => d.pageRank(s, options),
                args: [s, pageRankSent],
                sentinel: scores,
            },
            {
                method: "personalizedPageRank",
                fake: (log) => ({
                    kind: "fake",
                    personalizedPageRank: (...a) => (log.push(a), Promise.resolve(scores)),
                }),
                run: (d) => d.personalizedPageRank(s, personalization, options),
                args: [s, personalization, pageRankSent],
                sentinel: scores,
            },
            {
                method: "sssp",
                fake: (log) => ({ kind: "fake", sssp: (...a) => (log.push(a), Promise.resolve(sssp)) }),
                run: (d) => d.sssp(s, source, options),
                args: [s, source, options],
                sentinel: sssp,
            },
            {
                method: "breadthFirstSearch",
                fake: (log) => ({ kind: "fake", breadthFirstSearch: (...a) => (log.push(a), Promise.resolve(bfs)) }),
                run: (d) => d.breadthFirstSearch(s, source, options),
                args: [s, source, options],
                sentinel: bfs,
            },
            {
                method: "connectedComponents",
                fake: (log) => ({
                    kind: "fake",
                    connectedComponents: (...a) => (log.push(a), Promise.resolve(labels)),
                }),
                run: (d) => d.connectedComponents(s),
                args: [s],
                sentinel: labels,
            },
            {
                method: "weaklyConnectedComponents",
                fake: (log) => ({
                    kind: "fake",
                    weaklyConnectedComponents: (...a) => (log.push(a), Promise.resolve(labels)),
                }),
                run: (d) => d.weaklyConnectedComponents(s),
                args: [s],
                sentinel: labels,
            },
            {
                method: "minimumSpanningTree",
                fake: (log) => ({ kind: "fake", minimumSpanningTree: (...a) => (log.push(a), Promise.resolve(mst)) }),
                run: (d) => d.minimumSpanningTree(s, options),
                // the member takes no options of its own: a weights override runs the CPU port (below)
                args: [s],
                sentinel: mst,
            },
        ];

        it.each(rows)("$method", async ({ method, fake, run, args, sentinel }) => {
            const log: unknown[][] = [];
            const result = await run(accelerated(fake(log)));
            expect(log).toHaveLength(1);
            expect(log[0]).toHaveLength(args.length);
            args.forEach((arg, i) =>
                arg === pageRankSent ? expect(log[0][i]).toStrictEqual(arg) : expect(log[0][i]).toBe(arg),
            );
            if (method === "sssp") {
                // The dispatcher wraps an SSSP result to add pathTo / pathEdges, so it is a new
                // object; the accelerator's own vectors must still come back untouched.
                const decorated = result as SsspResultLike;
                expect(decorated.dist).toBe(sssp.dist);
                expect(decorated.predArc).toBe(sssp.predArc);
            } else {
                expect(result).toBe(sentinel);
            }
        });
    });

    it("runs the CPU port for a method the accelerator does NOT have", async () => {
        const s = cycle();
        const bare: AlgorithmAccelerator = { kind: "fake" };
        const result = await accelerated(bare).pageRank(s);
        expect(result.scores).toBeInstanceOf(Float64Array);
        expect(result.scores.length).toBe(3);
        let sum = 0;
        for (let i = 0; i < result.scores.length; i++) {
            sum += result.scores[i];
        }
        expect(sum).toBeCloseTo(1, 9);
    });

    it("runs the CPU port for null and for undefined, and reports the accelerator as null", async () => {
        const s = cycle();
        expect(accelerated(null).accelerator).toBeNull();
        expect(accelerated(undefined).accelerator).toBeNull();
        const viaNull = await accelerated(null).connectedComponents(s.toUndirected().snapshot);
        expect(viaNull.count).toBe(1);
    });

    it("lets a throwing accelerator method propagate unchanged -- there is no fallback", async () => {
        const s = cycle();
        const boom = new Error("E_DEVICE_LOST");
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            pageRank: () => Promise.reject(boom),
        };
        await expect(accelerated(fake).pageRank(s)).rejects.toBe(boom);

        const throwsSync: AlgorithmAccelerator = {
            kind: "fake",
            connectedComponents: () => {
                throw boom;
            },
        };
        expect(() => accelerated(throwsSync).connectedComponents(s)).toThrow(boom);
    });

    it("decorates an accelerator's bare SSSP result with pathTo and pathEdges", async () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 1);
        g.addEdge("b", "c", 1);
        g.addEdge("a", "c", 5);
        const s = toSnapshot(g);
        const a = s.ids.requireIndex("a");
        const c = s.ids.requireIndex("c");
        // The fake returns exactly what a GPU would: an f32 dist and the relaxing arcs, nothing else.
        const cpu = await accelerated(null).sssp(s, a);
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            sssp: () => Promise.resolve({ dist: Float32Array.from(cpu.dist), predArc: cpu.predArc }),
        };
        const decorated = await accelerated(fake).sssp(s, a);
        expect(decorated.dist).toBeInstanceOf(Float32Array);
        expect([...decorated.pathTo(c)]).toEqual([...cpu.pathTo(c)]);
        expect([...decorated.pathEdges(c)]).toEqual([...cpu.pathEdges(c)]);
        expect(decorated.pathEdges(c).length).toBe(2); // a->b->c, not the direct weight-5 edge
    });

    it("runs the CPU port for a minimum spanning tree over a weights override, which the accelerator does not take", async () => {
        const s = cycle().toUndirected().snapshot;
        const log: unknown[][] = [];
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            minimumSpanningTree: (...a) => (log.push(a), Promise.resolve({ edges: Uint32Array.of(0), totalWeight: 42 })),
        };
        const weights = new Float64Array(s.arcCount).fill(2);
        const mst = await accelerated(fake).minimumSpanningTree(s, { weights });
        expect(log).toHaveLength(0);
        expect(mst.edges.length).toBe(2);
        expect(mst.totalWeight).toBe(4);
    });

    it("runs the CPU port for the other three methods too", async () => {
        const s = cycle();
        const cpu = accelerated(null);
        const bfs = await cpu.breadthFirstSearch(s, 0);
        expect(bfs.visitedCount).toBe(3);
        const wcc = await cpu.weaklyConnectedComponents(s);
        expect(wcc.count).toBe(1);
        const mst = await cpu.minimumSpanningTree(s.toUndirected().snapshot);
        expect(mst.edges.length).toBe(2);
    });

    it("runs the CPU port for the four ports that arrived with the structure and community family", async () => {
        const s = cycle();
        const undirected = s.toUndirected().snapshot;
        const cpu = accelerated(null);
        const coreness = await cpu.kCoreDecomposition(undirected);
        expect([...coreness.coreness]).toEqual([2, 2, 2]);
        const katz = await cpu.katzCentrality(s, { normalized: false });
        expect(katz.scores.length).toBe(3);
        const scores = await cpu.hits(s);
        expect(scores.hubs.length).toBe(3);
        expect(scores.authorities.length).toBe(3);
        const communities = await cpu.louvain(undirected);
        expect(communities.count).toBe(1);
        expect(communities.modularity).toBeCloseTo(0, 12);
    });

    it("delegates the new four to an accelerator that has them", async () => {
        const s = cycle();
        const undirected = s.toUndirected().snapshot;
        const calls: string[] = [];
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            kCoreDecomposition: () => {
                calls.push("kCoreDecomposition");
                return Promise.resolve({ coreness: Uint32Array.of(9, 9, 9) });
            },
            katzCentrality: () => {
                calls.push("katzCentrality");
                return Promise.resolve({ scores: Float32Array.of(1, 1, 1), iterations: 1, converged: true });
            },
            hits: () => {
                calls.push("hits");
                return Promise.resolve({
                    hubs: Float32Array.of(1, 0, 0),
                    authorities: Float32Array.of(0, 1, 0),
                    iterations: 1,
                    converged: true,
                });
            },
            louvain: () => {
                calls.push("louvain");
                return Promise.resolve({
                    labels: Uint32Array.of(0, 0, 0),
                    count: 1,
                    groups: () => [Uint32Array.of(0, 1, 2)],
                    modularity: 0,
                });
            },
        };
        const dispatcher = accelerated(fake);
        // A path, not the cycle: every node of a cycle has the same in-degree, and Katz keeps that on the port.
        const path = toSnapshot(pathGraph());
        expect((await dispatcher.kCoreDecomposition(undirected)).coreness[0]).toBe(9);
        expect([...(await dispatcher.katzCentrality(path)).scores]).toEqual([1, 1, 1]);
        expect([...(await dispatcher.hits(s)).hubs]).toEqual([1, 0, 0]);
        expect((await dispatcher.louvain(undirected)).count).toBe(1);
        expect(calls.sort()).toEqual(["hits", "kCoreDecomposition", "katzCentrality", "louvain"]);
    });

    it("runs the CPU label propagation port when the accelerator has none", async () => {
        const s = cycle();
        const viaDispatcher = await accelerated(null).labelPropagation(s, { randomSeed: 7 });
        const direct = indexed.labelPropagation(s, { randomSeed: 7 });
        expect([...viaDispatcher.labels]).toEqual([...direct.labels]);
        expect(viaDispatcher.count).toBe(direct.count);
        // maxIterations 0 leaves every node in its own community; the default run merges them.
        expect(indexed.labelPropagation(s).count).toBe(1);
        expect((await accelerated(null).labelPropagation(s, { maxIterations: 0 })).count).toBe(3);
    });

    it("hands an unseeded label propagation to an accelerator with the same snapshot and options object", async () => {
        const s = cycle();
        const options = { maxIterations: 3, weighted: false };
        const answer: LabelResultLike = { labels: Uint32Array.of(0, 0, 0), count: 1, groups: () => [] };
        const seen: unknown[] = [];
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            labelPropagation: (snapshot, received) => {
                seen.push(snapshot, received);
                return Promise.resolve(answer);
            },
        };
        expect(await accelerated(fake).labelPropagation(s, options)).toBe(answer);
        expect(seen[0]).toBe(s);
        expect(seen[1]).toBe(options);
    });

    it("runs a seeded label propagation on the CPU port even with an accelerator attached", async () => {
        const s = cycle();
        const calls: unknown[] = [];
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            labelPropagation: (...a) => (calls.push(a), Promise.reject(new Error("must not be called"))),
        };
        const viaDispatcher = await accelerated(fake).labelPropagation(s, { randomSeed: 7 });
        const direct = indexed.labelPropagation(s, { randomSeed: 7 });
        expect(calls).toEqual([]);
        expect([...viaDispatcher.labels]).toEqual([...direct.labels]);
        expect(viaDispatcher.count).toBe(direct.count);
        // only the CPU port reports iterations; an accelerator's result has none
        expect((viaDispatcher as typeof direct).iterations).toBe(direct.iterations);
    });

    it("lets a throwing label propagation accelerator reject unchanged", async () => {
        const boom = new Error("E_DEVICE_LOST");
        const fake: AlgorithmAccelerator = { kind: "fake", labelPropagation: () => Promise.reject(boom) };
        await expect(accelerated(fake).labelPropagation(cycle())).rejects.toBe(boom);
    });

    describe("labelPropagationSynchronous", () => {
        it("runs the synchronous port with no accelerator", async () => {
            const s = toSnapshot(gnm(30, 80, false, 4));
            const via = await accelerated(null).labelPropagationSynchronous(s, { maxIterations: 20 });
            const direct = indexed.labelPropagationSynchronous(s, { maxIterations: 20 });
            expect([...via.labels]).toEqual([...direct.labels]);
        });

        it("hands the accelerator's labelPropagation the pass cap and the weighting, and nothing else", async () => {
            const s = cycle();
            const answer: LabelResultLike = { labels: Uint32Array.of(0, 0, 0), count: 1, groups: () => [] };
            const seen: unknown[] = [];
            const fake: AlgorithmAccelerator = {
                kind: "fake",
                labelPropagation: (snapshot, received) => (seen.push(snapshot, received), Promise.resolve(answer)),
            };
            expect(await accelerated(fake).labelPropagationSynchronous(s, { maxIterations: 7, weighted: false })).toBe(
                answer,
            );
            expect(seen).toEqual([s, { maxIterations: 7, weighted: false }]);
        });
    });

    describe("triangleCount", () => {
        const s = (): GraphSnapshot => toSnapshot(undirectedFixtures()[7].graph);

        it("runs the port with no accelerator", async () => {
            const snapshot = s();
            const via = await accelerated(null).triangleCount(snapshot);
            const direct = indexed.triangleCount(snapshot);
            expect(via.total).toBe(45);
            expect([...via.coefficient]).toEqual([...direct.coefficient]);
            expect(via.transitivity).toBe(direct.transitivity);
        });

        it("passes an accelerator's coefficient and transitivity through when it returns them", async () => {
            const snapshot = s();
            const coefficient = new Float32Array(snapshot.nodeCount).fill(0.5);
            const fake: AlgorithmAccelerator = {
                kind: "fake",
                triangleCount: () =>
                    Promise.resolve(
                        Object.assign(
                            { perNode: new Uint32Array(snapshot.nodeCount), total: 7 },
                            { coefficient, transitivity: 0.25 },
                        ),
                    ),
            };
            const result = await accelerated(fake).triangleCount(snapshot);
            expect(result.total).toBe(7);
            expect(result.coefficient).toBe(coefficient);
            expect(result.transitivity).toBe(0.25);
        });

        it("computes them from the counts when an accelerator returns only the seam's perNode and total", async () => {
            const snapshot = s();
            const direct = indexed.triangleCount(snapshot);
            const fake: AlgorithmAccelerator = {
                kind: "fake",
                triangleCount: () => Promise.resolve({ perNode: direct.perNode, total: direct.total }),
            };
            const result = await accelerated(fake).triangleCount(snapshot);
            expect([...result.coefficient]).toEqual([...direct.coefficient]);
            expect(result.transitivity).toBe(direct.transitivity);
        });
    });

    describe("allPairsShortestPath", () => {
        function weightedPath(): GraphSnapshot {
            const g = new Graph({ directed: false });
            g.addEdge("a", "b", 2);
            g.addEdge("b", "c", 3);
            return toSnapshot(g);
        }

        function stub(calls: unknown[][]): AlgorithmAccelerator {
            const answer: ApspResultLike = { dist: Float32Array.of(0, 7, 7, 7, 0, 7, 7, 7, 0), n: 3 };
            return {
                kind: "fake",
                allPairsShortestPath: (...a) => (calls.push(a), Promise.resolve(answer)),
            };
        }

        it("runs the CPU port with no accelerator", async () => {
            const s = weightedPath();
            const viaDispatcher = await accelerated(null).allPairsShortestPath(s);
            const direct = indexed.allPairsShortestPath(s);
            expect(viaDispatcher.dist).toEqual(direct.dist);
            expect(viaDispatcher.n).toBe(3);
            expect(viaDispatcher.hasNegativeCycle).toBe(false);
        });

        it("delegates a plain call, with the snapshot alone, and adds the flag", async () => {
            const s = weightedPath();
            const calls: unknown[][] = [];
            const r = await accelerated(stub(calls)).allPairsShortestPath(s);
            expect(calls).toEqual([[s]]);
            expect(calls[0][0]).toBe(s);
            expect(r).toEqual({ dist: Float32Array.of(0, 7, 7, 7, 0, 7, 7, 7, 0), n: 3, hasNegativeCycle: false });
        });

        it("runs the CPU port for every option the accelerator would not honour", async () => {
            const s = weightedPath();
            const calls: unknown[][] = [];
            const dispatcher = accelerated(stub(calls));
            for (const options of [
                { weighted: false },
                { paths: true },
                { method: "floyd-warshall" as const },
                { maxNodes: 10 },
                { weights: new Float64Array(s.arcCount).fill(1) },
            ]) {
                const r = await dispatcher.allPairsShortestPath(s, options);
                expect(r.dist, JSON.stringify(options)).toEqual(indexed.allPairsShortestPath(s, options).dist);
            }
            expect(calls).toEqual([]);
        });

        it("runs the CPU port above the default size bound, whatever the device could hold", async () => {
            const b = new GraphBuilder({ directed: true });
            for (let i = 0; i <= 5792; i++) {
                b.addNode(i);
            }
            const s = b.freeze();
            const calls: unknown[][] = [];
            await expect(async () => accelerated(stub(calls)).allPairsShortestPath(s)).rejects.toThrow(
                /exceeds maxNodes 5792/,
            );
            expect(calls).toEqual([]);
        });

        it("runs the CPU port on an infinite snapshot weight, so both paths refuse it alike", async () => {
            const b = new GraphBuilder({ directed: true });
            b.addEdge(0, 1, Infinity);
            b.addEdge(1, 2, 1);
            const s = b.freeze();
            expect(s.flags.nonNegativeWeights).toBe(true);
            expect(s.flags.finiteWeights).toBe(false);
            const calls: unknown[][] = [];
            await expect(async () => accelerated(stub(calls)).allPairsShortestPath(s)).rejects.toThrow(RangeError);
            expect(calls).toEqual([]);
        });

        it("gives the same flagged NaN result for a negative cycle, with or without an accelerator", async () => {
            const g = new Graph({ directed: true });
            g.addEdge("a", "b", 1);
            g.addEdge("b", "c", 1);
            g.addEdge("c", "a", -10);
            const s = toSnapshot(g);
            const calls: unknown[][] = [];
            for (const acc of [null, stub(calls)]) {
                const r = await accelerated(acc).allPairsShortestPath(s);
                expect(r.hasNegativeCycle).toBe(true);
                expect(r.n).toBe(3);
                expect(Array.from(r.dist).every((x) => Number.isNaN(x))).toBe(true);
            }
            expect(calls).toEqual([]);
        });
    });

    describe("bellmanFord", () => {
        // a -> b (4), a -> c (1), b -> d (-3), c -> d (2): d is cheapest through the negative arc.
        function negativeArc(): GraphSnapshot {
            const g = new Graph({ directed: true });
            g.addEdge("a", "b", 4);
            g.addEdge("a", "c", 1);
            g.addEdge("b", "d", -3);
            g.addEdge("c", "d", 2);
            return toSnapshot(g);
        }

        it("runs the CPU port with no accelerator", async () => {
            const s = negativeArc();
            const r = await accelerated(null).bellmanFord(s, 0);
            const direct = indexed.bellmanFord(s, 0);
            expect(r.dist).toEqual(direct.dist);
            expect(r.predArc).toEqual(direct.predArc);
            expect(r.hasNegativeCycle).toBe(false);
            expect(Array.from(r.pathTo(3))).toEqual([0, 1, 3]);
        });

        it("runs the CPU port for an accelerator without the member", async () => {
            const r = await accelerated({ kind: "fake" }).bellmanFord(negativeArc(), 0);
            expect(r.dist).toBeInstanceOf(Float64Array);
            expect(r.dist[3]).toBe(1);
        });

        it("delegates to the accelerator and decorates its bare result with the path accessors", async () => {
            const s = negativeArc();
            const cpu = indexed.bellmanFord(s, 0);
            const calls: unknown[][] = [];
            const answer: BellmanFordResultLike = {
                dist: Float32Array.from(cpu.dist),
                predArc: cpu.predArc,
                hasNegativeCycle: false,
            };
            const fake: AlgorithmAccelerator = {
                kind: "fake",
                bellmanFord: (...a) => (calls.push(a), Promise.resolve(answer)),
            };
            const options = { cutoff: 10, weights: expandEdges(s, Float32Array.of(4, 1, -3, 2)) };
            const r = await accelerated(fake).bellmanFord(s, 0, options);
            expect(calls).toEqual([[s, 0, options]]);
            expect(r.dist).toBe(answer.dist);
            expect(r.predArc).toBe(answer.predArc);
            expect(r.hasNegativeCycle).toBe(false);
            expect(Array.from(r.pathTo(3))).toEqual(Array.from(cpu.pathTo(3)));
            expect(Array.from(r.pathEdges(3))).toEqual(Array.from(cpu.pathEdges(3)));
        });

        it("passes the accelerator's negative-cycle flag through", async () => {
            const s = negativeArc();
            const fake: AlgorithmAccelerator = {
                kind: "fake",
                bellmanFord: () =>
                    Promise.resolve({ dist: new Float32Array(4), predArc: new Uint32Array(4), hasNegativeCycle: true }),
            };
            expect((await accelerated(fake).bellmanFord(s, 0)).hasNegativeCycle).toBe(true);
        });

        it("runs the CPU port for an f64 weights override, which the accelerator would round to f32", async () => {
            const s = negativeArc();
            const calls: unknown[][] = [];
            const fake: AlgorithmAccelerator = {
                kind: "fake",
                bellmanFord: (...a) => (calls.push(a), Promise.reject(new Error("not expected"))),
            };
            const weights = expandEdges(s, Float64Array.of(4, 0.1, -3, 0.2));
            const r = await accelerated(fake).bellmanFord(s, 0, { weights });
            expect(calls).toEqual([]);
            expect(r.dist[3]).toBe(0.1 + 0.2);
        });

        it("lets a throwing accelerator reject unchanged", async () => {
            const boom = new Error("E_DEVICE_LOST");
            const fake: AlgorithmAccelerator = { kind: "fake", bellmanFord: () => Promise.reject(boom) };
            await expect(accelerated(fake).bellmanFord(negativeArc(), 0)).rejects.toBe(boom);
        });
    });

    describe("the path centralities", () => {
        function sixNodes(): GraphSnapshot {
            // a small undirected graph with several equal shortest paths
            const g = new Graph({ directed: false });
            for (const [u, v] of ["ab", "bc", "cd", "da", "ce", "ef", "df"]) {
                g.addEdge(u, v);
            }
            return toSnapshot(g);
        }

        function multigraph(): GraphSnapshot {
            const b = new GraphBuilder({ directed: false });
            b.addEdge("a", "b");
            b.addEdge("a", "b");
            b.addEdge("b", "c");
            return b.freeze();
        }

        const scores: PageRankResultLike = {
            scores: Float32Array.of(7, 7, 7, 7, 7, 7),
            iterations: 1,
            converged: true,
        };
        const edgeScores = { scores: Float32Array.of(9) };
        const closeness = { ...scores, sourcesUsed: 6 };

        function stub(calls: unknown[][]): AlgorithmAccelerator {
            return {
                kind: "fake",
                betweennessCentrality: (...a) => (calls.push(["betweennessCentrality", ...a]), Promise.resolve(scores)),
                edgeBetweennessCentrality: (...a) => (
                    calls.push(["edgeBetweennessCentrality", ...a]),
                    Promise.resolve(edgeScores)
                ),
                closenessCentrality: (...a) => (calls.push(["closenessCentrality", ...a]), Promise.resolve(closeness)),
            };
        }

        it("runs the CPU ports with no accelerator", async () => {
            const s = sixNodes();
            const cpu = accelerated(null);
            expect((await cpu.betweennessCentrality(s, { normalized: true })).scores).toEqual(
                indexed.betweennessCentrality(s, { normalized: true }).scores,
            );
            expect((await cpu.edgeBetweennessCentrality(s)).scores).toEqual(
                indexed.edgeBetweennessCentrality(s).scores,
            );
            expect((await cpu.closenessCentrality(s, { harmonic: true })).scores).toEqual(
                indexed.closenessCentrality(s, { harmonic: true }).scores,
            );
        });

        it("hands the accelerator the sources the port would run, never a bare or k-only call", async () => {
            const s = sixNodes();
            const calls: unknown[][] = [];
            const dispatcher = accelerated(stub(calls));
            expect(await dispatcher.betweennessCentrality(s, { sources: [0, 3], normalized: true })).toBe(scores);
            expect(await dispatcher.betweennessCentrality(s, { endpoints: false })).toBe(scores);
            expect(await dispatcher.edgeBetweennessCentrality(s, { k: 2 })).toBe(edgeScores);
            expect(await dispatcher.edgeBetweennessCentrality(s)).toBe(edgeScores);
            expect(calls).toEqual([
                ["betweennessCentrality", s, { normalized: true, sources: [0, 3] }],
                // an exact call names every node, so an accelerator's own sampling default cannot apply
                ["betweennessCentrality", s, { normalized: undefined, sources: [0, 1, 2, 3, 4, 5] }],
                // k is drawn here, as indexed.edgeBetweennessCentrality draws it
                ["edgeBetweennessCentrality", s, { normalized: undefined, sources: [2, 1] }],
                ["edgeBetweennessCentrality", s, { normalized: undefined, sources: [0, 1, 2, 3, 4, 5] }],
            ]);
        });

        it("hands closeness an explicit weighted flag, and nothing else", async () => {
            const s = sixNodes();
            const calls: unknown[][] = [];
            const dispatcher = accelerated(stub(calls));
            expect(await dispatcher.closenessCentrality(s)).toBe(closeness);
            expect(await dispatcher.closenessCentrality(s, { weighted: true })).toBe(closeness);
            expect(calls).toEqual([
                ["closenessCentrality", s, { weighted: false }],
                ["closenessCentrality", s, { weighted: true }],
            ]);
        });

        it("hands a sampled closeness the sources the port would run, undirected only", async () => {
            const s = sixNodes();
            const calls: unknown[][] = [];
            const dispatcher = accelerated(stub(calls));
            expect(await dispatcher.closenessCentrality(s, { sources: [0, 3, 3] })).toBe(closeness);
            expect(await dispatcher.closenessCentrality(s, { k: 2, weighted: true })).toBe(closeness);
            expect(calls).toEqual([
                ["closenessCentrality", s, { weighted: false, sources: [0, 3, 3] }],
                // k is drawn here, the same draw indexed.closenessCentrality and betweenness make
                ["closenessCentrality", s, { weighted: true, sources: [2, 1] }],
            ]);
            // directed: the accelerator measures distance FROM the sources, the port TO them, so the port runs
            const b = new GraphBuilder({ directed: true });
            b.addEdge("a", "b");
            b.addEdge("b", "c");
            const d = b.freeze();
            calls.length = 0;
            const r = await dispatcher.closenessCentrality(d, { sources: [2] });
            expect([...r.scores]).toEqual([1 / 2, 1, 0]);
            expect(r.sourcesUsed).toBe(1);
            // the exact directed run still goes: every node is its own source
            await dispatcher.closenessCentrality(d);
            expect(calls).toEqual([["closenessCentrality", d, { weighted: false }]]);
            // a bad sample is refused before the accelerator is reached, synchronously as betweenness refuses one
            expect(() => dispatcher.closenessCentrality(s, { k: 7 })).toThrow(RangeError);
            expect(() => dispatcher.betweennessCentrality(s, { k: 7 })).toThrow(RangeError);
            expect(calls).toEqual([["closenessCentrality", d, { weighted: false }]]);
        });

        it("runs the CPU port for every call the accelerator would answer differently", async () => {
            const s = sixNodes();
            const m = multigraph();
            const calls: unknown[][] = [];
            const dispatcher = accelerated(stub(calls));
            // a multigraph: the port counts parallel edges as one path, the WebGPU kernel as several
            expect((await dispatcher.betweennessCentrality(m)).scores).toEqual(indexed.betweennessCentrality(m).scores);
            expect((await dispatcher.edgeBetweennessCentrality(m)).scores).toEqual(
                indexed.edgeBetweennessCentrality(m).scores,
            );
            // endpoints, which the WebGPU kernel refuses
            expect((await dispatcher.betweennessCentrality(s, { endpoints: true })).scores).toEqual(
                indexed.betweennessCentrality(s, { endpoints: true }).scores,
            );
            // an alive-edge mask, which the seam has no way to pass
            const alive = Uint32Array.of(0b0111111);
            expect((await dispatcher.edgeBetweennessCentrality(s, { alive })).scores).toEqual(
                indexed.edgeBetweennessCentrality(s, { alive }).scores,
            );
            // every closeness option but weighted
            for (const options of [
                { normalized: true },
                { harmonic: true },
                { cutoff: 1 },
                { weighted: true, weights: new Float64Array(s.arcCount).fill(2) },
            ]) {
                expect((await dispatcher.closenessCentrality(s, options)).scores, JSON.stringify(options)).toEqual(
                    indexed.closenessCentrality(s, options).scores,
                );
            }
            expect(calls).toEqual([]);
        });

        it("lets a throwing accelerator reject unchanged", async () => {
            const boom = new Error("E_DEVICE_LOST");
            const fake: AlgorithmAccelerator = { kind: "fake", betweennessCentrality: () => Promise.reject(boom) };
            await expect(accelerated(fake).betweennessCentrality(sixNodes())).rejects.toBe(boom);
        });
    });

    it("carries exactly the methods whose ports exist", () => {
        const dispatcher = accelerated(null) as unknown as Record<string, unknown>;
        const methods = Object.keys(dispatcher).filter((k) => typeof dispatcher[k] === "function");
        expect(methods.sort()).toEqual([
            "adamicAdarPrediction",
            "allPairsShortestPath",
            "bellmanFord",
            "betweennessCentrality",
            "breadthFirstSearch",
            "closenessCentrality",
            "commonNeighborsPrediction",
            "connectedComponents",
            "degrees",
            "depthFirstSearch",
            "edgeBetweennessCentrality",
            "eigenvectorCentrality",
            "girvanNewman",
            "hits",
            "kCoreDecomposition",
            "kargerMinCut",
            "katzCentrality",
            "labelPropagation",
            "labelPropagationSynchronous",
            "leiden",
            "louvain",
            "maxFlow",
            "maximumBipartiteMatching",
            "minSTCut",
            "minimumSpanningTree",
            "pageRank",
            "personalizedPageRank",
            "primMST",
            "sssp",
            "stoerWagner",
            "stronglyConnectedComponents",
            "triangleCount",
            "weaklyConnectedComponents",
        ]);
    });
});

describe("accelerated(acc) routing for PageRank and eigenvector centrality", () => {
    function undirectedPath(): GraphSnapshot {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        return toSnapshot(g);
    }

    function undirectedFrom(edges: readonly (readonly [string, string])[]): GraphSnapshot {
        const b = new GraphBuilder({ directed: false, weighted: false });
        for (const [u, v] of edges) {
            b.addEdge(u, v);
        }
        return b.freeze();
    }

    function triangle(): GraphSnapshot {
        return undirectedFrom([
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
        ]);
    }

    const answer: PageRankResultLike = { scores: Float32Array.of(0.2, 0.3, 0.5), iterations: 4, converged: true };

    function pageRankStub(calls: string[]): AlgorithmAccelerator {
        return {
            kind: "fake",
            pageRank: () => (calls.push("pageRank"), Promise.resolve(answer)),
            personalizedPageRank: () => (calls.push("personalizedPageRank"), Promise.resolve(answer)),
        };
    }

    it("runs PageRank on the CPU when initial ranks or the legacy stopping rule are asked for", async () => {
        const s = cycle();
        const calls: string[] = [];
        const dispatcher = accelerated(pageRankStub(calls));
        const p = Float64Array.of(1, 0, 0);
        for (const options of [{ initialRanks: Float64Array.of(1, 1, 2) }, { convergenceNorm: "max" as const }]) {
            const viaPageRank = await dispatcher.pageRank(s, options);
            expect([...viaPageRank.scores]).toEqual([...indexed.pageRank(s, options).scores]);
            const viaPersonalized = await dispatcher.personalizedPageRank(s, p, options);
            expect([...viaPersonalized.scores]).toEqual([...indexed.personalizedPageRank(s, p, options).scores]);
        }
        expect(calls).toEqual([]);
        await dispatcher.pageRank(s, { convergenceNorm: "l1" });
        await dispatcher.personalizedPageRank(s, p);
        expect(calls).toEqual(["pageRank", "personalizedPageRank"]);
    });

    it("hands PageRank the port's default of weighted: false, so a weighted snapshot gives one answer", async () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 10);
        g.addEdge("a", "c", 1);
        g.addEdge("b", "a", 1);
        g.addEdge("c", "a", 1);
        const s = toSnapshot(g);
        const sent: unknown[] = [];
        const acc: AlgorithmAccelerator = {
            kind: "fake",
            pageRank: (_s, o) => (sent.push(o?.weighted), Promise.resolve(answer)),
            personalizedPageRank: (_s, _p, o) => (sent.push(o?.weighted), Promise.resolve(answer)),
        };
        const dispatcher = accelerated(acc);
        const p = Float64Array.of(1, 0, 0);
        await dispatcher.pageRank(s);
        await dispatcher.personalizedPageRank(s, p);
        await dispatcher.pageRank(s, { weighted: true, dampingFactor: 0.5 });
        await dispatcher.personalizedPageRank(s, p, { weighted: true });
        expect(sent).toEqual([false, false, true, true]);
    });

    it("runs personalized PageRank on the CPU for an all-zero vector or a dangling node", async () => {
        const calls: string[] = [];
        const dispatcher = accelerated(pageRankStub(calls));
        const s = cycle();
        const zero = await dispatcher.personalizedPageRank(s, new Float64Array(3));
        expect([...zero.scores]).toEqual([...indexed.pageRank(s).scores]);
        // c has no out-arc: the port spreads its mass as legacy does, the accelerator as networkx does.
        const g = new Graph({ directed: true });
        g.addEdge("a", "b");
        g.addEdge("b", "a");
        g.addEdge("a", "c");
        const dangling = toSnapshot(g);
        const p = Float64Array.of(1, 0, 0);
        const r = await dispatcher.personalizedPageRank(dangling, p);
        expect([...r.scores]).toEqual([...indexed.personalizedPageRank(dangling, p).scores]);
        expect(calls).toEqual([]);
        await dispatcher.personalizedPageRank(s, p);
        expect(calls).toEqual(["personalizedPageRank"]);
    });

    it("runs personalized PageRank on the CPU with no accelerator", async () => {
        const s = cycle();
        const p = Float64Array.of(0, 2, 0);
        const r = await accelerated(null).personalizedPageRank(s, p);
        expect([...r.scores]).toEqual([...indexed.personalizedPageRank(s, p).scores]);
    });

    it("runs eigenvector centrality on the CPU with no accelerator, raising ConvergenceError as the port does", async () => {
        const s = undirectedPath();
        const r = await accelerated(null).eigenvectorCentrality(s, { maxIterations: 500 });
        expect([...r.scores]).toEqual([...indexed.eigenvectorCentrality(s, { maxIterations: 500 }).scores]);
        await expect(accelerated(null).eigenvectorCentrality(s, { maxIterations: 1 })).rejects.toThrow(
            ConvergenceError,
        );
    });

    function eigenStub(calls: unknown[][], result: ScoresResultLike): AlgorithmAccelerator {
        return {
            kind: "fake",
            eigenvectorCentrality: (...a) => (calls.push(a), Promise.resolve(result)),
        };
    }

    it("hands eigenvector centrality to the accelerator unweighted, and rescales its unit vector like the port", async () => {
        const s = triangle();
        const calls: unknown[][] = [];
        const unit: ScoresResultLike = {
            scores: Float32Array.of(0.5, Math.SQRT1_2, 0.5),
            iterations: 9,
            converged: true,
        };
        const dispatcher = accelerated(eigenStub(calls, unit));

        const raw = await dispatcher.eigenvectorCentrality(s, {
            normalized: false,
            maxIterations: 50,
            tolerance: 1e-4,
        });
        expect(raw).toBe(unit);
        expect(calls[0][0]).toBe(s);
        expect(calls[0][1]).toEqual({ maxIterations: 50, tolerance: 1e-4, weighted: false });

        const scaled = await dispatcher.eigenvectorCentrality(s);
        expect([...scaled.scores]).toEqual([0, 1, 0]);
        expect(scaled.iterations).toBe(9);
        expect(unit.scores[0]).toBeCloseTo(0.5, 6); // the accelerator's vector is not written to
    });

    it("keeps eigenvector centrality on the CPU for what the accelerator does not compute", async () => {
        const calls: unknown[][] = [];
        const unit: ScoresResultLike = { scores: Float32Array.of(1, 1, 1, 1), iterations: 1, converged: true };
        const dispatcher = accelerated(eigenStub(calls, unit));
        const directed = cycle();
        // A directed snapshot in any mode: a periodic cycle oscillates on the accelerator's A.
        for (const mode of ["in", "out", "total"] as const) {
            await dispatcher.eigenvectorCentrality(directed, { mode, maxIterations: 500 });
        }
        await dispatcher.eigenvectorCentrality(triangle(), { startVector: Float64Array.of(1, 2, 3) });
        // A star is bipartite: the iteration on A alternates between two vectors and never
        // converges, where the port, iterating on A + I, does.
        const star = undirectedFrom([
            ["a", "b"],
            ["a", "c"],
            ["a", "d"],
        ]);
        const viaStar = await dispatcher.eigenvectorCentrality(star, { normalized: false });
        expect([...viaStar.scores]).toEqual([...indexed.eigenvectorCentrality(star, { normalized: false }).scores]);
        // A bipartite component beside an odd cycle is still bipartite.
        await dispatcher.eigenvectorCentrality(
            undirectedFrom([
                ["a", "b"],
                ["b", "c"],
                ["c", "a"],
                ["d", "e"],
            ]),
        );
        // Parallel edges: the port counts the neighbour once, the accelerator every arc.
        const multi = new GraphBuilder({ directed: false, weighted: false });
        for (const [u, v] of [
            ["a", "b"],
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
        ]) {
            multi.addEdge(u, v);
        }
        const multigraph = multi.freeze();
        expect(multigraph.flags.multigraph).toBe(true);
        await dispatcher.eigenvectorCentrality(multigraph);
        expect(calls).toEqual([]);

        await dispatcher.eigenvectorCentrality(triangle());
        const selfLoop = undirectedFrom([
            ["a", "a"],
            ["a", "b"],
        ]);
        await dispatcher.eigenvectorCentrality(selfLoop); // a self-loop is an odd cycle
        expect(calls).toHaveLength(2);
    });

    it("rescales an accelerator's all-zero vector to all 0, as the port rescales its own", async () => {
        const b = new GraphBuilder({ directed: false, weighted: false });
        b.addNode("a");
        b.addNode("b");
        const edgeless = b.freeze();
        const calls: unknown[][] = [];
        const zero: ScoresResultLike = { scores: Float32Array.of(0, 0), iterations: 3, converged: true };
        const r = await accelerated(eigenStub(calls, zero)).eigenvectorCentrality(edgeless);
        expect(calls).toHaveLength(1);
        expect([...r.scores]).toEqual([0, 0]);
        expect([...indexed.eigenvectorCentrality(edgeless).scores]).toEqual([0, 0]);
    });

    it("raises ConvergenceError when the accelerator did not converge", async () => {
        const unit: ScoresResultLike = { scores: Float32Array.of(1, 1, 1), iterations: 7, converged: false };
        const dispatcher = accelerated(eigenStub([], unit));
        await expect(dispatcher.eigenvectorCentrality(triangle(), { maxIterations: 7 })).rejects.toThrow(
            "eigenvectorCentrality did not converge in 7 iterations",
        );
    });
});

describe("accelerated(acc) CPU routes for the traversal, community, flow and link families", () => {
    // No accelerator declares these members, so every call runs the port -- with or without one attached.
    // An accelerator for the nearest declared members: reaching any of them fails the test.
    const refuse = (): Promise<never> => Promise.reject(new Error("the accelerator was called"));
    const neighbours: AlgorithmAccelerator = {
        kind: "fake",
        breadthFirstSearch: refuse,
        connectedComponents: refuse,
        weaklyConnectedComponents: refuse,
        louvain: refuse,
        labelPropagation: refuse,
        sssp: refuse,
        edgeBetweennessCentrality: refuse,
        minimumSpanningTree: refuse,
    };
    const directed = toSnapshot(gnm(24, 60, true, 7, true));
    const undirected = toSnapshot(gnm(24, 60, false, 11, true));
    const dispatchers: [string, AcceleratedAlgorithms][] = [
        ["no accelerator", accelerated(null)],
        ["an accelerator whose neighbouring members all reject", accelerated(neighbours)],
    ];

    describe.each(dispatchers)("with %s", (_, d) => {
        it("depthFirstSearch equals the port", async () => {
            const got = await d.depthFirstSearch(directed, 0, { order: "post" });
            const want = indexed.depthFirstSearch(directed, 0, { order: "post" });
            expect(got).toEqual(want);
            expect(got.visitedCount).toBeGreaterThan(1);
        });

        it("depthFirstSearch walks any adjacency view, not only a snapshot", async () => {
            const view = directed.reverse();
            const got = await d.depthFirstSearch(view, 0);
            expect(got).toEqual(indexed.depthFirstSearch(view, 0));
            expect(got).not.toEqual(indexed.depthFirstSearch(directed, 0));
        });

        it("degrees equals the port on both kinds of graph", async () => {
            for (const s of [directed, undirected]) {
                const got = await d.degrees(s);
                const want = indexed.degrees(s);
                expect([...got.inDegree]).toEqual([...want.inDegree]);
                expect([...got.outDegree]).toEqual([...want.outDegree]);
            }
        });

        it("stronglyConnectedComponents equals the port", async () => {
            const got = await d.stronglyConnectedComponents(directed);
            const want = indexed.stronglyConnectedComponents(directed);
            expect(got.count).toBe(want.count);
            expect([...got.labels]).toEqual([...want.labels]);
            expect(got.groups().map((g) => [...g])).toEqual(want.groups().map((g) => [...g]));
        });

        it("stronglyConnectedComponents forwards an arc order", async () => {
            // a -> b and a -> c: trying a's arcs in reverse finishes c before b, so the labels change.
            const g = new Graph({ directed: true });
            g.addEdge("a", "b");
            g.addEdge("a", "c");
            const s = toSnapshot(g);
            const arcOrder = new Uint32Array(s.arcCount);
            for (let u = 0; u < s.nodeCount; u++) {
                for (let k = s.rowPtr[u]; k < s.rowPtr[u + 1]; k++) {
                    arcOrder[k] = s.rowPtr[u] + s.rowPtr[u + 1] - 1 - k;
                }
            }
            const got = await d.stronglyConnectedComponents(s, { arcOrder });
            const want = indexed.stronglyConnectedComponents(s, { arcOrder });
            expect([...got.labels]).toEqual([...want.labels]);
            expect([...got.labels]).not.toEqual([...indexed.stronglyConnectedComponents(s).labels]);
        });

        it("leiden equals the port", async () => {
            const got = await d.leiden(undirected, { randomSeed: 3, resolution: 1.2 });
            const want = indexed.leiden(undirected, { randomSeed: 3, resolution: 1.2 });
            expect([...got.labels]).toEqual([...want.labels]);
            expect(got.count).toBe(want.count);
            expect(got.modularity).toBe(want.modularity);
            expect(got.iterations).toBe(want.iterations);
        });

        it("girvanNewman equals the port", async () => {
            const got = await d.girvanNewman(undirected, { maxCommunities: 3 });
            const want = indexed.girvanNewman(undirected, { maxCommunities: 3 });
            expect(got.levels.map((l) => [...l])).toEqual(want.levels.map((l) => [...l]));
            expect([...got.modularity]).toEqual([...want.modularity]);
            expect(got.levels.length).toBeGreaterThan(1);
        });

        it("maxFlow and minSTCut equal the port, including an exact f64 capacity override", async () => {
            const weights = expandEdges(
                directed,
                Float64Array.from({ length: directed.edgeCount }, (_, i) => 0.1 * (i + 1)),
            );
            const flow = await d.maxFlow(directed, 0, 5, { weights });
            expect(flow).toEqual(indexed.maxFlow(directed, 0, 5, { weights }));
            const cut = await d.minSTCut(directed, 0, 5, { weights });
            expect(cut).toEqual(indexed.minSTCut(directed, 0, 5, { weights }));
            expect(cut.cutValue).toBeCloseTo(flow.maxFlow, 9);
        });

        it("stoerWagner and kargerMinCut equal the port", async () => {
            expect(await d.stoerWagner(undirected)).toEqual(indexed.stoerWagner(undirected));
            const karger = { iterations: 20, randomSeed: 5 };
            expect(await d.kargerMinCut(undirected, karger)).toEqual(indexed.kargerMinCut(undirected, karger));
        });

        it("commonNeighborsPrediction and adamicAdarPrediction equal the port", async () => {
            const cn = await d.commonNeighborsPrediction(undirected, { topK: 5 });
            expect(cn).toEqual(indexed.commonNeighborsPrediction(undirected, { topK: 5 }));
            expect(cn.scores.length).toBe(5);
            const aa = await d.adamicAdarPrediction(undirected, { topK: 5 });
            expect(aa).toEqual(indexed.adamicAdarPrediction(undirected, { topK: 5 }));
        });

        it("primMST equals the port, including an exact f64 weight override", async () => {
            const weights = expandEdges(
                undirected,
                Float64Array.from({ length: undirected.edgeCount }, (_, i) => 0.1 * (i + 1)),
            );
            const options = { start: 3, forest: true, weights };
            const got = await d.primMST(undirected, options);
            const want = indexed.primMST(undirected, options);
            expect([...got.edges]).toEqual([...want.edges]);
            expect([...got.predArc]).toEqual([...want.predArc]);
            expect(got.totalWeight).toBe(want.totalWeight);
            expect(got.edges.length).toBeGreaterThan(1);
        });

        it("maximumBipartiteMatching equals the port", async () => {
            // Left a, b, c; right x, y, z. A perfect matching exists: a-x, b-y, c-z.
            const g = new Graph({ directed: false });
            for (const [u, v] of [
                ["a", "x"],
                ["a", "y"],
                ["b", "x"],
                ["b", "y"],
                ["c", "y"],
                ["c", "z"],
            ]) {
                g.addEdge(u, v);
            }
            const s = toSnapshot(g);
            const got = await d.maximumBipartiteMatching(s);
            const want = indexed.maximumBipartiteMatching(s);
            expect(got.size).toBe(3);
            expect(got.size).toBe(want.size);
            expect([...got.matching]).toEqual([...want.matching]);

            // Explicit sides are passed through: only a and x take part, so one pair, not three.
            const left = makeMask(s.nodeCount);
            const right = makeMask(s.nodeCount);
            maskSet(left, s.ids.indexOf("a"), true);
            maskSet(right, s.ids.indexOf("x"), true);
            const sided = await d.maximumBipartiteMatching(s, { left, right });
            expect(sided.size).toBe(1);
            expect(sided.matching[s.ids.indexOf("a")]).toBe(s.ids.indexOf("x"));
        });

        it("turns a port's throw into a rejection", async () => {
            await expect(d.maxFlow(directed, 0, 0)).rejects.toThrow(RangeError);
            await expect(d.primMST(directed)).rejects.toThrow("requires an undirected graph");
            await expect(d.maximumBipartiteMatching(cycle())).rejects.toThrow("Graph is not bipartite");
        });
    });
});

describe("accelerated(acc) routing for Katz and HITS", () => {
    /** A directed graph whose in-degrees differ, so Katz scores are not all equal. */
    function uneven(weighted = false): GraphSnapshot {
        const b = new GraphBuilder({ directed: true, weighted });
        const edges: [string, string, number][] = [
            ["a", "b", 2],
            ["a", "c", 1],
            ["b", "c", 3],
            ["c", "d", 1],
            ["d", "a", 5],
            ["b", "d", 1],
        ];
        for (const [u, v, w] of edges) {
            if (weighted) {
                b.addEdge(u, v, w);
            } else {
                b.addEdge(u, v);
            }
        }
        return b.freeze();
    }

    /**
     * An accelerator that answers like webgpu-graph-algorithms: the port's own unweighted iterate
     * on a different positive scale -- Katz by its L2 norm, HITS by its sum -- and a weighted one
     * unless told `weighted: false`.
     */
    function deviceLike(calls: unknown[][]): AlgorithmAccelerator {
        const scaled = (x: ArrayLike<number>, norm: "l2" | "sum"): Float32Array => {
            let acc = 0;
            for (let i = 0; i < x.length; i++) {
                acc += norm === "l2" ? x[i] * x[i] : Math.abs(x[i]);
            }
            const scale = norm === "l2" ? Math.sqrt(acc) : acc;
            return Float32Array.from(x, (v) => (scale > 0 ? v / scale : v));
        };
        return {
            kind: "fake",
            katzCentrality: (s, o) => {
                calls.push(["katzCentrality", o]);
                const raw = indexed.katzCentrality(s, { ...o, weighted: o?.weighted !== false, normalized: false });
                return Promise.resolve({ ...raw, scores: scaled(raw.scores, "l2") });
            },
            hits: (s, o) => {
                calls.push(["hits", o]);
                const raw = indexed.hits(s, { ...o, weighted: o?.weighted !== false });
                return Promise.resolve({
                    ...raw,
                    hubs: scaled(raw.hubs, "sum"),
                    authorities: scaled(raw.authorities, "sum"),
                });
            },
        };
    }

    function expectClose(actual: ArrayLike<number>, expected: ArrayLike<number>): void {
        expect(actual.length).toBe(expected.length);
        for (let i = 0; i < expected.length; i++) {
            expect(actual[i]).toBeCloseTo(expected[i], 5); // the accelerator answers in f32
        }
    }

    it("hands Katz the coefficients unweighted and min-max rescales the answer like the port", async () => {
        const calls: unknown[][] = [];
        const s = uneven(true);
        const options = { alpha: 0.05, beta: 2, maxIterations: 200, tolerance: 1e-9 };
        const r = await accelerated(deviceLike(calls)).katzCentrality(s, options);
        expect(calls).toEqual([["katzCentrality", { ...options, weighted: false }]]);
        expectClose(r.scores, indexed.katzCentrality(s, options).scores);
        expect(Math.min(...r.scores)).toBe(0);
        expect(Math.max(...r.scores)).toBe(1);
    });

    it("hands Katz weighted: true through when the caller asks for it", async () => {
        const calls: unknown[][] = [];
        const s = uneven(true);
        const r = await accelerated(deviceLike(calls)).katzCentrality(s, { weighted: true, alpha: 0.05 });
        expect(calls[0][1]).toMatchObject({ weighted: true });
        expectClose(r.scores, indexed.katzCentrality(s, { weighted: true, alpha: 0.05 }).scores);
    });

    it("keeps Katz on the port for raw sums, alpha 0 and a graph whose in-degrees are all equal", async () => {
        const calls: unknown[][] = [];
        const dispatcher = accelerated(deviceLike(calls));
        const s = uneven();
        const raw = await dispatcher.katzCentrality(s, { normalized: false });
        expect([...raw.scores]).toEqual([...indexed.katzCentrality(s, { normalized: false }).scores]);
        const flat = await dispatcher.katzCentrality(s, { alpha: 0 });
        expect([...flat.scores]).toEqual([1, 1, 1, 1]);
        const regular = await dispatcher.katzCentrality(cycle());
        expect([...regular.scores]).toEqual([...indexed.katzCentrality(cycle()).scores]);
        expect(calls).toEqual([]);
    });

    it("sends Katz to the accelerator when only the in-WEIGHTS differ", async () => {
        const calls: unknown[][] = [];
        const b = new GraphBuilder({ directed: true, weighted: true });
        b.addEdge("a", "b", 1);
        b.addEdge("b", "c", 2);
        b.addEdge("c", "a", 3);
        const s = b.freeze();
        const dispatcher = accelerated(deviceLike(calls));
        await dispatcher.katzCentrality(s); // unweighted: every in-degree is 1
        expect(calls).toEqual([]);
        const r = await dispatcher.katzCentrality(s, { weighted: true });
        expect(calls).toHaveLength(1);
        expectClose(r.scores, indexed.katzCentrality(s, { weighted: true }).scores);
    });

    it("keeps Katz on the port when its series may diverge: alpha times the spectral-radius bound reaches 1", async () => {
        // A hub joined both ways to sixteen leaves has spectral radius sqrt(16) = 4, and the bound
        // is that exactly: at alpha 0.25 the series may diverge, where an f32 iteration with no
        // normaliser can overflow, so the port answers. Just below it the accelerator is asked.
        const g = new Graph({ directed: true });
        for (let i = 0; i < 16; i++) {
            g.addEdge(`leaf${String(i)}`, "hub");
            g.addEdge("hub", `leaf${String(i)}`);
        }
        const s = toSnapshot(g);
        const calls: unknown[][] = [];
        const dispatcher = accelerated(deviceLike(calls));
        const onPort = await dispatcher.katzCentrality(s, { alpha: 0.25 });
        expect(calls).toEqual([]);
        expect([...onPort.scores]).toEqual([...indexed.katzCentrality(s, { alpha: 0.25 }).scores]);
        await dispatcher.katzCentrality(s, { alpha: 0.24 });
        expect(calls).toHaveLength(1);
    });

    it("sends Katz to the accelerator at the default alpha past a hub of ten or more in-arcs", async () => {
        // The largest in-arc count (16) would bound the radius above 1 / 0.1; the radius is 4.
        const g = new Graph({ directed: true });
        for (let i = 0; i < 16; i++) {
            g.addEdge(`leaf${String(i)}`, "hub");
            g.addEdge("hub", `leaf${String(i)}`);
        }
        const calls: unknown[][] = [];
        await accelerated(deviceLike(calls)).katzCentrality(toSnapshot(g), { alpha: 0.1 });
        expect(calls).toHaveLength(1);
    });

    it("hands HITS the iteration options unweighted and rescales both vectors to unit length like the port", async () => {
        const calls: unknown[][] = [];
        const s = uneven(true);
        const r = await accelerated(deviceLike(calls)).hits(s, { maxIterations: 300, tolerance: 1e-10 });
        expect(calls).toEqual([["hits", { maxIterations: 300, tolerance: 1e-10, weighted: false }]]);
        const port = indexed.hits(s, { maxIterations: 300, tolerance: 1e-10 });
        expectClose(r.hubs, port.hubs);
        expectClose(r.authorities, port.authorities);
    });

    it("rescales HITS to a largest entry of 1 under normalized: false, like the port", async () => {
        const s = uneven();
        const r = await accelerated(deviceLike([])).hits(s, {
            normalized: false,
            tolerance: 1e-10,
            maxIterations: 300,
        });
        const port = indexed.hits(s, { normalized: false, tolerance: 1e-10, maxIterations: 300 });
        expectClose(r.hubs, port.hubs);
        expectClose(r.authorities, port.authorities);
        expect(Math.max(...r.hubs)).toBeCloseTo(1, 12);
    });

    it("leaves an accelerator's all-zero HITS vectors at zero, as the port does", async () => {
        const b = new GraphBuilder({ directed: true, weighted: false });
        b.addNode("a");
        b.addNode("b");
        const edgeless = b.freeze();
        const r = await accelerated(deviceLike([])).hits(edgeless);
        expect([...r.hubs]).toEqual([...indexed.hits(edgeless).hubs]);
        expect([...r.authorities]).toEqual([0, 0]);
    });
});
