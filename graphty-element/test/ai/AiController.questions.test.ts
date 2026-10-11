/**
 * @file Questions to the reader: with `questions: true` the loop offers `ask_reader`; a call to it
 * ends the message in the question (`AI_QUESTION_ASKED`), the calls before it having run;
 * `answerQuestion` checks the answer against the choices and continues the message with it as the
 * call's result; a new message, a cancel and an undo each end a waiting question. Every case runs
 * on the scripted engine and on `LlmProviderEngine` over a `MockLlmProvider`.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../session";
import { AiController, type AiControllerOptions } from "../../src/ai/AiController";
import { CommandRegistry } from "../../src/ai/commands";
import type { CommandContext } from "../../src/ai/commands/types";
import { FakeEngine } from "../../src/ai/engine/FakeEngine";
import { LlmProviderEngine } from "../../src/ai/engine/LlmProviderEngine";
import { ENGINE_OVERRIDE } from "../../src/ai/engine/load";
import type { AiEngine, TurnEvent, TurnRequest } from "../../src/ai/engine/types";
import { turnTools } from "../../src/ai/runConversation";
import { installAssistantTools } from "../../src/ai/tools/install";
import type { AiEvent, AiPendingResolvedEvent, AiQuestionRequest } from "../../src/events";
import { assistantSession, digest } from "../helpers/assistant";
import { QueuedProvider } from "../helpers/queued-provider";

/** One scripted model turn: its text and its calls. */
interface Turn {
    readonly text?: string;
    readonly calls?: readonly { readonly tool: string; readonly args: Record<string, unknown> }[];
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
            provider.queue.push(...turns.map((turn) => ({ text: turn.text ?? "", toolCalls: withIds(turn) })));
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
     * @param options - Questions and history.
     */
    constructor(
        readonly session: GraphSession,
        readonly driver: Driver,
        options: Pick<AiControllerOptions, "questions" | "history"> = {},
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
}

const QUESTION = {
    tool: "ask_reader",
    args: { question: "Which team?", choices: ["red", "blue"] },
};
const ADD_F = { tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } };
const STYLE_RED = {
    tool: "style",
    args: { action: "add", where: "data.team == 'red'", values: { "node.color": "red" } },
};

/**
 * The questions asked among some events.
 * @param events - The events.
 * @returns The requests.
 */
function asked(events: readonly AiEvent[]): AiQuestionRequest[] {
    return events.flatMap((event) => (event.type === "ai-question-asked" ? [event.request] : []));
}

/**
 * The ends of waiting entries among some events.
 * @param events - The events.
 * @returns The `ai-pending-resolved` events.
 */
function ended(events: readonly AiEvent[]): AiPendingResolvedEvent[] {
    return events.filter((event): event is AiPendingResolvedEvent => event.type === "ai-pending-resolved");
}

/**
 * Ask a question in a message.
 * @param harness - The assistant.
 * @param first - Calls the turn makes before the question.
 * @returns The question.
 */
async function askQuestion(harness: Harness, first: Turn["calls"] = []): Promise<AiQuestionRequest> {
    harness.driver.push({ calls: [...(first ?? []), QUESTION] });
    const result = await harness.controller.execute("color my team");
    assert.strictEqual(result.code, "AI_QUESTION_ASKED", JSON.stringify(result));
    const [request] = asked(harness.events);
    assert.strictEqual(result.params?.request, request.id);
    return request;
}

