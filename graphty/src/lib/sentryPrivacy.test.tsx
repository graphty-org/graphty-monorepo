import { GraphtyError } from "@graphty/graphty-element/session";
import type { Breadcrumb, ErrorEvent, Event, ReplayFrameEvent } from "@sentry/react";
import * as Sentry from "@sentry/react";
import { afterAll, afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen } from "../test/test-utils";
import { PanelBoundary } from "../workspace/frame/PanelBoundary";
import { initSentry, resetSentryState, stopSentry } from "./sentry";
import { beforeAddRecordingEvent, privacyFilters } from "./sentryPrivacy";

/** A file's address on another site: not even its origin may leave the page. */
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

/** The bodies of the envelopes Sentry hands its transport, as text. */
const sent: string[] = [];

/**
 * Starts error reporting as the app does, with a transport that records every envelope instead
 * of sending it. The page keeps one client and one replay (Sentry allows no second), so a later
 * start enables the first client again, with its transport: the envelopes land in the same list.
 * @returns the bodies of the envelopes sent from this start on, as text.
 */
function startRecording(): string[] {
    sent.length = 0;
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
        // Console breadcrumbs are dropped; another site's URL is not sent, not even its origin.
        assert.notInclude(all, '"category":"console"');
        assert.notInclude(all, "api.example.com");
        assert.include(all, '"url":"external"');
        // No tracing is set up, so no transaction is sent.
        assert.notInclude(all, '"type":"transaction"');
        // Sentry's server must not fill in the reader's IP address.
        assert.include(all, '"infer_ip":"never"');
        assert.notInclude(all, "{{auto}}");
        // The browser string is kept on purpose.
        assert.include(all, `"User-Agent":${JSON.stringify(navigator.userAgent)}`);
    });
});

afterAll(() => {
    resetSentryState();
});

/** Throws while `broken.now` is true, as a panel that reads a column the graph lacks. */
const broken = { now: true };

/**
 * A panel that throws graphty-element's error for a column the graph has no column of, caused by
 * the browser's own JSON.parse error, which quotes the start of the text it read.
 * @returns the panel.
 */
function ColumnPanel(): React.JSX.Element {
    if (broken.now) {
        let cause: unknown;
        try {
            JSON.parse("SECRET_FILE_START is not json");
        } catch (error) {
            cause = error;
        }
        throw new GraphtyError({
            code: "E_UNKNOWN_ATTRIBUTE",
            message: 'No node column is named "SECRET_COLUMN"',
            source: "data",
            cause,
        });
    }
    return <p>Panel content</p>;
}

describe("error messages", () => {
    afterEach(() => {
        stopSentry();
    });

    it("send a graphty-element error as its code, never the column, node or file text it quotes", async () => {
        const sent = startRecording();
        const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
        broken.now = true;
        render(
            <PanelBoundary name="Inspector">
                <ColumnPanel />
            </PanelBoundary>,
        );
        await screen.findByText("This panel could not be shown");
        await Sentry.flush();
        // A later error carries the first one as a breadcrumb: its message must not ride along.
        broken.now = false;
        await userEvent.click(screen.getByRole("button", { name: "Reload panel" }));
        await screen.findByText("Panel content");
        Sentry.captureException(new Error('could not open the "SECRET_PROJECT" project'));
        await Sentry.flush();
        quiet.mockRestore();

        const all = sent.join("\n");
        for (const secret of ["SECRET_COLUMN", "SECRET_FILE_START", "SECRET_PROJECT"]) {
            assert.notInclude(all, secret);
        }
        // Not vacuous: both errors were sent, the element's as its code, the other with its quote replaced.
        assert.include(all, '"value":"E_UNKNOWN_ATTRIBUTE"');
        assert.include(all, '"type":"SyntaxError"');
        assert.include(all, 'could not open the \\"[quoted]\\" project');
    });
});

describe("URLs of another site", () => {
    it("are replaced in a breadcrumb, a message, a stack frame and the request", async () => {
        const crumb = privacyFilters.beforeBreadcrumb?.(
            { category: "fetch", data: { method: "GET", url: PRIVATE } },
            {},
        );
        const event = (await privacyFilters.beforeSend?.(
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
        )) as Event;
        const all = JSON.stringify([crumb, event]);

        assert.notInclude(all, "SECRET");
        assert.notInclude(all, "private.example");
        assert.equal((crumb as Breadcrumb).data?.url, "external");
        assert.equal(event.request?.url, "external");
        assert.equal(event.exception?.values?.[0].stacktrace?.frames?.[0].filename, "external");
        assert.equal(event.message, "could not read external");
    });

    it("keeps this site's own script addresses whole, so source maps still match", async () => {
        const own = `${globalThis.location.origin}/assets/index-abc.js`;
        const event = (await privacyFilters.beforeSend?.(
            { exception: { values: [{ type: "Error", stacktrace: { frames: [{ filename: own }] } }] } } as ErrorEvent,
            {},
        )) as Event;
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
        it(`replaces the URL of a ${op} span`, () => {
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
            assert.equal((out?.data.payload as { description: string }).description, "external");
        });
    }
});
