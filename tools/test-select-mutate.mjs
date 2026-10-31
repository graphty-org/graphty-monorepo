#!/usr/bin/env node
/**
 * test-select-mutate.mjs -- checks the test selector by breaking files (design/ci/minimal-tests.md, section 5).
 * In a scratch worktree of its own (<main checkout>/.worktrees/select-mutate-<--name>, or select-mutate without
 * --name, at this checkout's HEAD) it picks source files of a package, seeded (or takes --files), and:
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
 * one of the shared browser slots (tools/with-browser.sh). With --reader, a broken source file of a package the
 * reader loads through its build is built into that package's dist/ before each run (and the unbroken build
 * put back after), so the reader's tests load the broken code as the gate's would; only source files under
 * src/ are picked then. Exit 1 on any miss or inconclusive run. What it prints is also written to its report,
 * <main checkout>/tmp/select-mutate/<--name, default "default">/report.txt, so runs with different names can
 * run at once, each in its own worktree with its own report.
 *
 * With --stories <project> it checks story selection (selectStories(), design/ci/channels-pipeline/stories-as-tests.md
 * section 5) for one visual-review project instead: it builds the project's Storybook and captures every story
 * unbroken, then for each picked file of the project's package (source and story files) asks which stories a
 * change to it runs (as if the project were in the rules' stories.selectProjects), breaks it, builds the
 * Storybook again and captures every story. Every story whose capture differs from the unbroken one (different
 * bytes, or failed to capture) must have been selected; one that was not is captured again unbroken, and is a
 * MISS unless that capture differs too (flaky). A file the Storybook does not build with is SKIPPED: the
 * Storybooks build job fails that change. Its report is tmp/select-mutate/stories-<project>/report.txt. A
 * project joins stories.selectProjects only after a clean run.
 *
 * Usage: node tools/test-select-mutate.mjs <package> [--count N] [--seed S] [--files a,b,...] [--batch K]
 *            [--reader <package>] [--shard <name>]... [--name <n>] [--worktree <dir name>]
 *        node tools/test-select-mutate.mjs --stories <project> [--count N] [--seed S] [--files a,b,...]
 *            [--name <n>] [--worktree <dir name>]
 */

import { execFileSync, spawnSync } from "node:child_process";
import {
    appendFileSync,
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    realpathSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
    buildGraphs,
    buildInput,
    failingFiles,
    loadRules,
    measuredOf,
    repoPath,
    selectChange,
    selectedCommand,
    selectStories,
    shardRuns,
    shardSpecs,
} from "./test-select.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = /\.[cm]?[jt]sx?$/u;
const STORY_SIDE = /(\.stories\.[cm]?[jt]sx?$|\/stories\/)/u;
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
 * A broken copy of a file for --stories: a code file throws on import only on a story's page (its URL has an
 * `id`), so the capture's preview.extract() (iframe.html, no id), which loads every story file, still lists the
 * stories and only the stories whose page loads the file fail to render; a data file breaks as in mutant().
 * @param path repo-relative path
 * @param text its contents
 * @returns the broken contents
 */
export function storyMutantText(path, text) {
    if (CODE.test(path)) {
        return `${text}\nif (new URLSearchParams(globalThis.location?.search ?? "").has("id")) {\n    throw new Error("select-mutant");\n}\n`;
    }
    return mutant(path, text);
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

/**
 * Where a run named `name` works and reports, so runs with different names never share either.
 * @param main the main checkout
 * @param name the --name, or null
 * @param worktree the --worktree directory name, or null (overrides the one the name gives)
 * @returns `{ worktree, report }` absolute paths; throws on a name that is not one plain directory name, since
 *   the worktree is reset and cleaned (`--name /../..` would otherwise reset the main checkout)
 */
export function runPaths(main, name, worktree) {
    for (const [flag, v] of [
        ["--name", name],
        ["--worktree", worktree],
    ]) {
        if (v != null && !/^[\w-][\w.-]*$/.test(v)) {
            throw new Error(
                `${flag} must be a plain directory name (letters, digits, - _ .), not ${JSON.stringify(v)}`,
            );
        }
    }
    return {
        worktree: join(main, ".worktrees", worktree ?? (name ? `select-mutate-${name}` : "select-mutate")),
        report: join(main, "tmp", "select-mutate", name ?? "default", "report.txt"),
    };
}

let reportFile = null;

/**
 * Prints a line and appends it to the run's report.
 * @param parts what console.log would print
 */
function log(...parts) {
    console.log(...parts);
    if (reportFile) {
        appendFileSync(reportFile, `${parts.join(" ")}\n`);
    }
}

class BuildBroken extends Error {}

function mainCheckout() {
    return dirname(
        execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
            cwd: HERE,
            encoding: "utf8",
        }).trim(),
    );
}

