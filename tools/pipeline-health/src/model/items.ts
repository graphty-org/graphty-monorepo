// The items of the single table `graphty-health` (design/ci/health-dashboard.md, section 10.3), their keys and
// how long each is kept. Times are epoch milliseconds, UTC.
//
// Keys:
//   R#<kind>#<id>       A#<attempt>    a raw item, its home (drill-downs read it here)
//   T#<5m start>        <kind>#<field>#<id>#<attempt>
//                                      a copy of the raw item in the 5-minute bucket of each of its time fields,
//                                      so a bucket is recomputed from one partition
//   DIRTY               <5m start>     a 5-minute bucket whose raw items changed since its last recompute
//   ROLL#<metric>#<step> <start>       one rollup bucket of one metric, every dimension inside
//   IDX#<step>          <start>        the metrics a bucket holds, so a parent knows which children to merge
//   QUOTA#<day>         -              rows ingested on a UTC day (the daily write budget)
//   CURSOR#<name>       -              a collector's position (newest run seen, and so on)
//   META#source#<id>    -              a source's last write, last error and first write
//   RUN#<run id>        run#<attempt> | job#<job id>#<attempt>
//                                      a run's attempts and jobs, for GET /v1/run/<id>
//   TESTH#<file>        <seenAt>#<test id>#<attempt>
//                                      a file's failed and flaky tests by time, for GET /v1/test-history

import type { Histogram } from "./histogram.js";
import type { Item } from "./store.js";

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export type Step = "5m" | "15m" | "1h" | "1d";
export const STEP_MS: Record<Step, number> = { "5m": 5 * MIN, "15m": 15 * MIN, "1h": HOUR, "1d": DAY };
/** How long each rollup step is kept (10.3). */
export const KEEP_MS: Record<Step, number> = { "5m": 2 * DAY, "15m": 8 * DAY, "1h": 14 * DAY, "1d": 400 * DAY };
export const PARENT: Partial<Record<Step, Step>> = { "5m": "15m", "15m": "1h", "1h": "1d" };
export const CHILD: Partial<Record<Step, Step>> = { "15m": "5m", "1h": "15m", "1d": "1h" };

export const floorTo = (ms: number, step: Step): number => Math.floor(ms / STEP_MS[step]) * STEP_MS[step];
/**
 * Sort keys are zero-padded epoch ms, so string order is time order.
 * @param ms
 */
export const skTime = (ms: number): string => String(ms).padStart(13, "0");
export const ttlAt = (ms: number): number => Math.ceil(ms / 1000);

// ---------------------------------------------------------------------------------------------------------------
// Raw items. Every one names a natural id and an attempt; writing the same id and attempt again replaces the item,
// and rollups are recomputed from what is stored, so a retried post never counts twice.

interface RawBase {
    id: string;
    attempt: number;
}

/** A workflow run attempt (the collector, from the runs API). */
export interface RunItem extends RawBase {
    kind: "run";
    repo: string;
    runId: number;
    workflow: string; // file name, "ci.yml"
    event: string; // push | pull_request | schedule | workflow_dispatch | ...
    branch: string;
    sha: string;
    pr?: number;
    status: string; // queued | in_progress | completed
    conclusion?: string; // success | failure | cancelled | timed_out | skipped | startup_failure | ...
    /** For a cancelled run (4, "Master state"): never from timing. */
    cancelClass?: "superseded" | "by-hand" | "red";
    /** Why a failed attempt-1 pull request run failed (4, "Failure cause"); flaky once a rerun passed. */
    cause?: "infrastructure" | "shared_aggregator" | "shared_check" | "flaky" | "change";
    /** The run's kind for its duration budget (`pr`, `pr-wide`), and that budget. */
    runKind?: string;
    budgetMs?: number;
    /** release.yml: the attempt tested its candidate (it did not skip every lane). */
    tested?: boolean;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
}

