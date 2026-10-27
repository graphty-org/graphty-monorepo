// What each bucketed metric counts, read from raw items. A metric takes items of one or more kinds from the bucket
// of one time field, and each item adds a contribution: events (n), a numerator or quantity (sum), a value for the
// histogram, max and last, and an optional dimension. Every collector observation (kind obs) is its own metric,
// named by the observation, so a new stock or age needs no code here.

// The repository's CI budgets; the deploy builds from a full checkout, so the root file is bundled in.
import budgets from "../../../../ci-budgets.json" with { type: "json" };
import { HOUR, MIN, type RawItem, type RawKind } from "./items.js";

export interface Contribution {
    n?: number; // default 1
    sum?: number; // default 0
    value?: number;
    dim?: string;
}

export interface MetricSource {
    kind: RawKind;
    field: string;
    fold: (item: never) => Contribution | null;
}

export interface MetricDef {
    id: string;
    from: MetricSource[];
}

type Of<K extends RawKind> = Extract<RawItem, { kind: K }>;
const src = <K extends RawKind>(kind: K, field: string, fold: (item: Of<K>) => Contribution | null): MetricSource => ({
    kind,
    field,
    fold: fold,
});

/** PR check duration and full-run shard times are normalized to this budget, so a median compares to one value. */
export const PR_BASE_MS = 20 * MIN;
export const SHARD_BASE_MS = HOUR;
/**
 * A full-run test shard's budget (ci-budgets.json `job:ci.yml:Test (*)`), applied when a bucket is folded; a change
 * to it re-marks the stored shard runs' buckets once (FOLD_VERSION, recompute.ts).
 */
export const FULL_SHARD_BUDGET_MS = budgets.budgets["job:ci.yml:Test (*)"].minutes * MIN;
/** Changes whenever a fold changes for items already stored; bump the suffix when a fold's code changes. */
export const FOLD_VERSION = `shard-budget-${FULL_SHARD_BUDGET_MS}`;

const FINISHED = new Set(["success", "failure", "timed_out", "startup_failure"]);
const isMaster = (base: string) => base === "master" || base === "main";

