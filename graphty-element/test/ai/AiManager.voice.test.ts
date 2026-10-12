/**
 * @file `AiManager.talk` on fakes: without `voice` a press only ends with `AI_NOT_ENABLED`; with
 * it a press sends one spoken command; a transcription provider other than the chat's is reached
 * with its own key from `apiKeys` (an Anthropic reader's speech through OpenAI), and a missing key
 * is `AI_VOICE_UNAVAILABLE` `no-key`; dispose closes the microphone.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { type AiManagerConfig, createAiManager, NO_VOICE_SUPPORT } from "../../src/ai/AiManager";
import { FakeEngine } from "../../src/ai/engine/FakeEngine";
import { registerProviderApiEngine } from "../../src/ai/engine/load";
import { createProvider } from "../../src/ai/providers";
import type { Graph } from "../../src/Graph";
import { assistantSession, textTurn } from "../helpers/assistant";
import { type FakeSpeech, flushMicrotasks, installFakeSpeech } from "../helpers/fake-speech";
import { HOSTS, KEYS, providerApiFixture, TRANSCRIPT } from "./engine/providerApiFixtures";

// The key store's encryption library reads a browser global at load; no case persists a key.
vi.mock("encrypt-storage", () => ({ EncryptStorage: vi.fn() }));

afterEach(() => {
    vi.unstubAllGlobals();
});

/**
 * The ceiling for a wait that crosses the first load of the provider's voice adapter (the
 * TanStack chunk and the vendor SDK): measured at about 0.25 s alone and 1.25 s while the whole
 * default suite runs, past `vi.waitFor`'s default of 1 s. Each wait still returns as soon as its
 * condition holds.
 */
const COLD_LOAD = { timeout: 10_000 };

/** What a manager's graph emitted, as `[type, detail]`. */
type Emitted = [string, Record<string, unknown>][];

/**
 * A manager over a stand-in graph whose chat runs on a scripted engine.
 * @param config - The configuration, besides the provider.
 * @param provider - The chat provider.
 * @param scripted - Run the provider on the scripted engine (default); false, on its own.
 * @returns The manager, its chat engine and what it emitted.
 */
async function manager(
    config: Omit<AiManagerConfig, "provider">,
    provider: "anthropic" | "mock" = "mock",
    scripted = true,
): Promise<{ ai: ReturnType<typeof createAiManager>; chat: FakeEngine; emitted: Emitted }> {
    const session = await assistantSession();
    const emitted: Emitted = [];
    const graph = {
        getSession: () => session,
        eventManager: {
            emit: (type: string, detail: Record<string, unknown>) => emitted.push([type, detail]),
            addListener: () => Symbol("listener"),
            removeListener: () => undefined,
        },
        getDataManager: () => ({ nodes: new Map(), edges: new Map() }),
        getNodeCount: () => 0,
        getEdgeCount: () => 0,
        getXRSessionManager: () => undefined,
    } as unknown as Graph;
    const chat = new FakeEngine();
    const instance = createProvider(provider);
    if (scripted) {
        registerProviderApiEngine(instance, () => chat);
    }

    const ai = createAiManager();
    ai.init(graph, { ...config, provider, providerInstance: instance });
    return { ai, chat, emitted };
}

/**
 * The details of one type of emitted event.
 * @param emitted - What was emitted.
 * @param type - The type.
 * @returns The details.
 */
function of(emitted: Emitted, type: string): Record<string, unknown>[] {
    return emitted.flatMap(([t, detail]) => (t === type ? [detail] : []));
}

/**
 * The text of the reader's message in the chat's first request.
 * @param chat - The chat engine.
 * @returns Its text parts, joined.
 */
function sent(chat: FakeEngine): string {
    const parts = chat.requests[0]?.messages.at(-1)?.parts ?? [];
    return parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
}

describe("without voice", () => {
    it("a press only ends with AI_NOT_ENABLED, and nothing listens", async () => {
        const fake = installFakeSpeech();
        const { ai, emitted } = await manager({});
        ai.talk(true);
        ai.talk(false);
        ai.stopSpeech();
        await flushMicrotasks();
        assert.deepStrictEqual(emitted, [["ai-voice-end", { reason: "error", code: "AI_NOT_ENABLED", params: {} }]]);
        assert.strictEqual(fake.microphoneOpens, 0);
        assert.strictEqual(fake.recognizers.length, 0);
        assert.strictEqual(await ai.getVoiceSupport(), NO_VOICE_SUPPORT);
    });
});

