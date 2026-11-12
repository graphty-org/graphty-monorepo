/**
 * The model and its options from `enableAiControl` reach the provider, and a key set later does
 * not take them away.
 * @module test/ai/AiManager.options.test
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createAiManager } from "../../src/ai/AiManager";
import { MockLlmProvider } from "../../src/ai/providers/MockLlmProvider";
import type { ProviderOptions } from "../../src/ai/providers/types";
import { VercelAiProvider } from "../../src/ai/providers/VercelAiProvider";
import type { Graph } from "../../src/Graph";
import { assistantSession } from "../helpers/assistant";

// The key store's encryption needs a browser global this project has not got; no test here encrypts.
vi.mock("encrypt-storage", () => ({ EncryptStorage: vi.fn() }));

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * A stand-in graph with what `init` reads.
 * @returns the graph.
 */
async function stubGraph(): Promise<Graph> {
    const session = await assistantSession();
    return {
        getSession: () => session,
        eventManager: { emit: () => undefined, addListener: () => Symbol("l"), removeListener: () => undefined },
        getDataManager: () => ({ nodes: new Map(), edges: new Map() }),
        getNodeCount: () => 0,
        getEdgeCount: () => 0,
        getXRSessionManager: () => undefined,
    } as unknown as Graph;
}

describe("AiManager model options", () => {
    it("keeps a given key in the key store beside a provider instance", async () => {
        const ai = createAiManager();
        ai.init(await stubGraph(), {
            toolset: "generated",
            provider: "google",
            apiKey: "AIza-test-key-0123",
            providerInstance: new MockLlmProvider(),
        });
        assert.strictEqual(ai.getApiKeyManager().getKey("google"), "AIza-test-key-0123");
        ai.dispose();
    });

    it("configures the provider with them, and keeps them when the key changes", async () => {
        const configure = vi.spyOn(VercelAiProvider.prototype, "configure");
        const graph = await stubGraph();
        const ai = createAiManager();
        ai.init(graph, {
            toolset: "generated",
            provider: "google",
            apiKey: "AIza-test-key-0123",
            model: "gemini-3.1-pro-preview",
            temperature: 0.4,
            reasoningEffort: "high",
            thinkingBudgetTokens: 4096,
        });
        const expected: ProviderOptions = {
            model: "gemini-3.1-pro-preview",
            temperature: 0.4,
            reasoningEffort: "high",
            thinkingBudgetTokens: 4096,
        };
        assert.deepInclude(configure.mock.calls.at(-1)?.[0], { ...expected, apiKey: "AIza-test-key-0123" });

        ai.setApiKey("google", "AIza-other-key-4567");
        assert.deepInclude(configure.mock.calls.at(-1)?.[0], { ...expected, apiKey: "AIza-other-key-4567" });
        ai.dispose();
    });
});
