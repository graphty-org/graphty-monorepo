/**
 * The source context (design sections 2.1, 6.2, 7.2 and 9): the guarded `ctx.fetch` every source
 * reads through. It applies the credential only to the origins it is bound to, refuses credentials
 * in clear text and across redirects, retries what HTTP says is safe to retry, paces requests,
 * enforces the caps, counts decoded bytes, times the load out and turns every failure into a coded
 * issue. A source never sees the credential.
 */

import { throwIfAborted } from "../common/input.js";
import { type ImportReportBuilder } from "../common/report.js";
import { type ImportReport } from "../types.js";
import { type SourceBlockedCause } from "./codes.js";
import { applyCredential, endpointOrigin, originOf } from "./credentials.js";
import { failOn, warnOn } from "./fail.js";
import {
    type Credential,
    type LoadFromSourceOptions,
    type SourceContext,
    type SourceCursor,
    type SourceDescriptor,
    type SourceFinish,
    type SourceLimitOptions,
    type SourceLimits,
    type SourceReportInfo,
    type SourceRequestInit,
    type SourceRuntime,
} from "./types.js";

/** Statuses HTTP says a client may retry. */
const RETRY_STATUSES: ReadonlySet<number> = new Set([429, 502, 503, 504]);

/** Statuses whose response has no body by definition. */
const NULL_BODY_STATUSES: ReadonlySet<number> = new Set([101, 204, 205, 304]);

/** Redirect statuses. */
const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

/** Same-origin redirects followed with a credential before giving up. */
const MAX_REDIRECTS = 5;

/**
 * Thrown inside a load when a cap stops it under `onLimit: "stop"`; the runner catches it, keeps
 * what came first and records where to resume. Never leaves graph-io.
 */
export class LimitStop extends Error {
    /**
     * Create one.
     * @param limit - the cap's option name
     * @param value - the value that reached it
     */
    constructor(
        readonly limit: string,
        readonly value: number,
    ) {
        super(`${limit} reached at ${String(value)}`);
        this.name = "LimitStop";
    }
}

/**
 * Where code is running. Node is checked first, since a test may stub a `document`.
 * @returns the runtime
 */
export function detectRuntime(): SourceRuntime {
    const g = globalThis as {
        process?: { versions?: { node?: unknown } };
        importScripts?: unknown;
        window?: unknown;
        document?: unknown;
    };
    if (typeof g.process?.versions?.node === "string") {
        return "node";
    }
    if (typeof g.importScripts === "function") {
        return "worker";
    }
    return g.window !== undefined && g.document !== undefined ? "browser" : "other";
}

/**
 * A URL as reports show it: origin and path, never the query string.
 * @param url - the URL
 * @returns origin plus path
 */
function originPath(url: URL): string {
    return `${originOf(url)}${url.pathname}`;
}

/**
 * Whether a host is this machine.
 * @param hostname - the URL's hostname
 * @returns true for localhost, 127.0.0.0/8 and ::1
 */
export function isLoopback(hostname: string): boolean {
    const host = hostname.replaceAll(/(?:^\[)|(?:\]$)/g, "").toLowerCase();
    return host === "localhost" || host.endsWith(".localhost") || /^127(\.\d{1,3}){3}$/.test(host) || host === "::1";
}

/**
 * Whether a host is on a local network: loopback, private IPv4 ranges, link-local, unique local
 * IPv6 or an mDNS `.local` name.
 * @param hostname - the URL's hostname
 * @returns true for a local-network host
 */
export function isLocalNetwork(hostname: string): boolean {
    const host = hostname.replaceAll(/(?:^\[)|(?:\]$)/g, "").toLowerCase();
    return (
        isLoopback(host) ||
        host.endsWith(".local") ||
        /^10(\.\d{1,3}){3}$/.test(host) ||
        /^192\.168(\.\d{1,3}){2}$/.test(host) ||
        /^169\.254(\.\d{1,3}){2}$/.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}$/.test(host) ||
        /^f[cd][0-9a-f]{2}:/.test(host) ||
        host.startsWith("fe80:")
    );
}

/** Requests in flight and recently sent, per source and origin, for `descriptor.rateLimit`. */
interface Pacer {
    active: number;
    times: number[];
    readonly waiters: (() => void)[];
}

