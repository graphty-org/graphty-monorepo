import { describe, expect, it } from "vitest";

import { type GhJob, type GhRun, type GqlPr, prStocks } from "../../src/collector/parse.js";
import {
    failingChecks,
    failureCause,
    nextHolders,
    nextShared,
    SNAPSHOT,
    stacks,
    supersededRuns,
    testSignatures,
} from "../../src/collector/snapshots.js";
import { setCursor } from "../../src/model/raw.js";
import { recompute } from "../../src/model/rollup.js";
import { MemoryStore } from "../../src/model/store.js";
import { SLAS } from "../../src/sla/config.js";
import { evaluate } from "../../src/sla/engine.js";
import { Reads } from "../../src/views/members.js";
import { shared } from "../../src/views/sections.js";
import { HOUR, MIN, T0 } from "../model/helpers.js";

const at = (ms: number) => new Date(ms).toISOString();

const ghRun = (id: number, over: Partial<GhRun> = {}): GhRun => ({
    id,
    name: "CI",
    path: ".github/workflows/ci.yml",
    head_branch: "fix/x",
    head_sha: "old",
    event: "pull_request",
    status: "completed",
    conclusion: "failure",
    run_attempt: 1,
    created_at: at(T0 - 20 * MIN),
    updated_at: at(T0 - 5 * MIN),
    pull_requests: [{ number: id }],
    ...over,
});

const ghJob = (name: string, over: Partial<GhJob> = {}): GhJob => ({
    id: 1,
    run_id: 1,
    run_attempt: 1,
    name,
    status: "completed",
    conclusion: "success",
    created_at: at(T0 - 20 * MIN),
    started_at: at(T0 - 19 * MIN),
    completed_at: at(T0 - 5 * MIN),
    labels: ["ubuntu-latest"],
    ...over,
});

const gqlPr = (number: number, failing: string[], over: Partial<GqlPr> = {}): GqlPr => ({
    number,
    title: `pr ${number}`,
    state: "OPEN",
    isDraft: false,
    reviewDecision: null,
    baseRefName: "master",
    createdAt: at(T0 - 2 * HOUR),
    updatedAt: at(T0 - MIN),
    mergedAt: null,
    closedAt: null,
    autoMergeRequest: null,
    labels: { nodes: [] },
    readyEvents: { nodes: [] },
    commits: {
        nodes: [
            {
                commit: {
                    oid: "new",
                    committedDate: at(T0 - 10 * MIN),
                    statusCheckRollup: {
                        state: failing.length ? "FAILURE" : "SUCCESS",
                        contexts: {
                            nodes: failing.map((name) => ({
                                __typename: "CheckRun",
                                name,
                                conclusion: "FAILURE",
                                startedAt: at(T0 - 30 * MIN),
                            })),
                        },
                    },
                },
            },
        ],
    },
    ...over,
});

/** Gives every failing check of `p` the failure signature `sig` (what collect.ts failureSignatures fills in). */
const signed = (p: GqlPr, sig: string): GqlPr => {
    for (const c of p.commits!.nodes[0].commit.statusCheckRollup!.contexts.nodes) {
        c.signatures = [sig];
    }
    return p;
};

/** An open pull request whose "Checks" job failed with signature `sig`, with its head and the commits under it. */
const checksAt = (number: number, sig: string, head: string, under: string[] = []): GqlPr =>
    signed(
        gqlPr(number, ["Checks"], {
            headRefOid: head,
            stackCommits: { nodes: [...under, head].map((oid) => ({ commit: { oid } })) },
        }),
        sig,
    );

