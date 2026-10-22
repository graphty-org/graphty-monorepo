#!/usr/bin/env node
/**
 * test-changed.mjs -- run only the tests the change in this worktree can affect (design/ci/minimal-tests.md,
 * section 1.1). Exposed as `pnpm run test:changed`.
 *
 * The change is everything since the merge base with origin/golden: commits, staged and unstaged edits and
 * untracked files git does not ignore. tools/test-select.mjs decides per test shard, with the gate's own
 * rules: "none" runs nothing, "files" runs one `vitest run` of the selected files with the shard's config and
 * --project filters (no coverage, no --shard slice), "all" runs the shard as CI does (tools/run-tests.sh).
 * Shards the gate leaves to CI (a "when-paths-change" shard none of whose files changed, a "never" shard)
 * are left out here too. The packages the runs need are built first; every run takes a test slot.
 *
 * Usage: node tools/test-changed.mjs [--dry-run] [--all] [--base <ref>]
 *   --dry-run  print the selection and why, run nothing
 *   --all      every shard the change touches runs whole
 *   --base     compare with another ref (default origin/golden)
 */

import { execFileSync, spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SHARDS } from "./ci-test-matrix.mjs";
import { projectGraph } from "./prepush-inputs.mjs";
import { childTriggers, gateShards } from "./prepush-tests.mjs";
import { planRuns, selectChange } from "./test-select.mjs";

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
        ...git(["diff", "--name-only", mb]).split("\n"),
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
 * The shards the gate would consider by its "local" policy (tools/ci-test-matrix.mjs); which packages the
 * change reaches is the selector's question.
 * @param changed repo-relative paths
 * @returns SHARDS entries
 */
function candidateShards(changed) {
    try {
        return gateShards(SHARDS, changed, childTriggers(SHARDS, changed));
    } catch (e) {
        console.log(
            `(the gate's shard triggers could not be read: ${e.message.split("\n")[0]}; asking about every shard)`,
        );
        return SHARDS.filter((s) => s.local !== "never");
    }
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
    const at = argv.indexOf("--base");
    const base = at === -1 ? "origin/golden" : argv[at + 1];
    const changed = changedSince(ROOT, base);
    console.log(`${changed.length} file(s) changed since the merge base with ${base}.`);
    if (changed.length === 0) {
        return 0;
    }
    const shards = candidateShards(changed);
    let selection;
    try {
        selection = (await selectChange(ROOT, changed, shards)).shards;
    } catch (e) {
        console.log(`The selector failed (${e.message.split("\n")[0]}); every candidate shard runs whole.`);
        selection = [];
    }
    if (argv.includes("--all")) {
        selection = selection.map((s) => (s.mode === "none" ? s : { ...s, mode: "all", reasons: ["--all"] }));
    }
    const plan = planRuns(ROOT, shards, selection);
    console.log(describePlan(plan).join("\n"));
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
