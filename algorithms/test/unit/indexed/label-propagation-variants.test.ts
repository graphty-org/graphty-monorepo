import { GraphBuilder, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    labelPropagation,
    labelPropagationSemiSupervised,
    labelPropagationSynchronous,
} from "../../../src/indexed/label-propagation.js";
import { legacyResult } from "../../helpers/golden.js";
import { Graph } from "../../helpers/legacy-graph.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, gnm, undirectedFixtures } from "./port-fixtures.js";

// ------------------------------------------------------------------ independent helpers

/**
 * Each node's summed vote per neighbour label, read from s.edgeList() rather than the CSR rows the
 * ports walk: self-loops dropped, a directed edge voting at both ends.
 */
function tallies(s: GraphSnapshot, labels: ArrayLike<number>, weighted: boolean): Map<number, number>[] {
    const out = Array.from({ length: s.nodeCount }, () => new Map<number, number>());
    const counted = Array.from({ length: s.nodeCount }, () => new Set<number>());
    const el = s.edgeList();
    const vote = (u: number, v: number, w: number): void => {
        if (!weighted) {
            if (counted[u].has(v)) {
                return;
            }
            counted[u].add(v);
        }
        out[u].set(labels[v], (out[u].get(labels[v]) ?? 0) + (weighted ? w : 1));
    };
    for (let e = 0; e < s.edgeCount; e++) {
        const u = el.src[e];
        const v = el.dst[e];
        if (u !== v) {
            const w = el.weights === null ? 1 : el.weights[e];
            vote(u, v, w);
            vote(v, u, w);
        }
    }
    return out;
}

/** Whether every node (optionally, every node not in `skip`) holds a label at its maximum vote. */
function dominant(s: GraphSnapshot, labels: ArrayLike<number>, weighted = true, skip?: ArrayLike<number>): boolean {
    const all = tallies(s, labels, weighted);
    for (let u = 0; u < s.nodeCount; u++) {
        if (skip !== undefined && skip[u] !== INVALID_INDEX) {
            continue;
        }
        const max = Math.max(0, ...all[u].values());
        if (max > 0 && (all[u].get(labels[u]) ?? 0) < max) {
            return false;
        }
    }
    return true;
}

function snapshotOf(edges: readonly (readonly [string, string, number?])[], directed = false): GraphSnapshot {
    const g = new Graph({ directed });
    for (const [u, v, w] of edges) {
        g.addEdge(u, v, w ?? 1);
    }
    return checksummedSnapshot(g);
}

function cliquePair(size: number, bridged: boolean): GraphSnapshot {
    const edges: [string, string][] = [];
    for (const p of ["a", "b"]) {
        for (let i = 0; i < size; i++) {
            for (let j = i + 1; j < size; j++) {
                edges.push([`${p}${i}`, `${p}${j}`]);
            }
        }
    }
    if (bridged) {
        edges.push(["a0", "b0"]);
    }
    return snapshotOf(edges);
}

function freeSeeds(n: number): Uint32Array {
    return new Uint32Array(n).fill(INVALID_INDEX);
}

/** Two seeds share a result label exactly when they share a seed label. */
function seedsKeepTheirLabels(seeds: ArrayLike<number>, labels: ArrayLike<number>): boolean {
    const bySeed = new Map<number, number>();
    const byLabel = new Map<number, number>();
    for (let u = 0; u < seeds.length; u++) {
        if (seeds[u] === INVALID_INDEX) {
            continue;
        }
        if ((bySeed.get(seeds[u]) ?? labels[u]) !== labels[u] || (byLabel.get(labels[u]) ?? seeds[u]) !== seeds[u]) {
            return false;
        }
        bySeed.set(seeds[u], labels[u]);
        byLabel.set(labels[u], seeds[u]);
    }
    return true;
}

/** The murmur3 32-bit finalizer, written out independently of the port's copy. */
function scramble(x: number): number {
    let h = x >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
}

/** A small seeded generator for the planted-partition graphs. */
function lcg(seed: number): () => number {
    let x = seed >>> 0;
    return () => {
        x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
        return x / 4294967296;
    };
}