/** A job of a run attempt (the jobs API, filter=latest). */
export interface JobItem extends RawBase {
    kind: "job";
    repo: string;
    runId: number;
    workflow: string;
    name: string;
    family?: string; // a test family, bins folded ("Test (graphty-element-browser-3)" -> graphty-element-browser)
    pool: "linux_windows" | "macos" | "other"; // which runner limit it counts against (4.3)
    /** A GitHub-hosted runner's OS, for the list-price value of its minutes (section 7); absent elsewhere. */
    os?: "linux" | "windows" | "macos";
    status: string;
    conclusion?: string;
    /** Ended at its own timeout-minutes, or ran past twice its budget. */
    hang?: boolean;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
}

export interface StepItem extends RawBase {
    kind: "step";
    repo: string;
    runId: number;
    jobId: number;
    workflow: string;
    job: string;
    name: string;
    conclusion?: string;
    startedAt?: number;
    completedAt?: number;
}

/** [file, passed, failed, skipped, ms], the results service's file_run row. */
export type FileRow = [string, number, number, number, number];

/** One test shard run (a results-service invocation): `id` is the invocation id, `attempt` its try. */
export interface ShardRunItem extends RawBase {
    kind: "shard_run";
    source: "ci" | "local";
    variant: string; // the shard, "graphty-element-browser-3", or a pull request bin
    family: string;
    /** A pull request bin (packed per pull request) rather than a full-run shard. */
    bin: boolean;
    full: boolean; // a full run (the release train's ci lane)
    pr?: number;
    sha: string;
    outcome: string; // passed | failed | error | infra | cancelled
    startedAt: number;
    endedAt: number;
    secs: number;
    budgetMs?: number;
    files: FileRow[];
}

/**
 * A failed or retried test. `outcome` is `flaky` when the same test passed on the same inputs (its shard's retry,
 * a rerun); the writer that learns that rewrites this item (same id) with outcome flaky.
 */
export interface TestItem extends RawBase {
    kind: "test";
    source: "ci" | "local";
    invocation: string;
    family: string;
    file: string;
    name: string;
    outcome: "failed" | "flaky";
    status: string; // fail | timeout (results-service failureHashes)
    signature: string;
    seenAt: number;
}

export interface PullRequestItem extends RawBase {
    kind: "pr";
    repo: string;
    number: number;
    base: string;
    createdAt: number;
    readyAt?: number;
    mergedAt?: number;
    closedAt?: number;
    /** Auto-merge off by rule: left out of the time members (4.2). */
    ownerWait?: boolean;
    /** This merge was later reverted (4.1 Reverts). */
    reverted?: boolean;
}

export interface IssueItem extends RawBase {
    kind: "issue";
    repo: string;
    number: number;
    labels: string[];
    createdAt: number;
    closedAt?: number;
    stateReason?: string; // completed | not_planned
}

export interface NpmItem extends RawBase {
    kind: "npm";
    pkg: string;
    version: string;
    taggedAt?: number;
    publishedAt?: number;
}

/** One money line for one UTC day (USD). */
export interface CostItem extends RawBase {
    kind: "cost";
    line: string; // t4 | llm | aws | cloudflare | sentry | github
    /** The workflow file whose job cost it (t4, llm), for money by workflow. */
    workflow?: string;
    day: number; // start of the UTC day
    usd: number;
}

export interface LocalRunItem extends RawBase {
    kind: "local_run";
    what: string; // gate | ledger | ...
    outcome: string;
    startedAt: number;
    endedAt: number;
}

/**
 * A value the collector observed at one cycle: a stock (open pull requests), an age, a verdict, or time inside the
 * cycle's 5 minutes (red ms, saturated ms). `id` is `<metric>#<at>`.
 */
export interface ObservationItem extends RawBase {
    kind: "obs";
    metric: string;
    value: number;
    at: number;
}

export type RawItem =
    | RunItem
    | JobItem
    | StepItem
    | ShardRunItem
    | TestItem
    | PullRequestItem
    | IssueItem
    | NpmItem
    | CostItem
    | LocalRunItem
    | ObservationItem;
export type RawKind = RawItem["kind"];

