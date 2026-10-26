// Fixtures for the model and SLA tests.
import {
    HOUR,
    MIN,
    type JobItem,
    type ObservationItem,
    type PullRequestItem,
    type RunItem,
} from "../../src/model/items.js";

/** 2026-10-25 12:00 UTC: mid-month, on a 5-minute boundary. */
export const T0 = Date.UTC(2026, 9, 25, 12, 0, 0);
export { HOUR, MIN };

export const run = (id: number, over: Partial<RunItem> = {}): RunItem => ({
    kind: "run",
    id: `graphty-org/graphty-monorepo#${id}`,
    attempt: 1,
    repo: "graphty-org/graphty-monorepo",
    runId: id,
    workflow: "ci.yml",
    event: "pull_request",
    branch: "fix/x",
    sha: "abc",
    status: "completed",
    conclusion: "success",
    createdAt: T0 - 30 * MIN,
    startedAt: T0 - 29 * MIN,
    completedAt: T0 - 10 * MIN,
    ...over,
});

export const job = (id: number, over: Partial<JobItem> = {}): JobItem => ({
    kind: "job",
    id: `graphty-org/graphty-monorepo#${id}`,
    attempt: 1,
    repo: "graphty-org/graphty-monorepo",
    runId: 1,
    workflow: "ci.yml",
    name: "Build",
    pool: "linux_windows",
    status: "completed",
    conclusion: "success",
    createdAt: T0 - 30 * MIN,
    startedAt: T0 - 28 * MIN,
    completedAt: T0 - 20 * MIN,
    ...over,
});

export const pr = (n: number, over: Partial<PullRequestItem> = {}): PullRequestItem => ({
    kind: "pr",
    id: `graphty-org/graphty-monorepo#${n}`,
    attempt: 1,
    repo: "graphty-org/graphty-monorepo",
    number: n,
    base: "master",
    createdAt: T0 - 50 * MIN,
    ...over,
});

export const obs = (metric: string, value: number, at: number): ObservationItem => ({
    kind: "obs",
    id: `${metric}#${at}`,
    attempt: 1,
    metric,
    value,
    at,
});
