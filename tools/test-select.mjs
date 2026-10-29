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
 *   node tools/test-select.mjs [--root <checkout>] [--base <ref>] [--head <ref>] [--json] [--defer-downstream]
 *       the selection for the change from the merge base of <base> (default origin/master) to <head>
 *       (default HEAD), as text or JSON; --defer-downstream leaves out the packages reached only as
 *       dependents or readers of a changed one
 *   node tools/test-select.mjs --summary <plan.json> [--affected <JSON list of affected packages>]
 *       the light check's plan as Markdown for a CI job summary (planSummary()): each bin's files and why, the
 *       shards that run whole and why, the shards that run nothing
 *   node tools/test-select.mjs [--root <checkout>] [--base <ref>] [--head <ref>] --plan [--durations <file.json>]
 *       the pull request light check's plan as JSON: each shard family's selected files packed into bins of at
 *       most 8 min (lightPlan(); --durations is `{ "<family>": { "<file>": ms } }`), the shards that run whole
 *       or not at all, and the stories of each visual-review project (selectStories())
 *   node tools/test-select.mjs [--root <checkout>] --cache-key
 *       the key of the import graphs cached in <main checkout>/tmp/test-select/graphs (graphCacheKey())
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
 * @returns `{ everything, smoke, storySetup, noBuild, noTests, wholePackage, alsoRun, opaque, readAtRunTime, fileLevel, fileLevelBrowser,
 *   stories }`
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
        smoke: { patterns: (raw.smoke?.patterns ?? []).map(toRe), shards: raw.smoke?.shards ?? [] },
        storySetup: { patterns: (raw.storySetup?.patterns ?? []).map(toRe), shards: raw.storySetup?.shards ?? [] },
        noBuild: new Set(raw.noBuild?.packages ?? []),
        noTests: raw.noTests.patterns.map(toRe),
        wholePackage: raw.wholePackage.patterns.map(toRe),
        alsoRun: raw.alsoRun.entries.map((e) => ({ re: toRe(e.pattern), packages: e.packages, why: e.why })),
        opaque: toRe(raw.opaqueTest.pattern),
        readAtRunTime: toRe(raw.readAtRunTime.pattern),
        fileLevel: new Set(raw.fileLevel.packages),
        fileLevelBrowser: new Set(raw.fileLevelBrowser?.packages ?? []),
        stories: {
            global: raw.stories.global.map(toRe),
            projectGlobal: raw.stories.projectGlobal,
            lockfile: toRe(raw.stories.lockfile),
            theme: raw.stories.theme,
            drawnBy: raw.stories.drawnBy,
            selectProjects: raw.stories.selectProjects ?? [],
            storyless: (raw.stories.storyless ?? []).map(toRe),
        },
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

const LOCK = "pnpm-lock.yaml";
// top-level lockfile sections that change only along with an importer's block (a catalog bump rewrites the
// versions in the importers that use it); any other section (settings, overrides, patchedDependencies)
// changes what every package installs
const FOLLOWS_IMPORTERS = new Set(["importers", "catalogs", "packages", "snapshots"]);

/**
 * A pnpm lockfile's top-level sections and each section's entries (an importer, a package, a snapshot), as
 * text.
 * @param text the lockfile
 * @returns `{ top: Map(section -> text), entries: Map(section -> Map(entry key -> text)) }`
 */
export function lockSections(text) {
    const top = new Map();
    const entries = new Map();
    let section = null;
    let entry = null;
    for (const line of text.split("\n")) {
        const head = /^(\S[^:]*):/u.exec(line);
        if (head) {
            section = head[1];
            entry = null;
            entries.set(section, new Map());
        }
        const sub = section !== null && /^ {2}(\S.*):$/u.exec(line);
        if (sub) {
            entry = sub[1].replaceAll(/(?:^['"])|(?:['"]$)/gu, "");
        }
        top.set(section, `${top.get(section) ?? ""}${line}\n`);
        if (entry !== null) {
            const m = entries.get(section);
            m.set(entry, `${m.get(entry) ?? ""}${line}\n`);
        }
    }
    return { top, entries };
}

/**
 * The importers (package directories, "." for the root) whose resolved dependencies differ between two
 * lockfiles, as nx's projectsAffectedByDependencyUpdates "auto" reads them. null when the change cannot be
 * put on importers: a lockfile is missing, a section every package installs from changed, the resolved
 * packages changed while no importer did, or a package or snapshot both lockfiles hold was rewritten (a
 * re-resolved transitive dependency, which reaches importers whose own block did not change).
 * @param before the lockfile text at the base, or null
 * @param after the lockfile text at the head, or null
 * @returns importer paths, or null
 */
export function changedImporters(before, after) {
    if (before === null || after === null) {
        return null;
    }
    const a = lockSections(before);
    const b = lockSections(after);
    const differ = (x, y) => [...new Set([...x.keys(), ...y.keys()])].filter((k) => x.get(k) !== y.get(k));
    const of = (s, sec) => s.entries.get(sec) ?? new Map();
    const importers = differ(of(a, "importers"), of(b, "importers"));
    const sections = differ(a.top, b.top);
    const rewritten = ["packages", "snapshots"].some((sec) =>
        differ(of(a, sec), of(b, sec)).some((k) => of(a, sec).has(k) && of(b, sec).has(k)),
    );
    if (sections.some((k) => !FOLLOWS_IMPORTERS.has(k)) || importers.length === 0 || rewritten) {
        return sections.length === 0 ? [] : null;
    }
    return importers;
}

/**
 * changedImporters() for the lockfile at the merge base of base and head and at head.
 * @param root the checkout
 * @param base a commit-ish
 * @param head a commit-ish, or null for the working tree
 * @returns importer paths, or null
 */
export function lockfileImporters(root, base, head) {
    const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
    const show = (rev) => {
        try {
            return rev ? git(["show", `${rev}:${LOCK}`]) : readFileSync(join(root, LOCK), "utf8");
        } catch {
            return null;
        }
    };
    return changedImporters(show(git(["merge-base", base, head ?? "HEAD"]).trim()), show(head));
}

/**
 * The changed paths with a changed lockfile put on the packages whose dependencies it changed: each
 * importer stands as a change to its package.json (the root importer's is the root package.json, which runs
 * everything). The lockfile stays when which importers changed is unknown.
 * @param changed repo-relative changed paths
 * @param importers changedImporters(), or null/undefined when unknown
 * @returns changed paths
 */
export function withLockfile(changed, importers) {
    if (!changed.includes(LOCK) || !Array.isArray(importers)) {
        return changed;
    }
    const manifests = importers.map((dir) => (dir === "." ? "package.json" : `${dir}/package.json`));
    return [...new Set([...changed.filter((f) => f !== LOCK), ...manifests])];
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
 * Whether a vitest project is one a run's --project filters select (`!name` excludes). An On twin
 * (`<name>-features-on`, tools/features-on.mjs) is selected only by name: it exists only in a run that sets
 * GRAPHTY_FEATURES_ON=1, which only the On shards do, so an Off shard's `!storybook` never runs it.
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
    if (base.endsWith("-features-on")) {
        return plain.includes(base);
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
 * Whether a repo-relative file is the vitest config a graph was built with (the package's default
 * vitest.config.* when it names none). Every run of that graph loads it before any test.
 * @param graph a --graph result
 * @param file a repo-relative path
 * @returns boolean
 */
const CONFIG_WHY = "vitest config ";
const isConfigOf = (graph, file) => {
    const rel = file.startsWith(`${graph.package}/`) ? file.slice(graph.package.length + 1) : null;
    const config = graph.config?.replace(/^\.\//u, "");
    return rel !== null && (config ? rel === config : /^vitest\.config\.[cm]?[jt]s$/u.test(rel));
};

/**
 * Adds the test files whose imports reach one changed file, every test of a project whose setup files
 * reach it, and every test of the graph when its vitest config reaches it.
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
    const config = [...reached].find((f) => isConfigOf(graph, f));
    if (config) {
        allSpecs.forEach((s) => add(s, `${CONFIG_WHY}${config} imports ${file}`));
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
 * @param input.deferDownstream leave out the tests of packages reached only as dependents or readers of a
 *   changed package (a landing check defers them to verification, design/ci/fast-pipeline.md), optional
 * @param input.lockfile the lockfile importers whose dependencies changed (changedImporters()); without it a
 *   changed lockfile runs everything, optional
 * @returns `{ everything: reason|null, packages: Map(dir -> { mode: "all"|"files"|"none", reasons, specs }),
 *   unexplainedRoot, smoke: Map(shard -> reason) }`; smoke names the shards a workflow change runs whole
 */
export function selectPackages({
    changed: changed0,
    packages,
    deps,
    refs,
    graphs,
    rules,
    rootImporters,
    deleted,
    deferDownstream,
    lockfile,
}) {
    const changed = withLockfile(changed0, lockfile);
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
        return { everything: f, packages: out, unexplainedRoot: [], smoke: new Map() };
    };
    // a lockfile change withLockfile() could not put on importers
    if (changed.includes(LOCK)) {
        return everything(LOCK);
    }
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
    if (!deferDownstream) {
        // a file only the story setups load changes no dependent's build: its story shards run (storySetup below)
        const storyOnly = (f) => rules.storySetup?.patterns.some((re) => re.test(f));
        dependents({
            changed: changed.filter((f) => !storyOnly(f)),
            packages,
            deps,
            refs,
            graphs,
            pkgOf,
            whole,
            out,
            noBuild: rules.noBuild ?? new Set(),
        });
    }
    for (const dir of dirs) {
        filesInPackage(dir, changed, graphs.get(dir), rules, out.get(dir), whole, deleted);
    }
    const smokeBy = changed.find((f) => rules.smoke?.patterns.some((re) => re.test(f)));
    const smoke = new Map(
        smokeBy ? rules.smoke.shards.map((sh) => [sh, `${smokeBy} changes how CI runs shards (smoke shard)`]) : [],
    );
    const storyBy = changed.find((f) => rules.storySetup?.patterns.some((re) => re.test(f)));
    for (const sh of storyBy ? rules.storySetup.shards : []) {
        smoke.set(sh, smoke.get(sh) ?? `${storyBy} is loaded by the story setup of this shard`);
    }
    return { everything: null, packages: out, unexplainedRoot, smoke };
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
 * Whether a package's tests read a root file: those that import it are selected, test files that name it
 * are selected, and a package whose other test-side files or configs name it runs whole.
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
    const by = namedBy(f, dir, known ? gs : null);
    if (by.size === 0) {
        return false;
    }
    const specs = new Set(known ? gs.flatMap((g) => Object.values(g.projects).flatMap((p) => p.specs)) : []);
    if ([...by].every((x) => specs.has(x))) {
        by.forEach((spec) => addSpec(out.get(dir), spec, `it names ${f}, which it may read at run time`));
    } else {
        whole(dir, `${f} is named by a test of ${dir}, which may read it at run time`);
    }
    return true;
}

const addSpec = (result, spec, why) => result.mode !== "all" && !result.specs.has(spec) && result.specs.set(spec, why);

let grepRoot = join(HERE, "..");
const namesCache = new Map();
const namesByGraphs = new WeakMap();

/**
 * Points the search for root-file names (namedBy) at a checkout: selectChange's, or a test's fixture.
 * @param root the checkout
 */
export function useNamesRoot(root) {
    grepRoot = root;
    namesCache.clear();
}
/**
 * Whether a package's tests name a root file: a string literal in the test-side files of its import graphs
 * or its test and lint configs (in any of its files when it has no graph) holds the file's path, a folder
 * above it, or its file name for files under tools/. Leading `../` and `./` are dropped, so
 * `"../../design/documents/notes.schema.json"` names `design/documents/notes.schema.json`; a path in a
 * comment names nothing.
 * @param file a root file
 * @param dir the package
 * @param graphs its graphs, or null
 * @returns Set of the files that name it (empty when none does)
 */
function namedBy(file, dir, graphs) {
    // keyed by the graphs themselves (a package without them by its directory): each selection has its own
    const key = graphs ?? dir;
    const cache = typeof key === "string" ? namesCache : namesByGraphs;
    if (!cache.has(key)) {
        cache.set(key, namesIn(dir, graphs));
    }
    const { paths, bases } = cache.get(key);
    const by = new Set();
    if (file.startsWith("tools/")) {
        bases.get(file.slice(file.lastIndexOf("/") + 1))?.forEach((f) => by.add(f));
    }
    const parts = file.split("/");
    parts.forEach((_, i) => {
        if (i === parts.length - 1 || i > 0) {
            paths.get(parts.slice(0, i + 1).join("/"))?.forEach((f) => by.add(f));
        }
    });
    return by;
}

/**
 * The paths and file names the string literals of a package's test-side files name, each with the files
 * that name it.
 * @param dir the package
 * @param graphs its graphs, or null for every file of the package
 * @returns `{ paths: Map(path -> Set of files), bases: Map(file name -> Set of files) }`
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
    const paths = new Map();
    const bases = new Map();
    const add = (m, k, f) => m.set(k, (m.get(k) ?? new Set()).add(f));
    for (const f of candidates) {
        for (const literal of safeRead(join(grepRoot, f)).matchAll(/["'`]([^"'`\n]+)["'`]/gu)) {
            for (const [token] of literal[1].matchAll(/[\w@.+-]+(?:\/[\w@.+-]+)*/gu)) {
                const path = token.replace(/^(?:\.{1,2}\/)+/u, "");
                add(paths, path, f);
                add(bases, path.slice(path.lastIndexOf("/") + 1), f);
            }
        }
    }
    return { paths, bases };
}

