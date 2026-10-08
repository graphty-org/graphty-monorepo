/**
 * The `...Async` methods with options that the @graphty/algorithms dispatcher sends to the GPU, how to read each
 * result as numbers, and the tolerance the WebGPU package documents for that algorithm against its CPU twin
 * (design/webgpu/webgpu-acceleration-plan.md section 9.7, "Result-shape parity"). Shared by the CPU-path tests
 * (which demand exact equality with the synchronous method) and the GPU tests.
 */

import cytoscape from "cytoscape";
import { expect } from "vitest";

/** A result as the tests read it: per-node accessors, partitions, paths. */
type Result = Record<string, unknown> & Partial<Record<"score" | "rank" | "hub" | "authority", (e: unknown) => number>>;

interface Case {
    /** The synchronous method; the async one is this + "Async". */
    readonly method: string;
    readonly options: Record<string, unknown>;
    /** "main" (a random weighted graph plus a triangle and an isolated node) or "cliques" (a ring of cliques). */
    readonly graph: "main" | "cliques";
    /** Numbers to compare, in a fixed element order. */
    read(r: Result, cy: cytoscape.Core): number[];
    /** Relative tolerance against the CPU (0: identical). */
    readonly tol: number;
    /** Absolute tolerance instead, for vectors of unit scale. */
    readonly abs?: number;
    /** Overrides the comparison: label propagation is checked against the planted partition instead. */
    check?(values: number[], cy: cytoscape.Core): void;
}

/**
 * A seeded generator (the LCG of Numerical Recipes) so the graphs are the same on every run.
 * @param seed - the seed
 * @returns a function returning the next number in [0, 1)
 */
function lcg(seed: number): () => number {
    let x = seed >>> 0;
    return () => {
        x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
        return x / 2 ** 32;
    };
}

/**
 * The main test graph: a ring of 80 nodes with 120 random simple chords (weights 1-9 in data "w"), a separate
 * triangle and an isolated node. Not regular and not bipartite, so Katz and eigenvector centrality run on the GPU.
 * @returns the core
 */
export function mainGraph(): cytoscape.Core {
    const rand = lcg(7);
    const n = 80;
    const els: cytoscape.ElementDefinition[] = [];
    for (let i = 0; i < n; i++) {
        els.push({ data: { id: `n${String(i)}` } });
    }
    const seen = new Set<string>();
    const add = (a: string, b: string): void => {
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (a === b || seen.has(key)) {
            return;
        }
        seen.add(key);
        els.push({ data: { id: `e${String(seen.size)}`, source: a, target: b, w: 1 + Math.floor(rand() * 9) } });
    };
    for (let i = 0; i < n; i++) {
        add(`n${String(i)}`, `n${String((i + 1) % n)}`);
    }
    while (seen.size < n + 120) {
        add(`n${String(Math.floor(rand() * n))}`, `n${String(Math.floor(rand() * n))}`);
    }
    for (const id of ["t0", "t1", "t2", "z"]) {
        els.push({ data: { id } });
    }
    add("t0", "t1");
    add("t1", "t2");
    add("t2", "t0");
    return cytoscape({ headless: true, elements: els });
}

/**
 * Four 8-cliques joined in a ring by one edge each; node data "planted" is the clique.
 * @returns the core
 */
function cliquesGraph(): cytoscape.Core {
    const els: cytoscape.ElementDefinition[] = [];
    const id = (c: number, i: number): string => `c${String(c)}_${String(i)}`;
    for (let c = 0; c < 4; c++) {
        for (let i = 0; i < 8; i++) {
            els.push({ data: { id: id(c, i), planted: c } });
            for (let j = 0; j < i; j++) {
                els.push({ data: { id: `${id(c, i)}-${id(c, j)}`, source: id(c, i), target: id(c, j) } });
            }
        }
        els.push({ data: { id: `ring${String(c)}`, source: id(c, 0), target: id((c + 1) % 4, 7) } });
    }
    return cytoscape({ headless: true, elements: els });
}

const nodes = (cy: cytoscape.Core): cytoscape.NodeSingular[] => cy.nodes().toArray();
const perNode =
    (accessor: string) =>
    (r: Result, cy: cytoscape.Core): number[] =>
        nodes(cy).map((n) => (r[accessor] as (e: unknown) => number)(n));

