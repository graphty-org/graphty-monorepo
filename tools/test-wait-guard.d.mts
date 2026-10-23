/** How long one wait (waitFor, findBy*, vi.waitFor, expect.poll, expect.element) may run. */
export declare const WAIT_GUARD_MS: number;
/** How long one test or hook may run: `testTimeout` and `hookTimeout` of every project. */
export declare const TEST_GUARD_MS: number;
/** Gives `vi.waitFor` and `vi.waitUntil` the wait guard as their default deadline. */
export declare function guardViWaits(vi: { waitFor: unknown; waitUntil: unknown }): void;
/** The guards as vitest `test` options, for every project to spread. */
export declare const TEST_GUARDS: {
    testTimeout: number;
    hookTimeout: number;
    expect: { poll: { timeout: number } };
};
