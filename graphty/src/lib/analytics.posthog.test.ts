/**
 * The real posthog-js chunk, loaded through the default import, with its ingest host pointed at a
 * same-origin prefix that this file answers itself: no request reaches a server. What leaves the page
 * is read from the recorded request bodies. Run it again whenever the posthog-js pin changes.
 *
 * Session replay is not started here: the canned remote config turns recording off, because the
 * shape of a config that turns it on is internal to posthog-js. Replay masking is pinned by the
 * init options in analytics.test.ts and by the address-bar strip below.
 */
import type { PostHog } from "posthog-js";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../siteConfig";
import {
    postHog,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    setCommandAllowlist,
    startPostHog,
    stopPostHog,
    stripQueryForRecorders,
} from "./analytics";

const KEY = "phc_realchunktest";
/** The sentinel ingest host: a same-origin prefix answered by the wrappers below. */
const PREFIX = `${globalThis.location.origin}/__posthog_test__`;
const SECRETS = ["SECRET_URL", "SECRET_LOG", "SECRET_TEXT", "SECRET_PROJECT"];

/** Every request body sent to the sentinel host, as text. */
let bodies: string[] = [];
/** Every URL requested on the sentinel host. */
let urls: string[] = [];

const address = globalThis.location.href;
const realFetch = globalThis.fetch;
const realSend = XMLHttpRequest.prototype.send;
const realOpen = XMLHttpRequest.prototype.open;
const realBeacon = navigator.sendBeacon.bind(navigator);

/**
 * Reads a request body as text.
 * @param body - what the page sent.
 * @returns its text.
 */
async function bodyText(body: unknown): Promise<string> {
    if (body === null || body === undefined) {
        return "";
    }
    if (typeof body === "string") {
        return body;
    }
    if (body instanceof Blob) {
        return body.text();
    }
    if (body instanceof URLSearchParams || body instanceof FormData) {
        return new Response(body).text();
    }
    return JSON.stringify(body);
}

/** The canned remote config and flags: autocapture allowed, recording, surveys and the rest off. */
const CONFIG = JSON.stringify({
    flags: {},
    featureFlags: {},
    featureFlagPayloads: {},
    errorsWhileComputingFlags: false,
    autocapture_opt_out: false,
    sessionRecording: false,
    surveys: false,
    heatmaps: false,
    capturePerformance: false,
    supportedCompression: [],
});

/**
 * The canned answer for a request to the sentinel host.
 * @param url - the request URL.
 * @returns the JSON body.
 */
function answer(url: string): string {
    return url.includes("/flags") || url.includes("/config") ? CONFIG : JSON.stringify({ status: 1 });
}

/** The browser facts posthog-js reads to drop a bot's events; Playwright's browser reports itself as one. */
const BOT_TELLS = ["userAgent", "webdriver", "userAgentData"] as const;

/** Makes the test browser look like a reader's, so posthog-js does not drop every event as a bot's. */
function looksHuman(): void {
    const values = {
        userAgent: navigator.userAgent.replace(/Headless/g, ""),
        webdriver: false,
        userAgentData: undefined,
    };
    for (const name of BOT_TELLS) {
        Object.defineProperty(navigator, name, { configurable: true, get: () => values[name] });
    }
}

/** Answers every request to the sentinel host here, recording its body. */
function interceptRequests(): void {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = input instanceof Request ? input.url : String(input);
        if (!url.startsWith(PREFIX)) {
            return realFetch(input, init);
        }
        urls.push(url);
        bodies.push(await bodyText(init?.body ?? (input instanceof Request ? await input.text() : undefined)));
        return new Response(answer(url), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const opened = new WeakMap<XMLHttpRequest, string>();
    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: unknown[]): void {
        opened.set(this, String(args[1]));
        (realOpen as (...a: unknown[]) => void).apply(this, args);
    };
    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
        const url = opened.get(this) ?? "";
        if (!url.startsWith(PREFIX)) {
            realSend.call(this, body);
            return;
        }
        urls.push(url);
        void bodyText(body).then((text) => bodies.push(text));
    };
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null): boolean => {
        if (!String(url).startsWith(PREFIX)) {
            return realBeacon(url, data);
        }
        urls.push(String(url));
        void bodyText(data).then((text) => bodies.push(text));
        return true;
    };
}

