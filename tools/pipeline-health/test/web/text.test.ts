import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { refText, sentence, stateChip } from "../../web/src/text.js";

describe("refText", () => {
    it("names a member with no value without a placeholder", () => {
        expect(refText({ member: "ci.bins_over", value: null })).toBe("PR test groups over 8 min");
    });

    it("names a member with its value", () => {
        expect(refText({ member: "data-sources.past_age", value: { n: 2 } })).toMatch(/ 2$/);
    });
});

describe("labelText", () => {
    it("names members, pages and sources the catalog sends as labels", async () => {
        const { labelText } = await import("../../web/src/render.js");
        expect(labelText("member.master.red_now")).toBe("Master red now");
        expect(labelText("page.pull-requests")).toBe("Pull requests");
        expect(labelText("source.coverage")).toBe("Coverage (Coveralls)");
        expect(labelText("cost.total")).toBe("<b>Total</b>");
    });
});

describe("headline", () => {
    it("says too few only at 1 h, where the state is judged; at 24 h it shows the value", async () => {
        const { headline, setHere } = await import("../../web/src/render.js");
        const m = {
            id: "flaky.flake_rate",
            window: "1h",
            state: "few",
            value: { n: 0.9, unit: "ratio" },
            n: 71,
            minN: 5,
            sla: null,
            link: "/ci",
        } as unknown as Parameters<typeof headline>[0];
        setHere({ page: "overview", range: "1h", q: new URLSearchParams() });
        expect(headline(m)).toContain("not judged: 71 test-file runs this hour, needs 5");
        setHere({ page: "overview", range: "24h", q: new URLSearchParams() });
        expect(headline(m)).not.toContain("not judged");
        expect(headline({ ...m, value: null })).toContain("not judged");
        expect(headline({ ...m, n: 2 })).toContain("not judged: 2 test-file runs in the last 24 h, needs 5");
        expect(headline({ ...m, window: "7d" })).toContain("not judged");
        // The row chip follows the same rule as the headline, so the two never disagree.
        expect(stateChip(m, "24h")).toBe("");
        expect(stateChip(m, "1h")).toContain("not judged: 71 test-file runs this hour, needs 5");
        expect(stateChip({ ...m, n: 2 }, "24h")).toContain("not judged: 2 test-file runs in the last 24 h, needs 5");
    });
});

describe("release channel tiles", () => {
    const tile = {
        id: "nightly",
        state: "warn",
        sha: "9c41d07e2b8a6f3c1d5e7a9b0c2d4e6f8a1b3c5d",
        at: "2026-10-25T22:30:00Z",
        attempts: [
            { at: "2026-10-25T12:00:00Z", outcome: "bad", run: 1, sha: "1".repeat(40) },
            { at: "2026-10-25T22:30:00Z", outcome: "ok", run: 2 },
            { at: "2026-10-25T23:00:00Z", outcome: "held", run: 3 },
        ],
        link: "/releases",
    } as const;

    it("draws the state, the served commit, its age and a dot per attempt, oldest first", async () => {
        const { channelTile } = await import("../../web/src/render.js");
        const { clock } = await import("../../web/src/text.js");
        clock.now = () => Date.parse("2026-10-25T23:30:00Z");
        const html = channelTile({ ...tile, attempts: [...tile.attempts] });
        expect(html).toContain('class="tile warn"');
        expect(html).toContain(">Nightly<");
        expect(html).toContain(">WARNING<");
        expect(html).toContain(">9c41d07<");
        expect(html).toContain("promoted 60 min ago");
        expect([...html.matchAll(/class="dot d-(\w+)"/g)].map((m) => m[1])).toEqual(["bad", "ok", "held"]);
        // Finish times: Train attempts lists the same runs by when they started.
        expect(html).toContain('title="finished 12:00: failed, 1111111"');
        expect(html).toContain("last 3 release attempts, oldest first");
        clock.now = () => Date.now();
    });

    it("shows a channel with nothing recorded as NO DATA with hollow dots", async () => {
        const { channelTile } = await import("../../web/src/render.js");
        const html = channelTile({
            id: "canary",
            state: "nodata",
            sha: null,
            at: null,
            attempts: [],
            link: "/releases",
        });
        expect(html).toContain('class="tile none"');
        expect(html).toContain(">NO DATA<");
        expect(html).toContain(">--<");
        expect(html).toContain("no deploys recorded");
        expect(html.match(/d-none/g)).toHaveLength(14);
    });

    it("puts the tiles at the top of the overview, before the category blocks", async () => {
        const { overviewView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "overview", range: "1h", q: new URLSearchParams() });
        const o = {
            page: "overview",
            range: "1h",
            generated: "2026-10-25T23:30:00Z",
            categories: [],
            episodes: [],
            sources: [],
            channels: [{ ...tile, attempts: [...tile.attempts] }],
        } as unknown as Parameters<typeof overviewView>[0];
        const html = overviewView(o);
        expect(html.indexOf('class="tiles"')).toBeGreaterThan(-1);
        expect(html.indexOf('class="tiles"')).toBeLessThan(html.indexOf('class="status"'));
        expect(overviewView({ ...o, channels: undefined })).not.toContain('class="tiles"');
    });
});

