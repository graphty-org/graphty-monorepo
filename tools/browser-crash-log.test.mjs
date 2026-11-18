// node --test tools/browser-crash-log.test.mjs
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";

import { logBrowserCrashes } from "./browser-crash-log.mjs";

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
