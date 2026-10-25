#!/usr/bin/env node
// Verification after landing (design/ci/fast-pipeline.md, section 4.3): the full gate on golden's newest
// commit, run beside new landings instead of in front of them. Golden may be broken for one run; the
// pipeline round reverts the culprit this finds. Master stays strict: only verified commits are cut.
//
//   node tools/verify.mjs start [--branch golden-cut] [--again]   start a run unless one is live
//   node tools/verify.mjs status [--branch golden-cut]            what is verified, wanted, running, found
//   node tools/verify.mjs claim --session <id> [--branch ...]     the pipeline round takes a failure to act on
//   node tools/verify.mjs handled [--branch ...]                  ... and says it reverted and commented
//   node tools/verify.mjs watch [--branch ...]                    returns once a failure is recorded (run it in
//                                                                 the background: its exit wakes the session)
//   node tools/verify.mjs run [--branch ...]                      the run itself (start runs it, detached)
//
// No daemon and no timer. A landing records its new tip as `wanted` and starts a run when none is live; a
// run verifies the newest of `wanted` and the branch's tip, then, under the verify lock, looks again and
// goes on while something newer is wanted. So a landing either sees a live run, which will look again
// before it ends, or starts one: no landing is left unverified.
//
// A newer wanted commit that descends from the one whose gate is running supersedes it: the landing writes the
// marker file <name>-superseded beside the state, and the gate (tools/prepush-tests.mjs, PREPUSH_SUPERSEDED_FILE)
// starts no more test shards at its next shard boundary and stops with [SUPERSEDED]. Shards already running finish,
// so their passes are kept by input key and the newer commit's gate reuses them. The old commit is recorded in
// `superseded`, neither passed nor failed; a failure on the newer commit still bisects over every landing since
// the last verified commit. A confirming run or a bisect needs its exact commit and is never superseded.
// It never starves: a run switches commits at most MAX_SWITCHES times in a row, then finishes the commit it is on
// (landings faster than a full run would otherwise keep golden-verified from ever moving); the commit after it is
// the newest again. Progress is kept across a switch: every shard that finished is reused by input key.
//
// State: <main checkout>/tmp/golden/verify.json (golden) or verify-golden-cut.json, written under the
// verify lock (a lock directory beside it, held for milliseconds, separate from the landing lock) with a
// temporary file renamed over the old one:
//   verified   the newest commit that passed (golden's is also the ref golden-verified on GitHub)
//   wanted     the newest commit a landing asked for
//   run        the live run: { pid, pidStart, commit, from, step, startedAt }; a pid alone can be reused,
//              so a run is live only while that pid has the same start time (/proc/<pid>/stat)
//   superseded the newest commit left for a newer one: { commit, from, by, at, log }
//   last       the newest result: { commit, from, status, at, log, failing, confirm, bisect, culprit, reproduced,
//              quarantined, handling }; status is passed, confirming, bisecting, flaky, failed, handling (a session
//              claimed it) or handled
//
// A failure is first confirmed: only its failing test files run again on the failing commit, up to CONFIRM_RUNS
// times. A test that fails every time is consistent. A test that passes in any of those runs is intermittent, and
// the ledger decides what that means (the owner's rule of 2026-10-22: a load- or timing-sensitive test is a critical
// defect). One that failed before the range -- at the last verified commit, or before the range's first landing --
// was flaky already: it goes to the quarantine (when that is on, with a priority:critical issue listing the range's
// landings as suspects; else it is recorded as not reproduced), and is never bisected or reverted. One with no
// failure before the range is NEWLY intermittent: a landing made it so, and it is bisected like a consistent one.
// The bisect runs over golden's first-parent `land:` merges since the last verified commit -- never a sync merge of
// master, a revert or an accept commit -- running only the failing files, `width` points at once. A point is bad
// when a consistent test fails in every one of its runs, or a newly intermittent one in at least 1 of CONFIRM_RUNS
// (the rate rule); good only when neither does. The culprit is the first bad landing whose parent passes every run
// (or is the verified commit); when the parent fails even once, or no landing fails, no landing is named. A failure
// that needs two landings fails first at the later one, which is the one named. A non-test failure (no test shard
// named) re-runs the whole gate once per point, and its culprit's evidence says "judged by 1 run". Verification
// never reverts; the pipeline round does, and only a named culprit.
//
// A failure in CI (design/ci/ci-full-testing.md, section 3.5) is confirmed here the same way, all CONFIRM_RUNS: the
// failed shards' JUnit artifacts become ledger records of the commit, so only the exact failing test files run. A test
// that passes every run here is a CI-only failure: the run's failed jobs are re-run once in CI. Failing again, it is
// bisected in CI, one point at a time on golden-bisect-1, after the last verified commit has run there: a verified
// commit that fails too is an environment change, which names no landing and gets its issue. Passing its re-run, it
// is quarantined as a flake. Either way the commit stays failed and golden-verified does not move.

import { spawn, spawnSync } from "node:child_process";
import {
    closeSync,
    existsSync,
    mkdirSync,
    openSync,
    readdirSync,
    readFileSync,
    renameSync,
    rmSync,
    watch as watchDir,
    writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
    badTargets,
    bisectStep,
    classify,
    CONFIRM_RUNS,
    decided,
    parentFails,
    short,
    targetsOf,
} from "./bisect-core.mjs";
import { acquireLock, CUT, CUT_CI_VERIFIES, git, GOLDEN, handOff, mainCheckout, prepareScratch } from "./land.mjs";
import { expectedRuns } from "./shard-verdict.mjs";
import { selectedCommand } from "./test-select.mjs";

// The test ledger (design/ci/test-ledger.md): issues for failures on golden, known failures, the flaky bisect.
// Without it verification works as before.
const ledger = await import("./test-ledger.mjs").catch(() => null);
const quarantine = await import("./test-quarantine.mjs").catch(() => null);
const history = await import("./test-history.mjs").catch(() => null);

// The bisect's rules live in tools/bisect-core.mjs; these stay exported from here for existing callers.
export { badTargets, bounds, CONFIRM_RUNS, decided, failedEvery, nextPoints, targetsOf } from "./bisect-core.mjs";

export const VERIFIED_REF = "golden-verified";
/** How many times in a row a run leaves its commit for a newer one before it finishes the one it is on. */
export const MAX_SWITCHES = 2;
const QUIET = { pollMs: 20, waitLog: () => {}, onWait: () => {}, onQueue: () => {} };
const LAND_SUBJECT = /^land: (\S+)$/;

// ---------------------------------------------------------------- the context

/**
 * What a command works on; tests replace `gate`, `check`, `spawnRun`, `publishRef`, `onVerified` and
 * `sessionAlive`.
 * @param cwd any directory of the repository
 * @param [overrides] `branch` (golden or golden-cut) and replacements
 * @returns the context
 */
export function verifyContext(cwd, overrides = {}) {
    const env = overrides.env ?? process.env;
    const main = mainCheckout({ env }, cwd);
    const branch = overrides.branch ?? GOLDEN;
    const name = branch === GOLDEN ? "verify" : `verify-${branch}`;
    return {
        env,
        main,
        branch,
        stateFile: join(main, `tmp/golden/${name}.json`),
        supersededFile: join(main, `tmp/golden/${name}-superseded`),
        lock: join(main, `tmp/golden/${name}.lock`),
        // The backend (ci or local) is one setting for golden and golden-cut, kept in golden's state file.
        backendFile: join(main, "tmp/golden/verify.json"),
        brokerFile: join(main, "tmp/pr-status/status.json"),
        pollMs: POLL_MS,
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        actionsOperational: defaultActionsOperational,
        width: 2,
        gate: defaultGate,
        check: defaultCheck,
        ciCheck: defaultCiCheck,
        ciRerun: defaultCiRerun,
        spawnRun: defaultSpawnRun,
        publishRef: defaultPublishRef,
        onVerified: defaultOnVerified,
        sessionAlive: defaultSessionAlive,
        killRun: defaultKillRun,
        captures: defaultCaptures,
        gh: (args) => {
            const r = spawnSync("gh", args, { cwd: main, env, encoding: "utf8" });
            if (r.status !== 0) throw new Error(r.stderr || `gh exited ${r.status}`);
            return r.stdout.trim();
        },
        ...overrides,
    };
}

// ---------------------------------------------------------------- the state file

/**
 * The state as the file holds it now (no lock: a reader never sees half a file).
 * @param ctx the context
 * @returns the state, `{}` when there is none
 */
export function readState(ctx) {
    try {
        return JSON.parse(readFileSync(ctx.stateFile, "utf8"));
    } catch {
        return {};
    }
}

function writeState(ctx, state) {
    mkdirSync(dirname(ctx.stateFile), { recursive: true });
    const tmp = `${ctx.stateFile}.${process.pid}`;
    writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
    renameSync(tmp, ctx.stateFile);
}

/**
 * Reads, changes and writes the state under the verify lock.
 * @param ctx the context
 * @param change a function that changes the state in place and returns what withState returns
 * @returns what `change` returned
 */
export async function withState(ctx, change) {
    const release = await acquireLock(ctx.lock, { command: "verify", branch: ctx.branch }, QUIET);
    try {
        const state = readState(ctx);
        const out = change(state);
        writeState(ctx, state);
        return out;
    } finally {
        release();
    }
}

/**
 * A process's start time, in clock ticks since boot (field 22 of /proc/<pid>/stat).
 * @param pid the process
 * @returns its start time, or null when there is no such process
 */
export function procStart(pid) {
    try {
        const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
        return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19];
    } catch {
        return null;
    }
}

/**
 * A process's process group (field 5 of /proc/<pid>/stat).
 * @param pid the process
 * @returns its group id, or null when there is no such process
 */
export function procGroup(pid) {
    try {
        const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
        return Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[2]);
    } catch {
        return null;
    }
}

const alive = (p) => Boolean(p?.pid) && procStart(p.pid) === p.pidStart;
const me = () => ({ pid: process.pid, pidStart: procStart(process.pid), pgid: procGroup(process.pid) });
const now = () => new Date().toISOString();
const isAncestor = (ctx, a, b) => git(ctx, ctx.main, ["merge-base", "--is-ancestor", a, b], { ok: true }).status === 0;
const sha = (ctx, ref) => git(ctx, ctx.main, ["rev-parse", "-q", "--verify", `${ref}^{commit}`], { ok: true }).stdout;

// ---------------------------------------------------------------- asking for a run

/**
 * Records a commit a landing pushed as wanted and starts a run when none is live (under the verify lock,
 * so a run that is ending either sees this commit or is no longer recorded as live).
 * @param ctx the context
 * @param commit the branch's new tip
 * @returns one line saying what happened
 */
export function requestVerification(ctx, commit) {
    return withState(ctx, (s) => {
        if (!s.wanted || isAncestor(ctx, s.wanted, commit)) s.wanted = commit;
        if (!alive(s.run)) return startLocked(ctx, s);
        const running = `verification of ${ctx.branch} is running (pid ${s.run.pid})`;
        if (!supersede(ctx, s)) return `${running}; it goes on to ${short(commit)} next`;
        return `${running}; it leaves ${short(s.run.commit)} at its next test shard and goes on to ${short(s.wanted)}`;
    });
}

/**
 * Tells a running gate that a newer wanted commit supersedes its commit: only the full gate (never a confirming
 * run or a bisect, which need their exact commit), and only for a commit the wanted one descends from.
 * @param ctx the context
 * @param s the state, under the lock
 * @returns true when the marker was written
 */
function supersede(ctx, s) {
    const { step, commit, switches = 0 } = s.run;
    // A CI run is never left half way: it ends on its own, and the run goes on to the newest commit after it.
    if (switches >= MAX_SWITCHES || backendOf(ctx) === "ci") return false;
    if (step !== "gate" || !commit || s.wanted === commit || !isAncestor(ctx, commit, s.wanted)) return false;
    writeFileSync(ctx.supersededFile, `${s.wanted}\n`);
    return true;
}

/**
 * Starts a run unless one is live: a dead run's state is picked up where it stopped, a stopped bisect
 * from the points it recorded.
 * @param ctx the context; `again: true` verifies a commit whose last result was a failure once more
 * @returns one line saying what happened
 */
export function start(ctx) {
    return withState(ctx, (s) =>
        alive(s.run) ? `verification of ${ctx.branch} is running (pid ${s.run.pid})` : startLocked(ctx, s),
    );
}

function startLocked(ctx, s) {
    const pid = ctx.spawnRun(ctx);
    // detached: the run leads its own process group, which `stop` ends with every gate it started
    s.run = { pid, pidStart: procStart(pid), pgid: pid, commit: null, step: "starting", startedAt: now() };
    const flag = ctx.branch === GOLDEN ? "" : " --branch " + ctx.branch;
    return `verification of ${ctx.branch} started (pid ${pid}; node tools/verify.mjs status${flag})`;
}

