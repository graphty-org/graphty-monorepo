#!/usr/bin/env node
// Local collector for the pipeline health dashboard (design/ci/health-dashboard.md, issue #3602).
//
// Posts this machine's test runs to the health API, each record once:
//   tmp/test-ledger/records/<date>/*.json.gz  -> POST <HEALTH_API_URL>/v1/local/invocations
//   tmp/push-log.jsonl (push gate runs)       -> POST <HEALTH_API_URL>/v1/local/push-runs
//   tmp/waits.jsonl (test-slot, gpu-slot)     -> POST <HEALTH_API_URL>/v1/local/waits
// Every body is { rows: [...] }, at most 200 rows and 1 MB. Every row has an id derived from its
// content, so a retried post is harmless. Host paths, gate logs, cwd and session ids are never
// posted.
//
// Settings:
//   HEALTH_API_URL       the API's base URL, e.g. https://<id>.execute-api.us-east-2.amazonaws.com
//   HEALTH_LOCAL_TOKEN   the local bearer token (env, or the key of that name in <root>/.env); the
//                        API keeps only its SHA-256, in SSM /graphty-health/local-token-sha256
//
// Run it:
//   node tools/pipeline-health/local/collector.mjs --dry-run   # counts and one example per kind
//   node tools/pipeline-health/local/collector.mjs --once      # post what is new, then exit
//   node tools/pipeline-health/local/collector.mjs --watch     # post what is new every 60 s
//   --root <dir> reads another checkout's tmp/ (default: the main checkout of this repository).
//
// Under servherd, from its live copy (tools/live-tools.json; tools/live.sh pipeline-health-local <branch> updates it):
//   servherd_start({ name: "pipeline-health-local", cwd: "<repo>/.worktrees/pipeline-health-local-live",
//     command: "node tools/pipeline-health/local/collector.mjs --watch --root <repo>" })
//
// The cursor is <root>/tmp/pipeline-health-local/cursor.json. A failed post logs one line and leaves
// the cursor where it was, so the next pass sends the same rows again; a post the API refuses for its
// content (400, 413; ingest answers 400 for a row DynamoDB refuses) is split, and a single refused row is
// logged and skipped. Any other failure (500, 502, 503, 504, network) skips nothing. Delete the cursor to
// post everything again.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";

// 200: a 500-row ledger post (each row expands to its test items) outlived the 10 s ingest Lambda.
export const MAX_ROWS = 200;
export const MAX_BYTES = 1_000_000;
const WAIT_KINDS = new Set(["test-slot", "gpu-slot"]);
const OUTCOMES = new Set(["passed", "failed", "error", "infra", "cancelled"]);

/**
 * A host path keeps only its part inside the repository; any other absolute path becomes <path>.
 * @param text any string from a local record
 * @returns the string with no host path in it
 */
export function scrub(text) {
    return String(text).replaceAll(/(?:\/home|\/Users|\/tmp|\/var|\/root)\/[^\s'"`),;\]]*/g, (p) => {
        const m = /\/graphty-monorepo\/(?:\.worktrees\/[^/]+\/)?(.*)$/.exec(p);
        return m ? m[1] : "<path>";
    });
}

/**
 * A test ledger record as a results-service invocation. An `unattributed` record (no JUnit carried
 * its run id) is not evidence of anything (design/ci/test-ledger.md 3.3), and the results-service
 * outcomes have no word for it: not posted.
 * @param r the ledger record
 * @returns the invocation row, or null when it is not posted
 */
