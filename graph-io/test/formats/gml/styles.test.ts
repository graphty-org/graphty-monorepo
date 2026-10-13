/**
 * GML styles: each writer's `graphics` and `LabelGraphics` read the way that writer draws them (yEd, Cytoscape,
 * Gephi, OGDF; igraph and unknown writers with no defaults), the valid files that failed before (Gephi's unquoted
 * `Creator`, OGDF's backslash-escaped quotes), and styles written back as yEd GML graphics with the `graphty.styles`
 * block as a graph key.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { GML_STYLE_BLOCK_KEY } from "../../../src/formats/gml/index.js";
import { createRegistry } from "../../../src/registry.js";
import {
    type ExtractedStyles,
    featuresOf,
    planStyles,
    resolveStyles,
    styleFingerprint,
    type StyleRule,
} from "../../../src/styles/internal.js";
import { editGmlNodeFill, replaceGmlBlock } from "../../styles/formats/gml.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/gml");
const GENERATED = join(CORPUS, "generated");

/**
 * Imports a GML document with its styles.
 * @param doc - the document
 * @param toolDefaults - whether the writing program's defaults are added
 * @returns the import result; styles may be null
 */
async function read(doc: string | Uint8Array, toolDefaults = true) {
    return registry.importGraph(doc, { format: "gml", styles: { toolDefaults }, errorLimit: Infinity });
}

/**
 * Imports a GML document that has styles.
 * @param doc - the document
 * @param toolDefaults - whether the writing program's defaults are added
 * @returns the import result, with styles
 */
