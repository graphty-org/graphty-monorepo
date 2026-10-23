#!/usr/bin/env node
/**
 * test-select-mutate.mjs -- checks the test selector by breaking files (design/ci/minimal-tests.md, section 5).
 * In a scratch worktree of its own (<main checkout>/.worktrees/<--worktree, default select-mutate>, at this
 * checkout's HEAD) it picks source files of a package, seeded (or takes --files), and:
 *  1. asks the selector which tests a change to each one file runs (the file-level answer, `measured` where
 *     the package is not allowed file by file yet);
 *  2. breaks the files: a code file gets a top-level `throw new Error("select-mutant")` at its end, so every
 *     test that loads it fails; a data file is emptied (`{}` for JSON), so every test that reads it fails;
 *  3. runs every shard of the package (or of --reader, the package that reads the broken files) whose command
 *     is a plain vitest run, whole, without coverage; slices of one shard run once;
 *  4. checks that every failing test file was selected for a broken file that can explain it.
 * With --batch K it breaks K files at once and runs the shards once for all of them. A failing test file is
 * then explained only by the broken files that selected it, so the files that did NOT select it are broken
 * again alone (as a group, then one by one): a test file that fails with one of them alone and not on the
 * unbroken tree is a MISS of that file. A failing file that fails unbroken too is flaky. Browser shards run in
 * one of the shared browser slots (tools/with-browser.sh). Exit 1 on any miss or inconclusive run.
 *
 * Usage: node tools/test-select-mutate.mjs <package> [--count N] [--seed S] [--files a,b,...] [--batch K]
 *            [--reader <package>] [--shard <name>]... [--worktree <name>]
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
    shardRuns,
    shardSpecs,
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
 * The failing test files a batch of broken files must be checked for, grouped by the broken files that did
 * NOT select them (a file selected by every broken file, or by one that runs the whole shard, is explained).
 * @param failing repo-relative test files that failed with the batch broken
 * @param broken the broken files
 * @param chosen (broken file) => Set of the test files it selected, or null for the whole shard
 * @returns `[{ non: broken files, files: failing test files }]`
 */
export function unexplained(failing, broken, chosen) {
    const groups = new Map();
    for (const f of failing) {
        const non = broken.filter((m) => chosen(m)?.has(f) === false);
        if (non.length > 0) {
            const key = non.join("\n");
            groups.set(key, { non, files: [...(groups.get(key)?.files ?? []), f] });
        }
    }
    return [...groups.values()];
}

function scratch(head, name) {
    const main = dirname(
        execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
            cwd: HERE,
            encoding: "utf8",
        }).trim(),
    );
    const wt = join(main, ".worktrees", name);
    const env = { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" };
    const git = (...a) => execFileSync("git", a, { cwd: existsSync(wt) ? wt : main, stdio: "inherit", env });
    if (existsSync(wt)) {
        git("reset", "-q", "--hard");
        git("clean", "-qfd", "--", ".");
        git("checkout", "-q", "--detach", head);
    } else {
        // the screenshot baselines are Git LFS objects no test reads; only the browser fonts are fetched
        git("worktree", "add", "-q", "--detach", wt, head);
    }
    execFileSync("git", ["lfs", "pull", "--include", "visual-fonts/**"], { cwd: wt, stdio: "inherit" });
    execFileSync("pnpm", ["install", "--frozen-lockfile", "--prefer-offline"], { cwd: wt, stdio: "inherit" });
    return wt;
}

/**
 * Runs one command of a shard and returns its output.
 * @param wt the scratch worktree
 * @param shard the SHARDS entry
 * @param command the command
 * @param browser whether it drives a browser (it then waits for a shared browser slot)
 * @returns stdout and stderr
 */
