/**
 * @file Installable fakes for the page's speech APIs: `SpeechRecognition`, `getUserMedia` (with
 * counted tracks), `MediaRecorder`, `AudioContext`, animation frames, `speechSynthesis`, `Audio`,
 * the permission query and `localStorage`. Installed with `vi.stubGlobal`; undo with
 * `vi.unstubAllGlobals()` in `afterEach`.
 */

import { vi } from "vitest";

/** How the fake page behaves. */
export interface FakeSpeechOptions {
    /** Browser recognition: works (default), has a constructor whose start throws (Quest), or is absent. */
    recognition?: "works" | "start-throws" | "absent";
    /** The microphone: allowed (default), not asked yet, refused, or no `mediaDevices` at all. */
    microphone?: "granted" | "prompt" | "denied" | "absent";
    /** `localStorage`: an in-memory store (default), or one whose every call throws. */
    storage?: "memory" | "throws";
    /** `isSecureContext` (default true). */
    secure?: boolean;
    /** `navigator.userAgent` (default desktop Chrome's). */
    userAgent?: string;
    /** `navigator.language` (default `"fr-FR"`, so a default of `"en-US"` shows). */
    language?: string;
    /** `speechSynthesis` exists (default true). */
    synthesis?: boolean;
    /** What `SpeechRecognition.available` answers; absent, the constructor has no such check. */
    onDevice?: "available" | "downloadable" | "unavailable";
}

/** One microphone track: counts whether it was stopped. */
export class FakeTrack {
    stopped = false;
    stop(): void {
        this.stopped = true;
    }
}

/** A recognizer the test speaks into. */
export class FakeRecognition {
    continuous = false;
    interimResults = false;
    lang = "";
    processLocally?: boolean;
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    onstart: (() => void) | null = null;
    stopCalls = 0;

    constructor(
        private readonly throwsOnStart: boolean,
        all: FakeRecognition[],
    ) {
        all.push(this);
    }

    start(): void {
        if (this.throwsOnStart) {
            throw new DOMException("recognition is not available", "NotAllowedError");
        }

        queueMicrotask(() => this.onstart?.());
    }

    stop(): void {
        this.stopCalls++;
        queueMicrotask(() => this.onend?.());
    }

    abort(): void {
        this.stop();
    }

    /**
     * Deliver one result.
     * @param transcript - What was heard.
     * @param isFinal - Whether it is final.
     */
    hear(transcript: string, isFinal: boolean): void {
        const result = Object.assign([{ transcript, confidence: 1 }], { isFinal });
        this.onresult?.({ resultIndex: 0, results: [result] });
    }

    /**
     * Fail as the browser does: an error, then the end.
     * @param error - The recognizer's error name.
     */
    fail(error: string): void {
        this.onerror?.({ error });
        this.onend?.();
    }
}

/** A recorder that hands over one non-empty chunk when stopped. */
export class FakeRecorder {
    state: "inactive" | "recording" = "inactive";
    mimeType = "audio/webm";
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;

    constructor(readonly stream: unknown) {}

    start(): void {
        this.state = "recording";
    }

    stop(): void {
        this.state = "inactive";
        queueMicrotask(() => {
            this.ondataavailable?.({ data: new Blob(["fake clip"], { type: this.mimeType }) });
            this.onstop?.();
        });
    }
}

/** An utterance as `speechSynthesis` receives it. */
export class FakeUtterance {
    lang = "";
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    constructor(readonly text: string) {}
}

/** An audio element: plays at once; the test ends it. */
export class FakeAudio {
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    paused = true;
    static rejectPlay = false;
    constructor(readonly src: string) {}

    play(): Promise<void> {
        if (FakeAudio.rejectPlay) {
            return Promise.reject(new DOMException("blocked", "NotAllowedError"));
        }

        this.paused = false;
        return Promise.resolve();
    }

    pause(): void {
        this.paused = true;
    }
}

/** The installed fakes, for the test to drive and count. */
export interface FakeSpeech {
    /** Every microphone track handed out. */
    readonly tracks: FakeTrack[];
    /** Every recognizer constructed. */
    readonly recognizers: FakeRecognition[];
    /** Every recorder constructed. */
    readonly recorders: FakeRecorder[];
    /** Every utterance spoken. */
    readonly utterances: FakeUtterance[];
    /** Every audio element made. */
    readonly audios: FakeAudio[];
    /** Every `getUserMedia` call. */
    readonly microphoneOpens: number;
    /** Audio contexts closed. */
    readonly contextsClosed: number;
    /** The `localStorage` contents (memory storage). */
    readonly storage: Map<string, string>;
    /** Tracks not yet stopped. */
    liveTracks(): number;
    /** Run the animation frames now requested. */
    frame(): void;
    /** Animation frames requested and not yet run or cancelled. */
    pendingFrames(): number;
    /** End the utterance being spoken, as the synthesizer does when it finishes. */
    finishSpeaking(): void;
    /**
     * Set every microphone sample the analyser reads from now on (default 0.25, a level of 0.5,
     * which is speech; 0 is silence).
     * @param sample - The sample value.
     */
    setSample(sample: number): void;
}

/**
 * Install the fakes.
 * @param options - How the fake page behaves.
 * @returns The fakes.
 */
