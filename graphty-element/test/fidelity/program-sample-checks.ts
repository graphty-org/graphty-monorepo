/**
 * What a drawing of one of the sample files from other programs that the graphty app's start page offers
 * (graph-io/test/corpus/programs/samples.json) must hold, checked against the file itself: the shapes, fills, labels
 * and node sizes, where a file that stores its drawing put each node, the dashed and dotted edges and the arrowheads,
 * where each label sits, and no two nodes drawn over each other that the file does not already draw over each other,
 * all counted over every node and edge. The file's values are read by graph-io
 * (graph-io/test/programs/program-file-facts.ts).
 */
import { assert } from "vitest";

import type { Scene, SceneNode } from "../../../graph-io/test/fidelity/scene";
import {
    ARROW_CLASS,
    counts,
    type FileFacts,
    fileOverlaps,
    LINE_CLASS,
    overlaps,
    type Sample,
    SHAPE_CLASS,
    textOf,
    widthToSpacing,
} from "../../../graph-io/test/programs/program-file-facts";

/** Where a label is drawn round its node. */
type LabelPlace = NonNullable<SceneNode["label"]>["position"];

/** What each styled sample draws beyond what its file's values say node by node. */
export interface Expected {
    /**
     * How many labels are drawn at each place round their node: the place the file states for each label (or its
     * program's rule for one it does not state), counted. Every node its program labels is counted, so a label left
     * out or drawn elsewhere changes a count.
     */
    readonly labelPositions: Readonly<Partial<Record<LabelPlace, number>>>;
    /** Whether the file centers its labels on their nodes, so each must be drawn on its node. */
    readonly labelsCentered?: true;
    /** Nodes whose label the file centers on the node and then moves beside it (Cytoscape's label anchors). */
    readonly labelsBeside?: readonly string[];
    /**
     * For a file that stores no positions, the least share of the median gap to a node's nearest neighbor that the
     * median node's width takes, so the nodes are drawn at the size its program draws them beside its layout's gaps.
     */
    readonly widthToSpacing?: number;
    /** The layout the file asks for, which draws it when it stores no positions. */
    readonly layout?: string;
    /**
     * Nodes whose drawn size is not the file's: Graphviz sizes a node that is not `fixedsize` to fit its label, so the
     * file's width and height are only its least size.
     */
    readonly sizedToLabel?: true;
}

export const EXPECTED: Readonly<Record<string, Expected>> = {
    // its groups' internal labels (top and center) are drawn inside, its nodes' sandwich labels (south) below
    yed: { labelPositions: { inside: 19, below: 46 } },
    // each label at its own model position: 113 of its 183 nodes have none
    "yed-live": { labelPositions: { inside: 24, below: 35, above: 6, left: 2, right: 3 } },
    cytoscape: { labelPositions: { inside: 30 }, labelsCentered: true },
    // NODE_LABEL_POSITION C,C: on the node; two nodes' NODE_LABEL is empty
    "cytoscape-xgmml": { labelPositions: { inside: 329 }, labelsCentered: true },
    // its small molecules' labels hang below right of the node (NODE_LABEL_POSITION S,NW)
    "ndex-cx": { labelPositions: { inside: 33, right: 1 }, labelsCentered: true, labelsBeside: ["1645"] },
    // centered; 52 unnamed shapes have no label
    "ndex-cx2": { labelPositions: { inside: 228 }, labelsCentered: true },
    // text-valign center
    "cytoscape-js": { labelPositions: { inside: 31 } },
    // Gephi centers labels on nodes; its Preview hides three crowded ones
    gephi: { labelPositions: { inside: 74 } },
    // Graphviz centers a label in its node; its 13 point and empty-label nodes draw none. The file names no layout
    // program, so Graphviz draws it with dot.
    graphviz: { labelPositions: { inside: 52 }, layout: "graphviz-dot", sizedToLabel: true },
    // OGDF centers a label in its box. Laid out at the spacing OGDF's own layout leaves between boxes this size (a gap
    // of 20 between the circles round two joined boxes), so a box is most of the way across to its neighbor; OGDF's
    // energy layout keeps that gap, and so does the force layout
    ogdf: { labelPositions: { inside: 43 }, widthToSpacing: 0.5, layout: "ngraph" },
    // Pajek draws a label beside its vertex, at the default label angle (0, to the right)
    pajek: { labelPositions: { right: 111 } },
};

