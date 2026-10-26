// The sections of each page (web/src/contract.ts, Section) built from the rollups. A section whose detail no writer
// records yet is an EmptySection with the same id, saying so, never a table of zeros.

import type {
    Cell,
    Fact,
    JobsSection,
    Member,
    PageId,
    Range,
    Section,
    ShardRow,
    SlowRange,
    Spark,
    StripSection,
    TableRow,
    TreeNode,
} from "../../web/src/contract.js";
import { quantile } from "../model/histogram.js";
import { type Agg, type Bucket, DAY, floorTo, MIN, STEP_MS } from "../model/items.js";
import { SHARD_BASE_MS } from "../model/metrics.js";
import { emptyAgg, mergeAgg } from "../model/rollup.js";
import { type MemberStatus } from "../sla/engine.js";
import { iso, type Reads, reasonFact, sourceState, SPEC } from "./members.js";

const f = (code: string, params?: Fact["params"]): Fact => (params ? { code, params } : { code });
const none: Cell = { t: "none" };
const round = (x: number) => Math.round(x * 100) / 100;
const STEP5 = STEP_MS["5m"];
const RANGE_STEPS: Record<Range, number> = { "1h": 12, "6h": 72, "24h": 288 };

/**
 * A section no writer feeds yet.
 * @param id
 */
export const notCollected = (id: string): Section => ({ kind: "empty", id, fact: f("section.no_detail") });

/**
 * Master builds by 5-minute bucket: red where the collector saw master red for half the bucket or more.
 * @param reads
 * @param range
 */
export async function masterStrip(reads: Reads, range: Range): Promise<StripSection | undefined> {
    const now5 = floorTo(reads.now, "5m");
    const from = now5 - (RANGE_STEPS[range] - 1) * STEP5;
    const got = await reads.series("master.red_ms", "5m", from, now5);
    const spans: StripSection["spans"] = [];
    for (let s = from; s <= now5; s += STEP5) {
        const b = got.get(s);
        if (!b?.n) {
            continue;
        }
        const state = b.sum >= STEP5 / 2 ? "red" : "green";
        const end = iso(Math.min(s + STEP5, reads.now));
        const last = spans.at(-1);
        if (last?.state === state && last.end === iso(s)) {
            last.end = end;
        } else {
            spans.push({ start: iso(s), end, state });
        }
    }
    return spans.length ? { kind: "strip", id: "red", from: iso(from), to: iso(reads.now), spans } : undefined;
}

/**
 * The red spans of the strip, newest first; an ongoing one has no end.
 * @param strip
 * @param now
 */
export function redSpans(strip: StripSection | undefined, now: number): Section {
    const red = (strip?.spans ?? []).filter((s) => s.state === "red").reverse();
    if (!red.length) {
        return { kind: "empty", id: "red-spans", fact: f("master.no_red_span") };
    }
    const rows: TableRow[] = red.map((s) => ({
        cells: {
            span: {
                t: "mark",
                state: "bad",
                cell: { t: "span", start: s.start, end: s.end === iso(now) ? null : s.end },
            },
            builds: none,
            cause: none,
            fix: none,
        },
    }));
    return { kind: "table", id: "red-spans", rows };
}

/**
 * Running and queued jobs (collector stocks `ci.jobs_running`, `ci.jobs_queued`), gaps carried forward.
 * @param reads
 * @param range
 */
export async function jobs(reads: Reads, range: Range): Promise<Section> {
    const w = range === "24h" ? "24h" : "6h";
    const [run, q] = await Promise.all([reads.window("ci.jobs_running", w), reads.window("ci.jobs_queued", w)]);
    const first = run.series.findIndex((s) => s.bucket.lastAt !== undefined);
    if (first < 0) {
        return notCollected("jobs");
    }
    const carry = (series: typeof run.series) => {
        let prev = 0;
        return series.slice(first).map((s) => (prev = s.bucket.last ?? prev));
    };
    const running = carry(run.series);
    const queued = carry(q.series);
    let peak = { n: -1, at: iso(run.series[first].start) };
    run.series.slice(first).forEach((s) => {
        const n = s.bucket.max ?? -1;
        if (n > peak.n) {
            peak = { n, at: iso(s.start) };
        }
    });
    const out: JobsSection = {
        kind: "jobs",
        id: "jobs",
        step: range === "24h" ? "1h" : "15m",
        start: iso(run.series[first].start),
        running,
        queued,
        limit: reads.cfg.runnerLimits.linux_windows ?? 60,
        peak: { n: Math.max(0, peak.n), at: peak.at },
    };
    return out;
}

