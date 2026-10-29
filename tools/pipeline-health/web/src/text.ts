/**
 * Every word the page shows: member names and definitions, labels, and the sentences for each
 * {@link Fact} code of the view contract. Functions return HTML; every value from the API passes
 * through `esc` (or a formatter that calls it) before it reaches the page.
 */
import type {
    CategoryId,
    ChannelId,
    ChannelOutcome,
    Cmp,
    Fact,
    Iso,
    Member,
    MemberId,
    MemberState,
    Param,
    Range,
    Sla,
    SlowRange,
    Unit,
    Value,
} from "./contract";

export const REPO = "https://github.com/graphty-org/graphty-monorepo";

export function esc(s: unknown): string {
    return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// ---------------------------------------------------------------- clock

/** The page's notion of now: the real clock, or the fixture's clock in fixture mode. */
export const clock = { now: (): number => Date.now(), generated: "" };

// ---------------------------------------------------------------- numbers and times

export function fmtN(n: number): string {
    const abs = Math.abs(n);
    const digits = Number.isInteger(n) || abs >= 1000 ? 0 : abs >= 10 ? 1 : abs >= 0.1 ? 2 : 3;
    const s = n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
    return s;
}

/** A unit after a number: inline ("49%", "24 min") or as the small suffix of a big value. */
const UNIT: Record<Unit, string> = {
    pct: "%",
    ratio: "",
    x: "x",
    ms: " ms",
    s: " s",
    min: " min",
    h: " h",
    d: " d",
    usd: " USD",
    count: "",
    jobs: " jobs",
    per1000: "",
};

export function fmtUnit(n: number, unit?: Unit): string {
    if (unit === "jobs") return `${fmtN(n)} ${n === 1 ? "job" : "jobs"}`;
    if (unit === "x") return `${n.toFixed(1)}x`;
    return fmtN(n) + (unit ? UNIT[unit] : "");
}

const WORD = { passed: "passed", failed: "failed", yes: "yes", no: "no", filed: "filed", skipped: "skipped" } as const;

/** A value inline ("40%", "filed 0", "1 of 8", "--"). */
export function fmtValue(v: Value): string {
    if (v === null) return "--";
    if ("word" in v) return WORD[v.word] + (v.n === undefined ? "" : ` ${fmtN(v.n)}`);
    const sign = v.signed && v.n > 0 ? "+" : "";
    let s = sign + fmtUnit(v.n, v.unit);
    if (v.of !== undefined) s += ` of ${fmtN(v.of)}`;
    if (v.ago) s += " ago";
    return esc(s);
}

/** A value as a big number with its unit small after it (the mockup's `40<small> %</small>`). */
export function bigValue(v: Value): string {
    if (v === null) return "--";
    if ("word" in v) return esc(WORD[v.word]) + (v.n === undefined ? "" : ` ${fmtN(v.n)}`);
    const sign = v.signed && v.n > 0 ? "+" : "";
    const n = v.unit === "x" ? v.n.toFixed(1) : fmtN(v.n);
    const unit = v.unit === "x" ? " x" : v.unit === "pct" ? " %" : v.unit && v.unit !== "count" ? UNIT[v.unit] : "";
    const rest = (unit ? unit : "") + (v.of !== undefined ? ` of ${fmtN(v.of)}` : "") + (v.ago ? " ago" : "");
    return `${sign}${n}${rest ? `<small>${esc(rest)}</small>` : ""}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "23:06", or "10-24 19:25" when not the same UTC day as the data. */
export function fmtTime(at: Iso): string {
    const d = new Date(at);
    const ref = new Date(clock.generated || clock.now());
    const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    return d.toISOString().slice(0, 10) === ref.toISOString().slice(0, 10)
        ? hm
        : `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${hm}`;
}

export function fmtSpan(start: Iso, end: Iso | null): string {
    return `${fmtTime(start)} - ${end ? fmtTime(end) : "now"}`;
}

/** "20 s", "44 min", "1.9 h", "8 d". */
export function fmtDur(s: number): string {
    if (s < 60) return `${Math.round(s)} s`;
    if (s < 90 * 60) return `${Math.round(s / 60)} min`;
    if (s < 48 * 3600) return `${fmtN(Math.round((s / 3600) * 10) / 10)} h`;
    return `${fmtN(Math.round((s / 86400) * 10) / 10)} d`;
}

export function fmtAgo(at: Iso): string {
    return `${fmtDur(Math.max(0, (clock.now() - Date.parse(at)) / 1000))} ago`;
}

export const rangeLabel = (r: Range | SlowRange): string => r.replace(/(\d+)/, "$1 ");

// ---------------------------------------------------------------- links

export const prLink = (n: number) => `<a class="ln" href="${REPO}/pull/${n}">#${n}</a>`;
export const issueLink = (n: number) => `<a class="ln" href="${REPO}/issues/${n}">#${n}</a>`;
export const runLink = (id: number) => `<a class="ln" href="${REPO}/actions/runs/${id}">${id}</a>`;
export const shaLink = (sha: string) => `<a class="ln" href="${REPO}/commit/${esc(sha)}">${esc(sha)}</a>`;

/** "a", "a and b", "a, b and c". */
export function and(items: string[]): string {
    return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// ---------------------------------------------------------------- states

export const STATE_WORD: Record<"ok" | "warn" | "bad" | "nodata" | "idle", string> = {
    ok: "OK",
    warn: "WARNING",
    bad: "FAILING",
    nodata: "NO DATA",
    idle: "IDLE",
};

/** The CSS class of a state's fill. */
export function stateClass(s: MemberState | "idle"): string {
    return s === "ok" ? "ok" : s === "warn" ? "warn" : s === "bad" ? "bad" : s === "nodata" ? "none" : "idle";
}

/** True when the member is out of the rollup and drawn muted. */
export const isMuted = (s: MemberState) =>
    s === "few" || s === "partial" || s === "idle" || s === "slow" || s === "notsetup" || s === "info";

/**
 * True when a "few" member shows its value at the picked range: a 1 h member's "few" is judged on the last 1 h,
 * while at 6 h and 24 h its value and n cover the picked range, so that value stands once n reaches minN.
 */
export function showsRangeValue(
    m: Pick<Member, "n" | "minN"> & Partial<Pick<Member, "window" | "value">>,
    range: Range | SlowRange | undefined,
): boolean {
    return (
        range !== undefined &&
        range !== "1h" &&
        (m.window === "1h" || m.window === "1h6h") &&
        m.value !== null &&
        m.value !== undefined &&
        (m.n ?? 0) >= (m.minN ?? 0)
    );
}

/** The state cell of a member row: a chip for a judged state not OK, muted words for the gray ones. */
export function stateChip(
    m: Pick<Member, "state" | "n" | "minN" | "covered"> & Partial<Pick<Member, "window" | "value" | "coveredDays">>,
    range?: Range | SlowRange,
): string {
    switch (m.state) {
        case "ok":
        case "info":
            return "";
        case "warn":
        case "bad":
        case "nodata":
            return `<span class="sw ${stateClass(m.state)}">${STATE_WORD[m.state]}</span>`;
        case "few":
            if (showsRangeValue(m, range)) return "";
            return `<span class="sw low">too few, n=${fmtN(m.n ?? 0)} of ${fmtN(m.minN ?? 0)}</span>`;
        case "partial":
            return `<span class="sw low">partial window, ${fmtN(m.covered?.h ?? 0)} h of ${fmtN(m.covered?.of ?? 1)}</span>`;
        case "idle":
            return `<span class="sw low">n=0</span>`;
        case "slow":
            return m.coveredDays
                ? `<span class="sw low">slow measure, covers ${fmtN(m.coveredDays.d)} of ${fmtN(m.coveredDays.of)} days</span>`
                : `<span class="sw low">slow measure</span>`;
        case "notsetup":
            return `<span class="sw low">not set up</span>`;
    }
}

// ---------------------------------------------------------------- release channels

/** The overview's release channel tiles: the heading, each channel's name and how its attempts read. */
export const CHANNELS_HEAD = "Releases";
export const CHANNELS_SUB = "what each channel serves; each dot a release attempt, oldest to newest";

export const CHANNEL: Record<ChannelId, { name: string; ok: string; none: string }> = {
    canary: { name: "Canary", ok: "deployed", none: "no deploys recorded" },
    nightly: { name: "Nightly", ok: "promoted", none: "no promotions recorded" },
    production: { name: "Production", ok: "promoted", none: "no promotions recorded" },
};

const OUTCOME: Record<Exclude<ChannelOutcome, "ok">, string> = {
    bad: "failed",
    held: "passed, not promoted",
    cancelled: "cancelled",
};

/** "deployed 42 min ago", or "no deploys recorded". */
export const channelSince = (id: ChannelId, at: Iso | null): string =>
    at ? `${CHANNEL[id].ok} ${fmtAgo(at)}` : CHANNEL[id].none;

/** One attempt's dot title: "19:20: failed, 3f2a91c". */
export const attemptText = (id: ChannelId, a: { at: Iso; outcome: ChannelOutcome; sha?: string }): string =>
    `${fmtTime(a.at)}: ${a.outcome === "ok" ? CHANNEL[id].ok : OUTCOME[a.outcome]}${a.sha ? `, ${esc(a.sha.slice(0, 7))}` : ""}`;

/** The dot row's label for a screen reader. */
export const attemptsLabel = (n: number): string =>
    n ? `last ${n} release ${n === 1 ? "attempt" : "attempts"}, oldest first` : "no release attempts recorded";

// ---------------------------------------------------------------- catalog

export const CATEGORY_NAME: Record<CategoryId, string> = {
    master: "Master",
    "pull-requests": "Pull requests",
    ci: "CI",
    flaky: "Flaky tests",
    releases: "Releases",
    costs: "Costs",
    "data-sources": "Data sources",
};

interface MemberText {
    /** The row's name. */
    name: string;
    /** In a status block or a page sentence ("runner wait p90"). */
    short: string;
    /** The one-line definition under the name. */
    def: string;
    /** What n counts ("jobs"). */
    nOf?: string;
    /** The headline's name under a status block, when it differs. */
    headline?: string;
}

export const MEMBER: Record<MemberId, MemberText> = {
    "master.red_now": { name: "Red now", short: "red now", def: "length of the current red span" },
    "master.green_time": {
        name: "Green time",
        short: "green time",
        def: "share of the last hour green; cancels are red unless superseded or by hand",
    },
    "master.same_check": {
        name: "Red on the same check",
        short: "red on the same check",
        def: "most open pull requests failing one check or family",
    },
    "master.full_run_verdict": {
        name: "Last full-run verdict",
        short: "last full-run verdict",
        def: "ci lane of the newest judged candidate",
    },
    "master.untested_age": {
        name: "Untested master age",
        short: "untested master age",
        def: "age of the oldest master commit no full run has judged",
    },
    "master.reverts": { name: "Reverts", short: "reverts", def: "reverted merges / merges" },
    "pull-requests.time_to_merge": {
        name: "Time to merge",
        short: "time to merge",
        def: "median, ready to merged, owner waits left out",
        nOf: "merged",
    },
    "pull-requests.open": {
        name: "Open pull requests",
        short: "open pull requests",
        def: "not draft, not waiting on the owner",
    },
    "pull-requests.oldest_open": { name: "Oldest open", short: "oldest open", def: "not waiting on the owner" },
    "pull-requests.merge_ratio": { name: "Merge ratio", short: "merge ratio", def: "merged / created", nOf: "created" },
    "pull-requests.caused_failures": {
        name: "Runs failed by their change",
        short: "runs failed by their change",
        def: "first runs red on a test the change touched, 7 d",
        nOf: "runs",
    },
    "pull-requests.automerge_green_stuck": {
        name: "Green but not merging",
        short: "green but not merging",
        def: "auto-merge armed, green, unmerged 2 h",
    },
    "pull-requests.automerge_armed_long": {
        name: "Armed too long",
        short: "armed too long",
        def: "auto-merge armed 24 h",
    },
    "pull-requests.screenshot_backlog": {
        name: "Screenshot backlog",
        short: "screenshot backlog",
        def: "oldest pictures waiting for the owner",
    },
    "ci.runner_wait": {
        name: "Runner wait",
        short: "runner wait p90",
        def: "p90, organization",
        nOf: "jobs",
        headline: "Runner wait p90",
    },
    "ci.longest_queued": {
        name: "Longest queued now",
        short: "longest queued now",
        def: "oldest queued job, or queued run with no job yet",
    },
    "ci.saturated": {
        name: "Saturated time",
        short: "saturated",
        def: "minutes running within 3 of the limit, jobs queued",
    },
    "ci.not_assigned": {
        name: "Runners not being assigned",
        short: "runners not being assigned",
        def: "jobs wait with room to run; githubstatus.com",
    },
    "ci.first_attempt": {
        name: "First-attempt pass rate",
        short: "first-attempt pass rate",
        def: "pull request check suites",
        nOf: "suites",
    },
    "ci.hangs": { name: "Hangs", short: "hangs", def: "jobs ended at their own timeout" },
    "ci.pr_duration": {
        name: "PR check duration",
        short: "PR check duration",
        def: "median run / its kind's budget",
        nOf: "runs",
    },
    "ci.bins_over": {
        name: "Pull request bins over 8 min",
        short: "bins over 8 min",
        def: "packing target",
        nOf: "bins",
    },
    "ci.reruns": { name: "Reruns", short: "reruns", def: "attempts above 1 / runs", nOf: "runs" },
    "ci.shards_over": {
        name: "Full-run shards over budget",
        short: "shards over budget",
        def: "medians past their budget",
    },
    "ci.runner_minutes": {
        name: "Runner-minutes per merge",
        short: "runner-minutes per merge",
        def: "job minutes, every run kind, / pull requests merged into master; slow measure, 7 d",
        nOf: "merged",
    },
    "ci.superseded": {
        name: "Superseded runs running",
        short: "superseded runs running",
        def: "no cancel-in-progress; not judged yet",
    },
    "ci.chronic_jobs": {
        name: "Chronically failing jobs",
        short: "chronically failing jobs",
        def: "failed in half of their last 10 runs, or not passed in 3 days; gating or not; red with no open issue",
    },
    "ci.bench_regressions": {
        name: "Benchmark regressions",
        short: "benchmark regressions",
        def: "median of the last 3 results over 1.2x the median of the 10 before",
    },
    "flaky.blocked": {
        name: "Blocked by a flake",
        short: "blocked by a flake",
        def: "newest failure flaky, or an unstable story",
    },
    "flaky.no_issue": {
        name: "Flaky in CI with no open issue",
        short: "flaky with no issue",
        def: "seen flaky in CI in 7 d; the drill-down drafts the issue",
    },
    "flaky.flake_rate": {
        name: "Flake rate",
        short: "flake rate",
        def: "per 1,000 test-file runs, CI",
        nOf: "test-file runs",
    },
    "flaky.net_new": { name: "Net new flaky", short: "net new flaky", def: "newly flaky minus resolved" },
    "flaky.detected_to_fixed": { name: "Detected to fixed", short: "detected to fixed", def: "median" },
    "releases.lanes_red": {
        name: "Lanes red on the candidate",
        short: "lanes red",
        def: "newest candidate a full train tested",
        headline: "Release lanes red",
    },
    "releases.workflows_failing": {
        name: "Release workflows failing",
        short: "release workflows failing",
        def: "newest run failed",
    },
    "releases.train_skipped": {
        name: "Train skipped a new commit",
        short: "train skipped a new commit",
        def: "the newest attempt skipped every lane",
    },
    "releases.tagged_not_npm": {
        name: "Tagged, not on npm",
        short: "tagged, not on npm",
        def: "tag time vs npm's time",
    },
    "releases.train_first_pass": {
        name: "Train first-attempt pass",
        short: "train first-attempt pass",
        def: "attempts that tested",
    },
    "releases.channels": { name: "Channel members", short: "channel members", def: "canary, nightly, production" },
    "costs.spend": {
        name: "Spend this month",
        short: "spend",
        def: "projected sum of every money line",
        headline: "Spend projected",
    },
    "costs.t4": { name: "T4 GPU", short: "T4 GPU", def: "projected, machine.dev" },
    "costs.llm": { name: "LLM regression", short: "LLM regression", def: "projected, Gemini" },
    "costs.aws": { name: "AWS", short: "AWS", def: "month to date, Cost Explorer" },
    "costs.cloudflare_usage": {
        name: "Cloudflare usage",
        short: "Cloudflare usage",
        def: "usage / the plan's allowance",
    },
    "costs.sentry_usage": { name: "Sentry usage", short: "Sentry usage", def: "events / the plan's quota" },
    "data-sources.stress_run": {
        name: "Stress run",
        short: "stress run",
        def: "read from GitHub's job and step results",
    },
    "data-sources.past_age": {
        name: "Sources past their age limit",
        short: "sources past their age limit",
        def: "sources past their limit",
    },
    "data-sources.thin": {
        name: "Sources thin for their activity",
        short: "sources thin",
        def: "rows per run, last 1 h, against the 7 d median",
        nOf: "runs",
    },
    "data-sources.collector": {
        name: "Collector",
        short: "collector",
        def: "last run; a CloudWatch alarm watches it too",
    },
    "data-sources.app_rate": {
        name: "GitHub App rate limit",
        short: "GitHub App rate limit",
        def: "requests left this hour",
    },
    "data-sources.write_budget": {
        name: "Daily write budget",
        short: "daily write budget",
        def: "rows today / the daily limit",
    },
    "data-sources.sources_not_ok": {
        name: "Sources not OK",
        short: "sources not OK",
        def: "sources past their age limit, thin or failing",
    },
    "local-runs.local_vs_ci": {
        name: "Local vs CI disagreement",
        short: "local vs CI disagreement",
        def: "same shard and inputs, different outcome",
    },
    "local-runs.shard_time": {
        name: "Local shard time",
        short: "local shard time",
        def: "median of local shard runs, minutes",
    },
    "local-runs.slot_waits": { name: "Slot waits", short: "slot waits", def: "p90 wait for a test slot" },
};

/** Catalog labels the API sends as `{ t: "label" }` cells. */
export const LABEL: Record<string, string> = {
    "stage.runners": "waiting for runners",
    "stage.checks": "checks running",
    "stage.red": "red and being fixed",
    "stage.merging": "green to merged",
    "cause.shared_check": "shared: the same check in 3 or more pull requests",
    "cause.shared_aggregator": "shared: an aggregator failing alone",
    "cause.change": "the change itself",
    "cause.flaky": "flaky",
    "cause.infrastructure": "infrastructure",
    "cost.t4": "T4 GPU",
    "cost.llm": "LLM regression",
    "cost.sentry": "Sentry",
    "cost.github": "GitHub",
    "cost.cloudflare": "Cloudflare",
    "cost.aws": "AWS",
    "cost.total": "<b>Total</b>",
    "cost.sentry_usage": "Sentry usage",
    "cost.cloudflare_usage": "Cloudflare usage",
    "load.pr": "Pull request runs",
    "load.master": "Master push builds",
    "load.full": "Full runs",
    "load.other": "Other",
    "load.total": "<b>Total</b>",
    "unit.train": "Money per release train",
    "unit.pr_value": "GitHub Actions list-price value per merged pull request",
    "source.collector": "Collector",
    "source.ci-results": "CI test results",
    "source.ci-timings": "CI timings",
    "source.releases": "Release records",
    "source.npm": "npm",
    "source.stress": "Weekly stress run",
    "source.hosts": "Host matrix",
    "source.billing": "Billing: AWS, T4 rates",
    "source.flaky-feed": "Feed of CI's flaky detections",
    "source.benchmarks": "Benchmark results",
    "source.local": "Local writer",
    "source.release": "Release records",
    "source.coverage": "Coverage (Coveralls)",
    "member.releases.channels": "Channel members",
    "page.costs": "Costs",
    "page.flaky": "Flaky tests",
    "page.releases": "Releases",
};

const LANE: Record<string, [string, string]> = {
    audit: ["audit", "Security audit"],
    t4: ["T4", "T4 GPU"],
    ci: ["ci", "CI"],
    hosts: ["hosts", "Host matrix"],
    autosave_macos: ["autosave", "Work protection (macOS)"],
    llm: ["LLM", "LLM regression"],
};
const lane = (id: string, long = false) => esc(LANE[id]?.[long ? 1 : 0] ?? id);
const SOURCE: Record<string, string> = {
    billing: "billing",
    collector: "the collector",
    npm: "npm",
    release: "the release collector",
    "ci-results": "CI test results",
    coverage: "coverage",
    local: "the local writer",
    stress: "the weekly stress run",
    hosts: "the host matrix",
    benchmarks: "CI's benchmark jobs",
};

// ---------------------------------------------------------------- SLAs

const OP: Record<Cmp["op"], string> = { "<=": "&lt;=", "<": "&lt;", ">=": "&gt;=", ">": "&gt;", "==": "" };

function cmpText(c: Cmp, withUnit: boolean): string {
    const n =
        c.unit === "x"
            ? `${fmtN(c.n)}x`
            : withUnit
              ? fmtUnit(c.n, c.unit === "per1000" ? undefined : c.unit)
              : fmtN(c.n);
    return OP[c.op] ? `${OP[c.op]} ${esc(n)}` : esc(n);
}

const isCmp = (x: Cmp | Fact): x is Cmp => "op" in x;

/** "target <= 5 min, red > 15", or the target alone (the front page). */
export function slaText(sla: Sla | null, targetOnly = false): string {
    if (!sla) return "informational until it fires";
    const target = isCmp(sla.target) ? cmpText(sla.target, true) : sentence(sla.target);
    if (targetOnly || !sla.red) return `target ${target}`;
    const red = isCmp(sla.red) ? cmpText(sla.red, false) : sentence(sla.red);
    return `target ${target}, red ${red}${sla.needs6h ? ", 6 h too" : ""}`;
}

// ---------------------------------------------------------------- sentences

type P = Record<string, Param>;
const num = (p: P, k: string): number => Number(p[k] ?? 0);
const str = (p: P, k: string): string => esc(p[k] ?? "");
const arr = (p: P, k: string): (string | number)[] => (Array.isArray(p[k]) ? [...(p[k] as (string | number)[])] : []);
const at = (p: P, k: string): string => (typeof p[k] === "string" ? fmtTime(p[k] as string) : "");
const plural = (n: number, one: string, many = `${one}s`) => `${fmtN(n)} ${n === 1 ? one : many}`;

const S: Record<string, (p: P) => string> = {
    // short forms in a status block
    "short.same_check": (p) => `${plural(num(p, "prs"), "PR")} red on one check`,
    "short.blocked": (p) => `${plural(num(p, "prs"), "pull request")} held by a flake`,
    "short.no_issue": (p) => `${fmtN(num(p, "tests"))} flaky with no issue`,
    "short.lanes_red": (p) => `${and(arr(p, "lanes").map((l) => lane(String(l))))} red`,
    "short.stress_filed": (p) => `stress run filed ${fmtN(num(p, "filed"))} of ${fmtN(num(p, "failures"))}`,
    "short.nodata": (p) => (p.reason === "billing_late" ? "billing data late" : "a source stopped"),

    // SLA thresholds that are not plain comparisons
    "sla.red_now": () => "&gt;= 15 min or 2 builds",
    "sla.blocked": () => "&gt;= 3 or any &gt;= 24 h",
    "sla.any_no_issue": () => "any with no open issue",
    "sla.lanes_open": (p) => `open &gt;= ${fmtN(num(p, "h"))} h`,
    "sla.failed_in_a_row": (p) => `${fmtN(num(p, "runs"))} failed in a row`,
    "sla.word": (p) => str(p, "word"),
    "sla.after": (p) => `after ${fmtN(num(p, "min"))} min`,
    "sla.passed_and_filed": () => "passed and filed",
    "sla.filing_failed": () => "filing failed",
    "sla.past_2x": () => "any past 2x",
    "sla.under_pct": (p) => `under ${fmtN(num(p, "pct"))}%`,
    "sla.canary_age": (p) => `canary age &lt; ${fmtN(num(p, "h"))} h`,

    // episodes
    "ep.shared_check": (p) =>
        `${str(p, "check")}${p.step ? ` (${str(p, "step")})` : ""} is red in ${plural(num(p, "prs"), "open pull request")}` +
        (arr(p, "suspects").length
            ? `; suspects ${arr(p, "suspects")
                  .map((n) => `#${n}`)
                  .join(", ")}`
            : ""),
    "ep.saturated": (p) =>
        `Runners saturated: ${fmtN(num(p, "running"))} of ${fmtN(num(p, "limit"))} jobs running, ${fmtN(num(p, "queued"))} queued, master builds queued ${fmtN(num(p, "master_queued_min"))} min`,
    "ep.flaky_held": (p) =>
        `${arr(p, "tests").length} flaky stories hold ${plural(num(p, "prs"), "pull request")}: ${and(arr(p, "tests").map(esc))}`,
    "ep.lanes_red": (p) =>
        `${and(arr(p, "lanes").map((l) => lane(String(l), true)))} red on candidate ${str(p, "sha")}${p.shadow ? "; shadow mode opened no hold" : ""}`,
    "ep.workflow_failing": (p) =>
        `${str(p, "workflow")} fails on every push to master, ${fmtN(num(p, "runs"))} runs` +
        (p.fix ? `; fix #${num(p, "fix")}${p.fix_waits_owner ? " waits on the owner" : ""}` : ""),
    "ep.train_skipped": (p) => `The ${at(p, "attempt")} train skipped every lane on new master commit ${str(p, "sha")}`,
    "ep.stress_filing": (p) =>
        `The weekly stress run filed ${fmtN(num(p, "filed"))} issues: ${fmtN(num(p, "failures"))} failures, over its cap of ${fmtN(num(p, "cap"))}`,
    "ep.no_green": (p) =>
        `No green master build for ${fmtN(num(p, "h"))} h: ${fmtN(num(p, "builds"))} builds cancelled when Build hung in ${str(p, "step")}`,
    "ep.aggregator_alone": (p) =>
        `${str(p, "check")} crashed alone in ${plural(num(p, "prs"), "pull request")}: "${str(p, "signature")}"`,

    // member notes
    "master.green_time.def": () => MEMBER["master.green_time"].def,
    "master.red_now.note": (p) =>
        `green since ${at(p, "green_since")}; newest build queued ${fmtN(num(p, "queued_min"))} min`,
    "master.verdict.note": (p) => `${str(p, "lane")} lane, candidate ${str(p, "sha")}, ${at(p, "at")}`,
    "master.untested.note": (p) => `the ${at(p, "attempt")} train skipped new commit ${str(p, "sha")}`,
    "ci.runner_wait.def": () => "p90, job start minus created",
    "ci.longest_queued.note": () => "a master build run, no job yet",
    "flaky.flake_rate.note": (p) => `results since ${at(p, "since")}`,
    "flaky.net_new.note": (p) => `${fmtN(num(p, "added"))} new, ${fmtN(num(p, "resolved"))} resolved`,
    "releases.workflows.note": (p) => `newest run failed: ${str(p, "workflow")}, ${fmtN(num(p, "runs"))} in a row`,
    "releases.skipped.note": (p) => `${at(p, "attempt")} attempt, ${str(p, "sha")} untested`,
    "data.past_age.note": (p) =>
        `${fmtN(num(p, "judged"))} judged; ${fmtN(num(p, "idle"))} idle, ${fmtN(num(p, "notsetup"))} not set up`,
    "data.write_budget.note": (p) => `rows today / ${fmtN(num(p, "limit"))}`,

    // reasons
    "unblock.channels": (p) => `the release channels, ${issueLink(num(p, "issue"))}`,
    "unblock.cloudflare_token": () => "the owner: a read-only Cloudflare token (Account Analytics, Billing: Read)",
    "unblock.sentry_token": () => "the owner: a read-only Sentry token (org:read)",
    "unblock.flaky_feed": () => "its issue, opened in rollout step 2",
    "nodata.source_late": (p) =>
        `${esc(SOURCE[String(p.source)] ?? p.source)} has not written for ${fmtN(num(p, "h"))} h`,
    "nodata.token_rejected": (p) => `token rejected since ${at(p, "since")}`,
    "nodata.source_error": (p) =>
        `${esc(SOURCE[String(p.source)] ?? p.source)} failing since ${at(p, "since")}: ${str(p, "error")}`,
    "reason.no_write": (p) => `${esc(SOURCE[String(p.source)] ?? p.source)} has not written yet`,
    "reason.not_set_up": (p) => `${esc(SOURCE[String(p.source)] ?? p.source)} has no writer yet`,
    "reason.idle": (p) => `${esc(SOURCE[String(p.source)] ?? p.source)} is idle by design`,
    "reason.stale": (p) => `${esc(SOURCE[String(p.source)] ?? p.source)} stopped writing`,
    "reason.error": (p) => `${esc(SOURCE[String(p.source)] ?? p.source)} is failing`,
    "reason.thin": (p) => `${esc(SOURCE[String(p.source)] ?? p.source)} sends less than usual for its activity`,
    "reason.no_value": () => "no value in the window",
    "section.no_detail": () => "Not collected yet: no writer records this detail.",
    "section.no_events": () => "Nothing recorded in this range.",
    "master.no_red_span": () => "No red span in the range.",
    "master.no_shared": () => "No check failing in 3 or more pull requests in the last 24 h.",
    "runners.no_holders": () => "No job running or queued now.",
    "runners.no_superseded": () => "No superseded run still running.",
    "ci.no_chronic": () => "No job is failing chronically.",
    "ci.no_pass": (p) => `none in ${fmtN(num(p, "days"))} d`,
    "ci.no_issue": () => "no open issue",
    "ci.no_benchmarks": () => "No benchmark results posted yet.",
    "data.all_set_up": () => "Every member has a writer.",
    // "out of target", not "past its threshold": several member names already say "past" (sources past their age limit).
    "ep.past_threshold": (p) =>
        `${esc(MEMBER[String(p.member) as MemberId]?.short ?? p.member)} out of target` +
        (p.peak === undefined ? "" : `, peak ${fmtUnit(num(p, "peak"), p.unit as Unit | undefined)}`),

    // page notes
    "master.note.queued": (p) =>
        `Master is green now, but ${plural(num(p, "builds"), "newer build")} ${num(p, "builds") === 1 ? "is" : "are"} still queued, the oldest for ${fmtN(num(p, "oldest_min"))} min.`,
    "prs.note.few": (p) =>
        `Time to merge and merge ratio had too few pull requests in the last hour to judge (${fmtN(num(p, "merged"))} merged, ${fmtN(num(p, "created"))} created), so they are gray with their 6 h values.`,
    "prs.note.owner": () => "The pull requests waiting on the owner are listed below and left out of the times.",
    "ci.note.hangs_cleared": (p) => `Hangs have cleared: none in the last hour, ${fmtN(num(p, "h6"))} in 6 h.`,
    "runners.note.master_queued": (p) =>
        `${plural(num(p, "builds"), "master build")} wait in the same queue as runs with no job yet, the oldest for ${fmtN(num(p, "oldest_min"))} min.`,
    "local.note.idle": (p) =>
        `No local gate has run since ${str(p, "since")}: pull requests are opened with tools/pr-open.sh, which skips it. These members are left out of the rollup until local shard runs happen again.`,
    "flaky.note.judged_again": (p) =>
        `The flake rate is judged again: the last hour is fully covered by per-test results, which began at ${at(p, "since")}.`,
    "releases.note.shadow": () => "Shadow mode opens no hold issue; the lanes are read from job results.",
    "data.note.notsetup": (p) =>
        `${plural(num(p, "n"), "member")} ${num(p, "n") === 1 ? "has" : "have"} no writer or token yet; they are listed at the end, out of the status.`,
    "costs.note.notsetup": () =>
        "Sentry and Cloudflare usage are not set up (no read-only token yet) and are left out.",
    "costs.note.nodata": (p) =>
        `${esc(SOURCE[String(p.source)] ?? p.source)} has not written for ${fmtN(num(p, "h"))} h, so the money lines it feeds show NO DATA, never zero.`,

    // master tables
    "master.span.cleared": (p) =>
        `${fmtN(num(p, "h"))} h, cleared ${typeof p.cleared === "string" ? fmtAgo(p.cleared) : ""}`,
    "master.span.gray": () => "gray, not red",
    "master.builds.cancelled": (p) => `${fmtN(num(p, "n"))} cancelled`,
    "master.builds.passed": (p) => `${str(p, "sha")} passed ${at(p, "at")}`,
    "master.builds.by_hand": (p) => `${fmtN(num(p, "n"))} cancelled by hand`,
    "cause.step_hang": (p) =>
        `${str(p, "job")} hung in <i>${str(p, "step")}</i> in every build from ${at(p, "from")} to ${at(p, "to")}; ${fmtN(num(p, "timeouts"))} jobs ended at their ${fmtN(num(p, "timeout_min"))} min timeout (hangs). None was superseded or cancelled by hand, so all are red.` +
        (p.guard_pr ? ` master-guard raised no alarm until ${prLink(num(p, "guard_pr"))} (${at(p, "guard_at")}).` : ""),
    "cause.cancelled_by_hand": (p) =>
        `cancelled together at ${at(p, "at")} to free runners; the run's cancel actor is a person`,
    "cause.signature": (p) => `"${str(p, "signature")}"`,
    "cause.unknown": () => "cause not recorded",
    "cause.workflow_error": (p) =>
        `workflow error: ${str(p, "detail")}` +
        (p.fix
            ? `; fix ${prLink(num(p, "fix"))}${p.waits_owner_s ? ` waits on the owner (code owners), ${fmtDur(num(p, "waits_owner_s"))}` : ""}`
            : ""),
    "check.family": (p) => `family of ${fmtN(num(p, "bins"))} bins`,
    "check.failed_alone": () => "failed alone",
    suspect: (p) => `${prLink(num(p, "pr"))} ${str(p, "title")}`,
    "fix.merged": (p) => `${prLink(num(p, "pr"))} merged ${at(p, "at")}`,
    "fix.open": (p) => `${prLink(num(p, "pr"))} fix open`,
    "fix.issue_open": (p) => `${issueLink(num(p, "issue"))} open`,

    // pull requests
    "owner.why": (p) =>
        `touches ${and(arr(p, "paths").map((x) => esc(x) + (x === ".github/" ? " (code owners)" : "")))}`,
    "owner.breaking": () => "breaking change",
    "owner.label": (p) => `label ${str(p, "label")}`,
    "owner.fixes": (p) => `fixes Releases: ${str(p, "workflow")} failing`,

    // CI and runners
    "runner_minutes.sub": (p) =>
        `slow measure; ${plural(num(p, "day"), "merge")} in 24 h, ${plural(num(p, "week"), "merge")} in 7 d`,
    "ci.causes.sub": (p) => `${plural(num(p, "suites"), "failed pull request suite")}`,
    "runners.running_now": (p) => `Running now, ${plural(num(p, "jobs"), "job")}`,
    "runners.queued_now": (p) => `Queued now, ${plural(num(p, "jobs"), "job")}`,
    "runners.macos": (p) => `${fmtN(num(p, "jobs"))} macOS`,
    "runners.queued_runs": (p) =>
        `Also queued: ${fmtN(num(p, "runs"))} ${str(p, "workflow")} ${str(p, "event")}-to-master runs with no job created yet, the oldest since ${at(p, "since")}.`,
    "runners.one_repo": (p) =>
        `All in ${str(p, "repo")}; no other graphty-org repository ran a job in ${fmtN(num(p, "h"))} h.`,

    // flaky
    "flaky.quarantine.empty": () =>
        "No quarantine entries: CI keeps no quarantine state and tools/test-quarantine.json is empty. Flaky tests are counted by open issue instead (member above).",
    "tag.screenshots": () => "Storybook capture",
    "tag.unstable": () => "unstable, blocks merge",
    "tag.issue": (p) => `#${num(p, "issue")}`,
    "tag.job_group": (p) => `job group, ${fmtN(num(p, "shards"))} shards`,
    "tag.gpu": () => "GPU: never quarantined",

    // releases
    "releases.lanes.sub": (p) => `${str(p, "sha")}, run ${esc(p.run)}, ${at(p, "at")}`,
    "lane.failed": () => "failed",
    "lane.passed": () => "passed",
    "lane.skipped": () => "skipped",
    "lane.shadow": () => "shadow mode publishes nothing",
    "lane.job": (p) => `${str(p, "job")} (${fmtDur(num(p, "s"))})`,
    "lane.jobs": (p) => `${str(p, "workflow")}, ${fmtN(num(p, "jobs"))} test jobs`,
    "lane.job_cost": (p) => `${str(p, "job")} (${fmtDur(num(p, "s"))}, ${fmtN(num(p, "usd"))} USD)`,
    "train.untested": () => "untested: skipped every lane on a new master commit",
    "train.tested_passed": () => "tested: every lane passed",
    "train.nothing_new": () => "skipped: nothing new to test",
    "train.tested_failed": (p) => `tested: ${and(arr(p, "lanes").map((l) => lane(String(l))))} failed`,
    "train.failed_before": (p) => `failed before the lanes, in ${str(p, "job")}`,
    "wf.failed_of": (p) => `${fmtN(num(p, "failed"))} of ${fmtN(num(p, "runs"))} failed`,
    "wf.in_a_row": (p) => `${fmtN(num(p, "n"))} in a row`,
    "wf.since_merge": (p) => `${at(p, "at")}, merge of ${prLink(num(p, "pr"))}`,

    // costs
    "costs.money.sub": (p) =>
        `month to date, projected to ${esc(String(p.month_end ?? "").slice(5))}; the line is the range by day`,
    "costs.money_by_workflow": () => "Money by workflow, this month so far, USD",
    "costs.value_by_workflow": () => "List-price value by workflow, not money, this month so far, USD",
    "cost.t4.rate": (p) =>
        `machine.dev, on demand ${fmtN(num(p, "usd_min"))} USD/min, +${fmtN(num(p, "boot_min"))} min boot per job`,
    "cost.llm.rate": (p) => `Gemini, one paid run a day at ${fmtN(num(p, "usd"))} USD`,
    "cost.plan": () => "plan",
    "cost.github.plan": (p) => `Team, ${fmtN(num(p, "seats"))} seats`,
    "cost.cloudflare.plan": () => "Workers Paid",
    "cost.aws.credits": (p) => `Cost Explorer; credits left ${fmtN(num(p, "usd"))} USD`,
    "cost.flat": () => "flat",
    "cost.usage.events": () => "events / quota",
    "cost.usage.requests": () => "requests / allowance",
    "unit.train.note": (p) => `median of ${fmtN(num(p, "days"))} d, T4 only: the LLM suite runs once a day`,
    "unit.train.mean": (p) =>
        `mean of ${fmtN(num(p, "days"))} d over ${plural(num(p, "trains"), "tested train")}; T4 and the LLM step`,
    "unit.pr_value.note": () => "not money: Actions minutes are free for this public repository",

    // data sources
    "data.stress.sub": (p) => str(p, "workflow"),
    "stress.filing_failed": (p) =>
        `failed in ${str(p, "step")}: ${fmtN(num(p, "failures"))} failures over the cap of ${fmtN(num(p, "cap"))} (all in ${str(p, "file")}, ${str(p, "cause")})`,
    "stress.found_nothing": () => "passed, found nothing",
    "stress.found_filed": () => "passed, found failures and filed them",
    "stress.failed_in": (p) => `failed in ${str(p, "job")}`,
    "stress.no_runs": () => "No completed stress run recorded yet.",
    "stress.filed_tracked": (p) => `${fmtN(num(p, "filed"))}; ${issueLink(num(p, "issue"))} tracks it`,
    "source.collector.what": () => "GitHub runs, jobs, pull requests, issues",
    "source.ci-results.what": () => "per file, failed and retried tests",
    "source.ci-timings.what": () => "runs, jobs, steps",
    "source.releases.what": () => "lanes from release.yml jobs",
    "source.npm.what": () => "published versions",
    "source.stress.what": () => "restricted-cpu-stress.yml",
    "source.hosts.what": () => "hosts.yml",
    "source.billing.what": () => "Cost Explorer, rates.json",
    "source.local.what": () => "test ledger, push log",
    "source.limit_runs": (p) => `${fmtN(num(p, "h"))} h of runs`,
    "source.since_no_history": (p) => `since ${at(p, "since")}, no history`,
    "source.trains": (p) => `${fmtN(num(p, "got"))} of ${fmtN(num(p, "of"))} trains`,
    "source.error.filing": () => "filing step failed",
    "source.no_local_gate": (p) =>
        `no local gate since ${typeof p.since === "string" ? esc(p.since.slice(5, 10)) : ""}`,
    "notsetup.channels.what": () => "canary, nightly and production age; change failure rate",
    "notsetup.flaky_feed.what": () => "quarantine counts",
};

/** The words for a fact; an unknown code is drawn as its code and parameters, never dropped. */
export function sentence(f: Fact): string {
    const fn = S[f.code];
    return fn ? fn(f.params ?? {}) : `${esc(f.code)} ${esc(JSON.stringify(f.params ?? {}))}`;
}

export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The window label under a value ("1 h; 6 h 24 min", "now", "7 d"). */
export function windowLabel(m: Member, range: Range | SlowRange): string {
    if (m.window === "now") return "now";
    if (m.window === "7d" || m.window === "28d") return rangeLabel(m.window);
    if (range !== "1h") return rangeLabel(range);
    const v6 = m.value6h === undefined ? "" : `; 6 h ${fmtValue(m.value6h)}`;
    const cov = m.covered6h ? `, ${fmtN(m.covered6h.h)} h of ${fmtN(m.covered6h.of)}` : "";
    return `1 h${v6}${cov}`;
}

/** The definition line under a member's name. */
export function memberLine(m: Member): string {
    const t = MEMBER[m.id];
    const parts: string[] = [m.note ? sentence(m.note) : esc(t.def)];
    if (m.n !== undefined && (m.window === "1h" || m.window === "1h6h") && t.nOf)
        parts.push(`n=${fmtN(m.n)} ${esc(t.nOf)}`);
    if (m.reason) parts.push(sentence(m.reason));
    if (m.cleared) parts.push(`cleared ${fmtAgo(m.cleared)}`);
    if (m.fixWaitsOwner) parts.push(`fix ${prLink(m.fixWaitsOwner)} waits on the owner`);
    const line = parts.join("; ");
    if (m.state === "slow") return `slow measure: ${line}, ${rangeLabel(m.window as SlowRange)}`;
    return line;
}

/** HTML without its links, for text inside a row that is itself a link (anchors cannot nest). */
export const unlinked = (html: string): string => html.replace(/<a\b[^>]*>|<\/a>/g, "");

/** A member in a sentence: "runner wait p90 31 min", or its short fact. */
export function refText(r: { member: MemberId; value: Value; fact?: Fact }): string {
    if (r.fact) return sentence(r.fact);
    // No value (NO DATA, not set up): the state word says why, so the name stands alone, never "name --".
    if (r.value === null || ("word" in r.value && r.value.word === "yes")) return esc(MEMBER[r.member].short);
    return `${esc(MEMBER[r.member].short)} ${fmtValue(r.value)}`;
}
