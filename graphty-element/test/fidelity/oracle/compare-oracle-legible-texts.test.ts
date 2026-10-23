/**
 * Free texts on the oracle's side under one render pixel: no text to a reader, as graphty's alike are dropped.
 */
import { assert, describe, it } from "vitest";

import { compareOracle } from "./compare-oracle";
import type { PScene, PText } from "./primitives";

/**
 * A text at a point.
 * @param content - its words
 * @param x - center x
 * @param y - center y
 * @param size - its font size in pixels
 * @returns the text
 */
function text(content: string, x: number, y: number, size: number): PText {
    return {
        content,
        x,
        y,
        box: { x0: x - size, y0: y - size / 2, x1: x + size, y1: y + size / 2 },
        sizePx: size,
        family: "Helvetica",
        weight: 400,
        style: "normal",
        anchor: "middle",
        rotation: 0,
        color: "#000000",
        opacity: 1,
    };
}

/**
 * Three labeled nodes, the same on both sides.
 * @param side - which side
 * @returns the scene
 */
function scene(side: "oracle" | "graphty"): PScene {
    const node = (id: string, cx: number, cy: number): PScene["nodes"][number] => ({
        id,
        cx,
        cy,
        w: 40,
        h: 40,
        shape: "ellipse",
        fill: { color: "#ff0000", opacity: 1, gradient: null },
        stroke: null,
        label: text(id, cx, cy, 12),
    });
    return {
        side,
        width: 800,
        height: 600,
        background: "#ffffff",
        nodes: [node("a", 100, 100), node("b", 500, 100), node("c", 300, 400)],
        edges: [],
        groups: [],
        texts: [],
        strays: [],
    };
}

describe("free texts too small to read", () => {
    it("judges no oracle text under one render pixel, as no graphty text that small is drawn", () => {
        // cx-ddram: Cytoscape draws the further lines of node 6907's wrapped label at 0.15 px; the association drops
        // the first line with its node and left the others as free text graphty could never match
        const o = { ...scene("oracle"), texts: [text("DBN", 300, 250, 0.147), text("Seen", 600, 500, 12)] };
        const r = compareOracle("t", o, scene("graphty"));
        assert.deepEqual(r.failures["stray.present"], ["text#0"]);
        assert.strictEqual(r.properties["stray.present"].n, 1);
    });
});
