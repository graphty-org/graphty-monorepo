/**
 * What the Assistant shows a reader to check an answer by: effects on a message, targets, peek and a
 * message's scope. All of it needs the `assistant` experiment; with it off, or with nothing set,
 * the assistant behaves as it did before.
 * @module test/ai/assistant-evidence.test
 */

import { assert, beforeEach, describe, it } from "vitest";

import type { GraphSession } from "../../session";
import type { AiCommandOptions } from "../../src/ai/AiController";
import { readConversation, writeConversation } from "../../src/ai/conversation/formats";
import { MemoryStore } from "../../src/ai/conversation/MemoryStore";
import { conversationSnapshot } from "../../src/ai/conversation/snapshot";
import type { AiEffect } from "../../src/catalog/ai";
import { isGraphtyError } from "../../src/errors";
import { setDefaultFeatures } from "../../src/features/resolve";
import { assistantSession, callsTurn, ScriptedAssistant, textTurn } from "../helpers/assistant";

const ON = ["assistant"];

/**
 * A graph of numbered nodes in a ring, a quarter of them `kind: "core"`.
 * @param count - How many nodes.
 * @returns The graph.
 */
function ring(count: number): { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } {
    const ids = Array.from({ length: count }, (_, index) => `n${String(index)}`);
    return {
        nodes: ids.map((id, index) => ({ id, kind: index % 4 === 0 ? "core" : "leaf" })),
        edges: ids.map((id, index) => ({ source: id, target: ids[(index + 1) % count] })),
    };
}

/**
 * Every effect of the open conversation, in order.
 * @param assistant - The assistant.
 * @returns The effects.
 */
function effectsOf(assistant: ScriptedAssistant): AiEffect[] {
    return (assistant.controller.getConversation()?.messages ?? []).flatMap((message) =>
        message.role === "assistant" ? (message.effects ?? []) : [],
    );
}

/**
 * Send one message with options, its model making one batch of calls and then answering.
 * @param assistant - The assistant.
 * @param calls - The calls.
 * @param options - The message's options.
 * @returns What the message did.
 */
function send(
    assistant: ScriptedAssistant,
    calls: { tool: string; args?: Record<string, unknown> }[],
    options: AiCommandOptions,
): ReturnType<ScriptedAssistant["controller"]["execute"]> {
    assistant.engine.push(callsTurn(calls), textTurn("done"));
    return assistant.controller.execute("do it", options);
}

/**
 * The first few elements of a session's nodes, selected.
 * @param session - The session.
 * @param count - How many.
 * @returns When selected.
 */
async function selectFirst(session: GraphSession, count: number): Promise<void> {
    await session.selection.apply({ ids: Array.from({ length: count }, (_, index) => `n${String(index)}`) });
}

/**
 * Whether a rejection is `E_FEATURE_OFF` for a key.
 * @param run - What should reject.
 * @param key - The key it names.
 */
async function refusedOff(run: () => Promise<unknown>, key: string): Promise<void> {
    let thrown: unknown;
    try {
        await run();
    } catch (error) {
        thrown = error;
    }

    assert.isTrue(isGraphtyError(thrown), "it rejects with a GraphtyError");
    const error = thrown as { code: string; details: unknown };
    assert.strictEqual(error.code, "E_FEATURE_OFF");
    assert.deepEqual(error.details, { feature: "assistant", key });
}

