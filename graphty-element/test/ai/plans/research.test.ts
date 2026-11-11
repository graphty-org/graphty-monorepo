/**
 * @file Web tools (`tools: { webSearch, webFetch }`): resolved once when the assistant is enabled,
 * and run only by the built-in read-only `research` helper the main model hands a task to with
 * `delegate`. The cases that need no web tool to run -- the default config, a tool left out, a
 * required tool, a role that may not have one -- run on the scripted engine and on
 * `LlmProviderEngine` over a `MockLlmProvider`; `LlmProviderEngine` runs no provider tool, so the
 * cases where search runs are scripted on `FakeEngine`.
 */

import { assert, describe, it } from "vitest";

import { AiConfigError } from "../../../src/ai/agents";
import { CommandRegistry } from "../../../src/ai/commands";
import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import type { TurnEvent } from "../../../src/ai/engine/types";
import { READ_ONLY_TOOLS } from "../../../src/ai/roles";
import { installAssistantTools } from "../../../src/ai/tools/install";
import { isAssistantTool } from "../../../src/ai/tools/toolset";
import type { AiEvent } from "../../../src/events";
import { assistantSession } from "../../helpers/assistant";
import { COUNTER, type Driver, fakeDriver, Harness, mockDriver } from "./driver";

const EIFFEL = { url: "https://en.wikipedia.org/wiki/Eiffel_Tower", title: "Eiffel Tower" };

/**
 * The scripted engine, its provider running both web tools.
 * @returns Its driver.
 */
function webDriver(): Driver & { readonly engine: FakeEngine } {
    const driver = fakeDriver();
    const engine = driver.engine as FakeEngine;
    engine.capability = {
        toolCalls: "available",
        hostedTools: { "web-search": "available", "web-fetch": "available" },
    };
    return { ...driver, engine };
}

/**
 * `LlmProviderEngine` over a `MockLlmProvider`, which the assistant is configured with.
 * @returns Its driver.
 */
function mockProviderDriver(): Driver {
    const driver = mockDriver();
    return { ...driver, provider: driver.mockProvider };
}

/**
 * A `delegate` call to the research helper.
 * @param task - The task.
 * @returns The main model's turn.
 */
function research(task: string): TurnEvent[] {
    return [
        { type: "tool-call", id: "d1", name: "delegate", arguments: { agent: "research", task } },
        { type: "finish", reason: "tool-calls" },
    ];
}

/** The research helper's turn: one search, then its answer. */
const SEARCHED: TurnEvent[] = [
    { type: "hosted-tool", tool: "web-search", status: "done", sources: [EIFFEL] },
    { type: "text", delta: "The Eiffel Tower opened in 1889." },
    { type: "finish", reason: "stop" },
];

/**
 * The events of the new kinds.
 * @param events - Every event.
 * @returns Those.
 */
function webEvents(events: readonly AiEvent[]): AiEvent[] {
    return events.filter(
        (event) => event.type === "ai-hosted-tool-result" || event.type === "ai-capability-unavailable",
    );
}

describe.each([
    ["the scripted engine", fakeDriver],
    ["LlmProviderEngine over MockLlmProvider", mockProviderDriver],
])("web tools on %s", (_name, driver) => {
    it("under the default config: no request carries a provider tool, there is no delegate, and nothing new is said", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { history: "memory" });
        harness.driver.push({ text: "Hello." });

        const result = await harness.controller.execute("hi");

        assert.strictEqual(result.code, "AI_COMPLETED");
        assert.isUndefined(harness.driver.requests[0].hostedTools);
        assert.notInclude(
            harness.driver.requests[0].tools.map((tool) => tool.name),
            "delegate",
        );
        assert.deepStrictEqual(webEvents(harness.events), []);
        assert.deepStrictEqual(
            harness.controller
                .getConversation()
                ?.messages.map((message) => message.role === "assistant" && message.sources),
            [false, []],
        );
    });

    it("a web tool the provider cannot run is left out, reported once per enable, and the command runs", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { tools: { webSearch: true } });
        harness.driver.push({ text: "One." }, { text: "Two." });

        const first = await harness.controller.execute("first");
        const second = await harness.controller.execute("second");

        assert.strictEqual(first.code, "AI_COMPLETED");
        assert.strictEqual(second.code, "AI_COMPLETED");
        const reported = webEvents(harness.events);
        assert.lengthOf(reported, 1, "once per enable, not per message");
        assert.deepInclude(reported[0], {
            type: "ai-capability-unavailable",
            tool: "web-search",
            code: "AI_HOSTED_TOOL_UNSUPPORTED",
        });
        assert.strictEqual((reported[0] as { params: { tool: string } }).params.tool, "web-search");
        // No research helper: the tool it would run is not there.
        assert.notInclude(
            harness.driver.requests[0].tools.map((tool) => tool.name),
            "delegate",
        );
        assert.isUndefined(harness.driver.requests[0].hostedTools);
    });

    it("with required: true, every command resolves AI_HOSTED_TOOL_UNSUPPORTED and the engine is never called", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { tools: { webSearch: { required: true } } });
        harness.driver.push({ text: "never" });

        const first = await harness.controller.execute("search the web");
        const second = await harness.controller.execute("again");

        assert.strictEqual(first.code, "AI_HOSTED_TOOL_UNSUPPORTED");
        assert.strictEqual(first.params?.tool, "web-search");
        assert.strictEqual(second.code, "AI_HOSTED_TOOL_UNSUPPORTED");
        assert.lengthOf(harness.driver.requests, 0);
    });

    it.each([
        ["a command that changes the graph", { commands: ["style"] }, "web-tools-with-writes"],
        ["any command on Google", { commands: ["query"], provider: "google" as const }, "unsupported"],
    ])("rejects a role with web tools and %s, building nothing", async (_what, role, reason) => {
        const session = await assistantSession();
        const made = driver();
        let error: unknown;
        try {
            new Harness(session, made, {
                agents: [{ name: "reader2", purpose: "Reads the web.", tools: { webSearch: true }, ...role }],
            });
        } catch (thrown) {
            error = thrown;
        }

        assert.instanceOf(error, AiConfigError);
        assert.deepStrictEqual(error.params, { agent: "reader2", field: "tools", reason });
        assert.lengthOf(made.requests, 0);
    });

    it("reserves the name research", async () => {
        const session = await assistantSession();
        assert.throws(
            () => new Harness(session, driver(), { agents: [{ ...COUNTER, name: "research" }] }),
            AiConfigError,
        );
    });
});

