/**
 * @file Approvals that survive a reload: a hold saves the message and its request together before
 * the host hears of it; a new controller on the saved conversation asks again (`replayed: true`)
 * and `getPendingApprovals` lists the request at once; answering it claims it first, so of two
 * controllers one runs it; after a reload the graph is checked by `dataKey`, else by fingerprint.
 * The reload is a memory store seeded from the record's exported JSON.
 */

import { assert, describe, it, vi } from "vitest";

import type { ConversationStoreChange } from "../../src/ai/conversation/Conversation";
import { readConversation, writeConversation } from "../../src/ai/conversation/formats";
import { MemoryStore } from "../../src/ai/conversation/MemoryStore";
import type { TurnRequest } from "../../src/ai/engine/types";
import type { AiApprovalRequestedEvent, AiEvent, AiPendingResolvedEvent } from "../../src/events";
import { assistantSession, ScriptedAssistant, textTurn } from "../helpers/assistant";

const ADD_F = { tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } };

/** The history setting of every assistant here. */
type History = { store: "memory"; dataKey?: string } | "memory";

/**
 * Hold an addition and save it: the exported JSON of the conversation waiting on it.
 * @param history - The history setting.
 * @returns The JSON and the request's id.
 */
async function heldRecord(history: History = "memory"): Promise<{ json: string; request: string }> {
    const store = new MemoryStore();
    const assistant = new ScriptedAssistant(await assistantSession(), { history, approvals: "writes", store });
    const { result } = await assistant.say("add f", [ADD_F]);
    assert.strictEqual(result.code, "AI_CONFIRMATION_NEEDED");
    const id = assistant.controller.getConversation()?.id ?? "";
    // The page goes: the request stays saved.
    assistant.controller.dispose();
    const record = await store.load(id);
    assert.exists(record);
    return { json: writeConversation(record), request: String(result.params?.request) };
}

/**
 * A new controller on a store seeded from saved JSON: what a reload opens.
 * @param json - The saved conversation.
 * @param history - The history setting.
 * @param store - The store; a new one when absent.
 * @returns The assistant, its store open.
 */
async function reopened(
    json: string,
    history: History = "memory",
    store = new MemoryStore(),
): Promise<{ assistant: ScriptedAssistant; store: MemoryStore }> {
    const read = readConversation(json);
    assert.isTrue(read.ok);
    if (read.ok && (await store.load(read.record.id)) === undefined) {
        await store.save(read.record);
    }

    const assistant = new ScriptedAssistant(await assistantSession(), { history, approvals: "writes", store });
    await assistant.controller.ready();
    return { assistant, store };
}

/**
 * The replayed requests an assistant was asked.
 * @param events - Its events.
 * @returns The events.
 */
function replays(events: readonly AiEvent[]): AiApprovalRequestedEvent[] {
    return events.filter(
        (event): event is AiApprovalRequestedEvent => event.type === "ai-approval-requested" && event.replayed,
    );
}

/**
 * The tool results a turn's request ends in.
 * @param request - The turn.
 * @returns Each result's call id and code.
 */
function lastResults(request: TurnRequest | undefined): string[] {
    const last = request?.messages.at(-1);
    assert.strictEqual(last?.role, "tool", "the request ends in tool results");
    return (last?.parts ?? []).flatMap((part) => (part.type === "tool-result" ? [`${part.callId}:${part.code}`] : []));
}