/** One pacer per source id and origin, shared by every load in this process. */
const PACERS = new Map<string, Pacer>();

/** What the runner reads back from a context after a load. */
export interface ContextState {
    /** Requests sent. */
    requests: number;
    /** Decoded response bytes read. */
    bytes: number;
    /** What the source passed to finish(). */
    finish: SourceFinish | null;
}

/** What createSourceContext() needs. */
interface ContextInput {
    /** The source id. */
    readonly id: string;
    /** The source's descriptor, if it has one. */
    readonly descriptor: SourceDescriptor | undefined;
    /** The caller's options. */
    readonly options: LoadFromSourceOptions;
    /** The load's report. */
    readonly report: ImportReportBuilder;
    /** The resolved endpoint. */
    readonly endpoint: URL | null;
    /** The cursor the source sees (version stripped). */
    readonly cursor: SourceCursor | null;
    /** What progress counts: "bytes" for a file source, "items" otherwise. */
    readonly unit: "items" | "bytes";
    /** What the sink has received so far. */
    readonly counts: () => { readonly nodes: number; readonly edges: number };
    /** The runtime to act as; detected when absent (tests set it). */
    readonly runtime?: SourceRuntime | undefined;
}

/** A context and what the runner needs to close it. */
export interface CreatedContext {
    /** The context handed to the source. */
    readonly ctx: SourceContext;
    /** Counters the runner reads. */
    readonly state: ContextState;
    /**
     * The report's `source` member as it stands.
     * @param next - where to resume
     * @returns the info
     */
    info(next: SourceCursor | null): SourceReportInfo;
    /** Clear the timeout and detach from the caller's signal. */
    dispose(): void;
}

/**
 * Wait, unless the signal aborts first.
 * @param ms - milliseconds
 * @param signal - the signal
 * @returns a promise that settles after the wait
 */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
            reject(signal.reason as Error);
            return;
        }
        const onAbort = (): void => {
            clearTimeout(timer);
            reject(signal.reason as Error);
        };
        const timer = setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        signal.addEventListener("abort", onAbort, { once: true });
    });
}

/**
 * The milliseconds a readable Retry-After header asks for.
 * @param response - the response
 * @returns milliseconds, or null when absent or unreadable
 */
function retryAfterMs(response: Response): number | null {
    const value = response.headers.get("retry-after");
    if (value === null) {
        return null;
    }
    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
        return Math.max(0, seconds * 1000);
    }
    const date = Date.parse(value);
    return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

/**
 * The origins a credential goes to: its own, else the endpoint's.
 * @param credential - the credential, if any
 * @param endpoint - the endpoint, if any
 * @returns the origins
 */
function boundOrigins(credential: Credential | undefined, endpoint: URL | null): readonly string[] {
    if (credential === undefined) {
        return [];
    }
    if (credential.origins.length > 0) {
        return credential.origins;
    }
    return endpoint === null ? [] : [originOf(endpoint)];
}

/** The retry settings, resolved. */
interface RetrySettings {
    readonly retries: number;
    readonly baseDelayMs: number;
    readonly maxDelayMs: number;
}

/**
 * The machinery behind one context: the guarded fetch, the caps, pacing, the timeout and the
 * counters.
 */
class SourceFetcher {
    readonly state: ContextState = { requests: 0, bytes: 0, finish: null };
    readonly signal: AbortSignal;
    readonly runtime: SourceRuntime;
    private readonly controller = new AbortController();
    private readonly fetchImpl: typeof fetch;
    private readonly limitOptions: SourceLimitOptions;
    private readonly retry: RetrySettings;
    private readonly credentialOrigins: readonly string[];
    private readonly warnedLimits = new Set<string>();
    private readonly timer: ReturnType<typeof setTimeout> | undefined;
    private byteTotal: number | undefined;

