#!/usr/bin/env node
/**
 * acceptance.mjs -- runs the graphty app's acceptance routes (graphty/acceptance/: real clicks, keys and
 * file choices from the start page, outcome checks read through graphty-element's public API) on this
 * machine's GPU, every route or only the ones a change can affect. No model is involved.
 * Design: design/ci/ai-checked-acceptance-tests.md (sections 5 and 9).
 *
 *   node tools/acceptance.mjs run [--changed]      the routes this branch's change can affect (the default)
 *   node tools/acceptance.mjs run --all            every route
 *   node tools/acceptance.mjs run --base <ref>     measure the change from <ref> (default: the push base,
 *                                                  tools/push-base.mjs)
 *   node tools/acceptance.mjs select [--base <ref>]   print the selected routes and why; runs nothing
 *
 * Options of both: --dist <dir> (a frozen build instead of graphty/dist), --no-build (use graphty/dist as
 * it is), --workers <1-4> (browsers, default 4). Without --dist or --no-build the app is built first
 * (nx caches it), since the selection reads the build's source maps.
 *
 * How a change selects routes: the app's build lists, in its source maps, every source file it bundles
 * (the app, graphty-element from source, the other packages through their dist and its maps). A changed
 * file the build runs selects every route; a test, story or doc selects none; code of an app package
 * the build does not run selects none; any other file of an app package (CSS, HTML, public/,
 * package.json, configs) selects every route, as does a shared root input (nx's sharedGlobals and the
 * rules file of tools/test-select.mjs) and the suite's own code; a changed data file selects the routes
 * that open it. Per-route selection by what each route executed (coverage) is not done yet: a change
 * the app runs runs the whole suite (about 30 s).
 *
 * Writes <main checkout>/tmp/acceptance/runs/<time>-<commit>/: selection.json (base, changed files, each
 * route selected and why), and after a run report.json, each route's end screen (<route>.png and
 * <route>.ui.png) and, for a failed route, <route>.aria.txt. Runs older than 14 days are removed.
 * Exit 0: every selected route passed (or none was selected); 1: a route failed; 2: usage; 4: could not
 * run (no build, no GPU).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { pushBaseRef } from "./push-base.mjs";
import { buildInput, loadRules } from "./test-select.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SUITE = "graphty/acceptance/";
const DATA = "design/ui/studio/tool/files/";
// The runner's own inputs besides the suite: a change to one can change any route's run.
const RUNNER_INPUTS = new Set([
    "tools/acceptance.mjs",
    "tools/test-slots.mjs",
    "design/ui/studio/tool/with-browser.sh",
    "pnpm-lock.yaml",
]);
const CODE = /\.(?:[cm]?[jt]sx?)$/u;
const KEEP_DAYS = 14;

/**
 * The routes a change can affect, and why.
 * @param o the change and what it can reach
 * @param o.changed repo-relative paths the change adds, changes or deletes
 * @param o.app what the app's build runs:
 *   the source files it bundles, the package directories it is built from, and the packages bundled from a
 *   build output whose sources are not known (any build input of one counts)
 * @param o.routes each route and its source text
 * @param o.routesText the whole routes file, for a data file a shared step names
 * @param o.everything root inputs that change every run
 * @returns route id -> reason, and
 *   what each changed file did
 */
export function selectRoutes({ changed, app, routes, routesText, everything }) {
    const picked = new Map();
    const why = [];
    for (const file of changed) {
        const { ids, effect, reason } = effectOf(file, { app, routes, routesText, everything });
        why.push({ file, effect });
        for (const id of ids === "all" ? routes.map((r) => r.id) : ids)
            if (!picked.has(id)) picked.set(id, `${file}: ${reason}`);
    }
    return { routes: picked, why };
}

const every = (reason) => ({ ids: "all", effect: `every route: ${reason}`, reason });
const none = (reason) => ({ ids: [], effect: `none: ${reason}`, reason });

/**
 * What one changed file selects.
 * @param file a repo-relative path
 * @param ctx selectRoutes' inputs but the changed files
 * @returns `{ ids: "all" | route ids, effect, reason }`
 */