/**
 * Packages that depend on a changed package's build run the tests whose imports reach the changed source
 * files, through the source each build output was built from (sourceOf), plus their tests that read files at
 * run time; they run whole when that cannot be followed (throughSources). A package that reads another
 * package's files runs only the tests that read the changed file: the tests whose imports reach it (graphty
 * imports graphty-element's source), and the tests that reach a file holding a literal path the changed file
 * is under (`"../../graph-io/test/corpus"`); a literal in a config file, or a package without a graph, runs it
 * whole. A read that goes into the reader's own build (its source imports or names the file) counts as a
 * change to the reader's build, so its dependents run whole too. A package without a build (rules.noBuild:
 * visual-review, which its dependents load as source from their vitest configs and story setups) changes no
 * dependent's build: its changed files are only reads, so they run the tests and configs that load them.
 * @param root0 the inputs
 * @param root0.changed the changed paths
 * @param root0.packages Map of package name to directory
 * @param root0.deps Map of package name to its nx dependencies
 * @param root0.refs Map of package name to its literal paths into other packages (testRefs)
 * @param root0.graphs Map of package directory to its import graphs
 * @param root0.pkgOf the package directory of a path
 * @param root0.whole marks a package to run whole
 * @param root0.out each package's selection
 * @param root0.noBuild Set of the package names that have no build
 */
function dependents({ changed, packages, deps, refs, graphs, pkgOf, whole, out, noBuild }) {
    const nameOf = new Map([...packages].map(([n, d]) => [d, n]));
    const built = new Set();
    const builtFiles = new Map();
    for (const f of changed) {
        const dir = pkgOf(f);
        if (dir && buildInput(f.slice(dir.length + 1)) && !noBuild.has(nameOf.get(dir))) {
            built.add(nameOf.get(dir));
            builtFiles.set(nameOf.get(dir), [...(builtFiles.get(nameOf.get(dir)) ?? []), f]);
        }
    }
    const reads = new Map(
        [...packages].map(([name, dir]) => [
            name,
            foreignReads(name, dir, { changed, refs, graphs, pkgOf, nameOf, deps, built: new Set(built), noBuild }),
        ]),
    );
    for (const [name, dir] of packages) {
        if (reads.get(name).some((r) => intoBuild(r.holder, dir, graphs.get(dir)))) {
            built.add(name);
        }
    }
    for (const [name, dir] of packages) {
        const upstream = [...closure(name, deps)].filter((q) => q !== name && built.has(q));
        const why =
            upstream.length > 0 ? throughSources(dir, upstream, { builtFiles, deps, packages, graphs, out }) : null;
        if (why) {
            whole(dir, why);
            continue;
        }
        for (const read of reads.get(name)) {
            selectReader(dir, read, { graphs, whole, out });
        }
    }
}

/**
 * The tests of a package that changes to the build of packages it depends on need, through the source those
 * builds are made from: every test whose imports reach a changed source file; every test that loads a build
 * output whose source is unknown (graphty-element's bundles, a dataset file graph-samples' build writes) or a
 * source the project could not transform, when the package it belongs to holds the change; and the tests that
 * read files or run programs at run time (one may load the other package's build by path). Returns why the
 * package must run whole instead: it has no graph, a build changed for a reason other than its own files (a
 * read into it), or a changed file is in none of its graphs (build configuration, package.json, a file only a
 * computed import loads).
 * @param dir the package
 * @param upstream the packages it depends on whose build changed
 * @param ctx `{ builtFiles, deps, packages, graphs, out }`
 * @param ctx.builtFiles Map of package name to its changed build inputs
 * @param ctx.deps Map of package name to its nx dependencies
 * @param ctx.packages Map of package name to directory
 * @param ctx.graphs Map of package directory to its import graphs
 * @param ctx.out each package's selection
 * @returns a reason to run it whole, or null when its tests were selected
 */
