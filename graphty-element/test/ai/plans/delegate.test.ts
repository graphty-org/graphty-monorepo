/**
 * @file Helpers (`agents`): the main model hands a task to a helper with `delegate`; the helper runs
 * the same loop with only its own commands, under the message's id, and its answer is the call's
 * result. Several helpers in one turn run at once and may only read. Every case runs on the
 * scripted engine and on `LlmProviderEngine` over a `MockLlmProvider`.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import type { GraphSession } from "../../../session";
import { AiController, type AiControllerOptions } from "../../../src/ai/AiController";
import { CommandRegistry } from "../../../src/ai/commands";
import type { CommandContext } from "../../../src/ai/commands/types";
import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import { LlmProviderEngine } from "../../../src/ai/engine/LlmProviderEngine";
import { ENGINE_OVERRIDE } from "../../../src/ai/engine/load";
import type { AiEngine, TurnEvent, TurnRequest } from "../../../src/ai/engine/types";
import { turnTools } from "../../../src/ai/runConversation";
import { installAssistantTools } from "../../../src/ai/tools/install";
import type { AiAgentEndEvent, AiEvent } from "../../../src/events";
import { assistantSession } from "../../helpers/assistant";
import { QueuedProvider } from "../../helpers/queued-provider";
import { providerApiFixture } from "../engine/providerApiFixtures";

/** One scripted model turn. */
interface Turn {
    readonly text?: string;
    readonly calls?: readonly { readonly tool: string; readonly args: Record<string, unknown> }[];
    readonly usage?: { readonly input: number; readonly output: number };
}

/** An engine the cases script, and the requests it was sent. */
interface Driver {
    readonly engine: AiEngine;
    readonly requests: TurnRequest[];
    push(...turns: Turn[]): void;
}

let callIds = 0;

/**
 * A turn's calls with unique ids.
 * @param turn - The turn.
 * @returns Its calls.
 */
function withIds(turn: Turn): { id: string; name: string; arguments: Record<string, unknown> }[] {
    return (turn.calls ?? []).map((call) => ({ id: `c${String(++callIds)}`, name: call.tool, arguments: call.args }));
}

/**
 * The scripted engine.
 * @returns Its driver.
 */
function fakeDriver(): Driver {
    const engine = new FakeEngine();
    return {
        engine,
        requests: engine.requests,
        push: (...turns) => {
            engine.push(
                ...turns.map((turn): TurnEvent[] => [
                    ...(turn.text === undefined ? [] : [{ type: "text" as const, delta: turn.text }]),
                    ...withIds(turn).map((call): TurnEvent => ({ type: "tool-call", ...call })),
                    ...(turn.usage === undefined
                        ? []
                        : [{ type: "usage" as const, inputTokens: turn.usage.input, outputTokens: turn.usage.output }]),
                    { type: "finish", reason: turn.calls === undefined ? "stop" : "tool-calls" },
                ]),
            );
        },
    };
}

/** `LlmProviderEngine`, recording each turn's request. */
class RecordingEngine extends LlmProviderEngine {
    readonly requests: TurnRequest[] = [];

    override async *turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent> {
        this.requests.push(request);
        yield* super.turn(request, signal);
    }
}

/**
 * `LlmProviderEngine` over a mock provider.
 * @returns Its driver.
 */
function mockDriver(): Driver {
    const provider = new QueuedProvider();
    const engine = new RecordingEngine(provider);
    return {
        engine,
        requests: engine.requests,
        push: (...turns) => {
            provider.queue.push(
                ...turns.map((turn) => ({
                    text: turn.text ?? "",
                    toolCalls: withIds(turn),
                    ...(turn.usage === undefined
                        ? {}
                        : { usage: { promptTokens: turn.usage.input, completionTokens: turn.usage.output } }),
                })),
            );
        },
    };
}