describe("stateChip", () => {
    it("shows OK as an outlined chip, so within target reads apart from not judged", () => {
        expect(stateChip({ state: "ok" })).toContain('class="sw okl">OK<');
    });

    it("shows a 7-day measure past its red line as FAILING, like any other row", () => {
        const chip = stateChip({ state: "bad", window: "7d", value: { n: 0 } } as never);
        expect(chip).toContain('class="sw bad">FAILING<');
        expect(chip).not.toContain("does not set");
    });
});

describe("windowLabel", () => {
    it("labels a 7-day measure with the days of history it covers, and not when the history covers it", async () => {
        const { windowLabel } = await import("../../web/src/text.js");
        const m = { id: "releases.green_clean", state: "bad", window: "7d", value: { n: 0 } } as never as Parameters<
            typeof windowLabel
        >[0];
        expect(windowLabel({ ...m, coveredDays: { d: 2, of: 7 } }, "1h")).toBe("7 d; data for 2 of 7 days");
        expect(windowLabel(m, "1h")).toBe("7 d");
    });
});

describe("episode facts", () => {
    it("never say cleared, so an ongoing episode does not read cleared and ongoing at once", () => {
        const text = sentence({
            code: "ep.past_threshold",
            params: { member: "flaky.flake_rate", cleared: "2026-10-26T01:00:00Z" },
        });
        expect(text).toContain("out of target");
        expect(text).not.toContain("cleared");
    });
});

describe("member text", () => {
    /** Members with no red line: informational, money lines judged by their budget, or not judged at all. */
    const NO_RED = new Set([
        "pull-requests.caused_failures",
        "ci.superseded",
        "releases.channels",
        "local-runs.local_vs_ci",
        "local-runs.shard_time",
        "local-runs.slot_waits",
    ]);

    it("says for every member what is measured and, unless it has no red line, what red means", async () => {
        const { MEMBER } = await import("../../web/src/text.js");
        for (const [id, t] of Object.entries(MEMBER)) {
            expect(t.def, id).not.toBe("");
            if (!NO_RED.has(id)) {
                expect(t.red, id).not.toBe("");
            }
        }
    });

    it("gives the red threshold its unit, and says what the 6 h condition means", async () => {
        const { slaText } = await import("../../web/src/text.js");
        const sla = {
            target: { op: "<=" as const, n: 5, unit: "min" as const },
            red: { op: ">" as const, n: 15, unit: "min" as const },
            needs6h: true,
        };
        const text = slaText(sla);
        expect(text).toContain("good &lt;= 5 min");
        expect(text).toContain("red &gt; 15 min");
        expect(text).toContain("in the last hour and the last 6 h");
        for (const unit of ["min", "h", "pct", "d"] as const) {
            expect(slaText({ ...sla, red: { op: ">", n: 3, unit } })).not.toMatch(/red &gt; 3($|[^ %])/);
        }
        expect(slaText(null)).toBe("no target (shown for information)");
    });
});

