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
    Episode,
    Member,
    MemberRef,
    OverviewResponse,
    PageId,
    PageResponse,
    Range,
    Section,
    ShardsSection,
    SlowRange,
    StatusResponse,
    TableSection,
    TestHistoryResponse,
    TreeSection,
} from "./contract";
import {
    CATEGORY_NAME,
    LABEL,
    MEMBER,
    STATE_WORD,
    bigValue,
    capital,
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
export function setHere(h: Here): void {
    here = h;
}

const isPickerRange = (r: string): r is Range => r === "1h" || r === "6h" || r === "24h";

/** A link to a route of the page, keeping the picked range; absolute URLs pass through. */
export function href(route: string, extra?: Record<string, string>): string {
    if (/^https?:/.test(route)) return esc(route);
    const [path, qs] = route.split("?");
    const q = new URLSearchParams(qs ?? "");
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
    const links = opts
        .map(
            (r) =>
                `<a href="${hereWith({ range: r })}"${r === here.range ? ' class="on" aria-current="true"' : ""}>${rangeLabel(r)}</a>`,
        )
        .join("");
    return `<div class="range" role="group" aria-label="${slow ? "Range, slow measure" : "Range"}">${slow ? `<span class="rlab">slow measure</span>` : ""}${links}</div>`;
}

function updated(generated: string): string {
    return `<span class="upd">updated ${fmtAgo(generated)}, ${fmtTime(generated).slice(-5)} UTC</span>`;
}

function header(title: string, crumbs: [string, string][], generated: string, slow = false, picker = true): string {
    const c = crumbs.length
        ? `<div class="crumbs">${crumbs.map(([r, n]) => `<a href="${href(r)}">${esc(n)}</a><span class="sep">&gt;</span>`).join("")}<span aria-current="page">${esc(title)}</span></div>`
        : "";
    return `<header class="ph">${c}<div class="phrow"><h1 tabindex="-1">${esc(title)}</h1>${picker ? rangePicker(slow) : ""}${updated(generated)}</div></header>`;
}

// ---------------------------------------------------------------- cells

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
            return `${fmtN(c.so)} / ${c.budget === null ? "--" : fmtN(c.budget)}`;
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
        case "list":
            return c.items.map(cellHtml).join(c.sep === "comma" ? ", " : c.sep === "line" ? "<br />" : " ");
        case "sub":
            return `${cellHtml(c.main)}<small>${cellHtml(c.sub)}</small>`;
        case "none":
            return "";
    }
}

// ---------------------------------------------------------------- members

function memberRow(m: Member): string {
    const dim = isMuted(m.state) && !(m.state === "few" && showsRangeValue(m, here.range)) ? " dim" : "";
    const sp = m.spark
        ? sparkline(
              m.spark,
              clock.generated,
              `${MEMBER[m.id].name} by ${m.spark.step === "15m" ? "15 minutes" : m.spark.step === "1h" ? "hour" : "day"}`,
          )
        : "";
    const val = m.state === "nodata" ? "--" : bigValue(m.value);
    return (
        `<a class="row${dim}" href="${href(m.link)}"><span class="nm">${esc(MEMBER[m.id].name)}<small>${unlinked(memberLine(m))}</small></span>` +
        `<span class="val">${val}<small class="v6">${windowLabel(m, here.range)}</small></span>` +
        `<span class="tg">${unlinked(slaText(m.sla))}</span><span class="sp">${sp}</span><span class="st">${stateChip(m, here.range)}</span>${chev()}</a>`
    );
}

function memberRows(members: Member[]): string {
    if (!members.length) return "";
    const by = here.range === "24h" ? "24 h by hour" : "6 h by 15 min";
    return (
        `<div class="rows"><div class="thead rowh"><span>member</span><span>value</span><span>SLA</span><span>${by}</span><span>state</span><span></span></div>` +
        members.map(memberRow).join("") +
        `</div>`
    );
}

