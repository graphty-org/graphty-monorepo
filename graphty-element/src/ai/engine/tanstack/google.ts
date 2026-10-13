/**
 * @file Google Gemini on TanStack AI. Loaded on the first Google turn.
 */

import { createGeminiChat, createGeminiSpeech, geminiRealtime } from "@tanstack/ai-gemini";
import { googleSearchTool, urlContextTool } from "@tanstack/ai-gemini/tools";

import type { ProviderApiSettings, TurnRequest } from "../types";
import type { ProviderModule } from "./index";
import type { ProviderLiveModule } from "./live";
import type { ProviderVoiceModule } from "./voice";

/**
 * The value Gemini documents for a function call whose thought signature is not available (one
 * another model or engine made): it skips the check that a Gemini 3 model's calls are signed.
 */
const SKIP_SIGNATURE = "skip_thought_signature_validator";

/**
 * Whether the model checks thought signatures: every Gemini model from 3 on, as the AI SDK decides.
 * @param model - The model id.
 * @returns Whether it does.
 */
function checksSignatures(model: string): boolean {
    return (
        /(^|\/)gemini-/i.test(model) &&
        !/(^|\/)gemini-[12](?:[.-]|$)/i.test(model) &&
        !/(^|\/)gemini-pro(?:-vision)?$/i.test(model)
    );
}

/**
 * The AI SDK's Google base URL ends in the API version; `@google/genai` takes the two apart.
 * @param baseUrl - The consumer's base URL.
 * @returns The base and the version.
 */
