/**
 * What Pajek 6.02's SVG export draws for the settings the Pajek specimen pages showed graph-io read otherwise in the
 * third fix round: the diamond's `q`, shapes turned by `phi`, and the hooks `h1` and `h2` a line runs between.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/index.js";
import { resolveStyles } from "../../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Imports a Pajek document with its styles.
 * @param doc - the document
 * @returns a getter of what graphty draws for a property of every element, and the import
 */
async function load(doc: string) {
    const result = await registry.importGraph(doc, { format: "pajek", styles: true, errorLimit: Infinity });
    const { snapshot, styles } = result;
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    const get = (target: "node" | "edge", property: string): readonly unknown[] =>
        resolveStyles(styles, target, property as never, snapshot);
    return { get, result };
}

describe("Pajek outlines (diamond q, phi)", () => {
    it("draws a diamond with its top and bottom cut q wide, past its box for q above 1", async () => {
        // pajek-specimen-node-shapes `q-0-5-diamond`: M -18 0 L -9 18 L 9 18 L 18 0 L 9 -18 L -9 -18 z at size 36;
        // `q-2-diamond` reaches 36 out on each side (73 across with its border)
        const { get } = await load("*Vertices 2\n1 a 0.1 0.1 0.5 diamond q 0.5\n2 b 0.2 0.2 0.5 diamond q 2\n");
        expect(get("node", "shape")).toEqual(["polygon", "polygon"]);
        expect(get("node", "shapePoints")).toEqual([
            "-1,0 -0.5,1 0.5,1 1,0 0.5,-1 -0.5,-1",
            "-1,0 -2,1 2,1 1,0 2,-1 -2,-1",
        ]);
        expect(get("node", "shapePointsStretch")).toEqual([false, false]);
    });

    it("turns a box, a triangle and a diamond phi degrees counterclockwise in their own box", async () => {
        // pajek-specimen-node-shapes `phi-30-box`, `phi-90-triangle`: rotate(-30), rotate(-90) about the center
        const { get } = await load(
            "*Vertices 4\n1 a 0.1 0.1 0.5 box phi 90\n2 b 0.2 0.2 0.5 triangle phi 90\n" +
                "3 c 0.3 0.3 0.5 box x_fact 2 phi 90\n4 d 0.4 0.4 0.5 ellipse phi 30\n",
        );
        expect(get("node", "shape")).toEqual(["polygon", "polygon", "polygon", "ellipse"]);
        const points = get("node", "shapePoints");
        expect(points[0]).toBe("-1,-1 -1,1 1,1 1,-1");
        // the apex, up, turns to the left
        expect(points[1]).toBe("1,1 -1,0 1,-1");
        // 40 wide and 20 tall, turned upright: 20 wide and 40 tall in a box 40 by 20
        expect(points[2]).toBe("-0.5,-2 -0.5,2 0.5,2 0.5,-2");
        // a turned ellipse stays an ellipse, drawn unturned
        expect(points[3]).toBeNull();
    });

    it("writes Pajek's diamond back as the diamond keyword with its q", async () => {
        const { result } = await load("*Vertices 2\n1 a 0.1 0.1 0.5 diamond\n2 b 0.2 0.2 0.5 diamond q 0.5\n");
        const out = await registry.exportGraphToString(result.snapshot, "pajek", {
            styles: result.styles ?? undefined,
        });
        const vertices = out.split("\n").filter((l) => /^\d /.test(l));
        expect(vertices[0]).toMatch(/ diamond(?! q)/);
        expect(vertices[1]).toMatch(/ diamond q 0\.5/);
    });
});

describe("Pajek Bezier arcs", () => {
    it("ends an arc's curve at its arrowhead's back, turned -a2 about where the straight line meets the outline", async () => {
        // pajek-specimen-edges-lines-p2 `route-bezier-opposite-arc` (5 6): M 282 128.5 C 321.37 157.45 307.65 95.38
        // 347.02 124.32, the line to the target 76 long
        const result = await registry.importGraph(
            "*Vertices 2\n1 a 0.235 0.142778 0.5 ellipse x_fact 0.6 y_fact 0.6\n" +
                "2 b 0.298333 0.142778 0.5 ellipse x_fact 0.6 y_fact 0.6\n" +
                "*Arcs\n1 2 1 s 1 a A ap 0 a1 40 k1 1.5 a2 -40 k2 1.5\n",
            { format: "pajek", styles: true, pajekDraw: { width: 1200, height: 900 } },
        );
        if (result.styles === null || result.styles === undefined) {
            throw new Error("no styles");
        }
        const bends = resolveStyles(result.styles, "edge", "bends", result.snapshot)[0] as string;
        const [c1, c2] = bends.split(" ").map((p) => p.split(",").map(Number));
        // (39.37, 28.95) and (25.65, -33.12) from the source, y down, along and to the left of the line
        expect(c1[0]).toBeCloseTo(39.37 / 76, 2);
        expect(c1[1]).toBeCloseTo(-28.95 / 76, 2);
        expect(c2[0]).toBeCloseTo(25.65 / 76, 2);
        expect(c2[1]).toBeCloseTo(33.12 / 76, 2);
        // and runs on to the arrowhead's tip at (350.85, 127.53), (-7.15, -0.97) from the target's center 12 across
        const port = resolveStyles(result.styles, "edge", "targetPort", result.snapshot)[0] as string;
        const [x, y] = port.split(",").map(Number);
        expect(x).toBeCloseTo(-7.15 / 6, 2);
        expect(y).toBeCloseTo(0.97 / 6, 2);
        // the tip stops there, with no gap of its own
        expect(resolveStyles(result.styles, "edge", "targetArrowGap", result.snapshot)[0]).toBeNull();
    });
});

