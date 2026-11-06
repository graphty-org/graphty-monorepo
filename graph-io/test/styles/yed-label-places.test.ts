/**
 * Where yEd draws a node's label, as measured in its own drawings (test/fidelity/oracles/gml-yed-pmodel.svg,
 * gml-synthetic-coverage.svg, graphml-libcitygml-mapping.svg): a label as tall as its node has its words at the node's
 * top, a GML label inside against a side is an inset in from it and one beside a side a distance out from it, and a
 * `CroppingLabel` breaks at its node's width.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { resolveStyles } from "../../src/styles/internal.js";
import type { StyleProperty } from "../../src/styles/types.js";

const registry = createRegistry();

/**
 * Imports a file and reads one property of its nodes.
 * @param format - the format
 * @param text - the file
 * @returns a reader of a property, in node order
 */
async function nodesOf(format: "gml" | "graphml", text: string) {
    const { snapshot, styles } = await registry.importGraph(new TextEncoder().encode(text), {
        format,
        styles: { toolDefaults: true },
    });
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    return (property: StyleProperty): readonly unknown[] => resolveStyles(styles, "node", property, snapshot);
}

/**
 * A yEd GML file with one node per label record.
 * @param labels - each node's `LabelGraphics` lines
 * @returns the file
 */
function gml(labels: readonly string[]): string {
    const nodes = labels.map(
        (label, id) => `node [ id ${String(id)} graphics [ x 0 y 0 w 50 h 30 ] LabelGraphics [ text "a" ${label} ] ]`,
    );
    return `Creator "yFiles"\ngraph [\n${nodes.join("\n")}\n]\n`;
}

/**
 * A yEd GraphML file with one node per `y:NodeLabel` attribute list.
 * @param labels - each node's label attributes
 * @returns the file
 */
function graphml(labels: readonly string[]): string {
    const nodes = labels.map(
        (label, id) =>
            `<node id="n${String(id)}"><data key="d0"><y:ShapeNode><y:Geometry height="30" width="50" x="0" y="0"/>` +
            `<y:NodeLabel modelName="internal" x="5" y="5" width="20" height="17" ${label}>a</y:NodeLabel>` +
            `</y:ShapeNode></data></node>`,
    );
    return (
        `<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">` +
        `<key for="node" id="d0" yfiles.type="nodegraphics"/><graph edgedefault="directed">${nodes.join("")}</graph></graphml>`
    );
}

describe("yEd GML label places", () => {
    it("draws a label as tall as its node at the node's top, and no other", async () => {
        const nodes = await nodesOf(
            "gml",
            gml([
                'autoSizePolicy "node_size" model "null"',
                'autoSizePolicy "node_height" anchor "c"',
                'autoSizePolicy "node_width" anchor "c"',
                'autoSizePolicy "content" anchor "c"',
                'autoSizePolicy "node_size" anchor "n"',
            ]),
        );
        expect(nodes("labelPosition")).toEqual(["inside-top", "inside-top", "center", "center", "top"]);
    });

    it("moves a label inside against a side in from that side", async () => {
        const nodes = await nodesOf(
            "gml",
            gml(['anchor "l"', 'anchor "br"', 'anchor "tl"', 'anchor "t"', 'anchor "e"']),
        );
        expect(nodes("labelOffsetX")).toEqual([4, -4, 4, null, 4]);
        expect(nodes("labelOffsetY")).toEqual([null, -4, 4, 4, null]);
    });

    it("moves a label beside a side out from it, and one at a corner out to the side alone", async () => {
        const nodes = await nodesOf(
            "gml",
            gml(['anchor "n"', 'anchor "s"', 'anchor "w"', 'anchor "se"', 'anchor "c"']),
        );
        expect(nodes("labelOffsetX")).toEqual([null, null, -4, 4, null]);
        expect(nodes("labelOffsetY")).toEqual([-4, 4, null, null, null]);
    });

    it("holds a label inside its node against its side, and a label as wide as its node to the node's width", async () => {
        const nodes = await nodesOf(
            "gml",
            gml([
                'anchor "l"',
                'autoSizePolicy "node_height" anchor "c"',
                'autoSizePolicy "node_width" anchor "t"',
                'anchor "c"',
                'anchor "e"',
            ]),
        );
        expect(nodes("labelBox")).toEqual(["words-at-side", "words-at-side", "target-width", null, null]);
    });
});

