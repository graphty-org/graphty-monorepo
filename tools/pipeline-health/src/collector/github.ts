// The collector's GitHub client: it signs in as the collector's GitHub App (design section 10.2), never with the
// token the sessions share, and keeps the App's rate limit for the Data sources page.

import { createSign } from "node:crypto";

import type { GhJob } from "./parse.js";

export interface AppConfig {
    appId: string;
    installationId: string;
    privateKey: string;
}

/** SSM parameter names under /graphty-health/github-app/. */
export const APP_PARAMS = {
    appId: "/graphty-health/github-app/app-id",
    installationId: "/graphty-health/github-app/installation-id",
    privateKey: "/graphty-health/github-app/private-key",
} as const;

/**
 * The release-scheduler App (Actions write), which the slice dispatcher starts story-slices.yml as; the same
 * parameters the release scheduler's move to AWS (#3608) uses.
 */
export const DISPATCH_APP_PARAMS = {
    appId: "/graphty-health/release-scheduler/app-id",
    installationId: "/graphty-health/release-scheduler/installation-id",
    privateKey: "/graphty-health/release-scheduler/private-key",
} as const;

/**
 * Reads an App's three parameters; undefined when any is missing (the App is not set up yet).
 * @param getParams - reads SSM parameters by name
 * @param names - the App's parameter names
 * @param names.appId - the App id parameter
 * @param names.installationId - the installation id parameter
 * @param names.privateKey - the private key parameter
 * @returns the App's config, or undefined when a parameter is missing
 */
export async function readAppConfig(
    getParams: (names: string[]) => Promise<Record<string, string>>,
    names: { appId: string; installationId: string; privateKey: string } = APP_PARAMS,
): Promise<AppConfig | undefined> {
    const got = await getParams(Object.values(names));
    const appId = got[names.appId];
    const installationId = got[names.installationId];
    const privateKey = got[names.privateKey];
    return appId && installationId && privateKey ? { appId, installationId, privateKey } : undefined;
}

const b64 = (o: unknown): string => Buffer.from(JSON.stringify(o)).toString("base64url");

/**
 * The App's own JWT (RS256), valid 8 minutes from a minute ago; GitHub refuses one longer than 10.
 * @param appId - the App id
 * @param privateKeyPem - the App's private key, PEM encoded
 * @param nowMs - the current time, in ms
 * @returns the signed JWT
 */
