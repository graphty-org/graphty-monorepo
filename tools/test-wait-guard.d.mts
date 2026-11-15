/** How long one wait (waitFor, findBy*, vi.waitFor, expect.poll, expect.element) may run. */
export declare const WAIT_GUARD_MS: number;
/** How long one test, hook or teardown may run. */
export declare const TEST_GUARD_MS: number;
/** Puts the one hang guard on a vitest config and every inline project in it. */
export declare function withTestGuards<T extends object>(config: T): T;
/** Gives `vi.waitFor` and `vi.waitUntil` the wait guard as their only deadline. */
export declare function guardViWaits(vi: { waitFor: unknown; waitUntil: unknown }): void;
