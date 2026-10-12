/**
 * @file Live messages through graphty's own loop, on a scripted live connection: a spoken request
 * runs its calls in one undo step and is saved as a voice message; a held batch or a question
 * hands off to the turns path; a response before its transcript, one with none, and one cut off
 * each save one whole message; the history seeds the next live session, and a typed message sees
 * the spoken ones. A message cancelled or undone closes the connection and nothing it still sends
 * runs; words heard after a message was saved are saved in its place; a press while a message runs
 * its tools is busy; a router never plans a spoken message; a change of conversation, or a typed
 * message, tells an open connection it is stale.
 */

import { assert, describe, it, vi } from "vitest";

import type { GraphSession } from "../../../session";
import { AiController, type ExecutionResult, LIVE_MESSAGE, liveFacts } from "../../../src/ai/AiController";
import { CommandRegistry } from "../../../src/ai/commands";
import type { CommandContext } from "../../../src/ai/commands/types";
import { FakeEngine, FakeLiveConnection } from "../../../src/ai/engine/FakeEngine";
import { ENGINE_OVERRIDE } from "../../../src/ai/engine/load";
import type { LiveToolCall } from "../../../src/ai/engine/types";
import { installAssistantTools } from "../../../src/ai/tools/install";
import { LiveTurnEngine, READER_CONTEXT } from "../../../src/ai/voice/liveTurns";
import type { AiEvent } from "../../../src/events";
import { assistantSession, textTurn } from "../../helpers/assistant";
import { redNodes } from "../llm-regression/red";

const NODES = ["n1", "n2", "n3", "n4", "n5"].map((id) => ({ id }));

/**
 * A style call that paints nodes red.
 * @param id - The call's id.
 * @param ids - The nodes.
 * @returns The call.
 */
function paint(id: string, ...ids: string[]): LiveToolCall {
    return { id, name: "style", arguments: { action: "add", ids, values: { "node.color": "red" } } };
}

/** An assistant whose spoken messages run on a scripted live connection. */
class LiveHarness {
    readonly events: AiEvent[] = [];
    readonly turns = new FakeEngine();
    readonly connection = new FakeLiveConnection({ instructions: "", tools: [] });
    readonly controller: AiController;
    readonly engine: LiveTurnEngine;
    readonly answered: ExecutionResult[] = [];
    closes = 0;
    pointed: string[] = [];

    /**
     * An assistant.
     * @param session - The session.
     * @param options - Approvals and questions.
     */
    constructor(
        readonly session: GraphSession,
        options: Record<string, unknown> = {},
    ) {
        const registry = new CommandRegistry();
        installAssistantTools(registry, session);
        this.controller = new AiController({
            provider: { name: "scripted" } as never,
            commandRegistry: registry,
            graph: { getSession: () => session } as unknown as CommandContext["graph"],
            emitEvent: (event: AiEvent) => this.events.push(event),
            history: "memory",
            ...options,
            [ENGINE_OVERRIDE]: this.turns,
        } as never);
        const engine: LiveTurnEngine = new LiveTurnEngine(this.connection, "google", {
            run: (text, pointing, words) =>
                this.controller.execute(text, {
                    via: "voice",
                    ...(pointing === undefined ? {} : { pointing }),
                    [LIVE_MESSAGE]: { engine, heard: words.heard, saved: words.saved },
                } as never),
            pointing: () => ({ pointed: this.pointed, selected: [] }),
            readerContext: (pointing) => liveFacts(this.controller)?.readerContext(pointing) ?? "",
            close: () => {
                this.closes++;
                engine.closed("AI_CANCELLED", {});
                this.connection.close();
            },
            answered: (result) => this.answered.push(result),
        });
        this.engine = engine;
    }

    /**
     * Wait until this many spoken messages ended.
     * @param count - How many.
     */
    async messages(count: number): Promise<void> {
        await vi.waitFor(() => {
            assert.lengthOf(this.answered, count);
        });
    }

    /**
     * Wait until this many rounds of results went back to the provider.
     * @param count - How many.
     */
    async results(count: number): Promise<void> {
        await vi.waitFor(() => {
            assert.lengthOf(this.connection.sentResults, count);
        });
    }

    /**
     * Say a request whose response paints nodes, then answers.
     * @param text - What the reader says.
     * @param call - The call the model makes.
     */
    async sayPaint(text: string, call: LiveToolCall): Promise<void> {
        const rounds = this.connection.sentResults.length;
        const done = this.answered.length;
        this.engine.press();
        this.connection.emit({ type: "reader-transcript", text, final: true });
        this.connection.emit({ type: "tool-calls", calls: [call] });
        this.connection.emit({ type: "response-end" });
        await this.results(rounds + 1);
        this.connection.emit({ type: "answer-text", delta: "Done." });
        this.connection.emit({ type: "response-end" });
        await this.messages(done + 1);
    }

