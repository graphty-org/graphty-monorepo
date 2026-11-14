import { GraphBuilder } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { computeStatistics } from "../../src/session/statistics";

const FILE = { by: "file", statedBy: 'edgedefault="directed"' } as const;

/**
 * A directed two-edge graph whose second edge says it is undirected when `mixed` is set.
 * @param mixed - whether to write the per-edge direction column
 * @returns the snapshot
 */
function graph(mixed: boolean): ReturnType<GraphBuilder["freeze"]> {
    const builder = new GraphBuilder({ directed: true });
    builder.addEdge("a", "b");
    const second = builder.addEdge("b", "c");
    if (mixed) {
        const handle = builder.declareEdgeColumn({ name: "graphty.directed", dtype: "bool", role: "directed" });
        builder.setEdgeValue(handle, second, false);
    }

    return builder.freeze();
}

describe("statistics directedness with per-edge direction (#309)", () => {
    it('reports "mixed" when edges carry differing directions', () => {
        assert.strictEqual(computeStatistics(graph(true), "auto", FILE).directedness, "mixed");
    });

    it("reports the graph's flag when no edge carries its own direction", () => {
        assert.strictEqual(computeStatistics(graph(false), "auto", FILE).directedness, "directed");
    });
});
