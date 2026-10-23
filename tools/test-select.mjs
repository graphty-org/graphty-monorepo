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
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { pathRefs, projectGraph } from "./prepush-inputs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RULES = join(HERE, "test-select-rules.json");

/** A path that goes into a package's build: not a test, a story, a doc or a test folder. */
const TEST_SIDE = /(^|\/)(test|tests|__tests__|e2e|stories|\.storybook|benchmarks?)\//u;
const TEST_FILE = /\.(test|spec|stories)\.[cm]?[jt]sx?$|\.test-d\.ts$|\.md$/u;
export const buildInput = (pkgPath) => !TEST_SIDE.test(pkgPath) && !TEST_FILE.test(pkgPath);

/**
 * The rules file, with nx.json's sharedGlobals added to "everything".
 * @param root the checkout
 * @returns `{ everything, noTests, wholePackage, alsoRun, opaque, readAtRunTime, fileLevel, fileLevelBrowser }`
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
        fileLevelBrowser: new Set(raw.fileLevelBrowser?.packages ?? []),
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
 * @param withOpaque whether a change that is not a test also runs the tests that read files at run time
 * @returns `{ specs: Map(spec -> reason), explained: Set(changed paths it accounted for) }`
 */
export function selectInGraph(graph, changed, withOpaque = true) {
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
    if (withOpaque && nonTest.length > 0) {
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
 * @param input.refs Map of package name to its literal paths into other packages (testRefs)
 * @param input.graphs Map of package directory to its import graphs (null where one could not be built)
 * @param input.rules loadRules()
 * @param input.rootImporters Map of root file to the root files that import it (rootImportGraph), optional
 * @param input.deleted Set of changed paths that no longer exist, optional
 * @returns `{ everything: reason|null, packages: Map(dir -> { mode: "all"|"files"|"none", reasons, specs })}`
 */
export function selectPackages({ changed, packages, deps, refs, graphs, rules, rootImporters, deleted }) {
    const dirs = [...packages.values()];
    const pkgOf = (f) => dirs.find((d) => f.startsWith(`${d}/`));
    const out = new Map(dirs.map((d) => [d, { mode: "none", reasons: [], specs: new Map() }]));
    // a root file stands for every root file that imports it, directly or not (tools/wait-log.mjs is read by
    // every vitest config through tools/test-slots.mjs)
    const root = withImporters(
        changed.filter((f) => !pkgOf(f)),
        rootImporters,
    );
    const whole = (dir, why) => {
        const p = out.get(dir);
        if (p && p.mode !== "all") {
            p.mode = "all";
            p.specs = new Map();
        }
        p?.reasons.push(why);
    };
    const everything = (f) => {
        dirs.forEach((d) => whole(d, `${f} changes how every shard runs`));
        return { everything: f, packages: out, unexplainedRoot: [] };
    };
    const trigger = [...root.keys()].find((f) => rules.everything.some((re) => re.test(f)));
    if (trigger) {
        return everything(root.get(trigger) === trigger ? trigger : `${root.get(trigger)} (through ${trigger})`);
    }
    const { unexplained, unknown } = rootFiles([...root.keys()], { rules, dirs, graphs, out, whole });
    // listed: the changed files themselves, not the root files that import them
    const unexplainedRoot = unexplained.filter((f) => root.get(f) === f);
    if (unknown) {
        return everything(`${unknown}, a root file no rule, import or test accounts for,`);
    }
    for (const f of changed) {
        for (const a of rules.alsoRun.filter((e) => e.re.test(f))) {
            a.packages.forEach((d) => whole(d, `${f}: ${a.why}`));
        }
    }
    dependents({ changed, packages, deps, refs, graphs, pkgOf, whole, out });
    for (const dir of dirs) {
        filesInPackage(dir, changed, graphs.get(dir), rules, out.get(dir), whole, deleted);
    }
    return { everything: null, packages: out, unexplainedRoot };
}

/**
 * Changed root files with every root file that imports one of them, transitively.
 * @param files changed root files
 * @param rootImporters Map(root file -> root files that import it), or undefined
 * @returns Map(root file -> the changed file it stands for)
 */
export function withImporters(files, rootImporters) {
    const out = new Map(files.map((f) => [f, f]));
    const todo = [...files];
    while (todo.length > 0) {
        const f = todo.pop();
        for (const by of rootImporters?.get(f) ?? []) {
            if (!out.has(by)) {
                out.set(by, out.get(f));
                todo.push(by);
            }
        }
    }
    return out;
}

/**
 * Root files (outside every package). One a test imports selects the tests that reach it; one that a
 * test-side file or a test config of a package names (tests that read it at run time) runs that package
 * whole; a package whose graph is missing is searched in all its files. Both are asked before the noTests
 * rule, so a design file a test reads is never thrown away. What is left: a noTests path runs nothing, a
 * code file under tools/ is listed as unexplained and runs nothing, and anything else is unknown, which
 * runs everything (the fail safe of design/ci/minimal-tests.md section 2.4).
 * @param files changed root files (and the root files that import them)
 * @param ctx `{ rules, dirs, graphs, out, whole }`
 * @param ctx.rules loadRules()
 * @param ctx.dirs the package directories
 * @param ctx.graphs Map of package directory to its import graphs
 * @param ctx.out each package's selection
 * @param ctx.whole marks a package to run whole
 * @returns `{ unexplained, unknown }`: the tools/ code files no test imports or names, listed so a replay
 *   can see whether one of them should have run something, and the first unknown file, or null
 */
function rootFiles(files, { rules, dirs, graphs, out, whole }) {
    const unexplained = [];
    let unknown = null;
    for (const f of files) {
        const used = dirs.map((dir) => readBy(f, dir, { graphs, out, whole })).some(Boolean);
        if (used || rules.noTests.some((re) => re.test(f)) || rules.alsoRun.some((e) => e.re.test(f))) {
            continue;
        }
        if (f.startsWith("tools/") && CODE.test(f)) {
            unexplained.push(f);
        } else {
            unknown ??= f;
        }
    }
    return { unexplained, unknown };
}

/**
 * Whether a package's tests read a root file: those that import it are selected, and a package whose tests
 * name it runs whole.
 * @param f a root file
 * @param dir the package
 * @param ctx `{ graphs, out, whole }` as rootFiles has them
 * @param ctx.graphs Map of package directory to its import graphs
 * @param ctx.out each package's selection
 * @param ctx.whole marks a package to run whole
 * @returns boolean
 */
function readBy(f, dir, { graphs, out, whole }) {
    const gs = graphs.get(dir) ?? [];
    const known = gs.length > 0 && !gs.includes(null);
    if (known && gs.some((g) => g.imports[f])) {
        gs.forEach((g) => selectInGraph(g, [f]).specs.forEach((why, spec) => addSpec(out.get(dir), spec, why)));
        return true;
    }
    if (namedBy(f, dir, known ? gs : null)) {
        whole(dir, `${f} is named by a test of ${dir}, which may read it at run time`);
        return true;
    }
    return false;
}

const addSpec = (result, spec, why) => result.mode !== "all" && !result.specs.has(spec) && result.specs.set(spec, why);

let grepRoot = join(HERE, "..");
const namesCache = new Map();
const namesByGraphs = new WeakMap();
/**
 * Whether a package's tests name a root file: a string literal in the test-side files of its import graphs
 * or its test and lint configs (in any of its files when it has no graph) holds the file's path, a folder
 * above it, or its file name for files under tools/. Leading `../` and `./` are dropped, so
 * `"../../design/documents/notes.schema.json"` names `design/documents/notes.schema.json`; a path in a
 * comment names nothing.
 * @param file a root file
 * @param dir the package
 * @param graphs its graphs, or null
 * @returns boolean
 */
function namedBy(file, dir, graphs) {
    // keyed by the graphs themselves (a package without them by its directory): each selection has its own
    const key = graphs ?? dir;
    const cache = typeof key === "string" ? namesCache : namesByGraphs;
    if (!cache.has(key)) {
        cache.set(key, namesIn(dir, graphs));
    }
    const { paths, bases } = cache.get(key);
    if (file.startsWith("tools/") && bases.has(file.slice(file.lastIndexOf("/") + 1))) {
        return true;
    }
    const parts = file.split("/");
    return parts.some((_, i) => (i === parts.length - 1 || i > 0) && paths.has(parts.slice(0, i + 1).join("/")));
}

/**
 * The paths and file names the string literals of a package's test-side files name.
 * @param dir the package
 * @param graphs its graphs, or null for every file of the package
 * @returns `{ paths: Set, bases: Set }`
 */
function namesIn(dir, graphs) {
    const candidates = graphs
        ? new Set([
              ...graphs
                  .flatMap((g) => Object.keys(g.imports))
                  .filter((f) => f.startsWith(`${dir}/`) && !f.startsWith(`${dir}/src/`)),
              ...configFiles(grepRoot, dir),
          ])
        : execFileSync("git", ["ls-files", "--", dir], { cwd: grepRoot, encoding: "utf8", maxBuffer: 1 << 28 })
              .split("\n")
              .filter(Boolean);
    const paths = new Set();
    const bases = new Set();
    for (const f of candidates) {
        for (const literal of safeRead(join(grepRoot, f)).matchAll(/["'`]([^"'`\n]+)["'`]/gu)) {
            for (const [token] of literal[1].matchAll(/[\w@.+-]+(?:\/[\w@.+-]+)*/gu)) {
                const path = token.replace(/^(?:\.{1,2}\/)+/u, "");
                paths.add(path);
                bases.add(path.slice(path.lastIndexOf("/") + 1));
            }
        }
    }
    return { paths, bases };
}

/**
 * Packages that depend on a changed package's build run whole. A package that reads another package's files
 * runs only the tests that read the changed file: the tests whose imports reach it (graphty imports
 * graphty-element's source), and the tests that reach a file holding a literal path the changed file is
 * under (`"../../graph-io/test/corpus"`); a literal in a config file, or a package without a graph, runs it
 * whole. A read that goes into the reader's own build (its source imports or names the file) counts as a
 * change to the reader's build, so its dependents run whole too.
 * @param root0 the inputs
 * @param root0.changed the changed paths
 * @param root0.packages Map of package name to directory
 * @param root0.deps Map of package name to its nx dependencies
 * @param root0.refs Map of package name to its literal paths into other packages (testRefs)
 * @param root0.graphs Map of package directory to its import graphs
 * @param root0.pkgOf the package directory of a path
 * @param root0.whole marks a package to run whole
 * @param root0.out each package's selection
 */
function dependents({ changed, packages, deps, refs, graphs, pkgOf, whole, out }) {
    const nameOf = new Map([...packages].map(([n, d]) => [d, n]));
    const built = new Set();
    for (const f of changed) {
        const dir = pkgOf(f);
        if (dir && buildInput(f.slice(dir.length + 1))) {
            built.add(nameOf.get(dir));
        }
    }
    const reads = new Map(
        [...packages].map(([name, dir]) => [
            name,
            foreignReads(name, dir, { changed, refs, graphs, pkgOf, nameOf, built: new Set(built) }),
        ]),
    );
    for (const [name, dir] of packages) {
        if (reads.get(name).some((r) => intoBuild(r.holder, dir, graphs.get(dir)))) {
            built.add(name);
        }
    }
    for (const [name, dir] of packages) {
        const viaBuild = [...closure(name, deps)].find((q) => q !== name && built.has(q));
        if (viaBuild) {
            whole(dir, `depends on ${viaBuild}, whose build changed`);
            continue;
        }
        for (const read of reads.get(name)) {
            selectReader(dir, read, { graphs, whole, out });
        }
    }
}

/**
 * The tests of a package that one read of another package's file needs: those that reach the reading file,
 * or the whole package when no graph of it has that file (a config read it, or there is no graph).
 * @param dir the reading package
 * @param read `{ file, holder }` from foreignReads()
 * @param read.file the changed file it reads
 * @param read.holder the file that reads it, or null
 * @param ctx `{ graphs, whole, out }`
 * @param ctx.graphs Map of package directory to its import graphs
 * @param ctx.whole marks a package to run whole
 * @param ctx.out each package's selection
 */
function selectReader(dir, { file, holder }, { graphs, whole, out }) {
    const known = holder ? (usable(graphs.get(dir)) ?? []).filter((g) => knows(g, holder)) : [];
    if (known.length === 0) {
        whole(dir, `${holder ?? "a file of it"} reads ${file} by relative path`);
        return;
    }
    for (const g of known) {
        selectInGraph(g, [holder], false).specs.forEach((why, spec) =>
            addSpec(out.get(dir), spec, holder === file ? why : `${why}, which names ${file}`),
        );
    }
}

const usable = (gs) => (gs && gs.length > 0 && !gs.includes(null) ? gs : null);
const knows = (g, f) => f in g.imports || Object.values(g.projects).some((p) => p.specs.includes(f));

/**
 * The changed files of other packages that one package reads, each with the file of its own graph (or config)
 * that reads it: the changed file itself when its tests import it, else the file holding the literal path.
 * @param name the package
 * @param dir its directory
 * @param ctx `{ changed, refs, graphs, pkgOf, nameOf, built }`
 * @param ctx.changed the changed paths
 * @param ctx.refs testRefs()
 * @param ctx.graphs Map of package directory to its import graphs
 * @param ctx.pkgOf the package directory of a path
 * @param ctx.nameOf Map of package directory to its name
 * @param ctx.built Set of the packages whose build inputs changed
 * @returns `[{ file, holder }]`; holder null when the package has no graph to say which file reads it
 */
function foreignReads(name, dir, { changed, refs, graphs, pkgOf, nameOf, built }) {
    const gs = usable(graphs.get(dir));
    const out = [];
    for (const file of changed) {
        const fdir = pkgOf(file);
        if (!fdir || fdir === dir) {
            continue;
        }
        if (gs?.some((g) => knows(g, file))) {
            out.push({ file, holder: file });
        }
        const target = nameOf.get(fdir);
        for (const r of refs.get(name) ?? []) {
            if (!r.build && r.target === target && file.startsWith(r.prefix)) {
                out.push({ file, holder: r.holder });
            }
        }
    }
    for (const r of refs.get(name) ?? []) {
        if (r.build && built.has(r.target)) {
            out.push({ file: `the build of ${r.target}`, holder: r.holder });
        }
    }
    return out;
}

/**
 * Whether a read goes into a package's build: the reading file is one of the package's build inputs, or one
 * of them imports it.
 * @param holder the reading file, or null (unknown: assumed to)
 * @param dir the package
 * @param graphs its import graphs
 * @returns boolean
 */
function intoBuild(holder, dir, graphs) {
    const own = (f) => f.startsWith(`${dir}/`) && buildInput(f.slice(dir.length + 1));
    if (!holder || own(holder)) {
        return true;
    }
    return (usable(graphs) ?? []).some((g) => [...reaching([holder], reverse(g.imports))].some(own));
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
 * @param deleted Set of changed paths that no longer exist, or undefined
 */
function filesInPackage(dir, changed, graphs, rules, result, whole, deleted) {
    const mine = changed.filter((f) => f.startsWith(`${dir}/`));
    if (mine.length > 0 && result.mode !== "all") {
        pickFiles(dir, mine, graphs, rules, result, whole, deleted);
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
 * @param deleted Set of changed paths that no longer exist: no graph built now holds an edge to one, so a
 *   deleted file is never explained and runs its whole package
 */
function pickFiles(dir, mine, graphs, rules, result, whole, deleted) {
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
    const gone = mine.find((f) => deleted?.has(f));
    if (gone) {
        whole(dir, `${gone} was deleted or renamed, and a test may still import or read it`);
        return;
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
 * @param browserAllowed Set of package directories whose browser projects may be selected file by file too
 * @returns `[{ shard, package, mode, files, total, reasons, measured? }]`; total is the shard's test file
 *   count when known; measured `{ mode, files }` is the file-level answer where it was not allowed
 */
export function selectShards(shards, packages, graphs, allowed, browserAllowed = new Set()) {
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
        const why = notAllowed(shard.package, own, allowed, browserAllowed);
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
 * @param browserAllowed Set of package directories whose browser projects are allowed too
 * @returns a reason or null
 */
function notAllowed(pkg, own, allowed, browserAllowed) {
    if (allowed && !allowed.has(pkg)) {
        return "file-level selection is not yet allowed for this package (measured only)";
    }
    if (allowed && own?.browser !== false && !browserAllowed.has(pkg)) {
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
export function shardSpecs(runs, graphs) {
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

// --- running a selection ---------------------------------------------------------------------------------

const NX_COVERAGE = /^pnpm exec nx run ([^:\s]+):coverage --exclude-task-dependencies$/u;
const PLAIN_VITEST = /^cd (\S+) && ((?:[A-Z_]+=\S+ )*)pnpm exec vitest run((?: \S+)*)$/u;
// Arguments of a shard's vitest run that only shape its output, its coverage or its slice.
const DROPPED = /^(--coverage|--shard=\S+|--reporter=\S+|\$\{[A-Z_]+:\+--reporter=[^}]+\})$/u;
const ESCAPED_QUOTE = String.raw`'\''`;
const quote = (s) => `'${s.replaceAll("'", ESCAPED_QUOTE)}'`;

/**
 * A shard's command as one plain `vitest run` without coverage or slice: its package and the arguments
 * that choose its config and projects. null when the command is not a plain `vitest run` or an nx
 * `coverage` target whose script is `vitest run --coverage`: wrappers, scripts, positional filters and
 * lane variables can only run as they are.
 * @param root the checkout (to read a package's coverage script)
 * @param shard a SHARDS entry
 * @returns `{ dir, args }` or null
 */
function plainRun(root, shard) {
    const cmd = shard["test-command"];
    const dir = shard.package;
    const nx = NX_COVERAGE.exec(cmd);
    if (nx) {
        const script = JSON.parse(safeRead(join(root, dir, "package.json")) || "{}").scripts?.coverage;
        // an nx target of its own in project.json must only run that script
        const target = JSON.parse(safeRead(join(root, dir, "project.json")) || "{}").targets?.coverage;
        const viaScript = !target || target.options?.command === "npm run coverage";
        return nx[1] === dir && viaScript && script === "vitest run --coverage" ? { dir, args: [] } : null;
    }
    const m = PLAIN_VITEST.exec(cmd);
    // COVERAGE_DIR only moves a coverage report this run does not write; any other variable picks a lane
    const env = m?.[2].trim().split(/\s+/u).filter(Boolean) ?? [];
    if (!m || m[1] !== dir || env.some((e) => !e.startsWith("COVERAGE_DIR="))) {
        return null;
    }
    const args = m[3]
        .replace(/--config (\S+)/u, "--config=$1")
        .trim()
        .split(/\s+/u)
        .filter((a) => a && !DROPPED.test(a));
    return args.every((a) => /^--project=\S+$|^--config=\S+$/u.test(a)) ? { dir, args } : null;
}

/**
 * The command that runs only some test files of a shard: one `vitest run` in the shard's package with
 * its config and --project filters and the files, without --coverage (a subset cannot meet a package's
 * thresholds) and without --shard (a selection is not sliced).
 * @param root the checkout
 * @param shard a SHARDS entry
 * @param files repo-relative test files, all inside the shard's package; null runs every file of the shard
 * @returns a shell command, or null when the shard's command is not plain (plainRun) or a file is elsewhere
 */
export function selectedCommand(root, shard, files) {
    const run = plainRun(root, shard);
    if (!run || files?.length === 0 || files?.some((f) => !f.startsWith(`${run.dir}/`))) {
        return null;
    }
    const rel = (files ?? []).map((f) => quote(f.slice(run.dir.length + 1)));
    return `cd ${run.dir} && pnpm exec vitest run ${[...run.args, ...rel].join(" ")}`.trimEnd();
}

/**
 * What to run for a selection: per shard "none" (skipped), "all" (its own command, through
 * tools/run-tests.sh) or "files" (selectedCommand). Slices of one family that select the same files
 * (graphty-1 to graphty-3) become one run, reported under the first; `covers` names them all.
 * @param root the checkout
 * @param shards the SHARDS entries to plan
 * @param selection selectShards() for them (a shard missing from it runs whole)
 * @returns `[{ shard, mode, files, reasons, command?, covers }]`, in the order of `shards`
 */
export function planRuns(root, shards, selection) {
    const plan = [];
    for (const shard of shards) {
        const s = selection.find((x) => x.shard === shard.shard);
        if (!s) {
            plan.push({
                shard,
                mode: "all",
                files: [],
                reasons: ["the selector gave no answer for it"],
                covers: [shard.shard],
            });
            continue;
        }
        const files = (s.files ?? []).map((f) => f.file).sort();
        const command = s.mode === "files" ? selectedCommand(root, shard, files) : null;
        if (s.mode === "files" && !command) {
            const why = "its command is not a plain vitest run, so it runs whole";
            plan.push({ shard, mode: "all", files: [], reasons: [why], covers: [shard.shard] });
            continue;
        }
        const same = command && plan.find((p) => p.command === command);
        if (same) {
            same.covers.push(shard.shard);
            continue;
        }
        plan.push({
            shard,
            mode: s.mode,
            files: s.files ?? [],
            reasons: s.reasons ?? [],
            command,
            covers: [shard.shard],
            measured: s.measured,
        });
    }
    return plan;
}

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
    const failed = [];
    try {
        const walked = new Set();
        const walk = (project, file) => walkFile(project, file, { walked, imports, rel, failed });
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
    return { package: pkg, config, projects, imports, opaque: opaqueSpecs(root, pkg, projects, imports), failed };
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
    let deps = new Set();
    if (CODE.test(file)) {
        deps = await edgesOf(project, file, ctx.failed);
    } else if (STYLE.test(file)) {
        deps = styleEdges(file);
    }
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
 * @param failed the files Vite could not transform, with why, added to
 * @returns Set of absolute paths of files in the checkout
 */
async function edgesOf(project, file, failed) {
    const deps = new Set();
    let transformed = null;
    try {
        const env = project.vite.environments.ssr;
        transformed = env.moduleGraph.getModuleById(file)?.transformResult || (await env.transformRequest(file));
    } catch (e) {
        // its imports are unknown, so the graph cannot say what reaches what (an unbuilt dependency's dist is
        // the usual cause): the graph is not used
        failed.push(`${relative(project.config.root, file)}: ${String(e?.message ?? e).split("\n")[0]}`);
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

const STYLE = /\.(css|scss|sass|less)$/u;
const STYLE_REF = /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)|url\(\s*["']?([^"')\s]+)/gu;

/**
 * A stylesheet's edges: the relative files its `@import` and `url()` name (fonts, images, other sheets).
 * @param file an absolute path
 * @returns Set of absolute paths of files in the checkout
 */
function styleEdges(file) {
    const deps = new Set();
    for (const m of safeRead(file).matchAll(STYLE_REF)) {
        const ref = (m[1] ?? m[2]).split(/[?#]/u, 1)[0];
        const path = join(dirname(file), ref);
        if (!/^[a-z]+:|^\//u.test(ref) && isFile(path)) {
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
    const selectBase = selectBaseOf(root, base);
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

/**
 * The commit the selector measures a push's change from: PREPUSH_SELECT_BASE when it names a commit (a
 * landing's own branch base, since golden's push is measured from master), else the gate's base.
 * @param root the checkout under test
 * @param base the gate's base, or null
 * @returns a ref or null
 */
export function selectBaseOf(root, base) {
    const asked = process.env.PREPUSH_SELECT_BASE;
    return asked && isCommit(root, asked) ? asked : base;
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
                const cached = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
                if (cached && sameOutside(root, cached.outside)) {
                    return cached;
                }
            }
        } catch {
            file = null;
        }
        const graph = build();
        if (graph?.failed?.length > 0) {
            const which = config ? `${dir} (${config})` : dir;
            console.error(
                `test-select: the import graph of ${which} is not used: Vite could not transform ` +
                    `${graph.failed.length} file(s), first ${graph.failed[0]}`,
            );
            return null;
        }
        if (graph) {
            graph.outside = outsideOf(root, dir, graph);
        }
        if (graph && file) {
            mkdirSync(dirPath, { recursive: true });
            writeFileSync(file, JSON.stringify(graph));
        }
        return graph;
    };
}

/** Bumped when the graph's shape or the walk changes, so cached graphs of the old walk are not used. */
const GRAPH_VERSION = 5;

const fileHash = (root, f) => {
    try {
        return createHash("sha256")
            .update(readFileSync(join(root, f)))
            .digest("hex");
    } catch {
        return "missing";
    }
};

/**
 * The files outside a package that its graph reaches (root tools, design files, another package's test
 * files), each with a hash of its contents. The cache key holds only the package's own tree, so a graph is
 * reused only while these are unchanged too: a root helper that gained an import must be walked again.
 * @param root the checkout
 * @param dir the package
 * @param graph a --graph result
 * @returns `{ path: hash }`
 */
export function outsideOf(root, dir, graph) {
    const files = new Set(Object.entries(graph.imports).flatMap(([f, tos]) => [f, ...tos]));
    return Object.fromEntries(
        [...files]
            .filter((f) => !f.startsWith(`${dir}/`))
            .sort()
            .map((f) => [f, fileHash(root, f)]),
    );
}

/**
 * Whether the files outside a package that a cached graph reached are as they were when it was built.
 * @param root the checkout
 * @param outside the graph's `outside`, or undefined (a graph from before it was kept)
 * @returns boolean
 */
export const sameOutside = (root, outside) =>
    Boolean(outside) && Object.entries(outside).every(([f, h]) => fileHash(root, f) === h);

/**
 * The literal paths each package's tests and test configs name inside other packages
 * (`"../../graph-io/test/corpus"`, `join(__dirname, "..", "..", "graph-io", "test")`,
 * `{workspaceRoot}/graph-samples/dist/data/v1`), each with the file that holds it. Every file of the package's
 * import graphs is read (another package's test helper it imports too), and its test configs and Storybook
 * setup; a code file a literal names (a script a test runs) is read as well, with its relative imports, on
 * behalf of the file that names it. A path that names nothing in the checkout (a file built from parts) stands for the whole package. A regex replacement (`"../graphty-element/$1.ts"`, a Vite alias)
 * is not a read: what it resolves is in the import graph. A package without a graph keeps the package-level
 * references tools/prepush-inputs.mjs finds in all its files, as whole-package paths with no holder.
 * @param root the checkout
 * @param roots Map(project name -> dir)
 * @param graphs Map(dir -> [graph|null...])
 * @param fallback pathRefs(root, roots)
 * @returns Map(project name -> [{ target: project name, prefix: repo-relative path prefix, holder: file|null,
 *   build: whether the path is a build output, read when the target's build changes }])
 */
export function testRefs(root, roots, graphs, fallback) {
    const byDir = new Map([...roots].map(([n, d]) => [d, n]));
    const index = pathIndex(root);
    const lits = new Map();
    const literals = (f) => lits.get(f) ?? lits.set(f, literalPaths(root, f, index)).get(f);
    const refs = new Map();
    for (const [name, dir] of roots) {
        const gs = usable(graphs.get(dir));
        if (!gs) {
            const pkgs = [...(fallback.get(name) ?? [])];
            refs.set(
                name,
                pkgs.map((t) => ({ target: t, prefix: `${roots.get(t)}/`, holder: null })),
            );
            continue;
        }
        const inGraph = new Set(gs.flatMap((g) => Object.keys(g.imports)));
        const found = new Map();
        for (const holder of [...inGraph, ...configFiles(root, dir)]) {
            for (const path of readThrough(holder, inGraph, literals)) {
                const ref = refOf(root, path, { byDir, index, name, holder });
                if (ref) {
                    found.set(`${ref.target}\0${ref.prefix}\0${holder}\0${ref.build}`, ref);
                }
            }
        }
        refs.set(name, [...found.values()]);
    }
    return refs;
}

/**
 * Every path one holder names, with what a script it runs names, and what a file outside the graph (a
 * config, a script) imports: what they read counts as read by the holder.
 * @param holder a file of a package's graph, or one of its configs
 * @param inGraph Set of the files of the package's graphs (their imports are already edges)
 * @param literals (file) => literalPaths()
 * @returns Set of repo-relative paths
 */
function readThrough(holder, inGraph, literals) {
    const out = new Set();
    const seen = new Set([holder]);
    const todo = [holder];
    while (todo.length > 0) {
        const file = todo.pop();
        const { paths, runs, imports } = literals(file);
        paths.forEach((p) => out.add(p));
        for (const next of [...runs, ...(inGraph.has(file) ? [] : imports)].filter((n) => !seen.has(n))) {
            seen.add(next);
            todo.push(next);
        }
    }
    return out;
}

/**
 * The reference a named path makes into another package, or null when it names the reader itself or no
 * package. A build output (ignored by git) changes with the package's build; a path that names nothing else
 * (a file built from parts) stands for the whole package.
 * @param root the checkout
 * @param path a repo-relative path
 * @param ctx `{ byDir, index, name, holder }`
 * @param ctx.byDir Map of package directory to its name
 * @param ctx.index pathIndex(root)
 * @param ctx.name the reading package
 * @param ctx.holder the file that names it
 * @returns `{ target, prefix, holder, build }` or null
 */
function refOf(root, path, { byDir, index, name, holder }) {
    const pkg = path.split("/")[0];
    const target = byDir.get(pkg);
    if (!target || target === name) {
        return null;
    }
    const known = index.has(path);
    return { target, prefix: known ? stripExt(path) : `${pkg}/`, holder, build: !known && ignoredPath(root, path) };
}

/**
 * A string without the given characters at its end.
 * @param s the string
 * @param chars the characters to drop
 * @returns the trimmed string
 */
function trimEnd(s, chars) {
    let end = s.length;
    while (end > 0 && chars.includes(s[end - 1])) {
        end--;
    }
    return s.slice(0, end);
}

const PATH_TOKEN = /(?:\.\.\/)+[\w@.+-]+(?:\/[\w@.+-]+)*|\{workspaceRoot\}\/[\w@.+-]+(?:\/[\w@.+-]+)*/gu;
const LITERAL_RUN = /["'`][^"'`\n]*["'`](?:\s*,\s*["'`][^"'`\n]*["'`])+/gu;

/**
 * The repo-relative paths one file names: `../` paths resolved from the file's folder (or, when that names
 * nothing, read as a sibling package: `resolve(pkg, "..", "graph-io")`), `{workspaceRoot}/` paths, and runs of
 * string arguments joined with `/` when one of them is `..`; and its relative imports. Paths that leave the
 * checkout are dropped.
 * @param root the checkout
 * @param file a repo-relative file
 * @param index pathIndex(root)
 * @returns `{ paths: Set, runs: code files a literal names, imports: code files it imports }`, repo-relative
 */
export function literalPaths(root, file, index) {
    const raw = safeRead(join(root, file));
    const imports = new Set();
    for (const m of raw.matchAll(LOCAL_IMPORT)) {
        const target = posix.normalize(posix.join(posix.dirname(file), m[1].split("?", 1)[0]));
        const hit = ["", ".ts", ".tsx", ".mjs", ".js", ".cjs", "/index.ts", "/index.js"]
            .map((e) => target + e)
            .find((t) => !t.startsWith("..") && (index.files.has(t) || isFile(join(root, t))));
        if (hit) {
            imports.add(hit);
        }
    }
    const text = raw.replaceAll(LOCAL_IMPORT, "");
    const paths = new Set(imports);
    const runs = new Set();
    const add = (token) => {
        if (token.startsWith("{workspaceRoot}/")) {
            paths.add(trimEnd(token.slice("{workspaceRoot}/".length), "."));
            return;
        }
        const clean = trimEnd(token, "./");
        const near = posix.normalize(posix.join(posix.dirname(file), clean));
        let sibling = clean;
        while (sibling.startsWith("../")) {
            sibling = sibling.slice(3);
        }
        sibling = posix.normalize(sibling);
        const pick =
            [near, sibling].find((p) => !p.startsWith("..") && index.has(p)) ??
            (near.startsWith("..") ? sibling : near);
        if (!pick.startsWith("..")) {
            paths.add(pick);
            if (CODE.test(pick) && (index.files.has(pick) || isFile(join(root, pick)))) {
                runs.add(pick);
            }
        }
    };
    const scan = (s) => {
        for (const m of s.matchAll(PATH_TOKEN)) {
            // a regex replacement ("$1") is a Vite alias: what it resolves to is in the import graph
            if (!/^\/?\$\d/u.test(s.slice(m.index + m[0].length))) {
                add(m[0]);
            }
        }
    };
    scan(text);
    for (const run of text.matchAll(LITERAL_RUN)) {
        const parts = [...run[0].matchAll(/["'`]([^"'`\n]*)["'`]/gu)].map((m) => m[1]);
        if (parts.some((p) => /^\.\.(\/\.\.)*\/?$/u.test(p))) {
            scan(parts.join("/").replaceAll(/\/+/gu, "/"));
        }
    }
    return { paths, runs, imports };
}

const stripExt = (p) => p.replace(/(\/[^/]+)\.[A-Za-z0-9]+$/u, "$1");

const indexCache = new Map();
/**
 * What exists in a checkout, for naming paths: its tracked files (or, outside a git checkout, the file
 * system), every folder above them and every file without its extension. A build output is untracked, so it
 * names nothing.
 * @param root the checkout
 * @returns `{ files: Set, has(path): boolean }`
 */
function pathIndex(root) {
    if (!indexCache.has(root)) {
        let files = [];
        try {
            files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 })
                .split("\n")
                .filter(Boolean);
        } catch {
            // not a checkout
        }
        const names = new Set();
        for (const f of files) {
            names.add(f);
            names.add(stripExt(f));
            for (let i = f.indexOf("/"); i > 0; i = f.indexOf("/", i + 1)) {
                names.add(f.slice(0, i));
            }
        }
        const fs = files.length === 0;
        indexCache.set(root, {
            files: new Set(files),
            has: (p) => names.has(p) || (fs && isPath(root, p)),
        });
    }
    return indexCache.get(root);
}
const isPath = (root, p) => existsSync(join(root, p));
const ignoredCache = new Map();
const ignoredPath = (root, p) => {
    const key = `${root}\0${p}`;
    if (!ignoredCache.has(key)) {
        let ignored = false;
        try {
            execFileSync("git", ["check-ignore", "-q", "--no-index", p], { cwd: root, stdio: "ignore" });
            ignored = true;
        } catch {
            // exit 1: not ignored (or not a checkout)
        }
        ignoredCache.set(key, ignored);
    }
    return ignoredCache.get(key);
};

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
    // eslint.config: a test that runs ESLint (graphty's restricted-imports test) loads it and what it imports
    return out
        .split("\n")
        .filter((f) => f && (/\/(vite|vitest|eslint)[^/]*\.config\.[^/]+$/u.test(f) || f.includes("/.storybook/")));
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
    namesCache.clear();
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
        rootImporters: rootImportGraph(root, [...packages.values()]),
        deleted: new Set(changed.filter((f) => !existsSync(join(root, f)))),
    });
    return { ...sel, shards: selectShards(shards, sel.packages, all, rules.fileLevel, rules.fileLevelBrowser) };
}

const LOCAL_IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/gu;

/**
 * Which root code files import which (relative imports only), reversed: root file -> its root importers.
 * @param root the checkout
 * @param dirs the package directories (everything else is root)
 * @returns Map(root file -> root files that import it)
 */
export function rootImportGraph(root, dirs) {
    const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 })
        .split("\n")
        .filter((f) => CODE.test(f) && !dirs.some((d) => f.startsWith(`${d}/`)) && !f.includes("node_modules/"));
    const tracked = new Set(files);
    const rev = new Map();
    for (const f of files) {
        for (const m of safeRead(join(root, f)).matchAll(LOCAL_IMPORT)) {
            const target = posix.normalize(posix.join(posix.dirname(f), m[1]));
            const hit = [target, `${target}.mjs`, `${target}.js`, `${target}.ts`].find((t) => tracked.has(t));
            if (hit && hit !== f) {
                rev.set(hit, [...(rev.get(hit) ?? []), f]);
            }
        }
    }
    return rev;
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
    // --no-renames: a renamed file is its old path deleted and its new one added, and both are changes
    return git(["diff", "--name-only", "--no-renames", mb, head]).split("\n").filter(Boolean);
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
    const root = resolve(arg("--root") ?? join(HERE, ".."));
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
