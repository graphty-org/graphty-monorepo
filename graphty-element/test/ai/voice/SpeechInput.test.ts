/**
 * @file One press of talk on fakes of the page's speech APIs: the microphone is open only while
 * the press lasts (every track counted stopped after release, cancel and dispose), the level is
 * reported per frame while it is open, browser recognition and provider transcription each end
 * with what was heard, and whether recognition works is remembered per origin.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import { getSpeechRecognitionConstructor } from "../../../src/ai/input/VoiceInputAdapter";
import { chooseInput, type VoiceFacts } from "../../../src/ai/voice/choose";
import { type SpeechInputEnd, type SpeechInputOptions, startSpeechInput } from "../../../src/ai/voice/SpeechInput";
import {
    readVoiceEnvironment,
    recallRecognition,
    RECOGNITION_MEMORY_KEY,
    rememberRecognition,
    voiceLanguage,
} from "../../../src/ai/voice/support";
import { type FakeSpeechOptions, flushMicrotasks, installFakeSpeech } from "../../helpers/fake-speech";

afterEach(() => {
    vi.unstubAllGlobals();
});

/** A press with its reports recorded. */
interface Press {
    transcripts: [string, boolean][];
    levels: number[];
    ended: Promise<SpeechInputEnd>;
    press: ReturnType<typeof startSpeechInput>;
}

/**
 * Start a press and record what it reports.
 * @param route - The route.
 * @param engine - The engine for the provider route.
 * @returns The press and its reports.
 */
function press(route: "browser" | "provider", engine?: FakeEngine, options: Partial<SpeechInputOptions> = {}): Press {
    const transcripts: [string, boolean][] = [];
    const levels: number[] = [];
    let resolveEnd: (end: SpeechInputEnd) => void = () => undefined;
    let ends = 0;
    const ended = new Promise<SpeechInputEnd>((resolve) => {
        resolveEnd = resolve;
    });
    const started = startSpeechInput(
        route,
        { language: "fr-FR", engine, ...options },
        {
            onTranscript: (text, isFinal) => transcripts.push([text, isFinal]),
            onLevel: (level) => levels.push(level),
            onEnd: (end) => {
                ends++;
                assert.strictEqual(ends, 1, "a press ends once");
                resolveEnd(end);
            },
        },
    );
    return { transcripts, levels, ended, press: started };
}

/**
 * A transcribing engine.
 * @param text - What it hears.
 * @returns The engine.
 */
function transcriber(text = " make the hubs red "): FakeEngine {
    const engine = new FakeEngine();
    engine.scriptVoice({ transcribe: text });
    return engine;
}

