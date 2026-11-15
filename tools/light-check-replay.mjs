#!/usr/bin/env node
/**
 * light-check-replay.mjs -- the light-check budgets of ci-budgets.json, measured by replaying the gate's
 * advisory selection records (tmp/test-select/advisory.jsonl) through the light check's bin packing
 * (packBins() in tools/test-select.mjs; design/ci/channels-pipeline/merging.md sections 4.1 and 4.2).
 *
 * Each record is one change. Its selected test files, grouped by shard family, are packed into bins of at
 * most BIN_LIMIT_MS (4 minutes); the bins run in parallel, so the change's test time is its longest bin, and its run time
 * that plus the setup before the tests (checkout and install, the plan, Build). Each record gets the budget
 * key its pull request would have:
 *   run:ci.yml:pr-wide     a global input changed, or graphty-element's source did (another package's shard is
 *                          selected because of it, whole or file by file)
 *   run:ci.yml:pr-<pkg>    a package not yet on test-select-rules.json "fileLevel" runs whole shards
 *                          (the one with the longest bin)
 *   run:ci.yml:pr          everything else
 * and the table gives each key's p50 and p90 run time.
 *
 * Per-file durations: the test ledger (tools/test-ledger.mjs), the median of each file's last 5 runs per
 * family, or --durations <file.json> (`{ "<family>": { "<file>": ms } }`, for the results store's export).
 * The ledger's ms is the sum of a file's test case times, without its import, setup and environment time
 * (graphty-element's browser files: 13 min in the ledger against about 62 min in CI), so its table is a look
 * only: --write needs --durations.
 *
 * Usage:
 *   node tools/light-check-replay.mjs [--advisory <file>, default the main checkout's] [--durations <file.json>] [--write]
 *       prints the table (Markdown); --write (with --durations) sets each key's minutes (its p90, rounded up)
 *       and why in ci-budgets.json
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { familyOf, openLedger } from "./test-ledger.mjs";
import { BIN_LIMIT_MS, binCost, loadRules, packBins } from "./test-select.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIN = 60_000;
/** Before the tests: checkout and pnpm install 1.5 min, the plan 1, Build 3 (merging section 4.2). */
export const SETUP_MS = 5.5 * MIN;
const WIDE = "run:ci.yml:pr-wide";

/**
 * What a record runs, per shard family: every file of the family when one of its shards runs whole, else
 * the union of its shards' selected files.
 * @param record an advisory record
 * @returns Map(family -> `{ package, all, files: Set, total }`), families that run nothing left out
 */
export function familiesOf(record) {
    const out = new Map();
    for (const s of record.selection ?? []) {
        if (s.mode === "none") continue;
        const fam = familyOf(s.shard);
        const f = out.get(fam) ?? { package: s.package, all: false, files: new Set(), total: 0 };
        f.all ||= s.mode === "all";
        f.total = Math.max(f.total, s.total ?? 0);
        for (const x of s.files ?? []) f.files.add(x.file);
        out.set(fam, f);
    }
    return out;
}

/**
 * The files a family runs: the selected ones, or for a whole family every file with a recorded time plus
 * one unknown file per test file the shard counts beyond them (packBins() counts those as the longest).
 * @param fam a familiesOf() entry
 * @param fileMs Map(file -> ms) of the family
 * @returns repository paths
 */
function filesToRun(fam, fileMs) {
    if (!fam.all) return [...fam.files];
    const known = [...fileMs.keys()];
    const unknown = Array.from({ length: Math.max(0, fam.total - known.length) }, (_, i) => `<unknown ${i}>`);
    return [...known, ...unknown];
}

/**
 * The budget key of a record's pull request (see the header).
 * @param record an advisory record
 * @param longest `[{ package, ms }]` per family, the longest bin first
 * @param fileLevel Set of the packages with file-level selection
 * @returns the key
 */
export function keyOf(record, longest, fileLevel) {
    // the selector names graphty-element in a dependent's reasons ("depends on graphty-element, whose build
    // changed", "graphty/vite.config.ts reads graphty-element/src/...") or files ("..., from graphty-element's build")
    const viaElement = (s) =>
        s.package !== "graphty-element" &&
        [...(s.reasons ?? []), ...(s.files ?? []).map((f) => f.why ?? "")].some((w) => w.includes("graphty-element"));
    if (record.everything || (record.selection ?? []).some(viaElement)) return WIDE;
    const whole = longest.find((f) => !fileLevel.has(f.package));
    return whole ? `run:ci.yml:pr-${whole.package}` : "run:ci.yml:pr";
}

/**
 * One record through the bin packing.
 * @param record an advisory record
 * @param durations Map(family -> Map(file -> ms))
 * @param fileLevel Set of the packages with file-level selection
 * @param [limitMs] the most one bin may hold
 * @returns `{ key, at, bins, testMs, runMs, overLimit }`
 */
export function replayRecord(record, durations, fileLevel, limitMs = BIN_LIMIT_MS) {
    const longest = [];
    let bins = 0;
    for (const [family, fam] of familiesOf(record)) {
        const fileMs = durations.get(family) ?? new Map();
        const { overheadMs, scale } = binCost(family);
        const packed = packBins(filesToRun(fam, fileMs), fileMs, limitMs, overheadMs, scale);
        bins += packed.length;
        longest.push({ package: fam.package, ms: packed[0]?.ms ?? 0 });
    }
    longest.sort((a, b) => b.ms - a.ms);
    const testMs = longest[0]?.ms ?? 0;
    return {
        key: keyOf(record, longest, fileLevel),
        at: record.at,
        bins,
        testMs,
        runMs: SETUP_MS + testMs,
        overLimit: testMs > limitMs,
    };
}