function effectOf(file, ctx) {
    const { app, routes, routesText, everything } = ctx;
    const pkg = file.split("/")[0];
    const inPkg = file.slice(pkg.length + 1);
    if (app.files.has(file)) return every("the app's build runs it");
    if (file.startsWith(SUITE))
        return file.endsWith(".mjs") ? every("the suite's own code") : none("not code of the suite");
    if (RUNNER_INPUTS.has(file) || everything.some((re) => re.test(file))) return every("an input of every run");
    if (file.startsWith(DATA)) return dataEffect(basename(file), routes, routesText);
    if (!app.packages.has(pkg) && !app.whole.has(pkg)) return none("outside the app's packages");
    if (!buildInput(inPkg)) return none("a test, story or doc");
    if (app.whole.has(pkg)) return every(`the app bundles ${pkg} from a build whose sources are not known`);
    if (/^eslint\.config\./u.test(inPkg)) return none("lint configuration");
    if (CODE.test(file) && inPkg.startsWith("src/")) return none("code the app's build does not run");
    return every("not code the build maps to sources (fail safe)");
}

/**
 * What a changed data file selects: the routes that open it.
 * @param name the file's name
 * @param routes the routes and their source text
 * @param routesText the whole routes file
 * @returns as effectOf
 */
function dataEffect(name, routes, routesText) {
    const ids = routes.filter((r) => r.text.includes(name)).map((r) => r.id);
    if (ids.length) return { ids, effect: `${ids.length} route(s) open it`, reason: `the route opens ${name}` };
    return routesText.includes(name) ? every("a shared step names it") : none("no route opens it");
}

const git = (args, cwd = ROOT) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 28 }).trim();

/**
 * What the app's build runs, read from its source maps.
 * @param root the checkout
 * @param dist the build (graphty/dist or a frozen copy of it)
 * @returns see selectRoutes
 */
export function appInputs(root, dist) {
    const files = new Set();
    const whole = new Set();
    // the maps name sources relative to where the app was built, whichever folder holds the build now
    const builtAt = join(root, "graphty/dist/assets");
    const assets = join(dist, "assets");
    for (const m of readdirSync(assets).filter((f) => f.endsWith(".map"))) {
        for (const abs of mapSources(join(assets, m), builtAt)) {
            const rel = relative(root, abs);
            if (rel.startsWith("..") || rel.includes("node_modules/")) continue;
            const [pkg, out] = rel.split("/");
            if (out !== "dist") {
                files.add(rel);
                continue;
            }
            const inside = builtFrom(root, abs, pkg);
            if (inside.length) inside.forEach((s) => files.add(s));
            else whole.add(pkg);
        }
    }
    const packages = new Set([...files].map((f) => f.split("/")[0]).concat([...whole], workspaceDeps(root, "graphty")));
    return { files, packages, whole };
}

const mapSources = (mapFile, from) => JSON.parse(readFileSync(mapFile, "utf8")).sources.map((s) => resolve(from, s));

/**
 * The source files of the package a build output was built from, read from its own source map. An
 * output with no map is not known: a bundled entry (compact-mantine/dist/index.js) would otherwise
 * trace to its one entry source and miss every file it bundles.
 * @param root the checkout
 * @param abs a build output's absolute path
 * @param pkg its package directory
 * @returns repo-relative paths, empty when not known
 */
function builtFrom(root, abs, pkg) {
    const own = `${abs}.map`;
    if (!existsSync(own)) return [];
    return mapSources(own, dirname(abs))
        .map((s) => relative(root, s))
        .filter((s) => s.startsWith(`${pkg}/`));
}

/**
 * A package and every workspace package it depends on, as directories.
 * @param root the checkout
 * @param start a package directory
 * @returns directories
 */
