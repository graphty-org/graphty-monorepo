/**
 * @file Live voice in a real page: the Gemini realtime adapter with its real audio worklets and
 * Chromium's fake microphone (vitest.config.ts), behind a talk button held for real, by the mouse
 * and by Space. Only the network is faked: the token request and Gemini's socket, which answers
 * the setup and records what the page sends. The microphone's audio reaches the socket only while
 * talk is held, release ends the reader's turn once (`audioStreamEnd`), and disabling the
 * assistant stops the microphone.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../../index.js";
import { press, release } from "../../helpers/real-input";

const GEMINI_SOCKET = "wss://generativelanguage.googleapis.com/";
const TOKENS = "https://generativelanguage.googleapis.com/v1alpha/auth_tokens";
/** The capture worklet's rate (16 kHz). */
const CAPTURE_RATE = 16_000;

/** Gemini's socket, faked: it answers the setup and keeps every message the page sends. */
class FakeGeminiSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readyState = FakeGeminiSocket.CONNECTING;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    onclose: (() => void) | null = null;
    readonly sent: Record<string, unknown>[] = [];

    constructor(readonly url: string) {
        sockets.push(this);
        queueMicrotask(() => {
            this.readyState = FakeGeminiSocket.OPEN;
            this.onopen?.();
        });
    }

    send(data: string): void {
        const message = JSON.parse(data) as Record<string, unknown>;
        this.sent.push(message);
        if ("setup" in message) {
            queueMicrotask(() => {
                this.onmessage?.({ data: JSON.stringify({ setupComplete: {} }) });
            });
        }
    }

    close(): void {
        this.readyState = FakeGeminiSocket.CLOSED;
    }

    /**
     * The audio frames sent.
     * @returns How many.
     */
    audioFrames(): number {
        return this.realtime().filter((input) => "audio" in input).length;
    }

    /**
     * The `realtimeInput` messages' bodies, in order.
     * @returns Them.
     */
    realtime(): Record<string, unknown>[] {
        return this.sent.flatMap((message) =>
            "realtimeInput" in message ? [message.realtimeInput as Record<string, unknown>] : [],
        );
    }
}

let element: Graphty;
let talk: HTMLButtonElement;
let sockets: FakeGeminiSocket[];
let streams: MediaStream[];
let contexts: AudioContext[];
let starts: unknown[];

beforeEach(async () => {
    sockets = [];
    streams = [];
    contexts = [];
    starts = [];
    const RealSocket = WebSocket;
    vi.stubGlobal(
        "WebSocket",
        Object.assign(
            function PageSocket(url: string | URL, protocols?: string | string[]): unknown {
                return String(url).startsWith(GEMINI_SOCKET)
                    ? new FakeGeminiSocket(String(url))
                    : new RealSocket(url, protocols);
            },
            { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 },
        ),
    );
    const realFetch = globalThis.fetch.bind(globalThis);
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
        String(input instanceof Request ? input.url : input) === TOKENS
            ? Promise.resolve(Response.json({ name: "auth_tokens/page-test" }))
            : realFetch(input, init),
    );
    const RealContext = AudioContext;
    vi.stubGlobal(
        "AudioContext",
        class extends RealContext {
            constructor(options?: AudioContextOptions) {
                super(options);
                contexts.push(this);
            }
        },
    );
    const open = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    vi.spyOn(navigator.mediaDevices, "getUserMedia").mockImplementation(async (constraints) => {
        const stream = await open(constraints);
        streams.push(stream);
        return stream;
    });

    element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:400px;height:300px";
    document.body.appendChild(element);
    await element.waitForSettled();
    await element.enableAiControl({ provider: "google", apiKey: "page-test-key", voice: { mode: "live" } });
    element.addEventListener("ai-voice-start", (event) => {
        starts.push((event as CustomEvent).detail);
    });

    // The guide's talk button.
    talk = document.createElement("button");
    talk.textContent = "Talk";
    talk.style.cssText = "display:block;width:120px;height:40px";
    talk.onpointerdown = (event) => {
        talk.setPointerCapture(event.pointerId);
        element.aiTalk(true);
    };
    talk.onpointerup = talk.onpointercancel = () => {
        element.aiTalk(false);
    };
    talk.onkeydown = (event) => {
        if (event.key === " " && !event.repeat) {
            element.aiTalk(true);
        }
    };
    talk.onkeyup = (event) => {
        if (event.key === " ") {
            element.aiTalk(false);
        }
    };
    document.body.appendChild(talk);
});

afterEach(() => {
    element.disableAiControl();
    element.remove();
    talk.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

/**
 * The one Gemini socket the page opened.
 * @returns It.
 */
function socket(): FakeGeminiSocket {
    assert.lengthOf(sockets, 1, "one live connection");
    return sockets[0];
}

/**
 * Wait until the microphone's audio is streaming to the socket.
 */
async function streaming(): Promise<void> {
    await vi.waitFor(
        () => {
            assert.isAtLeast(socket().audioFrames(), 3, "audio frames are sent while held");
        },
        { timeout: 10_000 },
    );
    assert.deepStrictEqual(starts, [{ type: "ai-voice-start", mode: "live" }]);
}

/**
 * After release: one `audioStreamEnd`, and no audio frame after it while the capture worklet runs
 * on (its clock advances half a second, about fifteen frames' worth).
 */
async function endedOnce(): Promise<void> {
    await vi.waitFor(() => {
        assert.isTrue(
            socket()
                .realtime()
                .some((input) => input.audioStreamEnd === true),
            "release ends the reader's turn",
        );
    });
    const capture = contexts.find((context) => context.sampleRate === CAPTURE_RATE);
    assert.exists(capture, "the capture worklet's context");
    const releasedAt = capture.currentTime;
    await vi.waitFor(() => {
        assert.isAtLeast(capture.currentTime, releasedAt + 0.5, "the capture clock runs on");
    });
    const inputs = socket().realtime();
    const end = inputs.findIndex((input) => input.audioStreamEnd === true);
    assert.lengthOf(
        inputs.filter((input) => input.audioStreamEnd === true),
        1,
        "exactly one audioStreamEnd",
    );
    assert.lengthOf(
        inputs.slice(end + 1).filter((input) => "audio" in input),
        0,
        "no audio after release",
    );
}

/**
 * After `disableAiControl`: every microphone track the page opened has ended.
 */
async function microphoneStopped(): Promise<void> {
    assert.isAbove(streams.length, 0, "the microphone opened");
    element.disableAiControl();
    await vi.waitFor(() => {
        const tracks = streams.flatMap((stream) => stream.getTracks());
        assert.isTrue(
            tracks.every((track) => track.readyState === "ended"),
            "the microphone stopped",
        );
    });
}

describe("a talk button held for real, live", () => {
    it("held with the mouse, streams audio only while held and ends the turn once", async () => {
        const middle = { x: 60, y: 20 };
        assert.lengthOf(sockets, 0, "nothing is open before the first press");
        await press(talk, middle);
        await streaming();
        await release(talk, middle);
        await endedOnce();
        await microphoneStopped();
    });

    it("held with Space, streams audio only while held and ends the turn once", async () => {
        talk.focus();
        await userEvent.keyboard("[Space>]");
        await streaming();
        await userEvent.keyboard("[/Space]");
        await endedOnce();
        await microphoneStopped();
    });
});
