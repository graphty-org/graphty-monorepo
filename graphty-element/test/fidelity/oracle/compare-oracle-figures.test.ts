/**
 * The oracle comparison at a figure with a dent (Pajek's man, woman and cross, a star): a line is cut, and a node judged
 * hidden, at the figure's own outline on both sides, not at the ellipse its box holds nor at its box. The comparator
 * before this cut every line at that ellipse and hid a node in an empty corner of the figure's box (#5761:
 * pajek-synth-vertices `node.present` 22 and 31). A line that stops short of the figure is still judged short.
 */
import { assert, describe, it } from "vitest";

import { withoutCovered } from "./associate";
import { compareOracle, shownPart } from "./compare-oracle";
import { figureOf, type PEdge, type PNode, type PScene, type Pt } from "./primitives";

const node = (id: string, cx: number, cy: number, over: Partial<PNode> = {}): PNode => ({
    id,
    cx,
    cy,
    w: 40,
    h: 40,
    shape: "ellipse",
    fill: { color: "#cccccc", opacity: 1, gradient: null },
    stroke: null,
    label: null,
    ...over,
});

/** A plus 150 px across at (300, 200), its arms a third of its width: a figure whose box corners are empty. */
const PLUS_AT: Pt = [300, 200];
const plusFigure = (): [Pt, Pt][] => {
    const t = 1 / 3;
    const unit: Pt[] = [
        [-t, -1],
        [t, -1],
        [t, -t],
        [1, -t],
        [1, t],
        [t, t],
        [t, 1],
        [-t, 1],
        [-t, t],
        [-1, t],
        [-1, -t],
        [-t, -t],
    ];
    const n = { cx: PLUS_AT[0], cy: PLUS_AT[1], w: 150, h: 150 };
    const figure = figureOf(
        unit.map(([u, v]) => [n.cx + u * 75, n.cy + v * 75]),
        n,
    );
    assert.isDefined(figure, "a plus has a dent");
    return figure;
};
const plus = (over: Partial<PNode> = {}): PNode =>
    node("p", PLUS_AT[0], PLUS_AT[1], { w: 150, h: 150, shape: "other", figure: plusFigure(), ...over });

/** Six nodes on a grid, which fix the frame. */
const GRID = [
    node("a", 100, 100),
    node("b", 300, 60),
    node("c", 500, 100),
    node("d", 100, 360),
    node("e", 300, 360),
    node("f", 560, 300),
];
const edge = (points: Pt[]): PEdge => ({
    id: "p->q",
    source: "p",
    target: "q",
    points,
    stroke: { color: "#0000ff", opacity: 1, width: 2, dash: null, dashClass: "solid" },
    arrows: [],
    label: null,
});
const scene = (side: PScene["side"], nodes: PNode[], edges: PEdge[]): PScene => ({
    side,
    width: 600,
    height: 400,
    background: "#ffffff",
    nodes: [...GRID, ...nodes],
    edges,
    groups: [],
    texts: [],
    strays: [],
});
const routeFails = (o: PScene, g: PScene): string[] => compareOracle("t", o, g).failures["edge.route"] ?? [];

describe("a figure's own outline", () => {
    it("cuts a line where it leaves the figure, not where it leaves the ellipse the figure's box holds", () => {
        // along the diagonal a plus ends at its arms' inner corner, 25 px each way; the ellipse runs on to 53 px
        const part = shownPart(
            [
                [300, 200],
                [450, 350],
            ],
            plus(),
            undefined,
        );
        assert.isNotNull(part);
        const [x, y] = part[0];
        assert.closeTo(x, 325, 0.01);
        assert.closeTo(y, 325 - 100, 0.01);
    });

    it("judges a line run to the figure's outline on both sides alike", () => {
        const q = node("q", 450, 350);
        const line = edge([PLUS_AT, [450, 350]]);
        assert.deepEqual(routeFails(scene("oracle", [plus(), q], [line]), scene("graphty", [plus(), q], [line])), []);
    });

    it("still fails a line that stops in an empty corner of the figure's box, short of its outline", () => {
        // the oracle's line runs from the plus's middle; graphty's stops 28 px short of the plus, inside the ellipse its
        // box holds, where the old cut hid the gap
        const q = node("q", 450, 350);
        const oracle = scene("oracle", [plus(), q], [edge([PLUS_AT, [450, 350]])]);
        const short = scene(
            "graphty",
            [plus(), q],
            [
                edge([
                    [345, 245],
                    [450, 350],
                ]),
            ],
        );
        assert.deepEqual(routeFails(oracle, short), ["p->q"]);
    });

    it("hides a node under the figure, not one in an empty corner of its box", () => {
        const drawn = (n: PNode, order: number): PNode => ({ ...n, order });
        const covered = withoutCovered(
            scene(
                "oracle",
                [
                    drawn(node("middle", PLUS_AT[0], PLUS_AT[1], { w: 20, h: 20 }), 1),
                    drawn(node("corner", PLUS_AT[0] + 50, PLUS_AT[1] + 50, { w: 20, h: 20, shape: "rect" }), 1),
                    drawn(plus(), 2),
                ],
                [],
            ),
        );
        const ids = new Set(covered.nodes.map((n) => n.id));
        assert.isFalse(ids.has("middle"), "the node under the plus's middle is hidden");
        assert.isTrue(ids.has("corner"), "the node beside its arms shows");
    });
});
