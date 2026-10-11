/**
 * The hostile subset of design 7.4, generated here and run in graph-io's normal suite (a forked worker, like every
 * graph-io test): deep XML nesting, a cyclic SharedData file, a 10,000-key table with one key uncovered, 100,000
 * class tests in one selector, a 5,000-character value and `__proto__` keys. Each finishes, never throws past a
 * coded error, pollutes nothing, plans to rules that reproduce what its reader read, and spends an exact, counted
 * amount of the one work budget: the counts are asserted, never the time.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { XML_NESTING_CODE } from "../../src/common/codes.js";
import { ImportReportBuilder } from "../../src/common/report.js";
import { MAX_XML_DEPTH } from "../../src/common/xml.js";
import { createRegistry } from "../../src/registry.js";
import {
    cytoscapeRules,
    cytoscapeStyleFromCx2,
    extractStyles,
    resolveCytoscape,
    StyleBudget,
    StyleNotes,
    type StyleTarget,
} from "../../src/styles/index.js";
import { type GraphImporter, ImportError } from "../../src/types.js";
import { loadCyjs } from "./formats/cyjs.js";
import { checkStyles, importForStyles, type LoadedGraph, styleTruth } from "./harness.js";

/** What one hostile input cost and gave. */
interface Spent {
    readonly node: number;
    readonly edge: number;
    readonly rules: number;
    readonly notes: readonly string[];
}

/**
 * Reads a graph's styles under a counted budget, checks them against the truth and that nothing was polluted.
 * @param loaded - the graph as read
 * @returns the work spent, the rule count and the note codes
 */
function extractCounted(loaded: LoadedGraph): Spent {
    const budget = new StyleBudget();
    const ex = extractStyles(loaded.importer, loaded.snapshot, loaded.report, { budget });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty("data");
    if (ex === null) {
        return { node: budget.used("node"), edge: budget.used("edge"), rules: 0, notes: [] };
    }
    const truth = styleTruth(loaded);
    expect(checkStyles(ex, truth ?? {}, loaded.snapshot).failures).toEqual([]);
    expect(budget.exhausted("node") || budget.exhausted("edge")).toBe(false);
    return {
        node: budget.used("node"),
        edge: budget.used("edge"),
        rules: ex.styles.rules.length,
        notes: [...new Set(ex.styles.notes.map((n) => n.code))].sort(),
    };
}

/**
 * A graph built in memory with an importer whose `styles()` is given.
 * @param snapshot - the graph
 * @param styles - the importer's `styles()`
 * @returns the graph as read
 */
function inMemory(snapshot: GraphSnapshot, styles: GraphImporter["styles"]): LoadedGraph {
    const importer: GraphImporter = {
        format: "hostile",
        extensions: [],
        mimeTypes: [],
        import: () => Promise.reject(new Error("in memory")),
        styles,
    };
    return { snapshot, importer, report: new ImportReportBuilder("hostile", Infinity).finish() };
}

/**
 * Nodes with one string column.
 * @param column - the column's name
 * @param values - one value per node
 * @returns the graph
 */
function nodesWith(column: string, values: readonly (string | null)[]): GraphSnapshot {
    const b = new GraphBuilder({ directed: true });
    const c = b.declareNodeColumn({ name: column, dtype: "string", nullable: true });
    values.forEach((v, i) => {
        b.addNode(`n${String(i)}`);
        b.setNodeValue(c, i, v);
    });
    return b.freeze();
}

/**
 * A Cytoscape desktop style read the way the CX2 reader reads it, as an importer's advanced path.
 * @param visualProperties - the CX2 `visualProperties` aspect
 * @param column - the attribute the elements carry
 * @returns the importer's `styles()`
 */
function cx2Styles(visualProperties: unknown, column: string): GraphImporter["styles"] {
    return (snapshot, context) => {
        const notes = new StyleNotes();
        const style = cytoscapeStyleFromCx2(visualProperties, undefined, notes);
        const out = (
            target: StyleTarget,
        ): { values: ReturnType<typeof resolveCytoscape> } & ReturnType<typeof cytoscapeRules> => {
            const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
            const table = target === "node" ? snapshot.nodes : snapshot.edges;
            const elements = {
                count: n,
                value: (c: string, i: number): unknown => (c === column && table.has(c) ? table.value(c, i) : null),
            };
            const values = resolveCytoscape(target, style, elements, { notes, budget: context.budget });
            return { values, ...cytoscapeRules(target, style, elements, { notes, budget: context.budget }) };
        };
        return {
            canonical: true,
            dialect: "cytoscape",
            tool: "cytoscape",
            node: out("node"),
            edge: out("edge"),
            notes: notes.list(),
        };
    };
}

