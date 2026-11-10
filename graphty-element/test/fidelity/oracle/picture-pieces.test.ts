/**
 * A program's picture read as a reader sees it: by the pixels it paints, not its PNG's transparent edges (yEd's soft
 * shadow PNG is as wide as the node and its labels), and as one picture where the program draws it in pieces laid
 * edge to edge (yEd's nine-slice shadows), and a shadow under a node as no part of the node.
 */
import { assert, describe, it } from "vitest";

import { underlaysOf } from "./associate";
import type { Pixels } from "./picture-gradient";
import type { PBox, Prim } from "./primitives";
import { inkedPart, joinedPictures } from "./svg-primitives";

/**
 * A picture transparent but for one block.
 * @param w - its width
 * @param h - its height
 * @param block - the block that paints, [x0, y0, x1, y1] in pixels
 * @returns the pixels
 */
function picture(w: number, h: number, block: [number, number, number, number]): Pixels {
    const data = new Uint8ClampedArray(4 * w * h);
    for (let y = block[1]; y < block[3]; y++) {
        for (let x = block[0]; x < block[2]; x++) {
            data[4 * (y * w + x) + 3] = 75;
        }
    }
    return { width: w, height: h, data };
}

const image = (index: number, box: PBox): Prim => ({
    index,
    tag: "image",
    kind: "image",
    box,
    points: [],
    closed: true,
    corners: 4,
    fill: null,
    stroke: null,
    text: null,
    markers: { start: false, end: false },
    hint: null,
});

describe("the pictures in an oracle drawing", () => {
    it("are where their pixels paint, not their PNGs' transparent edges", () => {
        // graphml-galaxy-lcms-workflow: a 113 by 76 shadow PNG painting columns 6 to 48 and rows 6 to 69
        const shadow = picture(113, 76, [6, 6, 49, 70]);
        assert.deepEqual(inkedPart(shadow, { x: 100, y: 200, width: 113, height: 76 }, true), {
            x: 106,
            y: 206,
            width: 43,
            height: 64,
        });
        // drawn at half size, stretched
        assert.deepEqual(inkedPart(shadow, { x: 0, y: 0, width: 56.5, height: 38 }, true), {
            x: 3,
            y: 3,
            width: 21.5,
            height: 32,
        });
    });

    it("are left whole where the pixels are not stretched over a box of other proportions, or paint everywhere", () => {
        const shadow = picture(113, 76, [6, 6, 49, 70]);
        assert.isNull(inkedPart(shadow, { x: 0, y: 0, width: 100, height: 100 }, false));
        assert.isNull(inkedPart(picture(4, 4, [0, 0, 4, 4]), { x: 0, y: 0, width: 4, height: 4 }, true));
    });

    it("read a picture drawn in pieces edge to edge as one, over the parts its pieces paint", () => {
        // yed-graphml-specimen-node-shapes-p2, BevelNode3's shadow: eight pieces round its middle
        const xs = [783, 815, 839, 871];
        const ys = [769.444, 801.444, 805.444, 837.444];
        const cells = [
            [0, 0],
            [1, 0],
            [2, 0],
            [0, 1],
            [2, 1],
            [0, 2],
            [1, 2],
            [2, 2],
        ];
        const wholes = new Map<number, PBox>();
        const prims = cells.map(([i, j], k) => {
            const whole = { x0: xs[i], y0: ys[j], x1: xs[i + 1], y1: ys[j + 1] };
            wholes.set(k, whole);
            // each piece paints only toward the middle
            return image(k, {
                x0: i === 0 ? whole.x0 + 13 : whole.x0,
                y0: j === 0 ? whole.y0 + 12 : whole.y0,
                x1: i === 2 ? whole.x0 + 20 : whole.x1,
                y1: j === 2 ? whole.y0 + 20 : whole.y1,
            });
        });
        const read = joinedPictures(prims, wholes);
        assert.strictEqual(read.length, 1);
        assert.deepEqual(read[0].box, { x0: 796, y0: 781.444, x1: 859, y1: 825.444 });
    });

    it("keep pictures apart that are not edge to edge, lie over one another, or have a shape between them", () => {
        const a = { x0: 0, y0: 0, x1: 10, y1: 10 };
        const apart = { x0: 11, y0: 0, x1: 20, y1: 10 };
        const overlapping = { x0: 5, y0: 0, x1: 15, y1: 10 };
        const besideA = { x0: 10, y0: 0, x1: 20, y1: 10 };
        const read = (boxes: PBox[], between = false): number => {
            const wholes = new Map(boxes.map((b, i): [number, PBox] => [i, b]));
            const prims = boxes.map((b, i) => image(i, b));
            if (between) {
                prims.splice(1, 0, { ...image(99, a), kind: "shape", tag: "rect" });
            }
            return joinedPictures(prims, wholes).length;
        };
        assert.strictEqual(read([a, apart]), 2);
        assert.strictEqual(read([a, overlapping]), 2);
        assert.strictEqual(read([a, besideA]), 1);
        assert.strictEqual(read([a, besideA], true), 3);
        // corners first, then the side between them (yEd Live's order): one picture
        const farRight = { x0: 20, y0: 0, x1: 30, y1: 10 };
        assert.strictEqual(read([a, farRight, besideA]), 1);
    });
});

describe("a shadow under a node", () => {
    const rect = (index: number, box: PBox, color: string, opacity = 1): Prim => ({
        ...image(index, box),
        kind: "shape",
        tag: "rect",
        fill: { color, opacity, gradient: null },
    });
    const node = { x0: 1002, y0: 600, x1: 1038, y1: 636 };

    it("is a hard copy of the node's box in a color of its own, drawn before it and off its spot (y:DropShadow)", () => {
        const shadow = rect(0, { x0: 1006, y0: 604, x1: 1042, y1: 640 }, "#b3a691");
        assert.deepEqual([...underlaysOf([shadow, rect(1, node, "#c8c8c8")])], [shadow]);
    });

    it("is a picture about the node's size the node mostly covers (a soft shadow)", () => {
        // yed-graphml-specimen-node-shapes-p2: the 56 by 36 entity at 1020,509 and the shadow PNG's painted part
        const shadow = image(0, { x0: 1018, y0: 507, x1: 1082, y1: 552 });
        const body = rect(1, { x0: 1020, y0: 509, x1: 1076, y1: 545 }, "#c8c8c8");
        assert.deepEqual([...underlaysOf([shadow, body])], [shadow]);
        // a picture drawn over the node, or a far larger one, is no shadow
        assert.strictEqual(underlaysOf([body, { ...shadow, index: 2 }]).size, 0);
        assert.strictEqual(underlaysOf([image(0, { x0: 900, y0: 400, x1: 1200, y1: 700 }), body]).size, 0);
    });

    it("is never a piece beside the node's others, or a see-through copy", () => {
        const left = rect(0, { x0: 80, y0: 80, x1: 93.33, y1: 120 }, "#e41a1c");
        const middle = rect(1, { x0: 93.33, y0: 80, x1: 106.68, y1: 120 }, "#4daf4a");
        assert.strictEqual(underlaysOf([left, middle]).size, 0);
        const seeThrough = rect(0, { x0: 1006, y0: 604, x1: 1042, y1: 640 }, "#00ff00", 0.4);
        assert.strictEqual(underlaysOf([seeThrough, rect(1, node, "#c8c8c8")]).size, 0);
    });
});
