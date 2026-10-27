/**
 * Writes the page's fixtures, web/fixtures/*.json, from the typed data below, so the type checker
 * proves every fixture conforms to src/contract.ts.
 *
 * Run: node_modules/.bin/tsx tools/pipeline-health/web/fixtures/build.ts
 *
 * The data is the pipeline's real incidents of 2026-10-25 as the page would have shown them at
 * 23:30 UTC (design/ci/health-dashboard/mockup.html), numbers rounded and some filled in. The
 * `gray` scenario adds what the incident day did not have: a NO DATA category, a NO DATA member with
 * its reason and a partial window. Fixture mode draws a FIXTURE DATA banner over all of it.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type {
    CategoryStatus,
    Cmp,
    Episode,
    Fact,
    Member,
    MemberRef,
    OverviewResponse,
    PageResponse,
    Range,
    Section,
    SectionResponse,
    Sla,
    SlowRange,
    SourceAge,
    Spark,
    TableRow,
    TestHistoryResponse,
    TreeNode,
    Unit,
    Value,
} from "../src/contract";

// HEALTH_FIXTURES_OUT writes elsewhere; test/web/fixtures.test.ts uses it to compare with the committed files.
const OUT = process.env.HEALTH_FIXTURES_OUT ?? dirname(fileURLToPath(import.meta.url));
const GEN = "2026-10-25T23:30:00Z";

/** A time on 2026-10-25 ("19:20"), or another day of October ("10-24 19:25"). */
function t(s: string): string {
    const m = /^(?:(\d\d)-(\d\d) )?(\d\d):(\d\d)$/.exec(s);
    if (!m) throw new Error(`bad time ${s}`);
    const [, mo = "10", d = "25", h, mi] = m;
    return `2026-${mo}-${d}T${h}:${mi}:00Z`;
}

const f = (code: string, params?: Fact["params"]): Fact => (params ? { code, params } : { code });
const num = (n: number, unit?: Unit): Value => (unit ? { n, unit } : { n });
const cmp = (op: Cmp["op"], n: number, unit?: Cmp["unit"]): Cmp => (unit ? { op, n, unit } : { op, n });

// ---------------------------------------------------------------- sparklines

function ramp(a: number, b: number, n: number): number[] {
    return Array.from({ length: n }, (_, i) => +(a + ((b - a) * i) / Math.max(1, n - 1)).toFixed(2));
}
const flat = (v: number, n: number): number[] => Array(n).fill(v);
const nulls = (n: number): null[] => Array(n).fill(null);

/** Green when the target holds, red when the red comparison holds, yellow between. */
function judge(v: number | null, sla: Sla): "warn" | "bad" | null {
    if (v === null || !("op" in sla.target)) return null;
    const holds = (c: Cmp) =>
        c.op === "<="
            ? v <= c.n
            : c.op === "<"
              ? v < c.n
              : c.op === ">="
                ? v >= c.n
                : c.op === ">"
                  ? v > c.n
                  : v === c.n;
    if (holds(sla.target)) return null;
    return sla.red && "op" in sla.red && holds(sla.red) ? "bad" : "warn";
}

function spark(ctx: (number | null)[], trend: (number | null)[], sla: Sla | null, target?: number): Spark {
    if (ctx.length !== 18 || trend.length !== 24)
        throw new Error(`spark needs 18 + 24, got ${ctx.length} + ${trend.length}`);
    const tgt = target ?? (sla && "op" in sla.target ? sla.target.n : undefined);
    return {
        step: "15m",
        ctx,
        trend,
        breach: trend.map((v) => (sla ? judge(v, sla) : null)),
        ...(tgt === undefined ? {} : { target: tgt }),
    };
}

// ---------------------------------------------------------------- members

type M = Omit<Member, "state" | "window" | "sla" | "link"> & Partial<Pick<Member, "state" | "window" | "sla" | "link">>;
function member(m: M): Member {
    return { state: "ok", window: "now", sla: null, link: "/", ...m };
}

const SLA = {
    redNow: { target: cmp("==", 0), red: f("sla.red_now") } satisfies Sla,
    greenTime: { target: cmp(">=", 92, "pct"), red: cmp("<", 75, "pct") } satisfies Sla,
    sameCheck: { target: cmp("<=", 1), red: cmp(">=", 3) } satisfies Sla,
    untested: { target: cmp("<=", 7, "h"), red: cmp(">", 13, "h") } satisfies Sla,
    reverts: { target: cmp("<", 5, "pct"), red: cmp(">", 10, "pct") } satisfies Sla,
    prCaused: { target: cmp("<", 5, "pct") } satisfies Sla,
    ttm: { target: cmp("<=", 60, "min"), red: cmp(">", 180, "min"), needs6h: true } satisfies Sla,
    openPrs: { target: cmp("<=", 15), red: cmp(">", 25) } satisfies Sla,
    age24: { target: cmp("<", 24, "h"), red: cmp(">", 72, "h") } satisfies Sla,
    mergeRatio: { target: cmp(">=", 0.9, "ratio"), red: cmp("<", 0.7, "ratio"), needs6h: true } satisfies Sla,
    stuck: { target: cmp("==", 0), red: cmp(">=", 3) } satisfies Sla,
    wait: { target: cmp("<=", 5, "min"), red: cmp(">", 15, "min") } satisfies Sla,
    saturated: { target: cmp("==", 0, "min"), red: cmp(">=", 15, "min") } satisfies Sla,
    firstAttempt: { target: cmp(">=", 85, "pct"), red: cmp("<", 70, "pct"), needs6h: true } satisfies Sla,
    hangs: { target: cmp("==", 0), red: cmp(">=", 2) } satisfies Sla,
    prDuration: { target: cmp("<=", 1, "x"), red: cmp(">", 2, "x"), needs6h: true } satisfies Sla,
    bins: { target: cmp("<=", 10, "pct"), red: cmp(">", 25, "pct"), needs6h: true } satisfies Sla,
    reruns: { target: cmp("<", 5, "pct"), red: cmp(">", 15, "pct"), needs6h: true } satisfies Sla,
    shardsOver: { target: cmp("==", 0), red: cmp(">=", 3) } satisfies Sla,
    runnerMinutes: { target: cmp("<=", 400, "min"), red: cmp(">", 600, "min") } satisfies Sla,
    blocked: { target: cmp("==", 0), red: f("sla.blocked") } satisfies Sla,
    noIssue: { target: cmp("==", 0), red: cmp(">=", 3) } satisfies Sla,
    flakeRate: { target: cmp("<", 2, "per1000"), red: cmp(">", 10, "per1000"), needs6h: true } satisfies Sla,
    netNew: { target: cmp("<=", 0), red: cmp(">", 3) } satisfies Sla,
    detected: { target: cmp("<=", 3, "d"), red: cmp(">", 7, "d") } satisfies Sla,
    lanes: { target: cmp("==", 0), red: f("sla.lanes_open", { h: 6 }) } satisfies Sla,
    workflows: { target: cmp("==", 0), red: f("sla.failed_in_a_row", { runs: 3 }) } satisfies Sla,
    skipped: { target: f("sla.word", { word: "no" }) } satisfies Sla,
    tagged: { target: cmp("==", 0), red: f("sla.after", { min: 30 }) } satisfies Sla,
    trainPass: { target: cmp(">=", 90, "pct"), red: cmp("<", 75, "pct") } satisfies Sla,
    stress: { target: f("sla.passed_and_filed"), red: f("sla.filing_failed") } satisfies Sla,
    pastAge: { target: cmp("==", 0), red: f("sla.past_2x") } satisfies Sla,
    thin: { target: cmp("==", 0), red: f("sla.under_pct", { pct: 20 }), needs6h: true } satisfies Sla,
    collector: { target: cmp("<=", 10, "min"), red: cmp(">", 20, "min") } satisfies Sla,
    appRate: { target: cmp(">", 50, "pct"), red: cmp("<", 20, "pct") } satisfies Sla,
    writeBudget: { target: cmp("<", 50, "pct"), red: cmp(">", 90, "pct") } satisfies Sla,
    spend: { target: cmp("<=", 300, "usd"), red: cmp(">", 360, "usd") } satisfies Sla,
    localVsCi: { target: cmp("<", 2, "pct"), red: cmp(">", 5, "pct") } satisfies Sla,
    localTime: { target: cmp("<=", 1.5, "x"), red: cmp(">", 3, "x") } satisfies Sla,
    slotWaits: { target: cmp("<=", 2, "min"), red: cmp(">", 10, "min") } satisfies Sla,
    channels: { target: f("sla.canary_age", { h: 6 }) } satisfies Sla,
};

