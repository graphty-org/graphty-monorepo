// Tests of the baseline loop's choices that decide whether a busy master still gets scanned: which
// commit it picks while newer commits' CI is still running, and how it waits for the scan lock a
// pre-push gate holds.
//
//   node --test tools/sonar/sonar-baseline.test.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { needsScan, pickCommit, scanLock } from "../sonar-baseline.mjs";

const run = (headSha, status, conclusion = "", databaseId = 1) => ({ headSha, status, conclusion, databaseId });

describe("pickCommit", () => {
    it("picks the newest commit whose CI finished while the tip's is still running", () => {
        const shas = ["c3", "c2", "c1"];
        const runs = [run("c3", "in_progress"), run("c2", "queued"), run("c1", "completed", "success", 7)];
        assert.deepEqual(pickCommit(shas, runs), { sha: "c1", run: runs[2] });
    });

    it("skips a cancelled run, which uploads no coverage", () => {
        const runs = [run("c2", "completed", "cancelled"), run("c1", "completed", "failure")];
        assert.equal(pickCommit(["c2", "c1"], runs).sha, "c1");
    });

    it("judges a commit by its newest run (a rerun in progress)", () => {
        const runs = [run("c1", "in_progress", "", 2), run("c1", "completed", "success", 1)];
        assert.equal(pickCommit(["c1"], runs), null);
    });

    it("returns null when no listed commit has a finished run", () => {
        assert.equal(pickCommit(["c2", "c1"], [run("c2", "queued")]), null);
    });
});

describe("needsScan", () => {
    const ancestry = { c1: ["c2", "c3"], c2: ["c3"] }; // a: the commits it is an ancestor of
    const isAncestor = (a, b) => (ancestry[a] ?? []).includes(b);

    it("skips the commit already analyzed", () => assert.equal(needsScan("c2", "c2", isAncestor), false));
    it("skips a commit older than the one analyzed", () => assert.equal(needsScan("c1", "c2", isAncestor), false));
    it("scans a newer commit", () => assert.equal(needsScan("c3", "c2", isAncestor), true));
    it("scans when nothing was analyzed", () => assert.equal(needsScan("c1", undefined, isAncestor), true));
});

describe("scanLock", () => {
    const dir = mkdtempSync(join(tmpdir(), "sonar-baseline-test-"));
    after(() => rmSync(dir, { recursive: true, force: true }));
    const lock = join(dir, "sonar-local.lock");

    // A stand-in for a pre-push gate: holds the lock for `seconds`, resolving once it holds it.
    const holdLock = (seconds) =>
        new Promise((resolve) => {
            const c = spawn("flock", [lock, "-c", `echo held; sleep ${seconds}`], {
                stdio: ["ignore", "pipe", "ignore"],
            });
            c.stdout.once("data", () => resolve(c));
        });

    it("waits for a held lock and proceeds once it is released", async () => {
        const holder = await holdLock(1);
        const start = Date.now();
        const said = [];
        const release = await scanLock(lock, 10, (m) => said.push(m));
        assert.ok(release, "the lock was obtained");
        assert.ok(Date.now() - start >= 500, "it waited for the holder");
        assert.deepEqual(said, []);
        release();
        holder.kill();
    });

    it("gives up after the timeout and logs why", async () => {
        const holder = await holdLock(5);
        const said = [];
        const release = await scanLock(lock, 1, (m) => said.push(m));
        holder.kill();
        assert.equal(release, null);
        assert.equal(said.length, 1);
        assert.match(said[0], /held by a push for 1 s; retrying at the next poll/);
    });
});