describe("approvals that survive a reload", () => {
    it("saves the held message and its request before the host is asked", async () => {
        class SpyStore extends MemoryStore {
            last: Awaited<ReturnType<MemoryStore["save"]>> | undefined;
            override async save(record: Parameters<MemoryStore["save"]>[0]): ReturnType<MemoryStore["save"]> {
                this.last = await super.save(record);
                return this.last;
            }
        }
        const store = new SpyStore();
        const assistant = new ScriptedAssistant(await assistantSession(), {
            history: "memory",
            approvals: "writes",
            store,
        });
        const atEvent: { pending: string[]; endsInCall: boolean }[] = [];
        const push = assistant.events.push.bind(assistant.events);
        assistant.events.push = (...events: AiEvent[]): number => {
            for (const event of events) {
                if (event.type === "ai-approval-requested") {
                    const last = store.last?.messages.at(-1);
                    atEvent.push({
                        pending: (store.last?.pending ?? []).map((entry) => entry.id),
                        endsInCall: last?.parts.some((part) => part.type === "tool-call") ?? false,
                    });
                }
            }

            return push(...events);
        };

        const { result } = await assistant.say("add f", [ADD_F]);

        const request = String(result.params?.request);
        assert.deepStrictEqual(atEvent, [{ pending: [request], endsInCall: true }]);
        const entry = store.last?.pending[0];
        assert.strictEqual(entry?.kind, "approval");
        if (entry?.kind === "approval") {
            assert.strictEqual(entry.gate, "policy");
            assert.deepStrictEqual(entry.graph, {
                dataKey: null,
                fingerprint: entry.graph.fingerprint,
                nodes: 5,
                edges: 5,
            });
            assert.deepStrictEqual(
                entry.calls.map((call) => call.command),
                ["edit_data"],
            );
        }
    });

    it("asks again after a reload, after enableAiControl resolves, and lists the request at once", async () => {
        const { json, request } = await heldRecord();
        const { assistant } = await reopened(json);

        // Listed as soon as the store is open; asked again in a later task.
        assert.deepStrictEqual(
            assistant.controller.getPendingApprovals().map((pending) => pending.id),
            [request],
        );
        assert.deepStrictEqual(assistant.controller.getStatus().pending, { approvals: 1, questions: 0 });
        assert.deepStrictEqual(replays(assistant.events), [], "not asked before a listener can be added");
        assert.deepStrictEqual(
            assistant.controller.getConversation()?.pending.map((pending) => pending.id),
            [request],
        );

        await vi.waitFor(() => {
            assert.lengthOf(replays(assistant.events), 1);
        });
        const [{ request: replayed }] = replays(assistant.events);
        assert.strictEqual(replayed.id, request);
        assert.strictEqual(replayed.gate, "policy");
        assert.deepStrictEqual(replayed.calls, [{ tool: "edit_data", arguments: ADD_F.args }]);
    });

    it("runs the approved calls from the saved messages alone and answers", async () => {
        const { json, request } = await heldRecord();
        const { assistant, store } = await reopened(json);
        assistant.engine.push(textTurn("added f"));

        const result = await assistant.controller.resolveAiApproval(request, { approve: true });

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.strictEqual(result.llmText, "added f");
        assert.exists(assistant.session.data.node("f"));
        const [sent] = assistant.engine.requests;
        assert.deepStrictEqual(lastResults(sent), ["t0-0:AI_COMPLETED"]);
        assert.isTrue(
            sent.messages.some((message) =>
                message.parts.some((part) => part.type === "text" && part.origin === "reader" && part.text === "add f"),
            ),
            "the reader's saved request is sent again",
        );
        assert.deepStrictEqual(assistant.controller.getPendingApprovals(), []);
        const ended = assistant.events.filter(
            (event): event is AiPendingResolvedEvent => event.type === "ai-pending-resolved",
        );
        assert.deepStrictEqual(
            ended.map((event) => [event.id, event.code]),
            [[request, "AI_COMPLETED"]],
        );
        const [saved] = await store.list();
        assert.deepStrictEqual(saved.pending, [], "the saved conversation no longer waits");
    });

    it("tells the model the graph changed after a reload, with both counts", async () => {
        const { json, request } = await heldRecord();
        const { assistant } = await reopened(json);
        await assistant.session.data.addNodes([{ id: "z" }]);
        assistant.engine.push(textTurn("the graph changed"));

        const result = await assistant.controller.resolveAiApproval(request, { approve: true });

        assert.strictEqual(result.code, "AI_APPROVAL_STALE");
        assert.deepStrictEqual(result.params, {
            request,
            reason: "graph-changed",
            nodes: 6,
            edges: 5,
            heldNodes: 5,
            heldEdges: 5,
        });
        assert.notExists(assistant.session.data.node("f"));
        assert.deepStrictEqual(lastResults(assistant.engine.requests[0]), ["t0-0:AI_APPROVAL_STALE"]);
    });

    it("checks the dataKey as well as the fingerprint when the host named the data", async () => {
        const { json, request } = await heldRecord({ store: "memory", dataKey: "sales-v1" });
        // Reopened by fingerprint: the same graph, under a newer name.
        const { assistant } = await reopened(json, { store: "memory", dataKey: "sales-v2" });
        assistant.engine.push(textTurn("ok"));

        const result = await assistant.controller.resolveAiApproval(request, { approve: true });

        assert.strictEqual(result.code, "AI_APPROVAL_STALE");
        assert.strictEqual(result.params?.reason, "graph-changed");
    });

    it("checks the fingerprint even when the dataKey is the same: the name may stand for edited data", async () => {
        const { json, request } = await heldRecord({ store: "memory", dataKey: "sales" });
        const { assistant } = await reopened(json, { store: "memory", dataKey: "sales" });
        await assistant.session.data.removeNodes(["e"]);
        assistant.engine.push(textTurn("the data changed"));

        const result = await assistant.controller.resolveAiApproval(request, { approve: true });

        assert.strictEqual(result.code, "AI_APPROVAL_STALE");
        assert.strictEqual(result.params?.reason, "graph-changed");
        assert.notExists(assistant.session.data.node("f"));
    });

    it("sends a call whose run was cut short (claimed, never saved) with a result, so the provider accepts it", async () => {
        const { json, request } = await heldRecord();
        const store = new MemoryStore();
        const { assistant: first } = await reopened(json, "memory", store);
        const conversation = first.controller.getConversation()?.id ?? "";
        // The tab claims the request and closes before its run saves anything.
        assert.exists(await store.claim(conversation, request, "closed-tab"));
        first.controller.dispose();

        const { assistant } = await reopened(json, "memory", store);
        assert.deepStrictEqual(assistant.controller.getPendingApprovals(), []);
        await assistant.say("count the nodes");

        const [sent] = assistant.engine.requests;
        const calls = sent.messages.flatMap((message) =>
            message.parts.flatMap((part) => (part.type === "tool-call" ? [part.callId] : [])),
        );
        assert.isNotEmpty(calls);
        for (const callId of calls) {
            const at = sent.messages.findIndex((message) =>
                message.parts.some((part) => part.type === "tool-call" && part.callId === callId),
            );
            const next = sent.messages[at + 1];
            assert.strictEqual(next?.role, "tool", "a call is followed at once by its result");
            const results = next.parts.filter((part) => part.type === "tool-result" && part.callId === callId);
            assert.lengthOf(results, 1);
            assert.strictEqual(results[0].type === "tool-result" ? results[0].code : "", "AI_TOOL_NOT_RUN");
        }
    });

    it("leaves a request another tab is running alone when a new message here supersedes it", async () => {
        const { json, request } = await heldRecord();
        const store = new MemoryStore();
        const { assistant } = await reopened(json, "memory", store);
        const conversation = assistant.controller.getConversation()?.id ?? "";
        // Another tab claimed it and is running it now.
        assert.exists(await store.claim(conversation, request, "other-tab"));

        await assistant.say("never mind");

        const saved = await store.load(conversation);
        const results = (saved?.messages ?? []).flatMap((message) =>
            message.parts.flatMap((part) => (part.type === "tool-result" && part.callId === "t0-0" ? [part.code] : [])),
        );
        assert.deepStrictEqual(results, [], "no closing result beside the one the other tab will write");
        assert.strictEqual(saved?.pending[0]?.claim, "other-tab");
    });

    it("keeps another tab's messages when a request closed here was copied before them", async () => {
        /** A memory store that tells its listeners when "another tab" wrote. */
        class SharedStore extends MemoryStore {
            readonly listeners = new Set<(change: ConversationStoreChange) => void>();
            override subscribe(listener: (change: ConversationStoreChange) => void): () => void {
                this.listeners.add(listener);
                return () => this.listeners.delete(listener);
            }
        }
        const { json } = await heldRecord();
        const store = new SharedStore();
        const { assistant } = await reopened(json, "memory", store);
        const conversation = assistant.controller.getConversation()?.id ?? "";
        // Another tab appends a message; this one hears of it and re-reads.
        const stored = await store.load(conversation);
        assert.exists(stored);
        await store.save({
            ...stored,
            messages: [
                ...stored.messages,
                {
                    id: "m_other",
                    role: "user",
                    parts: [{ type: "text", origin: "reader", text: "from the other tab" }],
                },
            ],
        });
        for (const listener of store.listeners) {
            listener({ conversationId: conversation });
        }

        // A new message here supersedes the request, whose conversation was copied before the append.
        await assistant.say("never mind");

        const saved = await store.load(conversation);
        const readerTexts = (saved?.messages ?? []).flatMap((message) =>
            message.parts.flatMap((part) => (part.type === "text" && part.origin === "reader" ? [part.text] : [])),
        );
        assert.deepStrictEqual(readerTexts, ["add f", "from the other tab", "never mind"]);
    });

    it("says the store failed, not that another tab answered, when a claim cannot be written", async () => {
        /** A store whose storage failed under it. */
        class FailingStore extends MemoryStore {
            override claim(): Promise<undefined> {
                return Promise.reject(new DOMException("not readable", "NotFoundError"));
            }
        }
        const { json, request } = await heldRecord();
        const { assistant } = await reopened(json, "memory", new FailingStore());

        const result = await assistant.controller.resolveAiApproval(request, { approve: true });

        assert.deepStrictEqual([result.code, result.params], ["AI_STORAGE_FAILED", { request }]);
        assert.notExists(assistant.session.data.node("f"));
        assert.deepStrictEqual(
            assistant.controller.getPendingApprovals().map((pending) => pending.id),
            [request],
            "the request stays open",
        );
    });

    it("runs a request two controllers answer once; the other hears it was resolved elsewhere", async () => {
        const { json, request } = await heldRecord();
        const store = new MemoryStore();
        const { assistant: one } = await reopened(json, "memory", store);
        const { assistant: two } = await reopened(json, "memory", store);
        one.engine.push(textTurn("added"));
        two.engine.push(textTurn("added"));

        const results = await Promise.all([
            one.controller.resolveAiApproval(request, { approve: true }),
            two.controller.resolveAiApproval(request, { approve: true }),
        ]);

        assert.deepStrictEqual(
            results.map((result) => [result.code, result.params?.reason]),
            [
                ["AI_COMPLETED", undefined],
                ["AI_APPROVAL_STALE", "resolved-elsewhere"],
            ],
        );
        assert.exists(one.session.data.node("f"));
        assert.notExists(two.session.data.node("f"), "the change ran once");
        assert.lengthOf(two.engine.requests, 0, "the loser asks the model nothing");
        assert.deepStrictEqual(two.controller.getPendingApprovals(), []);
    });

    it("leaves a request another controller claimed out of what a reload asks again", async () => {
        const { json, request } = await heldRecord();
        const store = new MemoryStore();
        const { assistant: one } = await reopened(json, "memory", store);
        const conversation = one.controller.getConversation()?.id ?? "";
        assert.exists(await store.claim(conversation, request, "another-tab"));

        const { assistant: two } = await reopened(json, "memory", store);

        assert.deepStrictEqual(two.controller.getPendingApprovals(), []);
    });

    for (const action of ["newConversation", "clearHistory"] as const) {
        it(`${action} ends the requests still waiting and says the open conversation changed`, async () => {
            const store = new MemoryStore();
            const assistant = new ScriptedAssistant(await assistantSession(), {
                history: "memory",
                approvals: "writes",
                store,
            });
            const { result } = await assistant.say("add f", [ADD_F]);
            const request = String(result.params?.request);
            const before = assistant.events.length;
            const old = assistant.controller.getConversation()?.id;

            await assistant.controller[action]();

            const after = assistant.events.slice(before);
            const resolved = after.filter(
                (event): event is AiPendingResolvedEvent => event.type === "ai-pending-resolved",
            );
            assert.deepStrictEqual(
                resolved.map((event) => [event.id, event.code, event.params.reason]),
                [[request, "AI_APPROVAL_STALE", "superseded"]],
            );
            assert.deepStrictEqual(assistant.controller.getPendingApprovals(), []);
            const open = assistant.controller.getConversation();
            const changed = after.filter((event) => event.type === "ai-conversation-changed");
            assert.notStrictEqual(open?.id, old, "a new conversation is open");
            assert.deepInclude(changed.at(-1), { type: "ai-conversation-changed", conversationId: open?.id });
            assert.deepStrictEqual(open?.messages, []);
            assert.deepStrictEqual(open?.pending, []);
            assert.notExists(assistant.session.data.node("f"), "the held change never ran");
        });
    }
});
