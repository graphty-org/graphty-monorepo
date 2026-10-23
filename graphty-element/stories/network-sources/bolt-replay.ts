/**
 * @file Replaying a recorded Bolt conversation, so a story that loads over Bolt draws the same
 * graph with no network. neo4j-driver opens its browser connection with `new WebSocket(url)`, so
 * while a replay is installed the global `WebSocket` is one that answers each of the driver's
 * sends with the frames the real server sent after that send. What the driver sends is not
 * compared (it carries the login); the recording holds only what the server answered.
 */

/** One recorded connection: the server's frames, each tagged with how many sends came before it. */
export interface BoltRecording {
    readonly url: string;
    readonly sends: number;
    readonly frames: readonly { readonly afterSend: number; readonly data: string }[];
}

/**
 * Decode one base64 frame.
 * @param data - the frame, base64
 * @returns its bytes
 */
function bytes(data: string): ArrayBuffer {
    const text = atob(data);
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
        out[i] = text.charCodeAt(i);
    }
    return out.buffer;
}

/**
 * Swap the global WebSocket for one that replays `recordings`, one connection per recording in
 * order; a connection with no recording left fails like an unreachable host.
 * @param recordings - the recorded connections
 * @returns puts the real WebSocket back
 */
export function installBoltReplay(recordings: readonly BoltRecording[]): () => void {
    const real = globalThis.WebSocket;
    let next = 0;

    class ReplayWebSocket {
        static readonly CONNECTING = 0;
        static readonly OPEN = 1;
        static readonly CLOSING = 2;
        static readonly CLOSED = 3;
        binaryType = "arraybuffer";
        readyState = 0;
        onopen: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        private sends = 0;
        private readonly recording: BoltRecording | undefined;

        constructor(readonly url: string) {
            this.recording = recordings[next++];
            setTimeout(() => {
                if (this.recording === undefined) {
                    this.readyState = 3;
                    this.onerror?.(new Event("error"));
                    return;
                }
                this.readyState = 1;
                this.onopen?.(new Event("open"));
            });
        }

        send(): void {
            this.sends += 1;
            const due = this.recording?.frames.filter((frame) => frame.afterSend === this.sends) ?? [];
            setTimeout(() => {
                for (const frame of due) {
                    if (this.readyState === 1) {
                        this.onmessage?.(new MessageEvent("message", { data: bytes(frame.data) }));
                    }
                }
            });
        }

        close(): void {
            this.readyState = 3;
            setTimeout(() => this.onclose?.(new CloseEvent("close", { code: 1000, wasClean: true })));
        }
    }

    globalThis.WebSocket = ReplayWebSocket as unknown as typeof WebSocket;
    return () => {
        globalThis.WebSocket = real;
    };
}
