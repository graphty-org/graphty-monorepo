/**
 * Query LLM Regression Tests
 * @module test/ai/llm-regression/query-commands
 *
 * Tests that a real model reads the graph's data with the `query` tool -- counts, records,
 * samples, an attribute's values -- in response to natural language prompts. A question the facts
 * the model is handed already answer (how many nodes, which layout) may be answered without a
 * call: those cases grade the answer instead.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { getLlmRegressionCaseTimeoutMs, skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { assertAction, assertAnswered, LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { serverNetworkFixture } from "./fixtures/test-graph-fixtures";

describe.skipIf(skipIfNoApiKey())("Query LLM Regression", () => {
    let harness: LlmRegressionTestHarness;

    beforeEach(async () => {
        harness = await LlmRegressionTestHarness.create({
            graphData: serverNetworkFixture,
        });
    });

    afterEach(() => {
        harness.dispose();
    });

    describe("counts and overview", () => {
        it("answers 'How many nodes are there?'", async () => {
            const result = await harness.testPrompt("How many nodes are there?");
            assertAnswered(result, ["query"], /\b4\b|four/i);
        });

        it("answers 'How many edges exist?'", async () => {
            const result = await harness.testPrompt("How many edges exist?");
            assertAnswered(result, ["query"], /\b3\b|three/i);
        });

        it("answers 'What layout is being used?'", async () => {
            const result = await harness.testPrompt("What layout is being used?");
            assertAnswered(result, ["query"], /force/i);
        });

        it("answers 'Give me a summary of the graph'", async () => {
            const result = await harness.testPrompt("Give me a summary of the graph");
            assertAnswered(result, ["query"], /\b4\b|four/i);
        });
    });

    describe("records", () => {
        it("calls query nodes for 'Find all server nodes'", async () => {
            const result = await harness.testPrompt("Find all server nodes");
            const call = assertAction(result, ["query", "select"], ["nodes", "find", "set", "count"]);
            const target = JSON.stringify(call.arguments);
            assert.ok(
                target.includes("server") || (target.includes('"1"') && target.includes('"2"')),
                `Expected the target to name 'server', or the servers 1 and 2, but got ${target}`,
            );
        });

        it("calls query nodes for 'Show nodes with type database'", async () => {
            const result = await harness.testPrompt("Show nodes with type database");
            // "Show" may mean read them out or show only them on screen; both name the database type.
            const call = assertAction(result, ["query", "select", "filter"], ["nodes", "find", "set", "show_only"]);
            assert.include(JSON.stringify(call.arguments), "database");
        });

        it("calls query nodes for 'Show me some example nodes'", async () => {
            const result = await harness.testPrompt("Show me some example nodes");
            assertAction(result, "query", ["nodes", "overview", "attributes"]);
        });

        it("calls query edges for 'Show 5 sample edges'", async () => {
            const result = await harness.testPrompt("Show 5 sample edges");
            const call = assertAction(result, "query", "edges");
            const limit = call.arguments.limit as number | undefined;
            if (limit !== undefined) {
                assert.ok(limit >= 3 && limit <= 7, `Expected a limit around 5 but got ${String(limit)}`);
            }
        });
    });

    describe("an attribute's values", () => {
        it("calls query histogram or attributes for 'What values does the type property have?'", async () => {
            const result = await harness.testPrompt("What values does the type property have?");
            const call = assertAction(result, "query", ["histogram", "attributes", "nodes"]);
            if (call.arguments.action === "histogram") {
                assert.include(String(call.arguments.column), "type");
            }
        });

        it("calls query histogram or attributes for 'Analyze the weight property on edges'", async () => {
            const result = await harness.testPrompt("Analyze the weight property on edges");
            const call = assertAction(result, "query", ["histogram", "attributes", "edges", "statistics"]);
            if (call.arguments.action === "histogram") {
                assert.include(String(call.arguments.column), "weight");
            }
        });
    });

    describe("command result validation", () => {
        it("answers a count with the number", async () => {
            const result = await harness.testPrompt("How many nodes are there?");
            assert.ok(result.commandResult, "Expected command result");
            assert.strictEqual(result.commandResult.success, true);
            assert.match(result.llmText ?? "", /\b4\b|four/i);
        });

        it("finds the server nodes, 1 and 2", async () => {
            const result = await harness.testPrompt("Find all server nodes and tell me their ids");
            assertAction(result, ["query", "select"]);
            assert.match(result.llmText ?? "", /\b1\b/);
            assert.match(result.llmText ?? "", /\b2\b/);
        });

        it("tracks latency for each prompt", async () => {
            const result = await harness.testPrompt("How many edges exist?");

            assert.ok(result.latencyMs > 0, "Expected positive latency");
            assert.ok(result.latencyMs < getLlmRegressionCaseTimeoutMs(), "Expected latency under the per-case limit");
        });

        it("captures token usage when available", async () => {
            const result = await harness.testPrompt("Give me a summary of the graph");

            if (result.tokenUsage) {
                assert.ok(result.tokenUsage.prompt > 0, "Expected positive prompt tokens");
                assert.ok(result.tokenUsage.completion >= 0, "Expected non-negative completion tokens");
            }
        });
    });
});