function throughSources(dir, upstream, { builtFiles, deps, packages, graphs, out }) {
    const gs = usable(graphs.get(dir));
    if (!gs) {
        return `depends on ${upstream[0]}, whose build changed`;
    }
    for (const u of upstream) {
        const files = builtFiles.get(u) ?? [];
        // a source file no test reaches is in no build output they load, as long as it is code under src/: a
        // bundle holds only modules its entry imports (Vite's walk sees literal, glob and template imports)
        const src = (f) => CODE.test(f) && f.startsWith(`${packages.get(u)}/src/`);
        const lost = files.find((f) => !src(f) && !gs.some((g) => f in g.imports));
        if (files.length === 0 || lost) {
            return `depends on ${u}, whose build changed (${lost ?? "a read into it"} is in no test's import graph)`;
        }
    }
    const result = out.get(dir);
    result.upstream = true;
    const select = (file, why) =>
        gs.forEach((g) =>
            selectInGraph(g, [file], false).specs.forEach((w, spec) => addSpec(result, spec, `${w}${why}`)),
        );
    const hidden = hiddenBuilds(gs, packages);
    for (const u of upstream) {
        builtFiles.get(u).forEach((f) => select(f, `, from ${u}'s build`));
        for (const h of hidden.filter((x) => closure(x.owner, deps).has(u))) {
            select(h.file, `, built from ${h.owner}, whose build holds ${u}`);
        }
        gs.flatMap((g) => g.opaque ?? []).forEach((spec) =>
            addSpec(result, spec, `reads files at run time; ${u}'s build changed`),
        );
    }
    if (result.specs.size === 0) {
        result.reasons.push(`no test reaches the changed source of ${upstream.join(", ")}`);
    }
    return null;
}

/**
 * The files of a package's graphs that stand for another package's whole build: a build output whose source
 * is unknown, and a source the project could not transform.
 * @param gs the package's graphs
 * @param packages Map of package name to directory
 * @returns `[{ file, owner }]`, owner the package name
 */
