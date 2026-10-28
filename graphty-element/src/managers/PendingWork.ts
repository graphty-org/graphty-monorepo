/**
 * @file The one record of work that will still change the picture (issue #3546).
 *
 * "The picture is final" used to be a hand-kept AND of checks in UpdateManager, copied into the
 * timeout message, and every new kind of asynchronous work (a basemap import, a tile, a node's
 * picture) escaped it until someone added it by hand. Here every source of such work is entered
 * once, in one of two ways:
 *
 * - a token: `begin()` when the work starts, the returned release when it ends (`track()` does
 *   both around a promise). For work with a start and an end: a module import, a download, a decode.
 * - a watch: a live question asked every time completion is asked. For state that is already
 *   kept somewhere (a running layout, a queued repaint, a texture cache's loading flag).
 *
 * And one picture counter, the epoch: every change to the picture, and every token released (its
 * work has landed), moves it on. A frame is final only when nothing here is pending AND it was
 * drawn at the current epoch; UpdateManager asks both live, when a frame is drawn and when a wait
 * asks, never from a flag cached at the end of a pass.
 *
 * Asynchronous entry points in graphty-element's source are inventoried by
 * test/managers/pending-work-inventory.test.ts, which fails on one that is neither entered here nor
 * said to change nothing on the canvas.
 */

/**
 * What a piece of work holds back. `picture`: the frame on screen is not final while it runs (a
 * tile, a repaint, a layout). `wait`: the frame on screen is final about the graph it shows, but
 * a wait for the final picture still waits for it, because it is going to change the graph (a
 * queued operation).
 */
export type PendingScope = "picture" | "wait";

/** One thing the picture still waits for: what kind of work, and why, in a consumer's words. */
export interface PendingItem {
    /** The kind of work, e.g. `"layout"`, `"basemap"`, `"shader"`. */
    readonly kind: string;
    /** One phrase naming what is unfinished, for the message a timed-out wait carries. */
    readonly reason: string;
    /** What it holds back; see {@link PendingScope}. */
    readonly scope: PendingScope;
}

/** A watch: state kept elsewhere, asked live. */
interface Watch extends PendingItem {
    readonly pending: () => boolean;
}

/** The record of pending picture work; see the file comment. */
export class PendingWork {
    #epoch = 0;
    #nextToken = 0;
    readonly #open = new Map<number, PendingItem>();
    /** In the order they were entered: the first pending one names the reason. */
    readonly #watches = new Set<Watch>();
    readonly #listeners = new Set<() => void>();

    /**
     * The picture counter: moved on by every change to the picture and every token released.
     * @returns The current epoch.
     */
    get epoch(): number {
        return this.#epoch;
    }

    /** Say that the picture changed, so a frame drawn before now is no longer the final one. */
    changed(): void {
        this.#epoch++;
        for (const listener of this.#listeners) {
            listener();
        }
    }

    /**
     * Start a piece of work that will change the picture.
     * @param kind - The kind of work.
     * @param reason - What is unfinished while it runs.
     * @param scope - What it holds back; the picture by default.
     * @returns The release: call it once the work has landed (or failed); later calls do nothing.
     */
    begin(kind: string, reason: string, scope: PendingScope = "picture"): () => void {
        const token = this.#nextToken++;
        this.#open.set(token, { kind, reason, scope });
        return () => {
            // The work landed: the frame before it does not show it, whatever else holds.
            if (this.#open.delete(token)) {
                this.changed();
            }
        };
    }

    /**
     * Hold a token while a promise runs.
     * @param kind - The kind of work.
     * @param reason - What is unfinished while it runs.
     * @param work - The work.
     * @returns The same promise's result.
     */
    async track<T>(kind: string, reason: string, work: Promise<T>): Promise<T> {
        const release = this.begin(kind, reason);
        try {
            return await work;
        } finally {
            release();
        }
    }

    /**
     * Enter state kept elsewhere that says whether work is still on its way.
     * @param kind - The kind of work.
     * @param reason - What is unfinished while it says so.
     * @param pending - Asked live, every time completion is asked; must be cheap and must not throw.
     * @param scope - What it holds back; the picture by default.
     * @returns Removes the watch.
     */
    watch(kind: string, reason: string, pending: () => boolean, scope: PendingScope = "picture"): () => void {
        const entry: Watch = { kind, reason, pending, scope };
        this.#watches.add(entry);
        return () => {
            if (this.#watches.delete(entry)) {
                this.changed();
            }
        };
    }

    /**
     * The first thing still pending: an open token first, then the watches in the order they were
     * entered.
     * @param scope - `picture` asks only what holds the frame; `wait` asks everything.
     * @returns The item, or null when nothing is pending.
     */
    firstPending(scope: PendingScope = "picture"): PendingItem | null {
        const counts = (item: PendingItem): boolean => scope === "wait" || item.scope === "picture";
        for (const item of this.#open.values()) {
            if (counts(item)) {
                return item;
            }
        }

        for (const entry of this.#watches) {
            if (counts(entry) && entry.pending()) {
                return entry;
            }
        }

        return null;
    }

    /**
     * Whether nothing that holds the frame is pending.
     * @returns True when no such token is open and no such watch says work is on its way.
     */
    get idle(): boolean {
        return this.firstPending("picture") === null;
    }

    /**
     * Call back on every change to the picture and every release, so a waiter asks again.
     * @param listener - Called synchronously; must not throw.
     * @returns Stops listening.
     */
    onChange(listener: () => void): () => void {
        this.#listeners.add(listener);
        return () => {
            this.#listeners.delete(listener);
        };
    }
}