async function load(doc: string | Uint8Array, toolDefaults = true) {
    const result = await read(doc, toolDefaults);
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

const file = (name: string): Uint8Array => new Uint8Array(readFileSync(join(GENERATED, name)));
const plain = (ex: ExtractedStyles): StyleRule[] => JSON.parse(JSON.stringify(ex.styles.rules)) as StyleRule[];
const toolRules = (ex: ExtractedStyles): StyleRule[] => ex.styles.rules.filter((r) => r.origin === "tool");

describe("GML styles: who wrote the file", () => {
    it("reads yEd's keys with yEd's defaults: no fill, label color and weight, arrows by name, curves, extra labels", async () => {
        const { snapshot, styles } = await load(file("yed-labels-and-arrows.gml"));
        expect(styles.styles.source).toEqual({ format: "gml", dialect: "yed", tool: "yed" });
        expect(toolRules(styles)[0].set).toMatchObject({ fill: "#ffcc00", labelFont: "Dialog" });
        const kind = (i: number): string => String(snapshot.nodes.value("label", i)).replace(/\d+$/, "");
        const opacity = resolveStyles(styles, "node", "fillOpacity", snapshot);
        const weight = resolveStyles(styles, "node", "labelWeight", snapshot);
        const color = resolveStyles(styles, "node", "labelColor", snapshot);
        for (let i = 0; i < snapshot.nodeCount; i++) {
            expect(opacity[i] === 0).toBe(kind(i) === "compound");
            expect(weight[i]).toBe(kind(i) === "gene" ? "bold" : "normal");
            expect(color[i]).toBe(kind(i) === "gene" ? "#0000ff" : "#000000");
        }
        expect(resolveStyles(styles, "edge", "sourceArrow", snapshot)[0]).toBe("diamond-open");
        expect(resolveStyles(styles, "edge", "curved", snapshot)[0]).toBe(true);
        expect(resolveStyles(styles, "edge", "label", snapshot)[0]).toBe("inhibits");
        expect(styles.styles.notes.map((n) => n.code)).toContain("W_STYLE_EXTRA_LABELS");
    });

    it("reads Cytoscape's keys with Cytoscape's default style: numbered arrows, outline_width, nodes labeled", async () => {
        const { snapshot, styles } = await load(file("cytoscape-interactions.gml"));
        expect(styles.styles.source.tool).toBe("cytoscape");
        expect(toolRules(styles)[0].set).toMatchObject({ fill: "#89d0f5", shape: "round-rectangle" });
        const arrows = resolveStyles(styles, "edge", "targetArrow", snapshot);
        const widths = resolveStyles(styles, "edge", "width", snapshot);
        for (let e = 0; e < snapshot.edgeCount; e++) {
            const pd = snapshot.edges.value("label", e) === "pd";
            expect(arrows[e]).toBe(pd ? "triangle" : "none");
            expect(widths[e]).toBe(pd ? 3 : 1);
        }
        expect(resolveStyles(styles, "node", "borderWidth", snapshot)[0]).toBe(1);
        expect(resolveStyles(styles, "node", "label", snapshot)[0]).toBe(snapshot.nodes.value("label", 0));
    });

    it("reads Gephi's file with its unquoted Creator: Gephi's defaults and the source node's color on edges", async () => {
        const { snapshot, styles } = await load(file("gephi-unquoted-creator.gml"));
        expect(snapshot.graph.value("Creator", 0)).toBe("Gephi");
        expect(styles.styles.source.tool).toBe("gephi");
        const fills = resolveStyles(styles, "node", "fill", snapshot);
        const colors = resolveStyles(styles, "edge", "color", snapshot);
        const arrows = resolveStyles(styles, "edge", "targetArrow", snapshot);
        for (let e = 0; e < snapshot.edgeCount; e++) {
            const own = e % 5 === 0;
            expect(colors[e]).toBe(own ? "#808080" : fills[snapshot.edgeSource(e)]);
            expect(arrows[e]).toBe("triangle");
        }
        // Gephi hides labels: no label rule, although the nodes have a label key
        expect(resolveStyles(styles, "node", "label", snapshot).every((v) => v === null)).toBe(true);
    });

    it("reads OGDF's keys with OGDF's defaults and its backslash-escaped quotes", async () => {
        const { snapshot, styles } = await load(file("ogdf-escaped-labels.gml"));
        expect(styles.styles.source.tool).toBe("ogdf");
        expect(snapshot.nodes.value("label", 0)).toBe('compound "0"');
        const shapes = resolveStyles(styles, "node", "shape", snapshot);
        const borders = resolveStyles(styles, "node", "borderStyle", snapshot);
        for (let i = 0; i < snapshot.nodeCount; i++) {
            const kind = String(snapshot.nodes.value("label", i)).split(" ")[0];
            expect(shapes[i]).toBe(
                { protein: "ellipse", gene: "rectangle", compound: "diamond", drug: "hexagon" }[kind],
            );
            expect(borders[i]).toBe(kind === "drug" ? "dashed" : "solid");
        }
        const lines = resolveStyles(styles, "edge", "lineStyle", snapshot);
        const arrows = resolveStyles(styles, "edge", "targetArrow", snapshot);
        for (let e = 0; e < snapshot.edgeCount; e++) {
            expect(lines[e]).toBe(e % 4 === 0 ? "dotted" : "solid");
            expect(arrows[e]).toBe(e % 2 === 1 ? "triangle" : "none");
        }
    });

    it("gives an unknown writer (NetworkX writes no Creator) its own values and no defaults", async () => {
        for (const doc of [
            file("networkx-graphics.gml"),
            new Uint8Array(readFileSync(join(CORPUS, "di-unipi-socc_dgLBF__germany50.gml"))),
        ]) {
            const { snapshot, styles } = await load(doc);
            expect(styles.styles.source.tool).toBeNull();
            expect(toolRules(styles)).toEqual([]);
            expect(resolveStyles(styles, "node", "fill", snapshot).every((v) => v !== null)).toBe(true);
        }
    });

    it("gives igraph's file, which holds no graphics, no styles; a color attribute stays data", async () => {
        const result = await read(file("igraph-flat-attributes.gml"));
        expect(result.snapshot.meta.creator).toMatch(/^igraph/);
        expect(result.styles ?? null).toBeNull();
    });

    it("leaves the writer's defaults out with toolDefaults: false", async () => {
        const { styles } = await load(file("yed-labels-and-arrows.gml"), false);
        expect(toolRules(styles)).toEqual([]);
    });
});

describe("GML files that failed before", () => {
    it("reads an unquoted Creator word as text, and still refuses any other bare word value", async () => {
        const { snapshot } = await registry.importGraph("Creator Gephi\ngraph [ node [ id 1 ] ]", { format: "gml" });
        expect(snapshot.meta.creator).toBe("Gephi");
        await expect(registry.importGraph("graph [ node [ id 1 kind protein ] ]", { format: "gml" })).rejects.toThrow(
            /expected a value for key "kind"/,
        );
    });

    it("reads backslash escapes only in a file OGDF wrote", async () => {
        const ogdf = await registry.importGraph(
            'Creator "ogdf::GraphAttributes::writeGML"\ngraph [ node [ id 1 label "a \\"b\\" c:\\\\" ] ]',
            { format: "gml" },
        );
        expect(ogdf.snapshot.nodes.value("label", 0)).toBe('a "b" c:\\');
        const other = await registry.importGraph('graph [ node [ id 1 label "c:\\" ] ]', { format: "gml" });
        expect(other.snapshot.nodes.value("label", 0)).toBe("c:\\");
    });
});

describe("GML styles: writing", () => {
    it("writes yEd graphics into the records the graph has, keeping positions and bends, and reads back the same rules", async () => {
        const { snapshot, styles } = await load(file("yed-labels-and-arrows.gml"));
        const text = await registry.exportGraphToString(snapshot, "gml", { styles });
        expect(text).toContain(`  ${GML_STYLE_BLOCK_KEY} "`);
        expect(text).toMatch(/graphics \[\n\s+x [\d.]+\n\s+y [\d.]+\n/);
        expect(text).toContain('targetArrow "standard"');
        const back = await load(text);
        expect(back.styles.styles.source.tool).toBe("graphty");
        expect(plain(back.styles)).toEqual(plain(styles));
        for (const [target, property] of [
            ["node", "fill"],
            ["node", "fillOpacity"],
            ["node", "labelWeight"],
            ["edge", "color"],
            ["edge", "sourceArrow"],
        ] as const) {
            expect(resolveStyles(back.styles, target, property, back.snapshot)).toEqual(
                resolveStyles(styles, target, property, snapshot),
            );
        }
    });

    it("replaces another writer's style keys with yEd's, so yEd draws what graphty draws", async () => {
        const { snapshot, styles } = await load(file("ogdf-escaped-labels.gml"));
        const text = await registry.exportGraphToString(snapshot, "gml", { styles });
        expect(text).not.toMatch(/\b(lineWidth|stipple|line) /);
        expect(text).toContain('pattern "1"');
        const back = await load(text);
        expect(resolveStyles(back.styles, "edge", "lineStyle", back.snapshot)).toEqual(
            resolveStyles(styles, "edge", "lineStyle", snapshot),
        );
    });

    it("reports values yEd's GML can only approximate, and keeps their exact values in the block", async () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode(1);
        b.addNode(2);
        const g = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: { values: { fill: ["#123456", "#123456"], shape: ["pentagon", "ellipse"] } },
                fingerprint: styleFingerprint(g),
            },
            { node: featuresOf(g, "node"), edge: [] },
        );
        const losses = registry.checkExport(g, "gml", { styles });
        expect(
            losses.filter((l) => l.code === "W_STYLE_APPROXIMATED").map((l) => [l.style?.property, l.count]),
        ).toEqual([["shape", 1]]);
        const text = await registry.exportGraphToString(g, "gml", { styles });
        expect(text).toContain('type "rectangle"');
        const back = await load(text);
        expect(resolveStyles(back.styles, "node", "shape", back.snapshot)).toEqual(["pentagon", "ellipse"]);
    });
});