// Master
const greenTime = member({
    id: "master.green_time",
    window: "1h",
    state: "bad",
    value: num(40, "pct"),
    value6h: num(49, "pct"),
    sla: SLA.greenTime,
    spark: spark(
        flat(100, 18),
        [...flat(100, 8), 92, 72, 52, 33, 22, 21, 21, 20, ...flat(20, 4), 25, 35, 45, 55],
        SLA.greenTime,
    ),
    note: f("master.green_time.def"),
    link: "/master/red",
});
const masterMembers: Member[] = [
    member({
        id: "master.red_now",
        value: num(0, "min"),
        sla: SLA.redNow,
        spark: spark(
            flat(0, 18),
            [...flat(0, 8), ...ramp(5, 115, 12), 85, 50, 20, 0],
            { target: cmp("<", 15, "min"), red: cmp(">=", 15, "min") },
            0,
        ),
        note: f("master.red_now.note", { green_since: t("23:06"), queued_min: 68 }),
        link: "/master/red",
    }),
    greenTime,
    member({
        id: "master.same_check",
        state: "bad",
        value: num(5),
        sla: SLA.sameCheck,
        spark: spark(flat(0, 18), [...ramp(0.3, 1.8, 6), ...ramp(2.4, 5, 7), ...flat(5, 11)], SLA.sameCheck),
        link: "/master/shared",
    }),
    member({
        id: "master.full_run_verdict",
        value: { word: "passed" },
        sla: { target: f("sla.word", { word: "passed" }) },
        note: f("master.verdict.note", { lane: "ci", sha: "a870943ef", at: t("10-24 18:15") }),
        link: "/releases/lanes",
    }),
    member({
        id: "master.untested_age",
        value: num(6.8, "h"),
        sla: SLA.untested,
        spark: spark([...flat(0, 16), 0.4, 1.7], ramp(1.9, 6.8, 24), SLA.untested, 7),
        note: f("master.untested.note", { attempt: t("18:00"), sha: "1fa254bf3" }),
        link: "/releases/trains",
    }),
    member({
        id: "master.reverts",
        window: "7d",
        state: "slow",
        value: { n: 0, of: 41 },
        sla: SLA.reverts,
        link: "/master",
    }),
];

// Pull requests
const ttm = member({
    id: "pull-requests.time_to_merge",
    window: "1h6h",
    state: "few",
    value: null,
    value6h: num(74, "min"),
    n: 2,
    minN: 5,
    sla: SLA.ttm,
    spark: spark(
        [...nulls(16), 48, 55],
        [56, 57, 58, 59, 61, 63, 65, 68, 69, 67, 66, 65, 65, 67, 69, 71, 72, 73, 74, 75, 76, 77, 78, 78],
        SLA.ttm,
    ),
    link: "/pull-requests",
});
const prMembers: Member[] = [
    ttm,
    member({
        id: "pull-requests.open",
        value: num(14),
        sla: SLA.openPrs,
        spark: spark([...nulls(16), 6, 10], ramp(10.2, 15.8, 13).concat(ramp(15.7, 14, 5), flat(14, 6)), SLA.openPrs),
        link: "/pull-requests",
    }),
    member({ id: "pull-requests.oldest_open", value: num(6.1, "h"), sla: SLA.age24, link: "/pull-requests" }),
    member({
        id: "pull-requests.merge_ratio",
        window: "1h6h",
        state: "few",
        value: null,
        value6h: num(0.64, "ratio"),
        n: 3,
        minN: 5,
        sla: SLA.mergeRatio,
        link: "/pull-requests",
    }),
    member({
        id: "pull-requests.caused_failures",
        window: "7d",
        state: "slow",
        value: { n: 9, of: 112 },
        sla: SLA.prCaused,
        link: "/pull-requests",
    }),
    member({ id: "pull-requests.automerge_stuck", value: num(0), sla: SLA.stuck, link: "/pull-requests" }),
    member({
        id: "pull-requests.screenshot_backlog",
        value: num(2.1, "h"),
        sla: SLA.age24,
        link: "/pull-requests/owner",
    }),
];

// CI and Runners
const runnerWait = member({
    id: "ci.runner_wait",
    window: "1h",
    state: "bad",
    value: num(31, "min"),
    value6h: num(24, "min"),
    n: 168,
    minN: 20,
    sla: SLA.wait,
    spark: spark([...flat(1.5, 16), 2.4, 4.5], [...ramp(5.4, 14, 7), ...ramp(15.5, 31, 17)], SLA.wait),
    link: "/ci/runners",
});
const longestQueued = member({
    id: "ci.longest_queued",
    state: "bad",
    value: num(68, "min"),
    sla: SLA.wait,
    spark: spark([...flat(0.5, 16), 1.8, 4.5], [...ramp(6, 14, 7), ...ramp(16, 68, 17)], SLA.wait),
    note: f("ci.longest_queued.note"),
    link: "/ci/runners",
});
const saturated = member({
    id: "ci.saturated",
    window: "1h",
    state: "bad",
    value: num(60, "min"),
    value6h: { n: 4.2, unit: "h" },
    sla: SLA.saturated,
    spark: spark(
        flat(0, 18),
        [...flat(0, 7), 9, ...flat(15, 16)],
        { target: cmp("==", 0, "min"), red: cmp(">=", 4, "min") },
        0,
    ),
    link: "/ci/runners",
});
const notAssigned = member({
    id: "ci.not_assigned",
    value: num(0, "min"),
    sla: SLA.saturated,
    link: "https://www.githubstatus.com/",
});
const superseded = member({
    id: "ci.superseded",
    state: "info",
    value: num(2),
    sla: null,
    link: "/ci/runners/superseded",
});
const ciMembers: Member[] = [
    { ...runnerWait, note: f("ci.runner_wait.def") },
    longestQueued,
    member({
        id: "ci.first_attempt",
        window: "1h6h",
        state: "bad",
        value: num(55, "pct"),
        value6h: num(63, "pct"),
        n: 11,
        minN: 8,
        sla: SLA.firstAttempt,
        spark: spark(
            [...nulls(16), 100, 84],
            [83, 80, 77, 74, 70, 65, 59, 53, 49, 48, 47, 45, 45, 47, 49, 51, 52, 53, 54, 55, 56, 57, 58, 59],
            SLA.firstAttempt,
        ),
        link: "/ci/causes",
    }),
    saturated,
    notAssigned,
    member({
        id: "ci.hangs",
        window: "1h",
        value: num(0),
        value6h: num(6),
        sla: SLA.hangs,
        spark: spark(
            flat(0, 18),
            [0, 0, 0, 0, 0.1, 0.3, 0.5, 0.7, 1.2, 2, 2.8, 3.6, 3.5, 2.5, 1.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0],
            { target: cmp("<", 0.8), red: cmp(">=", 0.8) },
            0,
        ),
        cleared: t("20:42"),
        link: "/master/red",
    }),
    member({
        id: "ci.pr_duration",
        window: "1h6h",
        value: num(0.9, "x"),
        value6h: num(1.0, "x"),
        n: 6,
        minN: 5,
        sla: SLA.prDuration,
        spark: spark(
            [...nulls(16), 0.85, 0.85],
            [
                0.86, 0.88, 0.9, 0.92, 0.93, 0.93, 0.93, 0.93, 0.94, 0.96, 0.98, 1, 1, 0.98, 0.96, 0.94, 0.93, 0.93,
                0.93, 0.93, 0.93, 0.93, 0.93, 0.93,
            ],
            SLA.prDuration,
        ),
        link: "/ci",
    }),
    member({
        id: "ci.shards_over",
        window: "7d",
        state: "slow",
        value: num(1),
        sla: SLA.shardsOver,
        link: "/ci/shards",
    }),
    member({
        id: "ci.runner_minutes",
        window: "7d",
        state: "slow",
        value: num(387, "min"),
        n: 146,
        minN: 10,
        sla: SLA.runnerMinutes,
        link: "/ci/runner-minutes",
    }),
    member({
        id: "ci.bins_over",
        window: "1h6h",
        value: num(6, "pct"),
        value6h: num(7, "pct"),
        n: 34,
        minN: 10,
        sla: SLA.bins,
        link: "/ci/shards",
    }),
    superseded,
    member({
        id: "ci.reruns",
        window: "1h6h",
        value: num(4.1, "pct"),
        value6h: num(3.8, "pct"),
        n: 49,
        minN: 10,
        sla: SLA.reruns,
        link: "/ci",
    }),
];
const runnerMembers: Member[] = [runnerWait, longestQueued, saturated, notAssigned, superseded];

