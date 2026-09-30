import { GraphBuilder, type GraphSnapshot, renumberPartition } from "@graphty/graph-format";
import { plantedPartitionGraph } from "@graphty/graph-samples/generators";
import { describe, expect, it } from "vitest";

import { labelPropagation } from "../../../src/indexed/label-propagation.js";
import { Graph } from "../../helpers/legacy-graph.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, gnm, undirectedFixtures } from "./port-fixtures.js";

// ------------------------------------------------------------------ independent helpers
// Both read the graph from s.edgeList() -- a different view than the CSR rows the port walks -- and
// use plain arrays and Maps, so they share no code with the port.

interface Neighbour {
    readonly v: number;
    readonly w: number;
}

/**
 * Per-node neighbour lists under the port's conventions: self-loops dropped, a directed edge joining
 * both ends. Out-neighbours first, sorted by index, then in-neighbours sorted by index: the order
 * the snapshot's rows hold them in (invariant I4), which the tie draw depends on.
 */
function neighbourLists(s: GraphSnapshot): Neighbour[][] {
    const n = s.nodeCount;
    const out: Neighbour[][] = Array.from({ length: n }, () => []);
    const inn: Neighbour[][] = Array.from({ length: n }, () => []);
    const el = s.edgeList();
    for (let e = 0; e < s.edgeCount; e++) {
        const u = el.src[e];
        const v = el.dst[e];
        const w = el.weights === null ? 1 : el.weights[e];
        if (u === v) {
            continue;
        }
        out[u].push({ v, w });
        (s.directed ? inn : out)[v].push({ v: u, w });
    }
    const byIndex = (a: Neighbour, b: Neighbour): number => a.v - b.v;
    return out.map((list, u) => [...list.sort(byIndex), ...inn[u].sort(byIndex)]);
}

/** Each neighbour label's summed vote at node u, in first-seen order. */
function votes(nbrs: readonly Neighbour[], label: ArrayLike<number>, weighted: boolean): Map<number, number> {
    const tally = new Map<number, number>();
    const counted = new Set<number>();
    for (const { v, w } of nbrs) {
        if (!weighted) {
            if (counted.has(v)) {
                continue;
            }
            counted.add(v);
        }
        const c = label[v];
        tally.set(c, (tally.get(c) ?? 0) + (weighted ? w : 1));
    }
    return tally;
}

/** The paper's stop criterion: every node with a positive vote holds a label at the maximum vote. */
function dominanceHolds(s: GraphSnapshot, labels: ArrayLike<number>, weighted = true): boolean {
    const lists = neighbourLists(s);
    for (let u = 0; u < s.nodeCount; u++) {
        const tally = votes(lists[u], labels, weighted);
        const max = Math.max(0, ...tally.values());
        if (max > 0 && (tally.get(labels[u]) ?? 0) < max) {
            return false;
        }
    }
    return true;
}

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type TieRule = "uniform" | "retain" | "double";

/**
 * FLPA as design sections 2.1 and 2.4 state it, random stream included. `tieRule` swaps in the two
 * rules the port must NOT follow: "retain" keeps the current label whenever it is dominant, and
 * "double" lists the current label twice among the tied candidates (the legacy function's bias).
 */
