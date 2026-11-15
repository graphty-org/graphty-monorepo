/**
 * @file Helpers stay inside the message's limits: helpers that run at once only read (no undo, no
 * selection, no view), one turn starts at most `MAX_HELPERS_PER_TURN` of them, a helper that fails
 * in a way its turn does not report stops the others, a helper's failed last write takes the whole
 * message back, the host's approval policy judges a hand-off like any call, and a held batch tells
 * the model which of the turn's other calls it kept from running. Every case runs on the scripted
 * engine and on `LlmProviderEngine` over a `MockLlmProvider`.
 */

import { assert, describe, it } from "vitest";

import { MAX_HELPERS_PER_TURN } from "../../../src/ai/agents";
import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import type { TurnEvent, TurnRequest } from "../../../src/ai/engine/types";
import type { AiAgentEndEvent } from "../../../src/events";
import { assistantSession } from "../../helpers/assistant";
import { ADD_F, COUNTER, delegate, fakeDriver, Harness, lastResults, mockDriver, STYLE_RED, STYLIST } from "./driver";

/** A write the style tool refuses: there is no such layer. */
const STYLE_MISSING = {
    tool: "style",
    args: { action: "update", layer: "no-such-layer", values: { "node.color": "blue" } },
};

/**
 * Every tool result a request carries, by the tool its call named.
 * @param request - The request.
 * @returns Each result's tool, code and parsed params.
 */
function resultsIn(request: TurnRequest): { tool: string; code: string; params: Record<string, unknown> }[] {
    const parts = request.messages.flatMap((message) => message.parts);
    const tools = new Map(parts.flatMap((part) => (part.type === "tool-call" ? [[part.callId, part.command]] : [])));
    return parts.flatMap((part) =>
        part.type === "tool-result"
            ? [
                  {
                      tool: tools.get(part.callId) ?? "",
                      code: part.code,
                      params: (JSON.parse(part.content) as { params?: Record<string, unknown> }).params ?? {},
                  },
              ]
            : [],
    );
}

describe.each([
    ["the scripted engine", fakeDriver],
    ["LlmProviderEngine over MockLlmProvider", mockDriver],
])("helpers within the message's limits on %s", (_name, driver) => {
    it("refuses an undo from helpers running at once: only reads run beside each other", async () => {
        const session = await assistantSession();
        const reader = { ...COUNTER, commands: ["query", "undo"] };
        const harness = new Harness(session, driver(), { agents: [reader, { ...reader, name: "second" }] });
        harness.driver.push(
            { calls: [delegate("counter", "Undo."), delegate("second", "Undo too.")] },
            { calls: [{ tool: "undo", args: { action: "undo" } }] },
            { calls: [{ tool: "undo", args: { action: "undo" } }] },
            { text: "Could not." },
            { text: "Could not either." },
            { text: "Neither could undo." },
        );

        await harness.controller.execute("undo twice");

        const refusals = harness.driver.requests.slice(3, 5).flatMap((request) => lastResults(request));
        assert.lengthOf(refusals, 2);
        for (const refusal of refusals) {
            assert.strictEqual(refusal.code, "AI_TOOL_DENIED_BY_POLICY");
            assert.deepInclude((refusal.content as { params?: unknown }).params, {
                tool: "undo",
                reason: "parallel-helper",
            });
        }
    });

    it(`starts at most ${String(MAX_HELPERS_PER_TURN)} helpers in one turn; the rest are not run`, async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { agents: [COUNTER] });
        const calls = Array.from({ length: MAX_HELPERS_PER_TURN + 1 }, (_, at) =>
            delegate("counter", `Count ${String(at)}.`),
        );
        harness.driver.push({ calls }, ...calls.slice(0, MAX_HELPERS_PER_TURN).map(() => ({ text: "2." })), {
            text: "Two.",
        });

        await harness.controller.execute("count, many times");

        const starts = harness.agentEvents().filter((event) => event.startsWith("ai-agent-start"));
        assert.lengthOf(starts, MAX_HELPERS_PER_TURN);
        const results = resultsIn(harness.driver.requests.at(-1) as TurnRequest);
        assert.lengthOf(results, MAX_HELPERS_PER_TURN + 1);
        assert.deepInclude(results.at(-1), {
            tool: "delegate",
            code: "AI_TOOL_NOT_RUN",
            params: { reason: "limit", tool: "delegate" },
        });
    });

    it("takes the whole message back when a helper's last write fails, its earlier write with it", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { agents: [STYLIST] });
        const layers = session.styles.list().length;
        harness.driver.push(
            { calls: [delegate("stylist", "Color red, then blue.")] },
            { calls: [STYLE_RED] },
            { calls: [STYLE_MISSING] },
            { text: "The second change failed." },
            { text: "never asked" },
        );

        const result = await harness.controller.execute("color the red team, then blue");

        assert.strictEqual(result.code, "AI_TOOL_FAILED", JSON.stringify(result));
        assert.isFalse(result.success);
        assert.strictEqual(session.styles.list().length, layers, "the helper's first write was taken back");
        const end = harness.events.find((event): event is AiAgentEndEvent => event.type === "ai-agent-end");
        assert.strictEqual(end?.code, "AI_TOOL_FAILED");
        assert.lengthOf(harness.driver.requests, 4, "the main model is not asked again");
    });

    it("refuses a hand-off the host's policy denies, and no helper runs", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), {
            agents: [COUNTER],
            approvals: { policy: (call) => (call.command === "delegate" ? "deny" : "allow") },
        });
        harness.driver.push({ calls: [delegate("counter", "Count.")] }, { text: "I may not hand that off." });

        const result = await harness.controller.execute("count");

        assert.strictEqual(result.llmText, "I may not hand that off.");
        assert.deepStrictEqual(harness.agentEvents(), []);
        assert.deepStrictEqual(
            lastResults(harness.driver.requests[1]).map((refusal) => refusal.code),
            ["AI_TOOL_DENIED_BY_POLICY"],
        );
    });

    it("holds a hand-off the host's policy asks about (gate policy), and approving runs the helper", async () => {
        const session = await assistantSession();
        const asked: { command: string; effect: string; agent: unknown }[] = [];
        const harness = new Harness(session, driver(), {
            agents: [COUNTER],
            approvals: {
                policy: (call) => {
                    asked.push({ command: call.command, effect: call.effect, agent: call.arguments.agent });
                    return call.command === "delegate" ? "ask" : "allow";
                },
            },
        });
        harness.driver.push({ calls: [delegate("counter", "Count.")] }, { text: "Waiting for you." });

        const held = await harness.controller.execute("count");

        assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED", JSON.stringify(held));
        assert.strictEqual(held.params?.gate, "policy");
        assert.deepStrictEqual(asked, [{ command: "delegate", effect: "read", agent: "counter" }]);
        assert.deepStrictEqual(harness.agentEvents(), []);
        const request = harness.events.flatMap((event) =>
            event.type === "ai-approval-requested" ? [event.request] : [],
        )[0];

        harness.driver.push({ text: "2." }, { text: "Two." });
        const result = await harness.controller.resolveAiApproval(request.id, { approve: true });

        assert.strictEqual(result.llmText, "Two.");
        assert.deepStrictEqual(harness.agentEvents(), ["ai-agent-start:counter", "ai-agent-end:counter"]);
    });

    it("tells the model the hand-off and the question a held batch kept from running", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), {
            agents: [COUNTER],
            questions: true,
            approvals: { ask: ["edit_data"] },
        });
        harness.driver.push(
            {
                calls: [
                    ADD_F,
                    delegate("counter", "Count."),
                    { tool: "ask_reader", args: { question: "Which?", choices: ["a", "b"] } },
                ],
            },
            { text: "Waiting for you." },
        );

        const held = await harness.controller.execute("add f, count, and ask");

        assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED", JSON.stringify(held));
        const answerTurn = harness.driver.requests[1];
        const unrun = resultsIn(answerTurn).filter((result) => result.tool !== "edit_data");
        assert.deepStrictEqual(
            unrun.map((result) => [result.tool, result.code, result.params.reason]),
            [
                ["delegate", "AI_TOOL_NOT_RUN", "held"],
                ["ask_reader", "AI_TOOL_NOT_RUN", "held"],
            ],
        );
        assert.deepStrictEqual(harness.agentEvents(), []);
    });
});

