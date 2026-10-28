// The SLA engine's members as the page's Member rows (web/src/contract.ts): ids, units, SLAs, values at a range,
// sparklines and reasons. States are the engine's; this file only translates them and reads values for the range.

import type {
    Cmp,
    Fact,
    Member,
    MemberId,
    MemberState,
    MemberWindow,
    PageId,
    Range,
    Route,
    Sla,
    SourceAge,
    Spark,
    Unit,
    Value,
    WordValue,
} from "../../web/src/contract.js";
import { type Bucket, DAY, floorTo, HOUR, MIN, type Step, STEP_MS } from "../model/items.js";
import { loadSeries, type MetricWindow, windowValue, type WindowName } from "../model/rollup.js";
import type { Store } from "../model/store.js";
import type { Measure, MemberConfig, SlaConfig, Threshold } from "../sla/config.js";
import {
    type Evaluation,
    measureValue,
    type MemberStatus,
    type Reason,
    type SourceStatus,
    thresholds,
} from "../sla/engine.js";

/** How one engine member is shown: its contract id, the unit and multiplier of its values, its link. */
interface Spec {
    id: MemberId;
    unit?: Unit;
    /** Engine value (ms, fraction) times k is the shown value. */
    k?: number;
    link: Route;
    word?: (v: number) => WordValue;
    ago?: boolean;
    signed?: boolean;
    /** A target or red threshold that is not a plain comparison (catalog codes in web/src/text.ts). */
    target?: Fact;
    red?: Fact;
}

const PCT = 100;
const toMin = 1 / MIN;
const toH = 1 / HOUR;
const f = (code: string, params?: Fact["params"]): Fact => (params ? { code, params } : { code });

const STRESS_WORD: WordValue[] = [{ word: "passed" }, { word: "filed", n: 0 }, { word: "failed" }];

