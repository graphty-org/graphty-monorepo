// Tests of vitest.browser-coverage.mjs, the browser command that restarts V8 precise coverage as
// each test file starts so that a finished file's iframe can be garbage collected. It drives a real
// Chromium the way @vitest/browser does: one page, a CDP session on it, and for each test file the
// start command, an iframe that runs the file, a coverage take, and the iframe's removal.
//
//   node --test tools/vitest-browser-coverage.test.mjs   (part of pnpm run test:ci-workflows)
/* global document -- read only inside page.evaluate, which runs in the browser */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { chromium } from "playwright";

import { browserCoverageCommands } from "../vitest.browser-coverage.mjs";

// A test file that keeps 32 MB reachable from its own window. The object literal gives `make` an
// allocation site in its feedback vector, which is how precise coverage kept a whole iframe alive.
const TEST_FILE = `<script>
function make() { return { values: [1.5, 2.5], tag: "x" }; }
window.kept = [];
for (let i = 0; i < 4; i++) { const o = make(); o.values = new Array(1e6).fill(i + 0.5); window.kept.push(o); }
</script>`;
const FILES = 6;
const FILE_BYTES = 32e6;

/**
 * Run FILES test files one after another in one page and measure what they leave behind.
 * @param startCoverage - the start command under test
 * @returns heap bytes still used after the last file, over the empty page's
 */
async function retainedAfterFiles(startCoverage) {
    const browser = await chromium.launch();
    try {
        const page = await (await browser.newContext()).newPage();
        const cdp = await page.context().newCDPSession(page);
        const context = { __ensureCDPHandler: async () => cdp };
        const heapUsed = async () => {
            await cdp.send("HeapProfiler.collectGarbage");
            return (await cdp.send("Runtime.getHeapUsage")).usedSize;
        };
        const before = await heapUsed();
        for (let i = 0; i < FILES; i++) {
            await startCoverage(context);
            await page.evaluate(
                (html) =>
                    new Promise((resolve) => {
                        const frame = document.createElement("iframe");
                        frame.id = "tester";
                        frame.onload = resolve;
                        frame.srcdoc = html;
                        document.body.append(frame);
                    }),
                TEST_FILE,
            );
            const coverage = await cdp.send("Profiler.takePreciseCoverage");
            assert.ok(
                coverage.result.some((script) => script.functions.some((fn) => fn.functionName === "make")),
                "the file's coverage is still taken",
            );
            await page.evaluate(() => document.getElementById("tester").remove());
        }
        // The next file's start is when the last one's iframe can go.
        await startCoverage(context);
        return (await heapUsed()) - before;
    } finally {
        await browser.close();
    }
}

describe("browserCoverageCommands.__vitest_startV8Coverage", () => {
    it("lets the iframes of finished test files be garbage collected", async () => {
        const retained = await retainedAfterFiles(browserCoverageCommands.__vitest_startV8Coverage);
        // Without the restart every file's 32 MB stays (about 190 MB after six files).
        assert.ok(
            retained < FILE_BYTES,
            `${(retained / 1e6).toFixed(1)} MB still held after ${FILES} files; a finished file's iframe was kept alive`,
        );
    });
});
