#!/usr/bin/env node
/**
 * interaction-latency.mjs -- the user input latency suite, run by tier and tracked over time (issue #10119).
 *
 * The runner, benchmarks/compare/interaction-latency.mjs, times every input of INPUT-CATALOG.md from the input
 * event to the first frame that shows its result, and writes one JSON line per cell (an input under one page's
 * conditions). This tool keeps those cells as a history and judges each run against the one before it:
 *
 *   node tools/interaction-latency.mjs run <quick|full> [--page Q1,Q2] [--smoke] [--history <file>]
 *       run the tier (under the GPU lock and the reserved cores; --smoke: SwiftShader, no lock, never recorded in
 *       the repository's history) and record it, then print compare and report
 *   node tools/interaction-latency.mjs record <latency.jsonl> --tier <quick|full> [--history <file>]
 *       append a runner results file to the history as one run, keyed by commit
 *   node tools/interaction-latency.mjs compare [--tier <t>] [--history <file>]
 *       each cell of the newest run against the run before it (same tier and machine): exit 1 when a cell slowed
 *       past the noise bar and the owner has not accepted it
 *   node tools/interaction-latency.mjs report [--tier <t>] [--history <file>]
 *       every cell of the newest run over 300 ms, then every cell between 150 and 300 ms
 *
 * The history is benchmarks/results/interaction-latency-history.jsonl: one line per cell per run. A cell's time is
 * its drawn latency (input to the first presented frame whose pixels show the result; the state time when the canvas
 * never shows it), as a median and a 95th percentile over the run's repetitions.
 *
 * Slower: the cell's median AND 95th percentile both rose past THRESHOLD times the previous run's and by more than
 * FLOOR_MS (one 60 Hz frame). A cell that moved into a worse band (good up to 150 ms, acceptable up to 300 ms, over
 * 300 ms fails) is listed too.
 *
 * Accepting a slowdown is the owner's, as for load time (tools/load-time.mjs): an entry in
 * benchmarks/interaction-latency-accepted.json, `{ "row": "<cell>", "commit": "<sha>", "ratio": 1.3, "reason": "...",
 * "approval": "<URL of the owner's issue or pull request comment naming the cell>" }`, applies while the newer run
 * contains the commit and the older one does not. Agents never edit that file.
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { cpus } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { acceptedRows, approvedEntries, fetchIssueComment } from "./load-time.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const HISTORY_FILE = join(REPO, "benchmarks/results/interaction-latency-history.jsonl");
export const ACCEPTED_FILE = join(REPO, "benchmarks/interaction-latency-accepted.json");
const RUNNER = join(REPO, "benchmarks/compare/interaction-latency.mjs");

export const GOOD_MS = 150;
export const FAIL_MS = 300;
/** The factor a median and a 95th percentile must both exceed: a fifth slower. */
export const THRESHOLD = 1.2;
/** The rise both must clear: one 60 Hz frame. */
export const FLOOR_MS = 16.7;

/**
 * Where a runner row ran: the surface and its conditions, as one string.
 * @param r - a runner row
 * @returns the condition label
 */
export function whereOf(r) {
    const k = (n) => (n >= 1000 ? `${n / 1000}k` : String(n));
    return r.surface === "graphty app"
        ? `app ${r.graph} ${r.features} ${r.dim}`
        : `element ${r.path} ${r.dim} ${r.mode ?? "plain"} dpr${r.dpr ?? 1} ${k(r.n)}`;
}

/**
 * The band of a time.
 * @param ms - the 95th percentile, or null when nothing was measured
 * @returns "good", "acceptable", "fails" or "none"
 */
export function band(ms) {
    if (ms === null || ms === undefined) return "none";
    if (ms <= GOOD_MS) return "good";
    return ms <= FAIL_MS ? "acceptable" : "fails";
}

/**
 * History lines for one runner results file: one per measured cell.
 * @param rows - the runner's JSON lines (cells, page failures and page wall times)
 * @param run - { run, commit, tier, machine, smoke }
 * @returns the history lines
 */
