/**
 * extractPositions() over each format's samples: the coordinates equal the file's numbers after the
 * documented conversion (center, y up, the file's unit), and every note code has a case.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { createRegistry, type ImportInput } from "../../src/index.js";
import { extractPositions, type FilePositions, POSITION_ISSUE } from "../../src/positions/index.js";
import type { GraphImporter, ImportReport } from "../../src/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "fixtures");
const CONFORMANCE = join(HERE, "..", "conformance", "fixtures");
const CORPUS = join(HERE, "..", "corpus");

const registry = createRegistry();

/**
 * Import an input and extract its positions with the importer that read it.
 * @param input - the file's text or bytes
 * @param format - the format
 * @returns the snapshot and the positions
 */
async function load(
    input: ImportInput,
    format: string,
): Promise<{ snapshot: GraphSnapshot; positions: FilePositions | null }> {
    const { snapshot, report } = await registry.importGraph(input, { format });
    return { snapshot, positions: extractPositions(registry.importer(format), snapshot, report) };
}

/**
 * A node's extracted coordinate by id.
 * @param snapshot - the graph
 * @param positions - the extracted positions
 * @param id - the node id
 * @returns x, y, z
 */
function at(snapshot: GraphSnapshot, positions: FilePositions, id: string): number[] {
    // a format that coerces numeric ids keeps them as numbers
    const found = snapshot.ids.indexOf(id);
    const i = found < snapshot.nodeCount ? found : snapshot.ids.requireIndex(Number(id));
    return Array.from(positions.coords.subarray(3 * i, 3 * i + 3));
}

interface Case {
    readonly name: string;
    readonly file: string;
    readonly format: string;
    /** node id -> the coordinate after the documented conversion */
    readonly expect: Readonly<Record<string, readonly [number, number, number]>>;
    readonly units: "px" | "file";
    /** px per unit, for a file unit of known length; undefined when the file gives none */
    readonly pxPerUnit?: number;
    readonly yAxis: "up" | "down";
    readonly dims: 2 | 3;
    readonly tool?: string | null;
    readonly medianNodeSize?: number | null;
    readonly placed?: number;
    readonly total?: number;
}