describe("page state", () => {
    const member = (over: Record<string, unknown>) =>
        ({
            id: "releases.green_clean",
            window: "7d",
            state: "slow",
            value: { n: 0, unit: "pct" },
            sla: null,
            link: "/releases/trains",
            ...over,
        }) as never;
    const page = (members: unknown[]) =>
        ({
            page: "releases",
            range: "1h",
            generated: "2026-10-25T23:30:00Z",
            state: "ok",
            others: [],
            notes: [],
            members,
            sections: [],
        }) as never;

    it("never says every member is within target while a row is past its red line", async () => {
        const { pageView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "releases", range: "1h", q: new URLSearchParams() });
        expect(pageView(page([member({ state: "ok" })]))).toContain("within its target");
        const bad = member({ state: "bad" });
        const html = pageView({
            ...(page([bad]) as object),
            state: "bad",
            setBy: { member: "releases.green_clean", state: "bad", value: { n: 0, unit: "pct" } },
        } as never);
        expect(html).not.toContain("within its target");
        expect(html).toContain('class="sw bad">FAILING<');
        expect(html).toContain("Red: Below 25%");
    });

    it("lists failing rows first and drops the chevron of a row that links to its own page", async () => {
        const { pageView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "releases", range: "1h", q: new URLSearchParams() });
        const html = pageView(
            page([
                member({ id: "releases.review_lag", state: "ok", link: "/releases" }),
                member({ id: "releases.lanes_red", window: "now", state: "bad", link: "/releases/lanes" }),
            ]),
        );
        expect(html.indexOf("Red lanes on the candidate")).toBeLessThan(html.indexOf("Screenshot review time"));
        expect(html).toContain('<div class="row"');
        expect(html).toContain('href="#/releases/lanes?range=1h"');
    });

    it("puts the rows not judged now under a divider, after every judged row", async () => {
        const { pageView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "releases", range: "1h", q: new URLSearchParams() });
        const html = pageView(
            page([
                member({ id: "releases.review_lag", state: "few", n: 0, minN: 3 }),
                member({ id: "releases.lanes_red", window: "now", state: "ok", link: "/releases/lanes" }),
            ]),
        );
        const divider = html.indexOf('class="rowsep"');
        expect(divider).toBeGreaterThan(html.indexOf("Red lanes on the candidate"));
        expect(divider).toBeLessThan(html.indexOf("Screenshot review time"));
        expect(pageView(page([member({ state: "ok" })]))).not.toContain("rowsep");
    });

    it("says at 6 h and 24 h that the state column is judged on the last hour", async () => {
        const { pageView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "releases", range: "24h", q: new URLSearchParams() });
        expect(pageView(page([member({ state: "ok" })]))).toContain("<span>state now (rates: last 1 h)</span>");
        setHere({ page: "releases", range: "1h", q: new URLSearchParams() });
        expect(pageView(page([member({ state: "ok" })]))).toContain("<span>state</span>");
    });

    it("gives a yellow word value its yellow meaning, not its red one", async () => {
        const { pageView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "flaky", range: "1h", q: new URLSearchParams() });
        const stress = member({
            id: "data-sources.stress_run",
            window: "now",
            state: "warn",
            value: { word: "quiet" },
            link: "/flaky/stress",
        });
        const html = pageView({
            ...(page([stress]) as object),
            page: "flaky",
            state: "warn",
            setBy: { member: "data-sources.stress_run", state: "warn", value: { word: "quiet" } },
        } as never);
        const sentence = html.split('<div class="rows">')[0];
        expect(sentence).toContain("found nothing 3 weeks running. It found nothing 3 weeks running");
        expect(sentence).not.toContain("issue filing failed");
    });
});