describe("deep XML nesting", () => {
    it("reads 20,000 nested XGMML atts with styles asked for, and stops deeper nesting with E_XML_NESTING", async () => {
        const doc = (depth: number): Uint8Array =>
            new TextEncoder().encode(
                `<?xml version="1.0"?><graph xmlns="http://www.cs.rpi.edu/XGMML" directed="1"><node id="1" label="a"><graphics fill="#ff0000"/>${'<att name="x" type="list">'.repeat(depth)}${"</att>".repeat(depth)}</node></graph>`,
            );
        const loaded = await importForStyles(createRegistry(), "xgmml", doc(20_000));
        expect(loaded.snapshot.nodeCount).toBe(1);
        expect(extractCounted(loaded)).toMatchInlineSnapshot(`
          {
            "edge": 0,
            "node": 17,
            "notes": [],
            "rules": 3,
          }
        `);
        const err = await importForStyles(createRegistry(), "xgmml", doc(MAX_XML_DEPTH + 1)).then(
            () => null,
            (e: unknown) => e,
        );
        expect((err as ImportError).issue?.code).toBe(XML_NESTING_CODE);
    });
});

describe("a cyclic SharedData file", () => {
    it("finishes with a style that refers to itself, in yFiles 3 GraphML", async () => {
        const doc = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/yfiles-common/3.0" xmlns:x="http://www.yworks.com/xml/yfiles-common/markup/3.0">',
            '<key id="d3" for="node" attr.name="NodeStyle" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/NodeStyle"/>',
            '<key id="d9" for="graphml" attr.name="SharedData" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/SharedData"/>',
            '<data key="d9"><y:SharedData><y:CollapsibleNodeStyleDecorator x:Key="2" wrappedStyle="{y:GraphMLReference 2}"/>',
            '<y:ShapeNodeStyle x:Key="3" fill="{y:GraphMLReference 4}"/><y:ShapeNodeStyle x:Key="4" fill="{y:GraphMLReference 3}"/></y:SharedData></data>',
            '<graph id="G" edgedefault="directed"><node id="n0"><data key="d3"><y:GraphMLReference ResourceKey="2"/></data></node>',
            '<node id="n1"><data key="d3"><y:GraphMLReference ResourceKey="3"/></data></node></graph></graphml>',
        ].join("\n");
        const loaded = await importForStyles(createRegistry(), "graphml", new TextEncoder().encode(doc));
        expect(loaded.snapshot.nodeCount).toBe(2);
        expect(extractCounted(loaded)).toMatchInlineSnapshot(`
          {
            "edge": 0,
            "node": 25,
            "notes": [
              "W_STYLE_REFERENCE_CYCLE",
              "W_STYLE_UNRESOLVED",
            ],
            "rules": 3,
          }
        `);
    });
});

describe("a 10,000-key table with one key uncovered", () => {
    it("maps every covered key, leaves the uncovered element to the default, in counted linear work", () => {
        const n = 10_000;
        const hex = (i: number): string => `#${((i * 2654435761) % 0xffffff).toString(16).padStart(6, "0")}`;
        const map = Array.from({ length: n }, (_, i) => ({ v: `k${String(i)}`, vp: hex(i) }));
        const vps = {
            default: { node: { NODE_FILL_COLOR: "#89D0F5" } },
            nodeMapping: { NODE_FILL_COLOR: { type: "DISCRETE", definition: { attribute: "k", type: "string", map } } },
        };
        const keys = [...Array.from({ length: n }, (_, i) => `k${String(i)}`), "uncovered"];
        const loaded = inMemory(nodesWith("k", keys), cx2Styles(vps, "k"));
        const truth = styleTruth(loaded);
        expect(truth?.node?.fill?.[n]).toBe("#89d0f5");
        expect(truth?.node?.fill?.[1234]).toBe(hex(1234));
        const spent = extractCounted(loaded);
        expect(spent.node).toBeLessThan(40 * (n + 1));
        expect(spent).toMatchInlineSnapshot(`
          {
            "edge": 0,
            "node": 260027,
            "notes": [],
            "rules": 4,
          }
        `);
    });
});

