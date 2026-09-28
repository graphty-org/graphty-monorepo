import { type AdjacencyView, type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

/** Options of {@link isGraphIsomorphic} and {@link findAllIsomorphisms}. @public */
export interface IsomorphismOptions {
    /** Whether node `i1` of `s1` may map to node `i2` of `s2`. */
    readonly nodeMatch?: ((i1: number, i2: number, s1: GraphSnapshot, s2: GraphSnapshot) => boolean) | undefined;
    /**
     * Whether logical edge `e1` of `s1` may map to logical edge `e2` of `s2`. Called once for every
     * pair of adjacent nodes, when the second of them is mapped, and once for a self-loop, when its
     * node is mapped; between parallel edges it sees the lowest edge index. On a directed snapshot
     * it sees every arc, whichever end is mapped last.
     */
    readonly edgeMatch?: ((e1: number, e2: number, s1: GraphSnapshot, s2: GraphSnapshot) => boolean) | undefined;
}

/** Result of {@link isGraphIsomorphic}. @public */
export interface IsomorphismResult {
    /** Whether the two graphs are isomorphic. */
    readonly isomorphic: boolean;
    /** The image in `s2` of every node of `s1`; null when not isomorphic. */
    readonly mapping: U32 | null;
}

/**
 * Count the distinct neighbours of `u` other than itself in one adjacency.
 * @param view - The adjacency to read the row of
 * @param u - The node
 * @returns The simple degree, and whether `u` has a self-loop
 */
function simpleDegree(view: AdjacencyView, u: number): { degree: number; loop: boolean } {
    let degree = 0;
    let loop = false;
    let prev = INVALID_INDEX;
    for (let a = view.rowPtr[u]; a < view.rowPtr[u + 1]; a++) {
        const v = view.colIdx[a];
        if (v === prev) {
            continue;
        }
        prev = v;
        if (v === u) {
            loop = true;
        } else {
            degree++;
        }
    }
    return { degree, loop };
}

/**
 * A per-node signature a node and its image must share: simple out-degree, simple in-degree
 * (directed only) and the self-loop bit, packed in one number.
 * @param s - The snapshot
 * @returns One signature per node
 */
function signatures(s: GraphSnapshot): Float64Array {
    const out = new Float64Array(s.nodeCount);
    const rev = s.directed ? s.reverse() : null;
    for (let u = 0; u < s.nodeCount; u++) {
        const f = simpleDegree(s, u);
        const inDegree = rev === null ? 0 : simpleDegree(rev, u).degree;
        out[u] = (f.degree * 2 ** 26 + inDegree) * 2 + (f.loop ? 1 : 0);
    }
    return out;
}

/**
 * The order the nodes of `s1` are mapped in: BFS over out- and in-arcs, one component after another
 * from the lowest unvisited index. Every node after a component's first is adjacent to an earlier
 * one (its parent), so its candidates are the neighbours of the parent's image.
 * @param views - The forward adjacency, and on a directed snapshot the reverse one
 * @param n - The node count
 * @returns The order, each node's BFS parent (INVALID_INDEX for a component's first node) and
 * which view the parent reached it through
 */
function matchOrder(views: readonly AdjacencyView[], n: number): { order: U32; parent: U32; parentView: Uint8Array } {
    const order = new Uint32Array(n);
    const parent = new Uint32Array(n).fill(INVALID_INDEX);
    const parentView = new Uint8Array(n);
    const seen = new Uint8Array(n);
    let tail = 0;
    for (let r = 0; r < n; r++) {
        if (seen[r] === 1) {
            continue;
        }
        seen[r] = 1;
        let head = tail;
        order[tail++] = r;
        while (head < tail) {
            const u = order[head++];
            for (let k = 0; k < views.length; k++) {
                const { rowPtr, colIdx } = views[k];
                for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                    const v = colIdx[a];
                    if (seen[v] === 0) {
                        seen[v] = 1;
                        parent[v] = u;
                        parentView[v] = k;
                        order[tail++] = v;
                    }
                }
            }
        }
    }
    return { order, parent, parentView };
}

/**
 * VF2-style depth-first search for isomorphisms from `s1` to `s2`.
 * @param s1 - The first graph
 * @param s2 - The second graph
 * @param options - Node and edge match predicates
 * @param found - Called with every isomorphism (a live array: copy it to keep it); returning true
 * stops the search
 */
