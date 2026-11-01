import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
    blockedPrs,
    flakyMembers,
    namesTest,
    netChange,
    testKey,
    type FlakySeen,
    type IssueText,
} from "../../src/collector/flaky.js";
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

const testItem = (inv: string, file: string, name: string, outcome: TestItem["outcome"]): TestItem => ({
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

/** An issue whose title names a test the way the quarantine files them: "Flaky test: <file> > <name>". */
const filed = (file: string, name: string, closedAt?: string): IssueText => ({
    title: `Flaky test: ${file} > ${name}`,
    body: "",
    ...(closedAt ? { closedAt } : {}),
});

/**
 * A GitHub whose flaky issue search answers `open` and `closed` in pages of 100, as GitHub does, and keeps each
 * search it was asked (once, however many pages it read).
 */
function searchGitHub(open: IssueText[], closed: IssueText[] = []) {
    const asked: string[] = [];
    const fetch = async (_url: string, init?: RequestInit) => {
        const { variables } = JSON.parse(String(init?.body)) as { variables: { q: string; after: string | null } };
        const from = Number(variables.after ?? 0);
        if (!from) asked.push(variables.q);
        const all = variables.q.includes("is:open") ? open : closed;
        const s = {
            nodes: all.slice(from, from + 100),
            pageInfo: { hasNextPage: from + 100 < all.length, endCursor: String(from + 100) },
        };
        return new Response(JSON.stringify({ data: { s } }), { status: 200 });
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
        const { gh, asked } = searchGitHub([filed("a.test.ts", "named in an issue")]);
        const m = await flakyMembers(store, gh, REPO, [], NOW);
        expect(m["flaky.no_issue"]).toBe(2);
        // Two searches: the open flaky issues, and those closed as fixed since the week began.
        expect(asked).toEqual([
            `repo:${REPO} is:issue flaky is:open`,
            `repo:${REPO} is:issue flaky is:closed reason:completed closed:>=${new Date(TODAY - 6 * DAY).toISOString().slice(0, 10)}`,
        ]);
    });

    it("reads every page of open flaky issues, so an issue past the first 100 still counts", async () => {
        // 2026-10-30: about 147 "Flaky in full run" issues filed at once pushed #4414 and #4547 off the first page.
        const store = new MemoryStore();
        await day(store, TODAY, [["graphty", "LocationMap.real-element.test.tsx", "chooses the map in the Map form"]]);
        const storm = Array.from({ length: 150 }, (_, i) =>
            filed(`fidelity-${i}.stories.ts`, "drew a different picture"),
        );
        const { gh } = searchGitHub([
            ...storm,
            filed("LocationMap.real-element.test.tsx", "chooses the map in the Map form"),
        ]);
        const m = await flakyMembers(store, gh, REPO, [], NOW);
        expect(m["flaky.no_issue"]).toBe(0);
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

describe("the six flaky issues of 2026-10-26", () => {
    // Read once from GitHub (number, title, state, stateReason, closedAt, body), as the search returns them.
    const issues = JSON.parse(
        readFileSync(new URL("../fixtures/github/flaky-issues.json", import.meta.url), "utf8"),
    ) as (IssueText & { number: number; state: string })[];
    const issue = (n: number) => issues.find((i) => i.number === n)!;
    // The test each issue is about, as the flaky.tests rollup names it.
    const tests: [number, string, string][] = [
        [3765, "graphty/src/workspace/graph-place/GraphPlace.stories.tsx", "Find No Match"],
        [3766, "graphty/src/workspace/start/StartScreen.stories.tsx", "Settings Privacy"],
        [
            3767,
            "graphty/src/workspace/canvas/__tests__/LegendCard.real-element.test.tsx",
            "the canvas key on the real element > at 900 x 700 leaves the drawing at least half the canvas's width",
        ],
        [
            3762, // a whole-file failure: the name is the file's path in its package
            "graphty/src/workspace/layout/__tests__/LayoutSeed.real-element.test.tsx",
            "src/workspace/layout/__tests__/LayoutSeed.real-element.test.tsx",
        ],
        [
            3768,
            "visual-review/test/capture-run.test.mjs",
            "capture run > classifies new, unchanged, excluded, failed, and a story newly excluded by its parameters",
        ],
        [
            3754,
            "graphty/src/workspace/canvas/__tests__/FramingIgnoresOverlays.real-element.test.tsx",
            "the drawing is framed in the canvas alone > lands a layout change on the bare canvas's fit, whenever the key card comes up",
        ],
    ];

    it("each names its own test and no other", () => {
        for (const [n, file, name] of tests)
            for (const [m] of tests) expect(namesTest(issue(m), { file, name }), `#${m} names ${name}`).toBe(m === n);
    });

    it("counts none of them as having no issue: three are open, three were closed as fixed after their last detection", async () => {
        const store = new MemoryStore();
        // Last seen the day before the closed issues were closed (2026-10-26).
        await day(
            store,
            TODAY - DAY,
            tests.map(([, file, name]) => ["graphty", file, name]),
        );
        const open = issues.filter((i) => i.state === "OPEN");
        const closed = issues.filter((i) => i.state === "CLOSED");
        expect(open).toHaveLength(3);
        const m = await flakyMembers(store, searchGitHub(open, closed).gh, REPO, [], NOW);
        expect(m["flaky.no_issue"]).toBe(0);
        // Seen again after the fix: the closed issues no longer count, so those three have no open issue.
        await day(
            store,
            TODAY + DAY,
            tests.map(([, file, name]) => ["graphty", file, name]),
        );
        const later = await flakyMembers(store, searchGitHub(open, closed).gh, REPO, [], NOW + DAY);
        expect(later["flaky.no_issue"]).toBe(3);
    });
});

describe("the quarantine issues of 2026-10-27", () => {
    // Read once from GitHub. Their titles cut the test's name short; only the body names it whole.
    const issues = JSON.parse(
        readFileSync(new URL("../fixtures/github/flaky-quarantine-issues.json", import.meta.url), "utf8"),
    ) as (IssueText & { number: number })[];
    const tests: [number, string, string][] = [
        [
            3981,
            "graphty/src/workspace/data-place/__tests__/Fields.real-element.test.tsx",
            "Data > Fields as a + list on the real element > lists the airline sample's label, location and weight with no action from the reader",
        ],
        [
            3982,
            "graphty/src/workspace/start/__tests__/open-doors.real-element.test.tsx",
            "the loading doors on the real element > reads a node file and an edge file dropped together as one load, with its problems",
        ],
    ];

    it("each names its own test by the body when the title is cut short", () => {
        for (const [n, file, name] of tests) {
            for (const i of issues) {
                expect(namesTest(i, { file, name }), `#${i.number} names ${name}`).toBe(i.number === n);
            }
        }
    });

    it("counts neither as having no issue while its issue is open", async () => {
        const store = new MemoryStore();
        await day(
            store,
            TODAY,
            tests.map(([, file, name]) => ["graphty", file, name]),
        );
        const m = await flakyMembers(store, searchGitHub(issues, []).gh, REPO, [], NOW);
        expect(m["flaky.no_issue"]).toBe(0);
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
        const { gh } = searchGitHub(
            [filed("b.test.ts", "still open")],
            [filed("a.test.ts", "fixed one", new Date(NOW - 3_600_000).toISOString())],
        );
        const m = await flakyMembers(store, gh, REPO, [], NOW);
        expect(m["flaky.net_change"]).toBe(1); // two new, one fixed
        expect(m["flaky.no_issue"]).toBe(0); // one open issue, one closed as fixed after its last detection
    });
});

describe("blocked by a flake", () => {
    const flaky = new Set([testKey("a.test.ts", "flaky one"), testKey("b.test.ts", "flaky two")]);

    it("counts open pull requests red only on tests with a flaky detection, and the oldest block's age", async () => {
        const store = new MemoryStore();
        await putRaw(
            store,
            [
                testItem("101.1.test.graphty-1.1", "a.test.ts", "flaky one", "failed"),
                testItem("101.1.test.graphty-2.1", "b.test.ts", "flaky two", "failed"),
                // 102 also failed a test never seen flaky: a real failure, not a block.
                testItem("102.1.test.graphty-1.1", "a.test.ts", "flaky one", "failed"),
                testItem("102.1.test.graphty-1.1", "c.test.ts", "real failure", "failed"),
                // 103's earlier attempt failed a real test; its newest attempt only the flaky one.
                testItem("103.1.test.graphty-1.1", "c.test.ts", "real failure", "failed"),
                testItem("103.2.test.graphty-1.1", "a.test.ts", "flaky one", "failed"),
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
        await putRaw(store, [testItem("201.1.test.graphty-1.1", "c.test.ts", "real failure", "failed")], NOW);
        const open = [pr(7, [{ name: "Test (graphty-1)", run: 201 }])];
        expect((await blockedPrs(store, open, flaky, NOW)).prs).toEqual([]);
        await putRaw(store, [testItem("201.1.test.graphty-1.1", "c.test.ts", "real failure", "flaky")], NOW);
        // No failed test is left in the run, so nothing says the pull request is red on a flake.
        expect((await blockedPrs(store, open, flaky, NOW)).prs).toEqual([]);
        expect((await store.query("RUNTESTS#201")).map((r) => r.outcome)).toEqual(["flaky"]);
    });
});
