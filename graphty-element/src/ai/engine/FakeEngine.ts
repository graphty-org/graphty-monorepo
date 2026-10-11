/**
 * @file A scripted engine for tests: each turn answers with the next scripted events and records
 * the request it was given. New assistant features are tested on it, never on a real provider.
 */

import type { AiEngine, EngineCapabilities, EngineOutcome, TurnEvent, TurnRequest } from "./types";

/**
 * One scripted turn: its events, or a function that yields them (one that waits on the signal,
 * say, to stand for a model that is still thinking).
 */
export type FakeTurn =
    | readonly TurnEvent[]
    | ((request: TurnRequest, signal: AbortSignal) => AsyncIterable<TurnEvent> | readonly TurnEvent[]);

/**
 * The event a turn ends with when its signal fired.
 * @param signal - The turn's signal.
 * @returns The error event.
 */
function cancelled(signal: AbortSignal): TurnEvent {
    const cause = signal.reason instanceof Error ? signal.reason : new Error("The turn was cancelled.");
    return { type: "error", code: "AI_CANCELLED", params: {}, cause };
}

/** An engine that plays a script. */
export class FakeEngine implements AiEngine {
    readonly kind = "fake";
    /** Every request, in order: what the model was shown. */
    readonly requests: TurnRequest[] = [];
    /** What `checkKey` answers. */
    keyOutcome: EngineOutcome = { code: "AI_COMPLETED", params: {} };
    disposed = false;
    private readonly script: FakeTurn[];

    /**
     * An engine playing a script.
     * @param script - The turns, in order. Past the end, a turn answers nothing and stops.
     */
    constructor(script: readonly FakeTurn[] = []) {
        this.script = [...script];
    }

    /**
     * Script more turns.
     * @param turns - More turns, played after the ones already scripted.
     */
    push(...turns: FakeTurn[]): void {
        this.script.push(...turns);
    }

    /**
     * What the fake can do: everything a test asks of it.
     * @returns Tool calls available.
     */
    capabilities(): EngineCapabilities {
        return { toolCalls: "available" };
    }

    /**
     * Play the next scripted turn, recording the request.
     * @param request - The turn.
     * @param signal - Ends the turn with `AI_CANCELLED` when it fires.
     * @yields The scripted events.
     */
    async *turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent> {
        this.requests.push(request);
        const next = this.script.shift() ?? [{ type: "finish", reason: "stop" }];
        const events = typeof next === "function" ? next(request, signal) : next;
        for await (const event of events) {
            if (signal.aborted) {
                break;
            }

            yield event;
            if (event.type === "finish" || event.type === "error") {
                return;
            }
        }

        if (signal.aborted) {
            yield cancelled(signal);
        }
    }

    /**
     * The scripted key check.
     * @returns `keyOutcome`.
     */
    checkKey(): Promise<EngineOutcome> {
        return Promise.resolve(this.keyOutcome);
    }

    /** Record that the engine was disposed. */
    dispose(): void {
        this.disposed = true;
    }
}
