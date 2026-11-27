#!/usr/bin/env node
/**
 * interaction-latency.mjs -- the user input latency suite, run by tier and tracked over time (issue #10119).
 *
 * The runner, benchmarks/compare/interaction-latency.mjs, times every input of INPUT-CATALOG.md from the input
 * event to the first frame that shows its result, and writes one JSON line per cell (an input under one page's
 * conditions). This tool keeps those cells as a history and judges each run against the one before it:
 *
 *   node tools/interaction-latency.mjs run <quick|full> [--page Q1,Q2] [--smoke] [--history <file>]
 *       check the bench page and graphty/dist are HEAD's builds, run the tier (under the GPU lock and the reserved
 *       cores; --smoke: SwiftShader on small graphs, no lock, never recorded in the repository's history) and
 *       record it, then print report and compare. With --page the pages are a series of their own ("full:E3").
 *   node tools/interaction-latency.mjs record <latency.jsonl> --tier <quick|full> [--history <file>]
 *       append a runner results file to the history as one run, keyed by commit; refused when the builds the run
 *       timed are older than HEAD's sources
 *   node tools/interaction-latency.mjs compare [--tier <t>] [--history <file>]
 *       each cell of the newest run against the run before it and the oldest of the ten before it (same tier and
 *       machine): exit 1 when a cell failed the comparison and the owner has not accepted it
 *   node tools/interaction-latency.mjs guard <latency.jsonl> [--baseline <matrix.jsonl>]
 *       exit 1 when a cell the committed matrix run (benchmarks/results/interaction-latency/latency.jsonl) measured
 *       at or under 300 ms (median) is now over it, died, or was not measured; cells over 300 ms there are listed
 *   node tools/interaction-latency.mjs report [--tier <t>] [--history <file>]
 *       every cell of the newest run over 300 ms, then between 150 and 300 ms, then the unmeasured cells and the
 *       cells timed to state because the canvas change was not seen
 *
 * The history is benchmarks/results/interaction-latency-history.jsonl: one line per cell per run. A cell's time is
 * its drawn latency (input to the first presented frame whose pixels show the result; the state time when the canvas
 * was never seen to change, marked by noVisible and endsOn), as a median and a 95th percentile over the run's
 * repetitions; a repetition that timed out counts at its cap. The machine is the CPU, the browser version, the GPU
 * renderer and the NVIDIA driver: a change of any starts a new series.
 *
 * A cell fails the comparison when it is: slower (median AND 95th percentile both past THRESHOLD times the previous
 * run's and FLOOR_MS more), tail (the 95th percentile alone past that, and over 150 ms), creep (median and 95th
 * percentile past THRESHOLD times the oldest of the CREEP_RUNS runs before it), fails (moved over 300 ms), lost
 * (measured before, nothing measured now) or missing (in the previous run, absent now).
 *
 * Accepting a slowdown is the owner's, as for load time (tools/load-time.mjs): an entry in
 * benchmarks/interaction-latency-accepted.json, `{ "row": "<cell>", "commit": "<sha>", "ratio": 1.3, "reason": "...",
 * "approval": "<URL of the owner's issue or pull request comment naming the cell>" }`, applies while the newer run
 * contains the commit and the older one does not. Agents never edit that file.
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
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
/** Creep: the newest run is also compared with the oldest of this many runs before it. */
export const CREEP_RUNS = 10;

/**
 * Where a runner row ran: the surface and its conditions, as one string.
 * @param r - a runner row
 * @returns the condition label
 */
export function whereOf(r) {
    const k = (n) => (n >= 1000 ? `${n / 1000}k` : String(n));
    return r.surface === "graphty app"
        ? `app ${r.graph} ${r.features} ${r.dim} dpr${r.dpr ?? 1}`
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
 * History lines for one runner results file: one per cell, measured or not. A page that failed leaves its cells
 * out, which compare reports as missing.
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
            ...(r.achieved_hz_median ? { receivedHz: r.achieved_hz_median } : {}),
            samples: r.samples,
            timeouts: r.timeouts,
            noVisible: r.noVisible,
            endsOn: r.endsOn ?? null,
            ...(r.layoutStill ? { layoutStill: r.layoutStill } : {}),
            ...(r.clickWindowMissed ? { clickWindowMissed: r.clickWindowMissed } : {}),
            ...(r.notMeasured ? { notMeasured: r.notMeasured } : {}),
            ...(r.died ? { died: r.died } : {}),
            ...(r.errors ? { errors: r.errors.length } : {}),
        }));
}

