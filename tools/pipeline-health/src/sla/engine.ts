// The SLA engine (design/ci/health-dashboard.md, sections 3.1, 4 and 9): every member's state now, each category
// as the worst of its judged members, and the episodes of the last 24 hours, read from the rollups.
//
// Every member is judged on 5-minute buckets: 1 h is the newest twelve, 6 h the newest seventy-two (the same span
// windowValue() reads as twenty-four 15-minute buckets for the page), so the state now and the state at each
// 5-minute step of the last 24 h come from one path. Slow members and costs read daily buckets.

import { quantile } from "../model/histogram.js";
import { DAY, floorTo, sourceKey, STEP_MS, type Bucket, type SourceItem } from "../model/items.js";
import { quotaUsed } from "../model/raw.js";
import { emptyAgg, loadSeries, mergeAgg, mergeBucket } from "../model/rollup.js";
import type { Store } from "../model/store.js";
import { SLAS, type MemberConfig, type Measure, type SlaConfig, type Threshold } from "./config.js";

export type MemberState =
    "OK" | "WARNING" | "FAILING" | "NO DATA" | "NOT SET UP" | "TOO FEW SAMPLES" | "PARTIAL WINDOW" | "IDLE";
export type CategoryState = "OK" | "WARNING" | "FAILING" | "NO DATA" | "IDLE";

/** Why a member or source is not simply judged; the page writes the words. */
export interface Reason {
    code: "not_set_up" | "idle" | "stale" | "error" | "thin" | "too_few" | "partial" | "no_value" | "informational";
    params: Record<string, string | number>;
}

export interface MemberStatus {
    id: string;
    category: string;
    label: string;
    window: MemberConfig["window"];
    state: MemberState;
    /** In its category's rollup: OK, WARNING, FAILING or NO DATA, and not a slow member. */
    judged: boolean;
    value?: number;
    value6h?: number;
    n?: number;
    n6h?: number;
    minN?: number;
    ok?: Threshold;
    fail?: Threshold;
    reason?: Reason;
    sources: string[];
    headline: boolean;
    /** How far past the threshold that set the state, relative to it: breaks ties between members. */
    excess?: number;
    /** Still past its threshold over the hour, but the newest 5-minute bucket recovered at this time. */
    clearedAt?: number;
    /** When the current bad state began, where the engine can tell without history (sources, collector). */
    since?: number;
}

export interface CategoryStatus {
    id: string;
    label: string;
    state: CategoryState;
    /** The member that set the state; of two at the same state, the one furthest past its threshold. */
    setBy?: string;
    /** The other judged members not OK. */
    others: string[];
    headline?: string;
}

export interface Episode {
    member: string;
    category: string;
    worst: "WARNING" | "FAILING";
    start: number;
    /** The newest 5-minute bucket recovered (a 1 h member stays past its threshold until its events leave the hour). */
    clearedAt?: number;
    /** The state left WARNING and FAILING; absent while ongoing. */
    endedAt?: number;
    peak?: number;
}

export interface SourceStatus {
    id: string;
    label: string;
    state: "ok" | "stale" | "error" | "thin" | "not set up" | "idle";
    firstAt?: number;
    lastOkAt?: number;
    since?: number;
    ageRatio?: number;
    thinRatio?: number;
    reason?: Reason;
}

export interface Evaluation {
    at: number;
    categories: CategoryStatus[];
    members: MemberStatus[];
    episodes: Episode[];
    sources: SourceStatus[];
}

export type { MetricWindow } from "../model/rollup.js";

const STEP = STEP_MS["5m"];
const HOUR_SPAN = 12 * STEP;
const SIX_SPAN = 72 * STEP;
const HISTORY_STEPS = 288;

type Series = Map<number, Bucket>;

interface Ctx {
    now: number;
    cfg: SlaConfig;
    five: Map<string, Series>;
    daily: Map<string, Series>;
    metas: Map<string, SourceItem>;
    quota: number;
    sources: Map<string, SourceStatus>;
}

/** A point in time: `t` the start of the newest 5-minute bucket, `end` the window's end (now, or t + 5 min). */
interface Point {
    t: number;
    end: number;
}

