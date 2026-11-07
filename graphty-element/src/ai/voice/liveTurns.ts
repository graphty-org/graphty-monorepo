/**
 * Live messages through graphty's own loop. A `LiveTurnEngine` is the `AiEngine` of the messages
 * spoken on one live connection: each provider response is one turn (the answer's transcript as
 * text, its tool calls, `finish` with `tool-calls` or `stop`), and each later turn sends the tool
 * results the loop appended. So `runConversation` runs a spoken message as it runs a typed one:
 * ordered calls, policy and gates, one undo step, history and events.
 *
 * Each press of talk is one message. Its final transcript starts it, and every transcript until the
 * next press is its words: words heard after the message was saved are saved in its place, never
 * as another message. The provider's response events are buffered, so a response that comes before
 * its transcript, or one whose transcript never comes, loses nothing: tool calls start the message
 * at once (the words heard later are saved with it), and an answer with neither starts it at the
 * next press or when the connection closes. Tool calls no press asked for never run. A held batch
 * or a question hands off: the provider gets the message's code for its open calls and the
 * connection closes after that response, so the turns path answers what is pending. A message
 * cancelled, undone or failed before its last response closes the connection, so nothing the
 * provider still sends runs. Reached only by `import()`.
 * @module ai/voice/liveTurns
 */

import { z } from "zod";

import type { AiResultCode, AiResultParams } from "../../catalog/ai";
import type { ExecutionResult } from "../AiController";
import type { CommandRegistry } from "../commands/CommandRegistry";
import { historyWindow } from "../conversation/Conversation";
import {
    type AiEngine,
    type EngineCapabilities,
    type EngineOutcome,
    graphData,
    type JsonSchema,
    type LiveConnection,
    type LiveEvent,
    type LiveToolCall,
    type LiveToolResult,
    NO_HOSTED_TOOLS,
    type SavedMessage,
    type ToolSpec,
    type TurnEvent,
    type TurnRequest,
} from "../engine/types";
import { pairedForModel, toolSpec, turnTools } from "../runConversation";
import type { AiPointing, ToolProfile } from "../tools/prompt";

/** The live-only tool that reads what the reader sees and points at. */
export const READER_CONTEXT = "reader_context";

/** `reader_context`: read-only, answered by the live engine itself, never by the loop. */
export const READER_CONTEXT_TOOL: ToolSpec = {
    name: READER_CONTEXT,
    description: "Graph counts, the selection and the nodes the reader points at now (this, that, here).",
    schema: z.object({}),
    jsonSchema: { type: "object", properties: {} },
};

/** `call` as a live connection declares it: for the tools it does not declare. */
const LIVE_CALL_SCHEMA = {
    type: "object",
    properties: {
        tool: { type: "string" },
        action: { type: "string" },
        args: { anyOf: [{ type: "object" }, { type: "string" }] },
    },
    required: ["tool"],
};

/**
 * The tools a live connection declares, once: the profile's always-loaded tools, `call` (so the
 * on-demand tools need no mid-session update) and `reader_context`. Declared without
 * `additionalProperties: false` and with a short `call`, to stay inside the tool budget beside the
 * two extra tools; every call is still checked against the tool's own schema before it runs.
 * @param registry - Every command.
 * @param profile - The profile.
 * @returns The tools.
 */
export function liveTools(registry: CommandRegistry, profile: ToolProfile): ToolSpec[] {
    const call = registry.get("call");
    const offered = turnTools(registry, profile, []).filter((command) => command !== call);
    return [
        ...offered.map(toolSpec).map((spec) => ({
            ...spec,
            jsonSchema: JSON.parse(JSON.stringify(spec.jsonSchema), (key, value: unknown) =>
                key === "additionalProperties" && value === false ? undefined : value,
            ) as JsonSchema,
        })),
        ...(call === undefined
            ? []
            : [
                  {
                      ...toolSpec(call),
                      description: "Calls a tool not declared here: {tool, action, args}. catalog search names them.",
                      jsonSchema: LIVE_CALL_SCHEMA,
                  },
              ]),
        READER_CONTEXT_TOOL,
    ];
}

/**
 * A live connection's instructions: the system prompt, the facts now, and the conversation's
 * history window as text, so a live session continues a typed conversation.
 * @param system - The system prompt.
 * @param facts - The facts block.
 * @param earlier - The open conversation's messages.
 * @param budgetTokens - How much history a turn is shown.
 * @returns The instructions.
 */
