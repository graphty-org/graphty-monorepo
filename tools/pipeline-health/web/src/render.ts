/**
 * The views: the overview, the category pages, Runners, Local runs and a test's history. Each
 * function returns HTML for `main`; every API value is escaped by the text helpers.
 */
import { budgetBar, chev, hiddenTable, jobsChart, minuteStrip, sortedBars, sparkline, treeRows } from "./charts";
import type {
    BarsSection,
    CategoryState,
    CategoryStatus,
    Cell,
    ChannelTile,
    Episode,
    Member,
    MemberRef,
    OverviewResponse,
    PageId,
    PageResponse,
    Range,
    Section,
    JobsSection,
    ShardsSection,
    SlowRange,
    StatusResponse,
    TableSection,
    TestHistoryResponse,
    TreeSection,
} from "./contract";
import {
    CATEGORY_NAME,
    CHANNEL,
    CHANNELS_HEAD,
    CHANNELS_SUB,
    EVENT,
    attemptText,
    attemptsLabel,
    channelSince,
    LABEL,
    MEMBER,
    REPO,
    STATE_WORD,
    bigValue,
    capital,
    fewText,
    partialText,
    showsRangeValue,
    clock,
    esc,
    fmtAgo,
    fmtDur,
    fmtN,
    fmtSpan,
    fmtTime,
    fmtUnit,
    fmtValue,
    isMuted,
    issueLink,
    memberLine,
    prLink,
    rangeLabel,
    refText,
    runLink,
    sentence,
    shaLink,
    slaText,
    stateChip,
    stateClass,
    unlinked,
    windowLabel,
} from "./text";

/** Where the reader is: a view, an optional section, the picked range and the slow sections' choices. */
export interface Here {
    page: PageId | "test";
    section?: string;
    range: Range | SlowRange;
    q: URLSearchParams;
}

export const PAGE_PATH: Record<PageId, string> = {
    overview: "/",
    master: "/master",
    "pull-requests": "/pull-requests",
    ci: "/ci",
    runners: "/ci/runners",
    "local-runs": "/ci/local-runs",
    flaky: "/flaky",
    releases: "/releases",
    costs: "/costs",
    "data-sources": "/data-sources",
};

export const PAGE_TITLE: Record<Exclude<PageId, "overview">, string> = {
    ...CATEGORY_NAME,
    runners: "Runners",
    "local-runs": "Local runs",
};

/** A catalog label: the LABEL entry, else a member's name ("member.<id>") or a page's title ("page.<id>"). */
export function labelText(code: string): string {
    if (LABEL[code] !== undefined) return LABEL[code];
    const [kind, ...rest] = code.split(".");
    const id = rest.join(".");
    if (kind === "member" && id in MEMBER) return esc(MEMBER[id as keyof typeof MEMBER].name);
    if (kind === "page" && id in PAGE_TITLE) return esc(PAGE_TITLE[id as keyof typeof PAGE_TITLE]);
    return esc(code);
}

let here: Here = { page: "overview", range: "1h", q: new URLSearchParams() };
/** The Costs history the reader picked last, kept in every link to Costs. */
let costsRange: SlowRange | undefined;
export function setHere(h: Here): void {
    here = h;
    if (h.page === "costs" && h.q.has("range")) costsRange = h.range as SlowRange;
}

const isPickerRange = (r: string): r is Range => r === "1h" || r === "6h" || r === "24h";

/** A link to a route of the page, keeping the picked range; absolute URLs pass through. */
export function href(route: string, extra?: Record<string, string>): string {
    if (/^https?:/.test(route)) return esc(route);
    const [path, qs] = route.split("?");
    const q = new URLSearchParams(qs ?? "");
    if (!q.has("range") && path === "/costs" && costsRange) q.set("range", costsRange);
    if (!q.has("range") && isPickerRange(here.range) && path !== "/costs") q.set("range", here.range);
    for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v);
    const s = q.toString();
    return esc(`#${path}${s ? `?${s}` : ""}`);
}

/** The current view's URL with some query keys changed (the pickers). */
function hereWith(extra: Record<string, string>): string {
    const q = new URLSearchParams(here.q);
    for (const [k, v] of Object.entries(extra)) q.set(k, v);
    const path = here.page === "test" ? "/flaky/test" : PAGE_PATH[here.page];
    return esc(`#${path}${here.section && here.page !== "test" ? `/${here.section}` : ""}?${q.toString()}`);
}

// ---------------------------------------------------------------- frame

export function nav(status: StatusResponse | null, fixture: boolean): string {
    const st = (id: CategoryStatus["id"]) => status?.categories.find((c) => c.id === id)?.state;
    const cur =
        here.page === "test" ? "flaky" : here.page === "runners" || here.page === "local-runs" ? "ci" : here.page;
    const item = (id: "overview" | CategoryStatus["id"], sub = "") => {
        const s = id === "overview" ? undefined : st(id);
        const name = id === "overview" ? "Overview" : CATEGORY_NAME[id];
        const label = s ? `${name}: ${STATE_WORD[s]}` : name;
        const curCls = cur === id ? " cur" : "";
        return `<li><a class="ni${s ? ` ${stateClass(s)}` : ""}${curCls}" href="${href(PAGE_PATH[id])}" aria-label="${esc(label)}"${cur === id ? ' aria-current="page"' : ""}><span class="bar"></span>${esc(name)}</a>${cur === id ? sub : ""}</li>`;
    };
    const sub = (links: [string, string][]) =>
        `<ul class="sub open">${links.map(([r, n]) => `<li><a href="${href(r)}">${esc(n)}</a></li>`).join("")}</ul>`;
    return (
        `<nav class="side" aria-label="Pages"><div class="brand">Pipeline health</div><ul>` +
        item("overview") +
        item("master") +
        item("pull-requests") +
        item(
            "ci",
            sub([
                ["/ci/runners", "Runners"],
                ["/ci/shards", "Shard times"],
                ["/ci/local-runs", "Local runs"],
            ]),
        ) +
        item(
            "flaky",
            sub([
                ["/flaky/hotspots", "Hotspots"],
                ["/flaky/quarantine", "Quarantine"],
            ]),
        ) +
        item("releases") +
        item("costs") +
        item("data-sources") +
        `</ul>${fixture ? `<p class="sample">Fixture data: the incidents of 2026-10-25, as of 23:30 UTC</p>` : ""}</nav>`
    );
}