describe("provider transcription", () => {
    it("records while held, reports the level per frame, and hands the clip to transcribe on release", async () => {
        const fake = installFakeSpeech();
        const engine = transcriber();
        const run = press("provider", engine);
        await flushMicrotasks();
        assert.strictEqual(fake.liveTracks(), 1, "the microphone is open while held");
        assert.strictEqual(fake.recorders[0]?.state, "recording");
        fake.frame();
        fake.frame();
        assert.strictEqual(run.levels.length, 2, "one level per frame");
        assert.isTrue(run.levels.every((level) => level > 0 && level <= 1));

        run.press.stop();
        assert.strictEqual(fake.liveTracks(), 0, "release closes the microphone");
        assert.strictEqual(fake.pendingFrames(), 0, "no level after release");
        const end = await run.ended;
        assert.deepStrictEqual(end, { code: "AI_COMPLETED", params: {}, text: "make the hubs red" });
        assert.deepStrictEqual(run.transcripts, [["make the hubs red", true]]);
        assert.strictEqual(engine.voiceCalls.length, 1);
        const call = engine.voiceCalls[0];
        assert.isTrue(call?.kind === "transcribe" && call.audio.size > 0, "a non-empty clip");
        assert.strictEqual(fake.contextsClosed, 1);
    });

    it("cancel closes the microphone, transcribes nothing and ends AI_CANCELLED", async () => {
        const fake = installFakeSpeech();
        const engine = transcriber();
        const run = press("provider", engine);
        await flushMicrotasks();
        run.press.cancel();
        assert.strictEqual(fake.liveTracks(), 0);
        assert.strictEqual((await run.ended).code, "AI_CANCELLED");
        await flushMicrotasks();
        assert.strictEqual(engine.voiceCalls.length, 0);
    });

    it("dispose closes the microphone and reports nothing", async () => {
        const fake = installFakeSpeech();
        const engine = transcriber();
        const run = press("provider", engine);
        await flushMicrotasks();
        run.press.dispose();
        await flushMicrotasks();
        assert.strictEqual(fake.liveTracks(), 0);
        assert.strictEqual(fake.tracks.length, 1);
        assert.strictEqual(engine.voiceCalls.length, 0);
        assert.deepStrictEqual(run.transcripts, []);
    });

    it("a release before the microphone opened closes it as it opens, with nothing heard", async () => {
        const fake = installFakeSpeech();
        const engine = transcriber();
        const run = press("provider", engine);
        run.press.stop();
        const end = await run.ended;
        assert.deepStrictEqual(end, { code: "AI_COMPLETED", params: {}, text: "" });
        assert.strictEqual(fake.tracks.length, 1);
        assert.strictEqual(fake.liveTracks(), 0);
        assert.strictEqual(engine.voiceCalls.length, 0);
    });

    it("passes a transcription failure through", async () => {
        installFakeSpeech();
        const engine = new FakeEngine();
        engine.scriptVoice({
            transcribe: () => Promise.resolve({ code: "AI_KEY_REJECTED", params: { provider: "openai" } }),
        });
        const run = press("provider", engine);
        await flushMicrotasks();
        run.press.stop();
        assert.deepStrictEqual(await run.ended, { code: "AI_KEY_REJECTED", params: { provider: "openai" }, text: "" });
    });

    it("a press that never reached speech level is heard as nothing and sends no clip", async () => {
        const fake = installFakeSpeech();
        const engine = transcriber("Yes.");
        fake.setSample(0.005);
        const quiet = press("provider", engine, { speechLevel: 0.04 });
        await flushMicrotasks();
        quiet.press.stop();
        assert.deepStrictEqual(await quiet.ended, { code: "AI_COMPLETED", params: {}, text: "" });
        assert.strictEqual(engine.voiceCalls.length, 0, "silence is never sent to be transcribed");

        // The same press with speech in it is sent, with no animation frame run: the peak is sampled
        // on a timer and at release, since frames pause in XR.
        fake.setSample(0.25);
        const spoken = press("provider", engine, { speechLevel: 0.04 });
        await flushMicrotasks();
        spoken.press.stop();
        assert.strictEqual((await spoken.ended).text, "Yes.");
        assert.strictEqual(engine.voiceCalls.length, 1);
    });

    it("an engine that throws instead of coding its failure still ends the press", async () => {
        const fake = installFakeSpeech();
        const engine = new FakeEngine();
        engine.scriptVoice({ transcribe: () => Promise.reject(new Error("the voice chunk did not load")) });
        const run = press("provider", engine);
        await flushMicrotasks();
        run.press.stop();
        assert.deepStrictEqual(await run.ended, { code: "AI_PROVIDER_ERROR", params: {}, text: "" });
        assert.strictEqual(fake.liveTracks(), 0);
    });

    it("an engine that cannot transcribe: no-provider-transcription, microphone never opened", async () => {
        const fake = installFakeSpeech();
        const run = press("provider", new FakeEngine());
        const end = await run.ended;
        assert.deepStrictEqual(end.params, { path: "input", reason: "no-provider-transcription" });
        assert.strictEqual(fake.microphoneOpens, 0);
    });
});

