/**
 * GraphML styles: each writer's graphics read the way that writer draws them (yEd's realizers, yFiles 3's style
 * objects and shared data, Gephi's r, g, b and size keys, Cytoscape's export), the valid files that failed before,
 * and styles written back as yEd graphics with the `graphty.styles` block as graph data.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { GRAPHML_ISSUE } from "../../../src/formats/graphml/index.js";
import { createRegistry } from "../../../src/registry.js";
import {
    type ExtractedStyles,
    featuresOf,
    planStyles,
    resolveStyles,
    styleFingerprint,
    type StyleRule,
} from "../../../src/styles/internal.js";
import { editGraphmlNodeFill, replaceGraphmlBlock } from "../../styles/formats/graphml.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/graphml");
const GENERATED = join(CORPUS, "generated");

/**
 * A corpus file's bytes, decompressed when it is stored gzip-compressed.
 * @param path - the file
 * @returns the bytes
 */
function corpusBytes(path: string): Uint8Array {
    const bytes = new Uint8Array(readFileSync(path));
    return path.endsWith(".gz") ? new Uint8Array(gunzipSync(bytes)) : bytes;
}

/**
 * Imports a GraphML document with its styles.
 * @param doc - the document
 * @param toolDefaults - whether the writing program's defaults are added
 * @returns the import result, with styles
 */
async function load(doc: string | Uint8Array, toolDefaults = true) {
    const result = await registry.importGraph(doc, {
        format: "graphml",
        styles: { toolDefaults },
        errorLimit: Infinity,
    });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

const plain = (ex: ExtractedStyles): StyleRule[] => JSON.parse(JSON.stringify(ex.styles.rules)) as StyleRule[];

const YED_HEAD = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">',
    '<key for="node" id="d6" yfiles.type="nodegraphics"/><key for="edge" id="d10" yfiles.type="edgegraphics"/>',
    '<graph edgedefault="directed" id="G">',
].join("\n");

