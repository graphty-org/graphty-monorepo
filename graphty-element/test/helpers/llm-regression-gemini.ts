/**
 * The LLM regression tests' transport to Google's Gemini API: what makes a paid run cheap, and what it cost.
 * @module test/helpers/llm-regression-gemini
 *
 * Every request of a run repeats the same prefix -- the system instruction, about 30 tool definitions and the
 * tool config, about 5,000 of its 5,700 input tokens -- so the transport, a fetch handed to the AI SDK:
 *
 * - caches each prefix the second time it is sent (Gemini explicit context caching: POST cachedContents), and
 *   sends later requests with that prefix as `cachedContent` with the prefix's fields left out, as the API
 *   requires. A prefix the API refuses to cache (too small: 3.8 Flash caches 4,096 tokens or more) is sent whole.
 *   `close()` deletes the caches; each lives at most `ttlSeconds` and is replaced before it expires;
 * - asks for the Flex tier when told to (`serviceTier: "flex"`, half the Standard price, best effort). Flex
 *   answers a request it has no capacity for with 429 or 503; the transport retries it as Google documents (3
 *   attempts, 5 s doubling), then throws {@link FLEX_CAPACITY_CODE}. A 429 that refuses the account (quota,
 *   billing) is never retried: it goes back to the SDK, and the harness reports it as the owner's. Flex queues
 *   a request before it serves it: on 2026-10-29 its calls took 20 to over 120 s each (Standard: 2-3 s at the
 *   median), so a suite on Flex outlasts the release job and Standard is the default;
 * - gives every request a deadline, {@link REQUEST_DEADLINE_MS}: a request with no answer by then is aborted
 *   and sent once more, and a second one with no answer fails with {@link REQUEST_TIMEOUT_CODE}, so a stalled
 *   call fails its own case with a reason instead of hanging until the case's or the job's time limit;
 * - records each answer's `usageMetadata` and prices it at the tier that served it.
 *
 * Prices: https://ai.google.dev/gemini-api/docs/pricing, read 2026-10-29 (Gemini 3.8 Flash, per 1M tokens).
 */

import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { setTimeout as sleepFor } from "node:timers/promises";

/** The tier the transport asks for: flex, or standard (the API's default, the field left out). */
export type GeminiTier = "flex" | "standard";

/** The words of a 429 that refuses the account rather than the request: retrying it cannot help. */
export const ACCOUNT_REFUSAL_TEXT =
    /credit balance|insufficient_quota|no credits|credits are depleted|billing|exceeded your current quota/;

/** The code a request fails with when Flex had no capacity for it on every attempt. */
export const FLEX_CAPACITY_CODE = "E_LLM_FLEX_CAPACITY";

/**
 * The code a request fails with when Gemini answered neither it nor its resend within {@link REQUEST_DEADLINE_MS}.
 */
export const REQUEST_TIMEOUT_CODE = "E_LLM_REQUEST_TIMEOUT";

/**
 * How long one request may wait for its answer. Standard answered in 2-3 s at the median and 40.5 s at the
 * slowest over 19 runs (test/helpers/llm-regression-env.ts); one call there had not answered after 57 s. Two
 * sends of a request fit the 120 s case limit with the case's other calls.
 */
export const REQUEST_DEADLINE_MS = 45_000;

/** Sends of one request: the first, and one more after a missed deadline. */
const DEADLINE_SENDS = 2;

/** Google's documented Flex retry: 3 attempts, the first wait 5 s, doubling. */
const FLEX_ATTEMPTS = 3;
const FLEX_FIRST_WAIT_MS = 5_000;

/**
 * Per 1M tokens through 2026-12-31; every price doubles on 2027-01-01. Cache creation is priced as Standard
 * input (the docs do not say; an upper bound), cache storage for the cache's whole TTL (an upper bound too).
 */
