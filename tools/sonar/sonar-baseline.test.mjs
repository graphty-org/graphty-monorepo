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

const run = (headSha, status, conclusion = "", event = "schedule", databaseId = headSha) => ({
    headSha,
    status,
    conclusion,
    event,
    databaseId,
});

describe("pickCommit", () => {
    const withCoverage = (ids) => (r) => ids.includes(r.databaseId);

    it("picks the newest finished train run while a newer train is still running", () => {
        const runs = [run("c3", "in_progress"), run("c2", "completed", "success")];
        assert.deepEqual(pickCommit(runs, withCoverage(["c2"])), { sha: "c2", run: runs[1] });
    });

    it("ignores runs that are not trains (master pushes, the old workflow_run trigger)", () => {
        const runs = [
            run("c3", "completed", "success", "push"),
            run("c2", "completed", "success", "workflow_run"),
            run("c1", "completed", "failure", "workflow_dispatch"),
        ];
        assert.equal(pickCommit(runs, withCoverage(["c3", "c2", "c1"])).sha, "c1");
    });

    it("stops asking after maxAsk runs", () => {
        const runs = ["c4", "c3", "c2", "c1"].map((c) => run(c, "completed", "success"));
        assert.equal(pickCommit(runs, withCoverage(["c1"]), 3), null);
        assert.equal(pickCommit(runs, withCoverage(["c1"]), 4).sha, "c1");
    });

    it("skips a train that left no coverage (nothing to release, or expired)", () => {
        const runs = [
            run("c3", "completed", "success"),
            run("c2", "completed", "cancelled"),
            run("c1", "completed", "success"),
        ];
        assert.equal(pickCommit(runs, withCoverage(["c2", "c1"])).sha, "c1");
    });

    it("asks about coverage only until one run has it", () => {
        const asked = [];
        const runs = [run("c2", "completed", "success"), run("c1", "completed", "success")];
        pickCommit(runs, (r) => asked.push(r.databaseId) > 0);
        assert.deepEqual(asked, ["c2"]);
    });

    it("returns null when no train run has coverage", () => {
        assert.equal(
            pickCommit([run("c2", "queued")], () => true),
            null,
        );
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
