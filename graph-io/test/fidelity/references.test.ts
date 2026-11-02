/**
 * The style fidelity references: every committed reference scene is valid against scene.schema.json,
 * names its route, carries that route's ledger as canCarry and hashes the sample as stored; and the
 * extractors' shared logic (colors, vocabularies, curve flattening, clipping, label placement, the
 * per-tool readers) gives the drawing the tools describe. The Python helpers run their own self-tests.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CORPUS_SAMPLES } from "./corpus-samples.js";
import { canCarry } from "./routes.js";
import { SAMPLES } from "./samples.js";
import { PROPERTIES, type Scene } from "./scene.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const load = async <T>(name: string): Promise<T> =>
    (await import(new URL(`./references/${name}`, import.meta.url).href)) as T;

type Pt = [number, number];
interface Common {
    parseColor: (v: string | null | undefined) => { hex: string; alpha: number } | null;
    shapeClass: (v: string) => string;
    arrowClass: (v: string) => string;
    lineStyle: (v: string) => string;
    flattenCubic: (pts: number[][], steps?: number) => Pt[];
    bends: (pts: number[][]) => boolean;
    clipToNode: (node: [number, number, number, number, string], p: number[]) => Pt;
    clipPath: (
        pts: number[][],
        src: [number, number, number, number, string],
        dst: [number, number, number, number, string],
    ) => Pt[];
    labelPosition: (w: number, h: number, box: { x?: number; y?: number; width: number; height: number }) => string;
    sceneErrors: (scene: unknown) => string[];
    normalizeNames: (scene: unknown) => Scene;
}
type SceneParts = Pick<Scene, "nodes" | "edges" | "groups" | "gaps"> & {
    annotations?: Scene["annotations"];
    background?: string;
};

const sha256 = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("committed reference scenes", () => {
    const cases = [...SAMPLES, ...CORPUS_SAMPLES].flatMap((s) => s.routes.map((route) => ({ sample: s, route })));
    it.each(cases)("$sample.id / $route is valid, stamped and traceable to its sample", async ({ sample, route }) => {
        const { sceneErrors } = await load<Common>("common.mjs");
        const path = `${here}scenes/${sample.id}/${route}.ref.json`;
        expect(existsSync(path), path).toBe(true);
        const scene = JSON.parse(readFileSync(path, "utf8")) as Scene;
        expect(sceneErrors(scene)).toEqual([]);
        expect(scene.provenance.side).toBe("reference");
        expect(scene.provenance.route).toBe(route);
        expect(scene.provenance.sourceSha256).toBe(sha256(`${here}../${sample.file}`));
        expect(scene.canCarry).toEqual(canCarry(route, PROPERTIES));
        // A scene whose nodes all sit at one point drew no positions (gml2gv writes pos="0,0" for a
        // node without coordinates); it must say so with a position gap, not stack the drawing.
        const spots = new Set(scene.nodes.map((n) => `${String(n.x)},${String(n.y)}`));
        if (scene.nodes.length > 1 && spots.size === 1) {
            expect(scene.gaps.map((g) => g.property)).toContain("position");
        }
    });
});

describe("the style fidelity corpus", () => {
    it("names each sample once, and no file twice", () => {
        const all = [...SAMPLES, ...CORPUS_SAMPLES];
        expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
        expect(new Set(all.map((s) => s.file)).size).toBe(all.length);
    });

    it("judges node size on files sigma drew itself, from the sizes it drew", () => {
        // sigma's sizes are screen pixels and its positions are fitted to the canvas, so its scene
        // records both as drawn, in viewport pixels; a scene that skipped size passed every size.
        for (const id of ["json-sigma-lesmis", "json-graphology-synth"]) {
            const scene = JSON.parse(readFileSync(`${here}scenes/${id}/sigma.ref.json`, "utf8")) as Scene;
            expect(scene.gaps.map((g) => g.property)).not.toContain("size");
            expect(scene.canCarry.size).toBe("yes");
        }
    });
});

describe("shared extractor logic", () => {
    it("reads every color form the tools print, with alpha apart", async () => {
        const { parseColor } = await load<Common>("common.mjs");
        expect(parseColor("#FFCC00")).toEqual({ hex: "#ffcc00", alpha: 1 });
        expect(parseColor("#fffffe00")).toEqual({ hex: "#fffffe", alpha: 0 });
        expect(parseColor("#abc")).toEqual({ hex: "#aabbcc", alpha: 1 });
        expect(parseColor("rgba(30, 136, 229, 0.5)")).toEqual({ hex: "#1e88e5", alpha: 0.5 });
        expect(parseColor("java.awt.Color[r=29,g=168,b=168]")).toEqual({ hex: "#1da8a8", alpha: 1 });
        expect(parseColor("168,168,29")?.hex).toBe("#a8a81d");
        expect(parseColor("none")).toBeNull();
        expect(parseColor("not a color")).toBeNull();
    });

    it("maps each tool's shape, arrowhead and dash names to one vocabulary", async () => {
        const { shapeClass, arrowClass, lineStyle } = await load<Common>("common.mjs");
        expect(["roundrectangle", "ROUND_RECTANGLE", "round-rectangle", "Mrecord"].map(shapeClass)).toEqual(
            Array(4).fill("roundrect"),
        );
        expect(["box", "RECTANGLE", "rectangle"].map(shapeClass)).toEqual(["rect", "rect", "rect"]);
        expect(["rhomboid", "PARALLELOGRAM"].map(shapeClass)).toEqual(["parallelogram", "parallelogram"]);
        expect(shapeClass("trapezoid")).toBe("other");
        expect(["normal", "DELTA", "standard", "classic", "triangle"].map(arrowClass)).toEqual(
            Array(5).fill("filled-triangle"),
        );
        expect(["white_delta", "onormal", "OPEN_DELTA"].map(arrowClass)).toEqual(Array(3).fill("open-triangle"));
        expect(["T", "t_shape", "tee"].map(arrowClass)).toEqual(["tee", "tee", "tee"]);
        expect(["NONE", "none"].map(arrowClass)).toEqual(["none", "none"]);
        expect(["line", "SOLID", "dashed", "LONG_DASH", "Dots", "dashed_dotted"].map(lineStyle)).toEqual([
            "solid",
            "solid",
            "dashed",
            "dashed",
            "dotted",
            "other",
        ]);
    });

    it("flattens a cubic spline through its ends and tells a bend from a straight line", async () => {
        const { flattenCubic, bends } = await load<Common>("common.mjs");
        const pts = flattenCubic(
            [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
            ],
            4,
        );
        expect(pts).toHaveLength(5);
        expect(pts[0]).toEqual([0, 0]);
        expect(pts[4]).toEqual([10, 0]);
        expect(pts[2]).toEqual([5, 7.5]);
        expect(bends(pts)).toBe(true);
        expect(
            bends(
                flattenCubic([
                    [0, 0],
                    [1, 1],
                    [2, 2],
                    [3, 3],
                ]),
            ),
        ).toBe(false);
    });

    it("clips a path's ends at the node outlines, keeping explicit ports", async () => {
        const { clipToNode, clipPath } = await load<Common>("common.mjs");
        expect(clipToNode([0, 0, 20, 10, "rect"], [100, 0])).toEqual([10, 0]);
        const [x, y] = clipToNode([0, 0, 20, 20, "ellipse"], [30, 40]);
        expect(Math.hypot(x, y)).toBeCloseTo(10);
        expect(clipToNode([0, 0, 20, 20, "rect"], [3, 3])).toEqual([0, 0]);
        expect(
            clipPath(
                [
                    [0, 0],
                    [50, 50],
                    [100, 0],
                ],
                [0, 0, 20, 20, "rect"],
                [100, 0, 20, 20, "ellipse"],
            )[0],
        ).toEqual([10, 10]);
        expect(
            clipPath(
                [
                    [0, 5],
                    [100, 0],
                ],
                [0, 0, 20, 20, "rect"],
                [100, 0, 20, 20, "rect"],
            )[0],
        ).toEqual([0, 5]);
    });

    it("classes a label box by where it sits against its node", async () => {
        const { labelPosition } = await load<Common>("common.mjs");
        expect(labelPosition(40, 20, { x: 5, y: 2, width: 30, height: 16 })).toBe("inside");
        expect(labelPosition(40, 20, { x: 0, y: 22, width: 40, height: 16 })).toBe("below");
        expect(labelPosition(40, 20, { x: 0, y: -18, width: 40, height: 16 })).toBe("above");
        expect(labelPosition(40, 20, { x: 44, y: 2, width: 30, height: 16 })).toBe("right");
        expect(labelPosition(40, 20, { x: -34, y: 2, width: 30, height: 16 })).toBe("left");
    });

    it("rejects a scene the schema forbids, and edges naming missing nodes", async () => {
        const { sceneErrors } = await load<Common>("common.mjs");
        const good = JSON.parse(readFileSync(`${here}scenes/cyjs-genemania/cyjs-computed.ref.json`, "utf8")) as Scene;
        expect(sceneErrors(good)).toEqual([]);
        const bad = structuredClone(good);
        bad.nodes[0].fill = "red";
        bad.nodes[1].shape = "blob" as Scene["nodes"][0]["shape"];
        bad.edges[0].target = "nowhere";
        (bad as unknown as Record<string, unknown>).extra = 1;
        const errors = sceneErrors(bad).join("\n");
        expect(errors).toMatch(/nodes\/0\/fill/);
        expect(errors).toMatch(/nodes\/1\/shape/);
        expect(errors).toMatch(/names a node the scene does not have/);
        expect(errors).toMatch(/unknown property extra/);
    });
});

describe("per-tool readers", () => {
    it("Graphviz: flips y against the bounding box, adds arrow tips, reads clusters and gradients", async () => {
        const { sceneFromGvJson } = await load<{ sceneFromGvJson: (d: unknown) => SceneParts & { gaps: Set<string> } }>(
            "graphviz.mjs",
        );
        const d = {
            bb: "0,0,200,100",
            _subgraph_cnt: 1,
            _draw_: [{ op: "C", grad: "none", color: "#ffffff" }],
            objects: [
                {
                    _gvid: 0,
                    name: "cluster_a",
                    bb: "10,10,90,90",
                    nodes: [1],
                    _draw_: [
                        {
                            op: "C",
                            grad: "linear",
                            p0: [0, 0, 0],
                            p1: [1, 1, 0],
                            stops: [{ frac: 0, color: "#ff0000" }],
                            n_stops: 1,
                        },
                        { op: "P", points: [] },
                    ],
                },
                {
                    _gvid: 1,
                    name: "a",
                    pos: "50,80",
                    width: "1",
                    height: "0.5",
                    shape: "box",
                    _draw_: [
                        { op: "c", grad: "none", color: "#000000" },
                        { op: "C", grad: "none", color: "#ccd1ff80" },
                        { op: "P", points: [] },
                    ],
                    _ldraw_: [
                        { op: "F", size: 14 },
                        { op: "c", grad: "none", color: "#0000ff" },
                        { op: "T", pt: [50, 76], text: "a" },
                    ],
                },
                { _gvid: 2, name: "b", pos: "150,20", width: "0.5", height: "0.5", _draw_: [{ op: "e", rect: [] }] },
            ],
            edges: [
                {
                    _gvid: 0,
                    tail: 1,
                    head: 2,
                    pos: "e,140,25 60,70 80,50 120,40 130,30",
                    _draw_: [
                        {
                            op: "b",
                            points: [
                                [60, 70],
                                [80, 50],
                                [120, 40],
                                [130, 30],
                            ],
                        },
                    ],
                    _hdraw_: [{ op: "P", points: [] }],
                },
            ],
        };
        const s = sceneFromGvJson(d);
        expect(s.nodes[0]).toMatchObject({
            id: "a",
            x: 50,
            y: 20,
            w: 72,
            h: 36,
            shape: "rect",
            fill: "#ccd1ff",
            border: { color: "#000000", width: 1 },
        });
        expect(s.nodes[0].fillOpacity).toBeCloseTo(128 / 255);
        expect(s.nodes[0].label).toMatchObject({ text: "a", fontSize: 14, color: "#0000ff", position: "inside" });
        expect(s.nodes[1]).toMatchObject({ id: "b", fill: null, fillOpacity: 0 });
        expect(s.edges[0].points.at(-1)).toEqual([140, 75]);
        expect(s.edges[0].arrow).toEqual({ source: "none", target: "filled-triangle" });
        expect(s.groups).toEqual([
            {
                id: "cluster_a",
                members: ["a"],
                bbox: { x: 10, y: 10, w: 80, h: 80 },
                fill: "#ff0000",
                border: null,
                label: null,
            },
        ]);
        expect([...s.gaps]).toEqual(["a linear gradient is reduced to its first stop"]);
        expect(s.background).toBe("#ffffff");
    });

    it("Gephi: reads circles, labels and flattened arcs from its SVG export", async () => {
        const { sceneFromGephi, svgPathPoints } = await load<{
            sceneFromGephi: (svg: string, items: unknown) => SceneParts;
            svgPathPoints: (d: string) => Pt[];
        }>("gephi.mjs");
        const arc = svgPathPoints("M 0,0 A 10,10 0,0 1,20,0");
        expect(arc[0]).toEqual([0, 0]);
        expect(arc.at(-1)?.[0]).toBeCloseTo(20);
        expect(arc.at(-1)?.[1]).toBeCloseTo(0);
        for (const [x, y] of arc) {
            expect(Math.hypot(x - 10, y)).toBeCloseTo(10);
        }
        const svg = `<g id="edges"><path class="id_1 id_2" d="M 0,0 L 10,0" stroke="#a8a81d" stroke-width="2.0" stroke-opacity="1.0"/></g>
            <circle fill-opacity="1.0" fill="#1da8a8" r="5" cx="0" class="id_1" cy="0" stroke="#0e5454" stroke-width="1.5"/>
            <circle fill="#ffffff" r="4" cx="10" class="id_2" cy="0"/>
            <text font-size="12" x="0" y="3" fill="#000000" class="id_1">Valjean &amp; co</text>`;
        const s = sceneFromGephi(svg, { edge: [{ _src: "1", _dst: "2", directed: "true" }] });
        expect(s.nodes[0]).toMatchObject({
            id: "1",
            w: 10,
            fill: "#1da8a8",
            border: { color: "#0e5454", width: 1.5 },
            label: { text: "Valjean & co", fontSize: 12 },
        });
        expect(s.edges[0]).toMatchObject({
            id: "1->2",
            color: "#a8a81d",
            width: 2,
            arrow: { target: "filled-triangle" },
        });
        expect(s.gaps[0].property).toBe("labelText");
    });

    it("Gephi: leaves self-loops out and gives a node its id with spaces, as the items dump keeps it", async () => {
        const { sceneFromGephi } = await load<{ sceneFromGephi: (svg: string, items: unknown) => SceneParts }>(
            "gephi.mjs",
        );
        const svg = `<path class="id_Big_A id_b" d="M 0,0 L 10,0"/><path class="id_b" d="M 10,0 L 10,0"/>
            <circle r="5" cx="0" class="id_Big_A" cy="0"/><circle r="5" cx="10" class="id_b" cy="0"/>`;
        const s = sceneFromGephi(svg, {
            node: [{ _id: "Big A" }, { _id: "b" }],
            edge: [{ _src: "Big A", _dst: "b", directed: "true" }],
        });
        expect(s.nodes.map((n) => n.id)).toEqual(["Big A", "b"]);
        expect(s.edges).toHaveLength(1);
        expect(s.edges[0]).toMatchObject({ id: "Big A->b", source: "Big A", arrow: { target: "filled-triangle" } });
        expect(s.gaps.map((g) => g.property)).toContain("edgePath");
    });

    it("Cytoscape desktop: fans the parallel edges after a bundle's first round ding's anchors", async () => {
        const { autoAnchors, anchoredPath } = await load<{
            autoAnchors: (t: unknown, rows: unknown[], geo: Map<string, unknown[]>) => Map<string, number[]>;
            anchoredPath: (s: number[], a: number[], t: number[], curved: boolean) => number[][];
        }>("cyrest.mjs");
        const geo = new Map<string, unknown[]>([
            ["1", [0, 0, 30, 20, "rect"]],
            ["2", [100, 0, 40, 10, "rect"]],
        ]);
        const edge = (suid: number, source: number, target: number) => ({
            data: { SUID: suid, source: String(source), target: String(target) },
        });
        const topology = { elements: { edges: [edge(13, 1, 2), edge(11, 2, 1), edge(12, 1, 2), edge(14, 1, 1)] } };
        const rows = [11, 12, 13, 14].map((SUID) => ({ SUID }));
        // SUID order 11, 12, 13: the first straight, then 40 (the largest side) to either side of x = 50
        expect([...autoAnchors(topology, rows, geo)]).toEqual([
            ["12", [50, 40]],
            ["13", [50, -40]],
        ]);
        const bentFirst = rows.map((r) => (r.SUID === 11 ? { ...r, EDGE_BEND: "0.5,0.5,0.5" } : r));
        expect(autoAnchors(topology, bentFirst, geo).size).toBe(0);
        const path = anchoredPath([0, 0], [50, 40], [100, 0], true);
        expect(path[8]).toEqual([50, 20]);
        expect(anchoredPath([0, 0], [50, 40], [100, 0], false)).toEqual([
            [0, 0],
            [50, 40],
            [100, 0],
        ]);
    });

    it("Cytoscape desktop: names, locked sizes, label anchors, transparency and annotations", async () => {
        const { sceneFromCyrest } = await load<{ sceneFromCyrest: (v: unknown) => SceneParts }>("cyrest.mjs");
        const row = (suid: number, x: number, label: string) => ({
            SUID: suid,
            NODE_X_LOCATION: x,
            NODE_Y_LOCATION: 0,
            NODE_WIDTH: 75,
            NODE_HEIGHT: 35,
            NODE_SIZE: 40,
            NODE_SHAPE: "ROUND_RECTANGLE",
            NODE_FILL_COLOR: "#EDCAC4",
            NODE_TRANSPARENCY: 128,
            NODE_BORDER_PAINT: "#CCCCCC",
            NODE_BORDER_WIDTH: 0,
            NODE_LABEL: label,
            NODE_LABEL_POSITION: "S,N,c,0.00,0.00",
            NODE_LABEL_FONT_SIZE: 12,
            NODE_LABEL_COLOR: "#000000",
        });
        const s = sceneFromCyrest({
            nodes: [
                row(1, 0, "A"),
                {
                    ...row(2, 100, "B"),
                    NODE_CUSTOMGRAPHICS_1: 'org.cytoscape.RadialGradient:{"cy_gradientColors":["#FFFFFF","#A50F15"]}',
                },
            ],
            edges: [
                {
                    SUID: 9,
                    EDGE_STROKE_UNSELECTED_PAINT: "#848484",
                    EDGE_TRANSPARENCY: 255,
                    EDGE_WIDTH: 2,
                    EDGE_LINE_TYPE: "LONG_DASH",
                    EDGE_TARGET_ARROW_SHAPE: "DELTA",
                },
            ],
            topology: {
                elements: {
                    nodes: [{ data: { SUID: 1, name: "x" } }, { data: { SUID: 2, name: "x" } }],
                    edges: [{ data: { SUID: 9, source: "1", target: "2" } }],
                },
            },
            background: "#FFFFFF",
            annotations: [
                {
                    type: "org.cytoscape.view.presentation.annotations.ArrowAnnotation",
                    x: "10",
                    y: "10",
                    targetPoint: "4,30",
                },
            ],
            locked: true,
        });
        expect(s.nodes.map((n) => n.id)).toEqual(["x", "x#1"]);
        expect(s.nodes[0]).toMatchObject({
            w: 40,
            h: 40,
            fill: "#edcac4",
            border: { color: null },
            label: { position: "below" },
        });
        expect(s.nodes[0].fillOpacity).toBeCloseTo(128 / 255);
        // a gradient custom graphic is painted over the second node's fill; the first has none
        expect(s.nodes.map((n) => n.paintedOver)).toEqual([undefined, true]);
        expect(s.edges[0]).toMatchObject({
            id: "x->x#1",
            points: [
                [20, 0],
                [80, 0],
            ],
            width: 2,
            style: "LONG_DASH",
        });
        expect(s.annotations).toEqual([{ kind: "arrow", bbox: { x: 4, y: 10, w: 6, h: 20 } }]);
        expect(s.gaps.map((g) => g.property)).toEqual(["position"]);

        // Under the lock a node that sets its own width and height is drawn at them, not at the
        // locked size (ddram: every node sets both; the mapped size is drawn by none of them).
        const own = sceneFromCyrest({
            nodes: [row(1, 0, "A"), row(2, 100, "B")],
            edges: [],
            topology: {
                elements: {
                    nodes: [{ data: { SUID: 1, name: "a" } }, { data: { SUID: 2, name: "b" } }],
                    edges: [],
                },
            },
            background: "#FFFFFF",
            annotations: [],
            locked: true,
            bypassed: { 1: { w: 461, h: 461 } },
        });
        expect(own.nodes.map((n) => [n.w, n.h])).toEqual([
            [461, 461],
            [40, 40],
        ]);
    });

    it("draw.io: absolute geometry through parents, ports from exit and entry constraints, groups", async () => {
        const { sceneFromDrawioCells } = await load<{ sceneFromDrawioCells: (c: unknown[]) => SceneParts }>(
            "drawio.mjs",
        );
        const cell = (o: Record<string, unknown>): Record<string, unknown> => ({
            vertex: false,
            edge: false,
            points: [],
            geometry: {},
            style: {},
            value: null,
            ...o,
        });
        const s = sceneFromDrawioCells([
            cell({ id: "1", parent: "0" }),
            cell({
                id: "g",
                parent: "1",
                vertex: true,
                geometry: { x: 100, y: 100, width: 200, height: 200 },
                style: { graphMlID: "n0", swimlane: "" },
            }),
            cell({
                id: "a",
                parent: "g",
                vertex: true,
                geometry: { x: 10, y: 20, width: 40, height: 20 },
                style: { graphMlID: "n0::n0", rounded: "1", fillColor: "#FFCC00" },
            }),
            cell({
                id: "a.l",
                parent: "a",
                vertex: true,
                value: "Source<br>View",
                geometry: { x: 0, y: 25, width: 40, height: 14 },
                style: { text: "", fontSize: "11" },
            }),
            cell({
                id: "b",
                parent: "1",
                vertex: true,
                geometry: { x: 400, y: 100, width: 20, height: 20 },
                style: { graphMlID: "n1", ellipse: "" },
            }),
            cell({
                id: "e",
                parent: "1",
                edge: true,
                source: "a",
                target: "b",
                style: { graphMlID: "e0", exitX: "1", exitY: "0.5", strokeColor: "#00CCFF", endArrow: "block" },
            }),
        ]);
        expect(s.groups).toEqual([
            {
                id: "n0",
                members: ["n0::n0"],
                bbox: { x: 100, y: 100, w: 200, h: 200 },
                fill: null,
                border: null,
                label: null,
            },
        ]);
        expect(s.nodes[0]).toMatchObject({
            id: "n0::n0",
            x: 130,
            y: 130,
            shape: "roundrect",
            fill: "#ffcc00",
            label: { text: "Source\nView", fontSize: 11, position: "below" },
        });
        expect(s.edges[0].points[0]).toEqual([150, 130]);
        const [ex, ey] = s.edges[0].points[1];
        expect(Math.hypot(ex - 410, ey - 110)).toBeCloseTo(10);
        expect(s.edges[0].arrow.target).toBe("block");
    });

    it("Cytoscape.js: flattens quadratic edge pieces through their ends", async () => {
        const { flattenQuadratic } = await load<{ flattenQuadratic: (a: number[], steps?: number) => Pt[] }>(
            "cyjs.mjs",
        );
        const pts = flattenQuadratic([0, 0, 5, 10, 10, 0], 2);
        expect(pts).toEqual([
            [0, 0],
            [5, 5],
            [10, 0],
        ]);
    });

    it("Cytoscape.js: renames a desktop export's SUID ids to the desktop scene's ids", async () => {
        const { renameIds } = await load<{ renameIds: (s: SceneParts, m?: unknown) => SceneParts }>("cyjs.mjs");
        const scene = {
            nodes: [{ id: "11" }, { id: "12" }],
            edges: [{ id: "90", source: "11", target: "12" }],
            groups: [{ id: "10", members: ["11"] }],
            gaps: [],
        } as unknown as SceneParts;
        const out = renameIds(scene, { nodes: { "10": "g", "11": "a", "12": "b" }, edges: { "90": "a->b" } });
        expect(out.nodes.map((n) => n.id)).toEqual(["a", "b"]);
        expect(out.edges[0]).toMatchObject({ id: "a->b", source: "a", target: "b" });
        expect(out.groups[0]).toMatchObject({ id: "g", members: ["a"] });
        expect(renameIds(scene)).toBe(scene);
    });

    it("graphviz-n2: pins every node at its scene position, y up", async () => {
        const { pinnedDot } = await load<{ pinnedDot: (s: unknown) => string }>("graphviz.mjs");
        const dot = pinnedDot({
            nodes: [{ id: "a", x: 10, y: 20, w: 72, h: 36, shape: "rect", label: { text: 'say "hi"' } }],
            edges: [{ id: "a->a", source: "a", target: "a", arrow: { target: "none" } }],
        });
        expect(dot).toContain('"a" [pos="10,-20!", width=1, height=0.5, shape=box, label="say \\"hi\\""];');
        expect(dot.startsWith("graph pinned {")).toBe(true);
    });

    it("the Python helpers pass their own self-tests", () => {
        const run = spawnSync("python3", ["-m", "unittest", "refcommon"], {
            cwd: `${here}references`,
            encoding: "utf8",
        });
        expect(run.status, run.stderr).toBe(0);
    });
});
