/**
 * @file The cost estimate held against a stopwatch.
 *
 * Every other cost test checks the estimate's arithmetic. This one checks that the arithmetic
 * describes the real work: it runs the algorithm the element runs, with the options the element
 * passes, over a graph built by the element's own conversion (`toAlgorithmGraph`, which every run
 * pays for), times it, and compares that to `estimateCost`.
 *
 * It replaces the graphty app's `metricCost.test.ts`, deleted with the app's cost model when the
 * element took estimation over. That test pinned six hand-recorded PageRank timings (2,000 to
 * 200,000 nodes, m = 5n) and required estimate / measured to lie in [0.95, 4]. It was the only
 * thing that caught the app's PageRank row being optimistic by up to 6.9x, and nothing replaced
 * it: the element's rates were copied from it and never measured again.
 *
 * ## Why a live stopwatch is steady enough for CI
 *
 * - Each algorithm is run once untimed on its smaller graph first, so the JIT is warm.
 * - Each size keeps the fastest of three runs. Load from other processes (other vitest workers,
 *   other jobs) only ever adds time, so the minimum is the steadiest reading of the work itself.
 *   Sizes are chosen so one run takes roughly 0.05 to 1 s here: long enough that timer noise is
 *   small, short enough that the whole file stays near 40 s on the reference machine.
 * - CI machines are slower, and the default rates are absolute. So the estimate is made with the
 *   element's own calibration (`calibrateCost`): a fixed synthetic workload timed in this process,
 *   divided by what that workload does on the machine the defaults were fitted on, scales every
 *   rate by this machine's speed. On the fitting machine the calibration is the defaults (the
 *   test prints the factor when `COST_GUARD_VERBOSE` is set); on a machine twice as slow every
 *   estimate doubles. The probe is re-run on both sides of each size's runs and its fastest
 *   reading kept, for the same reason the runs keep their fastest (see `machineSpeed`).
 *
 * Rows on other graph shapes are the worst cases found for each model when it was fitted: a model
 * can be tight on the default random graph and optimistic elsewhere, and only a row on the shape
 * where it is weakest shows that.
 *
 * What is timed is the element's `measure()` minus its progress reports and its chunked read of
 * the result back out, which is O(n) and small beside everything measured here.
 */

import {
    betweennessCentrality,
    closenessCentrality,
    ConvergenceError,
    eigenvectorCentrality,
    type Graph as AlgorithmGraph,
    louvain,
    pageRank,
} from "@graphty/algorithms";
import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { assert, beforeAll, describe, it } from "vitest";

import { toAlgorithmGraph } from "../../../src/algorithms/utils/snapshotGraph";
import { algorithmByKey } from "../../../src/catalog/algorithms";
import type { AlgorithmKey } from "../../../src/catalog/types";
import type { DataManager } from "../../../src/managers/DataManager";
import { calibrateCost, DEFAULT_COST_RATES, estimateCost, type MachineCalibration } from "../../../src/session/cost";
import type { CostRates } from "../../../src/session/cost/estimate";
import type { GraphStatistics } from "../../../src/session/types";

/**
 * How far UNDER the stopwatch an estimate may sit, as estimate / measured. Carried over from the
 * app's test unchanged. Too optimistic is the failure that costs a reader a locked tab with no
 * progress, no cancel and no repaint, so almost none is allowed; the 5% is rounding of a rate
 * pinned at the floor of its measured band.
 */
const MAX_OPTIMISM = 0.95;

/**
 * How far OVER the stopwatch an estimate may sit, as estimate / measured. Carried over unchanged.
 * Caution is the allowed direction, but a model that quotes minutes for a two-second run teaches
 * the reader to click through every confirmation.
 */
const MAX_PESSIMISM = 4;

/** One algorithm the element gates on cost, and how the element runs it. */
interface Row {
    /** The catalogue key the estimate is made for. */
    readonly key: AlgorithmKey;
    /** The graph orientation the element's wrapper asks `algorithmGraph` for. */
    readonly mode: "directed" | "undirected";
    /** Node counts to measure at, smallest first. */
    readonly sizes: readonly number[];
    /** The graph measured at each size. Defaults to a sparse random graph with m = 5n. */
    readonly shape?: Shape;
    /** What the graph is, when it is not the default, for the test's name. */
    readonly shapeName?: string;
    /** The work the element's wrapper does after building the graph, with its default options. */
    readonly run: (graph: AlgorithmGraph, nodes: number) => unknown;
    /**
     * Why the pessimism bound is not asserted on this row, when it is not. The optimism bound
     * always is: a row like this exists to prove the estimate stays SAFE on a graph where the
     * estimate cannot also be tight.
     */
    readonly optimismOnly?: string;
}

