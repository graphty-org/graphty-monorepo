/**
 * @file The geometry of what is drawn over a node's face: a pie's slices, a striped fill's bands, an
 * image's placement, and the cut of an outline to a box.
 */
import { assert, describe, test } from "vitest";

import {
    boxOf,
    chartPieces,
    clipToBox,
    databaseRim,
    imageBox,
    pieSlices,
    pointLists,
    shapeLinePieces,
    shapePartPieces,
    stripeBands,
} from "../../src/meshes/nodeDecoration";
import { earClip, type Point2 } from "../../src/meshes/shapeOutlines";

const area = (o: readonly Point2[]): number =>
    o.reduce((s, [x0, y0], i) => {
        const [x1, y1] = o[(i + 1) % o.length];
        return s + x0 * y1 - x1 * y0;
    }, 0) / 2;

describe("a pie", () => {
    test("is cut clockwise from 12 o'clock into its shares of a disc of half the shorter side", () => {
        const [a, b] = pieSlices({ colors: "#ff0000 #0000ff", sizes: "0.25 0.75" }, 40, 20);
        // the first quarter is the top right of a disc of radius 10
        const box = boxOf(a.outline);
        assert.approximately(box.x0, 0, 1e-9);
        assert.approximately(box.x1, 10, 1e-9);
        assert.approximately(box.y0, 0, 1e-9);
        assert.approximately(box.y1, 10, 1e-9);
        assert.deepEqual(a.rgb, [1, 0, 0]);
        assert.deepEqual(b.rgb, [0, 0, 1]);
        assert.approximately(area(a.outline), (Math.PI * 100) / 4, 1);
        assert.approximately(area(b.outline), (3 * Math.PI * 100) / 4, 2);
    });

    test("turns by its start angle, shares out what the sizes leave, and stops at a full turn", () => {
        const [a] = pieSlices({ colors: "red", sizes: "0.25", rotation: 90 }, 20, 20);
        // a quarter from 3 o'clock clockwise: the bottom right
        const box = boxOf(a.outline);
        assert.approximately(box.x1, 10, 1e-9);
        assert.approximately(box.y0, -10, 1e-9);
        assert.approximately(box.y1, 0, 1e-9);
        // the unsized slices split what is left; past the whole nothing is drawn
        const shares = pieSlices({ colors: "red green blue", sizes: "0.5" }, 20, 20).map((s) => area(s.outline));
        assert.lengthOf(shares, 3);
        assert.approximately(shares[1], shares[2], 1e-6);
        assert.lengthOf(pieSlices({ colors: "red green", sizes: "1 0.5" }, 20, 20), 1);
    });

    test("with a hole is a ring, and with fitBox fills the node's ellipse", () => {
        const [ring] = pieSlices({ colors: "red", hole: 0.5 }, 20, 20);
        assert.approximately(area(ring.outline), Math.PI * (100 - 25), 1.5);
        const [oval] = pieSlices({ colors: "red", fitBox: true }, 40, 20);
        assert.deepEqual(boxOf(oval.outline), { x0: -20, y0: -10, x1: 20, y1: 10 });
        assert.approximately(pieSlices({ colors: "red", opacities: "0.4" }, 20, 20)[0].opacity, 0.4, 1e-9);
    });

    test("moves its center by its offsets, y down, in the style's units", () => {
        const [moved] = pieSlices({ colors: "red", offsetX: 2, offsetY: 3 }, 20, 20, 1.5);
        assert.deepEqual(boxOf(moved.outline), { x0: -7, y0: -14.5, x1: 13, y1: 5.5 });
    });
});

describe("stripes", () => {
    test("follow one another top to bottom, or left to right, each its share of the box", () => {
        const down = stripeBands({ colors: "red green blue", sizes: "0.3 0.5 0.2" }, 10, 20);
        assert.deepEqual(
            down.map((b) => [b.box.y0, b.box.y1].map((v) => Math.round(v * 1e6) / 1e6)),
            [
                [4, 10],
                [-6, 4],
                [-10, -6],
            ],
        );
        const right = stripeBands({ colors: "red green", direction: "right", size: 0.5 }, 10, 20);
        assert.deepEqual(right[0].box, { x0: -2.5, x1: 0, y0: -5, y1: 5 });
    });
});

