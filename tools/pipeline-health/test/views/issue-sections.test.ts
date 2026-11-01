// The Issues page's counts on a hand-built set of issues: types and priorities, the burn-down (open at each bucket's
// end), opened and closed per bucket, the two tables, the notes, and the size of the view with 10,000 issues.
import { gzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { DAY, HOUR, type IssueItem } from "../../src/model/items.js";
import { MAX_VIEW_BYTES } from "../../src/views/index.js";
import { buckets, issuesPage, openAt, prioOf, typeOf } from "../../src/views/issue-sections.js";
import type { PageResponse, Section, SeriesSection, TableSection } from "../../web/src/contract.js";

/** Sunday 2026-10-25 12:00 UTC. */
const NOW = Date.UTC(2026, 9, 25, 12);
/** The start of the 28-day range's bucket k (2026-09-28 is bucket 0). */
const D = (k: number): number => Date.UTC(2026, 8, 28) + k * DAY;
const BEFORE = D(0) - 40 * DAY;

let n = 0;
const issue = (labels: string[], createdAt: number, closed?: [number, string]): IssueItem => ({
    kind: "issue",
    id: `o/r#${++n}`,
    attempt: 1,
    repo: "o/r",
    number: n,
    title: `issue ${n}`,
    labels,
    createdAt,
    ...(closed ? { closedAt: closed[0], stateReason: closed[1] } : {}),
});

// Bugs: a and j critical and open, b closed, c closed as not planned before it began, f with no priority opened
// today, g open since before the range (reopened: no closedAt), i high, open and blocked since before the range.
const a = issue(["bug", "priority:critical"], D(0) + HOUR);
const b = issue(["bug", "priority:high"], D(1), [D(3), "completed"]);
const c = issue(["bug", "priority:low"], BEFORE, [D(2), "not_planned"]);
const d = issue(["enhancement", "priority:medium"], D(5), [D(5) + 2 * HOUR, "duplicate"]);
const e = issue([], D(10));
const f = issue(["intermittent", "bug"], D(27) + HOUR);
const g = issue(["bug", "priority:medium"], BEFORE);
const i = issue(["bug", "priority:high", "blocked", "in-progress"], BEFORE - DAY);
const j = issue(["bug", "priority:critical"], D(2));
const ALL = [a, b, c, d, e, f, g, i, j];

const page = (range: "28d" | "all" = "28d", githubOpen?: number): PageResponse =>
    issuesPage(ALL, range, NOW, githubOpen);
const find = (p: PageResponse, id: string): Section | undefined => p.sections.find((s) => s.id === id);
const seriesOf = (p: PageResponse, id: string): SeriesSection => find(p, id) as SeriesSection;
const tableOf = (p: PageResponse, id: string): TableSection => find(p, id) as TableSection;
const values = (s: SeriesSection, key: string): number[] => s.series.find((x) => x.key === key)?.values ?? [];

describe("issue classification", () => {
    it("takes the first type label in order, bug over intermittent, and none without one", () => {
        expect(typeOf(f)).toBe("bug");
        expect(typeOf({ labels: ["tracking", "enhancement"] })).toBe("enhancement");
        expect(typeOf(e)).toBe("none");
        expect(prioOf(f)).toBe("none");
        expect(prioOf({ labels: ["priority:low", "priority:high"] })).toBe("high");
    });

    it("counts an issue open from its creation until its close, at a bucket's ends", () => {
        expect(openAt(b, D(1))).toBe(false);
        expect(openAt(b, D(1) + 1)).toBe(true);
        expect(openAt(b, D(3))).toBe(true);
        expect(openAt(b, D(3) + 1)).toBe(false);
        expect(openAt(g, NOW)).toBe(true);
    });

    it("buckets 28 UTC days with the last ending now, or weeks from the Monday of the first issue's week", () => {
        const days = buckets("28d", NOW, BEFORE);
        expect(days.starts).toHaveLength(28);
        expect(days.starts[0]).toBe(D(0));
        expect(days.ends.at(-1)).toBe(NOW + 1);
        const weeks = buckets("all", NOW, Date.UTC(2026, 9, 8, 15));
        expect(weeks.step).toBe("1w");
        expect(weeks.starts.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual([
            "2026-10-05",
            "2026-10-12",
            "2026-10-19",
        ]);
        expect(new Date(weeks.starts[0]).getUTCDay()).toBe(1);
    });
});

describe("the Issues page", () => {
    it("burns down open bugs by priority from the range's start, and counts the change from the first value drawn", () => {
        const s = seriesOf(page(), "bugs");
        expect(s).toMatchObject({ kind: "series", chart: "area", step: "1d", start: new Date(D(0)).toISOString() });
        // A stock has the count at the range's start, then one per bucket's end.
        expect(values(s, "issues.prio.critical")).toHaveLength(29);
        const open = s.series[0].values.map((_, k) => s.series.reduce((a, x) => a + x.values[k], 0));
        expect(open.slice(0, 5)).toEqual([3, 4, 5, 5, 4]);
        expect(open.at(-1)).toBe(5);
        expect(values(s, "issues.prio.critical").slice(0, 4)).toEqual([0, 1, 1, 2]);
        // f has no priority label: counted on its own band, never dropped.
        expect(values(s, "issues.prio.none").at(-1)).toBe(1);
        expect(values(s, "issues.prio.none").at(-2)).toBe(0);
        expect(s.sub).toEqual({
            code: "issues.sub.bugs",
            params: { open: 5, change: 2, critical: 2, criticalChange: 2, range: "28d" },
        });
    });

    it("leaves out the no-priority line when every bug always had a priority", () => {
        const s = issuesPage([a, b, g], "28d", NOW, undefined).sections.find((x) => x.id === "bugs") as SeriesSection;
        expect(s.series.map((x) => x.key)).toEqual([
            "issues.prio.critical",
            "issues.prio.high",
            "issues.prio.medium",
            "issues.prio.low",
        ]);
    });

    it("counts opened and closed per bucket, a duplicate or not-planned close apart from a completed one", () => {
        const p = page();
        const bugs = seriesOf(p, "bug-flow");
        expect(bugs.chart).toBe("flow");
        expect(values(bugs, "issues.series.opened").slice(0, 3)).toEqual([1, 1, 1]);
        expect(values(bugs, "issues.series.closed_not_planned")[2]).toBe(1);
        expect(values(bugs, "issues.series.closed_completed")[3]).toBe(1);
        expect(bugs.sub?.params).toEqual({ opened: 4, closed: 2, net: 2, range: "28d" });
        const all = seriesOf(p, "flow");
        expect(values(all, "issues.series.closed_not_planned")[5]).toBe(1);
        expect(values(all, "issues.series.closed_completed")[5]).toBe(0);
        expect(all.sub?.params).toEqual({ opened: 6, closed: 3, net: 3, range: "28d" });
    });

    it("moves each bucket's open count by exactly that bucket's opened less closed", () => {
        for (const range of ["28d", "all"] as const) {
            const p = page(range);
            for (const [flowId, stockId] of [
                ["bug-flow", "bugs"],
                ["flow", "backlog"],
            ]) {
                const net = values(seriesOf(p, flowId), "issues.series.net");
                const stock = seriesOf(p, stockId);
                // bugs stacks its priorities, so its total is their sum; backlog draws the total first
                const open =
                    stockId === "bugs"
                        ? stock.series[0].values.map((_, k) => stock.series.reduce((a, x) => a + x.values[k], 0))
                        : values(stock, "issues.series.open");
                expect(open).toHaveLength(net.length + 1);
                net.forEach((v, k) => expect(open[k + 1] - open[k], `${range} ${stockId} ${k}`).toBe(v));
                expect(stock.sub?.params?.change).toBe(open.at(-1)! - open[0]);
            }
        }
    });

    it("counts a reopened issue (no closedAt) as open its whole life and never as closed", () => {
        const s = page("all");
        const flow = seriesOf(s, "flow");
        const closed = [
            ...values(flow, "issues.series.closed_completed"),
            ...values(flow, "issues.series.closed_not_planned"),
        ];
        expect(closed.reduce((x, y) => x + y, 0)).toBe(3);
        // the first value is the count at the range's start, before the first issue was opened
        expect(values(seriesOf(s, "backlog"), "issues.series.open")[0]).toBe(0);
        expect(
            values(seriesOf(s, "backlog"), "issues.series.open")
                .slice(1)
                .every((v) => v >= 1),
        ).toBe(true);
    });

    it("tables the open issues by type and priority, unlabeled ones included, rows summing to the total", () => {
        const t = tableOf(page(), "open");
        const row = (code: string) => t.rows.find((r) => r.cells.type.t === "label" && r.cells.type.code === code);
        const n = (code: string, col: string) => {
            const cell = row(code)?.cells[col];
            return cell?.t === "num" ? cell.n : undefined;
        };
        expect(t.rows.map((r) => (r.cells.type.t === "label" ? r.cells.type.code : ""))).toEqual([
            "issues.type.bug",
            "issues.type.enhancement",
            "issues.type.none",
            "issues.total",
        ]);
        expect([n("issues.type.bug", "critical"), n("issues.type.bug", "high"), n("issues.type.bug", "none")]).toEqual([
            2, 1, 1,
        ]);
        expect(n("issues.type.enhancement", "total")).toBe(0);
        expect(n("issues.type.none", "none")).toBe(1);
        const total = n("issues.total", "total");
        expect(total).toBe(ALL.filter((x) => openAt(x, NOW + 1)).length);
        expect(
            t.rows
                .filter((r) => !r.total)
                .reduce((s, r) => s + (n(r.cells.type.t === "label" ? r.cells.type.code : "", "total") ?? 0), 0),
        ).toBe(total);
        expect(row("issues.total")?.total).toBe(true);
        expect(row("issues.type.none")?.link).toContain(encodeURIComponent(" -label:bug"));
        // a row's search finds what it counts: an issue labeled bug and enhancement is in the bug row only
        expect(decodeURIComponent(row("issues.type.enhancement")?.link ?? "")).toMatch(
            /is:issue is:open label:enhancement -label:bug$/,
        );
        expect(decodeURIComponent(row("issues.type.bug")?.link ?? "")).toMatch(/is:issue is:open label:bug$/);
    });

    it("lists the open critical bugs first, then the high ones, each oldest first, with their status labels", () => {
        const t = tableOf(page(), "oldest");
        expect(t.rows.map((r) => (r.cells.issue.t === "issue" ? r.cells.issue.n : 0))).toEqual([
            a.number,
            j.number,
            i.number,
        ]);
        expect(t.rows[2].cells.status).toEqual({
            t: "list",
            items: [
                { t: "name", v: "in-progress" },
                { t: "name", v: "blocked" },
            ],
        });
        expect(t.rows[0].cells.status).toEqual({ t: "none" });
        // The issue cell is the link: a row link around it would nest one anchor in another.
        expect(t.rows[0].link).toBeUndefined();
    });

    it("stacks the opened issues by type group, other types and no type included", () => {
        const s = seriesOf(page(), "types");
        expect(s.chart).toBe("stacked");
        expect(s.series.map((x) => x.key)).toEqual(["issues.type.bug", "issues.type.enhancement", "issues.type.none"]);
        expect(s.sub?.params).toEqual({ opened: 6, range: "28d" });
    });

    it("notes how labels are read and what production means, and a GitHub count only when it differs", () => {
        const open = ALL.filter((x) => openAt(x, NOW + 1)).length;
        expect(page("28d", open).notes.map((x) => x.code)).toEqual(["issues.labels_now", "issues.production"]);
        expect(page("28d", open + 49).notes[2]).toEqual({
            code: "issues.github_open",
            params: { stored: open, github: open + 49 },
        });
        expect(page("28d").notes).toHaveLength(2);
    });

    it("says no issues are stored, rather than drawing empty charts", () => {
        const p = issuesPage([], "28d", NOW, 510);
        expect(p).toMatchObject({ page: "issues", state: "idle", members: [], notes: [] });
        expect(p.sections).toEqual([{ kind: "empty", id: "none", fact: { code: "issues.none_collected" } }]);
    });

    it("fits a DynamoDB item at both ranges with 10,000 issues", () => {
        const many = Array.from({ length: 10_000 }, (_, k) =>
            issue(
                [
                    ["bug", "enhancement", "research", "tracking"][k % 4],
                    `priority:${["critical", "high", "medium", "low"][k % 4]}`,
                ],
                NOW - ((k * 7919) % (240 * DAY)),
                k % 5 === 0 ? undefined : [NOW - ((k * 104729) % (20 * DAY)), "completed"],
            ),
        ).map((x) => (x.closedAt !== undefined && x.closedAt <= x.createdAt ? { ...x, closedAt: undefined } : x));
        for (const range of ["28d", "all"] as const) {
            const bytes = gzipSync(JSON.stringify(issuesPage(many, range, NOW, undefined))).byteLength;
            expect(bytes, range).toBeLessThan(MAX_VIEW_BYTES);
        }
    });
});
