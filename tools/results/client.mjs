// client.mjs -- the test results store's client (design/ci/channels-pipeline/results-service.md).
//
// Every call fails open: it never throws, each attempt gives up after 5 s (a plan or a record) or 2 s (a failure
// event), a request with no answer is sent twice more (RETRY_MS), and a missing answer is `null`, which callers
// read as "run everything, excuse nothing". An invocation record the store did not take is lost: the caller logs it,
// and nothing re-posts it later (#7266).
//
// Configuration, from the environment, then the repository's .env for the local token:
//   RESULTS_URL             the Worker's URL; unset, the client does nothing
//   GRAPHTY_RESULTS=0       turns it off
//   GRAPHTY_RESULTS_TOKEN   a local token (kind `local`); in GitHub Actions the job's OIDC token is used instead
//                           (audience `graphty-results`, ACTIONS_ID_TOKEN_REQUEST_URL / _TOKEN)
//   HEALTH_API_URL          the pipeline health API (issue #3602); with the store configured, in GitHub Actions every
//                           POST is also sent there with its own OIDC token (audience `graphty-health`), fire and forget:
//                           2 s at most, never awaited by the caller; flushHealth() settles them
//                           (so it may hold a body the store refused, and miss one the store never got)
//
// Bodies carry `X-Results-Schema: 1`. A batch of failure events is `{ invocation, failures: [...] }`; a single
// event is `{ invocation, file, name, status, message }`.

import { existsSync, readFileSync } from "node:fs";
import { cpus } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseEnvFile } from "../sonar/api.mjs";

export const SCHEMA = 1;
export const RECORD_MS = 5000;
// The plan read: one per run, and its answer sizes every test bin (no answer packs bins without history, many
// times too many jobs), so it may take longer than a record write.
export const PLAN_MS = 20000;
export const EVENT_MS = 2000;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const AUDIENCE = "graphty-results";
export const HEALTH_AUDIENCE = "graphty-health";
export const HEALTH_MS = 2000;

/**
 * The client's settings, or null when the store is not configured or switched off.
 * @param [env] the environment
 * @param [root] the repository holding `.env`
 * @returns `{ url, token, oidc }`, plus `health` (the health API's URL) when HEALTH_API_URL is set in Actions, or null
 */
export function config(env = process.env, root = ROOT) {
    if (env.GRAPHTY_RESULTS === "0" || !env.RESULTS_URL) return null;
    const oidc = env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN ? env : null;
    let token = env.GRAPHTY_RESULTS_TOKEN;
    if (!token && !oidc && existsSync(join(root, ".env"))) {
        token = parseEnvFile(readFileSync(join(root, ".env"), "utf8"), "GRAPHTY_RESULTS_TOKEN");
    }
    if (!token && !oidc) return null;
    const cfg = { url: env.RESULTS_URL.replace(/\/$/, ""), token, oidc };
    if (env.HEALTH_API_URL && oidc) cfg.health = env.HEALTH_API_URL.replace(/\/$/, "");
    return cfg;
}

// One entry per request URL and audience: the token's promise and, once it has arrived, its expiry. The health
// copies also share a request still in flight (under its own 2 s, each copy waiting until its own deadline), so a burst of failure events asks
// for one token; the store's callers, whose deadlines differ, only reuse a token that has arrived. A request that
// fails leaves the cache, so the next call asks again.
const oidcCache = new Map();

