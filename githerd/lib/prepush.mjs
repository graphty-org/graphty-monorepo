/**
 * Pre-push gate statistics: where the machine's push queue spends its time and which failures cost
 * the most.
 *
 * `tools/push-queue.sh` appends one line per push to the main checkout's `tmp/push-log.jsonl`. Since
 * 2026-10-08 a line also carries `queuedAt` (the ticket's time), `startedAt` (the slot's), the gate's
 * `[FAIL]` and Vitest `FAIL` lines (`gate`) and the top-level directories the push changes against
 * its merge base with origin/master (`changed`). Older lines get what `githerd stats --backfill-gate`
 * recovered from the Claude Code transcripts that ran the pushes and from the shard logs left in
 * worktrees, kept in `tmp/push-log-backfill.jsonl`.
 *
 * A failed push's causes are its failing tests, else its failing shards, else its failing steps.
 * Each cause is related (the push changes a file in the test's package or a workspace package it
 * depends on: flakes.mjs `changesPackage`; the lockfile, tools and root files do not count) or
 * unrelated -- evidence of a flaky or load-sensitive test, which flakes.mjs turns into an issue once
 * proven (the daemon hands it every push each poll). A failure's cost in queue
 * hours is its gate time plus the wait of the branch's next push, split evenly between its causes;
 * a backfilled push has only its own wait plus gate time, the same cost under a steady queue.
 */

import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";

import { changesPackage, failingTests } from "./flakes.mjs";
import { readPushLog } from "./owners.mjs";

/** The backfill overlay, next to the push log. */
const BACKFILL_FILE = "push-log-backfill.jsonl";
const TESTS_STEP = /^Tests\b/;
const ANSI = new RegExp(String.raw`${String.fromCodePoint(27)}\[[0-9;]*m`, "g");
/** The lines of a gate's output the push queue keeps. */
const KEPT = /\[FAIL\]|^ *FAIL |All pre-push checks passed|\[(remote )?rejected\]/;
const HOUR = 3_600_000;

/**
 * The JSON lines of a file, as untyped records (owners.mjs `readPushLog`: a torn line is skipped).
 * @param {string} file the file
 * @returns {any[]} the records
 */
const jsonLines = (file) => /** @type {any[]} */ (readPushLog(file));

/**
 * @typedef {import("./flakes.mjs").Workspace} Workspace
 * @typedef {import("./flakes.mjs").FailedTest & {shard: string | null}} GateTest
 * @typedef {{steps: string[], shards: {shard: string, secs: number}[], tests: GateTest[], passed: boolean,
 *   rejected: boolean}} Gate what a gate's output says
 * @typedef {{key: string, at: string, branch: string | null, sha: string | null, exit: number,
 *   cwd: string | null, waitMs: number | null, gateMs: number | null, elapsedMs: number | null,
 *   gate: Gate | null, changed: string[] | null}} Push one push, normalized
 * @typedef {{cause: string, kind: "test" | "shard" | "step" | "other", package: string | null,
 *   related: boolean | null}} Cause
 */

/**
 * The lines of a gate's output the push queue keeps, without colors.
 * @param {string} text the output
 * @returns {string[]} the lines
 */
export function keptLines(text) {
    return text
        .replaceAll(ANSI, "")
        .split("\n")
        .filter((l) => KEPT.test(l));
}

/**
 * What a gate's output says: the steps that failed, the test shards that failed and the tests in
 * them (Vitest's `FAIL` lines after each shard's `[FAIL] <shard> (exit N, Ns)`), whether every check
 * passed, and whether GitHub rejected the push.
 * @param {string[]} lines the output's lines
 * @param {string[]} packages the workspace's package directories
 * @returns {Gate} the facts
 */
export function parseGate(lines, packages) {
    /** @type {Gate} */
    const g = { steps: [], shards: [], tests: [], passed: false, rejected: false };
    /** @type {string | null} */
    let shard = null;
    /** @type {string[]} */
    let seg = [];
    const flush = () => {
        const found = failingTests(seg.join("\n"), { job: shard ? `Test (${shard})` : "", packages });
        for (const t of found) if (!g.tests.some((x) => x.id === t.id)) g.tests.push({ ...t, shard });
        seg = [];
    };
    for (const raw of lines) {
        const text = raw.replaceAll(ANSI, "").trim();
        const failedShard = /^\[FAIL\] (\S+) \(exit [^,]*, (\d+)s\)/.exec(text);
        const failedStep = /^\[FAIL\] (.+?) failed$/.exec(text) ?? /^\[FAIL\] (Screenshots):/.exec(text);
        if (failedShard) {
            flush();
            shard = failedShard[1];
            g.shards.push({ shard, secs: Number(failedShard[2]) });
        } else if (failedStep) {
            if (!g.steps.includes(failedStep[1])) g.steps.push(failedStep[1]);
        } else if (text.includes("All pre-push checks passed")) g.passed = true;
        else if (/\[(remote )?rejected\]/.test(text)) g.rejected = true;
        else seg.push(text);
    }
    flush();
    return g;
}

