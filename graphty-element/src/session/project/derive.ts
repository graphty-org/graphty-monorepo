/**
 * @file The derivation lane: how every change to project state reaches the screen.
 *
 * Each slice registers hooks, `hook(rendered, target, dirty)`: from the state the picture last
 * showed, to the state it must show, with the keys of that slice changed since. Forward commits,
 * undo, redo, restore and rollback all mark keys dirty the same way (the project store reports
 * every write), so restoring state restores the picture by construction.
 *
 * Every change schedules one pass as a microtask, so a burst of synchronous changes (a held
 * Ctrl+Z, a restore across thirty steps) costs one pass that sees the net change. A change that
 * arrives while a pass is running waits for the next one. Hooks run in a fixed order: `graph`,
 * `layout`, `pins`, `arrangement`, then the rest, so the layout engine exists before pins are
 * applied to it and the arrangement is loaded last. See design/undo/undo-design.md section 9.
 *
 * The lane runs apart from the operation queue, whose obsolescence rules cancel work and whose
 * batch sort reorders it. Nothing here reaches Babylon.js, Lit or the DOM: the renderer registers
 * its hooks on the session's lane.
 */

import type { ProjectState } from "./state";
import { reportCaught } from "./strict";

/** A slice of project state, as the lane marks and derives it. */
type DerivedSlice = keyof ProjectState;

/** The order hooks run in within one pass. */
const HOOK_ORDER: readonly DerivedSlice[] = [
    "graph",
    "layout",
    "pins",
    "arrangement",
    "config",
    "attributes",
    "runs",
    // After runs, which a set may read; before styles and visibility, which read sets.
    "sets",
    // After sets and runs, which a note names; before styles, which will read the notes.
    "notes",
    "styles",
    "visibility",
    "views",
];

/**
 * Brings one slice of the picture from `rendered` to `target`. `dirty` holds the keys changed
 * since the last pass ("" for a whole-value slice); a key may be dirty with no net change, so a
 * hook compares the two states. It may return a promise; the pass waits for it.
 */
type DeriveHook = (rendered: ProjectState, target: ProjectState, dirty: ReadonlySet<string>) => unknown;

interface LaneOptions {
    /** Told when a hook throws; the pass goes on. By default the error is rethrown unhandled. */
    readonly onError?: (error: unknown) => void;
}

/** A promise with its resolve function. */
interface Pass {
    readonly promise: Promise<void>;
    readonly resolve: () => void;
}

/**
 * A copy of a state whose maps and sets later writes cannot reach. The values are shared: every
 * value in state is replaced on write, never changed in place.
 * @param state - The state.
 * @returns The copy.
 */
function snapshot(state: ProjectState): ProjectState {
    // ponytail: copies the keyed maps once per pass; fine while they hold settings, runs, sets
    // and views. The graph op-lists will be folded, not copied, when the graph slice lands.
    return Object.freeze({
        ...state,
        pins: new Set(state.pins),
        config: new Map(state.config),
        runs: new Map(state.runs),
        sets: new Map(state.sets),
        views: new Map(state.views),
        notes: new Map(state.notes),
        attributes: new Map(state.attributes),
    });
}

/**
 * Whether a value is a promise or another thenable.
 * @param value - The value.
 * @returns True when it has a `then` method.
 */
function isThenable(value: unknown): value is PromiseLike<unknown> {
    return typeof (value as { then?: unknown } | null)?.then === "function";
}

/** The lane: `rendered` state, dirty keys per slice, one pass per burst of changes. */
export class DerivationLane {
    private readonly state: ProjectState;
    private readonly onError: (error: unknown) => void;
    private readonly hooks = new Map<DerivedSlice, DeriveHook[]>();
    private dirty = new Map<DerivedSlice, Set<string>>();
    /** How many writes each slice has had, whoever wrote it. */
    private readonly counts = new Map<DerivedSlice, number>();
    private shown: ProjectState;
    /** The pass that will take the changes made since the running one started. */
    private next: Pass | null = null;
    private current: Pass | null = null;
    private restoringFlag = false;
    private restoreCause: "undo" | "redo" | "restore" | "rollback" = "restore";
    /** Moves on every restore, so a pass clears the flag only for restores made before it began. */
    private restores = 0;
    /**
     * Strict state's invariant check, run at the end of a pass that leaves nothing more to derive,
     * with live state; what it throws goes where hook errors go. Null outside strict state.
     */
    afterPass: ((target: ProjectState) => void) | null = null;
    /** What the running pass, or the last one, catches up with. */
    private passCauseValue: "command" | "undo" | "redo" | "restore" | "rollback" = "command";

    /**
     * Create a lane over live state. The picture is taken to show that state already.
     * @param state - The live state, which the lane reads and never writes.
     * @param options - Where hook errors go.
     */
    constructor(state: ProjectState, options: LaneOptions = {}) {
        this.state = state;
        this.shown = snapshot(state);
        this.onError =
            options.onError ??
            ((error) => {
                reportCaught(error);
                queueMicrotask(() => {
                    throw error;
                });
            });
    }