/** The edges of a graph on `nodes` nodes, as two parallel endpoint arrays. */
type Shape = (nodes: number) => { src: Uint32Array<ArrayBuffer>; dst: Uint32Array<ArrayBuffer> };

/**
 * A sparse random simple graph, the same every run.
 * @param edgesPerNode - Edges per node, each a distinct unordered pair with no self-loop.
 * @returns The shape.
 */
function random(edgesPerNode: number): Shape {
    return (nodes) => {
        const edges = Math.floor(nodes * edgesPerNode);
        let state = 1;
        const next = (): number => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

            return Math.floor((state / 2 ** 32) * nodes);
        };

        const src = new Uint32Array(edges);
        const dst = new Uint32Array(edges);
        const seen = new Set<number>();
        for (let edge = 0; edge < edges; ) {
            const a = next();
            const b = next();
            const pair = Math.min(a, b) * nodes + Math.max(a, b);
            if (a !== b && !seen.has(pair)) {
                seen.add(pair);
                src[edge] = a;
                dst[edge] = b;
                edge++;
            }
        }

        return { src, dst };
    };
}

/**
 * A graph given by a rule for its edges.
 * @param edges - The edges, as endpoint pairs.
 * @returns The endpoint arrays.
 */
function fromPairs(edges: readonly (readonly [number, number])[]): {
    src: Uint32Array<ArrayBuffer>;
    dst: Uint32Array<ArrayBuffer>;
} {
    return { src: Uint32Array.from(edges, ([a]) => a), dst: Uint32Array.from(edges, ([, b]) => b) };
}

/** A path: the longest shortest paths, and a graph power iteration never converges on. */
const path: Shape = (nodes) => fromPairs(Array.from({ length: nodes - 1 }, (_, i) => [i, i + 1] as const));

/** A star: one hub adjacent to every other node. */
const star: Shape = (nodes) => fromPairs(Array.from({ length: nodes - 1 }, (_, i) => [0, i + 1] as const));

/** A square grid on the largest square at most `nodes`: bipartite, so power iteration oscillates. */
const grid: Shape = (nodes) => {
    const side = Math.floor(Math.sqrt(nodes));
    const edges: (readonly [number, number])[] = [];
    for (let node = 0; node < side * side; node++) {
        if ((node + 1) % side !== 0) {
            edges.push([node, node + 1]);
        }

        if (node + side < side * side) {
            edges.push([node, node + side]);
        }
    }

    return fromPairs(edges);
};

/**
 * A graph from pairs a seeded generator proposes, keeping each unordered pair once and no self-loop.
 * @param seed - The generator's seed.
 * @param propose - Adds candidate pairs through `add`, drawing from `draw` (uniform in [0, 1)).
 * @returns The endpoint arrays.
 */
function seeded(
    seed: number,
    propose: (add: (a: number, b: number) => void, draw: () => number) => void,
): ReturnType<Shape> {
    let state = seed;
    const draw = (): number => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    const seen = new Set<string>();
    const edges: (readonly [number, number])[] = [];
    propose((a, b) => {
        const pair = a < b ? `${a},${b}` : `${b},${a}`;
        if (a !== b && !seen.has(pair)) {
            seen.add(pair);
            edges.push([a, b]);
        }
    }, draw);

    return fromPairs(edges);
}

/** Preferential attachment, three edges per new node: a few hubs and a long tail. */
const scaleFree: Shape = (nodes) =>
    seeded(4, (add, draw) => {
        const ends = [0, 1];
        add(0, 1);
        for (let node = 2; node < nodes; node++) {
            for (let k = 0; k < Math.min(3, node); k++) {
                const other = ends[Math.floor(draw() * ends.length)];
                add(node, other);
                ends.push(node, other);
            }
        }
    });

/** Blocks of 50 nodes, about 8 edges per node inside its block and 2 to anywhere. */
const planted: Shape = (nodes) =>
    seeded(10, (add, draw) => {
        for (let edge = 0; edge < 4 * nodes; edge++) {
            const a = Math.floor(draw() * nodes);
            add(a, Math.floor(a / 50) * 50 + Math.floor(draw() * 50));
        }

        for (let edge = 0; edge < nodes; edge++) {
            add(Math.floor(draw() * nodes), Math.floor(draw() * nodes));
        }
    });