export function liveInstructions(
    system: string,
    facts: string,
    earlier: readonly SavedMessage[],
    budgetTokens: number,
): string {
    const lines = historyWindow(pairedForModel(earlier), budgetTokens).flatMap((message) =>
        message.parts.flatMap((part) =>
            part.type === "text" && (part.origin === "reader" || part.origin === "model") && part.text !== ""
                ? [`${message.role === "user" ? "reader" : "assistant"}: ${part.text}`]
                : [],
        ),
    );
    return [
        system,
        "The reader talks to you. Call reader_context when they point (this, that, these, here).",
        `The graph now:\n${graphData(facts)}`,
        ...(lines.length === 0 ? [] : [`The conversation so far:\n${graphData(lines.join("\n"))}`]),
    ].join("\n\n");
}

/** What a live engine needs of the voice session. */
export interface LiveMessageHost {
    /**
     * Run one spoken message on this engine.
     * @param text - What the reader said; "" when not heard yet.
     * @param pointing - What they pointed at during the press.
     * @param words - The words heard for the press, and where words heard after the message was
     * saved go.
     */
    run(text: string, pointing: AiPointing | undefined, words: LiveWords): Promise<ExecutionResult>;
    /** What the reader points at in the press now. */
    pointing(): AiPointing | undefined;
    /** `reader_context`'s text. */
    readerContext(pointing: AiPointing | undefined): string;
    /** Close the connection: a hand-off to the turns path, or responses no press asked for. */
    close(): void;
    /** A spoken message's outcome. */
    answered?(result: ExecutionResult): void;
    /** A spoken message ended: the connection's idle time starts over. */
    settled?(): void;
}

/** The words of one press, as its message reads them. */
export interface LiveWords {
    /** Every final transcript of the press so far, joined; "" while none came. */
    readonly heard: () => string;
    /**
     * The message was saved: words heard for the press after that go to `reword`, which saves
     * them in place of the saved reader text.
     */
    readonly saved: (reword: (text: string) => void) => void;
}

/** The codes after which something waits on the reader, answered on the turns path. */
const HAND_OFF: ReadonlySet<string> = new Set(["AI_CONFIRMATION_NEEDED", "AI_QUESTION_ASKED"]);

/** The codes of a message whose changes were taken back: what the model remembers did not happen. */
const TAKEN_BACK: ReadonlySet<string> = new Set(["AI_CANCELLED", "AI_UNDONE", "AI_ROLLBACK_PARTIAL"]);

/**
 * A tool result the live engine writes itself.
 * @param callId - The call.
 * @param code - Its code.
 * @param params - Its params.
 * @param data - What it read.
 * @returns The result.
 */
function result(callId: string, code: AiResultCode, params: AiResultParams, data?: string): LiveToolResult {
    return {
        type: "tool-result",
        origin: "graph-data",
        callId,
        code,
        params,
        content: JSON.stringify({ code, params, ...(data === undefined ? {} : { data }) }),
    };
}

/** One press of talk on the connection. */
interface Utterance {
    /** Its final transcripts, joined. */
    text: string;
    /** What the reader pointed at, read when talk was released. */
    pointing?: AiPointing;
    /** `waiting` for its message to start, its message `running`, or `ended`. */
    state: "waiting" | "running" | "ended";
    /** Its message read its last response: the next press's responses may start the next message. */
    read: boolean;
    /** Saves words heard after its message was saved. */
    reword?: (text: string) => void;
}

/**
 * Whether queued events hold a whole response.
 * @param queue - The events.
 * @returns True when one ended.
 */
function whole(queue: readonly LiveEvent[]): boolean {
    return queue.some((event) => event.type === "response-end" || event.type === "interrupted");
}

/**
 * The messages spoken on one live connection, run through graphty's loop. Responses come in the
 * order of the presses, and one press's message reads them at a time; a press made while a message
 * still runs its tools is not live (`busy()`), so a response is never read by the wrong message.
 */
