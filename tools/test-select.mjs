#!/usr/bin/env node
/**
 * test-select.mjs -- which tests a change needs, decided from the change alone (design/ci/fast-pipeline.md,
 * section 5). It is ADVISORY: nothing runs fewer tests because of it. tools/prepush-tests.mjs logs what it
 * would have run beside what the gate ran, and tools/test-select-replay.mjs replays past landings to count
 * the failures it would have missed (design/ci/test-selection-replay.md).
 *
 * For each test shard of tools/ci-test-matrix.mjs it answers "all", "none" or a list of test files, with
 * the reasons. The same change always gives the same answer.
 *  1. Package level: a package runs whole when a package it depends on (nx's graph, which follows dist/)
 *     changed a file that goes into its build, or when a package it reads by relative path changed at
 *     all (the closure tools/prepush-inputs.mjs computes). Vite's module graph stops at dist/, so across
 *     packages there is nothing finer.
 *  2. File level, inside a changed package: the test files whose imports reach a changed file, as Vitest's
 *     own `related` mode finds them (each file transformed by the project's Vite server, its static and
 *     literal dynamic imports followed), plus what Vitest drops: imports with a query (`?raw`, `?url`,
 *     `?worker`, `?inline`) and `new URL("./file", import.meta.url)`. A change reaching a project's setup
 *     files runs that whole project.
 *  3. Rules for what no import graph shows, in tools/test-select-rules.json: files that run everything,
 *     root files no shard reads, data and config folders that run the whole package, and tests that
 *     read files or run programs at run time, which run on any change to their package.
 *  4. Fail safe: a changed file that no import, rule or test accounts for runs its whole package, and so
 *     does a package whose import graph could not be built.
 *
 * Usage:
 *   node tools/test-select.mjs [--root <checkout>] [--base <ref>] [--head <ref>] [--json]
 *       the selection for the change from the merge base of <base> (default origin/golden) to <head>
 *       (default HEAD), as text or JSON
 *   node tools/test-select.mjs [--root <checkout>] --graph <package> [--config <file>]
 *       (internal) one package's import graph as JSON, built in a child process because creating a
 *       Vitest sets NODE_ENV and VITEST* in the process that does it
 */

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { pathRefs, projectGraph } from "./prepush-inputs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RULES = join(HERE, "test-select-rules.json");

/** A path that goes into a package's build: not a test, a story, a doc or a test folder. */
const TEST_SIDE = /(^|\/)(test|tests|__tests__|e2e|stories|\.storybook)\//u;
const TEST_FILE = /\.(test|spec|stories)\.[cm]?[jt]sx?$|\.test-d\.ts$|\.md$/u;
export const buildInput = (pkgPath) => !TEST_SIDE.test(pkgPath) && !TEST_FILE.test(pkgPath);

/**
 * The rules file, with nx.json's sharedGlobals added to "everything".
 * @param root the checkout
 * @returns `{ everything, noTests, wholePackage, alsoRun, opaque, readAtRunTime, fileLevel }`
 */
export function loadRules(root) {
    const raw = JSON.parse(readFileSync(RULES, "utf8"));
    const toRe = (p) => new RegExp(p, "u");
    let shared = [];
    try {
        const nx = JSON.parse(readFileSync(join(root, "nx.json"), "utf8"));
        shared = (nx.namedInputs?.sharedGlobals ?? []).map((g) => globToRe(g.replace("{workspaceRoot}/", "")));
    } catch {
        // no nx.json: only the listed patterns
    }
    return {
        everything: [...raw.everything.patterns.map(toRe), ...shared],
        noTests: raw.noTests.patterns.map(toRe),
        wholePackage: raw.wholePackage.patterns.map(toRe),
        alsoRun: raw.alsoRun.entries.map((e) => ({ re: toRe(e.pattern), packages: e.packages, why: e.why })),
        opaque: toRe(raw.opaqueTest.pattern),
        readAtRunTime: toRe(raw.readAtRunTime.pattern),
        fileLevel: new Set(raw.fileLevel.packages),
    };
}

/**
 * A RegExp for one of nx's `{workspaceRoot}` globs (`**`, `*` and literal text only).
 * @param glob the glob without its `{workspaceRoot}/` prefix
 * @returns RegExp over repo-relative paths
 */
export function globToRe(glob) {
    const token = (part) => {
        if (part.startsWith("**")) {
            return ".*";
        }
        if (part === "*") {
            return "[^/]*";
        }
        return part.replaceAll(/[.+?^${}()|[\]\\]/gu, String.raw`\$&`);
    };
    return new RegExp(
        `^${glob
            .split(/(\*\*\/?|\*)/u)
            .map(token)
            .join("")}$`,
        "u",
    );
}

/**
 * The vitest runs of a shard's command: each run's config file, --project filters and --shard slice.
 * A shard whose command runs its package's `coverage` target through nx is one run of the default config
 * over every project. null when the command is something else (a shell script).
 * @param shard a SHARDS entry
 * @returns `[{ config, projects, slice }]` or null
 */
