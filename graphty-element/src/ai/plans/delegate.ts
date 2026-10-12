/**
 * @file Helpers (`AiManagerConfig.agents`): the `delegate` tool the main model hands tasks with, and
 * running each helper on a conversation of its own. A helper is the same loop (`runConversation`)
 * with only its own commands, through the same executor, policy and gate, under the message's id,
 * so its writes join the message's undo step. Several helpers in one turn run at once and may only
 * read. Loaded with `import()` only when `agents` is set.
 */

import { z } from "zod";

import {
    AI_PROVIDER_IDS,
    aiProviderDescriptor,
    type AiProviderId,
    type AiResultCode,
    type AiResultParams,
} from "../../catalog/ai";
import { type AiAgentRole, MAX_HELPERS_PER_TURN } from "../agents";
import { CommandRegistry } from "../commands";
import { compactSchema, toolJsonSchema } from "../engine/jsonSchema";
import { engineFor } from "../engine/load";
import type { AiEngine, JsonSchema, SavedMessage, SavedPart } from "../engine/types";
import { createProvider } from "../providers";
import type { LlmProvider } from "../providers/types";
import {
    closingResults,
    type Conversation,
    type ConversationRun,
    type DecidedBatch,
    DELEGATE,
    type DelegatedRun,
    type Delegation,
    type HeldHelper,
    type HelperAnswer,
    MessageRolledBack,
    RESULT_CAP,
    runConversation,
    type TokenUsage,
    TurnFailed,
} from "../runConversation";
import type { ToolCallRequest } from "../ToolExecutor";
import type { HostedToolSetting } from "../tools/hosted";
import { assistantInstructions, factsBlock } from "../tools/prompt";
import { resultText } from "../tools/shape";
import { isAssistantTool } from "../tools/toolset";
import type { MessageState } from "../tools/types";

/** What helpers run with, beside the message they run in. */
export interface DelegationOptions {
    readonly roles: readonly AiAgentRole[];
    /** The main conversation's engine, which a role with no provider or model of its own shares. */
    readonly engine: AiEngine;
    /** The main conversation's provider, whose kind a role with only a model of its own runs on. */
    readonly provider: LlmProvider;
    /** The API key for a role's own provider. */
    readonly keyFor: (provider: AiProviderId) => string | undefined;
    /** The web tools each role may use, by role name, as resolved when the assistant was enabled. */
    readonly hosted?: ReadonlyMap<string, readonly HostedToolSetting[]>;
}

/**
 * The provider a role runs on when it has its own.
 * @param role - The role.
 * @param main - The main conversation's provider.
 * @returns Its provider id, or undefined when it shares the main engine. A role with only a model
 *     of its own runs on a second instance of the main provider, which the element builds only for
 *     its own remote providers (`checkAgents` rejects `model` alone on any other).
 */
function ownProvider(role: AiAgentRole, main: LlmProvider): AiProviderId | undefined {
    if (role.provider !== undefined) {
        return role.provider;
    }

    return role.model === undefined
        ? undefined
        : AI_PROVIDER_IDS.find((id) => id === main.name && !aiProviderDescriptor(id).runsLocally);
}

/**
 * The first provider a role runs on that needs a key and has none: checked before any request.
 * @param options - The roles and their keys.
 * @returns The provider, or undefined when every role can run.
 */
export function missingKey(options: DelegationOptions): AiProviderId | undefined {
    for (const role of options.roles) {
        const id = ownProvider(role, options.provider);
        if (id !== undefined && aiProviderDescriptor(id).requiresKey && !options.keyFor(id)) {
            return id;
        }
    }

    return undefined;
}

/**
 * The engine a role runs on: the main one, or its own provider's, built for this run.
 * @param role - The role.
 * @param options - The main engine and the keys.
 * @returns The engine, and whether it is the role's own (disposed after the run).
 */
