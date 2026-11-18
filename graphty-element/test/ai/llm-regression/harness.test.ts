/**
 * LLM Regression Harness Unit Tests
 * @module test/ai/llm-regression/harness.test
 *
 * Tests for the LLM regression test harness infrastructure.
 * These tests verify the harness works correctly with both mocked and real LLM providers.
 */

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import { ProviderApiEngine } from "../../../src/ai/engine/ProviderApiEngine";
import type { TurnEvent } from "../../../src/ai/engine/types";
import {
    getLlmRegressionApiKey,
    getLlmRegressionKeyVariable,
    getLlmRegressionModel,
    getLlmRegressionProvider,
    getSkipReason,
    isLlmRegressionEnabled,
    skipIfNoApiKey,
} from "../../helpers/llm-regression-env";
import {
    accountRefusalOf,
    isTransientFailure,
    LlmRegressionTestHarness,
    RecordingEngine,
    type RequestFailure,
    type TestGraphFixture,
} from "../../helpers/llm-regression-harness";

describe("LlmRegressionTestHarness", () => {
    describe("Environment Utilities", () => {
        describe("provider selection", () => {
            afterEach(() => {
                vi.unstubAllEnvs();
            });

            it("defaults to google, as the release job runs, and its key variable and model", () => {
                vi.stubEnv("LLM_REGRESSION_PROVIDER", "");
                vi.stubEnv("LLM_REGRESSION_MODEL", "");
                assert.strictEqual(getLlmRegressionProvider(), "google");
                assert.strictEqual(getLlmRegressionKeyVariable(), "GOOGLE_API_KEY");
                assert.strictEqual(getLlmRegressionModel(), "gemini-3.8-flash");
            });

            it.each([
                ["openai", "OPENAI_API_KEY", "gpt-4o-mini"],
                ["anthropic", "ANTHROPIC_API_KEY", "claude-haiku-4-5-20251001"],
            ])("%s reads %s and defaults to %s", (provider, keyVariable, model) => {
                vi.stubEnv("LLM_REGRESSION_PROVIDER", provider);
                vi.stubEnv("LLM_REGRESSION_MODEL", "");
                assert.strictEqual(getLlmRegressionKeyVariable(), keyVariable);
                assert.strictEqual(getLlmRegressionModel(), model);
            });

            it("LLM_REGRESSION_MODEL overrides the default model", () => {
                vi.stubEnv("LLM_REGRESSION_MODEL", "some-model");
                assert.strictEqual(getLlmRegressionModel(), "some-model");
            });

            it("names the key to set, and the rename when only the old VITE_ name is set", () => {
                vi.stubEnv("LLM_REGRESSION_PROVIDER", "google");
                vi.stubEnv("GOOGLE_API_KEY", "");
                vi.stubEnv("VITE_GOOGLE_API_KEY", "");
                assert.strictEqual(
                    getSkipReason(),
                    "LLM regression tests require the GOOGLE_API_KEY environment variable to be set",
                );
                vi.stubEnv("VITE_GOOGLE_API_KEY", "AIza-old");
                assert.strictEqual(skipIfNoApiKey(), true);
                assert.match(getSkipReason(), /VITE_GOOGLE_API_KEY is set, .* rename it to GOOGLE_API_KEY$/);
                vi.stubEnv("GOOGLE_API_KEY", "AIza-new");
                assert.strictEqual(getLlmRegressionApiKey(), "AIza-new");
            });

            it("rejects a provider the element does not support", () => {
                vi.stubEnv("LLM_REGRESSION_PROVIDER", "mistral");
                assert.throws(() => getLlmRegressionProvider(), /must be one of openai, anthropic, google/);
            });
        });

        it("skipIfNoApiKey returns inverse of isLlmRegressionEnabled", () => {
            const skip = skipIfNoApiKey();
            const enabled = isLlmRegressionEnabled();
            assert.strictEqual(skip, !enabled);
        });

        it("getSkipReason returns descriptive message", () => {
            const reason = getSkipReason();
            assert.ok(reason.includes(getLlmRegressionKeyVariable()));
        });
    });

    describe("Harness Creation (No API Key)", () => {
        beforeEach(() => {
            // Mock environment to ensure no API key
            vi.stubEnv(getLlmRegressionKeyVariable(), "");
        });

        afterEach(() => {
            vi.unstubAllEnvs();
        });

        it("throws error when API key not available", async () => {
            // Skip if API key is actually set in the environment
            if (isLlmRegressionEnabled()) {
                return;
            }

            try {
                await LlmRegressionTestHarness.create();
                assert.fail("Expected error to be thrown");
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes(getLlmRegressionKeyVariable()));
            }
        });
    });

    // These tests run only when API key is available
    describe.skipIf(skipIfNoApiKey())("Harness with Real API", () => {
        let harness: LlmRegressionTestHarness;

        beforeEach(async () => {
            harness = await LlmRegressionTestHarness.create();
        });

        afterEach(() => {
            harness.dispose();
        });

        it("creates harness with default configuration", () => {
            assert.ok(harness);
            assert.ok(harness.getGraph());
        });

        it("tracks tool calls made during execution", async () => {
            const result = await harness.testPrompt("How many nodes are there?");

            assert.ok(result);
            assert.strictEqual(typeof result.toolWasCalled, "boolean");
            if (result.toolWasCalled) {
                assert.strictEqual(typeof result.toolName, "string");
                assert.ok(result.toolParams !== null);
            }
        });

        it("returns result structure with all required fields", async () => {
            const result = await harness.testPrompt("What layout is being used?");

            // Verify all required fields are present
            assert.strictEqual(typeof result.prompt, "string");
            assert.strictEqual(result.prompt, "What layout is being used?");
            assert.strictEqual(typeof result.toolWasCalled, "boolean");
            assert.strictEqual(typeof result.latencyMs, "number");
            // toolName, toolParams, commandResult, llmText can be null
        });
    });

    describe("account refusals", () => {
        /** A provider failure as the element codes it. */
        function providerError(status: number, message: string) {
            return {
                code: status === 401 || status === 403 ? ("AI_KEY_REJECTED" as const) : ("AI_PROVIDER_ERROR" as const),
                params: { provider: "google", status },
                message,
            };
        }

        it("a rejected key is the owner's to fix", () => {
            assert.strictEqual(accountRefusalOf(providerError(401, "authentication_error")), "HTTP 401");
            assert.strictEqual(accountRefusalOf(providerError(403, "permission_error")), "HTTP 403");
        });

        it("an empty balance is the owner's to fix, whatever status the provider uses", () => {
            assert.ok(
                accountRefusalOf(providerError(400, "Your credit balance is too low to access the Anthropic API.")),
            );
            assert.ok(accountRefusalOf(providerError(429, "You exceeded your current quota (insufficient_quota)")));
        });

        it("a depleted prepaid balance is the owner's to fix", () => {
            // Google, 2026-10-27: HTTP 402.
            const depleted = providerError(
                402,
                "Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing.",
            );
            assert.strictEqual(accountRefusalOf(depleted), "HTTP 402");
            assert.strictEqual(accountRefusalOf(providerError(402, "")), "HTTP 402");
        });

        it("a rate limit or an ordinary failure is not an account refusal", () => {
            assert.strictEqual(accountRefusalOf(providerError(429, "rate_limit_error")), null);
            assert.strictEqual(accountRefusalOf(providerError(500, "overloaded")), null);
            assert.strictEqual(
                accountRefusalOf({ code: "AI_TOOL_THREW", params: {}, message: "billing tool failed" }),
                null,
            );
        });
    });

    describe("retries", () => {
        it("asks again after a rate limit, a provider failure or a network failure, and after nothing else", () => {
            const failure = (
                code: "AI_PROVIDER_ERROR" | "AI_KEY_REJECTED",
                status?: number,
                message = "failed",
            ): RequestFailure => ({
                code,
                params: status === undefined ? { provider: "google" } : { provider: "google", status },
                message,
            });
            assert.isTrue(isTransientFailure(failure("AI_PROVIDER_ERROR", 429)));
            assert.isTrue(isTransientFailure(failure("AI_PROVIDER_ERROR", 503)));
            assert.isTrue(isTransientFailure(failure("AI_PROVIDER_ERROR", undefined, "fetch failed")));
            assert.isTrue(isTransientFailure(failure("AI_PROVIDER_ERROR", undefined, "read ECONNRESET")));
            // No status and no network failure: a response that failed validation fails the same way again.
            assert.isFalse(isTransientFailure(failure("AI_PROVIDER_ERROR", undefined, "Invalid JSON response")));
            assert.isFalse(isTransientFailure(failure("AI_PROVIDER_ERROR", 400)));
            assert.isFalse(isTransientFailure(failure("AI_KEY_REJECTED", 401)));
            assert.isFalse(isTransientFailure({ code: "AI_FAILED", params: {}, message: "failed" }));
            // The transport already retried these: asking again only waits past the case's limit.
            assert.isFalse(
                isTransientFailure(failure("AI_PROVIDER_ERROR", undefined, "E_LLM_FLEX_CAPACITY: fetch failed")),
            );
            assert.isFalse(
                isTransientFailure(failure("AI_PROVIDER_ERROR", undefined, "E_LLM_REQUEST_TIMEOUT: socket")),
            );
        });
    });

    describe("RecordingEngine", () => {
        it("records every turn's tool calls in order and sums the usage, passing every event on", async () => {
            const engine = new RecordingEngine(
                new FakeEngine([
                    [
                        { type: "tool-call", id: "t1", name: "findNodes", arguments: { selector: "a" } },
                        { type: "usage", inputTokens: 10, outputTokens: 2 },
                        { type: "finish", reason: "tool-calls" },
                    ],
                    [
                        { type: "tool-call", id: "t2", name: "zoomToNodes", arguments: {} },
                        { type: "usage", inputTokens: 20, outputTokens: 4 },
                        { type: "finish", reason: "tool-calls" },
                    ],
                ]),
            );
            const request = { system: "", messages: [], tools: [], toolMode: "auto" } as const;
            const seen: string[] = [];
            for (let turn = 0; turn < 2; turn++) {
                for await (const event of engine.turn(request, new AbortController().signal)) {
                    seen.push(event.type);
                }
            }

            assert.deepStrictEqual(
                engine.capturedToolCalls.map((call) => call.name),
                ["findNodes", "zoomToNodes"],
            );
            assert.deepStrictEqual(engine.capturedTokenUsage, { prompt: 30, completion: 6 });
            assert.deepStrictEqual(seen, ["tool-call", "usage", "finish", "tool-call", "usage", "finish"]);
            engine.clearCaptured();
            assert.deepStrictEqual(engine.capturedToolCalls, []);
        });
    });

    describe("Harness Disposal", () => {
        it("dispose does not throw", async () => {
            // Skip if no API key
            if (!isLlmRegressionEnabled()) {
                return;
            }

            const localHarness = await LlmRegressionTestHarness.create();
            localHarness.dispose();
            // Should not throw
        });

        it("double dispose does not throw", async () => {
            // Skip if no API key
            if (!isLlmRegressionEnabled()) {
                return;
            }

            const localHarness = await LlmRegressionTestHarness.create();
            localHarness.dispose();
            localHarness.dispose(); // Should not throw
        });

        it("throws on testPrompt after dispose", async () => {
            // Skip if no API key
            if (!isLlmRegressionEnabled()) {
                return;
            }

            const localHarness = await LlmRegressionTestHarness.create();
            localHarness.dispose();

            try {
                await localHarness.testPrompt("test");
                assert.fail("Expected error to be thrown");
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes("disposed"));
            }
        });
    });

    describe("Harness Options", () => {
        describe.skipIf(skipIfNoApiKey())("with real API", () => {
            it("accepts custom model option", async () => {
                const localHarness = await LlmRegressionTestHarness.create({
                    model: getLlmRegressionModel(),
                });

                assert.ok(localHarness);
                localHarness.dispose();
            });

            it("accepts custom temperature option", async () => {
                const localHarness = await LlmRegressionTestHarness.create({
                    temperature: 0,
                });

                assert.ok(localHarness);
                localHarness.dispose();
            });

            it("accepts custom graph fixture", async () => {
                const fixture: TestGraphFixture = {
                    nodes: [
                        { id: "a", data: { name: "Node A" } },
                        { id: "b", data: { name: "Node B" } },
                    ],
                    edges: [{ source: "a", target: "b", data: {} }],
                };

                const localHarness = await LlmRegressionTestHarness.create({
                    graphData: fixture,
                });

                assert.ok(localHarness);
                assert.ok(localHarness.getGraph());
                localHarness.dispose();
            });
        });
    });

    describe("a 400 on a message's first request (#4220)", () => {
        /**
         * Gemini's 400 as the engine reports it.
         * @yields The error.
         */
        async function* invalidArgument(): AsyncGenerator<TurnEvent> {
            yield await Promise.resolve({
                type: "error",
                code: "AI_PROVIDER_ERROR",
                params: { provider: "google", status: 400 },
                cause: new Error("Request contains an invalid argument."),
            });
        }
        const text = "There are 5 nodes.";
        async function* answer(): AsyncGenerator<TurnEvent> {
            yield await Promise.resolve({ type: "text", delta: text });
            yield { type: "finish", reason: "stop" };
        }

        beforeEach(() => {
            vi.stubEnv(getLlmRegressionKeyVariable(), "test-key");
            vi.spyOn(console, "warn").mockImplementation(() => undefined);
        });

        afterEach(() => {
            vi.unstubAllEnvs();
            vi.restoreAllMocks();
        });

        it("sends the unchanged first request once more and returns its answer", async () => {
            const turn = vi
                .spyOn(ProviderApiEngine.prototype, "turn")
                .mockImplementationOnce(invalidArgument)
                .mockImplementationOnce(answer);
            const harness = await LlmRegressionTestHarness.create();

            const result = await harness.testPrompt("How many nodes are there?");

            assert.strictEqual(turn.mock.calls.length, 2);
            assert.deepStrictEqual(turn.mock.calls[1][0], turn.mock.calls[0][0]);
            assert.strictEqual(result.llmText, text);
            harness.dispose();
        });

        it("fails when the resent request is refused too", async () => {
            const turn = vi.spyOn(ProviderApiEngine.prototype, "turn").mockImplementation(invalidArgument);
            const harness = await LlmRegressionTestHarness.create();

            let thrown: unknown;
            try {
                await harness.testPrompt("How many nodes are there?", undefined, { maxRetries: 0 });
            } catch (error) {
                thrown = error;
            }

            assert.ok(thrown instanceof Error);
            assert.match(thrown.message, /failed before any tool ran: Request contains an invalid argument/);
            assert.strictEqual(turn.mock.calls.length, 2);
            harness.dispose();
        });
    });

    describe("retrying a failed request", () => {
        /**
         * A rate limit as the engine reports it.
         * @yields The error.
         */
        async function* rateLimited(): AsyncGenerator<TurnEvent> {
            yield await Promise.resolve({
                type: "error",
                code: "AI_PROVIDER_ERROR",
                params: { provider: "google", status: 429 },
                cause: new Error("Resource has been exhausted."),
            });
        }
        async function* answer(): AsyncGenerator<TurnEvent> {
            yield await Promise.resolve({ type: "text", delta: "There are 5 nodes." });
            yield { type: "finish", reason: "stop" };
        }

        beforeEach(() => {
            vi.stubEnv(getLlmRegressionKeyVariable(), "test-key");
        });

        afterEach(() => {
            vi.unstubAllEnvs();
            vi.restoreAllMocks();
            vi.useRealTimers();
        });

        /**
         * Send one prompt and keep what it threw.
         * @param retryOptions - The retry options, if any.
         * @returns The result or the error.
         */
        async function send(retryOptions?: Parameters<LlmRegressionTestHarness["testPrompt"]>[2]) {
            const harness = await LlmRegressionTestHarness.create();
            try {
                return await harness.testPrompt("How many nodes are there?", undefined, retryOptions);
            } catch (error) {
                return error;
            } finally {
                harness.dispose();
            }
        }

        it("asks once and fails with maxRetries 0", async () => {
            const turn = vi.spyOn(ProviderApiEngine.prototype, "turn").mockImplementation(rateLimited);

            const thrown = await send({ maxRetries: 0 });

            assert.strictEqual(turn.mock.calls.length, 1);
            assert.ok(thrown instanceof Error);
            assert.match(thrown.message, /failed before any tool ran: Resource has been exhausted/);
        });

        it("asks maxRetries more times, then fails", async () => {
            const turn = vi.spyOn(ProviderApiEngine.prototype, "turn").mockImplementation(rateLimited);

            const thrown = await send({ maxRetries: 2 });

            assert.strictEqual(turn.mock.calls.length, 3);
            assert.ok(thrown instanceof Error);
            assert.match(thrown.message, /failed before any tool ran: Resource has been exhausted/);
        });

        it("returns the answer of the first retry that succeeds", async () => {
            const turn = vi
                .spyOn(ProviderApiEngine.prototype, "turn")
                .mockImplementationOnce(rateLimited)
                .mockImplementationOnce(rateLimited)
                .mockImplementationOnce(answer);

            const result = await send({ maxRetries: 2 });

            assert.strictEqual(turn.mock.calls.length, 3);
            assert.ok(!(result instanceof Error));
            assert.strictEqual((result as { llmText: string | null }).llmText, "There are 5 nodes.");
        });

        it("does not ask again when retryOn rejects the failure", async () => {
            const turn = vi.spyOn(ProviderApiEngine.prototype, "turn").mockImplementation(rateLimited);
            const seen: (number | undefined)[] = [];

            const thrown = await send({
                maxRetries: 2,
                retryOn: (failure) => {
                    seen.push(failure.params?.status as number | undefined);
                    return false;
                },
            });

            assert.strictEqual(turn.mock.calls.length, 1);
            assert.deepStrictEqual(seen, [429]);
            assert.ok(thrown instanceof Error);
        });

        it("reports the message's latency and the engine's token usage", async () => {
            vi.useFakeTimers({ toFake: ["Date"] });
            vi.spyOn(ProviderApiEngine.prototype, "turn").mockImplementation(async function* () {
                vi.setSystemTime(Date.now() + 250);
                yield await Promise.resolve<TurnEvent>({ type: "text", delta: "There are 5 nodes." });
                yield { type: "usage", inputTokens: 12, outputTokens: 3 };
                yield { type: "finish", reason: "stop" };
            });

            const result = await send();

            assert.ok(!(result instanceof Error));
            const { latencyMs, tokenUsage } = result as { latencyMs: number; tokenUsage?: unknown };
            assert.strictEqual(latencyMs, 250);
            assert.deepStrictEqual(tokenUsage, { prompt: 12, completion: 3 });
        });
    });
});
