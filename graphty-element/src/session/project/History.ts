/**
 * @file The undo history: recorded steps, a cursor over them, coalescing of repeated edits, and
 * a byte and step budget.
 *
 * `History` does not know how a patch is made or what is inside one. It is handed three
 * functions: apply a patch forward (redo), apply it backward (undo), and merge a newer patch into
 * an older one (coalescing). Steps before the cursor are done; steps from the cursor on are the
 * redo tail. See design/undo/undo-design.md sections 5, 5.2 and 7.
 *
 * It also keeps the arrangement (design section 6.4): each step may hold a before-capture, an
 * after-capture and a row patch, and the arrangement after steps 1..k is
 *
 *     A(k) = after(k), if step k has one, with the rows a merged placement wrote over it since;
 *            otherwise (before(k) if step k has one, else A(k-1)) with row patch(k) applied.
 *     A(0) = the baseline capture.
 *
 * Undoing step k restores before(k) when it has one and A(k-1) otherwise; redoing it restores
 * A(k). Each undo and redo leaves the {@link ArrangementOp}s that do this, which the caller takes.
 */

import type { NodeId } from "../../catalog/types";
import { type ArrangementOp, captureBytes, coordsIn, mergeRowPatches, type RowPatch } from "./arrangement";
import type { ArrangementCapture } from "./state";

/** Every step counts this much on top of what its patch retains. */
export const STEP_OVERHEAD_BYTES = 512;

const DEFAULT_LIMIT_BYTES = 256 * 1024 * 1024;
const DEFAULT_LIMIT_STEPS = 1000;
const DEFAULT_COALESCE_MS = 1000;
/** Eviction runs down to this share of both limits, so its work is amortised over many records. */
const EVICT_TO = 0.9;

/** Why the history changed. */
export type HistoryChangeReason = "record" | "merge" | "undo" | "redo" | "restore" | "evict" | "clear" | "size";

/** How the history reaches the patches it holds. */
export interface HistoryOptions<P> {
    /** Redo a patch. */
    forward(patch: P): void;
    /** Undo a patch. */
    backward(patch: P): void;
    /** One patch doing what `older` then `newer` did: the first prior, the last written value. */
    merge(older: P, newer: P): P;
    /** The clock of the coalescing window, in milliseconds. */
    now?: () => number;
    coalesceMs?: number;
    limitBytes?: number;
    limitSteps?: number;
    /** Called after every change, once the version has moved. */
    onChange?: (reason: HistoryChangeReason) => void;
    /** The row patch a patch carries, if any. */
    rows?(patch: P): RowPatch | null;
}

/** What one recorded group contributes to a step. */
interface RecordInput<P> {
    readonly label: string;
    readonly patch: P;
    /** Steps with equal keys recorded within the coalescing window become one step. */
    readonly key?: string | null;
    /** The ops of the commands in the patch, in the order they ran. */
    readonly ops?: readonly string[];
    readonly slices?: readonly string[];
    readonly provenance?: Readonly<Record<string, string>>;
    /** What the patch retains while done (for undo) and while undone (for redo). */
    readonly bytes?: { readonly done: number; readonly undone: number };
    /** The arrangement after the step, when it already has one: a large `positions.set`. */
    readonly after?: ArrangementCapture | null;
}

/** A step as the history publishes it. Frozen. */
interface HistoryStepView {
    readonly id: string;
    readonly label: string;
    /** ISO 8601 of the last record or merge. */
    readonly at: string;
    readonly ops: readonly string[];
    readonly slices: readonly string[];
    /** Retained on the side of the cursor the step is on, including the fixed overhead. */
    readonly bytes: number;
    readonly provenance: Readonly<Record<string, string>>;
}

