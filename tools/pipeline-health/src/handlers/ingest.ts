// The write side of the health API (design/ci/health-dashboard.md, sections 10.2 and 10.5).
//
// CI posts the results service's own bodies to the same paths (POST /v1/invocations, /failures, /durations,
// /verdicts); the HTTP API's JWT authorizer has already checked the token's signature, issuer, audience
// (graphty-health) and expiry, and this handler checks its claims the way tools/results-service does. This machine's
// writer posts {rows: [...]} to /v1/local/{invocations,push-runs,waits} with a bearer token whose SHA-256 is in SSM.
// Every record becomes a raw item with a natural id, written through the model's putRaw, so a retried post replaces
// what it wrote before and the recomputed rollups never count it twice.

import { createHash, timingSafeEqual } from "node:crypto";

import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { dynamoStore } from "../dynamo.js";
import {
    DAY,
    oldestAt,
    putRaw,
    recordSource,
    takeQuota,
    ttlAt,
    type LocalRunItem,
    type ObservationItem,
    type RawItem,
    type ShardRunItem,
    type StepItem,
    type TestItem,
} from "../model/index.js";
import { type BenchItem, benchKey, BENCH_PK, withPoint } from "../model/benchmarks.js";
import type { Store } from "../model/store.js";

export const MAX_BODY_BYTES = 1_000_000;
export const MAX_ROWS = 5000;
/**
 * A row DynamoDB would refuse (an item over its 400 KB, a partition key over 2048 bytes), refused before the quota
 * is charged or anything is written, so the request is all or nothing. Below the hard limits for the copies' keys.
 */
const MAX_ITEM_BYTES = 300_000;
const MAX_TRIES = 3;
const MAX_ID_BYTES = 900; // under the 1024-byte sort key with the copies' prefix and suffix
export const LOCAL_TOKEN_PARAMETER = "/graphty-health/local-token-sha256";
export const REPOSITORY = "graphty-org/graphty-monorepo";
export const REPOSITORY_ID = "1122477634";
/** The site repositories (tools/channel/site-deploy.yml), by id: each writes only its own deploy durations. */
export const DEPLOY_REPOSITORIES: Record<string, string> = {
    "1429353022": "graphty-org/graphty-site",
    "1433424324": "graphty-org/graphty-nightly",
};
const MASTER = "refs/heads/master";
/** The workflows that may write from master, and the kind each writes (as tools/results-service). */
const MASTER_KINDS: Record<string, Kind> = {
    "release.yml": "full",
    "ci.yml": "full",
    "gpu.yml": "full",
    "hosts.yml": "full",
    "work-protection-macos.yml": "full",
    "bisect.yml": "bisect",
    "base-check.yml": "base",
    "restricted-cpu-stress.yml": "stress",
    "deploy-pages.yml": "site",
};
const OUTCOMES = new Set(["passed", "failed", "error", "infra", "cancelled"]);
const VERDICTS = new Set(["green-clean", "green-images", "red", "owner-item"]);
const CI_ROUTES = new Set(["invocations", "failures", "durations", "verdicts", "sites", "benchmarks"]);
/** Results in one benchmark post, and the longest benchmark name or source. */
const MAX_BENCH_ROWS = 1000;
const MAX_BENCH_NAME = 200;
const LOCAL_ROUTES = new Set(["invocations", "push-runs", "waits"]);

type Kind = "pr" | "full" | "bisect" | "base" | "stress" | "local" | "deploy" | "site";
type Claims = Record<string, string | number | boolean | string[] | undefined>;
interface Who {
    kind: Kind;
    claims: Claims;
}

class Refused extends Error {
    readonly status: number;
    readonly code: string;
    readonly params: Record<string, string | number>;
    constructor(status: number, code: string, params: Record<string, string | number> = {}) {
        super(code);
        this.status = status;
        this.code = code;
        this.params = params;
    }
}
const refuse = (status: number, code: string, params: Record<string, string | number> = {}): never => {
    throw new Refused(status, code, params);
};

const ssm = new SSMClient({});
let localTokenHash: Promise<string | undefined> | undefined;
let store: Store | undefined;

/**
 * POST /v1/{invocations,failures,durations,verdicts} (CI) and /v1/local/{invocations,push-runs,waits} (this machine).
 * @param event - the HTTP API request, with the JWT claims on the CI routes
 * @returns 200 {stored}, or an error {code, params}
 */
