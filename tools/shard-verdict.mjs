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
 * A run whose output is larger than LOG_BUDGET_BYTES fails too, naming its most repeated lines. A normal
 * shard writes at most about 3.5 MB (compact-mantine; most write under 200 KB, measured over every gate
 * log of 2026-10-15 to 2026-10-23); React's act() warning flood of tier 3 wrote 85 to 108 MB per graphty
 * shard (37k to 435k warnings), doubled the shards' time and failure rate, and passed every gate twice.
 * With the budget a flood fails the first run that has it, with the repeated warning named.
 *
 * Used by tools/run-tests.sh (the CLI below) and tools/prepush-tests.mjs (shardVerdict); the budget also by
 * tools/test-quarantine.mjs, the wrapper every shard runs through in CI and in the gate (overBudget).
 *
 * Usage: node tools/shard-verdict.mjs <shard> <exit-status> <log-file> <start-ms> [<command>]
 *   <command> replaces the shard's own (a run of selected test files); prints the cause and exits 1 when the run did not pass; exits with 0 when it did.
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

/** The most a passing shard's output may hold: about 3 times the largest normal shard's. */
export const LOG_BUDGET_BYTES = 12 * 1024 * 1024;

/**
 * The lines a log repeats most, for the cause of a run over the budget.
 * @param log a run's whole output
 * @param [top] how many to name
 * @returns "<count> x <line>" entries, most repeated first
 */
export function topRepeated(log, top = 5) {
    const counts = new Map();
    for (const raw of stripVTControlCharacters(log).split("\n")) {
        const line = raw.trim();
        if (line) counts.set(line, (counts.get(line) ?? 0) + 1);
    }
    return [...counts]
        .filter(([, n]) => n > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, top)
        .map(([line, n]) => `${n} x ${line.slice(0, 200)}`);
}

/**
 * Why a run's output is too large: over the budget, with its most repeated lines.
 * @param log the run's whole output
 * @param [logBudget] the most bytes it may hold
 * @returns the cause, or null when it is within the budget
 */
export function overBudget(log, logBudget = LOG_BUDGET_BYTES) {
    const bytes = Buffer.byteLength(log);
    if (bytes <= logBudget) return null;
    const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
    const top = topRepeated(log)
        .map((l) => `    ${l}`)
        .join("\n");
    return `its output is ${mb(bytes)}, over the ${mb(logBudget)} budget (a warning flood?); the most repeated lines:\n${top}`;
}

/**
 * The verdict on one shard run.
 * @param run the run
 * @param run.code the exit status (null for a signal)
 * @param run.log the run's whole output
 * @param run.runs how many vitest runs the command makes (expectedRuns)
 * @param run.missingReports the expected report files that are missing or older than the run
 * @param run.logBudget the most bytes the output may hold (LOG_BUDGET_BYTES)
 * @returns `{ pass: true }`, or `{ pass: false, cause }` naming why
 */
export function shardVerdict({ code, log, runs = 1, missingReports = [], logBudget = LOG_BUDGET_BYTES }) {
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
    const over = overBudget(log, logBudget);
    if (over) {
        return { pass: false, cause: `exit 0 but ${over}` };
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
    const [name, status, logFile, start, command] = process.argv.slice(2);
    const root = join(fileURLToPath(import.meta.url), "../..");
    const { SHARDS } = await import(pathToFileURL(join(root, "tools/ci-test-matrix.mjs")).href);
    const found = SHARDS.find((s) => s.shard === name);
    const shard = command ? { ...found, "test-command": command } : found;
    const v = checkShard(shard, Number(status), readFileSync(logFile, "utf8"), root, Number(start));
    if (!v.pass) {
        console.error(`tools/run-tests.sh: ${name} FAILED: ${v.cause}`);
        process.exit(1);
    }
}