describe("the microphone's reasons", () => {
    const cases: [string, FakeSpeechOptions, string][] = [
        ["refused", { microphone: "denied" }, "permission-denied"],
        ["absent", { microphone: "absent" }, "no-microphone"],
        ["an insecure page", { microphone: "absent", secure: false }, "insecure-context"],
    ];
    for (const [name, options, reason] of cases) {
        it(name, async () => {
            const fake = installFakeSpeech(options);
            const run = press("provider", transcriber());
            assert.deepStrictEqual((await run.ended).params, { path: "input", reason });
            assert.strictEqual(fake.liveTracks(), 0);
        });
    }
});

describe("browser recognition", () => {
    it("ends with every final result once released, the microphone closed and success remembered", async () => {
        const fake = installFakeSpeech();
        const run = press("browser");
        await flushMicrotasks();
        const recognizer = fake.recognizers[0];
        assert.isDefined(recognizer);
        assert.strictEqual(recognizer?.lang, "fr-FR");
        assert.isTrue(recognizer?.continuous);
        assert.strictEqual(fake.liveTracks(), 1, "the level's stream is open while held");
        fake.frame();
        assert.strictEqual(run.levels.length, 1);

        recognizer?.hear("color the", false);
        recognizer?.hear("color these red", true);
        recognizer?.hear("now", false);
        run.press.stop();
        assert.strictEqual(fake.liveTracks(), 0);
        assert.strictEqual(recognizer?.stopCalls, 1);
        const end = await run.ended;
        assert.deepStrictEqual(end, { code: "AI_COMPLETED", params: {}, text: "color these red now" });
        assert.deepStrictEqual(run.transcripts, [
            ["color the", false],
            ["color these red", false],
            ["color these red now", false],
            ["color these red now", true],
        ]);
        assert.strictEqual(recallRecognition(), "works");
    });

    it("asks for on-device recognition when told to", async () => {
        const fake = installFakeSpeech();
        startSpeechInput(
            "browser",
            { language: "en-GB", processLocally: true },
            { onTranscript() {}, onLevel() {}, onEnd() {} },
        );
        await flushMicrotasks();
        assert.isTrue(fake.recognizers[0]?.processLocally);
    });

    it("cancel ends AI_CANCELLED, not with what was heard", async () => {
        const fake = installFakeSpeech();
        const run = press("browser");
        await flushMicrotasks();
        fake.recognizers[0]?.hear("delete everything", true);
        run.press.cancel();
        assert.strictEqual((await run.ended).code, "AI_CANCELLED");
        assert.strictEqual(fake.liveTracks(), 0);
    });

    it("only a browser that cannot recognize at all is remembered as failing, for the whole origin", async () => {
        const fake = installFakeSpeech();
        const broken = press("browser");
        await flushMicrotasks();
        fake.recognizers[0]?.fail("service-not-allowed");
        assert.deepStrictEqual((await broken.ended).params, { path: "input", reason: "no-recognition" });
        assert.strictEqual(fake.liveTracks(), 0);
        assert.strictEqual(recallRecognition(), "fails");

        fake.storage.clear();
        const refused = press("browser");
        await flushMicrotasks();
        fake.recognizers[1]?.fail("not-allowed");
        assert.deepStrictEqual((await refused.ended).params, { path: "input", reason: "permission-denied" });
        assert.isUndefined(recallRecognition());
    });

    it("a network error fails this press only: nothing is remembered", async () => {
        const fake = installFakeSpeech();
        const offline = press("browser");
        await flushMicrotasks();
        fake.recognizers[0]?.fail("network");
        assert.deepStrictEqual((await offline.ended).params, { path: "input", reason: "recognition-network" });
        assert.strictEqual(fake.liveTracks(), 0);
        assert.isUndefined(recallRecognition("fr-FR"));
        assert.strictEqual(fake.storage.size, 0);
    });

    it("an unsupported language is remembered for that language only, until a start in it works", async () => {
        const fake = installFakeSpeech();
        const unsupported = press("browser");
        await flushMicrotasks();
        fake.recognizers[0]?.fail("language-not-supported");
        assert.deepStrictEqual((await unsupported.ended).params, { path: "input", reason: "no-recognition" });
        assert.strictEqual(recallRecognition("fr-FR"), "fails");
        assert.isUndefined(recallRecognition("de-DE"), "another language still tries the browser");
        assert.isUndefined(recallRecognition());
        assert.strictEqual((await readVoiceEnvironment("de-DE")).recognition, "untried");
        assert.strictEqual((await readVoiceEnvironment("fr-FR")).recognition, "fails");

        const retried = press("browser");
        await flushMicrotasks();
        fake.recognizers[1]?.hear("bonjour", true);
        retried.press.stop();
        assert.strictEqual((await retried.ended).text, "bonjour");
        assert.strictEqual(recallRecognition("fr-FR"), "works");
    });
});

