/**
 * How the oracle comparison reads yEd heads at gml-synthetic-coverage's crowded and cornered ends (#8189): a head drawn
 * right after its line's stroked arms at the other end is that line's, though another line ends nearer it at the same
 * node (23->33 under 11->33); and a head whose line turns a corner under it, into a short last leg, is read along that
 * leg, as yEd aims it (39->50's white diamond, graphty's head on 19->30 past a corner rounded in small steps). Each
 * reading comes with the drawing it must still read the old way.
 */
import { assert, describe, it } from "vitest";

import { associate, extendToTip, measureArrow } from "./associate";
import { boxOfPoints, type PEdge, type PNode, type Prim, type PScene, type Pt } from "./primitives";

const disc = (cx: number, cy: number, r: number): Pt[] =>
    Array.from({ length: 32 }, (_, i): Pt => [
        cx + r * Math.cos((i * Math.PI) / 16),
        cy + r * Math.sin((i * Math.PI) / 16),
    ]);
const node = (id: string, cx: number, cy: number, size: number): PNode => ({
    id,
    cx,
    cy,
    w: size,
    h: size,
    shape: "ellipse",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
});
const edge = (id: string, source: string, target: string): PEdge => ({
    id,
    source,
    target,
    points: [],
    stroke: { color: "#404040", opacity: 1, width: 1, dash: null, dashClass: "solid" },
    arrows: [],
    label: null,
});

describe("a head drawn after its line's stroked arms", () => {
    /**
     * Two lines down one column into t's top: s->t (green), its convex source arms, its filled target head; then u->t
     * (pale), drawn along the same column from above and ending under the middle of s->t's head, nearer it than s->t's end.
     * @param armColor - the color the source arms are drawn in
     * @returns the oracle scene
     */
    function read(armColor: string): PScene {
        let index = 0;
        const prim = (over: Partial<Prim> & { points: Pt[] }): Prim => ({
            index: index++,
            tag: "path",
            kind: "shape",
            box: boxOfPoints(over.points),
            closed: true,
            corners: 0,
            fill: { color: "#cccccc", opacity: 1, gradient: null },
            stroke: null,
            text: null,
            markers: { start: false, end: false },
            hint: null,
            ...over,
        });
        const stroke = (color: string, points: Pt[]): Prim =>
            prim({
                kind: "path",
                closed: false,
                points,
                fill: null,
                stroke: { color, opacity: 1, width: 1, dash: null, dashClass: "solid" },
            });
        const green = "#00cc99";
        const prims = [
            prim({ tag: "ellipse", points: disc(110, 180, 20) }),
            prim({ tag: "ellipse", points: disc(110, 270, 15) }),
            prim({ tag: "ellipse", points: disc(300, 60, 20) }),
            stroke(green, [
                [110, 203.4],
                [110, 245],
                [110, 245],
                [110, 246],
            ]),
            stroke(armColor, [
                [110, 200],
                [104.4, 212.4],
            ]),
            stroke(armColor, [
                [110, 200],
                [115.6, 212.4],
            ]),
            prim({
                points: [
                    [110, 255],
                    [115.6, 241.5],
                    [110, 244.9],
                    [104.4, 241.5],
                ],
                corners: 4,
                fill: { color: green, opacity: 1, gradient: null },
            }),
            stroke("#e8eef7", [
                [300, 80],
                [300, 155],
                [110, 155],
                [110, 247.5],
            ]),
        ];
        const g: PScene = {
            side: "graphty",
            width: 400,
            height: 300,
            background: "#ffffff",
            nodes: [node("s", 110, 180, 40), node("t", 110, 270, 30), node("u", 300, 60, 40)],
            edges: [edge("e1", "s", "t"), edge("e2", "u", "t")],
            groups: [],
            texts: [],
            strays: [],
        };
        return associate(prims, 400, 300, g).scene;
    }
    const targetHeads = (o: PScene, source: string): string[] =>
        o.edges
            .filter((e) => e.source === source && e.target === "t")
            .flatMap((e) => e.arrows.filter((a) => a.end === "target").map((a) => a.color ?? ""));

    it("caps its own line, past the arms in the line's color", () => {
        const o = read("#00cc99");
        assert.deepEqual(targetHeads(o, "s"), ["#00cc99"]);
        assert.deepEqual(targetHeads(o, "u"), []);
    });

    it("goes by the nearest end where the strokes after the line are in another color", () => {
        const o = read("#ff0000");
        assert.deepEqual(targetHeads(o, "s"), []);
        assert.deepEqual(targetHeads(o, "u"), ["#00cc99"]);
    });
});

describe("a head over a corner into a short last leg", () => {
    // yEd's white diamond, 17.5 long and 12.5 wide, its tip on the node's top at y = 110, over the line's corner
    const diamond: Pt[] = [
        [100, 110],
        [93.75, 101.25],
        [100, 92.5],
        [106.25, 101.25],
    ];

    it("is read along the leg past a sharp corner", () => {
        const line: Pt[] = [
            [0, 100],
            [100, 100],
            [100, 101.25],
        ];
        const head = measureArrow(diamond, line, "target", { filled: true, color: null });
        assert.closeTo(head.length, 17.5, 0.01);
        assert.closeTo(head.width, 12.5, 0.01);
        const end = extendToTip(line, diamond, "target").at(-1) ?? [0, 0];
        assert.closeTo(end[0], 100, 0.01);
        assert.closeTo(end[1], 110, 0.01);
    });

    it("is read along the leg past a corner rounded in small steps", () => {
        // a quarter circle of radius 3 in 8 steps, then 7 px down; a vee from y = 99 to its tip at 110
        const round = Array.from({ length: 9 }, (_, i): Pt => {
            const a = (i / 8) * (Math.PI / 2);
            return [97 + 3 * Math.sin(a), 100 + 3 * (1 - Math.cos(a))];
        });
        const line: Pt[] = [[0, 97], ...round.map(([x, y]): Pt => [x, y - 3]), [100, 110]];
        const vee: Pt[] = [
            [100, 110],
            [104.8, 98],
            [100, 101.6],
            [95.2, 98],
        ];
        const head = measureArrow(vee, line, "target", { filled: true, color: null });
        assert.strictEqual(head.shape, "vee");
        assert.closeTo(head.length, 12, 0.1);
        assert.closeTo(head.width, 9.6, 0.1);
    });

    it("is read along the chord across it where the line bends gently under it", () => {
        // a line bending 30 degrees under the diamond: no corner, so the chord across the cap aims it
        const line: Pt[] = [
            [0, 100],
            [96, 100],
            [100, 100 + 4 * Math.tan(Math.PI / 6)],
        ];
        const head = measureArrow(diamond, line, "target", { filled: true, color: null });
        assert.isBelow(head.length, 17);
    });
});
