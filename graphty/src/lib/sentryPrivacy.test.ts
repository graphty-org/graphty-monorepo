import * as Sentry from "@sentry/react";
import { afterEach, assert, describe, it } from "vitest";

import { initSentry, resetSentryState, stopSentry } from "./sentry";

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
        isProd: false,
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
        assert.include(all, '"category":"console"');
        assert.include(all, '"url":"https://api.example.com/v1/messages"');
        assert.include(all, '"type":"transaction"');
    });
});