describe("the probe, remembered per origin", () => {
    it("Quest: the constructor is there, start fails, and the next press takes the provider", async () => {
        const fake = installFakeSpeech({ recognition: "start-throws" });
        const provider = { transcription: "ready", speech: "ready", immersive: true } as const;
        const before: VoiceFacts = { ...(await readVoiceEnvironment("en-US")), ...provider };
        assert.strictEqual(before.recognition, "untried");
        assert.strictEqual(chooseInput("auto", before).path, "browser");

        const first = press("browser");
        assert.deepStrictEqual((await first.ended).params, { path: "input", reason: "no-recognition" });
        await flushMicrotasks();
        assert.strictEqual(fake.liveTracks(), 0);

        // A new element reads the same origin's memory.
        const after: VoiceFacts = { ...(await readVoiceEnvironment("en-US")), ...provider };
        assert.strictEqual(after.recognition, "fails");
        assert.strictEqual(chooseInput("auto", after).path, "provider");
        const engine = transcriber("hello");
        const second = press("provider", engine);
        await flushMicrotasks();
        second.press.stop();
        assert.strictEqual((await second.ended).text, "hello");
        assert.strictEqual(fake.storage.get(RECOGNITION_MEMORY_KEY), "fails");
    });

    it("a throwing localStorage remembers nothing, throws nothing, and probes again", async () => {
        installFakeSpeech({ storage: "throws" });
        rememberRecognition("fails");
        assert.isUndefined(recallRecognition());
        assert.strictEqual((await readVoiceEnvironment("en-US")).recognition, "untried");
    });

    it("reads the page: Safari on the device, Chrome's processLocally only when available", async () => {
        installFakeSpeech({
            userAgent:
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
        });
        assert.strictEqual((await readVoiceEnvironment("en-US")).onDevice, "always");
        vi.unstubAllGlobals();
        installFakeSpeech({ onDevice: "available" });
        const chrome = await readVoiceEnvironment("en-US");
        assert.strictEqual(chrome.onDevice, "process-locally");
        assert.strictEqual(chrome.permission, "granted");
        assert.isTrue(chrome.synthesisLocal);
        vi.unstubAllGlobals();
        installFakeSpeech({ onDevice: "downloadable", recognition: "absent", microphone: "absent" });
        const bare = await readVoiceEnvironment("en-US");
        assert.strictEqual(bare.onDevice, "none");
        assert.strictEqual(bare.recognition, "none");
        assert.isFalse(bare.microphone);
    });

    it("never asks Headless Chrome for on-device recognition, which closes the page", async () => {
        installFakeSpeech({
            onDevice: "available",
            userAgent:
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.8010.12 Safari/537.36",
        });
        const available = vi.spyOn(
            getSpeechRecognitionConstructor() as unknown as { available: () => Promise<string> },
            "available",
        );
        assert.strictEqual((await readVoiceEnvironment("en-US")).onDevice, "none");
        assert.strictEqual(available.mock.calls.length, 0);
    });

    it("hears the page's language unless voice.language says otherwise", () => {
        installFakeSpeech({ language: "de-DE" });
        assert.strictEqual(voiceLanguage({}), "de-DE");
        assert.strictEqual(voiceLanguage({ language: "ja-JP" }), "ja-JP");
    });
});
