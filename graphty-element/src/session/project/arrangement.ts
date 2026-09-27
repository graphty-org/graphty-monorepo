/**
 * @file The arrangement: where the nodes are, recorded at rest.
 *
 * A running layout moves every unpinned node every frame and most commands do not say where
 * anything goes, so coordinates are not recorded per command. They are recorded as captures of
 * the positions lane, taken when the lane has moved and something needs to know where it is: a
 * rest point (the layout settled or was paused), a history call about to move the cursor, and a
 * `positions.set` about to write. A capture goes into the top applied step, or into the baseline
 * when no step is applied. `positions.set` writes only a few rows, so it records a row patch
 * instead: the rows written, with their prior and new values.
 *
 * Undo and redo turn what the steps hold into {@link ArrangementOp}s (`History.ts` holds the
 * rule), and the `arrangement` derivation hook writes them into the lane and hands the lane to
 * the layout engine, which takes it as its own and stays at rest. Pins are the `pins` slice; the
 * `pins` hook writes the lane's pin bytes from it and tells the engine. See
 * design/undo/undo-design.md sections 6.2 and 6.4.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: the renderer hands in an engine.
 */

import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import type { NodeId } from "../../catalog/types";
import { type ElementPositions, isStorableCoordinate, POSITION_COMPONENTS } from "../../data/positions";
import { GraphtyError } from "../../errors/GraphtyError";
import type { PositionEntry } from "../types";
import type { DerivationLane } from "./derive";
import type { Draft } from "./draft";
import { type GraphOps, nodeOfKey } from "./graphOps";
import type { ArrangementCapture, ProjectState } from "./state";
import { retainArray, strictStateEnabled, strictViolation } from "./strict";

/**
 * The coordinates a few rows were written with, and what they held before. Row indices are
 * hints taken when the rows were written; a row is always checked against its id, and found by
 * id when the rows have moved since.
 */
export interface RowPatch {
    readonly ids: readonly NodeId[];
    readonly rows: Uint32Array;
    /** Per row: the prior x, y, z, then the new x, y, z. */
    readonly values: Float32Array;
}

/** One thing the `arrangement` hook writes into the lane, in order. */
export type ArrangementOp =
    | { readonly capture: ArrangementCapture }
    /** Each row takes its new value, or its prior one when `forward` is false. */
    | { readonly patch: RowPatch; readonly forward: boolean };

/** Where the lane lives: the snapshot its rows follow, and the lane itself. */
interface LaneSource {
    snapshot(): GraphSnapshot;
    readonly positions: ElementPositions;
    /** Whether the graph holds no node rows, answered without freezing; absent, records decide. */
    holdsNoRows?(): boolean;
}

/** What moves the lane besides history: the layout engine, as the renderer hands it in. */
export interface ArrangementEngine {
    /** Stop moving the lane: a history call is about to restore it. */
    suspend(): void;
    /**
     * Take the lane's coordinates as the engine's own, and drop work that was computing from the
     * coordinates it held before.
     * @param restoring - True for undo, redo, a restore or a rollback: the engine is left at rest.
     *     False for a forward `positions.set`: the engine keeps running if it was.
     * @param wrote - Whether anything was written into the lane; when nothing was, every row the
     *     graph held before holds what it did, and only rows the graph just gained are new.
     */
    loadArrangement(restoring: boolean, wrote: boolean): void;
    /**
     * A node was pinned or released; the lane's pin byte is already written.
     * @param id - The node.
     * @param pinned - Whether it is pinned now.
     */
    pin(id: NodeId, pinned: boolean): void;
}

/** Where a capture is sealed: the history's seal target. */
interface SealTarget {
    seal(capture: ArrangementCapture): void;
}

/**
 * What a capture retains.
 * @param capture - The capture.
 * @returns Bytes: 12 per row of coordinates and 8 per id.
 */
export function captureBytes(capture: ArrangementCapture): number {
    return capture.coords.byteLength + 8 * capture.ids.length;
}

/**
 * What a row patch retains.
 * @param patch - The patch.
 * @returns Bytes: 4 for the row, 24 for the values and 8 for the id, per row.
 */
export function rowPatchBytes(patch: RowPatch): number {
    return patch.rows.byteLength + patch.values.byteLength + 8 * patch.ids.length;
}