describe("GML styles: booleans", () => {
    it("keeps a rule over a boolean column GML cannot hold, reading a copy of it as booleans", async () => {
        const b = new GraphBuilder({ directed: false });
        const flag = b.declareNodeColumn({ name: "flag", dtype: "bool" });
        for (let i = 1; i <= 4; i++) {
            b.addNode(i);
            b.setNodeValue(flag, i - 1, i % 2 === 0);
        }
        const g = b.freeze();
        const planned = planStyles(
            {
                format: "test",
                node: { values: { fill: ["#123456", "#123456", "#123456", "#123456"] } },
                fingerprint: styleFingerprint(g),
            },
            { node: featuresOf(g, "node"), edge: [] },
        );
        const rule: StyleRule = {
            id: "node.flagged",
            target: "node",
            role: "group",
            origin: "declared",
            where: { eq: [{ data: "flag" }, true] },
            set: { fill: "#ff0000" },
        };
        const styles: ExtractedStyles = {
            ...planned,
            styles: { ...planned.styles, rules: [...planned.styles.rules, rule] },
        };
        const back = await load(await registry.exportGraphToString(g, "gml", { styles }));
        expect(resolveStyles(back.styles, "node", "fill", back.snapshot)).toEqual(
            resolveStyles(styles, "node", "fill", g),
        );
    });

    it("reads a boolean style value back as a boolean, though GML writes it as 0 or 1", async () => {
        const b = new GraphBuilder({ directed: false });
        for (let i = 1; i <= 5; i++) {
            b.addNode(i);
        }
        const g = b.freeze();
        const italic = [false, true, false, true, true];
        const styles = planStyles(
            {
                format: "test",
                node: { values: { label: ["a", "b", "c", "d", "e"], labelItalic: italic } },
                fingerprint: styleFingerprint(g),
            },
            { node: featuresOf(g, "node"), edge: [] },
        );
        const written = await registry.exportGraphToString(g, "gml", { styles });
        const back = await load(written);
        expect(resolveStyles(back.styles, "node", "labelItalic", back.snapshot)).toEqual(italic);
        const second = await registry.exportGraphToString(back.snapshot, "gml", { styles: back.styles });
        const again = await load(second);
        expect(await registry.exportGraphToString(again.snapshot, "gml", { styles: again.styles })).toBe(second);
    });
});

