/**
 * The page's small SVG drawing functions (design section 11): sparkline, budget bar, sorted bars,
 * minute strip, tree rows, and the jobs chart. Each chart carries its values as a visually hidden
 * table, so a screen reader gets the numbers the picture shows.
 */
import type {
    BarsSection,
    Cell,
    Iso,
    JobsSection,
    SeriesSection,
    ShardRow,
    Spark,
    StripSection,
    TreeNode,
} from "./contract";
import { esc, fmtN, fmtTime, fmtUnit, sentence, stripTags } from "./text";

const CHEV = `<svg class="chev" viewBox="0 0 10 16" width="10" height="16" aria-hidden="true"><path d="M2 2l6 6-6 6" /></svg>`;
export const chev = (): string => CHEV;

/**
 * A visually hidden table: the values of a chart.
 * @param caption - The table's caption, naming the chart.
 * @param head - The column headings.
 * @param rows - The table's rows, one array of cell values each.
 * @returns The table's HTML inside a visually hidden span.
 */
export function hiddenTable(caption: string, head: string[], rows: (string | number)[][]): string {
    const th = head.map((h) => `<th scope="col">${esc(h)}</th>`).join("");
    const tr = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
    return `<span class="vh"><table><caption>${esc(caption)}</caption><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></span>`;
}

const r1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * A sparkline, 120 x 28 (section 2.3): the 6 h trend in 15-minute buckets with the last hour shaded,
 * the rest of the 24 h hourly and faint at the left, the target as a gray band. A lasting breach
 * colors the line; a single breached bucket is a dot; the current bucket is a hollow dot; a source
 * with no history yet is hatched.
 * @param s - The sparkline's data: trend, context, target and breaches.
 * @param generated - When the data was generated; the newest bucket ends here.
 * @param caption - The caption of the hidden table of values.
 * @returns The SVG followed by its hidden table.
 */