describe("an image", () => {
    const natural = { width: 20, height: 10 };
    test("contains, covers, fills or keeps its own size against the node", () => {
        assert.deepEqual(imageBox({}, 40, 40, natural, 1), { x0: -20, y0: -10, x1: 20, y1: 10 });
        assert.deepEqual(imageBox({ fit: "cover" }, 40, 40, natural, 1), { x0: -40, y0: -20, x1: 40, y1: 20 });
        assert.deepEqual(imageBox({ fit: "fill" }, 40, 30, natural, 1), { x0: -20, y0: -15, x1: 20, y1: 15 });
        assert.deepEqual(imageBox({ fit: "none", pixelSize: 1 }, 40, 40, natural, 2), {
            x0: -20,
            y0: -10,
            x1: 20,
            y1: 10,
        });
        // one side given keeps the image's proportions
        assert.deepEqual(imageBox({ fit: "none", width: 10 }, 40, 40, natural, 1), {
            x0: -5,
            y0: -2.5,
            x1: 5,
            y1: 2.5,
        }); // or, with autoSize "natural", is the picture's own pixels on the side left unset (Cytoscape.js `auto`)
        assert.deepEqual(imageBox({ fit: "none", width: 30, autoSize: "natural", pixelSize: 1 }, 40, 40, natural, 1), {
            x0: -15,
            y0: -5,
            x1: 15,
            y1: 5,
        });
        assert.deepEqual(imageBox({ fit: "none", height: 4, autoSize: "natural", pixelSize: 1 }, 40, 40, natural, 1), {
            x0: -10,
            y0: -2,
            x1: 10,
            y1: 2,
        });
    });

    test("is placed across the room the node leaves and moved by its offset, y down", () => {
        assert.deepEqual(imageBox({ fit: "none", pixelSize: 1, positionX: 0, positionY: 0 }, 40, 40, natural, 1), {
            x0: -20,
            y0: 10,
            x1: 0,
            y1: 20,
        });
        assert.deepEqual(imageBox({ fit: "none", pixelSize: 1, offsetX: 3, offsetY: 4 }, 40, 40, natural, 1), {
            x0: -7,
            y0: -9,
            x1: 13,
            y1: 1,
        });
    });
});

describe("cutting an outline to a box", () => {
    test("keeps the part inside, and none of an outline outside it", () => {
        const square: Point2[] = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
        ];
        assert.approximately(area(clipToBox(square, { x0: 0, x1: 5, y0: -Infinity, y1: Infinity })), 2, 1e-12);
        assert.lengthOf(clipToBox(square, { x0: 2, x1: 3, y0: 0, y1: 1 }), 0);
        // a cut along a side leaves only corners, so the band is cut into triangles that cover it
        const band = clipToBox(square, { x0: -Infinity, x1: Infinity, y0: -1, y1: 0 });
        assert.lengthOf(band, 4);
        assert.lengthOf(earClip(band), 2);
    });
});

describe("a database's rim", () => {
    test("is the near half of its top ellipse, in its border's color and width", () => {
        // a 60 x 30 cylinder: its top ellipse is 60 wide and 10 tall, centered 10 above the middle
        const rim = databaseRim({ color: "#2b7ce9", width: 1 }, 60, 30);
        assert.isNotNull(rim);
        const box = boxOf(rim?.outline ?? []);
        assert.approximately(box.x0, -30.5, 1e-9);
        assert.approximately(box.x1, 30.5, 1e-9);
        // from the ellipse's middle down to its lowest point, the line's half width beyond it
        assert.approximately(box.y1, 10, 1e-9);
        assert.approximately(box.y0, 10 - 5 - 0.5, 1e-9);
        assert.deepEqual(rim?.rgb, [0x2b / 255, 0x7c / 255, 0xe9 / 255]);
        assert.strictEqual(rim?.opacity, 1);
        // a band one line wide along half the ellipse (about 62 long)
        assert.isAbove(Math.abs(area(rim?.outline ?? [])), 50);
        assert.isBelow(Math.abs(area(rim?.outline ?? [])), 65);
    });

    test("is not drawn without a border", () => {
        assert.isNull(databaseRim(undefined, 60, 30));
        assert.isNull(databaseRim({ color: "#000000", width: 0 }, 60, 30));
        assert.isNull(databaseRim({ color: "#000000", width: 1, opacity: 0 }, 60, 30));
    });
});

