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
    type Conversation,
    type ConversationRun,
    DELEGATE,
    type Delegation,
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
function engineOf(role: AiAgentRole, options: DelegationOptions): { engine: AiEngine; own: boolean } {
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

/** A helper's saved messages: never an `agent-ref` among them, since helpers do not delegate. */
type HelperMessages = Extract<SavedPart, { type: "agent-ref" }>["messages"];

/** One helper's run: the parts its call's tool message gets, and what it used. */
interface HelperRun {
    readonly parts: readonly SavedPart[];
    readonly usage: TokenUsage;
}

/**
 * Run one helper on its task, on a conversation of its own.
 * @param role - The helper.
 * @param call - The `delegate` call.
 * @param task - The task.
 * @param parent - The main run, whose message, session and abort it shares.
 * @param state - The message's state; read-only when helpers run beside each other.
 * @param options - The engines and keys.
 * @returns The call's result and the helper's conversation.
 * @throws When the message was cancelled or undone while it ran.
 */
async function runHelper(
    role: AiAgentRole,
    call: ToolCallRequest,
    task: string,
    parent: ConversationRun,
    state: MessageState,
    options: DelegationOptions,
): Promise<HelperRun> {
    const { sink } = parent;
    sink.emit({ type: "ai-agent-start", agent: role.name, task });
    const tools = new CommandRegistry();
    for (const name of role.commands) {
        const command = parent.tools.get(name);
        if (command !== undefined) {
            tools.register(command);
        }
    }

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
    const conversation: Conversation = { system: helperSystem(role, tools, parent), messages: [first] };
    const usage = { inputTokens: 0, outputTokens: 0 };
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
            {
                type: "agent-ref",
                origin: "graphty",
                agent: role.name,
                callId: call.id,
                messages: conversation.messages as HelperMessages,
            },
        ],
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

    return {
        tool,
        run: async (calls, parent, state) => {
            const checked = calls.map((call) => ({ call, parsed: schema.safeParse(call.arguments) }));
            const running = checked.filter(({ call, parsed }) => parsed.success && call.invalidArguments !== true);
            // Helpers that run at once may only read: none writes under another's feet.
            const shared: MessageState = running.length > 1 ? { ...state, readOnly: "parallel-helper" } : state;
            const runs = await Promise.all(
                checked.map(({ call, parsed }): Promise<HelperRun> => {
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
                                    content: resultText(
                                        { code: "AI_TOOL_INVALID_ARGUMENTS", params },
                                        RESULT_CAP.small,
                                    ),
                                },
                            ],
                        });
                    }

                    const role = options.roles.find((candidate) => candidate.name === parsed.data.agent);
                    // The enum admits only role names.
                    return runHelper(role as AiAgentRole, call, parsed.data.task, parent, shared, options);
                }),
            );

            return {
                parts: runs.flatMap((run) => run.parts),
                usage: {
                    inputTokens: runs.reduce((sum, run) => sum + run.usage.inputTokens, 0),
                    outputTokens: runs.reduce((sum, run) => sum + run.usage.outputTokens, 0),
                },
            };
        },
    };
}
