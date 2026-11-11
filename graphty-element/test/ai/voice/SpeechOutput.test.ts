/**
 * @file Speaking an answer on fakes: the browser's synthesis in the reader's language, the
 * provider's audio played from an object URL that is revoked however playback ends, and cancel.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import { createSpeechOutput } from "../../../src/ai/voice/SpeechOutput";
import { FakeAudio, flushMicrotasks, installFakeSpeech } from "../../helpers/fake-speech";

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("browser speech", () => {
    it("speaks the text in the language and ends AI_COMPLETED", async () => {
        const fake = installFakeSpeech();
        const output = createSpeechOutput("browser", { language: "fr-FR" });
        let started = 0;
        const spoken = output.speak("Trois noeuds", () => started++);
        await flushMicrotasks();
        assert.strictEqual(fake.utterances[0]?.text, "Trois noeuds");
        assert.strictEqual(fake.utterances[0]?.lang, "fr-FR");
        assert.strictEqual(started, 1);
        fake.finishSpeaking();
        assert.strictEqual((await spoken).code, "AI_COMPLETED");
    });

    it("cancel ends AI_CANCELLED, and a new speak cuts off the old one", async () => {
        const fake = installFakeSpeech();
        const output = createSpeechOutput("browser", { language: "en-US" });
        const first = output.speak("one");
        const second = output.speak("two");
        assert.strictEqual((await first).code, "AI_CANCELLED");
        output.cancel();
        assert.strictEqual((await second).code, "AI_CANCELLED");
        assert.strictEqual(fake.utterances.length, 2);
    });

    it("no synthesis: no-synthesis", async () => {
        installFakeSpeech({ synthesis: false });
        const end = await createSpeechOutput("browser", { language: "en-US" }).speak("hi");
        assert.deepStrictEqual(end, {
            code: "AI_VOICE_UNAVAILABLE",
            params: { path: "output", reason: "no-synthesis" },
        });
    });
});

describe("provider speech", () => {
    /**
     * A speaking engine.
     * @returns The engine.
     */
    function speaker(): FakeEngine {
        const engine = new FakeEngine();
        engine.scriptVoice({ speak: new Blob(["RIFF"], { type: "audio/wav" }) });
        return engine;
    }

    it("plays the provider's audio from an object URL, revoked when it ends", async () => {
        const fake = installFakeSpeech();
        const revoke = vi.spyOn(URL, "revokeObjectURL");
        const engine = speaker();
        const output = createSpeechOutput("provider", { language: "en-US", engine, voiceName: "Kore" });
        let started = 0;
        const spoken = output.speak("Done.", () => started++);
        await flushMicrotasks();
        const audio = fake.audios[0];
        assert.isDefined(audio);
        assert.isFalse(audio?.paused);
        assert.strictEqual(started, 1);
        assert.deepStrictEqual(
            engine.voiceCalls.map((call) => call.kind === "speak" && call.text),
            ["Done."],
        );
        audio?.onended?.();
        assert.strictEqual((await spoken).code, "AI_COMPLETED");
        assert.deepStrictEqual(revoke.mock.calls, [[audio?.src]]);
    });

    it("cancel stops playback and revokes the URL", async () => {
        const fake = installFakeSpeech();
        const revoke = vi.spyOn(URL, "revokeObjectURL");
        const output = createSpeechOutput("provider", { language: "en-US", engine: speaker() });
        const spoken = output.speak("Done.");
        await flushMicrotasks();
        output.cancel();
        assert.strictEqual((await spoken).code, "AI_CANCELLED");
        assert.isTrue(fake.audios[0]?.paused);
        assert.strictEqual(revoke.mock.calls.length, 1);
    });

    it("blocked playback: playback-failed, URL revoked", async () => {
        installFakeSpeech();
        FakeAudio.rejectPlay = true;
        const revoke = vi.spyOn(URL, "revokeObjectURL");
        const end = await createSpeechOutput("provider", { language: "en-US", engine: speaker() }).speak("x");
        assert.deepStrictEqual(end.params, { path: "output", reason: "playback-failed" });
        assert.strictEqual(revoke.mock.calls.length, 1);
    });

    it("passes the provider's failure through and plays nothing", async () => {
        const fake = installFakeSpeech();
        const engine = new FakeEngine();
        engine.scriptVoice({ speak: () => Promise.resolve({ code: "AI_PROVIDER_ERROR", params: { status: 500 } }) });
        const end = await createSpeechOutput("provider", { language: "en-US", engine }).speak("x");
        assert.deepStrictEqual(end, { code: "AI_PROVIDER_ERROR", params: { status: 500 } });
        assert.strictEqual(fake.audios.length, 0);
    });

    it("an engine that cannot speak: no-provider-speech", async () => {
        installFakeSpeech();
        const end = await createSpeechOutput("provider", { language: "en-US", engine: new FakeEngine() }).speak("x");
        assert.deepStrictEqual(end.params, { path: "output", reason: "no-provider-speech" });
    });
});
