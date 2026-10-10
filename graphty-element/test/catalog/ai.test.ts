import { assert, describe, it } from "vitest";

import { AI_PROVIDER_DESCRIPTORS, AI_PROVIDER_IDS, aiProviderDescriptor, checkApiKeyShape } from "../../catalog";
import { WebLlmProvider } from "../../src/ai/providers/WebLlmProvider";

describe("AI provider catalogue", () => {
    it("describes every provider id exactly once", () => {
        assert.deepEqual(AI_PROVIDER_DESCRIPTORS.map((entry) => entry.id).sort(), [...AI_PROVIDER_IDS].sort());
    });

    it("lists each provider's default model among its models", () => {
        for (const entry of AI_PROVIDER_DESCRIPTORS) {
            assert.isTrue(
                entry.models.some((model) => model.id === entry.defaultModel),
                `${entry.id}'s default model is not in its list`,
            );
            assert.equal(entry.keyShape !== undefined, entry.requiresKey, `${entry.id}'s key shape`);
        }
    });

    it("is the list WebLlmProvider offers", () => {
        assert.deepEqual(
            WebLlmProvider.getAvailableModels().map((model) => [model.id, model.supportsTools]),
            aiProviderDescriptor("webllm").models.map((model) => [model.id, model.supportsTools]),
        );
    });

    it("checks a key's shape with a code and its parameters", () => {
        assert.deepEqual(checkApiKeyShape("anthropic", "sk-ant-0123456789abcdefgh"), { valid: true });
        assert.deepEqual(checkApiKeyShape("anthropic", ""), { valid: false, code: "E_KEY_EMPTY", params: {} });
        assert.deepEqual(checkApiKeyShape("anthropic", "sk-0123456789abcdefghij"), {
            valid: false,
            code: "E_KEY_PREFIX",
            params: { prefix: "sk-ant-" },
        });
        assert.deepEqual(checkApiKeyShape("openai", "sk-short"), {
            valid: false,
            code: "E_KEY_TOO_SHORT",
            params: { minLength: 21 },
        });
        assert.deepEqual(checkApiKeyShape("google", "0123456789a"), { valid: true });
    });
});
