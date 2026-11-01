// The "now" lists of Master, CI and Runners (design/ci/health-dashboard.md 2.6, 4.1, 4.3): shared failures, the
// first-attempt failure cause, who holds the runners, superseded runs still running. Pure mapping from what the
// collector already fetched; the collector keeps each snapshot in a cursor (`view#<name>`) that the views read.

import { DAY, HOUR, type RunItem } from "../model/items.js";
import { family, type GhJob, type GhRun, type GqlPr, pool } from "./parse.js";

export const SNAPSHOT = { shared: "view#shared", holders: "view#holders", superseded: "view#superseded" } as const;

const ms = (iso: string | null | undefined): number | undefined => (iso ? Date.parse(iso) : undefined);

/** Checks that restate other checks or judge metadata (4, "Excluded checks"). */
const EXCLUDED = new Set([
    "All Checks Pass",
    "Queue Checks Pass",
    "Lint PR Title",
    "Link PR Issue",
    "Visual report",
    "Draft state",
]);
/**
 * Excluded checks that summarize others: one failing while every check it summarizes passed is shared (4). Queue
 * Checks Pass belonged to the retired Mergify queue and is not counted at all.
 */
const AGGREGATORS = new Set(["All Checks Pass"]);
/** A pull request whose newest check started longer ago than this is left out: its checks say nothing about now. */
export const STALE_CHECKS_MS = 2 * DAY;
const FAILED = new Set(["FAILURE", "TIMED_OUT", "STARTUP_FAILURE"]);

export interface FailingCheck {
    /** The family for a binned test check, else the check's name. */
    check: string;
    name: string;
    /** The step that failed, when the collector read the check run's steps. */
    step?: string;
    /** An aggregator failing while every check it summarizes passed. */
    alone: boolean;
    startedAt?: number;
}

/**
 * One open pull request's failing checks, each judged by its newest run, bins folded; an aggregator only when it failed alone. With `now`, none
 * when its newest check started over STALE_CHECKS_MS before it (an abandoned pull request's old red).
 * @param p - the pull request with its head checks
 * @param now - the current time, in ms; omitted, stale checks are kept
 * @returns the failing checks
 */
export function failingChecks(p: GqlPr, now?: number): FailingCheck[] {
    const ctx = p.commits?.nodes[0]?.commit.statusCheckRollup?.contexts.nodes ?? [];
    const newest = Math.max(...ctx.map((c) => ms(c.startedAt) ?? -Infinity));
    if (now !== undefined && Number.isFinite(newest) && now - newest > STALE_CHECKS_MS) {
        return [];
    }
    // A check re-run for another event (PR Integrity after the review lands) adds a run; only its newest counts.
    // ponytail: keyed by name alone, since the query has no workflow; add checkSuite's workflow if two collide.
    const latest = new Map<string, (typeof ctx)[number]>();
    for (const c of ctx) {
        if (c.__typename !== "CheckRun" || !c.name) {
            continue;
        }
        const old = latest.get(c.name);
        if (!old || (ms(c.startedAt) ?? -Infinity) >= (ms(old.startedAt) ?? -Infinity)) {
            latest.set(c.name, c);
        }
    }
    const failed = [...latest].filter(([, c]) => FAILED.has(c.conclusion ?? ""));
    const own = failed.filter(([name]) => !EXCLUDED.has(name));
    const pick = own.length ? own : failed.filter(([name]) => AGGREGATORS.has(name));
    return pick.map(([name, c]) => {
        const at = ms(c.startedAt);
        return {
            check: family(name) ?? name,
            name,
            ...(c.failedStep ? { step: c.failedStep } : {}),
            alone: !own.length,
            ...(at === undefined ? {} : { startedAt: at }),
        };
    });
}

// ---------------------------------------------------------------------------------------------------------------
// Shared failures (4.1): a check or family failing in 3 or more open pull requests, or an aggregator failing alone.

export interface Merge {
    pr: number;
    title: string;
    at: number;
}

export interface SharedRow {
    check: string;
    /** Distinct check names folded into it (the bins of a family). */
    bins: number;
    alone: boolean;
    prs: number[];
    since: number;
    /** When it stopped being shared; absent while it is. */
    end?: number;
    /** Master merges in the 3 h before it began. */
    suspects: Merge[];
}

