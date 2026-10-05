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
 * Usage: node tools/prepush-tests.mjs <affected-projects-json>
 *   the JSON array `nx show projects --affected --json` prints
 *
 * Browser shards each take one slot of <main checkout>/tmp/with-browser.sh (the machine's shared
 * cap of four browsers) when it exists; at most two shards without a browser run at once. Each
 * shard's output goes to tmp/prepush-tests/<shard>.log; the first failure stops the others and
 * prints the end of its log. A shard that runs past PREPUSH_SHARD_TIMEOUT (default 30m) fails.
 */

import { spawn, execFileSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SHARDS } from "./ci-test-matrix.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The shards CI's test matrix runs for these affected projects, as plan() selects them before it
 * folds the short ones into groups.
 * @param affected nx project names (remote-logger is "@graphty/remote-logger")
 * @returns the SHARDS entries, longest-running kinds (browser) first
 */
export function localShards(affected) {
    const dirs = affected.map((p) => p.replace(/^@graphty\//, ""));
    const shards = SHARDS.filter((s) => dirs.includes(s.package));
    return [...shards.filter((s) => s["needs-browser"]), ...shards.filter((s) => !s["needs-browser"])];
}

/**
 * The environment one shard adds. CI runs every shard on its own runner; here several shards of one
 * package run at once in the same directory, so the packages that run more than one shard with
 * --coverage write each shard's report to a directory of its own instead of deleting each other's.
 * Only the report's location changes: in both packages COVERAGE_DIR otherwise only switches off
 * thresholds that a --project run already switches off.
 * @param shard a SHARDS entry
 * @returns extra environment variables
 */
export function shardEnv(shard) {
    return ["graphty-element", "algorithms"].includes(shard.package)
        ? { COVERAGE_DIR: `.coverage-parts/${shard.shard}` }
        : {};
}

function main() {
    const [affectedArg] = process.argv.slice(2);
    if (affectedArg === undefined) {
        console.error("usage: node tools/prepush-tests.mjs <affected-projects-json>");
        process.exit(2);
    }
    const shards = localShards(JSON.parse(affectedArg));
    if (shards.length === 0) {
        console.log("No affected package has a test shard.");
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
    const waiting = [...shards];
    let failed = null;
    const started = Date.now();

    const start = (shard) => {
        const log = join(logs, `${shard.shard}.log`);
        const out = createWriteStream(log);
        const cmd = ["timeout", "--kill-after=30s", timeout, "bash", "tools/run-tests.sh", shard.shard];
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

    const finish = () => {
        const secs = Math.round((Date.now() - started) / 1000);
        if (failed) {
            console.log(`Stopped after ${failed} failed (${secs}s); the other shards did not finish.`);
            process.exit(1);
        }
        console.log(`All ${shards.length} shards passed in ${secs}s.`);
        process.exit(0);
    };

    // Browser shards queue on the shared gate, so all of them start; the others two at a time.
    const next = () => {
        while (waiting.length > 0) {
            const shard = waiting[0];
            const nodeLane = [...running.keys()].filter((n) => !SHARDS.find((s) => s.shard === n)["needs-browser"]);
            if (!shard["needs-browser"] && nodeLane.length >= 2) {
                break;
            }
            start(waiting.shift());
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
    main();
}
