/**
 * The sample files from other programs that the graphty app's start page offers (corpus/programs/samples.json, one
 * per program): each one reads with the node and edge counts the file holds, and the styles that program draws it
 * with -- several nodes' shapes, colors, labels and sizes, edge colors and line styles, and where the file stores
 * them, positions -- read back from the file's own values.
 */

import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

import { assert, describe, it } from "vitest";

import { createRegistry, type ImportGraphResult } from "../../src/index.js";
import { extractPositions } from "../../src/positions/index.js";
import { resolveStyles } from "../../src/styles/internal.js";
import SAMPLES from "../corpus/programs/samples.json";

const registry = createRegistry();

/** One sample of samples.json. */
type Sample = (typeof SAMPLES)[number] & {
    /** The columns an edge's ends are in, for a table whose header does not name them. */
    readonly columns?: { readonly source: string; readonly target: string };
};

/** What a node is drawn with, as the file states it. */
type NodeValues = Partial<Record<"shape" | "fill" | "label" | "labelColor" | "borderColor" | "borderStyle", string>> &
    Partial<Record<"width" | "height" | "fillOpacity", number>>;
/** What an edge is drawn with, as the file states it. */
type EdgeValues = Partial<Record<"color" | "lineStyle" | "targetArrow", string>> & { readonly width?: number };

/** What each styled sample's file says about some of its nodes and edges (edges by their place in the file). */
interface Expected {
    readonly nodes: Readonly<Record<string, NodeValues>>;
    readonly edges: Readonly<Record<number, EdgeValues>>;
    /** Node centers, y up, in the file's unit, for a file that stores them. */
    readonly positions?: Readonly<Record<string, readonly [number, number]>>;
}