    /**
     * Set up one call.
     * @param input - the source, options, report and counters
     */
    constructor(private readonly input: ContextInput) {
        const { options, endpoint } = input;
        this.runtime = input.runtime ?? detectRuntime();
        this.fetchImpl = options.fetch ?? ((...args) => globalThis.fetch(...args));
        this.limitOptions = options.limits ?? {};
        const retry = options.retry === false ? { retries: 0 } : (options.retry ?? {});
        this.retry = {
            retries: retry.retries ?? 3,
            baseDelayMs: retry.baseDelayMs ?? 500,
            maxDelayMs: retry.maxDelayMs ?? 30_000,
        };
        this.credentialOrigins = boundOrigins(options.credential, endpoint);
        // one controller for the caller's signal and the load timeout; its reason is what rejects
        const callerSignal = options.signal;
        if (callerSignal?.aborted === true) {
            this.controller.abort(callerSignal.reason);
        } else {
            callerSignal?.addEventListener("abort", this.onCallerAbort, { once: true });
        }
        const { timeoutMs } = this.limitOptions;
        this.timer =
            timeoutMs === undefined
                ? undefined
                : setTimeout(() => {
                      this.timeOut(timeoutMs);
                  }, timeoutMs);
        this.signal = this.controller.signal;
    }

    /** Clear the timeout and detach from the caller's signal. */
    dispose(): void {
        clearTimeout(this.timer);
        this.input.options.signal?.removeEventListener("abort", this.onCallerAbort);
    }

    /** Forward the caller's abort, with its reason. */
    private readonly onCallerAbort = (): void => {
        this.controller.abort(this.input.options.signal?.reason);
    };

    /**
     * Abort the load with E_SOURCE_TIMEOUT as the reason.
     * @param timeoutMs - the limit that passed
     */
    private timeOut(timeoutMs: number): void {
        try {
            failOn(this.input.report, "E_SOURCE_TIMEOUT", `the load ran longer than ${String(timeoutMs)} ms`, {
                origin: endpointOrigin(this.input.endpoint),
                timeoutMs,
                serverSide: false,
            });
        } catch (err) {
            this.controller.abort(err);
        }
    }

    /**
     * A cap was reached: fail under "error", else warn once and stop.
     * @param limit - the option name
     * @param value - the value reached
     */
    limitHit(limit: string, value: number): never {
        const { report } = this.input;
        if ((this.limitOptions.onLimit ?? "stop") === "error") {
            failOn(report, "E_SOURCE_LIMIT", `${limit} of ${String(value)} reached`, { limit, value });
        }
        if (!this.warnedLimits.has(limit)) {
            this.warnedLimits.add(limit);
            warnOn(report, "W_SOURCE_LIMIT", `${limit} reached at ${String(value)}; what came first is kept`, {
                limit,
                value,
            });
        }
        throw new LimitStop(limit, value);
    }

    /**
     * Whether a cap is reached; warns once under "stop", throws under "error".
     * @returns true when the source should stop
     */
    reached(): boolean {
        const { nodes, edges } = this.input.counts();
        const caps: [string, number, number | undefined][] = [
            ["maxNodes", nodes, this.limitOptions.maxNodes],
            ["maxEdges", edges, this.limitOptions.maxEdges],
            ["maxBytes", this.state.bytes, this.limitOptions.maxBytes],
            ["maxRequests", this.state.requests, this.limitOptions.maxRequests],
        ];
        const hit = caps.find(([, value, cap]) => cap !== undefined && value >= cap);
        if (hit === undefined) {
            return false;
        }
        try {
            this.limitHit(hit[0], hit[1]);
        } catch (err) {
            if (!(err instanceof LimitStop)) {
                throw err;
            }
        }
        return true;
    }

    /**
     * Report progress.
     * @param done - how much is done
     * @param total - the total, when known
     * @param unit - what is counted
     */
    progress(done: number, total?: number, unit: "items" | "bytes" = "items"): void {
        if (unit === "bytes") {
            this.byteTotal = total;
        }
        this.input.options.onProgress?.(done, total, unit);
    }

    /**
     * Resolve a request URL against the endpoint and refuse what must never be sent.
     * @param target - the source's URL
     * @returns the absolute URL
     */
    private resolve(target: string | URL): URL {
        const { report, endpoint } = this.input;
        let url: URL;
        try {
            url = endpoint === null ? new URL(target) : new URL(target, endpoint);
        } catch {
            return failOn(report, "E_SOURCE_PARAM", "a relative URL needs an endpoint", {
                name: "endpoint",
                reason: "missing",
            });
        }
        if (url.username !== "" || url.password !== "") {
            failOn(report, "E_SOURCE_PARAM", "a URL may not carry a user name or password", {
                name: "endpoint",
                reason: "credentials-in-url",
            });
        }
        const page = (globalThis as { location?: { protocol?: string } }).location;
        const plain = url.protocol === "http:" || url.protocol === "ws:";
        if (this.runtime === "browser" && page?.protocol === "https:" && plain && !isLoopback(url.hostname)) {
            failOn(report, "E_SOURCE_RUNTIME", "an https page cannot reach a plain http endpoint", {
                runtime: this.runtime,
                reason: "insecure-endpoint",
            });
        }
        return url;
    }

