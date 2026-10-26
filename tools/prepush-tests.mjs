#!/usr/bin/env node
/**
 * prepush-tests.mjs -- the test stage of tools/prepush.sh: every test shard CI's test job would run
 * for this push, with CI's own commands, on this machine.
 *
 * The shards and their commands come from tools/ci-test-matrix.mjs, the list ci.yml's build job
 * plans the test job from, and each one runs through tools/run-tests.sh, which reproduces the
 * environment CI gives that shard (CI=true, the lavapipe Vulkan driver, FC_FONTATIONS). So the
 * local gate and CI cannot drift: a shard added, removed or changed there is run, dropped or changed
 * here too. CI folds short shards into group jobs (GROUPS) to save runners; a group only runs its
 * members one after another, so here each member runs on its own.
 *
 * Usage: node tools/prepush-tests.mjs <affected-projects-json> [<base>]
 *   the JSON array `nx show projects --affected --json` prints, and the commit the push is compared
 *   with. A shard whose "local" policy is "when-paths-change" (graphty-element's eleven browser and
 *   storybook shards) runs only when a file changed since <base> is one it tests, as vitest itself
 *   resolves its command (gateShards below); without <base> (PREPUSH_ALL=1) every shard runs. One
 *   whose policy is "never" never runs here. CI runs them all either way.
 *
 * A shard that already PASSED with byte-identical inputs, on any branch -- its package's files and
 * those of every package it depends on or reads, the root files, the installed lockfile, the gate's
 * rule for judging a run, the Node version (tools/prepush-inputs.mjs) -- is skipped with a
 * [SKIP] line saying when, on which branch and on which commit it passed. So a push after a failed
 * gate re-runs the shard that failed and every shard whose inputs changed, and nothing else, and a
 * landing reuses what its branch passed. Passes are kept in <main checkout>/tmp/prepush-passes/shard/;
 * PREPUSH_RERUN_ALL=1 runs every shard.
 *
 * Shards run side by side: browser shards each take one slot of tools/with-browser.sh (the machine's
 * shared cap of four browsers), and at most two shards without a
 * browser run at once. Every shard then takes one machine-wide test slot (tools/test-slots.mjs), which
 * ad-hoc test runs share, so a shard may wait for runs of other sessions. Two things CI's separate runners give each shard are reproduced here:
 *  - On CI's runners no two shards share a Vite dependency cache; here every shard of one package
 *    shares its checkout. On a cold or stale shared cache each vitest optimizes and swaps a cache
 *    directory in under the others: four browser shards started together failed with deps chunks
 *    that "point to missing source files", and xr runs side by side lost chunks they were loading
 *    (issue #3319). So every shard gets its own Vite cache, node_modules/.vite/shard-<shard>
 *    (GRAPHTY_TEST_SHARD, shardEnv() below; a package's vitest config sets it as cacheDir through
 *    shardCacheDir() in tools/test-slots.mjs). Storybook's vitest plugin keeps its own sb-vitest
 *    cache, which a package's config cannot move, so in each package one shard of each family
 *    (graphty-element-storybook-1 to -5 is one family) still runs first, one at a time with nothing
 *    else of that package running -- the one with the shortest command -- and the rest of the
 *    package starts once all of its warm-ups passed. That warm-up only has to fill the caches every
 *    shard of the family shares, never one a later shard alone uses.
 *  - The packages that run several shards with --coverage (graphty-element, algorithms) write each
 *    shard's report to .coverage-parts/<shard> (COVERAGE_DIR), not into one coverage/ directory each
 *    run would empty under the others. In both packages COVERAGE_DIR otherwise only switches off
 *    thresholds that a --project run already switches off.
 * A shard passes only when it exits 0 AND its log shows a finished vitest run (tools/shard-verdict.mjs). Each
 * shard's output goes to tmp/prepush-tests/<shard>.log; the first failure stops the others and
 * prints the end of its log. The failed shard's whole log is also copied to
 * <main checkout>/tmp/push-gate-logs/<time>-<pid>-<shard>.log, which the next push does not overwrite. Neither a shard nor the
 * stage has a time limit: a hung test is ended by the one hang guard every vitest config sets (its
 * testTimeout and hookTimeout), and waiting for slots other gates hold is not a failure of this push.
 */

