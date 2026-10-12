/**
 * @file Google Gemini on TanStack AI. Loaded on the first Google turn.
 */

import { createGeminiChat, createGeminiSpeech, geminiRealtime } from "@tanstack/ai-gemini";
import { googleSearchTool } from "@tanstack/ai-gemini/tools";

import type { ProviderApiSettings } from "../types";
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

export const google: ProviderModule = {
    createAdapter: (settings, fetch) =>
        // Any model id the consumer names is passed on: the adapter's typed list is not the API's.
        createGeminiChat(settings.model as Parameters<typeof createGeminiChat>[0], settings.apiKey ?? "", {
            httpOptions: httpOptions(settings, fetch),
        }),
    // Google Search has no domain filter (`hostedToolLimits`) and no use cap: a request limited to
    // some domains is left out rather than honored in part.
    hostedTools: (requests) =>
        requests.some(({ tool, allowedDomains }) => tool === "web-search" && allowedDomains === undefined)
            ? [googleSearchTool()]
            : [],
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