function referenceFlpa(s: GraphSnapshot, seed: number, weighted: boolean, tieRule: TieRule): number[] {
    const n = s.nodeCount;
    const lists = neighbourLists(s);
    const rand = mulberry32(seed);
    const label = Array.from({ length: n }, (_, i) => i);
    const queue = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i >= 1; i--) {
        const j = Math.floor(rand() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    const queued = new Array<boolean>(n).fill(true);
    let visits = 0;
    for (let head = 0; head < queue.length && visits < 100 * n; head++) {
        const u = queue[head];
        queued[u] = false;
        visits++;
        const tally = votes(lists[u], label, weighted);
        const max = Math.max(0, ...tally.values());
        if (max <= 0) {
            continue;
        }
        const tied = [...tally.keys()].filter((c) => tally.get(c) === max);
        let pick: number;
        if (tieRule === "retain" && tied.includes(label[u])) {
            pick = label[u];
        } else if (tieRule === "double") {
            if (tied.includes(label[u])) {
                tied.push(label[u]);
            }
            pick = tied.length === 1 ? tied[0] : tied[Math.floor(rand() * tied.length)];
        } else {
            pick = tied[0];
            for (let k = 2; k <= tied.length; k++) {
                if (rand() * k < 1) {
                    pick = tied[k - 1];
                }
            }
        }
        if (pick !== label[u]) {
            label[u] = pick;
            for (const { v } of lists[u]) {
                if (label[v] !== pick && !queued[v]) {
                    queued[v] = true;
                    queue.push(v);
                }
            }
        }
    }
    return [...renumberPartition(Uint32Array.from(label)).labels];
}

function fixture(name: string): GraphSnapshot {
    const found = undirectedFixtures().find((f) => f.name === name);
    if (found === undefined) {
        throw new Error(`no fixture named ${name}`);
    }
    return checksummedSnapshot(found.graph);
}

function clique(g: Graph, prefix: string, size: number): void {
    for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
            g.addEdge(`${prefix}${i}`, `${prefix}${j}`);
        }
    }
}

const SEEDS_10 = Array.from({ length: 10 }, (_, i) => i + 1);
const SEEDS_20 = Array.from({ length: 20 }, (_, i) => i + 1);

function twoTrianglesAndAnIsolatedNode(): GraphSnapshot {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    g.addEdge("c", "a");
    g.addEdge("d", "e");
    g.addEdge("e", "f");
    g.addEdge("f", "d");
    g.addNode("z");
    return checksummedSnapshot(g);
}

function edgeless(n: number): GraphSnapshot {
    const b = new GraphBuilder({ directed: false });
    for (let i = 0; i < n; i++) {
        b.addNode(`n${i}`);
    }
    return b.freeze({ checksum: true });
}

