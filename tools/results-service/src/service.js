// The test results store: a Cloudflare Worker over D1 that CI jobs and local runs write test-group records,
// failure events and durations to. It stores and answers; it dispatches nothing and files no issue.
// Design: design/ci/channels-pipeline/results-service.md (sections 4 and 5). Setup: README.md.
//
// Who may write what (5.4): every kind is set here from the credential, never from the body.
// - A GitHub Actions OIDC token (audience graphty-results) from this repository: a pull_request run writes `pr`
//   for its own merge commit; master's own release.yml, ci.yml or a lane it calls (gpu.yml, hosts.yml,
//   work-protection-macos.yml) writes `full`, bisect.yml `bisect`,
//   base-check.yml `base`, restricted-cpu-stress.yml `stress`, deploy-pages.yml `site` (the site-<sha> it
//   kept), each only on refs/heads/master.
// - An OIDC token from a site repository (DEPLOY_REPOSITORY_IDS) writes only `deploy` durations.
// - A local token whose SHA-256 is in LOCAL_TOKEN_HASHES writes only `local` records.
import { getCandidate, getFailures, getMedians, getPlan, getReleaseState, trendFor } from "./queries.js";
import { failureHashes } from "./signature.js";

const ISSUER = "https://token.actions.githubusercontent.com";
export const AUDIENCE = "graphty-results";
const MASTER_KINDS = {
    "release.yml": "full",
    "ci.yml": "full",
    // the lanes release.yml calls; a called workflow's token names its own file in job_workflow_ref
    "gpu.yml": "full",
    "hosts.yml": "full",
    "work-protection-macos.yml": "full",
    "bisect.yml": "bisect",
    "base-check.yml": "base",
    "restricted-cpu-stress.yml": "stress",
    "deploy-pages.yml": "site",
};
// Kinds that write no test records, and why.
const NO_TESTS = {
    deploy: "a site repository writes only durations",
    site: "deploy-pages.yml writes only its site and durations",
};
const MASTER = "refs/heads/master";
const OUTCOMES = new Set(["passed", "failed", "error", "infra", "cancelled"]);
const MAX_PARAMS = 100; // D1 binds at most 100 parameters per statement

class Refused extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
export const refuse = (status, message) => {
    throw new Refused(status, message);
};
const json = (value, status = 200) => Response.json(value, { status });
const bytes = (b64url) =>
    Uint8Array.from(atob(b64url.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.codePointAt(0));
const part = (b64url) => JSON.parse(new TextDecoder().decode(bytes(b64url)));
const sha256 = async (text) =>
    [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
const list = (value) =>
    (value ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

// GitHub's OIDC signing keys by kid, for the isolate's life; an unknown kid refetches the set once.
const signingKeys = new Map();
async function signingKey(kid, doFetch) {
    if (!signingKeys.has(kid)) {
        const res = await doFetch(`${ISSUER}/.well-known/jwks`);
        if (!res.ok) refuse(503, `GitHub's OIDC key set answered HTTP ${res.status}`);
        for (const jwk of (await res.json()).keys) {
            const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
            signingKeys.set(jwk.kid, await crypto.subtle.importKey("jwk", jwk, algorithm, false, ["verify"]));
        }
    }
    return signingKeys.get(kid) ?? refuse(401, `unknown OIDC signing key ${kid}`);
}

// A JWT's parts, or a 401 (not a 500) when they are not base64url JSON objects.
function decodeJwt(token) {
    try {
        const [header, payload, signature] = token.split(".");
        const { alg, kid } = part(header);
        const claims = part(payload);
        if (claims === null || typeof claims !== "object") throw new TypeError("claims are not an object");
        return { alg, kid, claims, signature: bytes(signature), signed: `${header}.${payload}` };
    } catch {
        return refuse(401, "the OIDC token is not a well-formed JWT");
    }
}

/**
 * Checks an Actions OIDC token's signature, issuer, audience and lifetime.
 * @param token the JWT
 * @param doFetch the fetch that reads GitHub's key set
 * @param nowMs the current time in milliseconds
 * @returns its claims
 */
async function verifyOidc(token, doFetch, nowMs) {
    const { alg, kid, claims, signature, signed } = decodeJwt(token);
    if (alg !== "RS256") refuse(401, `OIDC token signed with ${alg}, not RS256`);
    const key = await signingKey(kid, doFetch);
    if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, new TextEncoder().encode(signed)))) {
        refuse(401, "OIDC token signature does not verify");
    }
    const now = nowMs / 1000;
    if (claims.iss !== ISSUER || claims.aud !== AUDIENCE) refuse(401, `OIDC token is not for ${AUDIENCE}`);
    if (typeof claims.exp !== "number" || claims.exp <= now || claims.nbf > now + 60)
        refuse(401, "OIDC token expired or not yet valid");
    return claims;
}

