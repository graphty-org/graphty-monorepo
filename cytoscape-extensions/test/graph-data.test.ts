import { fromEdgeArrays } from "@graphty/graph-format";
import { ImportError } from "@graphty/graph-io";
import cytoscape from "cytoscape";
import { describe, expect, it } from "vitest";

import { snapshotToElements } from "../src/elements";
import graphtyCytoscape from "../src/index";
import { GENERATORS } from "../src/samples";

cytoscape.use(graphtyCytoscape);

const core = (elements: cytoscape.ElementDefinition[] = []): cytoscape.Core =>
    cytoscape({ headless: true, elements, layout: { name: "preset" } });

const sample = (): cytoscape.ElementDefinition[] => [
    { data: { id: "a", label: "Alpha", size: 3, flag: true }, position: { x: 10, y: 20 } },
    { data: { id: "b", label: "Beta", size: 1.5 }, position: { x: -5, y: 7.25 } },
    { data: { id: "c" }, position: { x: 0, y: 0 } },
    { data: { id: "ab", source: "a", target: "b", weight: 2, kind: "x" } },
    { data: { id: "bc", source: "b", target: "c", weight: 0.5, kind: "y" } },
];

const edgeKeys = (cy: cytoscape.Core): string[] =>
    cy
        .edges()
        .map((e) => `${e.source().id()}-${e.target().id()}`)
        .sort();

describe("graphtyGenerate", () => {
    it("adds the same seeded graph every time, with ids 0..n-1", async () => {
        const one = core();
        const two = core();
        const r = await one.graphtyGenerate("barabasi-albert", { n: 50, m: 2, seed: 7 });
        await two.graphtyGenerate("barabasi-albert", { n: 50, m: 2, seed: 7 });
        expect(r.directed).toBe(false);
        expect(r.elements.nodes()).toHaveLength(50);
        expect(one.nodes()[0].id()).toBe("0");
        expect(edgeKeys(one)).toEqual(edgeKeys(two));
        expect(one.edges().length).toBeGreaterThan(90);
    });

    it("writes ground truth into node data", async () => {
        const cy = core();
        await cy.graphtyGenerate("planted-partition", { groups: 3, groupSize: 10, pIn: 0.5, pOut: 0.01, seed: 1 });
        expect(new Set(cy.nodes().map((n) => n.data("community") as number))).toEqual(new Set([0, 1, 2]));
    });

    it("takes the named graphs by their name option", async () => {
        const cy = core();
        await cy.graphtyGenerate("named", { name: "frucht" });
        expect(cy.nodes()).toHaveLength(12);
        expect(cy.edges()).toHaveLength(18);
    });

    it("refuses an unknown generator", async () => {
        await expect(core().graphtyGenerate("nope" as keyof typeof GENERATORS, {} as never)).rejects.toThrow(
            /unknown generator "nope"/,
        );
    });
});

describe("graphtyDataset", () => {
    it("adds a bundled dataset with its attributes and weights", async () => {
        const cy = core();
        const r = await cy.graphtyDataset("karate");
        expect(r.directed).toBe(false);
        expect(cy.nodes()).toHaveLength(34);
        expect(cy.edges()).toHaveLength(78);
        expect(cy.nodes()[0].data("club")).toBeDefined();
        expect(typeof cy.edges()[0].data("weight")).toBe("number");
    });

    it("keeps a dataset's own node names and reports direction", async () => {
        const cy = core();
        const r = await cy.graphtyDataset("contiguous-usa");
        expect(r.directed).toBe(false);
        expect(cy.nodes().map((n) => n.data("label") as string)).toContain("Texas");
    });
});

