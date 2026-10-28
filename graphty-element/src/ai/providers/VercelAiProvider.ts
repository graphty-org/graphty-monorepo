import { aiProviderDescriptor, type AiProviderId, type AiReasoningEffort } from "../../catalog/ai";
import { toolJsonSchema } from "../engine/jsonSchema";
import { providerFailure } from "../engine/LlmProviderEngine";
import { registerProviderApiEngine } from "../engine/load";
import { ProviderApiEngine } from "../engine/ProviderApiEngine";
import type { SavedMessage, TurnError, TurnRequest } from "../engine/types";
import type {
    LlmProvider,
    LlmResponse,
    Message,
    ProviderOptions,
    StreamCallbacks,
    ToolCall,
    ToolDefinition,
} from "./types";

/** Supported provider types */
export type VercelProviderType = Exclude<AiProviderId, "webllm" | "mock">;

/**
 * The model each provider uses when `configure` is given none: its `defaultModel` in the AI
 * catalogue. Each is a current model id from the provider's own model list (checked 2026-10-07);
 * a retired id fails every request.
 */
const DEFAULT_MODELS: Readonly<Record<VercelProviderType, string>> = {
    openai: aiProviderDescriptor("openai").defaultModel,
    anthropic: aiProviderDescriptor("anthropic").defaultModel,
    google: aiProviderDescriptor("google").defaultModel,
};

/**
 * A provider's messages and tools as one engine turn: the system messages become the system
 * prompt, and each tool message the result of the call it answers.
 * @param messages - The conversation.
 * @param tools - The tools the model may call.
 * @param toolMode - "none" for a text answer only.
 * @returns The turn.
 */
function toTurnRequest(messages: Message[], tools: ToolDefinition[], toolMode: "auto" | "none"): TurnRequest {
    const saved: SavedMessage[] = [];
    for (const [index, message] of messages.entries()) {
        const id = `m${index + 1}`;
        if (message.role === "user") {
            saved.push({ id, role: "user", parts: [{ type: "text", origin: "reader", text: message.content }] });
        } else if (message.role === "assistant") {
            saved.push({
                id,
                role: "assistant",
                parts: [
                    ...(message.content
                        ? [{ type: "text" as const, origin: "model" as const, text: message.content }]
                        : []),
                    ...(message.toolCalls ?? []).map((call) => ({
                        type: "tool-call" as const,
                        origin: "model" as const,
                        callId: call.id,
                        command: call.name,
                        arguments: call.arguments,
                    })),
                ],
            });
        } else if (message.role === "tool") {
            saved.push({
                id,
                role: "tool",
                parts: [
                    {
                        type: "tool-result",
                        origin: "graph-data",
                        callId: message.toolCallId ?? "",
                        code: "AI_COMPLETED",
                        params: {},
                        content: message.content,
                    },
                ],
            });
        }
    }

    return {
        system: messages.flatMap((message) => (message.role === "system" ? [message.content] : [])).join("\n\n"),
        messages: saved,
        tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            schema: tool.parameters,
            jsonSchema: toolJsonSchema(tool.parameters),
        })),
        toolMode,
    };
}

/** What a turn came to: the response, or the coded error it ended with. */
type TurnOutcome = { readonly response: LlmResponse } | { readonly error: TurnError };

/**
 * The LLM provider for OpenAI, Anthropic and Google: it holds the key, the model and the options,
 * and calls the provider's API directly from the page. (The name is historical: the Vercel AI SDK
 * no longer runs underneath.)
 */
export class VercelAiProvider implements LlmProvider {
    readonly name: string;
    readonly supportsStreaming = true;
    readonly supportsTools = true;

    private apiKey?: string;
    private model?: string;
    private baseUrl?: string;
    private maxTokens?: number;
    private temperature?: number;
    private reasoningEffort?: AiReasoningEffort;
    private thinkingBudgetTokens?: number;
    private readonly providerType: VercelProviderType;
    /** Reads this provider's configuration at every turn. */
    private readonly engine: ProviderApiEngine;

    /**
     * Creates a new VercelAiProvider instance.
     * @param providerType - Type of provider (openai, anthropic, or google)
     */
    constructor(providerType: VercelProviderType) {
        this.name = providerType;
        this.providerType = providerType;
        this.engine = new ProviderApiEngine(() => ({
            provider: this.providerType,
            apiKey: this.apiKey,
            model: this.model ?? DEFAULT_MODELS[this.providerType],
            baseUrl: this.baseUrl,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            reasoningEffort: this.reasoningEffort,
            thinkingBudgetTokens: this.thinkingBudgetTokens,
        }));
        // The assistant runs this provider on that engine, unless a subclass replaced `generate`,
        // whose override then answers every turn.
        registerProviderApiEngine(this, () =>
            Reflect.get(this, "generate") === Reflect.get(VercelAiProvider.prototype, "generate")
                ? this.engine
                : undefined,
        );
    }

