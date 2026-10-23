// Tests of tools/verify.mjs on a throwaway repository: a bare "origin" whose golden gets "land: <branch>"
// merges, a fake gate and a fake narrow check that fail when a commit holds bad.txt (or both x.txt and
// y.txt), and runs started in this process instead of detached.
//
//   node tools/verify.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";
import { failureHashes, newRunId, writeRecord } from "./test-ledger.mjs";
import {
    bounds,
    claim,
    failingShards,
    handled,
    nextPoints,
    pointVerdict,
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
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
};
const has = (sha, file) => spawnSync("git", ["cat-file", "-e", `${sha}:${file}`], { cwd: repo, env }).status === 0;
const broken = (sha) => has(sha, "bad.txt") || (has(sha, "x.txt") && has(sha, "y.txt"));

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
let gateStarted;
let concurrent;
let most;
let published;
let runs;
let ctx;

const fake = {
    gate: async (_c, sha) => {
        gated.push(sha);
        gateStarted?.();
        if (hold) await hold;
        const fail = broken(sha) || flaky.delete(sha);
        return {
            code: fail ? 1 : 0,
            output: fail ? "  [FAIL] s1 (exit 1, 3s); the end of x.log\n[FAIL] Tests (the CI shards)" : "",
            log: `log-${sha.slice(0, 7)}`,
        };
    },
    check: async (_c, sha, failing) => {
        assert.deepEqual(failing, ["s1"], "only the failing shard runs again");
        checked.push(sha);
        most = Math.max(most, ++concurrent);
        await new Promise((r) => setImmediate(r));
        concurrent--;
        return !broken(sha);
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

    it("goes on to what a landing wanted while it ran, with no second run", async () => {
        let release;
        hold = new Promise((r) => (release = r));
        const started = new Promise((r) => (gateStarted = r));
        const first = land("a2", { "a2.txt": "2\n" });
        await requestVerification(ctx, first);
        await started;
        const second = land("a3", { "a3.txt": "3\n" });
        assert.match(await requestVerification(ctx, second), /is running/);
        assert.equal(runs.length, 1, "no second run");
        release();
        await settle();
        assert.deepEqual(gated, [first, second]);
        assert.equal(readState(ctx).verified, second);
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
        assert.equal(checked[0], tip, "the failure is reproduced on the commit that failed first");
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

    it("records a failure that does not come back as not reproduced, and verifies it again only when asked", async () => {
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
                bisect: { candidates, points: { [candidates[3]]: "bad", [candidates[1]]: "good" } },
            };
        });
        assert.match(await start(ctx), /started/);
        await settle();
        assert.deepEqual(checked, [candidates[2]], "only the point between the recorded ones");
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
        const check = async (_c, sha) => (checked.push(sha), !fails(sha));
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

    it("calls a bisect point bad only when one of verification's failures fails there", () => {
        const t = { file: "a.test.ts", name: "x", key: "k1", status: "fail" };
        const rec = (failures) => ({ failures });
        assert.equal(pointVerdict(0, rec([]), [t]), "pass");
        assert.equal(pointVerdict(1, rec([{ ...t }]), [t]), "bad");
        assert.equal(pointVerdict(1, rec([{ ...t, key: "k2" }]), [t]), "unknown", "the same test failing another way");
        assert.equal(pointVerdict(1, rec([{ ...t, name: "y" }]), [t]), "unknown", "another test");
        assert.equal(pointVerdict(143, rec([]), [t]), "unknown", "a killed run");
        assert.equal(pointVerdict(1, rec([{ ...t, key: "k2" }]), [{ ...t, status: "timeout" }]), "bad");
        assert.equal(pointVerdict(1, null, []), "bad", "nothing known: any failure");
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
