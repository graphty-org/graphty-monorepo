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
        expect(html).toContain('title="12:00: failed, 1111111"');
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
    it("labels a slow measure with the days of history it covers, and not when the history covers it", () => {
        const slow = { state: "slow" as const, window: "7d" as const, value: { n: 0 } };
        expect(stateChip({ ...slow, coveredDays: { d: 2, of: 7 } })).toContain("data for 2 of 7 days");
        expect(stateChip(slow)).not.toContain("data for");
        // The coverage is a line of its own: it never replaces the state.
        expect(stateChip({ ...slow, coveredDays: { d: 2, of: 7 } })).toContain(
            ">7-day measure; does not set the page's color<",
        );
    });

    it("shows OK as an outlined chip, so within target reads apart from not judged", () => {
        expect(stateChip({ state: "ok" })).toContain('class="sw okl">OK<');
        const slow = { state: "slow" as const, window: "7d" as const, value: { n: 0 } };
        expect(stateChip({ ...slow, inTarget: true })).toContain('class="sw okl">OK<');
        // A payload that does not say whether it is within target never shows OK.
        expect(stateChip(slow)).not.toContain(">OK<");
    });

    it("shows a 7-day measure past its red line as FAILING, out of the page state", () => {
        const slow = { state: "slow" as const, window: "7d" as const, value: { n: 0 }, breach: "bad" as const };
        const chip = stateChip(slow);
        expect(chip).toContain('class="sw bad">FAILING<');
        expect(chip).toContain("7-day measure; does not set the page's color");
        expect(stateChip({ ...slow, window: "28d", breach: "warn" })).toContain("28-day measure");
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
            if (!NO_RED.has(id)) expect(t.red, id).not.toBe("");
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
        for (const unit of ["min", "h", "pct", "d"] as const)
            expect(slaText({ ...sla, red: { op: ">", n: 3, unit } })).not.toMatch(/red &gt; 3($|[^ %])/);
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

    it("never says every member is within target while a 7-day measure is past its red line", async () => {
        const { pageView, setHere } = await import("../../web/src/render.js");
        setHere({ page: "releases", range: "1h", q: new URLSearchParams() });
        expect(pageView(page([member({ state: "slow" })]))).toContain("within its target");
        const html = pageView(page([member({ breach: "bad" })]));
        expect(html).not.toContain("within its target");
        expect(html).toContain(
            "1 7-day measure is past its red line: full runs able to promote 0%. It does not set this page's state; see its row below.",
        );
        // The OK chip says what it covers, so it never reads as "everything is fine", and a mark beside it counts the
        // 7-day measures past red.
        expect(html).toContain("Every hourly and current measure meets its target, so the color is OK.");
        expect(html).toContain('class="sw slowmark">1 past red, not in the color<');
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
});

describe("fmtSpan", () => {
    it("dates both ends when either is not today, and marks a start cut by the 24 h window", async () => {
        const { clock, fmtSpan } = await import("../../web/src/text.js");
        clock.generated = "2026-10-30T10:00:00Z";
        expect(fmtSpan("2026-10-30T08:00:00Z", null)).toBe("08:00 - now");
        expect(fmtSpan("2026-10-29T22:10:00Z", "2026-10-30T01:05:00Z")).toBe("10-29 22:10 - 10-30 01:05");
        expect(fmtSpan("2026-10-29T10:02:00Z", null, { edge: true })).toBe("before 10-29 10:02 - now");
        expect(fmtSpan("2026-10-30T08:00:00Z", null, { startUnknown: true })).toBe("before 10-30 08:00 - now");
        clock.generated = "";
    });
});

describe("status blocks", () => {
    it("say a 7-day measure past red is not part of the block's color, and show the measure that set the color under it", async () => {
        const { overviewView, headline, setHere } = await import("../../web/src/render.js");
        setHere({ page: "overview", range: "1h", q: new URLSearchParams() });
        const m = {
            id: "releases.green_clean",
            window: "7d",
            state: "slow",
            value: { n: 40, unit: "pct" },
            sla: null,
            link: "/releases",
        } as unknown as Parameters<typeof headline>[0];
        const html = overviewView({
            generated: "2026-10-25T23:30:00Z",
            range: "1h",
            categories: [
                {
                    id: "releases",
                    state: "ok",
                    others: [],
                    headline: m,
                    slowPastRed: [{ member: "releases.green_clean", value: null }],
                },
            ],
            episodes: [],
        } as never);
        expect(html).toContain("1 7-day measure past red; not part of this color");
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
        for (let i = 0; i < 7; i++) expect(open).toContain(`x${i} out of target`);
        expect(open).not.toContain("x20 out of target");
        expect(html).toContain("3 more ongoing");
        expect(html).toContain("1 more cleared");
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
        expect(html).toContain("2 more: 1 within 1.2x, 1 with fewer than 13 runs, not judged yet");
        expect(html).toContain("2 of 3 have the 13 runs detection needs");
    });
});