/** An engine whose turns for the helper named "counter" fail outright, outside any turn's report. */
class BreakingEngine extends FakeEngine {
    /**
     * @param before - What the failing turn waits for first.
     */
    constructor(private readonly before: Promise<void>) {
        super();
    }

    /**
     * A turn: the scripted one, or for "counter" a throw no turn event reports.
     * @param request - The request.
     * @param signal - The message's abort.
     * @yields The scripted events.
     */
    override async *turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent> {
        if (request.system.includes('You are "counter"')) {
            await this.before;
            throw new Error("the engine broke");
        }

        yield* super.turn(request, signal);
    }
}

describe("helpers running at once", () => {
    it("stop the others when one fails in a way its own turn does not report", async () => {
        const session = await assistantSession();
        let siblingStopped = false;
        let waiting!: () => void;
        const siblingWaits = new Promise<void>((resolve) => {
            waiting = resolve;
        });
        const engine = new BreakingEngine(siblingWaits);
        const harness = new Harness(
            session,
            { engine, requests: engine.requests, push: () => undefined },
            { agents: [COUNTER, { ...COUNTER, name: "second" }] },
        );
        engine.push(
            [
                { type: "tool-call", id: "d1", name: "delegate", arguments: { agent: "counter", task: "Count." } },
                { type: "tool-call", id: "d2", name: "delegate", arguments: { agent: "second", task: "Count." } },
                { type: "finish", reason: "tool-calls" },
            ],
            (_request, signal) => ({
                async *[Symbol.asyncIterator](): AsyncIterator<TurnEvent> {
                    waiting();
                    await new Promise((resolve) => {
                        signal.addEventListener("abort", resolve);
                    });
                    siblingStopped = true;
                    yield { type: "finish", reason: "stop" };
                },
            }),
        );

        const result = await harness.controller.execute("count twice");

        assert.isFalse(result.success);
        assert.strictEqual(result.code, "AI_FAILED", JSON.stringify(result));
        assert.isTrue(siblingStopped, "the other helper's turn was ended, not left running");
    });
});