// Flaky tests
const flakeRate = member({
    id: "flaky.flake_rate",
    window: "1h6h",
    value: num(1.4, "per1000"),
    value6h: num(1.2, "per1000"),
    n: 2140,
    minN: 125,
    covered6h: { h: 2.8, of: 6 },
    sla: SLA.flakeRate,
    spark: spark(
        nulls(18),
        [...nulls(10), 0.9, 0.9, 1.0, 1.15, 1.3, 1.45, 1.46, 1.33, 1.2, 1.1, 1.1, 1.2, 1.33, 1.4],
        SLA.flakeRate,
    ),
    note: f("flaky.flake_rate.note", { since: t("20:42") }),
    link: "/flaky/hotspots",
});
const flakyMembers: Member[] = [
    member({
        id: "flaky.blocked",
        state: "bad",
        value: num(3),
        sla: SLA.blocked,
        spark: spark(
            flat(0, 18),
            [
                0, 0, 0, 0, 0.1, 0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.6, 1.6, 1.6, 1.6, 1.7, 1.9, 2.1, 2.3, 2.4, 2.4,
                2.4, 2.4,
            ].map((v) => Math.round(v * 1.25 * 10) / 10),
            { target: cmp("==", 0), red: cmp(">=", 2.1) },
            0,
        ),
        link: "/flaky/hotspots",
    }),
    member({ id: "flaky.no_issue", state: "warn", value: num(2), sla: SLA.noIssue, link: "/flaky/hotspots" }),
    flakeRate,
    member({
        id: "flaky.net_new",
        window: "7d",
        state: "slow",
        value: { n: 2, signed: true },
        sla: SLA.netNew,
        note: f("flaky.net_new.note", { added: 4, resolved: 2 }),
        link: "/flaky",
    }),
    member({
        id: "flaky.detected_to_fixed",
        window: "28d",
        state: "slow",
        value: num(1.5, "d"),
        n: 2,
        sla: SLA.detected,
        link: "/flaky",
    }),
];

// Releases
const lanesRed = member({
    id: "releases.lanes_red",
    state: "bad",
    value: num(2),
    sla: SLA.lanes,
    spark: spark(flat(2, 18), flat(2, 24), { target: cmp("==", 0), red: cmp(">=", 1) }, 0),
    link: "/releases/lanes",
});
const releaseMembers: Member[] = [
    lanesRed,
    member({
        id: "releases.workflows_failing",
        state: "bad",
        value: num(1),
        sla: SLA.workflows,
        spark: spark(flat(0, 18), ramp(0.02, 1, 24), { target: cmp("<", 0.1), red: cmp(">=", 0.1) }, 0),
        note: f("releases.workflows.note", { workflow: "promote.yml", runs: 131 }),
        fixWaitsOwner: 3577,
        link: "/releases/workflows",
    }),
    member({
        id: "releases.train_skipped",
        state: "warn",
        value: { word: "yes" },
        sla: SLA.skipped,
        note: f("releases.skipped.note", { attempt: t("18:00"), sha: "1fa254bf3" }),
        link: "/releases/trains",
    }),
    member({ id: "releases.tagged_not_npm", value: num(0), sla: SLA.tagged, link: "/releases" }),
    member({
        id: "releases.train_first_pass",
        window: "7d",
        state: "slow",
        value: { n: 1, of: 3 },
        n: 3,
        sla: SLA.trainPass,
        link: "/releases/trains",
    }),
    member({
        id: "releases.channels",
        state: "notsetup",
        value: null,
        sla: SLA.channels,
        reason: f("unblock.channels", { issue: 3418 }),
        link: "/data-sources/not-set-up",
    }),
];

// Costs (members carried for agents; the page draws the money table)
const spend = member({
    id: "costs.spend",
    value: num(229, "usd"),
    sla: SLA.spend,
    spark: spark(ramp(232, 230, 18), flat(230, 24), SLA.spend),
    link: "/costs",
});
const costMembers: Member[] = [
    spend,
    member({
        id: "costs.t4",
        value: num(160, "usd"),
        sla: { target: cmp("<=", 200, "usd"), red: cmp(">", 240, "usd") },
        link: "/costs",
    }),
    member({
        id: "costs.llm",
        value: num(29, "usd"),
        sla: { target: cmp("<=", 60, "usd"), red: cmp(">", 75, "usd") },
        link: "/costs",
    }),
    member({
        id: "costs.aws",
        value: num(0.62, "usd"),
        sla: { target: cmp("<=", 8, "usd"), red: cmp(">", 10, "usd") },
        link: "/costs",
    }),
    member({
        id: "costs.cloudflare_usage",
        state: "notsetup",
        value: null,
        sla: { target: cmp("<", 50, "pct"), red: cmp(">", 90, "pct") },
        reason: f("unblock.cloudflare_token"),
        link: "/data-sources/not-set-up",
    }),
    member({
        id: "costs.sentry_usage",
        state: "notsetup",
        value: null,
        sla: { target: cmp("<", 80, "pct"), red: cmp(">", 100, "pct") },
        reason: f("unblock.sentry_token"),
        link: "/data-sources/not-set-up",
    }),
];

// Data sources
const dataMembers: Member[] = [
    member({
        id: "data-sources.stress_run",
        state: "bad",
        value: { word: "filed", n: 0 },
        sla: SLA.stress,
        link: "/data-sources/stress",
    }),
    member({
        id: "data-sources.past_age",
        value: num(0),
        sla: SLA.pastAge,
        note: f("data.past_age.note", { judged: 8, idle: 1, notsetup: 3 }),
        link: "/data-sources/sources",
    }),
    member({
        id: "data-sources.thin",
        window: "1h6h",
        value: num(0),
        value6h: num(0),
        n: 9,
        minN: 3,
        sla: SLA.thin,
        link: "/data-sources/sources",
    }),
    member({
        id: "data-sources.collector",
        value: { n: 2, unit: "min", ago: true },
        sla: SLA.collector,
        link: "/data-sources/sources",
    }),
    member({ id: "data-sources.app_rate", value: num(94, "pct"), sla: SLA.appRate, link: "/data-sources/sources" }),
    member({
        id: "data-sources.write_budget",
        value: num(7, "pct"),
        sla: SLA.writeBudget,
        note: f("data.write_budget.note", { limit: 300000 }),
        link: "/data-sources/sources",
    }),
];

// Local runs
const localMembers: Member[] = [
    member({
        id: "local-runs.local_vs_ci",
        window: "1h",
        state: "idle",
        value: null,
        n: 0,
        sla: SLA.localVsCi,
        spark: spark(nulls(18), nulls(24), SLA.localVsCi),
        link: "/ci/local-runs",
    }),
    member({
        id: "local-runs.shard_time",
        window: "1h",
        state: "idle",
        value: null,
        n: 0,
        sla: SLA.localTime,
        link: "/ci/local-runs",
    }),
    member({
        id: "local-runs.slot_waits",
        window: "1h",
        state: "idle",
        value: null,
        n: 0,
        sla: SLA.slotWaits,
        link: "/ci/local-runs",
    }),
];

// ---------------------------------------------------------------- status

const ref = (m: Member, fact?: Fact): MemberRef => ({
    member: m.id,
    state: m.state,
    value: m.value,
    ...(fact ? { fact } : {}),
});
const byId = (list: Member[], id: Member["id"]): Member => {
    const m = list.find((x) => x.id === id);
    if (!m) throw new Error(`no member ${id}`);
    return m;
};

const categories: CategoryStatus[] = [
    {
        id: "master",
        state: "bad",
        setBy: ref(
            byId(masterMembers, "master.same_check"),
            f("short.same_check", { prs: 5, check: "Test (graphty-*)" }),
        ),
        others: [ref(greenTime)],
        headline: greenTime,
    },
    { id: "pull-requests", state: "ok", others: [], headline: ttm },
    {
        id: "ci",
        state: "bad",
        setBy: ref(runnerWait),
        others: [ref(longestQueued), ref(saturated), ref(byId(ciMembers, "ci.first_attempt"))],
        headline: runnerWait,
    },
    {
        id: "flaky",
        state: "bad",
        setBy: ref(byId(flakyMembers, "flaky.blocked"), f("short.blocked", { prs: 3 })),
        others: [ref(byId(flakyMembers, "flaky.no_issue"), f("short.no_issue", { tests: 2 }))],
        headline: flakeRate,
    },
    {
        id: "releases",
        state: "bad",
        setBy: ref(lanesRed, f("short.lanes_red", { lanes: ["audit", "t4"] })),
        others: [
            ref(byId(releaseMembers, "releases.workflows_failing")),
            ref(byId(releaseMembers, "releases.train_skipped")),
        ],
        headline: lanesRed,
    },
    { id: "costs", state: "ok", others: [], headline: spend },
    {
        id: "data-sources",
        state: "bad",
        setBy: ref(dataMembers[0], f("short.stress_filed", { filed: 0, failures: 27 })),
        others: [],
        headline: member({
            id: "data-sources.sources_not_ok",
            value: { n: 1, of: 8 },
            sla: { target: cmp("==", 0), red: cmp(">=", 1) },
            spark: spark([...flat(0, 9), ...flat(1, 9)], flat(1, 24), { target: cmp("==", 0), red: cmp(">=", 1) }, 0),
            link: "/data-sources",
        }),
    },
];

