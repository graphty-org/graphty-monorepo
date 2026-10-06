/**
 * The rules every algorithm shares, whichever package or device runs it: edge weights are read when the graph has
 * them and `weighted: false` turns them off, and a power iteration stops at the first pass whose summed (L1)
 * change is below `tolerance` relative to the vector (PageRank, HITS) or `nodeCount * tolerance` (Katz).
 */

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { accelerated, type AlgorithmAccelerator, type ScoresResultLike, type SsspOptions } from "../../../src/index.js";
import {
    betweennessCentrality,
    closenessCentrality,
    dijkstra,
    edgeBetweennessCentrality,
    eigenvectorCentrality,
    hits,
    katzCentrality,
    louvain,
    pageRank,
} from "../../../src/indexed/index.js";

function snapshot(
    edges: readonly (readonly [number, number, number?])[],
    nodeCount: number,
    directed: boolean,
): GraphSnapshot {
    const weighted = edges.some((e) => e[2] !== undefined);
    return fromEdgeArrays({
        src: Uint32Array.from(edges, (e) => e[0]),
        dst: Uint32Array.from(edges, (e) => e[1]),
        nodeCount,
        directed,
        ...(weighted ? { weights: Float64Array.from(edges, (e) => e[2] ?? 1) } : {}),
    });
}

/** The same graph with its weights dropped. */
function unweighted(
    edges: readonly (readonly [number, number, number?])[],
    n: number,
    directed: boolean,
): GraphSnapshot {
    return snapshot(
        edges.map(([u, v]) => [u, v] as const),
        n,
        directed,
    );
}

// A directed graph whose weights change every weighted answer: node 0 sends most of its weight to 1.
const DIRECTED: [number, number, number][] = [
    [0, 1, 9],
    [0, 2, 1],
    [1, 2, 2],
    [2, 0, 1],
    [2, 3, 5],
    [3, 0, 1],
    [1, 3, 1],
];

// An undirected graph with integer weights, so every shortest-path sum is exact.
const UNDIRECTED: [number, number, number][] = [
    [0, 1, 1],
    [1, 2, 1],
    [0, 2, 5],
    [2, 3, 2],
    [3, 4, 1],
    [2, 4, 4],
    [4, 5, 3],
    [1, 5, 7],
    [0, 5, 2],
];

function l1(a: ArrayLike<number>, b: ArrayLike<number>): number {
    let d = 0;
    for (let i = 0; i < a.length; i++) {
        d += Math.abs(a[i] - b[i]);
    }
    return d;
}

