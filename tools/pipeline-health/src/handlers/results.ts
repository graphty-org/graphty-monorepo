// The results service (tools/results-service) on the health API, issue #3607: every route CI uses, with the Worker's
// bodies, query strings and answers, over its records in their own `RS#` items of the graphty-health table. The
// ingest Lambda writes the records (recordResults) from the posts CI sends it, the same bodies the Worker gets; this
// Lambda answers the reads. Like the Worker, every answer is computed when it is read, from stored records only,
// except a quarantine entry's passes, which each master run adds to as it is stored (the Worker counted them on read
// with a join DynamoDB has no counterpart of), and each key's newest duration sample and each story's newest capture,
// which are kept as they are stored.
//
// Reads are public, as every read of this API is: the Worker asked for a credential and checked nothing else about it.

import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { failureHashes, issueKey } from "../../../results-service/src/signature.js";
import { dynamoStore } from "../dynamo.js";
import { DAY, ttlAt } from "../model/index.js";
import { isLive, type Item, type Store } from "../model/store.js";

/** A refusal, answered as the Worker answers it: the status and `{ error: <message> }`. */
export class ResultsRefused extends Error {
    readonly status: number;
    /**
     * A refusal.
     * @param status - the HTTP status
     * @param message - the Worker's error message
     */
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}
const refuse = (status: number, message: string): never => {
    throw new ResultsRefused(status, message);
};

/** The writer, with the kind tools/results-service's kindOf gives its token (ingest.ts resultsKindOf). */
interface ResultsWho {
    kind: string;
    claims: Record<string, unknown>;
}

const EVIDENCE = new Set(["pr", "full", "bisect", "base"]); // what reuse and history may count (never local)
const MASTER_EVIDENCE = new Set(["full", "bisect", "base"]); // the only kinds that excuse or pass a quarantine
const NO_TESTS = new Set(["deploy", "site", "nightly-site", "master", "slice", "promote"]);
const OUTCOMES = new Set(["passed", "failed", "error", "infra", "cancelled"]);
const ISSUE_KINDS = new Set(["flaky", "failing-on-master"]);
const VERDICTS = new Set([
    "green-clean",
    "green-images",
    "red",
    "owner-item",
    "approved",
    "rejected",
    "refused",
    "deferred",
]);
const HISTORY_INVOCATIONS = 1000;
const QUARANTINE_PASSES = 20;
const PLAN_VARIANTS_MAX = 100;
const ROWS_MAX = 5000;
const VALUE_MAX = 2000;
// GPU tests, and the style fidelity slices: a sample judged differently on the same inputs is a determinism defect
const NEVER_QUARANTINED = /^(webgpu-graph-algorithms|graphty-element-fidelity)/;
// The inputs placeholder a client sends when it knows no inputs key (every client does today, #7269): it matches
// no record, so its pair term and reuse lookup are skipped.
const NO_INPUTS = "-";
const SHA = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
// ponytail: records are kept 90 days, so a plan's history and a base's failures reach back that far at most (the
// Worker kept every record); a variant with fewer than 1,000 runs in 90 days gives its files fewer samples.
const KEEP_MS = 90 * DAY;

// The partitions, all under `RS#` (the variant, sha and test parts come from CI's own records).
const RS = {
    // A variant's evidence runs that passed or failed, sk `<startedAt>#<id>`: the plan's history.
    runs: (variant: string): string => `RS#INV#${variant}`,
    // A variant's failed evidence runs and the files they failed, kept 8 days: the plan's `order`.
    failedRuns: (variant: string): string => `RS#FAILV#${variant}`,
    // Every variant with a stored run, sk the variant: a files-only plan reads them all.
    variants: "RS#VARIANT",
    // Master's failures on one commit: `failingOnBase`.
    failedOn: (sha: string): string => `RS#FSHA#${sha}`,
    // Master's failures on one variant and inputs key.
    failedWith: (variant: string, inputs: string): string => `RS#FIN#${variant}\u0000${inputs}`,
    // Each variant's newest full run, sk the variant.
    newestFull: "RS#NEWFULL",
    // Master's runs of one commit, variant and inputs key, with their file counts: the flaky proof.
    same: (sha: string, variant: string, inputs: string): string => `RS#SAME#${sha}\u0000${variant}\u0000${inputs}`,
    // The quarantine, sk `<test hash>#<since>`.
    quarantine: "RS#QUAR",
    // Tracked issues, sk the issue key (signature).
    issues: "RS#ISSUE",
    // A commit's nightly channel moves, sk the run id.
    moves: (sha: string): string => `RS#MOVE#${sha}`,
    // A commit's verdicts, sk `<run>#<attempt>#<state>`.
    verdicts: (sha: string): string => `RS#VERDICT#${sha}`,
    // Every commit's verdicts by time, sk `<at>#<sha>#<run>#<attempt>#<state>`: the candidate pick and release state.
    verdictLog: "RS#VERDICTS",
    // Every nightly channel move by time, sk `<at>#<sha>#<run>`: nightly's commit.
    moveLog: "RS#MOVES",
    // A run's failed tests, sk `<invocation>\u0000<test hash>`: GET /v1/failures.
    failedIn: (run: string): string => `RS#FRUN#${run}`,
    // Master's failures of one test, sk `<startedAt>#<invocation>`: GET /v1/failures's failedBefore.
    testFailed: (test: string): string => `RS#FTEST#${test}`,
    // The sites deploy-pages.yml kept, sk the commit (its first build), and by build time, sk `<builtAt>#<sha>`.
    site: "RS#SITE",
    sites: "RS#SITES",
    // The held nightly candidate, one item (sk `1`).
    hold: "RS#HOLD",
    // Base check claims, sk `<base>\u0000<file and variant hash>`.
    baseChecks: "RS#BASECHECK",
    // A key's duration samples within a run kind and workflow, sk `<startedAt>#<run>.<attempt>`.
    durations: (kind: string, workflow: string, key: string): string => `RS#DUR#${kind}\u0000${workflow}\u0000${key}`,
    // A kind and workflow's keys, each with its newest sample, sk the key.
    durationKeys: (kind: string, workflow: string): string => `RS#DURKEY#${kind}\u0000${workflow}`,
    // A kind and workflow's runs, sk the run id.
    durationRuns: (kind: string, workflow: string): string => `RS#DURRUN#${kind}\u0000${workflow}`,
    // Test duration histories (tools/vitest-time-budget.mjs), sk the name.
    testHistory: "RS#TESTDUR",
    // Story captures of the last 7 days, sk `<story hash>#<run order>`, and each story's newest, sk the story hash.
    captures: "RS#CAP",
    newestCaptures: "RS#CAPNEW",
    // Each slice unit's newest capture, sk the unit hash.
    units: "RS#UNIT",
    // When the owner was last notified, sk the kind (queue, slot).
    notified: "RS#NOTIFY",
    // The story units a master commit reaches, sk the unit hash.
    reach: (sha: string): string => `RS#REACH#${sha}`,
};

