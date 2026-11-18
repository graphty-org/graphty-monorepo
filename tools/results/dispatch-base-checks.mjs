#!/usr/bin/env node
// dispatch-base-checks.mjs -- dispatches the base checks a pull request's test jobs asked for
// (design/ci/channels-pipeline/results-service.md 6.3).
//
//   node tools/results/dispatch-base-checks.mjs <dir>
//
// Each test job's prJudge() (run-group.mjs) writes one JSON line `{ base, file, variant, repeat, name, touched, job }` per
// `[FLAKY-UNRELATED]` (repeat 5) or `[UNRELATED]` (repeat 1) test, and per `[NEW-FLAKY]` or `[FAIL]` test whose
// file the pull request did not change (only its imports: `touched`), into <dir>/<shard>.jsonl. ci.yml's base-checks job
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
// Of them, checks of tests the pull request touched (only their imports changed, #8363): one confirms a master break
// before the next full run, while a pull request that broke its own tests asks for many, so few are worth a runner
const MAX_TOUCHED = 2;

const SHA = /^[0-9a-f]{7,40}$/;
const FILE = /^[\w@./-]+\.(test|spec|stories)\.[cm]?[jt]sx?$/;
const VARIANT = /^[\w.-]+\|flags=(on|off)\|[\w-]+$/;
// a test's name: one line of printable text, passed to gh as one argument
const NAME = /^[^\p{Cc}]{1,500}$/u;
const MAX_NAMES = 10;
const JOB = /^\d{1,20}$/;

// One JSON line as a check, or null when it is not valid JSON or a field fails its pattern.
function checkOf(line) {
    let c;
    try {
        c = JSON.parse(line);
    } catch {
        return null;
    }
    const ok =
        SHA.test(c?.base) &&
        FILE.test(c.file) &&
        !c.file.includes("..") &&
        VARIANT.test(c.variant) &&
        [1, 5].includes(c.repeat);
    return ok ? c : null;
}

// A check merged into the one already asked for its base, file and variant: a test both flaky and failing in one
// file is answered by the 5 repeats, which also file the issues of the file's flaky tests when they pass (#8317)
function merged(had, c) {
    const check =
        !had || had.repeat < c.repeat ? { base: c.base, file: c.file, variant: c.variant, repeat: c.repeat } : had;
    const touched = c.touched === true;
    const name = NAME.test(c.name ?? "") ? [c.name] : [];
    // every flake this check is asked about files its issue when master passes 5 times (#8795): a touched line is a
    // test whose imports alone the pull request changed (its own file changed asks for no check), and leaving it out
    // left flakes seen only on such pull requests (a lint pass, a dependency bump) with no issue at all
    const names = [...(had?.names ?? []), ...(c.repeat === 5 ? name : [])];
    if (names.length) check.names = [...new Set(names)].slice(0, MAX_NAMES);
    // a touched test's failures and the job that ran them: base-check.yml re-runs that one job, and only when master
    // fails one of the same tests (#8363)
    const failed = [...(had?.failed ?? []), ...(touched ? name : [])];
    if (failed.length) check.failed = [...new Set(failed)].slice(0, MAX_NAMES);
    const job = had?.job ?? (touched && JOB.test(String(c.job ?? "")) ? String(c.job) : undefined);
    if (job) check.job = job;
    check.touched = (had?.touched ?? true) && touched;
    return check;
}

/**
 * The valid, distinct base checks in a directory's JSON lines.
 * @param dir the directory (missing: none)
 * @returns `{ base, file, variant, repeat, touched, names?, failed?, job? }[]`, at most MAX_CHECKS; `names` are an
 *   5-repeat check's flaky tests, `failed` and `job` a touched check's tests and the job that ran them
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
            const c = checkOf(line);
            if (!c) continue;
            const key = `${c.base} ${c.file} ${c.variant}`;
            out.set(key, merged(out.get(key), c));
        }
    const checks = [...out.values()];
    // a flaky test's check first: it is the one that files an issue
    const touched = checks
        .filter((c) => c.touched)
        .sort((a, b) => (b.names ? 1 : 0) - (a.names ? 1 : 0))
        .slice(0, MAX_TOUCHED);
    return [...checks.filter((c) => !c.touched), ...touched].slice(0, MAX_CHECKS);
}

// base-check.yml's inputs for one check
function fieldsOf(c, { pr, run }) {
    const fields = { base: c.base, file: c.file, variant: c.variant, repeat: c.repeat };
    const id = (v) => /^\d+$/.test(String(v ?? ""));
    if (id(pr)) fields.pr = pr;
    // a touched check only: when master fails one of the same tests, base-check.yml re-runs the one job that
    // failed it, which then reads the base check's evidence as [KNOWN] (#8363). An untouched check's failure
    // already passed the pull request, and a re-run of it would be a retry hoping for a pass.
    if (c.touched) {
        if (id(run)) fields.run = run;
        if (c.job) fields.job = c.job;
        if (c.failed?.length) fields.failed = JSON.stringify(c.failed);
    }
    if (c.names?.length) fields.tests = JSON.stringify(c.names);
    return fields;
}

/**
 * Dispatches each base check the results store has not seen for its base, file and variant (POST /v1/base-checks,
 * #3925), so base-check.yml runs once per test per base however many pull requests or attempts ask. A store that
 * cannot answer does not stop a check: within one run readChecks() already dedupes, and MAX_CHECKS caps it.
 * @param checks readChecks()
 * @param gh `(args) => stdout`
 * @param [o] options
 * @param [o.claim] `async (check) => boolean | undefined`: false skips a check the store already has
 * @param [o.release] `async (check) => void`: gives back the claim of a check gh could not dispatch (#7265), so a later
 *   pull request dispatches it
 * @param [o.pr] the pull request number, passed on so a base check that passes on master comments there
 * @param [o.run] the run that asked, passed on with a touched check so a base check that fails on master re-runs
 *   the job that failed the same test
 * @returns how many were dispatched
 */
export async function dispatchChecks(checks, gh, { claim, release, pr, run } = {}) {
    let n = 0;
    for (const c of checks) {
        if (claim && (await claim(c)) === false) {
            console.log(`base check already asked for: ${c.file} (${c.variant}) at ${c.base}`);
            continue;
        }
        const args = ["workflow", "run", "base-check.yml", "--ref", "master"];
        const fields = fieldsOf(c, { pr, run });
        for (const [k, v] of Object.entries(fields)) args.push("-f", `${k}=${v}`);
        try {
            gh(args);
            n++;
            console.log(`base check dispatched: ${c.file} (${c.variant}) at ${c.base}, ${c.repeat} run(s)`);
        } catch (e) {
            console.log(`::warning::base check not dispatched: ${c.file} (${e.message.split("\n")[0]})`);
            await release?.(c);
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
        if (r.ok) return r.data?.dispatch;
        console.log(`results store: base check not claimed (${r.why}); dispatching it anyway: ${c.file}`);
        return undefined;
    };
    const release = async (c) => {
        const r = await call(cfg, "DELETE", "/v1/base-checks", c);
        if (!r.ok) console.log(`::warning::results store: base check claim not released (${r.why}): ${c.file}`);
    };
    const n = await dispatchChecks(checks, gh, { claim, release, pr: process.env.PR, run: process.env.GITHUB_RUN_ID });
    console.log(`${n} of ${checks.length} base checks dispatched`);
}