/**
 * Stops the live run: SIGTERM to its process group (the run and every gate, check and test it started) when it
 * leads one, else to the run alone, under the verify lock, so no landing sees it live meanwhile. The state is
 * kept as it was (a confirming run or a bisect keeps its points), the run is recorded in `stopped`, and
 * `start`, or the next landing, resumes from there. A run whose process is already gone is only cleared.
 * Agents cannot kill processes; this is the supported way to stop verification (2026-10-23: a run killed by
 * hand left verify.json naming a dead pid at step gate, and golden's tip got no verdict).
 * @param ctx the context
 * @returns one line saying what happened
 */
export function stop(ctx) {
    return withState(ctx, (s) => {
        const r = s.run;
        if (!r) return `verification of ${ctx.branch}: no run to stop`;
        const live = alive(r);
        const how = live ? ctx.killRun(r) : "already gone";
        s.stopped = { pid: r.pid, commit: r.commit ?? null, step: r.step, at: now(), how };
        s.run = null;
        rmSync(ctx.supersededFile, { force: true });
        const flag = ctx.branch === GOLDEN ? "" : ` --branch ${ctx.branch}`;
        const what = live ? `stopped (${how})` : "was already gone; cleared";
        return `verification of ${ctx.branch}: run pid ${r.pid} at ${r.step} ${short(r.commit)} ${what}; node tools/verify.mjs start${flag} resumes it`;
    });
}

// SIGTERM to the run's own process group, or to the run alone when it does not lead one (started by hand from a
// shell, whose job the group is).
function defaultKillRun(r) {
    const group = r.pgid ?? procGroup(r.pid);
    if (group === r.pid) {
        process.kill(-group, "SIGTERM");
        return `SIGTERM to process group ${group}`;
    }
    process.kill(r.pid, "SIGTERM");
    return `SIGTERM to pid ${r.pid} (it leads no process group of its own)`;
}

function defaultSpawnRun(ctx) {
    const log = join(ctx.main, `tmp/golden/${basename(ctx.stateFile, ".json")}-run.log`);
    mkdirSync(dirname(log), { recursive: true });
    const fd = openSync(log, "a");
    const args = [fileURLToPath(import.meta.url), "run", "--branch", ctx.branch, ...(ctx.again ? ["--again"] : [])];
    const child = spawn(process.execPath, args, {
        cwd: ctx.main,
        env: ctx.env,
        detached: true,
        stdio: ["ignore", fd, fd],
    });
    child.unref();
    closeSync(fd);
    return child.pid;
}

// ---------------------------------------------------------------- the run

/**
 * The run: verifies the newest wanted commit, then anything newer, until nothing newer is wanted; a
 * failure is bisected and recorded, and the run ends.
 * @param ctx the context
 * @returns 0
 */
export async function run(ctx) {
    // A missing, incomplete or corrupt ledger database is rebuilt from its record files here, never in a gate.
    ledgerDo(ctx, (l) => l.ensure(ctx.env, ctx.main));
    for (;;) {
        git(ctx, ctx.main, ["fetch", "-q", "origin"], { ok: true });
        const before = readState(ctx).verified;
        const job = await withState(ctx, (s) => nextJob(ctx, s));
        if (!job) {
            ledgerDo(ctx, (l) => console.log(l.prune(ctx.env, ctx.main)));
            return 0;
        }
        if (job.bisect) await bisect(ctx);
        else if (job.target) await verifyCommit(ctx, job);
        const after = readState(ctx).verified;
        if (after && after !== before) ctx.onVerified(ctx, after);
    }
}

/**
 * What the run does next, decided under the lock: nothing (another run is live, or nothing newer than
 * the last result is wanted: the run is marked ended), resume a bisect, or verify a commit.
 * @param ctx the context
 * @param s the state, changed in place
 * @returns `{ bisect }`, `{ target, from }`, `{}` (look again) or null (end)
 */
export function nextJob(ctx, s) {
    const self = me();
    if (alive(s.run) && s.run.pid !== self.pid) return null;
    if (s.last?.status === "bisecting" || s.last?.status === "confirming") {
        s.run = { ...self, commit: s.last.commit, from: s.last.from, step: "bisect", startedAt: now() };
        return { bisect: true };
    }
    const target = newer(ctx, s.wanted, sha(ctx, `origin/${ctx.branch}`));
    const done = !target || (s.verified && isAncestor(ctx, target, s.verified));
    const failed = s.last?.commit === target && s.last.status !== "passed" && !ctx.again;
    if (done || failed) {
        s.run = null;
        return null;
    }
    ctx.again = false;
    if (ctx.branch !== GOLDEN && isAncestor(ctx, target, `origin/${VERIFIED_REF}`)) {
        // A cut of a commit golden's verification passed: nothing new to run.
        s.verified = target;
        s.last = { commit: target, status: "passed", at: now(), on: VERIFIED_REF };
        return {};
    }
    const from = s.verified ?? base(ctx, target);
    rmSync(ctx.supersededFile, { force: true });
    const switches = s.run?.pid === self.pid ? (s.run.switches ?? 0) : 0;
    s.run = { ...self, commit: target, from, step: "gate", startedAt: now(), switches };
    return { target, from };
}

function newer(ctx, a, b) {
    if (!a || !b) return a || b || null;
    return isAncestor(ctx, a, b) ? b : a;
}

// Where a first run's range starts: golden-cut from golden-verified, golden from master.
function base(ctx, target) {
    const ref = ctx.branch === GOLDEN ? "origin/master" : `origin/${VERIFIED_REF}`;
    return git(ctx, ctx.main, ["merge-base", target, ref], { ok: true }).stdout || null;
}

async function verifyCommit(ctx, { target, from }) {
    const cannot = ctx.branch !== GOLDEN && backendOf(ctx) === "ci" ? ciCannotRun(ctx, target) : null;
    if (cannot) return cutByItsOwnCi(ctx, { target, from, cannot });
    const started = new Date().toISOString();
    const r = await ctx.gate(ctx, target);
    if (r.code !== 0 && /\[SUPERSEDED\]/.test(r.output ?? "")) {
        // Left for a newer commit at a shard boundary: neither passed nor failed. The run goes on to it.
        await withState(ctx, (s) => {
            s.superseded = { commit: target, from, by: s.wanted, at: now(), log: r.log };
            if (s.run) s.run.switches = (s.run.switches ?? 0) + 1;
        });
        return;
    }
    if (r.code === 0) return passedCommit(ctx, { target, from, r });
    const failing = failingShards(r.output, await shardNames(ctx));
    const candidates = landMerges(ctx, from, target);
    const facts = failing && ledgerDo(ctx, (l) => gateFacts(ctx, l, target, started));
    // The same failures as the verification before: they stay on golden, so each gets its issue now.
    const again = facts && knownAgain(facts, readState(ctx).last, target);
    const issues = again ? (ledgerDo(ctx, (l) => fileFor(ctx, l, facts.tests, target, r.log)) ?? {}) : undefined;
    await withState(ctx, (s) => {
        // ponytail: a newer failure replaces the record, keeping a live claim on it; a list of failures if
        // two unrelated ones overlap often.
        const handling = s.last?.status === "handling" ? s.last.handling : undefined;
        s.last = {
            commit: target,
            from,
            status: again ? "failed-known" : "confirming",
            at: now(),
            log: r.log,
            ci: r.run,
            failing,
            pairs: facts?.pairs,
            tests: facts?.tests,
            issues,
            bisect: { candidates, points: {}, evidence: {} },
            handling,
        };
        // a live claim stays a claim: its session's `handled` must still find it
        if (again && handling) Object.assign(s.last, { status: "handling", known: true });
        if (s.run) Object.assign(s.run, { step: again ? "failed-known" : "confirm", switches: 0 });
    });
    if (!again) await bisect(ctx);
}

/**
 * A cut CI cannot run golden-verify.yml on (its tree predates the workflow, and master lacks it) gets no
 * candidate push and no 1.5-hour local gate: the cut pull request's own CI run, once ship marks it ready, is its
 * verification, and master gets only what that run passes. The record is `ciCannotRun`, which `land.mjs ship`
 * takes as verified (cutUnverified). Every fix in a cut went in through a cut-fix gate already.
 * @param ctx the context
 * @param job what to record
 * @param job.target the cut's head
 * @param job.from its range's start
 * @param job.cannot why CI cannot run it
 */
async function cutByItsOwnCi(ctx, { target, from, cannot }) {
    console.log(`verify: ${cannot}: ${CUT_CI_VERIFIES}`);
    await withState(ctx, (s) => {
        s.last = { commit: target, from, status: "ciCannotRun", at: now(), reason: cannot };
        delete s.noRun;
        delete s.ciUnavailable;
        if (s.run) Object.assign(s.run, { step: "ciCannotRun", switches: 0 });
    });
    ctx.onVerified(ctx, target);
}

/**
 * Records a passed commit and moves golden-verified. In CI, verification also judges golden's screenshots
 * (design/ci/integrated-cicd-plan-v2.md, step 3): `captures[commit]` says whether the run's captures were clean,
 * and `land.mjs cut` takes only a commit whose captures were. It also lists the images CI draws differently from
 * the baselines (`changed`) and the flaky ones, for golden and golden-cut alike, which `land.mjs ship` reads
 * (#3363). Screenshots never fail verification.
 * @param ctx the context
 * @param job what passed
 * @param job.target the commit
 * @param job.from its range's start
 * @param job.r the gate's result
 */
async function passedCommit(ctx, { target, from, r }) {
    if (ctx.branch === GOLDEN) ctx.publishRef(ctx, target);
    const ci = backendOf(ctx) === "ci";
    const captures = ci ? await ctx.captures(ctx, target) : null;
    await withState(ctx, (s) => {
        s.verified = target;
        s.last = { commit: target, from, status: "passed", at: now(), log: r.log, verifiedBy: backendOf(ctx) };
        if (captures) {
            s.last.captures = captures;
            // ponytail: the newest CAPTURES_KEPT commits only; a cut is never older than that many verifications
            const kept = Object.entries(s.captures ?? {}).slice(-(CAPTURES_KEPT - 1));
            s.captures = Object.fromEntries([...kept, [target, captures]]);
        }
        if (s.run) Object.assign(s.run, { step: "passed", switches: 0 });
    });
}

/**
 * Files (or finds) one `Failing on golden` issue per signature of these failures, and reopens closed ones.
 * @param ctx the context
 * @param l the ledger module
 * @param tests the failures
 * @param commit the golden commit they fail on
 * @param log its log
 * @returns `{ signature: issue }`
 */
function fileFor(ctx, l, tests, commit, log) {
    const issues = l.fileIssues(l.ledgerDir(ctx.env, ctx.main), tests, { commit, log }, ctx.gh);
    try {
        reopen(ctx, Object.values(issues));
    } catch (e) {
        console.log(`verify: could not reopen closed issues: ${e.message.split("\n")[0]}`);
    }
    return issues;
}

/**
 * Runs `use(ledger)` when the ledger module loaded; a ledger error is one line, never a failure.
 * @param ctx the context
 * @param use the function
 * @returns what it returned, or null
 */
function ledgerDo(ctx, use) {
    try {
        return ledger ? use(ledger) : null;
    } catch (e) {
        console.log(`verify: ledger: ${e.message.split("\n")[0]}`);
        return null;
    }
}

/**
 * What the ledger recorded of this verification's gate: its failures and their (test, key) pairs.
 * No issue is filed here: a failure the bisect pins on a landing is reverted, not tracked.
 * @param ctx the context
 * @param l the ledger module
 * @param target the commit
 * @param started when the gate started
 * @returns `{ outcomes, tests, pairs, prev, passed }`, or null when the ledger is unavailable
 */
function gateFacts(ctx, l, target, started) {
    const { db } = l.openLedger(ctx.env, ctx.main);
    if (!db) return null;
    const mine = "i.kind = 'verify' AND i.commit_sha = ? AND i.started_at >= ?";
    const outcomes = db.prepare(`SELECT i.shard, i.outcome FROM invocation i WHERE ${mine}`).all(target, started);
    const failures = db
        .prepare(
            `SELECT i.shard, i.family, t.file, t.name, f.key, f.signature, f.status, f.line FROM failure f JOIN test t ON t.id = f.test JOIN invocation i ON i.id = f.inv WHERE ${mine}`,
        )
        .all(target, started)
        .map((f) => ({ ...f }));
    const pairs = failures.map((f) => `${f.file}\0${f.name}\0${f.key}`).sort();
    const between = (prev) =>
        git(ctx, ctx.main, ["rev-list", "--first-parent", `${prev}..${target}`])
            .split("\n")
            .filter(Boolean);
    const passedSince = (prev) =>
        failures.some((f) =>
            db
                .prepare(
                    `SELECT 1 FROM file_run fr JOIN test tf ON tf.id = fr.test AND tf.file = ? AND tf.name = '' JOIN invocation i ON i.id = fr.inv
                     WHERE fr.skipped = 0 AND i.dirty = 0 AND i.reused_from IS NULL AND i.outcome IN ('passed', 'failed') AND i.kind IN (SELECT value FROM json_each(?))
                     AND i.commit_sha IN (SELECT value FROM json_each(?)) AND NOT EXISTS (SELECT 1 FROM failure x JOIN test tt ON tt.id = x.test
                     WHERE x.inv = i.id AND tt.file = tf.file AND tt.name = ?)`,
                )
                .get(f.file, JSON.stringify(l.OWNED), JSON.stringify(between(prev)), f.name),
        );
    const prev = readState(ctx).last?.commit;
    const passed = Boolean(prev) && prev !== target && passedSince(prev);
    db.close();
    return { outcomes, tests: failures, pairs, prev, passed };
}

