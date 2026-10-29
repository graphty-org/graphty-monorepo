// Pre-mortem guards on the restart path (#4055): the restart tests the green build's commit, an old red or hold issue
// starts no paid re-test, the run attempt is read whatever gh's version, and a re-run's uploads never clash.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { parse as parseYaml } from "yaml";

import {
    approvalsIn,
    attemptOf,
    due,
    fixForwardMerges,
    PAID_RETEST_MAX_MS,
    RATE_WAIT_MAX_MS,
    rateLimitWait,
    restartDispatch,
    resumesDue,
    tooOldToRetest,
} from "./release-due.mjs";

const now = Date.parse("2026-10-27T12:00:00Z");
const day = 24 * 60 * 60 * 1000;
const workflow = (name) => parseYaml(readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), "utf8"));

describe("release-due pre-mortem guards", () => {
    it("dispatches the restart on the green build's commit, not master's tip", () => {
        const args = restartDispatch("restart", "abc123");
        assert.deepEqual(args.slice(-4), ["-f", "mode=restart", "-f", "sha=abc123"]);
        const release = workflow("release.yml");
        assert.equal(release.on.workflow_dispatch.inputs.sha.type, "string");
        const pick = release.jobs.pick.steps.find((s) => s.id === "candidate");
        assert.match(pick.env.HEAD_SHA, /inputs\.mode == 'restart' && inputs\.sha \|\| github\.sha/);
    });

    it("starts no paid re-test for a red issue open over 30 days", () => {
        const red = (number, createdAt) => ({ number, title: `Full run red: ci on ${number}`, createdAt });
        const fresh = red(1, new Date(now - day).toISOString());
        const old = red(2, new Date(now - PAID_RETEST_MAX_MS - day).toISOString());
        assert.deepEqual(due([fresh], "Fixes #1", now), { mode: "restart", issue: 1, cancel: true });
        assert.deepEqual(due([old], "Fixes #2", now), { mode: "restart", issue: 2, cancel: false, stale: true });
        assert.equal(due([old, fresh], "Refs #2\nRefs #1", now).issue, 1, "a fresh issue wins over a stale one");
        assert.equal(due([red(3)], "Refs #3", now).stale, undefined, "an unknown age is never stale");
        assert.equal(tooOldToRetest(now - PAID_RETEST_MAX_MS, now), false, "exactly 30 days still re-tests");
    });

    it("starts no candidate re-test for a hold over 30 days old", () => {
        const fix = { subject: "Merge pull request #5 from graphty-org/fix/x", messages: "Refs #900" };
        const store = (at) => ({ hold: { issue: 900, head: "h", base: "h", at } });
        assert.equal(fixForwardMerges([fix], store(now - day), now).stale, undefined);
        assert.equal(fixForwardMerges([fix], store(now - 31 * day), now).stale, true);
    });

    it("reads a run attempt defensively (an older gh has no attempt field)", () => {
        assert.equal(attemptOf("2\n"), 2);
        assert.equal(attemptOf(3), 3);
        for (const raw of [undefined, null, "", "null", "0", "x"]) assert.equal(attemptOf(raw), 1, String(raw));
    });

    it("lets a re-run replace the per-shard uploads instead of clashing on their names", () => {
        const ci = workflow("ci.yml");
        const uploads = Object.values(ci.jobs)
            .flatMap((j) => j.steps ?? [])
            .filter((s) => /actions\/upload-artifact/.test(s.uses ?? "") && /matrix\.shard/.test(s.with?.name ?? ""));
        assert.ok(uploads.length >= 5, `found ${uploads.length} per-shard uploads`);
        for (const s of uploads) assert.equal(s.with.overwrite, true, `${s.name} (${s.with.name})`);
    });
});

