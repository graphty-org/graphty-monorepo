/**
 * @file The one entry every door that changes a session's graph goes through, so they land in
 * the order they were asked for. A load that reads before it dispatches (a dataset download, a
 * network source, a file whose format has to be sniffed) takes its place when it is called, so a
 * later load that reads faster waits for it rather than landing first and being replaced by the
 * older one. `session.data`'s loads, edits and clear, `project.open` (and the autosave restore
 * through it) and the graph's own loads (`addDataFromSource`, `loadFromFile`, `loadFromUrl`, the
 * element's data-source pair and record assignments) share one line per session.
 *
 * How each kind of door is ordered against a load still reading (issue #3547):
 *
 * - a load ({@link LoadLine.join}) and `project.open` ({@link LoadLine.opening}) wait for it;
 * - an edit ({@link LoadLine.edit}) waits for it, then lands on what it loaded;
 * - a clear ({@link LoadLine.clear}) cancels it: it rejects with `E_SUPERSEDED` and adds nothing.
 *
 * `test/session/load-entry.test.ts` holds every graph-changing session door to this, from the
 * door list's ordering column (`LOAD_ORDER` in `commands/doors.ts`). Internal.
 */

import { GraphtyError } from "../errors/GraphtyError";

/** One load's place in line. */
export interface LoadTurn {
    /**
     * What to wait for before dispatching: every load asked for earlier has dispatched its step or
     * failed. Undefined when none is waiting, so a load with nothing ahead dispatches at once.
     * When the load was given a signal, the wait rejects with its reason once it aborts, and the
     * load gives up its place.
     * @returns The wait, or undefined.
     */
    wait(): Promise<void> | undefined;
    /**
     * Dispatch the step now and give up the place, so the next load may dispatch its own.
     * @param send - The dispatch.
     * @returns What it returned.
     */
    issue<T>(send: () => Promise<T>): Promise<T>;
    /**
     * Wait for the turn, then {@link issue}: at once, before this call returns, when none is ahead.
     * @param send - The dispatch.
     * @returns What it returned.
     */
    take<T>(send: () => Promise<T>): Promise<T>;
    /** Give up the place without dispatching (the load failed). Safe to call more than once. */
    leave(): void;
}

/** What a session's load line reads of its dispatcher. */
interface LineOwner {
    /** Whether a door is being called from inside a transaction or a running command. */
    readonly routing: boolean;
}

/** The kinds of place in line: a load is cancelled by a clear asked for after it, an edit is not. */
type PlaceKind = "load" | "edit";

/**
 * The refusal of a load a clear overtook while it was still reading.
 * @returns The error.
 */
function supersededError(): GraphtyError {
    return new GraphtyError({
        code: "E_SUPERSEDED",
        source: "data",
        message: "The load was overtaken by a clear asked for after it, so it added nothing.",
    });
}

/** A place that is no place: a door called inside an opening project dispatches at once. */
const AT_ONCE: LoadTurn = {
    wait: () => undefined,
    issue: (send) => send(),
    take: (send) => send(),
    leave: () => undefined,
};

/**
 * The load options every load door takes, applied in one place: `history: "start"` marks the
 * load's command as where the history starts.
 * @param choices - The door's options.
 * @param choices.history - Whether the load starts the history.
 * @returns What to spread into the load's command.
 */
export function historyMark(choices: { readonly history?: string }): { startsHistory?: true } {
    return choices.history === "start" ? { startsHistory: true } : {};
}

/** The lines, one per session, by the session's dispatcher. */
const LINES = new WeakMap<LineOwner, LoadLine>();

/**
 * The load line of a session, shared by every door that loads into it.
 * @param owner - The session's dispatcher.
 * @returns Its line.
 */
export function loadLineOf(owner: LineOwner): LoadLine {
    let line = LINES.get(owner);
    if (line === undefined) {
        line = new LoadLine(owner);
        LINES.set(owner, line);
    }
    return line;
}

/**
 * A wait that ends early, rejecting, once the signal aborts.
 * @param ahead - The wait; it never rejects.
 * @param signal - The load's signal.
 * @param leave - Gives up the load's place.
 * @returns The wait.
 */
function abortable(ahead: Promise<void>, signal: AbortSignal, leave: () => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const abort = (): void => {
            leave();
            reject(signal.reason as Error);
        };
        if (signal.aborted) {
            abort();
            return;
        }
        signal.addEventListener("abort", abort, { once: true });
        void ahead.then(() => {
            signal.removeEventListener("abort", abort);
            if (signal.aborted) {
                abort();
            } else {
                resolve();
            }
        });
    });
}

/** The loads of one session, in the order they were asked for. */
export class LoadLine {
    /** Settles once every load that joined so far has left. */
    private tail: Promise<void> = Promise.resolve();
    /** How many joined and have not left. */
    private waiting = 0;
    /** A place handed to the next `join`, by {@link within}. */
    private handoff: LoadTurn | undefined;
    /** The loads that joined and have not left, each with what cancels it: what a clear cancels. */
    private readonly loads = new Map<LoadTurn, () => void>();
    /** How many project opens hold the head of the line while they write. */
    private holding = 0;

    /**
     * Build a session's line.
     * @param owner - The session's dispatcher.
     */
    constructor(private readonly owner: LineOwner = { routing: false }) {}

    /**
     * Whether a door is called from inside a project open that holds the head of the line: it is
     * part of that open, so it dispatches at once, into the open's transaction.
     * ponytail: any routed door counts while an open holds the line; tell transactions apart if
     * a consumer's own transaction ever runs beside an open.
     * @returns True inside one.
     */
    private inside(): boolean {
        return this.holding > 0 && this.owner.routing;
    }

