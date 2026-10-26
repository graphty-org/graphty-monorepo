import { describe, expect, it } from "vitest";

import { refText, sentence } from "../../web/src/text.js";

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