// #4127: several merges reach master together, the waiting builds are cancelled (#3940), and an approval merge's own
// build never runs; the next green build must promote it, and no build may promote one approval twice.
describe("release-due approval merges since the last green build", () => {
    const dir = mkdtempSync(join(tmpdir(), "release-due-approval-"));
    after(() => rmSync(dir, { recursive: true, force: true }));
    const g = (...args) =>
        spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], {
            cwd: dir,
            encoding: "utf8",
        }).stdout.trim();
    g("init", "-q", "-b", "master");
    g("commit", "-q", "--allow-empty", "-m", "candidate");
    const candidate = g("rev-parse", "HEAD");
    const merge = (branch, ...msgs) => {
        g("switch", "-q", "-c", branch, msgs.length > 1 ? candidate : "master");
        for (const m of msgs) g("commit", "-q", "--allow-empty", "-m", m);
        const tip = g("rev-parse", "HEAD");
        g("switch", "-q", "master");
        g("merge", "-q", "--no-ff", "-m", `Merge pull request from ${branch}`, branch);
        return tip;
    };
    g("commit", "-q", "--allow-empty", "-m", "green base");
    const green = g("rev-parse", "HEAD");
    // the accept commit on the candidate, then the commit holding the signed approval: the pull request's head
    const approval = merge(
        "approve",
        `test(workspace): approve visual baselines at ${candidate.slice(0, 12)}`,
        "chore(workspace): the owner's signed approval",
    );
    const approvalMerge = g("rev-parse", "HEAD");
    merge("other", "feat: unrelated work");
    const bin = join(dir, "bin");
    mkdirSync(bin);
    const dryRun = (greenShas) => {
        writeFileSync(
            join(bin, "gh"),
            `#!/bin/bash\ncase "$*" in\n"run list"*) echo '${JSON.stringify(greenShas.map((headSha) => ({ headSha })))}';;\n*state=open*) echo '';;\n*) ;;\nesac\n`,
            { mode: 0o755 },
        );
        const out = spawnSync("node", [new URL("./release-due.mjs", import.meta.url).pathname, "--dry-run"], {
            cwd: dir,
            encoding: "utf8",
            env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_REPOSITORY: "o/r", GRAPHTY_RESULTS: "0" },
        });
        assert.equal(out.status, 0, out.stderr);
        return out.stdout;
    };
    const promotes = new RegExp(`the approval ${approval} of ${candidate}: `);

    it("promotes an approval whose own build was cancelled from the next green build", () => {
        assert.match(dryRun([green]), promotes);
    });

    it("leaves an approval a green build already handled", () => {
        assert.doesNotMatch(dryRun([approvalMerge, green]), promotes, "the merge is at the base: handled there");
        const h = candidate;
        const accept = {
            sha: "b".repeat(40),
            parents: [h],
            subject: `x: approve visual baselines at ${h.slice(0, 12)}`,
        };
        const store = { hold: { head: h, issue: 7 }, recent: [{ sha: h, state: "approved" }] };
        const merges = [{ approval, commits: [accept] }];
        assert.equal(resumesDue(merges, store)[0].run, false, "the store records it promoted");
    });

    // #4445: the approval of 42992d937e97 merged while the repository's Actions token had spent its hourly budget;
    // the dispatch failed with "HTTP 403: API rate limit exceeded for installation", was logged as a warning, the job
    // passed and the promotion never started.
    const dispatch = (failures) => {
        const log = join(dir, "gh.log");
        const count = join(dir, "dispatches");
        rmSync(log, { force: true });
        writeFileSync(count, "0");
        writeFileSync(
            join(bin, "gh"),
            `#!/bin/bash\necho "$*" >> ${log}\ncase "$*" in\n` +
                `"run list"*) echo '${JSON.stringify([{ headSha: green }])}';;\n` +
                `"api rate_limit"*) echo $(( $(date +%s) - 10 ));;\n` +
                `"workflow run"*) n=$(( $(cat ${count}) + 1 )); echo $n > ${count}\n` +
                `  if [ $n -le ${failures} ]; then echo "HTTP 403: API rate limit exceeded for installation." >&2; exit 1; fi;;\n` +
                `*) ;;\nesac\n`,
            { mode: 0o755 },
        );
        const out = spawnSync("node", [new URL("./release-due.mjs", import.meta.url).pathname], {
            cwd: dir,
            encoding: "utf8",
            env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_REPOSITORY: "o/r", GRAPHTY_RESULTS: "0" },
        });
        const calls = readFileSync(log, "utf8")
            .split("\n")
            .filter((l) => l.startsWith("workflow run"));
        return { out, calls };
    };

    it("dispatches a rate-limited promotion again after the reset", () => {
        const { out, calls } = dispatch(1);
        assert.equal(out.status, 0, out.stdout + out.stderr);
        assert.equal(calls.length, 2);
        assert.match(calls[1], new RegExp(`mode=promote-nightly -f candidate=${candidate} -f accept=${approval}`));
        assert.match(out.stdout, /rate-limited; dispatching again after the reset/);
    });

    it("fails the job, naming gh's error, when the promotion cannot be dispatched", () => {
        const { out, calls } = dispatch(2);
        assert.equal(calls.length, 2, "one retry only");
        assert.equal(out.status, 1, "a missed promotion fails the job");
        assert.match(out.stdout, /::error::gh workflow run release\.yml .*HTTP 403: API rate limit exceeded/);
    });

    it("waits only for a rate limit whose reset is within the job's time", () => {
        const now = Date.parse("2026-10-29T13:51:29Z");
        const limited = "HTTP 403: API rate limit exceeded for installation.";
        assert.equal(rateLimitWait(limited, now / 1000 + 600, now), 605_000);
        assert.equal(rateLimitWait(limited, now / 1000 - 30, now), 1000, "a reset already past: just retry");
        assert.equal(rateLimitWait(limited, now / 1000 + 3600, now), null, "longer than the job may wait");
        assert.equal(rateLimitWait(limited, Number.NaN, now), null);
        assert.equal(rateLimitWait("HTTP 422: Unexpected inputs provided", now / 1000, now), null);
        assert.ok(RATE_WAIT_MAX_MS < 65 * 60 * 1000 - 5 * 60 * 1000, "ci.yml's release-due timeout leaves room");
        assert.equal(workflow("ci.yml").jobs["release-due"]["timeout-minutes"], 65);
    });

    it("reads only HEAD without a green build to start from", () => {
        assert.doesNotMatch(dryRun([]), promotes);
        g("switch", "-q", "-c", "alone", approvalMerge);
        assert.match(dryRun([]), promotes, "HEAD itself is the approval merge");
    });
});

