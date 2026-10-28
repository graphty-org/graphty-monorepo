/**
 * @file Conversations that remember: with `history: "memory"` the assistant keeps one conversation
 * across messages and saves it at the end of each; with the default (`"none"`) every message
 * starts a new conversation, exactly as before.
 */

import { assert, describe, expect, it, vi } from "vitest";

import { readConversation } from "../../src/ai/conversation/formats";
import { MemoryStore } from "../../src/ai/conversation/MemoryStore";
import type { AiConversationMessage } from "../../src/ai/conversation/snapshot";
import type { TurnRequest } from "../../src/ai/engine/types";
import { assistantSession, ScriptedAssistant, textTurn } from "../helpers/assistant";

/**
 * What a turn sent, without the tools' schemas: the instructions, the messages and the tool names.
 * @param request - The turn.
 * @returns The comparable part.
 */
function sent(request: TurnRequest | undefined): unknown {
    return request && { ...request, tools: request.tools.map((tool) => tool.name) };
}

/**
 * The reader's and the model's text a turn sent, in order.
 * @param request - The turn.
 * @returns Each text part, with its origin.
 */
function texts(request: TurnRequest | undefined): string[] {
    return (request?.messages ?? []).flatMap((message) =>
        message.parts.flatMap((part) => (part.type === "text" ? [`${part.origin}:${part.text.slice(0, 40)}`] : [])),
    );
}

const ADD_NODE = { tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } };

