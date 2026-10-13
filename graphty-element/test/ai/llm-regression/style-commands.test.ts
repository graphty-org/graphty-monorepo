/**
 * Style Commands LLM Regression Tests
 * @module test/ai/llm-regression/style-commands
 *
 * Tests that a real model styles nodes and edges with the `style` tool -- literal values on a
 * target, or an encoding -- and clears what it added, in response to natural language prompts.
 *
 * These tests run against real LLM APIs and verify correct tool selection
 * and parameter extraction for styling graph elements.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { getLlmRegressionCaseTimeoutMs, skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { assertAction, LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { serverNetworkFixture } from "./fixtures/test-graph-fixtures";

/**
 * Check if a value appears to be a color value.
 * Accepts hex colors (#RGB, #RRGGBB), CSS color names, rgb(), rgba(), etc.
 *
 * @param value - The value to check
 * @returns True if the value appears to be a color
 */
function isColorValue(value: unknown): boolean {
    if (typeof value !== "string") {
        return false;
    }

    const trimmed = value.trim().toLowerCase();

    // Hex colors: #RGB, #RRGGBB, #RRGGBBAA
    if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) {
        return true;
    }

    // Common CSS color names
    const namedColors = new Set([
        "red",
        "green",
        "blue",
        "yellow",
        "orange",
        "purple",
        "pink",
        "black",
        "white",
        "gray",
        "grey",
        "cyan",
        "magenta",
        "brown",
        "lime",
        "navy",
        "teal",
        "aqua",
        "maroon",
        "olive",
        "silver",
        "fuchsia",
        "crimson",
        "coral",
        "gold",
        "khaki",
        "lavender",
        "salmon",
        "tomato",
        "turquoise",
        "violet",
        "indigo",
    ]);
    if (namedColors.has(trimmed)) {
        return true;
    }

    // rgb() and rgba() formats
    if (/^rgba?\s*\(/.test(trimmed)) {
        return true;
    }

    // hsl() and hsla() formats
    if (/^hsla?\s*\(/.test(trimmed)) {
        return true;
    }

    return false;
}

/**
 * Check if a style object contains a color property at any level.
 * Searches for 'color' keys in the style object recursively.
 *
 * @param style - The style object to search
 * @returns True if a color property exists with a valid color value
 */
function hasColorStyle(style: Record<string, unknown> | null): boolean {
    if (!style) {
        return false;
    }

    for (const [key, value] of Object.entries(style)) {
        if (
            (key === "channel" && String(value).endsWith(".color")) ||
            (/color$/i.test(key.replace(/[._-]/g, "")) && isColorValue(value)) ||
            // `{ node: "blue" }`: the style tool reads a color on the element as its color.
            ((key === "node" || key === "edge") && isColorValue(value))
        ) {
            return true;
        }

        if (typeof value === "object" && value !== null) {
            if (hasColorStyle(value as Record<string, unknown>)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Check if a style object contains a size property.
 *
 * @param style - The style object to search
 * @returns True if a size property exists
 */
function hasSizeStyle(style: Record<string, unknown> | null): boolean {
    if (!style) {
        return false;
    }

    for (const [key, value] of Object.entries(style)) {
        if (
            (key === "channel" && String(value).endsWith(".size")) ||
            (/size$/i.test(key.replace(/[._-]/g, "")) && typeof value === "number")
        ) {
            return true;
        }

        if (typeof value === "object" && value !== null) {
            if (hasSizeStyle(value as Record<string, unknown>)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Check if a style object contains a width property.
 *
 * @param style - The style object to search
 * @returns True if a width property exists
 */
function hasWidthStyle(style: Record<string, unknown> | null): boolean {
    if (!style) {
        return false;
    }

    for (const [key, value] of Object.entries(style)) {
        if (
            (key === "channel" && String(value).endsWith(".width")) ||
            (/width$/i.test(key.replace(/[._-]/g, "")) && typeof value === "number")
        ) {
            return true;
        }

        if (typeof value === "object" && value !== null) {
            if (hasWidthStyle(value as Record<string, unknown>)) {
                return true;
            }
        }
    }

    return false;
}

describe.skipIf(skipIfNoApiKey())("Style Commands LLM Regression", () => {
    let harness: LlmRegressionTestHarness;

    beforeEach(async () => {
        harness = await LlmRegressionTestHarness.create({
            graphData: serverNetworkFixture,
        });
    });

    afterEach(() => {
        harness.dispose();
    });

    describe("style nodes", () => {
        it("calls style for 'Make all nodes red'", async () => {
            const result = await harness.testPrompt("Make all nodes red");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "style", ["add", "encode"]);

            // Flexible assertion - color could be "red", "#ff0000", "#FF0000", etc.
            const style = (call.arguments.values ?? call.arguments.encode) as Record<string, unknown> | undefined;
            assert.ok(style, "Expected values or an encoding");
            assert.ok(hasColorStyle(style), "Expected color to be specified in style");
        });

        it("calls style for 'Highlight server nodes in blue'", async () => {
            const result = await harness.testPrompt("Highlight server nodes in blue");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "style", ["add", "encode"]);

            // Verify selector targets server type
            const selector = call.arguments.where as string | undefined;
            if (selector) {
                assert.ok(
                    selector.includes("server") || selector === "all",
                    `Expected selector to include 'server' or be a wildcard but got '${selector}'`,
                );
            }

            // Verify style includes color
            const style = (call.arguments.values ?? call.arguments.encode) as Record<string, unknown> | undefined;
            assert.ok(style, "Expected values or an encoding");
            assert.ok(hasColorStyle(style), "Expected color to be specified in style");
        });

        it("calls style for 'Make all nodes bigger'", async () => {
            const result = await harness.testPrompt("Make all nodes bigger");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "style", ["add", "encode"]);

            // Verify style includes size
            const style = (call.arguments.values ?? call.arguments.encode) as Record<string, unknown> | undefined;
            assert.ok(style, "Expected values or an encoding");
            assert.ok(hasSizeStyle(style), "Expected size to be specified in style");
        });

        it("calls style for 'Make database nodes green and larger'", async () => {
            const result = await harness.testPrompt("Make database nodes green and larger");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "style", ["add", "encode"]);

            // Verify selector targets database type
            const selector = call.arguments.where as string | undefined;
            if (selector) {
                assert.ok(
                    selector.includes("database") || selector === "" || selector === "*",
                    `Expected selector to include 'database' or be a wildcard but got '${selector}'`,
                );
            }

            // Verify style includes both color and size
            const style = (call.arguments.values ?? call.arguments.encode) as Record<string, unknown> | undefined;
            assert.ok(style, "Expected values or an encoding");
            // At minimum, one of these should be present
            const hasColor = hasColorStyle(style);
            const hasSize = hasSizeStyle(style);
            assert.ok(hasColor || hasSize, "Expected color or size to be specified in style");
        });
    });

    describe("style edges", () => {
        it("calls style for 'Make all edges green'", async () => {
            const result = await harness.testPrompt("Make all edges green");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "style", ["add", "encode"]);

            // Verify style includes color
            const style = (call.arguments.values ?? call.arguments.encode) as Record<string, unknown> | undefined;
            assert.ok(style, "Expected values or an encoding");
            assert.ok(hasColorStyle(style), "Expected color to be specified in style");
        });

        it("calls style for 'Make high-weight edges thicker'", async () => {
            const result = await harness.testPrompt("Make high-weight edges thicker");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "style", ["add", "encode"]);

            // Verify selector targets weight property
            const selector = call.arguments.where as string | undefined;
            if (selector && selector.length > 0 && selector !== "*") {
                assert.ok(selector.includes("weight"), `Expected selector to include 'weight' but got '${selector}'`);
            }

            // Verify style includes width
            const style = (call.arguments.values ?? call.arguments.encode) as Record<string, unknown> | undefined;
            assert.ok(style, "Expected values or an encoding");
            assert.ok(hasWidthStyle(style), "Expected width to be specified in style");
        });

        it("calls style for 'Color edges with latency > 50 as red'", async () => {
            const result = await harness.testPrompt("Color edges with latency > 50 as red");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            const call = assertAction(result, "style", ["add", "encode"]);

            // Verify selector targets latency property
            const selector = call.arguments.where as string | undefined;
            if (selector && selector.length > 0 && selector !== "*") {
                assert.ok(selector.includes("latency"), `Expected selector to include 'latency' but got '${selector}'`);
            }

            // Verify style includes color
            const style = (call.arguments.values ?? call.arguments.encode) as Record<string, unknown> | undefined;
            assert.ok(style, "Expected values or an encoding");
            assert.ok(hasColorStyle(style), "Expected color to be specified in style");
        });
    });

    describe("clear styles", () => {
        it("calls style clear_mine for 'Remove all styling'", async () => {
            const result = await harness.testPrompt("Remove all styling");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            assertAction(result, "style", ["clear_mine", "remove"]);
        });

        it("calls style clear_mine for 'Clear the highlight style'", async () => {
            // A highlight the assistant added earlier, so there is one to clear.
            await harness
                .getGraph()
                .getSession()
                .styles.add({
                    name: "highlight",
                    target: "node",
                    kind: "custom",
                    selector: { match: "expression", where: "data.type == 'server'" },
                    set: { "node.color": "#ffcc00" },
                    source: { by: "plugin", name: "graphty-ai" },
                });
            const result = await harness.testPrompt("Clear the highlight style");

            assert.ok(result.toolWasCalled, "Expected a tool to be called");
            assertAction(result, "style", ["clear_mine", "remove"]);
            // No highlight exists yet: clearing the assistant's layers, or naming one, both do.
        });
    });

    describe("command result validation", () => {
        it("returns command result for styling nodes", async () => {
            // Use explicit prompt that reliably triggers the tool
            const result = await harness.testPrompt("Apply red color to all nodes");

            // Verify the LLM called the correct tool
            assert.ok(result.toolWasCalled, "Expected the style tool to be called");
            assertAction(result, "style", ["add", "encode"]);

            // Command result should exist (success or failure due to mock limitations)
            assert.ok(result.commandResult, "Expected command result");
            assert.ok(result.commandResult.success, "Expected the change to succeed");
        });

        it("returns command result for styling edges", async () => {
            // Use explicit prompt that reliably triggers the tool
            const result = await harness.testPrompt("Color all edges green");

            // Verify the LLM called the correct tool
            assert.ok(result.toolWasCalled, "Expected the style tool to be called");
            assertAction(result, "style", ["add", "encode"]);

            // Command result should exist (success or failure due to mock limitations)
            assert.ok(result.commandResult, "Expected command result");
            assert.ok(result.commandResult.success, "Expected the change to succeed");
        });

        it("returns command result for clearing styles", async () => {
            // Use explicit prompt that reliably triggers the tool
            const result = await harness.testPrompt("Clear all styles from the graph");

            // Verify the LLM called the correct tool
            assert.ok(result.toolWasCalled, "Expected the style tool to be called");
            assertAction(result, "style", ["clear_mine", "remove"]);

            // Command result should exist (success or failure due to mock limitations)
            assert.ok(result.commandResult, "Expected command result");
            assert.ok(result.commandResult.success, "Expected the change to succeed");
        });

        it("tracks latency for style commands", async () => {
            // Use the same prompt as the color test which reliably triggers a tool
            const result = await harness.testPrompt("Change all node colors to purple");

            assert.ok(result.latencyMs > 0, "Expected positive latency");
            assert.ok(result.latencyMs < getLlmRegressionCaseTimeoutMs(), "Expected latency under the per-case limit");
        });

        it("captures token usage for style commands", async () => {
            const result = await harness.testPrompt("Make all nodes blue");

            // Token usage may not always be available depending on provider configuration
            if (result.tokenUsage) {
                assert.ok(result.tokenUsage.prompt > 0, "Expected positive prompt tokens");
                assert.ok(result.tokenUsage.completion >= 0, "Expected non-negative completion tokens");
            }
        });
    });
});
