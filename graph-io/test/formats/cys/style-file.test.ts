/**
 * Cytoscape style files: a vizmap XML document and a 2.x `vizmap.props` read on their own over a graph, and a 2.x
 * session's `session_vizmap.props` read as its style, each giving what a 3.x session's `session_vizmap.xml` gives.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { keptForStyles } from "../../../src/common/report.js";
import { readZipDirectory, readZipEntry } from "../../../src/common/zip.js";
import { cysImporter, readCytoscapeStyleFile } from "../../../src/formats/cys/index.js";
import type { XmlNode } from "../../../src/formats/cys/session.js";
import type { SessionStyleSource } from "../../../src/formats/cys/styles.js";
import { parseJavaProperties, vizmapFromProps } from "../../../src/formats/cys/vizmap-props.js";
import { createRegistry } from "../../../src/registry.js";
import { StyleBudget } from "../../../src/styles/budget.js";
import { type ExtractedStyles, resolveStyles } from "../../../src/styles/internal.js";
import type { StyleProperty, StyleTarget } from "../../../src/styles/types.js";

const registry = createRegistry();
const STYLES = resolve(import.meta.dirname, "../../corpus/styles/cys");
const FIXTURES = resolve(import.meta.dirname, "../../conformance/fixtures/cys");

const file = (path: string): Uint8Array => new Uint8Array(readFileSync(path));

/**
 * One entry of a session, by the end of its name.
 * @param session - the session's bytes
 * @param suffix - the end of the entry's name
 * @returns the entry's bytes
 */
async function entry(session: Uint8Array, suffix: string): Promise<Uint8Array> {
    const found = readZipDirectory(session).find((e) => e.name.endsWith(suffix));
    if (found === undefined) {
        throw new Error(`no ${suffix}`);
    }
    return readZipEntry(session, found, { maxBytes: 2 ** 26, maxRatio: 1000 });
}

/**
 * A session imported with styles, and what it kept for them.
 * @param bytes - the session
 * @returns the import and its style source
 */
async function load(bytes: Uint8Array): Promise<{
    snapshot: Awaited<ReturnType<typeof registry.importGraph>>["snapshot"];
    styles: ExtractedStyles;
    kept: SessionStyleSource;
}> {
    const { snapshot, styles } = await registry.importGraph(bytes, { format: "cys", styles: true });
    const { report } = await registry.importGraph(bytes, { format: "cys" });
    return { snapshot, styles: styles as ExtractedStyles, kept: keptForStyles(report) as SessionStyleSource };
}

const PROPERTIES: readonly [StyleTarget, StyleProperty][] = [
    ["node", "fill"],
    ["node", "shape"],
    ["node", "width"],
    ["node", "label"],
    ["node", "borderColor"],
    ["edge", "color"],
    ["edge", "lineStyle"],
    ["edge", "label"],
];

/**
 * The values of the compared properties.
 * @param styles - the styles
 * @param snapshot - the graph
 * @returns property to values
 */
function valuesOf(styles: ExtractedStyles | null, snapshot: Parameters<typeof resolveStyles>[3]): unknown {
    if (styles === null) {
        return null;
    }
    return Object.fromEntries(PROPERTIES.map(([t, p]) => [`${t}.${p}`, resolveStyles(styles, t, p, snapshot)]));
}

const ruleIds = (x: ExtractedStyles | null): string[] => (x?.styles.rules ?? []).map((r) => r.id).sort();

/**
 * A style of a converted properties document.
 * @param vizmap - the `<vizmap>` element
 * @param name - the style
 * @returns the style's sections
 */
function sections(vizmap: XmlNode, name: string): Record<string, XmlNode> {
    const style = vizmap.children.find((c) => c.attrs.get("name") === name) as XmlNode;
    return Object.fromEntries(style.children.map((c) => [c.name, c]));
}

const vp = (section: XmlNode, name: string): XmlNode | undefined =>
    section.children.find((c) => c.name === "visualProperty" && c.attrs.get("name") === name);

