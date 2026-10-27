#!/usr/bin/env node
// dispatch-base-checks.mjs -- dispatches the base checks a pull request's test jobs asked for
// (design/ci/channels-pipeline/results-service.md 6.3).
//
//   node tools/results/dispatch-base-checks.mjs <dir>
//
// Each test job's prJudge() (run-group.mjs) writes one JSON line `{ base, file, variant, repeat }` per
// `[FLAKY-UNRELATED]` (repeat 5) or `[UNRELATED]` (repeat 1) test into <dir>/<shard>.jsonl. ci.yml's base-checks job
// downloads them all and runs this, so base-check.yml runs on master's code at the pull request's base: its
// records are the master evidence that quarantines a flaky test and files its one issue (run-group.mjs
// fileIssues), or files `Failing on master`. The lines come from a job that ran the pull request's code, so each
// field is checked against a strict pattern and passed to gh as one argument, never through a shell.
// Needs GH_TOKEN with actions: write, and RESULTS_URL with the job's OIDC token for the dedupe. Never fails: a check that cannot be dispatched is a warning.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { call, config } from "./client.mjs";

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
 * Dispatches each base check the results store has not seen for its base, file and variant (POST /v1/base-checks,
 * #3925), so base-check.yml runs once per test per base however many pull requests or attempts ask. A store that
 * cannot answer does not stop a check: within one run readChecks() already dedupes, and MAX_CHECKS caps it.
 * @param checks readChecks()
 * @param gh `(args) => stdout`
 * @param [o] options
 * @param [o.claim] `async (check) => boolean | undefined`: false skips a check the store already has
 * @param [o.pr] the pull request number, passed on so a base check that passes on master comments there
 * @returns how many were dispatched
 */
export async function dispatchChecks(checks, gh, { claim, pr } = {}) {
    let n = 0;
    for (const c of checks) {
        if (claim && (await claim(c)) === false) {
            console.log(`base check already asked for: ${c.file} (${c.variant}) at ${c.base}`);
            continue;
        }
        const args = ["workflow", "run", "base-check.yml", "--ref", "master"];
        const fields = { base: c.base, file: c.file, variant: c.variant, repeat: c.repeat };
        if (/^\d+$/.test(String(pr ?? ""))) fields.pr = pr;
        for (const [k, v] of Object.entries(fields)) args.push("-f", `${k}=${v}`);
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
    const cfg = config();
    const claim = async (c) => {
        const r = await call(cfg, "POST", "/v1/base-checks", { ...c, pr: Number(process.env.PR) || undefined });
        return r.ok ? r.data?.dispatch : undefined;
    };
    const n = await dispatchChecks(checks, gh, { claim, pr: process.env.PR });
    console.log(`${n} of ${checks.length} base checks dispatched`);
}