const CASES: readonly Case[] = [
    {
        name: "GML from yFiles: y down, center, px",
        file: join(FIXTURES, "yfiles.gml"),
        format: "gml",
        expect: { 0: [10, -20, 0], 1: [110, 40, 0], 2: [0, 0, 0] },
        units: "px",
        yAxis: "down",
        dims: 2,
        tool: "yed",
        medianNodeSize: 30,
    },
    {
        name: "GML from Gephi: y up, a constant z collapses to 2D",
        file: join(FIXTURES, "gephi.gml"),
        format: "gml",
        expect: { 1: [5.5, 7.25, 0], 2: [-3, 2, 0] },
        units: "px",
        yAxis: "up",
        dims: 2,
        tool: "gephi",
    },
    {
        name: "GML with no creator: y down (the GML specification), a real z rotated with y",
        file: join(CONFORMANCE, "gml", "authored", "graphics-position.gml"),
        format: "gml",
        expect: { 1: [10.5, 3, -2], 2: [0, 0, 0] },
        units: "px",
        yAxis: "down",
        dims: 3,
    },
    {
        name: "DOT laid out by Graphviz (bb): points, y up, cluster containers at their bb",
        file: join(FIXTURES, "cluster-laid-out.gv"),
        format: "dot",
        expect: { a0: [63, 309, 0], b3: [160, 93, 0], cluster_0: [53, 212.5, 0], cluster_1: [166.5, 212.5, 0] },
        units: "px",
        yAxis: "up",
        dims: 2,
        tool: "graphviz",
        medianNodeSize: 54,
        placed: 12,
        total: 12,
    },
    {
        name: "DOT neato input (no bb): inches (72 px each), y up",
        file: join(FIXTURES, "neato-input.gv"),
        format: "dot",
        expect: { a: [1, 2, 0], b: [3.5, -1, 0], c: [0, 0, 0] },
        units: "file",
        pxPerUnit: 72,
        yAxis: "up",
        dims: 2,
        tool: null,
        medianNodeSize: 0.5,
    },
    {
        name: "GEXF viz:position: y up, unchanged",
        file: join(CONFORMANCE, "gexf", "graphology", "basic.gexf"),
        format: "gexf",
        expect: { Suzy: [12, 35, 0], John: [45, 0, 0] },
        units: "file",
        yAxis: "up",
        dims: 2,
        medianNodeSize: null,
    },
    {
        name: "yEd GraphML: top-left corner to center, y down, GenericNode and the active group realizer",
        file: join(FIXTURES, "yed-groups.graphml"),
        format: "graphml",
        expect: {
            shape: [120, -65, 0],
            generic: [0, -210, 0],
            group: [280, -80, 0],
            "group::inner": [245, -85, 0],
        },
        units: "px",
        yAxis: "down",
        dims: 2,
        tool: "yed",
        // the group container's size is left out
        medianNodeSize: 35,
        placed: 4,
        total: 4,
    },
    {
        name: "yEd GraphML corpus sample",
        file: join(CORPUS, "graphml", "yed-graphics.graphml"),
        format: "graphml",
        expect: {},
        units: "px",
        yAxis: "down",
        dims: 2,
        tool: "yed",
    },
    {
        name: "Pajek USAir97: y down, so Deadhorse (north) is above Miami; constant z = 0.5 is 2D",
        file: join(CONFORMANCE, "pajek", "batagelj", "USAir97.net"),
        format: "pajek",
        expect: { 2: [0.483, -0.1014, 0], 311: [0.8302, -0.5256, 0] },
        units: "file",
        // Pajek draws the [0,1] square as 500 points
        pxPerUnit: 500,
        yAxis: "down",
        dims: 2,
        placed: 332,
        total: 332,
    },
    {
        name: "Pajek A97 (3D): z centered on 0.5, y and z flipped together",
        file: join(CONFORMANCE, "pajek", "bavla", "A97.NET"),
        format: "pajek",
        expect: { 1: [0.8464, -0.8341, -(0.1164 - 0.5)], 2: [0.7463, -0.3394, -(0.8077 - 0.5)] },
        units: "file",
        // Pajek draws the [0,1] square as 500 points
        pxPerUnit: 500,
        yAxis: "down",
        dims: 3,
    },
    {
        name: "Cytoscape elements JSON: already y up; compound parents with no position are not counted",
        file: join(CONFORMANCE, "json", "cytoscape", "network-compound-nodes.json"),
        format: "json",
        expect: { a: [215, -85, 0], f: [300, -175, 0] },
        units: "file",
        yAxis: "up",
        dims: 2,
        placed: 4,
        total: 4,
    },
    {
        name: "plain JSON x / y (sigma): graphty-element's convention, never flipped",
        file: join(CORPUS, "json", "sigma-format.json"),
        format: "json",
        expect: { b: [1, 1, 0], d: [1.5, -1, 0] },
        units: "file",
        yAxis: "up",
        dims: 2,
    },
    {
        name: "CX cartesianLayout: already y up",
        file: join(CORPUS, "cx", "primitive_attributes.cx"),
        format: "cx",
        expect: {},
        units: "file",
        yAxis: "up",
        dims: 2,
    },
    {
        name: "CX2 node coordinates: already y up",
        file: join(CORPUS, "cx2", "emt-network.cx2"),
        format: "cx2",
        expect: {},
        units: "file",
        yAxis: "up",
        dims: 2,
    },
    {
        name: "Cytoscape session (cys): already y up",
        file: join(CORPUS, "cys", "karate-3x.cys"),
        format: "cys",
        expect: {},
        units: "file",
        yAxis: "up",
        dims: 2,
    },
];