describe("a node's further parts and lines (shape.parts, shape.lines)", () => {
    test("reads lists of points separated by semicolons, dropping a list with a bad pair", () => {
        assert.deepEqual(pointLists("-1,0 1,0; 0,0 0,1 2,2; 1,x 2,2"), [
            [
                [-1, 0],
                [1, 0],
            ],
            [
                [0, 0],
                [0, 1],
                [2, 2],
            ],
        ]);
        assert.deepEqual(pointLists(undefined), []);
    });

    test("draws a line across the node in its border's color, the border's width wide, centered on it", () => {
        const pieces = shapeLinePieces({ lines: "-1,0 1,0" }, { width: 2, color: "#505050" }, 36, 36);
        assert.equal(pieces.length, 1);
        const box = boxOf(pieces[0].outline);
        // from the node's left side to its right, one unit above and below its middle
        assert.deepEqual([box.x0, box.x1, box.y0, box.y1], [-18, 18, -1, 1]);
        assert.deepEqual(pieces[0].rgb, [80 / 255, 80 / 255, 80 / 255]);
        assert.isAbove(area(pieces[0].outline), 0);
    });

    test("draws lines at their own width, and none with no width and no border", () => {
        const wide = shapeLinePieces({ lines: "-1,-1 1,-1", lineWidth: 4 }, { width: 0, color: "#000000" }, 20, 10);
        assert.approximately(boxOf(wide[0].outline).y1 - boxOf(wide[0].outline).y0, 4, 1e-9);
        assert.deepEqual(shapeLinePieces({ lines: "-1,-1 1,-1" }, { color: "#000000" }, 20, 10), []);
    });

    test("closes a line that ends where it starts: a square ring of four sides meeting at their miters", () => {
        const ring = shapeLinePieces(
            { lines: "0.5,0.5 0.5,-0.5 -0.5,-0.5 -0.5,0.5 0.5,0.5" },
            { width: 1, color: "#000000" },
            36,
            36,
        );
        assert.equal(ring.length, 4);
        const all = boxOf(ring.flatMap((p) => p.outline));
        assert.deepEqual([all.x0, all.x1, all.y0, all.y1], [-9.5, 9.5, -9.5, 9.5]);
    });

    test("fills each further part as the node is and outlines it in its border, where its points say", () => {
        const { fills, lines } = shapePartPieces(
            { parts: "-1,-0.5 1,-0.5 1,-0.25 -1,-0.25" },
            { width: 1, color: "#505050" },
            "#c8c8c8",
            24,
            24,
        );
        assert.equal(fills.length, 1);
        assert.deepEqual(boxOf(fills[0].outline), { x0: -12, y0: -6, x1: 12, y1: -3 });
        assert.deepEqual(fills[0].rgb, [200 / 255, 200 / 255, 200 / 255]);
        assert.isAbove(area(fills[0].outline), 0);
        assert.equal(earClip(fills[0].outline).length, 2);
        // its outline is its four sides, half the border's width either side of them
        assert.equal(lines.length, 4);
        assert.deepEqual(boxOf(lines.flatMap((p) => p.outline)), { x0: -12.5, y0: -6.5, x1: 12.5, y1: -2.5 });
    });
});