describe("with voice", () => {
    /**
     * Hold talk, have the browser's recognizer hear a text, and release.
     * @param ai - The manager.
     * @param fake - The page's speech.
     * @param text - What is heard.
     */
    async function speak(ai: ReturnType<typeof createAiManager>, fake: FakeSpeech, text: string): Promise<void> {
        ai.talk(true);
        await vi.waitFor(() => {
            assert.strictEqual(fake.recognizers.length, 1);
        });
        fake.recognizers[0].hear(text, true);
        ai.talk(false);
    }

    it("a press sends what was heard as one spoken command", async () => {
        const fake = installFakeSpeech();
        const { ai, chat, emitted } = await manager({ voice: {} });
        chat.push(textTurn("Five nodes."));
        await speak(ai, fake, "how many nodes");
        await vi.waitFor(() => {
            assert.strictEqual(chat.requests.length, 1);
        });
        assert.isTrue(sent(chat).includes("how many nodes"), "the command carries what was heard");
        assert.deepStrictEqual(of(emitted, "ai-voice-end"), [{ reason: "user", code: "AI_COMPLETED", params: {} }]);
        assert.strictEqual(fake.liveTracks(), 0);
    });

    it("dispose closes the microphone while talk is held", async () => {
        const fake = installFakeSpeech();
        const { ai } = await manager({ voice: {} });
        ai.talk(true);
        await vi.waitFor(() => {
            assert.strictEqual(fake.liveTracks(), 1);
        });
        ai.dispose();
        await vi.waitFor(() => {
            assert.strictEqual(fake.liveTracks(), 0);
        });
    });
});

describe("transcription through another provider", () => {
    it("an Anthropic reader's speech goes to OpenAI with apiKeys.openai, never to Anthropic", async () => {
        const fake = installFakeSpeech();
        const { requests } = providerApiFixture("openai");
        const { ai, chat } = await manager(
            { voice: { input: "provider", transcription: { provider: "openai" } }, apiKeys: { openai: KEYS.openai } },
            "anthropic",
        );
        chat.push(textTurn("Done."));

        ai.talk(true);
        await vi.waitFor(() => {
            assert.strictEqual(fake.recorders.length, 1);
        });
        ai.talk(false);

        await vi.waitFor(() => {
            assert.strictEqual(chat.requests.length, 1);
        }, COLD_LOAD);
        assert.isTrue(sent(chat).includes(TRANSCRIPT), "the command carries what was heard");
        assert.deepStrictEqual(
            requests.map((request) => [new URL(request.url).host, new URL(request.url).pathname]),
            [[HOSTS.openai, "/v1/audio/transcriptions"]],
        );
        assert.strictEqual(requests[0].headers.authorization, `Bearer ${KEYS.openai}`);
        assert.isFalse(
            requests.some((request) => new URL(request.url).host === HOSTS.anthropic),
            "no audio went to Anthropic",
        );
    });

    it("with no key for it, a press ends AI_VOICE_UNAVAILABLE no-key and opens no microphone", async () => {
        const fake = installFakeSpeech({ recognition: "absent" });
        const { ai, emitted } = await manager({ voice: { transcription: { provider: "openai" } } }, "anthropic");
        ai.talk(true);
        await vi.waitFor(() => {
            assert.deepStrictEqual(of(emitted, "ai-voice-end"), [
                {
                    reason: "error",
                    code: "AI_VOICE_UNAVAILABLE",
                    params: { path: "input", reason: "no-key" },
                },
            ]);
        });
        assert.strictEqual(fake.microphoneOpens, 0);
        assert.lengthOf(of(emitted, "ai-voice-start"), 0);
    });
});

describe("live voice", () => {
    it("Anthropic has no live API: a live press runs turn by turn and says why", async () => {
        const fake = installFakeSpeech();
        const { ai, emitted } = await manager({ voice: { mode: "live" } }, "anthropic", false);
        ai.talk(true);
        await vi.waitFor(() => {
            assert.strictEqual(fake.recognizers.length, 1, "the browser's recognizer listens");
        });
        ai.talk(false);
        assert.deepStrictEqual(of(emitted, "ai-voice-start"), [
            { mode: "turns", code: "AI_VOICE_UNAVAILABLE", params: { path: "input", reason: "no-provider-live" } },
        ]);
        assert.strictEqual((await ai.getVoiceSupport()).live?.params?.reason, "no-provider-live");
    });

    it("dispose (disableAiControl) closes the live connection held open", async () => {
        installFakeSpeech();
        vi.stubGlobal("AudioWorkletNode", function AudioWorkletNode() {});
        const { ai, chat } = await manager({ voice: { mode: "live" } });
        chat.scriptLive();
        ai.talk(true);
        await vi.waitFor(() => {
            assert.deepStrictEqual(chat.liveConnections[0]?.captures, [true], "the press is live");
        });
        ai.dispose();
        await vi.waitFor(() => {
            assert.isTrue(chat.liveConnections[0].closed);
        });
    });
});
