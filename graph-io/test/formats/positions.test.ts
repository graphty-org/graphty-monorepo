import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { exportGraphToBytes, importGraph } from "../../src/registry.js";
import { type FormatName } from "../../src/sniff.js";

/** Two nodes, the first at (0.1, -10.5): neither coordinate is exact in a 32-bit float. */
function positioned(): GraphSnapshot {
    const b = new GraphBuilder({ directed: true });
    const position = b.declareNodeColumn({
        name: "position",
        dtype: "f64",
        components: 3,
        role: "position",
        extra: { sourceDims: 2, units: "file" },
    });
    b.setNodeValue(position, b.addNode(1), [0.1, -10.5, 0]);
    b.setNodeValue(position, b.addNode(2), [1, 2, 0]);
    b.addEdge(1, 2);
    return b.freeze();
}

describe("positions round-trip exactly through every format that writes full doubles", () => {
    const formats: FormatName[] = ["json", "cx", "cx2", "cys", "gexf", "dot", "pajek", "xgmml", "gml"];
    for (const format of formats) {
        it(format, async () => {
            // JSON carries a position only in its Cytoscape dialect
            const bytes = await exportGraphToBytes(
                positioned(),
                format,
                format === "json" ? { dialect: "cytoscape" } : {},
            );
            const { snapshot } = await importGraph(bytes, { format });
            const position = snapshot.nodes.byRole("position");
            expect(position?.dtype).toBe("f64");
            expect(Array.from(position?.value(0) as ArrayLike<number>)).toEqual([0.1, -10.5, 0]);
            expect(Array.from(position?.value(1) as ArrayLike<number>)).toEqual([1, 2, 0]);
        });
    }
});
