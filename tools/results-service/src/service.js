// The test results store: a Cloudflare Worker over D1 that CI jobs and local runs write test-group records,
// failure events and durations to. It stores and answers; it dispatches nothing and files no issue (the job whose
// record proves a test flaky files it and posts its number back).
// Design: design/ci/channels-pipeline/results-service.md (sections 4 and 5). Setup: README.md.
//
// Who may write what (5.4): every kind is set here from the credential, never from the body.
// - A GitHub Actions OIDC token (audience graphty-results) from this repository: a pull_request run writes `pr`
//   for its own merge commit; master's own release.yml, ci.yml or a lane it calls (gpu.yml, hosts.yml,
//   work-protection-macos.yml) writes `full`, bisect.yml `bisect`,
//   base-check.yml `base`, restricted-cpu-stress.yml `stress`, story-slices.yml `slice` (story captures),
//   deploy-pages.yml `site` (the site-<sha> it kept), each only on refs/heads/master.
// - An OIDC token from a site repository (DEPLOY_REPOSITORY_IDS) writes only `deploy` durations.
// - A local token whose SHA-256 is in LOCAL_TOKEN_HASHES writes only `local` records.
import {
    concludeFlaky,
    getCandidate,
    getFailures,
    getMedians,
    getPlan,
    getQuarantine,
    getReleaseState,
    lastSeenFor,
    summariesReady,
    trackedIssues,
    trendFor,
} from "./queries.js";
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
    // a full run's same-commit re-run decider: files and holds a red attempt 1 it does not re-run
    "release-rerun.yml": "full",
    // ends the held nightly candidate without promoting it: clears the hold, records its head rejected
    "nightly-abandon.yml": "full",
    "bisect.yml": "bisect",
    "base-check.yml": "base",
    "restricted-cpu-stress.yml": "stress",
    "deploy-pages.yml": "site",
    // the nightly site job release.yml calls (and a hand-dispatched redeploy): its channel move only (#5135)
    "nightly-site.yml": "nightly-site",
    // the rolling screenshot slices (design/visual-testing/early-capture.md): story captures only
    "story-slices.yml": "slice",
};
// Kinds that write no test records, and why.
const NO_TESTS = {
    deploy: "a site repository writes only durations",
    site: "deploy-pages.yml writes only its site and durations",
    "nightly-site": "nightly-site.yml writes only its channel move and durations",
    master: "a push to master runs ci.yml as a build only, with no tests",
    slice: "story-slices.yml writes only story captures",
};
const MASTER = "refs/heads/master";
const MASTER_EVIDENCE = new Set(["full", "bisect", "base"]);
const ISSUE_KINDS = new Set(["flaky", "failing-on-master"]);
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
    if (Object.hasOwn(MASTER_KINDS, file) && claims.ref === MASTER && at === MASTER) {
        // ci.yml run by master's own push (workflow_ref is ci.yml itself) builds only; called by release.yml it is the full run
        const caller = String(claims.workflow_ref).split("@")[0];
        if (file === "ci.yml" && claims.event_name === "push" && caller === path) return "master";
        return MASTER_KINDS[file];
    }
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
function inserts(db, table, columns, rows, verb = "INSERT OR IGNORE") {
    const per = Math.floor(MAX_PARAMS / columns.length);
    const one = `(${columns.map(() => "?").join(",")})`;
    const out = [];
    for (let i = 0; i < rows.length; i += per) {
        const chunk = rows.slice(i, i + per);
        const sql = `${verb} INTO ${table} (${columns.join(",")}) VALUES ${chunk.map(() => one).join(",")}`;
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
        // the record's text (its JUnit report) replaces what the live reporter sent for the same test, so every
        // key and signature a pull request, a base check or an issue compares comes from the same text
        ...inserts(
            db,
            "failure",
            FAILURE_COLUMNS,
            failureRows(body.id, body.failures ?? [], body.root, nowMs),
            "INSERT OR REPLACE",
        ),
    ]);
    const stored = first.meta.changes === 1;
    const judged = stored && MASTER_EVIDENCE.has(who.kind) && ["passed", "failed"].includes(body.outcome);
    if (!judged) return { stored, kind: who.kind, flaky: [] };
    const flaky = await concludeFlakySafely(db, body.id, nowMs);
    const tracked = await trackedIssues(db, body.variant.split("|")[0], nowMs).catch(() => []);
    return { stored, kind: who.kind, flaky, tracked };
}

