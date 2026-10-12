import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { importGraph } from "../../src/registry.js";
import {
    cx1Definition,
    type CytoscapeBypass,
    cytoscapeCx2Aspects,
    cytoscapeCxAspect,
    type CytoscapeDialect,
    type CytoscapeElements,
    cytoscapeRules,
    type CytoscapeStyle,
    cytoscapeStyleFromCx,
    cytoscapeStyleFromCx2,
    cytoscapeVizmapXml,
    emitCytoscapeStyle,
    emptyCytoscapeStyle,
    type ExtractedStyles,
    mappingFromCx1,
    mappingFromCx2,
    normalizeVisualProperties,
    parseCx1Definition,
    resolveCytoscape,
    resolveCytoscapeBypasses,
    resolveStyles,
    StyleBudget,
    type StyleColumn,
    styleFingerprint,
    StyleNotes,
    type StyleRule,
    type StyleTarget,
    type StyleValue,
    typedKey,
} from "../../src/styles/index.js";

const FIXTURES = resolve(import.meta.dirname, "../conformance/fixtures");

/** One column of the golden file: `[value, run length]` pairs. */
type Runs = [StyleValue | null, number][];

interface Golden {
    readonly files: Record<
        string,
        { node: Record<string, Runs>; edge: Record<string, Runs>; background: string | null }
    >;
}

const GOLDEN = JSON.parse(readFileSync(resolve(import.meta.dirname, "cytoscape-golden.json"), "utf8")) as Golden;

/** A run-length encoded column, expanded. */
function expand(runs: Runs): (StyleValue | null)[] {
    return runs.flatMap(([v, k]) => new Array<StyleValue | null>(k).fill(v));
}

/** An element's attribute value as a plain value. */
function cell(s: GraphSnapshot, target: StyleTarget, name: string, i: number): unknown {
    const table = target === "node" ? s.nodes : s.edges;
    if (!table.names().includes(name)) {
        return null;
    }
    const v: unknown = table.value(name, i);
    if (v === undefined || v === null) {
        return null;
    }
    if (typeof v === "bigint") {
        return Number(v);
    }
    if (ArrayBuffer.isView(v)) {
        return Array.from(v as unknown as ArrayLike<number>);
    }
    return v;
}

/** The elements of a target with their bypass columns (the columns of an importer's bypass namespace). */
function elementsOf(s: GraphSnapshot, target: StyleTarget, namespace: string): CytoscapeElements {
    const table = target === "node" ? s.nodes : s.edges;
    const n = target === "node" ? s.nodeCount : s.edgeCount;
    const vpColumns = table.names().filter((c) => table.get(c)?.meta.origin?.namespace === namespace);
    const bypasses: CytoscapeBypass[] = [];
    for (let i = 0; i < n; i++) {
        let m: Map<string, unknown> | null = null;
        for (const c of vpColumns) {
            const v = cell(s, target, c, i);
            if (v !== null) {
                m ??= new Map();
                m.set(table.get(c)?.meta.origin?.id ?? c, v);
            }
        }
        bypasses.push(m);
    }
    return { count: n, value: (c, i) => cell(s, target, c, i), bypasses };
}

/** A fixture's style, from what the importer kept, as the CX and CX2 readers build it. */
function styleOf(s: GraphSnapshot, format: string): CytoscapeStyle {
    const extra = (s.meta.extra ?? {}) as Record<string, Record<string, unknown> | undefined>;
    if (format === "cx") {
        const vps = extra.cx?.cyVisualProperties;
        return cytoscapeStyleFromCx(Array.isArray(vps) ? vps : []);
    }
    const opaque = (extra.cx2?.opaque ?? {}) as Record<string, unknown>;
    return cytoscapeStyleFromCx2(opaque.visualProperties, opaque.visualEditorProperties);
}