/** Engine member id -> its row. The six channel members share one row (all not set up until #3418). */
export const SPEC: Record<string, Spec> = {
    "master.red_now": { id: "master.red_now", unit: "min", k: toMin, link: "/master/red", red: f("sla.red_now") },
    "master.green_time": { id: "master.green_time", unit: "pct", k: PCT, link: "/master/red" },
    "master.red_same_check": { id: "master.same_check", link: "/master/shared" },
    "master.last_full_run": {
        id: "master.full_run_verdict",
        link: "/releases/lanes",
        word: (v) => ({ word: v >= 1 ? "failed" : "passed" }),
        target: f("sla.word", { word: "passed" }),
    },
    "master.untested_age": { id: "master.untested_age", unit: "h", k: toH, link: "/releases/trains" },
    "master.reverts": { id: "master.reverts", unit: "pct", k: PCT, link: "/master" },
    "pr.time_to_merge": { id: "pull-requests.time_to_merge", unit: "min", k: toMin, link: "/pull-requests" },
    "pr.open": { id: "pull-requests.open", link: "/pull-requests" },
    "pr.oldest_open": { id: "pull-requests.oldest_open", unit: "h", k: toH, link: "/pull-requests" },
    "pr.merge_ratio": { id: "pull-requests.merge_ratio", unit: "ratio", link: "/pull-requests" },
    "pr.caused_failures": { id: "pull-requests.caused_failures", unit: "pct", k: PCT, link: "/pull-requests" },
    "pr.automerge_stuck": { id: "pull-requests.automerge_stuck", link: "/pull-requests" },
    "pr.screenshot_backlog": {
        id: "pull-requests.screenshot_backlog",
        unit: "h",
        k: toH,
        link: "/pull-requests/owner",
    },
    "ci.runner_wait": { id: "ci.runner_wait", unit: "min", k: toMin, link: "/ci/runners" },
    "ci.longest_queued": { id: "ci.longest_queued", unit: "min", k: toMin, link: "/ci/runners" },
    "ci.saturated_time": { id: "ci.saturated", unit: "min", k: toMin, link: "/ci/runners" },
    "ci.runners_not_assigned": {
        id: "ci.not_assigned",
        unit: "min",
        k: toMin,
        link: "https://www.githubstatus.com/",
    },
    "ci.first_attempt": { id: "ci.first_attempt", unit: "pct", k: PCT, link: "/ci/causes" },
    "ci.hangs": { id: "ci.hangs", link: "/master/red" },
    "ci.pr_check_duration": { id: "ci.pr_duration", unit: "x", link: "/ci" },
    "ci.bins_over_8": { id: "ci.bins_over", unit: "pct", k: PCT, link: "/ci/shards" },
    "ci.reruns": { id: "ci.reruns", unit: "pct", k: PCT, link: "/ci" },
    "ci.full_shards_over_budget": { id: "ci.shards_over", link: "/ci/shards" },
    "ci.runner_minutes_per_merge": { id: "ci.runner_minutes", unit: "min", link: "/ci/runner-minutes" },
    "ci.superseded_running": { id: "ci.superseded", link: "/ci/runners/superseded" },
    "ci.chronic_jobs": { id: "ci.chronic_jobs", link: "/ci/chronic", red: f("sla.any_no_issue") },
    "ci.bench_regressions": { id: "ci.bench_regressions", link: "/ci/benchmarks" },
    "flaky.rate": { id: "flaky.flake_rate", unit: "per1000", link: "/flaky/hotspots" },
    "flaky.blocked": { id: "flaky.blocked", link: "/flaky/hotspots", red: f("sla.blocked") },
    "flaky.no_issue": { id: "flaky.no_issue", link: "/flaky/hotspots" },
    "flaky.net_new": { id: "flaky.net_new", link: "/flaky", signed: true },
    "flaky.detected_to_fixed": { id: "flaky.detected_to_fixed", unit: "d", k: 1 / DAY, link: "/flaky" },
    "release.lanes_red": { id: "releases.lanes_red", link: "/releases/lanes", red: f("sla.lanes_open", { h: 6 }) },
    "release.workflows_failing": {
        id: "releases.workflows_failing",
        link: "/releases/workflows",
        red: f("sla.failed_in_a_row", { runs: 3 }),
    },
    "release.train_skipped": {
        id: "releases.train_skipped",
        link: "/releases/trains",
        word: (v) => ({ word: v >= 1 ? "yes" : "no" }),
        target: f("sla.word", { word: "no" }),
    },
    "release.tagged_not_on_npm": { id: "releases.tagged_not_npm", link: "/releases", red: f("sla.after", { min: 30 }) },
    "release.train_first_attempt": { id: "releases.train_first_pass", unit: "pct", k: PCT, link: "/releases/trains" },
    "release.canary_age": {
        id: "releases.channels",
        unit: "h",
        k: toH,
        link: "/data-sources/not-set-up",
        target: f("sla.canary_age", { h: 6 }),
    },
    "cost.spend": { id: "costs.spend", unit: "usd", link: "/costs" },
    "cost.t4": { id: "costs.t4", unit: "usd", link: "/costs" },
    "cost.llm": { id: "costs.llm", unit: "usd", link: "/costs" },
    "cost.aws": { id: "costs.aws", unit: "usd", link: "/costs" },
    "cost.cloudflare_usage": { id: "costs.cloudflare_usage", unit: "pct", k: PCT, link: "/data-sources/not-set-up" },
    "cost.sentry_usage": { id: "costs.sentry_usage", unit: "pct", k: PCT, link: "/data-sources/not-set-up" },
    "data.stress_run": {
        id: "data-sources.stress_run",
        link: "/data-sources/stress",
        // stress.state: 0 passed and filed, 1 found nothing three weeks running, 2 filing failed or the run broke.
        word: (v) => STRESS_WORD[Math.min(2, Math.max(0, Math.round(v)))],
        target: f("sla.passed_and_filed"),
        red: f("sla.filing_failed"),
    },
    "data.sources_age": { id: "data-sources.past_age", link: "/data-sources/sources", red: f("sla.past_2x") },
    "data.sources_thin": { id: "data-sources.thin", unit: "ratio", link: "/data-sources/sources" },
    "data.collector": { id: "data-sources.collector", unit: "min", k: toMin, ago: true, link: "/data-sources/sources" },
    "data.rate_limit": { id: "data-sources.app_rate", unit: "pct", k: PCT, link: "/data-sources/sources" },
    "data.write_budget": { id: "data-sources.write_budget", unit: "pct", k: PCT, link: "/data-sources/sources" },
};

/**
 * The Local runs members (section 9): informational, never judged, so they have no SLA member; their values are
 * read from the local writer's rollups here.
 */
export const LOCAL: Record<string, { measure: Measure; spec: Spec }> = {
    "local-runs.local_vs_ci": {
        measure: { type: "rate", metric: "local.runs" },
        spec: { id: "local-runs.local_vs_ci", unit: "pct", k: PCT, link: "/ci/local-runs" },
    },
    "local-runs.shard_time": {
        measure: { type: "median", metric: "local.shard_time" },
        spec: { id: "local-runs.shard_time", unit: "min", k: toMin, link: "/ci/local-runs" },
    },
    "local-runs.slot_waits": {
        measure: { type: "p90", metric: "local.slot_wait" },
        spec: { id: "local-runs.slot_waits", unit: "min", k: toMin, link: "/ci/local-runs" },
    },
};

