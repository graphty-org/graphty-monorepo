/**
 * @file A scripted engine for tests: each turn answers with the next scripted events and records
 * the request it was given. New assistant features are tested on it, never on a real provider.
 */

import { providerFailure } from "./LlmProviderEngine";
import {
    type AiEngine,
    type EngineCapabilities,
    type EngineOutcome,
    NO_HOSTED_TOOLS,
    type TurnEvent,
    type TurnRequest,
} from "./types";

/**
 * One scripted turn: its events, or a function that yields them (one that waits on the signal,
 * say, to stand for a model that is still thinking). A function that throws stands for a provider
 * that failed: the engine codes what it threw, as a provider engine does.
 */
export type FakeTurn =
    | readonly TurnEvent[]
    | ((request: TurnRequest, signal: AbortSignal) => AsyncIterable<TurnEvent> | readonly TurnEvent[]);

/** An engine that plays a script. */
export class FakeEngine implements AiEngine {
    readonly kind = "fake";
    readonly providerName = "fake";
    /** Every request, in order: what the model was shown. */
    readonly requests: TurnRequest[] = [];
    /** What `checkKey` answers. */
    keyOutcome: EngineOutcome = { code: "AI_COMPLETED", params: {} };
    /**
     * What `capabilities` answers: tool calls, and none of the provider's own tools until a test
     * scripts them (a scripted turn may then emit `hosted-tool` events).
     */
    capability: EngineCapabilities = { toolCalls: "available", hostedTools: NO_HOSTED_TOOLS };
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
     * What the fake can do, as scripted.
     * @returns `capability`.
     */
    capabilities(): EngineCapabilities {
        return this.capability;
    }

    /**
     * Play the next scripted turn, recording the request.
     * @param request - The turn.
     * @param signal - Ends the turn with `AI_CANCELLED` when it fires.
     * @yields The scripted events; a coded error for a script that threw.
     */
    async *turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent> {
        this.requests.push(request);
        const next = this.script.shift() ?? [{ type: "finish", reason: "stop" }];
        try {
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
        } catch (error) {
            yield providerFailure(error, this.providerName, signal);
            return;
        }

        if (signal.aborted) {
            yield providerFailure(signal.reason, this.providerName, signal);
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
