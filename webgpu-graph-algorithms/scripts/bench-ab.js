#!/usr/bin/env node
/**
 * bench:ab -- the paired benchmark of a pull request: the base commit against the candidate, on the same card, in
 * the same job, alternating.
 *
 * Why it exists: scripts/bench-compare.js compares a run against a baseline recorded on another day, on a card whose
 * SM clock drops to its idle state under sparse dispatches and drifts with temperature. Its thresholds (1.35x and
 * 2.5 ms) have to be that loose to stay quiet across that drift, so a 20-30 % slowdown passes, and a row under
 * 7.1 ms can more than double. Running both builds alternately removes the drift instead of tolerating it: whatever
 * the clock does to one round, it does to both builds of that round.
 *
 * What it does (run from webgpu-graph-algorithms, with the candidate already built):
 *   1. `git worktree add --detach` the base commit into a temporary directory, `pnpm install --frozen-lockfile` and
 *      build graph-format and this package there.
 *   2. For R rounds, run `benchmarks/run.ts --no-save --runs N --samples-out <file>` once per build, base first in
 *      even rounds and candidate first in odd ones (ABBA), so a drift that is linear in time cancels.
 *   3. Per row (group/name) and round, take the log of candidate minimum over base minimum (the minimum, because
 *      interference only ever makes a sample slower -- bench-compare.js's header has the argument). Report the
 *      geometric-mean ratio with a two-sided 95 % Student t interval over the rounds.
 *   4. A row is a REGRESSION when the LOWER bound of that interval is above the threshold (default 1.08): the data
 *      say, with 97.5 % confidence, that the candidate is at least 8 % slower. A row on one side only is "new" or
 *      "removed" and never fails. Any regression exits 1.
 *
 * Why 1.08: the interval already absorbs the noise that is left after pairing, so the threshold only has to cover what
 * pairing cannot see (a difference in memory layout or JIT state between two processes of the same code). The issue
 * that asked for this mode set the target at a 15 % slowdown; 1.08 sits halfway between no change and that.
 * test/bench-ab.test.ts proves on synthetic sub-millisecond samples with shared drift and idle-clock outliers that a
 * 15 % slowdown is flagged and an identical build passes.
 *
 * Usage:
 *   pnpm run bench:ab --base <rev> [--rounds 4] [--runs 5] [--threshold 1.08] [group ...]
 * With no groups every group runs. The base worktree is removed at the end, whatever happened.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The lower-bound factor above which a row is a regression (see the header). */
export const DEFAULT_THRESHOLD = 1.08;

/** Two-sided 95 % Student t quantiles (0.975) for 1..30 degrees of freedom; beyond 30 the normal 1.96. */
const T975 = [
    12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11,
    2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
];

/**
 * Compares the rounds of a paired run, row by row.
 * @param {readonly import("./bench-ab.js").AbRound[]} rounds - the samples of every round
 * @param {{ threshold?: number }} [options] - threshold: the lower-bound factor of a regression
 * @returns {import("./bench-ab.js").AbRow[]} one row per group/name, base order first, then rows new in the candidate
 */
export function compareRounds(rounds, options = {}) {
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;
    /** @type {Map<string, { base: number[], candidate: number[] }>} the per-round minimum of each row, per side */
    const rows = new Map();
    for (const round of rounds) {
        for (const side of /** @type {const} */ (["base", "candidate"])) {
            for (const row of round[side]) {
                const key = `${row.group}/${row.name}`;
                const entry = rows.get(key) ?? { base: [], candidate: [] };
                entry[side].push(Math.min(...row.samples));
                rows.set(key, entry);
            }
        }
    }
    const out = [];
    for (const [key, { base, candidate }] of rows) {
        if (candidate.length === 0 || base.length === 0) {
            out.push({ key, status: candidate.length === 0 ? "removed" : "new", ratio: NaN, low: NaN, high: NaN });
            continue;
        }
        const n = Math.min(base.length, candidate.length);
        const logs = Array.from({ length: n }, (_, i) => Math.log(candidate[i] / base[i]));
        const mean = logs.reduce((a, b) => a + b, 0) / n;
        if (n < 2) {
            out.push({ key, status: "too few rounds", ratio: Math.exp(mean), low: NaN, high: NaN });
            continue;
        }
        const variance = logs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
        const half = (T975[n - 2] ?? 1.96) * Math.sqrt(variance / n);
        const low = Math.exp(mean - half);
        out.push({
            key,
            status: low > threshold ? "REGRESSION" : "ok",
            ratio: Math.exp(mean),
            low,
            high: Math.exp(mean + half),
        });
    }
    return out;
}

/**
 * Runs a command and throws when it fails.
 * @param {string} cmd - the program
 * @param {readonly string[]} args - its arguments
 * @param {string} cwd - where to run it
 */
