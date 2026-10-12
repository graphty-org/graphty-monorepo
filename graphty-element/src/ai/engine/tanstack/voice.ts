/**
 * @file The provider-API adapter's speech: transcription and speech through TanStack AI, one
 * request per call, no retry (retries are the engine's). Loaded by its own `import()`
 * (`loadProviderVoice()` in `../load.ts`) on the first clip or spoken answer; each provider's
 * adapters come with that provider's chunk.
 *
 * OpenAI has both endpoints (`generateTranscription`, `generateSpeech`). Gemini has speech only:
 * its chat model transcribes, in one `chat()` turn with the clip as an audio part and no tools.
 */

import { chat, generateSpeech, generateTranscription } from "@tanstack/ai";

import { AI_VOICE_CAPABILITIES } from "../../../catalog/ai";
import type {
    ProviderApiId,
    ProviderApiSettings,
    ProviderVoice,
    SpeakOptions,
    TranscribeOptions,
    TurnError,
    VoiceAttempt,
} from "../types";
import { failure, PROVIDERS, recordingFetch, type ResponseRecord } from "./index";

/** One provider's speech adapters, with the reader's key, the consumer's base URL and graphty's fetch. */
export interface ProviderVoiceModule {
    /** The transcription adapter; absent when the chat model transcribes. */
    transcription?(
        model: string,
        settings: ProviderApiSettings,
        fetch: typeof globalThis.fetch,
    ): Parameters<typeof generateTranscription>[0]["adapter"];
    speech(
        model: string,
        settings: ProviderApiSettings,
        fetch: typeof globalThis.fetch,
    ): Parameters<typeof generateSpeech>[0]["adapter"];
    /** The adapter refuses a voice name it does not list, before any request. */
    readonly refusesUnknownVoices?: true;
}

/** Each provider's speech module, in that provider's chunk. */
const VOICES: Partial<Record<ProviderApiId, () => Promise<ProviderVoiceModule>>> = {
    openai: async () => (await import("./openai")).openaiVoice,
    google: async () => (await import("./google")).googleVoice,
};

/** What the chat model is asked when it transcribes: a model instruction, never shown to a reader. */
const TRANSCRIBE_INSTRUCTION =
    "Transcribe the speech in this audio clip exactly as spoken. Reply with the transcript only, with no other text.";

/**
 * graphty's recording fetch, cancelled by the call's signal too: the SDKs' audio calls do not
 * pass TanStack's signal on to their request. It names the page's `Response`, which the OpenAI
 * SDK otherwise learns by fetching `data:,` before its first multipart request with a new fetch.
 * @param record - Where the response is recorded.
 * @param signal - The call's signal.
 * @param onSend - Called as each request is sent.
 * @returns The fetch.
 */
function voiceFetch(record: ResponseRecord, signal: AbortSignal, onSend: () => void): typeof globalThis.fetch {
    const fetch = recordingFetch(record);
    return Object.assign(
        (input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
            onSend();
            return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, signal]) : signal });
        },
        { Response: globalThis.Response },
    );
}

/**
 * A clip's bytes as base64.
 * @param blob - The clip.
 * @returns Its base64.
 */
async function toBase64(blob: Blob): Promise<string> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let at = 0; at < bytes.length; at += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
    }

    return btoa(binary);
}

/**
 * Audio from base64.
 * @param base64 - The bytes.
 * @param type - Their content type.
 * @returns The audio.
 */
function fromBase64(base64: string, type: string): Blob {
    return new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type });
}

/**
 * A clip's content type without its parameters (`audio/webm;codecs=opus` is `audio/webm`).
 * @param blob - The clip.
 * @returns The type; `audio/wav` when the clip names none.
 */
function audioType(blob: Blob): string {
    return blob.type.split(";")[0].trim() || "audio/wav";
}

/**
 * The clip as a file whose name matches its type: the OpenAI adapter names every `Blob`
 * `audio.mp3`, and the API reads the format from the name (UPSTREAM.md).
 * @param blob - The clip.
 * @returns The file.
 */
function audioFile(blob: Blob): File {
    const type = audioType(blob);
    const subtype = type.split("/")[1] ?? "wav";
    const extension = { mpeg: "mp3", "x-wav": "wav", wave: "wav", "x-m4a": "m4a" }[subtype] ?? subtype;
    return new File([blob], `audio.${extension}`, { type: blob.type || type });
}

/**
 * Run one call, coding what it threw as a turn's error is coded.
 * @param settings - The provider and key.
 * @param signal - The call's signal.
 * @param call - The call, with graphty's fetch.
 * @param refusedUnsent - What a throw before any request means, when the caller knows.
 * @returns Its value, or the coded error.
 */