/**
 * The kind a verified token may write, or a refusal saying why it may write none.
 * @param claims the token's claims
 * @param env the Worker's vars: REPOSITORY_ID, DEPLOY_REPOSITORY_IDS
 * @returns the kind
 */
function kindOf(claims, env) {
    const repo = String(claims.repository_id);
    if (list(env.DEPLOY_REPOSITORY_IDS).includes(repo)) return "deploy";
    if (repo !== env.REPOSITORY_ID) refuse(403, `repository ${claims.repository} may not write here`);
    if (claims.event_name === "pull_request") return "pr";
    const prefix = `${claims.repository}/.github/workflows/`;
    const [path, at] = String(claims.job_workflow_ref).split("@");
    const file = path.startsWith(prefix) ? path.slice(prefix.length) : "";
    if (Object.hasOwn(MASTER_KINDS, file) && claims.ref === MASTER && at === MASTER) return MASTER_KINDS[file];
    return refuse(
        403,
        `only pull requests and master's own ${Object.keys(MASTER_KINDS).join(", ")} on refs/heads/master write here; ` +
            `this token is ${claims.job_workflow_ref} on ${claims.ref}`,
    );
}

async function authenticate(request, env, doFetch, nowMs) {
    const token =
        /^Bearer (\S+)$/.exec(request.headers.get("Authorization") ?? "")?.[1] ?? refuse(401, "no credential");
    if (token.split(".").length !== 3) {
        if (!list(env.LOCAL_TOKEN_HASHES).includes(await sha256(token))) refuse(401, "unknown local token");
        return { kind: "local" };
    }
    const claims = await verifyOidc(token, doFetch, nowMs);
    return { kind: kindOf(claims, env), claims };
}

// A record's id names the run that wrote it, so a token writes only under its own run (or `local.`).
function ownId(id, who) {
    const prefix = who.kind === "local" ? "local." : `${who.claims.run_id}.${who.claims.run_attempt}.`;
    if (typeof id !== "string" || !id.startsWith(prefix)) refuse(403, `the id must start with ${prefix}`);
}

function need(body, fields) {
    for (const [name, type] of Object.entries(fields)) {
        if (typeof body?.[name] !== type) refuse(400, `${name} must be a ${type}`);
    }
}

// INSERT OR IGNORE of many rows, as few statements as D1's parameter limit allows.
function inserts(db, table, columns, rows) {
    const per = Math.floor(MAX_PARAMS / columns.length);
    const one = `(${columns.map(() => "?").join(",")})`;
    const out = [];
    for (let i = 0; i < rows.length; i += per) {
        const chunk = rows.slice(i, i + per);
        const sql = `INSERT OR IGNORE INTO ${table} (${columns.join(",")}) VALUES ${chunk.map(() => one).join(",")}`;
        out.push(db.prepare(sql).bind(...chunk.flat().map((v) => v ?? null)));
    }
    return out;
}