// The record is stored by now: a verdict that cannot be computed costs the verdict, never the answer (a 5xx would
// make the client spool and re-post a record the store already has, whose re-post is never judged).
async function concludeFlakySafely(db, id, nowMs) {
    try {
        return await concludeFlaky(db, id, nowMs);
    } catch (e) {
        console.log(`concludeFlaky ${id}: ${e.message}`);
        return [];
    }
}

// The issue a master job filed for a signature (6.6): tracked once, and set on the open quarantine it names. A
// signature holds one tracked row; an issue of the other kind never overwrites it (the job finds that one by its
// kind's marker). ponytail: one row per signature, key tracked_issue on (signature, kind) if both must be read.
async function postIssue(body, who, db, nowMs) {
    if (!MASTER_EVIDENCE.has(who.kind)) refuse(403, "only master's full, bisect and base runs file issues");
    if (body.state === "closed") return closeIssue(body, db, nowMs);
    need(body, { signature: "string", number: "number" });
    if (!ISSUE_KINDS.has(body.kind)) refuse(400, `kind must be one of ${[...ISSUE_KINDS].join(", ")}`);
    await db.batch([
        db
            .prepare(
                `INSERT INTO tracked_issue (signature, kind, number, state, opened_at, last_seen) VALUES (?, ?, ?, 'open', ?, ?)
                 ON CONFLICT(signature) DO UPDATE SET number = excluded.number, state = 'open', last_seen = excluded.last_seen
                 WHERE tracked_issue.kind = excluded.kind`,
            )
            .bind(body.signature, body.kind, body.number, nowMs, nowMs),
        db
            .prepare(
                "UPDATE quarantine SET issue = ? WHERE family = ? AND file = ? AND name = ? AND left_at IS NULL AND issue IS NULL",
            )
            .bind(body.number, body.family ?? "", body.file ?? "", body.name ?? ""),
    ]);
    return { stored: true };
}