    /**
     * What is saved, as an application reads it.
     * @returns The reader's and the assistant's messages.
     */
    saved(): { reader: { text: string; via: string }[]; assistant: string[] } {
        const messages = this.controller.getConversation()?.messages ?? [];
        return {
            reader: messages.flatMap((m) => (m.role === "reader" ? [{ text: m.text, via: m.via }] : [])),
            assistant: messages.flatMap((m) => (m.role === "assistant" && m.text !== "" ? [m.text] : [])),
        };
    }

    /**
     * Wait until every message already handed to the controller ran: a turn queued behind them.
     */
    async drained(): Promise<void> {
        const id = this.controller.getConversation()?.id;
        assert.exists(id);
        await this.controller.openConversation(id);
    }

    /**
     * Start a request whose first response paints nodes, and wait until its results went back:
     * the message now waits for the provider's next response.
     * @param text - What the reader says.
     * @param call - The call the model makes.
     */
    async sayAndRun(text: string, call: LiveToolCall): Promise<void> {
        const rounds = this.connection.sentResults.length;
        this.engine.press();
        this.connection.emit({ type: "reader-transcript", text, final: true });
        this.connection.emit({ type: "tool-calls", calls: [call] });
        this.connection.emit({ type: "response-end" });
        await this.results(rounds + 1);
    }
}

/**
 * A harness over five nodes.
 * @param options - Approvals and questions.
 * @returns It.
 */
async function harness(options: Record<string, unknown> = {}): Promise<LiveHarness> {
    return new LiveHarness(await assistantSession({ nodes: NODES, edges: [] }), options);
}

describe("a spoken message runs through the loop", () => {
    it("'make n3 red': one voice message, the call ran, n3 changed, and one undo restores it", async () => {
        const live = await harness();
        await live.sayPaint("make n3 red", paint("c1", "n3"));

        assert.deepStrictEqual(redNodes(live.session, NODES), ["n3"]);
        assert.deepStrictEqual(live.saved().reader, [{ text: "make n3 red", via: "voice" }]);
        assert.deepStrictEqual(live.saved().assistant, ["Done."]);
        assert.strictEqual(live.connection.sentResults[0][0].callId, "c1", "the result went back for its call");
        assert.lengthOf(live.turns.requests, 0, "no turn ran on the turns engine");
        await live.session.undo();
        assert.deepStrictEqual(redNodes(live.session, NODES), []);
    });

    it("two utterances are two undo steps", async () => {
        const live = await harness();
        await live.sayPaint("make n3 red", paint("c1", "n3"));
        await live.sayPaint("and n2", paint("c2", "n2"));

        assert.deepStrictEqual(redNodes(live.session, NODES), ["n2", "n3"]);
        await live.session.undo();
        assert.deepStrictEqual(redNodes(live.session, NODES), ["n3"]);
        await live.session.undo();
        assert.deepStrictEqual(redNodes(live.session, NODES), []);
    });

    it("reader_context answers with the pointing record, and the model acts on it", async () => {
        const live = await harness();
        live.pointed = ["n3"];
        live.connection.emit({ type: "reader-transcript", text: "make this one red", final: true });
        live.connection.emit({ type: "tool-calls", calls: [{ id: "r1", name: READER_CONTEXT, arguments: {} }] });
        live.connection.emit({ type: "response-end" });
        await live.results(1);
        const [context] = live.connection.sentResults[0];
        assert.strictEqual(context.callId, "r1");
        assert.include(context.content, "Pointed at", "the pointing record is in the result");
        assert.include(context.content, "n3");

        live.connection.emit({ type: "tool-calls", calls: [paint("c1", "n3")] });
        live.connection.emit({ type: "response-end" });
        await live.results(2);
        live.connection.emit({ type: "response-end" });
        await live.messages(1);
        assert.deepStrictEqual(redNodes(live.session, NODES), ["n3"]);
    });

    it("counts the usage the provider reports", async () => {
        const live = await harness();
        live.connection.emit({ type: "reader-transcript", text: "hello", final: true });
        live.connection.emit({ type: "answer-text", delta: "Hi." });
        live.connection.emit({ type: "usage", inputTokens: 30, outputTokens: 4 });
        live.connection.emit({ type: "response-end" });
        await live.messages(1);
        assert.deepStrictEqual(live.answered[0].usage, { inputTokens: 30, outputTokens: 4 });
    });
});