const hit = (v: number, [op, x]: Threshold) =>
    op === "<" ? v < x : op === "<=" ? v <= x : op === ">" ? v > x : op === ">=" ? v >= x : v === x;

function merged(series: Series | undefined, from: number, to: number): Bucket {
    const out: Bucket = emptyAgg();
    if (series) for (const [s, b] of series) if (s >= from && s <= to) mergeBucket(out, b);
    return out;
}

const metricsOf = (m: Measure) => ("metric" in m ? [m.metric] : []);

function monthValue(ctx: Ctx, m: Extract<Measure, { type: "month" }>, end: number): number | undefined {
    const d = new Date(end);
    const monthStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    const monthDays = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - monthStart) / DAY;
    const today = floorTo(end, "1d");
    const series = ctx.daily.get(m.metric);
    const sumOf = (b: Bucket) => (m.dim === undefined ? b.sum : (b.dims?.[m.dim]?.sum ?? 0));
    const done = sumOf(merged(series, monthStart, today - 1));
    const all = sumOf(merged(series, monthStart, today));
    if (!m.projected) return all;
    const elapsed = (today - monthStart) / DAY;
    // ponytail: on the 1st, before a whole day is billed, the month is today's partial lines, unprojected.
    return elapsed === 0 ? all : (done / elapsed) * monthDays;
}

function measureValue(m: Measure, b: Bucket, spanMs: number): number | undefined {
    const scale = "scale" in m && m.scale !== undefined ? m.scale : 1;
    switch (m.type) {
        case "rate":
            return b.n > 0 ? (b.sum / b.n) * scale : undefined;
        case "median":
        case "p90": {
            const q = b.hist && quantile(b.hist, m.type === "median" ? 0.5 : 0.9);
            return q === undefined ? undefined : q * scale;
        }
        case "sum":
            return b.sum * scale;
        case "share": {
            const share = b.sum / spanMs;
            return m.complement ? 1 - share : share;
        }
        case "last":
            return b.lastAt === undefined ? undefined : (b.last ?? 0) * scale;
        default:
            return undefined;
    }
}

interface Computed {
    value?: number;
    value6h?: number;
    n?: number;
    n6h?: number;
    failExtra?: boolean;
    since?: number;
}

const slowDays = (c: MemberConfig) => (c.slowWindow === "28d" ? 28 : 7);

function slowValue(ctx: Ctx, c: MemberConfig, end: number): Computed {
    const days = slowDays(c);
    const today = floorTo(end, "1d");
    const from = today - (days - 1) * DAY;
    const m = c.measure;
    if (m.type === "dims_median_over") {
        const dims = new Map<string, Bucket>();
        for (const [s, b] of ctx.daily.get(m.metric) ?? new Map<number, Bucket>())
            if (s >= from && s <= today)
                for (const [d, a] of Object.entries(b.dims ?? {})) {
                    const into = dims.get(d) ?? emptyAgg();
                    dims.set(d, into);
                    mergeAgg(into, a);
                }
        const judged = [...dims.values()].filter((a) => a.n >= m.minPerDim);
        return {
            value: judged.filter((a) => (a.hist ? (quantile(a.hist, 0.5) ?? 0) : 0) > m.over).length,
            n: judged.length,
        };
    }
    const b = merged(ctx.daily.get(metricsOf(m)[0]), from, today);
    return { value: measureValue(m, b, days * DAY), n: b.n };
}