const EXPECTED: Readonly<Record<string, Expected>> = {
    yed: {
        nodes: {
            n0: { shape: "round-rectangle", fill: "#ccccff", label: "External File", borderStyle: "dashed" },
            "n0::n1": { shape: "rectangle", fill: "#6699cc", label: "External BaseTable", width: 30, height: 30 },
            "n0::n3": { shape: "hexagon", fill: "#669933", label: "External Layout" },
            "n1::n3::n3::n0": { shape: "octagon", fill: "#669933", label: "Layout Object" },
            "n1::n6::n0": { shape: "parallelogram", fill: "#ffffff", label: "Privilege Set" },
            "n1::n7::n0": { shape: "diamond", fill: "#6699cc", label: "Custom Function" },
        },
        edges: {
            0: { color: "#000000", lineStyle: "solid", width: 1 },
            14: { color: "#ff33ff", lineStyle: "solid" },
            71: { color: "#339966", lineStyle: "dotted" },
        },
        // Geometry x + width / 2, -(y + height / 2)
        positions: { "n0::n3": [702.2491435946602, 384], "n1::n7::n0": [-694.146484375, 96] },
    },
    "yed-live": {
        nodes: {
            n0: { shape: "ellipse", fill: "#ff8c00", label: "x1", width: 30, height: 30 },
            // SolidColorFill #00000000: hollow
            n3: { shape: "ellipse", fillOpacity: 0, label: "p(X4)", borderColor: "#000000" },
            n5: { shape: "rectangle", label: "Conv", borderColor: "#ff8c00", borderStyle: "dashed", width: 165 },
            n6: { shape: "parallelogram", fillOpacity: 0, label: "+", borderColor: "#3a3a3a", width: 45 },
        },
        edges: {
            0: { color: "#000000", lineStyle: "solid", width: 1.5 },
            14: { color: "#000000", lineStyle: "dashed" },
            53: { color: "#a0a0a0", lineStyle: "dashed" },
        },
    },
    cytoscape: {
        nodes: {
            "7541": { shape: "rectangle", fill: "#ffffff", label: "Apoptosis", width: 110, height: 60 },
            "7539": { shape: "ellipse", fill: "#ccffcc", label: "CREB1", borderColor: "#009900" },
            "7509": { shape: "round-rectangle", fill: "#00cc33", label: "BAK/BAX" },
            "7505": { shape: "octagon", fill: "#ffccff", label: "PtsIns(3,4,5)P3", borderColor: "#ff66ff" },
        },
        edges: {
            0: { color: "#0099ff", lineStyle: "dashed", targetArrow: "none", width: 3 },
            1: { color: "#0099ff", lineStyle: "solid", targetArrow: "triangle" },
            9: { color: "#333333", lineStyle: "solid" },
        },
    },
    "cytoscape-xgmml": {
        nodes: {
            "392": { shape: "rectangle", fill: "#f2e1df", label: "SNF3", width: 75, height: 35 },
            "390": { shape: "ellipse", fill: "#f7f7f7", label: "YBR043C" },
            "389": { shape: "rectangle", fill: "#eaf0f3", label: "ASN1" },
        },
        edges: { 0: { color: "#848484", lineStyle: "solid", width: 2 } },
    },
    "ndex-cx": {
        nodes: {
            "1655": {
                shape: "ellipse",
                fill: "#006666",
                label: "STAT3",
                labelColor: "#ffffff",
                borderColor: "#ff6666",
            },
            "1654": { shape: "ellipse", fill: "#0099cc", label: "JAK1/STAT1/STAT3", width: 180, height: 180 },
            "1650": { shape: "round-rectangle", fill: "#ffffff", label: "Cell Growth", width: 220 },
            "1645": { shape: "octagon", label: "PtsIns(3,4,5)P3", width: 20 },
        },
        edges: {
            0: { color: "#ffffff", lineStyle: "solid", targetArrow: "triangle" },
            35: { lineStyle: "dotted" },
        },
        positions: { "1655": [-90.96383519643331, -145.72860480281304] },
    },
    "ndex-cx2": {
        nodes: {
            "136962": {
                shape: "rectangle",
                fill: "#ffffff",
                label: "FBXW5",
                labelColor: "#0033ff",
                borderColor: "#0033ff",
            },
            "137115": { shape: "rectangle", fill: "#ff9999", label: "TLR1", width: 80, height: 20 },
            "136858": { shape: "ellipse", label: "(Mycobacteria)\n" },
        },
        edges: {
            0: { color: "#0000ff", targetArrow: "none" },
            1: { color: "#000000", targetArrow: "triangle" },
        },
    },
    "cytoscape-js": {
        nodes: {
            "296": { shape: "ellipse", fill: "#999999", label: "MED6", labelColor: "#ffffff" },
            "142": { shape: "ellipse", fill: "#666666", label: "RAD50" },
        },
        edges: { 0: { color: "#f6c28c", width: 2 }, 1: { color: "#a0b3d8" }, 2: { color: "#dad4a8" } },
    },
    gephi: {
        nodes: {
            // viz:color r g b, viz:size the radius
            "0": { shape: "ellipse", fill: "#5b5bf5", label: "Myriel", width: 57.37143 },
            "2": { fill: "#f55b5b", label: "MlleBaptistine" },
            "16": { fill: "#5bc2f5", label: "Tholomyes", width: 51.885712 },
            "24": { fill: "#5bf5c2", label: "MmeThenardier" },
        },
        edges: { 0: { color: "#5b5bf5", width: 1 }, 1: { width: 8 } },
        positions: { "0": [-102.81979, -185.35468], "16": [-221.21465, 507.8929] },
    },
    graphviz: {
        nodes: {
            system: { shape: "rectangle", label: "system", borderColor: "#e27dd6" },
            SCI: { shape: "ellipse", fill: "#d9e7ee", label: "System calls" },
            sysfs: { shape: "rectangle", fill: "#b2d3e4", label: "proc & sysfs\nfile systems" },
            DM: { shape: "octagon", fill: "#91b5c9", label: "Device\nModel" },
        },
        edges: { 0: { color: "#e27dd6", targetArrow: "triangle" }, 6: { color: "#61c2c5" }, 12: { color: "#c46747" } },
    },
    ogdf: {
        nodes: {
            // the label's text, not the rich text markup around it, and its textColor (ARGB)
            "0": { shape: "rectangle", fill: "#ffd700", label: "Sample Attribute", labelColor: "#000000", width: 130 },
            "6": { fill: "#b0c4de", label: "Project User", width: 100, height: 40 },
            "29": { fill: "#008000", label: "Experiment Hybridization", labelColor: "#ffffff" },
            "32": { fill: "#a52a2a", label: "User", labelColor: "#ffffff" },
        },
        edges: { 0: { lineStyle: "solid" }, 11: { lineStyle: "dotted" } },
    },
    pajek: {
        nodes: {
            "1": { shape: "ellipse", fill: "#ffccff", label: "207-555-8248", borderColor: "#660000" },
            "2": { shape: "rectangle", fill: "#ccffff", label: "415-555-2188" },
            // Pajek's diamond is its own six-cornered outline
            "4": { shape: "polygon", fill: "#ccffb3", label: "303-555-4393" },
        },
        edges: { 0: { color: "#999999", targetArrow: "triangle" } },
        positions: { "1": [0.5, -0.625], "4": [0.9771, -0.8333] },
    },
};

