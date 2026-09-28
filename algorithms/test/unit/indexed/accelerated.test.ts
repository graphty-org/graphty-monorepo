import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { Graph } from "../../../src/core/graph.js";
import {
    accelerated,
    type AcceleratedAlgorithms,
    type AlgorithmAccelerator,
    type ApspResultLike,
    type BfsResultLike,
    indexed,
    type LabelResultLike,
    type MstResultLike,
    type PageRankResultLike,
    type SsspResultLike,
    toSnapshot,
} from "../../../src/index.js";

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
                args: [s, options],
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
                args: [s, options],
                sentinel: mst,
            },
        ];

        it.each(rows)("$method", async ({ method, fake, run, args, sentinel }) => {
            const log: unknown[][] = [];
            const result = await run(accelerated(fake(log)));
            expect(log).toHaveLength(1);
            expect(log[0]).toHaveLength(args.length);
            args.forEach((arg, i) => expect(log[0][i]).toBe(arg));
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
        expect((await dispatcher.kCoreDecomposition(undirected)).coreness[0]).toBe(9);
        expect((await dispatcher.katzCentrality(s)).scores).toBeInstanceOf(Float32Array);
        expect((await dispatcher.hits(s)).hubs).toBeInstanceOf(Float32Array);
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

    it("hands label propagation to an accelerator with the same snapshot and options object", async () => {
        const s = cycle();
        const options = { maxIterations: 3, randomSeed: 5, weighted: false };
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

    it("lets a throwing label propagation accelerator reject unchanged", async () => {
        const boom = new Error("E_DEVICE_LOST");
        const fake: AlgorithmAccelerator = { kind: "fake", labelPropagation: () => Promise.reject(boom) };
        await expect(accelerated(fake).labelPropagation(cycle())).rejects.toBe(boom);
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

    it("carries exactly the twelve methods whose ports exist", () => {
        const dispatcher = accelerated(null) as unknown as Record<string, unknown>;
        const methods = Object.keys(dispatcher).filter((k) => typeof dispatcher[k] === "function");
        expect(methods.sort()).toEqual([
            "allPairsShortestPath",
            "breadthFirstSearch",
            "connectedComponents",
            "hits",
            "kCoreDecomposition",
            "katzCentrality",
            "labelPropagation",
            "louvain",
            "minimumSpanningTree",
            "pageRank",
            "sssp",
            "weaklyConnectedComponents",
        ]);
    });
});