describe("what waits on the reader hands off to the turns path", () => {
    it("a held batch: the approval is saved and emitted, the provider gets the held code, the connection closes, and 'yes' runs it", async () => {
        const live = await harness({ approvals: { ask: ["style"] } });
        live.connection.emit({ type: "reader-transcript", text: "make n3 red", final: true });
        live.connection.emit({ type: "tool-calls", calls: [paint("c1", "n3")] });
        live.connection.emit({ type: "response-end" });
        await live.results(1);
        assert.strictEqual(live.connection.sentResults[0][0].code, "AI_CONFIRMATION_NEEDED");
        assert.strictEqual(live.closes, 0, "the model's answer about it is heard first");
        live.connection.emit({ type: "answer-text", delta: "Shall I?" });
        live.connection.emit({ type: "response-end" });
        await live.messages(1);

        assert.strictEqual(live.answered[0].code, "AI_CONFIRMATION_NEEDED");
        assert.strictEqual(live.closes, 1, "the connection closed after that response");
        const [request] = live.controller.getPendingApprovals();
        assert.exists(request);
        assert.isTrue(live.events.some((event) => event.type === "ai-approval-requested"));
        assert.deepStrictEqual(redNodes(live.session, NODES), []);

        live.turns.push(textTurn("Painted."));
        const approved = await live.controller.resolveAiApproval(request.id, { approve: true });
        assert.strictEqual(approved.code, "AI_COMPLETED");
        assert.deepStrictEqual(redNodes(live.session, NODES), ["n3"]);
    });

    it("ask_reader: the question is saved, the provider gets its code, and the connection closes after the response", async () => {
        const live = await harness({ questions: true });
        live.connection.emit({ type: "reader-transcript", text: "color my team", final: true });
        live.connection.emit({
            type: "tool-calls",
            calls: [{ id: "q1", name: "ask_reader", arguments: { question: "Which team?", choices: ["red", "blue"] } }],
        });
        live.connection.emit({ type: "response-end" });
        await live.messages(1);

        assert.strictEqual(live.answered[0].code, "AI_QUESTION_ASKED");
        assert.lengthOf(live.controller.getPendingQuestions(), 1);
        assert.strictEqual(live.connection.sentResults[0][0].code, "AI_QUESTION_ASKED");
        assert.strictEqual(live.closes, 0);
        live.connection.emit({ type: "answer-text", delta: "Which team?" });
        live.connection.emit({ type: "response-end" });
        assert.strictEqual(live.closes, 1);
    });
});

describe("a response's words and its transcript in any order", () => {
    it("a response before its transcript saves one message with the words heard later", async () => {
        const live = await harness();
        live.connection.emit({ type: "tool-calls", calls: [paint("c1", "n3")] });
        live.connection.emit({ type: "response-end" });
        live.connection.emit({ type: "reader-transcript", text: "make n3 red", final: true });
        await live.results(1);
        live.connection.emit({ type: "answer-text", delta: "Done." });
        live.connection.emit({ type: "response-end" });
        await live.messages(1);

        assert.deepStrictEqual(live.saved().reader, [{ text: "make n3 red", via: "voice" }]);
        assert.deepStrictEqual(redNodes(live.session, NODES), ["n3"]);
    });

    it("an answer whose transcript never came is saved at the next press", async () => {
        const live = await harness();
        live.connection.emit({ type: "answer-text", delta: "Hello." });
        live.connection.emit({ type: "response-end" });
        assert.lengthOf(live.answered, 0, "it waits for the words");
        live.engine.press();
        await live.messages(1);

        assert.deepStrictEqual(live.saved().reader, [{ text: "", via: "voice" }]);
        assert.deepStrictEqual(live.saved().assistant, ["Hello."]);
    });

    it("an answer cut off is saved as far as it was heard, and the end that follows starts nothing", async () => {
        const live = await harness();
        live.connection.emit({ type: "reader-transcript", text: "describe the graph", final: true });
        live.connection.emit({ type: "answer-text", delta: "It has five" });
        live.engine.press();
        live.connection.emit({ type: "interrupted" });
        live.connection.emit({ type: "response-end" });
        await live.messages(1);
        live.engine.press();

        assert.deepStrictEqual(live.saved().assistant, ["It has five"]);
        assert.lengthOf(live.saved().reader, 1);
    });

    it("a connection that closes under a message ends it with the code", async () => {
        const live = await harness();
        live.connection.emit({ type: "reader-transcript", text: "make n3 red", final: true });
        live.connection.emit({ type: "tool-calls", calls: [paint("c1", "n3")] });
        live.connection.emit({ type: "response-end" });
        await live.results(1);
        live.engine.closed("AI_PROVIDER_ERROR", { provider: "google", cause: "live-closed" });
        await live.messages(1);
        assert.strictEqual(live.answered[0].code, "AI_PROVIDER_ERROR");
    });
});

