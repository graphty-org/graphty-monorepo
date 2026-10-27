// Pre-mortem guards on the restart path (#4055): the restart tests the green build's commit, an old red or hold issue
// starts no paid re-test, the run attempt is read whatever gh's version, and a re-run's uploads never clash.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { parse as parseYaml } from "yaml";

import {
    attemptOf,
    due,
    fixForwardMerges,
    PAID_RETEST_MAX_MS,
    restartDispatch,
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
