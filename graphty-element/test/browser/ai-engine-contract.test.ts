/**
 * The engine contract in a real browser, for every engine: the fake, `LlmProviderEngine` over the
 * mock, and the provider-API engine on each provider, through TanStack AI and the provider's SDK
 * as a page runs them, to a fake `fetch`.
 * @module test/browser/ai-engine-contract.test
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { fakeFixture, mockProviderFixture, runEngineContract } from "../ai/engine/contract";
import { KEYS, providerApiFixture } from "../ai/engine/providerApiFixtures";

/**
 * Everything TanStack AI broadcasts on the page, received the way TanStack Devtools receives it:
 * by answering its connect handshake. Installed before any turn runs, so its first turn connects.
 */
const broadcast: unknown[] = [];
window.addEventListener("tanstack-connect", () => {
    window.dispatchEvent(new CustomEvent("tanstack-connect-success"));
});
window.addEventListener("tanstack-dispatch-event", (event) => {
    broadcast.push((event as CustomEvent<unknown>).detail);
});

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

    it("puts no key in what TanStack AI broadcasts to the page's devtools", async () => {
        for (const provider of ["openai", "anthropic", "google"] as const) {
            const { engine, reply } = providerApiFixture(provider);
            reply({ text: "Two servers.", toolCalls: [{ id: "t1", name: "findNodes", arguments: { selector: "a" } }] });
            for await (const event of engine.turn(
                {
                    system: "You drive a graph.",
                    messages: [
                        {
                            id: "m1",
                            role: "user",
                            parts: [{ type: "text", origin: "reader", text: "find the servers" }],
                        },
                    ],
                    tools: [],
                    toolMode: "auto",
                },
                new AbortController().signal,
            )) {
                assert.notStrictEqual(event.type, "error");
            }

            vi.unstubAllGlobals();
        }

        // The conversation is broadcast (documented in the guide); the keys are not.
        await vi.waitFor(() => {
            assert.include(JSON.stringify(broadcast), "find the servers");
        });
        const text = JSON.stringify(broadcast);
        for (const key of Object.values(KEYS)) {
            assert.notInclude(text, key);
        }
    });
});
