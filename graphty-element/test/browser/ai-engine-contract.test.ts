/**
 * The engine contract in a real browser, for every engine: the fake, `LlmProviderEngine` over the
 * mock, and the provider-API engine on each provider, through TanStack AI and the provider's SDK
 * as a page runs them, to a fake `fetch`.
 * @module test/browser/ai-engine-contract.test
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { fakeFixture, mockProviderFixture, runEngineContract } from "../ai/engine/contract";
import { providerApiFixture } from "../ai/engine/providerApiFixtures";

afterEach(() => {
    vi.unstubAllGlobals();
});

runEngineContract("FakeEngine", fakeFixture);
runEngineContract("LlmProviderEngine(MockLlmProvider)", mockProviderFixture);
for (const provider of ["openai", "anthropic", "google"] as const) {
    runEngineContract(`ProviderApiEngine(${provider})`, () => providerApiFixture(provider));
}

describe("the provider-API engine in a page", () => {
    it("reads no key from the page's globals and writes none there", async () => {
        const before = (window as { env?: unknown }).env;
        for (const provider of ["openai", "anthropic", "google"] as const) {
            const { engine, requests } = providerApiFixture(provider);
            for await (const event of engine.turn(
                {
                    system: "",
                    messages: [{ id: "m1", role: "user", parts: [{ type: "text", origin: "reader", text: "hi" }] }],
                    tools: [],
                    toolMode: "auto",
                },
                new AbortController().signal,
            )) {
                assert.notStrictEqual(event.type, "error");
            }

            assert.strictEqual(requests.length, 1, provider);
            vi.unstubAllGlobals();
        }

        assert.strictEqual((window as { env?: unknown }).env, before);
    });
});
