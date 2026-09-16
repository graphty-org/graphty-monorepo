import { describe, expect, it } from "vitest";

import {
    COMMUNITY_MANY_GROUPS_THRESHOLD,
    type CommunityGroupSize,
    communityHeadline,
    communityReading,
    communityResultBody,
    type CommunityStatistics,
} from "../communityReading";

/** The four groups Louvain finds on the cat fixture, largest first. */
const CAT_GROUPS: readonly CommunityGroupSize[] = [
    { communityId: 0, size: 7 },
    { communityId: 1, size: 6 },
    { communityId: 2, size: 4 },
    { communityId: 3, size: 3 },
];

/** The cat fixture's community run, as the shell will hand it over. */
const CAT_STATISTICS: CommunityStatistics = {
    groupCount: 4,
    largestGroupSize: 7,
    modularity: 0.447,
    nodeCount: 20,
    groups: CAT_GROUPS,
    colouredGroupCount: 4,
    encodingApplied: true,
};

/** Eleven groups whose sizes sum to 620,000, so the share reads exactly 62%. */
const MANY_GROUPS: readonly CommunityGroupSize[] = [
    { communityId: 0, size: 61208 },
    { communityId: 1, size: 55881 },
    { communityId: 2, size: 55879 },
    { communityId: 3, size: 55879 },
    { communityId: 4, size: 55879 },
    { communityId: 5, size: 55879 },
    { communityId: 6, size: 55879 },
    { communityId: 7, size: 55879 },
    { communityId: 8, size: 55879 },
    { communityId: 9, size: 55879 },
    { communityId: 10, size: 55879 },
];

