import { type GraphSnapshot, type U32 } from "@graphty/graph-format";

import { IntUnionFind } from "./structures/union-find.js";

/** A partition of the node set (graph-format design 14.2's result table, line 3738). @public */
export interface LabelResult {
    /** Dense label per node index, in first-seen order. */
    readonly labels: U32;
    /** Number of distinct labels. */
    readonly count: number;
    /**
     * Node indices grouped by label, computed once and cached.
     * @returns One array per label
     */
    groups(): U32[];
}

function withGroups(labels: U32, count: number): LabelResult {
    let cached: U32[] | null = null;
    return {
        labels,
        count,
        groups(): U32[] {
            if (cached === null) {
                const sizes = new Uint32Array(count);
                for (let i = 0; i < labels.length; i++) {
                    sizes[labels[i]]++;
                }
                const out: U32[] = [];
                for (let c = 0; c < count; c++) {
                    out.push(new Uint32Array(sizes[c]));
                }
                const fill = new Uint32Array(count);
                for (let i = 0; i < labels.length; i++) {
                    const c = labels[i];
                    out[c][fill[c]++] = i;
                }
                cached = out;
            }
            return cached;
        },
    };
}

function unionEdges(s: GraphSnapshot): LabelResult {
    const uf = new IntUnionFind(s.nodeCount);
    const el = s.edgeList();
    for (let e = 0; e < s.edgeCount; e++) {
        uf.union(el.src[e], el.dst[e]);
    }
    const { labels, count } = uf.toLabels();
    return withGroups(labels, count);
}

/**
 * Connected components of an UNDIRECTED snapshot.
 * @param s - An undirected snapshot
 * @returns The partition
 * @public
 */
export function connectedComponents(s: GraphSnapshot): LabelResult {
    if (s.directed) {
        throw new Error(
            "Connected components requires an undirected graph. Use weaklyConnectedComponents, or pass s.toUndirected().snapshot.",
        );
    }
    return unionEdges(s);
}

/**
 * Weakly connected components: the same union-find pass with the direction check dropped.
 * @param s - Any snapshot
 * @returns The partition
 * @public
 */
export function weaklyConnectedComponents(s: GraphSnapshot): LabelResult {
    return unionEdges(s);
}
