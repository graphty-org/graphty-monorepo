/**
 * Defects the comparator passed (#4222), each planted on a small drawing judged right alike:
 * - where each program lays the file out itself (`ownLayouts`), a drawing whose every node is a fifth of the size the
 *   program draws beside the spacing (cx-radiation-bibliography: Cytoscape desktop's labeled boxes drawn as dots), and
 *   arrowheads twice their size, which a render pixel scaled up by the size-fitted scale let through;
 * - where each program lays the file out itself, every edge straightened, or bowed, against the program's drawing;
 * - a zigzag a few percent of a long edge's length high, under the route's allowance and its bend's;
 * - and the other way round, Pajek's arrowhead drawn at the middle of its line on both sides, which was failed for
 *   standing off the line's end (pajek-graphstream-b, 193 of 193 edges).
 */
import { assert, describe, it } from "vitest";

import { compareOracle, type OracleProperty, type OracleReport } from "./compare-oracle";
import type { PArrow, PEdge, PNode, PScene, Pt } from "./primitives";

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
const edge = (source: string, target: string, points: Pt[], arrows: PArrow[] = []): PEdge => ({
    id: `${source}->${target}`,
    source,
    target,
    points,
    stroke: { color: "#0000ff", opacity: 1, width: 2, dash: null, dashClass: "solid" },
    arrows,
    label: null,
});
const scene = (side: PScene["side"], nodes: PNode[], edges: PEdge[], width = 1200, height = 900): PScene => ({
    side,
    width,
    height,
    background: "#ffffff",
    nodes,
    edges,
    groups: [],
    texts: [],
    strays: [],
});
const rate = (r: OracleReport, p: OracleProperty): number | null => r.properties[p].passRate;

/** A route from a to b bowed `depth` of its chord off it (a parabola), or straight at 0. */
const bowed = (a: Pt, b: Pt, depth: number, n = 33): Pt[] => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const L = Math.hypot(dx, dy);
    return Array.from({ length: n }, (_, i): Pt => {
        const t = i / (n - 1);
        const off = depth * L * 4 * t * (1 - t);
        return [a[0] + dx * t - (dy / L) * off, a[1] + dy * t + (dx / L) * off];
    });
};
/** A route from a to b zigzagging `amp` of its chord to each side, in `teeth` teeth. */
const zigzag = (a: Pt, b: Pt, amp: number, teeth: number): Pt[] => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const L = Math.hypot(dx, dy);
    const out: Pt[] = [a];
    for (let i = 1; i < 2 * teeth; i++) {
        const t = i / (2 * teeth);
        const off = (i % 2 === 1 ? 1 : -1) * amp * L;
        out.push([a[0] + dx * t - (dy / L) * off, a[1] + dy * t + (dx / L) * off]);
    }
    out.push(b);
    return out;
};

// ---- two layouts of one file, each its program's own: a 4 x 3 grid against the same twelve nodes shuffled
const IDS = Array.from({ length: 12 }, (_, i) => `n${String(i)}`);
const GRID: Pt[] = IDS.map((_, i): Pt => [150 + 300 * (i % 4), 150 + 300 * Math.floor(i / 4)]);
/** The same spacing, unrelated places: a permutation no similarity relates to the grid. */
const SHUFFLED: Pt[] = [7, 2, 11, 4, 9, 0, 5, 10, 3, 8, 1, 6].map((k) => GRID[k]);
/** A path through every node in id order, the edges both layouts draw. */
const PATH: [string, string][] = IDS.slice(1).map((id, i) => [IDS[i], id]);
const at = (places: Pt[], id: string): Pt => places[IDS.indexOf(id)];

/**
 * A drawing of the twelve nodes and their path.
 * @param side - whose
 * @param places - where each node is
 * @param size - each node's size
 * @param route - each edge's route from its source's place to its target's
 * @param arrow - each edge's arrowhead at its target, its length and width
 * @returns the scene
 */
