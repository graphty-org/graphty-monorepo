import { describe, expect, it } from "vitest";

import type { NodeMetricId, NodeMetricRanking } from "../../analysis/nodeMetrics";
import {
    formatMetricValue,
    NODE_METRIC_TOP_ROWS,
    nodeMetricHeadline,
    nodeMetricReading,
    nodeMetricResultBody,
    type NodeMetricStatistics,
} from "../nodeMetricReading";

/** RT-10's cap, spec 4903-4905: "at most two sentences and 220 characters". */
const READING_MAX_CHARACTERS = 220;

/** The other half of the same cap, enforced by ProseBlock's READING_MAX_SENTENCES. */
const READING_SENTENCES = 2;

/**
 * Counts sentence ends: a period followed by whitespace or the end of the string. The
 * periods inside "3.4 times" and "0.0034" are not sentence ends and must not be counted,
 * which is why this is not a split on ".".
 * @param reading - the reading.
 * @returns how many sentences it holds.
 */
function countSentences(reading: string): number {
    return (reading.match(/\.(?:\s|$)/g) ?? []).length;
}

/**
 * Builds a ranking the body can read, filling the statistics the body does not touch from
 * the values themselves so the fixture cannot disagree with itself.
 * @param metric - which metric was run.
 * @param values - the ranked nodes and their values, highest first.
 * @param counts - how many nodes were ranked and how many tie at the minimum.
 * @returns the ranking.
 */
function rankingOf(
    metric: NodeMetricId,
    values: readonly { id: number | string; value: number }[],
    counts: { rankedCount: number; tiedAtMinimum: number },
): NodeMetricRanking {
    const maxValue = values.length > 0 ? values[0].value : 0;
    const minValue = values.length > 0 ? values[values.length - 1].value : 0;
    const medianValue = values.length > 0 ? values[Math.floor((values.length - 1) / 2)].value : 0;
    const fractionOf = (value: number): number => (maxValue > 0 ? value / maxValue : 0);

    return {
        metric,
        byValueDescending: values.map((reading) => ({
            ...reading,
            label: String(reading.id),
            fraction: fractionOf(reading.value),
        })),
        // The body never draws the chart, so the distribution it carries is empty here rather
        // than invented: a fixture that supplied bars nothing reads would be claiming this
        // module depends on something it does not.
        distribution: { bins: [], scale: "linear", suggestedScale: "linear", binning: "empty" },
        nodeCount: counts.rankedCount,
        rankedCount: counts.rankedCount,
        maxValue,
        minValue,
        medianValue,
        maxFraction: fractionOf(maxValue),
        minFraction: fractionOf(minValue),
        medianFraction: fractionOf(medianValue),
        tiedAtMinimum: counts.tiedAtMinimum,
    };
}

/** The cat fixture: 20 nodes, one obvious hub. */
const SMALL_GRAPH: Readonly<Record<NodeMetricId, NodeMetricStatistics>> = {
    betweenness: {
        metric: "betweenness",
        topId: "Mr_Whiskers",
        topValue: 0.41,
        medianValue: 0.034,
        nodeCount: 20,
        rankedCount: 20,
        tiedAtMinimum: 2,
    },
    degree: {
        metric: "degree",
        topId: "Mr_Whiskers",
        topValue: 12,
        medianValue: 3,
        nodeCount: 20,
        rankedCount: 20,
        tiedAtMinimum: 1,
    },
    pagerank: {
        metric: "pagerank",
        topId: "Mr_Whiskers",
        topValue: 0.184,
        medianValue: 0.046,
        nodeCount: 20,
        rankedCount: 20,
        tiedAtMinimum: 1,
    },
};

