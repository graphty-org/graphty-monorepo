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
import { buildInput, loadRules, sourceOf } from "./test-select.mjs";

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
    const all = (file, reason) => {
        why.push({ file, effect: `every route: ${reason}` });
        for (const r of routes) if (!picked.has(r.id)) picked.set(r.id, `${file}: ${reason}`);
    };
    const none = (file, reason) => why.push({ file, effect: `none: ${reason}` });
    for (const file of changed) {
        const pkg = file.split("/")[0];
        const inPkg = file.slice(pkg.length + 1);
        if (app.files.has(file)) all(file, "the app's build runs it");
        else if (file.startsWith(SUITE)) {
            if (file.endsWith(".mjs")) all(file, "the suite's own code");
            else none(file, "not code of the suite");
        } else if (RUNNER_INPUTS.has(file) || everything.some((re) => re.test(file)))
            all(file, "an input of every run");
        else if (file.startsWith(DATA)) {
            const name = basename(file);
            const opening = routes.filter((r) => r.text.includes(name));
            if (opening.length) {
                why.push({ file, effect: `${opening.length} route(s) open it` });
                for (const r of opening) if (!picked.has(r.id)) picked.set(r.id, `${file}: the route opens ${name}`);
            } else if (routesText.includes(name)) all(file, "a shared step names it");
            else none(file, "no route opens it");
        } else if (!app.packages.has(pkg) && !app.whole.has(pkg)) none(file, "outside the app's packages");
        else if (!buildInput(inPkg)) none(file, "a test, story or doc");
        else if (app.whole.has(pkg)) all(file, `the app bundles ${pkg} from a build whose sources are not known`);
        else if (/^eslint\.config\./u.test(inPkg)) none(file, "lint configuration");
        else if (CODE.test(file) && inPkg.startsWith("src/")) none(file, "code the app's build does not run");
        else all(file, "not code the build maps to sources (fail safe)");
    }
    return { routes: picked, why };
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
    const mapSources = (mapFile, from) =>
        JSON.parse(readFileSync(mapFile, "utf8")).sources.map((s) => resolve(from, s));
    for (const m of readdirSync(assets).filter((f) => f.endsWith(".map"))) {
        for (const abs of mapSources(join(assets, m), builtAt)) {
            const rel = relative(root, abs);
            if (rel.startsWith("..") || rel.includes("node_modules/")) continue;
            const [pkg, out] = rel.split("/");
            if (out !== "dist") {
                files.add(rel);
                continue;
            }
            // another package's build output: its own map, or test-select's mapping to its source
            const own = `${abs}.map`;
            const srcs = existsSync(own) ? mapSources(own, dirname(abs)) : [sourceOf(root, abs)].filter(Boolean);
            const inside = srcs.map((s) => relative(root, s)).filter((s) => s.startsWith(`${pkg}/`));
            if (inside.length) inside.forEach((s) => files.add(s));
            else whole.add(pkg);
        }
    }
    const packages = new Set([...files].map((f) => f.split("/")[0]).concat([...whole], workspaceDeps(root, "graphty")));
    return { files, packages, whole };
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
function runFolder() {
    const main = dirname(git(["rev-parse", "--path-format=absolute", "--git-common-dir"]));
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

async function main(argv) {
    let o;
    try {
        o = parseArgs({
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
    } catch (err) {
        return usage(err.message);
    }
    const [command] = o.positionals;
    const v = o.values;
    if (!["run", "select"].includes(command) || o.positionals.length > 1) return usage("one command: run or select");
    if (v.all && (v.base || v.changed))
        return usage("--all runs every route; --changed and --base measure a change: use one");

    const dist = resolve(v.dist ?? join(ROOT, "graphty/dist"));
    if (!v.dist && !v["no-build"]) {
        console.log("acceptance: building the app (nx caches an unchanged tree)");
        const built = spawnSync(
            "bash",
            [join(ROOT, "tools/low-priority.sh"), "pnpm", "exec", "nx", "run", "graphty:build"],
            {
                cwd: ROOT,
                stdio: "inherit",
            },
        );
        if (built.status !== 0) {
            console.error("acceptance: the app's build failed, nothing run");
            return 4;
        }
    }
    if (!existsSync(join(dist, "index.html"))) {
        console.error(`acceptance: no built app at ${dist}`);
        return 4;
    }

    const { routes } = await import(pathToFileURL(join(ROOT, SUITE, "routes.mjs")).href);
    const suite = routes.map((r) => ({ id: r.id, text: r.walk.toString() }));
    let selection;
    if (v.all) {
        selection = { mode: "all", routes: suite.map((r) => ({ id: r.id, why: "--all" })) };
    } else {
        const base = v.base ?? pushBaseRef({ cwd: ROOT });
        const { mergeBase, files } = changedSince(ROOT, base);
        const s = selectRoutes({
            changed: files,
            app: appInputs(ROOT, dist),
            routes: suite,
            routesText: readFileSync(join(ROOT, SUITE, "routes.mjs"), "utf8"),
            everything: loadRules(ROOT).everything,
        });
        selection = {
            mode: "changed",
            base,
            mergeBase,
            changed: s.why,
            routes: suite.filter((r) => s.routes.has(r.id)).map((r) => ({ id: r.id, why: s.routes.get(r.id) })),
        };
    }
    const folder = runFolder();
    writeFileSync(join(folder, "selection.json"), JSON.stringify({ dist, ...selection }, null, 1) + "\n");
    if (selection.mode === "changed") {
        console.log(
            `acceptance: ${selection.changed.length} changed file(s) since ${selection.base} (${selection.mergeBase.slice(0, 10)})`,
        );
        for (const c of selection.changed) console.log(`  ${c.file}: ${c.effect}`);
    }
    console.log(
        `acceptance: ${selection.routes.length} of ${suite.length} route(s) selected (${join(folder, "selection.json")})`,
    );
    if (command === "select") {
        for (const r of selection.routes) console.log(`  ${r.id}: ${r.why}`);
        return 0;
    }
    if (!selection.routes.length) return 0;

    const ids = selection.routes.map((r) => r.id).join(",");
    const run = spawnSync(
        process.execPath,
        [join(ROOT, SUITE, "run.mjs"), "--only", ids, "--dist", dist, "--workers", v.workers],
        {
            cwd: ROOT,
            stdio: "inherit",
        },
    );
    const out = join(ROOT, "tmp/dry-run");
    if (existsSync(out)) cpSync(out, folder, { recursive: true });
    console.log(`acceptance: results and end screens in ${folder}`);
    if (run.status === 0) return 0;
    if (run.status !== 1) return run.status === 2 ? 2 : 4;
    // every route failed for want of the GPU: the lane could not run, not a failed route
    const report = join(folder, "report.json");
    const failed = existsSync(report)
        ? JSON.parse(readFileSync(report, "utf8")).results.filter((r) => r.result !== "pass")
        : [];
    const noGpu =
        failed.length === selection.routes.length && failed.every((r) => /NVIDIA card|libEGL/u.test(r.reason ?? ""));
    return noGpu ? 4 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exit(await main(process.argv.slice(2)));
}