/** An assistant over a session, on one driver. */
class Harness {
    readonly events: AiEvent[] = [];
    readonly registry = new CommandRegistry();
    readonly controller: AiController;

    /**
     * An assistant.
     * @param session - The session.
     * @param driver - The engine.
     * @param options - Helpers, keys, questions, history.
     */
    constructor(
        readonly session: GraphSession,
        readonly driver: Driver,
        options: Pick<AiControllerOptions, "agents" | "apiKeys" | "questions" | "history"> = {},
    ) {
        installAssistantTools(this.registry, session);
        this.controller = new AiController({
            provider: { name: "scripted" } as never,
            commandRegistry: this.registry,
            graph: { getSession: () => session } as unknown as CommandContext["graph"],
            emitEvent: (event: AiEvent) => this.events.push(event),
            ...options,
            [ENGINE_OVERRIDE]: driver.engine,
        } as never);
    }

    /**
     * The helper events, as `type:agent`.
     * @returns Them, in order.
     */
    agentEvents(): string[] {
        return this.events.flatMap((event) =>
            event.type === "ai-agent-start" || event.type === "ai-agent-end" ? [`${event.type}:${event.agent}`] : [],
        );
    }
}

const COUNTER = { name: "counter", purpose: "Count and read nodes.", commands: ["query"] };
const STYLIST = { name: "stylist", purpose: "Color nodes.", commands: ["style"] };
const PAINTER = { name: "painter", purpose: "Also color nodes.", commands: ["style"] };
const COUNT = { tool: "query", args: { action: "count", where: "data.type == 'server'" } };
const STYLE_RED = {
    tool: "style",
    args: { action: "add", where: "data.team == 'red'", values: { "node.color": "red" } },
};
const ADD_F = { tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } };

/**
 * A `delegate` call.
 * @param agent - The helper.
 * @param task - The task.
 * @returns The call.
 */
function delegate(agent: string, task: string): { tool: string; args: Record<string, unknown> } {
    return { tool: "delegate", args: { agent, task } };
}

/**
 * The tool results a request's last message carries.
 * @param request - The request.
 * @returns Each result's code and parsed content.
 */
function lastResults(request: TurnRequest): { code: string; content: { data?: { answer?: string } } }[] {
    const last = request.messages.at(-1);
    assert.strictEqual(last?.role, "tool");
    return (last?.parts ?? []).flatMap((part) =>
        part.type === "tool-result"
            ? [{ code: part.code, content: JSON.parse(part.content) as { data?: { answer?: string } } }]
            : [],
    );
}

describe("helpers are offered only when configured", () => {
    it("under the default config: no delegate tool, no helper event, and a delegate call is unknown", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, fakeDriver());
        harness.driver.push({ calls: [delegate("counter", "count")] }, { text: "ok" });

        await harness.controller.execute("count the servers");

        const offered = harness.driver.requests[0].tools.map((tool) => tool.name);
        assert.deepStrictEqual(
            offered,
            turnTools(harness.registry, "standard", []).map((command) => command.name),
        );
        assert.deepStrictEqual(harness.agentEvents(), []);
        assert.deepStrictEqual(
            lastResults(harness.driver.requests[1]).map((result) => result.code),
            ["AI_TOOL_UNKNOWN"],
        );
    });

    it("with helpers, delegate follows the profile's tools and names the roles", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, fakeDriver(), { agents: [COUNTER, STYLIST], questions: true });
        harness.driver.push({ text: "Hello." });
        await harness.controller.execute("hi");

        const { tools } = harness.driver.requests[0];
        assert.deepStrictEqual(
            tools.map((tool) => tool.name),
            [...turnTools(harness.registry, "standard", []).map((command) => command.name), "delegate", "ask_reader"],
        );
        const declared = tools.find((tool) => tool.name === "delegate")?.jsonSchema as {
            properties: { agent: { enum: string[] } };
        };
        assert.deepStrictEqual(declared.properties.agent.enum, ["counter", "stylist"]);
    });
});

