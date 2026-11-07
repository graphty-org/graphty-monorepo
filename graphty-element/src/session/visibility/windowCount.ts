/**
 * What each of a run of later and later windows shows, as counts alone: what `time.series` walks.
 * No mask is written and no list of rows is kept. Every timed row crosses each edge of the window
 * once in a series, so the whole walk reads each row twice and each timed node's edges twice.
 *
 * It rests on one fact of the window rule (design/data/timeline-attribute.md section 2.4): an edge
 * passing its own tests counts for both its ends, so under `nodes: "ends"` those ends always have an
 * edge. An edge therefore shows when it passes and both ends pass their own tests, and a node
 * running out of edges changes no edge's count.
 *
 * A move applies each row's change in one order so that `entered` and `left` compare windows with
 * no row counted that only passed through: nodes going out, edges coming in, edges going out, nodes
 * coming in. Edges coming in before edges going out keep a node's count above zero when one edge
 * replaces another, and nodes moving outermost keep an edge from showing for one half of a move.
 *
 * Sliding windows sit end to end, so when every edge that can show lies in the index, what showed
 * has all gone and what shows is all new. Such a move counts the window's edges once and never reads
 * a crossing node's edges, which on a hub-heavy graph is most of the walk.
 */

import { lowerBound } from "../time/timeIndex";
import type { TimeWindow } from "./filter";
import {
    type Arcs,
    edgePasses,
    type KindState,
    slideCounters,
    type SlideState,
    slideState,
    type SlideTarget,
    windowRows,
} from "./slide";

/** What one move counts. */
export interface WindowCount {
    readonly visible: Readonly<{ nodes: number; edges: number }>;
    readonly entered: Readonly<{ nodes: number; edges: number }>;
    readonly left: Readonly<{ nodes: number; edges: number }>;
}

/** The stretches of a kind's sorted index that a move took out of the window and into it. */
interface Crossed {
    readonly outFrom: number;
    readonly outTo: number;
    readonly inFrom: number;
    readonly inTo: number;
}

/** Nothing crossed. */
const NONE: Crossed = { outFrom: 0, outTo: 0, inFrom: 0, inTo: 0 };

/** The sorted rows of a kind with no index. */
const NO_ROWS = new Uint32Array(0);

/** In place of an end of an edge the filter hides. */
const HIDDEN = 0xffffffff;

/**
 * Move a kind to a later window.
 * @param kind - The kind, or null.
 * @param from - The window's start.
 * @param to - The window's end.
 * @returns What crossed.
 */
function crossed(kind: KindState | null, from: number, to: number): Crossed {
    if (kind === null) {
        return NONE;
    }

    const lo = lowerBound(kind.index.sorted, from);
    const hi = lowerBound(kind.index.sorted, to);
    const out = { outFrom: kind.lo, outTo: Math.min(lo, kind.hi), inFrom: Math.max(lo, kind.hi), inTo: hi };
    kind.lo = lo;
    kind.hi = hi;
    slideCounters.rows += out.outTo - out.outFrom + out.inTo - out.inFrom;

    return out;
}

/**
 * How many of a stretch of edges have both ends passing.
 * @param ends - The noted ends.
 * @param start - The first sorted position.
 * @param end - One past the last.
 * @param passing - Whether each node passes.
 * @returns The edges.
 */
function passingEdges(ends: Uint32Array, start: number, end: number, passing: Uint8Array): number {
    let edges = 0;
    for (let at = start; at < end; at++) {
        const from = ends[2 * at];
        if (from !== HIDDEN) {
            edges += passing[from] & passing[ends[2 * at + 1]];
        }
    }

    return edges;
}

/**
 * Add a stretch of edges to the nodes' counts.
 * @param ends - The noted ends.
 * @param start - The first sorted position.
 * @param end - One past the last.
 * @param endCount - The counts.
 * @param passing - Whether each node passes.
 * @returns The passing nodes that had no edge before.
 */
function endsUp(ends: Uint32Array, start: number, end: number, endCount: Int32Array, passing: Uint8Array): number {
    let nodes = 0;
    for (let at = start; at < end; at++) {
        const from = ends[2 * at];
        if (from !== HIDDEN) {
            const to = ends[2 * at + 1];
            nodes += endCount[from]++ === 0 ? passing[from] : 0;
            nodes += endCount[to]++ === 0 ? passing[to] : 0;
        }
    }

    return nodes;
}

/**
 * Take a stretch of edges off the nodes' counts.
 * @param ends - The noted ends.
 * @param start - The first sorted position.
 * @param end - One past the last.
 * @param endCount - The counts.
 * @param passing - Whether each node passes.
 * @returns The passing nodes left with no edge.
 */