/** The karate club at randomSeed 42, recorded from the first run that matched the reference FLPA. */
const KARATE_SEED_42 = [
    0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

describe("indexed.labelPropagation: options and trivial results", () => {
    it("returns an empty partition on an empty snapshot", () => {
        const s = new GraphBuilder({ directed: false }).freeze({ checksum: true });
        const r = labelPropagation(s);
        expect(r.count).toBe(0);
        expect(r.labels.length).toBe(0);
        expect(r.iterations).toBe(0);
        expect(r.converged).toBe(true);
        expect(r.groups()).toEqual([]);
        s.validate({ checksum: true });
    });

    it("returns the identity labelling, not converged, when maxIterations is 0", () => {
        const s = twoTrianglesAndAnIsolatedNode();
        const r = labelPropagation(s, { maxIterations: 0 });
        expect([...r.labels]).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(r.count).toBe(7);
        expect(r.iterations).toBe(0);
        expect(r.converged).toBe(false);
        s.validate({ checksum: true });
    });

    it("reports the identity as converged at maxIterations 0 when no node has a voting neighbour", () => {
        const s = edgeless(5);
        expect(labelPropagation(s, { maxIterations: 0 }).converged).toBe(true);
        s.validate({ checksum: true });

        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 0);
        b.addEdge("b", "c", 0);
        const zero = b.freeze({ checksum: true });
        const r = labelPropagation(zero, { maxIterations: 0 });
        expect(r.converged).toBe(true);
        expect(r.count).toBe(3);
        zero.validate({ checksum: true });

        // a self-loop does not vote, so loops alone leave the identity dominant
        const loops = new GraphBuilder({ directed: false });
        loops.addEdge("a", "a", 5);
        loops.addEdge("b", "b", 5);
        const looped = loops.freeze({ checksum: true });
        expect(labelPropagation(looped, { maxIterations: 0 }).converged).toBe(true);
        looped.validate({ checksum: true });
    });

    it("rejects a maxIterations that is negative, fractional or NaN, or a cap above 2^53 - 1 visits", () => {
        const s = twoTrianglesAndAnIsolatedNode();
        for (const maxIterations of [-1, 1.5, NaN]) {
            expect(() => labelPropagation(s, { maxIterations })).toThrow(RangeError);
        }
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        const pair = b.freeze({ checksum: true });
        expect(() => labelPropagation(pair, { maxIterations: 2 ** 53 })).toThrow(RangeError);
        s.validate({ checksum: true });
        pair.validate({ checksum: true });
    });

    it("rejects a randomSeed that is fractional, NaN or infinite", () => {
        const s = twoTrianglesAndAnIsolatedNode();
        for (const randomSeed of [1.5, NaN, Infinity]) {
            expect(() => labelPropagation(s, { randomSeed })).toThrow(RangeError);
        }
        s.validate({ checksum: true });
    });

    it("rejects a negative or an infinite arc weight before doing any work", () => {
        for (const weight of [-1, Infinity]) {
            const b = new GraphBuilder({ directed: false });
            b.addEdge("a", "b", 1);
            b.addEdge("b", "c", weight);
            const s = b.freeze({ checksum: true });
            expect(() => labelPropagation(s)).toThrow(RangeError);
            // weighted: false never reads the weights, so it has nothing to reject
            expect(() => labelPropagation(s, { weighted: false })).not.toThrow();
            s.validate({ checksum: true });
        }
    });

    it("rejects a NaN arc weight", () => {
        // GraphBuilder refuses a NaN weight (E_INVALID_WEIGHT), so no real snapshot carries one;
        // the check still guards snapshots from other producers. Overlay a weight array on a real
        // snapshot to reach it.
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 1);
        const real = b.freeze({ checksum: true });
        const fake = Object.create(real, { weights: { value: new Float32Array([NaN, NaN]) } }) as GraphSnapshot;
        expect(() => labelPropagation(fake)).toThrow(RangeError);
        real.validate({ checksum: true });
    });
});