describe("effects", () => {
    it("a style run's effect names a target that finds the same nodes and follows the data", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("color the servers", [
            {
                tool: "style",
                args: { action: "add", where: "data.type == 'server'", values: { "node.color": "#ff0000" } },
            },
        ]);

        const [effect] = effectsOf(assistant);
        assert.strictEqual(effect.code, "AI_EFFECT_STYLE");
        assert.strictEqual(effect.params.channel, "node.color");
        assert.strictEqual(effect.params.nodes, 2);
        assert.strictEqual(effect.params.hidden, 0);
        assert.isDefined(effect.target);
        const { target } = effect;

        await session.selection.apply(target);
        assert.sameMembers([...session.selection.nodes], ["a", "c"]);
        session.selection.clear();

        await session.data.addNodes([{ id: "z", type: "server" }]);
        assert.strictEqual((await session.selection.count(target)).nodes, 3);
    });

    it("a target whose layer is gone is refused, so its elements can be told gone", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("color", [
            {
                tool: "style",
                args: { action: "add", where: "data.type == 'server'", values: { "node.color": "#ff0000" } },
            },
        ]);
        const [{ target, params }] = effectsOf(assistant);
        await session.styles.remove(String(params.layer));

        let code: unknown;
        try {
            await session.selection.count(target!);
        } catch (error) {
            ({ code } = error as { code: unknown });
        }

        assert.strictEqual(code, "E_UNKNOWN_LAYER");
    });

    it("counts the matched elements a filter hides", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("hide team blue, then color the servers", [
            { tool: "filter", args: { action: "hide", where: "data.team == 'blue'" } },
            {
                tool: "style",
                args: { action: "add", where: "data.type == 'server'", values: { "node.color": "#ff0000" } },
            },
        ]);

        const [filter, style] = effectsOf(assistant);
        assert.strictEqual(filter.code, "AI_EFFECT_FILTER");
        assert.strictEqual(filter.params.kept, 2);
        assert.strictEqual(filter.params.total, 5);
        assert.strictEqual(style.params.hidden, 1);
    });

    it("records how long each call ran, with the experiment on and not with it off", async () => {
        const durations = async (features?: readonly string[]): Promise<(number | undefined)[]> => {
            const session = await assistantSession(undefined, features);
            const assistant = new ScriptedAssistant(session, { history: "memory" });
            await assistant.say("what is here?", [{ tool: "query", args: { action: "overview" } }]);
            return (assistant.controller.getConversation()?.messages ?? []).flatMap((message) =>
                message.role === "assistant" ? message.calls.map((call) => call.durationMs) : [],
            );
        };
        const [on] = await durations(ON);
        assert.isAtLeast(on ?? -1, 0);
        // Off even where every experiment is on by default (the "-features-on" projects).
        setDefaultFeatures([]);
        assert.deepEqual(await durations(), [undefined]);
    });

    it("an empty read is an effect naming what was searched", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("which are big?", [{ tool: "query", args: { action: "nodes", where: "data.load > `5`" } }]);

        const [effect] = effectsOf(assistant);
        assert.strictEqual(effect.code, "AI_EFFECT_EMPTY");
        assert.deepEqual(effect.params, { tool: "query", searched: "data.load > `5`" });
    });

    it("a read that finds elements points at them; a write refused for matching nothing is empty too", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say(
            "the servers",
            [{ tool: "query", args: { action: "nodes", where: "data.type == 'server'" } }],
            [
                {
                    tool: "style",
                    args: { action: "add", where: "data.type == 'none'", values: { "node.color": "#ff0000" } },
                },
            ],
        );

        const [found, empty] = effectsOf(assistant);
        assert.strictEqual(found.code, "AI_EFFECT_FOUND");
        assert.strictEqual(found.params.nodes, 2);
        assert.strictEqual((await session.selection.count(found.target!)).nodes, 2);
        assert.deepEqual(empty, {
            code: "AI_EFFECT_EMPTY",
            params: { tool: "style", searched: "data.type == 'none'" },
        });
    });

    it("a removed run says so, with the layers that went with it", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory", gate: false });
        await assistant.say(
            "run it, then take it away",
            [{ tool: "run_algorithm", args: { action: "run", name: "degree", style: true } }],
            [{ tool: "results", args: { action: "remove", run: "degree" } }],
        );

        const removed = effectsOf(assistant).at(-1);
        assert.exists(removed);
        assert.strictEqual(removed?.code, "AI_EFFECT_RUN_REMOVED");
        assert.strictEqual(removed.params.algorithm, "degree");
        assert.isString(removed.params.run);
        assert.isAbove(Number(removed.params.removedLayers), 0);
    });

    it("a ranking that selects says so beside what it found; one that only reads does not", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory", gate: false });
        await assistant.say(
            "the top two, selected",
            [{ tool: "run_algorithm", args: { action: "run", name: "degree", style: false } }],
            [{ tool: "results", args: { action: "top", run: "degree", k: 2, select: true } }],
            [{ tool: "results", args: { action: "top", run: "degree", k: 1 } }],
        );

        const [, , selection, found, read] = effectsOf(assistant);
        assert.deepEqual(
            effectsOf(assistant).map((effect) => effect.code),
            ["AI_EFFECT_RUN", "AI_EFFECT_FOUND", "AI_EFFECT_SELECTION", "AI_EFFECT_FOUND", "AI_EFFECT_FOUND"],
        );
        assert.deepEqual(selection.params, { nodes: 2, edges: 0 });
        assert.deepEqual(found.params, { nodes: 2 });
        assert.deepEqual(read.params, { nodes: 1 });
        assert.lengthOf(session.selection.nodes, 2);
        assert.strictEqual((await session.selection.count(selection.target!)).nodes, 2);
    });

    it("a ranking run names its leader as found, a target that selects the top node", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory", gate: false });
        await assistant.say("which is the most connected?", [
            { tool: "run_algorithm", args: { action: "run", name: "degree", style: false } },
        ]);

        const leader = effectsOf(assistant).find((effect) => effect.code === "AI_EFFECT_FOUND");
        assert.exists(leader, "the run's leader is found");
        assert.deepEqual(leader.params, { nodes: 1 });
        const run = session.runs.list().at(-1);
        const top = run?.result?.summary().top[0] as { id?: unknown } | undefined;
        await session.selection.apply(leader.target!, "replace");
        assert.deepEqual(session.selection.nodes.map(String), [String(top?.id)]);
    });

    it("says what a whole-graph read found and how a grouping run grouped", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory", gate: false });
        await assistant.say(
            "summarize and group",
            [{ tool: "query", args: { action: "overview" } }],
            [{ tool: "query", args: { action: "statistics" } }],
            [{ tool: "run_algorithm", args: { action: "run", name: "louvain", style: false } }],
        );

        const [overview, statistics, run] = effectsOf(assistant);
        const counts = { nodes: session.status.counts.nodes, edges: session.status.counts.edges };
        assert.deepEqual(overview, { code: "AI_EFFECT_FOUND", params: counts, target: { scope: "graph" } });
        assert.deepEqual(statistics, overview);
        assert.strictEqual(run.code, "AI_EFFECT_RUN");
        const summary = session.runs.get(String(run.params.run))?.result?.summary();
        assert.isNumber(run.params.groups);
        assert.strictEqual(run.params.groups, summary?.groupCount);
        assert.strictEqual(run.params.largest, Math.max(...(summary?.groups ?? []).map((group) => group.size)));
    });

    it("words every other kind of change as a code with its facts", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory", gate: false });
        await assistant.say(
            "all of it",
            [{ tool: "layout", args: { action: "set", name: "circular" } }],
            [{ tool: "run_algorithm", args: { action: "run", name: "degree", style: false } }],
            [{ tool: "select", args: { action: "set", where: "data.team == 'red'" } }],
            [{ tool: "edit_data", args: { action: "remove_nodes", ids: ["e"] } }],
            [
                {
                    tool: "edit_data",
                    args: { action: "update_nodes", where: "data.type == 'server'", values: { up: 1 } },
                },
            ],
            [{ tool: "style", args: { action: "clear_mine" } }],
        );

        const effects = effectsOf(assistant);
        assert.deepEqual(
            effects.map((effect) => effect.code),
            [
                "AI_EFFECT_LAYOUT",
                "AI_EFFECT_RUN",
                "AI_EFFECT_FOUND",
                "AI_EFFECT_SELECTION",
                "AI_EFFECT_DATA",
                "AI_EFFECT_DATA",
                "AI_EFFECT_OTHER",
            ],
        );
        const [layout, run, , selection, removed, changed, other] = effects;
        assert.deepEqual(layout.params, { layout: "circular", nodes: 5 });
        assert.strictEqual(run.params.nodes, 5);
        assert.deepEqual(selection.params, { nodes: 2, edges: 0 });
        assert.deepEqual(removed.params, { removedNodes: 1, removedEdges: 2 });
        assert.deepEqual(changed.params, { changedValues: 2 });
        assert.deepEqual(other.params, { tool: "style", action: "clear_mine" });
    });

    it("a reader's message carries the id its history steps do, so an application can offer its undo", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("color", [
            { tool: "style", args: { action: "add", where: "all", values: { "node.color": "#ff0000" } } },
        ]);

        const reader = assistant.controller.getConversation()?.messages[0];
        const next = session.history.nextUndo;
        assert.strictEqual(next?.kind, "undo");
        assert.strictEqual(
            next?.kind === "undo" ? next.step.provenance.message : undefined,
            reader?.role === "reader" ? reader.provenance : "no reader",
        );
    });

    it("a batch taken back reports no effect", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("two things", [
            { tool: "select", args: { action: "set", where: "data.type == 'server'" } },
            { tool: "style", args: { action: "add", where: "data.nope ==", values: { "node.color": "#ff0000" } } },
        ]);

        assert.deepEqual(effectsOf(assistant), []);
    });

    it("keeps effects and scope through a saved conversation, read back as it was", async () => {
        const session = await assistantSession(ring(8), ON);
        await selectFirst(session, 3);
        const store = new MemoryStore();
        const assistant = new ScriptedAssistant(session, { history: "memory", store });
        await send(assistant, [{ tool: "style", args: { action: "add", values: { "node.color": "#ff0000" } } }], {
            scope: "selection",
        });

        const { id } = assistant.controller.getConversation()!;
        const record = await store.load(id);
        const read = readConversation(writeConversation(record!));
        assert.isTrue(read.ok);
        const snapshot = conversationSnapshot(read.record);
        const reader = snapshot.messages.find((message) => message.role === "reader");
        const effects = snapshot.messages.flatMap((message) =>
            message.role === "assistant" ? (message.effects ?? []) : [],
        );

        assert.deepEqual(reader?.role === "reader" ? reader.scope : undefined, {
            kind: "selection",
            nodes: 3,
            edges: 0,
            hiddenNodes: 0,
            hiddenEdges: 0,
        });
        assert.strictEqual(effects[0].params.nodes, 3);
        assert.deepEqual(effects, effectsOf(assistant));
    });
});