export class LiveTurnEngine implements AiEngine {
    readonly kind = "provider-api";
    /** Response events no turn has read yet. */
    private readonly queue: LiveEvent[] = [];
    private wake: (() => void) | undefined;
    /** The calls the loop was handed, whose results the next turn sends. */
    private outstanding: LiveToolCall[] = [];
    /** `reader_context` results, sent with the loop's. */
    private own: LiveToolResult[] = [];
    /** Presses whose message has not started, oldest first. */
    private readonly waiting: Utterance[] = [];
    /** The newest press: every final transcript until the next press is its words. */
    private latest: Utterance | undefined;
    /** The press whose message reads the responses now. */
    private reading: Utterance | undefined;
    /** The model is saying an answer. */
    private answering = false;
    /** An answer was cut off: the provider's end of that response is not a new one. */
    private skipEnd = false;
    /** Handing off: the connection closes at the end of this response. */
    private handingOff = false;
    /** Why the connection closed, once it did. */
    private closedWith: Extract<LiveEvent, { type: "closed" }> | undefined;

    /**
     * An engine over an open connection.
     * @param connection - The connection.
     * @param providerName - The provider's name.
     * @param host - The voice session.
     */
    constructor(
        private readonly connection: LiveConnection,
        readonly providerName: string,
        private readonly host: LiveMessageHost,
    ) {
        connection.on((event) => {
            this.heard(event);
        });
    }

    /**
     * Talk was pressed: an answer being said is cut off, a whole response no message read runs,
     * and the words heard from now on are this press's.
     */
    press(): void {
        if (this.answering) {
            this.heard({ type: "interrupted" });
        }

        this.startNext(true);
        const last = this.latest;
        if (this.waiting.length === 0 && this.reading?.read !== false) {
            // Nothing awaits a response: whatever is queued, no press asked for.
            this.queue.length = 0;
        } else if (
            last?.state === "waiting" &&
            last.text === "" &&
            !(last === this.waiting[0] && this.queue.length > 0)
        ) {
            // Nothing came back for the last press: its silence gets no message.
            this.waiting.splice(this.waiting.indexOf(last), 1);
        }

        this.latest = this.newUtterance();
    }

    /** Talk was released: what the reader pointed at during the press is its message's. */
    released(): void {
        if (this.latest?.state === "waiting") {
            this.latest.pointing = this.host.pointing();
        }
    }

    /**
     * Whether a press now would be read by the wrong message: a message runs its tools, or waits
     * for its response. Answering is not busy: a press then cuts the answer off and ends it.
     * @returns True while it is.
     */
    busy(): boolean {
        return this.reading !== undefined && !this.reading.read && !this.answering;
    }

    /**
     * Whether a spoken message runs: the connection must not close for being idle.
     * @returns True while one does.
     */
    running(): boolean {
        return this.reading !== undefined;
    }

    /**
     * The connection closed: a buffered response still runs, and a turn waiting fails with the code.
     * @param code - Why.
     * @param params - The facts behind `code`.
     */
    closed(code: AiResultCode, params: AiResultParams): void {
        this.closedWith ??= { type: "closed", code, params };
        this.startNext(true);
        this.wake?.();
    }

    /**
     * A press with no message yet.
     * @returns It, waiting.
     */
    private newUtterance(): Utterance {
        const utterance: Utterance = { text: "", state: "waiting", read: false };
        this.waiting.push(utterance);
        return utterance;
    }

    /**
     * What the connection reported.
     * @param event - The event.
     */
    private heard(event: LiveEvent): void {
        if (this.handingOff) {
            if (event.type === "response-end" || event.type === "interrupted") {
                this.handingOff = false;
                this.host.close();
            }

            return;
        }

        switch (event.type) {
            case "reader-transcript":
                if (event.final && event.text.trim() !== "") {
                    this.words(event.text);
                }

                return;
            case "answer-text":
                this.answering = true;
                this.skipEnd = false;
                break;
            case "tool-calls":
                this.skipEnd = false;
                break;
            case "response-end":
                this.answering = false;
                if (this.skipEnd) {
                    this.skipEnd = false;
                    return;
                }

                break;
            case "interrupted":
                if (!this.answering) {
                    return;
                }

                this.answering = false;
                this.skipEnd = true;
                break;
            case "usage":
                break;
            default:
                // Speaking is the session's; a close comes through `closed()`.
                return;
        }

        this.queue.push(event);
        this.wake?.();
        if (event.type === "tool-calls") {
            // Calls cannot wait for the words: the message starts, and saves them when they come.
            this.startNext(false);
        }
    }