describe("indexed.labelPropagation: the FLPA kernel on undirected snapshots", () => {
    const REFERENCE_FIXTURES = [
        "Zachary's karate club",
        "random 40 nodes, 120 edges",
        "random 80 nodes, 320 weighted edges",
    ];

    it("matches the reference FLPA label for label, and the wrong tie rules do not", () => {
        let retainDiffers = false;
        let doubleDiffers = false;
        for (const name of REFERENCE_FIXTURES) {
            const s = fixture(name);
            for (const seed of SEEDS_20) {
                const port = [...labelPropagation(s, { randomSeed: seed }).labels];
                expect(port, `${name}, seed ${seed}`).toEqual(referenceFlpa(s, seed, true, "uniform"));
                retainDiffers ||= port.join() !== referenceFlpa(s, seed, true, "retain").join();
                doubleDiffers ||= port.join() !== referenceFlpa(s, seed, true, "double").join();
            }
            s.validate({ checksum: true });
        }
        expect(retainDiffers).toBe(true);
        expect(doubleDiffers).toBe(true);
    });

    it("gives the stored partition of the karate club at randomSeed 42", () => {
        const s = fixture("Zachary's karate club");
        const r = labelPropagation(s, { randomSeed: 42 });
        expect([...r.labels]).toEqual(KARATE_SEED_42);
        expect(KARATE_SEED_42).toEqual(referenceFlpa(s, 42, true, "uniform"));
        s.validate({ checksum: true });
    });

    it("defaults randomSeed to 42", () => {
        const s = fixture("Zachary's karate club");
        expect([...labelPropagation(s).labels]).toEqual(KARATE_SEED_42);
        s.validate({ checksum: true });
    });

    it("reports iterations as node visits over the node count, rounded up", () => {
        // A run capped at k sweeps replays the uncapped run while k * n >= its visits, so the
        // smallest cap that still converges is ceil(visits / n).
        for (const name of REFERENCE_FIXTURES) {
            const s = fixture(name);
            for (const seed of SEEDS_10) {
                const r = labelPropagation(s, { randomSeed: seed });
                expect(r.converged).toBe(true);
                let k = 0;
                while (!labelPropagation(s, { randomSeed: seed, maxIterations: k }).converged) {
                    k++;
                }
                expect(r.iterations, `${name}, seed ${seed}`).toBe(k);
            }
            s.validate({ checksum: true });
        }
    });

    it("leaves a single node and an edgeless graph as singletons after one sweep", () => {
        for (const n of [1, 5]) {
            const s = edgeless(n);
            const r = labelPropagation(s);
            expect([...r.labels]).toEqual(Array.from({ length: n }, (_, i) => i));
            expect(r.iterations).toBe(1);
            expect(r.converged).toBe(true);
            s.validate({ checksum: true });
        }
    });

    it("finds two triangles and leaves an isolated node alone", () => {
        const s = twoTrianglesAndAnIsolatedNode();
        const r = labelPropagation(s);
        expect([...r.labels]).toEqual([0, 0, 0, 1, 1, 1, 2]);
        expect(r.count).toBe(3);
        expect(r.converged).toBe(true);
        s.validate({ checksum: true });
    });

    it("puts each clique in one community: K6, and two disjoint five-cliques", () => {
        const k6 = new Graph({ directed: false });
        clique(k6, "k", 6);
        const two = new Graph({ directed: false });
        clique(two, "a", 5);
        clique(two, "b", 5);
        const s6 = checksummedSnapshot(k6);
        const s55 = checksummedSnapshot(two);
        for (const seed of SEEDS_10) {
            expect([...labelPropagation(s6, { randomSeed: seed }).labels]).toEqual([0, 0, 0, 0, 0, 0]);
            expect([...labelPropagation(s55, { randomSeed: seed }).labels]).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
        }
        s6.validate({ checksum: true });
        s55.validate({ checksum: true });
    });

    it("converges on tie-heavy graphs -- an even path of 1,000, a star of 50 and K(3,4) -- under the default cap", () => {
        const path = new Graph({ directed: false });
        for (let i = 1; i < 1000; i++) {
            path.addEdge(`p${i - 1}`, `p${i}`);
        }
        const star = new Graph({ directed: false });
        for (let i = 0; i < 49; i++) {
            star.addEdge("hub", `leaf${i}`);
        }
        const bipartite = new Graph({ directed: false });
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                bipartite.addEdge(`l${i}`, `r${j}`);
            }
        }
        for (const g of [path, star, bipartite]) {
            const s = checksummedSnapshot(g);
            for (const seed of SEEDS_10) {
                const r = labelPropagation(s, { randomSeed: seed });
                expect(r.converged).toBe(true);
                expect(dominanceHolds(s, r.labels)).toBe(true);
            }
            s.validate({ checksum: true });
        }
    });

    it("is deterministic per seed and varies across seeds on the karate club", () => {
        const s = fixture("Zachary's karate club");
        expect([...labelPropagation(s, { randomSeed: 7 }).labels]).toEqual([
            ...labelPropagation(s, { randomSeed: 7 }).labels,
        ]);
        const partitions = new Set<string>();
        for (const seed of SEEDS_10) {
            const r = labelPropagation(s, { randomSeed: seed });
            expect(r.converged).toBe(true);
            expect(dominanceHolds(s, r.labels)).toBe(true);
            partitions.add(r.labels.join());
        }
        expect(partitions.size).toBeGreaterThanOrEqual(2);
        s.validate({ checksum: true });
    });

    it("ends with every label dominant on every converged run over the shared undirected fixtures", () => {
        let convergedRuns = 0;
        for (const { name, graph } of undirectedFixtures()) {
            const s = checksummedSnapshot(graph);
            for (const seed of SEEDS_10) {
                const r = labelPropagation(s, { randomSeed: seed });
                if (r.converged) {
                    convergedRuns++;
                    expect(dominanceHolds(s, r.labels), `${name}, seed ${seed}`).toBe(true);
                }
            }
            s.validate({ checksum: true });
        }
        expect(convergedRuns).toBe(undirectedFixtures().length * SEEDS_10.length);
    });

    it("stops after one sweep at maxIterations 1 on a random 1,000-node graph", () => {
        const s = checksummedSnapshot(gnm(1000, 10000, false, 1));
        const r = labelPropagation(s, { maxIterations: 1 });
        expect(r.iterations).toBe(1);
        expect(r.converged).toBe(false);
        s.validate({ checksum: true });
    });
});

