/**
 * What yEd's special nodes draw, read right: two outlines wound alike in one filled path are a disc, no ring (an
 * intermediate BPMN event, a transaction), and a curved outline with a corner on its box's corner is no rounded
 * rectangle (a delay), while a real ring and a real rounded rectangle still read as they did.
 */
import { assert, describe, it } from "vitest";

import { polygonClassOf } from "../extract-scene";
import { shapeOf } from "./associate";
import { outlinePaintedAsFill, type Prim, type Pt, solidOuter } from "./primitives";
import { hasSquareCorner, straightPathVertices } from "./svg-primitives";

const circle = (r: number, turn: 1 | -1): Pt[] =>
    Array.from({ length: 64 }, (_, i): Pt => {
        const t = (turn * 2 * Math.PI * i) / 64;
        return [50 + r * Math.cos(t), 50 + r * Math.sin(t)];
    });

/**
 * A closed curved outline as the reader gives it: points along a box's sides, none at its corners.
 * @param squareCorner - what the reader said of its corners
 * @returns the primitive
 */
function roundedBox(squareCorner: boolean): Prim {
    const points: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
        points.push([5 + 4.5 * i, 0]);
    }
    for (let i = 0; i <= 20; i++) {
        points.push([100, 5 + 2 * i]);
    }
    for (let i = 0; i <= 20; i++) {
        points.push([95 - 4.5 * i, 50]);
    }
    for (let i = 0; i <= 20; i++) {
        points.push([0, 45 - 2 * i]);
    }
    return {
        tag: "path",
        corners: 0,
        points,
        box: { x0: 0, y0: 0, x1: 100, y1: 50 },
        ...(squareCorner ? { squareCorner } : {}),
    } as unknown as Prim;
}

describe("yEd's special outlines", () => {
    it("reads two nested outlines wound alike under the nonzero rule as a disc", () => {
        const outer = circle(40, 1);
        const paths = [outer, circle(35, 1)];
        assert.strictEqual(solidOuter(paths), outer);
        assert.isNull(outlinePaintedAsFill(paths, true));
    });

    it("still reads a zigzag's ring, whatever its areas say of its winding", () => {
        const zigzag = (r: number): Pt[] =>
            Array.from({ length: 96 }, (_, i): Pt => {
                const t = (2 * Math.PI * i) / 96;
                const swing = i % 2 === 0 ? 3 : -3;
                return [50 + (r + swing) * Math.cos(t), 50 + (r + swing) * Math.sin(t)];
            });
        assert.isNull(solidOuter([zigzag(40), zigzag(30)]));
    });

    it("still reads a ring where the outlines are wound apart, or the rule is evenodd", () => {
        const opposite = [circle(40, 1), circle(35, -1)];
        assert.isNull(solidOuter(opposite));
        assert.isNotNull(outlinePaintedAsFill(opposite, true));
        assert.isNotNull(outlinePaintedAsFill([circle(40, 1), circle(35, 1)]));
    });

    it("finds a corner on the box's corner, and none on a rounded rectangle or a display", () => {
        const box = { x: 124, y: 418, width: 56, height: 36 };
        assert.isTrue(hasSquareCorner("M124 418 L175.5 418 Q184.5 436 175.5 454 L124 454 Z", box));
        const rounded =
            "M127 418 L177 418 Q180 418 180 421 L180 451 Q180 454 177 454 L127 454 Q124 454 124 451 L124 421 Q124 418 127 418 Z";
        assert.isFalse(hasSquareCorner(rounded, box));
        assert.isFalse(
            hasSquareCorner(
                "M124 436 Q128.5 422.5 142 418 L175.5 418 Q184.5 436 175.5 454 L142 454 Q128.5 449.5 124 436",
                box,
            ),
        );
    });

    it("leaves a box whose rounding of 0 puts a curve at every corner as it was", () => {
        const box = { x: 0, y: 0, width: 10, height: 10 };
        assert.isFalse(hasSquareCorner("M0 0 Q0 0 0 0 L10 0 Q10 0 10 0 L10 10 Q10 10 10 10 L0 10 Q0 10 0 10 Z", box));
    });

    it("classes a curved outline with a square corner as no rounded rectangle", () => {
        assert.strictEqual(shapeOf(roundedBox(false)), "roundrect");
        assert.strictEqual(shapeOf(roundedBox(true)), "other");
    });

    it("classes graphty's polygon of a curve by the same rule, and a wrong plain box stays a rectangle", () => {
        const bulge = Array.from({ length: 13 }, (_, i) => {
            const t = -Math.PI / 2 + (Math.PI * i) / 12;
            return `${String(0.9 + 0.1 * Math.cos(t))},${String(Math.sin(t))}`;
        });
        const rounded = [
            ...bulge,
            ...bulge.map((p) =>
                p
                    .split(",")
                    .map((v) => -Number(v))
                    .join(","),
            ),
        ].join(" ");
        assert.strictEqual(polygonClassOf(rounded), "roundrect");
        // a delay: two corners on its box
        assert.strictEqual(polygonClassOf(["-1,-1", ...bulge, "-1,1"].join(" ")), "other");
        assert.strictEqual(polygonClassOf("1,1 -1,1 -1,-1 1,-1"), "rect");
    });

    it("keeps a vertex whose x has an exponent: yEd Live's down arrow is 56 x 32, its tip at the bottom", () => {
        // yed-live-graphml-specimen-node-shapes arrow-node-direction-down, as yEd Live writes it
        const down =
            "M 9.333333333333332,-11.999999999999996 L 28,-11.999999999999996 L 3.552713678800501e-15,16 " +
            "L -28,-11.999999999999993 L -9.333333333333329,-11.999999999999993 L -9.333333333333329,-15.999999999999998 " +
            "L 9.333333333333332,-15.999999999999998 Z";
        const pts = straightPathVertices(down) ?? [];
        assert.lengthOf(pts, 8);
        const ys = pts.map(([, y]) => y);
        assert.closeTo(Math.max(...ys) - Math.min(...ys), 32, 1e-9);
        assert.deepEqual(pts[2], [3.552713678800501e-15, 16]);
    });

    it("still reads a body that really is 56 x 4 as 56 x 4", () => {
        const pts = straightPathVertices("M -28,-16 L 28,-16 L 28,-12 L -28,-12 Z") ?? [];
        const ys = pts.map(([, y]) => y);
        const xs = pts.map(([x]) => x);
        assert.strictEqual(Math.max(...ys) - Math.min(...ys), 4);
        assert.strictEqual(Math.max(...xs) - Math.min(...xs), 56);
    });
});
