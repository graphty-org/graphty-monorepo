// Speech to text for the techniques that need it (plan section 1.3): the Web Speech API where the
// browser has one (Chrome on Galaxy XR: `webkitSpeechRecognition`, a cloud service), and a reason
// where it does not (Quest Browser has none; there the route is the system keyboard's microphone
// key, scene/system-keyboard.ts). Whether starting recognition blurs an immersive session on Galaxy
// XR is unverified: every start and end is for the caller to log with its reason.

/** As much of a Web Speech recognizer as the sandbox uses (lib.dom does not declare it). */
interface Recognition {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult:
        | ((e: {
              resultIndex: number;
              results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
          }) => void)
        | null;
    onerror: ((e: { error: string }) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
}

type RecognitionCtor = new () => Recognition;

const ctor = (): RecognitionCtor | undefined => {
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

/**
 * Whether this browser can recognize speech, and if not why.
 * @returns support and a reason
 */
export function speechSupport(): { supported: boolean; reason: string } {
    return ctor()
        ? { supported: true, reason: "Web Speech API" }
        : { supported: false, reason: "this browser has no Web Speech API" };
}

/** One recognition: its result, and a way to stop it early. */
export interface Listening {
    /** The final text, and why it ended: "final", "stopped", or the engine's error code. */
    done: Promise<{ text: string; reason: string }>;
    stop(): void;
}

/**
 * Recognize one utterance.
 * @param onInterim - called with the words so far, final and interim, while they arrive
 * @param lang - BCP 47 language
 * @returns the recognition, or null without a Web Speech API
 */
export function listen(onInterim?: (text: string) => void, lang = "en-US"): Listening | null {
    const Ctor = ctor();
    if (!Ctor) {
        return null;
    }
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = !!onInterim;
    r.continuous = false;
    let final = "";
    let reason = "final";
    const done = new Promise<{ text: string; reason: string }>((resolve) => {
        r.onresult = (e) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const res = e.results[i];
                if (res.isFinal) {
                    final += res[0].transcript;
                } else {
                    interim += res[0].transcript;
                }
            }
            onInterim?.(final + interim);
        };
        r.onerror = (e) => {
            reason = e.error;
        };
        r.onend = () => {
            resolve({ text: final.trim(), reason });
        };
    });
    try {
        r.start();
    } catch (e) {
        return { done: Promise.resolve({ text: "", reason: String(e) }), stop: () => undefined };
    }
    return {
        done,
        stop: () => {
            reason = "stopped";
            r.stop();
        },
    };
}
