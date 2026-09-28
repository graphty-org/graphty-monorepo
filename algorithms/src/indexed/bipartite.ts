import { type AdjacencyView, type GraphSnapshot, makeMask, maskSet, type NodeMask } from "@graphty/graph-format";

/** Result of the index-based bipartiteness test. @public */
export interface BipartiteResult {
    /** Whether the nodes split into two sides with no arc inside a side. */
    readonly bipartite: boolean;
    /**
     * The two sides as one mask: a set bit puts the node on the second side, a clear bit on the
     * first. The lowest-index node of every component is on the first side. Null when not bipartite.
     */
    readonly sides: NodeMask | null;
}

const UNSEEN = 2;

/**
 * Two-colour the graph by BFS, one BFS per component in index order. A self-loop makes a graph
 * non-bipartite; parallel arcs change nothing. Arc direction plays no part in bipartiteness, so on
 * a directed snapshot every node is coloured against its in-neighbours (over `s.reverse()`) as well
 * as its out-neighbours. Following out-arcs only -- as the legacy `bipartitePartition` does -- makes
 * the answer depend on node order: with the single arc `a -> b`, a walk that starts at `b` never
 * meets `a`, colours it as a new root and then finds the arc inside one side.
 * @param s - The snapshot to test
 * @returns Whether the graph is bipartite and, when it is, its two sides
 * @public
 */
export function isBipartite(s: GraphSnapshot): BipartiteResult {
    const { nodeCount } = s;
    const views: AdjacencyView[] = s.directed ? [s, s.reverse()] : [s];
    const side = new Uint8Array(nodeCount).fill(UNSEEN);
    const queue = new Uint32Array(nodeCount);
    for (let r = 0; r < nodeCount; r++) {
        if (side[r] !== UNSEEN) {
            continue;
        }
        side[r] = 0;
        let head = 0;
        let tail = 0;
        queue[tail++] = r;
        while (head < tail) {
            const u = queue[head++];
            for (const { rowPtr, colIdx } of views) {
                const end = rowPtr[u + 1];
                for (let a = rowPtr[u]; a < end; a++) {
                    const v = colIdx[a];
                    if (side[v] === UNSEEN) {
                        side[v] = side[u] ^ 1;
                        queue[tail++] = v;
                    } else if (side[v] === side[u]) {
                        return { bipartite: false, sides: null };
                    }
                }
            }
        }
    }
    const sides = makeMask(nodeCount);
    for (let i = 0; i < nodeCount; i++) {
        if (side[i] === 1) {
            maskSet(sides, i, true);
        }
    }
    return { bipartite: true, sides };
}