    /**
     * A final transcript: more of the newest press's words. Words that come after its message was
     * saved are saved in its place; they never start another message.
     * @param text - The words.
     */
    private words(text: string): void {
        // A connection driven with no press: its first words are a press of their own.
        this.latest ??= this.newUtterance();
        const utterance = this.latest;
        utterance.text += text;
        if (utterance.state === "ended") {
            utterance.reword?.(utterance.text.trim());
        } else {
            this.startNext(false);
        }
    }

    /**
     * Start the oldest press's message once its words or its response came, and only when no
     * message still reads responses.
     * @param force - A press or the close: a whole response with no words heard runs now.
     */
    private startNext(force: boolean): void {
        if (this.reading?.read === false) {
            return;
        }

        const calls = this.queue.some((event) => event.type === "tool-calls");
        let head = this.waiting.at(0);
        if (head === undefined && this.latest === undefined && (calls || (force && whole(this.queue)))) {
            // A connection driven with no press: its first response is a press of its own.
            head = this.newUtterance();
            this.latest = head;
        }

        if (head === undefined) {
            if (calls && this.closedWith === undefined) {
                // Tool calls no press asked for are never run.
                this.discard();
            }

            return;
        }

        // Once a newer press exists, the words of this one will not come.
        if (head.text.trim() !== "" || calls || (whole(this.queue) && (force || head !== this.latest))) {
            this.start(head);
        }
    }

    /**
     * Start one spoken message.
     * @param utterance - Its press.
     */
    private start(utterance: Utterance): void {
        this.waiting.splice(this.waiting.indexOf(utterance), 1);
        utterance.state = "running";
        utterance.pointing ??= this.host.pointing();
        this.reading = utterance;
        void this.host
            .run(utterance.text.trim(), utterance.pointing, {
                heard: () => utterance.text.trim(),
                saved: (reword) => {
                    utterance.reword = reword;
                },
            })
            .then((outcome) => {
                utterance.state = "ended";
                if (this.reading === utterance) {
                    this.reading = undefined;
                    if (!utterance.read) {
                        // What it left unread was its own: no later press's response came yet.
                        this.queue.length = 0;
                    }
                }

                this.ended(utterance, outcome);
                this.host.settled?.();
                this.startNext(false);
            });
    }

    /**
     * A message ended. Something pending hands off: its open calls get the message's code and the
     * connection closes after that response. A message that ended before reading its last response
     * (cancelled, undone, failed), or whose changes were taken back, leaves the provider answering
     * or remembering what no longer holds: the connection closes, and the next press opens another
     * with the conversation as saved.
     * @param utterance - Its press.
     * @param outcome - The message's result.
     */
    private ended(utterance: Utterance, outcome: ExecutionResult): void {
        const code = outcome.code ?? "AI_COMPLETED";
        if (this.closedWith === undefined) {
            if (HAND_OFF.has(code)) {
                const open = this.outstanding.map((call) => result(call.id, code, outcome.params ?? {}));
                this.send(open);
                if (open.length === 0) {
                    this.host.close();
                } else {
                    this.handingOff = true;
                }
            } else if (
                (!utterance.read && code !== "AI_COMPLETED") ||
                TAKEN_BACK.has(code) ||
                outcome.params?.rolledBack !== undefined
            ) {
                this.discard();
            }
        }

        this.host.answered?.(outcome);
    }

    /** Drop what the provider sent and close the connection: no message reads it. */
    private discard(): void {
        this.queue.length = 0;
        this.outstanding = [];
        this.own = [];
        this.host.close();
    }

    /**
     * Answer the open calls: the loop's results, and `reader_context`'s own.
     * @param results - The loop's results.
     */
    private send(results: readonly LiveToolResult[]): void {
        const all = [...this.own, ...results];
        this.outstanding = [];
        this.own = [];
        if (all.length > 0) {
            this.connection.sendToolResults(all);
        }
    }

    /**
     * The next response event.
     * @param signal - Ends the wait.
     * @returns The event, the close once closed, or undefined when the signal fired.
     */
    private next(signal: AbortSignal): Promise<LiveEvent | undefined> {
        const event = this.queue.shift() ?? this.closedWith;
        if (event !== undefined || signal.aborted) {
            return Promise.resolve(event);
        }

        return new Promise((resolve) => {
            const stop = (): void => {
                this.wake = undefined;
                resolve(undefined);
            };
            signal.addEventListener("abort", stop, { once: true });
            this.wake = () => {
                signal.removeEventListener("abort", stop);
                this.wake = undefined;
                resolve(this.queue.shift() ?? this.closedWith);
            };
        });
    }