function endsDown(ends: Uint32Array, start: number, end: number, endCount: Int32Array, passing: Uint8Array): number {
    let nodes = 0;
    for (let at = start; at < end; at++) {
        const from = ends[2 * at];
        if (from !== HIDDEN) {
            const to = ends[2 * at + 1];
            nodes += --endCount[from] === 0 ? passing[from] : 0;
            nodes += --endCount[to] === 0 ? passing[to] : 0;
        }
    }

    return nodes;
}

/**
 * Counts windows from a place in the sorted indexes.
 */
export class WindowCounter {
    /** Per edge, whether it passes its own tests; kept up only when nodes cross, the one reader. */
    private readonly own: Uint8Array;
    /**
     * Both ends of the edge at each sorted position, written as it comes in: an edge going out is
     * then read in order, where its rows would cost two cache misses each.
     */
    private readonly ends: Uint32Array;
    /** Per node, whether it passes its own tests. */
    private readonly passing: Uint8Array;
    private readonly state: SlideState;
    private readonly src: Uint32Array;
    private readonly dst: Uint32Array;
    private readonly directions: readonly Arcs[];
    private nodes = 0;
    private edges = 0;
    private nodesIn = 0;
    private nodesOut = 0;
    private edgesIn = 0;
    private edgesOut = 0;
    /** Whether windows sit end to end and hold every edge that can show. */
    private readonly sweeps: boolean;
    /** Whether the slide already sits at the first window. */
    private placed = true;

    /**
     * Start at the first window.
     * @param state - The slide, at that window.
     * @param cumulative - Whether each window holds the last.
     */
    private constructor(state: SlideState, cumulative: boolean) {
        this.state = state;
        this.sweeps = !cumulative && windowRows(state, state.graph) !== Number.POSITIVE_INFINITY;
        const { graph, filterNodes, node, endCount, edge, missingInside } = state;
        const { src, dst } = graph.edgeList();
        this.src = src;
        this.dst = dst;
        this.directions = graph.directed ? [graph, graph.reverse()] : [graph];
        this.passing = new Uint8Array(graph.nodeCount);
        this.own = new Uint8Array(graph.edgeCount);
        for (let row = 0; row < graph.nodeCount; row++) {
            const passes =
                (filterNodes === null || filterNodes[row] === 1) && (node === null || node.inside[row] === 1);
            this.passing[row] = passes ? 1 : 0;
            if (passes && (endCount === null || endCount[row] > 0)) {
                this.nodes++;
            }
        }

        // With no timed edges and untimed ones outside, no node has an edge to show by.
        const noEnds = endCount !== null && edge === null && !missingInside;
        for (let row = 0; row < graph.edgeCount; row++) {
            if (!noEnds && edgePasses(state, row)) {
                this.own[row] = 1;
                this.edges += this.passing[src[row]] & this.passing[dst[row]];
            }
        }

        this.ends = new Uint32Array(2 * (edge?.index.perm.length ?? 0));
        this.noteEnds(edge?.lo ?? 0, edge?.hi ?? 0);
        this.nodesIn = this.nodes;
        this.edgesIn = this.edges;
    }

    /**
     * A counter at a window. Later sliding windows start where the last one ended.
     * @param target - What the window is read from.
     * @param window - The first window.
     * @returns The counter, or null when an index alone cannot say what a window keeps, or a kind
     *     holds spans: a row can leave and come back, which this walk's one pass over the index misses.
     */
    static open(target: SlideTarget, window: TimeWindow): WindowCounter | null {
        const state = slideState(target, window);
        if (state === null || (state.node?.index.spans ?? state.edge?.index.spans ?? null) !== null) {
            return null;
        }

        return new WindowCounter(state, window.mode === "cumulative");
    }

    /**
     * Move to a window no earlier than the last.
     * @param window - The window.
     * @param target - What its bounds are read from.
     * @returns What it shows, and what came and went.
     */
    move(window: TimeWindow, target: SlideTarget): WindowCount {
        if (this.placed) {
            this.placed = false;
        } else {
            this.step(...target.bounds(window));
        }

        return {
            visible: Object.freeze({ nodes: this.nodes, edges: this.edges }),
            entered: Object.freeze({ nodes: this.nodesIn, edges: this.edgesIn }),
            left: Object.freeze({ nodes: this.nodesOut, edges: this.edgesOut }),
        };
    }

    /**
     * One move, in the order the file's header gives.
     * @param from - The window's start.
     * @param to - The window's end.
     */
    private step(from: number, to: number): void {
        const { node, edge } = this.state;
        const nodeRows = crossed(node, from, to);
        const edgeRows = crossed(edge, from, to);
        const nodePerm = node?.index.perm ?? NO_ROWS;
        this.nodesIn = 0;
        this.nodesOut = 0;
        this.edgesIn = 0;
        this.edgesOut = 0;
        for (let at = nodeRows.outFrom; at < nodeRows.outTo; at++) {
            this.nodeOut(nodePerm[at]);
        }

        this.edgesEnter(edgeRows);
        this.edgesLeave(edgeRows);
        for (let at = nodeRows.inFrom; at < nodeRows.inTo; at++) {
            this.nodeIn(nodePerm[at]);
        }

        if (this.sweeps) {
            this.edgesOut = this.edges;
            this.edgesIn = passingEdges(this.ends, edgeRows.inFrom, edgeRows.inTo, this.passing);
        }

        this.nodes += this.nodesIn - this.nodesOut;
        this.edges += this.edgesIn - this.edgesOut;
    }