describe("a standalone vizmap XML file", () => {
    it("gives over a session's network what the session itself gives", async () => {
        const session = file(resolve(STYLES, "cytoscape-tutorials-layout-v1.cys"));
        const { snapshot, styles, kept } = await load(session);
        const xml = await entry(session, "session_vizmap.xml");
        const alone = await readCytoscapeStyleFile(xml, snapshot, { style: kept.visualStyle });
        expect(ruleIds(alone)).toEqual(ruleIds(styles));
        expect(valuesOf(alone, snapshot)).toEqual(valuesOf(styles, snapshot));
        // the same file as text
        const text = await readCytoscapeStyleFile(new TextDecoder().decode(xml), snapshot, {
            style: kept.visualStyle,
        });
        expect(valuesOf(text, snapshot)).toEqual(valuesOf(styles, snapshot));
    });

    it("reads the first style when none is named, and notes the others", async () => {
        const session = file(resolve(STYLES, "cytoscape-tutorials-layout-v1.cys"));
        const { snapshot } = await load(session);
        const alone = (await readCytoscapeStyleFile(
            await entry(session, "session_vizmap.xml"),
            snapshot,
        )) as ExtractedStyles;
        expect(alone.styles.notes.map((n) => n.code)).toContain("W_STYLE_OTHER_STYLES");
        expect(alone.styles.notes.map((n) => n.code)).not.toContain("W_STYLE_VIEW_STYLE_MISSING");
    });

    it("notes a file it cannot read instead of throwing", async () => {
        const { snapshot } = await load(file(resolve(STYLES, "cytoscape-tutorials-layout-v1.cys")));
        for (const bad of ["<vizmap><visualStyle", "<graphml/>"]) {
            const read = (await readCytoscapeStyleFile(bad, snapshot)) as ExtractedStyles;
            const note = read.styles.notes.find((n) => n.code === "W_STYLE_UNREADABLE");
            expect(note?.params.property).toBe("vizmap.xml");
        }
    });
});

describe("a 2.x session's style", () => {
    it("is read from session_vizmap.props: mappings as rules, as a 3.x session's are", async () => {
        const { snapshot, styles, kept } = await load(file(resolve(FIXTURES, "session2x/v270session.cys")));
        expect(kept.era).toBe("2");
        expect(kept.visualStyle).toBe("Solid");
        expect(kept.vizmap?.children.length).toBe(5);
        expect(ruleIds(styles)).toEqual(
            expect.arrayContaining(["node.passthrough.label", "edge.passthrough.interaction"]),
        );
        // the passthrough over `name` (2.x `ID`) reads the label XGMML keeps the name in
        const labels = resolveStyles(styles, "node", "label", snapshot);
        expect(labels[0]).toBe(snapshot.nodes.get("label")?.value(0));
        // the network files' resolved values, read as before when a 2.x session has no style file, agree with it
        const { report } = await registry.importGraph(file(resolve(FIXTURES, "session2x/v270session.cys")), {
            format: "cys",
        });
        const resolved = cysImporter.styles?.(snapshot, {
            budget: new StyleBudget(),
            kept: { ...(keptForStyles(report) as SessionStyleSource), vizmap: null },
        });
        for (const p of ["fill", "borderColor", "shape", "width", "height"] as const) {
            expect(resolveStyles(styles, "node", p, snapshot)).toEqual(
                (resolved?.node as { values?: Record<string, unknown> } | undefined)?.values?.[p],
            );
        }
    });

    it("locks node width and height when the 2.x style leaves the lock out, as 2.x drew it", async () => {
        const { snapshot, styles } = await load(file(resolve(FIXTURES, "session2x/v283Session1.cys")));
        const width = resolveStyles(styles, "node", "width", snapshot);
        expect(width[0]).toBe(resolveStyles(styles, "node", "height", snapshot)[0]);
        expect(width[0]).toBe(35);
    });

    it("gives the same rules standalone as inside the session", async () => {
        const session = file(resolve(FIXTURES, "session2x/v252Session.cys"));
        const { snapshot, styles, kept } = await load(session);
        const props = await entry(session, "session_vizmap.props");
        const alone = await readCytoscapeStyleFile(props, snapshot, { style: kept.visualStyle });
        expect(ruleIds(alone)).toEqual(ruleIds(styles));
    });
});

