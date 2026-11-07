/**
 * The time window moved through the visibility masks without a full pass: what every `session.time`
 * move does (design/data/timeline-attribute.md section 5.3). A move finds the rows that crossed
 * either edge of the window from the designated field's sorted index (two binary searches per
 * kind; for spans, one over the starts and one over the ends, and a row is inside while its count of
 * overlapping spans is above zero). A small move re-tests only those rows, the nodes whose counts they moved, and those nodes'
 * edges; a move over budget (changed edges plus the summed degree of changed nodes, past a share of
 * the graph) rewrites both masks in flat loops over typed arrays. The filter's own tests are read
 * once, as bytes, so a frame never compiles or walks a closure.
 *
 * The result is exactly what a full pass over the filter AND the window writes (the rule of design
 * section 2.4, as `compileWindow` and `runPass` write it): a node shows when it passes the filter,
 * its own time (when nodes are timed) and, for `nodes: "ends"`, has an edge passing the filter and
 * the window (an edge with no time passes under `missing: "inside"` only); an edge shows when both its ends show and it passes the filter and the window. A full
 * pass is left for starting a slide, for a kind whose records the window reads (timed by a column
 * the index does not hold, or holding the column though the field does not time it), and for masks
 * someone else rewrote since the last move.
 *
 * An instant is a span ending at the next float above it, and a kind of instants holds one array for
 * both orders, so a small move reads the same for both. A jump differs: a kind of instants holds
 * what shows in one stretch of its index, which a jump rewrites; a kind of spans does not, so a jump
 * reads the spans overlapping the old window and the new from buckets by power-of-two duration, one
 * binary search per bucket.
 */

import type { GraphSnapshot, U8 } from "@graphty/graph-format";

import type { EdgeId, NodeId } from "../../catalog/types";
import type { ElementMask } from "../scope/ElementMask";
import { drain, endedBy, lowerBound, radixArgsort } from "../time/timeIndex";
import type { TimeInstants, TimeSpans, TimeWindow } from "./filter";

/**
 * The share of the graph a move walks row by row before flat loops cost less: a row walked costs
 * about as much as four read in order, a burst's move measured at a million edges.
 */
const BUDGET_SHARE = 4;

/** The rows a move may always walk: under this, flat loops have nothing to win. */
const MIN_BUDGET = 32;

/**
 * How many of the window's edges a scan reads for the cost of one arc walked from a moved node: the
 * scan reads only the ends, in order, and goes on to the edge for the few with a moved end.
 */
const WALK_SHARE = 4;

/**
 * The share of the edges past which a jump reads every edge in order rather than the two stretches
 * of the index it moved between: a row of a stretch costs about twice one read in order.
 */
const STRETCH_SHARE = 2;

/** The share of the graph a mask keeps as a changed-row list: past it, a reader reads every row. */
const ROW_LIST_SHARE = 8;

/** Work done by slides, for a test that counts it rather than times it. */
export const slideCounters = {
    /** Full passes, however they were reached. */
    full: 0,
    /** Moves that rewrote the masks in flat loops. */
    jumps: 0,
    /** Rows a small move visited, one by one as it visits them. */
    rows: 0,
    /** Edges a rewrite re-tested in a flat loop or from a jump's crossed rows. */
    rewritten: 0,
    /** Small moves that scanned the window's edges rather than a moved node's. */
    scans: 0,
    /** Times a filter's tests were kept or read for a slide, which only `session.time` reaches. */
    filterReads: 0,
    /** Spans a jump over a kind of spans read from its duration buckets. */
    spans: 0,
};

/** What one kind's index holds for a slide: the instants per row, and their sorted order. */
interface SlideInstants extends TimeInstants {
    /** Where each span starts, ascending: for a kind of instants, the instants. */
    readonly sorted: Float64Array;
    /** The row of each. */
    readonly perm: Uint32Array;
    /** Where each span ends, ascending: for a kind of instants, `sorted` itself. */
    readonly sortedEnd: Float64Array;
    /** The row of each: for a kind of instants, `perm` itself. */
    readonly endPerm: Uint32Array;
    /** The spans row by row; null for a kind of instants. */
    readonly spans: TimeSpans | null;
}

/** Each kind's filter tests as one byte per row, or null when the filter says nothing of the kind. */
export interface FilterBytes {
    readonly nodes: Uint8Array | null;
    readonly edges: Uint8Array | null;
}

/** What a slide reads and writes. */
export interface SlideTarget {
    /** The snapshot the masks describe. */
    readonly graph: GraphSnapshot;
    /** What the filter in force is made of, by identity: any new part starts the slide again. */
    readonly filter: readonly unknown[];
    /** The node mask, written in place. */
    readonly nodes: ElementMask<NodeId>;
    /** The edge mask, written in place. */
    readonly edges: ElementMask<EdgeId>;
    /** What the filter alone keeps, the cached filter mask. */
    readonly filterBytes: () => FilterBytes;
    /** A window's bounds as instants. */
    readonly bounds: (window: TimeWindow) => readonly [number, number];
    /** Write the masks from the filter and a window in one full pass. */
    readonly evaluate: (window: TimeWindow) => void;
    /** Whether the window reads a kind's records, so an index alone cannot say what it keeps. */
    readonly readsRecords: (window: TimeWindow) => boolean;
    /** The designated field's index per kind, or null for a kind it does not time. */
    readonly instants: { readonly node: TimeInstants | null; readonly edge: TimeInstants | null } | null;
}

/** Elements that came into view and went out of it on one move. */
export interface SlideCounts {
    readonly entered: { readonly nodes: number; readonly edges: number };
    readonly left: { readonly nodes: number; readonly edges: number };
    /** The snapshot the rows belong to, for a move published after the graph may have changed. */
    readonly graph?: GraphSnapshot;
    /** The rows that changed, for `time.changes()`. */
    readonly rows: {
        readonly enteredNodes: ArrayLike<number>;
        readonly leftNodes: ArrayLike<number>;
        readonly enteredEdges: ArrayLike<number>;
        readonly leftEdges: ArrayLike<number>;
    };
}

/** One kind's place in its sorted index. */
export interface KindState {
    readonly index: SlideInstants;
    /** Whether each row is inside the window (an untimed row by the `missing` rule). */
    readonly inside: Uint8Array;
    /** How many of each timed row's spans overlap the window; null for a kind of instants. */
    readonly overlaps: Int32Array | null;
    /** Room for the rows a scan of a kind of spans finds crossing, kept between jumps. */
    scanned: Uint32Array | null;
    /** The window the counts of overlapping spans were taken at. */
    from: number;
    to: number;
    /** How many spans have ended by the window's start, and how many start before its end. */
    lo: number;
    hi: number;
}

/** One direction of the graph's adjacency. */
export type Arcs = Pick<GraphSnapshot, "rowPtr" | "colIdx" | "arcToEdge">;

/** Rows as a move finds them, in room kept between moves: a list of numbers would be garbage. */
class RowList {
    private list = new Uint32Array(1024);
    private count = 0;

    /**
     * Add a row.
     * @param row - The row.
     */
    push(row: number): void {
        if (this.count === this.list.length) {
            const grown = new Uint32Array(2 * this.list.length);
            grown.set(this.list);
            this.list = grown;
        }

        this.list[this.count++] = row;
    }

    /**
     * The rows added since the list was last cleared.
     * @returns The rows, good until the next add or clear.
     */
    view(): Uint32Array {
        return this.list.subarray(0, this.count);
    }

    /** Empty the list, keeping its room. */
    clear(): void {
        this.count = 0;
    }
}

