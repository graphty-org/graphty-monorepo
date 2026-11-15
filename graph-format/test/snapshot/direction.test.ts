import { describe, expect, it } from "vitest";

import { GraphBuilder } from "../../src/builder/graph-builder.js";
import { directedness, edgeIsDirected } from "../../src/snapshot/direction.js";
import { fromBytes } from "../../src/wire/bytes.js";
import { fromWire } from "../../src/wire/from-wire.js";

/**
 * A three-edge graph with an optional per-edge direction column.
 * @param directed - the graph-wide default
 * @param cells - the role-"directed" cell of each edge (null leaves the row unset), or no column
 * @returns the frozen snapshot
 */
function graph(directed: boolean, cells?: readonly (boolean | null)[]): ReturnType<GraphBuilder["freeze"]> {
    const builder = new GraphBuilder({ directed });
    const edges = [builder.addEdge("a", "b"), builder.addEdge("b", "c"), builder.addEdge("c", "a")];
    if (cells !== undefined) {
        const handle = builder.declareEdgeColumn({ name: "dir", dtype: "bool", role: "directed" });
        cells.forEach((cell, i) => {
            if (cell !== null) {
                builder.setEdgeValue(handle, edges[i], cell);
            }
        });
    }

    return builder.freeze();
}

describe("per-edge direction (design section 3.6)", () => {
    it("follows the graph-wide flag without the column", () => {
        expect(directedness(graph(true))).toBe("directed");
        expect(directedness(graph(false))).toBe("undirected");
        expect(edgeIsDirected(graph(false), 1)).toBe(false);
        expect(directedness(new GraphBuilder({ directed: false }).freeze())).toBe("undirected");
    });

    it("overrides the flag per edge, and an unset row takes the flag", () => {
        const s = graph(true, [true, false, null]);
        expect([0, 1, 2].map((e) => edgeIsDirected(s, e))).toEqual([true, false, true]);
        expect(directedness(s)).toBe("mixed");
        expect(directedness(graph(false, [true, null, null]))).toBe("mixed");
        expect(directedness(graph(true, [false, false, false]))).toBe("undirected");
        expect(directedness(graph(false, [true, true, true]))).toBe("directed");
        expect(directedness(graph(true, [null, null, null]))).toBe("directed");
    });

    it("survives the wire form and the byte container", () => {
        const s = graph(true, [true, false, null]);
        expect(directedness(fromWire(structuredClone(s.toWire())))).toBe("mixed");
        expect(directedness(fromBytes(s.toBytes()))).toBe("mixed");
    });
});
