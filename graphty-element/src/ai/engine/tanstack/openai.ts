/**
 * @file OpenAI (the Responses API) on TanStack AI. Loaded on the first OpenAI turn.
 */

import { createOpenaiChat } from "@tanstack/ai-openai";
import { webSearchTool } from "@tanstack/ai-openai/tools";

import type { ProviderModule } from "./index";

export const openai: ProviderModule = {
    createAdapter: (settings, fetch) =>
        // Any model id the consumer names is passed on: the adapter's typed list is not the API's.
        createOpenaiChat(settings.model as Parameters<typeof createOpenaiChat>[0], settings.apiKey ?? "", {
            // The AI SDK's meaning, version path included, which is also the OpenAI SDK's.
            ...(settings.baseUrl !== undefined && { baseURL: settings.baseUrl }),
            maxRetries: 0,
            // The reader's own key, in the reader's own page: there is no server to keep it on.
            dangerouslyAllowBrowser: true,
            fetch,
        }),
    // No per-tool use cap: the loop counts uses.
    hostedTools: (requests) =>
        requests.flatMap(({ tool, allowedDomains }) =>
            tool === "web-search"
                ? [
                      webSearchTool({
                          type: "web_search",
                          ...(allowedDomains && { filters: { allowed_domains: [...allowedDomains] } }),
                      }),
                  ]
                : [],
        ),
    modelOptions: (request, settings) => ({
        ...(request.tools.length > 0 && { tool_choice: request.toolMode }),
        // A search's own result list, not only the pages the answer cites.
        ...(request.hostedTools?.some(({ tool }) => tool === "web-search") && {
            include: ["web_search_call.action.sources"],
        }),
        ...(request.maxOutputTokens !== undefined || settings.maxTokens !== undefined
            ? { max_output_tokens: request.maxOutputTokens ?? settings.maxTokens }
            : {}),
        ...(request.temperature !== undefined || settings.temperature !== undefined
            ? { temperature: request.temperature ?? settings.temperature }
            : {}),
    }),
    // A call carries back the metadata it came with (the Responses API item id, say), and only that.
    callStates: (own) => own.map((data) => data as Record<string, unknown> | undefined),
};