/** A million nodes, so every prose count crosses the three-significant-figure ceiling. */
const LARGE_GRAPH: Readonly<Record<NodeMetricId, NodeMetricStatistics>> = {
    betweenness: {
        metric: "betweenness",
        topId: "acct-4471",
        topValue: 0.41,
        medianValue: 0.0102,
        nodeCount: 1000000,
        rankedCount: 1000000,
        tiedAtMinimum: 912400,
    },
    degree: {
        metric: "degree",
        topId: "acct-4471",
        topValue: 1204318,
        medianValue: 9,
        nodeCount: 1000000,
        rankedCount: 1000000,
        tiedAtMinimum: 912400,
    },
    pagerank: {
        metric: "pagerank",
        topId: "acct-4471",
        topValue: 0.0034,
        medianValue: 0.0000012,
        nodeCount: 1000000,
        rankedCount: 1000000,
        tiedAtMinimum: 400,
    },
};

/** Half the nodes score nothing at all, which is what makes every ratio infinite. */
const ZERO_MEDIAN: Readonly<Record<NodeMetricId, NodeMetricStatistics>> = {
    betweenness: {
        metric: "betweenness",
        topId: "acct-4471",
        topValue: 0.41,
        medianValue: 0,
        nodeCount: 1000000,
        rankedCount: 1000000,
        tiedAtMinimum: 912400,
    },
    degree: {
        metric: "degree",
        topId: "acct-4471",
        topValue: 41,
        medianValue: 0,
        nodeCount: 1000000,
        rankedCount: 1000000,
        tiedAtMinimum: 912400,
    },
    pagerank: {
        metric: "pagerank",
        topId: "acct-4471",
        topValue: 0.0034,
        medianValue: 0,
        nodeCount: 1000000,
        rankedCount: 1000000,
        tiedAtMinimum: 912400,
    },
};

/**
 * Nothing measured a value above zero: Bridges on a complete graph or on a set of
 * disjoint pairs, Most connected on a node set with no edges. The top id is whoever sorted
 * first, which is exactly why no reading may name it.
 */
const ALL_ZERO: Readonly<Record<NodeMetricId, NodeMetricStatistics>> = {
    betweenness: {
        metric: "betweenness",
        topId: "a",
        topValue: 0,
        medianValue: 0,
        nodeCount: 5,
        rankedCount: 5,
        tiedAtMinimum: 5,
    },
    degree: {
        metric: "degree",
        topId: "a",
        topValue: 0,
        medianValue: 0,
        nodeCount: 5,
        rankedCount: 5,
        tiedAtMinimum: 5,
    },
    pagerank: {
        metric: "pagerank",
        topId: "a",
        topValue: 0,
        medianValue: 0,
        nodeCount: 5,
        rankedCount: 5,
        tiedAtMinimum: 5,
    },
};

/**
 * A 6-node ring, measured: every node has 2 links, every betweenness score is 4 and every
 * PageRank is a sixth, so the top value IS the median in all three.
 */
const ALL_TIED: Readonly<Record<NodeMetricId, NodeMetricStatistics>> = {
    betweenness: {
        metric: "betweenness",
        topId: "n0",
        topValue: 4,
        medianValue: 4,
        nodeCount: 6,
        rankedCount: 6,
        tiedAtMinimum: 6,
    },
    degree: {
        metric: "degree",
        topId: "n0",
        topValue: 2,
        medianValue: 2,
        nodeCount: 6,
        rankedCount: 6,
        tiedAtMinimum: 6,
    },
    pagerank: {
        metric: "pagerank",
        topId: "n0",
        topValue: 0.16666666666666669,
        medianValue: 0.16666666666666669,
        nodeCount: 6,
        rankedCount: 6,
        tiedAtMinimum: 6,
    },
};

/** Every template over every size, which is what the budget has to hold across. */
const EVERY_READING: readonly { readonly name: string; readonly statistics: NodeMetricStatistics }[] = (
    [
        ["small graph", SMALL_GRAPH],
        ["large graph", LARGE_GRAPH],
        ["zero median", ZERO_MEDIAN],
        ["all-zero run", ALL_ZERO],
        ["run where every node ties", ALL_TIED],
    ] as const
).flatMap(([size, table]) =>
    (["betweenness", "degree", "pagerank"] as const).map((metric) => ({
        name: `${metric} on a ${size}`,
        statistics: table[metric],
    })),
);