/** The block-tamper fixtures: a file graphty wrote, then edited outside as design 10.7 items 4 and 5 describe. */
async function tamperFixtures(): Promise<Record<string, Uint8Array>> {
    const base = await load(file("yed-labels-and-arrows.gml"));
    const written = await registry.exportGraphToBytes(base.snapshot, "gml", { styles: base.styles });
    const text = new TextDecoder().decode(written);
    const added = text.replace(/\n {2}node \[/, "\n  node [\n    id 9999\n  ]\n  node [");
    return {
        "graphty-written.gml": written,
        "tamper-native-edited.gml": editGmlNodeFill(written) ?? new Uint8Array(),
        "tamper-block-truncated.gml": replaceGmlBlock(written, (block) => block.slice(0, Math.floor(block.length / 2))),
        "tamper-node-added.gml": new TextEncoder().encode(added),
    };
}

describe("GML block tamper fixtures", () => {
    it("are the edits they say they are (UPDATE_GML_TAMPER=1 writes them again)", async () => {
        for (const [name, bytes] of Object.entries(await tamperFixtures())) {
            const path = join(GENERATED, name);
            if (process.env.UPDATE_GML_TAMPER === "1") {
                writeFileSync(path, bytes);
            }
            expect(new TextDecoder().decode(readFileSync(path))).toBe(new TextDecoder().decode(bytes));
        }
    });

    it("bring an outside edit back as one exception over the same rules", async () => {
        const unedited = await load(file("graphty-written.gml"));
        const edited = await load(file("tamper-native-edited.gml"));
        const below = (ex: ExtractedStyles): unknown => plain(ex).filter((r) => r.role !== "exceptions");
        expect(below(edited.styles)).toEqual(below(unedited.styles));
        const excepted = edited.styles.columns.node.get("exceptions.fill") ?? [];
        expect(excepted.filter((v) => v !== null)).toEqual(["#123456"]);
    });

    it("ignore a truncated block and a block for another graph with a note, and read the yEd graphics", async () => {
        for (const [name, reason] of [
            ["tamper-block-truncated.gml", "NOT_JSON"],
            ["tamper-node-added.gml", "FINGERPRINT"],
        ] as const) {
            const { snapshot, styles } = await load(file(name));
            const note = styles.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
            expect(note?.params.samples).toEqual([reason]);
            expect(styles.styles.source.tool).not.toBe("graphty");
            expect(resolveStyles(styles, "node", "labelWeight", snapshot)).toContain("bold");
        }
    });
});