function workspaceDeps(root, start) {
    const dirOf = new Map();
    for (const d of readdirSync(root)) {
        const p = join(root, d, "package.json");
        if (existsSync(p)) dirOf.set(JSON.parse(readFileSync(p, "utf8")).name, d);
    }
    const seen = new Set([start]);
    const todo = [start];
    while (todo.length) {
        const pj = JSON.parse(readFileSync(join(root, todo.pop(), "package.json"), "utf8"));
        for (const [name, spec] of Object.entries({ ...pj.dependencies, ...pj.peerDependencies })) {
            const d = dirOf.get(name);
            if (d && String(spec).startsWith("workspace:") && !seen.has(d)) {
                seen.add(d);
                todo.push(d);
            }
        }
    }
    return [...seen];
}

/**
 * Every path the change adds, changes or deletes since its merge base with `base`: commits, staged,
 * unstaged and untracked files.
 * @param root the checkout
 * @param base a ref
 * @returns the merge base and the paths
 */
function changedSince(root, base) {
    const mergeBase = git(["merge-base", "HEAD", base], root);
    const tracked = git(["diff", "--name-only", "--no-renames", mergeBase], root);
    const untracked = git(["ls-files", "--others", "--exclude-standard"], root);
    const files = [...new Set([tracked, untracked].join("\n").split("\n").filter(Boolean))].sort();
    return { mergeBase, files };
}

function usage(message) {
    console.error(
        `${message}\nusage: node tools/acceptance.mjs run|select [--all | --changed [--base <ref>]] [--dist <dir>] [--no-build] [--workers <1-4>]`,
    );
    return 2;
}

/**
 * The run folder in the main checkout, and the removal of runs older than KEEP_DAYS.
 * @returns a new, empty folder
 */
const gitCommonDir = () => git(["rev-parse", "--path-format=absolute", "--git-common-dir"]);

function runFolder() {
    const main = dirname(gitCommonDir());
    const runs = join(main, "tmp/acceptance/runs");
    mkdirSync(runs, { recursive: true });
    const old = Date.now() - KEEP_DAYS * 86_400_000;
    for (const d of readdirSync(runs))
        if (statSync(join(runs, d)).mtimeMs < old) rmSync(join(runs, d), { recursive: true, force: true });
    const stamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
    const dir = join(runs, `${stamp}-${git(["rev-parse", "--short=10", "HEAD"])}`);
    mkdirSync(dir);
    return dir;
}

function options(argv) {
    const o = parseArgs({
        args: argv,
        allowPositionals: true,
        options: {
            all: { type: "boolean", default: false },
            changed: { type: "boolean", default: false },
            base: { type: "string" },
            dist: { type: "string" },
            "no-build": { type: "boolean", default: false },
            workers: { type: "string", default: "4" },
        },
    });
    const [command] = o.positionals;
    if (!["run", "select"].includes(command) || o.positionals.length > 1) throw new Error("one command: run or select");
    if (o.values.all && (o.values.base || o.values.changed))
        throw new Error("--all runs every route; --changed and --base measure a change: use one");
    if (!/^[1-4]$/u.test(o.values.workers)) throw new Error("--workers is 1 to 4");
    return { command, ...o.values };
}

/**
 * The app's build to run against: --dist as it is, or graphty/dist, built first unless --no-build.
 * @param v the options
 * @returns the build's folder, or null when there is none
 */
function theBuild(v) {
    const dist = resolve(v.dist ?? join(ROOT, "graphty/dist"));
    if (!v.dist && !v["no-build"]) {
        console.log("acceptance: building the app (nx caches an unchanged tree)");
        const args = [join(ROOT, "tools/low-priority.sh"), "pnpm", "exec", "nx", "run", "graphty:build"];
        if (spawnSync("bash", args, { cwd: ROOT, stdio: "inherit" }).status !== 0) {
            console.error("acceptance: the app's build failed, nothing run");
            return null;
        }
    }
    if (existsSync(join(dist, "index.html"))) return dist;
    console.error(`acceptance: no built app at ${dist}`);
    return null;
}

/**
 * The routes to run, and why each.
 * @param v the options
 * @param dist the build
 * @param suite each route's id and source text
 * @returns what selection.json holds
 */
