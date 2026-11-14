/**
 * Retry Behavior LLM Regression Tests
 * @module test/ai/llm-regression/retry-behavior
 *
 * Live checks of the harness against the real API: a valid prompt answers, and a request the API
 * refuses fails with the API's own error. The retry loop itself (maxRetries, retryOn) is tested
 * offline in harness.test.ts, where a failure can be made to happen.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { assertAnswered, LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { serverNetworkFixture } from "./fixtures/test-graph-fixtures";

describe.skipIf(skipIfNoApiKey())("Retry Behavior LLM Regression", () => {
    let harness: LlmRegressionTestHarness;

    beforeEach(async () => {
        harness = await LlmRegressionTestHarness.create({
            graphData: serverNetworkFixture,
        });
    });

    afterEach(() => {
        harness.dispose();
    });

    it("completes successfully without retries for valid prompts", async () => {
        const result = await harness.testPrompt("How many edges exist?", undefined, {
            maxRetries: 3,
        });

        assertAnswered(result, ["query"], /\b3\b|three/i);
    });

    it("throws the API's own error when the request fails", async () => {
        // A request the API refuses must fail the test with its real cause, not surface as
        // "no tool was called". A model that does not exist is refused before any tokens are
        // spent, so this costs nothing.
        const broken = await LlmRegressionTestHarness.create({
            graphData: serverNetworkFixture,
            model: "graphty-no-such-model",
        });
        try {
            await broken.testPrompt("Run pagerank algorithm", undefined, { maxRetries: 0 });
            assert.fail("Expected the failed request to throw");
        } catch (error) {
            assert.ok(error instanceof Error);
            assert.match(error.message, /request failed before any tool ran: .*graphty-no-such-model/);
        } finally {
            broken.dispose();
        }
    });
});
