/**
 * The sample files from other programs that the graphty app's start page offers
 * (graph-io/test/corpus/programs/samples.json, one per program), each loaded into a real `<graphty-element>` with its
 * file's styles, as the app opens it: every node and edge arrives, a file that stores its drawing is drawn where its
 * program put each node, and several nodes are drawn with the shape, fill and label the file gives them (graph-io's
 * test/programs/program-samples.test.ts holds the same values as the importer reads them).
 */
import { afterEach, assert, describe, it } from "vitest";

import SAMPLES from "../../../graph-io/test/corpus/programs/samples.json";
import type { SceneEdge, SceneNode } from "../../../graph-io/test/fidelity/scene";
import { drawnScene, mountSample, unmount } from "../fidelity/mount";

/** What a node is drawn with: its shape class, fill (null when hollow) and label. */
interface DrawnNode {
    readonly shape: SceneNode["shape"];
    readonly fill: string | null;
    readonly label: string;
    readonly labelColor?: string;
}

/** What each styled sample draws. */
interface Expected {
    readonly nodes: Readonly<Record<string, DrawnNode>>;
    /** Edge colors the file gives some of its edges. */
    readonly edgeColors: readonly string[];
    /** How many edges the file draws in a line style other than solid. */
    readonly edgeStyles?: Readonly<Partial<Record<SceneEdge["style"], number>>>;
    /** Whether the file stores every node's position. */
    readonly placed: boolean;
}

const EXPECTED: Readonly<Record<string, Expected>> = {
    yed: {
        nodes: {
            "n0::n3": { shape: "hexagon", fill: "#669933", label: "External Layout" },
            "n1::n7::n0": { shape: "diamond", fill: "#6699cc", label: "Custom Function" },
            "n1::n6::n0": { shape: "parallelogram", fill: "#ffffff", label: "Privilege Set" },
            "n1::n3::n2": { shape: "star", fill: "#ffcc00", label: "Layout Script Trigger" },
        },
        edgeColors: ["#000000", "#ff33ff", "#339966"],
        edgeStyles: { dotted: 2 },
        placed: true,
    },
    "yed-live": {
        nodes: {
            n0: { shape: "ellipse", fill: "#ff8c00", label: "x1" },
            n3: { shape: "ellipse", fill: null, label: "p(X4)" },
            n6: { shape: "parallelogram", fill: null, label: "+" },
        },
        edgeColors: ["#000000", "#a0a0a0"],
        placed: true,
    },
    cytoscape: {
        nodes: {
            "7541": { shape: "rect", fill: "#ffffff", label: "Apoptosis" },
            "7539": { shape: "ellipse", fill: "#ccffcc", label: "CREB1" },
            "7505": { shape: "octagon", fill: "#ffccff", label: "PtsIns(3,4,5)P3" },
        },
        edgeColors: ["#0099ff", "#333333"],
        placed: true,
    },
    "cytoscape-xgmml": {
        nodes: {
            "392": { shape: "rect", fill: "#f2e1df", label: "SNF3" },
            "390": { shape: "ellipse", fill: "#f7f7f7", label: "YBR043C" },
        },
        edgeColors: ["#848484"],
        placed: true,
    },
    "ndex-cx": {
        nodes: {
            "1655": { shape: "ellipse", fill: "#006666", label: "STAT3", labelColor: "#ffffff" },
            "1650": { shape: "roundrect", fill: "#ffffff", label: "Cell Growth" },
            "1645": { shape: "octagon", fill: "#ffffff", label: "PtsIns(3,4,5)P3" },
        },
        edgeColors: ["#ffffff"],
        placed: true,
    },
    "ndex-cx2": {
        nodes: {
            "136962": { shape: "rect", fill: "#ffffff", label: "FBXW5", labelColor: "#0033ff" },
            "137115": { shape: "rect", fill: "#ff9999", label: "TLR1" },
        },
        edgeColors: ["#0000ff", "#000000"],
        placed: true,
    },
    "cytoscape-js": {
        nodes: {
            "296": { shape: "ellipse", fill: "#999999", label: "MED6", labelColor: "#ffffff" },
            "142": { shape: "ellipse", fill: "#666666", label: "RAD50" },
        },
        edgeColors: ["#f6c28c", "#a0b3d8", "#dad4a8"],
        placed: true,
    },
    gephi: {
        nodes: {
            "0": { shape: "ellipse", fill: "#5b5bf5", label: "Myriel" },
            "16": { shape: "ellipse", fill: "#5bc2f5", label: "Tholomyes" },
        },
        edgeColors: ["#5b5bf5"],
        placed: true,
    },
    graphviz: {
        nodes: {
            SCI: { shape: "ellipse", fill: "#d9e7ee", label: "System calls" },
            DM: { shape: "octagon", fill: "#91b5c9", label: "Device\nModel" },
            system: { shape: "rect", fill: "#ffffff", label: "system" },
        },
        edgeColors: ["#e27dd6", "#61c2c5", "#c46747"],
        placed: false,
    },
    ogdf: {
        nodes: {
            // the text inside the label's markup, in its textColor
            "0": { shape: "rect", fill: "#ffd700", label: "Sample Attribute", labelColor: "#000000" },
            "29": { shape: "rect", fill: "#008000", label: "Experiment Hybridization", labelColor: "#ffffff" },
        },
        edgeColors: ["#000000"],
        edgeStyles: { dotted: 15 },
        placed: false,
    },
    pajek: {
        nodes: {
            "1": { shape: "ellipse", fill: "#ffccff", label: "207-555-8248" },
            "2": { shape: "rect", fill: "#ccffff", label: "415-555-2188" },
            // Pajek's diamond is its own six-cornered outline
            "4": { shape: "hexagon", fill: "#ccffb3", label: "303-555-4393" },
        },
        edgeColors: ["#999999"],
        placed: true,
    },
};

