/**
 * The time window moved through the visibility masks without a full pass: what every `session.time`
 * move does (design/data/timeline-attribute.md section 5.3). A move finds the rows that crossed
 * either edge of the window from the designated field's sorted index (two binary searches per
 * kind). A small move re-tests only those rows, the nodes whose counts they moved, and those nodes'
 * edges; a move over budget (changed edges plus the summed degree of changed nodes, past a share of
 * the graph) rewrites both masks in flat loops over typed arrays. The filter's own tests are read
 * once, as bytes, so a frame never compiles or walks a closure.
 *
 * The result is exactly what a full pass over the filter AND the window writes (the rule of design
 * section 2.4, as `compileWindow` and `runPass` write it): a node shows when it passes the filter,
 * its own time (when nodes are timed) and, for `nodes: "ends"`, has an edge passing the filter and
 * the window; an edge shows when both its ends show and it passes the filter and the window. A full
 * pass is left for starting a slide, for a kind whose records the window reads (timed by a column
 * the index does not hold, or holding the column though the field does not time it), and for masks
 * someone else rewrote since the last move.
 */

import type { GraphSnapshot, U8 } from "@graphty/graph-format";

import type { EdgeId, NodeId } from "../../catalog/types";
import type { ElementMask } from "../scope/ElementMask";
import { lowerBound } from "../time/timeIndex";
import type { TimeInstants, TimeWindow } from "./filter";

/**
 * The share of the graph a move walks row by row before flat loops cost less: a row walked costs
 * about as much as thirty read in order.
 */
const BUDGET_SHARE = 32;

/** The rows a move may always walk: under this, flat loops have nothing to win. */
const MIN_BUDGET = 32;

/** Work done by slides, for a test that counts it rather than times it. */
export const slideCounters = {
    /** Full passes, however they were reached. */
    full: 0,
    /** Moves that rewrote the masks in flat loops. */
    jumps: 0,
    /** Rows a small move visited, one by one as it visits them. */
    rows: 0,
    /** Small moves that scanned the window's edges rather than a moved node's. */
    scans: 0,
};

/** What one kind's index holds for a slide: the instants per row, and their sorted order. */
export interface SlideInstants extends TimeInstants {
    /** The finite instants, ascending. */
    readonly sorted: Float64Array;
    /** The row of each sorted instant. */
    readonly perm: Uint32Array;
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
    /** The rows that changed, for `time.changes()`. */
    readonly rows: {
        readonly enteredNodes: ArrayLike<number>;
        readonly leftNodes: ArrayLike<number>;
        readonly enteredEdges: ArrayLike<number>;
        readonly leftEdges: ArrayLike<number>;
    };
}

/** One kind's place in its sorted index. */
interface KindState {
    readonly index: SlideInstants;
    /** Whether each row is inside the window (an untimed row by the `missing` rule). */
    readonly inside: Uint8Array;
    /** The window's first and one-past-last sorted positions. */
    lo: number;
    hi: number;
}

/** One direction of the graph's adjacency. */
type Arcs = Pick<GraphSnapshot, "rowPtr" | "colIdx" | "arcToEdge">;

/** The rows of one kind a small move took in and out of view. */
interface MovedRows {
    readonly entered: number[];
    readonly left: number[];
}

