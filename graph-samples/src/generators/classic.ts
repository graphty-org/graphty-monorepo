/**
 * The deterministic families: no seed, closed-form structure, O(n + m). Every function returns an
 * undirected simple graph whose node order and edge order are part of its contract (stated in each
 * JSDoc), so an index means the same node in every version.
 */

import { type U32 } from "@graphty/graph-format";

import { type SampleGraph } from "../types.js";
import { checkEdgeCount, checkInt, EdgeBuffer, toGraph } from "./util.js";
import { applyWeights, type WeightOptions } from "./weights.js";

/**
 * Append every pair (lo + i, lo + j), i < j, of the clique on [lo, lo + size), row-major.
 * @param out - the buffer
 * @param lo - the first node
 * @param size - the clique size
 */
function pushClique(out: EdgeBuffer, lo: number, size: number): void {
    for (let i = lo; i < lo + size; i++) {
        for (let j = i + 1; j < lo + size; j++) {
            out.push(i, j);
        }
    }
}

/**
 * The path P_n: edges (i, i + 1) for i = 0 .. n - 2.
 * @param options - the options
 * @param options.n - the node count, >= 0
 * @returns the graph
 */
export function pathGraph(options: { n: number } & WeightOptions): SampleGraph {
    const { n } = options;
    checkInt("n", n, 0);
    const out = new EdgeBuffer(n);
    for (let i = 0; i + 1 < n; i++) {
        out.push(i, i + 1);
    }
    return applyWeights(toGraph(n, out, false), options);
}

/**
 * The cycle C_n: the path P_n plus the edge (n - 1, 0).
 * @param options - the options
 * @param options.n - the node count, >= 3
 * @returns the graph
 */
export function cycleGraph(options: { n: number } & WeightOptions): SampleGraph {
    const { n } = options;
    checkInt("n", n, 3);
    const out = new EdgeBuffer(n);
    for (let i = 0; i + 1 < n; i++) {
        out.push(i, i + 1);
    }
    out.push(n - 1, 0);
    return applyWeights(toGraph(n, out, false), options);
}

/**
 * The star: hub 0 joined to every other node, edges (0, i) for i = 1 .. n - 1.
 * @param options - the options
 * @param options.n - the node count including the hub, >= 1
 * @returns the graph
 */
export function starGraph(options: { n: number } & WeightOptions): SampleGraph {
    const { n } = options;
    checkInt("n", n, 1);
    const out = new EdgeBuffer(n);
    for (let i = 1; i < n; i++) {
        out.push(0, i);
    }
    return applyWeights(toGraph(n, out, false), options);
}

/**
 * The wheel W_n: the star's spokes (0, i), then the rim (i, i + 1) for i = 1 .. n - 2, then
 * (n - 1, 1).
 * @param options - the options
 * @param options.n - the node count including the hub, >= 4
 * @returns the graph
 */
export function wheelGraph(options: { n: number } & WeightOptions): SampleGraph {
    const { n } = options;
    checkInt("n", n, 4);
    const out = new EdgeBuffer(2 * n);
    for (let i = 1; i < n; i++) {
        out.push(0, i);
    }
    for (let i = 1; i + 1 < n; i++) {
        out.push(i, i + 1);
    }
    out.push(n - 1, 1);
    return applyWeights(toGraph(n, out, false), options);
}

/**
 * The complete graph K_n: every pair (i, j), i < j, row-major.
 * @param options - the options
 * @param options.n - the node count, >= 0
 * @returns the graph
 */
export function completeGraph(options: { n: number } & WeightOptions): SampleGraph {
    const { n } = options;
    checkInt("n", n, 0);
    const m = (n * (n - 1)) / 2;
    checkEdgeCount(m);
    const out = new EdgeBuffer(m);
    pushClique(out, 0, n);
    return applyWeights(toGraph(n, out, false), options);
}

/**
 * The complete bipartite graph K_{a,b}: left nodes 0 .. a - 1, right nodes a .. a + b - 1, every
 * pair (i, a + j), row-major. Node column `side` (u8): 0 left, 1 right.
 * @param options - the options
 * @param options.a - the left side's size, >= 0
 * @param options.b - the right side's size, >= 0
 * @returns the graph
 */
