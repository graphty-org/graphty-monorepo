/**
 * @file The provider speech paths on Chromium's real media stack, with its fake microphone (a
 * tone) and the permission prompt answered yes (`--use-fake-device-for-media-stream`,
 * `--use-fake-ui-for-media-stream` in vitest.config.ts): a press records a real `MediaRecorder`
 * clip and hands it to the engine's `transcribe`, the level arrives per frame while talk is held
 * and stops on release, and the provider's audio plays to its end.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import { type SpeechInputEnd, startSpeechInput } from "../../../src/ai/voice/SpeechInput";
import { createSpeechOutput } from "../../../src/ai/voice/SpeechOutput";

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * A WAV clip of silence, as a provider's speech comes back.
 * @param samples - How many 8 kHz 16-bit samples.
 * @returns The clip.
 */
function silentWav(samples: number): Blob {
    const view = new DataView(new ArrayBuffer(44 + samples * 2));
    const text = (offset: number, value: string): void => {
        for (let i = 0; i < value.length; i++) {
            view.setUint8(offset + i, value.charCodeAt(i));
        }
    };
    text(0, "RIFF");
    view.setUint32(4, 36 + samples * 2, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true);
    view.setUint32(28, 16000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, samples * 2, true);
    return new Blob([view.buffer], { type: "audio/wav" });
}

describe("provider transcription on the real microphone", () => {
    it("records a non-empty clip while held, reports the level per frame, and stops both on release", async () => {
        const trackStops = vi.spyOn(MediaStreamTrack.prototype, "stop");
        const clips: Blob[] = [];
        const engine = new FakeEngine();
        engine.scriptVoice({
            transcribe: (audio) => {
                clips.push(audio);
                return Promise.resolve({ code: "AI_COMPLETED", params: {}, text: "color this red" });
            },
        });
        const levels: number[] = [];
        let resolveEnd: (end: SpeechInputEnd) => void = () => undefined;
        const ended = new Promise<SpeechInputEnd>((resolve) => {
            resolveEnd = resolve;
        });
        const talk = startSpeechInput(
            "provider",
            { language: "en-US", engine },
            { onTranscript: () => undefined, onLevel: (level) => levels.push(level), onEnd: resolveEnd },
        );

        // Held until the level has been reported for a number of frames.
        await vi.waitFor(() => {
            assert.isAtLeast(levels.length, 10, "levels while held");
        });
        assert.isTrue(levels.every((level) => level >= 0 && level <= 1));
        const cancels = vi.spyOn(window, "cancelAnimationFrame");
        talk.stop();
        const atRelease = levels.length;
        // The level's pending frame is cancelled on release, so no frame can report another one.
        assert.isAtLeast(cancels.mock.calls.length, 1, "release cancelled the level's frame");
        assert.strictEqual(trackStops.mock.calls.length, 1, "release stopped the microphone's track");

        const end = await ended;
        assert.deepStrictEqual(end, { code: "AI_COMPLETED", params: {}, text: "color this red" });
        assert.strictEqual(clips.length, 1);
        assert.isAbove(clips[0]?.size ?? 0, 0, "a real recording");
        assert.match(clips[0]?.type ?? "", /^audio\//);

        assert.strictEqual(levels.length, atRelease, "no level after release");
    });
});

describe("provider speech in the real audio element", () => {
    it("plays the provider's clip to its end and ends AI_COMPLETED", async () => {
        const revoke = vi.spyOn(URL, "revokeObjectURL");
        const engine = new FakeEngine();
        engine.scriptVoice({ speak: silentWav(800) });
        let started = 0;
        const end = await createSpeechOutput("provider", { language: "en-US", engine }).speak("Done.", () => started++);
        assert.deepStrictEqual(end, { code: "AI_COMPLETED", params: {} });
        assert.strictEqual(started, 1);
        assert.strictEqual(revoke.mock.calls.length, 1, "the object URL was revoked");
    });
});
