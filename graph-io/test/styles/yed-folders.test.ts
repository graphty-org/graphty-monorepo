/**
 * A yEd GraphML folder whose active realizer is closed: yEd draws the folder alone, and nothing inside it
 * (graphml-synthetic-nodes' `grp-closed`, whose three members and the edge between two of them yEd 3.25 never draws).
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
