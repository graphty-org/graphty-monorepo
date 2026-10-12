/**
 * @file Live presses on fakes: the page's speech (test/helpers/fake-speech.ts) and a scripted live
 * connection (`FakeEngine.scriptLive`). One connection per assistant, opened on the first live
 * press and reused; the microphone sent exactly while talk is held; barge-in; levels per animation
 * frame; the model's speaking state; a pending approval or question answered turn by turn; a press
 * while a spoken message runs its tools answered turn by turn; and every way the connection closes,
 * never for being idle while a message runs.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import type { ExecutionResult } from "../../../src/ai/AiController";
import type { AiVoiceOptions } from "../../../src/ai/AiManager";
import { FakeEngine, type FakeLiveConnection } from "../../../src/ai/engine/FakeEngine";
import { LIVE_IDLE_MS } from "../../../src/ai/voice/LiveSession";
import {
    type ProviderLiveSpeech,
    type VoiceController,
    type VoiceEventType,
    VoiceSession,
} from "../../../src/ai/voice/VoiceSession";
import type { AiApprovalRequest } from "../../../src/events";
import { type FakeSpeech, flushMicrotasks, installFakeSpeech } from "../../helpers/fake-speech";

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

const DONE: ExecutionResult = { success: true, message: "" };

/** A voice session whose chat provider has a scripted live API. */
interface Harness {
    readonly fake: FakeSpeech;
    readonly engine: FakeEngine;
    readonly voice: VoiceSession;
    readonly heard: [VoiceEventType, Record<string, unknown>][];
    /** The approvals the controller holds. */
    readonly approvals: AiApprovalRequest[];
    /** Every text sent, by either path. */
    readonly sent: string[];
    /**
     * Hold every message sent from now on until the returned function is called.
     * @returns Ends them.
     */
    block(): () => void;
    /** Tell the open connection it no longer knows the conversation. */
    stale(): void;
    /** The one connection opened so far. */
    connection(): FakeLiveConnection;
}

/**
 * Build the harness.
 * @param options - The assistant's `voice`, besides `mode: "live"`.
 * @param live - The chat provider's live API: absent, a scripted one.
 * @returns The harness.
 */
function harness(options: AiVoiceOptions = {}, live?: Partial<ProviderLiveSpeech>): Harness {
    const fake = installFakeSpeech();
    // Gemini's transport: Node has `WebSocket`, not the audio worklet.
    vi.stubGlobal("AudioWorkletNode", function AudioWorkletNode() {});
    const engine = new FakeEngine();
    engine.scriptLive();
    const approvals: AiApprovalRequest[] = [];
    const sent: string[] = [];
    let blocked: Promise<ExecutionResult> | undefined;
    const watchers = new Set<() => void>();
    const controller: VoiceController = {
        execute: (text) => {
            sent.push(text);
            return blocked ?? Promise.resolve(DONE);
        },
        getPendingApprovals: () => approvals,
        getPendingQuestions: () => [],
        resolveAiApproval: () => Promise.resolve(DONE),
        answerQuestion: () => Promise.resolve(DONE),
    };
    const heard: Harness["heard"] = [];
    const voice = new VoiceSession({
        options: { mode: "live", ...options },
        controller,
        emit: (type, detail) => heard.push([type, detail]),
        transcriber: () => ({ readiness: "unsupported" }),
        speaker: () => ({ readiness: "unsupported" }),
        immersive: () => false,
        liveEngine: () => ({
            provider: "google",
            readiness: "ready",
            customBaseUrl: false,
            engine: engine as Required<Pick<FakeEngine, "openLive">>,
            session: () => Promise.resolve({ instructions: "", tools: [] }),
            readerContext: () => "",
            watch: (listener) => {
                watchers.add(listener);
                return () => {
                    watchers.delete(listener);
                };
            },
            ...live,
        }),
    });
    return {
        fake,
        engine,
        voice,
        heard,
        approvals,
        sent,
        block() {
            let end = (): void => undefined;
            blocked = new Promise((resolve) => {
                end = () => {
                    blocked = undefined;
                    resolve(DONE);
                };
            });
            return end;
        },
        stale() {
            for (const listener of [...watchers]) {
                listener();
            }
        },
        connection() {
            assert.lengthOf(engine.liveConnections, 1, "one connection opened");
            return engine.liveConnections[0];
        },
    };
}

/**
 * The voice events of one type.
 * @param h - The harness.
 * @param type - The type.
 * @returns Their details.
 */
function of(h: Harness, type: VoiceEventType): Record<string, unknown>[] {
    return h.heard.flatMap(([t, detail]) => (t === type ? [detail] : []));
}