export function sparkline(s: Spark, generated: Iso, caption: string): string {
    const W = 120;
    const all = [...s.ctx, ...s.trend].filter((v): v is number => v !== null);
    if (all.length === 0) {
        return (
            `<svg class="spark" viewBox="0 0 ${W} 28" width="${W}" height="28" aria-hidden="true">` +
            `<rect x="0" y="1" width="${W}" height="26" style="fill: url(#nh)" /><text class="nht" x="60" y="18" text-anchor="middle">no history</text></svg>${hiddenTable(
                caption,
                ["bucket", "value"],
                [["all", "no history"]],
            )}`
        );
    }
    const lo = Math.min(0, ...all, s.target ?? 0);
    let hi = Math.max(...all, s.target ?? -Infinity);
    if (hi === lo) {
        hi = lo + 1;
    }
    // One value alone has nothing to scale against: it sits mid-height at the newest end, not on the top edge.
    const single = all.length === 1 && s.target === undefined;
    const y = (v: number): number => (single ? 14 : r1(25 - ((v - lo) / (hi - lo)) * 22));
    const hourly = s.step !== "15m";
    const xCtx = (i: number): number => r1(1 + (i * 28) / Math.max(1, s.ctx.length - 1));
    const tx0 = hourly ? 3 : 35;
    const xT = (i: number): number =>
        s.trend.length === 1 ? 117 : r1(tx0 + (i * (117 - tx0)) / Math.max(1, s.trend.length - 1));

    const parts: string[] = [];
    const winW = hourly ? (117 - tx0) / (s.trend.length - 1) + 3 : 15.5;
    if (s.step !== "1d") {
        parts.push(`<rect class="win" x="${r1(W - winW)}" y="0" width="${r1(winW)}" height="28" />`);
    }
    if (s.target !== undefined) {
        parts.push(`<rect class="band" x="0" y="${r1(y(s.target) - 1)}" width="${W}" height="2" />`);
    }

    // leading nulls: no history
    const firstCtx = s.ctx.findIndex((v) => v !== null);
    const firstTrend = s.trend.findIndex((v) => v !== null);
    let hatchEnd = 0;
    if (s.ctx.length && firstCtx === -1) {
        if (firstTrend > 0) {
            hatchEnd = xT(firstTrend) - 2;
        } else {
            hatchEnd = firstTrend === 0 ? 33 : W;
        }
    } else if (s.ctx.length && firstCtx > 0) {
        hatchEnd = xCtx(firstCtx) - 1.5;
    } else if (!s.ctx.length && firstTrend > 0) {
        hatchEnd = xT(firstTrend) - 2;
    }
    if (hatchEnd > 0) {
        parts.push(`<rect x="0" y="1" width="${r1(hatchEnd)}" height="26" style="fill: url(#nh)" />`);
        // The words need about 70 px; a narrower hatch speaks for itself.
        if (hatchEnd >= 70) {
            parts.push(`<text class="nht" x="${r1(hatchEnd / 2)}" y="18" text-anchor="middle">no history</text>`);
        }
    }

    const pts = (vals: (number | null)[], x: (i: number) => number): string =>
        vals
            .map((v, i) => (v === null ? null : `${x(i)},${y(v)}`))
            .filter((p): p is string => p !== null)
            .join(" ");
    if (s.ctx.length && firstCtx !== -1) {
        parts.push(`<polyline class="ctx" points="${pts(s.ctx, xCtx)}" />`);
    }
    if (firstTrend !== -1) {
        parts.push(`<polyline points="${pts(s.trend, xT)}" />`);
    }

    // breaches
    const b = s.breach;
    for (let i = 0; i + 1 < s.trend.length; i++) {
        const a = s.trend[i];
        const c = s.trend[i + 1];
        if (a === null || c === null || !b[i] || !b[i + 1]) {
            continue;
        }
        const cls = b[i] === "bad" || b[i + 1] === "bad" ? "bad" : "warn";
        const xy = `x1="${xT(i)}" y1="${y(a)}" x2="${xT(i + 1)}" y2="${y(c)}"`;
        if (cls === "warn") {
            parts.push(`<line class="segedge" ${xy} />`);
        }
        parts.push(`<line class="seg ${cls}" ${xy} />`);
    }
    for (let i = 0; i < s.trend.length; i++) {
        const v = s.trend[i];
        const bi = b[i];
        if (v === null || !bi || b[i - 1] || b[i + 1]) {
            continue;
        }
        parts.push(`<circle class="pt ${bi}" cx="${xT(i)}" cy="${y(v)}" r="2.6" />`);
    }
    const last = s.trend[s.trend.length - 1];
    if (last !== null && last !== undefined) {
        parts.push(`<circle class="now" cx="${xT(s.trend.length - 1)}" cy="${y(last)}" r="2.4" />`);
    }

    let stepMin = 15;
    if (s.step === "1d") {
        stepMin = 1440;
    } else if (hourly) {
        stepMin = 60;
    }
    const stepMs = stepMin * 60_000;
    const end = Math.floor(Date.parse(generated) / stepMs) * stepMs;
    const rows = s.trend.map((v, i) => [
        fmtTime(new Date(end - (s.trend.length - 1 - i) * stepMs).toISOString()),
        v === null ? "none" : fmtN(v),
    ]);
    return `<svg class="spark" viewBox="0 0 ${W} 28" width="${W}" height="28" aria-hidden="true">${parts.join("")}</svg>${hiddenTable(
        caption,
        ["bucket starting", "value"],
        rows,
    )}`;
}

/**
 * A shard's bar (section 6): median dark, p90 a light extension, the budget a vertical line.
 * @param r - The shard's row: run count, median, p90 and budget in seconds.
 * @param maxS - The largest value on the shared axis, in seconds.
 * @returns The bar's SVG and the note printed beside it.
 */