const episodes: Episode[] = [
    {
        id: "e1",
        category: "master",
        member: "master.same_check",
        worst: "bad",
        start: t("18:03"),
        end: null,
        fact: f("ep.shared_check", { check: "Test (graphty-*)", prs: 5, suspects: [3495, 3496, 3497] }),
        link: "/master/shared",
    },
    {
        id: "e2",
        category: "ci",
        member: "ci.saturated",
        worst: "bad",
        start: t("19:20"),
        end: null,
        fact: f("ep.saturated", { running: 57, limit: 60, queued: 235, master_queued_min: 68 }),
        link: "/ci/runners",
    },
    {
        id: "e3",
        category: "flaky",
        member: "flaky.blocked",
        worst: "bad",
        start: t("19:01"),
        end: null,
        fact: f("ep.flaky_held", { prs: 3, tests: ["Football conference picker", "Find no-match line"] }),
        link: "/flaky/hotspots",
    },
    {
        id: "e4",
        category: "releases",
        member: "releases.lanes_red",
        worst: "bad",
        start: t("10-24 19:25"),
        end: null,
        fact: f("ep.lanes_red", { lanes: ["audit", "t4"], sha: "a870943ef", shadow: true }),
        link: "/releases/lanes",
    },
    {
        id: "e5",
        category: "releases",
        member: "releases.workflows_failing",
        worst: "bad",
        start: t("18:03"),
        end: null,
        fact: f("ep.workflow_failing", { workflow: "promote.yml", runs: 131, fix: 3577, fix_waits_owner: true }),
        link: "/releases/workflows",
    },
    {
        id: "e6",
        category: "releases",
        member: "releases.train_skipped",
        worst: "warn",
        start: t("18:00"),
        end: null,
        fact: f("ep.train_skipped", { attempt: t("18:00"), sha: "1fa254bf3" }),
        link: "/releases/trains",
    },
    {
        id: "e7",
        category: "data-sources",
        member: "data-sources.stress_run",
        worst: "bad",
        start: t("08:42"),
        end: null,
        fact: f("ep.stress_filing", { filed: 0, failures: 27, cap: 25 }),
        link: "/data-sources/stress",
    },
    {
        id: "e8",
        category: "master",
        member: "master.red_now",
        worst: "bad",
        start: t("20:01"),
        end: t("23:06"),
        fact: f("ep.no_green", { h: 3.1, builds: 11, step: "Upload source maps to Sentry" }),
        link: "/master/red",
    },
    {
        id: "e9",
        category: "master",
        member: "master.same_check",
        worst: "warn",
        start: t("19:48"),
        end: t("20:20"),
        fact: f("ep.aggregator_alone", { check: "All Checks Pass", prs: 2, signature: "Argument list too long" }),
        link: "/master/shared",
    },
    {
        id: "e10",
        category: "master",
        member: "master.same_check",
        worst: "warn",
        start: t("20:15"),
        end: t("20:52"),
        fact: f("ep.shared_check", { check: "Checks", step: "Figma lock", prs: 3, suspects: [] }),
        link: "/master/shared",
    },
];

const sources: SourceAge[] = [
    { id: "collector", lastWrite: t("23:28"), limitS: 900, state: "ok" },
    { id: "ci-results", lastWrite: t("23:26"), limitS: 7200, state: "ok" },
    { id: "ci-timings", lastWrite: t("23:26"), limitS: 7200, state: "ok" },
    { id: "releases", lastWrite: t("18:24"), limitS: 25200, state: "ok" },
    { id: "npm", lastWrite: t("22:52"), limitS: 10800, state: "ok" },
    { id: "stress", lastWrite: t("09:30"), limitS: 691200, state: "bad" },
    { id: "hosts", lastWrite: t("04:30"), limitS: 108000, state: "ok" },
    { id: "billing", lastWrite: t("13:30"), limitS: 129600, state: "ok" },
    { id: "flaky-feed", lastWrite: null, limitS: null, state: "notsetup" },
    { id: "local", lastWrite: t("14:30"), limitS: null, state: "idle" },
];

const overview: OverviewResponse = { page: "overview", range: "1h", generated: GEN, categories, episodes, sources };

// ---------------------------------------------------------------- sections

const cell = {
    name: (v: string, bold?: boolean) => (bold ? { t: "name" as const, v, bold } : { t: "name" as const, v }),
    sub: (main: TableRow["cells"][string], sub: TableRow["cells"][string]) => ({ t: "sub" as const, main, sub }),
    fact: (code: string, params?: Fact["params"]) => ({ t: "fact" as const, fact: f(code, params) }),
    prs: (...ns: number[]) => ({
        t: "list" as const,
        items: ns.map((n) => ({ t: "pr" as const, n })),
        sep: "space" as const,
    }),
    time: (s: string) => ({ t: "time" as const, at: t(s) }),
    span: (a: string, b: string | null) => ({ t: "span" as const, start: t(a), end: b ? t(b) : null }),
    bad: (c: TableRow["cells"][string]) => ({ t: "mark" as const, state: "bad" as const, cell: c }),
    warn: (c: TableRow["cells"][string]) => ({ t: "mark" as const, state: "warn" as const, cell: c }),
};

const masterSections: Section[] = [
    {
        kind: "strip",
        id: "red",
        from: t("17:30"),
        to: GEN,
        spans: [
            { start: t("17:30"), end: t("18:02"), state: "green" },
            { start: t("18:02"), end: t("18:54"), state: "gray" },
            { start: t("18:54"), end: t("20:01"), state: "green" },
            { start: t("20:01"), end: t("23:06"), state: "red" },
            { start: t("23:06"), end: GEN, state: "green" },
        ],
    },
    {
        kind: "table",
        id: "red-spans",
        rows: [
            {
                cells: {
                    span: cell.sub(
                        cell.bad({ t: "span", start: t("20:01"), end: t("23:06") }),
                        cell.fact("master.span.cleared", { h: 3.1, cleared: t("23:06") }),
                    ),
                    builds: cell.sub(
                        cell.fact("master.builds.cancelled", { n: 11 }),
                        cell.fact("master.builds.passed", { sha: "bfc880719", at: t("23:06") }),
                    ),
                    cause: cell.fact("cause.step_hang", {
                        job: "Build",
                        step: "Upload source maps to Sentry",
                        from: t("19:47"),
                        to: t("21:50"),
                        timeouts: 6,
                        timeout_min: 12,
                        guard_pr: 3561,
                        guard_at: t("21:14"),
                    }),
                    fix: {
                        t: "list",
                        sep: "line",
                        items: [
                            cell.fact("fix.merged", { pr: 3559, at: t("21:08") }),
                            cell.fact("fix.open", { pr: 3570 }),
                        ],
                    },
                },
            },
            {
                past: true,
                cells: {
                    span: cell.sub(cell.span("18:02", "18:54"), cell.fact("master.span.gray")),
                    builds: cell.fact("master.builds.by_hand", { n: 10 }),
                    cause: cell.fact("cause.cancelled_by_hand", { at: t("18:54") }),
                    fix: { t: "none" },
                },
            },
        ],
    },
    {
        kind: "table",
        id: "shared",
        rows: [
            {
                cells: {
                    check: cell.sub(
                        cell.bad(cell.name("Test (graphty-*)", true)),
                        cell.fact("check.family", { bins: 5 }),
                    ),
                    prs: cell.prs(3567, 3500, 3498, 3550, 3511),
                    since: cell.time("18:03"),
                    suspects: {
                        t: "list",
                        sep: "line",
                        items: [
                            cell.fact("suspect", { pr: 3495, title: "draw on demand in test browsers" }),
                            cell.prs(3496, 3497),
                        ],
                    },
                    issue: {
                        t: "list",
                        sep: "line",
                        items: [cell.fact("fix.issue_open", { issue: 3572 }), cell.fact("fix.open", { pr: 3573 })],
                    },
                },
            },
            {
                past: true,
                cells: {
                    check: cell.sub(cell.name("All Checks Pass", true), cell.fact("check.failed_alone")),
                    prs: cell.prs(3514, 3508),
                    since: cell.span("19:48", "20:20"),
                    suspects: cell.fact("cause.signature", { signature: "Argument list too long" }),
                    issue: cell.fact("fix.merged", { pr: 3552, at: t("20:20") }),
                },
            },
            {
                past: true,
                cells: {
                    check: cell.sub(cell.name("Checks", true), cell.name("Figma lock")),
                    prs: cell.prs(3550),
                    since: cell.span("20:15", "20:52"),
                    suspects: cell.fact("cause.unknown"),
                    issue: {
                        t: "list",
                        sep: "comma",
                        items: [
                            cell.fact("fix.merged", { pr: 3556, at: t("20:52") }),
                            cell.fact("fix.merged", { pr: 3557, at: t("20:52") }),
                        ],
                    },
                },
            },
        ],
    },
];