describe("Cytoscape resolution reproduces the prototype on the CX and CX2 fixtures", () => {
    const files = Object.keys(GOLDEN.files);

    it("covers every CX and CX2 fixture with a style", () => {
        expect(files.length).toBeGreaterThanOrEqual(30);
    });

    it.each(files)("%s", async (key) => {
        const format = key.split("/")[0];
        const path = resolve(FIXTURES, key);
        const result = await importGraph(new Uint8Array(readFileSync(path)), { format, filename: basename(path) });
        const s = result.snapshot;
        const style = styleOf(s, format);
        const want = GOLDEN.files[key];
        for (const target of ["node", "edge"] as const) {
            const got = resolveCytoscape(target, style, elementsOf(s, target, `${format}.bypass`));
            const kept = Object.fromEntries(
                Object.entries(got).filter(([, col]) => col?.some((v) => v !== null) === true),
            );
            const expected = Object.fromEntries(Object.entries(want[target]).map(([p, runs]) => [p, expand(runs)]));
            expect(kept).toEqual(expected);
        }
    });
});

describe("mapping definitions", () => {
    it("reads a CX version 1 definition with escaped commas and typed keys", () => {
        const m = mappingFromCx1({
            type: "DISCRETE",
            definition: "COL=a,,b,T=integer,K=0=1,V=0=#FF0000,K=1=2,V=1=x,,y",
        });
        expect(m).toEqual({
            kind: "discrete",
            column: "a,b",
            type: "integer",
            table: [
                [1, "#FF0000"],
                [2, "x,y"],
            ],
        });
    });

    it("never allocates an index as an array length: K=4294967294= is ignored and noted", () => {
        const notes = new StyleNotes();
        const d = parseCx1Definition("COL=a,T=string,K=4294967294=x,V=4294967294=y,K=0=p,V=0=q", notes, "node");
        expect(d.entries.get("K")?.size).toBe(1);
        expect(d.entries.get("K")?.get(0)).toBe("p");
        expect(notes.list().map((n) => n.code)).toEqual(["W_STYLE_BAD_MAPPING"]);
        const m = mappingFromCx1({ type: "DISCRETE", definition: "COL=a,T=string,K=4294967294=x,V=4294967294=y" });
        expect(m).toEqual({ kind: "discrete", column: "a", type: "string", table: [] });
    });

    it("types keys by the attribute type", () => {
        expect(typedKey("3", "integer")).toBe(3);
        expect(typedKey("3", "list_of_double")).toBe(3);
        expect(typedKey("3", "string")).toBe("3");
        expect(typedKey("TRUE", "boolean")).toBe(true);
        expect(typedKey("x", "boolean")).toBe("x");
        expect(typedKey({}, "string")).toBeNull();
    });

    it("reads CX2 continuous intervals as points", () => {
        const m = mappingFromCx2({
            type: "CONTINUOUS",
            definition: {
                attribute: "w",
                map: [
                    { max: 0, maxVPValue: 1, includeMax: false },
                    { min: 0, max: 10, minVPValue: 2, maxVPValue: 20, includeMin: true, includeMax: true },
                    { min: 10, minVPValue: 30, includeMin: false },
                ],
            },
        });
        expect(m).toEqual({
            kind: "continuous",
            column: "w",
            type: null,
            points: [
                { at: 0, below: 1, value: 2, above: 2 },
                { at: 10, below: 20, value: 20, above: 30 },
            ],
        });
    });
});

/** Elements with one attribute column. */
function elements(values: readonly unknown[], column = "c", bypasses?: CytoscapeBypass[]): CytoscapeElements {
    return { count: values.length, value: (c, i) => (c === column ? values[i] : null), bypasses };
}