export function completeBipartiteGraph(options: { a: number; b: number } & WeightOptions): SampleGraph {
    const { a, b } = options;
    checkInt("a", a, 0);
    checkInt("b", b, 0);
    checkInt("a + b", a + b, 0);
    checkEdgeCount(a * b);
    const out = new EdgeBuffer(a * b);
    for (let i = 0; i < a; i++) {
        for (let j = 0; j < b; j++) {
            out.push(i, a + j);
        }
    }
    const side = new Uint8Array(a + b).fill(1, a);
    return applyWeights(toGraph(a + b, out, false, { side }), options);
}

/**
 * The hypercube Q_d: nodes are the d-bit integers, edges join integers one bit apart; for each node
 * i in order and each bit b ascending that is 0 in i, the edge (i, i | 2^b).
 * @param options - the options
 * @param options.dimension - d, in [0, 26]
 * @returns the graph
 */
export function hypercubeGraph(options: { dimension: number } & WeightOptions): SampleGraph {
    const { dimension } = options;
    checkInt("dimension", dimension, 0, 26);
    const n = 2 ** dimension;
    const out = new EdgeBuffer((dimension * n) / 2);
    for (let i = 0; i < n; i++) {
        for (let b = 0; b < dimension; b++) {
            const j = i | (1 << b);
            if (j !== i) {
                out.push(i, j);
            }
        }
    }
    return applyWeights(toGraph(n, out, false), options);
}

/**
 * The ladder L_n: two paths 0 .. n - 1 and n .. 2n - 1, then the rungs (i, n + i).
 * @param options - the options
 * @param options.n - the number of rungs, >= 1
 * @returns the graph
 */
export function ladderGraph(options: { n: number } & WeightOptions): SampleGraph {
    const { n } = options;
    checkInt("n", n, 1);
    checkInt("2n", 2 * n, 2);
    return applyWeights(toGraph(2 * n, ladderEdges(n), false), options);
}

/**
 * The barbell: a clique on 0 .. m1 - 1, the path m1 - 1, m1, .., m1 + m2 (m2 path nodes plus the
 * two joining edges' ends), and a clique on m1 + m2 .. 2 m1 + m2 - 1. Edge order: left clique, path,
 * right clique.
 * @param options - the options
 * @param options.cliqueSize - m1, each bell's size, >= 2
 * @param options.pathLength - m2, the number of nodes on the bar, >= 0
 * @returns the graph
 */
export function barbellGraph(options: { cliqueSize: number; pathLength: number } & WeightOptions): SampleGraph {
    const { cliqueSize: m1, pathLength: m2 } = options;
    checkInt("cliqueSize", m1, 2);
    checkInt("pathLength", m2, 0);
    const n = 2 * m1 + m2;
    checkInt("2 * cliqueSize + pathLength", n, 4);
    checkEdgeCount(m1 * (m1 - 1) + m2 + 1);
    const out = new EdgeBuffer(m1 * (m1 - 1) + m2 + 1);
    pushClique(out, 0, m1);
    for (let i = m1 - 1; i < m1 + m2; i++) {
        out.push(i, i + 1);
    }
    pushClique(out, m1 + m2, m1);
    return applyWeights(toGraph(n, out, false), options);
}

/**
 * The lollipop: a clique on 0 .. m - 1 and a tail path m - 1, m, .., m + n - 1.
 * @param options - the options
 * @param options.cliqueSize - m, >= 2
 * @param options.pathLength - n, the number of tail nodes, >= 0
 * @returns the graph
 */
export function lollipopGraph(options: { cliqueSize: number; pathLength: number } & WeightOptions): SampleGraph {
    const { cliqueSize: m, pathLength } = options;
    checkInt("cliqueSize", m, 2);
    checkInt("pathLength", pathLength, 0);
    checkInt("cliqueSize + pathLength", m + pathLength, 2);
    checkEdgeCount((m * (m - 1)) / 2 + pathLength);
    const out = new EdgeBuffer((m * (m - 1)) / 2 + pathLength);
    pushClique(out, 0, m);
    for (let i = m - 1; i + 1 < m + pathLength; i++) {
        out.push(i, i + 1);
    }
    return applyWeights(toGraph(m + pathLength, out, false), options);
}

/**
 * Community labels for `cliques` consecutive groups of `size` nodes.
 * @param cliques - the number of groups
 * @param size - the group size
 * @returns the u32 labels
 */
function groupLabels(cliques: number, size: number): U32 {
    const community = new Uint32Array(cliques * size);
    for (let g = 0; g < cliques; g++) {
        community.fill(g, g * size, (g + 1) * size);
    }
    return community;
}