/** The rows of one kind a small move took in and out of view. */
interface MovedRows {
    readonly entered: RowList;
    readonly left: RowList;
}

/**
 * Empty lists for the rows of one kind.
 * @returns The lists.
 */
function movedRows(): MovedRows {
    return { entered: new RowList(), left: new RowList() };
}

/** Everything a slide keeps between moves. */
export interface SlideState {
    readonly graph: GraphSnapshot;
    readonly filter: readonly unknown[];
    readonly attribute: string;
    readonly missingInside: boolean;
    readonly ends: boolean;
    readonly filterNodes: Uint8Array | null;
    readonly filterEdges: Uint8Array | null;
    readonly node: KindState | null;
    readonly edge: KindState | null;
    /** The indexes the slide was built from, by identity: a new reading of the field starts it again. */
    readonly nodeIndex: TimeInstants | null;
    readonly edgeIndex: TimeInstants | null;
    /** Per node, how many incident edges pass the filter and the window (`nodes: "ends"` only). */
    readonly endCount: Int32Array | null;
    /** One byte per node, set only while a scan looks for the edges of the nodes a move changed. */
    readonly marks: Uint8Array;
    nodeVersion: number;
    edgeVersion: number;
}

/** Each edge's ends, by position in one sorted order of the edges rather than by row. */
interface OrderedEnds {
    readonly graph: GraphSnapshot;
    readonly src: Uint32Array;
    readonly dst: Uint32Array;
}

/** Ends by the order they follow, built on a kind's first slide and kept while its index lives. */
const endsByOrder = new WeakMap<Uint32Array, OrderedEnds>();

/**
 * The edges' ends in an index's order, so a stretch of the index reads them in order: read by row,
 * each is a miss in arrays too large for the cache, the dearest part of re-testing an edge.
 * @param graph - The snapshot.
 * @param order - The rows in the index's order.
 * @returns The ends, position by position.
 */
function endsInOrder(graph: GraphSnapshot, order: Uint32Array): OrderedEnds {
    const known = endsByOrder.get(order);
    if (known?.graph === graph) {
        return known;
    }

    const list = graph.edgeList();
    const src = new Uint32Array(order.length);
    const dst = new Uint32Array(order.length);
    for (let at = 0; at < order.length; at++) {
        src[at] = list.src[order[at]];
        dst[at] = list.dst[order[at]];
    }

    const ends = { graph, src, dst };
    endsByOrder.set(order, ends);
    return ends;
}

/**
 * Whether an index carries its sorted order.
 * @param instants - The kind's instants.
 * @returns True when it can be slid.
 */
function isSlidable(instants: TimeInstants): instants is SlideInstants {
    return "sorted" in instants && "perm" in instants;
}

/**
 * Re-test every timed row of a kind of spans against a window: one read of its columns in order.
 * @param kind - The kind.
 * @param spans - Its spans.
 * @param from - The window's start.
 * @param to - The window's end.
 * @returns The rows that crossed in or out, ascending; good until the next scan.
 */
function scanSpans(kind: KindState, spans: TimeSpans, from: number, to: number): Uint32Array {
    const { inside, index } = kind;
    const overlaps = kind.overlaps as Int32Array;
    const { starts, ends, first } = spans;
    kind.scanned ??= new Uint32Array(inside.length);
    const out = kind.scanned;
    let crossed = 0;
    // No branch on the values: which rows overlap is random, which no predictor follows.
    for (let row = 0; row < inside.length; row++) {
        const start = first[row];
        const end = first[row + 1];
        if (start !== end) {
            let overlapping = 0;
            for (let at = start; at < end; at++) {
                overlapping += Number(starts[at] < to) & Number(ends[at] > from);
            }

            overlaps[row] = overlapping;
            const now = Math.min(overlapping, 1);
            const was = inside[row];
            inside[row] = now;
            out[crossed] = row;
            crossed += was ^ now;
        }
    }

    kind.lo = endedBy(index, from);
    kind.hi = lowerBound(index.sorted, to);
    kind.from = from;
    kind.to = to;

    return out.subarray(0, crossed);
}

/**
 * A kind's spans grouped by duration: each bucket holds the spans no longer than its width, a power
 * of two, sorted by start, so the spans overlapping `[from, to)` start in `[from - width, to)`. Spans
 * with an open bound share the last bucket, of infinite width.
 */
interface SpanBuckets {
    /** Span ids, bucket by bucket, each bucket by start. */
    readonly order: Uint32Array;
    /** The starts of `order`. */
    readonly starts: Float64Array;
    /** Where each bucket begins in `order`, with one more entry than buckets. */
    readonly first: Uint32Array;
    /** Each bucket's widest span, with room for rounding. */
    readonly width: Float64Array;
    /** The row of each span. */
    readonly rowOf: Uint32Array;
}

/** How much more a span read through the buckets costs than one read in a flat scan. */
const SCAN_SHARE = 4;

/** Room past a bucket's width for rounding in `end - start`; every span found is tested exactly. */
const WIDTH_SLACK = 1 + 2 ** -40;

/** Buckets by spans, built on a kind's first jump and kept while its index lives. */
const bucketsBySpans = new WeakMap<TimeSpans, SpanBuckets>();

/**
 * Group a kind's spans by power-of-two duration, each group by start.
 * @param spans - The spans.
 * @returns The buckets.
 */
function bucketsOf(spans: TimeSpans): SpanBuckets {
    const known = bucketsBySpans.get(spans);
    if (known !== undefined) {
        return known;
    }

    const { starts, ends, first } = spans;
    const size = starts.length;
    const rowOf = new Uint32Array(size);
    for (let row = 0; row + 1 < first.length; row++) {
        rowOf.fill(row, first[row], first[row + 1]);
    }

    // An exponent per span: a duration of at most 2^k sits in bucket k; an open one in the last.
    const exponent = new Int32Array(size);
    const OPEN = 2048;
    for (let at = 0; at < size; at++) {
        const duration = ends[at] - starts[at];
        exponent[at] = Number.isFinite(duration) ? Math.ceil(Math.log2(Math.max(duration, Number.MIN_VALUE))) : OPEN;
    }

    const keys = [...new Set(exponent)].sort((a, b) => a - b);
    const slot = new Map(keys.map((key, at) => [key, at]));
    const bucketFirst = new Uint32Array(keys.length + 1);
    for (let at = 0; at < size; at++) {
        bucketFirst[(slot.get(exponent[at]) as number) + 1]++;
    }

    for (let at = 0; at < keys.length; at++) {
        bucketFirst[at + 1] += bucketFirst[at];
    }

    // Stable over the start order, so each bucket stays sorted by start.
    const byStart = drain(
        radixArgsort(
            starts,
            Uint32Array.from({ length: size }, (_, at) => at),
        ),
    );
    const order = new Uint32Array(size);
    const cursor = bucketFirst.slice(0, keys.length);
    for (const id of byStart) {
        order[cursor[slot.get(exponent[id]) as number]++] = id;
    }

    const buckets: SpanBuckets = {
        order,
        starts: Float64Array.from(order, (id) => starts[id]),
        first: bucketFirst,
        // A hair past the width, so rounding in `end - start` never leaves a span out.
        width: Float64Array.from(keys, (key) => (key === OPEN ? Number.POSITIVE_INFINITY : 2 ** key * WIDTH_SLACK)),
        rowOf,
    };
    bucketsBySpans.set(spans, buckets);
    return buckets;
}

