/**
 * @file Mounting `<graphty-element>` must not reconfigure anything because of the host page's
 * query string.
 *
 * WHAT THIS IS ABOUT. The element used to read `window.location.search` in `connectedCallback`
 * and act on two parameters it found there: `?profiling=true` switched on detailed profiling,
 * and `?graphty-element-logging=...` reconfigured logging globally -- the level, which modules
 * speak, and where records go. Nothing in the markup said so, nothing could opt out, and a host
 * page that happened to use `profiling` for its own purposes got a profiler it never asked for.
 * A component reaching around its own API into the address bar is also untestable from the
 * outside: the only way to observe it was to change the page's URL.
 *
 * WHY THIS TEST HAD TO BE WRITTEN RATHER THAN CHANGED. There were tests for the parser --
 * `test/browser/logging-URLParamParser.test.ts` and
 * `test/browser/logging-integration/URLParamIntegration.test.ts` -- and they still pass either
 * way, because they call `parseLoggingURLParams()` themselves and never mount an element. No
 * test anywhere mounted the element and asked what the URL did to it, which is exactly why the
 * behaviour survived as long as it did.
 *
 * THIS FILE FAILS UNTIL THE READING IS DELETED, and that is what it is for. The deletion is
 * three hunks in `src/graphty-element.ts` -- the `parseURLParams` method, the call to it in
 * `connectedCallback`, and the now-unused `./logging` import -- and that file belongs to
 * another piece of work in flight. The failure message names the real behaviour: mounting the
 * element reconfigured global logging because of the page's query string. Do not weaken it;
 * land the deletion.
 *
 * WHAT A CONSUMER DOES INSTEAD. `parseLoggingURLParams` is still published, from
 * `@graphty/graphty-element/logging`. A page that wants its query string to drive logging calls
 * the parser and hands the answer to `GraphtyLogger.configure` -- three lines, in the page,
 * where a reader can see them.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { getLoggingConfig, LogLevel, parseLoggingURLParams, resetLoggingConfig } from "../../logging";

/** How long to give the element to connect and finish its first update. */
const ELEMENT_READY_MS = 300;

/** Containers mounted by a test, removed after it. */
const containers: HTMLDivElement[] = [];

/**
 * Waits for a number of milliseconds.
 * @param ms - How long to wait.
 * @returns A promise that settles after the wait.
 */
function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Puts a query string on the page, the way a host page's address bar would carry one.
 * @param params - The query string, without the leading question mark.
 */
function setURLParams(params: string): void {
    history.replaceState(null, "", `${window.location.pathname}?${params}`);
}

/**
 * Mounts an element and waits for it to connect.
 * @returns The mounted element.
 */
async function mount(): Promise<Graphty> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    containers.push(container);

    const element = document.createElement("graphty-element");
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    container.appendChild(element);

    await element.updateComplete;
    await wait(ELEMENT_READY_MS);

    return element;
}

beforeEach(() => {
    resetLoggingConfig();
});

afterEach(async () => {
    while (containers.length > 0) {
        containers.pop()?.remove();
    }

    await wait(0);
    resetLoggingConfig();

    if (window.location.search !== "") {
        history.replaceState(null, "", window.location.pathname);
    }
});

describe("what the page's query string does to a mounted element", () => {
    it("leaves logging switched off when the page carries ?graphty-element-logging=true", async () => {
        setURLParams("graphty-element-logging=true");

        // The parser still reads the URL when someone asks it to. That is the control: the
        // parameter really is there and really is understood, so a failure below means the
        // element acted on it rather than that the test set it up wrong.
        assert.strictEqual(parseLoggingURLParams()?.enabled, true);

        await mount();

        assert.isFalse(
            getLoggingConfig().enabled,
            "mounting the element reconfigured global logging because of the page's query string",
        );
    });

    it("leaves the log level alone when the page carries ?graphty-element-log-level=debug", async () => {
        setURLParams("graphty-element-logging=true&graphty-element-log-level=debug");

        await mount();

        const config = getLoggingConfig();

        assert.isFalse(config.enabled);
        assert.strictEqual(config.level, LogLevel.INFO, "the element took its log level from the address bar");
    });

    it("leaves detailed profiling off when the page carries ?profiling=true", async () => {
        setURLParams("profiling=true");

        const element = await mount();

        assert.notStrictEqual(
            element.enableDetailedProfiling,
            true,
            "mounting the element switched on profiling because of the page's query string",
        );
    });
});
