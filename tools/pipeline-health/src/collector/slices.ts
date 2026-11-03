// The rolling screenshot slice dispatcher (design/visual-testing/early-capture.md, 4b): at the end of each collector
// cycle it decides whether to start one story-slices.yml run, from the runner samples of the last hour, the
// runner-minutes slices already used (summed from GitHub's job durations), whether a slice is in flight, and the
// results store's record of what was captured. decideSlice() is pure; the collector part (collect.ts `slices`)
// gathers its inputs and makes the one dispatch call.

import { DAY, HOUR, MIN } from "../model/items.js";
import type { QuarantineEntry } from "../model/snapshots.js";
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
    /**
     * Jobs that waited over 2 minutes for a Linux or Windows runner (parse.ts `waitsForRunner`). `queued` also counts
     * jobs seconds old and jobs held by a concurrency group or an approval, none of which means runners are short.
     * Absent in samples stored before this field existed; those fall back to `queued`.
     */
    queuedOver2?: number;
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

const utcDay = (t: number): number => Math.floor(t / DAY);

/**
 * Runner-minutes spent per share: base and idle today (UTC), idle over the last hour.
 * @param spent - the finished slice runs
 * @param now - the current time, in ms
 * @returns runner-minutes per share
 */
export function spentMinutes(
    spent: SliceSpend[],
    now: number,
): { baseToday: number; idleToday: number; idleLastHour: number } {
    const sum = (f: (s: SliceSpend) => boolean): number => spent.filter(f).reduce((n, s) => n + s.minutes, 0);
    return {
        baseToday: sum((s) => s.mode === "base" && utcDay(s.at) === utcDay(now)),
        idleToday: sum((s) => s.mode === "idle" && utcDay(s.at) === utcDay(now)),
        idleLastHour: sum((s) => s.mode === "idle" && s.at > now - HOUR),
    };
}

/**
 * Quiet: a sample in every cycle of the last `quietMinutes` (one per 5 minutes; a missed cycle is not quiet), none with
 * a job waiting over 2 minutes for a runner or saturation, and no job waited longer than `maxWaitMinutes` in any sample of the last hour.
 * @param samples - the runner samples, oldest first
 * @param now - the current time, in ms
 * @param cfg - the dispatcher's limits
 * @returns whether the runner pool is quiet
 */
export function isQuiet(samples: RunnerSample[], now: number, cfg: SliceConfig): boolean {
    const window = cfg.quietMinutes * MIN;
    const recent = samples.filter((s) => s.at >= now - window - 4 * MIN);
    // The samples span the whole window with no missed cycle (a gap over 7.5 minutes) and none after the last.
    if (!recent.length || recent[0].at > now - window + 2 * MIN || (recent.at(-1)?.at ?? 0) < now - 7.5 * MIN) {
        return false;
    }
    if (recent.some((s, k) => k > 0 && s.at - recent[k - 1].at > 7.5 * MIN)) {
        return false;
    }
    if (recent.some((s) => (s.queuedOver2 ?? s.queued) > 0 || s.saturated)) {
        return false;
    }
    return samples.filter((s) => s.at > now - HOUR).every((s) => s.longestQueuedMs <= cfg.maxWaitMinutes * MIN);
}

/**
 * A slice run is queued or running, or one was dispatched in the last 15 minutes and has not shown up yet.
 * @param i - the decision's inputs
 * @returns whether a slice is in flight
 */
function inFlight(i: SliceInput): boolean {
    const d = i.state.dispatched;
    return i.running || (!!d && !d.seen && d.at > i.now - 15 * MIN);
}

/**
 * Whether each share has room for one more slice of its planned size.
 * @param spent - the finished slice runs
 * @param now - the current time, in ms
 * @param cfg - the dispatcher's limits
 * @returns whether the idle and the base share have room
 */
function capsLeft(spent: SliceSpend[], now: number, cfg: SliceConfig): { idleCap: boolean; baseCap: boolean } {
    const used = spentMinutes(spent, now);
    return {
        idleCap:
            used.idleToday + cfg.estimateMin.idle <= cfg.idleDailyMin &&
            used.idleLastHour + cfg.estimateMin.idle <= cfg.idleHourlyMin,
        baseCap: used.baseToday + cfg.estimateMin.base <= cfg.baseDailyMin,
    };
}

