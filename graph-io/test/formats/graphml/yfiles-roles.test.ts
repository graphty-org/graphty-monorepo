import { describe, expect, it } from "vitest";

import { importGraph } from "../../../src/registry.js";
import { isStyleSlotColumn } from "../../../src/styles/slots.js";

const YED = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
  <key id="d0" for="node" yfiles.type="nodegraphics"/>
  <key id="d1" for="edge" yfiles.type="edgegraphics"/>
  <graph edgedefault="directed">
    <node id="a"><data key="d0"><y:ShapeNode><y:Geometry x="0" y="0" width="30" height="20"/>
      <y:Fill color="#FFCC00"/><y:BorderStyle color="#000000" width="1.0"/>
      <y:NodeLabel>A</y:NodeLabel><y:Shape type="ellipse"/></y:ShapeNode></data></node>
    <node id="b"><data key="d0"><y:ShapeNode><y:Geometry x="50" y="0" width="30" height="20"/>
      <y:NodeLabel>B</y:NodeLabel></y:ShapeNode></data></node>
    <edge source="a" target="b"><data key="d1"><y:PolyLineEdge><y:LineStyle color="#FF0000" width="2"/>
      <y:Arrows source="none" target="standard"/></y:PolyLineEdge></data></edge>
  </graph>
</graphml>`;

describe("the yFiles columns of a GraphML file", () => {
    it("carry generic roles for the position and the label, and the neutral presentation flag for the look", async () => {
        const { snapshot } = await importGraph(YED, { format: "graphml" });
        expect(snapshot.nodes.byRole("position")?.meta.name).toBe("yfiles.position");
        expect(snapshot.nodes.byRole("label")?.meta.name).toBe("yfiles.label");

        const look = (
            table: Iterable<{ meta: { name: string; extra: Readonly<Record<string, unknown>> } }>,
        ): string[] =>
            [...table]
                .filter((c) => c.meta.extra.presentation === true)
                .map((c) => c.meta.name)
                .sort();
        expect(look(snapshot.nodes)).toEqual([
            "yfiles.borderColor",
            "yfiles.borderWidth",
            "yfiles.color",
            "yfiles.height",
            "yfiles.shape",
            "yfiles.width",
        ]);
        expect(look(snapshot.edges)).toEqual(
            expect.arrayContaining(["yfiles.color", "yfiles.targetArrow", "yfiles.width"]),
        );
        expect(look(snapshot.edges)).not.toContain("yfiles.directed");
    });

    it("are style slots by the flag alone, whatever format set it", async () => {
        const { snapshot } = await importGraph(YED, { format: "graphml" });
        const slots = [...snapshot.nodes].filter((c) => isStyleSlotColumn(c.meta)).map((c) => c.meta.name);
        expect(slots).not.toContain("yfiles.label");
        expect(slots).not.toContain("yfiles.position");
        expect(slots).toContain("yfiles.color");
    });
});
