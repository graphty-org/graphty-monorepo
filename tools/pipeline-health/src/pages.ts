// The precomputed read items (design/ci/health-dashboard.md, section 10.3): the status, every page at 1 h, 6 h and
// 24 h, Costs and the slow sections at 7 d and 28 d, built from the SLA engine's evaluation and the rollups, in the
// view contract the page draws (web/src/contract.ts). Values are converted from the model's units (ms, fractions)
// to the contract's (min, h, d, pct); every state is the engine's, never re-judged here.

import type * as C from "../web/src/contract.ts";
import { quantile } from "./model/histogram.js";
import { DAY, floorTo, HOUR, STEP_MS, type Bucket, type Step } from "./model/items.js";
import { emptyAgg, loadSeries, mergeAgg, mergeBucket } from "./model/rollup.js";
import type { Store } from "./model/store.js";
import { SLAS, type MemberConfig, type Measure, type Threshold } from "./sla/config.js";
import type { Evaluation, MemberStatus, SourceStatus } from "./sla/engine.js";

const MIN_MS = 60_000;

interface Def {
    /** The member of config/slas.json; absent for a member the engine does not judge yet. */
    cfg?: string;
    unit?: C.Unit;
    /** Multiplies a model value into `unit`. */
    f?: number;
    word?: [string, string]; // value 0 -> word 0, else word 1
    ago?: boolean;
    signed?: boolean;
    link: C.Route;
    /** A member with no config: its metric and measure, drawn as informational. */
    measure?: Measure;
    window?: C.MemberWindow;
}

const min = { unit: "min", f: 1 / MIN_MS } as const;
const hrs = { unit: "h", f: 1 / HOUR } as const;
const pct = { unit: "pct", f: 100 } as const;