export function budgetBar(r: ShardRow, maxS: number): { svg: string; note: string } {
    const W = 200;
    const x = (s: number): number => Math.round(Math.min(W, (s / maxS) * W));
    const judged = r.runs >= r.minRuns;
    const medOver = judged && r.medianS > r.budgetS;
    const p90Over = judged && !medOver && r.p90S > r.budgetS;
    const svg =
        `<svg class="sbar" viewBox="0 0 ${W} 14" width="${W}" height="14" aria-hidden="true">` +
        `<rect class="p90${p90Over ? " warn" : ""}" x="0" y="3" width="${x(r.p90S)}" height="8" />` +
        `<rect class="${judged ? `med${medOver ? " bad" : ""}` : "p90"}" x="0" y="3" width="${x(r.medianS)}" height="8" />` +
        `<line class="bud" x1="${x(r.budgetS)}" y1="0" x2="${x(r.budgetS)}" y2="14" /></svg>`;
    // The budget is printed, not only drawn, so "over budget" says over what.
    const budget = `budget ${fmtN(Math.round((r.budgetS / 60) * 10) / 10)} min`;
    let note = budget;
    if (!judged) {
        note = `n=${r.runs}, not judged; ${budget}`;
    } else if (medOver) {
        note = `median over ${budget}`;
    } else if (p90Over) {
        note = `p90 over ${budget}`;
    }
    return { svg, note };
}

/**
 * Sorted bars: one row per item, its bar scaled to the group's largest (`max`, when the list is drawn in parts).
 * @param items - The items to draw, in display order.
 * @param cellHtml - Renders a label or detail cell as HTML.
 * @param caption - The caption of the hidden table of values.
 * @param max - The value of a full-width bar; defaults to the largest item.
 * @returns The bars followed by their hidden table.
 */