function runShard(wt, shard, command, browser) {
    const run = ["tools/test-slots.mjs", "bash", "tools/run-tests.sh", "--command", shard.shard, command];
    const r = browser
        ? spawnSync("bash", ["tools/with-browser.sh", process.execPath, ...run], {
              cwd: wt,
              encoding: "utf8",
              maxBuffer: 1 << 28,
          })
        : spawnSync(process.execPath, run, { cwd: wt, encoding: "utf8", maxBuffer: 1 << 28 });
    return `${r.stdout}\n${r.stderr}`;
}

/**
 * Breaks a batch of files, runs the shards once and reports what the selection missed.
 * @param m what to mutate
 * @param m.wt the scratch worktree
 * @param m.files the repo-relative files to break together
 * @param m.shards the plain shards to run, one per command
 * @param m.allShards every shard of the matrix
 * @param m.graphs buildGraphs() of the unbroken packages
 * @returns `{ misses, inconclusive }`
 */
async function mutateBatch({ wt, files, shards, allShards, graphs }) {
    const sels = new Map();
    for (const f of files) {
        // asked about every shard, so every package is one (a file of another package is not a root file)
        sels.set(f, measuredOf((await selectChange(wt, [f], allShards, graphs)).shards));
    }
    const chosen = (f, shard) => {
        const s = sels.get(f).find((x) => x.shard === shard.shard);
        return s.mode === "all" ? null : new Set(s.files.map((x) => x.file));
    };
    // kept as bytes, so a binary file (a font) is put back exactly
    const originals = new Map(files.map((f) => [f, readFileSync(join(wt, f))]));
    const put = (broken) =>
        files.forEach((f) =>
            writeFileSync(
                join(wt, f),
                broken.includes(f) ? mutant(f, originals.get(f).toString("utf8")) : originals.get(f),
            ),
        );
    const browserOf = (shard) => shardSpecs(shardRuns(shard), graphs.get(shard.package) ?? []).browser;
    const failing = (shard, list, broken) => {
        put(broken);
        try {
            const out = failingFiles(runShard(wt, shard, selectedCommand(wt, shard, list), browserOf(shard)));
            return { ...out, files: out.files.map((f) => repoPath(shard.package, f)) };
        } finally {
            put([]);
        }
    };
    for (const f of files) {
        const what = sels
            .get(f)
            .filter((s) => shards.some((x) => x.shard === s.shard))
            .map((s) => `${s.shard}=${s.mode === "files" ? s.files.length : s.mode}`);
        console.log(`  ${f}: ${what.join(" ")}`);
    }
    let misses = 0;
    let inconclusive = 0;
    for (const shard of shards) {
        const run = failing(shard, null, files);
        if (!run.summary) {
            console.log(`${shard.shard}: INCONCLUSIVE, the run printed no summary`);
            inconclusive++;
            continue;
        }
        const found = [];
        for (const g of unexplained(run.files, files, (m) => chosen(m, shard))) {
            const r = crossCheck(shard, g, failing);
            found.push(...r.found);
            inconclusive += r.inconclusive;
        }
        misses += found.length;
        const selected = new Set(files.flatMap((m) => [...(chosen(m, shard) ?? [])]));
        const all = files.some((m) => chosen(m, shard) === null);
        const over = all
            ? "whole shard selected"
            : `${[...selected].filter((x) => !run.files.includes(x)).length} selected without failing`;
        console.log(
            `${shard.shard}: ${run.files.length} failed, ${over}` +
                (found.length > 0 ? `, MISSED: ${found.join(", ")}` : ""),
        );
    }
    return { misses, inconclusive };
}

/**
 * Breaks again only the files that did not select a group of failing test files: what still fails is a miss
 * of one of them, found by breaking each alone; what fails unbroken too is flaky.
 * @param shard the shard
 * @param g `{ non, files }` from unexplained()
 * @param failing (shard, test files, broken files) => the run's failing test files
 * @returns `{ found: ["broken -> test"], inconclusive }`
 */
