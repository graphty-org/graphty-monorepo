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

import { getLlmRegressionCaseTimeoutMs, skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { assertAction, assertAnswered, LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { serverNetworkFixture } from "./fixtures/test-graph-fixtures";

/**
 * Valid algorithm types that the LLM might suggest.
 * Maps common algorithm names to their recognized variants.
 */
const ALGORITHM_SYNONYMS: Record<string, string[]> = {
    degree: ["degree", "degree-centrality", "degreecentrality"],
    pagerank: ["pagerank", "page-rank", "page_rank"],
    components: ["components", "connected-components", "connectedcomponents", "connected"],
    betweenness: ["betweenness", "betweenness-centrality", "betweennesscentrality"],
    closeness: ["closeness", "closeness-centrality", "closenesscentrality"],
};

/**
 * Check if an algorithm type matches any of the expected synonyms.
 *
 * @param actual - The actual algorithm type from the LLM
 * @param expected - The base expected algorithm type
 * @returns True if the algorithm matches expected or its synonyms
 */
function isValidAlgorithmType(actual: unknown, expected: string): boolean {
    if (typeof actual !== "string") {
        return false;
    }

    const normalizedActual = actual.toLowerCase().trim().replace(/[_-]/g, "");
    const normalizedExpected = expected.toLowerCase().trim().replace(/[_-]/g, "");

    // Direct match
    if (normalizedActual === normalizedExpected) {
        return true;
    }

    // Check synonyms for expected algorithm
    const synonyms = ALGORITHM_SYNONYMS[normalizedExpected] as string[] | undefined;
    if (synonyms?.some((s) => normalizedActual.includes(s.replace(/[_-]/g, "")))) {
        return true;
    }

    // Also check if actual matches any synonym (case-insensitive)
    for (const [, syns] of Object.entries(ALGORITHM_SYNONYMS)) {
        if (syns.some((s) => s.replace(/[_-]/g, "") === normalizedActual)) {
            // Found a match - check if it belongs to expected
            const expectedSynonyms = ALGORITHM_SYNONYMS[normalizedExpected] as string[] | undefined;
            if (expectedSynonyms?.some((es) => es.replace(/[_-]/g, "") === normalizedActual)) {
                return true;
            }
        }
    }

    return false;
}

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
                isValidAlgorithmType(call.arguments.name, "degree"),
                `Expected algorithm 'degree' but got '${String(call.arguments.name)}'`,
            );
        });

        it("runs pagerank for 'Run pagerank'", async () => {
            const result = await harness.testPrompt("Run pagerank");
            const call = assertAction(result, "run_algorithm");
            assert.ok(
                isValidAlgorithmType(call.arguments.name, "pagerank"),
                `Expected algorithm 'pagerank' but got '${String(call.arguments.name)}'`,
            );
        });

        it("runs components for 'Run the connected components algorithm on this graph'", async () => {
            const result = await harness.testPrompt("Run the connected components algorithm on this graph");
            const call = assertAction(result, "run_algorithm");
            assert.ok(
                isValidAlgorithmType(call.arguments.name, "components"),
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

        it("tracks latency for algorithm commands", async () => {
            const result = await harness.testPrompt("What graph algorithms can I use?");

            assert.ok(result.latencyMs > 0, "Expected positive latency");
            assert.ok(result.latencyMs < getLlmRegressionCaseTimeoutMs(), "Expected latency under the per-case limit");
        });

        it("captures token usage for algorithm commands", async () => {
            const result = await harness.testPrompt("Run the degree algorithm on the graph");

            // Token usage may not always be available depending on provider configuration
            if (result.tokenUsage) {
                assert.ok(result.tokenUsage.prompt > 0, "Expected positive prompt tokens");
                assert.ok(result.tokenUsage.completion >= 0, "Expected non-negative completion tokens");
            }
        });
    });
});