function rangePicker(slow: boolean): string {
    const opts: (Range | SlowRange)[] = slow ? ["7d", "28d"] : ["1h", "6h", "24h"];
    // Costs charts days while its money is always this month; a test's history only lists days.
    const label = here.page === "costs" ? "days in the charts (the money is always this month)" : "history";
    const links = opts
        .map(
            (r) =>
                `<a href="${hereWith({ range: r })}"${r === here.range ? ' class="on" aria-current="true"' : ""}>${rangeLabel(r)}</a>`,
        )
        .join("");
    return `<div class="range" role="group" aria-label="${slow ? "History" : "Range"}">${slow ? `<span class="rlab">${label}</span>` : ""}${links}</div>`;
}

function updated(generated: string): string {
    return `<span class="upd">updated ${fmtAgo(generated)}, ${fmtTime(generated).slice(-5)} UTC</span>`;
}

function header(
    title: string,
    crumbs: [string, string][],
    generated: string,
    slow = false,
    picker = true,
    section = "",
): string {
    // Opened at a section (a sub-item of the navigation): the page is a link and the section ends the trail.
    const path = here.page === "test" ? "/flaky" : PAGE_PATH[here.page];
    const trail: [string, string][] = section ? [...crumbs, [path, title]] : crumbs;
    const c = trail.length
        ? `<div class="crumbs">${trail.map(([r, n]) => `<a href="${href(r)}">${esc(n)}</a><span class="sep">&gt;</span>`).join("")}<span aria-current="page">${esc(section || title)}</span></div>`
        : "";
    return `<header class="ph">${c}<div class="phrow"><h1 tabindex="-1">${esc(title)}</h1>${picker ? rangePicker(slow) : ""}${updated(generated)}</div></header>`;
}

// ---------------------------------------------------------------- cells

/** Items a list cell shows before the rest becomes "+N more". */
const LIST_SHOWN = 3;

export function cellHtml(c: Cell): string {
    switch (c.t) {
        case "name":
            return c.bold ? `<b>${esc(c.v)}</b>` : esc(c.v);
        case "label":
            return labelText(c.code);
        case "num": {
            const s = c.unit === "usd" || c.unit === "count" || !c.unit ? fmtN(c.n) : fmtUnit(c.n, c.unit);
            const v = esc(s + (c.of !== undefined ? ` of ${fmtN(c.of)}` : ""));
            return c.bold ? `<b>${v}</b>` : v;
        }
        case "budget":
            return c.budget === null
                ? `${fmtN(c.so)}<small>no budget set</small>`
                : `${fmtN(c.so)} / ${fmtN(c.budget)}`;
        case "time":
            return fmtTime(c.at);
        case "span":
            return fmtSpan(c.start, c.end);
        case "dur":
            return fmtDur(c.s);
        case "ago":
            return fmtAgo(c.at);
        case "pr":
            return prLink(c.n);
        case "issue":
            return issueLink(c.n);
        case "run":
            return runLink(c.id);
        case "sha":
            return shaLink(c.v);
        case "fact":
            return sentence(c.fact);
        case "mark":
            return `<span class="mk ${c.state}">${cellHtml(c.cell)}</span>`;
        case "state": {
            const chip = c.state === "idle" ? `<span class="sw low">idle</span>` : stateChip({ state: c.state });
            return c.link ? `<a class="sw low ln" href="${href(c.link)}">${chip.replace(/<[^>]+>/g, "")}</a>` : chip;
        }
        case "spark":
            return sparkline(c.spark, clock.generated, "projection by day");
        case "list": {
            // Each item once, and three at most: the rest is a count.
            const seen = new Set<string>();
            const items = c.items.filter((i) => !seen.has(JSON.stringify(i)) && seen.add(JSON.stringify(i)));
            const sep = c.sep === "comma" ? ", " : c.sep === "line" ? "<br />" : " ";
            const more =
                items.length > LIST_SHOWN
                    ? `${sep}<span class="muted">+${fmtN(items.length - LIST_SHOWN)} more</span>`
                    : "";
            return items.slice(0, LIST_SHOWN).map(cellHtml).join(sep) + more;
        }
        case "sub":
            return `${cellHtml(c.main)}<small>${cellHtml(c.sub)}</small>`;
        case "none":
            return "";
    }
}

// ---------------------------------------------------------------- members

/** True when a member's link leads to the page the reader is on, with no section to scroll to. */
function linksHere(link: string): boolean {
    if (/^https?:/.test(link) || here.page === "test") return false;
    return link.split("?")[0] === PAGE_PATH[here.page];
}

const breached = (m: Member) => m.state === "warn" || m.state === "bad";

function memberRow(m: Member): string {
    const t = MEMBER[m.id];
    const dim = isMuted(m.state) && !(m.state === "few" && showsRangeValue(m, here.range)) ? " dim" : "";
    const sp = m.spark
        ? sparkline(
              m.spark,
              clock.generated,
              `${MEMBER[m.id].name} by ${m.spark.step === "15m" ? "15 minutes" : m.spark.step === "1h" ? "hour" : "day"}`,
          )
        : "";
    const val = m.state === "nodata" ? "--" : bigValue(m.value);
    // What red means is on every row ("If red:"), and reads "Red:" in ink when the row is past a line.
    const lead = breached(m) ? "Red: " : m.sla?.red ? "If red: " : "";
    const red = t.red ? `<small class="redm${breached(m) ? " on" : ""}">${lead}${esc(t.red)}</small>` : "";
    const title = t.red ? ` title="${esc(`Red: ${t.red}`)}"` : "";
    // A row whose link is the page it is on goes nowhere, so it is no link and has no chevron; its own links work.
    const still = linksHere(m.link);
    const text = (html: string) => (still ? html : unlinked(html));
    const cells =
        `<span class="nm">${esc(t.name)}<small>${text(memberLine(m))}</small>${red}</span>` +
        `<span class="val">${val}<small class="v6">${windowLabel(m, here.range)}</small></span>` +
        `<span class="tg">${text(slaText(m.sla))}</span><span class="sp">${sp}</span><span class="st">${stateChip(m, here.range)}</span>`;
    if (still) return `<div class="row${dim}"${title}>${cells}<span class="chev"></span></div>`;
    return `<a class="row${dim}" href="${href(m.link)}"${title}>${cells}${chev()}</a>`;
}

/** Row order: FAILING, WARNING, NO DATA, OK, then the gray ones; config order within. */
function rank(m: Member): number {
    if (m.state === "bad") return 0;
    if (m.state === "warn") return 1;
    if (m.state === "nodata") return 2;
    if (m.state === "ok") return 3;
    return 4;
}

function memberRows(members: Member[]): string {
    if (!members.length) return "";
    const by = here.range === "24h" ? "24 h by hour" : "6 h by 15 min";
    return (
        `<div class="rows"><div class="thead rowh"><span>measure</span><span>value</span><span>target</span><span>${by}</span><span>state</span><span></span></div>` +
        [...members]
            .sort((a, b) => rank(a) - rank(b))
            .map(memberRow)
            .join("") +
        `</div>`
    );
}