const prSections: Section[] = [
    {
        kind: "bars",
        id: "time",
        widened: { from: "1h", to: "6h", n: 2, nTo: 9 },
        groups: [
            {
                items: [
                    { label: { t: "label", code: "stage.runners" }, n: 21, unit: "min" },
                    { label: { t: "label", code: "stage.checks" }, n: 18, unit: "min" },
                    { label: { t: "label", code: "stage.red" }, n: 9, unit: "min" },
                    { label: { t: "label", code: "stage.merging" }, n: 4, unit: "min" },
                ],
            },
        ],
    },
    {
        kind: "table",
        id: "owner",
        rows: [
            {
                cells: {
                    pr: {
                        t: "list",
                        sep: "space",
                        items: [{ t: "pr", n: 3577 }, cell.name("fix(ci): promote.yml sets WORK in a step")],
                    },
                    why: {
                        t: "list",
                        sep: "comma",
                        items: [
                            cell.fact("owner.why", { paths: [".github/"] }),
                            cell.bad(
                                cell.fact("owner.fixes", {
                                    member: "releases.workflows_failing",
                                    workflow: "promote.yml",
                                }),
                            ),
                        ],
                    },
                    waiting: { t: "dur", s: 2640 },
                },
            },
            {
                cells: {
                    pr: {
                        t: "list",
                        sep: "space",
                        items: [{ t: "pr", n: 3576 }, cell.name("fix(visual-review): scroll the body")],
                    },
                    why: cell.fact("owner.why", { paths: ["visual-review"] }),
                    waiting: { t: "dur", s: 3300 },
                },
            },
            {
                cells: {
                    pr: {
                        t: "list",
                        sep: "space",
                        items: [{ t: "pr", n: 3565 }, cell.name("ci(visual-review): quarantine unstable story tests")],
                    },
                    why: cell.fact("owner.why", { paths: ["visual-review", ".github/"] }),
                    waiting: { t: "dur", s: 6840 },
                },
            },
        ],
    },
];

function shardsSection(range: SlowRange, runKind: "full" | "pr-bins"): Section {
    const k = range === "28d" ? 1.03 : 1;
    const s = (min: number) => Math.round(min * 60 * k);
    if (runKind === "pr-bins")
        return {
            kind: "shards",
            id: "shards",
            range,
            runKind,
            rows: [
                {
                    shard: "graphty-element-browser",
                    runs: 212,
                    minRuns: 5,
                    medianS: s(7.4),
                    p90S: s(8.6),
                    budgetS: 480,
                },
                { shard: "graphty", runs: 188, minRuns: 5, medianS: s(6.9), p90S: s(7.8), budgetS: 480 },
                {
                    shard: "graphty-element-storybook",
                    runs: 160,
                    minRuns: 5,
                    medianS: s(6.1),
                    p90S: s(7.2),
                    budgetS: 480,
                },
            ],
            more: { count: 9, allWithin: true },
        };
    return {
        kind: "shards",
        id: "shards",
        range,
        runKind,
        rows: [
            {
                shard: "graphty-element-browser-3",
                runs: range === "28d" ? 38 : 11,
                minRuns: 5,
                medianS: s(15.6),
                p90S: s(18.2),
                budgetS: 900,
                files: [
                    { file: "test/browser/edges/EdgeMesh.test.ts", medianS: s(3.1), p90S: s(3.6), share: 20 },
                    { file: "test/browser/layout/ForceLayout.test.ts", medianS: s(2.4), p90S: s(2.9), share: 15 },
                    { file: "test/browser/xr/XRSession.test.ts", medianS: s(2.2), p90S: s(3.4), share: 14 },
                ],
                moreFiles: 31,
            },
            {
                shard: "graphty-element-storybook-2",
                runs: 11,
                minRuns: 5,
                medianS: s(13.8),
                p90S: s(16.9),
                budgetS: 900,
            },
            { shard: "graphty-element-browser-1", runs: 11, minRuns: 5, medianS: s(12.9), p90S: s(14.1), budgetS: 900 },
            { shard: "graphty-1", runs: 11, minRuns: 5, medianS: s(11.2), p90S: s(12.5), budgetS: 900 },
            { shard: "graphty-storybook", runs: 11, minRuns: 5, medianS: s(10.1), p90S: s(11.7), budgetS: 900 },
            {
                shard: "compact-mantine",
                group: "small-browser",
                runs: 11,
                minRuns: 5,
                medianS: s(6.2),
                p90S: s(7),
                budgetS: 900,
            },
            { shard: "graphty-element-lifecycle", runs: 4, minRuns: 5, medianS: s(9.1), p90S: s(10.2), budgetS: 900 },
        ],
        more: { count: 29, allWithin: true },
    };
}

const ciSections: Section[] = [
    {
        kind: "bars",
        id: "causes",
        sub: f("ci.causes.sub", { suites: 5 }),
        groups: [
            {
                items: [
                    { label: { t: "label", code: "cause.shared_check" }, n: 3, unit: "count", tone: "bad" },
                    { label: { t: "label", code: "cause.shared_aggregator" }, n: 0, unit: "count", tone: "bad" },
                    { label: { t: "label", code: "cause.change" }, n: 1, unit: "count" },
                    { label: { t: "label", code: "cause.flaky" }, n: 1, unit: "count" },
                    { label: { t: "label", code: "cause.infrastructure" }, n: 0, unit: "count" },
                ],
            },
        ],
    },
    {
        kind: "table",
        id: "runner-minutes",
        sub: f("runner_minutes.sub", { day: 83, week: 146 }),
        rows: (
            [
                ["pr", 398, 291, 33046, 42474],
                ["master", 28, 20, 2285, 2974],
                ["full", 33, 33, 2777, 4857],
                ["other", 52, 39, 4313, 5706],
                ["total", 511, 387, 42421, 56546],
            ] as const
        ).map(([k, day, week, dayMin, weekMin]) => ({
            cells: {
                kind: { t: "label", code: `load.${k}` },
                day: { t: "num", n: day, unit: "min" },
                week: { t: "num", n: week, unit: "min" },
                dayMin: { t: "num", n: dayMin, unit: "min" },
                weekMin: { t: "num", n: weekMin, unit: "min" },
            },
            ...(k === "total" ? { total: true } : {}),
        })),
    },
    shardsSection("7d", "full"),
];

const QUEUED = [
    12, 14, 15, 17, 18, 22, 26, 30, 34, 43, 52, 60, 69, 80, 91, 102, 113, 126, 139, 152, 165, 177, 189, 201, 235,
];
const runnerSections: Section[] = [
    {
        kind: "jobs",
        id: "jobs",
        step: "15m",
        start: t("17:30"),
        running: [...ramp(32, 52, 13).map(Math.round), 53, 54, 55, 56, ...flat(57, 8)],
        queued: QUEUED,
        limit: 60,
        peak: { n: 58, at: t("22:40") },
    },
    {
        kind: "bars",
        id: "holders",
        notes: [
            f("runners.queued_runs", { runs: 5, workflow: "CI", event: "push", since: t("22:22") }),
            f("runners.one_repo", { repo: "graphty-monorepo", h: 6 }),
        ],
        groups: [
            {
                head: f("runners.running_now", { jobs: 57 }),
                items: [
                    { label: cell.name("CI, pull_request"), detail: cell.name("test shards"), n: 47, unit: "jobs" },
                    { label: cell.name("CodeQL"), n: 4, unit: "jobs" },
                    {
                        label: cell.name("Hosts, pull_request"),
                        detail: cell.fact("runners.macos", { jobs: 1 }),
                        n: 3,
                        unit: "jobs",
                    },
                    { label: cell.name("PR Integrity, pull_request"), n: 2, unit: "jobs" },
                    { label: cell.name("CI, push to master"), n: 1, unit: "jobs" },
                ],
            },
            {
                head: f("runners.queued_now", { jobs: 235 }),
                items: [
                    { label: cell.name("CI, pull_request"), n: 214, unit: "jobs" },
                    { label: cell.name("PR Integrity"), n: 9, unit: "jobs" },
                    { label: cell.name("CodeQL"), n: 6, unit: "jobs" },
                    { label: cell.name("PR Title, PR Issue Link"), n: 6, unit: "jobs" },
                ],
            },
        ],
    },
    {
        kind: "table",
        id: "superseded",
        rows: [
            {
                cells: {
                    run: cell.name("PR Integrity"),
                    pr: { t: "pr", n: 3498 },
                    newer: { t: "ago", at: t("22:49") },
                },
            },
            { cells: { run: cell.name("CodeQL"), pr: { t: "pr", n: 3571 }, newer: { t: "ago", at: t("23:18") } } },
        ],
    },
];