/**
 * Two five-cliques a0..a4 and b0..b4 plus a node x, joined by `extra`; built with GraphBuilder
 * because the legacy Graph cannot hold parallel edges.
 */
function cliquesAndX(extra: (b: GraphBuilder) => void): { s: GraphSnapshot; index: (id: string) => number } {
    const b = new GraphBuilder({ directed: false });
    for (const p of ["a", "b"]) {
        for (let i = 0; i < 5; i++) {
            for (let j = i + 1; j < 5; j++) {
                b.addEdge(`${p}${i}`, `${p}${j}`, 1);
            }
        }
    }
    extra(b);
    const s = b.freeze({ checksum: true });
    return { s, index: (id: string) => s.ids.indexOf(id) };
}

function cliqueWhole(labels: ArrayLike<number>, index: (id: string) => number, p: string): boolean {
    const first = labels[index(`${p}0`)];
    return [1, 2, 3, 4].every((i) => labels[index(`${p}${i}`)] === first);
}

describe("indexed.labelPropagation: self-loops, parallel edges and weights", () => {
    it("ignores self-loops: the karate club with loops gives the same labels as without", () => {
        const karate = undirectedFixtures().find((f) => f.name === "Zachary's karate club");
        if (karate === undefined) {
            throw new Error("karate club fixture missing");
        }
        const plain = new GraphBuilder({ directed: false });
        const looped = new GraphBuilder({ directed: false });
        for (const b of [plain, looped]) {
            for (const edge of karate.graph.edges()) {
                b.addEdge(String(edge.source), String(edge.target));
            }
            b.addNode("s");
        }
        for (const id of ["0", "33", "5", "s"]) {
            looped.addEdge(id, id);
        }
        const sPlain = plain.freeze({ checksum: true });
        const sLooped = looped.freeze({ checksum: true });
        for (const seed of SEEDS_10) {
            const r = labelPropagation(sLooped, { randomSeed: seed });
            expect([...r.labels]).toEqual([...labelPropagation(sPlain, { randomSeed: seed }).labels]);
            // a node whose only arc is a self-loop stays a singleton
            expect(r.groups()[r.labels[sLooped.ids.indexOf("s")]].length).toBe(1);
        }
        sPlain.validate({ checksum: true });
        sLooped.validate({ checksum: true });
    });

    it("sums parallel edges when weighted, and counts the neighbour once when not", () => {
        const { s, index } = cliquesAndX((b) => {
            b.addEdge("x", "a0");
            b.addEdge("x", "a0");
            b.addEdge("x", "b0");
        });
        for (const seed of SEEDS_10) {
            const r = labelPropagation(s, { randomSeed: seed });
            expect(cliqueWhole(r.labels, index, "a") && cliqueWhole(r.labels, index, "b")).toBe(true);
            expect(r.labels[index("x")]).toBe(r.labels[index("a0")]);
            expect(dominanceHolds(s, r.labels)).toBe(true);
        }
        let withA = false;
        let withB = false;
        for (let seed = 1; seed <= 50; seed++) {
            const r = labelPropagation(s, { randomSeed: seed, weighted: false });
            expect(dominanceHolds(s, r.labels, false)).toBe(true);
            withA ||= r.labels[index("x")] === r.labels[index("a0")];
            withB ||= r.labels[index("x")] === r.labels[index("b0")];
        }
        expect(withA && withB).toBe(true);
        s.validate({ checksum: true });
    });

    it("follows the heavier arc: weight 3 to one clique outvotes 1 + 1 to the other", () => {
        const { s, index } = cliquesAndX((b) => {
            b.addEdge("x", "a0", 3);
            b.addEdge("x", "b0", 1);
            b.addEdge("x", "b1", 1);
        });
        for (const seed of SEEDS_10) {
            const r = labelPropagation(s, { randomSeed: seed });
            expect(cliqueWhole(r.labels, index, "a") && cliqueWhole(r.labels, index, "b")).toBe(true);
            expect(r.labels[index("x")]).toBe(r.labels[index("a0")]);
            expect(dominanceHolds(s, r.labels)).toBe(true);
        }
        s.validate({ checksum: true });
    });

    it("keeps the label of a node whose arcs all weigh 0", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 1);
        b.addEdge("b", "c", 1);
        b.addEdge("c", "a", 1);
        b.addEdge("z", "a", 0);
        b.addEdge("z", "b", 0);
        const s = b.freeze({ checksum: true });
        for (const seed of SEEDS_10) {
            const r = labelPropagation(s, { randomSeed: seed });
            expect(r.converged).toBe(true);
            expect(r.groups()[r.labels[s.ids.indexOf("z")]].length).toBe(1);
        }
        s.validate({ checksum: true });
    });

    it("ignores the weights with weighted: false -- a 100-weight arc votes like a 1-weight one", () => {
        const { s, index } = cliquesAndX((b) => {
            b.addEdge("x", "a0", 100);
            b.addEdge("x", "b0", 1);
        });
        let withB = false;
        for (let seed = 1; seed <= 50; seed++) {
            expect(labelPropagation(s, { randomSeed: seed }).labels[index("x")]).toBe(
                labelPropagation(s, { randomSeed: seed }).labels[index("a0")],
            );
            const r = labelPropagation(s, { randomSeed: seed, weighted: false });
            withB ||= r.labels[index("x")] === r.labels[index("b0")];
        }
        expect(withB).toBe(true);
        s.validate({ checksum: true });
    });
});