    /**
     * Wait for a slot under the descriptor's rate limit.
     * @param url - the request URL
     * @returns a release function
     */
    private async pace(url: URL): Promise<() => void> {
        const rate = this.input.descriptor?.rateLimit;
        if (rate === undefined) {
            return () => undefined;
        }
        const key = `${this.input.id} ${originOf(url)}`;
        const p = PACERS.get(key) ?? { active: 0, times: [], waiters: [] };
        PACERS.set(key, p);
        for (;;) {
            const now = Date.now();
            p.times = p.times.filter((t) => now - t < rate.perMs);
            if (rate.concurrent !== undefined && p.active >= rate.concurrent) {
                await new Promise<void>((r) => p.waiters.push(r));
            } else if (p.times.length >= rate.requests) {
                await sleep(Math.max(1, rate.perMs - (now - p.times[0])), this.signal);
            } else {
                p.times.push(now);
                p.active++;
                return () => {
                    p.active--;
                    p.waiters.shift()?.();
                };
            }
        }
    }

    /**
     * Count the decoded bytes of a body as it is read, against `maxBytes`.
     * @param response - the response
     * @returns the response, with a counted body
     */
    private counted(response: Response): Response {
        if (response.body === null || NULL_BODY_STATUSES.has(response.status)) {
            return response;
        }
        const counter = new TransformStream<Uint8Array, Uint8Array>({
            transform: (chunk, ctrl): void => {
                this.state.bytes += chunk.byteLength;
                const cap = this.limitOptions.maxBytes;
                if (cap !== undefined && this.state.bytes > cap) {
                    this.limitHit("maxBytes", this.state.bytes);
                }
                if (this.input.unit === "bytes") {
                    this.input.options.onProgress?.(this.state.bytes, this.byteTotal, "bytes");
                }
                ctrl.enqueue(chunk);
            },
        });
        return new Response(response.body.pipeThrough(counter), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    }

    /**
     * Raise the coded issue of a status outside 200 to 299.
     * @param response - the response
     * @param url - the request URL
     * @returns never; it throws
     */
    private async statusFailure(response: Response, url: URL): Promise<never> {
        await response.body?.cancel().catch(() => undefined);
        const { report } = this.input;
        const { status } = response;
        const where = originPath(url);
        switch (status) {
            case 401:
                return failOn(report, "E_SOURCE_AUTH", `${where} answered 401`, {
                    origin: originOf(url),
                    status,
                    scheme: response.headers.get("www-authenticate")?.split(/\s/)[0] ?? null,
                    serverCode: null,
                });
            case 403:
                return failOn(report, "E_SOURCE_FORBIDDEN", `${where} answered 403`, {
                    origin: originOf(url),
                    status,
                    serverCode: null,
                });
            case 404:
                return failOn(report, "E_SOURCE_NOT_FOUND", `${where} answered 404`, {
                    origin: originOf(url),
                    what: "url",
                    value: where,
                });
            case 429:
                return failOn(report, "E_SOURCE_QUOTA", `${where} answered 429`, {
                    origin: originOf(url),
                    retryAfterMs: retryAfterMs(response),
                });
            default:
                return failOn(report, "E_FETCH", `${where} answered ${String(status)}`, { url: where, status });
        }
    }

    /**
     * Build one request, with the credential when the URL's origin is bound.
     * @param url - the request URL
     * @param init - the source's init
     * @param attach - whether the credential goes with it
     * @returns the request
     */
    private async request(url: URL, init: SourceRequestInit, attach: boolean): Promise<Request> {
        const { options, report } = this.input;
        const headers = new Headers(init.headers);
        if (options.userAgent !== undefined && this.runtime === "node") {
            headers.set("User-Agent", options.userAgent);
        }
        const { retry: _retry, idempotent: _idempotent, allowStatus: _allowStatus, ...requestInit } = init;
        const guarded: RequestInit = {
            cache: "no-store",
            credentials: "omit",
            redirect: this.runtime === "browser" ? "error" : "manual",
        };
        const request = new Request(url, { ...requestInit, headers, signal: this.signal, ...(attach ? guarded : {}) });
        if (!attach || options.credential === undefined) {
            return request;
        }
        const signed = await applyCredential(options.credential, request);
        const after = new URL(signed.url);
        if (originOf(after) !== originOf(url)) {
            failOn(report, "E_SOURCE_REDIRECT", "the credential changed the request's origin", {
                from: originPath(url),
                to: originPath(after),
            });
        }
        return signed;
    }

    /**
     * Send one request, following same-origin redirects by hand while a credential is attached.
     * @param url - the request URL
     * @param init - the source's init
     * @param hops - redirects followed so far
     * @returns the response
     */
    private async send(url: URL, init: SourceRequestInit, hops: number): Promise<Response> {
        const { options, report } = this.input;
        const attach = options.credential !== undefined && this.credentialOrigins.includes(originOf(url));
        const plain = url.protocol === "http:" || url.protocol === "ws:";
        if (attach && plain && !isLoopback(url.hostname) && options.allowInsecure !== true) {
            failOn(report, "E_SOURCE_PARAM", "a credential is never sent without TLS", {
                name: "endpoint",
                reason: "insecure-endpoint",
            });
        }
        const request = await this.request(url, init, attach);
        this.state.requests++;
        const response = await this.fetchImpl(request);
        if (!attach || !REDIRECT_STATUSES.has(response.status)) {
            return response;
        }
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => undefined);
        const to = location === null ? null : new URL(location, url);
        if (to === null || originOf(to) !== originOf(url) || hops >= MAX_REDIRECTS) {
            return failOn(report, "E_SOURCE_REDIRECT", "a redirect while a credential was attached", {
                from: originPath(url),
                to: to === null ? null : originPath(to),
            });
        }
        return this.send(to, response.status === 303 ? { ...init, method: "GET", body: null } : init, hops + 1);
    }