export function engineOf(role: AiAgentRole, options: DelegationOptions): { engine: AiEngine; own: boolean } {
    const id = ownProvider(role, options.provider);
    if (id === undefined) {
        return { engine: options.engine, own: false };
    }

    const provider = createProvider(id);
    provider.configure({
        apiKey: options.keyFor(id) ?? "",
        ...(role.model === undefined ? {} : { model: role.model }),
    });
    return { engine: engineFor(provider), own: true };
}

/**
 * The instructions a helper runs with: the assistant's, naming only its tools, and its purpose.
 * @param role - The role.
 * @param tools - Its commands.
 * @param parent - The main run, for the profile.
 * @returns The system prompt.
 */
function helperSystem(role: AiAgentRole, tools: CommandRegistry, parent: ConversationRun): string {
    const names = tools.getNames();
    const base = tools.getAll().some(isAssistantTool)
        ? `${assistantInstructions(parent.profile ?? "standard", [], names)}\n`
        : "";
    return `${base}You are "${role.name}", a helper of the assistant. Your purpose: ${role.purpose}
Do only the task you are given, with your tools, then answer in plain text with what you found or changed. You cannot ask the reader anything.`;
}

/**
 * What earlier helpers answered, as a helper is told it: data, enveloped as the graph's facts are,
 * never part of its task, so an instruction an earlier helper read and quoted stays data.
 * @param answers - The answers.
 * @returns The text.
 */
function answersText(answers: readonly HelperAnswer[]): string {
    return `What the helpers before you reported:\n${answers.map((answer) => `${answer.agent}: ${answer.content}`).join("\n")}`;
}

/**
 * What a helper's run answered.
 * @param agent - The helper.
 * @param run - Its run.
 * @returns The answer, or none when it has no result.
 */
function answerOf(agent: string, run: HelperRun): HelperAnswer[] {
    const result = run.parts.find((part) => part.type === "tool-result");
    return result?.type === "tool-result"
        ? [{ agent, code: result.code as AiResultCode, content: result.content }]
        : [];
}

/**
 * The parts since the reader's last request.
 * @param messages - The conversation.
 * @returns Them, in order.
 */
function sinceRequest(messages: readonly SavedMessage[]): SavedPart[] {
    const asked =
        messages.length -
        1 -
        [...messages]
            .reverse()
            .findIndex((message) => message.role === "user" && message.parts.some((part) => part.origin === "reader"));
    return messages.slice(asked + 1).flatMap((message) => message.parts);
}

/**
 * What the plan's hand-offs of the message answered so far: the results of graphty's own
 * `delegate` calls since the reader's request.
 * @param messages - The conversation.
 * @returns The answers, in order.
 */
export function planAnswers(messages: readonly SavedMessage[]): HelperAnswer[] {
    const since = sinceRequest(messages);
    const issued = new Map(
        since.flatMap((part) =>
            part.type === "tool-call" && part.origin === "graphty" && part.command === DELEGATE
                ? [[part.callId, String(part.arguments.agent)]]
                : [],
        ),
    );
    return since.flatMap((part) =>
        part.type === "tool-result" && issued.has(part.callId)
            ? [{ agent: String(issued.get(part.callId)), code: part.code as AiResultCode, content: part.content }]
            : [],
    );
}

/**
 * Whether calls are a plan's hand-offs: graphty's own `delegate` calls, not the model's.
 * @param messages - The conversation holding them.
 * @param calls - The calls.
 * @returns True when every one is graphty's.
 */
function planned(messages: readonly SavedMessage[], calls: readonly ToolCallRequest[]): boolean {
    const ours = new Set(
        sinceRequest(messages).flatMap((part) =>
            part.type === "tool-call" && part.origin === "graphty" ? [part.callId] : [],
        ),
    );
    return calls.length > 0 && calls.every((call) => ours.has(call.id));
}

/** A helper's saved messages: never an `agent-ref` among them, since helpers do not delegate. */
type HelperMessages = Extract<SavedPart, { type: "agent-ref" }>["messages"];

/** One helper's run: the parts its call's tool message gets, and what it used. */
interface HelperRun {
    readonly parts: readonly SavedPart[];
    readonly usage: TokenUsage;
    /** Its held batch: its call has no result yet, and the message waits on the reader. */
    readonly held?: HeldHelper;
    /** Its provider stopped its turn mid-search: `AI_PROVIDER_PAUSED`'s params. */
    readonly paused?: AiResultParams;
}