function engineValue(ctx: Ctx, name: Extract<Measure, { type: "engine" }>["name"]): Computed {
    const live = [...ctx.sources.values()].filter((s) => s.state !== "not set up" && s.state !== "idle");
    switch (name) {
        case "sources_not_ok": {
            const bad = live.filter((s) => s.state === "stale" || s.state === "error");
            const since = Math.min(...bad.map((s) => s.since ?? ctx.now));
            return {
                value: bad.length,
                failExtra: bad.some((s) => (s.ageRatio ?? 0) > 2),
                ...(bad.length ? { since } : {}),
            };
        }
        case "sources_thin": {
            let best: Computed = { n: 0 };
            for (const s of Object.values(ctx.cfg.sources)) {
                if (!s.thin) continue;
                const r = thinRatios(ctx, s.thin.metric, { t: floorTo(ctx.now, "5m"), end: ctx.now });
                if (r.n1 < s.thin.minActivity) {
                    best.n = Math.max(best.n ?? 0, r.n1);
                    continue;
                }
                if (r.r1 !== undefined && (best.value === undefined || r.r1 < best.value))
                    best = { value: r.r1, n: r.n1, n6h: r.n6, ...(r.r6 === undefined ? {} : { value6h: r.r6 }) };
            }
            return best;
        }
        case "collector_age": {
            const ok = ctx.metas.get("collector")?.lastOkAt;
            return ok === undefined ? {} : { value: ctx.now - ok, since: ok };
        }
        case "write_budget":
            return { value: ctx.quota / ctx.cfg.dailyRowLimit };
    }
}

/** Rows per unit of activity in the last 1 h and 6 h, against the last 7 d (section 9). */
function thinRatios(ctx: Ctx, metric: string, p: Point) {
    const base = merged(ctx.daily.get(metric), floorTo(p.end, "1d") - 6 * DAY, floorTo(p.end, "1d"));
    const perRun = (b: Bucket) => (b.n > 0 ? b.sum / b.n : undefined);
    const b1 = merged(ctx.five.get(metric), p.t - HOUR_SPAN + STEP, p.t);
    const b6 = merged(ctx.five.get(metric), p.t - SIX_SPAN + STEP, p.t);
    const baseRate = perRun(base);
    const ratio = (b: Bucket) => {
        const r = perRun(b);
        return r === undefined || !baseRate ? undefined : r / baseRate;
    };
    return { r1: ratio(b1), r6: ratio(b6), n1: b1.n, n6: b6.n };
}

/** The member's values at a point: 1 h and 6 h for windowed members, the newest value for states. */
function compute(ctx: Ctx, c: MemberConfig, p: Point): Computed | null {
    const m = c.measure;
    if (c.window === "slow") return slowValue(ctx, c, p.end);
    if (m.type === "engine") return p.end === ctx.now ? engineValue(ctx, m.name) : null;
    if (m.type === "month") return { value: monthValue(ctx, m, p.end) };
    if (m.type === "dims_median_over") return null;
    const series = ctx.five.get(m.metric);
    const b1 = merged(series, p.t - HOUR_SPAN + STEP, p.t);
    const span1 = p.end - (p.t - HOUR_SPAN + STEP);
    const out: Computed = { value: measureValue(m, b1, span1), n: b1.n };
    if (c.window === "1h+6h") {
        const b6 = merged(series, p.t - SIX_SPAN + STEP, p.t);
        out.value6h = measureValue(m, b6, p.end - (p.t - SIX_SPAN + STEP));
        out.n6h = b6.n;
    }
    for (const a of c.also ?? []) {
        const v = measureValue(
            { type: "last", metric: a.metric },
            merged(ctx.five.get(a.metric), p.t - HOUR_SPAN + STEP, p.t),
            0,
        );
        if (v !== undefined && hit(v, a.fail)) out.failExtra = true;
    }
    return out;
}

/** The thresholds' verdict on computed values, or a gray reason. */
function verdict(c: MemberConfig, v: Computed): { state: MemberState; excess?: number; reason?: Reason } {
    if (c.minN !== undefined && (v.n ?? 0) < c.minN)
        return { state: "TOO FEW SAMPLES", reason: { code: "too_few", params: { n: v.n ?? 0, min: c.minN } } };
    if (v.value === undefined)
        return { state: v.failExtra ? "FAILING" : "NO DATA", reason: { code: "no_value", params: {} } };
    const value = v.value;
    const ex = (thr: Threshold) => Math.abs(value - thr[1]) / (Math.abs(thr[1]) || 1);
    let state: MemberState = "OK";
    let excess: number | undefined;
    if (c.fail && hit(value, c.fail)) {
        state = "FAILING";
        excess = ex(c.fail);
        // A noisy rate turns red only when its 6 h value is past red too (section 4, "1 h, 6 h agrees").
        if (c.window === "1h+6h" && !(v.value6h !== undefined && hit(v.value6h, c.fail))) state = "WARNING";
    } else if (c.ok && !hit(value, c.ok)) {
        state = "WARNING";
        excess = ex(c.ok);
    }
    if (v.failExtra && state !== "FAILING") {
        state = "FAILING";
        excess ??= 0;
    }
    return { state, ...(excess === undefined ? {} : { excess }) };
}