/** A step as the history keeps it. */
interface Step<P> {
    readonly id: string;
    readonly label: string;
    readonly key: string | null;
    patch: P;
    at: string;
    /** `now()` of the last record or merge, for the coalescing window. */
    lastMerge: number;
    ops: readonly string[];
    slices: readonly string[];
    readonly provenance: Readonly<Record<string, string>>;
    doneBytes: number;
    undoneBytes: number;
    /** The arrangement when the step's group began changing things, if it took one. */
    readonly before: ArrangementCapture | null;
    /** The arrangement at rest after the step; the step's row patch is inside it. */
    after: ArrangementCapture | null;
    /** Rows a merged `positions.set` wrote after the after-capture was taken, applied over it. */
    afterRows: RowPatch | null;
    /**
     * Something kept only to make undoing or redoing the step cheaper (a mask copy): counted in
     * `bytes` on both sides of the cursor, and the first thing dropped when a limit is exceeded.
     */
    cache: { readonly value: unknown; readonly bytes: number } | null;
    view: HistoryStepView | undefined;
}

/** Undo history over patches of type `P`. */
export class History<P> {
    private readonly options: HistoryOptions<P>;
    private readonly now: () => number;
    private readonly coalesceMs: number;
    private entries: Step<P>[] = [];
    private cursor = 0;
    private total = 0;
    private changes = 0;
    private published: readonly HistoryStepView[] | undefined;
    private nextId = 0;
    /** Whether the top step may take a merge: false once anything but a record has happened. */
    private mergeable = false;
    private maxBytes: number;
    private maxSteps: number;
    /** A(0): the arrangement before the first step. */
    private baselineCapture: ArrangementCapture | null = null;
    /** What the undos and redos since the last take restore, in order. */
    private arrangementOps: ArrangementOp[] = [];

    /**
     * Create an empty history.
     * @param options - How to apply and merge patches, the clock and the limits.
     */
    constructor(options: HistoryOptions<P>) {
        this.options = options;
        this.now = options.now ?? (() => performance.now());
        this.coalesceMs = options.coalesceMs ?? DEFAULT_COALESCE_MS;
        this.maxBytes = options.limitBytes ?? DEFAULT_LIMIT_BYTES;
        this.maxSteps = options.limitSteps ?? DEFAULT_LIMIT_STEPS;
    }

    /**
     * Counts changes; moves on every change.
     * @returns The version.
     */
    get version(): number {
        return this.changes;
    }

    /**
     * The count of done steps.
     * @returns The cursor.
     */
    get position(): number {
        return this.cursor;
    }

    /**
     * What the steps retain, each on its side of the cursor.
     * @returns Bytes.
     */
    get bytes(): number {
        return this.total;
    }

    /**
     * Oldest first; `steps[position..]` are undone. The identical array between changes.
     * @returns The frozen steps.
     */
    get steps(): readonly HistoryStepView[] {
        this.published ??= Object.freeze(this.entries.map((step, index) => this.view(step, index)));
        return this.published;
    }

    /**
     * The byte limit.
     * @returns Bytes.
     */
    get limitBytes(): number {
        return this.maxBytes;
    }

    /** Set the byte limit, evicting at once if it is now exceeded. */
    set limitBytes(value: number) {
        this.maxBytes = value;
        this.evictIfOver();
    }

    /**
     * The step limit.
     * @returns Steps.
     */
    get limitSteps(): number {
        return this.maxSteps;
    }

    /** Set the step limit, evicting at once if it is now exceeded. */
    set limitSteps(value: number) {
        this.maxSteps = value;
        this.evictIfOver();
    }

    /**
     * Record a patch that has already been applied: merge it into the top step when it coalesces
     * with it, otherwise discard the redo tail and push a new step.
     * @param input - The patch and what describes it.
     * @returns The id of the step the patch is now in.
     */
    record(input: RecordInput<P>): string {
        const time = this.now();
        const at = new Date().toISOString();
        const key = input.key ?? null;
        const held = input.after ? captureBytes(input.after) : 0;
        const done = (input.bytes?.done ?? 0) + held;
        const undone = (input.bytes?.undone ?? 0) + held;
        const top = this.entries.at(-1);