/**
 * A helper's commands: the main run's, by the role's names.
 * @param role - The helper.
 * @param parent - The main run.
 * @returns Its registry.
 */
function helperTools(role: AiAgentRole, parent: ConversationRun): CommandRegistry {
    const tools = new CommandRegistry();
    for (const name of role.commands) {
        const command = parent.tools.get(name);
        if (command !== undefined) {
            tools.register(command);
        }
    }

    return tools;
}

/**
 * A new helper's conversation: its instructions, the facts about the graph, what earlier helpers
 * answered, and its task.
 * @param role - The helper.
 * @param call - The `delegate` call.
 * @param task - The task.
 * @param answers - What earlier helpers of the message answered.
 * @param parent - The main run.
 * @returns The conversation.
 */
function helperConversation(
    role: AiAgentRole,
    call: ToolCallRequest,
    task: string,
    answers: readonly HelperAnswer[],
    parent: ConversationRun,
): Conversation {
    const tools = helperTools(role, parent);
    const first: SavedMessage = {
        id: (parent.newId ?? ((): string => `${call.id}:task`))(),
        role: "user",
        parts: [
            ...(tools.getAll().some(isAssistantTool)
                ? [
                      {
                          type: "text" as const,
                          origin: "graph-data" as const,
                          text: factsBlock(parent.session, parent.profile ?? "standard"),
                      },
                  ]
                : []),
            ...(answers.length === 0
                ? []
                : [{ type: "text" as const, origin: "graph-data" as const, text: answersText(answers) }]),
            { type: "text", origin: "graphty", text: task },
        ],
    };
    return { system: helperSystem(role, tools, parent), messages: [first] };
}

/**
 * Run one helper on its task, on a conversation of its own, until it answers or a batch of its
 * is held for the reader.
 * @param role - The helper.
 * @param call - The `delegate` call.
 * @param task - The task.
 * @param conversation - Its conversation: new, or saved at a hold and continued.
 * @param parent - The main run, whose message, session and abort it shares.
 * @param state - The message's state; read-only when helpers run beside each other.
 * @param options - The engines and keys.
 * @param decided - The reader's decision on its held batch, which a continued helper starts with.
 * @param after - What earlier helpers answered, which it was told.
 * @returns The call's result and the helper's conversation since `conversation` was handed in.
 * @throws When the message was cancelled or undone while it ran.
 * @throws {MessageRolledBack} When a tool threw, or its last write batch failed: the message's
 *   writes are taken back, the helper's with the main's.
 */
