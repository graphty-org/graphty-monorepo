/**
 * What an application words a step from: the model's own few words for each call (`intent`), what
 * it passed read against the tool's schema (`inputs`), a look-up's read effect, a rule in parts and
 * a style layer's own name.
 * @module test/ai/assistant-steps.test
 */

import { assert, describe, it } from "vitest";

import type { AiConversationMessage } from "../../src/ai/conversation/snapshot";
import { withInputs } from "../../src/ai/tools/inputs";
import { ruleParts } from "../../src/session/styles/predicate";
import { assistantSession, ScriptedAssistant } from "../helpers/assistant";

const ON = ["assistant"];

type Reply = Extract<AiConversationMessage, { role: "assistant" }>;

/**
 * Every call the open conversation recorded, in order, read as an application reads it.
 * @param assistant - The assistant.
 * @returns The calls.
 */
function callsOf(assistant: ScriptedAssistant): Reply["calls"][number][] {
    const snapshot = assistant.controller.getConversation();
    const read = snapshot === null ? null : withInputs(snapshot, assistant.registry);
    return (read?.messages ?? []).flatMap((message) => (message.role === "assistant" ? message.calls : []));
}

describe("intent", () => {
    it("every generated tool asks for it, and the call keeps it as the model gave it", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        for (const tool of assistant.registry.getAll()) {
            const schema = (tool as { jsonSchema?: { required?: string[] } }).jsonSchema;
            if (schema !== undefined) {
                assert.include(schema.required ?? [], "intent", tool.name);
            }
        }

        await assistant.say("color the servers", [
            {
                tool: "style",
                args: {
                    action: "add",
                    intent: "Coloring the servers",
                    where: "data.type == 'server'",
                    values: { "node.color": "#ff0000" },
                },
            },
        ]);
        const [call] = callsOf(assistant);
        assert.strictEqual(call.code, "AI_COMPLETED");
        assert.strictEqual(call.intent, "Coloring the servers");
        assert.notInclude(
            (call.inputs ?? []).map((input) => input.name),
            "intent",
        );
    });

    it("a call without it still runs, and its record has none", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("color the servers", [
            { tool: "style", args: { action: "add", where: "data.type == 'server'", values: { "node.color": "red" } } },
        ]);
        const [call] = callsOf(assistant);
        assert.strictEqual(call.code, "AI_COMPLETED");
        assert.isUndefined(call.intent);
    });

    it("the small profile's call takes it beside or inside the arguments", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory", toolProfile: "small" });
        await assistant.say("color the servers", [
            {
                tool: "call",
                args: {
                    tool: "style",
                    intent: "Coloring the servers",
                    args: { action: "add", where: "data.type == 'server'", values: { "node.color": "red" } },
                },
            },
            {
                tool: "call",
                args: { tool: "query", args: { action: "count", where: "all", intent: "Counting" } },
            },
        ]);
        const [style, count] = callsOf(assistant);
        assert.strictEqual(style.code, "AI_COMPLETED");
        assert.strictEqual(style.intent, "Coloring the servers");
        assert.strictEqual(count.code, "AI_COMPLETED");
        assert.strictEqual(count.intent, "Counting");
        // The inputs are the named tool's own.
        assert.deepEqual(
            (style.inputs ?? []).map((input) => [input.name, input.kind]),
            [
                ["where", "rule"],
                ["values", "values"],
            ],
        );
    });
});

describe("inputs", () => {
    it("names each argument's kind and default name from the tool's schema", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("color the servers", [
            {
                tool: "style",
                args: {
                    action: "add",
                    name: "Servers",
                    where: "data.type == 'server' || data.type == 'router'",
                    values: { "node.color": "red" },
                },
            },
            { tool: "query", args: { action: "nodes", sort: "-data.weight", limit: 3 } },
        ]);
        const [style, query] = callsOf(assistant);
        const where = style.inputs?.find((input) => input.name === "where");
        assert.strictEqual(where?.kind, "rule");
        assert.strictEqual(where?.plainName, "Which");
        assert.deepEqual(where?.rule, {
            join: "all",
            terms: [{ column: "data.type", op: "==", values: ["server", "router"] }],
        });
        assert.strictEqual(style.inputs?.find((input) => input.name === "name")?.kind, "text");
        assert.deepEqual(
            (query.inputs ?? []).map((input) => [input.name, input.kind, input.plainName]),
            [
                ["sort", "column", "Sort by"],
                ["limit", "number", "Limit"],
            ],
        );
    });
});

describe("effects", () => {
    it("a look-up that names nothing says what it read", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("list the layers", [{ tool: "style", args: { action: "list" } }]);
        const [call] = callsOf(assistant);
        assert.deepEqual(call.effects, [{ code: "AI_EFFECT_READ", params: { tool: "style", action: "list" } }]);
    });

    it("a style effect names its layer and states the rule it painted by in parts", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("color", [
            {
                tool: "style",
                args: {
                    action: "add",
                    name: "Servers",
                    where: "data.type == 'server'",
                    values: { "node.color": "red" },
                },
            },
        ]);
        const [call] = callsOf(assistant);
        const [effect] = call.effects ?? [];
        assert.strictEqual(effect.code, "AI_EFFECT_STYLE");
        assert.strictEqual(effect.params.layerName, "Servers");
        assert.deepEqual(effect.rule, {
            join: "all",
            terms: [{ column: "data.type", op: "==", values: ["server"] }],
        });
    });
});

describe("ruleParts", () => {
    it("folds one column's alternatives and keeps a chain of comparisons", () => {
        assert.deepEqual(ruleParts("value == `0` || value == `1`"), {
            join: "all",
            terms: [{ column: "value", op: "==", values: [0, 1] }],
        });
        assert.deepEqual(ruleParts("data.weight >= `2` && `5` > data.weight"), {
            join: "all",
            terms: [
                { column: "data.weight", op: ">=", values: [2] },
                { column: "data.weight", op: "<", values: [5] },
            ],
        });
        assert.deepEqual(ruleParts("a == `1` || b == `2`"), {
            join: "any",
            terms: [
                { column: "a", op: "==", values: [1] },
                { column: "b", op: "==", values: [2] },
            ],
        });
    });

    it("states nothing for a rule the parts cannot hold", () => {
        assert.isUndefined(ruleParts("a == `1` && b == `2` || c == `3`"));
        assert.isUndefined(ruleParts("!(a == `1`)"));
        assert.isUndefined(ruleParts("a == b"));
        assert.isUndefined(ruleParts("a == "));
    });
});
