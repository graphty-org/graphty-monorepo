/**
 * A long label a program sets from its node's middle outward: Cytoscape desktop draws cx2-signor-aml's small-molecule
 * squares (18 px) with the words starting under the node, so "prostaglandin E2(1-)" (126 px wide) has its middle 63 px
 * from node 41's. Reached by the words' middle, they were out of the 60 px a small node reaches and were read as a
 * free text, and the node as unlabeled (label.present failed on 41 and 7). Reached by the words' nearest edge, they are
 * the node's.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { type PNode, type Prim, type PScene, type PText } from "./primitives";

const square = (index: number, id: string, cx: number, cy: number): Prim => {
    const r = 9;
    const points: [number, number][] = [
        [cx - r, cy - r],
        [cx + r, cy - r],
        [cx + r, cy + r],
        [cx - r, cy + r],
        [cx - r, cy - r],
    ];
    return {
        index,
        tag: "path",
        kind: "shape",
        points,
        box: { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r },
        closed: true,
        corners: 4,
        fill: { color: "#ffcc00", opacity: 1, gradient: null },
        stroke: null,
        text: null,
        markers: { start: false, end: false },
        hint: { role: "node", id, key: id },
    };
};
const words = (content: string, x0: number, y0: number, width: number): PText => ({
    content,
    x: x0,
    y: y0 + 11,
    box: { x0, y0, x1: x0 + width, y1: y0 + 14 },
    sizePx: 12,
    family: "Helvetica",
    weight: 400,
    style: "normal",
    anchor: "start",
    rotation: 0,
    color: "#262626",
    opacity: 1,
});
const text = (index: number, t: PText): Prim => ({
    index,
    tag: "text",
    kind: "text",
    points: [],
    box: t.box,
    closed: false,
    corners: 0,
    fill: null,
    stroke: null,
    text: t,
    markers: { start: false, end: false },
    hint: null,
});
const guideNode = (id: string, cx: number, cy: number, label: PText): PNode => ({
    id,
    cx,
    cy,
    w: 18,
    h: 18,
    shape: "rect",
    fill: { color: "#ffcc00", opacity: 1, gradient: null },
    stroke: null,
    label,
});
const guide = (nodes: PNode[]): PScene => ({
    side: "graphty",
    width: 600,
    height: 400,
    background: "#ffffff",
    nodes,
    edges: [],
    groups: [],
    texts: [],
    strays: [],
});

describe("a long label set from its node's middle outward", () => {
    it("is the node's, though the words' middle lies farther than a small node reaches", () => {
        const long = words("prostaglandin E2(1-)", 133, 110, 126);
        const prims = [square(0, "41", 135, 100), text(1, long)];
        const { scene } = associate(prims, 600, 400, guide([guideNode("41", 135, 100, long)]));
        assert.strictEqual(scene.nodes.find((n) => n.id === "41")?.label?.content, "prostaglandin E2(1-)");
    });

    it("stays a free text where even its nearest edge is out of reach", () => {
        const far = words("prostaglandin E2(1-)", 233, 110, 126);
        const prims = [square(0, "41", 135, 100), text(1, far)];
        const { scene } = associate(prims, 600, 400, guide([guideNode("41", 135, 100, far)]));
        assert.isNull(scene.nodes.find((n) => n.id === "41")?.label ?? null);
    });
});