describe("a target on an approval's preview", () => {
    it("covers all twelve nodes where `ids` stops at ten", async () => {
        const session = await assistantSession(ring(20), ON);
        const assistant = new ScriptedAssistant(session);
        const twelve = Array.from({ length: 12 }, (_, index) => `n${String(index)}`);
        await assistant.say("remove twelve", [{ tool: "edit_data", args: { action: "remove_nodes", ids: twelve } }]);

        const [request] = assistant.controller.getPendingApprovals();
        assert.strictEqual(request.gate, "large");
        assert.lengthOf(request.preview.ids ?? [], 10);
        assert.strictEqual((await session.selection.count(request.preview.target!)).nodes, 12);
    });

    it("is the rule when the call named a rule", async () => {
        const session = await assistantSession(ring(20), ON);
        const assistant = new ScriptedAssistant(session);
        await assistant.say("remove the leaves", [
            { tool: "edit_data", args: { action: "remove_nodes", where: "data.kind == 'leaf'" } },
        ]);

        const [request] = assistant.controller.getPendingApprovals();
        assert.deepEqual(request.preview.target, { where: "data.kind == 'leaf'" });
    });
});

describe("peek", () => {
    it("adds no undo step, changes no selection and saves nothing, and clears", async () => {
        const session = await assistantSession(undefined, ON);
        await session.selection.apply({ ids: ["a"] });
        const { position, steps } = session.history;
        const saved = (await session.project.save()).text;

        const counted = await session.selection.peek({ where: "data.type == 'client'" });
        assert.deepEqual(counted, { nodes: 3, edges: 0 });
        assert.deepEqual(session.selection.peeked, { nodes: 3, edges: 0 });
        assert.deepEqual([...session.selection.nodes], ["a"]);
        assert.strictEqual(session.history.position, position);
        assert.strictEqual(session.history.steps.length, steps.length);
        assert.strictEqual((await session.project.save()).text, saved);
        assert.lengthOf(
            session.styles.list().filter((layer) => layer.name.startsWith("Peeked")),
            0,
            "the layer is no layer of the project's",
        );

        await session.selection.peek(null);
        assert.isNull(session.selection.peeked);
    });

    it("goes when the graph changes, and at the session's end", async () => {
        const session = await assistantSession(undefined, ON);
        await session.selection.peek({ ids: ["a"] });
        await session.data.addNodes([{ id: "z" }]);
        await session.selection.count({ ids: ["a"] });
        assert.isNull(session.selection.peeked);

        await session.selection.peek({ ids: ["a"] });
        session.dispose();
        assert.isNull(session.selection.peeked);
    });

    it("refuses a target the selection refuses, and leaves what was showing", async () => {
        const session = await assistantSession(undefined, ON);
        await session.selection.peek({ ids: ["a"] });
        let code: unknown;
        try {
            await session.selection.peek({ layer: "no-such-layer" });
        } catch (error) {
            ({ code } = error as { code: unknown });
        }

        assert.strictEqual(code, "E_UNKNOWN_LAYER");
        assert.deepEqual(session.selection.peeked, { nodes: 1, edges: 0 });
    });
});

