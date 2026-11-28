import { assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { pictureOf, undrawnNodes } from "./drawn-invariants";

const SIDE = 40;
const GRAY = [245, 245, 245];
const BLUE = [31, 62, 247];

/**
 * A gray frame with blue discs, bottom row first as WebGL reads it.
 * @param discs - Each disc's center, in CSS pixels from the top left, and radius.
 * @returns The frame.
 */
function frameWith(discs: readonly { x: number; y: number; r: number }[]): {
    pixels: Uint8Array;
    width: number;
    height: number;
} {
    const pixels = new Uint8Array(SIDE * SIDE * 4);
    for (let py = 0; py < SIDE; py++) {
        for (let px = 0; px < SIDE; px++) {
            const y = SIDE - 1 - py;
            const color = discs.some((d) => Math.hypot(px - d.x, y - d.y) <= d.r) ? BLUE : GRAY;
            pixels.set([...color, 255], (py * SIDE + px) * 4);
        }
    }

    return { pixels, width: SIDE, height: SIDE };
}

describe("undrawnNodes", () => {
    it("finds a node drawn where it is placed while another node covers a corner of the canvas", async () => {
        const places = new Map([["a", { x: 20, y: 20 }]]);
        const element = {
            graph: { engine: { getRenderingCanvas: () => null } },
            nodeScreenPosition: (id: string) => places.get(id),
        } as unknown as Graphty;
        // A node pushed past the bottom left corner by a camera move covers it (#10478).
        const picture = pictureOf(
            element,
            frameWith([
                { x: 20, y: 20, r: 4 },
                { x: 0, y: SIDE - 1, r: 6 },
            ]),
        );

        assert.deepEqual(picture.background, GRAY, "the background is the border's color, not the corner's");
        assert.deepEqual(await undrawnNodes(element, ["a"], picture), []);
    });
});
