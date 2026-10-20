/**
 * The Direction row: the direction and who settled it, never the file's raw statement.
 */
import type { GraphStatistics } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { directionNote, directionWords } from "../words";

/** An empty graph's statistics, the base each case overrides. */
const EMPTY_GRAPH_STATISTICS: GraphStatistics = {
    nodeCount: 0,
    edgeCount: 0,
    density: 0,
    directedness: "unknown",
    directednessSource: { by: "unsettled", statedBy: null },
    weighted: false,
    selfLoopCount: 0,
    repeatedEdgeCount: 0,
    degreeRange: [0, 0],
    meanDegree: 0,
    components: {
        count: 0,
        sizes: [],
        largestSize: 0,
        isolatedCount: 0,
        truncatedSizes: false,
        componentOf: () => undefined,
    },
};

/**
 * Statistics carrying only the direction facts the row reads.
 * @param directedness - the graph's direction.
 * @param source - where it was settled.
 * @returns the statistics.
 */
function stats(
    directedness: GraphStatistics["directedness"],
    source: GraphStatistics["directednessSource"],
): GraphStatistics {
    return { ...EMPTY_GRAPH_STATISTICS, directedness, directednessSource: source };
}

describe("directionWords", () => {
    it("names the direction in one word and leaves where it came from to the note", () => {
        const statistics = stats("undirected", { by: "file", statedBy: "directed 0" });
        assert.strictEqual(directionWords(statistics), "Undirected");
        const note = directionNote(statistics);
        assert.include(note, "first-listed node");
        // No direction, so an arrowhead is never said to point the edge's way: it shows the file's order.
        assert.notMatch(note, /no direction, so arrowheads point/);
        assert.include(note, "shows only the file's order");
        assert.include(note, "From the file.");
        assert.notInclude(note, "directed 0");
    });

    it("says the Data page settled it", () => {
        const statistics = stats("directed", { by: "configuration", statedBy: null });
        assert.strictEqual(directionWords(statistics), "Directed");
        assert.include(directionNote(statistics), "Set on the Data page.");
        assert.notInclude(directionNote(statistics), "first-listed");
    });

    it("words mixed and unknown direction each its own way", () => {
        const mixed = directionNote(stats("mixed", { by: "file", statedBy: null }));
        const unknown = directionNote(stats("unknown", { by: "unsettled", statedBy: null }));
        assert.include(mixed, "Some edges have a direction");
        assert.include(unknown, "Nothing says whether edges have a direction");
        assert.strictEqual(directionWords(stats("unknown", { by: "unsettled", statedBy: null })), "Not settled");
    });
});
