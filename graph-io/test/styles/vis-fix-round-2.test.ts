/**
 * vis-network settings the specimen sheets showed graph-io still dropping or misreading after the first fix round:
 * each read the way vis-network 9.1.9 draws it (`graph-io/test/fidelity/specimens/vis-network/`).
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { toolDefaults } from "../../src/styles/defaults.js";
import { resolveStyles, type StyleProperty, type StyleTarget } from "../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Imports a vis-network document with its styles.
 * @param doc - the document
 * @returns the import result, with styles
 */
async function load(doc: object) {
    const result = await registry.importGraph(JSON.stringify(doc), { format: "json", styles: true });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

/**
 * The value of a property for one node or edge.
 * @param r - an import result with styles
 * @param target - nodes or edges
 * @param property - the property
 * @param i - the element's index
 * @returns the value
 */
function value(r: Awaited<ReturnType<typeof load>>, target: StyleTarget, property: string, i: number): unknown {
    return resolveStyles(r.styles, target, property as StyleProperty, r.snapshot)[i];
}

describe("vis-network groups", () => {
    it("keeps vis-network's default colors on a node with no group when the rules are folded", async () => {
        // 20 groups the file does not define take 20 palette rules, over the 15-rule cap: the tool's defaults rule
        // is folded into the per-element copy, and a node with no group must keep vis-network's default colors
        const nodes = [
            { id: "plain", x: 0, y: 0 },
            ...Array.from({ length: 20 }, (_v, k) => ({
                id: `n${String(k)}`,
                x: 10 * k,
                y: 50,
                group: `g${String(k)}`,
            })),
        ];
        const r = await load({ nodes, edges: [], options: { physics: false } });
        expect(value(r, "node", "fill", 0)).toBe("#97c2fc");
        expect(value(r, "node", "borderColor", 0)).toBe("#2b7ce9");
        expect(value(r, "node", "shape", 0)).toBe("ellipse");
        expect(value(r, "node", "fill", 1)).toBe("#97c2fc");
        expect(value(r, "node", "fill", 2)).toBe("#ffff00");
    });

    it("takes none of its group's colors for a node with a color of its own", async () => {
        const r = await load({
            nodes: [
                { id: "own", x: 0, y: 0, group: "g", color: { background: "#c8c8c8" } },
                { id: "member", x: 50, y: 0, group: "g" },
                { id: "undefined-group", x: 100, y: 0, group: "nowhere", color: { background: "#c8c8c8" } },
            ],
            edges: [],
            options: { physics: false, groups: { g: { borderWidth: 4, color: { border: "#d62728" } } } },
        });
        // vis-network merges a group's option only where the node sets none of its own (Node.updateGroupOptions)
        expect(value(r, "node", "borderColor", 0)).toBe("#2b7ce9");
        expect(value(r, "node", "fill", 0)).toBe("#c8c8c8");
        expect(value(r, "node", "borderWidth", 0)).toBe(4);
        expect(value(r, "node", "borderColor", 1)).toBe("#d62728");
        // a group the file does not define gives its palette color only to a node with no color of its own
        expect(value(r, "node", "borderColor", 2)).toBe("#2b7ce9");
    });
});

describe("vis-network node colors and labels", () => {
    it("fades a border by its color's own alpha", async () => {
        const r = await load({
            nodes: [
                { id: "rgba", x: 0, y: 0, color: "rgba(214, 39, 40, 0.5)" },
                { id: "hex8", x: 50, y: 0, color: { background: "#1f77b480", border: "#1f77b480" } },
            ],
            edges: [],
            options: { physics: false },
        });
        expect(value(r, "node", "borderOpacity", 0)).toBe(0.5);
        expect(value(r, "node", "borderOpacity", 1)).toBeCloseTo(0.5, 2);
    });

    it("strokes a label white when the file gives a stroke width and no color", async () => {
        const r = await load({
            nodes: [
                { id: "a", x: 0, y: 0, label: "A", font: { strokeWidth: 3 } },
                { id: "b", x: 50, y: 0, label: "B", font: { strokeWidth: 3, strokeColor: "#ff0000" } },
            ],
            edges: [],
            options: { physics: false },
        });
        expect(value(r, "node", "labelOutlineColor", 0)).toBe("#ffffff");
        expect(value(r, "node", "labelOutlineWidth", 0)).toBe(3);
        expect(value(r, "node", "labelOutlineColor", 1)).toBe("#ff0000");
    });

    it("draws a label's background box round its words alone", async () => {
        const r = await load({
            nodes: [{ id: "a", x: 0, y: 0, label: "Back", font: { background: "#ffd700" } }],
            edges: [],
            options: { physics: false },
        });
        expect(value(r, "node", "labelBackground", 0)).toBe("#ffd700");
        expect([value(r, "node", "labelPadding", 0), value(r, "node", "labelLineHeight", 0)]).toEqual([0, 1]);
    });

    it("hides a label under scaling.label.drawThreshold - 1 screen pixels", async () => {
        const r = await load({
            nodes: [{ id: "a", x: 0, y: 0, label: "A", scaling: { label: { drawThreshold: 12 } } }],
            edges: [{ from: "a", to: "a", label: "E", scaling: { label: { drawThreshold: 9 } } }],
        });
        expect(value(r, "node", "labelMinScreenSize", 0)).toBe(11);
        expect(value(r, "edge", "labelMinScreenSize", 0)).toBe(8);
    });

    it("moves a label by font.vadjust and a box's label by its uneven margins, and aligns its lines", async () => {
        const r = await load({
            nodes: [
                { id: "down", x: 0, y: 0, shape: "dot", label: "D", font: { vadjust: 12 } },
                {
                    id: "sides",
                    x: 50,
                    y: 0,
                    shape: "box",
                    label: "M",
                    margin: { top: 2, right: 20, bottom: 12, left: 4 },
                },
                { id: "right", x: 100, y: 0, shape: "box", label: "wide line\nab", font: { align: "right" } },
                { id: "left", x: 150, y: 0, shape: "box", label: "wide line\nab", font: { align: "left" } },
                { id: "hex", x: 200, y: 0, shape: "hexagon", size: 10, label: "H", font: { vadjust: -3 } },
            ],
            edges: [],
            options: { physics: false },
        });
        // the vadjust, below the 2 + 14 / 6 a label under a node sized by `size` hangs lower than a bottom label
        expect(value(r, "node", "labelOffsetY", 0)).toBeCloseTo(12 + 2 + 14 / 6, 9);
        // Box.draw: the label's box starts its left and top margins in from the node's corner
        expect(value(r, "node", "labelOffsetX", 1)).toBe(-8);
        expect(value(r, "node", "labelOffsetY", 1)).toBe(-5);
        expect(value(r, "node", "labelTextAlign", 2)).toBe("right");
        expect(value(r, "node", "labelTextAlign", 3)).toBe("left");
        // a hexagon's own label place, then the vadjust below it
        expect(value(r, "node", "labelOffsetY", 4)).toBeCloseTo(((2 - Math.sqrt(3)) * 10) / 2 - 3 + 2 + 14 / 6, 6);
    });
});

describe("vis-network multi-font labels", () => {
    it("reads each run's font, its modifier's own options over the label's", async () => {
        const r = await load({
            nodes: [
                {
                    id: "a",
                    x: 0,
                    y: 0,
                    label: "<b>B</b> <i>I</i> <code>M</code>",
                    font: { multi: "html", size: 10, face: "DejaVu Sans", bold: { color: "#ff0000" } },
                },
                { id: "b", x: 50, y: 0, label: "plain <b>", font: { multi: false } },
            ],
            edges: [],
            options: { physics: false },
        });
        expect(value(r, "node", "label", 0)).toBe("B I M");
        expect(JSON.parse(value(r, "node", "labelRuns", 0) as string)).toEqual([
            { text: "B", weight: "bold", color: "#ff0000" },
            { text: " " },
            { text: "I", italic: true },
            { text: " " },
            // mono is 15 px monospace, drawn 2 px lower, unless the file says otherwise
            { text: "M", font: "monospace", size: 15, shift: 2 },
        ]);
        expect(value(r, "node", "labelRuns", 1)).toBe(null);
    });

    it("draws a modifier's own vadjust that much lower, and sets runs where vis-network's text baseline puts them", async () => {
        const r = await load({
            nodes: [
                // below a dot: drawn with the hanging baseline, its line as tall as its 15 px run
                {
                    id: "a",
                    x: 0,
                    y: 0,
                    shape: "dot",
                    label: "<b>B</b> <code>M</code>",
                    font: { multi: "html", size: 10, vadjust: 1, bold: { vadjust: 6 } },
                },
                // inside a box: drawn with the middle baseline
                {
                    id: "b",
                    x: 50,
                    y: 0,
                    shape: "box",
                    label: "<b>B</b> x",
                    font: { multi: true, bold: { vadjust: -3 } },
                },
            ],
            edges: [
                { from: "a", to: "b", label: "<i>I</i> y", font: { multi: true, align: "top", ital: { size: 20 } } },
            ],
            options: { physics: false },
        });
        expect(JSON.parse(value(r, "node", "labelRuns", 0) as string)).toEqual([
            { text: "B", weight: "bold", shift: 5 },
            { text: " " },
            { text: "M", font: "monospace", size: 15, shift: 1 },
        ]);
        expect(value(r, "node", "labelRunAlign", 0)).toBe("hanging");
        // half of the 5 px its line is taller than one font size, under the label's own vadjust of 1, and the 2 + 10 / 6
        // a label under a node sized by `size` hangs lower than a bottom label
        expect(value(r, "node", "labelOffsetY", 0)).toBeCloseTo(3.5 + 2 + 10 / 6, 9);
        expect(JSON.parse(value(r, "node", "labelRuns", 1) as string)).toEqual([
            { text: "B", weight: "bold", shift: -3 },
            { text: " x" },
        ]);
        expect(value(r, "node", "labelRunAlign", 1)).toBe("middle");
        expect(value(r, "edge", "labelRunAlign", 0)).toBe("baseline");
    });
});

describe("vis-network icon nodes", () => {
    it("draws an icon node as its glyph alone, with no body", async () => {
        const r = await load({
            nodes: [{ id: "i", x: 0, y: 0, shape: "icon", color: "#c8c8c8", icon: { code: "A", color: "#1f77b4" } }],
            edges: [],
            options: { physics: false },
        });
        expect(value(r, "node", "shape", 0)).toBe("none");
        expect(value(r, "node", "glyph", 0)).toBe("A");
        expect(value(r, "node", "glyphColor", 0)).toBe("#1f77b4");
    });
});

describe("vis-network arrowheads", () => {
    it("draws a circle arrow 0.8 of the arrow's length across (vis-network's Circle: radius 0.4 of it)", () => {
        expect(toolDefaults("vis-network")?.arrowhead?.shapes?.circle).toEqual({ length: 0.8, aspect: 1 });
    });
});
