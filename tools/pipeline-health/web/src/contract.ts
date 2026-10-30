/**
 * The view contract of the pipeline health API: what the read API returns and the page draws.
 *
 * Design: design/ci/health-dashboard.md, sections 2 to 9 and 11.
 *
 * Rules every payload follows:
 *
 * - Values are neutral facts: numbers with a unit, ids, ISO times, and {@link Fact} codes with their
 *   parameters. The API never sends a reader-facing sentence; the page writes every word.
 * - Every state is judged by the backend (section 4). The page only draws the state it is given; it
 *   never compares a value with a threshold itself.
 * - Times are ISO 8601 strings in UTC.
 * - A missing number is `null`, never 0: a member that cannot be judged says why in its `state` and
 *   `reason`, so a broken source is never drawn as a calm zero.
 *
 * Routes (all GET, public, answered from precomputed items with `Cache-Control: max-age=60`):
 *
 * | Route                                                   | Returns                    |
 * | ------------------------------------------------------- | -------------------------- |
 * | `/v1/status`                                            | {@link StatusResponse}     |
 * | `/v1/page/overview?range=1h\|6h\|24h`                   | {@link OverviewResponse}   |
 * | `/v1/page/<category page>?range=1h\|6h\|24h`            | {@link PageResponse}       |
 * | `/v1/page/costs?range=7d\|28d`                          | {@link PageResponse}       |
 * | `/v1/page/<page>/<section>?range=7d\|28d[&kind=...]`    | {@link SectionResponse}    |
 * | `/v1/test-history?file=<f>[&test=<t>]&range=7d\|28d`    | {@link TestHistoryResponse}|
 * | `/v1/run/<run id>`                                      | {@link RunResponse}        |
 *
 * The slow sections served by the section route: `ci/shards` (`kind=full|pr-bins`) and
 * `flaky/hotspots`. {@link apiPath} builds every path.
 */

/** The page picker: every value, table and count on a page covers this window (section 8). */
export type Range = "1h" | "6h" | "24h";

/** The slow measures' own choice (section 8): Costs, shard times and flake hotspots. */
export type SlowRange = "7d" | "28d";