export function toHistory(rows, run) {
    return rows
        .filter((r) => !r.failure && !r.wall && r.interaction)
        .map((r) => ({
            ...run,
            renderer: r.renderer ?? null,
            page: r.tierPage ?? null,
            cell: `${whereOf(r)} | ${r.interaction}`,
            medianMs: r.median_ms,
            p95Ms: r.p95_ms,
            stateMs: r.state_median_ms,
            settledMs: r.settled_median_ms,
            dropped: r.drops_median ?? null,
            samples: r.samples,
            timeouts: r.timeouts,
            noVisible: r.noVisible,
            ...(r.notMeasured ? { notMeasured: r.notMeasured } : {}),
            ...(r.errors ? { errors: r.errors.length } : {}),
        }));
}

/**
 * The newest run of a history and the run before it on the same tier and machine.
 * @param lines - the history
 * @param tier - only this tier, if given
 * @returns the newest run's lines (now) and the previous run's (before, empty when there is none)
 */
export function lastTwo(lines, tier) {
    const mine = lines.filter((l) => !tier || l.tier === tier);
    const newest = mine.at(-1);
    if (!newest) return { now: [], before: [] };
    const same = mine.filter((l) => l.tier === newest.tier && l.machine === newest.machine);
    const runs = [...new Set(same.map((l) => l.run))];
    const pick = (id) => same.filter((l) => l.run === id);
    return { now: pick(runs.at(-1)), before: runs.length > 1 ? pick(runs.at(-2)) : [] };
}

/**
 * One cell against the previous run.
 * @param now - the newer line
 * @param before - the older line, if any
 * @param accepted - the owner's applying acceptance for the cell, if any
 * @returns "new", "unmeasured", "ok", "faster", "slower" or "accepted"
 */
export function cellStatus(now, before, accepted) {
    if (now.p95Ms === null || now.medianMs === null) return "unmeasured";
    if (!before || before.p95Ms === null || before.medianMs === null) return "new";
    const past = (b, k) =>
        now.medianMs > k * b.medianMs &&
        now.p95Ms > k * b.p95Ms &&
        now.medianMs - b.medianMs > FLOOR_MS &&
        now.p95Ms - b.p95Ms > FLOOR_MS;
    if (past(before, THRESHOLD)) return accepted && !past(before, THRESHOLD * accepted.ratio) ? "accepted" : "slower";
    const faster = before.medianMs > THRESHOLD * now.medianMs && before.medianMs - now.medianMs > FLOOR_MS;
    return faster ? "faster" : "ok";
}

/**
 * Every cell of the newer run against the older.
 * @param now - the newer run's lines
 * @param before - the older run's lines
 * @param accepted - applying acceptances by cell
 * @returns one entry per cell, slowest change first, and the count of unaccepted slowdowns
 */
export function compareRuns(now, before, accepted = new Map()) {
    const old = new Map(before.map((l) => [l.cell, l]));
    const cells = now.map((l) => {
        const b = old.get(l.cell);
        const status = cellStatus(l, b, accepted.get(l.cell));
        const crossed = b && band(b.p95Ms) !== "none" && rank(band(l.p95Ms)) > rank(band(b.p95Ms));
        return { cell: l.cell, now: l, before: b ?? null, status, crossed: !!crossed };
    });
    const ratio = (c) => (c.before?.p95Ms && c.now.p95Ms ? c.now.p95Ms / c.before.p95Ms : 0);
    cells.sort((a, b) => ratio(b) - ratio(a));
    return { cells, slower: cells.filter((c) => c.status === "slower").length };
}
const rank = (b) => ["good", "acceptable", "fails", "none"].indexOf(b);

/**
 * The newest run's cells over the bars.
 * @param now - its lines
 * @returns over300 and over150 (150 to 300 ms), slowest first; unmeasured cells apart
 */
export function overBudget(now) {
    const by = (a, b) => b.p95Ms - a.p95Ms;
    return {
        over300: now.filter((l) => band(l.p95Ms) === "fails").sort(by),
        over150: now.filter((l) => band(l.p95Ms) === "acceptable").sort(by),
        unmeasured: now.filter((l) => band(l.p95Ms) === "none"),
    };
}

// ------------------------------------------------------------------ the commands

