/**
 * DOT styles: every node, cluster and edge read with Graphviz's rules and Graphviz's defaults, checked against what
 * Graphviz itself draws for the gallery files (golden values from `dot -Txdot` and `dot -Tplain`), node lists
 * (`a, b`), and styles written back as Graphviz attributes with the `graphty.styles` block as a quoted graph
 * attribute.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { DOT_STYLE_BLOCK_ATTRIBUTE } from "../../../src/formats/dot/index.js";
import { createRegistry } from "../../../src/registry.js";
import {
    type ExtractedStyles,
    extractStyles,
    featuresOf,
    planStyles,
    resolveStyles,
    styleFingerprint,
    type StyleProperty,
    type StyleRule,
    type StyleTarget,
} from "../../../src/styles/internal.js";
import { charactersExamined } from "../../helpers/work-meter.js";
import { editDotNodeFill, replaceDotBlock } from "../../styles/formats/dot.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/dot");
const GENERATED = join(CORPUS, "generated");
const GOLDEN = join(import.meta.dirname, "graphviz-golden.json");

/**
 * Imports a DOT document with its styles.
 * @param doc - the document
 * @param toolDefaults - whether Graphviz's defaults are added
 * @returns the import result, with styles
 */
async function load(doc: string | Uint8Array, toolDefaults = true) {
    const result = await registry.importGraph(doc, { format: "dot", styles: { toolDefaults }, errorLimit: Infinity });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

/**
 * What graphty draws for one property of every element.
 * @param ex - the styles
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param property - the property
 * @returns the values by element index
 */
function drawn(ex: ExtractedStyles, snapshot: GraphSnapshot, target: StyleTarget, property: string) {
    return resolveStyles(ex, target, property as StyleProperty, snapshot);
}

/**
 * Each node's drawn value of a property, by node id.
 * @param ex - the styles
 * @param snapshot - the graph
 * @param property - the property
 * @returns the values by id
 */
function byId(ex: ExtractedStyles, snapshot: GraphSnapshot, property: string): Map<string, unknown> {
    const values = drawn(ex, snapshot, "node", property);
    return new Map(values.map((v, i) => [String(snapshot.ids.idOf(i)), v]));
}

const file = (name: string): Uint8Array => new Uint8Array(readFileSync(join(GENERATED, name)));
const plain = (ex: ExtractedStyles): StyleRule[] => JSON.parse(JSON.stringify(ex.styles.rules)) as StyleRule[];
const codes = (ex: ExtractedStyles): string[] => ex.styles.notes.map((n) => n.code);

describe("DOT styles: Graphviz's rules", () => {
    it("labels every node with its name, escapes applied in Graphviz's two passes; a point and a cluster show none", async () => {
        const { snapshot, styles } = await load(String.raw`digraph G {
            a; "x\ny"; b [label="\N in \G"]; p [shape=point];
            subgraph cluster_k { c }
            a -> b [label="\E: \T to \H", headlabel="h\lx"];
            r [shape=record, label="<f0> left|<f1> mid\|dle|{x|y}"];
            h [label=<<b>bold</b> &amp; plain<br/>next>];
        }`);
        const label = byId(styles, snapshot, "label");
        expect(label.get("a")).toBe("a");
        expect(label.get(String.raw`x\ny`)).toBe("x\ny");
        expect(label.get("b")).toBe("b in G");
        expect(label.get("p")).toBeNull();
        expect(label.get("cluster_k")).toBeNull();
        expect(label.get("r")).toBe("left | mid|dle | x | y");
        expect(label.get("h")).toBe("bold & plain\nnext");
        const e = drawn(styles, snapshot, "edge", "label");
        expect(e[0]).toBe("a->b: a to b");
        expect(drawn(styles, snapshot, "edge", "targetLabel")[0]).toBe("h\nx");
        expect(codes(styles)).toEqual(expect.arrayContaining(["W_STYLE_HTML_LABEL", "W_STYLE_RECORD_LABEL"]));
        const rule = styles.styles.rules.find((r) => r.id === "node.tool.name-label");
        expect(rule?.facts?.reason).toBe("NODE_NAME");
    });

    it("fills as Graphviz does: filled and radial any shape, striped boxes only, wedged ellipses only, a point always", async () => {
        const { snapshot, styles } = await load(`digraph {
            f [style=filled, fillcolor=red]; r [style=radial, fillcolor=red];
            sb [shape=box, style=striped, fillcolor=red]; se [shape=ellipse, style=striped, fillcolor=red];
            we [style=wedged, fillcolor=red]; wb [shape=box, style=wedged, fillcolor=red];
            c [style=filled, color=blue]; g [style=filled, fillcolor=""]; u [fillcolor=red];
            p [shape=point]; pc [shape=point, color=green];
        }`);
        const fill = byId(styles, snapshot, "fill");
        const opacity = byId(styles, snapshot, "fillOpacity");
        const shown = (id: string): unknown => (opacity.get(id) === 0 ? null : fill.get(id));
        expect(["f", "r", "sb", "we"].map(shown)).toEqual(["#ff0000", "#ff0000", "#ff0000", "#ff0000"]);
        expect(["se", "wb", "u"].map(shown)).toEqual([null, null, null]);
        expect(shown("c")).toBe("#0000ff");
        expect(shown("g")).toBe("#d3d3d3");
        expect(shown("p")).toBe("#000000");
        expect(shown("pc")).toBe("#00ff00");
        expect(byId(styles, snapshot, "width").get("p")).toBe(3.6);
        expect(codes(styles)).toContain("W_STYLE_UNFILLED");
    });

    it("reads colors with Graphviz's rules: scheme scope, unknown is black, none and invis transparent, lists", async () => {
        const { snapshot, styles } = await load(`digraph {
            colorscheme=blues9; bgcolor=3;
            a [style=filled, colorscheme=blues9, fillcolor=7, color=red];
            b [style=filled, fillcolor=7];
            c [style=filled, fillcolor=nosuchcolor];
            d [style=filled, fillcolor=none, color=invis];
            e [style=filled, fillcolor="red:blue", color="red;0.3:blue", fontcolor="green:blue"];
            f [color="/accent3/2"];
            a -> b [color="red:blue"]; b -> c [color=none];
        }`);
        expect(styles.styles.graph.background).toBe("#c6dbef");
        const fill = byId(styles, snapshot, "fill");
        const opacity = byId(styles, snapshot, "fillOpacity");
        const border = byId(styles, snapshot, "borderColor");
        const borderWidth = byId(styles, snapshot, "borderWidth");
        expect(fill.get("a")).toBe("#2171b5");
        expect(border.get("a")).toBe("#000000");
        // the graph's scheme applies to bgcolor only: 7 is no X11 color, so Graphviz draws it black
        expect(fill.get("b")).toBe("#000000");
        expect(fill.get("c")).toBe("#000000");
        expect(opacity.get("d")).toBe(0);
        expect(borderWidth.get("d")).toBe(0);
        // a fill list is a gradient from its first color; an outline list "red;0.3:blue" is no color, drawn black
        expect(fill.get("e")).toBe("#ff0000");
        expect(border.get("e")).toBe("#000000");
        expect(byId(styles, snapshot, "labelColor").get("e")).toBe("#00ff00");
        expect(border.get("f")).toBe("#beaed4");
        expect(drawn(styles, snapshot, "edge", "color")[0]).toBe("#ff0000");
        expect(drawn(styles, snapshot, "edge", "opacity")[1]).toBe(0);
        expect(codes(styles)).toEqual(
            expect.arrayContaining(["W_STYLE_BAD_VALUE", "W_STYLE_GRADIENT", "W_STYLE_COLOR_LIST"]),
        );
    });

    it("draws no outline for plain, plaintext and none; reads setlinewidth, bold and dashes", async () => {
        const { snapshot, styles } = await load(`graph {
            p [shape=plain]; t [shape=plaintext, color=red]; n [shape=none];
            s [style="setlinewidth(3),dashed"]; b [style=bold]; w [penwidth=0.5, style=" dotted"];
            k [style="dotted "]; r [shape=box, style=rounded];
            p -- t [style="setlinewidth(4),dashed"]; t -- n [style=bold];
        }`);
        const width = byId(styles, snapshot, "borderWidth");
        expect(["p", "t", "n"].map((id) => width.get(id))).toEqual([0, 0, 0]);
        expect(["s", "b", "w"].map((id) => width.get(id))).toEqual([3, 2, 0.5]);
        const style = byId(styles, snapshot, "borderStyle");
        expect(["s", "w", "k"].map((id) => style.get(id))).toEqual(["dashed", "dotted", null]);
        expect(byId(styles, snapshot, "shape").get("r")).toBe("round-rectangle");
        expect(drawn(styles, snapshot, "edge", "width")).toEqual([4, 2]);
        expect(drawn(styles, snapshot, "edge", "lineStyle")).toEqual(["dashed", "solid"]);
    });

    it("reads sizes exact with fixedsize, an empty label or a point, and as minimums otherwise", async () => {
        const { snapshot, styles } = await load(`digraph {
            fx [width=2, height=1, fixedsize=true]; e [width=2, height=1, label=""];
            m [width=2, height=1]; c [shape=circle, width=1, height=2, fixedsize=true];
            p [shape=point, width=0.5, height=0.2];
        }`);
        const w = byId(styles, snapshot, "width");
        const h = byId(styles, snapshot, "height");
        expect(["fx", "e", "m"].map((id) => [w.get(id), h.get(id)])).toEqual([
            [144, 72],
            [144, 72],
            [144, 72],
        ]);
        expect([w.get("c"), h.get("c")]).toEqual([144, 144]);
        expect([w.get("p"), h.get("p")]).toEqual([14.4, 14.4]);
        const minimum = styles.styles.notes.find((n) => n.code === "W_STYLE_SIZE_MINIMUM");
        expect(minimum?.elements).toEqual([snapshot.ids.indexOf("m")]);
    });

    it("raises a negative pen width to 0, as Graphviz draws it, with a note", async () => {
        const { snapshot, styles } = await load(`digraph { a [penwidth=-1]; a -> b [penwidth=-2]; }`);
        expect(byId(styles, snapshot, "borderWidth").get("a")).toBe(0);
        expect(drawn(styles, snapshot, "edge", "width")).toEqual([0]);
        expect(codes(styles)).toContain("W_STYLE_BAD_VALUE");
    });

    it("sizes regular and plain nodes as Graphviz does: 0.5 inch, and plain always 0, minimums unless unlabeled", async () => {
        const { snapshot, styles } = await load(`digraph {
            c [shape=circle]; s [shape=Msquare]; r [regular=true]; e [shape=circle, label=""]; o;
            p [shape=plain]; q [shape=plain, width=3, height=2, label=""];
        }`);
        const w = byId(styles, snapshot, "width");
        const h = byId(styles, snapshot, "height");
        expect(["c", "s", "r", "e", "o", "p", "q"].map((id) => [w.get(id), h.get(id)])).toEqual([
            [36, 36],
            [36, 36],
            [36, 36],
            [36, 36],
            [54, 36],
            [0, 0],
            [0, 0],
        ]);
        const minimum = styles.styles.notes.find((n) => n.code === "W_STYLE_SIZE_MINIMUM");
        expect(minimum?.elements).toEqual(["c", "s", "r", "p"].map((id) => snapshot.ids.indexOf(id)));
    });

    it("draws arrows per dir and the graph's kind: a target arrow on directed edges by default", async () => {
        const directed = await load(`digraph {
            a -> b; a -> c [dir=back]; a -> d [dir=both, arrowhead=odiamond]; a -> e [arrowhead=none];
            a -> f [dir=none];
        }`);
        expect(drawn(directed.styles, directed.snapshot, "edge", "targetArrow")).toEqual([
            "triangle",
            "none",
            "diamond-open",
            "none",
            "none",
        ]);
        expect(drawn(directed.styles, directed.snapshot, "edge", "sourceArrow")).toEqual([
            "none",
            "triangle",
            "triangle",
            "none",
            "none",
        ]);
        const undirected = await load("graph { a -- b; a -- c [dir=forward, arrowhead=tee] }");
        expect(drawn(undirected.styles, undirected.snapshot, "edge", "targetArrow")).toEqual(["none", "tee"]);
    });

    it("reads a cluster's attributes as the cluster's style: bgcolor or its fill, pencolor, a rectangle", async () => {
        const { snapshot, styles } = await load(`digraph {
            subgraph cluster_a { color=red; style=filled; a }
            subgraph cluster_b { bgcolor=yellow; pencolor=blue; label="B"; b }
            subgraph cluster_c { style="filled,rounded"; c }
            subgraph cluster_d { color=green; d }
        }`);
        const fill = byId(styles, snapshot, "fill");
        const opacity = byId(styles, snapshot, "fillOpacity");
        const shown = (id: string): unknown => (opacity.get(id) === 0 ? null : fill.get(id));
        expect(["cluster_a", "cluster_b", "cluster_c", "cluster_d"].map(shown)).toEqual([
            "#ff0000",
            "#ffff00",
            "#d3d3d3",
            null,
        ]);
        const border = byId(styles, snapshot, "borderColor");
        expect(["cluster_a", "cluster_b", "cluster_d"].map((id) => border.get(id))).toEqual([
            "#ff0000",
            "#0000ff",
            "#00ff00",
        ]);
        const shape = byId(styles, snapshot, "shape");
        expect(shape.get("cluster_a")).toBe("rectangle");
        expect(shape.get("cluster_c")).toBe("round-rectangle");
        expect(shape.get("a")).toBe("ellipse");
        expect(byId(styles, snapshot, "label").get("cluster_b")).toBe("B");
    });

    it("gives 40 clusters with 40 node fill defaults one fill-by-cluster rule", async () => {
        const { snapshot, styles } = await load(file("clusters-40.gv"));
        const fills = styles.styles.rules.filter((r) => r.map?.fill !== undefined || r.set?.fill !== undefined);
        expect(fills.map((r) => [r.id, r.map?.fill?.kind, r.map?.fill?.by])).toEqual([
            ["node.by.group", "discrete", { style: "group" }],
        ]);
        const fill = drawn(styles, snapshot, "node", "fill");
        for (let i = 0; i < snapshot.nodeCount; i++) {
            const id = String(snapshot.ids.idOf(i));
            if (!id.startsWith("cluster_")) {
                const k = Number(id.split("_")[0].slice(1));
                expect(fill[i]).toBe(`#${(k * 6).toString(16).padStart(2, "0")}8040`);
            }
        }
    });

    it("leaves Graphviz's defaults out with toolDefaults: false", async () => {
        const { styles } = await load("digraph { a -> b }", false);
        expect(styles.styles.rules.filter((r) => r.origin === "tool")).toEqual([]);
        expect(styles.styles.source.tool).toBeNull();
    });
});

describe("DOT design rule 5: none and invis are transparent, a list is never its first color where Graphviz draws black", () => {
    it("reads the colors-and-scopes inputs as Graphviz draws them", async () => {
        const { snapshot, styles } = await load(file("colors-and-scopes.gv"));
        const fill = byId(styles, snapshot, "fill");
        const opacity = byId(styles, snapshot, "fillOpacity");
        const border = byId(styles, snapshot, "borderColor");
        const borderWidth = byId(styles, snapshot, "borderWidth");
        for (const id of ["n7", "n8", "n13"]) {
            expect(opacity.get(id)).toBe(0);
            expect(borderWidth.get(id)).toBe(0);
        }
        // a fill list is a gradient from its first color; an outline list draws the color before its first ":"
        expect([fill.get("n4"), border.get("n4")]).toEqual(["#ff0000", "#ff0000"]);
        // "red;0.3:blue" has no color before ":" that Graphviz knows, so the outline is black, not red
        expect([fill.get("n5"), border.get("n5")]).toEqual(["#ff0000", "#000000"]);
        expect(byId(styles, snapshot, "labelColor").get("n5")).toBe("#000000");
        const edgeColor = drawn(styles, snapshot, "edge", "color");
        expect(edgeColor[2]).toBe("#ff0000");
        expect(codes(styles)).toEqual(expect.arrayContaining(["W_STYLE_GRADIENT", "W_STYLE_COLOR_LIST"]));
    });
});

describe("DOT node lists", () => {
    it("reads a, b as two node statements, a, b -> c as edges from both, and a -> b, c as edges to both", async () => {
        const { snapshot } = await registry.importGraph("digraph { a, b [color=red]; c, d -> e; f -> g, h; }", {
            format: "dot",
        });
        expect(Array.from({ length: snapshot.nodeCount }, (_, i) => snapshot.ids.idOf(i))).toEqual([
            "a",
            "b",
            "c",
            "d",
            "e",
            "f",
            "g",
            "h",
        ]);
        expect(snapshot.nodes.value("color", snapshot.ids.indexOf("b"))).toBe("red");
        const pairs = Array.from(
            { length: snapshot.edgeCount },
            (_, e) =>
                `${String(snapshot.ids.idOf(snapshot.edgeSource(e)))}${String(snapshot.ids.idOf(snapshot.edgeTarget(e)))}`,
        );
        expect(pairs).toEqual(["ce", "de", "fg", "fh"]);
    });
});

/** What Graphviz draws for one node of a golden file. */
interface GoldenNode {
    readonly fill: string | null;
    readonly outline: string | null;
    readonly label: string | null;
    readonly labelColor: string | null;
    readonly shape: string;
    readonly width: number;
    readonly height: number;
}

/** What Graphviz draws for one edge of a golden file. */
interface GoldenEdge {
    readonly key: string;
    readonly color: string | null;
    readonly style: string;
    readonly head: boolean;
    readonly tail: boolean;
}

/** The gallery files (EPL-2.0) and the generated colors file whose Graphviz drawing is kept as golden values. */
const GOLDEN_FILES: readonly string[] = [
    "graphviz-gallery-directed-bazel.gv",
    "graphviz-gallery-directed-go-package.gv",
    "graphviz-gallery-directed-lion_share.gv",
    "graphviz-gallery-directed-neural-network.gv",
    "graphviz-gallery-directed-ninja.gv",
    "graphviz-gallery-directed-profile.gv",
    "graphviz-gallery-directed-sdh.gv",
    "graphviz-gallery-gradient-colors.gv",
    "graphviz-gallery-gradient-g_c_n.gv",
    "graphviz-gallery-neato-colors.gv",
    "graphviz-gallery-neato-philo.gv",
    "graphviz-gallery-neato-traffic_lights.gv",
    "graphviz-gallery-neato-transparency.gv",
    "generated/colors-and-scopes.gv",
];

/**
 * The color ops (`c` pen, `C` fill) and text ops (`T`) of an xdot draw string, in order.
 * @param s - the draw string
 * @returns the ops
 */
function xdotOps(s: unknown): { op: string; value: string }[] {
    const out: { op: string; value: string }[] = [];
    if (typeof s !== "string") {
        return out;
    }
    const bytes = Buffer.from(s);
    const text = bytes.toString("latin1");
    for (let i = 0; i < text.length; i++) {
        const color = /^([cC]) (\d+) -/.exec(text.slice(i, i + 16));
        if (color !== null && (i === 0 || text[i - 1] === " ")) {
            const start = i + color[0].length;
            out.push({ op: color[1], value: text.slice(start, start + Number(color[2])) });
            i = start + Number(color[2]) - 1;
            continue;
        }
        const t = /^T \S+ \S+ \S+ \S+ (\d+) -/.exec(text.slice(i, i + 96));
        if (t !== null && (i === 0 || text[i - 1] === " ")) {
            const start = i + t[0].length;
            out.push({ op: "T", value: Buffer.from(text.slice(start, start + Number(t[1])), "latin1").toString() });
            i = start + Number(t[1]) - 1;
        }
    }
    return out;
}

/**
 * A drawn xdot color as `#rrggbb`, or null when it is transparent (a gradient's first stop for a gradient).
 * @param c - the color text
 * @returns the color
 */
function xdotColor(c: string): string | null {
    const stop = /^[[(]/.test(c) ? (/\d+ -(#[0-9a-fA-F]{6,8})/.exec(c)?.[1] ?? c) : c;
    if (/^#[0-9a-f]{6}00$/i.test(stop)) {
        return null;
    }
    return /^#[0-9a-f]{6}/i.test(stop) ? stop.slice(0, 7).toLowerCase() : stop;
}

/**
 * The fields of a `-Tplain` line, quoted fields kept whole.
 * @param line - the line
 * @returns the fields
 */
function plainFields(line: string): string[] {
    const t: string[] = [];
    for (let i = 0; i < line.length;) {
        if (line[i] === " ") {
            i++;
        } else if (line[i] === '"') {
            let j = i + 1;
            let v = "";
            while (j < line.length && line[j] !== '"') {
                v += line[j] === "\\" ? line[++j] : line[j];
                j++;
            }
            t.push(v);
            i = j + 1;
        } else if (line[i] === "<") {
            let depth = 0;
            let j = i;
            for (; j < line.length; j++) {
                if (line[j] === "<") {
                    depth++;
                } else if (line[j] === ">" && --depth === 0) {
                    break;
                }
            }
            t.push(line.slice(i, j + 1));
            i = j + 1;
        } else {
            let j = i;
            while (j < line.length && line[j] !== " ") {
                j++;
            }
            t.push(line.slice(i, j));
            i = j;
        }
    }
    return t;
}

/**
 * What Graphviz draws for a DOT file, read from `dot -Txdot` (colors, label texts, arrows) and `dot -Tplain`
 * (shapes, sizes, line styles). Needs Graphviz on the PATH.
 * @param bytes - the file
 * @returns the nodes by id and the edges in file order
 */
async function graphvizDraws(bytes: Uint8Array): Promise<{ nodes: Record<string, GoldenNode>; edges: GoldenEdge[] }> {
    const run = (format: string): Buffer =>
        execFileSync("dot", [`-T${format}`], { input: bytes, stdio: ["pipe", "pipe", "ignore"], maxBuffer: 1 << 28 });
    const x = (await registry.importGraph(new Uint8Array(run("xdot")), { format: "dot", encoding: "utf-8" })).snapshot;
    const plainNodes = new Map<string, string[]>();
    const plainEdges = new Map<string, string[][]>();
    for (const line of run("plain").toString("utf8").split("\n")) {
        const t = plainFields(line);
        if (t[0] === "node" && t.length >= 11) {
            plainNodes.set(t[1], t);
        } else if (t[0] === "edge") {
            const k = `${t[1]}->${t[2]}`;
            plainEdges.set(k, [...(plainEdges.get(k) ?? []), t]);
        }
    }
    const cell = (table: GraphSnapshot["nodes"], name: string, i: number): unknown =>
        table.has(name) ? table.value(name, i) : null;
    const nodes: Record<string, GoldenNode> = {};
    for (let i = 0; i < x.nodeCount; i++) {
        const id = String(x.ids.idOf(i));
        const p = plainNodes.get(id);
        if (p === undefined || cell(x.nodes, "graphty.cluster", i) === true) {
            continue;
        }
        const draw = xdotOps(cell(x.nodes, "_draw_", i));
        const ldraw = xdotOps(cell(x.nodes, "_ldraw_", i));
        const fill = draw.find((o) => o.op === "C");
        const pen = draw.find((o) => o.op === "c");
        const labelPen = ldraw.find((o) => o.op === "c");
        const texts = ldraw.filter((o) => o.op === "T").map((o) => o.value);
        const style = p[p.length - 4].split(",");
        nodes[id] = {
            fill: fill === undefined ? null : xdotColor(fill.value),
            outline: pen === undefined ? null : xdotColor(pen.value),
            label: texts.length === 0 ? null : texts.join("\n"),
            labelColor: labelPen === undefined ? null : xdotColor(labelPen.value),
            shape: style.includes("rounded") ? `rounded ${p[p.length - 3]}` : p[p.length - 3],
            width: Number(p[4]),
            height: Number(p[5]),
        };
    }
    const edges: GoldenEdge[] = [];
    const seen = new Map<string, number>();
    for (let e = 0; e < x.edgeCount; e++) {
        const k = `${String(x.ids.idOf(x.edgeSource(e)))}->${String(x.ids.idOf(x.edgeTarget(e)))}`;
        const n = seen.get(k) ?? 0;
        seen.set(k, n + 1);
        const p = plainEdges.get(k)?.[n];
        const pen = xdotOps(cell(x.edges, "_draw_", e)).find((o) => o.op === "c");
        const drew = (name: string): boolean => {
            const v = cell(x.edges, name, e);
            return typeof v === "string" && v.trim() !== "";
        };
        edges.push({
            key: k,
            color: pen === undefined ? null : xdotColor(pen.value),
            style: p === undefined ? "solid" : (p[p.length - 2] ?? "solid"),
            head: drew("_hdraw_"),
            tail: drew("_tdraw_"),
        });
    }
    return { nodes, edges };
}

/**
 * Whether Graphviz's `dot` can be run here.
 * @returns true when it can
 */
function hasGraphviz(): boolean {
    try {
        execFileSync("dot", ["-V"], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

const GRAPHVIZ = hasGraphviz();

/**
 * Compares what graphty draws for a DOT file with what Graphviz draws, two-sided: a value the reader missed fails as
 * surely as a wrong one. Labels drawn from HTML or records, and nodes with an external label, are skipped (their
 * markup is not carried); a size noted as a minimum must be at most what Graphviz drew.
 * @param ex - the styles graphty read
 * @param snapshot - the graph
 * @param gv - what Graphviz draws
 * @param gv.nodes - the nodes by id
 * @param gv.edges - the edges in file order
 * @returns the differences
 */
function compareWithGraphviz(
    ex: ExtractedStyles,
    snapshot: GraphSnapshot,
    gv: { nodes: Record<string, GoldenNode>; edges: readonly GoldenEdge[] },
): string[] {
    const out: string[] = [];
    const get = (property: string) => drawn(ex, snapshot, "node", property);
    const [fill, fillOpacity, border, borderWidth, label, labelColor, shape, width, height, visible] = [
        "fill",
        "fillOpacity",
        "borderColor",
        "borderWidth",
        "label",
        "labelColor",
        "shape",
        "width",
        "height",
        "visible",
    ].map(get);
    const noted = (code: string, i: number): boolean =>
        ex.styles.notes.some(
            (n) => n.code === code && n.params.target === "node" && Array.isArray(n.elements) && n.elements.includes(i),
        );
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = String(snapshot.ids.idOf(i));
        const g = Object.hasOwn(gv.nodes, id) ? gv.nodes[id] : undefined;
        if (g === undefined || visible[i] === false) {
            continue;
        }
        // a pen width of 0 still draws Graphviz's thinnest line; graphty draws none
        const thinnest =
            borderWidth[i] === 0 &&
            Number(snapshot.nodes.has("penwidth") ? snapshot.nodes.value("penwidth", i) : 1) === 0;
        const ours = {
            fill: fillOpacity[i] === 0 ? null : fill[i],
            outline: borderWidth[i] === 0 && !thinnest ? null : border[i],
        };
        if (ours.fill !== g.fill) {
            out.push(`node ${id} fill: graphty ${String(ours.fill)}, Graphviz ${String(g.fill)}`);
        }
        if (ours.outline !== g.outline) {
            out.push(`node ${id} outline: graphty ${String(ours.outline)}, Graphviz ${String(g.outline)}`);
        }
        const markup =
            noted("W_STYLE_HTML_LABEL", i) || noted("W_STYLE_RECORD_LABEL", i) || noted("W_STYLE_NOT_CARRIED", i);
        if (!markup) {
            const text =
                typeof label[i] === "string"
                    ? String(label[i])
                          .split("\n")
                          .filter((l) => l !== "")
                          .join("\n")
                    : "";
            if (text !== (g.label ?? "")) {
                out.push(`node ${id} label: graphty ${JSON.stringify(text)}, Graphviz ${JSON.stringify(g.label)}`);
            }
            if (g.label !== null && g.labelColor !== null && labelColor[i] !== g.labelColor) {
                out.push(`node ${id} label color: graphty ${String(labelColor[i])}, Graphviz ${g.labelColor}`);
            }
        }
        const gShape = g.shape.startsWith("rounded ") ? "round-rectangle" : g.shape;
        const ourShape = String(shape[i]);
        const known = !ourShape.startsWith("other:");
        if (known && gShape !== "round-rectangle" && gShape !== ourShape) {
            // Graphviz names the shape it drew; ours is the neutral shape of that name
            const mapped = registryShape(gShape);
            if (mapped !== null && mapped !== ourShape) {
                out.push(`node ${id} shape: graphty ${ourShape}, Graphviz ${g.shape}`);
            }
        }
        // a size the file does not state is Graphviz's default minimum, which it grows to fit the label
        const stated = (name: string): boolean => snapshot.nodes.has(name) && snapshot.nodes.isSet(name, i);
        const minimum = noted("W_STYLE_SIZE_MINIMUM", i);
        for (const [name, ourSize, gSize] of [
            ["width", width[i], g.width * 72],
            ["height", height[i], g.height * 72],
        ] as const) {
            if (typeof ourSize !== "number" || !(stated("width") || stated("height"))) {
                continue;
            }
            const ok = minimum ? gSize >= ourSize - 0.75 : Math.abs(gSize - ourSize) <= 0.75;
            if (!ok) {
                out.push(
                    `node ${id} ${name}: graphty ${String(ourSize)}${minimum ? " (minimum)" : ""}, Graphviz ${String(gSize)}`,
                );
            }
        }
    }
    const color = drawn(ex, snapshot, "edge", "color");
    const opacity = drawn(ex, snapshot, "edge", "opacity");
    const line = drawn(ex, snapshot, "edge", "lineStyle");
    const head = drawn(ex, snapshot, "edge", "targetArrow");
    const tail = drawn(ex, snapshot, "edge", "sourceArrow");
    const edgeVisible = drawn(ex, snapshot, "edge", "visible");
    const concentrate =
        snapshot.graph.has("concentrate") && /^true$/i.test(String(snapshot.graph.value("concentrate", 0)));
    // Graphviz writes edges in its own order: an edge is matched by its endpoints and its occurrence among them
    const byKey = new Map<string, GoldenEdge[]>();
    for (const g of gv.edges) {
        byKey.set(g.key, [...(byKey.get(g.key) ?? []), g]);
    }
    const seen = new Map<string, number>();
    for (let e = 0; e < snapshot.edgeCount && !concentrate; e++) {
        const k = `${String(snapshot.ids.idOf(snapshot.edgeSource(e)))}->${String(snapshot.ids.idOf(snapshot.edgeTarget(e)))}`;
        const occurrence = seen.get(k) ?? 0;
        seen.set(k, occurrence + 1);
        const g = byKey.get(k)?.[occurrence];
        if (g === undefined || edgeVisible[e] === false) {
            continue;
        }
        const ours = opacity[e] === 0 ? null : color[e];
        if (g.color !== null && ours !== g.color) {
            out.push(`edge ${g.key} color: graphty ${String(ours)}, Graphviz ${g.color}`);
        }
        const style = ["dashed", "dotted"].includes(String(line[e])) ? line[e] : "solid";
        const gStyle = ["dashed", "dotted"].includes(g.style) ? g.style : "solid";
        if (style !== gStyle) {
            out.push(`edge ${g.key} line: graphty ${String(style)}, Graphviz ${g.style}`);
        }
        if ((head[e] !== "none") !== g.head || (tail[e] !== "none") !== g.tail) {
            out.push(
                `edge ${g.key} arrows: graphty ${String(tail[e])}/${String(head[e])}, Graphviz ${String(g.tail)}/${String(g.head)}`,
            );
        }
    }
    return out;
}

/** Graphviz shape names by the neutral shape graphty reads them as, for the shapes the golden files use. */
const GRAPHVIZ_SHAPES: ReadonlyMap<string, string> = new Map([
    ["ellipse", "ellipse"],
    ["oval", "ellipse"],
    ["circle", "ellipse"],
    ["doublecircle", "ellipse"],
    ["point", "ellipse"],
    ["box", "rectangle"],
    ["rect", "rectangle"],
    ["rectangle", "rectangle"],
    ["square", "rectangle"],
    ["plaintext", "rectangle"],
    ["plain", "rectangle"],
    ["record", "rectangle"],
    ["Mrecord", "round-rectangle"],
    ["diamond", "diamond"],
    ["triangle", "triangle"],
    ["invtriangle", "triangle"],
    ["hexagon", "hexagon"],
    ["octagon", "octagon"],
    ["doubleoctagon", "octagon"],
    ["none", "none"],
]);

/**
 * The neutral shape of a Graphviz shape name, or null when the golden files' table does not list it.
 * @param shape - the Graphviz name
 * @returns the neutral shape
 */
function registryShape(shape: string): string | null {
    return GRAPHVIZ_SHAPES.get(shape) ?? null;
}

/** A Graphviz drawing as the golden file keeps it: one array per node and per edge. */
interface PackedDrawing {
    readonly nodes: Record<
        string,
        [string | null, string | null, string | null, string | null, string, number, number]
    >;
    readonly edges: [string, string | null, string, boolean, boolean][];
}

/**
 * A drawing in the golden file's compact form.
 * @param d - the drawing
 * @param d.nodes - its nodes by id
 * @param d.edges - its edges
 * @returns the compact form
 */
function pack(d: { nodes: Record<string, GoldenNode>; edges: readonly GoldenEdge[] }): PackedDrawing {
    return {
        nodes: Object.fromEntries(
            Object.entries(d.nodes).map(([id, n]) => [
                id,
                [n.fill, n.outline, n.label, n.labelColor, n.shape, n.width, n.height],
            ]),
        ),
        edges: d.edges.map((e) => [e.key, e.color, e.style, e.head, e.tail]),
    };
}

/**
 * A drawing from the golden file's compact form.
 * @param p - the compact form
 * @returns the drawing
 */
function unpack(p: PackedDrawing): { nodes: Record<string, GoldenNode>; edges: GoldenEdge[] } {
    return {
        nodes: Object.fromEntries(
            Object.entries(p.nodes).map(([id, [fill, outline, label, labelColor, shape, width, height]]) => [
                id,
                { fill, outline, label, labelColor, shape, width, height },
            ]),
        ),
        edges: p.edges.map(([key, color, style, head, tail]) => ({ key, color, style, head, tail })),
    };
}

describe("DOT styles against Graphviz's drawing", () => {
    it.each(GOLDEN_FILES)(
        "%s draws as Graphviz draws it (golden values; UPDATE_DOT_GOLDEN=1 regenerates)",
        async (name) => {
            const bytes = new Uint8Array(readFileSync(join(CORPUS, name)));
            if (process.env.UPDATE_DOT_GOLDEN === "1" && GRAPHVIZ) {
                const all = JSON.parse(readFileSync(GOLDEN, "utf8")) as Record<string, PackedDrawing>;
                all[name] = pack(await graphvizDraws(bytes));
                const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)));
                writeFileSync(GOLDEN, `${JSON.stringify(sorted, null, 1)}\n`);
            }
            const packed = (JSON.parse(readFileSync(GOLDEN, "utf8")) as Record<string, PackedDrawing | undefined>)[
                name
            ];
            expect(packed).toBeDefined();
            const { snapshot, styles } = await load(bytes);
            expect(compareWithGraphviz(styles, snapshot, unpack(packed as PackedDrawing))).toEqual([]);
        },
    );
});

describe("DOT styles: writing", () => {
    it("writes Graphviz attributes and reads back the same rules and values", async () => {
        const { snapshot, styles } = await load(file("colors-and-scopes.gv"));
        const text = await registry.exportGraphToString(snapshot, "dot", { styles });
        expect(text).toContain(`"${DOT_STYLE_BLOCK_ATTRIBUTE}"="`);
        expect(text).toMatch(/fillcolor="#[0-9a-f]{6}"[^\]]*style=filled/);
        const back = await load(text);
        expect(back.styles.styles.source.tool).toBe("graphty");
        expect(plain(back.styles)).toEqual(plain(styles));
        for (const [target, property] of [
            ["node", "fill"],
            ["node", "fillOpacity"],
            ["node", "label"],
            ["node", "borderWidth"],
            ["edge", "color"],
            ["edge", "sourceArrow"],
        ] as const) {
            expect(drawn(back.styles, back.snapshot, target, property)).toEqual(
                drawn(styles, snapshot, target, property),
            );
        }
    });

    it("writes styles a plain Graphviz reader draws the same, without the block (dot -Tplain where available)", async () => {
        const source = new Uint8Array(readFileSync(join(CORPUS, "graphviz-gallery-directed-sdh.gv")));
        const { snapshot, styles } = await load(source);
        const written = await registry.exportGraphToBytes(snapshot, "dot", { styles });
        // read as any program would: the block ignored, Graphviz's attributes alone
        const text = new TextDecoder().decode(written).replace(/"graphty\.styles"="(?:[^"\\]|\\.)*",?\s*/, "");
        const again = await load(text);
        expect(again.styles.styles.source.tool).toBe("graphviz");
        for (const property of ["fill", "fillOpacity", "borderColor", "shape", "label"]) {
            expect(drawn(again.styles, again.snapshot, "node", property)).toEqual(
                drawn(styles, snapshot, "node", property),
            );
        }
        for (const property of ["color", "lineStyle", "targetArrow", "sourceArrow"]) {
            expect(drawn(again.styles, again.snapshot, "edge", property)).toEqual(
                drawn(styles, snapshot, "edge", property),
            );
        }
        if (GRAPHVIZ) {
            const before = await graphvizDraws(source);
            const after = await graphvizDraws(new TextEncoder().encode(text));
            // graphty reads both shapes into the same neutral shape (an inverted triangle is a triangle)
            const keep = (n: GoldenNode): unknown => [n.fill, n.outline, n.label, registryShape(n.shape) ?? n.shape];
            for (const [id, node] of Object.entries(before.nodes)) {
                expect([id, keep(after.nodes[id])]).toEqual([id, keep(node)]);
            }
            // Graphviz writes edges in its own order, which depends on the file's statement order; a bold line is
            // written as its pen width, 2
            const edges = (list: readonly GoldenEdge[]): string[] =>
                list
                    .map((e) =>
                        JSON.stringify([e.key, e.color, e.style === "bold" ? "solid" : e.style, e.head, e.tail]),
                    )
                    .sort();
            expect(edges(after.edges)).toEqual(edges(before.edges));
        }
    });

    it("reports a missing label a rule reads from the label column, which reads back as the empty label", async () => {
        const gml = readFileSync(resolve(CORPUS, "../gml/generated/tamper-node-added.gml"));
        // node 9999 was added outside graphty and has no label; the block is set aside, the yEd labels are a rule
        const first = await registry.importGraph(new Uint8Array(gml), { format: "gml", styles: true });
        const styles = first.styles ?? undefined;
        const approximated = registry
            .checkExport(first.snapshot, "dot", { styles })
            .filter((l) => l.code === "W_STYLE_APPROXIMATED" && l.style?.property === "label");
        expect(approximated.map((l) => [l.style?.target, l.count])).toEqual([["node", 1]]);
        const text = await registry.exportGraphToString(first.snapshot, "dot", { styles });
        expect(text).toContain('9999 [label=""]');
        // a graph whose rules read no label column writes label="" for every node and reads back no label: no note
        const plain = new GraphBuilder({ directed: true });
        plain.addNode("a");
        const g = plain.freeze();
        const none = planStyles(
            { format: "test", node: { values: { fill: ["#ff0000"] } }, fingerprint: styleFingerprint(g) },
            { node: featuresOf(g, "node"), edge: featuresOf(g, "edge") },
        );
        expect(registry.checkExport(g, "dot", { styles: none }).filter((l) => l.style?.property === "label")).toEqual(
            [],
        );
    });

    it("reports values Graphviz can only approximate, and keeps their exact values in the block", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.addNode("b");
        b.addEdge("a", "b");
        const g = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: { values: { shape: ["vee", "ellipse"], borderStyle: ["dash-dot", null] } },
                edge: { values: { lineStyle: ["zigzag"] } },
                fingerprint: styleFingerprint(g),
            },
            { node: featuresOf(g, "node"), edge: featuresOf(g, "edge") },
        );
        const losses = registry.checkExport(g, "dot", { styles });
        expect(
            losses
                .filter((l) => l.code === "W_STYLE_APPROXIMATED")
                .map((l) => [l.style?.target, l.style?.property, l.count])
                .sort(),
        ).toEqual([
            ["edge", "lineStyle", 1],
            ["node", "borderStyle", 1],
            ["node", "shape", 1],
        ]);
        const text = await registry.exportGraphToString(g, "dot", { styles });
        expect(text).toContain("shape=invtriangle");
        const back = await load(text);
        expect(drawn(back.styles, back.snapshot, "node", "shape")).toEqual(["vee", "ellipse"]);
        expect(drawn(back.styles, back.snapshot, "edge", "lineStyle")).toEqual(["zigzag"]);
    });

    it("keeps text values that look like numbers exact by carrying them inside the block", async () => {
        const { snapshot, styles } = await load("digraph { 1 -> 2; 2 -> 3 }");
        const text = await registry.exportGraphToString(snapshot, "dot", { styles });
        expect(text).not.toContain("graphty.style.node");
        const back = await load(text);
        expect(drawn(back.styles, back.snapshot, "node", "label")).toEqual(["1", "2", "3"]);
        expect(plain(back.styles)).toEqual(plain(styles));
    });

    it("reads, writes and reads back styles examining characters in proportion to the graph", async () => {
        const importer = registry.importer("dot");
        const work = async (n: number): Promise<number[]> => {
            const bytes = readFileSync(join(GENERATED, `random-${String(n)}.gv`));
            const a = await registry.importGraph(bytes, { format: "dot" });
            let ex: ExtractedStyles | null = null;
            const read = await charactersExamined(() => {
                ex = extractStyles(importer, a.snapshot, a.report);
            });
            let written: Uint8Array = new Uint8Array();
            const write = await charactersExamined(async () => {
                written = await registry.exportGraphToBytes(a.snapshot, "dot", { styles: ex });
            });
            const b = await registry.importGraph(written, { format: "dot" });
            const readBack = await charactersExamined(() => {
                extractStyles(importer, b.snapshot, b.report);
            });
            return [read, write, readBack];
        };
        const small = await work(100);
        const large = await work(1000);
        // ten times the elements; a step that examines a growing text per element is a hundred times the work
        for (let k = 0; k < small.length; k++) {
            expect(large[k] / small[k]).toBeLessThan(12);
        }
    });
});

