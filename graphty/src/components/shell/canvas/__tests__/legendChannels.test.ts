import { assert, describe, it } from "vitest";

import { NODE_METRIC_DEFINITIONS, type NodeMetricId, type NodeMetricRanking } from "../../analysis/nodeMetrics";
import { UNENCODED_NODE_COLOR } from "../../defaults/loadDefaults";
import { viridisAt } from "../../defaults/nodeMetricStyle";
import type { CommunityStatistics } from "../../readings/communityReading";
import { CANVAS_METRICS } from "../canvasLayout";
import { communityColourChannel, nodeMetricColourChannel } from "../legendChannels";

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

/**
 * One end of a metric's domain: the value the stop prints, and the fraction the canvas
 * paints that node at. The ranking holds the two as separate scalars, so the fixture
 * pairs them up and {@link rankingFor} takes them apart again.
 */
type DomainEnd = readonly [value: number, fraction: number];

/**
 * A ranking whose three domain ends are stated outright, so a test can put the median
 * anywhere along the ramp and watch the swatch follow it there.
 *
 * `byValueDescending` is left empty deliberately. The legend channel reads the domain
 * statistics and never the ranked list, and a fixture that manufactured ten thousand
 * readings to match `rankedCount` would be asserting over data this module does not
 * touch.
 * @param input - the metric, the two counts and the three domain ends.
 * @param input.metric - which metric ran.
 * @param input.nodeCount - how many nodes the graph holds, measured or not.
 * @param input.rankedCount - how many of them the run actually measured.
 * @param input.min - the lowest reading's value and fraction.
 * @param input.median - the median reading's value and fraction.
 * @param input.max - the highest reading's value and fraction.
 * @returns the ranking.
 */
function rankingFor(input: {
    readonly metric: NodeMetricId;
    readonly nodeCount: number;
    readonly rankedCount: number;
    readonly min: DomainEnd;
    readonly median: DomainEnd;
    readonly max: DomainEnd;
}): NodeMetricRanking {
    return {
        metric: input.metric,
        byValueDescending: [],
        nodeCount: input.nodeCount,
        rankedCount: input.rankedCount,
        maxValue: input.max[0],
        minValue: input.min[0],
        medianValue: input.median[0],
        maxFraction: input.max[1],
        minFraction: input.min[1],
        medianFraction: input.median[1],
        tiedAtMinimum: 0,
    };
}

/**
 * A complete degree ranking over 900 nodes whose median sits near the bottom of the
 * ramp, which is what a real degree distribution looks like.
 * @returns the ranking.
 */
function skewedDegreeRanking(): NodeMetricRanking {
    return rankingFor({
        metric: "degree",
        nodeCount: 900,
        rankedCount: 900,
        min: [1, 0.01],
        median: [5, 0.05],
        max: [100, 1],
    });
}