/**
 * Cluster numbers renumbered by first appearance, so two equal partitions read the same.
 * @param r - a partition result
 * @param cy - the core
 * @returns one label per node
 */
function labels(r: Result, cy: cytoscape.Core): number[] {
    const cluster = r.cluster as (e: unknown) => number;
    const first = new Map<number, number>();
    return nodes(cy).map((n) => {
        const c = cluster(n);
        if (!first.has(c)) {
            first.set(c, first.size);
        }
        return first.get(c) ?? -1;
    });
}

/**
 * The adjusted Rand index of two labellings.
 * @param a - labels
 * @param b - labels
 * @returns 1 for identical partitions, about 0 for unrelated ones
 */
function adjustedRandIndex(a: readonly number[], b: readonly number[]): number {
    const pairs = (x: number): number => (x * (x - 1)) / 2;
    const table = new Map<string, number>();
    const rows = new Map<number, number>();
    const cols = new Map<number, number>();
    a.forEach((x, i) => {
        const y = b[i];
        table.set(`${String(x)},${String(y)}`, (table.get(`${String(x)},${String(y)}`) ?? 0) + 1);
        rows.set(x, (rows.get(x) ?? 0) + 1);
        cols.set(y, (cols.get(y) ?? 0) + 1);
    });
    const sum = (m: Map<unknown, number>): number => [...m.values()].reduce((s, v) => s + pairs(v), 0);
    const index = sum(table);
    const expected = (sum(rows) * sum(cols)) / pairs(a.length);
    const max = (sum(rows) + sum(cols)) / 2;
    return max === expected ? 1 : (index - expected) / (max - expected);
}

/**
 * Asserts two vectors agree within a relative tolerance, with a floor of 1e-3 of the largest magnitude (the GPU
 * package's own score comparison), and equal non-finite entries.
 * @param got - the values under test
 * @param want - the reference
 * @param tol - the relative tolerance; 0 demands identical values (unless `abs` is given)
 * @param label - names the comparison in a failure
 * @param abs - an absolute tolerance instead
 */
export function expectClose(
    got: readonly number[],
    want: readonly number[],
    tol: number,
    label: string,
    abs?: number,
): void {
    expect(got.length, label).toBe(want.length);
    const top = want.reduce((m, x) => (Number.isFinite(x) ? Math.max(m, Math.abs(x)) : m), 0);
    const floor = Math.max(1e-3 * top, Number.MIN_VALUE);
    want.forEach((w, i) => {
        const g = got[i];
        if (abs !== undefined && Number.isFinite(w)) {
            expect(Math.abs(g - w), `${label} [${String(i)}] ${String(g)} vs ${String(w)}`).toBeLessThan(abs);
            return;
        }
        if (!Number.isFinite(w) || tol === 0) {
            expect(g, `${label} [${String(i)}]`).toBe(w);
            return;
        }
        expect(
            Math.abs(g - w) / Math.max(Math.abs(w), floor),
            `${label} [${String(i)}] ${String(g)} vs ${String(w)}`,
        ).toBeLessThanOrEqual(tol);
    });
}

const plantedCheck = (values: number[], cy: cytoscape.Core): void => {
    const planted = nodes(cy).map((n) => n.data("planted") as number);
    expect(adjustedRandIndex(values, planted)).toBeGreaterThanOrEqual(0.9);
};

const EQUAL_ITERATIONS = { maxIterations: 30, tolerance: 0 };

