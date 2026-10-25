// The test results store: a Cloudflare Worker over D1 that CI jobs and local runs write test-group records,
// failure events and durations to. It stores and answers; it dispatches nothing and files no issue.
// Design: design/ci/channels-pipeline/results-service.md (sections 4 and 5). Setup: README.md.
//
// Who may write what (5.4): every kind is set here from the credential, never from the body.
// - A GitHub Actions OIDC token (audience graphty-results) from this repository: a pull_request run writes `pr`
//   for its own merge commit; master's own release.yml, ci.yml or a lane it calls (gpu.yml, hosts.yml,
//   work-protection-macos.yml) writes `full`, bisect.yml `bisect`,
//   base-check.yml `base`, restricted-cpu-stress.yml `stress`, each only on refs/heads/master.
// - An OIDC token from a site repository (DEPLOY_REPOSITORY_IDS) writes only `deploy` durations.
// - A local token whose SHA-256 is in LOCAL_TOKEN_HASHES writes only `local` records.
import { getCandidate, getPlan, getReleaseState, trendFor } from "./queries.js";
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
    if (who.kind === "deploy") refuse(403, "a site repository writes only durations");
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
    if (who.kind === "deploy") refuse(403, "a site repository writes only durations");
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

const ROUTES = {
    "POST /v1/invocations": postInvocation,
    "POST /v1/failures": postFailures,
    "POST /v1/durations": postDurations,
    // Reads take any credential (5.4) and answer from the stored records only.
    "GET /v1/plan": getPlan,
    "GET /v1/candidate": getCandidate,
    "GET /v1/release-state": getReleaseState,
};

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
        const route = ROUTES[`${request.method} ${pathname}`] ?? refuse(404, `no ${request.method} ${pathname}`);
        const who = await authenticate(request, env, doFetch, now);
        const body =
            request.method === "GET"
                ? searchParams
                : await request.json().catch(() => refuse(400, "the body is not JSON"));
        return json(await route(body, who, env.DB, now));
    } catch (error) {
        if (error instanceof Refused) return json({ error: error.message }, error.status);
        console.error(`${request.method} ${pathname} failed: ${error.stack ?? error}`);
        return json({ error: "internal error" }, 500);
    }
}
