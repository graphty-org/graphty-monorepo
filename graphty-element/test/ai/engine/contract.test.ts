/**
 * The engine contract in Node, for every engine: the fake, `LlmProviderEngine` over the mock, and
 * the provider-API engine on each provider, through TanStack AI and the provider's SDK to a fake
 * `fetch`.
 * @module test/ai/engine/contract.test
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import type { TurnEvent } from "../../../src/ai/engine/types";
import { fakeFixture, mockProviderFixture, runEngineContract } from "./contract";
import { providerApiFixture } from "./providerApiFixtures";

afterEach(() => {
    vi.unstubAllGlobals();
});

runEngineContract("FakeEngine", fakeFixture);
runEngineContract("LlmProviderEngine(MockLlmProvider)", mockProviderFixture);
for (const provider of ["openai", "anthropic", "google"] as const) {
    runEngineContract(`ProviderApiEngine(${provider})`, () => providerApiFixture(provider));
}

describe("the provider's own tools on each engine", () => {
    it("LlmProviderEngine offers none of them: an LlmProvider has no tools of its own", () => {
        assert.deepEqual(mockProviderFixture().engine.capabilities("mock").hostedTools, {
            "web-search": "unsupported",
            "web-fetch": "unsupported",
        });
    });

    it("FakeEngine offers what a test scripts, and plays a scripted hosted-tool result", async () => {
        const engine = new FakeEngine();
        assert.strictEqual(engine.capabilities().hostedTools["web-search"], "unsupported");
        engine.capability = {
            toolCalls: "available",
            hostedTools: { "web-search": "available", "web-fetch": "unsupported" },
        };
        assert.strictEqual(engine.capabilities().hostedTools["web-search"], "available");

        const searched: TurnEvent = {
            type: "hosted-tool",
            tool: "web-search",
            status: "done",
            sources: [{ url: "https://example.org/", title: "Example" }],
        };
        engine.push([searched, { type: "finish", reason: "paused" }]);
        const seen: TurnEvent[] = [];
        for await (const event of engine.turn(
            {
                system: "",
                messages: [],
                tools: [],
                hostedTools: [{ tool: "web-search", maxUses: 1 }],
                toolMode: "auto",
            },
            new AbortController().signal,
        )) {
            seen.push(event);
        }

        assert.deepEqual(seen, [searched, { type: "finish", reason: "paused" }]);
        assert.deepEqual(engine.requests[0].hostedTools, [{ tool: "web-search", maxUses: 1 }]);
    });
});