function drawing(
    side: PScene["side"],
    places: Pt[],
    size: number,
    route: (a: Pt, b: Pt) => Pt[] = (a, b) => [a, b],
    arrow = 0,
): PScene {
    return scene(
        side,
        IDS.map((id) => node(id, at(places, id)[0], at(places, id)[1], size)),
        PATH.map(([s, t]) => {
            const pts = route(at(places, s), at(places, t));
            const head = pts.at(-1) ?? pts[0];
            const arrows: PArrow[] =
                arrow > 0
                    ? [
                          {
                              end: "target",
                              length: arrow,
                              width: arrow,
                              filled: true,
                              shape: "triangle",
                              color: "#0000ff",
                              at: head,
                          },
                      ]
                    : [];
            return edge(s, t, pts, arrows);
        }),
    );
}

const OWN = { ownLayouts: true } as const;

describe("where each program lays the file out itself", () => {
    it("fails nodes drawn a fifth of the program's size beside the spacing, which the size-fitted scale absorbed", () => {
        const o = drawing("oracle", GRID, 60);
        const alike = compareOracle("t", o, drawing("graphty", SHUFFLED, 60), null, OWN);
        assert.isTrue(alike.transform?.unrelatedLayout);
        assert.strictEqual(rate(alike, "node.sizeToSpacing"), 1);
        // every node a fifth the size: the size-fitted scale makes node.width pass, the spacing does not
        const small = compareOracle("t", o, drawing("graphty", SHUFFLED, 12), null, OWN);
        assert.strictEqual(rate(small, "node.width"), 1, "the size-fitted scale hides a uniform size");
        assert.strictEqual(rate(small, "node.sizeToSpacing"), 0);
        // two programs' force layouts settle apart: a node half again as large beside the spacing is each layout's
        assert.strictEqual(
            rate(compareOracle("t", o, drawing("graphty", SHUFFLED, 90), null, OWN), "node.sizeToSpacing"),
            1,
        );
    });

    it("fails arrowheads twice the program's size on nodes drawn small, whatever the size-fitted scale", () => {
        const o = drawing("oracle", GRID, 60, undefined, 6);
        // graphty's nodes a fifth the size: the size-fitted scale is 5, and one render pixel was 7.5 oracle pixels
        const alike = compareOracle("t", o, drawing("graphty", SHUFFLED, 12, undefined, 6 / 5), null, OWN);
        assert.strictEqual(rate(alike, "edge.arrowLength"), 1);
        const twice = compareOracle("t", o, drawing("graphty", SHUFFLED, 12, undefined, 12 / 5), null, OWN);
        assert.strictEqual(rate(twice, "edge.arrowLength"), 0);
    });

    it("fails every edge straightened where the program curves them, and every edge bowed where it draws them straight", () => {
        const curved = (a: Pt, b: Pt): Pt[] => bowed(a, b, 0.2);
        const bow15 = (a: Pt, b: Pt): Pt[] => bowed(a, b, 0.15);
        const straightO = drawing("oracle", GRID, 60);
        const curvedO = drawing("oracle", GRID, 60, curved);
        const judge = (o: PScene, g: PScene): number | null => rate(compareOracle("t", o, g, null, OWN), "edge.curve");
        assert.strictEqual(judge(straightO, drawing("graphty", SHUFFLED, 60)), 1);
        assert.strictEqual(judge(curvedO, drawing("graphty", SHUFFLED, 60, curved)), 1);
        assert.strictEqual(judge(curvedO, drawing("graphty", SHUFFLED, 60)), 0, "straightened");
        assert.strictEqual(judge(straightO, drawing("graphty", SHUFFLED, 60, bow15)), 0, "bowed");
    });

    it("fails every edge zigzagging", () => {
        const o = drawing("oracle", GRID, 60);
        const zz = (a: Pt, b: Pt): Pt[] => zigzag(a, b, 0.03, 8);
        const r = compareOracle("t", o, drawing("graphty", SHUFFLED, 60, zz), null, OWN);
        assert.strictEqual(rate(r, "edge.wiggle"), 0);
        assert.strictEqual(rate(compareOracle("t", o, drawing("graphty", SHUFFLED, 60), null, OWN), "edge.wiggle"), 1);
    });
});