export function shardRuns(shard) {
    const cmd = shard["test-command"];
    if (/nx run [^:\s]+:coverage/u.test(cmd)) {
        return [{ config: null, projects: [], slice: null }];
    }
    const runs = cmd.split(/vitest run|run-node-shard\.js|run-browser-project\.js/u).slice(1);
    if (runs.length === 0) {
        return null;
    }
    return runs.map((run) => ({
        config: /--config[= ](\S+)/u.exec(run)?.[1] ?? null,
        projects: [...run.matchAll(/--project=['"]?([^\s'"]+)/gu)].map((m) => m[1]),
        slice: /--shard=(\S+)/u.exec(run)?.[1] ?? null,
    }));
}

/**
 * Whether a vitest project is one a run's --project filters select (`!name` excludes).
 * @param name the project's name
 * @param filters the run's --project values (empty: every project)
 * @returns boolean
 */
export function projectSelected(name, filters) {
    const base = name.replace(/ \([a-z]+\)$/u, "");
    const plain = filters.filter((f) => !f.startsWith("!"));
    const negated = filters.filter((f) => f.startsWith("!")).map((f) => f.slice(1));
    if (negated.includes(base)) {
        return false;
    }
    return plain.length === 0 || plain.includes(base);
}

/**
 * The reverse of an import graph: file -> the files that import it.
 * @param imports file -> the files it imports
 * @returns Map of file to its importers
 */
function reverse(imports) {
    const rev = new Map();
    for (const [from, tos] of Object.entries(imports)) {
        for (const to of tos) {
            if (!rev.has(to)) {
                rev.set(to, []);
            }
            rev.get(to).push(from);
        }
    }
    return rev;
}

/**
 * Every file that reaches one of `start` through the reverse edges, `start` included.
 * @param start the changed files
 * @param rev file -> the files that import it
 * @returns Set of files
 */
function reaching(start, rev) {
    const seen = new Set(start);
    const todo = [...start];
    while (todo.length > 0) {
        for (const from of rev.get(todo.pop()) ?? []) {
            if (!seen.has(from)) {
                seen.add(from);
                todo.push(from);
            }
        }
    }
    return seen;
}

/**
 * The test files of one graph (a package under one vitest config) that a set of changed files needs.
 * @param graph a --graph result: `{ projects: { name: { specs, setup } }, imports, opaque }`
 * @param changed repo-relative changed paths inside the package
 * @returns `{ specs: Map(spec -> reason), explained: Set(changed paths it accounted for) }`
 */
export function selectInGraph(graph, changed) {
    const rev = reverse(graph.imports);
    const known = new Set(Object.keys(graph.imports));
    Object.values(graph.imports).forEach((tos) => tos.forEach((t) => known.add(t)));
    const allSpecs = new Set(Object.values(graph.projects).flatMap((p) => p.specs));
    const specs = new Map();
    const explained = new Set();
    const add = (spec, why) => specs.has(spec) || specs.set(spec, why);
    for (const file of changed) {
        if (allSpecs.has(file)) {
            add(file, "changed");
            explained.add(file);
        }
        if (known.has(file)) {
            explained.add(file);
            specsReaching(file, graph, allSpecs, rev, add);
        }
    }
    const nonTest = changed.filter((f) => !allSpecs.has(f));
    if (nonTest.length > 0) {
        for (const spec of graph.opaque ?? []) {
            add(spec, `reads files at run time; ${nonTest[0]} changed`);
        }
    }
    return { specs, explained };
}

/**
 * Adds the test files whose imports reach one changed file, and every test of a project whose setup
 * files reach it.
 * @param file a changed file the graph knows
 * @param graph a --graph result
 * @param allSpecs every test file of the graph
 * @param rev file -> the files that import it
 * @param add (spec, why) => void
 */
function specsReaching(file, graph, allSpecs, rev, add) {
    const reached = reaching([file], rev);
    for (const spec of allSpecs) {
        if (spec !== file && reached.has(spec)) {
            add(spec, `imports ${file}`);
        }
    }
    for (const [name, project] of Object.entries(graph.projects)) {
        if (project.setup.some((s) => reached.has(s))) {
            project.specs.forEach((s) => add(s, `setup of ${name} imports ${file}`));
        }
    }
}

/**
 * What a change needs, per package.
 * @param input `{ changed, packages: Map(name -> dir), deps: Map(name -> Set), refs: Map(name -> Set),
 *   graphs: Map(dir -> [graph...]), rules }`; a graph is null when it could not be built
 * @param input.changed repo-relative changed paths
 * @param input.packages Map of package name to directory
 * @param input.deps Map of package name to its nx dependencies
 * @param input.refs Map of package name to the packages its tests read by relative path
 * @param input.graphs Map of package directory to its import graphs (null where one could not be built)
 * @param input.rules loadRules()
 * @returns `{ everything: reason|null, packages: Map(dir -> { mode: "all"|"files"|"none", reasons, specs })}`
 */
export function selectPackages({ changed, packages, deps, refs, graphs, rules }) {
    const dirs = [...packages.values()];
    const pkgOf = (f) => dirs.find((d) => f.startsWith(`${d}/`));
    const out = new Map(dirs.map((d) => [d, { mode: "none", reasons: [], specs: new Map() }]));
    const whole = (dir, why) => {
        const p = out.get(dir);
        if (p && p.mode !== "all") {
            p.mode = "all";
            p.specs = new Map();
        }
        p?.reasons.push(why);
    };
    const trigger = changed.find((f) => !pkgOf(f) && rules.everything.some((re) => re.test(f)));
    if (trigger) {
        dirs.forEach((d) => whole(d, `${trigger} changes how every shard runs`));
        return { everything: trigger, packages: out, unexplainedRoot: [] };
    }
    const unexplainedRoot = rootFiles(
        changed.filter((f) => !pkgOf(f)),
        { rules, dirs, graphs, out, whole },
    );
    for (const f of changed) {
        for (const a of rules.alsoRun.filter((e) => e.re.test(f))) {
            a.packages.forEach((d) => whole(d, `${f}: ${a.why}`));
        }
    }
    dependents({ changed, packages, deps, refs, pkgOf, whole });
    for (const dir of dirs) {
        filesInPackage(dir, changed, graphs.get(dir), rules, out.get(dir), whole);
    }
    return { everything: null, packages: out, unexplainedRoot };
}

/**
 * Root files (outside every package). One a test imports selects the tests that reach it; one that a
 * test-side file or a test config of a package names (tests that read it at run time) runs that package
 * whole; a package whose graph is missing is searched in all its files. Anything else no test reads.
 * @param files changed root files
 * @param ctx `{ rules, dirs, graphs, out, whole }`
 * @param ctx.rules loadRules()
 * @param ctx.dirs the package directories
 * @param ctx.graphs Map of package directory to its import graphs
 * @param ctx.out each package's selection
 * @param ctx.whole marks a package to run whole
 * @returns the changed root code files no test imports or names, which run nothing; listed in the output
 *   so a replay can see whether one of them should have run something
 */
function rootFiles(files, { rules, dirs, graphs, out, whole }) {
    const unexplained = [];
    for (const f of files.filter((x) => !rules.noTests.some((re) => re.test(x)))) {
        let used = false;
        for (const dir of dirs) {
            const gs = graphs.get(dir) ?? [];
            const known = gs.length > 0 && !gs.includes(null);
            if (known && gs.some((g) => g.imports[f])) {
                used = true;
                gs.forEach((g) => selectInGraph(g, [f]).specs.forEach((why, spec) => addSpec(out.get(dir), spec, why)));
            } else if (namedBy(f, dir, known ? gs : null)) {
                used = true;
                whole(dir, `${f} is named by a test of ${dir}, which may read it at run time`);
            }
        }
        if (!used && CODE.test(f)) {
            unexplained.push(f);
        }
    }
    return unexplained;
}

const addSpec = (result, spec, why) => result.mode !== "all" && !result.specs.has(spec) && result.specs.set(spec, why);

let grepRoot = join(HERE, "..");
const contents = new Map();
/**
 * Whether a package's tests name a root file (its path, or its file name for files under tools/): in the
 * test-side files of its import graphs and its test configs, or in any of its files when it has no graph.
 * @param file a root file
 * @param dir the package
 * @param graphs its graphs, or null
 * @returns boolean
 */
function namedBy(file, dir, graphs) {
    const needle = file.startsWith("tools/") ? file.slice(file.lastIndexOf("/") + 1) : file;
    const candidates = graphs
        ? [
              ...new Set([
                  ...graphs
                      .flatMap((g) => Object.keys(g.imports))
                      .filter((f) => f.startsWith(`${dir}/`) && !f.startsWith(`${dir}/src/`)),
                  ...configFiles(grepRoot, dir),
              ]),
          ]
        : execFileSync("git", ["ls-files", "--", dir], { cwd: grepRoot, encoding: "utf8", maxBuffer: 1 << 28 })
              .split("\n")
              .filter(Boolean);
    return candidates.some((f) => {
        if (!contents.has(f)) {
            contents.set(f, safeRead(join(grepRoot, f)));
        }
        return contents.get(f).includes(needle);
    });
}

/**
 * Packages that depend on a changed package's build, or read its files by relative path, run whole.
 * @param root0 the inputs
 * @param root0.changed the changed paths
 * @param root0.packages Map of package name to directory
 * @param root0.deps Map of package name to its nx dependencies
 * @param root0.refs Map of package name to the packages its tests read by relative path
 * @param root0.pkgOf the package directory of a path
 * @param root0.whole marks a package to run whole
 */
function dependents({ changed, packages, deps, refs, pkgOf, whole }) {
    const nameOf = new Map([...packages].map(([n, d]) => [d, n]));
    const built = new Set();
    const touched = new Set();
    for (const f of changed) {
        const dir = pkgOf(f);
        if (dir) {
            touched.add(nameOf.get(dir));
            if (buildInput(f.slice(dir.length + 1))) {
                built.add(nameOf.get(dir));
            }
        }
    }
    for (const [name, dir] of packages) {
        const viaBuild = [...closure(name, deps)].find((q) => q !== name && built.has(q));
        // a package read by relative path from this one or from anything it reaches
        const read = new Set([...closure(name, deps, refs)].flatMap((p) => [...(refs.get(p) ?? [])]));
        const viaPath = [...read].find((q) => q !== name && touched.has(q));
        if (viaBuild) {
            whole(dir, `depends on ${viaBuild}, whose build changed`);
        } else if (viaPath) {
            whole(dir, `reads files of ${viaPath} by relative path`);
        }
    }
}

/**
 * A package and everything it reaches through the given edges.
 * @param name a package name
 * @param edges Maps of package name to package names
 * @returns Set of package names, the package included
 */
function closure(name, ...edges) {
    const seen = new Set([name]);
    const todo = [name];
    while (todo.length > 0) {
        const p = todo.pop();
        for (const e of edges) {
            for (const q of e.get(p) ?? []) {
                if (!seen.has(q)) {
                    seen.add(q);
                    todo.push(q);
                }
            }
        }
    }
    return seen;
}

/**
 * File-level selection inside one package, or the whole package when a rule or the fail safe says so.
 * @param dir the package directory
 * @param changed repo-relative changed paths
 * @param graphs Map of package directory to its import graphs (null where one could not be built)
 * @param rules loadRules()
 * @param result the package's selection, updated in place
 * @param whole marks a package to run whole, with the reason
 */
function filesInPackage(dir, changed, graphs, rules, result, whole) {
    const mine = changed.filter((f) => f.startsWith(`${dir}/`));
    if (mine.length > 0 && result.mode !== "all") {
        pickFiles(dir, mine, graphs, rules, result, whole);
    }
    if (result.mode !== "all") {
        result.mode = result.specs.size > 0 ? "files" : "none";
        // decided file by file: a "none" here is a changed package none of whose tests reach the change
        result.fileLevel = result.mode === "files" || mine.length > 0;
        if (result.mode === "none" && mine.length > 0) {
            result.reasons.push("no test imports or reads what changed");
        }
    }
}

/**
 * The tests of one package that its own changed files need, or the whole package. A changed data file
 * (rules.readAtRunTime) that no test imports can only be read at run time, so the package's tests that
 * read files cover it (selectInGraph adds them for any change that is not a test); a changed code file
 * that no test imports, and any file in a package without a graph, run the whole package.
 * @param dir the package directory
 * @param mine the package's changed files
 * @param graphs Map of package directory to its import graphs (null where one could not be built)
 * @param rules loadRules()
 * @param result the package's selection, updated in place
 * @param whole marks a package to run whole, with the reason
 */
function pickFiles(dir, mine, graphs, rules, result, whole) {
    const ruled = mine.find((f) => wholePackageRule(f.slice(dir.length + 1), rules));
    if (ruled) {
        whole(dir, `${ruled} matches a whole-package rule`);
        return;
    }
    if (!graphs || graphs.length === 0 || graphs.includes(null)) {
        whole(dir, "its import graph could not be built");
        return;
    }
    const explained = new Set();
    for (const g of graphs) {
        const sel = selectInGraph(g, mine);
        sel.explained.forEach((f) => explained.add(f));
        sel.specs.forEach((why, spec) => addSpec(result, spec, why));
    }
    const unexplained = mine.find((f) => !explained.has(f) && !rules.readAtRunTime.test(f));
    if (unexplained) {
        whole(dir, `${unexplained} is in no test's import graph and no rule covers it`);
    }
}

/**
 * Whether a package-relative path matches a whole-package rule. A code file under src/ never does: the
 * import graph judges it (a data-source folder such as src/data/ holds code, not data), and the fail safe
 * still runs the whole package when no test imports it.
 * @param rel the path inside its package
 * @param rules loadRules()
 * @returns boolean
 */
export function wholePackageRule(rel, rules) {
    if (rel.startsWith("src/") && CODE.test(rel)) {
        return false;
    }
    return rules.wholePackage.some((re) => re.test(rel));
}

/**
 * Per shard: "all", "none" or the selected test files that its vitest runs select.
 *
 * File-level selection is adopted package by package (design/ci/fast-pipeline.md section 5.1, item 2):
 * a shard whose package is not in `allowed`, or whose runs include a browser project (browsers are a lane,
 * not file selection), runs whole wherever its package was judged file by file. Its file-level answer is
 * kept as `measured`, so the replay can show it before it is allowed.
 * @param shards SHARDS entries (the gate's or CI's)
 * @param packages selectPackages(...).packages
 * @param graphs Map(dir -> [graph...])
 * @param allowed Set of package directories where file-level selection is allowed; omitted, every one is
 * @returns `[{ shard, package, mode, files, total, reasons, measured? }]`; total is the shard's test file
 *   count when known; measured `{ mode, files }` is the file-level answer where it was not allowed
 */
export function selectShards(shards, packages, graphs, allowed) {
    return shards.map((shard) => {
        const p = packages.get(shard.package) ?? { mode: "all", reasons: ["unknown package"], specs: new Map() };
        const runs = shardRuns(shard);
        const gs = graphs.get(shard.package) ?? [];
        const own = runs && gs.length > 0 && !gs.includes(null) ? shardSpecs(runs, gs) : null;
        const base = { shard: shard.shard, package: shard.package, total: own ? own.specs.size : null };
        const sel = measuredShard(p, own);
        if (!p.fileLevel || sel.mode === "all") {
            return { ...base, ...sel };
        }
        const why = notAllowed(shard.package, own, allowed);
        if (!why) {
            return { ...base, ...sel };
        }
        return { ...base, mode: "all", files: [], reasons: [why], measured: { mode: sel.mode, files: sel.files } };
    });
}

/**
 * One shard's answer from its package's selection.
 * @param p the package's selection
 * @param own shardSpecs() or null
 * @returns `{ mode, files, reasons }`
 */
function measuredShard(p, own) {
    if (p.mode !== "files") {
        return { mode: p.mode, files: [], reasons: p.reasons };
    }
    if (!own) {
        return { mode: "all", files: [], reasons: ["its command is not a vitest run the selector can read"] };
    }
    const files = [...p.specs].filter(([spec]) => own.specs.has(spec)).map(([spec, why]) => ({ file: spec, why }));
    return { mode: files.length > 0 ? "files" : "none", files, reasons: [] };
}

/**
 * Why a shard may not use file-level selection yet, or null when it may.
 * @param pkg the shard's package directory
 * @param own shardSpecs() or null
 * @param allowed Set of package directories, or undefined for all
 * @returns a reason or null
 */
function notAllowed(pkg, own, allowed) {
    if (allowed && !allowed.has(pkg)) {
        return "file-level selection is not yet allowed for this package (measured only)";
    }
    if (allowed && own?.browser !== false) {
        return "it runs a browser project, which runs whole (measured only)";
    }
    return null;
}

/**
 * Every test file a shard's runs could run (before the --shard slice), and whether any of its projects
 * runs in a browser.
 * @param runs shardRuns()
 * @param graphs Map of package directory to its import graphs (null where one could not be built)
 * @returns `{ specs: Set of repo-relative test files, browser: boolean }`; a graph from before the
 *   browser flag counts as a browser project
 */
function shardSpecs(runs, graphs) {
    const specs = new Set();
    let browser = false;
    for (const run of runs) {
        const g = graphs.find((x) => (run.config ? x.config === run.config : x.config === null)) ?? graphs[0];
        for (const [name, project] of Object.entries(g?.projects ?? {})) {
            if (projectSelected(name, run.projects)) {
                project.specs.forEach((s) => specs.add(s));
                browser ||= project.browser !== false;
            }
        }
    }
    return { specs, browser };
}

/**
 * Estimated seconds of a selection: a shard that runs whole takes its usual time, a file selection its
 * share of the shard's test files, none takes nothing.
 * @param selection selectShards(...)
 * @param seconds Map(shard -> usual seconds)
 * @returns `{ full, selected }` over the shards with a known time
 */
export function estimate(selection, seconds) {
    let full = 0;
    let selected = 0;
    for (const s of selection) {
        const t = seconds.get(s.shard);
        if (t === undefined) {
            continue;
        }
        full += t;
        if (s.mode === "all") {
            selected += t;
        } else if (s.mode === "files") {
            selected += s.total ? (t * Math.min(s.files.length, s.total)) / s.total : t;
        }
    }
    return { full: Math.round(full), selected: Math.round(selected) };
}

/**
 * A selection with each shard's file-level answer in place of the whole-shard run it was not yet allowed.
 * @param selection selectShards(...)
 * @returns the same shape
 */
export const measuredOf = (selection) => selection.map((s) => (s.measured ? { ...s, ...s.measured } : s));

// --- building the import graph of one package, in a child process ------------------------------------

const NEW_URL = /new\s+URL\(\s*["'`](\.{1,2}\/[^"'`$]+)["'`]\s*,\s*import\.meta\.url\s*\)/gu;
const CODE = /\.[cm]?[jt]sx?$|\.vue$|\.svelte$/u;

/**
 * The import graph of a package under one vitest config, the way Vitest's `related` mode walks it
 * (vitest 4.1.11, TestSpecifications.getTestDependencies), keeping the edges it drops.
 * @param root the checkout
 * @param pkg the package directory
 * @param config a config file (relative to the package) or null for the default
 * @returns `{ package, config, projects, imports, opaque }`, paths repo-relative
 */
async function buildGraph(root, pkg, config) {
    const dir = join(root, pkg);
    const { createVitest } = await import(
        pathToFileURL(createRequire(join(dir, "package.json")).resolve("vitest/node"))
    );
    process.chdir(dir);
    const vitest = await createVitest("test", { watch: false, ...(config ? { config } : {}) }, {}, {});
    const rel = (f) => relative(root, f);
    const imports = {};
    const projects = {};
    try {
        const walked = new Set();
        const walk = (project, file) => walkFile(project, file, { walked, imports, rel });
        for (const spec of await vitest.globTestSpecifications()) {
            const name = spec.project.name;
            projects[name] ??= { specs: [], setup: [] };
            projects[name].specs.push(rel(spec.moduleId));
            await walk(spec.project, spec.moduleId);
        }
        for (const project of vitest.projects) {
            projects[project.name] ??= { specs: [], setup: [] };
            projects[project.name].browser = Boolean(project.config.browser?.enabled);
            for (const s of project.config.setupFiles ?? []) {
                projects[project.name].setup.push(rel(s));
                await walk(project, s);
            }
        }
    } finally {
        await vitest.close();
    }
    return { package: pkg, config, projects, imports, opaque: opaqueSpecs(root, pkg, projects, imports) };
}

/**
 * One file's edges, then its imports' (memoised across every test of the package).
 * @param project the Vitest project whose Vite server transforms the file
 * @param file an absolute path
 * @param ctx shared state of the run
 */
async function walkFile(project, file, ctx) {
    if (ctx.walked.has(file)) {
        return;
    }
    ctx.walked.add(file);
    const deps = CODE.test(file) ? await edgesOf(project, file) : new Set();
    ctx.imports[ctx.rel(file)] = [...deps].map(ctx.rel);
    for (const d of deps) {
        await walkFile(project, d, ctx);
    }
}

/**
 * One code file's edges: what Vite's transform says it imports (static and literal dynamic imports, with
 * any `?raw`-style query dropped), plus `new URL("./file", import.meta.url)`.
 * @param project the Vitest project whose Vite server transforms the file
 * @param file an absolute path
 * @returns Set of absolute paths of files in the checkout
 */
async function edgesOf(project, file) {
    const deps = new Set();
    let transformed = null;
    try {
        const env = project.vite.environments.ssr;
        transformed = env.moduleGraph.getModuleById(file)?.transformResult || (await env.transformRequest(file));
    } catch {
        // a file Vite cannot transform is a leaf; the fail safe covers what it hides
    }
    for (const dep of [...(transformed?.deps ?? []), ...(transformed?.dynamicDeps ?? [])]) {
        const path = (dep.startsWith("/@fs/") ? dep.slice(4) : join(project.config.root, dep)).split("?", 1)[0];
        if (!path.includes("node_modules") && isFile(path)) {
            deps.add(path);
        }
    }
    for (const m of safeRead(file).matchAll(NEW_URL)) {
        const path = join(dirname(file), m[1]);
        if (isFile(path)) {
            deps.add(path);
        }
    }
    return deps;
}

const isFile = (p) => {
    try {
        return statSync(p).isFile();
    } catch {
        return false;
    }
};
const safeRead = (p) => {
    try {
        return readFileSync(p, "utf8");
    } catch {
        return "";
    }
};

/**
 * Test files whose own files (in the package, outside src/) read files or run programs at run time.
 * @param root the checkout
 * @param pkg the package directory
 * @param projects project name -> its test files and setup files
 * @param imports file -> the files it imports
 * @returns the test files that read files or run programs
 */
function opaqueSpecs(root, pkg, projects, imports) {
    const rules = loadRules(root);
    const reads = (f) =>
        f.startsWith(`${pkg}/`) && !f.startsWith(`${pkg}/src/`) && rules.opaque.test(safeRead(join(root, f)));
    const cache = new Map();
    const isOpaque = (spec) => {
        const seen = new Set([spec]);
        const todo = [spec];
        while (todo.length > 0) {
            const f = todo.pop();
            if (!cache.has(f)) {
                cache.set(f, reads(f));
            }
            if (cache.get(f)) {
                return true;
            }
            for (const d of imports[f] ?? []) {
                if (!seen.has(d)) {
                    seen.add(d);
                    todo.push(d);
                }
            }
        }
        return false;
    };
    return [...new Set(Object.values(projects).flatMap((p) => p.specs))].filter(isOpaque);
}

// --- advisory mode in the pre-push gate ------------------------------------------------------------------

/**
 * Starts the selector beside the gate's test shards (tools/prepush-tests.mjs). It changes nothing the
 * gate runs: when the shards are done, report() prints what the selector would have run and how long
 * that would have taken, and appends both, with what the gate actually ran and the test files that
 * failed, to <main checkout>/tmp/test-select/advisory.jsonl for the replay. PREPUSH_SELECT_ADVISORY=0
 * turns it off.
 *
 * The change is measured from PREPUSH_SELECT_BASE when it is set (tools/land.mjs sets it to the golden
 * tip a landing's push replaces, so the record is about the landed branch, not about everything golden
 * has not shipped yet), else from the gate's own base. The selector runs at the lowest CPU priority in
 * its own process group, so it does not slow the shards it runs beside and report() stops all of it.
 * @param root the checkout under test
 * @param base the commit the gate compares the push with
 * @param main the main checkout
 * @returns `{ report(results), closed }`; results are `[{ shard, ok, secs, log }]` of the shards the gate
 *   ran; closed settles when the selector has exited
 */
export function startAdvisory(root, base, main) {
    const asked = process.env.PREPUSH_SELECT_BASE;
    const selectBase = asked && isCommit(root, asked) ? asked : base;
    if (!selectBase || process.env.PREPUSH_SELECT_ADVISORY === "0") {
        return { report: () => {}, closed: Promise.resolve() };
    }
    let out = "";
    let done = false;
    const args = [fileURLToPath(import.meta.url), "--root", root, "--base", selectBase, "--json"];
    const child = spawn("nice", ["-n", "19", process.execPath, ...args], {
        cwd: root,
        detached: true,
        stdio: ["ignore", "pipe", "ignore"],
        env: { ...process.env, GRAPHTY_TEST_SLOTS: "0" },
    });
    child.stdout.on("data", (d) => (out += d));
    const closed = new Promise((resolve) => {
        child.on("close", resolve);
        child.on("error", resolve);
    }).then(() => (done = true));
    return {
        closed,
        report(results) {
            try {
                reportAdvisory({ root, base: selectBase, gateBase: base, main, results, done, out });
            } catch (e) {
                console.log(`Test selection (advisory): not recorded: ${e.message.split("\n")[0]}`);
            } finally {
                try {
                    process.kill(-child.pid, "SIGKILL");
                } catch {
                    // already gone
                }
            }
        },
    };
}

const isCommit = (root, ref) => {
    try {
        execFileSync("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], { cwd: root, stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
};

/**
 * Prints and records one advisory selection beside what the gate ran.
 * @param a the gate's side
 * @param a.root the checkout under test
 * @param a.base the commit the selector measured the change from
 * @param a.gateBase the commit the gate measured the change from
 * @param a.main the main checkout
 * @param a.results `[{ shard, ok, secs, log }]`
 * @param a.done whether the selector exited
 * @param a.out what it printed
 */
export function reportAdvisory({ root, base, gateBase, main, results, done, out }) {
    if (!done || !out.trim()) {
        const why = done ? "the selector failed" : "the selector had not finished when the shards did";
        console.log(`Test selection (advisory): ${why}; nothing recorded.`);
        return;
    }
    const sel = JSON.parse(out.trim().split("\n").at(-1));
    const ran = new Set(results.map((r) => r.shard));
    const mine = sel.shards.filter((s) => ran.has(s.shard));
    const seconds = new Map(results.map((r) => [r.shard, r.secs]));
    const time = estimate(mine, seconds);
    const measuredTime = estimate(measuredOf(mine), seconds);
    const recorded = results.map(({ shard, ok, secs, log }) => {
        const pkg = mine.find((s) => s.shard === shard)?.package;
        return ok || !pkg ? { shard, ok, secs } : { shard, ok, secs, failing: failingIn(pkg, log) };
    });
    const missed = advisoryMisses(recorded, mine);
    const shown = mine.map((s) => {
        const what = s.mode === "files" ? `${s.files.length}/${s.total ?? "?"}` : s.mode;
        return `${s.shard}=${what}`;
    });
    const missText = missed.map((m) => `${m.shard}: ${m.file ?? "(no test file named)"}`).join(", ");
    console.log(
        `Test selection (advisory; the gate ran every shard above): it would have run ${shown.join(", ")}; ` +
            `about ${time.selected}s of shard time instead of ${time.full}s ` +
            `(${measuredTime.selected}s with file-level selection everywhere).` +
            (missed.length > 0 ? ` It would NOT have run these failures: ${missText}.` : ""),
    );
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    const file = join(main, "tmp/test-select/advisory.jsonl");
    mkdirSync(dirname(file), { recursive: true });
    const record = {
        at: new Date().toISOString(),
        sha,
        base,
        gateBase,
        results: recorded,
        selection: mine,
        everything: sel.everything,
        unexplainedRoot: sel.unexplainedRoot ?? [],
        time,
        measuredTime,
        missed,
    };
    appendFileSync(file, JSON.stringify(record) + "\n");
}

/**
 * The failing test files of a failed shard's log, repo-relative.
 * @param pkg the shard's package directory
 * @param log the shard's log file
 * @returns repo-relative paths (empty when the log names none: a crash, a coverage threshold)
 */
function failingIn(pkg, log) {
    const text = log && existsSync(log) ? readFileSync(log, "utf8") : "";
    return failingFiles(text).files.map((f) => repoPath(pkg, f));
}

/**
 * Failures a selection would not have run, judged on its file-level answer (`measured` where it was not
 * yet allowed), so a miss shows before the package is adopted.
 * @param results recorded results, with `failing` on the failed shards
 * @param selection the shards' selection
 * @returns `[{ shard, file }]`; file null for a failure no test file is named for
 */
export function advisoryMisses(results, selection) {
    const missed = [];
    for (const r of results.filter((x) => !x.ok)) {
        const s = selection.find((x) => x.shard === r.shard);
        const m = s?.measured ?? s;
        if (!m || m.mode === "all") {
            continue;
        }
        const chosen = new Set(m.files.map((f) => f.file));
        const files = r.failing?.length ? r.failing : [null];
        missed.push(...files.filter((f) => !chosen.has(f)).map((file) => ({ shard: r.shard, file })));
    }
    return missed;
}

// Drops each terminal color code: ESC, "[", digits and semicolons, "m".
export const strip = (s) =>
    s
        .split("\u001b[")
        .map((part, i) => (i === 0 ? part : part.slice(part.indexOf("m") + 1)))
        .join("");

/**
 * The failing test files a vitest log names, relative to its package.
 * @param text a shard log or the end of one
 * @returns `{ files: string[], unhandled: boolean, summary: string|null }`
 */
export function failingFiles(text) {
    const files = new Set();
    let unhandled = false;
    for (const raw of strip(text).split("\n")) {
        const fail = /^\s*FAIL\s+(?:\|[^|]+\|\s+|[a-z-]+ \([a-z]+\)\s+|[a-z-]+\s{2,})?([^\s>]+\.[cm]?[jt]sx?)\b/u.exec(
            raw,
        );
        if (fail) {
            files.add(fail[1]);
            const story = / > (?:\.\.\/)+([^\s>]+\.stories\.[jt]sx?) > /u.exec(raw);
            if (story) {
                files.add(story[1]);
            }
        }
        const origin = /originated in "([^"]+)" test file/u.exec(raw);
        if (origin) {
            files.add(origin[1]);
        }
        if (/Unhandled Errors?|Unhandled Rejection/u.test(raw)) {
            unhandled = true;
        }
    }
    const summary = strip(text).match(/Test Files .*/u)?.[0] ?? null;
    return { files: [...files], unhandled, summary };
}

/**
 * A test file a vitest log names (relative to its package) as a repo-relative path.
 * @param pkg the package directory
 * @param file the path the log printed
 * @returns repo-relative path
 */
export const repoPath = (pkg, file) => `${pkg}/${file.replace(/^\.\.\/\.\.\//u, "")}`;

// --- the command line -----------------------------------------------------------------------------------

/**
 * Each package's graphs, one per vitest config its shards use, each built in a child process.
 * @param root the checkout
 * @param dirs package directories
 * @param shards SHARDS entries (which configs each package needs)
 * @returns Map(dir -> [graph|null...])
 */
export function buildGraphs(root, dirs, shards) {
    const graphs = new Map();
    const cache = graphCache(root);
    for (const dir of dirs) {
        const configs = new Set(
            shards.filter((s) => s.package === dir).flatMap((s) => (shardRuns(s) ?? []).map((r) => r.config)),
        );
        graphs.set(
            dir,
            [...(configs.size > 0 ? configs : [null])].map((config) =>
                cache(dir, config, () => graphChild(root, dir, config)),
            ),
        );
    }
    return graphs;
}

/**
 * Graphs kept in <main checkout>/tmp/test-select/graphs/, keyed by the package's committed tree, so a
 * package nobody changed is not walked again. A package with uncommitted changes is always walked.
 * @param root the checkout
 * @returns `(dir, config, build) => graph`
 */
function graphCache(root) {
    const git = (args) =>
        execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    let dirPath = null;
    try {
        dirPath = join(
            dirname(git(["rev-parse", "--path-format=absolute", "--git-common-dir"])),
            "tmp/test-select/graphs",
        );
    } catch {
        // not a git checkout: no cache
    }
    // the list of tests that read files is computed from the rules and kept in each graph
    const rulesHash = createHash("sha256").update(readFileSync(RULES)).digest("hex");
    return (dir, config, build) => {
        let file = null;
        try {
            if (dirPath && git(["status", "--porcelain", "--", dir]) === "") {
                const tree = git(["rev-parse", `HEAD:${dir}`]);
                const key = createHash("sha256")
                    .update([GRAPH_VERSION, rulesHash, tree, config].join("\0"))
                    .digest("hex");
                file = join(dirPath, `${dir}-${key.slice(0, 16)}.json`);
                if (existsSync(file)) {
                    return JSON.parse(readFileSync(file, "utf8"));
                }
            }
        } catch {
            file = null;
        }
        const graph = build();
        if (graph && file) {
            mkdirSync(dirPath, { recursive: true });
            writeFileSync(file, JSON.stringify(graph));
        }
        return graph;
    };
}

/** Bumped when the graph's shape or the walk changes, so cached graphs of the old walk are not used. */
const GRAPH_VERSION = 2;

/**
 * The packages each package's tests read by relative path (`../graph-io/test/...`): the references in the
 * files its tests import and in its test configs and Storybook setup. A package without a graph keeps the
 * references tools/prepush-inputs.mjs finds in all its files.
 * @param root the checkout
 * @param roots Map(project name -> dir)
 * @param graphs Map(dir -> [graph|null...])
 * @param fallback pathRefs(root, roots)
 * @returns Map(project name -> Set(project name))
 */
export function testRefs(root, roots, graphs, fallback) {
    const byDir = new Map([...roots].map(([n, d]) => [d, n]));
    const refs = new Map();
    for (const [name, dir] of roots) {
        const gs = graphs.get(dir);
        if (!gs || gs.length === 0 || gs.includes(null)) {
            refs.set(name, fallback.get(name) ?? new Set());
            continue;
        }
        const files = new Set(gs.flatMap((g) => Object.keys(g.imports)).filter((f) => f.startsWith(`${dir}/`)));
        configFiles(root, dir).forEach((f) => files.add(f));
        const found = new Set();
        for (const f of files) {
            for (const m of safeRead(join(root, f)).matchAll(/(?:\.\.\/)+[A-Za-z0-9_.@-]+/gu)) {
                const other = byDir.get(posix.normalize(posix.join(posix.dirname(f), m[0])).split("/")[0]);
                if (other && other !== name) {
                    found.add(other);
                }
            }
        }
        refs.set(name, found);
    }
    return refs;
}

/**
 * A package's test configs and Storybook setup files.
 * @param root the checkout
 * @param dir the package directory
 * @returns repo-relative paths
 */
function configFiles(root, dir) {
    const out = execFileSync("git", ["ls-files", "--", `${dir}/*.config.*`, `${dir}/.storybook/*`], {
        cwd: root,
        encoding: "utf8",
    });
    return out
        .split("\n")
        .filter((f) => f && (/\/(vite|vitest)[^/]*\.config\.[^/]+$/u.test(f) || f.includes("/.storybook/")));
}

function graphChild(root, dir, config) {
    if (!existsSync(join(root, dir, "package.json"))) {
        return null;
    }
    try {
        const out = execFileSync(
            process.execPath,
            [fileURLToPath(import.meta.url), "--root", root, "--graph", dir, ...(config ? ["--config", config] : [])],
            { cwd: root, encoding: "utf8", maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "pipe"] },
        );
        return JSON.parse(out.trim().split("\n").at(-1));
    } catch (e) {
        const why = String(e.stderr ?? e.message)
            .trim()
            .split("\n")
            .slice(-3)
            .join(" / ");
        const which = config ? `${dir} (${config})` : dir;
        console.error(`test-select: the import graph of ${which} could not be built: ${why}`);
        return null;
    }
}

/**
 * The selection for a change, with everything it needs read from the checkout.
 * @param root the checkout
 * @param changed repo-relative changed paths
 * @param shards SHARDS entries
 * @param graphs optional prebuilt graphs (Map(dir -> [graph...])); built for the changed packages otherwise
 * @returns `{ everything, packages, shards }`
 */
export async function selectChange(root, changed, shards, graphs) {
    const graph = projectGraph(root);
    if (!graph) {
        throw new Error("nx's project graph could not be read");
    }
    grepRoot = root;
    const packages = new Map([...graph.roots].filter(([, d]) => shards.some((s) => s.package === d)));
    const all = graphs ?? buildGraphs(root, [...packages.values()], shards);
    const rules = loadRules(root);
    const sel = selectPackages({
        changed,
        packages,
        deps: graph.deps,
        refs: testRefs(root, packages, all, pathRefs(root, graph.roots)),
        graphs: all,
        rules,
    });
    return { ...sel, shards: selectShards(shards, sel.packages, all, rules.fileLevel) };
}

/**
 * The changed paths from the merge base of two commits to the second.
 * @param root the checkout
 * @param base a commit-ish
 * @param head a commit-ish
 * @returns repo-relative paths
 */
export function changedFiles(root, base, head) {
    const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }).trim();
    const mb = git(["merge-base", base, head]);
    return git(["diff", "--name-only", mb, head]).split("\n").filter(Boolean);
}

/**
 * A short text form of a selection.
 * @param selection selectChange()
 * @returns text, one line per shard
 */
export function describe(selection) {
    const lines = [];
    for (const s of selection.shards) {
        const what = s.mode === "files" ? `${s.files.length} of ${s.total ?? "?"} test files` : s.mode;
        const why = s.reasons.length > 0 ? ` (${s.reasons[0]})` : "";
        lines.push(`  ${s.shard}: ${what}${why}`);
    }
    for (const f of selection.unexplainedRoot ?? []) {
        lines.push(`  (${f} is code outside every package that no test imports or names; it runs nothing)`);
    }
    return lines.join("\n");
}

async function main(argv) {
    const arg = (name) => {
        const i = argv.indexOf(name);
        return i === -1 ? undefined : argv[i + 1];
    };
    const root = arg("--root") ?? join(HERE, "..");
    if (arg("--graph")) {
        process.env.GRAPHTY_TEST_SLOTS = "0";
        const json = JSON.stringify(await buildGraph(root, arg("--graph"), arg("--config") ?? null));
        // a pipe is written asynchronously: exiting before the write is done would cut the graph short
        process.stdout.write(`${json}\n`, () => process.exit(0));
        return;
    }
    const { SHARDS } = await import(pathToFileURL(join(root, "tools/ci-test-matrix.mjs")).href);
    const changed = changedFiles(root, arg("--base") ?? "origin/golden", arg("--head") ?? "HEAD");
    const selection = await selectChange(root, changed, SHARDS);
    if (argv.includes("--json")) {
        console.log(
            JSON.stringify({
                changed: changed.length,
                everything: selection.everything,
                unexplainedRoot: selection.unexplainedRoot,
                shards: selection.shards,
            }),
        );
    } else {
        console.log(`${changed.length} changed files; what the selector would run:\n${describe(selection)}`);
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    await main(process.argv.slice(2));
}