describe("a chart", () => {
    // Cytoscape 3.10.5's bar chart of 3, 5 and 2 over 0..10 on a 60 node: a plot 52.1 across, bars 16.5 wide from
    // 24.75 left of the middle, the first 15.63 tall (xgmml-specimen-images-charts, bar-grouped)
    const plot = 52.1 / 60;
    const bars = { values: "3 5 2", colors: "#d62728 #2ca02c #1f77b4", min: 0, max: 10, size: plot, margin: 0.025 };

    test("draws a bar per value side by side, up from 0, each in its own color", () => {
        const pieces = chartPieces(bars, 60, 60);
        assert.lengthOf(pieces, 3);
        const [a, b, c] = pieces.map((p) => boxOf(p.outline));
        assert.approximately(a.x0, -24.75, 0.01);
        assert.approximately(a.x1, -8.25, 0.01);
        assert.approximately(c.x1, 24.75, 0.01);
        assert.approximately(a.y0, -26.05, 0.01);
        assert.approximately(a.y1, -26.05 + 15.63, 0.01);
        assert.approximately(b.y1, 0, 0.01);
        assert.deepEqual(pieces[1].rgb, [0x2c / 255, 0xa0 / 255, 0x2c / 255]);
    });

    test("draws its plot in a box of its own width, height and place when it has one", () => {
        // Cytoscape's bar chart with its range and domain axes at label size 10 (xgmml-specimen-images-charts-p7,
        // bar-axis-label-font-size-10): the axes take 16.7 at the left and 15.6 at the bottom of the 52.1 plot, so
        // the bars stand in a box 35.4 wide and 36.5 tall, 8.36 right of the node's middle and 7.82 up (y down)
        const pieces = chartPieces(
            { ...bars, width: 35.375 / 60, height: 36.46 / 60, offsetX: 8.3625, offsetY: -7.82 },
            60,
            60,
        );
        const [a, b, c] = pieces.map((p) => boxOf(p.outline));
        // the left bar from 0.025 of the box in, the bars down on the box's bottom (y up)
        assert.approximately(a.x0, 8.3625 - 35.375 / 2 + 0.025 * 35.375, 1e-6);
        assert.approximately(c.x1, 8.3625 + 35.375 / 2 - 0.025 * 35.375, 1e-6);
        assert.approximately(a.y0, 7.82 - 36.46 / 2, 1e-6);
        assert.approximately(b.y1 - b.y0, 0.5 * 36.46, 1e-6);
        // the offset is in the node's lengths: twice the scale moves the plot twice as far
        const [far] = chartPieces({ ...bars, width: 0.5, height: 0.5, offsetX: 3 }, 60, 60, 2).map((p) =>
            boxOf(p.outline),
        );
        assert.approximately(far.x0, 6 - 15 + 0.025 * 30, 1e-6);
    });

    test("leaves its gap between the bars and lays them across the node when horizontal", () => {
        // cy_separation 0.5: bars 7.82 wide
        const [a, b] = chartPieces({ ...bars, gap: 0.5 }, 60, 60).map((p) => boxOf(p.outline));
        assert.approximately(a.x1 - a.x0, 7.815, 0.01);
        assert.approximately(b.x0 - a.x1, 13.025, 0.01);
        // horizontal: the first bar along the top, 15.63 long from the left
        const [h] = chartPieces({ ...bars, horizontal: true }, 60, 60).map((p) => boxOf(p.outline));
        assert.approximately(h.x0, -26.05, 0.01);
        assert.approximately(h.x1, -10.42, 0.01);
        assert.approximately(h.y1, 24.75, 0.01);
    });

    test("piles the values into one bar, outlines its bars, and draws a bar down from 0 for a value below it", () => {
        const stacked = chartPieces({ ...bars, kind: "stacked-bar" }, 60, 60).map((p) => boxOf(p.outline));
        assert.approximately(stacked[1].y0, stacked[0].y1, 1e-9);
        assert.approximately(stacked[2].y1, -26.05 + 52.1, 0.01);
        const outlined = chartPieces({ ...bars, borderColor: "#404040", borderWidth: 0.125 }, 60, 60);
        // each bar and its four sides, the sides line work rather than pieces of their own
        assert.lengthOf(outlined, 15);
        assert.lengthOf(
            outlined.filter((p) => p.line !== true),
            3,
        );
        const [down] = chartPieces({ ...bars, values: "-3", min: -10 }, 60, 60).map((p) => boxOf(p.outline));
        assert.approximately(down.y1, 0, 1e-9);
        assert.approximately(down.y0, -7.815, 0.01);
    });

    test("draws a line through the values at their categories' middles", () => {
        // Cytoscape's line chart of 2 5 3 8 4: points 10.68 apart from 21.36 left, 2 at 16.58 below the middle
        const pieces = chartPieces(
            {
                kind: "line",
                values: "2 5 3 8 4",
                colors: "#1f77b4",
                min: 0,
                max: 11,
                size: plot,
                margin: -0.0125,
                lineWidth: 0.5,
            },
            60,
            60,
        );
        // one piece a segment, line work all
        assert.lengthOf(pieces, 4);
        assert.isTrue(pieces.every((p) => p.line === true));
        const first = boxOf(pieces[0].outline);
        assert.approximately((first.x0 + first.x1) / 2, (-21.36 - 10.68) / 2, 0.02);
        assert.approximately(Math.min(first.y0, first.y1) + 0.25, -16.58, 0.3);
    });

    test("draws a box from the quartiles with whiskers and its median, and a row of cells", () => {
        const pieces = chartPieces(
            { kind: "box", values: "2 3 4 5 8", colors: "#1f77b4", min: 0, max: 10, size: plot, margin: 0.025 },
            60,
            60,
        );
        const box = pieces.filter((p) => p.line !== true).map((p) => boxOf(p.outline));
        assert.lengthOf(box, 1);
        assert.approximately(box[0].y0, -26.05 + 3 * 5.21, 0.01);
        assert.approximately(box[0].y1, 0, 0.01);
        // two whiskers, two caps and the median, the median black
        assert.lengthOf(
            pieces.filter((p) => p.line === true),
            5,
        );
        assert.deepEqual(pieces.at(-1)?.rgb, [0, 0, 0]);
        const cells = chartPieces(
            { kind: "cells", values: "3 5 2", colors: "#b7cce1 #8cafd2 #ccdae8", horizontal: true },
            60,
            60,
        );
        const [top, , bottom] = cells.map((p) => boxOf(p.outline));
        assert.approximately(top.y1, 30, 1e-9);
        assert.approximately(bottom.y0, -30, 1e-9);
        assert.approximately(top.x1 - top.x0, 60, 1e-9);
    });

    test("draws nothing without values or colors", () => {
        assert.lengthOf(chartPieces(undefined, 60, 60), 0);
        assert.lengthOf(chartPieces({ values: "1 2" }, 60, 60), 0);
        assert.lengthOf(chartPieces({ colors: "#ff0000" }, 60, 60), 0);
    });
});
