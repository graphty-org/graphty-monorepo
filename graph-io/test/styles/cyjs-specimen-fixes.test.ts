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

describe("Cytoscape.js edges", () => {
    it("draws no arrow on a haystack edge, the default curve style", () => {
        const arrows = { "target-arrow-shape": "triangle", "source-arrow-shape": "tee" };
        const haystack = evaluateCytoscapeJs(doc({}, arrows)).edge.values;
        expect(haystack.targetArrow?.[0]).toBe("none");
        expect(haystack.sourceArrow?.[0]).toBe("none");
        const straight = evaluateCytoscapeJs(doc({}, { ...arrows, "curve-style": "straight" })).edge.values;
        expect(straight.targetArrow?.[0]).toBe("triangle");
    });

    it("draws the line at its line-opacity times its opacity", () => {
        expect(evaluateCytoscapeJs(doc({}, { "line-opacity": 0.3 })).edge.values.opacity?.[0]).toBe(0.3);
        expect(evaluateCytoscapeJs(doc({}, { "line-opacity": 0.5, opacity: 0.5 })).edge.values.opacity?.[0]).toBe(0.25);
    });
});

describe("Cytoscape.js labels", () => {
    it("draws text-transform's case", () => {
        const at = (t: string): unknown =>
            evaluateCytoscapeJs(doc({ label: "Mixed Case", "text-transform": t })).node.values.label?.[0];
        expect(at("uppercase")).toBe("MIXED CASE");
        expect(at("lowercase")).toBe("mixed case");
        expect(at("none")).toBe("Mixed Case");
    });

    it("turns a node label by text-rotation, in degrees", () => {
        const at = (r: string): unknown =>
            evaluateCytoscapeJs(doc({ "text-rotation": r })).node.values.labelRotation?.[0];
        expect(at("30deg")).toBe(30);
        expect(at("none")).toBe(0);
        expect(at(String(Math.PI / 2))).toBe(90);
    });

    it("wraps at text-max-width only under text-wrap: wrap, whichever rule sets the width", () => {
        const sheet = (wrap: string): { elements: unknown; style: unknown } => ({
            elements: [{ data: { id: "a" } }],
            style: [
                { selector: "node", style: { label: "a long label", "text-wrap": "wrap", "text-max-width": "20px" } },
                { selector: "#a", style: { "text-wrap": wrap, "text-max-width": "60px" } },
            ],
        });
        const wrapped = evaluateCytoscapeJs(sheet("wrap"));
        expect(wrapped.node.values.labelWrapWidth?.[0]).toBe(60);
        const unwrapped = evaluateCytoscapeJs(sheet("none"));
        expect(unwrapped.node.values.labelWrapWidth?.[0] ?? null).toBeNull();
        // no rule carries the width on its own, so a rule never wraps a label its element does not wrap
        for (const rule of unwrapped.node.rules) {
            expect(rule.set?.labelWrapWidth).toBeUndefined();
        }
    });
});

describe("Cytoscape.js nodes", () => {
    it("keeps a node hidden by visibility: hidden, and its edges, drawn at opacity 0 with no label", () => {
        const r = evaluateCytoscapeJs(
            doc({}, {}, [
                { data: { id: "a" }, style: { visibility: "hidden" } },
                { data: { id: "b" }, style: { display: "none" } },
                { data: { id: "c" } },
            ]),
        );
        expect(r.node.values.visible?.slice(0, 3)).toEqual([true, false, null]);
        expect(r.node.values.opacity?.[0]).toBe(0);
        expect(r.node.values.label?.[0]).toBe("");
    });

    it("reads a linear background gradient as the fill, the gradient's end and its angle", () => {
        const at = (style: Record<string, unknown>): Record<string, unknown> => {
            const v = evaluateCytoscapeJs(doc(style)).node.values;
            return { fill: v.fill?.[0], to: v.fillGradient?.[0], angle: v.fillGradientAngle?.[0] };
        };
        const stops = "rgb(228,26,28) rgb(55,126,184)";
        expect(at({ "background-fill": "linear-gradient", "background-gradient-stop-colors": stops })).toEqual({
            fill: "#e41a1c",
            to: "#377eb8",
            angle: 90,
        });
        expect(
            at({
                "background-fill": "linear-gradient",
                "background-gradient-stop-colors": stops,
                "background-gradient-direction": "to-top-left",
            }).angle,
        ).toBe(-135);
        expect(at({ "background-fill": "solid", "background-gradient-stop-colors": stops }).to).toBeUndefined();
    });
});