/**
 * The newest run of a history, the run before it, and the oldest of the CREEP_RUNS runs before it, all on the same
 * tier and machine (CPU, browser, GPU and driver: a new Chromium or driver starts a new series, never a slowdown).
 * @param lines - the history
 * @param tier - only this tier, if given
 * @returns now, before and reference (the older lines; empty when there are none)
 */
export function lastTwo(lines, tier) {
    const mine = lines.filter((l) => !tier || l.tier === tier);
    const newest = mine.at(-1);
    if (!newest) return { now: [], before: [], reference: [] };
    const same = mine.filter((l) => l.tier === newest.tier && l.machine === newest.machine);
    const runs = [...new Set(same.map((l) => l.run))];
    const pick = (id) => (id === undefined ? [] : same.filter((l) => l.run === id));
    const older = runs.slice(0, -1).slice(-CREEP_RUNS);
    return { now: pick(runs.at(-1)), before: pick(older.at(-1)), reference: older.length > 1 ? pick(older[0]) : [] };
}

const measured = (l) => l && l.p95Ms !== null && l.p95Ms !== undefined && l.medianMs !== null;
// Both the median and the 95th percentile past k times the older and one frame above it.
const bothPast = (now, b, k) =>
    now.medianMs > k * b.medianMs &&
    now.p95Ms > k * b.p95Ms &&
    now.medianMs - b.medianMs > FLOOR_MS &&
    now.p95Ms - b.p95Ms > FLOOR_MS;
// The 95th percentile alone past k times the older and one frame, where the tail is over the preferred bar.
const tailPast = (now, b, k) => now.p95Ms > k * b.p95Ms && now.p95Ms - b.p95Ms > FLOOR_MS && now.p95Ms > GOOD_MS;

/**
 * One cell against the previous run (and the reference run, for creep).
 * @param now - the newer line, or undefined when the newer run lacks the cell
 * @param before - the older line, if any
 * @param accepted - the owner's applying acceptance for the cell, if any
 * @param reference - the cell in the oldest run of the creep window, if any
 * @returns "new", "unmeasured", "lost", "missing", "ok", "faster", "slower", "tail", "creep", "fails" or
 *   "accepted"; every one from "lost" to "fails" fails the comparison
 */
export function cellStatus(now, before, accepted, reference) {
    if (!now) return measured(before) ? "missing" : "ok";
    if (!measured(now)) return measured(before) ? "lost" : "unmeasured";
    if (!measured(before)) return "new";
    const slow = slowdown(now, before, reference);
    if (slow) return excused(slow, now, before, reference, accepted) ? "accepted" : slow;
    const faster = before.medianMs > THRESHOLD * now.medianMs && before.medianMs - now.medianMs > FLOOR_MS;
    return faster ? "faster" : "ok";
}

/**
 * The kind of slowdown a measured cell shows against the older runs, or null.
 * @param now - the newer line
 * @param before - the previous run's line
 * @param reference - the creep window's oldest line, if any
 * @returns "slower", "tail", "creep", "fails" or null
 */
function slowdown(now, before, reference) {
    if (bothPast(now, before, THRESHOLD)) return "slower";
    if (tailPast(now, before, THRESHOLD)) return "tail";
    if (measured(reference) && bothPast(now, reference, THRESHOLD)) return "creep";
    return band(before.p95Ms) !== "fails" && band(now.p95Ms) === "fails" ? "fails" : null;
}

/**
 * Whether the owner's acceptance covers a slowdown: it stays within his ratio of the older time.
 * @param kind - the slowdown
 * @param now - the newer line
 * @param before - the previous run's line
 * @param reference - the creep window's oldest line
 * @param accepted - the acceptance, if any
 * @returns true when accepted
 */
function excused(kind, now, before, reference, accepted) {
    if (!accepted) return false;
    const k = THRESHOLD * accepted.ratio;
    if (kind === "slower") return !bothPast(now, before, k);
    if (kind === "tail") return !tailPast(now, before, k);
    if (kind === "creep") return !bothPast(now, reference, k);
    return now.p95Ms <= before.p95Ms * accepted.ratio;
}