/**
 * The nearest-rank percentile.
 * @param xs numbers
 * @param p 0 to 1
 * @returns the value, or 0 for none
 */
export function percentile(xs, p) {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.max(0, Math.ceil(p * s.length) - 1)] : 0;
}

/**
 * Each key's p50 and p90 run time over the replayed records.
 * @param rows replayRecord() results
 * @returns `[{ key, n, p50, p90, bins50, bins90, overLimit, from, to }]`, times in minutes (one decimal), by key
 */
export function summarize(rows) {
    const byKey = Map.groupBy(rows, (r) => r.key);
    const min = (ms) => Math.round(ms / 6000) / 10;
    return [...byKey]
        .map(([key, rs]) => {
            const runs = rs.map((r) => r.runMs);
            const ats = rs.map((r) => r.at).sort();
            return {
                key,
                n: rs.length,
                p50: min(percentile(runs, 0.5)),
                p90: min(percentile(runs, 0.9)),
                bins50: percentile(
                    rs.map((r) => r.bins),
                    0.5,
                ),
                bins90: percentile(
                    rs.map((r) => r.bins),
                    0.9,
                ),
                overLimit: rs.filter((r) => r.overLimit).length,
                from: ats[0]?.slice(0, 10),
                to: ats.at(-1)?.slice(0, 10),
            };
        })
        .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * The table as Markdown.
 * @param table summarize()
 * @returns the text
 */
export const markdown = (table) =>
    [
        "| key | records | p50 min | p90 min | p50 bins | p90 bins | records with a bin over the limit |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
        ...table.map(
            (t) => `| \`${t.key}\` | ${t.n} | ${t.p50} | ${t.p90} | ${t.bins50} | ${t.bins90} | ${t.overLimit} |`,
        ),
    ].join("\n");

/**
 * ci-budgets.json with each replayed key's minutes set to its p90 (rounded up) and its why citing the replay.
 * @param budgets the parsed file
 * @param table summarize()
 * @returns the new file contents (parsed)
 */
export function applyBudgets(budgets, table) {
    const next = structuredClone(budgets);
    next.budgets ??= {};
    for (const t of table) {
        const why =
            `light-check replay of ${t.n} advisory records (${t.from} to ${t.to}): ` +
            `p50 ${t.p50} min, p90 ${t.p90} min; table on #3418`;
        next.budgets[t.key] = { ...next.budgets[t.key], minutes: Math.ceil(t.p90), why };
    }
    return next;
}

/**
 * Per-file durations from the test ledger: the median of each file's last 5 recorded runs, per family.
 * @returns Map(family -> Map(file -> ms)); empty when the ledger is unavailable
 */
function ledgerDurations() {
    const ledger = openLedger(process.env, ROOT);
    if (!ledger.db) {
        console.error(`test ledger unavailable (${ledger.why}): every file counts as unmeasured`);
        return new Map();
    }
    try {
        const sql = `SELECT i.family, t.file, r.ms FROM file_run r JOIN test t ON t.id = r.test
            JOIN invocation i ON i.id = r.inv WHERE r.ms > 0 AND t.name = '' ORDER BY i.started_at DESC`;
        const runs = new Map();
        for (const r of ledger.db.prepare(sql).all()) {
            const fam = runs.get(r.family) ?? new Map();
            const xs = fam.get(r.file) ?? [];
            if (xs.length < 5) fam.set(r.file, [...xs, r.ms]);
            runs.set(r.family, fam);
        }
        const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];
        return new Map([...runs].map(([f, m]) => [f, new Map([...m].map(([file, xs]) => [file, med(xs)]))]));
    } finally {
        ledger.db.close();
    }
}

const fromJson = (obj) => new Map(Object.entries(obj).map(([f, m]) => [f, new Map(Object.entries(m))]));

function main(argv) {
    const opt = (name) => {
        const i = argv.indexOf(name);
        return i === -1 ? undefined : argv[i + 1];
    };
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: ROOT });
    const advisory = opt("--advisory") ?? join(dirname(String(common).trim()), "tmp/test-select/advisory.jsonl");
    const records = readFileSync(advisory, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
    const durationsFile = opt("--durations");
    const durations = durationsFile ? fromJson(JSON.parse(readFileSync(durationsFile, "utf8"))) : ledgerDurations();
    const { fileLevel } = loadRules(ROOT);
    const table = summarize(records.map((r) => replayRecord(r, durations, fileLevel)));
    console.log(markdown(table));
    if (!argv.includes("--write")) return;
    if (!durationsFile) {
        console.error("--write needs --durations: the ledger's file times leave out import and setup time");
        process.exit(1);
    }
    const file = join(ROOT, "ci-budgets.json");
    if (!existsSync(file)) {
        console.error("ci-budgets.json does not exist yet (it comes with durations-timings, #3428)");
        process.exit(1);
    }
    const next = applyBudgets(JSON.parse(readFileSync(file, "utf8")), table);
    writeFileSync(file, JSON.stringify(next, null, 4) + "\n");
    console.log(`\nwrote ${table.length} keys to ci-budgets.json`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    main(process.argv.slice(2));
}
