// The voice module's two engines over the framework's speech seams (plan section 1.3): the Web
// Speech API (scene/speech.ts; Chrome on Galaxy XR, cloud-backed) and the Quest system keyboard's
// microphone key (scene/system-keyboard.ts). Both report the same things in the shape of
// graphty-element's VoiceInputAdapter (graphty-element/src/ai/input/VoiceInputAdapter.ts, not
// exported): text heard so far, and every start and end with its reason.

import type { WebXRDefaultExperience } from "@babylonjs/core";

import { listen, type Listening, speechSupport } from "../../scene/speech";
import { systemKeyboard as keyboardBridge } from "../../scene/system-keyboard";

/** Which engine. */
export type EngineKind = "web-speech" | "system-keyboard";

/**
 * Why a listen ended: the talk button was released (user), the recognizer ended on its own after an
 * utterance (final), it failed (error, with its code), the keyboard was closed, or it was cancelled.
 */
export type EndReason = "user" | "final" | "error" | "keyboard-closed" | "cancelled";

/** What an engine reports. */
export interface EngineEvents {
    /** Text so far: settled words, words the engine may still change, and whether it is done. */
    text(final: string, interim: string, done: boolean): void;
    end(reason: EndReason, detail?: string): void;
}

/** One speech engine. */
export interface SpeechEngine {
    kind: EngineKind;
    /** Whether releasing the talk button ends the listen (not the keyboard: its own button closes it). */
    pushToTalk: boolean;
    readonly active: boolean;
    start(): void;
    stop(reason: EndReason): void;
}

/**
 * Choose an engine for a setting, or say why there is none.
 * @param setting - auto, web-speech, system-keyboard or off
 * @param xr - the XR experience, for the system keyboard's support in this session
 * @returns the engine kind, or the reason there is none
 */
export function pickEngine(setting: string, xr: WebXRDefaultExperience | null): EngineKind | { why: string } {
    const web = speechSupport();
    const keyboard = xr ? keyboardBridge(xr).status() : { supported: false, reason: "no XR here" };
    if (setting === "off") {
        return { why: "speech is off in settings" };
    }
    if (setting === "web-speech" || (setting === "auto" && web.supported)) {
        return web.supported ? "web-speech" : { why: web.reason };
    }
    if (setting === "system-keyboard" || setting === "auto") {
        return keyboard.supported ? "system-keyboard" : { why: `no Web Speech API, and ${keyboard.reason}` };
    }
    return { why: `unknown engine "${setting}"` };
}

/**
 * The Web Speech engine: one utterance per press; words are interim until the recognizer ends.
 * @param on - where its events go
 * @returns the engine
 */
export function webSpeech(on: EngineEvents): SpeechEngine {
    let current: Listening | null = null;
    let asked: EndReason | null = null;
    return {
        kind: "web-speech",
        pushToTalk: true,
        get active() {
            return current !== null;
        },
        start() {
            if (current) {
                return;
            }
            asked = null;
            const l = listen((text) => {
                on.text("", text, false);
            });
            if (!l) {
                on.end("error", "no Web Speech API");
                return;
            }
            current = l;
            void l.done.then(({ text, reason }) => {
                if (current !== l) {
                    return;
                }
                current = null;
                on.text(text, "", true);
                if (reason === "final") {
                    on.end("final");
                } else if (reason === "stopped") {
                    on.end(asked ?? "user");
                } else {
                    on.end("error", reason);
                }
            });
        },
        stop(reason) {
            if (current) {
                asked = reason;
                current.stop();
            }
        },
    };
}

/** The system keyboard engine, which can also be primed to open on a select at one place. */
export interface KeyboardEngine extends SpeechEngine {
    /**
     * Open on the next select that `when` accepts (the mic chip under the ray), without a press first:
     * a runtime may fire select at the start of a pinch (IWER does) or at its end (the spec).
     */
    prime(when: (source: XRInputSource) => boolean): void;
}

/**
 * The Quest system keyboard: armed on start, it opens on the next select (the release of the pinch
 * or trigger that pressed the mic chip, or the next trigger after X), and closing it ends the
 * listen. Its words are interim until it closes.
 * @param xr - the XR experience
 * @param on - where its events go
 * @param opened - called when the keyboard opens
 * @returns the engine
 */
export function systemKeyboard(xr: WebXRDefaultExperience, on: EngineEvents, opened: () => void): KeyboardEngine {
    const bridge = keyboardBridge(xr);
    let active = false;
    let asked: EndReason | null = null;
    const listener = {
        opened: () => {
            active = true;
            opened();
        },
        input: (v: string) => {
            on.text("", v.trim(), false);
        },
        close: (v: string) => {
            if (!active) {
                return;
            }
            active = false;
            on.text(v.trim(), "", true);
            on.end(asked ?? "keyboard-closed");
        },
    };
    return {
        kind: "system-keyboard",
        pushToTalk: false,
        get active() {
            return active;
        },
        start() {
            if (active) {
                return;
            }
            active = true;
            asked = null;
            bridge.arm(() => true, listener);
        },
        prime(when) {
            if (!active) {
                asked = null;
                bridge.arm(when, listener);
            }
        },
        stop(reason) {
            if (!active) {
                return;
            }
            asked = reason;
            // Armed but never opened: nothing will close it, so end here.
            bridge.disarm();
            bridge.close();
            if (active) {
                active = false;
                on.end(reason);
            }
        },
    };
}
