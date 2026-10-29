// The rolling screenshot slice dispatcher (design/visual-testing/early-capture.md, 4b): at the end of each collector
// cycle it decides whether to start one story-slices.yml run, from the runner samples of the last hour, the
// runner-minutes slices already used (summed from GitHub's job durations), whether a slice is in flight, and the
// results store's record of what was captured. decideSlice() is pure; the collector part (collect.ts `slices`)
// gathers its inputs and makes the one dispatch call.

import { DAY, HOUR, MIN } from "../model/items.js";
import { type AppConfig, type Fetch, GitHub, installationToken } from "./github.js";
import type { GhJob, GhRun } from "./parse.js";
import { setAge, type StoryCaptures } from "./slice-metrics.js";

/** config/slices.json: every limit of the dispatcher, tuned by a pull request to that file. */
export interface SliceConfig {
    workflow: string;
    /** False: decide and report only, never dispatch (the kill switch). */
    dispatch: boolean;
    /** Runner-minutes per UTC day for base slices; idle slices never spend it. */
    baseDailyMin: number;
    idleDailyMin: number;
    /** Idle runner-minutes in any 60 minutes. */
    idleHourlyMin: number;
    /** Idle slices run while some unit's newest capture is older than this. */
    freshHours: number;
    /** Most linux/windows jobs running for an idle slice, and for a base slice. */
    idleRunning: number;
    baseRunning: number;
    /** Quiet: no job queued and no saturation in every cycle of this many minutes... */
    quietMinutes: number;
    /** ...and no job waited longer than this for a runner over the last hour. */
    maxWaitMinutes: number;
    /** Planned runner-minutes of one slice run, every job: a slice starts only when its share has this much left. */
    estimateMin: { base: number; idle: number };
}

export type SliceMode = "base" | "idle";

/** One cycle's runner use (collect.ts `runners`). */
export interface RunnerSample {
    at: number;
    running: number;
    queued: number;
    saturated: boolean;
    longestQueuedMs: number;
}

/** One finished slice run attempt, its runner-minutes summed from its jobs' durations. */
export interface SliceSpend {
    run: number;
    attempt: number;
    mode: SliceMode;
    /** When it finished. */
    at: number;
    minutes: number;
}

/** What the dispatcher keeps between cycles (a JSON cursor). */
export interface SliceState {
    samples: RunnerSample[];
    spent: SliceSpend[];
    /** The last dispatch: until a slice run created after it shows up, it counts as in flight. */
    dispatched?: { at: number; sha: string; mode: SliceMode; seen?: boolean };
}

/** The part of GET /v1/story-captures the decision reads. */
export interface StoreSummary {
    /** The commit of the newest slice render, or null before the first. */
    lastSlicedSha: string | null;
    /** The oldest of every unit's newest capture, or null when nothing was captured yet. */
    oldestAt: number | null;
}

export interface SliceInput {
    now: number;
    cfg: SliceConfig;
    state: SliceState;
    /** A story-slices.yml run is queued or running. */
    running: boolean;
    /** The newest green ci.yml push build of master, or undefined when none is known this cycle. */
    newestGreen?: { sha: string };
    /** null: not read (the caller reads it only when everything else allows a slice); undefined: did not answer. */
    store: StoreSummary | null | undefined;
}

export type SliceReason =
    | "in-flight"
    | "no-runner-data"
    | "not-quiet"
    | "no-green-build"
    | "caps-used"
    | "busy"
    | "store-unavailable"
    | "fresh-and-current";

export type SliceDecision =
    { action: "none"; reason: SliceReason } | { action: "dispatch"; mode: SliceMode; sha: string };

const utcDay = (t: number) => Math.floor(t / DAY);

/** Runner-minutes spent per share: base and idle today (UTC), idle over the last hour. */
export function spentMinutes(spent: SliceSpend[], now: number) {
    const sum = (f: (s: SliceSpend) => boolean) => spent.filter(f).reduce((n, s) => n + s.minutes, 0);
    return {
        baseToday: sum((s) => s.mode === "base" && utcDay(s.at) === utcDay(now)),
        idleToday: sum((s) => s.mode === "idle" && utcDay(s.at) === utcDay(now)),
        idleLastHour: sum((s) => s.mode === "idle" && s.at > now - HOUR),
    };
}

/**
 * Quiet: a sample in every cycle of the last `quietMinutes` (one per 5 minutes; a missed cycle is not quiet), none with
 * a queued job or saturation, and no job waited longer than `maxWaitMinutes` in any sample of the last hour.
 */
export function isQuiet(samples: RunnerSample[], now: number, cfg: SliceConfig): boolean {
    const window = cfg.quietMinutes * MIN;
    const recent = samples.filter((s) => s.at >= now - window - 4 * MIN);
    // The samples span the whole window with no missed cycle (a gap over 7.5 minutes) and none after the last.
    if (!recent.length || recent[0].at > now - window + 2 * MIN || recent.at(-1)!.at < now - 7.5 * MIN) return false;
    if (recent.some((s, k) => k > 0 && s.at - recent[k - 1].at > 7.5 * MIN)) return false;
    if (recent.some((s) => s.queued > 0 || s.saturated)) return false;
    return samples.filter((s) => s.at > now - HOUR).every((s) => s.longestQueuedMs <= cfg.maxWaitMinutes * MIN);
}

/**
 * Whether to start a slice now, and which (design 4b). Never while one is in flight, without this cycle's runner
 * data, unless the pool has been quiet, or past a share's cap. An idle slice when at most `idleRunning` jobs run and
 * some unit's newest capture is older than `freshHours`; else a base slice when at most `baseRunning` run and master's
 * newest green build has not been sliced or dispatched yet.
 */
