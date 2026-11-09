/**
 * One press of talk: speech to text by the browser's recognizer (`VoiceInputAdapter`) or by
 * recording the microphone and handing the clip to the provider's `transcribe`. The microphone
 * is open only while the press lasts: every track stops on release, cancel and dispose. While it
 * is open, its level (0 to 1) is reported once per animation frame.
 * @module ai/voice/SpeechInput
 */

import type { AiResultCode, AiResultParams, AiVoiceUnavailableReason } from "../../catalog/ai";
import { GraphtyLogger, type Logger } from "../../logging";
import type { AiEngine } from "../engine/types";
import { VoiceInputAdapter } from "../input/VoiceInputAdapter";
import { rememberRecognition } from "./support";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "ai", "voice"]);

/** How a press ended, and what it heard (`""` when nothing). */
export interface SpeechInputEnd {
    readonly code: AiResultCode;
    readonly params: AiResultParams;
    readonly text: string;
}

/** What a press reports while it runs. Each press ends exactly once. */
export interface SpeechInputHandlers {
    /** What has been heard so far (`isFinal` false), then once all of it (`isFinal` true). */
    onTranscript(text: string, isFinal: boolean): void;
    /** The microphone's level, 0 (silence) to 1, once per animation frame. */
    onLevel(level: number): void;
    /** The press ended. */
    onEnd(end: SpeechInputEnd): void;
}

/** How a press is carried. */
export interface SpeechInputOptions {
    /** The language spoken, a BCP 47 tag. */
    readonly language: string;
    /** Browser recognition: ask Chrome to recognize on the device (`processLocally`). */
    readonly processLocally?: boolean;
    /** Provider transcription: the engine that transcribes (with `transcribe`). */
    readonly engine?: Pick<AiEngine, "transcribe">;
    /** Provider transcription: the model; absent, the provider's default. */
    readonly model?: string;
    /**
     * Provider transcription: the level (0 to 1, as `onLevel` reports it) a press must reach to be
     * sent; a quieter press was heard as nothing. Absent, every press is sent.
     */
    readonly speechLevel?: number;
    /**
     * Browser recognition on the device: words the speaker is likely to say, which it favors where
     * it can (Chrome's contextual biasing).
     */
    readonly phrases?: readonly string[];
    /** How long a pause, in milliseconds, ends a press after `endOnSilence`. Default 1500. */
    readonly silenceMs?: number;
}

/** A running press. */
export interface SpeechInput {
    /** Talk released: close the microphone and finish what was heard. */
    stop(): void;
    /**
     * From now on, end the press as `stop` does once the speaker has spoken and then paused: the
     * recognizer's end of speech on the browser route, and on both routes the microphone's level
     * staying under speech level for `silenceMs`.
     */
    endOnSilence(): void;
    /** Throw the press away: close the microphone, end with `AI_CANCELLED`. */
    cancel(): void;
    /** Close the microphone and end without reporting anything more. */
    dispose(): void;
}

/**
 * Recognizer errors that mean recognition never works in this browser (Quest's constructor), so
 * they are remembered for the origin. `network` (offline for a moment) fails only this press, and
 * `language-not-supported` is remembered for that language only.
 */
const RECOGNITION_BROKEN = new Set(["start-failed", "service-not-allowed"]);

/**
 * A press that cannot be carried.
 * @param reason - Why.
 * @returns The end.
 */
function unavailable(reason: AiVoiceUnavailableReason): SpeechInputEnd {
    return { code: "AI_VOICE_UNAVAILABLE", params: { path: "input", reason }, text: "" };
}

/**
 * Why the microphone did not open.
 * @param error - What `getUserMedia` rejected with.
 * @returns The reason.
 */
function microphoneFailure(error: unknown): AiVoiceUnavailableReason {
    const name = error instanceof Error ? error.name : "";
    return name === "NotAllowedError" || name === "SecurityError" ? "permission-denied" : "no-microphone";
}