function sourceStatus(ctx: Ctx, id: string): SourceStatus {
    const cfg = ctx.cfg.sources[id];
    const meta = ctx.metas.get(id);
    const base: SourceStatus = {
        id,
        label: cfg?.label ?? id,
        state: "ok",
        ...(meta ? { firstAt: meta.firstAt } : {}),
        ...(meta?.lastOkAt === undefined ? {} : { lastOkAt: meta.lastOkAt }),
    };
    if (!cfg) return { ...base, state: "stale", reason: { code: "stale", params: { source: id } } };
    if (!meta && cfg.notSetUp)
        return {
            ...base,
            state: "not set up",
            reason: { code: "not_set_up", params: { source: id, why: cfg.notSetUp } },
        };
    const limit = cfg.yellowAfterMs;
    // An idle source is judged again once it writes within its age limit (an hour when it has none).
    if (cfg.idle && (!meta || ctx.now - meta.lastAt > (limit ?? HOUR_SPAN)))
        return { ...base, state: "idle", reason: { code: "idle", params: { source: id, why: cfg.idle } } };
    if (!meta) return { ...base, state: "stale", reason: { code: "stale", params: { source: id } } };
    if (meta.error)
        return {
            ...base,
            state: "error",
            since: meta.errorSince ?? meta.lastAt,
            reason: { code: "error", params: { source: id, error: meta.error, since: meta.errorSince ?? meta.lastAt } },
        };
    const age = ctx.now - (meta.lastOkAt ?? meta.firstAt);
    if (limit !== undefined && age > limit) {
        const quiet =
            cfg.activity !== undefined && merged(ctx.five.get(cfg.activity), ctx.now - limit, ctx.now).n === 0;
        if (!quiet) {
            const since = (meta.lastOkAt ?? meta.firstAt) + limit;
            return {
                ...base,
                state: "stale",
                since,
                ageRatio: age / limit,
                reason: { code: "stale", params: { source: id, since } },
            };
        }
    }
    if (cfg.thin) {
        const r = thinRatios(ctx, cfg.thin.metric, { t: floorTo(ctx.now, "5m"), end: ctx.now });
        if (r.n1 >= cfg.thin.minActivity && r.r1 !== undefined && r.r1 < 0.5)
            return {
                ...base,
                state: "thin",
                thinRatio: r.r1,
                reason: { code: "thin", params: { source: id, ratio: r.r1 } },
            };
    }
    return base;
}

