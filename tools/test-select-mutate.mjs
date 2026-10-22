#!/usr/bin/env node
/**
 * test-select-mutate.mjs -- checks the test selector by breaking one file at a time (design/ci/minimal-tests.md,
 * section 5). In a scratch worktree of its own (<main checkout>/.worktrees/select-mutate, at this checkout's
 * HEAD) it picks source files of a package, seeded, and for each one:
 *  1. asks the selector which tests a change to that one file runs (the file-level answer, `measured` where
 *     the package is not allowed file by file yet);
 *  2. breaks the file: a code file gets a top-level `throw new Error("select-mutant")` at its end, so every
 *     test that loads it fails; a data file is emptied (`{}` for JSON), so every test that reads it fails;
 *  3. runs every shard of the package whose command is a plain vitest run, whole, without coverage;
 *  4. checks that every failing test file was selected. One that was not is run again on the unbroken
 *     tree: still failing, it is flaky; passing, it is a MISS.
 * It also counts what was selected and did not fail (over-selection). Exit 1 on any miss.
 *
 * Usage: node tools/test-select-mutate.mjs <package> [--count N] [--seed S] [--shard <name>]...
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
    buildGraphs,
    buildInput,
    failingFiles,
    measuredOf,
    repoPath,
    selectChange,
    selectedCommand,
    strip,
} from "./test-select.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = /\.[cm]?[jt]sx?$/u;
const DATA = /\.(json|jsonl|txt|csv|tsv|xml|ya?ml|graphml|gexf|gml|dot|gv|net|obo|cx2?|xgmml|wgsl|glsl|svg|html|css)$/u;

/**
 * Picks `count` items, the same ones for the same seed.
 * @param items candidates
 * @param count how many
 * @param seed any integer
 * @returns a sublist
 */
export function seededPick(items, count, seed) {
    let x = seed >>> 0 || 1;
    const next = () => {
        // xorshift32
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        return (x >>> 0) / 2 ** 32;
    };
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out.slice(0, count);
}

/**
 * The broken text of a file.
 * @param path its path
 * @param text its contents
 * @returns the mutant
 */
export function mutant(path, text) {
    if (CODE.test(path)) {
        return `${text}\nthrow new Error("select-mutant");\n`;
    }
    return path.endsWith(".json") ? "{}\n" : "";
}

/**
 * The verdict on one mutant.
 * @param selected repo-relative test files the selector chose (null: the whole shard ran)
 * @param failing repo-relative test files that failed with the mutant
 * @param stillFails whether a file fails on the unbroken tree too
 * @returns `{ misses, flaky, over }`
 */
export function judge(selected, failing, stillFails) {
    if (selected === null) {
        return { misses: [], flaky: [], over: 0 };
    }
    const chosen = new Set(selected);
    const outside = failing.filter((f) => !chosen.has(f));
    const flaky = outside.filter(stillFails);
    const failed = new Set(failing);
    return {
        misses: outside.filter((f) => !flaky.includes(f)),
        flaky,
        over: selected.filter((f) => !failed.has(f)).length,
    };
}

function scratch(head) {
    const main = dirname(
        execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
            cwd: HERE,
            encoding: "utf8",
        }).trim(),
    );
    const wt = join(main, ".worktrees", "select-mutate");
    const git = (...a) => execFileSync("git", a, { cwd: existsSync(wt) ? wt : main, stdio: "inherit" });
    if (existsSync(wt)) {
        git("reset", "-q", "--hard");
        git("clean", "-qfd", "--", ".");
        git("checkout", "-q", "--detach", head);
    } else {
        git("worktree", "add", "-q", "--detach", wt, head);
    }
    execFileSync("pnpm", ["install", "--frozen-lockfile", "--prefer-offline"], { cwd: wt, stdio: "inherit" });
    return wt;
}

function runShard(wt, shard, command) {
    const r = spawnSync(
        process.execPath,
        ["tools/test-slots.mjs", "bash", "tools/run-tests.sh", "--command", shard.shard, command],
        { cwd: wt, encoding: "utf8", maxBuffer: 1 << 28 },
    );
    return `${r.stdout}\n${r.stderr}`;
}

