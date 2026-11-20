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

import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { assertAction, LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { serverNetworkFixture } from "./fixtures/test-graph-fixtures";
import { isLayout } from "./matchers";

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
                isLayout(call.arguments.engine ?? call.arguments.name, "circular"),
                `Expected layout type 'circular' but got '${call.arguments.engine ?? call.arguments.name}'`,
            );
        });

        it("calls layout set for 'Switch to force-directed layout'", async () => {
            const result = await harness.testPrompt("Switch to force-directed layout");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "layout", "set");

            // The force layout, by its id or any of its engines (ngraph, d3, forceatlas2, ...)
            assert.ok(
                isLayout(call.arguments.engine ?? call.arguments.name, "force"),
                `Expected force-directed layout type but got '${call.arguments.engine ?? call.arguments.name}'`,
            );
        });

        it("calls layout set for 'Arrange nodes randomly'", async () => {
            const result = await harness.testPrompt("Arrange nodes randomly");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "layout", "set");

            // Verify layout type is random
            assert.ok(
                isLayout(call.arguments.engine ?? call.arguments.name, "random"),
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
    });
});
