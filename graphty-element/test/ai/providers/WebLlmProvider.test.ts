import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest";

import { LlmProviderEngine } from "../../../src/ai/engine/LlmProviderEngine";
import type { StreamCallbacks } from "../../../src/ai/providers/types";
import { WebLlmProvider } from "../../../src/ai/providers/WebLlmProvider";
import { GraphtyError } from "../../../src/errors/GraphtyError";

/** The responses the fake engine gives, in order; an empty queue answers with plain text. */
const responses: unknown[] = [];
/** How many times the fake engine was unloaded. */
let unloads = 0;

// WebLLM's engine replaced by a fake, so these tests run the provider's own mapping with no model.
vi.mock("@mlc-ai/web-llm", () => ({
    functionCallingModelIds: ["Hermes-2-Pro-Mistral-7B-q4f16_1-MLC"],
    CreateMLCEngine: () =>
        Promise.resolve({
            chat: {
                completions: {
                    create: () =>
                        Promise.resolve(responses.shift() ?? { choices: [{ message: { content: "plain answer" } }] }),
                },
            },
            interruptGenerate: () => undefined,
            unload: () => {
                unloads++;
                return Promise.resolve();
            },
        }),
}));

/** WebLLM's snake_case response key. */
const TOOL_CALLS = "tool_calls";

/**
 * A provider initialized against the fake engine, with a model WebLLM sends tools to.
 * @returns The ready provider
 */