async function runHelper(
    role: AiAgentRole,
    call: ToolCallRequest,
    task: string,
    conversation: Conversation,
    parent: ConversationRun,
    state: MessageState,
    options: DelegationOptions,
    decided?: DecidedBatch,
    after: readonly HelperAnswer[] = [],
): Promise<HelperRun> {
    const { sink } = parent;
    sink.emit({
        type: "ai-agent-start",
        agent: role.name,
        task,
        ...(after.length === 0 ? {} : { after: after.map(({ agent, code }) => ({ agent, code })) }),
    });
    const from = decided === undefined ? 0 : conversation.messages.length;
    const tools = helperTools(role, parent);
    const hostedTools = options.hosted?.get(role.name) ?? [];
    const usage = { inputTokens: 0, outputTokens: 0 };
    let held: HeldHelper | undefined;
    let built: { engine: AiEngine; own: boolean } | undefined;
    let outcome: { code: AiResultCode; params: AiResultParams; answer?: string };
    try {
        built = engineOf(role, options);
        const result = await runConversation({
            conversation,
            engine: built.engine,
            tools,
            allTools: true,
            graph: parent.graph,
            session: parent.session,
            label: parent.label,
            message: parent.message,
            abort: parent.abort,
            sink,
            state,
            // The helper stops at a hold; the main run saves it and asks the reader.
            hold: (batch, messageId) => {
                held = { held: batch, messageId, agent: role.name, callId: call.id };
                return Promise.resolve(undefined);
            },
            endAtHold: true,
            ...(hostedTools.length === 0 ? {} : { hostedTools }),
            ...(decided === undefined ? {} : { decided }),
            ...(parent.profile === undefined ? {} : { profile: parent.profile }),
            ...(parent.host === undefined ? {} : { host: parent.host }),
            ...(parent.newId === undefined ? {} : { newId: parent.newId }),
            onUsage: (used) => {
                usage.inputTokens += used.inputTokens;
                usage.outputTokens += used.outputTokens;
            },
        });
        outcome = {
            code: result.code ?? "AI_COMPLETED",
            params: result.params ?? {},
            ...(result.llmText === undefined ? {} : { answer: result.llmText }),
        };
    } catch (error) {
        // A cancel or an undo ends the whole message, helpers and all.
        if (parent.abort.signal.aborted) {
            sink.emit({ type: "ai-agent-end", agent: role.name, code: "AI_CANCELLED", params: {}, usage });
            throw error;
        }

        if (error instanceof MessageRolledBack) {
            // All or nothing: the helper's writes go with the message's, as the main's own would.
            const { code = "AI_TOOL_FAILED", params = {} } = error.result;
            sink.emit({ type: "ai-agent-end", agent: role.name, code, params, usage });
            throw error;
        }

        if (error instanceof TurnFailed) {
            outcome = { code: error.failure.code, params: error.failure.params };
        } else if (built === undefined) {
            // Its own provider could not be built: the call fails, coded, and the message goes on.
            outcome = { code: "AI_PROVIDER_ERROR", params: { provider: ownProvider(role, options.provider) ?? "" } };
        } else {
            throw error;
        }
    } finally {
        if (built?.own === true) {
            built.engine.dispose();
        }
    }

    sink.emit({ type: "ai-agent-end", agent: role.name, code: outcome.code, params: outcome.params, usage });
    const ref: SavedPart = {
        type: "agent-ref",
        origin: "graphty",
        agent: role.name,
        callId: call.id,
        messages: conversation.messages.slice(from) as HelperMessages,
    };
    if (held !== undefined) {
        // No result yet: the reader's decision continues the helper, which then answers the call.
        return { usage, parts: [ref], held };
    }

    const params = { ...outcome.params, agent: role.name };
    return {
        usage,
        ...(outcome.code === "AI_PROVIDER_PAUSED" ? { paused: outcome.params } : {}),
        parts: [
            {
                type: "tool-result",
                // A helper with web tools answers from the web: data, and never an instruction.
                origin: hostedTools.length === 0 ? "graph-data" : "web",
                callId: call.id,
                code: outcome.code,
                params,
                content: resultText(
                    {
                        code: outcome.code,
                        params,
                        ...(outcome.answer === undefined ? {} : { data: { answer: outcome.answer } }),
                    },
                    RESULT_CAP[parent.profile ?? "standard"],
                ),
            },
            ref,
        ],
    };
}

/**
 * Run helpers at once. A helper that fails with something other than its own turn's failure
 * stops the others (they would go on calling tools for a message that has already failed), and
 * the first such failure is thrown once every helper has stopped.
 * @param entries - The helpers' calls.
 * @param start - Starts one, within a run whose abort the helpers share.
 * @param parent - The main run.
 * @returns Each helper's run, in order.
 */
async function atOnce<T>(
    entries: readonly T[],
    start: (entry: T, within: ConversationRun) => Promise<HelperRun>,
    parent: ConversationRun,
): Promise<HelperRun[]> {
    const shared = new AbortController();
    const stop = (): void => {
        shared.abort(parent.abort.signal.reason);
    };
    if (parent.abort.signal.aborted) {
        stop();
    }

    parent.abort.signal.addEventListener("abort", stop, { once: true });
    const within: ConversationRun = { ...parent, abort: shared };
    let failure: { readonly error: unknown } | undefined;
    try {
        const settled = await Promise.allSettled(
            entries.map((entry) =>
                start(entry, within).catch((error: unknown) => {
                    failure ??= { error };
                    shared.abort(error);
                    throw error;
                }),
            ),
        );
        if (failure !== undefined) {
            throw failure.error;
        }

        return settled.map((outcome) => (outcome as PromiseFulfilledResult<HelperRun>).value);
    } finally {
        parent.abort.signal.removeEventListener("abort", stop);
    }
}

