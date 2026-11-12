/**
 * What yEd draws from a node's or an edge's label model, as measured in its own drawings
 * (test/fidelity/oracles/graphml-galaxy-lcms-workflow.svg, yed-graphml-specimen-labels.svg,
 * yed-graphml-specimen-edge-labels.svg, graphml-yed-voctomix.svg, gml-dunnart-autobahn.svg): an entity's name background
 * is a header across the node, and an edge's label sits where its model says, or where the file stores it.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { resolveStyles } from "../../src/styles/internal.js";
import type { StyleProperty, StyleTarget } from "../../src/styles/types.js";

const registry = createRegistry();

/**
 * Imports a file and reads its styles.
 * @param format - the format
 * @param text - the file
 * @returns a reader of a property, in element order
 */
async function stylesOf(format: "gml" | "graphml", text: string) {
    const { snapshot, styles } = await registry.importGraph(new TextEncoder().encode(text), {
        format,
        styles: { toolDefaults: true },
    });
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    return (target: StyleTarget, property: StyleProperty): readonly unknown[] =>
        resolveStyles(styles, target, property, snapshot);
}

const HEAD = `<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
<key for="node" id="d0" yfiles.type="nodegraphics"/><key for="edge" id="d1" yfiles.type="edgegraphics"/>
<graph edgedefault="directed" id="G">`;

/**
 * A yEd entity node.
 * @param label - its name label's attributes and words
 * @param height - its height
 * @returns the file
 */
function entity(label: string, height = 55): string {
    return `${HEAD}<node id="n"><data key="d0"><y:GenericNode configuration="com.yworks.entityRelationship.big_entity">
<y:Geometry height="${String(height)}" width="95" x="0" y="0"/><y:Fill color="#FFFFFF" transparent="false"/>
<y:NodeLabel configuration="com.yworks.entityRelationship.label.name" ${label}</y:NodeLabel>
</y:GenericNode></data></node></graph></graphml>`;
}

/**
 * Two 40 px nodes 100 apart, their sides 60 apart, and an edge between them.
 * @param path - the edge's `y:Path` attributes and points
 * @param label - its label's attributes
 * @param inner - what its label holds besides its words
 * @returns the file
 */
function edge(path: string, label: string, inner = ""): string {
    const node = (id: string, x: number): string =>
        `<node id="${id}"><data key="d0"><y:ShapeNode><y:Geometry height="40" width="40" x="${String(x)}" y="0"/></y:ShapeNode></data></node>`;
    return `${HEAD}${node("a", 0)}${node("b", 100)}<edge id="e" source="a" target="b"><data key="d1"><y:PolyLineEdge>
<y:Path ${path}<y:EdgeLabel fontSize="10" width="20" height="17" ${label}>Abc${inner}</y:EdgeLabel>
</y:PolyLineEdge></data></edge></graph></graphml>`;
}

const STRAIGHT = 'sx="0" sy="0" tx="0" ty="0"/>';

/**
 * An edge label's place.
 * @param format - the format
 * @param text - the file
 * @returns its position and offsets
 */
async function placeOf(format: "gml" | "graphml", text: string): Promise<unknown[]> {
    const read = await stylesOf(format, text);
    return (["labelPosition", "labelOffsetX", "labelOffsetY"] as const).map((p) => read("edge", p)[0]);
}

describe("a yEd entity's header", () => {
    it("paints the name's background across the node, not behind the words", async () => {
        const read = await stylesOf("graphml", entity('fontSize="12" backgroundColor="#A8AFC6">name'));
        expect(read("node", "stripeColors")[0]).toBe("#a8afc6");
        expect(Number(read("node", "stripeSizes")[0])).toBeCloseTo((12 + 1.164 * 12) / 55, 5);
        expect(read("node", "labelBackground")[0]).toBeNull();
    });

    it("is deeper by a line of words for each line of the name, and never past the node", async () => {
        const two = await stylesOf("graphml", entity('fontSize="12" backgroundColor="#A8AFC6">a&#10;b'));
        expect(Number(two("node", "stripeSizes")[0])).toBeCloseTo((12 + 2 * 1.164 * 12) / 55, 5);
        const low = await stylesOf("graphml", entity('fontSize="12" backgroundColor="#A8AFC6">name', 10));
        expect(low("node", "stripeSizes")[0]).toBe("1");
    });

    it("is not drawn for a name with no background", async () => {
        const read = await stylesOf("graphml", entity('hasBackgroundColor="false" backgroundColor="#A8AFC6">name'));
        expect(read("node", "stripeColors")[0]).toBeNull();
    });
});

