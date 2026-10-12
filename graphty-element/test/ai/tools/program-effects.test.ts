/**
 * @file The read-only audit of in-page code: every action a program may call (`boundActions`, over
 * every tool the assistant has) only reads and hands the host nothing. An action that emits an
 * event to the host (a picture, a video, a file) would deliver it with no approval, so the audit
 * reads each bound action's code for an `emit(` call; the seeded case shows it catches the capture
 * tool's screenshot bound under another tool's name.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import { CommandRegistry } from "../../../src/ai/commands";
import { installAssistantTools } from "../../../src/ai/tools/install";
import { type BoundAction, boundActions } from "../../../src/ai/tools/program";
import { AssistantTool, isAssistantTool } from "../../../src/ai/tools/toolset";

/**
 * Every tool the assistant has, on-demand ones too.
 * @returns The tools.
 */
function allTools(): AssistantTool[] {
    const registry = new CommandRegistry();
    installAssistantTools(registry, createGraphSession());
    return registry.getAll().filter((command): command is AssistantTool => isAssistantTool(command));
}

/**
 * The bound actions that do more than read, or hand the host something.
 * @param bound - The bound actions.
 * @returns Them, as `tool.action`.
 */
function violations(bound: readonly BoundAction[]): string[] {
    return bound
        .filter(({ action }) => action.effect !== "read" || /\.emit\(/.test(String(action.run)))
        .map(({ tool, action }) => `${tool}.${action.name}`);
}

describe("in-page code binds only actions that read and hand the host nothing", () => {
    it("lists every bound action, and none writes or emits to the host", () => {
        const tools = allTools();
        const bound = boundActions(tools);
        assert.isAbove(bound.length, 10);
        assert.deepStrictEqual(violations(bound), []);
        const names = new Set(bound.map(({ tool, action }) => `${tool}.${action.name}`));
        assert.isTrue(names.has("query.count"));
        for (const left of ["capture.screenshot", "capture.animation", "export_graph.export", "edit_data.add_nodes"]) {
            assert.isFalse(names.has(left), left);
        }

        // The audit is not vacuous: the actions left out because they emit are what it finds.
        const emitting = tools.flatMap((tool) =>
            tool.definition.actions
                .filter((action) => action.effect === "read")
                .map((action) => ({ tool: tool.name, action })),
        );
        assert.includeMembers(violations(emitting), ["capture.screenshot", "capture.animation", "export_graph.export"]);
    });

    it("catches a screenshot bound under the project tool (seeded)", () => {
        const capture = allTools().find((tool) => tool.name === "capture");
        const screenshot = capture?.definition.actions.find((action) => action.name === "screenshot");
        if (screenshot === undefined) {
            throw new Error("the capture tool has a screenshot action");
        }

        const project = new AssistantTool({
            name: "project",
            plainName: "Project",
            core: false,
            description: "",
            example: {},
            actions: [screenshot],
        });

        assert.deepStrictEqual(violations(boundActions([project])), ["project.screenshot"]);
    });
});