    /**
     * Whether a browser refused a credentialed request because it was redirected (sent with
     * `redirect: "error"`, which fails like a CORS refusal): the same URL once more, WITHOUT the
     * credential, under `redirect: "manual"`, whose answer to a redirect is an opaque redirect.
     * @param url - the refused URL
     * @returns true when the URL answers with a redirect
     */
    private async redirects(url: URL): Promise<boolean> {
        if (this.input.options.retry === false) {
            return false;
        }
        try {
            const response = await this.fetchImpl(url, {
                method: "GET",
                redirect: "manual",
                credentials: "omit",
                cache: "no-store",
                signal: this.signal,
            });
            await response.body?.cancel().catch(() => undefined);
            return response.type === "opaqueredirect";
        } catch {
            throwIfAborted(this.signal);
            return false;
        }
    }

    /**
     * Why the browser refused a request: one bodyless no-cors GET of the origin's root.
     * @param url - the refused URL
     * @returns the cause
     */
    private async diagnose(url: URL): Promise<SourceBlockedCause> {
        const page = (globalThis as { location?: { hostname?: string } }).location;
        if (page?.hostname !== undefined && !isLocalNetwork(page.hostname) && isLocalNetwork(url.hostname)) {
            return "local-network";
        }
        if (this.input.options.retry === false) {
            return "unknown";
        }
        try {
            await this.fetchImpl(`${originOf(url)}/`, {
                mode: "no-cors",
                method: "GET",
                credentials: "omit",
                cache: "no-store",
                signal: this.signal,
            });
            return "cors";
        } catch {
            throwIfAborted(this.signal);
            return "unreachable";
        }
    }

    /**
     * A full-jitter backoff delay.
     * @param attempt - the attempt that failed, from 0
     * @returns milliseconds
     */
    private backoff(attempt: number): number {
        const jitter = Math.random(); // NOSONAR(S2245): retry jitter, not a security value
        return jitter * Math.min(this.retry.maxDelayMs, this.retry.baseDelayMs * 2 ** attempt);
    }