describe("fmtSpan", () => {
    it("dates both ends when either is not today, and marks a start cut by the 24 h window", async () => {
        const { clock, fmtSpan: html } = await import("../../web/src/text.js");
        const fmtSpan = (...a: Parameters<typeof html>) => html(...a).replace(/<[^>]+>/g, "");
        clock.generated = "2026-10-30T10:00:00Z";
        expect(fmtSpan("2026-10-30T08:00:00Z", null)).toBe("08:00 - now");
        expect(fmtSpan("2026-10-29T22:10:00Z", "2026-10-30T01:05:00Z")).toBe("10-29 22:10 - 10-30 01:05");
        expect(fmtSpan("2026-10-29T10:02:00Z", null, { edge: true })).toBe("before 10-29 10:02 - now");
        expect(fmtSpan("2026-10-30T08:00:00Z", null, { startUnknown: true })).toBe("before 10-30 08:00 - now");
        clock.generated = "";
    });

    it("keeps each end on one line, so a narrow column never breaks inside a date", async () => {
        const { clock, fmtSpan } = await import("../../web/src/text.js");
        clock.generated = "2026-10-30T10:00:00Z";
        expect(fmtSpan("2026-10-29T22:10:00Z", "2026-10-30T01:05:00Z")).toBe(
            '<span class="nw">10-29 22:10</span> - <span class="nw">10-30 01:05</span>',
        );
        clock.generated = "";
    });
});

describe("status blocks", () => {
    it("show the measure that set the color under the block", async () => {
        const { headline, setHere } = await import("../../web/src/render.js");
        setHere({ page: "overview", range: "1h", q: new URLSearchParams() });
        const m = {
            id: "releases.green_clean",
            window: "7d",
            state: "ok",
            value: { n: 40, unit: "pct" },
            sla: null,
            link: "/releases",
        } as unknown as Parameters<typeof headline>[0];
        // Under a block colored by another member, the number shown is that member's, never the calm headline's.
        const setBy = { member: "releases.lanes_red", state: "bad", value: { n: 2 } } as never;
        expect(headline(m, setBy)).toContain("Set the color:</b> Red lanes on the candidate");
        expect(headline(m, setBy)).not.toContain("Full runs able to promote");
        const driver = { ...m, id: "releases.lanes_red", window: "now", state: "bad", value: { n: 2 } } as never;
        expect(headline(m, setBy, driver)).toContain("Set the color:</b> Red lanes on the candidate, now");
        expect(headline(m, { member: "releases.green_clean", state: "bad" } as never)).not.toContain("Set the color");
    });
});

describe("sparkline", () => {
    it("draws a lone value mid-height at the newest end, not on the chart's top edge", async () => {
        const { sparkline } = await import("../../web/src/charts.js");
        const svg = sparkline({ step: "1d", ctx: [], trend: [0.75], breach: [null] }, "2026-10-25T23:30:00Z", "x");
        expect(svg).toContain('cx="117" cy="14"');
    });
});

describe("dev server", () => {
    it("proxies the API path to the API, so a dev server on any host reads live data without CORS", async () => {
        const { DEV_API_PATH, LIVE_API } = await import("../../web/src/contract.js");
        process.env.PORT = "9999";
        try {
            const { default: config } = await import("../../web/vite.config.js");
            const c = (
                config as (e: { command: string; mode: string; isPreview: boolean }) => {
                    server: { proxy: Record<string, { target: string; rewrite: (p: string) => string }> };
                }
            )({ command: "serve", mode: "development", isPreview: false });
            const proxy = c.server.proxy[DEV_API_PATH];
            expect(proxy.target).toBe(LIVE_API);
            expect(proxy.rewrite(`${DEV_API_PATH}/v1/status`)).toBe("/v1/status");
        } finally {
            delete process.env.PORT;
        }
    });
});

describe("page state names each state apart", () => {
    it("never calls a NO DATA member past target, nor a yellow one failing", async () => {
        const { pageView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "flaky", range: "1h", q: new URLSearchParams() });
        const html = pageView({
            page: "flaky",
            range: "1h",
            generated: "2026-10-25T23:30:00Z",
            state: "bad",
            setBy: { member: "flaky.flake_rate", state: "bad", value: { n: 40, unit: "per1000" } },
            others: [
                { member: "flaky.blocked", state: "nodata", value: null },
                { member: "flaky.no_issue", state: "warn", value: { n: 2 } },
            ],
            notes: [],
            members: [],
            sections: [],
        } as never);
        expect(html).toContain("Also past target: flaky tests with no issue 2.");
        expect(html).toContain("Also NO DATA: PRs blocked by a flake.");
        expect(html).not.toContain("Also failing");
        expect(html).toContain('href="#/data-sources/sources"');
    });
});