/**
 * Whether this failure is the previous verification's again (design 5.1, "a known failure again"): every shard
 * finished with no error, the failing (test, key) pairs are the same, and no tool-owned run on a commit between
 * the two recorded any of those tests passing. Such a failure stays on golden (after a revert too), so it is not
 * bisected again and gets its issue.
 * @param facts gateFacts()
 * @param prev the previous result
 * @param target the commit
 * @returns boolean
 */
function knownAgain(facts, prev, target) {
    const clean = facts.outcomes.length > 0 && facts.outcomes.every((o) => ["passed", "failed"].includes(o.outcome));
    const same = facts.pairs.length > 0 && JSON.stringify(facts.pairs) === JSON.stringify(prev?.pairs ?? []);
    return clean && same && prev.commit === facts.prev && prev.commit !== target && !facts.passed;
}

// Reopens mapped issues that were closed while their failure is still on golden: one GitHub call.
function reopen(ctx, issues) {
    if (!issues.length) return;
    const closed = JSON.parse(
        ctx.gh([
            "issue",
            "list",
            "--state",
            "closed",
            "--label",
            "bug",
            "--search",
            "Failing on golden in:title",
            "--json",
            "number",
            "--limit",
            "200",
        ]),
    );
    for (const { number } of closed.filter((c) => issues.includes(c.number))) {
        ctx.gh([
            "issue",
            "reopen",
            String(number),
            "--comment",
            "Verification of golden still fails this way; reopened.",
        ]);
    }
}

// ---------------------------------------------------------------- bisect

// The bisect's points: golden's first-parent `land:` merges after `from` up to `target`, oldest first. A sync merge
// of master, a revert or an owner's accept commit is never a point, so it is never named.
function landMerges(ctx, from, target) {
    const range = from ? `${from}..${target}` : target;
    return git(ctx, ctx.main, ["log", "--first-parent", "--reverse", "--format=%H %s", range])
        .split("\n")
        .filter((l) => LAND_SUBJECT.test(l.slice(41)))
        .map((l) => l.slice(0, 40));
}

// The targets the bisect follows: those that failed every confirming run, the newly intermittent (`rate`), and in a
// CI bisect those that failed in CI twice and never here.
const followed = (last, t) =>
    last.confirm.consistent.includes(t.id) ||
    last.confirm.regressed?.includes(t.id) ||
    (last.bisect.ci && last.confirm.ci?.includes(t.id));
const bisectTargets = (last) =>
    targetsOf(last)
        .filter((t) => followed(last, t))
        .map((t) => (last.confirm.regressed?.includes(t.id) ? { ...t, rate: true } : t));
// A CI bisect runs its points in CI (golden-bisect-1), one at a time; the rest run here.
const checkOf = (ctx, b) => (b.ci ? ctx.ciCheck : ctx.check);

async function bisect(ctx) {
    if (!readState(ctx).last.confirm) await confirm(ctx);
    if (!bisectTargets(readState(ctx).last).length) return finishIntermittent(ctx);
    if (await environmentChanged(ctx)) return;
    for (;;) {
        const last = readState(ctx).last;
        const b = last.bisect;
        const step = bisectStep(b, b.ci ? 1 : ctx.width);
        if (step.noLanding) return finishBisect(ctx, null, step.noLanding);
        if (step.blame) return blame(ctx, step.blame);
        const picks = step.points;
        const job = { failing: last.failing, targets: bisectTargets(last) };
        const check = checkOf(ctx, b);
        const results = await Promise.all(
            picks.map((i, slot) => check(ctx, b.candidates[i], { ...job, slot: slot + 1 })),
        );
        await withState(ctx, (s) => {
            picks.forEach((i, k) => {
                const sha = b.candidates[i];
                s.last.bisect.points[sha] = badTargets(results[k], job.targets).length ? "bad" : "good";
                s.last.bisect.evidence[sha] = results[k];
            });
        });
    }
}

/**
 * Confirms a failure on the commit that failed: its targets run again, up to CONFIRM_RUNS times (stopping once
 * none can fail every time). A test that passed in any run is intermittent: newly so (no failure before the range)
 * it is bisected; flaky before the range it goes to the quarantine.
 * @param ctx the context
 */
async function confirm(ctx) {
    const last = readState(ctx).last;
    const targets = targetsOf(last);
    // A CI failure runs all CONFIRM_RUNS here: only a test that passes every one is a CI-only failure.
    const r = await ctx.check(ctx, last.commit, { failing: last.failing, targets, slot: 1, full: Boolean(last.ci) });
    // Failed in CI and in no run here: one CI re-run of the failed jobs tells a CI-only failure from a flake.
    const ciOnly = last.ci ? targets.filter((t) => !r.failed[t.id]) : [];
    const ci = ciOnly.length ? await ciConfirm(ctx, last, ciOnly) : { confirmed: [], flaky: [] };
    const newOf = (tests) => newlyIntermittent(ctx, last, tests);
    const { consistent: every, intermittent, regressed, flaky: before } = classify(targets, r, newOf, ciOnly);
    const flaky = [...before, ...ci.flaky];
    const quarantined = flaky.length ? routeFlaky(ctx, flaky, last, r) : [];
    // A failure that reproduces here is bisected here. One that fails in CI alone is bisected in CI, and when both
    // kinds failed, the CI bisect follows both (followed()): a point here could not see the CI-only one.
    const inCi = ci.confirmed.length > 0;
    await withState(ctx, (s) => {
        s.last.confirm = { ...r, consistent: every, regressed, ci: ci.confirmed, ciRerun: ci.rerun };
        s.last.intermittent = [...intermittent, ...ci.flaky].map((t) => t.id);
        s.last.quarantined = quarantined;
        if (inCi) startCiBisect(s.last);
        if (every.length || regressed.length || inCi) s.last.status = "bisecting";
        if (s.run) s.run.step = "bisect";
    });
}

/**
 * Re-runs the CI run's failed jobs once (never more: no test is retried until it passes). A target whose shard fails
 * again is confirmed in CI; one whose shard passes is a flake, quarantined like one found here. A re-run that ends
 * with no test verdict decides nothing. A passing re-run never moves golden-verified: this commit stays failed.
 * @param ctx the context
 * @param last the failure
 * @param ciOnly the targets that failed in CI and passed every run here
 * @returns `{ confirmed: ids, flaky: targets, rerun }`
 */
async function ciConfirm(ctx, last, ciOnly) {
    const rerun = await ctx.ciRerun(ctx, last);
    if (rerun.lost) return { confirmed: [], flaky: [], rerun };
    const again = (t) => (t.shard ? rerun.failed.includes(t.shard) : rerun.failed.length > 0);
    return { confirmed: ciOnly.filter(again).map((t) => t.id), flaky: ciOnly.filter((t) => !again(t)), rerun };
}

// The failing commit failed in CI twice (the run and its re-run): when it is the newest landing, that point is bad
// already, so no CI run is spent on it again.
function startCiBisect(last) {
    const b = last.bisect;
    b.ci = true;
    if (b.candidates.at(-1) !== last.commit) return;
    b.points[last.commit] = "bad";
    const failed = Object.fromEntries(last.confirm.ci.map((id) => [id, 2]));
    b.evidence[last.commit] = { runs: 2, failed, ci: [last.ci?.url, last.confirm.ciRerun?.url] };
}

/**
 * A CI bisect first runs the last verified commit in CI: failing there too, the failure came with the environment
 * (the runner image, an outside service, the date), not with a landing, so nothing is bisected or reverted and it
 * gets its issue.
 * @param ctx the context
 * @returns true when it did (the failure is recorded)
 */
async function environmentChanged(ctx) {
    const last = readState(ctx).last;
    const b = last.bisect;
    if (!b.ci || !last.from || b.verifiedCheck) return false;
    const job = { failing: last.failing, targets: bisectTargets(last), slot: 1 };
    const r = await ctx.ciCheck(ctx, last.from, job);
    const bad = badTargets(r, job.targets).length > 0;
    await withState(ctx, (s) => {
        s.last.bisect.verifiedCheck = bad ? "bad" : "good";
        s.last.bisect.evidence[last.from] = r;
    });
    if (!bad) return false;
    const where = r.judgedLocally ? "here (CI cannot run it)" : "in CI";
    const why = `the last verified commit ${short(last.from)} fails it too ${where}: an environment change (the runner image, an outside service, the date), not a landing`;
    await finishBisect(ctx, null, why);
    if (!job.targets.some((t) => t.file)) fileEnvironmentIssue(ctx, last, why);
    return true;
}

// A non-test failure files no ledger issue, so an environment change of one gets its own.
function fileEnvironmentIssue(ctx, last, why) {
    const title = `Verification of golden fails in CI at the verified commit too: ${last.failing?.join(", ") ?? "a job"}`;
    const body = `Golden at ${last.commit} fails in CI (${last.ci?.url ?? "-"}), and so does ${why}.`;
    const labels = ["--label", "bug", "--label", "priority:high", "--label", "effort:medium"];
    ghTry(ctx, ["issue", "create", "--title", title, ...labels, "--body", body]);
}

/**
 * The intermittent tests the ledger has no failure of before the range: none at the last verified commit, none
 * before the range's first landing (test-ledger.mjs failuresBefore). A landing in the range made them intermittent.
 * With no landing in the range, or no ledger, there is none.
 * @param ctx the context
 * @param last the failure
 * @param tests the intermittent targets
 * @returns those tests
 */
function newlyIntermittent(ctx, last, tests) {
    const real = tests.filter((t) => t.file && t.family);
    const first = last.bisect.candidates[0];
    if (!real.length || !first) return [];
    const range = {
        from: last.from,
        before: new Date(git(ctx, ctx.main, ["log", "-1", "--format=%cI", first])).toISOString(),
        commits: git(ctx, ctx.main, ["rev-list", last.from ? `${last.from}..${last.commit}` : last.commit]).split("\n"),
    };
    const found = ledgerDo(ctx, (l) => {
        const { db } = l.openLedger(ctx.env, ctx.main);
        if (!db) return [];
        try {
            return real.filter((t) => l.failuresBefore(db, t, range) === 0);
        } finally {
            db.close();
        }
    });
    return found ?? [];
}

// The range's landings, `[{ sha, branch }]`: the suspects a quarantine issue lists.
function suspectsOf(ctx, candidates) {
    if (!candidates.length) return [];
    return git(ctx, ctx.main, ["show", "-s", "--format=%H %s", ...candidates])
        .split("\n")
        .map((l) => ({ sha: l.slice(0, 40), branch: LAND_SUBJECT.exec(l.slice(41))?.[1] ?? null }));
}

// Tests flaky before the range go to the quarantine (on, with their issues): `[{ id, issue }]` of those it holds now.
function routeFlaky(ctx, tests, last, r) {
    const real = tests.filter((t) => t.file && t.family);
    if (!real.length || !quarantine?.quarantineEnabled(ctx.env)) return [];
    try {
        const passedHere = (t) => `passed in ${r.runs - (r.failed[t.id] ?? 0)} of ${r.runs} confirming runs`;
        const how = (t) =>
            r.failed[t.id]
                ? `failed in verification of golden ${short(last.commit)}, then ${passedHere(t)} there`
                : `failed in CI verification of golden ${short(last.commit)}, ${passedHere(t)} here, and passed its CI re-run`;
        const suspects = suspectsOf(ctx, last.bisect.candidates);
        const entries = real.map((t) => ({ ...t, how: how(t), excerpt: t.line ?? "", suspects }));
        const held = quarantine.quarantineTests(ctx.main, entries, ctx.gh);
        return real
            .map((t) => ({ id: t.id, issue: held.find((e) => e.file === t.file && e.name === t.name)?.issue }))
            .filter((q) => q.issue);
    } catch (e) {
        console.log(`verify: quarantine: ${e.message.split("\n")[0]}`);
        return [];
    }
}

// Nothing failed every time: never bisected, never reverted. Quarantined in full, it is `flaky`; else it is a
// failure that was not reproduced, which gets its `Failing on golden` issue.
async function finishIntermittent(ctx) {
    const last = readState(ctx).last;
    const held = new Set((last.quarantined ?? []).map((q) => q.id));
    const all = targetsOf(last).every((t) => held.has(t.id));
    const tests = last.tests ?? [];
    const issues = !all && tests.length ? ledgerDo(ctx, (l) => fileFor(ctx, l, tests, last.commit, last.log)) : null;
    return withState(ctx, (s) => {
        s.last.culprit = null;
        s.last.reproduced = false;
        if (issues) s.last.issues = issues;
        if (all) s.last.status = "flaky";
        else s.last.status = s.last.handling ? "handling" : "failed";
        if (s.run) s.run.step = s.last.status;
    });
}

