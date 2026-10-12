/**
 * Live messages through graphty's own loop. A `LiveTurnEngine` is the `AiEngine` of the messages
 * spoken on one live connection: each provider response is one turn (the answer's transcript as
 * text, its tool calls, `finish` with `tool-calls` or `stop`), and each later turn sends the tool
 * results the loop appended. So `runConversation` runs a spoken message as it runs a typed one:
 * ordered calls, policy and gates, one undo step, history and events.
 *
 * The reader's final transcript starts a message. The provider's response events are buffered, so
 * a response that comes before its transcript, or one whose transcript never comes, loses nothing:
 * tool calls start the message at once (the words heard later are saved with it), and an answer
 * with neither starts it at the next press or when the connection closes. A held batch or a
 * question hands off: the provider gets the message's code for its open calls and the connection
 * closes after that response, so the turns path answers what is pending. Reached only by `import()`.
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
     * @param heard - The words heard after the message started without them.
     */
    run(text: string, pointing: AiPointing | undefined, heard: () => string): Promise<ExecutionResult>;
    /** What the reader points at in the press now. */
    pointing(): AiPointing | undefined;
    /** `reader_context`'s text. */
    readerContext(pointing: AiPointing | undefined): string;
    /** Close the connection (a hand-off to the turns path). */
    close(): void;
    /** A spoken message's outcome. */
    answered?(result: ExecutionResult): void;
}

/** The codes after which something waits on the reader, answered on the turns path. */
const HAND_OFF: ReadonlySet<string> = new Set(["AI_CONFIRMATION_NEEDED", "AI_QUESTION_ASKED"]);

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

/** The messages spoken on one live connection, run through graphty's loop. */
export class LiveTurnEngine implements AiEngine {
    readonly kind = "provider-api";
    /** Response events no turn has read yet. */
    private readonly queue: LiveEvent[] = [];
    private wake: (() => void) | undefined;
    /** The calls the loop was handed, whose results the next turn sends. */
    private outstanding: LiveToolCall[] = [];
    /** `reader_context` results, sent with the loop's. */
    private own: LiveToolResult[] = [];
    /** Counts spoken messages. */
    private messages = 0;
    /** The message that reads the responses now; 0 for none. */
    private consumer = 0;
    /** The running message started before its transcript: the words, once heard. */
    private unheard: { text: string } | undefined;
    /** What the running message's reader pointed at. */
    private pointing: AiPointing | undefined;
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
     * Talk was pressed: an answer being said is cut off, and a response with no transcript runs.
     */
    press(): void {
        if (this.answering) {
            this.heard({ type: "interrupted" });
        }

        this.flush();
    }

    /**
     * The connection closed: a buffered response still runs, and a turn waiting fails with the code.
     * @param code - Why.
     * @param params - The facts behind `code`.
     */
    closed(code: AiResultCode, params: AiResultParams): void {
        this.closedWith ??= { type: "closed", code, params };
        this.flush();
        this.wake?.();
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
                    if (this.unheard === undefined) {
                        this.start(event.text);
                    } else {
                        this.unheard.text = event.text;
                        this.unheard = undefined;
                    }
                }

                return;
            case "answer-text":
                this.answering = true;
                this.skipEnd = false;
                break;
            case "tool-calls":
                this.skipEnd = false;
                // Calls cannot wait for the words: the message starts, and saves them when they come.
                if (this.consumer === 0) {
                    this.start("");
                }

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
    }

    /** A whole response no message reads: it runs as a message whose words were not heard. */
    private flush(): void {
        if (
            this.consumer === 0 &&
            this.queue.some((event) => event.type === "response-end" || event.type === "interrupted")
        ) {
            this.start("");
        }
    }

    /**
     * Start one spoken message.
     * @param text - What the reader said; "" when not heard.
     */
    private start(text: string): void {
        const id = ++this.messages;
        this.consumer = id;
        const unheard = text === "" ? { text: "" } : undefined;
        this.unheard = unheard;
        this.pointing = this.host.pointing();
        void this.host
            .run(text, this.pointing, () => unheard?.text ?? "")
            .then((outcome) => {
                if (this.unheard === unheard) {
                    this.unheard = undefined;
                }

                if (this.consumer === id) {
                    this.consumer = 0;
                }

                this.ended(outcome);
            });
    }

    /**
     * A message ended: calls still open get its code, and something pending hands off.
     * @param outcome - The message's result.
     */
    private ended(outcome: ExecutionResult): void {
        const code = outcome.code ?? "AI_COMPLETED";
        const open = this.outstanding.map((call) => result(call.id, code, outcome.params ?? {}));
        this.send(open);
        if (HAND_OFF.has(code) && this.closedWith === undefined) {
            if (open.length === 0) {
                this.host.close();
            } else {
                this.handingOff = true;
            }
        }

        this.host.answered?.(outcome);
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
        if (this.outstanding.length > 0) {
            const results = new Map<string, LiveToolResult>();
            for (const part of request.messages.flatMap((message) => message.parts)) {
                if (part.type === "tool-result") {
                    results.set(part.callId, part);
                }
            }

            this.send(this.outstanding.flatMap((call) => results.get(call.id) ?? []));
        }

        for (;;) {
            const event = await this.next(signal);
            if (event === undefined) {
                this.consumer = 0;
                return;
            }

            switch (event.type) {
                case "answer-text":
                    yield { type: "text", delta: event.delta };
                    break;
                case "usage":
                    yield event;
                    break;
                case "tool-calls":
                    for (const call of event.calls) {
                        if (call.name === READER_CONTEXT) {
                            this.own.push(result(call.id, "AI_COMPLETED", {}, this.host.readerContext(this.pointing)));
                        } else {
                            this.outstanding.push(call);
                            yield { type: "tool-call", ...call };
                        }
                    }

                    break;
                case "response-end":
                    if (this.outstanding.length > 0) {
                        yield { type: "finish", reason: "tool-calls" };
                        return;
                    }

                    if (this.own.length > 0) {
                        // Only reader_context was called: the model goes on once it reads it.
                        this.send([]);
                        break;
                    }

                    this.consumer = 0;
                    yield { type: "finish", reason: "stop" };
                    return;
                case "interrupted":
                    // Cut off: the answer is kept as far as it was heard.
                    this.consumer = 0;
                    yield { type: "finish", reason: "stop" };
                    return;
                case "closed":
                    this.consumer = 0;
                    yield {
                        type: "error",
                        code: event.code,
                        params: event.params,
                        cause: new Error("The live connection closed."),
                    };
                    return;
                default:
                    break;
            }
        }
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
