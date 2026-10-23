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
// State: <main checkout>/tmp/golden/verify.json (golden) or verify-golden-cut.json, written under the
// verify lock (a lock directory beside it, held for milliseconds, separate from the landing lock) with a
// temporary file renamed over the old one:
//   verified   the newest commit that passed (golden's is also the ref golden-verified on GitHub)
//   wanted     the newest commit a landing asked for
//   run        the live run: { pid, pidStart, commit, from, step, startedAt }; a pid alone can be reused,
//              so a run is live only while that pid has the same start time (/proc/<pid>/stat)
//   last       the newest result: { commit, from, status, at, log, failing, bisect, culprit, reproduced,
//              handling }; status is passed, bisecting, failed, handling (a session claimed it) or handled
//
// A failure is bisected over the first-parent commits since the last verified one (the landing merges),
// re-running only the failing test shards when the gate names them (else the whole gate) at `width`
// points at once. The target itself is re-run first: a failure that does not come back is recorded as
// not reproduced, never called a flake. A failure that needs two landings fails first at the later one,
// which is the one named. Verification never reverts; the pipeline round does.

import { spawn, spawnSync } from "node:child_process";
import {
    closeSync,
    existsSync,
    mkdirSync,
    openSync,
    readdirSync,
    readFileSync,
    renameSync,
    watch as watchDir,
    writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { acquireLock, CUT, git, GOLDEN, handOff, mainCheckout, prepareScratch } from "./land.mjs";
import { expectedRuns } from "./shard-verdict.mjs";
import { selectedCommand } from "./test-select.mjs";

// The test ledger (design/ci/test-ledger.md): issues for failures on golden, known failures, the flaky bisect.
// Without it verification works as before.
const ledger = await import("./test-ledger.mjs").catch(() => null);

export const VERIFIED_REF = "golden-verified";
const QUIET = { pollMs: 20, waitLog: () => {}, onWait: () => {}, onQueue: () => {} };
const LAND_SUBJECT = /^land: (\S+)$/;

// ---------------------------------------------------------------- the context

/**
 * What a command works on; tests replace `gate`, `check`, `spawnRun`, `publishRef` and `sessionAlive`.
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
        lock: join(main, `tmp/golden/${name}.lock`),
        width: 2,
        gate: defaultGate,
        check: defaultCheck,
        spawnRun: defaultSpawnRun,
        publishRef: defaultPublishRef,
        sessionAlive: defaultSessionAlive,
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

const alive = (p) => Boolean(p?.pid) && procStart(p.pid) === p.pidStart;
const me = () => ({ pid: process.pid, pidStart: procStart(process.pid) });
const now = () => new Date().toISOString();
const short = (sha) => (sha ? sha.slice(0, 10) : "-");
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
        if (alive(s.run))
            return `verification of ${ctx.branch} is running (pid ${s.run.pid}); it goes on to ${short(commit)}`;
        return startLocked(ctx, s);
    });
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
    s.run = { pid, pidStart: procStart(pid), commit: null, step: "starting", startedAt: now() };
    const flag = ctx.branch === GOLDEN ? "" : " --branch " + ctx.branch;
    return `verification of ${ctx.branch} started (pid ${pid}; node tools/verify.mjs status${flag})`;
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
        const job = await withState(ctx, (s) => nextJob(ctx, s));
        if (!job) {
            ledgerDo(ctx, (l) => console.log(l.prune(ctx.env, ctx.main)));
            return 0;
        }
        if (job.bisect) await bisect(ctx);
        else if (job.target) await verifyCommit(ctx, job);
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
    if (s.last?.status === "bisecting") {
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
    s.run = { ...self, commit: target, from, step: "gate", startedAt: now() };
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
    const started = new Date().toISOString();
    const r = await ctx.gate(ctx, target);
    if (r.code === 0) {
        if (ctx.branch === GOLDEN) ctx.publishRef(ctx, target);
        await withState(ctx, (s) => {
            s.verified = target;
            s.last = { commit: target, from, status: "passed", at: now(), log: r.log };
            if (s.run) s.run.step = "passed";
        });
        return;
    }
    const failing = failingShards(r.output, await shardNames(ctx));
    const candidates = git(ctx, ctx.main, [
        "rev-list",
        "--first-parent",
        "--reverse",
        from ? `${from}..${target}` : target,
    ]).split("\n");
    const facts = failing && ledgerDo(ctx, (l) => gateFacts(ctx, l, target, from, started));
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
            status: again ? "failed-known" : "bisecting",
            at: now(),
            log: r.log,
            failing,
            pairs: facts?.pairs,
            tests: facts?.tests,
            issues,
            flaky: facts?.flaky,
            bisect: { candidates, points: {} },
            handling,
        };
        // a live claim stays a claim: its session's `handled` must still find it
        if (again && handling) Object.assign(s.last, { status: "handling", known: true });
        if (s.run) s.run.step = again ? "failed-known" : "bisect";
    });
    if (!again) await bisect(ctx);
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
 * What the ledger recorded of this verification's gate: its failures, their (test, key) pairs, and for each shard
 * whose failing tests are all flaky and none broken, the bad threshold of its bisect (design/ci/test-ledger.md 5.3).
 * No issue is filed here: a failure the bisect pins on a landing is reverted, not tracked.
 * @param ctx the context
 * @param l the ledger module
 * @param target the commit
 * @param from the last verified commit
 * @param started when the gate started
 * @returns `{ outcomes, tests, pairs, flaky, prev, passed }`, or null when the ledger is unavailable
 */
function gateFacts(ctx, l, target, from, started) {
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
    const chain = git(ctx, ctx.main, ["rev-list", "--first-parent", "-n", "200", target]).split("\n");
    const before = from ? new Date(git(ctx, ctx.main, ["log", "-1", "--format=%cI", from])).toISOString() : undefined;
    const flaky = {};
    for (const shard of new Set(failures.map((f) => f.shard))) {
        const tests = failures.filter((f) => f.shard === shard);
        const c = tests.map((f) => l.classify(db, f.file, f.name, f.family, chain, before));
        if (c.every((x) => x.flaky && !x.broken))
            flaky[shard] = { threshold: l.badThreshold(Math.max(...c.map((x) => x.rate))) };
    }
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
    return { outcomes, tests: failures, pairs, flaky, prev, passed };
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

/**
 * The bisect's bounds from the points tested: `bad`, the first candidate that failed (null until one
 * did), and `good`, the last candidate before it that passed (-1: the last verified commit).
 * @param b the bisect record (`candidates`, `points`: sha -> "good" | "bad")
 * @returns `{ good, bad }`, indices into the candidates
 */
export function bounds(b) {
    const bad = b.candidates.findIndex((c) => b.points[c] === "bad");
    const upTo = bad === -1 ? b.candidates.length : bad;
    let good = -1;
    for (let i = 0; i < upTo; i++) if (b.points[b.candidates[i]] === "good") good = i;
    return { good, bad: bad === -1 ? null : bad };
}

/**
 * The next points to test, at most `width`: the target first, until it has been re-run, then points
 * spread evenly between the bounds.
 * @param b the bisect record
 * @param width how many at once
 * @returns candidate indices
 */
export function nextPoints(b, width) {
    const last = b.candidates.length - 1;
    const { good, bad } = bounds(b);
    const hi = bad ?? last;
    const picks = b.points[b.candidates[last]] ? [] : [last];
    const room = width - picks.length;
    for (let k = 1; k <= room; k++) {
        const i = good + Math.round((k * (hi - good)) / (room + 1));
        if (i > good && i < hi && !b.points[b.candidates[i]] && !picks.includes(i)) picks.push(i);
    }
    return picks;
}

async function bisect(ctx) {
    for (;;) {
        const b = readState(ctx).last.bisect;
        const { good, bad } = bounds(b);
        const targetPassed = b.points[b.candidates.at(-1)] === "good";
        if (targetPassed || (bad !== null && bad - good === 1)) return finishBisect(ctx, targetPassed ? null : bad);
        const picks = nextPoints(b, ctx.width);
        const failing = readState(ctx).last.failing;
        const results = await Promise.all(picks.map((i, slot) => ctx.check(ctx, b.candidates[i], failing, slot + 1)));
        await withState(ctx, (s) => {
            picks.forEach((i, k) => (s.last.bisect.points[b.candidates[i]] = results[k] ? "good" : "bad"));
        });
    }
}

async function finishBisect(ctx, bad) {
    const last = readState(ctx).last;
    const tests = last.tests ?? [];
    // Not reproduced: a failure golden still has now and then, which gets its issue. A culprit is reverted; the
    // issues a land check already filed for these failures are told who it is.
    const issues =
        bad === null && tests.length ? ledgerDo(ctx, (l) => fileFor(ctx, l, tests, last.commit, last.log)) : null;
    return withState(ctx, (s) => {
        const sha = bad === null ? null : s.last.bisect.candidates[bad];
        const subject = sha ? git(ctx, ctx.main, ["log", "-1", "--format=%s", sha]) : null;
        s.last.culprit = sha ? { sha, subject, branch: LAND_SUBJECT.exec(subject)?.[1] ?? null } : null;
        if (issues) s.last.issues = issues;
        const sigs = tests.map((t) => t.signature);
        if (sha && sigs.length)
            ledgerDo(ctx, (l) => l.noteCulprit(l.ledgerDir(ctx.env, ctx.main), sigs, s.last.culprit, ctx.gh));
        s.last.reproduced = sha !== null;
        s.last.status = s.last.handling ? "handling" : "failed";
        if (s.run) s.run.step = "failed";
    });
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
 * The full gate on a commit: tools/prepush.sh with every package and every shard (PREPUSH_ALL=1; passes
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
async function defaultGate(ctx, commit, name = `golden-verify${ctx.branch === GOLDEN ? "" : "-cut"}`) {
    const dir = join(ctx.main, ".worktrees", name);
    prepareScratch(ctx, dir, commit);
    const log = join(ctx.main, `tmp/golden/verify-logs/${commit.slice(0, 10)}-${Date.now()}.log`);
    // PUSH_QUEUE_RETRY: a commit verification is asked to run again is run, not refused for its last failure.
    const env = {
        ...ctx.env,
        TEST_LEDGER_KIND: name.startsWith("golden-bisect") ? "bisect" : "verify",
        TEST_LEDGER_BRANCH: ctx.branch,
        PREPUSH_ALL: "1",
        PUSH_BASE_REF: "origin/master",
        PUSH_QUEUE_PRIORITY: "critical",
        PUSH_QUEUE_RETRY: "1",
    };
    const push = ["git", "push", "--dry-run", "origin", `HEAD:refs/heads/${ctx.branch}-verified`];
    console.log(`verify: the full gate on ${short(commit)} in ${dir} (log: ${log})`);
    return { ...(await runLogged(join(dir, "tools/push-queue.sh"), push, { cwd: dir, env, log })), log };
}

/**
 * One bisect point: the failing shards again (after a build, which nx's cache makes cheap), each through
 * tools/run-tests.sh as CI runs it; with no shards named, the whole gate.
 * @param ctx the context
 * @param commit the point
 * @param failing the failing shards, or null
 * @param slot which bisect worktree (1..width)
 * @returns true when it passed
 */
async function defaultCheck(ctx, commit, failing, slot) {
    const name = `golden-bisect-${slot}`;
    if (!failing) return (await ctx.gate(ctx, commit, name)).code === 0;
    const dir = join(ctx.main, ".worktrees", name);
    prepareScratch(ctx, dir, commit);
    const log = join(ctx.main, `tmp/golden/verify-logs/bisect-${commit.slice(0, 10)}.log`);
    const opts = { cwd: dir, env: ctx.env, log };
    if ((await runLogged("pnpm", ["exec", "nx", "run-many", "-t", "build"], opts)).code !== 0) return false;
    const { SHARDS } = await import(pathToFileURL(join(dir, "tools/ci-test-matrix.mjs")).href);
    const { flaky = {}, tests = [] } = readState(ctx).last ?? {};
    for (const shard of failing) {
        const entry = SHARDS.find((s) => s.shard === shard) ?? { shard };
        const target = tests.filter((t) => t.shard === shard);
        if (!(await checkShard(ctx, { dir, opts, shard: entry, plan: flaky[shard], target }))) return false;
    }
    return true;
}

/**
 * One bisect run's verdict on the failures verification saw: `bad` when one of them fails here (the same test
 * with the same key, or any failure of a test that timed out), `pass` on exit 0, else `unknown` (another test, a
 * killed run, a coverage error), which is never counted as bad. With no failures known (the ledger had none), any
 * failure is bad.
 * @param code the run's exit code
 * @param rec its ledger record, or null
 * @param target the failures `{ file, name, key, status }`
 * @returns pass, bad or unknown
 */
export function pointVerdict(code, rec, target) {
    if (code === 0) return "pass";
    if (!target.length || !rec) return "bad";
    const hit = (f) =>
        target.some((t) => t.file === f.file && t.name === f.name && (t.key === f.key || t.status === "timeout"));
    return rec.failures.some(hit) ? "bad" : "unknown";
}

/**
 * One shard at one bisect point, each run recorded as a `bisect` invocation. A run that says nothing about the
 * failures verification saw (pointVerdict `unknown`) is run once more and never counted as bad. A shard whose
 * failing tests are all flaky runs only their files, up to 10 times, and is bad once they fail `plan.threshold`
 * times (design 5.3); it stops as soon as the answer is settled either way.
 * @param ctx the context
 * @param job what to run
 * @param job.dir the bisect worktree
 * @param job.opts runLogged's options
 * @param job.shard the SHARDS entry
 * @param job.plan `{ threshold }` for a flaky shard, else undefined
 * @param job.target the failures verification saw in this shard
 * @returns true when it passed
 */
async function checkShard(ctx, { dir, opts, shard, plan, target }) {
    const files = [...new Set(target.map((t) => t.file))];
    const command = plan && shard["test-command"] ? selectedCommand(dir, shard, files) : null;
    const n = plan ? 10 : 1;
    const threshold = plan?.threshold ?? 1;
    let hits = 0;
    let runs = 0;
    let retried = false;
    while (runs < n) {
        const verdict = await bisectRun(ctx, { dir, opts, shard, target, command, files });
        if (verdict === "unknown" && !retried) {
            retried = true;
            continue;
        }
        runs++;
        if (verdict === "bad") hits++;
        if (hits >= threshold) return false;
        if (hits + (n - runs) < threshold) return true;
    }
    return true;
}

// One run of a shard (or of `command`, its failing files) at a bisect point, recorded; its pointVerdict.
async function bisectRun(ctx, { dir, opts, shard, target, command, files }) {
    const runId = ledger?.newRunId(shard.shard) ?? "";
    const env = { ...ctx.env, TEST_LEDGER_RUN: runId, TEST_LEDGER_KIND: "bisect", TEST_LEDGER_BRANCH: ctx.branch };
    const startedAt = Date.now();
    const args = command ? ["--command", shard.shard, command] : [shard.shard];
    const r = await runLogged(join(dir, "tools/run-tests.sh"), args, { ...opts, env });
    const cmd = command ?? shard["test-command"];
    const facts = { shard: shard.shard, code: r.code, log: r.output, root: dir, runId, startedAt, env };
    Object.assign(facts, { runs: cmd ? expectedRuns(cmd) : 1, main: ctx.main, logFile: opts.log });
    Object.assign(facts, { selected: command ? files : null });
    return pointVerdict(
        r.code,
        ledgerDo(ctx, (l) => l.record(facts)),
        target,
    );
}

// golden-verified on GitHub, which branches merge. No gate: the commit is on golden, gated and its LFS
// objects uploaded, so the hook would only run the gate over again.
function defaultPublishRef(ctx, commit) {
    const r = git(ctx, ctx.main, ["push", "--no-verify", "-q", "origin", `${commit}:refs/heads/${VERIFIED_REF}`], {
        ok: true,
    });
    if (r.status !== 0) console.error(`verify: could not move ${VERIFIED_REF} to ${short(commit)}: ${r.stderr}`);
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
    if (s.last) lines.push(`  last: ${lastLine(s.last)}`);
    return lines.join("\n");
}

function lastLine(l) {
    const head = `${l.status} ${short(l.commit)} at ${l.at}`;
    if (l.status === "passed") return head;
    if (l.status === "failed-known") {
        const issues = [...new Set(Object.values(l.issues ?? {}))].map((n) => `#${n}`).join(", ");
        return `${head}: the same failures as the verification before (issues ${issues}), not bisected again; log ${l.log}`;
    }
    if (l.status === "bisecting") {
        return `${head}, ${Object.keys(l.bisect.points).length} of ${l.bisect.candidates.length} points tested (${l.failing?.join(", ") ?? "whole gate"}); log ${l.log}`;
    }
    const culprit = l.culprit
        ? `culprit ${short(l.culprit.sha)} ${l.culprit.subject}`
        : "NOT REPRODUCED when re-run: find the mechanism, never call it a flake";
    const claim = l.handling ? `; claimed by ${l.handling.session}` : "";
    return `${head}: ${culprit}; failing ${l.failing?.join(", ") ?? "(not a test shard)"}; log ${l.log}${claim}`;
}

// ---------------------------------------------------------------- the command line

const USAGE =
    "usage: node tools/verify.mjs start [--again] | status | claim --session <id> | handled | watch | run  [--branch golden|golden-cut]";

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
        run: () => run(ctx),
        handled: async () => console.log(await handled(ctx)),
        watch: async () => {
            await watch(ctx);
            console.log(describe(ctx));
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
