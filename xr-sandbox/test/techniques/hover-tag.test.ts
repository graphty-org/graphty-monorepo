import { describe, expect, it } from "vitest";

import { createState } from "../../src/core/state";
import { TagTarget, tagText } from "../../src/techniques/hover-tag/tag";

const results = {
    pagerank: Float64Array.from([0.146, 0.0883, 0.04]),
    degree: Float64Array.from([6, 4, 1]),
    community: Float64Array.from([0, 1, 1]),
};
const data = {
    names: ["Medici", "Strozzi", "Pazzi"],
    results,
    rank: { pagerank: Uint32Array.from([1, 3, 4]), degree: Uint32Array.from([1, 2, 3]) },
    resultNames: { pagerank: "PageRank", degree: "degree", community: "community" },
    categorical: { community: true },
};

describe("tagText", () => {
    it("names degree before any result is shown, and drops the name once one is", () => {
        const s = createState(results);
        expect(tagText(data, s, 1, "current")).toBe("Strozzi degree 4, #2");
        s.shown.add("pagerank");
        expect(tagText(data, s, 1, "current")).toBe("Strozzi 0.088, #3");
        s.colorBy = "community"; // categorical: the shown ramp result still wins
        expect(tagText(data, s, 1, "current")).toBe("Strozzi 0.088, #3");
        expect(tagText(data, s, 1, "degree")).toBe("Strozzi degree 4, #2");
    });
});

describe("TagTarget", () => {
    it("lingers before hiding and ignores a short slip off the node", () => {
        const t = new TagTarget();
        expect(t.update(1, 0, 0, 300)).toBe(true);
        expect(t.update(-1, 100, 0, 300)).toBe(false);
        expect(t.update(1, 200, 0, 300)).toBe(false);
        expect(t.update(-1, 300, 0, 300)).toBe(false);
        expect(t.update(-1, 600, 0, 300)).toBe(true);
        expect(t.shown).toBe(-1);
        expect(t.changes).toEqual([0, 600]);
    });

    it("waits the dwell before showing a new node", () => {
        const t = new TagTarget();
        expect(t.update(2, 0, 150, 300)).toBe(false);
        expect(t.update(2, 160, 150, 300)).toBe(true);
        expect(t.shown).toBe(2);
    });
});
