/**
 * @file Anthropic on TanStack AI. Loaded on the first Anthropic turn.
 */

import { createAnthropicChat } from "@tanstack/ai-anthropic";

import type { ProviderModule } from "./index";

export const anthropic: ProviderModule = {
    createAdapter: (settings, fetch) =>
        // Any model id the consumer names is passed on, the dated default among them.
        createAnthropicChat(settings.model as Parameters<typeof createAnthropicChat>[0], settings.apiKey ?? "", {
            // The AI SDK's base URL ends in the API version; the Anthropic SDK adds it itself.
            ...(settings.baseUrl !== undefined && { baseURL: settings.baseUrl.replace(/\/v1\/*$/, "") }),
            maxRetries: 0,
            // Also sends the anthropic-dangerous-direct-browser-access header the API asks a page for.
            dangerouslyAllowBrowser: true,
            fetch,
        }),
    modelOptions: (request, settings) => ({
        ...(request.tools.length > 0 && { tool_choice: { type: request.toolMode } }),
        ...(request.maxOutputTokens !== undefined || settings.maxTokens !== undefined
            ? { max_tokens: request.maxOutputTokens ?? settings.maxTokens }
            : {}),
        ...(request.temperature !== undefined || settings.temperature !== undefined
            ? { temperature: request.temperature ?? settings.temperature }
            : {}),
    }),
    // A call carries back the metadata it came with, and only that.
    callStates: (own) => own.map((data) => data as Record<string, unknown> | undefined),
};
