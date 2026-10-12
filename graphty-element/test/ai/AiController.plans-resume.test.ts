/**
 * @file A helper whose writing batch is held waits on the reader as the message's own approval
 * request (`agent` set), saved with the helper's conversation and, for a router's plan, the steps
 * still to run. After a reload (a memory store seeded from the saved record's JSON) the request is
 * asked again; the reader's decision continues the helper until it answers, its answer reaches the
 * main model, the plan's later steps run, and the message resolves with the main model's text.
 * Every ending event ends the helper and the plan with the request. Every case runs on the scripted
 * engine and on `LlmProviderEngine` over a `MockLlmProvider`.
 */

import { assert, describe, it, vi } from "vitest";

import type { AiAgentsSetting } from "../../src/ai/agents";
import { readConversation, writeConversation } from "../../src/ai/conversation/formats";
import { MemoryStore } from "../../src/ai/conversation/MemoryStore";
import type { TurnRequest } from "../../src/ai/engine/types";
import type { AiApprovalRequest, AiPendingResolvedEvent } from "../../src/events";
import { assistantSession } from "../helpers/assistant";
import {
    COUNTER,
    delegate,
    type Driver,
    fakeDriver,
    Harness,
    lastResults,
    mockDriver,
    STYLE_RED,
    STYLIST,
} from "./plans/driver";

/**
 * The approval requests a harness was asked, first-time and replayed.
 * @param harness - The harness.
 * @returns Them, in order.
 */
function asked(harness: Harness): { request: AiApprovalRequest; replayed: boolean }[] {
    return harness.events.flatMap((event) =>
        event.type === "ai-approval-requested" ? [{ request: event.request, replayed: event.replayed }] : [],
    );
}

/**
 * Hold the stylist's write and save it: the exported JSON of the conversation waiting on it.
 * @param driver - Makes the engine.
 * @param agents - The helpers and their router.
 * @returns The JSON, the request's id, and the requests the first page sent.
 */
async function heldRecord(
    driver: () => Driver,
    agents: AiAgentsSetting,
): Promise<{ json: string; request: string; sent: TurnRequest[] }> {
    const store = new MemoryStore();
    const harness = new Harness(
        await assistantSession(),
        driver(),
        { agents, approvals: "writes", history: "memory" },
        store,
    );
    const routed = !Array.isArray(agents) && "router" in agents;
    harness.driver.push(...(routed ? [] : [{ calls: [delegate("stylist", "Color the red team red.")] }]), {
        calls: [STYLE_RED],
    });

    const held = await harness.controller.execute("color the red team");

    assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED", JSON.stringify(held));
    const id = harness.controller.getConversation()?.id ?? "";
    // The page goes: the request stays saved.
    harness.controller.dispose();
    const record = await store.load(id);
    assert.exists(record);
    return { json: writeConversation(record), request: String(held.params?.request), sent: harness.driver.requests };
}

/**
 * A new controller on a store seeded from saved JSON: what a reload opens.
 * @param json - The saved conversation.
 * @param driver - Makes the engine.
 * @param agents - The helpers and their router.
 * @returns The harness, its store open.
 */
async function reopened(json: string, driver: () => Driver, agents: AiAgentsSetting): Promise<Harness> {
    const read = readConversation(json);
    assert.isTrue(read.ok);
    const store = new MemoryStore();
    if (read.ok) {
        await store.save(read.record);
    }

    const harness = new Harness(
        await assistantSession(),
        driver(),
        { agents, approvals: "writes", history: "memory" },
        store,
    );
    await harness.controller.ready();
    return harness;
}

/** A function router: the stylist, then the counter. */
const PLANNED: AiAgentsSetting = {
    roles: [STYLIST, COUNTER],
    router: () => ({ steps: [{ agents: ["stylist"] }, { agents: ["counter"] }] }),
};

