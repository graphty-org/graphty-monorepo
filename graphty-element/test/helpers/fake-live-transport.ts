/**
 * What a live conversation needs from the page, faked for Node: an `RTCPeerConnection` whose data
 * channel a test scripts (OpenAI), a `WebSocket` a test scripts (Gemini), and an audio stack
 * (`getUserMedia`, `AudioContext`, `AudioWorkletNode`, `Audio`) whose capture worklet a test feeds
 * PCM. Each global is stubbed with `vi.stubGlobal`: unstub after each case. A global a test sets
 * itself (Node's real `WebSocket` for a paid run) is kept by passing `{ webSocket: false }`.
 * @module test/helpers/fake-live-transport
 */

import { vi } from "vitest";

/** A microphone track. */
export class FakeTrack {
    readonly kind = "audio";
    enabled = true;
    readyState: "live" | "ended" = "live";

    /** Stop it for good. */
    stop(): void {
        this.readyState = "ended";
    }

    /**
     * The settings the browser applied.
     * @returns None worth reporting.
     */
    getSettings(): Record<string, unknown> {
        return {};
    }
}

/** The microphone's stream. */
export class FakeStream {
    readonly tracks = [new FakeTrack()];

    getTracks(): FakeTrack[] {
        return this.tracks;
    }

    getAudioTracks(): FakeTrack[] {
        return this.tracks;
    }
}

/** An audio node: connects to anything, does nothing. */
class FakeNode {
    connected = 0;
    connect(): void {
        this.connected++;
    }

    disconnect(): void {
        this.connected = 0;
    }
}

/** An analyser whose level a test sets (0 to 1). */
class FakeAnalyser extends FakeNode {
    fftSize = 2048;
    smoothingTimeConstant = 0;
    frequencyBinCount = 1024;
    constructor(private readonly transport: FakeLiveTransport) {
        super();
    }

    getByteTimeDomainData(data: Uint8Array): void {
        data.fill(128);
        data[0] = 128 + Math.round((this.transport.inputLevel / 1.5) * 127);
    }

    getByteFrequencyData(data: Uint8Array): void {
        data.fill(0);
    }
}

/** A worklet node, whose port a test reads and writes. */
export class FakeWorkletNode extends FakeNode {
    readonly port = {
        onmessage: null as ((event: { data: unknown }) => void) | null,
        posted: [] as unknown[],
        closed: false,
        postMessage: (data: unknown): void => {
            this.port.posted.push(data);
        },
        close: (): void => {
            this.port.closed = true;
        },
    };

    constructor(
        readonly context: FakeAudioContext,
        readonly name: string,
    ) {
        super();
        context.transport.worklets.push(this);
    }
}

/** An audio context: worklets load, nodes connect, `close()` is counted. */
export class FakeAudioContext {
    state: "running" | "suspended" | "closed" = "running";
    readonly sampleRate: number;
    readonly destination = new FakeNode();
    readonly modules: string[] = [];
    readonly audioWorklet = {
        addModule: (url: string): Promise<void> => {
            this.modules.push(url);
            return Promise.resolve();
        },
    };

    constructor(
        readonly transport: FakeLiveTransport,
        options: { sampleRate?: number } = {},
    ) {
        this.sampleRate = options.sampleRate ?? 48_000;
        transport.contexts.push(this);
    }

    createAnalyser(): FakeAnalyser {
        return new FakeAnalyser(this.transport);
    }

    createMediaStreamSource(): FakeNode {
        return new FakeNode();
    }

    createGain(): FakeNode & { gain: { value: number } } {
        return Object.assign(new FakeNode(), { gain: { value: 1 } });
    }

    resume(): Promise<void> {
        this.state = "running";
        return Promise.resolve();
    }

    close(): Promise<void> {
        this.state = "closed";
        return Promise.resolve();
    }
}

/** OpenAI's data channel: what graphty sent, and what the server says. */
export class FakeDataChannel {
    readyState: "connecting" | "open" | "closed" = "connecting";
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onclose: (() => void) | null = null;
    /** Every event sent, parsed, with whether each microphone track was enabled as it went. */
    readonly sent: { event: Record<string, unknown>; micEnabled: boolean[] }[] = [];

    constructor(private readonly transport: FakeLiveTransport) {}

