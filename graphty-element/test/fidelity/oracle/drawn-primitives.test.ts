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

function graphOf(caps: Cap[], pattern: string | null = null): PScene {
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
        caps,
        label: null,
        endLabels: [],
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
});