function failureRows(invocation, failures, root, nowMs) {
    if (!Array.isArray(failures)) refuse(400, "failures must be a list");
    if (root !== undefined && typeof root !== "string") refuse(400, "root must be a string");
    return failures.map((f) => {
        need(f, { file: "string", name: "string", message: "string" });
        const { line, key, signature, status } = failureHashes(f.message, f.file, root);
        return [invocation, f.file, f.name, status, signature, key, line, f.message.slice(0, 2000), nowMs];
    });
}
const FAILURE_COLUMNS = [
    "invocation",
    "file",
    "name",
    "status",
    "signature",
    "key",
    "first_line",
    "message",
    "seen_at",
];

async function postInvocation(body, who, db, nowMs) {
    if (NO_TESTS[who.kind]) refuse(403, NO_TESTS[who.kind]);
    ownId(body?.id, who);
    need(body, { sha: "string", tree: "string", variant: "string", inputs: "string", env: "string" });
    need(body, { try: "number", startedAt: "number", secs: "number" });
    if (!OUTCOMES.has(body.outcome)) refuse(400, `outcome must be one of ${[...OUTCOMES].join(", ")}`);
    if (who.kind === "pr" && body.sha !== who.claims.sha)
        refuse(403, "a pull request writes only its own merge commit");
    const files = body.files ?? [];
    if (!Array.isArray(files) || !files.every((f) => Array.isArray(f) && f.length === 5)) {
        refuse(400, "files must be [file, passed, failed, skipped, ms] rows");
    }
    const [first] = await db.batch([
        ...inserts(
            db,
            "invocation",
            [
                "id",
                "kind",
                "sha",
                "tree",
                "base_sha",
                "pr",
                "ref",
                "variant",
                "inputs",
                "env",
                "try",
                "outcome",
                "reused_from",
                "dirty",
                "note",
                "run_url",
                "started_at",
                "secs",
            ],
            [
                [
                    body.id,
                    who.kind,
                    body.sha,
                    body.tree,
                    body.baseSha,
                    body.pr,
                    who.claims?.ref,
                    body.variant,
                    body.inputs,
                    body.env,
                    body.try,
                    body.outcome,
                    body.reusedFrom,
                    body.dirty ? 1 : 0,
                    body.note,
                    body.runUrl,
                    body.startedAt,
                    body.secs,
                ],
            ],
        ),
        ...inserts(
            db,
            "file_run",
            ["invocation", "file", "passed", "failed", "skipped", "ms"],
            files.map((f) => [body.id, ...f]),
        ),
        ...inserts(db, "failure", FAILURE_COLUMNS, failureRows(body.id, body.failures ?? [], body.root, nowMs)),
    ]);
    return { stored: first.meta.changes === 1, kind: who.kind };
}

async function postFailures(body, who, db, nowMs) {
    if (NO_TESTS[who.kind]) refuse(403, NO_TESTS[who.kind]);
    ownId(body?.invocation, who);
    const rows = failureRows(body.invocation, body.failures ?? [body], body.root, nowMs);
    // D1 refuses an empty batch
    if (rows.length) await db.batch(inserts(db, "failure", FAILURE_COLUMNS, rows));
    return { stored: rows.length };
}

async function postDurations(body, who, db, nowMs) {
    if (who.kind === "local") refuse(403, "durations come only from Actions runs");
    const rows = body?.rows;
    if (!Array.isArray(rows)) refuse(400, "rows must be a list");
    for (const r of rows) {
        need(r, { workflow: "string", job: "string", ms: "number" });
        if (String(r.runId) !== who.claims.run_id || String(r.attempt) !== who.claims.run_attempt) {
            refuse(403, "a run writes only its own durations");
        }
    }
    const columns = [
        "run_id",
        "attempt",
        "workflow",
        "job",
        "step",
        "task",
        "sha",
        "kind",
        "started_at",
        "ms",
        "conclusion",
    ];
    const values = rows.map((r) => [
        r.runId,
        r.attempt,
        r.workflow,
        r.job,
        r.step ?? "",
        r.task ?? "",
        r.sha,
        who.kind,
        r.startedAt,
        r.ms,
        r.conclusion,
    ]);
    if (!values.length) return { stored: 0, kind: who.kind, trend: [] };
    await db.batch(inserts(db, "duration", columns, values));
    return { stored: values.length, kind: who.kind, trend: await trendFor(db, who.kind, rows, body.budgets, nowMs) };
}

