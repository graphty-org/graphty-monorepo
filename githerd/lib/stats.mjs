/**
 * Progress statistics: one record per UTC day in `stats-history.jsonl` in the state directory, and
 * the `githerd stats` report built from them.
 *
 * A day's record is rebuilt from GitHub's list endpoints (issues and pull requests updated since
 * the day began, every open issue, failed workflow runs and releases), so the daemon's record of
 * yesterday, written at its first poll of a new UTC day, and the one-time backfill of earlier days
 * are the same computation. Type and priority come from the labels an issue carries when the
 * record is made: for a backfilled day that is today's labels, not that day's.
 */

import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { MARKER as FLAKY_MARKER } from "./flakes.mjs";
import { LABEL as HEARTBEAT_LABEL } from "./heartbeat.mjs";
import { MARKER as INCIDENT_MARKER } from "./incident-actions.mjs";

export const HISTORY_FILE = "stats-history.jsonl";
const DAY_MS = 86_400_000;
const TYPES = ["bug", "infrastructure", "enhancement", "other"];
const PRIORITIES = ["critical", "high", "medium", "low", "none"];
const SOURCES = ["owner", "claude", "githerd", "ci-bot", "other"];
const HOWS = ["merged-pr", "not-planned", "githerd", "other"];
/** Mergify's merge queue runs its draft pull requests' checks on these branches. */
const QUEUE_BRANCH = "mergify/merge-queue/";
/** A failed run shorter than this tested nothing: a draft's. */
const TESTED_MS = 5 * 60_000;
/** The backfill and the daily record stop when GitHub's core budget falls below this. */
const MIN_REMAINING = 2000;
/** No list is read past this many pages of 100. */
const MAX_PAGES = 50;
/** `fixes #12`, `Closes: #12`, `resolved #12`: GitHub's closing keywords. */
const CLOSES = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+#(\d+)/gi;

/**
 * @typedef {{day: string, source: "poll" | "backfill", at: string,
 *   open: {type: Record<string, number>, priority: Record<string, number>},
 *   opened: {type: Record<string, number>, source: Record<string, number>},
 *   closed: {type: Record<string, number>, how: Record<string, number>},
 *   prs: {opened: number, merged: number, closedUnmerged: number, ciFailed: number, dequeues: number,
 *     mergeHours: number[]},
 *   releases: number,
 *   oldestBugs: Record<string, {number: number, title: string, opened: string}[]>}} DayRecord
 */

/**
 * The UTC day of a time.
 * @param {number | string | Date} t the time
 * @returns {string} `YYYY-MM-DD`
 */
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
/**
 * Zero counts for each key.
 * @param {string[]} keys the keys
 * @returns {Record<string, number>} the counts
 */
const zeros = (keys) => Object.fromEntries(keys.map((k) => [k, 0]));
/**
 * The label names of an item.
 * @param {any} item an issue or pull request from the issues list
 * @returns {string[]} its label names
 */
const labelsOf = (item) => (item.labels ?? []).map((/** @type {any} */ l) => (typeof l === "string" ? l : l.name));
/**
 * Whether an account is an app's.
 * @param {any} user a GitHub user
 * @returns {boolean} true for an app or bot account
 */
const isBot = (user) => user?.type === "Bot" || String(user?.login ?? "").endsWith("[bot]");

/**
 * An issue's type: its first type label, else `other` (research, documentation, none).
 * @param {any} item the issue
 * @returns {string} the type
 */
export function issueType(item) {
    const labels = labelsOf(item);
    return TYPES.find((t) => labels.includes(t)) ?? "other";
}

/**
 * An issue's priority label without its `priority:` prefix, or `none`.
 * @param {any} item the issue
 * @returns {string} the priority
 */
function issuePriority(item) {
    const p = labelsOf(item)
        .find((l) => l.startsWith("priority:"))
        ?.slice(9);
    return p && PRIORITIES.includes(p) ? p : "none";
}

/**
 * Who opened an issue. `githerd` when it carries a githerd marker (a flaky test's or an
 * intermittent failure's line) or title; `ci-bot` for an app account (the master guard and the GPU
 * lane open issues as github-actions); `other` for any other person. The owner's login is shared by
 * the owner and every Claude session (githerd's workers included), so those are told apart by the
 * text: a Claude session writes a structured report, the owner by hand a line or two.
 * @param {any} item the issue
 * @param {string | null} owner the owner's login
 * @returns {string} one of SOURCES
 */
