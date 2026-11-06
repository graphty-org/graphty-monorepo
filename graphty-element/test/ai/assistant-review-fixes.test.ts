/**
 * @file What a consumer of the assistant no longer has to do itself: the saved conversation reopens
 * when the graph loads after `enableAiControl`, typed answers match as spoken ones do, a message
 * knows it was undone, a selection limits writes with no target, and a controller built directly
 * refuses what `enableAiControl` refuses.
 */

import { assert, describe, it } from "vitest";

import { calledAlgorithm } from "../../catalog";
import { AiConfigError } from "../../src/ai/agents";
import { AiController } from "../../src/ai/AiController";
import { CommandRegistry } from "../../src/ai/commands";
import type { CommandContext } from "../../src/ai/commands/types";
import { MemoryStore } from "../../src/ai/conversation/MemoryStore";
import { pickedChoices } from "../../src/ai/questions";
import type { AiQuestionRequest } from "../../src/events";
import { assistantSession, callsTurn, ScriptedAssistant, textTurn } from "../helpers/assistant";

const ON = ["assistant"];
const ADD_NODE = { tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } };
const PAINT = { tool: "style", args: { action: "add", where: "all", values: { "node.color": "#ff0000" } } };
const TWO_NODES = {
    nodes: [
        { id: "x", group: 1 },
        { id: "y", group: 2 },
    ],
    edges: [],
};

/**
 * A question.
 * @param choices - Its choices.
 * @param multiple - Whether it takes several.
 * @returns The request.
 */
function question(choices: readonly string[], multiple = false): AiQuestionRequest {
    return { id: "q", question: "Which?", choices, multiple };
}

describe("a typed answer", () => {
    it("matches as a spoken one does, and names the choice as the question gave it", () => {
        assert.deepEqual(pickedChoices(question(["Paris, France", "Lyon"]), "paris france"), ["Paris, France"]);
        assert.deepEqual(pickedChoices(question(["Red", "Blue"]), " RED. "), ["Red"]);
    });

    it("keeps a choice with a comma whole on a question that takes several", () => {
        const asked = question(["Paris, France", "Lyon", "Rome"], true);
        assert.deepEqual(pickedChoices(asked, "Paris, France"), ["Paris, France"]);
        assert.deepEqual(pickedChoices(asked, "lyon, paris, france"), ["Lyon", "Paris, France"]);
        assert.deepEqual(pickedChoices(asked, ["rome", "Lyon"]), ["Rome", "Lyon"]);
    });

    it("refuses what no choice is, what two are alike, a repeat, and several on a single question", () => {
        assert.isUndefined(pickedChoices(question(["Red", "Blue"]), "green"));
        assert.isUndefined(pickedChoices(question(["a-1", "a1"]), "A 1"));
        assert.isUndefined(pickedChoices(question(["Red", "Blue"], true), "red, RED"));
        assert.isUndefined(pickedChoices(question(["Red", "Blue"]), ["Red", "Blue"]));
        assert.isUndefined(pickedChoices(question(["Red", "Blue"], true), []));
    });
});

/**
 * Waits for every turn queued so far: a turn that opens nothing runs behind them.
 * @param assistant - The assistant.
 */
async function drained(assistant: ScriptedAssistant): Promise<void> {
    await assistant.controller.openConversation("no such conversation");
}