// The first bad landing is the culprit only when its parent passes every run (unless the parent is the verified
// commit): a parent that fails too means a commit that is not a landing brought the failure.
async function blame(ctx, sha) {
    const last = readState(ctx).last;
    const parent = git(ctx, ctx.main, ["rev-parse", `${sha}^1`]);
    if (parent === last.from) return finishBisect(ctx, sha, null, { sha: parent, verified: true });
    // A CI point is one full run: a parent that already passed as a point is not run again.
    const b = last.bisect;
    if (b.ci && b.points[parent] === "good")
        return finishBisect(ctx, sha, null, { sha: parent, ...b.evidence[parent] });
    const job = { failing: last.failing, targets: bisectTargets(last), slot: 1, full: true };
    const r = { sha: parent, ...(await checkOf(ctx, last.bisect)(ctx, parent, job)) };
    const why = parentFails(sha, parent, r);
    return why ? finishBisect(ctx, null, why, r) : finishBisect(ctx, sha, null, r);
}

async function finishBisect(ctx, sha, why, parent) {
    const last = readState(ctx).last;
    const tests = bisectTargets(last).filter((t) => t.file);
    // No landing to blame: a failure golden has every time, which gets its issue. A culprit is reverted; the
    // issues a land check already filed for these failures are told who it is.
    const issues =
        sha === null && tests.length ? ledgerDo(ctx, (l) => fileFor(ctx, l, tests, last.commit, last.log)) : null;
    return withState(ctx, (s) => {
        const subject = sha ? git(ctx, ctx.main, ["log", "-1", "--format=%s", sha]) : null;
        const evidence = sha ? { at: s.last.bisect.evidence[sha], parent } : undefined;
        // ponytail: a non-test failure is judged by one full gate per point (see defaultCheck); say so
        if (evidence && !s.last.failing) evidence.judgedBy = "judged by 1 run";
        s.last.culprit = sha ? { sha, subject, branch: LAND_SUBJECT.exec(subject)?.[1] ?? null, evidence } : null;
        if (why) s.last.noLanding = why;
        if (issues) s.last.issues = issues;
        const sigs = tests.map((t) => t.signature);
        if (sha && sigs.length)
            ledgerDo(ctx, (l) => l.noteCulprit(l.ledgerDir(ctx.env, ctx.main), sigs, s.last.culprit, ctx.gh));
        if (sha && tests.length) noteMiss(ctx, s.last.culprit, tests);
        s.last.reproduced = true;
        s.last.status = s.last.handling ? "handling" : "failed";
        if (s.run) s.run.step = "failed";
    });
}

// The culprit's miss for history ranking (tools/test-history.mjs): its changed files and its failing test files.
function noteMiss(ctx, culprit, tests) {
    try {
        const changed = git(ctx, ctx.main, ["diff", "--name-only", `${culprit.sha}^1`, culprit.sha]).split("\n");
        const files = tests.map((t) => t.file);
        history?.recordMiss(ctx.env, ctx.main, { culprit: culprit.sha, branch: culprit.branch, changed, files });
    } catch (e) {
        console.log(`verify: miss: ${e.message.split("\n")[0]}`);
    }
}

/**
 * The test shards a gate log says failed, when nothing else did.
 * @param output what the gate printed
 * @param names every shard's name
 * @returns the shard names, or null when another step failed (or none is named): re-run the whole gate
 */
export function failingShards(output, names) {
    const shards = new Set();
    for (const [, name] of (output ?? "").matchAll(/\[FAIL\] (\S+)/g)) {
        const n = name.replace(/:$/, "");
        if (names.has(n)) shards.add(n);
        else if (n !== "Tests") return null;
    }
    return shards.size ? [...shards] : null;
}

async function shardNames(ctx) {
    if (ctx.shards) return new Set(ctx.shards);
    try {
        const { SHARDS } = await import(pathToFileURL(join(ctx.main, "tools/ci-test-matrix.mjs")).href);
        return new Set(SHARDS.map((s) => s.shard));
    } catch {
        return new Set();
    }
}

// ---------------------------------------------------------------- the gate and the narrow checks

/**
 * Runs a command and copies its output to a log file.
 * @param cmd the command
 * @param args its arguments
 * @param opts `cwd`, `env`, `log` (the file)
 * @returns `{ code, output }`
 */
