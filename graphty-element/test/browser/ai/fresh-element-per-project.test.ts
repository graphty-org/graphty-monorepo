/**
 * @file An application that mounts a fresh element per project, as the graphty app's ElementHost
 * does: the consumer calls `enableAiControl` on the new element, the saved key comes back from
 * storage with nothing retyped, and a run in progress on the old element ends with `AI_DISPOSED`.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import type { Graphty } from "../../../index.js";
import type { AiManagerConfig } from "../../../src/ai/AiManager";
import { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import { VercelAiProvider } from "../../../src/ai/providers/VercelAiProvider";

const KEY = "sk-test-0123456789abcdefghij";
const PREFIX = "@graphty-test-fresh-element";

/**
 * An element on the page with the assistant experiment on.
 * @returns It, settled.
 */
async function mount(): Promise<Graphty> {
    const made = document.createElement("graphty-element");
    made.style.cssText = "display:block;width:300px;height:200px";
    made.features = ["assistant"];
    document.body.appendChild(made);
    await made.waitForSettled();
    return made;
}

/** A model still thinking when its message is ended. */
class SlowProvider extends MockLlmProvider {
    asked = false;

    /**
     * Think until the message ends.
     * @param _messages - The conversation.
     * @param _tools - The tools.
     * @param options - What ends the message.
     * @returns When ended, rejected.
     */
    override generate(
        _messages: Parameters<MockLlmProvider["generate"]>[0],
        _tools: Parameters<MockLlmProvider["generate"]>[1],
        options?: Parameters<MockLlmProvider["generate"]>[2],
    ): ReturnType<MockLlmProvider["generate"]> {
        this.asked = true;
        return new Promise((_resolve, reject) => {
            options?.signal?.addEventListener("abort", () => {
                reject(new Error("aborted"));
            });
        });
    }
}

/** The key's storage, as a project's assistant asks for it. */
const REMEMBER: AiManagerConfig["keyPersistence"] = { enabled: true, prefix: PREFIX };

describe("a fresh element per project", () => {
    const made: Graphty[] = [];

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        for (const element of made.splice(0)) {
            element.disableAiControl();
            element.remove();
        }

        localStorage.clear();
    });

    it("gets the key back from storage on the new element", async () => {
        const first = await mount();
        made.push(first);
        await first.enableAiControl({
            toolset: "generated",
            provider: "openai",
            apiKey: KEY,
            keyPersistence: REMEMBER,
        });
        first.disableAiControl();
        first.remove();

        const second = await mount();
        made.push(second);
        await second.enableAiControl({ toolset: "generated", provider: "openai", keyPersistence: REMEMBER });

        assert.strictEqual(second.graph.getApiKeyManager()?.getKey("openai"), KEY);
    });

    it("hands the key from storage to the provider, so a message needs no retyping", async () => {
        const first = await mount();
        made.push(first);
        await first.enableAiControl({ provider: "openai", apiKey: KEY, keyPersistence: REMEMBER });
        first.disableAiControl();
        first.remove();

        const configure = vi.spyOn(VercelAiProvider.prototype, "configure");
        const second = await mount();
        made.push(second);
        await second.enableAiControl({ provider: "openai", keyPersistence: REMEMBER });

        assert.strictEqual(configure.mock.lastCall?.[0].apiKey, KEY);
        configure.mockRestore();
    });

    it("ends a run in progress on the old element with AI_DISPOSED", async () => {
        const old = await mount();
        made.push(old);
        const model = new SlowProvider();
        await old.enableAiControl({ toolset: "generated", provider: "mock", providerInstance: model });

        const running = old.aiCommand("how many nodes?");
        await vi.waitFor(() => {
            assert.isTrue(model.asked, "the model was asked");
        });
        old.disableAiControl();

        const { code } = await running;
        assert.strictEqual(code, "AI_DISPOSED");
    });
});