export const FAILING = new Set(["lost", "missing", "slower", "tail", "creep", "fails"]);

/**
 * Every cell of the newer run against the older, and every cell of the older run the newer one lacks.
 * @param now - the newer run's lines
 * @param before - the older run's lines
 * @param accepted - applying acceptances by cell
 * @param reference - the creep window's oldest run's lines
 * @returns one entry per cell, slowest change first, and the count of failing cells
 */
export function compareRuns(now, before, accepted = new Map(), reference = []) {
    const old = new Map(before.map((l) => [l.cell, l]));
    const ref = new Map(reference.map((l) => [l.cell, l]));
    const cur = new Set(now.map((l) => l.cell));
    const cells = [
        ...now.map((l) => {
            const b = old.get(l.cell);
            const status = cellStatus(l, b, accepted.get(l.cell), ref.get(l.cell));
            const crossed = !!b && band(b.p95Ms) !== "none" && rank(band(l.p95Ms)) > rank(band(b.p95Ms));
            return { cell: l.cell, now: l, before: b ?? null, status, crossed };
        }),
        ...before
            .filter((b) => !cur.has(b.cell))
            .map((b) => ({ cell: b.cell, now: null, before: b, status: cellStatus(undefined, b), crossed: false })),
    ];
    const ratio = (c) => (c.before?.p95Ms && c.now?.p95Ms ? c.now.p95Ms / c.before.p95Ms : 0);
    cells.sort((a, b) => ratio(b) - ratio(a));
    return { cells, failing: cells.filter((c) => FAILING.has(c.status)).length };
}
const rank = (b) => ["good", "acceptable", "fails", "none"].indexOf(b);

/**
 * The newest run's cells over the bars.
 * @param now - its lines
 * @returns over300 and over150 (150 to 300 ms), slowest first; unmeasured cells, and the cells whose time is a
 *   state time because the canvas was never seen to change (stateOnly)
 */
export function overBudget(now) {
    const by = (a, b) => b.p95Ms - a.p95Ms;
    return {
        over300: now.filter((l) => band(l.p95Ms) === "fails").sort(by),
        over150: now.filter((l) => band(l.p95Ms) === "acceptable").sort(by),
        unmeasured: now.filter((l) => band(l.p95Ms) === "none"),
        stateOnly: now.filter((l) => l.noVisible > 0),
    };
}

/** The committed matrix run a guarded run is held to (issue #10181). */
export const MATRIX_FILE = join(REPO, "benchmarks/results/interaction-latency/latency.jsonl");

/**
 * The guard: every cell the baseline matrix measured at or under FAIL_MS (median) must stay there. A covered cell
 * whose median is now over FAIL_MS, that died, or that the new run measured nothing for, fails; a cell already over
 * FAIL_MS in the baseline is a known defect (its own issue) and is listed, never failed, so it fails the guard
 * only once it has been fixed and then goes back over.
 * @param baseline - the baseline runner rows
 * @param rows - the new run's runner rows
 * @returns failing and known cells, by name
 */
