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
 *   with. A shard whose "local" policy is "when-paths-change" (graphty-element's ten browser and
 *   storybook shards) runs only when a file changed since <base> is one it tests, as vitest itself
 *   resolves its command (gateShards below); without <base> (PREPUSH_ALL=1) every shard runs. One
 *   whose policy is "never" never runs here. CI runs them all either way.
 *
 * Shards run side by side: browser shards each take one slot of <main checkout>/tmp/with-browser.sh
 * (the machine's shared cap of four browsers) when it exists, and at most two shards without a
 * browser run at once. Every shard then takes one machine-wide test slot (tools/test-slots.mjs), which
 * ad-hoc test runs share, so a shard may wait for runs of other sessions. Two things CI's separate runners give each shard are reproduced here:
 *  - The shards of one package share its Vite dependency caches (node_modules/.vite/vitest/<hash>,
 *    one per vitest project, plus Storybook's sb-vitest cache and the root project's). On a cold or
 *    stale cache each vitest optimizes and swaps a cache directory in under the others: four browser
 *    shards started together failed with deps chunks that "point to missing source files". So in each
 *    package one shard of each family (graphty-element-browser-1 to -5 is one family) fills the
 *    caches first, one at a time with nothing else of that package running -- the one with the
 *    shortest command: browser-1 also runs the benchmarks -- and the rest of the package starts once
 *    all of its warm-ups passed. Per package rather than per family, because the families of one
 *    package are not shown never to share a cache (the root project's is used by every one).
 *  - The packages that run several shards with --coverage (graphty-element, algorithms) write each
 *    shard's report to .coverage-parts/<shard> (COVERAGE_DIR), not into one coverage/ directory each
 *    run would empty under the others. In both packages COVERAGE_DIR otherwise only switches off
 *    thresholds that a --project run already switches off.
 * Each
 * shard's output goes to tmp/prepush-tests/<shard>.log; the first failure stops the others and
 * prints the end of its log. The failed shard's whole log is also copied to
 * <main checkout>/tmp/push-gate-logs/<time>-<pid>-<shard>.log, which the next push does not overwrite. A shard that runs past PREPUSH_SHARD_TIMEOUT (default 30m, not counting
 * its wait for a browser or test slot) fails; tools/prepush.sh bounds the whole stage, waits included.
 */

import { spawn, execFileSync } from "node:child_process";
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { SHARDS } from "./ci-test-matrix.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

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
 * The environment one shard adds: its own coverage directory where a package runs several shards.
 * @param shard a SHARDS entry
 * @returns extra environment variables
 */
export function shardEnv(shard) {
    return ["graphty-element", "algorithms"].includes(shard.package)
        ? { COVERAGE_DIR: `.coverage-parts/${shard.shard}` }
        : {};
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
function childTriggers(shards, changed) {
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
    const all = localShards(JSON.parse(affectedArg));
    const changed = base
        ? execFileSync("git", ["diff", "--name-only", base, "HEAD"], { cwd: ROOT, encoding: "utf8" })
              .split("\n")
              .filter(Boolean)
        : null;
    const shards = gateShards(all, changed, changed === null ? null : childTriggers(all, changed));
    const skipped = all.filter((s) => !shards.includes(s));
    if (skipped.length > 0) {
        console.log(
            `Left to CI (this push changes none of the files they test): ${skipped.map((s) => s.shard).join(", ")}`,
        );
    }
    if (shards.length === 0) {
        console.log("No affected package has a test shard to run here.");
        return;
    }
    const main = dirname(
        execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim(),
    );
    const gate = join(main, "tmp/with-browser.sh");
    const logs = join(ROOT, "tmp/prepush-tests");
    mkdirSync(logs, { recursive: true });
    const timeout = process.env.PREPUSH_SHARD_TIMEOUT ?? "30m";
    console.log(`Shards: ${shards.map((s) => s.shard).join(", ")}`);

    const running = new Map();
    const warmed = new Set();
    const canStart = startRule(shards);
    const waiting = [...shards];
    let failed = null;
    const started = Date.now();

    const start = (shard) => {
        const log = join(logs, `${shard.shard}.log`);
        const out = createWriteStream(log);
        // A machine-wide test slot (tools/test-slots.mjs) for the whole shard, taken outside `timeout` so the wait
        // does not count against the shard, and after the browser slot: nothing holding a test slot ever waits for
        // a browser slot, so the two cannot wait on each other.
        const cmd = ["timeout", "--kill-after=30s", timeout, "bash", "tools/run-tests.sh", shard.shard];
        cmd.unshift(process.execPath, "tools/test-slots.mjs");
        if (shard["needs-browser"] && existsSync(gate)) {
            cmd.unshift(gate);
        }
        // Its own process group, so stopping it takes vitest, its workers and Chromium along.
        const child = spawn(cmd[0], cmd.slice(1), {
            cwd: ROOT,
            detached: true,
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, ...shardEnv(shard) },
        });
        child.stdout.pipe(out);
        child.stderr.pipe(out);
        const t0 = Date.now();
        running.set(shard.shard, child);
        child.on("close", (code) => {
            running.delete(shard.shard);
            const secs = Math.round((Date.now() - t0) / 1000);
            if (failed) {
                return;
            }
            if (code === 0) {
                warmed.add(family(shard));
                console.log(`  [PASS] ${shard.shard} (${secs}s)`);
                next();
                return;
            }
            failed = shard.shard;
            console.log(`  [FAIL] ${shard.shard} (exit ${code}, ${secs}s); the end of ${log}:`);
            out.end(() => {
                console.log(readFileSync(log, "utf8").split("\n").slice(-80).join("\n"));
                stopAll();
            });
        });
    };

    const stopAll = () => {
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
            }, 10_000).unref();
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

    const finish = () => {
        const secs = Math.round((Date.now() - started) / 1000);
        if (failed) {
            keepLog(failed);
            console.log(`Stopped after ${failed} failed (${secs}s); the other shards did not finish.`);
            process.exit(1);
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

    for (const signal of ["SIGINT", "SIGTERM"]) {
        process.on(signal, () => {
            failed ??= signal;
            stopAll();
        });
    }
    next();
}

// Run only as the entry point, not when imported.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