/**
 * Whether to start a slice now, and which (design 4b). Never while one is in flight, without this cycle's runner
 * data, unless the pool has been quiet, or past a share's cap. An idle slice when at most `idleRunning` jobs run and
 * some unit's newest capture is older than `freshHours`; else a base slice when at most `baseRunning` run and master's
 * newest green build has not been sliced or dispatched yet.
 * @param i - the decision's inputs
 * @returns the decision: dispatch with a mode and commit, or none with a reason
 */
export function decideSlice(i: SliceInput): SliceDecision {
    const { cfg, now, state } = i;
    const none = (reason: SliceReason): SliceDecision => ({ action: "none", reason });
    if (inFlight(i)) {
        return none("in-flight");
    }
    const latest = state.samples.at(-1);
    if (!latest || latest.at < now - 6 * MIN) {
        return none("no-runner-data");
    }
    if (!isQuiet(state.samples, now, cfg)) {
        return none("not-quiet");
    }
    if (!i.newestGreen) {
        return none("no-green-build");
    }
    const { idleCap, baseCap } = capsLeft(state.spent, now, cfg);
    if (!idleCap && !baseCap) {
        return none("caps-used");
    }
    const idleOk = idleCap && latest.running <= cfg.idleRunning;
    const baseOk = baseCap && latest.running <= cfg.baseRunning;
    if (!idleOk && !baseOk) {
        return none("busy");
    }
    const { store } = i;
    if (!store) {
        return none("store-unavailable");
    }
    const { sha } = i.newestGreen;
    const stale = store.oldestAt === null || store.oldestAt < now - cfg.freshHours * HOUR;
    if (idleOk && stale) {
        return { action: "dispatch", mode: "idle", sha };
    }
    if (baseOk && sha !== store.lastSlicedSha && sha !== state.dispatched?.sha) {
        return { action: "dispatch", mode: "base", sha };
    }
    return none("fresh-and-current");
}

/**
 * The mode a slice run was started with, from its run name ("Story slices: idle <sha>"); undefined if not a slice.
 * @param run - the workflow run
 * @returns the slice mode, or undefined
 */
export function sliceMode(run: GhRun): SliceMode | undefined {
    return /^Story slices: (base|idle)\b/.exec(run.display_title ?? "")?.[1] as SliceMode | undefined;
}

/**
 * Master's newest green build in a newest-first list of ci.yml push runs, skipping red, cancelled and running ones.
 * @param runs - ci.yml push runs, newest first
 * @returns the green build's commit, or undefined
 */
export function newestGreen(runs: GhRun[]): { sha: string } | undefined {
    const green = runs.find((r) => r.status === "completed" && r.conclusion === "success");
    return green ? { sha: green.head_sha } : undefined;
}

/**
 * Runner-minutes of a finished attempt: every job's started-to-completed time (failed and cancelled ones too).
 * @param jobs - the attempt's jobs
 * @returns the summed runner-minutes
 */
export function jobMinutes(jobs: GhJob[]): number {
    let ms = 0;
    for (const j of jobs) {
        if (j.started_at && j.completed_at) {
            ms += Math.max(0, Date.parse(j.completed_at) - Date.parse(j.started_at));
        }
    }
    return ms / MIN;
}

/**
 * The state after this cycle: its runner sample, newly finished slice runs, and only what the decision still reads.
 * @param prev - the state after the last cycle
 * @param now - the current time, in ms
 * @param sample - this cycle's runner sample, if read
 * @param finished - slice runs finished since, with their jobs
 * @returns the new state
 */