describe("one conversation across typing and talking", () => {
    it("the history window seeds the next session, and a typed message sees the spoken ones", async () => {
        const live = await harness();
        await live.sayPaint("make n3 red", paint("c1", "n3"));

        const next = await liveFacts(live.controller)?.session();
        assert.include(next?.instructions, "reader: make n3 red");
        assert.include(next?.instructions, "assistant: Done.");

        live.turns.push(textTurn("One red node."));
        await live.controller.execute("how many are red?");
        const seen = JSON.stringify(live.turns.requests[0].messages);
        assert.include(seen, "make n3 red");
        assert.include(seen, "Done.");
    });

    it("declares the always-loaded tools, call and reader_context", async () => {
        const live = await harness({ questions: true });
        const names = ((await liveFacts(live.controller)?.session())?.tools ?? []).map((tool) => tool.name);
        assert.includeMembers(names, ["catalog", "query", "style", "undo", "call", READER_CONTEXT, "ask_reader"]);
        assert.notInclude(names, "sets", "an on-demand tool is reached through call");
    });
});

describe("a message cancelled or undone ends the connection, and nothing it still sends runs", () => {
    it("Stop after the first batch: the batch is taken back, the next response runs no tool, and the connection closes", async () => {
        const live = await harness();
        await live.sayAndRun("make n3 red, then n2", paint("c1", "n3"));
        assert.deepStrictEqual(redNodes(live.session, NODES), ["n3"]);

        live.controller.cancel();
        // The response the results asked for was already on its way.
        live.connection.emit({ type: "tool-calls", calls: [paint("c2", "n2")] });
        live.connection.emit({ type: "response-end" });
        await live.messages(1);
        await live.drained();

        assert.strictEqual(live.answered[0].code, "AI_CANCELLED");
        assert.lengthOf(live.answered, 1, "no message ran the later response");
        assert.strictEqual(live.closes, 1, "the connection closed");
        assert.deepStrictEqual(redNodes(live.session, NODES), []);
        assert.lengthOf(live.saved().reader, 1);
        assert.lengthOf(live.connection.sentResults, 1, "no cancelled results asked for another response");
    });

    it("an undo of the message's step while it runs: the same", async () => {
        const live = await harness();
        await live.sayAndRun("make n3 red, then n2", paint("c1", "n3"));

        await live.session.undo();
        live.connection.emit({ type: "tool-calls", calls: [paint("c2", "n2")] });
        live.connection.emit({ type: "response-end" });
        await live.messages(1);
        await live.drained();

        assert.strictEqual(live.answered[0].code, "AI_UNDONE");
        assert.lengthOf(live.answered, 1);
        assert.strictEqual(live.closes, 1);
        assert.deepStrictEqual(redNodes(live.session, NODES), []);
    });

    it("tool calls with no press waiting for them never run", async () => {
        const live = await harness();
        await live.sayPaint("make n3 red", paint("c1", "n3"));
        live.connection.emit({ type: "tool-calls", calls: [paint("c2", "n2")] });
        live.connection.emit({ type: "response-end" });
        await live.drained();

        assert.lengthOf(live.answered, 1);
        assert.strictEqual(live.closes, 1);
        assert.deepStrictEqual(redNodes(live.session, NODES), ["n3"]);
    });
});

