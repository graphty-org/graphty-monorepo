/**
 * Styles through the importer contract: a third-party importer's simple path, what an import keeps for its styles,
 * the generic reader of style roles, cancellation, the not-imported warning, and the promise that nothing changes
 * for a caller who does not ask for styles.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GraphBuilder, type GraphSink } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { STYLES_NOT_IMPORTED_CODE, XML_NESTING_CODE } from "../../src/common/codes.js";
import { ImportReportBuilder, keptForStyles } from "../../src/common/report.js";
import { MAX_XML_DEPTH } from "../../src/common/xml.js";
import { jsonImporter } from "../../src/formats/json/index.js";
import {
    checkExport,
    createRegistry,
    exportGraphToBytes,
    exportGraphToString,
    importGraph,
    registry,
} from "../../src/registry.js";
import { featuresOf, planStyles, resolveStyles, styleFingerprint } from "../../src/styles/internal.js";
import type { StyleReadContext } from "../../src/styles/types.js";
import { type GraphImporter, ImportError, type ImportInput } from "../../src/types.js";
import { digestFormat } from "./no-styles-digest.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "..", "conformance", "fixtures");
/** The digest of every conformance fixture taken before styles were added (no-styles-digest.ts). */
const baseline = JSON.parse(readFileSync(join(HERE, "no-styles-baseline.json"), "utf-8")) as Record<
    string,
    Record<string, string>
>;

/** One spelling per group of the same color, so only the group explains the fill. */
const GROUPS: readonly (readonly [string, readonly string[], string])[] = [
    ["a", ["red", "#f00", "#FF0000", "rgb(255, 0, 0)"], "#ff0000"],
    ["b", ["blue", "#00f", "rgb(0,0,255)", "hsl(240, 100%, 50%)"], "#0000ff"],
    ["c", ["green", "#008000", "rgb(0 128 0)", "GREEN"], "#008000"],
    ["d", ["orange", "#ffa500", "#FFA500", "rgb(255,165,0)"], "#ffa500"],
    ["e", ["purple", "#800080", "rgb(128, 0, 128)", "Purple"], "#800080"],
];

/**
 * A node-link JSON document of 300 nodes in five groups, each node's color in one of four CSS spellings.
 * @returns the text
 */
function groupsDocument(): string {
    const nodes = [];
    for (let i = 0; i < 300; i++) {
        const [group, spellings] = GROUPS[i % GROUPS.length];
        nodes.push({ id: `n${String(i)}`, group, color: spellings[Math.floor(i / GROUPS.length) % spellings.length] });
    }
    return JSON.stringify({ directed: false, multigraph: false, graph: {}, nodes, links: [] });
}

/**
 * A third-party importer: node-link JSON read by graph-io's JSON importer, with its whole style support in one line.
 */
const thirdParty: GraphImporter = {
    format: "groups",
    extensions: [".groups"],
    mimeTypes: [],
    import: (input, sink, options) => jsonImporter.import(input, sink, options),
    styles: () => ({ dialect: "css", node: { fill: { data: "color" } } }),
};