describe("GraphML styles: yEd", () => {
    it("reads every visible label of icon nodes whose first label is empty, and notes further labels", async () => {
        const { snapshot, styles } = await load(corpusBytes(join(GENERATED, "labels-multi.graphml")));
        expect(styles.styles.source).toEqual({ format: "graphml", dialect: "yed", tool: "yed" });
        expect(resolveStyles(styles, "node", "label", snapshot)).toEqual([
            "shown second",
            "first",
            "only real text",
            "<html><b>bold</b> text</html>",
            "plain",
            "padded",
        ]);
        const extra = styles.styles.notes.find((n) => n.code === "W_STYLE_EXTRA_LABELS");
        expect(extra?.elements).toEqual([1]);
        const n5 = snapshot.ids.indexOf("n5");
        expect(resolveStyles(styles, "node", "labelWeight", snapshot)[n5]).toBe("bold");
        expect(resolveStyles(styles, "node", "labelItalic", snapshot)[n5]).toBe(true);
        expect(resolveStyles(styles, "node", "labelFont", snapshot)[n5]).toBe("Comic Sans MS");
        expect(resolveStyles(styles, "node", "labelPosition", snapshot)[n5]).toBe("bottom");
    });

    it("labels a real icon node by the visible label after its empty icon label", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "yed-shapenode/svanoort__pyresttest__contexts.graphml")),
        );
        const i = snapshot.ids.indexOf("n0");
        expect(resolveStyles(styles, "node", "label", snapshot)[i]).toBe("Variable Binding");
    });

    it("reads no fill for transparent and hasColor=false fills, gradients to their first color, alpha last", async () => {
        const { snapshot, styles } = await load(corpusBytes(join(GENERATED, "fill-oddities.graphml")));
        const fill = resolveStyles(styles, "node", "fill", snapshot);
        const opacity = resolveStyles(styles, "node", "fillOpacity", snapshot);
        const at = (id: string): number => snapshot.ids.indexOf(id);
        expect([fill[at("n0")], opacity[at("n0")]]).toEqual(["#ff0000", 0.501961]);
        expect(fill[at("n1")]).toBe("#ff0000");
        expect(opacity[at("n2")]).toBe(0);
        expect(opacity[at("n3")]).toBe(0);
        expect(resolveStyles(styles, "node", "borderWidth", snapshot)[at("n9")]).toBe(0);
        const codes = styles.styles.notes.map((n) => n.code);
        expect(codes).toContain("W_STYLE_GRADIENT");
        expect(codes).toContain("W_STYLE_NO_FILL");
        expect(resolveStyles(styles, "node", "shape", snapshot)[at("n12")]).toBe("diamond");
        expect(resolveStyles(styles, "edge", "sourceArrow", snapshot)[0]).toBe("triangle-open");
        expect(resolveStyles(styles, "edge", "targetArrow", snapshot)[0]).toBe("crow");
    });

    it("reads the curve, line type and arrows of every edge realizer", async () => {
        const { snapshot, styles } = await load(
            `${YED_HEAD}<node id="a"/><node id="b"/>
            <edge source="a" target="b"><data key="d10"><y:BezierEdge><y:LineStyle color="#FF0000" type="dashed" width="2.0"/><y:Arrows source="none" target="standard"/></y:BezierEdge></data></edge>
            <edge source="b" target="a"><data key="d10"><y:PolyLineEdge><y:LineStyle color="#00FF0080" type="dotted" width="1.0"/><y:Arrows source="none" target="none"/><y:BendStyle smoothed="false"/></y:PolyLineEdge></data></edge>
            </graph></graphml>`,
        );
        expect(resolveStyles(styles, "edge", "curved", snapshot)).toEqual([true, false]);
        expect(resolveStyles(styles, "edge", "lineStyle", snapshot)).toEqual(["dashed", "dotted"]);
        expect(resolveStyles(styles, "edge", "color", snapshot)).toEqual(["#ff0000", "#00ff00"]);
        expect(resolveStyles(styles, "edge", "opacity", snapshot)).toEqual([null, 0.501961]);
        expect(resolveStyles(styles, "edge", "targetArrow", snapshot)).toEqual(["triangle", "none"]);
    });

    it("adds yEd's defaults beneath the file's own values, and none with toolDefaults: false", async () => {
        const doc = `${YED_HEAD}<node id="a"><data key="d6"><y:ShapeNode><y:Geometry height="30" width="30" x="0" y="0"/></y:ShapeNode></data></node></graph></graphml>`;
        const { snapshot, styles } = await load(doc);
        expect(resolveStyles(styles, "node", "fill", snapshot)).toEqual(["#ffcc00"]);
        const bare = await load(doc, false);
        expect(bare.styles.styles.rules.filter((r) => r.origin === "tool")).toEqual([]);
    });

    it("leaves the yfiles columns as they were", async () => {
        const { snapshot } = await load(corpusBytes(join(GENERATED, "scale-50.graphml")));
        expect(snapshot.nodes.value("yfiles.color", 0)).toBe("#D8C918");
        expect(snapshot.nodes.value("yfiles.label", 0)).toBe("node 0");
        expect(snapshot.nodes.value("yfiles.shape", 0)).toBe("rectangle");
    });
});