const PRICES: Record<string, Record<GeminiTier, { input: number; cached: number; output: number }>> = {
    "gemini-3.8-flash": {
        standard: { input: 0.75, cached: 0.075, output: 3.75 },
        flex: { input: 0.375, cached: 0.0375, output: 1.875 },
    },
};
const STORAGE_PER_HOUR = 0.5;
const PRICE_RISE = Date.parse("2027-01-01T00:00:00Z");

/** One answer's usageMetadata, as the API names its fields. */
interface UsageMetadata {
    promptTokenCount?: number;
    cachedContentTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    serviceTier?: string;
}

/** What one test file's requests used and cost. */
export interface GeminiRunUsage {
    requests: number;
    promptTokens: number;
    cachedTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    flexServed: number;
    caches: number;
    cacheTokens: number;
    /** USD at the tier and cache prices; undefined for a model with no price here. */
    usd: number | undefined;
}

interface CacheEntry {
    seen: number;
    name?: string;
    createdAt?: number;
    refused?: string;
}

/** Options for {@link GeminiTransport}. */
export interface GeminiTransportOptions {
    apiKey: string;
    tier: GeminiTier;
    /** Whether to cache repeated prefixes (default true). */
    cache?: boolean;
    /** Longest a cache lives (default 1200 s: the release job's 20 minute limit). */
    ttlSeconds?: number;
    /** The fetch underneath (default the global one). */
    fetch?: typeof globalThis.fetch;
    /** Waits between Flex attempts (default a real, abortable timer). */
    sleep?: (ms: number, signal?: AbortSignal | null) => Promise<void>;
    /** The clock (default Date.now). */
    now?: () => number;
    /** The signal that aborts a send at its deadline (default `AbortSignal.timeout(REQUEST_DEADLINE_MS)`). */
    deadline?: () => AbortSignal;
    /**
     * A file each priced cost is appended to as it is spent, one `{"usd":n}` line per change (default none). It
     * outlives a run that is stopped before its `[llm-regression] API calls` line prints, so CI logs what a hung or
     * cut-off run spent (tools/llm-spend.mjs cost).
     */
    usageFile?: string;
}

const defaultSleep = async (ms: number, signal?: AbortSignal | null): Promise<void> => {
    await sleepFor(ms, undefined, { signal: signal ?? undefined });
};

/** The fetch the LLM regression harness hands the Google provider. */
export class GeminiTransport {
    private readonly caches = new Map<string, CacheEntry>();
    private readonly retired: string[] = [];
    private readonly base: typeof globalThis.fetch;
    private readonly sleep: NonNullable<GeminiTransportOptions["sleep"]>;
    private readonly now: () => number;
    private readonly deadline: () => AbortSignal;
    private readonly ttlSeconds: number;
    private apiBase?: string;
    private model?: string;
    private cacheUsd = 0;
    private tokenUsd = 0;
    private priced = true;
    private filedUsd = 0;
    readonly usage: GeminiRunUsage = {
        requests: 0,
        promptTokens: 0,
        cachedTokens: 0,
        outputTokens: 0,
        thinkingTokens: 0,
        flexServed: 0,
        caches: 0,
        cacheTokens: 0,
        usd: 0,
    };

    constructor(private readonly options: GeminiTransportOptions) {
        this.base = options.fetch ?? globalThis.fetch.bind(globalThis);
        this.sleep = options.sleep ?? defaultSleep;
        this.now = options.now ?? Date.now;
        this.deadline = options.deadline ?? (() => AbortSignal.timeout(REQUEST_DEADLINE_MS));
        this.ttlSeconds = options.ttlSeconds ?? 1200;
    }

    /** The fetch to hand the SDK. */
    readonly fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = input instanceof Request ? input.url : String(input);
        const match = /^(.*)\/models\/([^/:]+):generateContent/.exec(url);
        if (!match || typeof init?.body !== "string") {
            return this.base(input, init);
        }

