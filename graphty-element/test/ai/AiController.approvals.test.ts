/**
 * @file Approval policies and messages that continue after a decision: the host's `approvals`
 * setting holds or refuses a batch before any call runs; `resolveAiApproval` continues the held
 * message (the approved calls join its undo step, a denial reaches the model) and resolves with its
 * final result; a new message, a cancel and an undo each end a waiting request.
 */

import { assert, describe, it } from "vitest";

import type { AiToolCallFacts } from "../../src/ai/AiController";
import type { TurnRequest } from "../../src/ai/engine/types";
import type { AiEvent, AiPendingResolvedEvent } from "../../src/events";
import { assistantSession, digest, ScriptedAssistant, textTurn } from "../helpers/assistant";

const ADD_F = { tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } };
const COUNT = { tool: "query", args: { action: "count", where: "data.type == 'server'" } };
const STYLE = {
    tool: "style",
    args: { action: "add", where: "data.type == 'server'", values: { "node.color": "red" } },
};

/**
 * The approval request a message made.
 * @param events - The message's events.
 * @returns The request's id.
 */
function requestOf(events: readonly AiEvent[]): string {
    const event = events.find((e) => e.type === "ai-approval-requested");
    assert.exists(event, "an approval was requested");
    return event.type === "ai-approval-requested" ? event.request.id : "";
}

/**
 * The ends of waiting requests among some events.
 * @param events - The events.
 * @returns The `ai-pending-resolved` events.
 */
function ended(events: readonly AiEvent[]): AiPendingResolvedEvent[] {
    return events.filter((event): event is AiPendingResolvedEvent => event.type === "ai-pending-resolved");
}

/**
 * The tool results a turn's request ends in.
 * @param request - The turn.
 * @returns Each result's call id, code and params.
 */
function lastResults(request: TurnRequest | undefined): { callId: string; code: string; params: unknown }[] {
    const last = request?.messages.at(-1);
    assert.strictEqual(last?.role, "tool", "the request ends in tool results");
    return (last?.parts ?? []).flatMap((part) =>
        part.type === "tool-result" ? [{ callId: part.callId, code: part.code, params: part.params }] : [],
    );
}

describe("approval policies decide before anything runs", () => {
    it('"writes" holds a write batch with nothing run, and lets reads run', async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { approvals: "writes" });
        const before = await digest(session);
        const steps = session.history.position;

        const { result, events } = await assistant.say("count, then add f", [COUNT], [COUNT, ADD_F]);

        assert.strictEqual(result.code, "AI_CONFIRMATION_NEEDED");
        assert.strictEqual(result.params?.gate, "policy");
        const started = events.flatMap((event) => (event.type === "ai-stream-tool-call" ? [event.name] : []));
        assert.deepStrictEqual(started, ["query"], "the first read ran; nothing of the held batch did");
        assert.strictEqual(await digest(session), before);
        assert.strictEqual(session.history.position, steps);
        const [request] = events.flatMap((event) => (event.type === "ai-approval-requested" ? [event.request] : []));
        assert.strictEqual(request.gate, "policy");
        assert.deepStrictEqual(request.preview, {});
        assert.isString(request.messageId);
        assert.isString(request.createdAt);
        assert.deepStrictEqual(assistant.controller.getStatus().pending, { approvals: 1 });
    });

    it("{ ask } holds only the batches that call the named tools", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { approvals: { ask: ["style"] } });
        const layers = session.styles.list().length;

        const added = await assistant.say("add f", [ADD_F]);
        assert.strictEqual(added.result.code, "AI_COMPLETED");
        assert.exists(session.data.node("f"));

        const styled = await assistant.say("color the servers", [STYLE]);
        assert.strictEqual(styled.result.code, "AI_CONFIRMATION_NEEDED");
        assert.strictEqual(styled.result.params?.gate, "policy");
        assert.strictEqual(session.styles.list().length, layers);
    });

    it("a deny refuses the whole batch with AI_TOOL_DENIED_BY_POLICY and runs nothing", async () => {
        const session = await assistantSession();
        const seen: AiToolCallFacts[] = [];
        const assistant = new ScriptedAssistant(session, {
            approvals: {
                policy: (call) => {
                    seen.push(call);
                    return call.command === "edit_data" ? "deny" : "allow";
                },
            },
        });
        const before = await digest(session);

        const { result, events } = await assistant.say("count and add f", [COUNT, ADD_F]);

        assert.strictEqual(result.code, "AI_TOOL_DENIED_BY_POLICY");
        assert.strictEqual(result.params?.tool, "edit_data");
        assert.strictEqual(await digest(session), before);
        assert.isFalse(events.some((event) => event.type === "ai-stream-tool-call"));
        assert.isFalse(events.some((event) => event.type === "ai-approval-requested"));
        assert.deepStrictEqual(
            assistant.lastResults().map((read) => read.code),
            ["AI_TOOL_NOT_RUN", "AI_TOOL_DENIED_BY_POLICY"],
        );
        assert.deepInclude(seen[1], { command: "edit_data", action: "add_nodes", effect: "write" });
        assert.deepStrictEqual(seen[0], {
            command: "query",
            action: "count",
            arguments: { where: "data.type == 'server'" },
            effect: "read",
        });
    });
});