describe("scope", () => {
    it('"selection" binds all 42 selected nodes, not 20', async () => {
        const session = await assistantSession(ring(60), ON);
        await selectFirst(session, 42);
        const assistant = new ScriptedAssistant(session, { history: "memory" });

        await send(assistant, [{ tool: "style", args: { action: "add", values: { "node.color": "#ff0000" } } }], {
            scope: "selection",
        });

        const [effect] = effectsOf(assistant);
        assert.strictEqual(effect.params.nodes, 42);
        const reader = assistant.controller.getConversation()?.messages[0];
        assert.deepEqual(reader?.role === "reader" ? reader.scope : undefined, {
            kind: "selection",
            nodes: 42,
            edges: 0,
            hiddenNodes: 0,
            hiddenEdges: 0,
        });
    });

    it("names the selection by reference, limits a rule to it, and counts hidden members", async () => {
        const session = await assistantSession(ring(60), ON);
        await selectFirst(session, 42);
        await session.visibility.set({ kind: "not", of: { kind: "member", of: { nodes: ["n0", "n1"] } } });
        const assistant = new ScriptedAssistant(session, { history: "memory" });

        await send(
            assistant,
            [
                { tool: "style", args: { action: "add", where: "selection", values: { "node.size": 3 } } },
                {
                    tool: "style",
                    args: { action: "add", where: "data.kind == 'core'", values: { "node.color": "#ff0000" } },
                },
            ],
            { scope: "selection" },
        );

        const [size, color] = effectsOf(assistant);
        assert.strictEqual(size.params.nodes, 42);
        assert.strictEqual(size.params.hidden, 2);
        // Eleven of the 42 are core: every fourth from n0 to n40; the 15 in the graph are not all in scope.
        assert.strictEqual(color.params.nodes, 11);
        const reader = assistant.controller.getConversation()?.messages[0];
        assert.strictEqual(reader?.role === "reader" ? reader.scope?.hiddenNodes : undefined, 2);
        const facts = assistant.engine.requests[0].messages.flatMap((message) => message.parts);
        assert.isTrue(
            facts.some((part) => part.type === "text" && part.text.includes("the reader's selection, 42 nodes")),
            "the model is told",
        );
    });

    it('"graph" ignores the selection', async () => {
        const session = await assistantSession(ring(60), ON);
        await selectFirst(session, 42);
        const assistant = new ScriptedAssistant(session, { history: "memory" });

        await send(
            assistant,
            [{ tool: "style", args: { action: "add", where: "all", values: { "node.color": "#ff0000" } } }],
            { scope: "graph" },
        );

        assert.strictEqual(effectsOf(assistant)[0].params.nodes, 60);
        const parts = assistant.engine.requests[0].messages.flatMap((message) => message.parts);
        const facts = parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
        assert.notInclude(facts, "Selected:");
        assert.include(facts, "whole graph");
    });

    it("a selection changed while the message runs does not change its scope", async () => {
        const session = await assistantSession(ring(60), ON);
        await selectFirst(session, 42);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        assistant.engine.push(async function* changedMidRun() {
            await session.selection.apply({ ids: ["n50"] });
            yield* callsTurn([{ tool: "style", args: { action: "add", values: { "node.color": "#ff0000" } } }]);
        }, textTurn("done"));

        await assistant.controller.execute("color these", { scope: "selection" });
        assert.strictEqual(effectsOf(assistant)[0].params.nodes, 42);
    });

    it("the selection as sent still binds a held change after a reload", async () => {
        const session = await assistantSession(ring(60), ON);
        await selectFirst(session, 42);
        const store = new MemoryStore();
        const first = new ScriptedAssistant(session, { history: "memory", store });
        await send(first, [{ tool: "edit_data", args: { action: "remove_nodes", where: "all" } }], {
            scope: "selection",
        });
        const [{ id }] = first.controller.getPendingApprovals();
        first.controller.dispose();

        const second = new ScriptedAssistant(session, { history: "memory", store });
        await second.controller.ready();
        second.engine.push(textTurn("done"));
        await second.controller.resolveAiApproval(id, { approve: true });

        assert.strictEqual(session.status.counts.nodes, 18);
    });

    it("the model's own tools for a read stay limited to it", async () => {
        const session = await assistantSession(ring(60), ON);
        await selectFirst(session, 42);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await send(assistant, [{ tool: "query", args: { action: "count", where: "selection" } }], {
            scope: "selection",
        });

        assert.strictEqual(effectsOf(assistant)[0].params.nodes, 42);
    });
});

