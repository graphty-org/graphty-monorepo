/**
 * @file A function router's plan runs step by step as hand-offs of graphty's own, each step told
 * what the steps before it answered, at most `MAX_ASSISTANT_TOOL_TURNS` steps; a plan naming no
 * helper fails before anything is sent. With `confirmPlans`, every hand-off waits for the reader's
 * approval (gate `"plan"`), and a denial reaches the main model as `AI_APPROVAL_DENIED`. Every case
 * runs on the scripted engine and on `LlmProviderEngine` over a `MockLlmProvider`.
 */

import { assert, describe, it } from "vitest";

import type { AiPlan } from "../../../src/ai/agents";
import type { TurnRequest } from "../../../src/ai/engine/types";
import { MAX_ASSISTANT_TOOL_TURNS } from "../../../src/ai/runConversation";
import type { AiApprovalRequest } from "../../../src/events";
import { assistantSession } from "../../helpers/assistant";
import { COUNTER, delegate, fakeDriver, Harness, lastResults, mockDriver, STYLE_RED, STYLIST } from "./driver";

/**
 * The text of a helper's task: the last part of its first message.
 * @param request - The helper's first request.
 * @returns The task.
 */
function taskOf(request: TurnRequest): string {
    const part = request.messages[0].parts.at(-1);
    return part?.type === "text" ? part.text : "";
}

/**
 * A function router that always returns one plan.
 * @param plan - The plan.
 * @returns The helpers' setting.
 */
function planned(plan: AiPlan): { roles: (typeof COUNTER)[]; router: () => AiPlan } {
    return { roles: [COUNTER, STYLIST], router: () => plan };
}

/**
 * The approval requests a harness was asked.
 * @param harness - The harness.
 * @returns Them, in order.
 */
function approvals(harness: Harness): AiApprovalRequest[] {
    return harness.events.flatMap((event) => (event.type === "ai-approval-requested" ? [event.request] : []));
}

describe.each([
    ["the scripted engine", fakeDriver],
    ["LlmProviderEngine over MockLlmProvider", mockDriver],
])("a function router's plan on %s", (_name, driver) => {
    it("runs step 2 after step 1, with step 1's answer in its task", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), {
            agents: planned({ steps: [{ agents: ["counter"] }, { agents: ["stylist"] }] }),
        });
        harness.driver.push(
            { text: "The red team is a and b." },
            { calls: [STYLE_RED] },
            { text: "Colored." },
            { text: "Colored the red team." },
        );

        const result = await harness.controller.execute("color the red team");

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.strictEqual(result.llmText, "Colored the red team.");
        assert.deepStrictEqual(harness.agentEvents(), [
            "ai-agent-start:counter",
            "ai-agent-end:counter",
            "ai-agent-start:stylist",
            "ai-agent-end:stylist",
        ]);
        const [counter, stylist] = harness.driver.requests;
        assert.include(counter.system, COUNTER.purpose);
        assert.include(stylist.system, STYLIST.purpose);
        assert.include(taskOf(stylist), "color the red team");
        assert.include(taskOf(stylist), "The red team is a and b.");
        assert.notInclude(taskOf(counter), "reported");
    });

    it("cuts a plan of nine steps to the limit", async () => {
        const session = await assistantSession();
        const steps = Array.from({ length: 9 }, () => ({ agents: ["counter"] }));
        const harness = new Harness(session, driver(), { agents: planned({ steps }) });
        harness.driver.push(...steps.map(() => ({ text: "Counted." })), { text: "Done." });

        await harness.controller.execute("count, over and over");

        const starts = harness.agentEvents().filter((event) => event.startsWith("ai-agent-start"));
        assert.lengthOf(starts, MAX_ASSISTANT_TOOL_TURNS);
    });

    it("a plan naming an unknown helper resolves AI_CONFIG_INVALID and sends nothing", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), {
            agents: planned({ steps: [{ agents: ["counter", "ghost"] }] }),
        });

        const result = await harness.controller.execute("count");

        assert.strictEqual(result.code, "AI_CONFIG_INVALID");
        assert.deepStrictEqual(result.params, { agent: "ghost", field: "router", reason: "unknown-agent" });
        assert.lengthOf(harness.driver.requests, 0);
        assert.deepStrictEqual(harness.agentEvents(), []);
    });
});