export const METRICS: MetricDef[] = [
    // 4.1 Master
    {
        id: "master.reverts",
        from: [src("pr", "mergedAt", (p) => (isMaster(p.base) ? { sum: p.reverted ? 1 : 0 } : null))],
    },
    // 4.2 Pull requests
    {
        id: "pr.time_to_merge",
        from: [
            src("pr", "mergedAt", (p) =>
                p.mergedAt !== undefined && !p.ownerWait
                    ? { value: p.mergedAt - (p.readyAt ?? p.createdAt), dim: p.repo }
                    : null,
            ),
        ],
    },
    // Where the time goes: each merged pull request's stage times, the dimension the stage.
    {
        id: "pr.stage_time",
        from: (["runners", "checks", "red", "merging"] as const).map((stage) =>
            src("pr", "mergedAt", (p) => (p.stages && !p.ownerWait ? { value: p.stages[stage], dim: stage } : null)),
        ),
    },
    {
        id: "pr.merge_ratio",
        from: [
            src("pr", "createdAt", (p) => ({ n: 1, dim: p.repo })),
            src("pr", "mergedAt", (p) => (p.mergedAt === undefined ? null : { n: 0, sum: 1, dim: p.repo })),
        ],
    },
    // 4.3 CI
    {
        id: "ci.runner_wait",
        from: [
            src("job", "startedAt", (j) =>
                j.startedAt === undefined ? null : { value: Math.max(0, j.startedAt - j.createdAt), dim: j.repo },
            ),
        ],
    },
    {
        id: "ci.first_attempt",
        from: [
            src("run", "completedAt", (r) =>
                r.event === "pull_request" && r.attempt === 1 && FINISHED.has(r.conclusion ?? "")
                    ? { sum: r.conclusion === "success" ? 1 : 0, dim: r.workflow }
                    : null,
            ),
        ],
    },
    // CI causes (section 2.6): why each failed first attempt of a pull request run failed.
    {
        id: "ci.first_attempt_cause",
        from: [src("run", "completedAt", (r) => (r.cause ? { dim: r.cause } : null))],
    },
    {
        id: "ci.hangs",
        from: [src("job", "completedAt", (j) => ({ sum: j.hang ? 1 : 0, dim: j.workflow }))],
    },
    {
        id: "ci.pr_check_duration",
        from: [
            src("run", "completedAt", (r) =>
                r.workflow === "ci.yml" &&
                r.event === "pull_request" &&
                r.budgetMs &&
                r.completedAt !== undefined &&
                FINISHED.has(r.conclusion ?? "")
                    ? {
                          value: ((r.completedAt - (r.startedAt ?? r.createdAt)) * PR_BASE_MS) / r.budgetMs,
                          dim: r.runKind ?? "pr",
                      }
                    : null,
            ),
        ],
    },
    {
        id: "ci.bins_over_8",
        from: [
            src("shard_run", "endedAt", (s) =>
                s.source === "ci" && s.bin ? { sum: s.secs > 480 ? 1 : 0, dim: s.family } : null,
            ),
        ],
    },
    {
        id: "ci.reruns",
        from: [
            src("run", "completedAt", (r) =>
                r.status === "completed" && r.conclusion !== "skipped"
                    ? { sum: r.attempt > 1 ? 1 : 0, dim: r.workflow }
                    : null,
            ),
        ],
    },
    {
        id: "ci.full_shard_time",
        from: [
            src("shard_run", "endedAt", (s) =>
                s.source === "ci" && s.full && s.attempt === 1 && s.outcome === "passed"
                    ? {
                          value: (s.secs * 1000 * SHARD_BASE_MS) / FULL_SHARD_BUDGET_MS,
                          sum: FULL_SHARD_BUDGET_MS,
                          dim: s.variant,
                      }
                    : null,
            ),
        ],
    },
    // The Shard times section's pull request bins view: bin time per family, against the 8-minute packing target.
    {
        id: "ci.bin_time",
        from: [
            src("shard_run", "endedAt", (s) =>
                s.source === "ci" && s.bin && s.outcome === "passed" ? { value: s.secs * 1000, dim: s.family } : null,
            ),
        ],
    },
    // 4.4 Flaky tests
    {
        id: "flaky.rate",
        from: [
            src("shard_run", "endedAt", (s) =>
                s.source === "ci" && s.attempt === 1 ? { n: s.files.length, dim: s.family } : null,
            ),
            // ponytail: counts flaky tests, not distinct flaky files per run; a file with two flaky tests counts twice.
            src("test", "seenAt", (t) =>
                t.source === "ci" && t.outcome === "flaky" ? { n: 0, sum: 1, dim: t.family } : null,
            ),
        ],
    },
    // Flake hotspots (section 5): flaky events per distinct test, the dimension a JSON [family, file, test].
    {
        id: "flaky.tests",
        from: [
            src("test", "seenAt", (t) =>
                t.source === "ci" && t.outcome === "flaky"
                    ? { sum: 1, dim: JSON.stringify([t.family, t.file, t.name]) }
                    : null,
            ),
        ],
    },
    {
        id: "flaky.detected_to_fixed",
        from: [
            src("issue", "closedAt", (i) =>
                i.closedAt !== undefined && i.labels.includes("flaky") && i.stateReason !== "not_planned"
                    ? { value: i.closedAt - i.createdAt }
                    : null,
            ),
        ],
    },
    // 4.5 Releases
    {
        id: "release.train_first_attempt",
        from: [
            src("run", "completedAt", (r) =>
                r.workflow === "release.yml" && r.attempt === 1 && r.tested
                    ? { sum: r.conclusion === "success" ? 1 : 0 }
                    : null,
            ),
        ],
    },
    // 4.6 Costs
    { id: "cost.usd", from: [src("cost", "day", (c) => ({ sum: c.usd, dim: c.line }))] },
    // Section 7, money by workflow: job-priced lines (T4, the LLM step) by the workflow that ran them.
    {
        id: "cost.by_workflow",
        from: [
            src("cost", "day", (c) =>
                c.workflow ? { sum: c.usd, dim: c.line === "llm" ? `${c.workflow}, LLM step` : c.workflow } : null,
            ),
        ],
    },
    // Section 7, list-price value: GitHub-hosted job minutes (each job rounded up, as GitHub bills), by
    // [workflow, os]; the view prices them from rates.json, so a rate change needs no recompute.
    {
        id: "ci.job_minutes",
        from: [
            src("job", "completedAt", (j) =>
                j.os && j.startedAt !== undefined && j.completedAt !== undefined
                    ? { sum: Math.ceil((j.completedAt - j.startedAt) / MIN), dim: JSON.stringify([j.workflow, j.os]) }
                    : null,
            ),
        ],
    },
    // 4.3 Runner-minutes per merge: job minutes (unrounded) by the kind of run that spent them, over the pull
    // requests merged into master in the same buckets; a job stored without its kind is left out.
    {
        id: "ci.runner_minutes",
        from: [
            src("job", "completedAt", (j) =>
                j.load && j.startedAt !== undefined && j.completedAt !== undefined
                    ? { n: 0, sum: (j.completedAt - j.startedAt) / MIN, dim: j.load }
                    : null,
            ),
            src("pr", "mergedAt", (p) => (p.mergedAt !== undefined && isMaster(p.base) ? { n: 1 } : null)),
        ],
    },
    // Section 7, unit costs: release train attempts that tested a candidate.
    {
        id: "release.trains",
        from: [src("run", "completedAt", (r) => (r.workflow === "release.yml" && r.tested ? { n: 1 } : null))],
    },
    // 4.7 Data sources: rows of CI results per CI run, for "thin for its activity" (section 9).
    {
        id: "source.ci_results_per_run",
        from: [
            src("shard_run", "endedAt", (s) => (s.source === "ci" ? { n: 0, sum: 1 } : null)),
            src("run", "completedAt", (r) => (r.workflow === "ci.yml" && r.conclusion !== "skipped" ? { n: 1 } : null)),
        ],
    },
    // Local runs page.
    {
        id: "local.runs",
        from: [src("local_run", "endedAt", (l) => ({ sum: l.outcome === "passed" ? 0 : 1, dim: l.what }))],
    },
    {
        id: "local.shard_time",
        from: [
            src("shard_run", "endedAt", (s) => (s.source === "local" ? { value: s.secs * 1000, dim: s.family } : null)),
        ],
    },
];

export const METRIC_IDS = new Set(METRICS.map((m) => m.id));