describe("nodeMetricReading", () => {
    it.each(EVERY_READING)("keeps $name inside RT-10's two-sentence budget", ({ statistics }) => {
        expect(countSentences(nodeMetricReading(statistics))).toBe(READING_SENTENCES);
    });

    it.each(EVERY_READING)("keeps $name inside RT-10's 220 characters", ({ statistics }) => {
        expect(nodeMetricReading(statistics).length).toBeLessThanOrEqual(READING_MAX_CHARACTERS);
    });

    it.each(EVERY_READING)("finishes $name's last sentence rather than truncating it", ({ statistics }) => {
        expect(nodeMetricReading(statistics).endsWith(".")).toBe(true);
    });

    it("names the top node and its links, and claims nothing structural", () => {
        const reading = nodeMetricReading(SMALL_GRAPH.degree);

        expect(reading).toBe("Mr_Whiskers is the most connected, with 12 links. The typical node has 3.");
        expect(reading).not.toContain("split");
        expect(reading).not.toContain("remove");
        expect(reading).not.toContain("bridge");
    });

    it("rounds a degree reading's counts in prose, as spec 5853 asks", () => {
        expect(nodeMetricReading(LARGE_GRAPH.degree)).toBe(
            "acct-4471 is the most connected, with 1,200,000 links. The typical node has 9.",
        );
    });

    it("reads PageRank as a multiple of the typical node, never as a bare score", () => {
        expect(nodeMetricReading(SMALL_GRAPH.pagerank)).toBe(
            "Mr_Whiskers has the most influence. Its score is 4 times the typical node's.",
        );
    });

    it("keeps one decimal on a multiple below 10", () => {
        expect(
            nodeMetricReading({ ...SMALL_GRAPH.pagerank, topValue: 0.158, medianValue: 0.046 }),
        ).toContain("3.4 times the typical node's");
    });

    it("uses the relative betweenness form spec 7405-7409 writes out, never a percentage", () => {
        const reading = nodeMetricReading(LARGE_GRAPH.betweenness);

        expect(reading).toBe(
            "acct-4471 is the strongest bridge. It sits on about 40 times more shortest paths than a typical node.",
        );
        expect(reading).toContain("times more shortest paths than a typical node");
        expect(reading).not.toContain("%");
    });

    it("never offers the unshipped articulation-point sentence or its stand-in", () => {
        for (const statistics of [SMALL_GRAPH.betweenness, LARGE_GRAPH.betweenness, ZERO_MEDIAN.betweenness]) {
            const reading = nodeMetricReading(statistics);

            expect(reading).not.toContain("Simulate removing");
            expect(reading).not.toContain("would split");
        }
    });

    it("states the median instead of an infinite multiple when half the nodes score nothing", () => {
        expect(nodeMetricReading(ZERO_MEDIAN.pagerank)).toBe(
            "acct-4471 has the most influence. Half the nodes score 0 or less.",
        );
        expect(nodeMetricReading(ZERO_MEDIAN.betweenness)).toBe(
            "acct-4471 is the strongest bridge. Half the nodes score 0 or less.",
        );
    });

    it.each(EVERY_READING)("never prints Infinity or NaN in $name", ({ statistics }) => {
        const reading = nodeMetricReading(statistics);

        expect(reading).not.toContain("Infinity");
        expect(reading).not.toContain("NaN");
    });

    it("names no bridge when the run measured none", () => {
        expect(nodeMetricReading(ALL_ZERO.betweenness)).toBe(
            "No node sits on a shortest path between two others. All 5 measured nodes scored 0.",
        );
    });

    it("names no hub when nothing has a link", () => {
        expect(nodeMetricReading(ALL_ZERO.degree)).toBe(
            "No node has any links. All 5 measured nodes are on their own.",
        );
        expect(nodeMetricReading(ALL_ZERO.pagerank)).toBe(
            "No node scored any influence. All 5 measured nodes scored 0.",
        );
    });

    it("crowns nobody when the top node is tied with the typical one", () => {
        expect(nodeMetricReading(ALL_TIED.betweenness)).toBe(
            "n0 is among the strongest bridges. At least half the measured nodes sit on as many shortest paths.",
        );
        expect(nodeMetricReading(ALL_TIED.degree)).toBe(
            "n0 is among the most connected, with 2 links. At least half the measured nodes have as many.",
        );
        expect(nodeMetricReading(ALL_TIED.pagerank)).toBe(
            "n0 is among the most influential. At least half the measured nodes score as much.",
        );
    });

    it("never prints a multiple of 1, and never a superlative, on a run that separated nothing", () => {
        for (const metric of ["betweenness", "degree", "pagerank"] as const) {
            const reading = nodeMetricReading(ALL_TIED[metric]);

            expect(reading).not.toContain("1 times");
            expect(reading).not.toContain(" is the ");
        }
    });

    it("never names a top node at all when the maximum measured value is 0", () => {
        for (const metric of ["betweenness", "degree", "pagerank"] as const) {
            expect(nodeMetricReading(ALL_ZERO[metric])).not.toContain("a is");
        }
    });

    it("never closes with a claim about what the colours show", () => {
        for (const { statistics } of EVERY_READING) {
            expect(nodeMetricReading(statistics)).not.toContain("Colors");
        }
    });
});