/** Every member of the view contract, and where its value comes from. */
export const CATALOG: Record<C.MemberId, Def> = {
    "master.red_now": { cfg: "master.red_now", ...min, link: "/master/red" },
    "master.green_time": { cfg: "master.green_time", ...pct, link: "/master/red" },
    "master.same_check": { cfg: "master.red_same_check", link: "/master/shared" },
    "master.full_run_verdict": { cfg: "master.last_full_run", word: ["passed", "failed"], link: "/releases/lanes" },
    "master.untested_age": { cfg: "master.untested_age", ...hrs, link: "/releases/trains" },
    "master.reverts": { cfg: "master.reverts", ...pct, link: "/master" },
    "pull-requests.time_to_merge": { cfg: "pr.time_to_merge", ...min, link: "/pull-requests" },
    "pull-requests.open": { cfg: "pr.open", link: "/pull-requests" },
    "pull-requests.oldest_open": { cfg: "pr.oldest_open", ...hrs, link: "/pull-requests" },
    "pull-requests.merge_ratio": { cfg: "pr.merge_ratio", unit: "ratio", link: "/pull-requests" },
    "pull-requests.automerge_stuck": { cfg: "pr.automerge_stuck", link: "/pull-requests" },
    "pull-requests.screenshot_backlog": { cfg: "pr.screenshot_backlog", ...hrs, link: "/pull-requests/owner" },
    "ci.runner_wait": { cfg: "ci.runner_wait", ...min, link: "/ci/runners" },
    "ci.longest_queued": { cfg: "ci.longest_queued", ...min, link: "/ci/runners" },
    "ci.saturated": { cfg: "ci.saturated_time", ...min, link: "/ci/runners" },
    "ci.not_assigned": { cfg: "ci.runners_not_assigned", ...min, link: "https://www.githubstatus.com/" },
    "ci.first_attempt": { cfg: "ci.first_attempt", ...pct, link: "/ci/causes" },
    "ci.hangs": { cfg: "ci.hangs", link: "/master/red" },
    "ci.pr_duration": { cfg: "ci.pr_check_duration", unit: "x", link: "/ci" },
    "ci.bins_over": { cfg: "ci.bins_over_8", ...pct, link: "/ci/shards" },
    "ci.reruns": { cfg: "ci.reruns", ...pct, link: "/ci" },
    "ci.shards_over": { cfg: "ci.full_shards_over_budget", link: "/ci/shards" },
    "ci.superseded": { cfg: "ci.superseded_running", link: "/ci/runners/superseded" },
    "flaky.blocked": { cfg: "flaky.blocked", link: "/flaky/hotspots" },
    "flaky.no_issue": { cfg: "flaky.no_issue", link: "/flaky/hotspots" },
    "flaky.flake_rate": { cfg: "flaky.rate", unit: "per1000", link: "/flaky/hotspots" },
    "flaky.net_new": { cfg: "flaky.net_new", signed: true, link: "/flaky" },
    "flaky.detected_to_fixed": { cfg: "flaky.detected_to_fixed", unit: "d", f: 1 / DAY, link: "/flaky" },
    "releases.lanes_red": { cfg: "release.lanes_red", link: "/releases/lanes" },
    "releases.workflows_failing": { cfg: "release.workflows_failing", link: "/releases/workflows" },
    "releases.train_skipped": { cfg: "release.train_skipped", word: ["no", "yes"], link: "/releases/trains" },
    "releases.tagged_not_npm": { cfg: "release.tagged_not_on_npm", link: "/releases" },
    "releases.train_first_pass": { cfg: "release.train_first_attempt", ...pct, link: "/releases/trains" },
    "releases.channels": { cfg: "release.canary_age", ...hrs, link: "/data-sources/not-set-up" },
    "costs.spend": { cfg: "cost.spend", unit: "usd", link: "/costs" },
    "costs.t4": { cfg: "cost.t4", unit: "usd", link: "/costs" },
    "costs.llm": { cfg: "cost.llm", unit: "usd", link: "/costs" },
    "costs.aws": { cfg: "cost.aws", unit: "usd", link: "/costs" },
    "costs.cloudflare_usage": { cfg: "cost.cloudflare_usage", ...pct, link: "/data-sources/not-set-up" },
    "costs.sentry_usage": { cfg: "cost.sentry_usage", ...pct, link: "/data-sources/not-set-up" },
    "data-sources.stress_run": { cfg: "data.stress_run", link: "/data-sources/stress" },
    "data-sources.past_age": { cfg: "data.sources_age", link: "/data-sources/sources" },
    "data-sources.thin": { cfg: "data.sources_thin", unit: "ratio", link: "/data-sources/sources" },
    "data-sources.collector": { cfg: "data.collector", ...min, ago: true, link: "/data-sources/sources" },
    "data-sources.app_rate": { cfg: "data.rate_limit", ...pct, link: "/data-sources/sources" },
    "data-sources.write_budget": { cfg: "data.write_budget", ...pct, link: "/data-sources/sources" },
    "data-sources.sources_not_ok": { cfg: "data.sources_age", link: "/data-sources/sources" },
    // Local runs: informational, never judged (the local gate retired, section 9).
    "local-runs.local_vs_ci": {
        link: "/ci/local-runs",
        window: "1h",
        measure: { type: "rate", metric: "local.runs" },
        ...pct,
    },
    "local-runs.shard_time": {
        link: "/ci/local-runs",
        window: "1h",
        measure: { type: "median", metric: "local.shard_time" },
        ...min,
    },
    "local-runs.slot_waits": {
        link: "/ci/local-runs",
        window: "1h",
        measure: { type: "p90", metric: "local.slot_wait" },
        ...min,
    },
};

/** Each page's members, in the design's order. */
export const PAGE_MEMBERS: Record<Exclude<C.PageId, "overview">, C.MemberId[]> = {
    master: [
        "master.red_now",
        "master.green_time",
        "master.same_check",
        "master.full_run_verdict",
        "master.untested_age",
        "master.reverts",
    ],
    "pull-requests": [
        "pull-requests.time_to_merge",
        "pull-requests.open",
        "pull-requests.oldest_open",
        "pull-requests.merge_ratio",
        "pull-requests.automerge_stuck",
        "pull-requests.screenshot_backlog",
    ],
    ci: [
        "ci.runner_wait",
        "ci.longest_queued",
        "ci.first_attempt",
        "ci.saturated",
        "ci.not_assigned",
        "ci.hangs",
        "ci.pr_duration",
        "ci.shards_over",
        "ci.bins_over",
        "ci.superseded",
        "ci.reruns",
    ],
    runners: ["ci.runner_wait", "ci.longest_queued", "ci.saturated", "ci.not_assigned", "ci.superseded"],
    flaky: ["flaky.blocked", "flaky.no_issue", "flaky.flake_rate", "flaky.net_new", "flaky.detected_to_fixed"],
    releases: [
        "releases.lanes_red",
        "releases.workflows_failing",
        "releases.train_skipped",
        "releases.tagged_not_npm",
        "releases.train_first_pass",
        "releases.channels",
    ],
    costs: ["costs.spend", "costs.t4", "costs.llm", "costs.aws", "costs.cloudflare_usage", "costs.sentry_usage"],
    "data-sources": [
        "data-sources.stress_run",
        "data-sources.past_age",
        "data-sources.thin",
        "data-sources.collector",
        "data-sources.app_rate",
        "data-sources.write_budget",
    ],
    "local-runs": ["local-runs.local_vs_ci", "local-runs.shard_time", "local-runs.slot_waits"],
};

