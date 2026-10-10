/**
 * Which in-browser models are sent the assistant's tools.
 *
 * WebLLM accepts `tools` only for the models in its exported `functionCallingModelIds` (the
 * Hermes models) and refuses the request for any other. These tests replace WebLLM's engine
 * factory with a fake that records each request, so they check what the provider SENDS; they
 * never load a model.
 *
 * Nothing here runs a real model through a tool call, and nothing in CI can: it needs a WebGPU
 * device and a 4 to 5 GB model download on every run, and CI's browsers have no WebGPU. Pulling
 * WebLLM into the browser test project would also make every browser shard pre-bundle it. To
 * check a real model by hand, select a Hermes model in the AiControl story with WebGPU available
 * and ask it to zoom to a node.
 */
import { assert, beforeEach, describe, it, vi } from "vitest";
import { z } from "zod";

import type { ToolDefinition } from "../../../src/ai/providers/types";
import { WebLlmProvider } from "../../../src/ai/providers/WebLlmProvider";

/** Every request the fake engine received. */
const requests: Record<string, unknown>[] = [];
/** The responses the fake engine gives, in order; an empty queue answers with plain text. */
const responses: Record<string, unknown>[] = [];

vi.mock("@mlc-ai/web-llm", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@mlc-ai/web-llm")>();
    return {
        functionCallingModelIds: actual.functionCallingModelIds,
        CreateMLCEngine: () =>
            Promise.resolve({
                chat: {
                    completions: {
                        create: (request: Record<string, unknown>) => {
                            requests.push(structuredClone(request));
                            return Promise.resolve(
                                responses.shift() ?? { choices: [{ message: { content: "plain answer" } }] },
                            );
                        },
                    },
                },
            }),
    };
});

const TOOLS: ToolDefinition[] = [
    {
        name: "zoomToNodes",
        description: "Zoom the camera to the given nodes",
        parameters: z.object({ nodeIds: z.array(z.string()) }),
    },
];

/** WebLLM's snake_case response key. */
const TOOL_CALLS = "tool_calls";

const HERMES = "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC";
const LLAMA = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

/**
 * A provider for one model, initialized against the fake engine.
 * @param model - The WebLLM model id
 * @returns The ready provider
 */
async function providerFor(model: string): Promise<WebLlmProvider> {
    const provider = new WebLlmProvider();
    provider.configure({ model });
    await provider.initialize();
    return provider;
}

describe("WebLlmProvider tool capability", () => {
    beforeEach(() => {
        requests.length = 0;
        responses.length = 0;
        vi.spyOn(WebLlmProvider, "isWebGPUAvailable").mockResolvedValue(true);
    });

    it("marks exactly the models WebLLM accepts tools for", async () => {
        const { functionCallingModelIds } = await import("@mlc-ai/web-llm");
        for (const model of WebLlmProvider.getAvailableModels()) {
            assert.strictEqual(model.supportsTools, functionCallingModelIds.includes(model.id), model.id);
            assert.ok((model.downloadMB ?? 0) > 0, model.id);
        }
    });

    it("offers at least one model that can call tools, and keeps the default text-only", () => {
        const models = WebLlmProvider.getAvailableModels();
        assert.ok(models.some((m) => m.supportsTools === true));
        assert.strictEqual(new WebLlmProvider().modelSupportsTools, false);
    });

    it("reports the configured model's capability before and after loading", async () => {
        const provider = new WebLlmProvider();
        provider.configure({ model: HERMES });
        assert.strictEqual(provider.modelSupportsTools, true);
        await provider.initialize();
        assert.strictEqual(provider.modelSupportsTools, true);
    });

    it("sends no tools to a text-only model", async () => {
        const provider = await providerFor(LLAMA);
        const response = await provider.generate([{ role: "user", content: "zoom to a" }], TOOLS);

        assert.strictEqual(requests.length, 1);
        assert.notProperty(requests[0], "tools");
        assert.notProperty(requests[0], "tool_choice");
        assert.strictEqual(response.text, "plain answer");
    });

    it("sends no tools to a text-only model when streaming", async () => {
        responses.push({
            [Symbol.asyncIterator]: () => [{ choices: [{ delta: { content: "hi" } }] }][Symbol.iterator](),
        });
        const provider = await providerFor(LLAMA);
        let completed = false;
        await provider.generateStream([{ role: "user", content: "zoom to a" }], TOOLS, {
            onChunk: () => undefined,
            onToolCall: () => undefined,
            onToolResult: () => undefined,
            onComplete: () => {
                completed = true;
            },
            onError: () => undefined,
        });

        assert.ok(completed);
        assert.notProperty(requests[0], "tools");
    });

    it("sends tools as JSON Schema to a Hermes model and returns its calls", async () => {
        responses.push({
            choices: [
                {
                    message: {
                        content: null,
                        [TOOL_CALLS]: [{ id: "c1", function: { name: "zoomToNodes", arguments: '{"nodeIds":["a"]}' } }],
                    },
                },
            ],
        });
        const provider = await providerFor(HERMES);
        const response = await provider.generate([{ role: "user", content: "zoom to a" }], TOOLS);

        assert.strictEqual(requests.length, 1);
        const tools = requests[0].tools as { function: { name: string; parameters: Record<string, unknown> } }[];
        assert.strictEqual(tools[0].function.name, "zoomToNodes");
        assert.strictEqual(tools[0].function.parameters.type, "object");
        assert.deepEqual(response.toolCalls, [{ id: "c1", name: "zoomToNodes", arguments: { nodeIds: ["a"] } }]);
    });

    it("asks a Hermes model again without tools when it calls none, for a text answer", async () => {
        responses.push({ choices: [{ message: { content: null, [TOOL_CALLS]: [] } }] });
        const provider = await providerFor(HERMES);
        const response = await provider.generate([{ role: "user", content: "hello" }], TOOLS);

        assert.strictEqual(requests.length, 2);
        assert.property(requests[0], "tools");
        assert.notProperty(requests[1], "tools");
        assert.strictEqual(response.text, "plain answer");
    });

    it("sends no tools when the caller asks for a text answer", async () => {
        const provider = await providerFor(HERMES);
        await provider.generate([{ role: "user", content: "answer now" }], TOOLS, { toolChoice: "none" });

        assert.strictEqual(requests.length, 1);
        assert.notProperty(requests[0], "tools");
    });

    it("hands earlier tool calls back as string content, which WebLLM requires", async () => {
        const provider = await providerFor(HERMES);
        await provider.generate(
            [
                { role: "user", content: "zoom to a" },
                {
                    role: "assistant",
                    content: "",
                    toolCalls: [{ id: "c1", name: "zoomToNodes", arguments: { nodeIds: ["a"] } }],
                },
                { role: "tool", toolCallId: "c1", content: "done" },
            ],
            TOOLS,
            { toolChoice: "none" },
        );

        const messages = requests[0].messages as { role: string; content: unknown }[];
        assert.strictEqual(messages[1].content, '[{"name":"zoomToNodes","arguments":{"nodeIds":["a"]}}]');
    });
});
