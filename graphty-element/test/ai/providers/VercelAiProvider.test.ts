/**
 * VercelAiProvider: the built-in OpenAI, Anthropic and Google provider, on the provider-API engine,
 * against each provider's HTTP API faked at `fetch` (test/ai/engine/providerApiFixtures.ts).
 * @module test/ai/providers/VercelAiProvider.test
 */

import { afterEach, assert, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { LlmProviderEngine } from "../../../src/ai/engine/LlmProviderEngine";
import { engineFor } from "../../../src/ai/engine/load";
import { ProviderApiEngine } from "../../../src/ai/engine/ProviderApiEngine";
import type { LlmResponse, Message, StreamCallbacks, ToolDefinition } from "../../../src/ai/providers/types";
import { VercelAiProvider, type VercelProviderType } from "../../../src/ai/providers/VercelAiProvider";
import { KEYS, providerApiFixture, type SentRequest } from "../engine/providerApiFixtures";

const PROVIDERS = ["openai", "anthropic", "google"] as const;

const FIND: ToolDefinition = {
    name: "findNodes",
    description: "Find nodes",
    parameters: z.object({ selector: z.string() }),
};

/**
 * The key a request carried, in the provider's own header.
 * @param request - The request.
 * @returns The key, or undefined.
 */
function sentKey(request: SentRequest): string | undefined {
    const { headers } = request;
    return headers["x-api-key"] ?? headers["x-goog-api-key"] ?? headers.authorization?.replace(/^Bearer /, "");
}

/**
 * The model a request asked for.
 * @param request - The request.
 * @returns The model id.
 */
function sentModel(request: SentRequest): string {
    return typeof request.body.model === "string"
        ? request.body.model
        : (/\/models\/([^:]+):/.exec(request.url)?.[1] ?? "");
}

/**
 * Callbacks that record what they were told, in order.
 * @param log - Where each call is recorded.
 * @returns The callbacks.
 */
function recording(log: string[]): StreamCallbacks {
    return {
        onChunk: (text) => log.push(`chunk:${text}`),
        onToolCall: (name) => log.push(`tool:${name}`),
        onToolResult: (name) => log.push(`result:${name}`),
        onComplete: (response) => log.push(`complete:${response.toolCalls.length}`),
        onError: (error) => log.push(`error:${error.name}`),
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("VercelAiProvider", () => {
    describe.each(PROVIDERS)("%s", (type: VercelProviderType) => {
        it("initializes correctly", () => {
            const provider = new VercelAiProvider(type);
            assert.strictEqual(provider.name, type);
            assert.strictEqual(provider.supportsStreaming, true);
            assert.strictEqual(provider.supportsTools, true);
        });

        it("throws without API key, and sends nothing", async () => {
            const { requests } = providerApiFixture(type);
            const provider = new VercelAiProvider(type);
            await expect(provider.generate([{ role: "user", content: "test" }], [])).rejects.toThrow(/API key/);
            await expect(
                provider.generateStream([{ role: "user", content: "test" }], [], recording([])),
            ).rejects.toThrow(/API key/);
            assert.strictEqual(requests.length, 0);
        });

        it("answers with the text, the tool calls and the usage", async () => {
            const { reply } = providerApiFixture(type);
            reply({
                text: "Looking.",
                toolCalls: [{ id: "c1", name: "findNodes", arguments: { selector: "a" } }],
                usage: { input: 9, output: 4 },
            });
            const provider = new VercelAiProvider(type);
            provider.configure({ apiKey: KEYS[type] });

            const response: LlmResponse = await provider.generate([{ role: "user", content: "find a" }], [FIND]);

            assert.strictEqual(response.text, "Looking.");
            assert.deepStrictEqual(response.toolCalls, [{ id: "c1", name: "findNodes", arguments: { selector: "a" } }]);
            assert.deepStrictEqual(response.usage, { promptTokens: 9, completionTokens: 4 });
        });

        it("streams the text, then each tool call, then completes", async () => {
            const { reply } = providerApiFixture(type);
            reply({ text: "Looking.", toolCalls: [{ id: "c1", name: "findNodes", arguments: { selector: "a" } }] });
            const provider = new VercelAiProvider(type);
            provider.configure({ apiKey: KEYS[type] });
            const log: string[] = [];

            await provider.generateStream([{ role: "user", content: "find a" }], [FIND], recording(log));

            assert.deepStrictEqual(log, ["chunk:Looking.", "tool:findNodes", "complete:1"]);
        });

        it("validates a key: true when the provider answers, false when it refuses, throws otherwise", async () => {
            const { reply, failOnce, fail } = providerApiFixture(type);
            const provider = new VercelAiProvider(type);
            assert.isFalse(await provider.validateApiKey(), "no key configured");
            provider.configure({ apiKey: KEYS[type] });
            reply({ text: "hi" });
            assert.isTrue(await provider.validateApiKey());
            failOnce(401);
            assert.isFalse(await provider.validateApiKey());
            fail(500);
            await expect(provider.validateApiKey()).rejects.toMatchObject({ statusCode: 500 });
        });

        it("fails a turn whose stream ends without finishing, rather than answer with what it cut", async () => {
            const { respondOnce } = providerApiFixture(type);
            // A stream that stops before the provider's end-of-answer event.
            respondOnce(200, "", { "content-type": "text/event-stream" });
            const provider = new VercelAiProvider(type);
            provider.configure({ apiKey: KEYS[type] });
            await expect(provider.generate([{ role: "user", content: "a" }], [])).rejects.toThrow();
        });

        it("sends the configuration as it is at each call: a later configure() reaches the next request", async () => {
            const { requests } = providerApiFixture(type);
            const provider = new VercelAiProvider(type);
            provider.configure({ apiKey: "first-key-0123456789" });
            await provider.generate([{ role: "user", content: "a" }], []);
            provider.configure({ apiKey: "second-key-0123456789", model: "some-other-model" });
            await provider.generate([{ role: "user", content: "b" }], []);

            assert.deepStrictEqual(requests.map(sentKey), ["first-key-0123456789", "second-key-0123456789"]);
            assert.strictEqual(sentModel(requests[1]), "some-other-model");
        });
    });

    /**
     * A retired default model fails every request of a consumer who names no model: Anthropic
     * retired claude-3-haiku-20240307 and Google retired gemini-2.0-flash. These pin which model
     * id each default is.
     */
    describe("default models", () => {
        it.each([
            ["openai", "gpt-4o"],
            ["anthropic", "claude-haiku-4-5-20251001"],
            ["google", "gemini-3.8-flash"],
        ] as const)("%s defaults to %s", async (type, expected) => {
            const { requests } = providerApiFixture(type);
            const provider = new VercelAiProvider(type);
            provider.configure({ apiKey: KEYS[type] });

            await provider.generate([{ role: "user", content: "hi" }], []);

            assert.strictEqual(sentModel(requests[0]), expected);
        });
    });

    describe("tool results", () => {
        it("names each tool result after the call it answers", async () => {
            // Google refuses a function response with an empty name, which is what every tool
            // result carried, so a second ask after a tool call always failed there.
            const { requests } = providerApiFixture("google");
            const provider = new VercelAiProvider("google");
            provider.configure({ apiKey: KEYS.google });
            const messages: Message[] = [
                { role: "user", content: "find servers" },
                {
                    role: "assistant",
                    content: "",
                    toolCalls: [{ id: "c1", name: "findNodes", arguments: { selector: "data.type == 'server'" } }],
                },
                { role: "tool", toolCallId: "c1", content: "{}" },
            ];

            await provider.generate(messages, [FIND]);

            const contents = requests[0].body.contents as { parts: { functionResponse?: { name: string } }[] }[];
            assert.strictEqual(contents[2].parts[0].functionResponse?.name, "findNodes");
        });
    });

    describe("the engine the assistant runs it on", () => {
        it("is the provider-API engine, reading the provider's configuration", () => {
            assert.instanceOf(engineFor(new VercelAiProvider("openai")), ProviderApiEngine);
        });

        it("is the provider itself, through generate, for a subclass that overrides generate", () => {
            class Logged extends VercelAiProvider {
                override generate(
                    messages: Message[],
                    tools: ToolDefinition[],
                    options?: { signal?: AbortSignal; toolChoice?: "auto" | "none" },
                ): Promise<LlmResponse> {
                    return super.generate(messages, tools, options);
                }
            }

            assert.instanceOf(engineFor(new Logged("openai")), LlmProviderEngine);
        });
    });
});
