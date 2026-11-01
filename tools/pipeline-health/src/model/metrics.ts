// What each bucketed metric counts, read from raw items. A metric takes items of one or more kinds from the bucket
// of one time field, and each item adds a contribution: events (n), a numerator or quantity (sum), a value for the
// histogram, max and last, and an optional dimension. Every collector observation (kind obs) is its own metric,
// named by the observation, so a new stock or age needs no code here.

// The repository's CI budgets; the deploy builds from a full checkout, so the root file is bundled in.
import { createHash } from "node:crypto";

import budgets from "../../../../ci-budgets.json" with { type: "json" };
import { type JobItem, MIN, type RawItem, type RawKind } from "./items.js";

export interface Contribution {
    n?: number; // default 1
    sum?: number; // default 0
    value?: number;
    /** Keep the value itself as well (Agg.vals), so medians come from the events, not histogram bins. */
    exact?: boolean;
    dim?: string;
}

export interface MetricSource {
    kind: RawKind;
    field: string;
    /** One contribution, or several (one per dimension), or none. */
    fold: (item: never) => Contribution | Contribution[] | null;
}

export interface MetricDef {
    id: string;
    from: MetricSource[];
}

type Of<K extends RawKind> = Extract<RawItem, { kind: K }>;
const src = <K extends RawKind>(
    kind: K,
    field: string,
    fold: (item: Of<K>) => Contribution | Contribution[] | null,
): MetricSource => ({
    kind,
    field,
    fold: fold,
});

/** PR check duration is normalized to this budget, so a median compares to one value. */
export const PR_BASE_MS = 20 * MIN;
/**
 * A full-run test shard's budget (ci-budgets.json `job:ci.yml:Test (*)`), applied when a bucket is folded; a change
 * to it re-marks the stored shard runs' buckets once (FOLD_VERSION, recompute.ts).
 */
export const FULL_SHARD_BUDGET_MS = budgets.budgets["job:ci.yml:Test (*)"].minutes * MIN;
/** Changes whenever a fold changes for items already stored; bump the suffix when a fold's code changes. */
export const FOLD_VERSION = `shard-budget-${FULL_SHARD_BUDGET_MS}-exact-jobs-file-runs-run-branch-results-per-test-job-ran-jobs-nightly-deploys`;

/**
 * When a job started on a runner, or undefined when it never did. GitHub gives a job cancelled before any runner
 * took it (runner_id 0, no steps) a started_at equal to its created_at, so its queue time until the cancel would
 * otherwise read as runner time, and its wait as zero. A job a runner took starts at least a second after it was
 * created: of 27,000 pull request jobs over 10-27..10-30, none that succeeded started in the second it was created.
 * @param j a stored job
 * @returns its start, epoch ms, or undefined for a job no runner ran
 */
export const ranAt = (j: Pick<JobItem, "conclusion" | "createdAt" | "startedAt">): number | undefined =>
    j.conclusion === "cancelled" && j.startedAt === j.createdAt ? undefined : j.startedAt;

/**
 * A flake hotspot family (design section 5): a shard run's variant `<family>|flags=..|<shape>` and a flaky test's
 * family (`graphty`, `graphty-storybook-shots`) name the same family once the variant's flags and shape are dropped.
 * @param family a shard run's or flaky test's family
 * @returns the family without its flags and shape
 */
export const hotspotFamily = (family: string): string => family.split("|")[0];

/**
 * The flaky.file_runs dimension of one test file in one family: a short hash, not the path, so a day's bucket of
 * every file CI ran (about 3,000) stays near 80 KB, under DynamoDB's 400 KB item limit and cheap to rewrite.
 * @param family the shard run's or the flaky test's family
 * @param file the test file, repository-relative
 * @returns an 8-character base64url hash
 */
export const fileRunKey = (family: string, file: string): string =>
    createHash("sha256")
        .update(`${hotspotFamily(family)}\0${file}`)
        .digest("base64url")
        .slice(0, 8);

const FINISHED = new Set(["success", "failure", "timed_out", "startup_failure"]);
const isMaster = (base: string): boolean => base === "master" || base === "main";
/** A finished job's own verdict: cancelled and skipped jobs say nothing about the job. */
const JOB_PASS = new Set(["success"]);
const JOB_FAIL = new Set(["failure", "timed_out", "startup_failure"]);
/** A test job that ran its tests: cancelled, skipped and startup failures post no shard run. */
const JOB_POSTS = new Set(["success", "failure", "timed_out"]);

/**
 * A job's name with its bin or shard number folded, as checks are grouped by family (section 4):
 * "CI / Test (graphty-element-browser-3)" -> "CI / Test (graphty-element-browser)".
 * @param name the job's name
 * @returns the name with its trailing bin number dropped
 */