const CATEGORY: Record<string, C.CategoryId> = { pull_requests: "pull-requests", data_sources: "data-sources" };
const categoryId = (id: string) => (CATEGORY[id] ?? id) as C.CategoryId;
const CONTRACT_OF = new Map<string, C.MemberId>();
for (const [id, d] of Object.entries(CATALOG) as [C.MemberId, Def][])
    if (d.cfg && !CONTRACT_OF.has(d.cfg)) CONTRACT_OF.set(d.cfg, id);
const CFG = new Map(SLAS.members.map((m) => [m.id, m]));

export const RANGES: C.Range[] = ["1h", "6h", "24h"];
export const SLOW_RANGES: C.SlowRange[] = ["7d", "28d"];

const iso = (ms: number) => new Date(ms).toISOString();
const round = (v: number) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100);

// ---------------------------------------------------------------------------------------------------------------
// Values.

function measureOf(b: Bucket, m: Measure, spanMs: number): number | undefined {
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
        case "share":
            return m.complement ? 1 - b.sum / spanMs : b.sum / spanMs;
        case "last":
            return b.lastAt === undefined ? undefined : (b.last ?? 0) * scale;
        default:
            return undefined;
    }
}

function valueOf(d: Def, v: number | undefined): C.Value {
    if (v === undefined || !Number.isFinite(v)) return null;
    if (d.word) return { word: (v === 0 ? d.word[0] : d.word[1]) as C.WordValue["word"] };
    const out: C.NumberValue = { n: round(v * (d.f ?? 1)) };
    if (d.unit) out.unit = d.unit;
    if (d.ago) out.ago = true;
    if (d.signed) out.signed = true;
    return out;
}

const OPS: Record<Threshold[0], C.Cmp["op"]> = { "<": "<", "<=": "<=", ">": ">", ">=": ">=", "=": "==" };
function cmpOf(d: Def, t: Threshold): C.Cmp {
    // "<= 0" of a count reads as "== 0" in the design's tables.
    const op = t[0] === "<=" && t[1] === 0 ? "==" : OPS[t[0]];
    return { op, n: round(t[1] * (d.f ?? 1)), ...(d.unit ? { unit: d.unit } : {}) };
}

function slaOf(d: Def, c: MemberConfig | undefined): C.Sla | null {
    if (!c?.ok) return null;
    return {
        target: cmpOf(d, c.ok),
        ...(c.fail ? { red: cmpOf(d, c.fail) } : {}),
        ...(c.window === "1h+6h" ? { needs6h: true } : {}),
    };
}

const WINDOW: Record<MemberConfig["window"], C.MemberWindow> = {
    "1h": "1h",
    "1h+6h": "1h6h",
    now: "now",
    slow: "7d",
    info: "now",
};

const STATE: Record<MemberStatus["state"], C.MemberState> = {
    OK: "ok",
    WARNING: "warn",
    FAILING: "bad",
    "NO DATA": "nodata",
    "NOT SET UP": "notsetup",
    "TOO FEW SAMPLES": "few",
    "PARTIAL WINDOW": "partial",
    IDLE: "idle",
};

function memberState(c: MemberConfig, s: MemberStatus): C.MemberState {
    if (s.reason?.code === "informational") return "info";
    const state = STATE[s.state];
    if (c.window === "slow" && ["ok", "warn", "bad"].includes(state)) return "slow";
    return state;
}

