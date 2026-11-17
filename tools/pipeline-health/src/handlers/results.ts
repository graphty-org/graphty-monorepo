// The results service (tools/results-service) on the health API, issue #3607: the records GET /v1/plan and
// GET /v1/site answer from, in their own `RS#` items of the graphty-health table, and those two reads, with the
// Worker's query strings and answers. The ingest Lambda writes the records (recordResults) from the posts CI sends
// it, the same bodies the Worker gets; this Lambda answers the reads. Like the Worker, every answer is computed when
// it is read, from stored records only, except a quarantine entry's passes, which each master run adds to as it is
// stored (the Worker counted them on read with a join DynamoDB has no counterpart of).
//
// Reads are public, as every read of this API is: the Worker asked for a credential and checked nothing else about it.

import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { failureHashes, issueKey } from "../../../results-service/src/signature.js";
import { dynamoStore } from "../dynamo.js";
import { DAY, ttlAt } from "../model/index.js";
import type { Item, Store } from "../model/store.js";

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

async function recordInvocation(
    b: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<{ stored: boolean; flaky: Flaky[] }> {
    const r = postedRun(b, who);
    if (r.kind === "full") {
        await db.put(
            { pk: RS.newestFull, sk: r.variant, sha: r.sha, startedAt: r.startedAt, ttl: ttlAt(now + KEEP_MS) },
            { field: "startedAt", op: "<", value: r.startedAt, orNotExists: true },
        );
    }
    if (!EVIDENCE.has(r.kind) || !["passed", "failed"].includes(r.outcome)) {
        return { stored: false, flaky: [] };
    }
    await db.batch(runItems(r, now).map((put) => ({ put })));
    if (!MASTER_EVIDENCE.has(r.kind)) {
        return { stored: true, flaky: [] };
    }
    const run: Run = {
        id: r.id,
        files: Object.fromEntries(r.files.map((f) => [f[0], [f[1] ?? 0, f[2] ?? 0, f[3] ?? 0]])),
        failures: r.failures.map((f) => [f.file, f.name, f.signature, f.status]),
    };
    const flaky = await concludeFlaky(db, run, r, now);
    await countPasses(db, run, r.variant, r.startedAt, now);
    return { stored: true, flaky };
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
    const stored = await db.put(
        {
            pk: RS.verdicts(b.sha as string),
            sk: `${run}#${b.state as string}`,
            state: b.state,
            lane: b.lane ?? null,
            issue,
            at: now,
        },
        { notExists: true },
    );
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
    return { stored: true };
}

/**
 * Stores a results-service post as the Worker would (tools/results-service/src/service.js): what the plan and site
 * reads need of POST /v1/invocations, /v1/issues, /v1/verdicts and /v1/channel-moves. Any other route stores nothing.
 * @param route - the last path part (`invocations`, ...)
 * @param body - the posted body
 * @param who - the writer and its kind
 * @param db - the store
 * @param now - the current time, in ms
 * @returns the Worker's answer to the post, as far as these records give it
 */
export function recordResults(
    route: string,
    body: Record<string, unknown>,
    who: ResultsWho,
    db: Store,
    now: number,
): Promise<unknown> {
    switch (route) {
        case "invocations":
            return recordInvocation(body, who, db, now);
        case "issues":
            return recordIssue(body, who, db, now);
        case "verdicts":
            return recordVerdict(body, who, db, now);
        case "channel-moves":
            return recordChannelMove(body, who, db, now);
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

let store: Store | undefined;

/**
 * GET /v1/plan and GET /v1/site, answered as the results Worker answers them.
 * @param event - the HTTP API request
 * @returns 200 with the answer, or the Worker's `{ error }` with its status
 */
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    const q = new URLSearchParams(event.rawQueryString ?? "");
    try {
        const db = (store ??= dynamoStore(process.env.TABLE_NAME ?? "graphty-health"));
        if (event.rawPath === "/v1/plan") {
            return json(200, await getPlan(q, db, Date.now()));
        }
        if (event.rawPath === "/v1/site") {
            return json(200, await getSite(q, db));
        }
        return refuse(404, `no GET ${event.rawPath}`);
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