/**
 * One patch doing what `older` then `newer` did: each row keeps its first prior and takes its last
 * new value.
 * @param older - The patch written first.
 * @param newer - The patch written after it.
 * @returns The merged patch.
 */
export function mergeRowPatches(older: RowPatch, newer: RowPatch): RowPatch {
    const at = new Map<NodeId, number>(older.ids.map((id, row) => [id, row]));
    const ids = [...older.ids];
    const rows = [...older.rows];
    const values = [...older.values];
    newer.ids.forEach((id, row) => {
        const known = at.get(id);
        const next = newer.values.subarray(6 * row + 3, 6 * row + 6);
        if (known === undefined) {
            ids.push(id);
            rows.push(newer.rows[row]);
            values.push(...newer.values.subarray(6 * row, 6 * row + 6));
        } else {
            rows[known] = newer.rows[row];
            values.splice(6 * known + 3, 3, ...next);
        }
    });

    return rowPatch(ids, rows, values);
}

/**
 * A row patch, frozen, its arrays noted by strict state: a step keeps it.
 * @param ids - The node ids.
 * @param rows - Their rows.
 * @param values - Six values per row: the prior coordinate, then the new one.
 * @returns The patch.
 */
function rowPatch(ids: NodeId[], rows: readonly number[], values: readonly number[]): RowPatch {
    const patch = Object.freeze({ ids: Object.freeze(ids), rows: Uint32Array.from(rows), values: Float32Array.from(values) });
    retainArray(patch.rows, "the arrangement slice's row patch");
    retainArray(patch.values, "the arrangement slice's row patch");
    return patch;
}

/**
 * A node's coordinates in a capture.
 * @param capture - The capture.
 * @param id - The node.
 * @param hint - The row it is expected at.
 * @returns x, y, z, or null when the capture does not hold the node.
 */
export function coordsIn(capture: ArrangementCapture, id: NodeId, hint: number): Float32Array | null {
    const row = capture.ids[hint] === id ? hint : capture.ids.indexOf(id);
    return row === -1 ? null : capture.coords.subarray(3 * row, 3 * row + 3);
}

/**
 * The row a node is at now.
 * @param snapshot - The snapshot the lane follows.
 * @param id - The node.
 * @param hint - The row it was at.
 * @returns The row, or INVALID_INDEX when the graph does not hold it.
 */
function rowOf(snapshot: GraphSnapshot, id: NodeId, hint: number): number {
    if (hint < snapshot.nodeCount && snapshot.ids.idOf(hint) === id) {
        return hint;
    }

    return typeof id === "string" || typeof id === "number" ? snapshot.ids.indexOf(id) : INVALID_INDEX;
}

/**
 * The arrangement of one session: the current capture, the generation of the lane it matches,
 * the `arrangement` and `pins` hooks, and the `positions.*` commands' writes.
 *
 * Its invariant: while the lane's generation equals the one recorded here, the lane holds the
 * arrangement of the history's cursor, A(cursor). A seal, a restore and a `positions.set` keep it;
 * a layout write breaks it until the next seal.
 */
export class Arrangement {
    /** The layout engine; the renderer sets it, a test sets a fake. */
    engine: ArrangementEngine | null = null;
    private source: LaneSource | null = null;
    private captured = 0;
    /**
     * The capture the lane holds row for row, while nothing has written it since: what a group's
     * before-arrangement shares instead of copying the lane. Null after a row write.
     */
    private exact: ArrangementCapture | null = null;
    /** Whether a forward `positions.set` wrote the lane since the last pass. */
    private written = false;
    private readonly ops: ArrangementOp[] = [];
    private readonly strict = strictStateEnabled();

    /**
     * The arrangement over a dispatcher's state, lane and history.
     * @param state - The live project state; this writes its `arrangement` and reads its `graph`.
     * @param lane - The derivation lane: the restoring flag, and where the hooks register.
     * @param history - Where captures are sealed.
     * @param graph - The graph primitives, which write the `pins` slice.
     */
    constructor(
        private readonly state: ProjectState,
        private readonly lane: DerivationLane,
        private readonly history: SealTarget,
        private readonly graph: GraphOps,
    ) {
        lane.register("pins", (_rendered, target, dirty) => {
            this.derivePins(target, dirty);
        });
        lane.register("arrangement", () => {
            this.apply(this.lane.cause !== "command");
        });
    }