describe("the research helper, on the scripted engine", () => {
    it("is offered as delegate's research; only its request carries web search, and its sources reach the event and the snapshot", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, webDriver(), { tools: { webSearch: true }, history: "memory" });
        const engine = harness.driver.engine as FakeEngine;
        engine.push(research("When did the Eiffel Tower open?"), SEARCHED, [
            { type: "text", delta: "It opened in 1889." },
            { type: "finish", reason: "stop" },
        ]);

        const result = await harness.controller.execute("when did the Eiffel Tower open?");

        assert.strictEqual(result.code, "AI_COMPLETED");
        const [main, helper, answer] = harness.driver.requests;
        const declared = main.tools.find((tool) => tool.name === "delegate")?.jsonSchema as {
            properties: { agent: { enum: string[] } };
        };
        assert.deepStrictEqual(declared.properties.agent.enum, ["research"]);
        assert.isUndefined(main.hostedTools, "the main turn, which can write, has no web tool");
        assert.deepStrictEqual(helper.hostedTools, [{ tool: "web-search" }]);
        assert.deepStrictEqual(helper.tools, [], "the helper calls no command");
        assert.isUndefined(answer.hostedTools);
        // The helper's answer reaches the main model as web content.
        const delegated = answer.messages.at(-1)?.parts.find((part) => part.type === "tool-result");
        assert.strictEqual(delegated?.type === "tool-result" ? delegated.origin : undefined, "web");

        const results = harness.events.filter((event) => event.type === "ai-hosted-tool-result");
        assert.deepStrictEqual(results, [
            {
                type: "ai-hosted-tool-result",
                tool: "web-search",
                status: "done",
                sources: [{ tool: "web-search", ...EIFFEL }],
            },
        ]);
        const messages = harness.controller.getConversation()?.messages ?? [];
        const delegating = messages.find(
            (message) => message.role === "assistant" && message.calls.some((call) => call.command === "delegate"),
        );
        assert.deepStrictEqual(delegating?.role === "assistant" ? delegating.sources : undefined, [
            { tool: "web-search", ...EIFFEL },
        ]);
        const helperSaid = messages.find((message) => message.role === "assistant" && message.agent === "research");
        assert.deepStrictEqual(helperSaid?.role === "assistant" ? helperSaid.sources : undefined, [
            { tool: "web-search", ...EIFFEL },
        ]);
    });

    it("web fetch reaches only the hosts of URLs in the reader's own text, and is not offered without one", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, webDriver(), { tools: { webFetch: true } });
        const engine = harness.driver.engine as FakeEngine;
        engine.push(
            research("read it"),
            [
                { type: "text", delta: "read" },
                { type: "finish", reason: "stop" },
            ],
            [
                { type: "text", delta: "done" },
                { type: "finish", reason: "stop" },
            ],
        );
        await harness.controller.execute("summarize https://example.org/page, please");
        assert.deepStrictEqual(harness.driver.requests[1].hostedTools, [
            { tool: "web-fetch", allowedDomains: ["example.org"] },
        ]);

        engine.push(
            research("read it"),
            [
                { type: "text", delta: "nothing" },
                { type: "finish", reason: "stop" },
            ],
            [
                { type: "text", delta: "done" },
                { type: "finish", reason: "stop" },
            ],
        );
        await harness.controller.execute("read the page I mentioned");
        assert.isUndefined(harness.driver.requests[4].hostedTools, "no host: no fetch tool");
    });

    it("maxUses: 1 stops offering search after the first result, in the message", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, webDriver(), { tools: { webSearch: { maxUses: 1 } } });
        const engine = harness.driver.engine as FakeEngine;
        engine.push(
            research("first"),
            SEARCHED,
            research("second"),
            [
                { type: "text", delta: "from memory" },
                { type: "finish", reason: "stop" },
            ],
            [
                { type: "text", delta: "done" },
                { type: "finish", reason: "stop" },
            ],
        );

        await harness.controller.execute("search twice");

        assert.deepStrictEqual(harness.driver.requests[1].hostedTools, [{ tool: "web-search", maxUses: 1 }]);
        assert.isUndefined(harness.driver.requests[3].hostedTools, "spent: the second helper has no search");
    });

    it("sends a turn the provider paused back, which continues it, and the message completes", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, webDriver(), { tools: { webSearch: true }, history: "memory" });
        const engine = harness.driver.engine as FakeEngine;
        const state = { engine: "provider-api", provider: "anthropic", model: "m", data: { id: "srv_1" } };
        engine.push(
            research("search long"),
            [
                { type: "hosted-tool", tool: "web-search", status: "done", sources: [EIFFEL], providerState: state },
                { type: "finish", reason: "paused" },
            ],
            [
                { type: "text", delta: "It opened in 1889." },
                { type: "finish", reason: "stop" },
            ],
            [
                { type: "text", delta: "1889." },
                { type: "finish", reason: "stop" },
            ],
        );

        const result = await harness.controller.execute("search for a long time");

        assert.strictEqual(result.code, "AI_COMPLETED");
        const continued = harness.driver.requests[2].messages.at(-1);
        assert.strictEqual(continued?.role, "assistant", "the paused turn is sent back as it was");
        assert.deepInclude(continued?.parts[0] ?? {}, { type: "hosted-tool", providerState: state });
        // The state is needed only to continue the turn: the saved conversation does not keep it.
        const saved = await harness.controller.exportConversation(harness.controller.getConversation()?.id ?? "");
        assert.include(saved ?? "", "hosted-tool");
        assert.notInclude(saved ?? "", "srv_1");
    });

    it("ends the message AI_PROVIDER_PAUSED when the provider keeps pausing, after three re-sends", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, webDriver(), { tools: { webSearch: true } });
        const engine = harness.driver.engine as FakeEngine;
        const pausedTurn: TurnEvent[] = [
            { type: "hosted-tool", tool: "web-search", status: "done", sources: [EIFFEL] },
            { type: "finish", reason: "paused" },
        ];
        engine.push(research("search long"), pausedTurn, pausedTurn, pausedTurn, pausedTurn);

        const result = await harness.controller.execute("search for a long time");

        assert.strictEqual(result.code, "AI_PROVIDER_PAUSED");
        assert.deepStrictEqual(result.params, { provider: "fake" });
        assert.lengthOf(harness.driver.requests, 5, "one turn and three re-sends; the main model is not asked again");
    });

    it("reports a search the helper never ran: not-used on the event, hostedToolUses 0 on the hand-off", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, webDriver(), { tools: { webSearch: true }, history: "memory" });
        const engine = harness.driver.engine as FakeEngine;
        engine.push(
            research("When did the Eiffel Tower open?"),
            [
                { type: "text", delta: "1889, from memory." },
                { type: "finish", reason: "stop" },
            ],
            [
                { type: "text", delta: "1889." },
                { type: "finish", reason: "stop" },
            ],
        );

        await harness.controller.execute("search the web for when the Eiffel Tower opened");

        assert.include(harness.driver.requests[1].system, "Use your web tools before you answer");
        assert.deepStrictEqual(
            harness.events.filter((event) => event.type === "ai-hosted-tool-result"),
            [{ type: "ai-hosted-tool-result", tool: "web-search", status: "not-used", sources: [] }],
        );
        const calls = (harness.controller.getConversation()?.messages ?? []).flatMap((message) =>
            message.role === "assistant" ? message.calls : [],
        );
        const handOff = calls.find((call) => call.command === "delegate");
        assert.strictEqual(handOff?.params.hostedToolUses, 0);
    });

    it("getCapabilities reads the engine for web tools and the catalog for why not", async () => {
        const session = await assistantSession();
        assert.deepStrictEqual(new Harness(session, webDriver()).controller.getCapabilities().tools, {
            "web-search": "available",
            "web-fetch": "available",
            "in-page-code": "available",
        });
        assert.deepStrictEqual(new Harness(session, mockProviderDriver()).controller.getCapabilities(), {
            provider: "mock",
            model: "mock",
            tools: { "web-search": "unsupported", "web-fetch": "unsupported", "in-page-code": "available" },
        });
    });
});

describe("a helper with web tools may only read", () => {
    it("READ_ONLY_TOOLS names only tools every action of which reads", async () => {
        const registry = new CommandRegistry();
        installAssistantTools(registry, await assistantSession());
        const reading = registry
            .getAll()
            .filter(isAssistantTool)
            .filter((tool) => tool.definition.actions.every((action) => action.effect === "read"))
            .map((tool) => tool.name);
        for (const name of READ_ONLY_TOOLS) {
            assert.include(reading, name);
        }
    });
});
