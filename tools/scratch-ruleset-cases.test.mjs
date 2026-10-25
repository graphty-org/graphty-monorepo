// Tests of the pure parts of tools/scratch-ruleset-cases.mjs: the case table, the check reading and the judge.
//   node --test tools/scratch-ruleset-cases.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";

import { CASES, REQUIRED, judge, latestCheck, observe, parseArgs, table } from "./scratch-ruleset-cases.mjs";

const run = (name, status, conclusion, startedAt) => ({ __typename: "CheckRun", name, status, conclusion, startedAt });
const green = (extra = {}) => ({
    merged: false,
    state: "OPEN",
    reviewDecision: "REVIEW_REQUIRED",
    checks: { ...Object.fromEntries(REQUIRED.map((n) => [n, "SUCCESS"])), ...extra },
});

test("the case table holds the ten cases, each with an expectation", () => {
    assert.equal(CASES.length, 10);
    assert.equal(new Set(CASES.map((c) => c.id)).size, 10);
    for (const c of CASES) assert.ok(["waits", "merges", "admin", "integrity"].includes(c.expect.kind), c.id);
    const want = Object.fromEntries(CASES.filter((c) => c.expect.want).map((c) => [c.id, c.expect.want]));
    assert.deepEqual(want, {
        "revert-passes": "SUCCESS",
        "accept-only-passes": "SUCCESS",
        "dependabot-passes": "SUCCESS",
        "breaking-fails": "FAILURE",
        "unsigned-png-fails": "FAILURE",
        "master-merge-keeps-review": "SUCCESS",
        "fix-push-drops-review": "FAILURE",
    });
    const read = () => "export {};\n";
    for (const c of CASES.filter((x) => x.files)) {
        const files = c.files("20261025T1200", read, c.id);
        assert.ok(Object.keys(files).length > 0, c.id);
    }
    assert.match(CASES.find((c) => c.id === "breaking-fails").title, /^\w+\([\w-]+\)!:/u);
    assert.deepEqual(Object.keys(CASES.find((c) => c.id === "owned-waits").files("s")), [
        "tools/results/scratch-ruleset-trial-s.txt",
    ]);
});

test("latestCheck takes the newest run of a name, pending while it runs", () => {
    const contexts = [
        run("PR Integrity", "COMPLETED", "FAILURE", "2026-10-25T10:00:00Z"),
        run("PR Integrity", "COMPLETED", "SUCCESS", "2026-10-25T10:05:00Z"),
        run("Lint PR Title", "IN_PROGRESS", null, "2026-10-25T10:01:00Z"),
        { __typename: "StatusContext", context: "legacy", state: "ERROR", createdAt: "2026-10-25T10:00:00Z" },
    ];
    assert.equal(latestCheck(contexts, "PR Integrity"), "SUCCESS");
    assert.equal(latestCheck(contexts, "Lint PR Title"), "PENDING");
    assert.equal(latestCheck(contexts, "legacy"), "ERROR");
    assert.equal(latestCheck(contexts, "All Checks Pass"), null);
});

test("observe reads a poll node", () => {
    const node = {
        number: 7,
        state: "OPEN",
        merged: false,
        reviewDecision: "REVIEW_REQUIRED",
        commits: {
            nodes: [
                {
                    commit: {
                        statusCheckRollup: { contexts: { nodes: [run("PR Integrity", "COMPLETED", "SUCCESS", "t")] } },
                    },
                },
            ],
        },
    };
    const o = observe(node);
    assert.equal(o.checks["PR Integrity"], "SUCCESS");
    assert.equal(o.checks["All Checks Pass"], null);
    assert.equal(
        observe({ number: 8, state: "OPEN", merged: false, commits: { nodes: [] } }).checks["PR Integrity"],
        null,
    );
});

test("judge: waits", () => {
    const e = { kind: "waits" };
    assert.equal(judge(e, null).verdict, "pending");
    assert.equal(judge(e, green({ "All Checks Pass": "PENDING" })).verdict, "pending");
    assert.equal(judge(e, green()).verdict, "pass");
    assert.equal(judge(e, { ...green(), reviewDecision: null }).verdict, "fail");
    assert.equal(judge(e, { ...green(), merged: true }).verdict, "fail");
    assert.equal(judge(e, green({ "PR Integrity": "FAILURE" })).verdict, "fail");
});

test("judge: merges", () => {
    const e = { kind: "merges" };
    assert.equal(judge(e, { ...green(), merged: true }).verdict, "pass");
    assert.equal(judge(e, green({ "All Checks Pass": "PENDING" })).verdict, "pending");
    assert.equal(judge(e, green({ "Link PR Issue": "FAILURE" })).verdict, "fail");
    assert.equal(judge(e, { ...green(), state: "CLOSED" }).verdict, "fail");
});

test("judge: integrity and admin", () => {
    assert.equal(judge({ kind: "integrity", want: "FAILURE" }, green({ "PR Integrity": "FAILURE" })).verdict, "pass");
    assert.equal(judge({ kind: "integrity", want: "SUCCESS" }, green({ "PR Integrity": "FAILURE" })).verdict, "fail");
    assert.equal(
        judge({ kind: "integrity", want: "SUCCESS" }, green({ "PR Integrity": "PENDING" })).verdict,
        "pending",
    );
    assert.equal(judge({ kind: "integrity", want: "SUCCESS" }, green({ "PR Integrity": null })).verdict, "pending");
    assert.equal(judge({ kind: "admin" }, { refused: true, output: "x" }).verdict, "pass");
    assert.equal(judge({ kind: "admin" }, { refused: false, output: "" }).verdict, "fail");
});

test("table is plain ASCII with one row per case", () => {
    const out = table([
        { id: "a", pr: 1, expected: "merged", actual: "merged", verdict: "pass" },
        { id: "bb", expected: "PR Integrity SUCCESS", actual: "never observed", verdict: "pending" },
    ]);
    const lines = out.split("\n");
    assert.equal(lines.length, 4);
    assert.match(lines[2], /^a +\| #1 +\| merged/u);
    assert.match(lines[3], /^bb +\| - /u);
    assert.ok(/^[\x20-\x7e\n]*$/u.test(out));
});

test("parseArgs keeps the poll at 5 minutes or slower", () => {
    assert.equal(parseArgs(["--interval", "60"]).interval, 300);
    assert.equal(parseArgs(["--interval", "600"]).interval, 600);
    assert.equal(parseArgs(["--dry-run", "--post"]).dryRun, true);
    assert.throws(() => parseArgs(["--bogus"]));
    assert.throws(() => parseArgs(["--max-hours", "0"]));
});