export function appJwt(appId: string, privateKeyPem: string, nowMs: number): string {
    const iat = Math.floor(nowMs / 1000) - 60;
    const data = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iat, exp: iat + 540, iss: appId })}`;
    const sig = createSign("RSA-SHA256").update(data).sign(privateKeyPem).toString("base64url");
    return `${data}.${sig}`;
}

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const API = "https://api.github.com";
const HEADERS = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "graphty-health",
};

const cached = new Map<string, { token: string; expiresMs: number }>();

/**
 * An installation token, cached in memory until 5 minutes before it expires.
 * @param cfg - the App's config
 * @param f - the fetch to use
 * @param nowMs - the current time, in ms
 * @returns the installation token
 */
export async function installationToken(cfg: AppConfig, f: Fetch, nowMs: number): Promise<string> {
    const key = `${cfg.appId}/${cfg.installationId}`;
    const hit = cached.get(key);
    if (hit && hit.expiresMs - 5 * 60_000 > nowMs) {
        return hit.token;
    }
    const res = await f(`${API}/app/installations/${cfg.installationId}/access_tokens`, {
        method: "POST",
        headers: { ...HEADERS, authorization: `Bearer ${appJwt(cfg.appId, cfg.privateKey, nowMs)}` },
    });
    if (!res.ok) {
        throw new Error(`installation token: HTTP ${res.status}`);
    }
    const body = (await res.json()) as { token: string; expires_at: string };
    cached.set(key, { token: body.token, expiresMs: Date.parse(body.expires_at) });
    return body.token;
}

/** A GitHub request answered with a non-2xx HTTP status. */
export class HttpError extends Error {
    readonly status: number;

    /**
     * An error naming the path and the status.
     * @param status - the HTTP status
     * @param path - the request path, without its query
     */
    constructor(status: number, path: string) {
        super(`GitHub ${path}: HTTP ${status}`);
        this.status = status;
    }
}

/** Waits before each retry of a request GitHub answered 5xx, rate-limited or timed out on; tests set them to 0. */
export const RETRY = { delaysMs: [1000, 3000], timeoutMs: 15_000 };
/** A rate-limit reset further away than this is not waited for: the request fails and its item is skipped. */
const MAX_WAIT_MS = 10_000;

/**
 * How long to wait before retrying `res`, or undefined when retrying cannot help.
 * @param res - the response that failed
 * @param delay - the retry's own delay, in ms
 * @returns the wait in ms, or undefined
 */
function retryWait(res: Response, delay: number): number | undefined {
    const limited =
        res.status === 429 ||
        (res.status === 403 && (res.headers.has("retry-after") || res.headers.get("x-ratelimit-remaining") === "0"));
    if (!limited) {
        return res.status >= 500 ? delay : undefined;
    }
    const after = Number(res.headers.get("retry-after")) * 1000;
    const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000 - Date.now();
    const wait = Math.max(delay, after > 0 ? after : reset || 0);
    return wait <= MAX_WAIT_MS ? wait : undefined;
}

const sleep = (ms: number): Promise<unknown> => new Promise((r) => setTimeout(r, ms));

/** A GitHub REST and GraphQL client that retries, counts calls and keeps the rate limit. */
export class GitHub {
    /** Requests left in the App's hour, from the newest response. */
    rate?: { remaining: number; limit: number };
    calls = 0;
    /** Requests that still failed after their retries; past 3, later requests are not retried (an outage). */
    failures = 0;

    private readonly token: () => Promise<string>;
    private readonly f: Fetch;

    /**
     * A client signed in with the given token.
     * @param token - returns the bearer token for each request
     * @param f - the fetch to use
     */
    constructor(token: () => Promise<string>, f: Fetch = fetch) {
        this.token = token;
        this.f = f;
    }

    /**
     * One request, retried on a 5xx, a short rate limit, a timeout or a network error (RETRY).
     * @param url - the full URL
     * @param init - the request options
     * @returns the final response
     */
    private async send(url: string, init: RequestInit): Promise<Response> {
        const delays = this.failures < 3 ? RETRY.delaysMs : [];
        for (let attempt = 0; ; attempt++) {
            const delay = delays[attempt];
            let res: Response;
            try {
                res = await this.once(url, init);
            } catch (e) {
                if (delay === undefined) {
                    this.failures++;
                    throw e;
                }
                await sleep(delay);
                continue;
            }
            const wait = res.ok || delay === undefined ? undefined : retryWait(res, delay);
            if (wait === undefined) {
                if (!res.ok && res.status !== 404) {
                    this.failures++;
                }
                return res;
            }
            await sleep(wait);
        }
    }

    private async once(url: string, init: RequestInit): Promise<Response> {
        this.calls++;
        const res = await this.f(url, {
            signal: AbortSignal.timeout(RETRY.timeoutMs),
            ...init,
            headers: {
                ...HEADERS,
                ...(init.headers as Record<string, string> | undefined),
                authorization: `Bearer ${await this.token()}`,
            },
        });
        const remaining = Number(res.headers.get("x-ratelimit-remaining"));
        const limit = Number(res.headers.get("x-ratelimit-limit"));
        if (limit > 0 && Number.isFinite(remaining)) {
            this.rate = { remaining, limit };
        }
        return res;
    }

    /**
     * GET a REST path ("repos/o/r/actions/runs?..."); undefined on 404.
     * @param path - the REST path, with its query
     * @returns the parsed JSON body, or undefined on 404
     */
    async rest<T>(path: string): Promise<T | undefined> {
        const res = await this.send(`${API}/${path}`, { method: "GET" });
        if (res.status === 404) {
            return undefined;
        }
        if (!res.ok) {
            throw new HttpError(res.status, path.split("?")[0]);
        }
        return (await res.json()) as T;
    }

    /**
     * POST a REST path with a JSON body; throws unless GitHub answers 2xx.
     * @param path - the REST path
     * @param body - the JSON body
     */
    async post(path: string, body: unknown): Promise<void> {
        const res = await this.send(`${API}/${path}`, { method: "POST", body: JSON.stringify(body) });
        if (!res.ok) {
            throw new HttpError(res.status, path.split("?")[0]);
        }
    }

    /**
     * Runs a GraphQL query; throws on an HTTP error, a GraphQL error or no data.
     * @param query - the GraphQL query
     * @param variables - the query's variables
     * @returns the response's data
     */
    async graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
        const res = await this.send(`${API}/graphql`, { method: "POST", body: JSON.stringify({ query, variables }) });
        if (!res.ok) {
            throw new HttpError(res.status, "graphql");
        }
        const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
        if (body.errors?.length || !body.data) {
            throw new Error(`GitHub graphql: ${body.errors?.[0]?.message ?? "no data"}`);
        }
        return body.data;
    }
}

/**
 * Job page sizes. GitHub answers 502 every time to a page that holds certain jobs of a large run (run 40476709992,
 * attempt 2: pages of 100, 50 and 25 fail and pages of 10 pass, 2026-10-29), so such a page is read again as smaller
 * pages over the same jobs. Each size divides the one before it.
 */
const JOB_PAGE_SIZES = [100, 50, 10, 1];

type Rest = <T>(path: string) => Promise<T | undefined>;
interface JobsPage {
    total_count: number;
    jobs: GhJob[];
}

/**
 * One page of `size` jobs, read as smaller pages when GitHub keeps answering it with a server error.
 * @param rest - GET of a REST path
 * @param path - the jobs path with its filter
 * @param size - the page size
 * @param page - the 1-based page number at that size
 * @returns the page's jobs, or undefined on 404
 */
async function jobsPage(rest: Rest, path: string, size: number, page: number): Promise<JobsPage | undefined> {
    try {
        return await rest<JobsPage>(`${path}&per_page=${size}&page=${page}`);
    } catch (e) {
        const smaller = JOB_PAGE_SIZES[JOB_PAGE_SIZES.indexOf(size) + 1];
        if (!(e instanceof HttpError) || e.status < 500 || smaller === undefined) {
            throw e;
        }
        const n = size / smaller;
        const out: JobsPage = { total_count: 0, jobs: [] };
        for (let p = (page - 1) * n + 1; p <= page * n; p++) {
            const r = await jobsPage(rest, path, smaller, p);
            out.total_count = r?.total_count ?? out.total_count;
            out.jobs.push(...(r?.jobs ?? []));
            if (!r || r.jobs.length < smaller) {
                break;
            }
        }
        return out;
    }
}

/**
 * Every job of a run or an attempt: `path` is the jobs path with its filter
 * (`repos/<r>/actions/runs/<id>[/attempts/<n>]/jobs?filter=latest|all`). Throws when a page cannot be read at any size.
 * @param rest GET of a REST path (GitHub.rest, or the backfill's throttled one)
 * @param path the jobs path
 * @returns every job read
 */
export async function runJobs(rest: Rest, path: string): Promise<GhJob[]> {
    const jobs: GhJob[] = [];
    for (let page = 1; page <= 10; page++) {
        const r = await jobsPage(rest, path, JOB_PAGE_SIZES[0], page);
        jobs.push(...(r?.jobs ?? []));
        if (!r || jobs.length >= r.total_count || r.jobs.length < JOB_PAGE_SIZES[0]) {
            break;
        }
    }
    return jobs;
}