/**
 * Press talk and wait until the live connection carries the microphone.
 * @param h - The harness.
 */
async function hold(h: Harness): Promise<void> {
    const captures = h.engine.liveConnections.flatMap((c) => c.captures).length;
    h.voice.talk(true);
    await vi.waitFor(() => {
        assert.strictEqual(h.engine.liveConnections.flatMap((c) => c.captures).length, captures + 1, "capture on");
    });
}

describe("one live connection per assistant", () => {
    it("the first press opens it, later presses reuse it, and capture is on exactly while held", async () => {
        const h = harness();
        await hold(h);
        const connection = h.connection();
        assert.deepStrictEqual(connection.captures, [true]);
        h.voice.talk(false);
        assert.deepStrictEqual(connection.captures, [true, false], "release stops the microphone");
        await hold(h);
        h.voice.talk(false);
        assert.lengthOf(h.engine.liveConnections, 1, "the second press reused the connection");
        assert.deepStrictEqual(connection.captures, [true, false, true, false]);
        assert.deepStrictEqual(of(h, "ai-voice-start"), [{ mode: "live" }, { mode: "live" }]);
        assert.deepStrictEqual(of(h, "ai-voice-end"), [
            { reason: "user", code: "AI_COMPLETED", params: {} },
            { reason: "user", code: "AI_COMPLETED", params: {} },
        ]);
        assert.lengthOf(h.fake.recognizers, 0, "nothing listened turn by turn");
        assert.isFalse(connection.closed);
    });

    it("opens with the live model, voice and language", async () => {
        const h = harness({ liveModel: "gemini-live-x", voiceName: "Puck", language: "de-DE" });
        await hold(h);
        const { options } = h.connection();
        assert.strictEqual(options.model, "gemini-live-x");
        assert.strictEqual(options.voice, "Puck");
        assert.strictEqual(options.language, "de-DE");
    });

    it("push: toggle starts and ends a live press with one press each", async () => {
        const h = harness({ push: "toggle" });
        await hold(h);
        h.voice.talk(false);
        assert.deepStrictEqual(h.connection().captures, [true], "a release does nothing in toggle");
        h.voice.talk(true);
        assert.deepStrictEqual(h.connection().captures, [true, false]);
    });

    it("maxPressSeconds releases a held live press", async () => {
        const h = harness({ maxPressSeconds: 5 });
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        await hold(h);
        vi.advanceTimersByTime(5000);
        assert.deepStrictEqual(h.connection().captures, [true, false]);
        assert.deepStrictEqual(of(h, "ai-voice-end"), [{ reason: "user", code: "AI_COMPLETED", params: {} }]);
    });

    it("reports the level once per animation frame while held, and none after", async () => {
        const h = harness();
        await hold(h);
        const connection = h.connection();
        connection.inputLevel = 0.5;
        h.fake.frame();
        connection.inputLevel = 0.25;
        h.fake.frame();
        assert.deepStrictEqual(of(h, "ai-voice-level"), [{ level: 0.5 }, { level: 0.25 }]);
        h.voice.talk(false);
        assert.strictEqual(h.fake.pendingFrames(), 0, "no frame is asked for after release");
    });

    it("reports what the provider heard, and the model's speaking", async () => {
        const h = harness();
        await hold(h);
        const connection = h.connection();
        connection.emit({ type: "reader-transcript", text: "make it", final: false });
        h.voice.talk(false);
        connection.emit({ type: "reader-transcript", text: "make it red", final: true });
        connection.emit({ type: "speaking", on: true });
        connection.emit({ type: "speaking", on: false });
        assert.deepStrictEqual(of(h, "ai-voice-transcript"), [
            { transcript: "make it", isFinal: false },
            { transcript: "make it red", isFinal: true },
        ]);
        assert.deepStrictEqual(of(h, "ai-speech-start"), [{}]);
        assert.deepStrictEqual(of(h, "ai-speech-end"), [{ code: "AI_COMPLETED", params: {} }]);
    });
});

