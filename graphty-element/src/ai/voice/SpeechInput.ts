/**
 * One press of talk: speech to text by the browser's recognizer (`VoiceInputAdapter`) or by
 * recording the microphone and handing the clip to the provider's `transcribe`. The microphone
 * is open only while the press lasts: every track stops on release, cancel and dispose. While it
 * is open, its level (0 to 1) is reported once per animation frame.
 * @module ai/voice/SpeechInput
 */

import type { AiResultCode, AiResultParams, AiVoiceUnavailableReason } from "../../catalog/ai";
import type { AiEngine } from "../engine/types";
import { VoiceInputAdapter } from "../input/VoiceInputAdapter";
import { rememberRecognition } from "./support";

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
}

/** A running press. */
export interface SpeechInput {
    /** Talk released: close the microphone and finish what was heard. */
    stop(): void;
    /** Throw the press away: close the microphone, end with `AI_CANCELLED`. */
    cancel(): void;
    /** Close the microphone and end without reporting anything more. */
    dispose(): void;
}

/** Recognizer errors that mean recognition does not work on this origin (Quest's constructor). */
const RECOGNITION_BROKEN = new Set(["start-failed", "service-not-allowed", "network", "language-not-supported"]);

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

/**
 * Report a stream's level once per animation frame.
 * ponytail: window animation frames pause in an immersive session, so XR gets no level; drive it
 * from the XR frame loop if an in-scene meter needs one.
 * @param stream - The microphone.
 * @param onLevel - Called with 0 to 1.
 * @returns Stops reporting and closes the audio graph.
 */
function meter(stream: MediaStream, onLevel: (level: number) => void): () => void {
    if (typeof AudioContext === "undefined" || typeof requestAnimationFrame === "undefined") {
        return () => undefined;
    }

    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(stream).connect(analyser);
    context.resume().catch(() => undefined);
    const samples = new Float32Array(analyser.fftSize);
    let frame = 0;
    const tick = (): void => {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
            sum += sample * sample;
        }

        // RMS, doubled so ordinary speech reaches the upper half; clipped at 1.
        onLevel(Math.min(1, Math.sqrt(sum / samples.length) * 2));
        frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
        cancelAnimationFrame(frame);
        context.close().catch(() => undefined);
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
    let stopMeter = (): void => undefined;
    let ended = false;
    let released = false;

    const closeMicrophone = (): void => {
        stopMeter();
        stopMeter = () => undefined;
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

    const carrier = route === "browser" ? recognize(options, handlers, end) : record(options, end);
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
                    stopMeter = meter(opened, (level) => {
                        handlers.onLevel(level);
                    });
                    carrier.open(opened);
                }
            },
            (error: unknown) => {
                fail(unavailable(microphoneFailure(error)));
            },
        );
    }

    return {
        stop() {
            if (ended || released) {
                return;
            }

            released = true;
            // Before the microphone opened, the open finishes the press when it lands.
            if (stream !== undefined || route === "browser") {
                carrier.finish();
                closeMicrophone();
            }
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
 * Browser recognition. The recognizer opens the microphone itself; the press's own stream only
 * feeds the level. Its first result proves recognition works on this origin, and an error that
 * says it never will is remembered, so the next press takes the provider.
 * @param options - Language and `processLocally`.
 * @param handlers - Interim transcripts go here.
 * @param end - Ends the press.
 * @returns The route.
 */
function recognize(
    options: SpeechInputOptions,
    handlers: SpeechInputHandlers,
    end: (result: SpeechInputEnd) => void,
): Carrier {
    const adapter = new VoiceInputAdapter();
    const finals: string[] = [];
    let interim = "";
    let failure: SpeechInputEnd | undefined;
    const heard = (): string => [...finals, interim].filter(Boolean).join(" ");
    adapter.onInput((text, isFinal) => {
        rememberRecognition("works");
        if (isFinal) {
            finals.push(text.trim());
            interim = "";
        } else {
            interim = text.trim();
        }

        handlers.onTranscript(heard(), false);
    });
    adapter.onError((error) => {
        if (RECOGNITION_BROKEN.has(error)) {
            rememberRecognition("fails");
            failure = unavailable("no-recognition");
        } else if (error === "not-allowed") {
            failure = unavailable("permission-denied");
        } else if (error === "audio-capture") {
            failure = unavailable("no-microphone");
        }
    });
    adapter.onActiveChange((active) => {
        if (!active) {
            adapter.dispose();
            end(failure ?? { code: "AI_COMPLETED", params: {}, text: heard() });
        }
    });
    adapter.start({
        continuous: true,
        interimResults: true,
        language: options.language,
        processLocally: options.processLocally,
    });
    return {
        // A start that threw never reaches onActiveChange.
        failed: adapter.isSupported ? failure : unavailable("no-recognition"),
        open: () => undefined,
        finish: () => {
            adapter.end();
        },
        cancel: () => {
            adapter.dispose();
        },
    };
}

/**
 * Provider transcription: record the microphone while talk is held, then hand the clip to the
 * engine's `transcribe`.
 * @param options - Language, engine and model.
 * @param end - Ends the press.
 * @returns The route.
 */
function record(options: SpeechInputOptions, end: (result: SpeechInputEnd) => void): Carrier {
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
        if (audio.size === 0) {
            end({ code: "AI_COMPLETED", params: {}, text: "" });
            return;
        }

        const result = await transcribe(audio, { language: options.language, model: options.model }, abort.signal);
        end(result.code === "AI_COMPLETED" ? { ...result, text: result.text.trim() } : { ...result, text: "" });
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
