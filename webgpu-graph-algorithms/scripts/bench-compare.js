#!/usr/bin/env node
/**
 * bench:compare -- the benchmark regression check of the GPU lane (spec 10.4 T-13, 11.7; contract 6.8).
 *
 * Reads three files relative to the current directory (the package root under `pnpm run bench:compare`; gpu.yml runs
 * it with working-directory webgpu-graph-algorithms):
 *   gpu-report.json                  written by `node scripts/gpu-report.js > gpu-report.json` (6.6): the runner class
 *                                    (computed through scripts/runner-class.js, the ONE copy of the rule, so it names the
 *                                    same file the harness wrote) and the 10-second nvidia-smi sample
 *   benchmarks/out/<class>.json      the sessions `pnpm run bench` appended on this runner (the LAST is the run under test)
 *   benchmarks/results/<class>.json  the checked-in baseline of the class: the PINNED baseline is the best median and the
 *                                    best minimum EVERY session of that file has ever recorded for a row, not the last
 *                                    session's
 *
 * Rules, applied in this order:
 *   1. no gpu-report.json, or no out file for the class          -> "nothing to compare", exit 0
 *   2. nvidiaSmi.available and (maxUtilization > 10 or memory     -> "SKIPPED: GPU not quiet", exit 0 (T-13: the card may be
 *      in use by other processes > 0) during the sample              an interactive dev GPU; busy medians mean nothing)
 *   3. no baseline file                                           -> every result printed as "new (no baseline)", exit 0
 *   4. every result present in both (matched by group + name): a REGRESSION needs BOTH medianMs > threshold x the
 *      baseline median AND minMs > threshold x the baseline min. Any regression -> the table and exit 1, else the
 *      table and exit 0. Rows without a baseline are "new"; a row whose median rose while its floor held is "noisy".
 *
 * Why the baseline is the file's best and not its last session (2026-09-22): PageRank on the Tesla T4 went from a
 * 46.482 ms median at 100k/1M to 90.080 ms and the gate stayed green, twice over. The comparison read the LAST
 * session, and the regressed run had already been appended to benchmarks/results/gpu-linux-t4.json -- so the
 * regression was its own baseline. Taking the best of every session instead means an appended session can never
 * bless a slowdown: a slower number cannot lower a floor. It is the same argument the minimum rule below rests on,
 * applied across sessions instead of within one. Measured on that file (four sessions, 2026-09-18 .. 2026-09-22):
 * against the best of the sessions before it, the regressed session's two PageRank rows stand at x1.98 / x1.97 and
 * x1.62 / x1.61 (median / minimum), while no other row of it stands above x1.10 median or x1.12 minimum.
 *
 * Why the threshold is 1.35 and not a rounder number: a row fails only when its median AND its minimum both stand
 * above the factor, so the number to clear is the widest move a healthy row has made in BOTH at once. Measured over
 * the whole file against the same pinned baseline the gate uses, and with the sub-millisecond roundtrip row named
 * below set aside, that is x1.117 -- `roundtrip/degree + 400 KB readback at 100k` on 2026-09-21, x1.149 median and
 * x1.117 minimum -- followed by x1.095 median / x1.112 minimum (`layout-exact/step(1) wall n=4096`, a row of the
 * regressed session itself). The smaller of the two real regressions is x1.618 median / x1.614 minimum
 * (`pagerank/pagerank 100 iterations at 1M/10M`). The geometric mean of x1.117 and x1.614 is 1.343, and the
 * constant is that rounded to 1.35: it stands x1.21 above the widest innocent move and x1.20 below the smallest
 * regression this file has recorded, and nothing in the file lies between the two numbers. At 3x both PageRank
 * rows read `ok`; at 1.35 both read REGRESSION.
 *
 * WHAT IT COSTS. 1.35 is close enough to the runner's own spread that a shared card will trip it. One row in this
 * file already would: `roundtrip/empty submit + 4-byte readU32 round trip` on 2026-09-20 reported a median of
 * 1.296 ms and a floor of 0.269 ms against the session before it (x7.56 and x1.88) -- an absolute floor move of
 * 0.126 ms on a sub-millisecond row. The minimum rule below cannot save it at this threshold, and no threshold
 * that catches x1.61 could. That row is the first thing to check when the gate goes red: its usual cause is the
 * NVIDIA SM clock sitting at its 210 MHz idle state under sparse sub-millisecond dispatches (finding G3-F1), not
 * the code. `nvidia-smi --query-gpu=clocks.sm,pstate` while the bench runs says which it was.
 *
 * RE-PINNING IS NO LONGER AUTOMATIC, and that is the point. Running `pnpm run bench` again and appending the
 * session no longer moves the baseline: the file keeps the best numbers it has ever held. When a row is
 * legitimately slower for good -- a deliberate trade, a new runner image, a driver change -- a person must DELETE
 * from benchmarks/results/<class>.json the sessions that hold the superseded faster numbers, in a reviewed commit
 * that says which change made the new cost correct. Deleting a session to quiet a red row is the failure this
 * rule exists to stop; re-measure on a quiet card first (append procedure: docs/decisions/G3.md appendix A). Some
 * sessions of benchmarks/results/gpu-linux-t4.json are NOT free to delete: the Tesla T4 run of 2026-09-22 and the
 * ones before it are the fixture test/benchmarks.test.ts compares to prove this gate still catches the PageRank
 * regression, and it names them by date. Deleting them is deleting that proof.
 *
 * Why the minimum has to confirm the median (2026-09-19): interference -- another process, a driver hiccup, a clock
 * drop -- can only make a sample SLOWER, never faster. The fastest of the runs is therefore the one estimator of the
 * true cost that interference cannot inflate: if the floor has not moved, the code's cost has not moved. With `runs`
 * at 5 the median of a sub-millisecond row is dragged by three unlucky samples, and that is what run 35414639899 hit:
 * roundtrip/empty submit + 4-byte readU32 round trip reported a median of 1.344 ms against a 0.171 ms baseline
 * (x7.84) while its own minimum was 0.169 ms -- the floor was intact, and the commit under test changed no GPU code.
 * A real regression raises the floor with the median, so it still fails. A row whose minMs is missing on either side
 * (a baseline written before the field existed) falls back to the median alone.
 *
 * "Memory in use by other processes" is maxMemoryUsedMiB minus the report's own footprint estimate, which is the sample's
 * MINIMUM memoryUsedMiB: the report process holds one device for the whole sample, so its footprint is the floor of the
 * series; a quiet card with a resident desktop compositor has a flat series (max - min = 0) and passes, while a process
 * that allocates during the sample lifts the maximum above the minimum and skips the comparison.
 *
 * Options: --threshold <factor> (default 1.35), --class <name> (overrides the report's runnerClass). Rows are matched by
 * `group/name`; a group name never contains a slash, so the key is unambiguous even when a benchmark name does.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** The regression factor of rule 4, derived from benchmarks/results/gpu-linux-t4.json (see the header). */
