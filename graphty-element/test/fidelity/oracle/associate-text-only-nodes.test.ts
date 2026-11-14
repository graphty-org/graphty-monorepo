/**
 * A node the program draws as its words alone is a text-only node on its side, as graphty's are (#706): Graphviz draws
 * an unfilled `plain`, `plaintext` or `none` node as a `<g class="node">` holding one `<text>` and nothing else
 * (dot-real-happiness `c`, dot-real-linux-kernel `LKD` and `bottom`). Read as a node with no body, it failed
 * `node.present` against graphty's label-only node, which the comparison reads as its words; two drawings of the same
 * words differed only in how each was read.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { facelessAsTexts } from "./compare-oracle";
import { type Prim, type PScene, type PText } from "./primitives";

const words = (content: string, x: number, y: number): PText => ({
    content,
    x,
    y,
    box: { x0: x - 40, y0: y - 6, x1: x + 40, y1: y + 6 },
    sizePx: 12,
    family: "Helvetica",
    weight: 400,
    style: "normal",
    anchor: "middle",
    rotation: 0,
    color: "#000000",
    opacity: 1,
});

/**
 * A primitive the markup names as part of a node.
 * @param index - its drawing order
 * @param id - the node
 * @param over - what it is
 * @returns the primitive
 */
function named(index: number, id: string, over: Partial<Prim>): Prim {
    return {
        index,
        tag: "polygon",
        kind: "shape",
        box: { x0: 0, y0: 0, x1: 0, y1: 0 },
        points: [],
        closed: true,
        corners: 4,
        fill: null,
        stroke: null,
        text: null,
        markers: { start: false, end: false },
        hint: { role: "node", id, key: id },
        ...over,
    };
}

const empty = (side: "oracle" | "graphty"): PScene => ({
    side,
    width: 600,
    height: 400,
    background: "#ffffff",
    nodes: [],
    edges: [],
    groups: [],
    texts: [],
    strays: [],
});

describe("a node drawn as its words alone", () => {
    const text = words("(c) 2020 someone", 300, 380);
    const box = { x0: 80, y0: 80, x1: 120, y1: 120 };
    const prims: Prim[] = [
        named(0, "a", {
            box,
            points: [
                [80, 80],
                [120, 80],
                [120, 120],
                [80, 120],
                [80, 80],
            ],
            fill: { color: "#ff0000", opacity: 1, gradient: null },
        }),
        named(1, "c", { tag: "text", kind: "text", box: text.box, text }),
    ];

    it("is its words, not a node, where graphty draws no node for it", () => {
        const { scene } = associate(prims, 600, 400, empty("graphty"));
        const c = scene.nodes.find((n) => n.id === "c");
        assert.deepEqual(
            c?.faceless?.map((t) => t.content),
            [text.content],
        );
        assert.isUndefined(scene.nodes.find((n) => n.id === "a")?.faceless, "a node with a body is a node");
        const read = facelessAsTexts(scene, empty("graphty"));
        assert.deepEqual(
            read.nodes.map((n) => n.id),
            ["a"],
        );
        assert.deepEqual(
            read.texts.map((t) => t.content),
            [text.content],
        );
    });

    it("stays a node where graphty draws one there", () => {
        const { scene } = associate(prims, 600, 400, empty("graphty"));
        const graphty = {
            ...empty("graphty"),
            nodes: [
                {
                    id: "c",
                    cx: 300,
                    cy: 380,
                    w: 80,
                    h: 12,
                    shape: "rect" as const,
                    fill: null,
                    stroke: null,
                    label: null,
                },
            ],
        };
        assert.deepEqual(
            facelessAsTexts(scene, graphty).nodes.map((n) => n.id),
            ["a", "c"],
        );
    });
});
