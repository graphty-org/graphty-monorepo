import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { xgmmlExporter } from "../../../src/formats/xgmml/exporter.js";
import { xgmmlImporter, type XgmmlImportOptions } from "../../../src/formats/xgmml/importer.js";
import { type CommonImportOptions } from "../../../src/types.js";

const NS =
    'xmlns="http://www.cs.rpi.edu/XGMML" xmlns:cy="http://www.cytoscape.org" xmlns:xlink="http://www.w3.org/1999/xlink"';

async function summary(
    text: string,
    options?: XgmmlImportOptions & CommonImportOptions,
): Promise<{ codes: string[]; nodes: string[]; edges: number; graph: string[] }> {
    const sink = new GraphBuilder({ directed: false, weightDtype: "f64" });
    const report = await xgmmlImporter.import(text, sink, options);
    const snapshot = sink.freeze();
    return {
        codes: report.issues.map((i) => i.code),
        nodes: Array.from({ length: snapshot.nodeCount }, (_, i) => String(snapshot.ids.idOf(i))),
        edges: snapshot.edgeCount,
        graph: [...snapshot.graph.names()],
    };
}

describe("xgmml: edge cases", () => {
    it("counts a cross-file member of a registered subnetwork as dangling", async () => {
        const session = `<graph id="1" label="Set" cy:view="0" cy:registered="0" cy:documentVersion="3.0" ${NS}>
  <att><graph id="2" label="Na.1" cy:registered="1">
      <node id="10" label="a"/>
      <node xlink:href="other.xgmml#11"/>
      <node xlink:href="#10"/>
  </graph></att>
  <att><graph id="3" label="Na.2" cy:registered="1"><node xlink:href="#10"/></graph></att>
</graph>`;
        expect(await summary(session)).toMatchInlineSnapshot(`
          {
            "codes": [
              "W_MULTIPLE_GRAPHS",
              "W_DANGLING_REFERENCE",
              "W_DUPLICATE_NODE",
            ],
            "edges": 0,
            "graph": [],
            "nodes": [
              "10",
            ],
          }
        `);
        expect(await summary(session, { graphName: "Na.2" })).toMatchInlineSnapshot(`
          {
            "codes": [],
            "edges": 0,
            "graph": [],
            "nodes": [
              "10",
            ],
          }
        `);
    });

    it("skips an unnamed att holding a graph on the root graph and keeps its graphics", async () => {
        const text = `<graph id="1" label="G" ${NS}>
  <att><graph id="9" label="inner"><node id="x"/></graph></att>
  <att name="kept" value="1" type="integer"/>
  <graphics fill="#ffffff"/>
  <node id="a"/>
</graph>`;
        expect(await summary(text)).toMatchInlineSnapshot(`
          {
            "codes": [],
            "edges": 0,
            "graph": [
              "kept",
              "graphics",
            ],
            "nodes": [
              "x",
              "a",
            ],
          }
        `);
    });

    it("writes a role-less dict column named label as the node label", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.addNode("b");
        b.declareNodeColumn({ name: "label", dtype: "dict", nullable: true });
        b.setNodeValue("label", 0, "first");
        const text = await xgmmlExporter.exportToString(b.freeze());
        expect(text).toContain('<node id="a" label="first"');
        expect(text).not.toContain('name="label"');
    });

    it("refuses an input that is only whitespace", async () => {
        await expect(summary("   \n  ")).rejects.toMatchObject({
            report: { issues: [expect.objectContaining({ code: "E_EMPTY_INPUT" })] },
        });
    });
});