async function attempt<T>(
    settings: ProviderApiSettings,
    signal: AbortSignal,
    call: (fetch: typeof globalThis.fetch) => Promise<T>,
    refusedUnsent?: TurnError,
): Promise<VoiceAttempt<T>> {
    const record: ResponseRecord = { networkError: false };
    let sent = false;
    try {
        if (signal.aborted) {
            throw new DOMException("The call was cancelled.", "AbortError");
        }

        const value = await call(
            voiceFetch(record, signal, () => {
                sent = true;
            }),
        );
        if (signal.aborted) {
            throw new DOMException("The call was cancelled.", "AbortError");
        }

        return { type: "done", value };
    } catch (error) {
        if (refusedUnsent !== undefined && !sent && !signal.aborted) {
            return refusedUnsent;
        }

        return failure(error instanceof Error ? error.message : String(error), record, settings, signal);
    }
}

/**
 * Speech to text through the provider: its transcription endpoint, or its chat model.
 * @param settings - The provider, key, chat model and base URL.
 * @param audio - The clip.
 * @param options - The language and the transcription model.
 * @param signal - Cancels the request.
 * @returns The text heard, or the coded error.
 */
async function transcribe(
    settings: ProviderApiSettings,
    audio: Blob,
    options: TranscribeOptions,
    signal: AbortSignal,
): Promise<VoiceAttempt<string>> {
    const voice = await VOICES[settings.provider]?.();
    const model = options.model ?? AI_VOICE_CAPABILITIES[settings.provider].transcription.model;
    const transcription = voice?.transcription?.bind(voice);
    if (transcription !== undefined && model !== undefined) {
        return attempt(settings, signal, async (fetch) => {
            const result = await generateTranscription({
                adapter: transcription(model, settings, fetch),
                audio: audioFile(audio),
                // OpenAI takes ISO 639-1, the BCP 47 tag's language.
                ...(options.language !== undefined && { language: options.language.split("-")[0].toLowerCase() }),
                abortSignal: signal,
            });
            return result.text.trim();
        });
    }

    const module = await PROVIDERS[settings.provider]();
    return attempt(settings, signal, async (fetch) => {
        const request = { system: "", messages: [], tools: [], toolMode: "none" } as const;
        const controller = new AbortController();
        const cancel = (): void => {
            controller.abort(signal.reason);
        };
        signal.addEventListener("abort", cancel, { once: true });
        try {
            const { text } = await chat({
                adapter: module.createAdapter(settings, fetch, request),
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                content:
                                    options.language === undefined
                                        ? TRANSCRIBE_INSTRUCTION
                                        : `${TRANSCRIBE_INSTRUCTION} The language spoken is ${options.language}.`,
                            },
                            {
                                type: "audio",
                                source: { type: "data", value: await toBase64(audio), mimeType: audioType(audio) },
                            },
                        ],
                    },
                ],
                abortController: controller,
                stream: false,
                debug: false,
            });
            return text.trim();
        } finally {
            signal.removeEventListener("abort", cancel);
        }
    });
}

/**
 * Text to speech through the provider.
 * @param settings - The provider, key and base URL.
 * @param text - What to say.
 * @param options - The voice and the speech model.
 * @param signal - Cancels the request.
 * @returns The audio, in the provider's content type, or the coded error.
 */
async function speak(
    settings: ProviderApiSettings,
    text: string,
    options: SpeakOptions,
    signal: AbortSignal,
): Promise<VoiceAttempt<Blob>> {
    const voice = await VOICES[settings.provider]?.();
    const model = options.model ?? AI_VOICE_CAPABILITIES[settings.provider].speech.model;
    const { voiceName } = options;
    const unavailable: TurnError = {
        type: "error",
        code: "AI_VOICE_UNAVAILABLE",
        params: { path: "output", reason: "no-provider-speech" },
        cause: Object.assign(new Error("The provider has no such speech voice."), { name: "VoiceUnavailable" }),
    };
    if (voice === undefined || model === undefined) {
        return unavailable;
    }

    return attempt(
        settings,
        signal,
        async (fetch) => {
            const result = await generateSpeech({
                adapter: voice.speech(model, settings, fetch),
                text,
                ...(voiceName !== undefined && { voice: voiceName }),
                abortSignal: signal,
            });
            return fromBase64(result.audio, result.contentType ?? "audio/mpeg");
        },
        // The adapter's throw before sending anything is its refusal of the name.
        voiceName !== undefined && voice.refusesUnknownVoices === true ? unavailable : undefined,
    );
}

export const providerVoice: ProviderVoice = { transcribe, speak };