function crossCheck(shard, g, failing) {
    const found = [];
    let inconclusive = 0;
    const again = failing(shard, g.files, g.non).files.filter((x) => g.files.includes(x));
    if (again.length === 0) {
        return { found, inconclusive };
    }
    const flaky = new Set(failing(shard, again, []).files);
    const alone = new Map(g.non.map((m) => [m, new Set(failing(shard, again, [m]).files)]));
    for (const f of again) {
        const by = g.non.filter((m) => alone.get(m).has(f));
        if (flaky.has(f)) {
            console.log(`${shard.shard}: flaky ${f} (fails unbroken)`);
        } else if (by.length === 0) {
            console.log(`${shard.shard}: ${f} fails only with several of ${g.non.join(" ")} broken together`);
            inconclusive++;
        } else {
            by.forEach((m) => found.push(`${m} -> ${f}`));
        }
    }
    return { found, inconclusive };
}

async function main(argv) {
    const pkg = argv[0];
    const opt = (name, dflt) => {
        const i = argv.indexOf(name);
        return i === -1 ? dflt : argv[i + 1];
    };
    const only = argv.flatMap((a, i) => (argv[i - 1] === "--shard" ? [a] : []));
    const reader = opt("--reader", pkg);
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: HERE, encoding: "utf8" }).trim();
    const wt = scratch(head, opt("--worktree", "select-mutate"));
    const { SHARDS } = await import(pathToFileURL(join(wt, "tools/ci-test-matrix.mjs")).href);
    const commands = new Set();
    const shards = SHARDS.filter(
        (s) => s.package === reader && s.local !== "never" && (only.length === 0 || only.includes(s.shard)),
    ).filter((s) => {
        // slices of one shard (graphty-1 to graphty-3) are one command once the slice is dropped
        const c = selectedCommand(wt, s, null);
        return c && !commands.has(c) && commands.add(c);
    });
    if (shards.length === 0) {
        console.error(`no shard of ${reader} is a plain vitest run`);
        return 2;
    }
    console.log(`Building ${[...new Set([pkg, reader])].join(", ")} and what they depend on...`);
    execFileSync(
        "pnpm",
        ["exec", "nx", "run-many", "-t", "build", "-p", [...new Set([pkg, reader])].join(","), "--outputStyle=static"],
        { cwd: wt, stdio: "inherit" },
    );
    const candidates = execFileSync("git", ["ls-files", "--", pkg], { cwd: wt, encoding: "utf8" })
        .split("\n")
        .filter((f) => f && buildInput(f.slice(pkg.length + 1)) && (CODE.test(f) || DATA.test(f)))
        .filter((f) => !f.endsWith(".d.ts") && !/\.config\.[cm]?[jt]s$/u.test(f));
    const given = opt("--files", null);
    const picked = given
        ? given.split(",")
        : seededPick(candidates, Number(opt("--count", "5")), Number(opt("--seed", "1")));
    const graphs = buildGraphs(wt, [...new Set([pkg, reader])], shards);
    if ((graphs.get(reader) ?? []).includes(null)) {
        console.error(`the import graph of ${reader} could not be built; the selection would run it whole`);
        return 2;
    }
    const size = Number(opt("--batch", "1"));
    let misses = 0;
    let inconclusive = 0;
    for (let i = 0; i < picked.length; i += size) {
        const batch = picked.slice(i, i + size);
        console.log(`Batch ${i / size + 1}: ${batch.length} broken file(s)`);
        const r = await mutateBatch({ wt, files: batch, shards, allShards: SHARDS, graphs });
        misses += r.misses;
        inconclusive += r.inconclusive;
    }
    console.log(
        misses === 0 && inconclusive === 0
            ? `No misses in ${picked.length} mutant(s).`
            : `${misses} miss(es), ${inconclusive} inconclusive.`,
    );
    return misses === 0 && inconclusive === 0 ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = await main(process.argv.slice(2));
}
