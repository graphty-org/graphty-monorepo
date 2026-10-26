#!/usr/bin/env node
/**
 * test-changed.mjs -- run only the tests the change in this worktree can affect (design/ci/minimal-tests.md,
 * section 1.1). Exposed as `pnpm run test:changed`.
 *
 * The change is everything since the merge base with origin/master: commits, staged and unstaged edits and
 * untracked files git does not ignore. tools/test-select.mjs decides per test shard, with the gate's own
 * rules: "none" runs nothing, "files" runs one `vitest run` of the selected files with the shard's config and
 * --project filters (no coverage, no --shard slice), "all" runs the shard as CI does (tools/run-tests.sh).
 * The "never" shards (graphty-element-lifecycle) are left out, as the gate leaves them out. The packages the runs need are built first; every run takes a test slot.
 *
 * The file-level runs' files are ranked by the test ledger's history (tools/test-history.mjs,
 * design/ci/history-selection.md) and printed with why; history never adds or drops a file unless --budget asks.
 *
 * Usage: node tools/test-changed.mjs [--dry-run] [--all] [--features-on] [--base <ref>] [--budget <s>]
 *   --dry-run  print the selection, the history ranking and why, run nothing
 *   --budget   run only the highest-ranked selected files that fit in <s> seconds of recorded time
 *              (whole-shard runs are not cut)
 *   --all      every shard the change touches runs whole
 *   --features-on  also select the features-on twins (the "On" configuration; none while no experiment is declared)
 *   --base     compare with another ref (default origin/master)
 */

import { execFileSync, spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SHARDS } from "./ci-test-matrix.mjs";
import { config, readPlan } from "./results/client.mjs";
import { projectGraph } from "./prepush-inputs.mjs";
import { budget, explain, rankFiles } from "./test-history.mjs";
import { planRuns, selectChange, selectedCommand } from "./test-select.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The files changed since the merge base of `base` and HEAD, the working tree included.
 * @param root the checkout
 * @param base a ref
 * @returns sorted repo-relative paths
 */
export function changedSince(root, base) {
    const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }).trim();
    const mb = git(["merge-base", base, "HEAD"]);
    const files = [
        // --no-renames: a renamed file's old path is a change too (a test may still import it)
        ...git(["diff", "--name-only", "--no-renames", mb]).split("\n"),
        ...git(["ls-files", "--others", "--exclude-standard"]).split("\n"),
    ];
    return [...new Set(files.filter(Boolean))].sort();
}

const measuredText = (m) => (m.mode === "files" ? `${m.files.length} file(s)` : m.mode);

/**
 * The plan as text: per run, what it runs and why.
 * @param plan planRuns()
 * @returns lines
 */
export function describePlan(plan) {
    const lines = [];
    for (const p of plan.filter((x) => x.mode !== "none")) {
        const name = p.covers.join(", ");
        if (p.mode === "all") {
            const would = p.measured ? "; file level would run " + measuredText(p.measured) : "";
            lines.push(`  ${name}: WHOLE SHARD (${p.reasons[0] ?? "the selector chose all"}${would})`);
            continue;
        }
        lines.push(`  ${name}: ${p.files.length} test file(s)`);
        for (const f of p.files) {
            lines.push(`      ${f.file}  <- ${[f.why].flat().join("; ")}`);
        }
    }
    const none = plan.filter((x) => x.mode === "none").flatMap((x) => x.covers);
    if (none.length > 0) {
        lines.push(`  nothing to run: ${none.join(", ")}`);
    }
    return lines;
}

/**
 * Every shard but the "never" ones (tools/ci-test-matrix.mjs), as the selecting gate asks (with
 * `featuresOn`, the features-on twins too, which are "never" only so the gate skips them): which packages
 * and files the change reaches is the selector's question, and the "when-paths-change" policy would drop
 * shards it runs whole (a graphty-element source change runs its browser shards).
 * @param featuresOn also include the features-on twins (`flags: "on"` shards)
 * @returns SHARDS entries
 */
export const candidateShards = (featuresOn = false) =>
    SHARDS.filter((s) => s.local !== "never" || (featuresOn && s.flags === "on"));

// A file-level run with only the files a budget kept; with none kept it runs nothing.
function keepOnly(p, keep) {
    if (p.mode !== "files") return p;
    const files = p.files.filter((f) => keep.has(f.file));
    if (files.length === 0) return { ...p, mode: "none", files };
    return { ...p, files, command: selectedCommand(ROOT, p.shard, files.map((f) => f.file).sort()) };
}