describe("yEd GraphML label places", () => {
    it("draws a label as tall as its node at the node's top, and no other", async () => {
        const nodes = await nodesOf(
            "graphml",
            graphml([
                'autoSizePolicy="node_size"',
                'autoSizePolicy="node_height"',
                'autoSizePolicy="node_width"',
                'autoSizePolicy="content"',
            ]),
        );
        expect(nodes("labelPosition")).toEqual(["inside-top", "inside-top", "center", "center"]);
    });

    it("holds a label inside its node against its side, and a header band to its node's width", async () => {
        const nodes = await nodesOf(
            "graphml",
            graphml([
                'modelPosition="l"',
                'modelPosition="t" autoSizePolicy="node_width" alignment="right"',
                'modelPosition="t" autoSizePolicy="node_width"',
                'modelPosition="c"',
            ]),
        );
        expect(nodes("labelBox")).toEqual(["words-at-side", "target-width", "target-width", null]);
        expect(nodes("labelTextAlign")).toEqual([null, "right", null, null]);
    });

    it("reads a label sized to its node's width by the inset it stores down the node, not across it", async () => {
        const nodes = await nodesOf(
            "graphml",
            graphml(['modelPosition="tl" autoSizePolicy="node_width"', 'modelPosition="tl"']),
        );
        expect(nodes("labelOffsetX")).toEqual([null, 5]);
        expect(nodes("labelOffsetY")).toEqual([5, 5]);
    });

    it("breaks a CroppingLabel's words at its node's width, inside the label's padding", async () => {
        const nodes = await nodesOf(
            "graphml",
            graphml(['configuration="CroppingLabel"', 'autoSizePolicy="node_size"']),
        );
        expect(nodes("labelWrapWidth")).toEqual([46, null]);
    });

    describe("SmartNodeLabelModel", () => {
        const smart = (ratios: string, label: string, body = ""): string =>
            `<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">` +
            `<key for="node" id="d0" yfiles.type="nodegraphics"/><graph edgedefault="directed"><node id="n0"><data key="d0">` +
            `<y:ShapeNode><y:Geometry height="30" width="50" x="0" y="0"/><y:NodeLabel modelName="custom" ${label}>a` +
            `<y:LabelModel><y:SmartNodeLabelModel distance="4.0"/></y:LabelModel><y:ModelParameter>` +
            `<y:SmartNodeLabelModelParameter ${ratios}/></y:ModelParameter></y:NodeLabel>${body}</y:ShapeNode></data></node></graph></graphml>`;

        it("pins the label's point on the node's, whatever its box's stored place", async () => {
            const read = await nodesOf(
                "graphml",
                smart(
                    `labelRatioX="-0.5" labelRatioY="-0.5" nodeRatioX="-0.5" nodeRatioY="-0.5" offsetX="1" offsetY="2"`,
                    `x="10" y="5" width="20" height="10"`,
                ),
            );
            expect(read("labelPosition")).toEqual(["center"]);
            expect(read("labelOffsetX")).toEqual([-14]);
            expect(read("labelOffsetY")).toEqual([-8]);
        });

        it("measures a turned label's ratios on its box on the screen", async () => {
            const read = await nodesOf(
                "graphml",
                smart(
                    `labelRatioX="0" labelRatioY="-0.5" nodeRatioX="0" nodeRatioY="-0.5" offsetX="0" offsetY="0"`,
                    `x="10" y="1" width="20" height="10" rotationAngle="270.0"`,
                ),
            );
            expect(read("labelOffsetX")).toEqual([0]);
            // 20 long on the screen, hung from the node's top
            expect(read("labelOffsetY")).toEqual([-5]);
        });

        it("keeps a UML class's stored place, where the stereotype moves the label", async () => {
            const read = await nodesOf(
                "graphml",
                smart(
                    `labelRatioX="0" labelRatioY="0" nodeRatioX="0" nodeRatioY="0" offsetX="0" offsetY="0"`,
                    `x="15" y="15" width="20" height="10"`,
                    `<y:UML stereotype="Feature"/>`,
                ),
            );
            expect(read("labelOffsetY")).toEqual([5]);
        });
    });
});