export async function handler(
    event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> {
    try {
        return json(200, await ingest(event, Date.now()));
    } catch (error) {
        if (error instanceof Refused) return json(error.status, { code: error.code, params: error.params });
        // DynamoDB refused a row's content (a key or an item over its size limit): the body's fault, not an
        // outage, so a 400 the local collector splits on; everything else stays a 500 it retries.
        // Only DynamoDB's size limits: any other ValidationException is our own bug and must stay a 500.
        const e = error as { name?: unknown; message?: unknown } | null;
        if (
            e?.name === "ValidationException" &&
            /item size (to update )?has exceeded|size of (hashkey|range ?key)|size of all range keys/i.test(
                String(e.message),
            )
        ) {
            console.error(JSON.stringify({ route: event.rawPath, refused: String(error) }));
            return json(400, { code: "row_refused" });
        }
        console.error(JSON.stringify({ route: event.rawPath, error: String(error) }));
        return json(500, { code: "internal" });
    }
}

async function ingest(event: APIGatewayProxyEventV2WithJWTAuthorizer, now: number) {
    const raw = event.body ?? "";
    const size = Buffer.byteLength(raw, event.isBase64Encoded ? "base64" : "utf8");
    if (size > MAX_BODY_BYTES) refuse(413, "too_large", { limit: MAX_BODY_BYTES });
    const local = event.rawPath.startsWith("/v1/local/");
    const route = event.rawPath.split("/").pop() ?? "";
    if (!(local ? LOCAL_ROUTES : CI_ROUTES).has(route)) refuse(404, "unknown_route");
    let who: Who;
    if (local) {
        if (!(await localTokenOk(event.headers?.authorization))) refuse(401, "unauthorized");
        who = { kind: "local", claims: {} };
    } else {
        who = whoOf((event.requestContext.authorizer?.jwt?.claims ?? {}) as Claims);
    }
    let body: unknown;
    try {
        body = JSON.parse(event.isBase64Encoded ? Buffer.from(raw, "base64").toString("utf8") : raw);
    } catch {
        return refuse(400, "bad_json");
    }
    if (!body || typeof body !== "object") refuse(400, "bad_body");
    const db = (store ??= dynamoStore(process.env.TABLE_NAME ?? "graphty-health"));
    const { items, extra, source } = await itemsOf(route, body as Record<string, unknown>, who, db, now);
    // The cap is on the rows posted; the bookkeeping copies (INVTESTS, at most one per row) are charged below.
    if (items.length > MAX_ROWS) refuse(413, "too_many_rows", { limit: MAX_ROWS });
    checkSizes(items);
    if (!(await takeQuota(db, items.length + extra.length, now))) refuse(429, "write_budget");
    // The bookkeeping copies first: a failing try's INVTESTS rows exist before its test rows, so a passing retry
    // finds them even when a test write below fails.
    if (extra.length) await db.batch(extra.map((put) => ({ put })));
    await putRaw(db, items, now);
    await recordSource(db, source, now, { ok: true }, oldestAt(items));
    log({ route: event.rawPath, kind: who.kind, size, rows: items.length });
    return { stored: items.length, kind: who.kind };
}

/** Refuses a row over DynamoDB's key or item size before anything is charged or written. */
function checkSizes(items: RawItem[]): void {
    for (const item of items)
        if (
            Buffer.byteLength(String(item.id)) > MAX_ID_BYTES ||
            Buffer.byteLength(JSON.stringify(item)) > MAX_ITEM_BYTES
        )
            refuse(400, "row_refused", { id: String(item.id).slice(0, 200) });
}

/** The kind a token's claims may write (tools/results-service kindOf), or a refusal. */
export function whoOf(claims: Claims): Who {
    if (claims.repository_owner !== "graphty-org") refuse(403, "wrong_owner");
    const site = DEPLOY_REPOSITORIES[String(claims.repository_id)];
    if (site && claims.repository === site) {
        // Only the site repository's deploy.yml (tools/channel/site-deploy.yml) at its default branch: never a pull
        // request's, another branch's, or another workflow's (pull_request_target, workflow_run) token.
        const ref = String(claims.ref);
        if (
            claims.event_name === "pull_request" ||
            !/^refs\/heads\/(main|master)$/.test(ref) ||
            claims.job_workflow_ref !== `${site}/.github/workflows/deploy.yml@${ref}`
        )
            refuse(403, "deploy_from_default_branch_only");
        return { kind: "deploy", claims };
    }
    if (claims.repository !== REPOSITORY || String(claims.repository_id) !== REPOSITORY_ID)
        refuse(403, "wrong_repository");
    if (claims.event_name === "pull_request") return { kind: "pr", claims };
    const prefix = `${REPOSITORY}/.github/workflows/`;
    const [path, at] = String(claims.job_workflow_ref ?? "").split("@");
    const file = path.startsWith(prefix) ? path.slice(prefix.length) : "";
    const kind = Object.hasOwn(MASTER_KINDS, file) ? MASTER_KINDS[file] : undefined;
    if (!kind || claims.ref !== MASTER || at !== MASTER) refuse(403, "wrong_workflow", { file });
    return { kind: kind!, claims };
}

const runPrefix = (who: Who) => (who.kind === "local" ? "local." : `${who.claims.run_id}.${who.claims.run_attempt}.`);
function ownId(id: unknown, who: Who): string {
    const prefix = runPrefix(who);
    if (typeof id !== "string" || !id.startsWith(prefix)) refuse(403, "foreign_id", { prefix });
    return id as string;
}

function need(o: Record<string, unknown>, fields: Record<string, "string" | "number">): void {
    for (const [name, type] of Object.entries(fields))
        if (typeof o[name] !== type || (type === "number" && !Number.isFinite(o[name])))
            refuse(400, "bad_field", { field: name, type });
}

const list = (v: unknown, field: string): Record<string, unknown>[] => {
    if (!Array.isArray(v) || !v.every((r) => r && typeof r === "object"))
        refuse(400, "bad_field", { field, type: "list" });
    return v as Record<string, unknown>[];
};

/** "graphty-element-browser-3" and "compact-mantine+files" fold into their family. */
export const familyOf = (variant: string) => variant.replace(/\+.*$/, "").replace(/-\d+$/, "");

type Extra = { pk: string; sk: string; [k: string]: unknown };
interface Built {
    items: RawItem[];
    /** Index items written beside the raw ones (not rows of a metric). */
    extra: Extra[];
    source: string;
}

async function localItems(route: string, body: Record<string, unknown>, who: Who, db: Store, now: number) {
    const rows = list(body.rows, "rows");
    if (rows.length > MAX_ROWS) refuse(413, "too_many_rows", { limit: MAX_ROWS });
    const items: RawItem[] = [];
    for (const r of rows) {
        if (route === "invocations") items.push(...(await invocationItems(r, who, db, now)).items);
        else if (route === "push-runs") items.push(pushRun(r));
        else items.push(slotWait(r));
    }
    return items;
}

async function itemsOf(route: string, body: Record<string, unknown>, who: Who, db: Store, now: number): Promise<Built> {
    if (who.kind === "local") return { items: await localItems(route, body, who, db, now), extra: [], source: "local" };
    // As tools/results-service: a site repository writes only durations, deploy-pages.yml only its site and durations.
    if (
        (who.kind === "deploy" || who.kind === "site") &&
        route !== "durations" &&
        !(who.kind === "site" && route === "sites")
    )
        refuse(403, "wrong_route", { kind: who.kind });
    if (route === "sites" && who.kind !== "site") refuse(403, "sites_from_deploy_pages_only");
    switch (route) {
        case "sites":
            return { items: [], extra: [siteItem(body, who, now)], source: "site" };
        case "invocations":
            return { ...(await invocationItems(body, who, db, now)), source: "ci-results" };
        case "failures":
            // CI's flaky detections (tools/test-quarantine.mjs) are the flaky feed's own source on the Data sources page
            return {
                ...(await failureItems(body, who, db, now)),
                source: body.flaky === true ? "flaky-feed" : "ci-results",
            };
        case "benchmarks":
            return { items: [], extra: await benchItems(body, who, db, now), source: "benchmarks" };
        case "durations":
            // The site repositories' and deploy-pages.yml's deploy timings must not keep ci-results looking fresh.
            return {
                items: durationItems(body, who, now),
                extra: [],
                source: who.kind === "deploy" || who.kind === "site" ? "site" : "ci-results",
            };
        default:
            return { items: [verdictItem(body, who, now)], extra: [], source: "release" };
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Test results: an invocation is a shard run; each failure a test item.

const INV_TESTS = (inv: string) => `INVTESTS#${inv}`;

/**
 * A dependency-bump pull request (Dependabot's, or tools/dependency-refresh.mjs's grouped refresh): its failures are
 * the bump's, deterministic, so they are kept out of the flaky readings (#4147).
 * @param who
 */
const isBump = (who: Who) =>
    who.kind === "pr" && /^(dependabot\/|chore\/deps-refresh-)/.test(String(who.claims.head_ref ?? ""));

function testItem(
    inv: string,
    f: Record<string, unknown>,
    family: string,
    source: "ci" | "local",
    flaky: boolean,
    seenAt: number,
    bump: boolean,
): TestItem {
    need(f, { file: "string", name: "string", message: "string" });
    const message = f.message as string;
    return {
        kind: "test",
        id: `${inv}#${f.file as string}#${f.name as string}`,
        attempt: 1,
        source,
        invocation: inv,
        family,
        file: f.file as string,
        name: f.name as string,
        outcome: flaky ? "flaky" : "failed",
        status: /timed? ?out/i.test(message) ? "timeout" : "fail",
        // ponytail: the first line, not the results service's normalized signature; import signature.js if the
        // hotspots need to group by it.
        signature: (message.split("\n")[0] ?? "").slice(0, 200),
        seenAt,
        ...(bump ? { bump: true } : {}),
    };
}

async function invocationItems(
    b: Record<string, unknown>,
    who: Who,
    db: Store,
    now: number,
): Promise<{ items: RawItem[]; extra: Extra[] }> {
    const id = ownId(b.id, who);
    need(b, { sha: "string", variant: "string", try: "number", startedAt: "number", secs: "number" });
    if (!Number.isInteger(b.try)) refuse(400, "bad_field", { field: "try", type: "integer" });
    if (!OUTCOMES.has(b.outcome as string)) refuse(400, "bad_field", { field: "outcome", type: "outcome" });
    if (who.kind === "pr" && b.sha !== who.claims.sha) refuse(403, "foreign_sha");
    const files = b.files ?? [];
    if (!Array.isArray(files) || !files.every((f) => Array.isArray(f) && f.length === 5))
        refuse(400, "bad_field", { field: "files", type: "file rows" });
    const variant = b.variant as string;
    const family = familyOf(variant);
    const source = who.kind === "local" ? "local" : "ci";
    const startedAt = b.startedAt as number;
    const endedAt = startedAt + (b.secs as number) * 1000;
    const passed = b.outcome === "passed";
    const run: ShardRunItem = {
        kind: "shard_run",
        id,
        attempt: b.try as number,
        source,
        variant,
        family,
        // A light-check bin: a pull request's test shard. A run of the `shots` shape (variant
        // `<family>|flags=..|shots`) is the Story tests job's whole-project capture, report-only and outside
        // All Checks Pass, so not a bin: counted, graphty's 30-minute capture alone put ci.bins_over_8 at 80%
        // while every required job of the same runs took under 9 minutes.
        bin: who.kind === "pr" && variant.split("|").at(-1) !== "shots",
        full: who.kind === "full",
        ...(typeof b.pr === "number" ? { pr: b.pr } : {}),
        sha: b.sha as string,
        outcome: b.outcome as string,
        startedAt,
        endedAt,
        secs: b.secs as number,
        files: files as ShardRunItem["files"],
    };
    // A failure in a shard that passed failed and then passed on the same inputs (its retry): flaky.
    const items: RawItem[] = [run];
    for (const f of list(b.failures ?? [], "failures"))
        items.push(testItem(id, f, family, source, passed, endedAt, isBump(who)));
    if (passed && source === "ci") {
        // This try's own failures are recorded above; the lookback marks only the earlier tries' other tests.
        const own = new Set(items.flatMap((i) => (i.kind === "test" ? [`${i.file}#${i.name}`] : [])));
        // The CI writers give each try its own id, `<base>.<try>` (tools/results/run-group.mjs): the failures
        // of the earlier tries are under their ids.
        const tryOf = /^(.*)\.(\d+)$/.exec(id);
        const invs = [id];
        // The poster sets try: bounded to the few retries CI makes, so it cannot drive unbounded queries.
        if (tryOf && Number(tryOf[2]) === b.try)
            for (let k = Math.max(1, b.try - MAX_TRIES); k < b.try; k++) invs.push(`${tryOf[1]}.${k}`);
        for (const inv of invs)
            for (const t of await db.query(INV_TESTS(inv))) {
                const { pk: _pk, sk: _sk, ttl: _ttl, ...test } = t;
                if (own.has(`${String(test.file)}#${String(test.name)}`)) continue;
                // The passing run's family: an early failure post only guessed it from the id.
                items.push({ ...(test as unknown as TestItem), family, outcome: "flaky" });
            }
    }
    // The two tries' posts are not ordered: putRaw never lets a failed result replace a flaky one. A failing CI try
    // remembers its failures itself (written before its test rows), so a passing try can find them even when the
    // separate /v1/failures post was lost; a passing try that finishes its lookback before then still misses them.
    const extra = !passed && source === "ci" ? invTests(id, items, now) : [];
    return { items, extra };
}

/** Each failure, remembered per invocation, so a shard run posted later as passed can turn it flaky. */
const invTests = (inv: string, items: RawItem[], now: number): Extra[] =>
    items.flatMap((t) =>
        t.kind === "test" ? [{ ...t, pk: INV_TESTS(inv), sk: t.id, ttl: ttlAt(now + 90 * DAY) }] : [],
    );

async function failureItems(b: Record<string, unknown>, who: Who, db: Store, now: number) {
    const inv = ownId(b.invocation, who);
    const failures = b.failures === undefined ? [b] : list(b.failures, "failures");
    // The shard run, when it was posted first, gives the family and whether it passed (then these are flaky).
    // `flaky: true` is the CI writer's own verdict (tools/test-quarantine.mjs): these failed, then passed on the
    // retry, whatever the retry's other tests did. It names the shard's family, which its id alone does not give.
    const runs = (await db.query(`R#shard_run#${inv}`)) as unknown as ShardRunItem[];
    const run = runs.at(-1);
    const named = typeof b.family === "string" && b.family !== "" ? b.family : undefined;
    const family = run?.family ?? named ?? familyOf(inv.split(".").slice(2).join("."));
    const flaky = b.flaky === true || run?.outcome === "passed";
    const items = failures.map((f) => testItem(inv, f, family, "ci", flaky, run?.endedAt ?? now, isBump(who)));
    return { items, extra: invTests(inv, items, now) };
}

/** Job and step timings: kept for drill-downs; no metric counts them, so they never double the collector's jobs. */
function durationItems(b: Record<string, unknown>, who: Who, now: number): StepItem[] {
    const rows = list(b.rows, "rows");
    if (rows.length > MAX_ROWS) refuse(413, "too_many_rows", { limit: MAX_ROWS });
    return rows.map((r) => {
        need(r, { workflow: "string", job: "string", ms: "number" });
        if (String(r.runId) !== String(who.claims.run_id) || String(r.attempt) !== String(who.claims.run_attempt))
            refuse(403, "foreign_run");
        const part = (r.step ?? r.task ?? "-") as string;
        const startedAt = typeof r.startedAt === "number" ? r.startedAt : now - (r.ms as number);
        return {
            kind: "step",
            id: `${r.runId as string | number}.${r.job as string}.${part}`,
            attempt: Number(r.attempt),
            repo: who.kind === "deploy" ? String(who.claims.repository) : REPOSITORY,
            runId: Number(r.runId),
            jobId: 0,
            workflow: r.workflow as string,
            job: r.job as string,
            name: part,
            ...(typeof r.conclusion === "string" ? { conclusion: r.conclusion } : {}),
            startedAt,
            completedAt: startedAt + (r.ms as number),
        };
    });
}

/**
 * A benchmark job's results (`{ source, sha?, unit?, rows: [{ name, value }] }`, tools/results/post-benchmarks.mjs),
 * each added to its benchmark's item (model/benchmarks.ts) as this run's point. Only from master's workflows: a pull
 * request's numbers would move master's trend.
 */
async function benchItems(b: Record<string, unknown>, who: Who, db: Store, now: number): Promise<Extra[]> {
    if (who.kind !== "full") refuse(403, "benchmarks_from_master_only");
    need(b, { source: "string" });
    const source = (b.source as string).slice(0, MAX_BENCH_NAME);
    const unit = typeof b.unit === "string" ? b.unit.slice(0, 10) : "ms";
    const rows = list(b.rows, "rows");
    if (rows.length > MAX_BENCH_ROWS) refuse(413, "too_many_rows", { limit: MAX_BENCH_ROWS });
    const old = new Map(((await db.query(BENCH_PK)) as BenchItem[]).map((i) => [i.sk, i]));
    const run = Number(who.claims.run_id);
    const sha = typeof b.sha === "string" ? b.sha.slice(0, 40) : undefined;
    const out = new Map<string, Extra>();
    for (const r of rows) {
        need(r, { name: "string", value: "number" });
        if ((r.value as number) < 0) refuse(400, "bad_field", { field: "value", type: "non-negative" });
        const benchmark = `${source}: ${(r.name as string).slice(0, MAX_BENCH_NAME)}`;
        const point = { at: now, v: r.value as number, run, ...(sha ? { sha } : {}) };
        out.set(benchmark, withPoint(old.get(benchKey(benchmark).sk), benchmark, unit, point, now) as Extra);
    }
    return [...out.values()];
}

/** A site deploy-pages.yml built and kept as artifact site-<sha> (as the results service's `site` table). */
function siteItem(b: Record<string, unknown>, who: Who, now: number): Extra {
    if (!/^[0-9a-f]{40}$/.test(String(b.sha ?? ""))) refuse(400, "bad_field", { field: "sha", type: "commit" });
    return { pk: "SITE", sk: b.sha as string, sha: b.sha, builtAt: now, runId: Number(who.claims.run_id) };
}

function verdictItem(b: Record<string, unknown>, who: Who, now: number): ObservationItem {
    if (who.kind !== "full" || !String(who.claims.job_workflow_ref).includes("/release.yml@"))
        refuse(403, "verdicts_from_release_only");
    need(b, { sha: "string", state: "string" });
    if (!VERDICTS.has(b.state as string)) refuse(400, "bad_field", { field: "state", type: "verdict" });
    return {
        kind: "obs",
        id: `master.full_run_failed#${b.sha as string}`,
        attempt: 1,
        metric: "master.full_run_failed",
        value: b.state === "red" ? 1 : 0,
        at: now,
    };
}

// ---------------------------------------------------------------------------------------------------------------
// The local writer's push log and slot waits.

function localId(r: Record<string, unknown>): string {
    if (typeof r.id !== "string" || !r.id.startsWith("local.")) refuse(403, "foreign_id", { prefix: "local." });
    return r.id as string;
}

function pushRun(r: Record<string, unknown>): LocalRunItem {
    const id = localId(r);
    need(r, { at: "number", exit: "number" });
    const at = r.at as number;
    const start = [r.startedAt, r.queuedAt].find((v) => typeof v === "number") as number | undefined;
    return {
        kind: "local_run",
        id,
        attempt: 1,
        what: "gate",
        outcome: r.exit === 0 ? "passed" : "failed",
        startedAt: start ?? at,
        endedAt: at,
    };
}

function slotWait(r: Record<string, unknown>): ObservationItem {
    const id = localId(r);
    need(r, { end: "number", ms: "number" });
    // ponytail: one metric for every slot kind; split by kind if the page ever shows them apart.
    return { kind: "obs", id, attempt: 1, metric: "local.slot_wait", value: r.ms as number, at: r.end as number };
}

// ---------------------------------------------------------------------------------------------------------------

async function localTokenOk(authorization: string | undefined): Promise<boolean> {
    const token = /^Bearer (\S+)$/.exec(authorization ?? "")?.[1];
    if (!token) return false;
    localTokenHash ??= ssm
        .send(new GetParameterCommand({ Name: LOCAL_TOKEN_PARAMETER, WithDecryption: true }))
        .then((r) => r.Parameter?.Value?.trim().toLowerCase())
        .catch((error: unknown) => {
            localTokenHash = undefined; // retry on the next request
            console.error(JSON.stringify({ route: "local", error: String(error) }));
            return undefined;
        });
    const expected = await localTokenHash;
    if (!expected) return false;
    const actual = createHash("sha256").update(token).digest("hex");
    return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function log(fields: Record<string, unknown>): void {
    process.stdout.write(`${JSON.stringify(fields)}\n`);
}

function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
    return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