/** Cliques of 10 nodes, each joined to the next by one edge. */
const cliqueRing: Shape = (nodes) =>
    seeded(1, (add) => {
        for (let base = 0; base + 10 <= nodes; base += 10) {
            for (let i = 0; i < 10; i++) {
                for (let j = i + 1; j < 10; j++) {
                    add(base + i, base + j);
                }
            }

            add(base, (base + 10) % nodes);
        }
    });

/** Eigenvector centrality with the element's default options. */
const eigenvector = (graph: AlgorithmGraph): unknown => {
    try {
        return eigenvectorCentrality(graph, {
            normalized: true,
            maxIterations: 1000,
            tolerance: 1e-6,
            mode: "total",
            endpoints: false,
        });
    } catch (error) {
        // A graph that needs more than the bound runs every pass and then throws, which the element
        // reports as E_NOT_CONVERGED. The reader waited for all of those passes all the same.
        if (error instanceof ConvergenceError) {
            return error;
        }

        throw error;
    }
};

/** Louvain with the element's default options. */
const louvainRun = (graph: AlgorithmGraph): unknown =>
    louvain(graph, { resolution: 1, maxIterations: 100, tolerance: 1e-6, useOptimized: true });

const ROWS: readonly Row[] = [
    {
        key: "degree",
        mode: "directed",
        sizes: [50_000, 100_000],
        run: (graph, nodes) => {
            const out: object[] = [];
            for (let id = 0; id < nodes; id++) {
                const inDegree = graph.inDegree(id);
                const outDegree = graph.outDegree(id);
                out.push({ id, values: { value: inDegree + outDegree, inDegree, outDegree } });
            }

            return out;
        },
    },
    {
        key: "pagerank",
        mode: "directed",
        sizes: [4_000, 8_000],
        // The estimate prices the whole iteration bound, so the run must use it: at the default
        // tolerance of 1e-6 some of these graphs converge in a handful of passes (measured 9-11x
        // under the estimate at n = 4,000) and others do not. 1e-10 is the smallest tolerance the
        // element's schema accepts, and 0.85^100 is about 1e-7, so all 100 passes run.
        run: (graph) => pageRank(graph, { dampingFactor: 0.85, maxIterations: 100, tolerance: 1e-10, useDelta: true }),
    },
    {
        key: "betweenness",
        mode: "undirected",
        sizes: [600, 1_200],
        shape: random(4),
        shapeName: "random, m = 4n",
        run: (graph) => betweennessCentrality(graph),
    },
    {
        key: "closeness",
        mode: "undirected",
        sizes: [600, 1_200],
        shape: random(4),
        shapeName: "random, m = 4n",
        run: (graph) => closenessCentrality(graph),
    },
    // Closeness' slowest shapes per unit of n(n + m) measured on 2026-09-23: a sparse random
    // graph and a path; and a dense one, where the per-edge share of the work is largest.
    {
        key: "closeness",
        mode: "undirected",
        sizes: [1_200],
        shape: random(1.2),
        shapeName: "random, m = 1.2n",
        run: (graph) => closenessCentrality(graph),
    },
    {
        key: "closeness",
        mode: "undirected",
        sizes: [1_500],
        shape: path,
        shapeName: "path",
        run: (graph) => closenessCentrality(graph),
    },
    {
        key: "closeness",
        mode: "undirected",
        sizes: [400],
        shape: random(50),
        shapeName: "random, m = 50n",
        run: (graph) => closenessCentrality(graph),
    },
    // Eigenvector's model charges every pass of its 1,000-pass bound, so it is held to both bounds
    // where the graph runs them all: a small grid (never converges, and throws) and a star (979).
    { key: "eigenvector", mode: "undirected", sizes: [10_000], shape: grid, shapeName: "grid", run: eigenvector },
    { key: "eigenvector", mode: "undirected", sizes: [50_000], shape: star, shapeName: "star", run: eigenvector },
    // Shapes that converge early, which nothing the estimate can see predicts.
    ...(
        [
            [random(5), "random, m = 5n", [50_000], "about 11"],
            [random(1.2), "random, m = 1.2n", [100_000], "about 210"],
            [scaleFree, "scale-free", [100_000], "about 63"],
            [path, "path", [100_000], "1 or 2"],
        ] as const
    ).map(
        ([shape, shapeName, sizes, passes]): Row => ({
            key: "eigenvector",
            mode: "undirected",
            sizes,
            shape,
            shapeName,
            run: eigenvector,
            optimismOnly: `this graph converges in ${passes} of the 1,000 passes the estimate charges`,
        }),
    ),
    // Louvain on the graphs it is run on, held to both bounds: its model is pinned under the
    // slowest of these per element (scale-free), and the sizes are large enough that the per-element
    // growth its log term charges is visible.
    { key: "louvain", mode: "undirected", sizes: [20_000, 50_000], run: louvainRun },
    ...(
        [
            [random(1.2), "random, m = 1.2n", [50_000, 100_000]],
            [random(20), "random, m = 20n", [10_000, 20_000]],
            [scaleFree, "scale-free", [20_000, 50_000]],
            [planted, "planted partition", [100_000]],
        ] as const
    ).map(
        ([shape, shapeName, sizes]): Row => ({
            key: "louvain",
            mode: "undirected",
            sizes,
            shape,
            shapeName,
            run: louvainRun,
        }),
    ),
    // Shapes where Louvain settles in few sweeps (5 on a path, 13 on a ring of cliques, about 23 on
    // a star, erratic 15 to 90 on a grid), so a model safe on the slow shapes is 4x to 8x over them.
    // Kept to prove it stays safe there, the star's hub included.
    ...(
        [
            [grid, "grid", [50_000]],
            [path, "path", [200_000]],
            [star, "star", [100_000, 200_000]],
            [cliqueRing, "ring of 10-cliques", [100_000]],
        ] as const
    ).map(
        ([shape, shapeName, sizes]): Row => ({
            key: "louvain",
            mode: "undirected",
            sizes,
            shape,
            shapeName,
            run: louvainRun,
            optimismOnly: "louvain settles in a handful of sweeps on this shape, well under the model's charge",
        }),
    ),
];