function choose(v, dist, suite) {
    if (v.all) return { mode: "all", routes: suite.map((r) => ({ id: r.id, why: "--all" })) };
    const base = v.base ?? pushBaseRef({ cwd: ROOT });
    const { mergeBase, files } = changedSince(ROOT, base);
    const s = selectRoutes({
        changed: files,
        app: appInputs(ROOT, dist),
        routes: suite,
        routesText: readFileSync(join(ROOT, SUITE, "routes.mjs"), "utf8"),
        everything: loadRules(ROOT).everything,
    });
    const routes = suite.filter((r) => s.routes.has(r.id)).map((r) => ({ id: r.id, why: s.routes.get(r.id) }));
    console.log(`acceptance: ${files.length} changed file(s) since ${base} (${mergeBase.slice(0, 10)})`);
    for (const c of s.why) console.log(`  ${c.file}: ${c.effect}`);
    return { mode: "changed", base, mergeBase, changed: s.why, routes };
}

/**
 * Walk the selected routes and keep what the runner wrote.
 * @param ids the route ids
 * @param dist the build
 * @param workers browsers
 * @param folder the run folder
 * @returns the exit status: 0 passed, 1 failed, 4 could not run
 */
function walk(ids, dist, workers, folder) {
    const egl = process.env.DRY_RUN_EGL_DIR || join(dirname(gitCommonDir()), "tmp/egl/root/usr/lib/x86_64-linux-gnu");
    if (!existsSync(join(egl, "libEGL.so.1"))) {
        console.error(
            `acceptance: could not run: the GPU browser needs libEGL.so.1 in ${egl} (see graphty/acceptance/README.md)`,
        );
        return 4;
    }
    const out = join(ROOT, "tmp/dry-run");
    // an earlier run's report must not be kept under this run's name when run.mjs stops before it clears it
    rmSync(out, { recursive: true, force: true });
    const args = [join(ROOT, SUITE, "run.mjs"), "--only", ids.join(","), "--dist", dist, "--workers", workers];
    const run = spawnSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
    if (existsSync(out)) cpSync(out, folder, { recursive: true });
    console.log(`acceptance: results and end screens in ${folder}`);
    if (run.status === 0) return 0;
    if (run.status !== 1) return 4;
    const report = join(folder, "report.json");
    const results = existsSync(report) ? JSON.parse(readFileSync(report, "utf8")).results : [];
    return couldNotRun(results, ids.length) ? 4 : 1;
}

/**
 * Whether a failed run could not run at all (exit 4) rather than had a route fail (exit 1): every route
 * failed for want of the GPU, or no route was reached (every browser failed to start).
 * @param results report.json's results
 * @param count the routes asked for
 * @returns true when no route was walked
 */
export function couldNotRun(results, count) {
    const failed = results.filter((r) => r.result !== "pass");
    if (failed.length !== count || !count) return false;
    return failed.every((r) => r.result === "not run" || /NVIDIA card|libEGL/u.test(r.reason ?? ""));
}

async function main(argv) {
    let v;
    try {
        v = options(argv);
    } catch (err) {
        return usage(err.message);
    }
    const dist = theBuild(v);
    if (!dist) return 4;
    const { routes } = await import(pathToFileURL(join(ROOT, SUITE, "routes.mjs")).href);
    const suite = routes.map((r) => ({ id: r.id, text: r.walk.toString() }));
    const selection = choose(v, dist, suite);
    const folder = runFolder();
    writeFileSync(join(folder, "selection.json"), JSON.stringify({ dist, ...selection }, null, 1) + "\n");
    console.log(`acceptance: ${selection.routes.length} of ${suite.length} route(s) selected (${folder})`);
    if (v.command === "select") {
        for (const r of selection.routes) console.log(`  ${r.id}: ${r.why}`);
        return 0;
    }
    if (!selection.routes.length) return 0;
    const ids = selection.routes.map((r) => r.id);
    return walk(ids, dist, v.workers, folder);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exit(await main(process.argv.slice(2)));
}