/**
 * The caveman graph (Watts 1999): `cliques` disjoint cliques of `size` nodes, clique g on
 * g * size .. (g + 1) * size - 1. Node column `community` (u32): the clique.
 * @param options - the options
 * @param options.cliques - the number of cliques, >= 1
 * @param options.size - the clique size, >= 1
 * @returns the graph
 */
export function cavemanGraph(options: { cliques: number; size: number } & WeightOptions): SampleGraph {
    const { cliques, size } = options;
    checkInt("cliques", cliques, 1);
    checkInt("size", size, 1);
    const n = cliques * size;
    checkInt("cliques * size", n, 1);
    checkEdgeCount((n * (size - 1)) / 2);
    const out = new EdgeBuffer((n * (size - 1)) / 2);
    for (let g = 0; g < cliques; g++) {
        pushClique(out, g * size, size);
    }
    return applyWeights(toGraph(n, out, false, { community: groupLabels(cliques, size) }), options);
}

/**
 * The connected caveman graph (Watts 1999, as networkx builds it): the caveman graph with, in each
 * clique starting at s, the edge (s, s + 1) replaced in place by (s, s - 1 mod n), which joins the
 * cliques into a ring. Node column `community` (u32): the clique.
 * @param options - the options
 * @param options.cliques - the number of cliques, >= 2
 * @param options.size - the clique size, >= 2
 * @returns the graph
 */
export function connectedCavemanGraph(options: { cliques: number; size: number } & WeightOptions): SampleGraph {
    const { cliques, size } = options;
    checkInt("cliques", cliques, 2);
    checkInt("size", size, 2);
    const n = cliques * size;
    checkInt("cliques * size", n, 4);
    checkEdgeCount((n * (size - 1)) / 2);
    const out = new EdgeBuffer((n * (size - 1)) / 2);
    for (let g = 0; g < cliques; g++) {
        const s = g * size;
        for (let i = s; i < s + size; i++) {
            for (let j = i + 1; j < s + size; j++) {
                if (i === s && j === s + 1) {
                    out.push(s, (s - 1 + n) % n);
                } else {
                    out.push(i, j);
                }
            }
        }
    }
    return applyWeights(toGraph(n, out, false, { community: groupLabels(cliques, size) }), options);
}

/**
 * The balanced r-ary tree of height h, numbered breadth first: node i's children are
 * r i + 1 .. r i + r; edges (parent(c), c) for c = 1 .. n - 1.
 * @param options - the options
 * @param options.branching - r, >= 1
 * @param options.height - h, >= 0 (a single root at 0)
 * @returns the graph
 */
export function balancedTreeGraph(options: { branching: number; height: number } & WeightOptions): SampleGraph {
    const { branching: r, height: h } = options;
    checkInt("branching", r, 1);
    checkInt("height", h, 0);
    let n = 0;
    let level = 1;
    for (let d = 0; d <= h; d++) {
        n += level;
        level *= r;
        checkInt("node count", n, 1);
    }
    const out = new EdgeBuffer(n);
    for (let c = 1; c < n; c++) {
        out.push(Math.floor((c - 1) / r), c);
    }
    return applyWeights(toGraph(n, out, false), options);
}

/**
 * The Petersen graph: outer cycle 0 .. 4, spokes (i, i + 5), inner pentagram (5 + i, 5 + (i + 2) mod 5).
 * 3-regular, girth 5, non-planar.
 * @param options - the common weight options
 * @returns the graph
 */
export function petersenGraph(options: WeightOptions = {}): SampleGraph {
    const out = new EdgeBuffer(15);
    for (let i = 0; i < 5; i++) {
        out.push(i, (i + 1) % 5);
    }
    for (let i = 0; i < 5; i++) {
        out.push(i, i + 5);
    }
    for (let i = 0; i < 5; i++) {
        out.push(5 + i, 5 + ((i + 2) % 5));
    }
    return applyWeights(toGraph(10, out, false), options);
}

/**
 * The empty graph: n isolated nodes, no edges.
 * @param options - the options
 * @param options.n - the node count, >= 0
 * @returns the graph
 */
export function emptyGraph(options: { n: number } & WeightOptions): SampleGraph {
    checkInt("n", options.n, 0);
    return applyWeights(toGraph(options.n, new EdgeBuffer(0), false), options);
}

/**
 * The complete multipartite graph K_{s0, s1, ...}: part p holds the next `sizes[p]` node indices,
 * and every pair of nodes in different parts is joined; for each node in index order, the edges to
 * every later node of a later part, ascending. Node column `part` (u32).
 * @param options - the options
 * @param options.sizes - the part sizes, each >= 0
 * @returns the graph
 */
