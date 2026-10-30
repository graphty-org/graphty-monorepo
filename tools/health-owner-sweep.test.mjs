// Tests of tools/health-owner-sweep.mjs on a recorded status API answer (2026-10-30 14:08Z, trimmed to what the sweep
// reads: tools/fixtures/health-owner-sweep/) and a GitHub answer written here.
// Run: node tools/health-owner-sweep.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { liveness, notOkMembers, ownerQuery, sweep, tableRows } from "./health-owner-sweep.mjs";

const fixture = (f) => JSON.parse(readFileSync(new URL(`fixtures/health-owner-sweep/${f}`, import.meta.url), "utf8"));
const status = fixture("status.json");
const pages = fixture("pages.json");
const NOW = Date.parse("2026-10-30T14:10:00Z");
const HOUR = 3_600_000;
const at = (h) => new Date(NOW - h * HOUR).toISOString();
const issue = (number, h, prs = []) => ({
    __typename: "Issue",
    number,
    state: "OPEN",
    updatedAt: at(h),
    closedByPullRequestsReferences: { nodes: prs },
});
const pr = (number) => ({ __typename: "PullRequest", number, state: "OPEN", updatedAt: at(100) });

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

describe("liveness", () => {
    it("open and touched in 24 hours, an open pull request, or an issue with an open pull request", () => {
        assert.equal(liveness(issue(1, 3), NOW).live, true);
        assert.equal(liveness(issue(1, 30), NOW).live, false, "'should age out' is not an owner");
        assert.equal(liveness(issue(1, 30, [{ state: "OPEN" }]), NOW).live, true);
        assert.equal(liveness(pr(2), NOW).live, true);
        assert.equal(liveness({ ...issue(1, 1), state: "CLOSED" }, NOW).live, false);
        assert.equal(liveness(null, NOW).live, false);
    });
});

describe("the sweep", () => {
    it("names every member and row without a live owner and counts them", () => {
        const members = notOkMembers(status).map((m) => m.id);
        const gql = Object.fromEntries(members.map((_, i) => [`m${i}`, { nodes: [] }]));
        gql.m1 = { nodes: [issue(4600, 2)] }; // ci.chronic_jobs: a fresh issue
        gql.m3 = { nodes: [issue(4486, 40, [{ state: "OPEN" }])] }; // costs.llm: an open fix
        gql.repository = { n4554: issue(4554, 50), n1677: pr(1677), n1941: pr(1941), n2013: pr(2013) };
        const r = sweep({ status, pages, gql, now: NOW });
        const text = r.lines.join("\n");
        assert.match(text, /^owned {3}member ci\.chronic_jobs bad for 24 h: #4600 \(open, updated 2 h ago\)$/m);
        assert.match(text, /^owned {3}member costs\.llm bad for \d+ h: #4486 \(open, with an open pull request\)$/m);
        assert.match(text, /^NO OWNER member costs\.t4 bad for \d+ h: no issue or pull request names it$/m);
        assert.match(text, /^NO OWNER ci\/chronic "Story tests \(graphty-element\)": no issue in its row$/m);
        assert.match(text, /^NO OWNER ci\/chronic "Performance Benchmarks": #4554 \(open, but untouched 50 h\)$/m);
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