/** Where a NO DATA member's source is listed, so the reader can see why and who fixes it. */
const SOURCES_LINK = `<a class="ln" href="#/data-sources/sources">See Data sources</a>`;

/** The page's state sentence: the member that set it, the others not OK, and the page's notes. */
function pageState(p: PageResponse): string {
    const word = p.state === "idle" ? "IDLE" : STATE_WORD[p.state];
    const chip = `<span class="chips"><span class="sw ${p.state === "idle" ? "idle" : stateClass(p.state)}">${word}</span></span>`;
    const find = (r: MemberRef) => p.members.find((m) => m.id === r.member);
    const parts: string[] = [];
    if (p.setBy) {
        const m = find(p.setBy);
        if (p.setBy.fact && p.setBy.state !== "nodata") parts.push(`${capital(sentence(p.setBy.fact))}.`);
        else if (m && p.setBy.state === "nodata")
            parts.push(
                `${capital(MEMBER[m.id].short)} has NO DATA${m.reason ? `: ${sentence(m.reason)}` : ""}. ${SOURCES_LINK}.`,
            );
        else if (
            m &&
            p.setBy.member === "ci.chronic_jobs" &&
            p.setBy.state === "bad" &&
            m.note?.code === "note.chronic_no_issue"
        )
            parts.push(`Because ${sentence({ code: "chronic.no_issue_jobs", params: m.note.params })}.`);
        else if (m) {
            const win =
                MEMBER[m.id].when ??
                (m.window === "now" ? " now" : m.window === "1h" || m.window === "1h6h" ? " over the last hour" : "");
            const v6 = m.value6h ? ` (6 h: ${fmtValue(m.value6h)})` : "";
            // A word value ("found nothing 3 weeks running") reads after a colon, never as "is found nothing", and
            // is followed by what that state means rather than a target phrase.
            const word = m.value !== null && "word" in m.value;
            parts.push(
                word
                    ? `${capital(MEMBER[m.id].short)}: ${fmtValue(m.value)}. ${esc(MEMBER[m.id].red)}`
                    : `${capital(MEMBER[m.id].short)} is ${fmtValue(m.value)}${win}${v6}, ${slaText(m.sla)}.`,
            );
        } else parts.push(`${capital(refText(p.setBy))}.`);
    } else if (p.state === "ok") parts.push("Every judged member is within its target.");
    const named = (state: MemberRef["state"]) =>
        p.others
            .filter((r) => r.state === state)
            .map((r) => {
                const m = find(r);
                const v6 = m?.value6h && !r.fact ? ` (6 h: ${fmtValue(m.value6h)})` : "";
                return refText(r) + v6;
            });
    const bad = named("bad");
    const warn = named("warn");
    const nodata = named("nodata");
    if (bad.length) parts.push(`Also failing (past the red line): ${bad.join(", ")}.`);
    if (warn.length) parts.push(`Also past target: ${warn.join(", ")}.`);
    if (nodata.length) parts.push(`Also NO DATA: ${nodata.join(", ")}. ${SOURCES_LINK}.`);
    parts.push(...p.notes.map(sentence));
    if (p.page === "costs") parts.push(...budgetLine(p.sections));
    return `<p class="pstate">${chip}<span>${parts.join(" ")}</span></p>`;
}

/** Costs: "331 USD of the 415 USD monthly budget spent; month-end forecast 340 USD.", from the money table's total. */
function budgetLine(sections: Section[]): string[] {
    const money = sections.find((x): x is TableSection => x.id === "money" && x.kind === "table");
    const total = money?.rows.find((r) => r.total)?.cells;
    const sofar = total?.sofar;
    const projected = total?.projected;
    if (sofar?.t !== "budget" || sofar.budget === null) return [];
    const forecast = projected?.t === "num" ? `; month-end forecast ${fmtN(projected.n)} USD` : "";
    return [`${fmtN(sofar.so)} USD of the ${fmtN(sofar.budget)} USD monthly budget spent${forecast}.`];
}

// ---------------------------------------------------------------- sections

interface TableDef {
    cls: string;
    cols: [string, string][];
    cap?: number;
    /** Rows shown open; the rest fold even when live (benchmarks: only the regressed show). */
    open?: (r: TableSection["rows"][number]) => boolean;
    /** The fold's words for a table with `open` ("250 more: 10 within 1.2x, 240 with too few runs"). */
    foldText?: (folded: TableSection["rows"]) => string;
    /** What a table with no ongoing row says above its folded, ended rows. */
    noneNow?: string;
    /** Folded rows worth listing; the rest are only counted in the fold's words (benchmarks with too few runs). */
    listFolded?: (r: TableSection["rows"][number]) => boolean;
}

const isMark = (c: Cell | undefined) => c?.t === "mark";

