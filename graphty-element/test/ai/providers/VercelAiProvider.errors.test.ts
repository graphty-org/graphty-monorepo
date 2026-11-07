/**
 * What a provider failure carries out of the assistant: never the key, the prompt or the response.
 * The built-in providers fail against a faked `fetch`, through TanStack AI and each provider's SDK.
 * @module test/ai/providers/VercelAiProvider.errors.test
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { AiController } from "../../../src/ai/AiController";
import { CommandRegistry } from "../../../src/ai/commands";
import { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import { VercelAiProvider } from "../../../src/ai/providers/VercelAiProvider";
import type { AiEvent } from "../../../src/events";
import { redactSecrets } from "../../../src/logging";
import { createMessageGraph } from "../../helpers/message-graph";

/** The configured key, and a value from the graph that must never leave in an error. */
const KEY = "sk-ant-api03-SENTINELKEY0123456789abcdefghij";
const CANARY = "canary-graph-value-7f3a";

/**
 * A provider error shaped like an SDK's own after a failed call: the request it sent (the prompt
 * with a graph value), the response it got, and the key in the request headers and in the
 * message, as a provider that echoes the key would put it.
 * @returns the error.
 */
function providerError(): Error {
    return Object.assign(new Error(`Incorrect API key provided: ${KEY}`), {
        name: "APICallError",
        url: `https://api.example.com/v1/messages?key=${KEY}`,
        requestBodyValues: { messages: [{ role: "user", content: `color the node ${CANARY}` }] },
        statusCode: 401,
        responseHeaders: { "x-api-key": KEY },
        responseBody: JSON.stringify({ error: { message: `bad key ${KEY}` }, echo: CANARY }),
        cause: new Error(`inner ${CANARY}`),
    });
}

/**
 * Everything an error reporter could read off an error: every own property, enumerable or not,
 * followed down `cause`.
 * @param error - the error to read.
 * @returns all of it as one string.
 */
function everything(error: unknown): string {
    if (!(error instanceof Error)) {
        return JSON.stringify(error);
    }
    const parts = Object.getOwnPropertyNames(error).map((name) => {
        const value = (error as unknown as Record<string, unknown>)[name];
        return value instanceof Error ? everything(value) : `${name}=${JSON.stringify(value)}`;
    });
    return [String(error), ...parts].join("\n");
}

/**
 * Asserts the thrown error leaks neither the key nor the graph value, and still says what failed.
 * @param error - what the provider threw.
 * @param name - the name the error keeps.
 */
function assertClean(error: unknown, name: string): void {
    const text = everything(error);
    assert.notInclude(text, KEY);
    assert.notInclude(text, CANARY);
    assert.instanceOf(error, Error);
    assert.strictEqual(error.name, name);
    assert.include(error.message, "Incorrect API key provided");
    assert.strictEqual((error as { statusCode?: number }).statusCode, 401);
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("VercelAiProvider errors", () => {
    /** Every provider refuses the key with a 401 whose message echoes it. */
    function refusal(): void {
        vi.stubGlobal("fetch", () =>
            Promise.resolve(
                new Response(JSON.stringify({ error: { message: `Incorrect API key provided: ${KEY}` } }), {
                    status: 401,
                    headers: { "content-type": "application/json" },
                }),
            ),
        );
    }

    for (const type of ["openai", "anthropic", "google"] as const) {
        it(`${type}: throws a provider error from generate with no key, prompt or response attached`, async () => {
            refusal();
            const provider = new VercelAiProvider(type);
            provider.configure({ apiKey: KEY });

            const thrown = await provider.generate([{ role: "user", content: CANARY }], []).catch((e: unknown) => e);

            assertClean(thrown, "ProviderApiError");
        });

        it(`${type}: reports and throws a stream error with no key, prompt or response attached`, async () => {
            refusal();
            const provider = new VercelAiProvider(type);
            provider.configure({ apiKey: KEY });
            const reported: Error[] = [];

            const thrown = await provider
                .generateStream([{ role: "user", content: CANARY }], [], {
                    onChunk: () => undefined,
                    onToolCall: () => undefined,
                    onToolResult: () => undefined,
                    onComplete: () => undefined,
                    onError: (e) => reported.push(e),
                })
                .catch((e: unknown) => e);

            assertClean(thrown, "ProviderApiError");
            assert.strictEqual(reported.length, 1);
            reported.forEach((e) => {
                assertClean(e, "ProviderApiError");
            });
        });
    }
});

describe("AiController errors", () => {
    it("passes on any provider's error, a consumer's own included, with nothing attached", async () => {
        const provider = new MockLlmProvider();
        provider.setError(providerError());
        const events: AiEvent[] = [];
        const controller = new AiController({
            provider,
            commandRegistry: new CommandRegistry(),
            graph: createMessageGraph(),
            emitEvent: (event) => events.push(event),
        });

        const result = await controller.execute(`find ${CANARY}`);

        const errorEvent = events.find((e) => e.type === "ai-command-error");
        assert.ok(errorEvent?.type === "ai-command-error");
        assertClean(errorEvent.error, "APICallError");
        assertClean(controller.getLastError(), "APICallError");
        assertClean(controller.getStatus().error, "APICallError");
        assert.notInclude(result.message, KEY);
    });
});

describe("redactSecrets", () => {
    it("removes a known secret and key-shaped text, and leaves ordinary text alone", () => {
        assert.strictEqual(redactSecrets("token abc", ["abc"]), "token [redacted]");
        assert.strictEqual(redactSecrets("bad AIzaSyA1234567890abcdefghijklmnop"), "bad [redacted]");
        assert.strictEqual(redactSecrets("Authorization: Bearer abc.def"), "Authorization: [redacted] [redacted]");
        assert.strictEqual(redactSecrets('{"api_key":"zzz"}'), '{"api_key":"[redacted]"}');
        assert.strictEqual(redactSecrets("/v1/models?key=zzz&alt=sse"), "/v1/models?key=[redacted]&alt=sse");
        assert.strictEqual(redactSecrets("id 0123456789abcdef0123456789abcdef"), "id [redacted]");
        const ordinary = "Node not found: processBeforeSendTransactionHandlerName (401)";
        assert.strictEqual(redactSecrets(ordinary), ordinary);
    });
});
