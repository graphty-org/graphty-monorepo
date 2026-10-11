/**
 * @file Anthropic on TanStack AI. Loaded on the first Anthropic turn.
 */

import { createAnthropicChat } from "@tanstack/ai-anthropic";

import type { ProviderApiSettings } from "../types";
import type { ProviderModule } from "./index";

/**
 * Each model family's output limit, first match wins: the AI SDK 5's table, which the API's limits
 * follow. The Messages API requires `max_tokens` and refuses one above the model's limit, and
 * TanStack's own default (64000 for any id it does not list, dated ids included) is above the
 * limit of several models.
 */
const MAX_OUTPUT_TOKENS: readonly (readonly [RegExp, number])[] = [
    [/claude-(?:opus-4-[678]|sonnet-4-6)/, 128_000],
    [/claude-(?:sonnet|opus|haiku)-4-5/, 64_000],
    [/claude-opus-4-1/, 32_000],
    [/claude-(?:sonnet-4-|3-7-sonnet)/, 64_000],
    [/claude-opus-4-/, 32_000],
    [/claude-(?:3-haiku|instant(?:-|$)|v?2(?=$|[-.:])|3(?=$|[-.]))/, 4096],
    [/claude-/, 128_000],
];

/**
 * The output limit to send for a model the consumer gave none for.
 * @param model - The model id.
 * @returns Its family's limit, or 4096 for an id that names no Claude family.
 */
function maxOutputTokens(model: string): number {
    return MAX_OUTPUT_TOKENS.find(([pattern]) => pattern.test(model))?.[1] ?? 4096;
}

/**
 * The adapter's base URL and fetch for the consumer's base URL, which keeps the AI SDK's meaning:
 * requests go to `<baseUrl>/messages`. The Anthropic SDK always adds `/v1/messages`, so a base URL
 * that ends in `/v1` loses it, and one that does not has the added `/v1` taken out again.
 * @param settings - The consumer's base URL.
 * @param fetch - graphty's fetch.
 * @returns The adapter's options.
 */
function endpoint(
    settings: ProviderApiSettings,
    fetch: typeof globalThis.fetch,
): { baseURL?: string; fetch: typeof globalThis.fetch } {
    const base = settings.baseUrl?.replace(/\/+$/, "");
    if (base === undefined || base.endsWith("/v1")) {
        return { ...(base !== undefined && { baseURL: base.slice(0, -"/v1".length) }), fetch };
    }

    return {
        baseURL: base,
        fetch: (input, init) =>
            fetch(input instanceof Request ? input : String(input).replace(`${base}/v1/`, `${base}/`), init),
    };
}

export const anthropic: ProviderModule = {
    createAdapter: (settings, fetch) =>
        // Any model id the consumer names is passed on, the dated default among them.
        createAnthropicChat(settings.model as Parameters<typeof createAnthropicChat>[0], settings.apiKey ?? "", {
            ...endpoint(settings, fetch),
            maxRetries: 0,
            // Also sends the anthropic-dangerous-direct-browser-access header the API asks a page for.
            dangerouslyAllowBrowser: true,
        }),
    modelOptions: (request, settings) => ({
        ...(request.tools.length > 0 && { tool_choice: { type: request.toolMode } }),
        max_tokens: request.maxOutputTokens ?? settings.maxTokens ?? maxOutputTokens(settings.model),
        ...(request.temperature !== undefined || settings.temperature !== undefined
            ? { temperature: request.temperature ?? settings.temperature }
            : {}),
    }),
    // A call carries back the metadata it came with, and only that.
    callStates: (own) => own.map((data) => data as Record<string, unknown> | undefined),
};