/** The page's state sentence: the member that set it, the others not OK, and the page's notes. */
function pageState(p: PageResponse): string {
    const word = p.state === "idle" ? "IDLE" : STATE_WORD[p.state];
    const chip = `<span class="sw ${p.state === "idle" ? "idle" : stateClass(p.state)}">${word}</span>`;
    const find = (r: MemberRef) => p.members.find((m) => m.id === r.member);
    const parts: string[] = [];
    if (p.setBy) {
        const m = find(p.setBy);
        if (p.setBy.fact && p.setBy.state !== "nodata") parts.push(`${capital(sentence(p.setBy.fact))}.`);
        else if (m && p.setBy.state === "nodata")
            parts.push(`${capital(MEMBER[m.id].short)} has NO DATA${m.reason ? `: ${sentence(m.reason)}` : ""}.`);
        else if (m) {
            const win =
                m.window === "now" ? " now" : m.window === "1h" || m.window === "1h6h" ? " over the last hour" : "";
            const v6 = m.value6h ? ` (6 h: ${fmtValue(m.value6h)})` : "";
            parts.push(`${capital(MEMBER[m.id].short)} is ${fmtValue(m.value)}${win}${v6}, ${slaText(m.sla)}.`);
        } else parts.push(`${capital(refText(p.setBy))}.`);
    } else if (p.state === "ok") parts.push("Every judged member is within its target.");
    const others = p.others.filter((r) => r.state === "bad" || r.state === "warn" || r.state === "nodata");
    if (others.length) {
        const txt = others.map((r) => {
            const m = find(r);
            const v6 = m?.value6h && !r.fact ? ` (6 h: ${fmtValue(m.value6h)})` : "";
            return refText(r) + v6;
        });
        parts.push(`Also ${others.some((r) => r.state === "bad") ? "failing" : "past target"}: ${txt.join(", ")}.`);
    }
    parts.push(...p.notes.map(sentence));
    return `<p class="pstate">${chip}<span>${parts.join(" ")}</span></p>`;
}

// ---------------------------------------------------------------- sections

