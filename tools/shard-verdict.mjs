#!/usr/bin/env node
/**
 * shard-verdict.mjs -- whether a test shard's run really passed, from its exit status AND its output.
 *
 * An exit status of 0 alone is not trusted. On a machine whose global pnpm is older than 10.29.1, every
 * `pnpm exec` in this repository goes through pnpm's version switch (the repository pins a newer pnpm),
 * and that switch exits 0 when the pnpm it started dies by any signal -- a hang killed by `timeout`, the
 * OOM killer, a SIGTERM (issue #2116). So a shard passes only when it exited 0, its output holds a vitest
 * run summary (the "Test Files" line) for each vitest run its command makes, and every report file its
 * command asks vitest to write was written during the run.
 *
 * Used by tools/run-tests.sh (the CLI below) and tools/prepush-tests.mjs (shardVerdict).
 *
 * Usage: node tools/shard-verdict.mjs <shard> <exit-status> <log-file> <start-ms>
 *   prints the cause and exits 1 when the run did not pass; exits with 0 when it did.
 */

import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";

/**
 * How many vitest runs a shard command makes, each of which prints one summary. Every command in
 * tools/ci-test-matrix.mjs makes one, through nx, a wrapper script or directly, except the Cytoscape
 * versions script, which runs the suite once per version named after it.
 * @param command a shard's test-command
 * @returns the number of "Test Files" summary lines a passing run prints
 */
export function expectedRuns(command) {
    const versions = /test-cytoscape-versions\.sh((?:\s+[^\s&|;]+)*)/.exec(command);
    return versions ? versions[1].trim().split(/\s+/).filter(Boolean).length : 1;
}

/**
 * The report files a shard command asks vitest to write itself: the blob report of a command that
 * passes --reporter=blob (graphty-element's shards), at vitest's default path. Reports a wrapper
 * script writes and checks (webgpu-graph-algorithms' browser-results.json) are that script's.
 * @param command a shard's test-command
 * @returns repo-relative paths
 */
export function expectedReports(command) {
    if (!/--reporter=blob\b/.test(command)) {
        return [];
    }
    const dir = /^cd (\S+) && /.exec(command)?.[1] ?? ".";
    const shard = /--shard=(\d+)\/(\d+)/.exec(command);
    return [join(dir, ".vitest-reports", shard ? `blob-${shard[1]}-${shard[2]}.json` : "blob.json")];
}

/**
 * The verdict on one shard run.
 * @param run the run
 * @param run.code the exit status (null for a signal)
 * @param run.log the run's whole output
 * @param run.runs how many vitest runs the command makes (expectedRuns)
 * @param run.missingReports the expected report files that are missing or older than the run
 * @returns `{ pass: true }`, or `{ pass: false, cause }` naming why
 */
export function shardVerdict({ code, log, runs = 1, missingReports = [] }) {
    if (code !== 0) {
        return { pass: false, cause: `exit ${code}` };
    }
    const summaries = stripVTControlCharacters(log)
        .split("\n")
        .filter((line) => /^\s*Test Files\s.*\(\d+\)\s*$/.test(line)).length;
    if (summaries < runs) {
        return {
            pass: false,
            cause: `exit 0 but ${summaries} of ${runs} vitest run summaries ("Test Files" line) in its output: the run was cut short (a killed or hung vitest under a pnpm that reports a signal as exit 0)`,
        };
    }
    if (missingReports.length > 0) {
        return {
            pass: false,
            cause: `exit 0 but no report written by this run: ${missingReports.join(", ")}`,
        };
    }
    return { pass: true };
}

/**
 * shardVerdict for a SHARDS entry run from `root`, checking its report files on disk.
 * @param shard a SHARDS entry
 * @param code the exit status
 * @param log the run's whole output
 * @param root the checkout
 * @param startMs when the run started (a report older than this is a previous run's)
 * @returns as shardVerdict
 */
export function checkShard(shard, code, log, root, startMs) {
    const command = shard["test-command"];
    const missingReports = expectedReports(command).filter((f) => {
        const p = join(root, f);
        return !existsSync(p) || statSync(p).mtimeMs < startMs;
    });
    return shardVerdict({ code, log, runs: expectedRuns(command), missingReports });
}

// Run only as the entry point, not when imported.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [name, status, logFile, start] = process.argv.slice(2);
    const root = join(fileURLToPath(import.meta.url), "../..");
    const { SHARDS } = await import(pathToFileURL(join(root, "tools/ci-test-matrix.mjs")).href);
    const shard = SHARDS.find((s) => s.shard === name);
    const v = checkShard(shard, Number(status), readFileSync(logFile, "utf8"), root, Number(start));
    if (!v.pass) {
        console.error(`tools/run-tests.sh: ${name} FAILED: ${v.cause}`);
        process.exit(1);
    }
}