const pad = (ms: number): string => String(Math.max(0, Math.trunc(ms))).padStart(13, "0");
const h16 = (s: string): string => createHash("sha256").update(s).digest("hex").slice(0, 16);
// A test's sort key part: a hash, so a long file or test name never passes DynamoDB's 1 KB sort key.
const testKey = (family: string, file: string, name: string): string => h16(`${family}\u0000${file}\u0000${name}`);
const packed = (v: unknown): Uint8Array => gzipSync(JSON.stringify(v));
const unpacked = (v: unknown): unknown => JSON.parse(gunzipSync(v as Uint8Array).toString("utf8"));
const absent = (v: unknown): v is null | undefined => v === null || v === undefined;
const list = (value: string | null): string[] => (value ?? "").split(",").filter(Boolean);
const median = (xs: number[]): number => {
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function need(body: Record<string, unknown>, fields: Record<string, "string" | "number">): void {
    for (const [name, type] of Object.entries(fields)) {
        if (typeof body[name] !== type) {
            refuse(400, `${name} must be a ${type}`);
        }
    }
}
const integer = (v: unknown, name: string): number =>
    Number.isInteger(v) ? (v as number) : refuse(400, `${name} must be an issue number`);

// Fields that may be left out, or null, but are of their type when given.
function mayHave(body: Record<string, unknown>, fields: Record<string, "string" | "number">): void {
    for (const [name, type] of Object.entries(fields)) {
        if (!absent(body[name]) && typeof body[name] !== type) {
            refuse(400, `${name} must be a ${type} when given`);
        }
    }
}

function ownId(id: unknown, who: ResultsWho): string {
    const prefix = `${String(who.claims.run_id)}.${String(who.claims.run_attempt)}.`;
    if (typeof id !== "string" || !id.startsWith(prefix)) {
        refuse(403, `the id must start with ${prefix}`);
    }
    return id as string;
}

// ---------------------------------------------------------------------------------------------------------------
// Writes

/** [file, passed, failed, skipped, ms] */
type FileRow = [string, number | null, number | null, number | null, number | null];
interface Failure {
    file: string;
    name: string;
    key: string;
    signature: string;
    status: string;
}

function fileRows(v: unknown): FileRow[] {
    const counts = (f: unknown[]): boolean => f.slice(1).every((n) => absent(n) || typeof n === "number");
    if (
        !Array.isArray(v) ||
        v.length > ROWS_MAX ||
        !v.every((f) => Array.isArray(f) && f.length === 5 && typeof f[0] === "string" && counts(f))
    ) {
        refuse(400, "files must be [file, passed, failed, skipped, ms] rows");
    }
    return v as FileRow[];
}

function failureRows(v: unknown): Failure[] {
    if (!Array.isArray(v) || v.length > ROWS_MAX) {
        refuse(400, `failures must be a list of at most ${ROWS_MAX}`);
    }
    return (v as Record<string, unknown>[]).map((f) => {
        need(f ?? {}, { file: "string", name: "string", message: "string" });
        const { key, signature, status } = failureHashes((f.message as string).slice(0, VALUE_MAX), f.file);
        return { file: f.file as string, name: f.name as string, key, signature, status };
    });
}

/** One run's file counts and failures, as the flaky proof compares them. */
interface Run {
    id: string;
    files: Record<string, [number, number, number]>;
    failures: [string, string, string, string][]; // file, name, signature, status
}

interface Flaky {
    family: string;
    file: string;
    name: string;
    signature: string;
    proof: string;
    had: number | null;
}
interface Posted {
    id: string;
    kind: string;
    sha: string;
    variant: string;
    inputs: string;
    startedAt: number;
    outcome: string;
    files: FileRow[];
    failures: Failure[];
}

function postedRun(b: Record<string, unknown>, who: ResultsWho): Posted {
    if (NO_TESTS.has(who.kind)) {
        refuse(403, `kind ${who.kind} writes no test records`);
    }
    const id = ownId(b.id, who);
    need(b, { sha: "string", variant: "string", inputs: "string", startedAt: "number" });
    if (!OUTCOMES.has(b.outcome as string)) {
        refuse(400, `outcome must be one of ${[...OUTCOMES].join(", ")}`);
    }
    if (who.kind === "pr" && b.sha !== who.claims.sha) {
        refuse(403, "a pull request writes only its own merge commit");
    }
    const { sha, variant, inputs, startedAt, outcome } = b as Record<string, string> & { startedAt: number };
    const files = fileRows(b.files ?? []);
    const failures = failureRows(b.failures ?? []);
    return { id, kind: who.kind, sha, variant, inputs, startedAt, outcome, files, failures };
}

// What the plan reads of one evidence run: its file durations, its failed files, and master's failures.
function runItems(r: Posted, now: number): Item[] {
    const ttl = ttlAt(now + KEEP_MS);
    const sk = `${pad(r.startedAt)}#${r.id}`;
    const timed = r.files.filter((f) => !absent(f[4])).map((f) => [f[0], f[4]]);
    const { id, kind, outcome, inputs, startedAt, variant, sha } = r;
    const items: Item[] = [
        { pk: RS.runs(variant), sk, id, kind, outcome, inputs, startedAt, files: packed(timed), ttl },
        { pk: RS.variants, sk: variant, at: now },
    ];
    const failedFiles = [...new Set(r.failures.map((f) => f.file))];
    if (outcome === "failed" && failedFiles.length) {
        items.push({ pk: RS.failedRuns(variant), sk, startedAt, files: failedFiles, ttl: ttlAt(now + 8 * DAY) });
    }
    if (!MASTER_EVIDENCE.has(kind) || outcome !== "failed") {
        return items;
    }
    for (const f of r.failures) {
        const row = {
            variant,
            sha,
            file: f.file,
            name: f.name,
            key: f.key,
            signature: f.signature,
            kind,
            invocation: id,
        };
        const test = h16([f.file, f.name].join("\u0000"));
        const at = `${id}#${test}`;
        items.push({ pk: RS.failedOn(sha), sk: `${variant}\u0000${at}`, ...row, ttl });
        if (inputs !== NO_INPUTS) {
            items.push({ pk: RS.failedWith(variant, inputs), sk: at, ...row, ttl });
        }
    }
    return items;
}

// A record's failed tests by run (GET /v1/failures), and master's by test, when it started (its failedBefore).
function failedItems(inv: string, failures: Failure[], now: number, master?: { startedAt: number }): Item[] {
    const ttl = ttlAt(now + KEEP_MS);
    return failures.flatMap((f) => {
        const test = h16(`${f.file}\u0000${f.name}`);
        const row = { invocation: inv, file: f.file, name: f.name, ttl };
        const byRun = { pk: RS.failedIn(inv.split(".")[0]), sk: `${inv}\u0000${test}`, ...row };
        return master ? [byRun, { pk: RS.testFailed(test), sk: `${pad(master.startedAt)}#${inv}`, ...row }] : [byRun];
    });
}

interface InvocationAnswer {
    stored: boolean;
    kind: string;
    flaky: Flaky[];
    tracked?: number[];
}

async function recordInvocation(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<InvocationAnswer> {
    const r = postedRun(b, who);
    const master = MASTER_EVIDENCE.has(r.kind) ? { startedAt: r.startedAt } : undefined;
    await db.batch(failedItems(r.id, r.failures, now, master).map((put) => ({ put })));
    if (r.kind === "full") {
        await db.put(
            { pk: RS.newestFull, sk: r.variant, sha: r.sha, startedAt: r.startedAt, ttl: ttlAt(now + KEEP_MS) },
            { field: "startedAt", op: "<", value: r.startedAt, orNotExists: true },
        );
    }
    const answer = { stored: true, kind: r.kind, flaky: [] };
    if (!EVIDENCE.has(r.kind) || !["passed", "failed"].includes(r.outcome)) {
        return answer;
    }
    await db.batch(runItems(r, now).map((put) => ({ put })));
    if (!MASTER_EVIDENCE.has(r.kind)) {
        return answer;
    }
    const run: Run = {
        id: r.id,
        files: Object.fromEntries(r.files.map((f) => [f[0], [f[1] ?? 0, f[2] ?? 0, f[3] ?? 0]])),
        failures: r.failures.map((f) => [f.file, f.name, f.signature, f.status]),
    };
    const flaky = await concludeFlaky(db, run, r, now);
    await countPasses(db, run, r.variant, r.startedAt, now);
    return { ...answer, flaky, tracked: await trackedIssues(db, r.variant.split("|")[0], now) };
}

// The issues of a family's quarantine entries in force, for the master job that posted to check on GitHub.
async function trackedIssues(db: Store, family: string, now: number): Promise<number[]> {
    const issues = ((await db.query(RS.quarantine)) as QuarantineItem[])
        .filter((q) => q.family === family && inForce(q, now) && q.issue !== undefined)
        .map((q) => q.issue as number);
    return [...new Set(issues)];
}

async function recordFailures(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<{ stored: number }> {
    if (NO_TESTS.has(who.kind)) {
        refuse(403, `kind ${who.kind} writes no test records`);
    }
    const inv = ownId(b.invocation, who);
    const failures = failureRows(b.failures ?? [b]);
    await db.batch(failedItems(inv, failures, now).map((put) => ({ put })));
    return { stored: failures.length };
}

interface QuarantineItem extends Item {
    family: string;
    file: string;
    name: string;
    issue?: number;
    since: number;
    expires: number;
    passes?: number;
    leftAt?: number;
}
const inForce = (q: QuarantineItem, now: number): boolean => q.leftAt === undefined && q.expires > now;

// Each master run that ran a quarantined test's file adds a pass to its entry, unless it failed the test, which
// starts the count again (as tools/results-service passesSince: a failure of any master run, a pass only of its family).
async function countPasses(db: Store, run: Run, variant: string, startedAt: number, now: number): Promise<void> {
    const family = variant.split("|")[0];
    const failed = new Set(run.failures.map(([file, name]) => `${file}\u0000${name}`));
    for (const q of (await db.query(RS.quarantine)) as QuarantineItem[]) {
        if (!inForce(q, now)) {
            continue;
        }
        const key = { pk: q.pk, sk: q.sk };
        if (failed.has(`${q.file}\u0000${q.name}`)) {
            await db.update(key, { set: { passes: 0 } });
        } else if (q.family === family && run.files[q.file] && q.since <= startedAt) {
            await db.update(key, { add: { passes: 1 } });
        }
    }
}

// Tests one run failed that the other ran to the end (the same test and skip counts) without failing.
interface Disagreement {
    file: string;
    name: string;
    signature: string;
    status: string;
    failedIn: string;
    passedIn: string;
}
function disagree(a: Run, b: Run): Disagreement[] {
    return a.failures.flatMap(([file, name, signature, status]) => {
        const ra = a.files[file] as [number, number, number] | undefined;
        const rb = b.files[file] as [number, number, number] | undefined;
        if (ra === undefined || rb === undefined) {
            return [];
        }
        if (ra[2] !== rb[2] || ra[0] + ra[1] !== rb[0] + rb[1]) {
            return [];
        }
        const passed = !b.failures.some(([f, n]) => f === file && n === name);
        return passed ? [{ file, name, signature, status, failedIn: a.id, passedIn: b.id }] : [];
    });
}

/**
 * Quarantines the tests a just-stored master run proves flaky (tools/results-service concludeFlaky): it failed a
 * test another master run of the same commit, variant and inputs passed, or passed one the other failed.
 * @param db - the store
 * @param run - the run just stored
 * @param at - its commit, variant and inputs key
 * @param at.sha - the commit
 * @param at.variant - the variant
 * @param at.inputs - the inputs key
 * @param now - the current time, in ms
 * @returns the tests quarantined and still without an issue
 */
async function concludeFlaky(
    db: Store,
    run: Run,
    { sha, variant, inputs }: { sha: string; variant: string; inputs: string },
    now: number,
): Promise<Flaky[]> {
    const pk = RS.same(sha, variant, inputs);
    await db.put({ pk, sk: run.id, run: packed(run), ttl: ttlAt(now + 30 * DAY) });
    const others = (await db.query(pk)).filter((o) => o.sk !== run.id).map((o) => unpacked(o.run) as Run);
    const found = others.flatMap((o) => [...disagree(run, o), ...disagree(o, run)]);
    const family = variant.split("|")[0];
    const out: Flaky[] = [];
    if (NEVER_QUARANTINED.test(family)) {
        return out;
    }
    for (const t of found) {
        if (out.some((o) => o.file === t.file && o.name === t.name)) {
            continue;
        }
        const hash = testKey(family, t.file, t.name);
        const entries = (await db.query(RS.quarantine, { from: `${hash}#`, to: `${hash}#~` })) as QuarantineItem[];
        let active = entries.find((q) => inForce(q, now));
        // an entry that had passed 20 times had left (the read computes that and never writes it): record it, so
        // the test enters again and its issue is reopened or commented on
        if (active && (active.passes ?? 0) >= QUARANTINE_PASSES) {
            await db.update(
                { pk: active.pk, sk: active.sk },
                { set: { leftAt: now, leftWhy: `${QUARANTINE_PASSES} passes since its last failure` } },
            );
            active = undefined;
        }
        // an active entry whose issue was never posted back (GitHub refused it) is named again, so it gets one
        if (active?.issue !== undefined) {
            continue;
        }
        const proof = `${t.failedIn} failed it, ${t.passedIn} passed it`;
        if (!active) {
            const expires = now + 14 * DAY;
            await db.put({
                pk: RS.quarantine,
                sk: `${hash}#${pad(now)}`,
                family,
                file: t.file,
                name: t.name,
                reason: "failed and passed on the same commit and inputs",
                proof,
                since: now,
                expires,
                passes: 0,
                ttl: ttlAt(expires + 30 * DAY),
            });
        }
        const signature = issueKey(t.signature, t.status, t.name);
        const had = await db.get({ pk: RS.issues, sk: signature });
        out.push({
            family,
            file: t.file,
            name: t.name,
            signature,
            proof,
            had: had?.kind === "flaky" ? (had.number as number) : null,
        });
    }
    return out;
}

// The issue a master job filed for a signature, set on the open quarantine entry it names; or a closed one, which
// ends its entries.
async function recordIssue(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<{ stored: boolean }> {
    if (!MASTER_EVIDENCE.has(who.kind)) {
        refuse(403, "only master's full, bisect and base runs file issues");
    }
    const number = integer(b.number, "number");
    const quarantine = (await db.query(RS.quarantine)) as QuarantineItem[];
    if (b.state === "closed") {
        for (const i of await db.query(RS.issues)) {
            if (i.number === number) {
                await db.update({ pk: i.pk, sk: i.sk }, { set: { state: "closed", lastSeen: now } });
            }
        }
        for (const q of quarantine.filter((e) => e.issue === number && e.leftAt === undefined)) {
            await db.update({ pk: q.pk, sk: q.sk }, { set: { leftAt: now, leftWhy: `issue #${number} closed` } });
        }
        return { stored: true };
    }
    need(b, { signature: "string" });
    if (!ISSUE_KINDS.has(b.kind as string)) {
        refuse(400, `kind must be one of ${[...ISSUE_KINDS].join(", ")}`);
    }
    // a signature holds one tracked issue; an issue of the other kind never overwrites it
    await db.update(
        { pk: RS.issues, sk: b.signature as string },
        { set: { kind: b.kind, number, state: "open", lastSeen: now } },
        { field: "kind", op: "=", value: b.kind as string, orNotExists: true },
    );
    const str = (v: unknown): string => (typeof v === "string" ? v : "");
    const hash = testKey(str(b.family), str(b.file), str(b.name));
    for (const q of quarantine.filter(
        (e) => e.sk.startsWith(`${hash}#`) && e.leftAt === undefined && e.issue === undefined,
    )) {
        await db.update({ pk: q.pk, sk: q.sk }, { set: { issue: number } });
    }
    return { stored: true };
}

async function recordVerdict(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<{ stored: boolean }> {
    const ref = String(who.claims.job_workflow_ref);
    const abandon = ref.includes("/nightly-abandon.yml@") && b.state === "rejected";
    if (who.kind !== "full" || !(ref.includes("/release.yml@") || abandon)) {
        refuse(403, "only master's own release.yml records a verdict");
    }
    need(b, { sha: "string", state: "string" });
    if (!VERDICTS.has(b.state as string)) {
        refuse(400, `state must be one of ${[...VERDICTS].join(", ")}`);
    }
    const issue = absent(b.issue) ? null : integer(b.issue, "issue");
    const run = `${String(who.claims.run_id)}#${String(who.claims.run_attempt)}`;
    const verdict = {
        sha: b.sha,
        state: b.state,
        lane: b.lane ?? null,
        issue,
        runId: Number(who.claims.run_id),
        at: now,
    };
    const sk = `${run}#${b.state as string}`;
    const stored = await db.put({ pk: RS.verdicts(b.sha as string), sk, ...verdict }, { notExists: true });
    if (stored) {
        const logged = `${pad(now)}#${b.sha as string}#${sk}`;
        await db.put({ pk: RS.verdictLog, sk: logged, ...verdict, ttl: ttlAt(now + 31 * DAY) });
    }
    return { stored };
}

// A nightly promotion's hashes, one item per run: a re-run of the site job replaces its run's hashes, keeping the time.
async function recordChannelMove(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<{ stored: boolean; replaced?: boolean }> {
    const release = who.kind === "full" && String(who.claims.job_workflow_ref).includes("/release.yml@");
    if (!release && who.kind !== "nightly-site") {
        refuse(403, "only master's own release.yml records a channel move");
    }
    if (b.channel !== "nightly") {
        refuse(400, "channel must be nightly");
    }
    const sha = typeof b.sha === "string" ? b.sha : "";
    if (!SHA.test(sha)) {
        refuse(400, "sha must be a full commit id");
    }
    if (!absent(b.versionCommit) && !(typeof b.versionCommit === "string" && SHA.test(b.versionCommit))) {
        refuse(400, "versionCommit must be a full commit id");
    }
    for (const field of ["siteSha256", "channelSha256"]) {
        if (!SHA256.test(typeof b[field] === "string" ? b[field] : "")) {
            refuse(400, `${field} must be a sha256`);
        }
    }
    const key = { pk: RS.moves(sha), sk: String(who.claims.run_id) };
    const hashes = { versionCommit: b.versionCommit ?? null, siteSha256: b.siteSha256, channelSha256: b.channelSha256 };
    if (await db.get(key)) {
        await db.update(key, { set: hashes });
        return { stored: true, replaced: true };
    }
    await db.put({ ...key, ...hashes, at: now });
    await db.put({ pk: RS.moveLog, sk: `${pad(now)}#${sha}#${key.sk}`, sha, at: now });
    return { stored: true };
}

// A master build kept its site as artifact site-<sha> in this run: the full run's candidate pick reads it. The first
// build of a commit is its record, as the Worker's INSERT OR IGNORE.
async function recordSite(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<{ stored: boolean; sha: string }> {
    if (who.kind !== "site") {
        refuse(403, "only master's own deploy-pages.yml records a site");
    }
    const sha = typeof b.sha === "string" ? b.sha : "";
    if (!SHA.test(sha)) {
        refuse(400, "sha must be a full commit id");
    }
    const ttl = ttlAt(now + KEEP_MS);
    const site = { sha, builtAt: now, runId: Number(who.claims.run_id), ttl };
    const stored = await db.put({ pk: RS.site, sk: sha, ...site }, { notExists: true });
    if (stored) {
        await db.put({ pk: RS.sites, sk: `${pad(now)}#${sha}`, ...site });
    }
    return { stored, sha };
}

const HOLD = { pk: RS.hold, sk: "1" };

// The held nightly candidate: release.yml's verdict sets it on a deciding run that is not green-clean, a fix forward
// moves its head, a promotion or an abandon clears it ({ clear: true, base, head }). Only master's own release.yml
// writes it, release-rerun.yml for a red run it does not re-run, and nightly-abandon.yml, which only clears it.
async function recordHold(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<{ cleared: boolean } | { held: boolean }> {
    const ref = String(who.claims.job_workflow_ref);
    const abandon = ref.includes("/nightly-abandon.yml@");
    if (who.kind !== "full" || !(ref.includes("/release.yml@") || ref.includes("/release-rerun.yml@") || abandon)) {
        refuse(403, "only master's own release.yml or release-rerun.yml holds a candidate");
    }
    if (b.clear === true) {
        // with base and head, only that hold: an abandon racing a train never clears a hold it did not read
        if (!absent(b.base) || !absent(b.head)) {
            const pair = `${String(b.base)} ${String(b.head)}`;
            return {
                cleared: await db.transact([{ delete: HOLD, condition: { field: "pair", op: "=", value: pair } }]),
            };
        }
        if (abandon) {
            refuse(400, "nightly-abandon.yml clears only the hold it names (base and head)");
        }
        const held = await db.get(HOLD);
        if (held) {
            await db.batch([{ delete: HOLD }]);
        }
        return { cleared: held !== undefined };
    }
    if (abandon) {
        refuse(403, "nightly-abandon.yml only clears a hold");
    }
    const base = typeof b.base === "string" ? b.base : "";
    const head = typeof b.head === "string" ? b.head : "";
    if (!SHA.test(base) || !SHA.test(head)) {
        refuse(400, "base and head must be full commit ids");
    }
    const issue = absent(b.issue) ? null : integer(b.issue, "issue");
    // one hold at a time: a new base replaces a hold only after it is cleared
    const hold = { ...HOLD, base, head, issue, at: now, pair: `${base} ${head}` };
    if (!(await db.put(hold, { field: "base", op: "=", value: base, orNotExists: true }))) {
        refuse(409, `nightly is already held on ${String((await db.get(HOLD))?.base)}`);
    }
    return { held: true };
}

function baseCheckOf(b: Record<string, unknown>, who: ResultsWho): { key: { pk: string; sk: string }; claim: string } {
    if (who.kind !== "pr") {
        refuse(403, "only a pull request's ci.yml asks for a base check");
    }
    const base = typeof b.base === "string" ? b.base : "";
    if (!/^[0-9a-f]{7,40}$/.test(base)) {
        refuse(400, "base must be a commit id");
    }
    for (const field of ["file", "variant"]) {
        const v = b[field];
        if (typeof v !== "string" || !v || v.length > 300) {
            refuse(400, `${field} must be a string of 1 to 300 characters`);
        }
    }
    const test = h16([b.file, b.variant].join("\u0000"));
    return {
        key: { pk: RS.baseChecks, sk: `${base}\u0000${test}` },
        claim: `${String(who.claims.run_id)}.${String(who.claims.run_attempt)}`,
    };
}

// A pull request's base check: the first ask for a base, file and variant answers `dispatch: true`, a later ask by
// another run false, so base-check.yml runs once per test per base. The run holding the claim is answered true again:
// the client re-sends an ask whose answer was lost.
async function recordBaseCheck(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<{ dispatch: boolean }> {
    const { key, claim } = baseCheckOf(b, who);
    const pr = Number.isInteger(b.pr) ? b.pr : null;
    const asked = { ...key, claim, pr, askedAt: now, ttl: ttlAt(now + KEEP_MS) };
    const dispatch = (await db.put(asked, { notExists: true })) || (await db.get(key))?.claim === claim;
    return { dispatch };
}

// The run holding a base check's claim gives it back when it could not dispatch the check; another run's is kept.
async function releaseBaseCheck(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
): Promise<{ released: boolean }> {
    const { key, claim } = baseCheckOf(b, who);
    return { released: await db.transact([{ delete: key, condition: { field: "claim", op: "=", value: claim } }]) };
}

// ---------------------------------------------------------------------------------------------------------------
// Durations (tools/ci-budgets.mjs): the trend alarms and master's medians.

// ponytail: samples are kept only for the kinds whose trend files issues and whose medians are read (master's push
// build, `master`, and the full run, `full`); a pull request's trend is answered empty. Keep every kind if a reader
// of another kind's trend appears: pull requests post about 230,000 rows a day.
const DURATION_KINDS = new Set(["master", "full"]);
const DURATION_DAYS = 30;

interface DurationRow {
    runId: string | number;
    attempt: string | number;
    workflow: string;
    job: string;
    step?: string;
    task?: string;
    sha?: string;
    startedAt?: number;
    ms: number;
    conclusion?: string;
}

/**
 * A duration row's key, as the Worker's keyOf: a task across jobs, a step, or a job.
 * @param r - the row
 * @returns `task:<task>`, `step:<workflow>:<job>:<step>` or `job:<workflow>:<job>`
 */
const durationKey = (r: DurationRow): string => {
    if (r.task) {
        return `task:${r.task}`;
    }
    return r.step ? `step:${r.workflow}:${r.job}:${r.step}` : `job:${r.workflow}:${r.job}`;
};

function durationRows(b: Record<string, unknown>, who: ResultsWho): DurationRow[] {
    if (who.kind === "local") {
        refuse(403, "durations come only from Actions runs");
    }
    if (who.kind === "promote") {
        refuse(403, "promote.yml only reads");
    }
    const { rows } = b;
    if (!Array.isArray(rows)) {
        return refuse(400, "rows must be a list");
    }
    if (rows.length > ROWS_MAX) {
        refuse(400, `a write holds at most ${ROWS_MAX} duration rows`);
    }
    for (const r of rows as Record<string, unknown>[]) {
        need(r ?? {}, { workflow: "string", job: "string", ms: "number" });
        mayHave(r, { step: "string", task: "string", sha: "string", startedAt: "number", conclusion: "string" });
        if (String(r.runId) !== String(who.claims.run_id) || String(r.attempt) !== String(who.claims.run_attempt)) {
            refuse(403, "a run writes only its own durations");
        }
    }
    return rows as DurationRow[];
}

// Each kept row's sample, each key's newest sample and the run, for its workflow and kind.
async function storeDurations(db: Store, kind: string, rows: DurationRow[], now: number): Promise<void> {
    const ttl = ttlAt(now + (DURATION_DAYS + 1) * DAY);
    const kept = rows.filter((r) => typeof r.startedAt === "number" && r.conclusion !== "cancelled");
    const items: Item[] = [];
    for (const workflow of new Set(kept.map((r) => r.workflow))) {
        const mine = kept.filter((r) => r.workflow === workflow);
        const runId = Number(mine[0].runId);
        const known = new Map((await db.query(RS.durationKeys(kind, workflow))).map((k) => [k.sk, k]));
        for (const r of mine) {
            const key = durationKey(r);
            const sk = `${pad(r.startedAt as number)}#${String(r.runId)}.${String(r.attempt)}`;
            const sample = { ms: r.ms, sha: r.sha ?? null, startedAt: r.startedAt, ttl };
            items.push({ pk: RS.durations(kind, workflow, key), sk, ...sample });
            // a key's newest sample by run id, as the Worker's duration_last
            if (Number(known.get(key)?.runId ?? 0) <= runId) {
                items.push({ pk: RS.durationKeys(kind, workflow), sk: key, runId, ...sample });
            }
        }
        const startedAt = Math.max(...mine.map((r) => r.startedAt as number));
        items.push({ pk: RS.durationRuns(kind, workflow), sk: pad(runId), runId, startedAt, ttl });
    }
    await db.batch(items.map((put) => ({ put })));
}

interface Sample {
    key: string;
    ms: number;
    sha: string | null;
    startedAt: number;
}

// A key's newest `n` samples since `since`, oldest first.
async function samplesOf(db: Store, pk: string, n: number, since: number, key: string): Promise<Sample[]> {
    return (await db.query(pk, { newest: n }))
        .filter((s) => (s.startedAt as number) >= since)
        .map((s) => ({
            key,
            ms: s.ms as number,
            sha: (s.sha as string | null) ?? null,
            startedAt: s.startedAt as number,
        }))
        .reverse();
}

function judgeTrend(rows: Sample[], budgetSeconds: number | undefined): Record<string, unknown> {
    const secs = rows.map((r) => r.ms / 1000);
    const recent = median(secs.slice(-5));
    const before = secs.slice(-15, -5);
    const earlier = before.length ? median(before) : null;
    const overBudget = budgetSeconds !== undefined && recent > budgetSeconds;
    const overTrend = earlier !== null && recent > 1.3 * earlier && recent - earlier >= 60;
    const line = overBudget ? budgetSeconds : Math.max(1.3 * (earlier ?? 0), (earlier ?? 0) + 60);
    const first = rows.findIndex((r, i) => i >= rows.length - 5 && r.ms / 1000 > line);
    const range = first > 0 ? `${String(rows[first - 1].sha)}..${String(rows[first].sha)}` : null;
    return { recent, earlier, alarm: overBudget || overTrend, range };
}

// The trend alarms for the keys of one posted run: per key within the run's kind, `recent` = the median of the last 5
// samples, `earlier` = the 10 before; an alarm over the budget, or over 1.3 x earlier and 60 s slower.
async function trendFor(
    db: Store,
    kind: string,
    posted: DurationRow[],
    budgets: unknown,
    now: number,
): Promise<Record<string, unknown>[]> {
    const since = now - DURATION_DAYS * DAY;
    const keys = new Map(posted.map((r) => [`${r.workflow}\u0000${durationKey(r)}`, [r.workflow, durationKey(r)]]));
    const found = await Promise.all(
        [...keys.values()].map(([wf, key]) => samplesOf(db, RS.durations(kind, wf, key), 15, since, key)),
    );
    const byKey = new Map<string, Sample[]>();
    for (const s of found.flat()) {
        byKey.set(s.key, [...(byKey.get(s.key) ?? []), s]);
    }
    const budget = (key: string): number | undefined => {
        const v = (budgets as Record<string, unknown> | null | undefined)?.[key];
        return typeof v === "number" ? v : undefined;
    };
    return [...byKey]
        .filter(([, rs]) => rs.length >= 5)
        .map(([key, rs]) => ({
            key,
            kind,
            ...judgeTrend(
                rs.toSorted((a, b) => a.startedAt - b.startedAt),
                budget(key),
            ),
        }));
}

// Each key's last sample within a run kind and how many runs of its workflow came after it: the posting timings job
// closes an alarm whose key has stopped getting samples.
async function lastSeenFor(
    db: Store,
    kind: string,
    workflows: string[],
    now: number,
): Promise<Record<string, { runId: number; sha: string | null; at: number; runsSince: number }>> {
    const since = now - DURATION_DAYS * DAY;
    const out: Record<string, { runId: number; sha: string | null; at: number; runsSince: number }> = {};
    for (const wf of workflows) {
        const [keys, runs] = await Promise.all([
            db.query(RS.durationKeys(kind, wf)),
            db.query(RS.durationRuns(kind, wf)),
        ]);
        const runIds = runs.filter((r) => (r.startedAt as number) >= since).map((r) => r.runId as number);
        for (const k of keys.filter((x) => (x.startedAt as number) >= since)) {
            const runId = k.runId as number;
            if (out[k.sk] && out[k.sk].runId >= runId) {
                continue;
            }
            const runsSince = runIds.filter((r) => r > runId).length;
            out[k.sk] = { runId, sha: (k.sha as string | null) ?? null, at: k.startedAt as number, runsSince };
        }
    }
    return out;
}

async function recordDurations(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<Record<string, unknown>> {
    const rows = durationRows(b, who);
    if (!rows.length || !DURATION_KINDS.has(who.kind)) {
        return { stored: rows.length, kind: who.kind, trend: [], lastSeen: {} };
    }
    await storeDurations(db, who.kind, rows, now);
    return {
        stored: rows.length,
        kind: who.kind,
        trend: await trendFor(db, who.kind, rows, b.budgets, now),
        lastSeen: await lastSeenFor(db, who.kind, [...new Set(rows.map((r) => r.workflow))], now),
    };
}

// A test shard's duration history (tools/vitest-time-budget.mjs). Only master's own runs write it.
export const TESTS_PATH = "/v1/durations/tests/";
const HISTORY_MAX = 1_900_000;
// ponytail: one item holds a history, gzipped; a history whose gzip passes 350 KB (DynamoDB's item is 400 KB) is
// refused. Split it over several items if one ever does.
const HISTORY_GZ_MAX = 350_000;

function historyName(name: string | undefined): string {
    if (!/^[\w.-]{1,128}$/.test(name ?? "")) {
        refuse(400, "a history name is 1 to 128 letters, digits, '.', '_' or '-'");
    }
    return name as string;
}

async function recordTestDurations(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
    name: string | undefined,
): Promise<{ stored: boolean }> {
    const sk = historyName(name);
    if (!MASTER_EVIDENCE.has(who.kind)) {
        refuse(403, "only master's own runs write a test duration history");
    }
    if (Array.isArray(b)) {
        refuse(400, "the history must be an object");
    }
    const text = JSON.stringify(b);
    if (text.length > HISTORY_MAX) {
        refuse(413, `a history holds at most ${HISTORY_MAX} bytes`);
    }
    const body = gzipSync(text);
    if (body.length > HISTORY_GZ_MAX) {
        refuse(413, `a history holds at most ${HISTORY_GZ_MAX} bytes gzipped`);
    }
    await db.put({ pk: RS.testHistory, sk, body, updatedAt: now, runId: Number(who.claims.run_id) });
    return { stored: true };
}

// ---------------------------------------------------------------------------------------------------------------
// The rolling screenshot slices (design/visual-testing/early-capture.md, 4c). Only master's story-slices.yml writes
// captures; only ci.yml's push build of a master commit writes that commit's reach. A story's newest capture is the
// newest by run id then attempt, never by write time: a late re-run of an older slice must not hide a newer render.

const CAPTURE_STATUSES = new Set(["unchanged", "changed", "new", "unseeded", "unstable", "failed"]);
// what the owner's rolling queue can hold
const QUEUE_STATUSES = new Set(["changed", "new", "unseeded"]);
const NOTIFY_KINDS = ["queue", "slot"];
const STORY_ROWS_MAX = 2000;
const STORY_KEEP_MS = 7 * DAY;
const REACH_MAX = 100;

function text(value: unknown, name: string, optional = false): string | null {
    if (optional && absent(value)) {
        return null;
    }
    if (typeof value !== "string" || !value || value.length > 300) {
        refuse(400, `${name} must be a string of 1 to 300 characters`);
    }
    return value as string;
}

function storyList(v: unknown, name: string): Record<string, unknown>[] {
    if (!Array.isArray(v) || v.length > STORY_ROWS_MAX) {
        refuse(400, `${name} must be a list of at most ${STORY_ROWS_MAX}`);
    }
    return (v as unknown[]).map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : {}));
}

// A run's place in capture order: its id, then its attempt.
const runOrder = (runId: number, attempt: number): string => `${pad(runId)}.${pad(attempt)}`;
const storyOf = (c: { project: unknown; story: unknown; mode: unknown }): string =>
    h16(`${String(c.project)}\u0000${String(c.story)}\u0000${String(c.mode)}`);

async function recordStoryCaptures(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<{ stored: number }> {
    if (who.kind !== "slice") {
        refuse(403, "only master's own story-slices.yml records story captures");
    }
    const str = (v: unknown): string => (typeof v === "string" ? v : "");
    if (!SHA.test(str(b.sha))) {
        refuse(400, "sha must be a full commit id");
    }
    if (!SHA.test(str(b.baselinesTree))) {
        refuse(400, "baselinesTree must be a full tree id");
    }
    const artifact = text(b.artifact, "artifact");
    const notified = b.notified ?? [];
    if (!Array.isArray(notified) || !notified.every((k) => NOTIFY_KINDS.includes(k as string))) {
        refuse(400, `notified must list some of ${NOTIFY_KINDS.join(", ")}`);
    }
    const runId = Number(who.claims.run_id);
    const attempt = Number(who.claims.run_attempt);
    const order = runOrder(runId, attempt);
    const captures = storyList(b.captures, "captures").map((c) => {
        if (!CAPTURE_STATUSES.has(c.status as string)) {
            refuse(400, `status must be one of ${[...CAPTURE_STATUSES].join(", ")}`);
        }
        return {
            project: text(c.project, "project"),
            story: text(c.story, "story"),
            mode: absent(c.mode) ? "" : text(c.mode, "mode"),
            sha: b.sha,
            baselinesTree: b.baselinesTree,
            runId,
            attempt,
            artifact,
            status: c.status,
            hash: text(c.hash, "hash", true),
            baselineHash: text(c.baselineHash, "baselineHash", true),
            at: now,
            order,
        };
    });
    const units = storyList(b.units ?? [], "units").map((u) => ({
        project: text(u.project, "project"),
        unit: text(u.unit, "unit"),
        sha: b.sha,
        at: now,
        order,
    }));
    const ttl = ttlAt(now + STORY_KEEP_MS);
    const newer = { field: "order", op: "<" as const, value: order, orNotExists: true };
    const stored = await Promise.all(
        captures.map(async (c) => {
            const fresh = await db.put(
                { pk: RS.captures, sk: `${storyOf(c)}#${order}`, ...c, ttl },
                { notExists: true },
            );
            await db.put({ pk: RS.newestCaptures, sk: storyOf(c), ...c }, newer);
            return fresh;
        }),
    );
    await Promise.all(
        units.map((u) => db.put({ pk: RS.units, sk: h16(`${String(u.project)}\u0000${String(u.unit)}`), ...u }, newer)),
    );
    await db.batch((notified as string[]).map((kind) => ({ put: { pk: RS.notified, sk: kind, at: now } })));
    return { stored: stored.filter(Boolean).length };
}

async function recordStoryReach(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<{ stored: number }> {
    if (who.kind !== "master") {
        refuse(403, "only ci.yml's own push build of master records story reach");
    }
    if (b.sha !== who.claims.sha) {
        refuse(403, "a master build records only its own commit's reach");
    }
    if (!Array.isArray(b.units) || b.units.length > STORY_ROWS_MAX) {
        refuse(400, `units must be a list of at most ${STORY_ROWS_MAX}`);
    }
    const units = (b.units as unknown[]).map((u) => text(u, "unit") as string);
    const ttl = ttlAt(now + STORY_KEEP_MS);
    const sha = b.sha as string;
    const stored = await Promise.all(
        units.map((unit) => db.put({ pk: RS.reach(sha), sk: h16(unit), sha, unit, at: now, ttl }, { notExists: true })),
    );
    return { stored: stored.filter(Boolean).length };
}

/**
 * Stores a results-service post as the Worker would (tools/results-service/src/service.js), and answers as it does.
 * @param route - the route: the path after `/v1/`, with the method first unless it is POST (`DELETE base-checks`,
 *   `PUT durations/tests`)
 * @param body - the posted body
 * @param who - the writer and its kind
 * @param db - the store
 * @param now - the current time, in ms
 * @param name - a test duration history's name, from its path
 * @returns the Worker's answer, or undefined for a route it does not have
 */
export function recordResults(
    route: string,
    body: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
    name?: string,
): Promise<unknown> {
    switch (route) {
        case "invocations":
            return recordInvocation(body, who, db, now);
        case "failures":
            return recordFailures(body, who, db, now);
        case "durations":
            return recordDurations(body, who, db, now);
        case "sites":
            return recordSite(body, who, db, now);
        case "issues":
            return recordIssue(body, who, db, now);
        case "verdicts":
            return recordVerdict(body, who, db, now);
        case "channel-moves":
            return recordChannelMove(body, who, db, now);
        case "hold":
            return recordHold(body, who, db, now);
        case "base-checks":
            return recordBaseCheck(body, who, db, now);
        case "DELETE base-checks":
            return releaseBaseCheck(body, who, db);
        case "story-captures":
            return recordStoryCaptures(body, who, db, now);
        case "story-reach":
            return recordStoryReach(body, who, db, now);
        case "PUT durations/tests":
            return recordTestDurations(body, who, db, now, name);
        default:
            return Promise.resolve(undefined);
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Reads

interface Entry {
    family: string;
    file: string;
    name: string;
    issue: number | null;
    since: number | undefined;
    expires: number;
    passes: number;
}

async function activeQuarantine(db: Store, families: string[] | null, now: number): Promise<Entry[]> {
    const wanted = families && new Set(families);
    return ((await db.query(RS.quarantine)) as QuarantineItem[])
        .filter(
            (q) =>
                inForce(q, now) &&
                !NEVER_QUARANTINED.test(q.family) &&
                (!wanted || wanted.has(q.family)) &&
                (q.passes ?? 0) < QUARANTINE_PASSES,
        )
        .map((q) => ({
            family: q.family,
            file: q.file,
            name: q.name,
            issue: q.issue ?? null,
            since: q.since,
            expires: q.expires,
            passes: q.passes ?? 0,
        }));
}

// Failures master's own runs of the asked variants saw on exactly `base`, with the same variant and inputs key, or
// in the variant's newest full run; a changed test file is never excused.
async function failingOnBase(
    db: Store,
    base: string | null,
    pairs: [string, string][],
    changed: Set<string>,
): Promise<Record<string, unknown>[]> {
    const variants = new Set(pairs.map(([v]) => v));
    const newest = (await db.query(RS.newestFull)).filter((n) => variants.has(n.sk));
    const found = await Promise.all([
        base ? db.query(RS.failedOn(base)).then((rs) => rs.filter((r) => variants.has(r.variant as string))) : [],
        ...pairs.filter(([, k]) => k !== NO_INPUTS).map(([v, k]) => db.query(RS.failedWith(v, k))),
        ...newest.map((n) =>
            db
                .query(RS.failedOn(n.sha as string))
                .then((rs) => rs.filter((r) => r.variant === n.sk && r.kind === "full")),
        ),
    ]);
    const rows = new Map<string, Item>();
    for (const r of found.flat()) {
        if (!changed.has(r.file as string)) {
            rows.set([r.variant, r.sha, r.file, r.name, r.key, r.signature, r.invocation].join("\u0000"), r);
        }
    }
    const signatures = [...new Set([...rows.values()].map((r) => r.signature as string))];
    const issues = new Map(
        await Promise.all(
            signatures.map(async (s) => [s, (await db.get({ pk: RS.issues, sk: s }))?.number ?? null] as const),
        ),
    );
    return [...rows.values()].map((r) => ({
        variant: r.variant,
        sha: r.sha,
        file: r.file,
        name: r.name,
        key: r.key,
        signature: r.signature,
        invocation: r.invocation,
        issue: issues.get(r.signature as string) ?? null,
    }));
}

// Each file's newest 9 durations, newest first, from runs given newest first.
function samples(runs: Item[]): Map<string, [number, number][]> {
    const out = new Map<string, [number, number][]>();
    for (const r of runs) {
        for (const [file, ms] of unpacked(r.files) as [string, number][]) {
            const s = out.get(file) ?? [];
            if (s.length < 9) {
                s.push([r.startedAt as number, ms]);
            }
            out.set(file, s);
        }
    }
    return out;
}

// Each file failed in the 7 days before `now`, with when it last failed.
async function lastFailed(db: Store, variant: string, now: number): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    for (const r of await db.query(RS.failedRuns(variant), { from: pad(now - 7 * DAY) })) {
        for (const f of r.files as string[]) {
            out.set(f, Math.max(out.get(f) ?? 0, r.startedAt as number));
        }
    }
    return out;
}
const newestFirst = (failed: Map<string, number>): string[] => [...failed].sort((a, b) => b[1] - a[1]).map(([f]) => f);

interface Facts {
    order: string[];
    fileMs: Record<string, number>;
}

async function variantFacts(
    db: Store,
    variant: string,
    inputs: string,
    now: number,
): Promise<Facts & { passedWithInputs: string | null }> {
    const runs = await db.query(RS.runs(variant), { newest: HISTORY_INVOCATIONS });
    // ponytail: a pass with these inputs among the variant's newest 1,000 runs (the Worker read every run); an older
    // pass is not reused, so the tests run, never the other way round
    const passed = inputs === NO_INPUTS ? undefined : runs.find((r) => r.inputs === inputs && r.outcome === "passed");
    const fileMs = Object.fromEntries([...samples(runs)].map(([file, s]) => [file, median(s.map(([, ms]) => ms))]));
    return {
        passedWithInputs: (passed?.id as string | undefined) ?? null,
        order: newestFirst(await lastFailed(db, variant, now)),
        fileMs,
    };
}

// The files' history over every variant, for a caller that names files and no variants (test-changed.mjs's
// ranking): failed in the last 7 days, newest first, and the median of each file's last 9 runs.
// ponytail: reads every variant's newest 1,000 runs; a per-file index if this read gets frequent.
async function fileFacts(db: Store, files: string[], now: number): Promise<Facts> {
    const wanted = new Set(files);
    const variants = (await db.query(RS.variants)).map((v) => v.sk);
    const failed = new Map<string, number>();
    const all = new Map<string, [number, number][]>();
    await Promise.all(
        variants.map(async (v) => {
            for (const [file, at] of await lastFailed(db, v, now)) {
                if (wanted.has(file)) {
                    failed.set(file, Math.max(failed.get(file) ?? 0, at));
                }
            }
            for (const [file, s] of samples(await db.query(RS.runs(v), { newest: HISTORY_INVOCATIONS }))) {
                if (wanted.has(file)) {
                    all.set(file, [...(all.get(file) ?? []), ...s]);
                }
            }
        }),
    );
    const fileMs = Object.fromEntries(
        [...all].map(([file, s]) => [
            file,
            median(
                s
                    .toSorted((a, b) => b[0] - a[0])
                    .slice(0, 9)
                    .map(([, ms]) => ms),
            ),
        ]),
    );
    return { order: newestFirst(failed), fileMs };
}

/**
 * GET /v1/plan?sha=&base=&variants=&inputs=&files= (tools/results-service getPlan).
 * @param q - the query string
 * @param db - the store
 * @param now - the current time, in ms
 * @returns quarantine, failingOnBase, and per variant passedWithInputs, order and fileMs; with files and no
 *   variants, also order and fileMs over every variant for those files
 */
async function getPlan(q: URLSearchParams, db: Store, now: number): Promise<Record<string, unknown>> {
    const variants = list(q.get("variants"));
    const inputs = list(q.get("inputs"));
    if (variants.length !== inputs.length) {
        refuse(400, "variants and inputs must be lists of the same length");
    }
    if (variants.length > PLAN_VARIANTS_MAX) {
        refuse(400, `a plan reads at most ${PLAN_VARIANTS_MAX} variants`);
    }
    const files = list(q.get("files"));
    if (files.length > ROWS_MAX) {
        refuse(400, `a plan reads at most ${ROWS_MAX} files`);
    }
    const pairs = variants.map((v, i): [string, string] => [v, inputs[i]]);
    const families = [...new Set(variants.map((v) => v.split("|")[0]))];
    const [facts, quarantine, failing, byFile] = await Promise.all([
        Promise.all(pairs.map(async ([v, k]) => [v, await variantFacts(db, v, k, now)] as const)),
        activeQuarantine(db, families, now),
        failingOnBase(db, q.get("base"), pairs, new Set(files)),
        pairs.length === 0 && files.length ? fileFacts(db, files, now) : {},
    ]);
    return {
        quarantine: quarantine.map((e) => ({ ...e, since: undefined })),
        failingOnBase: failing,
        variants: Object.fromEntries(facts),
        ...byFile,
    };
}

/**
 * GET /v1/site?sha= (tools/results-service getSite): the newest nightly channel move of the commit and its latest
 * verdict; 404 when nightly never moved to it.
 * @param q - the query string
 * @param db - the store
 * @returns sha, versionCommit, siteSha256, channelSha256, movedAt and verdict
 */
async function getSite(q: URLSearchParams, db: Store): Promise<Record<string, unknown>> {
    const sha = q.get("sha") ?? "";
    if (!SHA.test(sha)) {
        refuse(400, "sha must be a full commit id");
    }
    const latest = (items: Item[]): Item | undefined => items.toSorted((a, b) => Number(b.at) - Number(a.at))[0];
    const move = latest(await db.query(RS.moves(sha))) ?? refuse(404, `no nightly channel move of ${sha}`);
    const verdict = latest(await db.query(RS.verdicts(sha)));
    return {
        sha,
        versionCommit: move.versionCommit ?? null,
        siteSha256: move.siteSha256,
        channelSha256: move.channelSha256,
        movedAt: move.at,
        verdict: verdict?.state ?? null,
    };
}

/**
 * GET /v1/quarantine: every entry in force, of every family, for the health dashboard's quarantine list.
 * @param _q - the query string (unused)
 * @param db - the store
 * @param now - the current time, in ms
 * @returns quarantine: family, file, name, issue, since, expires and passes
 */
async function getQuarantine(_q: URLSearchParams, db: Store, now: number): Promise<{ quarantine: Entry[] }> {
    return { quarantine: await activeQuarantine(db, null, now) };
}

/**
 * GET /v1/failures?run=&good=: the tests a full run saw fail, for its bisect. `failedBefore` names those master's own
 * runs saw fail in the 7 days before the last green commit `good`'s site was built (flaky before the range).
 * @param q - the query string
 * @param db - the store
 * @returns tests ({ shard, file, name }, distinct, the first 100) and failedBefore (their ids)
 */
async function getFailures(q: URLSearchParams, db: Store): Promise<Record<string, unknown>> {
    const run = q.get("run") ?? "";
    if (!/^\d+$/.test(run)) {
        refuse(400, "run must be a run id");
    }
    const rows = (await db.query(RS.failedIn(run))).toSorted(
        (a, b) =>
            String(a.file).localeCompare(String(b.file)) ||
            String(a.name).localeCompare(String(b.name)) ||
            String(a.invocation).localeCompare(String(b.invocation)),
    );
    // the id is <run>.<attempt>.<job>.<shard>.<try> (tools/results/run-group.mjs)
    const seen = new Map<string, { shard: string; file: string; name: string }>();
    for (const r of rows) {
        const t = { shard: String(r.invocation).split(".")[3], file: r.file as string, name: r.name as string };
        seen.set(`${t.shard}: ${t.file} > ${t.name}`, t);
    }
    // the first 100 failing tests, the most a bisect follows (full-run.mjs MAX_TARGETS)
    for (const key of [...seen.keys()].slice(100)) {
        seen.delete(key);
    }
    const good = q.get("good");
    const built = good ? ((await db.get({ pk: RS.site, sk: good }))?.builtAt as number | undefined) : undefined;
    const failedBefore: string[] = [];
    if (built !== undefined) {
        await Promise.all(
            [...seen].map(async ([id, t]) => {
                const range = { from: pad(built - 7 * DAY), to: `${pad(built - 1)}#~` };
                if ((await db.query(RS.testFailed(h16(`${t.file}\u0000${t.name}`)), range)).length) {
                    failedBefore.push(id);
                }
            }),
        );
    }
    const order = [...seen.keys()];
    return {
        tests: [...seen.values()],
        failedBefore: failedBefore.toSorted((a, b) => order.indexOf(a) - order.indexOf(b)),
    };
}

interface Verdict {
    sha: string;
    state: string;
    lane: string | null;
    issue: number | null;
    runId: number;
    at: number;
}
const verdictOf = (v: Item): Verdict => ({
    sha: v.sha as string,
    state: v.state as string,
    lane: (v.lane as string | null) ?? null,
    issue: (v.issue as number | null) ?? null,
    // verdicts stored before runId was kept name the run in their sort key
    runId: (v.runId as number | undefined) ?? Number(v.sk.split("#")[0]),
    at: v.at as number,
});

// Every commit's latest verdict of the window, oldest first.
async function recentVerdicts(db: Store, since: number): Promise<Verdict[]> {
    const latest = new Map<string, Item>();
    for (const v of await db.query(RS.verdictLog, { from: pad(since) })) {
        latest.delete(v.sha as string);
        latest.set(v.sha as string, v);
    }
    return [...latest.values()].map((v) => verdictOf(v));
}

async function latestVerdict(db: Store, sha: string): Promise<Verdict | null> {
    const [v] = (await db.query(RS.verdicts(sha))).toSorted((a, b) => Number(b.at) - Number(a.at));
    return v ? { ...verdictOf(v), sha } : null;
}

async function heldCandidate(db: Store): Promise<Record<string, unknown> | null> {
    const h = await db.get(HOLD);
    return h ? { base: h.base, head: h.head, issue: h.issue ?? null, at: h.at } : null;
}

async function newestSite(db: Store): Promise<{ sha: string; builtAt: number } | null> {
    const [s] = await db.query(RS.sites, { newest: 1 });
    return s ? { sha: s.sha as string, builtAt: s.builtAt as number } : null;
}

/**
 * GET /v1/candidate: the full run's pick, master's newest commit with a kept site, and its verdict when judged.
 * @param _q - the query string (unused)
 * @param db - the store
 * @param now - the current time, in ms
 * @returns candidate (sha, builtAt) or null, judged, recent (every commit's latest verdict of 30 days, newest
 *   first), sites (the last 200 recorded, newest first) and hold
 */
async function getCandidate(_q: URLSearchParams, db: Store, now: number): Promise<Record<string, unknown>> {
    const [candidate, recent, sites, hold] = await Promise.all([
        newestSite(db),
        recentVerdicts(db, now - 30 * DAY),
        db.query(RS.sites, { newest: 200 }),
        heldCandidate(db),
    ]);
    return {
        candidate,
        judged: candidate && (await latestVerdict(db, candidate.sha)),
        recent: recent.toReversed(),
        sites: sites.map((s) => s.sha),
        hold,
    };
}

// a full run's slot: release.yml runs every 6 hours, so a promotion run started at most this long before its move
const FULL_RUN_SLOT = DAY / 4;
// What holds canary's commit back from nightly, by its latest verdict state.
const BLOCKING: Record<string, string> = {
    red: "red",
    "owner-item": "owner-item",
    "green-images": "waiting-for-screenshots",
    approved: "resume-due",
    rejected: "rejected",
    refused: "refused",
    "green-clean": "promotable",
};

type State = Omit<Verdict, "runId"> & { builtAt: number };

/**
 * Whether a commit is nightly's, or took nightly's verdict over commits that change only versions or approval
 * records (a verdict lane "inherited from <short sha>", followed as a chain), as the Worker's sameAsNightly.
 * @param sha - the commit
 * @param nightlySha - nightly's commit
 * @param states - the newest verdict of each recent commit
 * @returns true when it is nightly's
 */
function sameAsNightly(sha: string | undefined, nightlySha: string | undefined, states: State[]): boolean {
    if (!sha || !nightlySha) {
        return false;
    }
    let at = sha;
    for (let hop = 0; hop <= states.length; hop++) {
        const short = at.length < 40;
        if (at === nightlySha || (short && nightlySha.startsWith(at))) {
            return true;
        }
        const here = at;
        const lane = states.find((v) => v.sha === here || (short && v.sha.startsWith(here)))?.lane;
        const from = /^inherited from ([0-9a-f]{7,})$/.exec(lane ?? "")?.[1];
        if (!from) {
            return false;
        }
        at = from;
    }
    return false;
}

/**
 * GET /v1/release-state: what ci.yml's release-due job and every release.yml run's catch-up read, and `age:nightly`.
 * @param _q - the query string (unused)
 * @param db - the store
 * @param now - the current time, in ms
 * @returns nightly, red, approved, offered, canary, ageNightlyMs, blocking and hold
 */
async function getReleaseState(_q: URLSearchParams, db: Store, now: number): Promise<Record<string, unknown>> {
    const [move] = await db.query(RS.moveLog, { newest: 1 });
    const nightly = move ? { sha: move.sha as string, movedAt: move.at as number } : null;
    const builtAt = async (sha: string): Promise<number | undefined> =>
        (await db.get({ pk: RS.site, sk: sha }))?.builtAt as number | undefined;
    const states: State[] = await Promise.all(
        (await recentVerdicts(db, now - 30 * DAY)).map(async ({ runId: _run, ...v }) => ({
            ...v,
            builtAt: (await builtAt(v.sha)) ?? 0,
        })),
    );
    // a nightly with no site record counts from its promotion run's start, taken as one slot before its move
    const nightlyBuilt = nightly ? ((await builtAt(nightly.sha)) ?? nightly.movedAt - FULL_RUN_SLOT) : 0;
    const last = states.findLast((s) => !["approved", "rejected", "refused"].includes(s.state));
    const canary = await newestSite(db);
    const canaryState = states.find((s) => s.sha === canary?.sha)?.state;
    const unpromoted = !!canary && !sameAsNightly(canary.sha, nightly?.sha, states) && canary.builtAt > nightlyBuilt;
    // nightly is behind from the first site built after it that is not nightly's own
    const after = await db.query(RS.sites, { from: pad(nightlyBuilt + 1) });
    const start = after.find((r) => !sameAsNightly(r.sha as string, nightly?.sha, states))?.builtAt as number;
    const hold = await heldCandidate(db);
    // a held candidate is the only one offered, and only once its tested head is green-images
    const heldHead = hold ? states.find((s) => s.sha === hold.head) : undefined;
    const oldestWaiting = states.filter((s) => s.state === "green-images").toSorted((a, b) => a.builtAt - b.builtAt)[0];
    let offered: State | null = oldestWaiting ?? null;
    if (hold) {
        offered = heldHead?.state === "green-images" ? heldHead : null;
    }
    let blocking = unpromoted ? (BLOCKING[canaryState ?? ""] ?? "unjudged") : null;
    if (hold) {
        blocking = "held";
    }
    let ageNightlyMs: number | null = null;
    if (nightly) {
        ageNightlyMs = unpromoted ? now - start : 0;
    }
    return {
        nightly,
        red: last?.state === "red" ? last : null,
        approved: states.filter((s) => s.state === "approved" && s.builtAt > nightlyBuilt),
        offered,
        canary,
        // null while nightly has never moved: the stall alarm has nothing to count from
        ageNightlyMs,
        blocking,
        hold,
    };
}

/**
 * GET /v1/durations/medians?workflows=&kind=&n=: master's median seconds per key over each key's newest `n` (10, at
 * most 50) samples of the kind in 30 days.
 * @param q - the query string
 * @param db - the store
 * @param now - the current time, in ms
 * @returns seconds by key
 */
async function getMedians(q: URLSearchParams, db: Store, now: number): Promise<Record<string, number>> {
    const workflows = list(q.get("workflows"));
    if (!workflows.length || workflows.length > 20) {
        refuse(400, "workflows names 1 to 20 workflow files");
    }
    const n = Math.min(Math.max(Number(q.get("n")) || 10, 1), 50);
    const kind = q.get("kind") || "full";
    const since = now - DURATION_DAYS * DAY;
    const found = await Promise.all(
        workflows.map(async (wf) => {
            const keys = (await db.query(RS.durationKeys(kind, wf))).filter((k) => (k.startedAt as number) >= since);
            return Promise.all(keys.map((k) => samplesOf(db, RS.durations(kind, wf, k.sk), n, since, k.sk)));
        }),
    );
    const byKey = new Map<string, number[]>();
    for (const s of found.flat(2)) {
        byKey.set(s.key, [...(byKey.get(s.key) ?? []), s.ms / 1000]);
    }
    return Object.fromEntries([...byKey].map(([key, secs]) => [key, median(secs)]));
}

/**
 * GET /v1/durations/tests/<name>: a test shard's duration history, or {} when none is stored.
 * @param name - the history's name, from the path
 * @param db - the store
 * @returns the history
 */
async function getTestDurations(name: string, db: Store): Promise<unknown> {
    const item = await db.get({ pk: RS.testHistory, sk: historyName(name) });
    return item ? unpacked(item.body) : {};
}

const byStory = (a: Item, b: Item): number =>
    String(a.project).localeCompare(String(b.project)) ||
    String(a.story).localeCompare(String(b.story)) ||
    String(a.mode).localeCompare(String(b.mode));

// A story's first unapproved render since its last unchanged one, under its newest capture's baselines tree.
function firstUnapproved(newest: Item, history: Item[]): string {
    const runs = new Map(history.map((c) => [c.order as string, c]));
    runs.set(newest.order as string, newest);
    const same = [...runs.values()]
        .filter((c) => c.baselinesTree === newest.baselinesTree)
        .toSorted((a, b) => String(a.order).localeCompare(String(b.order)));
    const clear = same.findLastIndex((c) => c.status === "unchanged");
    const first = same.slice(clear + 1).find((c) => QUEUE_STATUSES.has(c.status as string));
    return (first?.sha as string | undefined) ?? (newest.sha as string);
}

/**
 * GET /v1/story-captures: each story's newest capture, a summary, when the owner was last notified, and each slice
 * unit's newest capture.
 * @param _q - the query string (unused)
 * @param db - the store
 * @param now - the current time, in ms
 * @returns captures, summary, notified and units
 */
async function getStoryCaptures(_q: URLSearchParams, db: Store, now: number): Promise<Record<string, unknown>> {
    const [newest, history, units, notified] = await Promise.all([
        db.query(RS.newestCaptures),
        db.query(RS.captures),
        db.query(RS.units),
        db.query(RS.notified),
    ]);
    const kept = new Map<string, Item[]>();
    for (const c of history.filter((h) => isLive(h, now))) {
        const story = c.sk.split("#")[0];
        kept.set(story, [...(kept.get(story) ?? []), c]);
    }
    const captures = newest.toSorted(byStory);
    const statuses: Record<string, number> = {};
    for (const c of captures) {
        statuses[c.status as string] = (statuses[c.status as string] ?? 0) + 1;
    }
    const queued = captures.filter((c) => QUEUE_STATUSES.has(c.status as string));
    const last = newest.toSorted(
        (a, b) => String(b.order).localeCompare(String(a.order)) || Number(b.at) - Number(a.at),
    )[0];
    const when = new Map(notified.map((x) => [x.sk, x.at]));
    return {
        captures: captures.map((c) => ({
            project: c.project,
            story: c.story,
            mode: c.mode,
            sha: c.sha,
            baselinesTree: c.baselinesTree,
            runId: c.runId,
            attempt: c.attempt,
            artifact: c.artifact,
            status: c.status,
            hash: c.hash ?? null,
            baselineHash: c.baselineHash ?? null,
            at: c.at,
            ...(QUEUE_STATUSES.has(c.status as string) && {
                firstUnapprovedSha: firstUnapproved(c, kept.get(c.sk) ?? []),
            }),
        })),
        summary: {
            stories: captures.length,
            lastSliced: last ? { sha: last.sha, at: last.at } : null,
            oldestNewestAt: captures.length ? Math.min(...captures.map((c) => c.at as number)) : null,
            statuses,
            queue: queued.length,
        },
        notified: Object.fromEntries(NOTIFY_KINDS.map((k) => [k, when.get(k) ?? null])),
        // when each slice unit was last captured whole: the slice planner's rotation (tools/channel/story-slices.mjs)
        units: units
            .toSorted(
                (a, b) =>
                    String(a.project).localeCompare(String(b.project)) || String(a.unit).localeCompare(String(b.unit)),
            )
            .map((u) => ({ project: u.project, unit: u.unit, sha: u.sha, at: u.at })),
    };
}

/**
 * GET /v1/story-reach?shas=: the story units the listed master commits reach (ordering only, never a reason to skip a
 * render).
 * @param q - the query string
 * @param db - the store
 * @param now - the current time, in ms
 * @returns reach: { sha, unit }, by sha then unit
 */
async function getStoryReach(q: URLSearchParams, db: Store, now: number): Promise<Record<string, unknown>> {
    const shas = list(q.get("shas"));
    if (!shas.length || shas.length > REACH_MAX || !shas.every((s) => SHA.test(s))) {
        refuse(400, `shas lists 1 to ${REACH_MAX} full commit ids`);
    }
    const found = await Promise.all([...new Set(shas)].map((sha) => db.query(RS.reach(sha))));
    const reach = found
        .flat()
        .filter((r) => isLive(r, now))
        .map((r) => ({ sha: r.sha as string, unit: r.unit as string }))
        .toSorted((a, b) => a.sha.localeCompare(b.sha) || a.unit.localeCompare(b.unit));
    return { reach };
}

const READS: Record<string, (q: URLSearchParams, db: Store, now: number) => Promise<unknown>> = {
    "/v1/plan": getPlan,
    "/v1/site": getSite,
    "/v1/quarantine": getQuarantine,
    "/v1/candidate": getCandidate,
    "/v1/release-state": getReleaseState,
    "/v1/failures": getFailures,
    "/v1/durations/medians": getMedians,
    "/v1/story-captures": getStoryCaptures,
    "/v1/story-reach": getStoryReach,
};

let store: Store | undefined;

/**
 * The results service's reads, answered as the results Worker answers them.
 * @param event - the HTTP API request
 * @returns 200 with the answer, or the Worker's `{ error }` with its status
 */
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    const q = new URLSearchParams(event.rawQueryString ?? "");
    try {
        const db = (store ??= dynamoStore(process.env.TABLE_NAME ?? "graphty-health"));
        if (event.rawPath.startsWith(TESTS_PATH)) {
            return json(200, await getTestDurations(event.rawPath.slice(TESTS_PATH.length), db));
        }
        const read = Object.hasOwn(READS, event.rawPath) ? READS[event.rawPath] : undefined;
        return json(200, await (read ?? refuse(404, `no GET ${event.rawPath}`))(q, db, Date.now()));
    } catch (error) {
        if (error instanceof ResultsRefused) {
            return json(error.status, { error: error.message });
        }
        console.error(JSON.stringify({ route: event.rawPath, error: String(error) }));
        return json(500, { error: "internal error" });
    }
}

function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
    return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