        if (
            key !== null &&
            this.mergeable &&
            top?.key === key &&
            this.cursor === this.entries.length &&
            time - top.lastMerge < this.coalesceMs
        ) {
            this.mergeInto(top, input, time, at);
            return top.id;
        }

        for (const step of this.entries.splice(this.cursor)) {
            this.total -= this.size(step, false);
        }

        const id = `step-${this.nextId++}`;
        this.entries.push({
            id,
            label: input.label,
            key,
            patch: input.patch,
            at,
            lastMerge: time,
            ops: [...(input.ops ?? [])],
            slices: [...(input.slices ?? [])],
            provenance: Object.freeze({ ...input.provenance }),
            doneBytes: done,
            undoneBytes: undone,
            before: null,
            after: input.after ?? null,
            afterRows: null,
            cache: null,
            view: undefined,
        });
        this.cursor++;
        this.total += done + STEP_OVERHEAD_BYTES;
        this.mergeable = true;
        this.changed("record");
        this.evictIfOver();
        return id;
    }

    /**
     * Merge a patch into the top step whatever its key and however long ago it was recorded: how
     * work that finishes after its step was recorded (a transaction's deferred member) joins it.
     * @param id - The step the patch belongs to.
     * @param input - The patch and what describes it; its label is ignored.
     * @returns False, merging nothing, when that step is not the top step or is undone.
     */
    amend(id: string, input: RecordInput<P>): boolean {
        const top = this.entries.at(-1);
        if (top?.id !== id || this.cursor !== this.entries.length) {
            return false;
        }

        this.mergeInto(top, input, this.now(), new Date().toISOString());
        return true;
    }

    /**
     * What a step keeps as a cache, if anything.
     * @param id - The step.
     * @returns The cached value, or undefined when the step keeps none or is gone.
     */
    cacheOf(id: string): unknown {
        return this.entries.find((step) => step.id === id)?.cache?.value;
    }

    /**
     * Keep a cache on a step, replacing any it had. It is counted in `bytes` and dropped before
     * any step is evicted.
     * @param id - The step; nothing happens when it is gone.
     * @param value - What to keep.
     * @param bytes - What it costs.
     */
    setCache(id: string, value: unknown, bytes: number): void {
        const step = this.entries.find((each) => each.id === id);
        if (step === undefined) {
            return;
        }

        this.total += bytes - (step.cache?.bytes ?? 0);
        step.cache = { value, bytes };
        step.view = undefined;
        this.changed("size");
        this.evictIfOver();
    }

    /**
     * Seal a capture of the lane into the seal target: the top applied step's after-capture, or
     * the baseline when no step is applied.
     * @param capture - The capture.
     */
    seal(capture: ArrangementCapture): void {
        const step = this.cursor > 0 ? this.entries[this.cursor - 1] : null;
        if (step === null) {
            this.total += captureBytes(capture) - (this.baselineCapture ? captureBytes(this.baselineCapture) : 0);
            this.baselineCapture = capture;
        } else {
            this.retake(step, capture);
        }

        this.changed("size");
        this.evictIfOver();
    }

    /**
     * What the undos and redos since the last call restore, in the order they happened.
     * @returns The ops; the list is emptied.
     */
    takeArrangement(): ArrangementOp[] {
        return this.arrangementOps.splice(0);
    }

    /**
     * Undo the latest done step.
     * @returns The step undone, or null when there was none.
     */
    undo(): HistoryStepView | null {
        const step = this.back();
        if (step === null) {
            return null;
        }

        this.changed("undo");
        return this.view(step, this.cursor);
    }

    /**
     * Redo the next undone step.
     * @returns The step redone, or null when there was none.
     */
    redo(): HistoryStepView | null {
        const step = this.ahead();
        if (step === null) {
            return null;
        }

        this.changed("redo");
        return this.view(step, this.cursor - 1);
    }