function bearer(cfg, signal, audience = AUDIENCE, shareInFlight = false) {
    if (cfg.token) return Promise.resolve(cfg.token);
    const key = `${cfg.oidc.ACTIONS_ID_TOKEN_REQUEST_URL}|${audience}`;
    const hit = oidcCache.get(key);
    if (hit?.exp !== undefined && hit.exp - 60 > Date.now() / 1000) return hit.value;
    if (hit && hit.exp === undefined && shareInFlight) return until(hit.value, signal);
    const entry = {};
    entry.value = (async () => {
        const res = await fetch(`${cfg.oidc.ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${audience}`, {
            headers: { authorization: `Bearer ${cfg.oidc.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
            // a shared request has its own deadline; each caller waits for it only until its own
            signal: shareInFlight ? AbortSignal.timeout(HEALTH_MS) : signal,
        });
        if (!res.ok) throw new Error(`OIDC token: HTTP ${res.status}`);
        const { value } = await res.json();
        entry.exp = JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString()).exp ?? 0;
        oidcCache.set(key, entry);
        return value;
    })();
    if (!shareInFlight) return entry.value;
    oidcCache.set(key, entry);
    entry.value.catch(() => oidcCache.get(key) === entry && oidcCache.delete(key));
    return until(entry.value, signal);
}

/**
 * A promise that settles as `p` does, or rejects with the signal's reason once it aborts.
 * @param p the promise
 * @param signal the caller's deadline
 * @returns the race
 */
function until(p, signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(signal.reason);
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        p.then(resolve, reject);
    });
}

const healthPending = new Set();

/**
 * Sends one POST to the health API as well, fire and forget: its own OIDC token (audience graphty-health), 2 s in
 * all, never awaited by call(), never throws. A CLI that ends with process.exit() awaits
 * flushHealth() first; one that ends on its own waits at most the 2 s.
 * @param cfg config() with `health`
 * @param path the route
 * @param body the JSON body
 */
export function sendHealth(cfg, path, body) {
    const signal = AbortSignal.timeout(HEALTH_MS);
    const p = bearer({ oidc: cfg.oidc }, signal, HEALTH_AUDIENCE, true)
        .then((auth) =>
            fetch(cfg.health + path, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${auth}`,
                    "content-type": "application/json",
                    "x-results-schema": `${SCHEMA}`,
                },
                body: body === undefined ? undefined : JSON.stringify(body),
                signal,
            }),
        )
        .then((res) => res.body?.cancel())
        .catch(() => {})
        .finally(() => healthPending.delete(p));
    healthPending.add(p);
}

/**
 * Sends a CI shard's flaky tests -- failed on try 1, passed on its retry (tools/test-quarantine.mjs) -- to the health
 * API as try 1's failures with `flaky: true`, through sendHealth(). Needs no results store: only HEALTH_API_URL and
 * an OIDC token in GitHub Actions (the job's `id-token: write`); anything else sends nothing. Never throws.
 * @param env the environment
 * @param shard the shard
 * @param family the shard's family (the dashboard's grouping; the id alone does not give it)
 * @param flaky the tests `{ file, name, text?, message? }`
 */
export function postFlaky(env, shard, family, flaky) {
    if (
        !flaky.length ||
        env.GRAPHTY_RESULTS === "0" ||
        !env.HEALTH_API_URL ||
        !env.ACTIONS_ID_TOKEN_REQUEST_URL ||
        !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
    )
        return;
    // try 1 of the group's invocation, as tools/results/run-group.mjs names it (baseId()) when it runs the shard
    const id =
        env.GRAPHTY_RESULTS_INVOCATION ??
        `${env.GITHUB_RUN_ID}.${env.GITHUB_RUN_ATTEMPT ?? 1}.${env.GITHUB_JOB ?? "job"}.${shard}`;
    const failures = flaky.map((f) => ({
        file: f.file,
        name: f.name,
        message: (f.text ?? f.message ?? "").slice(0, 2000),
        ...(f.pictures ? { pictures: f.pictures } : {}),
    }));
    sendHealth({ oidc: env, health: env.HEALTH_API_URL.replace(/\/$/, "") }, "/v1/failures", {
        invocation: `${id}.1`,
        flaky: true,
        family,
        ...(env.GITHUB_SHA ? { sha: env.GITHUB_SHA } : {}),
        failures,
    });
}

/**
 * Sends one benchmark job's results to the health API (`POST /v1/benchmarks`), through sendHealth(), so the dashboard
 * keeps each benchmark's trend. Like postFlaky(): only HEALTH_API_URL and an OIDC token in GitHub Actions; anything
 * else sends nothing. Never throws. Names the machine that measured them (this runner's CPU model): hosted runners
 * land on CPUs about 2x apart, and the dashboard compares a result only with results of the same machine.
 * @param env the environment
 * @param source what measured them ("algorithms", "webgpu-graph-algorithms")
 * @param rows the results `{ name, value, input? }`, milliseconds
 * @returns whether it was sent
 */
export function postBenchmarks(env, source, rows) {
    if (
        !rows.length ||
        env.GRAPHTY_RESULTS === "0" ||
        !env.HEALTH_API_URL ||
        !env.ACTIONS_ID_TOKEN_REQUEST_URL ||
        !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
    )
        return false;
    sendHealth({ oidc: env, health: env.HEALTH_API_URL.replace(/\/$/, "") }, "/v1/benchmarks", {
        source,
        unit: "ms",
        ...(env.GITHUB_SHA ? { sha: env.GITHUB_SHA } : {}),
        ...(cpus()[0]?.model ? { machine: cpus()[0].model.trim() } : {}),
        rows,
    });
    return true;
}

/**
 * Settles every health POST still open, each within its own 2 s. Never throws.
 * @returns a promise that resolves when they have
 */
export function flushHealth() {
    return Promise.allSettled([...healthPending]);
}

// A request that got no HTTP response at all (no answer in time, a network error) or a 5xx is sent again after
// these waits: a Worker cold start, a network blip or one failed store answer must not fail a release job (#4183).
// One that got any other response (2xx, 4xx) is never sent again. Every write route of the store is idempotent (INSERT OR IGNORE / OR REPLACE on its key, or deduped
// on it), and answers a re-send from the same run as it answered the first (a base check's claim is the run's, and
// a re-posted record is judged again: #7265), so a write that arrived but whose answer was lost is safe to send again.
export const RETRY_MS = [1000, 3000];

/**
 * One request to the store, sent again when no answer or a 5xx came (RETRY_MS). Never throws.
 * @param cfg config()
 * @param method GET, POST or PUT
 * @param path e.g. `/v1/invocations`
 * @param [body] JSON body
 * @param [ms] the timeout for each attempt
 * @returns `{ ok: true, data }` or `{ ok: false, why }`
 */
export async function call(cfg, method, path, body = undefined, ms = RECORD_MS) {
    if (!cfg) return { ok: false, why: "results store not configured" };
    if (cfg.health && method === "POST") sendHealth(cfg, path, body);
    const waits = cfg.retryMs ?? RETRY_MS;
    for (let i = 0; ; i++) {
        const r = await attempt(cfg, method, path, body, ms);
        if (r.answered) return r.result;
        // `down`: no answer at all, or a 5xx, after every retry; a 4xx refusal is an answer
        if (i >= waits.length) return { ...r.result, down: true };
        await new Promise((resolve) => setTimeout(resolve, waits[i]));
    }
}

/**
 * A refused answer's body as one short line for a log: whitespace collapsed, 200 characters at most, and anything
 * shaped like a bearer credential masked, in case a store error ever echoes a request header.
 * @param text the response body
 * @returns the summary, or "" for an empty body
 */
export function bodySummary(text) {
    return text
        .replaceAll(/bearer\s+\S+/gi, "Bearer ***")
        .replaceAll(/\s+/g, " ")
        .trim()
        .slice(0, 200);
}

async function attempt(cfg, method, path, body, ms) {
    const deadline = AbortSignal.timeout(ms);
    let res;
    try {
        const auth = await bearer(cfg, deadline);
        res = await fetch(cfg.url + path, {
            method,
            headers: {
                authorization: `Bearer ${auth}`,
                "content-type": "application/json",
                "x-results-schema": `${SCHEMA}`,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: deadline,
        });
        if (!res.ok) {
            const summary = bodySummary(await res.text().catch(() => ""));
            const why = summary ? `HTTP ${res.status}: ${summary}` : `HTTP ${res.status}`;
            return { answered: res.status < 500, result: { ok: false, why } };
        }
        const text = await res.text();
        return { answered: true, result: { ok: true, data: text ? JSON.parse(text) : null } };
    } catch (e) {
        // fetch() says only "fetch failed"; the cause names the network error (ECONNREFUSED, ENOTFOUND, ...)
        const cause = e.cause?.message ?? e.cause?.code;
        let why = cause ? `${e.message} (${cause})` : e.message;
        if (e.name === "TimeoutError") why = `no answer in ${ms / 1000} s`;
        return { answered: res !== undefined, result: { ok: false, why } };
    }
}

/**
 * Posts one test group's record.
 * @param cfg config()
 * @param rec the record (results-service.md 5.1)
 * @param [ms] the timeout
 * @returns call()'s result
 */
export function postInvocation(cfg, rec, ms = RECORD_MS) {
    return call(cfg, "POST", "/v1/invocations", rec, ms);
}

/**
 * Sends failure events: one failure, or a batch.
 * @param cfg config()
 * @param invocation the invocation id
 * @param failures `[{ file, name, status, message }]`
 * @returns call()'s result
 */
export function postFailures(cfg, invocation, failures) {
    const body = failures.length === 1 ? { invocation, ...failures[0] } : { invocation, failures };
    return call(cfg, "POST", "/v1/failures", body, EVENT_MS);
}

/**
 * The run's plan (results-service.md 5.3) as call() answers it, so a caller can log why there is none.
 * @param cfg config()
 * @param query `{ sha, base, variants, inputs, files }`; arrays are joined with commas
 * @returns `{ ok: true, data }` or `{ ok: false, why }` (an HTTP status and body summary, a timeout or a network error)
 */
export function fetchPlan(cfg, query) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined) q.set(k, Array.isArray(v) ? v.join(",") : v);
    return call(cfg, "GET", `/v1/plan?${q}`, undefined, PLAN_MS);
}

/**
 * The run's plan (results-service.md 5.3), or null: no plan means no reuse, no quarantine, no excuse.
 * @param cfg config()
 * @param query `{ sha, base, variants, inputs, files }`; arrays are joined with commas
 * @returns the plan or null
 */
export async function readPlan(cfg, query) {
    const r = await fetchPlan(cfg, query);
    return r.ok ? r.data : null;
}
