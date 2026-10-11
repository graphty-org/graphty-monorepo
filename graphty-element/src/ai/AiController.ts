/**
 * AI Controller Module - Orchestrates LLM providers and command execution.
 * @module ai/AiController
 */

import {
    AI_CONVERSATION_FORMAT,
    AI_CONVERSATION_FORMAT_VERSION,
    type AiResultCode,
    type AiResultParams,
} from "../catalog/ai";
import type { AiApprovalRequest, AiEvent, AiQuestionRequest } from "../events";
import { GraphtyLogger, type Logger } from "../logging";
import type { GraphSession } from "../session/types";
import { type AiStatus, AiStatusManager, type StatusChangeCallback } from "./AiStatus";
import type { CommandRegistry } from "./commands";
import type { CommandContext, CommandResult } from "./commands/types";
import {
    type ConversationStore,
    type ConversationStoreChange,
    openConversationStore,
    STORE_OVERRIDE,
} from "./conversation/Conversation";
import type { ConversationRecord } from "./conversation/formats";
import type { SavedPending } from "./conversation/formats/v1";
import { conversationToReopen } from "./conversation/scope";
import {
    type AiConversationSnapshot,
    type AiConversationSummary,
    approvalRequest,
    conversationSnapshot,
    conversationSummary,
    questionRequest,
    type SavedApproval,
    type SavedQuestion,
    waitingApprovals,
    waitingQuestions,
} from "./conversation/snapshot";
import { ENGINE_OVERRIDE, engineFor } from "./engine/load";
import type { AiEngine, SavedMessage } from "./engine/types";
import type { LlmProvider } from "./providers/types";
import {
    ASK_READER,
    type AskedQuestion,
    closingResults,
    type Conversation,
    type DecidedBatch,
    MessageRolledBack,
    runConversation,
    TurnFailed,
} from "./runConversation";
import { toSafeError } from "./safeError";
import type { SchemaManager } from "./schema";
import type { HeldBatch, Outcome, ToolCallRequest } from "./ToolExecutor";
import { hasAssistantTools, installAssistantTools } from "./tools/install";
import { assistantInstructions, factsBlock } from "./tools/prompt";
import { isAssistantTool } from "./tools/toolset";
import {
    type AiApprovalVerdict,
    type AiToolCallFacts,
    type AssistantGateLimits,
    DEFAULT_ASSISTANT_GATE_LIMITS,
    type GateKind,
    type JsonObject,
    type MessageState,
} from "./tools/types";

export type { AiApprovalVerdict, AiToolCallFacts } from "./tools/types";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "ai"]);

/**
 * An id no other message, conversation or page load gives: a prefix and 128 random bits. A
 * message's id is stamped on its steps' provenance, so it must stay unique across reloads.
 * @param prefix - What kind of id it is.
 * @returns The id.
 */
