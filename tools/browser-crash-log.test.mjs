// node --test tools/browser-crash-log.test.mjs
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import { test } from "node:test";

import { logBrowserCrashes } from "./browser-crash-log.mjs";

// Loaded before any provider is watched, as graphty-element's vitest config loads it through its imports (#9850).
const { debug: playwrightDebug } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle");

test("Playwright's browser log is on even when Playwright loaded before the first provider", () => {
    const { provider } = fakeProvider();
    logBrowserCrashes(provider);
    assert.equal(playwrightDebug.enabled("pw:browser"), true);
});

/**
 * A provider shaped like vitest's PlaywrightBrowserProvider, over event emitters for its browser, context and pages.
 * @returns the provider as `playwright()` returns it, and its browser
 */
function fakeProvider() {
    const browser = Object.assign(new EventEmitter(), { close: async () => {} });
    const built = {
        openBrowser: async () => browser,
        openBrowserPage: async (sessionId) => {
            const context = { close: async () => {}, browser: () => browser };
            return Object.assign(new EventEmitter(), {
                url: () => `http://x/${sessionId}`,
                context: () => context,
                close: async () => {},
            });
        },
    };
    return { provider: { name: "playwright", options: {}, providerFactory: () => built }, browser };
}

/**
 * Runs `act` and returns what it printed to console.error.
 * @param act - what to run
 * @returns the printed text
 */
function printed(act) {
    const lines = [];
    const error = console.error;
    console.error = (text) => lines.push(String(text));
    try {
        act();
    } finally {
        console.error = error;
    }
    return lines.join("\n");
}

test("a page that crashes or closes mid-run, and a browser that disconnects, are reported with the memory", async () => {
    const { provider, browser } = fakeProvider();
    logBrowserCrashes(provider);
    const built = provider.providerFactory();
    await built.openBrowser();
    const page = await built.openBrowserPage("s1");

    const crash = printed(() => page.emit("crash"));
    assert.match(crash, /\[browser-crash-log\] the page's renderer crashed \(http:\/\/x\/s1\)/);
    assert.match(crash, /meminfo: MemTotal/);
    assert.match(crash, /biggest processes/);

    assert.match(
        printed(() => page.emit("close")),
        /the page closed while tests were running/,
    );
    assert.match(
        printed(() => browser.emit("disconnected")),
        /the browser disconnected/,
    );
});

test("a page, context or browser closed by a close() call is not reported", async () => {
    const { provider, browser } = fakeProvider();
    logBrowserCrashes(provider);
    const built = provider.providerFactory();
    await built.openBrowser();

    const first = await built.openBrowserPage("s1");
    await first.close();
    assert.equal(
        printed(() => first.emit("close")),
        "",
    );

    const second = await built.openBrowserPage("s2");
    await second.context().close();
    assert.equal(
        printed(() => second.emit("close")),
        "",
    );

    const third = await built.openBrowserPage("s3");
    await browser.close();
    assert.equal(
        printed(() => third.emit("close")),
        "",
    );
    assert.equal(
        printed(() => browser.emit("disconnected")),
        "",
    );
});

test("Chromium's stderr lines are kept off the screen and quoted by the report", async () => {
    const { provider } = fakeProvider();
    logBrowserCrashes(provider);
    assert.match(process.env.DEBUG ?? "", /pw:browser/);
    process.stderr.write(
        "2026-11-17T22:38:11.000Z pw:browser [pid=1] <process did exit: exitCode=null, signal=SIGKILL>\n",
    );
    const page = await provider.providerFactory().openBrowserPage("s1");
    assert.match(
        printed(() => page.emit("crash")),
        /\| .*pw:browser .*signal=SIGKILL/,
    );
});

test("a crash report is quoted whole, header to end, however many lines Chromium wrote after it (#9850)", async () => {
    const { provider } = fakeProvider();
    logBrowserCrashes(provider);
    const at = "2026-11-24T08:49:35.304Z pw:browser [pid=4811][err]";
    const frames = Array.from({ length: 80 }, (_, i) => `${at} #${String(i)} 0x5627cdad0ce0 (chrome+0x89bbcdf)`);
    const later = Array.from({ length: 300 }, (_, i) => `${at} [4811:4828:ERROR:later.cc:${String(i)}] later`);
    process.stderr.write(
        [`${at} [4882:1:ERROR:context.cc:1] before`, `${at} Received signal 11 SI_KERNEL 000000000000`, ...frames]
            .concat([`${at}  trp: 000000000000000d`, `${at} [end of stack trace]`, ...later, ""])
            .join("\n"),
    );
    const page = await provider.providerFactory().openBrowserPage("s1");
    const report = printed(() => page.emit("crash"));
    for (const expected of [
        "context.cc:1] before",
        "Received signal 11",
        "#0 0x",
        "#79 0x",
        "trp: 0",
        "[end of stack",
    ]) {
        assert.ok(report.includes(expected), expected);
    }
    assert.ok(report.includes("later.cc:299]"), "the tail is still quoted");
});
