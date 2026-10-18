// Tests of the baseline loop's choices that decide whether a busy master still gets scanned: which
// commit it picks while newer commits' CI is still running, and how it waits for the scan lock a
// pre-push gate holds.
//
//   node --test tools/sonar/sonar-baseline.test.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { buildChild, needsScan, pickCommit, prepareAlert, scanLock, weekOverWeek } from "../sonar-baseline.mjs";

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
        // eslint-disable-next-line local/no-test-timing -- a lower bound: load only lengthens the wait, so it cannot fail spuriously
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

describe("buildChild", () => {
    it("runs the command with core files off", () => {
        const c = buildChild("sh", ["-c", "ulimit -c"]);
        const out = spawnSync(c.cmd, c.args, { encoding: "utf8" });
        assert.equal(out.stdout.trim(), "0");
    });
});

describe("prepareAlert", () => {
    const dir = mkdtempSync(join(tmpdir(), "sonar-baseline-alert-"));
    after(() => rmSync(dir, { recursive: true, force: true }));
    const stamp = join(dir, "prepare-alert");
    const calls = [];
    let ghWorks = true;
    const issues = {
        open: (why) => (calls.push(`open ${why}`), ghWorks ? 42 : null),
        close: (n) => (calls.push(`close ${n}`), ghWorks),
    };

    it("opens one issue per failure streak and closes it at the next success", () => {
        prepareAlert("build failed at c1", stamp, issues);
        prepareAlert("build failed at c2", stamp, issues);
        assert.deepEqual(calls, ["open build failed at c1"]);
        prepareAlert("", stamp, issues);
        prepareAlert("", stamp, issues);
        assert.deepEqual(calls, ["open build failed at c1", "close 42"]);
        assert.equal(existsSync(stamp), false);
    });

    it("tries again at the next poll when gh failed", () => {
        calls.length = 0;
        ghWorks = false;
        prepareAlert("build failed at c3", stamp, issues);
        assert.equal(existsSync(stamp), false);
        ghWorks = true;
        prepareAlert("build failed at c3", stamp, issues);
        assert.equal(readFileSync(stamp, "utf8"), "42\n");
        ghWorks = false;
        prepareAlert("", stamp, issues);
        assert.equal(existsSync(stamp), true, "the alert stays open until gh closes it");
        assert.equal(calls.length, 3);
    });
});

describe("weekOverWeek", () => {
    const week = (w, packages) => ({ week: w, total: Object.values(packages).reduce((a, b) => a + b, 0), packages });

    it("states each package's change since last week, and says when the total rose", () => {
        const prev = week("2026-W41", { "graph-io": 267, layout: 21, tools: 17 });
        const now = week("2026-W42", { "graph-io": 250, layout: 25, githerd: 3 });
        const { lines, rose } = weekOverWeek(prev, now);
        assert.deepEqual(lines, [
            "- Change since 2026-W41: -27 (305 to 278)",
            "  - graph-io: 250 (-17)",
            "  - layout: 25 (+4)",
            "  - githerd: 3 (new)",
            "  - tools: 0 (-17)",
        ]);
        assert.equal(rose, false);
        assert.equal(weekOverWeek(now, week("2026-W43", { "graph-io": 251, layout: 25, githerd: 3 })).rose, true);
    });

    it("lists the packages without a change on the first week recorded", () => {
        const { lines, rose } = weekOverWeek(null, week("2026-W42", { a: 1, b: 5 }));
        assert.deepEqual(lines, ["- Open issues by package (no earlier week recorded):", "  - b: 5", "  - a: 1"]);
        assert.equal(rose, false);
    });
});