export const jobFamily = (name: string): string => name.replace(/(\bTest \([^)]+?)-\d+\)$/, "$1)");

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
    // Runs failed on a test their own change touched (#3951): the batching trigger, per pull request run.
    {
        id: "pr.caused_failures",
        from: [src("run", "completedAt", (r) => (r.prCaused === undefined ? null : { sum: r.prCaused ? 1 : 0 }))],
    },
    // 4.3 CI
    {
        id: "ci.runner_wait",
        from: [
            src("job", "startedAt", (j) => {
                const at = ranAt(j);
                return at === undefined ? null : { value: Math.max(0, at - j.createdAt), dim: j.repo };
            }),
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
                    ? // The time itself, kept exactly (a few runs a day); the sum holds the budget each run had.
                      { value: s.secs * 1000, exact: true, sum: FULL_SHARD_BUDGET_MS, dim: s.variant }
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
    // Non-gating jobs (4.3): every finished job of every run kind, passed or failed, by [workflow, job family].
    {
        id: "ci.job_outcome",
        from: [
            src("job", "completedAt", (j) =>
                JOB_PASS.has(j.conclusion ?? "") || JOB_FAIL.has(j.conclusion ?? "")
                    ? {
                          sum: JOB_FAIL.has(j.conclusion ?? "") ? 1 : 0,
                          dim: JSON.stringify([j.workflow, jobFamily(j.name)]),
                      }
                    : null,
            ),
        ],
    },
    // Chronically failing jobs (4.3): when each job of a master push, full run or other run passed or failed, by
    // [workflow, job family, "pass" | "fail"], the times kept exactly so the collector reads each job's newest runs in
    // order. Pull request runs and runs on other branches (a dispatch on a work branch, a probe, a bisect point) are
    // left out: their failures may be their own change's.
    {
        id: "ci.job_history",
        from: [
            src("job", "completedAt", (j) => {
                const pass = JOB_PASS.has(j.conclusion ?? "");
                if (!j.load || j.load === "pr" || j.offMaster || j.completedAt === undefined) {
                    return null;
                }
                if (!pass && !JOB_FAIL.has(j.conclusion ?? "")) {
                    return null;
                }
                return {
                    value: j.completedAt,
                    exact: true,
                    dim: JSON.stringify([j.workflow, jobFamily(j.name), pass ? "pass" : "fail"]),
                };
            }),
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
                t.source === "ci" && t.outcome === "flaky" && !t.bump ? { n: 0, sum: 1, dim: t.family } : null,
            ),
        ],
    },
    // Flake hotspots (section 5): how often each test file ran, the denominator of a file's and its tests' rate.
    {
        id: "flaky.file_runs",
        from: [
            src("shard_run", "endedAt", (s) =>
                s.source === "ci" && s.attempt === 1
                    ? s.files.map(([file]) => ({ dim: fileRunKey(s.family, file) }))
                    : null,
            ),
        ],
    },
    // Flake hotspots (section 5): flaky events per distinct test, the dimension a JSON [family, file, test].
    {
        id: "flaky.tests",
        from: [
            src("test", "seenAt", (t) =>
                t.source === "ci" && t.outcome === "flaky" && !t.bump
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
            src("job", "completedAt", (j) => {
                const at = ranAt(j);
                return j.os && at !== undefined && j.completedAt !== undefined
                    ? { sum: Math.ceil((j.completedAt - at) / MIN), dim: JSON.stringify([j.workflow, j.os]) }
                    : null;
            }),
        ],
    },
    // 4.3 Runner-minutes per merge: job minutes (unrounded) by the kind of run that spent them, over the pull
    // requests merged into master in the same buckets; a job stored without its kind is left out.
    {
        id: "ci.runner_minutes",
        from: [
            src("job", "completedAt", (j) => {
                const at = ranAt(j);
                return j.load && at !== undefined && j.completedAt !== undefined
                    ? { n: 0, sum: (j.completedAt - at) / MIN, dim: j.load }
                    : null;
            }),
            src("pr", "mergedAt", (p) => (p.mergedAt !== undefined && isMaster(p.base) ? { n: 1 } : null)),
        ],
    },
    // Section 7, unit costs: release train attempts that tested a candidate.
    {
        id: "release.trains",
        from: [src("run", "completedAt", (r) => (r.workflow === "release.yml" && r.tested ? { n: 1 } : null))],
    },
    // A nightly promotion is release.yml's "Deploy the nightly site" job passing (a green-clean full run or a
    // promote-nightly run), counted from the stored jobs, so a promotion before the collector first ran still counts.
    // ponytail: a promote.yml nightly rollback moves channel/nightly too and is not counted.
    {
        id: "release.nightly_promotions",
        from: [
            src("job", "completedAt", (j) =>
                j.workflow === "release.yml" &&
                j.conclusion === "success" &&
                /^Deploy the nightly site( \/ |$)/.test(j.name)
                    ? { sum: 1 }
                    : null,
            ),
        ],
    },
    // 4.7 Data sources: rows of CI results per CI test job, for "thin for its activity" (section 9). Each Test (...)
    // job (ci.yml, or "CI / Test (...)" in a release.yml or bisect.yml full run) posts one shard run, its invocation
    // id `<run>.<attempt>.test.<shard>` (tools/results/run-group.mjs baseId()), so a healthy feed reads about 1 and
    // only lost posts lower it. Counting ci.yml runs instead swung with the hour's master builds, which run no tests.
    {
        id: "source.ci_results_per_run",
        from: [
            src("shard_run", "endedAt", (s) =>
                s.source === "ci" && s.id.split(".")[2] === "test" ? { n: 0, sum: 1 } : null,
            ),
            src("job", "completedAt", (j) =>
                j.family !== undefined && JOB_POSTS.has(j.conclusion ?? "") ? { n: 1 } : null,
            ),
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
            // Every local test run since the pre-push gate retired: a test slot's hold, by package or shard family.
            src("local_run", "endedAt", (l) =>
                l.what === "gate" ? null : { value: l.endedAt - l.startedAt, dim: l.what },
            ),
        ],
    },
];

export const METRIC_IDS = new Set(METRICS.map((m) => m.id));