function hiddenBuilds(gs, packages) {
    const byDir = new Map([...packages].map(([n, d]) => [d, n]));
    const hidden = new Map();
    for (const g of gs) {
        for (const f of [...Object.keys(g.imports), ...(g.blind ?? [])]) {
            const [d, out] = f.split("/");
            if (d !== g.package && byDir.has(d) && (out === "dist" || g.blind?.includes(f))) {
                hidden.set(f, { file: f, owner: byDir.get(d) });
            }
        }
    }
    return [...hidden.values()];
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
    const stories = known.length === 0 ? storybookSpecs(dir, holder, graphs.get(dir)) : null;
    if (stories) {
        stories.forEach((spec) => addSpec(out.get(dir), spec, `its Storybook config ${holder} reads ${file}`));
        return;
    }
    const configured = known.length === 0 ? configSpecs(dir, holder, graphs.get(dir)) : null;
    if (configured) {
        configured.forEach((spec) => addSpec(out.get(dir), spec, `${CONFIG_WHY}${holder} loads ${file}`));
        return;
    }
    const linters = known.length === 0 ? lintSpecs(dir, holder, graphs.get(dir)) : null;
    if (linters) {
        linters.forEach((spec) => addSpec(out.get(dir), spec, `runs ESLint, whose config ${holder} reads ${file}`));
        return;
    }
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

/**
 * The tests of the Vitest projects that run a package's Storybook, when `holder` is a file of its Storybook
 * setup (`.storybook/main.ts` serving graph-samples' datasets as static files): only those projects load it.
 * A project runs the Storybook when one of its setup files is in `.storybook/`.
 * @param dir the package
 * @param holder the file that reads another package's file, or null
 * @param gs the package's graphs
 * @returns the test files, or null when the holder is not Storybook setup or no project runs it
 */
function storybookSpecs(dir, holder, gs) {
    if (!holder?.startsWith(`${dir}/.storybook/`) || !usable(gs)) {
        return null;
    }
    const projects = gs
        .flatMap((g) => Object.values(g.projects))
        .filter((p) => p.setup.some((f) => f.startsWith(`${dir}/.storybook/`)));
    return projects.length > 0 ? projects.flatMap((p) => p.specs) : null;
}

/**
 * Every test of the graphs built with `holder` as their vitest config (a shard's run loads it before any test),
 * when `holder` is one: graphty-element's vitest.config.ts imports visual-review's story-test.mjs.
 * @param dir the package
 * @param holder the file that reads another package's file, or null
 * @param gs the package's graphs
 * @returns the test files, or null when no graph of the package was built with that config
 */
function configSpecs(dir, holder, gs) {
    const hit = holder ? (usable(gs) ?? []).filter((g) => isConfigOf(g, holder)) : [];
    return hit.length > 0 ? hit.flatMap((g) => Object.values(g.projects).flatMap((p) => p.specs)) : null;
}

/**
 * The tests of a package that may run ESLint, when `holder` is its ESLint config (graphty's lint rules read
 * graphty-element's build): Vitest never loads that config, only a test that runs ESLint does, and such a
 * test reads files at run time (the rules file's opaqueTest pattern counts `new ESLint(` and `loadESLint`).
 * @param dir the package
 * @param holder the file that reads another package's file, or null
 * @param gs the package's graphs
 * @returns the test files, or null when the holder is not an ESLint config
 */
function lintSpecs(dir, holder, gs) {
    if (!holder || !/^eslint\.config\.[cm]?[jt]s$/u.test(holder.slice(dir.length + 1)) || !usable(gs)) {
        return null;
    }
    return gs.flatMap((g) => g.opaque ?? []);
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
 * @param ctx.deps Map of package name to its nx dependencies
 * @param ctx.built Set of the packages whose build inputs changed
 * @param ctx.noBuild Set of the package names that have no build
 * @returns `[{ file, holder }]`; holder null when the package has no graph to say which file reads it
 */
function foreignReads(name, dir, { changed, refs, graphs, pkgOf, nameOf, deps, built, noBuild }) {
    const gs = usable(graphs.get(dir));
    const upstream = closure(name, deps);
    const out = [];
    for (const file of changed) {
        const fdir = pkgOf(file);
        if (fdir && fdir !== dir) {
            const target = nameOf.get(fdir);
            out.push(
                ...readsOf(file, fdir, {
                    gs,
                    upstream: noBuild.has(target) ? new Set() : upstream,
                    target,
                    refs: refs.get(name) ?? [],
                }),
            );
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
 * The reads of one changed file of another package: the file itself when a graph of the reader holds it
 * (except the source of a build the reader depends on, which throughSources follows), and each holder of a
 * literal path the file is under.
 * @param file the changed file
 * @param fdir its package directory
 * @param ctx `{ gs, upstream, target, refs }`
 * @param ctx.gs the reader's usable graphs, or null
 * @param ctx.upstream Set of the packages the reader depends on, itself included
 * @param ctx.target the changed file's package name
 * @param ctx.refs the reader's testRefs()
 * @returns `[{ file, holder }]`
 */
function readsOf(file, fdir, { gs, upstream, target, refs }) {
    const out = [];
    const viaBuild = upstream.has(target) && buildInput(file.slice(fdir.length + 1));
    if (!viaBuild && gs?.some((g) => knows(g, file))) {
        out.push({ file, holder: file });
    }
    for (const r of refs) {
        if (!r.build && r.target === target && file.startsWith(r.prefix)) {
            out.push({ file, holder: r.holder });
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
    // a test or lint config never goes into a build (a Vite config may: it is not one of these), nor does a
    // file only such a config imports (visual-review's story-test.mjs, which graphty-element's vitest.config.ts
    // imports and two of its tests import in turn)
    const testConfig = (rel) => /^(vitest[^/]*|eslint)\.config\.[cm]?[jt]s$/u.test(rel);
    const own = (f) =>
        f.startsWith(`${dir}/`) && buildInput(f.slice(dir.length + 1)) && !testConfig(f.slice(dir.length + 1));
    if (holder?.startsWith(`${dir}/`) && testConfig(holder.slice(dir.length + 1))) {
        return false;
    }
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
    // a file the vitest config imports selects every test (specsReaching, configSpecs): the shards run whole
    const byConfig = [...result.specs.values()].find((why) => why.includes(CONFIG_WHY));
    const every = usable(graphs)?.flatMap((g) => Object.values(g.projects).flatMap((p) => p.specs)) ?? [];
    if (result.mode !== "all" && byConfig && every.every((spec) => result.specs.has(spec))) {
        whole(dir, byConfig);
    }
    if (result.mode !== "all") {
        result.mode = result.specs.size > 0 ? "files" : "none";
        // decided file by file: a "none" here is a changed package none of whose tests reach the change
        result.fileLevel = result.mode === "files" || mine.length > 0 || Boolean(result.upstream);
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
 * kept as `measured` (with `untrusted`, as a smoke shard's: the shard runs whole because that answer is not
 * relied on), so the replay can show it before it is allowed.
 * @param shards SHARDS entries (the gate's or CI's)
 * @param packages selectPackages(...).packages
 * @param graphs Map(dir -> [graph...])
 * @param allowed Set of package directories where file-level selection is allowed; omitted, every one is
 * @param browserAllowed Set of package directories whose browser projects may be selected file by file too
 * @param smoke selectPackages().smoke: shards that run whole whatever their package's selection
 * @returns `[{ shard, package, mode, files, total, reasons, measured? }]`; total is the shard's test file
 *   count when known; measured `{ mode, files }` is the file-level answer where it was not allowed
 */
export function selectShards(shards, packages, graphs, allowed, browserAllowed = new Set(), smoke = new Map()) {
    return shards.map((shard) => {
        const p = packages.get(shard.package) ?? { mode: "all", reasons: ["unknown package"], specs: new Map() };
        const runs = shardRuns(shard);
        const gs = graphs.get(shard.package) ?? [];
        const own = runs && gs.length > 0 && !gs.includes(null) ? shardSpecs(runs, gs) : null;
        const base = { shard: shard.shard, package: shard.package, total: own ? own.specs.size : null };
        // a shard that runs whole keeps its test files, so a pull request can pack them into bins (lightPlan())
        const all = own ? { specs: [...own.specs].sort() } : {};
        const sel = measuredShard(p, own);
        if (smoke.has(shard.shard) && packages.get(shard.package)?.mode !== "all") {
            return {
                ...base,
                total: null,
                mode: "all",
                files: [],
                reasons: [smoke.get(shard.shard)],
                ...all,
                measured: { mode: sel.mode, files: sel.files, untrusted: true },
            };
        }
        if (!p.fileLevel || sel.mode === "all") {
            return { ...base, ...sel, ...(sel.mode === "all" ? all : {}) };
        }
        const why = notAllowed(shard.package, own, allowed, browserAllowed);
        if (!why) {
            return { ...base, ...sel };
        }
        const measured = { mode: sel.mode, files: sel.files, untrusted: true };
        return { ...base, mode: "all", files: [], reasons: [why], measured, ...all };
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
        return nx[1] === dir && viaScript && script === "vitest run --coverage" ? { dir, env: [], args: [] } : null;
    }
    const m = PLAIN_VITEST.exec(cmd);
    // COVERAGE_DIR only moves a coverage report this run does not write, and GRAPHTY_FEATURES_ON=1 (kept) adds
    // the On projects the shard names (tools/features-on.mjs); any other variable picks a lane
    const env = m?.[2].trim().split(/\s+/u).filter(Boolean) ?? [];
    const keep = env.filter((e) => e === "GRAPHTY_FEATURES_ON=1");
    if (!m || m[1] !== dir || env.some((e) => !e.startsWith("COVERAGE_DIR=") && !keep.includes(e))) {
        return null;
    }
    const args = m[3]
        .replace(/--config (\S+)/u, "--config=$1")
        .trim()
        .split(/\s+/u)
        .filter((a) => a && !DROPPED.test(a));
    return args.every((a) => /^--project=\S+$|^--config=\S+$/u.test(a)) ? { dir, env: keep, args } : null;
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
    const env = run.env.map((e) => `${e} `).join("");
    return `cd ${run.dir} && ${env}pnpm exec vitest run ${[...run.args, ...rel].join(" ")}`.trimEnd();
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
            const measured = { mode: s.mode, files: s.files ?? [] };
            plan.push({ shard, mode: "all", files: [], reasons: [why], covers: [shard.shard], measured });
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
            ...(s.specs && { specs: s.specs }),
        });
    }
    return plan;
}

/** The longest a light-check test bin is planned to run (design/ci/channels-pipeline/merging.md section 4.1). */
export const BIN_LIMIT_MS = 8 * 60_000;
/** Milliseconds counted for a file of a family with no recorded file at all. */
const NO_HISTORY_MS = 30_000;
/**
 * Milliseconds added to every file in a bin for Vitest's per-file setup and import, which a recorded duration
 * (the file's own test time) leaves out. Evidence (#3645): graphty-element's browser slice on master reports
 * `Duration 692s (setup 84s, import 367s, tests 222s)`, 4 to 5 s of setup and import per file.
 */
export const FILE_OVERHEAD_MS = 5_000;

/**
 * Packs one shard family's selected test files into bins of at most `limitMs` each, longest file first, each
 * into the first bin it fits (first-fit decreasing). A file with no recorded time counts as the family's longest
 * recorded file; a file longer than the limit gets a bin of its own.
 * @param files the selected test files (repository paths)
 * @param fileMs Map(file -> recorded ms) over the whole family, not only the selected files
 * @param [limitMs] the most one bin may hold
 * @param [overheadMs] added to every file's recorded ms: Vitest's per-file setup and import
 * @returns `[{ files, ms }]`, the longest bin first; `files` sorted
 */
export function packBins(files, fileMs, limitMs = BIN_LIMIT_MS, overheadMs = FILE_OVERHEAD_MS) {
    const longest = Math.max(0, ...fileMs.values()) || NO_HISTORY_MS;
    const sized = [...new Set(files)]
        .map((file) => ({ file, ms: (fileMs.get(file) ?? longest) + overheadMs }))
        .sort((a, b) => b.ms - a.ms || a.file.localeCompare(b.file));
    const bins = [];
    for (const { file, ms } of sized) {
        const bin = bins.find((b) => b.ms + ms <= limitMs);
        if (bin) {
            bin.files.push(file);
            bin.ms += ms;
        } else {
            bins.push({ files: [file], ms });
        }
    }
    for (const b of bins) b.files.sort();
    return bins.sort((a, b) => b.ms - a.ms);
}

/**
 * A shard's family: its name without a slice number (as tools/test-ledger.mjs's familyOf).
 * @param shard a shard name
 * @returns the family name
 */
const familyOf = (shard) => shard.replace(/-\d+$/u, "");

/**
 * The light check's test plan (design/ci/channels-pipeline/merging.md section 4.1): each shard family's
 * selected files packed into bins of at most BIN_LIMIT_MS, each bin one `vitest run` of its files. A family
 * with a shard that runs whole has all its test files packed the same way (packWhole()), or, when they cannot be
 * listed or run by file, runs every shard of it as today.
 * @param root the checkout
 * @param shards SHARDS entries
 * @param selection selectShards() for them
 * @param [durations] `{ "<family>": { "<file>": ms } }`, the recorded per-file durations
 * @returns `{ bins: [{ name, family, shard, covers, files, ms, command, why }], whole: [shard], none: [shard], why,
 *   touched }`; `why` maps each family that runs whole to `{ package, shards, reasons }` and a bin's `why` each of
 *   its files to its reason; `touched` is every test file the import graphs selected, also in a shard that runs
 *   whole (the pull request rules read it: a test outside it was not changed by the pull request, nor anything it
 *   imports) and `unknown` every family with a shard that has no file-level answer the selector relies on, all of
 *   whose files count as touched; a
 *   bin's `shard` is the SHARDS entry its command comes from, `covers` every shard its run stands in for
 *   (planRuns() merges slices that select the same files), `name` is `<family>-<n>`
 */
export function lightPlan(root, shards, selection, durations = {}) {
    const out = { bins: [], whole: [], none: [], why: {} };
    const runsPlanned = planRuns(root, shards, selection);
    const touched = new Set(runsPlanned.flatMap((r) => [...r.files, ...(r.measured?.files ?? [])].map((f) => f.file)));
    out.touched = [...touched].sort();
    // a whole run with no file-level answer, or one the selector does not rely on (a smoke shard, a package or a
    // browser project not allowed file by file), says nothing about which files the change reached
    const unknown = runsPlanned.filter(
        (r) => r.mode === "all" && (!r.measured || r.measured.untrusted || r.measured.mode === "all"),
    );
    out.unknown = [...new Set(unknown.map((r) => familyOf(r.shard.shard)))].sort();
    const families = Map.groupBy(runsPlanned, (r) => familyOf(r.shard.shard));
    for (const [family, runs] of families) {
        const fileMs = new Map(Object.entries(durations[family] ?? {}));
        if (runs.some((r) => r.mode === "all")) {
            if (!packWhole(root, family, runs, fileMs, out)) {
                runWhole(family, runs, out);
            }
            continue;
        }
        let n = 0;
        for (const run of runs) {
            if (run.mode === "none") {
                out.none.push(...run.covers);
                continue;
            }
            const fileWhy = new Map(run.files.map((f) => [f.file, f.why]));
            for (const bin of packBins(
                run.files.map((f) => f.file),
                fileMs,
            )) {
                n += 1;
                const command = selectedCommand(root, run.shard, bin.files);
                out.bins.push({
                    name: `${family}-${n}`,
                    family,
                    shard: run.shard.shard,
                    covers: run.covers,
                    ...bin,
                    command,
                    why: Object.fromEntries(bin.files.map((f) => [f, fileWhy.get(f) ?? "selected"])),
                });
            }
        }
    }
    return out;
}

/**
 * A family that runs every shard of it with the shard's own command.
 * @param family the family name
 * @param runs its planRuns() entries
 * @param out lightPlan()'s output, which gets the shards and the reasons
 */
function runWhole(family, runs, out) {
    out.whole.push(...runs.flatMap((r) => r.covers));
    const reasons = [...new Set(runs.filter((r) => r.mode === "all").flatMap((r) => r.reasons))];
    out.why[family] = {
        package: runs[0].shard.package,
        shards: runs.flatMap((r) => r.covers),
        reasons: reasons.length > 0 ? reasons : ["the selector gave no reason"],
    };
}

/**
 * A family that runs whole in a pull request, packed into bins of at most BIN_LIMIT_MS like a selection (#4160):
 * every test file of its shards, each bin one `vitest run` without coverage (the full run measures coverage), and
 * `whole` naming its package (tools/ci-test-matrix.mjs plan() keeps it only when nx calls that affected). A
 * family whose files are not known (no import graph) or whose command is not a plain vitest run stays whole.
 * @param root the checkout
 * @param family the family name
 * @param runs its planRuns() entries
 * @param fileMs Map(file -> recorded ms) of the family
 * @param out lightPlan()'s output, which gets the bins
 * @returns whether the family was packed
 */
function packWhole(root, family, runs, fileMs, out) {
    const shard = runs[0].shard;
    const files = [...new Set(runs.flatMap((r) => r.specs ?? r.files.map((f) => f.file)))];
    // slices of one shard differ only by --shard, which selectedCommand() drops
    const one = new Set(runs.map((r) => selectedCommand(root, r.shard, null))).size === 1;
    if (!one || runs.some((r) => r.mode === "all" && !r.specs) || !selectedCommand(root, shard, files)) {
        return false;
    }
    const reasons = [...new Set(runs.filter((r) => r.mode === "all").flatMap((r) => r.reasons))];
    const why = `its shard runs whole, packed into bins: ${reasons.join("; ") || "the selector gave no reason"}`;
    const covers = runs.flatMap((r) => r.covers);
    packBins(files, fileMs).forEach((bin, i) => {
        out.bins.push({
            name: `${family}-${i + 1}`,
            family,
            shard: shard.shard,
            covers,
            // a whole family, like a shard that runs whole, runs only when nx calls its package affected
            whole: shard.package,
            ...bin,
            command: selectedCommand(root, shard, bin.files),
            why: Object.fromEntries(bin.files.map((f) => [f, why])),
        });
    });
    return true;
}

/**
 * The light check's plan as Markdown for a CI job summary: what each test bin runs and why, which shards run
 * whole and why, and which run nothing.
 * @param plan lightPlan() output (or the `--plan` JSON)
 * @param [affected] the package directories nx calls affected: a whole family of another package is not in the
 *   run's matrix (tools/ci-test-matrix.mjs plan()), so it is left out of the summary
 * @returns Markdown
 */
export function planSummary(plan, affected) {
    const esc = (t) => String(t).replaceAll(/[&<>]/gu, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
    const whole = Object.entries(plan.why ?? {}).filter(([, w]) => !affected || affected.includes(w.package));
    const shardCount = whole.reduce((n, [, w]) => n + w.shards.length, 0);
    const lines = [
        `### Light check: ${plan.bins.length} test bins, ${shardCount} shards whole, ${plan.none.length} shards with nothing selected`,
        "",
    ];
    if (plan.everything && whole.length > 0) {
        lines.push(`Every affected shard runs whole: ${esc(plan.everything)}`, "");
    }
    for (const [family, w] of whole) {
        lines.push(`- **${family}** runs whole: ${esc(w.reasons.join("; "))}`);
    }
    if (plan.none.length > 0) {
        lines.push(`- nothing selected, not run: ${plan.none.join(", ")}`);
    }
    for (const bin of plan.bins.filter((b) => !b.whole || !affected || affected.includes(b.whole))) {
        lines.push("", `<details><summary>${bin.name}: ${bin.files.length} files</summary>`, "");
        for (const f of bin.files) {
            lines.push(`- \`${f}\`: ${esc(bin.why?.[f] ?? "selected")}`);
        }
        lines.push("", "</details>");
    }
    return `${lines.join("\n")}\n`;
}

// --- which stories a change runs (design/ci/channels-pipeline/stories-as-tests.md section 5) ------------

/**
 * Whether a lockfile change moves a package whose name matches `re` (a Playwright, Storybook or font bump
 * changes every picture). Unknown (a lockfile missing) counts as moved.
 * @param before the lockfile at the base, or null
 * @param after the lockfile at the head, or null
 * @param re the package-name pattern
 * @returns boolean
 */
export function lockMoves(before, after, re) {
    if (before === null || after === null) {
        return true;
    }
    const a = lockSections(before).entries;
    const b = lockSections(after).entries;
    return ["packages", "snapshots"].some((sec) => {
        const x = a.get(sec) ?? new Map();
        const y = b.get(sec) ?? new Map();
        return [...new Set([...x.keys(), ...y.keys()])].some((k) => x.get(k) !== y.get(k) && re.test(k));
    });
}

/**
 * Whether a shard runs its package's storybook Vitest project, where each story file is a test file.
 * @param shard a SHARDS entry
 * @returns boolean
 */
const storyShard = (shard) => (shardRuns(shard) ?? []).some((r) => r.projects.includes("storybook"));

/**
 * Why every story of a project runs, or null: a global input, its own Storybook setup, the shared theme or a
 * lockfile move.
 * @param project the visual-review project id
 * @param dir the project's Storybook directory (its storybook-static's parent)
 * @param changed changed repo-relative paths
 * @param rules loadRules(root).stories
 * @param lockMoved whether the lockfile moved a package every picture depends on
 * @returns a reason or null
 */
function storiesGlobal(project, dir, changed, rules, lockMoved) {
    if (lockMoved) {
        return `${LOCK} moves a package every picture depends on`;
    }
    const own = rules.projectGlobal.map(
        (p) => new RegExp(p.replaceAll("{dir}", dir.replaceAll(".", String.raw`\.`)), "u"),
    );
    const theme = rules.theme.projects.includes(project) ? [new RegExp(rules.theme.pattern, "u")] : [];
    const hit = changed.find((f) => [...rules.global, ...own, ...theme].some((re) => re.test(f)));
    return hit ? `${hit} changes every story of the project` : null;
}

/**
 * The stories one visual-review project runs from the test selection: its storybook shards' answer, or for a
 * project without a story import graph every story when a package that draws it is selected at all.
 * @param project the visual-review project id
 * @param pkg the package that holds its stories
 * @param shards `[{ shard: SHARDS entry, sel: selectShards() entry }]`
 * @param drawnBy packages whose selection runs the project whole when it has no story graph
 * @returns `{ mode, files, reasons }`
 */
function storiesFromTests(project, pkg, shards, drawnBy) {
    const own = shards.filter((s) => s.shard.package === pkg && storyShard(s.shard));
    if (own.length > 0) {
        const all = own.find((s) => s.sel.mode === "all");
        if (all) {
            return { mode: "all", files: [], reasons: all.sel.reasons };
        }
        const files = [...new Set(own.flatMap((s) => (s.sel.files ?? []).map((f) => f.file)))].sort();
        return { mode: files.length > 0 ? "files" : "none", files, reasons: [] };
    }
    // ponytail: no story graph for these projects yet, so any selected package that draws them runs all of them
    const hit = shards.find((s) => drawnBy.includes(s.shard.package) && s.sel.mode !== "none");
    return hit
        ? { mode: "all", files: [], reasons: [`${hit.shard.package} is selected and ${project} has no story graph`] }
        : { mode: "none", files: [], reasons: [] };
}

/**
 * Which stories of each visual-review project a change runs: every story on a global input (test-select-rules
 * "stories"), the stories whose import closure reaches a changed file (the storybook shards' selection),
 * and every story whose baseline changed. Unknown means run: a project without a story import graph runs
 * whole whenever a package that draws it is selected, and a project not in the rules' selectProjects (not yet
 * proven by `test-select-mutate.mjs --stories`) runs whole on every change, except a change only to CI and tool
 * files no story reads (the rules' storyless), which runs none.
 * @param input what the change is
 * @param input.projects visual-review.config.json `projects`
 * @param input.changed changed repo-relative paths
 * @param input.everything selectChange().everything
 * @param input.shards SHARDS entries
 * @param input.selection selectShards() for them
 * @param input.rules loadRules(root).stories
 * @param input.lockMoved lockMoves() for the change (false when the lockfile did not change)
 * @returns `[{ project, mode: "all"|"files"|"none", files, baselines, reasons }]`; baselines are the story ids
 *   whose baseline image changed, which run whatever the mode
 */
export function selectStories({ projects, changed, everything, shards, selection, rules, lockMoved }) {
    const paired = shards.map((shard) => ({ shard, sel: selection.find((s) => s.shard === shard.shard) }));
    const known = paired.filter((p) => p.sel);
    // CI and tool files no story reads (test-select-rules stories.storyless); a test that names one selects its
    // package, which says nothing about a story reading it
    const storyless =
        !everything && changed.length > 0 && changed.every((f) => (rules.storyless ?? []).some((re) => re.test(f)));
    return Object.entries(projects).map(([project, cfg]) => {
        const dir = cfg.storybook.replace(/\/storybook-static$/u, "");
        const pkg = dir.split("/")[0];
        const prefix = `visual-baselines/${project}/`;
        const baselines = changed
            .filter((f) => f.startsWith(prefix) && f.endsWith(".png"))
            .map((f) => f.slice(prefix.length, -".png".length))
            .sort();
        const global = everything
            ? `${everything} runs everything`
            : storiesGlobal(project, dir, changed, rules, lockMoved);
        let sel = { mode: "all", files: [], reasons: [global] };
        if (!global && storyless) {
            sel = { mode: "none", files: [], reasons: ["the change touches only files no story reads"] };
        } else if (!global) {
            sel = rules.selectProjects.includes(project)
                ? storiesFromTests(project, pkg, known, rules.drawnBy[project] ?? [pkg])
                : {
                      mode: "all",
                      files: [],
                      reasons: [`${project} runs whole until test-select-mutate --stories proves its selection`],
                  };
        }
        return { project, ...sel, baselines };
    });
}

const STORY_FILE = /\.stories\.[cm]?[jt]sx?$/u;

/**
 * The longest a light-check Stories bin's capture is planned to take: the job's setup (about 1.5 min) comes on
 * top. At 4 min, six PR runs of 2026-10-28 (40613759747 to 40620698652) captured the fullest bins in up to 1.23
 * times their plan (graphty-element-3: 329 s, graphty-3: 318 s), so 3 min keeps a bin's capture under about 4 min
 * of real time, at 33 bins for a change that runs every story (27 at 4 min) (#3448).
 */
export const STORY_BIN_LIMIT_MS = 3 * 60_000;

/**
 * A story's capture time, per project (all of its modes, the job's browsers): the light check's own Stories jobs'
 * capture seconds divided by the stories (`export const` of a capitalized name) in their files, PR runs
 * 40388949450, 40390361128 and 40394323379 (2026-10-26), rounded up. A project not listed counts NO_HISTORY_MS a
 * story. Counted per file, one story per file left graphty's workspace bin (82 stories in 6 files) at 16 to 19
 * minutes, the pull request's critical path, against a 20-minute job limit.
 */
// ponytail: one rate per project; graphty's workspace stories take about twice its average, so record capture time per story in the results store if bins drift from 4 min
export const STORY_MS = {
    // its Specimens files; its Samples files are in STORY_FILE_MS (11 PR runs of 2026-10-27, 40573748841 to
    // 40602189710: 132 bins fitted at 2.75 s a Specimens story, 6.2 s a Samples story)
    "graph-io-fidelity": 2_800,
    // PR runs 40590034554, 40591791083, 40602189710 (2026-10-27): graphty's bins without a STORY_FILE_MS file
    // captured at 0.26 to 0.66 of their plan at 6 s, so it is 3 s; its heavy files keep their own times
    graphty: 3_000,
    // the same 2026-10-28 runs captured its bins at 0.77 times their plan at 1.6 s
    "cytoscape-extensions": 1_300,
    // the same runs: graphty-element's two bins captured at 1.6 to 2.1 times their plan at 1.4 s (447 s and 460 s
    // for graphty-element-1, the pull request's last job in 7 of 19 runs), so it was 2.5 s; six PR runs of
    // 2026-10-28 (40613759747 to 40620698652) captured its bins at 1.11 times their plan at 2.5 s, so it is 2.8 s
    "graphty-element": 2_800,
    "compact-mantine": 1_000,
    algorithms: 1_200,
    layout: 900,
};

/**
 * A story's capture time for a story file far slower than its project's STORY_MS, measured the same way: the
 * Start screen's stories each load a sample, run Louvain and wait for a stable frame (PR run 40559883826,
 * Stories (graphty-4): 624 s for its 12 stories in two modes, against about 6 s for graphty's other stories).
 */
// ponytail: a hand-kept table (#4041 makes this file fast); record capture time per story in the results store when more files drift
export const STORY_FILE_MS = {
    "graphty/src/workspace/start/StartScreen.stories.tsx": 52_000,
    // PR run 40567162255, Stories (graphty-1): 458 s for these two files' 40 stories, planned at 240 s
    "graphty/src/workspace/frame/Frame.stories.tsx": 11_500,
    "graphty/src/workspace/style/StylePanel.stories.tsx": 11_500,
    // graph-io-fidelity's Samples files draw real datasets, about twice its Specimens stories (fit above, at
    // STORY_MS); xgmml's bin with half of gexf/Specimens took 246 s against 182 s fitted, so its samples are 12 s
    "graph-io/fidelity-stories/stories/cx/Samples.stories.ts": 6_200,
    "graph-io/fidelity-stories/stories/cx2/Samples.stories.ts": 6_200,
    "graph-io/fidelity-stories/stories/cys/Samples.stories.ts": 6_200,
    "graph-io/fidelity-stories/stories/cytoscapejs/Samples.stories.ts": 6_200,
    "graph-io/fidelity-stories/stories/dot/Samples.stories.ts": 6_200,
    "graph-io/fidelity-stories/stories/gephi-json/Samples.stories.ts": 6_200,
    "graph-io/fidelity-stories/stories/gexf/Samples.stories.ts": 6_200,
    "graph-io/fidelity-stories/stories/gml/Samples.stories.ts": 6_200,
    "graph-io/fidelity-stories/stories/graphology/Samples.stories.ts": 6_200,
    "graph-io/fidelity-stories/stories/pajek/Samples.stories.ts": 6_200,
    "graph-io/fidelity-stories/stories/vis-network/Samples.stories.ts": 6_200,
    "graph-io/fidelity-stories/stories/xgmml/Samples.stories.ts": 12_000,
    "graph-io/fidelity-stories/stories/yed-graphml/Samples.stories.ts": 6_200,
    "graph-io/fidelity-stories/stories/yed-live-graphml/Samples.stories.ts": 6_200,
};

const STORY_EXPORT = /^export const [A-Z]/gmu;

/**
 * The stories a story file declares: its `export const` statements of a capitalized name, at least one.
 * @param source the file's text
 * @returns the count
 */
export function storyCount(source) {
    return Math.max(1, (source.match(STORY_EXPORT) ?? []).length);
}

/**
 * One story file's binning units: the file, or for a file longer than a bin its parts by story
 * (`<file>#<k>/<n>`, which ci.yml's pick step resolves), each with its planned ms.
 * @param file the story file
 * @param count the stories it declares
 * @param recordedMs its recorded play-test time, 0 without one
 * @param rate its project's STORY_MS
 * @returns `[[unit, ms]]`
 */
function storyUnits(file, count, recordedMs, rate) {
    const ms = Math.max(recordedMs, (STORY_FILE_MS[file] ?? rate) * count);
    const parts = Math.min(count, Math.ceil(ms / STORY_BIN_LIMIT_MS));
    if (parts <= 1) {
        return [[file, ms]];
    }
    return Array.from({ length: parts }, (_, i) => [`${file}#${i + 1}/${parts}`, ms / parts]);
}

/**
 * The light check's `Stories (<project>-<bin>)` jobs (merging.md section 4.1): each project's selected story
 * files packed into bins of at most STORY_BIN_LIMIT_MS, a file counted at the longer of its recorded time and its
 * stories at its project's STORY_MS. A project selected whole bins every story file under its Storybook directory; a
 * changed baseline's story id is packed with them as one story at that rate. A file longer than a bin is split by story into
 * `<file>#<k>/<n>` parts: the k-th of every n of its stories in the Storybook index's order.
 * @param stories selectStories()
 * @param projects visual-review.config.json `projects`
 * @param listFiles (dir) => the repository paths under dir
 * @param [durations] lightPlan()'s durations; a project's are its package's `<package>-storybook` family's
 * @param [storiesIn] (file) => the stories the file declares (storyCount() of its text)
 * @returns `[{ name, project, storybook, files, ids, ms }]`, `name` is `<project>-<n>`
 */
export function storyBins(stories, projects, listFiles, durations = {}, storiesIn = () => 1) {
    const out = [];
    for (const s of stories) {
        const { storybook } = projects[s.project];
        const dir = storybook.replace(/\/storybook-static$/u, "");
        const files = s.mode === "all" ? listFiles(dir).filter((f) => STORY_FILE.test(f)) : s.files;
        if (files.length === 0 && s.baselines.length === 0) {
            continue;
        }
        // a recorded play-test time marks a heavy file; the project's capture rate is the floor
        const recorded = durations[`${dir.split("/")[0]}-storybook`] ?? {};
        const rate = STORY_MS[s.project] ?? NO_HISTORY_MS;
        const unitMs = new Map(files.flatMap((f) => storyUnits(f, storiesIn(f), recorded[f] ?? 0, rate)));
        // a changed baseline's story is one capture at the project's rate, packed with the files (#4401: 300 ids in
        // one bin overran the job's limit); `id:` keeps it apart from a repository path
        for (const id of s.baselines) unitMs.set(`id:${id}`, rate);
        const bins = packBins([...unitMs.keys()], unitMs, STORY_BIN_LIMIT_MS, 0);
        bins.forEach((bin, i) =>
            out.push({
                name: `${s.project}-${i + 1}`,
                project: s.project,
                storybook,
                files: bin.files.filter((u) => !u.startsWith("id:")),
                ids: bin.files.filter((u) => u.startsWith("id:")).map((u) => u.slice(3)),
                ms: bin.ms,
            }),
        );
    }
    return out;
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
    const ctx = {
        walked: new Set(),
        imports,
        rel,
        failed,
        root,
        pkg,
        aliases: {},
        viaAlias: new Set(),
        blind: new Set(),
    };
    try {
        const walk = (project, file) => walkFile(project, file, ctx);
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
    return {
        package: pkg,
        config,
        projects,
        imports,
        opaque: opaqueSpecs(root, pkg, projects, imports),
        failed,
        aliases: ctx.aliases,
        aliased: [...ctx.viaAlias].map(rel).sort(),
        blind: [...ctx.blind].sort(),
    };
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
        deps = await edgesOf(project, file, ctx);
    } else if (STYLE.test(file)) {
        deps = styleEdges(file);
    }
    deps = new Set([...deps].map((d) => throughSource(d, file, ctx)));
    ctx.imports[ctx.rel(file)] = [...deps].map(ctx.rel);
    for (const d of deps) {
        await walkFile(project, d, ctx);
    }
}

/**
 * Another package's build output, as the source file it was built from, when that is known: the selection
 * graph then follows a change to that package's source to exactly the tests that load it (design/ci/
 * minimal-tests.md section 2.2). Only the graph is changed; the tests themselves still run the build. A file
 * reached this way, and what it reaches outside the package under test, is kept in `viaAlias`: it is the
 * other package's code, not a file this package's tests read.
 * @param dep an absolute path the file imports
 * @param from the importing file
 * @param ctx shared state of the run
 * @returns the path to walk instead (dep itself when it is not a build output or its source is unknown)
 */
function throughSource(dep, from, ctx) {
    const own = (f) => f.startsWith(join(ctx.root, ctx.pkg) + "/");
    const src = own(dep) ? null : sourceOf(ctx.root, dep);
    if (src) {
        ctx.aliases[ctx.rel(dep)] = ctx.rel(src);
        ctx.viaAlias.add(src);
        return src;
    }
    if (ctx.viaAlias.has(from) && !own(dep)) {
        ctx.viaAlias.add(dep);
    }
    return dep;
}

/**
 * One code file's edges: what Vite's transform says it imports (static and literal dynamic imports, with
 * any `?raw`-style query dropped), plus `new URL("./file", import.meta.url)`.
 * @param project the Vitest project whose Vite server transforms the file
 * @param file an absolute path
 * @param ctx shared state of the run: `failed` (the files Vite could not transform, with why), `viaAlias` and
 *   `blind` (the packages whose source could not be walked)
 * @returns Set of absolute paths of files in the checkout
 */
async function edgesOf(project, file, ctx) {
    const deps = new Set();
    let transformed = null;
    try {
        const env = project.vite.environments.ssr;
        transformed = env.moduleGraph.getModuleById(file)?.transformResult || (await env.transformRequest(file));
    } catch (e) {
        if (ctx.viaAlias.has(file)) {
            // another package's source this project cannot transform: what it imports is unknown, so it is
            // treated as that package's whole build (blind); the graph still holds for this package's own files
            ctx.blind.add(ctx.rel(file));
            return deps;
        }
        // its imports are unknown, so the graph cannot say what reaches what (an unbuilt dependency's dist is
        // the usual cause): the graph is not used
        ctx.failed.push(`${relative(project.config.root, file)}: ${String(e?.message ?? e).split("\n")[0]}`);
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

const SOURCE_EXT = ["", ".ts", ".tsx", ".mts", ".js", ".mjs"];
const sourceCache = new Map();

/**
 * The source file a package's build output was built from, or null when that is not known for certain:
 *  1. a source map that names exactly one source (tsc's output, file for file, and a one-module chunk);
 *  2. an entry whose type shim only re-exports one module (`export * from "./src/formats/dot/index.js";`,
 *     written beside each entry by graph-io's, graph-samples', graph-format's and webgpu-graph-algorithms'
 *     bundle-types scripts);
 *  3. the `"."` export of a package whose build names exactly one entry (`entry: "src/index.ts"` in its Vite
 *     config or scripts/build-bundle.js: compact-mantine, layout).
 * A bundle of many modules with none of these (graphty-element's) stays a build output, so a change to that
 * package runs its readers whole.
 * @param root the checkout
 * @param file an absolute path
 * @returns an absolute path or null
 */
export function sourceOf(root, file) {
    if (!sourceCache.has(file)) {
        sourceCache.set(file, findSource(root, file));
    }
    return sourceCache.get(file);
}

function findSource(root, file) {
    const [pkg, out] = relative(root, file).split("/");
    const pkgDir = join(root, pkg);
    if (out !== "dist" || !/\.[cm]?js$/u.test(file) || !isFile(join(pkgDir, "package.json"))) {
        return null;
    }
    const inPkg = (f) => f && f.startsWith(`${pkgDir}/`) && !f.startsWith(`${pkgDir}/dist/`) && isFile(f);
    let map = null;
    try {
        map = JSON.parse(readFileSync(`${file}.map`, "utf8"));
    } catch {
        // no source map
    }
    if (map?.sources?.length === 1) {
        const src = resolve(dirname(file), map.sourceRoot ?? "", map.sources[0]);
        return inPkg(src) ? src : null;
    }
    const shim = safeRead(file.replace(/\.[cm]?js$/u, ".d.ts"))
        .replaceAll(/\/\/[^\n]*|\/\*[\s\S]*?\*\//gu, "")
        .trim();
    const one = /^export \* from ["'](\.\/[^"']+)\.js["'];?$/u.exec(shim);
    if (one) {
        const base = join(pkgDir, relative(join(pkgDir, "dist"), join(dirname(file), one[1])));
        return SOURCE_EXT.map((e) => base + e).find(inPkg) ?? null;
    }
    return rootEntry(pkgDir, file, inPkg);
}

/**
 * The single build entry of a package, when `file` is what its `"."` export points at.
 * @param pkgDir the package's absolute directory
 * @param file an absolute path in its dist/
 * @param inPkg (path) => whether it is a source file of the package
 * @returns an absolute path or null
 */
function rootEntry(pkgDir, file, inPkg) {
    const targets = [];
    const collect = (t) => (typeof t === "string" ? targets.push(t) : t && Object.values(t).forEach((v) => collect(v)));
    try {
        const exp = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")).exports;
        collect(typeof exp === "string" ? exp : exp?.["."]);
    } catch {
        return null;
    }
    if (!targets.some((t) => join(pkgDir, t) === file)) {
        return null;
    }
    const entries = new Set();
    for (const cfg of ["vite.config.ts", "vite.config.js", "vite.config.mjs", "scripts/build-bundle.js"]) {
        const text = safeRead(join(pkgDir, cfg));
        for (const m of text.matchAll(/\bentry\s*:\s*(?:path\.resolve\(\s*__dirname\s*,\s*)?["'`]([^"'`]+)["'`]/gu)) {
            entries.add(
                m[1].startsWith(".") && cfg.includes("/") ? join(pkgDir, dirname(cfg), m[1]) : join(pkgDir, m[1]),
            );
        }
        if (
            /\bentry\s*:\s*[^"'`\s]/u.test(
                text.replaceAll(/\bentry\s*:\s*path\.resolve\(\s*__dirname\s*,\s*["'`]/gu, ""),
            )
        ) {
            // an entry built from a variable (several entries): not one this can read
            return null;
        }
    }
    return entries.size === 1 && inPkg([...entries][0]) ? [...entries][0] : null;
}

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
        const mine = shards.filter((s) => s.package === dir);
        const configs = new Set(mine.flatMap((s) => (shardRuns(s) ?? []).map((r) => r.config)));
        // the -features-on projects exist only under GRAPHTY_FEATURES_ON=1 (tools/features-on.mjs)
        const on = mine.some((s) => s.flags === "on");
        graphs.set(
            dir,
            [...(configs.size > 0 ? configs : [null])].map((config) =>
                cache(dir, config, () => graphChild(root, dir, config, on), on ? "features-on" : ""),
            ),
        );
    }
    return graphs;
}

/**
 * Graphs kept in <main checkout>/tmp/test-select/graphs/, keyed by the package's committed tree, so a
 * package nobody changed is not walked again. A package with uncommitted changes is always walked.
 * @param root the checkout
 * @returns `(dir, config, build, variant) => graph`, `variant` "features-on" for a graph with the On projects
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
    return (dir, config, build, variant = "") => {
        let file = null;
        try {
            if (dirPath && git(["status", "--porcelain", "--", dir]) === "") {
                const tree = git(["rev-parse", `HEAD:${dir}`]);
                const key = createHash("sha256")
                    .update([GRAPH_VERSION, rulesHash, tree, config, variant].join("\0"))
                    .digest("hex");
                file = join(dirPath, `${dir}-${key.slice(0, 16)}.json`);
                const cached = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
                if (cached && sameOutside(root, cached.outside) && sameAliases(root, cached.aliases)) {
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

/**
 * The key of the whole set of cached graphs, for CI's actions/cache entry (design/ci/channels-pipeline/
 * budgets-and-trust.md section 1.8): a hash of what the graphs are built from -- every package's committed
 * tree, the root's tracked code, config and lockfile files, the rules and this walk -- never of the commit,
 * so a change to docs or to the workflows keeps the key.
 * @param root the checkout
 * @param dirs the package directories
 * @returns hex
 */
export function graphCacheKey(root, dirs) {
    const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }).trim();
    const rootFiles = git(["ls-files"])
        .split("\n")
        .filter((f) => !f.includes("/") && /\.([cm]?[jt]s|json|ya?ml)$/u.test(f));
    const paths = [...[...dirs].sort(), ...rootFiles.sort(), "tools/test-select.mjs", "tools/test-select-rules.json"];
    const trees = paths.map((p) => `${p}=${git(["rev-parse", "HEAD:" + p])}`);
    return createHash("sha256")
        .update([GRAPH_VERSION, ...trees].join("\0"))
        .digest("hex");
}

/** Bumped when the graph's shape or the walk changes, so cached graphs of the old walk are not used. */
const GRAPH_VERSION = 6;

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
 * Whether every build output a cached graph followed to its source still maps to that source (a package
 * that moved an entry, or a build that changed shape, must be walked again).
 * @param root the checkout
 * @param aliases the graph's `aliases` (build output -> source), or undefined
 * @returns boolean
 */
export const sameAliases = (root, aliases) =>
    Boolean(aliases) &&
    Object.entries(aliases).every(([out, src]) => sourceOf(root, join(root, out)) === join(root, src));

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
        // another package's source reached through its build is that package's code, not a read of this one
        const aliased = new Set(gs.flatMap((g) => g.aliased ?? []));
        const found = new Map();
        for (const holder of [...[...inGraph].filter((f) => !aliased.has(f)), ...configFiles(root, dir)]) {
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
    const ignored = !known && ignoredPath(root, path);
    // a path into a folder the package does not have names nothing of it: a path joined at run time onto
    // another directory (visual-review's story-test.mjs reads "../assets/server/..." beside Storybook's
    // package.json in node_modules), not a file built from parts
    if (!known && !ignored && !isPath(root, path.split("/").slice(0, 2).join("/"))) {
        return null;
    }
    return { target, prefix: known ? stripExt(path) : `${pkg}/`, holder, build: ignored };
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
export function pathIndex(root) {
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

function graphChild(root, dir, config, on = false) {
    if (!existsSync(join(root, dir, "package.json"))) {
        return null;
    }
    try {
        const out = execFileSync(
            process.execPath,
            [fileURLToPath(import.meta.url), "--root", root, "--graph", dir, ...(config ? ["--config", config] : [])],
            {
                cwd: root,
                encoding: "utf8",
                maxBuffer: 1 << 30,
                stdio: ["ignore", "pipe", "pipe"],
                env: on ? { ...process.env, GRAPHTY_FEATURES_ON: "1" } : process.env,
            },
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
 * @param deferDownstream selectPackages' option of that name
 * @param lockRefs `{ base, head }` (head null for the working tree) to read a changed lockfile between; without
 *   it a changed lockfile runs everything
 * @returns `{ everything, packages, shards }`
 */
export async function selectChange(root, changed, shards, graphs, deferDownstream = false, lockRefs = null) {
    const graph = projectGraph(root);
    if (!graph) {
        throw new Error("nx's project graph could not be read");
    }
    useNamesRoot(root);
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
        deferDownstream,
        lockfile: lockRefs && changed.includes(LOCK) ? lockfileImporters(root, lockRefs.base, lockRefs.head) : null,
    });
    return {
        ...sel,
        shards: selectShards(shards, sel.packages, all, rules.fileLevel, rules.fileLevelBrowser, sel.smoke),
    };
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

/**
 * The light check's plan JSON (`--plan`): the test bins and the stories of a change.
 * @param root the checkout
 * @param input the change
 * @param input.changed changed paths
 * @param input.selection selectChange()
 * @param input.shards SHARDS
 * @param input.base the base ref
 * @param input.head the head ref
 * @param input.durations lightPlan()'s durations
 * @returns `{ changed, everything, bins, whole, none, stories, storyBins }`
 */
function planOf(root, { changed, selection, shards, base, head, durations }) {
    const show = (rev) => {
        try {
            return execFileSync("git", ["show", `${rev}:${LOCK}`], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
        } catch {
            return null;
        }
    };
    const rules = loadRules(root).stories;
    const mb = execFileSync("git", ["merge-base", base, head], { cwd: root, encoding: "utf8" }).trim();
    const lockMoved = changed.includes(LOCK) && lockMoves(show(mb), show(head), rules.lockfile);
    const projects = JSON.parse(readFileSync(join(root, "visual-review.config.json"), "utf8")).projects;
    const stories = selectStories({
        projects,
        changed,
        everything: selection.everything,
        shards,
        selection: selection.shards,
        rules,
        lockMoved,
    });
    const listFiles = (dir) =>
        execFileSync("git", ["ls-files", "--", dir], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
    return {
        changed: changed.length,
        everything: selection.everything,
        ...lightPlan(root, shards, selection.shards, durations),
        stories,
        storyBins: storyBins(stories, projects, listFiles, durations, (f) => {
            try {
                return storyCount(readFileSync(join(root, f), "utf8"));
            } catch {
                return 1;
            }
        }),
    };
}

async function main(argv) {
    const arg = (name) => {
        const i = argv.indexOf(name);
        return i === -1 ? undefined : argv[i + 1];
    };
    const root = resolve(arg("--root") ?? join(HERE, ".."));
    if (argv.includes("--summary")) {
        if (!arg("--summary")) {
            throw new Error("--summary needs the plan JSON file");
        }
        const affected = arg("--affected") && JSON.parse(arg("--affected")).map((p) => p.replace(/^@graphty\//u, ""));
        process.stdout.write(planSummary(JSON.parse(readFileSync(arg("--summary"), "utf8")), affected || undefined));
        return;
    }
    if (arg("--graph")) {
        process.env.GRAPHTY_TEST_SLOTS = "0";
        const json = JSON.stringify(await buildGraph(root, arg("--graph"), arg("--config") ?? null));
        // a pipe is written asynchronously: exiting before the write is done would cut the graph short
        process.stdout.write(`${json}\n`, () => process.exit(0));
        return;
    }
    const { SHARDS } = await import(pathToFileURL(join(root, "tools/ci-test-matrix.mjs")).href);
    if (argv.includes("--cache-key")) {
        console.log(graphCacheKey(root, new Set(SHARDS.map((s) => s.package))));
        return;
    }
    const base = arg("--base") ?? "origin/master";
    const head = arg("--head") ?? "HEAD";
    const changed = changedFiles(root, base, head);
    // a pull request's selection: the full-run-only On shards are never in it, nor in its import graphs
    const shards = SHARDS.filter((s) => !s["full-run-only"]);
    const selection = await selectChange(root, changed, shards, undefined, argv.includes("--defer-downstream"), {
        base,
        head,
    });
    if (argv.includes("--plan")) {
        const durations = arg("--durations") ? JSON.parse(readFileSync(arg("--durations"), "utf8")) : {};
        console.log(JSON.stringify(planOf(root, { changed, selection, shards, base, head, durations })));
        return;
    }
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