describe("indexed.labelPropagation: weights that are not f32-exact", () => {
    // toSnapshot keeps the legacy graph's f64 weights in the snapshot's role-"weight" edge column
    // whenever the f32 arc array rounds one of them; the votes must use those.

    it("breaks a tie that exists only after rounding: 1 + 1e-9 outvotes 1", () => {
        for (const directed of [false, true]) {
            const g = new Graph({ directed });
            // directed: x reads both arcs as in-arcs, through the reverse view
            g.addEdge(directed ? "a" : "x", directed ? "x" : "a", 1);
            g.addEdge(directed ? "b" : "x", directed ? "x" : "b", 1 + 1e-9);
            g.addEdge("a", "c", 5);
            g.addEdge("b", "d", 5);
            const s = checksummedSnapshot(g);
            const index = (id: string): number => s.ids.indexOf(id);
            for (const seed of SEEDS_10) {
                const r = labelPropagation(s, { randomSeed: seed });
                expect(r.converged).toBe(true);
                expect(r.labels[index("x")], `directed ${directed}, seed ${seed}`).toBe(r.labels[index("b")]);
                expect(r.labels[index("x")]).not.toBe(r.labels[index("a")]);
            }
            s.validate({ checksum: true });
        }
    });

    it("accepts a finite weight above the f32 range and joins its ends", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 1e39);
        const s = checksummedSnapshot(g);
        const r = labelPropagation(s);
        expect(r.count).toBe(1);
        expect(r.converged).toBe(true);
        s.validate({ checksum: true });

        const b = new GraphBuilder({ directed: false, weightDtype: "f64" });
        b.addEdge("a", "b", 1e39);
        expect(labelPropagation(b.freeze()).count).toBe(1);
    });

    it("counts a positive weight below the f32 range as a vote", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 1e-50);
        const s = checksummedSnapshot(g);
        const r = labelPropagation(s);
        expect(r.count).toBe(1);
        expect(r.converged).toBe(true);
        expect(labelPropagation(s, { maxIterations: 0 }).converged).toBe(false);
        s.validate({ checksum: true });
    });
});