// A test shard's duration history (tools/vitest-time-budget.mjs). Any credential reads; only master's own runs
// write, so a pull request's slow test never moves the medians master is judged by.
const TESTS_PATH = "/v1/durations/tests/";
const HISTORY_WRITERS = new Set(["full", "bisect", "base"]);
const HISTORY_MAX = 1_900_000; // D1 keeps a value up to 2 MB

async function getTestDurations(_query, _who, db, _nowMs, name) {
    const row = await db.prepare("SELECT body FROM test_durations WHERE name = ?").bind(name).first();
    return row ? JSON.parse(row.body) : {};
}

async function putTestDurations(body, who, db, nowMs, name) {
    if (!HISTORY_WRITERS.has(who.kind)) refuse(403, "only master's own runs write a test duration history");
    if (!body || typeof body !== "object" || Array.isArray(body)) refuse(400, "the history must be an object");
    const text = JSON.stringify(body);
    if (text.length > HISTORY_MAX) refuse(413, `a history holds at most ${HISTORY_MAX} bytes`);
    await db
        .prepare("INSERT OR REPLACE INTO test_durations (name, body, updated_at, run_id) VALUES (?, ?, ?, ?)")
        .bind(name, text, nowMs, Number(who.claims.run_id))
        .run();
    return { stored: true };
}

const VERDICTS = new Set(["green-clean", "green-images", "red", "owner-item"]);

// The full run's verdict on its candidate (channels 5): only master's release.yml writes it, under its own run.
async function postVerdict(body, who, db, nowMs) {
    if (who.kind !== "full" || !String(who.claims.job_workflow_ref).includes("/release.yml@")) {
        refuse(403, "only master's own release.yml records a verdict");
    }
    need(body, { sha: "string", state: "string" });
    if (!VERDICTS.has(body.state)) refuse(400, `state must be one of ${[...VERDICTS].join(", ")}`);
    if (body.issue != null && !Number.isInteger(body.issue)) refuse(400, "issue must be an issue number");
    const { meta } = await db
        .prepare(
            "INSERT OR IGNORE INTO verdict (run_id, attempt, sha, state, lane, issue, at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
            Number(who.claims.run_id),
            Number(who.claims.run_attempt),
            body.sha,
            body.state,
            body.lane ?? null,
            body.issue ?? null,
            nowMs,
        )
        .run();
    return { stored: meta.changes === 1 };
}

// A master build kept its site as artifact site-<sha> in this run: the full run's candidate pick reads it.
async function postSite(body, who, db, nowMs) {
    if (who.kind !== "site") refuse(403, "only master's own deploy-pages.yml records a site");
    if (!/^[0-9a-f]{40}$/.test(body?.sha ?? "")) refuse(400, "sha must be a full commit id");
    const { meta } = await db
        .prepare("INSERT OR IGNORE INTO site (sha, built_at, run_id) VALUES (?, ?, ?)")
        .bind(body.sha, nowMs, Number(who.claims.run_id))
        .run();
    return { stored: meta.changes === 1, sha: body.sha };
}

const SHA = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;