describe("communityReading", () => {
    describe("the cat fixture, which is what this slice ships", () => {
        /* TWO sentences, which is fewer than spec 7.5's own worked example takes. RT-10
           (design line 4672) and 7.5's opening line (5794) both cap a reading at two
           sentences, COMPACTION-1.6.md:324 repeats it and ProseBlock enforces it, so the
           four-sentence example is a drafting slip against a rule stated three times.
           The two sentences dropped are the two already on screen elsewhere: the largest
           group's size is in the result body, and what the colours mean is the legend's
           channel line. See `communityReading`'s own doc comment. */
        it("reads the shipped string character for character", () => {
            expect(communityReading(CAT_STATISTICS)).toBe(
                "4 groups found. The groups are clearly separated (modularity 0.447).",
            );
        });

        it("spends the second sentence on the largest group when the method reported no modularity", () => {
            expect(communityReading({ ...CAT_STATISTICS, modularity: undefined })).toBe(
                "4 groups found. The largest has 7 members.",
            );
        });

        it("falls back the same way rather than banding a value that is not a number", () => {
            expect(communityReading({ ...CAT_STATISTICS, modularity: Number.NaN })).toBe(
                "4 groups found. The largest has 7 members.",
            );
        });

        it("never spends a third sentence on the encoding, which is the legend's line", () => {
            expect(communityReading({ ...CAT_STATISTICS, encodingApplied: false })).toBe(
                "4 groups found. The groups are clearly separated (modularity 0.447).",
            );
            expect(communityReading(CAT_STATISTICS)).not.toContain("Colors");
        });

        it("stays inside RT-10's two-sentence budget in every variant", () => {
            const variants: readonly CommunityStatistics[] = [
                CAT_STATISTICS,
                { ...CAT_STATISTICS, modularity: undefined },
                { ...CAT_STATISTICS, encodingApplied: false },
                { ...CAT_STATISTICS, groupCount: 3412, colouredGroupCount: 8 },
            ];

            for (const variant of variants) {
                const sentences = communityReading(variant).split(". ").length;

                expect(sentences).toBeLessThanOrEqual(2);
            }
        });
    });

    describe("the banded clause carries the spec's words", () => {
        it("bands a weak grouping with its caution", () => {
            expect(communityReading({ ...CAT_STATISTICS, modularity: 0.25, encodingApplied: false })).toBe(
                "4 groups found. The groups are weakly separated; treat with caution (modularity 0.250).",
            );
        });

        it("bands 0.3 itself as weak", () => {
            expect(communityReading({ ...CAT_STATISTICS, modularity: 0.3, encodingApplied: false })).toBe(
                "4 groups found. The groups are weakly separated; treat with caution (modularity 0.300).",
            );
        });

        it("bands a barely separated grouping as possibly meaningless", () => {
            expect(communityReading({ ...CAT_STATISTICS, modularity: 0.05, encodingApplied: false })).toBe(
                "4 groups found. The groups are barely separated; the grouping may not be meaningful (modularity 0.050).",
            );
        });
    });

    describe("singulars", () => {
        it("pluralises neither group nor member at one", () => {
            expect(
                communityReading({
                    groupCount: 1,
                    largestGroupSize: 1,
                    nodeCount: 1,
                    groups: [{ communityId: 0, size: 1 }],
                    colouredGroupCount: 0,
                    encodingApplied: false,
                }),
            ).toBe("1 group found. The largest has 1 member.");
        });
    });

    describe("the many-groups threshold", () => {
        it("keeps the small form at exactly twelve groups", () => {
            expect(
                communityReading({
                    ...CAT_STATISTICS,
                    groupCount: COMMUNITY_MANY_GROUPS_THRESHOLD,
                    modularity: undefined,
                }),
            ).toBe("12 groups found. The largest has 7 members.");
        });

        it("switches to the top-K form at thirteen groups", () => {
            expect(
                communityReading({
                    groupCount: COMMUNITY_MANY_GROUPS_THRESHOLD + 1,
                    largestGroupSize: 7,
                    nodeCount: 20,
                    groups: CAT_GROUPS,
                    colouredGroupCount: 2,
                    encodingApplied: true,
                }),
            ).toBe("13 groups found. The 2 largest hold 65% of nodes; the largest has 7 members.");
        });

        /* Spec 5855-5856's example, minus its third sentence ("Colors show the 11
           largest; other nodes are gray"), for the reason given above: that clause is the
           legend's channel line, and the reading is capped at two sentences. */
        it("reproduces spec 5855-5856's worked example, within the two-sentence budget", () => {
            expect(
                communityReading({
                    groupCount: 3412,
                    largestGroupSize: 61208,
                    nodeCount: 1000000,
                    groups: MANY_GROUPS,
                    colouredGroupCount: 11,
                    encodingApplied: true,
                }),
            ).toBe("3,412 groups found. The 11 largest hold 62% of nodes; the largest has 61,208 members.");
        });

        it("names no colour in the top-K form when nothing was painted", () => {
            expect(
                communityReading({
                    groupCount: 3412,
                    largestGroupSize: 61208,
                    nodeCount: 1000000,
                    groups: MANY_GROUPS,
                    colouredGroupCount: 11,
                    encodingApplied: false,
                }),
            ).toBe("3,412 groups found. The 11 largest hold 62% of nodes; the largest has 61,208 members.");
        });

        it("reads 0% rather than dividing by a node count of zero", () => {
            expect(
                communityReading({
                    groupCount: 13,
                    largestGroupSize: 0,
                    nodeCount: 0,
                    groups: [],
                    colouredGroupCount: 0,
                    encodingApplied: false,
                }),
            ).toBe("13 groups found. The 0 largest hold 0% of nodes; the largest has 0 members.");
        });
    });
});

/** The cat fixture as a method that reports no modularity would hand it over. */
const WITHOUT_MODULARITY: CommunityStatistics = {
    groupCount: 4,
    largestGroupSize: 7,
    nodeCount: 20,
    groups: CAT_GROUPS,
    colouredGroupCount: 4,
    encodingApplied: true,
};

/**
 * Whether every character is printable ASCII.
 *
 * Written as a loop rather than a regular expression because the range it tests includes
 * control characters, and a literal control-character class is what the lint rule that
 * would have to be silenced exists to catch.
 * @param value - the string to check.
 * @returns true when every character is in the printable ASCII range.
 */
function isPrintableAscii(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);

        if (code < 0x20 || code > 0x7e) {
            return false;
        }
    }

    return true;
}

