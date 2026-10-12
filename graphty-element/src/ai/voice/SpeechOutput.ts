/**
 * Speaking an answer: the browser's `speechSynthesis`, or the provider's `speak` played from an
 * object URL that is revoked once playback ends.
 * @module ai/voice/SpeechOutput
 */

import type { AiResultCode, AiResultParams, AiVoiceUnavailableReason } from "../../catalog/ai";
import type { AiEngine } from "../engine/types";

/** How speaking ended: `AI_COMPLETED`, `AI_CANCELLED`, `AI_VOICE_UNAVAILABLE` or the provider's code. */
export interface SpeechOutputEnd {
    readonly code: AiResultCode;
    readonly params: AiResultParams;
}

/** How answers are spoken. */
export interface SpeechOutputOptions {
    /** The language, a BCP 47 tag (browser speech). */
    readonly language: string;
    /** Provider speech: the engine that speaks (with `speak`). */
    readonly engine?: Pick<AiEngine, "speak">;
    /** Provider speech: the provider's name for the voice. */
    readonly voiceName?: string;
    /** Provider speech: the model; absent, the provider's default. */
    readonly model?: string;
}

/** Speaks one text at a time. */
export interface SpeechOutput {
    /**
     * Speak a text, cutting off anything still being spoken.
     * @param text - What to say.
     * @param onStart - Called when sound starts.
     * @returns How it ended; never rejects.
     */
    speak(text: string, onStart?: () => void): Promise<SpeechOutputEnd>;
    /** Stop speaking: the running `speak` ends with `AI_CANCELLED`. */
    cancel(): void;
}

const COMPLETED: SpeechOutputEnd = Object.freeze({ code: "AI_COMPLETED", params: {} });
const CANCELLED: SpeechOutputEnd = Object.freeze({ code: "AI_CANCELLED", params: {} });

/**
 * Speech that cannot be produced.
 * @param reason - Why.
 * @returns The end.
 */
function unavailable(reason: AiVoiceUnavailableReason): SpeechOutputEnd {
    return { code: "AI_VOICE_UNAVAILABLE", params: { path: "output", reason } };
}

/**
 * A speaker over one route.
 * @param route - `"browser"` synthesis or `"provider"` speech.
 * @param options - Language, and the engine for the provider route.
 * @returns The speaker.
 */
export function createSpeechOutput(route: "browser" | "provider", options: SpeechOutputOptions): SpeechOutput {
    // The running speak: settles it once, and undoes what it started.
    let settle: ((end: SpeechOutputEnd) => void) | undefined;
    const run = (start: (done: (end: SpeechOutputEnd) => void) => () => void): Promise<SpeechOutputEnd> =>
        new Promise((resolve) => {
            let undo = (): void => undefined;
            const done = (end: SpeechOutputEnd): void => {
                if (settle !== done) {
                    return;
                }

                settle = undefined;
                undo();
                resolve(end);
            };
            settle = done;
            undo = start(done);
        });

    const cancel = (): void => settle?.(CANCELLED);

    if (route === "browser") {
        return {
            speak(text, onStart) {
                cancel();
                return run((done) => {
                    const synth = (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
                    if (synth === undefined) {
                        queueMicrotask(() => {
                            done(unavailable("no-synthesis"));
                        });
                        return () => undefined;
                    }

                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = options.language;
                    utterance.onstart = () => onStart?.();
                    utterance.onend = () => {
                        done(COMPLETED);
                    };
                    utterance.onerror = (event) => {
                        done(
                            event.error === "interrupted" || event.error === "canceled"
                                ? CANCELLED
                                : unavailable("playback-failed"),
                        );
                    };
                    synth.speak(utterance);
                    return () => {
                        utterance.onend = null;
                        utterance.onerror = null;
                        synth.cancel();
                    };
                });
            },
            cancel,
        };
    }

    return {
        speak(text, onStart) {
            cancel();
            return run((done) => {
                const abort = new AbortController();
                let audio: HTMLAudioElement | undefined;
                let url: string | undefined;
                const speak = options.engine?.speak;
                if (speak === undefined) {
                    queueMicrotask(() => {
                        done(unavailable("no-provider-speech"));
                    });
                    return () => undefined;
                }

                void speak
                    .call(options.engine, text, { voiceName: options.voiceName, model: options.model }, abort.signal)
                    .then((spoken) => {
                        if (spoken.code !== "AI_COMPLETED") {
                            done({ code: spoken.code, params: spoken.params });
                            return;
                        }

                        if (abort.signal.aborted) {
                            return;
                        }

                        url = URL.createObjectURL(spoken.audio);
                        audio = new Audio(url);
                        audio.onended = () => {
                            done(COMPLETED);
                        };
                        audio.onerror = () => {
                            done(unavailable("playback-failed"));
                        };
                        audio.play().then(
                            () => onStart?.(),
                            () => {
                                done(unavailable("playback-failed"));
                            },
                        );
                    });
                return () => {
                    abort.abort();
                    if (audio !== undefined) {
                        audio.onended = null;
                        audio.onerror = null;
                        audio.pause();
                    }

                    if (url !== undefined) {
                        URL.revokeObjectURL(url);
                    }
                };
            });
        },
        cancel,
    };
}