/**
 * Reads a sample file as the program wrote it, gunzipped when it is stored compressed.
 * @param sample - the sample
 * @returns the import result, with styles
 */
async function load(sample: Sample): Promise<ImportGraphResult> {
    const stored = readFileSync(new URL(`../${sample.file}`, import.meta.url));
    const bytes = sample.file.endsWith(".gz") ? gunzipSync(stored) : stored;
    return registry.importGraph(new Uint8Array(bytes), {
        filename: sample.file.replace(/\.gz$/, ""),
        styles: true,
        ...(sample.columns === undefined
            ? {}
            : { sourceColumn: sample.columns.source, targetColumn: sample.columns.target }),
    });
}

/**
 * A node's index by the id the file gives it.
 * @param result - the import
 * @param id - the id as written
 * @returns the index
 */
function indexOf(result: ImportGraphResult, id: string): number {
    const { ids } = result.snapshot;
    // an absent id is INVALID_INDEX, past the last node
    const index = [id, Number(id)].map((each) => ids.indexOf(each)).find((each) => each < result.snapshot.nodeCount);
    assert.isDefined(index, `no node ${id}`);
    return index ?? -1;
}

describe("the sample files from other programs", () => {
    it("are one per program", () => {
        assert.equal(new Set(SAMPLES.map((sample) => sample.program)).size, SAMPLES.length);
        assert.deepEqual(
            SAMPLES.filter((sample) => sample.styled).map((sample) => sample.id),
            Object.keys(EXPECTED),
        );
    });

    it.each(SAMPLES.map((sample) => [sample.program, sample as Sample] as const))(
        "%s reads with the file's node and edge counts and its detected format",
        async (_, sample) => {
            const result = await load(sample);
            assert.equal(result.format, sample.format);
            assert.equal(result.report.errorCount, 0);
            assert.deepEqual([result.snapshot.nodeCount, result.snapshot.edgeCount], [sample.nodes, sample.edges]);
            assert.equal(result.styles !== null && result.styles !== undefined, sample.styled);
        },
    );

    it.each(SAMPLES.filter((sample) => sample.styled).map((sample) => [sample.program, sample as Sample] as const))(
        "%s keeps its program's shapes, colors, labels, sizes and edge styles",
        async (_, sample) => {
            const result = await load(sample);
            const styles = result.styles;
            assert.isOk(styles);
            if (!styles) {
                return;
            }
            const expected = EXPECTED[sample.id];
            for (const [id, values] of Object.entries(expected.nodes)) {
                const index = indexOf(result, id);
                for (const [property, value] of Object.entries(values)) {
                    const got = resolveStyles(styles, "node", property as never, result.snapshot)[index];
                    if (typeof value === "number") {
                        assert.isNumber(got, `${sample.id} node ${id} ${property}`);
                        assert.closeTo(Number(got), value, 1e-3, `${sample.id} node ${id} ${property}`);
                    } else {
                        assert.equal(got, value, `${sample.id} node ${id} ${property}`);
                    }
                }
            }
            for (const [edge, values] of Object.entries(expected.edges)) {
                for (const [property, value] of Object.entries(values)) {
                    const got = resolveStyles(styles, "edge", property as never, result.snapshot)[Number(edge)];
                    assert.equal(got, value, `${sample.id} edge ${edge} ${property}`);
                }
            }
            if (expected.positions !== undefined) {
                const positions = extractPositions(registry.importer(sample.format), result.snapshot, result.report);
                assert.isTrue(positions?.usable, `${sample.id} stores its positions`);
                for (const [id, [x, y]] of Object.entries(expected.positions)) {
                    const index = indexOf(result, id);
                    assert.closeTo(positions?.coords[index * 3] ?? Number.NaN, x, 1e-6, `${sample.id} ${id} x`);
                    assert.closeTo(positions?.coords[index * 3 + 1] ?? Number.NaN, y, 1e-6, `${sample.id} ${id} y`);
                }
            }
        },
    );
});
