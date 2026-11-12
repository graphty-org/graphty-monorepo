/**
 * The position-matched drawing places each graphty node so its drawing lands where the program drew that node. A
 * glyph drawn above its baseline (Graphviz's proteinstab) draws its center off its position; placing the position
 * where the program drew the glyph's center drew the glyph its rise too far up (dot-specimen-node-shapes@matched).
 */
import { assert, describe, it } from "vitest";

import { fitSimilarity } from "../../../../graph-io/test/fidelity/compare";
import { drawnOffsets } from "./match-positions";
import type { Pt } from "./primitives";

describe("drawnOffsets", () => {
    it("is the rise of a node drawn off its position, and nothing for a node drawn round it", () => {
        const world: Record<string, Pt> = { a: [0, 0], b: [10, 0], c: [0, 10], glyph: [10, 10] };
        // two pixels per world unit, y down
        const toPx = fitSimilarity(
            Object.values(world),
            Object.values(world).map(([x, y]): Pt => [2 * x, -2 * y]),
            { reflect: true },
        );
        assert(toPx, "a frame");
        const drawn = [
            { id: "a", cx: 0, cy: 0 },
            { id: "b", cx: 20, cy: 0 },
            { id: "c", cx: 0, cy: -20 },
            // the planted defect: drawn 9 pixels above its position
            { id: "glyph", cx: 20, cy: -29 },
        ];
        const offsets = drawnOffsets(drawn, (id) => world[id], toPx);
        const [gx, gy] = offsets.get("glyph") ?? [Number.NaN, Number.NaN];
        assert.approximately(gx, 0, 1e-9);
        assert.approximately(gy, -9, 1e-9);
        for (const id of ["a", "b", "c"]) {
            const [x, y] = offsets.get(id) ?? [Number.NaN, Number.NaN];
            assert.approximately(Math.hypot(x, y), 0, 1e-9);
        }
    });
});
