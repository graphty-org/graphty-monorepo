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
//
// A page can still fail to connect with the hold in place (#8823: a CI run whose 60 s window opened
// after the bundle finished). Nothing in the log said why, so the hook also records what the page's
// server saw -- the hold, each request and which never finished, each WebSocket upgrade -- and prints
// it when a page never connects.

import { stripVTControlCharacters } from "node:util";

const WRAPPED = Symbol.for("graphty.vitest-deps-reload");
const HOOKED = Symbol.for("graphty.vitest-deps-hold");

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

const CONNECT_FAILED = "Failed to connect to the browser session";

/**
 * Records what a browser project's server saw on the way to its page connecting: when the dependency
 * hold began and ended, every HTTP request (and which never finished) and every WebSocket upgrade.
 * Printed only when a page never connects (#8823), so the next such failure names the stage that
 * stalled -- no request at all (Chromium never navigated), a request that never finished (the page
 * load), or no orchestrator upgrade.
 */
export class ConnectTimeline {
    /**
     * Starts an empty timeline.
     * @param name - the project's name
     * @param now - the clock
     */
    constructor(name, now = Date.now) {
        this.name = name;
        this.now = now;
        this.events = [];
        this.pending = new Map();
        this.served = 0;
    }

    /**
     * Records an event with the time.
     * @param what - the event
     */
    mark(what) {
        this.events.push(`${new Date(this.now()).toISOString()} ${what}`);
    }

    /**
     * Listens to a Vite dev server's HTTP server: its requests and upgrades.
     * @param httpServer - the node http server, if the server has one
     */
    watch(httpServer) {
        httpServer?.on("request", (req, res) => {
            if (this.served === 0 && this.pending.size === 0) {
                this.mark(`first request ${req.url}`);
            }
            this.pending.set(req, `${new Date(this.now()).toISOString()} ${req.url}`);
            res.on("close", () => {
                this.pending.delete(req);
                this.served++;
            });
        });
        httpServer?.on("upgrade", (req) => this.mark(`upgrade ${req.url}`));
    }

    /**
     * The timeline as lines to print.
     * @returns the lines
     */
    report() {
        return [
            `[browser connect] ${this.name}: what its server saw (#8823)`,
            ...this.events.map((line) => `  ${line}`),
            `  ${this.served} request(s) served, ${this.pending.size} never finished${this.pending.size ? ":" : ""}`,
            ...[...this.pending.values()].map((line) => `    ${line}`),
        ];
    }
}

const timelines = [];

/** The reporter hooks: hold each browser page until its dependencies are bundled, and explain a page that never connects. */
export const waitForBrowserDeps = {
    /**
     * Vitest awaits this after creating a project's browser server and before opening its page.
     * @param project - the vitest TestProject
     */
    async onBrowserInit(project) {
        const timeline = new ConnectTimeline(project.name);
        timelines.push(timeline);
        timeline.watch(project.browser?.vite.httpServer);
        timeline.mark("dependency hold begins");
        await depsOptimized(project.browser?.vite.environments.client?.depsOptimizer);
        timeline.mark("dependency hold ends; vitest opens the page");
    },
    /**
     * Prints every timeline when a page never connected.
     * @param _modules - the run's test modules
     * @param errors - the run's unhandled errors
     */
    onTestRunEnd(_modules, errors) {
        if (errors?.some((error) => String(error?.message).includes(CONNECT_FAILED))) {
            console.error(timelines.flatMap((timeline) => timeline.report()).join("\n"));
        }
    },
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
    // Each project's globalSetup imports its own copy of this module, so the mark is on vitest.
    if (!vitest[HOOKED]) {
        vitest[HOOKED] = true;
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