    send(data: string): void {
        this.sent.push({
            event: JSON.parse(data) as Record<string, unknown>,
            micEnabled: this.transport.tracks.map((t) => t.enabled),
        });
    }

    close(): void {
        this.readyState = "closed";
    }

    /**
     * The server sends an event.
     * @param event - The event.
     */
    receive(event: Record<string, unknown>): void {
        this.onmessage?.({ data: JSON.stringify(event) });
    }

    /** The connection is lost from the server's side. */
    lose(): void {
        this.readyState = "closed";
        this.onclose?.();
    }

    /**
     * The events sent of one type.
     * @param type - The type.
     * @returns Them, in order.
     */
    sentOf(type: string): Record<string, unknown>[] {
        return this.sent.map((s) => s.event).filter((e) => e.type === type);
    }
}

/** OpenAI's peer connection: the data channel opens once the answer is set. */
export class FakePeerConnection {
    readonly channels: FakeDataChannel[] = [];
    readonly addedTracks: FakeTrack[] = [];
    ontrack: ((event: unknown) => void) | null = null;
    closed = false;
    remote?: { type: string; sdp: string };

    constructor(private readonly transport: FakeLiveTransport) {
        transport.peers.push(this);
    }

    createDataChannel(): FakeDataChannel {
        const channel = new FakeDataChannel(this.transport);
        this.channels.push(channel);
        return channel;
    }

    addTrack(track: FakeTrack): void {
        this.addedTracks.push(track);
    }

    createOffer(): Promise<{ type: string; sdp: string }> {
        return Promise.resolve({ type: "offer", sdp: "v=0 graphty-offer" });
    }

    setLocalDescription(): Promise<void> {
        return Promise.resolve();
    }

    setRemoteDescription(description: { type: string; sdp: string }): Promise<void> {
        this.remote = description;
        // The channel opens after the network handshake, a task later: never inside the adapter's
        // own await of this call (the adapter reads state it declares after it).
        setTimeout(() => {
            for (const channel of this.channels) {
                channel.readyState = "open";
                channel.onopen?.();
            }
        }, 0);
        return Promise.resolve();
    }

    close(): void {
        this.closed = true;
    }

    /** The one data channel the adapter opens. */
    get channel(): FakeDataChannel {
        return this.channels[0];
    }
}

/** Gemini's socket: what graphty sent, and what the server says; it answers the setup by default. */
export class FakeWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readyState = FakeWebSocket.CONNECTING;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    onclose: ((event: { code: number }) => void) | null = null;
    /** Every message sent, parsed, with whether each microphone track was enabled as it went. */
    readonly sent: { message: Record<string, unknown>; micEnabled: boolean[] }[] = [];

    constructor(
        readonly url: string,
        private readonly transport: FakeLiveTransport,
    ) {
        transport.sockets.push(this);
        queueMicrotask(() => {
            this.readyState = FakeWebSocket.OPEN;
            this.onopen?.();
        });
    }

    send(data: string): void {
        const message = JSON.parse(data) as Record<string, unknown>;
        this.sent.push({ message, micEnabled: this.transport.tracks.map((t) => t.enabled) });
        if ("setup" in message && this.transport.answerSetup) {
            queueMicrotask(() => {
                this.receive({ setupComplete: {} });
            });
        }
    }

    close(): void {
        this.readyState = FakeWebSocket.CLOSED;
    }

    /**
     * The server sends a message.
     * @param message - The message.
     */
    receive(message: Record<string, unknown>): void {
        this.onmessage?.({ data: JSON.stringify(message) });
    }

    /** The connection is lost from the server's side. */
    lose(): void {
        this.readyState = FakeWebSocket.CLOSED;
        this.onclose?.({ code: 1011 });
    }

    /**
     * The messages sent that carry a key.
     * @param key - The key, such as "setup" or "realtimeInput".
     * @returns Them, in order.
     */
    sentWith(key: string): Record<string, unknown>[] {
        return this.sent.map((s) => s.message).filter((m) => key in m);
    }
}

