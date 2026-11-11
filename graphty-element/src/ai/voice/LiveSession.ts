/**
 * One assistant's live conversation with its provider: one connection, opened on the first live
 * press and kept across presses; the microphone sent only while talk is held; barge-in; the
 * microphone's level once per animation frame while held; the model's speaking state as
 * `ai-speech-start` and `ai-speech-end`; and closing: by the host (disable, dispose, leaving XR, a
 * pending hand-off, a change of conversation), by the provider (an error, `go_away`), or after the
 * idle time (`LIVE_IDLE_MS` by default) with nothing said and no message running. Reached only by
 * `import()` on the first live press.
 * @module ai/voice/LiveSession
 */

import type { AiResultCode, AiResultParams } from "../../catalog/ai";
import type { LiveConnection, LiveEvent, LiveOpened } from "../engine/types";
import type { LiveTurnEngine } from "./liveTurns";
import type { VoiceEventType } from "./VoiceSession";

/**
 * How long an open connection waits for the next press by default, in milliseconds, before it
 * closes (`AiVoiceOptions.liveIdleSeconds`): an idle socket costs little, but an open microphone
 * stream should not linger.
 */
export const LIVE_IDLE_MS = 2 * 60_000;

/** What the voice session gives its live conversation. */
export interface LiveHost {
    /** Open a connection with the provider. */
    open(signal: AbortSignal): Promise<LiveOpened>;
    emit(type: VoiceEventType, detail: Record<string, unknown>): void;
    /** The held press ended without a release: the connection closed under it. */
    ended(code: AiResultCode, params: AiResultParams): void;
    /**
     * The engine that runs what is said on a new connection as messages; absent, none.
     * @param connection - The connection.
     * @param touch - Starts the idle time over: a message ended.
     */
    attach?(connection: LiveConnection, touch: () => void): LiveMessages;
    /** How long an open connection waits for the next press, in milliseconds. Default `LIVE_IDLE_MS`. */
    readonly idleMs?: number;
}

/** What the live session asks of the messages of its connection. */
type LiveMessages = Pick<LiveTurnEngine, "press" | "released" | "closed" | "busy" | "running">;

/** One assistant's live connection. */
export class LiveSession {
    private connection: LiveConnection | undefined;
    private opening: Promise<LiveOpened> | undefined;
    private abort: AbortController | undefined;
    private stopListening: (() => void) | undefined;
    /** The microphone is being sent. */
    private held = false;
    /** The model is speaking. */
    private speaking = false;
    private frame = 0;
    private idle: ReturnType<typeof setTimeout> | undefined;
    /** The messages of the open connection. */
    private messages: LiveMessages | undefined;

    /**
     * A live conversation, not yet open.
     * @param host - The voice session.
     */
    constructor(private readonly host: LiveHost) {}

    /**
     * The open connection, or a new one: one opening at a time.
     * @returns The connection, or the code opening failed with.
     */
    connect(): Promise<LiveOpened> {
        if (this.connection !== undefined) {
            return Promise.resolve({ code: "AI_COMPLETED", params: {}, connection: this.connection });
        }

        this.opening ??= this.openNew();
        return this.opening;
    }

    /**
     * Open a connection and listen to it.
     * @returns The connection, or the code opening failed with.
     */
    private async openNew(): Promise<LiveOpened> {
        const abort = new AbortController();
        this.abort = abort;
        const opened = await this.host.open(abort.signal);
        if (this.abort === abort) {
            this.abort = undefined;
            this.opening = undefined;
        }

        if (opened.code !== "AI_COMPLETED") {
            return opened;
        }

        // Closed while it opened.
        if (abort.signal.aborted) {
            opened.connection.close();
            return { code: "AI_CANCELLED", params: {} };
        }

        this.connection = opened.connection;
        this.stopListening = opened.connection.on((event) => {
            this.event(event);
        });
        this.messages = this.host.attach?.(opened.connection, () => {
            this.touch();
        });
        this.touch();
        return opened;
    }

    /** Send the microphone (talk held). */
    hold(): void {
        if (this.connection === undefined || this.held) {
            return;
        }

        this.held = true;
        clearTimeout(this.idle);
        // The capture first: words still owed for the last press are settled as that press's.
        this.connection.capture(true);
        this.messages?.press();
        this.levels();
    }