/** Everything a slide keeps between moves. */
interface SlideState {
    readonly graph: GraphSnapshot;
    readonly filter: readonly unknown[];
    readonly attribute: string;
    readonly missingInside: boolean;
    readonly ends: boolean;
    readonly filterNodes: Uint8Array | null;
    readonly filterEdges: Uint8Array | null;
    readonly node: KindState | null;
    readonly edge: KindState | null;
    /** Per node, how many incident edges pass the filter and the window (`nodes: "ends"` only). */
    readonly endCount: Int32Array | null;
    nodeVersion: number;
    edgeVersion: number;
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
    const { rows, sorted } = index;
    const missing = missingInside ? 1 : 0;
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
 * Count, per node, the incident edges that pass the filter and the window.
 * @param graph - The snapshot.
 * @param edge - The edges' place in the window.
 * @param filterEdges - The filter's edge bytes.
 * @param endCount - The counts, written from zero.
 */
function countEnds(graph: GraphSnapshot, edge: KindState, filterEdges: Uint8Array | null, endCount: Int32Array): void {
    const { src, dst } = graph.edgeList();
    const { inside } = edge;
    endCount.fill(0);
    for (let row = 0; row < inside.length; row++) {
        if (inside[row] === 1 && (filterEdges === null || filterEdges[row] === 1)) {
            endCount[src[row]]++;
            endCount[dst[row]]++;
        }
    }
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
function edgePasses(state: SlideState, row: number): boolean {
    return (
        (state.edge === null || state.edge.inside[row] === 1) &&
        (state.filterEdges === null || state.filterEdges[row] === 1)
    );
}

/**
 * Where a kind's window sits in its index.
 * @param kind - The kind, or null.
 * @returns The first sorted position and one past the last.
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
        : Math.abs(lowerBound(kind.index.sorted, from) - kind.lo) +
              Math.abs(lowerBound(kind.index.sorted, to) - kind.hi);
}

/**
 * Move a kind to a window, one row at a time.
 * @param kind - The kind, or null.
 * @param from - The window's start.
 * @param to - The window's end.
 * @returns The rows that crossed in or out.
 */
function crossRows(kind: KindState | null, from: number, to: number): number[] {
    const out: number[] = [];
    if (kind === null) {
        return out;
    }

    const { inside, index } = kind;
    const { perm, sorted } = index;
    const lo = lowerBound(sorted, from);
    const hi = lowerBound(sorted, to);
    for (const [start, end] of [
        [Math.min(lo, kind.lo), Math.max(lo, kind.lo)],
        [Math.min(hi, kind.hi), Math.max(hi, kind.hi)],
    ]) {
        for (let at = start; at < end; at++) {
            const row = perm[at];
            const now = at >= lo && at < hi ? 1 : 0;
            slideCounters.rows++;
            if (inside[row] !== now) {
                inside[row] = now;
                out.push(row);
            }
        }
    }

    kind.lo = lo;
    kind.hi = hi;
    return out;
}

/**
 * Move the nodes' counts by the edges that crossed, and note the nodes a count woke or put out.
 * @param graph - The snapshot.
 * @param state - The slide.
 * @param edgeRows - The edges that crossed.
 * @param dirtyNodes - Takes the nodes.
 */
function countCrossed(
    graph: GraphSnapshot,
    state: SlideState,
    edgeRows: readonly number[],
    dirtyNodes: number[],
): void {
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
            dirtyNodes.push(end);
        }
    };
    for (const row of edgeRows) {
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
 * @returns Their summed degree.
 */
function degreesOf(directions: readonly Arcs[], rows: readonly number[]): number {
    let degrees = 0;
    for (const { rowPtr } of directions) {
        for (const row of rows) {
            degrees += rowPtr[row + 1] - rowPtr[row];
        }
    }

    return degrees;
}

/**
 * Write the nodes that changed. A row can repeat: the second visit finds nothing left to change.
 * @param state - The slide.
 * @param bytes - The node mask's bytes.
 * @param rows - The nodes.
 * @returns The nodes that came and went.
 */
function moveNodes(state: SlideState, bytes: U8, rows: readonly number[]): MovedRows {
    const moved: MovedRows = { entered: [], left: [] };
    for (const row of rows) {
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
 * @param target - The masks.
 * @param bytes - The edge mask's bytes.
 * @param rows - The edges.
 * @returns The edges that came and went.
 */
function retestEdges(state: SlideState, target: SlideTarget, bytes: U8, rows: readonly number[]): MovedRows {
    const { graph, nodes } = target;
    const { src, dst } = graph.edgeList();
    const moved: MovedRows = { entered: [], left: [] };
    slideCounters.rows += rows.length;
    for (const row of rows) {
        const shows = edgePasses(state, row) && nodes.has(src[row]) && nodes.has(dst[row]) ? 1 : 0;
        if (shows !== bytes[row]) {
            bytes[row] = shows;
            (shows === 1 ? moved.entered : moved.left).push(row);
        }
    }

    return moved;
}

/**
 * Bring moved nodes' edges up to date, from one direction of the graph. The arc names the other
 * end, so this reads no endpoint list. An edge failing its own tests needs no look: if it showed,
 * it crossed the window and was re-tested already.
 * @param state - The slide.
 * @param nodes - The node mask.
 * @param bytes - The edge mask's bytes.
 * @param arcs - That direction of the graph.
 * @param rows - The nodes.
 * @param moved - Takes the edges that came and went.
 */
function walkArcs(
    state: SlideState,
    nodes: ElementMask<NodeId>,
    bytes: U8,
    arcs: Arcs,
    rows: readonly number[],
    moved: MovedRows,
): void {
    const { rowPtr, colIdx, arcToEdge } = arcs;
    for (const row of rows) {
        const shown = nodes.has(row);
        const end = rowPtr[row + 1];
        slideCounters.rows += end - rowPtr[row];
        for (let arc = rowPtr[row]; arc < end; arc++) {
            const edge = arcToEdge[arc];
            if (!shown) {
                if (bytes[edge] === 1) {
                    bytes[edge] = 0;
                    moved.left.push(edge);
                }
            } else if (bytes[edge] === 0 && edgePasses(state, edge) && nodes.has(colIdx[arc])) {
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
function windowRows(state: SlideState, graph: GraphSnapshot): number {
    const { edge, missingInside } = state;
    return edge !== null && (!missingInside || edge.index.timed === graph.edgeCount)
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
     * The rows noted.
     * @returns Both lists.
     */
    rows(): ChangedRows {
        return { entered: this.list.slice(0, this.entered), left: this.list.slice(this.left) };
    }
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
    const { src, dst } = graph.edgeList();
    const { filterEdges } = state;
    const inside = state.edge?.inside ?? null;
    for (let at = start; at < end; at++) {
        const row = perm === null ? at : perm[at];
        const passes =
            (inside === null || inside[row] === 1) &&
            (filterEdges === null || filterEdges[row] === 1) &&
            nodeBytes[src[row]] === 1 &&
            nodeBytes[dst[row]] === 1;
        const shows = passes ? 1 : 0;
        if (shows !== bytes[row]) {
            bytes[row] = shows;
            diff.note(row, shows);
        }
    }
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
 * Moves a time window through the visibility masks a frame at a time.
 */
export class WindowSlider {
    private state: SlideState | null = null;

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
        if (
            state?.graph !== target.graph ||
            state.filter.length !== target.filter.length ||
            state.filter.some((part, at) => part !== target.filter[at]) ||
            state.attribute !== window.attribute ||
            state.missingInside !== (window.missing !== "outside") ||
            state.ends !== (window.nodes === "ends") ||
            state.nodeVersion !== target.nodes.version ||
            state.edgeVersion !== target.edges.version
        ) {
            return this.rebuild(target, window);
        }

        return this.step(target, state, window);
    }

    /**
     * A full pass, then the state the next moves step from.
     * @param target - The masks and what they are read from.
     * @param window - The window.
     * @returns The counts against the masks before the pass.
     */
    private rebuild(target: SlideTarget, window: TimeWindow): SlideCounts {
        const { graph, nodes, edges } = target;
        const wasNodes = nodes.bytes();
        const wasEdges = edges.bytes();
        target.evaluate(window);
        this.state = null;

        const [from, to] = target.bounds(window);
        const missingInside = window.missing !== "outside";
        const kindOf = (instants: TimeInstants | null, count: number): KindState | null | undefined => {
            if (instants === null || instants.timed === 0) {
                return null;
            }

            if (!isSlidable(instants)) {
                return undefined;
            }

            const kind = { index: instants, inside: new Uint8Array(count), lo: 0, hi: 0 };
            placeWindow(kind, from, to, missingInside);
            return kind;
        };
        const node = kindOf(target.instants?.node ?? null, graph.nodeCount);
        const edge = kindOf(target.instants?.edge ?? null, graph.edgeCount);
        const counts = diffCounts(wasNodes, nodes.bytes(), wasEdges, edges.bytes());
        if (node === undefined || edge === undefined || target.instants === null || target.readsRecords(window)) {
            // A kind whose records the window reads: every move is a full pass.
            return counts;
        }

        const filter = target.filterBytes();
        let endCount: Int32Array | null = null;
        if (window.nodes === "ends" && edge !== null) {
            endCount = new Int32Array(graph.nodeCount);
            countEnds(graph, edge, filter.edges, endCount);
        }

        this.state = {
            graph,
            filter: target.filter,
            attribute: window.attribute,
            missingInside,
            ends: window.nodes === "ends",
            filterNodes: filter.nodes,
            filterEdges: filter.edges,
            node,
            edge,
            endCount,
            nodeVersion: nodes.version,
            edgeVersion: edges.version,
        };

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
        if (node !== null) {
            markRows(node, node.lo, node.hi, 0);
            node.lo = lowerBound(node.index.sorted, from);
            node.hi = lowerBound(node.index.sorted, to);
            markRows(node, node.lo, node.hi, 1);
        }

        if (edge !== null) {
            markRows(edge, edge.lo, edge.hi, 0);
            shiftEnds(graph, state, edge, -1);
            edge.lo = lowerBound(edge.index.sorted, from);
            edge.hi = lowerBound(edge.index.sorted, to);
            markRows(edge, edge.lo, edge.hi, 1);
            shiftEnds(graph, state, edge, 1);
        }

        return this.rewrite(target, state, edgeWas);
    }

    /**
     * Both masks rewritten in flat loops from a slide already at its new place, with no closure per
     * element. Every edge that can show lies in the window's stretch of the index, so the stretches
     * of the old window and the new are every edge that can change; when those are many, reading
     * the rows in order costs less than following the index.
     * @param target - The masks.
     * @param state - What the move left.
     * @param edgeWas - The old window's stretch of the edges.
     * @returns The counts.
     */
    private rewrite(target: SlideTarget, state: SlideState, edgeWas: readonly [number, number]): SlideCounts {
        const { graph, nodes, edges } = target;
        const { edge } = state;
        slideCounters.jumps++;
        const [was, now] = [edgeWas, stretchOf(edge)];
        const room = was[1] - was[0] + now[1] - now[0];
        const scans = windowRows(state, graph) !== Number.POSITIVE_INFINITY && room < graph.edgeCount / 4;
        const perm = scans && edge !== null ? edge.index.perm : null;
        let e = NO_ROWS;
        const n = nodes.rewrite((nodeBytes) => {
            const moved = rewriteNodes(state, nodeBytes, graph.nodeCount);
            e = edges.rewrite((edgeBytes) => {
                const diff = new RowDiff(perm === null ? graph.edgeCount : room);
                for (const stretch of perm === null ? [[0, graph.edgeCount]] : [was, now]) {
                    rewriteEdges(state, graph, nodeBytes, edgeBytes, perm, stretch, diff);
                }

                return diff.rows();
            });

            return moved;
        });
        state.nodeVersion = nodes.version;
        state.edgeVersion = edges.version;

        return countsOf(n, e);
    }

    /**
     * One move: row by row, or a jump when that would cost more than an eighth of the graph.
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
        const stretches = edgeWas[1] - edgeWas[0] + nodeWas[1] - nodeWas[0];
        const distance = distanceTo(state.edge, from, to) + distanceTo(state.node, from, to);
        // A move inside the window's own length costs less walked than the window does redone.
        if (distance > Math.max(budget, 2 * stretches)) {
            return this.jump(target, state, from, to);
        }

        const edgeRows = crossRows(state.edge, from, to);
        const dirtyNodes = crossRows(state.node, from, to);
        countCrossed(graph, state, edgeRows, dirtyNodes);

        // A row can repeat in these lists: the second visit finds nothing left to change.
        const changing = dirtyNodes.filter((row) => nodeShows(state, row) !== nodes.has(row));
        const directions: readonly Arcs[] = graph.directed ? [graph, graph.reverse()] : [graph];
        const degrees = degreesOf(directions, changing);
        const inWindow = windowRows(state, graph);
        const work = edgeRows.length + Math.min(degrees, inWindow);
        if (work > budget) {
            return this.rewrite(target, state, edgeWas);
        }

        const moved = nodes.rewrite((bytes) => moveNodes(state, bytes, changing));

        // A node that came or went takes its edges with it: the node's, or the window's when there
        // are fewer of those.
        const scan = inWindow < degrees && state.edge !== null ? state.edge : null;
        if (scan !== null) {
            slideCounters.scans++;
            for (let at = scan.lo; at < scan.hi; at++) {
                edgeRows.push(scan.index.perm[at]);
            }
        }

        const rows = edges.rewrite((bytes) => {
            const changed = retestEdges(state, target, bytes, edgeRows);
            if (scan === null) {
                for (const arcs of directions) {
                    walkArcs(state, nodes, bytes, arcs, moved.entered, changed);
                    walkArcs(state, nodes, bytes, arcs, moved.left, changed);
                }
            }

            return changed;
        });

        state.nodeVersion = nodes.version;
        state.edgeVersion = edges.version;

        return {
            entered: { nodes: moved.entered.length, edges: rows.entered.length },
            left: { nodes: moved.left.length, edges: rows.left.length },
            rows: {
                enteredNodes: moved.entered,
                leftNodes: moved.left,
                enteredEdges: rows.entered,
                leftEdges: rows.left,
            },
        };
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
