/**
 * The page's small SVG drawing functions (design section 11): sparkline, budget bar, sorted bars,
 * minute strip, tree rows, and the jobs chart. Each chart carries its values as a visually hidden
 * table, so a screen reader gets the numbers the picture shows.
 */
import type { BarsSection, Cell, Iso, JobsSection, ShardRow, Spark, StripSection, TreeNode } from "./contract";
import { esc, fmtN, fmtTime, fmtUnit, sentence, stripTags } from "./text";

const CHEV = `<svg class="chev" viewBox="0 0 10 16" width="10" height="16" aria-hidden="true"><path d="M2 2l6 6-6 6" /></svg>`;
export const chev = () => CHEV;

/** A visually hidden table: the values of a chart. */
export function hiddenTable(caption: string, head: string[], rows: (string | number)[][]): string {
    const th = head.map((h) => `<th scope="col">${esc(h)}</th>`).join("");
    const tr = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
    return `<span class="vh"><table><caption>${esc(caption)}</caption><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></span>`;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A sparkline, 120 x 28 (section 2.3): the 6 h trend in 15-minute buckets with the last hour shaded,
 * the rest of the 24 h hourly and faint at the left, the target as a gray band. A lasting breach
 * colors the line; a single breached bucket is a dot; the current bucket is a hollow dot; a source
 * with no history yet is hatched.
 */
export function sparkline(s: Spark, generated: Iso, caption: string): string {
    const W = 120;
    const all = [...s.ctx, ...s.trend].filter((v): v is number => v !== null);
    if (all.length === 0) {
        return (
            `<svg class="spark" viewBox="0 0 ${W} 28" width="${W}" height="28" aria-hidden="true">` +
            `<rect x="0" y="1" width="${W}" height="26" style="fill: url(#nh)" /><text class="nht" x="60" y="18" text-anchor="middle">no history</text></svg>` +
            hiddenTable(caption, ["bucket", "value"], [["all", "no history"]])
        );
    }
    let lo = Math.min(0, ...all, s.target ?? 0);
    let hi = Math.max(...all, s.target ?? -Infinity);
    if (hi === lo) hi = lo + 1;
    // One value alone has nothing to scale against: it sits mid-height at the newest end, not on the top edge.
    const single = all.length === 1 && s.target === undefined;
    const y = (v: number) => (single ? 14 : r1(25 - ((v - lo) / (hi - lo)) * 22));
    const hourly = s.step !== "15m";
    const xCtx = (i: number) => r1(1 + (i * 28) / Math.max(1, s.ctx.length - 1));
    const tx0 = hourly ? 3 : 35;
    const xT = (i: number) =>
        s.trend.length === 1 ? 117 : r1(tx0 + (i * (117 - tx0)) / Math.max(1, s.trend.length - 1));

    const parts: string[] = [];
    const winW = hourly ? (117 - tx0) / (s.trend.length - 1) + 3 : 15.5;
    if (s.step !== "1d") parts.push(`<rect class="win" x="${r1(W - winW)}" y="0" width="${r1(winW)}" height="28" />`);
    if (s.target !== undefined)
        parts.push(`<rect class="band" x="0" y="${r1(y(s.target) - 1)}" width="${W}" height="2" />`);

    // leading nulls: no history
    const firstCtx = s.ctx.findIndex((v) => v !== null);
    const firstTrend = s.trend.findIndex((v) => v !== null);
    let hatchEnd = 0;
    if (s.ctx.length && firstCtx === -1) hatchEnd = firstTrend <= 0 ? (firstTrend === 0 ? 33 : W) : xT(firstTrend) - 2;
    else if (s.ctx.length && firstCtx > 0) hatchEnd = xCtx(firstCtx) - 1.5;
    else if (!s.ctx.length && firstTrend > 0) hatchEnd = xT(firstTrend) - 2;
    if (hatchEnd > 0) {
        parts.push(`<rect x="0" y="1" width="${r1(hatchEnd)}" height="26" style="fill: url(#nh)" />`);
        // The words need about 70 px; a narrower hatch speaks for itself.
        if (hatchEnd >= 70)
            parts.push(`<text class="nht" x="${r1(hatchEnd / 2)}" y="18" text-anchor="middle">no history</text>`);
    }

    const pts = (vals: (number | null)[], x: (i: number) => number) =>
        vals
            .map((v, i) => (v === null ? null : `${x(i)},${y(v)}`))
            .filter((p): p is string => p !== null)
            .join(" ");
    if (s.ctx.length && firstCtx !== -1) parts.push(`<polyline class="ctx" points="${pts(s.ctx, xCtx)}" />`);
    if (firstTrend !== -1) parts.push(`<polyline points="${pts(s.trend, xT)}" />`);

    // breaches
    const b = s.breach;
    for (let i = 0; i + 1 < s.trend.length; i++) {
        const a = s.trend[i];
        const c = s.trend[i + 1];
        if (a === null || c === null || !b[i] || !b[i + 1]) continue;
        const cls = b[i] === "bad" || b[i + 1] === "bad" ? "bad" : "warn";
        const xy = `x1="${xT(i)}" y1="${y(a)}" x2="${xT(i + 1)}" y2="${y(c)}"`;
        if (cls === "warn") parts.push(`<line class="segedge" ${xy} />`);
        parts.push(`<line class="seg ${cls}" ${xy} />`);
    }
    for (let i = 0; i < s.trend.length; i++) {
        const v = s.trend[i];
        if (v === null || !b[i] || b[i - 1] || b[i + 1]) continue;
        parts.push(`<circle class="pt ${b[i]}" cx="${xT(i)}" cy="${y(v)}" r="2.6" />`);
    }
    const last = s.trend[s.trend.length - 1];
    if (last !== null && last !== undefined)
        parts.push(`<circle class="now" cx="${xT(s.trend.length - 1)}" cy="${y(last)}" r="2.4" />`);

    const stepMs = (s.step === "1d" ? 1440 : hourly ? 60 : 15) * 60_000;
    const end = Math.floor(Date.parse(generated) / stepMs) * stepMs;
    const rows = s.trend.map((v, i) => [
        fmtTime(new Date(end - (s.trend.length - 1 - i) * stepMs).toISOString()),
        v === null ? "none" : fmtN(v),
    ]);
    return (
        `<svg class="spark" viewBox="0 0 ${W} 28" width="${W}" height="28" aria-hidden="true">${parts.join("")}</svg>` +
        hiddenTable(caption, ["bucket starting", "value"], rows)
    );
}

/** A shard's bar (section 6): median dark, p90 a light extension, the budget a vertical line. */
export function budgetBar(r: ShardRow, maxS: number): { svg: string; note: string } {
    const W = 200;
    const x = (s: number) => Math.round(Math.min(W, (s / maxS) * W));
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
    const note = !judged
        ? `n=${r.runs}, not judged; ${budget}`
        : medOver
          ? `median over ${budget}`
          : p90Over
            ? `p90 over ${budget}`
            : budget;
    return { svg, note };
}

/** Sorted bars: one row per item, its bar scaled to the group's largest (`max`, when the list is drawn in parts). */
export function sortedBars(
    items: BarsSection["groups"][number]["items"],
    cellHtml: (c: Cell) => string,
    caption: string,
    max = Math.max(1, ...items.map((i) => i.n)),
): string {
    const rows = items
        .map((i) => {
            const w = r1((i.n / max) * 100);
            const cls = i.tone === "bad" ? " bad" : i.tone === "value" ? " lv" : "";
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

/** Hour ticks under a time chart, and "now" at the end when the chart ends at the data's time. */
function ticks(from: number, to: number, nowLabel: boolean): string {
    const span = to - from;
    const out = [`<span style="left: 0%">${fmtTime(new Date(from).toISOString()).slice(-5)}</span>`];
    const every = span > 12 * HOUR ? 3 * HOUR : HOUR;
    // A tick closer than 0.6 of a step to either end label would touch it.
    for (let t = Math.ceil(from / every) * every; t < to - every * 0.6; t += every) {
        if (t - from < every * 0.6) continue;
        out.push(
            `<span style="left: ${r1(((t - from) / span) * 100)}%">${fmtTime(new Date(t).toISOString()).slice(-5)}</span>`,
        );
    }
    if (nowLabel) out.push(`<span style="left: 100%; transform: translateX(-100%)">now</span>`);
    return `<div class="ticks" aria-hidden="true">${out.join("")}</div>`;
}

/** Master's state by minute (Master builds). */
export function minuteStrip(s: StripSection): string {
    const from = Date.parse(s.from);
    const to = Date.parse(s.to);
    const m = (iso: string) => r1((Date.parse(iso) - from) / 60_000);
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
    return (
        `<svg class="strip" viewBox="0 0 ${total} 18" preserveAspectRatio="none" aria-hidden="true">${rects}</svg>` +
        ticks(from, to, true) +
        hiddenTable(
            "master state by span",
            ["from", "to", "state"],
            s.spans.map((sp) => [
                fmtTime(sp.start),
                fmtTime(sp.end),
                sp.state === "gray" ? "cancelled, not counted" : sp.state,
            ]),
        )
    );
}

/**
 * Running and queued jobs on one count axis (Runners). The axis fits the data, so 15 jobs never draw as a flat line
 * under a 500-job limit; the limit is dashed only when it is in view. The end values sit right of the plot, apart.
 */
export function jobsChart(s: JobsSection): string {
    const n = s.running.length;
    const top = Math.max(1, ...s.running, ...s.queued) * 1.2;
    let step = 5;
    if (top > 200) step = 100;
    else if (top > 40) step = 20;
    const max = Math.ceil(top / step) * step;
    const y = (v: number) => r1(118 - (Math.min(v, max) / max) * 116);
    const x = (i: number) => r1((i * 960) / Math.max(1, n - 1));
    const line = (vals: number[]) => vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    const pct = (v: number) => (y(v) / 120) * 100;
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
        `<span class="cl bad end" style="top: ${r1(qTop)}px">${fmtN(lastQ)} queued</span></div>` +
        ticks(from, to, false) +
        hiddenTable(
            "jobs running and queued",
            ["bucket starting", "running", "queued"],
            s.running.map((r, i) => [fmtTime(new Date(from + i * stepMs).toISOString()), r, s.queued[i] ?? 0]),
        )
    );
}

/** Flake hotspot tree rows (section 5): each row opens its children in place; a test links to its history. */
export function treeRows(nodes: TreeNode[], href: (route: string) => string, depth = 0, path = ""): string {
    const maxDistinct = 2;
    return nodes
        .map((nd, i) => {
            const key = `${path}/${i}`;
            const tags = nd.tags?.length ? ` <small>${nd.tags.map(sentence).join("; ")}</small>` : "";
            let rate = "--";
            if (nd.per1000 !== null)
                rate = nd.per1000 > 10 ? `<span class="mk bad">${fmtN(nd.per1000)}</span>` : fmtN(nd.per1000);
            const cols =
                `<span class="nm d${Math.min(depth, 2)}">${esc(nd.name.replaceAll("__tests__/", "")).replaceAll("/", "/<wbr>")}${tags}</span>` +
                `<span class="dbar"><span style="width: ${Math.round((Math.min(nd.distinct, maxDistinct * 2) / maxDistinct) * 36)}px"></span>${fmtN(nd.distinct)}</span>` +
                `<span class="num">${fmtN(nd.events)}</span><span class="num">${rate}</span>` +
                `<span class="num">${nd.quarantined === null ? "--" : fmtN(nd.quarantined)}</span><span class="num">${nd.prsHeld === null ? "--" : fmtN(nd.prsHeld)}</span>${CHEV}`;
            if (nd.children?.length)
                return `<details data-key="tree${key}"><summary class="hrow">${cols}</summary>${treeRows(nd.children, href, depth + 1, key)}</details>`;
            if (nd.link) return `<a class="hrow leaf" href="${href(nd.link)}">${cols}</a>`;
            return `<div class="hrow">${cols.replace(CHEV, "<span></span>")}</div>`;
        })
        .join("");
}