export const TABLES: Record<string, TableDef> = {
    "red-spans": {
        cls: "t-spans",
        cols: [
            ["span", "span"],
            ["builds", "builds"],
            ["cause", "cause"],
            ["fix", "fix"],
        ],
    },
    shared: {
        cls: "t-shared",
        cols: [
            ["check", "check"],
            ["prs", "open pull requests failing"],
            ["since", "failing from - to"],
            ["suspects", "suspects: master merges since its last pass"],
            ["issue", "issue and fix"],
        ],
        noneNow: "No shared failure now.",
    },
    owner: {
        cls: "t-owner",
        cols: [
            ["pr", "pull request"],
            ["why", "why"],
            ["waiting", "waiting"],
        ],
    },
    quarantine: {
        cls: "t-quar",
        cols: [
            ["test", "file > test"],
            ["family", "family"],
            ["issue", "issue"],
            ["since", "since"],
            ["expires", "expires"],
        ],
    },
    superseded: {
        cls: "t-sup",
        cols: [
            ["run", "run"],
            ["pr", "pull request"],
            ["newer", "newer commit pushed"],
        ],
    },
    chronic: {
        cls: "t-chronic",
        cols: [
            ["job", "job, workflow"],
            ["failed", "failed, newest runs"],
            ["rate", "failure rate"],
            ["pass", "last pass"],
            ["issue", "issue"],
        ],
    },
    "non-gating": {
        cls: "t-nongating",
        cols: [
            ["job", "job"],
            ["runs", "runs, 7 d"],
            ["failed", "failed"],
            ["rate", "pass rate"],
        ],
    },
    benchmarks: {
        cls: "t-bench",
        cols: [
            ["benchmark", "benchmark"],
            ["latest", "newest"],
            ["ratio", "last 3 / 10 before"],
            ["spark", "results, one per run"],
            ["runs", "runs"],
        ],
        open: (r) => isMark(r.cells.ratio),
        foldText: (rows) => {
            const judged = rows.filter((r) => filled(r.cells.ratio)).length;
            const few = rows.length - judged;
            return `${fmtN(judged)} more within 1.2x; ${fmtN(few)} with fewer than 13 runs are not judged yet and not listed`;
        },
        listFolded: (r) => filled(r.cells.ratio),
        noneNow: "No benchmark regressed.",
    },
    lanes: {
        cls: "t-lanes",
        cols: [
            ["lane", "lane"],
            ["result", "result"],
            ["since", "red since"],
            ["job", "job"],
        ],
    },
    trains: {
        cls: "t-trains",
        cols: [
            ["attempt", "started"],
            ["candidate", "candidate"],
            ["lanes", "lanes"],
            ["nightly", "nightly"],
        ],
    },
    workflows: {
        cls: "t-wf",
        cols: [
            ["workflow", "workflow"],
            ["runs", "runs, last 24 h"],
            ["since", "failing since"],
            ["cause", "cause"],
        ],
        noneNow: "No release workflow failing now.",
    },
    money: {
        cls: "t-cost",
        cap: 20,
        cols: [
            ["line", "line"],
            ["projected", "projected month-end, USD"],
            ["sofar", "spent so far / red line, USD"],
            ["spark", "projection by day"],
            ["state", "state"],
        ],
    },
    "runner-minutes": {
        cls: "t-load",
        cols: [
            ["kind", "run kind"],
            ["day", "per merge, 24 h"],
            ["week", "per merge, 7 d"],
            ["dayMin", "minutes, 24 h"],
            ["weekMin", "minutes, 7 d"],
        ],
    },
    unit: {
        cls: "t-unit",
        cols: [
            ["measure", "measure"],
            ["value", "value, USD"],
            ["note", "note"],
        ],
    },
    stress: {
        cls: "t-stress",
        cols: [
            ["run", "run"],
            ["result", "result"],
            ["filed", "issues filed"],
        ],
    },
    sources: {
        cls: "t-src",
        cols: [
            ["source", "source"],
            ["write", "last write"],
            ["limit", "limit"],
            ["volume", "volume for its activity"],
            ["error", "last error"],
            ["state", "state"],
        ],
    },
    "not-set-up": {
        cls: "t-sup",
        cols: [
            ["member", "member"],
            ["on", "shown on"],
            ["unblock", "unblocked by"],
        ],
    },
};

/** A table cell: the column's name rides along for a phone, which stacks the row (style.css); the value is wrapped
 * so the name and the value are two grid columns there. */
const cellSpan = (h: string, html: string): string => `<span data-h="${esc(h)}"><span class="cv">${html}</span></span>`;

/** Rows a table shows before the rest folds away, unless its entry in TABLES says otherwise. */
const TABLE_CAP = 10;

const filled = (c: Cell | undefined): boolean => c !== undefined && c.t !== "none";

/**
 * A table: a column no row fills is left out; an empty cell reads "--"; ended or idle rows, and rows past the
 * table's cap, fold into "N more" (a total row always shows).
 */
function table(s: TableSection): string {
    const def = TABLES[s.id] ?? {
        cls: "t-sup",
        cols: Object.keys(s.rows[0]?.cells ?? {}).map((k) => [k, k] as [string, string]),
    };
    const cols = s.rows.length ? def.cols.filter(([k]) => s.rows.some((r) => filled(r.cells[k]))) : def.cols;
    // Dropped columns: the rest share the width, the first a little more (style.css, .tbl.dropped).
    const dropped = cols.length < def.cols.length;
    const style = dropped
        ? ` style="--cols: minmax(0, 1.6fr)${cols.length > 1 ? ` repeat(${cols.length - 1}, minmax(0, 1fr))` : ""}"`
        : "";
    const head = `<div class="thead">${cols.map(([, h]) => `<span>${esc(h)}</span>`).join("")}</div>`;
    // Each cell carries its column's name, which a phone shows beside it when the row stacks (style.css).
    const row = (r: TableSection["rows"][number]) => {
        const cls = `tr${r.past ? " past" : ""}${r.total ? " tot" : ""}`;
        const cells = cols
            .map(([k, h]) => cellSpan(h, filled(r.cells[k]) ? cellHtml(r.cells[k]) : `<span class="muted">--</span>`))
            .join("");
        return r.link ? `<a class="${cls}" href="${href(r.link)}">${cells}</a>` : `<div class="${cls}">${cells}</div>`;
    };
    const cap = def.cap ?? TABLE_CAP;
    const live = s.rows.filter((r) => !r.past && !r.total);
    const keep = def.open ? live.filter(def.open) : live;
    const shown = keep.slice(0, cap);
    const folded = [
        ...keep.slice(cap),
        ...live.filter((r) => !keep.includes(r)),
        ...s.rows.filter((r) => r.past && !r.total),
    ];
    const totals = s.rows.filter((r) => r.total);
    const ended = folded.filter((r) => r.past).length;
    const what = def.foldText
        ? def.foldText(folded)
        : shown.length
          ? `${fmtN(folded.length)} more`
          : `${fmtN(folded.length)} ended or idle ${folded.length === 1 ? "row" : "rows"}`;
    const endedNote = def.foldText || !shown.length || !ended ? "" : ` (${fmtN(ended)} ended or idle)`;
    // With no row open, the header goes inside the fold, over the rows it names.
    const headOpen = shown.length > 0 || totals.length > 0;
    const fold = folded.length
        ? `<details class="epm tfold" data-key="t-${esc(s.id)}"><summary>${what}${endedNote}${chev()}</summary>${headOpen ? "" : head}${(def.listFolded ? folded.filter(def.listFolded) : folded).map(row).join("")}</details>`
        : "";
    // Nothing live: say so in words above the fold, so a table never reads as a header with no rows.
    const none =
        s.rows.length && !shown.length && !totals.length
            ? `<p class="empty">${esc(def.noneNow ?? (def.open ? "None past its line." : "None ongoing now."))}</p>`
            : "";
    const empty = s.rows.length ? "" : `<p class="empty">none in this range</p>`;
    return `${none}<div class="tbl ${def.cls}${dropped ? " dropped" : ""}" role="table"${style}>${headOpen ? head : ""}${shown.map(row).join("")}${totals.map(row).join("")}${fold}</div>${empty}`;
}

/** Bars a list shows before the rest folds into "N more". */
const BARS_SHOWN = 8;

/** Sorted bars, the longest first, past BARS_SHOWN folded. */
function barList(items: BarsSection["groups"][number]["items"], caption: string): string {
    const rest = items.slice(BARS_SHOWN);
    // One scale for the whole list, so a folded bar is never longer than a larger one above it.
    const max = Math.max(1, ...items.map((i) => i.n));
    const more = rest.length
        ? `<details class="epm tfold"><summary>${fmtN(rest.length)} more${chev()}</summary>${sortedBars(rest, cellHtml, caption, max)}</details>`
        : "";
    return sortedBars(items.slice(0, BARS_SHOWN), cellHtml, caption, max) + more;
}

