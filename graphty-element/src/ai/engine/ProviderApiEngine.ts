/**
 * @file The engine behind the built-in OpenAI, Anthropic and Google providers: one turn is one call
 * to the provider's API from the page, through the adapter folder (`./tanstack/`), which it loads
 * on the first turn. The retry schedule is graphty's: the adapter turns off every lower layer's.
 */

import { aiHostedToolStatus } from "../../catalog/ai";
import { API_KEY_MISSING_ERROR } from "../safeError";
import { providerFailure } from "./LlmProviderEngine";
import { loadProviderApiTurn } from "./load";
import {
    type AiEngine,
    type EngineCapabilities,
    type EngineOutcome,
    type ProviderApiSettings,
    type ProviderApiTurn,
    type TurnError,
    type TurnEvent,
    type TurnRequest,
} from "./types";

/** Retries after the first attempt: the AI SDK 5's schedule, which the assistant keeps. */
const MAX_RETRIES = 2;
/** The wait before the first retry; each later one doubles it. */
const FIRST_RETRY_MS = 2000;
/** A provider's own wait is honored when it is shorter than this, or than the backoff. */
const MAX_HONORED_WAIT_MS = 60_000;

/**
 * Wait, unless the turn is cancelled first.
 * @param ms - How long.
 * @param signal - Cancels the wait.
 * @returns When the time is up.
 * @throws An `AbortError` when the signal fires first.
 */
function wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const cancelled = (): DOMException => new DOMException("The wait before a retry was cancelled.", "AbortError");
        if (signal.aborted) {
            reject(cancelled());
            return;
        }

        const onAbort = (): void => {
            clearTimeout(timer);
            reject(cancelled());
        };
        const timer = setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        signal.addEventListener("abort", onAbort, { once: true });
    });
}

/**
 * How long to wait before a retry: the provider's `retry-after` when it gave a sane one, else the
 * backoff.
 * @param asked - What the provider asked for.
 * @param backoff - The schedule's wait for this retry.
 * @returns Milliseconds.
 */
function retryDelay(asked: number | undefined, backoff: number): number {
    return asked !== undefined && asked >= 0 && (asked < MAX_HONORED_WAIT_MS || asked < backoff) ? asked : backoff;
}

/** What tests may replace. */
export interface ProviderApiEngineOptions {
    /** Loads the adapter's turn. */
    readonly load?: () => Promise<ProviderApiTurn>;
    /** Waits between attempts. */
    readonly wait?: (ms: number, signal: AbortSignal) => Promise<void>;
}

/** A provider's API, called from the page. */
export class ProviderApiEngine implements AiEngine {
    readonly kind = "provider-api";

    /**
     * An engine over a provider's live configuration.
     * @param settings - Read before every turn, so a `configure()` after the first reaches the next.
     * @param options - What tests replace.
     */
    constructor(
        private readonly settings: () => ProviderApiSettings,
        private readonly options: ProviderApiEngineOptions = {},
    ) {}

    /**
     * The provider's name.
     * @returns Its id.
     */
    get providerName(): string {
        return this.settings().provider;
    }

    /**
     * What the provider can do with a model: every built-in provider calls tools, and the adapter
     * offers each of the provider's own tools that the catalog lists as available for the model.
     * @param model - The model id.
     * @returns Its capabilities.
     */
    capabilities(model: string): EngineCapabilities {
        const { provider } = this.settings();
        const status = (tool: "web-search" | "web-fetch"): "available" | "unsupported" =>
            aiHostedToolStatus(provider, model, tool) === "available" ? "available" : "unsupported";
        return {
            toolCalls: "available",
            hostedTools: { "web-search": status("web-search"), "web-fetch": status("web-fetch") },
        };
    }

    /**
     * One turn, asked again on a rate limit, a server error or a lost connection, as long as nothing
     * of the failed attempt was streamed out.
     * @param request - The turn.
     * @param signal - Cancels the request and any wait.
     * @yields The adapter's events.
     */
    async *turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent> {
        const settings = this.settings();
        if (settings.apiKey === undefined || settings.apiKey === "") {
            const error = Object.assign(new Error(`API key not configured for ${settings.provider}`), {
                name: API_KEY_MISSING_ERROR,
            });
            yield providerFailure(error, settings.provider, signal);
            return;
        }

        let turn: ProviderApiTurn;
        try {
            turn = await (this.options.load ?? loadProviderApiTurn)();
        } catch (error) {
            yield providerFailure(error, settings.provider, signal);
            return;
        }

        for (let attempt = 0, backoff = FIRST_RETRY_MS; ; attempt++, backoff *= 2) {
            let retry: TurnError | undefined;
            let streamed = false;
            for await (const event of turn(settings, request, signal)) {
                if (event.type === "error" && event.retryable === true && !streamed && attempt < MAX_RETRIES) {
                    retry = event;
                    break;
                }

                streamed = true;
                yield event;
            }

            if (retry === undefined) {
                return;
            }

            try {
                await (this.options.wait ?? wait)(retryDelay(retry.retryAfterMs, backoff), signal);
            } catch (error) {
                yield providerFailure(error, settings.provider, signal);
                return;
            }
        }
    }

    /**
     * Ask the provider whether the key is accepted: one short turn.
     * @param signal - Cancels it.
     * @returns `AI_COMPLETED`, or the code of what failed (`AI_KEY_REJECTED` for a refused key).
     */
    async checkKey(signal: AbortSignal): Promise<EngineOutcome> {
        for await (const event of this.turn(KEY_CHECK, signal)) {
            if (event.type === "error") {
                return { code: event.code, params: event.params };
            }

            if (event.type === "finish") {
                return { code: "AI_COMPLETED", params: {} };
            }
        }

        return { code: "AI_PROVIDER_ERROR", params: { provider: this.providerName } };
    }

    /** The configuration is the provider's, and nothing outlives a turn's signal. */
    dispose(): void {
        // Nothing of its own to release.
    }
}

/** The turn that checks a key: what `validateApiKey` has always sent. */
export const KEY_CHECK: TurnRequest = {
    system: "",
    messages: [{ id: "m1", role: "user", parts: [{ type: "text", origin: "reader", text: "hi" }] }],
    tools: [],
    toolMode: "auto",
};
