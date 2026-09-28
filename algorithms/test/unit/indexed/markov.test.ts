import { GraphBuilder, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { type MCLOptions } from "../../../src/clustering/mcl-legacy.js";
import { Graph } from "../../../src/core/graph.js";
import { exactArcWeights, labelsToGroups } from "../../../src/indexed/facade.js";
import { markovClustering } from "../../../src/indexed/markov.js";
import { modularity } from "../../../src/indexed/modularity.js";
import { legacyResult } from "../../helpers/golden.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";
import { directedFixtures, undirectedFixtures } from "./port-fixtures.js";

/** Weights that are not f32-exact, so a port reading the f32 arc array would drift. */
function thirdsStar(): Graph {
    const g = new Graph({ directed: false });
    for (let i = 1; i <= 6; i++) {
        g.addEdge("hub", `leaf${i}`, i / 3);
    }
    g.addEdge("leaf1", "leaf2", 0.1);
    g.addEdge("leaf3", "leaf4", 1e-3 / 3);
    return g;
}

function fixtures(): { name: string; graph: Graph }[] {
    return [...undirectedFixtures(), ...directedFixtures(), { name: "star with thirds", graph: thirdsStar() }];
}

const OPTION_SETS: MCLOptions[] = [
    {},
    { inflation: 1.5 },
    { inflation: 3, expansion: 3 },
    { selfLoops: false },
    { pruningThreshold: 0.01, maxIterations: 7 },
];

describe("indexed.markovClustering", () => {
    it("separates two triangles joined by one edge", () => {
        const g = new Graph({ directed: false });
        for (const [u, v] of [
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
            ["d", "e"],
            ["e", "f"],
            ["f", "d"],
            ["c", "d"],
        ]) {
            g.addEdge(u, v);
        }
        const s = checksummedSnapshot(g);
        const r = markovClustering(s);
        expect(r.count).toBe(2);
        expect(r.groups().map((group) => [...group])).toEqual([
            [0, 1, 2],
            [3, 4, 5],
        ]);
        expect(r.converged).toBe(true);
        expect(r.attractors.length).toBeGreaterThan(0);
        s.validate({ checksum: true });
    });

    it("puts a node whose column empties in a community of its own, after the flow clusters", () => {
        const g = new Graph({ directed: false });
        g.addNode("alone");
        g.addEdge("a", "b");
        const s = checksummedSnapshot(g);
        const r = markovClustering(s, { selfLoops: false });
        // Without self-loops the flow between a and b swaps every round, so each keeps its own.
        expect([...r.labels]).toEqual([2, 0, 1]);
        expect(r.count).toBe(3);
        expect([...r.attractors]).toEqual([1, 2]);
    });

    it("returns an empty converged partition for an empty snapshot", () => {
        const r = markovClustering(new GraphBuilder({ directed: false }).freeze());
        expect(r.count).toBe(0);
        expect(r.iterations).toBe(0);
        expect(r.converged).toBe(true);
    });

    it("counts the rounds it ran when it stops at the cap", () => {
        const s = checksummedSnapshot(undirectedFixtures()[5].graph);
        const r = markovClustering(s, { maxIterations: 2, tolerance: 0 });
        expect(r.iterations).toBe(2);
        expect(r.converged).toBe(false);
    });

    it("refuses bad parameters and weights", () => {
        const s = checksummedSnapshot(undirectedFixtures()[0].graph);
        expect(() => markovClustering(s, { expansion: 1.5 })).toThrow(RangeError);
        expect(() => markovClustering(s, { inflation: 0 })).toThrow(RangeError);
        expect(() => markovClustering(s, { maxIterations: -1 })).toThrow(RangeError);
        expect(() => markovClustering(s, { tolerance: -1 })).toThrow(RangeError);
        expect(() => markovClustering(s, { weights: new Float64Array(1) })).toThrow(RangeError);
        expect(() => markovClustering(s, { weights: new Float64Array(s.arcCount).fill(-1) })).toThrow(RangeError);
    });

    it("sums parallel arcs and replaces a self-loop's weight with the added loop", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 1);
        b.addEdge("a", "b", 2);
        b.addEdge("a", "a", 5);
        b.addEdge("b", "c", 3);
        const multi = markovClustering(b.freeze());
        const g = new Graph({ directed: false });
        g.addEdge("a", "b", 3);
        g.addEdge("b", "c", 3);
        const simple = markovClustering(checksummedSnapshot(g));
        expect([...multi.labels]).toEqual([...simple.labels]);
        expect([...multi.attractors]).toEqual([...simple.attractors]);
        expect(multi.iterations).toBe(simple.iterations);
    });

    for (const options of OPTION_SETS) {
        it(`equals legacy markovClustering with ${JSON.stringify(options)} on every fixture`, () => {
            for (const { name, graph } of fixtures()) {
                const s = checksummedSnapshot(graph);
                const legacy = legacyResult() as MCLResult;
                const port = markovClustering(s, { ...options, weights: exactArcWeights(s) });
                expect(labelsToGroups(s.ids, port.labels, port.count), name).toEqual(legacy.communities);
                expect(
                    Array.from(port.attractors, (i) => s.ids.idOf(i)),
                    name,
                ).toEqual([...legacy.attractors]);
                expect(port.converged, name).toBe(legacy.converged);
                // The legacy function reports one round too many when it stops at the cap.
                expect(port.iterations + (port.converged ? 0 : 1), name).toBe(legacy.iterations);
                s.validate({ checksum: true });
            }
        });
    }
});

