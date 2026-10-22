#!/usr/bin/env node
/**
 * nx-affected-compare.mjs -- for a change, which test shards nx's two affected modes would run.
 *
 * Project mode (affected.legacy: true) marks every project that owns a changed file, and every
 * project that depends on one, as affected. Task mode (Nx 24's default) marks only the tasks whose
 * declared inputs contain a changed file. Each shard of tools/ci-test-matrix.mjs runs when its
 * package's `coverage` task is affected, so a shard task mode drops is either a real saving or an
 * input nx.json does not declare. Run this on past changes before turning task mode on, and read
 * every dropped shard: one that the change can break is a missing input.
 *
 * Usage:
 *   node tools/nx-affected-compare.mjs <base> <head> [<base> <head> ...]
 *   node tools/nx-affected-compare.mjs --landings <n>   the last n `land:` merges on origin/golden
 *   node tools/nx-affected-compare.mjs --files <a,b,...> [--files <c> ...]   one change per list
 *   add --explain to print nx's reasons for each task task mode keeps
 *   node tools/nx-affected-compare.mjs --tests <base> <head>
 *       prints the JSON array of nx projects whose coverage task task mode selects (the gate's test list)
 * Exits 0; the report is the output.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { SHARDS } from "./ci-test-matrix.mjs";

// The checkout nx answers for: the current directory, so the gate's live copy of this file can ask
// about the checkout being pushed.
const ROOT = process.cwd();
const TARGET = "coverage";
const run = (cmd, args, env = {}) =>
    execFileSync(cmd, args, {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 1 << 30,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, NX_DAEMON: "false", ...env },
    });
const dirName = (p) => p.replace(/^@graphty\//, "");
const shardsOf = (packages) => SHARDS.filter((s) => packages.has(s.package)).map((s) => s.shard);

/**
 * The projects whose coverage task one mode selects, as nx names them.
 * @param change nx's change arguments (`--base=<b> --head=<h>` or `--files=<list>`)
 * @param legacy project mode when true, task mode when false
 * @returns Set of nx project names
 */
export function affectedProjects(change, legacy) {
    const dir = mkdtempSync(join(tmpdir(), "nx-affected-"));
    try {
        const file = join(dir, "graph.json");
        run("pnpm", ["exec", "nx", "affected", "-t", TARGET, ...change, `--graph=${file}`], {
            NX_LEGACY_AFFECTED: String(legacy),
        });
        const { tasks } = JSON.parse(readFileSync(file, "utf8")).tasks;
        return new Set(
            Object.values(tasks)
                .filter((t) => t.target.target === TARGET)
                .map((t) => t.target.project),
        );
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

const affectedPackages = (change, legacy) => new Set([...affectedProjects(change, legacy)].map(dirName));

function landings(n) {
    return run("git", ["log", "--first-parent", "origin/golden", "--format=%H %s", "--grep=^land: ", `-${n}`])
        .trim()
        .split("\n")
        .map((l) => [`${l.slice(0, 40)}^1`, l.slice(0, 40), l.slice(41)]);
}

function main(argv) {
    const explain = argv.includes("--explain");
    const args = argv.filter((a) => a !== "--explain");
    let ranges;
    if (args[0] === "--tests") {
        // The gate's question: which projects' tests a push affects, in task mode, as a JSON array.
        console.log(JSON.stringify([...affectedProjects([`--base=${args[1]}`, `--head=${args[2]}`], false)]));
        return;
    }
    if (args[0] === "--landings") {
        ranges = landings(Number(args[1] ?? 5));
    } else if (args[0] === "--files") {
        ranges = args.filter((_, i) => i % 2 === 1).map((f) => [null, f, ""]);
    } else {
        ranges = [];
        for (let i = 0; i + 1 < args.length; i += 2) {
            ranges.push([args[i], args[i + 1], ""]);
        }
    }
    if (ranges.length === 0) {
        console.error("usage: node tools/nx-affected-compare.mjs <base> <head> ... | --landings <n> [--explain]");
        process.exit(2);
    }
    for (const [base, head, title] of ranges) {
        const change = base === null ? [`--files=${head}`] : [`--base=${base}`, `--head=${head}`];
        const files =
            base === null
                ? head.split(",")
                : run("git", ["diff", "--name-only", base, head]).trim().split("\n").filter(Boolean);
        const project = affectedPackages(change, true);
        const task = affectedPackages(change, false);
        const dropped = [...project].filter((p) => !task.has(p));
        const added = [...task].filter((p) => !project.has(p));
        const ps = shardsOf(project);
        const ts = shardsOf(task);
        console.log(`\n${base === null ? "files" : head.slice(0, 10)} ${title}`);
        console.log(
            `  changed files (${files.length}): ${files.slice(0, 8).join(", ")}${files.length > 8 ? ", ..." : ""}`,
        );
        console.log(`  project mode: ${ps.length} shards [${[...project].sort().join(", ")}]`);
        console.log(`  task mode:    ${ts.length} shards [${[...task].sort().join(", ")}]`);
        console.log(`  dropped packages: ${dropped.sort().join(", ") || "none"}`);
        if (added.length > 0) {
            console.log(`  ADDED by task mode (unexpected): ${added.join(", ")}`);
        }
        if (explain) {
            // nx explains only what it selects: why each kept task is in. A dropped package is out
            // because none of the changed files is among its coverage task's inputs.
            const why = run("pnpm", ["exec", "nx", "affected", "-t", TARGET, ...change, "--explain"], {
                NX_LEGACY_AFFECTED: "false",
            });
            console.log(why.replace(/^/gm, "    "));
        }
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    main(process.argv.slice(2));
}
