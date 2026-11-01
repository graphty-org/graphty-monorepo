// The Issues page (design section 2.6): how many issues are open by type and priority, whether the open bugs go down,
// how many are opened and closed per day or week, and the oldest urgent bugs. It shows facts and no SLA state: open
// critical bugs never reach zero by design, so a judged member would sit yellow for good.
//
// Every number is counted here from the stored issues (the ISSUES partition), never from rollups: an issue's type
// and priority are its labels now, applied to its whole history, and an issue reopened after a close counts as open
// over its whole life (GitHub keeps only its last closedAt).

import type {
    Cell,
    Fact,
    IssueRange,
    PageResponse,
    Section,
    SeriesSection,
    TableRow,
    TableSection,
} from "../../web/src/contract.js";
import { DAY, type IssueItem } from "../model/items.js";

/** Type labels, in the order that decides an issue's type when it carries more than one. */
export const TYPES = [
    "bug",
    "enhancement",
    "documentation",
    "research",
    "infrastructure",
    "tracking",
    "sonarqube",
    "dead-links",
    "ci-budget",
    "intermittent",
    "flaky",
] as const;
export const PRIOS = ["critical", "high", "medium", "low"] as const;
export type IssueType = (typeof TYPES)[number] | "none";
export type IssuePrio = (typeof PRIOS)[number] | "none";
/**
 * The chart groups of types: the five common ones, every other type as "other", and no type at all. Infrastructure
 * sits between documentation and research so no two neighbors in the stack are hard to tell apart (dataviz check).
 */
const GROUPS = ["bug", "enhancement", "documentation", "infrastructure", "research", "other", "none"] as const;
type Group = (typeof GROUPS)[number];
const STATUSES = ["in-progress", "blocked", "needs-decision", "needs-info"];
const WEEK = 7 * DAY;
/** 1970-01-05, a Monday: weeks start here plus a multiple of 7 days. */
const MONDAY = 4 * DAY;

type Issue = Pick<IssueItem, "labels" | "createdAt" | "closedAt">;

/**
 * An issue's type: the first of TYPES its labels hold, else none.
 * @param i - the issue
 * @returns its type
 */
export const typeOf = (i: Pick<IssueItem, "labels">): IssueType => TYPES.find((t) => i.labels.includes(t)) ?? "none";

/**
 * An issue's priority: the first priority label it carries, most urgent first, else none.
 * @param i - the issue
 * @returns its priority
 */
export const prioOf = (i: Pick<IssueItem, "labels">): IssuePrio =>
    PRIOS.find((p) => i.labels.includes(`priority:${p}`)) ?? "none";

const groupOf = (t: IssueType): Group => ((GROUPS as readonly string[]).includes(t) ? (t as Group) : "other");

/**
 * Whether an issue is open at a moment: opened before it and not closed before it. Half-open like the buckets, so
 * the open count at a bucket's end less the count at its start is that bucket's opened less closed, exactly.
 * @param i - the issue
 * @param t - the moment, epoch ms
 * @returns true when open at t
 */
export const openAt = (i: Issue, t: number): boolean =>
    i.createdAt < t && (i.closedAt === undefined || i.closedAt >= t);

/** The time buckets of a range: their starts, and each one's end (the last ends now). */
export interface Buckets {
    step: "1d" | "1w";
    starts: number[];
    ends: number[];
}

/**
 * The buckets of a range: the last 28 UTC days, or weeks from the Monday of the first issue's week; the last bucket
 * holds now and ends there (a millisecond after it).
 * @param range - 28d or all
 * @param now - the current time, epoch ms
 * @param first - the first issue's creation time, epoch ms
 * @returns the buckets, oldest first
 */
export function buckets(range: IssueRange, now: number, first: number): Buckets {
    const size = range === "28d" ? DAY : WEEK;
    const start =
        range === "28d" ? Math.floor(now / DAY) * DAY - 27 * DAY : Math.floor((first - MONDAY) / WEEK) * WEEK + MONDAY;
    const starts: number[] = [];
    for (let s = start; s <= now; s += size) {
        starts.push(s);
    }
    // The last bucket ends just after now, so an issue opened at this very moment is open at its end.
    return { step: range === "28d" ? "1d" : "1w", starts, ends: starts.map((s) => Math.min(s + size, now + 1)) };
}