    /**
     * One turn: send the results of the last turn's calls, then read one response.
     * @param request - The turn; only its tool results are read (the rest the connection holds).
     * @param signal - Ends the turn.
     * @yields The response as turn events.
     */
    async *turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent> {
        this.answerOutstanding(request);
        for (;;) {
            const event = await this.next(signal);
            if (event === undefined) {
                return;
            }

            const step = this.eventStep(event);
            yield* step.events;
            if (step.done) {
                return;
            }
        }
    }

    /**
     * Send the results of the last turn's calls, when it made any.
     * @param request - The turn, whose messages hold the results.
     */
    private answerOutstanding(request: TurnRequest): void {
        if (this.outstanding.length === 0) {
            return;
        }

        const results = new Map<string, LiveToolResult>();
        for (const part of request.messages.flatMap((message) => message.parts)) {
            if (part.type === "tool-result") {
                results.set(part.callId, part);
            }
        }

        this.send(this.outstanding.flatMap((call) => results.get(call.id) ?? []));
    }

    /**
     * What one response event yields, and whether the turn ends with it.
     * @param event - The event.
     * @returns The turn events, and whether the turn is done.
     */
    private eventStep(event: LiveEvent): { events: TurnEvent[]; done: boolean } {
        switch (event.type) {
            case "answer-text":
                return { events: [{ type: "text", delta: event.delta }], done: false };
            case "usage":
                return { events: [event], done: false };
            case "tool-calls":
                return { events: this.takeCalls(event.calls), done: false };
            case "response-end":
                return this.responseEnd();
            case "interrupted":
                // Cut off: the answer is kept as far as it was heard.
                this.read();
                return { events: [{ type: "finish", reason: "stop" }], done: true };
            case "closed":
                return {
                    events: [
                        {
                            type: "error",
                            code: event.code,
                            params: event.params,
                            cause: new Error("The live connection closed."),
                        },
                    ],
                    done: true,
                };
            default:
                return { events: [], done: false };
        }
    }

    /**
     * The model's calls: reader_context is answered here, every other call goes to the loop.
     * @param calls - The calls.
     * @returns The tool-call events for the loop.
     */
    private takeCalls(calls: readonly LiveToolCall[]): TurnEvent[] {
        const events: TurnEvent[] = [];
        for (const call of calls) {
            if (call.name === READER_CONTEXT) {
                this.own.push(result(call.id, "AI_COMPLETED", {}, this.host.readerContext(this.reading?.pointing)));
            } else {
                this.outstanding.push(call);
                events.push({ type: "tool-call", ...call });
            }
        }

        return events;
    }

    /**
     * The end of one response: a turn of calls ends for the loop to run them; one that only read
     * reader_context goes on once the model reads it; an answer ends the message's reading.
     * @returns The turn events, and whether the turn is done.
     */
    private responseEnd(): { events: TurnEvent[]; done: boolean } {
        if (this.outstanding.length > 0) {
            return { events: [{ type: "finish", reason: "tool-calls" }], done: true };
        }

        if (this.own.length > 0) {
            // Only reader_context was called: the model goes on once it reads it.
            this.send([]);
            return { events: [], done: false };
        }

        this.read();
        return { events: [{ type: "finish", reason: "stop" }], done: true };
    }

    /** The message reading now read its last response: the next press's message may start. */
    private read(): void {
        if (this.reading !== undefined) {
            this.reading.read = true;
        }

        this.startNext(false);
    }

    /**
     * What the connection can do.
     * @returns Tool calls, and none of the provider's own tools.
     */
    capabilities(): EngineCapabilities {
        return { toolCalls: "available", hostedTools: NO_HOSTED_TOOLS };
    }

    /**
     * The key was accepted when the connection opened.
     * @returns `AI_COMPLETED`.
     */
    checkKey(): Promise<EngineOutcome> {
        return Promise.resolve({ code: "AI_COMPLETED", params: {} });
    }

    /** The connection is the live session's to close. */
    dispose(): void {
        // Nothing of its own.
    }
}
