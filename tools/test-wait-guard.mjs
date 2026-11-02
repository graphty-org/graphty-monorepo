/**
 * The one hang guard of every test, story and wait in the monorepo, and the only place a test
 * deadline is set.
 *
 * Tests wait on conditions, never on the clock. A deadline -- Testing Library's 1000 ms default,
 * `vi.waitFor`'s, `expect.poll`'s, vitest's 5 s per test, a hand-set `{ timeout }` -- decides pass
 * or fail when the machine is busy while the work it waits on still finishes. So nothing in a test,
 * story, helper, setup file or vitest config sets one (tools/eslint-rules/no-test-timing.mjs
 * reports every local timeout, interval and deadline loop), and these guards are set once for
 * everything: a wait gives up only after WAIT_GUARD_MS and a test or hook after TEST_GUARD_MS.
 * The guards exist to end a hang with a message, never to judge speed, so they sit far above
 * what any real test needs on a loaded machine. Sized from the recorded runs (2026-10-23): the
 * slowest single test in about 1,970 local gate logs, under heavy load, took 177 s (a trivial
 * graphty-element browser test on a stalled machine); in CI the slowest were 237 s (the T4 lane's
 * 1M-entry hub cell case), 107 s (Safari on the iOS Simulator) and files of up to 373 s on the
 * GPU and host lanes. Taking 300 s as the slowest legitimate test, the test guard is 5x that;
 * a wait is at most a test, and the slowest observed (177 s) gets 5x as well.
 * A wait's guard is below the test's so a hung wait reports its last failure instead of a bare
 * "test timed out".
 *
 * Measurements are not tests and carry no guard: an inline project whose name starts with
 * "bench" (graphty-element's bench and bench-browser, webgpu-graph-algorithms' noise-floor
 * recording) is started by hand, never by the gate, and runs with no time limit at all.
 *
 * Every vitest config wraps its export in `withTestGuards`, and the setup file it adds
 * (vitest.wait-guard-setup.ts) gives `vi.waitFor` and `vi.waitUntil` the wait guard. Testing
 * Library keeps its default per copy of the library, so each setup file or Storybook preview that
 * loads one calls `configure({ asyncUtilTimeout: WAIT_GUARD_MS })`.
 */

/** How long one wait (waitFor, findBy*, vi.waitFor, expect.poll, expect.element) may run. */
export const WAIT_GUARD_MS = 900_000;

/** How long one test, hook or teardown may run. */
export const TEST_GUARD_MS = 1_500_000;

// Every package sits one directory below the repository root, and vitest resolves setup files from
// the package's root, as it does for ../vitest.browser-coverage-setup.ts.
const GUARD_SETUP = "../vitest.wait-guard-setup.ts";

/**
 * Sets the guards on one vitest `test` block, over anything it set itself.
 * @param test - a `test` block of a config or of one of its inline projects
 * @returns the block with the guards and the guard setup file
 */
function guardTest(test) {
    if (/^bench/.test(test.name ?? "")) {
        // A measurement: no time limit, so a slow one measures instead of failing.
        return { ...test, testTimeout: 0, hookTimeout: 0 };
    }
    const setupFiles = [test.setupFiles ?? []].flat().filter((f) => f !== GUARD_SETUP);
    return {
        ...test,
        testTimeout: TEST_GUARD_MS,
        hookTimeout: TEST_GUARD_MS,
        teardownTimeout: TEST_GUARD_MS,
        expect: { ...test.expect, poll: { timeout: WAIT_GUARD_MS } },
        setupFiles: [...setupFiles, GUARD_SETUP],
    };
}

/**
 * Puts the one hang guard on a vitest config and every inline project in it. Inline projects do
 * not inherit the root's `test` options, so each gets them; a project given as a path is left alone.
 * @param config - the object passed to `defineConfig`
 * @returns the same config, guarded
 */
export function withTestGuards(config) {
    const test = guardTest(config.test ?? {});
    if (Array.isArray(test.projects)) {
        test.projects = test.projects.map((p) =>
            p && typeof p === "object" && !Array.isArray(p) ? { ...p, test: guardTest(p.test ?? {}) } : p,
        );
    }
    return { ...config, test };
}

/**
 * Gives `vi.waitFor` and `vi.waitUntil` the wait guard as their only deadline. Vitest has no
 * setting for it (it is 1000 ms), so the guard setup file calls this once; a caller's own
 * `timeout` or `interval` is dropped.
 * @param vi - vitest's `vi`
 */
export function guardViWaits(vi) {
    for (const name of ["waitFor", "waitUntil"]) {
        const original = vi[name];
        if (original.guarded) {
            continue;
        }
        const guarded = (callback) => original(callback, { timeout: WAIT_GUARD_MS });
        guarded.guarded = true;
        vi[name] = guarded;
    }
}