/** Opened and closed per bucket, closed split by why. */
interface Flow {
    opened: number[];
    completed: number[];
    notPlanned: number[];
}

/**
 * Opened and closed per bucket among the issues `keep` accepts.
 * @param issues - every stored issue
 * @param b - the buckets
 * @param keep - which issues to count
 * @returns the counts per bucket
 */
function flowOf(issues: IssueItem[], b: Buckets, keep: (i: IssueItem) => boolean): Flow {
    const zero = (): number[] => b.starts.map(() => 0);
    const out: Flow = { opened: zero(), completed: zero(), notPlanned: zero() };
    const size = b.step === "1d" ? DAY : WEEK;
    const at = (t: number): number => (t < b.starts[0] ? -1 : Math.floor((t - b.starts[0]) / size));
    for (const i of issues.filter(keep)) {
        const k = at(i.createdAt);
        if (k >= 0 && k < b.starts.length) {
            out.opened[k]++;
        }
        const c = i.closedAt === undefined ? -1 : at(i.closedAt);
        if (c >= 0 && c < b.starts.length) {
            (i.stateReason === "completed" ? out.completed : out.notPlanned)[c]++;
        }
    }
    return out;
}

/**
 * The open count at the range's start and then at each bucket's end among the issues `keep` accepts, so a line starts
 * at the count the range's change is measured from.
 * @param issues - every stored issue
 * @param b - the buckets
 * @param keep - which issues to count
 * @returns one count more than there are buckets
 */
const stock = (issues: IssueItem[], b: Buckets, keep: (i: IssueItem) => boolean): number[] => {
    const kept = issues.filter(keep);
    return [b.starts[0], ...b.ends].map((t) => kept.filter((i) => openAt(i, t)).length);
};

const sum = (xs: number[]): number => xs.reduce((a, x) => a + x, 0);
const isBug = (i: IssueItem): boolean => typeOf(i) === "bug";
const all = (): boolean => true;
const f = (code: string, params?: Fact["params"]): Fact => (params ? { code, params } : { code });

/** What one page build reads: the issues, the buckets, the range and the repository the links point at. */
interface Ctx {
    issues: IssueItem[];
    b: Buckets;
    range: IssueRange;
    repo: string;
}

/**
 * Stock lines: each one's open count at the range's start and at every bucket's end.
 * @param c - the build's context
 * @param lines - each line's label code and which issues it counts
 * @returns the series
 */
const lines = (c: Ctx, lines: [string, (i: IssueItem) => boolean][]): { key: string; values: number[] }[] =>
    lines.map(([key, keep]) => ({ key, values: stock(c.issues, c.b, keep) }));
/**
 * A stock line's last value, now.
 * @param l - the line
 * @param l.values - its values
 * @returns the value
 */
const last = (l: { values: number[] }): number => l.values.at(-1) ?? 0;
/**
 * How much a stock line changed over the range: its last value less its first, the count at the range's start.
 * @param l - the line
 * @param l.values - its values
 * @returns the change
 */
const change = (l: { values: number[] }): number => last(l) - (l.values[0] ?? 0);

const series = (
    c: Ctx,
    id: string,
    chart: SeriesSection["chart"],
    data: { key: string; values: number[] }[],
    sub: Fact,
): SeriesSection => ({
    kind: "series",
    id,
    chart,
    step: c.b.step,
    start: new Date(c.b.starts[0]).toISOString(),
    series: data.map(({ key, values }) => ({ key, values })),
    sub,
});

/**
 * Open bugs by priority at each bucket's end, stacked critical first so the top edge is every open bug: the
 * burn-down. A "none" band only when some bug ever lacked a priority.
 * @param c - the build's context
 * @returns the section
 */