describe("the simple path", () => {
    it("recovers fill by group exactly from mixed CSS spellings on 300 nodes", async () => {
        const reg = createRegistry().registerImporter(thirdParty);
        const result = await reg.importGraph(groupsDocument(), { format: "groups", styles: true });
        const { styles } = result;
        expect(styles).not.toBeNull();
        if (styles === null || styles === undefined) {
            return;
        }
        const byGroup = styles.styles.rules.filter(
            (r) => r.map?.fill?.kind === "discrete" && "data" in r.map.fill.by && r.map.fill.by.data === "group",
        );
        expect(byGroup).toHaveLength(1);
        expect(styles.styles.rules.some((r) => r.role === "exceptions" || r.role === "passthrough")).toBe(false);
        const fill = resolveStyles(styles, "node", "fill", result.snapshot);
        for (let i = 0; i < 300; i++) {
            expect(fill[i]).toBe(GROUPS[i % GROUPS.length][2]);
        }
        // the color column stays in the data and is not offered as an explanation of itself
        expect(result.snapshot.nodes.has("color")).toBe(true);
        expect(styles.features.node.some((f) => "data" in f.ref && f.ref.data === "color")).toBe(false);
    });

    it("leaves the result without styles when they are not asked for", async () => {
        const reg = createRegistry().registerImporter(thirdParty);
        const result = await reg.importGraph(groupsDocument(), { format: "groups" });
        expect("styles" in result).toBe(false);
        expect(Object.keys(result)).toEqual(["format", "sniff", "snapshot", "report"]);
    });

    it("moves a color's alpha into the fill's opacity and notes a column that is not there", async () => {
        const doc = JSON.stringify({
            directed: false,
            multigraph: false,
            graph: {},
            nodes: [
                { id: "a", c: "rgba(255, 0, 0, 0.5)" },
                { id: "b", c: "#00ff00" },
            ],
            links: [],
        });
        const importer: GraphImporter = {
            ...thirdParty,
            styles: () => ({ dialect: "css", node: { fill: { data: "c" }, borderColor: { data: "missing" } } }),
        };
        const result = await createRegistry().registerImporter(importer).importGraph(doc, {
            format: "groups",
            styles: true,
        });
        const { styles } = result;
        if (styles === null || styles === undefined) {
            throw new Error("no styles");
        }
        expect(resolveStyles(styles, "node", "fill", result.snapshot)).toEqual(["#ff0000", "#00ff00"]);
        expect(resolveStyles(styles, "node", "fillOpacity", result.snapshot)).toEqual([0.5, null]);
        expect(styles.styles.notes.map((n) => n.code)).toContain("W_STYLE_MAPPING_COLUMN_MISSING");
    });
});

describe("what an import keeps for its styles", () => {
    it("gives a stateful importer its own kept object back when two imports run at once", async () => {
        const made: { readonly file: string }[] = [];
        const seen: [string, unknown][] = [];
        const stateful: GraphImporter = {
            format: "kept",
            extensions: [],
            mimeTypes: [],
            async import(input: ImportInput, sink: GraphSink) {
                const report = new ImportReportBuilder("kept", 0);
                const text = input as string;
                const groups = { file: text };
                made.push(groups);
                report.keepForStyles(groups);
                // let the other import run between keeping and finishing
                for (let k = 0; k < 4; k++) {
                    await Promise.resolve();
                }
                sink.addNode(text);
                return report.finish();
            },
            styles(snapshot, context: StyleReadContext) {
                seen.push([String(snapshot.ids.idOf(0)), context.kept]);
                return null;
            },
        };
        const reg = createRegistry().registerImporter(stateful);
        await Promise.all([
            reg.importGraph("one", { format: "kept", styles: true }),
            reg.importGraph("two", { format: "kept", styles: true }),
        ]);
        expect(seen).toHaveLength(2);
        for (const [file, kept] of seen) {
            expect(kept).toBe(made.find((g) => g.file === file));
        }
    });

    it("passes undefined when the import kept nothing", async () => {
        let kept: unknown = "unset";
        const reg = createRegistry().registerImporter({
            ...thirdParty,
            // a copy of the report: what the JSON import kept stays with the original
            import: async (input, sink, options) => ({ ...(await jsonImporter.import(input, sink, options)) }),
            styles: (_s, { kept: given }) => {
                kept = given;
                return null;
            },
        });
        const result = await reg.importGraph(groupsDocument(), { format: "groups", styles: true });
        expect(kept).toBeUndefined();
        expect(result.styles).toBeNull();
    });

    it("carries what a forked or included report kept", () => {
        const a = new ImportReportBuilder("x", 0).keepForStyles("sheet");
        expect(keptForStyles(a.fork().finish())).toBe("sheet");
        const parent = new ImportReportBuilder("x", 0).include(a.finish());
        expect(keptForStyles(parent.finish())).toBe("sheet");
        expect(keptForStyles(new ImportReportBuilder("x", 0).finish())).toBeUndefined();
    });
});

describe("cancellation", () => {
    it("rejects with the signal's reason when the extraction is cancelled", async () => {
        const controller = new AbortController();
        const reg = createRegistry().registerImporter({
            ...thirdParty,
            styles: () => {
                controller.abort(new Error("stop"));
                return { dialect: "css", node: { fill: { data: "color" } } };
            },
        });
        await expect(
            reg.importGraph(groupsDocument(), { format: "groups", styles: true, signal: controller.signal }),
        ).rejects.toThrow("stop");
    });
});