function directedTriangles(): GraphBuilder {
    const b = new GraphBuilder({ directed: true });
    for (const [p, q] of [
        ["A1", "A2"],
        ["A2", "A3"],
        ["A3", "A1"],
        ["B1", "B2"],
        ["B2", "B3"],
        ["B3", "B1"],
    ]) {
        b.addEdge(p, q);
        b.addEdge(q, p);
    }
    return b;
}

describe("indexed.labelPropagation: directed snapshots", () => {
    it("reads in-arcs: two one-way triangles give the undirected triangles' partition", () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "a");
        g.addEdge("d", "e");
        g.addEdge("e", "f");
        g.addEdge("f", "d");
        g.addNode("z");
        const s = checksummedSnapshot(g);
        for (const seed of SEEDS_10) {
            const r = labelPropagation(s, { randomSeed: seed });
            expect([...r.labels]).toEqual([0, 0, 0, 1, 1, 1, 2]);
            expect(r.converged).toBe(true);
        }
        s.validate({ checksum: true });
    });

    it("counts a reciprocal pair twice: x joins the triangle it has a pair with", () => {
        const b = directedTriangles();
        b.addEdge("x", "A1");
        b.addEdge("A1", "x");
        b.addEdge("x", "B1");
        const s = b.freeze({ checksum: true });
        const at = (id: string): number => s.ids.indexOf(id);
        for (const seed of SEEDS_10) {
            const r = labelPropagation(s, { randomSeed: seed });
            expect(r.labels[at("x")]).toBe(r.labels[at("A1")]);
            expect(r.labels[at("A1")]).toBe(r.labels[at("A2")]);
            expect(dominanceHolds(s, r.labels)).toBe(true);
        }
        s.validate({ checksum: true });
    });

    it("counts a reciprocal pair once with weighted: false", () => {
        const b = directedTriangles();
        b.addEdge("x", "A1");
        b.addEdge("A1", "x");
        b.addEdge("x", "B1");
        b.addEdge("B2", "x");
        const s = b.freeze({ checksum: true });
        const at = (id: string): number => s.ids.indexOf(id);
        let withA = false;
        let withB = false;
        for (const seed of SEEDS_10) {
            const weighted = labelPropagation(s, { randomSeed: seed });
            withA ||= weighted.labels[at("x")] === weighted.labels[at("A1")];
            withB ||= weighted.labels[at("x")] === weighted.labels[at("B1")];
            const r = labelPropagation(s, { randomSeed: seed, weighted: false });
            expect(r.labels[at("x")]).toBe(r.labels[at("B1")]);
            expect(dominanceHolds(s, r.labels, false)).toBe(true);
        }
        expect(withA && withB).toBe(true);
        s.validate({ checksum: true });
    });

    it("converges on a one-way chain whose last node is reached only by an in-arc", () => {
        const g = new Graph({ directed: true });
        for (let i = 1; i < 10; i++) {
            g.addEdge(`p${i - 1}`, `p${i}`);
        }
        const s = checksummedSnapshot(g);
        for (const seed of SEEDS_10) {
            const r = labelPropagation(s, { randomSeed: seed });
            expect(r.converged).toBe(true);
            expect(dominanceHolds(s, r.labels)).toBe(true);
        }
        s.validate({ checksum: true });
    });

    it("matches the reference FLPA and ends dominant on every directed fixture", () => {
        for (const { name, graph } of directedFixtures()) {
            const s = checksummedSnapshot(graph);
            for (const seed of SEEDS_10) {
                for (const weighted of [true, false]) {
                    const r = labelPropagation(s, { randomSeed: seed, weighted });
                    expect([...r.labels], `${name}, seed ${seed}`).toEqual(referenceFlpa(s, seed, weighted, "uniform"));
                    expect(r.converged).toBe(true);
                    expect(dominanceHolds(s, r.labels, weighted)).toBe(true);
                }
            }
            s.validate({ checksum: true });
        }
    });
});