export function completeMultipartiteGraph(options: { sizes: readonly number[] } & WeightOptions): SampleGraph {
    const { sizes } = options;
    const starts = [0];
    for (let p = 0; p < sizes.length; p++) {
        checkInt(`sizes[${p}]`, sizes[p], 0);
        starts.push(starts[p] + sizes[p]);
    }
    const n = starts[sizes.length];
    checkInt("the total size", n, 0);
    let m = (n * (n - 1)) / 2;
    for (const size of sizes) {
        m -= (size * (size - 1)) / 2;
    }
    checkEdgeCount(m);
    const part = new Uint32Array(n);
    for (let p = 0; p < sizes.length; p++) {
        part.fill(p, starts[p], starts[p + 1]);
    }
    const out = new EdgeBuffer(m);
    for (let u = 0; u < n; u++) {
        for (let v = starts[part[u] + 1]; v < n; v++) {
            out.push(u, v);
        }
    }
    return applyWeights(toGraph(n, out, false, { part }), options);
}

/**
 * The circular ladder CL_n (the n-prism): the ladder's rails 0 .. n - 1 and n .. 2n - 1 and rungs
 * (i, n + i), as {@link ladderGraph} lists them, then the closing edges (n - 1, 0) and
 * (2n - 1, n). 3-regular and planar.
 * @param options - the options
 * @param options.n - the number of rungs, >= 3
 * @returns the graph
 */
export function circularLadderGraph(options: { n: number } & WeightOptions): SampleGraph {
    const { n } = options;
    checkInt("n", n, 3);
    checkEdgeCount(3 * n);
    const out = ladderEdges(n);
    out.push(n - 1, 0);
    out.push(2 * n - 1, n);
    return applyWeights(toGraph(2 * n, out, false), options);
}

/**
 * The Moebius ladder M_{2n}: the cycle 0 .. 2n - 1 (edges (i, i + 1), then (2n - 1, 0)) and the n
 * chords (i, i + n). 3-regular and, unlike the circular ladder, not planar for n >= 3.
 * @param options - the options
 * @param options.n - the number of rungs, >= 3
 * @returns the graph
 */
export function mobiusLadderGraph(options: { n: number } & WeightOptions): SampleGraph {
    const { n } = options;
    checkInt("n", n, 3);
    checkEdgeCount(3 * n);
    const out = new EdgeBuffer(3 * n);
    for (let i = 0; i + 1 < 2 * n; i++) {
        out.push(i, i + 1);
    }
    out.push(2 * n - 1, 0);
    for (let i = 0; i < n; i++) {
        out.push(i, i + n);
    }
    return applyWeights(toGraph(2 * n, out, false), options);
}

/**
 * The ladder's edges: two rails 0 .. n - 1 and n .. 2n - 1, then the rungs (i, n + i).
 * @param n - the number of rungs
 * @returns the buffer
 */
function ladderEdges(n: number): EdgeBuffer {
    const out = new EdgeBuffer(3 * n);
    for (let side = 0; side < 2; side++) {
        for (let i = 0; i + 1 < n; i++) {
            out.push(side * n + i, side * n + i + 1);
        }
    }
    for (let i = 0; i < n; i++) {
        out.push(i, n + i);
    }
    return out;
}

/**
 * The ring of cliques, as networkx's `ring_of_cliques`: for each clique i in order, its edges
 * (row-major), then the ring edge (i size + 1, (i + 1) size mod n). The standard example of
 * modularity's resolution limit (Fortunato and Barthelemy, PNAS 104:36-41, 2007,
 * doi:10.1073/pnas.0605965104). Node column `community` (u32): the clique.
 * @param options - the options
 * @param options.cliques - the number of cliques, >= 2
 * @param options.size - the clique size, >= 2
 * @returns the graph
 */
export function ringOfCliquesGraph(options: { cliques: number; size: number } & WeightOptions): SampleGraph {
    const { cliques, size } = options;
    checkInt("cliques", cliques, 2);
    checkInt("size", size, 2);
    const n = cliques * size;
    checkInt("cliques * size", n, 4);
    const m = (n * (size - 1)) / 2 + cliques;
    checkEdgeCount(m);
    const out = new EdgeBuffer(m);
    for (let g = 0; g < cliques; g++) {
        pushClique(out, g * size, size);
        out.push(g * size + 1, ((g + 1) * size) % n);
    }
    return applyWeights(toGraph(n, out, false, { community: groupLabels(cliques, size) }), options);
}