describe("a yEd GraphML edge label", () => {
    it("sits on the line's middle for a center position, moved nowhere", async () => {
        expect(await placeOf("graphml", edge(STRAIGHT, 'modelName="centered" modelPosition="center"'))).toEqual([
            "center",
            null,
            null,
        ]);
    });

    it("sits its distance clear of the line for a position to one side", async () => {
        const clear = 2 + (1.164 * 10 + 4) / 2;
        const head = await placeOf("graphml", edge(STRAIGHT, 'modelName="two_pos" modelPosition="head"'));
        const tail = await placeOf("graphml", edge(STRAIGHT, 'modelName="two_pos" modelPosition="tail"'));
        expect(head[2]).toBeCloseTo(-clear, 2);
        expect(tail[2]).toBeCloseTo(clear, 2);
    });

    it("starts its box 10 from the line's end for a position at an end", async () => {
        const at = await placeOf("graphml", edge(STRAIGHT, 'modelName="six_pos" modelPosition="shead"'));
        // the line runs 40 to 100, its middle at 70: the box's middle is 10 + 20 / 2 from the start
        expect(at[1]).toBe(-10);
        const end = await placeOf("graphml", edge(STRAIGHT, 'modelName="three_center" modelPosition="tcentr"'));
        expect(end[1]).toBe(10);
    });

    it("is at the box the file stores for a free label, from where the line leaves its port", async () => {
        const at = await placeOf(
            "graphml",
            edge('sx="0" sy="5" tx="0" ty="5"/>', 'modelName="free" modelPosition="anywhere" x="10" y="-24"'),
        );
        expect(at).toEqual(["center", -10, -15.5]);
    });

    it("is at the stored box for a smart label off the line's middle, and on the middle for one on it", async () => {
        const smart = (ratio: string): string =>
            `<y:ModelParameter><y:SmartEdgeLabelModelParameter position="center" ratio="${ratio}"/></y:ModelParameter>`;
        const label = 'modelName="custom" x="-10" y="0"';
        expect(await placeOf("graphml", edge(STRAIGHT, label, smart("0.0")))).toEqual(["center", -30, 8.5]);
        expect(await placeOf("graphml", edge(STRAIGHT, label, smart("0.5")))).toEqual(["center", null, null]);
    });

    it("sits below the line's middle for a smart label with no parameter, flipped on a leftward edge", async () => {
        // graphml-synthetic-edges: yEd draws every such label its distance below the middle of the line
        const clear = 2 + (1.164 * 10 + 4) / 2;
        const label = 'modelName="custom" configuration="AutoFlippingLabel" distance="2.0"';
        expect(await placeOf("graphml", edge(STRAIGHT, label))).toEqual(["center", null, expect.closeTo(clear, 2)]);
        const left = edge(STRAIGHT, label).replace('source="a" target="b"', 'source="b" target="a"');
        expect(await placeOf("graphml", left)).toEqual(["center", null, expect.closeTo(clear, 2)]);
    });

    it("walks the line past its bend, and hangs from the route's middle", async () => {
        // the line runs (40,20) to (70,20) to (110,100), 119.44 long, its middle (83.29,46.58); the route hangs at the bend
        const bent = 'sx="0" sy="0" tx="0" ty="0"><y:Point x="70" y="20"/></y:Path>';
        const file = edge(bent, 'modelName="centered" modelPosition="center"').replace(
            'x="100" y="0"',
            'x="100" y="100"',
        );
        const at = await placeOf("graphml", file);
        expect(at[1]).toBeCloseTo(13.29, 2);
        expect(at[2]).toBeCloseTo(26.58, 1);
    });

    it("keeps graphty's place for a model it does not know, a hidden label and a curved line", async () => {
        expect((await placeOf("graphml", edge(STRAIGHT, 'modelName="other"')))[0]).toBeNull();
        expect((await placeOf("graphml", edge(STRAIGHT, 'hasText="false"')))[0]).toBeNull();
        const curved = edge('sx="0" sy="0" tx="0" ty="0"><y:Point x="70" y="20"/></y:Path>', 'modelName="centered"');
        expect((await placeOf("graphml", curved.replaceAll("PolyLineEdge", "QuadCurveEdge")))[0]).toBeNull();
    });
});

describe("a yEd GML edge label", () => {
    /**
     * Two yEd GML nodes 100 apart and an edge between them.
     * @param label - the edge's `LabelGraphics` lines
     * @returns the file
     */
    function gml(label: string): string {
        const node = (id: number, x: number): string =>
            `node [ id ${String(id)} graphics [ x ${String(x)} y 0 w 40 h 40 ] ]`;
        return `Creator "yFiles"\ngraph [\n${node(0, 0)}\n${node(1, 100)}\nedge [ source 0 target 1 label "Abc" LabelGraphics [ text "Abc" fontSize 10 ${label} ] ]\n]\n`;
    }

    it("reads the same models as GraphML", async () => {
        const tail = await placeOf("gml", gml('model "six_pos" position "tail"'));
        expect(tail[0]).toBe("center");
        expect(tail[2]).toBeCloseTo(2 + (1.164 * 10 + 4) / 2, 2);
    });

    it("is at the box a slider stores, its corner on the page", async () => {
        const at = await placeOf("gml", gml('model "side_slider" x 60 y -30'));
        expect(at[0]).toBe("center");
        // its box is three letters wide and one line tall, and the edge's middle is (50,0)
        expect(at[1]).toBeCloseTo(60 + (3 * 0.55 * 10 + 4) / 2 - 50, 2);
        expect(at[2]).toBeCloseTo(-30 + (1.164 * 10 + 4) / 2, 2);
    });

    it("keeps graphty's place for a slider with no box and for a free label", async () => {
        expect((await placeOf("gml", gml('model "side_slider" position "center"')))[0]).toBeNull();
        expect((await placeOf("gml", gml('model "free" position "anywhere" x 10 y -20')))[0]).toBeNull();
    });
});