function bugsSection(c: Ctx): SeriesSection {
    const ls = lines(
        c,
        [...PRIOS, "none" as const].map((p): [string, (i: IssueItem) => boolean] => [
            `issues.prio.${p}`,
            (i) => isBug(i) && prioOf(i) === p,
        ]),
    ).filter((l) => l.key !== "issues.prio.none" || l.values.some((v) => v > 0));
    const total = { values: ls[0].values.map((_, k) => sum(ls.map((l) => l.values[k]))) };
    const critical = ls[0];
    return series(
        c,
        "bugs",
        "area",
        ls,
        f("issues.sub.bugs", {
            open: last(total),
            change: change(total),
            critical: last(critical),
            criticalChange: change(critical),
            range: c.range,
        }),
    );
}

/**
 * Opened against closed per bucket (closed split into completed and not planned) and their difference.
 * @param c - the build's context
 * @param id - the section id
 * @param keep - which issues to count
 * @returns the section
 */
function flowSection(c: Ctx, id: string, keep: (i: IssueItem) => boolean): SeriesSection {
    const fl = flowOf(c.issues, c.b, keep);
    const net = fl.opened.map((o, k) => o - fl.completed[k] - fl.notPlanned[k]);
    const opened = sum(fl.opened);
    const closed = sum(fl.completed) + sum(fl.notPlanned);
    return series(
        c,
        id,
        "flow",
        [
            { key: "issues.series.opened", values: fl.opened },
            { key: "issues.series.closed_completed", values: fl.completed },
            { key: "issues.series.closed_not_planned", values: fl.notPlanned },
            { key: "issues.series.net", values: net },
        ],
        f("issues.sub.flow", { opened, closed, net: opened - closed, range: c.range }),
    );
}

/**
 * Open issues by type at each bucket's end: all, bugs, enhancements, and the rest (every other type and no type,
 * named apart from the opened chart's "other types", which leaves out the types it draws on their own).
 * @param c - the build's context
 * @returns the section
 */
function backlogSection(c: Ctx): SeriesSection {
    const ls = lines(c, [
        ["issues.series.open", all],
        ["issues.type.bug", isBug],
        ["issues.type.enhancement", (i) => typeOf(i) === "enhancement"],
        ["issues.group.rest", (i) => typeOf(i) !== "bug" && typeOf(i) !== "enhancement"],
    ]);
    const [total, , enh] = ls;
    return series(
        c,
        "backlog",
        "lines",
        ls,
        f("issues.sub.open", {
            open: last(total),
            change: change(total),
            enhancements: last(enh),
            enhancementsChange: change(enh),
            range: c.range,
        }),
    );
}

/**
 * Issues opened per bucket, stacked by type group; groups with none in the range are left out.
 * @param c - the build's context
 * @returns the section
 */
function typesSection(c: Ctx): SeriesSection {
    const data = GROUPS.map((g) => ({
        key: g === "other" ? "issues.group.other" : `issues.type.${g}`,
        values: flowOf(c.issues, c.b, (i) => groupOf(typeOf(i)) === g).opened,
    })).filter((s) => s.values.some((v) => v > 0));
    const opened = sum(data.flatMap((s) => s.values));
    return series(c, "types", "stacked", data, f("issues.sub.types", { opened, range: c.range }));
}

/**
 * GitHub's issue search for the open issues counted as one type: its label without any type that comes before it in
 * TYPES (an issue labeled bug and enhancement is a bug, so the enhancement search leaves it out); "none" excludes
 * every type label.
 * @param repo - owner/name
 * @param t - the type, or undefined for every open issue
 * @returns the search URL
 */
function searchLink(repo: string, t?: IssueType): string {
    let labels = "";
    if (t) {
        const at = t === "none" ? TYPES.length : TYPES.indexOf(t);
        labels =
            (t === "none" ? "" : ` label:${t}`) +
            TYPES.slice(0, at)
                .map((x) => ` -label:${x}`)
                .join("");
    }
    return `https://github.com/${repo}/issues?q=${encodeURIComponent(`is:issue is:open${labels}`)}`;
}