describe("a route's shape on a long edge", () => {
    const [a, b]: [Pt, Pt] = [
        [100, 450],
        [1100, 450],
    ];
    const ends = (size: number): PNode[] => [
        node("a", a[0], a[1], size),
        node("b", b[0], b[1], size),
        node("c", 600, 100, size),
    ];
    const judge = (o: Pt[], g: Pt[]): OracleReport =>
        compareOracle(
            "t",
            scene("oracle", ends(40), [edge("a", "b", o)]),
            scene("graphty", ends(40), [edge("a", "b", g)]),
        );

    it("fails a zigzag 2.5% of the chord high, which stays under the route's allowance and the bend's", () => {
        const r = judge([a, b], zigzag(a, b, 0.025, 8));
        assert.strictEqual(rate(r, "edge.route"), 1, "under the route's allowance");
        assert.strictEqual(rate(r, "edge.curve"), 1, "under the bend's");
        assert.strictEqual(rate(r, "edge.wiggle"), 0);
    });

    it("passes a bend, a smooth S and a zigzag drawn by both", () => {
        assert.strictEqual(rate(judge([a, b], bowed(a, b, 0.1)), "edge.wiggle"), 1);
        const s = (k: number): Pt[] =>
            Array.from({ length: 65 }, (_, i): Pt => [
                a[0] + (1000 * i) / 64,
                a[1] + k * 40 * Math.sin((2 * Math.PI * i) / 64),
            ]);
        assert.strictEqual(rate(judge(s(1), s(1.2)), "edge.wiggle"), 1);
        assert.strictEqual(rate(judge(zigzag(a, b, 0.03, 8), zigzag(a, b, 0.03, 8)), "edge.wiggle"), 1);
    });
});

describe("an arrowhead the program draws part-way along its line", () => {
    const [a, b]: [Pt, Pt] = [
        [100, 100],
        [500, 100],
    ];
    const nodes = [node("a", a[0], a[1], 20), node("b", b[0], b[1], 20), node("c", 300, 400, 20)];
    const head = (where: Pt, misplaced?: number): PArrow => ({
        end: "target",
        length: 10,
        width: 8,
        filled: true,
        shape: "triangle",
        color: "#0000ff",
        at: where,
        ...(misplaced === undefined ? {} : { misplaced }),
    });
    const judge = (g: PArrow): number | null =>
        rate(
            compareOracle(
                "t",
                scene("oracle", nodes, [edge("a", "b", [a, b], [head([300, 100])])]),
                scene("graphty", nodes, [edge("a", "b", [a, b], [g])]),
            ),
            "edge.arrowPlace",
        );

    it("passes graphty's head drawn at the middle too, which its reading measured from the line's end", () => {
        assert.strictEqual(judge(head([300, 100], 190)), 1);
    });

    it("fails graphty's head drawn at the line's end", () => {
        assert.strictEqual(judge(head([485, 100])), 0);
    });

    it("fails a head mirrored about the middle: 0.3 from the source where the program's is 0.3 from the target", () => {
        const at = (g: Pt): number | null =>
            rate(
                compareOracle(
                    "t",
                    scene("oracle", nodes, [edge("a", "b", [a, b], [head([380, 100])])]),
                    scene("graphty", nodes, [edge("a", "b", [a, b], [{ ...head(g), partWay: true }])]),
                ),
                "edge.arrowPlace",
            );
        assert.strictEqual(at([380, 100]), 1);
        assert.strictEqual(at([220, 100]), 0);
    });
});

describe("a label's place on its node", () => {
    it("fails a centered label moved one font size down, as the line boxes built alike on both sides must still show", () => {
        const labeled = (side: PScene["side"], dy: number): PScene => {
            const nodes = IDS.slice(0, 4).map((id, i) => node(id, 150 + 300 * i, 300, 60));
            const [n] = nodes;
            const size = 12;
            n.label = {
                content: "graph-format.js",
                x: n.cx,
                y: n.cy + dy,
                box: { x0: n.cx - 45, y0: n.cy + dy - 0.55 * size, x1: n.cx + 45, y1: n.cy + dy + 0.55 * size },
                sizePx: size,
                family: "Helvetica",
                weight: 400,
                style: "normal",
                anchor: "middle",
                rotation: 0,
                color: "#000000",
                opacity: 1,
            };
            return scene(side, nodes, []);
        };
        const judge = (dy: number): number | null =>
            rate(compareOracle("t", labeled("oracle", 0), labeled("graphty", dy)), "label.anchor");
        assert.strictEqual(judge(0), 1);
        assert.strictEqual(judge(12), 0);
    });
});