describe("release-due approvals since the last green build", () => {
    const H = "3ddf13da890926e8fbaaf455b4fa7a14b88541e5";
    const A = "ec7c3384f9630bc97a23c10b7fda82c98c44d501";
    const P = "83708329d1d8fa1dac5c36ab6c740ef69aa22aea";
    const approvalMerge = {
        approval: P,
        commits: [
            { sha: "7510f43c7e", parents: ["ae5c4ce298", P], subject: "Merge pull request #4117 from x/approve" },
            { sha: P, parents: [A], subject: "test(workspace): approve the visual baselines of the seed" },
            { sha: A, parents: [H], subject: "test(workspace): approve visual baselines at 3ddf13da8909" },
        ],
    };
    // the build that runs is a later, unrelated merge's: the approval merge's own build was cancelled
    const unrelated = {
        approval: "f00d",
        commits: [
            { sha: "d6f4798c9b", parents: ["7a70bf3f2c", "f00d"], subject: "Merge pull request #4125 from x/y" },
            { sha: "f00d", parents: ["beef"], subject: "feat(graphty): something" },
        ],
    };
    const store = { hold: { head: H, issue: 4104 }, recent: [{ sha: H, state: "green-images", runId: 1 }] };

    it("promotes an approval merge whose own build was cancelled, from a later merge's build", () => {
        const due = resumesDue([unrelated, approvalMerge], store);
        assert.equal(due.length, 1);
        assert.equal(due[0].candidate, H);
        assert.equal(due[0].accept, P);
        assert.equal(due[0].run, true);
    });

    it("promotes a candidate once, with its newest approval", () => {
        const older = { ...approvalMerge, approval: "0ld" };
        assert.deepEqual(approvalsIn([approvalMerge, unrelated, older]), [{ candidate: H, accept: P }]);
    });

    it("keeps resumeDecision's refusal of an approval for a head that is not the held one", () => {
        const due = resumesDue([unrelated, approvalMerge], { ...store, hold: { head: "other", issue: 4104 } });
        assert.equal(due[0].run, false);
        assert.equal(due[0].comment, 4104);
    });
});