/** "CI, pull_request" as "CI, pull request": the event of a runner holder's name in words. */
function holderName(i: BarsSection["groups"][number]["items"][number]): BarsSection["groups"][number]["items"][number] {
    const m = i.label.t === "name" ? /^(.*), (\w+)$/.exec(i.label.v) : null;
    return m && EVENT[m[2]] ? { ...i, label: { t: "name", v: `${m[1]}, ${EVENT[m[2]]}` } } : i;
}

function bars(s0: BarsSection): string {
    const s =
        s0.id === "holders" ? { ...s0, groups: s0.groups.map((g) => ({ ...g, items: g.items.map(holderName) })) } : s0;
    const caption = s.id;
    if (s.groups.length === 1) return barList(s.groups[0].items, caption);
    const list = (g: BarsSection["groups"][number]): string =>
        g.items.length
            ? barList(g.items, g.head ? sentence(g.head) : caption)
            : `<p class="empty">none in this range</p>`;
    return `<div class="two">${s.groups
        .map((g) => `<div>${g.head ? `<h3>${sentence(g.head)}</h3>` : ""}${list(g)}</div>`)
        .join("")}</div>`;
}

function seg(key: string, on: string, options: [string, string][]): string {
    return `<span class="seg">${options
        .map(
            ([v, label]) =>
                `<a href="${hereWith({ [key]: v })}"${v === on ? ' class="on" aria-current="true"' : ""}>${esc(label)}</a>`,
        )
        .join("")}</span>`;
}

/** A shard's name without the selector's flags; a screenshot shard gets a small tag ("graphty|shots"). */
function shardName(shard: string): string {
    const [base, ...flags] = shard.split("|");
    const shots = flags.includes("shots") ? ` <small class="tag">screenshots</small>` : "";
    return esc(base) + shots;
}

function shards(s: ShardsSection): string {
    const maxS = Math.max(1200, ...s.rows.map((r) => r.p90S));
    const mins = (x: number) => fmtN(Math.round((x / 60) * 10) / 10);
    const head =
        `<div class="srow thead"><span class="nm">${s.runKind === "full" ? "shard" : "family"}</span><span class="num">runs</span><span class="num">median</span><span class="num">p90</span>` +
        `<span>0 to ${fmtN(Math.round(maxS / 60))} min; line = budget</span><span></span><span></span></div>`;
    const rows = s.rows
        .map((r) => {
            const { svg, note } = budgetBar(r, maxS);
            const name = shardName(r.shard) + (r.group ? ` (in ${esc(r.group)})` : "");
            const judged = r.runs >= r.minRuns;
            const cols = (tail: string) =>
                `<span class="nm">${name}</span><span class="num">${fmtN(r.runs)}</span><span class="num">${mins(r.medianS)}</span><span class="num">${mins(r.p90S)}</span>` +
                `<span>${svg}</span><span class="note2${judged ? "" : " tg"}">${esc(note)}</span>${tail}`;
            if (!r.files?.length) return `<div class="srow${judged ? "" : " dim"}">${cols("<span></span>")}</div>`;
            const files = r.files
                .map(
                    (fl) =>
                        `<div class="srow frow"><span class="nm">${esc(fl.file)}</span><span></span><span class="num">${mins(fl.medianS)}</span><span class="num">${mins(fl.p90S)}</span>` +
                        `<span class="share"><span style="width: ${Math.round(fl.share * 2)}px"></span>${fmtN(fl.share)}% of shard</span><span></span><span></span></div>`,
                )
                .join("");
            const more = r.moreFiles ? `<p class="more">${fmtN(r.moreFiles)} more files</p>` : "";
            return `<details class="sd" data-key="shard-${esc(r.shard)}"><summary class="srow">${cols(chev())}</summary><div class="files">${files}${more}</div></details>`;
        })
        .join("");
    const more = s.more
        ? `<p class="more">${fmtN(s.more.count)} more ${s.runKind === "full" ? "shards" : "families"}${s.more.allWithin ? ", all within budget" : ""}</p>`
        : "";
    const table = hiddenTable(
        "shard times in minutes",
        ["shard", "runs", "median", "p90", "budget"],
        s.rows.map((r) => [r.shard, r.runs, mins(r.medianS), mins(r.p90S), mins(r.budgetS)]),
    );
    return `<div class="shards">${head}${rows}${more}</div>${table}`;
}

function tree(s: TreeSection): string {
    const head =
        `<div class="hrow thead"><span class="nm">group or family &gt; file &gt; test</span><span>distinct flaky tests</span><span class="num">events</span>` +
        `<span class="num">flaky per 1,000 runs of this file</span><span class="num">quarantined</span><span class="num">PRs held</span><span></span></div>`;
    const note =
        `<p class="note">Pull request runs pack test files into bins per pull request, so the tree is family &gt; file &gt; test; full runs add the shard level. ` +
        `${fmtN(s.quiet)} groups and families had no flaky test in ${rangeLabel(s.range)}.</p>`;
    const body = s.nodes.length
        ? treeRows(s.nodes, (r) => href(r))
        : `<p class="empty">No flaky tests in ${rangeLabel(s.range)}.</p>`;
    return `<div class="hott">${head}${body}</div>${note}`;
}