describe("questions are offered only when switched on", () => {
    it("under the default config the tools are the profile's alone, and ask_reader is never offered", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, fakeDriver());
        harness.driver.push({ text: "Hello." });
        await harness.controller.execute("hi");

        const offered = harness.driver.requests[0].tools.map((tool) => tool.name);
        assert.deepStrictEqual(
            offered,
            turnTools(harness.registry, "standard", []).map((command) => command.name),
        );
        assert.notInclude(offered, "ask_reader");
    });

    it("with questions on, the profile's tools and then ask_reader", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, fakeDriver(), { questions: true });
        harness.driver.push({ text: "Hello." });
        await harness.controller.execute("hi");

        const offered = harness.driver.requests[0].tools.map((tool) => tool.name);
        assert.deepStrictEqual(offered, [
            ...turnTools(harness.registry, "standard", []).map((command) => command.name),
            "ask_reader",
        ]);
    });

    it("a call to ask_reader with questions off is an unknown tool, and nothing is asked", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, fakeDriver());
        harness.driver.push({ calls: [QUESTION] }, { text: "ok" });
        const result = await harness.controller.execute("color my team");

        assert.notStrictEqual(result.code, "AI_QUESTION_ASKED");
        assert.lengthOf(asked(harness.events), 0);
    });
});

describe.each([
    ["the scripted engine", fakeDriver],
    ["LlmProviderEngine over MockLlmProvider", mockDriver],
])("a question on %s", (_name, driver) => {
    it("ends the message in the question, with the graph and the history unchanged", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { questions: true });
        const before = await digest(session);
        const steps = session.history.position;

        const request = await askQuestion(harness);

        assert.deepStrictEqual(request.choices, ["red", "blue"]);
        assert.strictEqual(request.question, "Which team?");
        assert.isFalse(request.multiple);
        assert.strictEqual(await digest(session), before);
        assert.strictEqual(session.history.position, steps);
        assert.lengthOf(harness.driver.requests, 1, "no turn after the question");
        assert.deepStrictEqual(
            harness.controller.getPendingQuestions().map((question) => question.id),
            [request.id],
        );
        assert.deepStrictEqual(harness.controller.getStatus().pending, { approvals: 0, questions: 1 });
    });

    it("an answer is the call's result in the next turn, and the message resolves with the model's text", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { questions: true });
        const request = await askQuestion(harness);
        const start = harness.events.length;

        harness.driver.push({ calls: [STYLE_RED] }, { text: "Colored the red team." });
        const layers = session.styles.list().length;
        const result = await harness.controller.answerQuestion(request.id, "red");

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.strictEqual(result.llmText, "Colored the red team.");
        assert.strictEqual(session.styles.list().length, layers + 1);
        const answered = harness.driver.requests[1].messages.at(-1);
        assert.strictEqual(answered?.role, "tool");
        const [part] = answered?.parts ?? [];
        assert.strictEqual(part.type, "tool-result");
        if (part.type === "tool-result") {
            assert.strictEqual(part.origin, "reader");
            assert.deepStrictEqual(JSON.parse(part.content), {
                code: "AI_COMPLETED",
                params: {},
                data: { answer: ["red"] },
            });
        }

        assert.deepInclude(ended(harness.events.slice(start))[0], {
            id: request.id,
            kind: "question",
            code: "AI_COMPLETED",
        });
        assert.deepStrictEqual(harness.controller.getPendingQuestions(), []);
        assert.isUndefined(harness.controller.getStatus().pending);
    });

    it("an answer outside the choices resolves AI_ANSWER_INVALID, sends nothing, and the question stays open", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { questions: true });
        const request = await askQuestion(harness);

        for (const answer of ["green", ["red", "blue"], []]) {
            const result = await harness.controller.answerQuestion(request.id, answer);
            assert.strictEqual(result.code, "AI_ANSWER_INVALID", JSON.stringify(answer));
            assert.strictEqual(result.params?.request, request.id);
        }

        assert.lengthOf(harness.driver.requests, 1);
        assert.lengthOf(harness.controller.getPendingQuestions(), 1);
    });

    it("runs the calls before the question first, and none after it", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { questions: true });
        harness.driver.push({ calls: [ADD_F, QUESTION, STYLE_RED] });
        const layers = session.styles.list().length;

        const result = await harness.controller.execute("add f and color my team");

        assert.strictEqual(result.code, "AI_QUESTION_ASKED");
        assert.exists(session.data.node("f"));
        assert.strictEqual(session.styles.list().length, layers, "the call after the question did not run");
    });

    it("a new message ends it, and the asking message ends without another turn", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { questions: true, history: "memory" });
        const request = await askQuestion(harness);
        const start = harness.events.length;

        harness.driver.push({ text: "Counted." });
        await harness.controller.execute("never mind, count the nodes");

        assert.lengthOf(harness.driver.requests, 2, "only the new message's turn");
        const [end] = ended(harness.events.slice(start));
        assert.deepInclude(end, { id: request.id, kind: "question", code: "AI_APPROVAL_STALE" });
        assert.strictEqual(end.params.reason, "superseded");
        const late = await harness.controller.answerQuestion(request.id, "red");
        assert.strictEqual(late.code, "AI_APPROVAL_STALE");
        assert.strictEqual(late.params?.reason, "expired");
    });

    it("a cancel ends it with AI_CANCELLED", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { questions: true });
        const request = await askQuestion(harness);
        const start = harness.events.length;

        harness.controller.cancel();

        assert.deepInclude(ended(harness.events.slice(start))[0], {
            id: request.id,
            kind: "question",
            code: "AI_CANCELLED",
        });
        assert.isUndefined(harness.controller.getStatus().pending);
        assert.strictEqual((await harness.controller.answerQuestion(request.id, "red")).code, "AI_APPROVAL_STALE");
    });

    it("an undo of the message's step ends it with AI_UNDONE", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { questions: true });
        const request = await askQuestion(harness, [ADD_F]);
        const start = harness.events.length;

        await session.undo();

        assert.deepInclude(ended(harness.events.slice(start))[0], {
            id: request.id,
            kind: "question",
            code: "AI_UNDONE",
        });
        assert.strictEqual((await harness.controller.answerQuestion(request.id, "red")).code, "AI_APPROVAL_STALE");
        assert.notExists(session.data.node("f"));
    });
});