function runLogged(cmd, args, opts) {
    const { cwd, env, log } = opts;
    mkdirSync(dirname(log), { recursive: true });
    const child = spawn(cmd, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const keep = (d) => {
        output += d;
        writeFileSync(log, d, { flag: "a" });
    };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    return new Promise((resolve) => child.on("close", (code) => resolve({ code: code ?? 1, output })));
}

/**
 * The full local gate on a commit (the `local` backend, and a bisect point that re-runs a whole gate): tools/prepush.sh with every package and every shard (PREPUSH_ALL=1; passes
 * are reused by input key), the local GPU tests under the GPU slot, the screenshots of the affected
 * projects and SonarQube on the lines changed since master, through the push queue ahead of ordinary
 * pushes. Nothing is sent: it is a dry-run push.
 * ponytail: PREPUSH_ALL builds and lints every package; an "every shard of the affected packages" mode
 * would be cheaper if verification runs fall behind landings.
 * @param ctx the context
 * @param commit what to verify
 * @param [name] the worktree it runs in
 * @returns `{ code, output, log }`
 */
async function localGate(ctx, commit, name = `golden-verify${ctx.branch === GOLDEN ? "" : "-cut"}`) {
    const dir = join(ctx.main, ".worktrees", name);
    prepareScratch(ctx, dir, commit);
    const log = join(ctx.main, `tmp/golden/verify-logs/${commit.slice(0, 10)}-${Date.now()}.log`);
    // PUSH_QUEUE_RETRY: a commit verification is asked to run again is run, not refused for its last failure.
    const bisecting = name.startsWith("golden-bisect");
    const env = {
        ...ctx.env,
        // Only the full gate may be superseded; a bisect point needs its exact commit.
        ...(bisecting ? {} : { PREPUSH_SUPERSEDED_FILE: ctx.supersededFile }),
        TEST_LEDGER_KIND: bisecting ? "bisect" : "verify",
        TEST_LEDGER_BRANCH: ctx.branch,
        // A CI failure outside the test shards is reproduced by the light gate of every package (no tests).
        PREPUSH_LIGHT: bisecting && backendOf(ctx) === "ci" ? "1" : "0",
        PREPUSH_ALL: "1",
        PUSH_BASE_REF: "origin/master",
        PUSH_QUEUE_PRIORITY: "critical",
        PUSH_QUEUE_RETRY: "1",
    };
    const push = ["git", "push", "--dry-run", "origin", `HEAD:refs/heads/${ctx.branch}-verified`];
    console.log(`verify: the full gate on ${short(commit)} in ${dir} (log: ${log})`);
    return { ...(await runLogged(join(dir, "tools/push-queue.sh"), push, { cwd: dir, env, log })), log };
}

// ---------------------------------------------------------------- the CI gate

// Verification in CI (design/ci/ci-full-testing.md, section 3.2): the commit is pushed to a scratch branch that
// .github/workflows/golden-verify.yml runs on, a full ci.yml run, and this process reads the run's result every
// POLL_MS. No deadline anywhere: a wait ends on the event that settles it (a run that ends, a release train that
// ends, the rate limit's reset).

/** How often a CI verification looks at its run (and at what it yields to). */
export const POLL_MS = 300_000;
/** The backend until `verify.mjs backend ci|local` says otherwise. */
export const DEFAULT_BACKEND = "local";
const CANDIDATE = { [GOLDEN]: "golden-candidate", [CUT]: "golden-cut-candidate" };
const VERIFY_WORKFLOW = "golden-verify.yml";
// golden-verify.yml's job is named Verify, so every check of the called ci.yml is "Verify / <job>".
const CALLER = "Verify / ";
// The jobs whose failure settles the verdict at once: the rest of the run is cancelled.
const FAIL_FAST = /^(Test \(.+\)|Build|Lint|Checks|Docs)$/;
const SUMMARIES = new Set(["All Checks Pass", "Queue Checks Pass"]);
const PENDING = new Set(["QUEUED", "IN_PROGRESS", "PENDING", "WAITING", "REQUESTED", "EXPECTED"]);
const FAILED = new Set(["failure", "timed_out"]);
const BROKER_STALE_MS = 5 * 60_000;
const NO_ANSWER = Symbol("no answer");

/**
 * Which backend verifies golden and golden-cut: `ci` (golden-verify.yml) or `local` (the full gate here).
 * @param ctx the context
 * @returns "ci" or "local"
 */
export const backendOf = (ctx) => readJsonFile(ctx.backendFile)?.backend?.name ?? DEFAULT_BACKEND;

// The gate verification runs: a bisect point (named) always runs here; a verification runs on the backend. A golden
// commit CI cannot run (ciCannotRun) is judged here, as a bisect point is; a cut's is settled before the gate
// (cutByItsOwnCi).
function defaultGate(ctx, commit, name) {
    if (name || backendOf(ctx) !== "ci") return localGate(ctx, commit, name);
    const cannot = ciCannotRun(ctx, commit);
    if (!cannot) return ciGate(ctx, commit);
    console.log(`verify: ${cannot}: the full local gate judges it`);
    return localGate(ctx, commit, name);
}

/**
 * Switches the backend of golden's and golden-cut's verification. Never automatic: `local` needs a reason,
 * which `status` shows.
 * @param ctx the context
 * @param name "ci" or "local"
 * @param [reason] why
 * @returns `{ ok, message }`
 */
export async function setBackend(ctx, name, reason) {
    if (!["ci", "local"].includes(name)) return { ok: false, message: USAGE };
    if (name === "local" && !reason) {
        return { ok: false, message: 'backend local needs --reason "<why CI cannot verify golden>"' };
    }
    const golden = { ...ctx, stateFile: ctx.backendFile, lock: join(dirname(ctx.backendFile), "verify.lock") };
    await withState(golden, (s) => {
        s.backend = { name, reason: reason ?? null, at: now() };
    });
    const where = name === "ci" ? "in CI (golden-verify.yml)" : "on this machine (the full local gate)";
    return { ok: true, message: `verification of golden and golden-cut now runs ${where}; a live run keeps its gate` };
}

/**
 * The CI gate on a commit: yields to a running cut pull request run or release train, pushes the commit to its
 * scratch branch, and reads golden-verify.yml's run every POLL_MS until it settles. A gating job that fails ends it
 * at once (and cancels the rest of the run); a cancelled run is [SUPERSEDED]; a run that is lost or never created
 * is started again, and CI is marked unavailable on the second time. Never a deadline.
 * @param ctx the context
 * @param commit what to verify
 * @param [opts] a CI bisect point's: `ref` (golden-bisect-<n>), `kind` ("bisect", the ledger's), `shards` (the
 *   failing shards: only a failure of one of them ends the run early)
 * @returns `{ code, output, log, run, records }`: output has one `[FAIL] <shard or job>` line per failed job; on a
 *   failure, `run` is `{ id, attempt, url }` and `records` the ledger records of the failed shards' JUnit, by shard
 */
export async function ciGate(ctx, commit, opts = {}) {
    const log = join(ctx.main, `tmp/golden/verify-logs/${commit.slice(0, 10)}-ci-${Date.now()}.log`);
    mkdirSync(dirname(log), { recursive: true });
    const say = (line) => {
        console.log(`verify: ${line}`);
        writeFileSync(log, `${now()} ${line}\n`, { flag: "a" });
    };
    await yieldToFullRuns(ctx, say);
    const job = { commit, ref: opts.ref ?? CANDIDATE[ctx.branch], say, started: Date.now() };
    Object.assign(job, { kind: opts.kind ?? "verify", shards: opts.shards });
    await pushRef(ctx, job);
    for (;;) {
        await ctx.sleep(ctx.pollMs);
        const r = await pollRun(ctx, job);
        if (r) {
            say(r.output);
            return { ...r, log };
        }
    }
}

// What a new full run would be the third of: the cut pull request's CI run, or a release train.
function busyWith(ctx) {
    const cut = brokerChecks(ctx, (pr) => pr.head === CUT);
    if (Object.entries(cut ?? {}).some(([n, c]) => !n.startsWith(CALLER) && PENDING.has(c))) {
        return "the cut pull request's CI run";
    }
    try {
        const list = ["run", "list", "--workflow", "release.yml", "--status", "in_progress", "-L", "1"];
        if (JSON.parse(ctx.gh([...list, "--json", "databaseId"])).length) return "a release train";
    } catch {
        // an unanswered look never holds verification back
    }
    return null;
}

async function yieldToFullRuns(ctx, say) {
    for (let busy = busyWith(ctx); busy; busy = busyWith(ctx)) {
        say(`${busy} is running: the full CI run starts at the first look after it ends`);
        await ctx.sleep(ctx.pollMs);
    }
}

async function pushRef(ctx, { commit, ref, say }) {
    const args = ["push", "--no-verify", "--force", "-q", "origin", `${commit}:refs/heads/${ref}`];
    const r = git(ctx, ctx.main, args, { ok: true });
    if (r.status === 0) return say(`pushed ${short(commit)} to ${ref}`);
    await setUnavailable(ctx, `the push to ${ref} failed: ${r.stderr.split("\n")[0]}`);
}

/**
 * Why CI cannot run a commit, or null: a push runs the pushed commit's own copy of the workflow, so a commit from
 * before golden-verify.yml gets no run, and a dispatch needs the workflow on master. Pushed anyway, it would look
 * like GitHub creating no run and mark CI unavailable; such a commit is judged here instead (defaultCiCheck).
 * @param ctx the context
 * @param commit the commit
 * @returns the reason, or null
 */
export function ciCannotRun(ctx, commit) {
    const has = (rev) =>
        git(ctx, ctx.main, ["cat-file", "-e", `${rev}:.github/workflows/${VERIFY_WORKFLOW}`], { ok: true });
    if (has(commit).status === 0 || has("origin/master").status === 0) return null;
    return `CI cannot run ${short(commit)}: it predates ${VERIFY_WORKFLOW}, which master does not have yet`;
}

// A new push event for the same commit: a dispatch once golden-verify.yml is on master, else the ref deleted and
// pushed again (an unchanged ref makes no push event; a new branch does).
async function recreate(ctx, job) {
    const onMaster = ["cat-file", "-e", `origin/master:.github/workflows/${VERIFY_WORKFLOW}`];
    if (git(ctx, ctx.main, onMaster, { ok: true }).status === 0) {
        const shards = job.shards ? ["-f", `shards=${JSON.stringify(job.shards)}`] : [];
        if (ghTry(ctx, ["workflow", "run", VERIFY_WORKFLOW, "-f", `ref=${job.commit}`, ...shards]))
            job.dispatched = true;
        return job.say(`dispatched ${VERIFY_WORKFLOW} for ${short(job.commit)}`);
    }
    git(ctx, ctx.main, ["push", "--no-verify", "-q", "origin", `:refs/heads/${job.ref}`], { ok: true });
    await pushRef(ctx, job);
}

// One look: the status broker first (free), GitHub's REST API when it has no answer.
async function pollRun(ctx, job) {
    // A bisect point (often the verified commit, maybe a pull request's head) needs its new run: the broker may still
    // show an older run's checks on that commit.
    const seen = job.kind === "bisect" ? null : brokerVerdict(ctx, job.commit);
    if (seen === "passed") return { code: 0, output: `${CALLER}All Checks Pass: success (from the status broker)` };
    if (seen === "running") {
        await clearTrouble(ctx);
        return null;
    }
    const run = await findRun(ctx, job);
    if (run === NO_ANSWER) return null;
    if (!run) {
        await noRun(ctx, job);
        return null;
    }
    return judgeRun(ctx, job, run);
}

function brokerChecks(ctx, match) {
    const b = readJsonFile(ctx.brokerFile);
    const age = Date.now() - Date.parse(b?.fetchedAt);
    if (!b || b.error || Number.isNaN(age) || age >= BROKER_STALE_MS) return null;
    return (b.pullRequests ?? []).find(match)?.checks ?? null;
}

/**
 * What the status broker says of a commit's verification run: a pull request whose head is the commit (golden's,
 * or the cut's) carries its "Verify / ..." checks.
 * @param ctx the context
 * @param commit the commit
 * @returns "passed", "running", or null (no answer, or a failure to read in detail)
 */
export function brokerVerdict(ctx, commit) {
    const checks = brokerChecks(ctx, (pr) => pr.headSha === commit);
    const mine = Object.entries(checks ?? {}).filter(([n]) => n.startsWith(CALLER));
    if (!mine.length) return null;
    // The broker cannot tell a full attempt from a re-run of the failed jobs: after a CI failure of this commit,
    // its green is read from GitHub (ended), which can.
    const last = readState(ctx).last;
    const rerunnable = last?.commit === commit && Boolean(last.ci);
    if (checks[`${CALLER}All Checks Pass`] === "SUCCESS") return rerunnable ? null : "passed";
    const failedFast = mine.some(([n, c]) => c === "FAILURE" && FAIL_FAST.test(n.slice(CALLER.length)));
    if (failedFast || !mine.some(([, c]) => PENDING.has(c))) return null;
    return "running";
}

// The newest golden-verify.yml run of the commit; one that had ended before this gate started is an old verdict.
async function findRun(ctx, job) {
    const query = job.dispatched ? "event=workflow_dispatch" : `head_sha=${job.commit}`;
    const path = `repos/{owner}/{repo}/actions/workflows/${VERIFY_WORKFLOW}/runs?${query}&per_page=30`;
    const answer = await ghJson(ctx, ["api", path]);
    if (answer === NO_ANSWER) return NO_ANSWER;
    // A pushed run is the commit's on this ref (the same commit may be a point on another scratch branch); a
    // dispatched run's head is master's, so its run name carries the commit.
    const pushed = (r) => r.head_sha === job.commit && r.head_branch === job.ref;
    const ours = (r) => (job.dispatched ? (r.display_title ?? "").includes(job.commit) : pushed(r));
    const current = (r) => r.status !== "completed" || Date.parse(r.updated_at) >= job.started;
    return (answer.workflow_runs ?? []).filter(ours).find(current) ?? null;
}

async function judgeRun(ctx, job, run) {
    if (run.status === "completed") return ended(ctx, job, run);
    if (run.status === "in_progress") await clearTrouble(ctx);
    const jobs = await runJobs(ctx, run.id, job.commit);
    const ends = await failsFastIn(ctx, job);
    if (jobs === NO_ANSWER || !jobs.some(ends)) return null;
    job.say(`a gating job failed in ${run.html_url}: cancelling the rest of the run`);
    ghTry(ctx, ["api", "-X", "POST", `repos/{owner}/{repo}/actions/runs/${run.id}/cancel`]);
    return failure(ctx, job, run, jobs);
}

// A bisect point's run ends early only on a failure of a shard it follows (or the group job holding one).
async function failsFastIn(ctx, job) {
    if (!job.shards) return failsFast;
    const groups = await shardGroups(ctx);
    return (j) => {
        const shard = testShard(j);
        return isFailed(j) && Boolean(shard) && [shard, ...(groups[shard] ?? [])].some((s) => job.shards.includes(s));
    };
}

// The run is judged as it judges itself: by "Verify / All Checks Pass" and the jobs it needs. A job that cannot
// fail the run (runJobs leaves it out) is no verdict, so a failed screenshot capture under a green All Checks Pass
// passes. A first attempt's success needs no job list; a later attempt's needs one, to tell a full re-run from a
// re-run of the failed jobs only.
async function ended(ctx, job, run) {
    if (run.conclusion === "cancelled") {
        return { code: 1, output: `[SUPERSEDED] ${run.html_url} was cancelled; the newest wanted commit is verified` };
    }
    const firstPass = run.conclusion === "success" && (run.run_attempt ?? 1) === 1;
    const listed = run.conclusion !== "startup_failure" && !firstPass;
    const jobs = listed ? await runJobs(ctx, run.id, job.commit) : [];
    if (jobs === NO_ANSWER) return null;
    if (run.conclusion === "success" || jobs.some(passedAll)) return passed(ctx, job, run, jobs);
    if (!jobs.some(isFailed)) {
        await lostRun(ctx, job, run);
        return null;
    }
    await clearTrouble(ctx);
    return failure(ctx, job, run, jobs);
}

// Only a full attempt verifies: a green re-run of the failed jobs alone (`gh run rerun --failed`) never moves
// golden-verified; a new full run of the commit is started instead.
async function passed(ctx, job, run, jobs) {
    await clearTrouble(ctx);
    const attempt = run.run_attempt ?? 1;
    if (jobs.some((j) => (j.run_attempt ?? attempt) !== attempt)) {
        job.say(`${run.html_url} passed only on a re-run of its failed jobs: not a verdict, starting a full run`);
        await recreate(ctx, job);
        return null;
    }
    if (job.kind === "verify") ciFlakes(ctx, job, run);
    return { code: 0, output: `${CALLER}All Checks Pass: success (${run.html_url})` };
}

const FLAKES_QUERY = `query($id: ID!) { node(id: $id) { ... on CheckSuite { checkRuns(first: 100) { nodes {
  annotations(first: 50) { nodes { message } } } } } } }`;
const FLAKY_NOTE = /^\[FLAKY\] (\S+): (\S+) > (.+) failed and passed on the same inputs/;

/**
 * The tests a green run's quarantine wrapper let through as flaky (its `[FLAKY]` warnings), as targets.
 * @param answer the GraphQL answer
 * @returns `[{ id, shard, family, file, name }]`
 */
export function flakyNotes(answer) {
    const runs = answer?.data?.node?.checkRuns?.nodes ?? [];
    const notes = runs.flatMap((r) => r.annotations?.nodes ?? []).map((a) => FLAKY_NOTE.exec(a.message ?? ""));
    const tests = notes
        .filter(Boolean)
        .map(([, shard, file, name]) => ({ id: `${file} > ${name}`, shard, file, name }));
    return [...new Map(tests.map((t) => [t.id, { ...t, family: ledger?.familyOf(t.shard) ?? t.shard }])).values()];
}

/**
 * A green CI verification still tells of the tests it let through (design/ci/history-selection.md, section 6): one
 * GraphQL call reads the run's `[FLAKY]` warnings, and each test the quarantine does not list yet is recorded in the
 * ledger and quarantined with the range's landings as suspects. Its issue says when the ledger has no failure of it
 * before the range (newly intermittent, so a landing made it so). Unanswered, nothing happens.
 * ponytail: a newly intermittent test seen only as a CI retry-pass is reported with suspects, not bisected; bisect
 * it in CI when such issues show up.
 * @param ctx the context
 * @param job the gate's job
 * @param run the green run
 * @returns the quarantine entries in force for those tests
 */
function ciFlakes(ctx, job, run) {
    if (!quarantine?.quarantineEnabled(ctx.env) || !run.check_suite_node_id) return [];
    try {
        const query = ["api", "graphql", "-f", `query=${FLAKES_QUERY}`, "-f", `id=${run.check_suite_node_id}`];
        const listed = quarantine.activeList(quarantine.committedList(ctx.main), quarantine.readState(ctx.main));
        const fresh = flakyNotes(JSON.parse(ctx.gh(query))).filter((t) => !quarantine.quarantined(listed, t.family, t));
        if (!fresh.length) return [];
        const from = readState(ctx).verified;
        const last = { from, commit: job.commit, bisect: { candidates: landMerges(ctx, from, job.commit) } };
        const newly = new Set(newlyIntermittent(ctx, last, fresh).map((t) => t.id));
        ledgerDo(ctx, (l) => recordFlakes(ctx, l, { job, run, fresh }));
        const where = `failed and passed its retry in CI verification of golden ${short(job.commit)}`;
        const how = (t) =>
            newly.has(t.id) ? `${where}, with no failure in the ledger before: newly intermittent` : where;
        const suspects = suspectsOf(ctx, last.bisect.candidates);
        const entries = fresh.map((t) => ({ ...t, how: how(t), excerpt: "", suspects }));
        return quarantine.quarantineTests(ctx.main, entries, ctx.gh);
    } catch (e) {
        console.log(`verify: the run's flaky tests: ${e.message.split("\n")[0]}`);
        return [];
    }
}

// One ledger record per shard of a green run's let-through flakes: the shard passed, its tests failed once.
function recordFlakes(ctx, l, { job, run, fresh }) {
    for (const shard of new Set(fresh.map((t) => t.shard))) {
        const failures = fresh.filter((t) => t.shard === shard).map((t) => ({ ...t, text: "", retryPassed: true }));
        ciRecord(ctx, l, { job, run, shard, junit: { files: new Map() }, failures, outcome: "passed" });
    }
}

const jobName = (j) => (j.name.startsWith(CALLER) ? j.name.slice(CALLER.length) : j.name);
const passedAll = (j) => jobName(j) === "All Checks Pass" && j.conclusion === "success";
const isFailed = (j) => FAILED.has(j.conclusion) && !SUMMARIES.has(jobName(j));
const failsFast = (j) => isFailed(j) && FAIL_FAST.test(jobName(j));
const testShard = (j) => /^Test \((.+)\)$/.exec(jobName(j))?.[1];

// A run's jobs, without those that cannot fail it (see nonGatingJobs: their failure is no verdict).
async function runJobs(ctx, id, commit) {
    const answer = await ghJson(ctx, [
        "api",
        `repos/{owner}/{repo}/actions/runs/${id}/jobs?per_page=100&filter=latest`,
    ]);
    if (answer === NO_ANSWER) return NO_ANSWER;
    const yml = git(ctx, ctx.main, ["show", `${commit}:.github/workflows/ci.yml`], { ok: true }).stdout ?? "";
    const skip = nonGatingJobs(yml);
    return (answer.jobs ?? []).filter((j) => !skip.some((re) => re.test(jobName(j))));
}

/**
 * The jobs of a ci.yml that cannot fail its run: a job-level `continue-on-error` (the screenshot captures, the
 * benchmarks, an advisory job in its warning period). A matrix job's `${{ }}` in its name matches anything.
 * @param yml ci.yml's text
 * @returns a RegExp per job, matching its check name
 */
export function nonGatingJobs(yml) {
    const jobs = [];
    let inJobs = false;
    for (const line of yml.split("\n")) {
        if (/^\S/.test(line)) inJobs = line.startsWith("jobs:");
        const id = inJobs && /^ {4}([\w-]+):\s*$/.exec(line);
        if (id) jobs.push({ name: id[1], lenient: false });
        const job = jobs.at(-1);
        if (!inJobs || !job) continue;
        const NAME = "        name:";
        if (line.startsWith(NAME))
            job.name = line
                .slice(NAME.length)
                .trim()
                .replace(/^(["'])(.*)\1$/, "$2");
        if (/^ {8}continue-on-error:/.test(line)) job.lenient = true;
    }
    const escape = (t) => t.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const pattern = (n) =>
        new RegExp(
            `^${n
                .split(/\$\{\{.*?\}\}/)
                .map(escape)
                .join(".+")}$`,
        );
    return jobs.filter((j) => j.lenient).map((j) => pattern(j.name));
}

/**
 * The gate's output for a failed run: `[FAIL] <shard>` per failed test job (a shard group's job, one line per member
 * it names as failed), `[FAIL] <job>` per other failed job, so failingShards() reads it as it reads the local gate's.
 * Each failed test job's JUnit reports are recorded in the test ledger (as `job.kind`) unless `job.record` is false.
 * @param ctx the context
 * @param job the gate's job (`commit`, `kind`, `record`)
 * @param run the run
 * @param jobs its jobs
 * @returns `{ code: 1, output, run: { id, attempt, url }, records: { shard: record } }`
 */
async function failure(ctx, job, run, jobs) {
    const groups = await shardGroups(ctx);
    const lines = [];
    const records = {};
    for (const j of jobs.filter(isFailed)) {
        const shard = testShard(j);
        const members = groups[shard] ? groupFailures(ctx, j, groups[shard]) : [shard ?? jobName(j)];
        lines.push(...members.map((m) => `[FAIL] ${m}`));
        if (shard && job.record !== false) Object.assign(records, await junitRecords(ctx, job, run, shard, members));
    }
    lines.push(`run: ${run.html_url}`);
    const ran = { id: run.id, attempt: run.run_attempt ?? 1, url: run.html_url };
    return { code: 1, output: lines.join("\n"), run: ran, records };
}

/**
 * The names a gate output's `[FAIL] <name>` lines give: shards, and the jobs that are not test jobs.
 * @param output the output
 * @returns the names
 */
const failedNames = (output) => [...(output ?? "").matchAll(/\[FAIL\] (\S+)/g)].map((m) => m[1].replace(/:$/, ""));

/**
 * A failed test job's JUnit reports (ci.yml's `junit-<shard>` artifact, one download) as test-ledger records of the
 * commit, one per failing shard, so verification knows the exact failing tests and runs only their files here.
 * A test that failed in one report and passed in another (the quarantine's retry) is kept as a failure. Without the artifact or
 * the ledger there is no record, and the shard is run whole.
 * ponytail: a group's report goes to the first failing member with its package; two members of one package
 * (cytoscape-extensions and its Cytoscape versions pass) share one.
 * @param ctx the context
 * @param job the gate's job
 * @param run the run
 * @param artifact the matrix shard (a shard or a group)
 * @param members the failing shards it holds
 * @returns `{ shard: record }`
 */
async function junitRecords(ctx, job, run, artifact, members) {
    const dir = join(ctx.main, "tmp/golden/verify-junit", String(run.id), artifact);
    rmSync(dir, { recursive: true, force: true });
    if (!ghTry(ctx, ["run", "download", String(run.id), "-n", `junit-${artifact}`, "-D", dir])) return {};
    const packages = await shardPackages(ctx);
    const owner = (file) => members.find((m) => members.length === 1 || packages[m] === file.split("/")[0]);
    const records = ledgerDo(ctx, (l) => {
        const junit = readCiJunit(l, dir);
        const out = {};
        for (const shard of members) {
            const failures = junit.failures.filter((f) => owner(f.file) === shard);
            if (failures.length) out[shard] = ciRecord(ctx, l, { job, run, shard, junit, failures });
        }
        return out;
    });
    return records ?? {};
}

// Every report in a directory, each failure once; one that passed in another report (the quarantine's retry) is
// kept, marked retryPassed, so verification confirms it and the ledger keeps it (design/ci/history-selection.md 6).
function readCiJunit(l, dir) {
    const reports = existsSync(dir) ? readdirSync(dir).filter((n) => /^junit-.*\.xml$/.test(n)) : [];
    const all = { files: new Map(), failures: [] };
    const passed = new Set();
    const key = (file, name) => `${file}\0${name}`;
    for (const n of reports) {
        const xml = readFileSync(join(dir, n), "utf8");
        const pkg = n.slice(6, n.lastIndexOf("-"));
        l.parseJunit(xml, pkg, all);
        const one = l.parseJunit(xml, pkg);
        const failed = new Set(one.failures.map((f) => key(f.file, f.name)));
        for (const [file, c] of one.files) {
            for (const name of c.names) if (!failed.has(key(file, name))) passed.add(key(file, name));
        }
    }
    const failures = new Map(all.failures.map((f) => [key(f.file, f.name), f]));
    all.failures = [...failures].map(([k, f]) => (passed.has(k) ? { ...f, retryPassed: true } : f));
    return all;
}

// One shard's record, as tools/test-ledger.mjs record() writes a run's here.
function ciRecord(ctx, l, { job, run, shard, junit, failures, outcome = "failed" }) {
    const pkgs = new Set(failures.map((f) => f.file.split("/")[0]));
    const files = [...junit.files]
        .filter(([f]) => pkgs.has(f.split("/")[0]))
        .map(([f, c]) => [f, c.passed, c.failed, c.skipped, c.ms, c.dup]);
    const subject = git(ctx, ctx.main, ["log", "-1", "--format=%s", job.commit], { ok: true }).stdout;
    const rev = (ref) => git(ctx, ctx.main, ["rev-parse", "-q", "--verify", ref], { ok: true }).stdout || null;
    const family = l.familyOf(shard);
    const rec = {
        v: 1,
        id: l.newRunId(shard),
        kind: job.kind,
        commit: job.commit,
        tree: rev(`${job.commit}^{tree}`),
        base: rev(`${job.commit}^1`),
        branch: LAND_SUBJECT.exec(subject)?.[1] ?? ctx.branch,
        dirty: false,
        shard,
        family,
        variant: family,
        selected: null,
        outcome,
        reused_from: null,
        started_at: now(),
        secs: 0,
        log: run.html_url,
        files,
        failures: failures.map((f) => ({
            file: f.file,
            name: f.name,
            ...l.failureHashes(f.text, f.file),
            message: f.text.slice(0, 2000),
            ...(f.retryPassed ? { retry_passed: true } : {}),
        })),
        exonerations: [],
    };
    l.writeRecord(l.ledgerDir(ctx.env, ctx.main), rec);
    return rec;
}

async function shardPackages(ctx) {
    if (ctx.packages) return ctx.packages;
    try {
        const { SHARDS } = await import(pathToFileURL(join(ctx.main, "tools/ci-test-matrix.mjs")).href);
        return Object.fromEntries(SHARDS.map((s) => [s.shard, s.package]));
    } catch {
        return {};
    }
}

// A group job ends with "::error::failed: <member> ...", an annotation on its check run; unread, every member.
function groupFailures(ctx, j, members) {
    try {
        const notes = JSON.parse(ctx.gh(["api", `repos/{owner}/{repo}/check-runs/${j.id}/annotations`]));
        const named = new Set();
        for (const n of notes)
            for (const m of /failed:(.*)/.exec(n.message ?? "")?.[1].split(/\s+/) ?? []) named.add(m);
        const failed = members.filter((m) => named.has(m));
        if (failed.length) return failed;
    } catch (e) {
        console.log(`verify: could not read ${j.name}'s failed members: ${e.message.split("\n")[0]}`);
    }
    return members;
}

async function shardGroups(ctx) {
    if (ctx.groups) return ctx.groups;
    try {
        return (await import(pathToFileURL(join(ctx.main, "tools/ci-test-matrix.mjs")).href)).GROUPS ?? {};
    } catch {
        return {};
    }
}

// A run that ended without a test verdict (startup_failure, or failed with no failed job: a lost runner, a 5xx):
// re-run once; the second loss in a row marks CI unavailable, and it is tried again at each look while
// githubstatus.com says Actions is operational.
async function lostRun(ctx, job, run) {
    const count = await withState(ctx, (s) => {
        const n = s.lostRuns?.commit === job.commit ? s.lostRuns.count + 1 : 1;
        s.lostRuns = { commit: job.commit, count: n, run: run.id, at: now() };
        return n;
    });
    job.say(`${run.html_url} ended ${run.conclusion} with no failed job: not a verdict (loss ${count})`);
    if (count >= 2) {
        await setUnavailable(ctx, `${count} runs of ${short(job.commit)} lost (${run.conclusion})`);
        if (!(await ctx.actionsOperational())) return;
    }
    if (!ghTry(ctx, ["api", "-X", "POST", `repos/{owner}/{repo}/actions/runs/${run.id}/rerun`]))
        await recreate(ctx, job);
}

// No run for the commit: GitHub accepted a push and created none, or the ref is not at the commit (someone moved
// it, or the push failed). The second no-run in a row marks CI unavailable.
async function noRun(ctx, job) {
    const at = git(ctx, ctx.main, ["ls-remote", "origin", `refs/heads/${job.ref}`], { ok: true }).stdout.split("\t")[0];
    if (at !== job.commit && !job.dispatched) {
        await pushRef(ctx, job);
        return;
    }
    const attempt = await withState(ctx, (s) => {
        const n = s.noRun?.commit === job.commit ? s.noRun.attempt + 1 : 1;
        s.noRun = { commit: job.commit, ref: job.ref, attempt: n, at: now() };
        return n;
    });
    job.say(`no CI run created for ${short(job.commit)} on ${job.ref}, attempt ${attempt}`);
    if (attempt >= 2) {
        await setUnavailable(ctx, `no CI run created for ${short(job.commit)} twice`);
        if (!(await ctx.actionsOperational())) return;
    }
    await recreate(ctx, job);
}

/**
 * Parses a `gh` answer. A rate limit waits for the reset `gh api rate_limit` names (free); any other error marks CI
 * unavailable. Either way this look has no answer.
 * @param ctx the context
 * @param args gh's arguments
 * @returns the parsed answer, or NO_ANSWER
 */
async function ghJson(ctx, args) {
    try {
        return JSON.parse(ctx.gh(args));
    } catch (e) {
        const message = e.message.split("\n")[0];
        if (!/rate limit/i.test(e.message)) {
            await setUnavailable(ctx, `the run lookup failed: ${message}`);
            return NO_ANSWER;
        }
        let reset = 0;
        try {
            reset = Number(ctx.gh(["api", "rate_limit", "--jq", ".resources.core.reset"])) * 1000;
        } catch {
            // the next look asks again
        }
        console.log(`verify: GitHub's rate limit: waiting for its reset at ${new Date(reset).toISOString()}`);
        if (reset > Date.now()) await ctx.sleep(reset - Date.now());
        return NO_ANSWER;
    }
}

function ghTry(ctx, args) {
    try {
        ctx.gh(args);
        return true;
    } catch (e) {
        console.log(`verify: gh ${args.slice(0, 3).join(" ")} failed: ${e.message.split("\n")[0]}`);
        return false;
    }
}

async function setUnavailable(ctx, cause) {
    console.log(`verify: CI verification unavailable: ${cause}`);
    await withState(ctx, (s) => {
        s.ciUnavailable = { since: s.ciUnavailable?.since ?? now(), cause };
    });
}

// A run that started (or settled) clears every CI trouble on record.
async function clearTrouble(ctx) {
    const s = readState(ctx);
    if (!s.ciUnavailable && !s.noRun && !s.lostRuns) return;
    await withState(ctx, (state) => {
        delete state.ciUnavailable;
        delete state.noRun;
        delete state.lostRuns;
    });
}

// githubstatus.com's public components API (not the GitHub API budget); unreachable counts as operational, so
// a retry is never held back by a status page.
async function defaultActionsOperational() {
    try {
        const r = await fetch("https://www.githubstatus.com/api/v2/components.json");
        const actions = (await r.json()).components.find((c) => c.name === "Actions");
        return !actions || actions.status === "operational";
    } catch {
        return true;
    }
}

/** How many verified commits' screenshot verdicts the state keeps. */
export const CAPTURES_KEPT = 50;
const CAPTURE_JOB = /^visual \((.+)\)$/;
const BROKEN_CAPTURE = new Set(["unstable", "failed"]);

/**
 * Whether a run's screenshot captures are clean: every "visual (<project>)" job succeeded (a crashed capture is
 * continue-on-error, so the run passes anyway), and each project's newest `visual-<project>-<attempt>` artifact
 * holds a complete results.json with no unstable or failed image, or the marker of a project it could not affect.
 * @param jobs the run's jobs (all of them, gating or not)
 * @param dir where the run's `visual-*` artifacts were downloaded, one directory each
 * @returns the problems, none when clean
 */
export function captureProblems(jobs, dir) {
    const projects = jobs.map((j) => [j, CAPTURE_JOB.exec(jobName(j))?.[1]]).filter(([, p]) => p);
    if (!projects.length) return ["the run has no screenshot capture job"];
    const problems = projects
        .filter(([j]) => j.conclusion !== "success")
        .map(([j, p]) => `visual (${p}) ended ${j.conclusion ?? j.status}`);
    for (const [, p] of projects) problems.push(...resultProblems(p, newestCapture(dir, p)));
    return problems;
}

// A project's newest `visual-<project>-<attempt>` artifact directory, or undefined.
function newestCapture(dir, project) {
    const prefix = `visual-${project}-`;
    const attempt = (n) => Number(n.slice(prefix.length));
    const names = existsSync(dir) ? readdirSync(dir) : [];
    const mine = names.filter((n) => n.startsWith(prefix) && /^\d+$/.test(n.slice(prefix.length)));
    const newest = mine.sort((a, b) => attempt(b) - attempt(a))[0];
    return newest && join(dir, newest);
}

function resultProblems(project, dir) {
    if (!dir) return [`no capture of ${project} was uploaded`];
    if (existsSync(join(dir, "skipped.json"))) return [];
    const r = readJsonFile(join(dir, "results.json"));
    if (!r) return [`${project}: no results.json (the capture did not start)`];
    const broken = (r.items ?? []).filter((i) => BROKEN_CAPTURE.has(i.status));
    const out = broken.map((i) => `${project}: ${i.status} ${i.id ?? i.file ?? "?"}`);
    if (r.complete !== true) out.unshift(`${project}: incomplete (${r.items?.length ?? 0} of ${r.expected ?? "?"})`);
    return out;
}

// The statuses the visual gate passes (visual-review/trusted/gate.mjs PASSING): anything else fails it.
const GATE_PASSES = new Set(["unchanged", "excluded"]);

/**
 * What CI's capture says against the baselines it compared with, as the visual gate reads it: `changed` is every
 * image the gate would not pass (it differs from its committed baseline, has none, or did not capture), `flaky`
 * every image that matched only on its second capture. Each is `{ project, file, status, baseline, capture }`, the
 * baseline and capture as SHA-256 (a baseline's Git LFS oid), so `land.mjs ship` can tell whether the owner has
 * approved that picture since.
 * @param jobs the run's jobs (all of them)
 * @param dir where the run's `visual-*` artifacts were downloaded, one directory each
 * @returns `{ changed, flaky }`
 */
export function captureChanges(jobs, dir) {
    const changed = [];
    const flaky = [];
    for (const p of jobs.map((j) => CAPTURE_JOB.exec(jobName(j))?.[1]).filter(Boolean)) {
        const at = newestCapture(dir, p);
        for (const i of (at && readJsonFile(join(at, "results.json"))?.items) ?? []) {
            const item = { project: p, file: i.file, status: i.status, baseline: i.baseline, capture: i.capture };
            if (!GATE_PASSES.has(i.status)) changed.push(item);
            else if (i.flaky) flaky.push(item);
        }
    }
    return { changed, flaky };
}

/**
 * The screenshot verdict of a commit CI verified: its golden-verify.yml run (pushed to golden-candidate, or
 * dispatched with the commit in its name), every job of it, and its `visual-*` artifacts (small: only changed
 * images are in them). Anything unread is not clean, so such a commit is never cut.
 * @param ctx the context
 * @param commit the commit
 * @returns `{ clean, problems, run, at, changed, flaky }` (captureChanges; neither when the run was not read)
 */
async function defaultCaptures(ctx, commit) {
    const verdict = (problems, run = null) => ({ clean: problems.length === 0, problems, run, at: now() });
    const api = (path) => JSON.parse(ctx.gh(["api", `repos/{owner}/{repo}/actions/${path}`]));
    try {
        const runs = api(`workflows/${VERIFY_WORKFLOW}/runs?per_page=50`);
        const pushed = (r) => r.head_sha === commit && r.head_branch === CANDIDATE[ctx.branch];
        const ours = (r) => pushed(r) || (r.display_title ?? "").includes(commit);
        const run = (runs.workflow_runs ?? []).find((r) => ours(r) && r.status === "completed");
        if (!run) return verdict([`no completed ${VERIFY_WORKFLOW} run of ${short(commit)} found`]);
        const jobs = api(`runs/${run.id}/jobs?per_page=100&filter=latest`);
        const dir = join(ctx.main, "tmp/golden/verify-captures", String(run.id));
        rmSync(dir, { recursive: true, force: true });
        mkdirSync(dir, { recursive: true });
        // No artifact at all is no error here: captureProblems names each project that has none.
        ghTry(ctx, ["run", "download", String(run.id), "-p", "visual-*", "-D", dir]);
        return {
            ...verdict(captureProblems(jobs.jobs ?? [], dir), run.html_url),
            ...captureChanges(jobs.jobs ?? [], dir),
        };
    } catch (e) {
        return verdict([`the run's screenshots could not be read: ${e.message.split("\n")[0]}`]);
    }
}

/**
 * The one CI re-run of a verification run's failed jobs (`gh run rerun --failed`), read every POLL_MS until the new
 * attempt ends. Its reports are not recorded: the run's own are.
 * @param ctx the context
 * @param last the failure (`last.ci` is the run)
 * @returns `{ failed: names, url }` (the shards and jobs that failed again; none when it passed), or
 *   `{ lost: why }` when it gave no test verdict
 */
async function defaultCiRerun(ctx, last) {
    const { id, attempt } = last.ci;
    if (!ghTry(ctx, ["run", "rerun", String(id), "--failed"])) return { lost: "the re-run could not start" };
    console.log(`verify: re-running the failed jobs of ${last.ci.url} once`);
    for (;;) {
        await ctx.sleep(ctx.pollMs);
        const run = await ghJson(ctx, ["api", `repos/{owner}/{repo}/actions/runs/${id}`]);
        const done = run !== NO_ANSWER && run.status === "completed" && (run.run_attempt ?? 0) > attempt;
        const jobs = done && run.conclusion !== "success" ? await runJobs(ctx, id, last.commit) : [];
        if (done && jobs !== NO_ANSWER) return rerunVerdict(ctx, last, run, jobs);
    }
}

async function rerunVerdict(ctx, last, run, jobs) {
    if (run.conclusion === "success" || jobs.some(passedAll)) return { failed: [], url: run.html_url };
    if (!jobs.some(isFailed)) return { lost: `the re-run ended ${run.conclusion} with no failed job` };
    const r = await failure(ctx, { commit: last.commit, record: false }, run, jobs);
    return { failed: failedNames(r.output), url: run.html_url };
}

/**
 * One CI bisect point: the commit pushed to golden-bisect-<slot> and run in CI (a full run until golden-verify.yml
 * is on master), judged by its JUnit as a point here is judged by the ledger: a target fails when its shard failed
 * with that failure. A run cancelled by someone else is no verdict, and runs again.
 * @param ctx the context
 * @param commit the point
 * @param job what to run
 * @param job.failing the failing shards, or null (another job failed)
 * @param job.targets the targets
 * @param job.slot which golden-bisect-<n> branch
 * @param [job.full] passed on to a check here
 * @returns `{ runs: 1, failed: { targetId: 1 }, run }`; a commit CI cannot run (ciCannotRun) is judged here instead,
 *   by ctx.check (the failing shards' files, through the local gate), with `judgedLocally: why`
 */
async function defaultCiCheck(ctx, commit, { failing, targets, slot, full }) {
    const cannotRun = ciCannotRun(ctx, commit);
    if (cannotRun) {
        console.log(`verify: ${cannotRun}: judging it here`);
        return { ...(await ctx.check(ctx, commit, { failing, targets, slot, full })), judgedLocally: cannotRun };
    }
    const opts = { ref: `golden-bisect-${slot}`, kind: "bisect", shards: failing ?? undefined };
    let r = await ciGate(ctx, commit, opts);
    while (r.code !== 0 && /\[SUPERSEDED\]/.test(r.output)) r = await ciGate(ctx, commit, opts);
    const names = failedNames(r.output);
    const hit = (t) => !t.shard || (names.includes(t.shard) && failedTargets(1, r.records?.[t.shard], [t]).length > 0);
    const failed = r.code === 0 ? [] : targets.filter(hit);
    return { runs: 1, failed: Object.fromEntries(failed.map((t) => [t.id, 1])), run: r.run?.url ?? null };
}

/**
 * One check of a failure's targets at a commit (a confirming run, a bisect point, a culprit's parent): the
 * failing shards' failing test files (after a build, which nx's cache makes cheap), each through
 * tools/run-tests.sh, up to CONFIRM_RUNS times; it stops once decided() (a newly intermittent target failed, or no
 * target can fail every time), unless `full`. With
 * no shard named (another step failed), the whole gate, once.
 * ponytail: a non-test failure is judged by one run per point; five full gates per point would take hours.
 * @param ctx the context
 * @param commit the commit
 * @param job what to run
 * @param job.failing the failing shards, or null
 * @param job.targets targetsOf() (or the consistent ones)
 * @param job.slot which bisect worktree (1..width)
 * @param [job.full] run all CONFIRM_RUNS (a culprit's parent must pass every one)
 * @returns `{ runs, failed: { targetId: runs it failed } }`
 */
async function defaultCheck(ctx, commit, { failing, targets, slot, full }) {
    const name = `golden-bisect-${slot}`;
    const all = (n) => Object.fromEntries(targets.map((t) => [t.id, n]));
    if (!failing) return { runs: 1, failed: (await ctx.gate(ctx, commit, name)).code === 0 ? {} : all(1) };
    const dir = join(ctx.main, ".worktrees", name);
    prepareScratch(ctx, dir, commit);
    const log = join(ctx.main, `tmp/golden/verify-logs/bisect-${commit.slice(0, 10)}.log`);
    const opts = { cwd: dir, env: ctx.env, log };
    if ((await runLogged("pnpm", ["exec", "nx", "run-many", "-t", "build"], opts)).code !== 0)
        return { runs: 1, failed: all(1) };
    const { SHARDS } = await import(pathToFileURL(join(dir, "tools/ci-test-matrix.mjs")).href);
    const failed = {};
    let runs = 0;
    while (runs < CONFIRM_RUNS) {
        for (const id of await checkRound(ctx, { dir, opts, SHARDS, failing, targets }))
            failed[id] = (failed[id] ?? 0) + 1;
        runs++;
        if (!full && decided({ runs, failed }, targets)) break;
    }
    return { runs, failed };
}

// One counted run of every failing shard's targets: the ids it failed.
async function checkRound(ctx, { dir, opts, SHARDS, failing, targets }) {
    const ids = [];
    for (const shard of failing) {
        const target = targets.filter((t) => t.shard === shard);
        if (!target.length) continue;
        const entry = SHARDS.find((s) => s.shard === shard) ?? { shard };
        ids.push(...(await shardRun(ctx, { dir, opts, shard: entry, target })));
    }
    return ids;
}

/**
 * Which of a check's targets one run failed: none on exit 0; with no ledger record, or a target that is a whole
 * shard, every target (any failure counts); else those that failed here (the same test with the same key, or any
 * failure of a test that timed out). An empty list from a failed run says nothing about them.
 * @param code the run's exit code
 * @param rec its ledger record, or null
 * @param target the targets `{ id, file, name, key, status }`
 * @returns their ids
 */
export function failedTargets(code, rec, target) {
    if (code === 0) return [];
    if (!rec || target.some((t) => !t.file)) return target.map((t) => t.id);
    const hit = (t) =>
        rec.failures.some((f) => t.file === f.file && t.name === f.name && (t.key === f.key || t.status === "timeout"));
    return target.filter(hit).map((t) => t.id);
}

// One counted run of a shard's targets: a run that failed but none of them (another test, a killed run, a coverage
// error) is run once more, and then counts as passing them, never as failing.
async function shardRun(ctx, job) {
    for (let attempt = 0; ; attempt++) {
        const { code, rec } = await bisectRun(ctx, job);
        const ids = failedTargets(code, rec, job.target);
        if (code === 0 || ids.length || attempt > 0) return ids;
    }
}

// One run of a shard's failing files (the whole shard when none is known), recorded as a `bisect` invocation.
async function bisectRun(ctx, { dir, opts, shard, target }) {
    const files = [...new Set(target.map((t) => t.file).filter(Boolean))];
    const command = files.length && shard["test-command"] ? selectedCommand(dir, shard, files) : null;
    const runId = ledger?.newRunId(shard.shard) ?? "";
    const env = { ...ctx.env, TEST_LEDGER_RUN: runId, TEST_LEDGER_KIND: "bisect", TEST_LEDGER_BRANCH: ctx.branch };
    const startedAt = Date.now();
    const args = command ? ["--command", shard.shard, command] : [shard.shard];
    const r = await runLogged(join(dir, "tools/run-tests.sh"), args, { ...opts, env });
    const cmd = command ?? shard["test-command"];
    const facts = { shard: shard.shard, code: r.code, log: r.output, root: dir, runId, startedAt, env };
    Object.assign(facts, { runs: cmd ? expectedRuns(cmd) : 1, main: ctx.main, logFile: opts.log });
    Object.assign(facts, { selected: command ? files : null });
    return { code: r.code, rec: ledgerDo(ctx, (l) => l.record(facts)) };
}

// golden-verified on GitHub, which branches merge. No gate: the commit is on golden, gated and its LFS
// objects uploaded, so the hook would only run the gate over again.
function defaultPublishRef(ctx, commit) {
    const r = git(ctx, ctx.main, ["push", "--no-verify", "-q", "origin", `${commit}:refs/heads/${VERIFIED_REF}`], {
        ok: true,
    });
    if (r.status !== 0) console.error(`verify: could not move ${VERIFIED_REF} to ${short(commit)}: ${r.stderr}`);
}

// A pass can make the cut shippable: tools/land.mjs auto-ship ships it when its preview changes no image.
function defaultOnVerified(ctx) {
    const land = join(dirname(fileURLToPath(import.meta.url)), "land.mjs");
    const r = spawnSync(process.execPath, [land, "auto-ship"], { cwd: ctx.main, env: ctx.env, stdio: "inherit" });
    if (r.status !== 0) console.error(`verify: land.mjs auto-ship exited ${r.status ?? r.signal}`);
}

// ---------------------------------------------------------------- acting on a result

/**
 * Whether a Claude Code session is running: its session file names a pid whose start time matches.
 * @param session the session id
 * @returns true when it is
 */
function defaultSessionAlive(session) {
    const dir = join(homedir(), ".claude/sessions");
    for (const f of existsSync(dir) ? readdirSync(dir) : []) {
        try {
            const s = JSON.parse(readFileSync(join(dir, f), "utf8"));
            if (s.sessionId === session && procStart(s.pid) === String(s.procStart)) return true;
        } catch {
            // not a session file
        }
    }
    return false;
}

/**
 * Claims the newest failure for a session to act on (revert, comment). A claim of a live session is
 * left alone; one whose session is gone is taken over, and the line says so: check what it already did.
 * @param ctx the context
 * @param session the claiming session's id
 * @returns `{ ok, message }`
 */
export function claim(ctx, session) {
    return withState(ctx, (s) => {
        const last = s.last;
        if (!["failed", "handling"].includes(last?.status)) return { ok: false, message: "no failure to claim" };
        const held = last.handling;
        if (held && held.session !== session && ctx.sessionAlive(held.session)) {
            return { ok: false, message: `claimed by session ${held.session}, which is running` };
        }
        last.handling = { session, at: now(), ...(held && held.session !== session ? { tookOverFrom: held } : {}) };
        last.status = "handling";
        const took = held && held.session !== session;
        const note = took
            ? `; took it over from ${held.session}, which is gone: check for its revert on golden and its comments first`
            : "";
        return { ok: true, message: `claimed the failure of ${short(last.commit)}${note}` };
    });
}

/**
 * Marks the claimed failure handled (the culprit reverted, the issues told).
 * @param ctx the context
 * @returns one line
 */
export async function handled(ctx) {
    const done = await withState(ctx, (s) => {
        if (s.last?.status !== "handling") return null;
        s.last.status = "handled";
        s.last.handledAt = now();
        return s.last;
    });
    if (!done) return `nothing claimed to mark handled (last: ${readState(ctx).last?.status ?? "none"})`;
    closeIssues(ctx, done);
    return `the failure of ${short(done.commit)} is handled`;
}

// The issues already filed for a reverted culprit's failures are closed; a verification that still sees the
// failure reopens them.
function closeIssues(ctx, last) {
    if (!last.culprit) return;
    const sigs = new Set((last.tests ?? []).map((t) => t.signature));
    const numbers = ledgerDo(ctx, (l) => {
        const dir = join(l.ledgerDir(ctx.env, ctx.main), "issues");
        return [...sigs].map((s) => readJsonFile(join(dir, `${s}.json`))?.issue).filter((n) => n > 0);
    });
    for (const n of new Set(numbers ?? [])) {
        try {
            const body = `The culprit ${last.culprit.sha} was reverted; verification reopens this if golden still fails this way.`;
            ctx.gh(["issue", "close", String(n), "--comment", body]);
        } catch (e) {
            console.log(`verify: could not close #${n}: ${e.message.split("\n")[0]}`);
        }
    }
}

const readJsonFile = (p) => {
    try {
        return JSON.parse(readFileSync(p, "utf8"));
    } catch {
        return null;
    }
};

/**
 * Resolves once the state records a failure nobody claimed (at once when it already does).
 * @param ctx the context
 * @returns the state
 */
export function watch(ctx) {
    mkdirSync(dirname(ctx.stateFile), { recursive: true });
    return new Promise((resolve) => {
        const look = () => {
            const s = readState(ctx);
            if (s.last?.status !== "failed") return false;
            watcher.close();
            resolve(s);
            return true;
        };
        const watcher = watchDir(dirname(ctx.stateFile), (_e, f) => (!f || f === basename(ctx.stateFile)) && look());
        look();
    });
}

/**
 * The state in a few lines, for `status` here and in tools/land.mjs.
 * @param ctx the context
 * @returns the lines
 */
export function describe(ctx) {
    const s = readState(ctx);
    const lines = [`verification of ${ctx.branch}: verified ${short(s.verified)}, wanted ${short(s.wanted)}`];
    if (alive(s.run))
        lines.push(`  running: pid ${s.run.pid} since ${s.run.startedAt}, ${s.run.step} ${short(s.run.commit)}`);
    else if (s.run)
        lines.push(
            `  run DEAD: pid ${s.run.pid} stopped at ${s.run.step} ${short(s.run.commit)}; node tools/verify.mjs start`,
        );
    else lines.push("  running: none");
    if (s.superseded)
        lines.push(
            `  superseded: ${short(s.superseded.commit)} left for ${short(s.superseded.by)} at ${s.superseded.at}`,
        );
    if (s.stopped && !s.run)
        lines.push(
            `  stopped: pid ${s.stopped.pid} at ${s.stopped.step} ${short(s.stopped.commit)} on ${s.stopped.at}`,
        );
    if (s.last) lines.push(`  last: ${lastLine(s.last)}`);
    if (s.last?.captures) lines.push(`  screenshots: ${capturesLine(s.last.captures)}`);
    lines.push(...ciLines(ctx, s));
    return lines.join("\n");
}

// The backend, and what stops CI verification: no run created, CI unavailable.
function ciLines(ctx, s) {
    const backend = readJsonFile(ctx.backendFile)?.backend;
    const why = backend?.reason ? ` (${backend.reason}, since ${backend.at})` : "";
    const lines = [`  backend: ${backend?.name ?? DEFAULT_BACKEND + " (the default)"}${why}`];
    if (s.noRun) lines.push(`  no CI run created for ${short(s.noRun.commit)}, attempt ${s.noRun.attempt}`);
    if (s.ciUnavailable) {
        const tip = `origin/${ctx.branch}`;
        let n = "?";
        try {
            n = landMerges(ctx, s.verified ?? base(ctx, tip), tip).length;
        } catch {
            // no branch to count on
        }
        const { since, cause } = s.ciUnavailable;
        lines.push(`  CI verification unavailable since ${since}, ${n} landings unverified (${cause})`);
    }
    return lines;
}

function capturesLine(c) {
    const run = c.run ? ` (${c.run})` : "";
    if (c.clean) return `clean${run}`;
    const more = c.problems.length > 3 ? `, and ${c.problems.length - 3} more` : "";
    return `NOT clean, so never cut: ${c.problems.slice(0, 3).join("; ")}${more}${run}`;
}

// What a finished failure names: the culprit with its evidence, no landing, or intermittent.
function verdict(l) {
    if (l.culprit) {
        const { at, parent } = l.culprit.evidence ?? {};
        const before = parent?.verified
            ? "its parent is verified"
            : `its parent passed ${parent?.runs} of ${parent?.runs}`;
        const most = at ? Math.max(0, ...Object.values(at.failed)) : 0;
        const proof = at ? `: failed ${most} of ${at.runs} runs, ${before}` : "";
        const judged = l.culprit.evidence?.judgedBy ? ` (${l.culprit.evidence.judgedBy})` : "";
        return `culprit ${short(l.culprit.sha)} ${l.culprit.subject}${proof}${judged}`;
    }
    const how = l.confirm?.regressed?.length ? "is newly intermittent" : "fails every time";
    if (l.reproduced) return `${how} but no landing is to blame (${l.noLanding}): revert nothing, diagnose`;
    return "INTERMITTENT (passed in a confirming run, not quarantined): revert nothing, find the mechanism";
}

function lastLine(l) {
    const head = `${l.status} ${short(l.commit)} at ${l.at}`;
    if (l.status === "passed") return head;
    if (l.status === "ciCannotRun") return `${head}: verification: ${CUT_CI_VERIFIES}`;
    if (l.status === "failed-known") {
        const issues = [...new Set(Object.values(l.issues ?? {}))].map((n) => `#${n}`).join(", ");
        return `${head}: the same failures as the verification before (issues ${issues}), not bisected again; log ${l.log}`;
    }
    if (l.status === "confirming") return `${head}, confirming on the same commit; log ${l.log}`;
    if (l.status === "bisecting") {
        return `${head}, ${Object.keys(l.bisect.points).length} of ${l.bisect.candidates.length} landings tested (${l.failing?.join(", ") ?? "whole gate"}); log ${l.log}`;
    }
    if (l.status === "flaky") {
        const held = l.quarantined.map((q) => `${q.id} (#${q.issue})`).join(", ");
        return `${head}: intermittent, passed in a confirming run; quarantined, nothing to revert: ${held}; log ${l.log}`;
    }
    const culprit = verdict(l);
    const claim = l.handling ? `; claimed by ${l.handling.session}` : "";
    return `${head}: ${culprit}; failing ${l.failing?.join(", ") ?? "(not a test shard)"}; log ${l.log}${claim}`;
}

// ---------------------------------------------------------------- the command line

const USAGE =
    "usage: node tools/verify.mjs start [--again] | stop | status | claim --session <id> | handled | watch | run  [--branch golden|golden-cut]\n" +
    '       node tools/verify.mjs backend ci | backend local --reason "<why>"';

/**
 * Runs one command.
 * @param argv the arguments after the script
 * @param [overrides] context overrides (tests)
 * @returns the exit code
 */
export async function cli(argv, overrides = {}) {
    const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
    const branch = opt("--branch") ?? GOLDEN;
    if (![GOLDEN, CUT].includes(branch)) return usage();
    const ctx = verifyContext(process.cwd(), { branch, again: argv.includes("--again"), ...overrides });
    const commands = {
        start: async () => console.log(await start(ctx)),
        status: () => console.log(describe(ctx)),
        stop: async () => console.log(await stop(ctx)),
        run: () => run(ctx),
        handled: async () => console.log(await handled(ctx)),
        watch: async () => {
            await watch(ctx);
            console.log(describe(ctx));
        },
        backend: async () => {
            const r = await setBackend(ctx, argv[1], opt("--reason"));
            console.log(r.message);
            return r.ok ? 0 : 2;
        },
        claim: async () => {
            if (!opt("--session")) return usage();
            const r = await claim(ctx, opt("--session"));
            console.log(r.message);
            return r.ok ? 0 : 1;
        },
    };
    const command = commands[argv[0]];
    return command ? ((await command()) ?? 0) : usage();
}

function usage() {
    console.error(USAGE);
    return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    // Every session runs the live copy's verify.mjs, as with land.mjs; a run is started by a live copy
    // already, and its pid is the one the state records, so it never hands off.
    const self = fileURLToPath(import.meta.url);
    process.exitCode = (argv[0] === "run" ? null : await handOff(argv, process.env, self)) ?? (await cli(argv));
}