describe("extractPositions over each format's samples", () => {
    it.each(CASES)("$name", async (c) => {
        const { snapshot, positions } = await load(readFileSync(c.file), c.format);
        expect(positions).not.toBeNull();
        const p = positions as FilePositions;
        expect(p.usable).toBe(true);
        expect(p.units).toBe(c.units);
        expect(p.pxPerUnit).toBe(c.pxPerUnit);
        expect(p.source.yAxis).toBe(c.yAxis);
        expect(p.source.format).toBe(c.format);
        expect(p.dims).toBe(c.dims);
        for (const [id, want] of Object.entries(c.expect)) {
            const got = at(snapshot, p, id);
            want.forEach((v, k) => expect(got[k], `${id}[${k}]`).toBeCloseTo(v, 9));
        }
        if (c.tool !== undefined) {
            expect(p.source.tool).toBe(c.tool);
        }
        if (c.medianNodeSize !== undefined) {
            expect(p.medianNodeSize).toBe(c.medianNodeSize);
        }
        if (c.placed !== undefined) {
            expect([p.placed, p.total]).toEqual([c.placed, c.total]);
        }
        expect(p.coords.length).toBe(3 * snapshot.nodeCount);
        expect(p.bounds).not.toBeNull();
    });

    it("an unchanged column keeps the values the file wrote (the conversion is computed, not stored)", async () => {
        const { snapshot } = await load(readFileSync(join(FIXTURES, "yfiles.gml")), "gml");
        expect(Array.from(snapshot.nodes.byRole("position")?.value(0) as ArrayLike<number>)).toEqual([10, 20, 0]);
    });

    it("yEd and DOT cluster containers have a box (center, y up)", async () => {
        const yed = await load(readFileSync(join(FIXTURES, "yed-groups.graphml")), "graphml");
        const group = yed.snapshot.ids.requireIndex("group");
        expect(yed.positions?.groups).toEqual([{ node: group, box: { x: 280, y: -80, width: 160, height: 120 } }]);
        const dot = await load(readFileSync(join(FIXTURES, "cluster-laid-out.gv")), "dot");
        expect(dot.positions?.groups).toEqual([
            { node: dot.snapshot.ids.requireIndex("cluster_0"), box: { x: 53, y: 212.5, width: 90, height: 291 } },
            { node: dot.snapshot.ids.requireIndex("cluster_1"), box: { x: 166.5, y: 212.5, width: 83, height: 291 } },
        ]);
    });

    it("a Cytoscape.js compound's saved position is not read: Cytoscape.js draws it around its children", async () => {
        const saved = JSON.stringify({
            elements: {
                nodes: [
                    { data: { id: "group" }, position: { x: 500, y: 500 } },
                    { data: { id: "m1", parent: "group" }, position: { x: 0, y: 0 } },
                    { data: { id: "m2", parent: "group" }, position: { x: 100, y: 20 } },
                ],
                edges: [],
            },
        });
        const { snapshot, positions } = await load(saved, "json");
        expect(positions?.placed).toBe(2);
        expect(positions?.total).toBe(2);
        expect(at(snapshot, positions as FilePositions, "group").every(Number.isNaN)).toBe(true);
        expect(at(snapshot, positions as FilePositions, "m2")).toEqual([100, -20, 0]);
        expect(positions?.groups).toEqual([]);
    });

    it("an asymmetric 3D Pajek drawing is rotated, never mirrored (the signed volume keeps its sign)", async () => {
        const text = readFileSync(join(CONFORMANCE, "pajek", "bavla", "A97.NET"));
        const { snapshot, positions } = await load(text, "pajek");
        const raw = snapshot.nodes.byRole("position");
        const point = (i: number, from: "raw" | "neutral"): number[] =>
            from === "raw"
                ? Array.from(raw?.value(i) as ArrayLike<number>)
                : Array.from((positions as FilePositions).coords.subarray(3 * i, 3 * i + 3));
        const volume = (from: "raw" | "neutral"): number => {
            const [p0, p1, p2, p3] = [0, 1, 4, 5].map((i) => point(i, from));
            const a = p1.map((v, k) => v - p0[k]);
            const b = p2.map((v, k) => v - p0[k]);
            const c = p3.map((v, k) => v - p0[k]);
            return (
                a[0] * (b[1] * c[2] - b[2] * c[1]) -
                a[1] * (b[0] * c[2] - b[2] * c[0]) +
                a[2] * (b[0] * c[1] - b[1] * c[0])
            );
        };
        expect(volume("raw")).not.toBe(0);
        expect(volume("neutral")).toBeCloseTo(volume("raw"), 12);
    });
});

describe("the JSON marker rule", () => {
    it("a plain x / y file is y up; d3-force keys mark it y down", async () => {
        const plain = await load(
            JSON.stringify({
                nodes: [
                    { id: "a", x: 1, y: 2 },
                    { id: "b", x: 3, y: 4 },
                ],
            }),
            "json",
        );
        expect(plain.positions?.source.yAxis).toBe("up");
        expect(at(plain.snapshot, plain.positions as FilePositions, "a")).toEqual([1, 2, 0]);
        const d3 = await load(
            JSON.stringify({
                nodes: [
                    { id: "a", x: 1, y: 2, vx: 0, vy: 0, index: 0 },
                    { id: "b", x: 3, y: 4, index: 1 },
                ],
            }),
            "json",
        );
        expect(d3.positions?.source.yAxis).toBe("down");
        expect(d3.positions?.units).toBe("px");
        expect(at(d3.snapshot, d3.positions as FilePositions, "a")).toEqual([1, -2, 0]);
    });

    it("a vis-network file is y down in canvas px, with or without physics", async () => {
        // vis-network draws a node's x / y straight onto its canvas, whose y grows downward
        const vis = await load(
            JSON.stringify({
                nodes: [
                    { id: "a", x: 1, y: 2 },
                    { id: "b", x: 3, y: 4 },
                ],
                edges: [{ from: "a", to: "b" }],
            }),
            "json",
        );
        expect(vis.positions?.source.yAxis).toBe("down");
        expect(vis.positions?.units).toBe("px");
        expect(at(vis.snapshot, vis.positions as FilePositions, "a")).toEqual([1, -2, 0]);
    });

    it("a graphology file is y up whatever d3-force keys it carries, as sigma.js draws it", async () => {
        const nodes = [
            { key: "a", attributes: { x: 1, y: 2, vx: 0, index: 0 } },
            { key: "b", attributes: { x: 3, y: 4, fy: 1 } },
        ];
        const { snapshot, positions } = await load(JSON.stringify({ options: { type: "mixed" }, nodes }), "json");
        expect(positions?.source.yAxis).toBe("up");
        expect(positions?.units).toBe("file");
        expect(at(snapshot, positions as FilePositions, "a")).toEqual([1, 2, 0]);
    });

    it("a d3 file with z is a 3D drawing, read y up", async () => {
        const nodes = [
            { id: "a", x: 1, y: 2, z: 3, vx: 0 },
            { id: "b", x: 0, y: 0, z: 1, vx: 0 },
        ];
        const { snapshot, positions } = await load(JSON.stringify({ nodes }), "json");
        expect(positions?.source.yAxis).toBe("up");
        expect(positions?.dims).toBe(3);
        expect(at(snapshot, positions as FilePositions, "a")).toEqual([1, 2, 3]);
    });
});