describe("one weight rule", () => {
    const directed = snapshot(DIRECTED, 4, true);
    const directedPlain = unweighted(DIRECTED, 4, true);

    it("reads the weights by default in every power iteration, and ignores them on weighted: false", () => {
        const runs: [string, (s: GraphSnapshot, o: { weighted?: boolean }) => ArrayLike<number>][] = [
            ["pageRank", (s, o) => pageRank(s, o).scores],
            ["katzCentrality", (s, o) => katzCentrality(s, o).scores],
            ["hits", (s, o) => hits(s, o).authorities],
            ["eigenvectorCentrality", (s, o) => eigenvectorCentrality(s, { ...o, maxIterations: 1000 }).scores],
            ["closenessCentrality", (s, o) => closenessCentrality(s, o).scores],
        ];
        for (const [name, run] of runs) {
            expect([...run(directed, {})], name).toEqual([...run(directed, { weighted: true })]);
            expect([...run(directed, { weighted: false })], name).toEqual([...run(directedPlain, {})]);
            expect(l1(run(directed, {}), run(directedPlain, {})), name).toBeGreaterThan(1e-3);
        }
    });

    it("lets weighted: false turn off the weights of a shortest-path search and a clustering", () => {
        const s = snapshot(UNDIRECTED, 6, false);
        const plain = unweighted(UNDIRECTED, 6, false);
        expect([...dijkstra(s, 0, { weighted: false }).dist]).toEqual([...dijkstra(plain, 0).dist]);
        expect([...dijkstra(s, 0).dist]).toEqual([0, 1, 2, 4, 5, 2]);
        expect([...louvain(s, { weighted: false }).labels]).toEqual([...louvain(plain).labels]);
    });

    it("weights eigenvector centrality by the arc weights", () => {
        // Power iteration on (W + I) by hand, to unit length, then min-max rescaled as the port does.
        const s = snapshot(UNDIRECTED, 6, false);
        const n = 6;
        let x = new Float64Array(n).fill(1);
        for (let it = 0; it < 2000; it++) {
            const next = Float64Array.from(x);
            for (const [u, v, w] of UNDIRECTED) {
                next[u] += w * x[v];
                next[v] += w * x[u];
            }
            const norm = Math.hypot(...next);
            x = next.map((value) => value / norm);
        }
        const min = Math.min(...x);
        const max = Math.max(...x);
        const expected = Array.from(x, (value) => (value - min) / (max - min));
        const r = eigenvectorCentrality(s, { maxIterations: 2000, tolerance: 1e-12 });
        r.scores.forEach((value, i) => {
            expect(value).toBeCloseTo(expected[i], 8);
        });
    });

    it("counts shortest paths by weight in betweenness", () => {
        // 0 - 1 - 2 costs 2 against 5 for the direct edge 0 - 2, so 1 lies between 0 and 2.
        const triangle = snapshot(
            [
                [0, 1, 1],
                [1, 2, 1],
                [0, 2, 5],
            ],
            3,
            false,
        );
        expect([...betweennessCentrality(triangle).scores]).toEqual([0, 1, 0]);
        expect([...betweennessCentrality(triangle, { weighted: false }).scores]).toEqual([0, 0, 0]);
        expect([...edgeBetweennessCentrality(triangle).scores]).toEqual([2, 2, 0]);
        expect([...edgeBetweennessCentrality(triangle, { weighted: false }).scores]).toEqual([1, 1, 1]);
    });

    it("matches a brute-force weighted betweenness, directed and undirected", () => {
        for (const isDirected of [false, true]) {
            const s = snapshot(UNDIRECTED, 6, isDirected);
            const expected = bruteForceBetweenness(UNDIRECTED, 6, isDirected);
            const r = betweennessCentrality(s);
            r.scores.forEach((value, i) => {
                expect(value, `directed ${String(isDirected)} node ${String(i)}`).toBeCloseTo(expected[i], 10);
            });
        }
    });

    it("refuses a negative weight in betweenness", () => {
        const s = snapshot(
            [
                [0, 1, -1],
                [1, 2, 1],
            ],
            3,
            false,
        );
        expect(() => betweennessCentrality(s)).toThrow(expect.objectContaining({ code: "E_BAD_WEIGHT" }));
        expect([...betweennessCentrality(s, { weighted: false }).scores]).toEqual([0, 1, 0]);
    });
});

/**
 * Node betweenness from all-pairs distances and path counts: v lies on a shortest s-t path when
 * d(s, v) + d(v, t) = d(s, t), and carries sigma(s, v) sigma(v, t) / sigma(s, t) of the pair.
 */
function bruteForceBetweenness(
    edges: readonly (readonly [number, number, number])[],
    n: number,
    isDirected: boolean,
): number[] {
    const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
    for (const [u, v, w] of edges) {
        d[u][v] = Math.min(d[u][v], w);
        if (!isDirected) {
            d[v][u] = Math.min(d[v][u], w);
        }
    }
    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j]);
            }
        }
    }
    // sigma[s][t]: the number of shortest s-t paths, by the last arc into t, in order of distance from s.
    const sigma = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (let src = 0; src < n; src++) {
        const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => d[src][a] - d[src][b]);
        sigma[src][src] = 1;
        for (const t of order) {
            if (t === src || d[src][t] === Infinity) {
                continue;
            }
            for (const [u, v, w] of edges) {
                for (const [a, b] of isDirected
                    ? [[u, v]]
                    : [
                          [u, v],
                          [v, u],
                      ]) {
                    if (b === t && d[src][a] + w === d[src][t]) {
                        sigma[src][t] += sigma[src][a];
                    }
                }
            }
        }
    }
    const scores = new Array<number>(n).fill(0);
    for (let src = 0; src < n; src++) {
        for (let t = 0; t < n; t++) {
            if (src === t || d[src][t] === Infinity) {
                continue;
            }
            for (let v = 0; v < n; v++) {
                if (v !== src && v !== t && d[src][v] + d[v][t] === d[src][t]) {
                    scores[v] += (sigma[src][v] * sigma[v][t]) / sigma[src][t];
                }
            }
        }
    }
    return scores.map((x) => (isDirected ? x : x / 2));
}