/**
 * One metric's dimensions merged over the last `days` daily buckets.
 * @param reads
 * @param metric
 * @param days
 */
async function dimsOver(reads: Reads, metric: string, days: number): Promise<Map<string, Agg>> {
    const today = floorTo(reads.now, "1d");
    const out = new Map<string, Agg>();
    for (const b of (await reads.series(metric, "1d", today - (days - 1) * DAY, today)).values()) {
        for (const [d, a] of Object.entries(b.dims ?? {})) {
            const into = out.get(d) ?? emptyAgg();
            out.set(d, into);
            mergeAgg(into, a);
        }
    }
    return out;
}

const daysOf = (r: SlowRange) => (r === "28d" ? 28 : 7);
const SHOWN = 12;

/**
 * One shard's or family's row; undefined while it has no time or (full runs) no recorded budget.
 * @param shard
 * @param a
 * @param full
 * @param minRuns
 */
function shardRow(shard: string, a: Agg, full: boolean, minRuns: number): ShardRow | undefined {
    const q50 = a.hist && quantile(a.hist, 0.5);
    const q90 = a.hist && quantile(a.hist, 0.9);
    // A full-run value is normalized to a one-hour budget; the bucket's sum holds the budgets themselves.
    let budgetMs: number | undefined = 480_000;
    if (full) {
        budgetMs = a.n > 0 && a.sum > 0 ? a.sum / a.n : undefined;
    }
    if (q50 === undefined || q90 === undefined || budgetMs === undefined) {
        return undefined;
    }
    const ms = budgetMs;
    const toS = (q: number) => Math.round((full ? (q * ms) / SHARD_BASE_MS : q) / 1000);
    return { shard, runs: a.n, minRuns, medianS: toS(q50), p90S: toS(q90), budgetS: Math.round(ms / 1000) };
}

/**
 * Shard times (section 6): full-run shards against their budgets, or pull request bins against 8 minutes.
 * @param reads
 * @param range
 * @param runKind
 */
export async function shards(reads: Reads, range: SlowRange, runKind: "full" | "pr-bins"): Promise<Section> {
    const full = runKind === "full";
    const dims = await dimsOver(reads, full ? "ci.full_shard_time" : "ci.bin_time", daysOf(range));
    const over = reads.cfg.members.find((m) => m.id === "ci.full_shards_over_budget")?.measure;
    const minRuns = over && "minPerDim" in over ? over.minPerDim : 5;
    const rows = [...dims]
        .map(([shard, a]) => shardRow(shard, a, full, minRuns))
        .filter((r): r is ShardRow => r !== undefined);
    if (!rows.length) {
        return notCollected("shards");
    }
    rows.sort((x, y) => y.medianS / y.budgetS - x.medianS / x.budgetS);
    const rest = rows.slice(SHOWN);
    return {
        kind: "shards",
        id: "shards",
        range,
        runKind,
        rows: rows.slice(0, SHOWN),
        ...(rest.length ? { more: { count: rest.length, allWithin: rest.every((r) => r.medianS <= r.budgetS) } } : {}),
    };
}

/**
 * Flake hotspots (section 5): family, file, test, ranked by distinct flaky tests. Quarantine and held pull
 * requests have no writer yet (the flaky feed), so they are null.
 * @param reads
 * @param range
 */
