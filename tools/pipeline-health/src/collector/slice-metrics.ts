// The dashboard's measures of rolling screenshot capture (design/visual-testing/early-capture.md, plan step 6): how
// old the full set of screenshots is, slice runner-minutes against each cap, what slices cost other work, and how
// long a changed picture waits for the owner's approval. Pure functions; collect.ts feeds them and writes the
// observations, config/slas.json gives each its target.

import { DAY, HOUR, MIN } from "../model/items.js";
import { type GhJob, type GhRun, pool, waitsForRunner, workflowFile } from "./parse.js";
import type { SliceConfig, SliceSpend } from "./slices.js";

/** A unit not rendered for this long is taken to be gone (a renamed story file, a re-split heavy file): the store keeps a story's rows 7 days. */
export const UNIT_GONE_MS = 7 * DAY;

/** One story's newest rolling capture, as GET /v1/story-captures lists it. */
export interface Capture {
    project: string;
    story: string;
    mode: string;
    status: string;
    baselinesTree: string;
    at: number;
}

/** The part of GET /v1/story-captures the collector reads. */
export interface StoryCaptures {
    summary?: { lastSliced?: { sha: string } | null; oldestNewestAt?: number | null };
    units?: { at: number }[];
    captures?: Capture[];
}

/**
 * The full set's age: the oldest of every rotation unit's newest capture. Units not rendered for UNIT_GONE_MS are left
 * out and counted (`dropped`), so a renamed story file does not hold the age old forever; when every unit is that old,
 * all count. Before units exist, the store's oldest newest capture.
 * @param body - the GET /v1/story-captures body
 * @param now - the current time, in ms
 * @returns the oldest newest capture (null before any) and the units left out
 */
export function setAge(body: StoryCaptures, now: number): { oldestAt: number | null; dropped: number } {
    const units = body.units ?? [];
    if (!units.length) {
        return { oldestAt: body.summary?.oldestNewestAt ?? null, dropped: 0 };
    }
    const live = units.filter((u) => u.at > now - UNIT_GONE_MS);
    return {
        oldestAt: Math.min(...(live.length ? live : units).map((u) => u.at)),
        dropped: units.length - live.length,
    };
}

/**
 * Slice runner-minutes as a share of each cap: base and idle per UTC day, idle over the last hour.
 * @param spent - the finished slice runs
 * @param now - the current time, in ms
 * @param cfg - the dispatcher's limits
 * @returns each share of its cap, as a fraction
 */
export function budgetShares(
    spent: SliceSpend[],
    now: number,
    cfg: SliceConfig,
): { base: number; idle: number; idleHour: number } {
    const day = (t: number): number => Math.floor(t / DAY);
    const sum = (f: (s: SliceSpend) => boolean): number => spent.filter(f).reduce((n, s) => n + s.minutes, 0);
    return {
        base: sum((s) => s.mode === "base" && day(s.at) === day(now)) / cfg.baseDailyMin,
        idle: sum((s) => s.mode === "idle" && day(s.at) === day(now)) / cfg.idleDailyMin,
        idleHour: sum((s) => s.mode === "idle" && s.at > now - HOUR) / cfg.idleHourlyMin,
    };
}

/**
 * What one cycle of slices cost other work, in the pool GitHub limits (machine.dev and self-hosted jobs left out):
 * slice runner-minutes held while the pool was saturated or another job waited for a runner, and the minutes other
 * jobs spent waiting for a runner inside the cycle while a slice job held one. A job waits for a runner by the
 * runner-use rule (waitsForRunner: queued over 2 minutes), so a job created seconds ago, one held by a concurrency
 * group or one waiting for an environment approval costs nothing, and a job queued 3 minutes counts 3, not the cycle.
 * @param open every unfinished run with its jobs
 * @param workflow the slice workflow's file
 * @param saturated this cycle's saturation flag
 * @param minutes the cycle's length
 * @param nowMs the time of the sample
 * @returns the contended slice minutes and other jobs' queue wait, in minutes
 */
export function contention(
    open: { run: GhRun; jobs?: GhJob[] }[],
    workflow: string,
    saturated: boolean,
    minutes: number,
    nowMs: number,
): { contendedMin: number; queueWaitMin: number } {
    let held = 0;
    let waited = 0;
    for (const { run, jobs } of open) {
        const slice = workflowFile(run.path) === workflow;
        for (const j of jobs ?? []) {
            if (pool(j.labels) === "other") {
                continue;
            }
            if (slice && j.status === "in_progress") {
                held++;
            } else if (!slice && waitsForRunner(j, nowMs)) {
                waited += Math.min(minutes, (nowMs - Date.parse(j.created_at)) / MIN);
            }
        }
    }
    if (!held) {
        return { contendedMin: 0, queueWaitMin: 0 };
    }
    return { contendedMin: saturated || waited ? held * minutes : 0, queueWaitMin: waited };
}

/** Changed pictures waiting for the owner (key project/story/mode), and the approval merges seen. */
export interface ReviewState {
    pending: Record<string, { since: number; tree: string }>;
    /** Merge times of visual/approve-* pull requests, the last 8 days. */
    approvals: number[];
}

const WAITING = new Set(["changed", "new"]);

/**
 * Review lag: from a picture's first rolling capture as changed (or new) to the approval that took it in merging.
 * A picture is approved when its newest capture is no longer changed and was compared with another baselines tree;
 * the lag ends at the newest approval merge after it was first seen and before that capture, else at the capture.
 * A picture that stops being changed under the same tree (its change was reverted) counts nothing.
 * @param prev the state of the last read
 * @param captures every story's newest capture
 * @param merged approval merge times seen since
 * @param now the current time, in ms
 * @returns the new state and the lags of pictures approved since, in ms
 */
export function reviewLags(
    prev: ReviewState | undefined,
    captures: Capture[],
    merged: number[],
    now: number,
): { state: ReviewState; lags: number[] } {
    const approvals = [...new Set([...(prev?.approvals ?? []), ...merged])]
        .filter((t) => t > now - 8 * DAY)
        .sort((a, b) => a - b);
    const old = prev?.pending ?? {};
    const pending: ReviewState["pending"] = {};
    const lags: number[] = [];
    for (const c of captures) {
        const key = `${c.project}/${c.story}/${c.mode}`;
        const was = old[key];
        if (WAITING.has(c.status)) {
            pending[key] = was ?? { since: c.at, tree: c.baselinesTree };
        } else if (was && c.status === "unchanged" && c.baselinesTree !== was.tree) {
            const end = approvals.findLast((t) => t > was.since && t <= c.at) ?? c.at;
            lags.push(end - was.since);
        } else if (was && c.status !== "unchanged") {
            pending[key] = was;
        } // failed or unstable: still waiting
    }
    return { state: { pending, approvals }, lags };
}