/**
 * Where the spans that can overlap `[from, to)` lie in each bucket: those starting in
 * `[from - width, to)`.
 * @param buckets - The kind's buckets.
 * @param from - The window's start.
 * @param to - The window's end.
 * @returns Each bucket's first and one-past-last position in `order`, side by side.
 */
function reachOf(buckets: SpanBuckets, from: number, to: number): Uint32Array {
    const { starts, first, width } = buckets;
    const reach = new Uint32Array(2 * width.length);
    for (let bucket = 0; bucket < width.length; bucket++) {
        const stretch = starts.subarray(first[bucket], first[bucket + 1]);
        reach[2 * bucket] = first[bucket] + lowerBound(stretch, from - width[bucket]);
        reach[2 * bucket + 1] = Math.max(reach[2 * bucket], first[bucket] + lowerBound(stretch, to));
    }

    return reach;
}

/**
 * Add `delta` to the count of each row with a span overlapping one window and not the other, and
 * list the rows whose count left or reached zero.
 * @param kind - The kind.
 * @param spans - Its spans.
 * @param buckets - Its buckets.
 * @param reach - Where to look in them, from `reachOf`.
 * @param window - The start of the window the spans overlap (`reach` holds its end), then the
 *     window they must not overlap.
 * @param delta - 1 or -1.
 * @param touched - Takes the rows.
 */
function countReach(
    kind: KindState,
    spans: TimeSpans,
    buckets: SpanBuckets,
    reach: Uint32Array,
    window: readonly [number, number, number],
    delta: 1 | -1,
    touched: number[],
): void {
    const overlaps = kind.overlaps as Int32Array;
    const { starts, ends } = spans;
    const { order, rowOf } = buckets;
    const [from, notFrom, notTo] = window;
    const zero = delta === 1 ? 0 : 1;
    for (let at = 0; at < reach.length; at += 2) {
        slideCounters.spans += reach[at + 1] - reach[at];
        for (let place = reach[at]; place < reach[at + 1]; place++) {
            const id = order[place];
            if (ends[id] > from && !(starts[id] < notTo && ends[id] > notFrom)) {
                const row = rowOf[id];
                if (overlaps[row] === zero) {
                    touched.push(row);
                }

                overlaps[row] += delta;
            }
        }
    }
}

/**
 * Move a kind of spans to a far window. When the two windows reach few spans, only those are read,
 * from the kind's duration buckets, and a span overlapping both changes nothing; when they reach
 * many, one flat read of every span costs less than following the buckets.
 * @param kind - The kind.
 * @param spans - Its spans.
 * @param from - The window's start.
 * @param to - The window's end.
 * @returns The rows that crossed in or out, ascending.
 */
function jumpSpans(kind: KindState, spans: TimeSpans, from: number, to: number): Uint32Array {
    const buckets = bucketsOf(spans);
    const old = reachOf(buckets, kind.from, kind.to);
    const now = reachOf(buckets, from, to);
    let reached = 0;
    for (let at = 0; at < old.length; at += 2) {
        reached += old[at + 1] - old[at] + now[at + 1] - now[at];
    }

    if (reached * SCAN_SHARE > spans.starts.length) {
        return scanSpans(kind, spans, from, to);
    }

    const { inside, index } = kind;
    const overlaps = kind.overlaps as Int32Array;
    const touched: number[] = [];
    countReach(kind, spans, buckets, old, [kind.from, from, to], -1, touched);
    countReach(kind, spans, buckets, now, [from, kind.from, kind.to], 1, touched);

    // A row that went to zero and back is no row at all; one listed twice is changed once.
    let crossed = 0;
    const out = new Uint32Array(touched.length);
    for (const row of touched) {
        const holds = overlaps[row] > 0 ? 1 : 0;
        if (inside[row] !== holds) {
            inside[row] = holds;
            out[crossed++] = row;
        }
    }

    kind.lo = endedBy(index, from);
    kind.hi = lowerBound(index.sorted, to);
    kind.from = from;
    kind.to = to;

    return out.subarray(0, crossed).sort();
}

/**
 * The test results of one kind, one byte per row, or null when nothing narrows it.
 * @param test - The compiled test.
 * @param count - How many rows.
 * @returns The bytes.
 */
export function bytesOf(test: ((index: number) => boolean) | null, count: number): Uint8Array | null {
    if (test === null) {
        return null;
    }

    const out = new Uint8Array(count);
    for (let row = 0; row < count; row++) {
        out[row] = test(row) ? 1 : 0;
    }

    return out;
}

/**
 * Write whether each row of a kind is inside a window, and where the window sits in the index.
 * @param kind - The kind.
 * @param from - The window's start.
 * @param to - The window's end.
 * @param missingInside - Whether a row with no instant is inside.
 */
function placeWindow(kind: KindState, from: number, to: number, missingInside: boolean): void {
    const { inside, index } = kind;
    const { rows, sorted, spans } = index;
    const missing = missingInside ? 1 : 0;
    if (spans !== null) {
        inside.fill(missing);
        scanSpans(kind, spans, from, to);
        return;
    }

    for (let row = 0; row < inside.length; row++) {
        const at = rows[row];
        if (Number.isNaN(at)) {
            inside[row] = missing;
        } else {
            inside[row] = at >= from && at < to ? 1 : 0;
        }
    }

    kind.lo = lowerBound(sorted, from);
    kind.hi = lowerBound(sorted, to);
}

/**
 * Count, per node, the incident edges that pass the filter and the window. With no timed edges the
 * window treats every edge as untimed, so the counts never move.
 * @param graph - The snapshot.
 * @param edge - The edges' place in the window, or null when no edge has a time.
 * @param missingInside - Whether an edge with no instant is inside.
 * @param filterEdges - The filter's edge bytes.
 * @returns The counts.
 */
function countEnds(
    graph: GraphSnapshot,
    edge: KindState | null,
    missingInside: boolean,
    filterEdges: Uint8Array | null,
): Int32Array {
    const { src, dst } = graph.edgeList();
    const endCount = new Int32Array(graph.nodeCount);
    if (edge === null && !missingInside) {
        return endCount;
    }

    const inside = edge?.inside ?? null;
    for (let row = 0; row < graph.edgeCount; row++) {
        if ((inside === null || inside[row] === 1) && (filterEdges === null || filterEdges[row] === 1)) {
            endCount[src[row]]++;
            endCount[dst[row]]++;
        }
    }

    return endCount;
}

/**
 * Write one stretch of the sorted index as inside or outside the window. A row with no instant is
 * in no stretch and keeps its place.
 * @param kind - The kind.
 * @param start - The first sorted position.
 * @param end - One past the last.
 * @param now - 1 for inside, 0 for outside.
 */
function markRows(kind: KindState, start: number, end: number, now: 0 | 1): void {
    const { perm } = kind.index;
    const { inside } = kind;
    for (let at = start; at < end; at++) {
        inside[perm[at]] = now;
    }
}

/**
 * Add the window's edges to the nodes' counts, or take them away.
 * @param graph - The snapshot.
 * @param state - The slide.
 * @param edge - The edges' place in the window.
 * @param delta - 1 or -1.
 */
function shiftEnds(graph: GraphSnapshot, state: SlideState, edge: KindState, delta: 1 | -1): void {
    const { endCount, filterEdges } = state;
    if (endCount === null) {
        return;
    }

    const { src, dst } = graph.edgeList();
    const { perm } = edge.index;
    for (let at = edge.lo; at < edge.hi; at++) {
        const row = perm[at];
        if (filterEdges === null || filterEdges[row] === 1) {
            endCount[src[row]] += delta;
            endCount[dst[row]] += delta;
        }
    }
}