describe("last 24 hours", () => {
    it("shows every ongoing red episode, and no cleared one above a folded ongoing one", async () => {
        const { overviewView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "overview", range: "1h", q: new URLSearchParams() });
        const ep = (i: number, worst: string, end: string | null) => ({
            id: `e${i}`,
            category: "costs",
            member: "costs.t4",
            worst,
            start: "2026-10-25T20:00:00Z",
            end,
            fact: { code: "ep.past_threshold", params: { member: `x${i}` } },
            link: "/costs",
        });
        const episodes = [
            ...Array.from({ length: 7 }, (_, i) => ep(i, "bad", null)),
            ...Array.from({ length: 3 }, (_, i) => ep(10 + i, "warn", null)),
            ep(20, "warn", "2026-10-25T21:00:00Z"),
        ];
        const html = overviewView({
            generated: "2026-10-25T23:30:00Z",
            range: "1h",
            categories: [],
            episodes,
        } as never);
        const open = html.split('<details class="epm">')[0];
        for (let i = 0; i < 7; i++) {
            expect(open).toContain(`x${i} out of target`);
        }
        expect(open).not.toContain("x20 out of target");
        expect(html).toContain("3 more ongoing");
        expect(html).toContain("1 more cleared");
    });

    it("calls an open episode whose member is not judged now neither ongoing nor cleared, and lists cleared ones newest first", async () => {
        const { overviewView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "overview", range: "1h", q: new URLSearchParams() });
        const ep = (id: string, end: string | null, notJudgedNow?: boolean) => ({
            id,
            category: "pull-requests",
            member: "pull-requests.merge_ratio",
            worst: "warn",
            start: "2026-10-25T20:00:00Z",
            end,
            ...(notJudgedNow ? { notJudgedNow } : {}),
            fact: { code: "ep.past_threshold", params: { member: id } },
            link: "/pull-requests",
        });
        const html = overviewView({
            generated: "2026-10-25T23:30:00Z",
            range: "1h",
            categories: [],
            episodes: [ep("old", "2026-10-25T20:30:00Z"), ep("paused", null, true), ep("new", "2026-10-25T23:00:00Z")],
        } as never);
        expect(html).toContain("not judged now");
        expect(html).not.toContain(">ongoing<");
        expect(html.indexOf("paused out of target")).toBeLessThan(html.indexOf("new out of target"));
        expect(html.indexOf("new out of target")).toBeLessThan(html.indexOf("old out of target"));
    });
});

describe("tables", () => {
    it("say none is ongoing when every row has ended, and keep the header over the folded rows", async () => {
        const { pageView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "master", range: "1h", q: new URLSearchParams() });
        const html = pageView({
            page: "master",
            range: "1h",
            generated: "2026-10-25T23:30:00Z",
            state: "ok",
            others: [],
            notes: [],
            members: [],
            sections: [
                {
                    kind: "table",
                    id: "shared",
                    rows: [{ past: true, cells: { check: { t: "name", v: "Build" } } }],
                },
            ],
        } as never);
        expect(html).toContain("No shared failure now.");
        expect(html).toMatch(/<summary>1 ended or idle row.*<\/summary><div class="thead">/);
        expect(html).toContain('data-h="check"');
    });

    it("show only regressed benchmarks and count the rest by why they are folded", async () => {
        const { pageView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "ci", range: "1h", q: new URLSearchParams() });
        const bench = (name: string, ratio?: unknown) => ({
            cells: { benchmark: { t: "name", v: name }, ...(ratio ? { ratio } : {}) },
        });
        const html = pageView({
            page: "ci",
            range: "1h",
            generated: "2026-10-25T23:30:00Z",
            state: "ok",
            others: [],
            notes: [],
            members: [],
            sections: [
                {
                    kind: "table",
                    id: "benchmarks",
                    rows: [
                        bench("slow one", { t: "mark", state: "bad", cell: { t: "num", n: 1.5, unit: "x" } }),
                        bench("steady", { t: "num", n: 1, unit: "x" }),
                        bench("new"),
                    ],
                },
            ],
        } as never);
        expect(html.split("<details")[0]).toContain("slow one");
        expect(html.split("<details")[0]).not.toContain("steady");
        expect(html).toContain("1 more within 1.2x; 1 with fewer than 13 runs are not judged yet and not listed");
        // The fold lists the judged ones only; a benchmark with too few runs is counted, never a row of its own.
        expect(html.split("<details")[1]).toContain("steady");
        expect(html).not.toContain(">new<");
        expect(html).toContain("2 of 3 have the 13 runs detection needs");
    });

    it("draw no header and no fold when nothing can be listed", async () => {
        const { pageView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "ci", range: "1h", q: new URLSearchParams() });
        const html = pageView({
            page: "ci",
            range: "1h",
            generated: "2026-10-25T23:30:00Z",
            state: "ok",
            others: [],
            notes: [],
            members: [],
            sections: [
                {
                    kind: "table",
                    id: "benchmarks",
                    rows: [{ cells: { benchmark: { t: "name", v: "new" } } }],
                },
            ],
        } as never);
        expect(html).toContain("No benchmark regressed.");
        expect(html).toContain("0 more within 1.2x; 1 with fewer than 13 runs");
        expect(html).not.toContain("<details");
        expect(html).not.toContain('class="tbl t-bench');
    });
});

