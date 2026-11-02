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
            tail = enqueueNeighbours(views, order[head++], { order, parent, parentView }, seen, tail);
        }
    }
    return { order, parent, parentView };
}

/**
 * Append every unseen out- and in-neighbour of `u` to the BFS order, recording `u` as its parent.
 * @param views - The forward adjacency, and on a directed snapshot the reverse one
 * @param u - The node being expanded
 * @param bfs - The order, parents and parent views being filled
 * @param bfs.order - The BFS order
 * @param bfs.parent - Each node's BFS parent
 * @param bfs.parentView - Which view the parent reached each node through
 * @param seen - 1 for every node already in the order
 * @param tail - The order's length before the expansion
 * @returns The order's length after it
 */
function enqueueNeighbours(
    views: readonly AdjacencyView[],
    u: number,
    bfs: { order: U32; parent: U32; parentView: Uint8Array },
    seen: Uint8Array,
    tail: number,
): number {
    const { order, parent, parentView } = bfs;
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
    return tail;
}

/** What a VF2 search over one pair of graphs reads and writes while it runs. */
interface Vf2State {
    readonly s1: GraphSnapshot;
    readonly s2: GraphSnapshot;
    readonly sig1: Float64Array;
    readonly sig2: Float64Array;
    readonly views1: AdjacencyView[];
    readonly views2: AdjacencyView[];
    /** Image in s2 of every node of s1, INVALID_INDEX while unmapped. */
    readonly core1: U32;
    /** Preimage in s1 of every node of s2, INVALID_INDEX while unmapped. */
    readonly core2: U32;
    /** Per view, the search step that last stamped each node of s2 as a neighbour of the candidate. */
    readonly stamp: Uint32Array[];
    /** Per view, the arc of s2 from the candidate to each stamped neighbour. */
    readonly arcTo: Uint32Array[];
    step: number;
    readonly nodeMatch: IsomorphismOptions["nodeMatch"];
    readonly edgeMatch: IsomorphismOptions["edgeMatch"];
}

/** The candidates for one depth: a row of a view of s2, or every node when `view` is null. */
interface CandidateRange {
    readonly view: AdjacencyView | null;
    readonly from: number;
    readonly to: number;
}

/** The DFS position: the match order, a cursor per depth and the current depth's candidates. */
interface Vf2Walk {
    readonly order: U32;
    readonly parent: U32;
    readonly parentView: Uint8Array;
    readonly cursor: Uint32Array;
    depth: number;
    range: CandidateRange;
}

const EXHAUSTED = 0;
const ADVANCED = 1;
const STOPPED = 2;

/**
 * Build the search state, or return null when the graphs cannot be isomorphic: different
 * direction, size or multiset of node signatures.
 * @param s1 - The first graph
 * @param s2 - The second graph
 * @param options - Node and edge match predicates
 * @returns The state, or null
 */
function vf2State(s1: GraphSnapshot, s2: GraphSnapshot, options: IsomorphismOptions): Vf2State | null {
    const n = s1.nodeCount;
    if (s1.directed !== s2.directed || n !== s2.nodeCount) {
        return null;
    }
    const sig1 = signatures(s1);
    const sig2 = signatures(s2);
    const sorted1 = sig1.slice().sort();
    const sorted2 = sig2.slice().sort();
    if (sorted1.some((x, i) => x !== sorted2[i])) {
        return null;
    }
    const views2: AdjacencyView[] = s2.directed ? [s2, s2.reverse()] : [s2];
    return {
        s1,
        s2,
        sig1,
        sig2,
        views1: s1.directed ? [s1, s1.reverse()] : [s1],
        views2,
        core1: new Uint32Array(n).fill(INVALID_INDEX),
        core2: new Uint32Array(n).fill(INVALID_INDEX),
        stamp: views2.map(() => new Uint32Array(n)),
        arcTo: views2.map(() => new Uint32Array(n)),
        step: 0,
        nodeMatch: options.nodeMatch,
        edgeMatch: options.edgeMatch,
    };
}

/**
 * Whether u1 and u2 agree on their signature, the node predicate and the self-loop edge predicate.
 * @param st - The search state
 * @param u1 - Node of s1
 * @param u2 - Candidate image in s2
 * @returns Whether the pair passes
 */
function nodesCompatible(st: Vf2State, u1: number, u2: number): boolean {
    const { s1, s2, sig1, nodeMatch, edgeMatch } = st;
    if (sig1[u1] !== st.sig2[u2] || (nodeMatch !== undefined && !nodeMatch(u1, u2, s1, s2))) {
        return false;
    }
    // The signatures agree, so u1 has a self-loop exactly when u2 has one: offer the two loops.
    if (edgeMatch === undefined || sig1[u1] % 2 !== 1) {
        return true;
    }
    const loop1 = s1.arcToEdge[s1.findArc(u1, u1)];
    const loop2 = s2.arcToEdge[s2.findArc(u2, u2)];
    return edgeMatch(loop1, loop2, s1, s2);
}

/**
 * Stamp every simple neighbour of u2 in view k with the current step and its arc.
 * @param st - The search state
 * @param k - The view index
 * @param u2 - The candidate image in s2
 * @returns How many of those neighbours are already mapped
 */
function stampNeighbours(st: Vf2State, k: number, u2: number): number {
    const g2 = st.views2[k];
    const stamp = st.stamp[k];
    const arcTo = st.arcTo[k];
    let mapped2 = 0;
    let prev = INVALID_INDEX;
    for (let a = g2.rowPtr[u2]; a < g2.rowPtr[u2 + 1]; a++) {
        const v = g2.colIdx[a];
        if (v === prev || v === u2) {
            continue;
        }
        prev = v;
        stamp[v] = st.step;
        arcTo[v] = a;
        if (st.core2[v] !== INVALID_INDEX) {
            mapped2++;
        }
    }
    return mapped2;
}