/**
 * The two methods of the data manager `toAlgorithmGraph` reads, over a fixed snapshot. The
 * undirected view is derived once, as the element's store caches it once per snapshot.
 * @param snapshot - The graph.
 * @returns A stand-in data manager.
 */
function dataManagerOf(snapshot: GraphSnapshot): DataManager {
    const undirected = snapshot.toUndirected();

    return { getSnapshot: () => snapshot, undirected: () => undirected } as unknown as DataManager;
}

/** One measured graph, with the two facts the estimate reads from it beyond the node count. */
interface Measured {
    readonly data: DataManager;
    readonly edges: number;
    readonly maxDegree: number;
}

/**
 * Build a shape's graph as the element would hold it, declared directed as the loader stores it.
 * @param shape - The shape.
 * @param nodes - How many nodes.
 * @returns The graph, its edge count and its largest total degree.
 */
function measuredGraph(shape: Shape, nodes: number): Measured {
    const { src, dst } = shape(nodes);
    const degrees = new Uint32Array(nodes);
    for (let edge = 0; edge < src.length; edge++) {
        degrees[src[edge]]++;
        degrees[dst[edge]]++;
    }

    return {
        data: dataManagerOf(fromEdgeArrays({ src, dst, nodeCount: nodes, directed: true })),
        edges: src.length,
        maxDegree: degrees.reduce((most, degree) => Math.max(most, degree), 0),
    };
}

/**
 * The statistics the session would report for a graph of this size.
 * @param nodeCount - Nodes.
 * @param edgeCount - Edges.
 * @param maxDegree - The largest total degree.
 * @returns Statistics with nothing set that would make an algorithm unavailable.
 */
function statistics(nodeCount: number, edgeCount: number, maxDegree: number): GraphStatistics {
    return {
        nodeCount,
        edgeCount,
        density: 0,
        directedness: "unknown",
        directednessSource: { by: "unsettled", statedBy: null },
        weighted: false,
        selfLoopCount: 0,
        repeatedEdgeCount: 0,
        degreeRange: [0, maxDegree],
        meanDegree: nodeCount === 0 ? 0 : (2 * edgeCount) / nodeCount,
        components: {
            count: 1,
            sizes: [nodeCount],
            largestSize: nodeCount,
            isolatedCount: 0,
            truncatedSizes: false,
            componentOf: () => 0,
        },
    };
}