    /**
     * What a network failure becomes: a retry (true), or the coded issue.
     * @param err - what fetch threw
     * @param url - the request URL
     * @param attempt - the attempt, from 0
     * @param tries - the retries allowed
     * @param statuses - the statuses seen so far
     * @param probeRedirect - whether a refused redirect may explain it (a credentialed GET or HEAD)
     * @returns true to retry
     */
    private async networkFailure(
        err: unknown,
        url: URL,
        attempt: number,
        tries: number,
        statuses: (number | null)[],
        probeRedirect: boolean,
    ): Promise<boolean> {
        throwIfAborted(this.signal);
        if (!(err instanceof TypeError)) {
            throw err;
        }
        const { report } = this.input;
        statuses.push(null);
        if (this.runtime === "browser") {
            if (probeRedirect && (await this.redirects(url))) {
                return failOn(report, "E_SOURCE_REDIRECT", "a redirect while a credential was attached", {
                    from: originPath(url),
                    to: null,
                });
            }
            const cause = await this.diagnose(url);
            // a hidden 429 looks like a CORS refusal, so that one cause is retried once
            if (cause === "cors" && attempt === 0 && tries > 0) {
                await sleep(this.backoff(0), this.signal);
                return true;
            }
            return failOn(report, "E_SOURCE_BLOCKED", `the browser refused ${originPath(url)}`, {
                url: originPath(url),
                cause,
            });
        }
        if (attempt < tries) {
            await sleep(this.backoff(attempt), this.signal);
            return true;
        }
        return failOn(report, "E_FETCH", `${originPath(url)} could not be reached`, {
            url: originPath(url),
            status: null,
        });
    }

    /**
     * Send one attempt under the request cap and the rate limit.
     * @param url - the request URL
     * @param init - the source's init
     * @param attempt - the attempt, from 0
     * @param tries - the retries allowed
     * @param statuses - the statuses seen so far
     * @returns the response, or null to try again
     */
    private async attempt(
        url: URL,
        init: SourceRequestInit,
        attempt: number,
        tries: number,
        statuses: (number | null)[],
    ): Promise<Response | null> {
        const cap = this.limitOptions.maxRequests;
        if (cap !== undefined && this.state.requests >= cap) {
            this.limitHit("maxRequests", this.state.requests);
        }
        const release = await this.pace(url);
        try {
            return await this.send(url, init, 0);
        } catch (err) {
            const method = (init.method ?? "GET").toUpperCase();
            const credentialed =
                this.input.options.credential !== undefined && this.credentialOrigins.includes(originOf(url));
            await this.networkFailure(
                err,
                url,
                attempt,
                tries,
                statuses,
                credentialed && (method === "GET" || method === "HEAD"),
            );
            return null;
        } finally {
            release();
        }
    }

    /**
     * The guarded fetch handed to sources.
     * @param target - the URL, relative to the endpoint or absolute
     * @param init - fetch's init and the source options
     * @returns the response
     */
    async fetch(target: string | URL, init: SourceRequestInit = {}): Promise<Response> {
        throwIfAborted(this.signal);
        const url = this.resolve(target);
        const method = (init.method ?? "GET").toUpperCase();
        const idempotent = method === "GET" || method === "HEAD" || init.idempotent === true;
        const tries = init.retry === false || !idempotent ? 0 : this.retry.retries;
        const statuses: (number | null)[] = [];
        for (let attempt = 0; ; attempt++) {
            const response = await this.attempt(url, init, attempt, tries, statuses);
            if (response === null) {
                continue;
            }
            if (!RETRY_STATUSES.has(response.status) || attempt >= tries) {
                return this.settle(response, url, init, attempt, statuses);
            }
            statuses.push(response.status);
            const asked = retryAfterMs(response);
            await response.body?.cancel().catch(() => undefined);
            await sleep(asked === null ? this.backoff(attempt) : Math.min(asked, this.retry.maxDelayMs), this.signal);
        }
    }