describe("one convergence rule", () => {
    const s = snapshot(DIRECTED, 4, true);
    const n = s.nodeCount;
    const tolerance = 1e-4;

    /** Summed size of a vector. */
    function size(x: ArrayLike<number>): number {
        let total = 0;
        for (let i = 0; i < x.length; i++) {
            total += Math.abs(x[i]);
        }
        return total;
    }

    /**
     * The first pass whose L1 change is below `limit(current)`, from the iterates the run itself produces.
     * @param iterate - The run cut off after a number of passes
     * @param start - The iterate before the first pass
     * @param limit - The threshold the change of a pass is held to
     * @returns The pass
     */
    function expectedStop(
        iterate: (passes: number) => ArrayLike<number>,
        start: ArrayLike<number>,
        limit: (current: ArrayLike<number>) => number,
    ): number {
        let previous = start;
        for (let pass = 1; pass <= 200; pass++) {
            const current = iterate(pass);
            if (l1(current, previous) < limit(current)) {
                return pass;
            }
            previous = current;
        }
        throw new Error("did not stop");
    }

    it("stops PageRank and HITS at the first pass whose L1 change is below tolerance times the vector's size", () => {
        // PageRank's scores sum to 1, so its limit is the tolerance itself.
        const pr = (passes: number): ArrayLike<number> => pageRank(s, { maxIterations: passes, tolerance: 0 }).scores;
        expect(pageRank(s, { tolerance }).iterations).toBe(
            expectedStop(pr, new Float64Array(n).fill(1 / n), () => tolerance),
        );

        // HITS measures the change of both vectors together, against their summed size.
        const both = (passes: number): ArrayLike<number> => {
            const r = hits(s, { maxIterations: passes, tolerance: 0 });
            return [...r.hubs, ...r.authorities];
        };
        const start = new Float64Array(2 * n).fill(1 / Math.sqrt(n));
        expect(hits(s, { tolerance }).iterations).toBe(expectedStop(both, start, (x) => tolerance * size(x)));
    });

    it("stops Katz at the first pass whose L1 change is below nodeCount * tolerance", () => {
        // Every Katz score is at least beta (1 by default), so the vector's size is at least nodeCount.
        const katz = (passes: number): ArrayLike<number> =>
            katzCentrality(s, { maxIterations: passes, tolerance: 0, normalized: false }).scores;
        expect(katzCentrality(s, { tolerance }).iterations).toBe(
            expectedStop(katz, new Float64Array(n).fill(1), () => n * tolerance),
        );
    });
});