    /**
     * Run `start` with `turn` handed to the first load it asks for, so a door that waited for its
     * turn and then asks another door to load keeps its own place instead of joining at the back.
     * The door must take its place synchronously, as every load door does.
     * @param turn - The place, already at the head of the line.
     * @param start - Asks for the load.
     * @returns What `start` returned.
     */
    within<T>(turn: LoadTurn, start: () => T): T {
        this.handoff = turn;
        try {
            return start();
        } finally {
            this.handoff = undefined;
        }
    }

    /**
     * Take a place behind every load asked for before this one. Call it synchronously, at the
     * moment the load is asked for, and leave once the step is dispatched or the load failed.
     *
     * A load waits for the one ahead of it however long that one reads: a download that never
     * finishes holds back every load asked for after it until it fails or its signal aborts.
     * A clear asked for after it cancels the load until it dispatches: its wait rejects with
     * `E_SUPERSEDED`, and it gives up its place at once.
     * @param signal - The load's signal: aborting it while the load waits gives up its place.
     * @param kind - `edit` for a place a clear does not cancel.
     * @returns The place.
     */
    join(signal?: AbortSignal, kind: PlaceKind = "load"): LoadTurn {
        const handed = this.handoff;
        if (handed !== undefined) {
            this.handoff = undefined;
            return handed;
        }
        if (this.inside()) {
            return AT_ONCE;
        }

        const ahead = this.waiting === 0 ? undefined : this.tail;
        this.waiting++;
        let release = (): void => undefined;
        const own = new Promise<void>((resolve) => {
            release = resolve;
        });
        // A load that fails while one ahead of it still reads must not let a later one past it.
        this.tail = ahead === undefined ? own : Promise.all([ahead, own]).then(() => undefined);
        let left = false;
        let superseded = false;
        // Rejects the wait a clear overtook, however long the load ahead of it still reads.
        let cancelWait = (): void => undefined;
        const leave = (): void => {
            if (!left) {
                left = true;
                this.waiting--;
                this.loads.delete(turn);
                release();
            }
        };
        const queued = (): Promise<void> | undefined => {
            if (signal?.aborted === true) {
                // Aborted before its turn came: it never dispatches, wherever it stands in line.
                return abortable(Promise.resolve(), signal, leave);
            }
            return ahead === undefined || signal === undefined ? ahead : abortable(ahead, signal, leave);
        };
        const wait = (): Promise<void> | undefined => {
            if (superseded) {
                return Promise.reject(supersededError());
            }
            const before = queued();
            if (before === undefined) {
                return undefined;
            }
            return new Promise<void>((resolve, reject) => {
                cancelWait = () => {
                    reject(supersededError());
                };
                before.then(() => {
                    if (superseded) {
                        reject(supersededError());
                    } else {
                        resolve();
                    }
                }, reject);
            });
        };
        const issue = <T>(send: () => Promise<T>): Promise<T> => {
            try {
                return superseded ? Promise.reject(supersededError()) : send();
            } finally {
                leave();
            }
        };
        const turn: LoadTurn = {
            wait,
            issue,
            take: (send) => wait()?.then(() => issue(send)) ?? issue(send),
            leave,
        };
        if (kind === "load") {
            this.loads.set(turn, () => {
                superseded = true;
                leave();
                cancelWait();
            });
        }
        return turn;
    }

    /**
     * Dispatch an edit (an add, an update, a removal): in line behind every load asked for before
     * it, so it lands on what they loaded instead of under them, and at once when none is waiting.
     * A clear does not cancel it.
     * @param send - The dispatch, taken when the edit was asked for.
     * @returns What it returned.
     */
    edit<T>(send: () => Promise<T>): Promise<T> {
        return this.join(undefined, "edit").take(send);
    }

    /**
     * Dispatch a clear: every load asked for before it that has not dispatched is cancelled (it
     * rejects with `E_SUPERSEDED` and adds nothing), then the clear goes in line behind the edits
     * still waiting, at once when none is.
     * @param send - The dispatch, taken when the clear was asked for.
     * @returns What it returned.
     */
    clear<T>(send: () => Promise<T>): Promise<T> {
        if (this.inside()) {
            return send();
        }
        this.supersede();
        return this.edit(send);
    }

    /** Cancel every load waiting in line, as a clear does. */
    supersede(): void {
        for (const cancel of [...this.loads.values()]) {
            cancel();
        }
    }

    /**
     * Run a project open in its place: once every door asked for before it has dispatched, it
     * holds the head of the line while it writes, so a door asked for after it lands after it.
     * Doors it calls itself dispatch at once, into its transaction.
     * @param turn - The open's place, taken when it was asked for.
     * @param write - The open's writes.
     * @returns What `write` returned.
     */
    async opening<T>(turn: LoadTurn, write: () => Promise<T>): Promise<T> {
        try {
            await turn.wait();
            this.holding++;
            try {
                return await write();
            } finally {
                this.holding--;
            }
        } finally {
            turn.leave();
        }
    }

    /**
     * Dispatch a load that reads nothing first: in line behind every load asked for before it,
     * and at once when none is waiting.
     * @param send - The dispatch.
     * @returns What it returned.
     */
    run<T>(send: () => Promise<T>): Promise<T> {
        return this.join().take(send);
    }

    /**
     * How many doors hold a place and have not dispatched. Internal: the entry test reads it.
     * @returns The count.
     */
    get size(): number {
        return this.waiting;
    }
}