/** A microphone's meter: its loudest level so far, and how to stop it. */
interface Meter {
    /** The loudest level measured so far (0 to 1); undefined when the page cannot measure. */
    peak(): number | undefined;
    /** Stop measuring and close the audio graph (after a last measurement). */
    stop(): void;
}

/** How often the loudest level is sampled, in milliseconds: animation frames pause in XR. */
const PEAK_SAMPLE_MS = 50;

/** The pause that ends a press asked to end on silence, by default, in milliseconds. */
const DEFAULT_SILENCE_MS = 1500;

/** The level under which the microphone is silent, when `speechLevel` does not say (or is 0). */
const SILENCE_LEVEL = 0.04;

/**
 * Report a stream's level once per animation frame, and keep its loudest level, sampled on a timer
 * too, since window animation frames pause in an immersive session.
 * ponytail: XR gets no level events (they ride animation frames); drive them from the XR frame loop
 * if an in-scene meter needs one.
 * @param stream - The microphone.
 * @param onLevel - Called with 0 to 1, once per animation frame.
 * @param onSample - Called with 0 to 1 every `PEAK_SAMPLE_MS`, frames or not.
 * @returns The meter.
 */
function meter(stream: MediaStream, onLevel: (level: number) => void, onSample: (level: number) => void): Meter {
    if (typeof AudioContext === "undefined") {
        return { peak: () => undefined, stop: () => undefined };
    }

    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(stream).connect(analyser);
    context.resume().catch(() => undefined);
    const samples = new Float32Array(analyser.fftSize);
    let loudest = 0;
    const measure = (): number => {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
            sum += sample * sample;
        }

        // RMS, doubled so ordinary speech reaches the upper half; clipped at 1.
        const level = Math.min(1, Math.sqrt(sum / samples.length) * 2);
        loudest = Math.max(loudest, level);
        return level;
    };
    const frames = typeof requestAnimationFrame === "function";
    let frame = 0;
    const tick = (): void => {
        onLevel(measure());
        frame = requestAnimationFrame(tick);
    };
    if (frames) {
        frame = requestAnimationFrame(tick);
    }

    const timer = setInterval(() => {
        onSample(measure());
    }, PEAK_SAMPLE_MS);
    let stopped = false;
    return {
        peak: () => loudest,
        stop: () => {
            if (stopped) {
                return;
            }

            stopped = true;
            measure();
            clearInterval(timer);
            if (frames) {
                cancelAnimationFrame(frame);
            }

            context.close().catch(() => undefined);
        },
    };
}

/**
 * Start one press of talk.
 * @param route - `"browser"` recognition or `"provider"` transcription.
 * @param options - Language, and the engine for the provider route.
 * @param handlers - What the press reports.
 * @returns The running press.
 */