/** The section's heading: its title, subtitle and, for slow sections, its own pickers. */
function sectionHead(s: Section): string {
    const r = here.range;
    const last = isPickerRange(r) ? `last ${rangeLabel(r)}` : rangeLabel(r);
    const subText = s.sub ? sentence(s.sub) : "";
    const sub = (t: string) => (t ? `<span class="h2sub">${t}</span>` : "");
    const h = (title: string, subtitle = "", extra = "") =>
        `<h2 id="s-${esc(s.id)}" tabindex="-1">${esc(title)}${sub(subtitle)}${extra}</h2>`;
    const widened = s.widened
        ? `only ${fmtN(s.widened.n)} in the ${`last ${rangeLabel(s.widened.from)}`}, so the last ${rangeLabel(s.widened.to)} (${fmtN(s.widened.nTo)}); `
        : "";
    switch (s.id) {
        case "red":
            return h(
                "Master builds",
                `${r === "24h" ? "last 24 h" : "last 6 h"} by minute; gray = cancelled by hand or superseded, as GitHub records it; not counted`,
            );
        case "red-spans":
            return "";
        case "shared":
            return h(
                "Shared failures",
                "a check failing in 3 or more pull requests, or failing alone where every check it summarizes passed; ongoing first",
            );
        case "time":
            return h(
                "Where the time goes",
                `${widened || `pull requests merged in the ${last}; `}median minutes per stage; owner waits left out`,
            );
        case "runs":
            return h("Local runs", `by kind, ${last}`);
        case "shard-time":
            return h("Local shard time", `median minutes per shard, ${last}`);
        case "owner":
            return h("Waiting on the owner", "auto-merge is off by rule");
        case "causes":
            return h("Why first attempts failed", [subText, last].filter(Boolean).join(", "));
        case "shards": {
            const sh = s as ShardsSection;
            return h(
                "Shard times",
                "7- or 28-day measure; test step, attempt 1, successful runs",
                seg("shards", sh.range, [
                    ["7d", "7 d"],
                    ["28d", "28 d"],
                ]) +
                    seg("kind", sh.runKind, [
                        ["full", "full runs"],
                        ["pr-bins", "pull request bins"],
                    ]),
            );
        }
        case "runner-minutes":
            return h("Runner-minutes per merge", `${subText}; pull request runs include those that never merged`);
        case "jobs": {
            const j = s as JobsSection;
            const q = j.peakQueued ? `; peak queued ${fmtN(j.peakQueued.n)} at ${fmtTime(j.peakQueued.at)}` : "";
            return h(
                "Running and queued jobs",
                `organization, GitHub-hosted; machine.dev T4 jobs are not counted; limit ${fmtN(j.limit)} jobs (set in config); peak running ${fmtN(j.peak.n)} at ${fmtTime(j.peak.at)}${q}`,
            );
        }
        case "holders":
            return h("Who holds the runners", "by workflow and event, now");
        case "superseded":
            return h(
                "Superseded runs still running",
                "workflows without cancel-in-progress, and if: always() jobs after a cancel; CI and Hosts cancel their own",
            );
        case "hotspots":
            return h(
                "Hotspots",
                "7- or 28-day measure; ranked by distinct flaky tests; a rate here is one file's over these days, while the Flake rate row above is every file's over the last hour; open a row for its files and tests",
                seg("hot", (s as TreeSection).range, [
                    ["7d", "7 d"],
                    ["28d", "28 d"],
                ]),
            );
        case "quarantine":
            return h("Quarantine");
        case "chronic":
            return h(
                "Chronically failing jobs",
                "failed in half of the last 10 runs, or not passed in 3 days; master, full and other runs, gating or not",
            );
        case "non-gating":
            return h(
                "Allowed to fail",
                "ci.yml jobs with continue-on-error, every run kind, last 7 d; most failures first; marked when a quarter of runs fail, red at half",
            );
        case "benchmarks": {
            const rows = s.kind === "table" ? s.rows : [];
            const judged = rows.filter((r) => filled(r.cells.ratio)).length;
            const can =
                judged === 0
                    ? "detection cannot run yet: no benchmark has 13 runs"
                    : `${fmtN(judged)} of ${fmtN(rows.length)} have the 13 runs detection needs`;
            return h(
                "Benchmarks",
                `red: median of the last 3 results over 1.2x the median of the 10 before; ${can}; only regressions show, the rest are folded`,
            );
        }
        case "lanes":
            return h("Lanes on the candidate", subText);
        case "trains":
            return h("Train attempts");
        case "workflows":
            return h("Release workflows");
        case "money":
            return h("Money this month", subText);
        case "unit":
            return h("Unit costs", "for comparison; never part of the status");
        case "by-workflow":
            return h(
                "By workflow",
                "only the money a workflow spends (T4 GPU, LLM tests), so it is less than the total: flat plans and AWS are not split by workflow; money and list-price value are never summed",
            );
        case "stress":
            return h("Weekly stress run", subText);
        case "sources":
            return h("Sources");
        case "not-set-up":
            return h("Not set up", "no writer or token yet; out of the status until it exists");
        default:
            return h(s.id, subText);
    }
}

function sectionBody(s: Section): string {
    switch (s.kind) {
        case "strip":
            return minuteStrip(s);
        case "table":
            return table(s);
        case "bars":
            return bars(s);
        case "jobs":
            return jobsChart(s);
        case "shards":
            return shards(s);
        case "tree":
            return tree(s);
        case "empty":
            return `<p class="empty">${sentence(s.fact)}</p>`;
    }
}

function section(s: Section): string {
    const notes = s.notes?.map((n) => `<p class="note">${sentence(n)}</p>`).join("") ?? "";
    return sectionHead(s) + sectionBody(s) + notes;
}

// ---------------------------------------------------------------- views

/** A section's title, as its heading reads, for the breadcrumb of a view opened at that section. */
function sectionTitle(s: Section): string {
    return /<h2[^>]*>([^<]*)/.exec(sectionHead(s))?.[1] ?? "";
}

export function pageView(p: PageResponse): string {
    const title = PAGE_TITLE[p.page];
    const crumbs: [string, string][] = [["/", "Overview"]];
    if (p.page === "runners" || p.page === "local-runs") crumbs.push(["/ci", "CI"]);
    const at = here.section ? p.sections.find((x) => x.id === here.section) : undefined;
    const atTitle = at ? sectionTitle(at) : "";
    // Local runs with nothing recorded: one line says why, not a page of empty rows.
    const idle = p.page === "local-runs" && p.state === "idle" && p.members.every((m) => m.value === null);
    if (idle)
        return (
            header(title, crumbs, p.generated) +
            `<p class="pstate"><span>No local test runs recorded. This page fills when agents run tests on the development machine with tools/run-tests.sh.</span></p>`
        );
    return (
        header(title, crumbs, p.generated, p.page === "costs", true, atTitle) +
        pageState(p) +
        (p.page === "costs" ? "" : memberRows(p.members)) +
        p.sections.map(section).join("")
    );
}

function block(c: CategoryStatus): string {
    const name = CATEGORY_NAME[c.id];
    const word = c.state === "idle" ? "IDLE" : STATE_WORD[c.state];
    const lab = (h: string) => (c.state === "nodata" ? `<span class="lab">${h}</span>` : h);
    const by = c.setBy ? unlinked(refText(c.setBy, true)) : "";
    const more =
        c.others.length === 1
            ? `+ ${unlinked(refText(c.others[0], true))}`
            : c.others.length > 1
              ? `+ ${c.others.length} more`
              : "";
    const strip = (h: string) => h.replace(/<[^>]+>/g, "");
    const aria = `${name}: ${word}${by ? `, ${strip(by)}` : ""}${more ? `, ${strip(more)}` : ""}`;
    const cls = c.state === "idle" ? "idle" : stateClass(c.state);
    return (
        `<a class="blk ${cls}" href="${href(PAGE_PATH[c.id])}" aria-label="${esc(aria)}" title="${esc(aria)}"><span class="bn">${lab(esc(name))}</span><span class="bw">${lab(word)}</span>` +
        (by ? `<span class="by">${lab(by)}</span>` : "") +
        (more ? `<span class="by bym">${lab(more)}</span>` : "") +
        `${chev()}</a>`
    );
}

