/**
 * The edge cases of moving a graph between Cytoscape and a file: compound nodes, parallel and reversed edges,
 * hidden elements, edge ids, data types and positions.
 */

import { fromEdgeArrays } from "@graphty/graph-format";
import type { LossNote } from "@graphty/graph-io";
import cytoscape from "cytoscape";
import { describe, expect, it } from "vitest";

import { elementsToSnapshot, snapshotToElements } from "../src/elements";
import graphtyCytoscape, { toSnapshot, writeData } from "../src/index";
import type { ExportFormat } from "../src/io";

cytoscape.use(graphtyCytoscape);

const core = (elements: cytoscape.ElementDefinition[] = []): cytoscape.Core =>
    cytoscape({
        headless: true,
        styleEnabled: true,
        elements,
        layout: { name: "preset" },
        style: [{ selector: ".hidden", style: { display: "none" } }],
    });

const roundTrip = async (
    cy: cytoscape.Core | cytoscape.Collection,
    format: ExportFormat,
    options: Record<string, unknown> = {},
): Promise<cytoscape.Core> => {
    const back = core();
    await back.graphtyImport(await cy.graphtyExport(format, options), format);
    return back;
};

const edgeList = (cy: cytoscape.Core): string[] =>
    cy.edges().map((e) => `${e.id()}:${e.source().id()}>${e.target().id()}`);

describe("compound nodes", () => {
    const compound = (): cytoscape.ElementDefinition[] => [
        { data: { id: "p" } },
        { data: { id: "a", parent: "p" }, position: { x: 10, y: 20 } },
        { data: { id: "b", parent: "p" }, position: { x: -5, y: 7 } },
        { data: { id: "c" }, position: { x: 3, y: 4 } },
        { data: { id: "ab", source: "a", target: "b" } },
        { data: { id: "cp", source: "c", target: "p" } },
    ];

    it.each(["graphml", "gexf", "dot", "json"] as const)("keeps each node's parent through %s", async (format) => {
        const back = await roundTrip(core(compound()), format);
        expect(back.$("#a").parent().first().id()).toBe("p");
        expect(back.$("#b").parent().first().id()).toBe("p");
        expect(back.$("#c").parent()).toHaveLength(0);
        expect(back.$("#p").isParent()).toBe(true);
    });

    it("writes a node whose parent is outside the exported collection as a top-level node", async () => {
        const back = await roundTrip(core(compound()).$("#a, #b, #ab"), "graphml");
        expect(back.nodes().map((n) => n.id())).toEqual(["a", "b"]);
        expect(back.$("#a").data("parent")).toBeUndefined();
    });

    it("ignores a parent column entry that names the node itself", () => {
        const snapshot = fromEdgeArrays({
            directed: false,
            ids: ["x", "y"],
            src: new Uint32Array(0),
            dst: new Uint32Array(0),
            nodeColumns: { parent: { data: [0, 0], decl: { dtype: "u32", role: "parent", refersTo: "node" } } },
        });
        const [x, y] = snapshotToElements(snapshot);
        expect(x.data.parent).toBeUndefined();
        expect(y.data.parent).toBe("x");
    });

    it("counts a parent as a plain node for the algorithms, as Cytoscape's own algorithms do", () => {
        const { snapshot, nodes } = toSnapshot(core(compound()).elements());
        expect(nodes.map((n) => n.id())).toEqual(["p", "a", "b", "c"]);
        expect(snapshot.edgeCount).toBe(2);
    });
});

describe("parallel and reversed edges", () => {
    const multi = (): cytoscape.ElementDefinition[] => [
        { data: { id: "a" } },
        { data: { id: "b" } },
        { data: { id: "e1", source: "a", target: "b", weight: 2 } },
        { data: { id: "e2", source: "a", target: "b", weight: 3 } },
        { data: { id: "e3", source: "b", target: "a" } },
    ];

    it("keeps every parallel edge in the snapshot, each result going to its own edge", () => {
        const { snapshot, edges } = toSnapshot(core(multi()).elements(), { weight: "weight" });
        expect(snapshot.edgeCount).toBe(3);
        expect(Array.from({ length: 3 }, (_, e) => snapshot.weights?.[snapshot.edgeToArc[e]])).toEqual([2, 3, 1]);
        writeData(edges, [10, 20, 30], "flow");
        expect(edges.map((e) => e.data("flow") as number)).toEqual([10, 20, 30]);
    });

    it.each(["graphml", "gexf", "gml", "dot", "csv", "json"] as const)(
        "keeps parallel edges, their ids and each edge's own direction through %s, undirected or not",
        async (format) => {
            for (const directed of [false, true]) {
                const back = await roundTrip(core(multi()), format, { directed });
                expect(edgeList(back)).toEqual(["e1:a>b", "e2:a>b", "e3:b>a"]);
            }
        },
    );

    it("keeps weights that only some edges have", async () => {
        for (const format of ["graphml", "gexf", "gml", "json"] as const) {
            const back = await roundTrip(core(multi()), format);
            expect(back.edges().map((e) => e.data("weight") as unknown)).toEqual([2, 3, undefined]);
        }
    });
});