describe("a graph that loads after the assistant came up", () => {
    /**
     * A store with one conversation about `TWO_NODES`.
     * @returns The store and the conversation's id.
     */
    async function savedConversation(): Promise<{ store: MemoryStore; saved: string | undefined }> {
        const store = new MemoryStore();
        const first = new ScriptedAssistant(await assistantSession(TWO_NODES), { history: "memory", store });
        await first.say("hello");
        const saved = first.controller.getConversation()?.id;
        first.controller.dispose();
        return { store, saved };
    }

    it("reopens its saved conversation", async () => {
        const { store, saved } = await savedConversation();
        const empty = await assistantSession({ nodes: [], edges: [] });
        const assistant = new ScriptedAssistant(empty, { history: "memory", store });
        await assistant.controller.ready();
        assert.notStrictEqual(assistant.controller.getConversation()?.id, saved);

        await empty.data.addNodes(TWO_NODES.nodes);
        await drained(assistant);
        assert.strictEqual(assistant.controller.getConversation()?.id, saved);
    });

    it("leaves a conversation the reader has begun", async () => {
        const { store } = await savedConversation();
        const empty = await assistantSession({ nodes: [], edges: [] });
        const assistant = new ScriptedAssistant(empty, { history: "memory", store });
        await assistant.say("something else");
        const begun = assistant.controller.getConversation()?.id;

        await empty.data.addNodes(TWO_NODES.nodes);
        await drained(assistant);
        assert.strictEqual(assistant.controller.getConversation()?.id, begun);
    });

    it("leaves a new conversation the reader started before it loaded, and its next message lands there", async () => {
        const { store, saved } = await savedConversation();
        const empty = await assistantSession({ nodes: [], edges: [] });
        const assistant = new ScriptedAssistant(empty, { history: "memory", store });
        const started = (await assistant.controller.newConversation())?.id;

        await empty.data.addNodes(TWO_NODES.nodes);
        await drained(assistant);
        assert.strictEqual(assistant.controller.getConversation()?.id, started);

        await assistant.say("after the load");
        const open = assistant.controller.getConversation();
        assert.strictEqual(open?.id, started);
        assert.notStrictEqual(open?.id, saved);
        assert.isTrue(open?.messages.some((one) => one.role === "reader"));
    });
});

describe("an undone message", () => {
    /**
     * The newest reader message's `undone`.
     * @param assistant - The assistant.
     * @returns It.
     */
    function undoneOf(assistant: ScriptedAssistant): boolean | undefined {
        const reader = assistant.controller
            .getConversation()
            ?.messages.filter((one) => one.role === "reader")
            .at(-1);
        return reader?.role === "reader" ? reader.undone : undefined;
    }

    it("says so, through a later edit that drops its steps, and stops saying so when redone", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("paint it", [PAINT]);
        assert.isUndefined(undoneOf(assistant));

        await session.undo();
        await drained(assistant);
        assert.isTrue(undoneOf(assistant));

        await session.redo();
        await drained(assistant);
        assert.isUndefined(undoneOf(assistant));

        await session.undo();
        await session.data.addNodes([{ id: "later" }]);
        await drained(assistant);
        assert.isTrue(undoneOf(assistant));
    });

    /**
     * A painted conversation left for a new one, so another shows when the history moves.
     * @returns The session, the assistant, its store and the left conversation's id.
     */
    async function leftConversation(): Promise<{
        session: Awaited<ReturnType<typeof assistantSession>>;
        assistant: ScriptedAssistant;
        store: MemoryStore;
        left: string;
    }> {
        const session = await assistantSession(undefined, ON);
        const store = new MemoryStore();
        const assistant = new ScriptedAssistant(session, { history: "memory", store });
        await assistant.say("paint it", [PAINT]);
        const left = assistant.controller.getConversation()?.id ?? "";
        await assistant.controller.newConversation();
        return { session, assistant, store, left };
    }

    it("says so when reopened, undone while another conversation showed", async () => {
        const { session, assistant, left } = await leftConversation();
        await session.undo();
        await drained(assistant);
        await assistant.controller.openConversation(left);
        assert.isTrue(undoneOf(assistant));
    });

    it("says so when reopened after a later edit dropped its steps, and keeps its place", async () => {
        const { session, assistant, store, left } = await leftConversation();
        const before = (await store.load(left))?.updatedAt;
        await session.undo();
        await session.data.addNodes([{ id: "later" }]);
        await drained(assistant);
        assert.strictEqual((await store.load(left))?.updatedAt, before);

        await assistant.controller.openConversation(left);
        assert.isTrue(undoneOf(assistant));
    });

    it("stops saying so when reopened, redone while another conversation showed", async () => {
        const session = await assistantSession(undefined, ON);
        const assistant = new ScriptedAssistant(session, { history: "memory" });
        await assistant.say("paint it", [PAINT]);
        const left = assistant.controller.getConversation()?.id ?? "";
        await session.undo();
        await drained(assistant);
        await assistant.controller.newConversation();
        await session.redo();
        await drained(assistant);

        await assistant.controller.openConversation(left);
        assert.isUndefined(undoneOf(assistant));
    });
});

