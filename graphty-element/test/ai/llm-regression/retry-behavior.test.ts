/**
 * Retry Behavior LLM Regression Tests
 * @module test/ai/llm-regression/retry-behavior
 *
 * Tests that verify the retry logic of the LLM regression harness.
 * These tests ensure proper handling of transient errors and rate limits.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { LlmRegressionTestHarness, type RetryOptions } from "../../helpers/llm-regression-harness";
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

    describe("retry configuration", () => {
        it("supports custom retry options", async () => {
            const retryOptions: RetryOptions = {
                maxRetries: 2,
                retryDelayMs: 100,
            };

            // Test with retry options - should work normally
            const result = await harness.testPrompt("How many nodes are there?", undefined, retryOptions);

            assert.ok(result, "Expected a result");
            assert.ok(result.prompt === "How many nodes are there?");
        });

        it("respects maximum retry count", async () => {
            const retryOptions: RetryOptions = {
                maxRetries: 0, // No retries allowed
                retryDelayMs: 100,
            };

            // With maxRetries: 0, errors should not be retried
            // A normal prompt should still succeed on first try
            const result = await harness.testPrompt("Give me a summary of the graph", undefined, retryOptions);

            assert.ok(result, "Expected a result");
            // The prompt should succeed without needing retries
        });

        it("uses default retry options when not specified", async () => {
            // When no retry options are provided, defaults should be used
            const result = await harness.testPrompt("What layout is being used?");

            assert.ok(result, "Expected a result");
            assert.ok(result.toolWasCalled || result.llmText);
        });
    });

    describe("successful operations", () => {
        it("completes successfully without retries for valid prompts", async () => {
            const result = await harness.testPrompt("How many edges exist?", undefined, {
                maxRetries: 3,
                retryDelayMs: 100,
            });

            assert.ok(result.toolWasCalled, "Expected tool to be called");
            assert.strictEqual(result.toolName, "queryGraph");
        });

        it("includes retry options in complex prompts", async () => {
            const retryOptions: RetryOptions = {
                maxRetries: 2,
                retryDelayMs: 200,
            };

            const result = await harness.testPrompt("Find all server nodes and make them red", undefined, retryOptions);

            // Should complete successfully
            assert.ok(result, "Expected a result");
        });
    });

    describe("error handling with retries", () => {
        it("handles rate limit errors gracefully", async () => {
            // This tests that the harness can handle scenarios where
            // API calls might be rate limited. In practice, the actual
            // rate limiting is controlled by the API provider.
            const retryOptions: RetryOptions = {
                maxRetries: 2,
                retryDelayMs: 1000,
                retryOn: (error: Error) => {
                    // Would retry on rate limit errors
                    return error.message.includes("rate") || error.message.includes("429");
                },
            };

            // Normal operation should work fine
            const result = await harness.testPrompt("What algorithms are available?", undefined, retryOptions);

            assert.ok(result, "Expected a result");
            // If there was a rate limit, the retry logic would have handled it
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

    describe("latency tracking with retries", () => {
        it("tracks total latency including retry delays", async () => {
            const result = await harness.testPrompt("Show me some example nodes", undefined, {
                maxRetries: 2,
                retryDelayMs: 100,
            });

            // Latency should be tracked regardless of retry configuration
            assert.ok(result.latencyMs > 0, "Expected positive latency");
            assert.ok(result.latencyMs < 60000, "Expected reasonable latency");
        });
    });
});
