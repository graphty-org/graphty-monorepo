/**
 * A file's styles into a live Cytoscape core and a core's styles out to a file: graphtyImport and graphtyExport with
 * `styles: true`.
 */

import type { LossNote } from "@graphty/graph-io";
import cytoscape from "cytoscape";
import { describe, expect, it } from "vitest";

import graphtyCytoscape from "../src/index";
import type { ExportFormat } from "../src/io";

cytoscape.use(graphtyCytoscape);

const core = (options: cytoscape.CytoscapeOptions = {}): cytoscape.Core =>
    cytoscape({ headless: true, styleEnabled: true, layout: { name: "preset" }, ...options });

/** A GEXF as Gephi writes it: a color and a size per node. */
const gephi = (prefix: string, colors: readonly [number, number, number][]): string =>
    `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
<meta><creator>Gephi 0.10.1</creator></meta>
<graph defaultedgetype="undirected"><nodes>
${colors
    .map(
        ([r, g, b], i) =>
            `<node id="${prefix}${String(i)}" label="${prefix}${String(i)}"><viz:size value="${String(10 + i)}"/>` +
            `<viz:color r="${String(r)}" g="${String(g)}" b="${String(b)}"/><viz:position x="${String(i * 10)}" y="0" z="0"/></node>`,
    )
    .join("\n")}
</nodes><edges><edge id="${prefix}e" source="${prefix}0" target="${prefix}1"/></edges></graph></gexf>`;

const rgb = ([r, g, b]: readonly [number, number, number]): string => `rgb(${String(r)},${String(g)},${String(b)})`;

const COLORS: [number, number, number][] = [
    [255, 0, 0],
    [0, 128, 0],
    [0, 0, 255],
];

describe("graphtyImport with styles", () => {
    it("draws each node of a Gephi GEXF in its viz:color", async () => {
        const cy = core();
        const r = await cy.graphtyImport(gephi("n", COLORS), "gexf", { styles: true, applyStyles: true });
        expect(r.stylesheet?.length).toBeGreaterThan(0);
        COLORS.forEach((c, i) => {
            expect(cy.$id(`n${String(i)}`).style("background-color")).toBe(rgb(c));
        });
        cy.destroy();
    });

    it("returns the stylesheet without drawing it unless applyStyles is set", async () => {
        const cy = core();
        const r = await cy.graphtyImport(gephi("n", COLORS), "gexf", { styles: true });
        expect(r.stylesheet?.length).toBeGreaterThan(0);
        expect(cy.$id("n0").data("graphty_import")).toBeTypeOf("string");
        expect(cy.$id("n0").style("background-color")).not.toBe(rgb(COLORS[0]));
        cy.destroy();
    });

    it("keeps each file's colors on its own nodes when two files go into one core", async () => {
        const cy = core();
        const other: [number, number, number][] = [
            [10, 20, 30],
            [40, 50, 60],
        ];
        await cy.graphtyImport(gephi("a", COLORS), "gexf", { styles: true, applyStyles: true });
        await cy.graphtyImport(gephi("b", other), "gexf", { styles: true, applyStyles: true });
        COLORS.forEach((c, i) => {
            expect(cy.$id(`a${String(i)}`).style("background-color")).toBe(rgb(c));
        });
        other.forEach((c, i) => {
            expect(cy.$id(`b${String(i)}`).style("background-color")).toBe(rgb(c));
        });
        expect(cy.$id("a0").data("graphty_import")).not.toBe(cy.$id("b0").data("graphty_import"));
        cy.destroy();
    });

    it("leaves the elements and the report as they were without styles", async () => {
        const plain = core();
        const r = await plain.graphtyImport(gephi("n", COLORS), "gexf");
        expect(r.stylesheet).toBeUndefined();
        expect(plain.$id("n0").data("graphty_import")).toBeUndefined();
        expect(Object.keys(plain.$id("n0").data()).some((k) => k.startsWith("graphty_style"))).toBe(false);
        // the color stays where graph-io puts it, as channels, never turned into a CSS color
        expect(typeof plain.$id("n0").data("color")).not.toBe("string");
        plain.destroy();
    });
});