const breachOf = (c: MemberConfig | undefined, v: number | undefined): "warn" | "bad" | null => {
    if (!c || v === undefined) return null;
    const hit = ([op, x]: Threshold) =>
        op === "<" ? v < x : op === "<=" ? v <= x : op === ">" ? v > x : op === ">=" ? v >= x : v === x;
    if (c.fail && hit(c.fail)) return "bad";
    if (c.ok && !hit(c.ok)) return "warn";
    return null;
};

// ---------------------------------------------------------------------------------------------------------------
// Series, loaded once per metric and cycle: 15-minute buckets for 6 h, hourly ones for 24 h.

type Series = Map<number, Bucket>;
interface Loaded {
    q: Series; // 15m, last 6 h
    h: Series; // 1h, last 24 h
}

export class Windows {
    private cache = new Map<string, Promise<Loaded>>();
    private daily = new Map<string, Promise<Series>>();
    private store: Store;
    readonly now: number;
    constructor(store: Store, now: number) {
        this.store = store;
        this.now = now;
    }

    load(metric: string): Promise<Loaded> {
        let hit = this.cache.get(metric);
        if (!hit) {
            const q0 = floorTo(this.now, "15m") - 23 * STEP_MS["15m"];
            const h0 = floorTo(this.now, "1h") - 23 * HOUR;
            hit = Promise.all([
                loadSeries(this.store, metric, "15m", q0, this.now, this.now),
                loadSeries(this.store, metric, "1h", h0, this.now, this.now),
            ]).then(([q, h]) => ({ q, h }));
            this.cache.set(metric, hit);
        }
        return hit;
    }

    days(metric: string): Promise<Series> {
        let hit = this.daily.get(metric);
        if (!hit) {
            const today = floorTo(this.now, "1d");
            hit = loadSeries(this.store, metric, "1d", today - 27 * DAY, today, this.now);
            this.daily.set(metric, hit);
        }
        return hit;
    }

    /** Buckets of `step` from `from` (inclusive) to now, in order, missing ones empty. */
    static steps(series: Series, step: Step, count: number, now: number): { start: number; bucket: Bucket }[] {
        const end = floorTo(now, step);
        const out = [];
        for (let i = count - 1; i >= 0; i--) {
            const start = end - i * STEP_MS[step];
            out.push({ start, bucket: series.get(start) ?? emptyAgg() });
        }
        return out;
    }

    /** One bucket merging the range (6 h or 24 h). */
    async total(metric: string, range: "6h" | "24h"): Promise<{ bucket: Bucket; span: number }> {
        const l = await this.load(metric);
        const steps = range === "6h" ? Windows.steps(l.q, "15m", 24, this.now) : Windows.steps(l.h, "1h", 24, this.now);
        const bucket = emptyAgg();
        for (const s of steps) mergeBucket(bucket, s.bucket);
        return { bucket, span: this.now - steps[0].start };
    }
}

async function sparkOf(
    w: Windows,
    m: Measure,
    c: MemberConfig | undefined,
    d: Def,
    range: C.Range,
): Promise<C.Spark | undefined> {
    if (!("metric" in m) || m.type === "dims_median_over" || m.type === "month") return undefined;
    const l = await w.load(m.metric);
    const point = (b: Bucket, span: number) => {
        const v = measureOf(b, m, span);
        return { v, shown: v === undefined ? null : round(v * (d.f ?? 1)) };
    };
    const target = c?.ok ? round(c.ok[1] * (d.f ?? 1)) : undefined;
    const hourly = Windows.steps(l.h, "1h", 24, w.now).map((s) => point(s.bucket, HOUR));
    if (range === "24h")
        return {
            step: "1h",
            ctx: [],
            trend: hourly.map((p) => p.shown),
            breach: hourly.map((p) => breachOf(c, p.v)),
            ...(target === undefined ? {} : { target }),
        };
    const quarter = Windows.steps(l.q, "15m", 24, w.now).map((s) => point(s.bucket, STEP_MS["15m"]));
    return {
        step: "15m",
        ctx: hourly.slice(0, 18).map((p) => p.shown),
        trend: quarter.map((p) => p.shown),
        breach: quarter.map((p) => breachOf(c, p.v)),
        ...(target === undefined ? {} : { target }),
    };
}

