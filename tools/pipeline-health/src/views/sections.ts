// The sections of each page (web/src/contract.ts, Section) built from the rollups. A section whose detail no writer
// records yet is an EmptySection with the same id, saying so, never a table of zeros.

import type {
    BarsSection,
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
import rates from "../../config/rates.json" with { type: "json" };
import type { StressCursorRun } from "../collector/parse.js";
import { quantile } from "../model/histogram.js";
import { type Agg, type Bucket, DAY, floorTo, HOUR, type LoadKind, MIN, STEP_MS } from "../model/items.js";
import { fileRunKey, hotspotFamily } from "../model/metrics.js";
import { getCursor } from "../model/raw.js";
import { aggQuantile, emptyAgg, mergeAgg } from "../model/rollup.js";
import { readSnapshot } from "../model/snapshots.js";
import { type MemberStatus, PROJECTION_DAYS, projectMonth } from "../sla/engine.js";
import {
    type HoldersSnapshot,
    type SharedSnapshot,
    SNAPSHOT,
    type SupersededSnapshot,
} from "../collector/snapshots.js";
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

/** Each jobs chart's bucket and length: 1 h and 6 h draw the last 6 hours, 7 d is the runner history. */
const JOB_STEPS: Record<Range | "7d", { step: "15m" | "1h"; count: number }> = {
    "1h": { step: "15m", count: 24 },
    "6h": { step: "15m", count: 24 },
    "24h": { step: "1h", count: 24 },
    // 15-minute buckets are the finest kept for 7 days (KEEP_MS).
    "7d": { step: "15m", count: 7 * 96 },
};

/**
 * Running and queued jobs (collector stocks `ci.jobs_running`, `ci.jobs_queued`), gaps carried forward, and per
 * bucket the peaks, the longest queued job and the saturated time (null where the collector wrote nothing).
 * @param reads
 * @param range
 */
export async function jobs(reads: Reads, range: Range | "7d"): Promise<Section> {
    const { step, count } = JOB_STEPS[range];
    const to = floorTo(reads.now, step);
    const from = to - (count - 1) * STEP_MS[step];
    const [run, q, lq, sat] = await Promise.all(
        ["ci.jobs_running", "ci.jobs_queued", "ci.longest_queued_ms", "ci.saturated_ms"].map((m) =>
            reads.series(m, step, from, to),
        ),
    );
    const starts = Array.from({ length: count }, (_, i) => from + i * STEP_MS[step]);
    const first = starts.findIndex((s) => run.get(s)?.lastAt !== undefined);
    if (first < 0) {
        return notCollected("jobs");
    }
    const shown = starts.slice(first);
    const carry = (series: Map<number, Bucket>) => {
        let prev = 0;
        return shown.map((s) => (prev = series.get(s)?.last ?? prev));
    };
    const per = (series: Map<number, Bucket>, v: (b: Bucket) => number | undefined) =>
        shown.map((s) => {
            const b = series.get(s);
            return b?.n ? (v(b) ?? null) : null;
        });
    let peak = { n: -1, at: iso(shown[0]) };
    let peakQueued = { n: -1, at: iso(shown[0]) };
    for (const s of shown) {
        const n = run.get(s)?.max ?? -1;
        if (n > peak.n) {
            peak = { n, at: iso(s) };
        }
        const nq = q.get(s)?.max ?? -1;
        if (nq > peakQueued.n) {
            peakQueued = { n: nq, at: iso(s) };
        }
    }
    const out: JobsSection = {
        kind: "jobs",
        id: "jobs",
        step,
        start: iso(shown[0]),
        running: carry(run),
        queued: carry(q),
        runningMax: per(run, (b) => b.max),
        queuedMax: per(q, (b) => b.max),
        longestQueuedMs: per(lq, (b) => b.max),
        saturatedMs: per(sat, (b) => b.sum),
        limit: reads.cfg.runnerLimits.linux_windows ?? 60,
        peak: { n: Math.max(0, peak.n), at: peak.at },
        peakQueued: { n: Math.max(0, peakQueued.n), at: peakQueued.at },
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
    const q50 = aggQuantile(a, 0.5);
    const q90 = aggQuantile(a, 0.9);
    // A full-run bucket's sum holds the budgets themselves (the member judges against the same).
    let budgetMs: number | undefined = 480_000;
    if (full) {
        budgetMs = a.n > 0 && a.sum > 0 ? a.sum / a.n : undefined;
    }
    if (q50 === undefined || q90 === undefined || budgetMs === undefined) {
        return undefined;
    }
    const toS = (q: number) => Math.round(q / 1000);
    return { shard, runs: a.n, minRuns, medianS: toS(q50), p90S: toS(q90), budgetS: toS(budgetMs) };
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
 * Flake hotspots (section 5): family, file, test, ranked by distinct flaky tests, from CI's flaky detections
 * (tools/test-quarantine.mjs through /v1/failures, and a passing retry's lookback). The rate per 1,000 runs is
 * flaky events over runs at that level: a family's over the test files its shard runs ran, a file's over its own
 * runs, a test's over its file's runs (a test runs whenever its file does). Quarantined counts the quarantine
 * in force (the results store's entries); held pull requests have no writer yet, so they are null.
 * @param reads
 * @param range
 */
export async function hotspots(reads: Reads, range: SlowRange): Promise<Section> {
    const days = daysOf(range);
    const [tests, rateDims, fileRuns, quarantine] = await Promise.all([
        dimsOver(reads, "flaky.tests", days),
        dimsOver(reads, "flaky.rate", days),
        dimsOver(reads, "flaky.file_runs", days),
        readSnapshot(reads.store, "quarantine"),
    ]);
    // Shard runs are stored by variant (`graphty|flags=off|selected`), flaky tests by family (`graphty`).
    const rate = new Map<string, Agg>();
    for (const [variant, a] of rateDims) {
        const into = rate.get(hotspotFamily(variant)) ?? emptyAgg();
        rate.set(hotspotFamily(variant), into);
        mergeAgg(into, a);
    }
    const fams = new Map<string, Map<string, Map<string, number>>>();
    for (const [key, a] of tests) {
        const [raw, file, test] = JSON.parse(key) as [string, string, string];
        const family = hotspotFamily(raw);
        const files = fams.get(family) ?? new Map<string, Map<string, number>>();
        fams.set(family, files);
        const ts = files.get(file) ?? new Map<string, number>();
        files.set(file, ts);
        ts.set(test, (ts.get(test) ?? 0) + a.sum);
    }
    const per1000 = (events: number, runs: number | undefined) => (runs ? round((events / runs) * 1000) : null);
    const quarantined = (file: string, test?: string) =>
        quarantine ? quarantine.filter((q) => q.file === file && (test === undefined || q.name === test)).length : null;
    const sum = (ns: (number | null)[]) => (quarantine ? ns.reduce<number>((s, n) => s + (n ?? 0), 0) : null);
    const node = (
        level: TreeNode["level"],
        name: string,
        distinct: number,
        events: number,
        rateOf: number | null,
        q: number | null,
    ) => ({
        level,
        name,
        distinct,
        events,
        per1000: rateOf,
        quarantined: q,
        prsHeld: null,
    });
    const byDistinct = (a: TreeNode, b: TreeNode) => b.distinct - a.distinct || b.events - a.events;
    const nodes: TreeNode[] = [];
    for (const [family, files] of fams) {
        const fileNodes: TreeNode[] = [];
        for (const [file, ts] of files) {
            const runs = fileRuns.get(fileRunKey(family, file))?.n;
            const children: TreeNode[] = [...ts].map(([test, n]) => ({
                ...node("test", test, 1, n, per1000(n, runs), quarantined(file, test)),
                link: `/flaky/test?${new URLSearchParams({ file, test }).toString()}`,
            }));
            const events = children.reduce((s, c) => s + c.events, 0);
            fileNodes.push({
                ...node("file", file, children.length, events, per1000(events, runs), quarantined(file)),
                children: children.toSorted(byDistinct),
            });
        }
        const events = fileNodes.reduce((s, c) => s + c.events, 0);
        const distinct = fileNodes.reduce((s, c) => s + c.distinct, 0);
        const r = rate.get(family);
        nodes.push({
            ...node(
                "family",
                family,
                distinct,
                events,
                r && r.n > 0 ? per1000(r.sum, r.n) : null,
                sum(fileNodes.map((f) => f.quarantined)),
            ),
            children: fileNodes.toSorted(byDistinct),
        });
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
            // OK is said, not left blank, so a judged source reads apart from one with no state.
            const state: Cell = { t: "state", state: sourceState(s) };
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
    const from = Math.min(monthStart, today - Math.max(days - 1, PROJECTION_DAYS) * DAY);
    const daily = await reads.series("cost.usd", "1d", from, today);
    const sumOf = (b: Bucket | undefined, line?: string) => {
        if (!b) {
            return 0;
        }
        return line === undefined ? b.sum : (b.dims?.[line]?.sum ?? 0);
    };
    const lineRow = (line: string | undefined, memberId: string | undefined): TableRow | undefined => {
        let soFar = 0;
        let seen = false;
        for (const [s, b] of daily) {
            if (s >= monthStart) {
                soFar += sumOf(b, line);
                seen ||= line === undefined ? b.n > 0 : (b.dims?.[line]?.n ?? 0) > 0;
            }
        }
        if (!seen) {
            return undefined;
        }
        const projected = projectMonth((t) => sumOf(daily.get(t), line), reads.now);
        // The red line: the limit the cost pages name and ask the owner to raise.
        const budget = memberId ? (reads.config(memberId).fail?.[1] ?? reads.config(memberId).ok?.[1] ?? null) : null;
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
                // A line its member judges says its state, OK included; a line no member judges has none.
                state: st === "ok" || st === "warn" || st === "bad" ? { t: "state", state: st } : none,
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

/** A snapshot the collector keeps in a cursor (collector/snapshots.ts); absent, unreadable or over 1 h old: none. */
async function snapshot<T extends { at: number }>(reads: Reads, name: string): Promise<T | undefined> {
    const raw = await getCursor(reads.store, name);
    try {
        const v = raw ? (JSON.parse(raw) as T) : undefined;
        return v && reads.now - v.at <= 60 * MIN ? v : undefined;
    } catch {
        return undefined;
    }
}

const prList = (ns: number[]): Cell => ({ t: "list", sep: "space", items: ns.map((n) => ({ t: "pr", n })) });

/**
 * Master's shared failures (4.1): the checks failing in 3 or more open pull requests, or failing alone, now and
 * in the last 24 h.
 * @param reads
 */
export async function shared(reads: Reads): Promise<Section> {
    const snap = await snapshot<SharedSnapshot>(reads, SNAPSHOT.shared);
    if (!snap) {
        return notCollected("shared");
    }
    if (!snap.rows.length) {
        return { kind: "empty", id: "shared", fact: f("master.no_shared") };
    }
    const rows: TableRow[] = snap.rows
        .toSorted((a, b) => Number(a.end !== undefined) - Number(b.end !== undefined) || b.since - a.since)
        .map((r) => {
            const name: Cell = { t: "name", v: r.check, bold: true };
            const sub = r.alone
                ? f("check.failed_alone")
                : r.bins > 1
                  ? f("check.family", { bins: r.bins })
                  : undefined;
            const main: Cell = r.end === undefined ? { t: "mark", state: "bad", cell: name } : name;
            return {
                ...(r.end === undefined ? {} : { past: true }),
                cells: {
                    check: sub ? { t: "sub", main, sub: { t: "fact", fact: sub } } : main,
                    prs: prList(r.prs),
                    since:
                        r.end === undefined
                            ? { t: "time", at: iso(r.since) }
                            : { t: "span", start: iso(r.since), end: iso(r.end) },
                    suspects: r.suspects.length
                        ? {
                              t: "list",
                              sep: "line",
                              items: r.suspects.map((m) => ({
                                  t: "fact",
                                  fact: f("suspect", { pr: m.pr, title: m.title }),
                              })),
                          }
                        : { t: "fact", fact: f("cause.unknown") },
                    issue: none,
                },
            };
        });
    return { kind: "table", id: "shared", rows };
}

const CAUSES = ["shared_check", "shared_aggregator", "change", "flaky", "infrastructure"] as const;

/**
 * Why first attempts of pull request runs failed (4, "Failure cause"), counted over the range.
 * @param reads
 * @param range
 */
export async function causes(reads: Reads, range: Range): Promise<Section> {
    const dims = (await reads.window("ci.first_attempt_cause", range)).total.dims ?? {};
    const suites = Object.values(dims).reduce((n, a) => n + a.n, 0);
    if (!suites) {
        return { kind: "empty", id: "causes", fact: f("section.no_events") };
    }
    const items = CAUSES.map((c) => ({
        label: { t: "label", code: `cause.${c}` } as Cell,
        n: dims[c]?.n ?? 0,
        unit: "count" as const,
        ...(c.startsWith("shared") ? { tone: "bad" as const } : {}),
    }));
    return { kind: "bars", id: "causes", sub: f("ci.causes.sub", { suites }), groups: [{ items }] };
}

/**
 * Who holds the runners now (4.3): running and queued jobs by workflow and event, and runs with no job yet.
 * @param reads
 */
export async function holders(reads: Reads): Promise<Section> {
    const snap = await snapshot<HoldersSnapshot>(reads, SNAPSHOT.holders);
    if (!snap) {
        return notCollected("holders");
    }
    const all = Object.entries(snap.holders);
    const group = (k: "running" | "queued", head: string) => {
        const items = all
            .filter(([, h]) => h[k] > 0)
            .map(([label, h]) => ({
                label: { t: "name", v: label } as Cell,
                ...(k === "running" && h.macos
                    ? { detail: { t: "fact", fact: f("runners.macos", { jobs: h.macos }) } as Cell }
                    : {}),
                n: h[k],
                unit: "jobs" as const,
            }))
            .sort((a, b) => b.n - a.n);
        return { head: f(head, { jobs: items.reduce((n, i) => n + i.n, 0) }), items };
    };
    const groups = [group("running", "runners.running_now"), group("queued", "runners.queued_now")].filter(
        (g) => g.items.length,
    );
    const notes = Object.entries(snap.noJobs).map(([key, q]) => {
        const at = key.lastIndexOf(", ");
        return f("runners.queued_runs", {
            runs: q.runs,
            workflow: key.slice(0, at),
            event: key.slice(at + 2),
            since: iso(q.since),
        });
    });
    if (!groups.length && !notes.length) {
        return { kind: "empty", id: "holders", fact: f("runners.no_holders") };
    }
    return { kind: "bars", id: "holders", groups, ...(notes.length ? { notes } : {}) };
}

/**
 * Pull request runs still running after a newer commit was pushed (4.3).
 * @param reads
 */
export async function superseded(reads: Reads): Promise<Section> {
    const snap = await snapshot<SupersededSnapshot>(reads, SNAPSHOT.superseded);
    if (!snap) {
        return notCollected("superseded");
    }
    if (!snap.rows.length) {
        return { kind: "empty", id: "superseded", fact: f("runners.no_superseded") };
    }
    const rows: TableRow[] = snap.rows.map((r) => ({
        cells: { run: { t: "name", v: r.workflow }, pr: { t: "pr", n: r.pr }, newer: { t: "ago", at: iso(r.newerAt) } },
    }));
    return { kind: "table", id: "superseded", rows };
}

export const NOT_COLLECTED: Partial<Record<PageId, string[]>> = {};

/**
 * Events (n) of one metric over the last `days` daily buckets.
 * @param reads the store reads
 * @param metric the metric id
 * @param days how many daily buckets, today included
 * @returns the event count
 */
async function countOver(reads: Reads, metric: string, days: number): Promise<number> {
    const today = floorTo(reads.now, "1d");
    let n = 0;
    for (const b of (await reads.series(metric, "1d", today - (days - 1) * DAY, today)).values()) {
        n += b.n;
    }
    return n;
}

const LOADS: LoadKind[] = ["pr", "master", "full", "other"];

/**
 * Runner-minutes per merge (4.3), by the kind of run that spent them, over the last 24 h (hourly buckets) and 7 d
 * (the member's window: today and the 6 days before it), so each change to the CI load shows its saving.
 * @param reads the store reads
 * @returns one row per kind and a total, or empty with no job minutes in 7 d
 */
export async function runnerMinutes(reads: Reads): Promise<Section> {
    const hour = floorTo(reads.now, "1h");
    const today = floorTo(reads.now, "1d");
    const [day, week] = await Promise.all([
        reads.series("ci.runner_minutes", "1h", hour - 23 * HOUR, hour),
        reads.series("ci.runner_minutes", "1d", today - 6 * DAY, today),
    ]);
    const total = (got: Map<number, Bucket>) => {
        const by = new Map<string, number>();
        let merged = 0;
        for (const b of got.values()) {
            merged += b.n;
            for (const [d, a] of Object.entries(b.dims ?? {})) by.set(d, (by.get(d) ?? 0) + a.sum);
        }
        by.set(
            "total",
            [...by.values()].reduce((t, v) => t + v, 0),
        );
        return { merged, by };
    };
    const d = total(day);
    const w = total(week);
    if (!w.by.get("total")) return { kind: "empty", id: "runner-minutes", fact: f("section.no_events") };
    const per = (x: { merged: number; by: Map<string, number> }, k: string): Cell =>
        x.merged > 0 ? { t: "num", n: Math.round((x.by.get(k) ?? 0) / x.merged), unit: "min" } : none;
    const mins = (x: { by: Map<string, number> }, k: string): Cell => ({
        t: "num",
        n: Math.round(x.by.get(k) ?? 0),
        unit: "min",
    });
    const rows: TableRow[] = [...LOADS, "total"].map((k) => ({
        cells: {
            kind: { t: "label", code: `load.${k}` },
            day: per(d, k),
            week: per(w, k),
            dayMin: mins(d, k),
            weekMin: mins(w, k),
        },
        ...(k === "total" ? { total: true } : {}),
    }));
    return {
        kind: "table",
        id: "runner-minutes",
        sub: f("runner_minutes.sub", { day: d.merged, week: w.merged }),
        rows,
    };
}

/**
 * Days from the first of this UTC month to today, inclusive.
 * @param now the time now
 * @returns the day count
 */
const monthDaysSoFar = (now: number): number => {
    const d = new Date(now);
    return (floorTo(now, "1d") - Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)) / DAY + 1;
};

/**
 * List-price value (USD) by workflow from `ci.job_minutes`; a minute with no rate for its OS is left out.
 * @param minutes job minutes by [workflow, os]
 * @returns USD by workflow
 */
function valueByWorkflow(minutes: Map<string, Agg>): Map<string, number> {
    const rate: Record<string, number | undefined> = rates.actionsListPrice.usdPerMin;
    const out = new Map<string, number>();
    for (const [key, a] of minutes) {
        const [workflow, os] = JSON.parse(key) as [string, string];
        const r = rate[os];
        if (r !== undefined) {
            out.set(workflow, (out.get(workflow) ?? 0) + a.sum * r);
        }
    }
    return out;
}

/**
 * Unit costs (section 7), for comparison only: money per tested release train (T4 and the LLM step of
 * release.yml, over the trains that tested) and list-price value per pull request merged into master.
 * @param reads the store reads
 * @param range the picked range
 * @returns the unit table, or empty
 */
export async function unitCosts(reads: Reads, range: SlowRange): Promise<Section> {
    const days = daysOf(range);
    const [money, trains, minutes, merged] = await Promise.all([
        dimsOver(reads, "cost.by_workflow", days),
        countOver(reads, "release.trains", days),
        dimsOver(reads, "ci.job_minutes", days),
        countOver(reads, "master.reverts", days), // one event per pull request merged into master
    ]);
    const rows: TableRow[] = [];
    if (trains > 0) {
        const usd = [...money].filter(([w]) => w.startsWith("release.yml")).reduce((t, [, a]) => t + a.sum, 0);
        rows.push({
            cells: {
                measure: { t: "label", code: "unit.train" },
                value: { t: "num", n: round(usd / trains), unit: "usd", bold: true },
                note: { t: "fact", fact: f("unit.train.mean", { days, trains }) },
            },
        });
    }
    const value = [...valueByWorkflow(minutes).values()].reduce((t, v) => t + v, 0);
    if (merged > 0 && minutes.size > 0) {
        rows.push({
            cells: {
                measure: { t: "label", code: "unit.pr_value" },
                value: { t: "num", n: round(value / merged), unit: "usd", bold: true },
                note: { t: "fact", fact: f("unit.pr_value.note") },
            },
        });
    }
    return rows.length
        ? { kind: "table", id: "unit", rows }
        : { kind: "empty", id: "unit", fact: f("section.no_events") };
}

/**
 * Money and list-price value by workflow, this month so far (section 7): two sorted-bar lists, never summed.
 * @param reads the store reads
 * @returns the two bar lists, or empty
 */
export async function byWorkflow(reads: Reads): Promise<Section> {
    const days = monthDaysSoFar(reads.now);
    const [money, minutes] = await Promise.all([
        dimsOver(reads, "cost.by_workflow", days),
        dimsOver(reads, "ci.job_minutes", days),
    ]);
    const sorted = (xs: [string, number][], tone?: "value"): BarsSection["groups"][number]["items"] =>
        xs
            .map(([w, n]) => ({
                label: { t: "name", v: w } satisfies Cell,
                n: round(n),
                unit: "usd" as const,
                ...(tone ? { tone } : {}),
            }))
            .filter((i) => i.n > 0)
            .sort((a, b) => b.n - a.n);
    const moneyItems = sorted([...money].map(([w, a]) => [w, a.sum]));
    const valueItems = sorted([...valueByWorkflow(minutes)], "value");
    if (!moneyItems.length && !valueItems.length) {
        return { kind: "empty", id: "by-workflow", fact: f("section.no_events") };
    }
    return {
        kind: "bars",
        id: "by-workflow",
        groups: [
            { head: f("costs.money_by_workflow"), items: moneyItems },
            { head: f("costs.value_by_workflow"), items: valueItems },
        ],
    };
}

/**
 * The weekly stress run's last runs (4.7), newest first, from the collector's `stress` cursor (GitHub's job
 * results). How many issues a run filed is not recorded, so only a run that found nothing says 0.
 * @param reads the store reads
 * @returns the stress table, or empty
 */
export async function stressTable(reads: Reads): Promise<Section> {
    let runs: StressCursorRun[] = [];
    try {
        const raw = await getCursor(reads.store, "stress");
        runs = Object.values(raw ? (JSON.parse(raw) as Record<string, StressCursorRun>) : {});
    } catch {
        // an unreadable cursor is no runs, never a guess
    }
    const sub = f("data.stress.sub", { workflow: "restricted-cpu-stress.yml" });
    runs = runs.filter((r) => r.at !== undefined).sort((a, b) => b.at - a.at);
    if (!runs.length) {
        return { kind: "empty", id: "stress", sub, fact: f("stress.no_runs") };
    }
    const rows: TableRow[] = runs.map((r, i) => {
        let result: Cell = { t: "fact", fact: f("stress.found_nothing") };
        if (r.state === 2) {
            result = {
                t: "mark",
                state: "bad",
                cell: { t: "fact", fact: f("stress.failed_in", { job: r.failedJob ?? "" }) },
            };
        } else if (r.foundFailures) {
            result = { t: "fact", fact: f("stress.found_filed") };
        }
        return {
            ...(i > 0 ? { past: true } : {}),
            cells: {
                run: {
                    t: "list",
                    sep: "comma",
                    items: [
                        { t: "time", at: iso(r.at) },
                        { t: "run", id: r.runId },
                    ],
                },
                result,
                filed:
                    r.state === 2
                        ? { t: "fact", fact: f("stress.not_reached") }
                        : r.state === 0 && !r.foundFailures
                          ? { t: "num", n: 0 }
                          : none,
            },
        };
    });
    return { kind: "table", id: "stress", sub, rows };
}