/**
 * The tokens several runs used.
 * @param runs - The runs.
 * @returns Their sum.
 */
function usageOf(runs: readonly { readonly usage: TokenUsage }[]): TokenUsage {
    return {
        inputTokens: runs.reduce((sum, run) => sum + run.usage.inputTokens, 0),
        outputTokens: runs.reduce((sum, run) => sum + run.usage.outputTokens, 0),
    };
}

/**
 * The hand-offs of the turn holding a call that have not run: a sequence a hold stopped.
 * @param messages - The main conversation, and the parts not yet in it.
 * @param callId - One of the turn's `delegate` calls.
 * @returns The calls, in order.
 */
function restOfTurn(messages: readonly SavedMessage[], callId: string): ToolCallRequest[] {
    const parts = messages.flatMap((message) => message.parts);
    const results = new Map(parts.flatMap((part) => (part.type === "tool-result" ? [[part.callId, part]] : [])));
    const started = new Set(parts.flatMap((part) => (part.type === "agent-ref" ? [part.callId] : [])));
    const turn = messages.find((message) =>
        message.parts.some((part) => part.type === "tool-call" && part.callId === callId),
    );
    const calls = (turn?.parts ?? []).flatMap((part) =>
        part.type === "tool-call" && part.command === DELEGATE ? [part] : [],
    );
    return calls
        .filter((call) => !results.has(call.callId) && !started.has(call.callId))
        .map((call) => ({ id: call.callId, name: DELEGATE, arguments: { ...call.arguments } }));
}

/**
 * The `delegate` tool and the helpers it runs.
 * @param options - The roles, the main engine and the keys.
 * @returns The delegation the loop runs `delegate` calls through.
 */
