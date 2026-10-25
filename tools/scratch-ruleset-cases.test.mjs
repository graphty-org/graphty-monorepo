// Tests of the pure parts of tools/scratch-ruleset-cases.mjs: the case table, the check reading and the judge.
//   node --test tools/scratch-ruleset-cases.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";

import {
    CASES,
    REQUIRED,
    RateLimit,
    allMatched,
    cleanup,
    judge,
    latestCheck,
    observe,
    parseArgs,
    pickDependabot,
    requireOnMaster,
    resetBase,
    table,
    tryAdmin,
} from "./scratch-ruleset-cases.mjs";

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
    // A run with no start time is a queued re-run: it hides the finished one before it.
    const stale = [
        run("PR Integrity", "QUEUED", null, null),
        run("PR Integrity", "COMPLETED", "FAILURE", "2026-10-25T10:05:00Z"),
    ];
    assert.equal(latestCheck(stale, "PR Integrity"), "PENDING");
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
    assert.equal(judge({ kind: "admin" }, { kind: "refused", output: "x" }).verdict, "pass");
    assert.equal(judge({ kind: "admin" }, { kind: "skip", output: "no admin" }).verdict, "skip");
    assert.equal(judge({ kind: "admin" }, { kind: "merged", output: "" }).verdict, "fail");
    assert.equal(judge({ kind: "admin" }, { kind: "error", output: "HTTP 502" }).actual, "HTTP 502");
});

test("judge: a FAILURE case passes only on its own rule", () => {
    const failed = (...notes) => ({ ...green({ "PR Integrity": "FAILURE" }), integrityNotes: notes });
    const breaking = CASES.find((c) => c.id === "breaking-fails").expect;
    const png = CASES.find((c) => c.id === "unsigned-png-fails").expect;
    assert.equal(judge(breaking, failed("Breaking change: the title ...")).verdict, "pass");
    assert.equal(judge(breaking, failed("Fresh review: no review ...")).verdict, "fail");
    assert.equal(judge(breaking, failed("Breaking change: x", "Fresh review: y")).verdict, "fail");
    assert.equal(judge(png, failed("Baselines signed: a.png", "Fresh review: y")).verdict, "pass");
    assert.equal(judge(png, failed("Proof: none")).actual, "PR Integrity FAILURE (Proof:)");
    assert.equal(judge(png, failed()).verdict, "fail");
    // The notes are the newest PR Integrity run's annotations.
    const o = observe({
        number: 1,
        commits: {
            nodes: [
                {
                    commit: {
                        statusCheckRollup: {
                            contexts: {
                                nodes: [
                                    {
                                        ...run("PR Integrity", "COMPLETED", "FAILURE", "t1"),
                                        annotations: { nodes: [{ message: "Breaking change: x" }] },
                                    },
                                ],
                            },
                        },
                    },
                },
            ],
        },
    });
    assert.deepEqual(o.integrityNotes, ["Breaking change: x"]);
});