describe("communityHeadline", () => {
    /* The collapsed line the Analyze panel's Results card draws (spec 2200-2202). It is
       read at the same moment as the expanded reading a few hundred pixels away, so the
       numbers in it are the reading's own numbers, formatted the same way. */
    it("names the group count and the modularity, at the reading's own three decimals", () => {
        expect(communityHeadline(CAT_STATISTICS)).toBe("4 groups, modularity 0.447");
        expect(communityReading(CAT_STATISTICS)).toContain("0.447");
    });

    it("is a headline and not a sentence: no full stop, one line, ASCII", () => {
        const headline = communityHeadline(CAT_STATISTICS);

        expect(headline.endsWith(".")).toBe(false);
        expect(headline).not.toContain("\n");
        expect(isPrintableAscii(headline)).toBe(true);
    });

    it("makes a one-group run singular", () => {
        expect(
            communityHeadline({
                ...CAT_STATISTICS,
                groupCount: 1,
                largestGroupSize: 20,
                groups: [{ communityId: 0, size: 20 }],
            }),
        ).toBe("1 group, modularity 0.447");
    });

    /* A method that reports no modularity falls back to the SAME fact the reading's
       second sentence falls back to, so the two surfaces never state different things
       about one run. */
    it("falls back to the largest group when the method reported no modularity", () => {
        expect(communityHeadline(WITHOUT_MODULARITY)).toBe("4 groups, largest 7 members");
    });

    it("makes a one-member largest group singular", () => {
        expect(communityHeadline({ ...WITHOUT_MODULARITY, largestGroupSize: 1 })).toBe("4 groups, largest 1 member");
    });

    /* A run that found nothing may not print "0 groups, modularity 0.000": the modularity
       of no partition is not a measurement, and a headline that prints one asserts an
       outcome nothing computed (spec 7415-7418). */
    it("says so plainly when the run found no groups", () => {
        expect(communityHeadline({ ...CAT_STATISTICS, groupCount: 0, largestGroupSize: 0, groups: [] })).toBe(
            "No groups",
        );
    });

    it("drops a non-finite modularity rather than printing it", () => {
        expect(communityHeadline({ ...CAT_STATISTICS, modularity: Number.NaN })).toBe("4 groups, largest 7 members");
    });

    it("groups thousands with an ASCII comma", () => {
        expect(communityHeadline({ ...CAT_STATISTICS, groupCount: 3412, modularity: 0.12 })).toBe(
            "3,412 groups, modularity 0.120",
        );
    });
});

describe("communityResultBody", () => {
    it("names rows by rank, largest first, with their sizes", () => {
        expect(communityResultBody(CAT_STATISTICS)).toEqual([
            { name: "Group 1", value: "7 members" },
            { name: "Group 2", value: "6 members" },
            { name: "Group 3", value: "4 members" },
            { name: "Group 4", value: "3 members" },
        ]);
    });

    it("makes a one-node group singular", () => {
        expect(
            communityResultBody({
                ...CAT_STATISTICS,
                groups: [{ communityId: 9, size: 1 }],
            }),
        ).toEqual([{ name: "Group 1", value: "1 member" }]);
    });

    it("caps its rows at the many-groups threshold", () => {
        const groups = Array.from({ length: 40 }, (_unused, index) => ({
            communityId: index,
            size: 100 - index,
        }));

        const rows = communityResultBody({ ...CAT_STATISTICS, groups, groupCount: 40 });

        expect(rows).toHaveLength(COMMUNITY_MANY_GROUPS_THRESHOLD);
        expect(rows[0]).toEqual({ name: "Group 1", value: "100 members" });
        expect(rows[COMMUNITY_MANY_GROUPS_THRESHOLD - 1]).toEqual({ name: "Group 12", value: "89 members" });
    });

    it("groups its sizes with an ASCII comma", () => {
        expect(communityResultBody({ ...CAT_STATISTICS, groups: MANY_GROUPS })[0]).toEqual({
            name: "Group 1",
            value: "61,208 members",
        });
    });

    it("returns nothing for a run with no groups", () => {
        expect(communityResultBody({ ...CAT_STATISTICS, groups: [] })).toEqual([]);
    });
});