function currentStatus(ctx: Ctx, c: MemberConfig): MemberStatus {
    const status: MemberStatus = {
        id: c.id,
        category: c.category,
        label: c.label,
        window: c.window,
        state: "OK",
        judged: false,
        sources: c.sources,
        headline: c.headline === true,
        ...(c.minN === undefined ? {} : { minN: c.minN }),
        ...(c.ok ? { ok: c.ok } : {}),
        ...(c.fail ? { fail: c.fail } : {}),
    };
    const srcs = c.sources.map((s) => ctx.sources.get(s) ?? sourceStatus(ctx, s));
    const gray = (state: MemberState, reason: Reason): MemberStatus => ({ ...status, state, reason });
    const notSetUp = srcs.find((s) => s.state === "not set up");
    if (notSetUp?.reason) return gray("NOT SET UP", notSetUp.reason);
    if (c.window === "info") return gray("NOT SET UP", { code: "informational", params: {} });
    const idle = srcs.find((s) => s.state === "idle");
    if (idle?.reason) return gray("IDLE", idle.reason);
    const broken = srcs.find((s) => s.state === "stale" || s.state === "error" || s.state === "thin");
    if (broken?.reason) return { ...gray("NO DATA", broken.reason), judged: c.window !== "slow" };
    const v = compute(ctx, c, { t: floorTo(ctx.now, "5m"), end: ctx.now }) ?? {};
    Object.assign(status, {
        ...(v.value === undefined ? {} : { value: v.value }),
        ...(v.value6h === undefined ? {} : { value6h: v.value6h }),
        ...(v.n === undefined ? {} : { n: v.n }),
        ...(v.n6h === undefined ? {} : { n6h: v.n6h }),
    });
    if (c.window === "1h" || c.window === "1h+6h") {
        const firstAt = Math.max(...srcs.map((s) => s.firstAt ?? -Infinity));
        const covered = (ctx.now - firstAt) / HOUR_SPAN;
        if (covered < 1)
            return gray("PARTIAL WINDOW", { code: "partial", params: { hours: Math.round(covered * 10) / 10, of: 1 } });
    }
    const out = verdict(c, v);
    const judged = c.window !== "slow" && ["OK", "WARNING", "FAILING", "NO DATA"].includes(out.state);
    return {
        ...status,
        ...out,
        judged,
        ...(v.since !== undefined && (out.state === "WARNING" || out.state === "FAILING") ? { since: v.since } : {}),
    };
}

const BAD = (s: MemberState | null): s is "WARNING" | "FAILING" => s === "WARNING" || s === "FAILING";

/** The member's state at a past 5-minute step, from buckets alone; null where it cannot be told (gray, engine). */
function historicState(
    ctx: Ctx,
    c: MemberConfig,
    p: Point,
): { state: MemberState | null; value?: number; excess?: number } {
    if (c.window === "slow" || c.window === "info") return { state: null };
    const v = compute(ctx, c, p);
    if (!v) return { state: null };
    const out = verdict(c, v);
    if (out.state !== "OK" && !BAD(out.state)) return { state: null };
    return {
        state: out.state,
        ...(v.value === undefined ? {} : { value: v.value }),
        ...(out.excess === undefined ? {} : { excess: out.excess }),
    };
}

/** The newest 5-minute bucket alone is back within the target (section 3.1, "Clearing"). */
function recovered(ctx: Ctx, c: MemberConfig, t: number): boolean {
    const m = c.measure;
    // A state has no hour to wait out: it recovers when it is OK again, which ends the episode.
    if (!(c.window === "1h" || c.window === "1h+6h") || !("metric" in m)) return false;
    const b = ctx.five.get(m.metric)?.get(t);
    if (!b || (b.n === 0 && b.sum === 0)) return true;
    const v = measureValue(m, b, STEP);
    return v === undefined || !c.ok || hit(v, c.ok);
}

function episodesOf(ctx: Ctx, c: MemberConfig, current: MemberStatus): Episode[] {
    const out: Episode[] = [];
    const now5 = floorTo(ctx.now, "5m");
    let open: (Episode & { score: number }) | undefined;
    for (let i = HISTORY_STEPS - 1; i >= 0; i--) {
        const t = now5 - i * STEP;
        const h =
            i === 0
                ? { state: current.state as MemberState | null, value: current.value, excess: current.excess }
                : historicState(ctx, c, { t, end: t + STEP });
        if (i === 0 && !BAD(h.state) && h.state !== "OK") h.state = null;
        if (h.state === null) continue; // gray or unknown: neither opens nor clears
        if (BAD(h.state)) {
            if (!open) {
                const start = i === 0 && current.since !== undefined ? current.since : t;
                open = { member: c.id, category: c.category, worst: h.state, start, score: -1 };
            }
            if (h.state === "FAILING") open.worst = "FAILING";
            const score = (h.state === "FAILING" ? 1e6 : 0) + (h.excess ?? 0);
            if (score > open.score && h.value !== undefined) {
                open.score = score;
                open.peak = h.value;
            }
            if (recovered(ctx, c, t)) open.clearedAt ??= t;
            else delete open.clearedAt;
        } else if (open) {
            open.clearedAt ??= t;
            open.endedAt = t;
            const { score: _score, ...e } = open;
            out.push(e);
            open = undefined;
        }
    }
    if (open) {
        const { score: _score, ...e } = open;
        out.push(e);
    }
    return out;
}