    /**
     * What a fetch returns: a retried success warned, a failing status raised, the body counted.
     * @param response - the response
     * @param url - the request URL
     * @param init - the source's init
     * @param attempt - the attempt, from 0
     * @param statuses - the statuses retried before it
     * @returns the counted response
     */
    private settle(
        response: Response,
        url: URL,
        init: SourceRequestInit,
        attempt: number,
        statuses: readonly (number | null)[],
    ): Response | Promise<never> {
        if (statuses.length > 0 && response.ok) {
            const attempts = attempt + 1;
            warnOn(
                this.input.report,
                "W_SOURCE_RETRIED",
                `${originPath(url)} answered after ${String(attempts)} attempts`,
                {
                    attempts,
                    statuses,
                },
            );
        }
        if (!response.ok && response.status !== 304 && !(init.allowStatus ?? []).includes(response.status)) {
            return this.statusFailure(response, url);
        }
        return this.counted(response);
    }

    /**
     * Fetch and parse JSON.
     * @param target - the URL
     * @param init - the request init
     * @returns the parsed body
     */
    async fetchJson<T>(target: string | URL, init: SourceRequestInit = {}): Promise<T> {
        const headers = new Headers(init.headers);
        if (!headers.has("accept")) {
            headers.set("Accept", "application/json");
        }
        const response = await this.fetch(target, { ...init, headers });
        let text: string;
        try {
            text = await response.text();
        } catch (err) {
            throwIfAborted(this.signal);
            throw err;
        }
        try {
            return JSON.parse(text) as T;
        } catch {
            return failOn(this.input.report, "E_SOURCE_RESPONSE", "the response is not JSON", {
                origin: originOf(this.resolve(target)),
                expected: "json",
                contentType: response.headers.get("content-type"),
            });
        }
    }

    /**
     * The report's `source` member as it stands.
     * @param next - where to resume
     * @returns the info
     */
    info(next: SourceCursor | null): SourceReportInfo {
        const { finish } = this.state;
        const { id, descriptor, endpoint } = this.input;
        return Object.freeze({
            id,
            version: descriptor?.version ?? 1,
            endpoint: endpoint === null ? null : originPath(endpoint),
            requests: this.state.requests,
            bytes: this.state.bytes,
            next,
            ...(finish?.server === undefined ? {} : { server: finish.server }),
            ...(finish?.budget === undefined ? {} : { budget: finish.budget }),
            ...(finish?.validators === undefined ? {} : { validators: finish.validators }),
            ...(finish?.total === undefined ? {} : { total: finish.total }),
        });
    }
}

/** The caller's options behind each context, for transports that cannot go through ctx.fetch. */
const CONTEXT_OPTIONS = new WeakMap<SourceContext, LoadFromSourceOptions>();

/**
 * The credential and transport options of a context's load. Internal to graph-io: a transport that
 * hands a credential to a driver (Bolt) reads it here and applies the origin and TLS rules itself.
 * Sources outside graph-io never see a credential.
 * @param ctx - the context
 * @returns the options that matter to a transport
 */
export function transportOptions(
    ctx: SourceContext,
): Pick<LoadFromSourceOptions, "credential" | "allowInsecure" | "userAgent"> {
    const options = CONTEXT_OPTIONS.get(ctx) ?? {};
    return { credential: options.credential, allowInsecure: options.allowInsecure, userAgent: options.userAgent };
}

/**
 * Create the context of one source call.
 * @param input - the source, options, report and counters
 * @returns the context and its controls
 */
export function createSourceContext(input: ContextInput): CreatedContext {
    const f = new SourceFetcher(input);
    const limits: SourceLimits = Object.freeze({ ...input.options.limits, reached: () => f.reached() });
    const ctx: SourceContext = Object.freeze({
        fetch: (target: string | URL, init?: SourceRequestInit) => f.fetch(target, init),
        fetchJson: <T>(target: string | URL, init?: SourceRequestInit) => f.fetchJson<T>(target, init),
        endpoint: input.endpoint,
        signal: f.signal,
        report: input.report,
        limits,
        cursor: input.cursor,
        runtime: f.runtime,
        progress: (done: number, total?: number, unit?: "items" | "bytes") => {
            f.progress(done, total, unit);
        },
        finish: (result?: SourceFinish): ImportReport => {
            f.state.finish = result ?? {};
            return Object.freeze({ ...input.report.finish(), source: f.info(result?.next ?? null) });
        },
    });
    CONTEXT_OPTIONS.set(ctx, input.options);
    return {
        ctx,
        state: f.state,
        info: (next) => f.info(next),
        dispose: () => {
            f.dispose();
        },
    };
}