describe.each([
    ["the scripted engine", fakeDriver],
    ["LlmProviderEngine over MockLlmProvider", mockDriver],
])("a helper on %s", (_name, driver) => {
    it("runs with only its own commands, and its answer is the delegate call's result", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { agents: [COUNTER, STYLIST], questions: true });
        harness.driver.push(
            { calls: [delegate("counter", "Count the servers.")] },
            { calls: [COUNT] },
            { text: "There are 2 servers." },
            { text: "Two servers." },
        );

        const result = await harness.controller.execute("how many servers?");

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.strictEqual(result.llmText, "Two servers.");
        const [, helper, helperNext, main] = harness.driver.requests;
        for (const request of [helper, helperNext]) {
            assert.deepStrictEqual(
                request.tools.map((tool) => tool.name),
                ["query"],
            );
        }

        assert.include(helper.system, "Count and read nodes.");
        const task = helper.messages[0].parts.at(-1);
        assert.deepInclude(task, { type: "text", origin: "graphty", text: "Count the servers." });
        const [answer] = lastResults(main);
        assert.strictEqual(answer.code, "AI_COMPLETED");
        assert.strictEqual(answer.content.data?.answer, "There are 2 servers.");
        assert.deepStrictEqual(harness.agentEvents(), ["ai-agent-start:counter", "ai-agent-end:counter"]);
    });

    it("two helpers in one turn both start before either ends, and a write from either is refused", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { agents: [STYLIST, PAINTER] });
        const layers = session.styles.list().length;
        harness.driver.push(
            { calls: [delegate("stylist", "Color red."), delegate("painter", "Color red too.")] },
            { calls: [STYLE_RED] },
            { calls: [STYLE_RED] },
            { text: "Could not." },
            { text: "Could not either." },
            { text: "Neither helper could write." },
        );

        const result = await harness.controller.execute("color the red team");

        assert.strictEqual(result.llmText, "Neither helper could write.");
        assert.deepStrictEqual(harness.agentEvents().slice(0, 2), ["ai-agent-start:stylist", "ai-agent-start:painter"]);
        // Each helper's first turn was asked before either helper's second.
        const helperFirsts = harness.driver.requests.slice(1, 3).map((request) => request.messages.length);
        assert.deepStrictEqual(helperFirsts, [1, 1]);
        const refusals = harness.driver.requests.slice(3, 5).flatMap((request) => lastResults(request));
        assert.lengthOf(refusals, 2);
        for (const refusal of refusals) {
            assert.strictEqual(refusal.code, "AI_TOOL_DENIED_BY_POLICY");
            assert.deepInclude((refusal.content as { params?: unknown }).params, {
                tool: "style",
                reason: "parallel-helper",
            });
        }

        assert.strictEqual(session.styles.list().length, layers, "the graph is unchanged");
    });

    it("a single writing helper's change and the main's change undo as one step", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { agents: [STYLIST] });
        const layers = session.styles.list().length;
        harness.driver.push(
            { calls: [ADD_F, delegate("stylist", "Color the red team red.")] },
            { calls: [STYLE_RED] },
            { text: "Colored." },
            { text: "Added f and colored the red team." },
        );

        const result = await harness.controller.execute("add f and color the red team");

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.exists(session.data.node("f"));
        assert.strictEqual(session.styles.list().length, layers + 1);

        await session.undo();

        assert.notExists(session.data.node("f"));
        assert.strictEqual(session.styles.list().length, layers);
    });

    it("sums the helper's tokens into ai-agent-end and the message's result", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { agents: [COUNTER] });
        harness.driver.push(
            { calls: [delegate("counter", "Count.")], usage: { input: 100, output: 10 } },
            { calls: [COUNT], usage: { input: 20, output: 3 } },
            { text: "2.", usage: { input: 30, output: 4 } },
            { text: "Two." },
        );

        const result = await harness.controller.execute("count");

        const end = harness.events.find((event): event is AiAgentEndEvent => event.type === "ai-agent-end");
        assert.deepInclude(end?.params, { inputTokens: 50, outputTokens: 7 });
        assert.strictEqual(end?.code, "AI_COMPLETED");
        assert.deepInclude(result.params, { inputTokens: 50, outputTokens: 7 });
    });

    it("saves the helper's conversation, and the snapshot shows its answer under its name", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { agents: [COUNTER], history: "memory" });
        await harness.controller.ready();
        harness.driver.push({ calls: [delegate("counter", "Count.")] }, { text: "Two servers." }, { text: "Two." });

        await harness.controller.execute("count");

        const messages = harness.controller.getConversation()?.messages ?? [];
        const helper = messages.find((message) => message.role === "assistant" && message.agent === "counter");
        assert.deepInclude(helper, { role: "assistant", text: "Two servers.", agent: "counter" });
        const main = messages.flatMap((message) => (message.role === "assistant" ? message.calls : []));
        assert.deepInclude(main[0], { command: "delegate", code: "AI_COMPLETED" });
    });
});