/**
 * Open issues now by type and priority: a row per type that has one (bug and enhancement always), then the total.
 * @param c - the build's context
 * @param open - the issues open now
 * @returns the section
 */
function openTable(c: Ctx, open: IssueItem[]): TableSection {
    const row = (code: string, of: IssueItem[]): Record<string, Cell> => ({
        type: { t: "label", code },
        ...Object.fromEntries(
            [...PRIOS, "none" as const].map((p) => [p, { t: "num", n: of.filter((i) => prioOf(i) === p).length }]),
        ),
        total: { t: "num", n: of.length, bold: true },
    });
    const types = [...TYPES, "none" as const].filter(
        (t) => t === "bug" || t === "enhancement" || open.some((i) => typeOf(i) === t),
    );
    const rows: TableRow[] = types.map((t) => ({
        cells: row(
            `issues.type.${t}`,
            open.filter((i) => typeOf(i) === t),
        ),
        link: searchLink(c.repo, t),
    }));
    rows.push({ cells: row("issues.total", open), total: true, link: searchLink(c.repo) });
    return { kind: "table", id: "open", rows };
}

/**
 * Every open critical or high bug, critical first, then the oldest first, with its status labels.
 * @param open - the issues open now
 * @returns the section, or a sentence when there is none
 */
function oldestTable(open: IssueItem[]): TableSection | Section {
    const urgent = open.filter((i) => isBug(i) && (prioOf(i) === "critical" || prioOf(i) === "high"));
    urgent.sort(
        (a, b) => Number(prioOf(b) === "critical") - Number(prioOf(a) === "critical") || a.createdAt - b.createdAt,
    );
    const rows: TableRow[] = urgent.map((i) => {
        const status = STATUSES.filter((s) => i.labels.includes(s));
        return {
            cells: {
                issue: { t: "issue", n: i.number },
                priority: { t: "label", code: `issues.prio.${prioOf(i)}` },
                title: i.title ? { t: "name", v: i.title } : { t: "none" },
                opened: { t: "ago", at: new Date(i.createdAt).toISOString() },
                status: status.length ? { t: "list", items: status.map((v) => ({ t: "name", v })) } : { t: "none" },
            },
        };
    });
    return rows.length
        ? { kind: "table", id: "oldest", rows }
        : { kind: "empty", id: "oldest", fact: f("issues.no_urgent") };
}

/**
 * The Issues page at a range.
 * @param issues - every stored issue
 * @param range - 28d (by day) or all (by week)
 * @param now - the current time, epoch ms
 * @param githubOpen - GitHub's count of open issues, when the collector recorded it
 * @returns the page payload
 */
export function issuesPage(
    issues: IssueItem[],
    range: IssueRange,
    now: number,
    githubOpen: number | undefined,
): PageResponse {
    const base = { page: "issues" as const, range, generated: new Date(now).toISOString(), state: "idle" as const };
    if (!issues.length) {
        const none: Section = { kind: "empty", id: "none", fact: f("issues.none_collected") };
        return { ...base, others: [], notes: [], members: [], sections: [none] };
    }
    const first = Math.min(...issues.map((i) => i.createdAt));
    const c: Ctx = { issues, b: buckets(range, now, first), range, repo: issues[0].repo };
    const open = issues.filter((i) => openAt(i, c.b.ends.at(-1) ?? now));
    const notes = [f("issues.labels_now"), f("issues.production")];
    if (githubOpen !== undefined && githubOpen !== open.length) {
        notes.push(f("issues.github_open", { stored: open.length, github: githubOpen }));
    }
    return {
        ...base,
        others: [],
        notes,
        members: [],
        sections: [
            openTable(c, open),
            bugsSection(c),
            flowSection(c, "bug-flow", isBug),
            flowSection(c, "flow", all),
            backlogSection(c),
            typesSection(c),
            oldestTable(open),
        ],
    };
}