/** Adjusted Rand index of two partitions (Hubert and Arabie 1985), by pair counting. */
function adjustedRandIndex(a: ArrayLike<number>, b: ArrayLike<number>): number {
    const n = a.length;
    const pairs = (k: number): number => (k * (k - 1)) / 2;
    const cells = new Map<string, number>();
    const rows = new Map<number, number>();
    const cols = new Map<number, number>();
    for (let i = 0; i < n; i++) {
        const key = `${a[i]},${b[i]}`;
        cells.set(key, (cells.get(key) ?? 0) + 1);
        rows.set(a[i], (rows.get(a[i]) ?? 0) + 1);
        cols.set(b[i], (cols.get(b[i]) ?? 0) + 1);
    }
    let index = 0;
    for (const k of cells.values()) {
        index += pairs(k);
    }
    let sumRows = 0;
    for (const k of rows.values()) {
        sumRows += pairs(k);
    }
    let sumCols = 0;
    for (const k of cols.values()) {
        sumCols += pairs(k);
    }
    const expected = (sumRows * sumCols) / pairs(n);
    const maximum = (sumRows + sumCols) / 2;
    return maximum === expected ? 1 : (index - expected) / (maximum - expected);
}

describe("indexed.labelPropagation: partitions the graph determines", () => {
    it("finds the cliques and the isolated node for every seed", () => {
        const expected: Record<string, number[]> = {
            "two triangles and an isolated node": [0, 0, 0, 1, 1, 1, 2],
            "two five-cliques, disconnected": [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
        };
        for (const { name, graph } of undirectedFixtures()) {
            if (!(name in expected)) {
                continue;
            }
            const s = checksummedSnapshot(graph);
            for (const seed of SEEDS_10) {
                expect([...labelPropagation(s, { randomSeed: seed }).labels], `${name}, seed ${seed}`).toEqual(
                    expected[name],
                );
            }
            s.validate({ checksum: true });
        }
    });

    it("recovers a planted partition (mean ARI >= 0.9)", () => {
        let portSum = 0;
        for (const seed of SEEDS_10) {
            const sample = plantedPartitionGraph({ groups: 4, groupSize: 50, pIn: 0.3, pOut: 0.01, seed });
            const g = new Graph({ directed: false });
            for (let i = 0; i < sample.nodeCount; i++) {
                g.addNode(String(i));
            }
            for (let e = 0; e < sample.src.length; e++) {
                g.addEdge(String(sample.src[e]), String(sample.dst[e]));
            }
            const truth = sample.nodeColumns?.community;
            if (!(truth instanceof Uint32Array)) {
                throw new Error("planted partition graph has no u32 community column");
            }
            const s = checksummedSnapshot(g);
            const planted = Array.from({ length: s.nodeCount }, (_, i) => truth[Number(s.ids.idOf(i))]);
            portSum += adjustedRandIndex(labelPropagation(s, { randomSeed: seed }).labels, planted);
            s.validate({ checksum: true });
        }
        expect(portSum / SEEDS_10.length).toBeGreaterThanOrEqual(0.9);
    });
});
