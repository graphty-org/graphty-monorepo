/**
 * @file The one place an edge id is written and read.
 *
 * An edge is identified by the element-assigned counter the store stamps into its
 * `graphty.edgeId` column, printed as a string. Everything that turns that counter into an id, or
 * an id back into that counter, calls one of the two functions here.
 *
 * Nothing else stringifies or parses an edge id. Before this module the pair-string convention
 * was implemented independently in four places, two of which carried a doc comment claiming to be
 * the only one, and the two sides of a style join could -- and did -- disagree in silence.
 */

import { type DuplicatePolicy, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import { compareIds } from "../catalog/sets/canonical";
import { hashEdgeEnds, hashEdgeMember, hashNodeId, type LanePair } from "../catalog/sets/hash";
import type { EdgeId, EdgeMember, NodeId } from "../catalog/types";

/**
 * The id of the edge carrying one counter value.
 *
 * The id is a string and never a number, because it crosses into a DOM `CustomEvent` detail, a
 * persisted scope document, a JMESPath selector and Map keys shared with node ids. A `string |
 * number` id would make every one of those surfaces decide about coercion, and `"17" !== 17` as a
 * Map key fails as an empty selection with no error.
 * @param counter - the value of the edge's `graphty.edgeId` column
 * @returns the edge id
 */
export function edgeIdOf(counter: number): EdgeId {
    return String(counter);
}

/**
 * The counter an edge id names.
 * @param id - an edge id, as {@link edgeIdOf} wrote it
 * @returns the counter, or `INVALID_INDEX` when the id is not one this element ever assigned
 */
export function edgeCounterOf(id: EdgeId): number {
    // Number() would accept "", " 3 ", "0x10" and "1e2", all of which would resolve to a real
    // edge under an id no element ever handed out. An id is the decimal printing of a
    // non-negative integer and nothing else.
    if (!/^\d+$/.test(id)) {
        return INVALID_INDEX;
    }

    const counter = Number(id);
    return Number.isSafeInteger(counter) ? counter : INVALID_INDEX;
}

/**
 * The row of a session edge in a snapshot: its `Edge.index`.
 * @param graph - the snapshot
 * @param id - the session edge id
 * @returns the row, or `INVALID_INDEX`
 */
export function edgeRowOf(graph: GraphSnapshot, id: EdgeId): number {
    const counter = edgeCounterOf(id);

    return counter === INVALID_INDEX ? INVALID_INDEX : graph.edgeIndexOf(counter);
}

// ---------------------------------------------------------------------------------------------
// Stable edge identity (design/sets/sets-design.md sections 4.2, 12.2 and 12.3).
//
// The counter above is a SESSION identity: it restarts in every session and never reaches a file.
// What a stored set names an edge by is its STABLE identity -- the file's edge id, an id minted
// for an edge added in the session, or its ordinal among the edges of its pair in the load that
// ingested it -- and the hashes the digest sums. Everything below is pure and Node-safe; the store
// runs the completion pass at freeze, so every store gets the columns whoever fills it.
// ---------------------------------------------------------------------------------------------

/**
 * The counter behind `GraphStore.nextEdgeId()`.
 *
 * An object rather than a number held by the store, so that its owner (`DataManager`, or a
 * headless `GraphSession`) can hand the same one to every store it builds: a Clear or a replacing
 * import then starts a new store without rewinding the counter, and an edge id is never issued
 * twice in one session.
 */
export interface EdgeCounter {
    /** The value the next edge takes. */
    next: number;
}

/**
 * A counter starting at 0.
 * @returns the counter
 */
export function createEdgeCounter(): EdgeCounter {
    return { next: 0 };
}

/**
 * Continue a counter one past a value already issued, as a graph restored with its edge-id column
 * must, so a restored id is never issued again. Never moves the counter backwards.
 * @param counter - the counter
 * @param last - the largest counter value the restored graph carries
 */
export function resumeEdgeCounter(counter: EdgeCounter, last: number): void {
    counter.next = Math.max(counter.next, last + 1);
}

/**
 * The id minted for an edge added in the session without a file id. `graphty:` is a reserved
 * namespace, so it can never collide with an id a file chose unless the file was written by the
 * element itself.
 * @param counter - the edge's counter value
 * @returns the minted id
 */
export function mintedEdgeId(counter: number): string {
    return `graphty:e${counter}`;
}

/** What becomes of a record repeating an edge the graph already holds. */
type RepeatDecision =
    /** `keep`: the repeat is an edge of its own. */
    | { readonly kind: "add" }
    /** `error`: the load is refused with `E_DUPLICATE_EDGE`. */
    | { readonly kind: "refuse" }
    /** `first`: the repeat is dropped and the survivor is untouched. */
    | { readonly kind: "drop" }
    /**
     * `last`, `sum`, `min`, `max`: the survivor takes `weight`, and under `last` the repeat's
     * attributes replace the survivor's (`replaceRecord`).
     */
    | { readonly kind: "merge"; readonly weight: number; readonly replaceRecord: boolean };

/**
 * The repeated-edge survivorship decision, one place for every ingest path and every test harness,
 * so nothing re-implements which edges survive.
 * @param policy - `data.knownFields.repeatedEdges`, or a call's override
 * @param survivorWeight - the weight the edge already held carries
 * @param repeatWeight - the repeating record's resolved weight
 * @returns the decision
 */
export function decideRepeat(policy: DuplicatePolicy, survivorWeight: number, repeatWeight: number): RepeatDecision {
    switch (policy) {
        case "keep":
            return { kind: "add" };
        case "error":
            return { kind: "refuse" };
        case "first":
            return { kind: "drop" };
        case "sum":
            return { kind: "merge", weight: survivorWeight + repeatWeight, replaceRecord: false };
        case "min":
            return { kind: "merge", weight: Math.min(survivorWeight, repeatWeight), replaceRecord: false };
        case "max":
            return { kind: "merge", weight: Math.max(survivorWeight, repeatWeight), replaceRecord: false };
        default:
            // "last": the repeat's weight and attributes replace the survivor's. The other three
            // reducers keep the survivor's attributes: no reading of `sum` makes the last record's
            // colour the group's colour.
            return { kind: "merge", weight: repeatWeight, replaceRecord: true };
    }
}

/** The element-assigned edge counter column. Its value, printed, is `Edge.id`. */
export const EDGE_ID_COLUMN = "graphty.edgeId";

/** The builder columns the completion pass fills. Internal names; the `graphty.` prefix is reserved. */
export const IDENTITY_COLUMNS = {
    /** Node: `hashNodeId` of the node id, two uint32 lanes. */
    nodeHash: "graphty.nodeHash",
    /** Edge: `hashEdgeMember` of the edge's stable identity, two uint32 lanes. */
    edgeHash: "graphty.edgeHash",
    /** Edge: its position among its pair's surviving edges in its load; -1 for a session edge. */
    edgeOrdinal: "graphty.edgeOrdinal",
    /** Edge: its pair's surviving edge count in its load; -1 for a session edge. */
    edgeAmong: "graphty.edgeAmong",
} as const;

/**
 * The graph attribute recording whether edge pairs are ordered (1) or unordered (0). Latched once
 * per store, when the first edge is completed: a pair is ordered only when the graph was declared
 * directed by then, and a direction settled later changes nothing already written.
 */
export const PAIRS_ORDERED_ATTRIBUTE = "graphty.edgePairsOrdered";

/** Where the completion pass reads endpoints and node ids: a builder, or a snapshot. */
export interface IdentityGraph {
    /**
     * The declared endpoints of a live edge.
     * @param edge - the edge row
     * @returns [source index, target index]
     */
    endpoints(edge: number): readonly [number, number];
    /**
     * The id of a live node.
     * @param node - the node row
     * @returns the id
     */
    idOf(node: number): NodeId;
}

/** Receives one completed edge row. */
type IdentityWriter = (row: number, ordinal: number, among: number, hash: LanePair) => void;

/** What the tests read: the transient bytes of the last completed load, and how many edges it held. */
export const identityCounters = { lastTransientBytes: 0, lastLoadEdges: 0 };

/**
 * Complete one load: give each of its surviving edges its ordinal and among, counted per pair in
 * ingest order, and its edge hash.
 *
 * The load's rows are sorted by (pair, row) through a permutation over two endpoint arrays, 20
 * transient bytes per loaded edge with the row list and 4 per node (see `sortPairs`), and the columns are filled in one pass. No
 * map over the whole graph's pairs is kept. Rows are appended in ingest order and a compacting
 * freeze keeps their order, so row order within a load is counter order.
 * @param rows - the load's surviving edge rows, ascending
 * @param graph - where endpoints and ids are read
 * @param ordered - whether pairs are ordered (the graph was declared directed at ingest)
 * @param fileIdAt - the file id of the edge at a position of `rows`, or undefined
 * @param write - receives each completed row
 */
export function completeLoad(
    rows: Uint32Array,
    graph: IdentityGraph,
    ordered: boolean,
    fileIdAt: (position: number) => string | number | undefined,
    write: IdentityWriter,
): void {
    const count = rows.length;
    const lo = new Uint32Array(count);
    const hi = new Uint32Array(count);
    let nodeBound = 0;
    for (let i = 0; i < count; i++) {
        const [u, v] = graph.endpoints(rows[i]);
        const swap = !ordered && v < u;
        lo[i] = swap ? v : u;
        hi[i] = swap ? u : v;
        nodeBound = Math.max(nodeBound, lo[i] + 1, hi[i] + 1);
    }

    const { perm, bytes } = sortPairs(lo, hi, nodeBound);
    identityCounters.lastTransientBytes = rows.byteLength + lo.byteLength + hi.byteLength + bytes;
    identityCounters.lastLoadEdges = count;

    let start = 0;
    let loNode = -1;
    let loHash: LanePair = { a: 0, b: 0 };
    while (start < count) {
        const first = perm[start];
        let end = start + 1;
        while (end < count && lo[perm[end]] === lo[first] && hi[perm[end]] === hi[first]) {
            end++;
        }

        // lo and hi are the declared ends, swapped only when the pair is unordered, where the
        // hash is symmetric in its ends. Runs share their lower end, so it is hashed once a run.
        if (lo[first] !== loNode) {
            loNode = lo[first];
            loHash = hashNodeId(graph.idOf(loNode));
        }

        const hiHash = hashNodeId(graph.idOf(hi[first]));
        const among = end - start;
        for (let k = start; k < end; k++) {
            const position = perm[k];
            const ordinal = k - start;
            write(rows[position], ordinal, among, hashEdgeEnds(loHash, hiHash, ordered, fileIdAt(position), ordinal, among));
        }

        start = end;
    }
}

/**
 * The positions of a load's edges ordered by (lo, hi, position).
 *
 * Two stable counting-sort passes, by hi and then by lo, when the node range is small beside the
 * load (every bulk load): linear, and no comparator closure is called per comparison, which was
 * most of the pass's time. A small load onto a large graph sorts by comparator instead, so its
 * transient memory stays proportional to the load, not to the graph.
 * @param lo - each position's lower (or source) node
 * @param hi - each position's upper (or target) node
 * @param nodeBound - one past the largest node index
 * @returns the ordered positions, and the transient bytes the sort held
 */
function sortPairs(lo: Uint32Array, hi: Uint32Array, nodeBound: number): { perm: Uint32Array; bytes: number } {
    const count = lo.length;
    if (nodeBound > 4 * count) {
        const perm = new Uint32Array(count);
        for (let i = 0; i < count; i++) {
            perm[i] = i;
        }

        perm.sort((a, b) => lo[a] - lo[b] || hi[a] - hi[b] || a - b);
        return { perm, bytes: perm.byteLength };
    }

    const starts = new Uint32Array(nodeBound + 1);
    const byHi = new Uint32Array(count);
    const perm = new Uint32Array(count);
    const place = (key: Uint32Array, from: Uint32Array | null, to: Uint32Array): void => {
        starts.fill(0);
        for (let i = 0; i < count; i++) {
            starts[key[i] + 1]++;
        }

        for (let n = 0; n < nodeBound; n++) {
            starts[n + 1] += starts[n];
        }

        for (let i = 0; i < count; i++) {
            const position = from === null ? i : from[i];
            to[starts[key[position]]++] = position;
        }
    };
    place(hi, null, byHi);
    place(lo, byHi, perm);

    return { perm, bytes: starts.byteLength + byHi.byteLength + perm.byteLength };
}

/**
 * The hash of a session edge: its file id when it has one, else the id minted from its counter.
 * @param graph - where endpoints and ids are read
 * @param row - the edge row
 * @param counter - its counter value
 * @param fileId - its file id, if any
 * @param ordered - whether pairs are ordered
 * @returns the hash
 */
export function sessionEdgeHash(
    graph: IdentityGraph,
    row: number,
    counter: number,
    fileId: string | number | undefined,
    ordered: boolean,
): LanePair {
    const [u, v] = graph.endpoints(row);

    return hashEdgeMember({ source: graph.idOf(u), target: graph.idOf(v), id: fileId ?? mintedEdgeId(counter) }, ordered);
}

/** The four identity columns of a snapshot, read or computed. */
interface IdentityColumns {
    /** Two lanes per node. */
    readonly nodeHash: Uint32Array;
    /** Two lanes per edge. */
    readonly edgeHash: Uint32Array;
    /** Per edge; -1 for a session edge. */
    readonly edgeOrdinal: Int32Array;
    /** Per edge; -1 for a session edge. */
    readonly edgeAmong: Int32Array;
}

/**
 * Whether a snapshot's edge pairs are ordered: the store's latch when it has one, else the
 * snapshot's own direction (a raw graph-format or graph-io snapshot was declared by its producer).
 * @param snapshot - the snapshot
 * @returns true when pairs are ordered
 */
export function pairsOrdered(snapshot: GraphSnapshot): boolean {
    const latch = snapshot.graph.typed(PAIRS_ORDERED_ATTRIBUTE, "u8");

    return latch === null ? snapshot.directed : latch.data[0] === 1;
}

/**
 * A stable edge member with its ends in the canonical comparator order when pairs are unordered,
 * so `b -> a` and `a -> b` spell one member of an undirected graph. Anything that is not a pair
 * of ids passes through unchanged for a validator to judge; an already canonical member is
 * returned as the same object.
 * @param member - the member as given
 * @param ordered - whether the graph's pairs are ordered
 * @returns the member
 */
export function canonicalEdgeEnds<T>(member: T, ordered: boolean): T {
    if (ordered || typeof member !== "object" || member === null) {
        return member;
    }

    const { source, target } = member as { source?: unknown; target?: unknown };
    const isId = (value: unknown): value is NodeId => typeof value === "string" || typeof value === "number";
    if (!isId(source) || !isId(target) || compareIds(target, source) >= 0) {
        return member;
    }

    return { ...member, source: target, target: source };
}

/**
 * The completion pass's view of a snapshot.
 * @param snapshot - the snapshot
 * @returns the view
 */
function snapshotGraph(snapshot: GraphSnapshot): IdentityGraph {
    return {
        endpoints: (edge) => [snapshot.edgeSource(edge), snapshot.edgeTarget(edge)],
        idOf: (node) => snapshot.ids.idOf(node),
    };
}

const lazyIdentity = new WeakMap<GraphSnapshot, IdentityColumns>();

/**
 * A snapshot's identity columns: the store's, when it carries them, else computed from its ids on
 * first read and cached -- exactly what the completion pass would have written had the whole
 * snapshot been one load with no file ids.
 * @param snapshot - the snapshot
 * @returns the columns
 */
export function identityColumnsOf(snapshot: GraphSnapshot): IdentityColumns {
    const nodeHash = snapshot.nodes.typed(IDENTITY_COLUMNS.nodeHash, "u32");
    const edgeHash = snapshot.edges.typed(IDENTITY_COLUMNS.edgeHash, "u32");
    const edgeOrdinal = snapshot.edges.typed(IDENTITY_COLUMNS.edgeOrdinal, "i32");
    const edgeAmong = snapshot.edges.typed(IDENTITY_COLUMNS.edgeAmong, "i32");
    if (nodeHash !== null && edgeHash !== null && edgeOrdinal !== null && edgeAmong !== null) {
        return { nodeHash: nodeHash.data, edgeHash: edgeHash.data, edgeOrdinal: edgeOrdinal.data, edgeAmong: edgeAmong.data };
    }

    let computed = lazyIdentity.get(snapshot);
    if (computed === undefined) {
        computed = computeIdentity(snapshot);
        lazyIdentity.set(snapshot, computed);
    }

    return computed;
}

/**
 * Compute a snapshot's identity columns from its ids.
 * @param snapshot - the snapshot
 * @returns the columns
 */
function computeIdentity(snapshot: GraphSnapshot): IdentityColumns {
    const nodeHash = new Uint32Array(2 * snapshot.nodeCount);
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const { a, b } = hashNodeId(snapshot.ids.idOf(i));
        nodeHash[2 * i] = a;
        nodeHash[2 * i + 1] = b;
    }

    const edgeHash = new Uint32Array(2 * snapshot.edgeCount);
    const edgeOrdinal = new Int32Array(snapshot.edgeCount);
    const edgeAmong = new Int32Array(snapshot.edgeCount);
    const rows = new Uint32Array(snapshot.edgeCount);
    for (let e = 0; e < rows.length; e++) {
        rows[e] = e;
    }

    completeLoad(rows, snapshotGraph(snapshot), pairsOrdered(snapshot), () => undefined, (row, ordinal, among, hash) => {
        edgeOrdinal[row] = ordinal;
        edgeAmong[row] = among;
        edgeHash[2 * row] = hash.a;
        edgeHash[2 * row + 1] = hash.b;
    });

    return { nodeHash, edgeHash, edgeOrdinal, edgeAmong };
}

