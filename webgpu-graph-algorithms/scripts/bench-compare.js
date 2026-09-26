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
 *      baseline median AND minMs > threshold x the baseline min, and BOTH of those rises to be at least FLOOR_MS
 *      milliseconds -- a move large in proportion on a measurement large enough to trust. Any regression -> the
 *      table and exit 1, else the table and exit 0. Rows without a baseline are "new"; a row whose median rose
 *      while its floor held is "noisy"; a row above the factor that rose by less than FLOOR_MS is "too small".
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
 * Why a rise must also clear 2.5 milliseconds (2026-09-23): the first run under the 1.35 threshold, GPU lane run
 * 35828560733 on the Tesla T4, failed the build on `layout-exact/ms/iteration (profiler) n=1024 [1k]` -- 0.424 ms
 * against a pinned 0.293, x1.45 on the median AND x1.45 on the minimum, so the noisy-median rule below could not
 * save it. Its neighbouring wall row at the same size moved x1.21 and every larger rung of that ladder moved
 * between x1.00 and x1.09: the move is a tenth of a millisecond on the smallest rung of the ladder, which is what
 * NVIDIA's power management costs when it drops the SM clock to its 210 MHz idle state under sparse
 * sub-millisecond dispatches (finding G3-F1; the group's warm-up burst is the countermeasure and it does not
 * always hold). The constant comes from the same two files the threshold came from --
 * benchmarks/results/gpu-linux-t4.json and benchmarks/results/nvidia-lovelace-driver580.json, ten sessions and 260
 * comparable rows, each session measured against the pinned best of the sessions before it, plus the run above.
 * Among rows whose baseline is under a millisecond, the widest rise a healthy row has made in the median AND the
 * minimum at once is 0.141 ms (`layout-exact/step(1) wall n=1024`, the row beside the one that failed), then
 * 0.131 ms (the row that failed) and 0.126 ms (`roundtrip/empty submit + 4-byte readU32 round trip` on
 * 2026-09-20, x7.56 median over a floor that moved 0.126). The smallest real regression either file holds rose
 * 43.415 ms in both (`pagerank/pagerank 100 iterations at 100k/1M`); the other rose 669.142 ms. The geometric
 * mean of 0.141 and 43.415 is 2.47, and the constant is that rounded to 2.5: x17 above the widest innocent rise
 * and x17 below the smallest recorded regression, with nothing in either file between the two numbers.
 *
 * WHAT IT COSTS. The floor decides nothing on a row whose baseline is above 7.1 ms (2.5 / 0.35): there 1.35x is
 * already worth more than 2.5 ms and the factor fails the row on its own. Below 7.1 ms the floor is what decides,
 * and such a row can more than double in silence: 38 of the 60 rows of the Tesla T4 lane's own baseline sit under
 * that line, among them both roundtrip rows and every rung of the exact ladder but 65k. That is deliberate, because
 * on this hardware a sub-millisecond row cannot be measured to better than the tenth of a millisecond the clock drop
 * moves it; the cost is that a slowdown confined to the small rungs has to be caught by the larger rungs of the same
 * ladder, which run the same kernels. When the gate does go red on a small row, the first thing to check is still the clock rather
 * than the code: `nvidia-smi --query-gpu=clocks.sm,pstate` while the bench runs says which it was.
 *
 * RE-PINNING IS NO LONGER AUTOMATIC, and that is the point. Running `pnpm run bench` again and appending the
 * session no longer moves the baseline: the file keeps the best numbers it has ever held. When a row is
 * legitimately slower for good -- a deliberate trade, a new runner image, a driver change -- a person must DELETE
 * from benchmarks/results/<class>.json the sessions that hold the superseded faster numbers, in a reviewed commit
 * that says which change made the new cost correct. Deleting a session to quiet a red row is the failure this
 * rule exists to stop; re-measure on a quiet card first (append procedure: `pnpm run bench:append <out file>
 * <results file>`, scripts/bench-append-session.js, which refuses a software session, a session missing a group and
 * a date already in the file; docs/decisions/G3.md and G4.md appendix A are the history of that script). Some
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
 * The absolute floor of rule 4 in milliseconds: below this a rise is not measurable on the GPU lane's card, whatever
 * its proportion. Derived from the two checked-in results files (see the header).
 */
const FLOOR_MS = 2.5;

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
 * Whether a row that stands above the factor also rose by enough milliseconds to be worth believing (rule 4).
 * Both the median and the minimum must have risen by at least the floor; a baseline without a minimum falls back
 * to the median alone, as the factor rule does.
 * @param {{ medianMs: number, minMs?: number }} r - the current result
 * @param {{ medianMs: number, minMs?: number }} baseline - the baseline row
 * @param {number} floorMs - the floor in milliseconds
 * @returns {boolean} true when the rise clears the floor
 */
function roseEnough(r, baseline, floorMs) {
    if (r.medianMs - baseline.medianMs < floorMs) {
        return false;
    }
    if (typeof r.minMs !== "number" || typeof baseline.minMs !== "number") {
        return true;
    }
    return r.minMs - baseline.minMs >= floorMs;
}

/**
 * Formats one table row. The min ratio is the column that decides a REGRESSION from a noisy median.
 * @param {string} status - REGRESSION / noisy / too small / ok / new (no baseline)
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
    let tooSmall = 0;
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
        // Both stand above the factor. On a sub-millisecond row that can still be a tenth of a millisecond of
        // clock drop, so the rise must also be large enough to measure.
        if (!roseEnough(r, base, FLOOR_MS)) {
            tooSmall += 1;
            console.log(row("too small", r, base));
            continue;
        }
        regressions += 1;
        console.log(row("REGRESSION", r, base));
    }
    if (regressions > 0) {
        console.log(
            `${String(regressions)} regression(s): a median AND a minimum above ${String(threshold)}x the best of the ${String(baseline.sessions)} session(s) of class ${cls}, by at least ${String(FLOOR_MS)} ms`,
        );
        return 1;
    }
    if (tooSmall > 0) {
        console.log(
            `${String(tooSmall)} row(s) above ${String(threshold)}x that rose by less than ${String(FLOOR_MS)} ms: too small to measure on this card, so not a regression`,
        );
    }
    if (noisy > 0) {
        console.log(
            `${String(noisy)} noisy row(s): the median rose above ${String(threshold)}x but the minimum did not, so the cost floor is intact (not a regression)`,
        );
    }
    console.log(
        `no regression above ${String(threshold)}x and ${String(FLOOR_MS)} ms over the best baseline of class ${cls}`,
    );
    return 0;
}

try {
    process.exitCode = main();
} catch (error) {
    console.error(`[bench-compare] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
}
