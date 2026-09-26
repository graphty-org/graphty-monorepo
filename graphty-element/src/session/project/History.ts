/**
 * @file The undo history: recorded steps, a cursor over them, coalescing of repeated edits, and
 * a byte and step budget.
 *
 * `History` does not know how a patch is made or what is inside one. It is handed three
 * functions: apply a patch forward (redo), apply it backward (undo), and merge a newer patch into
 * an older one (coalescing). Steps before the cursor are done; steps from the cursor on are the
 * redo tail. See design/undo/undo-design.md sections 5, 5.2 and 7.
 */

/** Every step counts this much on top of what its patch retains. */
export const STEP_OVERHEAD_BYTES = 512;

const DEFAULT_LIMIT_BYTES = 256 * 1024 * 1024;
const DEFAULT_LIMIT_STEPS = 1000;
const DEFAULT_COALESCE_MS = 1000;
/** Eviction runs down to this share of both limits, so its work is amortised over many records. */
const EVICT_TO = 0.9;

/** Why the history changed. */
type HistoryChangeReason = "record" | "merge" | "undo" | "redo" | "restore" | "evict" | "clear";

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
    /** Arrangement captures and the row patch; filled from design section 6.4 on. */
    readonly beforeCapture: unknown;
    readonly afterCapture: unknown;
    readonly rowPatch: unknown;
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
        const done = input.bytes?.done ?? 0;
        const undone = input.bytes?.undone ?? 0;
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
            beforeCapture: null,
            afterCapture: null,
            rowPatch: null,
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

    /** Drop every step: the current state becomes the baseline. */
    clear(): void {
        this.entries = [];
        this.cursor = 0;
        this.total = 0;
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
        return (done ? step.doneBytes : step.undoneBytes) + STEP_OVERHEAD_BYTES;
    }

    /** Evict the oldest done steps, then the farthest redo steps, down to 90% of both limits. */
    private evictIfOver(): void {
        if (this.total <= this.maxBytes && this.entries.length <= this.maxSteps) {
            return;
        }

        const bytesTarget = this.maxBytes * EVICT_TO;
        const stepsTarget = Math.floor(this.maxSteps * EVICT_TO);
        const over = (): boolean => this.total > bytesTarget || this.entries.length - dropOld > stepsTarget;

        // ponytail: no caches exist yet; mask copies are dropped here first once they do.
        // The latest done step (cursor - 1) and the next redo step (cursor) are never evicted.
        const before = this.entries.length;
        let dropOld = 0;
        while (over() && dropOld < this.cursor - 1) {
            this.total -= this.size(this.entries[dropOld], true);
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
        }
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