export interface SharedSnapshot {
    at: number;
    rows: SharedRow[];
    /** Master merges of the last 48 h, newest first. */
    merges: Merge[];
}

/**
 * The cause a failure is grouped by: the check (or its family) and the step that failed, when known, so two
 * different steps of one big job ("Checks") are two causes.
 * @param check - the check or family name
 * @param step - the failed step's name, if known
 * @returns the cause key
 */
export const causeKey = (check: string, step?: string): string => (step ? `${check}: ${step}` : check);

/**
 * Each open pull request's stack: the base-most open pull request whose head is among its commits, itself when none.
 * A branch that merged another pull request's branch fails with that one's change, so the stack counts once.
 * @param open - the open pull requests with their commits
 * @returns the stack's pull request number by pull request number
 */
export function stacks(open: GqlPr[]): Map<number, number> {
    const oids = new Map(open.map((p) => [p.number, new Set(p.stackCommits?.nodes.map((n) => n.commit.oid))]));
    const out = new Map<number, number>();
    for (const p of open) {
        const own = oids.get(p.number) ?? new Set<string>();
        const under = open
            .filter((q) => q.number !== p.number && q.headRefOid && own.has(q.headRefOid))
            .sort((a, b) => (oids.get(a.number)?.size ?? 0) - (oids.get(b.number)?.size ?? 0) || a.number - b.number);
        out.set(p.number, under[0]?.number ?? p.number);
    }
    return out;
}

export interface FailureGroup {
    /** Distinct check names folded into it (the bins of a family). */
    names: Set<string>;
    alone: boolean;
    prs: Set<number>;
    /** The stacks among prs: what the group counts. */
    units: Set<number>;
    startedAt?: number;
}

/**
 * The open, ready pull requests' failures grouped by cause (causeKey), each with its pull requests and stacks.
 * @param open - the open pull requests with their checks
 * @param now - the current time, in ms; omitted, stale checks are kept
 * @returns the groups by cause
 */
export function failureGroups(open: GqlPr[], now?: number): Map<string, FailureGroup> {
    const ready = open.filter((p) => p.state === "OPEN" && !p.isDraft);
    const stack = stacks(ready);
    const by = new Map<string, FailureGroup>();
    for (const p of ready) {
        for (const f of failingChecks(p, now)) {
            const key = causeKey(f.check, f.step);
            const g = by.get(key) ?? { names: new Set<string>(), alone: f.alone, prs: new Set(), units: new Set() };
            by.set(key, g);
            g.names.add(f.name);
            g.prs.add(p.number);
            g.units.add(stack.get(p.number) ?? p.number);
            if (f.startedAt !== undefined) {
                g.startedAt = Math.min(g.startedAt ?? Infinity, f.startedAt);
            }
        }
    }
    return by;
}

/**
 * The causes failing in 3 or more open, ready pull requests (a stack counts once), or failing alone, with the pull
 * requests and start.
 * @param open - the open pull requests with their checks
 * @param now - the current time, in ms; omitted, stale checks are kept
 * @returns the shared checks
 */
export function sharedChecks(
    open: GqlPr[],
    now?: number,
): { check: string; bins: number; alone: boolean; prs: number[]; startedAt?: number }[] {
    return [...failureGroups(open, now)]
        .filter(([, g]) => g.units.size >= 3 || g.alone)
        .map(([check, g]) => ({
            check,
            bins: g.names.size,
            alone: g.alone,
            prs: [...g.prs].sort((a, b) => b - a),
            ...(g.startedAt === undefined ? {} : { startedAt: g.startedAt }),
        }));
}

const SUSPECT_MS = 3 * HOUR;

/**
 * The next snapshot: rows still shared keep their start, new ones start at their earliest failing check, gone ones
 * end now and stay 24 h. ponytail: suspects are master merges in the 3 h before the start, since master runs no
 * tests to say when the check last passed there; the issue and fix column waits for a writer that links them.
 * @param prev - the last snapshot, if any
 * @param open - the open pull requests with their checks
 * @param recent - recently updated pull requests, for their merges
 * @param now - the current time, in ms
 * @returns the new snapshot
 */
