/**
 * The time window moved by a sliver, written into the visibility masks one changed row at a time
 * (design/data/timeline-attribute.md section 5.3): what smooth playback and a dragged window do
 * every frame. A move finds the rows that crossed either edge of the window from the designated
 * field's sorted index (two binary searches per kind), and re-tests only those rows, the nodes
 * whose counts they moved, and those nodes' edges. The filter's own tests are read once, when a
 * slide starts, so a frame never compiles or walks the graph.
 *
 * The result is exactly what a full pass over the filter AND the window writes (the same rules as
 * `compileWindow` and `runPass`): a node shows when it passes the filter, its own time (when nodes
 * are timed) and, for `nodes: "ends"`, has an edge inside the window; an edge shows when both its
 * ends show and it passes the filter and the window. Anything this cannot follow -- a kind timed
 * by a column the index does not hold, a move that changes more than an eighth of the graph, or
 * masks someone else rewrote since the last move -- falls back to that full pass.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { EdgeId, NodeId } from "../../catalog/types";
import type { ElementMask } from "../scope/ElementMask";
import type { CompiledVisibility, TimeInstants, TimeWindow } from "./filter";

/** What one kind's index holds for a slide: the instants per row, and their sorted order. */
export interface SlideInstants extends TimeInstants {
    /** The finite instants, ascending. */
    readonly sorted: Float64Array;
    /** The row of each sorted instant. */
    readonly perm: Uint32Array;
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
    /** The filter's tests alone, without the window. */
    readonly compileFilter: () => CompiledVisibility;
    /** Write the masks from the filter and a window in one full pass. */
    readonly evaluate: (window: TimeWindow) => void;
    /** The designated field's index per kind, or null for a kind it does not time. */
    readonly instants: { readonly node: TimeInstants | null; readonly edge: TimeInstants | null } | null;
}

/** Elements that came into view and went out of it on one move. */
export interface SlideCounts {
    readonly entered: { readonly nodes: number; readonly edges: number };
    readonly left: { readonly nodes: number; readonly edges: number };
    /** The rows that changed, for `time.changes()`. */
    readonly rows: {
        readonly enteredNodes: readonly number[];
        readonly leftNodes: readonly number[];
        readonly enteredEdges: readonly number[];
        readonly leftEdges: readonly number[];
    };
    /** Whether this move fell back to a full pass. */
    readonly full: boolean;
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
    /** Per node, how many incident edges are inside the window (`nodes: "ends"` only). */
    readonly endCount: Int32Array | null;
    nodeVersion: number;
    edgeVersion: number;
}

/**
 * The first sorted position at or after a value.
 * @param sorted - Ascending values.
 * @param value - The value.
 * @returns The position.
 */