describe("notes", () => {
    const codes = (p: FilePositions | null): string[] => (p?.notes ?? []).map((n) => n.code);

    it("W_POSITION_STACKED: every node on one point drops the coordinates", async () => {
        const text = '*Vertices 3\n1 "a" 0.5 0.5\n2 "b" 0.5 0.5\n3 "c" 0.5 0.5\n*Edges\n1 2\n';
        const { positions } = await load(text, "pajek");
        expect(codes(positions)).toContain(POSITION_ISSUE.STACKED);
        expect(positions?.usable).toBe(false);
        expect(positions?.placed).toBe(0);
        expect(positions?.bounds).toBeNull();
        expect(Array.from(positions?.coords ?? []).every(Number.isNaN)).toBe(true);
    });

    it("W_POSITION_PARTIAL: some nodes have no position", async () => {
        const text = '*Vertices 3\n1 "a" 0.1 0.2\n2 "b" 0.3 0.4\n3 "c"\n*Edges\n1 2\n';
        const { positions } = await load(text, "pajek");
        const note = positions?.notes.find((n) => n.code === POSITION_ISSUE.PARTIAL);
        expect(note?.elements).toEqual([2]);
        expect([positions?.placed, positions?.total, positions?.usable]).toEqual([2, 3, true]);
    });

    it("the NetworkX (0, 0) pile in a Pajek file counts as unplaced", async () => {
        const text = '*Vertices 4\n1 "a" 0.0 0.0\n2 "b" 0.0 0.0\n3 "c" 0.3 0.4\n4 "d" 0.6 0.1\n*Edges\n1 2\n';
        const { positions } = await load(text, "pajek");
        expect([positions?.placed, positions?.total]).toEqual([2, 4]);
        expect(codes(positions)).toContain(POSITION_ISSUE.PARTIAL);
    });

    it("one node at (0, 0) beside placed ones is a real position", async () => {
        const text = '*Vertices 2\n1 "a" 0.0 0.0\n2 "b" 0.3 0.4\n';
        const { positions } = await load(text, "pajek");
        expect(positions?.placed).toBe(2);
    });

    it("W_POSITION_DIMS_MIXED: the format reader's mixed-dimension warning", async () => {
        const text = '*Vertices 2\n1 "a" 0.1 0.2\n2 "b" 0.3 0.4 0.7\n';
        const { positions } = await load(text, "pajek");
        expect(codes(positions)).toContain(POSITION_ISSUE.DIMS_MIXED);
    });

    it("W_POSITIONS_NOT_READ: plain GraphML x / y columns are not read", async () => {
        const text = readFileSync(join(CONFORMANCE, "graphml", "gephi-datasets", "airlines.graphml"));
        const { positions } = await load(text, "graphml");
        expect(positions?.usable).toBe(false);
        const note = positions?.notes.find((n) => n.code === POSITION_ISSUE.NOT_READ);
        expect(note?.params.samples).toEqual(["x", "y"]);
    });

    it("W_POSITIONS_NOT_READ: CSV x / y columns are not read", async () => {
        const { positions } = await load("id,x,y\na,1,2\nb,3,4\n", "csv");
        expect(codes(positions)).toEqual([POSITION_ISSUE.NOT_READ]);
    });

    it("a file with no positions and no position-like columns gives null", async () => {
        const { positions } = await load(readFileSync(join(CORPUS, "gml", "karate.gml")), "gml");
        expect(positions).toBeNull();
    });

    /**
     * A snapshot with a position column whose extra is given, for the codes no sample file shows.
     * @param extra - the column's extra
     * @param rows - each row's coordinate, or null
     * @param more - extra columns: name -> values
     * @returns the snapshot
     */
    function built(
        extra: Record<string, unknown>,
        rows: readonly (readonly number[] | null)[],
        more: Record<string, readonly number[]> = {},
    ): GraphSnapshot {
        const b = new GraphBuilder({ directed: true });
        const pos = b.declareNodeColumn({ name: "position", dtype: "f64", components: 3, role: "position", extra });
        const others = Object.keys(more).map((name) => b.declareNodeColumn({ name, dtype: "f64" }));
        rows.forEach((row, i) => {
            const node = b.addNode(`n${i}`);
            if (row !== null) {
                b.setNodeValue(pos, node, row);
            }
            Object.values(more).forEach((values, k) => b.setNodeValue(others[k], node, values[i]));
        });
        return b.freeze();
    }

    const bare = { format: "test" } as GraphImporter;
    const noReport = { issues: [] } as unknown as ImportReport;

    it("W_POSITION_NON_FINITE: an infinite coordinate is unplaced", () => {
        const p = extractPositions(
            bare,
            built({}, [
                [1, 2, 0],
                [Infinity, 0, 0],
            ]),
            noReport,
        );
        expect(codes(p)).toEqual([POSITION_ISSUE.NON_FINITE, POSITION_ISSUE.PARTIAL]);
        expect(p?.placed).toBe(1);
    });

    it("W_POSITION_ANCHOR_NO_SIZE: a top-left corner with no size is left where it is", () => {
        const p = extractPositions(
            bare,
            built({ anchor: "top-left", yAxis: "down" }, [
                [1, 2, 0],
                [3, 4, 0],
            ]),
            noReport,
        );
        expect(codes(p)).toEqual([POSITION_ISSUE.ANCHOR_NO_SIZE]);
        expect(Array.from(p?.coords ?? [])).toEqual([1, -2, 0, 3, -4, 0]);
    });

    it("W_POSITION_OTHER_VIEWS: CX view columns after the first", () => {
        const b = new GraphBuilder({ directed: true });
        const pos = b.declareNodeColumn({ name: "position", dtype: "f64", components: 3, role: "position" });
        const view2 = b.declareNodeColumn({ name: "position@2", dtype: "f64", components: 3 });
        const node = b.addNode("a");
        b.setNodeValue(pos, node, [1, 2, 0]);
        b.setNodeValue(view2, node, [5, 6, 0]);
        const p = extractPositions(bare, b.freeze(), noReport);
        expect(p?.notes.map((n) => [n.code, n.params.samples])).toEqual([[POSITION_ISSUE.OTHER_VIEWS, ["position@2"]]]);
    });

    it("notes carry graph-io's English only in message", () => {
        const p = extractPositions(bare, built({}, [[1, 2, 0], null]), noReport);
        expect(p?.notes[0]).toEqual({
            code: POSITION_ISSUE.PARTIAL,
            params: { count: 1, samples: [] },
            elements: [1],
            message: "nodes have no position (1)",
        });
    });

    it("aborts with the signal's reason", () => {
        const controller = new AbortController();
        controller.abort(new Error("stop"));
        expect(() => extractPositions(bare, built({}, [[1, 2, 0]]), noReport, { signal: controller.signal })).toThrow(
            "stop",
        );
    });

    it("an importer hook wins over the column's extra", () => {
        const hooked = {
            format: "test",
            positions: () => ({ yAxis: "down", units: "px" }),
        } as unknown as GraphImporter;
        const p = extractPositions(hooked, built({ yAxis: "up" }, [[1, 2, 0]]), noReport);
        expect([p?.source.yAxis, p?.units, Array.from(p?.coords ?? [])]).toEqual(["down", "px", [1, -2, 0]]);
    });

    it("a top-left anchor uses the size columns the extra names", () => {
        const snapshot = built(
            { anchor: "top-left", yAxis: "down", width: "w", height: "h" },
            [
                [0, 0, 0],
                [10, 10, 0],
            ],
            { w: [4, 6], h: [2, 8] },
        );
        const p = extractPositions(bare, snapshot, noReport);
        expect(Array.from(p?.coords ?? [])).toEqual([2, -1, 0, 13, -14, 0]);
        expect(p?.medianNodeSize).toBe(5);
    });
});
