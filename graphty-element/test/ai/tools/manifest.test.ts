/**
 * @file `ASSISTANT_TOOLS` in `./catalog` is plain data an application reads without loading the
 * assistant; the tools themselves are generated. This keeps the two the same, tool by tool and
 * action by action, and the published cause codes the same as the codes the tools refuse with.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { AI_TOOL_CAUSE_CODES, ASSISTANT_TOOLS, CATALOG_KINDS } from "../../../catalog";
import { createGraphSession } from "../../../session";
import { CommandRegistry } from "../../../src/ai/commands";
import { installAssistantTools } from "../../../src/ai/tools/install";
import { isAssistantTool } from "../../../src/ai/tools/toolset";

describe("the published list of the assistant's tools", () => {
    it("names every generated tool, whether it is core, and its actions", () => {
        const registry = new CommandRegistry();
        installAssistantTools(registry, createGraphSession());
        const generated = registry
            .getAll()
            .filter(isAssistantTool)
            .map((tool) => ({
                name: tool.name,
                core: tool.load === "always",
                actions: tool.name === "call" ? [] : tool.definition.actions.map((action) => action.name),
            }));
        assert.deepStrictEqual(
            generated,
            ASSISTANT_TOOLS.map(({ name, core, actions }) => ({ name, core, actions: [...actions] })),
        );
    });

    it("publishes every AI_ code a tool refuses with", () => {
        const dir = join(__dirname, "..", "..", "..", "src", "ai", "tools");
        const files = [
            ...readdirSync(dir)
                .filter((name) => name.endsWith(".ts"))
                .map((name) => join(dir, name)),
            ...readdirSync(join(dir, "families")).map((name) => join(dir, "families", name)),
            join(dir, "..", "ToolExecutor.ts"),
        ];
        const used = new Set(
            files
                .flatMap((file) => readFileSync(file, "utf8").match(/"AI_[A-Z_]+"/g) ?? [])
                .map((code) => code.slice(1, -1)),
        );
        const reader = new Set([
            "AI_COMPLETED",
            "AI_CONFIRMATION_NEEDED",
            "AI_TOOL_INVALID_ARGUMENTS",
            "AI_TOOL_FAILED",
            "AI_TOOL_THREW",
        ]);
        const unpublished = [...used].filter(
            (code) => !reader.has(code) && !(AI_TOOL_CAUSE_CODES as readonly string[]).includes(code),
        );
        assert.deepStrictEqual(unpublished, []);
    });

    it("lists the kinds catalog search finds", () => {
        assert.deepStrictEqual(
            [...CATALOG_KINDS],
            ["algorithm", "layout", "format", "palette", "scale", "channel", "camera", "setting", "tool"],
        );
    });
});
