// Tests of tools/health-owner-sweep.mjs on a recorded status API answer (2026-10-30 14:08Z, trimmed to what the sweep
// reads: tools/fixtures/health-owner-sweep/) and a GitHub answer written here.
// Run: node tools/health-owner-sweep.test.mjs
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
    branchQuery,
    issueNumbers,
    liveness,
    notOkMembers,
    ownerQuery,
    sessionAlive,
    sweep,
    tableRows,
    takenSession,
} from "./health-owner-sweep.mjs";

const fixture = (f) => JSON.parse(readFileSync(new URL(`fixtures/health-owner-sweep/${f}`, import.meta.url), "utf8"));
const status = fixture("status.json");
const pages = fixture("pages.json");
const NOW = Date.parse("2026-10-30T14:10:00Z");
const HOUR = 3_600_000;
const at = (h) => new Date(NOW - h * HOUR).toISOString();
// an open issue created h hours ago, with its comments and the open pull requests closing it
const issue = (number, h, prs = [], comments = []) => ({
    __typename: "Issue",
    number,
    state: "OPEN",
    createdAt: at(h),
    comments: { nodes: comments.map((body) => ({ body, createdAt: at(2) })) },
    closedByPullRequestsReferences: { nodes: prs },
});
// an open pull request whose last commit is h hours old with checks in the given state
const pr = (number, h = 100, checks = "SUCCESS", mergeable = "MERGEABLE") => ({
    __typename: "PullRequest",
    number,
    state: "OPEN",
    mergeable,
    commits: { nodes: [{ commit: { committedDate: at(h), statusCheckRollup: { state: checks } } }] },
});
const branch = (name, h) => ({ name, target: { committedDate: at(h) } });
const STATUS = "pipeline-round: taken by session s-1, branch fix/1-x, worktree .worktrees/1-x -- next bug";

describe("the not-ok members", () => {
    it("are every category's setBy and others that are bad or warn, with their open episode's start", () => {
        const m = notOkMembers(status);
        assert.deepEqual(
            m.map((x) => x.id),
            [
                "pull-requests.oldest_open",
                "ci.chronic_jobs",
                "ci.bins_over",
                "costs.llm",
                "costs.spend",
                "costs.t4",
                "data-sources.stress_run",
            ],
        );
        assert.equal(m.find((x) => x.id === "ci.chronic_jobs").since, "2026-10-29T14:10:00.000Z");
    });
});

describe("the owned tables", () => {
    it("read each row's issue or pull request from its cells; a row with no issue has no refs", () => {
        const rows = tableRows(pages);
        const chronic = rows.filter((r) => r.table === "ci/chronic");
        assert.deepEqual(
            chronic.map((r) => [r.label, r.refs.map((x) => x.n)]),
            [
                ["Story tests (graphty-element)", []],
                ["Performance Benchmarks", [4554]],
                ["Test (graphty-element-lifecycle)", []],
            ],
        );
        const owner = rows.filter((r) => r.table === "pull-requests/owner");
        assert.deepEqual(
            owner.map((r) => r.refs),
            [[{ kind: "pr", n: 1677 }], [{ kind: "pr", n: 1941 }], [{ kind: "pr", n: 2013 }]],
        );
    });
});