function run(cmd, args, cwd) {
    console.log(`\n$ (${cwd}) ${cmd} ${args.join(" ")}`);
    const result = spawnSync(cmd, args, { cwd, stdio: "inherit", env: { ...process.env, HUSKY: "0" } });
    if (result.status !== 0) {
        throw new Error(`${cmd} ${args.join(" ")} exited ${String(result.status ?? result.signal)}`);
    }
}

/**
 * Parses the command line.
 * @param {readonly string[]} argv - process.argv.slice(2)
 * @returns {{ base: string, rounds: number, runs: number, threshold: number, groups: string[] }} the options
 */
function parseArgs(argv) {
    const opts = { base: "", rounds: 4, runs: 5, threshold: DEFAULT_THRESHOLD, groups: /** @type {string[]} */ ([]) };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const value = argv[i + 1];
        if (a === "--") {
            continue;
        } else if (a === "--base") {
            opts.base = value ?? "";
            i += 1;
        } else if (a === "--rounds" || a === "--runs" || a === "--threshold") {
            const n = Number(value);
            if (!(n > 0) || (a !== "--threshold" && !Number.isInteger(n))) {
                throw new Error(`${a} expects a positive number, got ${String(value)}`);
            }
            opts[/** @type {"rounds" | "runs" | "threshold"} */ (a.slice(2))] = n;
            i += 1;
        } else if (a.startsWith("--")) {
            throw new Error(`unknown option ${a}; known: --base REV --rounds N --runs N --threshold F`);
        } else {
            opts.groups.push(a);
        }
    }
    if (opts.base === "") {
        throw new Error("--base <rev> is required");
    }
    if (opts.rounds < 2) {
        throw new Error("--rounds must be at least 2: one round has no interval");
    }
    return opts;
}

/**
 * Runs the paired benchmark and prints the table.
 * @param {readonly string[]} argv - process.argv.slice(2)
 * @returns {number} the exit code
 */
function main(argv) {
    const opts = parseArgs(argv);
    const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const git = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: packageDir, encoding: "utf8" });
    const repo = git.stdout.trim();
    const scratch = mkdtempSync(join(tmpdir(), "bench-ab-"));
    const baseRepo = join(scratch, "base");
    try {
        run("git", ["worktree", "add", "--detach", baseRepo, opts.base], repo);
        run("pnpm", ["install", "--frozen-lockfile"], baseRepo);
        run(
            "pnpm",
            ["exec", "nx", "run-many", "-t", "build", "--projects=graph-format,webgpu-graph-algorithms"],
            baseRepo,
        );
        const sides = { base: join(baseRepo, relative(repo, packageDir)), candidate: packageDir };
        const rounds = [];
        for (let r = 0; r < opts.rounds; r++) {
            const order = r % 2 === 0 ? ["base", "candidate"] : ["candidate", "base"];
            /** @type {Record<string, import("./bench-ab.js").AbSample[]>} */
            const round = {};
            for (const side of order) {
                const file = join(scratch, `${side}-${String(r)}.json`);
                const args = ["exec", "tsx", "benchmarks/run.ts", "--no-save", "--runs", String(opts.runs)];
                run("pnpm", [...args, "--samples-out", file, ...opts.groups], sides[/** @type {"base"} */ (side)]);
                if (!existsSync(file)) {
                    throw new Error(
                        `round ${String(r)} ${side}: no samples written (a software adapter times nothing)`,
                    );
                }
                round[side] = JSON.parse(readFileSync(file, "utf8"));
            }
            rounds.push({ base: round.base, candidate: round.candidate });
        }
        const rows = compareRounds(rounds, { threshold: opts.threshold });
        const width = Math.max(3, ...rows.map((r) => r.key.length));
        const f = (/** @type {number} */ x) => (Number.isNaN(x) ? "-" : `x${x.toFixed(3)}`).padStart(8);
        console.log(
            `\nbase ${opts.base}, ${String(opts.rounds)} ABBA rounds of ${String(opts.runs)} runs, flag above x${String(opts.threshold)}`,
        );
        console.log(
            `${"row".padEnd(width)}  ${"ratio".padStart(8)}  ${"95% low".padStart(8)}  ${"95% high".padStart(8)}  status`,
        );
        for (const row of rows) {
            console.log(`${row.key.padEnd(width)}  ${f(row.ratio)}  ${f(row.low)}  ${f(row.high)}  ${row.status}`);
        }
        return rows.some((r) => r.status === "REGRESSION") ? 1 : 0;
    } finally {
        spawnSync("git", ["worktree", "remove", "--force", baseRepo], { cwd: repo, stdio: "inherit" });
        rmSync(scratch, { recursive: true, force: true });
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    try {
        process.exitCode = main(process.argv.slice(2));
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}