describe("resolution", () => {
    it("takes a bypass over a mapping over a default", () => {
        const style = emptyCytoscapeStyle();
        style.node.defaults.set("NODE_FILL_COLOR", "#000000");
        style.node.mappings.set("NODE_FILL_COLOR", {
            kind: "discrete",
            column: "c",
            type: "string",
            table: [["a", "#FF0000"]],
        });
        const got = resolveCytoscape(
            "node",
            style,
            elements(["a", "b", "a"], "c", [null, null, new Map([["NODE_FILL_COLOR", "#00FF00"]])]),
        );
        expect(got.fill).toEqual(["#ff0000", "#000000", "#00ff00"]);
    });

    it("matches a list attribute by its first item with an entry", () => {
        const style = emptyCytoscapeStyle();
        style.node.mappings.set("NODE_SHAPE", {
            kind: "discrete",
            column: "c",
            type: "string",
            table: [
                ["b", "DIAMOND"],
                ["a", "TRIANGLE"],
            ],
        });
        const got = resolveCytoscape("node", style, elements([["x", "a", "b"], ["z"]]));
        expect(got.shape).toEqual(["triangle", null]);
    });

    it("applies nodeSizeLocked and arrowColorMatchesEdge", () => {
        const style = emptyCytoscapeStyle();
        style.node.dependencies.set("nodeSizeLocked", true);
        style.node.defaults.set("NODE_WIDTH", "80");
        style.node.defaults.set("NODE_SIZE", "30");
        style.edge.dependencies.set("arrowColorMatchesEdge", true);
        style.edge.defaults.set("EDGE_UNSELECTED_PAINT", "#112233");
        style.edge.defaults.set("EDGE_STROKE_UNSELECTED_PAINT", "#445566");
        style.edge.defaults.set("EDGE_SOURCE_ARROW_UNSELECTED_PAINT", "#778899");
        expect(resolveCytoscape("node", style, elements([1])).width).toEqual([30]);
        const edge = resolveCytoscape("edge", style, elements([1]));
        expect([edge.color, edge.sourceArrowColor, edge.targetArrowColor]).toEqual([
            ["#112233"],
            ["#112233"],
            ["#112233"],
        ]);
        const { rules } = cytoscapeRules("node", style, elements([1]));
        expect(rules[0].set).toMatchObject({ width: 30, height: 30 });
    });

    it("reads both opacity scales", () => {
        const style = emptyCytoscapeStyle();
        style.node.defaults.set("NODE_TRANSPARENCY", "51");
        style.edge.defaults.set("EDGE_OPACITY", 0.5);
        expect(resolveCytoscape("node", style, elements([1])).fillOpacity).toEqual([0.2]);
        expect(resolveCytoscape("edge", style, elements([1])).opacity).toEqual([0.5]);
    });

    it("fills what the style leaves unset with the chosen tool's defaults", () => {
        const style = emptyCytoscapeStyle();
        expect(resolveCytoscape("node", style, elements([1])).fill).toBeUndefined();
        expect(resolveCytoscape("node", style, elements([1]), { defaults: "cytoscape" }).fill).toEqual(["#89d0f5"]);
        expect(resolveCytoscape("node", style, elements([1]), { defaults: "cytoscape-fallbacks" }).fill).toEqual([
            "#c80000",
        ]);
    });

    it("resolves a 10,000-key discrete table with one key uncovered in a counted linear pass", () => {
        const keys = 10_000;
        const style = emptyCytoscapeStyle();
        style.node.defaults.set("NODE_LABEL", "none");
        const table: [string, unknown][] = [];
        for (let k = 0; k < keys; k++) {
            if (k !== 4242) {
                table.push([`k${k}`, `v${k}`]);
            }
        }
        style.node.mappings.set("NODE_LABEL", { kind: "discrete", column: "c", type: "string", table });
        const values = Array.from({ length: keys }, (_, i) => `k${i}`);
        const budget = new StyleBudget();
        const got = resolveCytoscape("node", style, elements(values), { budget });
        expect(got.label?.[4242]).toBe("none");
        expect(got.label?.[17]).toBe("v17");
        // linear: a fixed number of operations per element and per table entry
        expect(budget.used("node")).toBeLessThan(40 * keys);
    });

    it("notes visual properties no neutral property carries", () => {
        const notes = new StyleNotes();
        const style = emptyCytoscapeStyle();
        style.node.defaults.set("NODE_LABEL_ROTATION_SPEED", "3");
        resolveCytoscape("node", style, elements([1]), { notes });
        expect(notes.list().map((n) => n.code)).toContain("W_STYLE_NOT_CARRIED");
    });
});

