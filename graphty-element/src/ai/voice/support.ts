/**
 * What the page offers for speech, and the per-origin memory of whether browser recognition
 * works: support is known only after one real start, because Quest Browser has a constructor
 * that fails.
 * @module ai/voice/support
 */

import type { AiVoiceOptions } from "../AiManager";
import { getSpeechRecognitionConstructor } from "../input/VoiceInputAdapter";
import type { VoiceEnvironment } from "./choose";

/** The `localStorage` key holding whether browser recognition worked on this origin. */
export const RECOGNITION_MEMORY_KEY = "@graphty-ai-voice:recognition";

/** What the first start of browser recognition on this origin showed. */
export type RecognitionProbe = "works" | "fails";

/**
 * What an earlier start of browser recognition on this origin showed.
 * @returns The remembered outcome, or undefined when none is, or storage cannot be read.
 */
export function recallRecognition(): RecognitionProbe | undefined {
    try {
        const value = globalThis.localStorage.getItem(RECOGNITION_MEMORY_KEY);
        return value === "works" || value === "fails" ? value : undefined;
    } catch {
        // No storage (a private window, blocked site data): probe again.
        return undefined;
    }
}

/**
 * Remember what a start of browser recognition showed, for every later element on this origin.
 * @param outcome - Whether it worked.
 */
export function rememberRecognition(outcome: RecognitionProbe): void {
    try {
        globalThis.localStorage.setItem(RECOGNITION_MEMORY_KEY, outcome);
    } catch {
        // No storage: the next element probes again.
    }
}

/**
 * The language speech is heard and spoken in: `voice.language`, else the page's.
 * @param options - The assistant's `voice`.
 * @returns A BCP 47 tag.
 */
export function voiceLanguage(options: AiVoiceOptions): string {
    return options.language ?? (globalThis.navigator as Navigator | undefined)?.language ?? "en-US";
}

/**
 * The microphone permission, where the browser answers (Firefox does not know "microphone").
 * @returns The state, or `"unknown"`.
 */
async function microphonePermission(): Promise<VoiceEnvironment["permission"]> {
    try {
        const { state } = await navigator.permissions.query({ name: "microphone" });
        return state;
    } catch {
        return "unknown";
    }
}

/**
 * Whether Chrome can recognize the language on the device (`SpeechRecognition.available`).
 * @param language - The language.
 * @returns `"process-locally"` when it can now, else `"none"`.
 */
async function processLocally(language: string): Promise<VoiceEnvironment["onDevice"]> {
    try {
        const available = await getSpeechRecognitionConstructor()?.available?.({
            langs: [language],
            processLocally: true,
        });
        return available === "available" ? "process-locally" : "none";
    } catch {
        return "none";
    }
}

/**
 * Read what the page offers for speech now.
 * @param language - The language speech is heard in.
 * @returns The facts `chooseVoice` reads, besides the provider's.
 */
export async function readVoiceEnvironment(language: string): Promise<VoiceEnvironment> {
    const nav = globalThis.navigator as Navigator | undefined;
    const ctor = getSpeechRecognitionConstructor();
    // WebKit without Chrome (Safari, visionOS, every iOS browser) recognizes on the device.
    const webkit = /AppleWebKit/.test(nav?.userAgent ?? "") && !/Chrome\//.test(nav?.userAgent ?? "");
    let onDevice: VoiceEnvironment["onDevice"] = "none";
    if (ctor !== null) {
        onDevice = webkit ? "always" : await processLocally(language);
    }

    const synth = (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
    return {
        secureContext: globalThis.isSecureContext,
        microphone: typeof nav?.mediaDevices?.getUserMedia === "function",
        permission: await microphonePermission(),
        recognition: ctor === null ? "none" : (recallRecognition() ?? "untried"),
        onDevice,
        synthesis: synth !== undefined,
        synthesisLocal: synth?.getVoices().find((voice) => voice.default)?.localService === true,
    };
}