describe("W_STYLES_NOT_IMPORTED", () => {
    /**
     * An importer that reports the file's styles as not imported, and can read them.
     * @returns the importer
     */
    function warning(): GraphImporter {
        return {
            format: "warns",
            extensions: [],
            mimeTypes: [],
            import(_input: ImportInput, sink: GraphSink) {
                const report = new ImportReportBuilder("warns", 0);
                report.warning("unsupported", STYLES_NOT_IMPORTED_CODE, "the file's styles are not applied");
                sink.addNode("a");
                return Promise.resolve(report.finish());
            },
            styles: () => ({ dialect: "css", node: { fill: ["red"] } }),
        };
    }

    it("is reported only when styles are not requested", async () => {
        const reg = createRegistry().registerImporter(warning());
        const without = await reg.importGraph("x", { format: "warns" });
        expect(without.report.issues.map((i) => i.code)).toContain(STYLES_NOT_IMPORTED_CODE);
        const withStyles = await reg.importGraph("x", { format: "warns", styles: true });
        expect(withStyles.report.issues.map((i) => i.code)).not.toContain(STYLES_NOT_IMPORTED_CODE);
        expect(withStyles.report.warningCount).toBe(without.report.warningCount - 1);
    });
});

describe("the generic reader of style roles", () => {
    it("reads a GEXF file's viz colors and sizes, and draws its shapes and thickness as Gephi does", async () => {
        const gexf = `<?xml version="1.0"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
<graph defaultedgetype="directed"><nodes>
<node id="a"><viz:color r="255" g="0" b="0" a="0.5"/><viz:size value="3"/><viz:shape value="square"/></node>
<node id="b"><viz:color r="0" g="0" b="255"/><viz:size value="3"/><viz:shape value="disc"/></node>
</nodes><edges><edge source="a" target="b"><viz:thickness value="2"/><viz:shape value="dashed"/></edge></edges>
</graph></gexf>`;
        const result = await importGraph(gexf, { format: "gexf", styles: true });
        const { styles } = result;
        if (styles === null || styles === undefined) {
            throw new Error("no styles");
        }
        const node = (p: "fill" | "fillOpacity" | "width" | "shape"): unknown[] => [
            ...resolveStyles(styles, "node", p, result.snapshot),
        ];
        expect(node("fill")).toEqual(["#ff0000", "#0000ff"]);
        // Gephi draws opaque discs and solid edges as thick as their weight
        expect(node("fillOpacity")).toEqual([null, null]);
        expect(node("width")).toEqual([6, 6]); // viz:size is a radius
        expect(node("shape")).toEqual(["ellipse", "ellipse"]);
        expect(resolveStyles(styles, "edge", "width", result.snapshot)).toEqual([1]);
        expect(resolveStyles(styles, "edge", "lineStyle", result.snapshot)).toEqual([null]);
        expect(styles.styles.units.length).toBe("relative");
    });

    it("gives no styles for a file with no style roles", async () => {
        const result = await importGraph("a,b\n", { format: "csv", styles: true });
        expect(result.styles).toBeNull();
    });
});

