#!/usr/bin/env node
/**
 * load-time.mjs -- how long the graphty app and graphty-element take to load, recorded and judged (issue #8018).
 *
 * Two benchmarks write the numbers, each through writeLoadTimes() below:
 *   graphty/bench/load-time.bench.test.ts                 the built app's landing page: usable, the hero graph's first
 *                                                         frame, and its first settled frame (`graph-frame-stable`)
 *   graphty-element/test/load/load-time.bench.test.ts     `<graphty-element>` connected to its first frame and to its
 *                                                         first settled frame, on a fixed generated graph
 * Each writes benchmarks/out/load-time-<part>.json at the repository root: one session
 * `{ date, machine, sha?, results: [{ group, name, medianMs, minMs, samplesMs }] }`, the shape
 * tools/results/post-benchmarks.mjs reads, so the health dashboard keeps the series (source `graphty-load`).
 *
 *   node tools/load-time.mjs            judge the out files against benchmarks/results/load-time.json
 *   node tools/load-time.mjs --record   and then append them to it as a baseline session
 *
 * The rules are webgpu-graph-algorithms/scripts/bench-compare.js's, with this file's own constants:
 *   - a row is compared only with sessions of the same machine (the CPU model, as the dashboard keys it): GitHub's
 *     hosted runners land on CPU models about 2x apart, so a baseline from another CPU means nothing;
 *   - the baseline is the best median and the best minimum EVERY session of that machine has recorded for the row, so
 *     an appended slow session can never lower the bar it is judged by;
 *   - a REGRESSION needs the median AND the minimum above THRESHOLD x the baseline's, and both to have risen by at
 *     least FLOOR_MS: interference only ever slows a sample, so a minimum that held means the cost held;
 *   - no out file: nothing to compare, exit 0; no baseline for this machine: every row "new", exit 0.
 *
 * THRESHOLD and FLOOR_MS are derived in their comments below from the recorded sessions.
 * Re-pinning is by hand, as in bench-compare.js: delete the superseded sessions from the results file in a reviewed
 * commit that names the change that made the new cost correct. Never to quiet a red row.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const OUT_DIR = join(REPO, "benchmarks/out");
export const RESULTS_FILE = join(REPO, "benchmarks/results/load-time.json");

/**
 * The factor a median and a minimum must both exceed. Measured on the i9-14900KF under the load of other sessions'
 * test runs (2026-11-14): between the three baseline sessions of benchmarks/results/load-time.json the widest
 * move of a row was x1.10 on its median (element first frame, whose minimum held at x1.00), and the widest move in
 * both at once x1.04; between master and master one and three days earlier, interleaved 15-run medians moved at
 * most x1.05 in both. 1.2 stands clear of those, and catches a page that takes a fifth longer to show or to settle,
 * well short of a slowdown a reader notices by eye.
 */
export const THRESHOLD = 1.2;
/**
 * The rise in milliseconds a median and a minimum must both clear: below it a move is a frame or two of the renderer,
 * not a cost. Two 60 Hz frames.
 */
export const FLOOR_MS = 33;

/**
 * The machine a measurement ran on.
 * @returns the CPU model, as tools/results/client.mjs names it to the dashboard
 */
export const machine = () => cpus()[0]?.model.trim() ?? "unknown";

/**
 * One row from repeated samples.
 * @param group - the benchmark's group (`app`, `element`)
 * @param name - what was timed
 * @param samplesMs - one sample per run
 * @returns the row
 */
export function summarize(group, name, samplesMs) {
    const sorted = [...samplesMs].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    const medianMs = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const round = (v) => Math.round(v * 10) / 10;
    return { group, name, medianMs: round(medianMs), minMs: round(sorted[0]), samplesMs: samplesMs.map(round) };
}

/**
 * Write one benchmark's session to benchmarks/out/load-time-<part>.json, replacing the last one.
 * @param part - `app` or `element`
 * @param results - the rows
 * @returns the file written
 */