describe("GraphML styles: yFiles 3", () => {
    const files = readdirSync(join(CORPUS, "yfiles-html")).map((f) => join(CORPUS, "yfiles-html", f));

    it.each(files.map((f) => [f.split("/").pop() ?? f, f] as const))(
        "imports %s with its styles and without errors",
        async (_name, file) => {
            const { snapshot, styles, report } = await load(corpusBytes(file));
            expect(report.errorCount).toBe(0);
            expect(styles.styles.source).toEqual({ format: "graphml", dialect: "yfiles3", tool: "yfiles3" });
            expect(resolveStyles(styles, "node", "fill", snapshot).some((v) => v !== null)).toBe(true);
        },
    );

    it("resolves shared data by value: fills, shapes, sizes and label styles", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "yfiles-html/luizomf__design-patterns-python__State_1.graphml")),
        );
        const i = snapshot.ids.indexOf("n0");
        expect(resolveStyles(styles, "node", "fill", snapshot)[i]).toBe("#ff8c00");
        expect(resolveStyles(styles, "node", "shape", snapshot)[i]).toBe("ellipse");
        expect(resolveStyles(styles, "node", "width", snapshot)[i]).toBe(145);
        expect(resolveStyles(styles, "node", "label", snapshot)[i]).toBe("Order");
        expect(resolveStyles(styles, "node", "labelFont", snapshot)[i]).toBe("Arial");
    });

    it("notes shared references that refer to each other and finishes", async () => {
        const { snapshot, styles } = await load(corpusBytes(join(GENERATED, "yfiles3-shared-cycle.graphml")));
        expect(snapshot.nodeCount).toBe(3);
        expect(styles.styles.notes.map((n) => n.code)).toContain("W_STYLE_REFERENCE_CYCLE");
        expect(resolveStyles(styles, "node", "fill", snapshot)[snapshot.ids.indexOf("n2")]).toBe("#00ff00");
    });
});

describe("GraphML styles: Gephi, Cytoscape and other writers", () => {
    it("reads Gephi's r, g, b and size keys with Gephi's defaults and the source node's color on edges", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "gephi-rgb/nielmclaren__constellation.js__data.graphml")),
        );
        expect(styles.styles.source).toEqual({ format: "graphml", dialect: "gephi", tool: "gephi" });
        expect(styles.styles.units.length).toBe("relative");
        const r = snapshot.nodes.value("r", 0) as number;
        const g = snapshot.nodes.value("g", 0) as number;
        const b = snapshot.nodes.value("b", 0) as number;
        const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
        expect(resolveStyles(styles, "node", "fill", snapshot)[0]).toBe(hex);
        expect(resolveStyles(styles, "edge", "color", snapshot)[0]).toBe(
            resolveStyles(styles, "node", "fill", snapshot)[snapshot.edgeSource(0)],
        );
        expect(styles.styles.rules.some((r2) => r2.facts?.reason === "SOURCE_NODE_COLOR")).toBe(true);
    });

    it("gives Cytoscape's export Cytoscape's default style, nodes labeled by name", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "cytoscape/chatox__networks-science-course__karate.graphml")),
        );
        expect(styles.styles.source).toEqual({ format: "graphml", dialect: "cytoscape", tool: "cytoscape" });
        expect(resolveStyles(styles, "node", "fill", snapshot)[0]).toBe("#89d0f5");
        expect(resolveStyles(styles, "node", "label", snapshot)[0]).toBe(snapshot.nodes.value("name", 0));
    });

    it("gives a file from an unrecognized writer no styles and no defaults, even with a key named color", async () => {
        const result = await registry.importGraph(
            `<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><key id="c" for="node" attr.name="color" attr.type="string"/>
            <graph edgedefault="undirected"><node id="a"><data key="c">red</data></node></graph></graphml>`,
            { format: "graphml", styles: true },
        );
        expect(result.styles).toBeNull();
        expect(result.snapshot.nodes.value("color", 0)).toBe("red");
    });
});

