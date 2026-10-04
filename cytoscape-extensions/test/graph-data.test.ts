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

    it("never copies a column into Cytoscape's reserved data fields: it renames it and says so", () => {
        const snapshot = fromEdgeArrays({
            directed: false,
            ids: ["x", "y"],
            src: new Uint32Array([0]),
            dst: new Uint32Array([1]),
            nodeColumns: { parent: { data: ["y", null], decl: { dtype: "string" } } },
            edgeColumns: { source: { data: ["z"], decl: { dtype: "string" } } },
        });
        const renamed: unknown[] = [];
        const [x, , e] = snapshotToElements(snapshot, (r) => renamed.push(r));
        expect(x.data).toEqual({ id: "x", "parent#2": "y" });
        expect(e.data).toEqual({ source: "x", target: "y", "source#2": "z" });
        expect(renamed).toEqual([
            { domain: "node", from: "parent", to: "parent#2" },
            { domain: "edge", from: "source", to: "source#2" },
        ]);
    });
});

describe("generated graphs", () => {
    it("give edges the ids e0, e1, ..., so the same seed gives the same element ids", async () => {
        const a = core();
        const b = core();
        await a.graphtyGenerate("barabasi-albert", { n: 30, m: 2, seed: 1 });
        await b.graphtyGenerate("barabasi-albert", { n: 30, m: 2, seed: 1 });
        expect(a.edges().map((e) => e.id())).toEqual(b.edges().map((e) => e.id()));
        expect(a.edges()[0]?.id()).toBe("e0");
        expect(await a.graphtyExport("graphml")).toBe(await b.graphtyExport("graphml"));
    });

    it("place nodes at the generator's coordinates", async () => {
        const cy = core();
        await cy.graphtyGenerate("grid", { rows: 2, cols: 3, positions: true });
        expect(cy.$("#4").position()).toEqual({ x: 1, y: 1 });
        expect(cy.$("#4").data()).toEqual({ id: "4" });
        const geometric = core();
        await geometric.graphtyGenerate("random-geometric", { n: 5, radius: 0.5, seed: 1 });
        expect(
            geometric
                .nodes()
                .toArray()
                .every((n) => n.position().x > 0 && n.position().x < 1),
        ).toBe(true);
    });
});

describe("graphtyDataset with an abort signal", () => {
    it("rejects with AbortError and adds nothing, even when a custom fetch ignores the signal", async () => {
        const controller = new AbortController();
        controller.abort();
        let fetched = 0;
        const fetchIgnoringSignal = (): Promise<Response> => {
            fetched++;
            return Promise.resolve(new Response("not a dataset", { status: 404 }));
        };
        for (const name of ["karate", "road-ny"]) {
            const cy = core();
            await expect(
                cy.graphtyDataset(name, { signal: controller.signal, fetch: fetchIgnoringSignal }),
            ).rejects.toMatchObject({ name: "AbortError" });
            expect(cy.elements().length).toBe(0);
        }
        expect(fetched).toBe(0);
    });
});

describe("integer ids in the integer-id formats", () => {
    it("write a graph whose ids are all integers to GML and CX2 with sanitizeIds 'error', and read the same ids back", async () => {
        const cy = core();
        await cy.graphtyGenerate("path", { n: 4 });
        for (const format of ["gml", "cx2"] as const) {
            const text = await cy.graphtyExport(format, { sanitizeIds: "error" });
            const back = core();
            await back.graphtyImport(text, format);
            expect(back.nodes().map((n) => n.id())).toEqual(["0", "1", "2", "3"]);
            expect(back.nodes().every((n) => Object.keys(n.data()).length === 1)).toBe(true);
        }
    });

    it("do not tell onLoss that integer-text ids change type: graphtyImport reads them back as the same strings", async () => {
        const cy = core();
        await cy.graphtyGenerate("path", { n: 3 });
        for (const format of ["graphml", "gexf"] as const) {
            const codes: string[] = [];
            await cy.graphtyExport(format, { onLoss: (notes) => codes.push(...notes.map((n) => n.code)) });
            expect(codes).not.toContain("W_ID_TEXT_TYPE");
        }
    });
});