export function sortedBars(
    items: BarsSection["groups"][number]["items"],
    cellHtml: (c: Cell) => string,
    caption: string,
    max = Math.max(1, ...items.map((i) => i.n)),
): string {
    const rows = items
        .map((i) => {
            const w = r1((i.n / max) * 100);
            let cls = "";
            if (i.tone === "bad") {
                cls = " bad";
            } else if (i.tone === "value") {
                cls = " lv";
            }
            const val = i.unit === "usd" || i.unit === "count" ? fmtN(i.n) : fmtUnit(i.n, i.unit);
            const detail = i.detail ? `<small> ${cellHtml(i.detail)}</small>` : "";
            // cellHtml escapes its text, so the HTML without its tags is safe in an attribute.
            const title = stripTags(i.detail ? `${cellHtml(i.label)} ${cellHtml(i.detail)}` : cellHtml(i.label));
            return `<div class="br"><span class="bl" title="${title}">${cellHtml(i.label)}${detail}</span><span class="bv" aria-hidden="true"><span class="hb${cls}" style="width: ${w}%"></span><span class="bn2">${esc(val)}</span></span></div>`;
        })
        .join("");
    const table = hiddenTable(
        caption,
        ["item", "value"],
        items.map((i) => [
            cellHtml(i.label).replace(/<[^>]+>/g, ""),
            i.unit === "usd" ? `${fmtN(i.n)} USD` : fmtUnit(i.n, i.unit),
        ]),
    );
    return `<div class="bars">${rows}</div>${table}`;
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/**
 * The step between ticks and how a tick reads: hours ("14:00") on a chart of a day or less, days ("10-25") on a
 * longer one, every 7 days up to two months and every 28 days past that.
 * @param span - The chart's span, in milliseconds.
 * @returns The step in milliseconds and the label of a tick.
 */
function tickStep(span: number): { every: number; label: (t: number) => string } {
    if (span > 3 * DAY) {
        return { every: span > 60 * DAY ? 28 * DAY : 7 * DAY, label: (t) => new Date(t).toISOString().slice(5, 10) };
    }
    return {
        every: span > 12 * HOUR ? 3 * HOUR : HOUR,
        label: (t) => fmtTime(new Date(t).toISOString()).slice(-5),
    };
}

/**
 * Ticks under a time chart, and "now" at the end when the chart ends at the data's time.
 * @param from - The chart's start, in epoch milliseconds.
 * @param to - The chart's end, in epoch milliseconds.
 * @param nowLabel - Whether to label the right end "now".
 * @returns The ticks row's HTML.
 */
function ticks(from: number, to: number, nowLabel: boolean): string {
    const span = to - from;
    const { every, label } = tickStep(span);
    const out = [`<span style="left: 0%">${label(from)}</span>`];
    // A tick closer than 0.6 of a step to either end label would touch it.
    for (let t = Math.ceil(from / every) * every; t < to - every * 0.6; t += every) {
        if (t - from < every * 0.6) {
            continue;
        }
        out.push(`<span style="left: ${r1(((t - from) / span) * 100)}%">${label(t)}</span>`);
    }
    if (nowLabel) {
        out.push(`<span style="left: 100%; transform: translateX(-100%)">now</span>`);
    }
    return `<div class="ticks" aria-hidden="true">${out.join("")}</div>`;
}

/**
 * Master's state by minute (Master builds).
 * @param s - The strip's time range and its state spans.
 * @returns The strip's SVG, its ticks and its hidden table.
 */
export function minuteStrip(s: StripSection): string {
    const from = Date.parse(s.from);
    const to = Date.parse(s.to);
    const m = (iso: string): number => r1((Date.parse(iso) - from) / 60_000);
    const total = m(s.to);
    const cls = { green: "g", red: "r", gray: "s", pending: "" } as const;
    const rects = s.spans
        .map((sp) => {
            const x = Math.max(0, m(sp.start));
            const w = Math.max(0, m(sp.end) - x);
            return sp.state === "pending"
                ? `<rect x="${x}" y="0" width="${w}" height="18" style="fill: url(#nh)" />`
                : `<rect class="${cls[sp.state]}" x="${x}" y="0" width="${w}" height="18" />`;
        })
        .join("");
    return `<svg class="strip" viewBox="0 0 ${total} 18" preserveAspectRatio="none" aria-hidden="true">${rects}</svg>${ticks(
        from,
        to,
        true,
    )}${hiddenTable(
        "master state by span",
        ["from", "to", "state"],
        s.spans.map((sp) => [
            fmtTime(sp.start),
            fmtTime(sp.end),
            sp.state === "gray" ? "cancelled, not counted" : sp.state,
        ]),
    )}`;
}

/**
 * Running and queued jobs on one count axis (Runners). The axis fits the data, so 15 jobs never draw as a flat line
 * under a 500-job limit; the limit is dashed only when it is in view. The end values sit right of the plot, apart.
 * @param s - The running and queued counts per bucket, the bucket step, start and limit.
 * @returns The legend, chart, ticks and hidden table.
 */
export function jobsChart(s: JobsSection): string {
    const n = s.running.length;
    const top = Math.max(1, ...s.running, ...s.queued) * 1.2;
    let step = 5;
    if (top > 200) {
        step = 100;
    } else if (top > 40) {
        step = 20;
    }
    const max = Math.ceil(top / step) * step;
    const y = (v: number): number => r1(118 - (Math.min(v, max) / max) * 116);
    const x = (i: number): number => r1((i * 960) / Math.max(1, n - 1));
    const line = (vals: number[]): string => vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    const pct = (v: number): number => (y(v) / 120) * 100;
    const lastRun = s.running[n - 1] ?? 0;
    const lastQ = s.queued[n - 1] ?? 0;
    const stepMs = (s.step === "1h" ? 60 : 15) * 60_000;
    const from = Date.parse(s.start);
    const to = from + (n - 1) * stepMs;
    // The two end labels, 14 px apart at least (the chart is 120 px tall): queued above, running below.
    let runTop = (pct(lastRun) / 100) * 120 - 8;
    let qTop = (pct(lastQ) / 100) * 120 - 8;
    if (Math.abs(runTop - qTop) < 14) {
        const mid = (runTop + qTop) / 2;
        qTop = mid - 7;
        runTop = mid + 7;
    }
    const limit = s.limit <= max ? `<line class="plat" x1="0" y1="${y(s.limit)}" x2="960" y2="${y(s.limit)}" />` : "";
    const limitKey = s.limit <= max ? '<span class="lk lim"></span>limit' : "";
    return (
        `<p class="legend"><span class="lk run"></span>running<span class="lk q"></span>queued${limitKey}</p>` +
        `<div class="chart"><svg viewBox="0 0 960 120" preserveAspectRatio="none" aria-hidden="true">${limit}` +
        `<polyline class="run" points="${line(s.running)}" /><polyline class="q" points="${line(s.queued)}" /></svg>` +
        `<span class="cl" style="top: -4px; left: 4px">${fmtN(max)} jobs</span>` +
        `<span class="cl ink end" style="top: ${r1(runTop)}px">${fmtN(lastRun)} running</span>` +
        `<span class="cl bad end" style="top: ${r1(qTop)}px">${fmtN(lastQ)} queued</span></div>${ticks(
            from,
            to,
            false,
        )}${hiddenTable(
            "jobs running and queued",
            ["bucket starting", "running", "queued"],
            s.running.map((r, i) => [fmtTime(new Date(from + i * stepMs).toISOString()), r, s.queued[i] ?? 0]),
        )}`
    );
}

/**
 * Flake hotspot tree rows (section 5): each row opens its children in place; a test links to its history.
 * @param nodes - The tree nodes at this level.
 * @param href - Turns a route into a link target.
 * @param depth - The nesting depth, used for indentation.
 * @param path - The key path of the parent row, used for the details keys.
 * @returns The rows' HTML.
 */
export function treeRows(nodes: TreeNode[], href: (route: string) => string, depth = 0, path = ""): string {
    const maxDistinct = 2;
    return nodes
        .map((nd, i) => {
            const key = `${path}/${i}`;
            const tags = nd.tags?.length ? ` <small>${nd.tags.map(sentence).join("; ")}</small>` : "";
            let rate = "--";
            if (nd.per1000 !== null) {
                rate = nd.per1000 > 10 ? `<span class="mk bad">${fmtN(nd.per1000)}</span>` : fmtN(nd.per1000);
            }
            const cols =
                `<span class="nm d${Math.min(depth, 2)}">${esc(nd.name.replaceAll("__tests__/", "")).replaceAll("/", "/<wbr>")}${tags}</span>` +
                `<span class="dbar"><span style="width: ${Math.round((Math.min(nd.distinct, maxDistinct * 2) / maxDistinct) * 36)}px"></span>${fmtN(nd.distinct)}</span>` +
                `<span class="num">${fmtN(nd.events)}</span><span class="num">${rate}</span>` +
                `<span class="num">${nd.quarantined === null ? "--" : fmtN(nd.quarantined)}</span><span class="num">${nd.prsHeld === null ? "--" : fmtN(nd.prsHeld)}</span>${CHEV}`;
            if (nd.children?.length) {
                return `<details data-key="tree${key}"><summary class="hrow">${cols}</summary>${treeRows(nd.children, href, depth + 1, key)}</details>`;
            }
            if (nd.link) {
                return `<a class="hrow leaf" href="${href(nd.link)}">${cols}</a>`;
            }
            return `<div class="hrow">${cols.replace(CHEV, "<span></span>")}</div>`;
        })
        .join("");
}

/**
 * A series' color class: the last part of its key ("issues.prio.critical" draws as `k-critical`).
 * @param key - The series' label code.
 * @returns The class name.
 */
const seriesClass = (key: string): string => `k-${key.slice(key.lastIndexOf(".") + 1).replaceAll("_", "-")}`;

/**
 * A nice axis top for counts: the largest value plus a tenth, rounded up to a step of 1, 2 or 5 times a power of 10
 * that cuts the axis into about five.
 * @param max - The largest value drawn.
 * @returns The axis top, at least 1.
 */
function niceTop(max: number): number {
    const top = Math.max(1, max * 1.1);
    const pow = 10 ** Math.floor(Math.log10(top / 5));
    const step = [1, 2, 5, 10].map((m) => m * pow).find((x) => x >= top / 5) ?? 10 * pow;
    return Math.ceil(top / step) * step;
}

/**
 * A series chart's legend: a key per series, named by the page.
 * @param s - The series section.
 * @param name - Names a series by its key.
 * @returns The legend's HTML.
 */
function seriesLegend(s: SeriesSection, name: (key: string) => string): string {
    return `<p class="legend">${s.series.map((x) => `<span class="li"><span class="lk ${seriesClass(x.key)}"></span>${esc(name(x.key))}</span>`).join("")}</p>`;
}

/**
 * A series chart's buckets: where each starts, its width on the chart, and the chart's span.
 * @param s - The series section.
 * @returns The first start, the bucket size and count, all in epoch milliseconds.
 */
function bucketsOf(s: SeriesSection): { from: number; size: number; n: number } {
    return { from: Date.parse(s.start), size: s.step === "1w" ? 7 * DAY : DAY, n: s.series[0]?.values.length ?? 0 };
}

/**
 * Each bucket's values as a visually hidden table, one column per series.
 * @param s - The series section.
 * @param name - Names a series by its key.
 * @param caption - The table's caption.
 * @returns The hidden table.
 */
function seriesTable(s: SeriesSection, name: (key: string) => string, caption: string): string {
    const { from, size, n } = bucketsOf(s);
    return hiddenTable(
        caption,
        [s.step === "1w" ? "week starting" : "day", ...s.series.map((x) => name(x.key))],
        Array.from({ length: n }, (_, i) => [
            new Date(from + i * size).toISOString().slice(0, 10),
            ...s.series.map((x) => x.values[i] ?? 0),
        ]),
    );
}

/**
 * A tooltip strip: one invisible column per bucket whose title lists the bucket's values, for a pointer.
 * @param s - The series section.
 * @param name - Names a series by its key.
 * @returns The columns' SVG.
 */
function hoverColumns(s: SeriesSection, name: (key: string) => string): string {
    const { from, size, n } = bucketsOf(s);
    const w = 960 / Math.max(1, n);
    return Array.from({ length: n }, (_, i) => {
        const day = new Date(from + i * size).toISOString().slice(0, 10);
        const title = [
            `${s.step === "1w" ? "week of " : ""}${day}`,
            ...s.series.map((x) => `${name(x.key)}: ${fmtN(x.values[i] ?? 0)}`),
        ];
        return `<rect class="hit" x="${r1(i * w)}" y="0" width="${r1(w)}" height="120"><title>${esc(title.join("\n"))}</title></rect>`;
    }).join("");
}

/**
 * End labels right of a plot, each at its value's height and at least 14 px from the next (the chart is 120 px tall).
 * @param items - Each label's height on the 120 px plot and its HTML.
 * @returns The labels' HTML.
 */
function endLabels(items: { y: number; html: string }[]): string {
    const placed = items.map((x) => ({ ...x, top: x.y - 8 }));
    placed.sort((a, b) => a.top - b.top);
    for (let i = 1; i < placed.length; i++) {
        placed[i].top = Math.max(placed[i].top, placed[i - 1].top + 14);
    }
    // Pushed below the plot: move the lowest back up to its bottom and the rest up with it, 14 px apart.
    for (let i = placed.length - 1; i >= 0; i--) {
        placed[i].top = Math.min(placed[i].top, i === placed.length - 1 ? 106 : placed[i + 1].top - 14);
    }
    return placed.map((p) => `<span class="cl ink end" style="top: ${r1(p.top)}px">${p.html}</span>`).join("");
}

/**
 * Counts at each bucket's end as lines on one fitted axis (Issues: open bugs by priority, open issues by type). The
 * first series is the total, drawn darkest; each line ends in its value and name, right of the plot.
 * @param s - The series section, chart `lines`.
 * @param name - Names a series by its key.
 * @returns The legend, chart, ticks and hidden table.
 */
export function lineChart(s: SeriesSection, name: (key: string) => string): string {
    const { from, size, n } = bucketsOf(s);
    const max = niceTop(Math.max(0, ...s.series.flatMap((x) => x.values)));
    const y = (v: number): number => r1(118 - (Math.min(v, max) / max) * 116);
    const x = (i: number): number => r1(n > 1 ? (i * 960) / (n - 1) : 960);
    const lines = s.series
        .map(
            (sr) =>
                `<polyline class="${seriesClass(sr.key)}" points="${sr.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}" />`,
        )
        .join("");
    const ends = endLabels(
        s.series.map((sr) => {
            const v = sr.values.at(-1) ?? 0;
            return { y: y(v), html: `${fmtN(v)} ${esc(name(sr.key))}` };
        }),
    );
    return [
        seriesLegend(s, name),
        `<div class="chart lines"><svg viewBox="0 0 960 120" preserveAspectRatio="none" aria-hidden="true">${lines}${hoverColumns(s, name)}</svg>`,
        `<span class="cl" style="top: -4px; left: 4px">${fmtN(max)}</span>${ends}</div>`,
        ticks(from + size, from + n * size, true),
        seriesTable(s, name, "open at the end of each bucket"),
    ].join("");
}

/**
 * Counts per bucket as columns (Issues). `stacked`: every series stacked up from the base. `flow`: opened above a
 * zero line, the closed series stacked below it, and the last series (opened less closed) as a line of dots.
 * @param s - The series section, chart `stacked` or `flow`.
 * @param name - Names a series by its key.
 * @returns The legend, chart, ticks and hidden table.
 */
export function barChart(s: SeriesSection, name: (key: string) => string): string {
    const { from, size, n } = bucketsOf(s);
    const flow = s.chart === "flow";
    const up = flow ? s.series.slice(0, 1) : s.series;
    const down = flow ? s.series.slice(1, -1) : [];
    const total = (list: SeriesSection["series"], i: number): number =>
        list.reduce((a, x) => a + (x.values[i] ?? 0), 0);
    const idx = Array.from({ length: n }, (_, i) => i);
    const topUp = niceTop(Math.max(0, ...idx.map((i) => total(up, i))));
    const topDown = down.length ? niceTop(Math.max(0, ...idx.map((i) => total(down, i)))) : 0;
    // The zero line sits where the two halves meet, each half fitted to its own largest column.
    const scale = 116 / (topUp + topDown);
    const zero = r1(2 + topUp * scale);
    const w = 960 / Math.max(1, n);
    const rects: string[] = [];
    const stack = (list: SeriesSection["series"], dir: 1 | -1): void => {
        for (const i of idx) {
            let at = 0;
            for (const sr of list) {
                const h = (sr.values[i] ?? 0) * scale;
                if (h > 0) {
                    const yTop = dir === 1 ? zero - at - h : zero + at;
                    rects.push(
                        `<rect class="${seriesClass(sr.key)}" x="${r1(i * w + 1)}" y="${r1(yTop)}" width="${r1(Math.max(1, w - 2))}" height="${r1(h)}" />`,
                    );
                }
                at += h;
            }
        }
    };
    stack(up, 1);
    stack(down, -1);
    const net = flow ? s.series.at(-1) : undefined;
    const netY = (v: number): number => r1(zero - v * scale);
    const netLine = net
        ? `<polyline class="${seriesClass(net.key)}" points="${net.values.map((v, i) => `${r1((i + 0.5) * w)},${netY(v)}`).join(" ")}" />`
        : "";
    const dots = net
        ? `<div class="netdots">${net.values.map((v, i) => `<span class="ndot ${seriesClass(net.key)}" style="left: ${r1(((i + 0.5) / Math.max(1, n)) * 100)}%; top: ${netY(v)}px"></span>`).join("")}</div>`
        : "";
    const axis = flow
        ? `<span class="cl" style="top: -4px; left: 4px">${fmtN(topUp)} ${esc(name(up[0]?.key ?? ""))}</span><span class="cl" style="bottom: -4px; left: 4px">${fmtN(topDown)} closed</span>`
        : `<span class="cl" style="top: -4px; left: 4px">${fmtN(topUp)}</span>`;
    const zeroLine = flow ? `<line class="zero" x1="0" y1="${zero}" x2="960" y2="${zero}" />` : "";
    return [
        seriesLegend(s, name),
        `<div class="chart cols"><svg viewBox="0 0 960 120" preserveAspectRatio="none" aria-hidden="true">`,
        `${rects.join("")}${zeroLine}${netLine}${hoverColumns(s, name)}</svg>${dots}${axis}</div>`,
        ticks(from, from + n * size, true),
        seriesTable(s, name, flow ? "opened and closed per bucket" : "opened per bucket"),
    ].join("");
}