/** The time fields a kind is bucketed by; a metric reads its items from the bucket of one of them. */
export const TIME_FIELDS: Record<RawKind, string[]> = {
    run: ["createdAt", "completedAt"],
    job: ["startedAt", "completedAt"],
    step: ["completedAt"],
    shard_run: ["endedAt"],
    test: ["seenAt"],
    pr: ["createdAt", "mergedAt", "closedAt"],
    issue: ["createdAt", "closedAt"],
    npm: ["publishedAt"],
    cost: ["day"],
    local_run: ["endedAt"],
    obs: ["at"],
};

/** Days a raw item is kept; undefined keeps it (10.3). */
export const KEEP_DAYS: Record<RawKind, number | undefined> = {
    run: 90,
    job: 90,
    step: 90,
    shard_run: 90,
    test: 90,
    pr: undefined,
    issue: undefined,
    npm: undefined,
    cost: undefined,
    local_run: 90,
    obs: 30,
};

export const homeKey = (r: Pick<RawItem, "kind" | "id" | "attempt">) => ({
    pk: `R#${r.kind}#${r.id}`,
    sk: `A#${r.attempt}`,
});
export const copyKey = (r: Pick<RawItem, "kind" | "id" | "attempt">, field: string, at: number) => ({
    pk: `T#${skTime(floorTo(at, "5m"))}`,
    sk: `${r.kind}#${field}#${r.id}#${r.attempt}`,
});

/** The index copies of a raw item (drill-downs read them), or none for kinds no drill-down indexes. */
export function indexKeys(r: RawItem): Item[] {
    if (r.kind === "run") return [{ pk: `RUN#${r.runId}`, sk: `run#${r.attempt}` }];
    if (r.kind === "job") return [{ pk: `RUN#${r.runId}`, sk: `job#${r.id.split("/").pop()}#${r.attempt}` }];
    if (r.kind === "test") return [{ pk: `TESTH#${r.file}`, sk: `${skTime(r.seenAt)}#${r.id}#${r.attempt}` }];
    return [];
}

// ---------------------------------------------------------------------------------------------------------------
// Rollups.

/** Counts and sums of one metric over one bucket, for the whole metric or one dimension of it. */
export interface Agg {
    /** Events (a rate's denominator, a median's sample count). */
    n: number;
    /** A rate's numerator, or a summed quantity (ms, USD). */
    sum: number;
    /** Durations, when the metric has them. */
    hist?: Histogram;
    /** Peak. */
    max?: number;
    /** A stock's end-of-bucket value, and when it was observed. */
    last?: number;
    lastAt?: number;
}

export interface Bucket extends Agg {
    dims?: Record<string, Agg>;
}

export interface RollupItem extends Item, Bucket {
    metric: string;
    step: Step;
    start: number;
}

export const rollKey = (metric: string, step: Step, start: number) => ({
    pk: `ROLL#${metric}#${step}`,
    sk: skTime(start),
});
export const idxKey = (step: Step, start: number) => ({ pk: `IDX#${step}`, sk: skTime(start) });
export const DIRTY_PK = "DIRTY";
export const dirtyKey = (start5m: number) => ({ pk: DIRTY_PK, sk: skTime(start5m) });

// ---------------------------------------------------------------------------------------------------------------
// Bookkeeping.

export const DAILY_ROW_LIMIT = 300_000;
export const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const quotaKey = (ms: number) => ({ pk: `QUOTA#${utcDay(ms)}`, sk: "-" });
export interface QuotaItem extends Item {
    rows: number;
}

export const cursorKey = (name: string) => ({ pk: `CURSOR#${name}`, sk: "-" });
export interface CursorItem extends Item {
    value: string;
    at: number;
}

export const sourceKey = (id: string) => ({ pk: `META#source#${id}`, sk: "-" });
/** What the dashboard knows about one source's health (section 9). */
export interface SourceItem extends Item {
    source: string;
    firstAt: number;
    lastAt: number;
    lastOkAt?: number;
    error?: string;
    errorSince?: number;
}
