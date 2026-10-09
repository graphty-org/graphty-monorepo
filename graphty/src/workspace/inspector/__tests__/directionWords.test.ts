/**
 * The Direction row: the direction and who settled it, never the file's raw statement.
 */
import type { GraphStatistics } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { EMPTY_GRAPH_STATISTICS } from "../../../components/shell/analysis/graphShape";
import { directionWords } from "../words";

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
    it("says the file settled it without quoting the file's statement", () => {
        const words = directionWords(stats("undirected", { by: "file", statedBy: "directed 0" }));
        assert.strictEqual(words, "Undirected, from the file");
        assert.notInclude(words, "directed 0");
    });

    it("says the project settled it", () => {
        assert.strictEqual(
            directionWords(stats("directed", { by: "configuration", statedBy: null })),
            "Directed, set in the project",
        );
    });

    it("gives only the direction when nothing settled it", () => {
        assert.strictEqual(directionWords(stats("unknown", { by: "unsettled", statedBy: null })), "Not settled");
    });
});