describe("element graphics (XGMML)", () => {
    it("normalizes old identifiers and reads every element's own values", () => {
        const notes = new StyleNotes();
        const a = normalizeVisualProperties(
            "node",
            { fill: "#ff0000", w: "20", h: "10", type: "ELLIPSE", nodeTransparency: "0.5", odd: "x" },
            notes,
        );
        const b = normalizeVisualProperties(
            "node",
            { cytoscapeNodeGraphicsAttributes: { nodeLabelFont: "Serif-1-12" }, size: "33" },
            notes,
        );
        const got = resolveCytoscapeBypasses("node", [a, b], { notes });
        expect(got.fill).toEqual(["#ff0000", null]);
        expect(got.width).toEqual([20, null]);
        expect(got.shape).toEqual(["ellipse", null]);
        expect(got.fillOpacity).toEqual([0.501961, null]);
        expect(got.labelFont).toEqual([null, "serif"]);
        expect(got.labelWeight).toEqual([null, "bold"]);
        expect(notes.list().map((n) => n.code)).toContain("W_STYLE_NOT_CARRIED");
    });

    it("walks nesting with a depth limit, never recursion", () => {
        let deep: Record<string, unknown> = { fill: "#00ff00" };
        for (let i = 0; i < 10_000; i++) {
            deep = { nested: deep };
        }
        const notes = new StyleNotes();
        expect(normalizeVisualProperties("node", deep, notes).has("NODE_FILL_COLOR")).toBe(false);
        expect(notes.list().map((n) => n.code)).toEqual(["W_STYLE_NESTING"]);
    });
});

// ------------------------------------------------------------------ emit, then read back

/** A seeded generator. */
function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A graph of n nodes in a ring, with a category, a number and a color column. */
function graph(n: number, rand: () => number): GraphSnapshot {
    const b = new GraphBuilder({ directed: true });
    const cat = b.declareNodeColumn({ name: "cat", dtype: "string" });
    const num = b.declareNodeColumn({ name: "num", dtype: "f64" });
    const hue = b.declareNodeColumn({ name: "hue", dtype: "string" });
    const kind = b.declareEdgeColumn({ name: "kind", dtype: "string" });
    const cats = ["a", "b", "c", "d"];
    for (let i = 0; i < n; i++) {
        const v = b.addNode(`n${String(i)}`);
        b.setNodeValue(cat, v, cats[Math.floor(rand() * 4)]);
        b.setNodeValue(num, v, Math.round(rand() * 1000) / 10);
        b.setNodeValue(
            hue,
            v,
            `#${Math.floor(rand() * 0xffffff)
                .toString(16)
                .padStart(6, "0")}`,
        );
    }
    for (let i = 0; i < n; i++) {
        const e = b.addEdgeByIndex(i, (i + 1) % n);
        b.setEdgeValue(kind, e, cats[i % 2]);
    }
    return b.freeze();
}

/** Styles over a graph, from rules. */
function extracted(s: GraphSnapshot, rules: StyleRule[]): ExtractedStyles {
    return {
        styles: {
            version: 1,
            source: { format: "test", dialect: null, tool: null },
            units: { length: "px" },
            graph: { background: "#fafafa" },
            rules,
            notes: [],
        },
        columns: { node: new Map(), edge: new Map() },
        features: { node: [], edge: [] },
        fingerprint: styleFingerprint(s),
    };
}

/** The style as the file holds it and read back: through the file form of the dialect. */
function throughFile(style: CytoscapeStyle, dialect: CytoscapeDialect): CytoscapeStyle {
    if (dialect === "desktop") {
        return cytoscapeStyleFromCx(JSON.parse(JSON.stringify(cytoscapeCxAspect(style))) as unknown[]);
    }
    const a = JSON.parse(JSON.stringify(cytoscapeCx2Aspects(style))) as ReturnType<typeof cytoscapeCx2Aspects>;
    return cytoscapeStyleFromCx2(a.visualProperties, a.visualEditorProperties);
}

/** Elements of a graph target with emitted bypasses and added columns. */
function emittedElements(
    s: GraphSnapshot,
    target: StyleTarget,
    bypasses: CytoscapeBypass[],
    added: ReadonlyMap<string, readonly unknown[]>,
): CytoscapeElements {
    return {
        count: target === "node" ? s.nodeCount : s.edgeCount,
        value: (c, i) => added.get(c)?.[i] ?? cell(s, target, c, i),
        bypasses,
    };
}

