/**
 * How big a node that grows to hold its label is drawn (`shape.labelFit`): its least size, its
 * padded label box, and Graphviz's rules for fitting a box inside an ellipse or a polygon.
 */
import { assert, describe, it } from "vitest";

import { labelFitExtent } from "../../src/meshes/labelFit";

const box = { width: 10, height: 2 };

describe("labelFitExtent", () => {
    it("leaves a node that states no fit at its own size", () => {
        assert.isNull(labelFitExtent({ type: "ellipse", width: 3, height: 1 }, box));
        assert.isNull(labelFitExtent(undefined, box));
    });

    it("makes the padded box the node's bounds, at least its own width and height", () => {
        const shape = { type: "ellipse" as const, labelFit: "bounds" as const, labelPaddingX: 1, labelPaddingY: 0.5 };
        assert.deepEqual(labelFitExtent({ ...shape, width: 4, height: 4 }, box), { width: 12, height: 4 });
        // no width or height of its own: the size is the least
        assert.deepEqual(labelFitExtent({ ...shape, size: 0 }, box), { width: 12, height: 3 });
        // a square stays as wide as it is tall
        assert.deepEqual(labelFitExtent({ ...shape, size: 0, labelFitSquare: true }, box), { width: 12, height: 12 });
    });

    it("fits the padded box inside a box-shaped node as its bounds", () => {
        const fitted = labelFitExtent({ type: "rectangle", labelFit: "inside", labelPaddingX: 1, size: 0 }, box);
        assert.deepEqual(fitted, { width: 12, height: 2 });
        // a bodiless node keeps its box, as Graphviz's shape=none does
        assert.deepEqual(labelFitExtent({ type: "none", labelFit: "inside", labelPaddingX: 1, size: 0 }, box), {
            width: 12,
            height: 2,
        });
    });

    it("grows an ellipse by the square root of 2 around the box, as Graphviz does", () => {
        const fitted = labelFitExtent({ type: "ellipse", labelFit: "inside", width: 1, height: 1 }, box);
        assert.closeTo(fitted?.width ?? 0, 10 * Math.SQRT2, 1e-9);
        assert.closeTo(fitted?.height ?? 0, 2 * Math.SQRT2, 1e-9);
    });

    it("keeps an ellipse at its own height when that is tall enough, and widens it through the box's corners", () => {
        const fitted = labelFitExtent({ type: "ellipse", labelFit: "inside", width: 1, height: 4 }, box);
        // (5 / a)^2 + (1 / 2)^2 = 1
        assert.closeTo(fitted?.width ?? 0, 10 / Math.sqrt(1 - (2 / 4) ** 2), 1e-9);
        assert.equal(fitted?.height, 4);
    });

    it("reaches a polygon out by 1 / cos(pi / sides) past the ellipse", () => {
        const diamond = labelFitExtent({ type: "diamond", labelFit: "inside", size: 0 }, box);
        assert.closeTo(diamond?.width ?? 0, 10 * Math.SQRT2 * Math.SQRT2, 1e-9);
        const hexagon = labelFitExtent({ type: "hexagon", labelFit: "inside", size: 0 }, box);
        assert.closeTo(hexagon?.width ?? 0, (10 * Math.SQRT2) / Math.cos(Math.PI / 6), 1e-9);
    });

    it("counts a polygon's corners as its sides and grows it as far as its corners reach past its box", () => {
        // a square's corners reach the box's corners: four sides, no further reach
        const square = labelFitExtent(
            { type: "polygon", points: "1,1 -1,1 -1,-1 1,-1", labelFit: "inside", size: 0 },
            box,
        );
        assert.closeTo(square?.width ?? 0, 10 * Math.SQRT2 * Math.SQRT2, 1e-9);
        // corners reaching 1.5 across and 2 up make it that much larger, at least its own size
        const reaching = labelFitExtent(
            { type: "polygon", points: "1.5,0 0,2 -1,0 0,-1", labelFit: "inside", width: 54, height: 36 },
            box,
        );
        assert.closeTo(reaching?.width ?? 0, 54 * 1.5, 1e-9);
        assert.closeTo(reaching?.height ?? 0, 36 * 2, 1e-9);
    });

    it("never shrinks a node below its own size for a short label", () => {
        assert.deepEqual(labelFitExtent({ type: "ellipse", labelFit: "inside", width: 54, height: 36 }, box), {
            width: 54,
            height: 36,
        });
    });
});