    /** Stop sending the microphone (talk released), which ends the reader's turn. */
    release(): void {
        if (!this.held) {
            return;
        }

        this.held = false;
        this.stopLevels();
        this.messages?.released();
        this.connection?.capture(false);
        this.touch();
    }

    /**
     * Whether a press now would reach the model while a spoken message still runs its tools: such
     * a press runs turn by turn instead.
     * @returns True while one does.
     */
    busy(): boolean {
        return this.messages?.busy() ?? false;
    }

    /** Cut off the answer being spoken: it ends with `AI_CANCELLED`. */
    interrupt(): void {
        if (this.speaking) {
            this.connection?.interrupt();
            this.speechEnd("AI_CANCELLED");
        }
    }

    /**
     * Close the connection: a held press ends with `AI_CANCELLED`, an answer being spoken too, and
     * an opening still under way is cancelled.
     */
    close(): void {
        this.abort?.abort();
        this.abort = undefined;
        this.opening = undefined;
        const { connection } = this;
        this.drop("AI_CANCELLED", {});
        connection?.close();
    }

    /**
     * Forget the connection, ending what it carried.
     * @param code - Why it closed.
     * @param params - The facts behind `code`.
     */
    private drop(code: AiResultCode, params: AiResultParams): void {
        clearTimeout(this.idle);
        this.messages?.closed(code, params);
        this.messages = undefined;
        this.stopListening?.();
        this.stopListening = undefined;
        this.connection = undefined;
        if (this.speaking) {
            this.speechEnd("AI_CANCELLED");
        }

        if (this.held) {
            this.held = false;
            this.stopLevels();
            this.host.ended("AI_CANCELLED", {});
        }
    }

    /**
     * What the connection reported.
     * @param event - The event.
     */
    private event(event: LiveEvent): void {
        switch (event.type) {
            case "reader-transcript":
                this.host.emit("ai-voice-transcript", { transcript: event.text, isFinal: event.final });
                break;
            case "speaking":
                if (event.on && !this.speaking) {
                    this.speaking = true;
                    this.host.emit("ai-speech-start", {});
                } else if (!event.on && this.speaking) {
                    this.speechEnd("AI_COMPLETED");
                }

                break;
            case "interrupted":
                if (this.speaking) {
                    this.speechEnd("AI_CANCELLED");
                }

                break;
            case "closed": {
                // The press held now ends with the provider's code.
                const { held } = this;
                this.held = false;
                this.stopLevels();
                this.drop(event.code, event.params);
                if (held) {
                    this.host.ended(event.code, event.params);
                }

                return;
            }
            default:
                break;
        }

        this.touch();
    }

    /**
     * The answer stopped being spoken.
     * @param code - `AI_COMPLETED`, or `AI_CANCELLED` when it was cut off.
     */
    private speechEnd(code: AiResultCode): void {
        this.speaking = false;
        this.host.emit("ai-speech-end", { code, params: {} });
    }

    /** Something happened: the idle close starts over, unless talk is held. */
    private touch(): void {
        clearTimeout(this.idle);
        if (this.connection !== undefined && !this.held) {
            this.idle = setTimeout(() => {
                // A message running a long batch says nothing on the connection: it is not idle.
                if (this.messages?.running() === true) {
                    this.touch();
                } else {
                    this.close();
                }
            }, this.host.idleMs ?? LIVE_IDLE_MS);
        }
    }

    /**
     * Report the microphone's level once per animation frame while talk is held.
     * ponytail: no level in XR, where window animation frames pause (as on the turns path).
     */
    private levels(): void {
        if (typeof requestAnimationFrame !== "function") {
            return;
        }

        const tick = (): void => {
            this.host.emit("ai-voice-level", { level: this.connection?.level() ?? 0 });
            this.frame = requestAnimationFrame(tick);
        };
        this.frame = requestAnimationFrame(tick);
    }

    /** Stop reporting the level. */
    private stopLevels(): void {
        if (this.frame !== 0) {
            cancelAnimationFrame(this.frame);
            this.frame = 0;
        }
    }
}
