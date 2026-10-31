// Tests of tools/verify.mjs on a throwaway repository: a bare "origin" whose golden gets "land: <branch>"
// merges, a fake gate and a fake narrow check that fail when a commit holds bad.txt (or both x.txt and
// y.txt), and runs started in this process instead of detached.
//
//   node tools/verify.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
    chmodSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";
import { failureHashes, newRunId, rebuild, writeRecord } from "./test-ledger.mjs";
import {
    backendOf,
    bounds,
    captureChanges,
    captureProblems,
    brokerVerdict,
    ciGate,
    claim,
    CONFIRM_RUNS,
    decided,
    failedTargets,
    failingShards,
    handled,
    MAX_SWITCHES,
    nextPoints,
    readState,
    describe as describeState,
    requestVerification,
    run,
    setBackend,
    start,
    stop,
    verifyContext,
    watch,
    withState,
} from "./verify.mjs";

const dir = mkdtempSync(join(tmpdir(), "verify-"));
process.env.PIPELINE_WAIT_LOG = join(dir, "waits.jsonl");
const repo = join(dir, "main");
const env = isolatedGitEnv();
after(() => rmSync(dir, { recursive: true, force: true }));

const git = (cwd, ...args) => {
    const r = spawnSync("git", args, { cwd, env, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}${r.stdout}`);
    return r.stdout.trim();
};
const has = (sha, file) => spawnSync("git", ["cat-file", "-e", `${sha}:${file}`], { cwd: repo, env }).status === 0;
const broken = (sha) => has(sha, "bad.txt") || has(sha, "sync.txt") || (has(sha, "x.txt") && has(sha, "y.txt"));

/**
 * Lands a branch on golden the way tools/land.mjs does: one commit on a branch, merged with --no-ff as
 * "land: <name>", pushed.
 * @param name the branch
 * @param files what its commit writes
 * @returns golden's new tip
 */
const land = (name, files) => {
    git(repo, "checkout", "-q", "-b", name, "golden");
    for (const [f, text] of Object.entries(files)) writeFileSync(join(repo, f), text);
    git(repo, "add", ".");
    git(repo, "commit", "-q", "-m", `feat: ${name}`);
    git(repo, "checkout", "-q", "golden");
    git(repo, "merge", "-q", "--no-ff", "-m", `land: ${name}`, name);
    git(repo, "push", "-q", "origin", "golden");
    return git(repo, "rev-parse", "HEAD");
};

let gated; // the commits the full gate ran on
let checked; // the bisect points
let flaky; // commits whose full gate fails once although nothing is broken
let hold; // when set, the gate waits for this promise
let checkHold; // when set, a check (a confirming run, a bisect point) waits for this promise
let checkStarted;
let gateStarted;
let concurrent;
let most;
let published;
let onVerified; // each [branch, commit] a pass told auto-ship about
let runs;
let ctx;

/**
 * A check as the real one counts it: up to CONFIRM_RUNS runs of `targets`, stopping once decided() (unless `full`).
 * @param targets the targets
 * @param full run them all
 * @param fails `(run) => boolean`, whether run k (from 1) fails every target
 * @returns `{ runs, failed }`
 */
const judge = (targets, full, fails) => {
    const failed = {};
    let runs = 0;
    while (runs < CONFIRM_RUNS) {
        runs++;
        if (fails(runs)) for (const t of targets) failed[t.id] = (failed[t.id] ?? 0) + 1;
        if (!full && decided({ runs, failed }, targets)) break;
    }
    return { runs, failed };
};

const fake = {
    gate: async (c, sha, name = "golden-verify") => {
        gated.push(sha);
        gateStarted?.();
        if (hold) await hold;
        // As tools/prepush-tests.mjs at its next shard boundary, in the full gate only.
        if (!name.startsWith("golden-bisect") && existsSync(c.supersededFile)) {
            return { code: 1, output: "  [SUPERSEDED] a newer commit is wanted", log: `log-${sha.slice(0, 7)}` };
        }
        const fail = broken(sha) || flaky.delete(sha);
        return {
            code: fail ? 1 : 0,
            output: fail ? "  [FAIL] s1 (exit 1, 3s); the end of x.log\n[FAIL] Tests (the CI shards)" : "",
            log: `log-${sha.slice(0, 7)}`,
        };
    },
    check: async (_c, sha, { failing, targets, full }) => {
        assert.deepEqual(failing, ["s1"], "only the failing shard runs again");
        checked.push(sha);
        checkStarted?.();
        if (checkHold) await checkHold;
        most = Math.max(most, ++concurrent);
        await new Promise((r) => setImmediate(r));
        concurrent--;
        return judge(targets, full, () => broken(sha));
    },
    spawnRun: (c) => {
        runs.push(Promise.resolve().then(() => run(c)));
        return process.pid;
    },
    publishRef: (_c, sha) => published.push(sha),
    onVerified: (c, sha) => onVerified.push([c.branch, sha]),
    shards: ["s1", "s2"],
};
const settle = async () => {
    while (runs.length) await runs.shift();
};

before(() => {
    git(dir, "init", "-q", "--bare", "-b", "master", "origin.git");
    git(dir, "clone", "-q", join(dir, "origin.git"), "main");
    writeFileSync(join(repo, ".gitignore"), "tmp/\n");
    writeFileSync(join(repo, "a.txt"), "a\n");
    git(repo, "add", ".");
    git(repo, "commit", "-q", "-m", "base");
    git(repo, "push", "-q", "origin", "master");
    git(repo, "checkout", "-q", "-b", "golden");
    git(repo, "push", "-q", "origin", "golden");
    ctx = verifyContext(repo, { env, ...fake });
});

beforeEach(() => {
    gated = [];
    checked = [];
    flaky = new Set();
    hold = null;
    gateStarted = null;
    checkHold = null;
    checkStarted = null;
    concurrent = 0;
    most = 0;
    published = [];
    onVerified = [];
    runs = [];
});

describe("a run", () => {
    it("starts on a landing, verifies golden's tip, moves golden-verified and ends", async () => {
        const tip = land("a1", { "a1.txt": "1\n" });
        assert.match(await requestVerification(ctx, tip), /verification of golden started/);
        await settle();
        const s = readState(ctx);
        assert.deepEqual(gated, [tip]);
        assert.deepEqual(published, [tip]);
        assert.equal(s.verified, tip);
        assert.equal(s.last.status, "passed");
        assert.equal(s.run, null, "the run marked itself ended");
        assert.deepEqual(onVerified, [["golden", tip]], "the pass is told to auto-ship once");
    });

    it("leaves a commit a newer landing supersedes at the next shard boundary, records it, and goes on", async () => {
        let release;
        hold = new Promise((r) => (release = r));
        const started = new Promise((r) => (gateStarted = r));
        const first = land("a2", { "a2.txt": "2\n" });
        await requestVerification(ctx, first);
        await started;
        const second = land("a3", { "a3.txt": "3\n" });
        const said = await requestVerification(ctx, second);
        assert.match(said, new RegExp(`leaves ${first.slice(0, 10)} at its next test shard and goes on to`));
        assert.equal(runs.length, 1, "no second run");
        hold = null;
        release();
        await settle();
        const s = readState(ctx);
        assert.deepEqual(gated, [first, second], "the newer commit's gate, in the same run");
        assert.equal(s.superseded.commit, first);
        assert.equal(s.superseded.by, second);
        assert.deepEqual(published, [second], "the superseded commit is neither passed...");
        assert.equal(s.last.status, "passed");
        assert.equal(s.last.commit, second, "...nor failed");
        assert.equal(s.verified, second);
        assert.ok(!existsSync(ctx.supersededFile), "the next gate starts without the marker");
    });

    it("bisects a failure to the landing that broke it, re-running only the failing shard, two points at once", async () => {
        const verified = readState(ctx).verified;
        land("b1", { "b1.txt": "1\n" });
        const culprit = land("b2", { "bad.txt": "x\n" });
        land("b3", { "b3.txt": "3\n" });
        const tip = land("b4", { "b4.txt": "4\n" });
        await requestVerification(ctx, tip);
        await settle();
        const s = readState(ctx);
        assert.equal(s.last.status, "failed");
        assert.equal(s.last.commit, tip);
        assert.equal(s.last.from, verified);
        assert.equal(s.last.culprit.sha, culprit);
        assert.equal(s.last.culprit.branch, "b2");
        assert.equal(s.last.reproduced, true);
        assert.deepEqual(s.last.failing, ["s1"]);
        assert.equal(checked[0], tip, "the failure is confirmed on the commit that failed first");
        assert.equal(s.last.confirm.runs, CONFIRM_RUNS, "confirmed by failing every one of its runs");
        assert.equal(s.last.culprit.evidence.at.runs, CONFIRM_RUNS, "the culprit failed every run");
        assert.deepEqual(s.last.culprit.evidence.parent.failed, {}, "and its parent passed every run");
        assert.equal(s.last.culprit.evidence.parent.runs, CONFIRM_RUNS);
        assert.equal(most, 2, "two points at a time");
        assert.equal(s.verified, verified, "golden-verified did not move");
        assert.deepEqual(published, []);
        assert.equal(s.run, null);
    });

    it("does not verify a failed commit again unless asked to; the revert's landing starts a run that passes", async () => {
        assert.match(await start(ctx), /started/);
        await settle();
        assert.deepEqual(gated, [], "the failed tip is not verified again by itself");
        git(repo, "revert", "--no-edit", "-m", "1", readState(ctx).last.culprit.sha);
        git(repo, "push", "-q", "origin", "golden");
        const tip = git(repo, "rev-parse", "HEAD");
        await requestVerification(ctx, tip);
        await settle();
        assert.deepEqual(gated, [tip]);
        assert.equal(readState(ctx).verified, tip);
    });

    it("names the later of two landings a failure needs", async () => {
        land("c1", { "x.txt": "x\n" });
        land("c2", { "c2.txt": "2\n" });
        const later = land("c3", { "y.txt": "y\n" });
        const tip = land("c4", { "c4.txt": "4\n" });
        await requestVerification(ctx, tip);
        await settle();
        assert.equal(readState(ctx).last.culprit.sha, later);
        git(repo, "revert", "--no-edit", "-m", "1", later);
        git(repo, "push", "-q", "origin", "golden");
        await requestVerification(ctx, git(repo, "rev-parse", "HEAD"));
        await settle();
        assert.equal(readState(ctx).last.status, "passed");
    });

    it("records a failure that passes a confirming run as not reproduced, bisects and blames nothing", async () => {
        const tip = land("d1", { "d1.txt": "1\n" });
        flaky.add(tip);
        await requestVerification(ctx, tip);
        await settle();
        const s = readState(ctx);
        assert.equal(s.last.status, "failed");
        assert.equal(s.last.reproduced, false);
        assert.equal(s.last.culprit, null);
        assert.deepEqual(checked, [tip]);
        gated = [];
        assert.match(await start({ ...ctx, again: true }), /started/);
        await settle();
        assert.deepEqual(gated, [tip]);
        assert.equal(readState(ctx).verified, tip);
    });
});

describe("landings faster than a run", () => {
    it("never starve it: after MAX_SWITCHES switches it finishes its commit, and golden-verified moves", async () => {
        const tips = [land("t0", { "t0.txt": "0\n" })];
        // Every gate start brings a new landing before the gate reaches its shard boundary, six times.
        gateStarted = () => {
            if (tips.length > 6) return void (hold = null);
            const n = tips.length;
            tips.push(land(`t${n}`, { [`t${n}.txt`]: `${n}\n` }));
            hold = requestVerification(ctx, tips.at(-1));
        };
        await requestVerification(ctx, tips[0]);
        await settle();
        assert.equal(MAX_SWITCHES, 2);
        assert.equal(published[0], tips[2], "two switches, then the third commit is finished and verified");
        assert.equal(published.at(-1), tips.at(-1), "and the run still ends on the newest");
        assert.equal(readState(ctx).verified, tips.at(-1));
        assert.ok(gated.length < tips.length * 2, "each commit's gate ran at most once");
    });
});

describe("a confirming run and a bisect", () => {
    it("are never superseded: the run finishes the bisect on its commit, then goes on to the newer one", async () => {
        const verified = readState(ctx).verified;
        land("g1", { "g1.txt": "1\n" });
        const culprit = land("g2", { "bad.txt": "g\n" });
        const tip = land("g3", { "g3.txt": "3\n" });
        let release;
        checkHold = new Promise((r) => (release = r));
        const confirming = new Promise((r) => (checkStarted = r));
        await requestVerification(ctx, tip);
        await confirming;
        assert.equal(readState(ctx).run.step, "confirm");
        git(repo, "revert", "--no-edit", "-m", "1", culprit);
        git(repo, "push", "-q", "origin", "golden");
        const fixed = git(repo, "rev-parse", "HEAD");
        assert.match(await requestVerification(ctx, fixed), /it goes on to/);
        assert.ok(!existsSync(ctx.supersededFile), "no marker for a confirming run");
        // The newer commit's gate starts only after the bisect ended: look at the state there.
        let atNext;
        gateStarted = () => (atNext = readState(ctx));
        checkHold = null;
        release();
        await settle();
        assert.equal(atNext.last.commit, tip);
        assert.equal(atNext.last.status, "failed");
        assert.equal(atNext.last.culprit.sha, culprit, "the bisect ran to its end on the failing commit");
        assert.equal(atNext.last.from, verified);
        assert.notEqual(atNext.superseded?.commit, tip, "a bisected commit is never recorded as superseded");
        assert.deepEqual(gated, [tip, fixed]);
        assert.equal(readState(ctx).verified, fixed);
    });
});

describe("stopping a run", () => {
    // A run as `start` makes one: detached, so it leads a process group, with a child of its own (the gate). Its
    // stdout closes only when both are gone.
    const liveRun = async () => {
        const { spawn } = await import("node:child_process");
        const { once } = await import("node:events");
        const leader = spawn("sh", ["-c", "sleep 600 & echo $!; wait"], {
            detached: true,
            stdio: ["ignore", "pipe", "ignore"],
        });
        const [pid] = await once(leader.stdout, "data");
        return { leader, gate: Number(pid), closed: once(leader.stdout, "end") };
    };
    const procStartOf = (pid) => {
        const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
        return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19];
    };
    // Whether a process is gone or on its way out. The pipe ends when the process closes its files in the kernel's
    // exit path, which is BEFORE it becomes a zombie: in between, /proc shows it running (state R), with
    // PF_EXITING (0x4) set in its flags since the start of that path. So "exiting" is the flag, not the state.
    const dying = (pid) => {
        let stat;
        try {
            stat = readFileSync(`/proc/${pid}/stat`, "utf8");
        } catch {
            return true; // gone, and reaped
        }
        const [state, , , , , , flags] = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
        return state === "Z" || state === "X" || (Number(flags) & 0x4) !== 0;
    };

    it("stops a live run's whole process group, records it stopped, and start resumes it", async () => {
        const { leader, gate, closed } = await liveRun();
        const tip = git(repo, "rev-parse", "origin/golden");
        await withState(ctx, (s) => {
            s.run = { pid: leader.pid, pidStart: procStartOf(leader.pid), pgid: leader.pid, commit: tip, step: "gate" };
        });
        assert.match(describeState(ctx), /running: pid/);
        const line = await stop(ctx);
        assert.match(
            line,
            new RegExp(`run pid ${leader.pid} at gate .*stopped \\(SIGTERM to process group ${leader.pid}\\)`),
        );
        await closed; // the run and its gate are both exiting: nobody holds the pipe any more
        assert.equal(dying(gate), true, "the gate got the SIGTERM and is exiting or gone");
        const s = readState(ctx);
        assert.equal(s.run, null);
        assert.deepEqual([s.stopped.pid, s.stopped.step, s.stopped.commit], [leader.pid, "gate", tip]);
        assert.match(describeState(ctx), new RegExp(`stopped: pid ${leader.pid} at gate`));
        assert.match(await start(ctx), /started/, "start resumes it");
        await settle();
        assert.equal(readState(ctx).run, null, "the resumed run ended");
    });

    it("clears a run whose process is gone, which status flags as dead", async () => {
        const dead = spawnSync(process.execPath, ["-e", ""]).pid;
        await withState(ctx, (s) => {
            s.run = { pid: dead, pidStart: "1", commit: null, step: "gate" };
        });
        assert.match(describeState(ctx), new RegExp(`run DEAD: pid ${dead} stopped at gate`));
        assert.match(await stop(ctx), /was already gone; cleared/);
        assert.equal(readState(ctx).run, null);
        assert.match(await stop(ctx), /no run to stop/);
    });
});

describe("the watchdog's side", () => {
    const deadPid = () => spawnSync(process.execPath, ["-e", ""]).pid;

    it("restarts a dead run and resumes its bisect from the points it recorded", async () => {
        const from = readState(ctx).verified;
        land("e1", { "e1.txt": "1\n" });
        land("e2", { "e2.txt": "2\n" });
        const culprit = land("e3", { "bad.txt": "e\n" });
        const tip = land("e4", { "e4.txt": "4\n" });
        const candidates = git(repo, "rev-list", "--first-parent", "--reverse", `${from}..${tip}`).split("\n");
        await withState(ctx, (s) => {
            s.run = { pid: deadPid(), pidStart: "1", commit: tip, from, step: "bisect" };
            s.last = {
                commit: tip,
                from,
                status: "bisecting",
                failing: ["s1"],
                confirm: { runs: 5, failed: { "s1: the whole shard": 5 }, consistent: ["s1: the whole shard"] },
                bisect: { candidates, points: { [candidates[3]]: "bad", [candidates[1]]: "good" }, evidence: {} },
            };
        });
        assert.match(await start(ctx), /started/);
        await settle();
        assert.deepEqual(
            checked,
            [candidates[2], candidates[1]],
            "the point between the recorded ones, then its parent",
        );
        assert.deepEqual(gated, []);
        assert.equal(readState(ctx).last.culprit.sha, culprit);
    });

    it("claims a failure for one live session, lets a second take it over only once the first is gone", async () => {
        const live = new Set(["s-1"]);
        const c = { ...ctx, sessionAlive: (s) => live.has(s) };
        assert.equal((await claim(c, "s-1")).ok, true);
        const second = await claim(c, "s-2");
        assert.equal(second.ok, false);
        assert.match(second.message, /claimed by session s-1, which is running/);
        live.delete("s-1");
        const taken = await claim(c, "s-2");
        assert.equal(taken.ok, true);
        assert.match(taken.message, /took it over from s-1/);
        assert.equal(readState(c).last.handling.tookOverFrom.session, "s-1");
        assert.match(await handled(c), /is handled/);
        assert.equal(readState(c).last.status, "handled");
        assert.equal((await claim(c, "s-3")).ok, false, "nothing left to claim");
    });

    it("watch returns once a failure is recorded", async () => {
        let seen = null;
        const watching = watch(ctx).then((s) => (seen = s));
        await new Promise((r) => setImmediate(r));
        assert.equal(seen, null, "a handled failure does not wake it");
        await withState(ctx, (s) => (s.last = { commit: "f", status: "failed", culprit: null }));
        await watching;
        assert.equal(seen.last.status, "failed");
        await withState(ctx, (s) => (s.last.status = "handled"));
    });
});

describe("with the test ledger", () => {
    it("files no issue for a failure it pins on a landing, then one when the same failures come back", async () => {
        const ledgerDir = join(dir, "ledger");
        const filed = [];
        const gh = (args) => {
            if (args[1] === "create") filed.push(args);
            return { create: "https://github.com/o/r/issues/5", list: "[]" }[args[1]] ?? "";
        };
        const fails = (sha) => has(sha, "k.txt");
        const failure = { file: "p/a.test.ts", name: "a > b", ...failureHashes("Error: known", "p/a.test.ts") };
        const rec = { v: 1, kind: "verify", branch: "golden", base: null, dirty: false, shard: "s1", family: "s1" };
        Object.assign(rec, { variant: "s1", selected: null, outcome: "failed", reused_from: null, secs: 1, log: null });
        Object.assign(rec, { files: [["p/a.test.ts", 1, 1, 0, 1, 0]], failures: [failure], exonerations: [] });
        const gate = async (_c, sha) => {
            gated.push(sha);
            if (!fails(sha)) return { code: 0, output: "", log: "l" };
            const at = new Date().toISOString();
            writeRecord(ledgerDir, { ...rec, id: newRunId("s1"), commit: sha, tree: sha, started_at: at });
            return { code: 1, output: "  [FAIL] s1 (exit 1, 3s)\n[FAIL] Tests (x)", log: `log-${sha.slice(0, 7)}` };
        };
        const check = async (_c, sha, { targets, full }) => (checked.push(sha), judge(targets, full, () => fails(sha)));
        const files = { stateFile: join(dir, "ledger-verify.json"), lock: join(dir, "ledger-verify.lock") };
        const c = verifyContext(repo, {
            env: { ...env, TEST_LEDGER_DIR: ledgerDir },
            ...fake,
            gate,
            check,
            gh,
            ...files,
        });
        const culprit = land("k1", { "k.txt": "k\n" });
        await requestVerification(c, culprit);
        await settle();
        assert.equal(readState(c).last.culprit.sha, culprit);
        assert.equal(filed.length, 0, "a culprit is reverted, not tracked");
        checked = [];
        await requestVerification(c, land("k2", { "k2.txt": "2\n" }));
        await settle();
        assert.equal(readState(c).last.status, "failed-known");
        assert.deepEqual(checked, [], "not bisected again");
        assert.equal(filed.length, 1);
        assert.match(filed[0].join(" "), /Failing on golden: Error: known/);
    });

    it("counts a run against a target only when that failure of verification's fails there", () => {
        const t = { id: "s1: a.test.ts > x", file: "a.test.ts", name: "x", key: "k1", status: "fail" };
        const rec = (failures) => ({ failures });
        assert.deepEqual(failedTargets(0, rec([]), [t]), []);
        assert.deepEqual(failedTargets(1, rec([{ ...t }]), [t]), [t.id]);
        assert.deepEqual(failedTargets(1, rec([{ ...t, key: "k2" }]), [t]), [], "the same test failing another way");
        assert.deepEqual(failedTargets(1, rec([{ ...t, name: "y" }]), [t]), [], "another test");
        assert.deepEqual(failedTargets(143, rec([]), [t]), [], "a killed run");
        assert.deepEqual(failedTargets(1, rec([{ ...t, key: "k2" }]), [{ ...t, status: "timeout" }]), [t.id]);
        const shard = { id: "s1: the whole shard", file: null };
        assert.deepEqual(failedTargets(1, null, [shard]), [shard.id], "nothing known: any failure");
    });

    it("quarantines a test flaky before the range, with the range's landings as suspects, and blames nothing", async () => {
        const ledgerDir = join(dir, "ledger-flaky");
        process.env.TEST_QUARANTINE_DIR = join(dir, "quarantine");
        const filed = [];
        const gh = (args) => {
            if (args[1] === "create") filed.push(args);
            return { create: "https://github.com/o/r/issues/7", list: "[]" }[args[1]] ?? "";
        };
        const failure = { file: "p/f.test.ts", name: "f > g", ...failureHashes("Error: race", "p/f.test.ts") };
        const rec = { v: 1, kind: "verify", branch: "golden", base: null, dirty: false, shard: "s1", family: "s1" };
        Object.assign(rec, { variant: "s1", selected: null, outcome: "failed", reused_from: null, secs: 1, log: null });
        Object.assign(rec, { files: [["p/f.test.ts", 1, 1, 0, 1, 0]], failures: [failure], exonerations: [] });
        const gate = async (_c, sha) => {
            gated.push(sha);
            writeRecord(ledgerDir, {
                ...rec,
                id: newRunId("s1"),
                commit: sha,
                tree: sha,
                started_at: new Date().toISOString(),
            });
            return { code: 1, output: "  [FAIL] s1 (exit 1, 3s)\n[FAIL] Tests (x)", log: "l" };
        };
        // fails its first confirming run, passes the second: intermittent
        const check = async (_c, sha, { targets, full }) => (checked.push(sha), judge(targets, full, (k) => k === 1));
        const files = { stateFile: join(dir, "flaky-verify.json"), lock: join(dir, "flaky-verify.lock") };
        const c = verifyContext(repo, {
            ...fake,
            env: { ...env, TEST_LEDGER_DIR: ledgerDir, GRAPHTY_TEST_QUARANTINE: "1" },
            gate,
            check,
            gh,
            ...files,
        });
        const from = git(repo, "rev-parse", "golden");
        await withState(c, (s) => (s.verified = from));
        // it failed once at the verified commit already: flaky before the range
        const earlier = new Date(Date.now() - 3_600_000).toISOString();
        writeRecord(ledgerDir, { ...rec, id: newRunId("s1"), commit: from, tree: from, started_at: earlier });
        const tip = land("q1", { "q1.txt": "1\n" });
        await requestVerification(c, tip);
        await settle();
        const s = readState(c);
        assert.equal(s.last.status, "flaky");
        assert.equal(s.last.culprit, null, "no landing is named, so nothing is reverted");
        assert.equal(s.last.reproduced, false);
        assert.deepEqual(checked, [tip], "confirmed on the failing commit only, never bisected");
        assert.equal(s.last.confirm.runs, 2, "stopped once it passed");
        assert.deepEqual(s.last.quarantined, [{ id: "s1: p/f.test.ts > f > g", issue: 7 }]);
        assert.match(filed[0].join(" "), /Flaky test quarantined: p\/f.test.ts > f > g/);
        assert.ok(filed[0].includes("priority:critical"), "a load- or timing-sensitive test is critical");
        assert.match(filed[0].at(-1), new RegExp(`Suspects.*\\n- ${tip} q1$`, "s"), "the range's landing is a suspect");
        const q = JSON.parse(readFileSync(join(dir, "quarantine/state.json"), "utf8"));
        assert.equal(Object.values(q.added)[0].issue, 7);
        delete process.env.TEST_QUARANTINE_DIR;
    });
});

describe("newly intermittent tests and non-test failures", () => {
    /**
     * A context whose gate records a failure of `p/<tag>.test.ts > t` in the ledger at every commit `fails` names,
     * and whose check fails that test only in the second run of each check there: an intermittent test.
     * @param tag names the test, the ledger and the state file
     * @param fails `(sha) => boolean`
     * @returns `{ c, filed }`, the context and the issues it created
     */
    const intermittent = (tag, fails) => {
        const ledgerDir = join(dir, `ledger-${tag}`);
        const filed = [];
        const gh = (args) => {
            if (args[1] === "create") filed.push(args);
            return { create: "https://github.com/o/r/issues/9", list: "[]" }[args[1]] ?? "";
        };
        const file = `p/${tag}.test.ts`;
        const failure = { file, name: "t", ...failureHashes(`Error: ${tag}`, file) };
        const rec = { v: 1, kind: "verify", branch: "golden", base: null, dirty: false, shard: "s1", family: "s1" };
        Object.assign(rec, { variant: "s1", selected: null, outcome: "failed", reused_from: null, secs: 1, log: null });
        Object.assign(rec, { files: [[file, 1, 1, 0, 1, 0]], failures: [failure], exonerations: [] });
        const gate = async (_c, sha) => {
            gated.push(sha);
            if (!fails(sha)) return { code: 0, output: "", log: "l" };
            const at = new Date().toISOString();
            writeRecord(ledgerDir, { ...rec, id: newRunId("s1"), commit: sha, tree: sha, started_at: at });
            return { code: 1, output: "  [FAIL] s1 (exit 1, 3s)\n[FAIL] Tests (x)", log: "l" };
        };
        const check = async (_c, sha, { targets, full }) => {
            checked.push(sha);
            return judge(targets, full, (k) => k === 2 && fails(sha));
        };
        const files = { stateFile: join(dir, `${tag}-verify.json`), lock: join(dir, `${tag}-verify.lock`) };
        const c = verifyContext(repo, {
            ...fake,
            env: { ...env, TEST_LEDGER_DIR: ledgerDir, GRAPHTY_TEST_QUARANTINE: "1" },
            gate,
            check,
            gh,
            ...files,
        });
        return { c, filed };
    };
    const fromGoldenTip = (c) => withState(c, (s) => (s.verified = git(repo, "rev-parse", "golden")));

    it("bisects a test a landing made intermittent by the rate rule, and names that landing", async () => {
        const { c, filed } = intermittent("r", (sha) => has(sha, "r.txt"));
        await fromGoldenTip(c);
        land("r1", { "r1.txt": "1\n" });
        const culprit = land("r2", { "r.txt": "r\n" });
        const tip = land("r3", { "r3.txt": "3\n" });
        await requestVerification(c, tip);
        await settle();
        const s = readState(c);
        const id = "s1: p/r.test.ts > t";
        assert.deepEqual(s.last.confirm.consistent, [], "it passed a confirming run");
        assert.deepEqual(s.last.confirm.regressed, [id], "no failure before the range: newly intermittent");
        assert.deepEqual(s.last.quarantined, [], "a regression is not quarantined");
        assert.equal(s.last.status, "failed");
        assert.equal(s.last.culprit.sha, culprit);
        assert.equal(s.last.culprit.branch, "r2");
        assert.equal(s.last.culprit.evidence.at.failed[id], 1, "bad on one failing run");
        assert.deepEqual(s.last.culprit.evidence.parent.failed, {}, "its parent passed...");
        assert.equal(s.last.culprit.evidence.parent.runs, CONFIRM_RUNS, "...every one of its runs");
        for (const [sha, point] of Object.entries(s.last.bisect.points)) {
            if (point === "good") assert.deepEqual(s.last.bisect.evidence[sha], { runs: CONFIRM_RUNS, failed: {} });
        }
        assert.equal(filed.length, 0, "a culprit is reverted, not tracked");
    });

    it("names no landing when the first bad landing's parent fails 1 of 5, and records why", async () => {
        const { c, filed } = intermittent("p", (sha) => has(sha, "p.txt"));
        await fromGoldenTip(c);
        writeFileSync(join(repo, "p.txt"), "p\n");
        git(repo, "add", ".");
        git(repo, "commit", "-q", "-m", "fix: straight onto golden, not a landing");
        git(repo, "push", "-q", "origin", "golden");
        const tip = land("p1", { "p1.txt": "1\n" });
        await requestVerification(c, tip);
        await settle();
        const s = readState(c);
        assert.deepEqual(s.last.confirm.regressed, ["s1: p/p.test.ts > t"]);
        assert.equal(s.last.culprit, null);
        assert.equal(s.last.reproduced, true);
        assert.match(
            s.last.noLanding,
            new RegExp(`first bad landing is ${tip.slice(0, 10)}.*fails it too \\(in 1 of 5 runs\\)`),
        );
        assert.match(filed.map((f) => f.join(" ")).join("\n"), /Failing on golden: Error: p/);
    });

    it("says a non-test failure's culprit was judged by 1 run", async () => {
        const broke = (sha) => has(sha, "lint.txt");
        const gate = async (_c, sha) => (
            gated.push(sha),
            { code: broke(sha) ? 1 : 0, output: "[FAIL] Lint", log: "l" }
        );
        const check = async (_c, sha, { failing, targets }) => {
            assert.equal(failing, null, "no test shard: the whole gate");
            checked.push(sha);
            return { runs: 1, failed: broke(sha) ? Object.fromEntries(targets.map((t) => [t.id, 1])) : {} };
        };
        const files = { stateFile: join(dir, "lint-verify.json"), lock: join(dir, "lint-verify.lock") };
        const c = verifyContext(repo, { ...fake, env, gate, check, ...files });
        await fromGoldenTip(c);
        land("n1", { "n1.txt": "1\n" });
        const culprit = land("n2", { "lint.txt": "x\n" });
        await requestVerification(c, land("n3", { "n3.txt": "3\n" }));
        await settle();
        const s = readState(c);
        assert.equal(s.last.failing, null);
        assert.equal(s.last.culprit.sha, culprit);
        assert.equal(s.last.culprit.evidence.at.runs, 1);
        assert.equal(s.last.culprit.evidence.judgedBy, "judged by 1 run");
    });
});

describe("golden-cut", () => {
    it("takes a cut of a verified golden commit as verified, and runs the gate on a cut fix", async () => {
        const at = readState(ctx).verified;
        git(repo, "push", "-q", "origin", `${at}:refs/heads/golden-verified`, `${at}:refs/heads/golden-cut`);
        const cut = verifyContext(repo, { env, ...fake, branch: "golden-cut" });
        await requestVerification(cut, at);
        await settle();
        assert.deepEqual(gated, []);
        assert.equal(readState(cut).verified, at);
        assert.deepEqual(onVerified, [["golden-cut", at]], "a cut taken as verified is a pass too");

        git(repo, "checkout", "-q", "-b", "cut-fix", "origin/golden-cut");
        writeFileSync(join(repo, "fix.txt"), "f\n");
        git(repo, "add", ".");
        git(repo, "commit", "-q", "-m", "fix: the cut");
        git(repo, "push", "-q", "origin", "HEAD:golden-cut");
        const fix = git(repo, "rev-parse", "HEAD");
        git(repo, "checkout", "-q", "golden");
        await requestVerification(cut, fix);
        await settle();
        assert.deepEqual(gated, [fix]);
        assert.equal(readState(cut).verified, fix);
        assert.deepEqual(published, [], "golden-verified is golden's alone");
    });
});

describe("bisect arithmetic", () => {
    const b = (n, points) => ({ candidates: [...Array(n).keys()].map(String), points });

    it("re-runs the target first, beside points spread between the bounds", () => {
        assert.deepEqual(nextPoints(b(9, {}), 2), [8, 4]);
        assert.deepEqual(nextPoints(b(9, { 8: "bad" }), 2), [2, 5]);
        assert.deepEqual(nextPoints(b(9, { 8: "bad", 3: "good", 5: "bad" }), 2), [4]);
    });

    it("takes the first bad point and the last good one before it", () => {
        assert.deepEqual(bounds(b(5, { 4: "bad", 1: "good", 2: "bad" })), { good: 1, bad: 2 });
        assert.deepEqual(bounds(b(5, {})), { good: -1, bad: null });
    });

    it("reads the failing shards from the gate, or none when another step failed", () => {
        const names = new Set(["s1", "s2"]);
        assert.deepEqual(
            failingShards("  [FAIL] s2 (exit 1, 3s)\n  [FAIL] s2: its whole log\n[FAIL] Tests (x)", names),
            ["s2"],
        );
        assert.equal(failingShards("[FAIL] Lint", names), null);
        assert.equal(failingShards("refused", names), null);
    });
});

describe("sync merges", () => {
    it("never blames a landing for a failure a sync merge of master brought in", async () => {
        // golden still holds the watchdog test's bad.txt: a landing removes it, and verification passes
        git(repo, "checkout", "-q", "-b", "m0", "golden");
        git(repo, "rm", "-q", "bad.txt");
        git(repo, "commit", "-q", "-m", "fix: m0");
        git(repo, "checkout", "-q", "golden");
        git(repo, "merge", "-q", "--no-ff", "-m", "land: m0", "m0");
        const good = land("m1", { "m1.txt": "1\n" });
        await requestVerification(ctx, good);
        await settle();
        assert.equal(readState(ctx).verified, good);
        git(repo, "checkout", "-q", "master");
        writeFileSync(join(repo, "sync.txt"), "from master\n");
        git(repo, "add", ".");
        git(repo, "commit", "-q", "-m", "fix: something on master");
        git(repo, "push", "-q", "origin", "master");
        git(repo, "checkout", "-q", "golden");
        git(repo, "merge", "-q", "--no-ff", "-m", "Merge remote-tracking branch 'origin/master' into golden", "master");
        const sync = git(repo, "rev-parse", "HEAD");
        const tip = land("m2", { "m2.txt": "2\n" });
        await requestVerification(ctx, tip);
        await settle();
        const s = readState(ctx);
        assert.equal(s.last.status, "failed");
        assert.equal(s.last.reproduced, true, "it fails every time");
        assert.equal(s.last.culprit, null, "neither m2 nor the sync merge is named");
        assert.ok(!s.last.bisect.candidates.includes(sync), "a sync merge is never a bisect point");
        assert.deepEqual(s.last.bisect.candidates, [tip], "only the landing since the verified commit");
        assert.match(s.last.noLanding, /not a landing, fails it too/);
    });
});

describe("verification in CI (ciGate)", () => {
    const ciDir = join(dir, "ci");
    const receiveLog = join(dir, "received.log");
    let n = 0;

    before(() => {
        // Every ref update origin receives, so a test sees a delete and a push of the same commit.
        const hook = join(dir, "origin.git/hooks/post-receive");
        writeFileSync(hook, `#!/bin/sh\ncat >> '${receiveLog}'\n`);
        chmodSync(hook, 0o755);
    });

    // A scripted answer: a list is answered in order (its last item repeats), a function is called (and may throw).
    const answerOf = (answer, line) => {
        let item = answer;
        if (Array.isArray(answer)) item = answer.length > 1 ? answer.shift() : answer[0];
        const value = typeof item === "function" ? item(line) : item;
        return typeof value === "string" ? value : JSON.stringify(value);
    };
    // A run as GitHub lists it, stamped when it is asked for (a run that ended before the gate started is old).
    // The scratch branch a run of the commit was pushed to, as GitHub records it.
    const SCRATCH = ["golden-candidate", "golden-cut-candidate", "golden-bisect-1", "golden-bisect-2"];
    const headOf = (sha) => SCRATCH.find((ref) => remoteAt(ref) === sha) ?? "golden-candidate";
    const runOf = (sha, fields) => () => ({
        workflow_runs: [
            {
                id: 7,
                head_sha: sha,
                head_branch: headOf(sha),
                display_title: `Golden verify ${sha}`,
                html_url: "https://github.test/runs/7",
                run_attempt: 1,
                updated_at: new Date().toISOString(),
                ...fields,
            },
        ],
    });
    const releaseIdle = [/^run list --workflow release\.yml/, "[]"];

    /**
     * A context whose gate is ciGate, with a scripted gh, its own state and broker files, and looks that sleep
     * for no time but are counted.
     * @param script `[regexp, answer]` pairs for gh
     * @param [onLook] called at each look with its number
     * @param [more] more context overrides
     * @returns `{ c, calls, sleeps, seen }`: seen is the state at each look
     */
    const ciCtx = (script, onLook, more = {}) => {
        const state = join(ciDir, `s${++n}`);
        mkdirSync(state, { recursive: true });
        const calls = [];
        const sleeps = [];
        const seen = [];
        const gh = (args) => {
            const line = args.join(" ");
            calls.push(line);
            const hit = script.find(([re]) => re.test(line));
            if (!hit) throw new Error(`unexpected gh ${line}`);
            return answerOf(hit[1], line);
        };
        const c = verifyContext(repo, {
            env,
            ...fake,
            gate: ciGate,
            gh,
            stateFile: join(state, "verify.json"),
            lock: join(state, "verify.lock"),
            supersededFile: join(state, "verify-superseded"),
            backendFile: join(state, "verify.json"),
            brokerFile: join(state, "status.json"),
            groups: { "small-node": ["s1", "s2"], "small-browser": ["s3", "s4"] },
            actionsOperational: async () => true,
            sleep: async (ms) => {
                sleeps.push(ms);
                assert.ok(sleeps.length < 20, "the gate settles in a counted number of looks");
                seen.push(readState(c));
                onLook?.(sleeps.length);
            },
            ...more,
        });
        return { c, calls, sleeps, seen };
    };
    const tipOf = () => git(repo, "rev-parse", "origin/golden");
    const remoteAt = (ref) => git(repo, "ls-remote", "origin", `refs/heads/${ref}`).split("\t")[0];
    const broker = (c, pullRequests, fetchedAt = new Date().toISOString()) =>
        writeFileSync(c.brokerFile, JSON.stringify({ fetchedAt, pullRequests }));

    it("is off by default; backend ci switches it on, and local needs a reason", async () => {
        const { c } = ciCtx([]);
        assert.equal(backendOf(c), "local");
        assert.equal((await setBackend(c, "local")).ok, false, "never local without a reason");
        assert.equal((await setBackend(c, "ci")).ok, true);
        assert.equal(backendOf(c), "ci");
        assert.equal((await setBackend(c, "local", "GitHub Actions is down")).ok, true);
        assert.equal(backendOf(c), "local");
        assert.match(describeState(c), /backend: local \(GitHub Actions is down, since /);
    });

    it("pushes the commit to golden-candidate, reads its run every 300 s, and publishes on green", async () => {
        const tip = land("ci1", { "ci1.txt": "1\n" });
        const { c, calls, sleeps } = ciCtx([
            releaseIdle,
            [
                /workflows\/golden-verify\.yml\/runs/,
                [runOf(tip, { status: "in_progress" }), runOf(tip, { status: "completed", conclusion: "success" })],
            ],
            [
                /actions\/runs\/7\/jobs/,
                { jobs: [{ id: 1, name: "Verify / Build", status: "in_progress", conclusion: null }] },
            ],
        ]);
        await setBackend(c, "ci");
        await requestVerification(c, tip);
        await settle();
        assert.equal(remoteAt("golden-candidate"), tip);
        assert.deepEqual(sleeps, [300_000, 300_000], "two looks, 300 s apart");
        assert.ok(published.includes(tip));
        const s = readState(c);
        assert.equal(s.verified, tip);
        assert.equal(s.last.verifiedBy, "ci");
        assert.ok(!calls.some((l) => l.includes("/cancel")), "nothing cancelled");
    });

    it("says [SUPERSEDED] when the run was cancelled", async () => {
        const tip = tipOf();
        const { c } = ciCtx([
            releaseIdle,
            [/\/runs\?head_sha=/, runOf(tip, { status: "completed", conclusion: "cancelled" })],
        ]);
        const r = await ciGate(c, tip);
        assert.equal(r.code, 1);
        assert.match(r.output, /\[SUPERSEDED\]/);
    });

    it("fails fast on a gating job, cancels the rest of the run, and names each failed shard of a group", async () => {
        const tip = tipOf();
        const jobs = [
            { id: 11, name: "Verify / Test (small-node)", status: "completed", conclusion: "failure" },
            { id: 12, name: "Verify / Test (small-browser)", status: "completed", conclusion: "failure" },
            { id: 13, name: "Verify / Test (s5)", status: "completed", conclusion: "failure" },
            { id: 14, name: "Verify / Build", status: "completed", conclusion: "success" },
            { id: 15, name: "Verify / All Checks Pass", status: "queued", conclusion: null },
        ];
        const { c, calls } = ciCtx([
            releaseIdle,
            [/\/runs\?head_sha=/, runOf(tip, { status: "in_progress" })],
            [/actions\/runs\/7\/jobs/, { jobs }],
            [/check-runs\/11\/annotations/, [[{ message: "failed: s1" }]]],
            [
                /check-runs\/12\/annotations/,
                () => {
                    throw new Error("HTTP 404");
                },
            ],
            [/actions\/runs\/7\/cancel/, ""],
        ]);
        const r = await ciGate(c, tip);
        assert.equal(r.code, 1);
        assert.ok(
            calls.some((l) => l.includes("actions/runs/7/cancel")),
            "the rest of the run is cancelled",
        );
        const names = new Set(["s1", "s2", "s3", "s4", "s5"]);
        assert.deepEqual(failingShards(r.output, names), ["s1", "s3", "s4", "s5"], "an unread group is every member");

        const other = ciCtx([
            releaseIdle,
            [/\/runs\?head_sha=/, runOf(tip, { status: "completed", conclusion: "failure" })],
            [
                /actions\/runs\/7\/jobs/,
                { jobs: [{ id: 21, name: "Verify / Lint", status: "completed", conclusion: "failure" }] },
            ],
        ]);
        const lint = await ciGate(other.c, tip);
        assert.match(lint.output, /\[FAIL\] Lint/);
        assert.equal(failingShards(lint.output, names), null, "a non-test failure re-runs the whole gate");
    });

    it("leaves a failed job that cannot fail the run (job-level continue-on-error) out of the verdict", async () => {
        mkdirSync(join(repo, ".github/workflows"), { recursive: true });
        const yml = [
            "name: CI",
            "on: push",
            "jobs:",
            "    test:",
            "        name: Test (${{ matrix.shard }})",
            "    visual:",
            "        name: visual (${{ matrix.project }})",
            "        continue-on-error: true",
            "",
        ].join("\n");
        const tip = land("ci-yml", { ".github/workflows/ci.yml": yml });
        const jobs = [
            { id: 31, name: "Verify / Test (s5)", status: "completed", conclusion: "failure" },
            { id: 32, name: "Verify / visual (graphty-element)", status: "completed", conclusion: "failure" },
        ];
        const { c } = ciCtx([
            releaseIdle,
            [/\/runs\?head_sha=/, runOf(tip, { status: "completed", conclusion: "failure" })],
            [/actions\/runs\/7\/jobs/, { jobs }],
            [/^run download /, ""],
        ]);
        const r = await ciGate(c, tip);
        assert.doesNotMatch(r.output, /visual/);
        assert.deepEqual(failingShards(r.output, new Set(["s5"])), ["s5"], "the test failure is confirmed here");
    });

    it("passes a run whose screenshot job failed under a green All Checks Pass, as the run judges itself", async () => {
        const tip = tipOf();
        const jobs = [
            { id: 41, name: "Verify / Test (s5)", status: "completed", conclusion: "success", run_attempt: 1 },
            { id: 42, name: "Verify / visual (graphty-element)", status: "completed", conclusion: "failure" },
            { id: 43, name: "Verify / All Checks Pass", status: "completed", conclusion: "success", run_attempt: 1 },
        ];
        const { c } = ciCtx([
            releaseIdle,
            [/\/runs\?head_sha=/, runOf(tip, { status: "completed", conclusion: "failure" })],
            [/actions\/runs\/7\/jobs/, { jobs }],
        ]);
        const r = await ciGate(c, tip);
        assert.equal(r.code, 0);
        assert.match(r.output, /All Checks Pass: success/);
    });

    // A verification run's visual-<project>-<attempt> artifacts, written where `gh run download -D <dir>` puts them.
    const artifacts = (files) => (line) => {
        const out = line.split(" -D ")[1];
        for (const [name, json] of Object.entries(files)) {
            mkdirSync(join(out, name.split("/")[0]), { recursive: true });
            writeFileSync(join(out, name), JSON.stringify(json));
        }
        return "";
    };
    const visualJobs = (conclusion = "success") => [
        { id: 51, name: "Verify / Build", conclusion: "success" },
        { id: 52, name: "Verify / visual (graphty)", conclusion },
        { id: 53, name: "Verify / visual (layout)", conclusion: "success" },
        { id: 54, name: "Verify / All Checks Pass", conclusion: "success" },
    ];

    it("marks a verified commit's screenshots clean or not from its run's captures, without failing it", async () => {
        const clean = land("cap1", { "cap1.txt": "1\n" });
        const ok = { complete: true, items: [{ id: "a", status: "unchanged" }] };
        const { c, calls } = ciCtx([
            releaseIdle,
            [/workflows\/golden-verify\.yml\/runs/, runOf(clean, { status: "completed", conclusion: "success" })],
            [/actions\/runs\/7\/jobs/, { jobs: visualJobs() }],
            [
                /^run download 7 -p visual-\* -D /,
                artifacts({
                    "visual-graphty-1/results.json": { complete: true, items: [{ id: "a", status: "unstable" }] },
                    "visual-graphty-2/results.json": ok,
                    "visual-layout-1/skipped.json": { skipped: "not affected" },
                }),
            ],
        ]);
        await setBackend(c, "ci");
        await requestVerification(c, clean);
        await settle();
        let s = readState(c);
        assert.equal(s.verified, clean);
        assert.deepEqual(s.captures[clean].problems, [], "the newest attempt's capture decides");
        assert.equal(s.captures[clean].clean, true);
        assert.match(describeState(c), /screenshots: clean \(https:\/\/github\.test\/runs\/7\)/);
        assert.equal(calls.filter((l) => l.startsWith("run download")).length, 1, "one download per verified commit");

        const shaky = land("cap2", { "cap2.txt": "2\n" });
        const d = ciCtx(
            [
                releaseIdle,
                [/workflows\/golden-verify\.yml\/runs/, runOf(shaky, { status: "completed", conclusion: "success" })],
                [/actions\/runs\/7\/jobs/, { jobs: visualJobs("failure") }],
                [
                    /^run download 7 /,
                    artifacts({
                        "visual-graphty-1/results.json": { complete: false, expected: 3, items: [ok.items[0]] },
                    }),
                ],
            ],
            undefined,
            { stateFile: c.stateFile, lock: c.lock, backendFile: c.backendFile },
        ).c;
        await requestVerification(d, shaky);
        await settle();
        s = readState(d);
        assert.equal(s.verified, shaky, "screenshots never fail verification");
        assert.equal(s.captures[shaky].clean, false);
        assert.deepEqual(s.captures[shaky].problems, [
            "visual (graphty) ended failure",
            "graphty: incomplete (1 of 3)",
            "no capture of layout was uploaded",
        ]);
        assert.equal(s.captures[clean].clean, true, "the earlier verdict is kept");
        assert.match(describeState(d), /screenshots: NOT clean, so never cut: visual \(graphty\) ended failure/);
    });

    it("reads a project's newest capture attempt for its changed images", () => {
        const at = join(dir, "changes");
        const write1 = (name, items) => {
            mkdirSync(join(at, name), { recursive: true });
            writeFileSync(join(at, name, "results.json"), JSON.stringify({ complete: true, items }));
        };
        write1("visual-graphty-1", [{ file: "x.png", status: "changed", flaky: false }]);
        write1("visual-graphty-2", [{ file: "x.png", status: "unchanged", flaky: true }]);
        const jobs = [{ name: "Verify / visual (graphty)" }, { name: "Verify / visual (layout)" }];
        const r = captureChanges(jobs, at);
        assert.deepEqual(r.changed, []);
        assert.deepEqual(
            r.flaky.map((i) => i.file),
            ["x.png"],
        );
    });

    it("finds no capture job in a run without one, which is not clean", () => {
        assert.deepEqual(captureProblems([{ name: "Verify / Build", conclusion: "success" }], join(dir, "none")), [
            "the run has no screenshot capture job",
        ]);
    });

    it("never takes a green re-run of the failed jobs alone as verified: it starts a full run", async () => {
        const tip = tipOf();
        const rerun = [
            { id: 51, name: "Verify / Build", status: "completed", conclusion: "success", run_attempt: 1 },
            { id: 52, name: "Verify / Test (s5)", status: "completed", conclusion: "success", run_attempt: 2 },
            { id: 53, name: "Verify / All Checks Pass", status: "completed", conclusion: "success", run_attempt: 2 },
        ];
        const fresh = { id: 8, html_url: "https://github.test/runs/8", status: "completed", conclusion: "success" };
        const { c } = ciCtx([
            releaseIdle,
            [
                /\/runs\?head_sha=/,
                [runOf(tip, { status: "completed", conclusion: "success", run_attempt: 2 }), runOf(tip, fresh)],
            ],
            [/actions\/runs\/7\/jobs/, { jobs: rerun }],
        ]);
        rmSync(receiveLog, { force: true });
        const r = await ciGate(c, tip);
        assert.equal(r.code, 0);
        assert.match(r.output, /runs\/8/, "the verdict is the full run's");
        const updates = readFileSync(receiveLog, "utf8").trim().split("\n");
        assert.ok(updates.some((u) => u.startsWith(`${tip} ${"0".repeat(40)} refs/heads/golden-candidate`)));
    });

    it("reads only the commit's run on its own scratch branch, not one of the same commit on another", async () => {
        const tip = tipOf();
        const { c, seen } = ciCtx([
            releaseIdle,
            [
                /\/runs\?head_sha=/,
                [
                    runOf(tip, { status: "completed", conclusion: "success", head_branch: "golden-bisect-1" }),
                    runOf(tip, { status: "completed", conclusion: "success" }),
                ],
            ],
        ]);
        const r = await ciGate(c, tip);
        assert.equal(r.code, 0);
        assert.equal(seen[1].noRun.attempt, 1, "the other branch's run is not this one");
    });

    it("does not trust the status broker's green after a CI failure of the commit, which a re-run could make", async () => {
        const tip = tipOf();
        const { c } = ciCtx([]);
        broker(c, [{ head: "golden", headSha: tip, checks: { "Verify / All Checks Pass": "SUCCESS" } }]);
        assert.equal(brokerVerdict(c, tip), "passed");
        await withState(c, (s) => (s.last = { commit: tip, status: "confirming", ci: { id: 7, attempt: 1 } }));
        assert.equal(brokerVerdict(c, tip), null);
    });

    it("re-runs a lost run once, marks CI unavailable on the second loss, and clears it when a run starts", async () => {
        const tip = tipOf();
        const { c, calls, seen } = ciCtx([
            releaseIdle,
            [
                /\/runs\?head_sha=/,
                [
                    runOf(tip, { status: "completed", conclusion: "startup_failure" }),
                    runOf(tip, { status: "completed", conclusion: "startup_failure", run_attempt: 2 }),
                    runOf(tip, { status: "in_progress", run_attempt: 3 }),
                    runOf(tip, { status: "completed", conclusion: "success", run_attempt: 3 }),
                ],
            ],
            [/actions\/runs\/7\/jobs/, { jobs: [] }],
            [/actions\/runs\/7\/rerun/, ""],
        ]);
        const r = await ciGate(c, tip);
        assert.equal(r.code, 0);
        assert.equal(calls.filter((l) => l.includes("/rerun")).length, 2);
        assert.equal(seen[1].lostRuns.count, 1, "the first loss is only re-run");
        assert.equal(seen[1].ciUnavailable, undefined);
        assert.match(seen[2].ciUnavailable.cause, /2 runs of .* lost \(startup_failure\)/);
        assert.equal(readState(c).ciUnavailable, undefined, "a run that started cleared it");
    });

    it("records a commit with no run, deletes and pushes the ref again, and marks CI unavailable on the second", async () => {
        const tip = tipOf();
        let said;
        const { c, seen } = ciCtx(
            [
                releaseIdle,
                [
                    /\/runs\?head_sha=/,
                    [
                        { workflow_runs: [] },
                        { workflow_runs: [] },
                        runOf(tip, { status: "completed", conclusion: "success" }),
                    ],
                ],
            ],
            (look) => {
                if (look === 3) said = describeState(c);
            },
        );
        rmSync(receiveLog, { force: true });
        const r = await ciGate(c, tip);
        assert.equal(r.code, 0);
        assert.deepEqual(seen[1].noRun, { ...seen[1].noRun, commit: tip, ref: "golden-candidate", attempt: 1 });
        assert.equal(seen[1].ciUnavailable, undefined);
        assert.equal(seen[2].noRun.attempt, 2);
        assert.match(seen[2].ciUnavailable.cause, /no CI run created .* twice/);
        assert.match(said, /no CI run created for \w+, attempt 2/);
        assert.match(said, /CI verification unavailable since \S+, \d+ landings unverified \(no CI run created/);
        assert.match(said, /backend: local \(the default\)/);
        const updates = readFileSync(receiveLog, "utf8").trim().split("\n");
        const deleted = updates.filter((u) => u.startsWith(`${tip} ${"0".repeat(40)} refs/heads/golden-candidate`));
        assert.equal(deleted.length, 2, "the ref was deleted before each push again");
        assert.equal(readState(c).noRun, undefined, "the run that came cleared it");
    });

    it("waits for the rate limit's reset on a 403, without calling CI unavailable", async () => {
        const tip = tipOf();
        const reset = Math.floor(Date.now() / 1000) + 600;
        const { c, sleeps } = ciCtx([
            releaseIdle,
            [/^api rate_limit/, String(reset)],
            [
                /\/runs\?head_sha=/,
                [
                    () => {
                        throw new Error("HTTP 403: API rate limit exceeded for user");
                    },
                    runOf(tip, { status: "completed", conclusion: "success" }),
                ],
            ],
        ]);
        const r = await ciGate(c, tip);
        assert.equal(r.code, 0);
        assert.equal(sleeps.length, 3, "a look, the wait for the reset, a look");
        assert.ok(sleeps[1] > 300_000 && sleeps[1] <= 600_000, "it waited for the reset");
        assert.equal(readState(c).ciUnavailable, undefined);
    });

    it("yields to the cut pull request's CI run and to a release train, starting at the first look after", async () => {
        const tip = tipOf();
        const { c, calls, sleeps } = ciCtx(
            [
                [/^run list --workflow release\.yml/, ['[{"databaseId":1}]', "[]"]],
                [/\/runs\?head_sha=/, runOf(tip, { status: "completed", conclusion: "success" })],
            ],
            (look) => {
                // The cut's run ends; its own verification check is not a reason to wait.
                if (look === 1)
                    broker(c, [
                        { head: "golden-cut", checks: { "Test (x)": "SUCCESS", "Verify / Build": "IN_PROGRESS" } },
                    ]);
            },
        );
        broker(c, [{ head: "golden-cut", checks: { "Test (x)": "IN_PROGRESS" } }]);
        rmSync(receiveLog, { force: true });
        const r = await ciGate(c, tip);
        assert.equal(r.code, 0);
        assert.equal(sleeps.length, 3, "two waits, then one look at its own run");
        assert.equal(calls.filter((l) => l.startsWith("run list")).length, 2, "the release check, once per look");
    });

    it("reads the result from a fresh status broker at no API cost, and from GitHub when the broker is stale", async () => {
        const tip = tipOf();
        const fresh = ciCtx([releaseIdle]);
        broker(fresh.c, [{ head: "golden", headSha: tip, checks: { "Verify / All Checks Pass": "SUCCESS" } }]);
        assert.equal((await ciGate(fresh.c, tip)).code, 0);
        assert.ok(!fresh.calls.some((l) => l.includes("/runs")), "no REST call");

        const stale = ciCtx([
            releaseIdle,
            [/\/runs\?head_sha=/, runOf(tip, { status: "completed", conclusion: "success" })],
        ]);
        const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
        broker(stale.c, [{ head: "golden", headSha: tip, checks: { "Verify / All Checks Pass": "SUCCESS" } }], hourAgo);
        assert.equal((await ciGate(stale.c, tip)).code, 0);
        assert.equal(stale.calls.filter((l) => l.includes("/runs?head_sha=")).length, 1, "one REST call");
    });

    it("dispatches golden-verify.yml for a commit with no run once the workflow is on master", async () => {
        const tip = tipOf();
        git(repo, "checkout", "-q", "master");
        mkdirSync(join(repo, ".github/workflows"), { recursive: true });
        writeFileSync(join(repo, ".github/workflows/golden-verify.yml"), "name: Golden verify\n");
        git(repo, "add", ".");
        git(repo, "commit", "-q", "-m", "ci: golden-verify on master");
        git(repo, "push", "-q", "origin", "master");
        const master = git(repo, "rev-parse", "HEAD");
        git(repo, "checkout", "-q", "golden");
        const { c, calls } = ciCtx([
            releaseIdle,
            [/\/runs\?head_sha=/, { workflow_runs: [] }],
            [/^workflow run golden-verify\.yml -f ref=/, ""],
            [
                /\/runs\?event=workflow_dispatch/,
                runOf(master, { display_title: `Golden verify ${tip}`, status: "completed", conclusion: "success" }),
            ],
        ]);
        const r = await ciGate(c, tip);
        assert.equal(r.code, 0);
        assert.deepEqual(
            calls.filter((l) => l.startsWith("workflow run")),
            [`workflow run golden-verify.yml -f ref=${tip}`],
            "one dispatch",
        );
        const point = await ciGate(c, tip, { ref: "golden-bisect-1", kind: "bisect", shards: ["s1"] });
        assert.equal(point.code, 0);
        assert.ok(calls.includes(`workflow run golden-verify.yml -f ref=${tip} -f shards=["s1"]`), "with its shards");
    });

    it("records the images CI draws differently from their baselines, and the flaky ones, for golden-cut too", async () => {
        // After the test above put golden-verify.yml on master, so CI can run the cut.
        const cut = land("cap3", { "cap3.txt": "3\n" });
        const item = (file, status, flaky = false) => ({ id: file, file, status, flaky, baseline: "b", capture: "c" });
        const results = {
            complete: true,
            items: [
                item("a.dark.png", "unchanged"),
                item("a.light.png", "unchanged", true),
                item("b.dark.png", "changed"),
                item("c.dark.png", "excluded"),
                item("d.dark.png", "new"),
            ],
        };
        const { c } = ciCtx(
            [
                releaseIdle,
                [/workflows\/golden-verify\.yml\/runs/, runOf(cut, { status: "completed", conclusion: "success" })],
                [/actions\/runs\/7\/jobs/, { jobs: visualJobs() }],
                [/^run download 7 /, artifacts({ "visual-graphty-1/results.json": results })],
            ],
            undefined,
            { branch: "golden-cut" },
        );
        await setBackend(c, "ci");
        await requestVerification(c, cut);
        await settle();
        const s = readState(c);
        assert.equal(s.verified, cut);
        const name = (i) => `${i.project}/${i.file} ${i.status}`;
        assert.deepEqual(s.captures[cut].changed.map(name), ["graphty/b.dark.png changed", "graphty/d.dark.png new"]);
        assert.deepEqual(s.captures[cut].flaky.map(name), ["graphty/a.light.png unchanged"]);
        assert.deepEqual(s.captures[cut].changed[0], {
            project: "graphty",
            file: "b.dark.png",
            status: "changed",
            baseline: "b",
            capture: "c",
        });
    });

    it("quarantines the tests a green run let through as flaky, with the range's landings as suspects", async () => {
        const tip = land("gf1", { "gf1.txt": "1\n" });
        process.env.TEST_QUARANTINE_DIR = join(dir, "quarantine-green");
        rebuild({ TEST_LEDGER_DIR: join(dir, "ledger-green") });
        const note = "[FLAKY] s1: p/c.test.ts > t failed and passed on the same inputs, so it does not fail the shard";
        const filed = [];
        // the Checks job runs the quarantine's own tests: their fixture [FLAKY] line is not a real flake (#3392)
        const fixture = "[FLAKY] graphty-1: graphty/src/a.test.tsx > A > opens failed and passed on the same inputs";
        const answer = {
            data: {
                node: {
                    checkRuns: {
                        nodes: [
                            { name: "Verify / Checks", annotations: { nodes: [{ message: fixture }] } },
                            { name: "Verify / Test (s1)", annotations: { nodes: [{ message: note }] } },
                        ],
                    },
                },
            },
        };
        const { c, calls } = ciCtx(
            [
                releaseIdle,
                [
                    /\/runs\?head_sha=/,
                    runOf(tip, { status: "completed", conclusion: "success", check_suite_node_id: "CS1" }),
                ],
                [/^api graphql [\s\S]*id=CS1$/, answer],
                [/^issue create /, (line) => (filed.push(line), "https://github.com/o/r/issues/12")],
            ],
            undefined,
            { env: { ...env, TEST_LEDGER_DIR: join(dir, "ledger-green"), GRAPHTY_TEST_QUARANTINE: "1" } },
        );
        try {
            const r = await ciGate(c, tip);
            assert.equal(r.code, 0, "a green run stays green");
            assert.equal(calls.filter((l) => l.startsWith("api graphql")).length, 1, "one GraphQL call");
            assert.equal(filed.length, 1, "only the test shard's flake, not the Checks job's fixture line");
            assert.match(filed[0], /newly intermittent/);
            assert.match(filed[0], new RegExp(`${tip} gf1`), "the landing is a suspect");
            const days = readdirSync(join(dir, "ledger-green/records"));
            assert.equal(days.length, 1, "recorded in the ledger");
        } finally {
            delete process.env.TEST_QUARANTINE_DIR;
        }
    });

    describe("a failing run, as GitHub recorded it", () => {
        const FAILURE = "Error: expected 3 to be 4";
        /**
         * A context whose CI is simulated: every commit `ciFails` names gets a failed "Verify / Test (s1)" job whose
         * junit-s1 artifact fails `p/c.test.ts > t`; the run's one re-run fails again when `rerunFails`; the check
         * here fails that test in the runs `localFails` names.
         * @param tag names the ledger
         * @param o the recorded behavior
         * @param o.ciFails `(sha) => boolean`, whether CI fails the commit
         * @param o.rerunFails whether the one re-run fails too
         * @param [o.localFails] `(sha, run, target) => boolean`, whether run k here fails the target
         * @param [o.second] the artifact fails a second test, `p/c.test.ts > u`, too
         * @param [o.retryPassesU] a second report (the quarantine's retry) passes `u`
         * @returns `{ c, calls, checks, pushes, filed }`: pushes are the commits pushed to golden-bisect-<n>
         */
        const recorded = (
            tag,
            { ciFails, rerunFails, localFails = () => false, second = false, retryPassesU = false },
        ) => {
            const ids = [];
            const idOf = (sha) => (ids.includes(sha) ? ids.indexOf(sha) : ids.push(sha) - 1) + 100;
            const shaOf = (line) => ids[Number(/runs\/(\d+)/.exec(line)[1]) - 100];
            const junit =
                '<testsuites><testsuite name="c"><testcase classname="c.test.ts" name="ok"/>' +
                `<testcase classname="c.test.ts" name="t"><failure message="x">${FAILURE}</failure></testcase>` +
                (second
                    ? `<testcase classname="c.test.ts" name="u"><failure message="y">${FAILURE}</failure></testcase>`
                    : "") +
                "</testsuite></testsuites>";
            const checks = [];
            const filed = [];
            const run = (sha) => ({
                id: idOf(sha),
                head_sha: sha,
                head_branch: headOf(sha),
                display_title: `Golden verify ${sha}`,
                html_url: `https://github.test/runs/${idOf(sha)}`,
                run_attempt: 1,
                updated_at: new Date().toISOString(),
                status: "completed",
                conclusion: ciFails(sha) ? "failure" : "success",
            });
            const failedJob = { id: 1, name: "Verify / Test (s1)", status: "completed", conclusion: "failure" };
            const script = [
                releaseIdle,
                [/\/runs\?head_sha=/, (line) => ({ workflow_runs: [run(/head_sha=(\w+)/.exec(line)[1])] })],
                [/actions\/runs\/\d+\/jobs/, (line) => ({ jobs: ciFails(shaOf(line)) ? [failedJob] : [] })],
                [/actions\/runs\/\d+\/cancel/, ""],
                [/^run rerun \d+ --failed$/, ""],
                [
                    /actions\/runs\/\d+$/,
                    (line) => ({ ...run(shaOf(line)), run_attempt: 2, conclusion: rerunFails ? "failure" : "success" }),
                ],
                [
                    /^run download \d+ -n junit-s1 -D /,
                    (line) => {
                        const out = line.split(" -D ")[1];
                        mkdirSync(out, { recursive: true });
                        writeFileSync(join(out, "junit-p-4242.xml"), junit);
                        const passU =
                            '<testsuites><testsuite name="c"><testcase classname="c.test.ts" name="u"/></testsuite></testsuites>';
                        if (retryPassesU) writeFileSync(join(out, "junit-p-4243.xml"), passU);
                        return "";
                    },
                ],
                [/^issue create /, (line) => (filed.push(line), "https://github.com/o/r/issues/11")],
                [/^issue list /, "[]"],
            ];
            const check = async (_c, sha, { targets, full }) => {
                checks.push({ sha, targets });
                const each = targets.map((t) => judge([t], full, (k) => localFails(sha, k, t)));
                return {
                    runs: Math.max(...each.map((r) => r.runs)),
                    failed: Object.assign({}, ...each.map((r) => r.failed)),
                };
            };
            const more = {
                env: { ...env, TEST_LEDGER_DIR: join(dir, `ledger-ci-${tag}`), GRAPHTY_TEST_QUARANTINE: "1" },
                check,
            };
            const { c, calls } = ciCtx(script, undefined, more);
            rmSync(receiveLog, { force: true });
            const pushes = () =>
                (existsSync(receiveLog) ? readFileSync(receiveLog, "utf8").trim().split("\n") : [])
                    .filter((u) => u.includes("refs/heads/golden-bisect-"))
                    .map((u) => u.split(" ")[1]);
            return { c, calls, checks, pushes, filed };
        };
        const reruns = (calls) => calls.filter((l) => l.startsWith("run rerun")).length;
        const verifyFrom = async (c) => {
            const from = git(repo, "rev-parse", "golden");
            await withState(c, (s) => (s.verified = from));
            return from;
        };

        beforeEach(() => {
            process.env.TEST_QUARANTINE_DIR = join(dir, `quarantine-ci-${++n}`);
        });
        after(() => delete process.env.TEST_QUARANTINE_DIR);

        it("reproducing here: runs the failing test file from the JUnit here and bisects here, no CI re-run", async () => {
            const breaks = (sha) => has(sha, "rh.txt");
            const { c, calls, checks, pushes } = recorded("here", { ciFails: breaks, localFails: breaks });
            await verifyFrom(c);
            land("rh0", { "rh0.txt": "0\n" });
            const culprit = land("rh1", { "rh.txt": "1\n" });
            const tip = land("rh2", { "rh2.txt": "2\n" });
            await requestVerification(c, tip);
            await settle();
            const s = readState(c);
            assert.equal(s.last.culprit.sha, culprit);
            assert.deepEqual(
                checks[0].targets.map((t) => `${t.file} > ${t.name}`),
                ["p/c.test.ts > t"],
                "the exact failing test, from the run's JUnit",
            );
            assert.equal(reruns(calls), 0, "a failure that reproduces here needs no CI re-run");
            assert.deepEqual(pushes(), [], "and is bisected here");
            const misses = join(c.env.TEST_LEDGER_DIR, "misses");
            const miss = JSON.parse(readFileSync(join(misses, readdirSync(misses)[0]), "utf8"));
            assert.deepEqual(
                [miss.culprit, miss.branch, miss.changed, miss.tests],
                [culprit, "rh1", ["rh.txt"], [{ file: "p/c.test.ts", ran: false }]],
                "the culprit's miss: what it changed, what failed, and that its land check did not run it",
            );
            assert.ok(!published.includes(tip));
        });

        it("flaky here: quarantines a test that failed before the range, never re-runs CI or bisects", async () => {
            const { c, calls, checks, filed } = recorded("flaky", {
                ciFails: (sha) => has(sha, "fh.txt"),
                localFails: (_sha, k) => k === 1,
            });
            const from = await verifyFrom(c);
            // the same test failed once at the verified commit already
            const failure = { file: "p/c.test.ts", name: "t", ...failureHashes(FAILURE, "p/c.test.ts") };
            const rec = { v: 1, kind: "verify", branch: "golden", base: null, dirty: false, shard: "s1" };
            Object.assign(rec, { family: "s1", variant: "s1", selected: null, outcome: "failed", reused_from: null });
            Object.assign(rec, { secs: 1, log: null, files: [["p/c.test.ts", 1, 1, 0, 1, 0]], exonerations: [] });
            const earlier = new Date(Date.now() - 3_600_000).toISOString();
            const ledger = c.env.TEST_LEDGER_DIR;
            writeRecord(ledger, { ...rec, failures: [failure], id: newRunId("s1"), commit: from, started_at: earlier });
            const tip = land("fh1", { "fh.txt": "1\n" });
            await requestVerification(c, tip);
            await settle();
            const s = readState(c);
            assert.equal(s.last.status, "flaky");
            assert.deepEqual(s.last.quarantined, [{ id: "s1: p/c.test.ts > t", issue: 11 }]);
            assert.deepEqual(
                checks.map((k) => k.sha),
                [tip],
                "confirmed on the failing commit only",
            );
            assert.equal(reruns(calls), 0);
            assert.ok(filed[0].includes("priority:critical"));
            assert.ok(!published.includes(tip), "golden-verified does not move");
        });

        it("CI-only and confirmed: re-runs CI once, checks the verified commit, then bisects in CI one point at a time", async () => {
            const { c, calls, checks, pushes } = recorded("confirmed", {
                ciFails: (sha) => has(sha, "co.txt"),
                rerunFails: true,
            });
            const from = await verifyFrom(c);
            const a = land("co0", { "co0.txt": "0\n" });
            const culprit = land("co1", { "co.txt": "1\n" });
            const tip = land("co2", { "co2.txt": "2\n" });
            await requestVerification(c, tip);
            await settle();
            const s = readState(c);
            assert.equal(reruns(calls), 1, "one re-run, never more");
            assert.deepEqual(
                checks.map((k) => k.sha),
                [tip],
                "here only the confirming run, which passed 5 of 5",
            );
            assert.equal(s.last.confirm.runs, CONFIRM_RUNS);
            assert.deepEqual(pushes(), [from, culprit, a], "the verified commit first, then one point at a time");
            assert.equal(s.last.culprit.sha, culprit);
            assert.equal(s.last.culprit.evidence.parent.sha, a, "its parent passed as a point, not run again");
            assert.equal(s.last.status, "failed");
            assert.ok(!published.includes(tip));
        });

        it("one test reproducing here and one CI-only: the CI bisect follows both", async () => {
            const breaks = (sha) => has(sha, "mx.txt");
            const { c, pushes } = recorded("mixed", {
                ciFails: breaks,
                rerunFails: true,
                second: true,
                localFails: (sha, _k, t) => t.name === "t" && breaks(sha),
            });
            await verifyFrom(c);
            land("mx0", { "mx0.txt": "0\n" });
            const culprit = land("mx1", { "mx.txt": "1\n" });
            const tip = land("mx2", { "mx2.txt": "2\n" });
            await requestVerification(c, tip);
            await settle();
            const s = readState(c);
            const id = (name) => `s1: p/c.test.ts > ${name}`;
            assert.deepEqual(s.last.confirm.consistent, [id("t")], "t reproduces here");
            assert.deepEqual(s.last.confirm.ci, [id("u")], "u fails only in CI");
            assert.equal(s.last.bisect.ci, true, "so the bisect runs in CI");
            assert.ok(pushes().length > 0);
            assert.equal(s.last.culprit.sha, culprit);
        });

        it("keeps a test that passed on the quarantine's retry as a target, so it is confirmed here", async () => {
            const breaks = (sha) => has(sha, "rp.txt");
            const { c, checks } = recorded("retry-pass", {
                ciFails: breaks,
                second: true,
                retryPassesU: true,
                localFails: (sha, _k, t) => t.name === "t" && breaks(sha),
            });
            await verifyFrom(c);
            const tip = land("rp1", { "rp.txt": "1\n" });
            await requestVerification(c, tip);
            await settle();
            assert.deepEqual(
                checks[0].targets.map((t) => t.name).sort(),
                ["t", "u"],
                "u failed once in CI: confirmed, not dropped",
            );
        });

        it("CI-only and passing on its re-run: quarantined, nothing bisected, golden-verified stays", async () => {
            const { c, calls, pushes, filed } = recorded("rerun-passes", { ciFails: (sha) => has(sha, "cp.txt") });
            await verifyFrom(c);
            const tip = land("cp1", { "cp.txt": "1\n" });
            await requestVerification(c, tip);
            await settle();
            const s = readState(c);
            assert.equal(reruns(calls), 1);
            assert.equal(s.last.status, "flaky");
            assert.deepEqual(s.last.quarantined, [{ id: "s1: p/c.test.ts > t", issue: 11 }]);
            assert.match(filed[0], /passed its CI re-run/);
            assert.deepEqual(pushes(), [], "no CI bisect");
            assert.ok(!published.includes(tip), "a passing re-run never moves golden-verified");
            assert.notEqual(s.verified, tip);
        });

        // origin's master without golden-verify.yml, as before the branch that adds it reaches master
        const withoutWorkflowOnMaster = async (body) => {
            const master = git(repo, "rev-parse", "origin/master");
            git(repo, "push", "-q", "-f", "origin", "master~1:master");
            try {
                await body();
            } finally {
                git(repo, "push", "-q", "-f", "origin", `${master}:master`);
            }
        };

        it("before golden-verify.yml: judges the verified commit here, which CI cannot run, and bisects the rest in CI", async () => {
            await withoutWorkflowOnMaster(async () => {
                const { c, checks, pushes } = recorded("predates", {
                    ciFails: (sha) => has(sha, "pd.txt"),
                    rerunFails: true,
                });
                const from = await verifyFrom(c);
                land("pd0", { ".github/workflows/golden-verify.yml": "name: Golden verify\n" });
                const culprit = land("pd1", { "pd.txt": "1\n" });
                const tip = land("pd2", { "pd2.txt": "2\n" });
                await requestVerification(c, tip);
                await settle();
                const s = readState(c);
                assert.equal(s.last.bisect.verifiedCheck, "good");
                assert.match(
                    s.last.bisect.evidence[from].judgedLocally,
                    /CI cannot run \w+: it predates golden-verify\.yml/,
                );
                assert.ok(
                    checks.some((k) => k.sha === from),
                    "the verified commit is judged here",
                );
                assert.ok(!pushes().includes(from), "and never pushed");
                assert.equal(s.last.culprit.sha, culprit);
                assert.equal(s.ciUnavailable, undefined, "never a false CI-unavailable alarm");
            });
        });

        it("before golden-verify.yml: a point CI cannot run is judged here, and its evidence says so", async () => {
            await withoutWorkflowOnMaster(async () => {
                const { c, checks, pushes } = recorded("predates-all", {
                    ciFails: (sha) => has(sha, "pa.txt"),
                    rerunFails: true,
                });
                await verifyFrom(c);
                // golden carries golden-verify.yml from the test above: these commits are as if it never landed
                git(repo, "rm", "-q", ".github/workflows/golden-verify.yml");
                git(repo, "commit", "-q", "-m", "test: golden without golden-verify.yml");
                git(repo, "push", "-q", "origin", "golden");
                await withState(c, (st) => (st.verified = git(repo, "rev-parse", "golden")));
                land("pa0", { "pa0.txt": "0\n" });
                land("pa1", { "pa1.txt": "1\n" });
                const tip = land("pa2", { "pa.txt": "2\n" });
                await requestVerification(c, tip);
                await settle();
                const s = readState(c);
                assert.deepEqual(pushes(), [], "nothing pushed: no point has the workflow");
                const points = Object.keys(s.last.bisect.evidence).filter((p) => p !== tip);
                assert.ok(points.length > 0);
                for (const p of points) {
                    assert.ok(
                        checks.some((k) => k.sha === p),
                        "each point ran here",
                    );
                    assert.match(s.last.bisect.evidence[p].judgedLocally, /CI cannot run \w+: it predates/);
                }
                assert.match(s.last.culprit.evidence.parent.judgedLocally, /CI cannot run/, "the record says so");
                assert.equal(s.ciUnavailable, undefined);
            });
        });

        // A cut's head off origin/master, pushed to golden-cut: with the workflow in its tree or without.
        const cutOffMaster = (name, files) => {
            git(repo, "checkout", "-q", "-b", name, "origin/master");
            for (const [f, text] of Object.entries(files)) {
                mkdirSync(join(repo, f, ".."), { recursive: true });
                writeFileSync(join(repo, f), text);
            }
            git(repo, "add", ".");
            git(repo, "commit", "-q", "-m", `fix: ${name}`);
            git(repo, "push", "-q", "-f", "origin", "HEAD:golden-cut");
            const head = git(repo, "rev-parse", "HEAD");
            git(repo, "checkout", "-q", "golden");
            return head;
        };

        it("before golden-verify.yml: a cut CI cannot run gets no candidate push and no local gate; its pull request's CI verifies it", async () => {
            await withoutWorkflowOnMaster(async () => {
                const { c, calls } = ciCtx([releaseIdle], undefined, { branch: "golden-cut" });
                await setBackend(c, "ci");
                const head = cutOffMaster("cut-no-workflow", { "cnw.txt": "c\n" });
                await withState(c, (s) => {
                    s.noRun = { commit: head, ref: "golden-cut-candidate", attempt: 30, at: "t" };
                    s.ciUnavailable = { since: "t", cause: "no CI run created twice" };
                });
                await requestVerification(c, head);
                await settle();
                const s = readState(c);
                assert.equal(s.last.status, "ciCannotRun");
                assert.equal(s.last.commit, head);
                assert.match(s.last.reason, /CI cannot run \w+: it predates golden-verify\.yml/);
                assert.notEqual(remoteAt("golden-cut-candidate"), head, "never pushed to the candidate branch");
                assert.ok(!calls.some((l) => /golden-verify\.yml\/runs/.test(l)), "no run is looked for");
                assert.deepEqual(gated, [], "the local gate does not run it");
                assert.equal(s.verified, undefined, "not recorded as verified: its pull request's CI is");
                assert.equal(s.noRun, undefined, "the stuck run's trouble is cleared");
                assert.equal(s.ciUnavailable, undefined);
                assert.equal(s.run, null, "the run ended");
                assert.deepEqual(onVerified, [["golden-cut", head]], "auto-ship is told, as after a pass");
                assert.match(
                    describeState(c),
                    /last: ciCannotRun \w+ at .*: verification: the cut pull request's CI is the verification \(its tree predates golden-verify\.yml\)/,
                );
            });
        });

        it("before golden-verify.yml: a cut whose tree has the workflow still goes to CI", async () => {
            await withoutWorkflowOnMaster(async () => {
                let head;
                const script = [
                    releaseIdle,
                    [
                        /golden-verify\.yml\/runs/,
                        (line) => runOf(head, { status: "completed", conclusion: "success" })(line),
                    ],
                ];
                const { c } = ciCtx(script, undefined, { branch: "golden-cut" });
                await setBackend(c, "ci");
                head = cutOffMaster("cut-with-workflow", {
                    "cww.txt": "c\n",
                    ".github/workflows/golden-verify.yml": "name: Golden verify\n",
                });
                await requestVerification(c, head);
                await settle();
                const s = readState(c);
                assert.equal(remoteAt("golden-cut-candidate"), head, "pushed to the candidate branch");
                assert.equal(s.last.status, "passed");
                assert.equal(s.verified, head);
            });
        });

        it("before golden-verify.yml: a golden commit whose tree has the workflow still goes to CI", async () => {
            await withoutWorkflowOnMaster(async () => {
                const { c } = recorded("golden-with-workflow", { ciFails: () => false });
                await verifyFrom(c);
                const tip = land("gw1", { ".github/workflows/golden-verify.yml": "name: Golden verify\n" });
                await requestVerification(c, tip);
                await settle();
                assert.equal(remoteAt("golden-candidate"), tip, "pushed to the candidate branch");
                assert.equal(readState(c).verified, tip);
            });
        });

        it("an environment change: the verified commit fails in CI too, so no landing is named and it gets an issue", async () => {
            const { c, pushes, filed } = recorded("environment", { ciFails: () => true, rerunFails: true });
            const from = await verifyFrom(c);
            // the cut's head is the verified commit, and the broker still shows its old green verification
            broker(c, [{ head: "golden-cut", headSha: from, checks: { "Verify / All Checks Pass": "SUCCESS" } }]);
            land("ev0", { "ev0.txt": "0\n" });
            const tip = land("ev1", { "ev1.txt": "1\n" });
            await requestVerification(c, tip);
            await settle();
            const s = readState(c);
            assert.equal(s.last.culprit, null, "nothing to revert");
            assert.match(s.last.noLanding, /environment change/);
            assert.deepEqual(pushes(), [from], "only the verified commit ran in CI");
            assert.equal(filed.length, 1);
            assert.match(filed[0], /Failing on golden: Error: expected 3 to be 4 .*priority:high/);
        });
    });
});