/**
 * Whether a node shows, from what a slide keeps.
 * @param state - The slide.
 * @param row - The node.
 * @returns True when it shows.
 */
function nodeShows(state: SlideState, row: number): boolean {
    return (
        (state.filterNodes === null || state.filterNodes[row] === 1) &&
        (state.node === null || state.node.inside[row] === 1) &&
        (state.endCount === null || state.endCount[row] > 0)
    );
}

/**
 * Whether an edge passes its own tests, before its endpoints have a say.
 * @param state - The slide.
 * @param row - The edge.
 * @returns True when it passes.
 */
export function edgePasses(state: SlideState, row: number): boolean {
    return (
        (state.edge === null || state.edge.inside[row] === 1) &&
        (state.filterEdges === null || state.filterEdges[row] === 1)
    );
}

/**
 * Where a kind's window sits in its index: the spans overlapping it are as many as the difference.
 * @param kind - The kind, or null.
 * @returns The spans ended by its start, and those starting before its end.
 */
function stretchOf(kind: KindState | null): readonly [number, number] {
    return [kind?.lo ?? 0, kind?.hi ?? 0];
}

/**
 * How far a kind's place in the index is from a window's.
 * @param kind - The kind, or null.
 * @param from - The window's start.
 * @param to - The window's end.
 * @returns The sorted positions between them.
 */
function distanceTo(kind: KindState | null, from: number, to: number): number {
    return kind === null
        ? 0
        : Math.abs(endedBy(kind.index, from) - kind.lo) + Math.abs(lowerBound(kind.index.sorted, to) - kind.hi);
}

/**
 * Whether a kind holds spans, so nothing but its columns says what a jump leaves inside.
 * @param kind - The kind, or null.
 * @returns True for spans.
 */
function holdsSpans(kind: KindState | null): boolean {
    return (kind?.overlaps ?? null) !== null;
}

/**
 * Add a stretch of a sorted order to its rows' counts of overlapping spans.
 * @param overlaps - The counts.
 * @param perm - The order's rows.
 * @param stretch - The stretch's first position, and one past its last.
 * @param delta - 1 or -1.
 */
function shiftOverlaps(overlaps: Int32Array, perm: Uint32Array, stretch: readonly number[], delta: 1 | -1): void {
    const [start, end] = stretch;
    for (let at = start; at < end; at++) {
        overlaps[perm[at]] += delta;
    }
}

/**
 * Move a kind to a window, one row at a time.
 * @param kind - The kind, or null.
 * @param from - The window's start.
 * @param to - The window's end.
 * @returns The rows that crossed in or out.
 */
function crossRows(kind: KindState | null, from: number, to: number): Uint32Array {
    if (kind === null) {
        return NO_ROWS.left;
    }

    const { inside, overlaps, index } = kind;
    const { perm, endPerm, sorted } = index;
    const lo = endedBy(index, from);
    const hi = lowerBound(sorted, to);
    const ended = [Math.min(lo, kind.lo), Math.max(lo, kind.lo)];
    const started = [Math.min(hi, kind.hi), Math.max(hi, kind.hi)];
    slideCounters.rows += ended[1] - ended[0] + started[1] - started[0];
    if (overlaps !== null) {
        shiftOverlaps(overlaps, endPerm, ended, lo > kind.lo ? -1 : 1);
        shiftOverlaps(overlaps, perm, started, hi > kind.hi ? 1 : -1);
    }

    const out = new Uint32Array(ended[1] - ended[0] + started[1] - started[0]);
    let crossed = 0;
    // Counted first, so a row a move passes from one side to the other is no row at all.
    for (const [order, [start, end]] of [
        [endPerm, ended],
        [perm, started],
    ] as const) {
        for (let at = start; at < end; at++) {
            const row = order[at];
            const now = insideAfter(overlaps, row, at, lo, hi);
            if (inside[row] !== now) {
                inside[row] = now;
                out[crossed++] = row;
            }
        }
    }

    kind.lo = lo;
    kind.hi = hi;
    kind.from = from;
    kind.to = to;
    return out.subarray(0, crossed);
}

/**
 * Whether a row is inside after a move. An instant needs no count: it is inside while its one
 * position is.
 * @param overlaps - The counts of overlapping spans; null for a kind of instants.
 * @param row - The row.
 * @param at - Its sorted position.
 * @param lo - The window's first sorted position.
 * @param hi - One past its last.
 * @returns 1 for inside.
 */
function insideAfter(overlaps: Int32Array | null, row: number, at: number, lo: number, hi: number): 0 | 1 {
    const holds = overlaps === null ? at >= lo && at < hi : overlaps[row] > 0;
    return holds ? 1 : 0;
}

/**
 * Move the nodes' counts by the edges that crossed, and note the nodes a count woke or put out.
 * @param graph - The snapshot.
 * @param state - The slide.
 * @param edgeRows - The edges that crossed.
 * @param woken - Takes the nodes.
 */
function countCrossed(graph: GraphSnapshot, state: SlideState, edgeRows: Uint32Array, woken: number[]): void {
    const { edge, endCount, filterEdges } = state;
    if (endCount === null || edge === null) {
        return;
    }

    const { src, dst } = graph.edgeList();
    const { inside } = edge;
    const shift = (end: number, delta: number): void => {
        const before = endCount[end];
        endCount[end] = before + delta;
        if (before === 0 || before + delta === 0) {
            woken.push(end);
        }
    };
    for (let at = 0; at < edgeRows.length; at++) {
        const row = edgeRows[at];
        if (filterEdges === null || filterEdges[row] === 1) {
            const delta = inside[row] === 1 ? 1 : -1;
            shift(src[row], delta);
            shift(dst[row], delta);
        }
    }
}

/**
 * How many edges re-testing some nodes would look at.
 * @param directions - The graph's directions.
 * @param rows - The nodes.
 * @param cap - Where to stop counting: any sum past it is as good as another.
 * @returns Their summed degree, or the first partial sum past the cap.
 */
function degreesOf(directions: readonly Arcs[], rows: ArrayLike<number>, cap = Number.POSITIVE_INFINITY): number {
    let degrees = 0;
    for (const { rowPtr } of directions) {
        for (let at = 0; at < rows.length; at++) {
            degrees += rowPtr[rows[at] + 1] - rowPtr[rows[at]];
            if (degrees > cap) {
                return degrees;
            }
        }
    }

    return degrees;
}

/**
 * Write the nodes that changed. A row can repeat: the second visit finds nothing left to change.
 * @param state - The slide.
 * @param bytes - The node mask's bytes.
 * @param rows - The nodes.
 * @param moved - Takes the nodes that came and went.
 * @returns The nodes that came and went.
 */
function moveNodes(state: SlideState, bytes: U8, rows: ArrayLike<number>, moved: MovedRows): MovedRows {
    for (let at = 0; at < rows.length; at++) {
        const row = rows[at];
        const shows = nodeShows(state, row) ? 1 : 0;
        if (shows !== bytes[row]) {
            bytes[row] = shows;
            (shows === 1 ? moved.entered : moved.left).push(row);
        }
    }

    return moved;
}

/**
 * Write edges by their own tests and both ends.
 * @param state - The slide.
 * @param graph - The snapshot.
 * @param nodeBytes - The node mask's bytes, already written.
 * @param bytes - The edge mask's bytes.
 * @param rows - The edges.
 * @param moved - Takes the edges that came and went.
 */