export function nextState(
    prev: SliceState,
    now: number,
    sample: RunnerSample | undefined,
    finished: { run: GhRun; jobs: GhJob[] }[],
): SliceState {
    const spent = [...prev.spent];
    for (const { run, jobs } of finished) {
        const mode = sliceMode(run);
        if (!mode || spent.some((s) => s.run === run.id && s.attempt === run.run_attempt)) {
            continue;
        }
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

/**
 * GET /v1/story-captures' summary as the decision reads it; the set's age (setAge) is the rotation's age.
 * @param body - the GET /v1/story-captures body
 * @param now - the current time, in ms
 * @returns the summary the decision reads
 */
export function storeSummary(body: StoryCaptures, now: number): StoreSummary {
    return { lastSlicedSha: body.summary?.lastSliced?.sha ?? null, oldestAt: setAge(body, now).oldestAt };
}

/** The results store (tools/results-service) the dispatcher reads: its URL and a local token, in SSM. */
export const SLICE_STORE_PARAMS = {
    url: "/graphty-health/results/url",
    token: "/graphty-health/results/token",
} as const;

/**
 * A GET of the results store, or undefined when its URL or token is not in SSM.
 * @param store the SSM parameters: the store's URL and local token
 * @param f fetch
 * @returns a GET of a store path that parses its JSON, or undefined
 */
export function storeReader(store: Record<string, string>, f: Fetch): (<T>(path: string) => Promise<T>) | undefined {
    const url = store[SLICE_STORE_PARAMS.url];
    const token = store[SLICE_STORE_PARAMS.token];
    if (!url || !token) {
        return undefined;
    }
    return async <T>(path: string): Promise<T> => {
        const res = await f(`${url.replace(/\/$/, "")}${path}`, {
            headers: { authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
            throw new Error(`results store: HTTP ${res.status}`);
        }
        return (await res.json()) as T;
    };
}

/** One entry of the results store's GET /v1/quarantine (times in milliseconds). */
interface StoreQuarantine {
    family: string;
    file: string;
    name: string;
    issue: number | null;
    since: number;
    expires: number;
}

/**
 * The quarantine in force, from the results store (where CI's retry step reads it), or undefined without a store.
 * @param store the SSM parameters: the store's URL and local token
 * @param f fetch
 * @returns a reader of the quarantine in force, or undefined
 */
export function quarantineReader(
    store: Record<string, string>,
    f: Fetch,
): (() => Promise<QuarantineEntry[]>) | undefined {
    const read = storeReader(store, f);
    if (!read) {
        return undefined;
    }
    return async (): Promise<QuarantineEntry[]> =>
        (await read<{ quarantine: StoreQuarantine[] }>("/v1/quarantine")).quarantine.map((q) => ({
            file: q.file,
            name: q.name,
            family: q.family,
            ...(q.issue ? { issue: q.issue } : {}),
            since: new Date(q.since).toISOString(),
            expires: new Date(q.expires).toISOString(),
        }));
}

/**
 * The collector's slice dependencies from what is set up: no store parameters, it never dispatches; no dispatch App,
 * it decides and dispatches nothing (a dry run, the decision in the cycle's log).
 * @param cfg config/slices.json
 * @param store the SSM parameters: the store's URL and local token
 * @param app the release-scheduler App (Actions write), when its key is in SSM
 * @param f fetch
 * @param repo owner/name
 * @returns the slice config with its store reader and dispatch, each when set up
 */
export function sliceDeps(
    cfg: SliceConfig,
    store: Record<string, string>,
    app: AppConfig | undefined,
    f: Fetch,
    repo: string,
): {
    cfg: SliceConfig;
    readStore?: () => Promise<StoryCaptures>;
    dispatch?: (sha: string, mode: SliceMode) => Promise<void>;
} {
    const read = storeReader(store, f);
    const readStore = read ? (): Promise<StoryCaptures> => read<StoryCaptures>("/v1/story-captures") : undefined;
    const gh = app && cfg.dispatch ? new GitHub(() => installationToken(app, f, Date.now()), f) : undefined;
    const dispatch = gh
        ? (sha: string, mode: SliceMode): Promise<void> =>
              gh.post(`repos/${repo}/actions/workflows/${cfg.workflow}/dispatches`, {
                  ref: "master",
                  inputs: { sha, mode, post: "true" },
              })
        : undefined;
    return { cfg, ...(readStore ? { readStore } : {}), ...(dispatch ? { dispatch } : {}) };
}
