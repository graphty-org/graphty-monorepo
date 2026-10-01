import { describe, expect, it } from "vitest";

import { NAMED_GRAPH_NAMES, namedGraph,type NamedGraphName } from "../../src/generators/named.js";
import { componentCount, degrees, expectSimple, graphHash } from "../helpers/graph.js";

/** Invariants computed with networkx 3.1: [nodes, edges, triangles, min degree, max degree]. */
const INVARIANTS: Readonly<Record<NamedGraphName, readonly number[]>> = {
    bull: [5, 5, 1, 1, 3],
    chvatal: [12, 24, 0, 4, 4],
    cubical: [8, 12, 0, 3, 3],
    desargues: [20, 30, 0, 3, 3],
    diamond: [4, 5, 2, 2, 3],
    dodecahedral: [20, 30, 0, 3, 3],
    frucht: [12, 18, 3, 3, 3],
    heawood: [14, 21, 0, 3, 3],
    "hoffman-singleton": [50, 175, 0, 7, 7],
    house: [5, 6, 1, 2, 3],
    "house-x": [5, 8, 5, 2, 4],
    icosahedral: [12, 30, 20, 5, 5],
    "krackhardt-kite": [10, 18, 11, 1, 6],
    "moebius-kantor": [16, 24, 0, 3, 3],
    octahedral: [6, 12, 8, 4, 4],
    pappus: [18, 27, 0, 3, 3],
    "sedgewick-maze": [8, 10, 1, 1, 4],
    tetrahedral: [4, 6, 4, 3, 3],
    "truncated-cube": [24, 36, 8, 3, 3],
    "truncated-tetrahedron": [12, 18, 4, 3, 3],
    tutte: [46, 69, 0, 3, 3],
};

/**
 * The number of triangles.
 * @param n - the node count
 * @param src - edge sources
 * @param dst - edge targets
 * @returns the triangle count
 */
function triangles(n: number, src: Uint32Array, dst: Uint32Array): number {
    const adj = Array.from({ length: n }, () => new Set<number>());
    for (let e = 0; e < src.length; e++) {
        adj[src[e]].add(dst[e]);
        adj[dst[e]].add(src[e]);
    }
    let count = 0;
    for (let u = 0; u < n; u++) {
        for (const v of adj[u]) {
            for (const w of adj[v]) {
                if (u < v && v < w && adj[u].has(w)) {
                    count++;
                }
            }
        }
    }
    return count;
}

describe("namedGraph", () => {
    it.each(NAMED_GRAPH_NAMES.map((name) => [name]))("%s matches networkx's invariants", (name) => {
        const g = namedGraph(name);
        expectSimple(g);
        const [n, m, tri, dmin, dmax] = INVARIANTS[name];
        expect(g.nodeCount).toBe(n);
        expect(g.src.length).toBe(m);
        expect(triangles(g.nodeCount, g.src, g.dst)).toBe(tri);
        expect(Math.min(...degrees(g))).toBe(dmin);
        expect(Math.max(...degrees(g))).toBe(dmax);
        expect(componentCount(g)).toBe(1);
    });

    it("Krackhardt's kite puts the degree, betweenness and closeness maxima on different nodes", () => {
        const d = degrees(namedGraph("krackhardt-kite"));
        expect(d.indexOf(Math.max(...d))).toBe(3);
    });

    it("rejects an unknown name and takes weights", () => {
        expect(() => namedGraph("nope" as NamedGraphName)).toThrow(RangeError);
        expect(namedGraph("bull", { weights: { kind: "uniform" } }).weights?.length).toBe(5);
    });

    it("GOLDEN VALUES: the edge order of every named graph (a change is a breaking change)", () => {
        expect(NAMED_GRAPH_NAMES.map((name) => graphHash(namedGraph(name)))).toMatchInlineSnapshot(`
          [
            "167fe6a4",
            "a2ca0619",
            "816e2a1d",
            "0829f9c1",
            "d53cfda2",
            "9c7cecd1",
            "08245ca9",
            "8bf2b70a",
            "b1aeac66",
            "492bf751",
            "d7c855c1",
            "6ff9d829",
            "c2ae2314",
            "35d1b435",
            "6b1cfa43",
            "63be7fd6",
            "e5be9d3e",
            "b317b9b1",
            "3d0c2fed",
            "0ade9299",
            "4ff0091a",
          ]
        `);
    });
});