describe("helpers and the message", () => {
    it("a cancel aborts a running helper, and the message resolves AI_CANCELLED", async () => {
        const session = await assistantSession();
        const engine = new FakeEngine();
        const harness = new Harness(
            session,
            { engine, requests: engine.requests, push: () => undefined },
            {
                agents: [COUNTER],
            },
        );
        let started!: () => void;
        const helperStarted = new Promise<void>((resolve) => {
            started = resolve;
        });
        engine.push(
            [
                { type: "tool-call", id: "d1", name: "delegate", arguments: { agent: "counter", task: "Count." } },
                { type: "finish", reason: "tool-calls" },
            ],
            (_request, signal) => ({
                async *[Symbol.asyncIterator](): AsyncIterator<TurnEvent> {
                    started();
                    await new Promise((resolve) => {
                        signal.addEventListener("abort", resolve);
                    });
                    yield { type: "finish", reason: "stop" };
                },
            }),
        );

        const running = harness.controller.execute("count");
        await helperStarted;
        harness.controller.cancel();
        const result = await running;

        assert.strictEqual(result.code, "AI_CANCELLED");
        assert.lengthOf(engine.requests, 2, "nothing after the cancel");
    });

    it("a role on anthropic with no key resolves AI_KEY_MISSING and sends nothing", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, fakeDriver(), {
            agents: [{ ...COUNTER, provider: "anthropic" }],
        });

        const result = await harness.controller.execute("count");

        assert.strictEqual(result.code, "AI_KEY_MISSING");
        assert.deepStrictEqual(result.params, { provider: "anthropic" });
        assert.lengthOf(harness.driver.requests, 0);
        assert.deepStrictEqual(harness.agentEvents(), []);
    });

    describe("a role on its own provider", () => {
        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it("runs on that provider with the key apiKeys gives it", async () => {
            const anthropic = providerApiFixture("anthropic");
            anthropic.reply({ text: "Two servers." });
            const session = await assistantSession();
            const key = "sk-ant-role-key-0123456789";
            const harness = new Harness(session, fakeDriver(), {
                agents: [{ ...COUNTER, provider: "anthropic", model: "claude-haiku-4-5-20251001" }],
                apiKeys: { anthropic: key },
            });
            harness.driver.push({ calls: [delegate("counter", "Count.")] }, { text: "Two." });

            const result = await harness.controller.execute("count");

            assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
            assert.lengthOf(anthropic.requests, 1);
            assert.include(anthropic.requests[0].url, "api.anthropic.com");
            assert.strictEqual(anthropic.requests[0].headers["x-api-key"], key);
            assert.strictEqual(lastResults(harness.driver.requests[1])[0].content.data?.answer, "Two servers.");
        });
    });
});
