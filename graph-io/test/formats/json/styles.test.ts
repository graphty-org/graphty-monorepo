/**
 * JSON styles: each dialect read as the program that draws it draws it (Cytoscape.js stylesheets, graphology keys as
 * sigma.js draws them, vis.js keys, options and groups, NetworkX's defaults), the files graph-io read wrongly before,
 * and styles written back into every dialect and read back as the same rules.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

import cytoscape from "cytoscape";
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import {
    cyjsRendered,
    type ExtractedStyles,
    resolveStyles,
    STYLE_BLOCK_NAME,
    StyleNotes,
    type StyleProperty,
    type StyleRule,
    type StyleTarget,
} from "../../../src/styles/internal.js";
import { editJsonNodeFill, replaceJsonBlock } from "../../styles/formats/json.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/json");
const GENERATED = join(CORPUS, "generated");
const CONFORMANCE = resolve(import.meta.dirname, "../../conformance/fixtures/json");

/**
 * A corpus or fixture file's bytes, decompressed when stored as `.gz`.
 * @param path - the file
 * @returns the bytes
 */
function bytesOf(path: string): Uint8Array {
    const raw = readFileSync(path);
    return new Uint8Array(path.endsWith(".gz") ? gunzipSync(raw) : raw);
}

/**
 * Imports a JSON document with its styles.
 * @param doc - the document, as text, bytes or a value
 * @returns the import result, with styles
 */
