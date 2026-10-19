import * as ai from "ai";
import { assert, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { StreamCallbacks } from "../../../src/ai/providers/types";
import { VercelAiProvider } from "../../../src/ai/providers/VercelAiProvider";

// generateText passes through to the real SDK unless a test queues a response, so a test can
// read the model the provider built without a network call.
vi.mock("ai", async (importOriginal) => {
    const actual = await importOriginal<typeof import("ai")>();
    return { ...actual, generateText: vi.fn(actual.generateText) };
});

/** Create a StreamCallbacks object with no-op defaults and optional overrides */
function createCallbacks(overrides?: Partial<StreamCallbacks>): StreamCallbacks {
    return {
        onChunk: () => {
            /* no-op */
        },
        onToolCall: () => {
            /* no-op */
        },
        onToolResult: () => {
            /* no-op */
        },
        onComplete: () => {
            /* no-op */
        },
        onError: () => {
            /* no-op */
        },
        ...overrides,
    };
}

/** Get API key from environment with type safety */
function getApiKey(name: string): string {
    const key = process.env[name];
    if (!key) {
        throw new Error(`${name} not found`);
    }

    return key;
}

describe("VercelAiProvider", () => {
    describe("OpenAI", () => {
        it("initializes correctly", () => {
            const provider = new VercelAiProvider("openai");
            assert.strictEqual(provider.name, "openai");
            assert.strictEqual(provider.supportsStreaming, true);
            assert.strictEqual(provider.supportsTools, true);
        });

        it("throws without API key", async () => {
            const provider = new VercelAiProvider("openai");
            await expect(provider.generate([{ role: "user", content: "test" }], [])).rejects.toThrow(/API key/);
        });

        // These tests require actual API keys - run manually or in integration tests
        it.skipIf(!process.env.OPENAI_API_KEY)("generates text response", async () => {
            const provider = new VercelAiProvider("openai");
            provider.configure({ apiKey: getApiKey("OPENAI_API_KEY"), model: "gpt-4o-mini" });

            const response = await provider.generate([{ role: "user", content: "Say 'hello' and nothing else" }], []);

            assert.ok(response.text.toLowerCase().includes("hello"));
        });

        it.skipIf(!process.env.OPENAI_API_KEY)("handles tool calls", async () => {
            const provider = new VercelAiProvider("openai");
            provider.configure({ apiKey: getApiKey("OPENAI_API_KEY"), model: "gpt-4o-mini" });

            const response = await provider.generate(
                [{ role: "user", content: "Get the current weather in Paris" }],
                [
                    {
                        name: "getWeather",
                        description: "Get weather for a city",
                        parameters: z.object({ city: z.string() }),
                    },
                ],
            );

            assert.ok(response.toolCalls.length > 0);
            assert.strictEqual(response.toolCalls[0].name, "getWeather");
        });
    });

    describe("Anthropic", () => {
        it("initializes correctly", () => {
            const provider = new VercelAiProvider("anthropic");
            assert.strictEqual(provider.name, "anthropic");
            assert.strictEqual(provider.supportsStreaming, true);
            assert.strictEqual(provider.supportsTools, true);
        });

        it("throws without API key", async () => {
            const provider = new VercelAiProvider("anthropic");
            await expect(provider.generate([{ role: "user", content: "test" }], [])).rejects.toThrow(/API key/);
        });

        it.skipIf(!process.env.ANTHROPIC_API_KEY)("generates text response", async () => {
            const provider = new VercelAiProvider("anthropic");
            provider.configure({ apiKey: getApiKey("ANTHROPIC_API_KEY") });

            const response = await provider.generate([{ role: "user", content: "Say 'hello' and nothing else" }], []);

            assert.ok(response.text.toLowerCase().includes("hello"));
        });
    });

    describe("Google", () => {
        it("initializes correctly", () => {
            const provider = new VercelAiProvider("google");
            assert.strictEqual(provider.name, "google");
            assert.strictEqual(provider.supportsStreaming, true);
            assert.strictEqual(provider.supportsTools, true);
        });

        it("throws without API key", async () => {
            const provider = new VercelAiProvider("google");
            await expect(provider.generate([{ role: "user", content: "test" }], [])).rejects.toThrow(/API key/);
        });

        it.skipIf(!process.env.GOOGLE_API_KEY)("generates text response", async () => {
            const provider = new VercelAiProvider("google");
            provider.configure({ apiKey: getApiKey("GOOGLE_API_KEY") });

            const response = await provider.generate([{ role: "user", content: "Say 'hello' and nothing else" }], []);

            assert.ok(response.text.toLowerCase().includes("hello"));
        });
    });

    describe("configure", () => {
        it("allows setting all options", () => {
            const provider = new VercelAiProvider("openai");
            provider.configure({
                apiKey: "sk-test",
                model: "gpt-4",
                baseUrl: "https://custom.api.com",
                maxTokens: 2000,
                temperature: 0.5,
            });
            // No assertion needed - just verify it doesn't throw
        });

        it("allows reconfiguring", () => {
            const provider = new VercelAiProvider("openai");
            provider.configure({ apiKey: "sk-first" });
            provider.configure({ apiKey: "sk-second", model: "gpt-4o" });
            // Should not throw
        });
    });

    /**
     * A retired default model fails every request of a consumer who names no model: Anthropic
     * retired claude-3-haiku-20240307 and Google retired gemini-2.0-flash. The live tests above
     * (with keys) call each provider's default; these pin which model id each default is.
     */
    describe("default models", () => {
        it.each([
            ["openai", "gpt-4o"],
            ["anthropic", "claude-haiku-4-5-20251001"],
            ["google", "gemini-3.8-flash"],
        ] as const)("%s defaults to %s", async (type, expected) => {
            const provider = new VercelAiProvider(type);
            provider.configure({ apiKey: "test-key" });
            const spy = vi.mocked(ai.generateText).mockResolvedValueOnce({
                text: "",
                toolCalls: [],
                usage: {},
            } as unknown as Awaited<ReturnType<typeof ai.generateText>>);

            await provider.generate([{ role: "user", content: "hi" }], []);

            const { model } = spy.mock.lastCall?.[0] as unknown as { model: { modelId: string } };
            assert.strictEqual(model.modelId, expected);
        });
    });

    describe("tool results", () => {
        it("names each tool result after the call it answers", async () => {
            // Google refuses a function response with an empty name, which is what every tool
            // result carried, so a second ask after a tool call always failed there.
            const provider = new VercelAiProvider("google");
            provider.configure({ apiKey: "test-key" });
            const spy = vi.mocked(ai.generateText).mockResolvedValueOnce({
                text: "",
                toolCalls: [],
                usage: {},
            } as unknown as Awaited<ReturnType<typeof ai.generateText>>);

            await provider.generate(
                [
                    { role: "user", content: "find servers" },
                    {
                        role: "assistant",
                        content: "",
                        toolCalls: [{ id: "c1", name: "findNodes", arguments: { selector: "data.type == 'server'" } }],
                    },
                    { role: "tool", toolCallId: "c1", content: "{}" },
                ],
                [],
            );

            const { messages } = spy.mock.lastCall?.[0] as unknown as {
                messages: { role: string; content: { toolName?: string }[] }[];
            };
            assert.strictEqual(messages[2].content[0].toolName, "findNodes");
        });
    });

    describe("generateStream", () => {
        it("throws without API key", async () => {
            const provider = new VercelAiProvider("openai");

            await expect(
                provider.generateStream([{ role: "user", content: "test" }], [], createCallbacks()),
            ).rejects.toThrow(/API key/);
        });

        it.skipIf(!process.env.OPENAI_API_KEY)("streams text response", async () => {
            const provider = new VercelAiProvider("openai");
            provider.configure({ apiKey: getApiKey("OPENAI_API_KEY"), model: "gpt-4o-mini" });

            const chunks: string[] = [];
            let completed = false;

            await provider.generateStream(
                [{ role: "user", content: "Say 'hello' and nothing else" }],
                [],
                createCallbacks({
                    onChunk: (text) => chunks.push(text),
                    onComplete: () => {
                        completed = true;
                    },
                }),
            );

            assert.ok(chunks.length > 0);
            assert.ok(completed);
            const fullText = chunks.join("");
            assert.ok(fullText.toLowerCase().includes("hello"));
        });
    });
});