export function mapLedger(r) {
    if (!OUTCOMES.has(r.outcome)) return null;
    const row = {
        id: `local.${r.id}`,
        sha: r.commit,
        tree: r.tree,
        variant: r.variant,
        inputs: "-",
        env: "local",
        try: 1,
        startedAt: Date.parse(r.started_at),
        secs: r.secs,
        outcome: r.outcome,
        note: r.kind,
        dirty: Boolean(r.dirty),
        files: (r.files ?? []).map(([file, passed, failed, skipped, ms]) => [scrub(file), passed, failed, skipped, ms]),
        failures: (r.failures ?? []).map((f) => ({
            file: scrub(f.file),
            name: scrub(f.name),
            message: scrub(f.message ?? "").slice(0, 2000),
        })),
    };
    if (r.base) row.baseSha = r.base;
    if (r.reused_from) row.reusedFrom = `local.${r.reused_from}`;
    if (/^https:\/\/github\.com\//.test(r.log ?? "")) row.runUrl = r.log;
    return row;
}

/**
 * A push log line as a local push-run row: only when, which branch and commit, and the gate's exit.
 * @param p the push log line
 * @returns the push-run row
 */
export function mapPush(p) {
    // Times go out as epoch ms, the API's unit; the id keeps the log's own text so it never changes.
    const row = { id: `local.push.${p.sha}.${p.at}`, at: Date.parse(p.at), branch: p.branch, sha: p.sha, exit: p.exit };
    if (p.queuedAt) row.queuedAt = Date.parse(p.queuedAt);
    if (p.startedAt) row.startedAt = Date.parse(p.startedAt);
    return row;
}

/**
 * A test-slot or gpu-slot wait as a local wait row; other waits are not posted.
 * @param w the wait log line
 * @returns the wait row, or null
 */
export function mapWait(w) {
    if (!WAIT_KINDS.has(w.kind)) return null;
    return {
        id: `local.wait.${w.kind}.${w.start}.${w.pid}`,
        kind: w.kind,
        start: Date.parse(w.start),
        end: Date.parse(w.end),
        ms: w.ms,
    };
}

const bytes = (row) => Buffer.byteLength(JSON.stringify(row)) + 1;

/**
 * A row that fits in one post: one too big alone loses its per-file results, and one still too big
 * is dropped with a log line.
 * @param row the row to post
 * @returns the row, the row without its files, or null
 */
export function fit(row) {
    if (bytes(row) + 12 <= MAX_BYTES) return row;
    const lean = { ...row, files: undefined };
    if (bytes(lean) + 12 <= MAX_BYTES) return lean;
    log(`skipped ${row.id}: ${bytes(lean)} bytes alone`);
    return null;
}

/**
 * Splits rows that each fit into bodies of at most MAX_ROWS rows and MAX_BYTES bytes.
 * @param rows the rows to post
 * @param size the posted size of one row
 * @returns the row lists, one per post
 */
export function batches(rows, size = bytes) {
    const out = [];
    let cur = [];
    let total = 12; // {"rows":[]}
    for (const row of rows) {
        const n = size(row);
        if (cur.length && (cur.length >= MAX_ROWS || total + n > MAX_BYTES)) {
            out.push(cur);
            cur = [];
            total = 12;
        }
        cur.push(row);
        total += n;
    }
    if (cur.length) out.push(cur);
    return out;
}

function log(line) {
    console.log(`${new Date().toISOString()} pipeline-health-local: ${line}`);
}

function readCursor(file) {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        return {};
    }
}

function writeCursor(file, cursor) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, JSON.stringify(cursor));
    renameSync(`${file}.tmp`, file);
}

// Ledger files with an mtime past the cursor, or at it and not yet posted, oldest first.
function newLedgerFiles(dir, m, seen) {
    const day = new Date(m - 86_400_000).toISOString().slice(0, 10);
    const files = [];
    for (const date of readdirSync(dir).filter((d) => !m || d >= day)) {
        for (const name of readdirSync(join(dir, date)).filter((n) => n.endsWith(".json.gz"))) {
            const path = join(dir, date, name);
            const mtime = statSync(path).mtimeMs;
            const key = `${date}/${name}`;
            if (mtime > m || (mtime === m && !seen.has(key))) files.push({ path, key, mtime });
        }
    }
    return files.sort((a, b) => a.mtime - b.mtime || a.key.localeCompare(b.key));
}