    /**
     * Move to the state just after a step, or to the baseline, as the equivalent sequence of undos
     * or redos.
     * @param id - The step, or null for the baseline.
     * @returns The steps passed, in the order they were undone or redone.
     */
    restoreTo(id: string | null): readonly HistoryStepView[] {
        const target = id === null ? 0 : this.entries.findIndex((step) => step.id === id) + 1;
        if (target === 0 && id !== null) {
            throw new Error(`The history has no step ${id}.`);
        }

        const passed: HistoryStepView[] = [];
        while (this.cursor > target) {
            const step = this.back();
            if (step !== null) {
                passed.push(this.view(step, this.cursor));
            }
        }

        while (this.cursor < target) {
            const step = this.ahead();
            if (step !== null) {
                passed.push(this.view(step, this.cursor - 1));
            }
        }

        if (passed.length > 0) {
            this.changed("restore");
        }

        return Object.freeze(passed);
    }

    /**
     * Drop every step: the current state becomes the baseline.
     * @param baseline - The arrangement now, the new A(0).
     */
    clear(baseline: ArrangementCapture | null = null): void {
        this.entries = [];
        this.cursor = 0;
        this.baselineCapture = baseline;
        this.total = baseline ? captureBytes(baseline) : 0;
        this.arrangementOps = [];
        this.mergeable = false;
        this.changed("clear");
    }

    /**
     * Merge a patch into a done top step: the first prior, the last written value.
     * @param top - The top step.
     * @param input - The patch and what describes it.
     * @param time - `now()` of the merge.
     * @param at - ISO 8601 of the merge.
     */
    private mergeInto(top: Step<P>, input: RecordInput<P>, time: number, at: string): void {
        const done = input.bytes?.done ?? 0;
        const undone = input.bytes?.undone ?? 0;
        top.patch = this.options.merge(top.patch, input.patch);
        const rows = this.options.rows?.(input.patch) ?? null;
        if (input.after) {
            this.retake(top, input.after);
        } else if (top.after !== null && rows !== null) {
            // Written over the arrangement the step already holds, so applied over its capture.
            top.afterRows = top.afterRows === null ? rows : mergeRowPatches(top.afterRows, rows);
        }

        // The step now ends somewhere else, so what it cached about its end is no longer true.
        this.total -= top.cache?.bytes ?? 0;
        top.cache = null;
        top.at = at;
        top.lastMerge = time;
        top.ops = [...top.ops, ...(input.ops ?? [])];
        top.slices = [...new Set([...top.slices, ...(input.slices ?? [])])];
        // ponytail: a merge sums both patches' sizes, an overestimate; re-estimate the merged
        // patch when real sizes arrive with the dispatcher.
        top.doneBytes += done;
        top.undoneBytes += undone;
        top.view = undefined;
        this.total += done;
        this.changed("merge");
        this.evictIfOver();
    }

    /**
     * Apply the latest done step backward and move the cursor over it.
     * @returns The step, or null when none was done.
     */
    private back(): Step<P> | null {
        if (this.cursor === 0) {
            return null;
        }

        const step = this.entries[this.cursor - 1];
        this.arrangementOps.push(...this.undoOps(this.cursor - 1));
        this.options.backward(step.patch);
        this.cursor--;
        this.moved(step, step.undoneBytes - step.doneBytes);
        return step;
    }

    /**
     * Apply the next undone step forward and move the cursor over it.
     * @returns The step, or null when none was undone.
     */
    private ahead(): Step<P> | null {
        if (this.cursor === this.entries.length) {
            return null;
        }

        const step = this.entries[this.cursor];
        this.arrangementOps.push(...this.redoOps(this.cursor));
        this.options.forward(step.patch);
        this.cursor++;
        this.moved(step, step.doneBytes - step.undoneBytes);
        return step;
    }

    /**
     * A step changed sides: its size and its view change with it.
     * @param step - The step.
     * @param delta - The change in what it retains.
     */
    private moved(step: Step<P>, delta: number): void {
        this.total += delta;
        step.view = undefined;
        this.mergeable = false;
    }