describe("a decision continues the message", () => {
    it("approve runs the calls in the message's undo step, shows the model their results, and resolves with its answer", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { approvals: { ask: ["style"] } });
        const steps = session.history.position;
        const layers = session.styles.list().length;
        const { events } = await assistant.say("add f and color the servers", [ADD_F], [STYLE]);
        assert.strictEqual(session.history.position - steps, 1, "the add ran before the hold");
        const id = requestOf(events);

        assistant.engine.push(textTurn("Added f and colored the servers."));
        const start = assistant.events.length;
        const approved = await assistant.controller.resolveAiApproval(id, { approve: true });

        assert.strictEqual(approved.code, "AI_COMPLETED");
        assert.strictEqual(approved.llmText, "Added f and colored the servers.");
        assert.strictEqual(session.styles.list().length, layers + 1);
        assert.strictEqual(session.history.position - steps, 1, "one undo step for the whole message");
        assert.strictEqual(session.history.steps.at(-1)?.provenance.via, "assistant");

        const results = lastResults(assistant.engine.requests.at(-1));
        assert.deepStrictEqual(
            results.map((part) => part.code),
            ["AI_COMPLETED"],
        );
        const later = assistant.events.slice(start);
        assert.deepInclude(ended(later)[0], { id, kind: "approval", code: "AI_COMPLETED" });
        const complete = later.filter((event) => event.type === "ai-command-complete");
        assert.strictEqual(complete.length, 1, "ai-command-complete fires again for the continuation");
        assert.isUndefined(assistant.controller.getStatus().pending);

        await session.undo();
        assert.notExists(session.data.node("f"), "one undo takes the whole message back");
        assert.strictEqual(session.styles.list().length, layers);
    });

    it("deny reaches the model as AI_APPROVAL_DENIED and resolves with its answer", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { approvals: "writes" });
        const before = await digest(session);
        const { events } = await assistant.say("add f", [ADD_F]);

        assistant.engine.push(textTurn("Left the graph as it was."));
        const denied = await assistant.controller.resolveAiApproval(requestOf(events), { approve: false });

        assert.strictEqual(denied.code, "AI_APPROVAL_DENIED");
        assert.strictEqual(denied.llmText, "Left the graph as it was.");
        assert.strictEqual(await digest(session), before);
        const [result] = lastResults(assistant.engine.requests.at(-1));
        assert.strictEqual(result.code, "AI_APPROVAL_DENIED");
    });

    it("tells the model a request answered after the graph changed is stale", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { approvals: "writes" });
        const { events } = await assistant.say("add f", [ADD_F]);
        await session.data.updateNodes([{ id: "a", values: { team: "moved" } }]);

        const stale = await assistant.controller.resolveAiApproval(requestOf(events), { approve: true });

        assert.strictEqual(stale.code, "AI_APPROVAL_STALE");
        assert.notExists(session.data.node("f"));
        const [result] = lastResults(assistant.engine.requests.at(-1));
        assert.deepStrictEqual(
            [result.code, (result.params as { reason: string }).reason],
            ["AI_APPROVAL_STALE", "graph-changed"],
        );
    });

    it("runs edited arguments as edited, and runs nothing when they are invalid", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { approvals: "writes" });
        const first = await assistant.say("add f", [ADD_F]);
        const edited = await assistant.controller.resolveAiApproval(requestOf(first.events), {
            approve: true,
            calls: [{ arguments: { action: "add_nodes", records: [{ id: "g" }] } }],
        });
        assert.strictEqual(edited.code, "AI_COMPLETED");
        assert.exists(session.data.node("g"));
        assert.notExists(session.data.node("f"));

        const before = await digest(session);
        const second = await assistant.say("add f", [ADD_F]);
        const invalid = await assistant.controller.resolveAiApproval(requestOf(second.events), {
            approve: true,
            calls: [{ arguments: { action: "add_nodes", records: 7 } }],
        });
        assert.strictEqual(invalid.code, "AI_TOOL_INVALID_ARGUMENTS");
        assert.strictEqual(await digest(session), before);
    });
});