/** Random rules of every mapping kind over every element. */
function randomRules(rand: () => number): StyleRule[] {
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
    const colors = ["#ff0000", "#00ff00", "#0000ff", "#123456", "#abcdef"];
    const shapes = ["ellipse", "rectangle", "round-rectangle", "diamond", "triangle"];
    const at = Math.round(rand() * 50);
    return [
        {
            id: "node.defaults",
            target: "node",
            role: "defaults",
            origin: "declared",
            where: { all: true },
            set: {
                fill: pick(colors),
                shape: pick(shapes),
                width: 10 + Math.round(rand() * 40),
                labelFont: "serif",
                labelWeight: "bold",
                labelItalic: false,
            },
        },
        {
            id: "node.discrete.cat",
            target: "node",
            role: "mapping",
            origin: "declared",
            where: { all: true },
            map: {
                shape: {
                    kind: "discrete",
                    by: { data: "cat" },
                    table: [
                        ["a", pick(shapes)],
                        ["b", pick(shapes)],
                    ],
                },
                borderColor: {
                    kind: "discrete",
                    by: { data: "cat" },
                    table: [
                        ["c", pick(colors)],
                        ["d", pick(colors)],
                    ],
                },
            },
        },
        {
            id: "node.continuous.num",
            target: "node",
            role: "mapping",
            origin: "declared",
            where: { all: true },
            map: {
                height: {
                    kind: "continuous",
                    by: { data: "num" },
                    points: [
                        { at, below: 5, value: 10, above: 10 },
                        { at: at + 30, below: 40, value: 40, above: 60 },
                    ],
                },
                fill: {
                    kind: "continuous",
                    by: { data: "num" },
                    points: [
                        // Cytoscape's value at a point is the one just below or just above it
                        ((below: string, above: string) => ({ at, below, value: pick([below, above]), above }))(
                            pick(colors),
                            pick(colors),
                        ),
                        { at: at + 30, below: "#000000", value: "#ffffff", above: "#ffffff" },
                    ],
                },
            },
        },
        {
            id: "node.passthrough.hue",
            target: "node",
            role: "mapping",
            origin: "declared",
            where: { all: true },
            map: { labelColor: { kind: "passthrough", by: { data: "hue" } } },
        },
        {
            id: "edge.defaults",
            target: "edge",
            role: "defaults",
            origin: "declared",
            where: { all: true },
            set: {
                color: pick(colors),
                width: 1 + Math.round(rand() * 5),
                targetArrow: pick(["triangle", "vee", "tee", "none"]),
            },
        },
        {
            id: "edge.discrete.kind",
            target: "edge",
            role: "mapping",
            origin: "declared",
            where: { all: true },
            map: {
                lineStyle: {
                    kind: "discrete",
                    by: { data: "kind" },
                    table: [
                        ["a", "dashed"],
                        ["b", "dotted"],
                    ],
                },
            },
        },
    ];
}

/** The rules a target's translation gives, without the notes-only differences of rule order. */
function translated(
    style: CytoscapeStyle,
    s: GraphSnapshot,
    target: StyleTarget,
    out: ReturnType<typeof emitCytoscapeStyle>,
): StyleRule[] {
    const els = emittedElements(s, target, out.bypasses[target], out.columns[target]);
    return cytoscapeRules(target, style, els).rules;
}

/** Rules keyed by their mapped properties, ignoring generated ids and the grouping of properties into rules. */
function byProperty(rules: readonly StyleRule[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const r of rules) {
        for (const [p, v] of Object.entries(r.set ?? {})) {
            out[`set.${p}`] = v;
        }
        for (const [p, m] of Object.entries(r.map ?? {})) {
            out[`map.${p}`] = m;
        }
    }
    return out;
}

