/**
 * Priming speech for an immersive session on the click that enters it. Loaded with `voice`, ahead
 * of the click, so the click can call it at once; kept apart from the XR bindings, which load the
 * renderer's classes and are needed only once a session runs.
 * @module ai/voice/prime
 */

import type { AiVoiceOptions } from "../AiManager";

/** The audio context resumed by the click, kept so the page's audio stays unlocked in XR. */
let primedAudio: AudioContext | undefined;

/**
 * Ask for the microphone, and unlock speech and audio, inside the click that enters XR: a headset
 * browser asks for permission (and lets audio start) only from a click, and none is possible once
 * the reader is inside. The microphone's tracks stop as soon as it opens.
 * @param options - The assistant's `voice`.
 */
export function primeVoice(options: AiVoiceOptions): void {
    if ((options.input ?? "auto") !== "off") {
        globalThis.navigator?.mediaDevices?.getUserMedia?.({ audio: true }).then(
            (stream) => {
                for (const track of stream.getTracks()) {
                    track.stop();
                }
            },
            // Refused or absent: the first press reports it.
            () => undefined,
        );
    }

    if ((options.output ?? "auto") !== "off") {
        if (typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined") {
            speechSynthesis.speak(new SpeechSynthesisUtterance(""));
        }

        if (typeof AudioContext !== "undefined") {
            // ponytail: one context for the page's life, never closed; it holds no device.
            primedAudio ??= new AudioContext();
            primedAudio.resume().catch(() => undefined);
        }
    }
}