describe("nodeMetricColourChannel", () => {
    it("is absent rather than empty when the ramp was not applied", () => {
        assert.isNull(
            nodeMetricColourChannel({
                metric: "degree",
                ranking: skewedDegreeRanking(),
                encodingApplied: false,
            }),
        );
    });

    it("is absent when the run measured nothing, however willing the encoding was", () => {
        const empty = rankingFor({
            metric: "degree",
            nodeCount: 40,
            rankedCount: 0,
            min: [0, 0],
            median: [0, 0],
            max: [0, 0],
        });

        assert.isNull(nodeMetricColourChannel({ metric: "degree", ranking: empty, encodingApplied: true }));
    });

    it("names the channel plain-then-technical, per the vocabulary rule", () => {
        const channel = nodeMetricColourChannel({
            metric: "degree",
            ranking: skewedDegreeRanking(),
            encodingApplied: true,
        });

        assert.isNotNull(channel);
        assert.strictEqual(channel?.channel, "color");
        assert.strictEqual(channel?.channelLabel, "Color");
        assert.strictEqual(channel?.attribute, "Most connected");
        assert.strictEqual(channel?.attribute, NODE_METRIC_DEFINITIONS.degree.plainName);
        assert.strictEqual(channel?.technicalName, "Degree centrality");
        assert.strictEqual(channel?.scaleShort, "linear");
    });

    /* Legend.tsx draws the technical half dimmed INSIDE parentheses of its own, so a
       parenthesised name here would print twice over: "(Degree centrality)". */
    it("hands the technical half over without parentheses, which the legend draws itself", () => {
        const channel = nodeMetricColourChannel({
            metric: "degree",
            ranking: skewedDegreeRanking(),
            encodingApplied: true,
        });

        assert.notInclude(channel?.technicalName ?? "", "(");
        assert.notInclude(channel?.technicalName ?? "", ")");
    });

    it("draws three stops in domain order, with the median naming itself", () => {
        const channel = nodeMetricColourChannel({
            metric: "degree",
            ranking: skewedDegreeRanking(),
            encodingApplied: true,
        });

        assert.strictEqual(channel?.stops?.length, 3);
        assert.deepStrictEqual(
            channel?.stops?.map((stop) => stop.label),
            ["1", "median 5", "100"],
        );
        assert.isTrue(channel?.stops?.[1].label.startsWith("median "));
    });

    /* The regression this builder is written against: a median swatch drawn at
       viridisAt(0.5) is the RAMP's midpoint, not the colour the canvas paints the median
       node. On this distribution the median sits at 0.05, so the two are nowhere near
       each other and a 0.5 swatch would lie about the picture beside it. */
    it("draws every swatch at its own reading's fraction, not at 0, 0.5 and 1", () => {
        const channel = nodeMetricColourChannel({
            metric: "degree",
            ranking: skewedDegreeRanking(),
            encodingApplied: true,
        });

        assert.deepStrictEqual(
            channel?.stops?.map((stop) => stop.color),
            [viridisAt(0.01), viridisAt(0.05), viridisAt(1)],
        );
        assert.notStrictEqual(channel?.stops?.[1].color, viridisAt(0.5));
    });

    /* degreePct is value/max, so the lowest node is rarely at the ramp's bottom;
       betweenness's scorePct is (score - min)/(max - min), so it always is. One shared
       sentence would be wrong for one of the two.

       Asserted VERBATIM, against the normalisation each metric declares, because that
       mapping is the only thing here a reader of the legend acts on and nothing else
       pins it: `NODE_METRIC_SCALE_LINES` is typed `Record<NodeMetricNormalisation,
       string>`, so the compiler pins the key SET and never which sentence sits under
       which key, and the board this replaces asserted only that both were non-empty and
       that they differed from each other. Swapping the record's two values left all
       three of those assertions green while inverting what both legends promise: the
       degree legend would offer a floor at the ramp's bottom that max normalisation
       never delivers, and the betweenness legend would hide the floor min-max really
       has. */
    it("states the max-scaled sentence under max, and the min-max sentence under min-max", () => {
        const scaleLineOf = (metric: NodeMetricId, ranking: NodeMetricRanking): string | undefined =>
            nodeMetricColourChannel({ metric, ranking, encodingApplied: true })?.scaleLine;
        const betweennessRanking = rankingFor({
            metric: "betweenness",
            nodeCount: 900,
            rankedCount: 900,
            min: [0, 0],
            median: [2, 0.1],
            max: [44, 1],
        });
        /* PageRank is the OTHER max-normalised metric, and it had no scale-line coverage
           at all: a mapping keyed by normalisation is only pinned once both metrics that
           share a key are read through it. Its ranks are the element's own rankPct, so
           the fractions are shares of the maximum. */
        const pagerankRanking = rankingFor({
            metric: "pagerank",
            nodeCount: 900,
            rankedCount: 900,
            min: [0.0004, 0.04],
            median: [0.0009, 0.09],
            max: [0.01, 1],
        });

        assert.strictEqual(NODE_METRIC_DEFINITIONS.degree.normalisation, "max");
        assert.strictEqual(NODE_METRIC_DEFINITIONS.pagerank.normalisation, "max");
        assert.strictEqual(NODE_METRIC_DEFINITIONS.betweenness.normalisation, "min-max");

        assert.strictEqual(scaleLineOf("degree", skewedDegreeRanking()), "linear, scaled to the highest value");
        assert.strictEqual(scaleLineOf("pagerank", pagerankRanking), "linear, scaled to the highest value");
        assert.strictEqual(
            scaleLineOf("betweenness", betweennessRanking),
            "linear, scaled between the lowest and highest value",
        );
    });

    /* The same mapping read as a claim rather than as a string: a max-scaled ramp names
       one end of the domain and a min-max ramp names both. A future edit that rewords
       either sentence has to keep this true or say why. */
    it("promises a floor only for the normalisation that delivers one", () => {
        const degree = nodeMetricColourChannel({
            metric: "degree",
            ranking: skewedDegreeRanking(),
            encodingApplied: true,
        });
        const betweenness = nodeMetricColourChannel({
            metric: "betweenness",
            ranking: rankingFor({
                metric: "betweenness",
                nodeCount: 900,
                rankedCount: 900,
                min: [0, 0],
                median: [2, 0.1],
                max: [44, 1],
            }),
            encodingApplied: true,
        });

        assert.notInclude(degree?.scaleLine ?? "", "lowest");
        assert.include(degree?.scaleLine ?? "", "highest value");
        assert.include(betweenness?.scaleLine ?? "", "lowest");
        assert.include(betweenness?.scaleLine ?? "", "highest value");
        assert.notStrictEqual(degree?.scaleLine, betweenness?.scaleLine);
    });

    it("names the nodes the run did not reach, once, with a grouped count", () => {
        const channel = nodeMetricColourChannel({
            metric: "betweenness",
            ranking: rankingFor({
                metric: "betweenness",
                nodeCount: 12040,
                rankedCount: 10000,
                min: [0, 0],
                median: [2, 0.1],
                max: [44, 1],
            }),
            encodingApplied: true,
        });

        assert.deepStrictEqual(channel?.departures, ["Not measured (2,040 nodes)"]);
    });

    it("carries no departures field at all when the run reached every node", () => {
        const channel = nodeMetricColourChannel({
            metric: "degree",
            ranking: skewedDegreeRanking(),
            encodingApplied: true,
        });

        assert.isUndefined(channel?.departures);
        assert.notProperty(channel, "departures");
    });

    /* Quantitative: a categorical row under a ramp would be a second kind of legend for
       one encoding, and the Other row's coverage footer belongs to a cap this channel
       does not have. */
    it("draws no categorical row and no Other row, complete run or not", () => {
        const complete = nodeMetricColourChannel({
            metric: "degree",
            ranking: skewedDegreeRanking(),
            encodingApplied: true,
        });
        const partial = nodeMetricColourChannel({
            metric: "betweenness",
            ranking: rankingFor({
                metric: "betweenness",
                nodeCount: 12040,
                rankedCount: 10000,
                min: [0, 0],
                median: [2, 0.1],
                max: [44, 1],
            }),
            encodingApplied: true,
        });

        assert.isUndefined(complete?.categories);
        assert.isUndefined(complete?.other);
        assert.isUndefined(partial?.categories);
        assert.isUndefined(partial?.other);
    });

    it("still draws three stops over a single node, with no NaN in any swatch", () => {
        const channel = nodeMetricColourChannel({
            metric: "pagerank",
            ranking: rankingFor({
                metric: "pagerank",
                nodeCount: 1,
                rankedCount: 1,
                min: [1, 1],
                median: [1, 1],
                max: [1, 1],
            }),
            encodingApplied: true,
        });

        assert.strictEqual(channel?.stops?.length, 3);
        assert.deepStrictEqual(
            channel?.stops?.map((stop) => stop.label),
            ["1", "median 1", "1"],
        );

        for (const stop of channel?.stops ?? []) {
            assert.match(stop.color ?? "", /^#[0-9a-f]{6}$/);
        }
    });
});
