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

/**
 * The client's settings, or null when the store is not configured or switched off.
 * @param [env] the environment
 * @param [root] the repository holding `.env`
 * @returns `{ url, token, oidc }` or null
 */
export function config(env = process.env, root = ROOT) {
    if (env.GRAPHTY_RESULTS === "0" || !env.RESULTS_URL) return null;
    const oidc = env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN ? env : null;
    let token = env.GRAPHTY_RESULTS_TOKEN;
    if (!token && !oidc && existsSync(join(root, ".env"))) {
        token = parseEnvFile(readFileSync(join(root, ".env"), "utf8"), "GRAPHTY_RESULTS_TOKEN");
    }
    if (!token && !oidc) return null;
    return { url: env.RESULTS_URL.replace(/\/$/, ""), token, oidc };
}

const oidcCache = new Map();

async function bearer(cfg, ms) {
    if (cfg.token) return cfg.token;
    const hit = oidcCache.get(cfg.oidc.ACTIONS_ID_TOKEN_REQUEST_URL);
    if (hit && hit.exp - 60 > Date.now() / 1000) return hit.value;
    const res = await fetch(`${cfg.oidc.ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${AUDIENCE}`, {
        headers: { authorization: `Bearer ${cfg.oidc.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
        signal: AbortSignal.timeout(ms),
    });
    if (!res.ok) throw new Error(`OIDC token: HTTP ${res.status}`);
    const { value } = await res.json();
    const exp = JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString()).exp ?? 0;
    oidcCache.set(cfg.oidc.ACTIONS_ID_TOKEN_REQUEST_URL, { value, exp });
    return value;
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
    const deadline = AbortSignal.timeout(ms);
    try {
        const auth = await bearer(cfg, ms);
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
