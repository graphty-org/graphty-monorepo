/**
 * The one hang guard of every test, story and wait in the monorepo.
 *
 * Tests wait on conditions, never on the clock (tools/eslint-rules/no-test-timing.mjs). A deadline
 * on a wait -- Testing Library's 1000 ms default, `vi.waitFor`'s, `expect.poll`'s, a hand-set
 * `{ timeout }` -- decides pass or fail when the machine is busy while the work it waits on still
 * finishes, so the lint rule forbids hand-set ones and each package sets these instead, once, in
 * its config and setup: a wait gives up only after WAIT_GUARD_MS, and a test or hook after
 * TEST_GUARD_MS. Both are far above how long anything takes on a loaded machine: they exist to end
 * a hang with a message, never to judge speed. A wait's guard is below the test's so a hung wait
 * reports its last failure instead of a bare "test timed out".
 */

/** How long one wait (waitFor, findBy*, vi.waitFor, expect.poll, expect.element) may run. */
export const WAIT_GUARD_MS = 60_000;

/** How long one test or hook may run: `testTimeout` and `hookTimeout` of every project. */
export const TEST_GUARD_MS = 180_000;

/**
 * The guards as vitest `test` options, for every project of every package to spread: a project
 * that does not extend the root config gets nothing from it.
 */
export const TEST_GUARDS = {
    testTimeout: TEST_GUARD_MS,
    hookTimeout: TEST_GUARD_MS,
    expect: { poll: { timeout: WAIT_GUARD_MS } },
};

/**
 * Gives `vi.waitFor` and `vi.waitUntil` the wait guard as their default deadline. Vitest has no
 * setting for it (it is 1000 ms), so a setup file calls this once.
 * @param vi - vitest's `vi`
 */
export function guardViWaits(vi) {
    for (const name of ["waitFor", "waitUntil"]) {
        const original = vi[name];
        if (original.guarded) {
            continue;
        }
        const guarded = (callback, options) =>
            original(callback, {
                timeout: WAIT_GUARD_MS,
                ...(typeof options === "number" ? { timeout: options } : options),
            });
        guarded.guarded = true;
        vi[name] = guarded;
    }
}