describe("barge-in", () => {
    it("a press while the model speaks interrupts it once and ends its speech AI_CANCELLED", async () => {
        const h = harness();
        await hold(h);
        h.voice.talk(false);
        const connection = h.connection();
        connection.emit({ type: "speaking", on: true });
        await hold(h);
        assert.strictEqual(connection.interrupts, 1);
        assert.deepStrictEqual(of(h, "ai-speech-end"), [{ code: "AI_CANCELLED", params: {} }]);
        // The adapter's own report of the cut-off answer ends nothing twice.
        connection.emit({ type: "speaking", on: false });
        connection.emit({ type: "interrupted" });
        assert.lengthOf(of(h, "ai-speech-end"), 1);
    });

    it("a press while the model is silent interrupts nothing", async () => {
        const h = harness();
        await hold(h);
        h.voice.talk(false);
        await hold(h);
        assert.strictEqual(h.connection().interrupts, 0);
    });

    it("stopSpeech interrupts a live answer", async () => {
        const h = harness();
        await hold(h);
        h.voice.talk(false);
        h.connection().emit({ type: "speaking", on: true });
        h.voice.stopSpeech();
        assert.strictEqual(h.connection().interrupts, 1);
        assert.deepStrictEqual(of(h, "ai-speech-end"), [{ code: "AI_CANCELLED", params: {} }]);
    });
});

describe("a press that cannot be live runs turn by turn and says so", () => {
    it("with a pending approval the press is answered turn by turn and no connection opens", async () => {
        const h = harness();
        h.approvals.push({ id: "r1", gate: "writes" } as unknown as AiApprovalRequest);
        h.voice.talk(true);
        await vi.waitFor(() => {
            assert.lengthOf(h.fake.recognizers, 1, "a recognizer started");
        });
        h.fake.recognizers[0].hear("make it red", true);
        h.voice.talk(false);
        await vi.waitFor(() => {
            assert.deepStrictEqual(h.sent, ["make it red"]);
        });
        assert.lengthOf(h.engine.liveConnections, 0);
        assert.deepStrictEqual(of(h, "ai-voice-start"), [{ mode: "turns" }]);
    });

    it("a pending approval closes the open connection: the conversation hands off", async () => {
        const h = harness();
        await hold(h);
        h.voice.talk(false);
        h.approvals.push({ id: "r1", gate: "writes" } as unknown as AiApprovalRequest);
        h.voice.talk(true);
        await vi.waitFor(() => {
            assert.lengthOf(h.fake.recognizers, 1);
        });
        assert.isTrue(h.connection().closed);
        h.voice.talk(false);
    });

    it("a provider without live: turns, with AI_VOICE_UNAVAILABLE no-provider-live", async () => {
        const h = harness({}, { provider: "anthropic", readiness: "unsupported", engine: undefined });
        h.voice.talk(true);
        await vi.waitFor(() => {
            assert.lengthOf(h.fake.recognizers, 1);
        });
        h.voice.talk(false);
        assert.deepStrictEqual(of(h, "ai-voice-start"), [
            {
                mode: "turns",
                code: "AI_VOICE_UNAVAILABLE",
                params: { path: "input", reason: "no-provider-live" },
            },
        ]);
        assert.lengthOf(h.engine.liveConnections, 0);
    });

    it("a connection that will not open: turns, with the code it failed with", async () => {
        const h = harness();
        h.engine.scriptLive({ code: "AI_KEY_REJECTED", params: { provider: "google" } });
        h.voice.talk(true);
        await vi.waitFor(() => {
            assert.lengthOf(h.fake.recognizers, 1);
        });
        h.voice.talk(false);
        assert.deepStrictEqual(of(h, "ai-voice-start"), [
            { mode: "turns", code: "AI_KEY_REJECTED", params: { provider: "google" } },
        ]);
    });

    it("live is reported in the support, and output off keeps presses turn by turn", async () => {
        const h = harness({ output: "off" });
        const support = await h.voice.support();
        assert.deepStrictEqual(support.live, {
            path: "none",
            status: "unavailable",
            code: "AI_VOICE_UNAVAILABLE",
            params: { path: "input", reason: "output-off" },
            destination: "none",
        });
        const ready = harness();
        assert.deepStrictEqual((await ready.voice.support()).live, {
            path: "provider",
            status: "ready",
            destination: "provider",
        });
    });
});