describe("converting vizmap.props", () => {
    it("reads Java properties: comments, separators, continuations and escapes", () => {
        const props = parseJavaProperties(
            [
                "# a comment",
                "! another",
                "a=1",
                "b : 2",
                "c 3",
                "with\\ space=x",
                "long=one \\",
                "    two",
                "u=\\u0041\\t",
                "a=again",
            ].join("\r\n"),
        );
        expect(Object.fromEntries(props)).toEqual({
            a: "again",
            b: "2",
            c: "3",
            "with space": "x",
            long: "one two",
            u: "A\t",
        });
        expect([...props.keys()][0]).toBe("a");
    });

    it("converts 2.x calculators the way Cytoscape 3 does", () => {
        const vizmap = vizmapFromProps(
            parseJavaProperties(
                [
                    "nodeAppearanceCalculator.S.defaultNodeFillColor=255,0,0",
                    "nodeAppearanceCalculator.S.defaultNodeLineType=DASHED_3",
                    "nodeAppearanceCalculator.S.nodeSizeLocked=false",
                    "nodeAppearanceCalculator.S.nodeFillColorCalculator=Old",
                    "nodeAppearanceCalculator.S.nodeShapeCalculator=Nested",
                    "nodeAppearanceCalculator.S.nodeUniformSizeCalculator=Deg",
                    "edgeAppearanceCalculator.S.defaultNodeShape=ellipse",
                    "edgeAppearanceCalculator.S.defaultEdgeSourceArrow=WHITE_DELTA",
                    "edgeAppearanceCalculator.S.defaultEdgeColor=0,0,255",
                    "edgeAppearanceCalculator.S.edgeLabelCalculator=Id",
                    "globalAppearanceCalculator.S.defaultBackgroundColor=1,2,3",
                    "nodeColorCalculator.Old.mapping.type=DiscreteMapping",
                    "nodeColorCalculator.Old.mapping.controller=rank",
                    "nodeColorCalculator.Old.mapping.controllerType=3",
                    "nodeColorCalculator.Old.mapping.map.1=0,255,0",
                    "nodeShapeCalculator.Nested.mapping.type=DiscreteMapping",
                    "nodeShapeCalculator.Nested.mapping.controller=has_nested_network",
                    "nodeShapeCalculator.Nested.mapping.map.yes=rect",
                    "nodeUniformSizeCalculator.Deg.mapping.type=ContinuousMapping",
                    "nodeUniformSizeCalculator.Deg.mapping.controller=degree",
                    "nodeUniformSizeCalculator.Deg.mapping.boundaryvalues=1",
                    "nodeUniformSizeCalculator.Deg.mapping.bv0.domainvalue=2.0",
                    "nodeUniformSizeCalculator.Deg.mapping.bv0.lesser=",
                    "nodeUniformSizeCalculator.Deg.mapping.bv0.equal=10.0",
                    "nodeUniformSizeCalculator.Deg.mapping.bv0.greater=20.0",
                    "edgeLabelCalculator.Id.mapping.type=PassThroughMapping",
                    "edgeLabelCalculator.Id.mapping.controller=ID",
                    "unrelated.key=1",
                ].join("\n"),
            ),
        );
        expect(vizmap.children.map((c) => c.attrs.get("name"))).toEqual(["S"]);
        const { network, node, edge } = sections(vizmap, "S");
        expect(vp(network, "NETWORK_BACKGROUND_PAINT")?.attrs.get("default")).toBe("1,2,3");
        expect(vp(node, "NODE_FILL_COLOR")?.attrs.get("default")).toBe("255,0,0");
        expect(vp(node, "NODE_BORDER_LINE_TYPE")?.attrs.get("default")).toBe("EQUAL_DASH");
        expect(vp(node, "NODE_BORDER_WIDTH")?.attrs.get("default")).toBe("3");
        // an edge calculator's node default is not a default
        expect(vp(node, "NODE_SHAPE")?.attrs.get("default")).toBeUndefined();
        const dep = node.children.find((c) => c.name === "dependency");
        expect(Object.fromEntries(dep?.attrs ?? [])).toEqual({ name: "nodeSizeLocked", value: "false" });
        // Cytoscape 2.3's calculator name, with its controller type
        const fill = vp(node, "NODE_FILL_COLOR")?.children[0];
        expect(fill?.name).toBe("discreteMapping");
        expect(Object.fromEntries(fill?.attrs ?? [])).toEqual({ attributeName: "rank", attributeType: "integer" });
        expect(Object.fromEntries(fill?.children[0].attrs ?? [])).toEqual({ attributeValue: "1", value: "0,255,0" });
        // has_nested_network is a yes/no string in 2.x and a boolean in 3.x
        const shape = vp(node, "NODE_SHAPE")?.children[0];
        expect(shape?.attrs.get("attributeType")).toBe("boolean");
        expect(shape?.children[0].attrs.get("attributeValue")).toBe("true");
        const size = vp(node, "NODE_SIZE")?.children[0];
        expect(size?.name).toBe("continuousMapping");
        expect(Object.fromEntries(size?.children[0].attrs ?? [])).toEqual({
            attrValue: "2.0",
            equalValue: "10.0",
            greaterValue: "20.0",
        });
        // a fused arrow is a color and a shape; the edge color both edge paints
        expect(vp(edge, "EDGE_SOURCE_ARROW_UNSELECTED_PAINT")?.attrs.get("default")).toBe("255,255,255");
        expect(vp(edge, "EDGE_SOURCE_ARROW_SHAPE")?.attrs.get("default")).toBe("DELTA");
        expect(vp(edge, "EDGE_UNSELECTED_PAINT")?.attrs.get("default")).toBe("0,0,255");
        expect(vp(edge, "EDGE_STROKE_UNSELECTED_PAINT")?.attrs.get("default")).toBe("0,0,255");
        // ID is the name column
        expect(vp(edge, "EDGE_LABEL")?.children[0].attrs.get("attributeName")).toBe("name");
    });

    it("reads a props file's r,g,b colors as Cytoscape does", async () => {
        // a graph with no graphics of its own
        const { snapshot } = await registry.importGraph(
            file(resolve(import.meta.dirname, "../../corpus/csv/simple-edges.csv")),
            { format: "csv" },
        );
        const props = "nodeAppearanceCalculator.S.defaultNodeFillColor=255,0,51\n";
        const read = (await readCytoscapeStyleFile(props, snapshot)) as ExtractedStyles;
        expect(resolveStyles(read, "node", "fill", snapshot)[0]).toBe("#ff0033");
    });
});