describe("indexed.modularity", () => {
    it("equals legacy calculateModularity on MCL's partition of every undirected fixture", () => {
        for (const { name, graph } of [...undirectedFixtures(), { name: "star with thirds", graph: thirdsStar() }]) {
            const s = checksummedSnapshot(graph);
            const { labels } = markovClustering(s, { weights: exactArcWeights(s) });
            const weights = exactArcWeights(s);
            for (const resolution of [1, 0.5, 2]) {
                const expected = legacyResult() as number;
                expect(modularity(s, labels, { resolution, weights }), name).toBeCloseTo(expected, 12);
            }
            s.validate({ checksum: true });
        }
    });

    it("scores one community 0 and two separate triangles 1/2, where calculateMCLModularity gives both 1/3", () => {
        const g = new Graph({ directed: false });
        for (const [u, v] of [
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
            ["d", "e"],
            ["e", "f"],
            ["f", "d"],
        ]) {
            g.addEdge(u, v);
        }
        const s = checksummedSnapshot(g);
        const one = new Uint32Array(6);
        const two = Uint32Array.from([0, 0, 0, 1, 1, 1]);
        expect(modularity(s, one)).toBeCloseTo(0, 15);
        expect(modularity(s, two)).toBeCloseTo(0.5, 15);
        // The legacy MCL modularity collects the null-model term over the edges only.
        expect(legacyResult() as number).toBeCloseTo(1 / 3, 15);
        expect(legacyResult() as number).toBeCloseTo(1 / 3, 15);
    });

    it("reads edge weights by default, which calculateMCLModularity ignores", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge("a", "b", 3);
        b.addEdge("c", "d", 1);
        b.addEdge("b", "c", 1);
        const s = b.freeze();
        const labels = Uint32Array.from([0, 0, 1, 1]);
        // Weighted: 2m = 10, in = 6 and 2, tot = 7 and 3 -> 0.8 - 0.49 - 0.09 = 0.22.
        expect(modularity(s, labels)).toBeCloseTo(0.22, 15);
        // All ones: 2m = 6, in = 2 and 2, tot = 3 and 3 -> 2/3 - 1/4 - 1/4 = 1/6.
        expect(modularity(s, labels, { weights: new Float64Array(s.arcCount).fill(1) })).toBeCloseTo(1 / 6, 15);
    });

    it("counts a self-loop twice in the degree and leaves unlabelled nodes out", () => {
        const b = new GraphBuilder({ directed: false });
        b.addEdge(0, 0, 1);
        b.addEdge(0, 1, 1);
        b.addNode(2);
        const s = b.freeze();
        // 2m = 4 (loop twice, edge twice); community {0, 1}: in = 4, tot = 4 -> 1 - 1 = 0.
        expect(modularity(s, Uint32Array.from([0, 0, INVALID_INDEX]))).toBeCloseTo(0, 15);
        // {0} alone: in = 2, tot = 3; {1}: in 0, tot 1 -> 2/4 - 9/16 - 1/16 = -1/8.
        expect(modularity(s, Uint32Array.from([0, 1, 2]))).toBeCloseTo(-1 / 8, 15);
    });

    it("reads a directed snapshot as undirected", () => {
        const [first] = directedFixtures();
        const s = checksummedSnapshot(first.graph);
        const { labels } = markovClustering(s);
        const u = new Graph({ directed: false });
        for (const edge of first.graph.edges()) {
            u.addEdge(edge.source, edge.target, edge.weight);
        }
        for (const node of first.graph.nodes()) {
            u.addNode(node.id);
        }
        const su = checksummedSnapshot(u);
        const relabel = Array.from({ length: su.nodeCount }, (_, i) => labels[s.ids.indexOf(su.ids.idOf(i))]);
        expect(modularity(s, labels)).toBeCloseTo(modularity(su, Uint32Array.from(relabel)), 12);
    });

    it("returns 0 without edges and refuses mismatched arrays", () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode("x");
        const s = b.freeze();
        expect(modularity(s, new Uint32Array(1))).toBe(0);
        expect(() => modularity(s, new Uint32Array(2))).toThrow(RangeError);
        expect(() => modularity(s, new Uint32Array(1), { weights: new Float64Array(3) })).toThrow(RangeError);
    });
});
