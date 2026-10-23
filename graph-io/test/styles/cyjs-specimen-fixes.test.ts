/**
 * Cytoscape.js settings the style specimen sheets showed graph-io dropping or misreading, each against what
 * Cytoscape.js 3.34 draws for it.
 */
import { describe, expect, it } from "vitest";

import { STYLE_ISSUE } from "../../src/styles/codes.js";
import { evaluateCytoscapeJs } from "../../src/styles/internal.js";
import { StyleNotes } from "../../src/styles/notes.js";

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
        expect(at("center", "center")).toBe("center");
    });

    it("pins a label with one alignment inside and the other outside where Cytoscape.js draws it", () => {
        const place = (v: string, h: string, more: Record<string, unknown> = {}): unknown[] => {
            const { values } = evaluateCytoscapeJs(doc({ "text-valign": v, "text-halign": h, ...more })).node;
            return ["labelPosition", "labelOffsetX", "labelOffsetY", "labelShiftX", "labelShiftY"].map(
                (p) => values[p]?.[0],
            );
        };
        // bottom-inside / left on a 30px node: the label's bottom right corner at (-15, 15)
        expect(place("bottom-inside", "left")).toEqual(["center", -15, 15, -0.5, -0.5]);
        // top / left-inside: its bottom left corner at (-15, -15)
        expect(place("top", "left-inside")).toEqual(["center", -15, -15, 0.5, -0.5]);
        // padding moves an outside side out by it and an inside side in by it; the margin is added
        expect(place("bottom", "right-inside", { width: 40, height: 20, padding: 5, "text-margin-x": 2 })).toEqual([
            "center",
            2 + 20 - 5,
            10 + 5,
            -0.5,
            0.5,
        ]);
    });
});

describe("Cytoscape.js label boxes", () => {
    it("draws the box one font size tall a line, its corners rounded only for round-rectangle", () => {
        const box = (shape: string): unknown[] => {
            const { values } = evaluateCytoscapeJs(
                doc({ "text-background-opacity": 1, "text-background-shape": shape }),
            ).node;
            return [values.labelLineHeight?.[0], values.labelCornerRadius?.[0] ?? null];
        };
        expect(box("rectangle")).toEqual([1, null]);
        expect(box("round-rectangle")).toEqual([1, 2]);
        expect(box("roundrectangle")).toEqual([1, 2]);
        // no box drawn: nothing set
        expect(evaluateCytoscapeJs(doc({})).node.values.labelLineHeight).toBeUndefined();
    });

    it("notes a circle box, which no neutral box shape draws", () => {
        const notes = new StyleNotes();
        evaluateCytoscapeJs({
            ...doc({ "text-background-opacity": 1, "text-background-shape": "circle" }),
            notes,
        });
        expect(notes.covers(STYLE_ISSUE.APPROXIMATED, "node", "labelBackground", 0)).toBe(true);
    });
});

