import type { GraphSnapshot } from "@graphty/graph-format";

import type { LayoutResult } from "../positions";
import { toLayoutSnapshot } from "../simulation/snapshot";
import { type CommonLayoutOptions, planar, resolve, result } from "./common";
import { shellRows } from "./shell";

/** Options of the index-based radial layout. */
export interface RadialLayoutOptions extends CommonLayoutOptions {
    /** Index of the node at the centre; default the node with the most distinct neighbours (the lowest index on a tie). */
    readonly root?: number | null | undefined;
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
 * @returns node indices per ring, the root's ring first
 */
function radialRings(g: GraphSnapshot, root: number | null): number[][] {
    const n = g.nodeCount;
    if (n === 0) {
        return [];
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
    for (let ring = rings[0]; ring.length > 0; ) {
        const next: number[] = [];
        for (const u of ring) {
            for (const v of neighboursByEdge(g, u)) {
                if (visited[v] === 0) {
                    visited[v] = 1;
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
    return rings;
}

/**
 * Nodes on concentric rings by hop distance from a root: the root on the centre, ring k at radius
 * `k * scale / (ringCount - 1)`, nodes the root cannot reach on one extra outer ring. Edges are taken as undirected. In
 * 3D the rings lie in the plane of the centre's z.
 * @param s - the snapshot; a directed one is read as its undirected derived graph
 * @param options - `scale` is the radius of the outermost ring; `root` the centre node
 * @returns the layout
 */
export function radial(s: GraphSnapshot, options: RadialLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    const rings = radialRings(toLayoutSnapshot(s), options.root ?? null);
    // shells space m rings scale / m apart with the root at 0; stretch so the outermost lands on scale
    const stretch = rings.length > 1 ? rings.length / (rings.length - 1) : 1;
    return result(planar(shellRows(n, rings, scale * stretch, center), dim, center), dim, n);
}
