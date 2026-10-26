#!/usr/bin/env node
// dispatch-base-checks.mjs -- dispatches the base checks a pull request's test jobs asked for
// (design/ci/channels-pipeline/results-service.md 6.3).
//
//   node tools/results/dispatch-base-checks.mjs <dir>
//
// Each test job's prJudge() (run-group.mjs) writes one JSON line `{ base, file, variant, repeat }` per
// `[FLAKY-UNRELATED]` (repeat 5) or `[KNOWN?]` (repeat 1) test into <dir>/<shard>.jsonl. ci.yml's base-checks job
// downloads them all and runs this, so base-check.yml runs on master's code at the pull request's base: its
// records are the master evidence that quarantines a flaky test and files its one issue (run-group.mjs
// fileIssues), or files `Failing on master`. The lines come from a job that ran the pull request's code, so each
// field is checked against a strict pattern and passed to gh as one argument, never through a shell.
// Needs GH_TOKEN with actions: write. Never fails: a check that cannot be dispatched is a warning.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// ponytail: a cap, so one broken pull request cannot start a storm of base checks; raise it if real runs hit it
const MAX_CHECKS = 10;

const SHA = /^[0-9a-f]{7,40}$/;
const FILE = /^[\w@./-]+\.(test|spec|stories)\.[cm]?[jt]sx?$/;
const VARIANT = /^[\w.-]+\|flags=(on|off)\|[\w-]+$/;

/**
 * The valid, distinct base checks in a directory's JSON lines.
 * @param dir the directory (missing: none)
 * @returns `{ base, file, variant, repeat }[]`, at most MAX_CHECKS
 */
export function readChecks(dir) {
    let names = [];
    try {
        names = readdirSync(dir).filter((n) => n.endsWith(".jsonl"));
    } catch {
        return [];
    }
    const out = new Map();
    for (const n of names.sort())
        for (const line of readFileSync(join(dir, n), "utf8").split("\n")) {
            let c;
            try {
                c = JSON.parse(line);
            } catch {
                continue;
            }
            const ok =
                SHA.test(c?.base) &&
                FILE.test(c.file) &&
                !c.file.includes("..") &&
                VARIANT.test(c.variant) &&
                [1, 5].includes(c.repeat);
            if (!ok) continue;
            const key = `${c.base} ${c.file} ${c.variant}`;
            // a test both flaky and failing in one file: the 5 repeats answer both
            if (!out.has(key) || out.get(key).repeat < c.repeat) out.set(key, { ...c });
        }
    return [...out.values()].slice(0, MAX_CHECKS);
}

/**
 * Dispatches each base check.
 * @param checks readChecks()
 * @param gh `(args) => stdout`
 * @returns how many were dispatched
 */
export function dispatchChecks(checks, gh) {
    let n = 0;
    for (const c of checks) {
        const args = ["workflow", "run", "base-check.yml", "--ref", "master"];
        for (const [k, v] of Object.entries({ base: c.base, file: c.file, variant: c.variant, repeat: c.repeat }))
            args.push("-f", `${k}=${v}`);
        try {
            gh(args);
            n++;
            console.log(`base check dispatched: ${c.file} (${c.variant}) at ${c.base}, ${c.repeat} run(s)`);
        } catch (e) {
            console.log(`::warning::base check not dispatched: ${c.file} (${e.message.split("\n")[0]})`);
        }
    }
    return n;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const gh = (args) => execFileSync("gh", args, { encoding: "utf8" });
    const checks = readChecks(process.argv[2] ?? "");
    console.log(`${dispatchChecks(checks, gh)} of ${checks.length} base checks dispatched`);
}