describe("role columns and styles on export", () => {
    /**
     * A graph with a color role column, and styles built for it.
     * @returns the graph and its styles
     */
    function colored(): { snapshot: ReturnType<GraphBuilder["freeze"]>; styles: ReturnType<typeof planStyles> } {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.addNode("b");
        b.addEdge("a", "b");
        const color = b.declareNodeColumn({ name: "color", dtype: "string", role: "color" });
        b.setNodeValue(color, 0, "#ff0000");
        b.setNodeValue(color, 1, "#00ff00");
        const snapshot = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: { values: { fill: ["#ff0000", "#00ff00"] } },
                fingerprint: styleFingerprint(snapshot),
            },
            { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
        );
        return { snapshot, styles };
    }

    it("reports no W_VIZ_DROPPED for a role column when styles are given, and does without them", () => {
        const { snapshot, styles } = colored();
        expect(checkExport(snapshot, "graphml").map((n) => n.code)).toContain("W_VIZ_DROPPED");
        expect(checkExport(snapshot, "graphml", { styles }).map((n) => n.code)).not.toContain("W_VIZ_DROPPED");
    });

    it("keeps a role column's data and writes only the styles into GEXF's slots when styles are given", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        const color = b.declareNodeColumn({ name: "color", dtype: "f32", components: 4, role: "color" });
        b.setNodeValue(color, 0, [1, 0, 0, 1]);
        const snapshot = b.freeze();
        const styles = planStyles(
            { format: "test", node: { values: { fill: ["#0000ff"] } }, fingerprint: styleFingerprint(snapshot) },
            { node: featuresOf(snapshot, "node"), edge: [] },
        );
        const plain = await exportGraphToString(snapshot, "gexf");
        expect(plain).toContain('<viz:color r="255" g="0" b="0"/>');
        const styled = await exportGraphToString(snapshot, "gexf", { styles });
        // the slot holds the styles' blue; the red role column is kept as data only
        expect(styled.match(/<viz:color /g)).toEqual(["<viz:color "]);
        expect(styled).toContain('<viz:color r="0" g="0" b="255"/>');
        expect(styled).toContain('title="color"');
    });

    it("says a JSON role column is written as a plain attribute", () => {
        const { snapshot } = colored();
        const note = checkExport(snapshot, "json").find((n) => n.code === "W_VIZ_DROPPED");
        expect(note?.message).toContain("written as a plain attribute");
        const graphml = checkExport(snapshot, "graphml").find((n) => n.code === "W_VIZ_DROPPED");
        expect(graphml?.message).toContain("cannot be written");
    });
});

describe("deep XML nesting", () => {
    it("reads 20,000 nested list atts without a stack overflow, skipping the list with W_XGMML_BAD_ATT", async () => {
        const depth = 20000;
        const xgmml = `<?xml version="1.0"?><graph xmlns="http://www.cs.rpi.edu/XGMML" directed="1"><node id="1" label="a">${'<att name="x" type="list">'.repeat(depth)}${"</att>".repeat(depth)}</node></graph>`;
        const { snapshot, report } = await importGraph(xgmml, { format: "xgmml" });
        expect(snapshot.nodeCount).toBe(1);
        expect(report.issues.map((i) => i.code)).toContain("W_XGMML_BAD_ATT");
    });

    it("stops an XGMML file nested deeper than MAX_XML_DEPTH with E_XML_NESTING", async () => {
        const depth = MAX_XML_DEPTH + 1;
        const xgmml = `<?xml version="1.0"?><graph xmlns="http://www.cs.rpi.edu/XGMML" directed="1"><node id="1" label="a">${'<att name="x" type="list">'.repeat(depth)}${"</att>".repeat(depth)}</node></graph>`;
        const err = await importGraph(xgmml, { format: "xgmml" }).then(
            () => null,
            (e: unknown) => e,
        );
        expect(err).toBeInstanceOf(ImportError);
        expect((err as ImportError).issue?.code).toBe(XML_NESTING_CODE);
    });

    it("stops deep GraphML and GEXF the same way", async () => {
        const depth = MAX_XML_DEPTH + 1;
        for (const [format, doc] of [
            [
                "graphml",
                `<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph edgedefault="directed"><node id="a">${"<x>".repeat(depth)}${"</x>".repeat(depth)}</node></graph></graphml>`,
            ],
            [
                "gexf",
                `<gexf xmlns="http://gexf.net/1.3" version="1.3"><graph><nodes><node id="a">${"<x>".repeat(depth)}${"</x>".repeat(depth)}</node></nodes></graph></gexf>`,
            ],
        ] as const) {
            const err = await importGraph(doc, { format }).then(
                () => null,
                (e: unknown) => e,
            );
            expect((err as ImportError).issue?.code).toBe(XML_NESTING_CODE);
        }
    });
});

describe("without styles nothing changes", () => {
    for (const format of Object.keys(baseline)) {
        it(`imports and exports every ${format} conformance fixture as before`, async () => {
            const digest = await digestFormat(
                {
                    importGraph: (input, options) => importGraph(input, options),
                    checkExport: (snapshot, f, options) => checkExport(snapshot, f, options),
                    exportGraphToBytes: (snapshot, f, options) => exportGraphToBytes(snapshot, f, options),
                    hasExporter: (f) => registry.hasExporter(f),
                },
                FIXTURES,
                format,
            );
            expect(digest).toEqual(baseline[format]);
        });
    }
});
