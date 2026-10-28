// The machine and CI rules every Vitest config in the monorepo follows, in one place, so no config
// copies them by hand and misses one: the FC_FONTATIONS preset below, the machine-wide test slot,
// this run's share of the cores, and the CI reporters. Every vitest*.config.* imports this module
// (tools/vitest-base.test.mjs fails one that does not) and spreads `baseTest()` into its `test`.
// Project settings (plugins, browser, environment, timeouts, coverage) stay in each config.

import process from "node:process";
import { fileURLToPath, URL } from "node:url";

import { workerShare } from "./tools/test-slots.mjs";
import { ciReporters } from "./vitest.ci-junit.mjs";

// Every Playwright browser the test projects launch inherits this process's environment. Chromium
// 143 (Playwright's chromium_headless_shell-1200) calls setenv("FC_FONTATIONS", "1") from a font
// worker thread after its other threads are running. When the environment array has to grow for
// that entry, glibc reallocates it and Chrome's allocator frees the old copy; a D-Bus thread that is
// inside strerror -> getenv("LANGUAGE") at that moment (it is, on a machine with no system D-Bus
// socket) reads the freed array and the browser dies at startup with a general protection fault
// (SIGSEGV, ip in getenv). It only happens when the environment has one of the sizes at which the
// array moves (79, 95, 111, 127, ... entries), which is why it came and went between shells:
// 30 crashes in 800 launches on 2026-09-25, 0 in 800 with the value preset. Presetting the
// variable Chrome sets anyway makes its setenv an in-place overwrite, so nothing is freed (#3787).
process.env.FC_FONTATIONS ??= "1";

const TEST_SLOTS = fileURLToPath(new URL("./tools/test-slots.mjs", import.meta.url));
const DEPS_RELOAD = fileURLToPath(new URL("./tools/vitest-deps-reload.mjs", import.meta.url));

/**
 * The shared part of a config's `test` block: spread it in, then add the project's own settings.
 * Types and option docs: vitest.base.d.mts.
 * @param options - the config's own parts
 * @param options.reporters - the reporters before the CI ones
 * @param options.globalSetup - the config's own global setup files, after the shared ones
 * @param options.maxWorkers - defaults to this run's share of the cores
 * @param options.junit - options for the CI junit reporter
 * @returns the `globalSetup`, `maxWorkers` and `reporters` of a `test` block
 */
export function baseTest({ reporters = ["default"], globalSetup = [], maxWorkers = workerShare(), junit = {} } = {}) {
    return {
        // The machine-wide limit on concurrent test runs (tools/test-slots.mjs; off on GitHub Actions),
        // and a failed run when Vite finds a dependency mid-run and reloads a test page (#4145).
        globalSetup: [TEST_SLOTS, DEPS_RELOAD, ...globalSetup],
        maxWorkers,
        reporters: [...reporters, ...ciReporters(junit)],
    };
}

/**
 * The local reporter that prints a line per test, which in CI is noise.
 * @returns "verbose" locally, "default" in CI
 */
export const localVerbose = () => (process.env.CI ? "default" : "verbose");
