import type { Breadcrumb, ErrorEvent, Event, ReplayFrameEvent } from "@sentry/react";
import * as Sentry from "@sentry/react";
import { afterEach, assert, describe, it } from "vitest";

import { initSentry, resetSentryState, stopSentry } from "./sentry";
import { beforeAddRecordingEvent, privacyFilters } from "./sentryPrivacy";

/** A file's address on another site: only its origin may leave the page. */
const PRIVATE = "https://private.example/SECRET-PATIENT.csv?x=1";

/** A provider key, and a graph value the reader never agreed to send. */
const KEY = "sk-ant-api03-SENTINELKEY0123456789abcdefghij";
const CANARY = "canary-graph-value-7f3a";

/**
 * An error shaped like the AI SDK's `APICallError` after a failed call: the request it sent (the
 * prompt with a graph value), the response it got and the key, as own properties and in the
 * message, the way a provider that echoes the key would word it.
 */
class ProviderError extends Error {
    override name = "AI_APICallError";
    url = `https://api.example.com/v1/messages?key=${KEY}`;
    requestBodyValues = { messages: [{ role: "user", content: `color the node ${CANARY}` }] };
    statusCode = 401;
    responseHeaders = { "x-api-key": KEY };
    responseBody = JSON.stringify({ error: { message: `bad key ${KEY}` }, echo: CANARY });

    constructor() {
        super(`Incorrect API key provided: ${KEY}`);
    }
}

/**
 * Starts error reporting as the app does, with a transport that records every envelope instead
 * of sending it.
 * @returns the bodies of the envelopes Sentry hands its transport, as text.
 */
function startRecording(): string[] {
    const sent: string[] = [];
    initSentry({
        dsn: "https://public@o0.ingest.sentry.io/0",
        environment: "test",
        transport: (options) =>
            Sentry.createTransport(options, (request) => {
                sent.push(typeof request.body === "string" ? request.body : new TextDecoder().decode(request.body));
                return Promise.resolve({ statusCode: 200 });
            }),
    });
    return sent;
}

describe("what error reporting sends", () => {
    afterEach(() => {
        stopSentry();
        resetSentryState();
    });

    it("sends a provider error's type, message and stack, and no key or graph value from anywhere", async () => {
        const sent = startRecording();
        const error = new ProviderError();

        // Every route the data could take: the error's own fields, a console line logging it (as
        // AiProviderSettings does), a request breadcrumb, a context, an extra, a tag and a span.
        Sentry.setExtra("request", { body: CANARY });
        Sentry.setContext("ai", { prompt: CANARY });
        Sentry.setTag("graph", CANARY);
        console.warn("[AiProviderSettings] Could not reach the provider:", error);
        Sentry.addBreadcrumb({
            category: "fetch",
            data: { method: "POST", url: error.url, body: CANARY },
        });
        Sentry.startSpan(
            { name: "ask", op: "http.client", attributes: { "http.url": error.url, "graph.value": CANARY } },
            () => undefined,
        );
        Sentry.captureException(error);
        await Sentry.flush();

        const all = sent.join("\n");
        assert.notInclude(all, KEY);
        assert.notInclude(all, CANARY);
        // What is kept still says what failed, and where.
        assert.include(all, '"type":"AI_APICallError"');
        assert.include(all, "Incorrect API key provided: [redacted]");
        // Console breadcrumbs are dropped; another site's URL keeps only its origin.
        assert.notInclude(all, '"category":"console"');
        assert.include(all, '"url":"https://api.example.com"');
        // No tracing is set up, so no transaction is sent.
        assert.notInclude(all, '"type":"transaction"');
        // Sentry's server must not fill in the reader's IP address.
        assert.include(all, '"infer_ip":"never"');
        assert.notInclude(all, "{{auto}}");
        // The browser string is kept on purpose.
        assert.include(all, `"User-Agent":${JSON.stringify(navigator.userAgent)}`);
    });
});

describe("URLs of another site", () => {
    it("keep only their origin in a breadcrumb, a message, a stack frame and the request", () => {
        const crumb = privacyFilters.beforeBreadcrumb?.(
            { category: "fetch", data: { method: "GET", url: PRIVATE } },
            {},
        );
        const event = privacyFilters.beforeSend?.(
            {
                message: `could not read ${PRIVATE}`,
                request: { url: PRIVATE },
                exception: {
                    values: [
                        {
                            type: "Error",
                            value: `failed ${PRIVATE}`,
                            stacktrace: { frames: [{ filename: PRIVATE, function: "read", lineno: 1 }] },
                        },
                    ],
                },
            } as ErrorEvent,
            {},
        ) as Event;
        const all = JSON.stringify([crumb, event]);

        assert.notInclude(all, "SECRET");
        assert.equal((crumb as Breadcrumb).data?.url, "https://private.example");
        assert.equal(event.request?.url, "https://private.example");
        assert.equal(event.exception?.values?.[0].stacktrace?.frames?.[0].filename, "https://private.example");
        assert.equal(event.message, "could not read https://private.example");
    });

    it("keeps this site's own script addresses whole, so source maps still match", () => {
        const own = `${globalThis.location.origin}/assets/index-abc.js`;
        const event = privacyFilters.beforeSend?.(
            { exception: { values: [{ type: "Error", stacktrace: { frames: [{ filename: own }] } }] } } as ErrorEvent,
            {},
        ) as Event;
        assert.equal(event.exception?.values?.[0].stacktrace?.frames?.[0].filename, own);
    });

    it("drops console breadcrumbs", () => {
        assert.isNull(privacyFilters.beforeBreadcrumb?.({ category: "console", message: "a graph value" }, {}));
    });
});

describe("the error replay's recording events", () => {
    it("drops a console breadcrumb", () => {
        const event = {
            type: 5,
            timestamp: 1,
            data: { tag: "breadcrumb", payload: { timestamp: 1, type: "default", category: "console", message: "x" } },
        } as ReplayFrameEvent;
        assert.isNull(beforeAddRecordingEvent(event));
    });

    for (const op of ["navigation.navigate", "resource.fetch", "resource.script"]) {
        it(`cuts the URL of a ${op} span to its origin`, () => {
            const event = {
                type: 5,
                timestamp: 1,
                data: {
                    tag: "performanceSpan",
                    payload: { op, description: PRIVATE, startTimestamp: 1, endTimestamp: 2, data: {} },
                },
            } as unknown as ReplayFrameEvent;
            const out = beforeAddRecordingEvent(event);
            assert.notInclude(JSON.stringify(out), "SECRET");
            assert.equal((out?.data.payload as { description: string }).description, "https://private.example");
        });
    }
});
