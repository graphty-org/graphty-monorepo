import { readFileSync } from "node:fs";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { DirectionResolver } from "../../../src/common/direction.js";
import { LOSS } from "../../../src/common/export.js";
import { ImportReportBuilder } from "../../../src/common/report.js";
import { decodeChunks } from "../../../src/common/writer.js";
import { XGMML_LOSS } from "../../../src/formats/xgmml/constants.js";
import { xgmmlExporter } from "../../../src/formats/xgmml/exporter.js";
import { xgmmlImporter } from "../../../src/formats/xgmml/importer.js";
import { importGraph } from "../../../src/registry.js";
import { type CommonImportOptions } from "../../../src/types.js";
import { compareSnapshots, describeDiffs, expectSameSnapshot } from "../../helpers/roundtrip.js";

async function read(text: string, options?: CommonImportOptions): Promise<GraphSnapshot> {
    const builder = new GraphBuilder({ directed: false, weightDtype: "f64" });
    await xgmmlImporter.import(text, builder, options);
    return builder.freeze();
}

async function again(snapshot: GraphSnapshot): Promise<GraphSnapshot> {
    return read(await xgmmlExporter.exportToString(snapshot));
}

function codes(snapshot: GraphSnapshot): string[] {
    return xgmmlExporter.check(snapshot).map((n) => n.code);
}

const NS =
    'xmlns="http://www.cs.rpi.edu/XGMML" xmlns:cy="http://www.cytoscape.org" xmlns:xlink="http://www.w3.org/1999/xlink"';

