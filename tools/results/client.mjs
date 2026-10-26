// client.mjs -- the test results store's client (design/ci/channels-pipeline/results-service.md).
//
// Every call fails open: it never throws, it gives up after 5 s (a plan or a record) or 2 s (a failure
// event), and a missing answer is `null`, which callers read as "run everything, excuse nothing". An
// invocation record that could not be sent is written to the spool directory, for a later re-post.
//
// Configuration, from the environment, then the repository's .env for the local token:
//   RESULTS_URL             the Worker's URL; unset, the client does nothing
//   GRAPHTY_RESULTS=0       turns it off
//   GRAPHTY_RESULTS_TOKEN   a local token (kind `local`); in GitHub Actions the job's OIDC token is used instead
//                           (audience `graphty-results`, ACTIONS_ID_TOKEN_REQUEST_URL / _TOKEN)
//   HEALTH_API_URL          the pipeline health API (issue #3602); with the store configured, in GitHub Actions every
//                           POST is also sent there with its own OIDC token (audience `graphty-health`), fire and forget:
//                           2 s at most, never awaited by the caller, never spooled; flushHealth() settles them
//                           (so it may hold a body the store refused, and miss one the store spooled)
//
// Bodies carry `X-Results-Schema: 1`. A batch of failure events is `{ invocation, failures: [...] }`; a single
// event is `{ invocation, file, name, status, message }`.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseEnvFile } from "../sonar/api.mjs";

export const SCHEMA = 1;
export const RECORD_MS = 5000;
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
 * all, never awaited by call(), never spooled, never throws. A CLI that ends with process.exit() awaits
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
 * Settles every health POST still open, each within its own 2 s. Never throws.
 * @returns a promise that resolves when they have
 */
export function flushHealth() {
    return Promise.allSettled([...healthPending]);
}

/**
 * One request to the store. Never throws.
 * @param cfg config()
 * @param method GET, POST or PUT
 * @param path e.g. `/v1/invocations`
 * @param [body] JSON body
 * @param [ms] the timeout for the whole call
 * @returns `{ ok: true, data }` or `{ ok: false, why }`
 */
export async function call(cfg, method, path, body = undefined, ms = RECORD_MS) {
    if (!cfg) return { ok: false, why: "results store not configured" };
    if (cfg.health && method === "POST") sendHealth(cfg, path, body);
    const deadline = AbortSignal.timeout(ms);
    try {
        const auth = await bearer(cfg, deadline);
        const res = await fetch(cfg.url + path, {
            method,
            headers: {
                authorization: `Bearer ${auth}`,
                "content-type": "application/json",
                "x-results-schema": `${SCHEMA}`,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: deadline,
        });
        if (!res.ok) return { ok: false, why: `HTTP ${res.status}` };
        const text = await res.text();
        return { ok: true, data: text ? JSON.parse(text) : null };
    } catch (e) {
        return { ok: false, why: e.name === "TimeoutError" ? `no answer in ${ms / 1000} s` : e.message };
    }
}

/**
 * Posts one test group's record; when that fails, writes it to `<spool>/<id>.json`.
 * @param cfg config()
 * @param rec the record (results-service.md 5.1)
 * @param spool the spool directory
 * @param [ms] the timeout
 * @returns call()'s result, with `spooled` set to the file written on failure
 */
export async function postInvocation(cfg, rec, spool, ms = RECORD_MS) {
    const r = await call(cfg, "POST", "/v1/invocations", rec, ms);
    if (r.ok) return r;
    mkdirSync(spool, { recursive: true });
    const file = join(spool, `${rec.id}.json`);
    writeFileSync(file, JSON.stringify(rec));
    return { ...r, spooled: file };
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
 * The run's plan (results-service.md 5.3), or null: no plan means no reuse, no quarantine, no excuse.
 * @param cfg config()
 * @param query `{ sha, base, variants, inputs, files }`; arrays are joined with commas
 * @returns the plan or null
 */
export async function readPlan(cfg, query) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined) q.set(k, Array.isArray(v) ? v.join(",") : v);
    const r = await call(cfg, "GET", `/v1/plan?${q}`);
    return r.ok ? r.data : null;
}