describe("GraphML files that failed before", () => {
    it("keeps yFiles 3 keys declared with y:attr.uri as trees, and data on the graphml root", async () => {
        const result = await registry.importGraph(
            corpusBytes(join(CORPUS, "yfiles-html/luizomf__design-patterns-python__State_1.graphml")),
            { format: "graphml" },
        );
        expect(result.report.errorCount).toBe(0);
        const codes = result.report.issues.map((i) => i.code);
        expect(codes).not.toContain("W_UNKNOWN_XML_ATTRIBUTE");
        expect(codes).not.toContain(GRAPHML_ISSUE.DATA_NESTED);
        const style = result.snapshot.nodes.get("NodeStyle");
        expect(style?.dtype).toBe("json");
        expect(style?.meta.origin?.type).toBe("http://www.yworks.com/xml/yfiles-common/2.0/NodeStyle");
    });

    it("reads a for=graphml key as graph data", async () => {
        const result = await registry.importGraph(
            `<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><key id="k" for="graphml" attr.name="creator" attr.type="string"/>
            <data key="k">me</data><graph edgedefault="undirected"><node id="a"/></graph></graphml>`,
            { format: "graphml" },
        );
        expect(result.report.issues.map((i) => i.code)).toEqual([]);
        expect(result.snapshot.graph.value("creator", 0)).toBe("me");
    });

    it("keeps nested elements under an untyped key as their XML text, with a warning", async () => {
        const result = await registry.importGraph(
            `<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><key id="k" for="node"/>
            <graph edgedefault="undirected"><node id="a"><data key="k"><svg><rect width="1"/></svg></data></node></graph></graphml>`,
            { format: "graphml" },
        );
        expect(result.report.errorCount).toBe(0);
        expect(result.report.issues.map((i) => i.code)).toEqual([GRAPHML_ISSUE.DATA_STRUCTURED]);
        expect(result.snapshot.nodes.value("k", 0)).toBe('<svg>\n  <rect width="1"/>\n</svg>');
    });

    it("never takes an element named __proto__ for the tree's prototype", async () => {
        const result = await registry.importGraph(
            `${YED_HEAD}<node id="a"><data key="d6"><__proto__ polluted="1"/><__proto__/></data></node></graph></graphml>`,
            { format: "graphml" },
        );
        const tree = result.snapshot.nodes.value("d6", 0) as Record<string, unknown>;
        expect(Object.getPrototypeOf(tree)).toBe(Object.prototype);
        expect(Array.isArray(Object.getOwnPropertyDescriptor(tree, "__proto__")?.value)).toBe(true);
        expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });
});

describe("GraphML styles: writing", () => {
    it("writes yEd graphics and reads back the same rules and values", async () => {
        const { snapshot, styles } = await load(corpusBytes(join(GENERATED, "scale-50.graphml")));
        const text = await registry.exportGraphToString(snapshot, "graphml", { styles });
        expect(text).toContain('attr.name="graphty.styles"');
        expect(text).toContain("<y:ShapeNode>");
        const back = await load(text);
        expect(back.styles.styles.source.tool).toBe("graphty");
        expect(plain(back.styles)).toEqual(plain(styles));
        for (const [target, property] of [
            ["node", "fill"],
            ["node", "label"],
            ["node", "labelColor"],
            ["node", "width"],
            ["edge", "color"],
        ] as const) {
            expect(resolveStyles(back.styles, target, property, back.snapshot)).toEqual(
                resolveStyles(styles, target, property, snapshot),
            );
        }
    });

    it("writes Gephi's styles as yEd graphics and reads them back", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "gephi-rgb/nielmclaren__constellation.js__data.graphml")),
        );
        const back = await load(await registry.exportGraphToString(snapshot, "graphml", { styles }));
        expect(plain(back.styles)).toEqual(plain(styles));
        expect(resolveStyles(back.styles, "edge", "color", back.snapshot)).toEqual(
            resolveStyles(styles, "edge", "color", snapshot),
        );
    });

    it("reports values yEd can only approximate, and keeps their exact values in the block", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.addNode("b");
        b.addEdge("a", "b");
        const snapshot = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: {
                    values: { fill: ["#123456", "#123456"], shape: ["pentagon", "ellipse"], fillOpacity: [0.5, 1] },
                },
                edge: { values: { lineStyle: ["zigzag"], targetArrow: ["half"] } },
                fingerprint: styleFingerprint(snapshot),
            },
            { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
        );
        const losses = registry.checkExport(snapshot, "graphml", { styles });
        expect(
            losses
                .filter((l) => l.code === "W_STYLE_APPROXIMATED")
                .map((l) => [l.style?.target, l.style?.property, l.count]),
        ).toEqual([
            ["node", "shape", 1],
            ["edge", "lineStyle", 1],
            ["edge", "targetArrow", 1],
        ]);
        const text = await registry.exportGraphToString(snapshot, "graphml", { styles });
        expect(text).toContain('<y:Fill color="#12345680" transparent="false"/>');
        const back = await load(text);
        expect(resolveStyles(back.styles, "node", "shape", back.snapshot)).toEqual(["pentagon", "ellipse"]);
        expect(resolveStyles(back.styles, "node", "fillOpacity", back.snapshot)[0]).toBe(0.5);
        expect(resolveStyles(back.styles, "edge", "lineStyle", back.snapshot)).toEqual(["zigzag"]);
        expect(back.styles.styles.rules.some((r) => r.role === "exceptions")).toBe(false);
    });

    it("replaces a yFiles 3 file's drawing state by yEd graphics in yEd's namespace", async () => {
        const { snapshot, styles } = await load(
            corpusBytes(join(CORPUS, "yfiles-html/luizomf__design-patterns-python__State_1.graphml")),
        );
        const text = await registry.exportGraphToString(snapshot, "graphml", { styles });
        expect(text).toContain('xmlns:y="http://www.yworks.com/xml/graphml"');
        expect(text).not.toContain("y:attr.uri");
        const back = await load(text);
        expect(plain(back.styles)).toEqual(plain(styles));
    });
});