describe("emit then translate returns the same rules", () => {
    for (const dialect of ["desktop", "cx2"] as const) {
        it(`for every mapping kind (${dialect}, 40 random styles)`, () => {
            for (let seed = 1; seed <= 40; seed++) {
                const rand = rng(seed);
                const s = graph(30, rand);
                const rules = randomRules(rand);
                const ex = extracted(s, rules);
                const notes = new StyleNotes();
                const out = emitCytoscapeStyle(ex, s, { dialect, notes });
                expect(notes.list()).toEqual([]);
                const back = throughFile(out.style, dialect);
                for (const target of ["node", "edge"] as const) {
                    expect(out.bypasses[target].every((b) => b === null)).toBe(true);
                    expect(byProperty(translated(back, s, target, out))).toEqual(
                        byProperty(rules.filter((r) => r.target === target)),
                    );
                }
            }
        });
    }

    it("draws exactly what the rules give, with bypasses for what a Cytoscape style cannot say", () => {
        for (const dialect of ["desktop", "cx2"] as const) {
            for (let seed = 1; seed <= 20; seed++) {
                const rand = rng(seed);
                const s = graph(40, rand);
                const rules: StyleRule[] = [
                    ...randomRules(rand),
                    // a rule over a group, and a second mapping of the same property
                    {
                        id: "group",
                        target: "node",
                        role: "group",
                        origin: "inferred",
                        where: { eq: [{ data: "cat" }, "b"] },
                        set: { fill: "#010203", labelWeight: "normal" },
                    },
                    {
                        id: "ramp",
                        target: "node",
                        role: "mapping",
                        origin: "declared",
                        where: { all: true },
                        map: {
                            borderWidth: {
                                kind: "continuous",
                                by: { data: "num" },
                                points: [{ at: cell(s, "node", "num", 3) as number, below: 1, value: 7, above: 3 }],
                            },
                        },
                    },
                    {
                        id: "op",
                        target: "node",
                        role: "mapping",
                        origin: "declared",
                        where: { all: true },
                        map: { fillOpacity: { kind: "passthrough", by: { style: "op" } } },
                    },
                ];
                const ex = extracted(s, rules);
                const ops: StyleColumn = Array.from({ length: s.nodeCount }, (_, i) =>
                    i % 3 === 0 ? null : (i % 5) / 5,
                );
                (ex.columns.node as Map<string, StyleColumn>).set("op", ops);
                const notes = new StyleNotes();
                const out = emitCytoscapeStyle(ex, s, { dialect, notes });
                expect(notes.list().map((n) => n.code)).toContain("W_STYLE_LAYER_FLATTENED");
                const back = throughFile(out.style, dialect);
                for (const target of ["node", "edge"] as const) {
                    const els = emittedElements(s, target, out.bypasses[target], out.columns[target]);
                    const drawn = resolveCytoscape(target, back, els);
                    for (const p of [
                        "fill",
                        "shape",
                        "width",
                        "height",
                        "borderColor",
                        "labelColor",
                        "fillOpacity",
                        "borderWidth",
                        "labelFont",
                        "labelWeight",
                        "color",
                        "lineStyle",
                        "targetArrow",
                    ]) {
                        const want = resolveStyles(ex, target, p as never, s);
                        if (want.every((v) => v === null)) {
                            continue;
                        }
                        expect([target, p, drawn[p]]).toEqual([target, p, want]);
                    }
                }
            }
        }
    });

    it("notes every property Cytoscape cannot hold", () => {
        const s = graph(3, rng(1));
        const ex = extracted(s, [
            {
                id: "x",
                target: "node",
                role: "defaults",
                origin: "declared",
                where: { all: true },
                set: { opacity: 0.5, "graphty:glow": 2, shape: "star" },
            },
            {
                id: "y",
                target: "edge",
                role: "defaults",
                origin: "declared",
                where: { all: true },
                set: { sourceLabel: "s", tooltip: "t" },
            },
        ]);
        const desktop = new StyleNotes();
        emitCytoscapeStyle(ex, s, { dialect: "desktop", notes: desktop });
        const codes = (n: StyleNotes): string[] =>
            n
                .list()
                .map((x) => `${x.code} ${String(x.params.target)} ${String(x.params.property)}`)
                .sort();
        expect(codes(desktop)).toEqual([
            "W_STYLE_APPROXIMATED node shape",
            "W_STYLE_NOT_WRITTEN edge sourceLabel",
            "W_STYLE_NOT_WRITTEN node graphty:glow",
            "W_STYLE_NOT_WRITTEN node opacity",
        ]);
        const cx2 = new StyleNotes();
        emitCytoscapeStyle(ex, s, { dialect: "cx2", notes: cx2 });
        expect(codes(cx2)).toContain("W_STYLE_NOT_WRITTEN edge tooltip");
    });

    it("writes another program's shape as its nearest Cytoscape shape, and Cytoscape's own other values as they are", () => {
        const s = graph(3, rng(1));
        const ex = extracted(s, [
            {
                id: "x",
                target: "node",
                role: "defaults",
                origin: "declared",
                where: { all: true },
                set: { shape: "other:invtrapezium", borderStyle: "other:cylinder" },
            },
            {
                id: "y",
                target: "edge",
                role: "defaults",
                origin: "declared",
                where: { all: true },
                set: {
                    targetArrow: "other:open-square",
                    sourceArrow: "other:lcurve",
                    lineStyle: "other:backward-slash",
                },
            },
        ]);
        const desktop = new StyleNotes();
        const out = emitCytoscapeStyle(ex, s, { dialect: "desktop", notes: desktop });
        expect(out.style.node.defaults.get("NODE_SHAPE")).toBe("PARALLELOGRAM");
        expect(out.style.node.defaults.get("NODE_BORDER_LINE_TYPE")).toBe("SOLID");
        expect(out.style.edge.defaults.get("EDGE_TARGET_ARROW_SHAPE")).toBe("OPEN_SQUARE");
        expect(out.style.edge.defaults.get("EDGE_SOURCE_ARROW_SHAPE")).toBe("NONE");
        expect(out.style.edge.defaults.get("EDGE_LINE_TYPE")).toBe("BACKWARD_SLASH");
        const approximated = desktop
            .list()
            .filter((n) => n.code === "W_STYLE_APPROXIMATED")
            .map((n) => String(n.params.property));
        expect(approximated).toEqual(expect.arrayContaining(["shape", "borderStyle", "sourceArrow"]));
        const cx2 = emitCytoscapeStyle(ex, s, { dialect: "cx2" });
        expect(cx2.style.node.defaults.get("NODE_SHAPE")).toBe("parallelogram");
        expect(cx2.style.edge.defaults.get("EDGE_TARGET_ARROW_SHAPE")).toBe("open-square");
    });

    it("writes a mapping over a style column or a degree into an added column", () => {
        const s = graph(5, rng(2));
        const ex = extracted(s, [
            {
                id: "d",
                target: "node",
                role: "mapping",
                origin: "inferred",
                where: { all: true },
                map: { width: { kind: "passthrough", by: { computed: "degree" } } },
            },
        ]);
        const out = emitCytoscapeStyle(ex, s, { dialect: "desktop" });
        expect(out.columns.node.get("graphty.style.node.degree")).toEqual([2, 2, 2, 2, 2]);
        const back = cytoscapeRules(
            "node",
            throughFile(out.style, "desktop"),
            emittedElements(s, "node", out.bypasses.node, out.columns.node),
            {
                columnRef: (c) => (c === "graphty.style.node.degree" ? { computed: "degree" } : { data: c }),
            },
        );
        expect(back.rules[0].map).toEqual({ width: { kind: "passthrough", by: { computed: "degree" } } });
    });
});