function readLedgerRow(f) {
    try {
        return mapLedger(JSON.parse(gunzipSync(readFileSync(f.path)).toString("utf8")));
    } catch (error) {
        log(`unreadable ledger record ${f.key}: ${error.message}`);
        return null;
    }
}

// New ledger records. Each item carries the cursor to save once it is posted.
function ledgerItems(root, cursor) {
    const dir = join(root, "tmp/test-ledger/records");
    if (!existsSync(dir)) return [];
    let at = cursor.ledgerMtime ?? 0;
    let atSeen = cursor.ledgerSeen ?? [];
    return newLedgerFiles(dir, at, new Set(atSeen)).map((f) => {
        atSeen = f.mtime === at ? [...atSeen, f.key] : [f.key];
        at = f.mtime;
        return { row: readLedgerRow(f), cursor: { ledgerMtime: at, ledgerSeen: atSeen } };
    });
}

// New complete lines of an append-only JSONL file, from the byte offset in the cursor.
function jsonlItems(root, rel, key, map) {
    return (cursor) => {
        const path = join(root, rel);
        if (!existsSync(path)) return [];
        const buf = readFileSync(path);
        let offset = cursor[key] ?? 0;
        if (offset > buf.length) offset = 0; // the file was replaced
        const items = [];
        while (offset < buf.length) {
            const nl = buf.indexOf(10, offset);
            if (nl < 0) break; // a line still being written
            const text = buf.subarray(offset, nl).toString("utf8").trim();
            offset = nl + 1;
            let row = null;
            if (text) {
                try {
                    row = map(JSON.parse(text));
                } catch {
                    log(`unreadable line in ${rel} before byte ${offset}`);
                }
            }
            items.push({ row, cursor: { [key]: offset } });
        }
        return items;
    };
}

/**
 * The three local sources, each with its route kind and a reader of what is new past a cursor.
 * @param root the checkout whose tmp/ is read
 * @returns the sources
 */
export function sources(root) {
    return [
        { kind: "invocations", items: (c) => ledgerItems(root, c) },
        { kind: "push-runs", items: jsonlItems(root, "tmp/push-log.jsonl", "pushOffset", mapPush) },
        { kind: "waits", items: jsonlItems(root, "tmp/waits.jsonl", "waitsOffset", mapWait) },
    ];
}

/**
 * One pass over every source.
 * @param o the pass
 * @param o.root the checkout whose tmp/ is read
 * @param o.post (kind, body) resolving true when the API took the body, "refused" when it refused the body's
 *   content (the body is split and a refused single row skipped), false for any other failure
 * @param o.dryRun count and keep the first row per kind, post nothing, move no cursor
 * @param o.cursorFile where the cursor is kept
 * @returns rows, posts, posted and one example per kind
 */
export async function collect({
    root,
    post,
    dryRun = false,
    cursorFile = join(root, "tmp/pipeline-health-local/cursor.json"),
}) {
    let cursor = readCursor(cursorFile);
    const counts = {};
    for (const { kind, items: list } of sources(root)) {
        const items = list(cursor);
        const ready = items.flatMap((i) => {
            const row = i.row && fit(i.row);
            return row ? [{ ...i, row }] : [];
        });
        const bodies = batches(ready, (i) => bytes(i.row));
        counts[kind] = { rows: ready.length, posts: bodies.length, example: ready[0]?.row, posted: 0 };
        if (dryRun) continue;
        const save = (item) => {
            cursor = { ...cursor, ...item.cursor };
            writeCursor(cursorFile, cursor);
        };
        // A body the API refuses for its content (400, 413) is split until the refused row is alone; that
        // row is logged and skipped, so one bad row never blocks its source. Any other failure stops here,
        // so an outage (ingest answers 500 for DynamoDB throttling, SSM, a deny action) never skips rows.
        const send = async (body) => {
            const r = await post(kind, { rows: body.map((i) => i.row) });
            if (r === true) {
                counts[kind].posted += body.length;
                save(body.at(-1));
                return true;
            }
            if (r !== "refused") return false;
            if (body.length === 1) {
                log(`POST /v1/local/${kind}: row ${body[0].row.id} refused, skipped`);
                save(body[0]);
                return true;
            }
            const half = Math.ceil(body.length / 2);
            return (await send(body.slice(0, half))) && send(body.slice(half));
        };
        let ok = true;
        for (const body of bodies) {
            ok = await send(body);
            if (!ok) break;
        }
        if (ok && items.length) save(items.at(-1)); // trailing lines with nothing to post
    }
    return counts;
}