export function decideSlice(i: SliceInput): SliceDecision {
    const { cfg, now, state } = i;
    const none = (reason: SliceReason): SliceDecision => ({ action: "none", reason });
    const d = state.dispatched;
    if (i.running || (d && !d.seen && d.at > now - 15 * MIN)) return none("in-flight");
    const latest = state.samples.at(-1);
    if (!latest || latest.at < now - 6 * MIN) return none("no-runner-data");
    if (!isQuiet(state.samples, now, cfg)) return none("not-quiet");
    if (!i.newestGreen) return none("no-green-build");
    const used = spentMinutes(state.spent, now);
    const idleCap =
        used.idleToday + cfg.estimateMin.idle <= cfg.idleDailyMin &&
        used.idleLastHour + cfg.estimateMin.idle <= cfg.idleHourlyMin;
    const baseCap = used.baseToday + cfg.estimateMin.base <= cfg.baseDailyMin;
    if (!idleCap && !baseCap) return none("caps-used");
    const idleOk = idleCap && latest.running <= cfg.idleRunning;
    const baseOk = baseCap && latest.running <= cfg.baseRunning;
    if (!idleOk && !baseOk) return none("busy");
    const store = i.store;
    if (!store) return none("store-unavailable");
    const sha = i.newestGreen.sha;
    const stale = store.oldestAt === null || store.oldestAt < now - cfg.freshHours * HOUR;
    if (idleOk && stale) return { action: "dispatch", mode: "idle", sha };
    if (baseOk && sha !== store.lastSlicedSha && sha !== state.dispatched?.sha)
        return { action: "dispatch", mode: "base", sha };
    return none("fresh-and-current");
}

/** The mode a slice run was started with, from its run name ("Story slices: idle <sha>"); undefined if not a slice. */
export function sliceMode(run: GhRun): SliceMode | undefined {
    return /^Story slices: (base|idle)\b/.exec(run.display_title ?? "")?.[1] as SliceMode | undefined;
}

/** Master's newest green build in a newest-first list of ci.yml push runs, skipping red, cancelled and running ones. */
export function newestGreen(runs: GhRun[]): { sha: string } | undefined {
    const green = runs.find((r) => r.status === "completed" && r.conclusion === "success");
    return green ? { sha: green.head_sha } : undefined;
}

/** Runner-minutes of a finished attempt: every job's started-to-completed time (failed and cancelled ones too). */
export function jobMinutes(jobs: GhJob[]): number {
    let ms = 0;
    for (const j of jobs)
        if (j.started_at && j.completed_at) ms += Math.max(0, Date.parse(j.completed_at) - Date.parse(j.started_at));
    return ms / MIN;
}

/** The state after this cycle: its runner sample, newly finished slice runs, and only what the decision still reads. */
export function nextState(
    prev: SliceState,
    now: number,
    sample: RunnerSample | undefined,
    finished: { run: GhRun; jobs: GhJob[] }[],
): SliceState {
    const spent = [...prev.spent];
    for (const { run, jobs } of finished) {
        const mode = sliceMode(run);
        if (!mode || spent.some((s) => s.run === run.id && s.attempt === run.run_attempt)) continue;
        spent.push({
            run: run.id,
            attempt: run.run_attempt,
            mode,
            at: Date.parse(run.updated_at) || now,
            minutes: jobMinutes(jobs),
        });
    }
    return {
        samples: [...prev.samples, ...(sample ? [sample] : [])].filter((s) => s.at > now - HOUR),
        spent: spent.filter((s) => s.at > now - 2 * DAY),
        ...(prev.dispatched ? { dispatched: prev.dispatched } : {}),
    };
}

/** GET /v1/story-captures' summary as the decision reads it; the set's age (setAge) is the rotation's age. */
export function storeSummary(body: StoryCaptures, now: number): StoreSummary {
    return { lastSlicedSha: body.summary?.lastSliced?.sha ?? null, oldestAt: setAge(body, now).oldestAt };
}

/** The results store (tools/results-service) the dispatcher reads: its URL and a local token, in SSM. */
export const SLICE_STORE_PARAMS = {
    url: "/graphty-health/results/url",
    token: "/graphty-health/results/token",
} as const;

/**
 * The collector's slice dependencies from what is set up: no store parameters, it never dispatches; no dispatch App,
 * it decides and dispatches nothing (a dry run, the decision in the cycle's log).
 * @param cfg config/slices.json
 * @param store the SSM parameters: the store's URL and local token
 * @param app the release-scheduler App (Actions write), when its key is in SSM
 * @param f fetch
 * @param repo owner/name
 */
export function sliceDeps(
    cfg: SliceConfig,
    store: Record<string, string>,
    app: AppConfig | undefined,
    f: Fetch,
    repo: string,
) {
    const url = store[SLICE_STORE_PARAMS.url];
    const token = store[SLICE_STORE_PARAMS.token];
    const readStore =
        url && token
            ? async () => {
                  const res = await f(`${url.replace(/\/$/, "")}/v1/story-captures`, {
                      headers: { authorization: `Bearer ${token}` },
                      signal: AbortSignal.timeout(15_000),
                  });
                  if (!res.ok) throw new Error(`results store: HTTP ${res.status}`);
                  return (await res.json()) as StoryCaptures;
              }
            : undefined;
    const gh = app && cfg.dispatch ? new GitHub(() => installationToken(app, f, Date.now()), f) : undefined;
    const dispatch = gh
        ? (sha: string, mode: SliceMode) =>
              gh.post(`repos/${repo}/actions/workflows/${cfg.workflow}/dispatches`, {
                  ref: "master",
                  inputs: { sha, mode, post: "true" },
              })
        : undefined;
    return { cfg, ...(readStore ? { readStore } : {}), ...(dispatch ? { dispatch } : {}) };
}