function scratch(head, main, wt) {
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
 * A function that breaks some of a batch's files and puts the rest back, then builds the package the reader
 * loads through its build when the broken set changed (nx's cache restores the unbroken build).
 * @param wt the scratch worktree
 * @param files the batch's repo-relative files
 * @param rebuild the package to build, or null
 * @returns `(broken) => void`; throws BuildBroken when the package does not build
 */
function breaker(wt, files, rebuild) {
    // kept as bytes, so a binary file (a font) is put back exactly
    const originals = new Map(files.map((f) => [f, readFileSync(join(wt, f))]));
    let builtWith = "";
    return (broken) => {
        files.forEach((f) =>
            writeFileSync(
                join(wt, f),
                broken.includes(f) ? mutant(f, originals.get(f).toString("utf8")) : originals.get(f),
            ),
        );
        const key = broken.join("\n");
        if (!rebuild || key === builtWith) {
            return;
        }
        builtWith = key;
        const r = spawnSync(
            "pnpm",
            ["exec", "nx", "run", `${rebuild}:build`, "--exclude-task-dependencies", "--outputStyle=static"],
            { cwd: wt, encoding: "utf8", maxBuffer: 1 << 28 },
        );
        if (r.status !== 0) {
            throw new BuildBroken(`${rebuild} does not build with ${broken.join(", ") || "nothing"} broken`);
        }
    };
}

/**
 * The run of a shard with the whole batch broken, or null (printed) when the package does not build with
 * it (the gate stops at the build; no test could run) or the run printed no summary.
 * @param shard the shard
 * @param run () => failing() of the batch
 * @param put breaker() of the batch
 * @returns the run or null
 */
function firstRun(shard, run, put) {
    try {
        const r = run();
        if (r.summary) {
            return r;
        }
        log(`${shard.shard}: INCONCLUSIVE, the run printed no summary`);
    } catch (e) {
        if (!(e instanceof BuildBroken)) {
            throw e;
        }
        log(`${shard.shard}: SKIPPED, ${e.message}`);
        put([]);
    }
    return null;
}

/**
 * Breaks a batch of files, runs the shards once and reports what the selection missed.
 * @param m what to mutate
 * @param m.wt the scratch worktree
 * @param m.files the repo-relative files to break together
 * @param m.shards the plain shards to run, one per command
 * @param m.allShards every shard of the matrix
 * @param m.graphs buildGraphs() of the unbroken packages
 * @param m.rebuild the package to build after breaking files (the reader loads it through its build), or null
 * @returns `{ misses, inconclusive }`
 */
async function mutateBatch({ wt, files, shards, allShards, graphs, rebuild }) {
    const sels = new Map();
    for (const f of files) {
        // asked about every shard, so every package is one (a file of another package is not a root file)
        sels.set(f, measuredOf((await selectChange(wt, [f], allShards, graphs)).shards));
    }
    const chosen = (f, shard) => {
        const s = sels.get(f).find((x) => x.shard === shard.shard);
        return s.mode === "all" ? null : new Set(s.files.map((x) => x.file));
    };
    const put = breaker(wt, files, rebuild);
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
        log(`  ${f}: ${what.join(" ")}`);
    }
    let misses = 0;
    let inconclusive = 0;
    for (const shard of shards) {
        const run = firstRun(shard, () => failing(shard, null, files), put);
        if (!run) {
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
        log(
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
            log(`${shard.shard}: flaky ${f} (fails unbroken)`);
        } else if (by.length === 0) {
            log(`${shard.shard}: ${f} fails only with several of ${g.non.join(" ")} broken together`);
            inconclusive++;
        } else {
            by.forEach((m) => found.push(`${m} -> ${f}`));
        }
    }
    return { found, inconclusive };
}

/**
 * The changed stories a selection did not run.
 * @param changed story ids whose capture changed
 * @param sel the project's selectStories() entry
 * @param fileOf (story id) => its repo-relative story file, or undefined
 * @returns the ids not selected
 */
export function storiesMissed(changed, sel, fileOf) {
    if (sel.mode === "all") {
        return [];
    }
    return changed.filter((id) => !sel.baselines.includes(id) && !sel.files.includes(fileOf(id)));
}

/**
 * Whether a selection runs every story of the project, so no story can be missed.
 * @param sel the project's selectStories() entry
 * @param storyFileSet every repo-relative story file of the project
 * @returns true for mode "all", or a file list that holds every story file
 */
export function selectsEveryStory(sel, storyFileSet) {
    return sel.mode === "all" || [...storyFileSet].every((f) => sel.files.includes(f));
}

/**
 * Story id -> repo-relative story file, from a built Storybook's index.json.
 * @param index the parsed index.json
 * @param root the directory Storybook was built from, repo-relative (its package: graph-io-fidelity's
 *   importPaths are relative to graph-io/, not to its config directory)
 * @returns a Map
 */
export function storyFiles(index, root) {
    const out = new Map();
    for (const e of Object.values(index.entries ?? {})) {
        if (e.type === "story") {
            out.set(e.id, join(root, e.importPath));
        }
    }
    return out;
}

/**
 * The files --stories may break: the package's source and story files (never its tests, docs or Storybook
 * setup, which runs every story: stories.projectGlobal), and the source of every workspace package it depends
 * on, directly or through another (a story can draw with a dependency no test of the package reaches), and of
 * the packages that draw the project (stories.drawnBy) and their dependencies.
 * @param wt the scratch worktree
 * @param pkg the package
 * @param drawnBy packages that draw the project's stories beside pkg (stories.drawnBy)
 * @returns repo-relative paths
 */
export function storyCandidates(wt, pkg, drawnBy = []) {
    // devDependencies only of the project's own packages: a dependency's dev-only packages draw no story
    const directDeps = (p, dev) => {
        const m = JSON.parse(readFileSync(join(wt, p, "package.json"), "utf8"));
        return Object.keys({ ...m.dependencies, ...(dev ? m.devDependencies : {}), ...m.peerDependencies })
            .filter((d) => d.startsWith("@graphty/"))
            .map((d) => d.slice("@graphty/".length))
            .filter((d) => existsSync(join(wt, d, "package.json")));
    };
    const seen = new Set([pkg]);
    const queue = [pkg, ...drawnBy.filter((d) => existsSync(join(wt, d, "package.json")))];
    queue.forEach((d) => seen.add(d));
    const own = new Set(queue);
    // for-of visits what the loop pushes, so this walks the whole closure
    for (const p of queue) {
        for (const d of directDeps(p, own.has(p))) {
            if (!seen.has(d)) {
                seen.add(d);
                queue.push(d);
            }
        }
    }
    const deps = [...seen].filter((d) => d !== pkg);
    const story = (f) => STORY_SIDE.test(f) && !/\/\.storybook\//u.test(f) && !/\.(test|spec)\./u.test(f);
    const files = execFileSync("git", ["ls-files", "--", pkg, ...deps], { cwd: wt, encoding: "utf8" })
        .split("\n")
        .filter((f) => f && (CODE.test(f) || DATA.test(f)) && !f.endsWith(".d.ts"))
        .filter((f) => {
            const own = f.startsWith(`${pkg}/`);
            const src = f.startsWith(`${f.split("/")[0]}/src/`) && buildInput(f.slice(f.indexOf("/") + 1));
            return src || (own && story(f));
        });
    return [...files, ...storySideImports(wt, files.filter(story), new Set(files))];
}

/**
 * The files outside every package's source that the story files import by relative path, directly or through
 * another such file: test-side helpers and data a story draws with (graph-io-fidelity's stories load
 * graphty-element/test/fidelity/ and graph-io/test/corpus/). Never a test file or the Storybook setup.
 * @param wt the scratch worktree
 * @param stories repo-relative story files
 * @param known files already candidates (never returned, never walked)
 * @returns repo-relative paths
 */
export function storySideImports(wt, stories, known) {
    const out = [];
    const seen = new Set(known);
    const queue = [...stories];
    // for-of visits what the loop pushes, so this walks the whole closure
    for (const f of queue) {
        const text = readFileSync(join(wt, f), "utf8");
        // `from "..."`, `import("...")` and a bare `import "..."`
        for (const m of text.matchAll(/(?:from|import\s*\(?)\s*["'](\.{1,2}\/[^"'?]+)/gu)) {
            const base = join(dirname(f), m[1]);
            // a "./x.js" specifier names x.ts, as TypeScript resolves it
            const hit = ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.js"]
                .flatMap((e) => [base + e, base.replace(/\.js$/u, ".ts") + e])
                .find((c) => existsSync(join(wt, c)) && statSync(join(wt, c)).isFile());
            const ok =
                hit &&
                !hit.startsWith("..") &&
                !seen.has(hit) &&
                (CODE.test(hit) || DATA.test(hit)) &&
                !hit.endsWith(".d.ts") &&
                !/\.(test|spec)\./u.test(hit) &&
                !/\/\.storybook\//u.test(hit);
            if (ok) {
                seen.add(hit);
                out.push(hit);
                if (CODE.test(hit)) {
                    queue.push(hit);
                }
            }
        }
    }
    return out;
}

/**
 * Breaks one file, captures the whole Storybook and checks that every changed story was selected.
 * @param c storiesMain()'s context: wt, project, cfg, SHARDS, graphs, rules, build, capture, changedIds, ref, fileOf
 * @param n the mutant's number
 * @param f the repo-relative file
 * @returns `{ misses, inconclusive, checked, allSelected }`, checked 0 when the file was skipped
 */
async function storyMutant(c, n, f) {
    const change = await selectChange(c.wt, [f], c.SHARDS, c.graphs);
    const sel = selectStories({
        projects: c.cfg,
        changed: [f],
        everything: change.everything,
        shards: c.SHARDS,
        selection: measuredOf(change.shards),
        rules: c.rules,
        graphs: c.graphs,
        lockMoved: false,
    }).find((p) => p.project === c.project);
    const what = sel.mode === "files" ? sel.files.length + " story file(s)" : sel.mode;
    log(`Mutant ${n}: ${f}: ${what}`);
    if (selectsEveryStory(sel, new Set(c.fileOf.values()))) {
        // every story runs, so nothing can be missed: not a test of the selector, and not worth a build
        log("  ALL-SELECTED (no miss possible)");
        return { misses: 0, inconclusive: 0, checked: 0, allSelected: 1 };
    }
    const original = readFileSync(join(c.wt, f));
    writeFileSync(join(c.wt, f), storyMutantText(f, original.toString("utf8")));
    let broken;
    try {
        // a second try, so a browser that failed to start is not taken for an unloadable Storybook
        broken =
            c.build().status === 0
                ? ((await c.capture(`mutant-${n}`, null)) ?? (await c.capture(`mutant-${n}-retry`, null)))
                : "unbuilt";
    } finally {
        writeFileSync(join(c.wt, f), original);
    }
    if (broken === "unbuilt") {
        log("  SKIPPED: the Storybook does not build with it broken (the Storybooks build job fails the change)");
        return { misses: 0, inconclusive: 0, checked: 0 };
    }
    // a failed rebuild would leave the broken Storybook in place and call every miss flaky
    const recapture = async (ids) => (c.build().status === 0 ? await c.capture(`mutant-${n}-unbroken`, ids) : null);
    if (!broken) {
        // the mutant throws on import, and the capture loads every story file, so a break any story reaches fails
        // the whole capture (CI's too, whatever was selected) and says nothing about which stories it changed
        log("  SKIPPED: the broken Storybook cannot be captured (an import-time break fails every capture)");
        return { misses: 0, inconclusive: 0, checked: 0 };
    }
    const changed = c.changedIds(c.ref, broken);
    const missed = storiesMissed(changed, sel, (id) => c.fileOf.get(id));
    let found = [];
    let flaky = new Set();
    if (changed.length > 0) {
        // every changed story, selected or not, is captured unbroken again: one that differs there too is noise
        // (a nondeterministic story, or one that never captures), not the mutant's doing
        const again = await recapture(changed);
        if (!again) {
            log("  INCONCLUSIVE: the unbroken Storybook could not be built or captured again");
            return { misses: 0, inconclusive: 1, checked: 1 };
        }
        // --stories matches by prefix, so the capture can hold stories that did not change
        const only = (r) => ({ ...r, items: r.items.filter((i) => changed.includes(i.id)) });
        flaky = new Set(c.changedIds(only(c.ref), only(again)));
        flaky.forEach((id) => log(`  flaky ${id} (its unbroken capture differs too)`));
        found = missed.filter((id) => !flaky.has(id));
    }
    if (changed.every((id) => flaky.has(id))) {
        // a break no picture shows (tree-shaken, drawn by no story, or only noise) tests nothing
        log("  SKIPPED: the break changed no story's capture");
        return { misses: 0, inconclusive: 0, checked: 0 };
    }
    const list = found.map((id) => id + " (" + c.fileOf.get(id) + ")").join(", ");
    log(
        `  ${changed.length} stories changed, ${changed.length - missed.length} of them selected` +
            (found.length > 0 ? ", MISSED: " + list : ""),
    );
    return { misses: found.length, inconclusive: 0, checked: 1 };
}

/**
 * Story selection's check for one visual-review project (--stories); see the file comment.
 * @param project the project id
 * @param opt (flag, default) => its value
 * @returns the exit code
 */
async function storiesMain(project, opt) {
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: HERE, encoding: "utf8" }).trim();
    const main = mainCheckout();
    const paths = runPaths(main, opt("--name", `stories-${project}`), opt("--worktree", null));
    mkdirSync(dirname(paths.report), { recursive: true });
    writeFileSync(paths.report, "");
    reportFile = paths.report;
    log(`test-select-mutate --stories ${project} at ${head}, worktree ${paths.worktree}`);
    const wt = scratch(head, main, paths.worktree);
    const cfg = JSON.parse(readFileSync(join(wt, "visual-review.config.json"), "utf8")).projects;
    if (!cfg[project]) {
        log(`no visual-review project ${project}; projects: ${Object.keys(cfg).join(", ")}`);
        return 2;
    }
    const dir = cfg[project].storybook.replace(/\/storybook-static$/u, "");
    const pkg = dir.split("/")[0];
    const { SHARDS } = await import(pathToFileURL(join(wt, "tools/ci-test-matrix.mjs")).href);
    log("Building every package...");
    execFileSync("pnpm", ["exec", "nx", "run-many", "-t", "build", "--outputStyle=static"], {
        cwd: wt,
        stdio: "inherit",
    });
    const graphs = await buildGraphs(wt, [...new Set(SHARDS.map((s) => s.package))], SHARDS);
    const rules = { ...loadRules(wt).stories, selectProjects: [project] };
    const work = dirname(paths.report);
    // no baselines: only the captures' bytes are compared, unbroken against broken
    // with the stories' settings files (modes, delay), so each story is captured as CI captures it
    const empty = join(work, "no-baselines");
    mkdirSync(empty, { recursive: true });
    const settings = join(wt, "visual-baselines", project);
    if (existsSync(settings)) {
        readdirSync(settings)
            .filter((f) => f.endsWith(".json"))
            .forEach((f) => copyFileSync(join(settings, f), join(empty, f)));
    }
    const build = () =>
        spawnSync("bash", ["-c", cfg[project].build], { cwd: wt, encoding: "utf8", maxBuffer: 1 << 28 });
    const { parity, readResults } = await import(pathToFileURL(join(wt, "visual-review/trusted/lib/parity.mjs")).href);
    const capture = async (name, ids) => {
        const out = join(work, name);
        const args = ["visual-review/trusted/cli.mjs", "capture", "--project", project, "--out", out];
        const r = spawnSync(
            "bash",
            [
                "tools/with-browser.sh",
                process.execPath,
                ...args,
                "--baselines",
                empty,
                ...(ids ? ["--stories", ids.join(",")] : []),
            ],
            { cwd: wt, encoding: "utf8", maxBuffer: 1 << 28 },
        );
        if (r.status !== 0 || !existsSync(join(out, "results.json"))) {
            const why = (r.stdout + "\n" + r.stderr)
                .split("\n")
                .filter((l) => /error/iu.test(l) && !/^\s+at /u.test(l))
                .slice(0, 3)
                .join(" | ");
            log(`  capture ${name} failed (exit ${r.status}): ${why}`);
            return null;
        }
        return readResults(out);
    };
    // the story ids whose capture differs between two captures
    const changedIds = (a, b) => {
        const idOf = new Map([...a.items, ...b.items].map((i) => [i.file, i.id]));
        return [...new Set(parity(a, b).differences.map((d) => idOf.get(d.file)))].sort();
    };
    log(`Building and capturing the unbroken ${project} Storybook...`);
    const unbroken = build();
    if (unbroken.status !== 0) {
        log(`the unbroken ${project} Storybook does not build:\n${unbroken.stderr.slice(-2000)}`);
        return 2;
    }
    const fileOf = storyFiles(JSON.parse(readFileSync(join(wt, cfg[project].storybook, "index.json"), "utf8")), pkg);
    const ref = await capture("unbroken", null);
    if (!ref) {
        return 2;
    }
    log(`${ref.items.length} captures of ${fileOf.size} stories`);
    const candidates = storyCandidates(wt, pkg, rules.drawnBy?.[project] ?? []);
    const given = opt("--files", null);
    const picked = given
        ? given.split(",")
        : seededPick(candidates, Number(opt("--count", "5")), Number(opt("--seed", "1")));
    const ctx = { wt, project, cfg, SHARDS, graphs, rules, build, capture, changedIds, ref, fileOf };
    let misses = 0;
    let inconclusive = 0;
    let checked = 0;
    let allSelected = 0;
    for (const [n, f] of picked.entries()) {
        const r = await storyMutant(ctx, n + 1, f);
        misses += r.misses;
        inconclusive += r.inconclusive;
        checked += r.checked;
        allSelected += r.allSelected ?? 0;
    }
    if (build().status !== 0) {
        log(`the scratch worktree's ${project} Storybook did not rebuild unbroken`);
    }
    const clean = misses === 0 && inconclusive === 0 && checked > 0;
    log(
        clean
            ? `No misses in ${checked} checked mutant(s) of ${project} (${allSelected} all-selected, ` +
                  `${picked.length - checked - allSelected} skipped).`
            : `${misses} miss(es), ${inconclusive} inconclusive, ${checked} of ${picked.length} mutant(s) checked ` +
                  `(${allSelected} all-selected).`,
    );
    return clean ? 0 : 1;
}

async function main(argv) {
    const opt = (name, dflt) => {
        const i = argv.indexOf(name);
        return i === -1 ? dflt : argv[i + 1];
    };
    if (argv[0] === "--stories") {
        return storiesMain(argv[1], opt);
    }
    const pkg = argv[0];
    const only = argv.flatMap((a, i) => (argv[i - 1] === "--shard" ? [a] : []));
    const reader = opt("--reader", pkg);
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: HERE, encoding: "utf8" }).trim();
    const main = mainCheckout();
    const paths = runPaths(main, opt("--name", null), opt("--worktree", null));
    mkdirSync(dirname(paths.report), { recursive: true });
    writeFileSync(paths.report, "");
    reportFile = paths.report;
    log(`test-select-mutate ${argv.join(" ")} at ${head}, worktree ${paths.worktree}`);
    const wt = scratch(head, main, paths.worktree);
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
        log(`no shard of ${reader} is a plain vitest run`);
        return 2;
    }
    log("Building every package...");
    execFileSync(
        "pnpm",
        // every package: each one's import graph resolves the others through their dist, as in the gate
        ["exec", "nx", "run-many", "-t", "build", "--outputStyle=static"],
        { cwd: wt, stdio: "inherit" },
    );
    const candidates = execFileSync("git", ["ls-files", "--", pkg], { cwd: wt, encoding: "utf8" })
        .split("\n")
        .filter((f) => f && buildInput(f.slice(pkg.length + 1)) && (CODE.test(f) || DATA.test(f)))
        .filter((f) => reader === pkg || f.startsWith(`${pkg}/src/`))
        .filter((f) => !f.endsWith(".d.ts") && !/\.config\.[cm]?[jt]s$/u.test(f));
    const given = opt("--files", null);
    const picked = given
        ? given.split(",")
        : seededPick(candidates, Number(opt("--count", "5")), Number(opt("--seed", "1")));
    // every package's graph, as the gate has them: a package without one is assumed to read anything
    const graphs = await buildGraphs(wt, [...new Set(SHARDS.map((s) => s.package))], SHARDS);
    if ((graphs.get(reader) ?? []).includes(null)) {
        log(`the import graph of ${reader} could not be built; the selection would run it whole`);
        return 2;
    }
    // the reader's graphs walk the package's source in place of its build: its tests load the build
    const rebuild =
        reader !== pkg &&
        (graphs.get(reader) ?? []).some((g) => Object.keys(g.aliases ?? {}).some((k) => k.startsWith(`${pkg}/`)))
            ? pkg
            : null;
    const size = Number(opt("--batch", "1"));
    let misses = 0;
    let inconclusive = 0;
    for (let i = 0; i < picked.length; i += size) {
        const batch = picked.slice(i, i + size);
        log(`Batch ${i / size + 1}: ${batch.length} broken file(s)`);
        const r = await mutateBatch({ wt, files: batch, shards, allShards: SHARDS, graphs, rebuild });
        misses += r.misses;
        inconclusive += r.inconclusive;
    }
    log(
        misses === 0 && inconclusive === 0
            ? `No misses in ${picked.length} mutant(s).`
            : `${misses} miss(es), ${inconclusive} inconclusive.`,
    );
    return misses === 0 && inconclusive === 0 ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = await main(process.argv.slice(2));
}