/**
 * Seconds one call takes.
 * @param work - The call.
 * @returns Wall-clock seconds.
 */
function seconds(work: () => unknown): number {
    const started = performance.now();
    work();

    return (performance.now() - started) / 1000;
}

/** Probes per calibration. Each is a few milliseconds, so many are cheap. */
const PROBES = 9;

/**
 * How fast this machine is right now against the one the defaults were fitted on, as the
 * element's calibration probe measures it.
 *
 * The FASTEST of several probes, as the runs keep their fastest time: contention from other
 * processes only ever adds time, so the minimum is the steadiest reading of the work itself.
 * The three classes' factors are collapsed to their median, because under load one class's probe
 * can swing by 2x on its own and the median discards it.
 * @returns The speed factor; 1 on the reference machine, 0.5 on one twice as slow.
 */
async function machineSpeed(): Promise<number> {
    const probes: MachineCalibration[] = [];
    for (let probe = 0; probe < PROBES; probe++) {
        probes.push(await calibrateCost({ budgetMs: 250 }));
    }

    assert.isTrue(
        probes.every((probe) => probe.basis === "probe"),
        "the calibration probe could not time this machine, so nothing can be normalised",
    );
    const speeds = (["linearElementsPerSecond", "iterativeElementsPerSecond", "heavyPairsPerSecond"] as const).map(
        (key) => Math.max(...probes.map((probe) => probe.rates[key])) / DEFAULT_COST_RATES[key],
    );

    return speeds.sort((a, b) => a - b)[1];
}

/**
 * The default rates scaled to a machine of this speed, which is what `calibrateCost` produces.
 * @param speed - The machine's speed factor.
 * @returns A calibration to estimate with.
 */
function calibrationAt(speed: number): MachineCalibration {
    const rates = { ...DEFAULT_COST_RATES };
    for (const key of Object.keys(rates) as (keyof CostRates)[]) {
        rates[key] *= speed;
    }

    return { rates, at: new Date().toISOString(), machine: "this test", basis: "probe" };
}

beforeAll(async () => {
    await machineSpeed(); // warm the probe's JIT; its first answers are low
}, 30_000);

describe("the cost estimate, against real runs of the algorithm the element runs", () => {
    for (const row of ROWS) {
        const bounds =
            row.optimismOnly === undefined ? `[${MAX_OPTIMISM}, ${MAX_PESSIMISM}]` : `at least ${MAX_OPTIMISM}`;
        it(`${row.key} on ${row.shapeName ?? "random, m = 5n"}: estimate / measured stays ${bounds}`, async () => {
            const descriptor = algorithmByKey(row.key);
            const graphs = row.sizes.map((nodes) => measuredGraph(row.shape ?? random(5), nodes));
            const once = (index: number): unknown =>
                row.run(toAlgorithmGraph(graphs[index].data, row.mode), row.sizes[index]);

            once(0); // warm-up, untimed

            for (const [index, nodes] of row.sizes.entries()) {
                const { edges, maxDegree } = graphs[index];
                // Probed on both sides of the runs, keeping the faster reading, so a burst of load
                // during one probe window does not read as a slow machine.
                const before = await machineSpeed();
                const measured = Math.min(...[0, 1, 2].map(() => seconds(() => once(index))));
                const speed = Math.max(before, await machineSpeed());
                const calibration = calibrationAt(speed);
                const estimate = estimateCost({
                    algorithm: row.key,
                    descriptor,
                    statistics: statistics(nodes, edges, maxDegree),
                    calibration,
                });
                assert.isTrue(estimate.available, estimate.reason);

                const ratio = estimate.seconds / measured;
                const facts = `${row.key} on ${row.shapeName ?? "random, m = 5n"} n=${nodes} m=${edges}: estimated ${estimate.seconds.toFixed(3)} s, measured ${measured.toFixed(3)} s, ratio ${ratio.toFixed(2)}`;
                if (process.env.COST_GUARD_VERBOSE !== undefined) {
                    process.stdout.write(`${facts}, machine speed ${speed.toFixed(2)}x the reference\n`);
                }

                assert.isAtLeast(ratio, MAX_OPTIMISM, `too optimistic. ${facts}`);
                if (row.optimismOnly === undefined) {
                    assert.isAtMost(ratio, MAX_PESSIMISM, `too pessimistic. ${facts}`);
                }
            }
        }, 120_000);
    }
});
