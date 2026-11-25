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
    /** Whether the file centers its labels on their nodes, so each must be drawn on its node. */
    readonly labelsCentered?: true;
    /** Nodes whose label the file centers on the node and then moves beside it (Cytoscape's label anchors). */
    readonly labelsBeside?: readonly string[];
    /** Whether the file stores every node's position. */
    readonly placed: boolean;
    /**
     * For a file that stores no positions, the least share of the median gap to a node's nearest neighbor that the
     * median node's width takes, so the nodes are drawn at the size its program draws them beside its layout's gaps.
     */
    readonly widthToSpacing?: number;
    /** The layout the file asks for, which draws it when it stores no positions, and no two nodes overlap in it. */
    readonly layout?: string;
    /**
     * How many labels are drawn at each place round their node: the place the file states for each label, counted.
     * Every node its program labels is counted, so a label left out or drawn elsewhere changes a count.
     */
    readonly labelPositions: Readonly<Partial<Record<LabelPlace, number>>>;
}

/** Where a label is drawn round its node. */
type LabelPlace = NonNullable<SceneNode["label"]>["position"];

/** A sample whose format carries no styling: the column its node labels come from, and one node's text in it. */
interface Unstyled {
    /** The column the element offers for the label role, or null when the node id is the label. */
    readonly column: string | null;
    /** A node and the text the file gives it in that column. */
    readonly node?: readonly [string, string];
}

const UNSTYLED: Readonly<Record<string, Unstyled>> = {
    // a person's name; a film has a title instead
    neo4j: { column: "name", node: ["Keanu", "Keanu Reeves"] },
    // the term's name
    "obo-foundry": { column: "name", node: ["TAXRANK:0000006", "species"] },
    // nothing but the ids
    "cytoscape-sif": { column: null },
    "cytoscape-table": { column: null },
    // a name as the id and a group number
    d3: { column: null },
};

