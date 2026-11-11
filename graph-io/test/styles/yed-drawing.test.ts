/**
 * What yEd 3.25 draws of a yEd GraphML file where its drawing is not the file's values one for one: a folder whose
 * active realizer is closed (graphml-synthetic-nodes' `grp-closed`, whose three members and the edge between two of
 * them yEd never draws), a group inside another group, and a line with no color.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { resolveStyles } from "../../src/styles/internal.js";

const registry = createRegistry();

const shape = (id: string, x: number): string =>
    `<node id="${id}"><data key="d6"><y:ShapeNode><y:Geometry x="${x}" y="0" width="20" height="10"/></y:ShapeNode></data></node>`;

/**
 * A folder holding two nodes, one of them a folder holding one more, beside a plain node.
 * @param closed - whether the outer folder's active realizer is the closed one
 * @returns the file
 */
function doc(closed: boolean): string {
    const realizer = (isClosed: boolean): string =>
        `<y:GroupNode><y:Geometry x="0" y="0" width="200" height="100"/><y:State closed="${String(isClosed)}"/></y:GroupNode>`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
<key for="node" id="d6" yfiles.type="nodegraphics"/><key for="edge" id="d10" yfiles.type="edgegraphics"/>
<graph edgedefault="directed" id="G">
${shape("out", 500)}
<node id="f" yfiles.foldertype="folder"><data key="d6"><y:ProxyAutoBoundsNode><y:Realizers active="${closed ? 1 : 0}">${realizer(false)}${realizer(true)}</y:Realizers></y:ProxyAutoBoundsNode></data>
<graph edgedefault="directed" id="f:">
${shape("f::a", 10)}
<node id="f::g" yfiles.foldertype="group"><data key="d6"><y:ProxyAutoBoundsNode><y:Realizers active="0">${realizer(false)}</y:Realizers></y:ProxyAutoBoundsNode></data>
<graph edgedefault="directed" id="f::g:">${shape("f::g::b", 60)}</graph></node>
</graph></node>
<edge source="f::a" target="f::g::b"><data key="d10"><y:PolyLineEdge/></data></edge>
<edge source="out" target="f"><data key="d10"><y:PolyLineEdge/></data></edge>
</graph></graphml>`;
}

/**
 * Each element's `visible` value, by node id or edge index.
 * @param text - the file
 * @returns the nodes' and the edges' values
 */
async function visible(text: string): Promise<{ nodes: Record<string, unknown>; edges: unknown[] }> {
    const r = await registry.importGraph(text, { format: "graphml", styles: true, errorLimit: Infinity });
    if (!r.styles) {
        throw new Error("no styles");
    }
    const values = [...resolveStyles(r.styles, "node", "visible", r.snapshot)];
    const nodes = Object.fromEntries(values.map((v, i) => [String(r.snapshot.ids.idOf(i)), v]));
    return { nodes, edges: [...resolveStyles(r.styles, "edge", "visible", r.snapshot)] };
}

describe("yEd GraphML closed folders", () => {
    it("hides every node inside a closed folder, at any depth, and the edges between them", async () => {
        const { nodes, edges } = await visible(doc(true));
        expect(nodes).toEqual({ out: null, f: null, "f::a": false, "f::g": false, "f::g::b": false });
        expect(edges).toEqual([false, null]);
    });

    it("paints an open group inside another group 20 darker in each channel than its file's color", async () => {
        // yEd 3.25: yed-graphml-specimen-groups' inner group #CAECFF is drawn #B6D8EB; graphml-galaxy-lcms-workflow's
        // and graphml-magiclantern-architecture's #F5F5F5 groups inside a group are drawn #E1E1E1; a top-level
        // group keeps its color
        const r = await registry.importGraph(
            doc(false).replaceAll("<y:GroupNode>", '<y:GroupNode><y:Fill color="#CAECFF"/>'),
            {
                format: "graphml",
                styles: true,
            },
        );
        if (!r.styles) {
            throw new Error("no styles");
        }
        const fill = [...resolveStyles(r.styles, "node", "fill", r.snapshot)];
        const byId = Object.fromEntries(fill.map((v, i) => [String(r.snapshot.ids.idOf(i)), v]));
        expect(byId.f).toBe("#caecff");
        expect(byId["f::g"]).toBe("#b6d8eb");
    });

    it("hides nothing inside an open folder", async () => {
        const { nodes, edges } = await visible(doc(false));
        expect(Object.values(nodes).every((v) => v === null)).toBe(true);
        expect(edges).toEqual([null, null]);
    });
});

describe("yEd GraphML lines with no color", () => {
    it("paints neither the line nor its arrowheads of a LineStyle with hasColor false", async () => {
        // yed-graphml-specimen-edges-lines line-has-color-false: yEd draws nothing between its two nodes
        const text = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
<key for="node" id="d6" yfiles.type="nodegraphics"/><key for="edge" id="d10" yfiles.type="edgegraphics"/>
<graph edgedefault="directed" id="G">${shape("a", 0)}${shape("b", 100)}
<edge source="a" target="b"><data key="d10"><y:PolyLineEdge><y:LineStyle hasColor="false" type="line" width="1.5"/><y:Arrows source="none" target="standard"/></y:PolyLineEdge></data></edge>
<edge source="a" target="b"><data key="d10"><y:PolyLineEdge><y:LineStyle color="#FF0000" type="line" width="1.5"/><y:Arrows source="none" target="standard"/></y:PolyLineEdge></data></edge>
</graph></graphml>`;
        const r = await registry.importGraph(text, { format: "graphml", styles: true });
        if (!r.styles) {
            throw new Error("no styles");
        }
        const { styles } = r;
        const edge = (property: "opacity" | "targetArrow"): unknown[] => [
            ...resolveStyles(styles, "edge", property, r.snapshot),
        ];
        expect(edge("opacity")).toEqual([0, null]);
        expect(edge("targetArrow")).toEqual(["none", "vee"]);
    });
});