function uniqueId(prefix: string): string {
    // getRandomValues, unlike randomUUID, is there on a page served over plain http too.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return prefix + Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Whether one of a message's steps has been undone.
 * @param session - The session.
 * @param message - The message's number.
 * @returns True when a step it recorded is past the history's cursor.
 */
function undoneStepOf(session: GraphSession, message: string): boolean {
    const { steps, position } = session.history;
    return steps.slice(position).some((step) => step.provenance.message === message);
}

/**
 * Take back what a message recorded: undo its steps while one of them is what the next undo would
 * undo. Stops at a step of anyone else's, or at pending work, which the person's own later edit
 * is: reverting under it could clobber it, so the message's older steps stay, undoable in order.
 * @param session - The session.
 * @param message - The message's number.
 * @returns How many of the message's steps remain applied: zero when it was taken back whole.
 */
async function revertMessage(session: GraphSession, message: string): Promise<number> {
    for (;;) {
        const next = session.history.nextUndo;
        if (next?.kind !== "undo" || next.step.provenance.message !== message) {
            const { steps, position } = session.history;
            return steps.slice(0, position).filter((step) => step.provenance.message === message).length;
        }

        await session.undo();
    }
}

/**
 * A batch held for the host's approval. Its message waits, holding no transaction, until an event
 * ends the request: a decision, a new message, a cancel, or an undo of the message's step.
 */
interface PendingApproval {
    /** The message's id, its steps' provenance. */
    readonly message: string;
    /** The reader's request: the message's undo label and the text an import URL must appear in. */
    readonly label: string;
    readonly held: HeldBatch;
    /** Set when the history changed the graph since the hold: the request is stale. */
    readonly changed: { value: boolean };
    /** The conversation, ending in the held calls, which the decision continues. */
    readonly conversation: Conversation;
    /** The saved conversation it belongs to, with history. */
    readonly conversationId: string | undefined;
    readonly stopWatching: () => void;
    /** What the host was asked, as `getPendingAiApprovals` returns it. */
    readonly request: AiApprovalRequest;
    /** The graph when it was held, which a request reopened after a reload is checked against. */
    readonly graph: HeldGraph;
    /** Reopened from the saved conversation, rather than held by this controller. */
    readonly replayed: boolean;
}

/**
 * A question the model asked the reader. Its message waits, holding no transaction, until an event
 * ends it: an answer, a new message, a cancel, or an undo of the message's step.
 */
interface PendingQuestion {
    /** The message's id, its steps' provenance. */
    readonly message: string;
    /** The reader's request: the message's undo label. */
    readonly label: string;
    /** The `ask_reader` call the answer becomes the result of. */
    readonly call: ToolCallRequest;
    /** The conversation, ending in the call, which the answer continues. */
    readonly conversation: Conversation;
    /** The saved conversation it belongs to, with history. */
    readonly conversationId: string | undefined;
    readonly stopWatching: () => void;
    /** What the host was asked, as `getPendingAiQuestions` returns it. */
    readonly request: AiQuestionRequest;
}

/** Whatever waits on the reader: an approval request or a question. */
type OpenPending = PendingApproval | PendingQuestion;

/**
 * The calls an open request's message ends in, which its ending answers.
 * @param pending - The request.
 * @returns The calls.
 */
function waitingCalls(pending: OpenPending): readonly ToolCallRequest[] {
    return "held" in pending ? pending.held.calls : [pending.call];
}

/**
 * The choices an answer picks, when they are among the question's.
 * @param request - The question.
 * @param answer - The answer: one choice, or several for a question that takes several.
 * @returns The choices, or undefined when the answer is not one of them.
 */
function pickedChoices(request: AiQuestionRequest, answer: string | readonly string[]): string[] | undefined {
    const values = typeof answer === "string" ? [answer] : [...answer];
    const valid =
        values.length > 0 &&
        (request.multiple || values.length === 1) &&
        new Set(values).size === values.length &&
        values.every((value) => request.choices.includes(value));
    return valid ? values : undefined;
}

/** The graph a request was held against, as its saved entry records it. */
type HeldGraph = SavedApproval["graph"];

/**
 * No changes counted yet: the totals a reopened request's message starts from. They are not saved,
 * so after a reload the large-change gate counts the message's later batches from zero.
 */
const NO_TOTALS: MessageState["totals"] = { removeNodes: 0, removeEdges: 0, changedValues: 0 };

/** Which of the assistant's calls the reader is asked about before they run. */
export type AiApprovalsSetting =
    | "none"
    | "writes"
    | { readonly ask: readonly string[] }
    | { readonly policy: (call: AiToolCallFacts) => AiApprovalVerdict };

/** The reader's answer to an approval request. */
export interface AiApprovalAnswer {
    /** True to run the held calls. */
    readonly approve: boolean;
    /**
     * The calls as the reader edited them, by position; a call left out, or without `arguments`,
     * runs as the model made it. Edited arguments are checked as the model's are: invalid ones
     * run nothing (`AI_TOOL_INVALID_ARGUMENTS`).
     */
    readonly calls?: readonly { readonly arguments?: Readonly<Record<string, unknown>> }[];
}

/**
 * The policy a setting stands for.
 * @param approvals - The setting.
 * @returns The policy, or undefined for none.
 */
function policyOf(approvals: AiApprovalsSetting | undefined): MessageState["policy"] {
    if (approvals === undefined || approvals === "none") {
        return undefined;
    }

    if (approvals === "writes") {
        return (call) => (call.effect === "write" ? "ask" : "allow");
    }

    if ("ask" in approvals) {
        const ask = new Set(approvals.ask);
        return (call) => (ask.has(call.command) ? "ask" : "allow");
    }

    return approvals.policy;
}

/**
 * Held calls with the reader's edits applied.
 * @param calls - The calls as the model made them.
 * @param edits - The reader's edits, by position.
 * @returns The calls to run.
 */
function edited(calls: readonly ToolCallRequest[], edits: AiApprovalAnswer["calls"]): ToolCallRequest[] {
    return calls.map((call, index) => {
        const args = edits?.[index]?.arguments;
        return args === undefined ? call : { ...call, arguments: args };
    });
}

/**
 * The reader's request a held message answered: the reader's text of the last user message before it.
 * @param messages - The conversation.
 * @param messageId - The message holding the calls.
 * @returns The text, or empty when there is none.
 */
function readerTextBefore(messages: readonly SavedMessage[], messageId: string): string {
    const end = messages.findIndex((message) => message.id === messageId);
    const user = messages
        .slice(0, end === -1 ? messages.length : end)
        .reverse()
        .find((message) => message.role === "user" && message.parts.some((part) => part.origin === "reader"));
    return (user?.parts ?? [])
        .flatMap((part) => (part.type === "text" && part.origin === "reader" ? [part.text] : []))
        .join("\n");
}

/** How a message is run: a new one, or a held one continued after the reader's decision. */
interface MessageRun {
    readonly input: string;
    readonly message: string;
    readonly abortController: AbortController;
    readonly conversation: (session: GraphSession) => Conversation;
    /** The saved conversation it belongs to, with history. */
    readonly conversationId: string | undefined;
    /** For a continuation: the decided batch, and the message's totals before it. */
    readonly decided?: DecidedBatch;
    readonly totals?: MessageState["totals"];
    /** For a continuation: the request it answers, which its result names unless it names a newer one. */
    readonly request?: string;
    /** For an answered question: its call, and the choices the reader picked. */
    readonly answer?: { readonly call: ToolCallRequest; readonly values: readonly string[] };
}

/**
 * What a settled turn of the controller's queue resolves to, however it ended.
 * @returns Nothing.
 */
function settled(): undefined {
    return undefined;
}

/**
 * The history changes that change what a held batch was measured against: a step recorded,
 * merged, undone, redone or restored, or the history cleared. A live layout's pending work and the
 * history's own memory upkeep (`pending`, `size`, `evict`) change no part of the graph a project
 * saves, so they leave a request fresh.
 */
const GRAPH_CHANGES: ReadonlySet<string> = new Set(["record", "merge", "undo", "redo", "restore", "clear"]);

/** Event emitter callback type */
export type AiEventEmitter = (event: AiEvent) => void;

/** Where the assistant keeps its conversations, and how much of one a turn is shown. */
export interface AiHistoryOptions {
    /** `"memory"` keeps them while the page lives; `"browser"` keeps them in IndexedDB, across reloads. */
    readonly store: "memory" | "browser";
    /**
     * The scope conversations are saved and listed under. Default: the element's `id` and the
     * page's path, so two elements, or two pages, keep their conversations apart.
     */
    readonly key?: string;
    /**
     * The host's name for the loaded data. The conversation reopened at `enableAiControl` is the
     * newest of the scope whose `dataKey` matches; without one, whose graph fingerprint matches.
     */
    readonly dataKey?: string;
    /** The IndexedDB database, for `"browser"`. Default `"graphty-ai"`. */
    readonly database?: string;
    /**
     * How many tokens of the conversation a turn is shown (counted as characters / 4); older
     * exchanges drop out of what the model sees, never out of what is saved. Default 16,000, or
     * 3,000 for the small tool profile.
     */
    readonly budgetTokens?: number;
}

/** Options a message is sent with. */
export interface AiCommandOptions {
    /**
     * The saved conversation to send it into, which becomes the open one. An id that is not saved,
     * or any id when the assistant keeps no history, resolves `AI_HISTORY_UNAVAILABLE` with
     * `{ reason: "unknown-conversation" }`.
     */
    readonly conversation?: string;
    /** How the reader gave the message: typed (`"text"`, the default) or spoken (`"voice"`). */
    readonly via?: "text" | "voice";
}

/**
 * The history options a setting stands for.
 * @param history - The setting.
 * @returns The options, or undefined for none.
 */
function historyOptionsOf(history: AiControllerOptions["history"]): AiHistoryOptions | undefined {
    if (history === undefined || history === "none") {
        return undefined;
    }

    return typeof history === "string" ? { store: history } : history;
}

/** What `aiCommand` resolves for a conversation it cannot open. */
const UNKNOWN_CONVERSATION: ExecutionResult = {
    success: false,
    message: "",
    code: "AI_HISTORY_UNAVAILABLE",
    params: { reason: "unknown-conversation" },
};

/** Options for creating an AiController */
export interface AiControllerOptions {
    /** The LLM provider to use */
    provider: LlmProvider;
    /** The command registry containing available commands */
    commandRegistry: CommandRegistry;
    /** The graph instance to operate on */
    graph: CommandContext["graph"];
    /** Optional event emitter for AI events */
    emitEvent?: AiEventEmitter;
    /** Optional schema manager for data schema in prompts */
    schemaManager?: SchemaManager | null;
    /**
     * Which tools a model is offered when the registry holds the generated ones: `"standard"` (the
     * core tools plus those a catalog search loads) or `"small"` (catalog, query, call and undo,
     * for a model that breaks past a handful of tools). Default `"standard"`.
     */
    toolProfile?: "standard" | "small";
    /**
     * The limits past which the assistant's changes are held for the reader's approval
     * (`ai-approval-requested`), or `false` to run every change without asking. Default
     * `DEFAULT_ASSISTANT_GATE_LIMITS`.
     */
    gate?: Partial<AssistantGateLimits> | false;
    /**
     * Admits a URL the reader did not type for an import; an admitted URL is still held for
     * approval. Absent, only URLs in the reader's own message are imported.
     */
    allowImportUrl?: (url: URL) => boolean;
    /**
     * Whether the assistant keeps one conversation across messages: `"none"` (the default: every
     * message starts afresh), `"memory"`, `"browser"`, or the options.
     */
    history?: "none" | "memory" | "browser" | AiHistoryOptions;
    /** The configured API keys, kept out of every saved or exported conversation. */
    secrets?: () => readonly string[];
    /**
     * Which calls the reader is asked about before they run: `"none"` (the default), `"writes"`
     * (every call that changes the project), `{ ask }` (calls to these tools) or `{ policy }`
     * (`"allow"`, `"ask"` or `"deny"` per call). An ask holds the batch (`ai-approval-requested`,
     * gate `"policy"`); a deny refuses it (`AI_TOOL_DENIED_BY_POLICY`). The gate's limits apply too.
     */
    approvals?: AiApprovalsSetting;
    /**
     * Whether the model may ask the reader a question with a few choices (`ai-question-asked`,
     * answered with `answerAiQuestion`). Default false: the model is offered no such tool.
     */
    questions?: boolean;
}

/** Combined result from execution */
export interface ExecutionResult extends CommandResult {
    /** Raw response text from LLM (if any) */
    llmText?: string;
    /**
     * What happened, as a stable code to switch on; `AI_RESULT_CODES` in `./catalog` lists them all.
     * Every result the element returns sets it.
     */
    code?: AiResultCode;
    /** The facts behind the code (a provider id, a tool name, an HTTP status); empty when there are none. */
    params?: AiResultParams;
}

/**
 * Controller that orchestrates LLM providers and command execution.
 * Manages the conversation flow, command dispatch, and status updates.
 */
export class AiController {
    private readonly engine: AiEngine;
    private commandRegistry: CommandRegistry;
    private graph: CommandContext["graph"];
    private statusManager: AiStatusManager;
    private schemaManager: SchemaManager | null;
    /** The messages running now, each with its request: several may run at once. */
    private readonly running = new Map<AbortController, string>();
    private disposed = false;
    private emitEvent: AiEventEmitter | undefined;
    private lastInput: string | null = null;
    private lastError: Error | null = null;
    /** The messages `cancel()` ended, so their results say cancelled, not undone. */
    private readonly cancelled = new WeakSet<AbortController>();
    /** Batches held for approval, by request id, until an event ends each. */
    private readonly approvals = new Map<string, PendingApproval>();
    /** Questions asked of the reader, by id, until an event ends each. */
    private readonly questions = new Map<string, PendingQuestion>();
    /** Whether the model may ask the reader questions. */
    private readonly asks: boolean;
    private readonly policy: MessageState["policy"];
    private readonly profile: "standard" | "small";
    private readonly gate: Readonly<AssistantGateLimits> | false;
    private readonly allowImportUrl: ((url: URL) => boolean) | undefined;
    /** Runs the assistant started, which it may cancel without asking. */
    private readonly assistantRuns = new Set<string>();
    /**
     * The controller's turns, one at a time: a message, or an approval, waits for the one before
     * it, so two never write into each other's transactions or share the status.
     */
    private queue: Promise<unknown>;
    /** Where conversations are kept, and how; undefined when none are. */
    private readonly history: AiHistoryOptions | undefined;
    private readonly secrets: () => readonly string[];
    /** The open history store, once opened. */
    private store: ConversationStore | undefined;
    private stopStore = (): void => undefined;
    /** The open conversation, as last saved or loaded. */
    private current: ConversationRecord | undefined;
    /** Settles once the store is open and the conversation reopened. */
    private readonly opened: Promise<void>;
    /** Who this controller is, when it claims a saved request to resolve it. */
    private readonly claimant = uniqueId("ctl_");
    /** A store handed in instead of the one `history` names (tests, the regression harness). */
    private readonly storeOverride: ConversationStore | undefined;

    /**
     * Creates a new AiController instance.
     * @param options - Configuration options for the controller
     */
    constructor(options: AiControllerOptions) {
        // The regression harness's recording decorator comes in under an internal option.
        this.engine =
            (options as AiControllerOptions & { [ENGINE_OVERRIDE]?: AiEngine })[ENGINE_OVERRIDE] ??
            engineFor(options.provider);
        this.commandRegistry = options.commandRegistry;
        this.graph = options.graph;
        this.statusManager = new AiStatusManager();
        this.schemaManager = options.schemaManager ?? null;
        this.emitEvent = options.emitEvent;
        this.profile = options.toolProfile ?? "standard";
        this.gate = options.gate === false ? false : { ...DEFAULT_ASSISTANT_GATE_LIMITS, ...options.gate };
        this.allowImportUrl = options.allowImportUrl;
        this.policy = policyOf(options.approvals);
        this.asks = options.questions === true;
        this.history = historyOptionsOf(options.history);
        this.secrets = options.secrets ?? ((): readonly string[] => []);
        this.storeOverride = (options as AiControllerOptions & { [STORE_OVERRIDE]?: ConversationStore })[
            STORE_OVERRIDE
        ];
        this.opened = this.history === undefined ? Promise.resolve() : this.openHistory(this.history);
        // Every turn waits for the saved conversation.
        this.queue = this.opened;

        // Subscribe to status changes to emit events
        this.statusManager.subscribe((status) => {
            this.emitAiEvent({
                type: "ai-status-change",
                status,
            });
        });
    }

    /**
     * Emit an AI event if an emitter is configured.
     * @param event - The AI event to emit
     */
    private emitAiEvent(event: AiEvent): void {
        if (this.emitEvent) {
            this.emitEvent(event);
        }
    }

    /**
     * Execute a natural language command.
     * @param input - The user's natural language input
     * @param options - The conversation to send it into.
     * @returns Promise resolving to the execution result
     */
    async execute(input: string, options: AiCommandOptions = {}): Promise<ExecutionResult> {
        logger.debug("User input", { inputLength: input.length });

        if (this.disposed) {
            return {
                success: false,
                message: "Controller has been disposed",
                code: "AI_DISPOSED",
                params: {},
            };
        }

        // Track input for retry
        this.lastInput = input;

        // Registered now, so `cancel()` reaches a message still waiting for the one before it.
        const abortController = new AbortController();
        this.running.set(abortController, input);
        return this.enqueue(async () => {
            if (abortController.signal.aborted) {
                this.running.delete(abortController);
                return { success: false, message: "", code: "AI_CANCELLED", params: {} };
            }

            if (options.conversation !== undefined && !(await this.switchTo(options.conversation))) {
                this.running.delete(abortController);
                return UNKNOWN_CONVERSATION;
            }

            return this.executeNow(input, abortController, options.via);
        });
    }

    /**
     * Run a turn of the controller once the turns before it have settled.
     * @param turn - The turn.
     * @returns What the turn returned.
     */
    private enqueue<T>(turn: () => Promise<T>): Promise<T> {
        const result = this.queue.then(turn);
        this.queue = result.then(settled, settled);
        return result;
    }

    /**
     * Run one message, its turn come. A new message ends every request still waiting: the message
     * that made it ends there, without another model turn.
     * @param input - The reader's request.
     * @param abortController - The message's controller, which `cancel()` aborts.
     * @param via - How the reader gave it.
     * @returns The message's result.
     */
    private async executeNow(
        input: string,
        abortController: AbortController,
        via: AiCommandOptions["via"],
    ): Promise<ExecutionResult> {
        await this.supersedePending(true);

        this.emitAiEvent({ type: "ai-command-start", input, timestamp: Date.now() });
        return this.runMessage({
            input,
            message: uniqueId("msg_"),
            abortController,
            conversation: (session) => this.startConversation(input, session, via),
            conversationId: this.current?.id,
        });
    }

    /**
     * Run a message: a new one, or one continued after a decision.
     * @param run - What to run.
     * @returns The message's result.
     */
    private async runMessage(run: MessageRun): Promise<ExecutionResult> {
        const { input, message, abortController, decided, answer } = run;
        const startTime = Date.now();
        this.lastError = null;

        // Transition to submitted state
        this.statusManager.submit();

        // One message is one undoable step, made of short transactions: each batch of tool calls
        // the model returns runs in its own, which commits before the model is asked again, so
        // nothing is held while the model thinks and the person's own edits go through. Every
        // batch after the first continues the message's step (`after`), merging into it while it
        // is the newest step. An undo of one of its steps while the message is going ends it.
        let stopWatching = (): void => undefined;
        let conversation: Conversation | undefined;
        let base = 0;
        try {
            const session = this.graph.getSession();
            if (hasAssistantTools(this.commandRegistry)) {
                // A plugin registered since the last message reaches the model now.
                installAssistantTools(this.commandRegistry, session);
            }
            stopWatching = session.on("history:changed", () => {
                if (!abortController.signal.aborted && undoneStepOf(session, message)) {
                    abortController.abort(new DOMException("The message was undone.", "AbortError"));
                }
            });

            conversation = run.conversation(session);
            base = conversation.messages.length;
            const running = conversation;
            if (decided === undefined && answer === undefined) {
                // The reader's words are saved as the message starts, so a transcript shows them at once.
                await this.saveInto(run.conversationId, running.messages);
            }

            // A message taken back is not kept, so the conversation never holds changes the graph does not.
            let keep = true;
            let result: ExecutionResult;
            try {
                const emit = (event: AiEvent): void => {
                    this.emitAiEvent(event);
                };
                result = await runConversation({
                    conversation: running,
                    engine: this.engine,
                    tools: this.commandRegistry,
                    graph: this.graph,
                    session,
                    label: input,
                    message,
                    abort: abortController,
                    sink: { emit, status: this.statusManager },
                    profile: this.profile,
                    state: {
                        id: message,
                        gate: this.gate,
                        ...(this.policy === undefined ? {} : { policy: this.policy }),
                        runs: this.assistantRuns,
                        undoCalls: 0,
                        totals: { ...(run.totals ?? { removeNodes: 0, removeEdges: 0, changedValues: 0 }) },
                    },
                    host: {
                        emit,
                        readerText: input,
                        ...(this.allowImportUrl === undefined ? {} : { allowImportUrl: this.allowImportUrl }),
                    },
                    hold: (held, messageId) =>
                        this.hold({
                            held,
                            message,
                            label: input,
                            session,
                            conversation: running,
                            messageId,
                            conversationId: run.conversationId,
                        }),
                    ...(decided === undefined ? {} : { decided }),
                    ...(this.asks
                        ? {
                              ask: (question: AskedQuestion, messageId: string) =>
                                  this.ask({
                                      question,
                                      message,
                                      label: input,
                                      session,
                                      conversation: running,
                                      messageId,
                                      conversationId: run.conversationId,
                                  }),
                          }
                        : {}),
                    ...(answer === undefined ? {} : { answer: { callId: answer.call.id, values: answer.values } }),
                    newId: () => this.newMessageId(running),
                    ...(this.history?.budgetTokens === undefined
                        ? {}
                        : { historyBudgetTokens: this.history.budgetTokens }),
                });
            } catch (error) {
                // A tool threw, the message was cancelled or undone, or the model failed: what the
                // message's earlier batches recorded is taken back, as one transaction's rollback was.
                // The message's own revert is no undo by the reader: stop watching first, so it
                // does not read as one and hide why the message failed.
                stopWatching();
                stopWatching = (): void => undefined;
                const remaining = await revertMessage(session, message);
                if (!(error instanceof MessageRolledBack)) {
                    throw error;
                }

                keep = false;

                ({ result } = error);
                if (remaining > 0) {
                    result = { ...result, code: "AI_ROLLBACK_PARTIAL", params: { ...result.params, steps: remaining } };
                }
                // The batch's rollback aborts the message too, so only a cancel overrides the tool's code.
                if (this.cancelled.has(abortController)) {
                    result = { ...result, code: "AI_CANCELLED", params: {} };
                }
            }

            // Saved again when the message ends: never per streamed piece of text.
            if (keep) {
                await this.saveInto(run.conversationId, running.messages);
            } else {
                await this.saveUnkept(run, running, base, result);
            }

            if (run.request !== undefined) {
                result = { ...result, params: { request: run.request, ...result.params } };
            }

            // Complete
            this.statusManager.complete();

            // Emit complete event
            this.emitAiEvent({
                type: "ai-command-complete",
                result,
                duration: Date.now() - startTime,
            });

            return result;
        } catch (error) {
            // Any provider's error, a consumer's own included, may carry the prompt and the
            // response; only its name, message and stack go on.
            const original = error instanceof TurnFailed ? error.failure.cause : error;
            const errorObj = toSafeError(original);
            const errorMessage = errorObj.message;

            this.lastError = errorObj;

            this.statusManager.setError(errorObj, true);

            // Emit error event
            this.emitAiEvent({
                type: "ai-command-error",
                error: errorObj,
                input,
                canRetry: true,
            });

            const { code, params } = this.failureOutcome(error, abortController);
            const failed: ExecutionResult = {
                success: false,
                message: `Error: ${errorMessage}`,
                code,
                params: run.request === undefined ? params : { request: run.request, ...params },
            };
            if (conversation !== undefined) {
                await this.saveUnkept(run, conversation, base, failed);
            }

            return failed;
        } finally {
            stopWatching();
            this.running.delete(abortController);
        }
    }

    /**
     * A message that was taken back, or failed, keeps the reader's words and how it ended (an
     * `outcome` part), and a continued one still answers its held calls, so the saved record never
     * ends in calls without results.
     * @param run - The message.
     * @param conversation - Its conversation.
     * @param base - How many messages it had once the run's own reader message was added.
     * @param result - How the run ended.
     */
    private async saveUnkept(
        run: MessageRun,
        conversation: Conversation,
        base: number,
        result: ExecutionResult,
    ): Promise<void> {
        const code = result.code ?? "AI_FAILED";
        const calls = run.decided?.calls ?? (run.answer === undefined ? [] : [run.answer.call]);
        const closing =
            calls.length === 0 ? [] : [closingResults(calls, { code, params: {} }, this.newMessageId(conversation))];
        await this.saveInto(run.conversationId, [
            ...conversation.messages.slice(0, base),
            ...closing,
            {
                id: this.newMessageId(conversation),
                role: "assistant",
                parts: [{ type: "outcome", origin: "graphty", code, params: result.params ?? {} }],
            },
        ]);
    }

    /**
     * Why a message that was aborted ended.
     * @param abortController - The message's abort controller.
     * @returns Cancelled when `cancel()` ended it, undone otherwise.
     */
    private abortOutcome(abortController: AbortController): Outcome {
        return { code: this.cancelled.has(abortController) ? "AI_CANCELLED" : "AI_UNDONE", params: {} };
    }

    /**
     * Why a message that threw failed.
     * @param error - What the loop threw.
     * @param abortController - The message's abort controller.
     * @returns The code and its facts.
     */
    private failureOutcome(error: unknown, abortController: AbortController): Outcome {
        if (abortController.signal.aborted) {
            return this.abortOutcome(abortController);
        }

        if (error instanceof TurnFailed) {
            const { code, params } = error.failure;
            return { code, params };
        }

        return { code: "AI_FAILED", params: {} };
    }

    /**
     * Store a held batch and ask the host about it. The request stays open until an event ends it;
     * an undo of the message's step is one.
     * @param hold - The batch and the message it belongs to.
     * @param hold.held - The batch.
     * @param hold.message - The message's id.
     * @param hold.label - The message's text, its step's label.
     * @param hold.session - The session, whose history changes make the request stale.
     * @param hold.conversation - The conversation, ending in the held calls.
     * @param hold.messageId - The conversation message holding the calls.
     * @param hold.conversationId - The saved conversation, with history.
     * @returns The request's id, once the conversation holding it is saved and the host told.
     */
    private async hold(hold: {
        held: HeldBatch;
        message: string;
        label: string;
        session: GraphSession;
        conversation: Conversation;
        messageId: string;
        conversationId: string | undefined;
    }): Promise<string> {
        const { held, message, session, conversationId } = hold;
        const id = uniqueId("approval_");
        const changed = { value: false };
        const stopWatching = session.on("history:changed", ({ reason }) => {
            changed.value ||= GRAPH_CHANGES.has(reason);
            if (undoneStepOf(session, message)) {
                const pending = this.closePending(id, { code: "AI_UNDONE", params: {} });
                void this.enqueue(() => this.saveClosed(pending));
            }
        });
        const createdAt = new Date().toISOString();
        const graph = this.heldGraph();
        const request: AiApprovalRequest = {
            id,
            gate: held.gate,
            calls: held.calls.map((call) => ({ tool: call.name, arguments: call.arguments })),
            preview: held.preview,
            ...(conversationId === undefined ? {} : { conversationId }),
            messageId: hold.messageId,
            createdAt,
        };
        this.approvals.set(id, {
            message,
            label: hold.label,
            held,
            changed,
            conversation: hold.conversation,
            conversationId,
            stopWatching,
            request,
            graph,
            replayed: false,
        });
        this.updatePending();
        // The message holding the calls and the request are saved together, before the host hears
        // of it: a reload after the event always finds the request.
        const entry: SavedPending = {
            kind: "approval",
            id,
            messageId: hold.messageId,
            gate: held.gate,
            calls: held.calls.map((call) => ({ callId: call.id, command: call.name, arguments: call.arguments })),
            preview: held.preview,
            graph,
            historyRevision: session.history.position,
            claim: null,
            createdAt,
        };
        await this.saveInto(conversationId, hold.conversation.messages, (pending) => [...pending, entry]);
        this.emitAiEvent({ type: "ai-approval-requested", request, replayed: false });
        return id;
    }

    /**
     * Store a question the model asked and ask the host it. The question stays open until an event
     * ends it; an undo of the message's step is one.
     * @param ask - The question and the message it belongs to.
     * @param ask.question - The question.
     * @param ask.message - The message's id.
     * @param ask.label - The message's text, its step's label.
     * @param ask.session - The session, whose undo of the message ends the question.
     * @param ask.conversation - The conversation, ending in the question's call.
     * @param ask.messageId - The conversation message holding the call.
     * @param ask.conversationId - The saved conversation, with history.
     * @returns The question's id, once the conversation holding it is saved and the host told.
     */
    private async ask(ask: {
        question: AskedQuestion;
        message: string;
        label: string;
        session: GraphSession;
        conversation: Conversation;
        messageId: string;
        conversationId: string | undefined;
    }): Promise<string> {
        const { question, message, session, conversationId } = ask;
        const id = uniqueId("question_");
        const stopWatching = session.on("history:changed", () => {
            if (undoneStepOf(session, message)) {
                const pending = this.closePending(id, { code: "AI_UNDONE", params: {} });
                void this.enqueue(() => this.saveClosed(pending));
            }
        });
        const createdAt = new Date().toISOString();
        const entry: SavedQuestion = {
            kind: "question",
            id,
            messageId: ask.messageId,
            callId: question.call.id,
            question: question.question,
            choices: [...question.choices],
            multiple: question.multiple,
            claim: null,
            createdAt,
        };
        const { conversationId: _none, ...unsaved } = questionRequest(entry, "");
        const request = conversationId === undefined ? unsaved : questionRequest(entry, conversationId);

        this.questions.set(id, {
            message,
            label: ask.label,
            call: question.call,
            conversation: ask.conversation,
            conversationId,
            stopWatching,
            request,
        });
        this.updatePending();
        // Saved before the host hears of it: a reload after the event always finds the question.
        await this.saveInto(conversationId, ask.conversation.messages, (pending) => [...pending, entry]);
        this.emitAiEvent({ type: "ai-question-asked", request, replayed: false });
        return id;
    }

    /**
     * Tell the status how many requests and questions wait on the reader.
     */
    private updatePending(): void {
        this.statusManager.setPending(this.approvals.size, this.questions.size);
    }

    /**
     * The loaded graph, as a held request records it.
     * @returns Its data key, fingerprint and counts.
     */
    private heldGraph(): HeldGraph {
        const { counts } = this.graph.getSession().status;
        return { ...this.graphFacts(), nodes: counts.nodes, edges: counts.edges };
    }

    /**
     * Reopen the requests a saved conversation still waits on, as if this controller had held
     * them, and ask the host about each again (`replayed: true`) in a task after the store opened,
     * so a listener added once `enableAiControl` resolves hears them.
     * @param record - The conversation.
     */
    private reopenPending(record: ConversationRecord): void {
        const reopened = waitingApprovals(record).map((entry) => this.reopenOne(record, entry));
        const asked = waitingQuestions(record).map((entry) => this.reopenQuestion(record, entry));
        if (reopened.length + asked.length === 0) {
            return;
        }

        this.updatePending();
        setTimeout(() => {
            // Answered, or ended, before the host was told again: nothing to ask.
            for (const pending of reopened) {
                if (this.approvals.get(pending.request.id) === pending) {
                    this.emitAiEvent({ type: "ai-approval-requested", request: pending.request, replayed: true });
                }
            }

            for (const pending of asked) {
                if (this.questions.get(pending.request.id) === pending) {
                    this.emitAiEvent({ type: "ai-question-asked", request: pending.request, replayed: true });
                }
            }
        }, 0);
    }

    /**
     * One saved question, open again.
     * @param record - Its conversation.
     * @param entry - The question.
     * @returns The open question.
     */
    private reopenQuestion(record: ConversationRecord, entry: SavedQuestion): PendingQuestion {
        const messages = [...record.messages];
        const call = messages
            .flatMap((message) => message.parts)
            .find((part) => part.type === "tool-call" && part.callId === entry.callId);
        const pending: PendingQuestion = {
            message: entry.messageId,
            label: readerTextBefore(messages, entry.messageId),
            call: {
                id: entry.callId,
                name: ASK_READER,
                arguments: call?.type === "tool-call" ? call.arguments : {},
            },
            conversation: { system: this.systemPrompt(), messages },
            conversationId: record.id,
            stopWatching: () => undefined,
            request: questionRequest(entry, record.id),
        };
        this.questions.set(entry.id, pending);
        return pending;
    }

    /**
     * One saved request, open again.
     * @param record - Its conversation.
     * @param entry - The request.
     * @returns The open request.
     */
    private reopenOne(record: ConversationRecord, entry: SavedApproval): PendingApproval {
        const messages = [...record.messages];
        const pending: PendingApproval = {
            // The message's undo step went with the page: its calls start a step of their own.
            message: entry.messageId,
            label: readerTextBefore(messages, entry.messageId),
            held: {
                gate: entry.gate as GateKind,
                preview: entry.preview as JsonObject,
                calls: entry.calls.map((call) => ({ id: call.callId, name: call.command, arguments: call.arguments })),
                totals: { ...NO_TOTALS },
            },
            changed: { value: false },
            conversation: { system: this.systemPrompt(), messages },
            conversationId: record.id,
            stopWatching: () => undefined,
            request: approvalRequest(entry, record.id),
            graph: entry.graph,
            replayed: true,
        };
        this.approvals.set(entry.id, pending);
        return pending;
    }

    /**
     * Claim a saved request in the store, so it runs, or ends, once however many tabs answer it.
     * @param id - The request's id.
     * @param pending - The request.
     * @returns `"lost"` when another instance claimed it first, `"failed"` when the store could not say.
     */
    private async claim(id: string, pending: OpenPending): Promise<"won" | "lost" | "failed"> {
        const { store } = this;
        if (store === undefined || pending.conversationId === undefined) {
            return "won";
        }

        try {
            const claimed = await store.claim(pending.conversationId, id, this.claimant);
            if (this.current?.id === pending.conversationId) {
                // The claim moved the record's revision; a lost one means another copy moved it further.
                this.current = claimed ?? (await store.load(pending.conversationId)) ?? this.current;
            }

            return claimed === undefined ? "lost" : "won";
        } catch {
            return "failed";
        }
    }

    /**
     * Whether the graph changed under a request: while this controller lives, any change to the
     * history since the hold; after a reload, a different fingerprint or a different `dataKey`
     * (the same name may stand for edited data, and a new name for the same data is a change too).
     * @param pending - The request.
     * @returns The facts of the change, or undefined when the request is fresh.
     */
    private graphChange(pending: PendingApproval): AiResultParams | undefined {
        if (!pending.replayed) {
            return pending.changed.value ? {} : undefined;
        }

        const now = this.heldGraph();
        const held = pending.graph;
        const changed = held.fingerprint !== now.fingerprint || held.dataKey !== now.dataKey;
        return changed
            ? { nodes: now.nodes, edges: now.edges, heldNodes: held.nodes, heldEdges: held.edges }
            : undefined;
    }

    /**
     * End an open request: it is no longer pending, and the host hears how it ended.
     * @param id - The request's id.
     * @param outcome - How it ended.
     * @returns The request, or undefined when none is open under that id.
     */
    private endPending(id: string, outcome: Outcome): OpenPending | undefined {
        const kind = this.questions.has(id) ? "question" : "approval";
        const pending = this.approvals.get(id) ?? this.questions.get(id);
        if (pending === undefined) {
            return undefined;
        }

        this.approvals.delete(id);
        this.questions.delete(id);
        pending.stopWatching();
        const { current } = this;
        if (current !== undefined && current.id === pending.conversationId) {
            // Saved with the conversation's next save.
            this.current = { ...current, pending: current.pending.filter((entry) => entry.id !== id) };
        }

        this.updatePending();
        this.emitAiEvent({
            type: "ai-pending-resolved",
            id,
            kind,
            code: outcome.code,
            params: outcome.params,
        });
        return pending;
    }

    /**
     * End an open request without a decision: its held calls are answered with why they did not
     * run, and its message ends there, with no further model turn.
     * @param id - The request's id.
     * @param outcome - Why it ended.
     * @returns The request, its conversation closed, or undefined when none is open.
     */
    private closePending(id: string, outcome: Outcome): OpenPending | undefined {
        const pending = this.endPending(id, outcome);
        if (pending !== undefined) {
            const { conversation } = pending;
            conversation.messages.push(closingResults(waitingCalls(pending), outcome, this.newMessageId(conversation)));
        }

        return pending;
    }

    /**
     * Save a closed request's conversation, with history: claimed first, so a request another tab
     * is running is not also closed here (its calls would have two results).
     * @param pending - The request, or undefined for none.
     * @returns When saved.
     */
    private async saveClosed(pending: OpenPending | undefined): Promise<void> {
        if (pending === undefined) {
            return;
        }

        const { id } = pending.request;
        if ((await this.claim(id, pending)) === "lost") {
            return;
        }

        await this.saveInto(pending.conversationId, pending.conversation.messages, (entries) =>
            entries.filter((entry) => entry.id !== id),
        );
    }

    /**
     * Answer an approval request. The message that made it continues: approve runs the held calls
     * (as edited) as one more batch of its undo step; deny, or an answer after the graph changed,
     * tells the model why they did not run. Either way the model then answers, as in any message.
     * @param id - The request's id, from `ai-approval-requested`.
     * @param answer - The reader's answer.
     * @returns The message's final result: `AI_COMPLETED`, `AI_APPROVAL_DENIED` or
     *     `AI_APPROVAL_STALE` (with the model's answer in `llmText`), `AI_CONFIRMATION_NEEDED` when
     *     another limit holds the calls again, or a failure; `AI_APPROVAL_STALE` with
     *     `reason: "expired"` when no such request is open.
     */
    resolveAiApproval(id: string, answer: AiApprovalAnswer): Promise<ExecutionResult> {
        // An answer given while its message still runs (from inside the listener) waits for it.
        return this.enqueue(() => this.resolveNow(id, answer));
    }

    /**
     * Answer an approval request, its turn come.
     * @param id - The request's id.
     * @param answer - The reader's answer.
     * @returns The message's final result.
     */
    private async resolveNow(id: string, answer: AiApprovalAnswer): Promise<ExecutionResult> {
        const pending = this.approvals.get(id);
        if (pending === undefined) {
            return {
                success: false,
                message: "",
                code: "AI_APPROVAL_STALE",
                params: { request: id, reason: "expired" },
            };
        }

        // Claimed first: of several tabs answering one request, one runs it.
        const claimed = await this.claim(id, pending);
        if (claimed === "failed") {
            // The store cannot say who runs it: nothing runs, and the request stays open.
            return { success: false, message: "", code: "AI_STORAGE_FAILED", params: { request: id } };
        }

        if (claimed === "lost") {
            const params = { request: id, reason: "resolved-elsewhere" };
            this.endPending(id, { code: "AI_APPROVAL_STALE", params });
            return { success: false, message: "", code: "AI_APPROVAL_STALE", params };
        }

        if (this.approvals.get(id) !== pending) {
            // A cancel ended it while the claim was written.
            return {
                success: false,
                message: "",
                code: "AI_APPROVAL_STALE",
                params: { request: id, reason: "expired" },
            };
        }

        let decided: DecidedBatch;
        const change = this.graphChange(pending);
        if (change !== undefined) {
            const outcome = {
                code: "AI_APPROVAL_STALE" as const,
                params: { request: id, reason: "graph-changed", ...change },
            };
            this.endPending(id, outcome);
            decided = { calls: pending.held.calls, outcome };
        } else if (answer.approve) {
            this.endPending(id, { code: "AI_COMPLETED", params: { request: id } });
            decided = { calls: edited(pending.held.calls, answer.calls), approved: pending.held.gate };
        } else {
            const outcome = { code: "AI_APPROVAL_DENIED" as const, params: { request: id } };
            this.endPending(id, outcome);
            decided = { calls: pending.held.calls, outcome };
        }

        const abortController = new AbortController();
        this.running.set(abortController, pending.label);
        return this.runMessage({
            input: pending.label,
            message: pending.message,
            abortController,
            conversation: () => pending.conversation,
            conversationId: pending.conversationId,
            decided,
            totals: pending.held.totals,
            request: id,
        });
    }

    /**
     * Answer a question the model asked (`ai-question-asked`). The message that asked continues:
     * the answer is the result of its question, and the model goes on as in any message.
     * @param id - The question's id.
     * @param answer - One of its choices, by value; or several, for a question that takes several.
     * @returns The message's final result; `AI_ANSWER_INVALID` when the answer is not among the
     *     choices (nothing continues, and the question stays open); `AI_APPROVAL_STALE` with
     *     `reason: "expired"` when no such question is open, or `"resolved-elsewhere"` when another
     *     instance answered it first.
     */
    answerQuestion(id: string, answer: string | readonly string[]): Promise<ExecutionResult> {
        return this.enqueue(() => this.answerNow(id, answer));
    }

    /**
     * Answer a question, its turn come.
     * @param id - The question's id.
     * @param answer - The answer.
     * @returns The message's final result.
     */
    private async answerNow(id: string, answer: string | readonly string[]): Promise<ExecutionResult> {
        const expired: ExecutionResult = {
            success: false,
            message: "",
            code: "AI_APPROVAL_STALE",
            params: { request: id, reason: "expired" },
        };
        const pending = this.questions.get(id);
        if (pending === undefined) {
            return expired;
        }

        const values = pickedChoices(pending.request, answer);
        if (values === undefined) {
            return { success: false, message: "", code: "AI_ANSWER_INVALID", params: { request: id } };
        }

        // Claimed first: of several tabs answering one question, one continues it.
        const claimed = await this.claim(id, pending);
        if (claimed === "failed") {
            return { success: false, message: "", code: "AI_STORAGE_FAILED", params: { request: id } };
        }

        if (claimed === "lost") {
            const params = { request: id, reason: "resolved-elsewhere" };
            this.endPending(id, { code: "AI_APPROVAL_STALE", params });
            return { success: false, message: "", code: "AI_APPROVAL_STALE", params };
        }

        if (this.questions.get(id) !== pending) {
            // A cancel ended it while the claim was written.
            return expired;
        }

        this.endPending(id, { code: "AI_COMPLETED", params: { request: id } });
        const abortController = new AbortController();
        this.running.set(abortController, pending.label);
        return this.runMessage({
            input: pending.label,
            message: pending.message,
            abortController,
            conversation: () => pending.conversation,
            conversationId: pending.conversationId,
            request: id,
            answer: { call: pending.call, values },
        });
    }

    /**
     * Get the last input that was executed.
     * @returns The last input or null if no command has been executed
     */
    getLastInput(): string | null {
        return this.lastInput;
    }

    /**
     * Get the last error that occurred.
     * @returns The last error or null if no error occurred
     */
    getLastError(): Error | null {
        return this.lastError;
    }

    /**
     * Clear the last error.
     */
    clearLastError(): void {
        this.lastError = null;
    }

    /**
     * A new conversation for one message: the instructions, the facts about the graph and the
     * reader's request.
     * @param input - User input
     * @param session - The session, for the facts.
     * @param via - How the reader gave it; recorded only when the host said.
     * @returns The conversation
     */
    private startConversation(input: string, session: GraphSession, via?: "text" | "voice"): Conversation {
        const system = this.systemPrompt();
        const said = { type: "text", origin: "reader", text: input, ...(via === undefined ? {} : { via }) } as const;
        if (hasAssistantTools(this.commandRegistry)) {
            // The generated tools: fixed instructions, and the facts as graph data, never in them.
            return {
                system,
                messages: [
                    ...this.earlierMessages(),
                    {
                        id: this.firstMessageId(),
                        role: "user",
                        parts: [{ type: "text", origin: "graph-data", text: factsBlock(session, this.profile) }, said],
                    },
                ],
            };
        }

        return {
            system,
            messages: [...this.earlierMessages(), { id: this.firstMessageId(), role: "user", parts: [said] }],
        };
    }

    /**
     * The instructions a conversation is sent with. Never saved: a conversation reopened after a
     * reload is sent today's.
     * @returns The system prompt.
     */
    private systemPrompt(): string {
        if (hasAssistantTools(this.commandRegistry)) {
            const consumer = this.commandRegistry
                .getAll()
                .filter((command) => !isAssistantTool(command) && (command.load ?? "always") === "always");
            return assistantInstructions(this.profile, consumer);
        }

        const commands = this.commandRegistry.getAll();
        const commandDescriptions = commands.map((cmd) => `- ${cmd.name}: ${cmd.description}`).join("\n");
        const schemaSection = this.buildSchemaSection();

        return `You are an AI assistant that helps users interact with a graph visualization.

Available commands:
${commandDescriptions}
${schemaSection}
When the user asks you to perform an action, use the appropriate tool. If no tool is needed, respond conversationally.`;
    }

    /**
     * Build the schema section for the system prompt.
     * @returns Formatted schema section or empty string if no schema
     */
    private buildSchemaSection(): string {
        if (!this.schemaManager) {
            return "";
        }

        const schema = this.schemaManager.getSchema();

        if (!schema || (schema.nodeCount === 0 && schema.edgeCount === 0)) {
            return "";
        }

        return `\n${this.schemaManager.getFormattedSchema()}\n`;
    }

    /**
     * The open conversation's messages, which a new message continues; none without history.
     * @returns Copies of them.
     */
    private earlierMessages(): SavedMessage[] {
        return [...(this.current?.messages ?? [])];
    }

    /**
     * The id of a message's reader message: `m1` when every message starts afresh, as before.
     * @returns The id.
     */
    private firstMessageId(): string {
        return this.history === undefined ? "m1" : uniqueId("m_");
    }

    /**
     * The id of the next message of a conversation: its place when every message starts afresh,
     * unique when conversations are saved, so two copies merged by id keep both.
     * @param conversation - The conversation.
     * @returns The id.
     */
    private newMessageId(conversation: Conversation): string {
        return this.history === undefined ? `m${String(conversation.messages.length + 1)}` : uniqueId("m_");
    }

    /**
     * Open the store and reopen the conversation of this scope and graph, or start one.
     * @param history - Where conversations are kept.
     * @returns When open; never rejects.
     */
    private async openHistory(history: AiHistoryOptions): Promise<void> {
        try {
            const { store, failure } =
                this.storeOverride === undefined
                    ? await openConversationStore({
                          store: history.store,
                          ...(history.database === undefined ? {} : { database: history.database }),
                          secrets: this.secrets,
                      })
                    : { store: this.storeOverride, failure: undefined };
            this.store = store;
            this.stopStore = store.subscribe((change) => {
                this.storeChanged(change);
            });
            const reopened = conversationToReopen(await store.list(this.key()), this.key(), this.graphFacts());
            this.current = reopened ?? this.freshRecord();
            if (failure !== undefined) {
                this.emitChanged(failure);
            }

            if (reopened !== undefined) {
                this.emitChanged();
                this.reopenPending(reopened);
            }
        } catch (error) {
            // ponytail: an unreadable store reads as no history; the controller still answers.
            logger.warn("History could not open", { error: toSafeError(error).name });
            this.current = undefined;
        }
    }

    /**
     * The scope conversations are kept under.
     * @returns The key.
     */
    private key(): string {
        return this.history?.key ?? "";
    }

    /**
     * The loaded graph, as a conversation records it.
     * @returns Its data key and fingerprint.
     */
    private graphFacts(): { dataKey: string | null; fingerprint: string } {
        return { dataKey: this.history?.dataKey ?? null, fingerprint: this.graph.getSession().data.fingerprint() };
    }

    /**
     * A new, empty conversation, saved with its first message.
     * @returns The record.
     */
    private freshRecord(): ConversationRecord {
        const now = new Date().toISOString();
        return {
            format: AI_CONVERSATION_FORMAT,
            version: AI_CONVERSATION_FORMAT_VERSION,
            revision: 0,
            id: uniqueId("c_"),
            key: this.key(),
            createdAt: now,
            updatedAt: now,
            graph: this.graphFacts(),
            messages: [],
            pending: [],
        };
    }

    /**
     * Tell the host the open conversation changed, or that its store failed.
     * @param failure - The store's failure, if that is the news.
     * @param failure.code - Its code.
     * @param failure.params - Its facts.
     */
    private emitChanged(failure?: { readonly code: AiResultCode; readonly params: AiResultParams }): void {
        this.emitAiEvent({
            type: "ai-conversation-changed",
            conversationId: this.current?.id ?? "",
            ...(failure === undefined ? {} : { code: failure.code, params: failure.params }),
        });
    }

    /**
     * What the store said: a failure, or another instance changed a conversation.
     * @param change - What it said.
     */
    private storeChanged(change: ConversationStoreChange): void {
        if (change.code !== undefined) {
            this.emitChanged({ code: change.code, params: change.params ?? {} });
            return;
        }

        const { current } = this;
        if (current === undefined || (change.conversationId !== undefined && change.conversationId !== current.id)) {
            return;
        }

        // Re-read it between turns, so a message never loses the copy it is writing.
        void this.enqueue(async () => {
            if (this.current?.id !== current.id || this.store === undefined) {
                return;
            }

            try {
                this.current = (await this.store.load(current.id)) ?? this.freshRecord();
            } catch (error) {
                // A store reports its own failures; keep the copy in hand.
                logger.warn("Conversation not re-read", { error: toSafeError(error).name });
                return;
            }

            this.emitChanged();
        });
    }

    /**
     * Save a conversation with these messages: the open one, or another by id. Messages are only
     * ever appended, so the ones given are added after the record's own (which may hold another
     * tab's), never in place of them.
     * @param id - The conversation's id.
     * @param messages - Its messages, as this run has them.
     * @param pending - What the record's waiting entries become; unchanged when absent.
     */
    private async saveInto(
        id: string | undefined,
        messages: readonly SavedMessage[],
        pending?: (entries: readonly SavedPending[]) => readonly SavedPending[],
    ): Promise<void> {
        const { store } = this;
        if (store === undefined || id === undefined) {
            return;
        }

        const open = this.current?.id === id;
        const base = open ? this.current : await store.load(id).catch(() => undefined);
        if (base === undefined) {
            // Deleted: nothing to save into.
            return;
        }

        const known = new Set(base.messages.map((message) => message.id));
        const record: ConversationRecord = {
            ...base,
            messages: [...base.messages, ...messages.filter((message) => !known.has(message.id))],
            pending: pending === undefined ? base.pending : pending(base.pending),
            updatedAt: new Date().toISOString(),
            graph: open ? this.graphFacts() : base.graph,
        };
        let saved = record;
        try {
            saved = await store.save(record);
        } catch (error) {
            // A store reports its own write failures; this is a record it refused (deleted meanwhile, or a bug).
            logger.warn("Conversation not saved", { error: toSafeError(error).name });
        }

        if (this.current?.id === id) {
            this.current = saved;
            this.emitChanged();
        }
    }

    /**
     * Make a saved conversation the open one, its turn come.
     * @param id - Its id.
     * @returns Whether it exists.
     */
    private async switchTo(id: string): Promise<boolean> {
        if (this.current?.id === id) {
            return true;
        }

        const record = await this.store?.load(id).catch(() => undefined);
        if (record === undefined) {
            return false;
        }

        // The old conversation's requests end with it, saved there; the new one's are asked again.
        await this.supersedePending(true);
        this.current = record;
        this.emitChanged();
        this.reopenPending(record);
        return true;
    }

    /**
     * Resolves once the saved conversation is open (at once without history).
     * @returns When ready.
     */
    ready(): Promise<void> {
        return this.opened;
    }

    /**
     * The open conversation, as an application draws it.
     * @returns Its snapshot, or null without history.
     */
    getConversation(): AiConversationSnapshot | null {
        return this.current === undefined ? null : conversationSnapshot(this.current);
    }

    /**
     * The saved conversations, newest first.
     * @param options - Which.
     * @param options.allKeys - True for every scope's, not only this one's.
     * @returns Their summaries; none without history.
     */
    async listConversations(options: { readonly allKeys?: boolean } = {}): Promise<readonly AiConversationSummary[]> {
        await this.opened;
        const records =
            (await this.store?.list(options.allKeys === true ? undefined : this.key()).catch(() => undefined)) ?? [];
        return records.map(conversationSummary);
    }

    /**
     * Make a saved conversation the open one; the next message continues it.
     * @param id - Its id.
     * @returns Its snapshot, or null when there is no such conversation.
     */
    openConversation(id: string): Promise<AiConversationSnapshot | null> {
        return this.enqueue(async () => ((await this.switchTo(id)) ? this.getConversation() : null));
    }

    /**
     * Start a new conversation; the one open stays saved and listed. It is saved with its first
     * message. Every request still waiting ends (`AI_APPROVAL_STALE`, `reason: "superseded"`).
     * @returns Its snapshot, or null without history.
     */
    newConversation(): Promise<AiConversationSnapshot | null> {
        return this.enqueue(async () => {
            if (this.store !== undefined) {
                // The old conversation's requests end with it, as a new message would end them.
                await this.supersedePending(true);
                this.current = this.freshRecord();
                this.emitChanged();
            }

            return this.getConversation();
        });
    }

    /**
     * End every request still waiting: something newer came first.
     * @param save - Whether to save each closed request's conversation; not when it is being deleted.
     * @returns When done.
     */
    private async supersedePending(save: boolean): Promise<void> {
        for (const id of [...this.approvals.keys(), ...this.questions.keys()]) {
            const pending = this.closePending(id, {
                code: "AI_APPROVAL_STALE",
                params: { request: id, reason: "superseded" },
            });
            if (save) {
                await this.saveClosed(pending);
            }
        }
    }

    /**
     * Delete a saved conversation; deleting the open one starts a new one.
     * @param id - Its id.
     * @returns When done.
     */
    deleteConversation(id: string): Promise<void> {
        return this.enqueue(async () => {
            await this.store?.delete(id);
            if (this.current?.id === id) {
                await this.supersedePending(false);
                this.current = this.freshRecord();
                this.emitChanged();
            }
        });
    }

    /**
     * Delete every saved conversation, of every scope, and start a new one: for a shared device's
     * "end session". Every request still waiting ends (`AI_APPROVAL_STALE`, `reason: "superseded"`).
     * @returns When done.
     */
    clearHistory(): Promise<void> {
        return this.enqueue(async () => {
            if (this.store === undefined) {
                return;
            }

            await this.supersedePending(false);
            await this.store.clear();
            this.current = this.freshRecord();
            this.emitChanged();
        });
    }

    /**
     * A saved conversation in the published `graphty-ai-conversation` format, version 1.
     * @param id - Its id.
     * @returns Its JSON text, or null when there is no such conversation.
     */
    async exportConversation(id: string): Promise<string | null> {
        await this.opened;
        const record = await this.store?.load(id).catch(() => undefined);
        if (record === undefined) {
            return null;
        }

        const { writeConversation } = await import("./conversation/formats");
        return writeConversation(record, { secrets: this.secrets() });
    }

    /**
     * The approval requests waiting on the reader, held here or reopened from the saved
     * conversation: what `ai-approval-requested` asked and nothing has ended yet.
     * @returns The requests, oldest first.
     */
    getPendingApprovals(): readonly AiApprovalRequest[] {
        return [...this.approvals.values()].map((pending) => pending.request);
    }

    /**
     * The questions waiting on the reader, asked here or reopened from the saved conversation:
     * what `ai-question-asked` asked and nothing has ended yet.
     * @returns The questions, oldest first.
     */
    getPendingQuestions(): readonly AiQuestionRequest[] {
        return [...this.questions.values()].map((pending) => pending.request);
    }

    /**
     * Get the current status snapshot.
     * @returns Current AI status
     */
    getStatus(): AiStatus {
        return this.statusManager.getSnapshot();
    }

    /**
     * Subscribe to status changes.
     * @param callback - Function to call on status change
     * @returns Unsubscribe function
     */
    onStatusChange(callback: StatusChangeCallback): () => void {
        return this.statusManager.subscribe(callback);
    }

    /**
     * Cancel every message that is running.
     */
    cancel(): void {
        // Every request and question still waiting ends too, its message with it.
        for (const id of [...this.approvals.keys(), ...this.questions.keys()]) {
            const pending = this.closePending(id, { code: "AI_CANCELLED", params: {} });
            void this.enqueue(() => this.saveClosed(pending));
        }

        for (const [abortController, input] of this.running) {
            if (abortController.signal.aborted) {
                continue;
            }

            this.cancelled.add(abortController);
            abortController.abort();
            this.emitAiEvent({ type: "ai-command-cancelled", input, reason: "user" });
        }
    }

    /**
     * Dispose of the controller and clean up resources.
     */
    dispose(): void {
        this.disposed = true;
        // A waiting request stays saved for the next element on this conversation (a reload, a
        // remount): only this controller forgets it, so the cancel below does not end it.
        for (const pending of [...this.approvals.values(), ...this.questions.values()]) {
            pending.stopWatching();
        }

        this.approvals.clear();
        this.questions.clear();
        this.cancel();
        this.stopStore();
        // Closed once the turns before it have settled, so the last save still lands.
        void this.queue.then(() => this.store?.close());
        this.engine.dispose();
        this.statusManager.reset();
    }
}
