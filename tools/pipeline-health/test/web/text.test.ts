import { describe, expect, it } from "vitest";

import { refText, sentence, stateChip } from "../../web/src/text.js";

describe("refText", () => {
    it("names a member with no value without a placeholder", () => {
        expect(refText({ member: "ci.bins_over", value: null })).toBe("bins over 8 min");
    });

    it("names a member with its value", () => {
        expect(refText({ member: "data-sources.past_age", value: { n: 2 } })).toMatch(/ 2$/);
    });
});

describe("labelText", () => {
    it("names members, pages and sources the catalog sends as labels", async () => {
        const { labelText } = await import("../../web/src/render.js");
        expect(labelText("member.master.red_now")).toBe("Red now");
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
        expect(headline(m)).toContain("too few, n=71 of 5");
        setHere({ page: "overview", range: "24h", q: new URLSearchParams() });
        expect(headline(m)).not.toContain("too few");
        expect(headline({ ...m, value: null })).toContain("too few");
        expect(headline({ ...m, n: 2 })).toContain("too few, n=2 of 5");
        expect(headline({ ...m, window: "7d" })).toContain("too few");
        // The row chip follows the same rule as the headline, so the two never disagree.
        expect(stateChip(m, "24h")).toBe("");
        expect(stateChip(m, "1h")).toContain("too few, n=71 of 5");
        expect(stateChip({ ...m, n: 2 }, "24h")).toContain("too few, n=2 of 5");
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
        expect(stateChip({ ...slow, coveredDays: { d: 2, of: 7 } })).toContain("covers 2 of 7 days");
        expect(stateChip(slow)).not.toContain("covers");
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