const TABLES: Record<string, { cls: string; cols: [string, string][] }> = {
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
            ["since", "since"],
            ["suspects", "suspects: master merges since its last pass"],
            ["issue", "issue and fix"],
        ],
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
            ["attempt", "attempt"],
            ["candidate", "candidate"],
            ["lanes", "lanes"],
        ],
    },
    workflows: {
        cls: "t-wf",
        cols: [
            ["workflow", "workflow"],
            ["runs", "runs, last 1 h"],
            ["since", "failing since"],
            ["cause", "cause"],
        ],
    },
    money: {
        cls: "t-cost",
        cols: [
            ["line", "line"],
            ["projected", "projected, USD"],
            ["sofar", "so far / budget"],
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
            ["value", "value"],
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

function table(s: TableSection): string {
    const def = TABLES[s.id] ?? {
        cls: "t-sup",
        cols: Object.keys(s.rows[0]?.cells ?? {}).map((k) => [k, k] as [string, string]),
    };
    const head = `<div class="thead">${def.cols.map(([, h]) => `<span>${esc(h)}</span>`).join("")}</div>`;
    const rows = s.rows
        .map((r) => {
            const cls = `tr${r.past ? " past" : ""}${r.total ? " tot" : ""}`;
            const cells = def.cols.map(([k]) => `<span>${r.cells[k] ? cellHtml(r.cells[k]) : ""}</span>`).join("");
            return r.link
                ? `<a class="${cls}" href="${href(r.link)}">${cells}</a>`
                : `<div class="${cls}">${cells}</div>`;
        })
        .join("");
    const empty = s.rows.length ? "" : `<p class="empty">none in this range</p>`;
    return `<div class="tbl ${def.cls}" role="table">${head}${rows}</div>${empty}`;
}

function bars(s: BarsSection): string {
    const caption = s.id;
    if (s.groups.length === 1) return sortedBars(s.groups[0].items, cellHtml, caption);
    const list = (g: BarsSection["groups"][number]): string =>
        g.items.length
            ? sortedBars(g.items, cellHtml, g.head ? sentence(g.head) : caption)
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

function shards(s: ShardsSection): string {
    const maxS = Math.max(1200, ...s.rows.map((r) => r.p90S));
    const mins = (x: number) => fmtN(Math.round((x / 60) * 10) / 10);
    const head =
        `<div class="srow thead"><span>${s.runKind === "full" ? "shard" : "family"}</span><span class="num">runs</span><span class="num">median</span><span class="num">p90</span>` +
        `<span>0 to ${fmtN(Math.round(maxS / 60))} min; line = budget</span><span></span><span></span></div>`;
    const rows = s.rows
        .map((r) => {
            const { svg, note } = budgetBar(r, maxS);
            const name = r.group ? `${esc(r.shard)} (in ${esc(r.group)})` : esc(r.shard);
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
        `<div class="hrow thead"><span>group or family &gt; file &gt; test</span><span>distinct flaky tests</span><span class="num">events</span>` +
        `<span class="num">per 1,000</span><span class="num">quarantined</span><span class="num">PRs held</span><span></span></div>`;
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
                "a check failing in 3 or more pull requests, or failing alone where every check it summarizes passed",
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
            return h("Why first attempts failed", `${s.sub ? sentence(s.sub) : ""}, ${last}`);
        case "shards": {
            const sh = s as ShardsSection;
            return h(
                "Shard times",
                "slow measure; test step, attempt 1, successful runs",
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
            return h(
                "Runner-minutes per merge",
                `${s.sub ? sentence(s.sub) : ""}; pull request runs include those that never merged`,
            );
        case "jobs":
            return h(
                "Running and queued jobs",
                "organization, GitHub-hosted, one count axis; machine.dev T4 jobs are not counted",
            );
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
                "slow measure; ranked by distinct flaky tests; open a row for its files and tests",
                seg("hot", (s as TreeSection).range, [
                    ["7d", "7 d"],
                    ["28d", "28 d"],
                ]),
            );
        case "quarantine":
            return h("Quarantine");
        case "lanes":
            return h("Lanes on the candidate", s.sub ? sentence(s.sub) : "");
        case "trains":
            return h("Train attempts");
        case "workflows":
            return h("Release workflows");
        case "money":
            return h("Money this month", s.sub ? sentence(s.sub) : "");
        case "unit":
            return h("Unit costs", "for comparison; never part of the status");
        case "by-workflow":
            return h("By workflow", "money and list-price value are never summed");
        case "stress":
            return h("Weekly stress run", s.sub ? sentence(s.sub) : "");
        case "sources":
            return h("Sources");
        case "not-set-up":
            return h("Not set up", "no writer or token yet; out of the status until it exists");
        default:
            return h(s.id, s.sub ? sentence(s.sub) : "");
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

export function pageView(p: PageResponse): string {
    const title = PAGE_TITLE[p.page];
    const crumbs: [string, string][] = [["/", "Overview"]];
    if (p.page === "runners" || p.page === "local-runs") crumbs.push(["/ci", "CI"]);
    return (
        header(title, crumbs, p.generated, p.page === "costs") +
        pageState(p) +
        (p.page === "costs" ? "" : memberRows(p.members)) +
        p.sections.map(section).join("")
    );
}

function block(c: CategoryStatus): string {
    const name = CATEGORY_NAME[c.id];
    const word = c.state === "idle" ? "IDLE" : STATE_WORD[c.state];
    const lab = (h: string) => (c.state === "nodata" ? `<span class="lab">${h}</span>` : h);
    const by = c.setBy ? unlinked(refText(c.setBy)) : "";
    const more =
        c.others.length === 1
            ? `+ ${unlinked(refText(c.others[0]))}`
            : c.others.length > 1
              ? `+ ${c.others.length} more`
              : "";
    const aria = `${name}: ${word}${by ? `, ${by.replace(/<[^>]+>/g, "")}` : ""}`;
    const cls = c.state === "idle" ? "idle" : stateClass(c.state);
    return (
        `<a class="blk ${cls}" href="${href(PAGE_PATH[c.id])}" aria-label="${esc(aria)}"><span class="bn">${lab(esc(name))}</span><span class="bw">${lab(word)}</span>` +
        (by ? `<span class="by">${lab(by)}</span>` : "") +
        (more ? `<span class="by bym">${lab(more)}</span>` : "") +
        `${chev()}</a>`
    );
}

/** The headline's big value, or the gray word that stands in for it. */
function headlineValue(m: Member): string {
    if (m.state === "few" && !showsRangeValue(m, here.range))
        return `<span class="kvl">too few, n=${fmtN(m.n ?? 0)} of ${fmtN(m.minN ?? 0)}</span>`;
    if (m.state === "partial")
        return `<span class="kvm">partial window, ${fmtN(m.covered?.h ?? 0)} h of ${fmtN(m.covered?.of ?? 1)}</span>`;
    if (m.state === "nodata") return `<span class="kvl">NO DATA</span>`;
    if (m.state === "notsetup") return `<span class="kvl">not set up</span>`;
    return bigValue(m.value);
}

export function headline(m: Member): string {
    const t = MEMBER[m.id];
    const win = m.window === "now" ? "now" : here.range === "1h" ? "last 1 h" : `last ${rangeLabel(here.range)}`;
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
    kt.push(slaText(m.sla, true));
    const sp = m.spark ? sparkline(m.spark, clock.generated, `${t.name} trend`) : "";
    return `<a class="kpi" href="${href(m.link)}"><span class="kn">${esc(t.headline ?? t.name)}, ${win}</span><span class="kv">${kv}</span><span class="kt">${unlinked(kt.join("; "))}</span>${sp}</a>`;
}

function episode(e: Episode): string {
    const past = e.end !== null;
    return (
        `<a class="ep${past ? " past" : ""}" href="${href(e.link)}"><span class="eb ${e.worst}"></span><span class="et">${fmtSpan(e.start, e.end)}</span>` +
        `<span class="ec">${esc(CATEGORY_NAME[e.category])}</span><span class="ex">${unlinked(sentence(e.fact))}</span>` +
        `<span class="en">${past ? `cleared ${fmtAgo(e.end as string)}` : "ongoing"}</span>${chev()}</a>`
    );
}

/** Episodes listed open on the overview before the cleared rest fold away. */
const EPISODES_SHOWN = 6;

export function overviewView(o: OverviewResponse): string {
    const trend =
        here.range === "24h"
            ? "the last 24 h by hour, the last hour shaded"
            : "the last 6 h by 15 min with the last hour shaded; the faint line at the left is the rest of the last 24 h, hourly";
    const cols = o.categories.map((c) => `<li class="col">${block(c)}${headline(c.headline)}</li>`).join("");
    const ongoing = o.episodes.filter((e) => e.end === null);
    const cleared = o.episodes.filter((e) => e.end !== null);
    // The overview fits 1440 x 900 (2.1): every ongoing episode shows, cleared ones up to the cap, the rest folded.
    const shown = Math.max(0, EPISODES_SHOWN - ongoing.length);
    const folded = cleared.slice(shown);
    const more = folded.length
        ? `<details class="epm"><summary>${fmtN(folded.length)} more cleared${chev()}</summary>${folded.map(episode).join("")}</details>`
        : "";
    const eps = o.episodes.length
        ? [...ongoing, ...cleared.slice(0, shown)].map(episode).join("") + more
        : `<p class="empty">No member went past its target in the last 24 h.</p>`;
    return (
        header("Pipeline health", [], o.generated) +
        `<p class="kcap">Each block is its category's state: rates judged on the last 1 h, states now. Under it: the headline measure, ${here.range === "1h" ? "its 6 h value, and " : ""}${trend}.</p>` +
        `<ol class="status" aria-label="Category status">${cols}</ol>` +
        `<h2>Last 24 hours<span class="h2sub">each time a member went past its target; ongoing first</span></h2><div class="eps">${eps}</div>`
    );
}

export function testView(h: TestHistoryResponse): string {
    const title = h.test ?? h.file;
    const outcome = (o: TestHistoryResponse["events"][number]["outcome"]) =>
        o === "passed"
            ? "passed"
            : `<span class="mk ${o === "flaky" ? "warn" : "bad"}">${o === "failed-rerun" ? "failed rerun" : o}</span>`;
    const rows = h.events
        .map(
            (e) =>
                `<div class="tr${e.outcome === "passed" ? " past" : ""}"><span>${fmtTime(e.at)}</span><span>${e.pr ? prLink(e.pr) : e.kind === "full" ? "full run" : "local"}</span>` +
                `<span>${shaLink(e.sha)}, attempt ${fmtN(e.attempt)}</span><span>${outcome(e.outcome)}</span><span>${esc(e.signature ?? "")}</span><span>${runLink(e.run)}</span></div>`,
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
        `<p class="pstate"><span>${esc(h.file)}, ${esc(h.family)}${h.issue ? `; ${issueLink(h.issue)}` : ""}. Flaky and failed results in the last ${rangeLabel(h.range)}, newest first; CI and local results are never mixed.</span></p>` +
        `<div class="tbl t-hist" role="table"><div class="thead"><span>when</span><span>where</span><span>commit</span><span>result</span><span>signature</span><span>run</span></div>${rows}</div>`
    );
}

/** A category state's word, for the document title. */
export function stateWord(s: CategoryState): string {
    return s === "idle" ? "IDLE" : STATE_WORD[s];
}