export function delegation(options: DelegationOptions): Delegation {
    const names = options.roles.map((role) => role.name);
    const schema = z.strictObject({
        agent: z.enum(names as [string, ...string[]]),
        task: z.string().min(1),
    });
    // Compact and open, as `ask_reader`'s: the strict check still refuses an unknown field.
    const { additionalProperties: _open, ...jsonSchema } = compactSchema(toolJsonSchema(schema)) as JsonSchema;
    const tool = {
        name: DELEGATE,
        // Short, and the same size however many helpers there are: every main turn declares it, and
        // the helpers' purposes are in the instructions. Helpers that run at once learn they may only
        // read from the refusal, as a model learns any other limit.
        description: "Hands a task to one of your helpers, which answers.",
        schema,
        jsonSchema,
    };

    const run: Delegation["run"] = async (calls, parent, state, sequence, prior) => {
        // A plan's step is told what the steps before it answered; the model's own hand-offs are not.
        const before =
            prior ?? (planned(parent.conversation.messages, calls) ? planAnswers(parent.conversation.messages) : []);
        const checked = calls
            .slice(0, MAX_HELPERS_PER_TURN)
            .map((call) => ({ call, parsed: schema.safeParse(call.arguments) }));
        const over = closingResults(
            calls.slice(MAX_HELPERS_PER_TURN),
            { code: "AI_TOOL_NOT_RUN", params: { reason: "limit" } },
            "",
        ).parts;
        const running = checked.filter(({ call, parsed }) => parsed.success && call.invalidArguments !== true);
        // Helpers that run at once may only read: none writes under another's feet.
        const shared: MessageState =
            running.length > 1 && sequence !== true ? { ...state, readOnly: "parallel-helper" } : state;
        const one = (
            { call, parsed }: (typeof checked)[number],
            answers: readonly HelperAnswer[],
            within: ConversationRun,
        ): Promise<HelperRun> => {
            if (!parsed.success || call.invalidArguments === true) {
                const params = { tool: DELEGATE };
                return Promise.resolve({
                    usage: { inputTokens: 0, outputTokens: 0 },
                    parts: [
                        {
                            type: "tool-result",
                            origin: "graph-data",
                            callId: call.id,
                            code: "AI_TOOL_INVALID_ARGUMENTS",
                            params,
                            content: resultText({ code: "AI_TOOL_INVALID_ARGUMENTS", params }, RESULT_CAP.small),
                        },
                    ],
                });
            }

            // The enum admits only role names.
            const role = options.roles.find((candidate) => candidate.name === parsed.data.agent) as AiAgentRole;
            const { task } = parsed.data;
            return runHelper(
                role,
                call,
                task,
                helperConversation(role, call, task, answers, within),
                within,
                shared,
                options,
                undefined,
                answers,
            );
        };

        let runs: HelperRun[] = [];
        if (sequence === true) {
            // One after another, each told what the ones before it reported; a hold stops the
            // sequence, and the reader's decision runs the rest.
            for (const entry of checked) {
                const answers = runs.flatMap((run, at) => answerOf(String(checked[at].call.arguments.agent), run));
                const ran = await one(entry, [...before, ...answers], parent);
                runs.push(ran);
                if (ran.held !== undefined || ran.paused !== undefined) {
                    break;
                }
            }
        } else {
            runs = await atOnce(checked, (entry, within) => one(entry, before, within), parent);
        }

        // ponytail: one hold per turn is asked about; another helper held beside it in the same
        // parallel step is left without a result (the model reads it as not run). Parallel
        // helpers only read, so only a slow-run gate or an ask on a read can hold one.
        const held = runs.find((run) => run.held !== undefined)?.held;
        const paused = runs.find((run) => run.paused !== undefined)?.paused;
        return {
            parts: [...runs.flatMap((run) => run.parts), ...over],
            usage: usageOf(runs),
            ...(held === undefined ? {} : { held }),
            ...(paused === undefined ? {} : { paused }),
        };
    };

    return {
        tool,
        run,
        resume: async (callId, decided, parent, state): Promise<DelegatedRun> => {
            const refs = parent.conversation.messages
                .flatMap((message) => message.parts)
                .flatMap((part) => (part.type === "agent-ref" && part.callId === callId ? [part] : []));
            const role = options.roles.find((candidate) => candidate.name === refs.at(0)?.agent);
            const call = { id: callId, name: DELEGATE, arguments: {} };
            if (role === undefined) {
                // The helper is no longer configured: its call did not finish.
                return {
                    parts: closingResults([call], { code: "AI_TOOL_NOT_RUN", params: {} }, "").parts,
                    usage: { inputTokens: 0, outputTokens: 0 },
                };
            }

            // Its conversation as saved: every part of it the message holds, in order.
            const messages = refs.flatMap((ref) => ref.messages) as SavedMessage[];
            const task = messages[0].parts.flatMap((part) =>
                part.type === "text" && part.origin === "graphty" ? [part.text] : [],
            )[0];
            const tools = helperTools(role, parent);
            // ponytail: a helper held beside others in a parallel step continues with the message's
            // own state, so it may write; only a slow-run gate or an ask on a read holds one.
            const continued = await runHelper(
                role,
                call,
                task ?? "",
                { system: helperSystem(role, tools, parent), messages },
                parent,
                state,
                options,
                decided,
            );
            if (continued.held !== undefined || continued.paused !== undefined) {
                return continued;
            }

            // The hand-offs a sequence had not reached when the hold stopped it run now, in order,
            // told what the plan's hand-offs before them answered.
            const now = [
                ...parent.conversation.messages,
                { id: "", role: "tool" as const, parts: [...continued.parts] },
            ];
            const rest = restOfTurn(now, callId);
            if (rest.length === 0) {
                return continued;
            }

            const more = await run(rest, parent, state, true, planAnswers(now));
            return {
                parts: [...continued.parts, ...more.parts],
                usage: usageOf([continued, more]),
                ...(more.held === undefined ? {} : { held: more.held }),
            };
        },
    };
}
