import { describe, expect, it } from "vitest";
import { blockedPrs, flakyMembers, netChange, testKey, type FlakySeen } from "../../src/collector/flaky.js";
import { GitHub } from "../../src/collector/github.js";
import type { GqlPr } from "../../src/collector/parse.js";
import { DAY, floorTo, MIN, rollKey, type TestItem } from "../../src/model/items.js";
import { putRaw } from "../../src/model/raw.js";
import { MemoryStore } from "../../src/model/store.js";

const NOW = Date.parse("2026-10-26T21:00:00Z");
const TODAY = floorTo(NOW, "1d");
const REPO = "graphty-org/graphty-monorepo";

/** A flaky.tests daily bucket holding these [family, file, test] dimensions. */
async function day(store: MemoryStore, start: number, tests: [string, string, string][]) {
    const dims = Object.fromEntries(tests.map((t) => [JSON.stringify(t), { n: 1, sum: 1 }]));
    await store.put({
        ...rollKey("flaky.tests", "1d", start),
        metric: "flaky.tests",
        step: "1d",
        start,
        n: 1,
        sum: 1,
        dims,
    });
}

const test = (inv: string, file: string, name: string, outcome: TestItem["outcome"]): TestItem => ({
    kind: "test",
    id: `${inv}#${file}#${name}`,
    attempt: 1,
    source: "ci",
    invocation: inv,
    family: "graphty",
    file,
    name,
    outcome,
    status: "fail",
    signature: "x",
    seenAt: NOW - 30 * MIN,
});

/** An open, ready pull request whose head has these failing check runs (run id in the details URL). */
const pr = (number: number, checks: { name: string; run: number }[]): GqlPr =>
    ({
        number,
        title: "t",
        state: "OPEN",
        isDraft: false,
        reviewDecision: null,
        baseRefName: "master",
        createdAt: "2026-10-26T00:00:00Z",
        updatedAt: "2026-10-26T00:00:00Z",
        mergedAt: null,
        closedAt: null,
        autoMergeRequest: null,
        labels: { nodes: [] },
        readyEvents: { nodes: [] },
        commits: {
            nodes: [
                {
                    commit: {
                        statusCheckRollup: {
                            state: "FAILURE",
                            contexts: {
                                nodes: [
                                    ...checks.map((c) => ({
                                        __typename: "CheckRun",
                                        name: c.name,
                                        conclusion: "FAILURE",
                                        startedAt: "2026-10-26T19:00:00Z",
                                        detailsUrl: `https://github.com/${REPO}/actions/runs/${c.run}/job/1`,
                                    })),
                                    { __typename: "CheckRun", name: "All Checks Pass", conclusion: "FAILURE" },
                                ],
                            },
                        },
                    },
                },
            ],
        },
    }) as GqlPr;

/** A GitHub whose issue searches answer from `open` (needles with an open issue) and `closed` (needle -> closedAt). */
function searchGitHub(open: string[], closed: Record<string, string> = {}) {
    const asked: string[] = [];
    const fetch = async (_url: string, init?: RequestInit) => {
        const { variables } = JSON.parse(String(init?.body)) as { variables: Record<string, string> };
        const data: Record<string, unknown> = {};
        for (const [k, q] of Object.entries(variables)) {
            asked.push(q);
            const hit = (n: string) => q.includes(`"${n}"`);
            data[k] = k.startsWith("o")
                ? { issueCount: open.some(hit) ? 1 : 0 }
                : { nodes: Object.entries(closed).flatMap(([n, at]) => (hit(n) ? [{ closedAt: at }] : [])) };
        }
        return new Response(JSON.stringify({ data }), { status: 200 });
    };
    return { gh: new GitHub(async () => "ghs_test", fetch), asked };
}

describe("flaky in CI with no open issue", () => {
    it("counts distinct tests seen flaky in 7 days that no open issue names", async () => {
        const store = new MemoryStore();
        await day(store, TODAY, [
            ["graphty", "a.test.ts", "suite > named in an issue"],
            ["graphty", "a.test.ts", "suite > nobody filed"],
            ["graphty-2", "a.test.ts", "suite > nobody filed"], // one test in two families
        ]);
        await day(store, TODAY - 3 * DAY, [["graphty", "b.test.ts", "also unfiled"]]);
        await day(store, TODAY - 10 * DAY, [["graphty", "c.test.ts", "older than the week"]]);
        const { gh, asked } = searchGitHub(["named in an issue"]);
        const m = await flakyMembers(store, gh, REPO, [], NOW);
        expect(m["flaky.no_issue"]).toBe(2);
        // Only this week's tests are searched, open and closed, by the last part of their name.
        expect(asked.filter((q) => q.includes("is:open"))).toHaveLength(3);
        expect(asked.some((q) => q.includes("older than the week"))).toBe(false);
        expect(asked).toContain(`repo:${REPO} is:issue in:title,body "nobody filed" is:open`);
    });

    it("is 0 when nothing was flaky, without asking GitHub", async () => {
        const { gh, asked } = searchGitHub([]);
        const m = await flakyMembers(new MemoryStore(), gh, REPO, [], NOW);
        expect(m).toEqual({
            "flaky.no_issue": 0,
            "flaky.blocked_prs": 0,
            "flaky.blocked_oldest_ms": 0,
            "flaky.net_change": 0,
        });
        expect(asked).toEqual([]);
    });
});