const readHistory = (file) =>
    existsSync(file)
        ? readFileSync(file, "utf8")
              .split("\n")
              .filter(Boolean)
              .map((l) => JSON.parse(l))
        : [];
const fmt = (v) => (v === null || v === undefined ? "-" : String(Math.round(v)));

function git(...args) {
    return spawnSync("git", args, { cwd: REPO, encoding: "utf8" });
}

function record(results, tier, history, smoke) {
    const rows = readFileSync(results, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
    const isSmoke = smoke || rows.some((r) => r.smoke);
    if (isSmoke && history === HISTORY_FILE)
        throw new Error("a smoke run (SwiftShader) is never recorded in the repository's history: pass --history");
    const dirty = git("status", "--porcelain", "--untracked-files=no").stdout.trim() !== "";
    const run = {
        run: new Date().toISOString(),
        commit: git("rev-parse", "HEAD").stdout.trim(),
        ...(dirty ? { dirty: true } : {}),
        tier,
        machine: cpus()[0]?.model.trim() ?? "unknown",
        ...(isSmoke ? { smoke: true } : {}),
    };
    const lines = toHistory(rows, run);
    mkdirSync(dirname(history), { recursive: true });
    appendFileSync(history, lines.map((l) => JSON.stringify(l) + "\n").join(""));
    const walls = rows.filter((r) => r.wall);
    const minutes = walls.reduce((a, w) => a + w.wallMs, 0) / 60000;
    const failed = rows.filter((r) => r.failure);
    console.log(
        `recorded ${lines.length} cells of ${walls.length} pages (${minutes.toFixed(1)} minutes) as run ${run.run} ` +
            `at ${run.commit.slice(0, 10)} in ${history}`,
    );
    for (const f of failed) console.log(`page failed: ${f.tierPage ?? ""} ${whereOf(f)}: ${f.failure}`);
}

async function loadAccepted(now, before) {
    const listed = existsSync(ACCEPTED_FILE) ? JSON.parse(readFileSync(ACCEPTED_FILE, "utf8")) : [];
    if (!listed.length || !before.length) return new Map();
    const { approved, rejected } = await approvedEntries(listed, fetchIssueComment);
    for (const r of rejected) console.error(`${ACCEPTED_FILE}: ${r}`);
    const contains = (commit, rev) => git("merge-base", "--is-ancestor", commit, rev).status === 0;
    return acceptedRows(approved, {
        candidate: (c) => contains(c, now[0].commit),
        reference: (c) => contains(c, before[0].commit),
    });
}

async function compare(history, tier) {
    const { now, before } = lastTwo(readHistory(history), tier);
    if (!now.length) {
        console.log(`no runs in ${history}`);
        return 0;
    }
    const head = `${now[0].tier} run ${now[0].run} at ${now[0].commit.slice(0, 10)}`;
    if (!before.length) {
        console.log(`${head}: the first run of this tier on ${now[0].machine}; nothing to compare with`);
        return 0;
    }
    console.log(`${head} against run ${before[0].run} at ${before[0].commit.slice(0, 10)} (${now[0].machine})`);
    const { cells, slower } = compareRuns(now, before, await loadAccepted(now, before));
    console.log("\nstatus      p95 now  p95 before  median now  median before  band now    cell");
    for (const c of cells.filter((x) => x.status !== "ok" || x.crossed))
        console.log(
            [
                (c.status + (c.crossed ? "*" : "")).padEnd(11),
                fmt(c.now.p95Ms).padStart(7),
                fmt(c.before?.p95Ms).padStart(11),
                fmt(c.now.medianMs).padStart(11),
                fmt(c.before?.medianMs).padStart(14),
                band(c.now.p95Ms).padEnd(10),
                c.cell,
            ].join(" "),
        );
    const ok = cells.filter((c) => c.status === "ok" && !c.crossed).length;
    console.log(`\n${ok} cells unchanged within the noise bar (not listed). * = moved into a worse band.`);
    if (slower)
        console.error(
            `\n${slower} cell(s) slower than the previous run: median and p95 both above x${THRESHOLD} and ` +
                `${FLOOR_MS} ms. Find the change and fix it; only the owner accepts a slowdown ` +
                "(benchmarks/interaction-latency-accepted.json, see tools/interaction-latency.mjs).",
        );
    return slower ? 1 : 0;
}

function report(history, tier) {
    const { now } = lastTwo(readHistory(history), tier);
    if (!now.length) return console.log(`no runs in ${history}`);
    const { over300, over150, unmeasured } = overBudget(now);
    const settled = (l) => (l.settledMs ? ", settled " + fmt(l.settledMs) : "");
    const line = (l) =>
        `  ${fmt(l.p95Ms).padStart(6)} ms p95 (median ${fmt(l.medianMs)}, state ${fmt(l.stateMs)}` +
        `${settled(l)})  ${l.cell}`;
    console.log(`${now[0].tier} run ${now[0].run} at ${now[0].commit.slice(0, 10)}: ${now.length} cells`);
    console.log(`\nOver ${FAIL_MS} ms (fails): ${over300.length}`);
    for (const l of over300) console.log(line(l));
    console.log(`\n${GOOD_MS} to ${FAIL_MS} ms (acceptable, over the preferred bar): ${over150.length}`);
    for (const l of over150) console.log(line(l));
    console.log(`\nNot measured (skipped, timed out or failed): ${unmeasured.length}`);
    for (const l of unmeasured) console.log("  " + l.cell + (l.notMeasured ? " -- " + l.notMeasured : ""));
}

/**
 * The lock and reserved cores a timed run holds, from the main checkout's tmp (LAT_WRAP overrides).
 * @returns the command prefix
 */
function gpuWrap() {
    if (process.env.LAT_WRAP) return process.env.LAT_WRAP;
    const common = git("rev-parse", "--path-format=absolute", "--git-common-dir").stdout.trim();
    const main = dirname(common);
    const lock = join(main, "tmp/cosmos-impl/gpu-bench.lock");
    const cores = join(main, "tmp/bench-cores/bench-cores.sh");
    if (!existsSync(cores)) throw new Error(`no ${cores}: set LAT_WRAP to the lock and cores command prefix`);
    return `flock ${lock} ${cores} run`;
}

/**
 * Runs a tier through the runner, records it, and prints report and compare.
 * @param tier - quick or full
 * @param o - the options (page, reps, smoke)
 * @param history - the history file
 * @returns compare's exit code
 */
async function run(tier, o, history) {
    if (tier !== "quick" && tier !== "full") throw new Error("run <quick|full>");
    const results = join(REPO, "benchmarks/out/interaction-latency", `${tier}-${Date.now()}.jsonl`);
    const env = { ...process.env };
    if (o.smoke) env.LAT_SMOKE = "1";
    else env.LAT_WRAP = gpuWrap();
    const args = [RUNNER, "tier", tier, results];
    if (o.page) args.push("--page", o.page);
    if (o.reps) args.push("--reps", o.reps);
    const r = spawnSync(process.execPath, args, { stdio: "inherit", env });
    if (r.status !== 0) throw new Error(`the runner exited ${r.status ?? r.signal}`);
    record(results, tier, history, o.smoke);
    report(history, tier);
    return compare(history, tier);
}

async function main(argv) {
    const [cmd, ...rest] = argv;
    const { values: o, positionals } = parseArgs({
        args: rest,
        allowPositionals: true,
        options: {
            tier: { type: "string" },
            history: { type: "string" },
            page: { type: "string" },
            reps: { type: "string" },
            smoke: { type: "boolean", default: false },
        },
    });
    const history = resolve(o.history ?? HISTORY_FILE);
    if (cmd === "record") {
        if (!positionals[0] || !o.tier) throw new Error("record <latency.jsonl> --tier <quick|full>");
        record(resolve(positionals[0]), o.tier, history, o.smoke);
        return 0;
    }
    if (cmd === "compare") return compare(history, o.tier);
    if (cmd === "report") {
        report(history, o.tier);
        return 0;
    }
    if (cmd === "run") return run(positionals[0], o, history);
    throw new Error("usage: run | record | compare | report (see the top of tools/interaction-latency.mjs)");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        process.exitCode = await main(process.argv.slice(2));
    } catch (e) {
        console.error(`interaction-latency: ${e instanceof Error ? e.message : String(e)}`);
        process.exitCode = 1;
    }
}