/** Everything the fakes made, for a test to drive and check. */
export interface FakeLiveTransport {
    readonly peers: FakePeerConnection[];
    readonly sockets: FakeWebSocket[];
    readonly streams: FakeStream[];
    readonly tracks: FakeTrack[];
    readonly contexts: FakeAudioContext[];
    readonly worklets: FakeWorkletNode[];
    readonly audios: { paused: boolean; srcObject: unknown }[];
    /** The microphone's level, 0 to 1, as the analysers report it. */
    inputLevel: number;
    /** The socket answers a setup message with `setupComplete`. */
    answerSetup: boolean;
    /** `getUserMedia` rejects with this. */
    microphoneError?: Error;
    /**
     * Feed the capture worklets PCM, in 512-sample frames, as the microphone would.
     * @param samples - Mono samples, -1 to 1, at the context's rate.
     */
    speak(samples: Float32Array): void;
}

/**
 * Stub the page's live transports and audio stack.
 * @param options - What to stub.
 * @param options.webSocket - Stub `WebSocket` (default true); false keeps the runtime's own.
 * @returns The fakes.
 */
export function installFakeLiveTransport(options: { webSocket?: boolean } = {}): FakeLiveTransport {
    const transport: FakeLiveTransport = {
        peers: [],
        sockets: [],
        streams: [],
        tracks: [],
        contexts: [],
        worklets: [],
        audios: [],
        inputLevel: 0,
        answerSetup: true,
        speak(samples) {
            for (let at = 0; at + 512 <= samples.length; at += 512) {
                const frame = samples.slice(at, at + 512);
                for (const worklet of transport.worklets.filter((w) => w.name === "audio-capture-processor")) {
                    worklet.port.onmessage?.({ data: { type: "audio", data: frame } });
                }
            }
        },
    };
    vi.stubGlobal("navigator", {
        userAgent: "graphty-test",
        mediaDevices: {
            getUserMedia: (): Promise<FakeStream> => {
                if (transport.microphoneError !== undefined) {
                    return Promise.reject(transport.microphoneError);
                }

                const stream = new FakeStream();
                transport.streams.push(stream);
                transport.tracks.push(...stream.tracks);
                return Promise.resolve(stream);
            },
        },
    });
    vi.stubGlobal(
        "RTCPeerConnection",
        class extends FakePeerConnection {
            constructor() {
                super(transport);
            }
        },
    );
    if (options.webSocket !== false) {
        vi.stubGlobal(
            "WebSocket",
            class extends FakeWebSocket {
                constructor(url: string) {
                    super(url, transport);
                }
            },
        );
    }

    vi.stubGlobal(
        "AudioContext",
        class extends FakeAudioContext {
            constructor(contextOptions?: { sampleRate?: number }) {
                super(transport, contextOptions);
            }
        },
    );
    vi.stubGlobal("AudioWorkletNode", FakeWorkletNode);
    vi.stubGlobal(
        "Audio",
        class {
            paused = true;
            srcObject: unknown = null;
            autoplay = false;
            constructor() {
                transport.audios.push(this);
            }

            play(): Promise<void> {
                this.paused = false;
                return Promise.resolve();
            }

            pause(): void {
                this.paused = true;
            }
        },
    );
    return transport;
}

/**
 * A 16-bit mono WAV clip as samples at another rate, by linear interpolation.
 * @param wav - The file's bytes.
 * @param rate - The rate wanted.
 * @returns The samples, -1 to 1.
 */
export function wavSamples(wav: Uint8Array, rate: number): Float32Array {
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    let at = 12;
    let sourceRate = 0;
    let data: Int16Array | undefined;
    while (at + 8 <= wav.length) {
        const id = String.fromCharCode(...wav.subarray(at, at + 4));
        const size = view.getUint32(at + 4, true);
        if (id === "fmt ") {
            sourceRate = view.getUint32(at + 12, true);
        } else if (id === "data") {
            data = new Int16Array(wav.slice(at + 8, at + 8 + size).buffer);
        }

        at += 8 + size + (size % 2);
    }

    if (data === undefined || sourceRate === 0) {
        throw new Error("not a 16-bit PCM WAV clip");
    }

    const out = new Float32Array(Math.floor((data.length * rate) / sourceRate));
    for (let i = 0; i < out.length; i++) {
        const position = (i * sourceRate) / rate;
        const low = Math.floor(position);
        const high = Math.min(low + 1, data.length - 1);
        const t = position - low;
        out[i] = ((1 - t) * data[low] + t * data[high]) / 32768;
    }

    return out;
}