export function nextShared(
    prev: SharedSnapshot | undefined,
    open: GqlPr[],
    recent: GqlPr[],
    now: number,
): SharedSnapshot {
    const merges = new Map<number, Merge>((prev?.merges ?? []).map((m) => [m.pr, m]));
    for (const p of recent) {
        if (p.mergedAt && (p.baseRefName === "master" || p.baseRefName === "main")) {
            merges.set(p.number, { pr: p.number, title: p.title, at: Date.parse(p.mergedAt) });
        }
    }
    const mergeList = [...merges.values()].filter((m) => now - m.at <= 2 * DAY).sort((a, b) => b.at - a.at);
    const active = new Map((prev?.rows ?? []).filter((r) => r.end === undefined).map((r) => [r.check, r]));
    const rows: SharedRow[] = [];
    for (const c of sharedChecks(open, now)) {
        const old = active.get(c.check);
        active.delete(c.check);
        const since = old?.since ?? Math.min(c.startedAt ?? now, now);
        rows.push({
            check: c.check,
            bins: c.bins,
            alone: c.alone,
            prs: c.prs,
            since,
            suspects: old?.suspects ?? mergeList.filter((m) => m.at <= since && since - m.at <= SUSPECT_MS),
        });
    }
    for (const r of active.values()) {
        rows.push({ ...r, end: now });
    }
    for (const r of prev?.rows ?? []) {
        if (r.end !== undefined && now - r.end <= DAY) {
            rows.push(r);
        }
    }
    return { at: now, rows, merges: mergeList };
}

// ---------------------------------------------------------------------------------------------------------------
// Why a first attempt failed (4, "Failure cause"), for a completed attempt-1 ci.yml pull request run.

export type Cause = NonNullable<RunItem["cause"]>;
const RED = new Set(["failure", "timed_out", "startup_failure"]);

/**
 * In order: infrastructure (a startup failure or a job that hung), an aggregator failing alone, shared (a failing
 * check in the shared set), the change. Flaky is set later, when a rerun of the same run passes.
 * ponytail: lost runners, outside 5xx and conflicts need annotations or mergeability the collector does not read.
 * @param run - the completed run
 * @param jobs - the run's jobs
 * @param hung - names of jobs that hung
 * @param shared - the causes (causeKey) in the shared set
 * @returns the cause, or undefined when the run is not a red first attempt of a pull request
 */
export function failureCause(run: GhRun, jobs: GhJob[], hung: Set<string>, shared: Set<string>): Cause | undefined {
    if (run.run_attempt !== 1 || run.event !== "pull_request" || !RED.has(run.conclusion ?? "")) {
        return undefined;
    }
    if (run.conclusion === "startup_failure") {
        return "infrastructure";
    }
    const failed = jobs.filter((j) => RED.has(j.conclusion ?? ""));
    if (failed.some((j) => hung.has(j.name) || j.conclusion === "startup_failure")) {
        return "infrastructure";
    }
    const own = failed.filter((j) => !EXCLUDED.has(j.name));
    if (!own.length && failed.some((j) => AGGREGATORS.has(j.name))) {
        return "shared_aggregator";
    }
    const failedStep = (j: GhJob): string | undefined => j.steps?.find((st) => RED.has(st.conclusion ?? ""))?.name;
    if (own.some((j) => shared.has(causeKey(family(j.name) ?? j.name, failedStep(j))))) {
        return "shared_check";
    }
    return "change";
}

// ---------------------------------------------------------------------------------------------------------------
// Who holds the runners (4.3): jobs counted against GitHub's limit, by workflow and event.

export interface HolderCount {
    running: number;
    queued: number;
    macos: number;
}

export interface HoldersSnapshot {
    at: number;
    /** "CI, pull_request" (another repository's prefixed "name: "). */
    holders: Record<string, HolderCount>;
    /** Runs queued with no job created yet, by the same key, and the oldest's creation. */
    noJobs: Record<string, { runs: number; since: number }>;
    /** The running jobs of each saturated cycle, last 24 h. */
    saturated: { at: number; running: Record<string, number> }[];
}

