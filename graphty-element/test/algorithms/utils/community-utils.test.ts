import { assert, describe, it } from "vitest";

import { countUniqueCommunities, extractCommunities } from "../../../src/algorithms/utils/communityUtils";

describe("community utilities", () => {
    describe("extractCommunities", () => {
        it("converts community map to array of arrays", () => {
            const communities = new Map<string | number, number>([
                ["A", 0],
                ["B", 0],
                ["C", 1],
                ["D", 1],
                ["E", 2],
            ]);

            const result = extractCommunities(communities);

            assert.strictEqual(result.length, 3);

            // Find community 0
            const comm0 = result.find((c) => c.includes("A"));
            assert.ok(comm0);
            assert.strictEqual(comm0.length, 2);
            assert.isTrue(comm0.includes("A"));
            assert.isTrue(comm0.includes("B"));

            // Find community 1
            const comm1 = result.find((c) => c.includes("C"));
            assert.ok(comm1);
            assert.strictEqual(comm1.length, 2);
            assert.isTrue(comm1.includes("C"));
            assert.isTrue(comm1.includes("D"));

            // Find community 2
            const comm2 = result.find((c) => c.includes("E"));
            assert.ok(comm2);
            assert.strictEqual(comm2.length, 1);
            assert.isTrue(comm2.includes("E"));
        });

        it("handles empty map", () => {
            const communities = new Map<string | number, number>();
            const result = extractCommunities(communities);

            assert.strictEqual(result.length, 0);
        });

        it("handles single node", () => {
            const communities = new Map<string | number, number>([["A", 0]]);

            const result = extractCommunities(communities);

            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].length, 1);
            assert.isTrue(result[0].includes("A"));
        });

        it("handles non-contiguous community IDs", () => {
            const communities = new Map<string | number, number>([
                ["A", 0],
                ["B", 5],
                ["C", 10],
            ]);

            const result = extractCommunities(communities);

            assert.strictEqual(result.length, 3);
        });

        it("handles numeric node IDs", () => {
            const communities = new Map<string | number, number>([
                [1, 0],
                [2, 0],
                [3, 1],
            ]);

            const result = extractCommunities(communities);

            assert.strictEqual(result.length, 2);
            const comm0 = result.find((c) => c.includes(1));
            assert.ok(comm0);
            assert.isTrue(comm0.includes(2));
        });
    });

    describe("countUniqueCommunities", () => {
        it("counts unique community IDs", () => {
            const communities = new Map<string | number, number>([
                ["A", 0],
                ["B", 0],
                ["C", 1],
                ["D", 2],
            ]);

            const count = countUniqueCommunities(communities);

            assert.strictEqual(count, 3);
        });

        it("returns 0 for empty map", () => {
            const communities = new Map<string | number, number>();
            const count = countUniqueCommunities(communities);

            assert.strictEqual(count, 0);
        });

        it("returns 1 for single community", () => {
            const communities = new Map<string | number, number>([
                ["A", 0],
                ["B", 0],
                ["C", 0],
            ]);

            const count = countUniqueCommunities(communities);

            assert.strictEqual(count, 1);
        });
    });
});
