import { describe, expect, it } from "vitest";

import { partitionAgreement } from "../../../src/indexed/partition-agreement.js";

// The figures scikit-learn 1.x prints for adjusted_rand_score and adjusted_mutual_info_score.
const REFERENCE: [number[], number[], number, number][] = [
    [[0, 0, 1, 1], [0, 0, 1, 2], 0.5714285714285714, 0.5714285714285715],
    [[0, 0, 1, 1], [0, 1, 0, 1], -0.5, -0.49999999999999944],
    [[0, 0, 0, 1, 1, 1, 2, 2, 2, 2], [0, 0, 1, 1, 1, 2, 2, 2, 0, 0], 0.09090909090909091, 0.17152423540072848],
    [[0, 0, 0, 0], [0, 1, 2, 3], 0, 0],
    [
        [1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5],
        [2, 2, 2, 1, 1, 3, 3, 3, 4, 4, 5, 5],
        0.17647058823529413,
        0.231754710500238,
    ],
];

describe("partitionAgreement", () => {
    it.each(REFERENCE)("matches scikit-learn on %j and %j", (a, b, ari, ami) => {
        const result = partitionAgreement(a, b);
        expect(result.adjustedRand).toBeCloseTo(ari, 12);
        expect(result.adjustedMutualInformation).toBeCloseTo(ami, 12);
    });

    it("scores the same grouping under other names 1, whatever its group names are", () => {
        expect(partitionAgreement(["x", "x", "y", 7], [3, 3, 1, 2])).toEqual({
            adjustedRand: 1,
            adjustedMutualInformation: 1,
        });
        expect(partitionAgreement([0, 1, 2], [5, 6, 7]).adjustedMutualInformation).toBe(1);
        expect(partitionAgreement(new Uint32Array([4, 4]), [1, 1]).adjustedRand).toBe(1);
    });

    it("refuses two groupings of different lengths", () => {
        expect(() => partitionAgreement([0, 1], [0])).toThrow(RangeError);
    });
});