describe("words heard after their message are its words", () => {
    it("a transcript that comes after the message ended rewords it, starts nothing, and blocks nothing", async () => {
        const live = await harness();
        live.engine.press();
        live.connection.emit({ type: "tool-calls", calls: [paint("c1", "n3")] });
        live.connection.emit({ type: "response-end" });
        await live.results(1);
        live.connection.emit({ type: "answer-text", delta: "Done." });
        live.connection.emit({ type: "response-end" });
        await live.messages(1);
        assert.deepStrictEqual(live.saved().reader, [{ text: "", via: "voice" }]);

        live.connection.emit({ type: "reader-transcript", text: "make n3 red", final: true });
        await vi.waitFor(() => {
            assert.deepStrictEqual(live.saved().reader, [{ text: "make n3 red", via: "voice" }]);
        });

        // A typed message is not held behind a message waiting for a response that never comes.
        live.turns.push(textTurn("One red node."));
        const typed = await live.controller.execute("how many are red?");
        assert.strictEqual(typed.code, "AI_COMPLETED");
        assert.lengthOf(live.answered, 1, "the late words started no message");
    });

    it("a transcript in two pieces, the second after the message ended, is saved whole", async () => {
        const live = await harness();
        live.engine.press();
        live.connection.emit({ type: "reader-transcript", text: "make n3", final: true });
        live.connection.emit({ type: "tool-calls", calls: [paint("c1", "n3")] });
        live.connection.emit({ type: "response-end" });
        await live.results(1);
        live.connection.emit({ type: "response-end" });
        await live.messages(1);
        live.connection.emit({ type: "reader-transcript", text: " red", final: true });

        await vi.waitFor(() => {
            assert.deepStrictEqual(live.saved().reader, [{ text: "make n3 red", via: "voice" }]);
        });
        assert.lengthOf(live.answered, 1);
    });
});

describe("one message reads the responses at a time", () => {
    it("is busy while a message runs its tools or waits for its response, and not once it read its answer", async () => {
        const live = await harness();
        assert.isFalse(live.engine.busy());
        await live.sayAndRun("make n3 red", paint("c1", "n3"));
        assert.isTrue(live.engine.busy(), "a press now would be read by this message");
        assert.isTrue(live.engine.running());

        live.connection.emit({ type: "answer-text", delta: "Done." });
        assert.isFalse(live.engine.busy(), "a press while it answers cuts the answer off");
        live.connection.emit({ type: "response-end" });
        await live.messages(1);
        assert.isFalse(live.engine.busy());
        assert.isFalse(live.engine.running());
    });

    it("reader_context answers with what was pointed at when talk was released, not after", async () => {
        const live = await harness();
        live.engine.press();
        live.pointed = ["n3"];
        live.engine.released();
        // The pointer moves on (or the next press points elsewhere) before the response comes.
        live.pointed = ["n1"];
        live.connection.emit({ type: "reader-transcript", text: "make this red", final: true });
        live.connection.emit({ type: "tool-calls", calls: [{ id: "r1", name: READER_CONTEXT, arguments: {} }] });
        live.connection.emit({ type: "response-end" });
        await live.results(1);
        const pointed = /Pointed at[^.]*\./.exec(live.connection.sentResults[0][0].content)?.[0] ?? "";
        assert.include(pointed, "n3");
        assert.notInclude(pointed, "n1");
    });
});

describe("a router never plans a spoken message", () => {
    it("a function router is not asked about a live message; the live model's calls run", async () => {
        let routed = 0;
        const live = await harness({
            agents: {
                roles: [{ name: "helper", purpose: "help", commands: ["query"] }],
                router: () => {
                    routed++;
                    return { steps: [{ agents: ["helper"] }] };
                },
            },
        });
        await live.sayPaint("make n3 red", paint("c1", "n3"));

        assert.strictEqual(routed, 0);
        assert.strictEqual(live.answered[0].code, "AI_COMPLETED", JSON.stringify(live.answered[0]));
        assert.deepStrictEqual(redNodes(live.session, NODES), ["n3"]);
    });
});

describe("an open connection hears that it no longer knows the conversation", () => {
    it("on a new conversation, another one opened, the open one deleted, the history cleared and a typed message", async () => {
        const live = await harness();
        let stale = 0;
        const stop = liveFacts(live.controller)?.watch(() => {
            stale++;
        });
        await live.sayPaint("make n3 red", paint("c1", "n3"));
        assert.strictEqual(stale, 0, "a spoken message is the connection's own");

        const first = live.controller.getConversation()?.id;
        assert.exists(first);
        await live.controller.newConversation();
        assert.strictEqual(stale, 1);
        await live.controller.openConversation(first);
        assert.strictEqual(stale, 2);
        live.turns.push(textTurn("Hi."));
        await live.controller.execute("hello");
        assert.strictEqual(stale, 3);
        await live.controller.deleteConversation(first);
        assert.strictEqual(stale, 4);
        await live.controller.clearHistory();
        assert.strictEqual(stale, 5);
        stop?.();
    });

    it("a connection opened after a new conversation starts with none of the old one", async () => {
        const live = await harness();
        await live.sayPaint("make n3 red", paint("c1", "n3"));
        await live.controller.clearHistory();
        const next = await liveFacts(live.controller)?.session();
        assert.notInclude(next?.instructions, "make n3 red");
    });
});