/** Every `...Async` method, with options the dispatcher sends to the GPU. */
export const CASES: readonly Case[] = [
    // PageRank: 1e-5 relative after EQUAL iterations (the package's parity rule), so a fixed count, no early stop
    { method: "graphtyPageRank", options: EQUAL_ITERATIONS, graph: "main", read: perNode("score"), tol: 1e-5 },
    {
        method: "graphtyPageRank",
        options: { ...EQUAL_ITERATIONS, weight: "w" },
        graph: "main",
        read: perNode("score"),
        tol: 1e-5,
    },
    // Personalized PageRank goes to the GPU only when no node lacks out-edges, so not on "main" (it has an isolated node)
    {
        method: "graphtyPersonalizedPageRank",
        options: { ...EQUAL_ITERATIONS, personalization: "#c0_0, #c1_3" },
        graph: "cliques",
        read: perNode("score"),
        tol: 1e-5,
    },
    // The power-iteration family through the dispatcher, which stops each side at its own convergence: the package's
    // dispatcher test compares unit-scale vectors to 1e-4 absolute. Eigenvector's default tolerance: f32 cannot reach
    // a much smaller one, and the dispatcher then throws ConvergenceError rather than return an unconverged vector.
    {
        method: "graphtyEigenvectorCentrality",
        options: { maxIterations: 1000 },
        graph: "main",
        read: perNode("score"),
        tol: 0,
        abs: 1e-4,
    },
    {
        method: "graphtyKatzCentrality",
        options: { alpha: 0.02, maxIterations: 300, tolerance: 1e-7 },
        graph: "main",
        read: perNode("score"),
        tol: 0,
        abs: 1e-4,
    },
    {
        method: "graphtyHits",
        options: { maxIterations: 300, tolerance: 1e-8 },
        graph: "main",
        read: (r, cy) => [...perNode("hub")(r, cy), ...perNode("authority")(r, cy)],
        tol: 0,
        abs: 1e-4,
    },
    { method: "graphtyClosenessCentrality", options: {}, graph: "main", read: perNode("score"), tol: 1e-5 },
    {
        method: "graphtyClosenessCentrality",
        options: { weight: "w" },
        graph: "main",
        read: perNode("score"),
        tol: 1e-5,
    },
    { method: "graphtyBetweennessCentrality", options: {}, graph: "main", read: perNode("score"), tol: 1e-4 },
    {
        method: "graphtyEdgeBetweennessCentrality",
        options: {},
        graph: "main",
        read: (r, cy) => cy.edges().map((e) => (r.score as (x: unknown) => number)(e)),
        tol: 1e-4,
    },
    { method: "graphtyConnectedComponents", options: {}, graph: "main", read: labels, tol: 0 },
    { method: "graphtyWeaklyConnectedComponents", options: { directed: true }, graph: "main", read: labels, tol: 0 },
    {
        method: "graphtyTriangleCount",
        options: {},
        graph: "main",
        read: (r, cy) => [...perNode("score")(r, cy), r.total as number],
        tol: 0,
    },
    {
        method: "graphtyBreadthFirstSearch",
        options: { root: "#n0" },
        graph: "main",
        read: (r, cy) => nodes(cy).map((n) => (r.depth as (e: unknown) => number | undefined)(n) ?? -1),
        tol: 0,
    },
    {
        method: "graphtyDijkstra",
        options: { root: "#n0", weight: "w" },
        graph: "main",
        read: perNode("distanceTo"),
        tol: 1e-5,
    },
    {
        method: "graphtyBellmanFord",
        options: { root: "#n0", weight: "w" },
        graph: "main",
        read: perNode("distanceTo"),
        tol: 1e-5,
    },
    {
        method: "graphtyAllPairsShortestPath",
        options: { paths: false },
        graph: "main",
        read: (r, cy) => {
            const d = r.distance as (a: unknown, b: unknown) => number;
            return nodes(cy).flatMap((a) => nodes(cy).map((b) => d(a, b)));
        },
        tol: 0,
    },
    {
        method: "graphtyAllPairsShortestPath",
        options: { paths: false, weight: "w" },
        graph: "main",
        read: (r, cy) => {
            const d = r.distance as (a: unknown, b: unknown) => number;
            return nodes(cy).flatMap((a) => nodes(cy).map((b) => d(a, b)));
        },
        tol: 1e-5,
    },
    { method: "graphtyLabelPropagation", options: {}, graph: "cliques", read: labels, tol: 0, check: plantedCheck },
    {
        method: "graphtyLabelPropagationSynchronous",
        options: {},
        graph: "cliques",
        read: labels,
        tol: 0,
        check: plantedCheck,
    },
];

/**
 * A fresh core for a case.
 * @param c - the case
 * @returns the core
 */
export function coreFor(c: Case): cytoscape.Core {
    return c.graph === "main" ? mainGraph() : cliquesGraph();
}

/**
 * A case's name for a test title.
 * @param c - the case
 * @returns the method and its options
 */
export function caseName(c: Case): string {
    return `${c.method}Async ${JSON.stringify(c.options)}`;
}