    /**
     * Hand in the lane, or take it away when the session is disposed. From here on the lane as it
     * is counts as unmoved.
     * @param source - The lane, or null.
     */
    bind(source: LaneSource | null): void {
        this.source = source;
        this.captured = source?.positions.generation ?? 0;
        this.exact = null;
    }

    /**
     * Whether something has moved the lane since the last capture, restore or `positions.set`.
     * @returns True when it has.
     */
    get moved(): boolean {
        return this.source !== null && this.source.positions.generation !== this.captured;
    }

    /**
     * Copy the lane now. It becomes the current capture.
     * @returns The capture, or null when there is no lane.
     */
    capture(): ArrangementCapture | null {
        const { source } = this;
        if (source === null) {
            return null;
        }

        // A cleared graph is captured as empty rather than by freezing a snapshot nothing draws.
        // Records alone do not say the graph is empty: an edge's missing endpoint is a row with no
        // node record, and it outlives the edge that brought it in.
        const { graph } = this.state;
        const empty = graph.nodes.size === 0 && graph.edges.size === 0 && (source.holdsNoRows?.() ?? true);
        const snapshot = empty ? null : source.snapshot();
        const capture: ArrangementCapture = Object.freeze({
            ids: Object.freeze(snapshot === null ? [] : snapshot.ids.toArray()),
            token: this.state.graph.token,
            epoch: this.state.graph.epoch,
            coords: snapshot === null ? new Float32Array(0) : source.positions.view(snapshot.nodeCount).slice(),
        });
        retainArray(capture.coords, "the arrangement slice's capture");
        this.current(capture);
        return capture;
    }

    /**
     * Seal the lane into the history's seal target when it has moved, unless a restore is still
     * on its way to the lane: until the `arrangement` hook has run, the lane is not at rest.
     */
    seal(): void {
        if (this.moved && !this.lane.restoring) {
            const capture = this.capture();
            if (capture !== null) {
                this.history.seal(capture);
            }
        }
    }

    /**
     * The arrangement a group begins from (design section 6.4, "Which groups take a
     * before-arrangement"): the current capture, shared, when nothing has moved the lane since it
     * was taken; otherwise the lane is captured, and that capture is sealed into the seal target
     * first, because it is where the step below the group came to rest.
     * @returns The capture, or null when there is no lane.
     */
    before(): ArrangementCapture | null {
        this.flush();
        this.seal();
        const { exact } = this;
        if (exact !== null && !this.moved && exact.token === this.state.graph.token) {
            return exact;
        }

        return this.capture();
    }

    /**
     * Copy the lane now, with every restore still queued written into it first: the capture a
     * group seals at its commit.
     * @returns The capture, or null when there is no lane.
     */
    settledCapture(): ArrangementCapture | null {
        this.flush();
        return this.capture();
    }

    /** A rest point: the layout settled, was paused, or finished a placement pass. */
    rest(): void {
        this.seal();
    }

    /** Stop the engine: a history call is about to move the cursor. */
    stop(): void {
        this.engine?.suspend();
    }

    /**
     * Queue what a history call or a rollback restores; the `arrangement` hook writes it and hands
     * the lane to the engine. The engine takes the lane even when nothing is written: the graph
     * under it may have changed, and an engine that recomputed its own arrangement for the new
     * graph would draw over the restored one.
     * @param ops - The ops, in order.
     */
    restore(ops: readonly ArrangementOp[]): void {
        this.ops.push(...ops);
        this.lane.touch("arrangement", "");
    }

    /**
     * Write every restore still queued into the lane now, before a capture or a write reads it.
     */
    flush(): void {
        if (this.ops.length > 0) {
            this.apply(true);
        }
    }