describe("snapshots", () => {
    // Issue #5405, as the dashboard read it at 2026-11-01 06:30Z: #5394 merges #5393's branch and both fail the
    // pipeline-round skill test in "CI workflow tests"; #4516 fails "No committed walk screenshots".
    const issue5405 = [
        checksAt(5393, "CI workflow tests", "a5393"),
        checksAt(5394, "CI workflow tests", "a5394", ["a5393"]),
        checksAt(4516, "No committed walk screenshots", "a4516"),
    ];

    it("finds no shared cause in different failures of one job and in a stack of pull requests (#5405)", () => {
        expect(nextShared(undefined, issue5405, [], T0).rows).toEqual([]);
        expect(prStocks(issue5405, T0).maxFailingSameCheck).toBe(1);
        expect(stacks(issue5405)).toEqual(
            new Map([
                [5393, 5393],
                [5394, 5393],
                [4516, 4516],
            ]),
        );
    });

    it("shares a failure signature in three unrelated pull requests, under the check, naming the signature", () => {
        const open = [1, 2, 3].map((n) => checksAt(n, "CI workflow tests", `h${n}`));
        const { rows } = nextShared(undefined, open, [], T0);
        expect(rows.map((r) => [r.check, r.signature])).toEqual([["Checks", "CI workflow tests"]]);
        const jobs = (name: string) => [ghJob(name, { conclusion: "failure" })];
        const shared = new Set(rows.map((r) => r.check));
        expect(failureCause(ghRun(1), jobs("Checks"), new Set(), shared)).toBe("shared_check");
        expect(failureCause(ghRun(1), jobs("Lint"), new Set(), shared)).toBe("change");
    });

    // Issue #6177, as the dashboard read it at 2026-11-07 06:00Z: three pull requests failed "Checks" each for its own
    // defect (a knip heap crash, a missing API report, an unused export).
    const issue6177 = [
        checksAt(6117, "FATAL ERROR: Reached heap limit Allocation failed", "a6117"),
        checksAt(6154, "graphty-element/api/index.api.md is out of date", "a6154"),
        checksAt(6157, "Unused exports (1): offeredChannels", "a6157"),
    ];

    it("does not share one job failing with three different signatures (#6177)", () => {
        expect(prStocks(issue6177, T0).maxFailingSameCheck).toBe(1);
        expect(nextShared(undefined, issue6177, [], T0).rows).toEqual([]);
    });

    it("counts a job failing with no signature as each pull request's own", () => {
        const open = [1, 2, 3].map((n) => gqlPr(n, ["Checks"]));
        expect(prStocks(open, T0).maxFailingSameCheck).toBe(1);
        expect(nextShared(undefined, open, [], T0).rows).toEqual([]);
    });

    it("shares two pull requests failing a job with the same signature", () => {
        const open = [...issue6177, checksAt(6160, "Unused exports (1): offeredChannels", "a6160")];
        expect(prStocks(open, T0).maxFailingSameCheck).toBe(2);
    });

    it("reads master.same_check and the shared section from one grouping, so they never disagree (#6177)", async () => {
        const twoAlike = [...issue6177, checksAt(6160, "Unused exports (1): offeredChannels", "a6160")];
        const cases: [GqlPr[], ReadonlySet<string> | undefined][] = [
            [issue6177, undefined],
            [issue5405, undefined],
            [twoAlike, undefined],
            [[...issue6177, gqlPr(6161, ["Checks"])], new Set(["Checks"])],
        ];
        for (const [open, master] of cases) {
            const member = prStocks(open, T0, master).maxFailingSameCheck;
            const { rows } = nextShared(undefined, open, [], T0, master);
            const ongoing = rows.filter((r) => r.end === undefined && !r.alone);
            // The member is over its target (<= 1) exactly when the section has a row, and the row names as many.
            expect(member > 1).toBe(ongoing.length > 0);
            expect(Math.max(1, ...ongoing.map((r) => r.prs.length))).toBe(Math.max(1, member));
        }
        // Three pull requests failing Checks with different signatures: member 1 (ok), section "no shared failure".
        expect(prStocks(issue6177, T0).maxFailingSameCheck).toBe(1);
        const store = new MemoryStore();
        await setCursor(store, SNAPSHOT.shared, JSON.stringify(nextShared(undefined, issue6177, [], T0)), T0);
        await recompute(store, T0);
        const view = await shared(new Reads(store, T0, await evaluate(store, T0), SLAS));
        expect(view).toMatchObject({ kind: "empty", fact: { code: "master.no_shared" } });
        // Two pull requests failing it the same way: member 2 (warn), and the section shows them.
        expect(nextShared(undefined, twoAlike, [], T0).rows).toMatchObject([
            { check: "Checks", signature: "Unused exports (1): offeredChannels", prs: [6160, 6157] },
        ]);
    });

    it("shares every pull request failing a job master's newest build fails too, whatever their signatures", () => {
        const master = new Set(["Checks"]);
        const open = [...issue6177, gqlPr(6161, ["Checks"])];
        expect(prStocks(open, T0, master).maxFailingSameCheck).toBe(4);
        const { rows } = nextShared(undefined, open, [], T0, master);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ check: "Checks", master: true, prs: [6161, 6157, 6154, 6117] });
        expect(rows[0].signature).toBeUndefined();
    });

    it("reads a shard check's signatures from its run's newest attempt, failed tests of that shard only", () => {
        const row = (attempt: number, shard: string, file: string, outcome = "failed") => ({
            sk: `${attempt}#9.${attempt}.test.${shard}.1#${file}#t`,
            invocation: `9.${attempt}.test.${shard}.1`,
            file,
            name: "t",
            outcome,
        });
        const rows = [
            row(1, "layout-2", "old.test.ts"),
            row(2, "layout-2", "a.test.ts"),
            row(2, "layout-2", "b.test.ts", "flaky"),
            row(2, "layout-3", "c.test.ts"),
        ];
        expect(testSignatures(rows, "Test (layout-2)")).toEqual(["a.test.ts > t"]);
        expect(testSignatures(rows, "Checks")).toEqual([]);
    });

    it("groups a test failing in two bins of one family by the test", () => {
        const sig = "layout/test/a.test.ts > lays out";
        const open = [
            signed(gqlPr(1, ["Test (layout-1)"]), sig),
            signed(gqlPr(2, ["Test (layout-2)"]), sig),
            signed(gqlPr(3, ["Test (layout-2)"]), "layout/test/b.test.ts > other"),
        ];
        expect(prStocks(open, T0).maxFailingSameCheck).toBe(2);
    });

    it("classifies a failed first attempt: infrastructure, aggregator alone, shared check, the change", () => {
        const jobs = [ghJob("Lint", { conclusion: "failure" })];
        expect(failureCause(ghRun(1, { conclusion: "startup_failure" }), [], new Set(), new Set())).toBe(
            "infrastructure",
        );
        expect(failureCause(ghRun(1), jobs, new Set(["Lint"]), new Set())).toBe("infrastructure");
        expect(
            failureCause(ghRun(1), [ghJob("All Checks Pass", { conclusion: "failure" })], new Set(), new Set()),
        ).toBe("shared_aggregator");
        expect(failureCause(ghRun(1), jobs, new Set(), new Set(["Lint"]))).toBe("shared_check");
        expect(failureCause(ghRun(1), jobs, new Set(), new Set())).toBe("change");
        expect(failureCause(ghRun(1, { run_attempt: 2 }), jobs, new Set(), new Set())).toBeUndefined();
        expect(failureCause(ghRun(1, { conclusion: "success" }), [], new Set(), new Set())).toBeUndefined();
    });

    it("keeps a shared check's start, names the master merges before it as suspects, and ends it when it clears", () => {
        const failing = [1, 2, 3].map((n) => signed(gqlPr(n, ["Lint"]), "src/a.ts: no-unused-vars"));
        const merged = gqlPr(9, [], { state: "MERGED", mergedAt: at(T0 - HOUR) });
        const first = nextShared(undefined, [...failing, gqlPr(4, ["Docs"])], [merged], T0);
        expect(first.rows).toHaveLength(1);
        expect(first.rows[0]).toMatchObject({
            check: "Lint",
            signature: "src/a.ts: no-unused-vars",
            prs: [3, 2, 1],
            since: T0 - 30 * MIN,
            alone: false,
        });
        expect(first.rows[0].suspects.map((m) => m.pr)).toEqual([9]);
        const later = nextShared(first, failing.slice(0, 1), [], T0 + 10 * MIN);
        expect(later.rows[0]).toMatchObject({ check: "Lint", since: T0 - 30 * MIN, end: T0 + 10 * MIN });
        expect(nextShared(later, [], [], T0 + 2 * DAY_MS).rows).toEqual([]);
    });

    it("counts the runner holders by workflow and event, leaves other pools out, and notes runs with no job", () => {
        const open = [
            {
                run: ghRun(1, { status: "in_progress" }),
                repo: "o/main",
                jobs: [
                    ghJob("a", { status: "in_progress" }),
                    ghJob("b", { status: "queued" }),
                    ghJob("c", { status: "in_progress", labels: ["macos-latest"] }),
                    ghJob("t4", { status: "in_progress", labels: ["machine.dev"] }),
                ],
            },
            { run: ghRun(2, { status: "queued", name: "Hosts", event: "push" }), repo: "o/other", jobs: [] },
        ];
        const h = nextHolders(undefined, open, "o/main", true, T0);
        expect(h.holders["CI, pull_request"]).toEqual({ running: 2, queued: 1, macos: 1 });
        expect(h.noJobs["other: Hosts, push"]).toEqual({ runs: 1, since: T0 - 20 * MIN });
        expect(h.saturated).toEqual([{ at: T0, running: { "CI, pull_request": 2 } }]);
    });

    it("judges a check by its newest run: a failure a later run of the same check passed is not failing", () => {
        const p = gqlPr(1, ["PR Integrity", "All Checks Pass"]);
        const { nodes } = p.commits!.nodes[0].commit.statusCheckRollup!.contexts;
        expect(failingChecks(p).map((f) => f.name)).toEqual(["PR Integrity"]);
        nodes.push(
            { __typename: "CheckRun", name: "PR Integrity", conclusion: "SUCCESS", startedAt: at(T0 - 29 * MIN) },
            { __typename: "CheckRun", name: "All Checks Pass", conclusion: "SUCCESS", startedAt: at(T0 - 29 * MIN) },
        );
        expect(failingChecks(p)).toEqual([]);
        nodes.push({
            __typename: "CheckRun",
            name: "PR Integrity",
            conclusion: "FAILURE",
            startedAt: at(T0 - 28 * MIN),
        });
        expect(failingChecks(p).map((f) => f.name)).toEqual(["PR Integrity"]);
    });

    it("lists unfinished pull request runs whose pull request has a newer head", () => {
        const runs = [ghRun(1, { status: "in_progress" }), ghRun(2, { status: "in_progress", head_sha: "new" })];
        const s = supersededRuns(runs, [gqlPr(1, []), gqlPr(2, [])], T0);
        expect(s.rows).toEqual([{ workflow: "CI", runId: 1, pr: 1, newerAt: T0 - 10 * MIN }]);
    });
});

const DAY_MS = 24 * HOUR;