/** The block-tamper fixtures: a file graphty wrote, then edited outside as design 10.7 items 4 and 5 describe. */
async function tamperFixtures(): Promise<Record<string, Uint8Array>> {
    const base = await load(corpusBytes(join(GENERATED, "scale-50.graphml")));
    const written = await registry.exportGraphToBytes(base.snapshot, "graphml", { styles: base.styles });
    const text = new TextDecoder().decode(written);
    const added = text.replace(/(<graph id="G" edgedefault="directed">)/, '$1\n    <node id="added"/>');
    return {
        "graphty-written.graphml": written,
        "tamper-native-edited.graphml": editGraphmlNodeFill(written) ?? new Uint8Array(),
        "tamper-block-truncated.graphml": replaceGraphmlBlock(written, (block) =>
            block.slice(0, Math.floor(block.length / 2)),
        ),
        "tamper-node-added.graphml": new TextEncoder().encode(added),
    };
}

describe("GraphML block tamper fixtures", () => {
    it("are the edits they say they are (UPDATE_GRAPHML_TAMPER=1 writes them again)", async () => {
        for (const [name, bytes] of Object.entries(await tamperFixtures())) {
            const path = join(GENERATED, name);
            if (process.env.UPDATE_GRAPHML_TAMPER === "1") {
                writeFileSync(path, bytes);
            }
            expect(new TextDecoder().decode(readFileSync(path))).toBe(new TextDecoder().decode(bytes));
        }
    });

    it("bring an outside edit back as one exception over the same rules", async () => {
        const unedited = await load(corpusBytes(join(GENERATED, "graphty-written.graphml")));
        const edited = await load(corpusBytes(join(GENERATED, "tamper-native-edited.graphml")));
        const below = (ex: ExtractedStyles): unknown => plain(ex).filter((r) => r.role !== "exceptions");
        expect(below(edited.styles)).toEqual(below(unedited.styles));
        const excepted = edited.styles.columns.node.get("exceptions.fill") ?? [];
        expect(excepted.filter((v) => v !== null)).toEqual(["#123456"]);
    });

    it("ignore a truncated block and a block for another graph with a note, and read the file as yEd's", async () => {
        for (const [file, reason] of [
            ["tamper-block-truncated.graphml", "NOT_JSON"],
            ["tamper-node-added.graphml", "FINGERPRINT"],
        ] as const) {
            const { styles } = await load(corpusBytes(join(GENERATED, file)));
            const note = styles.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
            expect(note?.params.samples).toEqual([reason]);
            expect(styles.styles.source.tool).toBe("yed");
        }
    });
});
