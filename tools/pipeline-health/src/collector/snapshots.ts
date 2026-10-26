// The "now" lists of Master, CI and Runners (design/ci/health-dashboard.md 2.6, 4.1, 4.3): shared failures, the
// first-attempt failure cause, who holds the runners, superseded runs still running. Pure mapping from what the
// collector already fetched; the collector keeps each snapshot in a cursor (`view#<name>`) that the views read.

import type { RunItem } from "../model/items.js";
import { DAY, HOUR } from "../model/items.js";
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
/** Excluded checks that summarize others: one failing while every check it summarizes passed is shared (4). */
const AGGREGATORS = new Set(["All Checks Pass", "Queue Checks Pass"]);
const FAILED = new Set(["FAILURE", "TIMED_OUT", "STARTUP_FAILURE"]);

export interface FailingCheck {
    /** The family for a binned test check, else the check's name. */
    check: string;
    name: string;
    /** An aggregator failing while every check it summarizes passed. */
    alone: boolean;
    startedAt?: number;
}

/** One open pull request's failing checks, bins folded; an aggregator only when it failed alone. */
export function failingChecks(p: GqlPr): FailingCheck[] {
    const ctx = p.commits?.nodes[0]?.commit.statusCheckRollup?.contexts.nodes ?? [];
    const failed = ctx.filter((c) => c.__typename === "CheckRun" && c.name && FAILED.has(c.conclusion ?? ""));
    const own = failed.filter((c) => !EXCLUDED.has(c.name!));
    const pick = own.length ? own : failed.filter((c) => AGGREGATORS.has(c.name!));
    return pick.map((c) => {
        const at = ms(c.startedAt);
        return {
            check: family(c.name!) ?? c.name!,
            name: c.name!,
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

/** The checks failing in 3 or more open, ready pull requests, or failing alone, with the pull requests and start. */
export function sharedChecks(
    open: GqlPr[],
): { check: string; bins: number; alone: boolean; prs: number[]; startedAt?: number }[] {
    const by = new Map<string, { names: Set<string>; alone: boolean; prs: Set<number>; startedAt?: number }>();
    for (const p of open) {
        if (p.state !== "OPEN" || p.isDraft) continue;
        for (const f of failingChecks(p)) {
            const g = by.get(f.check) ?? { names: new Set<string>(), alone: f.alone, prs: new Set<number>() };
            by.set(f.check, g);
            g.names.add(f.name);
            g.prs.add(p.number);
            if (f.startedAt !== undefined) g.startedAt = Math.min(g.startedAt ?? Infinity, f.startedAt);
        }
    }
    return [...by]
        .filter(([, g]) => g.prs.size >= 3 || g.alone)
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
 */
export function nextShared(
    prev: SharedSnapshot | undefined,
    open: GqlPr[],
    recent: GqlPr[],
    now: number,
): SharedSnapshot {
    const merges = new Map<number, Merge>((prev?.merges ?? []).map((m) => [m.pr, m]));
    for (const p of recent)
        if (p.mergedAt && (p.baseRefName === "master" || p.baseRefName === "main"))
            merges.set(p.number, { pr: p.number, title: p.title, at: Date.parse(p.mergedAt) });
    const mergeList = [...merges.values()].filter((m) => now - m.at <= 2 * DAY).sort((a, b) => b.at - a.at);
    const active = new Map((prev?.rows ?? []).filter((r) => r.end === undefined).map((r) => [r.check, r]));
    const rows: SharedRow[] = [];
    for (const c of sharedChecks(open)) {
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
    for (const r of active.values()) rows.push({ ...r, end: now });
    for (const r of prev?.rows ?? []) if (r.end !== undefined && now - r.end <= DAY) rows.push(r);
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
 */
export function failureCause(run: GhRun, jobs: GhJob[], hung: Set<string>, shared: Set<string>): Cause | undefined {
    if (run.run_attempt !== 1 || run.event !== "pull_request" || !RED.has(run.conclusion ?? "")) return undefined;
    if (run.conclusion === "startup_failure") return "infrastructure";
    const failed = jobs.filter((j) => RED.has(j.conclusion ?? ""));
    if (failed.some((j) => hung.has(j.name) || j.conclusion === "startup_failure")) return "infrastructure";
    const own = failed.filter((j) => !EXCLUDED.has(j.name));
    if (!own.length && failed.some((j) => AGGREGATORS.has(j.name))) return "shared_aggregator";
    if (own.some((j) => shared.has(family(j.name) ?? j.name))) return "shared_check";
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

export function holderKey(run: GhRun, repo: string, mainRepo: string): string {
    const k = `${run.name}, ${run.event}`;
    return repo === mainRepo ? k : `${repo.split("/").pop()}: ${k}`;
}

const QUEUED = new Set(["queued", "waiting", "pending"]);

/** The holders of every unfinished run; machine.dev and self-hosted pools are outside the limit, so left out. */
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
        if (run.status === "completed") continue;
        const key = holderKey(run, repo, mainRepo);
        if (!jobs?.length) {
            const n = noJobs[key] ?? { runs: 0, since: Date.parse(run.created_at) };
            noJobs[key] = { runs: n.runs + 1, since: Math.min(n.since, Date.parse(run.created_at)) };
            continue;
        }
        for (const j of jobs) {
            const p = pool(j.labels);
            if (p === "other") continue;
            const h = (holders[key] ??= { running: 0, queued: 0, macos: 0 });
            if (j.status === "in_progress") {
                h.running++;
                if (p === "macos") h.macos++;
            } else if (QUEUED.has(j.status)) h.queued++;
        }
    }
    const sat = (prev?.saturated ?? []).filter((s) => now - s.at < DAY);
    if (saturated)
        sat.push({
            at: now,
            running: Object.fromEntries(
                Object.entries(holders)
                    .filter(([, h]) => h.running > 0)
                    .map(([k, h]) => [k, h.running]),
            ),
        });
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
 */
export function supersededRuns(openRuns: GhRun[], open: GqlPr[], now: number): SupersededSnapshot {
    const heads = new Map<number, { oid: string; at?: number }>();
    for (const p of open) {
        const c = p.commits?.nodes[0]?.commit;
        if (c?.oid)
            heads.set(p.number, { oid: c.oid, ...(c.committedDate ? { at: Date.parse(c.committedDate) } : {}) });
    }
    const rows: SupersededRow[] = [];
    for (const r of openRuns) {
        const pr = r.pull_requests?.[0]?.number;
        const head = pr === undefined ? undefined : heads.get(pr);
        if (r.status === "completed" || r.event !== "pull_request" || !head || head.oid === r.head_sha) continue;
        rows.push({ workflow: r.name, runId: r.id, pr: pr!, newerAt: head.at ?? now });
    }
    return { at: now, rows: rows.sort((a, b) => a.newerAt - b.newerAt) };
}