export function startSpeechInput(
    route: "browser" | "provider",
    options: SpeechInputOptions,
    handlers: SpeechInputHandlers,
): SpeechInput {
    let stream: MediaStream | undefined;
    let level: Meter | undefined;
    let ended = false;
    let released = false;
    /** Asked to end on silence; the speaker has spoken; how long the microphone has been quiet. */
    let silenceEnds = false;
    let spoke = false;
    let quietMs = 0;
    const silenceLevel = options.speechLevel || SILENCE_LEVEL;
    const silenceMs = options.silenceMs ?? DEFAULT_SILENCE_MS;

    const closeMicrophone = (): void => {
        level?.stop();
        for (const track of stream?.getTracks() ?? []) {
            track.stop();
        }
    };
    const end = (result: SpeechInputEnd): void => {
        if (ended) {
            return;
        }

        ended = true;
        closeMicrophone();
        if (result.code === "AI_COMPLETED") {
            handlers.onTranscript(result.text, true);
        }

        handlers.onEnd(result);
    };

    const silent = (): void => {
        if (silenceEnds) {
            logger.debug("Press ends on silence", { route });
            input.stop();
        }
    };
    const sampled = (now: number): void => {
        if (now >= silenceLevel) {
            spoke = true;
            quietMs = 0;
        } else if (spoke) {
            quietMs += PEAK_SAMPLE_MS;
            if (quietMs >= silenceMs) {
                silent();
            }
        }
    };
    const carrier =
        route === "browser"
            ? recognize(options, handlers, end, silent)
            : record(options, end, () => {
                  const peak = level?.peak();
                  return peak === undefined || options.speechLevel === undefined || peak >= options.speechLevel;
              });
    // End first, so a route's own end on being stopped is not reported as the outcome.
    const fail = (result: SpeechInputEnd): void => {
        end(result);
        carrier.cancel();
    };

    const mediaDevices = (globalThis.navigator as Navigator | undefined)?.mediaDevices;
    if (carrier.failed !== undefined) {
        const { failed } = carrier;
        queueMicrotask(() => {
            fail(failed);
        });
    } else if (mediaDevices === undefined) {
        queueMicrotask(() => {
            fail(unavailable(globalThis.isSecureContext ? "no-microphone" : "insecure-context"));
        });
    } else {
        mediaDevices.getUserMedia({ audio: true }).then(
            (opened) => {
                stream = opened;
                if (ended) {
                    closeMicrophone();
                } else if (released) {
                    // Released before the microphone opened: nothing was heard.
                    closeMicrophone();
                    carrier.finish();
                } else {
                    level = meter(
                        opened,
                        (now) => {
                            handlers.onLevel(now);
                        },
                        sampled,
                    );
                    // Only now, on the browser route, does the recognizer start: it opens the
                    // microphone itself, and started first it raced this request (two permission
                    // prompts on the first press) and, once allowed, opened the device before the
                    // level's stream did, which in desktop Chrome left it hearing nothing.
                    carrier.open(opened);
                }
            },
            (error: unknown) => {
                fail(unavailable(microphoneFailure(error)));
            },
        );
    }

    const input: SpeechInput = {
        stop() {
            if (ended || released) {
                return;
            }

            released = true;
            // Before the microphone opened, the open finishes the press when it lands.
            if (stream !== undefined) {
                carrier.finish();
                closeMicrophone();
            }
        },
        endOnSilence() {
            silenceEnds = true;
        },
        cancel() {
            fail({ code: "AI_CANCELLED", params: {}, text: "" });
        },
        dispose() {
            ended = true;
            closeMicrophone();
            carrier.cancel();
        },
    };
    return input;
}

/** One route of a press: what it does when the microphone opens, on release and on cancel. */
interface Carrier {
    /** Set when the route could not start at all. */
    readonly failed?: SpeechInputEnd;
    open(stream: MediaStream): void;
    finish(): void;
    cancel(): void;
}

/**
 * What a recognizer error means for the press: undefined when it means only that nothing was
 * heard (`no-speech`), else the end it reports. An error that says recognition never works is
 * remembered, so the next press takes the provider.
 * @param error - The recognizer's error name, or `"start-failed"`.
 * @param language - The language heard.
 * @returns The end, or undefined.
 */
function recognitionFailure(error: string, language: string): SpeechInputEnd | undefined {
    if (RECOGNITION_BROKEN.has(error)) {
        rememberRecognition("fails");
        return unavailable("no-recognition");
    }

    switch (error) {
        case "no-speech":
            return undefined;
        case "language-not-supported":
            rememberRecognition("fails", language);
            return unavailable("no-recognition");
        case "network":
            return unavailable("recognition-network");
        case "not-allowed":
            return unavailable("permission-denied");
        case "audio-capture":
            return unavailable("no-microphone");
        default:
            // `aborted`, `phrases-not-supported` and any error a browser adds: said, never a
            // silent "heard nothing".
            return {
                code: "AI_VOICE_UNAVAILABLE",
                params: { path: "input", reason: "recognition-failed", error },
                text: "",
            };
    }
}

