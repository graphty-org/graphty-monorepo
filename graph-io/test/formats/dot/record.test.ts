/**
 * Graphviz record shapes: the fields' dividers and text lines where Graphviz 14.1.2 draws them
 * (graph-io/test/fidelity/oracles/dot-specimen-node-shapes-p2.svg, -p3.svg: 80 x 40 point fixed-size records, 10 point
 * DejaVu Sans).
 */

import { describe, expect, it } from "vitest";

import { layoutRecord, textWidth } from "../../../src/formats/dot/record.js";
import { createRegistry } from "../../../src/registry.js";
import { resolveStyles, type StyleProperty } from "../../../src/styles/index.js";

const same = (line: string): string => line;

/**
 * Lays a fixed 80 x 40 record out at 10 points.
 * @param label - the record label
 * @param lr - whether the top level runs left to right
 * @returns the layout
 */
function record(label: string, lr = true): ReturnType<typeof layoutRecord> {
    return layoutRecord(label, lr, 80, 40, true, 10, same);
}

describe("Graphviz record layout", () => {
    it("shares a fixed record's width out between its fields in whole points, as Graphviz does", () => {
        const lay = record("a|b|c");
        // Graphviz's dividers at x 249 and 276 of a node from 223 to 303 (center 263)
        expect(lay.dividers.map((d) => Math.round(d[0]))).toEqual([-14, 13]);
        expect(lay.dividers.every((d) => d[0] === d[2] && d[1] === 20 && d[3] === -20)).toBe(true);
        expect(lay.texts.map((t) => t.text)).toEqual(["a", "b", "c"]);
        // its texts centered in their fields: 236, 262.5, 289.12
        [-27, -0.5, 26.12].forEach((x, k) => expect(Math.abs(lay.texts[k].x - x)).toBeLessThan(1));
    });

    it("turns the fields top to bottom inside braces, and at the top level under rankdir LR", () => {
        const nested = record("{a|{b|c}}");
        // a above b | c: one divider across at y -774.25 (0.75 below the center), one down between b and c at x 583
        expect(nested.dividers.length).toBe(2);
        const [across, down] = nested.dividers;
        expect([across[1], across[3]]).toEqual([across[1], across[1]]);
        // within a point: Graphviz's rows here are 20.75 and 19.25 high
        expect(Math.abs(across[1] + 0.75)).toBeLessThanOrEqual(1);
        expect(down[0]).toBe(down[2]);
        expect(Math.abs(down[0])).toBeLessThan(0.5);
        expect(nested.texts.map((t) => [t.text, Math.round(t.x) + 0])).toEqual([
            ["a", 0],
            ["b", -20],
            ["c", 20],
        ]);
        const flipped = record("a|b|c", false);
        expect(flipped.dividers.every((d) => d[1] === d[3])).toBe(true);
        expect(flipped.texts.map((t) => t.text)).toEqual(["a", "b", "c"]);
        expect(flipped.texts[0].y).toBeGreaterThan(flipped.texts[2].y);
    });

    it("sets a line ending in \\l or \\r in from its field's side by 8 points", () => {
        const lay = record(String.raw`left\lright\r|c`);
        // the divider at 1071.5 of a node centered on 1063; "left" starts at 1031, "right" ends at 1063.5
        expect(lay.dividers[0][0]).toBeCloseTo(8.5, 0);
        const [left, right] = lay.texts;
        expect(left.x - textWidth("left", 10) / 2).toBeCloseTo(1031 - 1063, 0);
        expect(right.x + textWidth("right", 10) / 2).toBeCloseTo(1063.5 - 1063, 0);
        expect(left.y).toBeGreaterThan(right.y);
    });

    it("names each port's field", () => {
        const lay = record("<p1> a|<p2> b");
        expect([...lay.ports.keys()]).toEqual(["p1", "p2"]);
        expect(lay.texts.map((t) => t.text)).toEqual(["a", "b"]);
    });
});

describe("DOT styles: record nodes", () => {
    it("draws a record's fields as dividers and texts over the node in place of one label", async () => {
        const registry = createRegistry();
        const doc = `digraph { rankdir=TB; r [shape=record, label="a|b", width=1, height=0.5, fixedsize=true, fontsize=10] }`;
        const result = await registry.importGraph(doc, { format: "dot", styles: { toolDefaults: true } });
        const { snapshot } = result;
        const { styles } = result;
        if (styles === null || styles === undefined) {
            throw new Error("no styles");
        }
        const value = (p: string): unknown => resolveStyles(styles, "node", p as StyleProperty, snapshot)[0];
        expect(value("label")).toBe("");
        // the divider a hair left of the middle: "a" is narrower than "b", and the rest is shared in whole points
        const [from, to] = String(value("shapeLines"))
            .split(" ")
            .map((p) => p.split(",").map(Number));
        expect([from[1], to[1], from[0] === to[0]]).toEqual([1, -1, true]);
        expect(Math.abs(from[0])).toBeLessThan(0.05);
        const texts = JSON.parse(String(value("shapeTexts"))) as [number, number, string][];
        expect(texts.map((t) => t[2])).toEqual(["a", "b"]);
        expect(texts[0][0]).toBeCloseTo(-0.5, 1);
        expect([value("width"), value("height")]).toEqual([72, 36]);
    });
});
