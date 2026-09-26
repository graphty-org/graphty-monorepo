#!/usr/bin/env node
/**
 * bench:append -- appends the LAST session of a benchmark out file to a checked-in baseline (contract 6.4; spec 11.7;
 * P8-T14 Step 3).
 *
 *   node scripts/bench-append-session.js <out file> <results file>
 *   pnpm run bench:append benchmarks/out/nvidia-lovelace-driver580.json benchmarks/results/nvidia-lovelace-driver580.json
 *
 * The out file is what `pnpm run bench` wrote on this runner (benchmarks/out/<class>.json, gitignored; the LAST
 * session is the run to keep). The results file is the class's baseline (benchmarks/results/<class>.json), a JSON
 * array of sessions ordered by date, which scripts/bench-compare.js reads as the PINNED best of every session per
 * row. The results file is created when it does not exist.
 *
 * Refused, with exit 1 and one sentence naming the reason:
 *   1. an out file with no session                -- nothing to append
 *   2. a session that ran on a software adapter    -- lavapipe / SwiftShader numbers are never a baseline (spec 11.7)
 *   3. a session missing any of REQUIRED_GROUPS    -- bench-compare compares the run under test against the best of
 *                                                     every session in the results file, so a baseline session that
 *                                                     lacks a group leaves that group's rows "new (no baseline)" and
 *                                                     UNGUARDED rather than red; run `pnpm run bench` with every group
 *   4. a session whose date is already in the file -- an accidental double append would count twice
 *
 * Why this is a committed script and not the scratch file of docs/decisions/G3.md and G4.md appendix A: those
 * appendices sent every later builder to a gitignored tmp/ directory to copy a procedure by hand, and the group list
 * inside it went stale twice (seven groups at G4, eight after attraction-scale, nine with bfs). The list lives here
 * once, and test/benchmarks.test.ts holds the script to it: every group is required, each missing one is named.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

/** Every group benchmarks/run.ts registers; a baseline session must carry all of them (refusal 3). */
const REQUIRED_GROUPS = [
    "upload",
    "roundtrip",
    "layout-exact",
    "pagerank",
    "wcc",
    "layout-fr",
    "layout-grid",
    "attraction-scale",
    "bfs",
];

/**
 * Applies the four refusals and appends.
 * @param {readonly string[]} argv - process.argv.slice(2): the out file and the results file
 * @returns {number} the exit code
 */
function main(argv) {
    const [outFile, resultsFile] = argv;
    if (outFile === undefined || resultsFile === undefined) {
        console.error("usage: node scripts/bench-append-session.js <out file> <results file>");
        return 1;
    }
    const out = JSON.parse(readFileSync(outFile, "utf8"));
    const sessions = Array.isArray(out) ? out.filter((s) => s !== null && typeof s === "object") : [];
    if (sessions.length === 0) {
        console.error(`refusing: ${outFile} holds no session`);
        return 1;
    }
    const last = sessions[sessions.length - 1];
    if (last.gpu?.software !== false) {
        console.error(
            `refusing: the session of ${String(last.date)} ran on a software adapter (${String(last.gpu?.description)}); a software session is never a baseline`,
        );
        return 1;
    }
    const groups = new Set(Array.isArray(last.results) ? last.results.map((r) => r.group) : []);
    for (const group of REQUIRED_GROUPS) {
        if (!groups.has(group)) {
            console.error(
                `refusing: the session of ${String(last.date)} lacks the ${group} group; run pnpm run bench with every group so the baseline stays complete`,
            );
            return 1;
        }
    }
    const baseline = existsSync(resultsFile) ? JSON.parse(readFileSync(resultsFile, "utf8")) : [];
    if (baseline.some((s) => s.date === last.date)) {
        console.error(`refusing: a session dated ${String(last.date)} is already in ${resultsFile}`);
        return 1;
    }
    baseline.push(last);
    baseline.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    writeFileSync(resultsFile, `${JSON.stringify(baseline, null, 4)}\n`);
    console.log(
        `appended the session of ${String(last.date)} (${String(last.runnerClass)}, ${String(last.gpu.description)}, ` +
            `${String(last.results.length)} results, groups ${[...groups].join(", ")}) to ${resultsFile}; ` +
            `${String(baseline.length)} sessions now`,
    );
    return 0;
}

try {
    process.exitCode = main(process.argv.slice(2));
} catch (error) {
    console.error(`[bench-append-session] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
}