describe("a message bound to a selection", () => {
    it("encodes only the selection", async () => {
        const session = await assistantSession(undefined, ON);
        await session.selection.apply({ ids: ["a"] });
        const assistant = new ScriptedAssistant(session);
        assistant.engine.push(
            callsTurn([
                { tool: "style", args: { action: "encode", encode: { channel: "node.color", attribute: "type" } } },
            ]),
            textTurn("done"),
        );
        await assistant.controller.execute("size these", { scope: "selection" });

        const layers = session.styles.list().filter((layer) => layer.encode !== undefined);
        assert.deepEqual(
            layers.map((layer) => layer.selector),
            [{ match: "ids", nodes: ["a"] }],
        );
    });

    it("writes only the records it holds, and says how many it left", async () => {
        const session = await assistantSession(undefined, ON);
        await session.selection.apply({ ids: ["a"] });
        const assistant = new ScriptedAssistant(session);
        const records = [
            { id: "a", mark: 1 },
            { id: "b", mark: 1 },
        ];
        assistant.engine.push(
            callsTurn([{ tool: "edit_data", args: { action: "update_nodes", records } }]),
            textTurn("done"),
        );
        await assistant.controller.execute("mark these", { scope: "selection" });

        const marked = session.data.nodes().filter((node) => node.mark === 1);
        assert.deepEqual(
            marked.map((node) => node.id),
            ["a"],
        );
    });

    it("refuses what can only reach the whole graph", async () => {
        const session = await assistantSession(undefined, ON);
        await session.selection.apply({ ids: ["a"] });
        const before = session.status.counts.nodes;
        const assistant = new ScriptedAssistant(session, { gate: false });
        assistant.engine.push(callsTurn([{ tool: "edit_data", args: { action: "delete_all" } }]), textTurn("done"));
        await assistant.controller.execute("delete these", { scope: "selection" });

        assert.strictEqual(session.status.counts.nodes, before);
    });
});

describe("a saved request when its assistant goes", () => {
    it("is reported ended, so nothing keeps counting it", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory", approvals: "writes" });
        const held = await assistant.say("add f", [ADD_NODE]);
        assistant.controller.dispose();

        const ended = assistant.events.filter((event) => event.type === "ai-pending-resolved");
        assert.deepEqual(
            ended.map((event) => [event.id, event.code, event.params.reason]),
            [[held.result.params?.request, "AI_APPROVAL_STALE", "disposed"]],
        );
    });
});

describe("a switch of conversation", () => {
    it("leaves none of the last run's words on the status", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory" });
        await assistant.say("hello");
        assert.isNotEmpty(assistant.controller.getStatus().streamedText);

        await assistant.controller.newConversation();
        assert.isEmpty(assistant.controller.getStatus().streamedText ?? "");
    });
});

describe("new AiController", () => {
    it("refuses the settings only the generated tools honor, as enableAiControl does", async () => {
        const session = await assistantSession();
        for (const options of [{ tools: { webSearch: true } }, { approvals: "writes" }]) {
            assert.throws(
                () =>
                    new AiController({
                        provider: { name: "scripted" } as never,
                        commandRegistry: new CommandRegistry(),
                        graph: { getSession: () => session } as unknown as CommandContext["graph"],
                        ...options,
                    } as never),
                AiConfigError,
            );
        }
    });
});

describe("calledAlgorithm", () => {
    it("names what a call runs however the model spelled it", () => {
        for (const name of ["pagerank", "graphty:pagerank", "PageRank"]) {
            assert.strictEqual(calledAlgorithm("run_algorithm", { name })?.key, "pagerank", name);
        }

        assert.isUndefined(calledAlgorithm("style", { name: "pagerank" }));
        assert.isUndefined(calledAlgorithm("run_algorithm", { name: "no such thing" }));
    });
});