/** The engine's category ids, which the config spells with underscores. */
export const CATEGORY: Record<string, Exclude<PageId, "overview" | "runners" | "local-runs">> = {
    master: "master",
    pull_requests: "pull-requests",
    ci: "ci",
    flaky: "flaky",
    releases: "releases",
    costs: "costs",
    data_sources: "data-sources",
};

const STATE: Record<MemberStatus["state"], MemberState> = {
    OK: "ok",
    WARNING: "warn",
    FAILING: "bad",
    "NO DATA": "nodata",
    "NOT SET UP": "notsetup",
    "TOO FEW SAMPLES": "few",
    "PARTIAL WINDOW": "partial",
    IDLE: "idle",
};

const round = (x: number) => (Math.abs(x) >= 100 ? Math.round(x) : Math.round(x * 100) / 100);
export const iso = (ms: number) => new Date(ms).toISOString();
const RANGE_MS: Record<Range, number> = { "1h": HOUR, "6h": 6 * HOUR, "24h": DAY };

/** Reads shared by every member and section of one build, each store query made once. */
export class Reads {
    readonly store: Store;
    readonly now: number;
    readonly ev: Evaluation;
    readonly cfg: SlaConfig;
    private readonly cache = new Map<string, Promise<unknown>>();

    /**
     * @param store
     * @param now
     * @param ev
     * @param cfg
     */
    constructor(store: Store, now: number, ev: Evaluation, cfg: SlaConfig) {
        this.store = store;
        this.now = now;
        this.ev = ev;
        this.cfg = cfg;
    }

    private once<T>(key: string, load: () => Promise<T>): Promise<T> {
        let p = this.cache.get(key) as Promise<T> | undefined;
        if (!p) {
            p = load();
            this.cache.set(key, p);
        }
        return p;
    }

    /**
     * @param metric
     * @param w
     */
    window(metric: string, w: WindowName): Promise<MetricWindow> {
        return this.once(`w:${metric}:${w}`, () => windowValue(this.store, metric, w, this.now));
    }

    /**
     * @param metric
     * @param step
     * @param from
     * @param to
     */
    series(metric: string, step: Step, from: number, to: number): Promise<Map<number, Bucket>> {
        return this.once(`s:${metric}:${step}:${from}:${to}`, () =>
            loadSeries(this.store, metric, step, from, to, this.now),
        );
    }

    /**
     * @param id
     */
    config(id: string): MemberConfig {
        const c = this.cfg.members.find((m) => m.id === id);
        if (!c) {
            throw new Error(`no SLA member ${id}`);
        }
        return c;
    }

    /**
     * When every source of a member has written: before it, a bucket is "no history", not zero.
     * @param c
     */
    historyStart(c: MemberConfig): number | undefined {
        let start = -Infinity;
        for (const id of c.sources) {
            const s = this.ev.sources.find((x) => x.id === id);
            if (s?.firstAt === undefined) {
                return undefined;
            }
            start = Math.max(start, s.firstAt);
        }
        return start;
    }
}

const cmp = ([op, n]: Threshold, spec: Spec): Cmp => ({
    op: op === "=" ? "==" : op,
    n: round(n * (spec.k ?? 1)),
    ...(spec.unit ? { unit: spec.unit } : {}),
});

/**
 * @param c
 * @param spec
 */
export function slaOf(c: MemberConfig, spec: Spec): Sla | null {
    const target = spec.target ?? (c.ok ? cmp(c.ok, spec) : undefined);
    if (!target) {
        return null;
    }
    const red = spec.red ?? (c.fail ? cmp(c.fail, spec) : undefined);
    return { target, ...(red ? { red } : {}), ...(c.window === "1h+6h" ? { needs6h: true } : {}) };
}

/**
 * @param v
 * @param spec
 */
export function valueOf(v: number | undefined, spec: Spec): Value {
    if (v === undefined || !Number.isFinite(v)) {
        return null;
    }
    if (spec.word) {
        return spec.word(v);
    }
    return {
        n: round(v * (spec.k ?? 1)),
        ...(spec.unit ? { unit: spec.unit } : {}),
        ...(spec.ago ? { ago: true } : {}),
        ...(spec.signed ? { signed: true } : {}),
    };
}

/**
 * An engine reason as a catalog fact; undefined where the state chip already says it (few, partial).
 * @param r
 * @param reads
 */