describe("formatMetricValue", () => {
    it("prints an integer metric exactly", () => {
        expect(formatMetricValue("degree", 12)).toBe("12");
    });

    it("groups a large integer, as the Counts rows do", () => {
        expect(formatMetricValue("degree", 1234)).toBe("1,234");
    });

    it("keeps two significant figures below 1, so 0.0034 does not become 0.00", () => {
        expect(formatMetricValue("pagerank", 0.0034)).toBe("0.0034");
    });

    it("rounds to two decimals at or above 1", () => {
        expect(formatMetricValue("betweenness", 41.276)).toBe("41.28");
    });

    it("prints a measured zero as 0, not as a row of decimal zeros", () => {
        expect(formatMetricValue("pagerank", 0)).toBe("0");
    });

    it("reads a non-finite value as 0, matching formatCount", () => {
        expect(formatMetricValue("pagerank", Number.POSITIVE_INFINITY)).toBe("0");
        expect(formatMetricValue("betweenness", Number.NaN)).toBe("0");
    });

    it("keeps a value just under 1 distinguishable from one an order of magnitude smaller", () => {
        expect(formatMetricValue("betweenness", 0.41)).toBe("0.41");
        expect(formatMetricValue("betweenness", 0.041)).toBe("0.041");
    });
});

describe("nodeMetricHeadline", () => {
    it("draws spec 7345's collapsed form", () => {
        expect(
            nodeMetricHeadline({ ...SMALL_GRAPH.betweenness, topId: "acct-4471", topValue: 0.41 }),
        ).toBe("Main bridge: acct-4471 (0.41)");
    });

    it("leads with the plain name of each capability", () => {
        expect(nodeMetricHeadline(SMALL_GRAPH.degree)).toBe("Most connected: Mr_Whiskers (12)");
        expect(nodeMetricHeadline(LARGE_GRAPH.pagerank)).toBe("Most influential: acct-4471 (0.0034)");
    });

    it("names nobody when the maximum measured value is 0", () => {
        expect(nodeMetricHeadline(ALL_ZERO.betweenness)).toBe("Main bridge: none");
        expect(nodeMetricHeadline(ALL_ZERO.degree)).toBe("Most connected: none");
    });

    it("marks the tie rather than collapsing to a bare winner", () => {
        expect(nodeMetricHeadline(ALL_TIED.degree)).toBe("Most connected: n0 (2, tied)");
        expect(nodeMetricHeadline(ALL_TIED.betweenness)).toBe("Main bridge: n0 (4, tied)");
    });
});