beforeEach(async () => {
    resetAnalyticsForTests();
    resetSiteConfig();
    bodies = [];
    urls = [];
    // The site first: it is read through fetch, which the wrappers below replace.
    const site = {
        site: "production",
        features: [],
        analytics: { posthogKey: KEY, posthogHost: "https://eu.i.posthog.com" },
    };
    await loadSiteConfig(`data:application/json,${encodeURIComponent(JSON.stringify(site))}`);
    setAnalyticsCallsForTests({ send: () => undefined, hostname: () => "graphty.app", posthogHost: PREFIX });
    interceptRequests();
    looksHuman();
});

afterEach(() => {
    globalThis.fetch = realFetch;
    XMLHttpRequest.prototype.send = realSend;
    XMLHttpRequest.prototype.open = realOpen;
    navigator.sendBeacon = realBeacon;
    for (const name of BOT_TELLS) {
        Reflect.deleteProperty(navigator, name);
    }
    globalThis.history.replaceState(null, "", address);
    document.body.replaceChildren();
    resetAnalyticsForTests();
    resetSiteConfig();
    setAnalyticsCallsForTests();
});

describe("the real posthog-js chunk", () => {
    it("loads on Share, sends no reader text or query, keeps the control id, and stops for good", async () => {
        globalThis.history.replaceState(null, "", "?url=SECRET_URL&graphty-element-logging=SECRET_LOG");
        setCommandAllowlist(["history.undo"]);

        // The live sender's start: strip the address bar, then start PostHog.
        stripQueryForRecorders();
        startPostHog();
        await vi.waitFor(() => {
            assert.isDefined(postHog());
        });
        const client = postHog() as unknown as PostHog;

        const button = document.createElement("button");
        button.textContent = "SECRET_TEXT";
        button.setAttribute("aria-label", "SECRET_PROJECT");
        button.className = "POSITIVE_MARKER";
        button.dataset.phCaptureAttributeControl = "history.undo";
        document.body.append(button);
        await userEvent.click(button);

        // Not vacuous: a page view and the click's autocapture left the page.
        await vi.waitFor(() => {
            const sent = bodies.join("\n");
            assert.include(sent, "$pageview");
            assert.include(sent, "$autocapture");
        });
        const sent = bodies.join("\n");
        assert.include(sent, "history.undo", "the click carries its control id");
        for (const secret of SECRETS) {
            assert.notInclude(sent, secret);
            assert.notInclude(urls.join("\n"), secret);
        }

        // Stop: opted out, no id kept, and nothing reaches PostHog's flags or reset after it.
        const reset = vi.spyOn(client, "reset");
        const reload = vi.spyOn(client, "reloadFeatureFlags");
        stopPostHog();
        assert.isTrue(client.has_opted_out_capturing());
        assert.isUndefined(postHog());
        assert.isNull(localStorage.getItem(`ph_${KEY}_posthog`));
        // Counted work, not a wait for a batch that may never flush: every capture after the stop,
        // the click's autocapture included, returns nothing, so nothing was queued to send later.
        const capture = vi.spyOn(client, "capture");
        const capturedAfter = client.capture("after_stop");
        assert.isUndefined(capturedAfter, "a capture after stop is dropped before it is queued");
        await userEvent.click(button);
        assert.isTrue(
            capture.mock.results.every((result) => result.type === "return" && result.value === undefined),
            "no capture after the stop, the click's included, was queued",
        );
        assert.strictEqual(reset.mock.calls.length, 0);
        assert.strictEqual(reload.mock.calls.length, 0);
        assert.isNull(localStorage.getItem(`ph_${KEY}_posthog`));
    });

    it("never draws a survey of its own: only the app's survey card asks", async () => {
        startPostHog();
        await vi.waitFor(() => {
            assert.isDefined(postHog());
        });
        const client = postHog() as unknown as PostHog;
        assert.isTrue(client.config.disable_surveys_automatic_display);
        assert.isFalse(client.config.disable_surveys);
        stopPostHog();
    });
});