describe("AiController history", () => {
    it("sends the earlier exchange with the next message when it remembers", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory" });
        await assistant.say("add a node", [ADD_NODE]);
        await assistant.say("now another");

        const second = assistant.engine.requests.at(-1);
        const shown = texts(second).filter((text) => !text.startsWith("graph-data:"));
        assert.deepStrictEqual(shown, ["reader:add a node", "model:done", "reader:now another"]);
        assert.isTrue(
            second?.messages.some((message) =>
                message.parts.some((part) => part.type === "tool-call" && part.command === "edit_data"),
            ),
            "the first message's call is in the second's request",
        );
        // Each message carries a fresh facts block; the model is shown only the newest.
        assert.strictEqual(texts(second).filter((text) => text.startsWith("graph-data:")).length, 1);
        assert.strictEqual(second?.messages.at(-1)?.parts[0]?.origin, "graph-data");
    });

    it("leaves the default exactly as it was: one conversation per message, no history event", async () => {
        const assistant = new ScriptedAssistant(await assistantSession());
        const first = await assistant.say("add a node", [ADD_NODE]);
        const second = await assistant.say("now another");

        expect(sent(assistant.engine.requests[0])).toMatchSnapshot();
        expect(sent(assistant.engine.requests.at(-1))).toMatchSnapshot();
        const types = new Set([...first.events, ...second.events].map((event) => event.type));
        assert.isFalse(types.has("ai-conversation-changed"));
        assert.strictEqual(second.result.code, "AI_COMPLETED");
        assert.isNull(assistant.controller.getConversation());
        assert.deepStrictEqual(await assistant.controller.listConversations(), []);
    });

    it("gives a snapshot of what the reader and the model said, without graphty's own text", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory" });
        const { events } = await assistant.say("add a node", [ADD_NODE]);

        const snapshot = assistant.controller.getConversation();
        assert.isNotNull(snapshot);
        assert.deepStrictEqual(
            snapshot?.messages.map((message) => [message.role, message.text]),
            [
                ["reader", "add a node"],
                ["assistant", ""],
                ["assistant", "done"],
            ],
        );
        const [, withCall] = snapshot?.messages ?? [];
        assert.deepStrictEqual(withCall?.role === "assistant" ? withCall.calls : [], [
            { command: "edit_data", arguments: ADD_NODE.args, code: "AI_COMPLETED", params: {} },
        ]);
        const json = JSON.stringify(snapshot);
        const facts = assistant.engine.requests[0].messages[0].parts[0];
        assert.strictEqual(facts.origin, "graph-data");
        assert.notInclude(json, facts.type === "text" ? facts.text.slice(0, 60) : "?");
        assert.notInclude(json, "graph-data");
        assert.notInclude(json, assistant.engine.requests[0].system.slice(0, 60));
        assert.include(
            events.map((event) => event.type),
            "ai-conversation-changed",
        );
    });

    it("exports the conversation as format 1, and lists nothing after the history is cleared", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory" });
        await assistant.say("add a node", [ADD_NODE]);
        const id = assistant.controller.getConversation()?.id ?? "";

        const exported = await assistant.controller.exportConversation(id);
        const read = readConversation(exported ?? "");
        assert.isTrue(read.ok, JSON.stringify(read));
        assert.strictEqual(read.ok && read.record.id, id);
        assert.deepStrictEqual(
            (await assistant.controller.listConversations()).map((summary) => summary.id),
            [id],
        );

        await assistant.controller.clearHistory();
        assert.deepStrictEqual(await assistant.controller.listConversations({ allKeys: true }), []);
        assert.deepStrictEqual(assistant.controller.getConversation()?.messages, []);
    });

    it("opens, starts and deletes conversations, and sends into the one named", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory" });
        await assistant.say("first");
        const first = assistant.controller.getConversation()?.id ?? "";
        const fresh = await assistant.controller.newConversation();
        assert.notStrictEqual(fresh?.id, first);
        await assistant.say("second");
        assert.strictEqual((await assistant.controller.listConversations()).length, 2);

        await assistant.sayInto(first, "back to the first");
        assert.strictEqual(assistant.controller.getConversation()?.id, first);
        assert.deepStrictEqual(
            texts(assistant.engine.requests.at(-1)).filter((text) => text.startsWith("reader:")),
            ["reader:first", "reader:back to the first"],
        );

        assert.strictEqual((await assistant.controller.openConversation(fresh?.id ?? ""))?.id, fresh?.id);
        assert.isNull(await assistant.controller.openConversation("nope"));
        await assistant.controller.deleteConversation(first);
        assert.deepStrictEqual(
            (await assistant.controller.listConversations()).map((summary) => summary.id),
            [fresh?.id],
        );
    });

    it("resolves an unknown conversation, or any under the default, as unavailable", async () => {
        const remembering = new ScriptedAssistant(await assistantSession(), { history: "memory" });
        const forgetful = new ScriptedAssistant(await assistantSession());
        for (const assistant of [remembering, forgetful]) {
            const result = await assistant.controller.execute("hello", { conversation: "nope" });
            assert.strictEqual(result.code, "AI_HISTORY_UNAVAILABLE");
            assert.deepStrictEqual(result.params, { reason: "unknown-conversation" });
            assert.strictEqual(assistant.engine.requests.length, 0);
        }
    });

    it("shows the reader's words while the message runs, and how a failed one ended", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory" });
        let during: readonly AiConversationMessage[] = [];
        assistant.engine.push(() => {
            during = assistant.controller.getConversation()?.messages ?? [];
            throw new Error("the provider is down");
        });

        const result = await assistant.controller.execute("count the nodes");

        assert.isFalse(result.success);
        assert.deepStrictEqual(
            during.map((message) => [message.role, message.text]),
            [["reader", "count the nodes"]],
        );
        const after = assistant.controller.getConversation()?.messages ?? [];
        assert.deepStrictEqual(
            after.map((message) => message.role),
            ["reader", "assistant"],
        );
        const ended = after[1];
        assert.deepStrictEqual(ended.role === "assistant" ? ended.outcome : undefined, {
            code: result.code ?? "",
            params: result.params ?? {},
        });

        // The next message is sent with the failed one, as text the provider accepts.
        assistant.engine.push(textTurn("there are five"));
        await assistant.controller.execute("try again");
        const sent = assistant.engine.requests.at(-1);
        assert.deepStrictEqual(
            sent?.messages.map((message) => message.role),
            ["user", "assistant", "user"],
        );
        assert.include(JSON.stringify(sent?.messages[1]), result.code ?? "?");
    });

    it('records a spoken message as via "voice", and a typed one as "text"', async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory" });
        assistant.engine.push(textTurn("ok"), textTurn("ok"));
        await assistant.controller.execute("color the servers red", { via: "voice" });
        await assistant.controller.execute("thanks");

        const readers = (assistant.controller.getConversation()?.messages ?? []).flatMap((message) =>
            message.role === "reader" ? [[message.text, message.via]] : [],
        );
        assert.deepStrictEqual(readers, [
            ["color the servers red", "voice"],
            ["thanks", "text"],
        ]);
    });

    it("ends a waiting request in the conversation it belongs to when the reader switches away", async () => {
        const store = new MemoryStore();
        const assistant = new ScriptedAssistant(await assistantSession(), {
            history: "memory",
            approvals: "writes",
            store,
        });
        await assistant.say("hello");
        const first = assistant.controller.getConversation()?.id ?? "";
        await assistant.controller.newConversation();
        const held = await assistant.say("add f", [ADD_NODE]);
        assert.strictEqual(held.result.code, "AI_CONFIRMATION_NEEDED");
        const second = assistant.controller.getConversation()?.id ?? "";

        await assistant.sayInto(first, "back to the first");

        const saved = await store.load(second);
        assert.deepStrictEqual(saved?.pending, [], "the switched-away conversation waits on nothing");
        const last = saved?.messages.at(-1);
        assert.strictEqual(last?.role, "tool");
        assert.deepStrictEqual(
            last?.parts.map((part) => (part.type === "tool-result" ? [part.code, part.params.reason] : [])),
            [["AI_APPROVAL_STALE", "superseded"]],
        );
        assert.deepStrictEqual(assistant.controller.getPendingApprovals(), []);
        assert.notExists(assistant.session.data.node("f"));
    });

    it("asks again about a saved request of the conversation it opens, and runs it on approval", async () => {
        const store = new MemoryStore();
        const other = new ScriptedAssistant(await assistantSession(), {
            history: "memory",
            approvals: "writes",
            store,
        });
        const held = await other.say("add f", [ADD_NODE]);
        const request = String(held.result.params?.request);
        const waiting = other.controller.getConversation()?.id ?? "";
        other.controller.dispose();

        const assistant = new ScriptedAssistant(await assistantSession(), {
            history: { store: "memory", key: "elsewhere" },
            approvals: "writes",
            store,
        });
        await assistant.controller.ready();
        const opened = await assistant.controller.openConversation(waiting);

        assert.deepStrictEqual(
            opened?.pending.map((pending) => pending.id),
            [request],
        );
        assert.deepStrictEqual(
            assistant.controller.getPendingApprovals().map((pending) => pending.id),
            [request],
        );
        assistant.engine.push(textTurn("added f"));
        const result = await assistant.controller.resolveAiApproval(request, { approve: true });
        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.exists(assistant.session.data.node("f"));
    });

    it("gives every message an id no other controller gives, also after a reload", async () => {
        const ids: string[] = [];
        for (let load = 0; load < 2; load++) {
            // A reload: the module is evaluated afresh.
            vi.resetModules();
            const { ScriptedAssistant: Fresh, assistantSession: freshSession } = await import("../helpers/assistant");
            const session = await freshSession();
            await new Fresh(session).say("add a node", [ADD_NODE]);
            ids.push(...session.history.steps.flatMap((step) => step.provenance.message ?? []));
        }

        assert.strictEqual(ids.length, 2);
        assert.notStrictEqual(ids[0], ids[1]);
    });
});
