/**
 * Layout Commands LLM Regression Tests
 * @module test/ai/llm-regression/layout-commands
 *
 * Tests that a real model changes the layout with the `layout` tool and switches 2D and 3D
 * with the `view` tool, in response to natural language prompts.
 *
 * These tests run against real LLM APIs and verify correct tool selection
 * and parameter extraction for graph layout changes.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { getLlmRegressionCaseTimeoutMs, skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { assertAction, LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { serverNetworkFixture } from "./fixtures/test-graph-fixtures";

/**
 * Valid layout types that can be set.
 * Maps prompts to expected layout types with synonyms.
 */
const LAYOUT_SYNONYMS: Record<string, string[]> = {
    circular: ["circular", "circle"],
    ngraph: ["ngraph", "force-directed", "force", "physics"],
    d3: ["d3", "d3-force", "force-directed"],
    random: ["random"],
    spiral: ["spiral"],
    shell: ["shell"],
    spring: ["spring"],
    forceatlas2: ["forceatlas2", "forceatlas", "atlas"],
};

/**
 * Check if a layout type matches any of the expected synonyms.
 * Force-directed layouts could be 'ngraph', 'd3', 'spring', or 'forceatlas2'.
 *
 * @param actual - The actual layout type from the LLM
 * @param expected - The base expected layout type
 * @returns True if the layout matches expected or its synonyms
 */
function isValidLayoutType(actual: unknown, expected: string): boolean {
    if (typeof actual !== "string") {
        return false;
    }

    const normalizedActual = actual.toLowerCase().trim();
    const normalizedExpected = expected.toLowerCase().trim();

    // Direct match
    if (normalizedActual === normalizedExpected) {
        return true;
    }

    // Check synonyms for expected layout
    const synonyms = LAYOUT_SYNONYMS[normalizedExpected] as string[] | undefined;
    if (synonyms?.some((s) => normalizedActual.includes(s))) {
        return true;
    }

    // For force-directed, accept multiple layout types
    if (normalizedExpected === "force-directed" || normalizedExpected === "ngraph") {
        const forceDirectedLayouts = ["ngraph", "d3", "spring", "forceatlas2", "force"];
        return forceDirectedLayouts.some((l) => normalizedActual.includes(l));
    }

    return false;
}

describe.skipIf(skipIfNoApiKey())("Layout Commands LLM Regression", () => {
    let harness: LlmRegressionTestHarness;

    beforeEach(async () => {
        harness = await LlmRegressionTestHarness.create({
            graphData: serverNetworkFixture,
        });
    });

    afterEach(() => {
        harness.dispose();
    });

    describe("layout set", () => {
        it("calls layout set for 'Use circular layout'", async () => {
            const result = await harness.testPrompt("Use circular layout");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "layout", "set");

            // Verify layout type is circular
            assert.ok(
                isValidLayoutType(call.arguments.engine ?? call.arguments.name, "circular"),
                `Expected layout type 'circular' but got '${call.arguments.engine ?? call.arguments.name}'`,
            );
        });

        it("calls layout set for 'Switch to force-directed layout'", async () => {
            const result = await harness.testPrompt("Switch to force-directed layout");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "layout", "set");

            // Force-directed could be ngraph, d3, spring, or forceatlas2
            assert.ok(
                isValidLayoutType(call.arguments.engine ?? call.arguments.name, "force-directed"),
                `Expected force-directed layout type but got '${call.arguments.engine ?? call.arguments.name}'`,
            );
        });

        it("calls layout set for 'Arrange nodes randomly'", async () => {
            const result = await harness.testPrompt("Arrange nodes randomly");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "layout", "set");

            // Verify layout type is random
            assert.ok(
                isValidLayoutType(call.arguments.engine ?? call.arguments.name, "random"),
                `Expected layout type 'random' but got '${call.arguments.engine ?? call.arguments.name}'`,
            );
        });
    });

    describe("view dimension", () => {
        it("calls view dimension for 'Switch to 2D view'", async () => {
            const result = await harness.testPrompt("Switch to 2D view");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "view", "dimension");

            // Verify dimension is 2D (accept various formats)
            const { dimension } = call.arguments;
            assert.ok(
                dimension === "2d" || dimension === "2D" || dimension === 2,
                `Expected dimension '2d' but got '${String(dimension)}'`,
            );
        });

        it("calls view dimension for 'Show in 3D'", async () => {
            const result = await harness.testPrompt("Show in 3D");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "view", "dimension");

            // Verify dimension is 3D (accept various formats)
            const { dimension } = call.arguments;
            assert.ok(
                dimension === "3d" || dimension === "3D" || dimension === 3,
                `Expected dimension '3d' but got '${String(dimension)}'`,
            );
        });
    });

    describe("command result validation", () => {
        it("returns command result for layout set", async () => {
            const result = await harness.testPrompt("Change layout to circular arrangement");

            assert.ok(result.toolWasCalled, "Expected the layout tool to be called");
            assertAction(result, "layout", "set");

            // Command result should exist
            assert.ok(result.commandResult, "Expected command result");
            assert.ok(result.commandResult.success, "Expected the change to succeed");
        });

        it("returns command result for view dimension", async () => {
            const result = await harness.testPrompt("Make the graph 2D");

            assert.ok(result.toolWasCalled, "Expected the view tool to be called");
            assertAction(result, "view", "dimension");

            // Command result should exist
            assert.ok(result.commandResult, "Expected command result");
            assert.ok(result.commandResult.success, "Expected the change to succeed");
        });

        it("tracks latency for layout commands", async () => {
            const result = await harness.testPrompt("Use spiral layout");

            assert.ok(result.latencyMs > 0, "Expected positive latency");
            assert.ok(result.latencyMs < getLlmRegressionCaseTimeoutMs(), "Expected latency under the per-case limit");
        });

        it("captures token usage for layout commands", async () => {
            const result = await harness.testPrompt("Switch to 3D mode");

            // Token usage may not always be available depending on provider configuration
            if (result.tokenUsage) {
                assert.ok(result.tokenUsage.prompt > 0, "Expected positive prompt tokens");
                assert.ok(result.tokenUsage.completion >= 0, "Expected non-negative completion tokens");
            }
        });
    });
});