const RANK: Record<string, number> = { OK: 0, "NO DATA": 1, WARNING: 2, FAILING: 3 };

function categoryOf(cfg: { id: string; label: string }, members: MemberStatus[]): CategoryStatus {
    const mine = members.filter((m) => m.category === cfg.id);
    const judged = mine.filter((m) => m.judged);
    const headline = mine.find((m) => m.headline)?.id;
    const base = { id: cfg.id, label: cfg.label, others: [] as string[], ...(headline ? { headline } : {}) };
    if (!judged.length) return { ...base, state: "IDLE" };
    const worst = Math.max(...judged.map((m) => RANK[m.state]));
    const state = (Object.keys(RANK).find((k) => RANK[k] === worst) ?? "OK") as CategoryState;
    if (state === "OK") return { ...base, state };
    const setBy = judged.filter((m) => RANK[m.state] === worst).sort((a, b) => (b.excess ?? 0) - (a.excess ?? 0))[0];
    return {
        ...base,
        state,
        setBy: setBy.id,
        others: judged.filter((m) => m.state !== "OK" && m !== setBy).map((m) => m.id),
    };
}

/** Every member's state now, the categories, the last 24 h of episodes and the sources. */
export async function evaluate(store: Store, nowMs: number, cfg: SlaConfig = SLAS): Promise<Evaluation> {
    const now5 = floorTo(nowMs, "5m");
    const today = floorTo(nowMs, "1d");
    const fiveMetrics = new Set<string>();
    const dailyMetrics = new Set<string>();
    for (const c of cfg.members) {
        const ms = metricsOf(c.measure);
        for (const m of ms) (c.window === "slow" || c.measure.type === "month" ? dailyMetrics : fiveMetrics).add(m);
        for (const a of c.also ?? []) fiveMetrics.add(a.metric);
    }
    for (const s of Object.values(cfg.sources)) {
        if (s.activity) fiveMetrics.add(s.activity);
        if (s.thin) {
            fiveMetrics.add(s.thin.metric);
            dailyMetrics.add(s.thin.metric);
        }
    }
    const ctx: Ctx = {
        now: nowMs,
        cfg,
        five: new Map(),
        daily: new Map(),
        metas: new Map(),
        quota: 0,
        sources: new Map(),
    };
    // The oldest step's 6 h window starts 24 h + 6 h back.
    const fiveFrom = now5 - (HISTORY_STEPS - 1) * STEP - SIX_SPAN;
    for (const m of fiveMetrics) ctx.five.set(m, await loadSeries(store, m, "5m", fiveFrom, now5, nowMs));
    for (const m of dailyMetrics) ctx.daily.set(m, await loadSeries(store, m, "1d", today - 31 * DAY, today, nowMs));
    for (const id of Object.keys(cfg.sources)) {
        const meta = (await store.get(sourceKey(id))) as SourceItem | undefined;
        if (meta) ctx.metas.set(id, meta);
    }
    ctx.quota = await quotaUsed(store, nowMs);
    for (const id of Object.keys(cfg.sources)) ctx.sources.set(id, sourceStatus(ctx, id));

    const members: MemberStatus[] = [];
    const episodes: Episode[] = [];
    for (const c of cfg.members) {
        const status = currentStatus(ctx, c);
        const eps = episodesOf(ctx, c, status);
        const ongoing = eps.find((e) => e.endedAt === undefined);
        if (ongoing?.clearedAt !== undefined && BAD(status.state)) status.clearedAt = ongoing.clearedAt;
        members.push(status);
        episodes.push(...eps);
    }
    episodes.sort((a, b) => Number(a.endedAt !== undefined) - Number(b.endedAt !== undefined) || b.start - a.start);
    return {
        at: nowMs,
        categories: cfg.categories.map((k) => categoryOf(k, members)),
        members,
        episodes,
        sources: [...ctx.sources.values()],
    };
}