// A channel moved (channels 3): release.yml's site job records the nightly promotion it deployed, with the sha256
// of the site asset and channel.json, one row per run: a re-run of the site job (which re-packs channel.json, so
// its sha256 changes) replaces that run's hashes, so promote.yml compares against what is hung now. It keeps the
// row's time: a re-run never makes an older promotion the newest nightly.
// Only master's own release.yml writes it; age:nightly (GET /v1/release-state) counts from the newest row.
async function postChannelMove(body, who, db, nowMs) {
    if (who.kind !== "full" || !String(who.claims.job_workflow_ref).includes("/release.yml@")) {
        refuse(403, "only master's own release.yml records a channel move");
    }
    if (body?.channel !== "nightly") refuse(400, "channel must be nightly");
    if (!SHA.test(body.sha ?? "")) refuse(400, "sha must be a full commit id");
    if (body.versionCommit != null && !SHA.test(body.versionCommit))
        refuse(400, "versionCommit must be a full commit id");
    for (const field of ["siteSha256", "channelSha256"]) {
        if (!SHA256.test(body[field] ?? "")) refuse(400, `${field} must be a sha256`);
    }
    const runId = Number(who.claims.run_id);
    const seen = await db
        .prepare("SELECT 1 FROM channel_move WHERE channel = ? AND sha = ? AND run_id = ?")
        .bind(body.channel, body.sha, runId)
        .first();
    if (seen) {
        await db
            .prepare(
                "UPDATE channel_move SET version_commit = ?, site_sha256 = ?, channel_sha256 = ? WHERE channel = ? AND sha = ? AND run_id = ?",
            )
            .bind(body.versionCommit ?? null, body.siteSha256, body.channelSha256, body.channel, body.sha, runId)
            .run();
        return { stored: true, replaced: true };
    }
    await db
        .prepare(
            "INSERT INTO channel_move (channel, sha, at, version_commit, site_sha256, channel_sha256, run_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(body.channel, body.sha, nowMs, body.versionCommit ?? null, body.siteSha256, body.channelSha256, runId)
        .run();
    return { stored: true };
}

const ROUTES = {
    "POST /v1/verdicts": postVerdict,
    "POST /v1/invocations": postInvocation,
    "POST /v1/failures": postFailures,
    "POST /v1/durations": postDurations,
    "POST /v1/sites": postSite,
    "POST /v1/channel-moves": postChannelMove,
    // Reads take any credential (5.4) and answer from the stored records only.
    "GET /v1/plan": getPlan,
    "GET /v1/candidate": getCandidate,
    "GET /v1/release-state": getReleaseState,
    "GET /v1/failures": getFailures,
    "GET /v1/durations/medians": getMedians,
    [`GET ${TESTS_PATH}:name`]: getTestDurations,
    [`PUT ${TESTS_PATH}:name`]: putTestDurations,
};

// The route key and its one path parameter: `/v1/durations/tests/<name>` names a history.
function routeOf(method, pathname) {
    if (!pathname.startsWith(TESTS_PATH)) return [`${method} ${pathname}`, undefined];
    const raw = pathname.slice(TESTS_PATH.length);
    const name = /^[\w.-]{1,128}$/.test(raw) ? raw : "";
    if (!name) refuse(400, "a history name is 1 to 128 letters, digits, '.', '_' or '-'");
    return [`${method} ${TESTS_PATH}:name`, name];
}

/**
 * Answers one request.
 * @param request the request
 * @param env the bindings: DB, REPOSITORY_ID, DEPLOY_REPOSITORY_IDS, LOCAL_TOKEN_HASHES
 * @param [deps] what tests inject
 * @param [deps.fetch] the fetch that reads GitHub's OIDC key set
 * @param [deps.now] the current time in milliseconds
 * @returns the response
 */
export async function handle(request, env, { fetch: doFetch = fetch, now = Date.now() } = {}) {
    const { pathname, searchParams } = new URL(request.url);
    try {
        if (request.method === "GET" && pathname === "/v1/health") {
            await env.DB.prepare("SELECT 1").first();
            return json({ ok: true, schema: 1 });
        }
        const [key, name] = routeOf(request.method, pathname);
        const route = ROUTES[key] ?? refuse(404, `no ${request.method} ${pathname}`);
        const who = await authenticate(request, env, doFetch, now);
        const body =
            request.method === "GET"
                ? searchParams
                : await request.json().catch(() => refuse(400, "the body is not JSON"));
        return json(await route(body, who, env.DB, now, name));
    } catch (error) {
        if (error instanceof Refused) return json({ error: error.message }, error.status);
        console.error(`${request.method} ${pathname} failed: ${error.stack ?? error}`);
        return json({ error: "internal error" }, 500);
    }
}
