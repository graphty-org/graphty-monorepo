/**
 * vis-network settings the specimen sheets showed graph-io dropping or misreading: each read the way vis-network
 * 9.1.9 draws it (`graph-io/test/fidelity/specimens/vis-network/`).
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { resolveStyles, type StyleProperty, type StyleTarget } from "../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Imports a vis-network document with its styles.
 * @param doc - the document
 * @returns the import result, with styles
 */
async function load(doc: object) {
    const result = await registry.importGraph(JSON.stringify(doc), { format: "json", styles: true });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

/**
 * Values of a property by node or edge index.
 * @param r - an import result with styles
 * @param target - nodes or edges
 * @param property - the property
 * @returns the values
 */
function values(r: Awaited<ReturnType<typeof load>>, target: StyleTarget, property: string): unknown[] {
    return [...resolveStyles(r.styles, target, property as StyleProperty, r.snapshot)];
}

/** Two nodes 100 px apart in x, 40 in y (y down), with physics off as the specimen sheets have it. */
const ENDS = [
    { id: "a", x: 0, y: 0 },
    { id: "b", x: 100.9, y: 40 },
];

describe("vis-network edge routes", () => {
    it("draws a static smooth edge as a quadratic curve through vis-network's control point", async () => {
        const r = await load({
            nodes: ENDS,
            edges: [
                { from: "a", to: "b", smooth: { enabled: true, type: "curvedCW" } },
                { from: "a", to: "b", smooth: { type: "horizontal", roundness: 0.2 } },
                { from: "a", to: "b", smooth: false },
                { from: "a", to: "b" },
            ],
            options: { physics: false },
        });
        // curvedCW at roundness 0.5: 0.75 of the distance from the source, turned 0.75 pi from the line: relative to
        // the line that is 0.75 sin(0.75 pi) along it and as far to its left, whichever way it runs
        expect(values(r, "edge", "bends")[0]).toBe("0.5303,0.5303");
        const l2 = 100 * 100 + 40 * 40;
        const round = (v: number): number => Math.round(v * 1e4) / 1e4;
        // horizontal: at the source's y, 0.8 of the way across in x
        expect(values(r, "edge", "bends")[1]).toBe(`${round((20 * 100) / l2)},${round((40 * 20) / l2)}`);
        expect(values(r, "edge", "curved")).toEqual([true, true, null, null]);
        expect(values(r, "edge", "bendCurve")).toEqual(["bezier", "bezier", null, null]);
    });

    it("draws a cubicBezier edge through its two control points and a dynamic one straight", async () => {
        const r = await load({
            nodes: ENDS,
            edges: [
                { from: "a", to: "b", smooth: { type: "cubicBezier" } },
                { from: "a", to: "b", smooth: { type: "cubicBezier", forceDirection: "vertical" } },
                { from: "a", to: "b", smooth: { type: "dynamic" } },
            ],
            options: { physics: false, edges: { smooth: { roundness: 0.5 } } },
        });
        // horizontal: (50, 0) and (50, 40); vertical: (0, 20) and (100, 20)
        expect(values(r, "edge", "bends")[0]).toBe("0.431,0.1724 0.569,-0.1724");
        expect(values(r, "edge", "bends")[1]).toBe("0.069,-0.1724 0.931,0.1724");
        expect(values(r, "edge", "bends")[2]).toBe(null);
    });

    it("draws a self-loop as vis-network's circle on the node's outline, of selfReference.size at its angle", async () => {
        const r = await load({
            nodes: [
                { id: "a", x: 0, y: 0, shape: "dot", size: 10, borderWidth: 1 },
                { id: "b", x: 100, y: 0, shape: "square", size: 10, borderWidth: 1 },
            ],
            edges: [
                { from: "a", to: "a" },
                { from: "a", to: "a", selfReference: { size: 25, angle: Math.PI / 2 } },
                { from: "b", to: "b" },
            ],
            options: { physics: false },
        });
        const bends = values(r, "edge", "bends") as string[];
        const round = (v: number): number => Math.round(v * 1e4) / 1e4;
        // a dot's outline is its size from its center, border left out (Dot.distanceToBorder): the center 10 out at
        // pi / 4; the first corner the one facing the node, 20 left of the center and 20 below, and again last, so the
        // curve runs the whole circle
        const c = Math.cos(Math.PI / 4) * 10;
        const first = bends[0].split(" ");
        expect(first).toHaveLength(5);
        expect(first[0]).toBe(`${round((c - 20) / 10)},${round((c - 20) / 10)}`);
        expect(first[4]).toBe(first[0]);
        // straight up, 25 across: the center 10 above the node and the circle round the whole node, meeting it
        // nowhere, so it is written as the circle itself from its bottom, 15 below the node's center, round and back
        const ring = bends[1].split(" ");
        expect(ring).toHaveLength(97);
        expect(ring[0]).toBe("0,-1.5");
        expect(ring[96]).toBe(ring[0]);
        expect(ring[24]).toBe("2.5,1");
        // a square's outline is its box plus its border (NodeBase._distanceToBorder): 10 sqrt 2 + 1 out at pi / 4
        const q = Math.cos(Math.PI / 4) * (10 * Math.SQRT2 + 1);
        expect(bends[2].split(" ")[0]).toBe(`${round((q - 20) / 10)},${round((q - 20) / 10)}`);
        expect(values(r, "edge", "bendCurve")).toEqual(["midpoints", null, "midpoints"]);
        expect(values(r, "edge", "curved")).toEqual([true, false, true]);
    });

    it("draws a circle in front of its node (renderBehindTheNode: false) as the arc vis-network searches for", async () => {
        const r = await load({
            nodes: [{ id: "a", x: 0, y: 0, shape: "dot", size: 8 }],
            edges: [{ from: "a", to: "a", selfReference: { renderBehindTheNode: false } }],
            options: { physics: false },
        });
        // vis-network-specimen-edges-lines `self-reference-front`: an arc of the circle of 20 centered 8 out at pi / 4,
        // part of the way round, every point outside the node
        const points = (values(r, "edge", "bends")[0] as string).split(" ").map((p) => p.split(",").map(Number));
        const c = Math.cos(Math.PI / 4);
        for (const [x, y] of points) {
            expect(Math.hypot(x * 8 - c * 8, y * 8 - c * 8)).toBeCloseTo(20, 2);
            expect(Math.hypot(x * 8, y * 8)).toBeGreaterThan(8);
        }
        expect(points.length).toBeGreaterThan(10);
        expect(points.length).toBeLessThan(97);
        expect(values(r, "edge", "curved")).toEqual([false]);
    });
});

describe("vis-network nodes", () => {
    it("fades a node's border with its opacity, hides a box with margin 0 and sizes an empty label as 14 x 14", async () => {
        const font = { size: 10 };
        const r = await load({
            nodes: [
                { id: "a", shape: "dot", opacity: 0.25 },
                { id: "b", shape: "box", label: "M", margin: 0 },
                { id: "c", shape: "box", margin: 5 },
                { id: "d", shape: "ellipse", font },
            ],
            edges: [],
            options: { physics: false },
        });
        expect(values(r, "node", "borderOpacity")[0]).toBe(0.25);
        expect(values(r, "node", "visible")[1]).toBe(false);
        // a box: the 14 x 14 label box and 5 each side; an ellipse: twice the box's height tall, its width and height wide
        expect([values(r, "node", "width")[2], values(r, "node", "height")[2]]).toEqual([24, 24]);
        expect([values(r, "node", "width")[3], values(r, "node", "height")[3]]).toEqual([28, 28]);
    });

    it("wraps a label at widthConstraint.maximum, scales its font size under scaling.label, aligns it by valign", async () => {
        const r = await load({
            nodes: [
                { id: "a", label: "a long box label", shape: "box", widthConstraint: { maximum: 50 } },
                { id: "b", value: 1 },
                { id: "c", value: 10, label: "Scaled", scaling: { label: { enabled: true, min: 8, max: 24 } } },
                { id: "d", value: 4, label: "Not scaled" },
            ],
            edges: [{ from: "a", to: "b", label: "edge label", widthConstraint: 30 }],
            options: { physics: false },
        });
        expect(values(r, "node", "labelWrapWidth")[0]).toBe(50);
        expect(values(r, "edge", "labelWrapWidth")[0]).toBe(30);
        // vis-network keeps each blank as a word and joins words with a blank, so a blank counts three
        expect(values(r, "node", "labelWrapSpaceCount")[0]).toBe(3);
        expect(values(r, "edge", "labelWrapSpaceCount")[0]).toBe(3);
        expect(values(r, "node", "labelWrapSpaceCount")[1]).toBeNull();
        expect(values(r, "node", "labelSize")[2]).toBe(24);
        const v = await load({
            nodes: [
                { id: "a", shape: "box", label: "V", heightConstraint: { minimum: 56, valign: "top" } },
                { id: "b", shape: "box", label: "V", heightConstraint: { minimum: 56, valign: "bottom" } },
                { id: "c", shape: "box", label: "V", heightConstraint: { minimum: 56 } },
            ],
            edges: [],
            options: { physics: false },
        });
        expect(values(v, "node", "labelPosition")).toEqual(["inside-top", "inside-bottom", "center"]);
        // not enabled: vis-network's font size, 14
        expect(values(r, "node", "labelSize")[3]).toBe(14);
    });

    it("draws a hexagon regular, a database's label at its top and a box's borderRadius as its corners", async () => {
        const r = await load({
            nodes: [
                { id: "a", shape: "hexagon", size: 18, label: "H" },
                { id: "b", shape: "database", label: "D" },
                { id: "c", shape: "database", label: "D", margin: { top: 9 } },
                { id: "d", shape: "box", label: "B", shapeProperties: { borderRadius: 12 } },
                { id: "e", shape: "box", label: "B" },
            ],
            edges: [],
            options: { physics: false },
        });
        // drawHexagon: corners `size` out at left and right, so sqrt(3) * size tall; its label still hangs below the
        // 2 * size square, (2 - sqrt(3)) * size / 2 further down
        expect(values(r, "node", "width")[0]).toBe(36);
        expect(values(r, "node", "height")[0]).toBeCloseTo(Math.sqrt(3) * 18, 9);
        expect(values(r, "node", "labelOffsetY")[0]).toBeCloseTo(((2 - Math.sqrt(3)) * 18) / 2 + 2 + 14 / 6, 9);
        // Database.draw: the label at its top, the top margin (5 by default) down
        expect(values(r, "node", "labelPosition").slice(1, 3)).toEqual(["inside-top", "inside-top"]);
        expect(values(r, "node", "labelOffsetY").slice(1, 3)).toEqual([5, 9]);
        // drawRoundRect caps the radius at half the shorter side itself
        expect(values(r, "node", "cornerRadius").slice(3)).toEqual([12, null]);
    });

    it("reads multi-font markup as its text, with the weight, slant or face every word shares", async () => {
        const html = { multi: "html" };
        const r = await load({
            nodes: [
                { id: "a", label: "<b>Bold</b> plain", font: { multi: true } },
                { id: "b", label: "<b><i>BI</i></b>", font: html },
                { id: "c", label: "*B* _I_ `M`", font: { multi: "markdown" } },
                { id: "d", label: "<code>x &lt; y</code>", font: html },
                { id: "e", label: "<b>raw</b>", font: { multi: false } },
            ],
            edges: [],
            options: { physics: false },
        });
        expect(values(r, "node", "label")).toEqual(["Bold plain", "BI", "B I M", "x < y", "<b>raw</b>"]);
        expect(values(r, "node", "labelWeight")).toEqual([null, "bold", null, null, null]);
        expect(values(r, "node", "labelItalic")).toEqual([null, true, null, null, null]);
        expect(values(r, "node", "labelFont")[3]).toBe("monospace");
    });

    it("draws dashes and border dashes as the line style they draw: round-capped edges, butt-capped borders", async () => {
        const r = await load({
            nodes: [
                { id: "a", borderWidth: 2, shapeProperties: { borderDashes: true } },
                { id: "b", borderWidth: 2, shapeProperties: { borderDashes: [2, 2] } },
            ],
            edges: [
                { from: "a", to: "b", dashes: true },
                // a width longer with its caps, 3.5 is over 1.5 widths: dashed, not dotted
                { from: "a", to: "b", width: 1.5, dashes: [2, 3] },
                { from: "a", to: "b", width: 1.5, dashes: [12, 3, 3, 3] },
                // round caps of width 4.5 close gaps of 5 to 0.5 in 10: solid
                { from: "a", to: "b", width: 4.5, dashes: [5, 5] },
                { from: "a", to: "b", dashes: [0.1, 4] },
                { from: "a", to: "b", dashes: false },
            ],
            options: { physics: false },
        });
        expect(values(r, "node", "borderStyle")).toEqual(["dashed", "dotted"]);
        expect(values(r, "edge", "lineStyle")).toEqual(["dashed", "dashed", "dash-dot", "solid", "dotted", "solid"]);
    });

    it("fades a node's colors by its opacity only where vis-network can: a hex or rgb() color", async () => {
        const r = await load({
            nodes: [
                { id: "a", opacity: 0.3, color: "black" },
                { id: "b", opacity: 0.3, color: { background: "rgb(1,2,3)", border: "rgba(1,2,3,0.5)" } },
            ],
            edges: [],
            options: { physics: false },
        });
        expect(values(r, "node", "opacity")[0]).not.toBe(0.3);
        expect(values(r, "node", "borderOpacity")[0]).not.toBe(0.3);
        expect(values(r, "node", "opacity")[1]).toBe(0.3);
        expect(values(r, "node", "borderOpacity")[1]).not.toBe(0.3);
    });
});

describe("vis-network edge colors", () => {
    it("draws inherit both as a gradient between the end nodes' borders, and an edge's own inherit over a global color", async () => {
        const r = await load({
            nodes: [
                { id: "a", color: { background: "#ffffff", border: "#ff0000" } },
                { id: "b", color: { background: "#ffffff", border: "#0000ff" } },
            ],
            edges: [
                { from: "a", to: "b", color: { inherit: "both" } },
                { from: "a", to: "b", color: { inherit: "from" } },
                { from: "a", to: "b" },
            ],
            options: { edges: { color: { color: "#9467bd", inherit: false } } },
        });
        expect(values(r, "edge", "gradientColors")[0]).toBe("#ff0000 #0000ff");
        expect(values(r, "edge", "gradientKind")[0]).toBe("linear");
        expect(values(r, "edge", "color")).toEqual(["#ff0000", "#ff0000", "#9467bd"]);
    });
});

describe("vis-network labels", () => {
    it("reads font.background, strokeWidth and strokeColor, and draws an edge label on the line, stroked white", async () => {
        const r = await load({
            nodes: [
                {
                    id: "a",
                    x: 0,
                    y: 0,
                    label: "A",
                    font: { background: "#ffd700", strokeWidth: 3, strokeColor: "#ff0000" },
                },
                { id: "b", x: 100, y: 100, label: "B", font: { background: "none" } },
            ],
            edges: [
                { from: "a", to: "b", label: "default" },
                { from: "a", to: "b", label: "top", font: { align: "top", strokeWidth: 0 } },
                { from: "b", to: "a", label: "middle", font: { align: "middle" } },
            ],
            options: { physics: false },
        });
        expect(values(r, "node", "labelBackground")).toEqual(["#ffd700", null]);
        expect(values(r, "node", "labelOutlineColor")[0]).toBe("#ff0000");
        expect(values(r, "node", "labelOutlineWidth")[0]).toBe(3);
        // vis-network's edge font: strokeWidth 2 in #ffffff, on the line unless aligned above or below it
        expect(values(r, "edge", "labelOutlineColor")).toEqual(["#ffffff", "#ffffff", "#ffffff"]);
        expect(values(r, "edge", "labelOutlineWidth")).toEqual([2, 0, 2]);
        expect(values(r, "edge", "labelPosition")).toEqual(["center", "top", "center"]);
        // aligned along the line, turned to read left to right: 45 degrees clockwise either way round
        expect(values(r, "edge", "labelRotation")).toEqual([null, 45, 45]);
    });
});

describe("vis-network options.edges", () => {
    it("draws an options.edges dash array as vis-network's default dashes, an edge's own array as given", async () => {
        const r = await load({
            nodes: [{ id: "a" }, { id: "b" }],
            edges: [
                { from: "a", to: "b" },
                { from: "a", to: "b", dashes: [12, 3, 3, 3] },
            ],
            options: { physics: false, edges: { dashes: [12, 3, 3, 3] } },
        });
        expect(values(r, "edge", "lineStyle")).toEqual(["dashed", "dash-dot"]);
    });
});

/**
 * vis-network 9.1.9's `BezierEdgeStatic._getViaCoordinates`, as it is written there, for the test below to compare
 * graph-io's control points with.
 * @param from - the source node's position
 * @param from.x - its x
 * @param from.y - its y, down
 * @param to - the target node's position
 * @param to.x - its x
 * @param to.y - its y, down
 * @param type - the smooth type
 * @param factor - the roundness
 * @returns the control point
 */
function visNetworkVia(
    from: { x: number; y: number },
    to: { x: number; y: number },
    type: string,
    factor: number,
): [number, number] {
    let dx = Math.abs(from.x - to.x);
    let dy = Math.abs(from.y - to.y);
    if (type === "discrete" || type === "diagonalCross" || type === "continuous") {
        let stepX = dx <= dy ? factor * dy : factor * dx;
        let stepY = stepX;
        if (from.x > to.x) {
            stepX = -stepX;
        }
        if (from.y >= to.y) {
            stepY = -stepY;
        }
        let xVia = from.x + stepX;
        let yVia = from.y + stepY;
        if (type === "discrete") {
            if (dx <= dy) {
                xVia = dx < factor * dy ? from.x : xVia;
            } else {
                yVia = dy < factor * dx ? from.y : yVia;
            }
        } else if (type === "continuous") {
            if (dx <= dy) {
                xVia = from.x <= to.x ? Math.min(xVia, to.x) : Math.max(xVia, to.x);
            } else {
                yVia = from.y >= to.y ? Math.max(yVia, to.y) : Math.min(yVia, to.y);
            }
        }
        return [xVia, yVia];
    }
    if (type === "straightCross") {
        let stepX = (1 - factor) * dx;
        let stepY = (1 - factor) * dy;
        if (dx <= dy) {
            stepX = 0;
            stepY = from.y < to.y ? -stepY : stepY;
        } else {
            stepX = from.x < to.x ? -stepX : stepX;
            stepY = 0;
        }
        return [to.x + stepX, to.y + stepY];
    }
    if (type === "horizontal") {
        return [to.x + (from.x < to.x ? -1 : 1) * (1 - factor) * dx, from.y];
    }
    if (type === "vertical") {
        return [from.x, to.y + (from.y < to.y ? -1 : 1) * (1 - factor) * dy];
    }
    dx = to.x - from.x;
    dy = from.y - to.y;
    const turn = type === "curvedCW" ? factor * 0.5 + 0.5 : -factor * 0.5 + 0.5;
    const angle = (Math.atan2(dy, dx) + turn * Math.PI) % (2 * Math.PI);
    const r = (factor * 0.5 + 0.5) * Math.sqrt(dx * dx + dy * dy);
    return [from.x + r * Math.sin(angle), from.y + r * Math.cos(angle)];
}

describe("vis-network smooth control points", () => {
    it("are vis-network's own for every static type, roundness and direction between the nodes", async () => {
        const types = [
            "continuous",
            "discrete",
            "diagonalCross",
            "straightCross",
            "horizontal",
            "vertical",
            "curvedCW",
            "curvedCCW",
        ];
        const ends = [
            [0, 0, 100, 40],
            [100, 40, 0, 0],
            [0, 0, 30, 90],
            [30, 90, 0, 0],
            [0, 50, 80, 50],
            [0, 0, 0, 70],
            [10, 10, 14, 90],
        ];
        const nodes = ends.flatMap(([x0, y0, x1, y1], k) => [
            { id: `s${String(k)}`, x: x0, y: y0 },
            { id: `t${String(k)}`, x: x1, y: y1 },
        ]);
        const edges = ends.flatMap((_e, k) =>
            types.flatMap((type) =>
                [0.1, 0.5, 0.9].map((roundness) => ({
                    from: `s${String(k)}`,
                    to: `t${String(k)}`,
                    smooth: { type, roundness },
                })),
            ),
        );
        const r = await load({ nodes, edges, options: { physics: false } });
        const bends = values(r, "edge", "bends");
        const round = (v: number): number => Math.round(v * 1e4) / 1e4 || 0;
        let e = 0;
        for (const [x0, y0, x1, y1] of ends) {
            for (const type of types) {
                for (const roundness of [0.1, 0.5, 0.9]) {
                    const [px, py] = visNetworkVia({ x: x0, y: y0 }, { x: x1, y: y1 }, type, roundness);
                    const [dx, dy, qx, qy] = [x1 - x0, y1 - y0, px - x0, py - y0];
                    const l2 = dx * dx + dy * dy;
                    const want = `${String(round((qx * dx + qy * dy) / l2))},${String(round((dy * qx - dx * qy) / l2))}`;
                    expect(bends[e++], `${type} ${String(roundness)} ${String([x0, y0, x1, y1])}`).toBe(want);
                }
            }
        }
    });
});