/**
 * The local token, from the environment or the key HEALTH_LOCAL_TOKEN in <root>/.env. Never printed.
 * @param root the checkout holding .env
 * @param env the environment
 * @returns the token, or undefined
 */
export function readToken(root, env = process.env) {
    if (env.HEALTH_LOCAL_TOKEN) return env.HEALTH_LOCAL_TOKEN.trim();
    try {
        for (const raw of readFileSync(join(root, ".env"), "utf8").split("\n")) {
            const line = raw.trim().replace(/^export /, "");
            if (!line.startsWith("HEALTH_LOCAL_TOKEN=")) continue;
            const value = line.slice("HEALTH_LOCAL_TOKEN=".length).trim();
            const quoted = value.length > 1 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0];
            return quoted ? value.slice(1, -1) : value;
        }
        return undefined;
    } catch {
        return undefined;
    }
}

function httpPost(url, token) {
    return async (kind, body) => {
        try {
            const res = await fetch(`${url.endsWith("/") ? url.slice(0, -1) : url}/v1/local/${kind}`, {
                method: "POST",
                headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(30_000),
            });
            if (res.ok) return true;
            if (res.status === 400 || res.status === 413) return "refused";
            log(`POST /v1/local/${kind}: HTTP ${res.status}, ${body.rows.length} rows kept for the next pass`);
            return false;
        } catch (error) {
            log(`POST /v1/local/${kind}: ${error.message}, ${body.rows.length} rows kept for the next pass`);
            return false;
        }
    };
}

function mainCheckout() {
    const here = dirname(fileURLToPath(import.meta.url));
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
        cwd: here,
        encoding: "utf8",
    });
    return dirname(resolve(common.trim()));
}

async function main() {
    const { values } = parseArgs({
        options: {
            root: { type: "string" },
            once: { type: "boolean" },
            watch: { type: "boolean" },
            "dry-run": { type: "boolean" },
        },
    });
    const root = resolve(values.root ?? mainCheckout());
    if (values["dry-run"]) {
        printDryRun(await collect({ root, dryRun: true }));
        return;
    }
    const url = process.env.HEALTH_API_URL;
    const token = readToken(root);
    if (!url || !token) {
        log(`not set: ${[!url && "HEALTH_API_URL", !token && "HEALTH_LOCAL_TOKEN"].filter(Boolean).join(", ")}`);
        process.exitCode = 1;
        return;
    }
    await run(root, httpPost(url, token), values.watch);
}

function printDryRun(counts) {
    for (const [kind, c] of Object.entries(counts)) {
        console.log(`${kind}: ${c.rows} rows in ${c.posts} posts`);
        if (c.example) console.log(`  example: ${JSON.stringify(c.example).slice(0, 1500)}`);
    }
}

async function run(root, post, watch) {
    for (;;) {
        try {
            const counts = await collect({ root, post });
            const line = Object.entries(counts)
                .filter(([, c]) => c.rows)
                .map(([k, c]) => `${k} ${c.posted}/${c.rows}`);
            if (line.length) log(`posted ${line.join(", ")}`);
        } catch (error) {
            log(`pass failed: ${error.message}`);
        }
        if (!watch) return;
        await new Promise((r) => setTimeout(r, 60_000));
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