describe("graphtyExport and graphtyImport", () => {
    const formats = ["graphml", "gexf", "gml", "dot", "pajek", "csv", "json", "neo4j", "cx2"] as const;

    it.each(formats)("round-trips the topology through %s", async (format) => {
        const text = await core(sample()).graphtyExport(format);
        const back = core();
        const r = await back.graphtyImport(text, format);
        expect(r.format).toBe(format);
        expect(back.nodes()).toHaveLength(3);
        expect(back.edges()).toHaveLength(2);
        expect(edgeKeys(back)).toEqual(["a-b", "b-c"]);
    });

    it("keeps attributes, weights and positions through GraphML and Cytoscape JSON", async () => {
        for (const format of ["graphml", "json"] as const) {
            const back = core();
            await back.graphtyImport(await core(sample()).graphtyExport(format, { dialect: "cytoscape" }), format);
            const a = back.getElementById("a");
            expect(a.data("label")).toBe("Alpha");
            expect(a.data("size")).toBe(3);
            expect(a.data("flag")).toBe(true);
            expect(back.getElementById("c").data("label")).toBeUndefined();
            expect(
                back
                    .edges()
                    .map((e) => e.data("weight") as number)
                    .sort(),
            ).toEqual([0.5, 2]);
            expect(
                back
                    .edges()
                    .map((e) => e.data("kind") as string)
                    .sort(),
            ).toEqual(["x", "y"]);
            if (format === "json") {
                expect(back.getElementById("b").position()).toEqual({ x: -5, y: 7.25 });
            }
        }
    });

    it("sniffs the format when none is given", async () => {
        const r = await core().graphtyImport(await core(sample()).graphtyExport("gexf"));
        expect(r.format).toBe("gexf");
    });

    it("writes a directed graph when asked", async () => {
        const back = core();
        const r = await back.graphtyImport(
            await core(sample()).graphtyExport("graphml", { directed: true }),
            "graphml",
        );
        expect(r.directed).toBe(true);
    });

    it("exports a collection: its nodes and its edges between them", async () => {
        const cy = core(sample());
        const back = core();
        await back.graphtyImport(await cy.$("#a, #b, #ab, #bc").graphtyExport("graphml"), "graphml");
        expect(back.nodes().map((n) => n.id())).toEqual(["a", "b"]);
        expect(back.edges()).toHaveLength(1);
    });

    it("rejects a malformed file without adding anything", async () => {
        const cy = core();
        await expect(cy.graphtyImport("<graphml><graph><node id=", "graphml")).rejects.toBeInstanceOf(ImportError);
        expect(cy.elements()).toHaveLength(0);
    });
});

describe("adding to a core that already holds the graph's node ids", () => {
    it("refuses a second generated graph instead of merging the two, and adds nothing", async () => {
        const cy = core();
        await cy.graphtyGenerate("barabasi-albert", { n: 10, m: 2, seed: 1 });
        const edges = cy.edges().length;
        await expect(cy.graphtyGenerate("barabasi-albert", { n: 10, m: 2, seed: 2 })).rejects.toThrow(
            /already has an element with id "0".*empty core/,
        );
        expect(cy.nodes()).toHaveLength(10);
        expect(cy.edges()).toHaveLength(edges);
    });

    it("refuses an imported node whose id is an existing edge's id", async () => {
        const cy = core([
            { data: { id: "a" } },
            { data: { id: "b" } },
            { data: { id: "n0", source: "a", target: "b" } },
        ]);
        const text = await core([{ data: { id: "n0" } }]).graphtyExport("graphml");
        await expect(cy.graphtyImport(text, "graphml")).rejects.toThrow(/"n0"/);
    });
});

describe("snapshotToElements", () => {
    it("never lets a column named __proto__ set the prototype of an element's data", async () => {
        const cy = core();
        const text = JSON.stringify({
            elements: {
                nodes: [{ data: { id: "a", kept: 2 } }, { data: { id: "b" } }],
                edges: [],
            },
        });
        // an object literal cannot hold an own "__proto__" key, so write it into the text the way a hostile file has it
        await cy.graphtyImport(text.replace('"kept"', '"__proto__":{"parent":"b","evil":1},"kept"'), "json");
        const a = cy.$("#a");
        expect(a.data("kept")).toBe(2);
        expect(a.parent()).toHaveLength(0);
        expect(a.data("evil")).toBeUndefined();
        expect(Object.getPrototypeOf(a.data())).toBe(Object.prototype);
    });

    it("never copies a column into Cytoscape's reserved data fields", () => {
        const snapshot = fromEdgeArrays({
            directed: false,
            ids: ["x", "y"],
            src: new Uint32Array([0]),
            dst: new Uint32Array([1]),
            nodeColumns: { parent: { data: ["y", null], decl: { dtype: "string" } } },
            edgeColumns: { source: { data: ["z"], decl: { dtype: "string" } } },
        });
        const [x, , e] = snapshotToElements(snapshot);
        expect(x.data).toEqual({ id: "x" });
        expect(e.data).toEqual({ source: "x", target: "y" });
    });
});