async function load(doc: string | Uint8Array | object) {
    const input = typeof doc === "string" || doc instanceof Uint8Array ? doc : JSON.stringify(doc);
    const result = await registry.importGraph(input, { format: "json", styles: true, errorLimit: Infinity });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

/**
 * Values of a property by node or edge index.
 * @param r - an import result with styles
 * @param target - nodes or edges
 * @param property - the property
 * @returns the values
 */
function values(r: Awaited<ReturnType<typeof load>>, target: StyleTarget, property: string): unknown[] {
    return [...resolveStyles(r.styles, target, property as StyleProperty, r.snapshot)];
}

/**
 * The rules as plain JSON with their members in key order, so two reads compare equal when the rules are the same.
 * @param ex - the styles
 * @returns the rules
 */
function rulesOf(ex: ExtractedStyles): unknown {
    const sort = (v: unknown): unknown => {
        if (Array.isArray(v)) {
            return v.map(sort);
        }
        if (v !== null && typeof v === "object") {
            return Object.fromEntries(
                Object.keys(v)
                    .sort()
                    .map((k) => [k, sort((v as Record<string, unknown>)[k])]),
            );
        }
        return v;
    };
    return sort(JSON.parse(JSON.stringify(ex.styles.rules)) as StyleRule[]);
}

describe("JSON files graph-io read wrongly before", () => {
    it("joins numeric Cytoscape.js endpoints with string node ids (karate: 34 nodes, not 68)", async () => {
        const { snapshot } = await load(bytesOf(join(CONFORMANCE, "networkx/karate.cytoscape.json")));
        expect(snapshot.nodeCount).toBe(34);
        expect(snapshot.edgeCount).toBe(78);
        // and the other way round: number ids named by text, a parent too
        const other = await load({
            elements: {
                nodes: [{ data: { id: 1 } }, { data: { id: 2, parent: "1" } }],
                edges: [{ data: { source: "1", target: "2" } }],
            },
        });
        expect(other.snapshot.nodeCount).toBe(2);
        expect(other.snapshot.edgeCount).toBe(1);
        expect(other.snapshot.nodes.value("parent", other.snapshot.ids.indexOf(2))).toBe(0);
    });

    it("gives Cytoscape.js elements without a data.id ids of their own, as Cytoscape.js does", async () => {
        const data = bytesOf(join(CORPUS, "cyjs-node-types-data.json"));
        expect((await load(data)).snapshot.nodeCount).toBe(26);
        const style = JSON.parse(readFileSync(join(CORPUS, "cyjs-node-types-cy-style.json"), "utf8")) as unknown;
        const r = await load({ elements: JSON.parse(new TextDecoder().decode(data)) as unknown, style });
        const types = Array.from({ length: r.snapshot.nodeCount }, (_v, i) => r.snapshot.nodes.value("type", i));
        const shapes = values(r, "node", "shape");
        expect(shapes[types.indexOf("triangle")]).toBe("triangle");
        expect(shapes[types.indexOf("diamond")]).toBe("diamond");
        expect(values(r, "node", "width").every((w) => w === 40)).toBe(true);
    });

    it("reads Gephi's JSON export for sigma.js: its nodes, their attributes and their colors", async () => {
        const r = await load(bytesOf(join(CORPUS, "vis-WorldCup2014.json.gz")));
        expect(r.snapshot.nodeCount).toBe(736);
        expect(r.snapshot.nodes.has("Modularity Class")).toBe(true);
        expect(r.snapshot.nodes.has("color#element")).toBe(false);
        expect(r.styles.styles.source.tool).toBe("sigma");
        const byClass = r.styles.styles.rules.filter(
            (rule) => rule.target === "node" && rule.map?.fill?.kind === "discrete",
        );
        expect(byClass.map((rule) => rule.map?.fill && "by" in rule.map.fill && rule.map.fill.by)).toEqual([
            { data: "Modularity Class" },
        ]);
        const i = r.snapshot.ids.indexOf("268");
        expect(values(r, "node", "fill")[i]).toBe("#e543a4");
    });
});

describe("JSON styles: reading", () => {
    it("applies a Cytoscape.js stylesheet over Cytoscape.js's defaults, with an element's own style on top", async () => {
        const r = await load({
            elements: [
                { data: { id: "a" } },
                { data: { id: "b" }, classes: "big" },
                { data: { id: "c" }, style: { "background-color": "blue" } },
                { data: { id: "e", source: "a", target: "b" } },
            ],
            style: [
                { selector: "node", style: { "background-color": "red" } },
                { selector: ".big", style: { width: 50 } },
            ],
        });
        expect(r.styles.styles.source).toEqual({ format: "json", dialect: "cytoscape-js", tool: "cytoscape-js" });
        expect(values(r, "node", "fill")).toEqual(["#ff0000", "#ff0000", "#0000ff"]);
        expect(values(r, "node", "width")).toEqual([30, 50, 30]);
        expect(values(r, "edge", "width")).toEqual([3]);
    });

    it("reads a stylesheet written as text the same as one written as an array", async () => {
        const elements = [{ data: { id: "a", w: 12 } }, { data: { id: "b", w: 30 } }];
        const asText = await load({ elements, style: "node { width: data(w); background-color: #123456; }" });
        const asArray = await load({
            elements,
            style: [{ selector: "node", style: { width: "data(w)", "background-color": "#123456" } }],
        });
        expect(values(asText, "node", "width")).toEqual([12, 30]);
        expect(rulesOf(asText.styles)).toEqual(rulesOf(asArray.styles));
    });

    it("gives Cytoscape desktop's export without a stylesheet Cytoscape desktop's default style", async () => {
        const r = await load(bytesOf(join(CORPUS, "cyjs-genemania-export.json")));
        expect(r.styles.styles.source.tool).toBe("cytoscape");
        expect(new Set(values(r, "node", "fill"))).toEqual(new Set(["#89d0f5"]));
        expect(new Set(values(r, "node", "shape"))).toEqual(new Set(["round-rectangle"]));
    });

    it("reads graphology keys as sigma.js draws them, with sigma's defaults", async () => {
        const r = await load({
            attributes: {},
            options: { type: "directed" },
            nodes: [
                { key: "a", attributes: { color: "rgba(255,0,0,0.5)", size: 4, label: "A" } },
                { key: "b", attributes: { hidden: true } },
            ],
            edges: [{ source: "a", target: "b", attributes: { color: "#00f", size: 2 } }],
        });
        expect(r.styles.styles.source.tool).toBe("sigma");
        expect(r.styles.styles.units.length).toBe("relative");
        expect(values(r, "node", "fill")).toEqual(["#ff0000", "#999999"]);
        expect(values(r, "node", "fillOpacity")[0]).toBe(0.5);
        expect(values(r, "node", "width")).toEqual([4, 2]);
        expect(values(r, "node", "label")[0]).toBe("A");
        expect(values(r, "node", "visible")[1]).toBe(false);
        expect(values(r, "edge", "color")).toEqual(["#0000ff"]);
        expect(values(r, "edge", "width")).toEqual([2]);
    });

    it("reads vis.js keys over its groups and options, with vis-network's defaults, palette and edge colors", async () => {
        const r = await load({
            nodes: [
                { id: "a", group: "g1" },
                { id: "b", group: "g2" },
                { id: "c", color: { background: "#00ff00" } },
                { id: "d" },
            ],
            edges: [
                { from: "a", to: "b" },
                { from: "b", to: "c", color: "blue" },
                { from: "c", to: "d", color: { inherit: "to" } },
            ],
            options: { nodes: { shape: "dot", size: 10 }, edges: { width: 2 }, groups: { g1: { color: "#ff0000" } } },
        });
        expect(r.styles.styles.source.tool).toBe("vis-network");
        // g1 as the file defines it; g2 from vis-network's palette; the rest vis-network's default
        expect(values(r, "node", "fill")).toEqual(["#ff0000", "#97c2fc", "#00ff00", "#97c2fc"]);
        // a text color's border is vis-network's darker shade of it
        expect(values(r, "node", "borderColor")).toEqual(["#cc0000", "#2b7ce9", "#2b7ce9", "#2b7ce9"]);
        expect(values(r, "node", "width")).toEqual([10, 10, 10, 10]);
        expect(values(r, "node", "shape")).toEqual(["ellipse", "ellipse", "ellipse", "ellipse"]);
        // an edge without a color of its own takes its source node's border (its target's under inherit "to")
        expect(values(r, "edge", "color")).toEqual(["#cc0000", "#0000ff", "#2b7ce9"]);
        expect(values(r, "edge", "width")).toEqual([2, 2, 2]);
        const { rules } = r.styles.styles;
        expect(rules.find((x) => x.facts?.reason === "SOURCE_NODE_COLOR")).toMatchObject({ origin: "tool" });
        expect(rules.filter((x) => x.role === "group" && x.target === "node").map((x) => x.origin)).toEqual([
            "declared",
            "tool",
        ]);
        expect(rules.find((x) => x.id === "node.vis.defaults")?.set).toMatchObject({ shape: "ellipse", width: 10 });
    });

    it("gives NetworkX's node-link NetworkX's drawing defaults, and d3's bare shape none", async () => {
        const nx = await load({
            directed: true,
            multigraph: false,
            graph: {},
            nodes: [{ id: 1 }, { id: 2 }],
            links: [{ source: 1, target: 2 }],
        });
        expect(nx.styles.styles.source.tool).toBe("networkx");
        expect(values(nx, "node", "fill")).toEqual(["#1f78b4", "#1f78b4"]);
        expect(values(nx, "edge", "targetArrow")).toEqual(["triangle"]);
        const d3 = await registry.importGraph(JSON.stringify({ nodes: [{ id: 1 }], links: [] }), {
            format: "json",
            styles: true,
        });
        expect(d3.styles).toBeNull();
    });
});

/** A small vis.js document with groups, options and per-node keys, the styles every writer below writes. */
const VIS_DOC = {
    nodes: [
        { id: "a", group: "g1", label: "Alpha" },
        { id: "b", group: "g2", shape: "box" },
        { id: "c", color: { background: "#00ff00", border: "#000000" }, size: 7 },
        { id: "d", hidden: true },
    ],
    edges: [
        { from: "a", to: "b", dashes: true },
        { from: "b", to: "c", color: "blue", arrows: "to" },
        { from: "c", to: "d", width: 4 },
    ],
    options: { nodes: { shape: "dot", size: 10 }, groups: { g1: { color: "#ff0000" } } },
};

describe("JSON styles: writing", () => {
    it.each(["cytoscape", "graphology", "vis", "node-link", "d3", "jgf"] as const)(
        "writes %s that reads back as the same rules and values",
        async (dialect) => {
            const r = await load(VIS_DOC);
            const text = await registry.exportGraphToString(r.snapshot, "json", { styles: r.styles, dialect });
            const back = await load(text);
            expect(back.styles.styles.source.tool).toBe("graphty");
            expect(rulesOf(back.styles)).toEqual(rulesOf(r.styles));
            for (const [target, property] of [
                ["node", "fill"],
                ["node", "width"],
                ["node", "shape"],
                ["node", "visible"],
                ["edge", "color"],
                ["edge", "lineStyle"],
            ] as const) {
                expect(values(back, target, property)).toEqual(values(r, target, property));
            }
            // written again, the same bytes
            const again = await registry.exportGraphToString(back.snapshot, "json", {
                styles: back.styles,
                dialect,
            });
            expect(
                await registry.exportGraphToString((await load(again)).snapshot, "json", {
                    styles: (await load(again)).styles,
                    dialect,
                }),
            ).toBe(again);
        },
    );

    it("writes Cytoscape.js's stylesheet, graphology's and vis.js's keys, and the block where each dialect keeps it", async () => {
        const r = await load(VIS_DOC);
        const write = async (dialect: string): Promise<Record<string, unknown>> =>
            JSON.parse(await registry.exportGraphToString(r.snapshot, "json", { styles: r.styles, dialect })) as Record<
                string,
                unknown
            >;
        const cy = await write("cytoscape");
        expect(Array.isArray(cy.style)).toBe(true);
        expect(typeof cy[STYLE_BLOCK_NAME]).toBe("string");
        const g = await write("graphology");
        expect((g.attributes as Record<string, unknown>)[STYLE_BLOCK_NAME]).toEqual(expect.any(String));
        const gNodes = g.nodes as { attributes: Record<string, unknown> }[];
        expect(gNodes[0].attributes.color).toBe("#ff0000");
        expect(gNodes[3].attributes.hidden).toBe(true);
        const v = await write("vis");
        expect(typeof v[STYLE_BLOCK_NAME]).toBe("string");
        const vNodes = v.nodes as Record<string, unknown>[];
        expect(vNodes[2]).toMatchObject({ color: { background: "#00ff00", border: "#000000" }, size: 7, shape: "dot" });
        const nl = await write("node-link");
        expect((nl.graph as Record<string, unknown>)[STYLE_BLOCK_NAME]).toEqual(expect.any(String));
    });

    it("reports what each dialect cannot hold before anything is written", async () => {
        const r = await load(VIS_DOC);
        const codes = (dialect: string, property?: string): string[] =>
            registry
                .checkExport(r.snapshot, "json", { styles: r.styles, dialect })
                .filter((n) => property === undefined || n.style?.property === property)
                .map((n) => n.code);
        expect(codes("node-link", "fill")).toEqual(["W_STYLE_NOT_WRITTEN"]);
        expect(codes("cytoscape", "fill")).toEqual([]);
        expect(codes("vis", "fill")).toEqual([]);
        expect(codes("graphology", "shape")).toEqual(["W_STYLE_NOT_WRITTEN"]);
        expect(codes("graphology", "fill")).toEqual([]);
        expect(codes("obographs")).toContain("W_STYLE_RULES_NOT_KEPT");
        expect(codes("node-link")).not.toContain("W_STYLE_RULES_NOT_KEPT");
        // a box sized by a number: vis-network sizes a box by its label
        expect(codes("vis", "width")).toContain("W_STYLE_APPROXIMATED");
        // a data column named like a style key holds what graphty draws once written
        expect(codes("graphology")).toContain("W_JSON_STYLE_KEY_REPLACED");
    });

    it("reports that JGF cannot keep the rules of a graph whose node ids JGF changes", async () => {
        const r = await load({
            directed: true,
            multigraph: false,
            graph: {},
            nodes: [{ id: 2 }, { id: 1 }],
            links: [],
        });
        const notes = registry.checkExport(r.snapshot, "json", { styles: r.styles, dialect: "jgf" });
        expect(notes.map((n) => n.code)).toContain("W_STYLE_RULES_NOT_KEPT");
    });

    it("writes Cytoscape.js JSON that Cytoscape.js draws as graph-io resolves it", async () => {
        const r = await load(bytesOf(join(CORPUS, "graphology-eurosis.json.gz")));
        const doc = JSON.parse(
            await registry.exportGraphToString(r.snapshot, "json", { styles: r.styles, dialect: "cytoscape" }),
        ) as { elements: unknown; style: unknown };
        const cy = cytoscape({
            headless: true,
            styleEnabled: true,
            elements: doc.elements as never,
            style: doc.style as never,
        });
        const differences: string[] = [];
        for (const [target, names] of [
            ["node", ["background-color", "width", "height", "shape", "label"]],
            ["edge", ["line-color", "width"]],
        ] as const) {
            const els = target === "node" ? cy.nodes() : cy.edges();
            expect(els.length).toBe(target === "node" ? r.snapshot.nodeCount : r.snapshot.edgeCount);
            for (const name of names) {
                const site = { notes: new StyleNotes(), target, property: name };
                const property = cyjsRenderedProperty(target, name);
                const want = values(r, target, property);
                els.forEach((ele, i) => {
                    const got = cyjsRendered(target, name, ele.style(name), site);
                    // Cytoscape.js trims a label; the export reports it (W_STYLE_APPROXIMATED)
                    const raw = want[i];
                    const w = typeof raw === "string" && name === "label" ? raw.trim() : raw;
                    if (w !== null && got !== w && differences.length < 10) {
                        differences.push(
                            `${target} ${String(i)} ${name}: Cytoscape.js ${JSON.stringify(got)}, graph-io ${JSON.stringify(w)}`,
                        );
                    }
                });
            }
        }
        expect(differences).toEqual([]);
        const notes = registry.checkExport(r.snapshot, "json", { styles: r.styles, dialect: "cytoscape" });
        expect(notes.some((n) => n.code === "W_STYLE_APPROXIMATED" && n.style?.property === "label")).toBe(true);
    });
});

/**
 * The neutral property a Cytoscape.js property draws.
 * @param target - nodes or edges
 * @param name - the Cytoscape.js property
 * @returns the neutral property
 */
function cyjsRenderedProperty(target: StyleTarget, name: string): string {
    const table: Record<string, string> = {
        "background-color": "fill",
        "line-color": "color",
        width: "width",
        height: "height",
        shape: "shape",
        label: "label",
    };
    return target === "edge" && name === "width" ? "width" : table[name];
}

/** The block-tamper fixtures: files graphty wrote, then edited outside as design 10.7 items 4 and 5 describe. */
async function tamperFixtures(): Promise<Record<string, Uint8Array>> {
    const out: Record<string, Uint8Array> = {};
    for (const dialect of ["cytoscape", "graphology"] as const) {
        const base = await load(VIS_DOC);
        const written = await registry.exportGraphToBytes(base.snapshot, "json", { styles: base.styles, dialect });
        const doc = JSON.parse(new TextDecoder().decode(written)) as Record<string, unknown>;
        if (dialect === "cytoscape") {
            (doc.elements as { nodes: unknown[] }).nodes.push({ data: { id: "added" } });
        } else {
            (doc.nodes as unknown[]).push({ key: "added" });
        }
        out[`${dialect}-graphty-written.json`] = written;
        out[`${dialect}-tamper-native-edited.json`] = editJsonNodeFill(written) ?? new Uint8Array();
        out[`${dialect}-tamper-block-truncated.json`] = replaceJsonBlock(written, (block) =>
            block.slice(0, Math.floor(block.length / 2)),
        );
        out[`${dialect}-tamper-node-added.json`] = new TextEncoder().encode(JSON.stringify(doc));
    }
    return out;
}

describe("JSON block tamper fixtures", () => {
    it("are the edits they say they are (UPDATE_JSON_TAMPER=1 writes them again)", async () => {
        for (const [name, bytes] of Object.entries(await tamperFixtures())) {
            const path = join(GENERATED, name);
            if (process.env.UPDATE_JSON_TAMPER === "1") {
                writeFileSync(path, bytes);
            }
            expect(new TextDecoder().decode(readFileSync(path))).toBe(new TextDecoder().decode(bytes));
        }
    });

    it.each(["cytoscape", "graphology"])(
        "bring an outside edit of %s back as one exception over the same rules",
        async (dialect) => {
            const unedited = await load(bytesOf(join(GENERATED, `${dialect}-graphty-written.json`)));
            const edited = await load(bytesOf(join(GENERATED, `${dialect}-tamper-native-edited.json`)));
            const below = (ex: ExtractedStyles): unknown =>
                (rulesOf(ex) as StyleRule[]).filter((r) => r.role !== "exceptions");
            expect(below(edited.styles)).toEqual(below(unedited.styles));
            const excepted = (ex: ExtractedStyles): unknown[] =>
                [...ex.columns.node]
                    .filter(([key]) => key.startsWith("exceptions."))
                    .flatMap(([, col]) => col.filter((v) => v !== null));
            const added = excepted(edited.styles).slice(excepted(unedited.styles).length);
            expect(added).toEqual(["#123456"]);
        },
    );

    it.each(["cytoscape", "graphology"])(
        "ignore a truncated %s block and a block for another graph with a note",
        async (dialect) => {
            for (const [file, reason] of [
                [`${dialect}-tamper-block-truncated.json`, "NOT_JSON"],
                [`${dialect}-tamper-node-added.json`, "FINGERPRINT"],
            ] as const) {
                const { styles } = await load(bytesOf(join(GENERATED, file)));
                const note = styles.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
                expect(note?.params.samples).toEqual([reason]);
                expect(styles.styles.source.tool).toBe(dialect === "cytoscape" ? "cytoscape-js" : "sigma");
            }
        },
    );
});