describe("one GraphQL query", () => {
    it("asks about every referenced number once and searches open issues per member", () => {
        const q = ownerQuery("graphty-org/graphty-monorepo", [4554, 1677, 4554], ["ci.chronic_jobs"]);
        assert.equal(q.match(/n4554:/g).length, 1);
        assert.match(q, /m0: search\(query: "repo:graphty-org\/graphty-monorepo is:open \\"ci\.chronic_jobs\\""/);
    });
});

describe("the second query", () => {
    it("asks once per owning issue for the branches holding its number", () => {
        const gql = {
            repository: { n1: issue(1, 1), n2: pr(2) },
            m0: { nodes: [issue(3, 1), issue(1, 1)] },
        };
        assert.deepEqual(issueNumbers(gql), [1, 3]);
        const q = branchQuery("graphty-org/graphty-monorepo", [1, 3]);
        assert.match(q, /b1: refs\(refPrefix: "refs\/heads\/", query: "1"/);
        assert.match(q, /b3: refs\(/);
    });
});

describe("liveness (#5857: only real work counts)", () => {
    it("a fresh issue whose only activity is comments is idle, not live", () => {
        // the old rule called this live: it was updated (by the comment) in the last 24 hours
        const l = liveness({ ...issue(1, 40, [], [STATUS]), updatedAt: at(1) }, NOW);
        assert.equal(l.live, false);
        assert.equal(l.idle, true);
        assert.equal(l.why, "owned, idle 40 h");
    });
    it("a commit in 24 hours on a branch naming the issue is live; another number's branch is not", () => {
        const branches = { b57: { nodes: [branch("fix/5857-x", 1), branch("fix/57-y", 30)] } };
        assert.equal(liveness(issue(57, 40), NOW, { branches }).live, false, "5857 is not 57");
        assert.equal(liveness(issue(57, 40), NOW, { branches }).why, "owned, idle 30 h");
        const fresh = { b57: { nodes: [branch("fix/57-y", 3)] } };
        assert.deepEqual(liveness(issue(57, 40), NOW, { branches: fresh }), {
            live: true,
            why: "open, commit 3 h ago on fix/57-y",
        });
    });
    it("an open pull request is live when green or with a commit in 24 hours, not when red, conflicted and old", () => {
        assert.equal(liveness(pr(2, 100), NOW).live, true);
        assert.equal(liveness(pr(2, 3, "FAILURE"), NOW).live, true);
        assert.equal(liveness(pr(2, 50, "FAILURE"), NOW).live, false);
        assert.equal(liveness(pr(2, 50, "SUCCESS", "CONFLICTING"), NOW).why, "owned, idle 50 h");
        assert.equal(liveness(issue(1, 30, [pr(2, 100)]), NOW).live, true);
        assert.equal(liveness(issue(1, 30, [pr(2, 50, "FAILURE")]), NOW).live, false);
    });
    it("a taken marker counts while its session is alive and until a released marker", () => {
        const alive = (s) => s === "s-1";
        assert.equal(liveness(issue(1, 40, [], [STATUS]), NOW, { alive }).live, true);
        assert.equal(liveness(issue(1, 40, [], [STATUS]), NOW, { alive: () => false }).live, false);
        assert.equal(takenSession(issue(1, 1, [], [STATUS, "pipeline-round: released -- stale"]), NOW), null);
        assert.equal(takenSession(issue(1, 1, [], ["pipeline-round: released -- x", STATUS, "status"]), NOW), "s-1");
        // a finished job whose loop session still runs: the later marker ends the claim
        assert.equal(
            takenSession(issue(1, 1, [], [STATUS, "pipeline-round: no pull request -- nothing wrong"]), NOW),
            null,
        );
        const old = issue(1, 40, [], [STATUS]);
        old.comments.nodes[0].createdAt = at(30);
        assert.equal(liveness(old, NOW, { alive }).live, false, "a claim older than a day is not work");
    });
    it("closed or missing is no owner", () => {
        assert.equal(liveness({ ...issue(1, 1), state: "CLOSED" }, NOW).live, false);
        assert.equal(liveness(null, NOW).live, false);
    });
    it("a session is alive only when its pid runs with the recorded start time", () => {
        const dir = mkdtempSync(join(tmpdir(), "owner-sweep-"));
        const start = readFileSync("/proc/self/stat", "utf8").split(") ")[1].split(" ")[19];
        writeFileSync(join(dir, "a.json"), JSON.stringify({ sessionId: "me", pid: process.pid, procStart: start }));
        writeFileSync(join(dir, "b.json"), JSON.stringify({ sessionId: "old", pid: process.pid, procStart: "1" }));
        assert.equal(sessionAlive("me", dir), true);
        assert.equal(sessionAlive("old", dir), false, "a reused pid");
        assert.equal(sessionAlive("gone", dir), false);
        assert.equal(sessionAlive("me", join(dir, "missing")), false);
    });
});

describe("the sweep", () => {
    it("names every member and row without a live owner and counts them", () => {
        const members = notOkMembers(status).map((m) => m.id);
        const gql = Object.fromEntries(members.map((_, i) => [`m${i}`, { nodes: [] }]));
        gql.m1 = { nodes: [issue(4600, 30)] }; // ci.chronic_jobs: a branch with a fresh commit
        gql.m2 = { nodes: [{ ...issue(4700, 30, [], [STATUS]), updatedAt: at(1) }] }; // ci.bins_over: status comments only
        gql.m3 = { nodes: [issue(4486, 40, [pr(4490, 2, "FAILURE")])] }; // costs.llm: an open fix
        gql.repository = { n4554: issue(4554, 50), n1677: pr(1677), n1941: pr(1941), n2013: pr(2013) };
        const branches = { b4600: { nodes: [branch("fix/4600-chronic", 2)] } };
        const r = sweep({ status, pages, gql, branches, alive: () => false, now: NOW });
        const text = r.lines.join("\n");
        assert.match(
            text,
            /^owned {3}member ci\.chronic_jobs bad for 24 h: #4600 \(open, commit 2 h ago on fix\/4600-/m,
        );
        assert.match(text, /^IDLE {4}member ci\.bins_over warn for \d+ h: #4700 \(owned, idle 30 h\)$/m);
        assert.match(
            text,
            /^owned {3}member costs\.llm bad for \d+ h: #4486 \(open, pull request #4490 commit 2 h ago\)$/m,
        );
        assert.match(text, /^NO OWNER member costs\.t4 bad for \d+ h: no issue or pull request names it$/m);
        assert.match(text, /^NO OWNER ci\/chronic "Story tests \(graphty-element\)": no issue in its row$/m);
        assert.match(text, /^IDLE {4}ci\/chronic "Performance Benchmarks": #4554 \(owned, idle 50 h\)$/m);
        assert.match(text, /^owned {3}pull-requests\/owner "feat!: one major/m);
        // 7 members (2 owned) and 6 rows (3 owned)
        assert.equal(r.unowned, 8);
        assert.match(r.lines.at(-1), /^8 of 13 not-ok members and rows have no live owner$/);
    });
    it("says all owned when every one has a live owner", () => {
        const empty = { categories: [], episodes: [] };
        const r = sweep({ status: empty, pages: {}, gql: {}, now: NOW });
        assert.equal(r.unowned, 0);
        assert.equal(r.lines.at(-1), "0 members not ok, 0 rows, all owned");
    });
});