describe("nodeMetricResultBody", () => {
    it("draws the top three ranked nodes and no more", () => {
        const rows = nodeMetricResultBody(
            rankingOf(
                "degree",
                [
                    { id: "acct-4471", value: 12 },
                    { id: "acct-1180", value: 9 },
                    { id: "dev-22", value: 7 },
                    { id: "ph-1140", value: 4 },
                    { id: "merch-88", value: 2 },
                ],
                { rankedCount: 20, tiedAtMinimum: 1 },
            ),
        );

        expect(rows).toHaveLength(NODE_METRIC_TOP_ROWS);
        expect(rows.map((row) => row.rank)).toStrictEqual([1, 2, 3]);
        expect(rows.map((row) => row.name)).toStrictEqual(["acct-4471", "acct-1180", "dev-22"]);
        expect(rows.map((row) => row.value)).toStrictEqual(["12", "9", "7"]);

        for (const row of rows) {
            expect(row.nodeId).toBe(row.name);
        }
    });

    it("adds spec 2307's tie line when more than a tenth of the ranked nodes tie at zero", () => {
        const rows = nodeMetricResultBody(
            rankingOf(
                "betweenness",
                [
                    { id: "acct-4471", value: 0.41 },
                    { id: "acct-9", value: 0 },
                ],
                { rankedCount: 100, tiedAtMinimum: 11 },
            ),
        );
        const tieRow = rows[rows.length - 1];

        expect(tieRow.name).toBe("Zero or near-zero");
        expect(tieRow.value).toBe("11 nodes (11%)");
        expect(tieRow.rank).toBeUndefined();
        expect(tieRow.nodeId).toBeUndefined();
    });

    it("draws no tie line at a tenth or below", () => {
        const rows = nodeMetricResultBody(
            rankingOf("betweenness", [{ id: "acct-4471", value: 0.41 }], { rankedCount: 100, tiedAtMinimum: 9 }),
        );

        expect(rows).toHaveLength(1);
        expect(rows.map((row) => row.name)).not.toContain("Zero or near-zero");
    });

    it("reproduces spec 2307's own tie line at a million nodes", () => {
        const rows = nodeMetricResultBody(
            rankingOf(
                "betweenness",
                [
                    { id: "acct-4471", value: 0.41 },
                    { id: "acct-9", value: 0 },
                ],
                {
                    rankedCount: 1000000,
                    tiedAtMinimum: 912400,
                },
            ),
        );

        expect(rows[rows.length - 1].value).toBe("912,400 nodes (91%)");
    });

    it("never calls a tie at 2 links zero or near-zero", () => {
        const ring = ["n0", "n1", "n2", "n3", "n4", "n5"].map((id) => ({ id, value: 2 }));
        const rows = nodeMetricResultBody(rankingOf("degree", ring, { rankedCount: 6, tiedAtMinimum: 6 }));
        const tieRow = rows[rows.length - 1];

        expect(tieRow.name).toBe("Lowest value (2 links)");
        expect(tieRow.value).toBe("6 nodes (100%)");
        expect(rows.map((row) => row.name)).not.toContain("Zero or near-zero");
    });

    it("names the value a non-zero betweenness tie sits at", () => {
        const ring = ["n0", "n1", "n2", "n3", "n4", "n5"].map((id) => ({ id, value: 4 }));
        const rows = nodeMetricResultBody(rankingOf("betweenness", ring, { rankedCount: 6, tiedAtMinimum: 6 }));

        expect(rows[rows.length - 1].name).toBe("Lowest value (4 score)");
    });

    it("still reads a minimum far under the maximum as near zero", () => {
        const rows = nodeMetricResultBody(
            rankingOf(
                "degree",
                [
                    { id: "acct-4471", value: 1204318 },
                    { id: "acct-9", value: 1 },
                ],
                { rankedCount: 1000000, tiedAtMinimum: 912400 },
            ),
        );

        expect(rows[rows.length - 1].name).toBe("Zero or near-zero");
    });

    it("hands back the element's own numeric id, not the name it printed", () => {
        const rows = nodeMetricResultBody(
            rankingOf(
                "degree",
                [
                    { id: 1, value: 12 },
                    { id: 34, value: 9 },
                ],
                { rankedCount: 34, tiedAtMinimum: 1 },
            ),
        );

        expect(rows.map((row) => row.name)).toStrictEqual(["1", "34"]);
        expect(rows.map((row) => row.nodeId)).toStrictEqual([1, 34]);
    });

    it("draws nothing at all for an empty ranking", () => {
        expect(nodeMetricResultBody(rankingOf("degree", [], { rankedCount: 0, tiedAtMinimum: 0 }))).toStrictEqual([]);
    });
});
