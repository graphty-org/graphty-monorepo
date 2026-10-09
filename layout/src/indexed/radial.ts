import { type GraphSnapshot, type NodeRef, resolveNode } from "@graphty/graph-format";

import type { LayoutResult } from "../positions.js";
import { toLayoutSnapshot } from "../simulation/snapshot.js";
import { type CommonLayoutOptions, planar, resolve, result } from "./common.js";

/** Options of the index-based radial layout. */
export interface RadialLayoutOptions extends CommonLayoutOptions {
    /**
     * The node at the centre: its index, or `{ id }`; default the node with the most distinct neighbours (the lowest
     * index on a tie).
     */
    readonly root?: NodeRef | null | undefined;
}

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
        throw new Error(`root node ${String(root)} is not in the graph`);
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
 * Nodes on concentric rings by hop distance from a root: the root on the centre, ring k at radius
 * `k * scale / (ringCount - 1)`, nodes the root cannot reach evenly spaced on one extra outer ring. Each reached node
 * sits at the middle of its share of its breadth-first parent's sector, shared out in edge order in proportion to the
 * leaves under each child; the root's sector is the whole circle, and a deeper node's is its share narrowed to the
 * wedge its edges can reach without crossing a neighbouring branch. So the edges of the breadth-first tree never
 * cross. Edges are taken as undirected. In 3D the rings lie in the plane of the centre's z.
 * @param s - the snapshot; a directed one is read as its undirected derived graph
 * @param options - `scale` is the radius of the outermost ring; `root` the centre node
 * @returns the layout
 */
export function radial(s: GraphSnapshot, options: RadialLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    const root = options.root ?? null;
    const { rings, parent } = radialRings(toLayoutSnapshot(s), root === null ? null : resolveNode(s, root));
    const rows = new Float64Array(2 * n);
    if (n === 0) {
        return result(planar(rows, dim, center), dim, n);
    }
    const step = rings.length > 1 ? scale / (rings.length - 1) : 0;
    // the unreachable nodes, if any, are the last ring: the only one past the root's whose nodes have no parent
    const last = rings[rings.length - 1];
    const reachedRings = rings.length > 1 && parent[last[0]] === -1 ? rings.length - 1 : rings.length;
    // leaves under each reached node, deepest ring first
    const leaves = new Float64Array(n);
    for (let k = reachedRings - 1; k >= 0; k--) {
        for (const u of rings[k]) {
            leaves[u] ||= 1;
            if (k > 0) {
                leaves[parent[u]] += leaves[u];
            }
        }
    }
    // the sector each node hands out to its children, in ring (edge) order and in proportion to their leaves. Past the
    // root it is the node's own share of its parent's sector, narrowed to the wedge between the tangents at the node's
    // ring that meet the next ring, so no edge to a child can cut across a neighbouring branch (Eades, 1992)
    const start = new Float64Array(n);
    const width = new Float64Array(n);
    const used = new Float64Array(n);
    width[rings[0][0]] = 2 * Math.PI;
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
    return result(planar(rows, dim, center), dim, n);
}