    /**
     * `positions.set`: write rows of the lane, and record them in the draft as a row patch. When
     * something has moved the lane since the last capture, that is sealed first, so the rows'
     * prior values are an arrangement the history holds.
     * @param entries - The rows and their coordinates.
     * @param draft - The command's draft.
     */
    set(entries: readonly PositionEntry[], draft: Draft): void {
        const source = this.requireSource();
        for (const entry of entries) {
            const z = entry.z ?? 0;
            if (!isStorableCoordinate(entry.x) || !isStorableCoordinate(entry.y) || !isStorableCoordinate(z)) {
                throw badPosition(
                    `The coordinates given for node ${JSON.stringify(entry.id)} are not finite numbers.`,
                    entry.id,
                );
            }
        }

        this.flush();
        this.seal();
        const snapshot = source.snapshot();
        const lane = source.positions;
        const ids: NodeId[] = [];
        const rows: number[] = [];
        const values: number[] = [];
        const at = { x: 0, y: 0, z: 0 };
        for (const entry of entries) {
            const row = rowOf(snapshot, entry.id, 0);
            if (row === INVALID_INDEX) {
                throw badPosition(`The graph holds no node ${JSON.stringify(entry.id)} to place.`, entry.id);
            }

            lane.read(row, at);
            ids.push(entry.id);
            rows.push(row);
            values.push(at.x, at.y, at.z, entry.x, entry.y, entry.z ?? 0);
        }

        for (const [index, row] of rows.entries()) {
            lane.write(row, values[6 * index + 3], values[6 * index + 4], values[6 * index + 5]);
        }

        draft.arrange(rowPatch(ids, rows, values));
        this.captured = lane.generation;
        this.exact = null;
        this.written = true;
        // The engine takes the new rows as its own at the next pass.
        this.lane.touch("arrangement", "");
    }

    /**
     * Whether a `positions.set` wrote so much of the lane that a capture is cheaper to keep than
     * its row patch: more than a third of the rows.
     * @param patch - What it wrote.
     * @returns True when the step should keep a capture instead.
     */
    wantsCapture(patch: RowPatch): boolean {
        return this.source !== null && 3 * patch.ids.length > this.source.positions.count;
    }

    /**
     * `positions.pin`: pin or release nodes, in the `pins` slice and in the lane's pin bytes. A
     * node the graph does not hold is skipped, as the element's own `pin` always has.
     * @param ids - The nodes.
     * @param pinned - Pin, or release.
     * @param draft - The command's draft.
     */
    pin(ids: readonly NodeId[], pinned: boolean, draft: Draft): void {
        const snapshot = this.source?.snapshot() ?? null;
        // A node an edge created has a row and no record of its own: it is in the graph too.
        const held = (id: NodeId): boolean =>
            this.state.graph.nodes.has(id) || (snapshot !== null && rowOf(snapshot, id, 0) !== INVALID_INDEX);
        const changed = this.graph.setPinned(draft, ids.filter(held), pinned);
        // Written now as well as by the hook, so a getter and the engine have the pin as soon as
        // this returns; the hook writes it again from the slice.
        for (const id of changed) {
            const row = snapshot === null ? INVALID_INDEX : rowOf(snapshot, id, 0);
            if (row !== INVALID_INDEX) {
                this.source?.positions.setPinned(row, pinned);
            }

            this.engine?.pin(id, pinned);
        }
    }

    /**
     * Strict state: the lane's pin bytes agree with the `pins` slice. Asked at a commit that wrote
     * the slice, and not while a restore is on its way to the lane.
     */
    checkPins(): void {
        const { source } = this;
        if (!this.strict || source === null || this.lane.restoring) {
            return;
        }

        const snapshot = source.snapshot();
        for (let row = 0; row < snapshot.nodeCount; row++) {
            if (source.positions.isPinned(row) !== this.state.pins.has(snapshot.ids.idOf(row))) {
                throw strictViolation(
                    `the lane's pin byte for ${JSON.stringify(snapshot.ids.idOf(row))} disagrees with the pins slice`,
                );
            }
        }
    }

    /**
     * Record a capture as the current one.
     * @param capture - The capture.
     */
    private current(capture: ArrangementCapture): void {
        (this.state as { arrangement: ArrangementCapture | null }).arrangement = capture;
        this.captured = this.source?.positions.generation ?? 0;
        this.exact = capture;
    }