function retestEdges(
    state: SlideState,
    graph: GraphSnapshot,
    nodeBytes: U8,
    bytes: U8,
    rows: Uint32Array,
    moved: MovedRows,
): void {
    const { src, dst } = graph.edgeList();
    slideCounters.rows += rows.length;
    for (let at = 0; at < rows.length; at++) {
        const row = rows[at];
        const shows = edgePasses(state, row) && nodeBytes[src[row]] === 1 && nodeBytes[dst[row]] === 1 ? 1 : 0;
        if (shows !== bytes[row]) {
            bytes[row] = shows;
            (shows === 1 ? moved.entered : moved.left).push(row);
        }
    }
}

/**
 * Move a kind of instants' edges to a window and write them in the same pass: each edge the window
 * passed over is placed inside or out and tested against its own tests and both ends, read in the
 * index's order. The nodes must be written first. A row in both stretches finds nothing left to
 * change the second time.
 * @param state - The slide, whose edges are a kind of instants.
 * @param graph - The snapshot.
 * @param nodeBytes - The node mask's bytes, already written.
 * @param bytes - The edge mask's bytes.
 * @param window - The window's start and end.
 * @param moved - Takes the edges that came and went.
 */
function crossEdges(
    state: SlideState,
    graph: GraphSnapshot,
    nodeBytes: U8,
    bytes: U8,
    window: readonly [number, number],
    moved: MovedRows,
): void {
    const kind = state.edge as KindState;
    const { inside, index } = kind;
    const { perm, sorted } = index;
    const { src, dst } = endsInOrder(graph, perm);
    const { filterEdges } = state;
    const [from, to] = window;
    const lo = lowerBound(sorted, from);
    const hi = lowerBound(sorted, to);
    for (const [was, now] of [
        [kind.lo, lo],
        [kind.hi, hi],
    ]) {
        const end = Math.max(was, now);
        slideCounters.rows += end - Math.min(was, now);
        for (let at = Math.min(was, now); at < end; at++) {
            const row = perm[at];
            const placed = within(at, lo, hi);
            inside[row] = placed;
            const passes = placed & nodeBytes[src[at]] & nodeBytes[dst[at]];
            // An edge outside the old window did not show: unless it passes now, its bytes stay.
            if ((passes | within(at, kind.lo, kind.hi)) === 1) {
                writeEdge(bytes, row, passes & filterByte(filterEdges, row), moved);
            }
        }
    }

    kind.lo = lo;
    kind.hi = hi;
    kind.from = from;
    kind.to = to;
}

/** Room for the positions a scan of the window finds, kept between scans. */
let scanRoom = new Uint32Array(0);

/**
 * Bring the window's edges up to date after nodes came or went, when reading them costs less than
 * walking the moved nodes' arcs. Only an edge with a moved end can change, so the scan reads the
 * ends in the index's order and goes on to the edge only for those.
 * @param state - The slide, whose edges are a kind of instants.
 * @param graph - The snapshot.
 * @param nodeBytes - The node mask's bytes, already written.
 * @param bytes - The edge mask's bytes.
 * @param changed - The nodes that came and went.
 * @param moved - Takes the edges that came and went.
 */
function scanWindow(
    state: SlideState,
    graph: GraphSnapshot,
    nodeBytes: U8,
    bytes: U8,
    changed: MovedRows,
    moved: MovedRows,
): void {
    const { index, lo, hi } = state.edge as KindState;
    const { perm } = index;
    const { src, dst } = endsInOrder(graph, perm);
    const { filterEdges, marks } = state;
    setMarks(marks, changed, 1);

    // First the positions with a moved end, with no branch: which edges have one is random, which
    // no predictor follows. Every edge here is inside the window.
    slideCounters.rows += hi - lo;
    if (scanRoom.length < hi - lo) {
        scanRoom = new Uint32Array(hi - lo);
    }

    let found = 0;
    for (let at = lo; at < hi; at++) {
        scanRoom[found] = at;
        found += marks[src[at]] | marks[dst[at]];
    }

    for (let next = 0; next < found; next++) {
        const at = scanRoom[next];
        const row = perm[at];
        writeEdge(bytes, row, filterByte(filterEdges, row) & nodeBytes[src[at]] & nodeBytes[dst[at]], moved);
    }

    setMarks(marks, changed, 0);
}

/**
 * Set or clear the marks of the nodes that came and went.
 * @param marks - One byte per node.
 * @param changed - The nodes.
 * @param value - 1 to set, 0 to clear.
 */
function setMarks(marks: Uint8Array, changed: MovedRows, value: 0 | 1): void {
    for (const rows of [changed.entered.view(), changed.left.view()]) {
        for (let at = 0; at < rows.length; at++) {
            marks[rows[at]] = value;
        }
    }
}

/**
 * An edge's filter byte.
 * @param filterEdges - The filter's edge bytes, or null when it says nothing of edges.
 * @param row - The edge.
 * @returns 1 when the edge passes.
 */
function filterByte(filterEdges: Uint8Array | null, row: number): number {
    return filterEdges === null ? 1 : filterEdges[row];
}

/**
 * Whether a sorted position lies in a stretch.
 * @param at - The position.
 * @param start - The stretch's first position.
 * @param end - One past its last.
 * @returns 1 when it does.
 */
function within(at: number, start: number, end: number): number {
    return at >= start && at < end ? 1 : 0;
}

/**
 * Write an edge's byte, noting the edge when it changed.
 * @param bytes - The edge mask's bytes.
 * @param row - The edge.
 * @param shows - Its byte now.
 * @param moved - Takes the edge when it came or went.
 */
function writeEdge(bytes: U8, row: number, shows: number, moved: MovedRows): void {
    if (shows !== bytes[row]) {
        bytes[row] = shows;
        (shows === 1 ? moved.entered : moved.left).push(row);
    }
}

/**
 * Bring moved nodes' edges up to date, from one direction of the graph. The arc names the other
 * end, so this reads no endpoint list. An edge failing its own tests needs no look: if it showed,
 * it crossed the window and was re-tested already.
 * @param state - The slide.
 * @param nodeBytes - The node mask's bytes, already written.
 * @param bytes - The edge mask's bytes.
 * @param arcs - That direction of the graph.
 * @param rows - The nodes.
 * @param moved - Takes the edges that came and went.
 */
function walkArcs(
    state: SlideState,
    nodeBytes: U8,
    bytes: U8,
    arcs: Arcs,
    rows: ArrayLike<number>,
    moved: MovedRows,
): void {
    const { rowPtr, colIdx, arcToEdge } = arcs;
    for (let at = 0; at < rows.length; at++) {
        const row = rows[at];
        const shown = nodeBytes[row] === 1;
        const end = rowPtr[row + 1];
        slideCounters.rows += end - rowPtr[row];
        for (let arc = rowPtr[row]; arc < end; arc++) {
            const edge = arcToEdge[arc];
            if (!shown) {
                if (bytes[edge] === 1) {
                    bytes[edge] = 0;
                    moved.left.push(edge);
                }
            } else if (nodeBytes[colIdx[arc]] === 1 && bytes[edge] === 0 && edgePasses(state, edge)) {
                bytes[edge] = 1;
                moved.entered.push(edge);
            }
        }
    }
}

/**
 * How many edges the window's stretch of the index holds, when that is every edge that can show.
 * @param state - The slide.
 * @param graph - The snapshot.
 * @returns The rows; infinite when other edges can show too (those with no instant, or no index).
 */
export function windowRows(state: SlideState, graph: GraphSnapshot): number {
    const { edge, missingInside } = state;
    return edge !== null && !holdsSpans(edge) && (!missingInside || edge.index.timed === graph.edgeCount)
        ? edge.hi - edge.lo
        : Number.POSITIVE_INFINITY;
}