// A tracked issue a master job found closed: its quarantine entries leave now (6.5), so the next proof of the same
// test enters it again and files or reopens an issue. ponytail: a proof stored in the same record as the close is
// not re-judged; the next flip is. Re-run concludeFlaky over the entry's last proof if that gap matters.
async function closeIssue(body, db, nowMs) {
    need(body, { number: "number" });
    await db.batch([
        db
            .prepare("UPDATE tracked_issue SET state = 'closed', last_seen = ? WHERE number = ?")
            .bind(nowMs, body.number),
        db
            .prepare("UPDATE quarantine SET left_at = ?, left_why = ? WHERE issue = ? AND left_at IS NULL")
            .bind(nowMs, `issue #${body.number} closed`, body.number),
    ]);
    return { stored: true };
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
    if (!values.length) return { stored: 0, kind: who.kind, trend: [], lastSeen: {} };
    await db.batch(inserts(db, "duration", columns, values));
    // absent, never a guess, until the summary tables are whole (summariesReady)
    if (!(await summariesReady(db))) return { stored: values.length, kind: who.kind };
    const workflows = [...new Set(rows.map((r) => r.workflow))];
    return {
        stored: values.length,
        kind: who.kind,
        trend: await trendFor(db, who.kind, rows, body.budgets, nowMs),
        lastSeen: await lastSeenFor(db, who.kind, workflows, nowMs),
    };
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

// approved and rejected: release.yml's promotion after the owner's screenshot approval (tools/channel/resume.mjs)
// deferred: an attempt-1 red waiting for its same-commit re-run, which the pick does not take as judged
const VERDICTS = new Set(["green-clean", "green-images", "red", "owner-item", "approved", "rejected", "deferred"]);

// The full run's verdict on its candidate (channels 5): only master's release.yml writes it, under its own run.
async function postVerdict(body, who, db, nowMs) {
    const ref = String(who.claims?.job_workflow_ref);
    // nightly-abandon.yml records only the abandoned head's rejection
    const abandon = ref.includes("/nightly-abandon.yml@") && body?.state === "rejected";
    if (who.kind !== "full" || !(ref.includes("/release.yml@") || abandon)) {
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

// A pull request's base check (#3925, 6.3): the first ask for a base, file and variant answers `dispatch: true`;
// every later ask (another pull request, a re-run) answers false, so base-check.yml runs once per test per base.
async function postBaseCheck(body, who, db, nowMs) {
    if (who.kind !== "pr") refuse(403, "only a pull request's ci.yml asks for a base check");
    if (!/^[0-9a-f]{7,40}$/.test(body?.base ?? "")) refuse(400, "base must be a commit id");
    for (const field of ["file", "variant"]) {
        if (typeof body[field] !== "string" || !body[field] || body[field].length > 300) {
            refuse(400, `${field} must be a string of 1 to 300 characters`);
        }
    }
    const pr = Number.isInteger(body.pr) ? body.pr : null;
    const { meta } = await db
        .prepare("INSERT OR IGNORE INTO base_check (base, file, variant, pr, asked_at) VALUES (?, ?, ?, ?, ?)")
        .bind(body.base, body.file, body.variant, pr, nowMs)
        .run();
    return { dispatch: meta.changes === 1 };
}

const SHA = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;

// A channel moved (channels 3): release.yml's site job records the nightly promotion it deployed, with the sha256
// of the site asset and channel.json, one row per run: a re-run of the site job (which re-packs channel.json, so
// its sha256 changes) replaces that run's hashes, so promote.yml compares against what is hung now. It keeps the
// row's time: a re-run never makes an older promotion the newest nightly.
// Only master's own release.yml writes it, through the nightly-site.yml it calls (whose token names that file: #5135,
// every record was refused until then); age:nightly (GET /v1/release-state) counts from the newest row.
async function postChannelMove(body, who, db, nowMs) {
    const release = who.kind === "full" && String(who.claims.job_workflow_ref).includes("/release.yml@");
    if (!release && who.kind !== "nightly-site") {
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

// What promote.yml checks a nightly's assets and verdict against (`?sha=<sha>`, the tested commit of a site-<sha>
// release): the newest nightly channel move of that commit, with the sha256 of site.tar.zst and channel.json its
// site job hung, and the commit's latest verdict. No move recorded: 404, and the promotion refuses.
async function getSite(query, _who, db) {
    const sha = query.get("sha") ?? "";
    if (!SHA.test(sha)) refuse(400, "sha must be a full commit id");
    const move = await db
        .prepare(
            "SELECT version_commit AS versionCommit, site_sha256 AS siteSha256, channel_sha256 AS channelSha256, at AS movedAt FROM channel_move WHERE channel = 'nightly' AND sha = ? ORDER BY at DESC LIMIT 1",
        )
        .bind(sha)
        .first();
    if (!move) refuse(404, `no nightly channel move of ${sha}`);
    const verdict = await db
        .prepare("SELECT state FROM verdict WHERE sha = ? ORDER BY at DESC LIMIT 1")
        .bind(sha)
        .first();
    return { sha, ...move, verdict: verdict?.state ?? null };
}

// The held nightly candidate (channels-pipeline.md section 3): release.yml's verdict sets it on a deciding run that
// is not green-clean, a fix forward moves its head, a promotion or an abandon clears it ({ clear: true, base, head }).
// Only master's own release.yml writes it, release-rerun.yml for a red run it does not re-run, and
// nightly-abandon.yml, which only clears it.
async function postHold(body, who, db, nowMs) {
    const ref = String(who.claims?.job_workflow_ref);
    const abandon = ref.includes("/nightly-abandon.yml@");
    if (who.kind !== "full" || !(ref.includes("/release.yml@") || ref.includes("/release-rerun.yml@") || abandon)) {
        refuse(403, "only master's own release.yml or release-rerun.yml holds a candidate");
    }
    if (body?.clear === true) {
        // with base and head, only that hold: an abandon racing a train never clears a hold it did not read
        if (body.base != null || body.head != null) {
            const { meta } = await db
                .prepare("DELETE FROM candidate WHERE id = 1 AND base = ? AND head = ?")
                .bind(String(body.base), String(body.head))
                .run();
            return { cleared: meta.changes === 1 };
        }
        if (abandon) refuse(400, "nightly-abandon.yml clears only the hold it names (base and head)");
        const { meta } = await db.prepare("DELETE FROM candidate WHERE id = 1").run();
        return { cleared: meta.changes === 1 };
    }
    if (abandon) refuse(403, "nightly-abandon.yml only clears a hold");
    if (!SHA.test(body?.base ?? "") || !SHA.test(body?.head ?? ""))
        refuse(400, "base and head must be full commit ids");
    if (body.issue != null && !Number.isInteger(body.issue)) refuse(400, "issue must be an issue number");
    const held = await db.prepare("SELECT base FROM candidate WHERE id = 1").first();
    // one hold at a time: a new base replaces a hold only after it is cleared
    if (held && held.base !== body.base) refuse(409, `nightly is already held on ${held.base}`);
    await db
        .prepare("INSERT OR REPLACE INTO candidate (id, base, head, issue, at) VALUES (1, ?, ?, ?, ?)")
        .bind(body.base, body.head, body.issue ?? null, nowMs)
        .run();
    return { held: true };
}

// The rolling screenshot slices (design/visual-testing/early-capture.md, 4c). Only master's story-slices.yml writes
// captures, each row under its own run; only ci.yml's push build of a master commit writes that commit's reach.
// Every read answers only a story's newest capture, newest by run id then attempt, never by write time: a late re-run
// of an older slice must not hide a newer slice's render. Rows older than 7 days that are not a story's newest are
// pruned on each write (no cron here).
const CAPTURE_STATUSES = new Set(["unchanged", "changed", "new", "unseeded", "unstable", "failed"]);
// what the owner's rolling queue can hold, before the tree and reach checks its consumers apply (4d)
const QUEUE_STATUSES = new Set(["changed", "new", "unseeded"]);
const NOTIFY_KINDS = new Set(["queue", "slot"]);
const STORY_ROWS_MAX = 2000;
const STORY_KEEP_MS = 7 * 86_400_000;

function text(value, name, { optional = false } = {}) {
    if (optional && value == null) return null;
    if (typeof value !== "string" || !value || value.length > 300)
        refuse(400, `${name} must be a string of 1 to 300 characters`);
    return value;
}

function storyRows(captures) {
    if (!Array.isArray(captures) || captures.length > STORY_ROWS_MAX)
        refuse(400, `captures must be a list of at most ${STORY_ROWS_MAX}`);
    return captures.map((c) => {
        if (!CAPTURE_STATUSES.has(c?.status)) refuse(400, `status must be one of ${[...CAPTURE_STATUSES].join(", ")}`);
        return [
            text(c.project, "project"),
            text(c.story, "story"),
            c.mode == null ? "" : text(c.mode, "mode"),
            c.status,
            text(c.hash, "hash", { optional: true }),
            text(c.baselineHash, "baselineHash", { optional: true }),
        ];
    });
}

async function postStoryCaptures(body, who, db, nowMs) {
    if (who.kind !== "slice") refuse(403, "only master's own story-slices.yml records story captures");
    if (!SHA.test(body?.sha ?? "")) refuse(400, "sha must be a full commit id");
    if (!SHA.test(body.baselinesTree ?? "")) refuse(400, "baselinesTree must be a full tree id");
    const artifact = text(body.artifact, "artifact");
    const notified = body.notified ?? [];
    if (!Array.isArray(notified) || !notified.every((k) => NOTIFY_KINDS.has(k)))
        refuse(400, `notified must list some of ${[...NOTIFY_KINDS].join(", ")}`);
    const run = [Number(who.claims.run_id), Number(who.claims.run_attempt)];
    const rows = storyRows(body.captures).map(([project, story, mode, status, hash, baselineHash]) => [
        project,
        story,
        mode,
        body.sha,
        body.baselinesTree,
        ...run,
        artifact,
        status,
        hash,
        baselineHash,
        nowMs,
    ]);
    const units = body.units ?? [];
    if (!Array.isArray(units) || units.length > STORY_ROWS_MAX)
        refuse(400, `units must be a list of at most ${STORY_ROWS_MAX}`);
    const unitRows = units.map((u) => [text(u?.project, "project"), text(u?.unit, "unit"), body.sha, ...run, nowMs]);
    const columns = ["project", "story", "mode", "sha", "baselines_tree", "run_id", "attempt", "artifact"];
    const captureInserts = inserts(db, "story_capture", [...columns, "status", "hash", "baseline_hash", "at"], rows);
    const results = await db.batch([
        ...captureInserts,
        ...inserts(db, "story_unit", ["project", "unit", "sha", "run_id", "attempt", "at"], unitRows),
        ...notified.map((kind) =>
            db.prepare("INSERT OR REPLACE INTO story_notify (kind, at) VALUES (?, ?)").bind(kind, nowMs),
        ),
        db
            .prepare(
                `DELETE FROM story_capture WHERE at < ? AND EXISTS (SELECT 1 FROM story_capture n WHERE n.project = story_capture.project
                 AND n.story = story_capture.story AND n.mode = story_capture.mode
                 AND (n.run_id > story_capture.run_id OR (n.run_id = story_capture.run_id AND n.attempt > story_capture.attempt)))`,
            )
            .bind(nowMs - STORY_KEEP_MS),
        db
            .prepare(
                `DELETE FROM story_unit WHERE at < ? AND EXISTS (SELECT 1 FROM story_unit n WHERE n.project = story_unit.project
                 AND n.unit = story_unit.unit
                 AND (n.run_id > story_unit.run_id OR (n.run_id = story_unit.run_id AND n.attempt > story_unit.attempt)))`,
            )
            .bind(nowMs - STORY_KEEP_MS),
        db.prepare("DELETE FROM story_reach WHERE at < ?").bind(nowMs - STORY_KEEP_MS),
    ]);
    const stored = results.slice(0, captureInserts.length).reduce((n, r) => n + r.meta.changes, 0);
    return { stored };
}

async function postStoryReach(body, who, db, nowMs) {
    if (who.kind !== "master") refuse(403, "only ci.yml's own push build of master records story reach");
    if (body?.sha !== who.claims.sha) refuse(403, "a master build records only its own commit's reach");
    const units = body.units;
    if (!Array.isArray(units) || units.length > STORY_ROWS_MAX)
        refuse(400, `units must be a list of at most ${STORY_ROWS_MAX}`);
    const rows = units.map((u) => [body.sha, text(u, "unit"), nowMs]);
    if (!rows.length) return { stored: 0 };
    const results = await db.batch(inserts(db, "story_reach", ["sha", "unit", "at"], rows));
    return { stored: results.reduce((n, r) => n + r.meta.changes, 0) };
}

// Each story's unapproved renders since its last unchanged one, under its newest row's baselines tree, newest first:
// the first of them bounds tools/full-run.mjs's ordering pick rule (early-capture.md 4e)
const UNAPPROVED_SINCE_CLEAR = `WITH n AS (SELECT project, story, mode, baselines_tree FROM (SELECT project, story, mode, baselines_tree,
     ROW_NUMBER() OVER (PARTITION BY project, story, mode ORDER BY run_id DESC, attempt DESC) AS rn FROM story_capture) WHERE rn = 1),
 t AS (SELECT c.project, c.story, c.mode, c.sha, c.status,
     ROW_NUMBER() OVER (PARTITION BY c.project, c.story, c.mode ORDER BY c.run_id, c.attempt) AS k
     FROM story_capture c JOIN n ON n.project = c.project AND n.story = c.story AND n.mode = c.mode
     AND n.baselines_tree = c.baselines_tree),
 m AS (SELECT project, story, mode, MAX(CASE WHEN status = 'unchanged' THEN k ELSE 0 END) AS clear FROM t GROUP BY project, story, mode)
 SELECT t.project, t.story, t.mode, t.sha FROM t JOIN m ON m.project = t.project AND m.story = t.story AND m.mode = t.mode
 WHERE t.k > m.clear AND t.status IN ('changed', 'new', 'unseeded') ORDER BY t.k DESC`; // QUEUE_STATUSES

async function getStoryCaptures(_query, _who, db) {
    const [{ results: newest }, last, { results: notified }, { results: units }, { results: since }] =
        await Promise.all([
            db
                .prepare(
                    `SELECT project, story, mode, sha, baselines_tree, run_id, attempt, artifact, status, hash, baseline_hash, at
                 FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY project, story, mode ORDER BY run_id DESC, attempt DESC) AS rn
                 FROM story_capture) WHERE rn = 1 ORDER BY project, story, mode`,
                )
                .all(),
            db.prepare("SELECT sha, at FROM story_capture ORDER BY run_id DESC, attempt DESC, at DESC LIMIT 1").first(),
            db.prepare("SELECT kind, at FROM story_notify").all(),
            db
                .prepare(
                    `SELECT project, unit, sha, at FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY project, unit ORDER BY run_id DESC, attempt DESC)
                 AS rn FROM story_unit) WHERE rn = 1 ORDER BY project, unit`,
                )
                .all(),
            db.prepare(UNAPPROVED_SINCE_CLEAR).all(),
        ]);
    // newest first, so the last write per story is its first unapproved render
    const first = new Map(since.map((r) => [`${r.project}\n${r.story}\n${r.mode}`, r.sha]));
    const statuses = {};
    for (const c of newest) statuses[c.status] = (statuses[c.status] ?? 0) + 1;
    const when = Object.fromEntries(notified.map((n) => [n.kind, n.at]));
    return {
        captures: newest.map((c) => ({
            project: c.project,
            story: c.story,
            mode: c.mode,
            sha: c.sha,
            baselinesTree: c.baselines_tree,
            runId: c.run_id,
            attempt: c.attempt,
            artifact: c.artifact,
            status: c.status,
            hash: c.hash,
            baselineHash: c.baseline_hash,
            at: c.at,
            ...(QUEUE_STATUSES.has(c.status) && {
                firstUnapprovedSha: first.get(`${c.project}\n${c.story}\n${c.mode}`) ?? c.sha,
            }),
        })),
        summary: {
            stories: newest.length,
            lastSliced: last ? { sha: last.sha, at: last.at } : null,
            oldestNewestAt: newest.length ? Math.min(...newest.map((c) => c.at)) : null,
            statuses,
            queue: newest.filter((c) => QUEUE_STATUSES.has(c.status)).length,
        },
        notified: Object.fromEntries([...NOTIFY_KINDS].map((k) => [k, when[k] ?? null])),
        // when each slice unit was last captured whole: the slice planner's rotation (tools/channel/story-slices.mjs)
        units: units.map((u) => ({ project: u.project, unit: u.unit, sha: u.sha, at: u.at })),
    };
}

// The story units the listed master commits reach (`?shas=<sha>,<sha>`, at most MAX_PARAMS, which D1 binds): the slice planner renders them
// first. Ordering only, never a reason to skip a render (early-capture.md, 2d).
async function getStoryReach(query, _who, db) {
    const shas = (query.get("shas") ?? "").split(",").filter(Boolean);
    if (!shas.length || shas.length > MAX_PARAMS || !shas.every((s) => SHA.test(s)))
        refuse(400, `shas lists 1 to ${MAX_PARAMS} full commit ids`);
    const { results } = await db
        .prepare(`SELECT sha, unit FROM story_reach WHERE sha IN (${shas.map(() => "?").join(",")}) ORDER BY sha, unit`)
        .bind(...shas)
        .all();
    return { reach: results.map((r) => ({ sha: r.sha, unit: r.unit })) };
}

const ROUTES = {
    "POST /v1/hold": postHold,
    "POST /v1/verdicts": postVerdict,
    "POST /v1/invocations": postInvocation,
    "POST /v1/failures": postFailures,
    "POST /v1/durations": postDurations,
    "POST /v1/issues": postIssue,
    "POST /v1/sites": postSite,
    "POST /v1/base-checks": postBaseCheck,
    "POST /v1/channel-moves": postChannelMove,
    "POST /v1/story-captures": postStoryCaptures,
    "POST /v1/story-reach": postStoryReach,
    // Reads take any credential (5.4) and answer from the stored records only.
    "GET /v1/plan": getPlan,
    "GET /v1/quarantine": getQuarantine,
    "GET /v1/candidate": getCandidate,
    "GET /v1/release-state": getReleaseState,
    "GET /v1/site": getSite,
    "GET /v1/failures": getFailures,
    "GET /v1/durations/medians": getMedians,
    "GET /v1/story-captures": getStoryCaptures,
    "GET /v1/story-reach": getStoryReach,
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