/** The block-tamper fixtures: a file graphty wrote, then edited outside as design 10.7 items 4 and 5 describe. */
async function tamperFixtures(): Promise<Record<string, Uint8Array>> {
    const base = await load(new Uint8Array(readFileSync(join(CORPUS, "graphviz-gallery-directed-sdh.gv"))));
    const written = await registry.exportGraphToBytes(base.snapshot, "dot", { styles: base.styles });
    const text = new TextDecoder().decode(written);
    const added = text.replace(/\n {4}"?[A-Za-z0-9_]+"? \[/, (m) => `\n    extra_node;${m}`);
    return {
        "graphty-written.gv": written,
        "tamper-native-edited.gv": editDotNodeFill(written) ?? new Uint8Array(),
        "tamper-block-truncated.gv": replaceDotBlock(written, (block) => block.slice(0, Math.floor(block.length / 2))),
        "tamper-node-added.gv": new TextEncoder().encode(added),
    };
}

describe("DOT block tamper fixtures", () => {
    it("are the edits they say they are (UPDATE_DOT_TAMPER=1 writes them again)", async () => {
        for (const [name, bytes] of Object.entries(await tamperFixtures())) {
            const path = join(GENERATED, name);
            if (process.env.UPDATE_DOT_TAMPER === "1") {
                writeFileSync(path, bytes);
            }
            expect(new TextDecoder().decode(readFileSync(path))).toBe(new TextDecoder().decode(bytes));
        }
    });

    it("bring an outside edit back as one exception over the same rules", async () => {
        const unedited = await load(file("graphty-written.gv"));
        const edited = await load(file("tamper-native-edited.gv"));
        const below = (ex: ExtractedStyles): unknown => plain(ex).filter((r) => r.role !== "exceptions");
        expect(below(edited.styles)).toEqual(below(unedited.styles));
        const excepted = (ex: ExtractedStyles): number =>
            (ex.columns.node.get("exceptions.fill") ?? []).filter((v) => v !== null).length;
        expect(excepted(edited.styles)).toBe(excepted(unedited.styles) + 1);
        expect(edited.styles.columns.node.get("exceptions.fill")).toContain("#123456");
    });

    it("ignore a truncated block and a block for another graph with a note, and read Graphviz's attributes", async () => {
        for (const [name, reason] of [
            ["tamper-block-truncated.gv", "NOT_JSON"],
            ["tamper-node-added.gv", "FINGERPRINT"],
        ] as const) {
            const { snapshot, styles } = await load(file(name));
            const note = styles.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
            expect(note?.params.samples).toEqual([reason]);
            expect(styles.styles.source.tool).toBe("graphviz");
            expect(drawn(styles, snapshot, "node", "fill")).toContain("#ff0000");
        }
    });
});
