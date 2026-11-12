/**
 * Hostile inputs that once grew without bound in the GraphML and DOT readers: a clique hyperedge with
 * thousands of endpoints, a DOT record label nested tens of thousands of braces deep, and GraphML data
 * holding elements nested tens of thousands deep. Each import finishes and reports the one bad part.
 */

import { describe, expect, it } from "vitest";

import { treeProblem, writeXmlTree } from "../../src/formats/graphml/tree.js";
import { createRegistry, importGraph } from "../../src/registry.js";
import { importForStyles } from "../styles/harness.js";
import { codes, graphml, load } from "./xml-helpers.js";

const text = (s: string): Uint8Array => new TextEncoder().encode(s);

describe("hyperedge clique budget", () => {
    it("skips a GraphML clique hyperedge that would pass the expansion budget, with E_TOO_LARGE, and keeps the rest", async () => {
        const n = 1500; // 1,124,250 pairs
        const nodes = Array.from({ length: n }, (_, i) => `<node id="n${i}"/>`).join("");
        const big = Array.from({ length: n }, (_, i) => `<endpoint node="n${i}"/>`).join("");
        const doc = graphml(
            `${nodes}<hyperedge id="big">${big}</hyperedge><hyperedge id="small"><endpoint node="n0"/><endpoint node="n1"/></hyperedge>`,
        ).replace('edgedefault="directed"', 'edgedefault="undirected"');
        const { snapshot, report } = await load("graphml", doc, { hyperedges: "clique" });
        expect(snapshot.edgeCount).toBe(1);
        expect(codes(report)).toEqual(["E_TOO_LARGE"]);
        expect(report.issues[0].element).toBe("big");
    });
});

describe("DOT group edge budget", () => {
    it("skips an edge statement joining two 1,100-node groups (1.21M edges) with E_TOO_LARGE, and keeps the rest", async () => {
        const group = (p: string): string => `{${Array.from({ length: 1100 }, (_, i) => `${p}${i}`).join(" ")}}`;
        const doc = text(`digraph { ${group("a")} -> ${group("b")}; x -> {y z}; }`);
        const { snapshot, report } = await importGraph(doc, { format: "dot" });
        expect(snapshot.edgeCount).toBe(2);
        expect(codes(report)).toEqual(["E_TOO_LARGE"]);
        expect(report.counts.skippedEdges).toBe(1100 * 1100);
    });
});

describe("deep nesting", () => {
    it("draws a DOT record label nested 50,000 braces deep as its plain label, with W_STYLE_NESTING", async () => {
        const doc = text(`digraph { a [shape=record, label="${"{".repeat(50_000)}x"]; b; a -> b }`);
        const loaded = await importForStyles(createRegistry(), "dot", doc);
        expect(loaded.snapshot.nodeCount).toBe(2);
        expect(loaded.imported?.styles.notes.map((note) => note.code)).toContain("W_STYLE_NESTING");
    });

    it("drops a GraphML untyped data value holding elements nested 50,000 deep, keeping its node", async () => {
        const deep = `${"<x>".repeat(50_000)}${"</x>".repeat(50_000)}`;
        const doc = graphml(
            `<node id="a"><data key="d">${deep}</data></node><node id="b"><data key="d">ok</data></node>`,
            '<key id="d" for="node" attr.name="d"/>',
        );
        const { snapshot, report } = await load("graphml", doc);
        expect(snapshot.nodeCount).toBe(2);
        expect(snapshot.nodes.value("d", 1)).toBe("ok");
        expect(snapshot.nodes.value("d", 0)).toBeUndefined();
        expect(codes(report)).toContain("E_COLUMN_TYPE");
    });

    it("drops a yFiles data tree nested 50,000 deep, keeping its node", async () => {
        const deep = `${"<y:x>".repeat(50_000)}${"</y:x>".repeat(50_000)}`;
        const doc = graphml(
            `<node id="a"><data key="g">${deep}</data></node>`,
            '<key id="g" for="node" yfiles.type="nodegraphics"/>',
        ).replace("<graphml ", '<graphml xmlns:y="http://www.yworks.com/xml/graphml" ');
        const { snapshot, report } = await load("graphml", doc);
        expect(snapshot.nodeCount).toBe(1);
        expect(codes(report)).toContain("E_COLUMN_TYPE");
    });

    it("refuses to write a JSON tree nested 50,000 deep as GraphML XML, with E_COLUMN_TYPE", () => {
        let deep: Record<string, unknown> = {};
        for (let i = 0; i < 50_000; i++) {
            deep = { x: deep };
        }
        expect(treeProblem(deep)).toMatch(/nested more than 256 deep/);
        expect(() => writeXmlTree(deep, "", [])).toThrow(/nested more than 256 deep/);
    });
});
