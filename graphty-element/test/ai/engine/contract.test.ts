/**
 * The engine contract in Node, for every engine: the fake, `LlmProviderEngine` over the mock, and
 * the provider-API engine on each provider, through TanStack AI and the provider's SDK to a fake
 * `fetch`.
 * @module test/ai/engine/contract.test
 */

import { afterEach, vi } from "vitest";

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
