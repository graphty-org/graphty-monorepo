// A mid-run dependency reload or a failed dependency scan fails the vitest run (#4145).
//
//   node --test tools/vitest-deps-reload.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EventEmitter } from "node:events";

import setup, { ConnectTimeline, depsOptimized, waitForBrowserDeps, watchLogger } from "./vitest-deps-reload.mjs";

const fakeLogger = () => {
    const lines = [];
    return { lines, log: (m) => lines.push(m), warn: (m) => lines.push(m), error: (m) => lines.push(m) };
};

// What vitest's Vite logger prints, colors included (graph-io fidelity story tests, run 40616061520).
const NEW =
    "1:47:36 AM \u001b[36m[vite]\u001b[39m (client) \u001b[32mnew dependencies optimized: \u001b[33m@hpcc-js/wasm-graphviz\u001b[32m\u001b[39m";
const RELOAD =
    "1:47:36 AM \u001b[36m[vite]\u001b[39m (client) \u001b[32moptimized dependencies changed. reloading\u001b[39m";

describe("vitest-deps-reload", () => {
    it("fails on a mid-run reload, naming the dependencies, and still prints the line", () => {
        const logger = fakeLogger();
        const errors = [];
        watchLogger(logger, (e) => errors.push(e));
        logger.log(NEW);
        logger.log(RELOAD);
        assert.equal(errors.length, 1);
        assert.match(errors[0].message, /\(@hpcc-js\/wasm-graphviz\)/);
        assert.match(errors[0].message, /optimizeDeps\.include/);
        assert.deepEqual(logger.lines, [NEW, RELOAD]);
    });

    it("fails on a failed dependency scan, but not on one cut short by the server closing", () => {
        const logger = fakeLogger();
        const errors = [];
        watchLogger(logger, (e) => errors.push(e));
        logger.error(
            "(!) Failed to run dependency scan. Skipping dependency pre-bundling. Error: The server is being restarted or closed. Request is outdated",
        );
        assert.equal(errors.length, 0);
        logger.error(
            '(!) Failed to run dependency scan. Skipping dependency pre-bundling. Error: Failed to resolve entry for package "babylonjs-map"',
        );
        assert.equal(errors.length, 1);
        assert.match(errors[0].message, /dependency scan failed/);
    });

    it("ignores new dependencies found without a reload, and wraps a logger once", () => {
        const logger = fakeLogger();
        const errors = [];
        watchLogger(logger, (e) => errors.push(e));
        watchLogger(logger, (e) => errors.push(e));
        logger.log(NEW);
        logger.warn("[vitest] Vite unexpectedly reloaded a test.");
        assert.equal(errors.length, 0);
        logger.log(RELOAD);
        assert.equal(errors.length, 1);
    });

    it("as the globalSetup, sets the exit code and reports an unhandled error", () => {
        const caught = [];
        const vitest = {
            logger: fakeLogger(),
            config: {},
            reporters: [],
            state: { catchError: (e, type) => caught.push([e, type]) },
        };
        const before = process.exitCode;
        try {
            setup({ vitest });
            vitest.logger.log(RELOAD);
            assert.equal(process.exitCode, 1);
            assert.equal(caught.length, 1);
            assert.equal(caught[0][1], "Unhandled Error");
        } finally {
            process.exitCode = before;
        }
    });

    it("leaves watch mode alone", () => {
        const vitest = { logger: fakeLogger(), config: { watch: true }, reporters: [] };
        setup({ vitest });
        const before = process.exitCode;
        vitest.logger.log(RELOAD);
        assert.equal(process.exitCode, before);
    });
    it("adds the browser-deps hook once, in watch mode too, and fails loudly without a reporter list", () => {
        const vitest = { logger: fakeLogger(), config: { watch: true }, reporters: [] };
        setup({ vitest });
        setup({ vitest });
        assert.deepEqual(vitest.reporters, [waitForBrowserDeps]);
        assert.throws(() => setup({ vitest: { logger: fakeLogger(), config: {} } }), /vitest\.reporters is gone/);
    });

    it("holds a browser page until the scan and the bundle it started have both settled", async () => {
        const order = [];
        let finishScan;
        let finishBundle;
        const optimizer = {
            init: async () => order.push("init"),
            scanProcessing: new Promise((resolve) => (finishScan = resolve)).then(() => order.push("scan")),
            metadata: { discovered: {} },
        };
        optimizer.scanProcessing.then(() => {
            optimizer.metadata.discovered.lit = {
                processing: new Promise((resolve) => (finishBundle = resolve)).then(() => order.push("bundle")),
            };
        });
        const project = { browser: { vite: { environments: { client: { depsOptimizer: optimizer } } } } };
        const held = waitForBrowserDeps.onBrowserInit(project).then(() => order.push("page"));
        finishScan();
        await optimizer.scanProcessing;
        await Promise.resolve();
        finishBundle();
        await held;
        assert.deepEqual(order, ["init", "scan", "bundle", "page"]);
        await depsOptimized(undefined);
        await waitForBrowserDeps.onBrowserInit({ browser: { vite: { environments: {} } } });
    });

    it("records the page's requests and upgrades, and prints them only when a page never connects", () => {
        const timeline = new ConnectTimeline("real-element (chromium)", () => 0);
        const server = new EventEmitter();
        timeline.watch(server);
        timeline.mark("dependency hold ends");
        const served = new EventEmitter();
        server.emit("request", { url: "/__vitest_test__/" }, served);
        server.emit("request", { url: "/@vite/client" }, new EventEmitter());
        served.emit("close");
        server.emit("upgrade", { url: "/__vitest_browser_api__?type=orchestrator" });
        assert.deepEqual(timeline.report(), [
            "[browser connect] real-element (chromium): what its server saw (#8823)",
            "  1970-01-01T00:00:00.000Z dependency hold ends",
            "  1970-01-01T00:00:00.000Z first request /__vitest_test__/",
            "  1970-01-01T00:00:00.000Z upgrade /__vitest_browser_api__?type=orchestrator",
            "  1 request(s) served, 1 never finished:",
            "    1970-01-01T00:00:00.000Z /@vite/client",
        ]);

        const printed = [];
        const error = console.error;
        console.error = (line) => printed.push(line);
        try {
            waitForBrowserDeps.onTestRunEnd([], [new Error("boom")]);
            assert.equal(printed.length, 0);
            waitForBrowserDeps.onTestRunEnd(
                [],
                [new Error('Failed to connect to the browser session "x" [p] within the timeout.')],
            );
            assert.equal(printed.length, 1);
        } finally {
            console.error = error;
        }
    });
});