describe("the overview's most urgent line", () => {
    it("names the worst category, the member that set it, what red means, and the others not OK", async () => {
        const { urgent, setHere } = await import("../../web/src/render.js");
        setHere({ page: "overview", range: "1h", q: new URLSearchParams() });
        const cat = (id: string, state: string, setBy?: unknown) => ({ id, state, others: [], setBy }) as never;
        const html = urgent([
            cat("costs", "warn", { member: "costs.spend", state: "warn", value: { n: 342, unit: "usd" } }),
            cat("master", "ok"),
            cat("releases", "bad", { member: "releases.green_clean", state: "bad", value: { n: 0, unit: "pct" } }),
        ]);
        expect(html).toContain("Most urgent:");
        expect(html.indexOf("Releases")).toBeLessThan(html.indexOf("Costs"));
        expect(html).toContain("full runs able to promote 0%");
        expect(html).toContain("Below 25%: nightly rarely moves");
        expect(html).toContain("Also not OK: Costs (WARNING).");
        expect(html).not.toContain("Master");
        expect(urgent([cat("master", "ok")])).toContain("Nothing needs action");
    });

    it("names every member of the top category past a line, not only the worst", async () => {
        const { urgent, setHere } = await import("../../web/src/render.js");
        setHere({ page: "overview", range: "1h", q: new URLSearchParams() });
        const html = urgent([
            {
                id: "costs",
                state: "bad",
                setBy: { member: "costs.llm", state: "bad", value: { n: 95, unit: "usd" } },
                others: [
                    { member: "costs.t4", state: "bad", value: { n: 233, unit: "usd" } },
                    { member: "costs.spend", state: "warn", value: { n: 342, unit: "usd" } },
                ],
            } as never,
        ]);
        expect(html).toContain("also T4 GPU 233 USD and spend 342 USD.");
        expect(html).toContain("already over its limit");
    });
});

describe("range notes", () => {
    it("say a 28-day member's sample count over its own days, not this hour", async () => {
        const { fewText } = await import("../../web/src/text.js");
        expect(fewText({ id: "releases.review_lag", window: "28d", n: 0, minN: 5 } as never, "1h")).toBe(
            "not judged: 0 pictures in the last 28 d, needs 5",
        );
    });

    it("say under a 24 h headline that its block is judged on the last hour", async () => {
        const { headline, setHere } = await import("../../web/src/render.js");
        setHere({ page: "overview", range: "24h", q: new URLSearchParams() });
        const m = {
            id: "ci.runner_wait",
            window: "1h",
            state: "ok",
            value: { n: 29.9, unit: "min" },
            sla: null,
            link: "/ci/runners",
        } as never;
        expect(headline(m)).toContain("the block's color is judged on the last 1 h");
        setHere({ page: "overview", range: "1h", q: new URLSearchParams() });
        expect(headline(m)).not.toContain("judged on the last 1 h");
    });

    it("print a shard's budget beside its bar", async () => {
        const { budgetBar } = await import("../../web/src/charts.js");
        const row = { shard: "s", runs: 9, minRuns: 5, medianS: 900, p90S: 1000, budgetS: 600 } as never;
        expect(budgetBar(row, 1200).note).toBe("median over budget 10 min");
    });
});