/** The rows of one kind that came into view and went out of it. */
interface ChangedRows {
    readonly entered: Uint32Array;
    readonly left: Uint32Array;
}

/** Collects changed rows: entered ones from the front, left ones from the back. */
class RowDiff {
    private readonly list: Uint32Array;
    private entered = 0;
    private left: number;

    /**
     * Room for every row that can change.
     * @param count - How many that is.
     */
    constructor(count: number) {
        this.list = new Uint32Array(count);
        this.left = count;
    }

    /**
     * Note one changed row.
     * @param row - The row.
     * @param now - Its byte now.
     */
    note(row: number, now: number): void {
        if (now === 1) {
            this.list[this.entered++] = row;
        } else {
            this.list[--this.left] = row;
        }
    }

    /**
     * Write a row's byte, noting the row when it changed.
     * @param bytes - The mask's bytes.
     * @param row - The row.
     * @param now - Its byte now.
     */
    write(bytes: U8, row: number, now: number): void {
        if (now !== bytes[row]) {
            bytes[row] = now;
            this.note(row, now);
        }
    }

    /**
     * The rows noted.
     * @returns Both lists.
     */
    rows(): ChangedRows {
        return { entered: this.list.slice(0, this.entered), left: this.list.slice(this.left) };
    }
}

/**
 * The most changed rows a mask keeps for a reader.
 * @param graph - The snapshot.
 * @returns The cap.
 */
function rowsKept(graph: GraphSnapshot): number {
    return (graph.nodeCount + graph.edgeCount) / ROW_LIST_SHARE;
}

/**
 * A copy of the rows a move found, for the masks to keep with their recent moves.
 * @param rows - The rows.
 * @returns The same rows.
 */
function typedRows(rows: MovedRows): ChangedRows {
    return { entered: rows.entered.view().slice(), left: rows.left.view().slice() };
}

/** No rows at all. */
const NO_ROWS: ChangedRows = { entered: new Uint32Array(0), left: new Uint32Array(0) };

/**
 * Write every node in one flat loop.
 * @param state - The slide.
 * @param bytes - The node mask's bytes.
 * @param count - How many nodes.
 * @returns The nodes that came and went.
 */
function rewriteNodes(state: SlideState, bytes: U8, count: number): ChangedRows {
    const { filterNodes, node, endCount } = state;
    const inside = node?.inside ?? null;
    const diff = new RowDiff(count);
    for (let row = 0; row < count; row++) {
        const passes =
            (filterNodes === null || filterNodes[row] === 1) &&
            (inside === null || inside[row] === 1) &&
            (endCount === null || endCount[row] > 0);
        const shows = passes ? 1 : 0;
        if (shows !== bytes[row]) {
            bytes[row] = shows;
            diff.note(row, shows);
        }
    }

    return diff.rows();
}

/**
 * Write a stretch of edges in one flat loop. A row in two stretches finds nothing left to change.
 * @param state - The slide.
 * @param graph - The snapshot.
 * @param nodeBytes - The node mask's bytes, already written.
 * @param bytes - The edge mask's bytes.
 * @param perm - The rows in the stretch's order, or null when the stretch is of rows themselves.
 * @param stretch - The stretch's first position, and one past its last.
 * @param diff - Takes the edges that came and went.
 */
function rewriteEdges(
    state: SlideState,
    graph: GraphSnapshot,
    nodeBytes: U8,
    bytes: U8,
    perm: Uint32Array | null,
    stretch: readonly number[],
    diff: RowDiff,
): void {
    const [start, end] = stretch;
    slideCounters.rewritten += end - start;
    const { src, dst } = graph.edgeList();
    const { filterEdges } = state;
    const inside = state.edge?.inside ?? null;
    for (let at = start; at < end; at++) {
        const row = perm === null ? at : perm[at];
        // All four read, with no branch between them: which rows pass is random.
        const shows =
            (inside === null ? 1 : inside[row]) &
            (filterEdges === null ? 1 : filterEdges[row]) &
            nodeBytes[src[row]] &
            nodeBytes[dst[row]];
        if (shows !== bytes[row]) {
            bytes[row] = shows;
            diff.note(row, shows);
        }
    }
}

/**
 * Write the edges a move between two stretches of a kind of instants' index can have changed, when
 * every edge that can show lies in the window's stretch. Each is placed by its position: one only in
 * the old stretch is outside now, so it goes if it showed; one only in the new stretch was outside
 * before, so it did not show and comes in when it passes now. Only an edge in both needs its old
 * byte read before its ends say whether it passes.
 * @param state - The slide, whose edges are a kind of instants, already at the new place.
 * @param graph - The snapshot.
 * @param nodeBytes - The node mask's bytes, already written.
 * @param bytes - The edge mask's bytes.
 * @param stretches - The old window's stretch and the new one's.
 * @param diff - Takes the edges that came and went.
 */
function rewriteStretches(
    state: SlideState,
    graph: GraphSnapshot,
    nodeBytes: U8,
    bytes: U8,
    stretches: readonly (readonly [number, number])[],
    diff: RowDiff,
): void {
    const [was, now] = stretches;
    const { perm } = (state.edge as KindState).index;
    const { src, dst } = endsInOrder(graph, perm);
    const { filterEdges } = state;
    slideCounters.rewritten += was[1] - was[0] + now[1] - now[0];
    for (let at = was[0]; at < was[1]; at++) {
        if (within(at, now[0], now[1]) === 0) {
            diff.write(bytes, perm[at], 0);
        }
    }

    for (let at = now[0]; at < now[1]; at++) {
        const ends = nodeBytes[src[at]] & nodeBytes[dst[at]];
        if ((ends | within(at, was[0], was[1])) === 1) {
            diff.write(bytes, perm[at], ends & filterByte(filterEdges, perm[at]));
        }
    }
}

/**
 * Write only what a jump can have changed, when that is little enough: the edges that crossed, read
 * in row order so no dearer than a flat pass over them, and the edges of nodes that came or went.
 * @param state - The slide.
 * @param graph - The snapshot.
 * @param nodeBytes - The node mask's bytes, already written.
 * @param bytes - The edge mask's bytes.
 * @param crossed - The edges that crossed, ascending.
 * @param moved - The nodes that came and went.
 * @returns The edges that came and went, or null when the moved nodes hold too many edges to walk.
 */
function rewriteCrossed(
    state: SlideState,
    graph: GraphSnapshot,
    nodeBytes: U8,
    bytes: U8,
    crossed: Uint32Array,
    moved: ChangedRows,
): ChangedRows | null {
    const directions: readonly Arcs[] = graph.directed ? [graph, graph.reverse()] : [graph];
    const nodes = [...moved.entered, ...moved.left];
    const degrees = degreesOf(directions, nodes);
    if (degrees > Math.max(MIN_BUDGET, (graph.nodeCount + graph.edgeCount) / BUDGET_SHARE)) {
        return null;
    }

    const diff = new RowDiff(crossed.length + degrees);
    rewriteEdges(state, graph, nodeBytes, bytes, crossed, [0, crossed.length], diff);
    const walked = movedRows();
    for (const arcs of directions) {
        walkArcs(state, nodeBytes, bytes, arcs, nodes, walked);
    }

    for (const row of walked.entered.view()) {
        diff.note(row, 1);
    }

    for (const row of walked.left.view()) {
        diff.note(row, 0);
    }

    return diff.rows();
}

/**
 * A move's counts from the rows it changed.
 * @param n - The nodes.
 * @param e - The edges.
 * @returns The counts.
 */