/**
 * The workspace package a shard or step names (`graphty-element-browser-1`, `Bundle size
 * (graphty-element)`), the longest match.
 * @param {string} name the name
 * @param {string[]} packages the package directories
 * @returns {string | null} the package
 */
function packageNamed(name, packages) {
    const hits = packages.filter(
        (p) => name === p || name.startsWith(`${p}-`) || name.includes(`(${p})`) || name.startsWith(`${p} `),
    );
    return hits.reduce((/** @type {string | null} */ best, p) => (best && best.length >= p.length ? best : p), null);
}

/**
 * The milliseconds between two times, or null when either is missing or they run backwards.
 * @param {string | null | undefined} from the earlier time
 * @param {string | null | undefined} to the later time
 * @returns {number | null} the span
 */
function span(from, to) {
    const ms = Date.parse(to ?? "") - Date.parse(from ?? "");
    return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

/**
 * Every push the log and its backfill know, oldest first, with its gate's facts.
 * @param {string} tmpDir the main checkout's `tmp`
 * @param {string[]} packages the workspace's package directories
 * @returns {Push[]} the pushes
 */
export function readPushes(tmpDir, packages) {
    /** @type {Map<string, any>} */
    const extra = new Map(jsonLines(join(tmpDir, BACKFILL_FILE)).map((b) => [b.key, b]));
    return jsonLines(join(tmpDir, "push-log.jsonl"))
        .filter((r) => typeof r?.at === "string")
        .map((r) => {
            const key = keyOf(r);
            const b = extra.get(key) ?? {};
            const lines = Array.isArray(r.gate) ? r.gate : (b.gate ?? null);
            const gate = lines ? parseGate(lines, packages) : null;
            const changed = Array.isArray(r.changed) ? r.changed : (b.changed ?? null);
            return {
                key,
                at: r.at,
                branch: r.branch ?? null,
                sha: r.sha ?? null,
                exit: Number(r.exit),
                cwd: r.cwd ?? null,
                waitMs: span(r.queuedAt, r.startedAt),
                gateMs: span(r.startedAt, r.at),
                elapsedMs: b.elapsedMs ?? null,
                gate,
                changed,
            };
        })
        .sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Why a push failed: its failing tests; a failed shard that named no test; and its failed steps
 * other than the test stage (when a shard or test says more). Each with its package and whether the
 * push touched it.
 * @param {Push} p the push
 * @param {Workspace} ws the workspace
 * @returns {Cause[]} the causes; none for a push that passed
 */
export function causesOf(p, ws) {
    if (p.exit === 0) return [];
    const rel = (/** @type {string | null} */ pkg) => changesPackage(p.changed, pkg, ws);
    const g = p.gate;
    if (!g)
        return [
            {
                cause: "no gate output survived (a push before the queue kept it)",
                kind: "other",
                package: null,
                related: null,
            },
        ];
    /** @type {Cause[]} */
    const out = g.tests.map((t) => ({ cause: t.id, kind: "test", package: t.package, related: rel(t.package) }));
    for (const s of g.shards.filter((x) => !g.tests.some((t) => t.shard === x.shard))) {
        const pkg = packageNamed(s.shard, ws.packages);
        out.push({ cause: `shard ${s.shard} (no failing test named)`, kind: "shard", package: pkg, related: rel(pkg) });
    }
    for (const step of g.steps.filter((x) => !saidMore(x, g))) {
        const pkg = packageNamed(step, ws.packages);
        out.push({ cause: `step ${step}`, kind: "step", package: pkg, related: pkg ? rel(pkg) : null });
    }
    if (!out.length) out.push({ cause: unnamedCause(g), kind: "other", package: null, related: null });
    return out;
}

/**
 * Whether a failed step is only the frame of a shard or test the gate also named: the test stage,
 * and the GPU step around the tests it printed.
 * @param {string} step the step
 * @param {Gate} g the gate
 * @returns {boolean} true to leave it out
 */
function saidMore(step, g) {
    if (TESTS_STEP.test(step)) return g.shards.length > 0 || g.tests.length > 0;
    return step.includes("NVIDIA") && g.tests.length > 0;
}

/**
 * The cause of a failed push whose gate named no failing step.
 * @param {Gate} g the gate
 * @returns {string} the cause
 */
function unnamedCause(g) {
    if (!g.passed) return "failed before the gate reported (refused or crashed)";
    return g.rejected ? "GitHub rejected the push after the gate passed" : "push failed after the gate passed";
}

/**
 * The count a cause's relatedness adds to.
 * @param {boolean | null} related whether the push changed the cause's package
 * @returns {"related" | "unrelated" | "unknown"} the count
 */
function bucket(related) {
    if (related === null) return "unknown";
    return related ? "related" : "unrelated";
}

/**
 * What a failed push cost the queue: its gate time plus the wait of the branch's next push, else its
 * own wait; a backfilled push's own wait plus gate time. Null when unknown.
 * @param {Push[]} pushes every push, oldest first
 * @param {number} i the failed push's index
 * @returns {number | null} milliseconds
 */
function costOf(pushes, i) {
    const p = pushes[i];
    if (p.gateMs === null) return p.elapsedMs;
    const next = pushes.slice(i + 1).find((x) => x.branch && x.branch === p.branch);
    return p.gateMs + (next?.waitMs ?? p.waitMs ?? 0);
}

/**
 * The median of some numbers.
 * @param {number[]} xs the numbers
 * @returns {number | null} the median, or null for none
 */
function median(xs) {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * The report: pushes and failures per day, the median queue wait and gate time, and the causes
 * ranked by the queue hours they cost.
 * @param {Push[]} pushes every push, oldest first
 * @param {Workspace} ws the workspace
 * @returns {any} the report
 */
export function gateReport(pushes, ws) {
    /** @type {Map<string, {day: string, pushes: number, failed: number}>} */
    const days = new Map();
    /** @type {Map<string, any>} */
    const causes = new Map();
    let costed = 0;
    pushes.forEach((p, i) => {
        const day = p.at.slice(0, 10);
        const d = days.get(day) ?? { day, pushes: 0, failed: 0 };
        days.set(day, d);
        d.pushes++;
        if (p.exit === 0) return;
        d.failed++;
        const list = causesOf(p, ws);
        const cost = costOf(pushes, i);
        if (cost !== null) costed++;
        for (const c of list) {
            const e = causes.get(c.cause) ?? { ...c, failures: 0, related: 0, unrelated: 0, unknown: 0, queueHours: 0 };
            causes.set(c.cause, e);
            e.failures++;
            e[bucket(c.related)]++;
            e.queueHours += (cost ?? 0) / list.length / HOUR;
        }
    });
    const failed = pushes.filter((p) => p.exit !== 0).length;
    const mins = (/** @type {(number | null)[]} */ xs) => {
        const m = median(/** @type {number[]} */ (xs.filter((x) => x !== null)));
        return m === null ? null : Math.round(m / 6000) / 10;
    };
    return {
        pushes: pushes.length,
        failed,
        failureRate: pushes.length ? failed / pushes.length : null,
        timed: pushes.filter((p) => p.gateMs !== null).length,
        costedFailures: costed,
        medianWaitMinutes: mins(pushes.map((p) => p.waitMs)),
        medianGateMinutes: mins(pushes.map((p) => p.gateMs)),
        days: [...days.values()].slice(-14),
        causes: [...causes.values()].sort((a, b) => b.queueHours - a.queueHours || b.failures - a.failures),
    };
}

/**
 * The report as plain ASCII.
 * @param {any} r what `gateReport` answered
 * @param {number} [top] how many causes to list
 * @returns {string} the text
 */
export function gateText(r, top = 20) {
    if (!r.pushes) return "Pre-push gate: no push recorded (the main checkout's tmp/push-log.jsonl)";
    const pct = (/** @type {number} */ x) => `${Math.round(x * 100)}%`;
    const pad = (/** @type {string | number} */ s, /** @type {number} */ n) => String(s).padStart(n);
    const minutes = (/** @type {number | null} */ m) => (m === null ? "unknown" : `${m} min`);
    return [
        "Pre-push gate (the machine's push queue, tmp/push-log.jsonl)",
        `  ${r.pushes} pushes, ${r.failed} failed (${pct(r.failureRate)}); median queue wait ${minutes(r.medianWaitMinutes)}, median gate ${minutes(r.medianGateMinutes)} (over the ${r.timed} pushes with timings)`,
        "  day         pushes  failed  rate",
        ...r.days.map(
            (/** @type {any} */ d) =>
                `  ${d.day}  ${pad(d.pushes, 6)}  ${pad(d.failed, 6)}  ${pad(pct(d.failed / d.pushes), 4)}`,
        ),
        `  Failure causes, by the queue hours they cost (${r.costedFailures} of ${r.failed} failures have a cost):`,
        "  queue-h  fails  unrelated  related  unknown  cause",
        ...r.causes
            .slice(0, top)
            .map(
                (/** @type {any} */ c) =>
                    `  ${pad(c.queueHours.toFixed(1), 7)}  ${pad(c.failures, 5)}  ${pad(c.unrelated, 9)}  ${pad(c.related, 7)}  ${pad(c.unknown, 7)}  ${c.cause}`,
            ),
        "  unrelated: the push changes neither the test's package nor anything it depends on -- a flaky or",
        "  load-sensitive test. Cost: the failed gate's time plus the wait of the branch's next push, split",
        "  between a push's causes; for a push from before the queue recorded timings, its own wait plus gate.",
    ].join("\n");
}

/**
 * The pushes a Claude Code transcript ran through the push queue: the command, when it started and
 * ended, and its output (a background command's from its output file).
 * @param {string} file the transcript
 * @returns {Promise<{sessionId: string | null, cwd: string | null, command: string, start: string,
 *   end: string | null, text: string}[]>} the pushes
 */
async function transcriptPushes(file) {
    /** @type {Map<string, any>} */
    const pending = new Map();
    /** @type {any[]} */
    const out = [];
    const lines = createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
    for await (const line of lines) {
        const use = line.includes("push-queue.sh") && line.includes('"tool_use"');
        if (use || (pending.size && line.includes('"tool_result"'))) noteEntry(parseJson(line), pending, out);
    }
    return out;
}

/**
 * One JSON line, or null when it is torn.
 * @param {string} line the line
 * @returns {any} the value
 */
function parseJson(line) {
    try {
        return JSON.parse(line);
    } catch {
        return null;
    }
}

/**
 * Notes a transcript entry's push commands as pending, and the results of pending ones as pushes.
 * @param {any} e the entry
 * @param {Map<string, any>} pending the commands waiting for their result, by tool use id
 * @param {any[]} out the pushes
 */
function noteEntry(e, pending, out) {
    for (const b of Array.isArray(e?.message?.content) ? e.message.content : []) {
        const cmd = String(b.input?.command ?? "");
        if (b.type === "tool_use" && /push-queue\.sh\b.*\bgit\b.*\bpush\b/s.test(cmd)) {
            pending.set(b.id, { sessionId: e.sessionId ?? null, cwd: e.cwd ?? null, command: cmd, start: e.timestamp });
        } else if (b.type === "tool_result" && pending.has(b.tool_use_id)) {
            out.push({ ...pending.get(b.tool_use_id), ...resultOutput(b, e.timestamp ?? null) });
            pending.delete(b.tool_use_id);
        }
    }
}

/**
 * A push command's output and end: the tool result's own text, or a background command's output
 * file (its last write is the end; gone, the end is unknown).
 * @param {any} b the tool result block
 * @param {string | null} at the result's time
 * @returns {{end: string | null, text: string}} the output
 */
function resultOutput(b, at) {
    const text = Array.isArray(b.content)
        ? b.content.map((/** @type {any} */ c) => c.text ?? "").join("\n")
        : String(b.content ?? "");
    const bg = /Output is being written to: (\S+\.output)/.exec(text)?.[1];
    if (!bg) return { end: at, text };
    if (!existsSync(bg)) return { end: null, text: "" };
    return { end: statSync(bg).mtime.toISOString(), text: readText(bg) };
}

/**
 * Every file under a directory whose name ends with a suffix and that changed since a time.
 * @param {string} dir the directory
 * @param {string} suffix the suffix
 * @param {number} since the time
 * @returns {string[]} the paths
 */
function filesUnder(dir, suffix, since) {
    /** @type {string[]} */
    const out = [];
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const d of entries) {
        const p = join(dir, d.name);
        if (d.isDirectory()) out.push(...filesUnder(p, suffix, since));
        else if (d.name.endsWith(suffix) && statSync(p).mtimeMs >= since) out.push(p);
    }
    return out;
}

/**
 * The failing shard logs the worktrees still hold (`tmp/prepush-tests/<shard>.log`, rewritten by
 * every gate run), as gate lines.
 * @param {string} root the main checkout
 * @returns {{cwd: string, end: string, lines: string[]}[]} one per failed shard log
 */
function shardLogs(root) {
    const dirs = [root];
    try {
        for (const d of readdirSync(join(root, ".worktrees"))) dirs.push(join(root, ".worktrees", d));
    } catch {
        // no worktrees
    }
    const out = [];
    for (const cwd of dirs) {
        const logs = join(cwd, "tmp", "prepush-tests");
        let names = [];
        try {
            names = readdirSync(logs).filter((n) => n.endsWith(".log"));
        } catch {
            continue;
        }
        for (const n of names) {
            const text = readFileSync(join(logs, n), "utf8").replaceAll(ANSI, "");
            const fails = text.split("\n").filter((l) => /^ *FAIL /.test(l));
            if (!fails.length) continue;
            const end = statSync(join(logs, n)).mtime.toISOString();
            out.push({ cwd, end, lines: [`  [FAIL] ${basename(n, ".log")} (exit 1, 0s)`, ...fails] });
        }
    }
    return out;
}

/**
 * A file's text, or "" when it cannot be read.
 * @param {string} file the file
 * @returns {string} the text
 */
function readText(file) {
    try {
        return readFileSync(file, "utf8");
    } catch {
        return "";
    }
}

/**
 * The file a push command sent the queue's output to (`push-queue.sh git push ... > tmp/x/push.log`),
 * when it was last written within five minutes of the push's end: later pushes overwrite it.
 * @param {string} command the command
 * @param {any} r the push log line
 * @returns {string} its text, or ""
 */
function redirected(command, r) {
    const target = /push-queue\.sh[^;&|]*?>\s*([^\s;&|]+)/.exec(command)?.[1];
    if (!target || !r.cwd || target.startsWith("/dev/")) return "";
    const file = target.startsWith("/") ? target : join(r.cwd, target);
    try {
        return Math.abs(statSync(file).mtimeMs - Date.parse(r.at)) < 300_000 ? readText(file) : "";
    } catch {
        return "";
    }
}

/**
 * Recovers the gate output of pushes logged before the queue kept it, and writes the backfill
 * overlay: from the Claude Code transcripts that ran each push (the session the push log names, the
 * push's directory or branch in the command, the push ending after the command started), else from
 * the failing shard logs the push's worktree still holds.
 * @param {{root: string, home: string}} where the main checkout and the home directory (whose
 *   `.claude/projects` holds the transcripts)
 * @returns {Promise<{pushes: number, failed: number, fromTranscripts: number, fromShardLogs: number}>}
 *   what was recovered
 */
export async function backfillGate({ root, home }) {
    const tmpDir = join(root, "tmp");
    const log = jsonLines(join(tmpDir, "push-log.jsonl")).filter((r) => typeof r?.at === "string");
    const since = Math.min(...log.map((r) => Date.parse(r.at))) - 86_400_000;
    const runs = await transcriptRuns(root, home, since);
    /** @type {Map<string, any>} */
    const found = new Map();
    for (const run of runs.toSorted((a, b) => String(a.start).localeCompare(String(b.start)))) {
        const r = matchPush(log, run, found);
        if (!r) continue;
        const gate = keptLines(`${run.text}\n${redirected(run.command, r)}`);
        found.set(keyOf(r), { key: keyOf(r), gate: gate.length ? gate : null, elapsedMs: span(run.start, r.at) });
    }
    const fromTranscripts = [...found.values()].filter((x) => x.gate).length;
    const fromShardLogs = fillFromShardLogs(found, log, root);
    for (const r of log) {
        if (r.exit === 0 || !r.sha || Array.isArray(r.changed)) continue;
        const changed = changedSince(root, r.sha);
        if (changed)
            found.set(keyOf(r), { key: keyOf(r), gate: null, elapsedMs: null, ...found.get(keyOf(r)), changed });
    }
    writeFileSync(join(tmpDir, BACKFILL_FILE), [...found.values()].map((x) => `${JSON.stringify(x)}\n`).join(""));
    return { pushes: log.length, failed: log.filter((r) => r.exit !== 0).length, fromTranscripts, fromShardLogs };
}

/**
 * Every push command in the Claude Code transcripts of this repository (its main checkout's project
 * directory and its worktrees'), from files written since a time.
 * @param {string} root the main checkout
 * @param {string} home the home directory
 * @param {number} since the time
 * @returns {Promise<Awaited<ReturnType<typeof transcriptPushes>>>} the commands
 */
async function transcriptRuns(root, home, since) {
    const slug = root.replaceAll("/", "-");
    const projects = join(home, ".claude", "projects");
    let dirs = [];
    try {
        dirs = readdirSync(projects).filter((d) => d === slug || d.startsWith(`${slug}-`));
    } catch {
        return [];
    }
    const runs = [];
    for (const d of dirs) {
        for (const f of filesUnder(join(projects, d), ".jsonl", since)) runs.push(...(await transcriptPushes(f)));
    }
    return runs;
}

/**
 * Gives each failing shard log a worktree still holds to the first failed push from that worktree
 * that ended after it was written, within two hours, when no transcript gave that push its output.
 * @param {Map<string, any>} found the overlay so far, changed in place
 * @param {any[]} log the push log
 * @param {string} root the main checkout
 * @returns {number} how many pushes got one
 */
function fillFromShardLogs(found, log, root) {
    let n = 0;
    for (const s of shardLogs(root)) {
        const r = log
            .filter((x) => x.exit !== 0 && x.cwd === s.cwd && x.at >= s.end.slice(0, 19) && !found.get(keyOf(x))?.gate)
            .toSorted((a, b) => a.at.localeCompare(b.at))[0];
        if (!r || Date.parse(r.at) - Date.parse(s.end) > 2 * HOUR) continue;
        found.set(keyOf(r), { key: keyOf(r), elapsedMs: null, ...found.get(keyOf(r)), gate: s.lines });
        n++;
    }
    return n;
}

/**
 * A push log line's key: its time and commit (its directory when it has none).
 * @param {any} r the line
 * @returns {string} the key
 */
const keyOf = (r) => `${r.at} ${r.sha ?? r.cwd}`;

/**
 * What the push queue records as `changed` for a commit, from the repository now: the top-level
 * directories (with a slash) and root files it changes against its merge base with origin/master,
 * Markdown left out. For a commit merged since, the base is taken at the merge that brought it in.
 * Null when the commit is gone.
 * @param {string} root the checkout
 * @param {string} sha the commit
 * @returns {string[] | null} the paths
 */
function changedSince(root, sha) {
    const git = (/** @type {string[]} */ args) =>
        execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    try {
        let base = git(["merge-base", "origin/master", sha]);
        if (base === sha) {
            // Merged since: the base is where it met master's first-parent line at its merge.
            const merge = git(["rev-list", "--first-parent", "--ancestry-path", `${sha}..origin/master`])
                .split("\n")
                .at(-1);
            if (!merge) return null;
            base = git(["merge-base", `${merge}^1`, sha]);
        }
        const files = git(["diff", "--name-only", base, sha])
            .split("\n")
            .filter((f) => f && !f.endsWith(".md"));
        return [...new Set(files.map((f) => (f.includes("/") ? `${f.split("/")[0]}/` : f)))].sort((a, b) =>
            a.localeCompare(b),
        );
    } catch {
        return null;
    }
}

/**
 * The logged push a transcript's push command made: the same session (or none logged), its branch
 * or directory named by the command or the transcript, ending after the command started and, for a
 * finished command, no more than two minutes after it returned. The earliest such push not taken yet.
 * @param {any[]} log the push log
 * @param {{sessionId: string | null, cwd: string | null, command: string, start: string, end: string | null}} run
 *   the command
 * @param {Map<string, any>} taken the pushes matched already
 * @returns {any} the push, or undefined
 */
export function matchPush(log, run, taken) {
    const latest = run.end ? Date.parse(run.end) + 120_000 : Infinity;
    return log.find(
        (r) =>
            !taken.has(`${r.at} ${r.sha ?? r.cwd}`) &&
            (!r.sessionId || !run.sessionId || r.sessionId === run.sessionId) &&
            Date.parse(r.at) >= Date.parse(run.start) &&
            Date.parse(r.at) <= latest &&
            ((r.branch && run.command.includes(r.branch)) ||
                (r.cwd && (run.command.includes(r.cwd) || run.cwd === r.cwd))),
    );
}