// ------------------------------------------------------------------ semi-supervised

describe("indexed.labelPropagationSemiSupervised", () => {
    it("is labelPropagation bit for bit when no node is seeded", () => {
        for (const { graph } of [...undirectedFixtures(), ...directedFixtures()]) {
            const s = checksummedSnapshot(graph);
            for (const randomSeed of [1, 42, 7]) {
                const plain = labelPropagation(s, { randomSeed });
                const semi = labelPropagationSemiSupervised(s, freeSeeds(s.nodeCount), { randomSeed });
                expect([...semi.labels]).toEqual([...plain.labels]);
                expect(semi.iterations).toBe(plain.iterations);
                expect(semi.converged).toBe(plain.converged);
            }
            s.validate({ checksum: true });
        }
    });

    it("pulls every leaf of two joined stars to the seed at its centre", () => {
        const edges: [string, string][] = [["a", "b"]];
        for (let i = 0; i < 6; i++) {
            edges.push(["a", `a${i}`], ["b", `b${i}`]);
        }
        const s = snapshotOf(edges);
        const seeds = freeSeeds(s.nodeCount);
        const a = s.ids.indexOf("a");
        const b = s.ids.indexOf("b");
        seeds[a] = 70;
        seeds[b] = 3;
        for (const randomSeed of [1, 2, 3, 4, 5]) {
            const r = labelPropagationSemiSupervised(s, seeds, { randomSeed });
            expect(r.count).toBe(2);
            expect(r.converged).toBe(true);
            for (let u = 0; u < s.nodeCount; u++) {
                expect(r.labels[u]).toBe(r.labels[String(s.ids.idOf(u)).startsWith("a") ? a : b]);
            }
        }
        s.validate({ checksum: true });
    });

    it("keeps every seed's label, and ends dominant at every unseeded node, on every fixture", () => {
        for (const { graph } of [...undirectedFixtures(), ...directedFixtures()]) {
            const s = checksummedSnapshot(graph);
            const seeds = freeSeeds(s.nodeCount);
            // Every third node seeded, with three seed labels, so seeds of one label sit apart.
            for (let u = 0; u < s.nodeCount; u += 3) {
                seeds[u] = 1000 + (u % 9) / 3;
            }
            const r = labelPropagationSemiSupervised(s, seeds, { randomSeed: 5 });
            expect(seedsKeepTheirLabels(seeds, r.labels)).toBe(true);
            expect(r.converged).toBe(true);
            expect(dominant(s, r.labels, true, seeds)).toBe(true);
            s.validate({ checksum: true });
        }
    });

    it("renumbers the result to 0..count-1 in first-seen order, whatever the seed values", () => {
        const s = snapshotOf([
            ["c", "a"],
            ["c", "b"],
            ["y", "x"],
        ]);
        const seeds = freeSeeds(s.nodeCount);
        seeds[s.ids.indexOf("c")] = 4_000_000_000;
        seeds[s.ids.indexOf("y")] = 12;
        const r = labelPropagationSemiSupervised(s, seeds);
        expect([...r.labels]).toEqual([0, 0, 0, 1, 1]);
        expect(r.count).toBe(2);
        expect(r.groups().map((g) => [...g])).toEqual([
            [0, 1, 2],
            [3, 4],
        ]);
        s.validate({ checksum: true });
    });

    it("keeps two differently seeded neighbours apart, even across a single edge", () => {
        const s = snapshotOf([["a", "b"]]);
        const r = labelPropagationSemiSupervised(s, Uint32Array.from([0, 1]));
        expect([...r.labels]).toEqual([0, 1]);
        expect(r.converged).toBe(true);
        expect(r.iterations).toBe(0);
        s.validate({ checksum: true });
    });

    it("handles 100,000 seeds -- every node of a 100,000-node ring seeded -- and a ring with half of them seeded", () => {
        const n = 100_000;
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i < n; i++) {
            b.addEdge(`r${i}`, `r${(i + 1) % n}`);
        }
        const s = b.freeze({ checksum: true });
        const all = new Uint32Array(n);
        for (let u = 0; u < n; u++) {
            all[u] = u % 1000;
        }
        const fixed = labelPropagationSemiSupervised(s, all);
        expect(fixed.count).toBe(1000);
        expect(fixed.iterations).toBe(0);
        expect(fixed.converged).toBe(true);
        expect(seedsKeepTheirLabels(all, fixed.labels)).toBe(true);

        const half = freeSeeds(n);
        for (let u = 0; u < n; u += 2) {
            half[u] = u;
        }
        const r = labelPropagationSemiSupervised(s, half);
        expect(r.converged).toBe(true);
        expect(seedsKeepTheirLabels(half, r.labels)).toBe(true);
        expect(r.count).toBe(n / 2);
        s.validate({ checksum: true });
    });

    it("keeps disjoint components apart with no seed, and takes 200,000 seeds without throwing (issue #565)", () => {
        // 2.x numbered free nodes from Math.max(...seedValues) + 1: -Infinity for no seed, which put
        // every node in one community, and a stack overflow for 200,000 seeds.
        const pair = snapshotOf([
            ["a", "b"],
            ["c", "d"],
        ]);
        const none = labelPropagationSemiSupervised(pair, freeSeeds(pair.nodeCount));
        expect([...none.labels]).toEqual([0, 0, 1, 1]);
        expect(none.converged).toBe(true);
        pair.validate({ checksum: true });

        const n = 200_000;
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i < n; i++) {
            b.addEdge(`r${i}`, `r${(i + 1) % n}`);
        }
        const ring = b.freeze({ checksum: true });
        const seeds = new Uint32Array(n);
        for (let u = 0; u < n; u++) {
            seeds[u] = u * 7;
        }
        const r = labelPropagationSemiSupervised(ring, seeds);
        expect(r.count).toBe(n);
        expect(r.converged).toBe(true);
        // Renumbered to 0..count-1 in first-seen order, not the seed values.
        expect(r.labels.every((label, u) => label === u)).toBe(true);
        ring.validate({ checksum: true });
    });

    it("leaves every node where it started at maxIterations 0, and says the queue did not empty", () => {
        const s = cliquePair(3, true);
        const seeds = freeSeeds(s.nodeCount);
        seeds[0] = 9;
        const r = labelPropagationSemiSupervised(s, seeds, { maxIterations: 0 });
        expect(r.count).toBe(s.nodeCount);
        expect(r.iterations).toBe(0);
        expect(r.converged).toBe(false);
        s.validate({ checksum: true });
    });

    it("reports converged at maxIterations 0 when every starting label is already dominant, as labelPropagation does", () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode("a");
        b.addNode("b");
        const s = b.freeze({ checksum: true });
        expect(labelPropagation(s, { maxIterations: 0 }).converged).toBe(true);
        expect(labelPropagationSemiSupervised(s, freeSeeds(2), { maxIterations: 0 }).converged).toBe(true);
        expect(labelPropagationSynchronous(s, { maxIterations: 0 }).converged).toBe(true);
        s.validate({ checksum: true });
    });

    it("returns an empty partition on an empty snapshot", () => {
        const s = new GraphBuilder({ directed: false }).freeze({ checksum: true });
        const r = labelPropagationSemiSupervised(s, new Uint32Array(0));
        expect(r.count).toBe(0);
        expect(r.iterations).toBe(0);
        expect(r.converged).toBe(true);
        s.validate({ checksum: true });
    });

    it("rejects a seed array of the wrong length, bad options and bad weights", () => {
        const s = cliquePair(3, false);
        expect(() => labelPropagationSemiSupervised(s, new Uint32Array(2))).toThrow(RangeError);
        expect(() => labelPropagationSemiSupervised(s, freeSeeds(6), { maxIterations: -1 })).toThrow(RangeError);
        expect(() => labelPropagationSemiSupervised(s, freeSeeds(6), { randomSeed: 0.5 })).toThrow(RangeError);
        const negative = snapshotOf([["a", "b", -1]]);
        expect(() => labelPropagationSemiSupervised(negative, freeSeeds(2))).toThrow(RangeError);
        s.validate({ checksum: true });
    });

    it("follows the exact f64 weights the snapshot keeps: 1 + 1e-9 outvotes 1", () => {
        const s = snapshotOf([
            ["x", "left", 1 + 1e-9],
            ["x", "right", 1],
        ]);
        const seeds = freeSeeds(3);
        seeds[s.ids.indexOf("left")] = 0;
        seeds[s.ids.indexOf("right")] = 1;
        const r = labelPropagationSemiSupervised(s, seeds);
        expect(r.labels[s.ids.indexOf("x")]).toBe(r.labels[s.ids.indexOf("left")]);
        s.validate({ checksum: true });
    });
});