export function reasonFact(r: Reason | undefined, reads: Reads): Fact | undefined {
    if (!r) {
        return undefined;
    }
    const source = String(r.params.source ?? "");
    switch (r.code) {
        case "not_set_up": {
            const unblock: Record<string, Fact> = {
                "cloudflare-token": f("unblock.cloudflare_token"),
                "sentry-token": f("unblock.sentry_token"),
                "flaky-feed": f("unblock.flaky_feed"),
            };
            const issue = /#(\d+)/.exec(String(r.params.why ?? ""))?.[1];
            if (source === "channels" && issue) {
                return f("unblock.channels", { issue: Number(issue) });
            }
            return unblock[source] ?? f("reason.not_set_up", { source });
        }
        case "stale": {
            const ok = reads.ev.sources.find((s) => s.id === source)?.lastOkAt;
            return ok === undefined
                ? f("reason.no_write", { source })
                : f("nodata.source_late", { source, h: round((reads.now - ok) / HOUR) });
        }
        case "error":
            return f("nodata.source_error", {
                source,
                error: String(r.params.error ?? ""),
                since: iso(Number(r.params.since)),
            });
        case "idle":
            return f("reason.idle", { source });
        case "thin":
            return f("reason.thin", { source, ratio: round(Number(r.params.ratio)) });
        case "no_value":
            return f("reason.no_value");
        default:
            return undefined;
    }
}

const MEMBER_WINDOW: Record<MemberConfig["window"], MemberWindow> = {
    "1h": "1h",
    "1h+6h": "1h6h",
    now: "now",
    slow: "7d",
    info: "now",
};

/**
 * @param s
 * @param c
 */
export function stateOf(s: MemberStatus, c: MemberConfig): MemberState {
    if (s.reason?.code === "informational") {
        return "info";
    }
    const st = STATE[s.state];
    return c.window === "slow" && (st === "ok" || st === "warn" || st === "bad") ? "slow" : st;
}

const BREACH: Partial<Record<MemberStatus["state"], "warn" | "bad">> = { WARNING: "warn", FAILING: "bad" };
const GRAY = new Set<MemberState>(["nodata", "notsetup", "idle", "info"]);
const BUCKETED = new Set(["rate", "median", "p90", "sum", "share", "last"]);
const windowed = (c: MemberConfig) => c.window === "1h" || c.window === "1h+6h";

function covered(start: number | undefined, now: number, spanMs: number): { h: number; of: number } | undefined {
    if (start === undefined || now - start >= spanMs) {
        return undefined;
    }
    return { h: round(Math.max(0, now - start) / HOUR), of: spanMs / HOUR };
}

/**
 * A member's sparkline (section 2.3): 6 h in 15-minute buckets with 18 faint hours before, or 24 hours at 24 h.
 * @param reads
 * @param c
 * @param spec
 * @param range
 */
async function sparkOf(reads: Reads, c: MemberConfig, spec: Spec, range: Range): Promise<Spark | undefined> {
    const m = c.measure;
    if (!BUCKETED.has(m.type) || !("metric" in m) || spec.word) {
        return undefined;
    }
    const hs = reads.historyStart(c) ?? Infinity;
    const k = spec.k ?? 1;
    const point = (start: number, b: Bucket | undefined, stepMs: number): number | null => {
        if (start + stepMs <= hs) {
            return null;
        }
        const v = measureValue(m, b ?? { n: 0, sum: 0 }, stepMs);
        return v === undefined ? null : round(v * k);
    };
    const judge = (start: number, b: Bucket, stepMs: number): "warn" | "bad" | null => {
        const v = start + stepMs <= hs ? undefined : measureValue(m, b, stepMs);
        if (v === undefined) {
            return null;
        }
        return BREACH[thresholds(c, v, v).state] ?? null;
    };
    const target = c.ok ? round(c.ok[1] * k) : undefined;
    const main = await reads.window(m.metric, range === "24h" ? "24h" : "6h");
    const stepMs = STEP_MS[main.step];
    const trend = main.series.map((s) => point(s.start, s.bucket, stepMs));
    const breach = main.series.map((s) => judge(s.start, s.bucket, stepMs));
    let ctx: (number | null)[] = [];
    if (range !== "24h") {
        const end = floorTo(main.from, "1h");
        const from = end - 18 * HOUR;
        const hours = await reads.series(m.metric, "1h", from, end - HOUR);
        ctx = Array.from({ length: 18 }, (_, i) => point(from + i * HOUR, hours.get(from + i * HOUR), HOUR));
    }
    return {
        step: range === "24h" ? "1h" : "15m",
        ctx,
        trend,
        breach,
        ...(target === undefined ? {} : { target }),
    };
}