/**
 * The holder a run counts under: its workflow and event, prefixed with the repository's name outside the main one.
 * @param run - the run
 * @param repo - the run's repository, as owner/name
 * @param mainRepo - the monorepo, as owner/name
 * @returns the holder key
 */
export function holderKey(run: GhRun, repo: string, mainRepo: string): string {
    const k = `${run.name}, ${run.event}`;
    return repo === mainRepo ? k : `${repo.slice(repo.lastIndexOf("/") + 1)}: ${k}`;
}

const QUEUED = new Set(["queued", "waiting", "pending"]);

/**
 * The holders of every unfinished run; machine.dev and self-hosted pools are outside the limit, so left out.
 * @param prev - the last snapshot, if any
 * @param open - the unfinished runs with their repository and jobs
 * @param mainRepo - the monorepo, as owner/name
 * @param saturated - whether the pool is saturated this cycle
 * @param now - the current time, in ms
 * @returns the new snapshot
 */
export function nextHolders(
    prev: HoldersSnapshot | undefined,
    open: { run: GhRun; repo: string; jobs?: GhJob[] }[],
    mainRepo: string,
    saturated: boolean,
    now: number,
): HoldersSnapshot {
    const holders: Record<string, HolderCount> = {};
    const noJobs: HoldersSnapshot["noJobs"] = {};
    for (const { run, repo, jobs } of open) {
        if (run.status === "completed") {
            continue;
        }
        const key = holderKey(run, repo, mainRepo);
        if (!jobs?.length) {
            const n = noJobs[key] ?? { runs: 0, since: Date.parse(run.created_at) };
            noJobs[key] = { runs: n.runs + 1, since: Math.min(n.since, Date.parse(run.created_at)) };
            continue;
        }
        for (const j of jobs) {
            const p = pool(j.labels);
            if (p === "other") {
                continue;
            }
            const h = (holders[key] ??= { running: 0, queued: 0, macos: 0 });
            if (j.status === "in_progress") {
                h.running++;
                if (p === "macos") {
                    h.macos++;
                }
            } else if (QUEUED.has(j.status)) {
                h.queued++;
            }
        }
    }
    const sat = (prev?.saturated ?? []).filter((s) => now - s.at < DAY);
    if (saturated) {
        sat.push({
            at: now,
            running: Object.fromEntries(
                Object.entries(holders)
                    .filter(([, h]) => h.running > 0)
                    .map(([k, h]) => [k, h.running]),
            ),
        });
    }
    return { at: now, holders, noJobs, saturated: sat };
}

// ---------------------------------------------------------------------------------------------------------------
// Superseded runs still running (4.3): a pull request run whose pull request has a newer head commit.

export interface SupersededRow {
    workflow: string;
    runId: number;
    pr: number;
    /** The newer head commit's date. */
    newerAt: number;
}

export interface SupersededSnapshot {
    at: number;
    rows: SupersededRow[];
}

/**
 * Unfinished pull request runs whose head is not their pull request's head any more. ponytail: the newer commit's
 * time is its commit date (GraphQL has no push time); if: always() jobs still running after a cancel are not read.
 * @param openRuns - the unfinished runs
 * @param open - the open pull requests with their head commits
 * @param now - the current time, in ms
 * @returns the superseded runs, oldest newer commit first
 */
export function supersededRuns(openRuns: GhRun[], open: GqlPr[], now: number): SupersededSnapshot {
    const heads = new Map<number, { oid: string; at?: number }>();
    for (const p of open) {
        const c = p.commits?.nodes[0]?.commit;
        if (c?.oid) {
            heads.set(p.number, { oid: c.oid, ...(c.committedDate ? { at: Date.parse(c.committedDate) } : {}) });
        }
    }
    const rows: SupersededRow[] = [];
    for (const r of openRuns) {
        const pr = r.pull_requests?.[0]?.number;
        const head = pr === undefined ? undefined : heads.get(pr);
        if (
            pr === undefined ||
            r.status === "completed" ||
            r.event !== "pull_request" ||
            !head ||
            head.oid === r.head_sha
        ) {
            continue;
        }
        rows.push({ workflow: r.name, runId: r.id, pr, newerAt: head.at ?? now });
    }
    return { at: now, rows: rows.sort((a, b) => a.newerAt - b.newerAt) };
}
