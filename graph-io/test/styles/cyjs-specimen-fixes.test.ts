/**
 * Cytoscape.js settings the style specimen sheets showed graph-io dropping or misreading, each against what
 * Cytoscape.js 3.34 draws for it.
 */
import { describe, expect, it } from "vitest";

import { evaluateCytoscapeJs } from "../../src/styles/internal.js";

/** Two nodes and one edge between them, each styled by `node` / `edge` rules plus the given ones. */
function doc(
    node: Record<string, unknown>,
    edge: Record<string, unknown> = {},
    elements: unknown[] = [
        { data: { id: "a" }, position: { x: 0, y: 0 } },
        { data: { id: "b" }, position: { x: 100, y: 0 } },
        { data: { id: "ab", source: "a", target: "b" } },
    ],
): { elements: unknown; style: unknown } {
    return {
        elements,
        style: [
            { selector: "node", style: { label: "L", ...node } },
            { selector: "edge", style: { label: "E", ...edge } },
        ],
    };
}

describe("Cytoscape.js label alignments inside the node", () => {
    it("reads an -inside alignment as a position inside the node, against that side", () => {
        const at = (v: string, h: string): unknown =>
            evaluateCytoscapeJs(doc({ "text-valign": v, "text-halign": h })).node.values.labelPosition?.[0];
        expect(at("top-inside", "left-inside")).toBe("inside-top-left");
        expect(at("top-inside", "center")).toBe("inside-top");
        expect(at("center", "right-inside")).toBe("inside-right");
        expect(at("bottom-inside", "right-inside")).toBe("inside-bottom-right");
        // one side outside: that side, the inside part centered
        expect(at("top", "left-inside")).toBe("top");
        expect(at("top-inside", "left")).toBe("left");
        expect(at("center", "center")).toBe("center");
    });
});
