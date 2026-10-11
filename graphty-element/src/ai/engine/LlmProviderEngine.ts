/**
 * @file The engine over any `LlmProvider`: the mock, WebLLM in the browser, a consumer's own, and
 * for now `VercelAiProvider`. It is also the seam a later in-browser engine joins.
 */

import type { LlmProvider, Message, ToolDefinition } from "../providers/types";
import { API_KEY_MISSING_ERROR, toSafeError } from "../safeError";
import type {
    AiEngine,
    EngineCapabilities,
    EngineOutcome,
    SavedMessage,
    TurnError,
    TurnEvent,
    TurnRequest,
} from "./types";

/**
 * The coded error event for what a provider threw.
 * @param error - What it threw.
 * @param provider - The provider's name, a fact of the code.
 * @param signal - The turn's signal: when it fired, the turn was cancelled whatever was thrown.
 * @returns The error event.
 */
export function providerFailure(error: unknown, provider: string, signal: AbortSignal): TurnError {
    const cause = toSafeError(error);
    if (signal.aborted) {
        return { type: "error", code: "AI_CANCELLED", params: {}, cause };
    }

    if (cause.name === API_KEY_MISSING_ERROR) {
        return { type: "error", code: "AI_KEY_MISSING", params: { provider }, cause };
    }

    const { statusCode: status } = cause as { statusCode?: number };
    if (status === 401 || status === 403) {
        return { type: "error", code: "AI_KEY_REJECTED", params: { provider, status }, cause };
    }

    return {
        type: "error",
        code: "AI_PROVIDER_ERROR",
        params: status === undefined ? { provider } : { provider, status },
        cause,
    };
}

/**
 * A conversation as an `LlmProvider` takes it. A provider that refuses a system prompt beside
 * tools (WebLLM's Hermes models) gets the instructions at the head of the first user message.
 * @param request - The turn.
 * @param systemWithTools - Whether the provider accepts a system prompt beside tools.
 * @returns The provider's messages.
 */
function toProviderMessages(request: TurnRequest, systemWithTools: boolean): Message[] {
    const messages = request.messages.flatMap(toProviderMessage);
    const first = messages.findIndex((message) => message.role === "user");
    if (!systemWithTools && first !== -1) {
        messages[first] = { ...messages[first], content: `${request.system}\n\n${messages[first].content}` };
        return messages;
    }

    return [{ role: "system", content: request.system }, ...messages];
}

/**
 * One saved message as an `LlmProvider` takes it: a tool message per tool result.
 * @param message - The saved message.
 * @returns The provider's messages.
 */
function toProviderMessage(message: SavedMessage): Message[] {
    const text = message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
    switch (message.role) {
        case "user":
            return [{ role: "user", content: text }];
        case "assistant": {
            const toolCalls = message.parts.flatMap((part) =>
                part.type === "tool-call"
                    ? [{ id: part.callId, name: part.command, arguments: { ...part.arguments } }]
                    : [],
            );
            return [
                toolCalls.length > 0
                    ? { role: "assistant", content: text, toolCalls }
                    : { role: "assistant", content: text },
            ];
        }
        case "tool":
        default:
            return message.parts.flatMap((part) =>
                part.type === "tool-result"
                    ? [{ role: "tool" as const, toolCallId: part.callId, content: part.content }]
                    : [],
            );
    }
}

/** Runs one turn as one `generate` call on an `LlmProvider`. */
export class LlmProviderEngine implements AiEngine {
    readonly kind = "llm-provider";

    /**
     * An engine over a provider.
     * @param provider - The provider; it keeps its own key, model and options, so `configure()`
     *   on it reaches the next turn.
     */
    constructor(readonly provider: LlmProvider) {}

    /**
     * What the provider can do; it holds its own model.
     * @returns Whether it calls tools.
     */
    capabilities(): EngineCapabilities {
        return { toolCalls: this.provider.supportsTools ? "available" : "unsupported" };
    }

    /**
     * One turn: one `generate` call.
     * @param request - The turn.
     * @param signal - Cancels the provider's request.
     * @yields The text, the tool calls, the usage, then the finish; or one coded error.
     */
    async *turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent> {
        const tools: ToolDefinition[] = request.tools.map(({ name, description, schema }) => ({
            name,
            description,
            parameters: schema,
        }));
        const messages = toProviderMessages(request, this.provider.supportsSystemPromptWithTools !== false);
        let response;
        try {
            response = await this.provider.generate(messages, tools, { signal, toolChoice: request.toolMode });
        } catch (error) {
            yield providerFailure(error, this.provider.name, signal);
            return;
        }

        if (response.text) {
            yield { type: "text", delta: response.text };
        }

        for (const call of response.toolCalls) {
            yield { type: "tool-call", id: call.id, name: call.name, arguments: call.arguments };
        }

        if (response.usage) {
            const { promptTokens, completionTokens } = response.usage;
            yield { type: "usage", inputTokens: promptTokens, outputTokens: completionTokens };
        }

        yield { type: "finish", reason: response.toolCalls.length > 0 ? "tool-calls" : "stop" };
    }

    /**
     * Ask the provider whether its key is accepted.
     * @param signal - Codes a failure after it fired as cancelled.
     * @returns `AI_COMPLETED`, `AI_KEY_REJECTED`, or the code of what failed.
     */
    async checkKey(signal: AbortSignal): Promise<EngineOutcome> {
        try {
            return (await this.provider.validateApiKey())
                ? { code: "AI_COMPLETED", params: {} }
                : { code: "AI_KEY_REJECTED", params: { provider: this.provider.name } };
        } catch (error) {
            const { code, params } = providerFailure(error, this.provider.name, signal);
            return { code, params };
        }
    }

    /** The provider is the caller's: disposing the engine leaves it as it is. */
    dispose(): void {
        // Nothing of its own to release.
    }
}