/** One member at one range: the engine's state, the value for the range, the 6 h trend and the sparkline. */
export async function memberOf(
    w: Windows,
    ev: Evaluation,
    id: C.MemberId,
    range: C.Range | C.SlowRange,
): Promise<C.Member> {
    const d = CATALOG[id];
    const c = d.cfg ? CFG.get(d.cfg) : undefined;
    const s = d.cfg ? ev.members.find((m) => m.id === d.cfg) : undefined;
    const measure = c?.measure ?? d.measure!;
    const windowed = (c?.window ?? "1h") === "1h" || c?.window === "1h+6h";
    const fast = range === "1h" || range === "6h" || range === "24h";
    let value: number | undefined = s?.value;
    let n = s?.n;
    if (!c || (windowed && range !== "1h" && fast && measure.type !== "engine")) {
        // The value for the picked window, from its rollups; a member without config is read here at 1 h too.
        if ("metric" in measure && measure.type !== "dims_median_over" && measure.type !== "month") {
            if (range === "1h") {
                const l = await w.load(measure.metric);
                const b = emptyAgg();
                // ponytail: the newest four 15-minute buckets approximate the hour for unconfigured members.
                for (const st of Windows.steps(l.q, "15m", 4, w.now)) mergeBucket(b, st.bucket);
                value = measureOf(b, measure, HOUR);
                n = b.n;
            } else if (range === "6h" || range === "24h") {
                const t = await w.total(measure.metric, range);
                value = measureOf(t.bucket, measure, t.span);
                n = t.bucket.n;
            }
        }
    }
    const member: C.Member = {
        id,
        window: c ? (c.window === "slow" ? (c.slowWindow ?? "7d") : WINDOW[c.window]) : (d.window ?? "1h"),
        state: c && s ? memberState(c, s) : "info",
        value: valueOf(d, value),
        sla: slaOf(d, c),
        link: d.link,
    };
    if (c?.window === "1h+6h" && s) member.value6h = valueOf(d, s.value6h);
    if (n !== undefined) member.n = n;
    if (c?.minN !== undefined) member.minN = c.minN;
    if (s?.reason) member.reason = { code: s.reason.code, params: s.reason.params };
    if (s?.clearedAt !== undefined) member.cleared = iso(s.clearedAt);
    if (fast) {
        const spark = await sparkOf(w, measure, c, d, range);
        if (spark) member.spark = spark;
    }
    return member;
}

function refOf(ev: Evaluation, cfgId: string): C.MemberRef | undefined {
    const id = CONTRACT_OF.get(cfgId);
    const c = CFG.get(cfgId);
    const s = ev.members.find((m) => m.id === cfgId);
    if (!id || !c || !s) return undefined;
    return { member: id, state: memberState(c, s), value: valueOf(CATALOG[id], s.value) };
}

const CAT_STATE: Record<Evaluation["categories"][number]["state"], C.CategoryState> = {
    OK: "ok",
    WARNING: "warn",
    FAILING: "bad",
    "NO DATA": "nodata",
    IDLE: "idle",
};

async function categoriesOf(w: Windows, ev: Evaluation, range: C.Range): Promise<C.CategoryStatus[]> {
    const out: C.CategoryStatus[] = [];
    for (const k of ev.categories) {
        const id = categoryId(k.id);
        const headCfg = k.headline ?? SLAS.members.find((m) => m.category === k.id)?.id;
        const headline = CONTRACT_OF.get(headCfg ?? "") ?? PAGE_MEMBERS[id][0];
        const setBy = k.setBy ? refOf(ev, k.setBy) : undefined;
        out.push({
            id,
            state: CAT_STATE[k.state],
            ...(setBy ? { setBy } : {}),
            others: k.others.flatMap((o) => refOf(ev, o) ?? []),
            headline: await memberOf(w, ev, headline, range),
        });
    }
    return out;
}

function episodesOf(ev: Evaluation): C.Episode[] {
    return ev.episodes.flatMap((e) => {
        const member = CONTRACT_OF.get(e.member);
        if (!member) return [];
        return [
            {
                id: `${e.member}@${e.start}`,
                category: categoryId(e.category),
                member,
                worst: e.worst === "FAILING" ? "bad" : "warn",
                start: iso(e.start),
                end: e.endedAt === undefined ? null : iso(e.endedAt),
                fact: {
                    code: "ep.member",
                    params: { member, ...(e.peak === undefined ? {} : { peak: round(e.peak) }) },
                },
                link: CATALOG[member].link,
            },
        ];
    });
}

