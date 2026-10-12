/**
 * Live conversations through the provider-API engine: the real TanStack realtime adapters (with
 * graphty's two patches) over a fake page -- `fetch`, an `RTCPeerConnection` and data channel, a
 * `WebSocket` and an audio stack (test/helpers/fake-live-transport.ts). No network.
 * @module test/ai/engine/live.test
 */

import { afterEach, assert, describe, it, vi } from "vitest";
import { z } from "zod";

import { ProviderApiEngine } from "../../../src/ai/engine/ProviderApiEngine";
import type {
    LiveConnection,
    LiveEvent,
    LiveOpened,
    LiveToolResult,
    ProviderApiId,
    ToolSpec,
} from "../../../src/ai/engine/types";
import { installFakeLiveTransport } from "../../helpers/fake-live-transport";

const KEYS = {
    openai: "sk-proj-graphtyLiveTestKey0000000000000000",
    google: "AIzaSyGraphtyLiveTestKey000000000000000",
    anthropic: "sk-ant-graphtyLiveTestKey000000000000000",
} as const;
const OPENAI_TOKEN = "ek_graphtyEphemeral";
const GOOGLE_TOKEN = "auth_tokens/graphtyEphemeral";
/** Anything shaped like a provider key. */
const KEY_SHAPED = /sk-(?:proj-|ant-)?[\w-]{16,}|AIza[\w-]{20,}/;

const TOOLS: ToolSpec[] = [
    {
        name: "style_nodes",
        description: "Color nodes.",
        schema: z.object({ color: z.string() }),
        jsonSchema: { type: "object", properties: { color: { type: "string" } }, required: ["color"] },
    },
    {
        name: "undo",
        description: "Undo the last change.",
        schema: z.object({}),
        jsonSchema: { type: "object", properties: {} },
    },
];
const INSTRUCTIONS = "You are the graph's assistant.";

/** One request the page sent. */
interface Sent {
    url: string;
    headers: Record<string, string>;
    body: string;
}

/** What a case can script: the status of the token request. */
interface Network {
    readonly sent: Sent[];
    tokenStatus: number;
}

/**
 * Stub `fetch` with the providers' token and SDP endpoints.
 * @returns The record.
 */
function installNetwork(): Network {
    const network: Network = { sent: [], tokenStatus: 200 };
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input instanceof Request ? input.url : input);
        network.sent.push({
            url,
            headers: Object.fromEntries(new Headers(init?.headers).entries()),
            body: typeof init?.body === "string" ? init.body : "",
        });
        const isToken = url.endsWith("/client_secrets") || url.endsWith("/auth_tokens");
        if (isToken && network.tokenStatus !== 200) {
            return Promise.resolve(
                new Response(JSON.stringify({ error: { message: "refused" } }), { status: network.tokenStatus }),
            );
        }

        if (url.endsWith("/client_secrets")) {
            return Promise.resolve(
                Response.json({ value: OPENAI_TOKEN, expires_at: 2_000_000_000, session: { type: "realtime" } }),
            );
        }

        if (url.endsWith("/auth_tokens")) {
            return Promise.resolve(Response.json({ name: GOOGLE_TOKEN }));
        }

        if (url.endsWith("/v1/realtime/calls")) {
            return Promise.resolve(new Response("v=0 provider-answer", { status: 200 }));
        }

        return Promise.resolve(new Response("not found", { status: 404 }));
    });
    return network;
}

/**
 * The engine for a provider, with the test key.
 * @param provider - The provider.
 * @param baseUrl - A custom base URL.
 * @returns The engine.
 */
function engine(provider: ProviderApiId, baseUrl?: string): ProviderApiEngine {
    return new ProviderApiEngine(() => ({
        provider,
        apiKey: KEYS[provider],
        model: "chat-model",
        ...(baseUrl !== undefined && { baseUrl }),
    }));
}

/** An open connection and every event it emitted. */
interface Opened {
    readonly connection: LiveConnection;
    readonly events: LiveEvent[];
}