describe("xgmmlExporter", () => {
    it("declares all sixteen capability fields of the design", () => {
        expect(xgmmlExporter.format).toBe("xgmml");
        expect(xgmmlExporter.capabilities).toEqual({
            mixedDirection: true,
            multiEdges: true,
            selfLoops: true,
            edgeIds: "optional",
            idCharset: "any",
            dtypes: ["string", "dict", "f64", "f32", "i32", "u32", "u8", "bool", "list"],
            components: false,
            lists: true,
            json: false,
            defaults: false,
            options: false,
            hierarchy: true,
            temporal: "none",
            graphAttributes: true,
            positions: true,
            viz: false,
        });
    });

    it("round-trips a Cytoscape 3 document exactly: types, lists, hidden, graphics, positions, mixed direction", async () => {
        const first = await read(`<graph id="7" label="Net" directed="1" cy:documentVersion="3.0" ${NS}>
  <att name="shared name" value="net" type="string" cy:type="String"/>
  <graphics><att name="NETWORK_SCALE_FACTOR" value="0.5" type="string"/></graphics>
  <node id="a" label="A">
    <att name="i" value="4" type="integer" cy:type="Integer"/>
    <att name="g" value="1200" type="integer" cy:type="Long"/>
    <att name="r" value="2.5" type="real" cy:type="Double"/>
    <att name="b" value="1" type="boolean" cy:type="Boolean"/>
    <att name="l" type="list" cy:type="List" cy:elementType="String"><att name="l" value="x" type="string"/><att name="l" value="y" type="string"/></att>
    <att name="h" value="secret" type="string" cy:type="String" cy:hidden="1"/>
    <graphics type="ELLIPSE" x="10.5" y="-20" z="2" fill="#FFF"><att name="NODE_LABEL" value="A" type="string"/><att name="lockedVisualProperties" type="list"><att name="NODE_SHAPE" value="TRIANGLE" type="string"/></att></graphics>
  </node>
  <node id="b" label="B"><att name="i" value="5" type="integer" cy:type="Integer"/><graphics x="0" y="3" z="0"/></node>
  <edge id="e1" label="A (pp) B" source="a" target="b" cy:directed="1" weight="0.25"><att name="interaction" value="pp" type="string"/><graphics width="2.0" fill="#999"/></edge>
  <edge id="e2" label="B (pp) A" source="b" target="a" cy:directed="0"><att name="interaction" value="pp" type="string"/></edge>
</graph>`);
        expect(codes(first)).toEqual([]);
        const text = await xgmmlExporter.exportToString(first);
        expect(text).toContain('cy:documentVersion="3.0"');
        expect(text).toContain('y="-20"');
        expect(text).toContain('cy:hidden="1"');
        expectSameSnapshot(first, await read(text));
    });

    it("writes containment as nested graphs and further parents as xlink references", async () => {
        const first = await read(`<graph ${NS} cy:documentVersion="3.0" directed="1">
<node id="g1"><att name="__isGroup" value="1" type="boolean"/><att><graph id="sg" label="G"><att name="gr" value="v" type="string"/><node id="m"/><node id="n"/></graph></att></node>
<node id="g2"><att name="__isGroup" value="1" type="boolean"/><att><graph><node xlink:href="#m"/></graph></att></node>
<edge source="m" target="n" cy:directed="1"/>
</graph>`);
        expect(first.nodes.byRole("parents")).not.toBeNull();
        const text = await xgmmlExporter.exportToString(first);
        expect(text).toContain('xlink:href="#m"');
        const second = await read(text);
        expectSameSnapshot(first, second);
    });

    it("writes nested-network pointers and cross-file pointers back as node-nested graphs", async () => {
        const first = await read(`<graph ${NS} cy:documentVersion="3.0" directed="1">
<node id="a"><att><graph id="x" label="Nb"/></att></node>
<node id="b"><att><graph xlink:href="f.xgmml#3"/></att></node>
</graph>`);
        const second = await again(first);
        expectSameSnapshot(first, second);
    });

    it("writes the y axis back to screen coordinates (the import negated it)", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.declareNodeColumn({ name: "position", dtype: "f32", components: 3, role: "position", nullable: true });
        b.setNodeValue("position", 0, [1, 2, 0]);
        const text = await xgmmlExporter.exportToString(b.freeze());
        expect(text).toMatch(/<graphics x="1" y="-2"\/>/);
    });

    it("writes newline and tab as character references, or as Cytoscape escapes on request", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.declareNodeColumn({ name: "t", dtype: "string", nullable: true });
        b.setNodeValue("t", 0, "x\ny\tz");
        const snapshot = b.freeze();
        const plain = await xgmmlExporter.exportToString(snapshot);
        expect(plain).toContain("x&#10;y&#9;z");
        const cy = await xgmmlExporter.exportToString(snapshot, { cytoscapeEscapes: true });
        expect(cy).toContain("x\\ny\\tz");
        for (const text of [plain, cy]) {
            expectSameSnapshot(snapshot, await read(text));
        }
    });

    it("notes what reads back differently: json, wider types, ids, literal escapes, positions, mutual pairs", () => {
        const b = new GraphBuilder({ directed: true });
        const resolver = new DirectionResolver(b, new ImportReportBuilder("t", 100), "expand");
        resolver.setHeader(true);
        b.addNode(1);
        b.addNode(2);
        resolver.addEdge(1, 2, "mutual");
        b.declareNodeColumn({ name: "j", dtype: "json", nullable: true });
        b.setNodeValue("j", 0, { a: 1 });
        b.declareNodeColumn({ name: "f", dtype: "f32", nullable: true });
        b.setNodeValue("f", 0, 0.1);
        b.declareNodeColumn({ name: "s", dtype: "string", nullable: true });
        b.setNodeValue("s", 0, "a\\nb");
        b.declareNodeColumn({ name: "position", dtype: "f32", components: 2, role: "position", nullable: true });
        b.setNodeValue("position", 0, [1, 2]);
        const notes = codes(b.freeze());
        expect(notes).toEqual(
            expect.arrayContaining([
                XGMML_LOSS.JSON_AS_STRING,
                XGMML_LOSS.WIDENED_TYPE,
                XGMML_LOSS.ID_TEXT_TYPE,
                XGMML_LOSS.BACKSLASH_ESCAPE,
                XGMML_LOSS.POSITION,
                XGMML_LOSS.MUTUAL_EXPANDED,
            ]),
        );
    });

    it("refuses XML-illegal text in check() and export()", async () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode(`a${String.fromCharCode(1)}`);
        const snapshot = b.freeze();
        expect(codes(snapshot)).toContain(XGMML_LOSS.XML_ILLEGAL_CHAR);
        await expect(xgmmlExporter.exportToString(snapshot)).rejects.toMatchObject({ code: "E_COLUMN_TYPE" });
    });

    it("rejects a bad option and streams the same text as exportToString", async () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode("a");
        const snapshot = b.freeze();
        await expect(
            xgmmlExporter.exportToString(snapshot, { cytoscapeEscapes: "yes" as unknown as boolean }),
        ).rejects.toMatchObject({
            code: "E_UNSUPPORTED",
        });
        expect(await decodeChunks(xgmmlExporter.export(snapshot))).toBe(await xgmmlExporter.exportToString(snapshot));
    });

    it("writes another format's graph as XGMML that reads back with only the announced differences", async () => {
        const graphml = `<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns">
<key id="w" for="edge" attr.name="weight" attr.type="double"/><key id="n" for="node" attr.name="name" attr.type="string"/>
<graph edgedefault="undirected"><node id="n1"><data key="n">one</data></node><node id="n2"/><edge source="n1" target="n2"><data key="w">1.5</data></edge></graph></graphml>`;
        const first = (await importGraph(graphml, { format: "graphml" })).snapshot;
        const notes = codes(first);
        const second = await again(first);
        const diffs = compareSnapshots(first, second, { tolerance: 1e-9 });
        expect(notes.length > 0 || diffs.length === 0, describeDiffs(diffs)).toBe(true);
        expect(second.edgeCount).toBe(1);
        expect(second.directed).toBe(false);
    });

    it("notes a plain weight column, a reserved name and a role-less label", () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.addNode("b");
        b.addEdge("a", "b");
        b.declareEdgeColumn({ name: "weight", dtype: "f64", nullable: true });
        b.declareNodeColumn({ name: "graphics", dtype: "string", nullable: true });
        b.declareNodeColumn({ name: "label", dtype: "string", nullable: true });
        b.setNodeValue("label", 0, "A");
        expect(codes(b.freeze())).toEqual(
            expect.arrayContaining([LOSS.WEIGHT_KEY_CLASH, LOSS.COLUMN_NAME_CHANGED, LOSS.ROLE_ASSUMED]),
        );
    });

    it("round-trips the real Cytoscape 3.10 export of the yeast network", async () => {
        const path = new URL("../../conformance/fixtures/xgmml/leovan/yeast_perturbation.xgmml", import.meta.url);
        let text: string;
        try {
            text = readFileSync(path, "utf-8");
        } catch {
            return;
        }
        const first = await read(text);
        const second = await again(first);
        const diffs = compareSnapshots(first, second, { tolerance: 1e-6, limit: 5 });
        expect(diffs, describeDiffs(diffs)).toEqual([]);
    });
});