const SOURCE_ID: Record<string, C.SourceId> = { release: "releases" };
const SOURCE_IDS = new Set<C.SourceId>([
    "collector",
    "ci-results",
    "ci-timings",
    "releases",
    "npm",
    "stress",
    "hosts",
    "billing",
    "flaky-feed",
    "local",
]);

function sourceState(s: SourceStatus): C.MemberState {
    switch (s.state) {
        case "ok":
            return "ok";
        case "stale":
            return (s.ageRatio ?? 0) > 2 ? "bad" : "warn";
        case "error":
            return "bad";
        case "thin":
            return "warn";
        case "not set up":
            return "notsetup";
        default:
            return "idle";
    }
}

function sourcesOf(ev: Evaluation): C.SourceAge[] {
    return ev.sources.flatMap((s) => {
        const id = SOURCE_ID[s.id] ?? (s.id as C.SourceId);
        if (!SOURCE_IDS.has(id)) return [];
        const yellow = SLAS.sources[s.id]?.yellowAfterMs;
        return [
            {
                id,
                lastWrite: s.lastOkAt === undefined ? null : iso(s.lastOkAt),
                limitS: yellow === undefined ? null : yellow / 1000,
                state: sourceState(s),
            },
        ];
    });
}

// ---------------------------------------------------------------------------------------------------------------
// Sections.

/** Sorted bars of one metric's dimensions over the range: a median (ms -> min) or a count of events. */
async function dimBars(
    w: Windows,
    id: string,
    metric: string,
    range: C.Range,
    as: "median" | "n",
): Promise<C.BarsSection | C.EmptySection> {
    const { bucket } = range === "1h" ? { bucket: await lastHour(w, metric) } : await w.total(metric, range);
    const items = Object.entries(bucket.dims ?? {})
        .map(([dim, a]) => {
            const v = as === "n" ? a.n : a.hist ? (quantile(a.hist, 0.5) ?? 0) / MIN_MS : 0;
            return {
                label: { t: "name", v: dim } as C.Cell,
                n: round(v),
                unit: (as === "n" ? "count" : "min") as C.Unit,
            };
        })
        .filter((i) => i.n > 0)
        .sort((a, b) => b.n - a.n);
    if (!items.length) return { kind: "empty", id, fact: { code: "empty.no_data", params: { metric } } };
    return { kind: "bars", id, groups: [{ items }] };
}

async function lastHour(w: Windows, metric: string): Promise<Bucket> {
    const l = await w.load(metric);
    const b = emptyAgg();
    for (const st of Windows.steps(l.q, "15m", 4, w.now)) mergeBucket(b, st.bucket);
    return b;
}

async function sectionsOf(w: Windows, page: Exclude<C.PageId, "overview">, range: C.Range): Promise<C.Section[]> {
    switch (page) {
        case "local-runs":
            return [
                await dimBars(w, "runs", "local.runs", range, "n"),
                await dimBars(w, "time", "local.shard_time", range, "median"),
            ];
        default:
            // ponytail: the other pages' tables (red spans, owner queue, lanes, sources) are not built yet; the page
            // draws the members alone until they are.
            return [];
    }
}

/** Full-run shard times over 7 d or 28 d, from the daily rollups of the budget-normalized metric (section 6). */
async function shardsSection(w: Windows, range: C.SlowRange, runKind: "full" | "pr-bins"): Promise<C.Section> {
    if (runKind === "pr-bins") return { kind: "empty", id: "shards", fact: { code: "empty.no_bin_times", params: {} } };
    const days = range === "7d" ? 7 : 28;
    const series = await w.days("ci.full_shard_time");
    const dims = new Map<string, Bucket>();
    for (const [start, b] of series)
        if (start > w.now - days * DAY)
            for (const [d, a] of Object.entries(b.dims ?? {})) {
                const into = dims.get(d) ?? emptyAgg();
                dims.set(d, into);
                mergeAgg(into, a);
            }
    const rows: C.ShardRow[] = [...dims].map(([shard, a]) => ({
        shard,
        runs: a.n,
        minRuns: 5,
        medianS: round((a.hist ? (quantile(a.hist, 0.5) ?? 0) : 0) / 1000),
        p90S: round((a.hist ? (quantile(a.hist, 0.9) ?? 0) : 0) / 1000),
        budgetS: HOUR / 1000, // the metric is normalized to a one-hour budget
    }));
    rows.sort((a, b) => b.medianS - a.medianS);
    return { kind: "shards", id: "shards", range, runKind, rows };
}