/**
 * Check every mapped simple neighbour of u1 in view k: its image must be a stamped neighbour of
 * the candidate and the edge between them must pass the edge predicate.
 * @param st - The search state
 * @param k - The view index
 * @param u1 - Node of s1
 * @returns How many neighbours are mapped, or -1 when one fails
 */
function countMappedNeighbours(st: Vf2State, k: number, u1: number): number {
    const { s1, s2, edgeMatch } = st;
    const g1 = st.views1[k];
    const g2 = st.views2[k];
    const stamp = st.stamp[k];
    let mapped1 = 0;
    let prev = INVALID_INDEX;
    for (let a = g1.rowPtr[u1]; a < g1.rowPtr[u1 + 1]; a++) {
        const v = g1.colIdx[a];
        if (v === prev || v === u1) {
            continue;
        }
        prev = v;
        const image = st.core1[v];
        if (image === INVALID_INDEX) {
            continue;
        }
        if (stamp[image] !== st.step) {
            return -1;
        }
        mapped1++;
        // An undirected edge is offered once: through the out-rows. A directed arc is
        // offered through the view it is an out-arc or an in-arc of the new node in.
        if (edgeMatch !== undefined && !edgeMatch(g1.arcToEdge[a], g2.arcToEdge[st.arcTo[k][image]], s1, s2)) {
            return -1;
        }
    }
    return mapped1;
}

/**
 * Whether mapping u1 to u2 keeps the partial mapping an isomorphism of the mapped subgraphs.
 * @param st - The search state
 * @param u1 - Node of s1
 * @param u2 - Candidate image in s2
 * @returns Whether the pair is feasible
 */
function feasible(st: Vf2State, u1: number, u2: number): boolean {
    if (!nodesCompatible(st, u1, u2)) {
        return false;
    }
    st.step++;
    for (let k = 0; k < st.views1.length; k++) {
        const mapped2 = stampNeighbours(st, k, u2);
        if (countMappedNeighbours(st, k, u1) !== mapped2) {
            return false;
        }
    }
    return true;
}

/**
 * The candidates for depth d: every node for a component's first node, else the neighbours of
 * the image of its BFS parent, in the view the parent reached it through.
 * @param st - The search state
 * @param w - The walk
 * @param d - The depth
 * @returns The candidate range
 */
function candidatesOf(st: Vf2State, w: Vf2Walk, d: number): CandidateRange {
    const p = w.parent[w.order[d]];
    if (p === INVALID_INDEX) {
        return { view: null, from: 0, to: st.core1.length };
    }
    const view = st.views2[w.parentView[w.order[d]]];
    const image = st.core1[p];
    return { view, from: view.rowPtr[image], to: view.rowPtr[image + 1] };
}

/**
 * Try the remaining candidates of the current depth: report a full mapping, or descend into the
 * first feasible partial one.
 * @param st - The search state
 * @param w - The walk
 * @param found - The isomorphism callback; returning true stops the search
 * @returns STOPPED, ADVANCED (one depth deeper) or EXHAUSTED
 */
function tryCandidates(st: Vf2State, w: Vf2Walk, found: (mapping: U32) => boolean): number {
    const { core1, core2 } = st;
    const u1 = w.order[w.depth];
    const { range } = w;
    while (w.cursor[w.depth] < range.to) {
        const c = w.cursor[w.depth]++;
        const u2 = range.view === null ? c : range.view.colIdx[c];
        // Parallel arcs repeat a candidate; take it once.
        if (range.view !== null && c > range.from && range.view.colIdx[c - 1] === u2) {
            continue;
        }
        if (core2[u2] !== INVALID_INDEX || !feasible(st, u1, u2)) {
            continue;
        }
        core1[u1] = u2;
        core2[u2] = u1;
        if (w.depth === core1.length - 1) {
            const stop = found(core1);
            core1[u1] = INVALID_INDEX;
            core2[u2] = INVALID_INDEX;
            if (stop) {
                return STOPPED;
            }
            continue;
        }
        w.depth++;
        w.range = candidatesOf(st, w, w.depth);
        w.cursor[w.depth] = w.range.from;
        return ADVANCED;
    }
    return EXHAUSTED;
}

/**
 * Undo the mapping of the node one depth down and resume its candidates.
 * @param st - The search state
 * @param w - The walk
 * @returns False at depth 0, where there is nothing to go back to
 */
function backtrack(st: Vf2State, w: Vf2Walk): boolean {
    if (w.depth === 0) {
        return false;
    }
    w.depth--;
    const back = w.order[w.depth];
    st.core2[st.core1[back]] = INVALID_INDEX;
    st.core1[back] = INVALID_INDEX;
    w.range = candidatesOf(st, w, w.depth);
    return true;
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
    const st = vf2State(s1, s2, options);
    if (st === null) {
        return;
    }
    const n = s1.nodeCount;
    const { order, parent, parentView } = matchOrder(st.views1, n);
    if (n === 0) {
        found(st.core1);
        return;
    }
    // Iterative DFS over depth; cursor[d] walks the candidate list of order[d].
    const w: Vf2Walk = {
        order,
        parent,
        parentView,
        cursor: new Uint32Array(n + 1),
        depth: 0,
        range: { view: null, from: 0, to: 0 },
    };
    w.range = candidatesOf(st, w, 0);
    w.cursor[0] = w.range.from;
    for (;;) {
        const r = tryCandidates(st, w, found);
        if (r === STOPPED || (r === EXHAUSTED && !backtrack(st, w))) {
            return;
        }
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
