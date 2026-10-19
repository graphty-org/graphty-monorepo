/**
 * graphty's side of the oracle comparison (`drawnPrimitives`) on a hand-made drawn edge: a cap drawn at no opacity or
 * no size is no arrowhead, a cap's shape class comes from its mesh's type name (the longest it holds, so an open
 * triangle is no plain one), its color and fill are carried, and each line pattern graphty draws is read into the
 * line class the program's drawing is.
 */
import { assert, describe, it } from "vitest";

import type { Scene, SceneEdge } from "../../../../graph-io/test/fidelity/scene";
import type { DrawnEdge, DrawnGraph } from "../drawn-scene";
import { drawnPrimitives } from "./drawn-primitives";

type Cap = DrawnEdge["caps"][number];
const cap = (over: Partial<Cap>): Cap => ({
    end: "arrowHead",
    name: "arrow-2d-normal",
    sizePx: 10,
    outline: null,
    color: "#ff0000",
    opacity: 1,
    ...over,
});

function graphOf(
    caps: Cap[],
    pattern: string | null = null,
    gradient: DrawnEdge["gradient"] = null,
    over: Partial<DrawnEdge> = {},
): PScene {
    const sceneEdge: SceneEdge = {
        id: "e",
        source: "a",
        target: "b",
        points: [
            [0, 0],
            [100, 0],
        ],
        curved: false,
        color: "#000000",
        opacity: 1,
        width: 2,
        style: "solid",
        arrow: { source: "none", target: "none" },
        label: null,
    };
    const scene = { nodes: [], edges: [sceneEdge], groups: [], annotations: [], gaps: [] } as unknown as Scene;
    const edge: DrawnEdge = {
        kind: "line-2d",
        shown: true,
        points: sceneEdge.points,
        thicknessPx: 2,
        color: "#000000",
        opacity: 1,
        pattern,
        dashPx: null,
        outline: null,
        caps,
        label: null,
        endLabels: [],
        gradient,
        ...over,
    };
    const drawn: DrawnGraph = {
        nodes: new Map(),
        edges: new Map([["e", edge]]),
        annotations: [],
        background: { hex: "#ffffff", alpha: 1 },
        width: 200,
        height: 100,
    };
    return drawnPrimitives(scene, drawn);
}
type PScene = ReturnType<typeof drawnPrimitives>;

describe("graphty's drawing in the oracle comparison's model", () => {
    it("counts no arrowhead for a cap drawn at no opacity or no size", () => {
        assert.lengthOf(graphOf([cap({ opacity: 0 })]).edges[0].arrows, 0);
        assert.lengthOf(graphOf([cap({ sizePx: 0 })]).edges[0].arrows, 0);
        assert.lengthOf(graphOf([cap({})]).edges[0].arrows, 1);
    });

    it("reads a cap's shape class, fill and color from its mesh", () => {
        const [open] = graphOf([cap({ name: "arrow-2d-open-normal" })]).edges[0].arrows;
        assert.deepEqual([open.shape, open.filled, open.color], ["triangle", false, "#ff0000"]);
        const [dot] = graphOf([cap({ name: "sphere-dot-arrow-3d", end: "arrowTail" })]).edges[0].arrows;
        assert.deepEqual([dot.shape, dot.filled, dot.end], ["circle", true, "source"]);
        assert.strictEqual(graphOf([cap({ name: "arrow-2d-half-open" })]).edges[0].arrows[0].shape, "half");
    });

    it("reads the caps graphty added for other programs' arrows into their classes and fills", () => {
        const one = (name: string): [string, boolean] => {
            const [a] = graphOf([cap({ name })]).edges[0].arrows;
            return [a.shape, a.filled];
        };
        // a half-open cap is one filled barb, whatever its name says
        assert.deepEqual(one("arrow-2d-half-open"), ["half", true]);
        assert.deepEqual(one("arrow-2d-half-circle"), ["half-circle", true]);
        assert.deepEqual(one("arrow-2d-open-half-circle"), ["half-circle", false]);
        assert.deepEqual(one("arrow-2d-triangle-tee"), ["triangle", true]);
        assert.deepEqual(one("arrow-2d-triangle-cross"), ["triangle", true]);
    });

    it("reads a cap drawn part-way along the line as the line's middle one, a middle tail pointing back", () => {
        const [head] = graphOf([cap({ end: "arrowMiddleHead" })]).edges[0].arrows;
        assert.deepEqual([head.end, head.shape], ["middle", "triangle"]);
        const [tail] = graphOf([cap({ end: "arrowMiddleTail" })]).edges[0].arrows;
        assert.deepEqual([tail.end, tail.shape], ["middle", "inverted"]);
    });

    it("reads a line painted in a gradient as that gradient, its first stop its color", () => {
        const linear = graphOf([], null, { kind: "linear", colors: ["#ff0000", "#00ff00", "#0000ff"] }).edges[0].stroke;
        assert.strictEqual(linear?.color, "#ff0000");
        assert.deepEqual(
            linear?.gradient?.stops.map((s) => s.color),
            ["#ff0000", "#00ff00", "#0000ff"],
        );
        assert.strictEqual(linear?.gradient?.angle, 0);
        // a radial one is read out from the middle: the middle piece is its first stop
        const radial = graphOf([], null, { kind: "radial", colors: ["#0000ff", "#ff0000", "#0000ff"] }).edges[0].stroke;
        assert.deepEqual([radial?.gradient?.kind, radial?.color, radial?.gradient?.angle], ["radial", "#ff0000", null]);
        assert.isNull(graphOf([]).edges[0].stroke?.gradient ?? null);
    });

    it("reads each line pattern into its line class", () => {
        const of = (pattern: string | null): string | undefined => graphOf([], pattern).edges[0].stroke?.dashClass;
        assert.deepEqual([null, "dash", "dot", "box", "dash-dot", "zigzag", "sinewave", "star"].map(of), [
            "solid",
            "dashed",
            "dotted",
            "dotted",
            "dash-dot",
            "zigzag",
            "sinewave",
            "other",
        ]);
    });

    it("reads a dashed or dotted line by the lengths and gaps of the elements it drew, not by its pattern's name", () => {
        const of = (pattern: string, dashPx: number[]): string | undefined =>
            graphOf([], pattern, null, { dashPx }).edges[0].stroke?.dashClass;
        // dashes three widths long a width and a half apart, discs a width across: as named
        assert.strictEqual(of("dash", [6, 3, 6, 3]), "dashed");
        assert.strictEqual(of("dot", [2, 1, 2, 1]), "dotted");
        assert.strictEqual(of("dash-dot", [6, 2, 1.2, 2]), "dash-dot");
        // two dashes crowded onto a short edge, over one another: a solid line to a reader
        assert.strictEqual(of("dash", [6, 0, 6, 0]), "solid");
        // a dash drawn no longer than a dot is a dot
        assert.strictEqual(of("dash", [2, 2, 2, 2]), "dotted");
        // a pattern of other shapes keeps its name's class
        assert.strictEqual(of("star", [2, 1, 2, 1]), "other");
    });

    it("carries the band graphty draws under a line", () => {
        const outline = { color: "#ff0000", opacity: 1, width: 6 };
        assert.deepEqual(graphOf([], null, null, { outline }).edges[0].outline, outline);
        assert.isNull(graphOf([]).edges[0].outline ?? null);
    });
});
