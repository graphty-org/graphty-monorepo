/**
 * Which way speech goes, by the `"auto"` rules of the harness design (section 5.5): a pure
 * function of what the page and the provider can do, so every row of the rules is one table test.
 * @module ai/voice/choose
 */

import type { AiProviderId, AiVoiceUnavailableReason } from "../../catalog/ai";
import type { AiVoiceMode, AiVoiceOptions, AiVoicePath, AiVoiceSupport } from "../AiManager";

/** Whether the provider can carry one direction of speech: able, unable, or able but keyless. */
export type ProviderVoiceReadiness = "ready" | "unsupported" | "no-key";

/** What the page offers for speech, as `readVoiceEnvironment` finds it. */
export interface VoiceEnvironment {
    /** `isSecureContext`: the microphone is closed to an insecure page. */
    readonly secureContext: boolean;
    /** `navigator.mediaDevices.getUserMedia` exists. */
    readonly microphone: boolean;
    /** The microphone permission, `"unknown"` where the browser does not say. */
    readonly permission: "granted" | "denied" | "prompt" | "unknown";
    /**
     * Browser recognition: no constructor, a constructor not tried yet on this origin, or one
     * whose first start worked or failed (remembered per origin; Quest has a constructor that fails).
     */
    readonly recognition: "none" | "untried" | "works" | "fails";
    /**
     * Where browser recognition runs: on the device always (Safari, visionOS), on the device when
     * asked (Chrome's `processLocally`, available for the language), or at the vendor.
     */
    readonly onDevice: "always" | "process-locally" | "none";
    /** `speechSynthesis` exists. */
    readonly synthesis: boolean;
    /** The default synthesis voice is the device's own (`localService`). */
    readonly synthesisLocal: boolean;
}

/** Everything the rules read. */
export interface VoiceFacts extends VoiceEnvironment {
    /** Provider transcription (the chat provider's, or `AiVoiceOptions.transcription`'s). */
    readonly transcription: ProviderVoiceReadiness;
    /** Provider speech. */
    readonly speech: ProviderVoiceReadiness;
    /** An immersive (XR) session is running. */
    readonly immersive: boolean;
}

/** A direction switched off: no path, and no code, since nothing failed. */
const OFF: AiVoicePath = Object.freeze({ path: "none", status: "unavailable", destination: "none" });

/**
 * A direction that cannot be used.
 * @param path - Which direction.
 * @param reason - Why.
 * @returns The path, with `AI_VOICE_UNAVAILABLE`.
 */
function unavailable(path: "input" | "output", reason: AiVoiceUnavailableReason): AiVoicePath {
    return {
        path: "none",
        status: "unavailable",
        code: "AI_VOICE_UNAVAILABLE",
        params: { path, reason },
        destination: "none",
    };
}

/**
 * Speech to text. `"auto"` (and `"on"`): browser recognition unless a start failed on this origin
 * (or in this language), on the device where it can be; else provider transcription; else
 * `AI_VOICE_UNAVAILABLE`. `"browser"` tries browser recognition even where a start failed, so a
 * host can offer the reader a retry, and a start that works clears the memory.
 * @param mode - `AiVoiceOptions.input`.
 * @param facts - What the page and provider can do.
 * @returns The path a press of talk takes.
 */
export function chooseInput(mode: AiVoiceMode, facts: VoiceFacts): AiVoicePath {
    if (mode === "off") {
        return OFF;
    }

    // Every input path needs the microphone.
    if (!facts.secureContext) {
        return unavailable("input", "insecure-context");
    }

    if (!facts.microphone) {
        return unavailable("input", "no-microphone");
    }

    if (facts.permission === "denied") {
        return unavailable("input", "permission-denied");
    }

    const status = facts.permission === "granted" ? "ready" : "needs-permission";
    const recognizes =
        facts.recognition === "untried" ||
        facts.recognition === "works" ||
        (mode === "browser" && facts.recognition === "fails");
    if (mode !== "provider" && recognizes) {
        return { path: "browser", status, destination: facts.onDevice === "none" ? "browser-vendor" : "on-device" };
    }

    if (mode === "browser") {
        return unavailable("input", "no-recognition");
    }

    if (facts.transcription === "ready") {
        return { path: "provider", status, destination: "provider" };
    }

    return unavailable("input", facts.transcription === "no-key" ? "no-key" : "no-provider-transcription");
}