afterEach(() => {
    unmount();
});

describe("the sample files from other programs, drawn with their file styles", () => {
    it("has an expectation for every styled sample", () => {
        assert.deepEqual(
            SAMPLES.filter((sample) => sample.styled).map((sample) => sample.id),
            Object.keys(EXPECTED),
        );
    });

    it.each(SAMPLES.map((sample) => [sample.program, sample] as const))("%s", async (_, sample) => {
        // a table whose header does not name its edge ends names them in the source's options; a Neo4j file is
        // read by the element's CSV source, which knows it by its header
        const columns = "columns" in sample ? sample.columns : undefined;
        const options = columns === undefined ? undefined : { edgeSource: columns.source, edgeTarget: columns.target };
        const type = "type" in sample ? sample.type : sample.format;
        const { element, sha256, command } = await mountSample(
            { id: sample.id, format: type, file: sample.file, license: sample.license, routes: [] },
            undefined,
            undefined,
            options,
        );
        const { counts } = element.session.status;
        assert.deepEqual([counts.nodes, counts.edges], [sample.nodes, sample.edges], `${sample.id} counts`);
        const expected = EXPECTED[sample.id] as Expected | undefined;
        if (expected === undefined) {
            return;
        }
        if (expected.placed) {
            assert.equal(element.layout, "fixed", `${sample.id} is drawn where the file placed it`);
            assert.equal(element.session.seededNodeCount, sample.nodes);
        }
        const scene = drawnScene(element, sha256, command);
        const nodes = new Map(scene.nodes.map((node) => [node.id, node]));
        for (const [id, want] of Object.entries(expected.nodes)) {
            const node = nodes.get(id);
            assert.isDefined(node, `${sample.id} draws node ${id}`);
            assert.deepEqual(
                {
                    shape: node?.shape,
                    fill: node?.fill,
                    label: node?.label?.text,
                    ...(want.labelColor === undefined ? {} : { labelColor: node?.label?.color }),
                },
                want,
                `${sample.id} node ${id}`,
            );
        }
        const colors = new Set(scene.edges.map((edge) => edge.color));
        assert.includeMembers([...colors], [...expected.edgeColors], `${sample.id} edge colors`);
        for (const [style, count] of Object.entries(expected.edgeStyles ?? {})) {
            assert.equal(
                scene.edges.filter((edge) => edge.style === style).length,
                count,
                `${sample.id} ${style} edges`,
            );
        }
    });
});
