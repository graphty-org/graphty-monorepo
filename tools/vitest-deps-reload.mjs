// A vitest globalSetup (every config gets it through baseTest() in vitest.base.mjs) that fails the run
// when Vite finds a dependency while tests are running (#4145).
//
// Vite pre-bundles a browser project's dependencies from a scan at start-up. A dependency the scan
// missed is found when a test first imports it: Vite re-bundles, changes the deps ?v= hash and reloads
// the page, and whichever test file was importing at that moment fails as a whole file ("Failed to
// fetch dynamically imported module .../deps/...?v=..."). Vite and vitest only print a warning, so the
// run passed or failed depending on where the reload landed. A failed scan is the same thing for every
// dependency at once. Both now fail the run, naming the dependencies: add them to the project's
// `optimizeDeps.include`.
//
// Both messages reach the terminal through the one vitest logger (vitest's Vite logger writes to it),
// so wrapping it once covers every project of the run, browser servers included.
//
// It also holds each browser project's first page until that project's Vite server has finished its
// start-up dependency scan and bundle (#8352). Vitest opens the page as soon as the server listens and
// gives Chromium `browser.connectTimeout` (60 s) to connect, but Vite holds the page's first request
// until the scan ends, and with `optimizeDeps.force` the scan and bundle are a full re-optimization:
// measured pinned to one core beside a typecheck, the scan alone took 5.6 to 16 s and the bundle 19 to
// 31 s, all inside the connect window, so a slow run failed "Failed to connect to the browser session
// ... within the timeout" with Chromium itself up in 2.5 s. Waiting in vitest's onBrowserInit, which it
// awaits before launching the browser, leaves only the browser's own start-up in that window. A
// reporter on the command line (--reporter, as the CI shards pass) replaces the config's reporters, so
// the hook is added to the run's reporter list here rather than in `reporters`.

import { stripVTControlCharacters } from "node:util";

const WRAPPED = Symbol.for("graphty.vitest-deps-reload");

const RELOAD = "optimized dependencies changed. reloading";
const SCAN_FAILED = "Failed to run dependency scan";
// A scan cut short because the server is closing at the end of the run is not a missed dependency.
const CLOSING = "The server is being restarted or closed";
const NEW_DEPS = /new dependencies optimized: (.*)/;

/**
 * Wraps a logger's log, warn and error so a mid-run dependency reload or a failed dependency scan
 * calls `fail` with a message naming what to do.
 * @param logger - the vitest logger (anything with log, warn and error methods)
 * @param fail - called with an Error once per event
 * @returns the logger
 */
export function watchLogger(logger, fail) {
    if (logger[WRAPPED]) {
        return logger;
    }
    logger[WRAPPED] = true;
    let lastNew = "";
    for (const method of ["log", "warn", "error"]) {
        const original = logger[method];
        if (typeof original !== "function") {
            continue;
        }
        logger[method] = function (...args) {
            const result = original.apply(this, args);
            // Vite colors its messages; the names are read without the escape codes.
            const text = stripVTControlCharacters(args.map(String).join(" "));
            const found = NEW_DEPS.exec(text);
            if (found) {
                lastNew = found[1].trim();
            }
            if (text.includes(RELOAD)) {
                fail(
                    new Error(
                        `Vite found dependencies while tests were running (${lastNew || "names not printed"}) and reloaded the test page, ` +
                            "which fails whichever test file is importing at that moment. Add them to this project's optimizeDeps.include (#4145).",
                    ),
                );
            } else if (text.includes(SCAN_FAILED) && !text.includes(CLOSING)) {
                fail(
                    new Error(
                        "Vite's dependency scan failed, so dependencies will be found while tests run and reload test pages. " +
                            "Fix the scan error printed above (often a workspace package that is not built) (#4145).",
                    ),
                );
            }
            return result;
        };
    }
    return logger;
}

/**
 * Settles once a Vite environment's start-up dependency optimization is done: the scan, then the
 * bundle of everything it found. Vite settles both on failure too, and a cached run (no `force`, cache
 * still valid) has nothing to wait for.
 * @param optimizer - the environment's `depsOptimizer`, if it has one
 */
export async function depsOptimized(optimizer) {
    if (!optimizer) {
        return;
    }
    await optimizer.init();
    await optimizer.scanProcessing;
    await Promise.all(Object.values(optimizer.metadata.discovered).map((dep) => dep.processing));
}

/** The reporter hook vitest awaits after creating a project's browser server and before opening its page. */
export const waitForBrowserDeps = {
    onBrowserInit: (project) => depsOptimized(project.browser?.vite.environments.client?.depsOptimizer),
};

/**
 * The globalSetup: hold each browser page until its dependencies are bundled, and watch the run's
 * logger; a match fails the run (exit code 1, and an unhandled error in the summary and the reports).
 * @param project - the vitest TestProject
 */
export default function setup(project) {
    const vitest = project?.vitest;
    if (!vitest) {
        return;
    }
    // vitest.reporters is not in vitest's types; fail loudly if an upgrade moves it.
    if (!Array.isArray(vitest.reporters)) {
        throw new TypeError(
            "tools/vitest-deps-reload.mjs: vitest.reporters is gone; re-home the onBrowserInit hook (#8352)",
        );
    }
    if (!vitest.reporters.includes(waitForBrowserDeps)) {
        vitest.reporters.push(waitForBrowserDeps);
    }
    if (!vitest.logger || vitest.config?.watch) {
        return;
    }
    watchLogger(vitest.logger, (error) => {
        process.exitCode = 1;
        vitest.state?.catchError?.(error, "Unhandled Error");
    });
}