describe("closing the connection", () => {
    it("dispose closes it, and the held press ends AI_CANCELLED", async () => {
        const h = harness();
        await hold(h);
        h.voice.dispose();
        assert.isTrue(h.connection().closed);
        assert.deepStrictEqual(of(h, "ai-voice-end"), [{ reason: "user", code: "AI_CANCELLED", params: {} }]);
    });

    it("cancel (leaving XR) closes it", async () => {
        const h = harness();
        await hold(h);
        h.voice.talk(false);
        h.voice.cancel();
        assert.isTrue(h.connection().closed);
    });

    it("closes after two idle minutes, and the next press opens another", async () => {
        const h = harness();
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        await hold(h);
        h.voice.talk(false);
        vi.advanceTimersByTime(LIVE_IDLE_MS - 1);
        assert.isFalse(h.connection().closed, "not before two minutes");
        vi.advanceTimersByTime(1);
        assert.isTrue(h.connection().closed);
        await hold(h);
        assert.lengthOf(h.engine.liveConnections, 2);
    });

    it("never closes while talk is held", async () => {
        // No press limit, which would release the press first.
        const h = harness({ maxPressSeconds: Number.POSITIVE_INFINITY });
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        await hold(h);
        vi.advanceTimersByTime(LIVE_IDLE_MS * 2);
        assert.isFalse(h.connection().closed);
    });

    it("a closed event during a press ends it with the code, and the next press reopens", async () => {
        const h = harness();
        await hold(h);
        const params = { provider: "google", cause: "live-closed" };
        h.connection().emit({ type: "closed", code: "AI_PROVIDER_ERROR", params });
        assert.deepStrictEqual(of(h, "ai-voice-end"), [{ reason: "error", code: "AI_PROVIDER_ERROR", params }]);
        h.voice.talk(false);
        assert.lengthOf(of(h, "ai-voice-end"), 1, "the release ends nothing more");
        await hold(h);
        assert.lengthOf(h.engine.liveConnections, 2);
    });

    it("go_away between presses closes quietly, and the next press reopens", async () => {
        const h = harness();
        await hold(h);
        h.voice.talk(false);
        h.connection().emit({ type: "closed", code: "AI_COMPLETED", params: {} });
        await flushMicrotasks();
        assert.lengthOf(of(h, "ai-voice-end"), 1);
        await hold(h);
        assert.lengthOf(h.engine.liveConnections, 2);
    });
});

describe("a spoken message on the connection", () => {
    /**
     * Speak a request whose message stays running (its tools, in the real loop) until `end` is called.
     * @param h - The harness.
     * @returns Ends the message.
     */
    async function running(h: Harness): Promise<() => void> {
        const end = h.block();
        await hold(h);
        h.voice.talk(false);
        h.connection().emit({ type: "reader-transcript", text: "make the servers red", final: true });
        h.connection().emit({
            type: "tool-calls",
            calls: [{ id: "c1", name: "style", arguments: {} }],
        });
        await vi.waitFor(() => {
            assert.deepStrictEqual(h.sent, ["make the servers red"]);
        });
        return end;
    }

    it("a press while it still runs its tools is heard turn by turn, says live-busy, and is sent as a message of its own", async () => {
        const h = harness();
        const end = await running(h);
        h.voice.talk(true);
        await vi.waitFor(() => {
            assert.lengthOf(h.fake.recognizers, 1, "the press listens turn by turn");
        });
        h.fake.recognizers[0].hear("and make them bigger", true);
        h.voice.talk(false);
        await vi.waitFor(() => {
            assert.deepStrictEqual(h.sent, ["make the servers red", "and make them bigger"]);
        });
        assert.deepStrictEqual(of(h, "ai-voice-start").at(-1), {
            mode: "turns",
            code: "AI_VOICE_UNAVAILABLE",
            params: { path: "input", reason: "live-busy" },
        });
        assert.lengthOf(h.connection().captures.filter(Boolean), 1, "the microphone never reached the connection");
        end();
    });

    it("never closes for being idle while it runs, and its end starts the idle time over", async () => {
        const h = harness();
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const end = await running(h);
        vi.advanceTimersByTime(LIVE_IDLE_MS * 3 - 1000);
        assert.isFalse(h.connection().closed, "a long batch is not idleness");
        end();
        await flushMicrotasks();
        vi.advanceTimersByTime(LIVE_IDLE_MS - 1);
        assert.isFalse(h.connection().closed, "the idle time counts from the message's end");
        vi.advanceTimersByTime(1);
        assert.isTrue(h.connection().closed);
    });
});

describe("the connection's lifetime is the consumer's", () => {
    it("liveIdleSeconds sets the idle close", async () => {
        const h = harness({ liveIdleSeconds: 10 });
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        await hold(h);
        h.voice.talk(false);
        vi.advanceTimersByTime(9_999);
        assert.isFalse(h.connection().closed);
        vi.advanceTimersByTime(1);
        assert.isTrue(h.connection().closed);
    });

    it("endLiveConversation closes it, and the next press opens another", async () => {
        const h = harness();
        await hold(h);
        h.voice.talk(false);
        h.voice.endLiveConversation();
        assert.isTrue(h.connection().closed);
        await hold(h);
        assert.lengthOf(h.engine.liveConnections, 2);
    });

    it("a conversation the connection no longer knows closes it, and the next press opens another", async () => {
        const h = harness();
        await hold(h);
        h.voice.talk(false);
        h.stale();
        assert.isTrue(h.connection().closed);
        await hold(h);
        assert.lengthOf(h.engine.liveConnections, 2);
    });
});