// ------------------------------------------------------------------ synchronous

describe("indexed.labelPropagationSynchronous", () => {
    it("settles a single edge that the legacy synchronous function swaps for ever", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        const legacy = legacyResult() as LabelPropagationResult;
        expect(legacy.converged).toBe(false);
        expect(new Set(legacy.communities.values()).size).toBe(2);

        const s = checksummedSnapshot(g);
        const r = labelPropagationSynchronous(s);
        expect([...r.labels]).toEqual([0, 0]);
        expect(r.converged).toBe(true);
        // One pass that moves, then one quiet pass in each direction.
        expect(r.iterations).toBe(3);
        s.validate({ checksum: true });
    });

    it("settles bipartite components, which 2.x swapped for ever like the single edge (issue #564)", () => {
        const k34: [string, string][] = [];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                k34.push([`l${i}`, `r${j}`]);
            }
        }
        const star = Array.from({ length: 49 }, (_, i): [string, string] => ["hub", `leaf${i}`]);
        const cycle = Array.from({ length: 8 }, (_, i): [string, string] => [`c${i}`, `c${(i + 1) % 8}`]);
        const path = Array.from({ length: 19 }, (_, i): [string, string] => [`p${i}`, `p${i + 1}`]);
        for (const [name, edges] of Object.entries({ k34, star, cycle, path })) {
            const s = snapshotOf(edges);
            const r = labelPropagationSynchronous(s);
            expect(r.converged, name).toBe(true);
            expect(dominant(s, r.labels), name).toBe(true);
            s.validate({ checksum: true });
        }
    });

    it("puts each clique in one community", () => {
        const s = cliquePair(5, false);
        const r = labelPropagationSynchronous(s);
        expect([...r.labels]).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
        expect(r.converged).toBe(true);
        s.validate({ checksum: true });
    });

    it("ends with every label dominant on every converged run over the fixtures, weighted and not", () => {
        for (const { name, graph } of [...undirectedFixtures(), ...directedFixtures()]) {
            const s = checksummedSnapshot(graph);
            for (const weighted of [true, false]) {
                const r = labelPropagationSynchronous(s, { weighted });
                expect(r.converged, name).toBe(true);
                expect(dominant(s, r.labels, weighted), name).toBe(true);
                expect(labelPropagationSynchronous(s, { weighted }).labels).toEqual(r.labels);
            }
            s.validate({ checksum: true });
        }
    });

    it("converges on a random 2,000-node graph well inside the default cap", () => {
        const s = checksummedSnapshot(gnm(2000, 8000, false, 424242));
        const r = labelPropagationSynchronous(s);
        expect(r.converged).toBe(true);
        expect(r.iterations).toBeLessThan(100);
        expect(dominant(s, r.labels)).toBe(true);
        s.validate({ checksum: true });
    });

    it("follows the heavier edge when weighted and the neighbour count when not", () => {
        // x has one weight-5 edge to the pair {p, q} and two weight-1 edges to the triangle.
        const s = snapshotOf([
            ["p", "q", 9],
            ["x", "p", 5],
            ["x", "t1", 1],
            ["x", "t2", 1],
            ["t1", "t2", 1],
            ["t2", "t3", 1],
            ["t1", "t3", 1],
        ]);
        const x = s.ids.indexOf("x");
        const heavy = labelPropagationSynchronous(s);
        expect(heavy.labels[x]).toBe(heavy.labels[s.ids.indexOf("p")]);
        const counted = labelPropagationSynchronous(s, { weighted: false });
        expect(counted.labels[x]).toBe(counted.labels[s.ids.indexOf("t1")]);
        s.validate({ checksum: true });
    });

    it("reads in-arcs on a directed snapshot: two one-way triangles give two communities", () => {
        const s = snapshotOf(
            [
                ["a", "b"],
                ["b", "c"],
                ["c", "a"],
                ["d", "e"],
                ["e", "f"],
                ["f", "d"],
            ],
            true,
        );
        const r = labelPropagationSynchronous(s);
        expect([...r.labels]).toEqual([0, 0, 0, 1, 1, 1]);
        s.validate({ checksum: true });
    });

    it("stops after two quiet passes on an edgeless graph, and runs no pass at maxIterations 0", () => {
        const b = new GraphBuilder({ directed: false });
        for (const id of ["a", "b", "c"]) {
            b.addNode(id);
        }
        const s = b.freeze({ checksum: true });
        const r = labelPropagationSynchronous(s);
        expect([...r.labels]).toEqual([0, 1, 2]);
        expect(r.iterations).toBe(2);
        expect(r.converged).toBe(true);
        const none = labelPropagationSynchronous(cliquePair(3, false), { maxIterations: 0 });
        expect(none.iterations).toBe(0);
        expect(none.converged).toBe(false);
        expect(none.count).toBe(6);
        s.validate({ checksum: true });
    });

    it("keeps a label while it is dominant, whatever the priority of a label that ties it", () => {
        // A path of four in the order 2-0-3-1: two pairs, each node's label tied with the other pair's.
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i < 4; i++) {
            b.addNode(i);
        }
        b.addEdge(0, 2);
        b.addEdge(0, 3);
        b.addEdge(1, 3);
        const s = b.freeze({ checksum: true });
        const r = labelPropagationSynchronous(s);
        expect([...r.labels]).toEqual([0, 1, 0, 1]);
        expect(r.converged).toBe(true);
        s.validate({ checksum: true });
    });

    it("takes the tied label of lowest priority, not the lowest label (issue #652)", () => {
        // The centre of a two-leaf star sees labels 1 and 2 once each. The first pass moves only to a
        // label of higher priority than the centre's own 0 (whose priority, scramble(0), is 0), so it
        // takes whichever of 1 and 2 scrambles lower.
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i < 3; i++) {
            b.addNode(i);
        }
        b.addEdge(0, 1);
        b.addEdge(0, 2);
        const s = b.freeze({ checksum: true });
        const pick = scramble(1) < scramble(2) ? 1 : 2;
        const raw = [pick, 1, 2];
        const want = raw.map((l) => raw.indexOf(l));
        expect([...labelPropagationSynchronous(s, { maxIterations: 1 }).labels]).toEqual(want);
        s.validate({ checksum: true });
    });

    it("stops on a two-pass cycle with converged false, whatever the pass cap above it", () => {
        // Found by a seeded search: under the scrambled priority, some nodes climb on every up pass
        // and fall back on every down pass.
        const g = new Graph({ directed: false });
        for (let i = 0; i < 9; i++) {
            g.addNode(i);
        }
        const edges = [
            [0, 1, 2],
            [0, 2, 4],
            [0, 6, 4],
            [0, 7, 3],
            [0, 8, 1],
            [1, 3, 5],
            [1, 7, 4],
            [2, 7, 3],
            [3, 7, 1],
            [4, 7, 5],
            [5, 8, 1],
            [6, 8, 4],
        ];
        for (const [u, v, w] of edges) {
            g.addEdge(u, v, w);
        }
        const s = checksummedSnapshot(g);
        const r = labelPropagationSynchronous(s, { maxIterations: 1000 });
        expect(r.converged).toBe(false);
        expect(r.iterations).toBeLessThan(100);
        for (const maxIterations of [997, 998, 999]) {
            const again = labelPropagationSynchronous(s, { maxIterations });
            expect([...again.labels]).toEqual([...r.labels]);
            expect(again.iterations).toBe(r.iterations);
        }
        s.validate({ checksum: true });
    });

    // Issue #652: ranked by raw label, a path or cycle numbered in order settled one node per two
    // passes -- 1,998 passes for 1,000 nodes, 949 communities at the default cap -- and ended as one
    // community. Under the scrambled priority it settles in a few passes into short runs, as FLPA does.
    it("settles a 1,000-node path and cycle numbered in order within a few passes, into short runs like labelPropagation's", () => {
        for (const closed of [false, true]) {
            const b = new GraphBuilder({ directed: false });
            for (let i = 0; i < 1000; i++) {
                b.addNode(i);
            }
            for (let i = 0; i < (closed ? 1000 : 999); i++) {
                b.addEdge(i, (i + 1) % 1000);
            }
            const s = b.freeze({ checksum: true });
            const r = labelPropagationSynchronous(s);
            const name = closed ? "cycle" : "path";
            expect(r.converged, name).toBe(true);
            expect(r.iterations, name).toBeLessThanOrEqual(20);
            expect(dominant(s, r.labels), name).toBe(true);
            // Every community is one run of consecutive nodes (on the cycle the last run may join the
            // first); dominance makes each at least two long.
            let end = 1000;
            while (closed && r.labels[end - 1] === r.labels[0]) {
                end--;
            }
            for (let i = 1; i < end; i++) {
                if (r.labels[i] !== r.labels[i - 1]) {
                    expect(r.labels[i], `${name} run at ${i}`).toBe(Math.max(...r.labels.subarray(0, i)) + 1);
                }
            }
            const flpa = labelPropagation(s).count;
            expect(r.count, name).toBeGreaterThan(flpa / 2);
            expect(r.count, name).toBeLessThan(flpa * 2);
            s.validate({ checksum: true });
        }
    });

    it("puts a 200-leaf star in one community", () => {
        const b = new GraphBuilder({ directed: false });
        for (let i = 0; i <= 200; i++) {
            b.addNode(i);
        }
        for (let i = 1; i <= 200; i++) {
            b.addEdge(0, i);
        }
        const s = b.freeze({ checksum: true });
        const r = labelPropagationSynchronous(s);
        expect(r.converged).toBe(true);
        expect(r.count).toBe(1);
        s.validate({ checksum: true });
    });

    it("recovers four planted communities of 50 on ten seeds, as labelPropagation does", () => {
        for (let seed = 1; seed <= 10; seed++) {
            const rand = lcg(seed);
            const b = new GraphBuilder({ directed: false });
            for (let i = 0; i < 200; i++) {
                b.addNode(i);
            }
            for (let u = 0; u < 200; u++) {
                for (let v = u + 1; v < 200; v++) {
                    if (rand() < (Math.floor(u / 50) === Math.floor(v / 50) ? 0.3 : 0.005)) {
                        b.addEdge(u, v);
                    }
                }
            }
            const s = b.freeze({ checksum: true });
            const r = labelPropagationSynchronous(s);
            expect(r.converged, `seed ${seed}`).toBe(true);
            expect(r.count, `seed ${seed}`).toBe(4);
            for (let u = 0; u < 200; u++) {
                expect(r.labels[u], `seed ${seed} node ${u}`).toBe(r.labels[u - (u % 50)]);
            }
            expect(labelPropagation(s).count, `seed ${seed}`).toBe(4);
            s.validate({ checksum: true });
        }
    });

    it("gives the same labels and passes on every run, and the same partition when the cap is raised past them", () => {
        const s = checksummedSnapshot(gnm(500, 1500, false, 652));
        const r = labelPropagationSynchronous(s);
        expect(r.converged).toBe(true);
        const again = labelPropagationSynchronous(s);
        expect([...again.labels]).toEqual([...r.labels]);
        expect(again.iterations).toBe(r.iterations);
        expect([...labelPropagationSynchronous(s, { maxIterations: 1000 }).labels]).toEqual([...r.labels]);
        s.validate({ checksum: true });
    });

    it("rejects a bad maxIterations and a negative weight", () => {
        const s = cliquePair(3, false);
        expect(() => labelPropagationSynchronous(s, { maxIterations: 1.5 })).toThrow(RangeError);
        expect(() => labelPropagationSynchronous(snapshotOf([["a", "b", -2]]))).toThrow(RangeError);
        s.validate({ checksum: true });
    });
});