function hotspots(range: SlowRange): Section {
    const k = range === "28d" ? 3 : 1;
    const node = (n: Omit<TreeNode, "quarantined"> & { quarantined?: number }): TreeNode => ({
        quarantined: 0,
        ...n,
        events: n.events * k,
    });
    return {
        kind: "tree",
        id: "hotspots",
        range,
        quiet: 13,
        nodes: [
            node({
                level: "family",
                name: "graphty screenshots",
                tags: [f("tag.screenshots")],
                distinct: 2,
                events: 9,
                per1000: 31,
                prsHeld: 3,
                children: [
                    node({
                        level: "file",
                        name: "src/components/style/StylePanel.stories.tsx",
                        distinct: 1,
                        events: 6,
                        per1000: 48,
                        prsHeld: 2,
                        children: [
                            node({
                                level: "test",
                                name: "Football conference: Which nodes picker",
                                tags: [f("tag.unstable"), f("tag.issue", { issue: 3521 })],
                                distinct: 1,
                                events: 6,
                                per1000: 48,
                                prsHeld: 2,
                                link: "/flaky/test?file=src%2Fcomponents%2Fstyle%2FStylePanel.stories.tsx&test=Football%20conference%3A%20Which%20nodes%20picker",
                            }),
                        ],
                    }),
                    node({
                        level: "file",
                        name: "src/components/find/FindBox.stories.tsx",
                        distinct: 1,
                        events: 3,
                        per1000: 22,
                        prsHeld: 1,
                        children: [
                            node({
                                level: "test",
                                name: "Find: no-match line",
                                tags: [f("tag.unstable"), f("tag.issue", { issue: 3553 })],
                                distinct: 1,
                                events: 3,
                                per1000: 22,
                                prsHeld: 1,
                                link: "/flaky/test?file=src%2Fcomponents%2Ffind%2FFindBox.stories.tsx&test=Find%3A%20no-match%20line",
                            }),
                        ],
                    }),
                ],
            }),
            node({ level: "family", name: "graphty", distinct: 2, events: 7, per1000: 2.2, prsHeld: 0 }),
            node({
                level: "family",
                name: "graphty-element-browser",
                distinct: 2,
                events: 4,
                per1000: 1.1,
                prsHeld: 0,
            }),
            node({
                level: "family",
                name: "compact-mantine screenshots",
                tags: [f("tag.screenshots")],
                distinct: 1,
                events: 3,
                per1000: 12,
                prsHeld: 0,
            }),
            node({
                level: "group",
                name: "small-browser",
                tags: [f("tag.job_group", { shards: 6 })],
                distinct: 1,
                events: 2,
                per1000: 0.6,
                prsHeld: 0,
            }),
            node({
                level: "family",
                name: "webgpu-graph-algorithms-node",
                tags: [f("tag.gpu")],
                distinct: 1,
                events: 1,
                per1000: 0.5,
                prsHeld: 0,
            }),
        ],
    };
}

const flakySections: Section[] = [
    hotspots("7d"),
    { kind: "empty", id: "quarantine", fact: f("flaky.quarantine.empty") },
];

const releaseSections: Section[] = [
    {
        kind: "table",
        id: "lanes",
        sub: f("releases.lanes.sub", { sha: "a870943ef", run: 40119894804, at: t("10-24 18:15") }),
        rows: [
            {
                cells: {
                    lane: cell.name("audit"),
                    result: cell.bad(cell.fact("lane.failed")),
                    since: cell.time("10-24 18:45"),
                    job: cell.fact("lane.job", { job: "Security audit", s: 20 }),
                },
            },
            {
                cells: {
                    lane: cell.name("t4"),
                    result: cell.bad(cell.fact("lane.failed")),
                    since: cell.time("10-24 19:25"),
                    job: cell.fact("lane.job", { job: "T4 GPU / Test (NVIDIA T4)", s: 2340 }),
                },
            },
            {
                cells: {
                    lane: cell.name("ci"),
                    result: cell.fact("lane.passed"),
                    since: { t: "none" },
                    job: cell.fact("lane.jobs", { workflow: "CI", jobs: 25 }),
                },
            },
            {
                cells: {
                    lane: cell.name("hosts"),
                    result: cell.fact("lane.passed"),
                    since: { t: "none" },
                    job: cell.name("Metal on macOS, D3D12 on Windows"),
                },
            },
            {
                cells: {
                    lane: cell.name("autosave_macos"),
                    result: cell.fact("lane.passed"),
                    since: { t: "none" },
                    job: cell.name("Work protection (macOS)"),
                },
            },
            {
                cells: {
                    lane: cell.name("llm"),
                    result: cell.fact("lane.passed"),
                    since: { t: "none" },
                    job: cell.fact("lane.job_cost", { job: "LLM regression", s: 600, usd: 0.94 }),
                },
            },
            {
                past: true,
                cells: {
                    lane: cell.name("version, land, publish"),
                    result: cell.fact("lane.skipped"),
                    since: { t: "none" },
                    job: cell.fact("lane.shadow"),
                },
            },
        ],
    },
    {
        kind: "table",
        id: "trains",
        rows: [
            {
                cells: {
                    attempt: cell.time("18:00"),
                    candidate: { t: "sha", v: "1fa254bf3" },
                    lanes: cell.warn(cell.fact("train.untested")),
                },
            },
            {
                past: true,
                cells: {
                    attempt: {
                        t: "list",
                        sep: "comma",
                        items: [cell.time("12:00"), cell.time("06:00"), cell.time("00:00")],
                    },
                    candidate: { t: "sha", v: "a870943ef" },
                    lanes: cell.fact("train.nothing_new"),
                },
            },
            {
                cells: {
                    attempt: cell.time("10-24 18:15"),
                    candidate: { t: "sha", v: "a870943ef" },
                    lanes: cell.fact("train.tested_failed", { lanes: ["audit", "t4"] }),
                },
            },
            {
                past: true,
                cells: {
                    attempt: {
                        t: "list",
                        sep: "comma",
                        items: [cell.time("10-24 18:00"), cell.time("10-24 12:00"), cell.time("10-24 06:00")],
                    },
                    candidate: {
                        t: "list",
                        sep: "comma",
                        items: [
                            { t: "sha", v: "a870943ef" },
                            { t: "sha", v: "77154dddc" },
                        ],
                    },
                    lanes: cell.fact("train.nothing_new"),
                },
            },
            {
                cells: {
                    attempt: cell.time("10-24 00:00"),
                    candidate: { t: "sha", v: "77154dddc" },
                    lanes: cell.fact("train.failed_before", { job: "Pick the release candidate" }),
                },
            },
        ],
    },
    {
        kind: "table",
        id: "workflows",
        rows: [
            {
                cells: {
                    workflow: cell.name("promote.yml"),
                    runs: {
                        t: "list",
                        sep: "comma",
                        items: [
                            cell.bad(cell.fact("wf.failed_of", { failed: 24, runs: 24 })),
                            cell.fact("wf.in_a_row", { n: 131 }),
                        ],
                    },
                    since: cell.fact("wf.since_merge", { at: t("18:03"), pr: 3511 }),
                    cause: cell.fact("cause.workflow_error", {
                        detail: "WORK read from the runner context in job env",
                        fix: 3577,
                        waits_owner_s: 2640,
                    }),
                },
            },
            {
                past: true,
                cells: {
                    workflow: cell.name("release-watch.yml"),
                    runs: { t: "num", n: 0 },
                    since: { t: "none" },
                    cause: { t: "none" },
                },
            },
        ],
    },
];

function moneySpark(a: number, b: number): Spark {
    return { step: "1d", ctx: [], trend: ramp(a, b, 28), breach: nulls(28) };
}
function costSections(range: SlowRange): Section[] {
    const d = range === "7d" ? 7 : 28;
    const sp = (a: number, b: number): Spark => {
        const s = moneySpark(a, b);
        return { ...s, trend: s.trend.slice(-d), breach: s.breach.slice(-d) };
    };
    const line = (
        code: string,
        rate: Fact | null,
        projected: number,
        so: number | null,
        budget: number | null,
        spark?: Spark,
        state?: TableRow["cells"][string],
    ): TableRow => ({
        cells: {
            line: rate ? cell.sub({ t: "label", code }, { t: "fact", fact: rate }) : { t: "label", code },
            projected: { t: "num", n: projected, unit: "usd", bold: true },
            sofar: so === null ? cell.fact("cost.flat") : { t: "budget", so, budget, unit: "usd" },
            spark: spark ? { t: "spark", spark } : { t: "none" },
            state: state ?? { t: "none" },
        },
    });
    return [
        {
            kind: "table",
            id: "money",
            sub: f("costs.money.sub", { month_end: "2026-10-31" }),
            rows: [
                line("cost.t4", f("cost.t4.rate", { usd_min: 0.018, boot_min: 1 }), 160, 129, 200, sp(150, 160)),
                line("cost.llm", f("cost.llm.rate", { usd: 0.94 }), 29, 23, 60, sp(29, 29)),
                line("cost.sentry", f("cost.plan"), 26, null, null),
                line("cost.github", f("cost.github.plan", { seats: 2 }), 8, null, null),
                line("cost.cloudflare", f("cost.cloudflare.plan"), 5, null, null),
                line("cost.aws", f("cost.aws.credits", { usd: 119.38 }), 0.77, 0.62, 10),
                {
                    total: true,
                    cells: {
                        line: { t: "label", code: "cost.total" },
                        projected: { t: "num", n: 229, unit: "usd", bold: true },
                        sofar: { t: "budget", so: 185, budget: 300, unit: "usd" },
                        spark: { t: "none" },
                        state: { t: "none" },
                    },
                },
                {
                    past: true,
                    cells: {
                        line: cell.sub({ t: "label", code: "cost.sentry_usage" }, cell.fact("cost.usage.events")),
                        projected: { t: "none" },
                        sofar: { t: "none" },
                        spark: { t: "none" },
                        state: { t: "state", state: "notsetup", link: "/data-sources/not-set-up" },
                    },
                },
                {
                    past: true,
                    cells: {
                        line: cell.sub({ t: "label", code: "cost.cloudflare_usage" }, cell.fact("cost.usage.requests")),
                        projected: { t: "none" },
                        sofar: { t: "none" },
                        spark: { t: "none" },
                        state: { t: "state", state: "notsetup", link: "/data-sources/not-set-up" },
                    },
                },
            ],
        },
        {
            kind: "table",
            id: "unit",
            rows: [
                {
                    cells: {
                        measure: { t: "label", code: "unit.train" },
                        value: { t: "num", n: 0.92, unit: "usd", bold: true },
                        note: cell.fact("unit.train.note", { days: d }),
                    },
                },
                {
                    cells: {
                        measure: { t: "label", code: "unit.pr_value" },
                        value: { t: "num", n: 2.4, unit: "usd", bold: true },
                        note: cell.fact("unit.pr_value.note"),
                    },
                },
            ],
        },
        {
            kind: "bars",
            id: "by-workflow",
            groups: [
                {
                    head: f("costs.money_by_workflow"),
                    items: [
                        { label: cell.name("release.yml (with gpu.yml)"), n: 140.3, unit: "usd" },
                        { label: cell.name("release.yml, LLM step"), n: 23.4, unit: "usd" },
                        { label: cell.name("gpu-weekly-paired.yml"), n: 11.3, unit: "usd" },
                        { label: cell.name("gpu-rerun-on-runner-loss.yml"), n: 2.1, unit: "usd" },
                    ],
                },
                {
                    head: f("costs.value_by_workflow"),
                    items: [
                        { label: cell.name("ci.yml"), n: 2310, unit: "usd", tone: "value" },
                        { label: cell.name("release.yml"), n: 1240, unit: "usd", tone: "value" },
                        { label: cell.name("CodeQL"), n: 412, unit: "usd", tone: "value" },
                        { label: cell.name("hosts.yml"), n: 182, unit: "usd", tone: "value" },
                        { label: cell.name("work-protection-macos.yml"), n: 141, unit: "usd", tone: "value" },
                    ],
                },
            ],
        },
    ];
}