describe("with the experiment off", () => {
    // Off even where every experiment is on by default (the "-features-on" projects).
    beforeEach(() => {
        setDefaultFeatures([]);
    });

    it("records no effect and no target", async () => {
        const session = await assistantSession(ring(20));
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("color", [
            { tool: "style", args: { action: "add", where: "all", values: { "node.color": "#ff0000" } } },
        ]);
        const twelve = Array.from({ length: 12 }, (_, index) => `n${String(index)}`);
        await assistant.say("remove", [{ tool: "edit_data", args: { action: "remove_nodes", ids: twelve } }]);

        const messages = assistant.controller.getConversation()?.messages ?? [];
        assert.isFalse(messages.some((message) => "effects" in message));
        const [request] = assistant.controller.getPendingApprovals();
        assert.notProperty(request.preview, "target");
    });

    it("refuses a scope and a peek with E_FEATURE_OFF, substituting nothing", async () => {
        const session = await assistantSession(ring(8));
        const assistant = new ScriptedAssistant(session);

        await refusedOff(() => assistant.controller.execute("hello", { scope: "selection" }), "scope");
        await refusedOff(() => session.selection.peek({ ids: ["n0"] }), "selection.peek");
        assert.lengthOf(assistant.engine.requests, 0, "nothing was sent");
    });
});

describe("with nothing set", () => {
    it("tells the model how much is selected, as before, and reports no scope", async () => {
        const session = await assistantSession(ring(8), ON);
        await selectFirst(session, 3);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("hello");

        const parts = assistant.engine.requests[0].messages.flatMap((message) => message.parts);
        const facts = parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
        assert.include(facts, "Selected: 3.");
        assert.notInclude(facts, "This message is about");
        const reader = assistant.controller.getConversation()?.messages[0];
        assert.notProperty(reader ?? {}, "scope");
    });

    it("reads a target as written, the selection untouched", async () => {
        const session = await assistantSession(ring(8), ON);
        await selectFirst(session, 3);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("all", [
            { tool: "style", args: { action: "add", where: "all", values: { "node.color": "#ff0000" } } },
        ]);

        assert.strictEqual(effectsOf(assistant)[0].params.nodes, 8);
    });
});