describe("a question in the saved conversation", () => {
    it("shows as a call while it waits, and the answer as the reader's message", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, fakeDriver(), { questions: true, history: "memory" });
        const request = await askQuestion(harness);
        await harness.controller.ready();

        const waiting = harness.controller.getConversation()?.messages.at(-1);
        assert.strictEqual(waiting?.role, "assistant");
        if (waiting?.role === "assistant") {
            assert.deepInclude(waiting.calls[0], { command: "ask_reader", code: "AI_QUESTION_ASKED" });
        }

        harness.driver.push({ text: "Done." });
        await harness.controller.answerQuestion(request.id, "blue");

        const messages = harness.controller.getConversation()?.messages ?? [];
        const call = messages.flatMap((message) => (message.role === "assistant" ? message.calls : []))[0];
        assert.strictEqual(call.code, "AI_COMPLETED");
        const reader = messages.filter((message) => message.role === "reader");
        assert.deepStrictEqual(
            reader.map((message) => (message.role === "reader" ? message.text : "")),
            ["color my team", "blue"],
        );
    });

    it("takes several choices for a question that allows them", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, fakeDriver(), { questions: true });
        harness.driver.push({ calls: [{ tool: "ask_reader", args: { ...QUESTION.args, multiple: true } }] });
        await harness.controller.execute("color my teams");
        const [request] = asked(harness.events);

        harness.driver.push({ text: "Both." });
        const result = await harness.controller.answerQuestion(request.id, ["red", "blue"]);

        assert.strictEqual(result.code, "AI_COMPLETED");
    });

    it("an invalid question is refused to the model, and the message goes on", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, fakeDriver(), { questions: true });
        harness.driver.push(
            { calls: [{ tool: "ask_reader", args: { question: "?", choices: ["only"] } }] },
            { text: "ok" },
        );

        const result = await harness.controller.execute("color my team");

        assert.notStrictEqual(result.code, "AI_QUESTION_ASKED");
        assert.lengthOf(asked(harness.events), 0);
        const results = harness.driver.requests[1].messages
            .flatMap((message) => message.parts)
            .flatMap((part) => (part.type === "tool-result" ? [part.code] : []));
        assert.deepStrictEqual(results, ["AI_TOOL_INVALID_ARGUMENTS"]);
    });
});