test("allMatched lets only the Dependabot case skip", () => {
    const rows = (admin) => [
        { id: "owned-waits", verdict: "pass" },
        { id: "dependabot-passes", verdict: "skip" },
        { id: "admin-refused", verdict: admin },
    ];
    assert.equal(allMatched(rows("pass")), true);
    assert.equal(allMatched(rows("skip")), false);
    assert.equal(allMatched(rows("fail")), false);
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

const fail = (message) => () => {
    throw new Error(message);
};

test("tryAdmin: skip without admin rights, pass only on the ruleset's refusal", () => {
    const calls = [];
    const io = (perm, merge) => ({
        gh: (args) => {
            calls.push(args[0] + " " + args[1]);
            return args[0] === "api" ? perm : merge();
        },
    });
    assert.equal(
        tryAdmin(
            7,
            io("false", () => ""),
        ).kind,
        "skip",
    );
    assert.deepEqual(calls, ["api repos/graphty-org/graphty-monorepo"]);
    const refusal =
        "gh pr merge 7 --admin --merge: GraphQL: Repository rule violations found\n\nWaiting on code owner review from graphty-org/owners. (mergePullRequest)";
    const r = tryAdmin(7, io("true", fail(refusal)));
    assert.equal(r.kind, "refused");
    assert.match(r.output, /^Repository rule violations found/u);
    for (const other of ["HTTP 502: Bad Gateway", "HTTP 401: Bad credentials", "Pull request is not mergeable"]) {
        assert.equal(tryAdmin(7, io("true", fail(other))).kind, "error", other);
    }
    assert.equal(
        tryAdmin(
            7,
            io("true", () => ""),
        ).kind,
        "merged",
    );
    assert.throws(
        () =>
            tryAdmin(7, {
                gh: () => {
                    throw new RateLimit("rate limit");
                },
            }),
        RateLimit,
    );
});

test("cleanup goes on past a rate limit and reports what it left", () => {
    const planned = [
        { branch: "b1", pr: 1 },
        { branch: "b2", pr: 2 },
        { branch: "b3", pr: 3 },
        { branch: "b4", head: "abc" },
    ];
    const closed = [];
    const deleted = [];
    const io = {
        gh: (args) => {
            if (args[2] === "1") throw new RateLimit("API rate limit exceeded");
            if (args[2] === "2") throw new Error("already merged");
            closed.push(args[2]);
        },
        deleteBranch: (b) => deleted.push(b),
    };
    const left = cleanup(planned, io);
    assert.deepEqual(closed, ["3"]);
    assert.deepEqual(deleted, ["b2", "b4"]);
    assert.deepEqual(
        left.map((p) => p.branch),
        ["b1"],
    );
    assert.deepEqual(cleanup([{ branch: "x", pr: 9 }], { gh: fail("boom"), deleteBranch: fail("gone") }).length, 1);
});

test("a base not on master is refused; --reset force-updates only the scratch ref", () => {
    const onMaster = { git: () => "" };
    requireOnMaster("aaaaaaaaaaaa", onMaster);
    assert.throws(() => requireOnMaster("bbbbbbbbbbbb", { git: fail("exit 1") }), /not on origin\/master.*--reset/u);
    const ghCalls = [];
    const sha = resetBase({ git: () => "c0ffee1234567", gh: (args) => ghCalls.push(args) });
    assert.equal(sha, "c0ffee1234567");
    assert.deepEqual(ghCalls, [
        [
            "api",
            "-X",
            "PATCH",
            "repos/graphty-org/graphty-monorepo/git/refs/heads/scratch/ruleset-trial",
            "-f",
            "sha=c0ffee1234567",
            "-F",
            "force=true",
        ],
    ]);
    assert.throws(
        () => resetBase({ git: () => "c0ffee1234567", gh: fail("Repository rule violations found") }),
        /scratch-ruleset-reset\.sh/u,
    );
    assert.equal(parseArgs(["--reset"]).reset, true);
    assert.equal(parseArgs([]).reset, false);
});

test("pickDependabot takes only a pull request of Dependabot's own commits", () => {
    const node = (number, emails, integrity = "SUCCESS") => ({
        number,
        state: "OPEN",
        merged: false,
        commits: {
            nodes: [
                {
                    commit: {
                        statusCheckRollup: { contexts: { nodes: [run("PR Integrity", "COMPLETED", integrity, "t")] } },
                    },
                },
            ],
        },
        owned: {
            nodes: emails.map((email) => ({
                commit: { author: { email }, signature: { isValid, signer: { login: committer } } },
            })),
        },
    });
    let committer = "web-flow";
    let isValid = true;
    const bot = "49699333+dependabot[bot]@users.noreply.github.com";
    const list = [node(10, [bot, "owner@example.com"]), node(9, [bot]), node(11, [bot], "PENDING")].map(observe);
    assert.equal(pickDependabot(list).number, 9);
    assert.equal(pickDependabot([node(12, [bot, "a@b.c"])].map(observe)), null);
    committer = "graphty-agent";
    assert.equal(pickDependabot([node(13, [bot])].map(observe)), null);
    committer = "web-flow";
    isValid = false;
    assert.equal(pickDependabot([node(14, [bot])].map(observe)), null);
});