/**
 * One engine member as the page's row at a range: the state is the engine's; at 6 h and 24 h a windowed member's
 * value, n and coverage cover the range (section 8), and the 1 h value stays the judged one.
 * @param reads
 * @param s
 * @param range
 * @param id
 */
export async function memberAt(reads: Reads, s: MemberStatus, range: Range, id?: MemberId): Promise<Member> {
    const c = reads.config(s.id);
    const spec = SPEC[s.id];
    const state = stateOf(s, c);
    const m = c.measure;
    const reason = reasonFact(s.reason, reads);
    const out: Member = {
        id: id ?? spec.id,
        window: c.window === "slow" ? (c.slowWindow ?? "7d") : MEMBER_WINDOW[c.window],
        state,
        value: null,
        sla: slaOf(c, spec),
        link: spec.link,
        ...(s.minN === undefined ? {} : { minN: s.minN }),
        ...(reason ? { reason } : {}),
        ...(s.clearedAt === undefined ? {} : { cleared: iso(s.clearedAt) }),
    };
    if (GRAY.has(state) && state !== "info") {
        return out;
    }
    const hs = reads.historyStart(c);
    const bucketed = BUCKETED.has(m.type) && "metric" in m;
    if (windowed(c) && bucketed && range !== "1h") {
        const w = await reads.window(m.metric, range);
        out.value = valueOf(measureValue(m, w.total, reads.now - w.from), spec);
        out.n = w.total.n;
        const cov = covered(hs, reads.now, RANGE_MS[range]);
        if (cov) {
            out.covered = cov;
        }
    } else {
        out.value = state === "few" ? null : valueOf(s.value, spec);
        if (s.n !== undefined && (s.minN !== undefined || windowed(c))) {
            out.n = s.n;
        }
        if (state === "partial" && s.reason) {
            out.covered = { h: Number(s.reason.params.hours), of: Number(s.reason.params.of) };
        }
        if (s.reason?.code === "partial" && s.reason.params.days !== undefined) {
            out.coveredDays = { d: Number(s.reason.params.days), of: Number(s.reason.params.of) };
        }
    }
    if (windowed(c)) {
        let v6 = s.value6h;
        if (v6 === undefined && bucketed) {
            const w6 = await reads.window(m.metric, "6h");
            v6 = measureValue(m, w6.total, reads.now - w6.from);
        }
        const value6h = valueOf(v6, spec);
        if (value6h) {
            out.value6h = value6h;
        }
        const cov6 = covered(hs, reads.now, 6 * HOUR);
        if (cov6) {
            out.covered6h = cov6;
        }
    }
    const spark = await sparkOf(reads, c, spec, range);
    if (spark) {
        out.spark = spark;
    }
    return out;
}

/**
 * One Local runs member at a range: its value, n and sparkline from the local writer's rollups, in the given state.
 * @param reads
 * @param id - a key of LOCAL
 * @param range
 * @param state - the local source's state as a member state; a value is read only when it is "info"
 * @param reason
 */
export async function localMember(
    reads: Reads,
    id: string,
    range: Range,
    state: MemberState,
    reason?: Fact,
): Promise<Member> {
    const { measure, spec } = LOCAL[id];
    const out: Member = {
        id: spec.id,
        window: "1h",
        state,
        value: null,
        sla: null,
        link: spec.link,
        ...(reason ? { reason } : {}),
    };
    if (state !== "info" || !("metric" in measure)) {
        return out;
    }
    const w = await reads.window(measure.metric, range);
    out.value = valueOf(measureValue(measure, w.total, reads.now - w.from), spec);
    out.n = w.total.n;
    const c: MemberConfig = { id, category: "local", label: id, window: "1h", measure, sources: ["local"] };
    const spark = await sparkOf(reads, c, spec, range);
    if (spark) {
        out.spark = spark;
    }
    return out;
}

/**
 * A source's state as the page draws it: stale is yellow, red past twice its age limit (section 9).
 * @param s
 */
export function sourceState(s: SourceStatus): SourceAge["state"] {
    switch (s.state) {
        case "ok":
            return "ok";
        case "not set up":
            return "notsetup";
        case "idle":
            return "idle";
        case "thin":
            return "warn";
        case "error":
            return "bad";
        case "stale":
            if (s.lastOkAt === undefined) {
                return "nodata";
            }
            return (s.ageRatio ?? 0) > 2 ? "bad" : "warn";
    }
}