/**
 * Open a live connection and record its events.
 * @param provider - The provider.
 * @param language - The language spoken.
 * @returns The connection.
 */
async function open(provider: "openai" | "google", language?: string): Promise<Opened> {
    const opened = await engine(provider).openLive?.(
        { instructions: INSTRUCTIONS, tools: TOOLS, ...(language !== undefined && { language }) },
        new AbortController().signal,
    );
    assert.strictEqual(opened?.code, "AI_COMPLETED", JSON.stringify(opened));
    const { connection } = opened as Extract<LiveOpened, { code: "AI_COMPLETED" }>;
    const events: LiveEvent[] = [];
    connection.on((event) => events.push(event));
    return { connection, events };
}

/**
 * A tool result as the loop saves it.
 * @param callId - The call.
 * @param content - What the model reads.
 * @returns The part.
 */
function result(callId: string, content: string): LiveToolResult {
    return { type: "tool-result", origin: "graph-data", callId, code: "AI_COMPLETED", params: {}, content };
}

/** Let queued microtasks and promise callbacks run. */
async function settle(): Promise<void> {
    for (let i = 0; i < 5; i++) {
        await Promise.resolve();
    }
}

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("live on each provider", () => {
    it("opens only where the catalog lists live: Anthropic has no openLive member", () => {
        assert.isFalse("openLive" in engine("anthropic"));
        assert.isTrue("openLive" in engine("openai"));
        assert.isTrue("openLive" in engine("google"));
    });

    it("refuses a custom base URL before any request: the realtime adapters reach only the provider's host", async () => {
        const network = installNetwork();
        installFakeLiveTransport();
        const opened = await engine("google", "https://proxy.example/v1beta").openLive?.(
            { instructions: INSTRUCTIONS, tools: [] },
            new AbortController().signal,
        );
        assert.deepEqual(opened, {
            code: "AI_VOICE_UNAVAILABLE",
            params: { path: "input", reason: "live-custom-base-url" },
        });
        assert.lengthOf(network.sent, 0);
    });

    it("answers a cancelled opening with AI_CANCELLED", async () => {
        installNetwork();
        installFakeLiveTransport();
        const controller = new AbortController();
        controller.abort();
        const opened = await engine("openai").openLive?.({ instructions: INSTRUCTIONS, tools: [] }, controller.signal);
        assert.strictEqual(opened?.code, "AI_CANCELLED");
    });

    for (const provider of ["openai", "google"] as const) {
        it(`${provider}: a refused key on the token request is AI_KEY_REJECTED; another status is AI_PROVIDER_ERROR`, async () => {
            const network = installNetwork();
            installFakeLiveTransport();
            network.tokenStatus = 401;
            const rejected = await engine(provider).openLive?.(
                { instructions: INSTRUCTIONS, tools: [] },
                new AbortController().signal,
            );
            assert.deepEqual(rejected, { code: "AI_KEY_REJECTED", params: { provider, status: 401 } });

            network.tokenStatus = 503;
            const failed = await engine(provider).openLive?.(
                { instructions: INSTRUCTIONS, tools: [] },
                new AbortController().signal,
            );
            assert.deepEqual(failed, { code: "AI_PROVIDER_ERROR", params: { provider, status: 503 } });
        });
    }
});