/**
 * Browser recognition, started once the press's own stream (which feeds the level) has opened.
 * The recognizer opens the microphone itself. Its first result proves recognition works on this
 * origin.
 * @param options - Language, `processLocally` and phrases.
 * @param handlers - Interim transcripts go here.
 * @param end - Ends the press.
 * @param silent - The recognizer heard speech stop.
 * @returns The route.
 */
function recognize(
    options: SpeechInputOptions,
    handlers: SpeechInputHandlers,
    end: (result: SpeechInputEnd) => void,
    silent: () => void,
): Carrier {
    const adapter = new VoiceInputAdapter();
    const finals: string[] = [];
    let interim = "";
    let failure: SpeechInputEnd | undefined;
    let started = false;
    const heard = (): string => [...finals, interim].filter(Boolean).join(" ");
    adapter.onInput((text, isFinal) => {
        rememberRecognition("works", options.language);
        if (isFinal) {
            finals.push(text.trim());
            interim = "";
        } else {
            interim = text.trim();
        }

        handlers.onTranscript(heard(), false);
    });
    adapter.onError((error) => {
        failure ??= recognitionFailure(error, options.language);
    });
    adapter.onSpeechEnd(silent);
    adapter.onActiveChange((active) => {
        if (!active) {
            adapter.dispose();
            end(failure ?? { code: "AI_COMPLETED", params: {}, text: heard() });
        }
    });
    return {
        failed: adapter.isSupported ? undefined : unavailable("no-recognition"),
        open: () => {
            started = true;
            logger.debug("Browser recognition", { processLocally: options.processLocally === true });
            adapter.start({
                continuous: true,
                interimResults: true,
                language: options.language,
                processLocally: options.processLocally,
                phrases: options.phrases,
            });
            // A start that threw never reaches onActiveChange.
            if (failure !== undefined) {
                adapter.dispose();
                end(failure);
            }
        },
        finish: () => {
            if (started) {
                adapter.end();
            } else {
                end({ code: "AI_COMPLETED", params: {}, text: "" });
            }
        },
        cancel: () => {
            adapter.dispose();
        },
    };
}

/**
 * Provider transcription: record the microphone while talk is held, then hand the clip to the
 * engine's `transcribe`. A press that never reached speech level is heard as nothing and not
 * sent: a chat model asked to transcribe silence may write words that were never said.
 * @param options - Language, engine and model.
 * @param end - Ends the press.
 * @param spoke - Whether the press reached speech level.
 * @returns The route.
 */
function record(options: SpeechInputOptions, end: (result: SpeechInputEnd) => void, spoke: () => boolean): Carrier {
    const transcribe = options.engine?.transcribe?.bind(options.engine);
    if (transcribe === undefined) {
        return {
            failed: unavailable("no-provider-transcription"),
            open: () => undefined,
            finish: () => undefined,
            cancel: () => undefined,
        };
    }

    const abort = new AbortController();
    const chunks: Blob[] = [];
    let recorder: MediaRecorder | undefined;
    const send = async (): Promise<void> => {
        const audio = new Blob(chunks, { type: recorder?.mimeType });
        if (audio.size === 0 || !spoke()) {
            end({ code: "AI_COMPLETED", params: {}, text: "" });
            return;
        }

        try {
            const result = await transcribe(audio, { language: options.language, model: options.model }, abort.signal);
            end(result.code === "AI_COMPLETED" ? { ...result, text: result.text.trim() } : { ...result, text: "" });
        } catch {
            // An engine that threw instead of coding its failure still ends the press.
            end({ code: "AI_PROVIDER_ERROR", params: {}, text: "" });
        }
    };
    return {
        open(stream) {
            recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (event) => chunks.push(event.data);
            recorder.start();
        },
        finish() {
            if (recorder?.state === "recording") {
                recorder.onstop = () => void send();
                recorder.stop();
            } else {
                end({ code: "AI_COMPLETED", params: {}, text: "" });
            }
        },
        cancel() {
            abort.abort();
            if (recorder !== undefined) {
                recorder.onstop = null;
                if (recorder.state === "recording") {
                    recorder.stop();
                }
            }
        },
    };
}
