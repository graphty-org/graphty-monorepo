/**
 * An export with styles writes the label graphty draws where the format keeps a node's label (Pajek's vertex label,
 * GEXF's label attribute). A data column of that name holding other labels is then not
 * written, and the export says so, rather than dropping it silently (#7494: a Pajek label with a double quote gave
 * the E_PAJEK_TEXT refusal with styles off and nothing at all with styles on).
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { type ExtractedStyles, featuresOf, planStyles, styleFingerprint } from "../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Two nodes with a label column, the first label holding a double quote.
 * @returns the graph
 */
function graph(): GraphSnapshot {
    const b = new GraphBuilder({ directed: true, weightDtype: "f64" });
    const label = b.declareNodeColumn({ name: "label", dtype: "string", nullable: true, role: "label" });
    b.addNode("a");
    b.addNode("b");
    b.setNodeValue(label, 0, 'say "hi"');
    b.setNodeValue(label, 1, "plain");
    b.addEdge("a", "b");
    return b.freeze();
}

/**
 * Styles that fill the nodes and, when asked, draw the given labels.
 * @param snapshot - the graph
 * @param label - each node's drawn label, or undefined to draw none
 * @returns the styles
 */
function styles(snapshot: GraphSnapshot, label?: string[]): ExtractedStyles {
    return planStyles(
        {
            format: "test",
            node: { values: { fill: ["#ff0000", "#00ff00"], ...(label === undefined ? {} : { label }) } },
            edge: { values: {} },
            graph: {},
            fingerprint: styleFingerprint(snapshot),
        },
        { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
    );
}

describe("a data label column replaced by the drawn labels", () => {
    for (const format of ["pajek", "gexf"] as const) {
        it(`${format}: drawing no label reports the label column as not written`, () => {
            const snapshot = graph();
            const notes = registry.checkExport(snapshot, format, { styles: styles(snapshot) });
            expect(notes.filter((n) => n.column === "label" && n.code.startsWith("W_")).map((n) => n.count)).toContain(
                2,
            );
        });
    }

    it("pajek: drawing the data labels writes them, the quote as Pajek can, with no column note", async () => {
        const snapshot = graph();
        const options = { styles: styles(snapshot, ['say "hi"', "plain"]) };
        const notes = registry.checkExport(snapshot, "pajek", options);
        expect(notes.filter((n) => n.code === "W_COLUMN_DROPPED")).toEqual([]);
        expect(notes.some((n) => n.code.startsWith("W_STYLE"))).toBe(true);
        const out = await registry.exportGraphToString(snapshot, "pajek", options);
        expect(out).toContain(`"say 'hi'"`);
        expect(out).toContain('"plain"');
    });
});