export async function hotspots(reads: Reads, range: SlowRange): Promise<Section> {
    const days = daysOf(range);
    const [tests, rate] = await Promise.all([
        dimsOver(reads, "flaky.tests", days),
        dimsOver(reads, "flaky.rate", days),
    ]);
    const fams = new Map<string, Map<string, Map<string, number>>>();
    for (const [key, a] of tests) {
        const [family, file, test] = JSON.parse(key) as [string, string, string];
        const files = fams.get(family) ?? new Map<string, Map<string, number>>();
        fams.set(family, files);
        const ts = files.get(file) ?? new Map<string, number>();
        files.set(file, ts);
        ts.set(test, (ts.get(test) ?? 0) + a.sum);
    }
    const node = (
        level: TreeNode["level"],
        name: string,
        distinct: number,
        events: number,
        per1000: number | null,
    ) => ({
        level,
        name,
        distinct,
        events,
        per1000,
        quarantined: null,
        prsHeld: null,
    });
    const byDistinct = (a: TreeNode, b: TreeNode) => b.distinct - a.distinct || b.events - a.events;
    const nodes: TreeNode[] = [];
    for (const [family, files] of fams) {
        const fileNodes: TreeNode[] = [];
        for (const [file, ts] of files) {
            const children: TreeNode[] = [...ts].map(([test, n]) => ({
                ...node("test", test, 1, n, null),
                link: `/flaky/test?${new URLSearchParams({ file, test }).toString()}`,
            }));
            const events = children.reduce((s, c) => s + c.events, 0);
            fileNodes.push({
                ...node("file", file, children.length, events, null),
                children: children.toSorted(byDistinct),
            });
        }
        const r = rate.get(family);
        const events = fileNodes.reduce((s, c) => s + c.events, 0);
        const distinct = fileNodes.reduce((s, c) => s + c.distinct, 0);
        const per1000 = r && r.n > 0 ? round((r.sum / r.n) * 1000) : null;
        nodes.push({ ...node("family", family, distinct, events, per1000), children: fileNodes.toSorted(byDistinct) });
    }
    const quiet = [...rate.keys()].filter((fam) => !fams.has(fam)).length;
    return { kind: "tree", id: "hotspots", range, nodes: nodes.toSorted(byDistinct), quiet };
}

/**
 * The sources table of the Data sources page (section 9), from the engine's source states.
 * @param reads
 */
export function sourcesTable(reads: Reads): Section {
    const rows: TableRow[] = reads.ev.sources
        .filter((s) => s.state !== "not set up")
        .map((s) => {
            const cfg = reads.cfg.sources[s.id];
            const state: Cell = s.state === "ok" ? none : { t: "state", state: sourceState(s) };
            const reason = reasonFact(s.reason, reads);
            return {
                ...(s.state === "idle" ? { past: true } : {}),
                cells: {
                    source: { t: "label", code: `source.${s.id}` },
                    write: s.lastOkAt === undefined ? none : { t: "ago", at: iso(s.lastOkAt) },
                    limit: cfg?.yellowAfterMs === undefined ? none : { t: "dur", s: cfg.yellowAfterMs / 1000 },
                    volume:
                        s.thinRatio === undefined ? none : { t: "num", n: Math.round(s.thinRatio * 100), unit: "pct" },
                    error: s.state === "error" && reason ? { t: "fact", fact: reason } : none,
                    state,
                },
            };
        });
    return { kind: "table", id: "sources", rows };
}

/**
 * The members that are not set up, wherever they show, and what unblocks each.
 * @param reads
 * @param members
 */
export function notSetUpTable(reads: Reads, members: MemberStatus[]): Section {
    const seen = new Set<string>();
    const rows: TableRow[] = [];
    for (const m of members) {
        const spec = SPEC[m.id];
        if (m.state !== "NOT SET UP" || m.reason?.code !== "not_set_up" || !spec || seen.has(spec.id)) {
            continue;
        }
        seen.add(spec.id);
        const unblock = reasonFact(m.reason, reads);
        rows.push({
            cells: {
                member: { t: "label", code: `member.${spec.id}` },
                on: { t: "label", code: `page.${spec.id.split(".")[0]}` },
                unblock: unblock ? { t: "fact", fact: unblock } : none,
            },
        });
    }
    return rows.length
        ? { kind: "table", id: "not-set-up", rows }
        : { kind: "empty", id: "not-set-up", fact: f("data.all_set_up") };
}

/** Cost lines of the money table: the cost.usd dimension, its member and its budget. */
const LINES: { line: string; member?: string }[] = [
    { line: "t4", member: "cost.t4" },
    { line: "llm", member: "cost.llm" },
    { line: "sentry" },
    { line: "github" },
    { line: "cloudflare" },
    { line: "aws", member: "cost.aws" },
];

/**
 * The money table (section 7): projected month, so far against budget, the daily line over the range.
 * @param reads
 * @param range
 * @param members
 */
