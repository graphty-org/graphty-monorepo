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
 *
 * A group that takes a before-arrangement is opened here ({@link History.open}) while it is
 * pending, and a capture sealed meanwhile goes to the newest such group as its provisional
 * after-capture instead of into a step at or below its before (design section 6.4, "The seal
 * target"). A(0) is a private buffer that eviction folds the evicted steps' arrangements into in
 * place (design section 7).
 */

import type { NodeId } from "../../catalog/types";
import { POSITION_COMPONENTS } from "../../data/positions";
import { type ArrangementOp, captureBytes, coordsIn, mergeRowPatches, type RowPatch } from "./arrangement";
import type { ArrangementCapture } from "./state";

/** Every step counts this much on top of what its patch retains. */
export const STEP_OVERHEAD_BYTES = 512;

const DEFAULT_LIMIT_BYTES = 256 * 1024 * 1024;
const DEFAULT_LIMIT_STEPS = 1000;
const DEFAULT_COALESCE_MS = 1000;
/**
 * The longest a chain of merged edits may run, from its first edit to its last. The window slides
 * with every merge, so without this a steady stream of edits each under a second apart would
 * merge without end and one undo would take back a minute of deliberate work.
 */
const COALESCE_SPAN_MS = 5000;
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
    /**
     * Whether undoing a step brings rows back at coordinates other than A(k-1), which must then
     * be written over them; without it, a step with no capture and no row patch restores nothing.
     */
    restoresRows?(id: string): boolean;
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
    /** The arrangement when the step's group began changing things, if it took one. */
    readonly before?: ArrangementCapture | null;
}

/**
 * A pending group that took a before-arrangement, from {@link History.open} until
 * {@link History.close}.
 */
export interface OpenArrangement {
    /** The arrangement when the group began changing things. */
    readonly before: ArrangementCapture;
    /**
     * Where the lane came to rest since, sealed while the group was the seal target; dropped
     * when a history call restores the lane.
     */
    readonly provisional: ArrangementCapture | null;
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
    label: string;
    readonly key: string | null;
    patch: P;
    at: string;
    /** `now()` of the record that started the step, for the span a merge chain may cover. */
    readonly started: number;
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
    /**
     * What the patch holds by reference and is counted once across the whole history (a run
     * result, an id index no longer the resident snapshot's): counted on both sides of the cursor,
     * re-estimated by {@link History.recharge}.
     */
    charge: number;
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
    /**
     * A(0): the arrangement before the first step. `owned` when it is a private copy, which
     * eviction folds steps into in place; otherwise a capture shared with others, copied before
     * the first fold.
     */
    private baseline: { capture: ArrangementCapture; owned: boolean } | null = null;
    /** The pending groups holding a before-arrangement, oldest first. */
    private groups: { before: ArrangementCapture; provisional: ArrangementCapture | null }[] = [];
    /** What the undos and redos since the last take restore, in order. */
    private arrangementOps: ArrangementOp[] = [];
    /** While above zero, a history move is under way and eviction waits for it to land. */
    private moving = 0;

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
        const held = (input.after ? captureBytes(input.after) : 0) + (input.before ? captureBytes(input.before) : 0);
        const done = (input.bytes?.done ?? 0) + held;
        const undone = (input.bytes?.undone ?? 0) + held;
        const top = this.entries.at(-1);