function countsOf(n: ChangedRows, e: ChangedRows): SlideCounts {
    return {
        entered: { nodes: n.entered.length, edges: e.entered.length },
        left: { nodes: n.left.length, edges: e.left.length },
        rows: { enteredNodes: n.entered, leftNodes: n.left, enteredEdges: e.entered, leftEdges: e.left },
    };
}

/**
 * Whether what a slide kept still describes the masks, the filter and the field.
 * @param state - What the last move left.
 * @param target - The masks and what they are read from.
 * @param window - The window to show.
 * @returns True when the next move can step from it.
 */
function holdsFor(state: SlideState, target: SlideTarget, window: TimeWindow): boolean {
    return (
        state.graph === target.graph &&
        state.filter.length === target.filter.length &&
        state.filter.every((part, at) => part === target.filter[at]) &&
        state.attribute === window.attribute &&
        state.missingInside === (window.missing !== "outside") &&
        state.ends === (window.nodes === "ends") &&
        state.nodeIndex === (target.instants?.node ?? null) &&
        state.edgeIndex === (target.instants?.edge ?? null) &&
        state.nodeVersion === target.nodes.version &&
        state.edgeVersion === target.edges.version
    );
}

/**
 * What the next moves step from, with the window in place.
 * @param target - The masks and what they are read from.
 * @param window - The window.
 * @returns The state, or null when an index alone cannot say what the window keeps.
 */
export function slideState(target: SlideTarget, window: TimeWindow): SlideState | null {
    const { graph, nodes, edges } = target;
    const [from, to] = target.bounds(window);
    const missingInside = window.missing !== "outside";
    const kindOf = (instants: TimeInstants | null, count: number): KindState | null | undefined => {
        if (instants === null || instants.timed === 0) {
            return null;
        }

        if (!isSlidable(instants)) {
            return undefined;
        }

        const kind = {
            index: instants,
            inside: new Uint8Array(count),
            overlaps: instants.spans === null ? null : new Int32Array(count),
            scanned: null,
            lo: 0,
            hi: 0,
            from,
            to,
        };
        placeWindow(kind, from, to, missingInside);
        return kind;
    };
    const node = kindOf(target.instants?.node ?? null, graph.nodeCount);
    const edge = kindOf(target.instants?.edge ?? null, graph.edgeCount);
    if (node === undefined || edge === undefined || target.instants === null || target.readsRecords(window)) {
        return null;
    }

    const filter = target.filterBytes();
    const ends = window.nodes === "ends";
    if (edge !== null && edge.index.spans === null) {
        // Built here, with the full pass, rather than on the first move a play times.
        endsInOrder(graph, edge.index.perm);
    }

    return {
        graph,
        filter: target.filter,
        attribute: window.attribute,
        missingInside,
        ends,
        filterNodes: filter.nodes,
        filterEdges: filter.edges,
        node,
        edge,
        nodeIndex: target.instants.node,
        edgeIndex: target.instants.edge,
        endCount: ends ? countEnds(graph, edge, missingInside, filter.edges) : null,
        marks: new Uint8Array(graph.nodeCount),
        nodeVersion: nodes.version,
        edgeVersion: edges.version,
    };
}

/**
 * How many edges the new window's stretch of the index holds, when that is every edge that can show.
 * @param state - The slide.
 * @param graph - The snapshot.
 * @param together - Whether the edges cross as they are written, so they have not moved yet.
 * @param from - The new window's start.
 * @param to - Its end.
 * @returns The rows; infinite when other edges can show too.
 */
function edgesInWindow(state: SlideState, graph: GraphSnapshot, together: boolean, from: number, to: number): number {
    const rows = windowRows(state, graph);
    const index = state.edge?.index;
    return together && index !== undefined && rows !== Number.POSITIVE_INFINITY
        ? lowerBound(index.sorted, to) - lowerBound(index.sorted, from)
        : rows;
}

/**
 * Bring the edges of the nodes a move changed up to date: by a scan of the window's edges, or by
 * walking the nodes' arcs.
 * @param state - The slide.
 * @param graph - The snapshot.
 * @param nodeBytes - The node mask's bytes, already written.
 * @param bytes - The edge mask's bytes.
 * @param how - The nodes that came and went, whether to scan, and the graph's directions.
 * @param how.changed - The nodes that came and went.
 * @param how.scan - Whether to scan the window rather than walk.
 * @param how.directions - The graph's directions.
 * @param moved - Takes the edges that came and went.
 */
function followNodes(
    state: SlideState,
    graph: GraphSnapshot,
    nodeBytes: U8,
    bytes: U8,
    how: { readonly changed: MovedRows; readonly scan: boolean; readonly directions: readonly Arcs[] },
    moved: MovedRows,
): void {
    const { changed, scan, directions } = how;
    if (scan) {
        slideCounters.scans++;
        scanWindow(state, graph, nodeBytes, bytes, changed, moved);
        return;
    }

    for (const arcs of directions) {
        walkArcs(state, nodeBytes, bytes, arcs, changed.entered.view(), moved);
        walkArcs(state, nodeBytes, bytes, arcs, changed.left.view(), moved);
    }
}

/**
 * Moves a time window through the visibility masks a frame at a time.
 */
export class WindowSlider {
    private state: SlideState | null = null;
    /** The lists a small move collects its rows in, kept between moves. */
    private readonly lists = { changing: new RowList(), nodeRows: movedRows(), edgeRows: movedRows() };

    /** Forget what the last slide held, so the next move starts with a full pass. */
    reset(): void {
        this.state = null;
    }

    /**
     * Move the window, writing only the rows that change.
     * @param target - The masks and what they are read from.
     * @param window - The window to show.
     * @returns What came into view and went out of it.
     */
    move(target: SlideTarget, window: TimeWindow): SlideCounts {
        const { state } = this;
        return state !== null && holdsFor(state, target, window)
            ? this.step(target, state, window)
            : this.rebuild(target, window);
    }

    /**
     * A full pass, then the state the next moves step from.
     * @param target - The masks and what they are read from.
     * @param window - The window.
     * @returns The counts against the masks before the pass.
     */
    private rebuild(target: SlideTarget, window: TimeWindow): SlideCounts {
        const { nodes, edges } = target;
        const wasNodes = nodes.bytes();
        const wasEdges = edges.bytes();
        target.evaluate(window);
        const counts = diffCounts(wasNodes, nodes.bytes(), wasEdges, edges.bytes());
        // Null for a kind whose records the window reads: every move is a full pass.
        this.state = slideState(target, window);

        return counts;
    }

    /**
     * A move too far to walk: every row of the old window out and the new one's in, then the masks.
     * @param target - The masks.
     * @param state - What the last move left.
     * @param from - The window's start.
     * @param to - The window's end.
     * @returns The counts.
     */
    private jump(target: SlideTarget, state: SlideState, from: number, to: number): SlideCounts {
        const { graph } = target;
        const { node, edge } = state;
        const edgeWas = stretchOf(edge);
        const nodeSpans = node?.index.spans ?? null;
        const edgeSpans = edge?.index.spans ?? null;
        let crossed: Uint32Array | null = null;
        if (node !== null && nodeSpans !== null) {
            jumpSpans(node, nodeSpans, from, to);
        } else if (node !== null) {
            markRows(node, node.lo, node.hi, 0);
            node.lo = lowerBound(node.index.sorted, from);
            node.hi = lowerBound(node.index.sorted, to);
            markRows(node, node.lo, node.hi, 1);
        }

        if (edge !== null && edgeSpans !== null) {
            crossed = jumpSpans(edge, edgeSpans, from, to);
            countCrossed(graph, state, crossed, []);
        } else if (edge !== null) {
            markRows(edge, edge.lo, edge.hi, 0);
            shiftEnds(graph, state, edge, -1);
            edge.lo = lowerBound(edge.index.sorted, from);
            edge.hi = lowerBound(edge.index.sorted, to);
            markRows(edge, edge.lo, edge.hi, 1);
            shiftEnds(graph, state, edge, 1);
        }

        return this.rewrite(target, state, edgeWas, crossed);
    }