describe("edge ids on import", () => {
    it("keeps the file's edge ids", async () => {
        const cy = core();
        await cy.graphtyImport(
            `<graphml><graph edgedefault="directed"><node id="a"/><node id="b"/><edge id="road-1" source="a" target="b"/></graph></graphml>`,
            "graphml",
        );
        expect(cy.edges()[0].id()).toBe("road-1");
    });

    it("lets Cytoscape choose the id of an edge whose id is a node id or already in the core", async () => {
        const file = `<graphml><graph edgedefault="directed"><node id="a"/><node id="b"/>
            <edge id="a" source="a" target="b"/><edge id="x" source="b" target="a"/><edge id="y" source="b" target="a"/>
            </graph></graphml>`;
        const cy = core([{ data: { id: "z" } }, { data: { id: "x", source: "z", target: "z" } }]);
        const { elements } = await cy.graphtyImport(file, "graphml");
        const ids = elements.edges().map((e) => e.id());
        expect(ids).toHaveLength(3);
        expect(ids[0]).not.toBe("a");
        expect(ids[1]).not.toBe("x");
        expect(ids[2]).toBe("y");
        expect(cy.$("#x").source().id()).toBe("z");
    });

    it("never gives two edges the same id", () => {
        const snapshot = fromEdgeArrays({
            directed: true,
            ids: ["a", "b"],
            src: new Uint32Array([0, 1]),
            dst: new Uint32Array([1, 0]),
            edgeColumns: { id: { data: ["x", "x"], decl: { dtype: "string", role: "id" } } },
        });
        const [, , first, second] = snapshotToElements(snapshot);
        expect(first.data.id).toBe("x");
        expect(second.data.id).toBeUndefined();
    });

    it("imports the same file twice into one core", async () => {
        const cy = core();
        const text = await core([{ data: { id: "a" } }, { data: { id: "e", source: "a", target: "a" } }]).graphtyExport(
            "graphml",
        );
        await cy.graphtyImport(text.replace(/"a"/g, '"a1"'), "graphml");
        await cy.graphtyImport(text.replace(/"a"/g, '"a2"'), "graphml");
        expect(cy.edges()).toHaveLength(2);
        expect(cy.$("#e").source().id()).toBe("a1");
    });
});

describe("hidden elements", () => {
    const withHidden = (): cytoscape.ElementDefinition[] => [
        { data: { id: "a" } },
        { data: { id: "b" }, classes: "hidden" },
        { data: { id: "ab", source: "a", target: "b" } },
    ];

    it("are exported like any other element", async () => {
        const back = await roundTrip(core(withHidden()), "graphml");
        expect(back.nodes()).toHaveLength(2);
        expect(back.edges()).toHaveLength(1);
    });

    it("are left out when the visible elements are exported", async () => {
        const cy = core(withHidden());
        expect(cy.$("#b").visible()).toBe(false);
        const back = await roundTrip(cy.elements(":visible"), "graphml");
        expect(back.nodes().map((n) => n.id())).toEqual(["a"]);
        expect(back.edges()).toHaveLength(0);
    });
});