function splitBaseUrl(baseUrl: string): { baseUrl: string; apiVersion: string } {
    const match = /^(.*?)\/(v1beta|v1)\/*$/.exec(baseUrl);
    return match ? { baseUrl: match[1], apiVersion: match[2] } : { baseUrl, apiVersion: "" };
}

/**
 * `@google/genai`'s HTTP options, the same for chat and speech.
 * @param settings - The base URL.
 * @param fetch - graphty's fetch.
 * @returns The options.
 */
function httpOptions(
    settings: ProviderApiSettings,
    fetch: typeof globalThis.fetch,
): { baseUrl?: string; apiVersion?: string; retryOptions: { attempts: number }; fetch: typeof globalThis.fetch } {
    return {
        ...(settings.baseUrl !== undefined && splitBaseUrl(settings.baseUrl)),
        // One attempt: retries are the engine's.
        retryOptions: { attempts: 1 },
        fetch,
    };
}

/** An http or https URL in a text, up to the first character a URL in prose cannot hold. */
const URL_IN_TEXT = /https?:\/\/[^\s"'<>()]+/gi;
/** What separates words, for finding host names outside URLs: anything a host name cannot hold. */
const NOT_HOST = /[^\w.-]+/;
/** One label of a host name. */
const LABEL = /^[\w-]+$/;
/** The last label of a host name: letters only, two or more. */
const TOP_LABEL = /^[a-z]{2,}$/i;

/**
 * Whether a word looks like a host name (`example.com`, `www.example.org`): two or more labels,
 * the last of them letters.
 * @param word - The word, without the punctuation around it.
 * @returns True when it does.
 */
function looksLikeHost(word: string): boolean {
    const labels = word.split(".");
    return labels.length > 1 && labels.every((label) => LABEL.test(label)) && TOP_LABEL.test(labels.at(-1) ?? "");
}

/**
 * Every host a text names: those of its http and https URLs, and every other word that looks
 * like a host name.
 * @param text - The text.
 * @returns The hosts, lower case.
 */
function hostsIn(text: string): string[] {
    const hosts: string[] = [];
    const rest = text.replaceAll(URL_IN_TEXT, (url) => {
        hosts.push(URL.canParse(url) ? new URL(url).hostname : url);
        return " ";
    });
    const words = rest.split(NOT_HOST).map((word) => word.replaceAll(/^\.+|\.+$/g, ""));
    return [...hosts, ...words.filter(looksLikeHost)].map((host) => host.toLowerCase());
}

/**
 * Every string a value holds, at any depth.
 * @param value - The value.
 * @returns The strings.
 */
function stringsIn(value: unknown): string[] {
    if (typeof value === "string") {
        return [value];
    }

    return typeof value === "object" && value !== null ? Object.values(value).flatMap(stringsIn) : [];
}

/**
 * Whether URL context may run in a turn. It has no domain filter: Gemini reads whatever address
 * the turn's messages hold, including one the model wrote into a helper's task. So it runs only
 * when every host the messages name is one web fetch may reach (a domain or a subdomain of one).
 * ponytail: a dotted word that is not a host ("node.js", "data.csv") also keeps URL context out of
 * the turn; a finer test needs Gemini to say which addresses it would read before reading them.
 * @param request - The turn.
 * @param allowedDomains - The hosts web fetch may reach.
 * @returns True when it may.
 */
function urlContextAllowed(request: TurnRequest, allowedDomains: readonly string[]): boolean {
    const allowed = allowedDomains.map((domain) => domain.toLowerCase());
    return stringsIn(request.messages)
        .flatMap(hostsIn)
        .every((host) => allowed.some((domain) => host === domain || host.endsWith(`.${domain}`)));
}

export const google: ProviderModule = {
    createAdapter: (settings, fetch) =>
        // Any model id the consumer names is passed on: the adapter's typed list is not the API's.
        createGeminiChat(settings.model as Parameters<typeof createGeminiChat>[0], settings.apiKey ?? "", {
            httpOptions: httpOptions(settings, fetch),
        }),
    // Google Search has no domain filter (`hostedToolLimits`) and no use cap: a request limited to
    // some domains is left out rather than honored in part. URL context has none either: it runs
    // only when the turn names no host web fetch may not reach.
    hostedTools: (requests, request) => [
        ...(requests.some(({ tool, allowedDomains }) => tool === "web-search" && allowedDomains === undefined)
            ? [googleSearchTool()]
            : []),
        ...(requests.some(
            ({ tool, allowedDomains }) =>
                tool === "web-fetch" && allowedDomains !== undefined && urlContextAllowed(request, allowedDomains),
        )
            ? [urlContextTool()]
            : []),
    ],
    // The adapter drops `urlContextMetadata`: each address URL context read and whether it loaded.
    rawHostedCall: (chunk) => {
        const metadata = (chunk as { candidates?: { urlContextMetadata?: unknown }[] } | undefined)?.candidates?.[0]
            ?.urlContextMetadata;
        return metadata === undefined
            ? undefined
            : { name: "url_context", metadata: { providerExecuted: true, gemini: { urlContextMetadata: metadata } } };
    },
    modelOptions: (request, settings) => ({
        ...(request.tools.length > 0 && {
            toolConfig: { functionCallingConfig: { mode: request.toolMode === "none" ? "NONE" : "AUTO" } },
        }),
        ...(request.maxOutputTokens !== undefined || settings.maxTokens !== undefined
            ? { maxOutputTokens: request.maxOutputTokens ?? settings.maxTokens }
            : {}),
        ...(request.temperature !== undefined || settings.temperature !== undefined
            ? { temperature: request.temperature ?? settings.temperature }
            : {}),
        // Gemini 3's thinking level, under the API's own enum names.
        ...(settings.reasoningEffort !== undefined && {
            thinkingConfig: { thinkingLevel: settings.reasoningEffort.toUpperCase() },
        }),
    }),
    // A call keeps its own signature. Gemini signs only the first call of a parallel batch, so
    // the calls before the first signed one, when the model checks signatures and they carry
    // none (made by another model or engine), get the documented placeholder, as the AI SDK does.
    callStates: (own, model) => {
        let signed = false;
        return own.map((data) => {
            const signature = (data as { thoughtSignature?: unknown } | undefined)?.thoughtSignature;
            if (typeof signature === "string") {
                signed = true;
                return { thoughtSignature: signature };
            }

            return !signed && checksSignatures(model) ? { thoughtSignature: SKIP_SIGNATURE } : undefined;
        });
    },
};

/**
 * Gemini's speech, one `generateContent` asking for audio. Gemini has no transcription endpoint:
 * the chat model transcribes (`voice.ts`).
 */
export const googleVoice: ProviderVoiceModule = {
    speech: (model, settings, fetch) =>
        createGeminiSpeech(model as Parameters<typeof createGeminiSpeech>[0], settings.apiKey ?? "", {
            httpOptions: httpOptions(settings, fetch),
        }),
    // The adapter throws, in English, on a voice name `GeminiTTSVoices` does not list.
    refusesUnknownVoices: true,
};

/** Gemini's live conversations: a WebSocket to the fixed Gemini host, with the token in its URL. */
export const googleLive: ProviderLiveModule = {
    // Any model id the consumer names is passed on: the adapter's typed list is not the API's.
    realtime: (model) => geminiRealtime({ model: model as NonNullable<Parameters<typeof geminiRealtime>[0]>["model"] }),
};