describe.each([
    ["the scripted engine", fakeDriver],
    ["LlmProviderEngine over MockLlmProvider", mockDriver],
])("confirmPlans on %s", (_name, driver) => {
    it("holds a step as one request, and nothing runs until it is approved", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), {
            agents: { ...planned({ steps: [{ agents: ["counter", "stylist"] }] }), confirmPlans: true },
        });

        const held = await harness.controller.execute("count the red team");

        assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED", JSON.stringify(held));
        assert.strictEqual(held.params?.gate, "plan");
        assert.lengthOf(harness.driver.requests, 0, "no model turn, no helper");
        const [request] = approvals(harness);
        assert.strictEqual(request.gate, "plan");
        assert.deepStrictEqual(
            request.calls.map((call) => [call.tool, call.arguments.agent]),
            [
                ["delegate", "counter"],
                ["delegate", "stylist"],
            ],
        );

        harness.driver.push({ text: "a and b." }, { text: "Nothing to color." }, { text: "The red team is a and b." });
        const result = await harness.controller.resolveAiApproval(request.id, { approve: true });

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.strictEqual(result.llmText, "The red team is a and b.");
        assert.deepStrictEqual(harness.agentEvents().slice(0, 2), ["ai-agent-start:counter", "ai-agent-start:stylist"]);
        assert.lengthOf(harness.driver.requests, 3);
        const ids = harness.driver.requests[2].messages.flatMap((message) =>
            message.parts.flatMap((part) => (part.type === "tool-call" ? [part.callId] : [])),
        );
        assert.lengthOf(new Set(ids), 2, "each hand-off has its own call id");
    });

    it("each later step is asked about after the one before it ran", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), {
            agents: { ...planned({ steps: [{ agents: ["counter"] }, { agents: ["stylist"] }] }), confirmPlans: true },
        });

        await harness.controller.execute("color the red team");
        harness.driver.push({ text: "a and b." });
        const second = await harness.controller.resolveAiApproval(approvals(harness)[0].id, { approve: true });

        assert.strictEqual(second.code, "AI_CONFIRMATION_NEEDED", JSON.stringify(second));
        assert.deepStrictEqual(harness.agentEvents(), ["ai-agent-start:counter", "ai-agent-end:counter"]);
        const request = approvals(harness)[1];
        assert.strictEqual(request.calls[0].arguments.agent, "stylist");
        assert.include(String(request.calls[0].arguments.task), "a and b.");
    });

    it("a denial reaches the main model as AI_APPROVAL_DENIED, and no helper runs", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), {
            agents: { ...planned({ steps: [{ agents: ["counter"] }, { agents: ["stylist"] }] }), confirmPlans: true },
        });

        await harness.controller.execute("count");
        harness.driver.push({ text: "Not counted, as you asked." });
        const result = await harness.controller.resolveAiApproval(approvals(harness)[0].id, { approve: false });

        assert.strictEqual(result.code, "AI_APPROVAL_DENIED");
        assert.strictEqual(result.llmText, "Not counted, as you asked.");
        assert.lengthOf(harness.driver.requests, 1);
        assert.deepStrictEqual(
            lastResults(harness.driver.requests[0]).map((denied) => denied.code),
            ["AI_APPROVAL_DENIED"],
        );
        assert.deepStrictEqual(harness.agentEvents(), []);
        assert.lengthOf(approvals(harness), 1, "the plan's later step is not asked about");
    });

    it("with the model router, the model's own hand-off is held too", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), {
            agents: { roles: [COUNTER], confirmPlans: true },
        });
        harness.driver.push({ calls: [delegate("counter", "Count.")] }, { text: "Waiting for you." });

        const held = await harness.controller.execute("count");

        assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED", JSON.stringify(held));
        assert.deepStrictEqual(harness.agentEvents(), []);
        harness.driver.push({ text: "2." }, { text: "Two." });
        const result = await harness.controller.resolveAiApproval(approvals(harness)[0].id, { approve: true });

        assert.strictEqual(result.llmText, "Two.");
        assert.deepStrictEqual(harness.agentEvents(), ["ai-agent-start:counter", "ai-agent-end:counter"]);
        assert.strictEqual(lastResults(harness.driver.requests.at(-1) as TurnRequest)[0].content.data?.answer, "2.");
    });
});
