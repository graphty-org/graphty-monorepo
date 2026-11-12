/**
 * The environment an autosave unit test controls: a clock whose time moves only when the test
 * moves it, and locks shared by the writers of one test the way Web Locks are shared by the tabs
 * of one origin.
 */

import type { AutosaveClock, AutosaveLocks } from "../../src/autosave/Autosaver";

interface Pending {
    readonly id: number;
    readonly at: number;
    readonly fn: () => void;
    readonly idle: boolean;
}

/** A clock that moves only when the test advances it, and is idle only when the test says so. */
export class FakeClock implements AutosaveClock {
    #time = Date.UTC(2026, 9, 13, 12);
    #next = 0;
    #pending: Pending[] = [];
    /** Timers and idle callbacks that have fired. */
    fired = 0;

    now(): number {
        return this.#time;
    }

    setTimer(fn: () => void, ms: number): () => void {
        return this.#add(fn, ms, false);
    }

    idle(fn: () => void, timeoutMs: number): () => void {
        return this.#add(fn, timeoutMs, true);
    }

    /**
     * Whether an idle callback is waiting.
     * @returns True when one is.
     */
    get idleWaiting(): boolean {
        return this.#pending.some((each) => each.idle);
    }

    /**
     * Move time forward, firing every timer and idle deadline that falls due, in order.
     * @param ms - How far.
     */
    advance(ms: number): void {
        const end = this.#time + ms;
        for (;;) {
            const due = this.#pending.filter((each) => each.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0];
            if (due === undefined) {
                break;
            }

            this.#time = Math.max(this.#time, due.at);
            this.#fire(due);
        }

        this.#time = end;
    }

    /**
     * The main thread is blocked (a long frame, a frozen page): time passes and nothing fires.
     * The next {@link advance} fires what fell due meanwhile, late.
     * @param ms - How long.
     */
    block(ms: number): void {
        this.#time += ms;
    }

    /** The page goes idle: every idle callback fires now. */
    goIdle(): void {
        for (const each of this.#pending.filter((pending) => pending.idle)) {
            this.#fire(each);
        }
    }

    #fire(pending: Pending): void {
        this.#pending = this.#pending.filter((each) => each !== pending);
        this.fired += 1;
        pending.fn();
    }

    #add(fn: () => void, ms: number, idle: boolean): () => void {
        const pending: Pending = { id: this.#next++, at: this.#time + ms, fn, idle };
        this.#pending.push(pending);
        return () => {
            this.#pending = this.#pending.filter((each) => each !== pending);
        };
    }
}

/** Locks shared by every writer given the same object, like the tabs of one origin. */
export class FakeLocks implements AutosaveLocks {
    readonly #held = new Set<string>();

    claim(name: string): Promise<(() => void) | null> {
        if (this.#held.has(name)) {
            return Promise.resolve(null);
        }

        this.#held.add(name);
        return Promise.resolve(() => {
            this.#held.delete(name);
        });
    }

    held(): Promise<ReadonlySet<string>> {
        return Promise.resolve(new Set(this.#held));
    }

    /**
     * Hold a lock as another tab would.
     * @param name - The lock.
     */
    holdElsewhere(name: string): void {
        this.#held.add(name);
    }
}