export function issueSource(item, owner) {
    const body = String(item.body ?? "");
    const lines = body.split("\n");
    const marked = lines.some((l) => l.startsWith(FLAKY_MARKER) || l.startsWith(INCIDENT_MARKER));
    if (marked || /^(Flaky test|Intermittent failure): /.test(item.title ?? "")) return "githerd";
    if (isBot(item.user)) return "ci-bot";
    if (owner && item.user?.login !== owner) return "other";
    // ponytail: text heuristic; a session-written marker in issue bodies would make it exact.
    const structured = /`|^#{1,3} |Found while|Seen 20\d\d/m.test(body);
    return structured || body.length >= 200 ? "claude" : "owner";
}

/**
 * How a closed issue was closed: `not-planned` (not planned or duplicate), `githerd` (a proposal
 * githerd carried out), `merged-pr` (a merged pull request in the data names it with a closing
 * keyword), else `other` (closed by hand, or by a pull request outside the data).
 * @param {any} item the closed issue
 * @param {Set<number>} fixedByMerge issues a merged pull request names
 * @param {Set<number>} githerdClosed issues githerd closed
 * @returns {string} one of HOWS
 */
export function closedHow(item, fixedByMerge, githerdClosed) {
    if (item.state_reason === "not_planned" || item.state_reason === "duplicate") return "not-planned";
    if (githerdClosed.has(item.number)) return "githerd";
    return fixedByMerge.has(item.number) ? "merged-pr" : "other";
}

/**
 * The issues githerd closed through a proposal, from the daemon state.
 * @param {any} state the daemon state (or null)
 * @returns {Set<number>} the issue numbers
 */
export function githerdClosedIssues(state) {
    return new Set(
        Object.values(state?.proposals ?? {})
            .filter((p) => p?.status === "closed" && !p.dryRun && String(p.target).startsWith("issue:"))
            .map((p) => Number(String(p.target).slice(6))),
    );
}

/**
 * Builds the records of the given days from GitHub's lists.
 * @param {{items: any[], runs: any[], releases: any[], days: string[], owner: string | null,
 *   githerdClosed: Set<number>, sourceOf: (day: string) => DayRecord["source"], at: string}} input
 *   `items` from the issues list (pull requests included), `runs` the failed runs of the required
 *   lanes' workflows
 * @returns {DayRecord[]} one record per day
 */
export function dayRecords({ items, runs, releases, days, owner, githerdClosed, sourceOf, at }) {
    const issues = items.filter((i) => !i.pull_request && !labelsOf(i).includes(HEARTBEAT_LABEL));
    const prs = items.filter((i) => i.pull_request && !isBot(i.user));
    const fixedByMerge = new Set(
        prs
            .filter((p) => p.pull_request.merged_at)
            .flatMap((p) => [...`${p.title}\n${p.body ?? ""}`.matchAll(CLOSES)].map((m) => Number(m[1]))),
    );
    return days.map((day) => {
        const end = Date.parse(`${day}T00:00:00Z`) + DAY_MS;
        /** @type {Window} */
        const w = {
            on: (t) => Boolean(t) && dayOf(/** @type {string} */ (t)) === day,
            openAtEnd: (i) => Date.parse(i.created_at) < end && (!i.closed_at || Date.parse(i.closed_at) >= end),
        };
        return {
            day,
            source: sourceOf(day),
            at,
            ...issueCounts(issues, w, owner, fixedByMerge, githerdClosed),
            prs: prCounts(prs, runs, w),
            releases: new Set(releases.filter((r) => w.on(r.created_at)).map((r) => r.created_at.slice(0, 16))).size,
        };
    });
}

/**
 * @typedef {{on: (t: string | null | undefined) => boolean, openAtEnd: (i: any) => boolean}} Window
 *   whether a time falls on the day, and whether an issue was open at its end
 */

/**
 * A day's issue counts and its oldest open bugs.
 * @param {any[]} issues the issues
 * @param {Window} w the day
 * @param {string | null} owner the owner's login
 * @param {Set<number>} fixedByMerge issues a merged pull request names
 * @param {Set<number>} githerdClosed issues githerd closed
 * @returns {Pick<DayRecord, "open" | "opened" | "closed" | "oldestBugs">} the counts
 */
function issueCounts(issues, w, owner, fixedByMerge, githerdClosed) {
    const open = { type: zeros(TYPES), priority: zeros(PRIORITIES) };
    const opened = { type: zeros(TYPES), source: zeros(SOURCES) };
    const closed = { type: zeros(TYPES), how: zeros(HOWS) };
    for (const i of issues) {
        const type = issueType(i);
        if (w.on(i.created_at)) {
            opened.type[type]++;
            opened.source[issueSource(i, owner)]++;
        }
        if (i.state === "closed" && w.on(i.closed_at)) {
            closed.type[type]++;
            closed.how[closedHow(i, fixedByMerge, githerdClosed)]++;
        }
        if (w.openAtEnd(i)) {
            open.type[type]++;
            open.priority[issuePriority(i)]++;
        }
    }
    const bugs = issues.filter((i) => issueType(i) === "bug" && w.openAtEnd(i));
    bugs.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    /** @type {DayRecord["oldestBugs"]} */
    const oldestBugs = {};
    for (const p of PRIORITIES) {
        const oldest = bugs.filter((i) => issuePriority(i) === p).slice(0, 3);
        if (oldest.length) {
            oldestBugs[p] = oldest.map((i) => ({
                number: i.number,
                title: String(i.title).slice(0, 70),
                opened: dayOf(i.created_at),
            }));
        }
    }
    return { open, opened, closed, oldestBugs };
}

/**
 * A day's pull request counts: opened, merged (with hours from opening to merge), closed unmerged,
 * the pull request heads whose required lanes failed, and the merge queue's failed batches.
 * @param {any[]} prs the pull requests
 * @param {any[]} runs the failed runs of the required lanes
 * @param {Window} w the day
 * @returns {DayRecord["prs"]} the counts
 */
function prCounts(prs, runs, w) {
    const out = {
        opened: 0,
        merged: 0,
        closedUnmerged: 0,
        ciFailed: 0,
        dequeues: 0,
        mergeHours: /** @type {number[]} */ ([]),
    };
    for (const p of prs) {
        const merged = p.pull_request.merged_at;
        if (w.on(p.created_at)) out.opened++;
        if (w.on(merged)) {
            out.merged++;
            out.mergeHours.push(Math.round((Date.parse(merged) - Date.parse(p.created_at)) / 360_000) / 10);
        } else if (!merged && w.on(p.closed_at)) out.closedUnmerged++;
    }
    // A draft's run fails in a minute or two without testing anything ("draft: CI not run").
    // ponytail: duration cut; the run's jobs would say so exactly, at one call per run.
    const tested = (/** @type {any} */ r) =>
        Date.parse(r.updated_at) - Date.parse(r.run_started_at ?? r.created_at) >= TESTED_MS;
    const failed = runs.filter((r) => w.on(r.created_at) && tested(r));
    const queue = failed.filter((r) => String(r.head_branch).startsWith(QUEUE_BRANCH));
    out.dequeues = new Set(queue.map((r) => r.head_sha)).size;
    out.ciFailed = new Set(
        failed.filter((r) => r.event === "pull_request" && !queue.includes(r)).map((r) => r.head_sha),
    ).size;
    return out;
}

/**
 * Reads every page of a list endpoint, 100 at a time, refusing to start a page while GitHub's core
 * budget is below `minRemaining`.
 * @param {any} github the client of github.mjs
 * @param {string} path the endpoint with its query
 * @param {number} minRemaining the budget floor
 * @param {(page: any[]) => boolean} [enough] true when no older page is needed
 * @returns {Promise<any[]>} every item
 */
async function allPages(github, path, minRemaining, enough = () => false) {
    const all = [];
    for (let page = 1; ; page++) {
        // A list that never ends (an endpoint that ignores `page`) must not spend the shared budget.
        if (page > MAX_PAGES) throw new Error(`stats stopped: ${path} has more than ${MAX_PAGES} pages`);
        const left = github.rate.counters.core?.remaining;
        if (left !== undefined && left < minRemaining) {
            throw new Error(`stats stopped: ${left} core calls left, below ${minRemaining}`);
        }
        const body = (await github.get(`${path}&per_page=100&page=${page}`, { cache: false })).body;
        const list = Array.isArray(body) ? body : (body?.workflow_runs ?? []);
        all.push(...list);
        if (list.length < 100 || enough(list)) return all;
    }
}

/**
 * The history, one record per day (a later line for a day replaces an earlier one), oldest first.
 * @param {string} stateDir the state directory
 * @returns {DayRecord[]} the records
 */
export function readHistory(stateDir) {
    let text = "";
    try {
        text = readFileSync(join(stateDir, HISTORY_FILE), "utf8");
    } catch {
        return [];
    }
    /** @type {Map<string, DayRecord>} */
    const byDay = new Map();
    for (const line of text.split("\n")) {
        try {
            const rec = JSON.parse(line);
            if (typeof rec?.day === "string") byDay.set(rec.day, rec);
        } catch {
            // a torn last line
        }
    }
    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Records every day of the last `days` complete UTC days that the history lacks: the daemon calls it
 * at its first poll of a new UTC day (yesterday's record), and `githerd stats --backfill` once.
 * @param {{github: any, config: any, stateDir: string, owner: string | null, githerdClosed: Set<number>,
 *   now: Date, days?: number, poll?: boolean, minRemaining?: number}} options `poll` marks
 *   yesterday's record as the poll's own rather than a backfill
 * @returns {Promise<DayRecord[]>} the records written
 */
export async function recordMissingDays({
    github,
    config,
    stateDir,
    owner,
    githerdClosed,
    now,
    days = 56,
    poll = false,
    minRemaining = MIN_REMAINING,
}) {
    const have = new Set(readHistory(stateDir).map((r) => r.day));
    const today = Date.parse(`${dayOf(now)}T00:00:00Z`);
    const missing = [];
    for (let d = days; d >= 1; d--) {
        const day = dayOf(today - d * DAY_MS);
        if (!have.has(day)) missing.push(day);
    }
    if (!missing.length) return [];
    const since = `${missing[0]}T00:00:00Z`;
    const r = `repos/${config.repo}/`;
    const items = new Map();
    for (const i of await allPages(github, `${r}issues?state=all&since=${since}`, minRemaining)) items.set(i.number, i);
    for (const i of await allPages(github, `${r}issues?state=open`, minRemaining)) items.set(i.number, i);
    const runs = [];
    for (const lane of Object.values(config.lanes ?? {})) {
        if (lane?.gating !== "required") continue;
        // ponytail: GitHub lists at most 1000 runs per query; split the window if a lane fails more.
        const path = `${r}actions/workflows/${lane.workflow}/runs?status=failure&created=>=${missing[0]}`;
        runs.push(...(await allPages(github, path, minRemaining)));
    }
    const releases = await allPages(github, `${r}releases?`, minRemaining, (page) =>
        page.some((x) => x.created_at < since),
    );
    const yesterday = dayOf(today - DAY_MS);
    const records = dayRecords({
        items: [...items.values()],
        runs,
        releases,
        days: missing,
        owner,
        githerdClosed,
        sourceOf: (day) => (poll && day === yesterday ? "poll" : "backfill"),
        at: now.toISOString(),
    });
    appendFileSync(join(stateDir, HISTORY_FILE), records.map((x) => `${JSON.stringify(x)}\n`).join(""));
    return records;
}

/**
 * Adds counts into a total.
 * @param {Record<string, number>} into the total
 * @param {Record<string, number> | undefined} add the counts
 */
function addInto(into, add) {
    for (const [k, v] of Object.entries(add ?? {})) into[k] = (into[k] ?? 0) + v;
}

/**
 * The median of some numbers.
 * @param {number[]} xs the numbers
 * @returns {number | null} the median, or null for none
 */
function median(xs) {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * The report: 8 weeks ending at the latest recorded day, the inflow by source against the outflow,
 * the pull requests, and what is stalled.
 * @param {DayRecord[]} history the records, oldest first
 * @returns {any} the report, or null when there is no history
 */
export function statsReport(history) {
    if (!history.length) return null;
    const byDay = new Map(history.map((r) => [r.day, r]));
    const last = Date.parse(`${history.at(-1)?.day}T00:00:00Z`);
    /**
     * The record of a day, or of the latest recorded day before it within `back` days.
     * @param {number} t the day's start
     * @param {number} back how many days to look back
     * @returns {DayRecord | undefined} the record
     */
    const at = (t, back) => {
        for (let d = 0; d <= back; d++) {
            const r = byDay.get(dayOf(t - d * DAY_MS));
            if (r) return r;
        }
        return undefined;
    };
    const weeks = [];
    for (let w = 7; w >= 0; w--) {
        const end = last - w * 7 * DAY_MS;
        const recs = [];
        for (let d = 6; d >= 0; d--) {
            const r = byDay.get(dayOf(end - d * DAY_MS));
            if (r) recs.push(r);
        }
        const sum = (/** @type {(r: DayRecord) => Record<string, number>} */ pick) => {
            /** @type {Record<string, number>} */
            const total = {};
            for (const r of recs) addInto(total, pick(r));
            return total;
        };
        const prs = sum((r) => ({
            opened: r.prs.opened,
            merged: r.prs.merged,
            closedUnmerged: r.prs.closedUnmerged,
            ciFailed: r.prs.ciFailed,
            dequeues: r.prs.dequeues,
        }));
        weeks.push({
            from: dayOf(end - 6 * DAY_MS),
            to: dayOf(end),
            days: recs.length,
            backfilled: recs.filter((r) => r.source === "backfill").length,
            opened: sum((r) => r.opened.type),
            closed: sum((r) => r.closed.type),
            openAtEnd: at(end, 6)?.open.type ?? null,
            sources: sum((r) => r.opened.source),
            hows: sum((r) => r.closed.how),
            prs: { ...prs, medianMergeHours: median(recs.flatMap((r) => r.prs.mergeHours)) },
            releases: recs.reduce((n, r) => n + r.releases, 0),
        });
    }
    const latest = /** @type {DayRecord} */ (history.at(-1));
    const before = at(last - 14 * DAY_MS, 6);
    const stalled = before
        ? [
              ...TYPES.map((k) => ({ what: k, before: before.open.type[k], now: latest.open.type[k] })),
              ...PRIORITIES.map((k) => ({
                  what: `priority:${k}`,
                  before: before.open.priority[k],
                  now: latest.open.priority[k],
              })),
          ].filter((s) => s.now > 0 && s.now >= s.before)
        : null;
    const recent = weeks.slice(-4);
    const trend = TYPES.map((type) => {
        const net = recent.reduce((n, w) => n + (w.opened[type] ?? 0) - (w.closed[type] ?? 0), 0);
        const perWeek = net / 4;
        const open = latest.open.type[type];
        return { type, net4w: net, perWeek, open, weeksToZero: perWeek < 0 ? Math.ceil(open / -perWeek) : null };
    });
    return {
        through: latest.day,
        stalledSince: before?.day ?? null,
        backfilledDays: history.filter((r) => r.source === "backfill").length,
        weeks,
        stalled,
        oldestBugs: latest.oldestBugs,
        trend,
    };
}

/**
 * A signed number.
 * @param {number} n the number
 * @returns {string} `+3`, `-2`, `0`
 */
const signed = (n) => (n > 0 ? `+${n}` : String(n));

/**
 * Lays rows out as columns.
 * @param {string[][]} rows the rows, the header first
 * @returns {string[]} the lines
 */
function table(rows) {
    const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => r[c].length)));
    return rows.map((r) =>
        r
            .map((cell, c) => cell.padEnd(widths[c]))
            .join("  ")
            .trimEnd(),
    );
}

/**
 * The weekly issue table.
 * @param {any[]} weeks the report's weeks
 * @returns {string[]} the lines
 */
function issueTable(weeks) {
    const rows = weeks.map((w) => {
        const cell = (/** @type {string} */ t) => {
            const o = w.opened[t] ?? 0;
            const c = w.closed[t] ?? 0;
            return `${o}/${c} ${signed(o - c)} (${w.openAtEnd?.[t] ?? "?"})`;
        };
        const o = TYPES.reduce((n, t) => n + (w.opened[t] ?? 0), 0);
        const c = TYPES.reduce((n, t) => n + (w.closed[t] ?? 0), 0);
        const open = w.openAtEnd ? TYPES.reduce((n, t) => n + w.openAtEnd[t], 0) : "?";
        return [w.from, ...TYPES.map(cell), `${o}/${c} ${signed(o - c)} (${open})`];
    });
    return [
        "Issues per week: opened/closed net (open at week end)",
        ...table([["week of", ...TYPES, "total"], ...rows]),
    ];
}

/**
 * The weekly inflow by source against the outflow by how.
 * @param {any[]} weeks the report's weeks
 * @returns {string[]} the lines
 */
function flowTable(weeks) {
    const rows = weeks.map((w) => {
        const inflow = SOURCES.reduce((n, s) => n + (w.sources[s] ?? 0), 0);
        const outflow = HOWS.reduce((n, h) => n + (w.hows[h] ?? 0), 0);
        return [
            w.from,
            ...SOURCES.map((s) => String(w.sources[s] ?? 0)),
            ...HOWS.map((h) => String(w.hows[h] ?? 0)),
            signed(inflow - outflow),
        ];
    });
    const header = ["week of", ...SOURCES.map((s) => `in:${s}`), ...HOWS.map((h) => `out:${h}`), "net"];
    return [
        "Where issues come from (opened by source) and how they leave (closed by how)",
        ...table([header, ...rows]),
    ];
}

/**
 * The weekly pull request table.
 * @param {any[]} weeks the report's weeks
 * @returns {string[]} the lines
 */
function prTable(weeks) {
    const header = ["week of", "opened", "merged", "closed unmerged", "CI-failed heads", "dequeues"];
    const rows = weeks.map((w) => [
        w.from,
        ...["opened", "merged", "closedUnmerged", "ciFailed", "dequeues"].map((k) => String(w.prs[k] ?? 0)),
        w.prs.medianMergeHours === null ? "-" : String(w.prs.medianMergeHours),
        String(w.releases),
    ]);
    return [
        "Pull requests per week (bots' pull requests and the merge queue's drafts left out)",
        ...table([[...header, "median hours to merge", "releases"], ...rows]),
    ];
}

/**
 * What is stalled: open counts that did not fall, the oldest open bugs, and the net trend.
 * @param {any} report the report
 * @returns {string[]} the lines
 */
function stalledLines(report) {
    let counts;
    if (report.stalled === null) counts = ["  not enough history to compare with two weeks ago"];
    else if (report.stalled.length) {
        counts = [
            `  open counts that did not fall since ${report.stalledSince}:`,
            ...report.stalled.map((/** @type {any} */ s) => `    ${s.what}: ${s.before} -> ${s.now}`),
        ];
    } else counts = [`  every open count fell since ${report.stalledSince}`];
    const bugs = Object.entries(report.oldestBugs ?? {}).flatMap(([p, list]) =>
        /** @type {any[]} */ (list).map((b) => `    ${p.padEnd(8)} #${b.number} since ${b.opened}: ${b.title}`),
    );
    const trend = report.trend.map((/** @type {any} */ t) => {
        const when = t.weeksToZero === null ? "never at this rate" : `about ${t.weeksToZero} weeks`;
        return `    ${t.type.padEnd(14)} net ${signed(t.net4w)} (${signed(t.perWeek)}/week), ${t.open} open: ${when}`;
    });
    return [
        "Stalled",
        ...counts,
        "  oldest open bugs by priority:",
        ...bugs,
        "  net flow over the last 4 weeks, and weeks to zero at that rate:",
        ...trend,
    ];
}

/**
 * The report as plain ASCII.
 * @param {any} report what `statsReport` answered
 * @returns {string} the text
 */
export function statsText(report) {
    if (!report)
        return "no statistics yet: githerd records a day at its first poll of the next UTC day, or run githerd stats --backfill";
    const { weeks } = report;
    const backfilled = report.backfilledDays
        ? [
              `${report.backfilledDays} days were backfilled from GitHub's history: their type and priority come from the`,
              "labels issues carry now, not the labels they had that day.",
          ]
        : [];
    return [
        `githerd stats through ${report.through} (UTC days; weeks end on the latest recorded day)`,
        "",
        ...issueTable(weeks),
        "",
        ...flowTable(weeks),
        "",
        ...prTable(weeks),
        "",
        ...stalledLines(report),
        "",
        "Notes: sources split the owner's login by the issue's text (a structured report is a Claude session's,",
        "githerd's workers included; a line or two is the owner's by hand). merged-pr means a merged pull request",
        "names the issue with a closing keyword. CI-failed heads and dequeues count failed runs of required lanes.",
        ...backfilled,
    ].join("\n");
}