import { spawn, spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { partitionByPasses, passStore, shardKeys, testsPassed } from "./prepush-inputs.mjs";
import { checkShard, expectedRuns } from "./shard-verdict.mjs";
import { afterShard, closeFinished, quarantineEnabled, shQuote, splitLog } from "./test-quarantine.mjs";
import { planRuns, selectBaseOf, startAdvisory } from "./test-select.mjs";

// The checkout under test: PREPUSH_ROOT when tools/prepush.sh runs from the gate's live copy against
// another checkout, else this file's own. Its own CI matrix decides the shards, as CI's run on it will.
const ROOT = process.env.PREPUSH_ROOT || join(dirname(fileURLToPath(import.meta.url)), "..");
delete process.env.PREPUSH_ROOT;
const { SHARDS } = await import(pathToFileURL(join(ROOT, "tools/ci-test-matrix.mjs")).href);
// The test ledger records every shard run (design/ci/test-ledger.md); without it the gate decides as before.
const ledger = await import("./test-ledger.mjs").catch((e) => {
    console.log(`ledger: unavailable (${e.message.split("\n")[0]}); deciding as before`);
    return null;
});

// What every record of this checkout shares (commit, tree, branch, dirty), asked of git once per gate.
let head;
const headOnce = () => {
    try {
        head ??= ledger?.headFacts(ROOT);
    } catch {
        head = undefined;
    }
    return head;
};

/**
 * Records one shard run in the ledger; never throws.
 * @param shard the shard entry
 * @param main the main checkout
 * @param extra record()'s other fields
 * @returns the record, or null
 */
function ledgerRecord(shard, main, extra) {
    try {
        const runs = expectedRuns(shard["test-command"]);
        const facts = { shard: shard.shard, root: ROOT, main, runs, selected: shard.selected, head: headOnce() };
        return ledger?.record({ ...facts, ...extra }) ?? null;
    } catch (e) {
        console.log(`ledger: ${shard.shard} not recorded (${e.message.split("\n")[0]})`);
        return null;
    }
}

/**
 * The shards CI's test matrix runs for these affected projects, as plan() selects them before it
 * folds the short ones into groups.
 * @param affected nx project names (remote-logger is "@graphty/remote-logger")
 * @returns the SHARDS entries, longest-running kinds (browser) first
 */
export function localShards(affected) {
    const dirs = new Set(affected.map((p) => p.replace(/^@graphty\//, "")));
    const shards = SHARDS.filter((s) => dirs.has(s.package));
    return [...shards.filter((s) => s["needs-browser"]), ...shards.filter((s) => !s["needs-browser"])];
}

// Each shard's share of runs that failed (failed or error, of those that passed or failed) in the last 14 days.
const RATES_SQL = `SELECT shard, 1.0 * SUM(outcome IN ('failed', 'error')) / COUNT(*) AS rate FROM invocation
  WHERE outcome IN ('passed', 'failed', 'error') AND started_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days')
  GROUP BY shard`;

/**
 * Each shard's recent failure rate, from the test ledger. Never throws: without the ledger the map is empty and
 * the shards keep the order they have.
 * @param [lib] the test ledger module (tests pass a stand-in)
 * @param [log] where a line about an unavailable ledger goes
 * @returns shard name -> failure rate, 0 to 1
 */
export function failureRates(lib = ledger, log = console.log) {
    let db;
    try {
        const opened = lib?.openLedger(process.env, ROOT) ?? { why: "the ledger is unavailable" };
        db = opened.db;
        if (!db) throw new Error(opened.why);
        return new Map(
            db
                .prepare(RATES_SQL)
                .all()
                .map((r) => [r.shard, r.rate]),
        );
    } catch (e) {
        log(`ledger: no failure rates (${e.message.split("\n")[0]}); the shards start in their usual order`);
        return new Map();
    } finally {
        db?.close();
    }
}

/**
 * The shards with the likeliest failures first, so a failing push fails early; a stable sort, so shards with the
 * same rate (or none) keep their order (localShards': browser shards first).
 * @param shards the shards to run
 * @param rates failureRates()
 * @returns the shards, highest failure rate first
 */
export function byFailureRate(shards, rates) {
    return [...shards].sort((a, b) => (rates.get(b.shard) ?? 0) - (rates.get(a.shard) ?? 0));
}

/**
 * The shards this push runs, by each one's "local" policy (tools/ci-test-matrix.mjs).
 * @param shards the shards CI would run (localShards)
 * @param changed repo-relative paths changed by the push, or null to run every shard but "never"
 * @param triggersOf for a "when-paths-change" shard: `{ specs, config }`, the repo-relative test
 *   files its command runs and its setup, config and "local-paths" entries ("dir/" = a prefix)
 * @returns the shards to run, in the given order
 */
export function gateShards(shards, changed, triggersOf) {
    const policy = (s) => s.local ?? "always";
    const watched = shards.filter((s) => policy(s) === "when-paths-change");
    // A test file belongs to its own shard only, even when it sits under another one's prefix.
    const tested = new Set(changed === null ? [] : watched.flatMap((s) => [...triggersOf(s).specs]));
    return shards.filter((s) => {
        if (policy(s) !== "when-paths-change" || changed === null) {
            return policy(s) !== "never";
        }
        const { specs, config } = triggersOf(s);
        const configured = (f) => config.some((c) => (c.endsWith("/") ? f.startsWith(c) : f === c));
        return changed.some((f) => specs.has(f) || (!tested.has(f) && configured(f)));
    });
}

/**
 * What a shard's vitest command tests, asked of vitest itself: for each `vitest run` in the command,
 * the test files of its --project list cut to its --shard slice (vitest's own sequencer), the
 * projects' setup files and config files, and the shard's "local-paths". Runs in a child process
 * (`--triggers`): creating a Vitest sets NODE_ENV and VITEST*, which the shards must not inherit.
 * @param shard a SHARDS entry whose command starts `cd <package> && `
 * @returns `{ specs: string[], config: string[] }`, repo-relative
 */
async function vitestTriggers(shard) {
    const pkg = join(ROOT, /^cd (\S+) && /.exec(shard["test-command"])[1]);
    const { createVitest } = await import(
        pathToFileURL(createRequire(join(pkg, "package.json")).resolve("vitest/node"))
    );
    process.chdir(pkg);
    const rel = (f) => relative(ROOT, f);
    const specs = new Set();
    const config = new Set(shard["local-paths"] ?? []);
    for (const run of shard["test-command"].split("vitest run").slice(1)) {
        const project = [...run.matchAll(/--project=(\S+)/g)].map((m) => m[1]);
        const shardArg = /--shard=(\S+)/.exec(run)?.[1];
        const vitest = await createVitest("test", { project, shard: shardArg, watch: false }, {}, {});
        try {
            let files = await vitest.globTestSpecifications();
            if (vitest.config.shard) {
                files = await new vitest.config.sequence.sequencer(vitest).shard(files);
            }
            files.forEach((f) => specs.add(rel(f.moduleId)));
            config.add(rel(vitest.vite.config.configFile));
            for (const p of vitest.projects) {
                [p.vite.config.configFile, ...p.config.setupFiles].filter(Boolean).forEach((f) => config.add(rel(f)));
            }
        } finally {
            await vitest.close();
        }
    }
    process.chdir(ROOT);
    return { specs: [...specs], config: [...config] };
}

/**
 * The environment one shard adds: its name, which gives it its own Vite dependency cache
 * (shardCacheDir() in tools/test-slots.mjs), and its own coverage directory where a package runs
 * several shards.
 * @param shard a SHARDS entry
 * @returns extra environment variables
 */
export function shardEnv(shard) {
    return {
        GRAPHTY_TEST_SHARD: shard.shard,
        ...(["graphty-element", "algorithms"].includes(shard.package)
            ? { COVERAGE_DIR: `.coverage-parts/${shard.shard}` }
            : {}),
    };
}

// graphty-element-browser-3 -> graphty-element-browser; a shard without a number is its own family.
const family = (shard) => shard.shard.replace(/-\d+$/, "");

/**
 * The order shards may start in, as a predicate over the current state: in each package its family
 * warm-ups (the shortest command of each family) run one at a time with nothing else of the package
 * running, and every other shard of the package waits until all of them passed.
 * @param shards the shards of this run
 * @returns `canStart(shard, runningShards, warmedFamilies)`
 */
export function startRule(shards) {
    const warmup = new Map();
    for (const s of shards) {
        const w = warmup.get(family(s));
        if (!w || s["test-command"].length < w["test-command"].length) {
            warmup.set(family(s), s);
        }
    }
    const families = (pkg) => [...new Set(shards.filter((s) => s.package === pkg).map(family))];
    return (shard, running, warmed) => {
        if (families(shard.package).every((f) => warmed.has(f))) {
            return true;
        }
        return warmup.get(family(shard)) === shard && !running.some((s) => s.package === shard.package);
    };
}

/**
 * The "when-paths-change" shards' triggers, from one child process running `--triggers`.
 * @param shards the shards of this run
 * @param changed the changed paths
 * @returns a triggersOf function for gateShards
 */
export function childTriggers(shards, changed) {
    // A package none of whose files changed needs no vitest to know its shards are not triggered.
    const asked = shards.filter(
        (s) => s.local === "when-paths-change" && changed.some((f) => f.startsWith(`${s.package}/`)),
    );
    const found =
        asked.length === 0
            ? {}
            : JSON.parse(
                  execFileSync(
                      process.execPath,
                      [fileURLToPath(import.meta.url), "--triggers", ...asked.map((s) => s.shard)],
                      {
                          cwd: ROOT,
                          env: { ...process.env, PREPUSH_ROOT: ROOT },
                          encoding: "utf8",
                          stdio: ["ignore", "pipe", "inherit"],
                      },
                  )
                      .trim()
                      .split("\n")
                      .at(-1),
              );
    return (s) => ({ specs: new Set(found[s.shard]?.specs ?? []), config: found[s.shard]?.config ?? [] });
}

// PREPUSH_SELECT's default: on for landing checks (design/ci/minimal-tests.md, 6). Verification sets
// PREPUSH_ALL=1, which always runs everything; PREPUSH_SELECT=0 turns selection off for one push.
const SELECT_DEFAULT = "1";

/**
 * Whether the gate runs only the selected tests: PREPUSH_SELECT=1 (default SELECT_DEFAULT), a base to
 * measure the change from, and never under PREPUSH_ALL=1, which verification sets to run everything, nor
 * for a push to master.
 * @param env the environment
 * @param base the gate's base, or undefined
 * @returns boolean
 */
export function selectionOn(env, base) {
    // a push measured from master runs whole
    const cut = /(^|\/)master$/u.test(env.PREPUSH_SELECT_BASE ?? "");
    return Boolean(base) && !cut && env.PREPUSH_ALL !== "1" && (env.PREPUSH_SELECT ?? SELECT_DEFAULT) === "1";
}

// PREPUSH_DEFER_DOWNSTREAM's default. The owner agreed (2026-10-23) that a landing check need not run the
// tests of packages reached only as dependents of the change (a graph-io change no longer runs graphty-element's
// shards); verification of golden runs them, and reverts a culprit only on a failure that fails every confirming
// run (design/ci/fast-pipeline.md, section 9, decision 8). On; PREPUSH_DEFER_DOWNSTREAM=0 turns it off.
const DEFER_DEFAULT = "1";

/**
 * Whether a selecting gate leaves out the packages reached only as dependents or readers of a changed package.
 * @param env the environment
 * @returns boolean
 */
export function deferDownstreamOn(env) {
    return (env.PREPUSH_DEFER_DOWNSTREAM ?? DEFER_DEFAULT) === "1";
}

/**
 * The shards to run under selection (design/ci/minimal-tests.md, section 1.2): a shard the selector marks
 * "none" is left out, "files" becomes a copy of the shard whose command runs only those files (`selected`
 * lists them, `covers` the slices it stands for), "all" stays as it is.
 * @param plan planRuns()
 * @param log where the lines about left-out shards go
 * @returns SHARDS-shaped entries
 */
export function selectedShards(plan, log = console.log) {
    const out = [];
    for (const p of plan) {
        if (p.mode === "none") {
            log(`  [NONE] ${p.covers.join(", ")}: ${p.reasons[0] ?? "no test reaches the change"}`);
        } else if (p.mode === "files") {
            const selected = p.files.map((f) => f.file).sort();
            out.push({ ...p.shard, "test-command": p.command, selected, covers: p.covers });
        } else {
            out.push(p.shard);
        }
    }
    return out;
}

/**
 * The selector's answer for the gate's shards, asked of tools/test-select.mjs in a child process. Any
 * doubt runs every shard whole: the checkout's run-tests.sh cannot run a command of its own (a branch from
 * before --command), or the selector failed.
 * @param gated the shards the gate would run
 * @param base the gate's base
 * @returns the shards to run
 */
function selectRuns(gated, base) {
    if (!readFileSync(join(ROOT, "tools/run-tests.sh"), "utf8").includes("--command)")) {
        console.log("Test selection: this checkout's tools/run-tests.sh has no --command, so every shard runs whole.");
        return gated;
    }
    let selection;
    try {
        const select = join(dirname(fileURLToPath(import.meta.url)), "test-select.mjs");
        const defer = deferDownstreamOn(process.env) ? ["--defer-downstream"] : [];
        const out = execFileSync(
            process.execPath,
            [select, "--root", ROOT, "--base", selectBaseOf(ROOT, base), "--json", ...defer],
            {
                cwd: ROOT,
                encoding: "utf8",
                maxBuffer: 1 << 28,
                env: { ...process.env, GRAPHTY_TEST_SLOTS: "0" },
                stdio: ["ignore", "pipe", "inherit"],
            },
        );
        selection = JSON.parse(out.trim().split("\n").at(-1)).shards;
    } catch (e) {
        console.log(`Test selection: the selector failed (${e.message.split("\n")[0]}), so every shard runs whole.`);
        return gated;
    }
    console.log("Test selection (PREPUSH_SELECT=1; PREPUSH_SELECT=0 runs every shard whole):");
    if (deferDownstreamOn(process.env)) {
        console.log(
            "  Packages reached only as dependents of the change are left to verification (PREPUSH_DEFER_DOWNSTREAM=0 runs them).",
        );
    }
    return selectedShards(planRuns(ROOT, gated, selection));
}

/**
 * The shards the gate considers: under selection every shard but the "never" ones (the selector decides),
 * else those its "local" policy keeps (gateShards).
 * @param all the shards
 * @param changed the changed paths, or null
 * @param selecting selectionOn()
 * @returns SHARDS entries
 */
function candidates(all, changed, selecting) {
    if (selecting) {
        return all.filter((s) => s.local !== "never");
    }
    return gateShards(all, changed, changed === null ? null : childTriggers(all, changed));
}

/**
 * Builds the packages the selection runs that nx did not call affected (the gate's Build step built only
 * those), with what they depend on; nx's cache makes an unchanged one free.
 * @param planned the shards to run
 * @param affected nx's affected project names
 * @returns whether the build passed (true when there was nothing to build)
 */
function buildUnaffected(planned, affected) {
    const have = new Set(affected.map((p) => p.replace(/^@graphty\//, "")));
    const dirs = [...new Set(planned.map((s) => s.package))].filter((d) => !have.has(d));
    return buildPackages(ROOT, dirs, "nx did not call affected but whose tests run");
}

/**
 * Builds packages with what they depend on (nx's cache, shared by every worktree, makes an unchanged one free).
 * @param root the checkout
 * @param dirs package directories
 * @param why the end of the line saying so
 * @returns whether the build passed (true when there was nothing to build)
 */
function buildPackages(root, dirs, why) {
    const withBuild = dirs.filter((d) => {
        try {
            const pkg = JSON.parse(readFileSync(join(root, d, "package.json"), "utf8"));
            return Boolean(pkg.scripts?.build);
        } catch {
            return false;
        }
    });
    if (withBuild.length === 0) {
        return true;
    }
    const names = withBuild.map((d) => JSON.parse(readFileSync(join(root, d, "package.json"), "utf8")).name);
    console.log(`Test selection: building ${names.join(", ")}, which ${why}.`);
    const r = spawnSync(
        "pnpm",
        [
            "exec",
            "nx",
            "run-many",
            "-t",
            "build",
            `--projects=${names.join(",")}`,
            "--parallel=3",
            "--outputStyle=static",
        ],
        { cwd: root, stdio: "inherit", env: { ...process.env, NX_DAEMON: "false" } },
    );
    if (r.status !== 0) {
        console.log("That build failed.");
    }
    return r.status === 0;
}

const readJson = (file) => {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        return null;
    }
};

const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const GATE = join(dirname(fileURLToPath(import.meta.url)), "with-browser.sh");

/**
 * The note on a selected run's PASS line.
 * @param shard a shard entry, selected or not
 * @returns text, empty for a whole shard
 */
function selectedNote(shard) {
    if (!shard.selected) {
        return "";
    }
    const slices = shard.covers.length > 1 ? ", for " + shard.covers.join(", ") : "";
    return ` [selected: ${shard.selected.length} test file(s)${slices}]`;
}

/**
 * Shards that already passed with byte-identical inputs (tools/prepush-inputs.mjs) are not run again;
 * every other shard runs, and a pass is recorded when the shard's inputs are the same after it as
 * before it. PREPUSH_RERUN_ALL=1 or an unreadable package graph skips nothing.
 * @param shards the shards the gate would run
 * @param main the main checkout, which keeps the records in tmp/prepush-passes/
 * @returns `{ run, record(shard) }`; record returns a note for the shard's PASS line
 */
function passed(shards, main) {
    const none = { run: shards, record: () => "", keyOf: () => undefined };
    let branch = null;
    try {
        branch =
            execFileSync("git", ["symbolic-ref", "--short", "-q", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim() ||
            null;
    } catch {
        // detached
    }
    if (shards.length === 0 || process.env.PREPUSH_RERUN_ALL === "1") {
        return none;
    }
    const keys = shardKeys(ROOT);
    if (!keys) {
        console.log("Test shards: the package graph could not be read, so no shard is skipped or recorded.");
        return none;
    }
    const keyOf = keys();
    // A run of selected files is keyed by the whole shard's key and its file list, as a pass of its own kind,
    // so it never stands in for the whole shard. A pass of the whole shard stands in for it, unless the shard
    // is a --shard slice: the selection is taken before slicing, so a slice's pass does not cover it.
    const orig = (s) => SHARDS.find((x) => x.shard === s.shard) ?? s;
    const full = new Map(shards.map((s) => [s.shard, keyOf(orig(s))]));
    const wholeCovers = (s) => !/--shard=/.test(orig(s)["test-command"]);
    const keyFor = (s, fullKey) => (s.selected && fullKey ? sha256(`${fullKey}\0${s.selected.join("\n")}`) : fullKey);
    const before = new Map(shards.map((s) => [s.shard, keyFor(s, full.get(s.shard))]));
    const kindOf = (s) => (s.selected ? "shard-selected" : "shard");
    const store = passStore(main);
    const byKey = new Map(shards.map((s) => [before.get(s.shard), s]));
    const passOf = (key) => {
        const s = byKey.get(key);
        return (
            store.get(kindOf(s), key) ?? (s.selected && wholeCovers(s) ? store.get("shard", full.get(s.shard)) : null)
        );
    };
    const { run, skipped } = partitionByPasses(shards, before, passOf);
    for (const { shard, pass } of skipped) {
        ledgerRecord(shard, main, { code: 0, reusedFrom: pass.ledger ?? `pass-${pass.key}` });
        const on = [pass.branch, pass.sha?.slice(0, 9)].filter(Boolean).join(" at ");
        console.log(
            `  [SKIP] ${shard.shard}: passed at ${pass.at} on ${on} with byte-identical inputs (key ${pass.key.slice(0, 12)}; PREPUSH_RERUN_ALL=1 runs it)`,
        );
    }
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
    const record = (shard, log, ledgerId) => {
        const key = before.get(shard.shard);
        try {
            // A run that passed no test proves nothing about these inputs (an empty include, a filter).
            if (testsPassed(log) === 0) {
                return "; not recorded: its log shows no test that passed";
            }
            const now = keys()(orig(shard));
            if (!key || keyFor(shard, now) !== key) {
                return "; not recorded: its inputs changed while it ran";
            }
            const files = shard.selected ? { files: shard.selected } : {};
            store.record(kindOf(shard), key, {
                shard: shard.shard,
                ...files,
                ledger: ledgerId,
                branch,
                sha,
                at: new Date().toISOString(),
            });
            return "";
        } catch (e) {
            return `; not recorded: ${e.message.split("\n")[0]}`;
        }
    };
    return { run, record, keyOf: (shard) => before.get(shard.shard) };
}

function nothingToRun(gated, planned) {
    if (gated.length === 0) return "No affected package has a test shard to run here.";
    if (planned.length === 0) return "The test selection runs no shard: no test reaches this change.";
    return "Every shard already passed on these inputs.";
}

async function main() {
    if (process.argv[2] === "--triggers") {
        const out = {};
        for (const name of process.argv.slice(3)) {
            out[name] = await vitestTriggers(SHARDS.find((s) => s.shard === name));
        }
        console.log(JSON.stringify(out));
        process.exit(0);
    }
    const [affectedArg, base] = process.argv.slice(2);
    if (affectedArg === undefined) {
        console.error("usage: node tools/prepush-tests.mjs <affected-projects-json> [<base>]");
        process.exit(2);
    }
    const affected = JSON.parse(affectedArg);
    const selecting = selectionOn(process.env, base);
    // Under selection the selector decides which packages run, from every shard: nx's affected list misses
    // what tests read without importing it (design/ files, root tools), and the "when-paths-change" policy
    // would drop shards the selector runs whole (design/ci/minimal-tests.md, section 1.2).
    const all = selecting ? localShards(SHARDS.map((s) => s.package)) : localShards(affected);
    const changed = base
        ? // A branch can change tens of thousands of files (a study's screenshots): past the default
          // 1 MB output buffer, execFileSync kills git and throws ENOBUFS.
          execFileSync("git", ["diff", "--name-only", base, "HEAD"], {
              cwd: ROOT,
              encoding: "utf8",
              maxBuffer: 256 * 1024 * 1024,
          })
              .split("\n")
              .filter(Boolean)
        : null;
    const gated = candidates(all, changed, selecting);
    const skipped = all.filter((s) => !gated.includes(s));
    if (skipped.length > 0) {
        console.log(
            `Left to CI (this push changes none of the files they test): ${skipped.map((s) => s.shard).join(", ")}`,
        );
    }
    const main = dirname(
        execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim(),
    );
    const planned = selecting ? selectRuns(gated, base) : gated;
    if (selecting && !buildUnaffected(planned, affected)) {
        process.exit(1);
    }
    const passes = passed(planned, main);
    // The likeliest failures start first (graphty-1 to -3 fail 11-18% of runs, graph-format almost never).
    const shards = byFailureRate(passes.run, failureRates());
    if (shards.length === 0) {
        console.log(nothingToRun(gated, planned));
        return;
    }
    const tools = dirname(fileURLToPath(import.meta.url));
    const logs = join(ROOT, "tmp/prepush-tests");
    mkdirSync(logs, { recursive: true });
    console.log(`Shards: ${shards.map((s) => s.shard).join(", ")}`);

    const running = new Map();
    const warmed = new Set();
    const canStart = startRule(shards);
    const waiting = [...shards];
    const failed = [];
    const known = [];
    const quarantineLines = [];
    let stopping = false;
    const started = Date.now();
    // What the test selector would have run, logged beside what the gate runs; it changes nothing here.
    const advisory = startAdvisory(ROOT, base, main);
    const results = [];

    const start = (shard) => {
        const log = join(logs, `${shard.shard}.log`);
        const out = createWriteStream(log);
        // A machine-wide test slot (tools/test-slots.mjs) for the whole shard, taken after the browser slot: nothing
        // holding a test slot ever waits for a browser slot, so the two cannot wait on each other.
        const what = shard.selected ? ["--command", shard.shard, shard["test-command"]] : [shard.shard];
        // Through the quarantine wrapper (tools/test-quarantine.mjs): when only tests failed, it runs the failed
        // files once more, and a flaky or quarantined test does not fail the shard. The gate's own copies of it
        // and of test-slots.mjs, so a gate fix holds for every branch at once.
        const shardRun = ["bash", "tools/run-tests.sh", ...what].map(shQuote).join(" ");
        const quarantine = [join(tools, "test-quarantine.mjs"), "run", shard.shard, shardRun, "--via-run-tests"];
        const cmd = [process.execPath, ...quarantine];
        cmd.unshift(process.execPath, join(tools, "test-slots.mjs"));
        if (shard["needs-browser"] && existsSync(GATE)) {
            cmd.unshift(GATE);
        }
        // Its own process group, so stopping it takes vitest, its workers and Chromium along.
        const runId = ledger?.newRunId(shard.shard);
        const resultFile = join(logs, `${shard.shard}.quarantine.json`);
        rmSync(resultFile, { force: true });
        const child = spawn(cmd[0], cmd.slice(1), {
            cwd: ROOT,
            detached: true,
            stdio: ["ignore", "pipe", "pipe"],
            env: {
                ...process.env,
                ...shardEnv(shard),
                ...(runId ? { TEST_LEDGER_RUN: runId } : {}),
                TEST_QUARANTINE_RESULT: resultFile,
            },
        });
        child.stdout.pipe(out);
        child.stderr.pipe(out);
        const t0 = Date.now();
        running.set(shard.shard, child);
        child.on("close", (code) => {
            const secs = Math.round((Date.now() - t0) / 1000);
            // The verdict reads the whole log, so only once the log stream has finished (end() never calls
            // back on a log stream destroyed before it finished). The shard counts as running until then,
            // so no other shard's close ends the stage before this one's verdict.
            const settle = async () => {
                const text = existsSync(log) ? readFileSync(log, "utf8") : "";
                const q = readJson(resultFile);
                // The ledger records the first run and the retry as two runs, each with its own exit status.
                const parts = splitLog(text);
                const facts = { code: q?.firstCode ?? code, log: parts.first, runId, startedAt: t0, logFile: log };
                // A retry that ran none of the failed files (test-quarantine's retryRan) is no run of them.
                if (q?.retryRunId && q.retryRan !== false) {
                    const retried = { ...shard, selected: q.retryFiles };
                    ledgerRecord(retried, main, {
                        code: q.retryCode,
                        log: parts.retry,
                        runId: q.retryRunId,
                        logFile: log,
                    });
                }
                if (stopping) {
                    running.delete(shard.shard);
                    ledgerRecord(shard, main, { ...facts, cancelled: true });
                    // Once stopAll ran, the last shard to settle ends the stage: nothing else is left to.
                    if (running.size === 0) {
                        finish();
                    }
                    return;
                }
                // Exit 0 alone is not a pass: a pnpm older than 10.29.1 reports a killed run as 0
                // (tools/shard-verdict.mjs).
                const verdict = checkShard(shard, code, text, ROOT, t0);
                const rec = ledgerRecord(shard, main, facts);
                running.delete(shard.shard);
                results.push({ shard: shard.shard, ok: verdict.pass, secs, log });
                const letThrough = noteQuarantine(shard, q);
                if (verdict.pass && letThrough) {
                    // Passed only because a flaky or quarantined test was let through: no shard pass is recorded,
                    // and the stage exits 3, so the next push judges this shard again.
                    known.push(shard.shard);
                    warmed.add(family(shard));
                    console.log(
                        `  [PASS] ${shard.shard}${selectedNote(shard)} (${secs}s) only with the failures above let through; no pass recorded`,
                    );
                    next();
                    return;
                }
                if (verdict.pass) {
                    warmed.add(family(shard));
                    console.log(
                        `  [PASS] ${shard.shard}${selectedNote(shard)} (${secs}s)${passes.record(shard, text, rec?.id)}`,
                    );
                    next();
                    return;
                }
                failed.push(shard.shard);
                process.exitCode = 1;
                console.log(`  [FAIL] ${shard.shard} (${verdict.cause}, ${secs}s); the end of ${log}:`);
                console.log(text.split("\n").slice(-80).join("\n"));
                goOn(shard);
            };
            if (out.destroyed) {
                settle();
            } else {
                out.end(settle);
            }
        });
    };

    // After a shard that did not pass: the stage goes on in verification (PREPUSH_ALL=1),
    // which runs every shard to the end so one failure cannot hide another; the shard's family counts as warmed,
    // so the rest of its package still starts. Otherwise everything stops.
    const goOn = (shard) => {
        if (stopping) {
            if (running.size === 0) finish();
        } else if (process.env.PREPUSH_ALL === "1") {
            warmed.add(family(shard));
            next();
        } else {
            stopAll();
        }
    };

    const stopAll = () => {
        stopping = true;
        for (const child of running.values()) {
            try {
                process.kill(-child.pid, "SIGTERM");
            } catch {
                // already gone
            }
        }
        if (running.size === 0) {
            finish();
        } else {
            setTimeout(() => {
                for (const child of running.values()) {
                    try {
                        process.kill(-child.pid, "SIGKILL");
                    } catch {
                        // already gone
                    }
                }
                finish();
            }, 10_000);
        }
    };

    // The next push from this worktree overwrites tmp/prepush-tests/, so a failed shard's whole log is
    // copied under a name of its own beside the push queue's saved gate logs (<main checkout>/tmp/
    // push-gate-logs/, which keeps them 14 days), where a later run never writes over it.
    const keepLog = (shard) => {
        const log = join(logs, `${shard}.log`);
        if (!existsSync(log)) {
            return; // a signal, not a shard
        }
        const kept = join(main, "tmp/push-gate-logs");
        const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
        const copy = join(kept, `${stamp}-${process.pid}-${shard}.log`);
        mkdirSync(kept, { recursive: true });
        copyFileSync(log, copy);
        console.log(`  [FAIL] ${shard}: its whole log is kept in ${copy}`);
    };

    // The quarantine's bookkeeping for one shard (tools/test-quarantine.mjs), and its loud lines, printed now and
    // again in the summary. Returns whether the shard let a flaky or quarantined test's failure through.
    const noteQuarantine = (shard, q) => {
        if (!q || stopping) return false;
        const done = afterShard({ main, root: ROOT, shard: shard.shard, inputKey: passes.keyOf(shard), result: q });
        const lines = [
            ...q.flaky.map(
                (f) => `  [FLAKY] ${shard.shard}: ${f.file} > ${f.name} failed and passed on the same inputs`,
            ),
            ...q.excused.map((f) => `  [QUARANTINED] ${shard.shard}: ${f.file} > ${f.name} failed; it is quarantined`),
            ...done.added.map((e) => `  [QUARANTINE+] ${e.file} > ${e.name}: added, issue #${e.issue}`),
            ...done.left.map((e) => `  [QUARANTINE-] ${e.id}: left the list (${e.why})`),
        ];
        lines.forEach((l) => console.log(l));
        quarantineLines.push(...lines);
        return q.flaky.length + q.excused.length > 0;
    };

    const finish = () => {
        const secs = Math.round((Date.now() - started) / 1000);
        advisory.report(results);
        if (quarantineLines.length) {
            console.log("Quarantine (tools/test-quarantine.mjs; `node tools/test-quarantine.mjs status`):");
            quarantineLines.forEach((l) => console.log(l));
        }
        if (failed.length) {
            failed.forEach(keepLog);
            // "Stopped after SIG... failed" reads as the machine's failure, not this push's, so a
            // signal is named first even when a shard failed before it.
            const first = failed.find((f) => f.startsWith("SIG")) ?? failed[0];
            const what = stopping ? `Stopped after ${first} failed` : `Failed: ${failed.join(", ")}`;
            console.log(`${what} (${secs}s)${stopping ? "; the other shards did not finish" : ""}.`);
            process.exit(1);
        }
        if (known.length) {
            console.log(
                `Every shard passed but ${known.join(", ")}, which passed only with failures let through: flaky or quarantined (${secs}s).`,
            );
            process.exit(3);
        }
        console.log(`All ${shards.length} shards passed in ${secs}s.`);
        process.exit(0);
    };

    // Every waiting shard starts (browser ones then queue on the shared gate), except one startRule
    // holds back until its package's caches are warm, and a third shard without a browser.
    const next = () => {
        // An index loop: a started shard is spliced out of `waiting` as it goes.
        for (let i = 0; i < waiting.length;) {
            const shard = waiting[i];
            const now = [...running.keys()].map((n) => SHARDS.find((s) => s.shard === n));
            const nodeLane = now.filter((s) => !s["needs-browser"]).length;
            if (!canStart(shard, now, warmed) || (!shard["needs-browser"] && nodeLane >= 2)) {
                i++;
                continue;
            }
            waiting.splice(i, 1);
            start(shard);
        }
        if (waiting.length === 0 && running.size === 0) {
            finish();
        }
    };

    // On by default; with GRAPHTY_TEST_QUARANTINE=0 the wrapper writes no result and nothing here runs.
    if (quarantineEnabled()) {
        quarantineLines.push(...closeFinished(main, ROOT).map((left) => `  [QUARANTINE-] ${left}`));
    }
    for (const signal of ["SIGINT", "SIGTERM"]) {
        process.on(signal, () => {
            failed.push(signal);
            process.exitCode = 1;
            stopAll();
        });
    }
    next();
}

// Run only as the entry point, not when imported.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