export async function moneyTable(reads: Reads, range: SlowRange, members: Map<string, Member>): Promise<Section> {
    const days = daysOf(range);
    const d = new Date(reads.now);
    const monthStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    const monthDays = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - monthStart) / DAY;
    const today = floorTo(reads.now, "1d");
    const from = Math.min(monthStart, today - (days - 1) * DAY);
    const daily = await reads.series("cost.usd", "1d", from, today);
    const sumOf = (b: Bucket | undefined, line?: string) => {
        if (!b) {
            return 0;
        }
        return line === undefined ? b.sum : (b.dims?.[line]?.sum ?? 0);
    };
    const lineRow = (line: string | undefined, memberId: string | undefined): TableRow | undefined => {
        let soFar = 0;
        let done = 0;
        let seen = false;
        for (const [s, b] of daily) {
            if (s >= monthStart) {
                soFar += sumOf(b, line);
                done += s < today ? sumOf(b, line) : 0;
                seen ||= line === undefined ? b.n > 0 : (b.dims?.[line]?.n ?? 0) > 0;
            }
        }
        if (!seen) {
            return undefined;
        }
        const elapsed = (today - monthStart) / DAY;
        const projected = elapsed === 0 ? soFar : (done / elapsed) * monthDays;
        const budget = memberId ? (reads.config(memberId).ok?.[1] ?? null) : null;
        const trend = Array.from({ length: days }, (_, i) => {
            const b = daily.get(today - (days - 1 - i) * DAY);
            return b ? round(sumOf(b, line)) : null;
        });
        const spark: Spark = { step: "1d", ctx: [], trend, breach: trend.map(() => null) };
        const st = memberId ? members.get(memberId)?.state : undefined;
        return {
            ...(line === undefined ? { total: true } : {}),
            cells: {
                line: { t: "label", code: line === undefined ? "cost.total" : `cost.${line}` },
                projected: { t: "num", n: round(projected), unit: "usd", bold: true },
                sofar: { t: "budget", so: round(soFar), budget, unit: "usd" },
                spark: line === undefined ? none : { t: "spark", spark },
                state: st === "warn" || st === "bad" ? { t: "state", state: st } : none,
            },
        };
    };
    const rows = LINES.map((l) => lineRow(l.line, l.member)).filter((r): r is TableRow => r !== undefined);
    if (!rows.length) {
        return { kind: "empty", id: "money", fact: f("section.no_detail") };
    }
    const total = lineRow(undefined, "cost.spend");
    if (total) {
        rows.push(total);
    }
    for (const id of ["cost.sentry_usage", "cost.cloudflare_usage"]) {
        const m = members.get(id);
        if (m && (m.state === "notsetup" || m.state === "nodata")) {
            rows.push({
                past: true,
                cells: {
                    line: { t: "label", code: id },
                    projected: none,
                    sofar: none,
                    spark: none,
                    state: { t: "state", state: m.state, link: "/data-sources/not-set-up" },
                },
            });
        }
    }
    return {
        kind: "table",
        id: "money",
        sub: f("costs.money.sub", { month_end: iso(monthStart + (monthDays - 1) * DAY).slice(0, 10) }),
        rows,
    };
}

/** The page each section list belongs to, with the ids the page draws (web/src/render.ts). */
const median = (a: Agg) => (a.hist && quantile(a.hist, 0.5)) ?? 0;

/**
 * Sorted bars of one metric's dimensions over the range: the median (ms -> min) or the count of events.
 * @param reads
 * @param id - the section id
 * @param metric
 * @param range
 * @param as
 */
export async function dimBars(
    reads: Reads,
    id: string,
    metric: string,
    range: Range,
    as: "median" | "n",
): Promise<Section> {
    const { total } = await reads.window(metric, range);
    const items = Object.entries(total.dims ?? {})
        .map(([dim, a]) => ({
            label: { t: "name", v: dim } as Cell,
            n: round(as === "n" ? a.n : median(a) / MIN),
            unit: as === "n" ? ("count" as const) : ("min" as const),
        }))
        .filter((i) => i.n > 0)
        .sort((a, b) => b.n - a.n);
    if (!items.length) {
        return { kind: "empty", id, fact: f("section.no_events", { metric }) };
    }
    return { kind: "bars", id, groups: [{ items }] };
}

export const NOT_COLLECTED: Partial<Record<PageId, string[]>> = {
    master: ["shared"],
    "pull-requests": ["time", "owner"],
    ci: ["causes"],
    runners: ["holders", "superseded"],
    flaky: ["quarantine"],
    releases: ["lanes", "trains", "workflows"],
    "data-sources": ["stress"],
};
