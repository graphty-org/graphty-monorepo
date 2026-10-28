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

import { createGraphSession } from "../../../session";
import { buildToolset } from "../../../src/ai/tools/toolset";
import { getLlmRegressionCaseTimeoutMs, skipIfNoApiKey } from "../../helpers/llm-regression-env";
import {
    actionOf,
    type LlmRegressionResult,
    LlmRegressionTestHarness,
    reachedCalls,
} from "../../helpers/llm-regression-harness";
import { serverNetworkFixture } from "./fixtures/test-graph-fixtures";

/** Every action of the generated tools that only reads: a model may call these to look before it acts. */
const READ_ONLY_ACTIONS = new Set(
    buildToolset(createGraphSession()).tools.flatMap((tool) => [
        ...tool.definition.actions
            .filter((action) => action.effect === "read")
            .map((action) => `${tool.name}.${action.name}`),
        // A call naming no action, to a tool that only reads, reads or is refused: it changes nothing.
        ...(tool.definition.actions.every((action) => action.effect === "read") ? [`${tool.name}.run`] : []),
    ]),
);

/**
 * The calls of a prompt that change the graph or the view, as `tool.action`.
 * @param result - The prompt's result.
 * @returns The actions.
 */
function actionsOf(result: LlmRegressionResult): string[] {
    return reachedCalls(result)
        .map((call) => `${call.name}.${actionOf(call) || "run"}`)
        .filter((action) => !READ_ONLY_ACTIONS.has(action));
}

/**
 * Whether an action is one of the allowed ones: `tool.action`, or `tool.*` for every action of a tool.
 * @param action - The action.
 * @param allowed - The allowed actions.
 * @returns True when it is.
 */
function allowedAction(action: string, allowed: readonly string[]): boolean {
    return allowed.some((each) => each === action || (each.endsWith(".*") && action.startsWith(each.slice(0, -1))));
}

/**
 * Assert the model answered in text and changed nothing.
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
            const validTools = ["view.*", "layout.set"];
            const actions = actionsOf(result);
            for (const action of actions) {
                assert.ok(allowedAction(action, validTools), `Expected only view changes but got '${action}'`);
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
            const styleTools = ["style.*", "layout.set", "view.camera", "view.fit", "view.zoom_to", "view.dimension"];
            const actions = actionsOf(result);
            for (const action of actions) {
                assert.ok(
                    allowedAction(action, styleTools),
                    `Expected only style or layout changes but got '${action}'`,
                );
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
                assert.strictEqual(action, "run_algorithm.run", `Expected only analysis but got '${action}'`);
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

            // Two parts, finding and styling. The model may look first (query), but the styling has
            // to happen: a style layer on the server nodes with a color.
            const styled = reachedCalls(result).find(
                (call) => call.name === "style" && call.arguments.action === "add",
            );
            assert.ok(styled, `Expected a style add among ${actionsOf(result).join(", ")}`);
            const target = JSON.stringify([styled.arguments.where, styled.arguments.ids]);
            assert.ok(
                target.toLowerCase().includes("server") || target.includes('"1"'),
                `Expected the target to name the servers but got '${target}'`,
            );
            // What the session paints, not how the model spelled the channel: the tool reads
            // `nodeColor` and `node_color` as node.color too.
            const session = harness.getGraph().getSession();
            for (const id of ["1", "2"]) {
                const color = session.styles.explain({ node: id }).merged["node.color" as never] as
                    { r: number; g: number; b: number } | undefined;
                assert.ok(
                    color !== undefined && color.b > color.r && color.b > color.g,
                    `Expected server ${id} to be blue but it is ${JSON.stringify(color)}`,
                );
            }
        });

        it("handles 'highlight nodes with high weight connections'", async () => {
            const result = await harness.testPrompt("highlight nodes with high weight connections");

            // Highlighting is styling (clearing earlier styles first included), after any looking the
            // model needs to choose a threshold.
            const actions = actionsOf(result);
            const calls = result.toolCalls.map((call) => `${call.name} ${JSON.stringify(call.arguments)}`).join("; ");
            assert.ok(
                actions.length > 0,
                `Expected the model to highlight something; it called ${calls || "nothing"} and said ${JSON.stringify(result.llmText)}`,
            );
            const validTools = ["style.*", "run_algorithm.run", "select.set", "select.add"];
            for (const action of actions) {
                assert.ok(allowedAction(action, validTools), `Expected a highlighting tool but got '${action}'`);
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
            assert.ok(result.latencyMs < getLlmRegressionCaseTimeoutMs(), "Expected latency under the per-case limit");
        });
    });
});
