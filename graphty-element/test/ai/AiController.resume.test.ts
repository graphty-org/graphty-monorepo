/**
 * @file Approvals that survive a reload: a hold saves the message and its request together before
 * the host hears of it; a new controller on the saved conversation asks again (`replayed: true`)
 * and `getPendingApprovals` lists the request at once; answering it claims it first, so of two
 * controllers one runs it; after a reload the graph is checked by `dataKey`, else by fingerprint.
 * The reload is a memory store seeded from the record's exported JSON.
 */

import { assert, describe, it, vi } from "vitest";

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
        assert.deepStrictEqual(assistant.controller.getStatus().pending, { approvals: 1 });
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

    it("checks the dataKey, not the fingerprint, when the host named the data", async () => {
        const { json, request } = await heldRecord({ store: "memory", dataKey: "sales-v1" });
        // Reopened by fingerprint: the same graph, under a newer name.
        const { assistant } = await reopened(json, { store: "memory", dataKey: "sales-v2" });
        assistant.engine.push(textTurn("ok"));

        const result = await assistant.controller.resolveAiApproval(request, { approve: true });

        assert.strictEqual(result.code, "AI_APPROVAL_STALE");
        assert.strictEqual(result.params?.reason, "graph-changed");
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
});