describe("the convergence rule holds the error to the tolerance on a large graph", () => {
    // 100,000 nodes and about 500,000 random arcs from a fixed seed (mulberry32).
    const n = 100_000;
    let state = 12_345;
    const random = (): number => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), state | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
    const src: number[] = [];
    const dst: number[] = [];
    for (let arc = 0; arc < 5 * n; arc++) {
        const u = Math.floor(random() * n);
        const v = Math.floor(random() * n);
        if (u !== v) {
            src.push(u);
            dst.push(v);
        }
    }
    const s = fromEdgeArrays({ src: Uint32Array.from(src), dst: Uint32Array.from(dst), nodeCount: n, directed: true });

    /** Summed difference from a reference, relative to the reference's summed size. */
    function relativeError(x: ArrayLike<number>, reference: ArrayLike<number>): number {
        let size = 0;
        for (let i = 0; i < reference.length; i++) {
            size += Math.abs(reference[i]);
        }
        return l1(x, reference) / size;
    }

    // With nodeCount * tolerance as the limit, PageRank stopped after 3 passes here with a summed error of 2.7e-2,
    // and HITS after 22 with 4.8e-4.
    it("PageRank at the default tolerance lands within a small summed error of a fully converged run", () => {
        const reference = pageRank(s, { convergenceNorm: "max", tolerance: 1e-15, maxIterations: 1000 });
        expect(reference.converged).toBe(true);
        const r = pageRank(s);
        expect(r.converged).toBe(true);
        expect(relativeError(r.scores, reference.scores)).toBeLessThan(1e-5);
    }, 30_000);

    it("HITS at the default tolerance lands within a small summed error of a fully converged run", () => {
        const reference = hits(s, { tolerance: 1e-14, maxIterations: 5000 });
        expect(reference.converged).toBe(true);
        const r = hits(s);
        expect(r.converged).toBe(true);
        expect(relativeError(r.hubs, reference.hubs)).toBeLessThan(1e-4);
        expect(relativeError(r.authorities, reference.authorities)).toBeLessThan(1e-4);
    }, 30_000);
});

describe("the dispatcher follows the same rules", () => {
    const s = snapshot(UNDIRECTED, 6, false);

    it("runs a weighted betweenness on the CPU, and an unweighted one on the accelerator", async () => {
        const calls: unknown[] = [];
        const answer: ScoresResultLike = { scores: new Float64Array(6), iterations: 6, converged: true };
        const acc: AlgorithmAccelerator = {
            kind: "fake",
            betweennessCentrality: (_s, o) => (calls.push(o), Promise.resolve(answer)),
        };
        const dispatcher = accelerated(acc);
        const weighted = await dispatcher.betweennessCentrality(s);
        expect([...weighted.scores]).toEqual([...betweennessCentrality(s).scores]);
        expect(calls).toEqual([]);
        expect(await dispatcher.betweennessCentrality(s, { weighted: false })).toBe(answer);
        expect(calls).toEqual([{ normalized: undefined, sources: [0, 1, 2, 3, 4, 5], weighted: false }]);
    });

    it("hands eigenvector centrality, Katz, HITS and closeness the weights the CPU would read", async () => {
        const sent: unknown[] = [];
        const unit: ScoresResultLike = { scores: Float64Array.of(1, 2, 3, 4, 5, 6), iterations: 1, converged: true };
        const acc: AlgorithmAccelerator = {
            kind: "fake",
            eigenvectorCentrality: (_s, o) => (sent.push(["eigenvector", o?.weighted]), Promise.resolve(unit)),
            hits: (_s, o) => (
                sent.push(["hits", o?.weighted]),
                Promise.resolve({ hubs: unit.scores, authorities: unit.scores, iterations: 1, converged: true })
            ),
            closenessCentrality: (_s, o) => (
                sent.push(["closeness", o?.weighted]),
                Promise.resolve({ ...unit, sourcesUsed: 6 })
            ),
        };
        const dispatcher = accelerated(acc);
        await dispatcher.eigenvectorCentrality(s);
        await dispatcher.hits(s);
        await dispatcher.closenessCentrality(s);
        await dispatcher.eigenvectorCentrality(s, { weighted: false });
        await dispatcher.hits(s, { weighted: false });
        await dispatcher.closenessCentrality(s, { weighted: false });
        expect(sent).toEqual([
            ["eigenvector", true],
            ["hits", true],
            ["closeness", true],
            ["eigenvector", false],
            ["hits", false],
            ["closeness", false],
        ]);
    });

    it("hands a shortest-path search weighted: false through to the accelerator", async () => {
        const sent: (SsspOptions | undefined)[] = [];
        const acc: AlgorithmAccelerator = {
            kind: "fake",
            sssp: (_s, _source, o) => (
                sent.push(o),
                Promise.resolve({ dist: new Float64Array(6), predArc: new Uint32Array(6) })
            ),
        };
        await accelerated(acc).sssp(s, 0, { weighted: false });
        expect(sent).toEqual([{ weighted: false }]);
    });
});
