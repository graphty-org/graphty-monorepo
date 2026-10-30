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
    NumberValue,
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
    per1000: " per 1,000 runs",
};

export function fmtUnit(n: number, unit?: Unit): string {
    if (unit === "jobs") return `${fmtN(n)} ${n === 1 ? "job" : "jobs"}`;
    // Under a millisecond reads in microseconds, never "0 ms".
    if (unit === "ms" && n > 0 && n < 1) return `${fmtN(Math.round(n * 1000))} us`;
    if (unit === "x") return `${n.toFixed(1)}x`;
    return fmtN(n) + (unit ? UNIT[unit] : "");
}

const WORD = {
    passed: "passed",
    failed: "failed",
    yes: "yes",
    no: "no",
    filed: "filed",
    skipped: "skipped",
    quiet: "found nothing 3 weeks running",
} as const;

/** An age in minutes under 90 s, which reads in seconds ("29 s ago", never "0.49 min ago"). */
const isSeconds = (v: NumberValue): boolean => v.ago === true && v.unit === "min" && v.n < 1.5;

/** A value inline ("40%", "filed 0", "1 of 8", "--"). */
export function fmtValue(v: Value): string {
    if (v === null) return "--";
    if ("word" in v) return WORD[v.word] + (v.n === undefined ? "" : ` ${fmtN(v.n)}`);
    if (isSeconds(v)) return esc(`${fmtDur(v.n * 60)} ago`);
    const sign = v.signed && v.n > 0 ? "+" : "";
    let s = sign + fmtUnit(v.n, v.unit);
    if (v.of !== undefined) s += ` of ${fmtN(v.of)}`;
    if (v.ago) s += " ago";
    return esc(s);
}

