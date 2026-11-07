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
 * Those two guards are timers in the test's own thread, so they cannot end everything. A page that
 * is blocked (a synchronous read from a software GPU, a loop), or a file whose imports never settle,
 * never runs them; and a file of tests that each stay under TEST_GUARD_MS never reaches them, however
 * long the file takes (#5816: a file of tests of ten minutes each ran on past an hour). So vitest's
 * own process, which neither can block, holds a third guard: FILE_GUARD_MS on one test file
 * (tools/vitest-file-guard.mjs). It sits above TEST_GUARD_MS so a test that hangs in a page that
 * still runs is ended by the test guard, with its stack.
 *
 * Each file can stay under FILE_GUARD_MS while a job of several files outlasts the CI job, so CI's test job also
 * stops the whole run itself and names what was running (TEST_STEP_LIMIT_MS, tools/results/run-group.mjs).
 *
 * Measurements are not tests and carry no guard: an inline project whose name starts with
 * "bench" (graphty-element's bench and bench-browser, webgpu-graph-algorithms' noise-floor
 * recording) is started by hand, never by the gate, and runs with no time limit at all.
 *
 * Every vitest config wraps its export in `withTestGuards`, and the setup file it adds
 * (vitest.wait-guard-setup.ts) gives `vi.waitFor` and `vi.waitUntil` the wait guard. Testing
 * Library keeps its default per copy of the library, so each setup file or Storybook preview that
 * loads one calls `configure({ asyncUtilTimeout: WAIT_GUARD_MS })`.
 *
 * A real `userEvent` action is a wait too: Playwright retries until the target can take it. With no
 * `actionTimeout`, vitest gives the action what is left of the test's time, so a click on something
 * that never shows (a hidden radio, issue #5845) ran the full test guard and ended as a bare "Test
 * timed out". `withTestGuards` gives every Playwright provider the wait guard, so the action fails
 * first and says what it was waiting for.
 */

/** How long one wait (waitFor, findBy*, vi.waitFor, expect.poll, expect.element, a real action) may run. */
export const WAIT_GUARD_MS = 900_000;

/** How long one test, hook or teardown may run. */
export const TEST_GUARD_MS = 1_500_000;

/** How long one test file may run, from the moment it is handed to its page or worker. */
export const FILE_GUARD_MS = TEST_GUARD_MS + 60_000;

/**
 * The guard setup file as an absolute path, so a config at any depth (a package, tools/pipeline-health,
 * a nested fixture suite) adds the same file; vitest resolves a relative one from the config's root.
 * A function, and no node:url, because this module is also loaded inside test environments (a browser
 * page, where import.meta.url is not a file URL), and only a config needs the path.
 * @returns the path of vitest.wait-guard-setup.ts
 */
function guardSetup() {
    return decodeURIComponent(new URL("../vitest.wait-guard-setup.ts", import.meta.url).pathname);
}

/**
 * Gives every Playwright provider of a `browser` block the wait guard as its action deadline: the
 * block's own and any an instance carries, which wins over it. In place, because the provider reads
 * the object `playwright()` was handed, and a copy of it would change nothing.
 * @param browser - the `browser` block of a `test` block
 */
function guardActions(browser) {
    for (const provider of [browser.provider, ...(browser.instances ?? []).map((i) => i.provider)]) {
        if (provider?.name === "playwright") {
            provider.options.actionTimeout = WAIT_GUARD_MS;
        }
    }
}

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
    const guard = guardSetup();
    const setupFiles = [test.setupFiles ?? []].flat().filter((f) => f !== guard);
    if (test.browser) {
        guardActions(test.browser);
    }
    return {
        ...test,
        testTimeout: TEST_GUARD_MS,
        hookTimeout: TEST_GUARD_MS,
        teardownTimeout: TEST_GUARD_MS,
        expect: { ...test.expect, poll: { timeout: WAIT_GUARD_MS } },
        setupFiles: [...setupFiles, guard],
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