describe("Pajek arcs between the same two vertices", () => {
    it("bows each as a1 15 k1 0.25 a2 15 k2 0.25, the first of two the same way the other way round", async () => {
        // pajek-synth-lines 20 -> 30 and 30 -> 20; pajek-iliad 250 -> 123 twice: a1 -15 and then a1 15; an arc
        // alone, an edge, and an arc that sets its own route are not bowed
        const result = await registry.importGraph(
            "*Vertices 3\n1 a 0.1 0.1\n2 b 0.5 0.1\n3 c 0.5 0.5\n" +
                "*Arcs\n1 2\n2 1\n2 3\n2 3\n1 3\n3 1 a1 30 k1 1\n*Edges\n1 2\n",
            { format: "pajek", styles: true },
        );
        if (result.styles === null || result.styles === undefined) {
            throw new Error("no styles");
        }
        const bends = resolveStyles(result.styles, "edge", "bends", result.snapshot) as (string | null)[];
        const across = (i: number): number | null => {
            const b = bends[i];
            return b === null ? null : Number(b.split(" ")[0].split(",")[1]);
        };
        // a1 15 k1 0.25 measured on the line to the arrowhead's back: the first control point 0.125 out at 15 degrees
        // to the right of the line (y down), a little more of the line between the centers
        expect(across(0)).toBeLessThan(-0.03);
        expect(across(1)).toBeLessThan(-0.03);
        expect(across(2)).toBeGreaterThan(0.03);
        expect(across(3)).toBeLessThan(-0.03);
        expect(across(4)).toBeLessThan(-0.03);
        // its own a1 30 k1 1: 0.5 out at 30 degrees
        expect(across(5)).toBeLessThan(-0.2);
        // the edge, kept as a pair of directed edges, is drawn straight
        expect(bends.slice(6)).toEqual([null, null]);
    });

    it("draws them straight under Straight Lines, as Pajek does (pajek-specimen-edges-lines-p4)", async () => {
        const result = await registry.importGraph("*Vertices 2\n1 a 0.1 0.1\n2 b 0.5 0.1\n*Arcs\n1 2\n2 1\n", {
            format: "pajek",
            styles: true,
            pajekDraw: { ini: { "Form10.StraightLinesOnly1": "" } },
        });
        if (result.styles === null || result.styles === undefined) {
            throw new Error("no styles");
        }
        expect(resolveStyles(result.styles, "edge", "bends", result.snapshot)).toEqual([null, null]);
    });

    it("leaves an arc alone between its two vertices straight", async () => {
        const result = await registry.importGraph("*Vertices 2\n1 a 0.1 0.1\n2 b 0.5 0.1\n*Arcs\n1 2\n", {
            format: "pajek",
            styles: true,
        });
        if (result.styles === null || result.styles === undefined) {
            throw new Error("no styles");
        }
        expect(resolveStyles(result.styles, "edge", "bends", result.snapshot)).toEqual([null]);
    });
});

