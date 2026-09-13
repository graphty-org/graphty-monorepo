import { assert, describe, it } from "vitest";

import { UNENCODED_NODE_COLOR } from "../../defaults/loadDefaults";
import type { CommunityStatistics } from "../../readings/communityReading";
import { CANVAS_METRICS } from "../canvasLayout";
import { communityColourChannel } from "../legendChannels";

/**
 * A community run's statistics, with the group sizes summing to `nodeCount` so the Other
 * row's share can be checked against a number worked out by hand.
 * @param groupSizes - every group's size, largest first.
 * @param colouredGroupCount - how many of them the canvas painted.
 * @returns the statistics.
 */
function statisticsFor(groupSizes: readonly number[], colouredGroupCount: number): CommunityStatistics {
    const groups = groupSizes.map((size, index) => ({ communityId: index, size }));
    const nodeCount = groupSizes.reduce((total, size) => total + size, 0);

    return {
        groupCount: groups.length,
        largestGroupSize: groupSizes[0] ?? 0,
        nodeCount,
        groups,
        colouredGroupCount,
        encodingApplied: colouredGroupCount > 0,
    };
}

describe("communityColourChannel", () => {
    it("names the channel plain-then-technical, per the vocabulary rule", () => {
        const channel = communityColourChannel(statisticsFor([4, 3, 2], 3));

        assert.isNotNull(channel);
        assert.strictEqual(channel?.channelLabel, "Color");
        assert.strictEqual(channel?.attribute, "Groups");
        assert.strictEqual(channel?.technicalName, "Communities, Louvain");
        assert.strictEqual(channel?.scaleLine, "categorical");
    });

    it("labels categories by rank, largest first, as the result body does", () => {
        const channel = communityColourChannel(statisticsFor([9, 4, 2], 3));

        assert.deepStrictEqual(
            channel?.categories?.map((category) => category.label),
            ["Group 1", "Group 2", "Group 3"],
        );
    });

    it("draws no Other row when every group is both painted and named", () => {
        const channel = communityColourChannel(statisticsFor([4, 3, 2], 3));

        assert.isUndefined(channel?.other);
    });

    /* The regression this module was corrected for: six groups painted, five nameable, and
       the Other row used to count only the groups past the COLOUR cap -- so the sixth
       painted group appeared nowhere on the legend at all. */
    it("counts the groups the legend cannot name, not only the ones left neutral", () => {
        const sizes = [10, 9, 8, 7, 6, 5];
        const channel = communityColourChannel(statisticsFor(sizes, sizes.length));

        assert.strictEqual(CANVAS_METRICS.LEGEND_MAX_CATEGORY_ROWS, 5);
        assert.isDefined(channel?.other);
        // One group beyond the five the legend names, holding 5 of 45 nodes.
        assert.strictEqual(channel?.other?.coverage, "1 group, 11% of nodes");
        assert.strictEqual(channel?.other?.color, UNENCODED_NODE_COLOR);
    });

    it("pluralises the Other row's group count", () => {
        const sizes = [10, 9, 8, 7, 6, 5, 5];
        const channel = communityColourChannel(statisticsFor(sizes, sizes.length));

        assert.strictEqual(channel?.other?.coverage, "2 groups, 20% of nodes");
    });

    it("counts the groups past the colour cap too, when the canvas left them neutral", () => {
        // Eight groups, only three painted: five unnamed, and all five are really neutral.
        const channel = communityColourChannel(statisticsFor([20, 20, 20, 10, 10, 10, 5, 5], 3));

        assert.strictEqual(channel?.other?.coverage, "5 groups, 40% of nodes");
    });

    it("is absent rather than empty when nothing was painted", () => {
        assert.isNull(communityColourChannel(statisticsFor([4, 3], 0)));
    });

    it("reads 0% rather than dividing by a node count of zero", () => {
        const channel = communityColourChannel({
            groupCount: 6,
            largestGroupSize: 0,
            nodeCount: 0,
            groups: [0, 0, 0, 0, 0, 0].map((size, index) => ({ communityId: index, size })),
            colouredGroupCount: 6,
            encodingApplied: true,
        });

        assert.strictEqual(channel?.other?.coverage, "1 group, 0% of nodes");
    });
});
