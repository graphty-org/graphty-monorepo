/**
 * @file What a model is sent before it reads a word of the request: the always-loaded tools'
 * declarations, measured as sent (description plus compact JSON Schema, at three characters a
 * token, as JSON Schema runs). The standard profile is eleven tools within 5,000 tokens; the small
 * profile four within 1,500 -- the limits past which tool choice falls apart. It holds with a
 * plugin pack registered too: past forty names a catalog field becomes a validated string.
 */

import { afterEach, assert, describe, it } from "vitest";

import { defineAlgorithm, defineLayout } from "../../../extend";
import { createGraphSession } from "../../../session";
import { MAX_AGENT_NAME_LENGTH, MAX_AGENT_PURPOSE_LENGTH, MAX_AGENTS } from "../../../src/ai/agents";
import { CommandRegistry } from "../../../src/ai/commands";
import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import type { ToolSpec } from "../../../src/ai/engine/types";
import { delegation } from "../../../src/ai/plans/delegate";
import { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import { ASK_READER_TOOL } from "../../../src/ai/questions";
import { turnTools } from "../../../src/ai/runConversation";
import { researchRole } from "../../../src/ai/tools/hosted";
import { installAssistantTools } from "../../../src/ai/tools/install";
import { isAssistantTool } from "../../../src/ai/tools/toolset";
import { clearRegisteredLayoutsForTesting } from "../../../src/catalog/layoutRegistry";
import { clearRegisteredAlgorithmsForTesting } from "../../../src/catalog/registry";

/** Characters to tokens, for JSON Schema. */
const CHARS_PER_TOKEN = 3;

/** The `delegate` tool for the design's two helpers. */
const DELEGATE_TOOL = delegation({
    roles: [
        { name: "counter", purpose: "Count and read nodes; never changes anything.", commands: ["query"] },
        { name: "stylist", purpose: "Color and size nodes.", commands: ["style"] },
    ],
    engine: new FakeEngine(),
    provider: new MockLlmProvider(),
    keyFor: () => undefined,
}).tool;

/** The `delegate` tool with web search on: the built-in research helper beside the design's two. */
const WEB_DELEGATE_TOOL = delegation({
    roles: [
        { name: "counter", purpose: "Count and read nodes; never changes anything.", commands: ["query"] },
        { name: "stylist", purpose: "Color and size nodes.", commands: ["style"] },
        researchRole({ webSearch: true, webFetch: true }),
    ],
    engine: new FakeEngine(),
    provider: new MockLlmProvider(),
    keyFor: () => undefined,
}).tool;

/** The `delegate` tool for the most helpers a host may name, each with the longest name and purpose. */
const LARGEST_DELEGATE_TOOL = delegation({
    roles: Array.from({ length: MAX_AGENTS }, (_, at) => ({
        name: String(at).padEnd(MAX_AGENT_NAME_LENGTH, "h"),
        purpose: "p".repeat(MAX_AGENT_PURPOSE_LENGTH),
        commands: ["query"],
    })),
    engine: new FakeEngine(),
    provider: new MockLlmProvider(),
    keyFor: () => undefined,
}).tool;

/**
 * The tokens one profile's first turn declares.
 * @param profile - The profile.
 * @param questions - Whether `ask_reader` is offered.
 * @param helpers - Whether `delegate` is offered: for two helpers, or for the most a host may name.
 * @returns The tool count and the estimated tokens.
 */
function declared(
    profile: "standard" | "small",
    questions = false,
    helpers: false | true | "largest" | "web" = false,
): { tools: string[]; tokens: number; enumNames: boolean } {
    const registry = new CommandRegistry();
    installAssistantTools(registry, createGraphSession());
    const offered = turnTools(registry, profile, []);
    // The loop's own tools, when helpers or questions are switched on.
    const delegate =
        { largest: [LARGEST_DELEGATE_TOOL], true: [DELEGATE_TOOL], web: [WEB_DELEGATE_TOOL], false: [] }[
            String(helpers)
        ] ?? [];
    const loopTools: ToolSpec[] = [...delegate, ...(questions ? [ASK_READER_TOOL] : [])];
    let chars = 0;
    for (const tool of loopTools) {
        chars += tool.name.length + tool.description.length + JSON.stringify(tool.jsonSchema).length;
    }

    for (const tool of offered) {
        assert.isTrue(isAssistantTool(tool));
        chars +=
            tool.name.length +
            tool.description.length +
            (isAssistantTool(tool) ? JSON.stringify(tool.jsonSchema).length : 0);
    }

    const run = registry.get("run_algorithm");
    const name = isAssistantTool(run)
        ? (run.jsonSchema as { properties: { name: { enum?: unknown } } }).properties.name
        : undefined;
    return {
        tools: [...offered.map((tool) => tool.name), ...loopTools.map((tool) => tool.name)],
        tokens: Math.ceil(chars / CHARS_PER_TOKEN),
        enumNames: name?.enum !== undefined,
    };
}

describe("the always-loaded tools fit a model's budget", () => {
    afterEach(() => {
        clearRegisteredAlgorithmsForTesting();
        clearRegisteredLayoutsForTesting();
    });

    it("declares eleven tools within 5,000 tokens in the standard profile", () => {
        const { tools, tokens, enumNames } = declared("standard");
        assert.lengthOf(tools, 11);
        assert.isAtMost(tokens, 5000);
        assert.isTrue(enumNames, "29 algorithms are an enum");
    });

    it("declares four tools within 1,500 tokens in the small profile", () => {
        const { tools, tokens } = declared("small");
        assert.deepStrictEqual(tools.sort(), ["call", "catalog", "query", "undo"]);
        assert.isAtMost(tokens, 1500);
    });

    it("stays within both budgets with questions on: ask_reader is the twelfth and the fifth tool", () => {
        const standard = declared("standard", true);
        assert.lengthOf(standard.tools, 12);
        assert.isAtMost(standard.tokens, 5000);
        const small = declared("small", true);
        assert.lengthOf(small.tools, 5);
        assert.isAtMost(small.tokens, 1500);
    });

    it("stays within both budgets with two helpers and questions on: delegate and ask_reader follow", () => {
        const standard = declared("standard", true, true);
        assert.lengthOf(standard.tools, 13);
        assert.isAtMost(standard.tokens, 5000);
        const small = declared("small", true, true);
        assert.lengthOf(small.tools, 6);
        assert.isAtMost(small.tokens, 1500);
    });

    it("stays within both budgets with the most helpers, their names and purposes the longest, and questions on", () => {
        assert.isAtMost(declared("standard", true, "largest").tokens, 5000);
        assert.isAtMost(declared("small", true, "largest").tokens, 1500);
    });

    it("stays within both budgets with web tools on: delegate names research, and no provider tool is declared", () => {
        const standard = declared("standard", true, "web");
        assert.lengthOf(standard.tools, 13);
        assert.isAtMost(standard.tokens, 5000);
        const small = declared("small", true, "web");
        assert.lengthOf(small.tools, 6);
        assert.isAtMost(small.tokens, 1500);
    });

    it("stays within budget with 100 algorithms and 30 layouts registered, their names a validated string", () => {
        for (let index = 0; index < 100; index++) {
            defineAlgorithm({ id: `acme-metric-${String(index)}`, node: () => index });
        }

        for (let index = 0; index < 30; index++) {
            defineLayout({ id: `acme-layout-${String(index)}`, dimensions: 2, place: () => new Map() });
        }

        const { tokens, enumNames } = declared("standard");
        assert.isFalse(enumNames, "past forty names, a string the catalog validates");
        assert.isAtMost(tokens, 5000);
        assert.isAtMost(declared("small").tokens, 1500);
    });
});
