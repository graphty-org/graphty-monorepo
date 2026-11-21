/**
 * Where yEd writes a node label's words, as measured in its own drawings: beside the label's icon
 * (test/fidelity/oracles/yed-graphml-specimen-images-charts.svg, icon-text-*: JLabel's layout of a 16 x 16 icon and the
 * words `iconTextGap` apart, centered together in the node) and at the node's corner for a free label stored without
 * its place (graphml-synthetic-nodes.svg label-free-anywhere).
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { resolveStyles } from "../../src/styles/internal.js";
import type { StyleProperty } from "../../src/styles/types.js";

const registry = createRegistry();

/** A 16 x 16 PNG, as yEd stores a `java.awt.image.BufferedImage`. */
const PNG =
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAJklEQVR42mO4o6GBFWkswI4YRjXQRIOG2x2s6MMJBqxoVANNNAAAOddHkODfSpIAAAAASUVORK5CYII=";

/**
 * A 70 x 40 node whose label has an icon.
 * @param attrs - the label's further attributes
 * @param scale - the icon's scale
 * @returns the file
 */
function file(attrs: string, scale = "1.0"): string {
    return `<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml"
 xmlns:yed="http://www.yworks.com/xml/yed/3">
<key for="node" id="d0" yfiles.type="nodegraphics"/><key for="graph" id="d1" yfiles.type="resources"/>
<graph edgedefault="directed" id="G"><node id="n"><data key="d0"><y:ShapeNode>
<y:Geometry height="40" width="70" x="0" y="0"/>
<y:NodeLabel fontSize="10" modelName="internal" modelPosition="c" width="20" height="17" iconData="3" ${attrs}>Txt</y:NodeLabel>
</y:ShapeNode></data></node></graph>
<data key="d1"><y:Resources><y:Resource id="2" type="java.awt.image.BufferedImage">${PNG}</y:Resource>
<y:Resource id="3"><yed:ScaledIcon xScale="${scale}" yScale="${scale}"><yed:ImageIcon image="2"/></yed:ScaledIcon></y:Resource>
</y:Resources></data></graphml>`;
}

/**
 * The label's offsets.
 * @param text - the file
 * @returns x and y
 */
async function offsetOf(text: string): Promise<unknown[]> {
    return valuesOf(text, ["labelOffsetX", "labelOffsetY"]);
}

/**
 * Some of the label's values.
 * @param text - the file
 * @param properties - the properties
 * @returns their values
 */
async function valuesOf(text: string, properties: readonly StyleProperty[]): Promise<unknown[]> {
    const { snapshot, styles } = await registry.importGraph(new TextEncoder().encode(text), {
        format: "graphml",
        styles: { toolDefaults: true },
    });
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    return properties.map((p) => resolveStyles(styles, "node", p, snapshot)[0]);
}

describe("a yEd node label with an icon", () => {
    it("writes its words below the icon by default, half the icon and the gap down", async () => {
        expect(await offsetOf(file('iconTextGap="4"'))).toEqual([null, 10]);
        expect(await offsetOf(file('iconTextGap="12"'))).toEqual([null, 14]);
        expect(await offsetOf(file('iconTextGap="4"', "2.0"))).toEqual([null, 18]);
    });

    it("writes its words above the icon or over it", async () => {
        expect(await offsetOf(file('verticalTextPosition="top"'))).toEqual([null, -10]);
        expect(await offsetOf(file('verticalTextPosition="center"'))).toEqual([null, null]);
    });

    it("writes its words beside the icon, their line against the icon's bottom", async () => {
        // the line is 11.64 tall, the icon 16: the line's middle is 2.18 below the icon's
        expect(await offsetOf(file('horizontalTextPosition="left"'))).toEqual([-10, 2.18]);
        expect(await offsetOf(file('horizontalTextPosition="right" verticalTextPosition="top"'))).toEqual([10, -2.18]);
    });

    it("sets its words against the icon's side when they are narrower", async () => {
        // the words are 20 - 4 = 16 wide, as wide as the icon; 12 wide they sit 2 off the middle
        expect(await offsetOf(file('horizontalTextPosition="left_aligned"'))).toEqual([null, 10]);
        expect(
            await offsetOf(file('horizontalTextPosition="right_aligned"').replace('width="20"', 'width="16"')),
        ).toEqual([2, 10]);
    });

    it("draws its icon in the label, its middle from the words' middle", async () => {
        const below = await valuesOf(file('iconTextGap="4"'), [
            "labelImage",
            "labelImageWidth",
            "labelImageHeight",
            "labelImageOffsetX",
            "labelImageOffsetY",
        ]);
        expect(String(below[0]).startsWith("data:image/png;base64,")).toBe(true);
        // the words 10 below the label's middle, the icon (16 + 4) / 2 + 11.64 / 2 above them
        expect(below.slice(1)).toEqual([16, 16, null, -17.82]);
        // the words 10 left and 2.18 down, the icon (16 + 4) / 2 right of the middle, level with it
        expect(
            await valuesOf(file('horizontalTextPosition="left"'), ["labelImageOffsetX", "labelImageOffsetY"]),
        ).toEqual([20, -2.18]);
        expect(await valuesOf(file('iconTextGap="4"', "2.0"), ["labelImageWidth", "labelImageHeight"])).toEqual([
            32, 32,
        ]);
    });

    it("is left where its model puts it with no icon resource", async () => {
        expect(await offsetOf(file("").replace('iconData="3"', 'iconData="9"'))).toEqual([null, null]);
        expect(await valuesOf(file("").replace('iconData="3"', 'iconData="9"'), ["labelImage"])).toEqual([null]);
    });
});