/**
 * Breaks one file, runs the shards and reports what the selection missed.
 * @param m what to mutate
 * @param m.wt the scratch worktree
 * @param m.pkg the package directory
 * @param m.file the repo-relative file to break
 * @param m.shards the package's plain shards
 * @param m.graphs buildGraphs() of the unbroken package
 * @returns the number of misses
 */
async function mutateOne({ wt, pkg, file, shards, graphs }) {
    const sel = measuredOf((await selectChange(wt, [file], shards, graphs)).shards);
    const original = readFileSync(join(wt, file), "utf8");
    writeFileSync(join(wt, file), mutant(file, original));
    const runs = [];
    try {
        for (const shard of shards) {
            runs.push({ shard, log: runShard(wt, shard, selectedCommand(wt, shard, null)) });
        }
    } finally {
        writeFileSync(join(wt, file), original);
    }
    let misses = 0;
    for (const { shard, log } of runs) {
        const s = sel.find((x) => x.shard === shard.shard);
        const selected = s.mode === "all" ? null : s.files.map((f) => f.file);
        const failing = failingFiles(log).files.map((f) => repoPath(pkg, f));
        const stillFails = (f) =>
            /Test Files\s.*\bfailed\b/u.test(strip(runShard(wt, shard, selectedCommand(wt, shard, [f]))));
        const v = judge(selected, failing, stillFails);
        misses += v.misses.length;
        const what = selected === null ? "whole shard" : `${selected.length} selected`;
        const flaky = v.flaky.length > 0 ? `, flaky: ${v.flaky.join(" ")}` : "";
        const missed = v.misses.length > 0 ? `, MISSED: ${v.misses.join(" ")}` : "";
        console.log(
            `${file} -> ${shard.shard}: ${what}, ${failing.length} failed, ${v.over} selected without failing${flaky}${missed}`,
        );
    }
    return misses;
}

async function main(argv) {
    const pkg = argv[0];
    const opt = (name, dflt) => {
        const i = argv.indexOf(name);
        return i === -1 ? dflt : argv[i + 1];
    };
    const only = argv.flatMap((a, i) => (argv[i - 1] === "--shard" ? [a] : []));
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: HERE, encoding: "utf8" }).trim();
    const wt = scratch(head);
    const { SHARDS } = await import(pathToFileURL(join(wt, "tools/ci-test-matrix.mjs")).href);
    const shards = SHARDS.filter(
        (s) => s.package === pkg && s.local !== "never" && (only.length === 0 || only.includes(s.shard)),
    ).filter((s) => selectedCommand(wt, s, null));
    if (shards.length === 0) {
        console.error(`no shard of ${pkg} is a plain vitest run`);
        return 2;
    }
    console.log(`Building ${pkg} and what it depends on...`);
    execFileSync("pnpm", ["exec", "nx", "run-many", "-t", "build", "-p", pkg, "--outputStyle=static"], {
        cwd: wt,
        stdio: "inherit",
    });
    const files = execFileSync("git", ["ls-files", "--", pkg], { cwd: wt, encoding: "utf8" })
        .split("\n")
        .filter((f) => f && buildInput(f.slice(pkg.length + 1)) && (CODE.test(f) || DATA.test(f)))
        .filter((f) => !f.endsWith(".d.ts") && !/\.config\.[cm]?[jt]s$/u.test(f));
    const picked = seededPick(files, Number(opt("--count", "5")), Number(opt("--seed", "1")));
    const graphs = buildGraphs(wt, [pkg], shards);
    let misses = 0;
    for (const file of picked) {
        misses += await mutateOne({ wt, pkg, file, shards, graphs });
    }
    console.log(misses === 0 ? `No misses in ${picked.length} mutant(s).` : `${misses} miss(es).`);
    return misses === 0 ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = await main(process.argv.slice(2));
}