export function writeLoadTimes(part, results) {
    mkdirSync(OUT_DIR, { recursive: true });
    const file = join(OUT_DIR, `load-time-${part}.json`);
    const sha = process.env.GITHUB_SHA;
    const session = { date: new Date().toISOString(), machine: machine(), ...(sha ? { sha } : {}), results };
    writeFileSync(file, `${JSON.stringify(session, null, 1)}\n`);
    return file;
}

/**
 * The status of a row against its pinned baseline (bench-compare.js's rowStatus with this file's constants).
 * @param r - the current row
 * @param base - the pinned row
 * @returns the status
 */
export function rowStatus(r, base) {
    if (!base) return "new";
    if (r.medianMs <= THRESHOLD * base.medianMs) return "ok";
    if (r.minMs <= THRESHOLD * base.minMs) return "noisy";
    if (r.medianMs - base.medianMs < FLOOR_MS || r.minMs - base.minMs < FLOOR_MS) return "too small";
    return "REGRESSION";
}

/**
 * The best median and best minimum per row over every session of one machine.
 * @param sessions - the baseline sessions
 * @param on - the machine
 * @returns the pinned rows, by `group/name`
 */
export function pinned(sessions, on) {
    const rows = new Map();
    for (const s of sessions.filter((each) => each.machine === on))
        for (const r of s.results) {
            const key = `${r.group}/${r.name}`;
            const best = rows.get(key);
            rows.set(
                key,
                best
                    ? { medianMs: Math.min(best.medianMs, r.medianMs), minMs: Math.min(best.minMs, r.minMs) }
                    : { medianMs: r.medianMs, minMs: r.minMs },
            );
        }
    return rows;
}

/**
 * Judge sessions against the baseline file's sessions.
 * @param current - the out files' sessions
 * @param baseline - the results file's sessions
 * @returns a table and the count of regressions
 */
export function judge(current, baseline) {
    const lines = [];
    let regressions = 0;
    for (const s of current) {
        const base = pinned(baseline, s.machine);
        lines.push(`${s.machine}: ${base.size ? `baseline of ${base.size} rows` : "no baseline for this machine"}`);
        for (const r of s.results) {
            const b = base.get(`${r.group}/${r.name}`);
            const status = rowStatus(r, b);
            if (status === "REGRESSION") regressions++;
            const ratio = (now, then) => (then ? `x${(now / then).toFixed(2)}` : "");
            lines.push(
                [
                    status.padEnd(11),
                    `${r.group}/${r.name}`.padEnd(40),
                    `${r.medianMs.toFixed(0)} ms`.padStart(9),
                    (b ? `${b.medianMs.toFixed(0)} ms` : "-").padStart(9),
                    ratio(r.medianMs, b?.medianMs).padStart(7),
                    ratio(r.minMs, b?.minMs).padStart(7),
                ].join(" "),
            );
        }
    }
    return { lines, regressions };
}

function main(argv) {
    const files = existsSync(OUT_DIR)
        ? readdirSync(OUT_DIR)
              .filter((f) => /^load-time-.+\.json$/.test(f))
              .map((f) => join(OUT_DIR, f))
        : [];
    if (!files.length) {
        console.log("nothing to compare: no benchmarks/out/load-time-*.json (the load-time benchmarks wrote nothing)");
        return 0;
    }
    const current = files.map((f) => JSON.parse(readFileSync(f, "utf8")));
    const baseline = existsSync(RESULTS_FILE) ? JSON.parse(readFileSync(RESULTS_FILE, "utf8")) : [];
    const { lines, regressions } = judge(current, baseline);
    console.log(`status      row${" ".repeat(38)}median  baseline  median    min`);
    for (const l of lines) console.log(l);
    if (argv.includes("--record")) {
        writeFileSync(RESULTS_FILE, `${JSON.stringify([...baseline, ...current], null, 1)}\n`);
        console.log(`recorded ${current.length} session(s) in ${RESULTS_FILE}`);
    }
    if (regressions) {
        console.error(
            `\n${regressions} load-time regression(s): median and minimum both above x${THRESHOLD} and ${FLOOR_MS} ms over the baseline. ` +
                "Fix the slowdown, or have the owner accept it (tools/load-time.mjs says how to re-pin).",
        );
        return 1;
    }
    return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