describe("file forms", () => {
    it("writes CX version 1 definitions that read back", () => {
        const def = cx1Definition({ kind: "discrete", column: "a,b", type: "string", table: [["x,y", "#FF0000"]] });
        expect(def).toBe("COL=a,,b,T=string,K=0=x,,y,V=0=#FF0000");
        expect(mappingFromCx1({ type: "DISCRETE", definition: def })).toEqual({
            kind: "discrete",
            column: "a,b",
            type: "string",
            table: [["x,y", "#FF0000"]],
        });
    });

    it("writes a session visual style with escaped attributes", () => {
        const style = emptyCytoscapeStyle();
        style.node.defaults.set("NODE_FILL_COLOR", "#FF0000");
        style.node.dependencies.set("nodeSizeLocked", false);
        style.node.mappings.set("NODE_LABEL", { kind: "passthrough", column: 'a"<b', type: "string" });
        style.edge.mappings.set("EDGE_WIDTH", {
            kind: "continuous",
            column: "w",
            type: "double",
            points: [{ at: 1, below: "1", value: "2", above: "3" }],
        });
        const xml = cytoscapeVizmapXml(style, "net & co");
        expect(xml).toContain('<visualStyle name="net &amp; co">');
        expect(xml).toContain('<dependency name="nodeSizeLocked" value="false"/>');
        expect(xml).toContain('<visualProperty name="NODE_FILL_COLOR" default="#FF0000"/>');
        expect(xml).toContain('<passthroughMapping attributeName="a&quot;&lt;b" attributeType="string"/>');
        expect(xml).toContain(
            '<continuousMappingPoint attrValue="1" lesserValue="1" equalValue="2" greaterValue="3"/>',
        );
    });
});