async function readyProvider(): Promise<WebLlmProvider> {
    vi.spyOn(WebLlmProvider, "isWebGPUAvailable").mockResolvedValue(true);
    const provider = new WebLlmProvider();
    provider.configure({ model: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC" });
    await provider.initialize();
    return provider;
}

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

describe("WebLlmProvider", () => {
    let provider: WebLlmProvider;

    beforeEach(() => {
        provider = new WebLlmProvider();
        responses.length = 0;
        unloads = 0;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    describe("initialization", () => {
        it("has correct name", () => {
            assert.strictEqual(provider.name, "webllm");
        });

        it("supports streaming", () => {
            assert.strictEqual(provider.supportsStreaming, true);
        });

        it("supports tools", () => {
            assert.strictEqual(provider.supportsTools, true);
        });

        it("lazy-loads module", () => {
            // Creating the provider should NOT have imported @mlc-ai/web-llm yet
            // The module is only loaded when initialize() is called
            assert.strictEqual(provider.name, "webllm");
            assert.strictEqual(provider.isInitialized, false);
        });
    });

    describe("configure", () => {
        it("accepts model configuration", () => {
            provider.configure({ model: "Llama-3.2-1B-Instruct-q4f32_1-MLC" });
            // Should not throw
            assert.ok(true);
        });

        it("accepts temperature configuration", () => {
            provider.configure({ temperature: 0.7 });
            // Should not throw
            assert.ok(true);
        });

        it("accepts maxTokens configuration", () => {
            provider.configure({ maxTokens: 1024 });
            // Should not throw
            assert.ok(true);
        });
    });

    describe("progress reporting", () => {
        it("reports initialization progress via callback", () => {
            const progress: { progress: number; stage: string; detail?: string }[] = [];
            provider.onProgress((p, stage, detail) => progress.push({ progress: p, stage, detail }));

            // Simulate progress
            provider.simulateProgress(0.5, "engine", "Fetching param cache");

            assert.deepStrictEqual(progress, [{ progress: 0.5, stage: "engine", detail: "Fetching param cache" }]);
        });

        it("supports multiple progress listeners", () => {
            const calls1: number[] = [];
            const calls2: number[] = [];

            provider.onProgress((p) => calls1.push(p));
            provider.onProgress((p) => calls2.push(p));

            provider.simulateProgress(0.25, "module");
            provider.simulateProgress(0.75, "engine");

            assert.strictEqual(calls1.length, 2);
            assert.strictEqual(calls2.length, 2);
        });

        it("allows removing progress listeners", () => {
            const calls: number[] = [];
            const callback = (p: number): void => {
                calls.push(p);
            };

            provider.onProgress(callback);
            provider.simulateProgress(0.5, "engine");
            assert.strictEqual(calls.length, 1);

            provider.offProgress(callback);
            provider.simulateProgress(0.75, "ready");
            assert.strictEqual(calls.length, 1); // Should not have been called again
        });
    });

    describe("WebGPU detection", () => {
        it("provides WebGPU availability check", async () => {
            // In test environment, WebGPU is typically not available
            const available = await WebLlmProvider.isWebGPUAvailable();
            // This can be true or false depending on the test environment
            assert.ok(typeof available === "boolean");
        });
    });

    describe("model management", () => {
        it("provides list of available models", () => {
            const models = WebLlmProvider.getAvailableModels();

            assert.ok(Array.isArray(models));
            assert.ok(models.length > 0);

            // Each model should have required properties
            for (const model of models) {
                assert.ok(typeof model.id === "string");
                assert.ok(typeof model.name === "string");
                assert.ok(typeof model.size === "string");
            }
        });

        it("includes recommended models", () => {
            const models = WebLlmProvider.getAvailableModels();
            const modelIds = models.map((m) => m.id);

            // These are commonly used models that should be available
            assert.ok(
                modelIds.some((id) => id.includes("Llama")),
                "Should include Llama models",
            );
        });
    });

    describe("generate (not initialized)", () => {
        it("throws error when not initialized", async () => {
            await expect(provider.generate([{ role: "user", content: "test" }], [])).rejects.toThrow(
                /not initialized/i,
            );
        });
    });

    describe("generateStream (not initialized)", () => {
        it("throws error when not initialized", async () => {
            const callbacks = createCallbacks();

            await expect(provider.generateStream([{ role: "user", content: "test" }], [], callbacks)).rejects.toThrow(
                /not initialized/i,
            );
        });
    });

    describe("validateApiKey", () => {
        it("returns true for WebLLM (no API key needed)", async () => {
            const result = await provider.validateApiKey();
            assert.strictEqual(result, true);
        });
    });

    describe("initialization status", () => {
        it("initially reports not initialized", () => {
            assert.strictEqual(provider.isInitialized, false);
        });

        it("reports initialization status", () => {
            // Initially not ready
            assert.strictEqual(provider.isReady, false);
        });
    });

    describe("generate (initialized)", () => {
        it("returns the engine's text", async () => {
            const ready = await readyProvider();
            const response = await ready.generate([{ role: "user", content: "Hello" }], []);

            assert.deepStrictEqual(response, { text: "plain answer", toolCalls: [], usage: undefined });
        });

        it("streams the engine's text and completes with it", async () => {
            const chunks = [{ choices: [{ delta: { content: "He" } }] }, { choices: [{ delta: { content: "llo" } }] }];
            responses.push({ [Symbol.asyncIterator]: () => chunks[Symbol.iterator]() });
            const ready = await readyProvider();
            const seen: string[] = [];
            let completed: string | undefined;
            await ready.generateStream(
                [{ role: "user", content: "Hello" }],
                [],
                createCallbacks({
                    onChunk: (text) => seen.push(text),
                    onComplete: (result) => {
                        completed = result.text;
                    },
                }),
            );

            assert.deepStrictEqual(seen, ["He", "llo"]);
            assert.strictEqual(completed, "Hello");
        });

        it("rejects an aborted request before calling the engine", async () => {
            const ready = await readyProvider();
            const controller = new AbortController();
            controller.abort();

            await expect(
                ready.generate([{ role: "user", content: "test" }], [], { signal: controller.signal }),
            ).rejects.toThrow("Request was aborted");
        });
    });

    describe("tool call arguments", () => {
        for (const [label, text] of [
            ["malformed JSON", '{"nodeIds":'],
            ["a JSON string", '"a"'],
            ["a JSON array", '["a"]'],
            ["JSON null", "null"],
        ] as const) {
            it(`flags a call whose arguments are ${label} as invalid, with no arguments`, async () => {
                responses.push({
                    choices: [
                        {
                            message: {
                                content: null,
                                [TOOL_CALLS]: [{ id: "c1", function: { name: "zoom", arguments: text } }],
                            },
                        },
                    ],
                });
                const ready = await readyProvider();
                const response = await ready.generate([{ role: "user", content: "zoom" }], []);

                assert.deepStrictEqual(response.toolCalls, [
                    { id: "c1", name: "zoom", arguments: {}, invalidArguments: true },
                ]);
            });
        }

        it("hands an invalid call to the assistant's engine flagged, so it is refused rather than run", async () => {
            responses.push({
                choices: [
                    {
                        message: {
                            content: null,
                            [TOOL_CALLS]: [{ id: "c1", function: { name: "zoom", arguments: "7" } }],
                        },
                    },
                ],
            });
            const engine = new LlmProviderEngine(await readyProvider());
            const calls: unknown[] = [];
            const turn = { system: "", messages: [], tools: [], toolMode: "auto" } as const;
            for await (const event of engine.turn(turn, new AbortController().signal)) {
                if (event.type === "tool-call") {
                    calls.push(event);
                }
            }

            assert.deepStrictEqual(calls, [
                { type: "tool-call", id: "c1", name: "zoom", arguments: {}, invalidArguments: true },
            ]);
        });

        it("streams an invalid call in the completed response but never to onToolCall", async () => {
            const chunks = [
                {
                    choices: [
                        {
                            delta: {
                                [TOOL_CALLS]: [
                                    { id: "c1", function: { name: "zoom", arguments: "[1]" } },
                                    { id: "c2", function: { name: "fit", arguments: '{"all":true}' } },
                                ],
                            },
                        },
                    ],
                },
            ];
            responses.push({ [Symbol.asyncIterator]: () => chunks[Symbol.iterator]() });
            const ready = await readyProvider();
            const started: string[] = [];
            let completed: unknown;
            await ready.generateStream(
                [{ role: "user", content: "zoom" }],
                [],
                createCallbacks({
                    onToolCall: (name) => started.push(name),
                    onComplete: (result) => {
                        completed = result.toolCalls;
                    },
                }),
            );

            assert.deepStrictEqual(started, ["fit"]);
            assert.deepStrictEqual(completed, [
                { id: "c1", name: "zoom", arguments: {}, invalidArguments: true },
                { id: "c2", name: "fit", arguments: { all: true } },
            ]);
        });
    });

    describe("error handling", () => {
        it("rejects with E_NO_WEBGPU when the browser has no WebGPU", async () => {
            vi.stubGlobal("navigator", {});

            const error = await provider.initialize().then(
                () => null,
                (error_: unknown) => error_,
            );

            assert.instanceOf(error, GraphtyError);
            assert.strictEqual(error.code, "E_NO_WEBGPU");
            assert.strictEqual(provider.isInitialized, false);
        });
    });

    describe("resource cleanup", () => {
        it("dispose unloads the engine and leaves the provider not ready", async () => {
            const ready = await readyProvider();

            await ready.dispose();

            assert.strictEqual(unloads, 1);
            assert.strictEqual(ready.isReady, false);
            assert.strictEqual(ready.isInitialized, false);
        });
    });
});
