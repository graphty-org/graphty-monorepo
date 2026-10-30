import { describe, expect, it } from "vitest";

import type { GhJob, GhRun, GqlPr } from "../../src/collector/parse.js";
import { failingChecks, failureCause, nextHolders, nextShared, supersededRuns } from "../../src/collector/snapshots.js";
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

describe("snapshots", () => {
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
        const failing = [1, 2, 3].map((n) => gqlPr(n, ["Lint"]));
        const merged = gqlPr(9, [], { state: "MERGED", mergedAt: at(T0 - HOUR) });
        const first = nextShared(undefined, [...failing, gqlPr(4, ["Docs"])], [merged], T0);
        expect(first.rows).toHaveLength(1);
        expect(first.rows[0]).toMatchObject({ check: "Lint", prs: [3, 2, 1], since: T0 - 30 * MIN, alone: false });
        expect(first.rows[0].suspects.map((m) => m.pr)).toEqual([9]);
        const later = nextShared(first, failing.slice(0, 2), [], T0 + 10 * MIN);
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
        const nodes = p.commits!.nodes[0].commit.statusCheckRollup!.contexts.nodes;
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
