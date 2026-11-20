/**
 * Algorithm Commands LLM Regression Tests
 * @module test/ai/llm-regression/algorithm-commands
 *
 * Tests that a real model finds algorithms with the `catalog` tool and runs them with
 * `run_algorithm`, in response to natural language prompts.
 *
 * These tests run against real LLM APIs and verify correct tool selection
 * and parameter extraction for graph algorithm operations.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { assertAction, assertAnswered, LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { serverNetworkFixture } from "./fixtures/test-graph-fixtures";
import { isAlgorithm } from "./matchers";

describe.skipIf(skipIfNoApiKey())("Algorithm LLM Regression", () => {
    let harness: LlmRegressionTestHarness;

    beforeEach(async () => {
        harness = await LlmRegressionTestHarness.create({
            graphData: serverNetworkFixture,
        });
    });

    afterEach(() => {
        harness.dispose();
    });

    describe("finding algorithms", () => {
        it("answers 'What algorithms are available?'", async () => {
            const result = await harness.testPrompt("What algorithms are available?");
            // The run_algorithm tool names every algorithm, so a model may answer without searching.
            assertAnswered(result, ["catalog"], /pagerank|louvain|degree|betweenness/i);
        });

        it("answers 'List graphty algorithms'", async () => {
            const result = await harness.testPrompt("List graphty algorithms");
            assertAnswered(result, ["catalog"], /pagerank|louvain|degree|betweenness/i);
        });
    });

    describe("run_algorithm", () => {
        it("runs degree for 'Calculate the degree of each node'", async () => {
            const result = await harness.testPrompt("Calculate the degree of each node");
            const call = assertAction(result, "run_algorithm");
            assert.ok(
                isAlgorithm(call.arguments.name, "degree"),
                `Expected algorithm 'degree' but got '${String(call.arguments.name)}'`,
            );
        });

        it("runs pagerank for 'Run pagerank'", async () => {
            const result = await harness.testPrompt("Run pagerank");
            const call = assertAction(result, "run_algorithm");
            assert.ok(
                isAlgorithm(call.arguments.name, "pagerank"),
                `Expected algorithm 'pagerank' but got '${String(call.arguments.name)}'`,
            );
        });

        it("runs components for 'Run the connected components algorithm on this graph'", async () => {
            const result = await harness.testPrompt("Run the connected components algorithm on this graph");
            const call = assertAction(result, "run_algorithm");
            assert.ok(
                isAlgorithm(call.arguments.name, "components"),
                `Expected algorithm 'components' but got '${String(call.arguments.name)}'`,
            );
        });
    });

    describe("command result validation", () => {
        it("lists algorithms in its answer", async () => {
            const result = await harness.testPrompt("Show me all available graph analysis algorithms");
            assert.ok(result.commandResult, "Expected command result");
            assert.match(result.llmText ?? "", /pagerank|louvain|degree|betweenness/i);
        });

        it("runs degree centrality and answers", async () => {
            const result = await harness.testPrompt("Analyze the graph using degree centrality");
            assertAction(result, "run_algorithm");
            assert.ok(result.commandResult, "Expected command result");
            assert.strictEqual(result.commandResult.success, true);
            assert.ok(result.llmText, "Expected an answer");
        });
    });
});