    /**
     * Both masks rewritten in flat loops from a slide already at its new place, with no closure per
     * element. Every edge that can show lies in the window's stretch of the index, so the stretches
     * of the old window and the new are every edge that can change; when those are many, reading
     * the rows in order costs less than following the index.
     * @param target - The masks.
     * @param state - What the move left.
     * @param edgeWas - The old window's stretch of the edges.
     * @param crossed - The edges a scan found crossing, when one ran.
     * @returns The counts.
     */
    private rewrite(
        target: SlideTarget,
        state: SlideState,
        edgeWas: readonly [number, number],
        crossed: Uint32Array | null = null,
    ): SlideCounts {
        const { graph, nodes, edges } = target;
        const { edge } = state;
        slideCounters.jumps++;
        const [was, now] = [edgeWas, stretchOf(edge)];
        const room = was[1] - was[0] + now[1] - now[0];
        const scans = windowRows(state, graph) !== Number.POSITIVE_INFINITY && room < graph.edgeCount / STRETCH_SHARE;
        let e = NO_ROWS;
        const keep = rowsKept(graph);
        const n = nodes.rewrite((nodeBytes) => {
            const moved = rewriteNodes(state, nodeBytes, graph.nodeCount);
            e = edges.rewrite((edgeBytes) => {
                const walked =
                    crossed === null ? null : rewriteCrossed(state, graph, nodeBytes, edgeBytes, crossed, moved);
                if (walked !== null) {
                    return walked;
                }

                const diff = new RowDiff(scans ? room : graph.edgeCount);
                if (scans) {
                    rewriteStretches(state, graph, nodeBytes, edgeBytes, [was, now], diff);
                } else {
                    rewriteEdges(state, graph, nodeBytes, edgeBytes, null, [0, graph.edgeCount], diff);
                }

                return diff.rows();
            }, keep);

            return moved;
        }, keep);
        state.nodeVersion = nodes.version;
        state.edgeVersion = edges.version;

        return countsOf(n, e);
    }

    /**
     * The nodes a move changes, from the lists of those that may, each kept in a list of its own
     * that the move's other lists are cleared with. A row can repeat: the second visit finds nothing
     * left to change. A play moves every frame, so the lists are kept and walked by index.
     * @param state - The slide.
     * @param nodes - The node mask.
     * @param dirty - The nodes that may have changed.
     * @returns The nodes that change.
     */
    private changingNodes(
        state: SlideState,
        nodes: ElementMask<NodeId>,
        dirty: readonly ArrayLike<number>[],
    ): Uint32Array {
        const { changing, nodeRows, edgeRows } = this.lists;
        for (const list of [changing, nodeRows.entered, nodeRows.left, edgeRows.entered, edgeRows.left]) {
            list.clear();
        }

        for (const rows of dirty) {
            for (let at = 0; at < rows.length; at++) {
                if (nodeShows(state, rows[at]) !== nodes.has(rows[at])) {
                    changing.push(rows[at]);
                }
            }
        }

        return changing.view();
    }

    /**
     * One move: row by row, or flat loops when walking would cost more than the budget.
     * @param target - The masks.
     * @param state - What the last move left.
     * @param window - The window.
     * @returns The counts.
     */
    private step(target: SlideTarget, state: SlideState, window: TimeWindow): SlideCounts {
        const { graph, nodes, edges } = target;
        const [from, to] = target.bounds(window);
        const budget = Math.max(MIN_BUDGET, (graph.nodeCount + graph.edgeCount) / BUDGET_SHARE);
        const edgeWas = stretchOf(state.edge);
        const nodeWas = stretchOf(state.node);
        const stretches =
            holdsSpans(state.edge) || holdsSpans(state.node) ? 0 : edgeWas[1] - edgeWas[0] + nodeWas[1] - nodeWas[0];
        const distance = distanceTo(state.edge, from, to) + distanceTo(state.node, from, to);
        // A move inside the window's own length costs less walked than the window does redone.
        // Spans have no such stretch: a jump reads the spans near either window from their buckets.
        if (distance > Math.max(budget, 2 * stretches)) {
            return this.jump(target, state, from, to);
        }

        // Edges of instants that no node count follows cross in the pass that writes them.
        const together = state.edge !== null && !holdsSpans(state.edge) && state.endCount === null;
        const edgeRows = together ? NO_ROWS.left : crossRows(state.edge, from, to);
        const crossedNodes = crossRows(state.node, from, to);
        const woken: number[] = [];
        countCrossed(graph, state, edgeRows, woken);

        const changing = this.changingNodes(state, nodes, [crossedNodes, woken]);
        const { nodeRows, edgeRows: rows } = this.lists;
        const directions: readonly Arcs[] = graph.directed ? [graph, graph.reverse()] : [graph];
        const inWindow = edgesInWindow(state, graph, together, from, to);
        // Past the cost of scanning the window, the degrees' exact sum changes nothing.
        const degrees = degreesOf(directions, changing, inWindow / WALK_SHARE);
        const crossing = together ? distanceTo(state.edge, from, to) : edgeRows.length;
        const work = crossing + Math.min(degrees, inWindow / WALK_SHARE);
        if (work > budget) {
            if (together) {
                crossRows(state.edge, from, to);
            }

            return this.rewrite(target, state, edgeWas);
        }

        // A node that came or went takes its edges with it: the node's, or the window's when there
        // are fewer of those.
        const scan = inWindow < degrees * WALK_SHARE && state.edge !== null ? state.edge : null;
        const keep = rowsKept(graph);
        let e = NO_ROWS;
        const n = nodes.rewrite((nodeBytes) => {
            const changed = moveNodes(state, nodeBytes, changing, nodeRows);
            e = edges.rewrite((bytes) => {
                if (together) {
                    crossEdges(state, graph, nodeBytes, bytes, [from, to], rows);
                } else {
                    retestEdges(state, graph, nodeBytes, bytes, edgeRows, rows);
                }

                followNodes(state, graph, nodeBytes, bytes, { changed, scan: scan !== null, directions }, rows);
                return typedRows(rows);
            }, keep);

            return typedRows(changed);
        }, keep);

        state.nodeVersion = nodes.version;
        state.edgeVersion = edges.version;

        return countsOf(n, e);
    }
}

/**
 * What changed between two pairs of masks.
 * @param wasNodes - The node mask before.
 * @param nowNodes - The node mask after.
 * @param wasEdges - The edge mask before.
 * @param nowEdges - The edge mask after.
 * @returns The counts.
 */
export function diffCounts(
    wasNodes: Uint8Array,
    nowNodes: Uint8Array,
    wasEdges: Uint8Array,
    nowEdges: Uint8Array,
): SlideCounts {
    const diff = (was: Uint8Array, now: Uint8Array): ChangedRows => {
        const rows = new RowDiff(now.length);
        for (let row = 0; row < now.length; row++) {
            if (was[row] !== now[row] && (now[row] === 1 || was[row] === 1)) {
                rows.note(row, now[row]);
            }
        }

        return rows.rows();
    };

    return countsOf(diff(wasNodes, nowNodes), diff(wasEdges, nowEdges));
}