const DEFAULT_THRESHOLD = 1.35;

/**
 * Parses --threshold N and --class NAME.
 * @param {readonly string[]} argv - process.argv.slice(2)
 * @returns {{ threshold: number, cls: string | null }} the options
 */
function parseArgs(argv) {
    let threshold = DEFAULT_THRESHOLD;
    let cls = null;
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--threshold") {
            threshold = Number(argv[i + 1]);
            if (!Number.isFinite(threshold) || threshold <= 0) {
                throw new Error(`--threshold expects a positive number, got ${String(argv[i + 1])}`);
            }
            i += 1;
        } else if (a === "--class") {
            cls = argv[i + 1];
            if (cls === undefined || cls === "") {
                throw new Error("--class expects a runner class name");
            }
            i += 1;
        } else {
            throw new Error(`unknown option ${a}; known: --threshold N --class NAME`);
        }
    }
    return { threshold, cls };
}

/**
 * Reads the sessions of a sessions file.
 * @param {string} file - the path
 * @returns {readonly { results: readonly { group: string, name: string, medianMs: number, minMs?: number }[] }[]} the sessions, [] when the file is absent or holds none
 */
function sessionsOf(file) {
    if (!existsSync(file)) {
        return [];
    }
    const sessions = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(sessions)) {
        return [];
    }
    return sessions.filter((s) => s !== null && typeof s === "object" && Array.isArray(s.results));
}

/**
 * The last session of a sessions file -- the run under test.
 * @param {string} file - the path
 * @returns {{ results: readonly { group: string, name: string, medianMs: number, minMs?: number }[] } | null} the last session
 */
function lastSession(file) {
    const sessions = sessionsOf(file);
    return sessions.length === 0 ? null : sessions[sessions.length - 1];
}

/**
 * The PINNED baseline: the best median and the best minimum every session of the file has recorded for each row.
 * A session appended after a regression cannot raise it, because a slower number never wins a minimum.
 * @param {string} file - the path
 * @returns {{ rows: Map<string, { medianMs: number, minMs: number | undefined }>, sessions: number } | null} the baseline, or null when the file is absent or holds no session
 */
function pinnedBaseline(file) {
    const sessions = sessionsOf(file);
    if (sessions.length === 0) {
        return null;
    }
    const rows = new Map();
    for (const s of sessions) {
        for (const r of s.results) {
            const key = `${r.group}/${r.name}`;
            const best = rows.get(key);
            const min = typeof r.minMs === "number" ? r.minMs : undefined;
            if (best === undefined) {
                rows.set(key, { medianMs: r.medianMs, minMs: min });
                continue;
            }
            if (r.medianMs < best.medianMs) {
                best.medianMs = r.medianMs;
            }
            if (min !== undefined && (best.minMs === undefined || min < best.minMs)) {
                best.minMs = min;
            }
        }
    }
    return { rows, sessions: sessions.length };
}

/**
 * Whether the nvidia-smi sample shows another user of the card (rule 2).
 * @param {{ available: boolean, samples: readonly { utilizationGpu: number, memoryUsedMiB: number }[], maxUtilization: number, maxMemoryUsedMiB: number } | undefined} smi - the report's nvidiaSmi field
 * @returns {string | null} the reason the GPU is not quiet, or null when it is
 */