    /**
     * What a step retains on one side of the cursor.
     * @param step - The step.
     * @param done - Whether the step is done.
     * @returns Bytes, with the fixed overhead.
     */
    private size(step: Step<P>, done: boolean): number {
        return (done ? step.doneBytes : step.undoneBytes) + STEP_OVERHEAD_BYTES + (step.cache?.bytes ?? 0);
    }

    /** Evict the oldest done steps, then the farthest redo steps, down to 90% of both limits. */
    private evictIfOver(): void {
        if (this.total <= this.maxBytes && this.entries.length <= this.maxSteps) {
            return;
        }

        const bytesTarget = this.maxBytes * EVICT_TO;
        const stepsTarget = Math.floor(this.maxSteps * EVICT_TO);
        let dropOld = 0;
        const over = (): boolean => this.total > bytesTarget || this.entries.length - dropOld > stepsTarget;

        // Caches go first, oldest first, while the bytes are over: they can be recomputed.
        let dropped = false;
        for (const step of this.entries) {
            if (this.total <= bytesTarget) {
                break;
            }

            if (step.cache !== null) {
                this.total -= step.cache.bytes;
                step.cache = null;
                step.view = undefined;
                dropped = true;
            }
        }

        // The latest done step (cursor - 1) and the next redo step (cursor) are never evicted.
        const before = this.entries.length;
        while (over() && dropOld < this.cursor - 1) {
            const step = this.entries[dropOld];
            this.total -= this.size(step, true);
            // ponytail: keeps the newest evicted capture as A(0) and loses the row patches of
            // evicted steps without one; the fold of design section 7 replaces this.
            const kept = step.after ?? step.before;
            if (kept !== null) {
                this.total += captureBytes(kept) - (this.baselineCapture ? captureBytes(this.baselineCapture) : 0);
                this.baselineCapture = kept;
            }

            dropOld++;
        }

        this.entries.splice(0, dropOld);
        this.cursor -= dropOld;
        dropOld = 0;

        while (over() && this.entries.length > this.cursor + 1) {
            const step = this.entries.pop();
            if (step !== undefined) {
                this.total -= this.size(step, false);
            }
        }

        if (this.entries.length < before) {
            this.changed("evict");
        } else if (dropped) {
            this.changed("size");
        }
    }

    /**
     * Give a step a new after-capture, replacing the one it had.
     * @param step - The step.
     * @param capture - The capture.
     */
    private retake(step: Step<P>, capture: ArrangementCapture): void {
        const delta = captureBytes(capture) - (step.after ? captureBytes(step.after) : 0);
        step.after = capture;
        step.afterRows = null;
        step.doneBytes += delta;
        step.undoneBytes += delta;
        step.view = undefined;
        this.total += delta;
    }

    /**
     * The row patch of a step, if it has one that counts: an after-capture already holds it.
     * @param step - The step.
     * @returns The patch, or null.
     */
    private rowsOf(step: Step<P>): RowPatch | null {
        return step.after === null ? (this.options.rows?.(step.patch) ?? null) : null;
    }

    /**
     * What undoing the step at `index` restores, given that the lane holds A(index + 1).
     * @param index - The step.
     * @returns The ops: before(k), or A(k-1).
     */
    private undoOps(index: number): ArrangementOp[] {
        const step = this.entries[index];
        if (step.before !== null) {
            return [{ capture: step.before }];
        }

        if (step.after !== null) {
            return this.arrangementAt(index);
        }

        const rows = this.rowsOf(step);
        if (rows === null) {
            // A(k) is A(k-1): the lane already holds it.
            return [];
        }

        // Only its rows differ from A(k-1), which may have been sealed again since they were
        // written, so each takes its value in A(k-1) rather than the prior it was written over.
        const values = Float32Array.from(rows.values);
        rows.ids.forEach((id, at) => {
            values.set(this.valueAt(index, id, rows.rows[at]) ?? rows.values.subarray(6 * at, 6 * at + 3), 6 * at + 3);
        });
        return [{ patch: { ids: rows.ids, rows: rows.rows, values }, forward: true }];
    }

