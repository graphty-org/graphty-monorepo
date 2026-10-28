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
    attemptOf,
    due,
    fixForwardMerges,
    PAID_RETEST_MAX_MS,
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
        assert.equal(resumesDue([accept], store, approval)[0].run, false, "the store records it promoted");
        assert.deepEqual(
            [resumesDue([accept], null, approval, true)[0].run, resumesDue([accept], null, approval, true)[0].comment],
            [false, null],
            "nightly holds it already, whatever the store says",
        );
    });

    it("reads only HEAD without a green build to start from", () => {
        assert.doesNotMatch(dryRun([]), promotes);
        g("switch", "-q", "-c", "alone", approvalMerge);
        assert.match(dryRun([]), promotes, "HEAD itself is the approval merge");
    });
});