    /**
     * The state the picture shows: the target of the last finished pass.
     * @returns A frozen copy.
     */
    get rendered(): ProjectState {
        return this.shown;
    }

    /**
     * True from an undo, redo, restore or rollback until the `arrangement` hook of the pass that
     * derives it has run. While it is set, hooks feed the layout without stepping or starting it.
     * @returns The flag.
     */
    get restoring(): boolean {
        return this.restoringFlag;
    }

    /**
     * Add a hook for one slice. Hooks of one slice run in the order registered.
     * @param slice - The slice.
     * @param hook - The hook.
     * @returns A function that removes it.
     */
    register(slice: DerivedSlice, hook: DeriveHook): () => void {
        const list = this.hooks.get(slice) ?? [];
        list.push(hook);
        this.hooks.set(slice, list);
        return () => {
            const index = list.indexOf(hook);
            if (index !== -1) {
                list.splice(index, 1);
            }
        };
    }

    /**
     * How many writes a slice has had so far: a cache key that moves at once on every write,
     * before the pass that derives it.
     * @param slice - The slice.
     * @returns The count.
     */
    writes(slice: DerivedSlice): number {
        return this.counts.get(slice) ?? 0;
    }

    /**
     * Mark a key of a slice changed, and schedule a pass.
     * @param slice - The slice.
     * @param key - The key; "" for a whole-value slice.
     */
    touch(slice: DerivedSlice, key: string): void {
        this.counts.set(slice, this.writes(slice) + 1);
        const keys = this.dirty.get(slice) ?? new Set();
        keys.add(key);
        this.dirty.set(slice, keys);
        this.schedule();
    }

    /**
     * Take live state as what the picture shows, with nothing left to derive: the baseline is
     * drawn by the renderer's first draw, not by a pass.
     */
    adoptBaseline(): void {
        this.dirty.clear();
        this.shown = snapshot(this.state);
    }

    /**
     * What the pass being derived is catching up with: `"command"` for a forward change, or the
     * history call or rollback that set the restoring flag.
     * @returns The cause.
     */
    get cause(): "command" | "undo" | "redo" | "restore" | "rollback" {
        return this.restoringFlag ? this.restoreCause : "command";
    }

    /**
     * What the pass running now catches up with, for the whole of the pass: `cause` turns back to
     * `"command"` once the `arrangement` hook has run, which hooks after it still need to know.
     * @returns The cause the pass started with.
     */
    get passCause(): "command" | "undo" | "redo" | "restore" | "rollback" {
        return this.passCauseValue;
    }

    /**
     * Set the restoring flag until the next pass has run its `arrangement` hook.
     * @param cause - What is restoring: an undo, a redo, a restore or a rollback.
     */
    restore(cause: "undo" | "redo" | "restore" | "rollback" = "restore"): void {
        this.restoringFlag = true;
        this.restoreCause = cause;
        this.restores++;
        this.schedule();
    }

    /**
     * Settles when the picture has caught up with every change made so far.
     * @returns The promise of the pass that takes the latest change; resolved at once when none
     * is scheduled or running.
     */
    settled(): Promise<void> {
        return (this.next ?? this.current)?.promise ?? Promise.resolve();
    }

    /** Make sure a pass will take the changes made so far. */
    private schedule(): void {
        if (this.next !== null) {
            return;
        }

        let resolve: () => void = () => undefined;
        const promise = new Promise<void>((yes) => {
            resolve = yes;
        });
        this.next = { promise, resolve };
        if (this.current === null) {
            queueMicrotask(() => {
                void this.drain();
            });
        }
    }

    /** Run passes until nothing is dirty. */
    private async drain(): Promise<void> {
        while (this.next !== null) {
            const pass = this.next;
            this.current = pass;
            this.next = null;
            const { dirty } = this;
            this.dirty = new Map();
            const { restores } = this;
            this.passCauseValue = this.cause;
            const target = snapshot(this.state);

            for (const slice of HOOK_ORDER) {
                const keys = dirty.get(slice);
                for (const hook of keys === undefined ? [] : [...(this.hooks.get(slice) ?? [])]) {
                    await this.call(hook, target, keys ?? new Set());
                }

                if (slice === "arrangement" && this.restores === restores) {
                    this.restoringFlag = false;
                }
            }

            this.shown = target;
            // Checked once the picture has caught up with live state: a pass that another will
            // follow draws a target that writes made since have already moved past.
            if (this.afterPass !== null && this.next === null) {
                try {
                    this.afterPass(this.state);
                } catch (error) {
                    this.onError(error);
                }
            }

            this.current = null;
            pass.resolve();
        }
    }

    /**
     * Call one hook, reporting what it throws.
     * @param hook - The hook.
     * @param target - The state the pass derives to.
     * @param keys - The slice's dirty keys.
     */
    private async call(hook: DeriveHook, target: ProjectState, keys: ReadonlySet<string>): Promise<void> {
        try {
            const out = hook(this.shown, target, keys);
            if (isThenable(out)) {
                await out;
            }
        } catch (error) {
            this.onError(error);
        }
    }
}