describe("100,000 class tests in one selector", () => {
    it("matches them in one counted pass and plans the result in bound", async () => {
        const n = 2000;
        const doc = {
            elements: Array.from({ length: n }, (_, i) => ({
                data: { id: `n${String(i)}` },
                classes: `k${String(i % 500)}`,
            })),
            style: [
                {
                    selector: Array.from({ length: 100_000 }, (_, k) => `.k${String(k)}`).join(", "),
                    style: { width: 7 },
                },
            ],
        };
        const loaded = await loadCyjs(new TextEncoder().encode(JSON.stringify(doc)));
        expect(styleTruth(loaded)?.node?.width?.every((w) => w === 7)).toBe(true);
        const spent = extractCounted(loaded);
        expect(spent.node).toBeLessThan(20 * (n + 200_000));
        expect(spent).toMatchInlineSnapshot(`
          {
            "edge": 0,
            "node": 52000,
            "notes": [],
            "rules": 3,
          }
        `);
    });
});

describe("a 5,000-character value", () => {
    it("is noted as too long and never parsed", () => {
        const long = [`#${"a".repeat(4999)}`, "x".repeat(5000), `rgb(${" ".repeat(4995)})`];
        const values = [...long, ...Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? "red" : "blue"))];
        const loaded = inMemory(nodesWith("paint", values), () => ({
            dialect: "css",
            node: { fill: { data: "paint" } },
        }));
        const truth = styleTruth(loaded);
        expect(truth?.node?.fill?.slice(0, 4)).toEqual([null, null, null, "#ff0000"]);
        const budget = new StyleBudget();
        const ex = extractStyles(loaded.importer, loaded.snapshot, loaded.report, { budget });
        const note = ex?.styles.notes.find((x) => x.code === "W_STYLE_VALUE_TOO_LONG");
        expect(note?.elements).toEqual([0, 1, 2]);
        expect(extractCounted(loaded)).toMatchInlineSnapshot(`
          {
            "edge": 0,
            "node": 405,
            "notes": [
              "W_STYLE_VALUE_TOO_LONG",
            ],
            "rules": 2,
          }
        `);
    });
});

describe("__proto__ keys", () => {
    it("in a reader's property names, an attribute's name and its values, pollute nothing", () => {
        const values = [
            "__proto__",
            "constructor",
            "toString",
            ...Array.from({ length: 30 }, (_, i) => (i % 3 === 0 ? "#00ff00" : "#0000ff")),
        ];
        const raw = JSON.parse(
            '{"dialect":"css","node":{"__proto__":{"data":"__proto__"},"constructor":{"data":"__proto__"},"fill":{"data":"__proto__"}}}',
        ) as ReturnType<NonNullable<GraphImporter["styles"]>>;
        const loaded = inMemory(nodesWith("__proto__", values), () => raw);
        expect(styleTruth(loaded)?.node?.fill?.slice(0, 4)).toEqual([null, null, null, "#00ff00"]);
        expect(extractCounted(loaded)).toMatchInlineSnapshot(`
          {
            "edge": 0,
            "node": 723,
            "notes": [
              "W_STYLE_BAD_VALUE",
              "W_STYLE_NOT_CARRIED",
            ],
            "rules": 2,
          }
        `);
    });

    it("as the keys and the attribute of a Cytoscape mapping, pollute nothing", () => {
        const map = ["__proto__", "constructor", "toString", "valueOf", "hasOwnProperty"].map((v, i) => ({
            v,
            vp: `#0${String(i)}0000`,
        }));
        const vps = JSON.parse(
            JSON.stringify({
                default: { node: { NODE_FILL_COLOR: "#89D0F5", constructor: "#123456" } },
                nodeMapping: {
                    NODE_FILL_COLOR: { type: "DISCRETE", definition: { attribute: "__proto__", type: "string", map } },
                    toString: { type: "PASSTHROUGH", definition: { attribute: "__proto__" } },
                },
            }).replace('"constructor":"#123456"', '"constructor":"#123456","__proto__":{"polluted":true}'),
        ) as unknown;
        const values = Array.from(
            { length: 40 },
            (_, i) => ["__proto__", "constructor", "toString", "valueOf", "other"][i % 5],
        );
        const loaded = inMemory(nodesWith("__proto__", values), cx2Styles(vps, "__proto__"));
        const fill = styleTruth(loaded)?.node?.fill ?? [];
        expect(fill.slice(0, 5)).toEqual(["#000000", "#010000", "#020000", "#030000", "#89d0f5"]);
        expect(extractCounted(loaded)).toMatchInlineSnapshot(`
          {
            "edge": 0,
            "node": 526,
            "notes": [
              "W_STYLE_NOT_CARRIED",
            ],
            "rules": 4,
          }
        `);
    });
});