describe("a yEd node label's words", () => {
    /**
     * A node with a plain label.
     * @param label - the label element
     * @returns the file
     */
    function plain(label: string): string {
        return file("").replace(/<y:NodeLabel[^]*<\/y:NodeLabel>/, label);
    }

    it("stand at the node's top left corner for a free label stored without its place", async () => {
        const free = plain(
            '<y:NodeLabel modelName="free" modelPosition="anywhere" width="80" height="18">free</y:NodeLabel>',
        );
        expect(await valuesOf(free, ["labelPosition", "labelOffsetX", "labelOffsetY"])).toEqual([
            "inside-top-left",
            null,
            null,
        ]);
    });
});

describe("a yEd node label drawn as its icon alone", () => {
    // graphml-stm32-func n38: a white box under a turned, wordless label of a trapezoid icon
    const iconOnly = `<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml"
 xmlns:yed="http://www.yworks.com/xml/yed/3">
<key for="node" id="d0" yfiles.type="nodegraphics"/><key for="graph" id="d1" yfiles.type="resources"/>
<graph edgedefault="directed" id="G"><node id="n"><data key="d0"><y:ShapeNode>
<y:Geometry height="116.738" width="29.092" x="0" y="0"/>
<y:NodeLabel hasText="false" iconData="1" modelName="custom" rotationAngle="90.0" visible="true" width="116.0" height="30.0" x="0.0" y="0.0">
<y:LabelModel><y:SmartNodeLabelModel distance="4.0"/></y:LabelModel>
<y:ModelParameter><y:SmartNodeLabelModelParameter labelRatioX="-0.5" labelRatioY="-0.5" nodeRatioX="-0.5" nodeRatioY="-0.5"
 offsetX="0.0" offsetY="0.0" upX="0.0" upY="-1.0"/></y:ModelParameter></y:NodeLabel>
</y:ShapeNode></data></node></graph>
<data key="d1"><y:Resources><y:Resource id="1"><yed:NodeRealizerIcon><y:ShapeNode>
<y:Geometry height="30.0" width="116.41" x="0.0" y="0.0"/><y:Fill color="#FFFFFF" transparent="false"/>
<y:BorderStyle color="#000000" type="line" width="1.0"/><y:Shape type="trapezoid"/>
</y:ShapeNode></yed:NodeRealizerIcon></y:Resource></y:Resources></data></graphml>`;

    it("draws the icon, its node's look as a picture, where the label is placed and turned", async () => {
        const [image, width, height, x, y, turn] = await valuesOf(iconOnly, [
            "labelImage",
            "labelImageWidth",
            "labelImageHeight",
            "labelOffsetX",
            "labelOffsetY",
            "labelRotation",
        ]);
        expect([width, height, x, y, turn]).toEqual([116.41, 30, 0.454, -0.369, 90]);
        expect(typeof image).toBe("string");
        const svg = atob(String(image).replace("data:image/svg+xml;base64,", ""));
        expect(svg).toContain('d="M0 1 L0.25 0 L0.75 0 L1 1 Z" fill="#FFFFFF" stroke="#000000"');
    });

    it("draws nothing for an icon the graph does not hold", async () => {
        expect(await valuesOf(iconOnly.replace('iconData="1"', 'iconData="9"'), ["labelImage"])).toEqual([null]);
    });
});
