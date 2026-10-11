/**
 * The engine contract in Node, for every engine milestone 1 has.
 * @module test/ai/engine/contract.test
 */

import { fakeFixture, mockProviderFixture, runEngineContract } from "./contract";

runEngineContract("FakeEngine", fakeFixture);
runEngineContract("LlmProviderEngine(MockLlmProvider)", mockProviderFixture);
