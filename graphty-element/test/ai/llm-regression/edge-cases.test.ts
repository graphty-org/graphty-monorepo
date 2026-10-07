/**
 * Edge Cases LLM Regression Tests
 * @module test/ai/llm-regression/edge-cases
 *
 * Tests that verify LLM behavior for edge cases including:
 * - Ambiguous prompts that could map to multiple tools
 * - Complex prompts that may require multiple actions
 * - No-op prompts that should return text only
 * - Invalid prompts about non-existent features
 *
 * These tests validate graceful handling of challenging inputs
 * and ensure reasonable tool selection for unclear requests.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { type LlmRegressionResult, LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { serverNetworkFixture } from "./fixtures/test-graph-fixtures";

/** The built-in tools that only read: a model may call these to look before it acts. */
const READ_ONLY_TOOLS = new Set([
    "queryGraph",
    "findNodes",
    "getSchema",
    "sampleData",
    "describeProperty",
    "listAlgorithms",
]);

/**
 * The tools a prompt made the model call that change the graph, its styles or the view.
 * @param result - The prompt's result.
 * @returns Their names, in call order.
 */
function actionsOf(result: LlmRegressionResult): string[] {
    return result.toolCalls.map((call) => call.name).filter((name) => !READ_ONLY_TOOLS.has(name));
}

/**
 * Assert that a prompt changed nothing and that the model said something to the reader: what a
 * prompt with nothing to act on, or asking for something the element cannot do, should get.
 * @param result - The prompt's result.
 */
function assertAnsweredWithoutActing(result: LlmRegressionResult): void {
    assert.deepStrictEqual(actionsOf(result), [], "Expected no tool that changes the graph or the view");
    assert.ok(result.llmText && result.llmText.trim().length > 0, "Expected the model to answer in text");
}