describe("a test's history", () => {
    it("never claims no issue tracks a test, since it does not look issues up", async () => {
        const { testView } = await import("../../web/src/render.js");
        const html = testView({
            generated: "2026-10-25T23:30:00Z",
            range: "7d",
            file: "graphty/src/Fields.real-element.test.tsx",
            test: "lists the label",
            family: "graphty",
            events: [],
        } as never);
        expect(html).not.toContain("No open issue tracks this test");
        expect(html).toContain("issues?q=is%3Aissue+%22Fields.real-element.test.tsx%22");
        expect(html).toContain("draft the issue");
    });
});

describe("the Issues page", () => {
    const fixture = (range: string) =>
        JSON.parse(
            readFileSync(new URL(`../../web/fixtures/issues.${range}.json`, import.meta.url), "utf8"),
        ) as import("../../web/src/contract.js").PageResponse;

    it("draws its notes, its history picker, every chart with its values in a hidden table, and both tables", async () => {
        const { nav, pageView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "issues", range: "28d", q: new URLSearchParams() });
        const p = fixture("28d");
        const html = pageView(p);
        expect(html).toContain("Production issues are open bugs labeled priority:critical");
        expect(html).toContain('<span class="rlab">history</span>');
        expect(html).toMatch(/href="#\/issues\?range=all"/);
        for (const id of ["open", "bugs", "bug-flow", "flow", "backlog", "types", "oldest"]) {
            expect(html, id).toContain(`id="s-${id}"`);
        }
        const bugs = p.sections.find((s) => s.id === "bugs");
        const last = bugs?.kind === "series" ? bugs.series[0].values.at(-1) : undefined;
        expect(html).toContain(`<td>${last}</td>`);
        expect(html).toContain('class="tbl t-issues');
        expect(html).toContain('class="tbl t-oldest');
        const side = nav(null, true);
        expect(side).toContain('href="#/issues"');
        expect(side).toContain('aria-current="page"><span class="bar"></span>Issues</a>');
        setHere({ page: "issues", range: "all", q: new URLSearchParams("range=all") });
        expect(pageView(fixture("all"))).toContain("since the first issue");
    });

    it("draws every chart inside its plot when every value is zero", async () => {
        const { barChart, lineChart } = await import("../../web/src/charts.js");
        const zeros = (keys: string[], chart: "lines" | "stacked" | "flow") => ({
            kind: "series" as const,
            id: "x",
            chart,
            step: "1d" as const,
            start: "2026-10-01T00:00:00Z",
            series: keys.map((key) => ({ key, values: [0, 0, 0] })),
        });
        const html = [
            lineChart(zeros(["issues.series.open", "issues.prio.critical"], "lines"), (k) => k),
            barChart(zeros(["issues.type.bug"], "stacked"), (k) => k),
            barChart(
                zeros(["issues.series.opened", "issues.series.closed_completed", "issues.series.net"], "flow"),
                (k) => k,
            ),
        ].join("");
        expect(html).not.toMatch(/NaN|Infinity/);
        const ys = [...html.matchAll(/ y="(-?[\d.]+)"| y[12]="(-?[\d.]+)"|,(-?[\d.]+)[ "]/g)].map((m) =>
            Number(m[1] ?? m[2] ?? m[3]),
        );
        expect(ys.length).toBeGreaterThan(0);
        expect(ys.every((y) => y >= 0 && y <= 120)).toBe(true);
    });

    it('names its range "all" in words', async () => {
        const { rangeLabel } = await import("../../web/src/text.js");
        expect(rangeLabel("all")).toBe("all");
        expect(sentence({ code: "issues.sub.flow", params: { opened: 5, closed: 7, net: -2, range: "28d" } })).toBe(
            "5 opened and 7 closed over the last 28 days: 2 more closed than opened",
        );
        expect(
            sentence({
                code: "issues.sub.bugs",
                params: { open: 130, change: -12, critical: 16, criticalChange: 0, range: "28d" },
            }),
        ).toBe("130 open bugs, down 12 over the last 28 days; 16 critical, unchanged");
    });
});