describe("a waiting request ends only on an event", () => {
    it("a new message supersedes it, and the held message ends without another model turn", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { approvals: "writes", history: "memory" });
        const { events } = await assistant.say("add f", [ADD_F]);
        const id = requestOf(events);
        const turns = assistant.engine.requests.length;

        const next = await assistant.say("never mind, count the servers");

        assert.strictEqual(assistant.engine.requests.length - turns, 1, "only the new message's turn");
        assert.deepInclude(ended(next.events)[0], { id, code: "AI_APPROVAL_STALE" });
        assert.strictEqual(ended(next.events)[0].params.reason, "superseded");
        const answered = assistant.engine.requests
            .at(-1)
            ?.messages.flatMap((message) => message.parts)
            .find((part) => part.type === "tool-result");
        assert.strictEqual(answered?.type === "tool-result" ? answered.params.reason : "", "superseded");

        const late = await assistant.controller.resolveAiApproval(id, { approve: true });
        assert.strictEqual(late.code, "AI_APPROVAL_STALE");
        assert.strictEqual(late.params?.reason, "expired");
        assert.notExists(session.data.node("f"));
    });

    it("a cancel ends it with AI_CANCELLED", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { approvals: "writes" });
        const { events } = await assistant.say("add f", [ADD_F]);
        const id = requestOf(events);
        const start = assistant.events.length;

        assistant.controller.cancel();

        assert.deepInclude(ended(assistant.events.slice(start))[0], { id, code: "AI_CANCELLED" });
        assert.isUndefined(assistant.controller.getStatus().pending);
        const late = await assistant.controller.resolveAiApproval(id, { approve: true });
        assert.strictEqual(late.code, "AI_APPROVAL_STALE");
    });

    it("an undo of the message's step ends it with AI_UNDONE", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { approvals: { ask: ["style"] } });
        const { events } = await assistant.say("add f and color the servers", [ADD_F], [STYLE]);
        const id = requestOf(events);
        const start = assistant.events.length;

        await session.undo();

        assert.deepInclude(ended(assistant.events.slice(start))[0], { id, code: "AI_UNDONE" });
        const late = await assistant.controller.resolveAiApproval(id, { approve: true });
        assert.strictEqual(late.code, "AI_APPROVAL_STALE");
        assert.notExists(session.data.node("f"));
    });

    it("leaves a waiting message out of the queue: the next message runs while it waits", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { approvals: { ask: ["style"] } });
        await assistant.say("color the servers", [STYLE]);
        const next = await assistant.say("add f", [ADD_F]);
        assert.strictEqual(next.result.code, "AI_COMPLETED");
        assert.exists(session.data.node("f"));
    });
});