function search(
    s1: GraphSnapshot,
    s2: GraphSnapshot,
    options: IsomorphismOptions,
    found: (mapping: U32) => boolean,
): void {
    const n = s1.nodeCount;
    if (s1.directed !== s2.directed || n !== s2.nodeCount) {
        return;
    }
    const sig1 = signatures(s1);
    const sig2 = signatures(s2);
    const sorted1 = sig1.slice().sort();
    const sorted2 = sig2.slice().sort();
    if (sorted1.some((x, i) => x !== sorted2[i])) {
        return;
    }
    const views1: AdjacencyView[] = s1.directed ? [s1, s1.reverse()] : [s1];
    const views2: AdjacencyView[] = s2.directed ? [s2, s2.reverse()] : [s2];
    const { order, parent, parentView } = matchOrder(views1, n);
    const core1 = new Uint32Array(n).fill(INVALID_INDEX);
    const core2 = new Uint32Array(n).fill(INVALID_INDEX);
    // Per view, the arc of s2 from the candidate to each neighbour, stamped with the search step.
    const stamp = views2.map(() => new Uint32Array(n));
    const arcTo = views2.map(() => new Uint32Array(n));
    let step = 0;
    const { nodeMatch, edgeMatch } = options;

    const feasible = (u1: number, u2: number): boolean => {
        if (sig1[u1] !== sig2[u2] || (nodeMatch !== undefined && !nodeMatch(u1, u2, s1, s2))) {
            return false;
        }
        // The signatures agree, so u1 has a self-loop exactly when u2 has one: offer the two loops.
        if (edgeMatch !== undefined && sig1[u1] % 2 === 1) {
            const loop1 = s1.arcToEdge[s1.findArc(u1, u1)];
            const loop2 = s2.arcToEdge[s2.findArc(u2, u2)];
            if (!edgeMatch(loop1, loop2, s1, s2)) {
                return false;
            }
        }
        step++;
        for (let k = 0; k < views1.length; k++) {
            const g1 = views1[k];
            const g2 = views2[k];
            let mapped2 = 0;
            let prev = INVALID_INDEX;
            for (let a = g2.rowPtr[u2]; a < g2.rowPtr[u2 + 1]; a++) {
                const v = g2.colIdx[a];
                if (v === prev || v === u2) {
                    continue;
                }
                prev = v;
                stamp[k][v] = step;
                arcTo[k][v] = a;
                if (core2[v] !== INVALID_INDEX) {
                    mapped2++;
                }
            }
            let mapped1 = 0;
            prev = INVALID_INDEX;
            for (let a = g1.rowPtr[u1]; a < g1.rowPtr[u1 + 1]; a++) {
                const v = g1.colIdx[a];
                if (v === prev || v === u1) {
                    continue;
                }
                prev = v;
                const image = core1[v];
                if (image === INVALID_INDEX) {
                    continue;
                }
                if (stamp[k][image] !== step) {
                    return false;
                }
                mapped1++;
                // An undirected edge is offered once: through the out-rows. A directed arc is
                // offered through the view it is an out-arc or an in-arc of the new node in.
                if (edgeMatch !== undefined && !edgeMatch(g1.arcToEdge[a], g2.arcToEdge[arcTo[k][image]], s1, s2)) {
                    return false;
                }
            }
            if (mapped1 !== mapped2) {
                return false;
            }
        }
        return true;
    };

    // Iterative DFS over depth; cursor[d] walks the candidate list of order[d].
    const cursor = new Uint32Array(n + 1);
    let depth = 0;
    let stop = false;
    const candidatesOf = (d: number): { view: AdjacencyView | null; from: number; to: number } => {
        const p = parent[order[d]];
        if (p === INVALID_INDEX) {
            return { view: null, from: 0, to: n };
        }
        const view = views2[parentView[order[d]]];
        const image = core1[p];
        return { view, from: view.rowPtr[image], to: view.rowPtr[image + 1] };
    };
    if (n === 0) {
        found(core1);
        return;
    }
    let range = candidatesOf(0);
    cursor[0] = range.from;
    while (!stop) {
        const u1 = order[depth];
        let advanced = false;
        while (cursor[depth] < range.to) {
            const c = cursor[depth]++;
            const u2 = range.view === null ? c : range.view.colIdx[c];
            // Parallel arcs repeat a candidate; take it once.
            if (range.view !== null && c > range.from && range.view.colIdx[c - 1] === u2) {
                continue;
            }
            if (core2[u2] !== INVALID_INDEX || !feasible(u1, u2)) {
                continue;
            }
            core1[u1] = u2;
            core2[u2] = u1;
            if (depth === n - 1) {
                stop = found(core1);
                core1[u1] = INVALID_INDEX;
                core2[u2] = INVALID_INDEX;
                if (stop) {
                    break;
                }
                continue;
            }
            depth++;
            range = candidatesOf(depth);
            cursor[depth] = range.from;
            advanced = true;
            break;
        }
        if (stop || advanced) {
            continue;
        }
        // Exhausted: undo the mapping of the node below and resume its candidates.
        if (depth === 0) {
            return;
        }
        depth--;
        const back = order[depth];
        core2[core1[back]] = INVALID_INDEX;
        core1[back] = INVALID_INDEX;
        range = candidatesOf(depth);
    }
}

/**
 * Whether two snapshots are isomorphic, by a VF2-style search. Neighbourhoods are simple-graph:
 * parallel arcs count once and a self-loop maps only to a self-loop. On a directed snapshot both
 * arc directions are preserved.
 * @param s1 - The first graph
 * @param s2 - The second graph
 * @param options - Node and edge match predicates
 * @returns Whether an isomorphism exists and, when it does, the first one found
 * @public
 */
export function isGraphIsomorphic(
    s1: GraphSnapshot,
    s2: GraphSnapshot,
    options: IsomorphismOptions = {},
): IsomorphismResult {
    let mapping: U32 | null = null;
    search(s1, s2, options, (m) => {
        mapping = m.slice();
        return true;
    });
    return { isomorphic: mapping !== null, mapping };
}

/**
 * Every isomorphism from `s1` to `s2`, with the neighbourhood rules of {@link isGraphIsomorphic}.
 * Two empty graphs have one, the empty mapping.
 * @param s1 - The first graph
 * @param s2 - The second graph
 * @param options - Node and edge match predicates
 * @returns One array per isomorphism: the image in `s2` of every node of `s1`
 * @public
 */
export function findAllIsomorphisms(s1: GraphSnapshot, s2: GraphSnapshot, options: IsomorphismOptions = {}): U32[] {
    const all: U32[] = [];
    search(s1, s2, options, (m) => {
        all.push(m.slice());
        return false;
    });
    return all;
}