describe.skipIf(skipIfNoApiKey())("Edge Cases LLM Regression", () => {
    let harness: LlmRegressionTestHarness;

    beforeEach(async () => {
        harness = await LlmRegressionTestHarness.create({
            graphData: serverNetworkFixture,
        });
    });

    afterEach(() => {
        harness.dispose();
    });

    describe("ambiguous prompts", () => {
        it("handles 'change the view' with reasonable tool choice", async () => {
            const result = await harness.testPrompt("change the view");

            // Ambiguous: camera, layout or dimension are all reasonable, and so is asking which.
            // What is not reasonable is changing anything else.
            const validTools = ["setCameraPosition", "setLayout", "setDimension", "zoomToNodes"];
            const actions = actionsOf(result);
            for (const action of actions) {
                assert.include(validTools, action, `Expected only view changes but got '${action}'`);
            }

            assert.ok(
                actions.length > 0 || (result.llmText !== null && result.llmText.length > 0),
                "Expected either a view change or a text response asking for clarification",
            );
        });

        it("handles 'make it pretty' with style-related tool", async () => {
            const result = await harness.testPrompt("make it pretty");

            // Subjective: restyling, re-laying-out and reframing the view are all reasonable, and so
            // is asking what "pretty" means. Running algorithms or entering VR is not.
            const styleTools = [
                "findAndStyleNodes",
                "findAndStyleEdges",
                "clearStyles",
                "setLayout",
                "setCameraPosition",
                "zoomToNodes",
            ];
            const actions = actionsOf(result);
            for (const action of actions) {
                assert.include(styleTools, action, `Expected only style or layout changes but got '${action}'`);
            }

            assert.ok(
                actions.length > 0 || (result.llmText !== null && result.llmText.length > 0),
                "Expected either a style change or a text response",
            );
        });

        it("handles 'analyze the graph' with query or algorithm tool", async () => {
            const result = await harness.testPrompt("analyze the graph");

            // Analysis reads the graph or runs an algorithm; it restyles and moves nothing.
            for (const action of actionsOf(result)) {
                assert.strictEqual(action, "runAlgorithm", `Expected only analysis but got '${action}'`);
            }

            assert.ok(
                result.toolWasCalled || (result.llmText !== null && result.llmText.length > 0),
                "Expected either a tool call or a text response",
            );
        });
    });

    describe("complex prompts", () => {
        it("handles 'show me server nodes and make them blue'", async () => {
            const result = await harness.testPrompt("show me server nodes and make them blue");

            // Two parts, finding and styling. The model may look first (findNodes), but the
            // styling has to happen: a style layer on the server nodes with a color.
            const styled = result.toolCalls.find((call) => call.name === "findAndStyleNodes");
            assert.ok(styled, `Expected findAndStyleNodes among ${result.toolCalls.map((c) => c.name).join(", ")}`);
            const selector = typeof styled.arguments.selector === "string" ? styled.arguments.selector : "";
            const style = styled.arguments.style as Record<string, unknown> | undefined;
            assert.ok(
                selector.toLowerCase().includes("server"),
                `Expected selector to reference 'server' but got '${selector}'`,
            );
            assert.ok(style?.color !== undefined, "Expected style to include color property");
        });

        it("handles 'highlight nodes with high weight connections'", async () => {
            const result = await harness.testPrompt("highlight nodes with high weight connections");

            // Highlighting is styling (clearing earlier styles first included), after any looking the
            // model needs to choose a threshold.
            const actions = actionsOf(result);
            assert.ok(actions.length > 0, "Expected the model to highlight something");
            const validTools = ["findAndStyleNodes", "findAndStyleEdges", "clearStyles", "runAlgorithm"];
            for (const action of actions) {
                assert.include(validTools, action, `Expected a highlighting tool but got '${action}'`);
            }
        });
    });

    describe("no-op prompts", () => {
        it("returns text response for 'hello'", async () => {
            const result = await harness.testPrompt("hello");

            // A greeting changes nothing and gets an answer.
            assertAnsweredWithoutActing(result);
        });

        it("returns text response for 'what can you do?'", async () => {
            const result = await harness.testPrompt("what can you do?");

            // Explaining what it can do changes nothing.
            assertAnsweredWithoutActing(result);
        });

        it("returns text response for 'thanks!'", async () => {
            const result = await harness.testPrompt("thanks!");

            // An acknowledgment changes nothing.
            assertAnsweredWithoutActing(result);
        });
    });

    describe("invalid prompts", () => {
        it("handles gracefully when asked about non-existent features", async () => {
            const result = await harness.testPrompt("Enable the quantum entanglement mode for nodes");

            // The element has no such mode. The model must say so rather than change something
            // else in its place (setImmersiveMode is the tempting wrong answer).
            assertAnsweredWithoutActing(result);
        });

        it("handles empty-ish prompts gracefully", async () => {
            const result = await harness.testPrompt("...");

            // Nothing was asked, so nothing may change; the model should ask what is wanted.
            assertAnsweredWithoutActing(result);
        });

        it("handles prompts with only special characters", async () => {
            const result = await harness.testPrompt("??? !!! ###");

            // Noise asks for nothing, so nothing may change; the model should ask what is wanted.
            assertAnsweredWithoutActing(result);
        });
    });

    describe("command result validation", () => {
        it("provides informative response for ambiguous prompts", async () => {
            const result = await harness.testPrompt("do something interesting");

            // Should either take action or provide guidance
            assert.ok(
                actionsOf(result).length > 0 || (result.llmText !== null && result.llmText.length > 5),
                "Expected an action or an informative response",
            );
        });

        it("measures latency for complex prompts", async () => {
            const result = await harness.testPrompt(
                "find database nodes, make them green, and also tell me how many edges there are",
            );

            assert.ok(result.latencyMs > 0, "Expected positive latency");
            assert.ok(result.latencyMs < 60000, "Expected latency under 60 seconds");
        });
    });
});
