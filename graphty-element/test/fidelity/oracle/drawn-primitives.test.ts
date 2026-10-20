/**
 * graphty's side of the oracle comparison (`drawnPrimitives`) on a hand-made drawn edge: a cap drawn at no opacity or
 * no size is no arrowhead, a cap's shape class comes from its mesh's type name (the longest it holds, so an open
 * triangle is no plain one), its color and fill are carried, and each line pattern graphty draws is read into the
 * line class the program's drawing is.
 */
import { assert, describe, it } from "vitest";

import type { Scene, SceneEdge } from "../../../../graph-io/test/fidelity/scene";
import type { DrawnBorder, DrawnEdge, DrawnGraph, DrawnNode } from "../drawn-scene";
import { withoutCaptions } from "./compare-oracle";
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
    edgeOver: Partial<SceneEdge> = {},
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
        ...edgeOver,
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

    it("reads the arrowhead of an edge it draws no line for as a free shape, as the oracle's is a stray", () => {
        // Gephi's swallowed curved edge (gexf-sigma-ediaspora): an arrowhead with no line
        const head = cap({
            outline: [
                [90, -5],
                [100, 0],
                [90, 5],
            ],
        });
        const lineless = graphOf([head], null, null, {}, { opacity: 0 });
        assert.lengthOf(lineless.edges, 0);
        assert.deepEqual(
            lineless.strays.map((s) => [s.tag, s.kind, s.box]),
            [["arrowhead", "shape", { x0: 90, y0: -5, x1: 100, y1: 5 }]],
        );
        // an edge it draws a line for carries its arrowhead itself
        assert.lengthOf(graphOf([head]).strays, 0);
        // one wholly inside an opaque node is drawn under it, seen nowhere
        const sceneEdge = {
            id: "e",
            source: "a",
            target: "b",
            points: [
                [0, 0],
                [100, 0],
            ],
            width: 2,
            opacity: 0,
        };
        const scene = {
            nodes: [{ id: "b", shape: "rect", visible: false }],
            edges: [sceneEdge],
            groups: [],
            annotations: [],
            gaps: [],
        } as unknown as Scene;
        const covering = (fillOpacity: number): DrawnNode =>
            ({
                visible: true,
                fillDrawn: "#cccccc",
                fillOpacity,
                box: { x0: 80, y0: -20, x1: 120, y1: 20, near: 0, far: 0 },
            }) as unknown as DrawnNode;
        const strays = (fillOpacity: number): number =>
            drawnPrimitives(scene, {
                nodes: new Map([["b", covering(fillOpacity)]]),
                edges: new Map([
                    ["e", { shown: true, points: sceneEdge.points, caps: [head] } as unknown as DrawnEdge],
                ]),
                annotations: [],
                background: { hex: "#ffffff", alpha: 1 },
                width: 200,
                height: 100,
            }).strays.length;
        assert.strictEqual(strays(1), 0);
        assert.strictEqual(strays(0.4), 1);
    });

    it("carries a line on to the tip of a cap placed by its middle, a circle's far side", () => {
        const ring = Array.from({ length: 16 }, (_v, k): [number, number] => [
            100 + 5 * Math.cos((k * Math.PI) / 8),
            5 * Math.sin((k * Math.PI) / 8),
        ]);
        const circle = graphOf([cap({ name: "arrow-2d-dot", outline: ring })]).edges[0];
        assert.closeTo(circle.points.at(-1)?.[0] ?? 0, 105, 1e-9);
        // a cap whose tip is the line's end leaves the line as it is
        const head = graphOf([
            cap({
                outline: [
                    [100, 0],
                    [90, 3],
                    [90, -3],
                ],
            }),
        ]).edges[0];
        assert.deepEqual(head.points.at(-1), [100, 0]);
    });

    it("ends a line at the back of an open half circle standing off its node, not at the mouth the scene reports", () => {
        // an arc bulging back along the line from x 95 to its mouth at the line's end
        const arc = Array.from({ length: 9 }, (_v, k): [number, number] => [
            100 - 5 * Math.sin((k * Math.PI) / 8),
            -5 * Math.cos((k * Math.PI) / 8),
        ]);
        // Cytoscape's OPEN_HALF_CIRCLE stands off its node: the line stops at the arc's back
        const open = graphOf([cap({ name: "arrow-2d-open-half-circle", outline: arc, gap: 1 })]).edges[0];
        assert.closeTo(open.points.at(-1)?.[0] ?? 0, 95, 1e-9);
        // vis-network's inv_curve lies against its node: the line runs on under the arc to the node
        const against = graphOf([cap({ name: "arrow-2d-open-half-circle", outline: arc })]).edges[0];
        assert.closeTo(against.points.at(-1)?.[0] ?? 0, 100, 1e-9);
        // the filled one is carried through to its tip, as the oracle's is
        const filled = graphOf([cap({ name: "arrow-2d-half-circle", outline: arc })]).edges[0];
        assert.closeTo(filled.points.at(-1)?.[0] ?? 0, 100, 1e-9);
    });

    it("reads vis-network's curve cap, a stroked arc, as a hollow half circle", () => {
        const [arrow] = graphOf([cap({ name: "arrow-2d-curve" })]).edges[0].arrows;
        assert.deepEqual([arrow.shape, arrow.filled], ["half-circle", false]);
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
        // Cytoscape's CROSS_DELTA and CROSS_OPEN_DELTA, the class the oracle reads them in
        assert.deepEqual(one("arrow-2d-cross-delta"), ["cross-delta", true]);
        assert.deepEqual(one("arrow-2d-open-cross-delta"), ["cross-delta", false]);
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

    it("reads a node's outer ring beside its own border apart from the border and the node's size", () => {
        const ring = (color: string, widthPx: number, opacity = 1): DrawnBorder => ({
            color,
            widthPx,
            style: "solid",
            screen: false,
            opacity,
        });
        const nodeOf = (over: Partial<DrawnNode>): PScene["nodes"][number] | undefined => {
            const own = over.innerBorder ?? over.border ?? null;
            // the scene's node as extractScene builds it: its box grown out to the outer ring, its border the outer one
            const grow = over.outer?.gapPx ?? 0;
            const sceneNode = {
                id: "a",
                x: 50,
                y: 50,
                w: 40 + 2 * grow,
                h: 40 + 2 * grow,
                shape: "ellipse",
                fill: "#cccccc",
                fillOpacity: 1,
                border: {
                    color: (over.border ?? own)?.color ?? null,
                    width: (over.border ?? own)?.widthPx ?? 0,
                    style: "solid",
                },
                label: null,
                visible: true,
                drawn: { subPixel: false, fillCovered: false, fillDrawn: "#cccccc" },
            };
            const drawnNode = { insetPx: 0, label: null, gradient: false, ramp: null, ...over } as unknown as DrawnNode;
            const scene = {
                nodes: [sceneNode],
                edges: [],
                groups: [],
                annotations: [],
                gaps: [],
            } as unknown as Scene;
            const drawn: DrawnGraph = {
                nodes: new Map([["a", drawnNode]]),
                edges: new Map(),
                annotations: [],
                background: { hex: "#ffffff", alpha: 1 },
                width: 200,
                height: 100,
            };
            return drawnPrimitives(scene, drawn).nodes[0];
        };
        const inner = ring("#505050", 1, 0.4);
        const outer = { border: ring("#999999", 3), gapPx: 2 };
        const split = nodeOf({ border: outer.border, innerBorder: inner, outer });
        assert.deepEqual(
            [split?.w, split?.stroke?.color, split?.stroke?.opacity, split?.ring?.color, split?.ring?.reach],
            [40, "#505050", 0.4, "#999999", 5],
        );
        // an outer ring with no border of the node's own is its outline, as the oracle reads it
        const alone = nodeOf({ border: outer.border, innerBorder: null, outer });
        assert.deepEqual([alone?.w, alone?.stroke?.color, alone?.ring ?? null], [44, "#999999", null]);
    });

    it("leaves out a group it draws nothing for: no fill, no outline and no label", () => {
        const groupOf = (fill: string | null, fillOpacity: number): PScene["groups"] => {
            const parent = {
                id: "p",
                x: 50,
                y: 50,
                w: 40,
                h: 40,
                shape: "rectangle",
                fill,
                fillOpacity,
                border: { color: null, width: 0, style: "solid" },
                label: null,
                visible: true,
                drawn: { subPixel: false, fillCovered: false, fillDrawn: fill },
            };
            const scene = {
                nodes: [parent],
                edges: [],
                groups: [{ id: "p", bbox: { x: 30, y: 30, w: 40, h: 40 }, fill, label: null, members: ["a"] }],
                annotations: [],
                gaps: [],
            } as unknown as Scene;
            const drawn: DrawnGraph = {
                nodes: new Map([
                    ["p", { insetPx: 0, label: null, gradient: false, ramp: null } as unknown as DrawnNode],
                ]),
                edges: new Map(),
                annotations: [],
                background: { hex: "#ffffff", alpha: 1 },
                width: 200,
                height: 100,
            };
            return drawnPrimitives(scene, drawn).groups;
        };
        assert.lengthOf(groupOf("#eeeeee", 1), 1);
        assert.lengthOf(groupOf(null, 1), 0);
        assert.lengthOf(groupOf("#eeeeee", 0), 0);
    });

    it("reads the label of a group it draws with no fill and no outline as free text, as a program's unboxed cluster", () => {
        const label = {
            text: "Q",
            box: { x0: 40, y0: 30, x1: 60, y1: 44 },
            fontPx: 14,
            color: "#000000",
            enabled: true,
            onTop: false,
            family: "Times",
            weight: 400,
            style: "normal",
            rotation: 0,
            textBox: null,
            opacity: 1,
            lineCount: 1,
            align: "middle",
            outline: null,
            background: null,
        } as unknown as NonNullable<DrawnNode["label"]>;
        const scene = {
            nodes: [
                {
                    id: "p",
                    x: 50,
                    y: 50,
                    w: 40,
                    h: 40,
                    shape: "rectangle",
                    fill: null,
                    fillOpacity: 1,
                    border: { color: null, width: 0, style: "solid" },
                    label: { text: "Q", visible: true },
                    visible: true,
                },
            ],
            edges: [],
            groups: [{ id: "p", bbox: { x: 30, y: 30, w: 40, h: 40 }, fill: null, label: "Q", members: ["a"] }],
            annotations: [],
            gaps: [],
        } as unknown as Scene;
        const drawn: DrawnGraph = {
            nodes: new Map([["p", { insetPx: 0, label, gradient: false, ramp: null } as unknown as DrawnNode]]),
            edges: new Map(),
            annotations: [],
            background: { hex: "#ffffff", alpha: 1 },
            width: 200,
            height: 100,
        };
        const p = drawnPrimitives(scene, drawn);
        assert.lengthOf(p.groups, 0);
        assert.deepEqual(
            p.texts.map((t) => t.content),
            ["Q"],
        );
    });

    it("reads a node that draws no body as its label and its glyph, free texts, as a program's text or icon node", () => {
        const label = {
            text: "Label",
            box: { x0: 40, y0: 45, x1: 60, y1: 55 },
            fontPx: 10,
            color: "#000000",
            enabled: true,
            onTop: false,
            family: "DejaVu Sans",
            weight: 400,
            style: "normal",
            rotation: 0,
            textBox: null,
            opacity: 1,
            lineCount: 1,
            align: "middle",
            outline: null,
            background: null,
        } as unknown as NonNullable<DrawnNode["label"]>;
        const sceneNode = (id: string, labelled: boolean): Record<string, unknown> => ({
            id,
            x: 50,
            y: 50,
            w: 20,
            h: 28,
            shape: "other",
            fill: null,
            fillOpacity: 1,
            border: { color: null, width: 0, style: "solid" },
            label: labelled ? { text: "Label", visible: true } : null,
            visible: true,
            drawn: { subPixel: false, fillCovered: false, fillDrawn: null },
        });
        const scene = {
            nodes: [sceneNode("text", true), sceneNode("icon", false)],
            edges: [],
            groups: [],
            annotations: [],
            gaps: [],
        } as unknown as Scene;
        const node = (over: Partial<DrawnNode>): DrawnNode =>
            ({
                insetPx: 0,
                label: null,
                gradient: false,
                ramp: null,
                faceless: true,
                glyph: null,
                ...over,
            }) as unknown as DrawnNode;
        const drawn: DrawnGraph = {
            nodes: new Map([
                ["text", node({ label })],
                ["icon", node({ glyph: { text: "A", color: "#1f77b4" } })],
            ]),
            edges: new Map(),
            annotations: [],
            background: { hex: "#ffffff", alpha: 1 },
            width: 200,
            height: 100,
        };
        const p = drawnPrimitives(scene, drawn);
        // kept as nodes for the raster comparison's masks, read as texts by the comparison
        assert.deepEqual(
            p.nodes.map((n) => (n.faceless ?? []).map((t) => [t.content, t.owner, t.color])),
            [[["A", "icon", "#1f77b4"]], [["Label", "text", "#000000"]]],
        );
        const read = withoutCaptions(p);
        assert.lengthOf(read.nodes, 0);
        assert.deepEqual(
            read.texts.map((t) => t.content),
            ["A", "Label"],
        );
    });
});
