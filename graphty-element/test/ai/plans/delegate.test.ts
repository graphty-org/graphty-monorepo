/**
 * @file Helpers (`agents`): the main model hands a task to a helper with `delegate`; the helper runs
 * the same loop with only its own commands, under the message's id, and its answer is the call's
 * result. Several helpers in one turn run at once and may only read. Every case runs on the
 * scripted engine and on `LlmProviderEngine` over a `MockLlmProvider`.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import type { TurnEvent } from "../../../src/ai/engine/types";
import { turnTools } from "../../../src/ai/runConversation";
import type { AiAgentEndEvent } from "../../../src/events";
import { assistantSession } from "../../helpers/assistant";
import { providerApiFixture } from "../engine/providerApiFixtures";
import {
    ADD_F,
    COUNT,
    COUNTER,
    delegate,
    fakeDriver,
    Harness,
    lastResults,
    mockDriver,
    PAINTER,
    STYLE_RED,
    STYLIST,
} from "./driver";

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
        // The purposes are the instructions', so the tool is the same size however many helpers.
        const { system } = harness.driver.requests[0];
        assert.include(system, `- counter: ${COUNTER.purpose}`);
        assert.include(system, `- stylist: ${STYLIST.purpose}`);
        assert.notInclude(tools.find((tool) => tool.name === "delegate")?.description, COUNTER.purpose);
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

    it("reports the helper's tokens on ai-agent-end, and the message's own and its helpers' on the result", async () => {
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
        assert.deepStrictEqual(end?.usage, { inputTokens: 50, outputTokens: 7 });
        assert.strictEqual(end?.code, "AI_COMPLETED");
        assert.notProperty(end?.params, "inputTokens", "a cost is not a fact of the code");
        // The main model's 100 + 10, and the helper's 50 + 7.
        assert.deepStrictEqual(result.usage, { inputTokens: 150, outputTokens: 17 });
        assert.notProperty(result.params, "inputTokens");
    });

    it("reports the main model's tokens on a message with no helper", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { agents: [COUNTER] });
        harness.driver.push(
            { calls: [COUNT], usage: { input: 40, output: 5 } },
            { text: "Two.", usage: { input: 60, output: 2 } },
        );

        const result = await harness.controller.execute("count");

        assert.deepStrictEqual(result.usage, { inputTokens: 100, outputTokens: 7 });
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
