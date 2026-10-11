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
import { CommandRegistry } from "../../../src/ai/commands";
import { turnTools } from "../../../src/ai/runConversation";
import { installAssistantTools } from "../../../src/ai/tools/install";
import { isAssistantTool } from "../../../src/ai/tools/toolset";
import { clearRegisteredLayoutsForTesting } from "../../../src/catalog/layoutRegistry";
import { clearRegisteredAlgorithmsForTesting } from "../../../src/catalog/registry";

/** Characters to tokens, for JSON Schema. */
const CHARS_PER_TOKEN = 3;

/**
 * The tokens one profile's first turn declares.
 * @param profile - The profile.
 * @returns The tool count and the estimated tokens.
 */
function declared(profile: "standard" | "small"): { tools: string[]; tokens: number; enumNames: boolean } {
    const registry = new CommandRegistry();
    installAssistantTools(registry, createGraphSession());
    const offered = turnTools(registry, profile, []);
    let chars = 0;
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
        tools: offered.map((tool) => tool.name),
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