export function installFakeSpeech(options: FakeSpeechOptions = {}): FakeSpeech {
    const tracks: FakeTrack[] = [];
    const recognizers: FakeRecognition[] = [];
    const recorders: FakeRecorder[] = [];
    const utterances: FakeUtterance[] = [];
    const audios: FakeAudio[] = [];
    const storage = new Map<string, string>();
    const frames = new Map<number, () => void>();
    let nextFrame = 1;
    const counts = { microphoneOpens: 0, contextsClosed: 0, sample: 0.25 };
    const microphone = options.microphone ?? "granted";

    // In Node there is no window; the recognizer is read from one.
    if (typeof window === "undefined") {
        vi.stubGlobal("window", globalThis);
    }

    const stub = (name: string, value: unknown): void => {
        vi.stubGlobal(name, value);
        // Under happy-dom `window` may be its own object; the recognizer is read from it.
        if (typeof window !== "undefined" && (window as unknown) !== globalThis) {
            Object.defineProperty(window, name, { value, configurable: true, writable: true });
        }
    };

    const recognition = options.recognition ?? "works";
    const ctor =
        recognition === "absent"
            ? undefined
            : Object.assign(
                  class extends FakeRecognition {
                      constructor() {
                          super(recognition === "start-throws", recognizers);
                      }
                  },
                  options.onDevice === undefined ? {} : { available: () => Promise.resolve(options.onDevice) },
              );
    stub("SpeechRecognition", undefined);
    stub("webkitSpeechRecognition", ctor);

    const mediaDevices =
        microphone === "absent"
            ? undefined
            : {
                  getUserMedia: (): Promise<unknown> => {
                      counts.microphoneOpens++;
                      if (microphone === "denied") {
                          return Promise.reject(new DOMException("denied", "NotAllowedError"));
                      }

                      const track = new FakeTrack();
                      tracks.push(track);
                      return Promise.resolve({ getTracks: () => [track] });
                  },
              };
    stub("navigator", {
        language: options.language ?? "fr-FR",
        userAgent:
            options.userAgent ??
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        mediaDevices,
        permissions: {
            query: () => Promise.resolve({ state: microphone === "absent" ? "prompt" : microphone }),
        },
    });
    stub("isSecureContext", options.secure ?? true);

    stub(
        "localStorage",
        options.storage === "throws"
            ? {
                  getItem: () => {
                      throw new DOMException("blocked", "SecurityError");
                  },
                  setItem: () => {
                      throw new DOMException("blocked", "SecurityError");
                  },
              }
            : {
                  getItem: (key: string) => storage.get(key) ?? null,
                  setItem: (key: string, value: string) => storage.set(key, value),
              },
    );

    stub(
        "MediaRecorder",
        class extends FakeRecorder {
            constructor(stream: unknown) {
                super(stream);
                recorders.push(this);
            }
        },
    );
    stub(
        "AudioContext",
        class {
            createAnalyser(): unknown {
                return {
                    fftSize: 2048,
                    getFloatTimeDomainData: (samples: Float32Array) => samples.fill(counts.sample),
                };
            }

            createMediaStreamSource(): unknown {
                return { connect: () => undefined };
            }

            resume(): Promise<void> {
                return Promise.resolve();
            }

            close(): Promise<void> {
                counts.contextsClosed++;
                return Promise.resolve();
            }
        },
    );
    stub("requestAnimationFrame", (callback: () => void) => {
        const id = nextFrame++;
        frames.set(id, callback);
        return id;
    });
    stub("cancelAnimationFrame", (id: number) => frames.delete(id));

    let speaking: FakeUtterance | undefined;
    stub(
        "speechSynthesis",
        options.synthesis === false
            ? undefined
            : {
                  speak: (utterance: FakeUtterance) => {
                      utterances.push(utterance);
                      speaking = utterance;
                      queueMicrotask(() => utterance.onstart?.());
                  },
                  cancel: () => {
                      const current = speaking;
                      speaking = undefined;
                      current?.onerror?.({ error: "interrupted" });
                  },
                  getVoices: () => [{ default: true, localService: true }],
              },
    );
    stub("SpeechSynthesisUtterance", FakeUtterance);
    FakeAudio.rejectPlay = false;
    stub(
        "Audio",
        class extends FakeAudio {
            constructor(src: string) {
                super(src);
                audios.push(this);
            }
        },
    );

    return {
        tracks,
        recognizers,
        recorders,
        utterances,
        audios,
        storage,
        get microphoneOpens() {
            return counts.microphoneOpens;
        },
        get contextsClosed() {
            return counts.contextsClosed;
        },
        liveTracks: () => tracks.filter((track) => !track.stopped).length,
        frame() {
            const due = [...frames.values()];
            frames.clear();
            for (const callback of due) {
                callback();
            }
        },
        pendingFrames: () => frames.size,
        finishSpeaking() {
            const current = speaking;
            speaking = undefined;
            current?.onend?.();
        },
        setSample(sample) {
            counts.sample = sample;
        },
    };
}

/**
 * Let queued promise reactions run (the fakes answer in microtasks).
 */
export async function flushMicrotasks(): Promise<void> {
    for (let i = 0; i < 20; i++) {
        await Promise.resolve();
    }
}
