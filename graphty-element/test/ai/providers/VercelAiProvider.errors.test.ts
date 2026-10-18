import * as ai from "ai";
import { assert, describe, it, vi } from "vitest";

import { AiController } from "../../../src/ai/AiController";
import { CommandRegistry } from "../../../src/ai/commands";
import { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import { VercelAiProvider } from "../../../src/ai/providers/VercelAiProvider";
import type { AiEvent } from "../../../src/events";
import { redactSecrets } from "../../../src/logging";
import { createMessageGraph } from "../../helpers/message-graph";

vi.mock("ai", async (importOriginal) => {
    const actual = await importOriginal<typeof import("ai")>();
    return { ...actual, generateText: vi.fn(), streamText: vi.fn() };
});

/** The configured key, and a value from the graph that must never leave in an error. */
const KEY = "sk-ant-api03-SENTINELKEY0123456789abcdefghij";
const CANARY = "canary-graph-value-7f3a";

/**
 * A provider error shaped like the AI SDK's own after a failed call: the request it sent (the
 * prompt with a graph value), the response it got, and the key in the request headers and in the
 * message, as a provider that echoes the key would put it.
 * @returns the error.
 */
function providerError(): ai.APICallError {
    return new ai.APICallError({
        message: `Incorrect API key provided: ${KEY}`,
        url: `https://api.example.com/v1/messages?key=${KEY}`,
        requestBodyValues: { messages: [{ role: "user", content: `color the node ${CANARY}` }] },
        statusCode: 401,
        responseHeaders: { "x-api-key": KEY },
        responseBody: JSON.stringify({ error: { message: `bad key ${KEY}` }, echo: CANARY }),
        isRetryable: false,
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
 */
function assertClean(error: unknown): void {
    const text = everything(error);
    assert.notInclude(text, KEY);
    assert.notInclude(text, CANARY);
    assert.instanceOf(error, Error);
    assert.strictEqual(error.name, "AI_APICallError");
    assert.include(error.message, "Incorrect API key provided");
    assert.strictEqual((error as { statusCode?: number }).statusCode, 401);
}

describe("VercelAiProvider errors", () => {
    it("throws a provider error from generate with no key, prompt or response attached", async () => {
        vi.mocked(ai.generateText).mockRejectedValueOnce(providerError());
        const provider = new VercelAiProvider("anthropic");
        provider.configure({ apiKey: KEY });

        const thrown = await provider.generate([{ role: "user", content: CANARY }], []).catch((e: unknown) => e);

        assertClean(thrown);
    });

    it("reports and throws a stream error with no key, prompt or response attached", async () => {
        const error = providerError();
        vi.mocked(ai.streamText).mockReturnValueOnce({
            fullStream: (function* stream() {
                yield { type: "error", error };
                throw error;
            })(),
        } as unknown as ReturnType<typeof ai.streamText>);
        const provider = new VercelAiProvider("anthropic");
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

        assertClean(thrown);
        assert.strictEqual(reported.length, 2);
        reported.forEach(assertClean);
        // The SDK's own console.error of the raw error is turned off.
        const options = vi.mocked(ai.streamText).mock.lastCall?.[0];
        assert.isFunction(options?.onError);
    });
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
        assertClean(errorEvent.error);
        assertClean(controller.getLastError());
        assertClean(controller.getStatus().error);
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