    /**
     * The `arrangement` hook: write the queued ops into the lane, and hand the lane to the engine.
     * @param restoring - Whether a history call or a rollback queued them.
     */
    private apply(restoring: boolean): void {
        const ops = this.ops.splice(0);
        const { source } = this;
        if (source !== null && ops.length > 0) {
            const snapshot = source.snapshot();
            const lane = source.positions.view(snapshot.nodeCount);
            // A capture restores every row it holds, so what came before it is overwritten.
            let from = ops.length - 1;
            while (from > 0 && !("capture" in ops[from])) {
                from--;
            }

            let exact: ArrangementCapture | null = null;
            for (const op of ops.slice(from)) {
                if ("capture" in op) {
                    writeCapture(op.capture, snapshot, lane, this.state.graph.token);
                    (this.state as { arrangement: ArrangementCapture | null }).arrangement = op.capture;
                    const whole = op.capture.token === this.state.graph.token && op.capture.ids.length === snapshot.nodeCount;
                    exact = whole ? op.capture : null;
                } else {
                    writePatch(op.patch, op.forward, snapshot, lane);
                    exact = null;
                }
            }

            source.positions.moved();
            this.captured = source.positions.generation;
            this.exact = exact;
        }

        // The engine taking the lane may write it back unchanged; that is not a move. A layout
        // write made before this pass still is, and the next rest point seals it.
        const atRest = !this.moved;
        const wrote = this.written || (source !== null && ops.length > 0);
        this.written = false;
        this.engine?.loadArrangement(restoring, wrote);
        if (atRest) {
            this.captured = source?.positions.generation ?? 0;
        }
    }

    /**
     * The `pins` hook: every node whose pin was written gets its lane byte from the slice, and the
     * engine is told. Every dirty node, not only those whose pin differs from the last pass: a pin
     * and its undo in one burst leave the slice as it was, but the pin wrote the byte at once.
     * @param target - The state the picture must show.
     * @param dirty - The pins written, as node keys.
     */
    private derivePins(target: ProjectState, dirty: ReadonlySet<string>): void {
        const { source } = this;
        if (source === null) {
            return;
        }

        const snapshot = source.snapshot();
        for (const key of dirty) {
            const id = nodeOfKey(key);
            const pinned = target.pins.has(id);
            const row = rowOf(snapshot, id, 0);
            if (row !== INVALID_INDEX) {
                source.positions.setPinned(row, pinned);
            }

            this.engine?.pin(id, pinned);
        }
    }

    /**
     * The lane, or the error a positions command gets on a session with none.
     * @returns The lane.
     */
    private requireSource(): LaneSource {
        if (this.source === null) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session holds no coordinates to place.",
                source: "layout",
            });
        }

        return this.source;
    }
}

/**
 * The error of a positions command naming what it cannot place.
 * @param message - What is wrong.
 * @param id - The node.
 * @returns The error.
 */
function badPosition(message: string, id: NodeId): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "layout", details: { id } });
}

/**
 * Write a capture into the lane: row for row when the rows are the ones it was taken over, by id
 * otherwise. Rows the capture does not hold keep what they have.
 * @param capture - The capture.
 * @param snapshot - The snapshot the lane follows now.
 * @param lane - The lane, exactly `3 * nodeCount` long.
 * @param token - The graph token now.
 */
function writeCapture(capture: ArrangementCapture, snapshot: GraphSnapshot, lane: Float32Array, token: number): void {
    if (capture.token === token && capture.ids.length === snapshot.nodeCount) {
        lane.set(capture.coords);
        return;
    }

    capture.ids.forEach((id, from) => {
        const row = rowOf(snapshot, id, from);
        if (row !== INVALID_INDEX) {
            lane.set(
                capture.coords.subarray(POSITION_COMPONENTS * from, POSITION_COMPONENTS * from + 3),
                POSITION_COMPONENTS * row,
            );
        }
    });
}

/**
 * Write a row patch into the lane.
 * @param patch - The patch.
 * @param forward - New values, or prior ones.
 * @param snapshot - The snapshot the lane follows now.
 * @param lane - The lane.
 */
function writePatch(patch: RowPatch, forward: boolean, snapshot: GraphSnapshot, lane: Float32Array): void {
    const offset = forward ? 3 : 0;
    patch.ids.forEach((id, index) => {
        const row = rowOf(snapshot, id, patch.rows[index]);
        if (row !== INVALID_INDEX) {
            lane.set(patch.values.subarray(6 * index + offset, 6 * index + offset + 3), POSITION_COMPONENTS * row);
        }
    });
}
