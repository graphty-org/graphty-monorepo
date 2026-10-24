/**
 * @file The order `session.data`'s loads dispatch in: the order they were asked for. A load that
 * reads before it dispatches (a dataset download, a network source, a file whose format has to
 * be sniffed) takes its place when it is called, so a later load that reads faster waits for it
 * rather than landing first and being replaced by the older one. Internal.
 */

/** One load's place in line. */
export interface LoadTurn {
    /**
     * What to wait for before dispatching: every load asked for earlier has dispatched its step or
     * failed. Undefined when none is waiting, so a load with nothing ahead dispatches at once.
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

/** The loads of one session, in the order they were asked for. */
export class LoadLine {
    /** Settles once every load that joined so far has left. */
    private tail: Promise<void> = Promise.resolve();
    /** How many joined and have not left. */
    private waiting = 0;

    /**
     * Take a place behind every load asked for before this one. Call it synchronously, at the
     * moment the load is asked for, and leave once the step is dispatched or the load failed.
     * @returns The place.
     */
    join(): LoadTurn {
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
            wait: () => ahead,
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
}
