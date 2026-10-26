#!/usr/bin/env node
// Local collector for the pipeline health dashboard (design/ci/health-dashboard.md, issue #3602).
//
// Posts this machine's test runs to the health API, each record once:
//   tmp/test-ledger/records/<date>/*.json.gz  -> POST <HEALTH_API_URL>/v1/local/invocations
//   tmp/push-log.jsonl (push gate runs)       -> POST <HEALTH_API_URL>/v1/local/push-runs
//   tmp/waits.jsonl (test-slot, gpu-slot)     -> POST <HEALTH_API_URL>/v1/local/waits
// Every body is { rows: [...] }, at most 500 rows and 1 MB. Every row has an id derived from its
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
// Under servherd (from the main checkout, so it keeps running when worktrees go):
//   servherd_start({ name: "pipeline-health-local", cwd: "<repo>",
//     command: "node tools/pipeline-health/local/collector.mjs --watch" })
//
// The cursor is <root>/tmp/pipeline-health-local/cursor.json. A failed post logs one line and leaves
// the cursor where it was, so the next pass sends the same rows again. Delete the cursor to post
// everything again.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";

export const MAX_ROWS = 500;
export const MAX_BYTES = 1_000_000;
const WAIT_KINDS = new Set(["test-slot", "gpu-slot"]);
const OUTCOMES = new Set(["passed", "failed", "error", "infra", "cancelled"]);

/**
 * A host path keeps only its part inside the repository; any other absolute path becomes <path>.
 * @param text any string from a local record
 * @returns the string with no host path in it
 */
export function scrub(text) {
    return String(text).replace(/(?:\/home|\/Users|\/tmp|\/var|\/root)\/[^\s'"`),;\]]*/g, (p) => {
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
    const row = { id: `local.push.${p.sha}.${p.at}`, at: p.at, branch: p.branch, sha: p.sha, exit: p.exit };
    if (p.queuedAt) row.queuedAt = p.queuedAt;
    if (p.startedAt) row.startedAt = p.startedAt;
    return row;
}

/**
 * A test-slot or gpu-slot wait as a local wait row; other waits are not posted.
 * @param w the wait log line
 * @returns the wait row, or null
 */
export function mapWait(w) {
    if (!WAIT_KINDS.has(w.kind)) return null;
    return { id: `local.wait.${w.kind}.${w.start}.${w.pid}`, kind: w.kind, start: w.start, end: w.end, ms: w.ms };
}

/**
 * Splits rows into bodies of at most MAX_ROWS rows and MAX_BYTES bytes. A row too big alone loses
 * its per-file results; one still too big is dropped with a log line.
 * @param rows the rows to post
 * @returns the row lists, one per post
 */
export function batches(rows) {
    const out = [];
    let cur = [];
    let size = 12; // {"rows":[]}
    for (let row of rows) {
        let n = Buffer.byteLength(JSON.stringify(row)) + 1;
        if (n + 12 > MAX_BYTES && row.files) {
            row = { ...row, files: undefined };
            n = Buffer.byteLength(JSON.stringify(row)) + 1;
        }
        if (n + 12 > MAX_BYTES) {
            log(`skipped ${row.id}: ${n} bytes alone`);
            continue;
        }
        if (cur.length && (cur.length >= MAX_ROWS || size + n > MAX_BYTES)) {
            out.push(cur);
            cur = [];
            size = 12;
        }
        cur.push(row);
        size += n;
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

// New ledger records: mtime past the cursor, or at it and not yet posted. Each item carries the
// cursor to save once it is posted.
function ledgerItems(root, cursor) {
    const dir = join(root, "tmp/test-ledger/records");
    if (!existsSync(dir)) return [];
    const m = cursor.ledgerMtime ?? 0;
    const seen = new Set(cursor.ledgerSeen ?? []);
    const day = new Date(m - 86_400_000).toISOString().slice(0, 10);
    const files = [];
    for (const date of readdirSync(dir).sort()) {
        if (m && date < day) continue;
        for (const name of readdirSync(join(dir, date))) {
            if (!name.endsWith(".json.gz")) continue;
            const path = join(dir, date, name);
            const mtime = statSync(path).mtimeMs;
            const key = `${date}/${name}`;
            if (mtime > m || (mtime === m && !seen.has(key))) files.push({ path, key, mtime });
        }
    }
    files.sort((a, b) => a.mtime - b.mtime || a.key.localeCompare(b.key));
    const items = [];
    let at = m;
    let atSeen = [...seen];
    for (const f of files) {
        atSeen = f.mtime === at ? [...atSeen, f.key] : [f.key];
        at = f.mtime;
        let row = null;
        try {
            row = mapLedger(JSON.parse(gunzipSync(readFileSync(f.path)).toString("utf8")));
        } catch (error) {
            log(`unreadable ledger record ${f.key}: ${error.message}`);
        }
        items.push({ row, cursor: { ledgerMtime: at, ledgerSeen: atSeen } });
    }
    return items;
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
 * @param o.post (kind, body) resolving true when the API took the body
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
        const rows = items.map((i) => i.row).filter(Boolean);
        const bodies = batches(rows);
        counts[kind] = { rows: rows.length, posts: bodies.length, example: rows[0] };
        if (dryRun) continue;
        let done = 0;
        let ok = true;
        for (const body of bodies) {
            if (!(await post(kind, { rows: body }))) {
                ok = false;
                break;
            }
            done += body.length;
            // Move the cursor past the item that held the last posted row.
            let seen = 0;
            let i = 0;
            for (; i < items.length; i++) if (items[i].row && ++seen === done) break;
            cursor = { ...cursor, ...items[i].cursor };
            writeCursor(cursorFile, cursor);
        }
        if (ok && items.length) {
            cursor = { ...cursor, ...items[items.length - 1].cursor }; // trailing skipped lines
            writeCursor(cursorFile, cursor);
        }
        counts[kind].posted = done;
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
        const m = /^\s*(?:export\s+)?HEALTH_LOCAL_TOKEN\s*=\s*(.*)$/m.exec(readFileSync(join(root, ".env"), "utf8"));
        return m ? m[1].trim().replace(/^(["'])(.*)\1$/, "$2") : undefined;
    } catch {
        return undefined;
    }
}

function httpPost(url, token) {
    return async (kind, body) => {
        try {
            const res = await fetch(`${url.replace(/\/+$/, "")}/v1/local/${kind}`, {
                method: "POST",
                headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(30_000),
            });
            if (!res.ok)
                log(`POST /v1/local/${kind}: HTTP ${res.status}, ${body.rows.length} rows kept for the next pass`);
            return res.ok;
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
        const counts = await collect({ root, dryRun: true });
        for (const [kind, c] of Object.entries(counts)) {
            console.log(`${kind}: ${c.rows} rows in ${c.posts} posts`);
            if (c.example) console.log(`  example: ${JSON.stringify(c.example).slice(0, 1500)}`);
        }
        return;
    }
    const url = process.env.HEALTH_API_URL;
    const token = readToken(root);
    if (!url || !token) {
        log(`not set: ${[!url && "HEALTH_API_URL", !token && "HEALTH_LOCAL_TOKEN"].filter(Boolean).join(", ")}`);
        process.exitCode = 1;
        return;
    }
    const post = httpPost(url, token);
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
        if (!values.watch) return;
        await new Promise((r) => setTimeout(r, 60_000));
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