describe("data types through export and import", () => {
    const typed = (): cytoscape.ElementDefinition[] => [
        {
            data: { id: "a", int: 7, real: 2.5, neg: -1e-9, digits: "007", empty: "", yes: true, no: false, word: "x" },
        },
        { data: { id: "b", int: 8, list: [1, 2], obj: { k: "v", n: [true] }, word: null } },
        { data: { id: "ab", source: "a", target: "b", label: "rel", n: 0 } },
    ];

    it("keeps numbers, strings that look like numbers, empty strings and booleans through every typed format", async () => {
        for (const format of ["graphml", "gexf", "json"] as const) {
            const back = await roundTrip(core(typed()), format);
            const a = back.$("#a").data() as Record<string, unknown>;
            expect({ format, ...a }).toMatchObject({
                format,
                int: 7,
                real: 2.5,
                neg: -1e-9,
                digits: "007",
                empty: "",
                yes: true,
                no: false,
                word: "x",
            });
            expect(back.$("#b").data("word")).toBeUndefined();
            expect(back.edges()[0].data()).toMatchObject({ label: "rel", n: 0 });
        }
    });

    it("keeps lists and objects through Cytoscape JSON and GML", async () => {
        for (const format of ["json", "gml"] as const) {
            const b = (await roundTrip(core(typed()), format)).$("#b");
            expect(b.data("list")).toEqual([1, 2]);
            expect(b.data("obj")).toEqual(format === "gml" ? { k: "v", n: [1] } : { k: "v", n: [true] });
            expect((await roundTrip(core(typed()), format)).$("#a").data("list")).toBeUndefined();
        }
    });

    it("tells onLoss what a format cannot hold", async () => {
        const heard: LossNote[][] = [];
        await core(typed()).graphtyExport("dot", { onLoss: (notes) => heard.push([...notes]) });
        expect(heard).toHaveLength(1);
        expect(heard[0].map((n) => n.column)).toEqual(expect.arrayContaining(["list", "obj"]));
    });

    it("keeps a label field under its own name in the formats that have a label of their own", async () => {
        const labelled = (): cytoscape.ElementDefinition[] => [
            { data: { id: "a", label: "Alpha" } },
            { data: { id: "b" } },
            { data: { id: "ab", source: "a", target: "b", label: "rel" } },
        ];
        for (const format of ["gexf", "graphml", "dot", "gml", "json"] as const) {
            const back = await roundTrip(core(labelled()), format);
            expect({ format, label: back.$("#a").data("label") as unknown }).toEqual({ format, label: "Alpha" });
            expect({ format, label: back.$("#ab").data("label") as unknown }).toEqual({ format, label: "rel" });
        }
    });

    it("stores NaN and the infinities in a number column, not a JSON one", () => {
        const s = elementsToSnapshot(
            core([
                { data: { id: "a", v: Number.NaN } },
                { data: { id: "b", v: Infinity } },
                { data: { id: "c", v: 1 } },
            ]).elements(),
        );
        const v = s.nodes.get("v");
        expect(v?.meta.dtype).toBe("f64");
        expect([v?.value(0), v?.value(1), v?.value(2)]).toEqual([Number.NaN, Infinity, 1]);
    });
});

describe("positions on import", () => {
    const placed = (): cytoscape.ElementDefinition[] => [
        { data: { id: "a" }, position: { x: 10, y: 20 } },
        { data: { id: "b" }, position: { x: -5, y: 7.25 } },
        { data: { id: "ab", source: "a", target: "b" } },
    ];

    it.each(["gexf", "gml", "dot", "pajek", "cx2", "json"] as const)("reads node positions from %s", async (format) => {
        const back = await roundTrip(core(placed()), format);
        expect(back.$("#a").position()).toEqual({ x: 10, y: 20 });
        expect(back.$("#b").position()).toEqual({ x: -5, y: 7.25 });
    });

    it("drops z, and leaves a node without a position (or with a non-finite one) unplaced", () => {
        const snapshot = fromEdgeArrays({
            directed: false,
            ids: ["a", "b", "c"],
            src: new Uint32Array(0),
            dst: new Uint32Array(0),
            nodeColumns: {
                xyz: {
                    data: [[1, 2, 3], null, [Number.NaN, 0, 0]],
                    decl: { dtype: "f64", components: 3, role: "position" },
                },
            },
        });
        const [a, b, c] = snapshotToElements(snapshot);
        expect(a.position).toEqual({ x: 1, y: 2 });
        expect(b.position).toBeUndefined();
        expect(c.position).toBeUndefined();
        expect(a.data).toEqual({ id: "a" });
    });

    it("reports that GraphML cannot hold positions instead of dropping them silently", async () => {
        const heard: string[] = [];
        await core(placed()).graphtyExport("graphml", { onLoss: (notes) => heard.push(...notes.map((n) => n.code)) });
        expect(heard).toContain("W_POSITIONS_DROPPED");
    });
});

describe("hostile files", () => {
    const entities = `<!DOCTYPE graphml [ <!ENTITY a "aaaaaaaaaa"> <!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"> <!ENTITY x SYSTEM "file:///etc/passwd"> ]>`;

    it.each([
        [
            "graphml",
            `${entities}<graphml><graph edgedefault="undirected"><node id="n"><data key="d">&b;</data></node></graph></graphml>`,
        ],
        [
            "graphml",
            `${entities}<graphml><graph edgedefault="undirected"><node id="n"><data key="d">&x;</data></node></graph></graphml>`,
        ],
        [
            "gexf",
            `${entities.replace("graphml", "gexf")}<gexf version="1.3"><graph><nodes><node id="n" label="&x;"/></nodes></graph></gexf>`,
        ],
        ["gml", `graph [ ${"a [ ".repeat(100_000)}${"] ".repeat(100_000)} ]`],
        ["dot", `graph { ${"{ ".repeat(100_000)}${"} ".repeat(100_000)} }`],
    ] as const)(
        "rejects %s entity expansion, external entities and deep nesting without adding anything",
        async (format, text) => {
            const cy = core();
            await expect(cy.graphtyImport(text, format)).rejects.toThrow();
            expect(cy.elements()).toHaveLength(0);
        },
    );
});
