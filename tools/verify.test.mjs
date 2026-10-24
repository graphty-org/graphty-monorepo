// Tests of tools/verify.mjs on a throwaway repository: a bare "origin" whose golden gets "land: <branch>"
// merges, a fake gate and a fake narrow check that fail when a commit holds bad.txt (or both x.txt and
// y.txt), and runs started in this process instead of detached.
//
//   node tools/verify.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";
import { failureHashes, newRunId, writeRecord } from "./test-ledger.mjs";
import {
    bounds,
    claim,
    CONFIRM_RUNS,
    decided,
    failedTargets,
    failingShards,
    handled,
    MAX_SWITCHES,
    nextPoints,
    readState,
    requestVerification,
    run,
    start,
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