describe("OpenAI live (WebRTC)", () => {
    it("mints a token with the key as bearer and the model in the body, and sends the SDP with the token, never the key", async () => {
        const network = installNetwork();
        installFakeLiveTransport();
        await open("openai");
        const [token, sdp] = network.sent;
        assert.strictEqual(token.url, "https://api.openai.com/v1/realtime/client_secrets");
        assert.strictEqual(token.headers.authorization, `Bearer ${KEYS.openai}`);
        assert.deepEqual(JSON.parse(token.body), { session: { type: "realtime", model: "gpt-realtime-2.1" } });
        assert.strictEqual(sdp.url, "https://api.openai.com/v1/realtime/calls");
        assert.strictEqual(sdp.headers.authorization, `Bearer ${OPENAI_TOKEN}`);
        assert.notInclude(JSON.stringify(sdp), KEYS.openai);
    });

    it("configures the session once, with every tool's schema and the instructions, after the microphone is off", async () => {
        installNetwork();
        const transport = installFakeLiveTransport();
        await open("openai");
        const { channel } = transport.peers[0];
        const updates = channel.sent.filter((s) => s.event.type === "session.update");
        assert.lengthOf(updates, 1);
        const session = updates[0].event.session as Record<string, unknown>;
        assert.strictEqual(session.instructions, INSTRUCTIONS);
        assert.deepEqual(
            session.tools,
            TOOLS.map((t) => ({
                type: "function",
                name: t.name,
                description: t.description,
                parameters: t.jsonSchema,
            })),
        );
        assert.deepEqual(
            (session.audio as { input: { turn_detection: { type: string } } }).input.turn_detection.type,
            "server_vad",
        );
        assert.deepEqual(
            updates[0].micEnabled,
            [false],
            "the microphone track is disabled before the session is configured",
        );
    });

    it("hands over a response's two calls in one event, in order, and asks for one response after both results", async () => {
        installNetwork();
        const transport = installFakeLiveTransport();
        const { connection, events } = await open("openai");
        const { channel } = transport.peers[0];
        const calls = [
            { call_id: "c1", name: "style_nodes", arguments: '{"color":"red"}' },
            { call_id: "c2", name: "undo", arguments: "{}" },
        ];
        channel.receive({ type: "response.created", response: { id: "r1" } });
        for (const call of calls) {
            channel.receive({ type: "response.function_call_arguments.done", ...call });
        }

        channel.receive({
            type: "response.done",
            response: { id: "r1", output: calls.map((c) => ({ type: "function_call", ...c })) },
        });
        assert.deepEqual(
            events.filter((e) => e.type === "tool-calls" || e.type === "response-end"),
            [
                {
                    type: "tool-calls",
                    calls: [
                        { id: "c1", name: "style_nodes", arguments: { color: "red" } },
                        { id: "c2", name: "undo", arguments: {} },
                    ],
                },
                { type: "response-end" },
            ],
        );

        const before = channel.sentOf("response.create").length;
        connection.sendToolResults([result("c1", '{"ok":true}'), result("c2", '{"ok":true}')]);
        const after = channel.sent.slice(-3).map((s) => s.event);
        assert.deepEqual(
            after.map((e) => e.type),
            ["conversation.item.create", "conversation.item.create", "response.create"],
            "one response.create, after the last result",
        );
        assert.strictEqual(channel.sentOf("response.create").length, before + 1);
        assert.include((after[0].item as { output: string }).output, "<graph-data>");
    });

    it("maps transcripts, speaking and interruption", async () => {
        installNetwork();
        const transport = installFakeLiveTransport();
        const { connection, events } = await open("openai");
        const { channel } = transport.peers[0];
        channel.receive({ type: "conversation.item.input_audio_transcription.completed", transcript: "make n3 red" });
        channel.receive({ type: "response.created", response: { id: "r2" } });
        channel.receive({ type: "response.output_item.added", item: { type: "message", id: "m1" } });
        channel.receive({ type: "response.output_audio.delta", delta: "AAAA" });
        channel.receive({ type: "response.output_audio_transcript.delta", delta: "Done, " });
        channel.receive({ type: "response.output_audio_transcript.delta", delta: "n3 is red." });
        channel.receive({ type: "response.output_audio_transcript.done", transcript: "Done, n3 is red." });
        connection.interrupt();
        assert.deepEqual(events, [
            { type: "reader-transcript", text: "make n3 red", final: true },
            { type: "speaking", on: true },
            { type: "answer-text", delta: "Done, " },
            { type: "answer-text", delta: "n3 is red." },
            { type: "speaking", on: false },
            { type: "interrupted" },
        ]);
        assert.lengthOf(channel.sentOf("response.cancel"), 1);
    });

    it("reports a channel the provider closed as closed with the code, and nothing after", async () => {
        installNetwork();
        const transport = installFakeLiveTransport();
        const { events } = await open("openai");
        transport.peers[0].channel.lose();
        transport.peers[0].channel.lose();
        assert.deepEqual(events, [
            { type: "closed", code: "AI_PROVIDER_ERROR", params: { provider: "openai", cause: "live-closed" } },
        ]);
        await settle();
        assert.isTrue(transport.peers[0].closed, "the peer connection is closed");
        assert.isTrue(transport.tracks.every((t) => t.readyState === "ended"));
    });

    it("close() stops every track, closes the peer, the channel and the audio context, and leaves no timer", async () => {
        installNetwork();
        const transport = installFakeLiveTransport();
        const { connection, events } = await open("openai");
        vi.useFakeTimers({ toFake: ["setTimeout", "setInterval"] });
        connection.close();
        await settle();
        assert.isTrue(transport.tracks.every((t) => t.readyState === "ended"));
        assert.isTrue(transport.peers[0].closed);
        assert.strictEqual(transport.peers[0].channel.readyState, "closed");
        assert.isTrue(transport.contexts.every((c) => c.state === "closed"));
        assert.strictEqual(vi.getTimerCount(), 0);
        transport.peers[0].channel.lose();
        assert.deepEqual(events, [], "close() emits nothing, and nothing follows it");
        connection.capture(true);
        assert.isFalse(transport.tracks[0].enabled, "a closed connection does nothing");
    });

    it("turns the microphone on only while talk is held", async () => {
        installNetwork();
        const transport = installFakeLiveTransport();
        const { connection } = await open("openai");
        assert.isFalse(transport.tracks[0].enabled);
        connection.capture(true);
        assert.isTrue(transport.tracks[0].enabled);
        connection.capture(false);
        assert.isFalse(transport.tracks[0].enabled);
    });
});

