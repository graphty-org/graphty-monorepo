/**
 * @file The AI guide's web search, sources and in-page code examples (docs/guide/ai-assistant.md,
 * "Web search, web pages and code"), written from the guide alone and compiled against the
 * published declarations with no cast.
 *
 * The config must take `tools` (`webSearch`, `webFetch` with `maxUses`, `allowedDomains` and
 * `required`, `inPageCode`, `webContentMayWrite`) and a role's `tools`; `ai-hosted-tool-result` and
 * `ai-capability-unavailable` must reach an element listener with a typed `detail`; an assistant
 * message must carry `sources`; `getAiCapabilities()` must return per-tool statuses; and the
 * catalog must export the table and `aiHostedToolStatus`. Nothing here runs;
 * `tsconfig.strict-consumer.json` checks it against `dist/`.
 */

import type { AiSource, ExecutionResult } from "@graphty/graphty-element/ai";
import {
    AI_HOSTED_TOOL_CAPABILITIES,
    type AiCapabilityStatus,
    aiHostedToolStatus,
} from "@graphty/graphty-element/catalog";

/**
 * The guide's simple path: web search on, sources listed as they arrive.
 * @param myKey - The provider key.
 * @param list - Where the page lists the sources.
 * @returns The message's result.
 */
export async function searchTheWeb(myKey: string, list: HTMLUListElement): Promise<ExecutionResult | null> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return null;
    }

    element.addEventListener("ai-hosted-tool-result", (e) => {
        for (const source of e.detail.sources) {
            const item = document.createElement("li");
            item.textContent = source.title ?? source.url;
            list.append(item);
        }
    });

    await element.enableAiControl({ provider: "google", apiKey: myKey, tools: { webSearch: true } });
    return element.aiCommand("Search the web for the year the Eiffel Tower opened");
}

/**
 * The guide's sources renderer: text links, http and https only.
 * @param sources - An assistant message's sources.
 * @returns The list.
 */
export function sourceLinks(sources: readonly AiSource[]): HTMLElement {
    const list = document.createElement("ul");
    for (const source of sources) {
        const item = document.createElement("li");
        const label = source.title ?? new URL(source.url).hostname;
        if (/^https?:\/\//i.test(source.url)) {
            const link = document.createElement("a");
            link.href = source.url;
            link.textContent = label;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            item.append(link);
        } else {
            item.textContent = label;
        }

        list.append(item);
    }

    return list;
}

/**
 * The transcript with each answer's sources under it.
 * @param transcript - The page's transcript list.
 */
export function drawTranscript(transcript: HTMLElement): void {
    const element = document.querySelector("graphty-element");
    element?.addEventListener("ai-conversation-changed", () => {
        transcript.replaceChildren();
        for (const message of element.getAiConversation()?.messages ?? []) {
            const item = document.createElement("li");
            item.textContent = message.text;
            if (message.role === "assistant" && message.sources.length > 0) {
                item.append(sourceLinks(message.sources));
            }

            transcript.append(item);
        }
    });
}

/**
 * The advanced path: limits, a required tool, code, a helper with web tools, the capabilities and
 * the event for a tool left out.
 * @param myKey - The provider key.
 * @returns Whether web search can be used.
 */
export async function advancedTools(myKey: string): Promise<AiCapabilityStatus | null> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return null;
    }

    element.addEventListener("ai-capability-unavailable", (e) => {
        const { tool, code, params } = e.detail;
        console.log(tool, code, params.provider, params.model);
    });

    await element.enableAiControl({
        provider: "anthropic",
        apiKey: myKey,
        tools: {
            webSearch: { maxUses: 3, allowedDomains: ["wikipedia.org"] },
            webFetch: { allowedDomains: ["example.org"] },
            inPageCode: { required: true },
            webContentMayWrite: false,
        },
        agents: [
            {
                name: "fact-checker",
                purpose: "Checks node names against the web; changes nothing",
                commands: ["query"],
                tools: { webSearch: { maxUses: 2 } },
            },
        ],
    });

    const result = await element.aiCommand("Use code to compute the average degree of the graph");
    if (result.code === "AI_HOSTED_TOOL_UNSUPPORTED" || result.code === "AI_PROVIDER_PAUSED") {
        return "unsupported";
    }

    const fromTable = AI_HOSTED_TOOL_CAPABILITIES.google["web-fetch"];
    const forModel = aiHostedToolStatus("openai", "gpt-4o", "web-search");
    console.log(fromTable, forModel);
    return element.getAiCapabilities()?.tools["web-search"] ?? null;
}

/**
 * The run_code config alone: code on, and whether this page can run it.
 * @param myKey - The provider key.
 * @returns True when in-page code is available.
 */
export async function runCode(myKey: string): Promise<boolean> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return false;
    }

    await element.enableAiControl({ provider: "google", apiKey: myKey, tools: { inPageCode: true } });
    return element.getAiCapabilities()?.tools["in-page-code"] === "available";
}