export function guardCells(baseline, rows) {
    const cellOf = (r) => `${whereOf(r)} | ${r.interaction}`;
    const cells = (rs) => new Map(rs.filter((r) => r.interaction && !r.wall && !r.failure).map((r) => [cellOf(r), r]));
    const now = cells(rows);
    const failing = [];
    const known = [];
    for (const [cell, b] of cells(baseline)) {
        if (typeof b.median_ms !== "number" || b.died) continue;
        const r = now.get(cell);
        if (b.median_ms > FAIL_MS) {
            if (r) known.push({ cell, before: b.median_ms, now: r.median_ms ?? null });
            continue;
        }
        if (!r) continue;
        if (r.died || typeof r.median_ms !== "number")
            failing.push({ cell, before: b.median_ms, now: null, why: r.died ?? "nothing measured" });
        else if (r.median_ms > FAIL_MS)
            failing.push({ cell, before: b.median_ms, now: r.median_ms, why: "over 300 ms" });
    }
    return { failing, known };
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

// The sources a build is made from: graphty-element and the packages it builds on; the app adds its own and
// compact-mantine.
const ELEMENT_SRC = [
    "graph-format/src",
    "graph-io/src",
    "graph-samples/src",
    "algorithms/src",
    "layout/src",
    "webgpu-graph-algorithms/src",
    "graphty-element/src",
];
const APP_SRC = [...ELEMENT_SRC, "graphty/src", "compact-mantine/src"];
const BENCH_SRC = [...ELEMENT_SRC, "benchmarks/compare/main.js", "benchmarks/compare/index.html"];

/**
 * When the newest commit (or uncommitted change) to `paths` was made.
 * @param paths - the source paths
 * @returns the time in ms, or null when there is none
 */
function sourceTime(paths) {
    if (git("status", "--porcelain", "--untracked-files=no", "--", ...paths).stdout.trim()) return Date.now();
    const t = git("log", "-1", "--format=%ct", "HEAD", "--", ...paths).stdout.trim();
    return t ? Number(t) * 1000 : null;
}

/**
 * Why the builds a run timed are not HEAD's, or [] when they are: a bench page built from a commit whose sources
 * differ from HEAD's, a graphty-element or graphty/dist build older than the newest source change. A stale build's
 * numbers stored under HEAD would blame or credit the wrong commit.
 * @param rows - the runner's rows
 * @returns the reasons
 */
export function staleBuilds(rows) {
    const why = [];
    const shas = new Set(rows.filter((r) => r.surface === "graphty-element" && r.sha).map((r) => r.sha));
    for (const sha of shas)
        if (git("diff", "--quiet", sha, "HEAD", "--", ...BENCH_SRC).status !== 0)
            why.push(`the bench page was built at ${sha.slice(0, 10)}, whose sources differ from HEAD's`);
    if (rows.some((r) => r.surface === "graphty-element" && r.dirty))
        why.push("the bench page was built from a checkout with uncommitted changes");
    const elementSrc = sourceTime(ELEMENT_SRC);
    for (const t of new Set(rows.map((r) => r.elementBuilt).filter(Boolean)))
        if (elementSrc && Date.parse(t) < elementSrc)
            why.push(`graphty-element's dist (${t}) is older than its newest source change`);
    const appSrc = sourceTime(APP_SRC);
    for (const t of new Set(rows.map((r) => r.appBuilt).filter(Boolean)))
        if (appSrc && Date.parse(t) < appSrc) why.push(`graphty/dist (${t}) is older than its newest source change`);
    return why;
}

/**
 * The machine a run's numbers belong to: CPU, browser, GPU renderer and NVIDIA driver.
 * @param rows - the runner's rows
 * @returns the machine key
 */
function machineOf(rows) {
    const first = (k) => rows.find((r) => r[k])?.[k] ?? "unknown";
    const smi = spawnSync("nvidia-smi", ["--query-gpu=driver_version", "--format=csv,noheader"], { encoding: "utf8" });
    const driver = smi.status === 0 ? smi.stdout.trim().split("\n")[0] : "no driver";
    return [
        cpus()[0]?.model.trim() ?? "unknown",
        `Chrome ${first("browser")}`,
        first("renderer"),
        `driver ${driver}`,
    ].join(" | ");
}

function record(results, tier, history, smoke) {
    const rows = readFileSync(results, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
    const isSmoke = smoke || rows.some((r) => r.smoke);
    if (isSmoke && history === HISTORY_FILE)
        throw new Error("a smoke run (SwiftShader) is never recorded in the repository's history: pass --history");
    const stale = isSmoke ? [] : staleBuilds(rows);
    if (stale.length)
        throw new Error(`not recorded, the builds are not HEAD's: ${stale.join("; ")}. Rebuild and rerun.`);
    const run = {
        run: new Date().toISOString(),
        commit: git("rev-parse", "HEAD").stdout.trim(),
        tier,
        machine: machineOf(rows),
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
    for (const w of walls) console.log(`  page ${w.tierPage ?? ""}: ${(w.wallMs / 60000).toFixed(1)} minutes`);
    for (const f of failed) console.log(`page failed: ${f.tierPage ?? ""} ${whereOf(f)}: ${f.failure}`);
}

async function loadAccepted(now, older) {
    const listed = existsSync(ACCEPTED_FILE) ? JSON.parse(readFileSync(ACCEPTED_FILE, "utf8")) : [];
    if (!listed.length || !older.length) return new Map();
    const { approved, rejected } = await approvedEntries(listed, fetchIssueComment);
    for (const r of rejected) console.error(`${ACCEPTED_FILE}: ${r}`);
    const contains = (commit, rev) => git("merge-base", "--is-ancestor", commit, rev).status === 0;
    return acceptedRows(approved, {
        candidate: (c) => contains(c, now[0].commit),
        reference: (c) => contains(c, older[0].commit),
    });
}

const WHY = {
    slower: `median and p95 both above x${THRESHOLD} the previous run's and ${FLOOR_MS} ms more`,
    tail: `p95 alone above x${THRESHOLD} and ${FLOOR_MS} ms more, and over ${GOOD_MS} ms`,
    creep: `median and p95 both above x${THRESHOLD} the oldest of the last ${CREEP_RUNS} runs'`,
    fails: `moved over ${FAIL_MS} ms`,
    lost: "measured before, nothing measured now (every repetition failed)",
    missing: "in the previous run, absent now (its page failed or the input was dropped)",
};

async function compare(history, tier) {
    const { now, before, reference } = lastTwo(readHistory(history), tier);
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
    if (reference.length)
        console.log(`creep reference: run ${reference[0].run} at ${reference[0].commit.slice(0, 10)}`);
    const accepted = await loadAccepted(now, reference.length ? reference : before);
    const { cells, failing } = compareRuns(now, before, accepted, reference);
    console.log("\nstatus      p95 now  p95 before  median now  median before  band now    ends on  cell");
    for (const c of cells.filter((x) => x.status !== "ok" || x.crossed))
        console.log(
            [
                (c.status + (c.crossed ? "*" : "")).padEnd(11),
                fmt(c.now?.p95Ms).padStart(7),
                fmt(c.before?.p95Ms).padStart(11),
                fmt(c.now?.medianMs).padStart(11),
                fmt(c.before?.medianMs).padStart(14),
                band(c.now?.p95Ms).padEnd(10),
                (c.now?.endsOn ?? "-").padEnd(8),
                c.cell,
            ].join(" "),
        );
    const ok = cells.filter((c) => c.status === "ok" && !c.crossed).length;
    console.log(
        `\n${ok} cells unchanged within the noise bar (not listed). * = moved into a worse band. ` +
            '"ends on state": the canvas was not seen to change, so the time is the state time.',
    );
    if (failing) {
        console.error(`\n${failing} cell(s) fail the comparison:`);
        for (const [k, v] of Object.entries(WHY)) {
            const n = cells.filter((c) => c.status === k).length;
            if (n) console.error(`  ${n} ${k}: ${v}`);
        }
        console.error(
            "Find the change and fix it; only the owner accepts a slowdown " +
                "(benchmarks/interaction-latency-accepted.json, see tools/interaction-latency.mjs).",
        );
    }
    return failing ? 1 : 0;
}

function report(history, tier) {
    const { now } = lastTwo(readHistory(history), tier);
    if (!now.length) return console.log(`no runs in ${history}`);
    const { over300, over150, unmeasured, stateOnly } = overBudget(now);
    const settled = (l) => (l.settledMs ? ", settled " + fmt(l.settledMs) : "");
    const timedOut = (l) =>
        (l.timeouts ? " [" + l.timeouts + " timed out]" : "") +
        (l.clickWindowMissed ? " [" + l.clickWindowMissed + " released over 300 ms after the press: no click]" : "");
    const mark = (l) => (l.noVisible ? ` [state time: canvas change not seen in ${l.noVisible} of ${l.samples}]` : "");
    const line = (l) =>
        `  ${fmt(l.p95Ms).padStart(6)} ms p95 (median ${fmt(l.medianMs)}, state ${fmt(l.stateMs)}` +
        `${settled(l)})  ${l.cell}${timedOut(l)}${mark(l)}`;
    console.log(`${now[0].tier} run ${now[0].run} at ${now[0].commit.slice(0, 10)}: ${now.length} cells`);
    console.log(`\nOver ${FAIL_MS} ms (fails): ${over300.length}`);
    for (const l of over300) console.log(line(l));
    console.log(`\n${GOOD_MS} to ${FAIL_MS} ms (acceptable, over the preferred bar): ${over150.length}`);
    for (const l of over150) console.log(line(l));
    console.log(`\nNot measured (skipped or failed): ${unmeasured.length}`);
    for (const l of unmeasured) console.log("  " + l.cell + (l.notMeasured ? " -- " + l.notMeasured : ""));
    console.log(`\nTimed to state, not pixels (the canvas change was not seen): ${stateOnly.length}`);
    for (const l of stateOnly) console.log(line(l));
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
    mkdirSync(dirname(lock), { recursive: true });
    // The main checkout's copy when there is one (other benchmarks use it), else the committed one: both reserve
    // the same cores through the same files.
    const installed = join(main, "tmp/bench-cores/bench-cores.sh");
    const cores = existsSync(installed) ? installed : join(REPO, "benchmarks/compare/bench-cores.sh");
    return `flock ${lock} ${cores} run`;
}

/**
 * Runs a tier through the runner, records it, and prints report and compare.
 * @param tier - quick or full
 * @param o - the options (page, reps, smoke)
 * @param history - the history file
 * @returns compare's exit code
 */
/**
 * Before a timed run: the bench page and graphty/dist must be HEAD's builds, or hours of GPU time would be stored
 * under the wrong commit.
 */
const BUILD_STAMP = /"?sha"?:"([0-9a-f]{40})","?dirty"?:(!0|!1|true|false),"?distBuilt"?:"([^"]+)"/;
function preflight() {
    const label = process.env.BENCH_LABEL ?? "interaction-latency";
    const assets = join(REPO, "benchmarks/compare/builds", label, "assets");
    const bench = existsSync(assets)
        ? readdirSync(assets)
              .filter((f) => f.endsWith(".js"))
              // The bench page's own build stamp (vite.config.js), as the minified bundle writes it.
              .map((f) => BUILD_STAMP.exec(readFileSync(join(assets, f), "utf8")))
              .find(Boolean)
        : null;
    if (!bench)
        throw new Error(`no bench page build in ${assets}: build it (benchmarks/compare/RUNBOOK.md, section 1)`);
    const app = join(REPO, "graphty/dist/index.html");
    if (!existsSync(app)) throw new Error("no graphty/dist: pnpm exec nx run graphty:build");
    const stale = staleBuilds([
        {
            surface: "graphty-element",
            sha: bench[1],
            dirty: bench[2] === "!0" || bench[2] === "true",
            elementBuilt: bench[3],
        },
        { surface: "graphty app", appBuilt: statSync(app).mtime.toISOString() },
    ]);
    if (stale.length) throw new Error(`the builds are not HEAD's: ${stale.join("; ")}`);
}

async function run(tier, o, history) {
    if (tier !== "quick" && tier !== "full") throw new Error("run <quick|full>");
    if (!o.smoke) preflight();
    const results = join(REPO, "benchmarks/out/interaction-latency", `${tier}-${Date.now()}.jsonl`);
    const env = { ...process.env };
    if (o.smoke) env.LAT_SMOKE = "1";
    else env.LAT_WRAP = gpuWrap();
    const args = [RUNNER, "tier", tier, results];
    if (o.page) args.push("--page", o.page);
    if (o.reps) args.push("--reps", o.reps);
    const r = spawnSync(process.execPath, args, { stdio: "inherit", env });
    if (r.status !== 0) throw new Error(`the runner exited ${r.status ?? r.signal}`);
    // Some pages of a tier are a series of their own: compared with the last run of the same pages only.
    const series = o.page ? `${tier}:${o.page}` : tier;
    record(results, series, history, o.smoke);
    report(history, series);
    return compare(history, series);
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
            baseline: { type: "string" },
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
    if (cmd === "guard") {
        if (!positionals[0]) throw new Error("guard <latency.jsonl> [--baseline <matrix.jsonl>]");
        const read = (f) =>
            readFileSync(f, "utf8")
                .split("\n")
                .filter(Boolean)
                .map((l) => JSON.parse(l));
        const { failing, known } = guardCells(read(resolve(o.baseline ?? MATRIX_FILE)), read(resolve(positionals[0])));
        for (const k of known) console.log(`known over 300 ms: ${k.cell}: ${fmt(k.before)} -> ${fmt(k.now)} ms`);
        for (const f of failing) console.log(`FAILS: ${f.cell}: ${fmt(f.before)} -> ${fmt(f.now)} ms (${f.why})`);
        console.log(`${failing.length} covered cells failed, ${known.length} known over 300 ms`);
        return failing.length ? 1 : 0;
    }
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