describe("Cytoscape.js edges", () => {
    it("draws no arrow on a haystack edge, the default curve style", () => {
        const arrows = { "target-arrow-shape": "triangle", "source-arrow-shape": "tee" };
        const haystack = evaluateCytoscapeJs(doc({}, arrows)).edge.values;
        expect(haystack.targetArrow?.[0]).toBe("none");
        expect(haystack.sourceArrow?.[0]).toBe("none");
        // drawArrowheads still draws the mid arrows of a haystack
        const mid = evaluateCytoscapeJs(doc({}, { "mid-target-arrow-shape": "triangle" })).edge.values;
        expect(mid.midTargetArrow?.[0]).toBe("triangle");
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

    it("reads text-overflow-wrap: anywhere on a wrapped label as a break between any two letters", () => {
        const at = (style: Record<string, unknown>): unknown => {
            const v = evaluateCytoscapeJs(doc({ "text-max-width": "40px", ...style })).node.values;
            return v.labelWrapAnywhere?.[0] ?? null;
        };
        expect(at({ "text-wrap": "wrap", "text-overflow-wrap": "anywhere" })).toBe(true);
        expect(at({ "text-wrap": "wrap", "text-overflow-wrap": "whitespace" })).toBeNull();
        // a label Cytoscape.js does not wrap breaks nowhere
        expect(at({ "text-wrap": "none", "text-overflow-wrap": "anywhere" })).toBeNull();
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
        expect(r.node.values.borderOpacity?.[0]).toBe(0);
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
        ).toBe(225);
        expect(at({ "background-fill": "solid", "background-gradient-stop-colors": stops }).to).toBeUndefined();
    });

    it("reads a radial gradient, every stop color and the stop positions Cytoscape.js places them at", () => {
        const at = (style: Record<string, unknown>): unknown[] => {
            const v = evaluateCytoscapeJs(doc(style)).node.values;
            return [v.fill?.[0], v.fillGradientKind?.[0], v.fillGradientColors?.[0], v.fillGradientStops?.[0]];
        };
        const three = "cyan magenta yellow";
        expect(at({ "background-fill": "radial-gradient", "background-gradient-stop-colors": three })).toEqual([
            "#00ffff",
            "radial",
            "#00ffff #ff00ff #ffff00",
            undefined,
        ]);
        const placed = { "background-fill": "linear-gradient", "background-gradient-stop-colors": three };
        expect(at({ ...placed, "background-gradient-stop-positions": "0% 20% 100%" })[3]).toBe("0 0.2 1");
        // Cytoscape.js spaces the colors evenly unless there is one position per color
        expect(at({ ...placed, "background-gradient-stop-positions": "0% 100%" })[3]).toBeUndefined();
    });
});

describe("Cytoscape.js edge routes", () => {
    const routed = (edge: Record<string, unknown>, to = { x: 100, y: 0 }): Record<string, unknown> => {
        const v = evaluateCytoscapeJs(
            doc({}, edge, [
                { data: { id: "a" }, position: { x: 0, y: 0 } },
                { data: { id: "b" }, position: to },
                { data: { id: "ab", source: "a", target: "b" } },
            ]),
        ).edge.values;
        return { bends: v.bends?.[0] ?? null, curved: v.curved?.[0] ?? null };
    };

    it("draws a segments edge through its points, offset from the line between the nodes' outlines", () => {
        // the line runs from (15, 0) to (85, 0); 20 px to its right is 20 px down, below it
        expect(routed({ "curve-style": "segments" })).toEqual({ bends: "0.5,-0.2", curved: false });
        expect(
            routed({ "curve-style": "segments", "segment-distances": "20px -20px", "segment-weights": "0.25 0.75" })
                .bends,
        ).toBe("0.325,-0.2 0.675,0.2");
    });

    it("rounds a round-segments edge's corner as an arc of its segment radius", () => {
        const across = (edge: Record<string, unknown>): number[] =>
            String(routed({ "curve-style": "round-segments", ...edge }).bends)
                .split(" ")
                .map((p) => Number(p.split(",")[1]));
        // the corner 20 px off the line is cut off: the arc never reaches it
        const round = across({});
        expect(round.length).toBeGreaterThan(1);
        expect(Math.min(...round)).toBeGreaterThan(-0.2);
        // a larger radius cuts off more
        expect(Math.min(...across({ "segment-radii": 30 }))).toBeGreaterThan(Math.min(...round));
    });

    it("draws a taxi edge through its two corners, turning halfway between the nodes' sides", () => {
        expect(routed({ "curve-style": "taxi", "taxi-direction": "horizontal" }, { x: 100, y: 50 })).toEqual({
            bends: "0.4,0.2 0.6,-0.2",
            curved: false,
        });
    });

    it("draws an unbundled bezier with control points, and a loop, through the curve Cytoscape.js draws", () => {
        const curve = routed({
            "curve-style": "unbundled-bezier",
            "control-point-distances": "40px",
            "control-point-weights": "0.5",
        });
        expect(curve.curved).toBe(false);
        // the quadratic runs from the outlines toward its control point (50, 40): its middle is halfway between the
        // control point and those ends, which are 9.37 px below the line, so 24.69 px below it
        const points = String(curve.bends)
            .split(" ")
            .map((p) => p.split(",").map(Number));
        expect(Math.min(...points.map(([, across]) => across))).toBeCloseTo(-0.2469, 3);
        // with no control-point-distances, the one control point is the step size (40 px) out
        expect(routed({ "curve-style": "unbundled-bezier" })).toEqual(curve);
        const loop = evaluateCytoscapeJs(
            doc({}, { "curve-style": "bezier" }, [
                { data: { id: "a" }, position: { x: 0, y: 0 } },
                { data: { id: "aa", source: "a", target: "a" } },
            ]),
        ).edge.values;
        expect(loop.curved?.[0]).toBe(false);
        // the default loop reaches up and to the left of the node (loop-direction -45deg, from 12 o'clock)
        const [x, y] = String(loop.bends?.[0]).split(" ")[4].split(",").map(Number);
        expect(x).toBeLessThan(0);
        expect(y).toBeGreaterThan(0);
    });
});

describe("Cytoscape.js node sizes", () => {
    it("draws a padded node larger by its padding on every side", () => {
        const v = evaluateCytoscapeJs(
            doc({ width: 36, height: 36 }, {}, [
                { data: { id: "b" }, style: { padding: "6px" } },
                { data: { id: "c" }, style: { padding: "20%" } },
            ]),
        ).node.values;
        expect([v.width?.[0], v.height?.[0]]).toEqual([48, 48]);
        // a percentage is drawn as its fraction in pixels on a node that holds no others
        expect(v.width?.[1]).toBeCloseTo(36.4, 6);
    });
});

describe("Cytoscape.js label outlines, boxes, turns and wraps", () => {
    it("draws an outline only with a width, as a stroke twice that width, and a box only with an opacity", () => {
        const v = evaluateCytoscapeJs(
            doc({}, {}, [
                { data: { id: "a" }, style: { "text-outline-width": "2px", "text-outline-color": "red" } },
                { data: { id: "b" }, style: { "text-outline-color": "red" } },
                { data: { id: "c" }, style: { "text-background-color": "yellow", "text-background-opacity": 1 } },
                { data: { id: "d" }, style: { "text-background-color": "yellow" } },
            ]),
        ).node.values;
        expect([v.labelOutlineColor?.[0], v.labelOutlineWidth?.[0]]).toEqual(["#ff0000", 4]);
        expect(v.labelOutlineColor?.[1] ?? null).toBeNull();
        expect(v.labelBackground?.[2]).toBe("#ffff00");
        expect(v.labelBackground?.[3] ?? null).toBeNull();
    });

    it("turns an edge label by text-rotation, and along its line for autorotate", () => {
        const at = (r: string, to = { x: 100, y: 0 }): unknown =>
            evaluateCytoscapeJs(
                doc({}, { "text-rotation": r, "curve-style": "straight" }, [
                    { data: { id: "a" }, position: { x: 0, y: 0 } },
                    { data: { id: "b" }, position: to },
                    { data: { id: "ab", source: "a", target: "b" } },
                ]),
            ).edge.values.labelRotation?.[0];
        expect(at("30deg")).toBe(30);
        expect(at("-30deg")).toBe(330);
        expect(at("autorotate", { x: 100, y: 100 })).toBe(45);
        // a vertical line turns its label to 90 whichever way it runs (lineAngleFromDelta), never upside down
        expect(at("autorotate", { x: 0, y: -100 })).toBe(90);
        expect(at("autorotate", { x: 0, y: 100 })).toBe(90);
        expect(at("autorotate", { x: -100, y: 100 })).toBe(315);
    });

    it("wraps an edge label at text-max-width under text-wrap: wrap", () => {
        const v = evaluateCytoscapeJs(doc({}, { "text-wrap": "wrap", "text-max-width": "40px" })).edge.values;
        expect(v.labelWrapWidth?.[0]).toBe(40);
    });
});

describe("Cytoscape.js text justification", () => {
    it("lines a label's lines up as text-justification says, auto against the node", () => {
        const at = (style: Record<string, unknown>): unknown =>
            evaluateCytoscapeJs(doc({ label: "a\nbb", "text-wrap": "wrap", ...style })).node.values.labelTextAlign?.[0];
        expect(at({ "text-justification": "left" })).toBe("left");
        expect(at({ "text-justification": "auto", "text-halign": "left" })).toBe("right");
        expect(at({ "text-justification": "auto", "text-halign": "right" })).toBe("left");
        expect(at({ "text-justification": "auto" })).toBe("center");
    });
});

describe("Cytoscape.js label opacity, margins and borders", () => {
    it("draws a label at text-opacity, moved by text-margin-x and -y, a node's and an edge's", () => {
        const v = evaluateCytoscapeJs(
            doc({ "text-opacity": 0.4, "text-margin-x": "12px", "text-margin-y": "-12px" }, { "text-margin-x": 20 }),
        );
        expect(v.node.values.labelOpacity?.[0]).toBe(0.4);
        expect([v.node.values.labelOffsetX?.[0], v.node.values.labelOffsetY?.[0]]).toEqual([12, -12]);
        expect(v.edge.values.labelOffsetX?.[0]).toBe(20);
    });

    it("draws a label, and its box, at the element's opacity times its own, not at the line's", () => {
        const v = evaluateCytoscapeJs(
            doc(
                { opacity: 0.5, "text-opacity": 0.4, "text-background-opacity": 1 },
                { opacity: 0.5, "line-opacity": 0.5 },
            ),
        );
        expect(v.node.values.labelOpacity?.[0]).toBe(0.2);
        expect(v.node.values.labelBackgroundOpacity?.[0]).toBe(0.5);
        expect(v.edge.values.labelOpacity?.[0]).toBe(0.5);
        expect(v.edge.values.opacity?.[0]).toBe(0.25);
    });

    it("draws a label's box at its opacity, and a line round it only with a width and an opacity", () => {
        const v = evaluateCytoscapeJs(
            doc({}, {}, [
                { data: { id: "a" }, style: { "text-background-color": "blue", "text-background-opacity": 0.4 } },
                { data: { id: "b" }, style: { "text-border-width": "1px", "text-border-opacity": 1 } },
                {
                    data: { id: "c" },
                    style: { "text-border-width": 2, "text-border-opacity": 1, "text-border-color": "red" },
                },
                { data: { id: "d" }, style: { "text-border-width": 2 } },
            ]),
        ).node.values;
        expect([v.labelBackground?.[0], v.labelBackgroundOpacity?.[0], v.labelPadding?.[0]]).toEqual([
            "#0000ff",
            0.4,
            0,
        ]);
        expect([v.labelBorderColor?.[1], v.labelBorderWidth?.[1]]).toEqual(["#000000", 1]);
        expect([v.labelBorderColor?.[2], v.labelBorderWidth?.[2]]).toEqual(["#ff0000", 2]);
        // text-border-opacity is 0 by default: no line
        expect(v.labelBorderWidth?.[3] ?? null).toBeNull();
    });

    it("draws a label outline's and border's opacity, a double border a quarter wide, and the box padding", () => {
        const v = evaluateCytoscapeJs(
            doc({}, {}, [
                {
                    data: { id: "a" },
                    style: { "text-outline-width": 2, "text-outline-opacity": 0.3, "text-opacity": 0.5 },
                },
                {
                    data: { id: "b" },
                    style: {
                        "text-border-width": 2,
                        "text-border-opacity": 0.3,
                        "text-border-style": "double",
                        "text-background-padding": "4px",
                    },
                },
            ]),
        ).node.values;
        expect(v.labelOutlineOpacity?.[0]).toBe(0.15);
        expect([v.labelBorderWidth?.[1], v.labelBorderOpacity?.[1], v.labelPadding?.[1]]).toEqual([0.5, 0.3, 4]);
    });

    it("notes a double label border as approximated: drawText strokes two lines, graphty one", () => {
        const notes = new StyleNotes();
        evaluateCytoscapeJs({
            ...doc({ "text-border-width": 4, "text-border-opacity": 1, "text-border-style": "double" }),
            notes,
        });
        expect(notes.covers(STYLE_ISSUE.APPROXIMATED, "node", "labelBorderColor", 0)).toBe(true);
    });
});

describe("Cytoscape.js node borders, opacity and sizes to the label", () => {
    it("reads border-position, and draws the border and outline at the node's opacity", () => {
        const v = evaluateCytoscapeJs(
            doc({
                "border-width": 6,
                "border-position": "inside",
                opacity: 0.15,
                "border-opacity": 0.5,
                "outline-width": 2,
            }),
        ).node.values;
        expect(v.borderPosition?.[0]).toBe("inside");
        expect(v.borderOpacity?.[0]).toBe(0.075);
        expect(v.outerBorderOpacity?.[0]).toBe(0.15);
    });

    it("reads a dashed line or border as the line its dash pattern looks like at its width", () => {
        const edges = (edge: Record<string, unknown>): unknown =>
            evaluateCytoscapeJs(doc({}, { "line-style": "dashed", "curve-style": "straight", ...edge })).edge.values
                .lineStyle?.[0];
        // the default 6 3 at the default 3 px is dashes; at 5 px each dash is no longer than a dot
        expect(edges({})).toBe("dashed");
        expect(edges({ width: 5 })).toBe("dotted");
        expect(edges({ "line-dash-pattern": [12, 4, 2, 4] })).toBe("dash-dot");
        // a round cap grows each dash by the width
        expect(edges({ "line-dash-pattern": [3, 6], "line-cap": "round" })).toBe("dashed");
        const border = (node: Record<string, unknown>): unknown =>
            evaluateCytoscapeJs(doc({ "border-style": "dashed", ...node })).node.values.borderStyle?.[0];
        expect(border({ "border-width": 1 })).toBe("dashed");
        expect(border({ "border-width": 4 })).toBe("dotted");
        const outline = evaluateCytoscapeJs(doc({ "outline-style": "dashed", "outline-width": 4 })).node.values;
        expect(outline.outerBorderStyle?.[0]).toBe("dotted");
    });

    it("sizes a node to its label for width: label or height: label, the other side kept", () => {
        const v = evaluateCytoscapeJs(
            doc({ width: 36, height: 36 }, {}, [
                { data: { id: "w" }, style: { width: "label" } },
                { data: { id: "h" }, style: { height: "label", padding: "2px" } },
            ]),
        ).node.values;
        expect([v.labelFit?.[0], v.width?.[0], v.height?.[0]]).toEqual(["bounds", 0, 36]);
        expect([v.labelFit?.[1], v.width?.[1], v.height?.[1], v.labelPaddingY?.[1]]).toEqual(["bounds", 40, 0, 2]);
    });
});

describe("Cytoscape.js edge endpoints", () => {
    const ports = (edge: Record<string, unknown>): unknown[] => {
        const v = evaluateCytoscapeJs(doc({ width: 40, height: 20 }, edge)).edge.values;
        return [v.sourcePort?.[0] ?? null, v.targetPort?.[0] ?? null];
    };

    it("runs a haystack edge between the centers", () => {
        expect(ports({})).toEqual(["0,0", "0,0"]);
    });

    it("meets the node at its center, an offset from it, or an angle on its outline", () => {
        const straight = { "curve-style": "straight" };
        expect(ports(straight)).toEqual([null, null]);
        expect(ports({ ...straight, "source-endpoint": "inside-to-node" })).toEqual(["0,0", null]);
        // 50% of the 40 px width is a whole half width; 5 px down is half the half height, y up
        expect(ports({ ...straight, "target-endpoint": "50% 5px" })).toEqual([null, "1,-0.5"]);
        expect(ports({ ...straight, "source-endpoint": "90deg", "target-endpoint": "0deg" })).toEqual(["1,0", "0,1"]);
        // a taxi edge leaves its ends where the outline is
        expect(ports({ "curve-style": "taxi", "source-endpoint": "inside-to-node" })).toEqual([null, null]);
    });
});