/** The headline's big value, or the gray word that stands in for it. */
function headlineValue(m: Member): string {
    if (m.state === "few" && !showsRangeValue(m, here.range))
        return `<span class="kvl">${fewText(m, here.range)}</span>`;
    if (m.state === "partial") return `<span class="kvm">${partialText(m.covered)}</span>`;
    if (m.state === "nodata") return `<span class="kvl">NO DATA</span>`;
    if (m.state === "notsetup") return `<span class="kvl">not set up</span>`;
    return bigValue(m.value);
}

/**
 * The measure under a status block: the one that set the block's color when it is not OK, else the category's
 * headline measure, so the big number under a colored block is always the reason for its color.
 * @param m the category's headline member
 * @param setBy the member that set the category's state, when there is one
 * @param driver that member as a full row (payloads built before it was have only `setBy`)
 */
export function headline(m: Member, setBy?: MemberRef, driver?: Member): string {
    if (setBy !== undefined && setBy.member !== m.id) {
        if (driver) return measure(driver, true);
        // No full row for it: its name and value, and where its target is.
        const t = MEMBER[setBy.member];
        const kv = setBy.value === null ? "--" : bigValue(setBy.value);
        return `<a class="kpi set" href="${href(m.link)}"><span class="kn"><b class="knot">Set the color:</b> ${esc(t.name)}</span><span class="kv">${kv}</span><span class="kt">its target is on the page</span></a>`;
    }
    return measure(m, false);
}

/** One measure under a block, with its window, value, target and sparkline; `set` labels it as the color's reason. */
function measure(m: Member, set: boolean): string {
    const t = MEMBER[m.id];
    const win =
        m.window === "now"
            ? "now"
            : m.window === "7d" || m.window === "28d"
              ? `last ${rangeLabel(m.window)}`
              : here.range === "1h"
                ? "last 1 h"
                : `last ${rangeLabel(here.range)}`;
    const kv = headlineValue(m);
    const kt: string[] = [];
    if (m.state === "nodata" && m.reason) kt.push(sentence(m.reason));
    else if (m.value6h && here.range === "1h")
        kt.push(
            `6 h ${fmtValue(m.value6h)}${m.covered6h ? `, ${fmtN(m.covered6h.h)} h of ${fmtN(m.covered6h.of)}` : ""}`,
        );
    else if (m.window === "now" && m.spark && m.value && !("word" in m.value)) {
        const v = m.value.n;
        if (m.spark.trend.every((x) => x === v)) kt.push(`${fmtN(v)} all of the last 6 h`);
        else if (m.id.startsWith("costs.")) kt.push("billing is daily");
    }
    kt.push(slaText(m.sla));
    // The block above is judged on the last hour whatever the picker shows, so a 24 h value past red under a
    // green block says why it is not red.
    if (here.range !== "1h" && (m.window === "1h" || m.window === "1h6h"))
        kt.push("the block's color is judged on the last 1 h");
    const sp = m.spark ? sparkline(m.spark, clock.generated, `${t.name} trend`) : "";
    const lead = set ? `<b class="knot">Set the color:</b> ` : "";
    const name = set ? t.name : (t.headline ?? t.name);
    return `<a class="kpi${set ? " set" : ""}" href="${href(m.link)}"><span class="kn">${lead}${esc(name)}, ${win}</span><span class="kv">${kv}</span><span class="kt">${unlinked(kt.join("; "))}</span>${sp}</a>`;
}

function episode(e: Episode): string {
    const past = e.end !== null;
    return (
        `<a class="ep${past ? " past" : ""}" href="${href(e.link)}"><span class="eb ${e.worst}"></span><span class="et">${fmtSpan(e.start, e.end, { edge: true, startUnknown: e.startUnknown })}</span>` +
        `<span class="ec">${esc(CATEGORY_NAME[e.category])}</span><span class="ex">${unlinked(sentence(e.fact))}</span>` +
        `<span class="en">${past ? `cleared ${fmtAgo(e.end as string)}` : "ongoing"}</span>${chev()}</a>`
    );
}

/** The hollow dots a channel with no attempt recorded shows (the design's 14). */
const EMPTY_DOTS = 14;

/** A release channel's tile (#4460): its state, the commit it serves and since when, a dot per recent attempt. */
export function channelTile(c: ChannelTile): string {
    const dots = c.attempts.length
        ? c.attempts.map((a) => `<i class="dot d-${a.outcome}" title="${attemptText(c.id, a)}"></i>`).join("")
        : `<i class="dot d-none"></i>`.repeat(EMPTY_DOTS);
    return (
        `<a class="tile ${stateClass(c.state)}" href="${href(c.link)}"><span class="th"><span class="tn">${esc(CHANNEL[c.id].name)}</span>` +
        `<span class="tst">${STATE_WORD[c.state]}</span></span><span class="tv">${c.sha ? esc(c.sha.slice(0, 7)) : "--"}</span>` +
        `<span class="ts">${channelSince(c.id, c.at)}</span>` +
        `<span class="dots" role="img" aria-label="${attemptsLabel(c.attempts.length)}">${dots}</span></a>`
    );
}

/** Episodes listed open on the overview before the rest fold away, and the ongoing ones among them at most. */
const EPISODES_SHOWN = 6;
const ONGOING_SHOWN = 5;

/** The order of what matters to the pipeline: the overview's blocks and its episodes. */
const PRIORITY: CategoryStatus["id"][] = [
    "master",
    "releases",
    "pull-requests",
    "flaky",
    "ci",
    "costs",
    "data-sources",
];
const prio = (id: CategoryStatus["id"]) => PRIORITY.indexOf(id);

/** The legend of the status blocks; the long form is its tooltip. */
const LEGEND =
    "OK: within target; WARNING (yellow): past target, look soon; FAILING (red): past the red line, act now; " +
    "NO DATA (hatched): the source is not reporting.";

const SEVERITY: Record<CategoryState, number> = { bad: 0, warn: 1, nodata: 2, ok: 3, idle: 4 };

/**
 * The one line above the blocks: the most urgent category, the member that set it, what that red means and who
 * acts, and the others not OK, so a reader need not assemble the story from the blocks, tiles and episodes.
 */
