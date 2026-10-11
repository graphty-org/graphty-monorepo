/**
 * The engine contract in a real browser, for every engine milestone 1 has: the provider-API
 * engine joins here in milestone 2, since a page is where it runs.
 * @module test/browser/ai-engine-contract.test
 */

import { fakeFixture, mockProviderFixture, runEngineContract } from "../ai/engine/contract";

runEngineContract("FakeEngine", fakeFixture);
runEngineContract("LlmProviderEngine(MockLlmProvider)", mockProviderFixture);
