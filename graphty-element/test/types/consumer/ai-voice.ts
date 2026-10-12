/**
 * @file The voice simple path (design 4.6: a talk button held by pointer or by Space), a support
 * check, the voice events and an XR labels map, compiled against the published declarations with
 * no cast.
 *
 * The config must take `voice`; the element must have `aiTalk`, `stopAiSpeech` and
 * `getAiVoiceSupport`; `ai-voice-end`, `ai-voice-level` and `ai-speech-end` must reach an element
 * listener with a typed `detail`; the catalog must export the provider voice table and
 * `aiVoiceStatus`; and `XRConfig` must take the `ai` group. Nothing here runs;
 * `tsconfig.strict-consumer.json` checks it against `dist/`.
 */

import type { XRAiConfig } from "@graphty/graphty-element";
import type { AiVoiceOptions, AiVoiceSupport } from "@graphty/graphty-element/ai";
import {
    AI_VOICE_CAPABILITIES,
    type AiCapabilityStatus,
    aiVoiceStatus,
    type AiVoiceUnavailableReason,
} from "@graphty/graphty-element/catalog";

/**
 * The simple path: speech in, speech out, a button held to talk.
 * @param myKey - The provider key.
 * @param talk - Any button the page draws.
 */
export async function talkButton(myKey: string, talk: HTMLButtonElement): Promise<void> {
    const g = document.querySelector("graphty-element");
    if (g === null) {
        return;
    }

    await g.enableAiControl({ provider: "openai", apiKey: myKey, voice: { input: "auto", output: "browser" } });

    talk.onpointerdown = (e) => {
        talk.setPointerCapture(e.pointerId);
        g.aiTalk(true);
    };
    talk.onpointerup = talk.onpointercancel = () => {
        g.aiTalk(false);
    };
    talk.onkeydown = (e) => {
        if (e.key === " " && !e.repeat) {
            g.aiTalk(true);
        }
    };
    talk.onkeyup = (e) => {
        if (e.key === " ") {
            g.aiTalk(false);
        }
    };

    g.addEventListener("ai-voice-level", (e) => {
        talk.style.setProperty("--level", String(e.detail.level));
    });
    g.addEventListener("ai-voice-end", (e) => {
        talk.dataset.code = e.detail.code ?? "";
    });
    g.addEventListener("ai-speech-end", (e) => {
        talk.dataset.spoken = e.detail.code;
    });
}

/**
 * Show the talk button only when speech can be heard.
 * @param talk - The button.
 * @returns The support found.
 */
export async function showWhenSupported(talk: HTMLButtonElement): Promise<AiVoiceSupport | null> {
    const g = document.querySelector("graphty-element");
    if (g === null) {
        return null;
    }

    const support = await g.getAiVoiceSupport();
    talk.hidden = support.input.status === "unavailable";
    talk.title = support.input.destination;
    g.stopAiSpeech();
    return support;
}

/** Every option, French, with the host's own words for outcomes the model wrote no text for. */
export const advanced: AiVoiceOptions = {
    input: "provider",
    output: "auto",
    language: "fr-FR",
    voiceName: "alloy",
    push: "toggle",
    transcription: { provider: "openai", model: "gpt-4o-mini-transcribe" },
    replies: { approve: ["oui"], deny: ["non"] },
    say: ({ code }) => (code === "AI_CONFIRMATION_NEEDED" ? "Je dois demander." : undefined),
};

/** The XR controls, rebound, with the words the scene draws. */
export const xrAi: XRAiConfig = {
    pushToTalk: { buttons: ["y"], wristOrb: false },
    pendingButtons: { approve: ["a"], deny: ["x"] },
    pendingControl: true,
    panel: false,
    labels: { approve: "Oui", deny: "Non" },
};

/**
 * A live conversation, and why it cannot run.
 * @param myKey - The provider key.
 * @returns Why live cannot run, when it cannot.
 */
export async function liveWhenSupported(myKey: string): Promise<string | undefined> {
    const g = document.querySelector("graphty-element");
    if (g === null) {
        return undefined;
    }

    await g.enableAiControl({
        provider: "openai",
        apiKey: myKey,
        voice: { mode: "live", liveModel: "gpt-realtime-2.1" },
    });
    g.addEventListener("ai-voice-start", (e) => {
        if (e.detail.mode === "turns" && e.detail.code !== undefined) {
            g.dataset.why = String(e.detail.params?.reason);
        }
    });
    const support = await g.getAiVoiceSupport();
    return support.live?.code;
}

export const liveModel: string | undefined = AI_VOICE_CAPABILITIES.google.live?.model;
export const liveBaseUrl: AiVoiceUnavailableReason = "live-custom-base-url";

/** The catalog's facts: can a provider transcribe? */
export const googleHears: AiCapabilityStatus = aiVoiceStatus("google", "input");
export const openAiSpeechModel: string | undefined = AI_VOICE_CAPABILITIES.openai.speech.model;
export const noMic: AiVoiceUnavailableReason = "no-microphone";

/**
 * The AI guide's "Voice" section, as a reader who sees only the guide writes it: the simple path
 * with its arrow-function handlers, the support check, the French options, the level meter and
 * the `xr.ai` labels map set on the element.
 * @param myKey - The provider key.
 * @param showWhy - The page's own way of saying why speech is unavailable.
 */
export async function fromTheGuide(myKey: string, showWhy: (params?: Record<string, unknown>) => void): Promise<void> {
    const element = document.querySelector("graphty-element");
    const talk = document.querySelector<HTMLButtonElement>("#talk");
    if (element === null || talk === null) {
        return;
    }

    await element.enableAiControl({ provider: "google", apiKey: myKey, voice: { output: "browser" } });

    talk.onpointerdown = (e) => {
        talk.setPointerCapture(e.pointerId);
        element.aiTalk(true);
    };
    talk.onpointerup = talk.onpointercancel = () => element.aiTalk(false);
    talk.onkeydown = (e) => {
        if (e.key === " " && !e.repeat) {
            element.aiTalk(true);
        }
    };
    talk.onkeyup = (e) => {
        if (e.key === " ") {
            element.aiTalk(false);
        }
    };

    const support = await element.getAiVoiceSupport();
    talk.hidden = support.input.status === "unavailable";

    await element.enableAiControl({
        provider: "openai",
        apiKey: myKey,
        voice: {
            output: "provider",
            language: "fr-FR",
            replies: { approve: ["oui"], deny: ["non"] },
            say: ({ code }) => (code === "AI_CONFIRMATION_NEEDED" ? "Je dois demander avant." : undefined),
        },
    });

    element.addEventListener("ai-voice-level", (e) => {
        talk.style.setProperty("--level", String(e.detail.level));
    });
    element.addEventListener("ai-voice-end", (e) => {
        if (e.detail.code === "AI_VOICE_UNAVAILABLE") {
            showWhy(e.detail.params);
        } // { path, reason }
    });

    element.xr = {
        enabled: true,
        ai: {
            pushToTalk: { buttons: ["b", "y"], wristOrb: true },
            pendingButtons: { approve: ["a"], deny: ["x"] },
            labels: {
                XR_APPROVE: "Approve",
                XR_DENY: "Deny",
                XR_TRANSCRIPT: "You said",
                AI_CONFIRMATION_NEEDED: "Allow this change?",
                AI_QUESTION_ASKED: "The assistant asks",
                AI_COMPLETED: "Done",
            },
        },
    };
}
