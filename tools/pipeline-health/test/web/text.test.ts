import { describe, expect, it } from "vitest";

import { refText } from "../../web/src/text.js";

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