/**
 * Checks one drawing of a styled sample against its file.
 * @param sample - the sample
 * @param view - which view drew it, for the messages
 * @param scene - the drawing
 * @param file - the file's values
 * @param expected - what the sample draws beyond them
 */
export function checkStyled(sample: Sample, view: string, scene: Scene, file: FileFacts, expected: Expected): void {
    const at = `${sample.id} (${view})`;
    const drawnNodes = new Map(scene.nodes.map((node) => [node.id, node]));
    const nodes = file.ids.map((id) => drawnNodes.get(id));
    assert.deepEqual(
        file.ids.filter((_, i) => nodes[i] === undefined),
        [],
        `${at} draws every node`,
    );
    const drawn = nodes as SceneNode[];

    // shapes: each named shape counted as the file names it; a polygon is drawn as the class its corners make
    const fileShapes = file.node("shape");
    const named = counts(
        fileShapes.flatMap((shape) => (SHAPE_CLASS[String(shape)] ? [SHAPE_CLASS[String(shape)]] : [])),
    );
    const polygons = fileShapes.filter((shape) => SHAPE_CLASS[String(shape)] === null).length;
    const unknown = fileShapes.filter((shape) => !(String(shape) in SHAPE_CLASS));
    assert.deepEqual(unknown, [], `${at} every shape of the file has a class`);
    const shapes = counts(drawn.map((node) => node.shape));
    const extra = Object.entries(shapes).reduce((sum, [shape, n]) => sum + n - (named[shape] ?? 0), 0);
    for (const [shape, n] of Object.entries(named)) {
        assert.isAtLeast(shapes[shape] ?? 0, n, `${at} ${shape} nodes`);
    }
    assert.equal(extra, polygons, `${at} nodes drawn in another shape than the file's: its polygons`);

    // fills: the hollow nodes, and every filled node's color, counted
    const opacity = file.node("fillOpacity");
    const fills = file.node("fill");
    const hollow = (i: number): boolean => opacity[i] === 0;
    assert.deepEqual(
        counts(drawn.map((node) => (node.fillOpacity === 0 ? "hollow" : "filled"))),
        counts(file.ids.map((_, i) => (hollow(i) ? "hollow" : "filled"))),
        `${at} hollow and filled nodes`,
    );
    // a filled node another covers whole, or too small to see, shows no fill to read
    const seen = (node: SceneNode): boolean => node.fillOpacity === 0 || node.fill !== null;
    assert.deepEqual(
        counts(drawn.flatMap((node) => (node.fill === null ? [] : [node.fill]))),
        counts(
            file.ids.flatMap((_, i) =>
                hollow(i) || !seen(drawn[i]) ? [] : [textOf(fills[i]).slice(0, 7).toLowerCase()],
            ),
        ),
        `${at} fill colors`,
    );

    // labels: every node the file labels is drawn with its text, at the place the file states
    const texts = file.node("label");
    const labeled = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";
    const shownLabels = drawn.filter((node) => node.label !== null && node.label.text !== "" && node.label.visible);
    // compared word for word: a label wrapped to its node's width breaks its line where the file does not
    const words = (text: string | undefined): string => (text ?? "").trim().replaceAll(/\s+/g, " ");
    assert.deepEqual(
        counts(shownLabels.map((node) => words(node.label?.text))),
        counts(texts.filter(labeled).map(words)),
        `${at} label texts`,
    );
    assert.deepEqual(
        counts(shownLabels.map((node) => node.label?.position)),
        counts(Object.entries(expected.labelPositions).flatMap(([place, n]) => Array<string>(n).fill(place))),
        `${at} labels drawn where the file puts them`,
    );
    const beside = new Set(expected.labelsBeside ?? []);
    const offNode = shownLabels
        .filter((node) => expected.labelsCentered === true && node.requested?.labelPosition === "inside")
        .filter((node) => !beside.has(node.id))
        .filter((node) => node.label?.position !== "inside")
        .map((node) => `${node.id} ${String(node.label?.position)}`);
    assert.deepEqual(offNode, [], `${at} labels the file centers on their node`);

    // node sizes: one scale from the file's width and height to the drawing, the same for every node; a polygon is
    // drawn as far as its corners reach, which need not be the box the file sizes, and a node under two pixels across
    // (a pathway's one-unit edge anchor) is too small to measure
    const widths = file.node("width");
    const heights = file.node("height");
    const boxed = (node: SceneNode, i: number): boolean =>
        node.visible &&
        node.w >= 2 &&
        node.h >= 2 &&
        Number(widths[i]) > 0 &&
        Number(heights[i]) > 0 &&
        SHAPE_CLASS[String(fileShapes[i])] !== null;
    if (expected.sizedToLabel !== true) {
        const scales = drawn.flatMap((node, i) =>
            boxed(node, i) ? [node.w / Number(widths[i]), node.h / Number(heights[i])] : [],
        );
        if (scales.length > 0) {
            const sorted = [...scales].sort((a, b) => a - b);
            const middle = sorted[Math.floor(sorted.length / 2)];
            const off = drawn.filter(
                (node, i) =>
                    boxed(node, i) &&
                    (Math.abs(node.w / Number(widths[i]) / middle - 1) > 0.05 ||
                        Math.abs(node.h / Number(heights[i]) / middle - 1) > 0.05),
            );
            assert.deepEqual(
                off.map((node) => `${node.id} ${node.w.toFixed(1)}x${node.h.toFixed(1)}`),
                [],
                `${at} node sizes in the file's proportions`,
            );
        }
    }

    // positions: the file's stored centers, through one scale and offset, y down
    const { positions } = file;
    if (positions !== null) {
        const n = file.ids.length;
        let sx = 0;
        let sy = 0;
        let fx = 0;
        let fy = 0;
        for (let i = 0; i < n; i++) {
            sx += drawn[i].x;
            sy += drawn[i].y;
            fx += positions[2 * i];
            fy += positions[2 * i + 1];
        }
        const [mx, my, mfx, mfy] = [sx / n, sy / n, fx / n, fy / n];
        let num = 0;
        let den = 0;
        for (let i = 0; i < n; i++) {
            const dx = positions[2 * i] - mfx;
            const dy = -(positions[2 * i + 1] - mfy);
            num += dx * (drawn[i].x - mx) + dy * (drawn[i].y - my);
            den += dx * dx + dy * dy;
        }
        const scale = num / den;
        const xs = drawn.map((node) => node.x);
        const extent = Math.max(...xs) - Math.min(...xs);
        const misplaced = file.ids.filter((_, i) => {
            const x = mx + scale * (positions[2 * i] - mfx);
            const y = my - scale * (positions[2 * i + 1] - mfy);
            return Math.hypot(drawn[i].x - x, drawn[i].y - y) > Math.max(2, extent / 200);
        });
        assert.deepEqual(misplaced, [], `${at} nodes drawn where the file put them`);

        // no two nodes drawn over each other that the file's own positions and sizes do not already overlap
        const already = fileOverlaps(file);
        const added = [
            ...overlaps(
                scene.nodes.filter((node) => node.visible),
                1,
            ),
        ].filter((pair) => !already.has(pair));
        assert.deepEqual(added, [], `${at} nodes drawn over each other that the file does not overlap`);
    } else {
        assert.deepEqual(
            [
                ...overlaps(
                    scene.nodes.filter((node) => node.visible),
                    1,
                ),
            ],
            [],
            `${at} nodes drawn over each other`,
        );
    }

    // edges: the dashed and dotted lines and every arrowhead the file draws, counted
    const lines = file.edge("lineStyle");
    const unknownLine = lines.filter((style) => !(String(style) in LINE_CLASS));
    assert.deepEqual(unknownLine, [], `${at} every line style of the file has a class`);
    assert.deepEqual(
        counts(scene.edges.map((edge) => edge.style)),
        counts(lines.map((style) => LINE_CLASS[String(style)])),
        `${at} line styles`,
    );
    for (const end of ["target", "source"] as const) {
        const arrows = file.edge(end === "target" ? "targetArrow" : "sourceArrow");
        const unknownArrow = arrows.filter((arrow) => !(textOf(arrow ?? "none") in ARROW_CLASS));
        assert.deepEqual(unknownArrow, [], `${at} every ${end} arrowhead of the file has a class`);
        assert.deepEqual(
            counts(scene.edges.map((edge) => edge.arrow[end])),
            counts(arrows.map((arrow) => ARROW_CLASS[textOf(arrow ?? "none")])),
            `${at} ${end} arrowheads`,
        );
    }

    if (expected.widthToSpacing !== undefined) {
        assert.isAtLeast(widthToSpacing(scene.nodes), expected.widthToSpacing, `${at} node width to spacing`);
    }
}
