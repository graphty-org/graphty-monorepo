/**
 * @file The order a session's loads dispatch in: the order they were asked for. A load that
 * reads before it dispatches (a dataset download, a network source, a file whose format has to
 * be sniffed) takes its place when it is called, so a later load that reads faster waits for it
 * rather than landing first and being replaced by the older one. `session.data`'s loads and the
 * graph's own (`addDataFromSource`, `loadFromFile`, `loadFromUrl`, the element's data-source
 * pair) share one line per session. Internal.
 */

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
    /** Give up the place without dispatching (the load failed). Safe to call more than once. */
    leave(): void;
}

/** The lines, one per session, by the session's dispatcher. */
const LINES = new WeakMap<object, LoadLine>();

/**
 * The load line of a session, shared by every door that loads into it.
 * @param owner - The session's dispatcher.
 * @returns Its line.
 */
export function loadLineOf(owner: object): LoadLine {
    let line = LINES.get(owner);
    if (line === undefined) {
        line = new LoadLine();
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

    /**
     * Take a place behind every load asked for before this one. Call it synchronously, at the
     * moment the load is asked for, and leave once the step is dispatched or the load failed.
     *
     * A load waits for the one ahead of it however long that one reads: a download that never
     * finishes holds back every load asked for after it until it fails or its signal aborts.
     * @param signal - The load's signal: aborting it while the load waits gives up its place.
     * @returns The place.
     */
    join(signal?: AbortSignal): LoadTurn {
        const ahead = this.waiting === 0 ? undefined : this.tail;
        this.waiting++;
        let release = (): void => undefined;
        const own = new Promise<void>((resolve) => {
            release = resolve;
        });
        // A load that fails while one ahead of it still reads must not let a later one past it.
        this.tail = ahead === undefined ? own : Promise.all([ahead, own]).then(() => undefined);
        let left = false;
        const leave = (): void => {
            if (!left) {
                left = true;
                this.waiting--;
                release();
            }
        };
        return {
            wait: () => {
                if (signal?.aborted === true) {
                    // Aborted before its turn came: it never dispatches, wherever it stands in line.
                    return abortable(Promise.resolve(), signal, leave);
                }
                return ahead === undefined || signal === undefined ? ahead : abortable(ahead, signal, leave);
            },
            issue: (send) => {
                try {
                    return send();
                } finally {
                    leave();
                }
            },
            leave,
        };
    }

    /**
     * Dispatch a load that reads nothing first: in line behind every load asked for before it,
     * and at once when none is waiting.
     * @param send - The dispatch.
     * @returns What it returned.
     */
    run<T>(send: () => Promise<T>): Promise<T> {
        const turn = this.join();
        const ahead = turn.wait();
        return ahead === undefined ? turn.issue(send) : ahead.then(() => turn.issue(send));
    }
}