function srcRow(
    code: string,
    what: Fact,
    write: string | null,
    limit: TableRow["cells"][string],
    volume: TableRow["cells"][string],
    error: TableRow["cells"][string],
    state: TableRow["cells"][string],
    past = false,
): TableRow {
    return {
        ...(past ? { past } : {}),
        cells: {
            source: cell.sub({ t: "label", code }, { t: "fact", fact: what }),
            write: write ? { t: "ago", at: t(write) } : { t: "none" },
            limit,
            volume,
            error,
            state,
        },
    };
}
const none = { t: "none" } as const;
const dataSections: Section[] = [
    {
        kind: "table",
        id: "stress",
        sub: f("data.stress.sub", { workflow: "restricted-cpu-stress.yml" }),
        rows: [
            {
                cells: {
                    run: { t: "list", sep: "comma", items: [cell.time("08:42"), { t: "run", id: 40177689577 }] },
                    result: cell.bad(
                        cell.fact("stress.filing_failed", {
                            step: "File the load-sensitive tests",
                            failures: 27,
                            cap: 25,
                            file: "oracle-scorecard.test.ts",
                            cause: "Git LFS pictures missing",
                        }),
                    ),
                    filed: cell.fact("stress.filed_tracked", { filed: 0, issue: 3539 }),
                },
            },
            {
                past: true,
                cells: {
                    run: cell.time("10-18 08:19"),
                    result: cell.fact("stress.found_nothing"),
                    filed: { t: "num", n: 0 },
                },
            },
            {
                past: true,
                cells: {
                    run: cell.time("10-11 10:18"),
                    result: cell.fact("stress.found_nothing"),
                    filed: { t: "num", n: 0 },
                },
            },
        ],
    },
    {
        kind: "table",
        id: "sources",
        rows: [
            srcRow(
                "source.collector",
                f("source.collector.what"),
                "23:28",
                { t: "dur", s: 900 },
                { t: "num", n: 100, unit: "pct" },
                none,
                none,
            ),
            srcRow(
                "source.ci-results",
                f("source.ci-results.what"),
                "23:26",
                cell.fact("source.limit_runs", { h: 2 }),
                cell.fact("source.since_no_history", { since: t("20:42") }),
                none,
                none,
            ),
            srcRow(
                "source.ci-timings",
                f("source.ci-timings.what"),
                "23:26",
                cell.fact("source.limit_runs", { h: 2 }),
                { t: "num", n: 96, unit: "pct" },
                none,
                none,
            ),
            srcRow(
                "source.releases",
                f("source.releases.what"),
                "18:24",
                { t: "dur", s: 25200 },
                cell.fact("source.trains", { got: 4, of: 4 }),
                none,
                none,
            ),
            srcRow("source.npm", f("source.npm.what"), "22:52", { t: "dur", s: 10800 }, none, none, none),
            srcRow(
                "source.stress",
                f("source.stress.what"),
                "09:30",
                { t: "dur", s: 691200 },
                none,
                cell.fact("source.error.filing"),
                { t: "state", state: "bad" },
            ),
            srcRow("source.hosts", f("source.hosts.what"), "04:30", { t: "dur", s: 108000 }, none, none, none),
            srcRow("source.billing", f("source.billing.what"), "13:30", { t: "dur", s: 129600 }, none, none, none),
            srcRow(
                "source.local",
                f("source.local.what"),
                "14:30",
                none,
                cell.fact("source.no_local_gate", { since: t("10-25 00:00") }),
                none,
                { t: "state", state: "idle" },
                true,
            ),
        ],
    },
    {
        kind: "table",
        id: "not-set-up",
        rows: [
            {
                cells: {
                    member: cell.sub({ t: "label", code: "cost.sentry_usage" }, cell.fact("cost.usage.events")),
                    on: { t: "label", code: "page.costs" },
                    unblock: cell.fact("unblock.sentry_token"),
                },
            },
            {
                cells: {
                    member: cell.sub({ t: "label", code: "cost.cloudflare_usage" }, cell.fact("cost.usage.requests")),
                    on: { t: "label", code: "page.costs" },
                    unblock: cell.fact("unblock.cloudflare_token"),
                },
            },
            {
                cells: {
                    member: cell.sub(
                        { t: "label", code: "member.releases.channels" },
                        cell.fact("notsetup.channels.what"),
                    ),
                    on: { t: "label", code: "page.releases" },
                    unblock: cell.fact("unblock.channels", { issue: 3418 }),
                },
            },
            {
                cells: {
                    member: cell.sub({ t: "label", code: "source.flaky-feed" }, cell.fact("notsetup.flaky_feed.what")),
                    on: { t: "label", code: "page.flaky" },
                    unblock: cell.fact("unblock.flaky_feed"),
                },
            },
        ],
    },
];

// ---------------------------------------------------------------- pages

const page = (p: Omit<PageResponse, "generated" | "range"> & { range?: PageResponse["range"] }): PageResponse => ({
    generated: GEN,
    range: "1h",
    ...p,
});
const cat = (id: CategoryStatus["id"]) => categories.find((c) => c.id === id) as CategoryStatus;
const head = (id: CategoryStatus["id"]) => ({
    state: cat(id).state,
    ...(cat(id).setBy ? { setBy: cat(id).setBy } : {}),
    others: cat(id).others,
});

const pages: PageResponse[] = [
    page({
        page: "master",
        ...head("master"),
        notes: [f("master.note.queued", { builds: 5, oldest_min: 68 })],
        members: masterMembers,
        sections: masterSections,
    }),
    page({
        page: "pull-requests",
        ...head("pull-requests"),
        notes: [f("prs.note.few", { merged: 2, created: 3 }), f("prs.note.owner")],
        members: prMembers,
        sections: prSections,
    }),
    page({
        page: "ci",
        ...head("ci"),
        notes: [f("ci.note.hangs_cleared", { h6: 6 })],
        members: ciMembers,
        sections: ciSections,
    }),
    page({
        page: "runners",
        ...head("ci"),
        notes: [f("runners.note.master_queued", { builds: 5, oldest_min: 68 })],
        members: runnerMembers,
        sections: runnerSections,
    }),
    page({
        page: "local-runs",
        state: "idle",
        others: [],
        notes: [f("local.note.idle", { since: "2026-10-25" })],
        members: localMembers,
        sections: [
            { kind: "empty", id: "runs", fact: f("section.no_events") },
            { kind: "empty", id: "shard-time", fact: f("section.no_events") },
        ],
    }),
    page({
        page: "flaky",
        ...head("flaky"),
        notes: [f("flaky.note.judged_again", { since: t("20:42") })],
        // Every flaky source (design 4.4): CI's rerun rate and the stress run are shown here too, judged elsewhere.
        members: [...flakyMembers, byId(ciMembers, "ci.reruns"), byId(dataMembers, "data-sources.stress_run")],
        sections: [...flakySections, ...dataSections.filter((s) => s.id === "stress")],
    }),
    page({
        page: "releases",
        ...head("releases"),
        notes: [f("releases.note.shadow")],
        members: releaseMembers,
        sections: releaseSections,
    }),
    page({
        page: "data-sources",
        ...head("data-sources"),
        notes: [f("data.note.notsetup", { n: 4 })],
        members: dataMembers,
        sections: dataSections,
    }),
];

