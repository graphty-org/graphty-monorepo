import { type F64, type GraphSnapshot, type NodeRef, resolveNode } from "@graphty/graph-format";

import type { LayoutResult } from "../positions.js";
import { toLayoutSnapshot } from "../simulation/snapshot.js";
import { type CommonLayoutOptions, planar, refusal, resolve, result } from "./common.js";
import { type ShellRotate, shellRows } from "./shell.js";

/** Options of the index-based radial layout. */
export interface RadialLayoutOptions extends CommonLayoutOptions {
    /**
     * The node at the centre: its index, or `{ id }`; default the node with the most distinct neighbours (the lowest
     * index on a tie).
     */
    readonly root?: NodeRef | null | undefined;
    /**
     * How far each ring is turned past the one inside it, in radians, as NetworkX's `shell_layout` `rotate` over the
     * breadth-first rings: ring k (the root's is 0) starts at angle `(k + 1) * rotate`. Default 0, every ring starting
     * on the positive x axis. `"networkx"` is NetworkX 2.8.8's default, `Math.PI` over the number of rings (the root's
     * and the outer ring of unreachable nodes included), so the rings no longer all start on the positive x axis.
     * Only for `arrangement: "rings"`.
     */
    readonly rotate?: ShellRotate | undefined;
    /**
     * How each ring's nodes are spread around it:
     *
     * - `"rings"` (default): evenly around the whole ring, in breadth-first order, as NetworkX's `shell_layout` does.
     * - `"sectors"`: each node in its breadth-first parent's sector (Eades, 1992), so the edges of the breadth-first
     *   tree never cross. The price is crowding: a ring can fill only a few percent of its circle, and on a large tree
     *   hundreds of nodes end up almost on top of one another. Edges outside the tree can still cross.
     */
    readonly arrangement?: RadialArrangement | undefined;
}

/** How {@link radial} spreads each ring's nodes: evenly around the ring, or within the parent's sector. */
export type RadialArrangement = "rings" | "sectors";

/**
 * The distinct neighbours of `u` in the order of the first edge joining them (edge-index order), which is the order
 * the legacy radial layout visited them in.
 * @param g - an undirected snapshot
 * @param u - the node
 * @returns neighbour indices
 */
function neighboursByEdge(g: GraphSnapshot, u: number): number[] {
    // rows are sorted by target with ties in ascending edge order, so the first arc to each target is its first edge
    const firstEdge = new Map<number, number>();
    for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
        if (!firstEdge.has(g.colIdx[a])) {
            firstEdge.set(g.colIdx[a], g.arcToEdge[a]);
        }
    }
    return [...firstEdge.keys()].sort((v, w) => (firstEdge.get(v) ?? 0) - (firstEdge.get(w) ?? 0));
}

/**
 * The breadth-first rings around a root: ring k holds the nodes k hops away (edges taken as undirected, neighbours
 * visited in edge order), and every node the root cannot reach goes on one extra ring after the last.
 * @param g - an undirected snapshot
 * @param root - the root index, or null for the node with the most distinct neighbours
 * @returns node indices per ring, the root's ring first, and each reached node's breadth-first parent (-1 for the root
 * and for nodes the root cannot reach)
 */
function radialRings(g: GraphSnapshot, root: number | null): { rings: number[][]; parent: Int32Array } {
    const n = g.nodeCount;
    const parent = new Int32Array(n).fill(-1);
    if (n === 0) {
        return { rings: [], parent };
    }
    if (root === null) {
        let best = 0;
        let bestDegree = -1;
        for (let u = 0; u < n; u++) {
            let degree = 0;
            for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
                if (a === g.rowPtr[u] || g.colIdx[a] !== g.colIdx[a - 1]) {
                    degree++;
                }
            }
            if (degree > bestDegree) {
                best = u;
                bestDegree = degree;
            }
        }
        root = best;
    } else if (!Number.isInteger(root) || root < 0 || root >= n) {
        throw refusal(new Error(`root node ${String(root)} is not in the graph`), "E_BAD_NODE", {
            option: "root",
            index: root,
        });
    }
    const visited = new Uint8Array(n);
    visited[root] = 1;
    const rings: number[][] = [[root]];
    for (let ring = rings[0]; ring.length > 0;) {
        const next: number[] = [];
        for (const u of ring) {
            for (const v of neighboursByEdge(g, u)) {
                if (visited[v] === 0) {
                    visited[v] = 1;
                    parent[v] = u;
                    next.push(v);
                }
            }
        }
        if (next.length > 0) {
            rings.push(next);
        }
        ring = next;
    }
    const unreachable: number[] = [];
    for (let u = 0; u < n; u++) {
        if (visited[u] === 0) {
            unreachable.push(u);
        }
    }
    if (unreachable.length > 0) {
        rings.push(unreachable);
    }
    return { rings, parent };
}

/**
 * The leaves of the breadth-first tree under each reached node (1 for a leaf), summed deepest ring first.
 * @param n - node count
 * @param rings - node indices per ring, the root's first
 * @param parent - each node's breadth-first parent
 * @param reachedRings - how many rings, from the root's, the root reaches
 * @returns the leaf count per node, 0 for a node the root cannot reach
 */
function leavesUnder(n: number, rings: readonly number[][], parent: Int32Array, reachedRings: number): F64 {
    const leaves = new Float64Array(n);
    for (let k = reachedRings - 1; k >= 0; k--) {
        for (const u of rings[k]) {
            leaves[u] ||= 1;
            if (k > 0) {
                leaves[parent[u]] += leaves[u];
            }
        }
    }
    return leaves;
}