/** A value as a big number with its unit small after it (the mockup's `40<small> %</small>`). */
export function bigValue(v: Value): string {
    if (v === null) return "--";
    if ("word" in v) return `<span class="vw">${esc(WORD[v.word]) + (v.n === undefined ? "" : ` ${fmtN(v.n)}`)}</span>`;
    if (isSeconds(v)) return `${Math.round(v.n * 60)}<small> s ago</small>`;
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

/** "10-29 14:40": a time with its date, always. */
function fmtDated(at: Iso): string {
    const d = new Date(at);
    return `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/**
 * "14:30 - now", or both ends dated when either is not today ("10-29 22:10 - 10-30 01:05"). With `edge`, a start the
 * 24 h window cut (within 5 min of its edge) or one the engine could not tell reads "before 10-29 14:40 - now".
 */
export function fmtSpan(start: Iso, end: Iso | null, o: { edge?: boolean; startUnknown?: boolean } = {}): string {
    const gen = Date.parse(clock.generated || new Date(clock.now()).toISOString());
    const day = (at: Iso | number) => new Date(at).toISOString().slice(0, 10);
    const dated = day(start) !== day(gen) || (end !== null && day(end) !== day(gen));
    const t = (at: Iso) => (dated ? fmtDated(at) : fmtTime(at));
    const clipped = o.startUnknown || (o.edge && Math.abs(Date.parse(start) - (gen - 24 * 3600_000)) <= 5 * 60_000);
    // Each end stays on one line (style.css .nw), so a narrow column breaks only between the two.
    const nw = (x: string) => `<span class="nw">${x}</span>`;
    return `${nw(clipped ? `before ${fmtDated(start)}` : t(start))} - ${nw(end ? t(end) : "now")}`;
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
/** A commit: its first 9 characters, the full SHA in the link and its title. */
export const shaLink = (sha: string) =>
    `<a class="ln" href="${REPO}/commit/${esc(sha)}" title="${esc(sha)}">${esc(sha.slice(0, 9))}</a>`;

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

/** "not judged: 4 merged this hour, needs 5": a rate with too few events to judge. */
export function fewText(
    m: Pick<Member, "n" | "minN"> & Partial<Pick<Member, "id" | "window">>,
    range?: Range | SlowRange,
): string {
    const nOf = m.id ? MEMBER[m.id].nOf : undefined;
    // A 7- or 28-day measure counts its own days, whatever the picker shows.
    const days = m.window === "7d" || m.window === "28d" ? m.window : undefined;
    const when = days
        ? `in the last ${rangeLabel(days)}`
        : range === undefined || range === "1h"
          ? "this hour"
          : `in the last ${rangeLabel(range)}`;
    return `not judged: ${fmtN(m.n ?? 0)}${nOf ? ` ${esc(nOf)}` : ""} ${when}, needs ${fmtN(m.minN ?? 0)}`;
}

/** "only 3 h of 6 h recorded": a source that covers less than the window. */
export const partialText = (c: Member["covered"]): string =>
    `only ${fmtN(c?.h ?? 0)} h of ${fmtN(c?.of ?? 1)} h recorded`;

/** A muted, outlined OK: within target, so it reads apart from "not judged" without adding color (3.2). */
export const OK_CHIP = `<span class="sw okl">OK</span>`;

/**
 * The state cell of a member row: a filled chip for a judged state not OK, an outlined OK, muted words for the gray
 * ones.
 */
export function stateChip(
    m: Pick<Member, "state" | "n" | "minN" | "covered"> & Partial<Pick<Member, "id" | "window" | "value">>,
    range?: Range | SlowRange,
): string {
    switch (m.state) {
        case "ok":
            return OK_CHIP;
        case "info":
            return `<span class="sw low">for information</span>`;
        case "warn":
        case "bad":
        case "nodata":
            return `<span class="sw ${stateClass(m.state)}">${STATE_WORD[m.state]}</span>`;
        case "few":
            if (showsRangeValue(m, range)) return "";
            return `<span class="sw low">${fewText(m, range)}</span>`;
        case "partial":
            return `<span class="sw low">${partialText(m.covered)}</span>`;
        case "idle":
            return `<span class="sw low">nothing ran</span>`;
        case "slow":
            // Sent only by an API built before 7- and 28-day members were judged: it never sets the color.
            return `<span class="sw low">${dayMeasure(m.window ?? "7d")}, not judged</span>`;
        case "notsetup":
            return `<span class="sw low">not set up</span>`;
    }
}

// ---------------------------------------------------------------- release channels

/** The overview's release channel tiles: the heading, each channel's name and how its attempts read. */
export const CHANNELS_HEAD = "Releases";
export const CHANNELS_SUB =
    "what each channel serves; each dot a release attempt, oldest to newest; the color is the newest finished attempt: OK promoted, WARNING passed but not promoted (pictures wait for review), FAILING failed, NO DATA none recorded yet. These tiles do not set the Releases block below: its color comes from the rows on the Releases page, such as nightly promotions per day";

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

/** One attempt's dot title: "finished 19:20: failed, 3f2a91c" (Train attempts lists the same runs by start time). */
export function attemptText(id: ChannelId, a: { at: Iso; outcome: ChannelOutcome; sha?: string }): string {
    const word = a.outcome === "ok" ? CHANNEL[id].ok : OUTCOME[a.outcome];
    const sha = a.sha ? ", " + esc(a.sha.slice(0, 7)) : "";
    return `finished ${fmtTime(a.at)}: ${word}${sha}`;
}

/** The dot row's label for a screen reader. */
export function attemptsLabel(n: number): string {
    if (!n) return "no release attempts recorded";
    return `last ${n} release ${n === 1 ? "attempt" : "attempts"}, oldest first`;
}

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
    /** The definition under the name: what is measured, over what window, in what unit. */
    def: string;
    /** What a red row means and where to look; empty for a member with no red line. */
    red: string;
    /** What a yellow row means, when it is not simply "on the way to red" (the stress run's "found nothing"). */
    yellow?: string;
    /** What n counts ("jobs"). */
    nOf?: string;
    /** The headline's name under a status block, when it differs. */
    headline?: string;
    /** What the value is, in a sentence, when "now" would mislead (" projected for month-end"). */
    when?: string;
}

export const MEMBER: Record<MemberId, MemberText> = {
    "master.red_now": {
        name: "Master red now",
        short: "master red now",
        def: "Minutes master's build has been red; 0 when green.",
        red: "Master has been red 15 min or 2 builds in a row, so every new PR inherits the failure. See Red spans below and the master-guard revert PR.",
    },
    "master.green_time": {
        name: "Green time",
        short: "green time",
        def: "Share of the last hour master's build was green, in %. A cancelled build counts as red unless a newer push or a person cancelled it.",
        red: "Master was red for more than a quarter of the last hour. See Red spans below.",
    },
    "master.same_check": {
        name: "Most PRs failing one check",
        short: "most PRs failing one check",
        def: "The largest number of open PRs failing the same check (or test group) right now; 1 or 0 means no failure is shared. Several PRs failing one check usually means master broke it, not the PRs. On the overview, 'worst' is the highest count reached.",
        red: "3 or more PRs fail the same check: fix it on master first. See the ongoing rows of Shared failures below.",
    },
    "master.full_run_verdict": {
        name: "Latest full test run",
        short: "latest full test run",
        def: "Passed or failed: whether every test shard (the CI lane) passed in the newest full run, which tests master every 6 hours. Passed here means master's tests are green; nightly can still wait on other lanes or on screenshot review (see Releases).",
        red: "The newest full run's tests failed on master, so nothing promotes to nightly until agents fix or revert the change its bisect names. See Releases > Lanes on the candidate.",
    },
    "master.untested_age": {
        name: "Hours since master was fully tested",
        short: "hours since master was fully tested",
        def: "Hours since the oldest master commit that no full run has tested yet was merged. Full runs start every 6 hours, so up to about 7 h is normal.",
        red: "Over 13 h: two full runs in a row did not test new master commits, so they are failing to start or falling behind. See Releases > Train attempts.",
    },
    "master.reverts": {
        name: "Reverted merges",
        short: "reverted merges",
        def: "Share of merges into master in the last 7 days that a later merge reverted, in %.",
        red: "Over 10%: changes land broken, so reviews and PR tests miss real failures. Judged on 7 days, it sets Master's color like any other row once its state shows. See Master builds.",
    },
    "pull-requests.time_to_merge": {
        name: "Time to merge",
        short: "time to merge",
        def: "Median time from ready-for-review to merged, in minutes; time waiting on the owner is left out.",
        red: "Over 3 h in both the last hour and the last 6 h: PRs are stuck. See Where the time goes.",
        nOf: "merged",
    },
    "pull-requests.open": {
        name: "Open pull requests",
        short: "open pull requests",
        def: "Open PRs that are not drafts and not waiting on the owner.",
        red: "Over 30: work piles up faster than it merges.",
    },
    "pull-requests.oldest_open": {
        name: "Oldest open PR",
        short: "oldest open PR",
        def: "Age in hours of the oldest open PR not waiting on the owner.",
        red: "Over 72 h: that PR is stuck; its author fixes or closes it. The PR's number is linked under the row's description whenever the collector knows it.",
    },
    "pull-requests.merge_ratio": {
        name: "Merged per opened",
        short: "merged per opened",
        def: "PRs merged divided by PRs opened (1.0 = backlog steady; below 1 = backlog growing).",
        red: "Below 0.7 in the last hour and the last 6 h: the backlog grows.",
        nOf: "opened",
    },
    "pull-requests.caused_failures": {
        name: "Runs failed by their own change",
        short: "runs failed by their own change",
        def: "Share of PR first runs in the last 7 days that failed on a test the PR itself changed, in %.",
        red: "No red line. Past 5% (yellow): more PRs than usual arrive with their own tests failing, so authors should run the tests they changed before opening the PR.",
        nOf: "runs",
    },
    "pull-requests.automerge_green_stuck": {
        name: "Green but not merging",
        short: "green but not merging",
        def: "PRs that are green with auto-merge on and still unmerged 2 h later.",
        red: "2 or more: merging itself is broken (branch rules or GitHub). The PRs are named in this row; an agent checks why they do not merge.",
    },
    "pull-requests.automerge_armed_long": {
        name: "Auto-merge on over 24 h",
        short: "auto-merge on over 24 h",
        def: "PRs with auto-merge on for over 24 h, green or red. Green but not merging counts only green ones.",
        red: "4 or more: PRs sit for a day with auto-merge on, mostly red. The PRs are named in this row; their authors fix or close them.",
    },
    "pull-requests.screenshot_backlog": {
        name: "PR screenshot approvals waiting",
        short: "PR screenshot approvals waiting",
        def: "Hours the oldest open screenshot-approval pull request has waited for the owner. Only the owner's approval pull requests (their 'Visual review' status) count, so 0 means none is open. Full runs held because pictures changed are a different measure, on Releases.",
        red: "Over 72 h: an approval pull request has waited 3 days on the owner, so nightly waits too. The owner finishes it on the review page.",
    },
    "ci.runner_wait": {
        name: "Runner wait (p90)",
        short: "runner wait p90",
        def: "90th-percentile wait for a runner over the last hour, in minutes, organization-wide. Only the last hour is judged; the 6 h value is the trend.",
        red: "Over 15 min: CI is short of runners. See CI > Runners.",
        nOf: "jobs",
        headline: "Runner wait p90",
    },
    "ci.longest_queued": {
        name: "Longest queued now",
        short: "longest queued now",
        def: "Minutes the oldest job still waiting for a runner has waited, read now.",
        red: "Over 15 min: a job is stuck in the queue. See CI > Runners.",
    },
    "ci.saturated": {
        name: "Minutes at capacity",
        short: "minutes at capacity",
        def: "Minutes in the last hour the organization ran within 3 jobs of its concurrent-job limit (500 jobs on Linux and Windows, 50 on macOS) while other jobs queued.",
        red: "15 min or more: CI is full. See CI > Runners.",
    },
    "ci.not_assigned": {
        name: "Runners not being assigned",
        short: "runners not being assigned",
        def: "Minutes jobs waited although free runner slots existed. This is usually a GitHub Actions outage; githubstatus.com is GitHub's own status page.",
        red: "15 min or more: GitHub is not handing out runners. Check githubstatus.com.",
    },
    "ci.first_attempt": {
        name: "First-attempt pass rate",
        short: "first-attempt pass rate",
        def: "Share of PR check suites that passed on their first attempt, in %.",
        red: "Below 70% in the last hour and the last 6 h: flaky tests or a broken master. See Flaky tests and Master.",
        nOf: "suites",
    },
    "ci.hangs": {
        name: "Hung jobs",
        short: "hung jobs",
        def: "Jobs in the last hour that ran until their own timeout killed them.",
        red: "2 or more: something hangs. See CI > Runners.",
    },
    "ci.pr_duration": {
        name: "PR check time vs budget",
        short: "PR check time vs budget",
        def: "Median time of a pull request's checks divided by its time budget (1.0 = on budget). Each kind of PR run (a few packages, or every package) has its own budget in minutes.",
        red: "Over 2x: PR checks take twice their budget, so every PR waits longer. Agents look at the slowest shards in Shard times.",
        nOf: "runs",
    },
    "ci.bins_over": {
        name: "PR test groups over 8 min",
        short: "PR test groups over 8 min",
        def: "Share of a pull request's test groups that ran longer than 8 min in the last hour, in %. CI splits each PR's tests into groups meant to finish within 8 min. Shard times below, pull request bins, shows the same groups over 7 days, so it can list groups over budget while this hour has few.",
        red: "Over 25%: the way PR tests are split into groups needs rebalancing, so PRs wait on their slowest group. See Shard times, pull request bins.",
        nOf: "bins",
    },
    "ci.reruns": {
        name: "Reruns",
        short: "reruns",
        def: "Share of runs that needed more than one attempt, in %.",
        red: "Over 15%: flaky tests or failing infrastructure. See Flaky tests.",
        nOf: "runs",
    },
    "ci.shards_over": {
        name: "Full-run shards over budget",
        short: "full-run shards over budget",
        def: "Full-run test shards whose 7-day median time is over their own time budget. Shard times below shows each shard's median against its budget (the line in its bar). While CI test results sends too little, this row says NO DATA rather than count from data that may be missing.",
        red: "3 or more: full runs are slowing down and may hit their timeouts. Agents speed up or split the shards listed over budget in Shard times.",
    },
    "ci.runner_minutes": {
        name: "Runner-minutes per merge",
        short: "runner-minutes per merge",
        def: "Runner-minutes CI used, across every kind of run, per PR merged into master, over 7 days.",
        red: "Over 600: CI load per change is growing, so everyone queues longer. Minutes cost no money; the queue costs time. The table below shows which kind of run uses them.",
        nOf: "merged",
    },
    "ci.screenshot_set_age": {
        name: "Oldest screenshot set",
        short: "oldest screenshot set",
        def: "Hours since the least recently captured group of Storybook stories got a new screenshot from the background captures that run many times a day. A current age, read now.",
        red: "Over 12 h: the background screenshot captures stopped, so the owner reviews stale pictures. Agents check the background screenshot capture workflow's runs.",
    },
    "ci.slice_base_budget": {
        name: "Scheduled screenshot captures, daily cap",
        short: "scheduled screenshot captures, share of daily cap",
        def: "Runner-minutes used today (UTC) by the scheduled background screenshot captures, as a share of the daily cap their workflow sets for itself, in %. Read now; 100% means the cap is used up.",
        red: "Over 125%: the captures use more runner time than their own cap allows, taking runners from real work; agents check the capture workflow's cap. See Runners > Who holds the runners.",
    },
    "ci.slice_idle_budget": {
        name: "Spare-time screenshot captures, daily cap",
        short: "spare-time screenshot captures, share of daily cap",
        def: "Runner-minutes used today (UTC) by the extra screenshot captures that run only when runners are free, as a share of the daily cap their workflow sets for itself, in %. Read now.",
        red: "Over 125%: the captures use more runner time than their own cap allows, taking runners from real work; agents check the capture workflow's cap. See Runners > Who holds the runners.",
    },
    "ci.slice_idle_hour_budget": {
        name: "Spare-time screenshot captures, hourly cap",
        short: "spare-time screenshot captures, share of hourly cap",
        def: "Runner-minutes used in the last hour by the extra screenshot captures that run only when runners are free, as a share of the hourly cap their workflow sets for itself, in %. Read now.",
        red: "Over 125%: the captures use more runner time than their own cap allows, taking runners from real work; agents check the capture workflow's cap. See Runners > Who holds the runners.",
    },
    "ci.slice_contended": {
        name: "Capture minutes while CI was busy",
        short: "capture minutes while CI was busy",
        def: "Runner-minutes background screenshot captures held today while other jobs were queued or every runner was busy.",
        red: "Over 105 min: captures slow real work; agents make the captures yield to queued jobs.",
    },
    "ci.slice_queue_wait": {
        name: "Queue wait caused by captures",
        short: "queue wait caused by captures",
        def: "Minutes other jobs waited today while a background screenshot capture held a runner.",
        red: "Over 105 min: captures slow real work; agents make the captures yield to queued jobs.",
    },
    "ci.superseded": {
        name: "Superseded runs still running",
        short: "superseded runs still running",
        def: "Runs still running after a newer push to the same PR made them pointless.",
        red: "No red line: shown for information. Each such run holds runners other jobs wait for; see Superseded runs still running.",
    },
    "ci.chronic_jobs": {
        name: "Chronically failing jobs",
        short: "chronically failing jobs",
        def: "Jobs that failed in at least half of their last 10 runs, or have not passed in 3 days.",
        red: "A job keeps failing and nobody tracks it. File the issue from the table below.",
    },
    "ci.bench_regressions": {
        name: "Benchmark regressions",
        short: "benchmark regressions",
        def: "Benchmarks whose last 3 results have a median more than 1.2x that of the 10 runs before. A benchmark with fewer than 13 runs is not judged, so the count stays 0 until benchmarks have that history.",
        red: "3 or more: performance regressed. See Benchmarks below.",
    },
    "flaky.blocked": {
        name: "PRs blocked by a flake",
        short: "PRs blocked by a flake",
        def: "Open PRs whose newest failure was a flaky test or an unstable story, read now.",
        red: "3 or more PRs, or one blocked 24 h: flakes are stopping merges. Agents fix the flaky tests in Hotspots first.",
    },
    "flaky.no_issue": {
        name: "Flaky tests with no issue",
        short: "flaky tests with no issue",
        def: "Tests CI proved flaky (failed, then passed on its retry) in the last 7 days with no issue naming them, read now. A test counts as tracked while an issue naming it is open, or once one closed after its last flaky result; a test that only failed is not counted. Each test's page in Hotspots searches its issues or drafts one.",
        red: "3 or more: flakes go untracked. Open the test from Hotspots below; its page drafts the issue on GitHub.",
    },
    "flaky.flake_rate": {
        name: "Flake rate",
        short: "flake rate",
        def: "Flaky test results per 1,000 CI test-file runs. Hotspots below covers 7 days, so it can list flaky tests while this hour has none or NO DATA.",
        red: "Over 10 per 1,000 in the last hour and the last 6 h. See Hotspots.",
        nOf: "test-file runs",
    },
    "flaky.net_new": {
        name: "Net new flaky tests",
        short: "net new flaky tests",
        def: "Tests that became flaky minus tests fixed (10 clean runs or their issue closed), over 7 days.",
        red: "More than 3: flakiness grows faster than agents fix it. Agents take flaky issues before new work.",
    },
    "flaky.detected_to_fixed": {
        name: "Days to fix a flaky test",
        short: "days to fix a flaky test",
        def: "Median days from a flaky test's issue being opened to its fix merging, over the fixes of the last 28 days. Not judged until 5 fixes have merged.",
        red: "Over 7 d: flaky tests stay broken for a week or more. Agents take the oldest flaky issues first.",
    },
    "data-sources.stress_run": {
        name: "Weekly stress run",
        short: "weekly stress run",
        def: "The newest weekly run of every test shard under half the runner's CPU, which files an issue per test that fails under load. Its value is what the newest run did: passed, failed, or found nothing 3 weeks running.",
        red: "The weekly run or its issue filing failed, so tests that fail under load go untracked; agents fix the stress workflow.",
        yellow: "It found nothing 3 weeks running, so it may no longer limit the CPU; agents check that it does.",
    },
    "releases.lanes_red": {
        name: "Red lanes on the candidate",
        short: "red lanes on the candidate",
        def: "Lanes of the full run (CI, T4 GPU, host matrix, macOS autosave, audit, LLM tests) that failed on the newest tested commit, the candidate for nightly. A run that passed but changed pictures counts on Full runs held for screenshot review instead, unless an open 'Nightly held' issue holds it.",
        red: "A lane has been red 6 h or more, or a held candidate with an open 'Nightly held' issue has waited 6 h for screenshot review, so nightly cannot move. Agents fix forward from the candidate; changed screenshots wait on the owner.",
        headline: "Release lanes red",
    },
    "releases.workflows_failing": {
        name: "Release workflows failing",
        short: "release workflows failing",
        def: "Release workflows (release.yml, promote.yml, release-watch.yml) whose newest run failed.",
        red: "One failed 3 times in a row: releases are broken until agents fix the workflow. See Release workflows below.",
    },
    "releases.train_skipped": {
        name: "Newest commit skipped",
        short: "newest commit skipped",
        def: "Whether the newest full-run attempt skipped every lane although master had a new commit to test (yes or no).",
        red: "If yes: full runs are not testing new work, so nothing new can reach nightly. Agents check the newest Release run in Train attempts.",
    },
    "releases.tagged_not_npm": {
        name: "Tagged, not on npm",
        short: "tagged, not on npm",
        def: "Versions tagged in git that npm does not list yet.",
        red: 'Missing over 30 min: a publish failed. See the "Release held: publish failed" issue.',
    },
    "releases.train_first_pass": {
        name: "Full runs passing first try",
        short: "full runs passing first try",
        def: "Share of full-run attempts in the last 7 days that passed on their first attempt, in %.",
        red: "Below 75%: master is often broken when a full run tests it, so nightly waits for fixes. Agents fix the lanes that fail most in Train attempts.",
    },
    "releases.channels": {
        name: "Release channel ages",
        short: "release channel ages",
        def: "How old the commit each channel (canary, nightly, production) serves is. Not measured yet: it needs the release channel records, which are still being built.",
        red: "Not set up yet, so it is never red; its red line comes with the channel ages.",
    },
    "releases.review_lag": {
        name: "Screenshot review time",
        short: "screenshot review time",
        def: "Median hours from a changed picture's first capture to its approval merging, over 7 days. Only pictures whose approval merged count, so while pictures still wait (see Full runs held for screenshot review) this can read 0 pictures.",
        red: "Over 24 h: changed pictures wait a day for the owner, so nightly waits too.",
        nOf: "pictures",
    },
    "releases.slots_unreviewed": {
        name: "Full runs held for screenshot review",
        short: "full runs held for screenshot review",
        def: "Share of green full runs in 7 days held because a picture changed and waits for the owner, in %.",
        red: "Over 75%: nightly waits on the owner's screenshot review almost every time. The owner reviews the changed pictures on the review page's master rolling target.",
        nOf: "green runs",
    },
    "releases.green_clean": {
        name: "Full runs able to promote",
        short: "full runs able to promote",
        def: "Share of full runs in 7 days that passed with no changed pictures, so they could promote to nightly at once, in %.",
        red: "Below 25%: nightly rarely moves, because full runs fail or change pictures. Train attempts below says which, for each run.",
        nOf: "full runs",
    },
    "releases.nightly_promotions": {
        name: "Nightly promotions per day",
        short: "nightly promotions per day",
        def: "Times nightly moved to a new commit, per day, 7-day average.",
        red: "Below 1 a day: nightly and npm next fall behind master. The rows above say why: failing lanes, or pictures waiting for review.",
    },
    "costs.spend": {
        name: "Spend this month",
        short: "spend",
        def: "Every paid service, projected to month-end, in USD.",
        red: "The money spent this month is already over the monthly limit (yellow: only the month-end forecast is over it). The owner raises the limit or accepts the overrun.",
        headline: "Spend projected",
        when: " projected for month-end",
    },
    "costs.t4": {
        name: "T4 GPU",
        short: "T4 GPU",
        def: 'The machine.dev bill for the paid T4 GPU runner, projected to month-end, in USD. "Money by workflow" below is GitHub\'s list-price value, not this bill.',
        red: "The money spent on it this month is already over its limit (yellow: only the month-end forecast is over it). The owner raises the limit or accepts the overrun.",
        when: " projected for month-end",
    },
    "costs.llm": {
        name: "LLM tests (estimated)",
        short: "LLM tests spend",
        def: "Gemini calls made by the CI LLM regression tests, at a flat estimated rate, projected to month-end, in USD.",
        red: "The money spent on it this month is already over its limit (yellow: only the month-end forecast is over it). The owner raises the limit, or agents cut the LLM test runs.",
        when: " projected for month-end",
    },
    "costs.aws": {
        name: "AWS",
        short: "AWS",
        def: "AWS spend this month so far (Cost Explorer), in USD.",
        red: "Over 10 USD: the dashboard's own AWS budget locks it at that point.",
    },
    "costs.cloudflare_usage": {
        name: "Cloudflare usage",
        short: "Cloudflare usage",
        def: "Usage as a share of the plan's allowance, in %.",
        red: "Over 90%: the plan's allowance is nearly used.",
    },
    "costs.sentry_usage": {
        name: "Sentry usage",
        short: "Sentry usage",
        def: "Events as a share of the plan's quota, in %.",
        red: "Over 100%: Sentry drops events.",
    },

    "data-sources.past_age": {
        name: "Sources not OK",
        short: "sources not OK",
        def: "Data sources past their age limit, sending too little, or failing.",
        red: "A source is failing or has not written for twice its age limit: the pages it feeds show NO DATA or stale values. See Sources below; agents fix its writer.",
    },
    "data-sources.thin": {
        name: "Data volume vs normal",
        short: "data volume vs normal",
        def: "Rows written per collector run in the last hour divided by the 7-day median (1.0 = normal).",
        red: "Below 0.2: a writer is dropping rows, so the measures it feeds show NO DATA. See Sources below.",
        nOf: "runs",
    },
    "data-sources.collector": {
        name: "Collector last ran",
        short: "collector last ran",
        def: "Time since the dashboard's own data collector last ran. A source's last write in Sources below is the newest data it wrote, which can be older when a run brought nothing new.",
        red: "Over 20 min: every page is stale. The owner gets a phone alert.",
    },
    "data-sources.app_rate": {
        name: "GitHub API quota left",
        short: "GitHub API quota left",
        def: "Share of the GitHub App's hourly API requests still unused, in %.",
        red: "Below 20%: the collector will soon be rate-limited.",
    },
    "data-sources.write_budget": {
        name: "Database writes today",
        short: "database writes today",
        def: "Rows written today as a share of the daily limit, in %.",
        red: "Over 90%: writes stop.",
    },
    "data-sources.sources_not_ok": {
        name: "Sources not OK",
        short: "sources not OK",
        def: "Data sources past their age limit, sending too little, or failing.",
        red: "A source is failing or has not written for twice its age limit: the pages it feeds show NO DATA or stale values. See Sources below; agents fix its writer.",
    },
    "local-runs.local_vs_ci": {
        name: "Local vs CI disagreement",
        short: "local vs CI disagreement",
        def: "Share of local shard runs whose outcome differs from CI's on the same shard and inputs, in %.",
        red: "",
    },
    "local-runs.shard_time": {
        name: "Local shard time",
        short: "local shard time",
        def: "Median time of a local shard run, in minutes.",
        red: "",
    },
    "local-runs.slot_waits": {
        name: "Slot waits",
        short: "slot waits",
        def: "90th-percentile wait for a test slot on the development machine, in minutes.",
        red: "",
    },
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
    "cost.llm": "LLM regression (CI, estimated)",
    "cost.sentry": "Sentry (plan price)",
    "cost.github": "GitHub",
    "cost.cloudflare": "Cloudflare (plan price)",
    "cost.aws": "AWS",
    "cost.total": "<b>Total</b>",
    "cost.sentry_usage": "Sentry usage (share of the plan's quota)",
    "cost.cloudflare_usage": "Cloudflare usage (share of the plan's allowance)",
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
    "source.deploy": "Site deploys",
    "source.story-slices": "Rolling screenshot captures",
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
for (const [id, [, long]] of Object.entries(LANE)) LABEL[`lane.${id}`] = esc(long);

/** A GitHub event as a reader says it. */
export const EVENT: Record<string, string> = {
    pull_request: "pull request",
    push: "master push",
    workflow_dispatch: "manual run",
    schedule: "scheduled",
    workflow_run: "after another workflow",
    merge_group: "merge queue",
};
const event = (e: string) => esc(EVENT[e] ?? e);
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

/** "good <= 5 min; red > 15 min", or what is good alone. */
export function slaText(sla: Sla | null, targetOnly = false): string {
    if (!sla) return "no target (shown for information)";
    // A comparison follows its word ("good <= 5 min"); a phrase follows a colon ("good: passed and filed ...").
    const target = isCmp(sla.target) ? cmpText(sla.target, true) : `: ${sentence(sla.target)}`;
    if (targetOnly) return `good ${target}`.replace(" :", ":");
    if (!sla.red) return `good ${target}; no red line`.replace(" :", ":");
    const red = isCmp(sla.red) ? cmpText(sla.red, true) : `: ${sentence(sla.red)}`;
    return `good ${target}; red ${red}${sla.needs6h ? " (in the last hour and the last 6 h)" : ""}`.replaceAll(
        " :",
        ":",
    );
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
    "sla.any_no_issue": () => "any with no open issue (yellow: any, each with an open issue)",
    "sla.none": () => "none",
    "sla.lanes_open": (p) => `a lane red ${fmtN(num(p, "h"))} h or more`,
    "sla.failed_in_a_row": (p) => `${fmtN(num(p, "runs"))} failed in a row`,
    "sla.word": (p) => str(p, "word"),
    "sla.after": (p) => `after ${fmtN(num(p, "min"))} min`,
    "sla.passed_and_filed": () => "passed and filed what it found",
    "sla.filing_failed": () => "the run or its issue filing failed",
    "sla.past_2x": () => "any source past twice its age limit",
    "sla.projected_within": (p) => `projected &lt;= ${fmtN(num(p, "usd"))} USD`,
    "sla.spent_over": (p) => `spent &gt; ${fmtN(num(p, "usd"))} USD (yellow: projected over it)`,
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
    "note.chronic_no_issue": (p) => `${fmtN(num(p, "n"))} of them ${num(p, "n") === 1 ? "has" : "have"} no open issue`,
    "chronic.no_issue_jobs": (p) =>
        `${plural(num(p, "n"), "chronically failing job")} ${num(p, "n") === 1 ? "has" : "have"} no open issue`,
    "note.oldest_pr": (p) => `${prLink(num(p, "pr"))} opened ${fmtN(num(p, "h"))} h ago`,
    "note.prs": (p) =>
        arr(p, "prs")
            .map((n) => prLink(Number(n)))
            .join(" "),
    "note.queued_run": (p) => `run ${runLink(num(p, "run"))}${p.workflow ? `, ${str(p, "workflow")}` : ""}`,
    "note.hung_jobs": (p) => and(arr(p, "jobs").map(esc)),
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
    "reason.thin": (p) =>
        `${esc(SOURCE[String(p.source)] ?? p.source)} is sending ${p.ratio === undefined ? "less data than usual" : `${fmtN(Math.round(num(p, "ratio") * 100))}% of its usual data`} for the work CI did`,
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
        (p.peak === undefined ? "" : `, worst ${fmtUnit(num(p, "peak"), p.unit as Unit | undefined)}`),

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
        `7-day measure; ${plural(num(p, "day"), "merge")} in 24 h, ${plural(num(p, "week"), "merge")} in 7 d`,
    "ci.causes.sub": (p) => `${plural(num(p, "suites"), "failed pull request suite")}`,
    "runners.running_now": (p) => `Running now, ${plural(num(p, "jobs"), "job")}`,
    "runners.queued_now": (p) => `Queued now, ${plural(num(p, "jobs"), "job")}`,
    "runners.macos": (p) => `(${fmtN(num(p, "jobs"))} on macOS)`,
    "runners.queued_runs": (p) =>
        `Also queued: ${fmtN(num(p, "runs"))} ${str(p, "workflow")} runs (${event(String(p.event ?? ""))}) with no job created yet, the oldest since ${at(p, "since")}.`,
    "runners.one_repo": (p) =>
        `All in ${str(p, "repo")}; no other graphty-org repository ran a job in ${fmtN(num(p, "h"))} h.`,

    // flaky
    "flaky.quarantine.empty": () => "No quarantine entries: the results store has no quarantined test in force.",
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
    "train.promoted": () => "promoted",
    "train.held": () => "held: screenshots to review, or a hold is open",
    "train.not_promoted": () => "not promoted",
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
    "cost.llm.rate": (p) =>
        `Gemini, CI only: ${fmtN(num(p, "usd"))} USD per paid release run or llm bisect point; local runs not counted`,
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
    "stress.failed_in": (p) => `failed at step "${str(p, "job")}"`,
    "stress.not_reached": () => "not reached",
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
    if (m.window === "7d" || m.window === "28d")
        return (
            rangeLabel(m.window) +
            (m.coveredDays ? `; data for ${fmtN(m.coveredDays.d)} of ${fmtN(m.coveredDays.of)} days` : "")
        );
    if (range !== "1h") return rangeLabel(range);
    const v6 = m.value6h === undefined ? "" : `; 6 h ${fmtValue(m.value6h)}`;
    const cov = m.covered6h ? `, ${fmtN(m.covered6h.h)} h of ${fmtN(m.covered6h.of)}` : "";
    return `1 h${v6}${cov}`;
}

/** The definition under a member's name, then what is known about it now ("#1234, opened 60 h ago"). */
export function memberLine(m: Member): string {
    const t = MEMBER[m.id];
    const parts: string[] = [];
    if (m.note && !m.note.code.endsWith(".def")) parts.push(sentence(m.note));
    if (m.n !== undefined && (m.window === "1h" || m.window === "1h6h") && t.nOf && m.state !== "few")
        parts.push(`from ${fmtN(m.n)} ${esc(t.nOf)}`);
    if (m.reason) parts.push(sentence(m.reason));
    if (m.cleared) parts.push(`cleared ${fmtAgo(m.cleared)}`);
    if (m.fixWaitsOwner) parts.push(`fix ${prLink(m.fixWaitsOwner)} waits on the owner`);
    return esc(t.def) + (parts.length ? ` ${capital(parts.join("; "))}.` : "");
}

/** "7-day measure" or "28-day measure": a member judged on days rather than the last hour. */
export const dayMeasure = (w: Member["window"]): string =>
    w === "now" ? "measure shown for information" : `${w === "28d" ? "28-day" : "7-day"} measure`;

/** HTML without its links, for text inside a row that is itself a link (anchors cannot nest). */
export const unlinked = (html: string): string => html.replace(/<a\b[^>]*>|<\/a>/g, "");

/** A member in a sentence: "runner wait p90 31 min", or its short fact. */
export function refText(r: { member: MemberId; value: Value; fact?: Fact }, brief = false): string {
    if (r.fact) return sentence(r.fact);
    // No value (NO DATA, not set up): the state word says why, so the name stands alone, never "name --".
    if (r.value === null || ("word" in r.value && r.value.word === "yes")) return esc(MEMBER[r.member].short);
    // In a status block the value stands alone; the measure under the block says it is a projection.
    return `${esc(MEMBER[r.member].short)} ${fmtValue(r.value)}${brief ? "" : (MEMBER[r.member].when ?? "")}`;
}
