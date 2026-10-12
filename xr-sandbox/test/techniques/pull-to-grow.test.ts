import { breadthFirstSearch } from "@graphty/algorithms";
import { fromEdgeArrays } from "@graphty/graph-format";
import { florentineFamilies } from "@graphty/graph-samples/datasets/florentine-families";
import { describe, expect, it } from "vitest";

import { hopsFor, levelCounts, readoutText } from "../../src/techniques/pull-to-grow/hops";

/** Feed a distance stream (cm) through hopsFor, as the technique does frame by frame. */
const stream = (cm: number[], max = 8): number[] => {
    let h = 0;
    return cm.map((d) => (h = hopsFor(d / 100, h, max)));
};

describe("pull to grow: distance to hops", () => {
    it("has a 6 cm dead zone, then one hop per 8 cm, crossing each boundary 1 cm past it", () => {
        expect(stream([0, 3, 6.9, 7.1, 10, 14.9, 15.1, 22.9, 23.1])).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 3]);
    });

    it("falls back only 1 cm short of a boundary, and back inside the dead zone below 5 cm", () => {
        expect(stream([18, 13.1, 12.9, 5.1, 4.9])).toEqual([2, 2, 1, 1, 0]);
    });

    it("does not change while the hand trembles 1.5 cm across a boundary, either way", () => {
        const across = [13.25, 14.75, 13.25, 14.75, 13.25];
        expect(stream([10, ...across])).toEqual([1, 1, 1, 1, 1, 1]);
        expect(stream([18, ...across])).toEqual([2, 2, 2, 2, 2, 2]);
    });

    it("jumps several hops in one fast frame and never past the deepest level", () => {
        expect(stream([40])).toEqual([5]);
        expect(stream([40, 80], 3)).toEqual([3, 3]);
    });
});

describe("pull to grow: the readout", () => {
    const s = fromEdgeArrays(florentineFamilies());
    const medici = s.ids.requireIndex("Medici");
    const levels = levelCounts(breadthFirstSearch(s, medici, { maxDepth: 8 }).depth, 8);

    it("counts the Medici's neighborhood by hop: 6, then 5 more (12 with the Medici)", () => {
        expect(levels.slice(0, 3)).toEqual([1, 6, 5]);
        expect(levels[0] + levels[1] + levels[2]).toBe(12);
    });

    it("reads '1 hop: 6', then '2 hops: +5', and names the cancel in the dead zone", () => {
        expect(readoutText(1, levels)).toBe("1 hop: 6");
        expect(readoutText(2, levels)).toBe("2 hops: +5");
        expect(readoutText(0, levels)).toBe("Release to cancel");
    });

    it("drops empty trailing levels, so the deepest hop is the graph's", () => {
        expect(levelCounts([0, 1, 1, 2, 0xffffffff], 8)).toEqual([1, 2, 1]);
    });
});