/**
 * Ranks the file-level runs' files by history and says why; with a budget, keeps only the ranked files that fit.
 * @param plan planRuns()
 * @param changed the change's files
 * @param [secs] the budget in seconds, or undefined (run everything)
 * @param [ranker] rankFiles (tests replace it)
 * @returns `{ plan, lines }`
 */
export function rankPlan(plan, changed, secs, ranker = rankFiles) {
    const files = plan.filter((p) => p.mode === "files").flatMap((p) => p.files.map((f) => f.file));
    if (files.length === 0) return { plan, lines: [] };
    const { ranked, why } = ranker(files, changed);
    const head = why ? `history: unavailable (${why}); ranking by import selection only` : "History ranking:";
    const taken = secs === undefined ? ranked : budget(ranked, secs).taken;
    const keep = new Set(taken.map((r) => r.file));
    const lines = [head, ...ranked.map((r) => `  ${keep.has(r.file) ? "" : "[OUT] "}${explain(r)}`)];
    if (secs === undefined) return { plan, lines };
    lines.push(`  budget: ${taken.length} of ${ranked.length} selected file(s) fit in ${secs} s`);
    return { plan: plan.map((p) => keepOnly(p, keep)), lines };
}

function build(plan) {
    const graph = projectGraph(ROOT);
    const byDir = new Map([...(graph?.roots ?? [])].map(([n, d]) => [d, n]));
    const projects = [...new Set(plan.filter((p) => p.mode !== "none").map((p) => byDir.get(p.shard.package)))];
    if (projects.some((p) => !p)) {
        return true; // a package nx does not know: its run will say what is missing
    }
    console.log(`Building ${projects.join(", ")} and what they depend on (nx's cache makes an unchanged one free)...`);
    const r = spawnSync("pnpm", ["exec", "nx", "run-many", "-t", "build", "-p", ...projects, "--outputStyle=static"], {
        cwd: ROOT,
        stdio: "inherit",
    });
    return r.status === 0;
}

function run(p) {
    const args = p.mode === "files" ? ["--command", p.shard.shard, p.command] : [p.shard.shard];
    const t0 = Date.now();
    const r = spawnSync(process.execPath, ["tools/test-slots.mjs", "bash", "tools/run-tests.sh", ...args], {
        cwd: ROOT,
        stdio: "inherit",
    });
    return { name: p.covers.join(", "), ok: r.status === 0, secs: Math.round((Date.now() - t0) / 1000) };
}

async function main(argv) {
    const baseAt = argv.indexOf("--base");
    const base = baseAt === -1 ? "origin/master" : argv[baseAt + 1];
    const changed = changedSince(ROOT, base);
    console.log(`${changed.length} file(s) changed since the merge base with ${base}.`);
    if (changed.length === 0) {
        return 0;
    }
    const shards = candidateShards(argv.includes("--features-on"));
    let selection;
    try {
        selection = (await selectChange(ROOT, changed, shards, undefined, false, { base, head: null })).shards;
    } catch (e) {
        console.log(`The selector failed (${e.message.split("\n")[0]}); every candidate shard runs whole.`);
        selection = [];
    }
    if (argv.includes("--all")) {
        selection = selection.map((s) => (s.mode === "none" ? s : { ...s, mode: "all", reasons: ["--all"] }));
    }
    const at = argv.indexOf("--budget");
    const runs = planRuns(ROOT, shards, selection);
    const files = runs.filter((p) => p.mode === "files").flatMap((p) => p.files.map((f) => f.file));
    const cfg = files.length > 0 ? config() : null;
    const storePlan = cfg ? await readPlan(cfg, { files }) : null;
    const ranker = (f, c) => rankFiles(f, c, process.env, ROOT, storePlan);
    const ranked = rankPlan(runs, changed, at === -1 ? undefined : Number(argv[at + 1]), ranker);
    const plan = ranked.plan;
    console.log([...describePlan(plan), ...ranked.lines].join("\n"));
    const todo = plan.filter((p) => p.mode !== "none");
    if (argv.includes("--dry-run") || todo.length === 0) {
        return 0;
    }
    if (!build(todo)) {
        console.log("The build failed; no tests ran.");
        return 1;
    }
    const results = todo.map(run);
    for (const r of results) {
        console.log(`  [${r.ok ? "PASS" : "FAIL"}] ${r.name} (${r.secs}s)`);
    }
    return results.every((r) => r.ok) ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = await main(process.argv.slice(2));
}
