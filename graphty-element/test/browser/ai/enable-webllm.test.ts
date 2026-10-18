/**
 * @file `enableAiControl({ provider: "webllm" })` builds the in-browser provider itself.
 *
 * WebLLM's engine factory is replaced by a fake that answers in text, so no model downloads.
 */
import { afterEach, assert, describe, it, vi } from "vitest";

import { getWebLlmProviderClass } from "../../../src/ai/providers";
import { cleanupE2EGraph, createE2EGraph } from "../../helpers/e2e-graph-setup";

/** The model id each fake engine was created for. */
const enginesFor: string[] = [];

vi.mock("@mlc-ai/web-llm", () => ({
    functionCallingModelIds: [],
    CreateMLCEngine: (model: string) => {
        enginesFor.push(model);
        return Promise.resolve({
            chat: {
                completions: {
                    create: () => Promise.resolve({ choices: [{ message: { content: "hello from the browser" } }] }),
                },
            },
        });
    },
}));

const MODEL = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

afterEach(() => {
    cleanupE2EGraph();
    vi.restoreAllMocks();
    enginesFor.length = 0;
});

describe("enableAiControl with the WebLLM provider", () => {
    it("builds the provider and loads the model on the first command", async () => {
        const WebLlmProvider = await getWebLlmProviderClass();
        // CI's browsers have no WebGPU; the fake engine needs none.
        vi.spyOn(WebLlmProvider, "isWebGPUAvailable").mockResolvedValue(true);

        const { graph } = await createE2EGraph({ nodes: [{ id: "a" }], enableAi: false });
        await graph.enableAiControl({ provider: "webllm", model: MODEL });

        const provider = graph.getAiManager()?.getProvider();
        assert.strictEqual(provider?.name, "webllm");
        assert.deepStrictEqual(enginesFor, [], "nothing downloads before the first command");

        const result = await graph.aiCommand("say hello");

        assert.isTrue(result.success, result.message);
        assert.deepStrictEqual(enginesFor, [MODEL]);
    });
});