/** The seven categories, in pipeline order (section 2.2). */
export const CATEGORY_IDS = ["master", "pull-requests", "ci", "flaky", "releases", "costs", "data-sources"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** The ten views (section 2.6): the overview, the seven categories, and Runners and Local runs under CI. */
export type PageId = "overview" | CategoryId | "runners" | "local-runs";

/** An SLA state. NO DATA (`nodata`) counts as yellow in a rollup but is drawn gray and hatched (3.1). */
export type SlaState = "ok" | "warn" | "bad" | "nodata";

/**
 * A member's state.
 *
 * - `ok`, `warn`, `bad`, `nodata`: judged (3.1).
 * - `notsetup`: the member's source has no writer or token yet by design; out of the rollup.
 * - `few`: a rate whose last hour holds fewer than its minimum n; out of the rollup.
 * - `partial`: its source covers less than its window; out of the rollup.
 * - `idle`: its activity stopped by design (n=0); out of the rollup.
 * - `slow`: sent by APIs built before 7- and 28-day members were judged; read as out of the rollup.
 * - `info`: informational until it has fired on real data.
 */
export type MemberState = SlaState | "notsetup" | "few" | "partial" | "idle" | "slow" | "info";

/** A category's state: the worst of its judged members, or `idle` when every member is out of the rollup. */
export type CategoryState = SlaState | "idle";

/** An ISO 8601 time in UTC. */
export type Iso = string;

/** A hash route of the page, such as `/ci/runners` or `/master/red`, or an absolute https URL. */
export type Route = string;

/** A parameter of a {@link Fact}: numbers in the unit its code names, ids, names of data, ISO times. */
export type Param = string | number | boolean | null | readonly (string | number)[];

/**
 * A neutral statement: a code the page turns into words, with its parameters. Codes are listed in the
 * page's text catalog (web/src/text.ts); an unknown code is drawn as its code and parameters.
 */
export interface Fact {
    code: string;
    params?: Record<string, Param>;
}

/** The unit of a number. `pct` is 0 to 100; `ratio` a plain ratio; `x` a multiple of a budget. */
export type Unit = "pct" | "ratio" | "x" | "ms" | "s" | "min" | "h" | "d" | "usd" | "count" | "jobs" | "per1000";

/**
 * A member's value: a number, a word (`passed`, `failed`, `yes`, `no`), or `null` when there is none
 * to show ("--").
 */
export type Value = NumberValue | WordValue | null;

export interface NumberValue {
    n: number;
    unit?: Unit;
    /** "1 of 41": the denominator, when the value is a count of something. */
    of?: number;
    /** The number is an age ("2 min ago"). */
    ago?: boolean;
    /** Draw a sign ("+2"). */
    signed?: boolean;
}

export interface WordValue {
    /** `quiet`: the weekly stress run found nothing three weeks running. */
    word: "passed" | "failed" | "yes" | "no" | "filed" | "skipped" | "quiet";
    /** "filed 0": a count after the word. */
    n?: number;
}

/** A comparison in an SLA ("target <= 5 min", "red > 15"). */
export interface Cmp {
    op: "<=" | "<" | ">=" | ">" | "==";
    n: number;
    unit?: Unit;
}

/**
 * A member's SLA (section 4). `target` is green; `red` the red threshold; yellow lies between. A
 * threshold that is not a plain comparison ("passed and filed", "open >= 6 h") is a {@link Fact}.
 */
export interface Sla {
    target: Cmp | Fact;
    red?: Cmp | Fact;
    /** A noisy rate: red only when the 6 h value is past the red threshold too ("6 h too"). */
    needs6h?: boolean;
}

/**
 * A sparkline series (section 2.3).
 *
 * At ranges 1 h and 6 h: `step` is `15m`, `trend` the last 6 h in 24 fifteen-minute buckets, and
 * `ctx` the rest of the last 24 h, 18 hourly values, drawn faint at the left. At range 24 h: `step` is
 * `1h`, `trend` the 24 hourly values and `ctx` empty. Oldest first; the last trend bucket is the
 * current, partial one. A leading run of `null` is "no history" (hatched); a `null` later is a gap.
 * A day-by-day line (a cost projection over 7 d or 28 d) has `step` `1d`, no `ctx` and no shading.
 */
export interface Spark {
    step: "15m" | "1h" | "1d";
    ctx: (number | null)[];
    trend: (number | null)[];
    /** Per trend bucket: past the target (`warn`) or the red threshold (`bad`), as the backend judged it. */
    breach: ("warn" | "bad" | null)[];
    /** The target, drawn as a thin gray band. */
    target?: number;
}

/** The window a member's value covers (section 4, "Windows"). */
export type MemberWindow = "1h" | "1h6h" | "now" | "7d" | "28d";

/**
 * Member ids. The page names each one (web/src/text.ts); the id is catalog data, so a new member is
 * a new id here and a name there.
 */
export const MEMBER_IDS = [
    "master.red_now",
    "master.green_time",
    "master.same_check",
    "master.full_run_verdict",
    "master.untested_age",
    "master.reverts",
    "pull-requests.time_to_merge",
    "pull-requests.open",
    "pull-requests.oldest_open",
    "pull-requests.merge_ratio",
    "pull-requests.caused_failures",
    "pull-requests.automerge_green_stuck",
    "pull-requests.automerge_armed_long",
    "pull-requests.screenshot_backlog",
    "ci.runner_wait",
    "ci.longest_queued",
    "ci.saturated",
    "ci.not_assigned",
    "ci.first_attempt",
    "ci.hangs",
    "ci.pr_duration",
    "ci.bins_over",
    "ci.reruns",
    "ci.shards_over",
    "ci.runner_minutes",
    "ci.superseded",
    "ci.chronic_jobs",
    "ci.bench_regressions",
    "ci.screenshot_set_age",
    "ci.slice_base_budget",
    "ci.slice_idle_budget",
    "ci.slice_idle_hour_budget",
    "ci.slice_contended",
    "ci.slice_queue_wait",
    "flaky.blocked",
    "flaky.no_issue",
    "flaky.flake_rate",
    "flaky.net_new",
    "flaky.detected_to_fixed",
    "releases.lanes_red",
    "releases.workflows_failing",
    "releases.train_skipped",
    "releases.tagged_not_npm",
    "releases.train_first_pass",
    "releases.channels",
    "releases.review_lag",
    "releases.slots_unreviewed",
    "releases.green_clean",
    "releases.nightly_promotions",
    "costs.spend",
    "costs.t4",
    "costs.llm",
    "costs.aws",
    "costs.cloudflare_usage",
    "costs.sentry_usage",
    "data-sources.stress_run",
    "data-sources.past_age",
    "data-sources.thin",
    "data-sources.collector",
    "data-sources.app_rate",
    "data-sources.write_budget",
    "data-sources.sources_not_ok",
    "local-runs.local_vs_ci",
    "local-runs.shard_time",
    "local-runs.slot_waits",
] as const;
export type MemberId = (typeof MEMBER_IDS)[number];

/** One measurement with its SLA: a row of a category page, or a headline under a status block. */
export interface Member {
    id: MemberId;
    window: MemberWindow;
    state: MemberState;
    /** The value over `window` at range 1 h, or over the picked range at 6 h and 24 h. */
    value: Value;
    /** The 6 h value, the trend, for `1h` and `1h6h` members. */
    value6h?: Value;
    /** Events in the window the value covers; for rates, set beside `minN`. */
    n?: number;
    /** The fewest events the window must hold before the rate is judged (section 4, "Min n"). */
    minN?: number;
    /** How much of the window its source covers, when less than all of it (hours). */
    covered?: { h: number; of: number };
    /** How much of the 6 h window its source covers, when less than all of it (hours). */
    covered6h?: { h: number; of: number };
    /** How many days of a 7- or 28-day window the history covers, when less than all of it (a backfill still running). */
    coveredDays?: { d: number; of: number };
    sla: Sla | null;
    spark?: Spark;
    /** Why it is NO DATA, not set up or idle ("token rejected since 10-24", "#3418"). */
    reason?: Fact;
    /** The facts under the member's definition ("green since 23:06; newest build queued 68 min"). */
    note?: Fact;
    /** When the newest 5-minute bucket recovered, while the member is still past its threshold (3.1). */
    cleared?: Iso;
    /** The pull request that fixes this red member waits on the owner (3.1). */
    fixWaitsOwner?: number;
    /** Where the member is acted on. */
    link: Route;
}

/** A member named in a status block or a page header: the one that set the state, or another not OK. */
export interface MemberRef {
    member: MemberId;
    state: MemberState;
    value: Value;
    /** A short statement when the member's name and value are not enough ("5 PRs red on one check"). */
    fact?: Fact;
}

/** One category on the status line (section 2.2). */
export interface CategoryStatus {
    id: CategoryId;
    state: CategoryState;
    /** The member that set the state; absent when OK. */
    setBy?: MemberRef;
    /** The other members not OK, worst first. */
    others: MemberRef[];
    /** The headline measure under the block (section 2.3). */
    headline: Member;
    /**
     * The member that set the state, as a full row, when it is not the headline: the overview shows it under the
     * block in the headline's place, so the number under a colored block is the one that colored it.
     */
    driver?: Member;
}

/** One episode of the last 24 h: a member that went past its target (section 2.4). */
export interface Episode {
    id: string;
    category: CategoryId;
    member: MemberId;
    /** The worst state the episode reached. */
    worst: "warn" | "bad";
    start: Iso;
    /** `null` while ongoing. */
    end: Iso | null;
    /** The episode began before the history the engine keeps, or at a time it cannot tell: `start` is a bound. */
    startUnknown?: boolean;
    /** What happened: the member, its value and the cause when the collector knows it. */
    fact: Fact;
    link: Route;
}

/** How old one source's newest write is (section 9). */
export interface SourceAge {
    id: SourceId;
    lastWrite: Iso | null;
    /** Yellow at this age, red at twice it; `null` when it is not judged by age. */
    limitS: number | null;
    state: MemberState;
}

export type SourceId =
    | "collector"
    | "ci-results"
    | "ci-timings"
    | "releases"
    | "npm"
    | "stress"
    | "hosts"
    | "billing"
    | "flaky-feed"
    | "benchmarks"
    | "local";

/** `GET /v1/status`: the status line and the last 24 h, whatever range a page shows. */
export interface StatusResponse {
    /** The collector cycle that computed it. The page shows a red banner when it is over 15 min old. */
    generated: Iso;
    categories: CategoryStatus[];
    /** The last 24 h of episodes, ongoing first, then cleared, newest first. */
    episodes: Episode[];
    sources: SourceAge[];
}

/**
 * `GET /v1/page/overview?range=`: the status, with each headline's value and sparkline for the range.
 * The blocks' states never follow the range (section 2.2).
 */
export interface OverviewResponse extends StatusResponse {
    page: "overview";
    range: Range;
    /** Canary, Nightly and Production, in that order; absent from payloads built before the channels were. */
    channels?: ChannelTile[];
}

/** A release channel: canary.graphty.app, nightly.graphty.app, graphty.app. */
export type ChannelId = "canary" | "nightly" | "production";

/**
 * How one release attempt ended: deployed or promoted (`ok`), failed (`bad`), passed but not promoted (`held`, a
 * nightly candidate waiting for screenshot approval), or cancelled.
 */
export type ChannelOutcome = "ok" | "bad" | "held" | "cancelled";

/** One channel's tile on the overview (#4460): its state, what it serves, and its recent release attempts. */
export interface ChannelTile {
    id: ChannelId;
    /** The newest attempt's outcome (held is `warn`); `nodata` when no attempt is recorded. */
    state: "ok" | "warn" | "bad" | "nodata";
    /** The commit the channel serves now; `null` when it is not known. */
    sha: string | null;
    /** When the newest successful attempt deployed or promoted; `null` when none is recorded. */
    at: Iso | null;
    /** Its recent release attempts, oldest first (at most 14). */
    attempts: { at: Iso; outcome: ChannelOutcome; run: number; sha?: string }[];
    link: Route;
}

/** `GET /v1/page/<page>?range=`: one category page, or Runners or Local runs (section 2.6). */
export interface PageResponse {
    page: Exclude<PageId, "overview">;
    range: Range | SlowRange;
    generated: Iso;
    state: CategoryState;
    setBy?: MemberRef;
    others: MemberRef[];
    /** More facts for the page's state sentence ("master is green now, 5 builds queued"). */
    notes: Fact[];
    /** One row per member, in the design's order. Costs has none: its money table is a section. */
    members: Member[];
    sections: Section[];
}

/** `GET /v1/page/<page>/<section>?range=7d|28d`: a slow section at its own window. */
export interface SectionResponse {
    page: Exclude<PageId, "overview">;
    range: SlowRange;
    generated: Iso;
    section: Section;
}

/** Fields every section has. */
interface SectionBase {
    /** The anchor on its page: `/ci/shards` scrolls to section `shards` of page `ci`. */
    id: string;
    /** The facts of its subtitle ("5 failed pull request suites, last 1 h"). */
    sub?: Fact;
    /**
     * The window held too few events, so the section covers a wider one and says so
     * ("only 2 merged in the last 1 h, so the last 6 h").
     */
    widened?: { from: Range; to: Range; n: number; nTo: number };
    /** Facts under the section. */
    notes?: Fact[];
}

export type Section =
    StripSection | TableSection | BarsSection | JobsSection | ShardsSection | TreeSection | EmptySection;

/** A strip by minute: master's state over the range (Master builds). */
export interface StripSection extends SectionBase {
    kind: "strip";
    from: Iso;
    to: Iso;
    /** Contiguous spans; `gray` is a cancel that is not a failure, `pending` the newest build not done. */
    spans: { start: Iso; end: Iso; state: "green" | "red" | "gray" | "pending" }[];
}

/**
 * A table. The page names the table's columns by section id; each row maps a column key to a cell.
 * Tables: master/red, master/shared, pull-requests/owner, runners/superseded, ci/chronic, ci/non-gating,
 * ci/benchmarks, releases/lanes,
 * releases/trains, releases/workflows, costs/money, costs/unit, data-sources/stress,
 * data-sources/sources, data-sources/not-set-up.
 */
export interface TableSection extends SectionBase {
    kind: "table";
    rows: TableRow[];
}

export interface TableRow {
    cells: Record<string, Cell>;
    /** Muted: cleared, skipped or idle. */
    past?: boolean;
    /** The total row of a money table. */
    total?: boolean;
    link?: Route;
}

/** One table cell. */
export type Cell =
    /** An identifier or a name of data: a workflow, a step, a file, a lane, a source. */
    | { t: "name"; v: string; bold?: boolean }
    /** A catalog id the page names: a source, a cost line, a member. */
    | { t: "label"; code: string }
    | { t: "num"; n: number; unit?: Unit; of?: number; bold?: boolean }
    /** A money amount so far against its budget ("129 / 200"). */
    | { t: "budget"; so: number; budget: number | null; unit: Unit }
    | { t: "time"; at: Iso }
    | { t: "span"; start: Iso; end: Iso | null }
    | { t: "dur"; s: number }
    | { t: "ago"; at: Iso }
    | { t: "pr"; n: number }
    | { t: "issue"; n: number }
    | { t: "run"; id: number }
    | { t: "sha"; v: string }
    | { t: "fact"; fact: Fact }
    /** A 4 px mark in a state color before its content (3.2). */
    | { t: "mark"; state: "warn" | "bad"; cell: Cell }
    | { t: "state"; state: MemberState; link?: Route }
    | { t: "spark"; spark: Spark }
    | { t: "list"; items: Cell[]; sep?: "space" | "comma" | "line" }
    /** A cell with a muted second line. */
    | { t: "sub"; main: Cell; sub: Cell }
    | { t: "none" };

/** Sorted bars, in one or more groups (where the time goes, causes, who holds the runners, costs). */
export interface BarsSection extends SectionBase {
    kind: "bars";
    groups: {
        /** The group's heading facts ("running now, 57 jobs"); absent for a single group. */
        head?: Fact;
        items: { label: Cell; detail?: Cell; n: number; unit: Unit; tone?: "bad" | "value" }[];
    }[];
}

/** Running and queued jobs on one count axis, against the plan's limit (Runners). */
export interface JobsSection extends SectionBase {
    kind: "jobs";
    step: "15m" | "1h";
    start: Iso;
    running: number[];
    queued: number[];
    /**
     * Per bucket: the peak running and queued counts, the longest queued job (ms) and the saturated time (ms);
     * null where the collector wrote nothing. The 7 d runner history (`runners/jobs`) is tuned from these.
     */
    runningMax?: (number | null)[];
    queuedMax?: (number | null)[];
    longestQueuedMs?: (number | null)[];
    saturatedMs?: (number | null)[];
    /** The plan's limit, from config (`slas.json`). */
    limit: number;
    /** The observed peak of running jobs: a label beside the limit, never a threshold. */
    peak: { n: number; at: Iso };
    /** The observed peak of queued jobs; absent from payloads built before it was. */
    peakQueued?: { n: number; at: Iso };
}

/** Shard and test-file times (section 6), a slow section. */
export interface ShardsSection extends SectionBase {
    kind: "shards";
    range: SlowRange;
    runKind: "full" | "pr-bins";
    rows: ShardRow[];
    /** Shards not listed, and whether every one of them is within budget. */
    more?: { count: number; allWithin: boolean };
}

export interface ShardRow {
    shard: string;
    /** The job group that runs it ("small-browser"). */
    group?: string;
    runs: number;
    /** Below this many runs the shard is drawn gray and not judged. */
    minRuns: number;
    medianS: number;
    p90S: number;
    budgetS: number;
    /** Its top test files, when the API sends them. */
    files?: { file: string; medianS: number; p90S: number; share: number }[];
    moreFiles?: number;
}

/** Flake hotspots (section 5): a tree of group or family, shard, file, test. A slow section. */
export interface TreeSection extends SectionBase {
    kind: "tree";
    range: SlowRange;
    nodes: TreeNode[];
    /** Groups and families with no flaky test in the range. */
    quiet: number;
}

export interface TreeNode {
    level: "group" | "family" | "shard" | "file" | "test";
    name: string;
    /** Catalog facts about the node: a job group's shard count, GPU, screenshots, unstable, its issue. */
    tags?: Fact[];
    distinct: number;
    events: number;
    /** `null` where runs are not counted at that level. */
    per1000: number | null;
    /** `null` until a writer reports it (the flaky feed): never drawn as 0. */
    quarantined: number | null;
    /** `null` until a writer reports it (the flaky feed): never drawn as 0. */
    prsHeld: number | null;
    /** A test's history: `/flaky/test?file=...&test=...`. */
    link?: Route;
    children?: TreeNode[];
}

/** A section that states an absence ("no quarantine entries"). */
export interface EmptySection extends SectionBase {
    kind: "empty";
    fact: Fact;
}

/** `GET /v1/test-history`: one test's (or file's) flaky and failed results, newest first. */
export interface TestHistoryResponse {
    generated: Iso;
    range: SlowRange;
    file: string;
    test?: string;
    family: string;
    issue?: number;
    events: {
        at: Iso;
        kind: "pr" | "full" | "local";
        pr?: number;
        run: number;
        attempt: number;
        sha: string;
        outcome: "flaky" | "failed" | "failed-rerun" | "passed";
        /** A short, truncated failure signature. */
        signature?: string;
    }[];
}

/** `GET /v1/run/<run id>`: one workflow run with its jobs. */
export interface RunResponse {
    generated: Iso;
    id: number;
    repo: string;
    workflow: string;
    event: string;
    sha: string;
    pr?: number;
    attempt: number;
    created: Iso;
    conclusion: "success" | "failure" | "cancelled" | "timed_out" | "startup_failure" | null;
    /** How a cancel is classified (section 4): from GitHub's record, never from timing. */
    cancel?: "superseded" | "by-hand" | "other";
    jobs: { name: string; conclusion: string | null; created: Iso; started: Iso | null; completed: Iso | null }[];
}

/** The live health API, the page's data source unless VITE_HEALTH_API_URL names another. */
export const LIVE_API = "https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com";

/**
 * The dev server's same-origin path to the API (vite.config.ts proxies it), so a dev server on any host
 * reads the live data without that host being on the API's CORS list.
 */
export const DEV_API_PATH = "/health-api";

/** The path of an API route, relative to the API base. */
export function apiPath(
    route:
        | { kind: "status" }
        | { kind: "page"; page: PageId; range: Range | SlowRange }
        | { kind: "section"; page: Exclude<PageId, "overview">; section: string; range: SlowRange; runKind?: string }
        | { kind: "test-history"; file: string; test?: string; range: SlowRange }
        | { kind: "run"; id: number },
): string {
    switch (route.kind) {
        case "status":
            return "/v1/status";
        case "page":
            return `/v1/page/${route.page}?range=${route.range}`;
        case "section":
            return (
                `/v1/page/${route.page}/${route.section}?range=${route.range}` +
                (route.runKind ? `&kind=${route.runKind}` : "")
            );
        case "test-history": {
            const q = new URLSearchParams({ file: route.file, range: route.range });
            if (route.test) q.set("test", route.test);
            return `/v1/test-history?${q.toString()}`;
        }
        case "run":
            return `/v1/run/${route.id}`;
    }
}
