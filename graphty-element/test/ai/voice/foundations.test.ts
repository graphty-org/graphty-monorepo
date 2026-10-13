/**
 * @file The voice facts and the seams under `aiTalk`: the catalog's provider table and code, the
 * engine's optional speech members and the XR `ai` group. An assistant with no `voice` is
 * test/browser/ai/voice-off.test.ts.
 */

import { assert, describe, it } from "vitest";

import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import {
    AI_PROVIDER_IDS,
    AI_RESULT_CODES,
    AI_VOICE_CAPABILITIES,
    AI_VOICE_UNAVAILABLE_REASONS,
    aiVoiceStatus,
} from "../../../src/catalog/ai";
import { xrConfigSchema } from "../../../src/config/xr-config-schema";

describe("the provider voice table", () => {
    it("lists every provider, with OpenAI's and Google's models and none for the rest", () => {
        assert.sameMembers(Object.keys(AI_VOICE_CAPABILITIES), [...AI_PROVIDER_IDS]);
        assert.deepStrictEqual(AI_VOICE_CAPABILITIES.openai, {
            transcription: { status: "available", model: "gpt-4o-mini-transcribe" },
            speech: { status: "available", model: "tts-1" },
            live: { status: "available", model: "gpt-realtime-2.1" },
        });
        assert.deepStrictEqual(AI_VOICE_CAPABILITIES.google, {
            transcription: { status: "available", viaChatModel: true },
            speech: { status: "available", model: "gemini-3.1-flash-tts-preview" },
            live: { status: "available", model: "gemini-3.8-live" },
        });
        for (const provider of ["anthropic", "webllm", "mock"] as const) {
            assert.strictEqual(aiVoiceStatus(provider, "input"), "unsupported", provider);
            assert.strictEqual(aiVoiceStatus(provider, "output"), "unsupported", provider);
            assert.strictEqual(AI_VOICE_CAPABILITIES[provider].live?.status, "unsupported", provider);
        }

        assert.strictEqual(aiVoiceStatus("google", "input"), "available");
        assert.strictEqual(aiVoiceStatus("openai", "output"), "available");
    });

    it("has the code AI_VOICE_UNAVAILABLE and its reasons", () => {
        assert.include(AI_RESULT_CODES, "AI_VOICE_UNAVAILABLE");
        assert.deepStrictEqual(
            [...AI_VOICE_UNAVAILABLE_REASONS],
            [
                "no-recognition",
                "no-microphone",
                "permission-denied",
                "insecure-context",
                "no-provider-transcription",
                "no-provider-speech",
                "no-key",
                "no-synthesis",
                "playback-failed",
                "unknown-voice",
                "recognition-network",
                "no-provider-live",
                "live-custom-base-url",
                "no-live-transport",
                "output-off",
                "live-busy",
            ],
        );
    });
});

describe("the engine's speech members", () => {
    it("are absent from a fake until a test scripts them, then record each call", async () => {
        const engine = new FakeEngine();
        assert.isFalse("transcribe" in engine);
        assert.isFalse("speak" in engine);

        engine.scriptVoice({ transcribe: "hello" });
        assert.isTrue("transcribe" in engine);
        assert.isFalse("speak" in engine, "a direction left out stays absent");

        const clip = new Blob([new Uint8Array(4)]);
        const heard = await engine.transcribe?.(clip, { language: "en-GB" }, new AbortController().signal);
        assert.deepStrictEqual(heard, { code: "AI_COMPLETED", params: {}, text: "hello" });
        assert.deepStrictEqual(engine.voiceCalls, [{ kind: "transcribe", audio: clip }]);
    });
});

describe("the engine's live member", () => {
    it("is absent from a fake until a test scripts it, then opens recorded connections", async () => {
        const engine = new FakeEngine();
        assert.isFalse("openLive" in engine);

        engine.scriptLive();
        const opened = await engine.openLive?.({ instructions: "Be brief.", tools: [] }, new AbortController().signal);
        assert.strictEqual(opened?.code, "AI_COMPLETED");
        const connection = engine.liveConnections[0];
        assert.isDefined(connection);
        assert.strictEqual(connection.options.instructions, "Be brief.");

        const heard: string[] = [];
        connection.on((event) => heard.push(event.type));
        connection.capture(true);
        connection.capture(false);
        connection.interrupt();
        connection.emit({ type: "reader-transcript", text: "make n3 red", final: true });
        connection.emit({
            type: "closed",
            code: "AI_PROVIDER_ERROR",
            params: { provider: "fake", cause: "live-closed" },
        });
        connection.emit({ type: "response-end" });
        connection.capture(true);
        assert.deepStrictEqual(connection.captures, [true, false], "nothing is recorded after it closed");
        assert.strictEqual(connection.interrupts, 1);
        assert.deepStrictEqual(heard, ["reader-transcript", "closed"]);
        assert.isTrue(connection.closed);
    });

    it("fails with the scripted code, and with AI_CANCELLED once aborted", async () => {
        const engine = new FakeEngine();
        engine.scriptLive({ code: "AI_KEY_REJECTED", params: { provider: "fake", status: 401 } });
        const failed = await engine.openLive?.({ instructions: "", tools: [] }, new AbortController().signal);
        assert.deepStrictEqual(failed, { code: "AI_KEY_REJECTED", params: { provider: "fake", status: 401 } });

        const abort = new AbortController();
        abort.abort();
        const cancelled = await engine.openLive?.({ instructions: "", tools: [] }, abort.signal);
        assert.strictEqual(cancelled?.code, "AI_CANCELLED");
        assert.lengthOf(engine.liveConnections, 0);
    });
});

describe("the XR ai group", () => {
    it("is absent from a parsed configuration that leaves it out", () => {
        assert.notProperty(xrConfigSchema.parse({}), "ai");
    });

    it("keeps what a host sets, and refuses a button that is not a face button", () => {
        const parsed = xrConfigSchema.parse({
            ai: { pushToTalk: { buttons: ["y"], wristOrb: false }, labels: { approve: "Oui" } },
        });
        assert.deepStrictEqual(parsed.ai, {
            pushToTalk: { buttons: ["y"], wristOrb: false },
            labels: { approve: "Oui" },
        });
        assert.isFalse(xrConfigSchema.safeParse({ ai: { pushToTalk: { buttons: ["trigger"] } } }).success);
    });
});