    /**
     * Configure the provider with options.
     * @param options - Provider configuration options
     */
    configure(options: ProviderOptions): void {
        this.apiKey = options.apiKey;
        this.model = options.model;
        this.baseUrl = options.baseUrl;
        this.maxTokens = options.maxTokens;
        this.temperature = options.temperature;
        this.reasoningEffort = options.reasoningEffort;
        this.thinkingBudgetTokens = options.thinkingBudgetTokens;
    }

    /**
     * One turn on the engine.
     * @param request - The turn.
     * @param signal - Cancels it.
     * @param callbacks - Told of each text delta and tool call as it arrives.
     * @returns The response, or the error the turn ended with.
     */
    private async run(
        request: TurnRequest,
        signal: AbortSignal,
        callbacks?: Pick<StreamCallbacks, "onChunk" | "onToolCall">,
    ): Promise<TurnOutcome> {
        let text = "";
        const toolCalls: ToolCall[] = [];
        let usage: LlmResponse["usage"];
        let finished = false;
        for await (const event of this.engine.turn(request, signal)) {
            switch (event.type) {
                case "text":
                    text += event.delta;
                    callbacks?.onChunk(event.delta);
                    break;
                case "tool-call":
                    // A call whose arguments did not parse is not handed on to run with none.
                    if (event.invalidArguments) {
                        break;
                    }

                    toolCalls.push({ id: event.id, name: event.name, arguments: { ...event.arguments } });
                    callbacks?.onToolCall(event.name, event.arguments);
                    break;
                case "usage":
                    usage = { promptTokens: event.inputTokens, completionTokens: event.outputTokens };
                    break;
                case "error":
                    return { error: event };
                case "finish":
                    finished = true;
                    break;
                default:
                    break;
            }
        }

        // A stream that ended without a finish was dropped: what it carried may be cut short.
        return finished
            ? { response: { text, toolCalls, usage } }
            : {
                  error: providerFailure(
                      new Error("The model's turn ended without finishing."),
                      this.providerType,
                      signal,
                  ),
              };
    }

    /**
     * Generate a response from the LLM.
     * @param messages - Conversation messages
     * @param tools - Available tools for the LLM
     * @param options - Generation options
     * @param options.signal - Optional abort signal
     * @param options.toolChoice - "none" for a text answer only; "auto" (default) lets the model call tools
     * @returns Promise resolving to LLM response
     */
    async generate(
        messages: Message[],
        tools: ToolDefinition[],
        options?: { signal?: AbortSignal; toolChoice?: "auto" | "none" },
    ): Promise<LlmResponse> {
        const outcome = await this.run(
            toTurnRequest(messages, tools, options?.toolChoice ?? "auto"),
            options?.signal ?? new AbortController().signal,
        );
        if ("error" in outcome) {
            throw outcome.error.cause;
        }

        return outcome.response;
    }

    /**
     * Generate a streaming response from the LLM.
     * @param messages - Conversation messages
     * @param tools - Available tools for the LLM
     * @param callbacks - Streaming callbacks for text and tool calls
     * @param signal - Optional abort signal
     */
    async generateStream(
        messages: Message[],
        tools: ToolDefinition[],
        callbacks: StreamCallbacks,
        signal?: AbortSignal,
    ): Promise<void> {
        const outcome = await this.run(
            toTurnRequest(messages, tools, "auto"),
            signal ?? new AbortController().signal,
            callbacks,
        );
        if ("error" in outcome) {
            callbacks.onError(outcome.error.cause);
            throw outcome.error.cause;
        }

        callbacks.onComplete(outcome.response);
    }

    /**
     * Validate the configured API key by making a minimal API call.
     * This sends a simple prompt to verify the key works.
     * @returns Promise resolving to true if valid, false if invalid (refused, or none configured)
     * @throws Error if a network error or another provider error occurs
     */
    async validateApiKey(): Promise<boolean> {
        const outcome = await this.run(
            toTurnRequest([{ role: "user", content: "hi" }], [], "auto"),
            new AbortController().signal,
        );
        if (!("error" in outcome)) {
            return true;
        }

        const { code, cause } = outcome.error;
        if (code === "AI_KEY_REJECTED" || code === "AI_KEY_MISSING") {
            return false;
        }

        throw cause;
    }
}