function lowerBound(sorted: Float64Array, value: number): number {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (sorted[mid] < value) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    return lo;
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
 * A window's numeric bounds.
 * @param window - The window.
 * @returns `[from, to)`.
 */
function boundsOf(window: TimeWindow): [number, number] {
    return [Number(window.from), Number(window.to)];
}

/**
 * The test results of one kind, one byte per row, or null when nothing narrows it.
 * @param test - The compiled test.
 * @param count - How many rows.
 * @returns The bytes.
 */
function bytesOf(test: ((index: number) => boolean) | null, count: number): Uint8Array | null {
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

        return this.step(target, state, window) ?? this.rebuild(target, window);
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

        const [from, to] = boundsOf(window);
        const missingInside = window.missing !== "outside";
        const kindOf = (instants: TimeInstants | null, count: number): KindState | null | undefined => {
            if (instants === null || instants.timed === 0) {
                return null;
            }

            if (!isSlidable(instants)) {
                return undefined;
            }

            const inside = new Uint8Array(count);
            for (let row = 0; row < count; row++) {
                const at = instants.rows[row];
                const isInside = Number.isNaN(at) ? missingInside : at >= from && at < to;
                inside[row] = isInside ? 1 : 0;
            }

            return {
                index: instants,
                inside,
                lo: lowerBound(instants.sorted, from),
                hi: lowerBound(instants.sorted, to),
            };
        };
        const node = kindOf(target.instants?.node ?? null, graph.nodeCount);
        const edge = kindOf(target.instants?.edge ?? null, graph.edgeCount);
        const counts = diffCounts(wasNodes, nodes.bytes(), wasEdges, edges.bytes());
        if (node === undefined || edge === undefined || target.instants === null) {
            // A kind timed by a column the index does not hold: every move is a full pass.
            return counts;
        }

        const filter = target.compileFilter();
        const ends = window.nodes === "ends" && edge !== null;
        let endCount: Int32Array | null = null;
        if (ends) {
            endCount = new Int32Array(graph.nodeCount);
            const list = graph.edgeList();
            for (let row = 0; row < graph.edgeCount; row++) {
                if (edge.inside[row] === 1) {
                    endCount[list.src[row]]++;
                    endCount[list.dst[row]]++;
                }
            }
        }

        this.state = {
            graph,
            filter: target.filter,
            attribute: window.attribute,
            missingInside,
            ends: window.nodes === "ends",
            filterNodes: bytesOf(filter.node, graph.nodeCount),
            filterEdges: bytesOf(filter.edge, graph.edgeCount),
            node,
            edge,
            endCount,
            nodeVersion: nodes.version,
            edgeVersion: edges.version,
        };

        return counts;
    }

    /**
     * One incremental move.
     * @param target - The masks.
     * @param state - What the last move left.
     * @param window - The window.
     * @returns The counts, or null when the move is too large to follow row by row.
     */
    private step(target: SlideTarget, state: SlideState, window: TimeWindow): SlideCounts | null {
        const { graph, nodes, edges } = target;
        const [from, to] = boundsOf(window);
        const budget = (graph.nodeCount + graph.edgeCount) / 8;
        const crossed = (kind: KindState | null): number[] | null => {
            if (kind === null) {
                return [];
            }

            const lo = lowerBound(kind.index.sorted, from);
            const hi = lowerBound(kind.index.sorted, to);
            const out: number[] = [];
            const visit = (start: number, end: number): void => {
                for (let at = start; at < end; at++) {
                    const row = kind.index.perm[at];
                    const now = at >= lo && at < hi ? 1 : 0;
                    if (kind.inside[row] !== now) {
                        kind.inside[row] = now;
                        out.push(row);
                    }
                }
            };
            if (Math.abs(lo - kind.lo) + Math.abs(hi - kind.hi) > budget) {
                return null;
            }

            visit(Math.min(lo, kind.lo), Math.max(lo, kind.lo));
            visit(Math.min(hi, kind.hi), Math.max(hi, kind.hi));
            kind.lo = lo;
            kind.hi = hi;
            return out;
        };
        const edgeRows = crossed(state.edge);
        const nodeRows = edgeRows === null ? null : crossed(state.node);
        if (edgeRows === null || nodeRows === null) {
            return null;
        }

        const list = graph.edgeList();
        const dirtyNodes = new Set<number>(nodeRows);
        const dirtyEdges = new Set<number>(edgeRows);
        if (state.endCount !== null && state.edge !== null) {
            for (const row of edgeRows) {
                const delta = state.edge.inside[row] === 1 ? 1 : -1;
                for (const end of [list.src[row], list.dst[row]]) {
                    const before = state.endCount[end];
                    state.endCount[end] = before + delta;
                    if (before > 0 !== before + delta > 0) {
                        dirtyNodes.add(end);
                    }
                }
            }
        }

        const enteredNodes: number[] = [];
        const leftNodes: number[] = [];
        const nodeShows = (row: number): boolean =>
            (state.filterNodes === null || state.filterNodes[row] === 1) &&
            (state.node === null || state.node.inside[row] === 1) &&
            (state.endCount === null || state.endCount[row] > 0);
        for (const row of dirtyNodes) {
            const shows = nodeShows(row);
            if (shows === nodes.has(row)) {
                continue;
            }

            if (shows) {
                nodes.add(row);
                enteredNodes.push(row);
            } else {
                nodes.delete(row);
                leftNodes.push(row);
            }

            // A node that came or went takes its edges with it.
            for (let arc = graph.rowPtr[row]; arc < graph.rowPtr[row + 1]; arc++) {
                dirtyEdges.add(graph.arcToEdge[arc]);
            }

            if (graph.directed) {
                const reverse = graph.reverse();
                for (let arc = reverse.rowPtr[row]; arc < reverse.rowPtr[row + 1]; arc++) {
                    dirtyEdges.add(reverse.arcToEdge[arc]);
                }
            }
        }

        const enteredEdges: number[] = [];
        const leftEdges: number[] = [];
        for (const row of dirtyEdges) {
            const shows =
                nodes.has(list.src[row]) &&
                nodes.has(list.dst[row]) &&
                (state.filterEdges === null || state.filterEdges[row] === 1) &&
                (state.edge === null || state.edge.inside[row] === 1);
            if (shows === edges.has(row)) {
                continue;
            }

            if (shows) {
                edges.add(row);
                enteredEdges.push(row);
            } else {
                edges.delete(row);
                leftEdges.push(row);
            }
        }

        state.nodeVersion = nodes.version;
        state.edgeVersion = edges.version;

        return {
            entered: { nodes: enteredNodes.length, edges: enteredEdges.length },
            left: { nodes: leftNodes.length, edges: leftEdges.length },
            rows: { enteredNodes, leftNodes, enteredEdges, leftEdges },
            full: false,
        };
    }
}

/**
 * What changed between two pairs of masks, for a move that ran a full pass.
 * @param wasNodes - The node mask before.
 * @param nowNodes - The node mask after.
 * @param wasEdges - The edge mask before.
 * @param nowEdges - The edge mask after.
 * @returns The counts.
 */
function diffCounts(
    wasNodes: Uint8Array,
    nowNodes: Uint8Array,
    wasEdges: Uint8Array,
    nowEdges: Uint8Array,
): SlideCounts {
    const diff = (was: Uint8Array, now: Uint8Array): { entered: number[]; left: number[] } => {
        const entered: number[] = [];
        const left: number[] = [];
        for (let row = 0; row < now.length; row++) {
            const then = row < was.length && was[row] === 1;
            if (now[row] === 1 && !then) {
                entered.push(row);
            } else if (now[row] !== 1 && then) {
                left.push(row);
            }
        }

        return { entered, left };
    };
    const n = diff(wasNodes, nowNodes);
    const e = diff(wasEdges, nowEdges);

    return {
        entered: { nodes: n.entered.length, edges: e.entered.length },
        left: { nodes: n.left.length, edges: e.left.length },
        rows: { enteredNodes: n.entered, leftNodes: n.left, enteredEdges: e.entered, leftEdges: e.left },
        full: true,
    };
}