        [, this.apiBase, this.model] = match;
        for (let sent = 1; ; sent++) {
            const deadline = this.deadline();
            const signal = init.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
            try {
                return await this.answer(url, init.body, { ...init, signal });
            } catch (error) {
                // Only the deadline is the transport's to handle: the caller's own abort and every other failure go back.
                if (!deadline.aborted || init.signal?.aborted) {
                    throw error;
                }

                const seconds = REQUEST_DEADLINE_MS / 1000;
                if (sent >= DEADLINE_SENDS) {
                    throw new Error(
                        `${REQUEST_TIMEOUT_CODE}: Gemini answered neither this request nor its resend within ${seconds} s ` +
                            `each (tier ${this.options.tier})`,
                        { cause: error },
                    );
                }

                console.warn(
                    `[llm-regression] Gemini did not answer within ${seconds} s, sending the request once more`,
                );
            }
        }
    };

    /** One send of a generateContent request, from its body as the SDK wrote it to the recorded answer. */
    private async answer(url: string, sdkBody: string, init: RequestInit): Promise<Response> {
        const body = JSON.parse(sdkBody) as Record<string, unknown>;
        if (this.options.tier === "flex") {
            body.serviceTier = "flex";
        }

        if (this.options.cache !== false) {
            await this.useCache(body, init.signal);
        }

        const response = await this.send(url, { ...init, body: JSON.stringify(body) });
        if (response.ok) {
            this.record(((await response.clone().json()) as { usageMetadata?: UsageMetadata }).usageMetadata ?? {});
        }

        return response;
    }

    /**
     * Delete every cache this transport made.
     * @returns The run's usage
     */
    async close(): Promise<GeminiRunUsage> {
        const names = [...this.retired, ...[...this.caches.values()].flatMap((c) => (c.name ? [c.name] : []))];
        this.caches.clear();
        this.retired.length = 0;
        for (const name of names) {
            const response = await this.base(`${this.apiBase}/${name}`, {
                method: "DELETE",
                headers: { "x-goog-api-key": this.options.apiKey },
            }).catch((error: unknown) => error as Error);
            if (response instanceof Error || !response.ok) {
                const why = response instanceof Error ? response.message : `HTTP ${response.status}`;
                console.log(`[llm-regression] could not delete ${name} (${why}); it expires on its own`);
            }
        }

        return this.usage;
    }

    /**
     * The usage as the tail of the `[llm-regression] API calls` line.
     * @returns For example ", prompt tokens 1000 (cached 800), ..., cost $0.0012"
     */
    summary(): string {
        const u = this.usage;
        const cost = u.usd === undefined ? "cost unknown" : `cost $${u.usd.toFixed(4)}`;
        return (
            `, prompt tokens ${u.promptTokens} (cached ${u.cachedTokens}), output tokens ${u.outputTokens}, ` +
            `thinking tokens ${u.thinkingTokens}, flex ${u.flexServed}/${u.requests}, ` +
            `caches ${u.caches} (${u.cacheTokens} tokens), ${cost}`
        );
    }

    private async useCache(body: Record<string, unknown>, signal?: AbortSignal | null): Promise<void> {
        const prefix = { systemInstruction: body.systemInstruction, tools: body.tools, toolConfig: body.toolConfig };
        const key = createHash("sha256").update(JSON.stringify(prefix)).digest("hex");
        const entry = this.caches.get(key) ?? { seen: 0 };
        this.caches.set(key, entry);
        entry.seen++;
        // Once is not worth a cache: a prefix pays its creation back from its second use on.
        if (entry.seen < 2 || entry.refused !== undefined) {
            return;
        }

        // Replace a cache two minutes before it expires, so no request names an expired one.
        if (entry.name && this.now() - (entry.createdAt ?? 0) > (this.ttlSeconds - 120) * 1000) {
            this.retired.push(entry.name);
            entry.name = undefined;
        }

        if (!entry.name) {
            await this.create(entry, prefix, signal);
        }

        if (entry.name) {
            delete body.systemInstruction;
            delete body.tools;
            delete body.toolConfig;
            body.cachedContent = entry.name;
        }
    }

    private async create(entry: CacheEntry, prefix: Record<string, unknown>, signal?: AbortSignal | null) {
        const response = await this.base(`${this.apiBase}/cachedContents`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": this.options.apiKey },
            body: JSON.stringify({ model: `models/${this.model}`, ...prefix, ttl: `${this.ttlSeconds}s` }),
            signal,
        });
        if (!response.ok) {
            // Not a test failure: the prefix is sent whole, as before caching. A refused key fails the request itself.
            entry.refused = `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`;
            console.log(`[llm-regression] prefix sent uncached, the cache was refused (${entry.refused})`);
            return;
        }

        const cache = (await response.json()) as { name: string; usageMetadata?: { totalTokenCount?: number } };
        const tokens = cache.usageMetadata?.totalTokenCount ?? 0;
        entry.name = cache.name;
        entry.createdAt = this.now();
        this.usage.caches++;
        this.usage.cacheTokens += tokens;
        const prices = this.prices();
        this.cacheUsd += prices
            ? (tokens / 1e6) * (prices.standard.input + (STORAGE_PER_HOUR * this.ttlSeconds) / 3600) * this.rise()
            : 0;
        this.updateUsd();
    }

    private async send(url: string, init: RequestInit): Promise<Response> {
        const started = this.now();
        for (let attempt = 1; ; attempt++) {
            const response = await this.base(url, init);
            if (this.options.tier !== "flex" || (response.status !== 429 && response.status !== 503)) {
                return response;
            }

            if (ACCOUNT_REFUSAL_TEXT.test((await response.clone().text()).toLowerCase())) {
                return response;
            }

            if (attempt >= FLEX_ATTEMPTS) {
                const seconds = Math.round((this.now() - started) / 1000);
                throw new Error(
                    `${FLEX_CAPACITY_CODE}: Gemini's Flex tier had no capacity for this request on ${attempt} attempts ` +
                        `over ${seconds} s (last status ${response.status}); LLM_REGRESSION_GEMINI_TIER=standard runs ` +
                        "the suite on the Standard tier",
                );
            }

            await this.sleep(FLEX_FIRST_WAIT_MS * 2 ** (attempt - 1), init.signal);
        }
    }

    private record(meta: UsageMetadata): void {
        const prompt = meta.promptTokenCount ?? 0;
        const cached = meta.cachedContentTokenCount ?? 0;
        const output = meta.candidatesTokenCount ?? 0;
        const thinking = meta.thoughtsTokenCount ?? 0;
        // The tier that served the request, when the answer says; otherwise the one asked for.
        const tier: GeminiTier = (meta.serviceTier ?? this.options.tier).toLowerCase().includes("flex")
            ? "flex"
            : "standard";
        const u = this.usage;
        u.requests++;
        u.promptTokens += prompt;
        u.cachedTokens += cached;
        u.outputTokens += output;
        u.thinkingTokens += thinking;
        u.flexServed += tier === "flex" ? 1 : 0;
        const prices = this.prices()?.[tier];
        if (!prices) {
            this.priced = false;
        } else {
            this.tokenUsd +=
                (((prompt - cached) * prices.input + cached * prices.cached + (output + thinking) * prices.output) /
                    1e6) *
                this.rise();
        }

        this.updateUsd();
    }

    private prices() {
        return this.model === undefined ? undefined : PRICES[this.model];
    }

    private rise(): number {
        return this.now() >= PRICE_RISE ? 2 : 1;
    }

    private updateUsd(): void {
        this.usage.usd = this.priced && this.prices() ? this.tokenUsd + this.cacheUsd : undefined;
        const spent = (this.usage.usd ?? 0) - this.filedUsd;
        if (this.options.usageFile && spent > 0) {
            appendFileSync(this.options.usageFile, `${JSON.stringify({ usd: spent })}\n`);
            this.filedUsd += spent;
        }
    }
}