    /**
     * Note the ends of a stretch of the edges' index.
     * @param start - The first sorted position.
     * @param end - One past the last.
     */
    private noteEnds(start: number, end: number): void {
        const { ends, src, dst } = this;
        const { edge, filterEdges } = this.state;
        const perm = edge?.index.perm ?? NO_ROWS;
        for (let at = start; at < end; at++) {
            const row = perm[at];
            const hidden = filterEdges !== null && filterEdges[row] === 0;
            ends[2 * at] = hidden ? HIDDEN : src[row];
            ends[2 * at + 1] = dst[row];
        }
    }

    /**
     * Take edges into the window.
     * @param rows - What crossed.
     */
    private edgesEnter(rows: Crossed): void {
        const { inFrom, inTo } = rows;
        const { endCount, node } = this.state;
        this.noteEnds(inFrom, inTo);
        if (!this.sweeps) {
            this.edgesIn +=
                node === null ? passingEdges(this.ends, inFrom, inTo, this.passing) : this.markOwn(inFrom, inTo, 1);
        }

        if (endCount !== null) {
            this.nodesIn += endsUp(this.ends, inFrom, inTo, endCount, this.passing);
        }
    }

    /**
     * Take edges out of the window.
     * @param rows - What crossed.
     */
    private edgesLeave(rows: Crossed): void {
        const { outFrom, outTo } = rows;
        const { endCount, node } = this.state;
        if (!this.sweeps) {
            this.edgesOut +=
                node === null ? passingEdges(this.ends, outFrom, outTo, this.passing) : this.markOwn(outFrom, outTo, 0);
        }

        if (endCount !== null) {
            this.nodesOut += endsDown(this.ends, outFrom, outTo, endCount, this.passing);
        }
    }

    /**
     * Write whether a stretch of edges passes its own tests, for nodes that cross to read.
     * @param start - The first sorted position.
     * @param end - One past the last.
     * @param now - 1 when it passes.
     * @returns How many of them have both ends passing.
     */
    private markOwn(start: number, end: number, now: 0 | 1): number {
        const { own, ends, passing } = this;
        const perm = this.state.edge?.index.perm ?? NO_ROWS;
        let edges = 0;
        for (let at = start; at < end; at++) {
            const from = ends[2 * at];
            if (from !== HIDDEN) {
                own[perm[at]] = now;
                edges += passing[from] & passing[ends[2 * at + 1]];
            }
        }

        return edges;
    }

    /**
     * Whether a node shows while it passes, by its edges.
     * @param row - The node.
     * @returns 1 when it does.
     */
    private endsShow(row: number): number {
        const { endCount } = this.state;

        return endCount === null || endCount[row] > 0 ? 1 : 0;
    }

    /**
     * Take a node out of the window. A node the filter hides was never passing.
     * @param row - The node.
     */
    private nodeOut(row: number): void {
        if (this.passing[row] === 1) {
            this.nodesOut += this.endsShow(row);
            this.edgesOut += this.sweeps ? 0 : this.showingEdges(row);
            this.passing[row] = 0;
        }
    }

    /**
     * Take a node into the window, unless the filter hides it.
     * @param row - The node.
     */
    private nodeIn(row: number): void {
        const { filterNodes } = this.state;
        if (filterNodes === null || filterNodes[row] === 1) {
            this.passing[row] = 1;
            this.nodesIn += this.endsShow(row);
            this.edgesIn += this.sweeps ? 0 : this.showingEdges(row);
        }
    }

    /**
     * How many of a passing node's edges pass with their other end. Each direction of a directed
     * graph holds a self-loop, so only the first counts one; an undirected graph holds it once.
     * @param row - The node.
     * @returns The edges.
     */
    private showingEdges(row: number): number {
        const { own, passing, directions } = this;
        let showing = 0;
        for (let direction = 0; direction < directions.length; direction++) {
            const { rowPtr, colIdx, arcToEdge } = directions[direction];
            const end = rowPtr[row + 1];
            slideCounters.rows += end - rowPtr[row];
            const counted = direction === 0 ? -1 : row;
            // No branch on the bytes: hub nodes' neighbours pass at random, which no predictor follows.
            for (let arc = rowPtr[row]; arc < end; arc++) {
                const other = colIdx[arc];
                showing += passing[other] & own[arcToEdge[arc]] & (other === counted ? 0 : 1);
            }
        }

        return showing;
    }
}