        if (
            key !== null &&
            this.mergeable &&
            top?.key === key &&
            this.cursor === this.entries.length &&
            time - top.lastMerge < this.coalesceMs &&
            time - top.started < COALESCE_SPAN_MS
        ) {
            // The step now ends where the newest edit left it, so it is named for that edit.
            top.label = input.label;
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
            started: time,
            lastMerge: time,
            ops: [...(input.ops ?? [])],
            slices: [...(input.slices ?? [])],
            provenance: Object.freeze({ ...input.provenance }),
            doneBytes: done,
            undoneBytes: undone,
            before: input.before ?? null,
            after: input.after ?? null,
            afterRows: null,
            cache: null,
            charge: 0,
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
     * Re-estimate every step's charge, oldest first, and evict when that puts the history over a
     * limit. Quiet: the caller calls it straight after the change that moved the charges, whose
     * own `history:changed` already tells readers to look again.
     * @param charge - A step's charge from its patch. Called oldest step first, so something
     * counted once is counted against the oldest step that holds it.
     */
    recharge(charge: (patch: P) => number): void {
        let changed = false;
        for (const step of this.entries) {
            const next = charge(step.patch);
            if (next !== step.charge) {
                this.total += next - step.charge;
                step.charge = next;
                step.view = undefined;
                changed = true;
            }
        }

        if (changed) {
            this.changes++;
            this.published = undefined;
            this.evictIfOver();
        }
    }

    /**
     * Seal a capture of the lane into the seal target: the newest open group's provisional
     * after-capture, else the top applied step's after-capture, or the baseline when no step is
     * applied.
     * @param capture - The capture.
     */
    seal(capture: ArrangementCapture): void {
        const group = this.groups.at(-1);
        if (group !== undefined) {
            group.provisional = capture;
            return;
        }

        const step = this.cursor > 0 ? this.entries[this.cursor - 1] : null;
        if (step === null) {
            this.setBaseline(capture, false);
        } else {
            this.retake(step, capture);
        }

        this.changed("size");
        this.evictIfOver();
    }

    /**
     * A pending group took a before-arrangement: from now until it is closed, it is the seal
     * target.
     * @param before - Its before-arrangement.
     * @returns Its handle; the dispatcher records `before` and `provisional` from it.
     */
    open(before: ArrangementCapture): OpenArrangement {
        const group = { before, provisional: null };
        this.groups.push(group);
        return group;
    }

    /**
     * A group recorded or rolled back: it stops being a seal target.
     * @param group - Its handle.
     */
    close(group: OpenArrangement): void {
        this.groups = this.groups.filter((each) => each !== group);
    }

    /**
     * What the undos and redos since the last call restore, in the order they happened.
     * @returns The ops; the list is emptied.
     */
    takeArrangement(): ArrangementOp[] {
        const ops = this.arrangementOps.splice(0);
        const own = this.baseline?.owned === true ? this.baseline.capture : null;
        // The private baseline changes in place when a step is folded into it, so what leaves the
        // history is a copy.
        return own === null
            ? ops
            : ops.map((op) => ("capture" in op && op.capture === own ? { capture: copyCapture(own) } : op));
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
        this.baseline = baseline === null ? null : { capture: baseline, owned: false };
        this.total = baseline ? captureBytes(baseline) : 0;
        this.arrangementOps = [];
        this.dropProvisionals();
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
        this.dropProvisionals();
        this.arrangementOps.push(...this.undoOps(this.cursor - 1));
        this.options.backward(step.patch);
        this.cursor--;
        this.moved(step, step.undoneBytes - step.doneBytes);
        if (step.before !== null) {
            // The lane now holds where the step began, which is where the position it lands on
            // ends: a rest point sealed into that position after the step began is older news.
            // Without this, undoing a later step that moved nothing would put the lane back to
            // that older rest point.
            if (this.cursor === 0) {
                this.setBaseline(step.before, false);
            } else {
                this.retake(this.entries[this.cursor - 1], step.before);
            }
        }

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
        this.dropProvisionals();
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
        return (
            (done ? step.doneBytes : step.undoneBytes) + STEP_OVERHEAD_BYTES + (step.cache?.bytes ?? 0) + step.charge
        );
    }

    /**
     * Make one history move: the capture sealed before the cursor moves can take the history over
     * its budget, and evicting then could take the very step being moved to. Eviction waits until
     * the cursor has landed, where the step it landed on is protected.
     * @param move - The seal and the move.
     * @returns What `move` returned.
     */
    moveAs<T>(move: () => T): T {
        this.moving++;
        try {
            return move();
        } finally {
            this.moving--;
            this.evictIfOver();
        }
    }

    /** Evict the oldest done steps, then the farthest redo steps, down to 90% of both limits. */
    private evictIfOver(): void {
        if (this.moving > 0 || (this.total <= this.maxBytes && this.entries.length <= this.maxSteps)) {
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
            this.fold(step);
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

    /** A history call restores the lane: what open groups sealed before it no longer holds. */
    private dropProvisionals(): void {
        for (const group of this.groups) {
            group.provisional = null;
        }
    }

    /**
     * Make a capture A(0), keeping `total` in step.
     * @param capture - The capture.
     * @param owned - Whether it is a private copy nothing else references.
     */
    private setBaseline(capture: ArrangementCapture, owned: boolean): void {
        this.total += captureBytes(capture) - (this.baseline ? captureBytes(this.baseline.capture) : 0);
        this.baseline = { capture, owned };
    }

    /**
     * Fold an evicted step's arrangement into A(0), by the recursion: A(k) is after(k) with the
     * rows written over it since, or else before(k) or A(k-1), with row patch(k) applied. The
     * buffer is written in place while it has the capture's rows; it is copied only when the rows
     * differ, which a graph edit between the two makes them.
     * @param step - The oldest step, being evicted.
     */
    private fold(step: Step<P>): void {
        const capture = step.after ?? step.before;
        if (capture !== null) {
            const base = this.baseline;
            if (base?.owned === true && base.capture.token === capture.token && base.capture.ids.length === capture.ids.length) {
                base.capture.coords.set(capture.coords);
            } else {
                this.setBaseline(copyCapture(capture), true);
            }
        }

        const rows = step.after === null ? this.rowsOf(step) : step.afterRows;
        if (rows !== null) {
            this.foldRows(rows);
        }
    }

    /**
     * Write a row patch's new values into A(0), in place. A node the baseline does not hold yet (it
     * was added after the baseline was taken) is appended, and then the buffer names no row order.
     * @param rows - The patch.
     */
    private foldRows(rows: RowPatch): void {
        const base = this.baseline;
        if (base === null) {
            return;
        }

        if (!base.owned) {
            this.setBaseline(copyCapture(base.capture), true);
        }

        let {capture} = (this.baseline as { capture: ArrangementCapture });
        const missing = rows.ids.filter((id, at) => coordsIn(capture, id, rows.rows[at]) === null);
        if (missing.length > 0) {
            const coords = new Float32Array(capture.coords.length + POSITION_COMPONENTS * missing.length);
            coords.set(capture.coords);
            // ponytail: an appended row starts at the origin and takes its value just below; a
            // baseline that grows row by row reallocates per fold, fine for the few rows a
            // placement names.
            capture = Object.freeze({ ids: Object.freeze([...capture.ids, ...missing]), token: -1, epoch: capture.epoch, coords });
            this.setBaseline(capture, true);
        }

        rows.ids.forEach((id, at) => {
            coordsIn(capture, id, rows.rows[at])?.set(rows.values.subarray(6 * at + 3, 6 * at + 6));
        });
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
            // A(k) is A(k-1): the lane already holds it, except for rows the undo puts back.
            return this.options.restoresRows?.(step.id) === true ? this.arrangementAt(index) : [];
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

        return [...(this.baseline === null ? [] : [{ capture: this.baseline.capture }]), ...patches.reverse()];
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

        return this.baseline === null ? null : coordsIn(this.baseline.capture, id, hint);
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

/**
 * A private copy of a capture: its own coordinates, the same (frozen) id list.
 * @param capture - The capture.
 * @returns The copy.
 */
function copyCapture(capture: ArrangementCapture): ArrangementCapture {
    return Object.freeze({ ids: capture.ids, token: capture.token, epoch: capture.epoch, coords: capture.coords.slice() });
}