function notQuiet(smi) {
    if (
        smi === undefined ||
        smi === null ||
        !smi.available ||
        !Array.isArray(smi.samples) ||
        smi.samples.length === 0
    ) {
        return null;
    }
    if (smi.maxUtilization > 10) {
        return `utilisation ${String(smi.maxUtilization)}% > 10% during the sample`;
    }
    const minMemory = Math.min(...smi.samples.map((s) => s.memoryUsedMiB));
    const others = smi.maxMemoryUsedMiB - minMemory;
    if (others > 0) {
        return `memory in use by other processes: ${String(others)} MiB above the report's own ${String(minMemory)} MiB floor`;
    }
    return null;
}

/**
 * Formats one table row. The min ratio is the column that decides a REGRESSION from a noisy median.
 * @param {string} status - REGRESSION / noisy / ok / new (no baseline)
 * @param {{ group: string, name: string, medianMs: number, minMs?: number }} r - the current result
 * @param {{ medianMs: number, minMs?: number } | null} baseline - the baseline row, or null
 * @returns {string} the row
 */
function row(status, r, baseline) {
    const ratio =
        baseline === null || baseline.medianMs === 0 ? "" : `x${(r.medianMs / baseline.medianMs).toFixed(2)}`;
    const base = baseline === null ? "-" : `${baseline.medianMs.toFixed(3)} ms`;
    const minRatio =
        baseline === null ||
        typeof baseline.minMs !== "number" ||
        baseline.minMs === 0 ||
        typeof r.minMs !== "number"
            ? ""
            : `x${(r.minMs / baseline.minMs).toFixed(2)}`;
    return `${status.padEnd(18)} ${`${r.group}/${r.name}`.padEnd(70)} ${`${r.medianMs.toFixed(3)} ms`.padStart(14)} ${base.padStart(14)} ${ratio.padStart(8)} ${minRatio.padStart(10)}`;
}

/**
 * Applies the four rules.
 * @returns {number} the exit code
 */
function main() {
    const { threshold, cls: clsOverride } = parseArgs(process.argv.slice(2));
    const reportFile = resolve("gpu-report.json");
    if (!existsSync(reportFile)) {
        console.log("nothing to compare: no gpu-report.json in the current directory");
        return 0;
    }
    const report = JSON.parse(readFileSync(reportFile, "utf8"));
    const cls = clsOverride ?? report.runnerClass;
    if (typeof cls !== "string" || cls === "") {
        console.log("nothing to compare: gpu-report.json carries no runnerClass and --class was not given");
        return 0;
    }
    const current = lastSession(resolve("benchmarks/out", `${cls}.json`));
    if (current === null) {
        console.log(`nothing to compare: no benchmarks/out/${cls}.json (the bench step wrote nothing)`);
        return 0;
    }
    const reason = notQuiet(report.nvidiaSmi);
    if (reason !== null) {
        console.log(`SKIPPED: GPU not quiet (${reason}); the medians of this run are not compared (T-13)`);
        return 0;
    }
    const baseline = pinnedBaseline(resolve("benchmarks/results", `${cls}.json`));
    if (baseline !== null) {
        console.log(
            `baseline: the best of ${String(baseline.sessions)} session(s) of benchmarks/results/${cls}.json; threshold x${String(threshold)}`,
        );
    }
    console.log(
        `${"status".padEnd(18)} ${"benchmark".padEnd(70)} ${"median".padStart(14)} ${"baseline".padStart(14)} ${"ratio".padStart(8)} ${"min ratio".padStart(10)}`,
    );
    if (baseline === null) {
        for (const r of current.results) {
            console.log(row("new (no baseline)", r, null));
        }
        console.log(`no baseline benchmarks/results/${cls}.json: every result is new`);
        return 0;
    }
    let regressions = 0;
    let noisy = 0;
    for (const r of current.results) {
        const base = baseline.rows.get(`${r.group}/${r.name}`);
        if (base === undefined) {
            console.log(row("new (no baseline)", r, null));
            continue;
        }
        if (r.medianMs <= threshold * base.medianMs) {
            console.log(row("ok", r, base));
            continue;
        }
        // The median rose. The floor decides: interference inflates a median, it cannot lower a minimum.
        if (typeof r.minMs === "number" && typeof base.minMs === "number" && r.minMs <= threshold * base.minMs) {
            noisy += 1;
            console.log(row("noisy", r, base));
            continue;
        }
        regressions += 1;
        console.log(row("REGRESSION", r, base));
    }
    if (regressions > 0) {
        console.log(
            `${String(regressions)} regression(s): a median AND a minimum above ${String(threshold)}x the best of the ${String(baseline.sessions)} session(s) of class ${cls}`,
        );
        return 1;
    }
    if (noisy > 0) {
        console.log(
            `${String(noisy)} noisy row(s): the median rose above ${String(threshold)}x but the minimum did not, so the cost floor is intact (not a regression)`,
        );
    }
    console.log(`no regression above ${String(threshold)}x the best baseline of class ${cls}`);
    return 0;
}

try {
    process.exitCode = main();
} catch (error) {
    console.error(`[bench-compare] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
}