export function urgent(categories: CategoryStatus[]): string {
    const bad = categories
        .filter((c) => c.state === "bad" || c.state === "warn" || c.state === "nodata")
        .sort((a, b) => SEVERITY[a.state] - SEVERITY[b.state] || prio(a.id) - prio(b.id));
    if (!bad.length)
        return `<p class="urgent ok"><b>Nothing needs action:</b> every category is within its targets.</p>`;
    const [top, ...rest] = bad;
    const by = top.setBy;
    const what = by ? `${unlinked(refText(by))}. ${esc(MEMBER[by.member].red)}` : "";
    const others = rest.length
        ? ` Also not OK: ${rest.map((c) => `${esc(CATEGORY_NAME[c.id])} (${STATE_WORD[c.state]})`).join(", ")}.`
        : "";
    return (
        `<p class="urgent ${stateClass(top.state)}"><b>Most urgent:</b> ` +
        `<a class="ln" href="${href(PAGE_PATH[top.id])}">${esc(CATEGORY_NAME[top.id])}</a> ${STATE_WORD[top.state]}` +
        `${what ? `: ${what}` : "."}${others}</p>`
    );
}

export function overviewView(o: OverviewResponse): string {
    const trend =
        here.range === "24h"
            ? "Small chart: the last 24 hours."
            : "Small chart: the last 6 hours, the last hour shaded.";
    const long =
        `Each block is its category's state: rates judged on the last 1 h, states now. Under it: the headline measure, ${here.range === "1h" ? "its 6 h value, and " : ""}` +
        (here.range === "24h"
            ? "the last 24 h by hour, the last hour shaded."
            : "the last 6 h by 15 min with the last hour shaded; the faint line at the left is the rest of the last 24 h, hourly.");
    const cols = [...o.categories]
        .sort((a, b) => prio(a.id) - prio(b.id))
        .map((c) => `<li class="col">${block(c)}${headline(c.headline, c.setBy, c.driver)}</li>`)
        .join("");
    const ongoing = o.episodes
        .filter((e) => e.end === null)
        .sort((a, b) => Number(a.worst !== "bad") - Number(b.worst !== "bad") || prio(a.category) - prio(b.category));
    const cleared = o.episodes.filter((e) => e.end !== null);
    // Every ongoing red episode shows, then ongoing yellow ones up to the cap; cleared ones only once nothing ongoing
    // is folded, so a cleared row never sits above an ongoing one that is hidden.
    const reds = ongoing.filter((e) => e.worst === "bad").length;
    const open = ongoing.slice(0, Math.max(reds, ONGOING_SHOWN));
    const shown = open.length < ongoing.length ? 0 : Math.max(0, EPISODES_SHOWN - open.length);
    const fold = (list: Episode[], what: string) =>
        list.length
            ? `<details class="epm"><summary>${fmtN(list.length)} more ${what}${chev()}</summary>${list.map(episode).join("")}</details>`
            : "";
    const eps = o.episodes.length
        ? [...open, ...cleared.slice(0, shown)].map(episode).join("") +
          fold(ongoing.slice(open.length), "ongoing") +
          fold(cleared.slice(shown), "cleared")
        : `<p class="empty">No member went past its target in the last 24 h.</p>`;
    const channels = o.channels?.length
        ? `<h2 class="top">${CHANNELS_HEAD}<span class="h2sub">${CHANNELS_SUB}</span></h2><div class="tiles">${o.channels.map(channelTile).join("")}</div>`
        : "";
    return (
        header("Pipeline health", [], o.generated) +
        channels +
        urgent(o.categories) +
        `<p class="kcap" title="${esc(long)}">${LEGEND} ${trend}</p>` +
        `<ol class="status" aria-label="Category status">${cols}</ol>` +
        `<h2>Last 24 hours<span class="h2sub">every time an hourly or current measure went past its target, ongoing first; the bar is the worst it reached: red past the red line, yellow past the target</span></h2><div class="eps">${eps}</div>`
    );
}

/** A new-issue link with the test's facts filled in; GitHub opens it as a draft the reader submits or drops. */
function draftIssue(h: TestHistoryResponse): string {
    const name = h.test ?? h.file;
    const newest = h.events[0];
    const body = [
        `Flaky test: \`${h.file}\`${h.test ? ` > ${h.test}` : ""}`,
        `${h.events.length} flaky or failed results in the last ${h.range.replace("d", " days")}.`,
        newest?.signature ? `Newest failure (${newest.at}): ${newest.signature}` : "",
        `History: https://health.graphty.app/#/flaky/test?${new URLSearchParams({ file: h.file, ...(h.test ? { test: h.test } : {}) }).toString()}`,
    ]
        .filter(Boolean)
        .join("\n\n");
    const q = new URLSearchParams({
        title: `Flaky test: ${name}`.slice(0, 200),
        labels: "bug,priority:critical,effort:medium",
        body,
    });
    return `${REPO}/issues/new?${q.toString()}`;
}

export function testView(h: TestHistoryResponse): string {
    const title = h.test ?? h.file;
    const outcome = (o: TestHistoryResponse["events"][number]["outcome"]) =>
        o === "passed"
            ? "passed"
            : `<span class="mk ${o === "flaky" ? "warn" : "bad"}">${o === "failed-rerun" ? "failed rerun" : o}</span>`;
    const where = (e: TestHistoryResponse["events"][number]) =>
        e.pr ? prLink(e.pr) : e.kind === "full" ? "full run" : e.kind === "pr" ? "pull request" : "local";
    const rows = h.events
        .map(
            (e) =>
                `<div class="tr${e.outcome === "passed" ? " past" : ""}">${cellSpan("when", fmtTime(e.at))}${cellSpan("where", where(e))}` +
                `${cellSpan("commit", `${shaLink(e.sha)}<small>attempt ${fmtN(e.attempt)}</small>`)}${cellSpan("result", outcome(e.outcome))}${cellSpan("message", esc(e.signature ?? ""))}${cellSpan("run", runLink(e.run))}</div>`,
        )
        .join("");
    return (
        header(
            title,
            [
                ["/", "Overview"],
                ["/flaky", "Flaky tests"],
            ],
            h.generated,
            true,
        ) +
        `<p class="pstate"><span>${esc(h.file)}, in the ${esc(h.family.split("|")[0])} test group. Flaky and failed results in the last ${rangeLabel(h.range)}, newest first; 'where' says whether it ran in a pull request, a full run or locally.</span></p>` +
        `<p class="note">${h.issue ? `Tracked by ${issueLink(h.issue)}.` : `No open issue tracks this test. <a class="ln" href="${esc(draftIssue(h))}" target="_blank" rel="noopener">Draft the issue on GitHub</a>`}</p>` +
        `<div class="tbl t-hist" role="table"><div class="thead"><span>when</span><span>where</span><span>commit</span><span>result</span><span>message</span><span>run</span></div>${rows}</div>`
    );
}

/** A category state's word, for the document title. */
export function stateWord(s: CategoryState): string {
    return s === "idle" ? "IDLE" : STATE_WORD[s];
}
