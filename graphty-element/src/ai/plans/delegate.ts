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
import { type AiAgentRole } from "../agents";
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
    MessageRolledBack,
    RESULT_CAP,
    runConversation,
    type TokenUsage,
    TurnFailed,
} from "../runConversation";
import type { ToolCallRequest } from "../ToolExecutor";
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
}

/**
 * The provider a role runs on when it has its own.
 * @param role - The role.
 * @param main - The main conversation's provider.
 * @returns Its provider id, or undefined when it shares the main engine (as a role with only a
 *     model does on a consumer's own provider, which the element cannot build a second of).
 */
function ownProvider(role: AiAgentRole, main: LlmProvider): AiProviderId | undefined {
    if (role.provider !== undefined) {
        return role.provider;
    }

    const kind = AI_PROVIDER_IDS.find((id) => id === main.name);
    return role.model === undefined ? undefined : kind;
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
 * A task with what earlier helpers of the message answered, so a later step builds on them.
 * @param task - The task.
 * @param answers - Each earlier helper's result, as `name: result`.
 * @returns The task to hand on.
 */
export function withAnswers(task: string, answers: readonly string[]): string {
    return answers.length === 0 ? task : `${task}\n\nWhat the helpers before you reported:\n${answers.join("\n")}`;
}

/**
 * What a helper's run reported, as `name: result`.
 * @param agent - The helper.
 * @param run - Its run.
 * @returns The line, or none when it has no result.
 */
function answerLine(agent: string, run: HelperRun): string[] {
    const result = run.parts.find((part) => part.type === "tool-result");
    return result?.type === "tool-result" ? [`${agent}: ${result.content}`] : [];
}

/** A helper's saved messages: never an `agent-ref` among them, since helpers do not delegate. */
type HelperMessages = Extract<SavedPart, { type: "agent-ref" }>["messages"];

/** One helper's run: the parts its call's tool message gets, and what it used. */
interface HelperRun {
    readonly parts: readonly SavedPart[];
    readonly usage: TokenUsage;
    /** Its held batch: its call has no result yet, and the message waits on the reader. */
    readonly held?: HeldHelper;
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
 * A new helper's conversation: its instructions, the facts about the graph and its task.
 * @param role - The helper.
 * @param call - The `delegate` call.
 * @param task - The task.
 * @param parent - The main run.
 * @returns The conversation.
 */
function helperConversation(
    role: AiAgentRole,
    call: ToolCallRequest,
    task: string,
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
 * @returns The call's result and the helper's conversation since `conversation` was handed in.
 * @throws When the message was cancelled or undone while it ran.
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
): Promise<HelperRun> {
    const { sink } = parent;
    sink.emit({ type: "ai-agent-start", agent: role.name, task });
    const from = decided === undefined ? 0 : conversation.messages.length;
    const tools = helperTools(role, parent);
    const usage = { inputTokens: 0, outputTokens: 0 };
    let held: HeldHelper | undefined;
    const { engine, own } = engineOf(role, options);
    let outcome: { code: AiResultCode; params: AiResultParams; answer?: string };
    try {
        const result = await runConversation({
            conversation,
            engine,
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
            sink.emit({ type: "ai-agent-end", agent: role.name, code: "AI_CANCELLED", params: { ...usage } });
            throw error;
        }

        if (error instanceof MessageRolledBack) {
            outcome = { code: error.result.code ?? "AI_TOOL_FAILED", params: error.result.params ?? {} };
        } else if (error instanceof TurnFailed) {
            outcome = { code: error.failure.code, params: error.failure.params };
        } else {
            throw error;
        }
    } finally {
        if (own) {
            engine.dispose();
        }
    }

    sink.emit({ type: "ai-agent-end", agent: role.name, code: outcome.code, params: { ...outcome.params, ...usage } });
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
        parts: [
            {
                type: "tool-result",
                origin: "graph-data",
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
 * What the hand-offs of the turn holding a call stand at.
 * @param messages - The main conversation, and the parts not yet in it.
 * @param callId - One of the turn's `delegate` calls.
 * @returns The turn's hand-offs that have not run (a sequence a hold stopped), and what the ones
 *     that ran answered, as `name: result`.
 */
function turnOf(messages: readonly SavedMessage[], callId: string): { rest: ToolCallRequest[]; answers: string[] } {
    const parts = messages.flatMap((message) => message.parts);
    const results = new Map(parts.flatMap((part) => (part.type === "tool-result" ? [[part.callId, part]] : [])));
    const started = new Set(parts.flatMap((part) => (part.type === "agent-ref" ? [part.callId] : [])));
    const turn = messages.find((message) =>
        message.parts.some((part) => part.type === "tool-call" && part.callId === callId),
    );
    const calls = (turn?.parts ?? []).flatMap((part) =>
        part.type === "tool-call" && part.command === DELEGATE ? [part] : [],
    );
    return {
        rest: calls
            .filter((call) => !results.has(call.callId) && !started.has(call.callId))
            .map((call) => ({ id: call.callId, name: DELEGATE, arguments: { ...call.arguments } })),
        answers: calls.flatMap((call) => {
            const result = results.get(call.callId);
            return result?.type === "tool-result" ? [`${String(call.arguments.agent)}: ${result.content}`] : [];
        }),
    };
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
        // Short: every main turn declares it. Helpers that run at once learn they may only read
        // from the refusal, as a model learns any other limit.
        description: `Hands a task to a helper, which answers. ${options.roles.map((role) => `${role.name}: ${role.purpose}`).join("; ")}`,
        schema,
        jsonSchema,
    };

    const run: Delegation["run"] = async (calls, parent, state, sequence = false, prior = []) => {
        const checked = calls.map((call) => ({ call, parsed: schema.safeParse(call.arguments) }));
        const running = checked.filter(({ call, parsed }) => parsed.success && call.invalidArguments !== true);
        // Helpers that run at once may only read: none writes under another's feet.
        const shared: MessageState =
            running.length > 1 && !sequence ? { ...state, readOnly: "parallel-helper" } : state;
        const one = ({ call, parsed }: (typeof checked)[number], answers: readonly string[]): Promise<HelperRun> => {
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
            const task = withAnswers(parsed.data.task, answers);
            return runHelper(role, call, task, helperConversation(role, call, task, parent), parent, shared, options);
        };

        let runs: HelperRun[] = [];
        if (sequence) {
            // One after another, each told what the ones before it reported; a hold stops the
            // sequence, and the reader's decision runs the rest.
            for (const entry of checked) {
                const answers = runs.flatMap((run, at) => answerLine(String(checked[at].call.arguments.agent), run));
                const ran = await one(entry, [...prior, ...answers]);
                runs.push(ran);
                if (ran.held !== undefined) {
                    break;
                }
            }
        } else {
            runs = await Promise.all(checked.map((entry) => one(entry, [])));
        }

        // ponytail: one hold per turn is asked about; another helper held beside it in the same
        // parallel step is left without a result (the model reads it as not run). Parallel
        // helpers only read, so only a slow-run gate or an ask on a read can hold one.
        const held = runs.find((run) => run.held !== undefined)?.held;
        return {
            parts: runs.flatMap((run) => run.parts),
            usage: usageOf(runs),
            ...(held === undefined ? {} : { held }),
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
            if (continued.held !== undefined) {
                return continued;
            }

            // The hand-offs a sequence had not reached when the hold stopped it run now, in order.
            const { rest, answers } = turnOf(
                [...parent.conversation.messages, { id: "", role: "tool", parts: [...continued.parts] }],
                callId,
            );
            if (rest.length === 0) {
                return continued;
            }

            const more = await run(rest, parent, state, true, answers);
            return {
                parts: [...continued.parts, ...more.parts],
                usage: usageOf([continued, more]),
                ...(more.held === undefined ? {} : { held: more.held }),
            };
        },
    };
}