/**
 * Text to speech. `"auto"`: off on a flat page; in an immersive session the browser's
 * synthesis, else the provider's speech. `"on"`: the same paths, on a flat page too.
 * @param mode - `AiVoiceOptions.output`.
 * @param facts - What the page and provider can do.
 * @returns The path an answer is spoken by.
 */
export function chooseOutput(mode: AiVoiceMode, facts: VoiceFacts): AiVoicePath {
    if (mode === "off" || (mode === "auto" && !facts.immersive)) {
        return OFF;
    }

    if (mode !== "provider" && facts.synthesis) {
        return { path: "browser", status: "ready", destination: facts.synthesisLocal ? "on-device" : "browser-vendor" };
    }

    if (mode === "browser") {
        return unavailable("output", "no-synthesis");
    }

    if (facts.speech === "ready") {
        return { path: "provider", status: "ready", destination: "provider" };
    }

    return unavailable("output", facts.speech === "no-key" ? "no-key" : "no-provider-speech");
}

/**
 * Both directions, as `getAiVoiceSupport()` reports them.
 * @param options - The assistant's `voice`.
 * @param facts - What the page and provider can do.
 * @returns Input and output paths.
 */
export function chooseVoice(options: AiVoiceOptions, facts: VoiceFacts): AiVoiceSupport {
    return {
        input: chooseInput(options.input ?? "auto", facts),
        output: chooseOutput(options.output ?? "auto", facts),
    };
}

/** What a live conversation reads: the provider, its live API, and what the page offers it. */
export interface LiveFacts extends Pick<VoiceEnvironment, "secureContext" | "microphone" | "permission"> {
    /** The chat provider. */
    readonly provider: AiProviderId;
    /** Its live API (`AI_VOICE_CAPABILITIES[provider].live`), and whether its key is set. */
    readonly live: ProviderVoiceReadiness;
    /** A `baseUrl` is configured: live reaches only the provider's own host. */
    readonly customBaseUrl: boolean;
    /** `RTCPeerConnection` exists (OpenAI's live API is WebRTC). */
    readonly rtcPeerConnection: boolean;
    /** `WebSocket` exists (Google's live API). */
    readonly webSocket: boolean;
    /** `AudioWorklet` exists (Google's live audio is captured and played through worklets). */
    readonly audioWorklet: boolean;
}

/**
 * Whether the page has what a provider's live API needs.
 * @param facts - What the page offers.
 * @returns True when it has.
 */
function hasLiveTransport(facts: LiveFacts): boolean {
    return facts.provider === "openai" ? facts.rtcPeerConnection : facts.webSocket && facts.audioWorklet;
}

/**
 * A live conversation, whatever `mode` asks for, so a host can offer it: the provider's live API,
 * then its key, then the provider's own host, then the transport, then the microphone, then
 * `output` (a live answer is always spoken, so `"off"` keeps every press turn by turn). Every
 * reason is reported with `path: "input"`.
 * @param output - `AiVoiceOptions.output`.
 * @param facts - What the page and provider can do.
 * @returns The live path.
 */
export function chooseLive(output: AiVoiceMode, facts: LiveFacts): AiVoicePath {
    if (facts.live === "unsupported") {
        return unavailable("input", "no-provider-live");
    }

    if (facts.live === "no-key") {
        return unavailable("input", "no-key");
    }

    if (facts.customBaseUrl) {
        return unavailable("input", "live-custom-base-url");
    }

    if (!hasLiveTransport(facts)) {
        return unavailable("input", "no-live-transport");
    }

    if (!facts.secureContext) {
        return unavailable("input", "insecure-context");
    }

    if (!facts.microphone) {
        return unavailable("input", "no-microphone");
    }

    if (facts.permission === "denied") {
        return unavailable("input", "permission-denied");
    }

    if (output === "off") {
        return unavailable("input", "output-off");
    }

    return {
        path: "provider",
        status: facts.permission === "granted" ? "ready" : "needs-permission",
        destination: "provider",
    };
}