/** A core styled three ways: a class rule, a mapData() ramp and a data() binding. */
const styled = (): cytoscape.Core =>
    core({
        elements: [
            { data: { id: "a", w: 0, fill: "#112233" }, classes: "hub", position: { x: 0, y: 0 } },
            { data: { id: "b", w: 5, fill: "#445566" }, position: { x: 10, y: 0 } },
            { data: { id: "c", w: 10, fill: "#778899" }, position: { x: 20, y: 0 } },
            { data: { id: "ab", source: "a", target: "b" } },
            { data: { id: "bc", source: "b", target: "c" } },
        ],
        style: [
            { selector: "node", style: { "background-color": "data(fill)", width: "mapData(w, 0, 10, 20, 60)" } },
            { selector: ".hub", style: { "background-color": "#ff0000", shape: "diamond" } },
            { selector: "edge", style: { "line-color": "#00aa00", width: 3 } },
        ],
    });

const drawn = (cy: cytoscape.Core): Record<string, string[]> => {
    const out: Record<string, string[]> = {};
    for (const n of cy.nodes().sort((x, y) => x.id().localeCompare(y.id()))) {
        out[n.id()] = [n.style("background-color"), n.style("width"), n.style("shape")];
    }
    out.edges = cy.edges().map((e) => `${e.style("line-color")} ${e.style("width")}`);
    return out;
};

describe("graphtyExport with styles", () => {
    it.each(["json", "gexf", "graphml", "cx2"] as const)(
        "writes a class rule, a mapData() rule and a data() rule to %s so an import draws the same",
        async (format: ExportFormat) => {
            const cy = styled();
            const text = await cy.graphtyExport(format, { styles: true });
            const back = core();
            await back.graphtyImport(text, format, { styles: true, applyStyles: true });
            expect(drawn(back)).toEqual(drawn(cy));
            cy.destroy();
            back.destroy();
        },
    );

    it("writes a function-valued property per element and says it was flattened", async () => {
        const cy = core({
            elements: [{ data: { id: "a", k: 1 } }, { data: { id: "b", k: 2 } }, { data: { id: "c", k: 3 } }],
            style: [{ selector: "node", style: { width: (n: cytoscape.NodeSingular) => 10 * Number(n.data("k")) } }],
        });
        let notes: readonly LossNote[] = [];
        const text = await cy.graphtyExport("json", {
            styles: true,
            onLoss: (n) => {
                notes = n;
            },
        });
        const flat = notes.find((n) => n.code === "W_STYLE_LAYER_FLATTENED");
        expect(flat?.message).toBeTypeOf("string");
        expect(flat?.style).toEqual({ target: "node", property: "width" });
        const back = core();
        await back.graphtyImport(text, "json", { styles: true, applyStyles: true });
        expect(back.nodes().map((n) => n.style("width"))).toEqual(["10px", "20px", "30px"]);
        cy.destroy();
        back.destroy();
    });

    it("reports the styles CSV cannot hold", async () => {
        const cy = styled();
        let notes: readonly LossNote[] = [];
        await cy.graphtyExport("csv", {
            styles: true,
            onLoss: (n) => {
                notes = n;
            },
        });
        const codes = new Set(notes.map((n) => n.code));
        expect(codes.has("W_STYLE_NOT_WRITTEN")).toBe(true);
        expect(codes.has("W_STYLE_RULES_NOT_KEPT")).toBe(true);
        cy.destroy();
    });

    it("writes the same file without styles, and says the stylesheet was not written", async () => {
        const plain = core({ elements: styled().elements().jsons() as never });
        const cy = styled();
        expect(await cy.graphtyExport("gexf")).toBe(await plain.graphtyExport("gexf"));
        const heard: string[] = [];
        await cy.graphtyExport("gexf", { onLoss: (n) => heard.push(...n.map((x) => x.code)) });
        expect(heard).toContain("W_STYLES_NOT_EXPORTED");
        const quiet: string[] = [];
        await plain.graphtyExport("gexf", { onLoss: (n) => quiet.push(...n.map((x) => x.code)) });
        expect(quiet).not.toContain("W_STYLES_NOT_EXPORTED");
        cy.destroy();
        plain.destroy();
    });
});