    /**
     * What redoing the step at `index` restores, given that the lane holds A(index).
     * @param index - The step.
     * @returns The ops: A(k).
     */
    private redoOps(index: number): ArrangementOp[] {
        const step = this.entries[index];
        if (step.after !== null) {
            return afterOps(step);
        }

        const rows = this.rowsOf(step);
        const patched: ArrangementOp[] = rows === null ? [] : [{ patch: rows, forward: true }];
        return step.before === null ? patched : [{ capture: step.before }, ...patched];
    }

    /**
     * A(count), the arrangement after the first `count` steps, as ops written over the lane.
     * @param count - How many steps.
     * @returns The ops; without the baseline capture when there is none.
     */
    private arrangementAt(count: number): ArrangementOp[] {
        const patches: ArrangementOp[] = [];
        for (let index = count - 1; index >= 0; index--) {
            const step = this.entries[index];
            if (step.after !== null) {
                return [...afterOps(step), ...patches.reverse()];
            }

            const rows = this.rowsOf(step);
            if (rows !== null) {
                patches.push({ patch: rows, forward: true });
            }

            if (step.before !== null) {
                return [{ capture: step.before }, ...patches.reverse()];
            }
        }

        return [...(this.baselineCapture === null ? [] : [{ capture: this.baselineCapture }]), ...patches.reverse()];
    }

    /**
     * One node's coordinates in A(count).
     * @param count - How many steps.
     * @param id - The node.
     * @param hint - The row it is expected at.
     * @returns x, y, z, or null when nothing the history holds places it.
     */
    private valueAt(count: number, id: NodeId, hint: number): Float32Array | null {
        for (let index = count - 1; index >= 0; index--) {
            const step = this.entries[index];
            const late = step.afterRows?.ids.indexOf(id) ?? -1;
            if (step.afterRows !== null && late !== -1) {
                return step.afterRows.values.subarray(6 * late + 3, 6 * late + 6);
            }

            if (step.after !== null) {
                return coordsIn(step.after, id, hint);
            }

            const rows = this.rowsOf(step);
            const at = rows?.ids.indexOf(id) ?? -1;
            if (rows !== null && at !== -1) {
                return rows.values.subarray(6 * at + 3, 6 * at + 6);
            }

            if (step.before !== null) {
                return coordsIn(step.before, id, hint);
            }
        }

        return this.baselineCapture === null ? null : coordsIn(this.baselineCapture, id, hint);
    }

    /**
     * Bump the version, drop the published array and tell the listener.
     * @param reason - Why.
     */
    private changed(reason: HistoryChangeReason): void {
        this.changes++;
        this.published = undefined;
        this.options.onChange?.(reason);
    }

    /**
     * The published view of a step, built once per change of the step.
     * @param step - The step.
     * @param index - Its index, which says which side of the cursor it is on.
     * @returns The frozen view.
     */
    private view(step: Step<P>, index: number): HistoryStepView {
        step.view ??= Object.freeze({
            id: step.id,
            label: step.label,
            at: step.at,
            ops: Object.freeze([...step.ops]),
            slices: Object.freeze([...step.slices]),
            bytes: this.size(step, index < this.cursor),
            provenance: step.provenance,
        });
        return step.view;
    }
}

/**
 * A(k) of a step that has an after-capture: the capture, and the rows written over it since.
 * @param step - The step.
 * @param step.after - Its after-capture.
 * @param step.afterRows - The rows written over it.
 * @returns The ops.
 */
function afterOps(step: {
    readonly after: ArrangementCapture | null;
    readonly afterRows: RowPatch | null;
}): ArrangementOp[] {
    return [
        ...(step.after === null ? [] : [{ capture: step.after }]),
        ...(step.afterRows === null ? [] : [{ patch: step.afterRows, forward: true }]),
    ];
}