/**
 * The bytes the identity columns hold in a snapshot: data plus validity of each of the four,
 * which is what the memory budget of design 6.5 counts (8 per node, 16 per edge).
 * @param snapshot - the snapshot
 * @returns the byte count; 0 for a snapshot without the columns
 */
export function identityColumnBytes(snapshot: GraphSnapshot): number {
    let bytes = snapshot.nodes.get(IDENTITY_COLUMNS.nodeHash)?.byteLength ?? 0;
    for (const name of [IDENTITY_COLUMNS.edgeHash, IDENTITY_COLUMNS.edgeOrdinal, IDENTITY_COLUMNS.edgeAmong]) {
        bytes += snapshot.edges.get(name)?.byteLength ?? 0;
    }

    return bytes;
}

/**
 * An edge's stable identity, built from its row's columns (design 12.3): its file id when the
 * caller read one at the configured `edgeIdPath`, else its ordinal and among when it came from a
 * load, else the id minted from its counter. The ends of an unordered pair are in the canonical
 * comparator order, so both orientations of one edge give one member.
 * @param snapshot - the snapshot the row belongs to
 * @param edge - the edge row
 * @param fileId - the edge's file id, read by the caller at the configured `edgeIdPath`
 * @returns the member
 */
export function stableEdgeMember(snapshot: GraphSnapshot, edge: number, fileId?: string | number): EdgeMember {
    let source = snapshot.ids.idOf(snapshot.edgeSource(edge));
    let target = snapshot.ids.idOf(snapshot.edgeTarget(edge));
    if (!pairsOrdered(snapshot) && compareIds(target, source) < 0) {
        [source, target] = [target, source];
    }

    if (fileId !== undefined) {
        return { source, target, id: fileId };
    }

    const { edgeOrdinal, edgeAmong } = identityColumnsOf(snapshot);
    const ordinal = edgeOrdinal[edge];
    if (ordinal >= 0) {
        return { source, target, ordinal, among: edgeAmong[edge] };
    }

    const counter = snapshot.edges.typed(EDGE_ID_COLUMN, "u32");
    if (counter === null || !counter.isSet(edge)) {
        throw new Error(`edge ${edge} has neither an ordinal nor a counter to mint an id from`);
    }

    return { source, target, id: mintedEdgeId(counter.data[edge]) };
}