describe.each([
    ["the scripted engine", fakeDriver],
    ["LlmProviderEngine over MockLlmProvider", mockDriver],
])("a helper held for approval on %s", (_name, driver) => {
    it("is saved with the helper's conversation, ends the message at once, and names the helper", async () => {
        const { json, request, sent } = await heldRecord(driver, [STYLIST]);

        assert.lengthOf(sent, 2, "the main model's hand-off and the helper's call; nothing answers the hold");
        const read = readConversation(json);
        assert.isTrue(read.ok);
        if (!read.ok) {
            return;
        }

        const [entry] = read.record.pending;
        assert.strictEqual(entry.kind, "approval");
        assert.strictEqual(entry.id, request);
        assert.strictEqual(entry.kind === "approval" ? entry.agent : undefined, "stylist");
        const refs = read.record.messages
            .flatMap((message) => message.parts)
            .filter((part) => part.type === "agent-ref");
        assert.lengthOf(refs, 1);
        const last = refs[0].type === "agent-ref" ? refs[0].messages.at(-1) : undefined;
        assert.strictEqual(last?.id, entry.messageId, "the helper's conversation ends in the held calls");
        assert.deepStrictEqual(
            last?.parts.map((part) => (part.type === "tool-call" ? part.command : part.type)),
            ["style"],
        );
    });

    it("asks again after a reload with the helper's name, and approving runs the helper, then the main", async () => {
        const { json, request } = await heldRecord(driver, [STYLIST]);
        const harness = await reopened(json, driver, [STYLIST]);
        const layers = harness.session.styles.list().length;

        assert.deepStrictEqual(
            harness.controller.getPendingApprovals().map((pending) => [pending.id, pending.agent]),
            [[request, "stylist"]],
        );
        await vi.waitFor(() => {
            assert.lengthOf(asked(harness), 1);
        });
        assert.deepStrictEqual(
            asked(harness).map(({ request: replayed, replayed: again }) => [replayed.id, replayed.agent, again]),
            [[request, "stylist", true]],
        );

        harness.driver.push({ text: "Colored the red team." }, { text: "The red team is red now." });
        const result = await harness.controller.resolveAiApproval(request, { approve: true });

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.strictEqual(result.llmText, "The red team is red now.");
        assert.strictEqual(harness.session.styles.list().length, layers + 1, "the approved change ran");
        const [helper, main] = harness.driver.requests;
        assert.include(helper.system, STYLIST.purpose);
        assert.deepStrictEqual(
            lastResults(helper).map((ran) => ran.code),
            ["AI_COMPLETED"],
        );
        assert.include(
            main.tools.map((tool) => tool.name),
            "delegate",
            "the second request is the main model's",
        );
        assert.strictEqual(lastResults(main)[0].content.data?.answer, "Colored the red team.");
        assert.lengthOf(harness.driver.requests, 2);
        assert.deepStrictEqual(harness.agentEvents(), ["ai-agent-start:stylist", "ai-agent-end:stylist"]);
        assert.deepStrictEqual(harness.controller.getPendingApprovals(), []);
        assert.deepStrictEqual(harness.controller.getConversation()?.pending, []);
    });

    it("runs a plan's remaining step after the helper, told what the helper answered", async () => {
        const { json, request } = await heldRecord(driver, PLANNED);
        const saved = readConversation(json);
        assert.deepStrictEqual(saved.ok ? saved.record.pending.map((entry) => entry.kind) : [], [
            "approval",
            "plan-step",
        ]);
        const harness = await reopened(json, driver, PLANNED);

        harness.driver.push({ text: "Colored a and b." }, { text: "2 red nodes." }, { text: "Two nodes are red." });
        const result = await harness.controller.resolveAiApproval(request, { approve: true });

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.strictEqual(result.llmText, "Two nodes are red.");
        assert.deepStrictEqual(harness.agentEvents(), [
            "ai-agent-start:stylist",
            "ai-agent-end:stylist",
            "ai-agent-start:counter",
            "ai-agent-end:counter",
        ]);
        const counter = harness.driver.requests[1];
        assert.include(counter.system, COUNTER.purpose);
        const task = counter.messages[0].parts.at(-1);
        assert.include(task?.type === "text" ? task.text : "", "Colored a and b.");
        assert.deepStrictEqual(harness.controller.getConversation()?.pending, [], "the plan step ended too");
    });

    it("gives the helper AI_APPROVAL_STALE when the graph changed, and its answer still reaches the main", async () => {
        const { json, request } = await heldRecord(driver, [STYLIST]);
        const harness = await reopened(json, driver, [STYLIST]);
        await harness.session.data.addNodes([{ id: "z" }]);
        const layers = harness.session.styles.list().length;

        harness.driver.push({ text: "The graph changed; nothing colored." }, { text: "Nothing changed." });
        const result = await harness.controller.resolveAiApproval(request, { approve: true });

        assert.strictEqual(result.llmText, "Nothing changed.");
        assert.strictEqual(harness.session.styles.list().length, layers);
        const [helper, main] = harness.driver.requests;
        const [stale] = lastResults(helper);
        assert.strictEqual(stale.code, "AI_APPROVAL_STALE");
        assert.include(JSON.stringify(stale.content), "graph-changed");
        assert.strictEqual(lastResults(main)[0].content.data?.answer, "The graph changed; nothing colored.");
    });

    it("approved on the same page, continues the helper and the main without a reload", async () => {
        const harness = new Harness(await assistantSession(), driver(), {
            agents: [STYLIST],
            approvals: "writes",
        });
        const layers = harness.session.styles.list().length;
        harness.driver.push({ calls: [delegate("stylist", "Color the red team red.")] }, { calls: [STYLE_RED] });
        const held = await harness.controller.execute("color the red team");
        assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED", JSON.stringify(held));
        assert.strictEqual(asked(harness)[0].request.agent, "stylist");

        harness.driver.push({ text: "Colored." }, { text: "Done." });
        const result = await harness.controller.resolveAiApproval(String(held.params?.request), { approve: true });

        assert.strictEqual(result.llmText, "Done.", JSON.stringify(result));
        assert.strictEqual(harness.session.styles.list().length, layers + 1);
        assert.strictEqual(lastResults(harness.driver.requests[3])[0].content.data?.answer, "Colored.");
    });

    it("a cancel ends the helper and the plan with AI_CANCELLED and one ai-pending-resolved", async () => {
        const store = new MemoryStore();
        const harness = new Harness(
            await assistantSession(),
            driver(),
            { agents: PLANNED, approvals: "writes", history: "memory" },
            store,
        );
        harness.driver.push({ calls: [STYLE_RED] });
        const held = await harness.controller.execute("color the red team");
        const request = String(held.params?.request);

        harness.controller.cancel();
        const late = await harness.controller.resolveAiApproval(request, { approve: true });

        assert.strictEqual(late.code, "AI_APPROVAL_STALE");
        const ended = harness.events.filter(
            (event): event is AiPendingResolvedEvent => event.type === "ai-pending-resolved",
        );
        assert.deepStrictEqual(
            ended.map((event) => [event.id, event.code]),
            [[request, "AI_CANCELLED"]],
        );
        const record = await store.load(harness.controller.getConversation()?.id ?? "");
        assert.deepStrictEqual(record?.pending, [], "the request and the plan step are gone");
        const results = (record?.messages ?? []).flatMap((message) =>
            message.parts.flatMap((part) =>
                part.type === "tool-result" ? [`${String(part.params.tool)}:${part.code}`] : [],
            ),
        );
        assert.deepStrictEqual(results, ["delegate:AI_CANCELLED"], "the hand-off answered as cancelled");
        assert.lengthOf(harness.driver.requests, 1, "nothing ran after the hold");
    });
});