// ---------------------------------------------------------------- ranges

/** The hourly mean of four 15-minute buckets. */
function hourly(v: (number | null)[]): (number | null)[] {
    const out: (number | null)[] = [];
    for (let i = 0; i < v.length; i += 4) {
        const xs = v.slice(i, i + 4).filter((x): x is number => x !== null);
        out.push(xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : null);
    }
    return out;
}
function worst(b: ("warn" | "bad" | null)[]): ("warn" | "bad" | null)[] {
    const out: ("warn" | "bad" | null)[] = [];
    for (let i = 0; i < b.length; i += 4) {
        const xs = b.slice(i, i + 4);
        out.push(xs.includes("bad") ? "bad" : xs.includes("warn") ? "warn" : null);
    }
    return out;
}
function sparkFor(s: Spark | undefined, range: Range): Spark | undefined {
    if (!s || range !== "24h" || s.step !== "15m") return s;
    return {
        ...s,
        step: "1h",
        ctx: [],
        trend: [...s.ctx, ...hourly(s.trend)],
        breach: [...s.ctx.map(() => null), ...worst(s.breach)],
    };
}
/** A member at range 6 h or 24 h: a 1 h member shows its trend value (fixtures hold no 24 h values). */
function memberFor(m: Member, range: Range): Member {
    const spark = sparkFor(m.spark, range);
    const out: Member = { ...m, ...(spark ? { spark } : {}) };
    if (range === "1h" || (m.window !== "1h" && m.window !== "1h6h")) return out;
    const covered = m.covered6h;
    return {
        ...out,
        value: m.value6h ?? m.value,
        ...(m.n !== undefined && m.minN !== undefined ? { n: Math.max(m.n, m.minN) * 6 } : {}),
        ...(covered ? { covered } : {}),
    };
}
function sectionFor(s: Section, range: Range): Section {
    if (s.kind === "strip" && range === "24h")
        return {
            ...s,
            from: "2026-10-24T23:30:00Z",
            spans: [{ start: "2026-10-24T23:30:00Z", end: s.spans[0].end, state: "green" }, ...s.spans.slice(1)],
        };
    if (s.kind === "jobs" && range === "24h")
        return {
            ...s,
            step: "1h",
            start: "2026-10-24T23:30:00Z",
            running: [...flat(6, 9), 8, 14, 20, 26, 30, 32, 34, 36, 38, 44, 50, 54, 57, 57, 57, 57],
            queued: [...flat(0, 9), 1, 2, 4, 6, 8, 10, 12, 14, 18, 34, 69, 113, 165, 201, 235, 235],
        };
    if (s.widened && range !== "1h") {
        const { widened: _w, ...rest } = s;
        return rest as Section;
    }
    return s;
}

function write(name: string, body: unknown): void {
    const file = join(OUT, `${name}.json`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(body, null, 1) + "\n");
}

const RANGES: Range[] = ["1h", "6h", "24h"];
write("status", { generated: GEN, categories, episodes, sources });
for (const range of RANGES) {
    write(`overview.${range}`, {
        ...overview,
        range,
        categories: categories.map((c) => ({ ...c, headline: memberFor(c.headline, range) })),
    } satisfies OverviewResponse);
    for (const p of pages)
        write(`${p.page}.${range}`, {
            ...p,
            range,
            members: p.members.map((m) => memberFor(m, range)),
            sections: p.sections.map((s) => sectionFor(s, range)),
        } satisfies PageResponse);
}
for (const range of ["7d", "28d"] as SlowRange[]) {
    write(
        `costs.${range}`,
        page({
            page: "costs",
            range,
            ...head("costs"),
            notes: [f("costs.note.notsetup")],
            members: costMembers,
            sections: costSections(range),
        }),
    );
    for (const runKind of ["full", "pr-bins"] as const)
        write(`ci.shards.${runKind}.${range}`, {
            page: "ci",
            range,
            generated: GEN,
            section: shardsSection(range, runKind),
        } satisfies SectionResponse);
    write(`flaky.hotspots.${range}`, {
        page: "flaky",
        range,
        generated: GEN,
        section: hotspots(range),
    } satisfies SectionResponse);
}

const history: TestHistoryResponse = {
    generated: GEN,
    range: "7d",
    file: "src/components/style/StylePanel.stories.tsx",
    test: "Football conference: Which nodes picker",
    family: "graphty screenshots",
    issue: 3521,
    events: [
        {
            at: t("23:02"),
            kind: "pr",
            pr: 3567,
            run: 40241100231,
            attempt: 1,
            sha: "4be1c09a2",
            outcome: "flaky",
            signature: "capture differs from baseline: 1.9% of pixels",
        },
        {
            at: t("21:40"),
            kind: "pr",
            pr: 3500,
            run: 40236620114,
            attempt: 1,
            sha: "c81a7d2f0",
            outcome: "flaky",
            signature: "capture differs from baseline: 2.2% of pixels",
        },
        {
            at: t("20:15"),
            kind: "pr",
            pr: 3498,
            run: 40231955310,
            attempt: 2,
            sha: "9e0f21b44",
            outcome: "failed-rerun",
            signature: "capture differs from baseline: 2.0% of pixels",
        },
        {
            at: t("19:01"),
            kind: "pr",
            pr: 3498,
            run: 40227001876,
            attempt: 1,
            sha: "9e0f21b44",
            outcome: "flaky",
            signature: "capture differs from baseline: 1.7% of pixels",
        },
        { at: t("10-24 18:15"), kind: "full", run: 40119894804, attempt: 1, sha: "a870943ef", outcome: "passed" },
    ],
};
write("test-history", history);

// ---------------------------------------------------------------- the gray scenario

const grayCosts: CategoryStatus = {
    id: "costs",
    state: "nodata",
    setBy: { member: "costs.spend", state: "nodata", value: null, fact: f("short.nodata", { reason: "billing_late" }) },
    others: [],
    headline: member({
        id: "costs.spend",
        state: "nodata",
        value: null,
        sla: SLA.spend,
        reason: f("nodata.source_late", { source: "billing", h: 41 }),
        spark: spark(ramp(232, 230, 18), [...flat(230, 6), ...nulls(18)], SLA.spend),
        link: "/costs",
    }),
};
const grayPrs: CategoryStatus = {
    ...cat("pull-requests"),
    state: "ok",
    headline: { ...ttm, state: "partial", covered: { h: 0.4, of: 1 } },
};
const grayStatus = {
    generated: GEN,
    categories: categories.map((c) => (c.id === "costs" ? grayCosts : c.id === "pull-requests" ? grayPrs : c)),
    episodes,
    sources: sources.map((s) =>
        s.id === "billing" ? { ...s, lastWrite: "2026-10-24T06:30:00Z", state: "nodata" as const } : s,
    ),
};
write("gray/status", grayStatus);
for (const range of RANGES)
    write(`gray/overview.${range}`, {
        ...grayStatus,
        page: "overview",
        range,
        categories: grayStatus.categories.map((c) => ({ ...c, headline: memberFor(c.headline, range) })),
    } satisfies OverviewResponse);
for (const range of ["7d", "28d"] as SlowRange[]) {
    const secs = costSections(range).map((s) =>
        s.kind === "table" && s.id === "money"
            ? {
                  ...s,
                  rows: s.rows.map((r) =>
                      r.cells.line.t === "sub" &&
                      r.cells.line.main.t === "label" &&
                      r.cells.line.main.code === "cost.aws"
                          ? {
                                ...r,
                                cells: {
                                    ...r.cells,
                                    projected: none,
                                    sofar: none,
                                    state: { t: "state" as const, state: "nodata" as const },
                                },
                            }
                          : r,
                  ),
              }
            : s,
    );
    write(
        `gray/costs.${range}`,
        page({
            page: "costs",
            range,
            state: "nodata",
            setBy: grayCosts.setBy,
            others: [],
            notes: [f("costs.note.nodata", { source: "billing", h: 41 })],
            members: costMembers.map((m) =>
                m.id === "costs.aws" || m.id === "costs.spend"
                    ? {
                          ...m,
                          state: "nodata",
                          value: null,
                          reason: f("nodata.token_rejected", { since: t("10-24 06:30") }),
                      }
                    : m,
            ),
            sections: secs,
        }),
    );
}
for (const range of RANGES) {
    const p = pages.find((x) => x.page === "data-sources") as PageResponse;
    write(`gray/data-sources.${range}`, {
        ...p,
        range,
        members: p.members.map((m) =>
            m.id === "data-sources.app_rate"
                ? {
                      ...m,
                      state: "nodata",
                      value: null,
                      reason: f("nodata.token_rejected", { since: t("10-24 06:30") }),
                  }
                : m.id === "data-sources.thin"
                  ? { ...m, state: "partial", value: null, covered: { h: 0.4, of: 1 } }
                  : memberFor(m, range),
        ),
    } satisfies PageResponse);
}

console.log("fixtures written to", OUT);