const EXPECTED: Readonly<Record<string, Expected>> = {
    yed: {
        // its groups' internal labels (top and center) are drawn inside, its nodes' sandwich labels (south) below
        labelPositions: { inside: 19, below: 46 },
        nodes: {
            // a group whose fill has no color (hasColor="false"): drawn unfilled
            n0: { shape: "roundrect", fill: null, label: "External File" },
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
        // each label at its own model position: 113 of its 183 nodes have none
        labelPositions: { inside: 24, below: 35, above: 6, left: 2, right: 3 },
        nodes: {
            n0: { shape: "ellipse", fill: "#ff8c00", label: "x1" },
            n3: { shape: "ellipse", fill: null, label: "p(X4)" },
            n6: { shape: "parallelogram", fill: null, label: "+" },
        },
        edgeColors: ["#000000", "#a0a0a0"],
        placed: true,
    },
    cytoscape: {
        labelPositions: { inside: 30 },
        labelsCentered: true,
        nodes: {
            "7541": { shape: "rect", fill: "#ffffff", label: "Apoptosis" },
            "7539": { shape: "ellipse", fill: "#ccffcc", label: "CREB1" },
            "7505": { shape: "octagon", fill: "#ffccff", label: "PtsIns(3,4,5)P3" },
        },
        edgeColors: ["#0099ff", "#333333"],
        placed: true,
    },
    "cytoscape-xgmml": {
        // NODE_LABEL_POSITION C,C: on the node; two nodes' NODE_LABEL is empty
        labelPositions: { inside: 329 },
        labelsCentered: true,
        nodes: {
            "392": { shape: "rect", fill: "#f2e1df", label: "SNF3" },
            "390": { shape: "ellipse", fill: "#f7f7f7", label: "YBR043C" },
        },
        edgeColors: ["#848484"],
        placed: true,
    },
    "ndex-cx": {
        labelPositions: { inside: 33, right: 1 },
        labelsCentered: true,
        nodes: {
            "1655": { shape: "ellipse", fill: "#006666", label: "STAT3", labelColor: "#ffffff" },
            "1650": { shape: "roundrect", fill: "#ffffff", label: "Cell Growth" },
            "1645": { shape: "octagon", fill: "#ffffff", label: "PtsIns(3,4,5)P3" },
        },
        edgeColors: ["#ffffff"],
        // its small molecules' labels hang below right of the node (NODE_LABEL_POSITION S,NW)
        labelsBeside: ["1645"],
        placed: true,
    },
    "ndex-cx2": {
        // centered; 52 unnamed shapes have no label
        labelPositions: { inside: 228 },
        labelsCentered: true,
        nodes: {
            "136962": { shape: "rect", fill: "#ffffff", label: "FBXW5", labelColor: "#0033ff" },
            "137115": { shape: "rect", fill: "#ff9999", label: "TLR1" },
        },
        edgeColors: ["#0000ff", "#000000"],
        placed: true,
    },
    "cytoscape-js": {
        // text-valign center
        labelPositions: { inside: 31 },
        nodes: {
            "296": { shape: "ellipse", fill: "#999999", label: "MED6", labelColor: "#ffffff" },
            "142": { shape: "ellipse", fill: "#666666", label: "RAD50" },
        },
        edgeColors: ["#f6c28c", "#a0b3d8", "#dad4a8"],
        placed: true,
    },
    gephi: {
        // Gephi centers labels on nodes; its Preview hides three crowded ones
        labelPositions: { inside: 74 },
        nodes: {
            "0": { shape: "ellipse", fill: "#5b5bf5", label: "Myriel" },
            "16": { shape: "ellipse", fill: "#5bc2f5", label: "Tholomyes" },
        },
        edgeColors: ["#5b5bf5"],
        placed: true,
    },
    graphviz: {
        // Graphviz centers a label in its node; its 13 point and empty-label nodes draw none
        labelPositions: { inside: 52 },
        nodes: {
            SCI: { shape: "ellipse", fill: "#d9e7ee", label: "System calls" },
            DM: { shape: "octagon", fill: "#91b5c9", label: "Device\nModel" },
            system: { shape: "rect", fill: "#ffffff", label: "system" },
        },
        edgeColors: ["#e27dd6", "#61c2c5", "#c46747"],
        placed: false,
        // the file names no layout program, so Graphviz draws it with dot
        layout: "graphviz-dot",
    },
    ogdf: {
        // OGDF centers a label in its box
        labelPositions: { inside: 43 },
        nodes: {
            // the text inside the label's markup, in its textColor
            "0": { shape: "rect", fill: "#ffd700", label: "Sample Attribute", labelColor: "#000000" },
            "29": { shape: "rect", fill: "#008000", label: "Experiment Hybridization", labelColor: "#ffffff" },
        },
        edgeColors: ["#000000"],
        edgeStyles: { dotted: 15 },
        // laid out at the spacing OGDF's own layout leaves between boxes this size (a gap of 20 between the circles round
        // two joined boxes), so a box is most of the way across to its neighbor, not a speck between them
        widthToSpacing: 0.5,
        placed: false,
        // OGDF's energy layout keeps a gap between the circles round its boxes: the force layout keeps it too
        layout: "ngraph",
    },
    pajek: {
        // Pajek draws a label beside its vertex, at the default label angle (0, to the right)
        labelPositions: { right: 111 },
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

/**
 * Every pair of visible nodes whose boxes on screen overlap by more than a pixel.
 * @param nodes - the drawn nodes
 * @returns the pairs, as "a b"
 */
function overlapping(nodes: readonly SceneNode[]): string[] {
    const shown = nodes.filter((node) => node.visible);
    const pairs: string[] = [];
    for (const [i, a] of shown.entries()) {
        for (const b of shown.slice(i + 1)) {
            const across = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
            const down = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
            if (across > 1 && down > 1) {
                pairs.push(`${a.id} ${b.id}`);
            }
        }
    }
    return pairs;
}

/**
 * The median width of the visible nodes on screen over the median distance from one to its nearest neighbor.
 * @param nodes - the drawn nodes
 * @returns the ratio
 */
function widthToSpacing(nodes: readonly SceneNode[]): number {
    const shown = nodes.filter((node) => node.visible);
    const middle = (values: number[]): number => values.sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
    const nearest = shown.map((a) =>
        Math.min(...shown.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y))),
    );
    return middle(shown.map((node) => node.w)) / middle(nearest);
}

afterEach(() => {
    unmount();
});

describe("the sample files from other programs, drawn with their file styles", () => {
    it("has an expectation for every sample", () => {
        assert.deepEqual(
            SAMPLES.filter((sample) => sample.styled).map((sample) => sample.id),
            Object.keys(EXPECTED),
        );
        assert.deepEqual(
            SAMPLES.filter((sample) => !sample.styled).map((sample) => sample.id),
            Object.keys(UNSTYLED),
        );
    });

    it.each(SAMPLES.map((sample) => [sample.program, sample] as const))("%s", async (_, sample) => {
        // a table whose header does not name its edge ends names them in the source's options; a Neo4j file is
        // read by the element's CSV source, which knows it by its header
        const columns = "columns" in sample ? sample.columns : undefined;
        const options = columns === undefined ? undefined : { edgeSource: columns.source, edgeTarget: columns.target };
        const type = ("type" in sample ? sample.type : undefined) ?? sample.format;
        const { element, sha256, command } = await mountSample(
            { id: sample.id, format: type, file: sample.file, license: sample.license, routes: [] },
            undefined,
            undefined,
            options,
            // as the graphty app opens a sample from its start page
            "placed",
        );
        const { counts } = element.session.status;
        assert.deepEqual([counts.nodes, counts.edges], [sample.nodes, sample.edges], `${sample.id} counts`);
        const expected = EXPECTED[sample.id] as Expected | undefined;
        if (expected === undefined) {
            // no labels of its own: the element offers the file's name column for the label role, else the node id
            const unstyled = UNSTYLED[sample.id];
            assert.isDefined(unstyled, `${sample.id} has an expectation`);
            assert.equal(
                element.session.data.roleCandidate("node", "label"),
                unstyled.column,
                `${sample.id} label column`,
            );
            if (unstyled.node !== undefined && unstyled.column !== null) {
                const [id, text] = unstyled.node;
                const record = [...element.session.data.nodes()].find((node) => node.id === id);
                assert.equal(record?.[unstyled.column], text, `${sample.id} node ${id} ${unstyled.column}`);
            }
            return;
        }
        if (expected.placed) {
            assert.equal(element.layout, "fixed", `${sample.id} is drawn where the file placed it`);
            assert.equal(element.session.seededNodeCount, sample.nodes);
        }
        // as the graphty app draws it: labels kept clear of each other and moved off the nodes and edges they cover
        element.layoutBehavior = { labels: { declutter: true, avoidNodesAndEdges: true } };
        await element.waitForSettled();
        const scene = drawnScene(element, sha256, command);
        // a label the file puts on its node is drawn on it (Cytoscape's centered labels were moved beside their node)
        const beside = new Set(expected.labelsBeside ?? []);
        const offNode = scene.nodes
            .filter((node) => expected.labelsCentered === true && node.requested?.labelPosition === "inside")
            .filter((node) => node.label?.visible === true)
            .filter((node) => node.label?.text !== "" && !beside.has(node.id))
            .filter((node) => node.label?.position !== "inside")
            .map((node) => `${node.id} ${String(node.label?.text)} ${String(node.label?.position)}`);
        assert.deepEqual(offNode, [], `${sample.id} labels the file centers on their node`);
        // every label the file gives is drawn, where the file puts it
        const places: Partial<Record<LabelPlace, number>> = {};
        for (const node of scene.nodes) {
            if (node.label !== null && node.label.text !== "" && node.label.visible) {
                places[node.label.position] = (places[node.label.position] ?? 0) + 1;
            }
        }
        assert.deepEqual(places, expected.labelPositions, `${sample.id} labels drawn where the file puts them`);
        if (expected.widthToSpacing !== undefined) {
            assert.isAtLeast(
                widthToSpacing(scene.nodes),
                expected.widthToSpacing,
                `${sample.id} node width to spacing`,
            );
        }
        if (expected.layout !== undefined) {
            assert.equal(element.layout, expected.layout, `${sample.id} is laid out as its file asks`);
            assert.deepEqual(overlapping(scene.nodes), [], `${sample.id} nodes drawn over each other`);
        }
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
