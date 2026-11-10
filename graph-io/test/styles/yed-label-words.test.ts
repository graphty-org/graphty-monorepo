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

    it("is left where its model puts it with no icon resource", async () => {
        expect(await offsetOf(file("").replace('iconData="3"', 'iconData="9"'))).toEqual([null, null]);
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