describe("yEd GraphML ports inside a box", () => {
    it("starts a polyline where it leaves a box node's outline, from a port inside the node", async () => {
        // graphml-libcitygml-mapping e45: ports 18.5,-11.4 and -31.9,4.2 off the centers of two UML class boxes;
        // yEd draws the line only between the two boxes' sides, where the line between the ports crosses them
        const text = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
<key for="node" id="d6" yfiles.type="nodegraphics"/><key for="edge" id="d10" yfiles.type="edgegraphics"/>
<graph edgedefault="directed" id="G">
<node id="a"><data key="d6"><y:UMLClassNode><y:Geometry x="-50" y="-10" width="100" height="20"/></y:UMLClassNode></data></node>
<node id="b"><data key="d6"><y:ShapeNode><y:Geometry x="150" y="-10" width="100" height="20"/><y:Shape type="ellipse"/></y:ShapeNode></data></node>
<edge source="a" target="b"><data key="d10"><y:PolyLineEdge><y:Path sx="20" sy="-5" tx="0" ty="0"/></y:PolyLineEdge></data></edge>
<edge source="a" target="b"><data key="d10"><y:PolyLineEdge><y:Path sx="50" sy="0" tx="-30" ty="5"/></y:PolyLineEdge></data></edge>
</graph></graphml>`;
        const r = await registry.importGraph(text, { format: "graphml", styles: true });
        if (!r.styles) {
            throw new Error("no styles");
        }
        const source = resolveStyles(r.styles, "edge", "sourcePort", r.snapshot);
        const target = resolveStyles(r.styles, "edge", "targetPort", r.snapshot);
        // from 20,-5 toward the target's center 200,0 the line leaves the box at x 50, y -4.1667: its right side,
        // 0.4167 of the half height up
        expect(source[0]).toBe("1,0.4167");
        // a port on the outline stays; the ellipse's port inside it stays where the file puts it
        expect(source[1]).toBe("1,0");
        expect(target[1]).toBe("-0.6,-0.5");
    });
});

describe("yEd GraphML border alpha", () => {
    it("draws a border color's #RRGGBBAA alpha as the border's opacity", async () => {
        // yed-graphml-specimen-node-sizes-opacity border-alpha-40: #00000040 drawn black at 0.251
        const text = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
<key for="node" id="d6" yfiles.type="nodegraphics"/>
<graph edgedefault="directed" id="G">
<node id="a"><data key="d6"><y:ShapeNode><y:Geometry x="0" y="0" width="20" height="10"/><y:BorderStyle color="#00000040" type="line" width="3.0"/></y:ShapeNode></data></node>
</graph></graphml>`;
        const r = await registry.importGraph(text, { format: "graphml", styles: true });
        if (!r.styles) {
            throw new Error("no styles");
        }
        expect(resolveStyles(r.styles, "node", "borderColor", r.snapshot)[0]).toBe("#000000");
        expect(resolveStyles(r.styles, "node", "borderOpacity", r.snapshot)[0]).toBeCloseTo(0x40 / 255, 3);
    });
});