describe("net new flaky", () => {
    const seen = (file: string, ...days: number[]): [string, FlakySeen] => [
        testKey(file, "t"),
        { file, name: "t", days: days.map((d) => TODAY - d * DAY) },
    ];

    it("adds tests first seen this week and takes away tests quiet for 7 days or fixed since their last detection", () => {
        const history = new Map([
            seen("new.ts", 2), // new this week
            seen("new-and-fixed.ts", 1), // new, then fixed
            seen("old-still-flaky.ts", 20, 3), // neither
            seen("went-quiet.ts", 20, 9), // quiet since 9 days: resolved this week
            seen("quiet-long-ago.ts", 25), // resolved in an earlier week
            seen("fixed-then-flaky-again.ts", 20, 1), // its issue closed before the newest detection
        ]);
        const fixed = new Map([
            [testKey("new-and-fixed.ts", "t"), TODAY - DAY + 3 * 3_600_000],
            [testKey("fixed-then-flaky-again.ts", "t"), TODAY - 4 * DAY],
        ]);
        expect(netChange(history, fixed, NOW)).toBe(2 - 2);
    });

    it("reads closed issues from the search into flakyMembers", async () => {
        const store = new MemoryStore();
        await day(store, TODAY - DAY, [["graphty", "a.test.ts", "fixed one"]]);
        await day(store, TODAY, [["graphty", "b.test.ts", "still open"]]);
        const { gh } = searchGitHub(["still open"], { "fixed one": new Date(NOW - 3_600_000).toISOString() });
        const m = await flakyMembers(store, gh, REPO, [], NOW);
        expect(m["flaky.net_change"]).toBe(1); // two new, one fixed
        expect(m["flaky.no_issue"]).toBe(1);
    });
});

describe("blocked by a flake", () => {
    const flaky = new Set([testKey("a.test.ts", "flaky one"), testKey("b.test.ts", "flaky two")]);

    it("counts open pull requests red only on tests with a flaky detection, and the oldest block's age", async () => {
        const store = new MemoryStore();
        await putRaw(
            store,
            [
                test("101.1.test.graphty-1.1", "a.test.ts", "flaky one", "failed"),
                test("101.1.test.graphty-2.1", "b.test.ts", "flaky two", "failed"),
                // 102 also failed a test never seen flaky: a real failure, not a block.
                test("102.1.test.graphty-1.1", "a.test.ts", "flaky one", "failed"),
                test("102.1.test.graphty-1.1", "c.test.ts", "real failure", "failed"),
                // 103's earlier attempt failed a real test; its newest attempt only the flaky one.
                test("103.1.test.graphty-1.1", "c.test.ts", "real failure", "failed"),
                test("103.2.test.graphty-1.1", "a.test.ts", "flaky one", "failed"),
            ],
            NOW,
        );
        const open = [
            pr(1, [
                { name: "Test (graphty-1)", run: 101 },
                { name: "Test (graphty-2)", run: 101 },
            ]),
            pr(2, [{ name: "Test (graphty-1)", run: 102 }]),
            pr(3, [{ name: "Test (graphty-1)", run: 103 }]),
            pr(4, [
                { name: "Test (graphty-1)", run: 101 },
                { name: "Lint", run: 101 }, // a red check that is not a test
            ]),
            pr(5, [{ name: "Test (graphty-1)", run: 999 }]), // nothing recorded for its run
        ];
        expect(await blockedPrs(store, open, flaky, NOW)).toEqual({
            prs: [1, 3],
            oldestMs: NOW - Date.parse("2026-10-26T19:00:00Z"),
        });
    });

    it("drops a test from the run's failures once its retry passed (rewritten flaky)", async () => {
        const store = new MemoryStore();
        await putRaw(store, [test("201.1.test.graphty-1.1", "c.test.ts", "real failure", "failed")], NOW);
        const open = [pr(7, [{ name: "Test (graphty-1)", run: 201 }])];
        expect((await blockedPrs(store, open, flaky, NOW)).prs).toEqual([]);
        await putRaw(store, [test("201.1.test.graphty-1.1", "c.test.ts", "real failure", "flaky")], NOW);
        // No failed test is left in the run, so nothing says the pull request is red on a flake.
        expect((await blockedPrs(store, open, flaky, NOW)).prs).toEqual([]);
        expect((await store.query("RUNTESTS#201")).map((r) => r.outcome)).toEqual(["flaky"]);
    });
});