/** Flake hotspots by family over 7 d or 28 d (section 5): flaky events per 1000 file runs. */
async function hotspotsSection(w: Windows, range: C.SlowRange): Promise<C.Section> {
    const days = range === "7d" ? 7 : 28;
    const series = await w.days("flaky.rate");
    const dims = new Map<string, Bucket>();
    for (const [start, b] of series)
        if (start > w.now - days * DAY)
            for (const [d, a] of Object.entries(b.dims ?? {})) {
                const into = dims.get(d) ?? emptyAgg();
                dims.set(d, into);
                mergeAgg(into, a);
            }
    const nodes: C.TreeNode[] = [...dims]
        .filter(([, a]) => a.sum > 0)
        .map(([name, a]): C.TreeNode => ({
            level: "family",
            name,
            distinct: a.sum,
            events: a.sum,
            per1000: a.n > 0 ? round((a.sum / a.n) * 1000) : 0,
            quarantined: 0,
            prsHeld: 0,
        }))
        .sort((a, b) => b.per1000 - a.per1000);
    return { kind: "tree", id: "hotspots", range, nodes, quiet: dims.size - nodes.length };
}

// ---------------------------------------------------------------------------------------------------------------

/** Every precomputed read item, by its name (`status`, `page/<page>/<range>`, `section/<page>/<section>/<range>`). */
export async function buildPages(store: Store, ev: Evaluation, now: number): Promise<Map<string, unknown>> {
    const w = new Windows(store, now);
    const out = new Map<string, unknown>();
    const generated = iso(now);
    const episodes = episodesOf(ev);
    const sources = sourcesOf(ev);
    const status: C.StatusResponse = { generated, categories: await categoriesOf(w, ev, "1h"), episodes, sources };
    out.set("status", status);
    for (const range of RANGES) {
        const categories = range === "1h" ? status.categories : await categoriesOf(w, ev, range);
        out.set(`page/overview/${range}`, {
            ...status,
            categories,
            page: "overview",
            range,
        } satisfies C.OverviewResponse);
    }
    const byCat = new Map(status.categories.map((c) => [c.id as string, c]));
    for (const page of Object.keys(PAGE_MEMBERS) as Exclude<C.PageId, "overview">[]) {
        const ranges: (C.Range | C.SlowRange)[] = page === "costs" ? SLOW_RANGES : RANGES;
        for (const range of ranges) {
            const members = await Promise.all(PAGE_MEMBERS[page].map((id) => memberOf(w, ev, id, range)));
            const cat = byCat.get(page);
            const state: C.CategoryState = cat
                ? cat.state
                : page === "local-runs"
                  ? ev.sources.find((s) => s.id === "local")?.state === "idle"
                      ? "idle"
                      : "ok"
                  : worstOf(members);
            const sections = range === "7d" || range === "28d" ? [] : await sectionsOf(w, page, range);
            out.set(`page/${page}/${range}`, {
                page,
                range,
                generated,
                state,
                ...(cat?.setBy ? { setBy: cat.setBy } : {}),
                others: cat?.others ?? [],
                notes: [],
                members,
                sections,
            } satisfies C.PageResponse);
        }
    }
    for (const range of SLOW_RANGES) {
        for (const runKind of ["full", "pr-bins"] as const)
            out.set(`section/ci/shards/${range}/${runKind}`, {
                page: "ci",
                range,
                generated,
                section: await shardsSection(w, range, runKind),
            } satisfies C.SectionResponse);
        out.set(`section/flaky/hotspots/${range}`, {
            page: "flaky",
            range,
            generated,
            section: await hotspotsSection(w, range),
        } satisfies C.SectionResponse);
    }
    return out;
}

const WORST: C.CategoryState[] = ["bad", "warn", "nodata", "ok"];
function worstOf(members: C.Member[]): C.CategoryState {
    const states = new Set(members.map((m) => m.state));
    return WORST.find((s) => states.has(s)) ?? "idle";
}