describe("Gemini live (WebSocket)", () => {
    it("mints a token with the key only in x-goog-api-key, and the socket URL carries only the token", async () => {
        const network = installNetwork();
        const transport = installFakeLiveTransport();
        await open("google");
        const [token] = network.sent;
        assert.strictEqual(token.url, "https://generativelanguage.googleapis.com/v1alpha/auth_tokens");
        assert.strictEqual(token.headers["x-goog-api-key"], KEYS.google);
        assert.isUndefined(token.headers.authorization);
        assert.strictEqual((JSON.parse(token.body) as { uses: number }).uses, 1);
        const url = new URL(transport.sockets[0].url);
        assert.strictEqual(url.searchParams.get("access_token"), GOOGLE_TOKEN);
        assert.notInclude(transport.sockets[0].url, KEYS.google);
    });

    it("sends one setup with every tool's schema, the instructions, transcription and the language, after the microphone is off", async () => {
        installNetwork();
        const transport = installFakeLiveTransport();
        await open("google", "en-US");
        const socket = transport.sockets[0];
        assert.lengthOf(socket.sentWith("setup"), 1);
        assert.strictEqual(socket.sent[0].message.setup !== undefined, true, "the setup is the first message");
        const setup = socket.sent[0].message.setup as Record<string, unknown>;
        assert.strictEqual(setup.model, "models/gemini-3.8-live");
        assert.deepEqual(setup.systemInstruction, { parts: [{ text: INSTRUCTIONS }] });
        assert.deepEqual(
            (setup.tools as { functionDeclarations: unknown[] }[])[0].functionDeclarations,
            TOOLS.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.jsonSchema })),
        );
        assert.notProperty(setup, "proactivity", "no proactivity field the live model refuses");
        assert.deepEqual(setup.inputAudioTranscription, {});
        assert.deepEqual(setup.outputAudioTranscription, {});
        assert.strictEqual(
            (setup.generationConfig as { speechConfig: { languageCode: string } }).speechConfig.languageCode,
            "en-US",
        );
        assert.deepEqual(socket.sent[0].micEnabled, [false], "the microphone track is disabled before the setup");
    });

    it("streams audio only while talk is held, and on release pads the turn detector's silence and sends one audioStreamEnd", async () => {
        installNetwork();
        const transport = installFakeLiveTransport();
        const { connection } = await open("google");
        const socket = transport.sockets[0];
        const audio = (): string[] =>
            socket.sentWith("realtimeInput").flatMap((m) => {
                const data = (m.realtimeInput as { audio?: { data: string } }).audio?.data;
                return data === undefined ? [] : [data];
            });
        const spoken = (): number => audio().filter((data) => !/^A+=*$/.test(data)).length;
        const ends = (): number =>
            socket
                .sentWith("realtimeInput")
                .filter((m) => (m.realtimeInput as { audioStreamEnd?: boolean }).audioStreamEnd === true).length;
        const tone = new Float32Array(1024).fill(0.25);

        transport.speak(tone);
        assert.strictEqual(audio().length, 0, "nothing is sent before talk is held");
        assert.strictEqual(ends(), 0, "no stream end while the session was being set up");
        connection.capture(true);
        await settle();
        transport.speak(tone);
        assert.strictEqual(spoken(), 2, "two frames while held");
        connection.capture(false);
        transport.speak(tone);
        assert.strictEqual(spoken(), 2, "nothing spoken is sent after release");
        // The setup's silenceDurationMs (2,000 ms) at 16 kHz, in 512-sample frames.
        assert.strictEqual(audio().length - spoken(), Math.ceil((2000 * 16) / 512), "the release pads 2 s of silence");
        assert.strictEqual(ends(), 1, "one audioStreamEnd on release");
        const last = socket.sent.at(-1)?.message.realtimeInput as { audioStreamEnd?: boolean };
        assert.isTrue(last.audioStreamEnd, "the stream end comes after the silence");
    });

    it("hands over a message's calls as one response, sends the results, and maps transcripts and usage", async () => {
        installNetwork();
        const transport = installFakeLiveTransport();
        const { connection, events } = await open("google");
        const socket = transport.sockets[0];
        socket.receive({ serverContent: { inputTranscription: { text: "make all " } } });
        socket.receive({ serverContent: { inputTranscription: { text: "the nodes red" } } });
        socket.receive({
            toolCall: {
                functionCalls: [
                    { id: "g1", name: "style_nodes", args: { color: "red" } },
                    { id: "g2", name: "undo", args: {} },
                ],
            },
        });
        await settle();
        connection.sendToolResults([result("g1", '{"ok":true}'), result("g2", '{"ok":true}')]);
        socket.receive({ serverContent: { outputTranscription: { text: "All " } } });
        socket.receive({ serverContent: { outputTranscription: { text: "red." } } });
        socket.receive({ usageMetadata: { promptTokenCount: 40, responseTokenCount: 7, totalTokenCount: 47 } });
        socket.receive({ serverContent: { turnComplete: true } });
        assert.deepEqual(events, [
            { type: "reader-transcript", text: "make all ", final: false },
            { type: "reader-transcript", text: "make all the nodes red", final: false },
            { type: "reader-transcript", text: "make all the nodes red", final: true },
            {
                type: "tool-calls",
                calls: [
                    { id: "g1", name: "style_nodes", arguments: { color: "red" } },
                    { id: "g2", name: "undo", arguments: {} },
                ],
            },
            { type: "response-end" },
            { type: "answer-text", delta: "All " },
            { type: "answer-text", delta: "red." },
            { type: "usage", inputTokens: 40, outputTokens: 7 },
            { type: "response-end" },
        ]);
        const responses = socket
            .sentWith("toolResponse")
            .map((m) => (m.toolResponse as { functionResponses: { id: string }[] }).functionResponses[0].id);
        assert.deepEqual(responses, ["g1", "g2"]);
    });

    it("reports a socket the provider closed, and a go-away, as closed with their codes", async () => {
        installNetwork();
        let transport = installFakeLiveTransport();
        const lost = await open("google");
        transport.sockets[0].lose();
        assert.deepEqual(lost.events, [
            { type: "closed", code: "AI_PROVIDER_ERROR", params: { provider: "google", cause: "live-closed" } },
        ]);
        vi.unstubAllGlobals();

        installNetwork();
        transport = installFakeLiveTransport();
        const ending = await open("google");
        transport.sockets[0].receive({ goAway: { timeLeft: "10s" } });
        assert.deepEqual(ending.events, [{ type: "closed", code: "AI_COMPLETED", params: {} }]);
        assert.strictEqual(transport.sockets[0].readyState, 3, "graphty closed the socket");
    });

    it("close() stops every track, closes the socket and both audio contexts, and leaves no timer", async () => {
        installNetwork();
        const transport = installFakeLiveTransport();
        const { connection } = await open("google");
        vi.useFakeTimers({ toFake: ["setTimeout", "setInterval"] });
        connection.close();
        await settle();
        assert.isTrue(transport.tracks.every((t) => t.readyState === "ended"));
        assert.strictEqual(transport.sockets[0].readyState, 3);
        assert.lengthOf(transport.contexts, 2, "capture and playback");
        assert.isTrue(transport.contexts.every((c) => c.state === "closed"));
        assert.strictEqual(vi.getTimerCount(), 0);
    });

    it("reports a refused microphone as AI_VOICE_UNAVAILABLE permission-denied", async () => {
        installNetwork();
        const transport = installFakeLiveTransport();
        transport.microphoneError = new DOMException("Permission denied", "NotAllowedError");
        const opened = await engine("google").openLive?.(
            { instructions: INSTRUCTIONS, tools: [] },
            new AbortController().signal,
        );
        assert.deepEqual(opened, {
            code: "AI_VOICE_UNAVAILABLE",
            params: { path: "input", reason: "permission-denied" },
        });
        assert.strictEqual(transport.sockets[0].readyState, 3, "the socket opened for it is closed");
    });

    it("refuses an opening whose setup the provider never takes", async () => {
        installNetwork();
        const transport = installFakeLiveTransport();
        transport.answerSetup = false;
        const opening = engine("google").openLive?.(
            { instructions: INSTRUCTIONS, tools: [] },
            new AbortController().signal,
        );
        await vi.waitFor(() => {
            assert.lengthOf(transport.sockets[0]?.sentWith("setup") ?? [], 1);
        });
        transport.sockets[0].lose();
        assert.deepEqual(await opening, {
            code: "AI_PROVIDER_ERROR",
            params: { provider: "google", cause: "live-closed" },
        });
    });
});

describe("the key stays in the page", () => {
    it("no URL, event, params or outcome carries anything shaped like a key", async () => {
        const seen: unknown[] = [];
        for (const provider of ["openai", "google"] as const) {
            const network = installNetwork();
            const transport = installFakeLiveTransport();
            const { connection, events } = await open(provider);
            if (provider === "openai") {
                transport.peers[0].channel.receive({ type: "error", error: { message: "bad" } });
                transport.peers[0].channel.lose();
            } else {
                transport.sockets[0].lose();
            }

            network.tokenStatus = 401;
            seen.push(
                await engine(provider).openLive?.({ instructions: "", tools: [] }, new AbortController().signal),
                network.sent.slice(1).map((s) => s),
                network.sent.map((s) => s.url),
                transport.sockets.map((s) => s.url),
                transport.sockets.map((s) => s.sent),
                transport.peers.map((p) => p.channel.sent),
                events,
            );
            connection.close();
            vi.unstubAllGlobals();
        }

        const text = JSON.stringify(seen);
        assert.notMatch(text.replace(/"(?:authorization|x-goog-api-key)":"[^"]*"/g, ""), KEY_SHAPED);
    });
});