describe("Pajek arrowhead places", () => {
    it("moves only the arrowhead of the line that sets ap, not the lines after it", async () => {
        // pajek-synth-lines: arc 11 12 after `10 11 ... ap 0.5` has its arrowhead at its target
        const result = await registry.importGraph(
            "*Vertices 3\n1 a 0.1 0.1\n2 b 0.5 0.1\n3 c 0.5 0.5\n*Arcs\n1 2 1 ap 0.5\n2 3\n3 1 ap 0.25\n",
            { format: "pajek", styles: true },
        );
        if (result.styles === null || result.styles === undefined) {
            throw new Error("no styles");
        }
        expect(resolveStyles(result.styles, "edge", "arrowPosition", result.snapshot)).toEqual([0.5, null, 0.25]);
    });

    it("reads ap above 1 as a distance from the target's center, a share of a placed line", async () => {
        // pajek-synth-lines arc 3 4 ap 20: the arrowhead's back 20 px from the target's center; here on a line 200 px
        // long (0.4 of Pajek's 500 px square)
        const result = await registry.importGraph("*Vertices 2\n1 a 0.1 0.1\n2 b 0.5 0.1\n*Arcs\n1 2 1 ap 20\n", {
            format: "pajek",
            styles: true,
        });
        if (result.styles === null || result.styles === undefined) {
            throw new Error("no styles");
        }
        expect(resolveStyles(result.styles, "edge", "arrowPosition", result.snapshot)).toEqual([0.1]);
    });
});

describe("Pajek Dots and negative values", () => {
    it("draws 5 px dashes whatever the width, dots on a wide line, and carries no pattern to the next line", async () => {
        // pajek-synth-lines: arc `12 13` (w 5) and edge `1 8` (w 3, drawn 6 wide) show dots, arc `2 3` (w 1) and
        // `22 23` (w 3) dashes; edge `3 10` after `1 8 ... p Dots` and arc `5 6 -1` after `p Solid` are drawn as if
        // no line before set a pattern
        const { get } = await load(
            "*Vertices 4\n1 a\n2 b\n3 c\n4 d\n*Arcs\n1 2 1 w 5 p Dots\n2 3 1 w 3 p Dots\n3 4 1 p Solid\n4 1 -1\n" +
                "*Edges\n1 3 1 w 3 p Dots\n2 4 1\n",
        );
        // an edge is kept as a pair of directed edges
        expect(get("edge", "lineStyle")).toEqual([
            "dotted",
            "dashed",
            "solid",
            "dashed",
            "dotted",
            "dotted",
            "solid",
            "solid",
        ]);
    });
});

describe("Pajek vertex lines Pajek draws with none of their parameters", () => {
    it("draws a line that starts with s_size, bw or another such key at the defaults, in the shape before it", async () => {
        // pajek-specimen-node-sizes-opacity `s-size-no-shape` (`s_size 2 ic Red` after a box): a box 20 across in
        // #ffd9bc; a line starting `ic` or `x_fact` is read whole (probed in Pajek 6.02, third fix round)
        const { get } = await load(
            "*Vertices 4\n1 a 0.1 0.1 0.5 box x_fact 1.8 ic Gray\n2 b 0.2 0.2 0.5 s_size 2 ic Red\n" +
                "3 c 0.3 0.3 0.5 bw 3 ic Blue y_fact 2\n4 d 0.4 0.4 0.5 ic Red x_fact 2\n",
        );
        expect(get("node", "shape")).toEqual(["rectangle", "rectangle", "rectangle", "ellipse"]);
        expect(get("node", "fill")).toEqual(["#808080", "#ffd9bc", "#ffd9bc", "#ff0000"]);
        expect(get("node", "width")).toEqual([36, 20, 20, 40]);
        expect(get("node", "height")).toEqual([20, 20, 20, 20]);
        expect(get("node", "borderWidth")).toEqual([0.5, 0.5, 0.5, 0.5]);
        expect(get("node", "label")).toEqual(["a", "b", "c", "d"]);
    });
});

describe("Pajek hooks (h1, h2)", () => {
    it("runs a line between the hooks SHAPES.CFG numbers on an ellipse, a box and a cross (an ellipse's)", async () => {
        // pajek-specimen-edges-lines-p2: `h1 90 h2 270` runs from the top of its source to the bottom of its target,
        // `h1 1 h2 1` ends on the far side of the target, `h1 1 h2 100` leaves a box's right side for the top of the
        // next; 0 and -1 are the center and the nearest hook, where graphty runs a line anyway
        const { get } = await load(
            "*Vertices 6\n1 a 0.1 0.1 0.5\n2 b 0.2 0.1 0.5\n3 c 0.1 0.2 0.5 box\n4 d 0.2 0.2 0.5 box\n" +
                "5 e 0.1 0.3 0.5 cross\n6 f 0.2 0.3 0.5\n" +
                "*Edges\n1 2 1 h1 90 h2 270\n1 2 1 h1 1 h2 1\n3 4 1 h1 1 h2 100\n5 6 1 h1 2 h2 -1\n1 2 1 h1 0\n",
        );
        expect(get("edge", "sourcePort")).toEqual(["0,1", "0.9998,0.0175", "1,0.02", "0.9994,0.0349", null]);
        expect(get("edge", "targetPort")).toEqual(["0,-1", "0.9998,0.0175", "0,1", null, null]);
    });
});