/**
 * Each node within its breadth-first parent's sector. The root's sector is the whole circle; a node's share of its
 * parent's sector is in proportion to the leaves under it, handed out in edge order, and the node sits at the middle of
 * its share. A deeper node's share is narrowed to the wedge its edges can reach without crossing a neighbouring branch,
 * so the edges of the breadth-first tree never cross. Nodes the root cannot reach go evenly around the outer ring.
 * @param n - node count
 * @param rings - node indices per ring, the root's first, the unreachable nodes (if any) last
 * @param parent - each node's breadth-first parent, -1 for the root and the unreachable nodes
 * @param scale - the radius of the outermost ring
 * @param center - at least 2 components
 * @returns `2 * n` values
 */
function sectorRows(
    n: number,
    rings: readonly number[][],
    parent: Int32Array,
    scale: number,
    center: readonly number[],
): F64 {
    const rows = new Float64Array(2 * n);
    if (n === 0) {
        return rows;
    }
    const step = rings.length > 1 ? scale / (rings.length - 1) : 0;
    // the unreachable nodes, if any, are the last ring: the only one past the root's whose nodes have no parent
    const last = rings.at(-1) ?? [];
    const reachedRings = rings.length > 1 && parent[last[0]] === -1 ? rings.length - 1 : rings.length;
    const leaves = leavesUnder(n, rings, parent, reachedRings);
    // the sector each node hands out to its children, in ring (edge) order and in proportion to their leaves. Past the
    // root it is the node's own share of its parent's sector, narrowed to the wedge between the tangents at the node's
    // ring that meet the next ring, so no edge to a child can cut across a neighbouring branch (Eades, 1992)
    const start = new Float64Array(n);
    const width = new Float64Array(n);
    const used = new Float64Array(n);
    width[rings[0][0]] = 2 * Math.PI;
    // a lone child of the root would sit at the middle of the whole circle, pi, with every only child below it on the
    // negative x axis; any angle is the middle of a full circle, so turn it to pi / 4, clear of both axes
    if (reachedRings > 1 && rings[1].length === 1) {
        start[rings[0][0]] = Math.PI / 4 - Math.PI;
    }
    const place = (u: number, radius: number, theta: number): void => {
        rows[2 * u] = Math.cos(theta) * radius + center[0];
        rows[2 * u + 1] = Math.sin(theta) * radius + center[1];
    };
    place(rings[0][0], 0, 0);
    for (let k = 1; k < reachedRings; k++) {
        const tangentWedge = 2 * Math.acos(k / (k + 1));
        for (const u of rings[k]) {
            const p = parent[u];
            const share = (width[p] * leaves[u]) / leaves[p];
            const theta = start[p] + used[p] + share / 2;
            used[p] += share;
            place(u, k * step, theta);
            width[u] = Math.min(share, tangentWedge);
            start[u] = theta - width[u] / 2;
        }
    }
    if (reachedRings < rings.length) {
        last.forEach((u, j) => {
            place(u, scale, (2 * Math.PI * j) / last.length);
        });
    }
    return rows;
}

/**
 * Nodes on concentric rings by hop distance from a root: the root on the centre, ring k at radius
 * `k * scale / (ringCount - 1)`, nodes the root cannot reach on one extra outer ring. By default each ring's nodes are
 * evenly spaced in breadth-first order, which is NetworkX's `shell_layout` over the breadth-first rings, ring k turned
 * by `(k + 1) * rotate`; `arrangement: "sectors"` keeps each node in its parent's sector instead. Edges are taken as
 * undirected. In 3D the rings lie in the plane of the centre's z.
 * @param s - the snapshot; a directed one is read as its undirected derived graph
 * @param options - `scale` is the radius of the outermost ring; `root` the centre node; `rotate` the turn of each ring
 * past the one inside it; `arrangement` how a ring's nodes are spread
 * @returns the layout
 * @throws an Error with `code` `E_BAD_NODE` and `params` `{ option: "root", index }` when `root` is an index that is
 * not a node (a `{ id }` the graph does not hold is graph-format's `E_UNKNOWN_NODE`), and `E_BAD_OPTION` with
 * `{ option, value }` for an unknown `arrangement` or a `rotate` with `arrangement: "sectors"`
 */
export function radial(s: GraphSnapshot, options: RadialLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    const root = options.root ?? null;
    const { arrangement = "rings", rotate } = options;
    if (arrangement !== "rings" && arrangement !== "sectors") {
        throw refusal(
            new Error(`arrangement must be "rings" or "sectors", not ${String(arrangement)}`),
            "E_BAD_OPTION",
            {
                option: "arrangement",
                value: arrangement,
            },
        );
    }
    if (arrangement === "sectors" && rotate !== undefined && rotate !== 0) {
        throw refusal(
            new Error('rotate turns each ring separately, which only arrangement: "rings" allows'),
            "E_BAD_OPTION",
            {
                option: "rotate",
                value: rotate,
            },
        );
    }
    const { rings, parent } = radialRings(toLayoutSnapshot(s), root === null ? null : resolveNode(s, root));
    if (arrangement === "sectors") {
        return result(planar(sectorRows(n, rings, parent, scale, center), dim, center), dim, n);
    }
    // shells space m rings scale / m apart with the root at 0; stretch so the outermost lands on scale
    const stretch = rings.length > 1 ? rings.length / (rings.length - 1) : 1;
    return result(planar(shellRows(n, rings, scale * stretch, center, rotate), dim, center), dim, n);
}
